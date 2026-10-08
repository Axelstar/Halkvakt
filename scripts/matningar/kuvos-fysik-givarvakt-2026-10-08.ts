// FYSIKEN SOM GIVARVAKT (DECISIONS #493; Bengts ja 8/10: "ja till givarvakten"). En LÄSNING, ingen dom och ingen tröskel.
// Frågan: när en stations uppmätta yta och Axels fysik (kuvos-fysik-2024-25, DECISIONS #485) är mycket oense — pekar oenigheten ut
// de rader driftens vakter redan tar, och vilka stationer vakterna missar? Fysiken är ett oberoende vittne vid stationen: varje
// station är förutsagd med hela sin region utesluten ur träningen, så filen vet ingenting om stationens egen givare.
//   D        uppmätt yta − FYSIK på samma halvtimmeshink (senaste avläsningen i hinken, som FYSIK-mätningen).
//   vakterna #75 (yta mer än 12 °C under luften), radvakten, karantänen och den långsamma vakten — samma uttryck som grind A
//            (publish/snapshot-core.ts), här som flaggor per rad i stället för i WHERE, så att också raderna de tar kan läsas.
//   grupper  tas av vakterna (någon flagga) · behålls med luft · behålls utan luft (#75 och radvakten kan inte pröva dem).
//   kontroll de behållna raderna med luft och yta ≤ +5 °C är FYSIK-mätningens egen population: |D| > 2 °C ska landa på 9,8–10,3 %
//            (10,04 % i #485) — gör den inte det skiljer populationen, och inget annat läses.
// Kör: DATABASE_URL=... FYSIK=fysik/fysik-2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-fysik-givarvakt-2026-10-08.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { lasFysik, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { RADVAKT_SQL, brottSql, givarfelSql, KARANTAN_BROTT } from "../../publish/snapshot-core.ts";

const BUCKET_S = 1800;
const POPULATION_C = 5;
export const K_SVEP = [3, 5, 8];                 // oenighet i °C
export const K_STATION = 5, STATION_ANDEL = 0.2, STATION_MIN = 100;

