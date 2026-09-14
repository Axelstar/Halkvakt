// STEG 2 FÖR KORT #89 (TROSKLAR-OVERGANGAR §9): tillståndsskattaren, byggd på det som finns.
//
// BENGTS ORDER 13/9: "bygg steg 2 nu på det som finns". Bakgrunden är att grinden dokumentet satte
// för steg 2 — skattarens träffsäkerhet mot operatörens klasser — INTE GÅR ATT DÖMA i dag:
// `road_condition_history` står stilla sedan 25/8, dess blöta rader (25 "Våt" + 8 "fläckvis Våt")
// slutar 12/6, och `radar_precip` börjar 2/9. Fönstren överlappar inte med en enda dag. Bara tolv
// av 818 segment har någonsin bytt klass.
//
// DOKUMENTETS ORDALYDELSE TILLÅTER ÄNDÅ BYGGET, och det är därför det görs nu: grinden lyder
// "eget facit först … INNAN någon övergångsregel läser den". Den spärrar ANVÄNDNINGEN, inte
// bygget. Skattaren får alltså byggas och skuggas; det är steg 3 som måste vänta på facit.
//
// VARFÖR INGEN SKRIVANDE KOLUMN — och skälet är MÄTT, inte valt. Principen står i
// TROSKLAR-OVERGANGAR: spara det som inte går att räkna om, räkna om det som går. Trendarkivet
// (#88) MÅSTE spara, eftersom gallringen förstör dess 15-minutersfönster. Det här måttet räknar
// på TIMME, och timupplösningen ÖVERLEVER gallringen: den behåller sista raden per
// 30-minutershink, och rain_sum_mm är en 30-minuters BAKÅTSUMMA — den sparade raden är alltså
// just den som ser hinkens regn. radar_precip gallras inte alls. En skrivande kolumn hade
// dessutom krävt ett nytt cron-jobb, och de är stängda sedan #85.
//
// FÖLJDEN: ingen driftvakt behövs här. #88 har två kopior av samma regel — TypeScript och SQL —
// och behöver därför ett prov som visar att de väljer samma rader (flyttalsfyndet 13/9).
// Skattaren finns bara i TypeScript och kan inte glida isär med sig själv. Räknas den någon gång
// i drift gäller samma krav som för #88.
//
// VAD DEN SVARAR PÅ — fyra frågor, var och en med egen underlagsvakt:
//   2a TÄCKNINGEN     — hur många segment går att skatta alls, och hur långt bort sitter beviset?
//   2b VÅTBEVISEN     — hur mycket blött ser varje svepsteg, per källa?
//   2c SAMSTÄMMIGHETEN — där BÅDA källorna har en åsikt: hur ofta är de ense? ERSÄTTNINGSFACIT.
//   2d SKATTNINGEN    — hur faller blöt/torr/okänt ut över svepet N × r?
//   2f BIDRAGET      — växer radarns unika bidrag med avståndet till närmaste station?
// Och 2e: operatörsfacit, som ska stå som ⊘ INGEN DOM med sin mätta orsak, aldrig som tystnad.
//
// TRÖSKLARNA ÄR DOKUMENTETS. Svepen kommer ur `publish/tillstand.ts`, som i sin tur läser
// TROSKLAR-OVERGANGAR §2 ord för ord. Skriptet väljer ingen punkt — det skriver ut hela rutnätet.
//
// Helt läsande mot arkivet. Temptabeller används för att hålla frågorna snabba; de är
// sessionslokala och rör ingen rad i arkivet.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/tillstand-steg2.ts [dagar=7]
// Självtest utan DB: scripts/tillstand-steg2.ts --sjalvtest

import { skatta, samstammiga, N_SVEP, REGN_SVEP, R_SVEP } from "../publish/tillstand.ts";

const MAX_DAGAR = 14;            // hårt tak, inte bara en varning
const MIN_SEGMENTTIMMAR = 500;   // under detta skrivs OAVGJORT, aldrig ett tal
const MIN_JAMFORELSER = 100;     // 2c:s egen vakt — en samstämmighet på tio timmar är ingen dom
const MAX_KM = 50;               // samma ankargräns som grind A (publish/grind-a.ts:14)

