// Norskt skuggarkiv (#35): Statens vegvesen DATEX II 3.1 → schema `no`. Ingen app, ingen
// röst — bara arkivet, som Finland (fi.ts): stationstabell + mätdata → no.weather_latest
// (alla stationer) och no.weather_observations (händelsefiltrerat, arkivpolicyn DECISIONS #4).
// Parsern (sources/vegvesen.ts) är skriven mot rekognoseringen i ingest-no #28 (4/9 14:54):
// kontot autentiserar, servern vill ha Accept */*, 468 stationsmätningar, 848 vägytetemp-
// element. GetSituation (30 MB, 15 414 poster — nästan allt MaintenanceWorks) hämtas INTE:
// olyckor till no.deviations är ett eget kort, inte en bieffekt av väderparsern.
// Hemligheter: VEGVESEN_USER/PASS i GitHub Secrets — passerar aldrig repo, chatt eller logg.
// Källa ska anges (NLOD) — User-Agent bär repo-URL, inga personuppgifter.
import pg from "pg";
import { readFileSync } from "node:fs";
import { parseSiteTable, parseMeasuredData, interesting } from "./sources/vegvesen.ts";
import { writeNo, type NoRow } from "./grannar-db.ts";

const USER = process.env.VEGVESEN_USER, PASS = process.env.VEGVESEN_PASS;
if (!USER || !PASS) { console.log("no: VEGVESEN_USER/PASS saknas — hoppar över (kontot väntar på Vegvesen)"); process.exit(0); }

const BASE = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi";
const UA = "Halkvakt/0.4 (+https://github.com/Axelstar/Halkvakt)";
const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

// Innehållsförhandlingen MÄTT 4/9: application/xml → 406, */* → 200. */* först; resten
// står kvar som reserv om servern ändrar sig, och den som fungerar skrivs alltid ut.
const ACCEPT_KANDIDATER = [
  "*/*",                                               // bevisad 4/9 (ingest-no #28)
  "application/xml, text/xml;q=0.9, */*;q=0.8",
  "text/xml",
  "application/xml",                                   // gav 406 4/9
  null,                                                // ingen Accept-header alls
];
let acceptVald: string | null | undefined;             // sätts av första lyckade svaret

async function hamta(pub: string, accept: string | null): Promise<Response> {
  const headers: Record<string, string> = { Authorization: auth, "User-Agent": UA };
  if (accept !== null) headers.Accept = accept;
  return fetch(`${BASE}/${pub}/pullsnapshotdata`, { headers });
}

async function pull(pub: string): Promise<string> {
  const provas = acceptVald !== undefined ? [acceptVald] : ACCEPT_KANDIDATER;
  const fel: string[] = [];
  for (const accept of provas) {
    const r = await hamta(pub, accept);
    if (r.ok) {
      if (acceptVald === undefined) {
        acceptVald = accept;
        console.log(`no: servern accepterar ${accept === null ? "(ingen Accept-header)" : `Accept: ${accept}`}`);
      }
      return r.text();
    }
    // Fel-loggen bär API:ets svarskropp — "TRV 400" utan kropp kostade ett diagnosvarv.
    const kropp = (await r.text().catch(() => "")).slice(0, 200);
    if (r.status === 401) throw new Error(`${pub}: HTTP 401 — hemligheterna nekas (fel par, eller kontot ännu inte aktiverat hos Vegvesen). Svar: ${kropp}`);
    if (r.status === 403) throw new Error(`${pub}: HTTP 403 — kontot saknar rätt till publikationen (eller IP-spärr). Svar: ${kropp}`);
    fel.push(`${accept ?? "(ingen)"} → ${r.status}${kropp ? ` ${kropp}` : ""}`);
    if (r.status !== 406) break; // bara innehållsförhandling är värd att prova om
  }
  throw new Error(`${pub}: ingen Accept-variant godtogs. ${fel.join(" | ")}`);
}

const sites = parseSiteTable(await pull("GetMeasurementWeatherSiteTable"));
const data = parseMeasuredData(await pull("GetMeasuredWeatherData"));
const meta = new Map(sites.stations.map(s => [s.id, s]));
const matched = data.items.filter(i => meta.has(i.siteId));
const n = (f: (i: typeof matched[number]) => unknown) => matched.filter(i => f(i) !== null && f(i) !== false).length;
console.log(`no: stationstabell ${sites.sitesTotal} stationer (${sites.stations.length} med koordinater), mätdata ${data.items.length} stationsmätningar, ${matched.length} matchade`);
console.log(`no: vägyta ${n(i => i.surfaceTempC)} st, luft ${n(i => i.airTempC)} st, daggpunkt ${n(i => i.dewpointC)} st, fukt ${n(i => i.humidityPct)} st, nederbörd ${n(i => i.precipitation)} st, mättid ${n(i => i.sampleTime)} st (publicationTime ${data.publicationTime})`);

// STRUKTURVAKT: parsern byggdes delvis utanför rekognoseringens fönster (positionen). Hittar
// den inga koordinater eller inga matchningar skrivs INGET — och första stationens råa XML
// hamnar i loggen så nästa varv byggs på mätt struktur, inte på ett tyst tomt arkiv.
if (sites.stations.length === 0 || matched.length === 0) {
  console.error(`STRUKTURVAKT: ${sites.stations.length} stationer med koordinater, ${matched.length} matchade — inget skrivet. Första stationen ur tabellen:\n${sites.sample ?? "(ingen measurementSite hittad)"}`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  // Auto-migrering (fi.ts-mönstret): 006 föder schemat om det saknas, 013 daggpunkt + fukt.
  await client.query(readFileSync(new URL("../sql/006_no_schema.sql", import.meta.url), "utf8"));
  await client.query(readFileSync(new URL("../sql/013_no_falt.sql", import.meta.url), "utf8"));
  const lastTemps = new Map<string, number | null>();
  const lt = await client.query(`SELECT DISTINCT ON (station_id) station_id, surface_temp_c
                                 FROM no.weather_observations ORDER BY station_id, sample_time DESC`);
  for (const r of lt.rows) lastTemps.set(r.station_id, r.surface_temp_c === null ? null : Number(r.surface_temp_c));

  // Batchat (kort #85): 468 × 2 enradiga INSERT tog 2 min 25 s per körning.
  const latestRows: NoRow[] = [], archiveRows: NoRow[] = [];
  for (const o of matched) {
    const m = meta.get(o.siteId)!;
    const id = `NO:${o.siteId}`;
    const row: NoRow = { id, name: m.name, lon: m.lon, lat: m.lat, t: o.sampleTime ?? new Date().toISOString(),
      surface: o.surfaceTempC, air: o.airTempC, dewpoint: o.dewpointC, humidity: o.humidityPct,
      precipitation: o.precipitation, rain: o.rain, snow: o.snow };
    latestRows.push(row);
    if (interesting(o, lastTemps.get(id) ?? null, lastTemps.has(id))) archiveRows.push(row);
  }
  const latest = latestRows.length, archived = archiveRows.length;
  await client.query("BEGIN");
  await writeNo(client, latestRows, archiveRows);
  await client.query(`INSERT INTO no.sync_state (source, last_change_id, synced_at) VALUES ('vegvesen','',now())
                      ON CONFLICT (source) DO UPDATE SET synced_at=now()`);
  await client.query("COMMIT");
  console.log(`no: latest ${latest}, archived ${archived} (kort #35 — första publiceringen bevisas här)`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  client.release(); await pool.end();
}
