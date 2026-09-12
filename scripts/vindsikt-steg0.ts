// STEG 0 FÖR KORT #90 (TROSKLAR-VIND-SIKT §7): givarkollen och grind W-A.
//
// TVÅ FRÅGOR, och den första måste besvaras först.
//
// A. GIVARKOLLEN — går det att lita på vind och sikt alls? För yttemperaturen VET vi svaret:
//    61 % av arkivets frostrader faller på givarvakten, värst −49,9 °C (DECISIONS #106). För
//    wind_gust_ms och visibility_m har ingen någonsin mätt motsvarande. En vakt som inte vet vad
//    den vaktar mot är ingen vakt, och varje tal i W-A vore meningslöst utan det här.
//
// B. GRIND W-A — stiger olycksfrekvensen med byvind och sjunkande sikt?
//    METODEN, och skillnaden mot vattenplaningen: här FINNS en nämnare. Oljefilmens 0d hade ingen
//    alls — vi visste inte hur många torrperioder som passerat utan olycka. Här går antalet
//    stationstimmar per vindband att räkna, och därmed går NOLLHYPOTESEN att räkna.
//
//    MEN NÄMNAREN ÄR INTE ALLA TIMMAR, och det är den viktigaste reservationen i hela skriptet
//    (rättat 12/9, DECISIONS #116 — huvudet påstod tidigare att varje station rapporterar varje
//    minut). ARKIVDIETEN (DECISIONS #4, ingest/sources/weather.ts:69) sparar bara rader vid yta
//    ≤ 5 °C, nederbörd, eller när ytan rört sig ≥ 0,5 °C sedan senast. En lugn, torr, mild timme
//    lämnar därför ofta INGET spår alls. Nämnaren är "stationstimmar som dieten sparade", inte
//    "stationstimmar som inträffade" — och det är samma klass av fel som 0f:s (DECISIONS #96):
//    att läsa en händelsefiltrerad tabell som om den vore en kadens. TÄCKNINGSGRADEN MÄTS DÄRFÖR
//    I GIVARKOLLEN nedan och skrivs ut bredvid talen.
//
//    RIKTNINGEN PÅ FELET ÄR RESONEMANG, INTE MÄTNING: dieten sparar oftare vid nederbörd och
//    snabba temperaturfall, alltså i just det väder som blåser. Referensbandet (< 10 m/s) borde
//    därför tappa fler lugna timmar än de höga banden, vilket blåser upp referensens
//    olycksfrekvens och TRYCKER NER kvoten. Om det stämmer är W-A konservativ och en antydan
//    underskattad snarare än överskattad. Men det är inte mätt, och kvoten får inte läsas som om
//    det vore det.
//
//    Räknas som: olyckor inom räckvidd under en stationstimme, delat med antalet stationstimmar,
//    per band. Ett tal per band, jämförbart över band.
//
// VAD DEN INTE GÖR: dömer inte. W-A:s krav (monotont stigande, högsta bandet ≥ 1,5 × det lägsta,
// ≥ 500 stationstimmar i högsta bandet, ≥ 20 olyckor) prövas, men september är inte blåsigast på
// året. Ett OAVGJORT här är ett underlagsbesked, inte ett nej.
//
// OCH EN RESERVATION SOM SKA STÅ I VARJE UTFALL: situation_archive bär ingen ORSAK
// (situations.ts:37). Ett samband mellan vind och olycka är inte ett bevis på orsak — en
// hastighetsolycka i blåst räknas här som en blåstolycka. W-A mäter samband, inte kausalitet.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/vindsikt-steg0.ts [dagar=14]
// Självtest utan DB: scripts/vindsikt-steg0.ts --sjalvtest

import { skiljbarKvot } from "../publish/marginal.ts";
import { vaktdiagnos } from "../publish/vaktdiagnos.ts";

const RACKVIDD_M = 15000;      // station ↔ olycka, samma som #89:s steg 0 (0d)
const MIN_STATIONSTIMMAR = 500; // W-A4, högsta bandet
const MIN_OLYCKOR = 20;         // W-A4, totalt

export const VINDBAND: [string, number, number][] = [
  ["< 10 m/s", 0, 10], ["10–15", 10, 15], ["15–20", 15, 20], ["≥ 20", 20, 999],
];
export const SIKTBAND: [string, number, number][] = [
  ["> 1000 m", 1000, 999999], ["500–1000", 500, 1000], ["200–500", 200, 500], ["< 200", 0, 200],
];

