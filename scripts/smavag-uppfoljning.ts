// SMÅVÄGSRÖSTENS UPPFÖLJNING MOT VERKLIGA DATA (DECISIONS #883, kort #662; Bengt 16/11: "bygg uppföljningen på alla fyra delar och
// implementera ett system som följer upp och rapporterar hur systemet förhåller sig till verkliga data").
// Varje morgon skriver flödet kuvos-smavag-uppfoljning.yml en dygnsrapport för förra dygnet. Den här filen läser de tre delar som bor
// i databasen och sätter ihop rapporten:
//   räknaren     småvägsbeskeden i riktiga appar, per app och version, mot vaktpassen (app_raknare, svenskt dygn). Avbrottskontrollen
//                prövar bara skuggans påhittade resor vid taket 30 minuter och 20 km; här syns vad varje appversion faktiskt sa;
//   facitsvaren  testarnas Stämde och Stämde inte på småvägsrösten (driver_facit, alert_id smv:…, utan provsvaren);
//   olyckorna    olyckorna vid en småvägspunkt (olycksfacit med lagret smavag, sql/110): vad regeln sa vid starten och klassningen,
//                och andelen som började i halkaläge mot andelen av punkt-timmarna i halkaläge (ur radarkollen).
// Två delar räknas i det privata repot och läggs in som de är: radarkollen (prognosens nederbörd mot radarn) och driftkontrollen
// (röstens regel mot stationernas mätning, spärrad tills förregistreringens post är signerad).
// Allt räknat går bara till den privata hinken (#768, #498): uppfoljning_<dygn>.json och uppfoljning_<dygn>.md. Loggen säger bara
// vilka delar som är klara, och driftkontrollens ord per region.
//   node --experimental-strip-types scripts/smavag-uppfoljning.ts --sjalvtest
//   node --experimental-strip-types scripts/smavag-uppfoljning.ts db <dygn> <db.json>            DATABASE_URL
//   node --experimental-strip-types scripts/smavag-uppfoljning.ts rapport <dygn> <db.json> <radar.json|-> <stationer.json|-> <läge> <ut.json> <ut.md> [tidigare.json …]
//       läge: driftkontrollens läge när filen saknas: sparrad, vantar eller fel. tidigare: de sex föregående dygnens rapporter som finns.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const FONSTER_DYGN = 7;
export const LANGDER = ["under3", "3-15", "15-45", "over45", "okand"] as const;
const BAND = ["under400", "400-800", "800-1200", "1200-3000", "over3000"] as const;
const ORSAKER = ["varnar", "torr", "fryser inte", "ingen timme", "gallrad", "ingen småvägspunkt"] as const;
const KLASSER = ["TYDLIG", "TROLIG", "OKLAR", "INTE", "ej klassad"] as const;
const MED_TIMME = new Set(["varnar", "torr", "fryser inte"]);
const HALKKOPPLAD = new Set(["TYDLIG", "TROLIG"]);

/** Frågorna. $1 är dygnet; fönstret är dygnet och de sex före. Anslutningen står i UTC (kor sätter TimeZone). */
export const SATS = {
  raknaren: `SELECT dag::text AS dag, app, version, handelse, varde, sum(antal)::int AS antal
    FROM app_raknare
    WHERE dag BETWEEN $1::date - 6 AND $1::date
      AND (handelse IN ('vakt_startad', 'resa_slut', 'aktiv_dag')
        OR (handelse IN ('varning', 'varning_ersatt') AND varde LIKE 'smavag%')
        OR (handelse = 'installning' AND varde LIKE 'slippery_segment:%'))
    GROUP BY 1, 2, 3, 4, 5`,
  facit: `SELECT alert_t::date::text AS dag, app, coalesce(version, '') AS version, svar, count(*)::int AS antal
    FROM driver_facit
    WHERE alert_id LIKE 'smv:%' AND NOT prov
      AND alert_t >= ($1::date - 6)::timestamptz AND alert_t < ($1::date + 1)::timestamptz
    GROUP BY 1, 2, 3, 4`,
  olyckor: `SELECT o.start_time::date::text AS dag, o.utfall, coalesce(o.klass, 'ej klassad') AS klass, l.orsak,
      coalesce(l.talar, false) AS talar, count(*)::int AS antal
    FROM olycksfacit o JOIN olycksfacit_lager l ON l.deviation_id = o.deviation_id AND l.lager = 'smavag'
    WHERE o.dubblett_av IS NULL
      AND o.start_time >= ($1::date - 6)::timestamptz AND o.start_time < ($1::date + 1)::timestamptz
    GROUP BY 1, 2, 3, 4, 5`,
  brytarna: `SELECT grupp, pa FROM smavagsbrytare ORDER BY grupp`,
};

