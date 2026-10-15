// Cellmätningen v3 (kort #43 steg 3, docs/RADAR-PLAN.md): radarpiloten mot stationernas
// regnmätare. Två riktningar + en kalibrering ur samma parning:
//   A) Bekräftelse: när radarn säger regn över ett segment, ser en regnmätare ≤ 5 km
//      från segmentet också regn (±45 min)? Per radarintensitetsband — bekräftelsen
//      ska växa med intensiteten, det är kurvans egen rimlighetskontroll. Bandad på både
//      rate_max och rate_mean; till 15/10 bara på rate_max, fast trösklarna står på
//      rate_mean (DECISIONS #565).
//   B) Kalibrering: bland par där båda ser regn, medianen av radar (Marshall–Palmer,
//      rate_mean) / station (rain_sum_mm × 2 → mm/h). 1,0 = formeln träffar; känd
//      grovhet: 5-min-ögonblicksbild mot 30-min-summa, max-punkt kan ligga bort från
//      mätaren. v3 sätter siffran, gissar den inte.
//   C) Missriktningen: stationsregn (≥ 0,5 mm/30 min) vid en samplad komposittid,
//      station nära segmentnätet — skrev radarn någon rad ≤ 5 km? Approximation:
//      komposittider = distinkta observed_at (en rikstorr komposit lämnar inget spår).
//      Närheten tas ur nara (räknad en gång); ett avstånd per stationsregn sprängde
//      300 s en blöt vecka (kort #346, DECISIONS #567). A och B skrivs ut före C.
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
type Falt = "rateMax" | "rateMean";

function utvardera(par: RadarPar[], falt: Falt) {
  const band = BAND.map(() => ({ n: 0, bekraftade: 0 }));
  let under = 0;
  for (const p of par) {
    const bi = BAND.findIndex(([, lo, hi]) => p[falt] >= lo && p[falt] < hi);
    if (bi < 0) { under++; continue; }
    band[bi].n++;
    if (p.stationMmh > 0) band[bi].bekraftade++;
  }
  return { band, under };
}

// Same pairs as before 15/10: those in a rate_max band (radar rows exist only from rate_max 0,1).
function kalibrera(par: RadarPar[]) {
  const kvoter = par.filter(p => p.rateMax >= BAND[0][1] && p.stationMmh > 0 && p.rateMean > 0)
    .map(p => p.rateMean / p.stationMmh).sort((a, b) => a - b);
  return { median: kvoter.length ? kvoter[Math.floor(kvoter.length / 2)] : null, nKvot: kvoter.length };
}

function missar(rows: MissRad[]) {
  const n = rows.length;
  const traffar = rows.filter(r => r.traff).length;
  return { n, traffar };
}

function rapportA(u: ReturnType<typeof utvardera>, falt: string) {
  console.log(`\nA) Bekräftelse per radarband på ${falt} (station ≤ ${DIST_M / 1000} km från segmentet, ±45 min):`);
  console.log(`band mm/h   par   station såg regn   andel`);
  for (let i = 0; i < BAND.length; i++) {
    const b = u.band[i];
    const p = b.n ? (100 * b.bekraftade / b.n).toFixed(0) + " %" : "—";
    console.log(`${BAND[i][0]}  ${String(b.n).padStart(5)} ${String(b.bekraftade).padStart(12)} ${p.padStart(12)}`);
  }
  if (u.under) console.log(`< 0,1    ${String(u.under).padStart(5)}   (under lägsta bandet, räknas inte)`);
}

function rapportB(k: ReturnType<typeof kalibrera>) {
  console.log(`\nB) Kalibrering (radar rate_mean / station mm/h, båda > 0): median ${k.median === null ? "—" : k.median.toFixed(2)} över ${k.nKvot} par`);
  console.log(`   1,0 = Marshall–Palmer träffar. Grovhet: 5-min-bild mot 30-min-summa.`);
}

function rapportC(m: ReturnType<typeof missar>) {
  console.log(`\nC) Missriktningen: ${m.n} stationsregn (≥ ${MISS_MM} mm/30 min) vid samplad komposittid,`);
  console.log(`   radarn hade rad ≤ ${DIST_M / 1000} km i ${m.traffar} fall (${m.n ? (100 * m.traffar / m.n).toFixed(0) : "—"} %). Approximation: rikstorra kompositer osynliga.`);
}

