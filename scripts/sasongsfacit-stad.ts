// SÄSONGSFACIT FOR THE CITIES: THE SECTION OF THE WEEKLY REPORT (docs/TROSKLAR-SASONGSFACIT.md §11, signed 19/11 2026 by Bengt and
// Axel; DECISIONS #904, #913; körlistan C3, the weekly report D1).
//
// INTERNAL. The weekly report is internal (körlistan D1 and D2). The section is published after the final report, whatever it shows,
// per area and month, and at the earliest when the kuvös has given its verdict on the city environment (§7, §11.10 question 6 (a));
// there is no publishing path here. No number from it goes into the repo, an issue or an Actions log (§11.8, #768): the script prints
// only klart or an error without a number, and refuses to write its files inside the repo.
//
// THE PARTS, per cell (area and layer, sql/089), for the week and the season so far:
//   §11.3  the hours per class and the warning hours, in drift, from the daily aggregate (sql/128), the warning hours also per month
//          and part of the day;
//   §11.4  why the rule was silent: the points per reason in the cold group hours that did not warn, ytan över 0 and the March window;
//   §11.5  the accidents within 2 km of a city point, read directly in olycksfacit, which is never thinned (sql/084, sql/096, sql/112);
//   §11.6  Stämde det? on K's warnings in the cities (driver_facit, kand:B- and kand:C-, without the test rows); Appen missade is
//          reported for the whole country (körlistan C6);
//   §11.2  the two exceptions (inte ny, undantag), apart, never added to the rest.
// The count always stands beside a share. A share is shown from 20 events (val 3), and for the answers from 30 (§11.6). The interval of
// §5 waits for the report script of körlistan C2, and the section says so. Never: a group's or a point's id, place or count per group,
// the candidate's values, a single group's hours, a single answer or the kuvös's numbers (§11.8).
//
// VÄRDEVAKTEN. Every field the section reads has a declaration in scripts/vardevakten.ts, under its table (V2), and every value it reads
// must lie inside it: otherwise the section stops with an error instead of a number. The days of the season must all be in the
// aggregate, or the section stops too.
//
//   node --experimental-strip-types scripts/sasongsfacit-stad.ts db <måndag> <db.json>      DATABASE_URL; the file outside the repo
//   node --experimental-strip-types scripts/sasongsfacit-stad.ts avsnitt <db.json> <ut.md>   the file outside the repo
// <måndag> is the Monday of the report, in Swedish time: the week is the seven days before it.
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spannFor, ordFor } from "./vardevakten.ts";

export const SASONG_SLUT = "2027-03-31";   // SASONG_SLUT: the last day of the season (§2, §11.2)
export const MINSTA_HANDELSER = 20;        // val 3: fewer events are shown as a count only
export const MINSTA_SVAR = 30;             // TROSKLAR-NYTTAN §5 (KB-D4): the answers' share from 30 answers

const AGG = "sasongsfacit_stad_dag", LAGER = "olycksfacit_lager";
/** The aggregate's counts, in the table's order (sql/128). */
export const KOLUMNER = ["timmar_raknad", "timmar_mars", "timmar_brytaren_av", "timmar_ingen_timme", "timmar_av", "timmar_ingen_korning",
  "kalla", "varnande", "timmar_varning", "tysta_punkter", "veto", "torr", "spridning", "ytan_over_0"] as const;
type Kol = (typeof KOLUMNER)[number];
const ORSAKER = ["varnar", "fukt saknades", "spridningsspärren", "veto", "yta över 0", "ingen timme", "gallrad", "inget värde", "brytaren av"];
const KLASSER = ["TYDLIG", "TROLIG", "OKLAR", "INTE", "ej klassad"];
const HALKKOPPLAD = new Set(["TYDLIG", "TROLIG"]);
const DYGNSDELAR = ["natt", "morgonrusning", "dag", "kvällsrusning", "kväll"];

/** The season's end: the day after SASONG_SLUT, or the Monday if it comes first. $1 is the Monday. */
const TILL = `least($1::date, DATE '${SASONG_SLUT}' + 1)`;
const START = `(SELECT min(d.dag) FROM ${AGG} d)`;
const LOKAL = (d: string) => `(${d})::timestamp AT TIME ZONE 'Europe/Stockholm'`;

