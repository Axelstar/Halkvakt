// FYSIK I KUVÖSEN — Axels fysikspår som kandidat till vägpunktsgrinden (kort #305, DECISIONS #485; förregistrerad 8/10, körd på Bengts ord).
// INGEN DOM, inga trösklar. Kandidaten är en FIL, inte kod: en skattning av ytan per station och halvtimme för vintern 2024/25, räknad
// utanför repot (ECMWF IFS ur Open-Meteos arkiv → 1-D värmekolumn med energibalans → inlärd rättelse där varje station förutsägs med
// hela sin region utesluten ur träningen; docs/FYSIKSPARET-SVAR-2026-10-07.md). Pipelinen frystes 7/10 med sha256 (docs/FYSIKSPARET-
// FRYS-2026-10-07.md), filens summa står i kuvos/fysik-leverans.json och kuvösknappen kontrollerar den. INGEN STATION används vid målet;
// målets egna mätningar är aldrig indata. Här läses filen — inget räknas om.
//   FYSIK    filens värde på hinken (på halvtimmen medlet av de två omgivande timmarna; utdata_fysik.py i arkivet).
//   RÅ       kontrollen: grind A:s evaluate() med utanOffset. Den ska landa på kuvösens 7,4–7,5 % (DECISIONS #481) — gör den inte
//            det skiljer populationen, och inget annat läses.
//   OFFSET   taket (målets egen historia), oförändrat.
// MÅTTEN: grind A:s A1/A2/A3 per band (bandet = RÅ:s närmaste bidragande granne på samma hink) och totalt, på de punkter där alla tre
// har ett värde; frysflaggan (#437) på samma punkter. Dessutom FYSIK på ALLA hinkar med yta ≤ +5 °C utan krav på ankare — det är
// kandidatens egentliga population, den behöver ingen granne — med norr/söder om 62°. Vakterna som grind A: #75, radvakten, karantänen,
// den långsamma vakten (sql/030 via karantanSql/RADVAKT_SQL, samma WHERE som prognoslagret 6/10).
// Kör: DATABASE_URL=... FYSIK=fysik/fysik-2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-fysik-2026-10-08.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { SPANN } from "../vardevakten.ts";

const BUCKET_S = 1800;
const POPULATION_C = 5;                   // grind A:s population: yta ≤ +5 °C
const NORR_LAT = 62;                      // norr/söder som fysikspårets egna tal (SVAR §5)

/** Filen: station_id,t_utc,fysik_c med t_utc på hela halvtimmar. Per station en Float32Array över vinterns hinkar (NaN = saknas). */
export type Fysik = { b0: number; nb: number; serie: Map<string, Float32Array>; rader: number; sha256: string; lo: number; hi: number };
export function lasFysik(buf: Buffer): Fysik {
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const text = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8");
  const rader: [string, number, number][] = [];
  let b0 = Infinity, b1 = -Infinity, start = text.indexOf("\n") + 1;
  if (!text.startsWith("station_id,t_utc,fysik_c")) throw new Error("FYSIK-filen: fel rubrikrad");
  while (start < text.length) {
    let slut = text.indexOf("\n", start); if (slut < 0) slut = text.length;
    const rad = text.slice(start, slut); start = slut + 1;
    if (!rad) continue;
    const i = rad.indexOf(","), j = rad.indexOf(",", i + 1);
    const s = Date.parse(rad.slice(i + 1, j)) / 1000;
    if (!Number.isFinite(s) || s % BUCKET_S !== 0) throw new Error(`FYSIK-filen: tiden ligger inte på en halvtimme: ${rad}`);
    const b = s / BUCKET_S, v = Number(rad.slice(j + 1));
    if (!Number.isFinite(v)) throw new Error(`FYSIK-filen: värdet är inte ett tal: ${rad}`);
    rader.push([rad.slice(0, i), b, v]);
    if (b < b0) b0 = b; if (b > b1) b1 = b;
  }
  let lo = Infinity, hi = -Infinity;
  for (const [, , v] of rader) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const nb = b1 - b0 + 1, serie = new Map<string, Float32Array>();
  for (const [id, b, v] of rader) {
    let a = serie.get(id);
    if (!a) { a = new Float32Array(nb).fill(NaN); serie.set(id, a); }
    a[b - b0] = v;
  }
  return { b0, nb, serie, rader: rader.length, sha256, lo, hi };
}
/** VÄRDEVAKTEN (CLAUDE.md): fältet fysik_c bär en mätning först när det passerat spannet i scripts/vardevakten.ts. */
export function spannkontroll(f: Fysik): string {
  const s = SPANN["fysik_c"];
  if (!s) throw new Error("fysik_c: OBESIKTIGAT — inget spann i scripts/vardevakten.ts");
  if (f.lo < s[0] || f.hi > s[1]) throw new Error(`fysik_c: ${f.lo}–${f.hi} utanför spannet ${s[0]}–${s[1]} ${s[2]}`);
  return `fysik_c: ${f.rader} värden, ${f.lo}–${f.hi} (spann ${s[0]}–${s[1]} ${s[2]})`;
}
export const fysikVid = (f: Fysik, id: string, b: number): number | null => {
  const a = f.serie.get(id), v = a && b >= f.b0 && b < f.b0 + f.nb ? a[b - f.b0] : NaN;
  return Number.isFinite(v) ? v : null;
};

