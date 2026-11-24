// ═══ Olycksfacit: driftlarmets ärenden (TROSKLAR-OLYCKSFACIT §10, kort #641; Bengts val 24/11, DECISIONS #959) ═══
// Skuggan (sql/108) skriver en rad i olycksfacit_driftlarm per olycka och feltyp när ett lager inte fungerade vid en olycka som kan
// gälla halka. Bengt valde 24/11 att bara våra egna fel får göra ärenden: lägesfilen till appen stod still och kandidatens kedja
// (ingen timme, eller talen gallrade). En tyst station hos Trafikverket och en publicering som inte går att avgöra gör inga ärenden;
// deras rader står kvar i tabellen, och olyckan själv läses i dagens och veckans ärende som förut. Högst ett ärende per feltyp och svenskt dygn; följande olyckor med samma fel blir kommentarer.
// Repot är publikt: ärendet bär bara väg, tid, läge, koderna och klockslagen, som dagens ärende.
import { svenskDag, svenskTid } from "./arende.ts";

export const DRIFT_ETIKETT = "drift";
export const DRIFT_FELTYPER = ["appen stilla", "K ingen timme", "K gallrad"] as const;   // Bengts val 24/11

export type Driftrad = {
  feltyp: string; halka: string; sedan: string | null; tid: string; vag: string | null; lon: number; lat: number;
};

const FORKLARING: Record<string, string> = {
  "appen stilla": "Lägesfilen till appen publicerades inte de 15 minuterna före olyckan, så förarna hade äldre data.",
  "K ingen timme": "Kandidatens kedja var tyst eller äldre än två timmar när olyckan började.",
  "K gallrad": "Kandidatens tal per punkt hann gallras innan olyckan fångades.",
};
const SEDAN: Record<string, string> = {
  "appen stilla": "senaste lyckade publicering", "K ingen timme": "kandidatens senaste timme", "K gallrad": "kandidatens timme",
};

export const arArende = (feltyp: string) => (DRIFT_FELTYPER as readonly string[]).includes(feltyp);
export const driftMark = (dag: string, feltyp: string) => `<!-- olycksfacit:drift:${dag}:${feltyp} -->`;
export const driftTitel = (dag: string, feltyp: string) => `Driftlarm ${dag}: ${feltyp}`;

const nar = (iso: string | null) => iso === null ? "okänt" : `${svenskDag(iso)} ${svenskTid(iso)}`;
const rad = (r: Driftrad) =>
  `- ${svenskTid(r.tid)} ${r.vag ?? "okänd väg"} (${r.lon.toFixed(3)}, ${r.lat.toFixed(3)}) — halka: ${r.halka} — ${SEDAN[r.feltyp] ?? "sedan"}: ${nar(r.sedan)}`;

export function driftKropp(dag: string, r: Driftrad): string {
  return [
    `**${r.feltyp}** vid en olycka som kan gälla halka, ${dag} (svensk tid).`,
    "",
    FORKLARING[r.feltyp] ?? "",
    "",
    "**Olyckorna** (fler med samma fel samma dygn läggs som kommentarer):",
    rad(r),
    "",
    "**Stängs** när felet är förklarat: med ett kort (`kort #NN`) eller *ingen åtgärd* med skälet (TROSKLAR-OLYCKSFACIT §10).",
    "",
    driftMark(dag, r.feltyp),
  ].join("\n");
}

export const driftKommentar = (r: Driftrad) => `Samma fel vid ytterligare en olycka:\n${rad(r)}`;