export type Bandrad = { namn: string; timmar: number; olyckor: number };

/** Olycksfrekvens per 1 000 stationstimmar, och kvoten mot referensbandet. */
export function frekvens(rader: Bandrad[], refIdx = 0) {
  const f = rader.map((r) => (r.timmar ? (1000 * r.olyckor) / r.timmar : 0));
  const ref = f[refIdx] || 0;
  return rader.map((r, i) => ({ ...r, per1000: f[i], kvot: ref ? f[i] / ref : 0 }));
}

/** W-A1/W-A3: stiger frekvensen monotont över banden? */
export function monoton(rader: ReturnType<typeof frekvens>): boolean {
  for (let i = 1; i < rader.length; i++) if (rader[i].per1000 < rader[i - 1].per1000) return false;
  return true;
}

/** Underlagsvakten, W-A4. null = ingen dom får fällas. */
export function dom<T>(sistaBandTimmar: number, olyckorTotalt: number, svar: T): T | null {
  return sistaBandTimmar >= MIN_STATIONSTIMMAR && olyckorTotalt >= MIN_OLYCKOR ? svar : null;
}

const tal = (x: number, d = 2) => x.toFixed(d);
const pct = (a: number, b: number) => b ? `${((100 * a) / b).toFixed(1)} %` : "–";

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — frekvens, monotoni och underlagsvakt mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Stigande frekvens: 1, 2, 4 olyckor per 1 000 timmar.
  const stig = frekvens([
    { namn: "a", timmar: 1000, olyckor: 1 },
    { namn: "b", timmar: 1000, olyckor: 2 },
    { namn: "c", timmar: 1000, olyckor: 4 },
  ]);
  k("frekvens band a", stig[0].per1000, 1);
  k("frekvens band c", stig[2].per1000, 4);
  k("kvot högsta mot lägsta", stig[2].kvot, 4);
  k("monoton stigande", monoton(stig), true);
  // Exponeringen måste räknas in: fler olyckor i ett band med MYCKET fler timmar är inte högre risk.
  const falla = frekvens([
    { namn: "vanlig vind", timmar: 100000, olyckor: 100 },   // 1,0 per 1 000
    { namn: "hård vind", timmar: 100, olyckor: 0 },          // 0,0 per 1 000
  ]);
  k("stor absolut siffra men låg frekvens", falla[0].per1000, 1);
  k("icke-monoton fångas", monoton(falla), false);
  // Underlagsvakten.
  k("dom: för få timmar", dom(499, 100, "svar"), null);
  k("dom: för få olyckor", dom(5000, 19, "svar"), null);
  k("dom: båda räcker", dom(500, 20, "svar"), "svar");
  // Banden ska täcka utan hål.
  k("vindbanden hänger ihop", VINDBAND.every((b, i) => i === 0 || b[1] === VINDBAND[i - 1][2]), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: frekvensen delar med exponeringen, monotonin fångar ett fall, vakten håller.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 14);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

console.log(`Steg 0 för kort #90 — givarkollen och grind W-A (${DAGAR} dygns fönster)\n`);

// VAKTDIAGNOSEN FÖRST (DECISIONS #141): bär arkivet fälten alls?
await vaktdiagnos(q, "weather_observations",
  `WHERE sample_time > now() - ${DAGAR} * interval '1 day'`, [
    { namn: "byvind finns", bar: "wind_gust_ms IS NOT NULL", villkor: "true" },
    { namn: "sikt finns", bar: "visibility_m IS NOT NULL", villkor: "true" },
    { namn: "sikt under taket 20 000 m", bar: "visibility_m IS NOT NULL", villkor: "visibility_m < 20000" },
    { namn: "#75: lufttemperatur finns", bar: "air_temp_c IS NOT NULL", villkor: "true" },
  ]);

