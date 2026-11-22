// THE WEEKLY REPORT (körlistan D1 and D2; docs/TROSKLAR-NYTTAN.md §7, fixed 17/11 2026 by Bengt and Axel, DECISIONS #895, #951).
//
// INTERNAL. Every Monday a report with six parts plus the deadlines, for the week (the seven Swedish days before the Monday) and the
// season so far: the operation, the reach (level 1), the correctness at a station and on the road (levels 2 and 3), the accidents
// (level 4), the cities (the section of scripts/sasongsfacit-stad.ts, §11) and the small roads, each apart, and the deadlines with
// open decisions. The report goes to Bengt (D2: "jag skickar filen till dig varje måndag"); veckorapporten.yml puts it in the private
// halkvakt-kuvos. No number from it goes into the repo, an issue or an Actions log (TROSKLAR-NYTTAN §7): the script prints only klart
// or an error without a number, and refuses to write its files inside the repo.
//
// THE LEVELS (TROSKLAR-NYTTAN §4). Everything here is *i drift* except where a line says otherwise; nothing back-computed or from a
// shadow is added to it. The count always stands beside a share, a share is shown from 20 events and the drivers' from 30 answers (§5).
// The drivers' active days are a number per day and are never summed over days (§5).
//
// VÄRDEVAKTEN. Every numeric field the report reads has a declaration in scripts/vardevakten.ts, and its smallest and largest value over
// the season must lie inside it: otherwise the report stops with an error instead of a number.
//
//   node --experimental-strip-types scripts/veckorapporten.ts db <måndag> <db.json>              DATABASE_URL (and GITHUB_TOKEN for the issues)
//   node --experimental-strip-types scripts/veckorapporten.ts rapport <db.json> <stad.md> <ut.md>  stad.md: the cities' section, or - without it
// <måndag> is the Monday of the report, in Swedish time. All files outside the repo.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { flaggaFor, spannFor } from "./vardevakten.ts";
import { andel, iRepot, MINSTA_SVAR } from "./sasongsfacit-stad.ts";
import { hamta as hamtaOlyckor } from "../supabase/functions/olycksfacit/hamta.ts";
import { BEDOMNINGAR, type Bedomning, bedomning, FORSTA_DAG, NAMNARE, type Olycka, OMRADEN, omrade, OVERLAPP, svenskDag }
  from "../supabase/functions/olycksfacit/arende.ts";

const LOKAL = (d: string) => `(${d})::timestamp AT TIME ZONE 'Europe/Stockholm'`;
const V0 = LOKAL("$1::date - 7"), V1 = LOKAL("$1::date");
const SASONG = "2026-11-01";   // the counter and säsongsfacit's complete days start here (DECISIONS #772, TROSKLAR-SASONGSFACIT §6)

/** The numeric fields the report reads, with the table they are declared under in the value guard. */
export const FALT: [string, string][] = [["app_raknare", "antal"], ["sasongsfacit_dag", "timmar"], ["sasongsfacit_dag", "varnar"],
  ["sasongsfacit_dag", "traff"], ["sasongsfacit_dag", "f1"], ["sasongsfacit_dag", "tackt"], ["sasongsfacit_ledtid", "n"],
  ["sasongsfacit_olyckor", "olyckor"], ["sasongsfacit_olyckor", "k_varnade"], ["publicera_bygge", "bygget_ms"]];