export type Rad = { id: string; b: number; yta: number; luft: boolean; v75: boolean; vrad: boolean; vkar: boolean; vlang: boolean };
type Grupp = { n: number; sumAbs: number; over2: number; over: number[]; d: number[] };
const ny = (): Grupp => ({ n: 0, sumAbs: 0, over2: 0, over: K_SVEP.map(() => 0), d: [] });
function lagg(g: Grupp, d: number) {
  g.n++; g.sumAbs += Math.abs(d); if (Math.abs(d) > 2) g.over2++;
  K_SVEP.forEach((k, i) => { if (Math.abs(d) > k) g.over[i]++; });
  g.d.push(d);
}
export function median(a: number[]): number {
  if (!a.length) return NaN;
  const s = Float64Array.from(a).sort(), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function givarvakt(rader: Rad[], f: Fysik) {
  const G: Record<string, Grupp> = {};
  for (const n of ["tas", "#75", "radvakten", "karantänen", "långsamma vakten", "behålls, luft", "behålls, utan luft", "kontroll"]) G[n] = ny();
  const perStation = new Map<string, { d: number[]; over: number; tas: number }>();
  let utanFysik = 0;
  for (const r of rader) {
    const s = f.serie.get(r.id), v = s ? s[r.b - f.b0] : NaN;
    if (!Number.isFinite(v)) { utanFysik++; continue; }
    const d = r.yta - v, tas = r.v75 || r.vrad || r.vkar || r.vlang;
    let st = perStation.get(r.id); if (!st) { st = { d: [], over: 0, tas: 0 }; perStation.set(r.id, st); }
    if (tas) {
      st.tas++; lagg(G["tas"], d);
      if (r.v75) lagg(G["#75"], d); if (r.vrad) lagg(G["radvakten"], d);
      if (r.vkar) lagg(G["karantänen"], d); if (r.vlang) lagg(G["långsamma vakten"], d);
    } else if (r.luft) {
      lagg(G["behålls, luft"], d); st.d.push(d); if (Math.abs(d) > K_STATION) st.over++;
      if (r.yta <= POPULATION_C) lagg(G["kontroll"], d);
    } else lagg(G["behålls, utan luft"], d);
  }
  const kandidater = [...perStation].filter(([, s]) => s.d.length >= STATION_MIN && s.over / s.d.length >= STATION_ANDEL)
    .map(([id, s]) => ({ id, n: s.d.length, andel: s.over / s.d.length, median: median(s.d), tas: s.tas }))
    .sort((a, b) => b.andel - a.andel);
  return { G, kandidater, utanFysik, stationer: perStation.size };
}

const pct = (x: number, n: number) => (n ? (100 * x / n).toFixed(2) : "–") + " %";
export function skriv(u: ReturnType<typeof givarvakt>): string[] {
  const ut = [`${u.stationer} stationer; ${u.utanFysik} hinkar utan värde i FYSIK-filen räknas inte`,
    `  grupp                  hinkar   MAE      |D|>2    ` + K_SVEP.map((k) => `|D|>${k}`.padEnd(9)).join("") + "median D"];
  for (const [namn, g] of Object.entries(u.G)) {
    ut.push(`  ${namn.padEnd(20)} ${String(g.n).padStart(9)}   ${g.n ? (g.sumAbs / g.n).toFixed(2) : "–"}  ${pct(g.over2, g.n).padStart(8)} ` +
      g.over.map((o) => pct(o, g.n).padStart(8) + " ").join("") + (g.n ? median(g.d).toFixed(2) : "–") + " °C");
  }
  const k = u.G["kontroll"], ka = k.n ? 100 * k.over2 / k.n : NaN;
  ut.push(`KONTROLLEN (behålls med luft, yta ≤ +${POPULATION_C} °C): |D| > 2 °C ${ka.toFixed(2)} % — förväntan 9,8–10,3 % (#485: 10,04 %)` +
    (ka >= 9.8 && ka <= 10.3 ? " ✓" : " ✗ POPULATIONEN SKILJER — läs inget annat förrän det är förstått"));
  ut.push(`STATIONERNA som vakterna behåller men fysiken är oense med (|D| > ${K_STATION} °C i minst ${STATION_ANDEL * 100} % av minst ${STATION_MIN} hinkar): ${u.kandidater.length}`);
  for (const c of u.kandidater.slice(0, 25))
    ut.push(`  ${c.id.padEnd(6)} ${String(c.n).padStart(6)} hinkar · ${(100 * c.andel).toFixed(1).padStart(5)} % oense · median D ${c.median.toFixed(2)} °C · rader som vakterna tog: ${c.tas}`);
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  // Två stationer, 300 hinkar. FYSIK = 0 överallt. S1 mäter rätt (D = ±0,5) utom 10 rader som #75 tar (D = −15);
  // S2 är trasig utan att vakterna ser det (D = −7 i 40 % av hinkarna) och har 20 rader utan luft (D = 0).
  const t0 = Date.parse("2025-01-01T00:00:00Z") / 1000, rad = ["station_id,t_utc,fysik_c"];
  for (const id of ["S1", "S2"]) for (let i = 0; i < 300; i++) rad.push(`${id},${new Date((t0 + i * BUCKET_S) * 1000).toISOString()},0`);
  const f = lasFysik(Buffer.from(rad.join("\n") + "\n"));
  const b0 = t0 / BUCKET_S, R: Rad[] = [];
  const v = { v75: false, vrad: false, vkar: false, vlang: false };
  for (let i = 0; i < 300; i++) {
    R.push({ id: "S1", b: b0 + i, yta: i < 10 ? -15 : (i % 2 ? 0.5 : -0.5), luft: true, ...v, v75: i < 10 });
    R.push({ id: "S2", b: b0 + i, yta: i < 20 ? 0 : (i % 5 < 2 ? -7 : 0.2), luft: i >= 20, ...v });
  }
  R.push({ id: "S3", b: b0, yta: 1, luft: true, ...v });          // ingen rad i filen
  const u = givarvakt(R, f);
  k(u.G["tas"].n === 10 && u.G["tas"].over[1] === 10 && u.G["#75"].n === 10, `de tio rader #75 tar är oense: ${u.G["tas"].n}/${u.G["tas"].over[1]}`);
  k(u.G["behålls, utan luft"].n === 20 && u.G["behålls, utan luft"].over[0] === 0, "raderna utan luft står för sig");
  k(u.kandidater.length === 1 && u.kandidater[0].id === "S2" && Math.abs(u.kandidater[0].andel - 0.4) < 0.01 && u.kandidater[0].tas === 0,
    `S2 är den enda kandidaten: ${JSON.stringify(u.kandidater)}`);
  k(u.utanFysik === 1, "en hink utan värde i filen räknas inte");
  k(median([3, 1, 2]) === 2 && median([4, 1, 2, 3]) === 2.5, "medianen");
  const text = skriv(u).join("\n");
  k(text.includes("KONTROLLEN") && text.includes("S2"), "kontrollen och kandidaten skrivs ut");
  if (fel) process.exit(1);
  console.log("✓ självtest: oenigheten mot fysiken per vakt och grupp, raderna utan luft för sig, stationskandidaterna och kontrollen");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const fil = process.env.FYSIK ?? "fysik/fysik-2024-25.csv.gz";
  const t0 = performance.now(), min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("FYSIKEN SOM GIVARVAKT (DECISIONS #493) — uppmätt yta mot Axels fysik på samma halvtimme, vintern 2024/25. En läsning, ingen dom.");
  const fysik = lasFysik(readFileSync(fil));
  const manifest = JSON.parse(readFileSync(new URL("../../kuvos/fysik-leverans.json", import.meta.url), "utf8"));
  const vantad = manifest.filer.find((x: { fil: string }) => fil.endsWith(x.fil))?.sha256;
  console.log(`  filen ${fil}: ${fysik.rader} rader, ${fysik.serie.size} stationer; sha256 ${fysik.sha256}${vantad === fysik.sha256 ? " = manifestet" : ` ≠ MANIFESTET ${vantad}`}`);
  if (vantad !== fysik.sha256) { console.error("FYSIK-filen är inte den frysta (kuvos/fysik-leverans.json)"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const [{ kuvos }] = (await db.query("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos")).rows;
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25"); process.exit(1); }
  // Samma rader som FYSIK-mätningen före vakterna: senaste avläsning per station och halvtimmeshink, yta finns. Vakterna som flaggor.
  const res = (await db.query(`
    SELECT DISTINCT ON (station_id, b) station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c,
      air_temp_c IS NOT NULL AS luft,
      (air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12) AS v75,
      NOT ${RADVAKT_SQL} AS vrad,
      ${brottSql("weather_observations")} >= ${KARANTAN_BROTT} AS vkar,
      ${givarfelSql("weather_observations")} AS vlang
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL
    ORDER BY station_id, b, sample_time DESC`)).rows;
  console.log(`  ${res.length} hinkar ur arkivet (${min()})`);
  if (res.length < 100_000) { console.error("UNDERLAGSVAKT: för lite — arkivet är trasigt"); process.exit(1); }
  const rader: Rad[] = res.map((r: any) => ({ id: r.station_id, b: Number(r.b), yta: +r.surface_temp_c, luft: r.luft, v75: r.v75, vrad: r.vrad, vkar: r.vkar, vlang: r.vlang }));
  for (const r of skriv(givarvakt(rader, fysik))) console.log(r);
  console.log(`\nklart (${min()})`);
  await db.end();
}