// ── A. GIVARKOLLEN
console.log(`A — GIVARKOLLEN: går det att lita på vind och sikt?`);
const g = (await q(`SELECT count(*)::int AS rader,
    count(*) FILTER (WHERE wind_gust_ms IS NOT NULL)::int AS med_by,
    count(*) FILTER (WHERE wind_speed_ms IS NOT NULL)::int AS med_medel,
    count(*) FILTER (WHERE visibility_m IS NOT NULL)::int AS med_sikt,
    count(DISTINCT station_id) FILTER (WHERE wind_gust_ms IS NOT NULL)::int AS stationer_by,
    count(DISTINCT station_id) FILTER (WHERE visibility_m IS NOT NULL)::int AS stationer_sikt,
    count(*) FILTER (WHERE wind_gust_ms < wind_speed_ms)::int AS by_under_medel,
    count(*) FILTER (WHERE wind_gust_ms < 0 OR wind_speed_ms < 0 OR visibility_m < 0)::int AS negativa,
    max(wind_gust_ms) AS max_by, max(visibility_m) AS max_sikt, min(visibility_m) AS min_sikt
  FROM weather_observations WHERE sample_time > now() - $1 * interval '1 day'`, [DAGAR]))[0];
console.log(`  ${g.rader} rader · byvind i ${pct(g.med_by, g.rader)} (${g.stationer_by} stationer) · sikt i ${pct(g.med_sikt, g.rader)} (${g.stationer_sikt} stationer)`);
console.log(`  byvind < medelvind (fysiskt omöjligt): ${g.by_under_medel} rader (${pct(g.by_under_medel, g.med_by)})`);
console.log(`  negativa värden: ${g.negativa}`);
console.log(`  spann: byvind max ${g.max_by} m/s · sikt ${g.min_sikt}–${g.max_sikt} m`);

const sentinel = await q(`SELECT visibility_m AS v, count(*)::int AS n FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' AND visibility_m IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC LIMIT 6`, [DAGAR]);
console.log(`  vanligaste siktvärdena (sentineltal syns här): ${sentinel.map((r) => `${r.v} m ×${r.n}`).join(" · ")}`);
console.log(`  ⚠️  Läs raden ovan för hand. Ett värde som dominerar är ofta en sentinel ("ingen mätning"),`);
console.log(`     inte en observation — och det ska in i givarvakten innan W-A får sätta en tröskel.`);

// TÄCKNINGSGRADEN — hur stor del av de MÖJLIGA stationstimmarna bär ett vindvärde alls?
// Arkivdieten sparar inte lugna, torra, milda timmar, så W-A:s nämnare är "timmar dieten
// sparade". Talet nedan säger hur stor del vi faktiskt ser och ska följa med i varje utfall.
const t = (await q(`
  WITH h AS (
    SELECT DISTINCT station_id, date_trunc('hour', sample_time) AS h
    FROM weather_observations
    WHERE sample_time > now() - $1 * interval '1 day' AND wind_gust_ms IS NOT NULL
  )
  SELECT (SELECT count(*) FROM h)::int AS faktiska,
         (SELECT count(DISTINCT station_id) FROM h)::int AS stationer,
         (SELECT min(h) FROM h) AS forsta`, [DAGAR]))[0];
// Kolumnerna är äldre än värdena: sql/011 la till fälten 4/9, men de fylldes först när
// ingest-live deployades 9/9 (kort #84). Ett fönster längre än så läser tomma dygn.
const dygnMedData = t.forsta ? (Date.now() - new Date(t.forsta).getTime()) / 86400000 : 0;
const mojliga = Math.round(Number(t.stationer) * dygnMedData * 24);
console.log(`  FÖRSTA TIMMEN MED BYVIND: ${t.forsta ?? "–"} ⇒ ${tal(dygnMedData, 1)} dygn med data`);
console.log(`     (fönstret är ${DAGAR} dygn — dygn därutöver är tomma på vind och sikt)`);
console.log(`  TÄCKNINGSGRAD: ${t.faktiska} stationstimmar med byvind av ${mojliga} möjliga`);
console.log(`     (${t.stationer} stationer × ${tal(dygnMedData, 1)} dygn × 24 h) = ${pct(Number(t.faktiska), mojliga)}`);
console.log(`  ⚠️  ARKIVDIETEN (DECISIONS #4) sparar bara rader vid yta ≤ 5 °C, nederbörd eller`);
console.log(`     Δyta ≥ 0,5 °C. W-A:s nämnare är därför stationstimmar SOM SPARATS, inte som`);
console.log(`     INTRÄFFAT. Riktningen på felet står i skriptets huvud — den är resonerad, inte mätt.`);

