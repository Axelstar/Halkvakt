// GRIND K-A — kan en modell som är opålitlig på grader ändå bära en frysklassning?
// (Kort #103, docs/TROSKLAR-FRYSKLASSNINGEN.md §4, fastställt 12/9, DECISIONS #135.)
//
// FRÅGAN ÄR AXELS, ordagrant, och den är en ANNAN fråga än grind A:s. Grind A mätte avstånd i
// GRADER och föll. Den här mäter om modellen hamnar på RÄTT SIDA AV NOLL — och det är den fråga
// motorn faktiskt ställer. Samma data, ny fråga, ärlig ordning.
//
// MODELLEN ÄR GRIND A:S, INTE EN EGEN. Samma leave-one-out, samma konstanter, samma givarvakt.
// Självtestet har en DRIFTVAKT som läser publish/grind-a.ts och fäller om de glidit isär.
//
// DEN AVGÖRANDE SKILLNADEN MOT GRIND A: här får modellen AVSTÅ. Grind A tvingade den att svara i
// varje punkt. En klassificerare som får säga "vet inte" nära gränsen blir träffsäkrare på det den
// uttalar sig om — och priset är täckning. Därför har K-A både ett träffsäkerhetskrav OCH ett
// täckningskrav: en hög träffsäkerhet på en tiondel av punkterna är inget resultat.
//
// K-A2 ÄR ASYMMETRISK MED FLIT och undantagen från all lättnad (§7): att säga "fryser" om en torr
// väg kostar ett onödigt larm, att säga "fryser inte" om en isig väg kostar löftet produkten vilar
// på. Taket för det felet är tio gånger hårdare än för det andra.
//
// OCH EN VAKT MOT SEPTEMBER: K-A4 kräver minst 100 punkter med UPPMÄTT frys. Annars kan ett
// septemberunderlag ge 99 % rätt klass genom att alltid svara "fryser inte". En klassificerare som
// aldrig sett ett positivt fall är inte prövad.
//
// VAD DEN INTE GÖR: ger ingen rätt att skapa en varning. §1 i dokumentet — en modellerad storhet
// får aldrig vara en avtryckare, bara stärka en bedömning som redan vilar på en uppmätt station.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-k-a.ts [dagar=60]
// Självtest utan DB: scripts/grind-k-a.ts --sjalvtest

import { readFileSync } from "node:fs";
import { andelSe, utfallGolv, utfallTak, grindutfall, marginalPe, type Utfall }
  from "../publish/marginal.ts";

// ── Speglar publish/grind-a.ts. ÄNDRA DÄR FÖRST — driftvakten fäller annars.
const K_NEIGHBOURS = 5;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const GIVARVAKT = "air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12"; // #75

// ── Svepet ur TROSKLAR-FRYSKLASSNINGEN §2. Inget av talen är valt ur ett utfall.
export const K1_GRANS = [0, 0.5, 1.0];        // klassgränsen, °C
export const K2_ZON = [0, 0.5, 1.0];          // osäkerhetszonen — modellen får avstå
export const K3_KM = [15, 20, 50];            // längsta avstånd till bidragande granne
// ── Kraven ur §4.
const K_A1_TRAFF = 0.95, K_A2_FARLIGT = 0.01, K_A3_TACKNING = 0.70;
const MIN_PUNKTER = 500, MIN_STATIONER = 20, MIN_FRYS = 100;

export type Punkt = { measured: number; pred: number; station: string };
export type Utvardering = {
  uttalade: number; ratt: number; farligt: number; avstod: number;
  traff: number; farligtAndel: number; tackning: number;
};

