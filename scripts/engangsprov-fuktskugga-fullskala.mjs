// ENGÅNGSPROV 19/11 2026 (körlistan C4 och C7; DECISIONS #907 och #908; halkvakt-kuvos F74 §8 och F75 §9): fuktskuggan i full skala i
// Supabases egen Postgres, i en container med produktionens minne, innan DB-knappen trycks. Körs bara av
// .github/workflows/engangsprov-fuktskugga-fullskala.yml på grenen claude/fuktskugga-fullskala-prov, aldrig mot produktionen och aldrig
// på main. Läxan är DECISIONS #783: en SQL-funktion som inte kan inlinas läcker i Supabases avbild, och bara avbilden visar det.
//
// Databasen är den tillfälliga: driftens schema och driftens rader (scripts/tillfalliga-arkivet.ts), med sql/126–127 ovanpå. Driften har
// ännu ingen ny_kandidat_met_stad, så den fylls med påhittade värden för timmen och timmen före, för varje stadspunkt i ny_kandidat_live.
// Alla stadsbrytare slås på i den tillfälliga databasen (F75 §9: "en hel timme med alla brytare på").
//   0. kontrollen: en neutral funktion som inte kan inlinas läcker fortfarande, så att ett lågt tal nedan inte beror på att mätningen är blind;
//   1. planen: varje LANGUAGE sql-funktion i sql/126–127 inlinad (auto_explain med verbose; bara ja eller nej skrivs ut, aldrig planen);
//   2. regeln ensam, som jämförelse;
//   3. skuggan en timme, och en omkörning av samma timme;
//   4. storleken: tabellernas storlek efter körningen, och att de nya kolumnerna har värden.
// Minnet är processens RssAnon i /proc, läst var 500 ms; en vakt avbryter en sats vars process passerar MAX_MB. Ett steg över GRANS_MB,
// ett avbrutet steg eller ett fel fäller körningen. Utskriften bär bara tider, minne, storlek och ja eller nej — aldrig skuggans tal,
// eftersom de räknas som sedda (F74 §12).
//
//   PGMOD=<mapp med pg> DATABASE_URL=… node scripts/engangsprov-fuktskugga-fullskala.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";

const pg = createRequire(join(process.env.PGMOD, "package.json"))("pg");
const MAX_MB = Number(process.env.MAX_MB || 1300);
const GRANS_MB = Number(process.env.GRANS_MB || 100);
const PROV_N = Number(process.env.PROV_N || 3000000);
const MIGRATIONER = ["sql/126_stadens_met_fukt.sql", "sql/127_fuktskuggan_stad.sql"];
const NYA_KOLUMNER = ["g_rim_utan_varde", "m_dagg_punkter", "m_dagg_utan_varde", "s1h_punkter", "s2h_punkter", "s3h_punkter", "s4h_punkter",
  "c7_alla_punkter"];
const MB = (kb) => Math.round(kb / 1024);
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

const ny = async () => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("SET TimeZone = 'UTC'");
  return c;
};

/** Processens RssAnon i kB ur containerns /proc. */
const anon = (pid) => new Promise((r) => execFile("docker", ["exec", "pg", "cat", `/proc/${pid}/status`], (e, ut) =>
  r(e ? null : Number((String(ut).match(/RssAnon:\s+(\d+)/) || [])[1]))));

