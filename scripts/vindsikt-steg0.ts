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

/** G_tak, rimlighetstaket ur TROSKLAR-VIND-SIKT §3.1 (Bengts order 13/9).
 *
 *  Körningen 13/9 gav **byvind max 87,7 m/s**. Sveriges rekord ligger kring 81 m/s och då på
 *  fjällstation; 87,7 vid en vägstation i september är en trasig givare, inte väder. Utan tak
 *  räknas den i det HÖGSTA bandet — samma band vars 45 stationstimmar hela domen vilar på.
 *
 *  Svepet är dokumentets, inte mitt: 30 · 40 · 50 m/s, och regeln är att **det lägsta som inte
 *  kastar verkliga stormar vinner**. Därför används lägsta steget, och skriptet SKRIVER UT hur
 *  många stationstimmar varje steg skulle kasta — så valet kan göras på mätning i stället för
 *  på antagande när höststormarna kommit. Samma tak och samma skäl som ruttberedskapen (#124). */
export const G_TAK_SVEP = [30, 40, 50] as const;
export const G_TAK = G_TAK_SVEP[0];

export const VINDBAND: [string, number, number][] = [
  ["< 10 m/s", 0, 10], ["10–15", 10, 15], ["15–20", 15, 20], [`20–${G_TAK}`, 20, G_TAK],
];
export const SIKTBAND: [string, number, number][] = [
  ["> 1000 m", 1000, 999999], ["500–1000", 500, 1000], ["200–500", 200, 500], ["< 200", 0, 200],
];

// ── STATIONSVAKTEN (Bengts order 13/9, DECISIONS #164)
//
// ETT VÄRDETAK TAR BORT DÅLIGA AVLÄSNINGAR. DET TAR INTE BORT EN DÅLIG STATION.
// Station 2312 bar 26 av 36 timmar över 30 m/s och 18 av 24 över 50, spridda över HELA arkivet
// 4–13/9. Dess medelbyvind är 21,9 men medianen 6,4 — spikarna drar upp varje aggregat den
// bidrar till, också i timmar UNDER taket där den kan rapportera 25 när sanningen är 6. G_tak
// rör inte det. Och två stationer till (2438, 2107) har sina omöjliga avläsningar UNDER 30 m/s:
// G_tak kan per konstruktion aldrig se dem.
//
// KRITERIET ÄR FYSIK, INTE EN LISTA MED ID:N. En lista blir inaktuell i tysthet; ett fysikaliskt
// mått fångar nästa trasiga station också. En byvind är per definition en excursion från
// MEDELVINDEN: byvindfaktorn ligger på 1,3–1,5 över öppen terräng och når 2,5–3 i den ruggigaste.
// Arkivets egna tal vid meningsfull vind (medel ≥ 5 m/s, 3 142 rader): median 1,75 · p95 2,25 ·
// p99,9 3,08. Taket 5 är alltså rundligt tilltaget åt rätt håll.
//
// FÖRSTA KRITERIET FÖLL PÅ SIN EGEN MÄTNING, och det står här för att nästa läsare inte ska
// bygga om det. K1 var kvoten PER RAD vid medelvind ≥ 1 m/s. Den diskvalificerade 335 av 748
// stationer (45 %) och åt 47 % av B1:s stationstimmar. Orsaken syns i råraderna: station 2534,
// 13/9 02:50–03:20, byvind 10,5 · 10,5 · 10,5 · 10,5 · 10,5 · 10,4 medan medelvinden faller
// 3,8 → 3,3 → 2,5 → 1,9 → 1,4 → 1,0. BYVINDEN ÄR ETT MAX ÖVER ETT BAKÅTFÖNSTER SOM INTE FLYTTAR
// SIG; medelvinden är ögonblicket. Kvoten var två olika tidsfönster delade med varandra.
// Att bara höja golvet räckte inte: vid medelvind ≥ 5 m/s fångas EN station (426), och 2312 —
// den som motiverade hela vakten — slipper undan, för när den rapporterar 85 m/s står dess
// medelvind under golvet. En vakt som missar den kända trasiga stationen är sämre än ingen.
//
// K2, SOM ANVÄNDS: räkna per STATIONSTIMME, inte per rad. Inom timmen är timmens högsta
// medelvind en rättvis följeslagare till timmens högsta by, och fönsterglappet dör.
//  · En stationstimme är OMÖJLIG när byvinden når BYVIND_GOLV och kvoten överstiger BYKVOT_TAK.
//  · Golvet är W-A:s eget bandgräns, inte mitt: under 15 m/s kan en felkvot inte lyfta en timme
//    in i ett band grinden bryr sig om, och då ska vakten hålla tyst.
//  · Bara BYVINDEN diskvalificeras. Siktgivaren på samma stolpe är ett annat instrument, och att
//    kasta den vore att slänga mätningar vi inte har skäl att misstro.
export const BYKVOT_SVEP = [3, 5, 10] as const;
export const BYKVOT_TAK = 5;                     // byvindfaktor över detta är fysiskt omöjlig
export const BYVIND_GOLV = 15;                   // m/s — under W-A:s första intressanta band tiger vakten
export const OMOJLIGA_TIMMAR_SVEP = [1, 2, 5] as const;
export const OMOJLIGA_TIMMAR = OMOJLIGA_TIMMAR_SVEP[0];