export type RaknarRad = { dag: string; app: string; version: string; handelse: string; varde: string; antal: number };
export type FacitRad = { dag: string; app: string; version: string; svar: string; antal: number };
export type OlycksRad = { dag: string; utfall: string; klass: string; orsak: string | null; talar: boolean; antal: number };
export type Db = { dygn: string; brytarna: { grupp: string; pa: boolean }[]; raknaren: RaknarRad[]; facit: FacitRad[]; olyckor: OlycksRad[] };

const kvot = (t: number, n: number): number | null => (n > 0 ? t / n : null);
const noll = <K extends string>(nycklar: readonly K[]) => Object.fromEntries(nycklar.map((k) => [k, 0])) as Record<K, number>;

export type AppTal = { besked: number; band: Record<(typeof BAND)[number], number>; ersatta: number; vaktpass: number;
  resor: Record<(typeof LANGDER)[number], number>; aktiva_dagar: number; halt_vaglag_av: number; halt_vaglag_pa: number;
  besked_per_vaktpass: number | null };

/** Räknarens rader för ett urval dygn, per app och version ("ios 0.4.0"). Okända värden kastar: de ska inte räknas tyst som noll. */
export function raknaren(rader: RaknarRad[], dagar: Set<string>): Record<string, AppTal> {
  const ut: Record<string, AppTal> = {};
  for (const r of rader) {
    if (!dagar.has(r.dag)) continue;
    const a = (ut[`${r.app} ${r.version || "okänd version"}`] ??= { besked: 0, band: noll(BAND), ersatta: 0, vaktpass: 0, resor: noll(LANGDER),
      aktiva_dagar: 0, halt_vaglag_av: 0, halt_vaglag_pa: 0, besked_per_vaktpass: null });
    if (r.handelse === "varning") {
      const b = r.varde.split(":")[1] as (typeof BAND)[number];
      if (!r.varde.startsWith("smavag:") || !(b in a.band)) throw new Error(`räknaren: okänt värde för varning: ${r.varde}`);
      a.besked += r.antal; a.band[b] += r.antal;
    } else if (r.handelse === "varning_ersatt") a.ersatta += r.antal;
    else if (r.handelse === "vakt_startad") a.vaktpass += r.antal;
    else if (r.handelse === "aktiv_dag") a.aktiva_dagar += r.antal;
    else if (r.handelse === "resa_slut") {
      const l = r.varde.split(":")[1] as (typeof LANGDER)[number];
      if (!(l in a.resor)) throw new Error(`räknaren: okänd reslängd: ${r.varde}`);
      a.resor[l] += r.antal;
    } else if (r.handelse === "installning") {
      if (r.varde === "slippery_segment:av") a.halt_vaglag_av += r.antal;
      else if (r.varde === "slippery_segment:pa") a.halt_vaglag_pa += r.antal;
      else throw new Error(`räknaren: okänt värde för installning: ${r.varde}`);
    } else throw new Error(`räknaren: okänd händelse: ${r.handelse}`);
  }
  for (const a of Object.values(ut)) a.besked_per_vaktpass = kvot(a.besked, a.vaktpass);
  return ut;
}

export type FacitTal = { ja: number; nej: number; andel_ja: number | null };
/** Facitsvaren på småvägsrösten för ett urval dygn, per app och version och tillsammans. */
export function facit(rader: FacitRad[], dagar: Set<string>): { alla: FacitTal; per_app: Record<string, FacitTal> } {
  const alla: FacitTal = { ja: 0, nej: 0, andel_ja: null }, per: Record<string, FacitTal> = {};
  for (const r of rader) {
    if (!dagar.has(r.dag)) continue;
    if (r.svar !== "ja" && r.svar !== "nej") throw new Error(`facit: okänt svar: ${r.svar}`);
    const a = (per[`${r.app} ${r.version || "okänd version"}`] ??= { ja: 0, nej: 0, andel_ja: null });
    a[r.svar] += r.antal; alla[r.svar] += r.antal;
  }
  for (const a of [alla, ...Object.values(per)]) a.andel_ja = kvot(a.ja, a.ja + a.nej);
  return { alla, per_app: per };
}

