// MARGINALVAKTEN — delad av varje grind i huset (TROSKLAR-SKUGGAN §3, DECISIONS #126/#128).
//
// LUCKAN DEN STÄNGER. Varje grind vi skrivit har en UNDERLAGSVAKT — minst så här många punkter,
// stationer, händelser — men fram till 12/9 vaktade ingen MARGINALEN. Därför läste ett "FALLER"
// på två raders marginal exakt likadant som ett "FALLER" på tvåhundra raders, och de två
// påståendena är inte samma sak. Grind A visade det skarpt: A1 stod på 1,06 °C mot tröskeln 1,0
// och rapporterades som en fallning — osäkerheten var 0,09, alltså omslöt intervallet tröskeln.
// Måttet hade aldrig fallit (DECISIONS #127).
//
// REGELN: ligger utfallet inom ±1,96 standardfel från tröskeln är frågan OAVGJORD — varken
// klarad eller fälld.
//
// VAKTEN ÄR ENSIDIG, OCH DET ÄR HELA POÄNGEN. Mätpunkterna är nästan aldrig oberoende — samma
// stationer, intilliggande halvtimmar, samma väderlägen — så formlerna nedan ger en UNDRE gräns
// för osäkerheten. Ligger utfallet INOM intervallet är frågan därmed säkert oavgjord. Ligger det
// UTANFÖR är den INTE därmed avgjord; vakten är minimikravet, inte ett tillräckligt bevis. Ett
// tal som passerar har inte fått ett kvalitetsintyg, bara klarat den lägsta ribban.
//
// DEN KAN ALDRIG ÖPPNA EN STÄNGD GRIND. Ett KLARAR inom bruset blir OAVGJORT (skärpning), ett
// FALLER inom bruset blir OAVGJORT (mät vidare). En grind öppnar bara på KLARAR.

export const Z = 1.96; // 95 %

/** Binomialfel för en andel. n = antal observationer bakom andelen. */
export function andelSe(p: number, n: number): number {
  return n > 0 ? Math.sqrt(Math.max(p * (1 - p), 0) / n) : Infinity;
}

/** Medelvärdets fel, ur värdena själva. Färre än två värden ⇒ aldrig skiljbart. */
export function medelSe(varden: number[]): number {
  const n = varden.length;
  if (n < 2) return Infinity;
  const m = varden.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(varden.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1) / n);
}

/** Går utfallet att skilja från tröskeln vid det här underlaget? */
export function skiljbar(varde: number, troskel: number, se: number): boolean {
  return Number.isFinite(se) && Math.abs(varde - troskel) > Z * se;
}

/** KVOTER (t.ex. W-A:s "högsta bandet ≥ 1,5 × det lägsta") får INTE binomialfel — en kvot av två
 *  frekvenser har sin osäkerhet i LOGARITMEN, och den domineras av det minsta antalet händelser.
 *  Poissonapproximationen SE(ln kvot) ≈ √(1/a + 1/b) är standard och kräver inget mer än
 *  händelsetalen. Noll händelser i endera ledet ⇒ aldrig skiljbart, vilket är rätt svar. */
export function skiljbarKvot(kvot: number, troskel: number, aHandelser: number, bHandelser: number): boolean {
  if (!(aHandelser > 0 && bHandelser > 0 && kvot > 0 && troskel > 0)) return false;
  const seLog = Math.sqrt(1 / aHandelser + 1 / bHandelser);
  return Math.abs(Math.log(kvot) - Math.log(troskel)) > Z * seLog;
}

export type Utfall = "KLARAR" | "FALLER" | "OAVGJORT";

/** Utfallet för ett mått med TAK (utfallet ska vara ≤ tröskeln). */
export function utfallTak(varde: number, troskel: number, se: number): Utfall {
  if (!skiljbar(varde, troskel, se)) return "OAVGJORT";
  return varde <= troskel ? "KLARAR" : "FALLER";
}

/** Utfallet för ett mått med GOLV (utfallet ska vara ≥ tröskeln). */
export function utfallGolv(varde: number, troskel: number, se: number): Utfall {
  if (!skiljbar(varde, troskel, se)) return "OAVGJORT";
  return varde >= troskel ? "KLARAR" : "FALLER";
}

/** Sammanvägning: en avgörande fallning räcker för att fälla grinden, även om ett annat mått
 *  är oavgjort. Är inget fällt men något oavgjort går ingen dom att läsa av. */
export function grindutfall(matt: Utfall[]): Utfall {
  if (matt.includes("FALLER")) return "FALLER";
  if (matt.includes("OAVGJORT")) return "OAVGJORT";
  return "KLARAR";
}

/** ±1,96 SE i procentenheter, för utskrift bredvid talet. */
export function marginalPe(se: number): string {
  return Number.isFinite(se) ? ` ±${(Z * se * 100).toFixed(1)} pe` : "";
}
