// Cellmätningen v3 (kort #43 steg 3, docs/RADAR-PLAN.md): radarpiloten mot stationernas
// regnmätare. Två riktningar + en kalibrering ur samma parning:
//   A) Bekräftelse: när radarn säger regn över ett segment, ser en regnmätare ≤ 5 km
//      från segmentet också regn (±45 min)? Per radarintensitetsband — bekräftelsen
//      ska växa med intensiteten, det är kurvans egen rimlighetskontroll.
//   B) Kalibrering: bland par där båda ser regn, medianen av radar (Marshall–Palmer,
//      rate_mean) / station (rain_sum_mm × 2 → mm/h). 1,0 = formeln träffar; känd
//      grovhet: 5-min-ögonblicksbild mot 30-min-summa, max-punkt kan ligga bort från
//      mätaren. v3 sätter siffran, gissar den inte.
//   C) Missriktningen: stationsregn (≥ 0,5 mm/30 min) vid en samplad komposittid,
//      station nära segmentnätet — skrev radarn någon rad ≤ 5 km? Approximation:
//      komposittider = distinkta observed_at (en rikstorr komposit lämnar inget spår).
//
// KEDJEBEVIS FÖRST: på tunt underlag bevisar körningen att parningen, enheterna och
// tidsmatchningen håller — domen på kort #43 kräver ~7 dygns data och fälls inte här.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/cell-matning-v3.ts [dagar=7]
// Självtest utan DB: scripts/cell-matning-v3.ts --sjalvtest

const DIST_M = 5000;      // station ↔ segment
const WIN_S = 2700;       // ±45 min radar ↔ stationsobservation
const MISS_MM = 0.5;      // stationsregn som räknas i missriktningen (mm/30 min)
const BAND: [string, number, number][] = [
  ["0,1–0,5", 0.1, 0.5], ["0,5–2  ", 0.5, 2], ["2–10   ", 2, 10], ["≥10    ", 10, Infinity]];

type RadarPar = { rateMax: number; rateMean: number; stationMmh: number };
type MissRad = { mmh: number; traff: boolean };

function utvardera(par: RadarPar[]) {
  const band = BAND.map(() => ({ n: 0, bekraftade: 0 }));
  const kvoter: number[] = [];
  for (const p of par) {
    const bi = BAND.findIndex(([, lo, hi]) => p.rateMax >= lo && p.rateMax < hi);
    if (bi < 0) continue;
    band[bi].n++;
    if (p.stationMmh > 0) {
      band[bi].bekraftade++;
      if (p.rateMean > 0) kvoter.push(p.rateMean / p.stationMmh);
    }
  }
  kvoter.sort((a, b) => a - b);
  return { band, median: kvoter.length ? kvoter[Math.floor(kvoter.length / 2)] : null, nKvot: kvoter.length };
}

function missar(rows: MissRad[]) {
  const n = rows.length;
  const traffar = rows.filter(r => r.traff).length;
  return { n, traffar };
}

function rapport(u: ReturnType<typeof utvardera>, m: ReturnType<typeof missar>, label: string) {
  console.log(`Cellmätningen v3 — radarn mot stationernas regnmätare (${label})`);
  console.log(`\nA) Bekräftelse per radarband (station ≤ ${DIST_M / 1000} km från segmentet, ±45 min):`);
  console.log(`band mm/h   par   station såg regn   andel`);
  for (let i = 0; i < BAND.length; i++) {
    const b = u.band[i];
    const p = b.n ? (100 * b.bekraftade / b.n).toFixed(0) + " %" : "—";
    console.log(`${BAND[i][0]}  ${String(b.n).padStart(5)} ${String(b.bekraftade).padStart(12)} ${p.padStart(12)}`);
  }
  console.log(`\nB) Kalibrering (radar rate_mean / station mm/h, båda > 0): median ${u.median === null ? "—" : u.median.toFixed(2)} över ${u.nKvot} par`);
  console.log(`   1,0 = Marshall–Palmer träffar. Grovhet: 5-min-bild mot 30-min-summa.`);
  console.log(`\nC) Missriktningen: ${m.n} stationsregn (≥ ${MISS_MM} mm/30 min) vid samplad komposittid,`);
  console.log(`   radarn hade rad ≤ ${DIST_M / 1000} km i ${m.traffar} fall (${m.n ? (100 * m.traffar / m.n).toFixed(0) : "—"} %). Approximation: rikstorra kompositer osynliga.`);
}

