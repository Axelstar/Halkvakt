// DECISIONS #913, körlistan C3 (docs/TROSKLAR-SASONGSFACIT.md §11, signed 19/11, DECISIONS #904): the cities in säsongsfacit. These
// tests need no database; the aggregate's rows, the bucket's path and the counter-tests on the SQL are in test/integration.test.ts
// (#913), against PostGIS in ci.
//   1. sql/128 writes only its own two tables, creates no rule function, and its functions have a fixed search path and UTC
//   2. the value guard (§11.7 V1–V4): the four tables in TID; every count of the city log and the aggregate under its table, with bounds
//      from the schema and never from the point list; the words from the migrations and from §11.5; the keys in jsonb; and no number
//      from a city table in its output
//   3. the section (§11.8): internal, the count beside every share, a share from 20 events and the answers' from 30, the exceptions
//      apart, no interval until C2, and a stop instead of a number when a field is undeclared, outside its span, an unknown word or a
//      day is missing; its files never inside the repo
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPANN, ORD, FLAGGOR, JSONB, UTAN_TAL, spannFor, ordFor, flaggaFor, doma, domaOrd, utanTal, type Dom } from "../scripts/vardevakten.ts";
import { SATS, KOLUMNER, SASONG_SLUT, avsnitt, granska, andel, iRepot, type Db, type Agg } from "../scripts/sasongsfacit-stad.ts";

const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const utanKommentarer = (s: string) => s.replace(/--[^\n]*/g, "");
const MIG = las("sql/128_sasongsfacit_stad.sql");
const S096 = las("sql/096_olycksfacit_stad.sql");
const S089 = las("sql/089_stadspunkter.sql");
const DOK = las("docs/TROSKLAR-SASONGSFACIT.md");

