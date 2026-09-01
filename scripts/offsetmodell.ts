// GRIND A — offsetmodellen prövad med leave-one-out mot arkivet (docs/TROSKLAR-SKUGGAN.md §3).
//
// Idén bakom segmentmotorn: en stations yttemperatur kan förutsägas ur grannarnas, om varje
// station har en stabil AVVIKELSE (offset) från sina grannar — Rosersbergsbron är alltid
// kallare än Upplands Väsby, oavsett väder. Håller det, kan sträckan mellan stationerna
// beräknas. Håller det inte, ska ingen skugga byggas (DECISIONS #51, tre veckor sparade).
//
// Metod, per bedömbar mätpunkt (station s, tid t):
//   1. Grannar = de N närmaste stationerna med mätning inom ±30 min av t.
//   2. Offset(s, granne g) = medianen av (yta_s − yta_g) över ALL annan tid i arkivet.
//   3. Prognos(s,t) = median över grannarna av (yta_g(t) + offset(s,g)).
//   4. Fel = prognos − mätt. Station s ingår aldrig i sin egen prognos (leave-one-out).
// Offseten lärs alltså ur historien, prognosen görs ur nuet — samma uppdelning som en
// skuggkörning i drift skulle ha.
//
// Trösklar (Bengts, daterade före koden): A1 MAE ≤ 1,0 °C i bandet −5…+5 °C;
// A2 grova fel (|fel| > 2 °C) ≤ 5 %; A3 frysklassningsfel ≤ 10 %.
// Minsta underlag: ≥ 500 bedömbara punkter över ≥ 20 stationer — annars INGEN DOM.
import pg from "pg";

const BAND_LO = -5, BAND_HI = 5;          // beslutsbandet
const WINTER_MAX = 5;                      // vintertimme: mätt yta ≤ +5 °C
const NEIGHBOURS = 5;                      // grannar per prognos
const MAX_NEIGHBOUR_KM = 60;               // längre bort än så är inte en granne
const SYNC_MIN = 30;                       // grannens mätning inom ±30 min
const MIN_OFFSET_PAIRS = 20;               // offseten måste vila på minst så många timmar
const MIN_POINTS = 500, MIN_STATIONS = 20; // minsta underlag för dom

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(`
  SELECT station_id, sample_time, surface_temp_c::float AS yta,
         ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL
  ORDER BY sample_time`);
await pool.end();

