// DECISIONS #907, körlistan C4 (halkvakt-kuvos F74 §8 and §13): the moisture shadow in the cities, sql/127. These tests need no
// database; the shadow's rows and the counter-tests are in test/integration.test.ts (#907), against PostGIS in ci.
//   1. the migration creates no rule function and writes only its own two tables (the shadow never speaks, §3)
//   2. the export list is the same in the migration and in arkivexport, and nothing of sql/114's is lost
//   3. the value guard knows both tables and every field, and the spans' upper bounds come from the schema (sql/089), never from the
//      point list (TROSKLAR-SASONGSFACIT §11.7, DECISIONS #904 answer 5 (a))
//   4. the hourly flow calls the shadow last in the city round, after the city log, in a step that may fail on its own
// DECISIONS #908, körlistan C7 (halkvakt-kuvos F75 §8, §9 and §12): svartis and rimfrost in the same shadow, sql/126–128.
//   5. sql/126 and sql/128 create no function, change only their own table and sql/105's smavag_live, and lock the new table twice;
//      none of the three files names a rule function, so smavag_regel(), smavag_talar() and ny_kandidat_regel() are untouched
//   6. the value guard knows the new fields and the tables the rules already read (F75 §8, §13 point 1)
//   7. the flows: MET's moisture after the city PH in a step that may fail on its own, and the small roads' file beside the
//      unchanged underlag
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPANN, ORD, FLAGGOR } from "../scripts/vardevakten.ts";
import { SATS, MET_STAD_KOLUMNER } from "../ingest/ny-kandidat-db.ts";
import { SATS as SV } from "../ingest/smavag-live-db.ts";

const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const MIG = las("sql/127_fuktskuggan_stad.sql");
const utanKommentarer = (s: string) => s.replace(/--[^\n]*/g, "");
const TAB = ["ny_kandidat_fuktskugga_stad", "ny_kandidat_fuktskugga_stad_korning"];

/** The columns of a CREATE TABLE in a migration: [name, type]. */
function kolumner(tabell: string, mig = MIG): [string, string][] {
  const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${tabell} \\(([\\s\\S]*?)\\n\\);`).exec(utanKommentarer(mig));
  assert.ok(m, `sql/127 creates ${tabell}`);
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

test("#907 sql/127 creates no rule function and writes only its own two tables", () => {
  const t = utanKommentarer(MIG);
  const skapade = [...t.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (\w+)\(/g)].map((m) => m[1]);
  assert.deepEqual(skapade.sort(), ["arkiv2_alder", "arkiv2_efterslap", "arkiv2_tabell", "arkiv2_tidkolumn", "ny_kandidat_logga_fuktskugga"],
    "only the shadow's function and the export's list functions, as sql/114");
  assert.ok(!/DROP FUNCTION|ALTER FUNCTION/.test(t), "no function is dropped or altered");
  for (const m of t.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+(\w+)/g))
    assert.ok(TAB.includes(m[1]), `sql/127 writes only its own tables: ${m[0]}`);
  for (const m of t.matchAll(/\bALTER TABLE (\w+)/g))
    assert.ok([...TAB, "arkiv_export_tabell"].includes(m[1]), `sql/127 alters only its own tables and the export's check: ${m[0]}`);
  assert.ok(!/cron\.(schedule|unschedule)/.test(t), "no schedule: the hourly flow calls the shadow");
  const fn = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION ny_kandidat_logga_fuktskugga()"));
  assert.match(fn.slice(0, 200), /LANGUAGE plpgsql SET search_path = public, extensions/, "fixed search path in the definition (DECISIONS #784)");
  assert.match(fn, /FROM ny_kandidat_regel\(\) x/, "the shadow reads the rule itself, at its own e (§2.3 point 1)");
  assert.equal(SATS.fuktskugga, "SELECT ny_kandidat_logga_fuktskugga() AS m", "the hourly flow's call");
});

