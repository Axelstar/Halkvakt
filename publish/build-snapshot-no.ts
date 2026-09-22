// Norsk app-snapshot (kort #238) ur schema no → out/app/no/v1/{static,live,manifest}.json.
// Samma format som Sverige så skuggmotorn (och en dag appen) läser den oförändrad. Skuggmotorn har haft de norska
// rutterna och CDN-adressen sedan #35, men ingen byggde snapshoten: 25 dygn utan en enda norsk rad i skuggloggen
// (utvärderingen 22/9). Inga fartkameror (ingen öppen källa) ⇒ static.cameras = []. Inget vilt, ingen SMHI.
// Händelser: no.deviations fylls inte av ingest/no.ts (olyckor till Norge är ett eget kort), så listan är tom tills
// dess — frågan står kvar med samma regel som Sverige, Finland och Danmark: rösten säger "olycka" bara om det ÄR en.
import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const outDir = join(process.argv[2] ?? "out", "app", "no", "v1");
mkdirSync(outDir, { recursive: true });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const num = (v: unknown) => (v == null ? null : Number(v));

const wx = await pool.query(`
  SELECT station_id, surface_temp_c, rain, snow, ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM no.weather_latest
  WHERE surface_temp_c IS NOT NULL AND (surface_temp_c <= 3 OR snow)`);
const devs = await pool.query(`
  SELECT deviation_id, message_type, message_type_value, road_number, severity_code, end_time,
         ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM no.deviations
  WHERE NOT deleted AND geom IS NOT NULL AND (end_time IS NULL OR end_time > now())
    AND message_type_value = 'Accident'`);   // samma regel som Sverige: rösten säger "olycka" bara om det ÄR en (KEEP/#32)
await pool.end();

const staticDoc = { schema: 1, cameras: [] as unknown[] };
const liveDoc = {
  schema: 1,
  generated_at: new Date().toISOString(),
  segments: [] as unknown[],
  weather: wx.rows.map((r) => ({ id: r.station_id, lon: r.lon, lat: r.lat, yta: num(r.surface_temp_c), fukt: Boolean(r.rain || r.snow) })),
  deviations: devs.rows.map((r) => ({
    id: r.deviation_id, lon: r.lon, lat: r.lat, typ: r.message_type, road: r.road_number,
    sev: r.message_type_value === "Accident" && r.severity_code != null ? Number(r.severity_code) : null,
    slut: null,
  })),
  smhi: [] as unknown[],
  wildlife: [] as unknown[],
};

function emit(name: string, doc: unknown) {
  const json = JSON.stringify(doc);
  writeFileSync(join(outDir, name), json);
  return { path: `app/no/v1/${name}`, sha256: createHash("sha256").update(json).digest("hex"),
           bytes: Buffer.byteLength(json), gz_bytes: gzipSync(Buffer.from(json)).length };
}
const fStatic = emit("static.json", staticDoc);
const fLive = emit("live.json", liveDoc);
writeFileSync(join(outDir, "manifest.json"), JSON.stringify({
  schema: 1, generated_at: liveDoc.generated_at, files: { static: fStatic, live: fLive } }));
console.log(`no snapshot: wx ${liveDoc.weather.length}, dev ${liveDoc.deviations.length}`);