/** Ren, testbar: är stationstimmen fysiskt omöjlig? (by och medel är timmens högsta av varje) */
export function omojligTimme(byvind: number, medel: number, kvotTak = BYKVOT_TAK): boolean {
  return byvind >= BYVIND_GOLV && medel > 0 && byvind / medel > kvotTak;
}

/** Och stationen: räcker antalet omöjliga timmar för att diska den ur B1? */
export function diskvalificera(omojligaTimmar: number, krav = OMOJLIGA_TIMMAR): boolean {
  return Number.isFinite(omojligaTimmar) && omojligaTimmar >= krav;
}

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

/** Bandets rad (kort #254 c): under underlagsvakten bara räkningar — frekvensen per 1 000 timmar och kvoten är utfallet, och
 *  visas först när W-A4 är uppfylld (som V-B:s spärr, DECISIONS #350). */
function waRad(r: { namn: string; timmar: number; olyckor: number; per1000: number; kvot: number }, oppen: boolean): string {
  const dolt = (s: string) => (oppen ? s : "spärrad");
  return `  ${r.namn.padEnd(12)} ${String(r.timmar).padStart(14)} ${String(r.olyckor).padStart(18)} ${dolt(tal(r.per1000)).padStart(15)} ${dolt(tal(r.kvot)).padStart(17)}`;
}

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
  // G_tak: taket ska vara svepets LÄGSTA steg, och det ska faktiskt sitta på översta bandet.
  // Utan den andra kontrollen kan konstanten ändras utan att bandet följer med — och då
  // släpps den trasiga givaren in igen utan att något ser fel ut.
  k("G_TAK är svepets lägsta steg", G_TAK, Math.min(...G_TAK_SVEP));
  k("översta vindbandet slutar vid G_TAK", VINDBAND[VINDBAND.length - 1][2], G_TAK);
  k("87,7 m/s hamnar utanför alla band", VINDBAND.some(([, lo, hi]) => 87.7 >= lo && 87.7 < hi), false);
  k("25 m/s ryms fortfarande", VINDBAND.some(([, lo, hi]) => 25 >= lo && 25 < hi), true);
  // STATIONSVAKTEN mot VERKLIGA stationstimmar ur mätningen 13/9. Talen är avlästa ur arkivet,
  // inte påhittade — så provet faller om kriteriet slutar fånga dem.
  k("2312:s värsta timme, 85,5 mot 0,9, är omöjlig", omojligTimme(85.5, 0.9), true);
  k("2438, 29,9 mot 0,75, är omöjlig", omojligTimme(29.9, 0.75), true);
  k("… och 2438 ligger UNDER G_tak, alltså osynlig för värdetaket", 29.9 < G_TAK, true);
  // Den viktigare halvan: verkligt väder får inte diskas.
  k("verklig storm, 20 m/s med faktor 2,0, behålls", omojligTimme(20, 10), false);
  k("ruggig terräng, 18 m/s med faktor 3,0, behålls", omojligTimme(18, 6), false);
  // K1:s fälla, inbakad som prov: fönsterglappet vid liten byvind får ALDRIG fälla en station.
  k("2534:s fönsterglapp, 10,5 mot 1,0, är inte omöjligt", omojligTimme(10.5, 1.0), false);
  k("ingen medelvind alls ger ingen dom", omojligTimme(16, 0), false);
  k("taket är svepets mitt", BYKVOT_TAK, BYKVOT_SVEP[1]);
  k("kravet är kravsvepets lägsta", OMOJLIGA_TIMMAR, Math.min(...OMOJLIGA_TIMMAR_SVEP));
  k("en enda omöjlig timme räcker", diskvalificera(1), true);
  k("noll omöjliga timmar diskar inte", diskvalificera(0), false);
  // Kort #254 c: under spärren visar bandets rad ingen frekvens och ingen kvot.
  const br = { namn: "≥ 15 m/s", timmar: 120, olyckor: 3, per1000: 25, kvot: 1.87 };
  k("spärrad rad visar ingen kvot", waRad(br, false).includes("1.87"), false);
  k("spärrad rad visar ingen frekvens", waRad(br, false).includes("25.00"), false);
  k("öppen rad visar kvoten", waRad(br, true).includes("1.87"), true);
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
async function band(kolumn: string, banden: [string, number, number][], riktning: "hog" | "lag",
                    uteslutna: string[] = []): Promise<Bandrad[]> {
  const ut: Bandrad[] = [];
  for (const [namn, lo, hi] of banden) {
    const r = (await q(`
      WITH st AS (
        SELECT station_id, date_trunc('hour', sample_time) AS h,
               ${riktning === "hog" ? `max(${kolumn})` : `min(${kolumn})`} AS v,
               (array_agg(geom ORDER BY sample_time))[1] AS geom
        FROM weather_observations
        WHERE sample_time > now() - $1 * interval '1 day' AND ${kolumn} IS NOT NULL
          AND NOT (station_id = ANY($4::text[]))
        GROUP BY 1, 2
      ),
      i AS (SELECT * FROM st WHERE v >= $2 AND v < $3)
      SELECT count(*)::int AS timmar,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM situation_archive a
          WHERE a.geom IS NOT NULL AND a.start_time >= i.h AND a.start_time < i.h + interval '1 hour'
            AND a.geom && ST_Expand(i.geom, 0.25)
            AND ST_DWithin(a.geom::geography, i.geom::geography, ${RACKVIDD_M})))::int AS olyckor
      FROM i`, [DAGAR, lo, hi, uteslutna]))[0];
    ut.push({ namn, timmar: Number(r.timmar), olyckor: Number(r.olyckor) });
  }
  return ut;
}