const tal = (x: number, d = 1) => x.toFixed(d);
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — skattaren och vakterna mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const u = (s: number | null, r: number | null, tacker = true) =>
    ({ timmarSedanStationsregn: s, timmarSedanRadarregn: r, stationenTacker: tacker });

  k("regn för en halvtimme sedan är blött vid N=1", skatta(u(0.5, null), 1), "blöt");
  k("radarn ensam räcker", skatta(u(null, 1), 2), "blöt");
  k("tre timmar sedan är torrt vid N=2", skatta(u(3, null), 2), "torr");
  k("samma regn är blött vid N=4", skatta(u(3, null), 4), "blöt");
  // Den bärande regeln: frånvaro är inte torrt.
  k("utan stationstäckning blir svaret okänt", skatta(u(null, null, false), 4), "okänt");
  k("med stationstäckning får torrt påstås", skatta(u(null, null, true), 4), "torr");
  k("samstämmighet kräver två åsikter", samstammiga(true, null), null);
  // Svepen ska vara dokumentets — driver de isär är det ett fel, inte en justering.
  k("N-svepet är §2:s", N_SVEP.join("·"), "1·2·3·4");
  k("r-svepet är §2:s", R_SVEP.join("·"), "0.1·0.5·2");
  k("regnsvepet är §2:s", REGN_SVEP.join("·"), "0·0.2·0.5");
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: skattaren håller, och svepen är fortfarande dokumentets.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Math.min(Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 7), MAX_DAGAR);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

async function avsnitt(namn: string, fn: () => Promise<void>) {
  try { await fn(); }
  catch (e) { console.log(`\n${namn}\n  ✗ FRÅGAN KUNDE INTE STÄLLAS: ${(e as Error).message}`); }
}

console.log(`Steg 2 för kort #89 — tillståndsskattaren mot arkivet (${DAGAR} dygns fönster)\n`);
console.log(`  Fönstret är taket ${MAX_DAGAR} dygn. Till skillnad från trendarkivet (#88) klarar`);
console.log(`  det här måttet gallringen: den behåller sista raden per 30-minutershink, och`);
console.log(`  skattaren räknar på TIMME. rain_sum_mm är dessutom en 30-minuters BAKÅTSUMMA, så`);
console.log(`  den rad som sparas är just den som ser hinkens regn. radar_precip gallras inte alls.`);

// ── ARKIVET.
const wx = (await q(`SELECT count(*)::int AS rader, count(DISTINCT station_id)::int AS stationer,
    count(*) FILTER (WHERE rain_sum_mm IS NOT NULL)::int AS med_mm,
    min(sample_time) AS forst, max(sample_time) AS sist
  FROM weather_observations WHERE sample_time > now() - $1 * interval '1 day'`, [DAGAR]))[0];
const rp = (await q(`SELECT count(*)::int AS rader, count(DISTINCT segment_id)::int AS segment,
    min(observed_at) AS forst, max(observed_at) AS sist
  FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'`, [DAGAR]))[0];
const rc = (await q("SELECT count(*)::int AS segment FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL"))[0];
console.log("ARKIVET");
console.log(`  weather_observations  ${String(wx.rader).padStart(7)} rader · ${wx.stationer} stationer · ${pct(wx.med_mm, wx.rader)} med regnmängd`);
console.log(`                        ${String(wx.forst).slice(0, 16)} → ${String(wx.sist).slice(0, 16)}`);
console.log(`  radar_precip          ${String(rp.rader).padStart(7)} rader · ${rp.segment} segment`);
console.log(`                        ${String(rp.forst).slice(0, 16)} → ${String(rp.sist).slice(0, 16)}`);
console.log(`  road_conditions       ${String(rc.segment).padStart(7)} segment med geometri`);

if (!wx.med_mm) { console.error("\nUNDERLAGSVAKT: ingen regnmängd i fönstret. Avbryter."); await pool.end(); process.exit(1); }

// ── Temptabeller: segmentens närmaste station, radarns våta timmar, stationens våta timmar.
await q(`CREATE TEMP TABLE seg AS
  SELECT segment_id, ST_Centroid(geom) AS pt FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`);
