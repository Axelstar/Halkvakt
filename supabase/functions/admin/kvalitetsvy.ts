// admin, kvalitetstavlan (kort #682, DECISIONS #973): räknar sidan Kvalitet på admin.halkvakt.se ur tabellen kvalitet_dag (sql/147).
// Reglerna står i docs/TROSKLAR-KVALITETSTAVLAN.md: måtten §6, indelningen och osäkerheten §7 och gränserna §8. Ren kod utan databas,
// så att testet (test/kvalitetstavlan-vy.test.ts) kan köra den; kvalitet.ts läser raderna och anropar kvalitetVy.
import { isoVecka } from "../olycksfacit/vyn.ts";

export interface KvRad { dag: string; lager: string; kalla: string; matt: string; n: number; k: number }
export type Farg = "gron" | "gul" | "rod" | null;
export interface Cell { n: number; k: number; varde: number | null; lo: number | null; hi: number | null; farg: Farg; osakert: boolean; motJ1?: boolean }
export interface Risk { nV: number; kV: number; nU: number; kU: number; varde: number | null; lo: number | null; hi: number | null; farg: Farg; osakert: boolean }
export interface Period {
  id: string; namn: string; fran: string; till: string; dygn: number;
  tackning: Record<string, Record<string, Cell>>;   // lager → källa (FR, VL)
  traff: Record<string, Record<string, Cell>>;      // lager → källa (FR, VL, KA, ALLA)
  lyft: Record<string, Record<string, Cell>>;       // lager → källa (FR, VL)
  bas: Record<string, Cell>;                        // källa (FR, VL)
  samma: Cell | null;                               // A2 mot friktionen vid den varnande stationen (§5)
  risk: Record<string, Risk>;                       // lager
  oenig: Record<string, { n: number; k: number }>;  // FR: låg friktion med bar väg i bild; VL: halka i väglaget med god friktion
  v3: { n: number; k: number };                     // tystnadens bilder i den öppna halvan, och de med is, snö eller slask
  underlag: { versioner: number; stationsdygn: number; dygnUtanFil: number };
}
export interface KvVy { fran: string | null; till: string | null; perioder: Period[] }

export const LAGER = ["A1", "A2", "K", "R", "HV", "J1"];
// §7: en andel visas bara med minst 20 i nämnaren och den relativa risken bara med minst 20 singelolyckor under varning.
export const MINST = 20;
export const DRAGNINGAR = 1000;
// §8: gränserna. Färgen sätts efter punktskattningen; intervallet över två färger ger *osäkert*.
export const GRANSER = { tackning: [0.6, 0.8], lyft: [2, 4], risk: [1.5, 3] } as const;

export function farg(matt: keyof typeof GRANSER, x: number | null): Farg {
  if (x == null || !Number.isFinite(x)) return null;
  const [godkant, bra] = GRANSER[matt];
  return x >= bra ? "gron" : x >= godkant ? "gul" : "rod";
}

// Ett frö per period, så att samma rader ger samma intervall varje gång sidan öppnas.
function slump(fro: string) {
  let a = 2166136261;
  for (const c of fro) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kvantil = (v: number[], q: number) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), i = (s.length - 1) * q, l = Math.floor(i), h = Math.ceil(i);
  return s[l] + (s[h] - s[l]) * (i - l);
};