// G_TAK-SVEPET, skrivet ut så att valet kan göras på mätning. Dokumentets regel är "det lägsta
// som inte kastar verkliga stormar" — och det går bara att avgöra när man ser vad varje steg
// kastar. I september väntas allt utom den trasiga givaren ligga under 30.
console.log(`\nG_TAK-SVEPET (TROSKLAR-VIND-SIKT §3.1) — vad varje steg skulle kasta:`);
{
  const over = await q(`
    WITH st AS (
      SELECT station_id, date_trunc('hour', sample_time) AS h, max(wind_gust_ms) AS v
      FROM weather_observations
      WHERE sample_time > now() - $1 * interval '1 day' AND wind_gust_ms IS NOT NULL
      GROUP BY 1, 2)
    SELECT count(*) FILTER (WHERE v >= 30)::int AS over30,
           count(*) FILTER (WHERE v >= 40)::int AS over40,
           count(*) FILTER (WHERE v >= 50)::int AS over50,
           count(DISTINCT station_id) FILTER (WHERE v >= 30)::int AS stationer30,
           round(max(v), 1) AS hogsta
    FROM st`, [DAGAR]);
  const o = over[0];
  console.log(`  ≥ 30 m/s: ${o.over30} stationstimmar på ${o.stationer30} stationer · ≥ 40: ${o.over40} · ≥ 50: ${o.over50} · högsta ${o.hogsta} m/s`);
  console.log(`  VALT: ${G_TAK} m/s (lägsta steget). Allt över räknas som trasig givare och ingår`);
  console.log(`  inte i något band. Kommer höststormarna och steget visar sig kasta verkliga`);
  console.log(`  stormar ska det höjas — med en rad i DECISIONS, före mätningen som ska använda det.`);
  if (Number(o.over30) > 0 && Number(o.stationer30) > 2)
    console.log(`  ⚠️ ${o.stationer30} STATIONER över 30 m/s — det kan vara väder och inte givarfel. LÄS för hand.`);
}


