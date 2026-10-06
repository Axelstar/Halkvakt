// PROGNOSLAGRET — FYRA LÄSNINGAR I KUVÖSEN (kort #298, docs/PROGNOSLAGRET-VAGAR-2026-10-06.md, DECISIONS #471; Bengts val (a) 6/10).
// INGEN DOM: inga trösklar rörs, grind A:s driftdom och vägpunktsgrindens fall står. Modellen är grind A:s egen (`publish/grind-a.ts`,
// importerad, aldrig kopierad); varianterna är dess `Variant`. Hela vintern 2024/25, samma vakter som grind A (#75, radvakten, karantänen).
//   L1 ANKARSPRIDNINGEN. Per punkt: störst minus minst offsetkorrigerat ankarvärde. A1/A2/A3 och andel punkter per spridningsband
//      (0–0,5 · 0,5–1 · 1–2 · 2–4 · > 4 °C) för OFFSET och RÅ. Frågan: skiljer oenigheten de grova felen från de fina — kan lagret tiga rätt?
//   L2 NATT OCH SÄSONG. A2 för OFFSET per solhöjdsband (< −6° natt · −6…0 skymning · > 0 dag; USNO:s approximation som regimgrinden,
//      #408) och per månad. Frågan: sitter vårens fel i dagsljuset?
//   L4 REGIMSTYRD OFFSET. Offseten lärs per klass vid målstationen: "klar stilla natt" (molnmängd ≤ 25 % ur SMHI p16 vid närmaste
//      station ≤ 50 km, medelvind ≤ 2 m/s, sol < −6°), "natt övrigt" (sol < −6°, resten), "dag" (sol ≥ −6°), "okänd" (moln eller vind
//      saknas). OFFSET-REGIM mot OFFSET per band och per klass. Frågan: är särarten en per regim?
//   L8 KOVARIATMODELLEN. Stationens särart = medel(mätt − RÅ) över dess punkter (≥ 100). Kovariater: höjd (EU-DEM), relief 1 km och 3 km
//      (station minus medelhöjd av 8 punkter runt om), kust (andel av 16 punkter på 5 och 10 km utan höjd — EU-DEM saknar hav), lat,
//      lon, stationer inom 20 km. Ridge (λ = 1 på standardiserade kovariater), leave-one-out över stationerna ⇒ R² och MAE av särarten;
//      kandidaten RÅ+KOVARIAT = RÅ + särart_LOO ⇒ A1/A2/A3 per band mot RÅ och OFFSET. Frågan: kan särarten läras utan historik?
// Höjder: Copernicus EU-DEM 25 m via opentopodata.org (© Europeiska unionen, Copernicus). Saknas > 10 % av stationerna hoppas L8 över
// och sägs — aldrig "0 av 0". Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-prognoslagret-2026-10-06.ts [--sjalvtest]
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const BUCKET_S = 1800;
const SPRIDNINGSBAND: [string, number, number][] = [["0–0,5", 0, 0.5], ["0,5–1", 0.5, 1], ["1–2", 1, 2], ["2–4", 2, 4], ["> 4", 4, Infinity]];
const NATT_SOLHOJD = -6;          // som regimgrinden (#408): mätningens gräns, inte produktens
const MOLN_KLAR_PCT = 25, VIND_STILLA = 2, MOLN_MAX_KM = 50;
const KOVARIAT_MIN_PUNKTER = 100, RIDGE_LAMBDA = 1, GRANNAR_KM = 20;

/** Solhöjd i grader (USNO:s approximation, fel under en grad) — samma form som regimgrinden 30/9. */
export function solhojd(lat: number, lon: number, tUnix: number): number {
  const rad = Math.PI / 180, d = (tUnix - 946728000) / 86400;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const ha = ((gmst + lon / 15) * 15) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
}
export const solband = (h: number) => (h < NATT_SOLHOJD ? "natt" : h < 0 ? "skymning" : "dag");
export const regimklass = (moln: number | undefined, vind: number | undefined, sol: number) =>
  sol >= NATT_SOLHOJD ? "dag" : moln === undefined || vind === undefined ? "okänd" : moln <= MOLN_KLAR_PCT && vind <= VIND_STILLA ? "klar stilla natt" : "natt övrigt";
