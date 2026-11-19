// DECISIONS #905, körlistan C4 (halkvakt-kuvos F74 §8 and §13): the moisture shadow in the cities, sql/125. These tests need no
// database; the shadow's rows and the counter-tests are in test/integration.test.ts (#905), against PostGIS in ci.
//   1. the migration creates no rule function and writes only its own two tables (the shadow never speaks, §3)
//   2. the export list is the same in the migration and in arkivexport, and nothing of sql/114's is lost
//   3. the value guard knows both tables and every field, and the spans' upper bounds come from the schema (sql/089), never from the
//      point list (TROSKLAR-SASONGSFACIT §11.7, DECISIONS #904 answer 5 (a))
//   4. the hourly flow calls the shadow last in the city round, after the city log, in a step that may fail on its own
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPANN, ORD, FLAGGOR } from "../scripts/vardevakten.ts";
import { SATS } from "../ingest/ny-kandidat-db.ts";

const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const MIG = las("sql/125_fuktskuggan_stad.sql");
const utanKommentarer = (s: string) => s.replace(/--[^\n]*/g, "");
const TAB = ["ny_kandidat_fuktskugga_stad", "ny_kandidat_fuktskugga_stad_korning"];

/** The columns of a CREATE TABLE in the migration: [name, type]. */
function kolumner(tabell: string): [string, string][] {
  const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${tabell} \\(([\\s\\S]*?)\\n\\);`).exec(utanKommentarer(MIG));
  assert.ok(m, `sql/125 creates ${tabell}`);
  return m![1].split("\n").map((r) => r.trim()).filter((r) => r && !r.startsWith("PRIMARY KEY"))
    .map((r) => { const [namn, typ] = r.split(/\s+/); return [namn, typ.replace(/,$/, "")]; });
}
/** The quoted names in the first IN (…) list after a marker. */
function lista(text: string, efter: string): string[] {
  const i = text.indexOf(efter);
  assert.ok(i >= 0, `${efter} is in the text`);
  const m = /IN \(([^)]*)\)/.exec(text.slice(i));
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

test("#905 sql/125 creates no rule function and writes only its own two tables", () => {
  const t = utanKommentarer(MIG);
  const skapade = [...t.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (\w+)\(/g)].map((m) => m[1]);
  assert.deepEqual(skapade.sort(), ["arkiv2_alder", "arkiv2_efterslap", "arkiv2_tabell", "arkiv2_tidkolumn", "ny_kandidat_logga_fuktskugga"],
    "only the shadow's function and the export's list functions, as sql/114");
  assert.ok(!/DROP FUNCTION|ALTER FUNCTION/.test(t), "no function is dropped or altered");
  for (const m of t.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+(\w+)/g))
    assert.ok(TAB.includes(m[1]), `sql/125 writes only its own tables: ${m[0]}`);
  for (const m of t.matchAll(/\bALTER TABLE (\w+)/g))
    assert.ok([...TAB, "arkiv_export_tabell"].includes(m[1]), `sql/125 alters only its own tables and the export's check: ${m[0]}`);
  assert.ok(!/cron\.(schedule|unschedule)/.test(t), "no schedule: the hourly flow calls the shadow");
  const fn = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION ny_kandidat_logga_fuktskugga()"));
  assert.match(fn.slice(0, 200), /LANGUAGE plpgsql SET search_path = public, extensions/, "fixed search path in the definition (DECISIONS #784)");
  assert.match(fn, /FROM ny_kandidat_regel\(\) x/, "the shadow reads the rule itself, at its own e (§2.3 point 1)");
  assert.equal(SATS.fuktskugga, "SELECT ny_kandidat_logga_fuktskugga() AS m", "the hourly flow's call");
});

