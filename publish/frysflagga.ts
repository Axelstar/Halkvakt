// Frysflaggan med tre marginaler (kort #270 g, DECISIONS #437). Ren räkning, inget I/O.
//
// Leave-one-out vid stationerna, som vägpunktsgrinden: varje station skattas ur sina grannar (scripts/hojd-prov.ts) och jämförs med
// sin egen mätta yta i samma halvtimme. Modellen säger *fryser* vid skattning ≤ K1 − K2, *fryser inte* vid skattning > K1 + K2 och
// *vet inte* däremellan (TROSKLAR-FRYSKLASSNINGEN §2). Flaggat är allt som inte är *fryser inte*. K1 är motorns och skuggans
// frysgräns (FRYS_C). Alla tre marginalerna redovisas och ingen väljs — ett val vore en kalibrering och följer regel D.
// Måttstocken K-A1–K-A5 läses bredvid, som läsning och inte som dom: K-A gäller offsetmodellen.
import { FRYS_C } from "../engine/src/segment.ts";

export const K2_MARGINALER = [0, 0.5, 1.0];
/** TROSKLAR-FRYSKLASSNINGEN §4, K-A1–K-A4. */
export const KA = { rattKlass: 0.95, farligaFel: 0.01, tackning: 0.70, punkter: 500, stationer: 20, frys: 100 };

export type Punkt = { measured: number; est: number; station: string };
export type Flaggtal = {
  n: number; stationer: number; frys: number; uttalar: number; rattKlass: number;
  farligaFel: number; flaggor: number; falskaFlaggor: number; klartFalska: number;
};

export function flaggtal(punkter: Punkt[], k2: number, k1 = FRYS_C): Flaggtal {
  const t: Flaggtal = { n: punkter.length, stationer: new Set(punkter.map((p) => p.station)).size, frys: 0, uttalar: 0,
    rattKlass: 0, farligaFel: 0, flaggor: 0, falskaFlaggor: 0, klartFalska: 0 };
  for (const p of punkter) {
    const fryser = p.measured <= k1, saFryser = p.est <= k1 - k2, saInte = p.est > k1 + k2;
    if (fryser) t.frys++;
    if (saFryser || saInte) { t.uttalar++; if (saFryser === fryser) t.rattKlass++; }
    if (fryser && saInte) t.farligaFel++;
    if (!saInte) { t.flaggor++; if (!fryser) { t.falskaFlaggor++; if (p.measured > k1 + 1) t.klartFalska++; } }
  }
  return t;
}

const pct = (x: number, n: number) => (n ? `${(100 * x / n).toFixed(1).replace(".", ",")} %` : "–");
/** Andelen med ±1,96 standardfel — marginalvakten (K-A5) läses av den som läser. */
const medSe = (x: number, n: number) => {
  if (!n) return "–";
  const p = x / n, se = Math.sqrt((p * (1 - p)) / n);
  return `${(100 * p).toFixed(1).replace(".", ",")} % ± ${(196 * se).toFixed(1).replace(".", ",")}`;
};

/** Tabellen per kandidat, marginal och band, alltid med antal. Raderna är text; skriptet skriver ut dem. */
export function skrivFrysflaggan<R extends { measured: number; ankKm: number; station: string }>(
  rader: R[], kandidater: { namn: string; pick: (r: R) => number | null }[], band: [string, number, number][]): string[] {
  const ut = [
    `\nFRYSFLAGGAN MED TRE MARGINALER (DECISIONS #437) — K1 = +${FRYS_C} °C, K2 = ${K2_MARGINALER.join(" · ")} °C; läsning, ingen dom`,
    `Måttstock (K-A, lånad): rätt klass ≥ ${KA.rattKlass * 100} % · farliga fel ≤ ${KA.farligaFel * 100} % · täckning ≥ ${KA.tackning * 100} % · ` +
      `underlag ≥ ${KA.punkter} punkter, ≥ ${KA.stationer} stationer, ≥ ${KA.frys} med uppmätt frys`,
  ];
  for (const k of kandidater) for (const k2 of K2_MARGINALER) {
    ut.push(`${k.namn}, K2 ${String(k2).replace(".", ",")}:`);
    for (const [namn, lo, hi] of [...band, ["alla", 0, Infinity] as [string, number, number]]) {
      const p = rader.filter((r) => r.ankKm >= lo && r.ankKm < hi && k.pick(r) !== null)
        .map((r) => ({ measured: r.measured, est: k.pick(r)!, station: r.station }));
      const t = flaggtal(p, k2);
      ut.push(`  ${namn.padEnd(9)} n ${t.n} (${t.stationer} st, frys ${t.frys}) · farliga fel ${pct(t.farligaFel, t.frys)} av frysningarna, ` +
        `${medSe(t.farligaFel, t.uttalar)} av uttalade · falska flaggor ${medSe(t.falskaFlaggor, t.flaggor)} av ${t.flaggor} ` +
        `(klart falska ${pct(t.klartFalska, t.flaggor)}) · rätt klass ${medSe(t.rattKlass, t.uttalar)} · täckning ${pct(t.uttalar, t.n)}`);
    }
  }
  return ut;
}
