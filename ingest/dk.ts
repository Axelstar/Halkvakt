// Danskt skuggarkiv (BACKLOG #36): DMI + Vejdirektoratets trafikkarta → schema `dk`.
// FRYSRISK = DMI:s GRÄSTEMPERATUR (temp_grass), inte vägyta. De danska vägytestationerna
// ligger i VejVejr bakom avtal. Grästemperatur är markytans temperatur — den klassiska
// frostindikatorn — och sparas i surface_temp_c med precipitation-kolumnen märkt "grass".
// Rösten får INTE säga frysrisk på den här grunden förrän Axel beslutat (DECISIONS #45).
// Källor: opendataapi.dmi.dk (öppet, ingen nyckel, "DMI" ska anges) och
// storage.googleapis.com/trafikkort-data (publikt, odokumenterat, backend för
// trafikkort.vejdirektoratet.dk — byt till NAP-flödet med gratisnyckel före produktion).
import pg from "pg";

const DMI = "https://opendataapi.dmi.dk/v2/metObs/collections";
const VD = "https://storage.googleapis.com/trafikkort-data/geojson/big-screen-events.json";
async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { "User-Agent": "Halkvakt/0.3 (axelstar.github.io/halkvakt-karta)" } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}
/** Senaste värdet per station för en DMI-parameter, senaste timmen. */
async function latest(param: string): Promise<Map<string, { v: number; t: string }>> {
  const d = await get<any>(`${DMI}/observation/items?parameterId=${param}&period=latest-hour&limit=10000`);
  const m = new Map<string, { v: number; t: string }>();
  for (const f of d.features ?? []) {
    const p = f.properties; const cur = m.get(p.stationId);
    if (!cur || p.observed > cur.t) m.set(p.stationId, { v: p.value, t: p.observed });
  }
  return m;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  const st = await get<any>(`${DMI}/station/items?status=Active&type=Synop&limit=1000`);
  const meta = new Map<string, { name: string; lon: number; lat: number }>();
  for (const f of st.features) {
    if (f.properties.validTo) continue;   // gammal placering av samma station
    meta.set(f.properties.stationId, { name: f.properties.name, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
  }
  const [grass, air, dew, precip] = await Promise.all([latest("temp_grass"), latest("temp_dry"), latest("temp_dew"), latest("precip_past1h")]);

  const lt = await client.query(`SELECT DISTINCT ON (station_id) station_id, surface_temp_c
                                 FROM dk.weather_observations ORDER BY station_id, sample_time DESC`);
  const lastTemps = new Map<string, number | null>();
  for (const r of lt.rows) lastTemps.set(r.station_id, r.surface_temp_c === null ? null : Number(r.surface_temp_c));

  let n = 0, archived = 0;
  await client.query("BEGIN");
  for (const [sid, m] of meta) {
    const g = grass.get(sid); if (!g) continue;   // bara stationer med grästemp
    const id = `DK:${sid}`;
    const surface = g.v, a = air.get(sid)?.v ?? null, dp = dew.get(sid)?.v ?? null, pr = precip.get(sid)?.v ?? 0;
    const rain = pr > 0 && (a ?? 5) > 1, snow = pr > 0 && (a ?? 5) <= 1;
    await client.query(
      `INSERT INTO dk.weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
       VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,'grass',$8,$9)
       ON CONFLICT (station_id) DO UPDATE SET sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
         air_temp_c=EXCLUDED.air_temp_c, rain=EXCLUDED.rain, snow=EXCLUDED.snow`,
      [id, m.name, m.lon, m.lat, g.t, surface, a, rain, snow]);
    n++;
    const last = lastTemps.has(id) ? lastTemps.get(id)! : null;
    if (surface <= 5 || rain || snow || (last !== null && Math.abs(surface - last) >= 0.5) || !lastTemps.has(id)) {
      await client.query(
        `INSERT INTO dk.weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation, rain, snow)
         VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,$8,'grass',$9,$10) ON CONFLICT DO NOTHING`,
        [id, m.name, m.lon, m.lat, g.t, surface, a, dp, rain, snow]);
      archived++;
    }
  }

  // Trafikkort: en FeatureCollection per händelse. DATEX-klassen i TrafficMan2_Type.
  const ev = await get<any[]>(VD);
  const seen: string[] = []; let devs = 0;
  const dkDate = (s?: string) => { const m = s?.match(/(\d\d)-(\d\d)-(\d{4}) kl\. (\d\d):(\d\d)/); return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+02:00` : null; };
  for (const fc of ev) {
    const f = fc.features?.[0]; if (!f?.geometry || f.geometry.type !== "Point") continue;
    const p = f.properties; if (p.suspended === "true" || p.visible === "false") continue;
    const cls = String(p.TrafficMan2_Type ?? "").split(".").pop() ?? "";
    if (/MaintenanceWorks|ConstructionWorks|RoadOrCarriagewayOrLaneManagement|PublicEvent/.test(cls)) continue;  // brus, DECISIONS #5
    const text = [p.header, String(p.description ?? "").replace(/<[^>]+>/g, " ")].filter(Boolean).join(" · ").replace(/\s+/g, " ").trim();
    const [lon, lat] = f.geometry.coordinates;
    const id = `DK:${p.featureId}`;
    await client.query(
      `INSERT INTO dk.deviations (deviation_id, situation_id, message_type, message_type_value, message, severity_code, severity_text,
         road_number, county_nos, geom, start_time, end_time, icon_id, modified_time, deleted)
       VALUES ($1,$1,$2,$3,$4,NULL,NULL,NULL,'{}',ST_SetSRID(ST_MakePoint($5,$6),4326),$7,$8,$9,now(),false)
       ON CONFLICT (deviation_id) DO UPDATE SET message=EXCLUDED.message, end_time=EXCLUDED.end_time, modified_time=now(), deleted=false`,
      [id, cls === "Accident" ? "Olycka" : cls === "WeatherRelatedRoadConditions" ? "Halka" : "Hinder", cls || "Unknown",
       text.slice(0, 2000), lon, lat, dkDate(p.beginPeriod), dkDate(p.endPeriod), fc.layerName ?? null]);
    seen.push(id); devs++;
  }
  await client.query(`UPDATE dk.deviations SET deleted = true WHERE NOT deleted AND NOT (deviation_id = ANY($1::text[]))`, [seen]);
  await client.query(`INSERT INTO dk.sync_state (source, last_change_id, synced_at) VALUES ('dmi+trafikkort','',now())
                      ON CONFLICT (source) DO UPDATE SET synced_at=now()`);
  await client.query("COMMIT");
  console.log(`dk: stationer ${n}, arkiverade ${archived}, händelser ${devs}`);
} catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; }
finally { client.release(); await pool.end(); }