// ── Självtest med känd sanning, utan DB: injicerade par med exakt känt förhållande.
if (process.argv.includes("--sjalvtest")) {
  const par: RadarPar[] = [];
  for (let i = 0; i < 100; i++) par.push({ rateMax: 3, rateMean: 2, stationMmh: 1 });   // band 2–10, kvot 2,0
  for (let i = 0; i < 50; i++) par.push({ rateMax: 0.2, rateMean: 0.15, stationMmh: 0 }); // band 0,1–0,5, obekräftat
  const u = utvardera(par);
  const m = missar([...Array(10).fill({ mmh: 1, traff: true }), ...Array(5).fill({ mmh: 1, traff: false })]);
  rapport(u, m, "SJÄLVTEST — injicerade par, kvot exakt 2,0");
  let ok = true;
  if (u.band[2].n !== 100 || u.band[2].bekraftade !== 100) { console.error(`SJÄLVTEST: band 2–10 ${u.band[2].n}/${u.band[2].bekraftade}, väntat 100/100`); ok = false; }
  if (u.band[0].n !== 50 || u.band[0].bekraftade !== 0) { console.error(`SJÄLVTEST: band 0,1–0,5 ${u.band[0].n}/${u.band[0].bekraftade}, väntat 50/0`); ok = false; }
  if (u.median !== 2) { console.error(`SJÄLVTEST: median ${u.median}, väntat 2`); ok = false; }
  if (m.n !== 15 || m.traffar !== 10) { console.error(`SJÄLVTEST: missar ${m.traffar}/${m.n}, väntat 10/15`); ok = false; }
  if (!ok) process.exit(1);
  console.log(`\nSJÄLVTEST OK: band, bekräftelse, mediankvot och missräkning återfinner den kända sanningen.`);
  process.exit(0);
}

// ── Skarpt: parningen i SQL (PostGIS gör avstånden), metriken ovan gör matten.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 7);

// Stationer med regnmätare nära segmentnätet (en rad per station, senaste positionen).
const NARA = `
  nara AS (
    SELECT w.station_id, w.geom, rc.segment_id
    FROM (SELECT DISTINCT ON (station_id) station_id, geom FROM weather_observations
          WHERE sample_time > now() - $1 * interval '1 day' AND rain_sum_mm IS NOT NULL
          ORDER BY station_id, sample_time DESC) w
    JOIN road_conditions rc ON NOT rc.deleted AND rc.geom IS NOT NULL
      AND ST_DWithin(rc.geom::geography, w.geom::geography, ${DIST_M})
  )`;

// A+B: varje radarhändelse × närliggande mätarstation, närmaste observation i tid.
const parRes = await pool.query(`
  WITH ${NARA}
  SELECT r.rate_max_mmh AS mx, r.rate_mean_mmh AS mn, o.rain_sum_mm * 2 AS station_mmh
  FROM radar_precip r
  JOIN nara n USING (segment_id)
  CROSS JOIN LATERAL (
    SELECT rain_sum_mm FROM weather_observations w
    WHERE w.station_id = n.station_id AND w.rain_sum_mm IS NOT NULL
      AND w.sample_time BETWEEN r.observed_at - interval '${WIN_S} seconds'
                            AND r.observed_at + interval '${WIN_S} seconds'
    ORDER BY abs(extract(epoch FROM w.sample_time - r.observed_at)) LIMIT 1
  ) o
  WHERE r.observed_at > now() - $1 * interval '1 day'`, [DAYS]);

// C: stationsregn nära nätet vid samplad komposittid — fanns någon radarrad ≤ 5 km?
const missRes = await pool.query(`
  WITH ${NARA},
  ev AS (
    SELECT DISTINCT w.station_id, w.geom, w.sample_time, w.rain_sum_mm
    FROM weather_observations w
    JOIN (SELECT DISTINCT station_id FROM nara) s USING (station_id)
    WHERE w.sample_time > now() - $1 * interval '1 day' AND w.rain_sum_mm >= ${MISS_MM}
  ),
  komp AS (SELECT DISTINCT observed_at FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day')
  SELECT ev.rain_sum_mm * 2 AS mmh,
    EXISTS (
      SELECT 1 FROM radar_precip r
      JOIN road_conditions rc ON rc.segment_id = r.segment_id
      WHERE r.observed_at = k.observed_at
        AND ST_DWithin(rc.geom::geography, ev.geom::geography, ${DIST_M})
    ) AS traff
  FROM ev
  CROSS JOIN LATERAL (
    SELECT observed_at FROM komp
    WHERE abs(extract(epoch FROM komp.observed_at - ev.sample_time)) <= ${WIN_S}
    ORDER BY abs(extract(epoch FROM komp.observed_at - ev.sample_time)) LIMIT 1
  ) k`, [DAYS]);

const span = await pool.query(`SELECT min(observed_at) AS a, max(observed_at) AS b, count(DISTINCT observed_at) AS k FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'`, [DAYS]);
await pool.end();

const par: RadarPar[] = parRes.rows.map((r: any) => ({ rateMax: +r.mx, rateMean: +r.mn, stationMmh: +r.station_mmh }));
const miss: MissRad[] = missRes.rows.map((r: any) => ({ mmh: +r.mmh, traff: Boolean(r.traff) }));

console.log(`Underlag: ${par.length} radar↔station-par, ${miss.length} stationsregn vid komposittid,`);
console.log(`${span.rows[0].k} kompositer ${span.rows[0].a ?? "—"} → ${span.rows[0].b ?? "—"} (${DAYS} dygn bakåt)`);
if (par.length < 20) {
  console.error(`UNDERLAGSVAKT: ${par.length} par (< 20) — antingen är piloten/regnkolumnen trasig eller fönstret för torrt. Grön-men-tom räknas inte.`);
  process.exit(1);
}
rapport(utvardera(par), missar(miss), `senaste ${DAYS} dygnen`);
console.log(`\n⚠️ KEDJEBEVIS — INGEN DOM: domen på kort #43 kräver ~7 dygns radardata och fälls i eget varv.`);
