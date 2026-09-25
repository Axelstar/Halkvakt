// Rekonstruktionen — motorns faror vid en given tid, återskapade ur arkivet (kort #19; rättad i kort #255). Missmätningen
// (publish/missar.ts) kör motorn på dem, och uppspelningen av vind och sikt längs rutterna (W-B5, roll A) ska göra detsamma
// (DECISIONS #363). Frågefunktionen tas som argument, så att modulen kan provas mot riktig PostGIS utan att köra något.
import type { Hazard } from "../engine/src/types.ts";

type Fraga = (sql: string, params?: unknown[]) => Promise<any[]>;

/** Fukten — samma torrord som snapshotkärnan (`DRY`), i den form kontraktsgrinden vaktar: Trafikverkets "no" och de nordiska
 *  källornas "Dry" är uppehåll. Den tidigare formen `COALESCE(precipitation,'') <> ''` gjorde varje torr station blöt (#255),
 *  så rekonstruktionen fick frysrisk vid uppehåll och motorn "hade varnat" oftare än den skulle. */
export const FUKT_SQL =
  "(rain OR snow OR COALESCE(precipitation,'') <> '')";

/** Frysriskpunkterna (varje stations senaste rad de 45 minuterna före t) och halksträckorna (varje segments senaste ändring de
 *  12 timmarna före t). */
export async function hazardsAt(fraga: Fraga, t: Date): Promise<Hazard[]> {
  const out: Hazard[] = [];
  const wx = await fraga(`
    SELECT DISTINCT ON (station_id) station_id,
      ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, surface_temp_c,
      ${FUKT_SQL} AS moisture
    FROM weather_observations
    WHERE sample_time BETWEEN $1::timestamptz - interval '45 min' AND $1::timestamptz
      AND geom IS NOT NULL
    ORDER BY station_id, sample_time DESC`, [t]);
  for (const r of wx)
    out.push({ id: `wx:${r.station_id}`, kind: "icing_point", lon: +r.lon, lat: +r.lat,
      meta: { surfaceTempC: r.surface_temp_c === null ? null : +r.surface_temp_c, moisture: !!r.moisture } });
  const seg = await fraga(`
    SELECT DISTINCT ON (h.segment_id) h.segment_id, h.condition_code, h.condition_info,
      ST_AsGeoJSON(c.geom::geometry) gj
    FROM road_condition_history h
    JOIN road_conditions c USING (segment_id)
    WHERE h.modified_time <= $1 AND h.modified_time > $1::timestamptz - interval '12 hours'
      AND NOT h.deleted AND c.geom IS NOT NULL
    ORDER BY h.segment_id, h.modified_time DESC`, [t]);
  for (const r of seg) {
    const line = JSON.parse(r.gj)?.coordinates as [number, number][] | undefined;
    if (line?.length) out.push({ id: `seg:${r.segment_id}`, kind: "slippery_segment", line,
      meta: { code: r.condition_code, info: r.condition_info ?? [] } });
  }
  return out;
}
