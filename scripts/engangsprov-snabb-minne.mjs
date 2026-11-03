// ENGÅNGSPROV 3/11 2026 (DECISIONS #783, kort #373): varför den snabba kandidatens första riktiga körningar fyllde databasens minne.
// Körs bara av .github/workflows/engangsprov-snabb-minne.yml på grenen claude/snabb-minne-prov, aldrig mot produktionen.
//
// Produktionen (Small, 1,79 GB) gick från 0,3 till 1,4 GB använt minne på två minuter efter starten 12.39 och 12.44 UTC, och
// databasen startade om 12.41 och 12.46. Ett lokalt prov på Windows med Postgres 17.6 och 17.10 utan Supabases tillägg gav på
// påhittade data i full storlek högst 37 MB per process. Skillnaden som återstår är Supabases egen Postgres med tilläggen i
// shared_preload_libraries. Här körs Supabases avbild i en container med produktionens minne, och mäts:
//   1. mekanismen: en neutral SQL-funktion som inte kan inlinas (FROM i kroppen, som grannlistornas avståndsfunktion) mot en som
//      kan, PROV_N anrop vardera i en sats;
//   2. bygget av grannlistorna i full skala (13 814 punkter, 788 stationer), med kuvösens räkning ur det privata repot;
//   3. om mekanismen läcker: samma prov med ett tillägg i taget borttaget ur shared_preload_libraries.
// Minnet är processens RssAnon i /proc (det egna minnet, utan de delade buffertarna), läst var 500 ms. En vakt avbryter en sats vars
// process passerar MAX_MB, så att containern inte dör av minnesbrist.
// Utskriften bär bara tider, minne, antal och tilläggens namn — aldrig räkningens kropp (halkvakt-kuvos) eller ett riktigt par.
//
//   PGPASSWORD=… PGMOD=<mapp med pg> ROR=sql/078_kandidat_snabb.sql SNABB=<kuvos kandidat_snabb.sql> node scripts/engangsprov-snabb-minne.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { join } from "node:path";

const pg = createRequire(join(process.env.PGMOD, "package.json"))("pg");
const { ROR, SNABB } = process.env;
const MAX_MB = Number(process.env.MAX_MB || 1300);
const PROV_N = Number(process.env.PROV_N || 3000000);
const N_ST = 788, N_PKT = 13814;
const MB = (kb) => Math.round(kb / 1024);
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

const ny = async () => { const c = new pg.Client({ host: "127.0.0.1", port: 5432, user: "postgres", database: "postgres" }); await c.connect(); return c; };
async function redo() {
  for (let i = 0; i < 120; i++) { try { const c = await ny(); await c.query("SELECT 1"); await c.end(); return; } catch { await vanta(1000); } }
  throw new Error("databasen kom inte upp");
}

/** Processens RssAnon i kB ur containerns /proc. */
const anon = (pid) => new Promise((r) => execFile("docker", ["exec", "pg", "cat", `/proc/${pid}/status`], (e, ut) =>
  r(e ? null : Number((String(ut).match(/RssAnon:\s+(\d+)/) || [])[1]))));

/** En sats i en egen anslutning: tiden och processens minnestopp; vakten avbryter över MAX_MB. */
async function sats(namn, q) {
  const c = await ny(), vakt = await ny();
  const pid = (await c.query("SELECT pg_backend_pid() AS p")).rows[0].p;
  const grund = await anon(pid);
  let topp = grund ?? 0, avbruten = false, slut = false;
  const las = (async () => {
    while (!slut) {
      const a = await anon(pid);
      if (a) { topp = Math.max(topp, a); if (a > MAX_MB * 1024 && !avbruten) { avbruten = true; await vakt.query("SELECT pg_cancel_backend($1)", [pid]).catch(() => {}); } }
      await vanta(500);
    }
  })();
  const t0 = Date.now();
  let fel = null, rader = null;
  try { rader = (await c.query(q)).rows; } catch (e) { fel = e.code || "fel"; }
  const s = (Date.now() - t0) / 1000;
  slut = true; await las; await c.end().catch(() => {}); await vakt.end().catch(() => {});
  const per = rader && /prov_/.test(q) ? ` (${(((topp - (grund ?? 0)) * 1024) / PROV_N).toFixed(0)} byte per anrop)` : "";
  console.log(`${namn}: ${fel ? `FEL ${fel}` : "klart"} på ${s.toFixed(1)} s; eget minne ${MB(grund ?? 0)} → topp ${MB(topp)} MB${per}${avbruten ? ` — AVBRUTEN över ${MAX_MB} MB` : ""}`);
  return { namn, s, grund_mb: MB(grund ?? 0), topp_mb: MB(topp), avbruten, fel };
}

