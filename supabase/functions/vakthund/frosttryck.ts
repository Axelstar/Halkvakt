// Frostgrindarnas omtryckning (kort #252, DECISIONS #352). Ren logik, utan Deno eller nätverk, så att den prövas i
// test/frosttryck.test.ts.
//
// Före 25/9 tryckte vakthunden de fem frostflödena EN gång, i samma ögonblick som frostlarmet skapades — ofta mitt i den
// första frostnatten. Grindarna kräver veckor av frost (T-A 30 frostnätter, K-C1 en vintermånad, R-C1 15 frostdygn), och
// ingen av dem ligger på pulsklockan, så efter första körningen stod de stilla. Nu: kl 09 UTC, efter morgonen så att T-A
// ser hela natten, ett dygn då frosten når vakthundens tröskel, och högst en gång per sju dygn. Frosten upphör ⇒
// tryckningarna upphör av sig själva.

/** Tryckningens timme i UTC. Vakthunden går :07 varje timme, så 09:07 UTC — efter den lokala morgonen året runt. */
export const TRYCK_TIMME_UTC = 9;
/** Högst en tryckning per så många dygn. */
export const TRYCK_INTERVALL_D = 7;
/** Varvet kan landa några sekunder före förra veckans klockslag; två timmars slack gör att veckan inte hoppas över. */
const SLACK_MS = 2 * 3600_000;
/** Markören som gör en kommentar (eller issuens kropp) till en tryckning — den senaste är klockan som räknar dygnen. */
export const FROSTTRYCK_MARK = "<!-- frosttryck -->";

/** Ska frostflödena tryckas nu? `senast` är förra tryckningen (null = aldrig). Frostvillkoret prövas av anroparen. */
export function skaTrycka(nu: Date, senast: Date | null): boolean {
  if (nu.getUTCHours() !== TRYCK_TIMME_UTC) return false;
  return senast === null || nu.getTime() - senast.getTime() >= TRYCK_INTERVALL_D * 86_400_000 - SLACK_MS;
}

/** Förra tryckningen: den senaste av issuens kropp (om den bär markören) och kommentarerna som bär den. */
export function senasteTryck(issue: { body?: string | null; created_at: string },
  kommentarer: { body?: string | null; created_at: string }[]): Date | null {
  const tider = [
    ...((issue.body ?? "").includes(FROSTTRYCK_MARK) ? [issue.created_at] : []),
    ...kommentarer.filter((k) => (k.body ?? "").includes(FROSTTRYCK_MARK)).map((k) => k.created_at),
  ].map((t) => new Date(t).getTime());
  return tider.length ? new Date(Math.max(...tider)) : null;
}
