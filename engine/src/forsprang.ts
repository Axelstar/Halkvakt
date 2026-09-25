// Allvar som försprång (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md, DECISIONS #359). Ren logik, inget I/O.
//
// Rösten säger samma ord, tidigare — aldrig andra ord, aldrig högre prioritet (Axel, kartan §13.1; #90 roll B; E1). Försprånget
// utlöser ingenting: det ändrar bara NÄR en varning sägs som redan utlöses av sin egen mätning (tröskelregeln T3/T6).
// Bara skuggmotorn använder modulen i vinter. Portarna (Kotlin, Swift) får den först vid steg 7, efter domen i mars.
import type { Hazard } from "./types.ts";

/** §3: nivå 2 prövas med tre försprång i sekunder, klämda av motorn till leadMinM–leadMaxM. Nivå 1 behåller dagens 30 s. */
export const FORSPRANG_SVEP_S = [45, 60, 90] as const;
/** §2: A1 halt väglag — Trafikverkets väglagskod 3 eller 4 (mycket besvärligt / is- och snövägbana). Uppräknade, aldrig ">= 3". */
export const A1_NIVA2_KODER: readonly number[] = [3, 4];
/** §2: A2 frysrisk — ytan ≤ 0 °C (= K1_GRANS[0] i publish/tillstand.ts)… */
export const A2_NIVA2_YTA_C = 0;
/** …och stationen blöt inom 2 h: väta ≥ 3 av 4 i N_SVEP (weather[].bevis.vata, DECISIONS #342). */
export const A2_NIVA2_VATA = 3;

export type ForsprangNiva = 1 | 2;

/** Nivån per fara (§2). null = faran ingår inte (olyckor, kameror, vilt). `vata` är weather[].bevis.vata per `wx:`-id; broarna
 *  saknar stationens id i snapshoten och står därför på nivå 1. */
export function forsprangNiva(h: Hazard, vata: Map<string, number>): ForsprangNiva | null {
  if (h.kind === "slippery_segment") {
    const kod = h.meta?.code;
    return typeof kod === "number" && A1_NIVA2_KODER.includes(kod) ? 2 : 1;
  }
  if (h.kind === "icing_point") {
    const yta = h.meta?.surfaceTempC;
    const v = vata.get(h.id);
    return typeof yta === "number" && yta <= A2_NIVA2_YTA_C && typeof v === "number" && v >= A2_NIVA2_VATA ? 2 : 1;
  }
  return null;
}

/** Kroken till motorn (AlertEngine.leadFor): nivå 2 får svepvärdets försprång, allt annat dagens. Motorn klämmer svaret. */
export function forsprangKrok(nivaer: Map<string, ForsprangNiva>, svepS: number) {
  return (h: Hazard, leadM: number, speedMps: number): number => (nivaer.get(h.id) === 2 ? speedMps * svepS : leadM);
}
