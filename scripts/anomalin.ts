// ANOMALIN — varför är bandet 7–15 km sämst av alla fyra i grind A?
// (Bengts order 12/9 efter Axels bedömning: "mät anomalin med de tre uppdelningarna".)
//
// FYNDET SOM SKA FÖRKLARAS. Grind A föll 12/9 (DECISIONS #119) och felet var INTE monotont i
// ankaravstånd: 7–15 km gav MAE 1,41 °C och 18,4 % grova fel, alltså sämre än > 20 km (1,09 °C,
// 11,1 %). Axel verifierade talen och att det inte är ett urvalsfel — bandet har flest stationer
// av alla fyra. Anomalin är därmed verklig och oförklarad, och en modell man inte förstår ska
// inte få bära en varning även om dess siffror råkar se bra ut.
//
// TRE UPPDELNINGAR, i den ordning de måste läsas:
//
//  (a) REGION — KONFUNDERINGEN SOM MÅSTE UTESLUTAS FÖRST. Grind A utvärderar bara punkter i
//      beslutsbandet −5…+5 °C, och i september är det bara de kalla stunderna som kvalificerar.
//      76 % av alla 2 042 mätpunkter ligger i bandet > 20 km — med all sannolikhet Norrland, som
//      är det enda som varit tillräckligt kallt. Att jämföra 147 punkter mot 1 551 kan vara att
//      jämföra två KLIMAT, inte två avstånd. Håller anomalin inom en och samma region är den
//      verklig; försvinner den är den geografi.
//
//  (b) HÖJDSKILLNAD station ↔ närmaste BIDRAGANDE granne — AXELS HYPOTES, ordagrant: på 0–7 km
//      delar grannarna mikroklimat; över 20 km vägs många grannar ihop och felen tar ut varandra;
//      mellan 7 och 15 km ligger grannen nära nog att få hög vikt men långt nog att ligga bakom
//      en höjdrygg — sämsta av två världar. Om det stämmer är det inte avståndet som är fel
//      variabel utan terrängen mellan. Höjd LÄNGS VÄGEN återvann noll (#119); höjdskillnad MELLAN
//      STATION OCH GRANNE är en annan storhet och har aldrig mätts.
//
//  (c) FILTERUTFALLET per band — varför blir 302 stationer 147 punkter? En station ger en
//      mätpunkt bara när en granne hade ett värde i SAMMA halvtimme och ≥ 20 delade hinkar. Med
//      ett händelsefiltrerat arkiv (dieten, #4) är samobservation i sig en filtrerad händelse.
//      Biter filtret olika hårt per band är det i sig en kandidat till anomalin.
//
// MODELLEN ÄR GRIND A:S, INTE EN EGEN. Konstanterna och leave-one-out-formeln speglar
// publish/grind-a.ts. Självtestet har en DRIFTVAKT som läser den filen och fäller om konstanterna
// glidit isär — en tyst kopia av en modell är värre än ingen mätning alls.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/anomalin.ts [dagar=60]
// Självtest utan nät/DB: scripts/anomalin.ts --sjalvtest

import { readFileSync } from "node:fs";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";

// ── Speglar publish/grind-a.ts. ÄNDRA DÄR FÖRST — driftvakten i självtestet fäller annars.
const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const MIN_CELL = 20;       // egen vakt: en cell under detta får inget tal, bara "–"

export const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];
// Breddgradssnitt, inte länsgränser — och de ska läsas så.
export const REGIONER: [string, number, number][] = [
  ["syd (<58,5°)", -90, 58.5], ["mitt (58,5–60,5°)", 58.5, 60.5], ["norr (≥60,5°)", 60.5, 90]];
export const HOJDBAND: [string, number, number][] = [
  ["0–20 m", 0, 20], ["20–50 m", 20, 50], ["50–100 m", 50, 100], ["≥100 m", 100, Infinity]];

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function iBand<T extends [string, number, number]>(band: T[], v: number): string {
  for (const [namn, lo, hi] of band) if (v >= lo && v < hi) return namn;
  return band[band.length - 1][0];
}

export type Rad = {
  measured: number; pred: number; ankKm: number; station: string;
  lat: number; dh: number | null;
};

