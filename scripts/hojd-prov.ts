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
//
// VÄGPUNKTSGRINDEN (Bengts ja 23/9, DECISIONS #323, kort #38b delsteg 4b). Grind A dömde taket:
// vid en station lärs offseten ur stationens egen historik. En vägpunkt har ingen. Därför prövas
// här grind A:s tre mått (A1 MAE, A2 grova fel, A3 frysklassfel — samma trösklar, samma underlags-
// och marginalvakt) på tre kandidater som INTE får låna målets historik:
//   RÅ       = som ovan
//   INTERP   = offset interpolerad ur grannparen: off(S−N) skattas som avståndsviktat medel av
//              off(M−N) för målets övriga grannar M — hur stationer NÄRA målet skiljer sig från N.
//              Vikten är 1/km² från målet (inte 1/km som grind A:s grannvikt): med 1/km fick
//              stationer 20 km bort en tredjedel av vikten i självtestet och drog offseten fel.
//   RÅ+HÖJD  = som ovan (terrängkorrigerad, höjden som första faktor)
// Grinden öppnar om minst en kandidat KLARAR alla tre. Öppnar den inte byggs ingen skuggkörning
// i oktober (DECISIONS #322, villkor 4a). OFFSET redovisas bredvid som taket.
// Trösklarna och vakterna är kopior av grind A:s (publish/grind-a.ts), vaktade av kontraktsgrinden.

import { Z, andelSe, medelSe, utfallTak, grindutfall, type Utfall } from "../publish/marginal.ts";
import { vaktdiagnos, led234, saknadeDygn, skrivSaknade } from "../publish/vaktdiagnos.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../publish/frysflagga.ts";

const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const LAPSE = 0.0065; // °C per meter (standardatmosfär 0,65 °C / 100 m)
// Grind A:s trösklar och domspärr — kopior av publish/grind-a.ts, vaktade av scripts/kontraktsgrinden.ts.
// Ändra i docs/TROSKLAR-SKUGGAN.md §3 först, sedan varje kopia i samma commit.
const A1_MAX_MAE = 1.0, A2_MAX_GROSS = 0.05, A3_MAX_FREEZE = 0.10;
const MIN_POINTS_FOR_VERDICT = 500;
const MIN_STATIONS_FOR_VERDICT = 20;
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];

type Station = { id: string; lon: number; lat: number; elev: number | null; series: Map<number, number> };
type Row = { measured: number; raw: number | null; hojd: number | null; interp: number | null; offset: number | null; ankKm: number; station: string };

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
  // Parvisa offsets mellan GRANNAR, för INTERP: off(M−N) över delade buckets. Målet S är inte
  // inblandat i paret, så ingen bucket behöver uteslutas.
  const parOff = new Map<string, number | null>();
  const offMN = (m: Station, n: Station): number | null => {
    const k = `${m.id}|${n.id}`;
    if (!parOff.has(k)) { const p = pairStats(m.series, n.series); parOff.set(k, p.n >= MIN_SHARED ? p.sum / p.n : null); }
    return parOff.get(k)!;
  };
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
      let wR = 0, pR = 0, wH = 0, pH = 0, wI = 0, pI = 0, wO = 0, pO = 0, ank = Infinity;
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
        // INTERP: målets offset mot N lånad från målets ÖVRIGA grannar M, viktade 1/km² från målet.
        let wm = 0, om = 0;
        for (const m of nbs) if (m.a.id !== a.id) {
          const o = offMN(m.a, a);
          if (o !== null) { const v = 1 / Math.max(m.km, 1) ** 2; wm += v; om += v * o; }
        }
        if (wm > 0) { wI += w; pI += w * (av + om / wm); }
        if (km < ank) ank = km;
      }
      if (wR > 0)
        rows.push({ measured, raw: pR / wR, hojd: wH > 0 ? pH / wH : null, interp: wI > 0 ? pI / wI : null,
          offset: wO > 0 ? pO / wO : null, ankKm: ank, station: s.id });
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

function report(rows: Row[], lapseFit: { slope: number; nPairs: number }, label: string, selftest = false) {
  console.log(`Höjdprovet — vad höjdkorrektion återvinner där historik saknas (${label})`);
  console.log(`MAE i beslutsbandet (−5…+5 °C), band = närmaste bidragande ankare. LAPSE ${(LAPSE * 100).toFixed(2)} °C/100 m.`);
  console.log("band       n(rå)   MAE(rå)  MAE(interp)  MAE(rå+höjd)  MAE(offset=taket)");
  const f = (s: { n: number; mae: number }, w: number) => s.n ? s.mae.toFixed(2).padStart(w) + " °C" : "—".padStart(w + 3);
  for (const [name, lo, hi] of [...BANDS, ["ALLA", 0, Infinity] as [string, number, number]]) {
    const b = rows.filter((r) => r.ankKm >= lo && r.ankKm < hi);
    const raw = mae(b, (r) => r.raw), int = mae(b, (r) => r.interp), hojd = mae(b, (r) => r.hojd), off = mae(b, (r) => r.offset);
    console.log(`${name.padEnd(10)} ${String(raw.n).padStart(6)} ${f(raw, 6)} ${f(int, 9)} ${f(hojd, 10)} ${f(off, 14)}`);
  }
  if (Number.isFinite(lapseFit.slope))
    // Lutningen offset(S−N) mot (h_S−h_N) är −lapse (högre = kallare) — redovisa avkylningen.
    console.log(`\nEmpirisk lapse ur ${lapseFit.nPairs} par: ${(-lapseFit.slope * 100).toFixed(2)} °C avkylning/100 m (standard: 0,65). ` +
      `Nära standard ⇒ höjden bär systematiken; långt ifrån ⇒ annat dominerar (kustnärhet, dalgångar).`);
  console.log(`\nHöjder: Copernicus EU-DEM (© Europeiska unionen, Copernicus) via opentopodata.org.`);
  vagpunktsgrinden(rows, selftest);
}