await q(`CREATE TEMP TABLE par AS
  SELECT s.segment_id, n.station_id,
         round((ST_Distance(s.pt::geography, n.geom::geography) / 1000)::numeric, 1) AS km
  FROM seg s CROSS JOIN LATERAL (
    SELECT station_id, geom FROM weather_latest w ORDER BY w.geom <-> s.pt LIMIT 1) n`);
await q("CREATE INDEX par_seg_idx ON par (segment_id)");
await q("CREATE INDEX par_st_idx ON par (station_id)");

// Stationens observerade timmar — nämnaren för "torr". En timme utan observation kan inte bära
// ett påstående om torrhet (arkivdieten #4 sparar inte lugna, milda timmar).
await q(`CREATE TEMP TABLE sttim AS
  SELECT station_id, date_trunc('hour', sample_time) AS h,
         max(rain_sum_mm) AS mm
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' AND rain_sum_mm IS NOT NULL
  GROUP BY 1, 2`, [DAGAR]);
await q("CREATE INDEX sttim_idx ON sttim (station_id, h)");

await q(`CREATE TEMP TABLE rdtim AS
  SELECT segment_id, date_trunc('hour', observed_at) AS h, max(rate_mean_mmh) AS mmh
  FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'
  GROUP BY 1, 2`, [DAGAR]);
await q("CREATE INDEX rdtim_idx ON rdtim (segment_id, h)");

// Tidsaxeln som BÅDA nämnarna räknar på: varje hel timme arkivet faktiskt sträcker sig över.
await q(`CREATE TEMP TABLE rdtim_spann AS
  SELECT generate_series(minsta, storsta, interval '1 hour') AS h FROM (
    SELECT least((SELECT min(h) FROM rdtim), (SELECT min(h) FROM sttim)) AS minsta,
           greatest((SELECT max(h) FROM rdtim), (SELECT max(h) FROM sttim)) AS storsta) t`);

// ── 2a TÄCKNINGEN.
await avsnitt("2a TÄCKNINGEN", async () => {
  const a = (await q(`SELECT count(*)::int AS segment,
      count(*) FILTER (WHERE km <= $1)::int AS inom_max,
      round(percentile_disc(0.5) WITHIN GROUP (ORDER BY km)::numeric, 1) AS median_km,
      round(percentile_disc(0.9) WITHIN GROUP (ORDER BY km)::numeric, 1) AS p90_km,
      round(max(km)::numeric, 1) AS max_km FROM par`, [MAX_KM]))[0];
  const b = (await q(`SELECT count(DISTINCT segment_id)::int AS med_radar FROM rdtim`))[0];
  console.log("\n2a TÄCKNINGEN — går segmenten att skatta alls?");
  console.log(`  ${a.segment} segment · närmaste station median ${a.median_km} km · p90 ${a.p90_km} km · värst ${a.max_km} km`);
  console.log(`  ${a.inom_max} av ${a.segment} (${pct(a.inom_max, a.segment)}) har en station inom ${MAX_KM} km`);
  console.log(`  ${b.med_radar} segment har minst en radartimme i fönstret`);
  console.log(`  ⚠️ Avståndet är inte kosmetiskt: regn är lokalare än temperatur, och ${MAX_KM} km är`);
  console.log(`     grind A:s ankargräns för TEMPERATUR. Stationsbeviset ska läsas med det i minnet.`);
});

// ── 2b VÅTBEVISEN per svepsteg.
await avsnitt("2b VÅTBEVISEN", async () => {
  console.log("\n2b VÅTBEVISEN — hur mycket blött ser varje svepsteg?");
  const rader = (await q(`SELECT
      ${R_SVEP.map((r, i) => `count(*) FILTER (WHERE mmh >= ${r})::int AS r${i}`).join(", ")},
      count(*)::int AS alla FROM rdtim`))[0];
  console.log(`  RADARN (rate_mean_mmh, råradarskala) — ${rader.alla} segmenttimmar med rad:`);
  for (const [i, r] of R_SVEP.entries())
    console.log(`    r ≥ ${String(r).padStart(3)}: ${String(rader[`r${i}`]).padStart(7)} segmenttimmar (${pct(Number(rader[`r${i}`]), Number(rader.alla))} av raderna)`);
  const st = (await q(`SELECT
      ${REGN_SVEP.map((m, i) => `count(*) FILTER (WHERE ${m === 0 ? "mm > 0" : `mm >= ${m}`})::int AS m${i}`).join(", ")},
      count(*)::int AS alla FROM sttim`))[0];
  console.log(`  STATIONEN (rain_sum_mm, mm/30 min) — ${st.alla} stationstimmar med mätning:`);
  for (const [i, m] of REGN_SVEP.entries())
    console.log(`    ${m === 0 ? "  > 0  " : `  ≥ ${m} `}: ${String(st[`m${i}`]).padStart(7)} stationstimmar (${pct(Number(st[`m${i}`]), Number(st.alla))})`);
});

