// Höjdprovet (Bengts order 1/9, ankarbreddningen 3b): hur mycket av offsetmodellens
// försprång återvinner en enkel höjdkorrektion DÄR HISTORIK SAKNAS?
//
// Designfyndet som styr provet: grind A:s lärda paroffsets absorberar redan den
// statiska höjdskillnaden mellan stationer — höjd ovanpå lärd offset vore dubbel-
// räkning och hade mätt noll. Höjden betalar sig i SEGMENTFALLET: en vägpunkt mellan
// stationerna har ingen serie att lära offset ur. Därför tre varianter per punkt:
//   RÅ       = grannarnas yttemp, invers-distansviktad, ingen offset
//              (vad ett segment får utan någon finess alls)
//   RÅ+HÖJD  = som RÅ men varje granne korrigeras med LAPSE·(h_mål − h_granne)
//   OFFSET   = grind A:s lärda paroffset med exakt bucketuteslutning (taket —
//              möjligt bara där delad historik finns)
// Dessutom: empirisk lapse ur våra egna par (regression offset mot Δhöjd) som
// diagnos mot standardvärdet 0,65 °C/100 m.
//
// Höjder: Copernicus EU-DEM 25 m via opentopodata.org (© European Union, Copernicus;
// publika API:t: ≤100 punkter/anrop, ~1 anrop/s — 845 stationer = 9 anrop).
// Run: DATABASE_URL=... node --experimental-strip-types scripts/hojd-prov.ts [dagar=60]
// Självtest utan nät/DB: scripts/hojd-prov.ts --sjalvtest

const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const LAPSE = 0.0065; // °C per meter (standardatmosfär 0,65 °C / 100 m)
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];

type Station = { id: string; lon: number; lat: number; elev: number | null; series: Map<number, number> };
type Row = { measured: number; raw: number | null; hojd: number | null; offset: number | null; ankKm: number };

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pairStats(s: Map<number, number>, a: Map<number, number>): { sum: number; n: number } {
  const [small, big] = s.size <= a.size ? [s, a] : [a, s];
  let sum = 0, n = 0;
  for (const [t, v] of small) {
    const w = big.get(t);
    if (w !== undefined) { sum += small === s ? v - w : w - v; n++; }
  }
  return { sum, n };
}

function evaluate(stations: Map<string, Station>): { rows: Row[]; lapseFit: { slope: number; nPairs: number } } {
  const arr = [...stations.values()];
  const rows: Row[] = [];
  // För lapse-diagnosen: (Δh, lärd offset) per par med känd höjd och nog historik.
  const fitX: number[] = [], fitY: number[] = [];
  for (const s of arr) {
    const nbs = arr
      .filter((a) => a.id !== s.id)
      .map((a) => ({ a, km: haversineKm(s.lon, s.lat, a.lon, a.lat) }))
      .filter((x) => x.km <= MAX_KM)
      .sort((x, y) => x.km - y.km)
      .slice(0, K_NEIGHBOURS)
      .map((x) => ({ ...x, p: pairStats(s.series, x.a.series) }));
    for (const { a, p } of nbs)
      if (p.n >= MIN_SHARED && s.elev !== null && a.elev !== null) {
        fitX.push(s.elev - a.elev); fitY.push(p.sum / p.n);
      }
    for (const [t, measured] of s.series) {
      if (measured > 5) continue; // vintertimmar, samma urval som grind A
      let wR = 0, pR = 0, wH = 0, pH = 0, wO = 0, pO = 0, ank = Infinity;
      for (const { a, km, p } of nbs) {
        const av = a.series.get(t);
        if (av === undefined) continue;
        const w = 1 / Math.max(km, 1);
        wR += w; pR += w * av;
        // Högre mål är KALLARE: dra av lapse gånger höjdskillnaden (självtestet fällde
        // plus-varianten — den dubblade felet i stället för att nolla det).
        if (s.elev !== null && a.elev !== null) { wH += w; pH += w * (av - LAPSE * (s.elev - a.elev)); }
        if (p.n - 1 >= MIN_SHARED) {
          const offsetExcl = (p.sum - (measured - av)) / (p.n - 1);
          wO += w; pO += w * (av + offsetExcl);
        }
        if (km < ank) ank = km;
      }
      if (wR > 0)
        rows.push({ measured, raw: pR / wR, hojd: wH > 0 ? pH / wH : null, offset: wO > 0 ? pO / wO : null, ankKm: ank });
    }
  }
  // Minsta-kvadrat-lutning genom origo vore fel (offset har egen bias) — full regression.
  const n = fitX.length;
  let slope = NaN;
  if (n >= 2) {
    const mx = fitX.reduce((a, b) => a + b, 0) / n, my = fitY.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (fitX[i] - mx) ** 2; sxy += (fitX[i] - mx) * (fitY[i] - my); }
    slope = sxx > 0 ? sxy / sxx : NaN;
  }
  return { rows, lapseFit: { slope, nPairs: n } };
}

function mae(rows: Row[], pick: (r: Row) => number | null): { n: number; mae: number } {
  const xs = rows.filter((r) => pick(r) !== null && r.measured >= -5); // beslutsbandet
  return { n: xs.length, mae: xs.length ? xs.reduce((a, r) => a + Math.abs(pick(r)! - r.measured), 0) / xs.length : NaN };
}

