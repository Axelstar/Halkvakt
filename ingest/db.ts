// Postgres/PostGIS writes. Batched (UNNEST) — one statement per ~500 rows,
// not one per row: run #2 taught us the pooler punishes chatty writers.
// Auto-migrates on start (sql/001_init.sql is fully idempotent).
import pg from "pg";
import { readFileSync } from "node:fs";
import { type TvResult } from "./trafikverket.ts";
import { type WeatherObs, isInteresting } from "./sources/weather.ts";
import { type RoadConditionSeg } from "./sources/roadcondition.ts";
import { type CameraSite } from "./sources/cameras.ts";
import { type Deviation } from "./sources/situations.ts";

const CHUNK = 500;
function* chunks<T>(arr: T[]): Generator<T[]> {
  for (let i = 0; i < arr.length; i += CHUNK) yield arr.slice(i, i + CHUNK);
}
function col<T, K>(rows: T[], f: (r: T) => K): K[] { return rows.map(f); }

function makePool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set (use --dry-run without a database)");
  const ssl = url.includes("localhost") ? undefined : { rejectUnauthorized: false };
  return new pg.Pool({ connectionString: url, max: 1, ssl });
}

export async function readSyncState(): Promise<Record<string, string>> {
  const pool = makePool();
  try {
    const r = await pool.query(
      `SELECT source, last_change_id FROM sync_state`).catch(() => ({ rows: [] as any[] }));
    return Object.fromEntries(r.rows.map((x: any) => [x.source, x.last_change_id]));
  } finally { await pool.end(); }
}