// ── 2c SAMSTÄMMIGHETEN — ersättningsfacit medan operatören tiger.
await avsnitt("2c SAMSTÄMMIGHETEN", async () => {
  console.log("\n2c SAMSTÄMMIGHETEN — två oberoende instrument, samma segmenttimme");
  console.log("  ERSÄTTNINGSFACIT. Operatörens klasser går inte att jämföra mot (2e), så det här är");
  console.log("  vad som finns: håller radarn och stationen med varandra om att det regnar?");
  console.log("  Det är INTE samma sak som att någon av dem har rätt. Två instrument som är ense");
  console.log("  kan vara ense om ett fel — men oenighet är ett mätt mått på hur mycket valet av");
  console.log("  källa betyder, och det är precis vad skattaren behöver veta innan den används.");
  // Universum: segmenttimmar där stationen mätte OCH segmentet bevisligen ligger i radarns
  // täckning någon gång i fönstret (annars är radarns tystnad inte ett "nej", bara ett "vet ej").
  const r = R_SVEP[1], m = REGN_SVEP[0];
  // UNIVERSUM: bara segmenttimmar där BÅDA har en åsikt. Radarn har en åsikt först när det
  // FINNS en rad — en saknad rad betyder torrt ELLER osamplat, och radarn tar bara 24 prov per
  // dygn à 5 minuter (steg 0:s 0f: 8,3 % av tiden). Att läsa tystnad som "torrt" vore samma
  // tysta osanning som skattaren själv förbjuder.
  const rad = (await q(`
    WITH grund AS (
      SELECT p.segment_id, s.h,
             (s.mm > 0) AS station_vat,
             (d.mmh >= $1) AS radar_vat
      FROM par p
      JOIN sttim s ON s.station_id = p.station_id
      JOIN rdtim d ON d.segment_id = p.segment_id AND d.h = s.h
      WHERE p.km <= $2)
    SELECT count(*)::int AS jamforelser,
      count(*) FILTER (WHERE radar_vat AND station_vat)::int AS bada,
      count(*) FILTER (WHERE radar_vat AND NOT station_vat)::int AS bara_radar,
      count(*) FILTER (WHERE NOT radar_vat AND station_vat)::int AS bara_station,
      count(*) FILTER (WHERE NOT radar_vat AND NOT station_vat)::int AS ingen
    FROM grund`, [r, MAX_KM]))[0];
  const n = Number(rad.jamforelser);
  // Nämnaren räknas ur arkivets FAKTISKA spann, inte ur det begärda fönstret. Arkivet är
  // yngre än sju dygn (minutkrisen, gallringen), och ett nominellt fönster blåser upp
  // nämnaren och trycker ner täckningsgraden — ett tal som då råkar likna 0f:s 8,3 % utan
  // att mäta samma sak. En falsk bekräftelse är värre än inget tal.
  const tack = (await q(`SELECT (SELECT count(*)::int FROM rdtim) AS radartimmar,
      (SELECT count(DISTINCT segment_id) FROM rdtim)
        * (SELECT count(DISTINCT h) FROM rdtim_spann) AS mojliga`))[0];
  console.log(`  Radarn har en åsikt om ${tack.radartimmar} av ${tack.mojliga} möjliga segmenttimmar`
    + ` (${pct(Number(tack.radartimmar), Number(tack.mojliga))}) — resten är OSAMPLAT, inte torrt.`);
  console.log(`  Vid r ≥ ${r} och stationsregn ${m === 0 ? "> 0" : `≥ ${m}`}, ${n} jämförbara segmenttimmar:`);
  console.log(`    båda blöta          ${String(rad.bada).padStart(7)}`);
  console.log(`    bara radarn blöt    ${String(rad.bara_radar).padStart(7)}`);
  console.log(`    bara stationen blöt ${String(rad.bara_station).padStart(7)}`);
  console.log(`    båda torra          ${String(rad.ingen).padStart(7)}`);
  if (n < MIN_JAMFORELSER) {
    console.log(`  ⊘ OAVGJORT — färre än ${MIN_JAMFORELSER} jämförelser. Ett tal här vore falsk precision.`);
  } else {
    const ense = Number(rad.bada) + Number(rad.ingen);
    const vat = Number(rad.bada) + Number(rad.bara_radar) + Number(rad.bara_station);
    console.log(`  ENSE i ${pct(ense, n)} av timmarna. Men torrt möter torrt i de flesta, så det talet`);
    console.log(`  är uppblåst av tystnad: räknat BARA på timmar där någon såg regn (${vat} st) är`);
    console.log(`  överlappet ${pct(Number(rad.bada), vat)} — det är det tal som betyder något.`);
  }
});

