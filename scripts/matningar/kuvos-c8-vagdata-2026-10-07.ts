// C8 MED VÄGDATA — KOVARIATMODELLEN TRÄNAD PÅ STATIONERNAS SÄRART, NU MED VÄGENS EGENSKAPER (kort #298, DECISIONS #479; Bengts
// "kör c8" 7/10). INGEN DOM: inga trösklar rörs. L8 (#471) prövade terräng och fick R² 0,01; Axels fysikspår (7/10, utanför repot)
// fann att trafikmängd och vägklass förklarar 23 % av stationernas avvikelse mot hans fysikmodell. Här prövas vägdatan mot RÅ.
//   MÅLET, som L8: stationens särart = medel(mätt − RÅ) över dess punkter, för stationer med minst 100 punkter.
//   TRE MODELLER, ridge (λ = 1 på standardiserade kolumner, som L8):
//     VÄG  log ÅDT, andel lastbilar, andel lätta fordon 22–06, funktionell vägklass, hastighet, bredd, grus, kommunal väghållare,
//          och två flaggor för saknad ÅDT och saknad nattrafik (saknade värden = medianen över stationerna; målet fylls aldrig).
//     REL  samma sex tal minus grannarnas viktade medel (samma grannar som RÅ: fem närmaste inom 50 km, vikt 1/max(km, 1)) —
//          RÅ är ett grannmedel, så det som syns i särarten är skillnaden mot grannarna; grus, kommunal och flaggorna som i VÄG.
//     BAS  L8:s billiga variabler: latitud, longitud, stationer inom 20 km (höjderna hoppas över — de bar ingenting i L8).
//   VALIDERINGEN: (1) hela regioner gömda, rutor om 1° latitud × 2° longitud — huvudtalet; (2) leave-one-out som L8.
//   MÅTTEN: R² och MAE för särarten; kandidaterna RÅ+VÄG, RÅ+REL och RÅ+BAS (RÅ plus den regionsgömda särarten) per band mot RÅ och
//     OFFSET på samma punkter; samma sak under spridningsgrinden vid 2,25 °C (#477); effekt per standardavvikelse; särarten per
//     ÅDT-klass (< 1 000 · 1 000–20 000 · > 20 000) som kontroll mot Axels −0,58 / +1,14 °C.
// Vägdatan läses ur data/vagdata/stationer.json (NVDB via öppna API:et, CC0, #473) — samma stationsnycklar som kuvösen (static.json).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-c8-vagdata-2026-10-07.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const BUCKET_S = 1800;
const MIN_PUNKTER = 100;                  // som L8 (#471)
const RIDGE_LAMBDA = 1;                   // som L8
const GRANNAR_K = 5, GRANNAR_KM = 50;     // som RÅ (grind A)
const TATHET_KM = 20;                     // L8:s "stationer inom 20 km"
const RUTA_LAT = 1, RUTA_LON = 2;         // regionerna
const SPRIDNING_X = 2.25;                 // spridningsgrinden (#477) — dagens baslinje
const ADT_KLASSER: [string, number, number][] = [["< 1 000", 0, 1000], ["1 000–20 000", 1000, 20000], ["> 20 000", 20000, Infinity]];

export type VagRad = { id: string; klass?: number | null; slitlager?: string | null; vaghallare?: string | null; bredd_m?: number | null;
  hastighet_kmh?: number | null; adt_fordon?: number | null; adt_lastbilar?: number | null; adt_latta_22_06?: number | null };