/** MAE i beslutsbandet och grova fel — exakt grind A:s definitioner. */
export function matt(rader: Rad[]) {
  const dec = rader.filter((r) => r.measured >= -5);
  const mae = dec.length ? dec.reduce((a, r) => a + Math.abs(r.pred - r.measured), 0) / dec.length : NaN;
  const grova = rader.length ? rader.filter((r) => Math.abs(r.pred - r.measured) > 2).length / rader.length : NaN;
  return { n: rader.length, nDec: dec.length, mae, grova };
}

/** Cellvakten: under MIN_CELL punkter skrivs inget tal ut. Tre gånger på tre dygn har ett
 *  tal ur för litet underlag lurat oss (#103, #124) — den här tabellen har många celler. */
export function cell(rader: Rad[]): string {
  const m = matt(rader);
  if (m.n < MIN_CELL) return `– (${m.n})`;
  return `${m.mae.toFixed(2)} / ${(m.grova * 100).toFixed(1)}% (${m.n})`;
}

type Station = { id: string; lon: number; lat: number; elev: number | null; series: Map<number, number> };

/** Leave-one-out enligt grind A, men varje rad bär också region och höjdskillnad. */
export function utvardera(stationer: Map<string, Station>) {
  const ids = [...stationer.keys()];
  const grannar = new Map<string, { id: string; km: number }[]>();
  for (const s of ids) {
    const a = stationer.get(s)!;
    grannar.set(s, ids.filter((n) => n !== s)
      .map((n) => ({ id: n, km: haversineKm(a.lon, a.lat, stationer.get(n)!.lon, stationer.get(n)!.lat) }))
      .filter((n) => n.km <= MAX_KM).sort((x, y) => x.km - y.km).slice(0, K_NEIGHBOURS));
  }
  const par = new Map<string, { sum: number; n: number }>();
  for (const s of ids)
    for (const { id: n } of grannar.get(s)!) {
      const a = stationer.get(s)!.series, b = stationer.get(n)!.series;
      const [liten, stor] = a.size <= b.size ? [a, b] : [b, a];
      let sum = 0, cnt = 0;
      for (const [t, v] of liten) {
        const w = stor.get(t);
        if (w !== undefined) { sum += liten === a ? v - w : w - v; cnt++; }
      }
      par.set(`${s}|${n}`, { sum, n: cnt });
    }
  const rader: Rad[] = [];
  // (c): varför faller stationer bort? Räknas per station, inte per punkt.
  const spar = { utanVinter: 0, utanSamobs: 0, utanHistorik: 0, medPunkt: 0 };
  for (const s of ids) {
    const st = stationer.get(s)!;
    let vinter = 0, samobs = 0, historik = 0, punkter = 0;
    for (const [t, measured] of st.series) {
      if (measured > 5) continue;
      vinter++;
      let wsum = 0, psum = 0, ank = Infinity, ankId = "";
      let sagGranne = false, sagHistorik = false;
      for (const { id: n, km } of grannar.get(s)!) {
        const nv = stationer.get(n)!.series.get(t);
        if (nv === undefined) continue;
        sagGranne = true;
        const p = par.get(`${s}|${n}`)!;
        if (p.n - 1 < MIN_SHARED) continue;
        sagHistorik = true;
        const offsetExcl = (p.sum - (measured - nv)) / (p.n - 1);
        const w = 1 / Math.max(km, 1);
        wsum += w; psum += w * (nv + offsetExcl);
        if (km < ank) { ank = km; ankId = n; }
      }
      if (sagGranne) samobs++;
      if (sagHistorik) historik++;
      if (wsum > 0) {
        punkter++;
        const gh = stationer.get(ankId)!.elev, sh = st.elev;
        rader.push({
          measured, pred: psum / wsum, ankKm: ank, station: s, lat: st.lat,
          dh: sh !== null && gh !== null ? Math.abs(sh - gh) : null,
        });
      }
    }
    if (!vinter) spar.utanVinter++;
    else if (!samobs) spar.utanSamobs++;
    else if (!historik) spar.utanHistorik++;
    else if (punkter) spar.medPunkt++;
  }
  return { rader, spar };
}

