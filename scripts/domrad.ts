// Domraden (DECISIONS #649): varje grind skriver sitt utfall på EN rad i samma form, så att domlarmet kan läsa den ur
// körningens utskrift. Raden ändrar ingen mätning; den säger bara det skriptet redan avgjort.
//   KLARAR / FALLER  grinden har fällt sin dom
//   LÄS              spärren har släppt och det finns ett utfall att läsa och bokföra (grindar där en människa fäller domslutet)
//   OAVGJORT         inom bruset eller underlaget räcker inte
//   SPÄRRAD          domspärren eller blindningen håller
export type Utfall = "KLARAR" | "FALLER" | "LÄS" | "OAVGJORT" | "SPÄRRAD";
export const DOMRAD_RE = /^DOMRAD: (.+?) · (KLARAR|FALLER|LÄS|OAVGJORT|SPÄRRAD) · (.*)$/u;

export function domrad(grind: string, utfall: Utfall, text: string): void {
  console.log(`DOMRAD: ${grind} · ${utfall} · ${text.replace(/\s+/gu, " ").trim()}`);
}
