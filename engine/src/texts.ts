// Spoken Swedish copy (PLAN §1 taxonomy). Phrasing rule, hard:
// segment sources may claim "på vägen framför dig"; point sources only "framöver".
import type { HazardKind, PointHazard } from "./types.ts";

/**
 * Which utterance of a serious accident this is (DECISIONS #28, "Olyckslyftet").
 *   "early"    — the first call, made far out while exits still remain. Carries the
 *                routing decision ("Överväg annan väg") because this is the only
 *                moment the driver can still act on it.
 *   "reminder" — the second call at close range, AFTER an early call was spoken.
 *                Short by design: the decision is already made, this is just speed.
 *   "late"     — close range with NO early call (driver joined the road inside the
 *                early horizon). Must still say WHAT it is — otherwise this driver
 *                gets strictly less information than one who came from further away.
 * Mild accidents and every other hazard kind ignore this.
 */
export type AccidentStep = "early" | "reminder" | "late";

/** " på E18" / " på väg 25" / "" — tomt när vägnumret saknas. */
export function roadPhrase(road?: string | null): string {
  const r = (road ?? "").trim();
  if (!r) return "";
  return /^[A-Za-zÅÄÖåäö]/.test(r) ? ` på ${r}` : ` på väg ${r}`;
}

export function alertText(
  kind: HazardKind,
  distanceM: number,
  hazard?: PointHazard,
  step?: AccidentStep,
): string {
  switch (kind) {
    case "accident": {
      const km = Math.max(1, Math.round(distanceM / 1000));
      // VAR, inte bara hur långt (Bengt+Axel 2/9). "E18" läses "E arton" av talsyntesen,
      // men ett blott nummer blir "olycka på 25" — därför "väg 25" när numret saknar bokstav.
      const on = roadPhrase(hazard?.meta?.road);
      switch (step) {
        case "early": {
          const clearedAt = hazard?.meta?.endTimeLocal;
          const base =
            `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan på trafiken. ` +
            `Överväg annan väg.`;
          return clearedAt ? `${base} Beräknas röjd vid ${clearedAt}.` : base;
        }
        case "reminder":
          return "Sakta ner — olycksplats strax framför dig.";
        case "late":
          return `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan. Sakta ner.`;
        default:
          return `Olycka rapporterad${on} ${km} kilometer framför dig.`;
      }
    }
    case "slippery_segment":
      return "Varning: halka rapporterad på vägen framför dig.";
    case "icing_point":
      if (hazard?.meta?.bridge) {
        // Bridge (#38): say WHAT and roughly WHERE — the driver looks for the bridge.
        const m = Math.max(100, Math.round(distanceM / 100) * 100);
        return `Frysrisk framöver — bro om ${m} meter.`;
      }
      return "Isrisk framöver — vägbanan nära noll grader.";
    case "wildlife":
      return "Viltrisk — vanlig olycksplats för älg den här tiden.";
    case "camera": {
      const limit = hazard?.meta?.speedLimitKmh;
      return limit != null
        ? `Fartkamera om 500 meter. Gränsen är ${limit}.`
        : "Fartkamera om 500 meter.";
    }
  }
}
