// VÄRDEVAKTEN — besiktar varje numeriskt fält i arkivet (Bengts order 12/9, DECISIONS #133).
//
// VARFÖR DEN FINNS. På ett dygn visade sig nio antaganden vara fel eller datan smutsig, och fyra
// av dem var samma defekt: **ett fält vars värden innehåller koder som är typgiltiga men fysiskt
// omöjliga.**
//
//   byvind 85,5 m/s     — trasig givare (Sveriges rekord ≈ 81, och då på fjällstation)
//   sikt 20 000 m       — SENTINEL ("minst 20 km") i hälften av raderna, inte en mätning
//   molnmängd 113 %     — SMHI:s KOD för himlen skymd, fysikaliskt motsatsen till klar natt
//   precipitation "no"  — sträng som betyder torrt; Boolean() av den var en falsklarmsmaskin
//
// Och två äldre av samma sort: SeverityCode 3 som aldrig funnits, och Camera.Bearing som pekar
// åt MOTSATT håll mot den kurs den bevakar.
//
// **INTE ETT ENDA AV DEM HITTADES AV EN VAKT.** Alla nio hittades av att en människa läste en
// utskrift, och varje vakt vi har — #75, DRY-listan, G_tak — skrevs EFTER att samma sorts defekt
// bitit oss. Det här skriptet är den systematiska kontroll som saknades.
//
// TRE KONTROLLER, och den tredje är den som gör den till en grind:
//
//   1. SPANNET   — ligger min/max inom det fysiskt rimliga? (85,5 m/s hade fastnat här)
//   2. DOMINANS  — tar ett enda värde en orimlig andel i ett fält med många distinkta värden?
//                  Det är sentinelns signatur. (20 000 m tog halva siktmaterialet)
//   3. DEKLARATIONEN — **ett fält utan deklarerat spann rapporteras som OBESIKTIGAT.**
//
// Punkt 3 är avsiktligt obekväm. Ett nytt fält dyker upp som obesiktigat den dag det finns i
// arkivet, och står så tills någon skriver ned vad det får innehålla. Det är billigare att
// deklarera ett spann än att upptäcka en sentinel i en tröskel.
//
// HUSREGELN (CLAUDE.md): ett fält får inte bära en mätning, en tröskel eller en varning förrän
// det passerat värdevakten.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/vardevakten.ts [dagar=30]
// Självtest utan DB: scripts/vardevakten.ts --sjalvtest

const MIN_RADER = 100;        // under detta får fältet ingen dom, bara ett tal
// DOMINANSEN SKÄRPT efter första körningen (DECISIONS #134). Första regeln var "ett värde över
// 5 % i ett fält med många distinkta" — den flaggade `rain_sum_mm` (0 i 58 %), `snow_wateq_mm`
// (0 i 99,9 %) och `wind_speed_ms` (0,5 i 6,8 %), alla fullkomligt legitima. Noll nederbörd i
// september ÄR det vanligaste värdet; det är inte en sentinel, det är väder.
//
// Den verkliga signaturen är smalare: **en sentinel ligger vid TAKET och tar en stor andel.**
// 20 000 m sikt är maxvärdet och tar halva materialet. 113 % molnmängd ligger över taket. Ett
// dominerande MINIMUM är däremot nästan alltid "ingenting hände". Ett sentinelvärde under golvet
// (−999 och liknande) fastnar på spannkontrollen i stället.
const DOMINANS = 0.20;        // en sentinel tar en STOR andel, inte bara en ovanligt stor
const MANGA_DISTINKTA = 50;   // under detta är fältet en kodlista, inte en mätning

/** Deklarerade spann. Fysikens gränser, inte driftens — en grind får vara strängare (t.ex.
 *  G_tak 30/40/50 i TROSKLAR-VIND-SIKT), men ingen får vara vidare. Ett fält som saknas här
 *  är OBESIKTIGAT och får inte bära en mätning. */
