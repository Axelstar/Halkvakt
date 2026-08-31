// Finskt skuggarkiv (BACKLOG #34): Fintraffic/Digitraffic → schema `fi`. Ingen app, ingen
// röst, inga användare — bara arkivet, så att Finland har en vinter av facit i mars 2027.
// Källor (CC BY 4.0, kräver Digitraffic-User-header, alltid gzip):
//   /api/weather/v1/stations         526 vägväderstationer (metadata + position)
//   /api/weather/v1/stations/data    TIE_1 (vägyta °C), ILMA (luft), SADE, KELI_1 (väglagskod
//                                    med engelsk beskrivning: Dry/Moist/Wet/Snow/Ice/Frost)
//   /api/traffic-message/v1/messages trafikmeddelanden med geometri (olyckor, hinder)
// Samma arkivpolicy som Sverige (DECISIONS #4): vägyta ≤ 5 °C, nederbörd eller Δ ≥ 0,5 °C
// ⇒ spara; annars bara "latest". Kör var 30:e minut från ingest-fi.yml.
import pg from "pg";

const UA = { "Digitraffic-User": "Halkvakt/0.3 (axelstar.github.io/halkvakt-karta)" };
const BASE = "https://tie.digitraffic.fi/api";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path, { headers: UA });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

type Sensor = { name: string; value: number; sensorValueDescriptionEn?: string | null };

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  const stations = await get<any>("/weather/v1/stations");
  const meta = new Map<number, { name: string; lon: number; lat: number }>();
  for (const f of stations.features) {
    meta.set(f.id, { name: f.properties.name, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
  }

  const data = await get<any>("/weather/v1/stations/data");
  const lastTemps = new Map<string, number | null>();
  const lt = await client.query(`SELECT DISTINCT ON (station_id) station_id, surface_temp_c
                                 FROM fi.weather_observations ORDER BY station_id, sample_time DESC`);
  for (const r of lt.rows) lastTemps.set(r.station_id, r.surface_temp_c === null ? null : Number(r.surface_temp_c));

  let latest = 0, archived = 0;
  await client.query("BEGIN");
  for (const st of data.stations) {
    const m = meta.get(st.id); if (!m) continue;
    const s = new Map<string, Sensor>();
    for (const v of st.sensorValues as Sensor[]) s.set(v.name, v);
    const surface = s.get("TIE_1")?.value ?? null;
    const air = s.get("ILMA")?.value ?? null;
    const keli = s.get("KELI_1")?.sensorValueDescriptionEn ?? null;   // Dry/Moist/Wet/Snow/Ice/Frost/...
    const sade = s.get("SADE")?.value ?? 0;
    const wintry = keli != null && /snow|ice|frost|slush/i.test(keli);
    const rain = !wintry && (sade > 0 || (keli != null && /wet/i.test(keli)));
    const snow = wintry;
    const id = `FI:${st.id}`;
    const t = st.dataUpdatedTime ?? data.dataUpdatedTime;

    await client.query(
      `INSERT INTO fi.weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
       VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,$8,$9,$10)
       ON CONFLICT (station_id) DO UPDATE SET sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
         air_temp_c=EXCLUDED.air_temp_c, precipitation=EXCLUDED.precipitation, rain=EXCLUDED.rain, snow=EXCLUDED.snow`,
      [id, m.name, m.lon, m.lat, t, surface, air, keli, rain, snow]);
    latest++;

    const last = lastTemps.has(id) ? lastTemps.get(id)! : null;
    const interesting = (surface !== null && surface <= 5) || rain || snow ||
      (surface !== null && last !== null && Math.abs(surface - last) >= 0.5) || !lastTemps.has(id);
    if (interesting) {
      await client.query(
        `INSERT INTO fi.weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
         VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [id, m.name, m.lon, m.lat, t, surface, air, keli, rain, snow]);
      archived++;
    }
  }

  // Trafikmeddelanden: aktiva, med geometri. Olyckor och hinder — vägarbeten stängs ute som i Sverige.
  const msgs = await get<any>("/traffic-message/v1/messages?inactiveHours=0&includeAreaGeometry=false&situationType=TRAFFIC_ANNOUNCEMENT");
  let devs = 0;
  const seen: string[] = [];
  for (const f of msgs.features ?? []) {
    const p = f.properties; const a = p.announcements?.[0]; if (!a) continue;
    const text = [a.title, ...(a.features ?? []).map((x: any) => x.name)].filter(Boolean).join(" · ");
    if (/tietyö|tietyöt|päällystys/i.test(text)) continue;   // vägarbete = brus, DECISIONS #5
    const g = f.geometry; if (!g) continue;
    const coords = g.type === "Point" ? [g.coordinates] : g.type === "LineString" ? g.coordinates
      : g.type === "MultiLineString" ? g.coordinates.flat() : g.type === "MultiPoint" ? g.coordinates : [];
    if (!coords.length) continue;
    const lon = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
    const lat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    const isAccident = /onnettomuu/i.test(text);   // "onnettomuus" = olycka
    await client.query(
      `INSERT INTO fi.deviations (deviation_id, situation_id, message_type, message_type_value, message,
         severity_code, severity_text, road_number, county_nos, geom, start_time, end_time, icon_id, modified_time, deleted)
       VALUES ($1,$1,$2,$3,$4,NULL,NULL,$5,'{}',ST_SetSRID(ST_MakePoint($6,$7),4326),$8,$9,NULL,$10,false)
       ON CONFLICT (deviation_id) DO UPDATE SET message=EXCLUDED.message, end_time=EXCLUDED.end_time,
         modified_time=EXCLUDED.modified_time, deleted=false`,
      [`FI:${p.situationId}`, isAccident ? "Olycka" : "Hinder", isAccident ? "Accident" : "GeneralObstruction",
       text.slice(0, 2000), null, lon, lat, a.timeAndDuration?.startTime ?? null, a.timeAndDuration?.endTime ?? null, p.dataUpdatedTime ?? new Date().toISOString()]);
    seen.push(`FI:${p.situationId}`); devs++;
  }
  // Meddelanden som inte längre är aktiva markeras raderade (samma sanning som Sverige: live-tabellen speglar nuet).
  await client.query(`UPDATE fi.deviations SET deleted = true WHERE NOT deleted AND NOT (deviation_id = ANY($1::text[]))`, [seen]);
  await client.query(`INSERT INTO fi.sync_state (source, last_change_id, synced_at) VALUES ('fintraffic','',now())
                      ON CONFLICT (source) DO UPDATE SET synced_at=now()`);
  await client.query("COMMIT");
  console.log(`fi: latest ${latest}, archived ${archived}, deviations ${devs}`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  client.release(); await pool.end();
}