/** The questions. $1 is the Monday; the week is [$1 - 7, $1), the season [SASONG, $1). Read on a connection in UTC. */
export const SATS = {
  spann: FALT.map(([t, k]) => `SELECT '${t}' AS tabell, '${k}' AS kolumn, min(${k})::float8 AS min, max(${k})::float8 AS max FROM ${t}`).join(" UNION ALL "),
  // The operation: the hours of the week with at least one row, per chain, and the Swedish days with every hour.
  timmar: `WITH h AS (
      SELECT 'lägesfilen' AS kedja, date_trunc('hour', t) AS h FROM publicera_bygge WHERE t >= ${V0} AND t < ${V1}
      UNION SELECT 'K', date_trunc('hour', observed_at) FROM ny_kandidat_skugga_korning
        WHERE status IN ('räknad', 'redan räknad') AND observed_at >= ${V0} AND observed_at < ${V1}
      UNION SELECT 'storstäderna', date_trunc('hour', observed_at) FROM ny_kandidat_skugga_stad_korning
        WHERE status = 'räknad' AND observed_at >= ${V0} AND observed_at < ${V1}
      UNION SELECT 'småvägsrösten', date_trunc('hour', tid) FROM smavag_korning WHERE tid >= ${V0} AND tid < ${V1})
    SELECT kedja, (h AT TIME ZONE 'Europe/Stockholm')::date::text AS dag, count(*)::int AS timmar FROM h GROUP BY 1, 2 ORDER BY 1, 2`,
  bygget: `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY bygget_ms)::float8 AS median, count(*)::int AS n
    FROM publicera_bygge WHERE t >= ${V0} AND t < ${V1}`,
  raknare: `SELECT dag >= $1::date - 7 AS vecka, dag::text AS dag, app, version, handelse, varde, sum(antal)::int AS antal FROM app_raknare
    WHERE dag >= DATE '${SASONG}' AND dag < $1::date AND handelse IN ('aktiv_dag', 'vakt_startad', 'resa_slut', 'varning')
    GROUP BY 1, 2, 3, 4, 5, 6`,
  facit: `SELECT dag >= $1::date - 7 AS vecka, metod, jamforelser, sum(timmar)::int AS timmar, sum(varnar)::int AS varnar, sum(traff)::int AS traff,
      sum(f1)::int AS f1, sum(tackt)::int AS tackt FROM sasongsfacit_dag WHERE dag < $1::date GROUP BY 1, 2, 3`,
  facitdagar: `SELECT DISTINCT dag::text AS dag FROM sasongsfacit_dag WHERE dag >= $1::date - 7 AND dag < $1::date ORDER BY 1`,
  ledtid: `SELECT dag >= $1::date - 7 AS vecka, band, sum(n)::int AS n FROM sasongsfacit_ledtid WHERE dag < $1::date GROUP BY 1, 2`,
  svar: `SELECT alert_t >= ${V0} AS vecka, split_part(alert_id, ':', 1) AS slag, svar, count(*)::int AS antal FROM driver_facit
    WHERE NOT prov AND alert_t >= ${LOKAL(`DATE '${SASONG}'`)} AND alert_t < ${V1} GROUP BY 1, 2, 3`,
  missar: `SELECT t >= ${V0} AS vecka, vad, count(*)::int AS antal FROM driver_miss
    WHERE NOT prov AND t >= ${LOKAL(`DATE '${SASONG}'`)} AND t < ${V1} GROUP BY 1, 2`,
  brytare: `SELECT grupp, pa, to_char(andrad_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS andrad FROM smavagsbrytare ORDER BY 1`,
  grans: `SELECT $1::date::text AS mandag, ($1::date - 7)::text AS vecka_fran,
      round(extract(epoch FROM ${V1} - ${V0}) / 3600)::int AS veckans_timmar`,
};

type Bool = { vecka: boolean };
export type Raknare = Bool & { dag: string; app: string; version: string; handelse: string; varde: string; antal: number };
export type Facit = Bool & { metod: string; jamforelser: boolean; timmar: number; varnar: number; traff: number; f1: number; tackt: number };
export type Arende = { nummer: number; titel: string; etiketter: string[]; skapad: string; oppet: boolean };
export type Frist = { id: string; datum: string; vad: string; agare: string[] };
export type Db = {
  mandag: string; vecka_fran: string; veckans_timmar: number;
  spann: { tabell: string; kolumn: string; min: number | null; max: number | null }[];
  timmar: { kedja: string; dag: string; timmar: number }[];
  bygget: { median: number | null; n: number };
  raknare: Raknare[]; facit: Facit[]; facitdagar: string[];
  ledtid: (Bool & { band: string; n: number })[];
  svar: (Bool & { slag: string; svar: string; antal: number })[];
  missar: (Bool & { vad: string; antal: number })[];
  brytare: { grupp: string; pa: boolean; andrad: string }[];
  olyckor: Olycka[];
  arenden: Arende[] | null;   // null: GitHub was not read
  frister: Frist[];
  korlistan: { id: string; punkt: string; vem: string; lage: string }[];
};