/** En sats i en egen anslutning: tiden och processens minnestopp; vakten avbryter över MAX_MB. `fore` körs i samma anslutning först. */
async function sats(namn, q, fore = []) {
  const c = await ny(), vakt = await ny();
  for (const f of fore) await c.query(f);
  const pid = (await c.query("SELECT pg_backend_pid() AS p")).rows[0].p;
  const grund = await anon(pid);
  let topp = grund ?? 0, avbruten = false, slut = false;
  const las = (async () => {
    while (!slut) {
      const a = await anon(pid);
      if (a) {
        topp = Math.max(topp, a);
        if (a > MAX_MB * 1024 && !avbruten) { avbruten = true; await vakt.query("SELECT pg_cancel_backend($1)", [pid]).catch(() => {}); }
      }
      await vanta(500);
    }
  })();
  const t0 = Date.now();
  let fel = null;
  try { await c.query(q); } catch (e) { fel = e.code || "fel"; }
  const s = (Date.now() - t0) / 1000;
  slut = true; await las; await c.end().catch(() => {}); await vakt.end().catch(() => {});
  const okning = MB(topp) - MB(grund ?? 0);
  const per = /prov_ej_inline/.test(q) ? ` (${(((topp - (grund ?? 0)) * 1024) / PROV_N).toFixed(0)} byte per anrop)` : "";
  console.log(`${namn}: ${fel ? `FEL ${fel}` : "klart"} på ${s.toFixed(1)} s; eget minne ${MB(grund ?? 0)} → topp ${MB(topp)} MB (+${okning})${per}` +
    `${avbruten ? ` — AVBRUTEN över ${MAX_MB} MB` : ""}`);
  return { namn, s, okning, avbruten, fel, per: (topp - (grund ?? 0)) * 1024 / PROV_N };
}

const fel = [];
const c = await ny();

// Förberedelsen: brytarna på och MET:s påhittade fukt för timmen och timmen före, för varje stadspunkt med en rad i ny_kandidat_live.
await c.query("UPDATE stadsbrytare SET pa = true, andrad_at = now(), skal = 'engångsprov i full skala, aldrig driften'");
const met = await c.query(`
  INSERT INTO ny_kandidat_met_stad (tid, punkt, korning, met_td_c, rh2m)
  SELECT l.tid - h * interval '1 hour', l.punkt, date_trunc('hour', l.tid) - interval '7 hours',
         round((l.pb + random() * 4 - 2)::numeric, 1)::float8, round((0.75 + random() * 0.25)::numeric, 3)::float8
  FROM ny_kandidat_live l CROSS JOIN generate_series(0, 1) h
  WHERE l.tid = (SELECT max(tid) FROM ny_kandidat_live) AND l.punkt ~ '^[BC][0-9]{5}$' AND l.pb IS NOT NULL
  ON CONFLICT (tid, punkt) DO NOTHING`);
console.log(`förberedelsen: alla stadsbrytare på; MET:s påhittade fukt för timmen och timmen före: ${met.rowCount > 0 ? "ja" : "NEJ"}`);
if (!met.rowCount) fel.push("inga stadspunkter i ny_kandidat_live");

// 0. Kontrollen.
await c.query("CREATE OR REPLACE FUNCTION prov_ej_inline(int) RETURNS int LANGUAGE sql AS 'SELECT $1 FROM (SELECT 1) s'");
const k = await sats("0. kontrollen, en funktion som inte kan inlinas", `SELECT sum(prov_ej_inline(g)) FROM generate_series(1, ${PROV_N}) g`);
if (k.fel || k.per < 50) fel.push("kontrollen ser ingen läcka: mätningen kan vara blind");

