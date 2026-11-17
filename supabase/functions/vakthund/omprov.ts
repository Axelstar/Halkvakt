// Omprovet av hinkens kontrollsumma (DECISIONS #889, larmet 17/11 i ärende #1647).
//
// Vid varje publicering byter CDN ut manifest.json och live.json omkring en sekund isär. Mätt 17/11 med en hämtning i sekunden:
// manifestet bytte 06.22.46 UTC och live.json 06.22.47. En hämtning av båda i just den sekunden ser ett manifest som inte stämmer med
// filen, fast kedjan är hel. Vakthunden kör en gång i timmen och hamnar där omkring en gång på hundra: tre larm på omkring 290
// körningar (5/11, 7/11 och 17/11), alla stängda av nästa körning. Appen råkar ut för samma sak, behåller förra filen och hämtar igen.
//
// Därför prövas kontrollsumman om innan vakthunden larmar. Ett verkligt fel, som 8/9 när manifestet inte skrevs alls, står kvar genom
// omproven och larmar som förut. Raden i mätvärdena säger hur många omprov som behövdes, så att glappet går att följa över tid.

/** Högst så här många omprov efter ett första prov som inte stämde. */
export const OMPROV_MAX = 2;
/** Sekunder mellan proven. Glappet är omkring en sekund, så fem är gott och väl. */
export const OMPROV_S = 5;

/** Kör `prov`, och gör om det medan `stammer` säger nej, högst `max` gånger med `vanta` emellan. Ger det sista svaret och antalet
 *  omprov. Ett första prov som stämmer väntar aldrig. */
export async function medOmprov<T>(prov: () => Promise<T>, stammer: (svar: T) => boolean, vanta: () => Promise<void>,
  max: number = OMPROV_MAX): Promise<{ svar: T; omprov: number }> {
  let svar = await prov();
  let omprov = 0;
  while (!stammer(svar) && omprov < max) {
    await vanta();
    omprov++;
    svar = await prov();
  }
  return { svar, omprov };
}

/** Radens ord om kontrollsumman: stämde den direkt, efter omprov, eller inte alls. */
export const shaOrd = (lika: boolean, omprov: number): string =>
  !lika ? "MISMATCH" : omprov === 0 ? "stämmer" : `stämmer efter ${omprov} omprov`;