// ── Självtest med känd sanning, utan DB: injicerade par med exakt känt förhållande.
if (process.argv.includes("--sjalvtest")) {
  const par: RadarPar[] = [];
  for (let i = 0; i < 100; i++) par.push({ rateMax: 3, rateMean: 2, stationMmh: 1 });   // 2–10 i båda fälten, kvot 2,0
  for (let i = 0; i < 50; i++) par.push({ rateMax: 0.2, rateMean: 0.15, stationMmh: 0 }); // 0,1–0,5 i båda, obekräftat
  for (let i = 0; i < 40; i++) par.push({ rateMax: 1, rateMean: 0.3, stationMmh: 1 });   // max 0,5–2 men medel 0,1–0,5, kvot 0,3
  for (let i = 0; i < 10; i++) par.push({ rateMax: 0.3, rateMean: 0.05, stationMmh: 0 }); // max 0,1–0,5, medel under 0,1
  const uMax = utvardera(par, "rateMax"), uMean = utvardera(par, "rateMean"), k = kalibrera(par);
  const m = missar([...Array(10).fill({ mmh: 1, traff: true }), ...Array(5).fill({ mmh: 1, traff: false })]);
  console.log(`Cellmätningen v3 — SJÄLVTEST: injicerade par där fälten hamnar i olika band, mediankvot exakt 2,0`);
  rapportA(uMax, "rate_max_mmh"); rapportA(uMean, "rate_mean_mmh"); rapportB(k); rapportC(m);
  // Facit written out by hand: [n, bekräftade] per band, then the pairs under 0,1.
  const facit: [string, typeof uMax, number[][], number][] = [
    ["rate_max", uMax, [[60, 0], [40, 40], [100, 100], [0, 0]], 0],
    ["rate_mean", uMean, [[90, 40], [0, 0], [100, 100], [0, 0]], 10]];
  let ok = true;
  for (const [namn, u, band, under] of facit) {
    const fatt = u.band.map(b => [b.n, b.bekraftade]);
    if (JSON.stringify(fatt) !== JSON.stringify(band) || u.under !== under) {
      console.error(`SJÄLVTEST: ${namn} ${JSON.stringify(fatt)} under ${u.under}, väntat ${JSON.stringify(band)} under ${under}`); ok = false;
    }
  }
  if (k.median !== 2 || k.nKvot !== 140) { console.error(`SJÄLVTEST: median ${k.median} över ${k.nKvot}, väntat 2 över 140`); ok = false; }
  if (m.n !== 15 || m.traffar !== 10) { console.error(`SJÄLVTEST: missar ${m.traffar}/${m.n}, väntat 10/15`); ok = false; }
  if (!ok) process.exit(1);
  console.log(`\nSJÄLVTEST OK: band i båda fälten, bekräftelse, mediankvot och missräkning återfinner den kända sanningen.`);
  process.exit(0);
}

// ── Skarpt: parningen i SQL (PostGIS gör avstånden), metriken ovan gör matten.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 7);
await pool.query(`SET statement_timeout = '300s'`); // max 1 anslutning ⇒ gäller alla frågor nedan

// Stationer med regnmätare nära segmentnätet (en rad per station, senaste positionen).
const NARA = `
  nara AS (
    SELECT w.station_id, w.geom, rc.segment_id
    FROM (SELECT DISTINCT ON (station_id) station_id, geom FROM weather_observations
          WHERE sample_time > now() - $1 * interval '1 day' AND rain_sum_mm IS NOT NULL
          ORDER BY station_id, sample_time DESC) w
    JOIN road_conditions rc ON NOT rc.deleted AND rc.geom IS NOT NULL
      AND rc.geom && ST_Expand(w.geom, 0.15)  -- billig bbox först: utan den timeout:ade
      AND ST_DWithin(rc.geom::geography, w.geom::geography, ${DIST_M})  -- geography-svepet (körning #1, 57014)
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

const span = await pool.query(`SELECT min(observed_at) AS a, max(observed_at) AS b, count(DISTINCT observed_at) AS k FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'`, [DAYS]);
const par: RadarPar[] = parRes.rows.map((r: any) => ({ rateMax: +r.mx, rateMean: +r.mn, stationMmh: +r.station_mmh }));

console.log(`Underlag: ${par.length} radar↔station-par,`);
console.log(`${span.rows[0].k} kompositer ${span.rows[0].a ?? "—"} → ${span.rows[0].b ?? "—"} (${DAYS} dygn bakåt)`);
if (par.length < 20) {
  console.error(`UNDERLAGSVAKT: ${par.length} par (< 20) — antingen är piloten/regnkolumnen trasig eller fönstret för torrt. Grön-men-tom räknas inte.`);
  process.exit(1);
}
console.log(`Cellmätningen v3 — radarn mot stationernas regnmätare (senaste ${DAYS} dygnen)`);
rapportA(utvardera(par, "rateMax"), "rate_max_mmh (som körningarna 12/9–5/10)");
rapportA(utvardera(par, "rateMean"), "rate_mean_mmh (fältet som trösklarna står på)");
rapportB(kalibrera(par));

// C: stationsregn nära nätet vid samplad komposittid — fanns någon radarrad ≤ 5 km? Närheten är nara:s
// station–sträcka-par; radarn kopplas på (segment_id, observed_at) som en mängd, inte ett avstånd per stationsregn.
const missRes = await pool.query(`
  WITH ${NARA},
  ev AS (
    SELECT w.station_id, w.sample_time, w.rain_sum_mm
    FROM weather_observations w
    JOIN (SELECT DISTINCT station_id FROM nara) s USING (station_id)
    WHERE w.sample_time > now() - $1 * interval '1 day' AND w.rain_sum_mm >= ${MISS_MM}
  ),
  komp AS (SELECT DISTINCT observed_at FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'),
  ek AS (
    SELECT ev.station_id, ev.sample_time, ev.rain_sum_mm, k.observed_at
    FROM ev
    CROSS JOIN LATERAL (
      SELECT observed_at FROM komp
      WHERE abs(extract(epoch FROM komp.observed_at - ev.sample_time)) <= ${WIN_S}
      ORDER BY abs(extract(epoch FROM komp.observed_at - ev.sample_time)) LIMIT 1
    ) k
  ),
  traff AS (
    SELECT DISTINCT ek.station_id, ek.sample_time
    FROM ek
    JOIN nara n USING (station_id)
    JOIN radar_precip r ON r.segment_id = n.segment_id AND r.observed_at = ek.observed_at
  )
  SELECT ek.rain_sum_mm * 2 AS mmh, t.station_id IS NOT NULL AS traff
  FROM ek LEFT JOIN traff t USING (station_id, sample_time)`, [DAYS]);
await pool.end();

rapportC(missar(missRes.rows.map((r: any) => ({ mmh: +r.mmh, traff: Boolean(r.traff) }))));
console.log(`\n⚠️ KEDJEBEVIS — INGEN DOM: domen på kort #43 kräver ~7 dygns radardata och fälls i eget varv.`);