/** Klassificeringen. Modellen avstår när prediktionen ligger inom ±zon från klassgränsen. */
export function klassa(punkter: Punkt[], grans: number, zon: number): Utvardering {
  let uttalade = 0, ratt = 0, farligt = 0, avstod = 0;
  for (const p of punkter) {
    if (Math.abs(p.pred - grans) <= zon) { avstod++; continue; }
    uttalade++;
    const modellFryser = p.pred <= grans, mattFryser = p.measured <= grans;
    if (modellFryser === mattFryser) ratt++;
    // FARLIGT FEL: modellen friar en väg som mätningen säger fryser.
    else if (!modellFryser && mattFryser) farligt++;
  }
  const n = punkter.length;
  return { uttalade, ratt, farligt, avstod,
    traff: uttalade ? ratt / uttalade : 0,
    farligtAndel: uttalade ? farligt / uttalade : 0,
    tackning: n ? uttalade / n : 0 };
}

/** Underlagsvakten K-A4. null = ingen dom får fällas. */
export function dom<T>(punkter: number, stationer: number, frysande: number, svar: T): T | null {
  return punkter >= MIN_PUNKTER && stationer >= MIN_STATIONER && frysande >= MIN_FRYS ? svar : null;
}

/** Grinddomen med marginalvakten (K-A5) på alla tre måtten. */
export function grind(u: Utvardering): { utfall: Utfall; a1: Utfall; a2: Utfall; a3: Utfall } {
  const seU = andelSe(u.traff, u.uttalade), seF = andelSe(u.farligtAndel, u.uttalade);
  const seT = andelSe(u.tackning, u.uttalade + u.avstod);
  const a1 = utfallGolv(u.traff, K_A1_TRAFF, seU);
  const a2 = utfallTak(u.farligtAndel, K_A2_FARLIGT, seF);
  const a3 = utfallGolv(u.tackning, K_A3_TACKNING, seT);
  return { utfall: grindutfall([a1, a2, a3]), a1, a2, a3 };
}

const pct = (x: number) => `${(100 * x).toFixed(1)} %`;

