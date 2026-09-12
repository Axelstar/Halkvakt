// Grind A (docs/TROSKLAR-SKUGGAN.md, DECISIONS #52): leave-one-out over the weather
// station archive — predict each station's surface temp from its neighbours via
// climatological offsets, measure the error. This is the offset model's early "no"
// (#51 step 3): if the maths fails here, no shadow code gets written in November.
//
// The archive is event-filtered (DECISIONS #4): rows exist mainly when surface ≤ 5 °C,
// precip, or Δtemp ≥ 0.5 °C — irregular series. Pairing therefore happens on shared
// 30-min buckets, and the sample skews toward exactly the hours grind A cares about.
//
// Run: DATABASE_URL=... node --experimental-strip-types publish/grind-a.ts [dagar=60]
// CI:  grind-a.yml (workflow_dispatch). Self-test (no DB): grind-a.ts --sjalvtest

const K_NEIGHBOURS = 5;    // nearest stations considered per prediction
const MAX_KM = 50;         // beyond this a station is no anchor, just weather
// Minsta underlag för att en dom alls får fällas (TROSKLAR-SKUGGAN §3, Bengt 1/9).
const MIN_POINTS_FOR_VERDICT = 500;
const MIN_STATIONS_FOR_VERDICT = 20;
const MIN_SHARED = 20;     // min shared buckets per pair AFTER excluding the eval bucket
const BUCKET_S = 1800;     // 30 min, same cadence as the shadow engine
// Thresholds from docs/TROSKLAR-SKUGGAN.md §3 — change THERE first, per its §5.
const A1_MAX_MAE = 1.0, A2_MAX_GROSS = 0.05, A3_MAX_FREEZE = 0.10;
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];

type Station = { lon: number; lat: number; series: Map<number, number> };
type Eval = { measured: number; pred: number; ankKm: number; station: string };

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Leave-one-out: for every winter bucket (measured ≤ 5 °C) at every station, predict
 * from up to K neighbours as temp_N(t) + mean-offset(S−N over shared buckets, excl. t),
 * inverse-distance weighted. ankKm = nearest contributing neighbour. */
function evaluate(stations: Map<string, Station>): Eval[] {
  const ids = [...stations.keys()];
  const neighbours = new Map<string, { id: string; km: number }[]>();
  for (const s of ids) {
    const a = stations.get(s)!;
    neighbours.set(s, ids
      .filter((n) => n !== s)
      .map((n) => ({ id: n, km: haversineKm(a.lon, a.lat, stations.get(n)!.lon, stations.get(n)!.lat) }))
      .filter((n) => n.km <= MAX_KM)
      .sort((x, y) => x.km - y.km)
      .slice(0, K_NEIGHBOURS));
  }
  // Directional pair stats over shared buckets: sum of (S−N) and count.
  const pairs = new Map<string, { sum: number; n: number }>();
  for (const s of ids)
    for (const { id: n } of neighbours.get(s)!) {
      const a = stations.get(s)!.series, b = stations.get(n)!.series;
      const [small, big] = a.size <= b.size ? [a, b] : [b, a];
      let sum = 0, cnt = 0;
      for (const [t, v] of small) {
        const w = big.get(t);
        if (w !== undefined) { sum += small === a ? v - w : w - v; cnt++; } // always S−N
      }
      pairs.set(`${s}|${n}`, { sum, n: cnt });
    }
  const evals: Eval[] = [];
  for (const s of ids) {
    const st = stations.get(s)!;
    for (const [t, measured] of st.series) {
      if (measured > 5) continue; // winter hours only (doc §3, grind A)
      let wsum = 0, psum = 0, ank = Infinity;
      for (const { id: n, km } of neighbours.get(s)!) {
        const nv = stations.get(n)!.series.get(t);
        if (nv === undefined) continue;
        const p = pairs.get(`${s}|${n}`)!;
        if (p.n - 1 < MIN_SHARED) continue;              // too little shared history
        const offsetExcl = (p.sum - (measured - nv)) / (p.n - 1); // exact leave-one-out
        const w = 1 / Math.max(km, 1);
        wsum += w; psum += w * (nv + offsetExcl);
        if (km < ank) ank = km;
      }
      if (wsum > 0) evals.push({ measured, pred: psum / wsum, ankKm: ank, station: s });
    }
  }
  return evals;
}