const dag = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** The value guard: a field without its declaration, or a value outside it, stops the report. The message names the field, never a value. */
export function granska(db: Db): void {
  for (const [t, k] of FALT) if (!spannFor(t, k)) throw new Error(`${t}.${k} saknar spann i värdevakten (OBESIKTIGAT)`);
  if (!flaggaFor("sasongsfacit_dag", "jamforelser")) throw new Error("sasongsfacit_dag.jamforelser saknar flagga i värdevakten (OBESIKTIGAT)");
  for (const s of db.spann) {
    const sp = spannFor(s.tabell, s.kolumn)!;
    if (s.min !== null && s.min < sp[0] || s.max !== null && s.max > sp[1]) throw new Error(`${s.tabell}.${s.kolumn} ligger utanför sitt spann i värdevakten`);
  }
}

const summa = <T>(r: T[], f: (x: T) => number) => r.reduce((s, x) => s + f(x), 0);
const tabell = (rubrik: string[], rader: string[][]) =>
  [`| ${rubrik.join(" | ")} |`, `|${rubrik.map(() => " --- ").join("|")}|`, ...rader.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const PERIODER = [["veckan", (r: Bool) => r.vecka], ["säsongen", () => true]] as const;

/** The alert kinds by the id's prefix (engine/src), for the drivers' answers. */
export const SLAG: Record<string, string> = { seg: "hal sträcka (A1)", wx: "halkrisk vid en station (A2)", kand: "kandidaten (K)", smv: "småvägsrösten",
  bro: "bro", dev: "olycka eller hinder", cam: "kamera", vilt: "vilt", djur: "djur på vägen" };
const FAROR: Record<string, string> = { accident: "olycka", slippery_segment: "hal sträcka", icing_point: "halkrisk vid en station", wildlife: "vilt",
  camera: "kamera", kandidat: "kandidaten (K)", smavag: "småvägsrösten" };

/** The report in Markdown, after granska(). stad is the cities' section, or null. */
export function rapport(db: Db, stad: string | null): string {
  granska(db);
  const sista = dag(db.mandag, -1), ut: string[] = [];
  const veckodagar = Array.from({ length: 7 }, (_, i) => dag(db.vecka_fran, i));
  ut.push(`# Veckorapporten ${db.mandag}`, "",
    "**Intern** (körlistan D1 och D2, TROSKLAR-NYTTAN §7). Inga tal härifrån i repot, i ärenden eller i Actions-loggar.", "",
    `Veckan ${db.vecka_fran} – ${sista}. Säsongen hittills ${SASONG} – ${sista}, olycksfacit från ${FORSTA_DAG}. Allt är *i drift* om inte raden säger annat (§4). Antalet står bredvid varje andel; en andel visas från 20 händelser och förarnas från ${MINSTA_SVAR} svar (§5).`);

  // 1. The operation.
  const kedjor = ["lägesfilen", "K", "storstäderna", "småvägsrösten"];
  ut.push("", "## 1. Driften", "", "Timmar i veckan med minst en körning per kedja, av veckans " + db.veckans_timmar + ", och dygn där varje timme har en körning.", "",
    tabell(["Kedja", "timmar med körning", "förlorade timmar", "kompletta dygn av 7"], kedjor.map((k) => {
      const r = db.timmar.filter((x) => x.kedja === k), t = summa(r, (x) => x.timmar);
      return [k, String(t), String(db.veckans_timmar - t), String(veckodagar.filter((d) => (r.find((x) => x.dag === d)?.timmar ?? 0) >= 24).length)];
    })), "",
    "*Lägesfilen* räknas ur `publicera_bygge`, som vakthunden sparar varje timme: en timme utan rad kan också vara en timme då vakthunden inte sparade. *K* och *storstäderna* räknar kandidatens timmar, *småvägsrösten* regelns.",
    "", db.bygget.n ? `Publiceringens bygge av lägesfilen: medianen ${(db.bygget.median! / 1000).toFixed(1).replace(".", ",")} s på ${db.bygget.n} byggen.` : "Publiceringens bygge: inga byggen sparade i veckan.");
  if (db.arenden === null) ut.push("", "Ärendena gick inte att läsa ur GitHub den här gången.");
  else {
    const veckans = db.arenden.filter((a) => a.skapad >= db.vecka_fran && a.skapad <= sista);
    const etiketter = [...new Set(veckans.flatMap((a) => a.etiketter.length ? a.etiketter : ["utan etikett"]))].sort();
    ut.push("", `Ärenden öppnade i veckan (larmen): ${veckans.length}, och ${veckans.filter((a) => a.oppet).length} av dem står öppna.`,
      ...(veckans.length ? ["", tabell(["Etikett", "öppnade", "står öppna"], etiketter.map((e) => {
        const r = veckans.filter((a) => (a.etiketter.length ? a.etiketter : ["utan etikett"]).includes(e));
        return [e, String(r.length), String(r.filter((a) => a.oppet).length)];
      }))] : []));
  }
  const pass = db.raknare.filter((r) => r.handelse === "resa_slut");
  const appar = [...new Set(pass.map((r) => `${r.app} ${r.version || "(utan version)"}`))].sort();
  ut.push("", "Vaktpassen som slutade *avbruten* (körlistan B4), per app och version:", "",
    appar.length ? tabell(["App och version", "Period", "pass", "avbrutna"], appar.flatMap((a) => PERIODER.map(([p, med]) => {
      const r = pass.filter((x) => `${x.app} ${x.version || "(utan version)"}` === a && med(x));
      return r.length ? [a, p, String(summa(r, (x) => x.antal)), andel(summa(r.filter((x) => x.varde.endsWith(":avbruten")), (x) => x.antal), summa(r, (x) => x.antal))] : null;
    }).filter((x): x is string[] => x !== null))) : "Inga vaktpass i räknaren.");

  // 2. The reach.
  const varning = db.raknare.filter((r) => r.handelse === "varning");
  ut.push("", "## 2. Räckvidden (nivå 1)", "", "Ur den anonyma räknaren. Räknaren räknar händelser, inte människor (§6).", "",
    "Varningar som rösten sa, per fara:", "",
    tabell(["Fara", "veckan, iPhone", "veckan, Android", "säsongen, iPhone", "säsongen, Android"], Object.entries(FAROR).map(([k, n]) => {
      const r = varning.filter((x) => x.varde.startsWith(k + ":"));
      const s = (vecka: boolean, app: string) => String(summa(r.filter((x) => x.app === app && (!vecka || x.vecka)), (x) => x.antal));
      return [n, s(true, "ios"), s(true, "android"), s(false, "ios"), s(false, "android")];
    })), "",
    "Aktiva förare per dygn: ett tal per dygn, som aldrig läggs ihop över dygnen till ett antal förare (§5). Vaktpass som startade samma dygn bredvid:", "",
    tabell(["Dygn", "aktiva, iPhone", "aktiva, Android", "vaktpass startade"], veckodagar.map((d) => {
      const r = db.raknare.filter((x) => x.dag === d);
      const s = (h: string, app?: string) => String(summa(r.filter((x) => x.handelse === h && (!app || x.app === app)), (x) => x.antal));
      return [d, s("aktiv_dag", "ios"), s("aktiv_dag", "android"), s("vakt_startad")];
    })));

  // 3. The correctness.
  const saknas = veckodagar.filter((d) => !db.facitdagar.includes(d));
  ut.push("", "## 3. Riktigheten (nivå 2 och 3)", "", "### Vid en mätpunkt: säsongsfacit (TROSKLAR-SASONGSFACIT)", "",
    saknas.length ? `Dygn i veckan som säsongsfacit inte har räknat: ${saknas.join(", ")}.` : "Säsongsfacit har räknat veckans alla dygn.", "",
    "Träffsäkerheten är de varnande sträcktimmarna med F1 inom −1..+2 h; täckningen F1-timmarna där metoden varnade inom −2..0 h. J1 och J2 räknas bara på dygn med stationsrader.", "",
    tabell(["Metod", "Period", "sträcktimmar", "varnande", "träffsäkerhet", "F1-timmar", "täckning"], ["K", "J1", "J2"].flatMap((m) => PERIODER.map(([p, med]) => {
      const r = db.facit.filter((x) => x.metod === m && med(x) && (m === "K" || x.jamforelser));
      const s = (f: (x: Facit) => number) => summa(r, f);
      return [m, p, String(s((x) => x.timmar)), String(s((x) => x.varnar)), andel(s((x) => x.traff), s((x) => x.varnar)), String(s((x) => x.f1)), andel(s((x) => x.tackt), s((x) => x.f1))];
    }))), "", "Ledtiden: hur långt före varje början på F1 som K varnade.", "",
    tabell(["Period", "samma timme", "1–3 h", "4–6 h", "ingen"], PERIODER.map(([p, med]) => {
      const r = db.ledtid.filter(med), n = summa(r, (x) => x.n);
      return [p, ...["samma timme", "1–3 h", "4–6 h", "ingen"].map((b) => andel(summa(r.filter((x) => x.band === b), (x) => x.n), n))];
    })), "",
    "**Saknas ännu** (körlistan C2): A1:s fördröjning, A2:s leverans, kamerabilderna, falsklarmen per 100 km, takten och intervallen. Månadsläsningen 1/12 är första fristen.");
  const slag = [...new Set(db.svar.map((x) => x.slag))].sort();
  ut.push("", "### På vägen: förarnas svar", "", "*Stämde det?* utan provraderna, per varningsslag ur varningens id. Antalet förare går inte att läsa ur svaren (§5).", "",
    slag.length ? tabell(["Slag", "Period", "stämde", "stämde inte", "andel stämde"], slag.flatMap((s) => PERIODER.map(([p, med]) => {
      const r = db.svar.filter((x) => x.slag === s && med(x)), ja = summa(r.filter((x) => x.svar === "ja"), (x) => x.antal), nej = summa(r.filter((x) => x.svar === "nej"), (x) => x.antal);
      return [SLAG[s] ?? s, p, String(ja), String(nej), andel(ja, ja + nej, MINSTA_SVAR)];
    }))) : "Inga svar under säsongen.", "",
    "*Appen missade*, utan provraderna:", "",
    tabell(["Vad", "veckan", "säsongen"], ["halka", "vatten", "vilt", "olycka", "annat"].map((v) => [v,
      String(summa(db.missar.filter((x) => x.vad === v && x.vecka), (x) => x.antal)), String(summa(db.missar.filter((x) => x.vad === v), (x) => x.antal))])),
    "", "Provkörningarna efter provlistan har inget protokoll ännu (körlistan C6).");

  // 4. The accidents.
  const s = db.olyckor.filter((o) => !o.dubblett && bedomning(o) !== null);
  const veckans = s.filter((o) => svenskDag(o.tid) >= db.vecka_fran);
  const halk = (x: Olycka[]) => x.filter((o) => o.klass === "TYDLIG" || o.klass === "TROLIG");
  const bed = (b: Bedomning, x: Olycka[]) => String(x.filter((o) => bedomning(o) === b).length);
  ut.push("", "## 4. Olyckorna (nivå 4)", "",
    "Olycksfacit utan dubbletter, med samma regler som sidan Olyckor (TROSKLAR-OLYCKSFACIT §9.2). Får sägas utåt: *Halkvakt hade en aktiv varning på platsen när olyckan började*, med lagret och säsongens andel bredvid (§9.6).", "",
    tabell(["Period", "klassade olyckor", "halkkopplade", ...BEDOMNINGAR], [["veckan", veckans], ["säsongen", s]].map(([p, x]) =>
      [p as string, String((x as Olycka[]).length), String(halk(x as Olycka[]).length), ...BEDOMNINGAR.map((b) => bed(b, x as Olycka[]))])), "",
    "De halkkopplade olyckorna där lagret talade vid starten, per lager:", "",
    tabell(["Lager", "veckan", "säsongen"], OVERLAPP.map(([rad, f]) => [rad, andel(halk(veckans).filter((o) => f(o.talade)).length, halk(veckans).length),
      andel(halk(s).filter((o) => f(o.talade)).length, halk(s).length)])), "",
    "Olyckorna per klass, och hur många där något lager varnade:", "",
    tabell(["Klass", "veckan", "säsongen"], NAMNARE.map(([k, f]) => [k, ...[veckans, s].map((x) => andel(x.filter(f).filter((o) => o.utfall === "VARNADE").length, x.filter(f).length))])));
  const omr = OMRADEN.map((a) => [a, veckans.filter((o) => omrade(o) === a).length, s.filter((o) => omrade(o) === a).length] as const).filter(([, , n]) => n > 0);
  if (omr.length) ut.push("", "Missarna per förbättringsområde:", "", tabell(["Område", "veckan", "säsongen"], omr.map(([a, v, n]) => [a, String(v), String(n)])));

  // 5. The cities.
  ut.push("", "## 5. Storstäderna", "");
  ut.push(stad ? stad.replace(/^(#+) /gmu, "#$1 ").replace(/^### Storstäderna[^\n]*\n/u, "").trim() : "Avsnittet saknas den här veckan: skriptet `sasongsfacit-stad.ts` skrev inget.");

  // 6. The small roads.
  const smv = varning.filter((x) => x.varde.startsWith("smavag:"));
  const svarSmv = db.svar.filter((x) => x.slag === "smv");
  const olySmv = s.filter((o) => o.talade.includes("smavag"));
  ut.push("", "## 6. Småvägarna", "",
    "Brytarna: " + (db.brytare.length ? db.brytare.map((b) => `${b.grupp} ${b.pa ? "på" : "av"} (ändrad ${b.andrad})`).join(", ") : "inga rader") +
      ". Med brytarna av är talen nedan noll, eftersom ingen förare hör rösten.", "",
    tabell(["", "veckan", "säsongen"], [
      ["besked som rösten sa (iPhone och Android)", String(summa(smv.filter((x) => x.vecka), (x) => x.antal)), String(summa(smv, (x) => x.antal))],
      ["svar stämde", String(summa(svarSmv.filter((x) => x.vecka && x.svar === "ja"), (x) => x.antal)), String(summa(svarSmv.filter((x) => x.svar === "ja"), (x) => x.antal))],
      ["svar stämde inte", String(summa(svarSmv.filter((x) => x.vecka && x.svar === "nej"), (x) => x.antal)), String(summa(svarSmv.filter((x) => x.svar === "nej"), (x) => x.antal))],
      ["olyckor där småvägsrösten talade vid starten", String(olySmv.filter((o) => svenskDag(o.tid) >= db.vecka_fran).length), String(olySmv.length)],
    ]), "",
    "Driftkontrollen, radarkollen och olyckorna vid småvägspunkterna står i uppföljningens dygnsrapporter i den privata hinken (DECISIONS #883) och upprepas inte här. Kuvösens småvägsprov är spärrat till 1/3 och 1/4.");

  // 7. Deadlines and open decisions.
  const om21 = dag(db.mandag, 21);
  const frister = db.frister.filter((f) => f.datum <= om21).sort((a, b) => a.datum.localeCompare(b.datum));
  ut.push("", "## 7. Frister och öppna beslut", "", `Fristerna i \`docs/fristerna.json\` till och med ${om21}, och de som har passerat:`, "",
    frister.length ? tabell(["Datum", "Vad", "Ägare"], frister.map((f) => [f.datum + (f.datum < db.mandag ? " (passerad)" : ""), f.vad.split(/(?<=[.:])\s/u)[0].replace(/\|/gu, "/"), f.agare.join(", ")])) : "Inga.");
  if (db.arenden) {
    const lyft = db.arenden.filter((a) => a.oppet && a.etiketter.some((e) => ["frist", "dom", "olycka"].includes(e)));
    ut.push("", "Öppna ärenden med etiketterna frist, dom och olycka:", "", lyft.length ? lyft.map((a) => `- #${a.nummer} ${a.titel.replace(/\|/gu, "/")}`).join("\n") : "Inga.");
  }
  ut.push("", "Körlistans öppna punkter där Bengt eller Axel har ett ord att säga (kolumnen *Vem*):", "",
    db.korlistan.length ? tabell(["Punkt", "Vem", "Läget i början"], db.korlistan.map((k) => [`${k.id} ${k.punkt}`, k.vem, k.lage])) : "Inga.");
  return ut.join("\n") + "\n";
}

/** The körlistan rows that wait for Bengt's or Axel's word: not klar or struken, and Vem names them. Only words (KÖRLISTEREGELN 7). */
export function korlistan(md: string): Db["korlistan"] {
  const ut: Db["korlistan"] = [];
  for (const rad of md.split("\n")) {
    const c = rad.split(" | ").map((x) => x.replace(/^\| ?| ?\|$/gu, "").trim());
    if (c.length < 6 || !/^[BCD]\d+$/u.test(c[0])) continue;
    const lage = c[c.length - 1], vem = c[2];
    if (/^(klar|struken)/u.test(lage) || !/\bni\b|ert ord|Bengt|Axel/u.test(vem)) continue;
    const punkt = (c[1].match(/^\*\*(.+?)\*\*/u)?.[1] ?? c[1]).replace(/[.:]$/u, "");
    ut.push({ id: c[0], punkt, vem, lage: lage.split(/[:.(]/u)[0].trim() });
  }
  return ut;
}

/** The repo's issues created since the season began, without pull requests. Public data: titles and labels only. */
async function arenden(token: string, repo: string, sedan: string): Promise<Arende[]> {
  const ut: Arende[] = [];
  for (let sida = 1; sida <= 20; sida++) {
    const r = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&since=${sedan}T00:00:00Z&per_page=100&page=${sida}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`GitHub svarade ${r.status}`);
    const s = (await r.json()) as any[];
    for (const a of s) if (!a.pull_request) ut.push({ nummer: a.number, titel: a.title, etiketter: a.labels.map((l: any) => l.name),
      skapad: svenskDag(a.created_at), oppet: a.state === "open" });
    if (s.length < 100) return ut;
  }
  throw new Error("fler än 2 000 ärenden: dela upp läsningen");
}

const ROT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** The database's parts, GitHub's issues and the repo's deadlines and körlistan. q runs on ONE connection, in UTC (CLAUDE.md, #439). */
export async function lasDb(q: (s: string, p?: unknown[]) => Promise<{ rows: any[] }>, mandag: string): Promise<Db> {
  await q("SET TimeZone = 'UTC'");
  const las = async (s: string, p: unknown[] = [mandag]) => (await q(s, p)).rows;
  // olycksfacit/hamta.ts is written for postgres.js's tagged template: the same text with $1, $2 … for pg.
  const tagg = (d: TemplateStringsArray, ...v: unknown[]) => ({ then: (ok: (x: any[]) => void, nej: (e: unknown) => void) =>
    q(d.reduce((a, s, i) => a + `$${i}` + s), v).then((r) => ok(r.rows), nej) });
  const g = (await las(SATS.grans))[0];
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY ?? "Axelstar/Halkvakt";
  let a: Arende[] | null = null;
  if (token) try { a = await arenden(token, repo, SASONG); } catch { a = null; }
  const fr = JSON.parse(readFileSync(resolve(ROT, "docs/fristerna.json"), "utf8")).frister as Frist[];
  return { ...g, spann: await las(SATS.spann, []), timmar: await las(SATS.timmar), bygget: (await las(SATS.bygget))[0],
    raknare: await las(SATS.raknare), facit: await las(SATS.facit), facitdagar: (await las(SATS.facitdagar)).map((r) => r.dag),
    ledtid: await las(SATS.ledtid), svar: await las(SATS.svar), missar: await las(SATS.missar), brytare: await las(SATS.brytare, []),
    olyckor: await hamtaOlyckor(tagg, FORSTA_DAG, dag(mandag, -1)), arenden: a,
    frister: fr.map((f) => ({ id: f.id, datum: f.datum, vad: f.vad, agare: f.agare })),
    korlistan: korlistan(readFileSync(resolve(ROT, "docs/KORLISTAN.md"), "utf8")) };
}

async function hamta(mandag: string, ut: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const klient = await pool.connect();
  try { writeFileSync(ut, JSON.stringify(await lasDb((s, p) => klient.query(s, p), mandag))); } finally { klient.release(); await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const a = process.argv.slice(2), fel = (e: unknown) => { console.error(`veckorapporten: ${String((e as Error)?.message ?? e).slice(0, 200)}`); process.exit(1); };
  const utanfor = (f: string) => { if (iRepot(f)) fel("filen ska ligga utanför repot (TROSKLAR-NYTTAN §7)"); };
  if (a[0] === "db" && /^\d{4}-\d\d-\d\d$/u.test(a[1] ?? "") && new Date(`${a[1]}T12:00:00Z`).getUTCDay() === 1 && a[2]) {
    utanfor(a[2]);
    hamta(a[1], a[2]).then(() => console.log("veckorapporten: delarna lästa"), fel);
  } else if (a[0] === "rapport" && a[1] && a[2] && a[3]) {
    utanfor(a[3]);
    try {
      const stad = a[2] === "-" ? null : readFileSync(a[2], "utf8");
      writeFileSync(a[3], rapport(JSON.parse(readFileSync(a[1], "utf8")) as Db, stad));
      console.log("veckorapporten: rapporten klar");
    } catch (e) { fel(e); }
  } else { console.error("db <måndag> <db.json> | rapport <db.json> <stad.md|-> <ut.md>"); process.exit(2); }
}
