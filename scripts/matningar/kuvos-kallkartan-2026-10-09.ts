// KALLKARTAN I KUVÖSEN (kort #302, DECISIONS #482 och #496; Bengt 9/10: "ja, kör kallkartan nu"). INGEN DOM, inga trösklar.
// Kallkartan ur MODIS natt-LST (#482) ger varje station sin genomsnittliga lokala avvikelse mot omgivningen inom ±25 km, i K —
// hur mycket kallare eller varmare marken där är en klar natt än trakten. Frågan: bär den stationens särart mot grannarna, så att
// RÅ blir bättre om varje grannes värde rättas med skillnaden i avvikelse mellan målet och grannen?
//   KALL       RÅ med justeringen k · (a_mål − a_granne), k = 1, alla timmar.
//   KALL-NATT  samma, men bara när solen står under −6° vid målet (natten, som regimgrinden); annars ingen rättelse.
//   KALL-½     k = 0,5, alla timmar: markytans avvikelse är inte asfaltens, och halva är en försiktigare tro på kartan.
//   VATTENREGELN (#482 krävde den före körningen): en pixel varmare än +2,0 K räknas som vatten — en sjö bär sin värme in i nätterna
//   oktober–april (Vietas mot Akkajaure, +3,51 K) — och stationen bidrar inte och skattas inte av KALL-kandidaterna. Kartans 99:e
//   percentil är +1,46 K. Kalla avvikelser behålls: köldhålen är det kartan ska hitta. Kartan har ingen landandel att läsa.
//   RÅ är kontrollen, OFFSET taket. Alla räknas av grind A:s evaluate() med utanOffset och en justering per granne, så att grannarna
//   är exakt RÅ:s. En station utan avvikelse, eller med färre än 30 giltiga nätter i kartan, bidrar inte och skattas inte.
// Måtten: grind A:s A1, A2 och A3 per band och totalt på de punkter där alla har ett värde, uppdelat natt och dag, norr och söder om
// 62°, och frysflaggan med tre marginaler (#437). Kartan läses ur data/kallkartan/ och prövas mot releasens summa och värdevaktens spann.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-kallkartan-2026-10-09.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { evaluate, BANDS, type Station } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { matt } from "./kuvos-c8-metnordic-2026-10-07.ts";
import { linjera } from "./kuvos-rn-2026-10-07.ts";
import { SPANN } from "../vardevakten.ts";

const BUCKET_S = 1800;
const MIN_NATTER = 30;
const NATT_SOLHOJD = -6;
const NORR_LAT = 62;
const VATTEN_K = 2.0;
/** Summan ur releasens manifest (kuvos-modis-2022-25, DECISIONS #482). */
export const KARTANS_SHA256 = "9f356ee880ca93260550a37618f12e19417c384f32b3c49f29797791326fd533";

/** Solhöjd i grader (USNO:s approximation) — samma form som regimgrinden och kuvos-spridning-natt, som inte går att importera utan
 *  att deras läsningar startar. */
export function solhojd(lat: number, lon: number, tUnix: number): number {
  const rad = Math.PI / 180, d = (tUnix - 946728000) / 86400;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const ha = ((gmst + lon / 15) * 15) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
}

/** Kartan per station: avvikelsen i K, bara där minst MIN_NATTER nätter bär den och pixeln inte är vatten (> +VATTEN_K). Fäller vid
 *  ett värde utanför värdevaktens spann. */
export function lasKartan(text: string): { a: Map<string, number>; utan: number; fa: number; vatten: string[] } {
  const [huvud, ...rader] = text.trim().split(/\r?\n/);
  const kol = huvud.split(","), iId = kol.indexOf("station_id"), iA = kol.indexOf("medelavvikelse_k"), iN = kol.indexOf("natter");
  if (iId < 0 || iA < 0 || iN < 0) throw new Error("kallkartan: fel kolumner");
  const [lo, hi] = SPANN["medelavvikelse_k"] ?? [NaN, NaN];
  if (!Number.isFinite(lo)) throw new Error("medelavvikelse_k: OBESIKTIGAT — inget spann i scripts/vardevakten.ts");
  const a = new Map<string, number>(), vatten: string[] = []; let utan = 0, fa = 0;
  for (const r of rader) {
    const f = r.split(","), v = f[iA] === "" ? NaN : Number(f[iA]), n = Number(f[iN]);
    if (!Number.isFinite(v)) { utan++; continue; }
    if (v < lo || v > hi) throw new Error(`kallkartan: ${f[iId]} har ${v} K, utanför värdevaktens spann ${lo}…${hi}`);
    if (!(n >= MIN_NATTER)) { fa++; continue; }
    if (v > VATTEN_K) { vatten.push(`${f[iId]} (${v} K)`); continue; }
    a.set(f[iId], v);
  }
  return { a, utan, fa, vatten };
}