// ── Självtest: känd sanning + DRIFTVAKT mot grind A:s egna konstanter.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — modellen, banden och driftvakten mot publish/grind-a.ts\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  k("en breddgrad ≈ 111 km", Math.round(haversineKm(15, 60, 15, 61)), 111);
  k("7 km i första bandet", iBand(BANDS, 7 - 1e-9), "0–7 km");
  k("7 km jämnt i andra", iBand(BANDS, 7), "7–15 km");
  k("40 km i sista", iBand(BANDS, 40), ">20 km");
  k("lat 55 är syd", iBand(REGIONER, 55), "syd (<58,5°)");
  k("lat 59 är mitt", iBand(REGIONER, 59), "mitt (58,5–60,5°)");
  k("lat 67 är norr", iBand(REGIONER, 67), "norr (≥60,5°)");
  k("höjdskillnad 30 m", iBand(HOJDBAND, 30), "20–50 m");
  // Cellvakten.
  const fejk = (n: number): Rad[] => Array.from({ length: n }, () => ({
    measured: 0, pred: 0, ankKm: 10, station: "x", lat: 59, dh: 0 }));
  k("19 punkter ger inget tal", cell(fejk(19)).startsWith("–"), true);
  k("20 punkter ger ett tal", cell(fejk(20)).startsWith("–"), false);
  // Modellen: sex stationer 5 km isär med kända konstanta offset på samma baskurva.
  // Leave-one-out måste återfinna dem nästan exakt (MAE ≈ 0) — grind A:s eget självtest.
  const stationer = new Map<string, Station>();
  for (let i = 0; i < 6; i++) {
    const series = new Map<number, number>();
    for (let t = 0; t < 200 - i * 25; t++) series.set(t, -2 + 3 * Math.sin(t / 10) + i * 0.5);
    stationer.set(`test${i}`, { id: `test${i}`, lon: 13 + i * 0.08, lat: 56, elev: i * 10, series });
  }
  const { rader, spar } = utvardera(stationer);
  const m = matt(rader);
  k("självtestet ger punkter", m.n > 100, true);
  k("leave-one-out återfinner offseten (MAE < 0,01)", m.mae < 0.01, true);
  k("alla sex stationer gav punkter", spar.medPunkt, 6);
  k("höjdskillnaden registreras", rader.every((r) => r.dh !== null), true);
  // DRIFTVAKTEN: konstanterna måste vara grind A:s, annars mäter vi en annan modell.
  const ga = readFileSync(new URL("../publish/grind-a.ts", import.meta.url), "utf8");
  const tal = (namn: string) => Number(ga.match(new RegExp(`const ${namn} = (-?\\d+(?:\\.\\d+)?)`))?.[1]);
  k("K_NEIGHBOURS = grind A:s", K_NEIGHBOURS, tal("K_NEIGHBOURS"));
  k("MAX_KM = grind A:s", MAX_KM, tal("MAX_KM"));
  k("MIN_SHARED = grind A:s", MIN_SHARED, tal("MIN_SHARED"));
  k("BUCKET_S = grind A:s", BUCKET_S, tal("BUCKET_S"));
  k("banden = grind A:s", BANDS.map((b) => b[0]).join("|"),
    [...ga.matchAll(/\["(\d+–\d+ km|>20 km)",/g)].map((m2) => m2[1]).join("|"));
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: modellen är grind A:s, konstanterna lästes ur dess källa,");
  console.log("och cellvakten släpper inte igenom ett tal ur nitton punkter.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 60);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");

// Frågan är grind A:s, rad för rad — DISTINCT ON ger SENASTE avläsningen per hink, precis som
// där. Den enda skillnaden är den valfria givarvakten, som grind A INTE har (se nedan).
async function hamta(medGivarvakt: boolean): Promise<Map<string, Station>> {
  const vakt = medGivarvakt ? `AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}` : "";
  const res = await pool.query(`
    SELECT DISTINCT ON (station_id, b) station_id,
      ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day' ${vakt}
    ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
  const m = new Map<string, Station>();
  for (const r of res.rows as any[]) {
    let s = m.get(r.station_id);
    if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, elev: null, series: new Map() }; m.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  return m;
}

console.log(`Anomalin i grind A — varför är 7–15 km sämst? (${DAGAR} dygn)\n`);
const stationer = await hamta(false);   // exakt grind A:s urval
console.log(`Underlag: ${stationer.size} stationer, ${[...stationer.values()].reduce((a, s) => a + s.series.size, 0)} bucketade avläsningar.`);
if (stationer.size < 100) { console.error(`UNDERLAGSVAKT: för få stationer. Avbryter.`); await pool.end(); process.exit(1); }

// Höjder: Copernicus EU-DEM 25 m via opentopodata (≤100 punkter/anrop, ~1 anrop/s).
const ids = [...stationer.keys()];
let hojdOk = 0;
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const locs = batch.map((id) => { const s = stationer.get(id)!; return `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`; }).join("|");
  const r = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${locs}`, { headers: { Accept: "application/json" } });
  if (!r.ok) { console.error(`opentopodata: HTTP ${r.status} på batch ${i / 100 + 1}`); continue; }
  const j = await r.json() as any;
  (j.results ?? []).forEach((res2: any, k: number) => {
    if (typeof res2?.elevation === "number") { stationer.get(batch[k])!.elev = res2.elevation; hojdOk++; }
  });
  await new Promise((r2) => setTimeout(r2, 1100));
}
console.log(`Höjder: ${hojdOk} av ${ids.length} stationer fick EU-DEM-höjd.\n`);

const { rader, spar } = utvardera(stationer);
console.log(`Mätpunkter: ${rader.length}\n`);

// ── (c) FILTERUTFALLET — först, för det avgör om de andra två går att läsa.
console.log(`(c) FILTERUTFALLET — varför blir många stationer få punkter?`);
console.log(`  Geometriskt band = närmaste granne inom ${MAX_KM} km. Utvärderat band = ankKm i en punkt.`);
const geoBand = new Map<string, number>();
for (const s of stationer.values()) {
  let b = Infinity;
  for (const o of stationer.values()) if (o.id !== s.id) { const d = haversineKm(s.lon, s.lat, o.lon, o.lat); if (d < b) b = d; }
  const namn = b <= MAX_KM ? iBand(BANDS, b) : "ingen granne";
  geoBand.set(namn, (geoBand.get(namn) ?? 0) + 1);
}
const utvStationer = new Map<string, Set<string>>();
const utvPunkter = new Map<string, number>();
for (const r of rader) {
  const b = iBand(BANDS, r.ankKm);
  if (!utvStationer.has(b)) utvStationer.set(b, new Set());
  utvStationer.get(b)!.add(r.station);
  utvPunkter.set(b, (utvPunkter.get(b) ?? 0) + 1);
}
console.log(`  ${"band".padEnd(12)} ${"stationer (geo)".padStart(16)} ${"stationer (utv)".padStart(16)} ${"punkter".padStart(9)} ${"punkter/station".padStart(16)}`);
for (const [namn] of BANDS) {
  const g = geoBand.get(namn) ?? 0, u = utvStationer.get(namn)?.size ?? 0, p = utvPunkter.get(namn) ?? 0;
  console.log(`  ${namn.padEnd(12)} ${String(g).padStart(16)} ${String(u).padStart(16)} ${String(p).padStart(9)} ${(u ? (p / u).toFixed(1) : "–").padStart(16)}`);
}
console.log(`  ${"ingen granne".padEnd(12)} ${String(geoBand.get("ingen granne") ?? 0).padStart(16)}`);
console.log(`  Stationsbortfall: ${spar.utanVinter} utan vintertimme · ${spar.utanSamobs} utan samobservation ·`);
console.log(`     ${spar.utanHistorik} utan ${MIN_SHARED} delade hinkar · ${spar.medPunkt} gav minst en punkt.`);

// ── (a) REGION — håller anomalin inom en och samma region?
console.log(`\n(a) REGION — håller anomalin inom en och samma region? (MAE / grova % (punkter))`);
console.log(`  Celler under ${MIN_CELL} punkter får inget tal. Breddgradssnitt, inte länsgränser.`);
console.log(`  ${"region".padEnd(19)} ${BANDS.map((b) => b[0].padStart(17)).join("")}`);
for (const [rn, lo, hi] of REGIONER) {
  const iReg = rader.filter((r) => r.lat >= lo && r.lat < hi);
  console.log(`  ${rn.padEnd(19)} ${BANDS.map(([bn, blo, bhi]) =>
    cell(iReg.filter((r) => r.ankKm >= blo && r.ankKm < bhi)).padStart(17)).join("")}`);
}

// ── (b) HÖJDSKILLNAD — Axels hypotes.
const medDh = rader.filter((r) => r.dh !== null);
console.log(`\n(b) HÖJDSKILLNAD station ↔ närmaste bidragande granne (${medDh.length} av ${rader.length} punkter har höjd)`);
console.log(`  ${"höjdskillnad".padEnd(19)} ${BANDS.map((b) => b[0].padStart(17)).join("")}`);
for (const [hn, lo, hi] of HOJDBAND) {
  const iH = medDh.filter((r) => r.dh! >= lo && r.dh! < hi);
  console.log(`  ${hn.padEnd(19)} ${BANDS.map(([bn, blo, bhi]) =>
    cell(iH.filter((r) => r.ankKm >= blo && r.ankKm < bhi)).padStart(17)).join("")}`);
}

console.log(`\n  Inom bandet 7–15 km, enbart:`);
const i715 = medDh.filter((r) => r.ankKm >= 7 && r.ankKm < 15);
for (const [hn, lo, hi] of HOJDBAND) {
  console.log(`    ${hn.padEnd(10)} ${cell(i715.filter((r) => r.dh! >= lo && r.dh! < hi))}`);
}

// ── (d) EN FJÄRDE FÖRKLARING SOM DÖK UPP UNDER BYGGET: grind A bär INTE #75:s givarvakt.
// Frågan i publish/grind-a.ts tar varje rad med surface_temp_c, utan att kräva att
// lufttemperaturen finns eller att yta − luft är rimlig. 61 % av arkivets frostrader faller på
// den vakten (DECISIONS #106). En trasig givare förstör både sin EGEN punkt och sina GRANNARS
// prediktioner — och en granne på 10 km får hög vikt. Det är en kandidat till anomalin som
// varken jag eller Axel hade räknat med. Här körs samma mätning med vakten på.
console.log(`\n(d) MED #75:s GIVARVAKT PÅ — grind A kör UTAN den (publish/grind-a.ts rad 152–157)`);
const stationerVakt = await hamta(true);
for (const [id, s] of stationerVakt) s.elev = stationer.get(id)?.elev ?? null;
const { rader: raderVakt } = utvardera(stationerVakt);
console.log(`  ${stationerVakt.size} stationer, ${raderVakt.length} mätpunkter (mot ${rader.length} utan vakt).`);
console.log(`  ${"band".padEnd(12)} ${"utan vakt".padStart(20)} ${"med vakt".padStart(20)}`);
for (const [bn, blo, bhi] of BANDS) {
  const u = rader.filter((r) => r.ankKm >= blo && r.ankKm < bhi);
  const v = raderVakt.filter((r) => r.ankKm >= blo && r.ankKm < bhi);
  console.log(`  ${bn.padEnd(12)} ${cell(u).padStart(20)} ${cell(v).padStart(20)}`);
}
const tu = matt(rader), tv = matt(raderVakt);
console.log(`  ${"TOTALT".padEnd(12)} ${`${tu.mae.toFixed(2)} / ${(tu.grova * 100).toFixed(1)}% (${tu.n})`.padStart(20)} ${`${tv.mae.toFixed(2)} / ${(tv.grova * 100).toFixed(1)}% (${tv.n})`.padStart(20)}`);
console.log(`  Krymper 7–15-anomalin med vakten på är trasiga givare en del av förklaringen —`);
console.log(`  och då är det ett FYND OM GRIND A SJÄLV, inte bara om anomalin.`);

console.log(`\nLÄSNINGEN — vad tabellerna får och inte får bära`);
console.log(`  Anomalin är VERKLIG bara om 7–15 km är sämst ÄVEN inom en region och vid samma`);
console.log(`  höjdskillnad. Är den det bara i helheten är den geografi eller terräng, inte avstånd.`);
console.log(`  Ingen av tabellerna fäller eller friar grind A — domen är Bengts och Axels, och`);
console.log(`  den här mätningen finns för att man ska veta VAD man dömer om.`);
console.log(`\n  Höjder: Copernicus EU-DEM (© Europeiska unionen, Copernicus) via opentopodata.org.`);
await pool.end();