export const spridningsband = (s: number) => SPRIDNINGSBAND.find(([, lo, hi]) => s >= lo && s < hi)?.[0] ?? "> 4";
export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
/** Ridge med intercept på standardiserade kolumner; returnerar prediktionsfunktionen. */
export function ridge(X: number[][], y: number[], lambda: number): (x: number[]) => number {
  const n = X.length, p = X[0].length;
  const mu = Array.from({ length: p }, (_, j) => X.reduce((a, r) => a + r[j], 0) / n);
  const sd = Array.from({ length: p }, (_, j) => Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const ym = y.reduce((a, b) => a + b, 0) / n;
  // (ZᵀZ + λI) β = Zᵀ(y − ym), löst med Gauss-elimination.
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p + 1 }, (_, j) => j < p
    ? Z.reduce((a, r) => a + r[i] * r[j], 0) + (i === j ? lambda : 0)
    : Z.reduce((a, r, k) => a + r[i] * (y[k] - ym), 0)));
  for (let i = 0; i < p; i++) {
    let piv = i; for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    for (let r = 0; r < p; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= p; c++) A[r][c] -= f * A[i][c]; }
  }
  const beta = A.map((r, i) => r[p] / r[i]);
  return (x) => ym + x.reduce((a, v, j) => a + beta[j] * (v - mu[j]) / sd[j], 0);
}
const pct = (x: number) => `${(100 * x).toFixed(1).replace(".", ",")} %`;
const rad = (s: ReturnType<typeof stats>) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");
const perBand = (ev: Eval[], namn: string) => {
  console.log(`  ${namn}: ${rad(stats(ev))}`);
  for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
};

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const midsommar = Date.UTC(2025, 5, 21, 11) / 1000, vinter = Date.UTC(2025, 0, 15, 0) / 1000;
  k(solhojd(56, 13, midsommar) > 55 && solhojd(56, 13, vinter) < -30, "solhöjden midsommar/vinternatt");
  k(solband(-10) === "natt" && solband(-3) === "skymning" && solband(5) === "dag", "solbanden");
  k(regimklass(10, 1, -20) === "klar stilla natt" && regimklass(80, 1, -20) === "natt övrigt" && regimklass(10, 5, -20) === "natt övrigt"
    && regimklass(undefined, 1, -20) === "okänd" && regimklass(10, 1, 3) === "dag", "regimklasserna");
  k(spridningsband(0.3) === "0–0,5" && spridningsband(1) === "1–2" && spridningsband(9) === "> 4", "spridningsbanden");
  // Ridge återfinner en linjär sanning: y = 2·x1 − x2 + 0,5 på 60 punkter, LOO-fel litet.
  const X: number[][] = [], y: number[] = [];
  for (let i = 0; i < 60; i++) { const x1 = i / 10, x2 = ((i * 7) % 13) / 2; X.push([x1, x2]); y.push(2 * x1 - x2 + 0.5); }
  const f = ridge(X, y, 0.01);
  const fel = X.map((x, i) => Math.abs(f(x) - y[i])).reduce((a, b) => a + b, 0) / X.length;
  k(fel < 0.05, `ridge: medelfel ${fel}`);
  console.log("✓ självtest: solhöjd, solband, regimklasser, spridningsband, ridge");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #471)"); process.exit(1); }
const t0 = performance.now();
const min = (ms: number) => `${((performance.now() - ms) / 60_000).toFixed(1)} min`;
console.log("PROGNOSLAGRET — FYRA LÄSNINGAR I KUVÖSEN (kort #298, DECISIONS #471), hela vintern 2024/25, grind A:s modell och vakter. Ingen dom.");

