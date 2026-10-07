// C8 MOT VÄDRET — VÄGDATAN MOT EN VÄDERBASLINJE UR MET NORDIC (kort #298, DECISIONS #480; Bengt 7/10: "mät mot met nordic. jag är
// i alla fall nyfiken på resultatet"). INGEN DOM, inga trösklar. C8 (#479) mätte stationens särart mot grannarna (RÅ) och fann att
// vägdatan förklarar 4 %. Axel mätte mot sin fysikmodell (ECMWF, utanför repot) och fann 23 %. Det här är en TREDJE baslinje — MET
// Nordic, inte Axels modell — och därför ingen upprepning av hans mätning; frågan är om vägdatan vet något som väderrutnätet inte vet.
//   BASLINJERNA (ingen station går in):
//     LUFT   ytan skattas som MET Nordics lufttemperatur 2 m i stationens ruta.
//     VÄDER  linjär regression av ytan på MET Nordics sju fält (luft, fukt, vind, moln, nederbörd, lång- och kortvåg), tränad med
//            stationens hela region gömd (rutor 1° × 2°, som C8) på grind A:s population; koefficienterna skrivs ut.
//   Stationens särart mot baslinjen = medel(mätt − baslinje) över dess punkter (minst 100), som C8.
//   C8 PÅ VARJE BASLINJE: VÄG och BAS ur C8-skriptet (importerade, samma kolumner och samma ridge), regioner gömda och leave-one-out;
//     R², MAE, effekt per standardavvikelse och särarten per ÅDT-klass (Axel: −0,58 / +1,14 °C mot sin modell).
//   KANDIDATERNA per punkt: LUFT, LUFT+VÄG, VÄDER, VÄDER+VÄG, VÄDER+BAS mot RÅ och OFFSET på samma punkter, per band (bandet är RÅ:s
//     närmaste ankare — för väderbaslinjerna bara ett mått på hur glest stationerna står).
// Indata: releasen kuvos-metnordic-2024-25 (MET Norway, NLOD / CC BY 4.0), hämtad av Axels gren 6/10 (PR #783, DECISIONS #470 där);
// kuvösknappen laddar ner den och kontrollerar summorna mot kuvos/metnordic-leverans.json. Varje fält prövas mot värdevaktens SPANN.
// En halvtimmeshink läser analysen vid hinkens början — den senaste som fanns då, aldrig en senare (som #470 på grenen föreskrev).
// Kör: DATABASE_URL=... METNORDIC=metnordic/metnordic_2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-c8-metnordic-2026-10-07.ts [--sjalvtest]
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { SPANN } from "../vardevakten.ts";
import { haversineKm, vagRad, fyllMedian, korsvalidera, forklarat, region, ridge, VAG_NAMN, type VagRad, type Pos } from "./kuvos-c8-vagdata-2026-10-07.ts";

const BUCKET_S = 1800;
const MIN_PUNKTER = 100;                  // som C8 och L8
const RIDGE_LAMBDA = 1;                   // som C8
const TATHET_KM = 20;                     // som C8:s BAS
export const FALT = ["t2m_c", "rh2m", "vind10_ms", "moln", "nederbord_mm", "langvag_jm2", "kortvag_jm2"] as const;
export const T0 = Date.parse("2024-10-31T00:00:00Z") / 3_600_000;   // första timmen i releasen
export const NT = 3648;                                             // 31/10 2024 00 – 31/3 2025 23 UTC
const ADT_KLASSER: [string, number, number][] = [["< 1 000", 0, 1000], ["1 000–20 000", 1000, 20000], ["> 20 000", 20000, Infinity]];