/** The questions. $1 is the Monday; the week is [$1 - 7, $1), the season [the aggregate's first day, TILL). Read on a connection in UTC. */
export const SATS = {
  aggregat: `SELECT d.omrade, d.lager, d.niva, to_char(d.dag, 'YYYY-MM') AS manad, d.dygnsdel, d.dag >= $1::date - 7 AS vecka, count(*)::int AS rader,
      ${KOLUMNER.map((k) => `sum(d.${k})::int AS ${k}`).join(", ")}
    FROM ${AGG} d WHERE d.dag < ${TILL}
    GROUP BY 1, 2, 3, 4, 5, 6 ORDER BY 1, 2, 3, 4, 5, 6`,
  // The guard's check on the rows themselves, not on the sums: each count's smallest and largest value over the season's days.
  spann: `SELECT k.key AS kolumn, min(k.value::numeric)::float8 AS min, max(k.value::numeric)::float8 AS max
    FROM ${AGG} d CROSS JOIN LATERAL jsonb_each_text(to_jsonb(d) - 'dag' - 'omrade' - 'lager' - 'dygnsdel' - 'niva' - 'skriven_at') k
    WHERE d.dag < ${TILL} GROUP BY 1 ORDER BY 1`,
  dagar: `SELECT DISTINCT d.dag::text AS dag FROM ${AGG} d WHERE d.dag < ${TILL} ORDER BY 1`,
  // §11.5: olycksfacit's accidents without duplicates whose K detail carries stad, that is a city point within 2 km (sql/096). The road
  // points' part of K is varnande_km (sql/112), as §11.5 names it; the detail keeps it rounded to two decimals.
  olyckor: `SELECT o.start_time >= ${LOKAL("$1::date - 7")} AS vecka, l.detalj->'stad'->>'omrade' AS omrade, l.detalj->'stad'->>'lager' AS lager,
      coalesce(o.klass, 'ej klassad') AS klass, o.utfall, coalesce((l.detalj->'stad'->>'aktiv')::boolean, false) AS aktiv,
      l.detalj->'stad'->>'orsak' AS orsak, coalesce(a1.talar, false) AS a1,
      coalesce((l.detalj->>'varnande_km')::numeric <= 2, false) AS k_vag, coalesce((l.detalj->'stad'->>'talar')::boolean, false) AS k_stad,
      coalesce(a2.talar, false) AS a2, count(*)::int AS antal
    FROM olycksfacit o
    JOIN ${LAGER} l ON l.deviation_id = o.deviation_id AND l.lager = 'K'
    LEFT JOIN ${LAGER} a1 ON a1.deviation_id = o.deviation_id AND a1.lager = 'A1'
    LEFT JOIN ${LAGER} a2 ON a2.deviation_id = o.deviation_id AND a2.lager = 'A2'
    WHERE o.dubblett_av IS NULL AND l.detalj ? 'stad'
      AND o.start_time >= ${LOKAL(START)} AND o.start_time < ${LOKAL(TILL)}
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11`,
  // §11.6: the layer from the id, the area from the group in stadspunkt, or okänt when the group has left the list. Counts only.
  svar: `SELECT f.alert_t >= ${LOKAL("$1::date - 7")} AS vecka, substring(f.alert_id FROM 6 FOR 1) AS lager,
      coalesce(g.omrade, 'okänt') AS omrade, f.svar, count(*)::int AS antal
    FROM driver_facit f
    LEFT JOIN (SELECT s.grupp, min(s.omrade) AS omrade FROM stadspunkt s GROUP BY s.grupp) g ON g.grupp = substring(f.alert_id FROM 6)
    WHERE (f.alert_id LIKE 'kand:B-%' OR f.alert_id LIKE 'kand:C-%') AND NOT f.prov
      AND f.alert_t >= ${LOKAL(START)} AND f.alert_t < ${LOKAL(TILL)}
    GROUP BY 1, 2, 3, 4`,
  grans: `SELECT $1::date::text AS mandag, ($1::date - 7)::text AS vecka_fran, ${TILL}::text AS till, ${START}::text AS sasong_fran`,
};

export type Agg = { omrade: string; lager: string; niva: string; manad: string; dygnsdel: string; vecka: boolean; rader: number } & Record<Kol, number>;
export type Olycka = { vecka: boolean; omrade: string; lager: string; klass: string; utfall: string; aktiv: boolean; orsak: string;
  a1: boolean; k_vag: boolean; k_stad: boolean; a2: boolean; antal: number };
