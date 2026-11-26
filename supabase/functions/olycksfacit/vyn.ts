// Olycksfacit på admin.halkvakt.se (DECISIONS #936): fliken Olycksfacit på statistiksidan, de rena delarna. Samma bedömning,
// samma områden, samma nämnare och samma lagerrader som veckans ärende (arende.ts, TROSKLAR-OLYCKSFACIT §9 och §11), räknade över
// säsongen. Sidan är inloggad men svaret bär ändå bara det som ärendena får bära: väg, tid, klass, koder och antal, aldrig läget
// som koordinater och aldrig kandidatens tal.
import { vagText } from "../_shared/vagnamn.ts";
import { BEDOMNINGAR, type Bedomning, FORSTA_DAG, NAMNARE, OMRADEN, OVERLAPP, type Olycka, behoverAtgard, bedomning, forifylld, kollision, vaglaget,
  omrade, svenskDag, svenskTid } from "./arende.ts";

export const MISSAR_DYGN = 30;   // misslistan: de senaste 30 dygnen
export const LAGER_DYGN = 7;     // lagerradernas kolumn "senaste 7 dygnen"
export const LASES = "läses i veckans ärende", ATGARDAD = "åtgärdad i veckans ärende", ATGARDAD_DYGN = "åtgärdad i dygnets ärende";

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
export const OKLARA = ["Ingen station inom 15 km", "Ytan 0 till +1 °C, med fukt", "Ytan 0 till +1 °C, torrt",
  "Ytan +1 till +3 °C, med fukt", "Ytan +1 till +3 °C, torrt", "Kall yta, men texten säger inte hur olyckan gick till",
  "Kall yta, men ingen fukt eller rimfrost vid stationen"] as const;
/** De sju grupperna (Bengt 21/11, DECISIONS #939): ytan delas vid +1 °C, och fukt betyder fukt eller rimfrost vid stationen. */
export function oklarSkal(o: Olycka): (typeof OKLARA)[number] | null {
  if (o.klass !== "OKLAR") return null;
  if (o.ytaMin === null || o.ytaMin === undefined) return OKLARA[0];
  const vat = Boolean(o.fuktEfter || o.rimfrostEfter);
  if (o.ytaMin > 1) return vat ? OKLARA[3] : OKLARA[4];
  if (o.ytaMin > 0) return vat ? OKLARA[1] : OKLARA[2];
  if (o.art !== "ett fordon" && o.art !== "flera fordon") return OKLARA[5];
  return OKLARA[6];
}

/** Basfrekvensen (Bengt 21/11, DECISIONS #940; sql/138): hur stor del av olyckorna i ett väderläge som vädret orsakade. Olyckorna per
 *  stationstimme i hinken, mot samma del av dygnet när ytan är över +3 °C; andelen är 1 − referensen/takten, aldrig under 0. Fukt är
 *  nederbörd eller yta under daggpunkten vid stationen, eller nederbörd vid en granne inom 15 km. Säsongen räknas som en helhet. */
export const HINKAR = ["kall, fukt", "kall, torrt", "0 till +1, fukt", "0 till +1, torrt", "+1 till +3, fukt", "+1 till +3, torrt", "över +3"] as const;
export type Stationstimmar = { dygn: "dag" | "natt"; hink: string; timmar: number };
export type Hinkrad = { dygn: "dag" | "natt"; hink: string; timmar: number; olyckor: number; per10000: number; andel: number | null };

export function basfrekvens(timmar: Stationstimmar[], olyckor: Olycka[]): Hinkrad[] {
  const ut: Hinkrad[] = [];
  for (const dygn of ["dag", "natt"] as const) {
    const rad = (hink: string) => {
      const t = timmar.filter((x) => x.dygn === dygn && x.hink === hink).reduce((a, x) => a + x.timmar, 0);
      const n = olyckor.filter((o) => o.dygnsdel === dygn && o.fukthink === hink).length;
      return { t, n, takt: t > 0 ? n / t : null };
    };
    const ref = rad("över +3").takt;
    for (const hink of HINKAR) {
      const { t, n, takt } = rad(hink);
      if (t === 0) continue;
      ut.push({ dygn, hink, timmar: t, olyckor: n, per10000: Math.round(100_000 * n / t) / 10,
                andel: n === 0 ? 0 : ref === null ? null : Math.max(0, 1 - ref / takt!) });
    }
  }
  return ut;
}

/** Åtgärden i ord: kortet ur den förifyllda åtgärden, annars att raden läses i veckans ärende. Kollisionerna får ingen (D2). */
export function atgard(o: Olycka): string {
  if (kollision(o)) return "ingen åtgärd, kollision";
  const f = forifylld(o);
  if (f) return f.slice(0, f.indexOf(" — "));
  return behoverAtgard(o) ? LASES : "–";
}

export type Vy = {
  fran: string; till: string;
  sasong: { olyckor: number; halkkopplade: number; ratt: number; rattVaglaget: number; missar: number; kollisioner: number };
  bedomningar: Record<Bedomning, number>;
  namnare: { klass: string; olyckor: number; varnade: number }[];
  omraden: { omrade: string; missar: number }[];
  missar: { dag: string; tid: string; vag: string; klass: string; omrade: string | null; atgard: string; arende: number | null;
            vecka: number | null }[];
  veckor: ({ vecka: string } & Record<Bedomning, number>)[];
  dygn: { dag: string; ratt: number; missar: number }[];
  lagren: { rad: string; senaste: number; sasong: number }[];
  oklara: { skal: string; olyckor: number; varnade: number }[];
  sannolikhet: { hinkar: Hinkrad[]; olyckor: number; utanStation: number; vantat: number;
                 veckor: { vecka: string; olyckor: number; klassade: number; vantat: number; utanStation: number }[] } | null;
};