console.log(`\nSTATIONSVAKTEN — omöjliga stationstimmar (byvind ≥ ${BYVIND_GOLV} m/s och kvot > ${BYKVOT_TAK})`);
const diskade: string[] = [];
{
  // Svepets steg blir varsin kolumn, så taket har EN källa och SQL:en inte en andra kopia.
  const kol = BYKVOT_SVEP.map((s, i) =>
    `count(*) FILTER (WHERE byvind >= $2 AND medel > 0 AND byvind / medel > ${s})::int AS o${i}`).join(",\n             ");
  const rader = await q(`
    WITH t AS (
      SELECT station_id, date_trunc('hour', sample_time) AS h,
             max(wind_gust_ms) AS byvind, max(wind_speed_ms) AS medel
      FROM weather_observations
      WHERE sample_time > now() - $1 * interval '1 day'
        AND wind_gust_ms IS NOT NULL AND wind_speed_ms IS NOT NULL
      GROUP BY 1, 2
    )
    SELECT station_id, ${kol},
           count(*) FILTER (WHERE byvind >= $2)::int AS hoga_timmar,
           round(max(byvind / NULLIF(medel, 0))::numeric, 1) AS varsta_kvot,
           round(max(byvind)::numeric, 1) AS max_by
    FROM t GROUP BY 1
    HAVING count(*) FILTER (WHERE byvind >= $2) > 0
    ORDER BY 2 DESC, 4 DESC`, [DAGAR, BYVIND_GOLV]);
  const valt = BYKVOT_SVEP.indexOf(BYKVOT_TAK);
  console.log(`  ${rader.length} stationer har någon timme över ${BYVIND_GOLV} m/s — bara de kan bedömas`);
  console.log(`  TAKSVEPET (vid krav ≥ ${OMOJLIGA_TIMMAR} omöjlig timme):`);
  for (const [i, s] of BYKVOT_SVEP.entries()) {
    const n = rader.filter((r) => diskvalificera(Number(r[`o${i}`]))).length;
    console.log(`    kvot > ${String(s).padStart(2)}: ${String(n).padStart(3)} stationer${s === BYKVOT_TAK ? "   ← VALT" : ""}`);
  }
  console.log(`  KRAVSVEPET (vid tak ${BYKVOT_TAK}):`);
  for (const krav of OMOJLIGA_TIMMAR_SVEP) {
    const n = rader.filter((r) => diskvalificera(Number(r[`o${valt}`]), krav)).length;
    console.log(`    ≥ ${krav} omöjliga timmar: ${String(n).padStart(3)} stationer${krav === OMOJLIGA_TIMMAR ? "   ← VALT" : ""}`);
  }
  const ut = rader.filter((r) => diskvalificera(Number(r[`o${valt}`])));
  for (const r of ut) diskade.push(String(r.station_id));
  console.log(`  DISKVALIFICERADE (${diskade.length}) — utesluts ur B1, men INTE ur B2:`);
  for (const r of ut.slice(0, 12)) {
    console.log(`    station ${String(r.station_id).padEnd(6)} ${String(r[`o${valt}`]).padStart(3)} omöjliga av ${String(r.hoga_timmar).padStart(3)} höga timmar` +
      ` · värsta kvot ${String(r.varsta_kvot).padStart(6)} · max byvind ${r.max_by} m/s${Number(r.max_by) < G_TAK ? "   ← under G_tak, osynlig för värdetaket" : ""}`);
  }
  if (ut.length > 12) console.log(`    … och ${ut.length - 12} till`);
  console.log(`  Arkivets egen medianbyvindfaktor i höga timmar är ~2,0 — taket ${BYKVOT_TAK} ligger långt ovanför.`);
  console.log(`  Stationerna ovan har en trasig BYVINDGIVARE — det bör meddelas Trafikverket.`);
}

for (const [rubrik, kolumn, banden, riktning, uteslut] of [
  ["B1 — BYVIND", "wind_gust_ms", VINDBAND, "hog", diskade],
  // SIKTEN UTESLUTER INGEN STATION: en trasig byvindgivare säger ingenting om siktgivaren
  // på samma stolpe. De är olika instrument, och att diskvalificera båda vore att kasta
  // mätningar vi inte har något skäl att misstro.
  ["B2 — SIKT", "visibility_m", SIKTBAND, "lag", []],
] as [string, string, [string, number, number][], "hog" | "lag", string[]][]) {
  console.log(`\n${rubrik}: stiger olycksfrekvensen?`);
  const rader = frekvens(await band(kolumn, banden, riktning, uteslut));
  const sista = rader[rader.length - 1];
  const olyckorTot = rader.reduce((s, r) => s + r.olyckor, 0);
  const mono = monoton(rader);
  const kvot = sista.kvot;
  // Underlagsvakten FÖRE tabellen (kort #254 c): under spärren visar tabellen bara räkningar.
  const oppen = !!dom(sista.timmar, olyckorTot, true);
  if (!oppen) {
    console.log(`  ⊘ OAVGJORT — underlagsvakten (W-A4) håller: ${sista.timmar} stationstimmar i högsta bandet`);
    console.log(`    (kräver ${MIN_STATIONSTIMMAR}) och ${olyckorTot} olyckor totalt (kräver ${MIN_OLYCKOR}).`);
    console.log(`    September är inte blåsigast på året. Det här är ett underlagsbesked, inte ett nej.`);
  }
  console.log(`  band          stationstimmar   timmar m. olycka   per 1 000 tim   kvot mot första`);
  for (const r of rader) console.log(waRad(r, oppen));
  if (oppen) {
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