// 1. Planen: auto_explain med verbose för skuggans satser; varje sql-funktion ur migrationerna ska vara inlinad (namnet står inte i planen).
const sqlfunk = [];
for (const f of MIGRATIONER) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\bLANGUAGE\s+(\w+)/giu))
    if (m[3].toLowerCase() === "sql") sqlfunk.push(m[1]);
}
// Bara de sql-funktioner som skuggan själv anropar räknas: exportens hjälpfunktioner (arkiv2_*) körs aldrig i skuggans satser.
const kropp = (readFileSync("sql/127_fuktskuggan_stad.sql", "utf8").split(/FUNCTION\s+ny_kandidat_logga_fuktskugga\s*\(/u)[1] || "").split("$$;")[0];
if (!kropp) fel.push("skuggans funktion hittades inte i sql/127");
const anropade = sqlfunk.filter((f) => new RegExp(`\\b${f}\\(`, "u").test(kropp));
console.log(`   sql-funktioner i migrationerna: ${sqlfunk.length}, varav anropade av skuggan: ${anropade.length}`);
const fore = ["LOAD 'auto_explain'", "SET auto_explain.log_min_duration = 0", "SET auto_explain.log_nested_statements = on",
  "SET auto_explain.log_verbose = on", "SET auto_explain.log_format = 'text'", "SET client_min_messages = 'warning'"];
let planer = "";
try {
  const p = await sats("1. planen, skuggan en gång med auto_explain", "SELECT ny_kandidat_logga_fuktskugga()", fore);
  if (p.fel) fel.push("skuggan föll med auto_explain");
  const logg = await new Promise((r) => execFile("docker", ["logs", "pg"], { maxBuffer: 1 << 28 }, (_e, ut, err) => r(String(ut) + String(err))));
  planer = logg.split("\n").filter((r) => /duration: .* plan:|Function Scan|Output:|Filter:|Index Cond:|Join Filter:|Hash Cond:/u.test(r)).join("\n");
  console.log(`   planerna lästa: ${planer.length > 0 ? "ja" : "NEJ"}`);
} catch (e) {
  console.log(`1. planen: auto_explain gick inte att ladda (${e.code || "fel"})`);
}
if (!anropade.length) console.log("   skuggan anropar ingen LANGUAGE sql-funktion ur sql/126–127");
else if (!planer.length) fel.push("planerna gick inte att läsa, och skuggan anropar sql-funktioner");
for (const f of anropade) {
  const kvar = new RegExp(`\\b${f}\\(`, "u").test(planer);
  console.log(`   ${f}: inlinad ${kvar ? "NEJ" : "ja"}`);
  if (kvar) fel.push(`${f} inlinas inte`);
}

// 2–3. Regeln ensam, skuggan och en omkörning av samma timme.
const steg = [
  await sats("2. regeln ensam (ny_kandidat_regel)", "SELECT count(*) FROM ny_kandidat_regel()"),
  await sats("3. skuggan, en timme", "SELECT ny_kandidat_logga_fuktskugga()"),
  await sats("3. skuggan, omkörning av samma timme", "SELECT ny_kandidat_logga_fuktskugga()"),
];
for (const x of steg) {
  if (x.fel) fel.push(`${x.namn}: ${x.fel}`);
  if (x.avbruten) fel.push(`${x.namn}: avbruten`);
  if (x.okning > GRANS_MB) fel.push(`${x.namn}: +${x.okning} MB över gränsen ${GRANS_MB} MB`);
}

// 4. Storleken och att de nya kolumnerna har värden.
const [s] = (await c.query(`SELECT pg_total_relation_size('ny_kandidat_fuktskugga_stad') AS t, pg_total_relation_size('ny_kandidat_fuktskugga_stad_korning') AS k,
  pg_total_relation_size('ny_kandidat_met_stad') AS m, (SELECT count(*) > 0 FROM ny_kandidat_fuktskugga_stad) AS rader,
  (SELECT bool_and(status = 'räknad') FROM ny_kandidat_fuktskugga_stad_korning) AS raknad,
  (SELECT count(*) FROM ny_kandidat_fuktskugga_stad WHERE ${NYA_KOLUMNER.map((k) => `${k} IS NULL`).join(" OR ")}) AS tomma`)).rows;
console.log(`4. storleken: skuggans tabell ${Math.round(s.t / 1024)} kB, körningsloggen ${Math.round(s.k / 1024)} kB, MET-tabellen ${Math.round(s.m / 1024)} kB` +
  ` efter en timme och en omkörning; rader skrivna: ${s.rader ? "ja" : "NEJ"}; körningarna räknade: ${s.raknad ? "ja" : "NEJ"};` +
  ` de nya kolumnerna har värden: ${Number(s.tomma) === 0 ? "ja" : "NEJ"}`);
if (!s.rader) fel.push("skuggan skrev inga rader");
if (!s.raknad) fel.push("en körning blev inte räknad");
if (Number(s.tomma)) fel.push("nya kolumner utan värde");
await c.end();

if (fel.length) { console.log(`\nFÖLL: ${fel.join("; ")}`); process.exit(1); }
console.log("\nklart: skuggan i full skala håller sig inom gränserna");