export const SPANN: Record<string, [number, number, string]> = {
  // Yttemperaturens spann är fysikens (Vuoggatjålme −52,6 °C i luften 1966; ytan går lägre en klar natt). De
  // −34…−50 °C som sju stationer rapporterade i SEPTEMBERLUFT (+9…+17 °C, anmälda till Trafikverket) ligger
  // INOM spannet och fångas inte här — de är omöjliga i RELATION till luften, och det är radvaktens sak
  // (publish/snapshot-core.ts RADVAKT_SQL, DECISIONS #298). Spannet vaktar värdet, radvakten paret (kort #267).
  surface_temp_c: [-60, 60, "°C"], air_temp_c: [-60, 60, "°C"], dewpoint_c: [-60, 60, "°C"],
  humidity_pct: [0, 100, "%"],
  wind_speed_ms: [0, 60, "m/s"], wind_gust_ms: [0, 60, "m/s"],
  visibility_m: [0, 20000, "m — 20 000 ÄR ETT TAK, inte en mätning"],
  rain_sum_mm: [0, 100, "mm/30 min"], snow_wateq_mm: [0, 100, "mm/30 min"],
  surface_grip: [0, 1, "friktion 0–1 ur ytstatusgivaren (Surface.Grip, DECISIONS #465) — NULL = ingen givare"],
  condition_code: [1, 4, "Trafikverkets väglagsklass"],
  // Vägdatalagret (kort #301, DECISIONS #473): NVDB ur öppna API:et, statiskt per plats i data/vagdata/. Spannen deklareras HÄR
  // innan någon mätning läser fälten; hämtaren importerar dem och fäller vid brott.
  klass: [0, 9, "funktionell vägklass 0 (riksväg) … 9"],
  bredd_m: [0, 60, "m vägbredd"],
  hastighet_kmh: [5, 130, "km/h högsta tillåtna"],
  adt_fordon: [0, 200000, "fordon per årsmedeldygn"],
  adt_lastbilar: [0, 50000, "tunga fordon per årsmedeldygn"],
  adt_latta_22_06: [0, 50000, "lätta fordon per årsmedeldygn kl. 22–06"],
  adt_matar: [1990, 2030, "mätår för ÅDT (ur Mätårsperiod ÅÅÅÅMM)"],
  // MET Nordic Analysis (MET Norway, 1 km, timvis; releasen kuvos-metnordic-2024-25, DECISIONS #480). Läst 7/10 över hela
  // vintern: luft −36,0…+18,1 °C, fukt 0,28–1, vind 0,01–21,5 m/s, moln 0–1, nederbörd 0–13,7 mm/h, långvåg 525 000–1 346 000
  // J/m² per timme, kortvåg −222…2 257 000 J/m² per timme. Kortvågens små negativa värden (30 541 timmar) är beräkningsbrus.
  t2m_c: [-50, 35, "°C lufttemperatur 2 m (MET Nordic)"],
  rh2m: [0, 1, "andel relativ fukt 2 m (MET Nordic)"],
  vind10_ms: [0, 60, "m/s medelvind 10 m (MET Nordic)"],
  moln: [0, 1, "andel molnmängd (MET Nordic)"],
  nederbord_mm: [0, 50, "mm nederbörd per timme (MET Nordic)"],
  langvag_jm2: [360000, 1800000, "J/m² inkommande långvåg per timme, 100–500 W/m² (MET Nordic)"],
  kortvag_jm2: [-1000, 4000000, "J/m² inkommande kortvåg per timme; ned till −1 000 rymmer beräkningsbruset (MET Nordic)"],
  // FYSIK (Axels fysikspår som fil; releasen kuvos-fysik-2024-25, DECISIONS #485). Läst 7/10 över hela vintern: −25,5…+17,4 °C.
  // Spannet är ytans, som surface_temp_c: en skattning utanför det är ett fel i filen, inte en kall natt.
  fysik_c: [-60, 60, "°C skattad yttemperatur (fysikspåret, kuvos-fysik-2024-25)"],
  severity_code: [1, 5, "TRV SeverityCode — 3 har aldrig förekommit"],
  // Radarns intensiteter. 200 mm/h är fysikens gräns för en 5-minutersskur; extrema
  // konvektiva celler når 150–200. HÖGRE ÄR EN RADARARTEFAKT, inte regn — och de här två
  // fälten bär hela vattenplaningsspåret sedan grind V-A föll (#104).
  rate_max_mmh: [0, 200, "mm/h"], rate_mean_mmh: [0, 200, "mm/h"],
  wind_dir_deg: [0, 360, "grader"],
  speed_limit_kmh: [0, 130, "km/h"], bearing: [0, 360, "grader — kameran TITTAR hit, kursen är +180"],
  n_hazards: [0, 10000, "st"], n_alerts: [0, 1000, "st"],
  county_no: [1, 25, "länskod"], area_id: [1, 1e12, "SMHI-id"], warning_id: [1, 1e12, "SMHI-id"],
  // Trendens kandidatarkiv (#88 steg 2, sql/017), besiktigat 15/9 som förkrav för S2/S3 i bedömning v3:
  // fälten bär redan `lutning` i live.json (N4, DECISIONS #188). Lutning = ytans fall per fönster,
  // POSITIVT när ytan faller; svepet går till 1,2 °C (publish/trenden.ts LUTNING). ±20 per fönster är
  // fysikens yttergräns — bortom det är ett givarhopp, som trendens egen vakt redan kastar mellan rader.
  lutning15_c: [-20, 20, "°C per 15 min"], lutning30_c: [-20, 20, "°C per 30 min"], lutning60_c: [-20, 20, "°C per 60 min"],
  dagg_gap_c: [-60, 60, "°C — yta minus daggpunkt"], min_yta_90min_c: [-60, 60, "°C"],
  utfall_rader: [0, 200, "st mätningar i utfallsfönstret — 0 är okänt, inte torrt"],
  // Telefonens egen GPS-fart (DECISIONS #461): bär stillaståendetiern (< 3) och självstoppets bilfart (snitt ≥ 12 över 60 s).
  // Inte en arkivkolumn — deklarerad här för att husregeln gäller trösklar i appen också. Negativ/saknad = OKÄND, aldrig stilla.
  fix_speed_kmh: [0, 300, "km/h — saknad fart är okänd, inte 0"],
};