// ── VÄGPUNKTSGRINDEN: grind A:s tre mått per kandidat, utan målets egen historik (DECISIONS #323).
const KANDIDATER: { namn: string; pick: (r: Row) => number | null }[] = [
  { namn: "RÅ", pick: (r) => r.raw }, { namn: "INTERP", pick: (r) => r.interp }, { namn: "RÅ+HÖJD", pick: (r) => r.hojd }];

/** Samma mått som publish/grind-a.ts stats(): MAE i beslutsbandet, grova fel och frysklassfel på alla vinterrader. */
function matt(rows: Row[], pick: (r: Row) => number | null) {
  const xs = rows.filter((r) => pick(r) !== null);
  const dec = xs.filter((r) => r.measured >= -5);
  const absDec = dec.map((r) => Math.abs(pick(r)! - r.measured));
  const mae = dec.length ? absDec.reduce((a, b) => a + b, 0) / dec.length : NaN;
  const gross = xs.length ? xs.filter((r) => Math.abs(pick(r)! - r.measured) > 2).length / xs.length : NaN;
  const freeze = xs.length ? xs.filter((r) => (r.measured < 0 && pick(r)! > 2) || (r.measured > 2 && pick(r)! < 0)).length / xs.length : NaN;
  return { n: xs.length, nDec: dec.length, stationer: new Set(xs.map((r) => r.station)).size, mae, gross, freeze,
    maeSe: medelSe(absDec), grossSe: andelSe(gross, xs.length), freezeSe: andelSe(freeze, xs.length) };
}