/** En kandidat som delföljd av RÅ i samma ordning (som rutnätsmodellen 7/10): kandidatens skattning per RÅ-punkt, eller null. */
export function linjera(RA: Eval[], K: Eval[]): (number | null)[] {
  const ut: (number | null)[] = new Array(RA.length).fill(null);
  let j = 0;
  for (let i = 0; i < RA.length && j < K.length; i++) if (K[j].station === RA[i].station && K[j].t === RA[i].t) { ut[i] = K[j].pred; j++; }
  if (j !== K.length) throw new Error(`kandidaten har ${K.length - j} punkter som RÅ saknar`);
  return ut;
}

const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(2).replace(".", ",")} %` : "—");
const rad = (s: ReturnType<typeof stats>) =>
  s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} [±${(1.96 * 100 * s.grossSe).toFixed(2)} pe] · frysklassfel ${pct(s.freeze)}` : "n 0";

/** Hela läsningen. Returnerar grova fel per kandidat på de gemensamma punkterna (för självtestet). */
export function fysikILkuvosen(stations: Map<string, Station>, fysik: Fysik) {
  const RA = evaluate(stations, { utanOffset: true });
  const OFF = evaluate(stations);
  const kand: [string, (number | null)[]][] = [
    ["RÅ", RA.map((e) => e.pred)],
    ["FYSIK", RA.map((e) => fysikVid(fysik, e.station, e.t))],
    ["OFFSET (taket)", linjera(RA, OFF)],
  ];
  const N = RA.length, med = new Uint8Array(N);
  for (let k = 0; k < N; k++) med[k] = kand.every(([, v]) => v[k] !== null) ? 1 : 0;
  const nMed = med.reduce((a, b) => a + b, 0);
  console.log(`  punkter: ${kand.map(([n, v]) => `${n} ${v.filter((x) => x !== null).length}`).join(" · ")} · gemensamma ${nMed}`);
  console.log(`\n═══ Grind A:s mått på de ${nMed} gemensamma punkterna (bandet = RÅ:s närmaste bidragande granne) ═══`);
  const ut: Record<string, number> = {};
  for (const [namn, v] of kand) {
    const ev: Eval[] = [];
    for (let k = 0; k < N; k++) if (med[k]) ev.push({ ...RA[k], pred: v[k]! });
    const tot = stats(ev); ut[namn] = tot.gross;
    console.log(`  ${namn}: ${rad(tot)}`);
    for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
    const norr = ev.filter((e) => stations.get(e.station)!.lat >= NORR_LAT), soder = ev.filter((e) => stations.get(e.station)!.lat < NORR_LAT);
    console.log(`      norr ≥ ${NORR_LAT}° grova ${pct(stats(norr).gross)} (n ${norr.length}) · söder grova ${pct(stats(soder).gross)} (n ${soder.length})`);
  }
  // FYSIK på alla hinkar ≤ +5 °C — utan ankare, kandidatens egentliga population.
  const alla: Eval[] = [];
  for (const [id, s] of stations) for (const [t, measured] of s.series) {
    if (measured > POPULATION_C) continue;
    const p = fysikVid(fysik, id, t);
    if (p !== null) alla.push({ measured, pred: p, ankKm: 0, station: id, t, spridning: 0, ankare: 0 });
  }
  const tot = stats(alla); ut["FYSIK alla"] = tot.gross;
  const norr = alla.filter((e) => stations.get(e.station)!.lat >= NORR_LAT), soder = alla.filter((e) => stations.get(e.station)!.lat < NORR_LAT);
  console.log(`\n═══ FYSIK på alla hinkar med yta ≤ +${POPULATION_C} °C, utan krav på ankare (${new Set(alla.map((e) => e.station)).size} stationer) ═══`);
  console.log(`  FYSIK: ${rad(tot)}\n      norr ≥ ${NORR_LAT}° grova ${pct(stats(norr).gross)} (n ${norr.length}) · söder grova ${pct(stats(soder).gross)} (n ${soder.length})`);
  // Frysflaggan (#437) på de gemensamma punkterna.
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let k = 0; k < N; k++) if (med[k]) rader.push({ measured: RA[k].measured, ankKm: RA[k].ankKm, station: RA[k].station, v: kand.map(([, v]) => v[k]) });
  for (const r of skrivFrysflaggan(rader, kand.map(([namn], j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // Sex stationer på en rad 10 km isär, 200 hinkar; ytan = en gemensam vinterkurva + stationens egen konstant.
  const B0 = Math.floor(Date.UTC(2025, 0, 10) / 1000 / BUCKET_S), NB = 200;
  const stations = new Map<string, Station>();
  for (let i = 0; i < 6; i++) {
    const series = new Map<number, number>();
    for (let b = 0; b < NB; b++) series.set(B0 + b, -3 + 3 * Math.sin(b / 20) + 0.4 * i);
    stations.set(`S${i}`, { lon: 15 + i * 0.165, lat: 60, series });
  }
  // FYSIK-filen: exakt ytan + 0,5 °C på S0–S4, och ytan + 3 °C på S5; S2 saknar var tionde hink.
  const rader = ["station_id,t_utc,fysik_c"];
  for (const [id, s] of stations) for (const [b, y] of s.series) {
    if (id === "S2" && (b - B0) % 10 === 0) continue;
    rader.push(`${id},${new Date(b * BUCKET_S * 1000).toISOString().replace(".000Z", "Z")},${(y + (id === "S5" ? 3 : 0.5)).toFixed(2)}`);
  }
  const f = lasFysik(Buffer.from(rader.join("\n") + "\n"));
  k(f.rader === rader.length - 1 && f.serie.size === 6 && f.nb === NB, `läsningen: ${f.rader} rader, ${f.serie.size} stationer, ${f.nb} hinkar`);
  k(fysikVid(f, "S2", B0) === null && Math.abs(fysikVid(f, "S0", B0)! - (-3 + 0.5)) < 0.01, "fysikVid: saknad hink är null, värdet läses rätt");
  k(f.sha256.length === 64, "sha256 skrivs");
  k(spannkontroll(f).startsWith("fysik_c:"), "värdevakten: spannet finns och filen ligger i det");
  let utanfor = "";
  try { spannkontroll({ ...f, hi: 99 }); } catch (e) { utanfor = String(e); }
  k(utanfor.includes("utanför spannet"), "värdevakten: ett värde utanför spannet fälls");
  let fel = "";
  try { lasFysik(Buffer.from("station_id,t_utc,fysik_c\nS0,2025-01-10T00:10:00Z,1\n")); } catch (e) { fel = String(e); }
  k(fel.includes("halvtimme"), "en tid utanför halvtimmen fälls");
  const log = console.log; const fangat: string[] = []; console.log = (...a: unknown[]) => { fangat.push(a.join(" ")); };
  const ut = fysikILkuvosen(stations, f);
  console.log = log;
  // Kontrollen: FYSIK = yta + 0,5 på fem stationer och + 3 på en ⇒ grova fel = S5:s andel av de gemensamma punkterna; RÅ utan offset
  // ser grannens konstant (0,4 °C/station) och får inga grova fel; OFFSET (taket) ≈ 0.
  const s5 = fangat.find((r) => r.startsWith("  FYSIK:")) ?? "";
  k(ut["FYSIK"] > 0.1 && ut["FYSIK"] < 0.3 && ut["RÅ"] === 0 && ut["OFFSET (taket)"] < 0.01, `grova fel: FYSIK ${ut["FYSIK"]}, RÅ ${ut["RÅ"]}, OFFSET ${ut["OFFSET (taket)"]}`);
  k(s5.includes("MAE 0.50") || s5.includes("MAE 0.9"), `FYSIK:s MAE-rad: ${s5}`);
  k(ut["FYSIK alla"] > 0.1 && ut["FYSIK alla"] < 0.2, `FYSIK alla hinkar: ${ut["FYSIK alla"]}`);
  k(fangat.some((r) => r.includes("FRYSFLAGGAN")), "frysflaggan skrivs");
  console.log("✓ självtest: filen läses och vaktas, kandidaten linjeras mot RÅ:s punkter, måtten och frysflaggan skrivs, RÅ är kontrollen");
  process.exit(0);
}

if (!korsSjalv) { /* importerad: bara funktionerna */ } else {
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const fil = process.env.FYSIK ?? "fysik/fysik-2024-25.csv.gz";
const t0 = performance.now();
const min = (ms: number) => `${((performance.now() - ms) / 60_000).toFixed(1)} min`;
console.log("FYSIK I KUVÖSEN (kort #305, DECISIONS #485) — Axels fysikspår som fil, hela vintern 2024/25, grind A:s modell och vakter. Ingen dom.");
const fysik = lasFysik(readFileSync(fil));
const manifest = JSON.parse(readFileSync(new URL("../../kuvos/fysik-leverans.json", import.meta.url), "utf8"));
const vantad = manifest.filer.find((f: { fil: string }) => fil.endsWith(f.fil))?.sha256;
console.log(`  filen ${fil}: ${fysik.rader} rader, ${fysik.serie.size} stationer, ${fysik.nb} hinkar från ${new Date(fysik.b0 * BUCKET_S * 1000).toISOString()}; sha256 ${fysik.sha256}` +
  (vantad === fysik.sha256 ? " = manifestet" : ` ≠ MANIFESTET ${vantad}`));
if (vantad !== fysik.sha256) { console.error("FYSIK-filen är inte den frysta (kuvos/fysik-leverans.json)"); process.exit(1); }
console.log(`  ${spannkontroll(fysik)}`);

const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25"); process.exit(1); }
// ── Underlaget: exakt som prognoslagret 6/10 (grind A:s WHERE, publish/grind-a.ts), hela vintern.
const res = await q(`
  SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  ORDER BY station_id, b, sample_time DESC`);
const stations = new Map<string, Station>();
for (const r of res) {
  let s = stations.get(r.station_id);
  if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min(t0)})`);
if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
const utanFil = [...stations.keys()].filter((id) => !fysik.serie.has(id));
console.log(`  stationer i arkivet utan rad i filen: ${utanFil.length}${utanFil.length ? ` (${utanFil.slice(0, 10).join(", ")}${utanFil.length > 10 ? " …" : ""})` : ""}`);
fysikILkuvosen(stations, fysik);
console.log(`\nklart (${min(t0)})`);
await db.end();
}