export type OlycksTal = { olyckor: number; vid_punkt: number; med_timme: number; i_halkalage: number; talade: number; otackta_vid_punkt: number;
  halkkopplade: Record<(typeof ORSAKER)[number], number>; per_orsak: Record<(typeof ORSAKER)[number], Record<(typeof KLASSER)[number], number>>;
  andel_i_halkalage: number | null; halkalaget_andel_av_tiden: number | null; overrepresentation: number | null };

/** Olyckorna för ett urval dygn. halkalage: andelen av punkt-timmarna där regeln varnade under samma dygn (radarkollen), eller null.
 *  Överrepresentationen är andelen olyckor som började i halkaläge delad med den andelen: över 1 betyder att olyckorna oftare
 *  började där och när regeln varnade än tiden i halkaläge ensam förklarar. */
export function olyckor(rader: OlycksRad[], dagar: Set<string>, halkalage: number | null): OlycksTal {
  const per = Object.fromEntries(ORSAKER.map((o) => [o, noll(KLASSER)])) as OlycksTal["per_orsak"];
  const t: OlycksTal = { olyckor: 0, vid_punkt: 0, med_timme: 0, i_halkalage: 0, talade: 0, otackta_vid_punkt: 0, halkkopplade: noll(ORSAKER),
    per_orsak: per, andel_i_halkalage: null, halkalaget_andel_av_tiden: halkalage, overrepresentation: null };
  for (const r of rader) {
    if (!dagar.has(r.dag)) continue;
    const o = r.orsak as (typeof ORSAKER)[number], k = r.klass as (typeof KLASSER)[number];
    if (!(o in per) || !(k in per[o])) throw new Error(`olyckorna: okänd orsak eller klass: ${r.orsak}, ${r.klass}`);
    per[o][k] += r.antal; t.olyckor += r.antal;
    if (o !== "ingen småvägspunkt") { t.vid_punkt += r.antal; if (r.utfall === "TYST_OTACKT") t.otackta_vid_punkt += r.antal; }
    if (MED_TIMME.has(o)) t.med_timme += r.antal;
    if (o === "varnar") t.i_halkalage += r.antal;
    if (r.talar) t.talade += r.antal;
    if (HALKKOPPLAD.has(k)) t.halkkopplade[o] += r.antal;
  }
  t.andel_i_halkalage = kvot(t.i_halkalage, t.med_timme);
  t.overrepresentation = t.andel_i_halkalage !== null && halkalage ? t.andel_i_halkalage / halkalage : null;
  return t;
}