// ── 2d SKATTNINGEN över svepet.
await avsnitt("2d SKATTNINGEN", async () => {
  console.log("\n2d SKATTNINGEN — blöt / torr / okänt över svepet N × r (stationsregn > 0)");
  console.log(`  Underlagsvakt: under ${MIN_SEGMENTTIMMAR} segmenttimmar skrivs OAVGJORT.`);
  console.log("  N \\ r       " + R_SVEP.map((r) => `r ≥ ${String(r).padEnd(3)}`.padStart(22)).join(""));
  for (const N of N_SVEP) {
    const celler: string[] = [];
    for (const r of R_SVEP) {
      const rad = (await q(`
        WITH grund AS (
          SELECT p.segment_id, s.h,
            EXISTS (SELECT 1 FROM sttim x WHERE x.station_id = p.station_id
                      AND x.mm > 0 AND x.h > s.h - $1 * interval '1 hour' AND x.h <= s.h) AS st_vat,
            EXISTS (SELECT 1 FROM rdtim d WHERE d.segment_id = p.segment_id
                      AND d.mmh >= $2 AND d.h > s.h - $1 * interval '1 hour' AND d.h <= s.h) AS rd_vat
          FROM par p JOIN sttim s ON s.station_id = p.station_id
          WHERE p.km <= $3)
        SELECT count(*)::int AS timmar,
          count(*) FILTER (WHERE st_vat OR rd_vat)::int AS blot FROM grund`, [N, r, MAX_KM]))[0];
      const t = Number(rad.timmar);
      celler.push(t < MIN_SEGMENTTIMMAR ? "OAVGJORT".padStart(22)
        : `${pct(Number(rad.blot), t)} blöt av ${t}`.padStart(22));
    }
    console.log(`  N = ${N} h   ` + celler.join(""));
  }
  console.log("  Ingen punkt är vald här. Dokumentets §4-golv väljer N, inte den här tabellen (§2.2).");
  console.log("  ⚠️ 'torr' i tabellen betyder ALLTID stationstäckt torr. Segmenttimmar utan mätning");
  console.log("     räknas inte som torra — de finns inte i nämnaren alls.");
  const diet = (await q(`SELECT (SELECT count(*)::int FROM sttim) AS sparade,
      (SELECT count(DISTINCT station_id) FROM sttim)
        * (SELECT count(DISTINCT h) FROM rdtim_spann) AS mojliga`))[0];
  console.log(`  🚨 OCH DEN VIKTIGASTE RESERVATIONEN: nämnaren är ARKIVDIETENS urval, inte tiden.`);
  console.log(`     ${diet.sparade} av ${diet.mojliga} möjliga stationstimmar sparades`
    + ` (${pct(Number(diet.sparade), Number(diet.mojliga))}), och dieten (#4) sparar rader just`);
  console.log(`     vid NEDERBÖRD, låg yta eller snabb ytrörelse. Andelen blöt ovan är därför`);
  console.log(`     kraftigt uppblåst och säger INTE hur ofta svensk väg är blöt. Tabellen duger`);
  console.log(`     till att jämföra N och r MOT VARANDRA — inget annat.`);
});