/** Justeringen k · (a_mål − a_granne); saknad avvikelse = grannen bidrar inte. bara = när rättelsen gäller (annars 0). */
export const kallJustering = (a: Map<string, number>, k: number, bara?: (mal: string, t: number) => boolean) =>
  (m: string, n: string, t: number): number | undefined => {
    const am = a.get(m), an = a.get(n);
    if (am === undefined || an === undefined) return undefined;
    return !bara || bara(m, t) ? k * (am - an) : 0;
  };

/** Hela läsningen. Returnerar MAE och grova fel per kandidat (för självtestet). */
export function kallkartan(stations: Map<string, Station>, a: Map<string, number>) {
  const natt = (m: string, t: number) => { const s = stations.get(m)!; return solhojd(s.lat, s.lon, (t + 0.5) * BUCKET_S) < NATT_SOLHOJD; };
  const RA = evaluate(stations, { utanOffset: true });
  const kand: [string, (number | null)[]][] = [
    ["RÅ", RA.map((e) => e.pred)],
    ["KALL", linjera(RA, evaluate(stations, { utanOffset: true, justering: kallJustering(a, 1) }))],
    ["KALL-NATT", linjera(RA, evaluate(stations, { utanOffset: true, justering: kallJustering(a, 1, natt) }))],
    ["KALL-½", linjera(RA, evaluate(stations, { utanOffset: true, justering: kallJustering(a, 0.5) }))],
    ["OFFSET (taket)", linjera(RA, evaluate(stations))]];
  const N = RA.length, M = Float64Array.from(RA.map((e) => e.measured)), ANK = Float64Array.from(RA.map((e) => e.ankKm));
  const med = new Uint8Array(N), arNatt = new Uint8Array(N), arNorr = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    med[i] = kand.every(([, v]) => v[i] !== null) ? 1 : 0;
    arNatt[i] = natt(RA[i].station, RA[i].t) ? 1 : 0;
    arNorr[i] = stations.get(RA[i].station)!.lat >= NORR_LAT ? 1 : 0;
  }
  const delmangd = (f: (i: number) => boolean) => Uint8Array.from(med, (x, i) => (x && f(i) ? 1 : 0));
  const urval: [string, Uint8Array][] = [["alla", med], ["natt (sol < −6°)", delmangd((i) => !!arNatt[i])], ["dag och skymning", delmangd((i) => !arNatt[i])],
    [`norr om ${NORR_LAT}°`, delmangd((i) => !!arNorr[i])], [`söder om ${NORR_LAT}°`, delmangd((i) => !arNorr[i])]];
  const nMed = med.reduce((s, x) => s + x, 0);
  console.log(`  punkter: RÅ ${N} · gemensamma ${nMed} (stationer med avvikelse i kartan: ${[...stations.keys()].filter((id) => a.has(id)).length} av ${stations.size})`);
  const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(2).replace(".", ",")} %` : "—");
  const rad = (s: { n: number; mae: number; gross: number; freeze: number }) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");
  const sammanfattning: Record<string, { mae: number; gross: number; band: number[]; natt: number }> = {};
  for (const [namn, mask] of urval) {
    console.log(`\n═══ ${namn} (bandet = närmaste bidragande granne) ═══`);
    for (const [k, v] of kand) {
      const P = Float64Array.from(v.map((x) => x ?? NaN)), r = matt(M, P, ANK, mask);
      console.log(`  ${k.padEnd(15)} ${rad(r.tot)}`);
      if (namn === "alla") BANDS.forEach(([b], i) => console.log(`      ${b.padEnd(8)} ${rad(r.band[i])}`));
      if (namn === "alla") sammanfattning[k] = { mae: r.tot.mae, gross: r.tot.gross, band: r.band.map((x) => x.gross), natt: NaN };
      if (namn === "natt (sol < −6°)" && sammanfattning[k]) sammanfattning[k].natt = r.tot.gross;
    }
  }
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let i = 0; i < N; i++) if (med[i]) rader.push({ measured: M[i], ankKm: ANK[i], station: RA[i].station, v: kand.map(([, v]) => v[i]) });
  for (const r of skrivFrysflaggan(rader, kand.map(([namn], j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  return sammanfattning;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // Tio stationer längs en linje, 8 km isär. Ytan = trakten (dygnsgång) + stationens egen avvikelse, och kartan känner avvikelsen:
  // KALL ska träffa exakt, RÅ inte. En station utan avvikelse i kartan skattas inte.
  const stations = new Map<string, Station>(), a = new Map<string, number>();
  const t0 = Math.floor(Date.parse("2025-01-10T00:00:00Z") / 1000 / BUCKET_S);
  for (let s = 0; s < 10; s++) {
    const id = `s${s}`, av = 2 * Math.sin(1.7 * s), series = new Map<number, number>();
    for (let h = 0; h < 96; h++) series.set(t0 + h, -2 + 1.5 * Math.sin(h / 8) + av);
    stations.set(id, { lon: 13 + s * 0.13, lat: 56, series });
    if (s !== 9) a.set(id, av);
  }
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  let r: ReturnType<typeof kallkartan>;
  try { r = kallkartan(stations, a); } finally { console.log = orig; }
  k(r!["KALL"].mae < 1e-9 && r!["RÅ"].mae > 0.3, `KALL träffar ytan när kartan bär avvikelsen (KALL ${r!["KALL"].mae.toFixed(3)}, RÅ ${r!["RÅ"].mae.toFixed(3)})`);
  k(r!["KALL-½"].mae > 0 && r!["KALL-½"].mae < r!["RÅ"].mae, "KALL-½ halvvägs");
  k(r!["KALL-NATT"].mae > r!["KALL"].mae && r!["KALL-NATT"].natt < 1e-9, "KALL-NATT rättar bara natten");
  k(!skrivet.some((s) => s.includes("NaN")) && skrivet.some((s) => s.includes("FRYSFLAGGAN MED TRE MARGINALER")), "utskriften utan NaN, med frysflaggan");
  const j = kallJustering(new Map([["m", -1], ["n", 0.5]]), 1);
  k(j("m", "n", 0) === -1.5 && j("m", "x", 0) === undefined, "justeringen: kallare mål drar ned, saknad granne bidrar inte");
  let fall = ""; try { lasKartan("station_id,natter,medelavvikelse_k\n1,200,99\n"); } catch (e) { fall = String(e); }
  k(fall.includes("utanför värdevaktens spann"), "ett värde utanför spannet fäller");
  const l = lasKartan("station_id,natter,medelavvikelse_k\n1,200,-0.5\n2,10,1.0\n3,200,\n4,200,3.5\n5,200,-2.3\n");
  k(l.a.size === 2 && l.fa === 1 && l.utan === 1 && l.vatten.length === 1 && l.a.get("5") === -2.3,
    "för få nätter, saknad avvikelse och vatten räknas ut; ett köldhål stannar");
  k(solhojd(56, 13, Date.parse("2025-01-10T00:00:00Z") / 1000) < -30, "solhöjden en vinternatt");
  console.log("✓ självtest: kartan läses och vaktas, vattenregeln, justeringen, KALL på syntetisk väg, natten för sig, utskriften med frysflaggan");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const t0 = performance.now(), min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("KALLKARTAN I KUVÖSEN (kort #302, DECISIONS #496): RÅ rättad med MODIS-kartans lokala avvikelse, vintern 2024/25. Ingen dom.");
  const buf = readFileSync(new URL("../../data/kallkartan/kallkartan_stationer.csv", import.meta.url));
  const sha = createHash("sha256").update(buf).digest("hex");
  console.log(`  kartan: data/kallkartan/kallkartan_stationer.csv, sha256 ${sha}${sha === KARTANS_SHA256 ? " = releasens manifest" : " ≠ MANIFESTET"}`);
  if (sha !== KARTANS_SHA256) { console.error("kartan är inte releasens (kuvos-modis-2022-25)"); process.exit(1); }
  const karta = lasKartan(buf.toString("utf8"));
  console.log(`  ${karta.a.size} stationer med avvikelse (minst ${MIN_NATTER} nätter); ${karta.fa} med för få nätter, ${karta.utan} utan; värdevaktens spann hållet`);
  console.log(`  vattenregeln (> +${VATTEN_K} K): ${karta.vatten.length} stationer ute — ${karta.vatten.join(", ") || "inga"}`);
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string) => (await db.query(sql)).rows as any[];
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #496)"); process.exit(1); }
  const res = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`);
  await db.end();
  const stations = new Map<string, Station>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()})`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  kallkartan(stations, karta.a);
  console.log(`\nKlart (${min()}). Ingen dom: en kandidat ur kallkartan förregistreras för vintern 2026/27 först om läsningen bär den (DECISIONS #496).`);
}