// ── Underlaget: som grind A (publish/grind-a.ts rad 222–239) men hela vintern och med medelvinden för regimen.
const res = await q(`
  SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c, wind_speed_ms
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  ORDER BY station_id, b, sample_time DESC`);
const stations = new Map<string, Station>(), vind = new Map<string, Map<number, number>>();
for (const r of res) {
  let s = stations.get(r.station_id);
  if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); vind.set(r.station_id, new Map()); }
  s.series.set(Number(r.b), +r.surface_temp_c);
  if (r.wind_speed_ms !== null) vind.get(r.station_id)!.set(Number(r.b), +r.wind_speed_ms);
}
console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min(t0)})`);
if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }

// ── Molnmängden (SMHI p16, kuvos_ra.smhi_obs) vid närmaste SMHI-station ≤ 50 km, per timme.
const smhi = await q("SELECT station_id, lat, lon, extract(epoch FROM tid)::bigint AS s, varde FROM kuvos_ra.smhi_obs WHERE parameter = 16 AND varde IS NOT NULL");
const smhiPos = new Map<string, { lat: number; lon: number }>(), moln = new Map<string, number>();
for (const r of smhi) { smhiPos.set(r.station_id, { lat: +r.lat, lon: +r.lon }); moln.set(`${r.station_id}|${Math.floor(Number(r.s) / 3600)}`, Number(r.varde)); }
const narmasteMoln = new Map<string, string | null>();
for (const [id, s] of stations) {
  let best: string | null = null, bk = MOLN_MAX_KM;
  for (const [sid, p] of smhiPos) { const km = haversineKm(s.lon, s.lat, p.lon, p.lat); if (km < bk) { bk = km; best = sid; } }
  narmasteMoln.set(id, best);
}
const molnVid = (id: string, t: number) => { const sid = narmasteMoln.get(id); return sid ? moln.get(`${sid}|${Math.floor(t * BUCKET_S / 3600)}`) : undefined; };
const solVid = (id: string, t: number) => { const s = stations.get(id)!; return solhojd(s.lat, s.lon, (t + 0.5) * BUCKET_S); };
const regim = (id: string, t: number) => regimklass(molnVid(id, t), vind.get(id)?.get(t), solVid(id, t));
console.log(`  SMHI-molnstationer ${smhiPos.size}, ${moln.size} timvärden; VViS-stationer med molnstation ≤ ${MOLN_MAX_KM} km: ${[...narmasteMoln.values()].filter(Boolean).length} av ${stations.size}`);

// ── Modellerna.
const OFFSET = evaluate(stations), RA = evaluate(stations, { utanOffset: true }), REGIM = evaluate(stations, { regim });
console.log(`  OFFSET ${OFFSET.length} punkter · RÅ ${RA.length} · OFFSET-REGIM ${REGIM.length} (${min(t0)})`);
console.log("\n═══ Grundlinjen per band ═══"); perBand(OFFSET, "OFFSET (grind A)"); perBand(RA, "RÅ (vägpunktens modell)");

// ── L1 ankarspridningen.
console.log("\n═══ L1 — ankarspridningen: felet och täckningen per spridningsband (störst − minst offsetkorrigerat ankarvärde) ═══");
for (const [namn, ev] of [["OFFSET", OFFSET], ["RÅ", RA]] as const) {
  console.log(`  ${namn}:`);
  for (const [b] of SPRIDNINGSBAND) {
    const del = ev.filter((e) => spridningsband(e.spridning) === b);
    console.log(`      spridning ${b.padEnd(6)} täckning ${pct(del.length / ev.length).padStart(7)} · ${rad(stats(del))}`);
  }
  const ensam = ev.filter((e) => e.spridning === 0);
  console.log(`      (${ensam.length} punkter med ett enda ankare räknas i 0–0,5)`);
}

// ── L2 natt och säsong.
console.log("\n═══ L2 — natt och säsong: OFFSET per solhöjdsband och månad (A2 = grova fel > 2 °C) ═══");
const manad = (t: number) => new Date(t * BUCKET_S * 1000).toISOString().slice(0, 7);
const manader = [...new Set(OFFSET.map((e) => manad(e.t)))].sort();
console.log(`  band       ${manader.map((m) => m.padStart(14)).join("")}      alla`);
for (const band of ["natt", "skymning", "dag"]) {
  const del = OFFSET.filter((e) => solband(solVid(e.station, e.t)) === band);
  const celler = manader.map((m) => { const s = stats(del.filter((e) => manad(e.t) === m)); return s.n ? `${pct(s.gross)} (${s.n})`.padStart(14) : "—".padStart(14); });
  console.log(`  ${band.padEnd(9)}${celler.join("")}  ${rad(stats(del))}`);
}

// ── L4 regimstyrd offset.
console.log("\n═══ L4 — regimstyrd offset: OFFSET-REGIM mot OFFSET, per band och per klass ═══");
perBand(REGIM, "OFFSET-REGIM"); perBand(OFFSET, "OFFSET (samma punkter)");
const klasser = [...new Set(REGIM.map((e) => regim(e.station, e.t)))].sort();
for (const kl of klasser) {
  const r = REGIM.filter((e) => regim(e.station, e.t) === kl), o = OFFSET.filter((e) => regim(e.station, e.t) === kl);
  console.log(`  ${kl.padEnd(17)} täckning ${pct(r.length / REGIM.length).padStart(7)} · OFFSET-REGIM ${rad(stats(r))} · OFFSET ${rad(stats(o))}`);
}

// ── L8 kovariatmodellen.
console.log("\n═══ L8 — kovariatmodellen tränad på stationernas särart (medel mätt − RÅ), leave-one-out över stationerna ═══");
const sarart = new Map<string, { sum: number; n: number }>();
for (const e of RA) { const s = sarart.get(e.station) ?? { sum: 0, n: 0 }; s.sum += e.measured - e.pred; s.n++; sarart.set(e.station, s); }
const ids = [...sarart].filter(([, s]) => s.n >= KOVARIAT_MIN_PUNKTER).map(([id]) => id);
console.log(`  stationer med ≥ ${KOVARIAT_MIN_PUNKTER} punkter: ${ids.length} av ${sarart.size}; särartens spridning: sd ${Math.sqrt(ids.reduce((a, id) => a + (sarart.get(id)!.sum / sarart.get(id)!.n) ** 2, 0) / ids.length).toFixed(2)} °C`);
// Höjdpunkter: stationen, 8 på 1 km, 8 på 3 km, 16 på 5 och 10 km (hav = ingen höjd i EU-DEM).
const punkter: { id: string; roll: string; lat: number; lon: number }[] = [];
for (const id of ids) {
  const s = stations.get(id)!; punkter.push({ id, roll: "egen", lat: s.lat, lon: s.lon });
  for (const [roll, km, n] of [["r1", 1, 8], ["r3", 3, 8], ["k5", 5, 8], ["k10", 10, 8]] as const)
    for (let i = 0; i < n; i++) { const v = (2 * Math.PI * i) / n; punkter.push({ id, roll, lat: s.lat + (km / 111) * Math.cos(v), lon: s.lon + (km / (111 * Math.cos(s.lat * Math.PI / 180))) * Math.sin(v) }); }
}
const hojd = new Map<number, number | null>();
for (let i = 0; i < punkter.length; i += 100) {
  const batch = punkter.slice(i, i + 100);
  try {
    const r = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${batch.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|")}`, { headers: { Accept: "application/json" } });
    if (r.ok) { const j: any = await r.json(); (j.results ?? []).forEach((x: any, k: number) => hojd.set(i + k, typeof x?.elevation === "number" ? x.elevation : null)); }
    else console.error(`  opentopodata: HTTP ${r.status} på batch ${i / 100 + 1}`);
  } catch (e) { console.error(`  opentopodata: ${(e as Error).message} på batch ${i / 100 + 1}`); }
  await new Promise((ok) => setTimeout(ok, 1100));
}
const egna = punkter.map((p, i) => [p, i] as const).filter(([p]) => p.roll === "egen");
const medHojd = egna.filter(([, i]) => typeof hojd.get(i) === "number").length;
console.log(`  höjder: ${medHojd} av ${ids.length} stationer fick EU-DEM-höjd, ${punkter.length} punkter frågade (${min(t0)})`);
if (medHojd < ids.length * 0.9) {
  console.log("  L8 HOPPAS ÖVER: höjderna räcker inte (under 90 %) — inte ett utfall, ett saknat underlag.");
} else {
  const kov = new Map<string, number[]>();
  for (const id of ids) {
    const idx = punkter.map((p, i) => [p, i] as const).filter(([p]) => p.id === id);
    const h = (roll: string) => idx.filter(([p]) => p.roll === roll).map(([, i]) => hojd.get(i));
    const egen = h("egen")[0]; if (typeof egen !== "number") continue;
    const medel = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : egen; };
    const kust = [...h("k5"), ...h("k10")].filter((x) => typeof x !== "number").length / 16;
    const s = stations.get(id)!;
    const grannar = [...stations].filter(([n, g]) => n !== id && haversineKm(s.lon, s.lat, g.lon, g.lat) <= GRANNAR_KM).length;
    kov.set(id, [egen, egen - medel(h("r1")), egen - medel(h("r3")), kust, s.lat, s.lon, grannar]);
  }
  const kids = [...kov.keys()];
  const y = kids.map((id) => sarart.get(id)!.sum / sarart.get(id)!.n);
  const loo = new Map<string, number>();
  for (let i = 0; i < kids.length; i++) {
    const f = ridge(kids.filter((_, j) => j !== i).map((id) => kov.get(id)!), y.filter((_, j) => j !== i), RIDGE_LAMBDA);
    loo.set(kids[i], f(kov.get(kids[i])!));
  }
  const ym = y.reduce((a, b) => a + b, 0) / y.length;
  const ssTot = y.reduce((a, v) => a + (v - ym) ** 2, 0), ssRes = kids.reduce((a, id, i) => a + (y[i] - loo.get(id)!) ** 2, 0);
  const maeS = kids.reduce((a, id, i) => a + Math.abs(y[i] - loo.get(id)!), 0) / kids.length;
  const maeNoll = kids.reduce((a, _, i) => a + Math.abs(y[i] - ym), 0) / kids.length;
  console.log(`  ${kids.length} stationer med kovariater [höjd, relief 1 km, relief 3 km, kust, lat, lon, grannar ≤ 20 km]; ridge λ ${RIDGE_LAMBDA}`);
  console.log(`  särarten ur kovariaterna, leave-one-out: R² ${(1 - ssRes / ssTot).toFixed(3)} · MAE ${maeS.toFixed(2)} °C (mot ${maeNoll.toFixed(2)} °C utan modell)`);
  const full = ridge(kids.map((id) => kov.get(id)!), y, RIDGE_LAMBDA);
  const namn = ["höjd", "relief 1 km", "relief 3 km", "kust", "lat", "lon", "grannar"];
  const bas = kids.map((id) => kov.get(id)!);
  const sd = namn.map((_, j) => Math.sqrt(bas.reduce((a, r) => a + (r[j] - bas.reduce((x, s) => x + s[j], 0) / bas.length) ** 2, 0) / bas.length));
  const mid = namn.map((_, j) => bas.reduce((x, s) => x + s[j], 0) / bas.length);
  console.log(`  effekt per standardavvikelse (°C särart): ${namn.map((n, j) => { const a = [...mid], b = [...mid]; a[j] += sd[j]; return `${n} ${(full(a) - full(b)).toFixed(2)}`; }).join(" · ")}`);
  const KOV: Eval[] = RA.filter((e) => loo.has(e.station)).map((e) => ({ ...e, pred: e.pred + loo.get(e.station)! }));
  const samma = new Set(KOV.map((e) => `${e.station}|${e.t}`));
  console.log("  kandidaten RÅ+KOVARIAT mot RÅ och OFFSET på samma punkter:");
  perBand(KOV, "RÅ+KOVARIAT"); perBand(RA.filter((e) => samma.has(`${e.station}|${e.t}`)), "RÅ"); perBand(OFFSET.filter((e) => samma.has(`${e.station}|${e.t}`)), "OFFSET (taket)");
}
console.log(`\nKlart (${min(t0)}). Ingen dom, inga trösklar; talen förs in i DECISIONS #471.`);
await db.end();
