// RESANS RAPPORT I APPEN (favoriterna steg 3, kort #357; DECISIONS #636, #637). Ovanpå favoritRapport i rapport-core.ts, som
// favoritprovet kör på servern: samma urval, samma texter och samma avstånd — provmiljöns tal är appens trösklar (#637) — plus det
// appen lägger till: Hem som samma väg vänd, och köer och restider bara åt förarens håll. Tvillingarna HalkvaktEngine/Rapport.swift och
// android/engine/…/Rapport.kt prövas mot engine/fixtures/rapport.json (scripts/rapport-facit.ts). Filen buntas inte in i serverns
// funktioner; den är facit för apparna.
import { farorLangsRutten } from "../engine/src/rutfilter.ts";
import { samplePolyline } from "../engine/src/geo.ts";
import type { Hazard } from "../engine/src/types.ts";
import type { LiveDoc, StaticDoc } from "../engine/src/snapshot.ts";
import { favoritRapport, LANGS_STEG_M, MARGINALER, type Linje, type Linjer, type Rad, type Rapport } from "./rapport-core.ts";

/** Hem: samma väg åt andra hållet. */
export function vand(rutt: Linje): Linje {
  return [...rutt].reverse();
}

/** Går linjen åt samma håll som rutten? Varje del provas var LANGS_STEG_M:e meter i sin egen ordning, och stegen längs rutten mellan
 *  provpunkter som når den summeras: ökar platsen går linjen åt samma håll (1), minskar den åt motsatt (−1). Når färre än två
 *  provpunkter rutten går det inte att avgöra (0). Ingen vinkelgräns (DECISIONS #637). Trafikverket ritar restidssträckorna i
 *  körriktningen (136 av 140 med riktning i namnet, 18/10). */
export function riktning(delar: Linje[], rutt: Linje, marginalM: number): 1 | -1 | 0 {
  let summa = 0;
  for (const del of delar) {
    const prov = samplePolyline(del, LANGS_STEG_M).map((q, i) => ({ id: `p${i}`, kind: "accident", lon: q.lon, lat: q.lat } as Hazard));
    const langs = new Map(farorLangsRutten(prov, rutt, marginalM).map((t) => [t.hazard.id, t.langsM]));
    let fore: number | null = null;
    for (let i = 0; i < prov.length; i++) {
      const l = langs.get(`p${i}`);
      if (l === undefined) continue;
      if (fore !== null) summa += l - fore;
      fore = l;
    }
  }
  return summa > 0 ? 1 : summa < 0 ? -1 : 0;
}

/** Det appen visar för en sparad resa: favoritRapport längs resan, eller den vända resan för Hem, med köer och restider
 *  (restidssträckorna, id tt:) bara åt förarens håll. Köer ur Trafikverkets meddelanden har ingen riktning mot resan och står kvar. */
export function resansRapport(rutt: Linje, hem: boolean, live: LiveDoc, stat: StaticDoc, snabb: Rapport, lang: Linjer): Rad[] {
  const r = hem ? vand(rutt) : rutt;
  const linjer = new Map(snabb.poster.filter((p) => p.l).map((p) => [p.id, lang.linjer[p.l as string] ?? []]));
  return favoritRapport(r, live, stat, snabb, lang, MARGINALER)
    .filter((rad) => !rad.id.startsWith("tt:") || riktning(linjer.get(rad.id) ?? [], r, MARGINALER[rad.slag]) !== -1);
}