export type Svar = { vecka: boolean; omrade: string; lager: string; svar: string; antal: number };
export type Db = { mandag: string; vecka_fran: string; till: string; sasong_fran: string | null; dagar: string[]; aggregat: Agg[];
  spann: { kolumn: string; min: number; max: number }[]; olyckor: Olycka[]; svar: Svar[] };

/** The four parts from the database. q runs on ONE connection; the zone is set here, not by the caller (CLAUDE.md, #439). */
export async function lasDb(q: (s: string, p?: unknown[]) => Promise<{ rows: any[] }>, mandag: string): Promise<Db> {
  await q("SET TimeZone = 'UTC'");
  const las = async (s: string) => (await q(s, [mandag])).rows;
  const g = (await las(SATS.grans))[0];
  return { ...g, dagar: (await las(SATS.dagar)).map((r) => r.dag), aggregat: await las(SATS.aggregat), spann: await las(SATS.spann),
    olyckor: await las(SATS.olyckor), svar: await las(SATS.svar) };
}

const dag = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** VÄRDEVAKTEN and the days: a field without its declaration, a value outside it or a missing day stops the section. The messages name
 *  the field or the day, never a value (#768). */
export function granska(db: Db): void {
  for (const k of KOLUMNER) if (!spannFor(AGG, k)) throw new Error(`${AGG}.${k} saknar spann i värdevakten (OBESIKTIGAT)`);
  for (const s of db.spann) {
    const sp = spannFor(AGG, s.kolumn);
    if (!sp) throw new Error(`${AGG}.${s.kolumn} saknar spann i värdevakten (OBESIKTIGAT)`);
    if (s.min < sp[0] || s.max > sp[1]) throw new Error(`${AGG}.${s.kolumn} ligger utanför sitt spann i värdevakten`);
  }
  const ord = (tabell: string, falt: string, v: string) => {
    const o = ordFor(tabell, falt);
    if (!o) throw new Error(`${tabell}.${falt} saknar ordlista i värdevakten (OBESIKTIGAT)`);
    if (!o.ord.includes(v.toLowerCase())) throw new Error(`${tabell}.${falt}: ett ord som inte står i värdevaktens ordlista`);
  };
  for (const a of db.aggregat) for (const f of ["omrade", "lager", "dygnsdel", "niva"] as const) ord(AGG, f, a[f]);
  for (const o of db.olyckor) {
    ord(LAGER, "detalj.stad.omrade", o.omrade); ord(LAGER, "detalj.stad.lager", o.lager); ord(LAGER, "detalj.stad.orsak", o.orsak);
  }
  for (const s of db.svar) if (s.omrade !== "okänt") ord(LAGER, "detalj.stad.omrade", s.omrade);
  if (!db.sasong_fran) return;
  for (let d = db.sasong_fran; d < db.till; d = dag(d, 1))
    if (!db.dagar.includes(d)) throw new Error(`dygnet ${d} saknas i aggregatet: räkna det (sql/128) innan avsnittet skrivs`);
}

const procent = (t: number, n: number) => `${(100 * t / n).toFixed(1).replace(".", ",")} %`;
/** A share with its count beside it, or only the count under the limit. */
export function andel(t: number, n: number, minst = MINSTA_HANDELSER): string {
  return n >= minst && n > 0 ? `${t} av ${n} (${procent(t, n)})` : `${t} av ${n}`;
}
const cellnamn = (omrade: string, lager: string) => (omrade === "okänt" ? `${lager}, okänt område` : `${omrade} ${lager}`);
const summa = <T extends Record<string, any>>(rader: T[], k: keyof T) => rader.reduce((s, r) => s + Number(r[k]), 0);
const celler = <T extends { omrade: string; lager: string }>(rader: T[]) =>
  [...new Set(rader.map((r) => `${r.omrade}\u0000${r.lager}`))].sort().map((x) => x.split("\u0000") as [string, string]);
const tabell = (rubrik: string[], rader: string[][]) =>
  [`| ${rubrik.join(" | ")} |`, `|${rubrik.map(() => " --- ").join("|")}|`, ...rader.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const PERIODER = [["veckan", (r: { vecka: boolean }) => r.vecka], ["säsongen", () => true]] as const;

/** The section in Markdown, after granska(). */
export function avsnitt(db: Db): string {
  granska(db);
  const ut: string[] = [];
  const drift = db.aggregat.filter((a) => a.niva === "drift");
  const sista = dag(db.till, -1);
  ut.push("## Storstäderna (TROSKLAR-SASONGSFACIT §11)", "",
    "**Internt** (§11.8). Publiceras efter slutrapporten, per område och månad, tidigast när stadsmiljöns dom i kuvösen är fälld (§7, §11.10 fråga 6 (a)). Inga tal härifrån i repot, i ärenden eller i Actions-loggar.",
    "", db.sasong_fran ? `Veckan ${db.vecka_fran} – ${dag(db.mandag, -1)}. Säsongen hittills ${db.sasong_fran} – ${sista}.` : "Perioden har inte börjat: aggregatet har inga dygn.",
    "", `Antalet står bredvid varje andel. En andel visas från ${MINSTA_HANDELSER} händelser (val 3) och förarnas från ${MINSTA_SVAR} svar (§11.6); under det står bara antalet. **Intervallet i §5** står vid säsongsfacits andelar i veckorapportens del 3, inte per cell här.`,
    "", "Nivån är *i drift*. De två undantagen i §11.2 står för sig sist och läggs aldrig ihop med resten.");

  // §11.3 the hours per class, and the warning hours.
  const klasser: [string, Kol][] = [["räknad", "timmar_raknad"], ["brytaren av", "timmar_brytaren_av"], ["ingen timme", "timmar_ingen_timme"],
    ["av", "timmar_av"], ["ingen körning", "timmar_ingen_korning"]];
  const varning = (r: Agg[]) => [String(summa(r, "kalla")), andel(summa(r, "varnande"), summa(r, "kalla")), String(summa(r, "timmar_varning"))];
  const rader1: string[][] = [], rader2: string[][] = [];
  for (const [o, l] of celler(drift)) for (const [p, med] of PERIODER) {
    const r = drift.filter((a) => a.omrade === o && a.lager === l && med(a));
    rader1.push([cellnamn(o, l), p, ...klasser.map(([, k]) => String(summa(r, k)))]);
    rader2.push([cellnamn(o, l), p, ...varning(r)]);
  }
  ut.push("", "### Timmarna per klass (§11.3)", "", tabell(["Cell", "Period", ...klasser.map(([n]) => n)], rader1),
    "", "*Ingen timme* och *ingen körning* är förlorade timmar för storstäderna, och de hör också till veckorapportens del om driften.");
  ut.push("", "### Varningstimmarna (§11.3)", "", "En varningstimme betyder att lägesfilen bar en varning för gruppen, inte att rösten talade (§11.2).",
    "", tabell(["Cell", "Period", "kalla grupp-timmar", "varnande av de kalla", "timmar med varning i cellen"], rader2));
  const perManad: string[][] = [], perDel: string[][] = [];
  for (const [o, l] of celler(drift)) {
    const cell = drift.filter((a) => a.omrade === o && a.lager === l);
    for (const m of [...new Set(cell.map((a) => a.manad))].sort()) perManad.push([cellnamn(o, l), m, ...varning(cell.filter((a) => a.manad === m))]);
    for (const [p, med] of PERIODER) for (const d of DYGNSDELAR) {
      const r = cell.filter((a) => a.dygnsdel === d && med(a));
      if (r.length) perDel.push([cellnamn(o, l), p, d, ...varning(r)]);
    }
  }
  ut.push("", "Per månad, säsongen hittills:", "", tabell(["Cell", "Månad", "kalla grupp-timmar", "varnande av de kalla", "timmar med varning"], perManad),
    "", "Per tid på dygnet (svensk tid, §5):", "", tabell(["Cell", "Period", "Tid på dygnet", "kalla grupp-timmar", "varnande av de kalla", "timmar med varning"], perDel));

  // §11.4 why the rule was silent.
  const rader3: string[][] = [];
  for (const [o, l] of celler(drift)) for (const [p, med] of PERIODER) {
    const r = drift.filter((a) => a.omrade === o && a.lager === l && med(a)), n = summa(r, "tysta_punkter");
    rader3.push([cellnamn(o, l), p, String(n), andel(summa(r, "veto"), n), andel(summa(r, "torr"), n), andel(summa(r, "spridning"), n),
      String(summa(r, "ytan_over_0")), String(summa(r, "timmar_mars"))]);
  }
  ut.push("", "### Varför regeln teg (§11.4)", "",
    "Punkterna i de kalla grupp-timmar som inte varnade, per skäl, som summor per cell. Loggen bär bara det första villkoret som stoppade punkten, så *fukten saknades* räknas bara där inget veto gällde, och spärren bara där fukten fanns.",
    "", tabell(["Cell", "Period", "kalla punkter som teg", "vetot", "fukten saknades", "spridningsspärren", "ytan över 0 (grupp-timmar)", "marsfönstret (timmar)"], rader3),
    "", "*Brytaren av*, *ingen timme*, *av* och *ingen körning* står bland timmarna ovan.");

  // §11.5 the accidents within 2 km of a city point.
  const bedomning = (x: Olycka) => x.klass === "ej klassad" ? null : x.utfall === "VARNADE"
    ? (HALKKOPPLAD.has(x.klass) ? "RÄTT VARNING" : "VARNING, HALKA INTE BEKRÄFTAD")
    : (HALKKOPPLAD.has(x.klass) ? "MISS" : x.klass === "OKLAR" ? "OKLAR TYSTNAD" : "RÄTT TYSTNAD");
  const BEDOMNINGAR = ["RÄTT VARNING", "VARNING, HALKA INTE BEKRÄFTAD", "MISS", "OKLAR TYSTNAD", "RÄTT TYSTNAD"];
  const o1: string[][] = [], o2: string[][] = [], o3: string[][] = [], o4: string[][] = [];
  for (const [o, l] of celler(db.olyckor)) for (const [p, med] of PERIODER) {
    const r = db.olyckor.filter((x) => x.omrade === o && x.lager === l && med(x)), n = summa(r, "antal");
    const antal = (f: (x: Olycka) => boolean) => summa(r.filter(f), "antal");
    const namn = cellnamn(o, l);
    o1.push([namn, p, String(n), ...KLASSER.map((k) => String(antal((x) => x.klass === k))), String(antal((x) => x.aktiv))]);
    o2.push([namn, p, ...ORSAKER.map((k) => String(antal((x) => x.orsak === k)))]);
    o3.push([namn, p, ...BEDOMNINGAR.map((b) => String(antal((x) => bedomning(x) === b))),
      String(antal((x) => x.a1)), String(antal((x) => x.k_vag)), String(antal((x) => x.k_stad)), String(antal((x) => x.a2))]);
    const halk = r.filter((x) => HALKKOPPLAD.has(x.klass)), nh = summa(halk, "antal");
    const kVarnade = summa(halk.filter((x) => x.k_vag || x.k_stad), "antal");
    const tyst = halk.filter((x) => x.aktiv && !x.k_stad);
    o4.push([namn, p, andel(summa(halk.filter((x) => x.k_stad), "antal"), nh), andel(summa(halk.filter((x) => x.k_stad && !x.k_vag), "antal"), kVarnade),
      ORSAKER.filter((k) => k !== "varnar").map((k) => [k, summa(tyst.filter((x) => x.orsak === k), "antal")] as const).filter(([, v]) => v > 0)
        .map(([k, v]) => `${k} ${v}`).join(", ") || "–"]);
  }
  ut.push("", "### Olyckorna inom 2 km från en stadspunkt (§11.5)", "",
    "Olycksfacits bokföring utan dubbletter, uppdelad per cell; inget räknas om. Stadspunktens skäl är dess eget besked, inte alltid olyckans förbättringsområde (TROSKLAR-OLYCKSFACIT §9.3).");
  if (!db.olyckor.length) ut.push("", "Inga olyckor inom 2 km från en stadspunkt i perioden.");
  else ut.push("", tabell(["Cell", "Period", "olyckor", ...KLASSER, "brytaren på"], o1),
    "", "Stadspunktens besked:", "", tabell(["Cell", "Period", ...ORSAKER], o2),
    "", "Bedömningen (TROSKLAR-OLYCKSFACIT §9.2) och lagren som varnade:", "",
    tabell(["Cell", "Period", ...BEDOMNINGAR, "A1", "K vid vägpunkten", "K vid stadspunkten", "A2"], o3),
    "", "Vid de halkkopplade (TYDLIG och TROLIG). *Bara stadspunkten* är K:s varningar där vägpunktens del av K inte hade någon varnande punkt inom 2 km, så att huvudtabellens F4 (sql/099) går att läsa med och utan dem (§11.10 fråga 3 (a)):",
    "", tabell(["Cell", "Period", "stadspunkten varnade", "bara stadspunkten av K:s varningar", "stadspunktens skäl när den teg med brytaren på"], o4));

  // §11.6 the drivers' answers.
  const s1: string[][] = [];
  for (const [o, l] of celler(db.svar)) for (const [p, med] of PERIODER) {
    const r = db.svar.filter((x) => x.omrade === o && x.lager === l && med(x));
    const ja = summa(r.filter((x) => x.svar === "ja"), "antal"), nej = summa(r.filter((x) => x.svar === "nej"), "antal");
    s1.push([cellnamn(o, l), p, String(ja), String(nej), andel(ja, ja + nej, MINSTA_SVAR)]);
  }
  ut.push("", "### Förarnas svar (§11.6)", "", "*Stämde det?* på K:s varningar i storstäderna, utan provraderna, räknat på när varningen talade. Antalet förare går inte att läsa ur svaren.",
    "", s1.length ? tabell(["Cell", "Period", "stämde", "stämde inte", "andel stämde"], s1) : "Inga svar i perioden.",
    "", "*Appen missade* går inte att knyta till en storstad och redovisas för hela landet (körlistan C6).");

  // §11.2 the exceptions, apart.
  const undantag = db.aggregat.filter((a) => a.niva !== "drift"), u1: string[][] = [];
  for (const niva of ["inte ny", "undantag"]) for (const [o, l] of celler(undantag.filter((a) => a.niva === niva))) for (const [p, med] of PERIODER) {
    const r = undantag.filter((a) => a.niva === niva && a.omrade === o && a.lager === l && med(a));
    if (r.length) u1.push([niva, cellnamn(o, l), p, String(summa(r, "timmar_raknad")), ...varning(r)]);
  }
  ut.push("", "### Undantagen (§11.2), för sig", "",
    "*Inte ny*: timmar då beslutet i `kandidat_talar` inte sa *ny*, så att stadspunkterna inte fanns i appens regel. *Undantag*: timmar då lägesfilen inte bar stadspunkterna fast loggen skrevs (19/11 07.42–08.14 UTC, DECISIONS #903, och varje senare larm från vakthundens kontroll 3c).",
    "", u1.length ? tabell(["Nivå", "Cell", "Period", "räknade timmar", "kalla grupp-timmar", "varnande av de kalla", "timmar med varning"], u1) : "Inga undantag i perioden.");
  return ut.join("\n") + "\n";
}

const ROT = resolve(fileURLToPath(new URL("..", import.meta.url)));
/** A file inside the repo would carry the section's numbers into git (§11.8). */
export function iRepot(fil: string): boolean {
  const r = relative(ROT, resolve(fil));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
}

async function hamta(mandag: string, ut: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  try { writeFileSync(ut, JSON.stringify(await lasDb((s, p) => pool.query(s, p), mandag))); } finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const a = process.argv.slice(2), fel = (e: unknown) => { console.error(`sasongsfacit-stad: ${String((e as Error)?.message ?? e).slice(0, 200)}`); process.exit(1); };
  const utanfor = (f: string) => { if (iRepot(f)) fel("filen ska ligga utanför repot (§11.8)"); };
  if (a[0] === "db" && /^\d{4}-\d\d-\d\d$/u.test(a[1] ?? "") && new Date(`${a[1]}T12:00:00Z`).getUTCDay() === 1 && a[2]) {
    utanfor(a[2]);
    hamta(a[1], a[2]).then(() => console.log("sasongsfacit-stad: databasens delar lästa"), fel);
  } else if (a[0] === "avsnitt" && a[1] && a[2]) {
    utanfor(a[2]);
    try { writeFileSync(a[2], avsnitt(JSON.parse(readFileSync(a[1], "utf8")) as Db)); console.log("sasongsfacit-stad: avsnittet klart"); } catch (e) { fel(e); }
  } else { console.error("db <måndag> <db.json> | avsnitt <db.json> <ut.md>"); process.exit(2); }
}
