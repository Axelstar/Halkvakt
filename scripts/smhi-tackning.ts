// SMHI-TÄCKNINGEN (kort #95, systemanalysens §2.8, Verify 1) — och T-A:s blockerare.
//
// VARFÖR DEN BLEV BRÅDSKANDE. Grind T-A:s fysikkontroll (TROSKLAR-TRENDEN §4) kräver att träffarna
// ska vara "vanligast klara nätter". Molnmängd finns inte i vårt arkiv, så den halvan av kontrollen
// gick inte att köra vid T-A:s första körning 12/9 (DECISIONS #113). Därmed är §2.8 inte längre en
// förstärkare som kan vänta — den är en BLOCKERARE för #88:s dom.
//
// OCH DET ÄR BILLIGARE ÄN §2.8 ANTOG. SMHI metobs parameter 16 (total molnmängd, timvärde) har
// perioden `latest-months` som sträcker sig 130 dygn bakåt (mätt 12/9), plus `corrected-archive`
// därutöver. Molnet kan alltså hämtas I EFTERHAND när T-A körs — ingen arkivering, ingen ny tabell,
// ingen lagringskostnad. §2.8:s tal "+25 MB/mån om SMHI går från prov till ankare" gäller
// ankarrollen, inte den här.
//
// MEN: bara 108 av 459 SMHI-stationer rapporterar total molnmängd. Frågan den här mätningen svarar
// på är därför den enda som betyder något: HUR LÅNGT är det från våra mätpunkter till närmaste
// molnobservation? Är svaret "för långt" kan klarhetsdelen av T-A inte köras, och det ska stå i
// TROSKLAR-TRENDEN i stället för att upptäckas i november.
//
// TVÅ PARAMETRAR, TVÅ OLIKA FRÅGOR — och de ska inte förväxlas (rättat 12/9, DECISIONS #118):
//   DEL 1, parameter 16 (moln): representativitetsradien — hur långt får en VViS-yta sträckas ut,
//     och går T-A:s klarhetskontroll att köra? Molnet är storskaligt, så 50 km är ett rimligt band.
//   DEL 2, parameter 1 (lufttemperatur): §2.8:s EGEN Verify 1, ordagrant "hur många av de 818
//     segmenten får en SMHI-station inom 15 km". Det är RESERVFRÅGAN — vad vi har kvar om
//     Trafikverkets WeatherMeasurepoint tystnar. Den besvarades inte av molnkörningen 12/9:
//     molnets 108 stationer är en annan population än luftens, och 50 km en annan fråga än 15.
//
// Läser SMHI:s öppna API (CC BY 4.0, källa anges) och vårt arkiv. Skriver ingenting.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/smhi-tackning.ts
// Självtest utan nät/DB: scripts/smhi-tackning.ts --sjalvtest

