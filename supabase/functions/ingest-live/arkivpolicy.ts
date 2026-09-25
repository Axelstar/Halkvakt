// Arkivpolicyn för väderarkivet (DECISIONS #4, ändrad #353 25/9, kort #253). Ren logik utan Deno eller nätverk, så att den
// prövas i test/arkivpolicy.test.ts.
//
// En kall eller blöt avläsning sparas alltid. En varm och torr sparas EN gång per station och halvtimme — annars saknade grind A
// och vägpunktsgrinden de varma grannarna som driftens prognos tar med (mätt 25/9: 49,5 % av grannplatserna i kalla halvtimmar).
// Halvtimmen är grindarnas hink: floor(epok / 1800).

/** Stationens halvtimme som nyckel — samma hink som grind A och vägpunktsgrinden räknar i. */
export function halvtimme(stationId: string, sampleIso: string): string {
  return `${stationId}|${Math.floor(Date.parse(sampleIso) / 1_800_000)}`;
}

/** Ska avläsningen sparas? `har` är halvtimmarna som redan har en rad (null = okänt, frågan fallerade ⇒ den gamla regeln).
 *  En sparad rad läggs i `har` av anroparen, så att två varma avläsningar i samma halvtimme aldrig blir två rader. */
export function skaArkiveras(intressant: boolean, nyckel: string, har: Set<string> | null): boolean {
  if (intressant) return true;
  if (har === null) return false;
  return !har.has(nyckel);
}
