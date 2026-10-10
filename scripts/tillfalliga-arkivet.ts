// GRINDARNAS TILLFÄLLIGA DATABAS (kort #323, DECISIONS #513). Sedan raderingens golv sänktes till 14 dygn (#511) finns äldre
// väderdygn bara i arkivexportens hink (sql/034). Skriptet bygger en databas i Actions som bär hela grindens fönster, och grinden
// körs sedan OFÖRÄNDRAD med DATABASE_URL mot den:
//   1. driftens schema (pg_dump --schema-only av public), så tabeller, index och funktioner är driftens egna;
//   2. de exporterade dygnen ur hinken — kontrollsumman mot arkiv_export, raderna mot bokföringen, inläsningen med sql/042;
//   3. de dygn som ännu inte är exporterade (de senaste nio) ur driften, med \copy;
//   4. tabellerna grinden läser vid sidan av (givarfel_dygn och arkiv_export alltid, resten med --tabeller).
//
// VARIFRÅN VARJE DYGN KOMMER. Ett exporterat dygn läses ur hinken även när driften fortfarande har det: filen bär samma rader
// (sql/034 bokför bara ett dygn vars fil har exakt lika många rader, och arkiv_jamfor provar det), och den packade filen är
// en bråkdel av trafiken. Ett dygn som varken är exporterat eller finns i driften skrivs ut som saknat — grindens egen vakt
// (vaktdiagnos.ts saknadeDygn) räknar det också.
//
// --jamfor är beviset: för varje dygn som finns kvar i driften jämförs antalet rader och en kontrollsumma över raderna (md5 av
// raderna som text, sorterade bytevis — COLLATE "C", eftersom driftens och behållarens kollation sorterar olika) mellan driften och
// den tillfälliga databasen. Bara tal skrivs ut — loggarna är publika.
//
// Run (i Actions, via .github/actions/tillfalliga-arkivet):
//   DRIFT_URL=… DUMP_URL=… DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres \
//     node --experimental-strip-types scripts/tillfalliga-arkivet.ts <dagar> [--tabeller=a,b] [--jamfor]
// Självtest utan databas: --sjalvtest
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { KARANTAN_DYGN } from "../publish/snapshot-core.ts";
import { MAX_DYGN } from "../supabase/functions/arkivdump/delar.ts";

export type Kalla = "hink" | "drift" | "saknas";
const DAG = /^\d{4}-\d{2}-\d{2}$/;
const ALLTID = ["givarfel_dygn", "arkiv_export"];

/** Fönstrets dygn, från dygnet där `fran` ligger till och med `idag` (UTC-datum). */
export function fonstret(fran: string, idag: string): string[] {
  if (!DAG.test(fran) || !DAG.test(idag)) throw new Error(`ogiltigt datum: ${fran} / ${idag}`);
  const ut: string[] = [];
  for (let t = Date.parse(`${fran}T00:00:00Z`); t <= Date.parse(`${idag}T00:00:00Z`); t += 86_400_000)
    ut.push(new Date(t).toISOString().slice(0, 10));
  return ut;
}

/** Varifrån varje dygn läses: hinken om dygnet är exporterat, annars driften om den har det, annars saknas det. */
export function plan(dygn: string[], exporterade: Set<string>, iDriften: Set<string>): { dag: string; kalla: Kalla }[] {
  return dygn.map((dag) => ({ dag, kalla: exporterade.has(dag) ? "hink" : iDriften.has(dag) ? "drift" : "saknas" }));
}

/** Tabellnamnen ur --tabeller: bara enkla namn, så att de kan stå i en \copy utan citat. ALLTID kommer först, utan dubbletter. */
export function tabellerna(arg: string | undefined): string[] {
  const egna = (arg ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const t of egna) if (!/^[a-z_][a-z0-9_]*$/.test(t)) throw new Error(`ogiltigt tabellnamn: ${t}`);
  return [...new Set([...ALLTID, ...egna])];
}