export type Pos = { lat: number; lon: number };

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
/** Ridge med intercept på standardiserade kolumner — ordagrant L8:s (kuvos-prognoslagret-2026-10-06.ts, som inte kan importeras). */
export function ridge(X: number[][], y: number[], lambda: number): (x: number[]) => number {
  const n = X.length, p = X[0].length;
  const mu = Array.from({ length: p }, (_, j) => X.reduce((a, r) => a + r[j], 0) / n);
  const sd = Array.from({ length: p }, (_, j) => Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const ym = y.reduce((a, b) => a + b, 0) / n;
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

const tal = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const VAG_NAMN = ["log ÅDT", "andel lastbilar", "andel natt 22–06", "vägklass", "hastighet", "bredd", "grus", "kommunal", "saknar ÅDT", "saknar natt"];
export const KONTINUERLIGA = 6;           // de sex första är tal som kan jämföras med grannarnas; resten är flaggor
/** Vägens egenskaper som rå kolumner; null = saknas (fylls med medianen). */
export function vagRad(r: VagRad): (number | null)[] {
  const adt = tal(r.adt_fordon), lb = tal(r.adt_lastbilar), natt = tal(r.adt_latta_22_06);
  return [adt !== null && adt > 0 ? Math.log10(adt) : null, adt && lb !== null ? lb / adt : null, adt && natt !== null ? natt / adt : null,
    tal(r.klass), tal(r.hastighet_kmh), tal(r.bredd_m), r.slitlager === "grus" ? 1 : 0, r.vaghallare === "kommunal" ? 1 : 0,
    adt === null || adt <= 0 ? 1 : 0, natt === null || !adt ? 1 : 0];
}
/** Saknade värden = medianen över stationerna per kolumn (bara egenskaperna, aldrig målet). */
export function fyllMedian(X: (number | null)[][]): number[][] {
  const p = X[0].length;
  const med = Array.from({ length: p }, (_, j) => {
    const v = X.map((r) => r[j]).filter((x): x is number => x !== null).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  });
  return X.map((r) => r.map((x, j) => (x === null ? med[j] : x)));
}
/** Samma grannar som RÅ: de fem närmaste inom 50 km. */
export function grannar(ids: string[], pos: Map<string, Pos>): Map<string, { id: string; km: number }[]> {
  const ut = new Map<string, { id: string; km: number }[]>();
  for (const a of ids) {
    const pa = pos.get(a)!;
    ut.set(a, ids.filter((b) => b !== a).map((b) => ({ id: b, km: haversineKm(pa.lon, pa.lat, pos.get(b)!.lon, pos.get(b)!.lat) }))
      .filter((n) => n.km <= GRANNAR_KM).sort((x, y) => x.km - y.km).slice(0, GRANNAR_K));
  }
  return ut;
}
/** REL: de kontinuerliga kolumnerna minus grannarnas viktade medel (1/max(km, 1)); utan grannar 0. Flaggorna som de är. */
export function relativt(ids: string[], X: number[][], gr: Map<string, { id: string; km: number }[]>): number[][] {
  const idx = new Map(ids.map((id, i) => [id, i]));
  return ids.map((id, i) => X[i].map((v, j) => {
    if (j >= KONTINUERLIGA) return v;
    const ns = gr.get(id)!.filter((n) => idx.has(n.id));
    if (!ns.length) return 0;
    let w = 0, s = 0;
    for (const n of ns) { const vi = 1 / Math.max(n.km, 1); w += vi; s += vi * X[idx.get(n.id)!][j]; }
    return v - s / w;
  }));
}
export const region = (p: Pos) => `${Math.floor(p.lat / RUTA_LAT)}|${Math.floor(p.lon / RUTA_LON)}`;
/** Korsvaliderad särart: för varje grupp tränas modellen på träningsstationerna UTANFÖR gruppen och förutsäger gruppens stationer. */
export function korsvalidera(ids: string[], X: number[][], y: Map<string, number>, grupp: (id: string) => string): Map<string, number> {
  const ut = new Map<string, number>(), grupper = new Map<string, number[]>();
  ids.forEach((id, i) => { const g = grupp(id); (grupper.get(g) ?? grupper.set(g, []).get(g)!).push(i); });
  for (const [g, idx] of grupper) {
    const tr = ids.map((_, i) => i).filter((i) => y.has(ids[i]) && grupp(ids[i]) !== g);
    if (tr.length < X[0].length + 5) continue;
    const f = ridge(tr.map((i) => X[i]), tr.map((i) => y.get(ids[i])!), RIDGE_LAMBDA);
    for (const i of idx) ut.set(ids[i], f(X[i]));
  }
  return ut;
}
export function forklarat(y: Map<string, number>, yhat: Map<string, number>): { r2: number; mae: number; maeNoll: number; n: number } {
  const ids = [...y.keys()].filter((id) => yhat.has(id));
  const ym = ids.reduce((a, id) => a + y.get(id)!, 0) / ids.length;
  const ssTot = ids.reduce((a, id) => a + (y.get(id)! - ym) ** 2, 0), ssRes = ids.reduce((a, id) => a + (y.get(id)! - yhat.get(id)!) ** 2, 0);
  return { r2: 1 - ssRes / ssTot, mae: ids.reduce((a, id) => a + Math.abs(y.get(id)! - yhat.get(id)!), 0) / ids.length,
    maeNoll: ids.reduce((a, id) => a + Math.abs(y.get(id)! - ym), 0) / ids.length, n: ids.length };
}

const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1).replace(".", ",")} %` : "—");
const rad = (s: ReturnType<typeof stats>) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");
const avrundad = (s: number) => Math.round(s * 1000) / 1000;

/** Hela läsningen på färdiga punkter — en funktion, så att självtestet kör den på syntetiska stationer. Returnerar R² per modell. */
export function c8(RA: Eval[], OFF: Eval[], pos: Map<string, Pos>, vag: Map<string, VagRad>): Record<string, { region: number; loo: number }> {
  // Målet.
  const sum = new Map<string, { s: number; n: number }>();
  for (const e of RA) { const x = sum.get(e.station) ?? { s: 0, n: 0 }; x.s += e.measured - e.pred; x.n++; sum.set(e.station, x); }
  const y = new Map([...sum].filter(([, x]) => x.n >= MIN_PUNKTER).map(([id, x]) => [id, x.s / x.n]));
  const ids = [...sum.keys()].filter((id) => vag.has(id) && pos.has(id)).sort();
  const utan = [...sum.keys()].filter((id) => !vag.has(id));
  const ysd = Math.sqrt([...y.values()].reduce((a, v, _, arr) => a + (v - arr.reduce((b, w) => b + w, 0) / arr.length) ** 2, 0) / y.size);
  console.log(`  stationer i RÅ ${sum.size} · med vägdata ${ids.length} · utan vägdata ${utan.length}${utan.length ? ` (${utan.slice(0, 8).join(", ")}${utan.length > 8 ? " …" : ""})` : ""}`);
  console.log(`  träningsstationer (≥ ${MIN_PUNKTER} punkter, med vägdata) ${[...y.keys()].filter((id) => vag.has(id)).length}; särartens spridning sd ${ysd.toFixed(2)} °C`);
  for (const id of [...y.keys()]) if (!vag.has(id)) y.delete(id);

  // Kolumnerna.
  const VAG = fyllMedian(ids.map((id) => vagRad(vag.get(id)!)));
  const gr = grannar(ids, pos);
  const REL = relativt(ids, VAG, gr);
  const BAS = ids.map((id) => { const p = pos.get(id)!; return [p.lat, p.lon, ids.filter((b) => b !== id && haversineKm(p.lon, p.lat, pos.get(b)!.lon, pos.get(b)!.lat) <= TATHET_KM).length]; });
  const modeller: [string, number[][]][] = [["VÄG", VAG], ["REL", REL], ["BAS", BAS]];
  const reg = (id: string) => region(pos.get(id)!);

  console.log(`\n═══ Särarten ur kolumnerna: regioner gömda (rutor ${RUTA_LAT}° × ${RUTA_LON}°, ${new Set(ids.map(reg)).size} rutor) och leave-one-out ═══`);
  const ut: Record<string, { region: number; loo: number }> = {};
  const skatt = new Map<string, Map<string, number>>();
  for (const [namn, X] of modeller) {
    const pr = korsvalidera(ids, X, y, reg), pl = korsvalidera(ids, X, y, (id) => id);
    const fr = forklarat(y, pr), fl = forklarat(y, pl);
    ut[namn] = { region: fr.r2, loo: fl.r2 };
    skatt.set(namn, pr);
    console.log(`  ${namn.padEnd(4)} regioner gömda: R² ${fr.r2.toFixed(3)} · MAE ${fr.mae.toFixed(2)} °C (utan modell ${fr.maeNoll.toFixed(2)}) på ${fr.n} · leave-one-out: R² ${fl.r2.toFixed(3)} · MAE ${fl.mae.toFixed(2)} °C`);
  }

  // Effekt per standardavvikelse (VÄG och REL, tränade på alla träningsstationer).
  for (const [namn, X] of modeller.slice(0, 2)) {
    const tr = ids.map((_, i) => i).filter((i) => y.has(ids[i]));
    const f = ridge(tr.map((i) => X[i]), tr.map((i) => y.get(ids[i])!), RIDGE_LAMBDA);
    const p = X[0].length, mid = Array.from({ length: p }, (_, j) => tr.reduce((a, i) => a + X[i][j], 0) / tr.length);
    const sd = Array.from({ length: p }, (_, j) => Math.sqrt(tr.reduce((a, i) => a + (X[i][j] - mid[j]) ** 2, 0) / tr.length));
    console.log(`  effekt per standardavvikelse, ${namn} (°C särart): ${VAG_NAMN.map((n, j) => { const a = [...mid]; a[j] += sd[j]; return `${n} ${(f(a) - f(mid)).toFixed(2)}`; }).join(" · ")}`);
  }

  // Axels kontroll: särarten per ÅDT-klass.
  console.log(`  särarten per ÅDT-klass (Axel: under 1 000 −0,58 °C, över 20 000 +1,14 °C mot hans fysikmodell):`);
  for (const [namn, lo, hi] of ADT_KLASSER) {
    const v = ids.filter((id) => y.has(id)).map((id) => ({ adt: tal(vag.get(id)!.adt_fordon), s: y.get(id)! })).filter((x) => x.adt !== null && x.adt >= lo && x.adt < hi).map((x) => x.s);
    const m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
    console.log(`    ${namn.padEnd(13)} ${v.length} stationer · medel ${Number.isFinite(m) ? (m >= 0 ? "+" : "") + m.toFixed(2) + " °C" : "—"}`);
  }

  // Kandidaterna på samma punkter.
  const offKey = new Set(OFF.map((e) => `${e.station}|${e.t}`));
  const RAs = RA.filter((e) => skatt.get("VÄG")!.has(e.station) && offKey.has(`${e.station}|${e.t}`));
  const offs = new Set(RAs.map((e) => `${e.station}|${e.t}`));
  const OFFs = OFF.filter((e) => offs.has(`${e.station}|${e.t}`));
  const perBand = (ev: Eval[], namn: string) => {
    console.log(`  ${namn}: ${rad(stats(ev))}`);
    for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
  };
  console.log(`\n═══ Kandidaterna RÅ + särart (regioner gömda) mot RÅ och OFFSET på samma ${RAs.length} punkter ═══`);
  perBand(RAs, "RÅ");
  const kand = new Map<string, Eval[]>();
  for (const [namn] of modeller) {
    const s = skatt.get(namn)!;
    const K = RAs.filter((e) => s.has(e.station)).map((e) => ({ ...e, pred: e.pred + s.get(e.station)! }));
    kand.set(namn, K);
    perBand(K, `RÅ+${namn}${K.length !== RAs.length ? ` (${K.length} punkter)` : ""}`);
  }
  perBand(OFFs, "OFFSET (taket)");
  const grind = (e: Eval) => e.ankare >= 2 && avrundad(e.spridning) < SPRIDNING_X;
  console.log(`\n═══ Under spridningsgrinden vid ${String(SPRIDNING_X).replace(".", ",")} °C (#477) ═══`);
  const RAg = RAs.filter(grind);
  console.log(`  täckning ${pct(RAg.length / RAs.length)} · RÅ: ${rad(stats(RAg))}`);
  for (const [namn] of modeller) console.log(`  RÅ+${namn}: ${rad(stats(kand.get(namn)!.filter(grind)))}`);
  return ut;
}

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // Ridge återfinner en linjär sanning.
  const X0: number[][] = [], y0: number[] = [];
  for (let i = 0; i < 60; i++) { const x1 = i / 10, x2 = ((i * 7) % 13) / 2; X0.push([x1, x2]); y0.push(2 * x1 - x2 + 0.5); }
  const f0 = ridge(X0, y0, 0.01);
  k(X0.every((x, i) => Math.abs(f0(x) - y0[i]) < 0.1), "ridge återfinner y = 2·x1 − x2 + 0,5");
  // Kolumnerna: log ÅDT, andelar, flaggor, medianfyllnad.
  const r1 = vagRad({ id: "a", adt_fordon: 1000, adt_lastbilar: 100, adt_latta_22_06: 50, klass: 2, hastighet_kmh: 80, bredd_m: 7, slitlager: "grus", vaghallare: "kommunal" });
  k(r1[0] === 3 && r1[1] === 0.1 && r1[2] === 0.05 && r1[6] === 1 && r1[7] === 1 && r1[8] === 0 && r1[9] === 0, "vägkolumnerna");
  const r2 = vagRad({ id: "b", adt_fordon: null, klass: 0, hastighet_kmh: 100, bredd_m: 9 });
  k(r2[0] === null && r2[8] === 1 && r2[9] === 1, "saknad ÅDT flaggas");
  k(fyllMedian([[1, null], [3, 5], [2, 7]])[0][1] === 7, "medianfyllnad (övre mitten vid jämnt antal)");
  // REL: egen minus grannarnas viktade medel.
  const p3 = new Map<string, Pos>([["x", { lat: 60, lon: 15 }], ["y", { lat: 60, lon: 15.1 }], ["z", { lat: 61.5, lon: 15 }]]);
  const g3 = grannar(["x", "y", "z"], p3);
  k(g3.get("x")!.length === 1 && g3.get("z")!.length === 0, "grannarna inom 50 km");
  const rel3 = relativt(["x", "y", "z"], [[4, 0, 0, 0, 0, 0, 1, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0, 0]], g3);
  k(rel3[0][0] === 2 && rel3[1][0] === -2 && rel3[2][0] === 0 && rel3[0][6] === 1, "REL: egen minus grannar, ensam 0, flaggor orörda");
  k(region({ lat: 60.9, lon: 15.9 }) === "60|7" && region({ lat: 61.1, lon: 16.1 }) === "61|8", "regionerna 1° × 2°");
  // Hela läsningen på syntetiska stationer där särarten är 0,9·(log ÅDT − 3,5): VÄG ska hitta den, BAS inte.
  let seed = 7; const slump = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pos = new Map<string, Pos>(), vag = new Map<string, VagRad>(), RA: Eval[] = [];
  for (let s = 0; s < 160; s++) {
    const id = `s${s}`, adt = Math.round(10 ** (2 + 2.7 * slump()));
    pos.set(id, { lat: 55.5 + 12 * slump(), lon: 12 + 11 * slump() });
    vag.set(id, { id, adt_fordon: adt, adt_lastbilar: Math.round(adt * 0.1), adt_latta_22_06: Math.round(adt * 0.05), klass: Math.floor(5 * slump()), hastighet_kmh: 80, bredd_m: 8, slitlager: "belagd", vaghallare: "statlig" });
    const sar = 0.9 * (Math.log10(adt) - 3.5);
    for (let t = 0; t < 120; t++) RA.push({ measured: -1 + sar + 0.2 * (slump() - 0.5), pred: -1, ankKm: 3 + 30 * slump(), station: id, t, spridning: 4 * slump(), ankare: 3 });
  }
  const OFF = RA.map((e) => ({ ...e, pred: e.measured - 0.1 }));
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  let r: Record<string, { region: number; loo: number }>;
  try { r = c8(RA, OFF, pos, vag); } finally { console.log = orig; }
  k(r!.VÄG.region > 0.9 && r!.VÄG.loo > 0.9, `VÄG hittar den syntetiska särarten (R² ${r!.VÄG.region.toFixed(3)})`);
  k(r!.BAS.region < 0.3, `BAS hittar den inte (R² ${r!.BAS.region.toFixed(3)})`);
  k(!skrivet.some((s) => s.includes("NaN")), "utskriften utan NaN");
  k(skrivet.some((s) => s.startsWith("  RÅ+VÄG:")) && skrivet.some((s) => s.includes("Under spridningsgrinden")), "utskriften når kandidaterna och grinden");
  const kl = skrivet.filter((s) => /^\s{4}(< 1 000|> 20 000)/.test(s)).map((s) => Number(s.match(/medel ([+−-]?[\d.]+)/)![1]));
  k(kl.length === 2 && kl[0] < 0 && kl[1] > 0, "ÅDT-klasserna: små vägar kalla, stora varma i den syntetiska sanningen");
  // Läckvakten: en särart som är rent brus går inte att förutsäga korsvaliderat (R² under 0). Tränas modellen också på den station
  // den förutsäger blir R² positivt — det är felet vakten finns för.
  const bid: string[] = [], bX: number[][] = [], by = new Map<string, number>();
  for (let i = 0; i < 120; i++) { const id = `b${i}`; bid.push(id); bX.push(Array.from({ length: 10 }, () => slump())); by.set(id, slump() - 0.5); }
  const brus = forklarat(by, korsvalidera(bid, bX, by, (id) => id)).r2;
  k(brus < 0, `läckvakten: brus förutsägs inte korsvaliderat (R² ${brus.toFixed(3)})`);
  console.log("✓ självtest: ridge, vägkolumnerna, flaggorna, medianfyllnaden, REL, regionerna, hela läsningen på syntetiska stationer");
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
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #479)"); process.exit(1); }
const t0 = performance.now();
const min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
console.log("C8 MED VÄGDATA (kort #298, DECISIONS #479), vintern 2024/25, grind A:s RÅ och vakter, vägdatalagret ur NVDB. Ingen dom.");

