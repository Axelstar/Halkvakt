// RESANS RAPPORT I APPEN (favoriterna steg 3, kort #357; DECISIONS #636, #637). Ovanpå favoritRapport i rapport-core.ts, som
// favoritprovet kör på servern: samma urval, samma texter och samma avstånd — provmiljöns tal är appens trösklar (#637) — plus det
// appen lägger till: Hem som samma väg vänd, och köer och restider bara åt förarens håll. Tvillingarna HalkvaktEngine/Rapport.swift och
// android/engine/…/Rapport.kt prövas mot engine/fixtures/rapport.json (scripts/rapport-facit.ts). Filen buntas inte in i serverns
// funktioner; den är facit för apparna.
import { farorLangsRutten } from "../engine/src/rutfilter.ts";
import { samplePolyline } from "../engine/src/geo.ts";
import type { Hazard } from "../engine/src/types.ts";
import type { LiveDoc, StaticDoc } from "../engine/src/snapshot.ts";
import { favoritRapport, LANGS_STEG_M, MARGINALER, ORDNING, RUBRIK, tomma, vagNamn, type Linje, type Linjer, type Rad, type Rapport,
  type Slag } from "./rapport-core.ts";

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

// ── Fliken och rapportskärmen (steg 3b): radens läge, det nya sedan förra kollen, rubriken med vägen, åldersgränsen och raden om
//    det tomma. Samma regler i båda apparna, prövade mot facit; apparna ritar bara.

/** Det som inte är en händelse: fartkamerorna står fast, och en restidssträcka i normal trafik är bara en mätpunkt (en restid med
 *  fördröjning är slaget ko och räknas). De är varken nya eller något som pågår, så de varken ger Nytt eller håller en resa från Lugnt. */
export const INTE_HANDELSER: Slag[] = ["kamera", "restid"];

/** Det som pågår längs resan åt något håll, utom det som inte är händelser. Dit först, sedan det som bara finns Hem. */
export function pagar(dit: Rad[], hem: Rad[]): Rad[] {
  const d = new Set(dit.map((r) => r.id));
  return [...dit, ...hem.filter((r) => !d.has(r.id))].filter((r) => !INTE_HANDELSER.includes(r.slag));
}

export type Radlage = { lage: "nytt"; antal: number; viktigast: Rad } | { lage: "ingetNytt"; storst: Rad } | { lage: "lugnt" };

/** Radens läge i fliken (FAVORITER §2): Nytt när något tillkommit sedan förra kollen (sett: dess id, null före den första), annars
 *  Inget nytt med det största som pågår, annars Lugnt. Det viktigaste och det största är det första i viktordningen. */
export function radlage(dit: Rad[], hem: Rad[], sett: string[] | null): Radlage {
  const p = pagar(dit, hem);
  const forst = (a: Rad[]) => a.reduce<Rad | null>((m, r) => (m === null || ORDNING.indexOf(r.slag) < ORDNING.indexOf(m.slag) ? r : m), null);
  if (sett) {
    const s = new Set(sett);
    const nya = p.filter((r) => !s.has(r.id));
    const v = forst(nya);
    if (v) return { lage: "nytt", antal: nya.length, viktigast: v };
  }
  const st = forst(p);
  return st ? { lage: "ingetNytt", storst: st } : { lage: "lugnt" };
}

/** Det nya åt det valda hållet sedan förra kollen, utom det som inte är händelser; före den första kollen finns inget nytt. */
export function nyttSedanKollen(rader: Rad[], sett: string[] | null): Rad[] {
  if (!sett) return [];
  const s = new Set(sett);
  return rader.filter((r) => !s.has(r.id) && !INTE_HANDELSER.includes(r.slag));
}

/** Alla id resan visar åt båda hållen, sorterade — det som sparas som förra kollen. */
export function kollensIds(dit: Rad[], hem: Rad[]): string[] {
  return [...new Set([...dit, ...hem].map((r) => r.id))].sort();
}

/** Rubriken med vägen, när rubriken inte redan säger var: "Olycka på E4", men "Djur på vägen" som den står. */
export function titel(rubrik: string, vag: string | null | undefined): string {
  const v = vagNamn(vag);
  return v && !rubrik.includes(" på ") ? `${rubrik} på ${v}` : rubrik;
}

/** Samma åldersgränser som rösten (apparnas AgeGate, FAVORITER §3): ur en gammal lägesfil visas varken väglag eller frysrisk, och ur
 *  en gammal rapportfil varken olyckor eller vilt, som läget just nu. Gränserna i minuter bor i AgeGate, inte här. */
export const VAGLAGETS: Slag[] = ["halka", "frysrisk"];
export const OLYCKORNAS: Slag[] = ["olycka", "vilt"];
const dolt = (s: Slag, gammaltVaglag: boolean, gamlaOlyckor: boolean) =>
  (gammaltVaglag && VAGLAGETS.includes(s)) || (gamlaOlyckor && OLYCKORNAS.includes(s));

export function aldersgrind(rader: Rad[], gammaltVaglag: boolean, gamlaOlyckor: boolean): Rad[] {
  return rader.filter((r) => !dolt(r.slag, gammaltVaglag, gamlaOlyckor));
}

/** Raden om det tomma (FAVORITER §3): "Inget rapporterat: vilt, färjor och SMHI-varningar. Köer mäts inte längs den här vägen."
 *  Slag som åldersgränsen dolt står inte med — där vet appen inte att det är tomt — och köerna inte heller när de inte mäts.
 *  null när det inte finns något att säga. */
export function tomtRad(rader: Rad[], gammaltVaglag: boolean, gamlaOlyckor: boolean): string | null {
  const t = tomma(rader);
  const namn = t.inget.filter((s) => !dolt(s, gammaltVaglag, gamlaOlyckor) && !(t.koerMatsInte && s === "ko")).map((s) => RUBRIK[s]);
  let ut = namn.length ? `Inget rapporterat: ${namn.length === 1 ? namn[0] : `${namn.slice(0, -1).join(", ")} och ${namn[namn.length - 1]}`}.` : "";
  if (t.koerMatsInte) ut += `${ut ? " " : ""}Köer mäts inte längs den här vägen.`;
  return ut || null;
}
