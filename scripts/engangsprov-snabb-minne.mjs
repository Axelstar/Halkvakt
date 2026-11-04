// ENGÅNGSPROV 3–4/11 2026 (DECISIONS #783, kort #373): den snabba kandidatens minne i Supabases egen Postgres.
// Körs bara av .github/workflows/engangsprov-snabb-minne.yml på grenen claude/snabb-minne-prov, aldrig mot produktionen.
//
// 3/11 (df33ff59, körning 41686274376) visade orsaken: avståndsfunktionen kandidat_hav kunde inte inlinas (FROM i kroppen), och i
// Supabases avbild läcker varje sådant anrop ~230 byte till satsens slut; grannbygget nådde vaktens gräns. 4/11 prövas rättelsen på
// kuvos-grenen claude/kandidat-hav-inline, där funktionen är ett enda uttryck:
//   0. kontrollen: en neutral funktion som inte kan inlinas läcker fortfarande i avbilden, så att ett lågt tal nedan inte beror på att
//      mätningen är blind;
//   1. planen: kandidat_hav inlinad (bara ja eller nej skrivs ut, aldrig planen, som bär funktionens kropp);
//   2–6. kedjan i full skala (13 814 punkter, 788 stationer, påhittade data och ett påhittat par): grannbygget, räkningen, anroparen
//      med och utan ombygge, och anroparen när stationerna saknar PH (då räknas varje lista genom reserven, mot alla ankare).
// Minnet är processens RssAnon i /proc, läst var 500 ms; en vakt avbryter en sats vars process passerar MAX_MB. Ett steg över GRANS_MB,
// ett avbrutet steg eller ett fel fäller körningen. Utskriften bär bara tider, minne och antal.
//
//   PGPASSWORD=… PGMOD=<mapp med pg> ROR=sql/078_kandidat_snabb.sql SNABB=<kuvos kandidat_snabb.sql> node scripts/engangsprov-snabb-minne.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";

const pg = createRequire(join(process.env.PGMOD, "package.json"))("pg");
const { ROR, SNABB } = process.env;
const MAX_MB = Number(process.env.MAX_MB || 1300);
const GRANS_MB = Number(process.env.GRANS_MB || 100);
const PROV_N = Number(process.env.PROV_N || 3000000);
const N_ST = 788, N_PKT = 13814;
const W = 0.3, L = 120, TID = "2026-11-03T10:00:00Z";      // påhittat par och timme, som kuvos test/kandidat-snabb.test.ts
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
async function sats(namn, q, v = []) {
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
  try { rader = (await c.query(q, v)).rows; } catch (e) { fel = e.code || "fel"; }
  const s = (Date.now() - t0) / 1000;
  slut = true; await las; await c.end().catch(() => {}); await vakt.end().catch(() => {});
  const okning = MB(topp) - MB(grund ?? 0);
  const per = rader && /prov_/.test(q) ? ` (${(((topp - (grund ?? 0)) * 1024) / PROV_N).toFixed(0)} byte per anrop)` : "";
  console.log(`${namn}: ${fel ? `FEL ${fel}` : "klart"} på ${s.toFixed(1)} s; eget minne ${MB(grund ?? 0)} → topp ${MB(topp)} MB (+${okning})${per}` +
    `${avbruten ? ` — AVBRUTEN över ${MAX_MB} MB` : ""}`);
  return { namn, s, okning, avbruten, fel };
}