/** En period: summorna per nyckel, och intervallen bootstrappade per dygn (§7). */
export function period(id: string, namn: string, rader: KvRad[]): Period {
  const dagar = [...new Set(rader.map((r) => r.dag))].sort();
  const di = new Map(dagar.map((d, i) => [d, i]));
  const nycklar = [...new Set(rader.map((r) => `${r.lager}|${r.kalla}|${r.matt}`))];
  const ki = new Map(nycklar.map((x, i) => [x, i]));
  const D = dagar.length, K = nycklar.length;
  const N = new Float64Array(D * K), Kk = new Float64Array(D * K);
  for (const r of rader) { const j = di.get(r.dag)! * K + ki.get(`${r.lager}|${r.kalla}|${r.matt}`)!; N[j] += r.n; Kk[j] += r.k; }

  // Summorna för hela perioden, och för varje dragning av dygnen.
  const summa = (vikt: Float64Array) => {
    const n = new Float64Array(K), k = new Float64Array(K);
    for (let d = 0; d < D; d++) if (vikt[d]) for (let j = 0; j < K; j++) { n[j] += vikt[d] * N[d * K + j]; k[j] += vikt[d] * Kk[d * K + j]; }
    return { n, k };
  };
  const ett = new Float64Array(D).fill(1);
  const hel = summa(ett);
  const r = slump(id), drag: { n: Float64Array; k: Float64Array }[] = [];
  if (D > 1) for (let b = 0; b < DRAGNINGAR; b++) {
    const vikt = new Float64Array(D);
    for (let d = 0; d < D; d++) vikt[Math.floor(r() * D)]++;
    drag.push(summa(vikt));
  }
  const nk = (s: { n: Float64Array; k: Float64Array }, x: string) => { const j = ki.get(x); return j == null ? { n: 0, k: 0 } : { n: s.n[j], k: s.k[j] }; };
  const andel = (s: { n: Float64Array; k: Float64Array }, x: string) => { const v = nk(s, x); return v.n > 0 ? v.k / v.n : null; };
  const intervall = (f: (s: { n: Float64Array; k: Float64Array }) => number | null) => {
    const v = drag.map(f).filter((x): x is number => x != null && Number.isFinite(x));
    return { lo: kvantil(v, 0.025), hi: kvantil(v, 0.975) };
  };
  const cell = (x: string, matt: keyof typeof GRANSER | null): Cell => {
    const { n, k } = nk(hel, x);
    if (n < MINST) return { n, k, varde: null, lo: null, hi: null, farg: null, osakert: false };
    const { lo, hi } = intervall((s) => andel(s, x));
    const f = matt ? farg(matt, k / n) : null;
    return { n, k, varde: k / n, lo, hi, farg: f, osakert: !!f && D > 1 && farg(matt!, lo) !== farg(matt!, hi) };
  };

  const tackning: Period["tackning"] = {}, traff: Period["traff"] = {}, lyft: Period["lyft"] = {};
  for (const L of LAGER) {
    // §8: bara raden Halkvakt får färg i täckningen. Inget lager ska täcka allt ensamt.
    tackning[L] = { FR: cell(`${L}|FR|tackning`, L === "HV" ? "tackning" : null), VL: cell(`${L}|VL|tackning`, L === "HV" ? "tackning" : null) };
    traff[L] = { FR: cell(`${L}|FR|traff`, null), VL: cell(`${L}|VL|traff`, null), KA: cell(`${L}|KA|traff`, null), ALLA: cell(`${L}|ALLA|traff`, null) };
  }
  const bas: Period["bas"] = { FR: cell("-|FR|bas", null), VL: cell("-|VL|bas", null) };
  // Lyftet (§6): träffsäkerheten delad med källans bas, med båda dragna ur samma dygn.
  for (const L of LAGER) {
    lyft[L] = {};
    for (const Q of ["FR", "VL"]) {
      const t = traff[L][Q], b = bas[Q];
      if (t.varde == null || b.varde == null || b.varde === 0) { lyft[L][Q] = { n: t.n, k: t.k, varde: null, lo: null, hi: null, farg: null, osakert: false }; continue; }
      const v = t.varde / b.varde;
      const { lo, hi } = intervall((s) => { const a = andel(s, `${L}|${Q}|traff`), c = andel(s, `-|${Q}|bas`); return a == null || !c ? null : a / c; });
      // J1 är jämförelsen, inget lager: den får ingen färg.
      const f = L === "J1" ? null : farg("lyft", v);
      lyft[L][Q] = { n: t.n, k: t.k, varde: v, lo, hi, farg: f, osakert: !!f && D > 1 && farg("lyft", lo) !== farg("lyft", hi) };
    }
  }
  // §8 mot snöflingan: ett lager med lägre lyft än J1 för samma källa blir rött, oavsett lyftets egen färg.
  for (const L of LAGER) if (L !== "J1") for (const Q of ["FR", "VL"]) {
    const c = lyft[L][Q], j = lyft.J1[Q];
    if (c.varde != null && j.varde != null && c.varde < j.varde) { c.farg = "rod"; c.motJ1 = true; c.osakert = false; }
  }
  const risk: Period["risk"] = {};
  for (const L of LAGER) {
    const v = nk(hel, `${L}|OL|risk_varn`), u = nk(hel, `${L}|OL|risk_utan`);
    const rr = (s: { n: Float64Array; k: Float64Array }) => {
      const a = nk(s, `${L}|OL|risk_varn`), b = nk(s, `${L}|OL|risk_utan`);
      return a.n > 0 && b.n > 0 && b.k > 0 ? (a.k / a.n) / (b.k / b.n) : null;
    };
    const varde = v.k >= MINST ? rr(hel) : null;
    const { lo, hi } = varde == null ? { lo: null, hi: null } : intervall(rr);
    const f = L === "J1" ? null : farg("risk", varde);
    risk[L] = { nV: v.n, kV: v.k, nU: u.n, kU: u.k, varde, lo, hi, farg: f, osakert: !!f && D > 1 && farg("risk", lo) !== farg("risk", hi) };
  }
  const sammaC = cell("A2|FR|traff_samma", null);
  const jLF = ki.get("-|LF|underlag");
  const utanFil = jLF == null ? D : dagar.filter((_, d) => !N[d * K + jLF]).length;
  return {
    id, namn, fran: dagar[0] ?? "", till: dagar[D - 1] ?? "", dygn: D,
    tackning, traff, lyft, bas, samma: sammaC.n ? sammaC : null, risk,
    oenig: { FR: nk(hel, "-|FR|oenig"), VL: nk(hel, "-|VL|oenig") },
    v3: nk(hel, "-|KA|v3"),
    underlag: { versioner: nk(hel, "-|LF|underlag").n, stationsdygn: nk(hel, "-|FR|underlag").n, dygnUtanFil: utanFil },
  };
}

const plus = (dag: string, d: number) => new Date(Date.parse(dag + "T00:00:00Z") + d * 86_400_000).toISOString().slice(0, 10);

/** Säsongen, de senaste sju dygnen och varje vecka, den senaste först. */
export function kvalitetVy(rader: KvRad[]): KvVy {
  const dagar = [...new Set(rader.map((r) => r.dag))].sort();
  if (!dagar.length) return { fran: null, till: null, perioder: [] };
  const till = dagar[dagar.length - 1], fran7 = plus(till, -6);
  const perioder = [period("sasong", "Säsongen", rader), period("7d", "Senaste 7 dygnen", rader.filter((r) => r.dag >= fran7))];
  const veckor = [...new Set(dagar.map(isoVecka))].sort().reverse();
  for (const v of veckor) perioder.push(period(v, "Vecka " + Number(v.slice(6)), rader.filter((r) => isoVecka(r.dag) === v)));
  return { fran: dagar[0], till, perioder };
}