// ── Självtest med känd sanning + driftvakt mot grind A.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — klassningen, avståendet och vakterna mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const p = (measured: number, pred: number): Punkt => ({ measured, pred, station: "s" });
  // En perfekt modell: rätt sida varje gång, ingen zon ⇒ full täckning.
  const perfekt = [p(-3, -2), p(-1, -0.5), p(3, 2), p(5, 4)];
  k("perfekt modell: träff 100 %", klassa(perfekt, 0, 0).traff, 1);
  k("perfekt modell: täckning 100 %", klassa(perfekt, 0, 0).tackning, 1);
  k("perfekt modell: noll farliga", klassa(perfekt, 0, 0).farligt, 0);
  // Det farliga felet: modellen friar (pred > 0) en väg som fryser (measured <= 0).
  k("farligt fel räknas", klassa([p(-1, 2)], 0, 0).farligt, 1);
  // Det ofarliga felet räknas som fel men INTE som farligt.
  const ofarligt = klassa([p(2, -1)], 0, 0);
  k("ofarligt fel är fel", ofarligt.ratt, 0);
  k("ofarligt fel är inte farligt", ofarligt.farligt, 0);
  // Zonen: en prediktion inom ±0,5 från gränsen ska få modellen att avstå.
  k("pred 0,3 med zon 0,5 ⇒ avstår", klassa([p(-1, 0.3)], 0, 0.5).avstod, 1);
  k("pred 0,6 med zon 0,5 ⇒ uttalar sig", klassa([p(-1, 0.6)], 0, 0.5).uttalade, 1);
  k("avståendet sänker täckningen", klassa([p(-1, 0.3), p(-3, -2)], 0, 0.5).tackning, 0.5);
  // Klassgränsen flyttar klassningen.
  k("gräns +1: pred 0,5 fryser", klassa([p(0.5, 0.5)], 1, 0).ratt, 1);
  // Underlagsvakten, inklusive septembervakten.
  k("för få punkter", dom(499, 100, 200, "x"), null);
  k("för få stationer", dom(5000, 19, 200, "x"), null);
  k("för få FRYSANDE punkter (septembervakten)", dom(5000, 100, 99, "x"), null);
  k("alla tre räcker", dom(500, 20, 100, "x"), "x");
  // Marginalvakten: 95,1 % mot kravet 95 % på tunt underlag är inte skiljbart.
  const tunt = grind({ uttalade: 200, ratt: 190, farligt: 1, avstod: 0,
    traff: 0.951, farligtAndel: 0.005, tackning: 1 });
  k("träff inom bruset ⇒ OAVGJORT", tunt.a1, "OAVGJORT");
  // Svepen är de fastställda.
  k("K1-svepet är dokumentets", K1_GRANS.join(","), "0,0.5,1");
  k("K3-svepet är dokumentets", K3_KM.join(","), "15,20,50");
  // DRIFTVAKTEN: modellen måste vara grind A:s.
  const ga = readFileSync(new URL("../publish/grind-a.ts", import.meta.url), "utf8");
  const tal = (n: string) => Number(ga.match(new RegExp(`const ${n} = (-?\\d+(?:\\.\\d+)?)`))?.[1]);
  k("K_NEIGHBOURS = grind A:s", K_NEIGHBOURS, tal("K_NEIGHBOURS"));
  k("MIN_SHARED = grind A:s", MIN_SHARED, tal("MIN_SHARED"));
  k("BUCKET_S = grind A:s", BUCKET_S, tal("BUCKET_S"));
  k("givarvakten finns i grind A:s fråga", ga.includes("surface_temp_c >= air_temp_c - 12"), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: det farliga felet räknas åt rätt håll, avståendet sänker täckningen,");
  console.log("septembervakten kräver frysande punkter, och modellen är grind A:s.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 60);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");

type Station = { id: string; lon: number; lat: number; series: Map<number, number> };
const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day' AND ${GIVARVAKT}
  ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
const stationer = new Map<string, Station>();
for (const r of res.rows as any[]) {
  let s = stationer.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, series: new Map() }; stationer.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
console.log(`Grind K-A — bär modellen en FRYSKLASSNING? (kort #103, ${DAGAR} dygn)\n`);
console.log(`Underlag: ${stationer.size} stationer, ${res.rows.length} bucketade avläsningar (efter #75:s givarvakt).`);
if (stationer.size < 100) { console.error("UNDERLAGSVAKT: för få stationer. Avbryter."); await pool.end(); process.exit(1); }

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Grind A:s leave-one-out, men med K3 som tak för bidragande grannar. */
function utvardera(maxKm: number): Punkt[] {
  const ids = [...stationer.keys()];
  const grannar = new Map<string, { id: string; km: number }[]>();
  for (const s of ids) {
    const a = stationer.get(s)!;
    grannar.set(s, ids.filter((n) => n !== s)
      .map((n) => ({ id: n, km: haversineKm(a.lon, a.lat, stationer.get(n)!.lon, stationer.get(n)!.lat) }))
      .filter((n) => n.km <= maxKm).sort((x, y) => x.km - y.km).slice(0, K_NEIGHBOURS));
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
  const ut: Punkt[] = [];
  for (const s of ids) {
    const st = stationer.get(s)!;
    for (const [t, measured] of st.series) {
      if (measured > 5) continue;                       // vintertimmar, som grind A
      let wsum = 0, psum = 0;
      for (const { id: n, km } of grannar.get(s)!) {
        const nv = stationer.get(n)!.series.get(t);
        if (nv === undefined) continue;
        const p = par.get(`${s}|${n}`)!;
        if (p.n - 1 < MIN_SHARED) continue;
        const offsetExcl = (p.sum - (measured - nv)) / (p.n - 1);
        const w = 1 / Math.max(km, 1);
        wsum += w; psum += w * (nv + offsetExcl);
      }
      if (wsum > 0) ut.push({ measured, pred: psum / wsum, station: s });
    }
  }
  return ut;
}

console.log(`\nSVEPET — K1 klassgräns × K2 osäkerhetszon × K3 ankaravstånd (${K1_GRANS.length * K2_ZON.length * K3_KM.length} kombinationer)`);
console.log(`  Krav: träff ≥ ${pct(K_A1_TRAFF)} · farliga fel ≤ ${pct(K_A2_FARLIGT)} · täckning ≥ ${pct(K_A3_TACKNING)}`);

type Rad = { km: number; grans: number; zon: number; u: Utvardering; g: ReturnType<typeof grind>; frys: number; stationer: number };
const rader: Rad[] = [];
for (const km of K3_KM) {
  const punkter = utvardera(km);
  const nStationer = new Set(punkter.map((p) => p.station)).size;
  for (const grans of K1_GRANS) {
    const frys = punkter.filter((p) => p.measured <= grans).length;
    for (const zon of K2_ZON) {
      const u = klassa(punkter, grans, zon);
      rader.push({ km, grans, zon, u, g: grind(u), frys, stationer: nStationer });
    }
  }
}

// DOMSPÄRREN SKRIVS UT FÖRE TABELLEN (K-C3) — ingen ska kunna läsa den som en dom.
const bast = rader[0];
const nog = dom(bast.u.uttalade + bast.u.avstod, bast.stationer, bast.frys, true);
if (!nog) {
  console.log(`\n⊘ INGEN DOM — domspärren (K-A4) håller.`);
  console.log(`  Krav: ≥ ${MIN_PUNKTER} punkter över ≥ ${MIN_STATIONER} stationer, och ≥ ${MIN_FRYS} punkter med UPPMÄTT frys.`);
  console.log(`  Har:  ${bast.u.uttalade + bast.u.avstod} punkter över ${bast.stationer} stationer, ${bast.frys} frysande vid gränsen 0 °C.`);
  console.log(`  Septembervakten är den som biter: en klassificerare som aldrig sett ett positivt`);
  console.log(`  fall kan svara "fryser inte" varje gång och ändå få nästan allt rätt.`);
  console.log(`  Talen nedan redovisas, men ingen dom går att läsa av dem.`);
}

console.log(`\n  K3    K1     K2    punkter  uttalade  täckning     träff   farliga   utfall`);
for (const r of rader) {
  const u = r.u;
  console.log(`  ${String(r.km).padStart(2)} km  ${r.grans.toFixed(1)}  ±${r.zon.toFixed(1)}  ` +
    `${String(u.uttalade + u.avstod).padStart(8)}  ${String(u.uttalade).padStart(8)}  ` +
    `${pct(u.tackning).padStart(8)}  ${pct(u.traff).padStart(8)}  ${pct(u.farligtAndel).padStart(8)}   ` +
    `${nog ? r.g.utfall : "—"}`);
}

if (nog) {
  const klarar = rader.filter((r) => r.g.utfall === "KLARAR");
  console.log(`\nDOM: ${klarar.length ? `K-A PASSERAD i ${klarar.length} kombinationer` : "K-A FALLER i alla kombinationer"}`);
  if (klarar.length) {
    const b = klarar.sort((a, c) => c.u.tackning - a.u.tackning)[0];
    console.log(`  Bäst täckning bland dem: K1 ${b.grans} °C, K2 ±${b.zon}, K3 ${b.km} km —`);
    console.log(`  täckning ${pct(b.u.tackning)}${marginalPe(andelSe(b.u.tackning, b.u.uttalade + b.u.avstod))}, ` +
      `träff ${pct(b.u.traff)}, farliga ${pct(b.u.farligtAndel)}.`);
    console.log(`  VÄRDENA ÄR MÄTNINGENS FÖRSLAG, inte satta trösklar — §7 gäller.`);
  }
}
console.log(`\n  Att läsa med, alltid: ett ja här ger INGEN rätt att skapa en varning (§1). En godkänd`);
console.log(`  frysklassning får stärka en bedömning som redan vilar på en uppmätt station — aldrig`);
console.log(`  vara avtryckare. En modellerad storhet är inte en observation.`);
await pool.end();
