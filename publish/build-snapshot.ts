// Builds the APP SNAPSHOTS (PLAN Phase 1) — the files every phone downloads and
// matches against on-device. Published to data/app/v1/ on the public map repo (CDN'd
// by GitHub Pages, HTTP-gzip on the wire).
//
// DECISIONS #14: v1 ships NATIONAL files, not per-län. Measured reality: today's whole
// country compresses to a fraction of PLAN's 3 MB/län budget; the county split solves a
// size problem we do not have. Split criterion: live.json gz > 1.5 MB two publishes in
// a row → implement per-län (boundaries via PostGIS län table). Sizes logged every run.
//
// Format is the ENGINE's hazard vocabulary, not GeoJSON — the Android adapter becomes
// a straight mapping, and engine/src/snapshot.ts consumes these files directly.
//
//   static.json  — cameras (change rarely; re-downloaded only on hash change)
//   live.json    — slippery segments, icing-candidate stations, active deviations,
//                  SMHI winter areas. Refreshed every publish (30 min cadence, #7).
//   manifest.json— schema version, generated_at, per-file sha256 + sizes.
import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const outDir = join(process.argv[2] ?? "out", "app", "v1");
mkdirSync(outDir, { recursive: true });
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));

// ---- static: cameras ----
const cams = await pool.query(`
  SELECT camera_id, road_number, bearing,
         ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM cameras WHERE NOT deleted`);
const staticDoc = {
  schema: 1,
  cameras: cams.rows.map((r) => ({
    id: r.camera_id, lon: r.lon, lat: r.lat,
    bearing: r.bearing === null ? null : Number(r.bearing),
    road: r.road_number,
  })),
};

// ---- live: everything the engine alerts on ----
const segs = await pool.query(`
  SELECT segment_id, condition_code, condition_info, road_number,
         ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0005))::json AS g
  FROM road_conditions
  WHERE NOT deleted AND geom IS NOT NULL
    AND (condition_code >= 2 OR EXISTS (
      SELECT 1 FROM unnest(condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|snö|halka|frost)'))`);
const wx = await pool.query(`
  SELECT station_id, surface_temp_c, rain, snow, precipitation,
         ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM weather_latest
  WHERE surface_temp_c IS NOT NULL AND (surface_temp_c <= 3 OR snow)`);
const devs = await pool.query(`
  SELECT deviation_id, message_type, message_type_value, road_number,
         severity_code, end_time,
         ST_X(COALESCE(geom, ST_Centroid(line_geom))) AS lon,
         ST_Y(COALESCE(geom, ST_Centroid(line_geom))) AS lat
  FROM deviations
  WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
    AND (end_time IS NULL OR end_time > now())`);
const vilt = await pool.query(`
  SELECT event_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, species, datetime
  FROM polisen_events
  WHERE geom IS NOT NULL AND datetime > now() - interval '48 hours'
  ORDER BY datetime DESC`);
const smhi = await pool.query(`
  SELECT area_id, event_sv, level_code,
         ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.01))::json AS g
  FROM smhi_warnings
  WHERE geom IS NOT NULL AND event_code ~* 'SNOW|ICE|ICING|COLD|WIND'`);

const liveDoc = {
  schema: 1,
  generated_at: new Date().toISOString(),
  segments: segs.rows.map((r) => ({
    id: r.segment_id, line: r.g.coordinates,
    code: r.condition_code, info: r.condition_info ?? [], road: r.road_number,
  })),
  weather: wx.rows.map((r) => ({
    id: r.station_id, lon: r.lon, lat: r.lat,
    yta: num(r.surface_temp_c),
    fukt: Boolean(r.rain || r.snow || r.precipitation),
  })),
  deviations: devs.rows.map((r) => ({
    id: r.deviation_id, lon: r.lon, lat: r.lat, typ: r.message_type, road: r.road_number,
    // Olyckslyftet (#28): the engine grades accidents on Trafikverket's SeverityCode
    // (1 Ingen, 2 Liten, 4 Stor, 5 Mycket stor påverkan — 3 unused in practice).
    // Gated on message_type_value === "Accident" ON PURPOSE. The graded copy says the
    // word "olycka" out loud, so it may only ever be triggered by something Trafikverket
    // itself classified as an accident. Any other deviation type keeps severity null and
    // therefore falls through to the old, milder line.
    sev: r.message_type_value === "Accident" && r.severity_code != null
      ? Number(r.severity_code) : null,
    // The clearance time is pre-formatted HERE, not in the engine: the engine reads no
    // clocks and knows no timezones, and all three ports must speak the identical string.
    slut: r.message_type_value === "Accident" ? hhmmStockholm(r.end_time) : null,
  })),
  smhi: smhi.rows.map((r) => ({ id: Number(r.area_id), event: r.event_sv, niva: r.level_code, geom: r.g })),
  wildlife: vilt.rows.map((r) => ({ id: String(r.event_id), lon: Number(r.lon), lat: Number(r.lat), art: r.species ?? null })),
};

/** Absolute instant → "HH:MM" in Swedish wall-clock time, or null. */
function hhmmStockholm(ts: Date | string | null): string | null {
  if (ts == null) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

// ---- write + manifest with integrity ----
function emit(name: string, doc: unknown) {
  const json = JSON.stringify(doc);
  writeFileSync(join(outDir, name), json);
  const gz = gzipSync(Buffer.from(json)).length;
  return { path: `app/v1/${name}`, sha256: createHash("sha256").update(json).digest("hex"), bytes: Buffer.byteLength(json), gz_bytes: gz };
}
const fStatic = emit("static.json", staticDoc);
const fLive = emit("live.json", liveDoc);
const manifest = { schema: 1, generated_at: liveDoc.generated_at, files: { static: fStatic, live: fLive } };
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest));

const kb = (b: number) => `${(b / 1024).toFixed(0)} kB`;
console.log(`snapshot built: static ${kb(fStatic.bytes)} (gz ${kb(fStatic.gz_bytes)}, ${staticDoc.cameras.length} cameras), ` +
  `live ${kb(fLive.bytes)} (gz ${kb(fLive.gz_bytes)}; segs ${liveDoc.segments.length}, wx ${liveDoc.weather.length}, dev ${liveDoc.deviations.length}, vilt ${liveDoc.wildlife.length}, smhi ${liveDoc.smhi.length})`);
if (fLive.gz_bytes > 1_500_000) console.warn("SPLIT CRITERION HIT (DECISIONS #14): live gz > 1.5 MB — time for per-län files");
await pool.end();