export async function writeAll(data: {
  weather: TvResult<WeatherObs>;
  conditions: TvResult<RoadConditionSeg>;
  cameras: TvResult<CameraSite>;
  deviations: TvResult<Deviation>;
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = { cameras: 0, road_conditions: 0, history: 0, weather: 0, deviations: 0 };
  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query(readFileSync(new URL("../sql/001_init.sql", import.meta.url), "utf8"));

    // Weather archive policy needs last stored temp per station — ONE query, not N.
    const lastTemps = new Map<string, number | null>();
    const lt = await client.query(
      `SELECT DISTINCT ON (station_id) station_id, surface_temp_c
       FROM weather_observations ORDER BY station_id, sample_time DESC`);
    for (const r of lt.rows) lastTemps.set(r.station_id, r.surface_temp_c === null ? null : Number(r.surface_temp_c));
    const keepWeather = data.weather.items.filter(w =>
      isInteresting(w, lastTemps.has(w.stationId) ? lastTemps.get(w.stationId)! : null));

    await client.query("BEGIN");

    for (const c of chunks(data.cameras.items)) {
      await client.query(
        `INSERT INTO cameras (camera_id, name, road_number, bearing, geom, modified_time, deleted)
         SELECT u.camera_id, u.name, u.road_number, u.bearing,
                ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::text[],$3::text[],$4::int[],$5::float8[],$6::float8[],$7::timestamptz[],$8::bool[])
              AS u(camera_id, name, road_number, bearing, lon, lat, modified_time, deleted)
         ON CONFLICT (camera_id) DO UPDATE SET name=EXCLUDED.name, road_number=EXCLUDED.road_number,
           bearing=EXCLUDED.bearing, geom=EXCLUDED.geom, modified_time=EXCLUDED.modified_time, deleted=EXCLUDED.deleted`,
        [col(c, x => x.cameraId), col(c, x => x.name), col(c, x => x.roadNumber), col(c, x => x.bearing),
         col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.modifiedTime), col(c, x => x.deleted)]);
      counts.cameras += c.length;
    }

    for (const c of chunks(data.conditions.items)) {
      const args = [col(c, x => x.segmentId), col(c, x => x.conditionCode), col(c, x => x.conditionText),
        col(c, x => JSON.stringify(x.conditionInfo)), col(c, x => JSON.stringify(x.countyNos)),
        col(c, x => x.roadNumber), col(c, x => x.wgs84Line), col(c, x => x.startTime),
        col(c, x => x.endTime), col(c, x => x.modifiedTime), col(c, x => x.deleted)];
      await client.query(
        `INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info,
           county_nos, road_number, geom, start_time, end_time, modified_time, deleted)
         SELECT u.segment_id, u.condition_code, u.condition_text,
                ARRAY(SELECT jsonb_array_elements_text(u.condition_info::jsonb)),
                ARRAY(SELECT (jsonb_array_elements_text(u.county_nos::jsonb))::int),
                u.road_number, ST_GeomFromText(u.wkt, 4326), u.start_time, u.end_time, u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::int[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[],
                     $8::timestamptz[],$9::timestamptz[],$10::timestamptz[],$11::bool[])
              AS u(segment_id, condition_code, condition_text, condition_info, county_nos, road_number,
                   wkt, start_time, end_time, modified_time, deleted)
         ON CONFLICT (segment_id) DO UPDATE SET condition_code=EXCLUDED.condition_code,
           condition_text=EXCLUDED.condition_text, condition_info=EXCLUDED.condition_info,
           county_nos=EXCLUDED.county_nos, road_number=EXCLUDED.road_number,
           geom=COALESCE(EXCLUDED.geom, road_conditions.geom),
           start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
           modified_time=EXCLUDED.modified_time, deleted=EXCLUDED.deleted`, args);
      await client.query(
        `INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time, deleted)
         SELECT u.segment_id, u.condition_code, u.condition_text,
                ARRAY(SELECT jsonb_array_elements_text(u.condition_info::jsonb)), u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::int[],$3::text[],$4::text[],$5::timestamptz[],$6::bool[])
              AS u(segment_id, condition_code, condition_text, condition_info, modified_time, deleted)
         ON CONFLICT (segment_id, modified_time) DO NOTHING`,
        [args[0], args[1], args[2], args[3], args[9], args[10]]);
      counts.road_conditions += c.length;
      counts.history += c.length;
    }

    for (const c of chunks(data.weather.items)) {
      await client.query(
        `INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
         SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
                u.surface_temp_c, u.air_temp_c, u.precipitation, u.rain, u.snow
         FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],$7::numeric[],$8::text[],$9::bool[],$10::bool[])
              AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
         ON CONFLICT (station_id) DO UPDATE SET name=EXCLUDED.name, geom=EXCLUDED.geom,
           sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
           air_temp_c=EXCLUDED.air_temp_c, precipitation=EXCLUDED.precipitation,
           rain=EXCLUDED.rain, snow=EXCLUDED.snow`,
        [col(c, x => x.stationId), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat),
         col(c, x => x.sampleTime), col(c, x => x.surfaceTempC), col(c, x => x.airTempC),
         col(c, x => x.precipitation), col(c, x => x.rain), col(c, x => x.snow)]);
    }

    for (const c of chunks(keepWeather)) {
      await client.query(
        `INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c,
           air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow)
         SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
                u.surface_temp_c, u.air_temp_c, u.dewpoint_c, u.humidity_pct, u.precipitation, u.rain, u.snow
         FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],
                     $7::numeric[],$8::numeric[],$9::numeric[],$10::text[],$11::bool[],$12::bool[])
              AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c,
                   humidity_pct, precipitation, rain, snow)
         ON CONFLICT (station_id, sample_time) DO NOTHING`,
        [col(c, x => x.stationId), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat),
         col(c, x => x.sampleTime), col(c, x => x.surfaceTempC), col(c, x => x.airTempC),
         col(c, x => x.dewpointC), col(c, x => x.humidityPct), col(c, x => x.precipitation),
         col(c, x => x.rain), col(c, x => x.snow)]);
      counts.weather += c.length;
    }

    for (const c of chunks(data.deviations.items)) {
      await client.query(
        `INSERT INTO deviations (deviation_id, situation_id, message_type, message_type_value, message,
           severity_code, severity_text, road_number, county_nos, geom, line_geom,
           start_time, end_time, icon_id, modified_time, deleted)
         SELECT u.deviation_id, u.situation_id, u.message_type, u.message_type_value, u.message,
                u.severity_code, u.severity_text, u.road_number,
                ARRAY(SELECT (jsonb_array_elements_text(u.county_nos::jsonb))::int),
                CASE WHEN u.lon IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326) END,
                ST_GeomFromText(u.line_wkt, 4326), u.start_time, u.end_time, u.icon_id, u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::text[],$3::text[],$4::text[],$5::text[],$6::int[],$7::text[],$8::text[],
                     $9::text[],$10::float8[],$11::float8[],$12::text[],$13::timestamptz[],$14::timestamptz[],
                     $15::text[],$16::timestamptz[],$17::bool[])
              AS u(deviation_id, situation_id, message_type, message_type_value, message, severity_code,
                   severity_text, road_number, county_nos, lon, lat, line_wkt, start_time, end_time,
                   icon_id, modified_time, deleted)
         ON CONFLICT (deviation_id) DO UPDATE SET message=EXCLUDED.message,
           severity_code=EXCLUDED.severity_code, severity_text=EXCLUDED.severity_text,
           end_time=EXCLUDED.end_time, modified_time=EXCLUDED.modified_time, deleted=EXCLUDED.deleted`,
        [col(c, x => x.deviationId), col(c, x => x.situationId), col(c, x => x.messageType),
         col(c, x => x.messageTypeValue), col(c, x => x.message), col(c, x => x.severityCode),
         col(c, x => x.severityText), col(c, x => x.roadNumber), col(c, x => JSON.stringify(x.countyNos)),
         col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.wgs84Line), col(c, x => x.startTime),
         col(c, x => x.endTime), col(c, x => x.iconId), col(c, x => x.modifiedTime), col(c, x => x.deleted)]);
      counts.deviations += c.length;
    }

    for (const [source, id] of [
      ["weather", data.weather.lastChangeId], ["road_conditions", data.conditions.lastChangeId],
      ["cameras", data.cameras.lastChangeId], ["deviations", data.deviations.lastChangeId],
    ] as const) {
      if (id) await client.query(
        `INSERT INTO sync_state (source, last_change_id, synced_at) VALUES ($1,$2,now())
         ON CONFLICT (source) DO UPDATE SET last_change_id=$2, synced_at=now()`, [source, id]);
    }
    await client.query("COMMIT");
    return counts;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