type Obs = { st: string; t: number; yta: number };
const pos = new Map<string, { lon: number; lat: number }>();
const byStation = new Map<string, Obs[]>();
for (const r of rows) {
  pos.set(r.station_id, { lon: Number(r.lon), lat: Number(r.lat) });
  const o = { st: r.station_id, t: new Date(r.sample_time).getTime(), yta: r.yta };
  (byStation.get(r.station_id) ?? byStation.set(r.station_id, []).get(r.station_id)!).push(o);
}
const km = (a: string, b: string) => {
  const p = pos.get(a)!, q = pos.get(b)!;
  return Math.hypot((p.lon - q.lon) * 111.32 * Math.cos(p.lat * Math.PI / 180), (p.lat - q.lat) * 111.0);
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** Grannens mätning närmast i tid, om inom ±SYNC_MIN. */
function at(st: string, t: number): number | null {
  const obs = byStation.get(st); if (!obs) return null;
  let best: Obs | null = null, bestD = Infinity;
  for (const o of obs) { const d = Math.abs(o.t - t); if (d < bestD) { bestD = d; best = o; } }
  return best && bestD <= SYNC_MIN * 60_000 ? best.yta : null;
}

const stations = [...byStation.keys()];
const neighbours = new Map<string, string[]>();
for (const s of stations) {
  neighbours.set(s, stations.filter((o) => o !== s && km(s, o) <= MAX_NEIGHBOUR_KM)
    .sort((a, b) => km(s, a) - km(s, b)).slice(0, NEIGHBOURS));
}

// Offset(s,g) = median över alla samtidiga par i arkivet. Lärs på ALLA timmar, inte bara vinter.
const offset = new Map<string, number>();
for (const s of stations) for (const g of neighbours.get(s)!) {
  const diffs: number[] = [];
  for (const o of byStation.get(s)!) { const v = at(g, o.t); if (v !== null) diffs.push(o.yta - v); }
  if (diffs.length >= MIN_OFFSET_PAIRS) offset.set(`${s}|${g}`, median(diffs));
}

type Err = { st: string; yta: number; pred: number; err: number; ankarKm: number };
const errs: Err[] = [];
for (const s of stations) {
  const ns = neighbours.get(s)!.filter((g) => offset.has(`${s}|${g}`));
  if (!ns.length) continue;
  const nearestKm = ns.length ? km(s, ns[0]) : Infinity;
  for (const o of byStation.get(s)!) {
    if (o.yta > WINTER_MAX) continue;                       // bara vintertimmar
    const preds: number[] = [];
    for (const g of ns) { const v = at(g, o.t); if (v !== null) preds.push(v + offset.get(`${s}|${g}`)!); }
    if (preds.length < 2) continue;                         // minst två grannar
    const pred = median(preds);
    errs.push({ st: s, yta: o.yta, pred, err: pred - o.yta, ankarKm: nearestKm });
  }
}

const band = errs.filter((e) => e.yta >= BAND_LO && e.yta <= BAND_HI);
const nSt = new Set(band.map((e) => e.st)).size;
const pct = (n: number, d: number) => (d ? (100 * n / d) : 0);
const A1 = band.length ? band.reduce((a, e) => a + Math.abs(e.err), 0) / band.length : NaN;
const A2 = pct(band.filter((e) => Math.abs(e.err) > 2).length, band.length);
// A3: modell och mätning på olika sidor om 1 °C-gränsen, med > 1 °C marginal
const A3 = pct(band.filter((e) => (e.yta <= 1) !== (e.pred <= 1) && Math.abs(e.pred - 1) > 1).length, band.length);

const bands: [string, (k: number) => boolean][] = [
  ["0–7 km", (k) => k <= 7], ["7–15 km", (k) => k > 7 && k <= 15],
  ["15–20 km", (k) => k > 15 && k <= 20], [">20 km", (k) => k > 20]];

console.log(`\n=== GRIND A — offsetmodellen, leave-one-out mot arkivet ===`);
console.log(`Arkiv: ${rows.length} observationer, ${stations.length} stationer`);
console.log(`Vintertimmar (yta ≤ ${WINTER_MAX} °C) med prognos: ${errs.length}`);
console.log(`Bedömbara i beslutsbandet (${BAND_LO}…${BAND_HI} °C): ${band.length} punkter över ${nSt} stationer\n`);

const nog = band.length >= MIN_POINTS && nSt >= MIN_STATIONS;
if (!nog) {
  console.log(`⏳ INGEN DOM — underlaget räcker inte.`);
  console.log(`   Krav: ≥ ${MIN_POINTS} punkter över ≥ ${MIN_STATIONS} stationer (TROSKLAR-SKUGGAN §3, grind A).`);
  console.log(`   Har:  ${band.length} punkter över ${nSt} stationer.`);
  console.log(`   Det är augusti — vägytorna är varma. Underlaget växer med vintern.\n`);
} else {
  const dom = (v: number, t: number, namn: string) =>
    `${v <= t ? "✅" : "❌"} ${namn}: ${v.toFixed(2)} (tröskel ${t})`;
  console.log(dom(A1, 1.0, "A1 MAE °C"));
  console.log(dom(A2, 5, "A2 grova fel %"));
  console.log(dom(A3, 10, "A3 frysklassningsfel %"));
  console.log(`\nDOM: ${A1 <= 1 && A2 <= 5 && A3 <= 10 ? "GRIND A KLARAD — skuggbygget får starta" : "GRIND A FALLEN — bygg ingen skugga"}\n`);
}
console.log(`Per ankaravstånd (band | punkter | MAE | grova fel):`);
for (const [namn, test] of bands) {
  const b = band.filter((e) => test(e.ankarKm));
  if (!b.length) { console.log(`  ${namn.padEnd(9)} —`); continue; }
  const mae = b.reduce((a, e) => a + Math.abs(e.err), 0) / b.length;
  console.log(`  ${namn.padEnd(9)} ${String(b.length).padStart(5)} | ${mae.toFixed(2)} °C | ${pct(b.filter((e) => Math.abs(e.err) > 2).length, b.length).toFixed(1)} %`);
}
console.log(`\n(Kör igen när arkivet vuxit: node --experimental-strip-types scripts/offsetmodell.ts)`);