// ── MARGINALVAKTEN (TROSKLAR-SKUGGAN §3, tillagd 12/9 på Bengts order, DECISIONS #126).
//
// VARFÖR. Domspärren ovan vaktar MÄNGDEN underlag, inte MARGINALEN. Därför läser ett "FALLER"
// på två raders marginal exakt likadant som ett "FALLER" på tvåhundra raders — och de två
// påståendena är inte samma sak. Anomalimätningen 12/9 visade det skarpt: med #75:s givarvakt
// hamnade A2 på 5,1 % mot kravets 5,0 %, vilket på 1 943 punkter är en skillnad på ungefär TVÅ
// mätvärden.
//
// TESTET. Andelar (A2, A3) får binomialfel, medelfelet (A1) får medelvärdets fel. Ligger
// utfallet inom ±1,96 standardfel från tröskeln skrivs OAVGJORT i stället för KLARAR/FALLER.
//
// VAKTEN ÄR ENSIDIG, och det är avsiktligt. Punkterna är INTE oberoende — samma stationer,
// intilliggande halvtimmar — så det här intervallet är en UNDRE gräns för osäkerheten.
// Ligger utfallet INOM intervallet är frågan alltså säkert oavgjord. Ligger det UTANFÖR är
// den inte därmed avgjord; vakten är minimikravet, inte ett tillräckligt bevis.
//
// DEN KAN ALDRIG ÖPPNA EN STÄNGD GRIND. Ett KLARAR inom bruset blir OAVGJORT (skärpning), och
// ett FALLER inom bruset blir OAVGJORT (mät igen) — grinden öppnar bara på KLARAR.
const Z = 1.96; // 95 %

export function andelSe(p: number, n: number): number {
  return n > 0 ? Math.sqrt(Math.max(p * (1 - p), 0) / n) : Infinity;
}
export function medelSe(absfel: number[]): number {
  const n = absfel.length;
  if (n < 2) return Infinity;
  const m = absfel.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(absfel.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1) / n);
}
/** true = utfallet går att skilja från tröskeln vid det här underlaget. */
export function skiljbar(varde: number, troskel: number, se: number): boolean {
  return Number.isFinite(se) && Math.abs(varde - troskel) > Z * se;
}

function stats(rows: Eval[]) {
  const dec = rows.filter((r) => r.measured >= -5);      // decision band −5…+5 (≤5 already)
  const absDec = dec.map((r) => Math.abs(r.pred - r.measured));
  const mae = dec.length ? absDec.reduce((a, b) => a + b, 0) / dec.length : NaN;
  const gross = rows.length ? rows.filter((r) => Math.abs(r.pred - r.measured) > 2).length / rows.length : NaN;
  const freeze = rows.length ? rows.filter((r) =>
    (r.measured < 0 && r.pred > 2) || (r.measured > 2 && r.pred < 0)).length / rows.length : NaN;
  return { n: rows.length, nDec: dec.length, mae, gross, freeze,
    maeSe: medelSe(absDec), grossSe: andelSe(gross, rows.length), freezeSe: andelSe(freeze, rows.length) };
}