// ── Underlaget: som L1/L2/K1 (kuvos-spridning-natt-2026-10-07.ts).
const res = await q(`
  SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  ORDER BY station_id, b, sample_time DESC`);
const stations = new Map<string, Station>();
for (const r of res) {
  let s = stations.get(r.station_id);
  if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
await db.end();
console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()})`);
if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }

const vagfil = JSON.parse(readFileSync(new URL("../../data/vagdata/stationer.json", import.meta.url), "utf8"));
const vag = new Map<string, VagRad>((vagfil.rader as VagRad[]).map((r) => [String(r.id), r]));
console.log(`  vägdatan: ${vag.size} stationer ur ${vagfil.huvud?.kalla ?? "data/vagdata/stationer.json"} (hämtad ${vagfil.huvud?.datum ?? "?"})`);
const pos = new Map<string, Pos>([...stations].map(([id, s]) => [id, { lat: s.lat, lon: s.lon }]));

const RA = evaluate(stations, { utanOffset: true }), OFF = evaluate(stations);
console.log(`  RÅ ${RA.length} punkter · OFFSET ${OFF.length} (${min()}) — kontroll mot 6/10 och K1 (4 353 206 punkter, grova 7,5 %): ${rad(stats(RA))}`);
c8(RA, OFF, pos, vag);
console.log(`\nKlart (${min()}). Ingen dom: läsningen är underlag för Bengt och Axel (DECISIONS #479).`);