export type Vader = Map<string, Float32Array[]>;   // station → ett fält per index i FALT, NT timmar, NaN där inget finns
/** Hinkens timindex: analysen vid hinkens början (hink t = halvtimme t sedan epoken). */
export const timIndex = (t: number) => Math.floor((t * BUCKET_S) / 3600) - T0;
/** Regressorerna för en punkt: de sju fälten, strålningen i W/m² (J/m² per timme / 3600). Null om något saknas. */
export function regressorer(v: Float32Array[], i: number): number[] | null {
  if (i < 0 || i >= NT) return null;
  const x = FALT.map((_, j) => v[j][i]);
  if (x.some((a) => Number.isNaN(a))) return null;
  return [x[0], x[1], x[2], x[3], x[4], x[5] / 3600, x[6] / 3600];
}
/** Löser A·b = y (Gauss med pivotering). */
export function los(A: number[][], y: number[]): number[] {
  const n = y.length, M = A.map((r, i) => [...r, y[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
/** VÄDER-baslinjen: linjär regression av ytan på de sju fälten (plus konstant), där varje punkt förutsägs av en modell tränad UTAN
 *  dess region — summorna per region dras från landets. Returnerar förutsägelserna och koefficienterna på hela landet. */
export function vaderRegionGomd(XF: Float64Array, M: Float64Array, har: Uint8Array, regioner: string[]): { pred: Float64Array; hel: number[] } {
  const N = M.length, p = 8, tomA = () => Array.from({ length: p }, () => new Array(p).fill(0)), tomB = () => new Array(p).fill(0);
  const z = (k: number) => [1, ...Array.from(XF.subarray(k * 7, k * 7 + 7))];
  const AR = new Map<string, number[][]>(), BR = new Map<string, number[]>(), A = tomA(), B = tomB();
  for (let k = 0; k < N; k++) {
    if (!har[k]) continue;
    const r = regioner[k], x = z(k);
    if (!AR.has(r)) { AR.set(r, tomA()); BR.set(r, tomB()); }
    const Ar = AR.get(r)!, Br = BR.get(r)!;
    for (let i = 0; i < p; i++) { Br[i] += x[i] * M[k]; B[i] += x[i] * M[k]; for (let j = 0; j < p; j++) { Ar[i][j] += x[i] * x[j]; A[i][j] += x[i] * x[j]; } }
  }
  const stab = (i: number, j: number) => (i === j && i > 0 ? 1e-6 : 0);
  const beta = new Map<string, number[]>();
  for (const [r, Ar] of AR) beta.set(r, los(A.map((row, i) => row.map((a, j) => a - Ar[i][j] + stab(i, j))), B.map((b, i) => b - BR.get(r)![i])));
  const hel = los(A.map((row, i) => row.map((a, j) => a + stab(i, j))), B);
  const pred = new Float64Array(N);
  for (let k = 0; k < N; k++) if (har[k]) { const b = beta.get(regioner[k])!, x = z(k); pred[k] = x.reduce((a, v, i) => a + v * b[i], 0); }
  return { pred, hel };
}
/** Grind A:s mått (publish/grind-a.ts stats()) på arrayer, per band och totalt — utan att skapa en kopia av varje punkt. */
export function matt(M: Float64Array, P: Float64Array, ank: Float64Array, med: Uint8Array) {
  const tom = () => ({ n: 0, nDec: 0, abs: 0, grova: 0, frys: 0 });
  const tot = tom(), band = BANDS.map(tom);
  for (let k = 0; k < M.length; k++) {
    if (!med[k]) continue;
    const m = M[k], p = P[k], d = Math.abs(p - m);
    const b = BANDS.findIndex(([, lo, hi]) => ank[k] >= lo && ank[k] < hi);
    for (const s of [tot, band[b]]) {
      s.n++; if (m >= -5) { s.nDec++; s.abs += d; }
      if (d > 2) s.grova++;
      if ((m < 0 && p > 2) || (m > 2 && p < 0)) s.frys++;
    }
  }
  const ut = (s: ReturnType<typeof tom>) => ({ n: s.n, mae: s.nDec ? s.abs / s.nDec : NaN, gross: s.n ? s.grova / s.n : NaN, freeze: s.n ? s.frys / s.n : NaN });
  return { tot: ut(tot), band: band.map(ut) };
}
/** Spannkontroll mot värdevaktens SPANN; fäller (returnerar fel) vid ett värde utanför eller ett fält utan spann. */
export function spannkontroll(vader: Vader): { fel: string[]; rader: string[] } {
  const fel: string[] = [], rader: string[] = [];
  FALT.forEach((f, j) => {
    const s = SPANN[f];
    if (!s) { fel.push(`${f}: OBESIKTIGAT — inget spann i scripts/vardevakten.ts`); return; }
    let lo = Infinity, hi = -Infinity, n = 0;
    for (const v of vader.values()) for (const x of v[j]) if (!Number.isNaN(x)) { n++; if (x < lo) lo = x; if (x > hi) hi = x; }
    rader.push(`${f}: ${n} värden, ${lo}–${hi} (spann ${s[0]}–${s[1]})`);
    if (lo < s[0] || hi > s[1]) fel.push(`${f}: ${lo}–${hi} utanför spannet ${s[0]}–${s[1]}`);
  });
  return { fel, rader };
}

const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1).replace(".", ",")} %` : "—");
const radM = (s: { n: number; mae: number; gross: number; freeze: number }) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");

/** Hela läsningen på färdiga punkter och väder — en funktion, så att självtestet kan köra den. Returnerar R² per baslinje och modell. */
export function motVadret(RA: Eval[], OFF: Eval[], pos: Map<string, Pos>, vag: Map<string, VagRad>, vader: Vader) {
  // Punkterna, i RÅ:s ordning; OFFSET måste ha samma ordning (grind A filtrerar båda varianterna lika).
  if (OFF.length !== RA.length || OFF.some((e, k) => e.station !== RA[k].station || e.t !== RA[k].t)) throw new Error("RÅ och OFFSET är inte radlika");
  const N = RA.length, M = new Float64Array(N), PRA = new Float64Array(N), POFF = new Float64Array(N), ANK = new Float64Array(N);
  // Regressorerna platt, sju per punkt (4,35 miljoner små arrayer hade kostat ett halvt gigabyte i onödan).
  const LUFT = new Float64Array(N), XF = new Float64Array(N * 7), har = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const e = RA[k]; M[k] = e.measured; PRA[k] = e.pred; POFF[k] = OFF[k].pred; ANK[k] = e.ankKm;
    const v = vader.get(e.station), x = v && vag.has(e.station) ? regressorer(v, timIndex(e.t)) : null;
    if (x) { har[k] = 1; LUFT[k] = x[0]; XF.set(x, k * 7); }
  }
  const nHar = har.reduce((a, b) => a + b, 0);
  console.log(`  punkter ${N}, med väder och vägdata ${nHar} (${pct(nHar / N)}); stationer med väder ${[...new Set(RA.filter((_, k) => har[k]).map((e) => e.station))].length}`);

  // VÄDER: regression med regionen gömd, ur summorna per region.
  const reg = (id: string) => region(pos.get(id)!);
  const { pred: VADER, hel } = vaderRegionGomd(XF, M, har, RA.map((e) => reg(e.station)));
  console.log(`  VÄDER, koefficienterna på hela landet (°C per enhet): konstant ${hel[0].toFixed(2)} · ${["luft", "fukt", "vind m/s", "moln", "nederbörd mm/h", "långvåg W/m²", "kortvåg W/m²"].map((n, j) => `${n} ${hel[j + 1].toFixed(4)}`).join(" · ")}`);

  // Särarten per station mot varje baslinje, och C8 (VÄG, BAS) på den.
  const ids = [...new Set(RA.filter((_, k) => har[k]).map((e) => e.station))].sort();
  const VAG = fyllMedian(ids.map((id) => vagRad(vag.get(id)!)));
  const BAS = ids.map((id) => { const q = pos.get(id)!; return [q.lat, q.lon, ids.filter((b) => b !== id && haversineKm(q.lon, q.lat, pos.get(b)!.lon, pos.get(b)!.lat) <= TATHET_KM).length]; });
  const ut: Record<string, Record<string, { region: number; loo: number }>> = {};
  const skatt = new Map<string, Map<string, number>>();
  for (const [bnamn, H] of [["LUFT", LUFT], ["VÄDER", VADER]] as [string, Float64Array][]) {
    const sum = new Map<string, { s: number; n: number }>();
    for (let k = 0; k < N; k++) if (har[k]) { const x = sum.get(RA[k].station) ?? { s: 0, n: 0 }; x.s += M[k] - H[k]; x.n++; sum.set(RA[k].station, x); }
    const y = new Map([...sum].filter(([, x]) => x.n >= MIN_PUNKTER).map(([id, x]) => [id, x.s / x.n]));
    const ym = [...y.values()].reduce((a, b) => a + b, 0) / y.size;
    const ysd = Math.sqrt([...y.values()].reduce((a, v) => a + (v - ym) ** 2, 0) / y.size);
    console.log(`\n═══ ${bnamn}: särarten = medel(mätt − ${bnamn === "LUFT" ? "MET Nordics luft" : "vädermodellen"}) — ${y.size} stationer, medel ${ym >= 0 ? "+" : ""}${ym.toFixed(2)} °C, sd ${ysd.toFixed(2)} °C ═══`);
    ut[bnamn] = {};
    for (const [mnamn, Xm] of [["VÄG", VAG], ["BAS", BAS]] as [string, number[][]][]) {
      const pr = korsvalidera(ids, Xm, y, reg), pl = korsvalidera(ids, Xm, y, (id) => id);
      const fr = forklarat(y, pr), fl = forklarat(y, pl);
      ut[bnamn][mnamn] = { region: fr.r2, loo: fl.r2 };
      skatt.set(`${bnamn}+${mnamn}`, pr);
      console.log(`  ${mnamn} regioner gömda: R² ${fr.r2.toFixed(3)} · MAE ${fr.mae.toFixed(2)} °C (utan modell ${fr.maeNoll.toFixed(2)}) på ${fr.n} · leave-one-out: R² ${fl.r2.toFixed(3)}`);
    }
    const tr = ids.map((_, i) => i).filter((i) => y.has(ids[i]));
    const f = ridge(tr.map((i) => VAG[i]), tr.map((i) => y.get(ids[i])!), RIDGE_LAMBDA);
    const mid = VAG[0].map((_, j) => tr.reduce((a, i) => a + VAG[i][j], 0) / tr.length);
    const sd = VAG[0].map((_, j) => Math.sqrt(tr.reduce((a, i) => a + (VAG[i][j] - mid[j]) ** 2, 0) / tr.length));
    console.log(`  effekt per standardavvikelse, VÄG (°C särart): ${VAG_NAMN.map((n, j) => { const a = [...mid]; a[j] += sd[j]; return `${n} ${(f(a) - f(mid)).toFixed(2)}`; }).join(" · ")}`);
    console.log(`  särarten per ÅDT-klass (Axel mot sin modell: under 1 000 −0,58 °C, över 20 000 +1,14 °C; C8 mot RÅ −0,10 / +0,20):`);
    for (const [namn, lo, hi] of ADT_KLASSER) {
      const v = [...y].filter(([id]) => { const a = vag.get(id)!.adt_fordon; return typeof a === "number" && a >= lo && a < hi; }).map(([, s]) => s);
      const m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
      console.log(`    ${namn.padEnd(13)} ${v.length} stationer · medel ${Number.isFinite(m) ? (m >= 0 ? "+" : "") + m.toFixed(2) + " °C" : "—"}`);
    }
  }

  // Kandidaterna på samma punkter.
  console.log(`\n═══ Kandidaterna mot RÅ och OFFSET på samma ${nHar} punkter (bandet = RÅ:s närmaste ankare) ═══`);
  const skriv = (namn: string, P: Float64Array) => {
    const r = matt(M, P, ANK, har);
    console.log(`  ${namn}: ${radM(r.tot)}`);
    BANDS.forEach(([b], i) => console.log(`      ${b.padEnd(8)} ${radM(r.band[i])}`));
  };
  const plus = (H: Float64Array, s: Map<string, number>) => { const P = new Float64Array(N); for (let k = 0; k < N; k++) if (har[k]) P[k] = H[k] + (s.get(RA[k].station) ?? 0); return P; };
  skriv("RÅ", PRA);
  skriv("LUFT", LUFT);
  skriv("LUFT+VÄG", plus(LUFT, skatt.get("LUFT+VÄG")!));
  skriv("VÄDER", VADER);
  skriv("VÄDER+VÄG", plus(VADER, skatt.get("VÄDER+VÄG")!));
  skriv("VÄDER+BAS", plus(VADER, skatt.get("VÄDER+BAS")!));
  skriv("OFFSET (taket)", POFF);
  return ut;
}

/** Läser releasens CSV till Vader. Okända stationer läggs till; varje värde hamnar på sin timme. */
export async function lasVader(fil: string): Promise<{ vader: Vader; rader: number }> {
  const vader: Vader = new Map();
  const rl = createInterface({ input: createReadStream(fil).pipe(createGunzip()), crlfDelay: Infinity });
  let rubrik: string[] | null = null, rader = 0;
  for await (const rad of rl) {
    const c = rad.split(",");
    if (!rubrik) { rubrik = c; if (rubrik.join(",") !== ["station_id", "tid_utc", ...FALT].join(",")) throw new Error(`oväntad rubrik: ${rad}`); continue; }
    const i = Date.parse(c[1]) / 3_600_000 - T0;
    if (!Number.isInteger(i) || i < 0 || i >= NT) throw new Error(`timme utanför releasen: ${c[1]}`);
    let v = vader.get(c[0]);
    if (!v) { v = FALT.map(() => new Float32Array(NT).fill(NaN)); vader.set(c[0], v); }
    for (let j = 0; j < FALT.length; j++) v[j][i] = c[j + 2] === "" ? NaN : Number(c[j + 2]);
    rader++;
  }
  return { vader, rader };
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  let seed = 11; const slump = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  // Timindexet: hinken läser analysen vid sin början.
  const h0 = (Date.parse("2024-11-01T06:00:00Z") / 1000) / BUCKET_S;
  k(timIndex(h0) === 30 && timIndex(h0 + 1) === 30 && timIndex(h0 + 2) === 31, "timindexet: 06:00 och 06:30 läser 06-analysen");
  k(NT === (Date.parse("2025-04-01T00:00:00Z") / 3_600_000 - T0), "NT = timmarna 31/10 – 31/3");
  // Lösaren och måtten mot grind A:s stats().
  const b = los([[2, 1], [1, 3]], [3, 5]);
  k(Math.abs(b[0] - 0.8) < 1e-9 && Math.abs(b[1] - 1.4) < 1e-9, "lösaren");
  const ev: Eval[] = [[-1, 0.5, 3], [0, 2.5, 9], [3, -0.5, 18], [-6, -3, 25], [1, 1, 12], [-0.5, 1.5, 4], [-0.2, 2.4, 6]].map(([m, pr, a], i) => ({ measured: m, pred: pr, ankKm: a, station: "s", t: i, spridning: 1, ankare: 2 }));
  const r = matt(Float64Array.from(ev.map((e) => e.measured)), Float64Array.from(ev.map((e) => e.pred)), Float64Array.from(ev.map((e) => e.ankKm)), new Uint8Array(7).fill(1));
  const g = stats(ev);
  k(r.tot.n === g.n && Math.abs(r.tot.mae - g.mae) < 1e-12 && r.tot.gross === g.gross && r.tot.freeze === g.freeze, "måtten = grind A:s stats()");
  // Regionen gömd i vädermodellen: region "B" går 10 °C varmare än luften, "A" och "C" följer luften. B:s punkter förutsägs av A
  // och C, så resten blir ≈ +10; tränas modellen också på B krymper resten — läckaget vakten finns för.
  { const n = 300, XFr = new Float64Array(n * 7), Mr = new Float64Array(n), hr = new Uint8Array(n).fill(1), rr: string[] = [];
    for (let k = 0; k < n; k++) { const l = -5 + 10 * slump(); XFr.set([l, 0.5 + 0.5 * slump(), 5 * slump(), slump(), slump(), 300 * slump(), 50 * slump()], k * 7);
      const r = ["A", "B", "C"][k % 3]; rr.push(r); Mr[k] = l + (r === "B" ? 10 : 0) + 0.1 * (slump() - 0.5); }
    const { pred } = vaderRegionGomd(XFr, Mr, hr, rr);
    let s = 0, c = 0; for (let k = 0; k < n; k++) if (rr[k] === "B") { s += Mr[k] - pred[k]; c++; }
    k(Math.abs(s / c - 10) < 0.5, `vädermodellen med regionen gömd: B:s rest ${(s / c).toFixed(2)} °C, väntat ≈ 10`); }
  // Spannkontrollen fäller utanför.
  const vk: Vader = new Map([["a", FALT.map((_, j) => new Float32Array(2).fill([0.5, 0.9, 3, 0.5, 0, 1e6, 0][j]))]]);
  k(spannkontroll(vk).fel.length === 0, "spannen håller för rimliga värden");
  vk.get("a")![0][0] = 99; k(spannkontroll(vk).fel.length === 1, "spannkontrollen fäller luft 99 °C");
  // Hela läsningen på syntetiska stationer: ytan = luft + 0,9·(log ÅDT − 3,5) + brus. VÄG ska hitta särarten mot LUFT.
  const pos = new Map<string, Pos>(), vag = new Map<string, VagRad>(), vader: Vader = new Map(), RA: Eval[] = [];
  const t0 = (T0 * 3600) / BUCKET_S;   // första hinken
  for (let s = 0; s < 120; s++) {
    const id = `s${s}`, adt = Math.round(10 ** (2 + 2.7 * slump()));
    pos.set(id, { lat: 55.5 + 12 * slump(), lon: 12 + 11 * slump() });
    vag.set(id, { id, adt_fordon: adt, adt_lastbilar: Math.round(adt * 0.1), adt_latta_22_06: Math.round(adt * 0.05), klass: 2, hastighet_kmh: 80, bredd_m: 8, slitlager: "belagd", vaghallare: "statlig" });
    const v = FALT.map(() => new Float32Array(NT).fill(NaN)); vader.set(id, v);
    const sar = 0.9 * (Math.log10(adt) - 3.5);
    for (let t = 0; t < 240; t += 2) {
      const i = timIndex(t0 + t), luft = -6 + 8 * slump();
      v[0][i] = luft; v[1][i] = 0.7 + 0.3 * slump(); v[2][i] = 1 + 6 * slump(); v[3][i] = slump(); v[4][i] = slump() < 0.2 ? 2 * slump() : 0;
      v[5][i] = 8e5 + 3e5 * slump(); v[6][i] = 1e5 * slump();
      RA.push({ measured: luft + sar + 0.2 * (slump() - 0.5), pred: luft, ankKm: 3 + 30 * slump(), station: id, t: t0 + t, spridning: 1, ankare: 3 });
    }
  }
  const OFF = RA.map((e) => ({ ...e, pred: e.measured - 0.1 }));
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  let u: ReturnType<typeof motVadret>;
  try { u = motVadret(RA, OFF, pos, vag, vader); } finally { console.log = orig; }
  k(u!.LUFT.VÄG.region > 0.9, `VÄG hittar särarten mot LUFT (R² ${u!.LUFT.VÄG.region.toFixed(3)})`);
  k(u!.LUFT.BAS.region < 0.3, `BAS hittar den inte (R² ${u!.LUFT.BAS.region.toFixed(3)})`);
  k(!skrivet.some((s) => s.includes("NaN")), "utskriften utan NaN");
  k(skrivet.some((s) => s.startsWith("  VÄDER+VÄG:")) && skrivet.some((s) => s.startsWith("  OFFSET (taket):")), "utskriften når kandidaterna");
  // Radlikheten: OFFSET i annan ordning än RÅ fäller.
  let kastade = false; try { motVadret(RA, [...OFF].reverse(), pos, vag, vader); } catch { kastade = true; }
  k(kastade, "RÅ och OFFSET i olika ordning fäller");
  console.log("✓ självtest: timindexet, lösaren, måtten mot grind A, spannkontrollen, hela läsningen på syntetiska stationer, radlikheten");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const fil = process.env.METNORDIC ?? "metnordic/metnordic_2024-25.csv.gz";
  const t0 = performance.now();
  const min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("C8 MOT VÄDRET (kort #298, DECISIONS #480): vägdatan mot en väderbaslinje ur MET Nordic, vintern 2024/25. Ingen dom.");
  const { vader, rader } = await lasVader(fil);
  console.log(`  MET Nordic: ${rader} rader, ${vader.size} stationer ur ${fil} (${min()})`);
  const sk = spannkontroll(vader);
  for (const r of sk.rader) console.log(`  värdevakten ${r}`);
  if (sk.fel.length) { console.error(`VÄRDEVAKTEN FÄLLER: ${sk.fel.join("; ")}`); process.exit(1); }

  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #480)"); process.exit(1); }
  const res = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`);
  await db.end();
  const stations = new Map<string, Station>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()})`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  const { readFileSync } = await import("node:fs");
  const vagfil = JSON.parse(readFileSync(new URL("../../data/vagdata/stationer.json", import.meta.url), "utf8"));
  const vag = new Map<string, VagRad>((vagfil.rader as VagRad[]).map((r) => [String(r.id), r]));
  const pos = new Map<string, Pos>([...stations].map(([id, s]) => [id, { lat: s.lat, lon: s.lon }]));
  const RA = evaluate(stations, { utanOffset: true }), OFF = evaluate(stations);
  console.log(`  RÅ ${RA.length} punkter (${min()}) — kontroll mot C8 (4 353 206 punkter, grova 7,5 %): grova ${pct(stats(RA).gross)}`);
  motVadret(RA, OFF, pos, vag, vader);
  console.log(`\nKlart (${min()}). Ingen dom: MET Nordic är inte Axels modell; läsningen är underlag (DECISIONS #480).`);
}