// ── B. GRIND W-A
// Exponeringen: stationstimmar per band. Olyckorna: station-timme där en olycka låg inom räckvidd.
async function band(kolumn: string, banden: [string, number, number][], riktning: "hog" | "lag"): Promise<Bandrad[]> {
  const ut: Bandrad[] = [];
  for (const [namn, lo, hi] of banden) {
    const r = (await q(`
      WITH st AS (
        SELECT station_id, date_trunc('hour', sample_time) AS h,
               ${riktning === "hog" ? `max(${kolumn})` : `min(${kolumn})`} AS v,
               (array_agg(geom ORDER BY sample_time))[1] AS geom
        FROM weather_observations
        WHERE sample_time > now() - $1 * interval '1 day' AND ${kolumn} IS NOT NULL
        GROUP BY 1, 2
      ),
      i AS (SELECT * FROM st WHERE v >= $2 AND v < $3)
      SELECT count(*)::int AS timmar,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM situation_archive a
          WHERE a.geom IS NOT NULL AND a.start_time >= i.h AND a.start_time < i.h + interval '1 hour'
            AND a.geom && ST_Expand(i.geom, 0.25)
            AND ST_DWithin(a.geom::geography, i.geom::geography, ${RACKVIDD_M})))::int AS olyckor
      FROM i`, [DAGAR, lo, hi]))[0];
    ut.push({ namn, timmar: Number(r.timmar), olyckor: Number(r.olyckor) });
  }
  return ut;
}

for (const [rubrik, kolumn, banden, riktning] of [
  ["B1 — BYVIND", "wind_gust_ms", VINDBAND, "hog"],
  ["B2 — SIKT", "visibility_m", SIKTBAND, "lag"],
] as [string, string, [string, number, number][], "hog" | "lag"][]) {
  console.log(`\n${rubrik}: stiger olycksfrekvensen?`);
  const rader = frekvens(await band(kolumn, banden, riktning));
  console.log(`  band          stationstimmar   timmar m. olycka   per 1 000 tim   kvot mot första`);
  for (const r of rader) {
    console.log(`  ${r.namn.padEnd(12)} ${String(r.timmar).padStart(14)} ${String(r.olyckor).padStart(18)} ${tal(r.per1000).padStart(15)} ${tal(r.kvot).padStart(17)}`);
  }
  const sista = rader[rader.length - 1];
  const olyckorTot = rader.reduce((s, r) => s + r.olyckor, 0);
  const mono = monoton(rader);
  const kvot = sista.kvot;
  if (!dom(sista.timmar, olyckorTot, true)) {
    console.log(`  ⊘ OAVGJORT — underlagsvakten (W-A4) håller: ${sista.timmar} stationstimmar i högsta bandet`);
    console.log(`    (kräver ${MIN_STATIONSTIMMAR}) och ${olyckorTot} olyckor totalt (kräver ${MIN_OLYCKOR}).`);
    console.log(`    September är inte blåsigast på året. Det här är ett underlagsbesked, inte ett nej.`);
  } else {
    // MARGINALVAKTEN (DECISIONS #128). En KVOT av två olycksfrekvenser får inte binomialfel —
    // osäkerheten sitter i logaritmen och domineras av det minsta antalet olyckor.
    const skilj = skiljbarKvot(kvot, 1.5, sista.olyckor, rader[0].olyckor);
    console.log(`  monotont stigande: ${mono ? "JA" : "NEJ"} · högsta mot lägsta: ${tal(kvot)} × (krav ≥ 1,5)`);
    if (!skilj) {
      console.log(`  ⊘ OAVGJORT — kvoten går inte att skilja från 1,5 vid ${sista.olyckor} respektive`);
      console.log(`    ${rader[0].olyckor} olyckor. Marginalvakten: ett tal inom bruset fäller inte och friar inte.`);
    } else {
      console.log(`  ⇒ ${mono && kvot >= 1.5 ? "W-A PASSERAD för den här storheten" : "W-A FALLER för den här storheten"}`);
    }
  }
}

console.log(`\nRESERVATION SOM SKA FÖLJA MED VARJE UTFALL`);
console.log(`  situation_archive bär ingen ORSAK (situations.ts:37). Ett samband mellan vind och`);
console.log(`  olycka är inte ett bevis på orsak — en hastighetsolycka i blåst räknas här som en`);
console.log(`  blåstolycka. W-A mäter samband, inte kausalitet, och det är allt den påstår.`);
console.log(`  Räckvidden är ${RACKVIDD_M / 1000} km, samma som #89:s steg 0. En olycka räknas till varje station`);
console.log(`  inom den radien, så tätt liggande stationer delar på samma olycka.`);
await pool.end();