// ── 2f RADARNS BIDRAG MOT AVSTÅNDET (Bengts order 13/9, efter 2c:s utfall).
//
// FRÅGAN: 2c visade att radarn bidrar med 97 timmar av 5 955 i unionen. Men den mätningen gjordes
// på segment som i median har en station 6,7 km bort — alltså där radarn behövs MINST. Frågan är
// om bidraget växer med avståndet.
//
// HYPOTESEN, SKRIVEN FÖRE SVARET: stationens regn är ett punktvärde. Ju längre bort stationen
// sitter desto sämre representerar den segmentet, och desto mer borde radarn lägga till. Är
// bidraget i stället oberoende av avståndet är radarn begränsad av sin EGEN sampling (13,1 % av
// segmenttimmarna) och inte av geografin — och då hjälper ingen glesbygd.
//
// VAD MÅTTET INTE KAN: det visar OENIGHET, inte vem som har rätt. Det finns ingen tredje källa.
// Därför räknas båda riktningarna per band. Växer BARA "bara radarn" är det asymmetriskt och talar
// för att radarn ser något verkligt. Växer BÅDA riktningarna är det stationens representativitet
// som vittrar, och då säger talet ingenting om radarns kvalitet.
//
// BANDEN ÄR VALDA FÖRE MÄTNINGEN, ur 2a:s egen fördelning: median 6,7 km, p90 15,2 km, värst 48,5.
const AVSTANDSBAND: [string, number, number][] = [
  ["0–5 km", 0, 5], ["5–10 km", 5, 10], ["10–20 km", 10, 20], ["20–50 km", 20, 50],
];

await avsnitt("2f RADARNS BIDRAG MOT AVSTÅNDET", async () => {
  console.log("\n2f RADARNS BIDRAG MOT AVSTÅNDET — behövs segmentupplösningen där stationen är långt bort?");
  console.log("  HYPOTES (skriven före svaret): bidraget växer med avståndet, eftersom stationens");
  console.log("  punktvärde representerar segmentet allt sämre. Är det platt är radarn begränsad av");
  console.log("  sin egen sampling, inte av geografin.");
  console.log("  Måttet visar OENIGHET, inte vem som har rätt — ingen tredje källa finns.");
  console.log("\n  RADARNS UNIKA BIDRAG (andel av 'någon såg regn'-timmar där BARA radarn såg det)");
  console.log("  band          segment" + R_SVEP.map((r) => `r ≥ ${r}`.padStart(12)).join(""));
  for (const [namn, lo, hi] of AVSTANDSBAND) {
    const celler: string[] = [];
    let segment = 0;
    for (const r of R_SVEP) {
      const x = (await q(`
        WITH grund AS (
          SELECT p.segment_id, (s.mm > 0) AS st_vat, (d.mmh >= $1) AS rd_vat
          FROM par p JOIN sttim s ON s.station_id = p.station_id
                     JOIN rdtim d ON d.segment_id = p.segment_id AND d.h = s.h
          WHERE p.km >= $2 AND p.km < $3)
        SELECT count(*)::int AS n, count(DISTINCT segment_id)::int AS segment,
          count(*) FILTER (WHERE rd_vat AND st_vat)::int AS bada,
          count(*) FILTER (WHERE rd_vat AND NOT st_vat)::int AS bara_radar,
          count(*) FILTER (WHERE NOT rd_vat AND st_vat)::int AS bara_station
        FROM grund`, [r, lo, hi]))[0];
      segment = Number(x.segment);
      const vat = Number(x.bada) + Number(x.bara_radar) + Number(x.bara_station);
      celler.push(Number(x.n) < MIN_JAMFORELSER || !vat ? "OAVGJORT".padStart(12)
        : pct(Number(x.bara_radar), vat).padStart(12));
    }
    console.log(`  ${namn.padEnd(12)} ${String(segment).padStart(7)}` + celler.join(""));
  }
  console.log("\n  BÅDA RIKTNINGARNA vid r ≥ " + R_SVEP[1] + " — växer bara den ena eller båda?");
  console.log("  band          jämförelser   båda   bara radarn   bara stationen   oenighet");
  for (const [namn, lo, hi] of AVSTANDSBAND) {
    const x = (await q(`
      WITH grund AS (
        SELECT (s.mm > 0) AS st_vat, (d.mmh >= $1) AS rd_vat
        FROM par p JOIN sttim s ON s.station_id = p.station_id
                   JOIN rdtim d ON d.segment_id = p.segment_id AND d.h = s.h
        WHERE p.km >= $2 AND p.km < $3)
      SELECT count(*)::int AS n,
        count(*) FILTER (WHERE rd_vat AND st_vat)::int AS bada,
        count(*) FILTER (WHERE rd_vat AND NOT st_vat)::int AS bara_radar,
        count(*) FILTER (WHERE NOT rd_vat AND st_vat)::int AS bara_station
      FROM grund`, [R_SVEP[1], lo, hi]))[0];
    const n = Number(x.n);
    if (n < MIN_JAMFORELSER) { console.log(`  ${namn.padEnd(12)} ${String(n).padStart(11)}   ⊘ OAVGJORT`); continue; }
    const vat = Number(x.bada) + Number(x.bara_radar) + Number(x.bara_station);
    console.log(`  ${namn.padEnd(12)} ${String(n).padStart(11)} ${String(x.bada).padStart(6)}`
      + ` ${String(x.bara_radar).padStart(13)} ${String(x.bara_station).padStart(16)}`
      + ` ${pct(Number(x.bara_radar) + Number(x.bara_station), vat).padStart(10)}`);
  }
  console.log("  Oenighet = andelen av de våta timmarna där källorna INTE är ense.");
});

