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
  SELECT segment_id, condition_code, condition_text, condition_info, road_number, modified_time, county_nos[1] AS lan,
         ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001))::json AS g
  FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`);
const vaglagSize = write("vaglag.geojson", fc(vaglag.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { code: r.condition_code, text: r.condition_text, info: r.condition_info,
                road: r.road_number, updated: r.modified_time, lan: r.lan } }))));

// Sverige (Trafikverket, CC0) + Finland (Fintraffic, CC BY 4.0 — attribution på kartsidan). #34/#44.
const vader = await pool.query(`
  SELECT 'SE' AS land, station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
         ST_AsGeoJSON(geom)::json AS g
  FROM weather_latest
  UNION ALL
  SELECT 'FI', station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
         ST_AsGeoJSON(geom)::json
  FROM fi.weather_latest WHERE surface_temp_c IS NOT NULL
  UNION ALL
  SELECT 'DK', station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
         ST_AsGeoJSON(geom)::json
  FROM dk.weather_latest WHERE surface_temp_c IS NOT NULL`);
write("vader.geojson", fc(vader.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { land: r.land, name: r.name, t: r.sample_time,
                yta: r.surface_temp_c === null ? null : Number(r.surface_temp_c),
                luft: r.air_temp_c === null ? null : Number(r.air_temp_c),
                nbd: r.precipitation, sno: r.snow } }))));

const olyckor = await pool.query(`
  SELECT 'SE' AS land, deviation_id, message_type, message, severity_text, road_number, start_time,
         ST_AsGeoJSON(COALESCE(geom, ST_Centroid(line_geom)))::json AS g
  FROM deviations
  WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
    AND (end_time IS NULL OR end_time > now())
  UNION ALL
  SELECT 'FI', deviation_id, message_type, message, severity_text, road_number, start_time,
         ST_AsGeoJSON(geom)::json
  FROM fi.deviations
  WHERE NOT deleted AND geom IS NOT NULL AND (end_time IS NULL OR end_time > now())
    AND message_type_value = 'Accident'
  UNION ALL
  SELECT 'DK', deviation_id, message_type, message, severity_text, road_number, start_time,
         ST_AsGeoJSON(geom)::json
  FROM dk.deviations
  WHERE NOT deleted AND geom IS NOT NULL AND (end_time IS NULL OR end_time > now())
    AND message_type_value = 'Accident'`);
write("olyckor.geojson", fc(olyckor.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { land: r.land, typ: r.message_type, msg: r.message, allvar: r.severity_text,
                road: r.road_number, start: r.start_time } }))));

const kameror = await pool.query(`
  SELECT camera_id, name, road_number, bearing, ST_AsGeoJSON(geom)::json AS g
  FROM cameras WHERE NOT deleted`);
write("kameror.geojson", fc(kameror.rows.map(r => ({
  type: "Feature", geometry: r.g,
  properties: { name: r.name, road: r.road_number, bearing: r.bearing } }))));

// Väglagskamerornas koordinater som publicerat lager (byggplan v3 punkt 1.5, kort #38b(2)):
// anchor file for the ankarklippning — same Camera query the shadow engine already uses.
// CC0. Fail-soft: cameras change rarely, so on TRV error we skip the write and the
// previous file stays on the CDN (push-data only replaces files present in out/).
const trvKey = process.env.TRAFIKVERKET_API_KEY;
if (trvKey) {
  try {
    const q = `<REQUEST><LOGIN authenticationkey="${trvKey}"/><QUERY objecttype="Camera" schemaversion="1" limit="2500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>Name</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Direction</INCLUDE><INCLUDE>RoadNumber</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
    const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
      method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
    if (!r.ok) throw new Error(`TRV ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const rows = (await r.json())?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
    const feats = rows.flatMap((c: any) => {
      const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
      return m ? [{ type: "Feature",
        geometry: { type: "Point", coordinates: [+m[1], +m[2]] },
        properties: { id: String(c.Id), name: c.Name ?? null, photo: c.PhotoUrl ?? null,
                      dir: c.Direction ?? null, road: c.RoadNumber ?? null } }] : [];
    });
    if (feats.length < 500) throw new Error(`bara ${feats.length} väglagskameror — trasigt svar?`);
    // generated_at: lets healthcheck tell "fail-soft kept an old file" from "fresh".
    write("kameror-vaglag.geojson", { ...fc(feats), generated_at: new Date().toISOString() });
    console.log(`kameror-vaglag.geojson: ${feats.length} väglagskameror`);
  } catch (e) { console.error(`kameror-vaglag HOPPAS ÖVER (förra filen kvar på CDN): ${String((e as Error).message)}`); }
} else console.error("kameror-vaglag HOPPAS ÖVER: TRAFIKVERKET_API_KEY saknas");

// Wildlife: county-level stats ONLY (polisen GPS = länscentrum, DECISIONS #13 — no fake points)
const vilt = await pool.query(`
  SELECT count(*) FILTER (WHERE datetime > now() - interval '24 hours') AS dygn,
         count(*) FILTER (WHERE datetime > now() - interval '7 days') AS vecka,
         (SELECT species FROM polisen_events
          WHERE datetime > now() - interval '7 days' AND species IS NOT NULL
          GROUP BY species ORDER BY count(*) DESC LIMIT 1) AS vanligast
  FROM polisen_events`);

// SMHI: winter-relevant warnings for the ticker (highest level first)
const smhiW = await pool.query(`
  SELECT event_sv, level_sv, level_code, area_name
  FROM smhi_warnings
  WHERE event_code ~* 'SNOW|ICE|ICING|COLD|WIND'
  ORDER BY array_position(ARRAY['RED','ORANGE','YELLOW','MESSAGE'], level_code) LIMIT 3`);

// Waitlist size — published as social proof on the landing page (shown from 25+)
const wl = await pool.query(`SELECT count(*)::int AS n FROM waitlist`);

// Halka stats for the VMS ticker
const stats = {
  generated_at: new Date().toISOString(),
  vaglag_total: vaglag.rows.length,
  vaglag_ej_normalt: vaglag.rows.filter(r => r.condition_code > 1).length,
  stationer: vader.rows.length,
  kalla_stationer: vader.rows.filter(r => r.surface_temp_c !== null && Number(r.surface_temp_c) <= 0).length,
  olyckor: olyckor.rows.length,
  kameror: kameror.rows.length,
  vilt_dygn: Number(vilt.rows[0]?.dygn ?? 0),
  vilt_vecka: Number(vilt.rows[0]?.vecka ?? 0),
  vilt_vanligast: vilt.rows[0]?.vanligast ?? null,
  smhi_vinter: smhiW.rows.map(r => ({ event: r.event_sv, niva: r.level_sv, niva_kod: r.level_code, omrade: r.area_name })),
  waitlist_count: Number(wl.rows[0]?.n ?? 0),
};
write("meta.json", stats);
await pool.end();
console.log("map data built:", JSON.stringify(stats), `vaglag=${(vaglagSize/1024).toFixed(0)}kB`);