function report(evals: Eval[], label: string, selftest = false) {
  console.log(`Grind A — offsetmodellen mot arkivet (${label})`);
  console.log("band       mätpunkter  MAE(beslutsband)  grova >2°C  frysklassfel");
  for (const [name, lo, hi] of BANDS) {
    const s = stats(evals.filter((r) => r.ankKm >= lo && r.ankKm < hi));
    console.log(`${name.padEnd(10)} ${String(s.n).padStart(10)}  ${s.n ? s.mae.toFixed(2).padStart(13) + " °C" : "            —"}  ${s.n ? (s.gross * 100).toFixed(1).padStart(9) + "%" : "         —"}  ${s.n ? (s.freeze * 100).toFixed(1).padStart(11) + "%" : "           —"}`);
  }
  const tot = stats(evals);
  console.log(`${"TOTALT".padEnd(10)} ${String(tot.n).padStart(10)}  ${tot.n ? tot.mae.toFixed(2).padStart(13) + " °C" : "            —"}  ${tot.n ? (tot.gross * 100).toFixed(1).padStart(9) + "%" : "         —"}  ${tot.n ? (tot.freeze * 100).toFixed(1).padStart(11) + "%" : "           —"}`);
  if (!tot.n) { console.log("(inga bedömbara mätpunkter — inga vintertimmar med grannar i fönstret)"); return; }

  // DOMSPÄRR (TROSKLAR-SKUGGAN §3, minsta underlag): prövningen kräver ≥ 500 bedömbara
  // punkter över ≥ 20 stationer. Under det redovisas siffrorna men INGEN dom fälls åt
  // något håll — tunt underlag är dessutom skevt mot de glesaste delarna av nätet och
  // fäller eller friar på urvalsartefakter. Rökprovet 1/9 (56 punkter, 33 av dem > 20 km
  // från ankare) är just det fallet. Skillnaden mot en fotnot: här går domen inte att läsa av.
  const nStations = new Set(evals.map((e) => e.station)).size;
  // Självtestet har sin egen kontroll (MAE ≈ 0) och sex syntetiska stationer — domspärren
  // gäller bara verkligt arkiv.
  const nog = selftest || (tot.n >= MIN_POINTS_FOR_VERDICT && nStations >= MIN_STATIONS_FOR_VERDICT);
  // Marginalvakten: ett utfall inom bruset får inget omdöme åt något håll.
  const utfall = (varde: number, troskel: number, se: number) =>
    !nog ? "—" : !skiljbar(varde, troskel, se) ? "OAVGJORT" : varde <= troskel ? "KLARAR" : "FALLER";
  const a1 = utfall(tot.mae, A1_MAX_MAE, tot.maeSe);
  const a2 = utfall(tot.gross, A2_MAX_GROSS, tot.grossSe);
  const a3 = utfall(tot.freeze, A3_MAX_FREEZE, tot.freezeSe);
  // ±1,96 standardfel, i måttets egen enhet. "pe" = procentenheter.
  const margGrad = (se: number) => nog && Number.isFinite(se) ? ` [±${(Z * se).toFixed(2)} °C]` : "";
  const margPe = (se: number) => nog && Number.isFinite(se) ? ` [±${(Z * se * 100).toFixed(1)} pe]` : "";
  console.log(`A1 MAE ≤ ${A1_MAX_MAE.toFixed(1)} °C i beslutsbandet: ${tot.mae.toFixed(2)} °C (${tot.nDec} punkter)${margGrad(tot.maeSe)} → ${a1}`);
  console.log(`A2 grova fel > 2 °C ≤ ${A2_MAX_GROSS * 100} %: ${(tot.gross * 100).toFixed(1)} %${margPe(tot.grossSe)} → ${a2}`);
  console.log(`A3 frysklassningsfel ≤ ${A3_MAX_FREEZE * 100} %: ${(tot.freeze * 100).toFixed(1)} %${margPe(tot.freezeSe)} → ${a3}`);
  if (nog && !selftest) {
    const domar = [a1, a2, a3];
    if (domar.includes("FALLER")) {
      console.log(`\nDOM: GRIND A FALLEN — bygg ingen skugga (tre veckor sparade)`);
    } else if (domar.includes("OAVGJORT")) {
      console.log(`\n⏳ INGEN DOM — ett eller flera mått ligger INOM bruset (marginalvakten, §3).`);
      console.log(`   Marginalen är mindre än mätosäkerheten, och intervallet är dessutom en UNDRE`);
      console.log(`   gräns: punkterna är inte oberoende. Mät vidare — ett tal ska inte fälla`);
      console.log(`   eller fria när skillnaden mot tröskeln är några enstaka mätvärden.`);
    } else {
      console.log(`\nDOM: GRIND A KLARAD — skuggbygget får starta`);
    }
  } else if (!selftest) {
    console.log(`\n⏳ INGEN DOM — underlaget räcker inte.`);
    console.log(`   Krav: ≥ ${MIN_POINTS_FOR_VERDICT} bedömbara punkter över ≥ ${MIN_STATIONS_FOR_VERDICT} stationer.`);
    console.log(`   Har:  ${tot.n} punkter över ${nStations} stationer. Underlaget växer med vintern.`);
  }
}