const EJ_INLINE = `SELECT sum(prov_ej_inline(i::float8, 1.0)) FROM generate_series(1, ${PROV_N}) i`;
const INLINE = `SELECT sum(prov_inline(i::float8, 1.0)) FROM generate_series(1, ${PROV_N}) i`;

/** Påhittat Sverige i produktionens storlek (som test/kandidat-snabb.test.ts i kuvos, men 13 814 punkter och 788 stationer). */
function data() {
  let s = 7 >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const plats = () => { const lat = 55.4 + 13.6 * Math.pow(r(), 1.6); return { lon: 11.5 + r() * (lat < 60 ? 7.5 : 11.5), lat }; };
  const st = Array.from({ length: N_ST }, (_, i) => ({ id: `S${String(i).padStart(4, "0")}`, ...plats() }));
  const vp = Array.from({ length: N_PKT - N_ST }, (_, i) => ({ punkt: `v${String(i).padStart(5, "0")}`, ...plats() }));
  return { punkter: [...vp, ...st.map((x) => ({ punkt: x.id, lon: x.lon, lat: x.lat }))], st };
}

await redo();
await vanta(10000);                      // avbilden kör sina migreringar vid första starten
await redo();
const c0 = await ny();
const inst = Object.fromEntries((await c0.query(`SELECT name, setting FROM pg_settings WHERE name IN ('server_version', 'shared_preload_libraries',
  'jit', 'work_mem', 'shared_buffers', 'pgaudit.log', 'auto_explain.log_min_duration', 'pg_stat_statements.track', 'config_file')`)).rows.map((x) => [x.name, x.setting]));
console.log("Avbilden:", JSON.stringify(inst));
await c0.query(`CREATE OR REPLACE FUNCTION prov_ej_inline(a float8, b float8) RETURNS float8 LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT x * y + 1 FROM (SELECT sin(a) AS x, cos(b) AS y) s $$`);
await c0.query(`CREATE OR REPLACE FUNCTION prov_inline(a float8, b float8) RETURNS float8 LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT sin(a) * cos(b) + 1 $$`);
await c0.end();

console.log(`\n1. Mekanismen, ${PROV_N} anrop`);
const m1 = await sats("ej inlinad", EJ_INLINE);
await sats("inlinad", INLINE);

console.log("\n2. Grannlistorna i full skala");
const c1 = await ny();
await c1.query(`CREATE TABLE IF NOT EXISTS ny_kandidat_ph (korning timestamptz NOT NULL, tid timestamptz NOT NULL, punkt text NOT NULL,
  ts_fysik real, ph real, PRIMARY KEY (tid, punkt))`);
await c1.query(readFileSync(ROR, "utf8"));
try { await c1.query(readFileSync(SNABB, "utf8")); } catch (e) { console.log(`räkningen kunde inte läggas in: ${e.code || "fel"}`); process.exit(1); }
const d = data();
await c1.query("INSERT INTO kandidat_punkter (punkt, lon, lat) SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[])",
  [d.punkter.map((p) => p.punkt), d.punkter.map((p) => p.lon), d.punkter.map((p) => p.lat)]);
await c1.query("INSERT INTO kandidat_snabb_ankare (id, lon, lat, yta) SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[], $4::float8[])",
  [d.st.map((x) => x.id), d.st.map((x) => x.lon), d.st.map((x) => x.lat), d.st.map(() => 0)]);
await c1.query("ANALYZE");
await c1.end();
await sats("kandidat_grannar_bygg()", "SELECT kandidat_grannar_bygg()");

if (m1.topp_mb - m1.grund_mb > 100) {
  console.log("\n3. Mekanismen läcker; samma prov med ett tillägg i taget borttaget");
  const alla = inst.shared_preload_libraries.split(",").map((x) => x.trim()).filter(Boolean);
  const satt = (lista) => {
    // en egen fil som inkluderas sist i konfigurationen, så att dess rad vinner
    const conf = inst.config_file, sista = conf.replace(/[^/]+$/, "sista.conf");
    execFileSync("docker", ["exec", "-u", "root", "pg", "sh", "-c",
      `echo "shared_preload_libraries = '${lista.join(", ")}'" > ${sista} && chmod 644 ${sista} && (grep -q sista.conf ${conf} || echo "include '${sista}'" >> ${conf})`]);
    execFileSync("docker", ["restart", "pg"], { stdio: "ignore" });
  };
  for (const bort of alla) {
    satt(alla.filter((x) => x !== bort));
    await redo();
    const c = await ny();
    const nu = (await c.query("SHOW shared_preload_libraries")).rows[0].shared_preload_libraries;
    await c.end();
    if (nu.split(",").map((x) => x.trim()).includes(bort)) { console.log(`utan ${bort}: inställningen tog inte`); continue; }
    await sats(`utan ${bort}`, EJ_INLINE);
  }
  satt(alla);
}
