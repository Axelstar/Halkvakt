// Postgres/PostGIS writes. Batched (UNNEST) — one statement per ~500 rows,
// not one per row: run #2 taught us the pooler punishes chatty writers.
// Auto-migrates on start (sql/001_init.sql is fully idempotent).
import pg from "pg";
import { readFileSync } from "node:fs";
import { ingestAction, shouldArchive } from "./sources/situations.ts";
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
  wildlife?: { items: import("./sources/polisen.ts").WildlifeEvent[] };
  smhi?: { items: import("./sources/smhi.ts").SmhiWarningArea[] };
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = { cameras: 0, road_conditions: 0, history: 0, weather: 0, deviations: 0, archive: 0, wildlife: 0, smhi: 0 };
  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query(readFileSync(new URL("../sql/001_init.sql", import.meta.url), "utf8"));
    await client.query(readFileSync(new URL("../sql/003_situation_archive.sql", import.meta.url), "utf8"));
    await client.query(readFileSync(new URL("../sql/008_rain_sum.sql", import.meta.url), "utf8"));
    await client.query(readFileSync(new URL("../sql/011_vind_sikt.sql", import.meta.url), "utf8"));
    await client.query(readFileSync(new URL("../sql/015_smhi_giltighet.sql", import.meta.url), "utf8"));

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
        col(c, x => x.roadNumber), col(c, x => x.locationText), col(c, x => x.wgs84Line), col(c, x => x.startTime),
        col(c, x => x.endTime), col(c, x => x.modifiedTime), col(c, x => x.deleted)];
      const rcRes = await client.query(
        `INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info,
           county_nos, road_number, location_text, geom, start_time, end_time, modified_time, deleted)
         SELECT u.segment_id, u.condition_code, u.condition_text,
                ARRAY(SELECT jsonb_array_elements_text(u.condition_info::jsonb)),
                ARRAY(SELECT (jsonb_array_elements_text(u.county_nos::jsonb))::int),
                u.road_number, u.location_text, ST_GeomFromText(u.wkt, 4326), u.start_time, u.end_time, u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::int[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[],$8::text[],
                     $9::timestamptz[],$10::timestamptz[],$11::timestamptz[],$12::bool[])
              AS u(segment_id, condition_code, condition_text, condition_info, county_nos, road_number,
                   location_text, wkt, start_time, end_time, modified_time, deleted)
         ON CONFLICT (segment_id) DO UPDATE SET condition_code=EXCLUDED.condition_code,
           condition_text=EXCLUDED.condition_text, condition_info=EXCLUDED.condition_info,
           county_nos=EXCLUDED.county_nos, road_number=EXCLUDED.road_number,
           location_text=COALESCE(EXCLUDED.location_text, road_conditions.location_text),
           geom=COALESCE(EXCLUDED.geom, road_conditions.geom),
           start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
           modified_time=EXCLUDED.modified_time, deleted=EXCLUDED.deleted
         WHERE road_conditions.modified_time IS NULL
            OR EXCLUDED.modified_time >= road_conditions.modified_time`, args);
      const histRes = await client.query(
        `INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time, deleted)
         SELECT u.segment_id, u.condition_code, u.condition_text,
                ARRAY(SELECT jsonb_array_elements_text(u.condition_info::jsonb)), u.modified_time, u.deleted
         FROM UNNEST($1::text[],$2::int[],$3::text[],$4::text[],$5::timestamptz[],$6::bool[])
              AS u(segment_id, condition_code, condition_text, condition_info, modified_time, deleted)
         ON CONFLICT (segment_id, modified_time) DO NOTHING`,
        // OBS: location_text sköts in på index 6 (kort #48) — modified_time/deleted är nu 10/11.
        [args[0], args[1], args[2], args[3], args[10], args[11]]);
      counts.road_conditions += rcRes.rowCount ?? 0;
      counts.history += histRes.rowCount ?? 0;
    }

    for (const c of chunks(data.weather.items)) {
      await client.query(
        `INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
           wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
         SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
                u.surface_temp_c, u.air_temp_c, u.precipitation, u.rain, u.snow,
                u.wind_speed_ms, u.wind_gust_ms, u.wind_dir_deg, u.visibility_m
         FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],$7::numeric[],$8::text[],$9::bool[],$10::bool[],
                     $11::numeric[],$12::numeric[],$13::numeric[],$14::numeric[])
              AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
                   wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
         ON CONFLICT (station_id) DO UPDATE SET name=EXCLUDED.name, geom=EXCLUDED.geom,
           sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
           air_temp_c=EXCLUDED.air_temp_c, precipitation=EXCLUDED.precipitation,
           rain=EXCLUDED.rain, snow=EXCLUDED.snow,
           wind_speed_ms=EXCLUDED.wind_speed_ms, wind_gust_ms=EXCLUDED.wind_gust_ms,
           wind_dir_deg=EXCLUDED.wind_dir_deg, visibility_m=EXCLUDED.visibility_m`,
        [col(c, x => x.stationId), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat),
         col(c, x => x.sampleTime), col(c, x => x.surfaceTempC), col(c, x => x.airTempC),
         col(c, x => x.precipitation), col(c, x => x.rain), col(c, x => x.snow),
         col(c, x => x.windSpeedMs), col(c, x => x.windGustMs), col(c, x => x.windDirDeg), col(c, x => x.visibilityM)]);
    }

    for (const c of chunks(keepWeather)) {
      await client.query(
        `INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c,
           air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow, rain_sum_mm, snow_wateq_mm,
           wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
         SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
                u.surface_temp_c, u.air_temp_c, u.dewpoint_c, u.humidity_pct, u.precipitation, u.rain, u.snow,
                u.rain_sum_mm, u.snow_wateq_mm, u.wind_speed_ms, u.wind_gust_ms, u.wind_dir_deg, u.visibility_m
         FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],
                     $7::numeric[],$8::numeric[],$9::numeric[],$10::text[],$11::bool[],$12::bool[],
                     $13::numeric[],$14::numeric[],$15::numeric[],$16::numeric[],$17::numeric[],$18::numeric[])
              AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c,
                   humidity_pct, precipitation, rain, snow, rain_sum_mm, snow_wateq_mm,
                   wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
         ON CONFLICT (station_id, sample_time) DO NOTHING`,
        [col(c, x => x.stationId), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat),
         col(c, x => x.sampleTime), col(c, x => x.surfaceTempC), col(c, x => x.airTempC),
         col(c, x => x.dewpointC), col(c, x => x.humidityPct), col(c, x => x.precipitation),
         col(c, x => x.rain), col(c, x => x.snow), col(c, x => x.rainSumMm), col(c, x => x.snowWateqMm),
         col(c, x => x.windSpeedMs), col(c, x => x.windGustMs), col(c, x => x.windDirDeg), col(c, x => x.visibilityM)]);
      counts.weather += c.length;
    }

    // Deletes are applied as an UPDATE, never an INSERT (see ingestAction in
    // sources/situations.ts). A delete must always be able to clear a hazard we are
    // warning about, but it must NOT be able to create a row for something we never
    // stored — that is what filled the table with 4 584 tombstones for roadworks and
    // other types we deliberately do not ship. UPDATE touches 0 rows when we never
    // held it, which is exactly the wanted behaviour.
    const dying = data.deviations.items.filter((d) => d.deleted);
    const living = data.deviations.items.filter((d) => !d.deleted && ingestAction(d.messageTypeValue, false) === "store");
    // #33: the durable archive. Insert on first sight, refresh on resight, never delete.
    const archive = data.deviations.items.filter((d) => !d.deleted && shouldArchive(d.messageTypeValue));
    for (const c of chunks(archive)) {
      await client.query(
        `INSERT INTO situation_archive (deviation_id, message_type_value, message_type, message,
           severity_code, road_number, icon_id, geom, start_time, end_time)
         SELECT u.deviation_id, u.message_type_value, u.message_type, u.message, u.severity_code,
                u.road_number, u.icon_id,
                CASE WHEN u.lon IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326) END,
                u.start_time, u.end_time
         FROM UNNEST($1::text[],$2::text[],$3::text[],$4::text[],$5::int[],$6::text[],$7::text[],
                     $8::float8[],$9::float8[],$10::timestamptz[],$11::timestamptz[])
              AS u(deviation_id, message_type_value, message_type, message, severity_code,
                   road_number, icon_id, lon, lat, start_time, end_time)
         ON CONFLICT (deviation_id) DO UPDATE SET message = EXCLUDED.message,
           severity_code = EXCLUDED.severity_code, end_time = EXCLUDED.end_time,
           geom = COALESCE(EXCLUDED.geom, situation_archive.geom), last_seen = now()`,
        [col(c, x => x.deviationId), col(c, x => x.messageTypeValue), col(c, x => x.messageType),
         col(c, x => x.message), col(c, x => x.severityCode), col(c, x => x.roadNumber), col(c, x => x.iconId),
         col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.startTime), col(c, x => x.endTime)]);
      counts.archive += c.length;
    }
    for (const c of chunks(dying)) {
      const r = await client.query(
        `UPDATE deviations SET deleted = TRUE, modified_time = u.modified_time
         FROM UNNEST($1::text[], $2::timestamptz[]) AS u(deviation_id, modified_time)
         WHERE deviations.deviation_id = u.deviation_id`,
        [col(c, x => x.deviationId), col(c, x => x.modifiedTime)]);
      counts.deviations += r.rowCount ?? 0;
    }

    for (const c of chunks(living)) {
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

    for (const c of chunks(data.wildlife?.items ?? [])) {
      await client.query(
        `INSERT INTO polisen_events (event_id, datetime, county_name, geom, summary, url, road_number, species, place_hint)
         SELECT u.event_id, u.datetime, u.county_name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326),
                u.summary, u.url, u.road_number, u.species, u.place_hint
         FROM UNNEST($1::bigint[],$2::timestamptz[],$3::text[],$4::float8[],$5::float8[],
                     $6::text[],$7::text[],$8::text[],$9::text[],$10::text[])
              AS u(event_id, datetime, county_name, lon, lat, summary, url, road_number, species, place_hint)
         ON CONFLICT (event_id) DO NOTHING`,
        [col(c, x => x.eventId), col(c, x => x.datetime), col(c, x => x.countyName),
         col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.summary), col(c, x => x.url),
         col(c, x => x.roadNumber), col(c, x => x.species), col(c, x => x.placeHint)]);
      counts.wildlife += c.length;
    }

    if (data.smhi) {
      await client.query(`DELETE FROM smhi_warnings`); // replace-all: feed IS the current truth
      for (const c of chunks(data.smhi.items)) {
        const params = [col(c, x => x.areaId), col(c, x => x.warningId), col(c, x => x.eventCode),
          col(c, x => x.eventSv), col(c, x => x.levelCode), col(c, x => x.levelSv),
          col(c, x => x.descriptionSv), col(c, x => x.areaName),
          col(c, x => JSON.stringify(x.affectedAreas)),
          col(c, x => x.geometry ? JSON.stringify(x.geometry) : null),
          col(c, x => x.approximateStart), col(c, x => x.approximateEnd), col(c, x => x.published)];
        await client.query(
          `INSERT INTO smhi_warnings (area_id, warning_id, event_code, event_sv, level_code, level_sv,
             description_sv, area_name, affected_areas, geom, approx_start, approx_end, published)
           SELECT u.area_id, u.warning_id, u.event_code, u.event_sv, u.level_code, u.level_sv,
                  u.description_sv, u.area_name, u.affected_areas::jsonb,
                  CASE WHEN u.geom_json IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON(u.geom_json), 4326) END,
                  u.approx_start, u.approx_end, u.published
           FROM UNNEST($1::bigint[],$2::bigint[],$3::text[],$4::text[],$5::text[],$6::text[],
                       $7::text[],$8::text[],$9::text[],$10::text[],$11::timestamptz[],$12::timestamptz[],$13::timestamptz[])
                AS u(area_id, warning_id, event_code, event_sv, level_code, level_sv,
                     description_sv, area_name, affected_areas, geom_json, approx_start, approx_end, published)`, params);
        await client.query(
          // approx_start/approx_end följer med sedan sql/015 (kort #95 d): nuläget töms vid varje
          // synk, så gäller-fönstret finns bara här. SMHI publicerar i förväg — utan de två
          // fälten vet arkivet när varningen publicerades, inte när den gällde.
          `INSERT INTO smhi_warnings_history (area_id, published, warning_id, event_code, level_code, area_name, geom, approx_start, approx_end)
           SELECT area_id, published, warning_id, event_code, level_code, area_name, geom, approx_start, approx_end
           FROM smhi_warnings WHERE area_id = ANY($1::bigint[])
           ON CONFLICT (area_id, published) DO NOTHING`, [col(c, x => x.areaId)]);
        counts.smhi += c.length;
      }
    }

    for (const [source, id] of [
      ["weather", data.weather.lastChangeId], ["road_conditions_arkiv", data.conditions.lastChangeId],
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
