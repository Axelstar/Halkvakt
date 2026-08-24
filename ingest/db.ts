// Postgres/PostGIS writes. Idempotent upserts keyed on source ids;
// append-only history tables ARE the archive (DECISIONS.md #4).
// Implemented against sql/001_init.sql. Wired to Supabase when DATABASE_URL exists.
import pg from "pg";
import { type TvResult } from "./trafikverket.ts";
import { type WeatherObs, isInteresting } from "./sources/weather.ts";
import { type RoadConditionSeg } from "./sources/roadcondition.ts";
import { type CameraSite } from "./sources/cameras.ts";
import { type Deviation } from "./sources/situations.ts";

export async function writeAll(data: {
  weather: TvResult<WeatherObs>;
  conditions: TvResult<RoadConditionSeg>;
  cameras: TvResult<CameraSite>;
  deviations: TvResult<Deviation>;
}): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set (use --dry-run without a database)");
  const pool = new pg.Pool({ connectionString: url, max: 3 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // cameras: upsert current state
    for (const c of data.cameras.items) {
      await client.query(
        `INSERT INTO cameras (camera_id, name, road_number, bearing, geom, modified_time, deleted)
         VALUES ($1,$2,$3,$4, ST_SetSRID(ST_MakePoint($5,$6),4326), $7,$8)
         ON CONFLICT (camera_id) DO UPDATE SET name=$2, road_number=$3, bearing=$4,
           geom=ST_SetSRID(ST_MakePoint($5,$6),4326), modified_time=$7, deleted=$8`,
        [c.cameraId, c.name, c.roadNumber, c.bearing, c.lon, c.lat, c.modifiedTime, c.deleted]);
    }
    // road conditions: upsert current + append history row on change
    for (const r of data.conditions.items) {
      await client.query(
        `INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info,
           county_nos, road_number, geom, start_time, end_time, modified_time, deleted)
         VALUES ($1,$2,$3,$4,$5,$6, ST_GeomFromText($7,4326), $8,$9,$10,$11)
         ON CONFLICT (segment_id) DO UPDATE SET condition_code=$2, condition_text=$3,
           condition_info=$4, county_nos=$5, road_number=$6,
           geom=COALESCE(ST_GeomFromText($7,4326), road_conditions.geom),
           start_time=$8, end_time=$9, modified_time=$10, deleted=$11`,
        [r.segmentId, r.conditionCode, r.conditionText, r.conditionInfo, r.countyNos,
         r.roadNumber, r.wgs84Line, r.startTime, r.endTime, r.modifiedTime, r.deleted]);
      await client.query(
        `INSERT INTO road_condition_history (segment_id, condition_code, condition_text,
           condition_info, modified_time, deleted)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (segment_id, modified_time) DO NOTHING`,
        [r.segmentId, r.conditionCode, r.conditionText, r.conditionInfo, r.modifiedTime, r.deleted]);
    }
    // weather: archive-policy filtered append
    for (const w of data.weather.items) {
      const last = await client.query(
        `SELECT surface_temp_c FROM weather_observations
         WHERE station_id=$1 ORDER BY sample_time DESC LIMIT 1`, [w.stationId]);
      const lastTemp = last.rows[0]?.surface_temp_c ?? null;
      if (!isInteresting(w, lastTemp === null ? null : Number(lastTemp))) continue;
      await client.query(
        `INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c,
           air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow)
         VALUES ($1,$2, ST_SetSRID(ST_MakePoint($3,$4),4326), $5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (station_id, sample_time) DO NOTHING`,
        [w.stationId, w.name, w.lon, w.lat, w.sampleTime, w.surfaceTempC, w.airTempC,
         w.dewpointC, w.humidityPct, w.precipitation, w.rain, w.snow]);
    }
    // deviations: upsert current
    for (const d of data.deviations.items) {
      await client.query(
        `INSERT INTO deviations (deviation_id, situation_id, message_type, message_type_value,
           message, severity_code, severity_text, road_number, county_nos, geom, line_geom,
           start_time, end_time, icon_id, modified_time, deleted)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
           CASE WHEN $10::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($10,$11),4326) END,
           ST_GeomFromText($12,4326), $13,$14,$15,$16,$17)
         ON CONFLICT (deviation_id) DO UPDATE SET message=$5, severity_code=$6, severity_text=$7,
           end_time=$14, modified_time=$16, deleted=$17`,
        [d.deviationId, d.situationId, d.messageType, d.messageTypeValue, d.message,
         d.severityCode, d.severityText, d.roadNumber, d.countyNos, d.lon, d.lat,
         d.wgs84Line, d.startTime, d.endTime, d.iconId, d.modifiedTime, d.deleted]);
    }
    // persist changeids for delta sync next run
    for (const [source, id] of [
      ["weather", data.weather.lastChangeId], ["road_conditions", data.conditions.lastChangeId],
      ["cameras", data.cameras.lastChangeId], ["deviations", data.deviations.lastChangeId],
    ] as const) {
      if (id) await client.query(
        `INSERT INTO sync_state (source, last_change_id, synced_at) VALUES ($1,$2,now())
         ON CONFLICT (source) DO UPDATE SET last_change_id=$2, synced_at=now()`, [source, id]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