export type Veckoarende = { nr: number; stangd: boolean };
export type Dygnsarende = Veckoarende & { veckolasning: boolean };

/** En miss utan förifylld åtgärd har fått sin åtgärd när ärendet som bär raden är stängt (stängningsregeln, DECISIONS #797, #802):
 *  dygnets, när dygnet skrevs före upplägget i sql/110 (raderna åtgärdades där), annars veckans. */
function lasradensAtgard(o: Olycka, dygnet: Dygnsarende | undefined, veckorna: ReadonlyMap<string, Veckoarende>):
    { atgard: string; vecka: number | null } {
  const a = atgard(o);
  if (a !== LASES) return { atgard: a, vecka: null };
  if (dygnet && !dygnet.veckolasning && dygnet.stangd) return { atgard: ATGARDAD_DYGN, vecka: null };
  const v = veckorna.get(isoVecka(svenskDag(o.tid)));
  return v ? { atgard: v.stangd ? ATGARDAD : LASES, vecka: v.nr } : { atgard: a, vecka: null };
}

/** Fliken ur säsongens olyckor (ej klassade och dubbletter räknas inte), dygnens och veckornas ärenden och dagens svenska datum. */
export function adminVy(alla: Olycka[], arenden: ReadonlyMap<string, Dygnsarende>, idag: string,
                        veckorna: ReadonlyMap<string, Veckoarende> = new Map(), stationstimmar: Stationstimmar[] = []): Vy {
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
    sasong: { olyckor: s.length, halkkopplade: halk.length, ratt: bed("RÄTT VARNING", s),
              rattVaglaget: s.filter((o) => vaglaget(o) && bedomning(o) === "RÄTT VARNING").length, missar: bed("MISS", s),
              kollisioner: s.filter((o) => bedomning(o) === "MISS" && kollision(o)).length },
    bedomningar: Object.fromEntries(BEDOMNINGAR.map((b) => [b, bed(b, s)])) as Record<Bedomning, number>,
    namnare: NAMNARE.map(([klass, f]) => { const x = s.filter(f); return { klass, olyckor: x.length, varnade: x.filter((o) => o.utfall === "VARNADE").length }; }),
    omraden: OMRADEN.filter((a) => omr.has(a)).map((a) => ({ omrade: a, missar: omr.get(a)! })),
    missar: s.filter((o) => bedomning(o) === "MISS" && svenskDag(o.tid) >= missarFran)
      .sort((a, b) => b.tid.localeCompare(a.tid))
      .map((o) => ({ dag: svenskDag(o.tid), tid: svenskTid(o.tid), vag: vagText(o.vag) ?? "okänd väg", klass: o.klass!, omrade: omrade(o),
                     ...lasradensAtgard(o, arenden.get(svenskDag(o.tid)), veckorna), arende: arenden.get(svenskDag(o.tid))?.nr ?? null })),
    dygn: Array.from({ length: Math.round((Date.parse(idag) - Date.parse(FORSTA_DAG)) / 86_400_000) + 1 }, (_, i) => {
      const dag = dagarFore(FORSTA_DAG, -i), x = s.filter((o) => svenskDag(o.tid) === dag);
      return { dag, ratt: bed("RÄTT VARNING", x), missar: bed("MISS", x) };
    }),
    veckor: [...veckor.keys()].sort().map((v) => ({ vecka: v, ...Object.fromEntries(BEDOMNINGAR.map((b) => [b, bed(b, veckor.get(v)!)])) }) as { vecka: string } & Record<Bedomning, number>),
    lagren: OVERLAPP.map(([rad, f]) => ({ rad, senaste: halk.filter((o) => svenskDag(o.tid) >= lagerFran && f(o.talade)).length,
                                          sasong: halk.filter((o) => f(o.talade)).length })),
    oklara: OKLARA.map((skal) => { const x = s.filter((o) => oklarSkal(o) === skal);
      return { skal, olyckor: x.length, varnade: x.filter((o) => o.utfall === "VARNADE").length }; }),
    sannolikhet: sannolikhet(s, stationstimmar),
  };
}

/** Väntat antal halkolyckor: summan av andelarna över olyckorna i fuktskuggan, per vecka och för säsongen, bredvid de klassade. */
function sannolikhet(s: Olycka[], timmar: Stationstimmar[]): Vy["sannolikhet"] {
  if (!timmar.length) return null;
  const x = s.filter((o) => o.fukthink !== undefined);
  const hinkar = basfrekvens(timmar, x);
  const andel = new Map(hinkar.map((h) => [`${h.dygn}|${h.hink}`, h.andel ?? 0]));
  const p = (o: Olycka) => (o.fukthink ? andel.get(`${o.dygnsdel}|${o.fukthink}`) ?? 0 : 0);
  const tiondel = (n: number) => Math.round(10 * n) / 10;
  const veckor = new Map<string, Olycka[]>();
  for (const o of x) { const v = isoVecka(svenskDag(o.tid)); veckor.set(v, [...(veckor.get(v) ?? []), o]); }
  return {
    hinkar, olyckor: x.length, utanStation: x.filter((o) => o.fukthink === null).length, vantat: tiondel(x.reduce((a, o) => a + p(o), 0)),
    veckor: [...veckor.keys()].sort().map((vecka) => { const y = veckor.get(vecka)!;
      return { vecka, olyckor: y.length, klassade: y.filter(halkkopplad).length, vantat: tiondel(y.reduce((a, o) => a + p(o), 0)),
               utanStation: y.filter((o) => o.fukthink === null).length }; }),
  };
}