/** Påhittat Sverige i produktionens storlek: tätare i söder, var 25:e station saknas som ankare denna timme, 1 % punkter utan PH. */
function data() {
  let s = 7 >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const n = () => { const u = Math.max(r(), 1e-12), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const en = (x) => Math.round(x * 10) / 10;
  const plats = () => { const lat = 55.4 + 13.6 * Math.pow(r(), 1.6); return { lon: 11.5 + r() * (lat < 60 ? 7.5 : 11.5), lat }; };
  const st = Array.from({ length: N_ST }, (_, i) => ({ id: `S${String(i).padStart(4, "0")}`, ...plats() }));
  const vp = Array.from({ length: N_PKT - N_ST }, (_, i) => ({ punkt: `v${String(i).padStart(5, "0")}`, ...plats() }));
  const punkter = [...vp, ...st.map((x) => ({ punkt: x.id, lon: x.lon, lat: x.lat }))];
  const ph = punkter.filter((_, i) => i % 100 !== 37).map((p) => ({ punkt: p.punkt, ph: Math.fround(en(n() * 3)) }));
  const ankare = st.filter((_, i) => i % 25 !== 3).map((x) => ({ ...x, yta: en(n() * 3) }));
  return { punkter, ph, ankare, st };
}

await redo();
await vanta(10000);                      // avbilden kör sina migreringar vid första starten
await redo();
const c0 = await ny();
console.log("Avbilden:", (await c0.query("SHOW server_version")).rows[0].server_version);
await c0.query(`CREATE OR REPLACE FUNCTION prov_ej_inline(a float8, b float8) RETURNS float8 LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT x * y + 1 FROM (SELECT sin(a) AS x, cos(b) AS y) s $$`);
await c0.end();
const steg = [];

console.log(`\n0. Kontrollen: en funktion som inte kan inlinas, ${PROV_N} anrop`);
const k0 = await sats("ej inlinad (kontroll)", `SELECT sum(prov_ej_inline(i::float8, 1.0)) FROM generate_series(1, ${PROV_N}) i`);
const blind = k0.okning < 300;
console.log(blind ? "kontrollen läckte inte: mätningen kan vara blind" : "kontrollen läcker som 3/11: mätningen ser en läcka");

console.log("\n1. Planen och indatan");
const c1 = await ny();
await c1.query(`CREATE TABLE IF NOT EXISTS ny_kandidat_ph (korning timestamptz NOT NULL, tid timestamptz NOT NULL, punkt text NOT NULL,
  ts_fysik real, ph real, PRIMARY KEY (tid, punkt))`);
await c1.query(readFileSync(ROR, "utf8"));
try { await c1.query(readFileSync(SNABB, "utf8")); } catch (e) { console.log(`räkningen kunde inte läggas in: ${e.code || "fel"}`); process.exit(1); }
const d = data();
await c1.query("INSERT INTO kandidat_punkter (punkt, lon, lat) SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[])",
  [d.punkter.map((p) => p.punkt), d.punkter.map((p) => p.lon), d.punkter.map((p) => p.lat)]);
await c1.query("INSERT INTO ny_kandidat_ph (korning, tid, punkt, ph) SELECT $1, $1, * FROM UNNEST($2::text[], $3::real[])",
  [TID, d.ph.map((x) => x.punkt), d.ph.map((x) => x.ph)]);
await c1.query("INSERT INTO kandidat_snabb_ankare (id, lon, lat, yta) SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[], $4::float8[])",
  [d.ankare.map((a) => a.id), d.ankare.map((a) => a.lon), d.ankare.map((a) => a.lat), d.ankare.map((a) => a.yta)]);
await c1.query("ANALYZE");
const plan = (await c1.query("EXPLAIN (VERBOSE, COSTS OFF) SELECT kandidat_hav(a.lon, a.lat, b.lon, b.lat) FROM kandidat_punkter a, kandidat_punkter b"))
  .rows.map((x) => x["QUERY PLAN"]).join("\n");
const inlinad = !/kandidat_hav/.test(plan);
console.log(`kandidat_hav inlinad i planen: ${inlinad ? "ja" : "NEJ"}`);
console.log(`indata: ${d.punkter.length} punkter, ${d.ph.length} med PH, ${d.ankare.length} ankare av ${d.st.length} stationer`);
await c1.end();

console.log("\n2–6. Kedjan i full skala");
steg.push(await sats("2 kandidat_grannar_bygg()", "SELECT kandidat_grannar_bygg()"));
steg.push(await sats("3 kandidat_snabb_rakna()", "SELECT count(*) FROM kandidat_snabb_rakna($1, $2, $3)", [TID, W, L]));
const c2 = await ny();
await c2.query("CREATE TABLE prov_ankare AS SELECT id, lon, lat, yta FROM kandidat_snabb_ankare");
await c2.query("CREATE FUNCTION vagpunkt_ankare() RETURNS TABLE (id text, lon double precision, lat double precision, yta numeric) LANGUAGE sql AS 'SELECT id, lon, lat, yta::numeric FROM prov_ankare'");
await c2.query("INSERT INTO ny_kandidat_ph (korning, tid, punkt, ph) SELECT korning, date_trunc('hour', now()), punkt, ph FROM ny_kandidat_ph WHERE tid = $1", [TID]);
await c2.query("INSERT INTO kandidat_par (w, l_km) VALUES ($1, $2)", [W, L]);
await c2.query("UPDATE kandidat_punkter SET andrad = now()");
steg.push(await sats("4 kandidat_snabb() med ombygge", "SELECT kandidat_snabb()"));
steg.push(await sats("5 kandidat_snabb() utan ombygge", "SELECT kandidat_snabb()"));
await c2.query("DELETE FROM ny_kandidat_ph WHERE tid = date_trunc('hour', now()) AND punkt IN (SELECT station_id FROM kandidat_stationer)");
const ofull = (await c2.query("SELECT count(*) FILTER (WHERE ofullstandig) AS n FROM kandidat_snabb_rakna(date_trunc('hour', now()), $1, $2)", [W, L])).rows[0].n;
steg.push(await sats("6 kandidat_snabb() när stationerna saknar PH", "SELECT kandidat_snabb()"));
console.log(`  (utan stationernas PH räknas ${ofull} punkter genom reserven)`);
await c2.end();

const over = steg.filter((x) => x.fel || x.avbruten || x.okning > GRANS_MB);
console.log(`\nDomen: ${!blind && inlinad && !over.length ? "KLARAR" : "FALLER"} — kontrollen ${blind ? "blind" : "ser läckan"}, ` +
  `inlinad ${inlinad ? "ja" : "nej"}, ${over.length} av ${steg.length} steg över ${GRANS_MB} MB, avbrutna eller fel`);
process.exit(!blind && inlinad && !over.length ? 0 : 1);