// ── Self-test (no DB): six stations 5 km apart with constant true offsets on a shared
// base curve — leave-one-out must recover them near-perfectly (MAE ≈ 0). Series lengths
// DIFFER per station so both branches of the pair-stats loop are exercised.
if (process.argv.includes("--sjalvtest")) {
  const stations = new Map<string, Station>();
  for (let i = 0; i < 6; i++) {
    const series = new Map<number, number>();
    for (let t = 0; t < 200 - i * 25; t++) series.set(t, -2 + 3 * Math.sin(t / 10) + i * 0.5);
    stations.set(`test${i}`, { lon: 13 + i * 0.08, lat: 56, series });
  }
  const evals = evaluate(stations);
  report(evals, "SJÄLVTEST — syntetiska stationer, känd sanning", true);
  const mae = stats(evals).mae;
  if (!(evals.length > 500 && mae < 0.05)) { console.error(`SJÄLVTEST FALLERAR: n=${evals.length}, MAE=${mae}`); process.exit(1); }
  // Marginalvakten mot känd sanning (§3, DECISIONS #126).
  let mOk = true;
  const m = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); mOk = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Binomialfelet: 5 % på 1 943 punkter ger ~0,5 pe standardfel, alltså ±1,0 pe vid 95 %.
  m("binomialfel 5 % på 1943 ≈ 0,50 pe", (andelSe(0.051, 1943) * 100).toFixed(2), "0.50");
  m("5,1 % mot 5,0 % är INTE skiljbart", skiljbar(0.051, 0.05, andelSe(0.051, 1943)), false);
  m("10,7 % mot 5,0 % ÄR skiljbart", skiljbar(0.107, 0.05, andelSe(0.107, 2042)), true);
  m("noll punkter ⇒ aldrig skiljbart", skiljbar(0.5, 0.05, andelSe(0.5, 0)), false);
  m("en enda punkt ⇒ aldrig skiljbart", skiljbar(2, 1, medelSe([2])), false);
  // Medelfelet: tio identiska värden har noll spridning ⇒ skiljbart; spretiga ⇒ inte.
  m("tio lika värden är skiljbara från tröskeln", skiljbar(2, 1, medelSe(Array(10).fill(2))), true);
  m("tio spretiga värden är det inte", skiljbar(1.05, 1, medelSe([0, 2, 0, 2, 0, 2, 0, 2, 0, 2.5])), false);
  if (!mOk) { console.error("SJÄLVTEST FALLERAR: marginalvakten."); process.exit(1); }
  console.log(`SJÄLVTEST OK: ${evals.length} punkter, MAE ${mae.toFixed(4)} °C, marginalvakten håller`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);

// Latest surface reading per (station, 30-min bucket). numeric arrives as string — cast.
const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
  ORDER BY station_id, b, sample_time DESC`, [DAYS]);
const stations = new Map<string, Station>();
for (const r of res.rows) {
  let s = stations.get(r.station_id);
  if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
await pool.end();
console.log(`${stations.size} stationer, ${res.rows.length} bucketade avläsningar, ${DAYS} dygn bakåt`);
// Underlagsvakt: green-but-empty is the failure mode no threshold catches (the
// tombstone/tee lesson). A normal 60-day window has ~750 stations and tens of
// thousands of readings — far below that means a broken fetch or archive, not a
// quiet winter. Red job => notification, instead of months of green "0 punkter".
if (stations.size < 100 || res.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: ${stations.size} stationer / ${res.rows.length} avläsningar — hämtningen eller arkivet är trasigt (normalt ~750 stationer, >10 000 avläsningar).`);
  process.exit(1);
}
report(evaluate(stations), `senaste ${DAYS} dygnen`);
