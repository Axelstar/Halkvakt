// #19 Missmätningsskriptet (Bengts design, granskning I+II): skuggmotorn säger vad
// motorn SA — det här skriptet säger vad den BORDE ha sagt. Tar arkivets halk-
// händelser (SMHI-varningar + Situation-halka) nära referensrutterna och frågar:
// hade motorn varnat, givet REKONSTRUERADE hazards vid händelsens tid? Utdata:
// per vecka — händelser, träffar, missar. Missandelen dömer tystnadsdesignen.
//
// Körs manuellt (workflow_dispatch: missar.yml) eller: DATABASE_URL=... node
// --experimental-strip-types publish/missar.ts [dagar-bakåt, default 30]
import pg from "pg";
import { AlertEngine } from "../engine/src/engine.ts";
import type { Fix, Hazard } from "../engine/src/types.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

const DAYS = Number(process.argv[2] ?? 30);
const NEAR_ROUTE_KM = 10;

// Samma fasta polylinjer som skuggmotorn (supabase/functions/skuggmotor) — håll i takt.
const ROUTES: Record<string, [number, number][]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
};

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function nearAnyRoute(lon: number, lat: number): string | null {
  for (const [name, line] of Object.entries(ROUTES))
    for (const [rlon, rlat] of line)
      if (haversineKm(lon, lat, rlon, rlat) <= NEAR_ROUTE_KM) return name;
  return null;
}
function traceAlong(line: [number, number][], kmh = 80, stepS = 2): Fix[] {
  const mps = (kmh * 1000) / 3600; const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineKm(lon1, lat1, lon2, lat2) * 1000;
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

/** Rekonstruera motorns hazards vid tidpunkt T ur arkivet (frysrisk + halksträckor). */
async function hazardsAt(t: Date): Promise<Hazard[]> {
  const out: Hazard[] = [];
  const wx = await pool.query(`
    SELECT DISTINCT ON (station_id) station_id,
      ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, surface_temp_c,
      (rain OR snow OR COALESCE(precipitation,'') <> '') AS moisture
    FROM weather_observations
    WHERE sample_time BETWEEN $1::timestamptz - interval '45 min' AND $1::timestamptz
      AND geom IS NOT NULL
    ORDER BY station_id, sample_time DESC`, [t]);
  for (const r of wx.rows)
    out.push({ id: `wx:${r.station_id}`, kind: "icing_point", lon: +r.lon, lat: +r.lat,
      meta: { surfaceTempC: r.surface_temp_c === null ? null : +r.surface_temp_c, moisture: !!r.moisture } });
  const seg = await pool.query(`
    SELECT DISTINCT ON (h.segment_id) h.segment_id, h.condition_code, h.condition_info,
      ST_AsGeoJSON(c.geom::geometry) gj
    FROM road_condition_history h
    JOIN road_conditions c USING (segment_id)
    WHERE h.modified_time <= $1 AND h.modified_time > $1::timestamptz - interval '12 hours'
      AND NOT h.deleted AND c.geom IS NOT NULL
    ORDER BY h.segment_id, h.modified_time DESC`, [t]);  for (const r of seg.rows) {
    const line = JSON.parse(r.gj)?.coordinates as [number, number][] | undefined;
    if (line?.length) out.push({ id: `seg:${r.segment_id}`, kind: "slippery_segment", line,
      meta: { code: r.condition_code, info: r.condition_info ?? [] } });
  }
  return out;
}

// Händelser: SMHI-halkvarningar + Situation-halka, nära rutterna, i fönstret.
const events = await pool.query(`
  SELECT 'smhi:' || warning_id AS id, archived_at AS t,
    ST_X(ST_Centroid(geom::geometry)) lon, ST_Y(ST_Centroid(geom::geometry)) lat, event_code AS what
  FROM smhi_warnings_history WHERE geom IS NOT NULL AND archived_at > now() - $1 * interval '1 day'
  UNION ALL
  SELECT 'dev:' || deviation_id, COALESCE(start_time, modified_time),
    ST_X(geom::geometry), ST_Y(geom::geometry), message
  FROM deviations
  WHERE geom IS NOT NULL AND COALESCE(start_time, modified_time) > now() - $1 * interval '1 day'
    AND (message ~* 'halk|ishalka|\\mis\\M|\\misig\\M|\\msnö|snöfall|glatt|\\mhalt\\M' OR icon_id ~* 'ice|slip')`, [DAYS]);

type Row = { week: string; route: string; hit: boolean; id: string };
const rows: Row[] = [];
for (const e of events.rows) {
  const route = nearAnyRoute(+e.lon, +e.lat);
  if (!route) continue;
  const hazards = await hazardsAt(e.t);
  const alerts = new AlertEngine(hazards).run(traceAlong(ROUTES[route]));
  const hit = alerts.some((a) => a.kind === "icing_point" || a.kind === "slippery_segment");
  const wk = new Date(e.t); const week = `${wk.getUTCFullYear()}-v${String(Math.ceil(((+wk - +new Date(Date.UTC(wk.getUTCFullYear(),0,1))) / 86400000 + 1) / 7)).padStart(2,"0")}`;
  rows.push({ week, route, hit, id: e.id });
  if (!hit) console.log(`  MISS ${e.id} @ ${route} (${new Date(e.t).toISOString().slice(0,16)}) — "${String(e.what).slice(0,70)}"`);
}

const weeks = new Map<string, { n: number; hits: number }>();
for (const r of rows) {
  const w = weeks.get(r.week) ?? { n: 0, hits: 0 };
  w.n++; if (r.hit) w.hits++;
  weeks.set(r.week, w);
}
console.log(`Missmätning senaste ${DAYS} dygnen — händelser nära referensrutterna: ${rows.length}`);
console.log("vecka      händelser  träffar  missar  missandel");
for (const [w, s] of [...weeks.entries()].sort()) {
  const miss = s.n - s.hits;
  console.log(`${w.padEnd(10)} ${String(s.n).padStart(9)} ${String(s.hits).padStart(8)} ${String(miss).padStart(7)}  ${(miss / s.n * 100).toFixed(0)}%`);
}
if (!rows.length) console.log("(tomt resultat — förväntat i augusti; skriptet är laddat för första halkdagen)");
await pool.end();