if (process.argv.includes("--sjalvtest")) {
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    const lika = JSON.stringify(fick) === JSON.stringify(vantat);
    if (!lika) ok = false;
    console.log(`  ${lika ? "ok" : "FEL"}: ${namn}${lika ? "" : ` — fick ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`}`);
  };
  console.log("SJÄLVTEST — grindarnas tillfälliga databas (kort #323)\n");
  k("fönstret tar med första och sista dygnet", fonstret("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  k("fönstret över månadsskiftet och skottdagen", fonstret("2028-02-28", "2028-03-01"), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  let kastade = false;
  try { fonstret("2026-9-1", "2026-10-02"); } catch { kastade = true; }
  k("ett felskrivet datum avvisas", kastade, true);
  const p = plan(["2026-09-24", "2026-09-25", "2026-10-02", "2026-10-03"],
    new Set(["2026-09-25", "2026-10-02"]), new Set(["2026-10-02", "2026-10-03"]));
  k("exporterat ⇒ hinken, även när driften har dygnet kvar", p.map((x) => x.kalla), ["saknas", "hink", "hink", "drift"]);
  k("ett dygn som varken är exporterat eller i driften saknas", p[0], { dag: "2026-09-24", kalla: "saknas" });
  k("givarfel_dygn och arkiv_export följer alltid med, utan dubbletter", tabellerna("shadow_log, arkiv_export"),
    ["givarfel_dygn", "arkiv_export", "shadow_log"]);
  kastade = false;
  try { tabellerna("shadow_log; DROP TABLE x"); } catch { kastade = true; }
  k("ett tabellnamn som inte är ett enkelt namn avvisas", kastade, true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: fönstret, varifrån varje dygn läses och tabellistan.");
  process.exit(0);
}

const DAGAR = Number(process.argv[2]);
// V-B räknar från 15/9 och passerar 70 dygn i slutet av november; hinkens dygn hämtas därför i omgångar om arkivdumps MAX_DYGN.
if (!Number.isInteger(DAGAR) || DAGAR < 1 || DAGAR > 200) { console.error(`dagar måste vara 1–200, fick ${process.argv[2]}`); process.exit(1); }
const { DRIFT_URL, DUMP_URL, DATABASE_URL } = process.env;
if (!DRIFT_URL || !DUMP_URL || !DATABASE_URL) { console.error("DRIFT_URL, DUMP_URL och DATABASE_URL krävs"); process.exit(1); }
if (!/localhost|127\.0\.0\.1/.test(DATABASE_URL)) { console.error("DATABASE_URL ska vara den tillfälliga databasen på localhost"); process.exit(1); }
const TABELLER = tabellerna(process.argv.find((a) => a.startsWith("--tabeller="))?.slice(11));
const JAMFOR = process.argv.includes("--jamfor");

const pg = (await import("pg")).default;
const drift = new pg.Pool({ connectionString: DRIFT_URL, max: 1, ssl: { rejectUnauthorized: false } });
const tf = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
// UTC och exakta flyttal i varje fråga som räknar eller jämför — i en transaktion, så att det håller även genom poolern.
async function utc(pool: any, sql: string, p: unknown[] = []): Promise<any[]> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN; SET LOCAL TimeZone = 'UTC'; SET LOCAL extra_float_digits = 3");
    const r = await c.query(sql, p);
    await c.query("COMMIT");
    return r.rows;
  } finally { c.release(); }
}

/** Kör ett program med `indata` på stdin och samlar ut- och felutskriften. */
function kor(prog: string, args: string[], indata?: string): Promise<{ kod: number; ut: string; fel: string }> {
  return new Promise((res, rej) => {
    const p = spawn(prog, args, { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PGTZ: "UTC" } });
    let ut = "", fel = "";
    p.stdout.on("data", (d) => (ut += d));
    p.stderr.on("data", (d) => (fel += d));
    p.on("error", rej);
    p.on("close", (kod) => res({ kod: kod ?? 1, ut, fel }));
    p.stdin.end(indata ?? "");
  });
}