const PARAM_MOLN = 16;   // Total molnmängd, momentanvärde, 1 gång/tim
const PARAM_LUFT = 1;    // Lufttemperatur, momentanvärde, 1 gång/tim — reservfrågans parameter
export const BAND: [string, number][] = [["≤ 15 km", 15], ["≤ 30 km", 30], ["≤ 50 km", 50], ["≤ 100 km", 100]];

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (lat2 - lat1) * d2r, dLo = (lon2 - lon1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 +
    Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Punkt = { lon: number; lat: number };

/** Avstånd till närmaste punkt i listan. Infinity om listan är tom — aldrig 0, aldrig null. */
export function narmast(p: Punkt, kandidater: Punkt[]): number {
  let b = Infinity;
  for (const k of kandidater) {
    const d = haversineKm(p.lon, p.lat, k.lon, k.lat);
    if (d < b) b = d;
  }
  return b;
}

export function fordela(avstand: number[]): { band: string; n: number; andel: number }[] {
  return BAND.map(([namn, km]) => {
    const n = avstand.filter((d) => d <= km).length;
    return { band: namn, n, andel: avstand.length ? n / avstand.length : 0 };
  });
}

export function percentil(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

const pct = (x: number) => `${(100 * x).toFixed(0)} %`;

// ── Självtest med känd sanning, utan nät och utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — avstånd, närmaste och fördelning mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // En breddgrad är ~111 km. Kollas mot känd geografi, inte mot sig själv.
  k("en breddgrad ≈ 111 km", Math.round(haversineKm(15, 60, 15, 61)), 111);
  k("samma punkt = 0", haversineKm(15, 60, 15, 60), 0);
  // Stockholm–Göteborg är ~400 km fågelvägen.
  const sthlmGbg = Math.round(haversineKm(18.07, 59.33, 11.97, 57.71));
  k("Stockholm–Göteborg 390–410 km", sthlmGbg > 390 && sthlmGbg < 410, true);
  // Närmaste ska välja rätt kandidat, inte första.
  k("närmast väljer rätt", Math.round(narmast({ lon: 15, lat: 60 },
    [{ lon: 15, lat: 62 }, { lon: 15, lat: 60.5 }, { lon: 15, lat: 63 }])), 56);
  k("närmast utan kandidater = Infinity", narmast({ lon: 15, lat: 60 }, []), Infinity);
  // Fördelningen är kumulativ: ett avstånd på 10 km räknas i ALLA band.
  const f = fordela([10, 20, 40, 80, 200]);
  k("≤ 15 km", f[0].n, 1);
  k("≤ 30 km", f[1].n, 2);
  k("≤ 50 km", f[2].n, 3);
  k("≤ 100 km", f[3].n, 4);
  k("200 km ligger utanför alla band", f[3].n < 5, true);
  k("percentil p50", percentil([10, 20, 40, 80, 200], 0.5), 40);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: avståndet stämmer mot känd geografi, banden är kumulativa.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

console.log(`SMHI-täckningen (kort #95) — hur långt är det till närmaste molnobservation?\n`);

// 1. SMHI:s stationer, för båda parametrarna.
async function stationer(param: number): Promise<{ punkter: Punkt[]; titel: string; iRegistret: number }> {
  const r = await fetch(`https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/${param}.json`,
    { headers: { "User-Agent": "Halkvakt/1.0 (oppna data, CC BY 4.0)" } });
  if (!r.ok) { console.error(`SMHI svarade ${r.status} för parameter ${param}`); await pool.end(); process.exit(1); }
  const j = await r.json() as any;
  const alla = (j.station ?? []) as any[];
  return {
    punkter: alla.filter((s) => s.active && s.longitude != null && s.latitude != null)
      .map((s) => ({ lon: Number(s.longitude), lat: Number(s.latitude) })),
    titel: j.title ?? `parameter ${param}`,
    iRegistret: alla.length,
  };
}

const moln = await stationer(PARAM_MOLN);
const luft = await stationer(PARAM_LUFT);
console.log(`SMHI parameter ${PARAM_MOLN} (${moln.titel}): ${moln.punkter.length} AKTIVA stationer med position, av ${moln.iRegistret} i registret`);
console.log(`SMHI parameter ${PARAM_LUFT} (${luft.titel}): ${luft.punkter.length} AKTIVA stationer med position, av ${luft.iRegistret} i registret`);
console.log(`  Perioden latest-months räcker 130 dygn bakåt (mätt 12/9), corrected-archive därutöver`);
console.log(`  ⇒ båda kan hämtas I EFTERHAND vid körning; ingen arkivering behövs.\n`);

for (const [namn, s] of [["moln", moln], ["lufttemperatur", luft]] as [string, typeof moln][]) {
  if (s.punkter.length < 20) {
    console.error(`UNDERLAGSVAKT: ${s.punkter.length} ${namn}stationer är för få för att svara på något. Avbryter.`);
    await pool.end(); process.exit(1);
  }
}

// 2. Våra mätpunkter: VViS-stationerna (T-A:s fråga) och vägsegmenten (§2.8:s Verify 1).
const vvis = (await pool.query(`SELECT DISTINCT ON (station_id) station_id,
    ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM weather_observations WHERE sample_time > now() - interval '14 days'
  ORDER BY station_id, sample_time DESC`)).rows as any[];
const seg = (await pool.query(`SELECT segment_id, ST_X(ST_LineInterpolatePoint(geom, 0.5)) AS lon,
    ST_Y(ST_LineInterpolatePoint(geom, 0.5)) AS lat
  FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`)).rows as any[];

function rad(punkter: any[], kandidater: Punkt[]): number[] {
  return punkter.map((p) => narmast({ lon: Number(p.lon), lat: Number(p.lat) }, kandidater))
    .filter((d) => Number.isFinite(d));
}

function skriv(rubrik: string, varfor: string, avst: number[], antal: number) {
  console.log(rubrik);
  console.log(`  ${varfor}`);
  console.log(`  ${antal} punkter · median ${percentil(avst, 0.5)?.toFixed(0)} km · ` +
    `tre fjärdedelar ${percentil(avst, 0.75)?.toFixed(0)} km · nio av tio ${percentil(avst, 0.9)?.toFixed(0)} km · värst ${Math.max(...avst).toFixed(0)} km`);
  for (const b of fordela(avst)) {
    console.log(`    ${b.band.padEnd(10)} ${String(b.n).padStart(6)} (${pct(b.andel)})`);
  }
  console.log("");
}

console.log(`══ DEL 1: MOLNET (parameter ${PARAM_MOLN}) — representativitetsradien och T-A:s fysikkontroll\n`);
skriv("1. VViS-STATIONERNA — avgör om T-A:s fysikkontroll går att köra",
  "Varje frostnatt mäts vid en VViS-station. Utan moln inom rimligt avstånd kan natten inte\n  klassas som klar eller mulen, och klarhetsdelen av T-A:s fysikkontroll faller.",
  rad(vvis, moln.punkter), vvis.length);
skriv("2. VÄGSEGMENTEN — representativitetsradien över vägnätet",
  "Radien ska gälla en STRÄCKA, inte en station: hur stor del av vägnätet har en\n  molnobservation inom räckhåll.",
  rad(seg, moln.punkter), seg.length);

// §2.8:s egen Verify 1, ordagrant: "hur många av de 818 segmenten får en SMHI-station inom 15 km".
// Den frågan gäller RESERVEN — en modellerad yta ur luft + daggpunkt när Trafikverket tystnar — och
// därför lufttemperaturens stationer (parameter 1), inte molnets 108. Molnet svarade på en ANNAN
// fråga (representativitetsradien) och lämnade den här obesvarad fram till 12/9.
console.log(`══ DEL 2: LUFTTEMPERATUREN (parameter ${PARAM_LUFT}) — §2.8:s Verify 1, reservfrågan\n`);
const avstSegLuft = rad(seg, luft.punkter);
skriv("3. VÄGSEGMENTEN mot närmaste SMHI-luftstation — VERIFY 1",
  "Faller Trafikverkets WeatherMeasurepoint bort är SMHI:s luftstationer allt vi har. Reserven\n  är en MODELL (yta ur luft + daggpunkt + moln), aldrig en mätning — och en modell som ska\n  gälla ett segment kräver en station nära nog. §2.8 satte frågan vid 15 km.",
  avstSegLuft, seg.length);
skriv("4. VViS-STATIONERNA mot närmaste SMHI-luftstation — överföringsfunktionens underlag",
  "Luft→yta-överföringen ska läras per station. Det kräver ett par: en VViS-station med uppmätt\n  yta och en SMHI-station med luft, nära nog att paret betyder något.",
  rad(vvis, luft.punkter), vvis.length);

const inom15 = fordela(avstSegLuft)[0];
console.log(`VERIFY 1 — SVARET: ${inom15.n} av ${seg.length} segment (${pct(inom15.andel)}) har en`);
console.log(`  SMHI-luftstation inom 15 km. Det är täckningstabellen §2.8 begärde.`);
console.log(`  ⚠️  TÄCKNING ÄR INTE DUGLIGHET. Att en station finns inom 15 km säger ingenting om hur`);
console.log(`     väl dess lufttemperatur följer VViS-ytan vintertid — det är Verify 2, och den är`);
console.log(`     inte körd. Ett högt tal här är ett villkor för reserven, aldrig ett kvitto på den.\n`);

console.log(`LÄSNINGEN — varför 15 km och 50 km inte är samma sorts tal`);
console.log(`  Molnet är en STORSKALIG storhet. Ett molntäcke sträcker sig tiotals mil, till skillnad`);
console.log(`  från yttemperaturen som varierar mellan dalgång och krön. Att sträcka en molnobservation`);
console.log(`  50 km är därför en helt annan sak än att sträcka en lufttemperatur 15 km — men HUR långt`);
console.log(`  någon av dem FÅR sträckas är inte mätt här, bara hur långt de MÅSTE sträckas.`);
console.log(`  Nästa steg för molnet: T-A med molnet inhämtat (gjort 12/9). För luften: Verify 2,`);
console.log(`  korrelationen luft→yta på en kall vecka. Den mätningen avgör reserven, inte den här.`);
console.log(`\n  Källa: SMHI öppna data (CC BY 4.0), metobs parameter ${PARAM_MOLN} och ${PARAM_LUFT}.`);
await pool.end();
