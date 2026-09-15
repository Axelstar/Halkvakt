// TRENDENS KANDIDATURVAL — ren, testbar kärna till kort #88 steg 2.
//
// EN KANDIDAT är ett stationsögonblick där NÅGON kombination i §2:s svep skulle kunna fyra.
// Urvalet är därför ett SUPERSET av triggern, och det är hela poängen: sparas för lite går domen
// inte att göra i efterhand, och då har gallringen tagit höstens frostnätter för gott.
//
// SUPERSETINVARIANTEN, låst med prov: fyrar någon kombination på en rad så ÄR raden kandidat.
// Blir det någonsin falskt sparar arkivet bort just de rader T-B behöver, och tyst.

import { rimlig, lutning, FONSTER, BREDASTE_BAND, MINSTA_LUTNING, type Rad } from "./trenden.ts";

export type Kandidat = {
  rad: Rad;
  lutningar: (number | null)[];   // en per fönster i FONSTER, samma ordning
  gap: number | null;
};

/** Är raden vid index i en kandidat? Superset av triggern, aldrig snävare. */
export function arKandidat(rader: Rad[], i: number): Kandidat | null {
  const r = rader[i];
  // Givarvakterna först — en rad vi inte litar på får inte bära ett utfall (§3).
  if (!rimlig(r)) return null;
  // Utanför bredaste startbandet kan ingen kombination fyra.
  if (r.yta < BREDASTE_BAND[0] || r.yta > BREDASTE_BAND[1]) return null;
  const lutningar = FONSTER.map((f) => lutning(rader, i, f));
  // Når ingen lutning svepets lägsta steg fyrar ingen kombination heller.
  if (!lutningar.some((l) => l !== null && l >= MINSTA_LUTNING)) return null;
  // Avrundat som lutningen (trenden.ts, flyttalsläxan 13/9): 4,8 − 4,4 är 0,39999999999999947 i
  // binärt och 0,4 i numeric, och dagg_gap_c ska bära en tröskel (S2). Tre decimaler, en mer än mätvärdet.
  return { rad: r, lutningar, gap: r.dagg === null ? null : Math.round((r.yta - r.dagg) * 1000) / 1000 };
}

/** Utfallet: lägsta yta inom fönstret efter ögonblicket, och hur många rader det vilar på.
 *  Noll rader är OKÄNT, aldrig "det blev inte kallare" — samma regel som radarns frånvaro. */
export function utfall(rader: Rad[], i: number, minuter = 90): { min: number | null; n: number } {
  const slut = rader[i].t + minuter;
  let min: number | null = null, n = 0;
  for (let j = i + 1; j < rader.length && rader[j].t <= slut; j++) {
    n++;
    if (min === null || rader[j].yta < min) min = rader[j].yta;
  }
  return { min, n };
}
