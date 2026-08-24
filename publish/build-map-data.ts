// Builds the public map's GeoJSON files from Supabase. Run by publish-map.yml.
// Output dir given as argv[2]. Everything written here becomes PUBLIC (CC0 data only).
import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const outDir = process.argv[2] ?? "map-data";
mkdirSync(outDir, { recursive: true });
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

function fc(features: any[]) { return { type: "FeatureCollection", features }; }
function write(name: string, obj: unknown): number {
  const json = JSON.stringify(obj);
  writeFileSync(join(outDir, name), json);
  return json.length;
}

const vaglag = await pool.query(`
  SELECT segment_id, condition_code, condition_text, condition_info, road_number, modified_time,
         ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001))::json AS g
  FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`);
const vaglagSize = write("vaglag.geojson", fc(vaglag.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { code: r.condition_code, text: r.condition_text, info: r.condition_info,
                road: r.road_number, updated: r.modified_time } }))));

const vader = await pool.query(`
  SELECT station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
         ST_AsGeoJSON(geom)::json AS g
  FROM weather_latest`);
write("vader.geojson", fc(vader.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { name: r.name, t: r.sample_time,
                yta: r.surface_temp_c === null ? null : Number(r.surface_temp_c),
                luft: r.air_temp_c === null ? null : Number(r.air_temp_c),
                nbd: r.precipitation, sno: r.snow } }))));

const olyckor = await pool.query(`
  SELECT deviation_id, message_type, message, severity_text, road_number, start_time,
         ST_AsGeoJSON(COALESCE(geom, ST_Centroid(line_geom)))::json AS g
  FROM deviations
  WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
    AND (end_time IS NULL OR end_time > now())`);
write("olyckor.geojson", fc(olyckor.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { typ: r.message_type, msg: r.message, allvar: r.severity_text,
                road: r.road_number, start: r.start_time } }))));

const kameror = await pool.query(`
  SELECT camera_id, name, road_number, bearing, ST_AsGeoJSON(geom)::json AS g
  FROM cameras WHERE NOT deleted`);
write("kameror.geojson", fc(kameror.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { name: r.name, road: r.road_number, bearing: r.bearing } }))));

// Halka stats for the VMS ticker
const stats = {
  generated_at: new Date().toISOString(),
  vaglag_total: vaglag.rows.length,
  vaglag_ej_normalt: vaglag.rows.filter(r => r.condition_code > 1).length,
  stationer: vader.rows.length,
  kalla_stationer: vader.rows.filter(r => r.surface_temp_c !== null && Number(r.surface_temp_c) <= 0).length,
  olyckor: olyckor.rows.length,
  kameror: kameror.rows.length,
};
write("meta.json", stats);
await pool.end();
console.log("map data built:", JSON.stringify(stats), `vaglag=${(vaglagSize/1024).toFixed(0)}kB`);