/** Identifierare är inte mätvärden. De ska inte stå som obesiktigade — men de ska inte heller
 *  kunna bära en tröskel, så de får en egen kategori i stället för att tigas ihjäl. */
export const IDFALT = new Set(["id", "event_id", "area_id", "warning_id", "camera_id", "segment_id"]);

export type Falt = {
  tabell: string; kolumn: string; rader: number; nollor: number;
  min: number | null; max: number | null; distinkta: number;
  toppVarde: number | null; toppAndel: number;
};

export type Dom = { utfall: "OK" | "OBESIKTIGAT" | "UTANFÖR SPANN" | "SENTINEL?" | "ID" | "–"; varfor: string };

/** Domen för ett fält. Ordningen är avsiktlig: obesiktigat slår allt annat, för ett fält vi inte
 *  vet något om kan inte friskförklaras av att dess tal råkar se rimliga ut. */
export function doma(f: Falt): Dom {
  if (IDFALT.has(f.kolumn)) return { utfall: "ID", varfor: "identifierare — inte ett mätvärde, får inte bära en tröskel" };
  const s = SPANN[f.kolumn];
  if (!s) return { utfall: "OBESIKTIGAT", varfor: "inget deklarerat spann — får inte bära en mätning" };
  if (f.rader < MIN_RADER) return { utfall: "–", varfor: `${f.rader} rader, kräver ${MIN_RADER}` };
  const [lo, hi, enhet] = s;
  if (f.min !== null && f.min < lo) return { utfall: "UTANFÖR SPANN", varfor: `min ${f.min} < ${lo} ${enhet}` };
  if (f.max !== null && f.max > hi) return { utfall: "UTANFÖR SPANN", varfor: `max ${f.max} > ${hi} ${enhet}` };
  if (f.distinkta >= MANGA_DISTINKTA && f.toppAndel >= DOMINANS && f.toppVarde === f.max)
    return { utfall: "SENTINEL?", varfor: `TAKVÄRDET ${f.toppVarde} tar ${(100 * f.toppAndel).toFixed(1)} % av ${f.distinkta} distinkta` };
  return { utfall: "OK", varfor: `${f.min}…${f.max} ${enhet}` };
}

const ikon = (u: Dom["utfall"]) =>
  u === "OK" ? "✅" : u === "OBESIKTIGAT" ? "⊘" : u === "–" ? "·" : u === "ID" ? "🔖" : "⚠️";

