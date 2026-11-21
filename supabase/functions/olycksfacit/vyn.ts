// Olycksfacit på admin.halkvakt.se (DECISIONS #936): fliken Olycksfacit på statistiksidan, de rena delarna. Samma bedömning,
// samma områden, samma nämnare och samma lagerrader som veckans ärende (arende.ts, TROSKLAR-OLYCKSFACIT §9 och §11), räknade över
// säsongen. Sidan är inloggad men svaret bär ändå bara det som ärendena får bära: väg, tid, klass, koder och antal, aldrig läget
// som koordinater och aldrig kandidatens tal.
import { vagText } from "../_shared/vagnamn.ts";
import { BEDOMNINGAR, type Bedomning, FORSTA_DAG, NAMNARE, OMRADEN, OVERLAPP, type Olycka, behoverAtgard, bedomning, forifylld, kollision,
  omrade, svenskDag, svenskTid } from "./arende.ts";

export const MISSAR_DYGN = 30;   // misslistan: de senaste 30 dygnen
export const LAGER_DYGN = 7;     // lagerradernas kolumn "senaste 7 dygnen"

/** ISO-veckan för ett svenskt datum, ÅÅÅÅ-Vnn, som to_char(…, 'IYYY-"V"IW') i index.ts. */
export function isoVecka(dag: string): string {
  const d = new Date(dag + "T00:00:00Z");
  const tor = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);   // veckans torsdag bär året
  const ar = tor.getUTCFullYear();
  const v = 1 + Math.round((tor.getTime() - Date.UTC(ar, 0, 4)) / 604_800_000 - 3 / 7 + ((new Date(Date.UTC(ar, 0, 4)).getUTCDay() + 6) % 7) / 7);
  return `${ar}-V${String(v).padStart(2, "0")}`;
}

const dagarFore = (dag: string, n: number) => new Date(Date.parse(dag + "T00:00:00Z") - n * 86_400_000).toISOString().slice(0, 10);
const halkkopplad = (o: Olycka) => o.klass === "TYDLIG" || o.klass === "TROLIG";

/** Varför en OKLAR olycka blev oklar (DECISIONS #938): den regel i klassningen (sql/110, TROSKLAR-OLYCKSFACIT §4) som inte räckte,
 *  i klassningens ordning. Utan station är ytan okänd; mellan 0 och +3 °C är det varken trolig halka eller för varmt. */
export const OKLARA = ["Ingen station inom 15 km", "Ytan mellan 0 och +3 °C", "Kall yta, men texten säger inte hur olyckan gick till",
  "Kall yta, men ingen fukt eller rimfrost vid stationen"] as const;
export function oklarSkal(o: Olycka): (typeof OKLARA)[number] | null {
  if (o.klass !== "OKLAR") return null;
  if (o.ytaMin === null || o.ytaMin === undefined) return OKLARA[0];
  if (o.ytaMin > 0) return OKLARA[1];
  if (o.art !== "ett fordon" && o.art !== "flera fordon") return OKLARA[2];
  return OKLARA[3];
}

/** Åtgärden i ord: kortet ur den förifyllda åtgärden, annars att raden läses i veckans ärende. Kollisionerna får ingen (D2). */
export function atgard(o: Olycka): string {
  if (kollision(o)) return "ingen åtgärd, kollision";
  const f = forifylld(o);
  if (f) return f.slice(0, f.indexOf(" — "));
  return behoverAtgard(o) ? "läses i veckans ärende" : "–";
}

export type Vy = {
  fran: string; till: string;
  sasong: { olyckor: number; halkkopplade: number; ratt: number; missar: number; kollisioner: number };
  bedomningar: Record<Bedomning, number>;
  namnare: { klass: string; olyckor: number; varnade: number }[];
  omraden: { omrade: string; missar: number }[];
  missar: { dag: string; tid: string; vag: string; klass: string; omrade: string | null; atgard: string; arende: number | null }[];
  veckor: ({ vecka: string } & Record<Bedomning, number>)[];
  lagren: { rad: string; senaste: number; sasong: number }[];
  oklara: { skal: string; olyckor: number; varnade: number }[];
};

/** Fliken ur säsongens olyckor (ej klassade och dubbletter räknas inte), dygnens ärenden och dagens svenska datum. */
export function adminVy(alla: Olycka[], arenden: ReadonlyMap<string, number>, idag: string): Vy {
  const s = alla.filter((o) => !o.dubblett && bedomning(o) !== null);
  const bed = (b: Bedomning, x: Olycka[]) => x.filter((o) => bedomning(o) === b).length;
  const halk = s.filter(halkkopplad);
  const missarFran = dagarFore(idag, MISSAR_DYGN - 1), lagerFran = dagarFore(idag, LAGER_DYGN - 1);

  const omr = new Map<string, number>();
  for (const o of s) { const a = omrade(o); if (a) omr.set(a, (omr.get(a) ?? 0) + 1); }

  const veckor = new Map<string, Olycka[]>();
  for (const o of s) { const v = isoVecka(svenskDag(o.tid)); veckor.set(v, [...(veckor.get(v) ?? []), o]); }

  return {
    fran: FORSTA_DAG, till: idag,
    sasong: { olyckor: s.length, halkkopplade: halk.length, ratt: bed("RÄTT VARNING", s), missar: bed("MISS", s),
              kollisioner: s.filter((o) => bedomning(o) === "MISS" && kollision(o)).length },
    bedomningar: Object.fromEntries(BEDOMNINGAR.map((b) => [b, bed(b, s)])) as Record<Bedomning, number>,
    namnare: NAMNARE.map(([klass, f]) => { const x = s.filter(f); return { klass, olyckor: x.length, varnade: x.filter((o) => o.utfall === "VARNADE").length }; }),
    omraden: OMRADEN.filter((a) => omr.has(a)).map((a) => ({ omrade: a, missar: omr.get(a)! })),
    missar: s.filter((o) => bedomning(o) === "MISS" && svenskDag(o.tid) >= missarFran)
      .sort((a, b) => b.tid.localeCompare(a.tid))
      .map((o) => ({ dag: svenskDag(o.tid), tid: svenskTid(o.tid), vag: vagText(o.vag) ?? "okänd väg", klass: o.klass!, omrade: omrade(o),
                     atgard: atgard(o), arende: arenden.get(svenskDag(o.tid)) ?? null })),
    veckor: [...veckor.keys()].sort().map((v) => ({ vecka: v, ...Object.fromEntries(BEDOMNINGAR.map((b) => [b, bed(b, veckor.get(v)!)])) }) as { vecka: string } & Record<Bedomning, number>),
    lagren: OVERLAPP.map(([rad, f]) => ({ rad, senaste: halk.filter((o) => svenskDag(o.tid) >= lagerFran && f(o.talade)).length,
                                          sasong: halk.filter((o) => f(o.talade)).length })),
    oklara: OKLARA.map((skal) => { const x = s.filter((o) => oklarSkal(o) === skal);
      return { skal, olyckor: x.length, varnade: x.filter((o) => o.utfall === "VARNADE").length }; }),
  };
}
