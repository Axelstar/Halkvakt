// Finskt skuggarkiv (BACKLOG #34): Fintraffic/Digitraffic → schema `fi`. Ingen app, ingen
// röst, inga användare — bara arkivet, så att Finland har en vinter av facit i mars 2027.
// Källor (CC BY 4.0, kräver Digitraffic-User-header, alltid gzip):
//   /api/weather/v1/stations         526 vägväderstationer (metadata + position)
//   /api/weather/v1/stations/data    TIE_1 (vägyta °C), ILMA (luft), SADE, KELI_1 (väglagskod
//                                    med engelsk beskrivning: Dry/Moist/Wet/Snow/Ice/Frost)
//   /api/traffic-message/v1/messages trafikmeddelanden med geometri (olyckor, hinder)
// Samma arkivpolicy som Sverige (DECISIONS #4): vägyta ≤ 5 °C, nederbörd eller Δ ≥ 0,5 °C
// ⇒ spara; annars bara "latest". Körs ur ingest-grannar.yml (pulsklockan, en gång i timmen).
// Skrivningen är BATCHAD (kort #85): 526 × 2 enradiga INSERT tog 2 min 51 s per körning.
import pg from "pg";
import { readFileSync } from "node:fs";
import { writeFi, type FiRow } from "./grannar-db.ts";

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
  // Auto-migrering (sql/010): latest-tabellen saknade dewpoint_c — körning #24 föll på 42703.
  await client.query(readFileSync(new URL("../sql/010_fi_dewpoint_latest.sql", import.meta.url), "utf8"));
  // Auto-migrering (sql/012, kort #48): FI-breddningen — frostpunkt, fryspunkt, salt, vind, sikt, form, ytstatus.
  await client.query(readFileSync(new URL("../sql/012_fi_falt.sql", import.meta.url), "utf8"));
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

  let dagg = 0, fukt = 0, frostN = 0, siktN = 0, vindN = 0;
  const latestRows: FiRow[] = [], archiveRows: FiRow[] = [];
  for (const st of data.stations) {
    const m = meta.get(st.id); if (!m) continue;
    const s = new Map<string, Sensor>();
    for (const v of st.sensorValues as Sensor[]) s.set(v.name, v);
    // KELI_1 = 0 betyder "The sensor has a fault" — då är TIE_1 skräp (Rovaniemi visade
    // 0 °C vägyta vid 16,8 °C luft i första körningen). Spara null, inte lögnen.
    const faulty = s.get("KELI_1")?.value === 0;
    const surface = faulty ? null : (s.get("TIE_1")?.value ?? null);
    const air = s.get("ILMA")?.value ?? null;
    // KASTEPISTE (kort #46, 4/9): daggpunkten fanns i källan men släpptes på golvet —
    // samma miss som svenska motorns oanvända dewpoint. Lapplands septemberfrost ger
    // rimfrost-analysen äkta nätter veckor före Sverige. Verifierat live: 505/528 stationer.
    const dewpoint = s.get("KASTEPISTE")?.value ?? null;
    if (dewpoint !== null) dagg++;
    // ILMAN_KOSTEUS (kort #46, 12/9, DECISIONS #138): luftfuktigheten låg i SAMMA svar som
    // daggpunkten och plockades aldrig upp. Grind R-A:s tredje vaktled — korsgivarkontrollen
    // RH >= 90 — gick därför inte att utvärdera på det finska arkivet, och första körningen
    // svarade "0 rader" som om det vore ett underlagsbesked. Mätt 12/9: 505 av 528 stationer
    // bär den, exakt samma täckning som KASTEPISTE. Noll extra anrop, noll extra bytes.
    const humidity = s.get("ILMAN_KOSTEUS")?.value ?? null;
    if (humidity !== null) fukt++;
    // FI-breddningen (kort #48, GOLVET.md): nio sensorer som låg på golvet — frostpunkten
    // FÄRDIGRÄKNAD (rimfrost #46), saltjusterad fryspunkt, saltmängd, vind, sikt,
    // nederbördens form (facit för #45), ytstatus. Triggar inte lagring (policy #4 orörd).
    const g = (n: string) => s.get(n)?.value ?? null;
    const brett = { frost: g("KUURAPISTE"), fryspkt: g("JÄÄTYMISPISTE_1"), salt: g("SUOLAN_MÄÄRÄ_1"),
      vind: g("KESKITUULI"), byvind: g("MAKSIMITUULI"), vindr: g("TUULENSUUNTA"),
      sikt: g("NÄKYVYYS_M"), form: g("SATEEN_OLOMUOTO_PWDXX"), ytstatus: g("TIENPINNAN_TILA_1") };
    if (brett.frost !== null) frostN++;
    if (brett.sikt !== null) siktN++;
    if (brett.vind !== null) vindN++;
    const keli = s.get("KELI_1")?.sensorValueDescriptionEn ?? null;   // Dry/Moist/Wet/Snow/Ice/Frost/...
    const sade = s.get("SADE")?.value ?? 0;
    const wintry = keli != null && /snow|ice|frost|slush/i.test(keli);
    const rain = !wintry && (sade > 0 || (keli != null && /wet/i.test(keli)));
    const snow = wintry;
    const id = `FI:${st.id}`;
    const t = st.dataUpdatedTime ?? data.dataUpdatedTime;

    const row: FiRow = { id, name: m.name, lon: m.lon, lat: m.lat, t, surface, air, dewpoint, humidity, keli, rain, snow, ...brett };
    latestRows.push(row);

    const last = lastTemps.has(id) ? lastTemps.get(id)! : null;
    const interesting = (surface !== null && surface <= 5) || rain || snow ||
      (surface !== null && last !== null && Math.abs(surface - last) >= 0.5) || !lastTemps.has(id);
    if (interesting) archiveRows.push(row);
  }
  const latest = latestRows.length, archived = archiveRows.length;
  await client.query("BEGIN");
  await writeFi(client, latestRows, archiveRows);

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
  console.log(`fi: latest ${latest}, archived ${archived}, deviations ${devs}, daggpunkt ${dagg} st, luftfuktighet ${fukt} st, frostpunkt ${frostN} st, sikt ${siktN} st, vind ${vindN} st (kort #48 — första publiceringen bevisas här)`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  client.release(); await pool.end();
}