/** \copy ur driften rakt in i den tillfälliga databasen, utan mellanfil. Returnerar antalet byte som gick över tråden. */
function kopiera(urval: string, mal: string): Promise<number> {
  return new Promise((res, rej) => {
    const ut = spawn("psql", [DUMP_URL!, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", `\\copy (${urval}) TO STDOUT`], { env: { ...process.env, PGTZ: "UTC" } });
    const in_ = spawn("psql", [DATABASE_URL!, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", `\\copy ${mal} FROM STDIN`]);
    let bytes = 0, fel = "", klara = 0;
    in_.stdin.on("error", () => {});   // en mottagare som faller ger EPIPE här; felet rapporteras ur dess exit-kod
    ut.stdout.on("data", (d: Buffer) => { bytes += d.length; });
    ut.stdout.pipe(in_.stdin);
    ut.stderr.on("data", (d) => (fel += d));
    in_.stderr.on("data", (d) => (fel += d));
    const klar = (kod: number | null) => {
      if (kod !== 0) return rej(new Error(`\\copy föll (${mal}): ${fel.slice(0, 300)}`));
      if (++klara === 2) res(bytes);
    };
    ut.on("close", klar);
    in_.on("close", klar);
  });
}

const kolumner = async (tabell: string): Promise<string> => (await tf.query(
  `SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) AS k FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'`, [tabell])).rows[0].k;
const mb = (b: number) => `${(b / 1_048_576).toFixed(1)} MB`;
const tal = (n: number) => n.toLocaleString("sv-SE");

console.log(`GRINDARNAS TILLFÄLLIGA DATABAS — ${DAGAR} dygn (kort #323)\n`);

// 1. Driftens schema.
await tf.query("CREATE EXTENSION IF NOT EXISTS postgis");
const dump = await kor("pg_dump", ["--schema-only", "--schema=public", "--no-owner", "--no-privileges", DUMP_URL]);
if (dump.kod !== 0) { console.error(`pg_dump föll: ${dump.fel.slice(0, 400)}`); process.exit(1); }
const schema = await kor("psql", [DATABASE_URL, "-X", "-q"], dump.ut);
const schemafel = schema.fel.split("\n").filter((r) => r.includes("ERROR"));
console.log(`schemat ur driften: ${dump.ut.length} tecken, ${schemafel.length} fel vid inläsningen (väntat: det som kräver pg_cron, pg_net eller Supabases roller)`);
for (const r of schemafel.slice(0, 8)) console.log(`  ${r.slice(0, 160)}`);
const [finns] = (await tf.query(`SELECT to_regclass('weather_observations') IS NOT NULL AS wo, to_regprocedure('arkiv_aterlas(text)') IS NOT NULL AS fn,
  (SELECT array_agg(t) FROM unnest($1::text[]) t WHERE to_regclass(t) IS NULL) AS saknas`, [TABELLER])).rows;
if (!finns.wo || !finns.fn || finns.saknas) {
  console.error(`schemat är ofullständigt: weather_observations ${finns.wo}, arkiv_aterlas ${finns.fn}, saknade tabeller ${finns.saknas}`);
  process.exit(1);
}

// 2. Fönstret och varifrån varje dygn läses.
// Karantänen räknar brotten de KARANTAN_DYGN dygnen FÖRE varje rad (snapshot-core.ts brottSql), så fönstrets första dygn behöver
// dygnen före sig. Utan dem släppte den tillfälliga databasen igenom rader som driften spärrar (provet 10/10: 646 083 mot 645 841
// i grind A). Marginalen täcker också de andra bakåtblickarna (R-B 12 timmar, vägpunktens population 7 dygn).
const [nu] = await utc(drift, `SELECT now() AS b, (now())::date::text AS idag, (now() - ($1 + ${KARANTAN_DYGN}) * interval '1 day')::date::text AS fran`, [DAGAR]);
const B: string = new Date(nu.b).toISOString();
const dygn = fonstret(nu.fran, nu.idag);
const exp = new Map<string, { rader: number; sha256: string; raderad: boolean }>();
for (const r of await utc(drift, `SELECT dag::text AS dag, rader, sha256, raderad IS NOT NULL AS raderad FROM arkiv_export WHERE dag >= $1::date`, [nu.fran]))
  exp.set(r.dag, { rader: Number(r.rader), sha256: r.sha256, raderad: r.raderad });
const iDriften = new Set((await utc(drift, `SELECT DISTINCT sample_time::date::text AS d FROM weather_observations
  WHERE sample_time >= $1::date AND sample_time < $2`, [nu.fran, B])).map((r) => r.d as string));
const planen = plan(dygn, new Set(exp.keys()), iDriften);
const rader = new Map<string, number>();

// 3. Hinken.
const urHinken = planen.filter((p) => p.kalla === "hink").map((p) => p.dag);
let hinkbytes = 0;
if (urHinken.length) {
  const [n] = await utc(drift, `SELECT substring(command from '(https://[a-z0-9]+[.]supabase[.]co)') || '/functions/v1/arkivdump' AS fn,
    substring(command from 'x-halkvakt-key[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)') AS nyckel FROM cron.job WHERE jobname = 'halkvakt-arkivexport'`);
  if (!n?.nyckel || n.nyckel.length < 32) { console.error("nyckeln gick inte att läsa ur cron.job (halkvakt-arkivexport)"); process.exit(1); }
  console.log(`::add-mask::${n.nyckel}`);
  const filer: { dag: string; url: string }[] = [];
  for (let i = 0; i < urHinken.length; i += MAX_DYGN) {
    const svar = await fetch(`${n.fn}?lage=dygn_hamta`, { method: "POST", headers: { "x-halkvakt-key": n.nyckel, "Content-Type": "application/json" },
      body: JSON.stringify({ dagar: urHinken.slice(i, i + MAX_DYGN) }) });
    const j = await svar.json().catch(() => ({})) as { filer?: { dag: string; url: string }[]; fel?: string };
    if (!svar.ok || !j.filer) { console.error(`arkivdump dygn_hamta ${svar.status}: ${j.fel ?? "inget svar"}`); process.exit(1); }
    filer.push(...j.filer);
  }
  for (const f of filer) {
    const r = await fetch(f.url);
    if (!r.ok) { console.error(`${f.dag}: hämtningen gav ${r.status}`); process.exit(1); }
    const gz = Buffer.from(await r.arrayBuffer());
    hinkbytes += gz.length;
    const e = exp.get(f.dag)!;
    if (createHash("sha256").update(gz).digest("hex") !== e.sha256) { console.error(`${f.dag}: kontrollsumman skiljer sig från arkiv_export`); process.exit(1); }
    const [{ n: inlasta }] = (await tf.query("SELECT arkiv_aterlas($1) AS n", [gunzipSync(gz).toString("utf8")])).rows;
    if (Number(inlasta) !== e.rader) { console.error(`${f.dag}: ${inlasta} rader inlästa, ${e.rader} bokförda`); process.exit(1); }
    rader.set(f.dag, e.rader);
  }
}

// 4. Driften: dygnen som ännu inte är exporterade, upp till B.
const urDriften = planen.filter((p) => p.kalla === "drift").map((p) => p.dag);
const wk = await kolumner("weather_observations");
let driftbytes = 0;
if (urDriften.length) {
  driftbytes += await kopiera(`SELECT ${wk} FROM weather_observations WHERE sample_time >= '${urDriften[0]}T00:00:00Z' AND sample_time < '${B}'` +
    ` AND (sample_time AT TIME ZONE 'UTC')::date IN (${urDriften.map((d) => `'${d}'`).join(", ")})`, `weather_observations (${wk})`);
  for (const r of await utc(tf, `SELECT sample_time::date::text AS d, count(*) AS n FROM weather_observations WHERE sample_time >= $1::date GROUP BY 1`, [urDriften[0]]))
    if (urDriften.includes(r.d)) rader.set(r.d, Number(r.n));
}

// 5. Tabellerna vid sidan av, hela.
const sidotabeller: string[] = [];
for (const t of TABELLER) {
  const k = await kolumner(t);
  const b = await kopiera(`SELECT ${k} FROM ${t}`, `${t} (${k})`);
  driftbytes += b;
  const [{ n }] = (await tf.query(`SELECT count(*) AS n FROM ${t}`)).rows;
  sidotabeller.push(`${t} ${tal(Number(n))} rader`);
}
await tf.query("ANALYZE");

// 6. Bokföringen.
console.log(`fönstret ${dygn[0]}–${dygn.at(-1)} (${DAGAR} dygn och karantänens ${KARANTAN_DYGN} före), driftens tid ${B}\n`);
console.log("  dygn         källa    rader");
for (const p of planen) console.log(`  ${p.dag}   ${p.kalla.padEnd(7)} ${p.kalla === "saknas" ? "        –" : tal(rader.get(p.dag) ?? 0).padStart(9)}`);
const saknas = planen.filter((p) => p.kalla === "saknas").map((p) => p.dag);
const summa = [...rader.values()].reduce((a, b) => a + b, 0);
console.log(`\n${urHinken.length} dygn ur hinken (${mb(hinkbytes)} packat), ${urDriften.length} ur driften, ${saknas.length} saknas` +
  (saknas.length ? ` (${saknas.join(", ")})` : "") + ` — ${tal(summa)} rader`);
console.log(`vid sidan av: ${sidotabeller.join(", ")}`);
console.log(`trafik: ${mb(hinkbytes)} ur hinken och ${mb(driftbytes)} ur driften\n`);

// 7. Beviset: varje dygn som finns kvar i driften, rad för rad som kontrollsumma.
if (JAMFOR) {
  const summera = (pool: any, d: string) => utc(pool, `SELECT count(*) AS n, md5(coalesce(string_agg(t::text, E'\\n' ORDER BY t::text COLLATE "C"), '')) AS h
    FROM (SELECT ${wk} FROM weather_observations WHERE sample_time >= $1::date AND sample_time < least(($1::date + 1)::timestamptz, $2::timestamptz)) t`, [d, B]);
  console.log("JÄMFÖRELSEN — driften mot den tillfälliga databasen, dygn för dygn (antal rader och md5 över raderna)");
  console.log("  dygn         källa    driften   tillfälliga  lika");
  let fel = 0, provade = 0;
  for (const p of planen) {
    if (p.kalla === "saknas" || !iDriften.has(p.dag)) continue;
    const [[a], [b]] = await Promise.all([summera(drift, p.dag), summera(tf, p.dag)]);
    const lika = a.n === b.n && a.h === b.h;
    // Dygnet där driftens tid ligger kan få sena rader efter kopian; det skrivs ut men fäller inte.
    const sista = p.dag === nu.idag;
    if (!lika && !sista) fel++;
    provade++;
    console.log(`  ${p.dag}   ${p.kalla.padEnd(7)} ${tal(Number(a.n)).padStart(9)} ${tal(Number(b.n)).padStart(12)}  ${lika ? "✅" : sista ? "⏳ sena rader" : "❌"}`);
  }
  console.log(`\n${provade} dygn jämförda, ${fel} olika.`);
  if (fel) { console.error("JÄMFÖRELSEN FÄLLDE: den tillfälliga databasen bär inte driftens rader."); process.exit(1); }
}
await drift.end();
await tf.end();