function vagpunktsgrinden(rows: Row[], selftest: boolean): Utfall {
  console.log(`\nVÄGPUNKTSGRINDEN — grind A:s mått utan målets egen historik (DECISIONS #323). ` +
    `Trösklar: A1 ≤ ${A1_MAX_MAE.toFixed(1)} °C · A2 ≤ ${A2_MAX_GROSS * 100} % · A3 ≤ ${A3_MAX_FREEZE * 100} %.`);
  console.log("kandidat  band            n  MAE(beslutsband)  grova >2°C  frysklassfel");
  const domar: Utfall[] = [];
  for (const k of KANDIDATER) {
    for (const [name, lo, hi] of [...BANDS, ["ALLA", 0, Infinity] as [string, number, number]]) {
      const m = matt(rows.filter((r) => r.ankKm >= lo && r.ankKm < hi), k.pick);
      console.log(`${k.namn.padEnd(9)} ${name.padEnd(10)} ${String(m.n).padStart(6)}  ${m.n ? m.mae.toFixed(2).padStart(13) + " °C" : "—".padStart(16)}` +
        `  ${m.n ? (m.gross * 100).toFixed(1).padStart(9) + "%" : "—".padStart(10)}  ${m.n ? (m.freeze * 100).toFixed(1).padStart(11) + "%" : "—".padStart(12)}`);
    }
    const t = matt(rows, k.pick);
    if (!t.n) { console.log(`  ${k.namn}: inga punkter ⇒ OAVGJORT`); domar.push("OAVGJORT"); continue; }
    // Domspärren och marginalvakten, som i grind A. Självtestet har sex syntetiska stationer och egen kontroll.
    const nog = selftest || (t.n >= MIN_POINTS_FOR_VERDICT && t.stationer >= MIN_STATIONS_FOR_VERDICT);
    const u = (v: number, tr: number, se: number): Utfall | "—" => nog ? utfallTak(v, tr, se) : "—";
    const a1 = u(t.mae, A1_MAX_MAE, t.maeSe), a2 = u(t.gross, A2_MAX_GROSS, t.grossSe), a3 = u(t.freeze, A3_MAX_FREEZE, t.freezeSe);
    const dom: Utfall = nog ? grindutfall([a1, a2, a3] as Utfall[]) : "OAVGJORT";
    console.log(`  ${k.namn}: A1 ${t.mae.toFixed(2)} °C [±${(Z * t.maeSe).toFixed(2)}] → ${a1} · A2 ${(t.gross * 100).toFixed(1)} % [±${(Z * t.grossSe * 100).toFixed(1)} pe] → ${a2}` +
      ` · A3 ${(t.freeze * 100).toFixed(1)} % [±${(Z * t.freezeSe * 100).toFixed(1)} pe] → ${a3}` +
      (nog ? "" : ` · underlag ${t.n} punkter / ${t.stationer} stationer under spärren (≥ ${MIN_POINTS_FOR_VERDICT} / ≥ ${MIN_STATIONS_FOR_VERDICT})`) + ` ⇒ ${dom}`);
    domar.push(dom);
  }
  // Grinden öppnar om NÅGON kandidat klarar alla tre; en oavgjord kandidat håller den öppen för omprövning.
  const grind: Utfall = domar.includes("KLARAR") ? "KLARAR" : domar.includes("OAVGJORT") ? "OAVGJORT" : "FALLER";
  if (selftest) return grind;
  if (grind === "KLARAR")
    console.log(`\nDOM: VÄGPUNKTSGRINDEN ÖPPEN — ${KANDIDATER.filter((_, i) => domar[i] === "KLARAR").map((k) => k.namn).join(", ")} klarar A1–A3 utan målets historik. Den kandidaten är offsetens väg till vägpunkten (TROSKLAR-SKUGGAN §3, kort #38b 4a).`);
  else if (grind === "OAVGJORT")
    console.log(`\n⏳ INGEN DOM — ingen kandidat klarar, minst en ligger inom bruset eller under underlagsspärren. Mät vidare; bygg inget på den.`);
  else
    console.log(`\nDOM: VÄGPUNKTSGRINDEN FALLEN — ingen kandidat klarar A1–A3 utan målets historik. Bygg ingen skuggkörning i oktober (DECISIONS #322, villkor 4a); det som saknas är data om vägen, inte kod.`);
  return grind;
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
  report(rows, lapseFit, "SJÄLVTEST — sluttning med känd fysik", true);
  const mR = mae(rows, (r) => r.raw), mH = mae(rows, (r) => r.hojd), mO = mae(rows, (r) => r.offset);
  // Två byar (INTERP, DECISIONS #323): tre kalla stationer (offset −1) inom 1,3 km och tre varma (+1)
  // 31 km bort, olika serielängder. RÅ blandar byarna; INTERP lånar offset från målets egna grannar
  // och ska ligga nära noll. Höjden är noll överallt, så lapse-diagnosen är avsiktligt tom här.
  const byar = new Map<string, Station>();
  for (let i = 0; i < 6; i++) {
    const series = new Map<number, number>();
    for (let t = 0; t < 200 - i * 10; t++) series.set(t, base(t) + (i < 3 ? -1 : 1));
    byar.set(`b${i}`, { id: `b${i}`, lon: 13 + (i < 3 ? i : 50 + i - 3) * 0.01, lat: 56, elev: 0, series });
  }
  const by = evaluate(byar).rows;
  const bR = mae(by, (r) => r.raw), bI = mae(by, (r) => r.interp);
  if (!(by.length > 100 && bR.mae > 0.05 && bI.mae < 0.03)) { console.error(`SJÄLVTEST FALLERAR (två byar): n=${by.length}, rå=${bR.mae}, interp=${bI.mae}`); process.exit(1); }
  console.log(`Två byar: rå ${bR.mae.toFixed(3)} °C → interp ${bI.mae.toFixed(3)} °C på ${by.length} punkter (INTERP lånar rätt grannars offset)`);
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
// Saknade dygn (kort #252, DECISIONS #352): raderingen i sql/034 får aldrig krympa fönstret tyst.
skrivSaknade(await saknadeDygn((s, p) => pool.query(s, p as any[]).then((r) => r.rows), "weather_observations", DAYS));

// VAKTDIAGNOSEN FÖRST (DECISIONS #141), som i grind A: en nolla ska aldrig vara tvetydig mellan
// "fältet saknas", "vakten fäller allt" och "arkivet är tomt".
await vaktdiagnos((s, p) => pool.query(s, p as any[]).then((r) => r.rows),
  "weather_observations", `WHERE sample_time > now() - ${DAYS} * interval '1 day'`, [
    { namn: "yttemperatur finns", bar: "surface_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: lufttemperatur finns", bar: "air_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: yta - luft >= -12 grader", bar: "surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL", villkor: "surface_temp_c >= air_temp_c - 12" },
    ...led234(),
  ]);

// Samma population som grind A (publish/grind-a.ts): #75:s givarvakt, radvakten och karantänen
// (DECISIONS #298/#299). Första körningen av vägpunktsgrinden 23/9 gick UTAN dem — en grind som
// dömer mot grind A:s trösklar måste läsa grind A:s arkiv, annars jämförs två populationer.
const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
    AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
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
// Frysflaggan med tre marginaler (DECISIONS #437), bara med --frysflagga: kuvösens riktningsprov. Måndagsserien skriver ut som förut.
if (process.argv.includes("--frysflagga"))
  for (const r of skrivFrysflaggan(rows, [{ namn: "RÅ", pick: (r) => r.raw }, { namn: "RÅ+HÖJD", pick: (r) => r.hojd },
    { namn: "OFFSET (taket)", pick: (r) => r.offset }], BANDS)) console.log(r);
