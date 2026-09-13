// TRENDEN — delad kärna för kort #88 (TROSKLAR-TRENDEN §2 och §3).
//
// VARFÖR MODULEN FINNS. Svepet och givarvakterna satt i `scripts/grind-t-a.ts` och behövdes av
// trendarkivet (#88 steg 2). En andra kopia hade fött precis den drift kontraktsgrinden finns
// emot — och värre än en siffra på drift: T-A dömer med en uppsättning trösklar och arkivet
// sparar kandidater med en annan, så domen och underlaget slutar handla om samma sak.
// EN källa, importerad av båda.
//
// Trösklarna ändras BARA i TROSKLAR-TRENDEN §2, och därefter här. Aldrig på anropsstället.
//
// Konstanterna exporteras med `export` (de var lokala i T-A) — i övrigt ordagrant flyttade.

// ── Svepet, ordagrant ur TROSKLAR-TRENDEN §2. Ändras BARA där, aldrig här.
export const FONSTER = [15, 30, 60];                  // minuter
export const LUTNING = [0.4, 0.6, 0.8, 1.2];          // °C per fönster, fallande
export const DAGGGAP = [0, 0.5, 1.0, 2.0];            // yta − dagg ≤ detta
export const STARTBAND: [number, number][] = [[1, 3], [1, 4], [1, 6]];

export type Rad = {
  t: number;        // minuter sedan epok
  yta: number;
  dagg: number | null;
  rh: number | null;
  luft: number | null;
};

/** Givarvakterna ur §3, alla tre. En station som faller på någon ger INGET utfall — tystnad. */
export function rimlig(r: Rad): boolean {
  if (r.luft !== null && r.yta < r.luft - 12) return false;       // #75, yttemperaturen
  if (r.dagg === null) return false;                              // trenden behöver daggpunkten
  if (r.yta - r.dagg < -5) return false;                          // #46, daggpunktsgivaren
  if (r.rh !== null && r.rh < 90 && r.yta - r.dagg <= 0) return false; // #46:s korsgivare
  return true;
}

/** Lutning över fönstret som slutar vid index i, °C per fönster (positivt = fallande).
 *  null när trendens EGEN vakt fäller: < 3 mätningar i fönstret, eller ett givarhopp > 3 °C. */
export function lutning(rader: Rad[], i: number, fonsterMin: number): number | null {
  const slut = rader[i];
  const start = slut.t - fonsterMin;
  const f: Rad[] = [];
  for (let j = i; j >= 0 && rader[j].t >= start; j--) f.unshift(rader[j]);
  if (f.length < 3) return null;
  for (let j = 1; j < f.length; j++) if (Math.abs(f[j].yta - f[j - 1].yta) > 3) return null;
  // AVRUNDAT TILL TUSENDELS GRAD, och det är inte kosmetik. Mätvärdena har EN decimal, men
  // binär flyttal ger 4,8 − 4,4 = 0,39999999999999947 — under tröskeln 0,4, medan Postgres
  // räknar samma subtraktion exakt i numeric och får 0,4. Utan avrundningen väljer drifträkningen
  // och knappen olika rader på ren representation (uppmätt 13/9: 862 av 4 713 kandidater).
  // Tusendelen kan inte dölja en verklig skillnad i ett material med en decimal.
  return Math.round((f[0].yta - slut.yta) * 1000) / 1000;   // positivt när ytan FALLER
}

export type Param = { fonster: number; lut: number; gap: number; band: [number, number] };

/** Fyrar triggern någon gång under natten? Kräver att alla tre villkor håller SAMTIDIGT. */
export function fyrar(rader: Rad[], p: Param): boolean {
  for (let i = 0; i < rader.length; i++) {
    const r = rader[i];
    if (!rimlig(r)) continue;
    if (r.yta < p.band[0] || r.yta > p.band[1]) continue;
    if (r.dagg === null || r.yta - r.dagg > p.gap) continue;
    const l = lutning(rader, i, p.fonster);
    if (l !== null && l >= p.lut) return true;
  }
  return false;
}

/** Bredaste startbandet i svepet — supersetet varje kandidat måste ligga inom.
 *  Ligger ytan utanför detta kan INGEN parameterkombination fyra, och raden är inte kandidat. */
export const BREDASTE_BAND: [number, number] =
  [Math.min(...STARTBAND.map((b) => b[0])), Math.max(...STARTBAND.map((b) => b[1]))];

/** Minsta lutning i svepet. Under den fyrar ingen kombination heller. */
export const MINSTA_LUTNING = Math.min(...LUTNING);