// Körs filen själv, eller importeras SPANN av en annan vakt (vägdatalagrets hämtare, kort #301)? Importerad kör den varken
// självtest eller huvudvarv — spannen är det som delas.
const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
// ── Självtest: de fyra verkliga fallen från 12/9, plus ett obesiktigat fält.
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — värdevakten mot de fyra fall som faktiskt lurade oss\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const f = (kolumn: string, o: Partial<Falt> = {}): Falt => ({
    tabell: "t", kolumn, rader: 10000, nollor: 0, min: 0, max: 1, distinkta: 500,
    toppVarde: 0, toppAndel: 0.001, ...o });
  // 1. Byvinden 85,5 m/s — hade fastnat på spannet.
  k("byvind 85,5 m/s fälls", doma(f("wind_gust_ms", { min: 0, max: 85.5 })).utfall, "UTANFÖR SPANN");
  k("byvind 25 m/s passerar", doma(f("wind_gust_ms", { min: 0, max: 25 })).utfall, "OK");
  // 2. Sikten: 20 000 i halva materialet — dominansen fångar den även inom spannet.
  k("sikt 20 000 i 50 % fälls som sentinel",
    doma(f("visibility_m", { min: 8, max: 20000, distinkta: 4000, toppVarde: 20000, toppAndel: 0.5 })).utfall, "SENTINEL?");
  k("sikt utan dominans passerar",
    doma(f("visibility_m", { min: 8, max: 19000, distinkta: 4000, toppVarde: 12000, toppAndel: 0.01 })).utfall, "OK");
  // 3. Kodlistor ska INTE fällas för dominans — condition_code 1 är legitimt vanligast.
  k("väglagsklass 1 i 80 % är inte en sentinel",
    doma(f("condition_code", { min: 1, max: 4, distinkta: 4, toppVarde: 1, toppAndel: 0.8 })).utfall, "OK");
  k("väglagsklass 7 fälls på spannet",
    doma(f("condition_code", { min: 1, max: 7, distinkta: 5 })).utfall, "UTANFÖR SPANN");
  // 4. Molnmängden 113 % — utanför skalan, hade fastnat om fältet fanns i arkivet.
  k("molnliknande 113 mot 0–100 fälls", doma(f("humidity_pct", { min: 0, max: 113 })).utfall, "UTANFÖR SPANN");
  // 5. Det obekväma: ett nytt fält är OBESIKTIGAT tills någon deklarerar det.
  k("okänt fält är obesiktigat", doma(f("nytt_falt_2027")).utfall, "OBESIKTIGAT");
  k("obesiktigat slår även rimliga tal",
    doma(f("nytt_falt_2027", { min: 0, max: 1, distinkta: 2 })).utfall, "OBESIKTIGAT");
  // 6. DE FALSKA LARMEN FRÅN FÖRSTA KÖRNINGEN — noll nederbörd är väder, inte en sentinel.
  k("noll regn i 58 % är inte en sentinel",
    doma(f("rain_sum_mm", { min: 0, max: 24.2, distinkta: 123, toppVarde: 0, toppAndel: 0.583 })).utfall, "OK");
  k("noll snö i 99,9 % är inte en sentinel",
    doma(f("snow_wateq_mm", { min: 0, max: 1.05, distinkta: 68, toppVarde: 0, toppAndel: 0.999 })).utfall, "OK");
  k("vanlig låg vind i 7 % är inte en sentinel",
    doma(f("wind_speed_ms", { min: 0.1, max: 12.2, distinkta: 119, toppVarde: 0.5, toppAndel: 0.068 })).utfall, "OK");
  k("identifierare är inte obesiktigad", doma(f("event_id", { min: 1, max: 9e5 })).utfall, "ID");
  k("radarartefakt 727 mm/h fälls",
    doma(f("rate_max_mmh", { min: 0.1, max: 727.54, distinkta: 117 })).utfall, "UTANFÖR SPANN");
  // 6. Underlagsvakten.
  k("för få rader ger ingen dom", doma(f("wind_gust_ms", { rader: 99 })).utfall, "–");
  k("deklarationen täcker de fält motorn läser",
    ["surface_temp_c", "severity_code", "speed_limit_kmh", "bearing"].every((x) => x in SPANN), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: alla fyra fall som lurade oss 12/9 fastnar, kodlistor fälls inte");
  console.log("för dominans, och ett odeklarerat fält är obesiktigat även när talen ser rimliga ut.");
  process.exit(0);
}