test("#905 the export list: the same names in sql/125 and in arkivexport, and sql/114's are all kept", () => {
  const exp = las("supabase/functions/arkivexport/index.ts");
  const m = /const TABELLER = \[([\s\S]*?)\];/.exec(exp);
  const tabeller = [...m![1].replace(/\/\/[^\n]*/g, "").matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const vit = lista(MIG, "FUNCTION arkiv2_tabell"), check = lista(MIG, "ADD CONSTRAINT arkiv_export_tabell_tabell_check");
  assert.deepEqual([...vit].sort(), [...tabeller].sort(), "the white list in sql/125 is TABELLER in arkivexport");
  assert.deepEqual([...check].sort(), [...vit].sort(), "the check on arkiv_export_tabell carries the same names");
  for (const t of lista(las("sql/114_stadsloggen_arkiv.sql"), "FUNCTION arkiv2_tabell")) assert.ok(vit.includes(t), `sql/114's ${t} is kept`);
  for (const t of TAB) {
    assert.ok(vit.includes(t), `${t} is exported`);
    assert.ok(lista(MIG, "FUNCTION arkiv2_alder").includes(t), `${t} is exported the day after`);
    assert.ok(MIG.includes(`arkiv2_att_exportera('${t}', 100000)`), `the backlog counts ${t}`);
  }
  assert.match(MIG, /WHEN 'ny_kandidat_fuktskugga_stad_korning' THEN 'korning'/, "the run log counts its day on korning");
});

test("#905 the value guard knows both tables and every field, with bounds from the schema", () => {
  const vakt = las("scripts/vardevakten.ts");
  assert.match(vakt, /ny_kandidat_fuktskugga_stad: "observed_at"/, "the shadow is in TID");
  assert.match(vakt, /ny_kandidat_fuktskugga_stad_korning: "korning"/, "the run log is in TID");
  // The schema's bounds (sql/089): a point id is a layer letter and five digits, and a group has one layer.
  const s089 = las("sql/089_stadspunkter.sql");
  const siffror = Number(/punkt ~ '\^\[BC\]\[0-9\]\{(\d+)\}\$'/.exec(s089)![1]);
  const lager = [.../lager IN \(([^)]*)\)/.exec(s089)![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const perGrupp = 10 ** siffror, perKorning = lager.length * perGrupp;
  assert.ok(/CHECK \(left\(punkt, 1\) = lager AND left\(grupp, 1\) = lager\)/.test(s089), "a group has one layer (sql/089)");
  for (const t of TAB) {
    for (const [namn, typ] of kolumner(t)) {
      if (typ === "int") {
        assert.ok(SPANN[namn], `${t}.${namn}: a declared span (VÄRDEVAKTEN)`);
        assert.equal(SPANN[namn][0], 0, `${t}.${namn}: a count starts at 0`);
        assert.equal(SPANN[namn][1], namn === "p0_grupper" ? perKorning : perGrupp, `${t}.${namn}: the upper bound is the schema's`);
      } else if (typ === "text" || typ === "text[]") {
        if (namn === "grupp") continue;                                       // an identifier, not a measurement
        assert.ok(ORD[namn], `${t}.${namn}: a declared word list`);
      } else if (typ === "boolean") {
        assert.ok(FLAGGOR[namn], `${t}.${namn}: a declared flag`);
      } else assert.equal(typ, "timestamptz", `${t}.${namn}: a type the test knows`);
    }
  }
  // The words come from the migrations, not from the point list.
  const brytare = [...s089.slice(s089.indexOf("INSERT INTO stadsbrytare")).matchAll(/\('([^']+)', '([BC])'\)/g)].map((x) => `${x[1]}/${x[2]}`.toLowerCase());
  assert.deepEqual([...ORD.brytare.ord].sort(), brytare.sort(), "the switches are the four in sql/089");
  assert.deepEqual([...ORD.omrade.ord].sort(), [...new Set(brytare.map((b) => b.split("/")[0]))].sort(), "the areas are sql/089's");
  assert.deepEqual([...ORD.lager.ord].sort(), lager.map((l) => l.toLowerCase()).sort(), "the layers are sql/089's");
  const status = [.../status\s+text NOT NULL CHECK \(status IN \(([^)]*)\)\)/.exec(MIG)![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual([...ORD.status.ord].sort(), status.sort(), "the run's words are the table's check");
  // K2a reads Våt in condition_info: the field has a word list before K2a carries a number (F74 §5).
  assert.ok(ORD.condition_info && ORD.condition_info.ord.includes("våt") && ORD.condition_info.ord.includes("fläckvis våt"),
    "condition_info has a word list with Våt and fläckvis Våt");
});

test("#905 the hourly flow: the shadow last in the city round, after the city log, in a step that may fail on its own", () => {
  const y = las(".github/workflows/ny-kandidat-timme.yml");
  const loggaStad = y.indexOf("ny-kandidat-db.ts logga-stad"), satt = y.indexOf('echo "STADSLOGG=1" >> "$GITHUB_ENV"');
  const steg = y.indexOf("- name: Storstädernas fuktskugga"), anrop = y.indexOf("ny-kandidat-db.ts fuktskugga");
  const nasta = y.indexOf("- name:", steg + 1);
  assert.ok(loggaStad > 0 && satt > loggaStad && steg > satt && anrop > steg && anrop < nasta,
    "the city round marks a written city log, and the shadow's own step follows it");
  const blocket = y.slice(steg, nasta);
  assert.match(blocket, /continue-on-error: true/, "a failing shadow never fails the job");
  assert.match(blocket, /if: env\.FLAGGA == 'på' && env\.HOPPAD != '1' && env\.STADSLOGG == '1'/, "only after a written city log");
  assert.match(blocket, /timeout-minutes: \d+/, "the step has a time limit of its own");
  assert.match(blocket, /fuktskugga > \/dev\/null 2>&1/, "the output is not shown (#768)");
  assert.equal(y.slice(satt, steg).includes("logga-stad"), false, "the mark is set after the city log, not before");
});