test("#907 the export list: the same names in sql/127 and in arkivexport, and sql/114's are all kept", () => {
  const exp = las("supabase/functions/arkivexport/index.ts");
  const m = /const TABELLER = \[([\s\S]*?)\];/.exec(exp);
  const tabeller = [...m![1].replace(/\/\/[^\n]*/g, "").matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const vit = lista(MIG, "FUNCTION arkiv2_tabell"), check = lista(MIG, "ADD CONSTRAINT arkiv_export_tabell_tabell_check");
  assert.deepEqual([...vit].sort(), [...tabeller].sort(), "the white list in sql/127 is TABELLER in arkivexport");
  assert.deepEqual([...check].sort(), [...vit].sort(), "the check on arkiv_export_tabell carries the same names");
  for (const t of lista(las("sql/114_stadsloggen_arkiv.sql"), "FUNCTION arkiv2_tabell")) assert.ok(vit.includes(t), `sql/114's ${t} is kept`);
  for (const t of TAB) {
    assert.ok(vit.includes(t), `${t} is exported`);
    assert.ok(lista(MIG, "FUNCTION arkiv2_alder").includes(t), `${t} is exported the day after`);
    assert.ok(MIG.includes(`arkiv2_att_exportera('${t}', 100000)`), `the backlog counts ${t}`);
  }
  assert.match(MIG, /WHEN 'ny_kandidat_fuktskugga_stad_korning' THEN 'korning'/, "the run log counts its day on korning");
});

test("#907 the value guard knows both tables and every field, with bounds from the schema", () => {
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

test("#907 the hourly flow: the shadow last in the city round, after the city log, in a step that may fail on its own", () => {
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

const MET = las("sql/126_stadens_met_fukt.sql"), SMAFUKT = las("sql/128_smavag_fukt.sql");
const REGELFUNKTIONER = ["kandidat_regel", "ny_kandidat_regel", "talande_regel", "storstader_tyst", "smavag_regel", "smavag_talar", "smavag_timme",
  "ny_kandidat_timme", "ny_kandidat_logga", "ny_kandidat_logga_stad"];

test("#908 sql/126 and sql/128 create no function and change only their own table; no rule function is named in 126–128", () => {
  for (const [namn, text, tabell] of [["sql/126", MET, "ny_kandidat_met_stad"], ["sql/128", SMAFUKT, "smavag_live"]] as const) {
    const t = utanKommentarer(text);
    assert.ok(!/\bFUNCTION\b/.test(t), `${namn} creates, alters or drops no function`);
    assert.ok(!/cron\.(schedule|unschedule)/.test(t), `${namn}: no schedule`);
    for (const m of t.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|ALTER TABLE|CREATE TABLE IF NOT EXISTS|DROP TABLE)\s+(\w+)/g))
      assert.equal(m[1], tabell, `${namn} touches only ${tabell}: ${m[0]}`);
  }
  // sql/128 only adds the two nullable flags: no default, no NOT NULL, nothing dropped (F75 §3: the voice reads only ned).
  assert.match(utanKommentarer(SMAFUKT), /ALTER TABLE smavag_live ADD COLUMN IF NOT EXISTS rim boolean, ADD COLUMN IF NOT EXISTS n6 boolean;/);
  assert.ok(!/NOT NULL|DEFAULT|DROP/.test(utanKommentarer(SMAFUKT)), "the flags are nullable and nothing is dropped");
  // The rule functions are untouched: none of 126–128 creates or replaces one, and 127 creates only the shadow's and the export's.
  for (const [namn, text] of [["sql/126", MET], ["sql/127", MIG], ["sql/128", SMAFUKT]] as const)
    for (const f of REGELFUNKTIONER)
      assert.ok(!new RegExp(`FUNCTION ${f}\\(`).test(utanKommentarer(text)), `${namn} does not create or replace ${f}()`);
  // ny_kandidat_met_stad: keyed as ny_kandidat_ph, the drift id checked, locked twice and granted to the service role only.
  assert.match(MET, /PRIMARY KEY \(tid, punkt\)/, "keyed as ny_kandidat_ph (sql/068)");
  assert.match(MET, /punkt\s+text NOT NULL CHECK \(punkt ~ '\^\[BC\]\[0-9\]\{5\}\$'\)/, "only a city point's drift id");
  assert.match(MET, /ALTER TABLE ny_kandidat_met_stad ENABLE ROW LEVEL SECURITY;/);
  assert.match(MET, /IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'service_role'\) THEN GRANT ALL ON TABLE ny_kandidat_met_stad TO service_role;/);
  assert.ok(!/GRANT [^;]* TO (anon|authenticated)/.test(MET), "anon and authenticated get nothing");
  assert.deepEqual(kolumner("ny_kandidat_met_stad", MET).map(([n]) => n), ["tid", "punkt", "korning", "met_td_c", "rh2m", "raknad_at"]);
  // The writer: the kuvös chain's file carries these columns, and the statement is keyed and replaced as the PH's.
  assert.deepEqual(MET_STAD_KOLUMNER, ["punkt", "korning_utc", "tid_utc", "met_td_c", "rh2m"]);
  assert.match(SATS.skrivMetStad, /ON CONFLICT \(tid, punkt\) DO UPDATE SET korning = EXCLUDED\.korning/);
  assert.match(SATS.skrivPh, /ON CONFLICT \(tid, punkt\) DO UPDATE SET korning = EXCLUDED\.korning/);
  assert.match(SATS.gallraMetStad, /^DELETE FROM ny_kandidat_met_stad WHERE tid < now\(\) - interval '48 hours'$/);
  // The small roads' writer: the flags with the new header, the old statement unchanged.
  assert.equal(SV.skriv, "INSERT INTO smavag_live (tid, punkt, ned) SELECT $1::timestamptz, u.p, u.n FROM unnest($2::text[], $3::boolean[]) AS u(p, n)");
  assert.match(SV.skrivFlaggor, /INSERT INTO smavag_live \(tid, punkt, ned, rim, n6\)/);
});

test("#908 the shadow's C7 variants: G-rim is K1's hoar frost, M-dagg reads both hours, the S windows, and the union", () => {
  const t = utanKommentarer(MIG);
  assert.match(t, /count\(\*\) FILTER \(WHERE k\.r0 OR k\.k1_rim\),\s+count\(\*\) FILTER \(WHERE k\.k1_utan\)/, "G-rim is k1_rim_punkter, counted once");
  assert.ok(!/humidity_pct/.test(t), "G-rim, like K1, has no cross-sensor check (F75 question 2 (b))");
  assert.match(t, /JOIN ny_kandidat_met_stad m ON m\.tid > h\.tid - interval '2 hours' AND m\.tid <= h\.tid/, "M-dagg reads MET's rows of the two hours");
  assert.match(t, /JOIN ny_kandidat_live l ON l\.tid = m\.tid AND l\.punkt = m\.punkt/, "each hour with the candidate's value of the same hour");
  assert.match(t, /count\(\*\) FILTER \(WHERE k\.r0 OR \(k\.dagg_finns AND k\.dagg_under\)\),\s+count\(\*\) FILTER \(WHERE NOT k\.dagg_finns\)/);
  for (const n of [1, 2, 3, 4]) assert.match(t, new RegExp(`count\\(\\*\\) FILTER \\(WHERE k\\.r0 OR k\\.s${n}h\\)`), `S-${n}h counts R0 too`);
  assert.match(t, /count\(\*\) FILTER \(WHERE k\.r0 OR k\.k1_rim OR \(k\.dagg_finns AND k\.dagg_under\) OR k\.s3h\)/, "the union of R0, G-rim, M-dagg and S-3h");
  // The insert names every column of the table, in the table's order.
  const ins = /INSERT INTO ny_kandidat_fuktskugga_stad \(([^)]*)\)/.exec(t)![1].split(",").map((x) => x.trim());
  assert.deepEqual(ins, kolumner(TAB[0]).map(([n]) => n).filter((n) => n !== "raknad_at"), "the insert writes every column but e, in order");
});

test("#908 the value guard knows MET's moisture, the small roads' flags and the tables the rules already read", () => {
  const vakt = las("scripts/vardevakten.ts");
  for (const [t, k] of [["ny_kandidat_met_stad", "tid"], ["smavag_live", "tid"], ["radar_stad", "observed_at"], ["radar_smavag", "observed_at"]])
    assert.match(vakt, new RegExp(`\\b${t}: "${k}"`), `${t} is in TID`);
  assert.ok(!/\bsmavag_korning: "/.test(vakt), "smavag_korning stays out of TID");
  assert.deepEqual(SPANN.met_td_c.slice(0, 2), [-50, 30], "MET's dew point has F38's span, stricter than dewpoint_c");
  assert.ok(SPANN.dewpoint_c[0] < SPANN.met_td_c[0] && SPANN.dewpoint_c[1] > SPANN.met_td_c[1]);
  assert.deepEqual(SPANN.rh2m.slice(0, 2), [0, 1], "MET's humidity is a fraction");
  for (const f of ["ned", "rim", "n6"]) assert.ok(FLAGGOR[f], `smavag_live.${f} is a declared flag`);
  for (const [namn, typ] of kolumner("ny_kandidat_met_stad", MET)) {
    if (typ === "double") assert.ok(SPANN[namn], `ny_kandidat_met_stad.${namn}: a declared span`);
    else assert.ok(namn === "punkt" || typ === "timestamptz", `ny_kandidat_met_stad.${namn}: an identifier or a time`);
  }
  // The rules' tables: every numeric field already has a span, so none of them stands OBESIKTIGAT once they are in TID.
  for (const [fil, tab] of [["sql/090_radar_stad.sql", "radar_stad"], ["sql/104_radar_smavag.sql", "radar_smavag"]] as const)
    for (const [namn, typ] of kolumner(tab, las(fil))) if (typ === "numeric") assert.ok(SPANN[namn], `${tab}.${namn}: a declared span`);
});

test("#908 the flows: MET's moisture after the city PH on its own, and the small roads' file beside the unchanged underlag", () => {
  const y = las(".github/workflows/ny-kandidat-fysik.yml");
  const ph = y.indexOf("ingest/stadskedjan.ts ph "), steg = y.indexOf("- name: Storstädernas punkter — MET:s fukt till ny_kandidat_met_stad");
  const nasta = y.indexOf("- name:", steg + 1), laget = y.indexOf("- name: Storstädernas punkter — läget");
  assert.ok(ph > 0 && steg > ph && nasta === laget, "the step follows the city PH, before the city round's state");
  const b = y.slice(steg, nasta);
  assert.match(b, /if: env\.FLAGGA == 'på' && steps\.stad_a\.outcome == 'success'/, "only when the city PH was written");
  assert.match(b, /continue-on-error: true/, "an error here never fails the job or the PH");
  assert.match(b, /timeout-minutes: \d+/);
  assert.match(b, /kuvos\/stadens-fukt\.ts fukt "stad-korning\/metnordic_korning_\$STAMP\.csv\.gz" met-stad\.csv \\\s+"ut-stad1\/ny_kandidat_ph_\$STAMP\.csv\.gz" "ut-stad2\/ny_kandidat_ph_\$STAMP\.csv\.gz" > \/dev\/null 2>&1/,
    "the kuvös chain reads the same run file and the same PH files as del A, and its output is not shown");
  assert.match(b, /ny-kandidat-db\.ts skriv-met-stad met-stad\.csv > \/dev\/null 2>&1/, "the writer's output is not shown (#768)");
  assert.match(b, /rm -f met-stad\.csv\n/, "the file stays in the job");
  const s = las(".github/workflows/kuvos-smavag-timme.yml");
  assert.match(s, /FIL="underlag_\$\(date -u -d "\$TID" \+%Y%m%dT%H\)\.csv"/, "the underlag keeps its name");
  assert.match(s, /FUKT="fukt_\$\(date -u -d "\$TID" \+%Y%m%dT%H\)\.csv"/, "the flags go to a file of their own");
  const fukt = s.slice(s.indexOf('FUKT="fukt_'), s.indexOf('rm -f "$FUKT" "$FUKT.gz"'));
  assert.ok(s.indexOf('ladda "$RES" "resorna"') < s.indexOf('FUKT="fukt_'), "after the underlag and the trips are in the bucket");
  assert.match(fukt, /^\s+if node --experimental-strip-types ingest\/smavag-live-db\.ts fukt "\$FUKT" "\$TID" > fukt\.log 2>&1 && gzip -n "\$FUKT"/m, "an error here never fails the step");
  assert.match(fukt, /hinken\.ts ladda "\$FUKT\.gz" "\$HINK\/\$FUKT\.gz" --finns-ok/, "never overwritten, as the underlag");
  assert.match(fukt, /::warning::/);
  assert.match(SV.underlag, /^SELECT r\.punkt, r\.ned, r\.radar_mmh FROM smavag_regel\(\) r WHERE r\.utfall = 'varnar'/, "the underlag's rows are unchanged");
});