function report(rows: Row[], lapseFit: { slope: number; nPairs: number }, label: string) {
  console.log(`Höjdprovet — vad höjdkorrektion återvinner där historik saknas (${label})`);
  console.log(`MAE i beslutsbandet (−5…+5 °C), band = närmaste bidragande ankare. LAPSE ${(LAPSE * 100).toFixed(2)} °C/100 m.`);
  console.log("band       n(rå)   MAE(rå)  MAE(rå+höjd)  MAE(offset=taket)");
  const f = (s: { n: number; mae: number }, w: number) => s.n ? s.mae.toFixed(2).padStart(w) + " °C" : "—".padStart(w + 3);
  for (const [name, lo, hi] of [...BANDS, ["ALLA", 0, Infinity] as [string, number, number]]) {
    const b = rows.filter((r) => r.ankKm >= lo && r.ankKm < hi);
    const raw = mae(b, (r) => r.raw), hojd = mae(b, (r) => r.hojd), off = mae(b, (r) => r.offset);
    console.log(`${name.padEnd(10)} ${String(raw.n).padStart(6)} ${f(raw, 6)} ${f(hojd, 10)} ${f(off, 14)}`);
  }
  if (Number.isFinite(lapseFit.slope))
    // Lutningen offset(S−N) mot (h_S−h_N) är −lapse (högre = kallare) — redovisa avkylningen.
    console.log(`\nEmpirisk lapse ur ${lapseFit.nPairs} par: ${(-lapseFit.slope * 100).toFixed(2)} °C avkylning/100 m (standard: 0,65). ` +
      `Nära standard ⇒ höjden bär systematiken; långt ifrån ⇒ annat dominerar (kustnärhet, dalgångar).`);
  console.log(`\nHöjder: Copernicus EU-DEM (© Europeiska unionen, Copernicus) via opentopodata.org.`);
  console.log(`Ingen dom fälls här — provet upprepas på vinterdata och värderas i tröskeldokumentet.`);
}

// ── Självtest utan nät/DB: sex stationer på en sluttning, 100 m höjdsteg, serier =
// gemensam kurva − LAPSE·h (exakt fysik, känd sanning). RÅ ska bära ett systematiskt
// fel (grannens höjd läcker in), RÅ+HÖJD och OFFSET ska båda hamna nära noll, och
// den empiriska lapsen ska återfinna 0,65 °C/100 m. Olika serielängder som vanligt.
if (process.argv.includes("--sjalvtest")) {
  const base = (t: number) => -1 + 3 * Math.sin(t / 10);
  const stations = new Map<string, Station>();
  for (let i = 0; i < 6; i++) {
    const h = i * 100;
    const series = new Map<number, number>();
    for (let t = 0; t < 200 - i * 25; t++) series.set(t, base(t) - LAPSE * h);
    stations.set(`v${i}`, { id: `v${i}`, lon: 13 + i * 0.08, lat: 56, elev: h, series });
  }
  const { rows, lapseFit } = evaluate(stations);
  report(rows, lapseFit, "SJÄLVTEST — sluttning med känd fysik");
  const mR = mae(rows, (r) => r.raw), mH = mae(rows, (r) => r.hojd), mO = mae(rows, (r) => r.offset);
  const ok = rows.length > 400 && mR.mae > 0.3 && mH.mae < 0.05 && mO.mae < 0.05
    && Math.abs(lapseFit.slope + LAPSE) < 0.0005;
  if (!ok) { console.error(`SJÄLVTEST FALLERAR: n=${rows.length}, rå=${mR.mae}, höjd=${mH.mae}, offset=${mO.mae}, lapse=${lapseFit.slope}`); process.exit(1); }
  console.log(`SJÄLVTEST OK: rå ${mR.mae.toFixed(2)} °C → rå+höjd ${mH.mae.toFixed(4)} °C, offset ${mO.mae.toFixed(4)} °C, empirisk lapse ${(-lapseFit.slope * 100).toFixed(2)} °C/100 m`);
  process.exit(0);
}

// ── Skarpt: VViS ur arkivet + höjder ur EU-DEM.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);

const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
  ORDER BY station_id, b, sample_time DESC`, [DAYS]);
await pool.end();
const stations = new Map<string, Station>();
for (const r of res.rows) {
  let s = stations.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, elev: null, series: new Map() }; stations.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
console.log(`VViS: ${stations.size} stationer, ${res.rows.length} bucketade avläsningar, ${DAYS} dygn bakåt`);
if (stations.size < 100 || res.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: ${stations.size} stationer / ${res.rows.length} avläsningar — hämtningen eller arkivet är trasigt.`);
  process.exit(1);
}

const ids = [...stations.keys()];
let elevOk = 0;
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const locs = batch.map((id) => { const s = stations.get(id)!; return `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`; }).join("|");
  const r = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${locs}`, { headers: { Accept: "application/json" } });
  if (!r.ok) { console.error(`opentopodata: HTTP ${r.status} på batch ${i / 100 + 1}`); continue; }
  const j: any = await r.json();
  (j.results ?? []).forEach((res: any, k: number) => {
    if (typeof res?.elevation === "number") { stations.get(batch[k])!.elev = res.elevation; elevOk++; }
  });
  await new Promise((ok) => setTimeout(ok, 1200)); // publika API:t: ~1 anrop/s
}
console.log(`Höjder: ${elevOk} av ${ids.length} stationer fick EU-DEM-höjd`);
if (elevOk < ids.length * 0.9) {
  console.error(`UNDERLAGSVAKT: bara ${elevOk}/${ids.length} höjder — höjdhämtningen är trasig.`);
  process.exit(1);
}

const { rows, lapseFit } = evaluate(stations);
report(rows, lapseFit, `senaste ${DAYS} dygnen`);