// ── 2e OPERATÖRSFACIT.
await avsnitt("2e OPERATÖRSFACIT", async () => {
  const o = (await q(`SELECT count(*)::int AS rader,
      count(*) FILTER (WHERE 'Våt' = ANY(condition_info) OR 'fläckvis Våt' = ANY(condition_info))::int AS vata,
      max(modified_time) FILTER (WHERE 'Våt' = ANY(condition_info) OR 'fläckvis Våt' = ANY(condition_info)) AS sista_vata,
      max(modified_time) AS sista,
      (SELECT count(*)::int FROM (SELECT segment_id FROM road_condition_history GROUP BY 1 HAVING count(*) > 1) t) AS segment_med_byte
    FROM road_condition_history`))[0];
  const rpstart = (await q("SELECT min(observed_at) AS forst FROM radar_precip"))[0];
  console.log("\n2e OPERATÖRSFACIT — grinden dokumentet satte för det här steget");
  console.log(`  road_condition_history: ${o.rader} rader, senaste omklassning ${String(o.sista).slice(0, 10)}`);
  console.log(`  därav blöta: ${o.vata} rader, den sista ${String(o.sista_vata).slice(0, 10)}`);
  console.log(`  segment som någonsin bytt klass: ${o.segment_med_byte}`);
  console.log(`  radar_precip börjar: ${String(rpstart.forst).slice(0, 10)}`);
  console.log(`  ⊘ INGEN DOM — och orsaken är mätt, inte antagen: fönstren ÖVERLAPPAR INTE.`);
  console.log(`  Operatörens sista blöta klassning ligger före radarns första rad, så det finns`);
  console.log(`  noll segmenttimmar där båda har en åsikt. Grinden kan inte dömas förrän operatören`);
  console.log(`  klassar om vägar igen — alltså i vinter — och den spärrar därför steg 3, inte steg 2.`);
});

console.log("\nVAD DET HÄR INTE ÄR");
console.log("  Ingen dom. Skattaren är byggd och mätt, inte godkänd: dess grind (2e) står öppen.");
console.log("  Ingen regel läser den, ingen röst rörs, ingen kolumn skrivs. Nästa steg är steg 3,");
console.log("  och det väntar på operatörens klasser OCH på frosten — i den ordningen om vintern");
console.log("  ger oss båda, i omvänd ordning om den bara ger frost.");

await pool.end();