/** Dygnet och de sex före som ÅÅÅÅ-MM-DD, äldst först. */
export function fonster(dygn: string): string[] {
  const d0 = Date.parse(`${dygn}T00:00:00Z`);
  return Array.from({ length: FONSTER_DYGN }, (_, i) => new Date(d0 - (FONSTER_DYGN - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

type Radar = { dygn: string; timmar_med_underlag: number; regioner: Record<string, { andel_halkalage: number | null; [k: string]: unknown }> };
type Stationer = { dygn: string; utslag: Record<string, string>; [k: string]: unknown };
export type Lage = "sparrad" | "vantar" | "fel";
export type Rapport = { dygn: string; fonster: string[]; niva: string; brytarna: Db["brytarna"];
  raknaren: { dygnet: Record<string, AppTal>; sju_dygn: Record<string, AppTal> };
  facitsvaren: { dygnet: ReturnType<typeof facit>; sju_dygn: ReturnType<typeof facit> };
  olyckorna: { dygnet: OlycksTal; sju_dygn: OlycksTal };
  radarkollen: Radar | null; driftkontrollen: Stationer | { lage: Lage } };

/** Halkalägets andel av punkt-timmarna över fönstret: dygnens andelar vägda med timmarna med underlag. Null utan något dygn. */
export function halkalagetIFonstret(radar: (Radar | null)[]): number | null {
  let t = 0, n = 0;
  for (const r of radar) {
    const a = r?.regioner?.alla?.andel_halkalage;
    if (r && typeof a === "number" && r.timmar_med_underlag > 0) { t += a * r.timmar_med_underlag; n += r.timmar_med_underlag; }
  }
  return n ? t / n : null;
}

/** Dygnsrapporten. tidigare: de föregående dygnens rapporter som finns (för halkalägets andel över fönstret). */
export function rapport(db: Db, radar: Radar | null, stationer: Stationer | null, lage: Lage, tidigare: Pick<Rapport, "dygn" | "radarkollen">[]): Rapport {
  const f = fonster(db.dygn), idag = new Set([db.dygn]), sju = new Set(f);
  const radarPerDygn = new Map(tidigare.filter((t) => sju.has(t.dygn) && t.dygn !== db.dygn).map((t) => [t.dygn, t.radarkollen]));
  if (radar) radarPerDygn.set(db.dygn, radar);
  const pa = db.brytarna.some((b) => b.pa);
  return {
    dygn: db.dygn, fonster: f, brytarna: db.brytarna,
    niva: pa ? "i drift: en brytare är på, och rösten kan ha talat" : "skugga: brytarna är av, och rösten har inte talat för någon förare",
    raknaren: { dygnet: raknaren(db.raknaren, idag), sju_dygn: raknaren(db.raknaren, sju) },
    facitsvaren: { dygnet: facit(db.facit, idag), sju_dygn: facit(db.facit, sju) },
    olyckorna: { dygnet: olyckor(db.olyckor, idag, radar?.regioner?.alla?.andel_halkalage ?? null),
      sju_dygn: olyckor(db.olyckor, sju, halkalagetIFonstret([...radarPerDygn.values()])) },
    radarkollen: radar, driftkontrollen: stationer ?? { lage },
  };
}

const ORD: Record<Lage, string> = { sparrad: "spärrad", vantar: "väntar", fel: "fel" };
/** Loggens rad: vilka delar som är klara och driftkontrollens ord per region. Inga tal (#768). */
export function loggrad(r: Rapport): string {
  const s = r.driftkontrollen as Stationer & { lage?: Lage };
  const drift = s.utslag ? ["alla", "norr", "soder"].map((k) => `${k === "soder" ? "söder" : k} ${s.utslag[k]}`).join(", ") : ORD[s.lage!];
  return `uppföljningen ${r.dygn}: räknaren klart; facitsvaren klart; olyckorna klart; radarkollen ${r.radarkollen ? "klart" : "saknas"}; driftkontrollen ${drift}`;
}

const pct = (x: number | null | undefined) => (typeof x === "number" && Number.isFinite(x) ? `${(100 * x).toFixed(1).replace(".", ",")} %` : "–");
const tal = (x: number | null | undefined, d = 2) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "–");

/** Rapporten som text för Bengt och Axel. Går bara till den privata hinken. */
export function markdown(r: Rapport): string {
  const ut: string[] = [`# Småvägsrösten mot verkliga data, ${r.dygn}`, "",
    `Nivå: ${r.niva}. Fönstret är ${r.fonster[0]} till ${r.dygn}. Räknarens dygn är svenskt, de andra UTC.`, ""];
  ut.push("## 1. Räknaren: beskeden i riktiga appar", "", "| App och version | Besked i dygnet | Vaktpass | Besked per vaktpass | Sju dygn: besked | Vaktpass | Per vaktpass | Halt väglag avstängt (sju dygn) |",
    "|:--|--:|--:|--:|--:|--:|--:|--:|");
  const appar = [...new Set([...Object.keys(r.raknaren.sju_dygn), ...Object.keys(r.raknaren.dygnet)])].sort();
  for (const a of appar) {
    const d = r.raknaren.dygnet[a], s = r.raknaren.sju_dygn[a];
    ut.push(`| ${a} | ${d?.besked ?? 0} | ${d?.vaktpass ?? 0} | ${tal(d?.besked_per_vaktpass)} | ${s?.besked ?? 0} | ${s?.vaktpass ?? 0} | ${tal(s?.besked_per_vaktpass)} | ${s?.halt_vaglag_av ?? 0} |`);
  }
  if (!appar.length) ut.push("| inga rader | | | | | | | |");
  const fs = r.facitsvaren.sju_dygn.alla, fd = r.facitsvaren.dygnet.alla;
  ut.push("", "## 2. Facitsvaren på småvägsrösten", "", `Dygnet: ${fd.ja} stämde, ${fd.nej} stämde inte. Sju dygn: ${fs.ja} stämde, ${fs.nej} stämde inte (${pct(fs.andel_ja)} stämde).`, "");
  const o = r.olyckorna.sju_dygn, od = r.olyckorna.dygnet;
  ut.push("## 3. Olyckorna vid en småvägspunkt, sju dygn", "",
    `${o.olyckor} olyckor, ${o.vid_punkt} inom 0,5 km från en småvägspunkt (${o.otackta_vid_punkt} av dem utanför det mätta nätet), ${o.med_timme} med en räknad timme. I dygnet: ${od.vid_punkt} vid en punkt.`, "",
    "| Vad regeln sa vid starten | Olyckor | Varav tydligt eller troligt halkkopplade |", "|:--|--:|--:|");
  for (const k of ORSAKER) ut.push(`| ${k} | ${Object.values(o.per_orsak[k]).reduce((a, b) => a + b, 0)} | ${o.halkkopplade[k]} |`);
  ut.push("", `Började i halkaläge: ${o.i_halkalage} av ${o.med_timme} (${pct(o.andel_i_halkalage)}). Regeln var i halkaläge ${pct(o.halkalaget_andel_av_tiden)} av punkt-timmarna. Överrepresentation: ${tal(o.overrepresentation)}.`,
    "Platsen matchas på avstånd, inte på väg, och klassningen läser en station inom 15 km. Få fall: läs antalen före kvoten.", "");
  ut.push("## 4. Radarkollen: prognosens nederbörd mot radarn, dygnet", "");
  if (!r.radarkollen) ut.push("Inget underlag för dygnet.", "");
  else {
    ut.push(`${r.radarkollen.timmar_med_underlag} timmar med underlag.`, "", "| Region | Halkaläge av punkt-timmarna | Prognosen och radarn | Bara radarn | Prognosen, radarn torr senaste timmen | Prognosen utan radarrad | N3-fönstret: bekräftad | Motsagd | Okänd | Motsagd av avgjorda |",
      "|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
    for (const k of ["alla", "norr", "soder"]) {
      const x = r.radarkollen.regioner[k] as any; if (!x) continue;
      ut.push(`| ${k === "soder" ? "söder" : k} | ${pct(x.andel_halkalage)} | ${x.vackt_av.prognosen_och_radarn} | ${x.vackt_av.bara_radarn} | ${x.vackt_av.prognosen_radarn_torr} | ${x.vackt_av.prognosen_utan_radarrad} | ${x.n3_fonstret.bekraftad} | ${x.n3_fonstret.motsagd} | ${x.n3_fonstret.okand} | ${pct(x.n3_fonstret.andel_motsagd_av_avgjorda)} |`);
    }
    ut.push("", "Radarn ser lätt snö dåligt och täcker inte allt. Motsagd betyder att radarn var torr i punktens bit i alla fyra timmarna.", "");
  }
  ut.push("## 5. Driftkontrollen: röstens regel mot stationernas mätning", "");
  const s = r.driftkontrollen as any;
  if (!s.utslag) ut.push(s.lage === "sparrad" ? "Spärrad: posten 16/11 i förregistreringen är inte signerad av Bengt och Axel. Ingenting är läst."
    : s.lage === "vantar" ? "Väntar: dygnets fil från P-II finns inte än." : "Fel: driftkontrollen gick inte att räkna. Se flödets logg.", "");
  else {
    ut.push("| Region | Utslag | Sju dygn: regeln sa halka | Stationen hade halka | Träffandel | Falsklarmsandel | Lyft mot fryser | Dygnet: falsklarmsandel |", "|:--|:--|--:|--:|--:|--:|--:|--:|");
    for (const k of ["alla", "norr", "soder"]) {
      const m = s.sju_dygn?.[k]?.smavagsenheten, d = s.dygnet?.[k]?.smavagsenheten;
      const iv = (q: any) => (q && typeof q.punkt === "number" ? `${pct(q.punkt)} (${pct(q.nedre)}–${pct(q.ovre)})` : "–");
      ut.push(`| ${k === "soder" ? "söder" : k} | ${s.utslag[k]} | ${m?.sa_giltiga ?? 0} | ${m?.halka_giltiga ?? 0} | ${iv(m?.traffandel)} | ${iv(m?.falsklarmsandel)} | ${tal(m?.lyft?.punkt)} (${tal(m?.lyft?.nedre)}–${tal(m?.lyft?.ovre)}) | ${pct(d?.falsklarmsandel?.punkt)} |`);
    }
    ut.push("", "Småvägsenheten, strängare N3 ur driftens prognos, utan radarn. Facit är stationens yta på noll eller kallare och fukt, med ytvattnet. Stationerna står på mätta vägar, inte på småvägarna.", "");
  }
  return ut.join("\n");
}

function sjalvtest(): number {
  const fel: string[] = [];
  const k = (v: boolean, t: string) => { if (!v) fel.push(t); };
  const D = "2026-11-20";
  k(JSON.stringify(fonster(D)) === JSON.stringify(["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]), "fönstret är dygnet och de sex före");
  const rr: RaknarRad[] = [
    { dag: D, app: "ios", version: "0.4.0", handelse: "varning", varde: "smavag:400-800", antal: 6 },
    { dag: D, app: "ios", version: "0.4.0", handelse: "vakt_startad", varde: "sjalv", antal: 3 },
    { dag: "2026-11-19", app: "ios", version: "0.4.0", handelse: "varning", varde: "smavag:under400", antal: 2 },
    { dag: "2026-11-19", app: "ios", version: "0.4.0", handelse: "vakt_startad", varde: "hand", antal: 1 },
    { dag: D, app: "android", version: "0.4.0", handelse: "varning", varde: "smavag:800-1200", antal: 1 },
    { dag: D, app: "android", version: "0.4.0", handelse: "vakt_startad", varde: "sjalv", antal: 4 },
    { dag: D, app: "android", version: "0.4.0", handelse: "resa_slut", varde: "sjalv:15-45:parkerad", antal: 4 },
    { dag: D, app: "android", version: "0.4.0", handelse: "installning", varde: "slippery_segment:av", antal: 1 },
    { dag: D, app: "android", version: "0.4.0", handelse: "varning_ersatt", varde: "smavag", antal: 2 },
    { dag: D, app: "android", version: "0.4.0", handelse: "aktiv_dag", varde: "1-7", antal: 5 },
    { dag: "2026-11-13", app: "ios", version: "0.4.0", handelse: "varning", varde: "smavag:under400", antal: 99 },
  ];
  const dygnet = raknaren(rr, new Set([D])), sju = raknaren(rr, new Set(fonster(D)));
  k(dygnet["ios 0.4.0"].besked === 6 && dygnet["ios 0.4.0"].besked_per_vaktpass === 2, "iPhone i dygnet: sex besked på tre vaktpass");
  k(sju["ios 0.4.0"].besked === 8 && sju["ios 0.4.0"].vaktpass === 4 && sju["ios 0.4.0"].band.under400 === 2, "sju dygn tar med gårdagen men inte dygnet före fönstret");
  const an = dygnet["android 0.4.0"];
  k(an.besked === 1 && an.besked_per_vaktpass === 0.25 && an.resor["15-45"] === 4 && an.halt_vaglag_av === 1 && an.ersatta === 2 && an.aktiva_dagar === 5, "Android: alla händelserna");
  k(raknaren([{ dag: D, app: "ios", version: "", handelse: "vakt_startad", varde: "hand", antal: 1 }], new Set([D]))["ios okänd version"].besked_per_vaktpass === 0, "utan version, och noll besked ger noll per vaktpass");
  for (const [h, v] of [["varning", "smavag:okant"], ["resa_slut", "sjalv:lang:parkerad"], ["installning", "slippery_segment:kanske"], ["annat", ""]]) {
    try { raknaren([{ dag: D, app: "ios", version: "1", handelse: h, varde: v, antal: 1 }], new Set([D])); fel.push(`släppte igenom ${h} ${v}`); } catch { /* väntat */ }
  }
  const ff = facit([{ dag: D, app: "ios", version: "0.4.1", svar: "ja", antal: 3 }, { dag: D, app: "ios", version: "0.4.1", svar: "nej", antal: 1 },
    { dag: "2026-11-01", app: "ios", version: "0.4.1", svar: "nej", antal: 9 }], new Set(fonster(D)));
  k(ff.alla.ja === 3 && ff.alla.nej === 1 && ff.alla.andel_ja === 0.75 && ff.per_app["ios 0.4.1"].ja === 3, "facitsvaren: tre av fyra stämde, dygnet utanför räknas inte");
  k(facit([], new Set([D])).alla.andel_ja === null, "inga svar: ingen andel");
  const oo: OlycksRad[] = [
    { dag: D, utfall: "TYST_OTACKT", klass: "TROLIG", orsak: "varnar", talar: false, antal: 3 },
    { dag: D, utfall: "TYST_TACKT", klass: "OKLAR", orsak: "varnar", talar: false, antal: 1 },
    { dag: D, utfall: "TYST_TACKT", klass: "INTE", orsak: "fryser inte", talar: false, antal: 10 },
    { dag: D, utfall: "TYST_OTACKT", klass: "TROLIG", orsak: "torr", talar: false, antal: 2 },
    { dag: D, utfall: "TYST_TACKT", klass: "ej klassad", orsak: "ingen timme", talar: false, antal: 4 },
    { dag: D, utfall: "TYST_TACKT", klass: "TROLIG", orsak: "ingen småvägspunkt", talar: false, antal: 30 },
    { dag: "2026-11-01", utfall: "VARNADE", klass: "TYDLIG", orsak: "varnar", talar: true, antal: 7 },
  ];
  const ot = olyckor(oo, new Set([D]), 0.125);
  k(ot.olyckor === 50 && ot.vid_punkt === 20 && ot.med_timme === 16 && ot.i_halkalage === 4 && ot.otackta_vid_punkt === 5, `olyckornas antal: ${ot.olyckor}, ${ot.vid_punkt}, ${ot.med_timme}, ${ot.i_halkalage}, ${ot.otackta_vid_punkt}`);
  k(ot.andel_i_halkalage === 0.25 && ot.overrepresentation === 2 && ot.talade === 0, "fyra av sexton i halkaläge mot 12,5 % av tiden: överrepresentation 2");
  k(ot.halkkopplade.varnar === 3 && ot.halkkopplade.torr === 2 && ot.halkkopplade["ingen småvägspunkt"] === 30 && ot.per_orsak["fryser inte"].INTE === 10, "halkkopplade per orsak");
  k(olyckor(oo, new Set([D]), null).overrepresentation === null && olyckor([], new Set([D]), 0.1).andel_i_halkalage === null, "utan halkalägets andel eller utan olyckor: ingen kvot");
  try { olyckor([{ dag: D, utfall: "X", klass: "TROLIG", orsak: "okänd", talar: false, antal: 1 }], new Set([D]), null); fel.push("släppte igenom en okänd orsak"); } catch { /* väntat */ }
  const radar = (dygn: string, andel: number, timmar: number) => ({ dygn, timmar_med_underlag: timmar,
    regioner: Object.fromEntries(["alla", "norr", "soder"].map((x) => [x, { andel_halkalage: andel, vackt_av: { prognosen_och_radarn: 1, bara_radarn: 2, prognosen_radarn_torr: 3, prognosen_utan_radarrad: 4 },
      n3_fonstret: { bekraftad: 5, motsagd: 6, okand: 7, andel_motsagd_av_avgjorda: 0.5 } }])) });
  k(halkalagetIFonstret([radar(D, 0.2, 24), radar("2026-11-19", 0.1, 12), null]) === (0.2 * 24 + 0.1 * 12) / 36, "halkaläget över fönstret vägs med timmarna");
  k(halkalagetIFonstret([null]) === null, "utan radarkoll: null");
  const db: Db = { dygn: D, brytarna: [{ grupp: "N", pa: false }, { grupp: "P1", pa: false }], raknaren: rr, facit: [], olyckor: oo };
  const tidigare = [{ dygn: "2026-11-19", radarkollen: radar("2026-11-19", 0.05, 24) }, { dygn: "2026-11-01", radarkollen: radar("2026-11-01", 0.9, 24) }];
  const r1 = rapport(db, radar(D, 0.125, 24), null, "sparrad", tidigare);
  k(r1.niva.startsWith("skugga") && r1.olyckorna.dygnet.overrepresentation === 2, "rapporten: nivån skugga med brytarna av");
  k(Math.abs(r1.olyckorna.sju_dygn.halkalaget_andel_av_tiden! - (0.125 + 0.05) / 2) < 1e-12, "fönstrets halkaläge tar bara dygnen i fönstret");
  const l1 = loggrad(r1);
  k(l1 === `uppföljningen ${D}: räknaren klart; facitsvaren klart; olyckorna klart; radarkollen klart; driftkontrollen spärrad`, `loggraden: ${l1}`);
  k(!/\d/u.test(l1.replace(D, "")), "loggraden bär inga tal");
  const st = { dygn: D, utslag: { alla: "under", norr: "för få", soder: "över" }, sju_dygn: { soder: { smavagsenheten: { sa_giltiga: 321, halka_giltiga: 100,
    traffandel: { punkt: 0.4, nedre: 0.3, ovre: 0.5 }, falsklarmsandel: { punkt: 0.61, nedre: 0.5, ovre: 0.7 }, lyft: { punkt: 0.9, nedre: 0.8, ovre: 1.1 } } } }, dygnet: {} };
  const r2 = rapport({ ...db, brytarna: [{ grupp: "N", pa: true }, { grupp: "P1", pa: false }] }, null, st, "fel", []);
  k(r2.niva.startsWith("i drift") && loggrad(r2).endsWith("radarkollen saknas; driftkontrollen alla under, norr för få, söder över"), `loggraden med utslag: ${loggrad(r2)}`);
  const md1 = markdown(r1), md2 = markdown(r2);
  k(md1.includes("Spärrad: posten 16/11") && md1.includes("| ios 0.4.0 | 6 | 3 | 2,00 | 8 | 4 | 2,00 | 0 |") && md1.includes("Överrepresentation: "), "texten med spärren och räknarens rad");
  k(md2.includes("| söder | över | 321 | 100 | 40,0 % (30,0 %–50,0 %) | 61,0 % (50,0 %–70,0 %) | 0,90 (0,80–1,10) |") && md2.includes("Inget underlag för dygnet."), "texten med driftkontrollens rad");
  k(markdown(rapport(db, null, null, "vantar", [])).includes("Väntar: dygnets fil från P-II finns inte än."), "texten när dygnets fil väntar");
  if (fel.length) { console.error(`självtestet föll:\n  ${fel.join("\n  ")}`); return 1; }
  console.log("självtestet: klart");
  return 0;
}

/** Databasens tre delar för dygnet och de sex före. q kör en fråga på EN anslutning: dygnens gränser räknas i UTC, inte i sessionens
 *  zon (CLAUDE.md, #439), så zonen sätts här och inte av den som anropar. */
export async function lasDb(q: (s: string, p?: unknown[]) => Promise<{ rows: any[] }>, dygn: string): Promise<Db> {
  await q("SET TimeZone = 'UTC'");
  const las = async <T>(s: string, p: unknown[] = [dygn]) => (await q(s, p)).rows as T[];
  return { dygn, brytarna: await las(SATS.brytarna, []), raknaren: await las(SATS.raknaren), facit: await las(SATS.facit), olyckor: await las(SATS.olyckor) };
}

async function hamta(dygn: string, ut: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  try {
    writeFileSync(ut, JSON.stringify(await lasDb((s, p) => pool.query(s, p), dygn)));
    console.log(`uppföljningen ${dygn}: databasens delar lästa`);
  } finally { await pool.end(); }
}

const lasJson = (f: string) => (f === "-" || !existsSync(f) ? null : JSON.parse(readFileSync(f, "utf8")));

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const a = process.argv.slice(2), dygnOk = /^\d{4}-\d\d-\d\d$/u.test(a[1] ?? "");
  if (a[0] === "--sjalvtest") process.exit(sjalvtest());
  else if (a[0] === "db" && dygnOk && a[2]) hamta(a[1], a[2]).catch((e) => { console.error(`smavag-uppfoljning: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); });
  else if (a[0] === "rapport" && dygnOk && a.length >= 8 && ["sparrad", "vantar", "fel"].includes(a[5])) {
    const db = lasJson(a[2]) as Db | null;
    if (!db || db.dygn !== a[1]) { console.error("smavag-uppfoljning: databasens del saknas eller gäller ett annat dygn"); process.exit(1); }
    const tidigare = a.slice(8).map(lasJson).filter((x): x is Rapport => !!x && typeof x.dygn === "string");
    const r = rapport(db!, lasJson(a[3]), lasJson(a[4]), a[5] as Lage, tidigare);
    writeFileSync(a[6], JSON.stringify(r)); writeFileSync(a[7], markdown(r));
    console.log(loggrad(r));
  } else { console.error("--sjalvtest | db <dygn> <db.json> | rapport <dygn> <db.json> <radar.json|-> <stationer.json|-> <sparrad|vantar|fel> <ut.json> <ut.md> [tidigare.json …]"); process.exit(2); }
}