if (korsSjalv) {
// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

// Tidskolumn per tabell, så stora tabeller kan fönstras. Speglar scripts/kallkollen.ts.
const TID: Record<string, string> = {
  weather_observations: "sample_time", weather_latest: "sample_time",
  road_conditions: "modified_time", road_condition_history: "modified_time",
  radar_precip: "observed_at", situation_archive: "last_seen", shadow_log: "run_at",
  polisen_events: "ingested_at", smhi_warnings: "published", smhi_warnings_history: "published",
  cameras: "modified_time", deviations: "start_time",
  // 15/9: tabellen saknades här, så dess fält skannades aldrig — inte ens som OBESIKTIGADE.
  trend_kandidater: "observed_at",
  // Kort #257: den stigande halvan, samma kolumner och spann — fött besiktigad, inte upptäckt i efterhand som trend_kandidater.
  trend_stigande: "observed_at",
};

console.log(`Värdevakten — besiktning av arkivets numeriska fält (${DAGAR} dygns fönster)\n`);

// Schemat läses UR DATABASEN, inte ur en lista här. Ett nytt fält är därmed med från dag ett.
const kolumner = await q(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND data_type IN ('numeric','integer','bigint','smallint','double precision','real')
    AND table_name = ANY($1::text[])
  ORDER BY table_name, ordinal_position`, [Object.keys(TID)]);
console.log(`Schemat ur databasen: ${kolumner.length} numeriska fält i ${new Set(kolumner.map((k) => k.table_name)).size} tabeller.`);
console.log(`Deklarerade spann: ${Object.keys(SPANN).length}.\n`);

const falt: { f: Falt; d: Dom }[] = [];
for (const { table_name: t, column_name: c } of kolumner) {
  const fonster = TID[t] ? `WHERE ${TID[t]} > now() - ${DAGAR} * interval '1 day'` : "";
  const g = (await q(`SELECT count(*)::bigint AS rader,
      count(*) FILTER (WHERE "${c}" IS NULL)::bigint AS nollor,
      min("${c}") AS mn, max("${c}") AS mx, count(DISTINCT "${c}")::bigint AS distinkta
    FROM "${t}" ${fonster}`))[0];
  const rader = Number(g.rader) - Number(g.nollor);
  let toppVarde: number | null = null, toppAndel = 0;
  if (rader > 0) {
    const topp = (await q(`SELECT "${c}" AS v, count(*)::bigint AS n FROM "${t}"
      ${fonster} ${fonster ? "AND" : "WHERE"} "${c}" IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 1`))[0];
    if (topp) { toppVarde = Number(topp.v); toppAndel = Number(topp.n) / rader; }
  }
  const f: Falt = { tabell: t, kolumn: c, rader, nollor: Number(g.nollor),
    min: g.mn === null ? null : Number(g.mn), max: g.mx === null ? null : Number(g.mx),
    distinkta: Number(g.distinkta), toppVarde, toppAndel };
  falt.push({ f, d: doma(f) });
}

let tabell = "";
for (const { f, d } of falt) {
  if (f.tabell !== tabell) { tabell = f.tabell; console.log(`\n${tabell}`); }
  console.log(`  ${ikon(d.utfall)} ${f.kolumn.padEnd(22)} ${String(f.rader).padStart(9)} rader · ` +
    `${f.min ?? "–"}…${f.max ?? "–"} · ${f.distinkta} distinkta` +
    (f.toppVarde !== null && f.toppAndel >= 0.05 ? ` · vanligast ${f.toppVarde} (${(100 * f.toppAndel).toFixed(0)} %)` : ""));
  if (d.utfall !== "OK") console.log(`     ${d.utfall}: ${d.varfor}`);
}

const rakna = (u: Dom["utfall"]) => falt.filter((x) => x.d.utfall === u).length;
console.log(`\nSAMMANFATTNING`);
console.log(`  ✅ ${rakna("OK")} besiktade och rimliga`);
console.log(`  ⚠️  ${rakna("UTANFÖR SPANN")} utanför deklarerat spann · ${rakna("SENTINEL?")} misstänkt sentinel`);
console.log(`  ⊘ ${rakna("OBESIKTIGAT")} OBESIKTIGADE — inget deklarerat spann`);
console.log(`  · ${rakna("–")} för tunt underlag för en dom`);

const hinder = falt.filter((x) => x.d.utfall === "OBESIKTIGAT" || x.d.utfall === "UTANFÖR SPANN" || x.d.utfall === "SENTINEL?");
if (hinder.length) {
  console.log(`\nFÄLT SOM INTE FÅR BÄRA EN MÄTNING, TRÖSKEL ELLER VARNING (husregeln i CLAUDE.md):`);
  for (const { f, d } of hinder) console.log(`  ${ikon(d.utfall)} ${f.tabell}.${f.kolumn} — ${d.varfor}`);
  console.log(`\n  Ett obesiktigat fält friskförklaras inte av att talen ser rimliga ut. Deklarera`);
  console.log(`  spannet i SPANN här ovan, eller låt bli att bygga på fältet.`);
} else {
  console.log(`\nAlla fält är besiktade och inom sina spann.`);
}
await pool.end();
}