/** The columns of a CREATE TABLE: [name, type]. */
function kolumner(tabell: string, mig: string): [string, string][] {
  const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${tabell} \\(([\\s\\S]*?)\\n\\);`).exec(utanKommentarer(mig));
  assert.ok(m, `the migration creates ${tabell}`);
  return m![1].split("\n").map((r) => r.trim()).filter((r) => r && !r.startsWith("PRIMARY KEY"))
    .map((r) => { const [namn, typ] = r.split(/\s+/); return [namn, typ.replace(/,$/, "")]; });
}
const checkLista = (text: string, kolumn: string) =>
  [...new RegExp(`${kolumn}\\s+text NOT NULL CHECK \\(${kolumn} IN \\(([^)]*)\\)\\)`).exec(text)![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);

// The schema's bounds (sql/089): a point id is a layer letter and five digits, and a group has one layer.
const SIFFROR = Number(/punkt ~ '\^\[BC\]\[0-9\]\{(\d+)\}\$'/.exec(S089)![1]);
const LAGREN = [.../lager IN \(([^)]*)\)/.exec(S089)![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const PER_GRUPP = 10 ** SIFFROR, TIMMAR = 25;

test("#913 sql/128 writes only its own two tables, creates no rule function, and fixes the search path and UTC", () => {
  const t = utanKommentarer(MIG);
  const skapade = [...t.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (\w+)\(/g)].map((m) => m[1]).sort();
  assert.deepEqual(skapade, ["sasongsfacit_stad_filrader", "sasongsfacit_stad_karna", "sasongsfacit_stad_rakna", "sasongsfacit_stad_rakna_ur_hinken"]);
  assert.ok(!/DROP FUNCTION|ALTER FUNCTION|DROP TABLE/.test(t), "nothing is dropped or altered");
  for (const m of t.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+(\w+)/g))
    assert.ok(["sasongsfacit_stad_dag", "sasongsfacit_stad_undantag"].includes(m[1]), `sql/128 writes only its own tables: ${m[0]}`);
  for (const m of t.matchAll(/\bALTER TABLE (\w+)/g))
    assert.ok(["sasongsfacit_stad_dag", "sasongsfacit_stad_undantag"].includes(m[1]), `only its own tables: ${m[0]}`);
  for (const f of ["sasongsfacit_stad_karna", "sasongsfacit_stad_rakna", "sasongsfacit_stad_rakna_ur_hinken"]) {
    const huvud = t.slice(t.indexOf(`CREATE OR REPLACE FUNCTION ${f}(`)).slice(0, 400);
    assert.match(huvud, /LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS/, `${f}: fixed search path (#784) and UTC (#439)`);
  }
  // The file reader is a sql function and gets no SET clause, so it can be inlined; it is called once per call, never per row (#783).
  const fil = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION sasongsfacit_stad_filrader("));
  assert.match(fil.slice(0, 200), /LANGUAGE sql IMMUTABLE AS/);
  assert.deepEqual([...t.matchAll(/FROM sasongsfacit_stad_filrader\((\w+)\)/g)].map((m) => m[1]), ["p_logg", "p_korning"],
    "the files are read once per table in a call");
  // The functions answer in words, never with a number (#768): every RETURN is a literal or the core.
  for (const m of t.matchAll(/RETURN ([^;]+);/g)) assert.match(m[1], /^'[^'%]+'$|^sasongsfacit_stad_karna\(/, `RETURN ${m[1]}`);
  for (const m of t.matchAll(/RAISE EXCEPTION '([^']*)', ([^;]+);/g)) assert.equal(m[2].trim(), "p_dag", "the error names the day, never a count");
  // No rule function is read or written except through the city log (the section is a report, §11.1).
  for (const f of ["ny_kandidat_regel", "kandidat_regel", "talande_regel", "ny_kandidat_logga_stad"]) assert.ok(!t.includes(f), `sql/128 does not call ${f}()`);
  // The schedule and the RLS.
  assert.match(t, /cron\.schedule\('halkvakt-sasongsfacit-stad', '37 3 \* \* \*'/);
  for (const tb of ["sasongsfacit_stad_dag", "sasongsfacit_stad_undantag"]) assert.match(t, new RegExp(`ALTER TABLE ${tb} ENABLE ROW LEVEL SECURITY;`));
  assert.ok(!/GRANT [^;]* TO (anon|authenticated)/.test(t), "anon and authenticated get nothing");
});

test("#913 the aggregate's cells, parts of the day and the exception 19/11 come from the migrations and §11.2", () => {
  assert.deepEqual(checkLista(MIG, "dygnsdel"), ["natt", "morgonrusning", "dag", "kvällsrusning", "kväll"], "the parts of the day are §5's");
  assert.deepEqual(checkLista(las("sql/099_sasongsfacit.sql"), "dygnsdel"), checkLista(MIG, "dygnsdel"), "the same parts as sql/099");
  assert.match(DOK, /19\/11 kl\. 07\.42–08\.14 UTC/, "§11.2 names the interval");
  assert.match(MIG, /\('2026-11-19 07:42:00\+00', '2026-11-19 08:14:00\+00', '[^']*DECISIONS #903\)'\)/, "the seed row is §11.2's interval");
  assert.match(utanKommentarer(MIG), /FROM stadsbrytare c CROSS JOIN timmar t/, "the cells are the switches (sql/089)");
  assert.equal(SASONG_SLUT, "2027-03-31", "the season ends 31/3 2027 (§2)");
  assert.match(DOK, /från 1\/11 2026 till 31\/3 2027/);
});

test("#913 the value guard: the four tables in TID, and every field with its declaration under its table (V1–V3)", () => {
  const vakt = las("scripts/vardevakten.ts");
  for (const [t, k] of [["ny_kandidat_skugga_stad", "observed_at"], ["ny_kandidat_skugga_stad_korning", "korning"], ["olycksfacit_lager", ""],
    ["sasongsfacit_stad_dag", "dag"]]) assert.match(vakt, new RegExp(`\\b${t}: "${k}"`), `${t} is in TID`);
  // The city log (sql/096): every count under its own table with the schema's bound, not the road points' 0–64.
  for (const [namn, typ] of kolumner("ny_kandidat_skugga_stad", S096)) {
    if (typ === "int") {
      const s = SPANN[`ny_kandidat_skugga_stad.${namn}`];
      assert.ok(s, `ny_kandidat_skugga_stad.${namn}: a span under its table`);
      assert.deepEqual(s.slice(0, 2), [0, PER_GRUPP], `ny_kandidat_skugga_stad.${namn}: the schema's bound`);
      assert.ok(SPANN[namn][1] < PER_GRUPP, `${namn}: the road points' span stays as it was`);
    } else if (typ === "real") assert.ok(spannFor("ny_kandidat_skugga_stad", namn), `${namn}: a declared span`);
    else if (typ === "text" && namn !== "grupp") assert.ok(ordFor("ny_kandidat_skugga_stad", namn), `${namn}: a word list`);
  }
  for (const [namn, typ] of kolumner("ny_kandidat_skugga_stad_korning", S096)) {
    if (typ === "int") assert.deepEqual(SPANN[`ny_kandidat_skugga_stad_korning.${namn}`].slice(0, 2), [0, LAGREN.length * PER_GRUPP], `korning.${namn}`);
    if (typ === "jsonb") assert.ok(JSONB.some((j) => j.tabell === "ny_kandidat_skugga_stad_korning" && j.falt === namn && j.slag === "lista"), `korning.${namn} in JSONB`);
  }
  assert.deepEqual([...ordFor("ny_kandidat_skugga_stad_korning", "status")!.ord].sort(), [...checkLista(S096, "status")].sort(), "the run's words are its check");
  // The aggregate (sql/128): hours bounded by a day's 25, group and point hours by 100 000 times 25, groups by 100 000.
  for (const [namn, typ] of kolumner("sasongsfacit_stad_dag", MIG)) {
    if (typ === "int") {
      const s = SPANN[`sasongsfacit_stad_dag.${namn}`];
      assert.ok(s, `sasongsfacit_stad_dag.${namn}: a span under its table`);
      const hi = namn.startsWith("timmar") ? TIMMAR : namn === "grupper" ? PER_GRUPP : PER_GRUPP * TIMMAR;
      assert.deepEqual(s.slice(0, 2), [0, hi], `sasongsfacit_stad_dag.${namn}: the schema's bound`);
    } else if (typ === "text") {
      const o = ordFor("sasongsfacit_stad_dag", namn);
      assert.ok(o, `sasongsfacit_stad_dag.${namn}: a word list`);
      if (namn === "dygnsdel" || namn === "niva") assert.deepEqual([...o!.ord].sort(), checkLista(MIG, namn).sort(), `${namn}: the table's check`);
    } else assert.ok(["date", "timestamptz"].includes(typ), `sasongsfacit_stad_dag.${namn}: a type the test knows`);
  }
  assert.deepEqual([...KOLUMNER].sort(), kolumner("sasongsfacit_stad_dag", MIG).filter(([n, t]) => t === "int" && n !== "grupper").map(([n]) => n).sort(),
    "the section reads every count of the aggregate but the groups");
  // The areas and layers are sql/089's, also in the accident detail.
  const brytare = [...S089.slice(S089.indexOf("INSERT INTO stadsbrytare")).matchAll(/\('([^']+)', '([BC])'\)/g)].map((x) => [x[1].toLowerCase(), x[2].toLowerCase()]);
  assert.deepEqual([...ordFor("olycksfacit_lager", "detalj.stad.omrade")!.ord].sort(), [...new Set(brytare.map((b) => b[0]))].sort());
  assert.deepEqual([...ordFor("olycksfacit_lager", "detalj.stad.lager")!.ord].sort(), LAGREN.map((l) => l.toLowerCase()).sort());
  // olycksfacit_lager: its lager is the accident layers of its check, not the city layers.
  const s110 = las("sql/110_olycksfacit_upplagg.sql");
  const lagret = [.../CHECK \(lager IN \(([^)]*)\)\)/.exec(s110)![1].matchAll(/'([^']+)'/g)].map((x) => x[1].toLowerCase());
  assert.deepEqual([...ordFor("olycksfacit_lager", "lager")!.ord].sort(), lagret.sort(), "olycksfacit_lager.lager is sql/110's check");
  assert.ok(flaggaFor("olycksfacit_lager", "talar"), "which layers warned is a declared flag");
});

test("#913 the keys in jsonb (V4): declared, and the city point's words are §11.5's", () => {
  for (const j of JSONB) {
    const d = j.slag === "tal" ? spannFor(j.tabell, j.falt) : j.slag === "flagga" ? flaggaFor(j.tabell, j.falt) : ordFor(j.tabell, j.falt);
    assert.ok(d, `${j.tabell}.${j.falt}: declared`);
  }
  for (const f of ["detalj.stad.aktiv", "detalj.stad.talar", "detalj.stad.orsak", "detalj.stad.omrade", "detalj.stad.lager", "detalj.stad.varnande_km", "detalj.varnande_km"])
    assert.ok(JSONB.some((j) => j.tabell === "olycksfacit_lager" && j.falt === f), `${f}: §11.7's table names it`);
  const rad = /stadspunktens besked \(`orsak`\): ([^;]+);/.exec(DOK)![1];
  const ord = [...rad.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);
  assert.equal(ord.length, 9, "§11.5 lists nine answers");
  assert.deepEqual([...ordFor("olycksfacit_lager", "detalj.stad.orsak")!.ord].sort(), ord.sort(), "the word list is §11.5's");
  // The words are also the ones olycksfacit_k_stad() writes (sql/100), besides the outcomes it copies from the log.
  const s100 = las("sql/100_olycksfacit_rattelse.sql");
  for (const w of ["brytaren av", "ingen timme", "yta över 0", "varnar", "fukt saknades", "spridningsspärren", "gallrad", "inget värde"])
    assert.ok(s100.includes(`'${w}'`), `sql/100 writes ${w}`);
  assert.equal(SPANN["olycksfacit_lager.detalj.stad.varnande_km"][2].includes("km"), true, "varnande_km has a span in km (V2)");
});

test("#913 V2: the table's key goes before the column's, and a city table's output carries no number", () => {
  const f = (tabell: string, kolumn: string, o: object) => ({ tabell, kolumn, rader: 5000, nollor: 0, min: 0, max: 1, distinkta: 200,
    toppVarde: 0, toppAndel: 0.01, ...o });
  assert.equal(doma(f("ny_kandidat_skugga_stad", "punkter", { max: 900 })).utfall, "OK", "a city group may hold 900 points");
  assert.equal(doma(f("ny_kandidat_skugga", "punkter", { max: 900 })).utfall, "UTANFÖR SPANN", "counter-test: a road segment may not");
  assert.equal(doma(f("sasongsfacit_stad_dag", "veto", { max: 900 })).utfall, "OK");
  assert.equal(doma(f("ny_kandidat_skugga", "veto", { max: 900 })).utfall, "UTANFÖR SPANN", "counter-test: the domlogg's veto keeps 0–64");
  const ord = (tabell: string, kolumn: string, v: string[]) => domaOrd({ tabell, kolumn, rader: 500, varden: v.map((o) => ({ ord: o, n: 250 })) });
  assert.equal(ord("olycksfacit_lager", "lager", ["A1", "K"]).utfall, "OK");
  assert.equal(ord("ny_kandidat_skugga_stad", "lager", ["A1", "K"]).utfall, "OKÄNT ORD", "counter-test: in the city log the layers are B and C");
  for (const t of ["ny_kandidat_skugga_stad", "ny_kandidat_skugga_stad_korning", "olycksfacit_lager", "sasongsfacit_stad_dag"])
    assert.ok(UTAN_TAL.has(t), `${t}: the guard prints no number from it (§11.8, #768)`);
  const domar: Dom[] = [doma(f("ny_kandidat_skugga_stad", "punkter", { max: 123456 })), doma(f("sasongsfacit_stad_dag", "kalla", { rader: 12 })),
    doma(f("sasongsfacit_stad_dag", "kalla", { max: 77, distinkta: 60, toppVarde: 77, toppAndel: 0.5 })), ord("olycksfacit_lager", "detalj.stad.orsak", ["varnar", "ny7"])];
  assert.deepEqual(domar.map((d) => d.utfall), ["UTANFÖR SPANN", "–", "SENTINEL?", "OKÄNT ORD"]);
  for (const d of domar) {
    assert.match(d.varfor, /\d/, `counter-test: the plain reason carries a number (${d.utfall})`);
    assert.doesNotMatch(utanTal(d), /\d/, `the masked reason carries none (${d.utfall})`);
  }
  // The guard's output for these tables goes through utanTal() in every loop, and the hinder list too.
  const vakt = las("scripts/vardevakten.ts");
  assert.equal((vakt.match(/UTAN_TAL\.has\(/g) ?? []).length >= 7, true, "every printing loop asks UTAN_TAL");
});

// ── The section ──
const agg = (o: Partial<Agg> = {}): Agg => ({ omrade: "Stor-Stockholm", lager: "B", niva: "drift", manad: "2026-11", dygnsdel: "natt", vecka: true, rader: 7,
  timmar_raknad: 50, timmar_mars: 0, timmar_brytaren_av: 1, timmar_ingen_timme: 2, timmar_av: 0, timmar_ingen_korning: 3,
  kalla: 40, varnande: 9, timmar_varning: 5, tysta_punkter: 70, veto: 10, torr: 50, spridning: 10, ytan_over_0: 60, ...o } as Agg);
const db = (o: Partial<Db> = {}): Db => ({
  mandag: "2026-11-23", vecka_fran: "2026-11-16", till: "2026-11-23", sasong_fran: "2026-11-20", dagar: ["2026-11-20", "2026-11-21", "2026-11-22"],
  aggregat: [agg(), agg({ vecka: false, kalla: 19, varnande: 4 }), agg({ niva: "undantag", dygnsdel: "morgonrusning", kalla: 500, varnande: 500 })],
  spann: [{ kolumn: "kalla", min: 0, max: 40 }, { kolumn: "grupper", min: 3, max: 3 }],
  olyckor: [{ vecka: true, omrade: "Stor-Stockholm", lager: "B", klass: "TROLIG", utfall: "VARNADE", aktiv: true, orsak: "varnar", a1: false,
    k_vag: false, k_stad: true, a2: false, antal: 2 }],
  svar: [{ vecka: true, omrade: "Stor-Stockholm", lager: "B", svar: "ja", antal: 29 }, { vecka: false, omrade: "okänt", lager: "C", svar: "nej", antal: 6 }],
  ...o });

test("#913 the section: internal, the count beside the share, 20 events and 30 answers, and no interval until C2", () => {
  const md = avsnitt(db());
  assert.match(md, /\*\*Internt\*\* \(§11\.8\)\. Publiceras efter slutrapporten, per område och månad, tidigast när stadsmiljöns dom i kuvösen är fälld/);
  assert.match(md, /\*\*Intervallet i §5\*\* står vid säsongsfacits andelar i veckorapportens del 3/);
  assert.equal(andel(9, 40), "9 av 40 (22,5 %)");
  assert.equal(andel(4, 19), "4 av 19", "counter-test: 19 events give the count only (val 3)");
  assert.equal(andel(0, 0), "0 av 0");
  assert.match(md, /\| Stor-Stockholm B \| veckan \| 40 \| 9 av 40 \(22,5 %\) \| 5 \|/, "the week's warning hours with their share");
  assert.match(md, /\| Stor-Stockholm B \| säsongen \| 59 \| 13 av 59 \(22,0 %\) \| 10 \|/, "the season adds the days before the week");
  assert.match(md, /\| Stor-Stockholm B \| veckan \| 29 \| 0 \| 29 av 29 \|/, "counter-test: 29 answers give no share (§11.6)");
  assert.equal(andel(30, 30, 30), "30 av 30 (100,0 %)", "30 answers give a share");
  assert.match(md, /\| C, okänt område \| säsongen \| 0 \| 6 \| 0 av 6 \|/, "an answer whose group left the list counts under its layer");
  assert.match(md, /Appen missade\* går inte att knyta till en storstad och redovisas för hela landet \(körlistan C6\)/);
  // The exceptions stand apart and are never added to the rest (§11.2).
  assert.match(md, /\| undantag \| Stor-Stockholm B \| veckan \| 50 \| 500 \| 500 av 500 \(100,0 %\) \| 5 \|/);
  assert.ok(!md.includes("540") && !md.includes("559"), "the drift totals do not carry the exception's 500 cold group hours");
  // §11.4 and §11.5.
  assert.match(md, /\| Stor-Stockholm B \| veckan \| 70 \| 10 av 70 \(14,3 %\) \| 50 av 70 \(71,4 %\) \| 10 av 70 \(14,3 %\) \| 60 \| 0 \|/);
  assert.match(md, /\| Stor-Stockholm B \| veckan \| 2 av 2 \| 2 av 2 \| – \|/, "the city point warned, and only it");
  // Never a group or a point (§11.8).
  assert.doesNotMatch(md, /\b[BC]-\d|\b[BC]\d{5}\b/, "no group or point id");
});

test("#913 the section stops instead of a number: undeclared, outside the span, an unknown word, a missing day", () => {
  assert.doesNotThrow(() => granska(db()));
  assert.throws(() => granska(db({ spann: [{ kolumn: "ytan_over_0", min: -1, max: 4 }] })), /ytan_over_0 ligger utanför sitt spann/, "a negative ytan över 0");
  assert.throws(() => granska(db({ spann: [{ kolumn: "timmar_raknad", min: 0, max: 26 }] })), /timmar_raknad ligger utanför/, "26 hours in a day");
  assert.throws(() => granska(db({ spann: [{ kolumn: "nytt_falt", min: 0, max: 1 }] })), /nytt_falt saknar spann i värdevakten \(OBESIKTIGAT\)/);
  assert.throws(() => granska(db({ aggregat: [agg({ niva: "skugga" })] })), /sasongsfacit_stad_dag\.niva: ett ord som inte står/);
  assert.throws(() => granska(db({ olyckor: [{ ...db().olyckor[0], orsak: "ingen stadspunkt" }] })), /detalj\.stad\.orsak: ett ord/);
  assert.throws(() => granska(db({ svar: [{ vecka: true, omrade: "Stor-Uppsala", lager: "B", svar: "ja", antal: 1 }] })), /detalj\.stad\.omrade/);
  assert.throws(() => granska(db({ dagar: ["2026-11-20", "2026-11-22"] })), /dygnet 2026-11-21 saknas i aggregatet/);
  assert.throws(() => avsnitt(db({ dagar: ["2026-11-20"] })), /saknas i aggregatet/, "avsnitt() runs the check first");
  // The messages name a field or a day, never a value.
  assert.throws(() => granska(db({ spann: [{ kolumn: "kalla", min: 0, max: 9876543 }] })),
    (e: Error) => /kalla ligger utanför sitt spann/.test(e.message) && !/9876543/.test(e.message));
});

test("#913 the section's files never lie inside the repo, and the questions read only counts", () => {
  assert.equal(iRepot(fileURLToPath(new URL("../docs/x.md", import.meta.url))), true, "docs/ is refused");
  assert.equal(iRepot("x.json"), true, "the working directory is the repo in ci");
  assert.equal(iRepot(join(tmpdir(), "stad.md")), false, "a temporary file outside the repo is allowed");
  assert.match(SATS.svar, /f\.alert_id LIKE 'kand:B-%' OR f\.alert_id LIKE 'kand:C-%'\) AND NOT f\.prov/, "K's city warnings, without the test rows");
  assert.match(SATS.svar, /count\(\*\)::int AS antal/);
  const valda = (s: string, fran: string) => s.slice(0, s.indexOf(fran));
  assert.ok(!/f\.alert_(id|t)\s*,/.test(valda(SATS.svar, "FROM driver_facit")), "no id or time leaves the database");
  assert.match(SATS.olyckor, /o\.dubblett_av IS NULL AND l\.detalj \? 'stad'/, "olycksfacit without duplicates, within 2 km of a city point");
  assert.ok(!/deviation_id|geom|o\.start_time\s*,/.test(valda(SATS.olyckor, "FROM olycksfacit")), "no accident's id, place or time leaves the database");
  assert.ok(!/\bgrupp\b[^)]*AS grupp|SELECT[^;]*\bpunkt\b/.test(SATS.aggregat), "the aggregate carries no group or point");
});
