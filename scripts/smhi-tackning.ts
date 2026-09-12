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
// Två frågor, samma räkning, olika indata:
//   1. VViS-stationerna — avgör om T-A:s fysikkontroll går att köra (och för hur stor del av landet)
//   2. Vägsegmenten — §2.8:s egen Verify 1, avgör om molnet kan bära en representativitetsradie
//
// Läser SMHI:s öppna API (CC BY 4.0, källa anges) och vårt arkiv. Skriver ingenting.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/smhi-tackning.ts
// Självtest utan nät/DB: scripts/smhi-tackning.ts --sjalvtest

const PARAM_MOLN = 16;   // Total molnmängd, momentanvärde, 1 gång/tim
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

// 1. SMHI:s molnstationer.
const r = await fetch(`https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/${PARAM_MOLN}.json`,
  { headers: { "User-Agent": "Halkvakt/1.0 (oppna data, CC BY 4.0)" } });
if (!r.ok) { console.error(`SMHI svarade ${r.status}`); await pool.end(); process.exit(1); }
const smhi = await r.json() as any;
const alla = (smhi.station ?? []) as any[];
const moln: Punkt[] = alla.filter((s) => s.active && s.longitude != null && s.latitude != null)
  .map((s) => ({ lon: Number(s.longitude), lat: Number(s.latitude) }));
console.log(`SMHI parameter ${PARAM_MOLN} (${smhi.title ?? "total molnmängd"}):`);
console.log(`  ${moln.length} AKTIVA stationer med position, av ${alla.length} i registret`);
console.log(`  Perioden latest-months räcker 130 dygn bakåt (mätt 12/9), corrected-archive därutöver`);
console.log(`  ⇒ molnet kan hämtas I EFTERHAND vid körning; ingen arkivering behövs.\n`);

if (moln.length < 20) {
  console.error(`UNDERLAGSVAKT: ${moln.length} molnstationer är för få för att svara på något. Avbryter.`);
  await pool.end(); process.exit(1);
}

// 2. Våra mätpunkter: VViS-stationerna (T-A:s fråga) och vägsegmenten (§2.8:s Verify 1).
const vvis = (await pool.query(`SELECT DISTINCT ON (station_id) station_id,
    ST_X(geom) AS lon, ST_Y(geom) AS lat
  FROM weather_observations WHERE sample_time > now() - interval '14 days'
  ORDER BY station_id, sample_time DESC`)).rows as any[];
const seg = (await pool.query(`SELECT segment_id, ST_X(ST_LineInterpolatePoint(geom, 0.5)) AS lon,
    ST_Y(ST_LineInterpolatePoint(geom, 0.5)) AS lat
  FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`)).rows as any[];

for (const [rubrik, punkter, varfor] of [
  ["1. VViS-STATIONERNA — avgör om T-A:s fysikkontroll går att köra", vvis,
   "Varje frostnatt mäts vid en VViS-station. Utan moln inom rimligt avstånd kan natten inte\n  klassas som klar eller mulen, och klarhetsdelen av T-A:s fysikkontroll faller."],
  ["2. VÄGSEGMENTEN — §2.8:s egen Verify 1", seg,
   "Representativitetsradien ska gälla en STRÄCKA, inte en station. Det här är talet §2.8 frågade\n  efter: hur stor del av vägnätet har en molnobservation inom räckhåll."],
] as [string, any[], string][]) {
  console.log(`${rubrik}`);
  console.log(`  ${varfor}`);
  const avst = punkter.map((p) => narmast({ lon: Number(p.lon), lat: Number(p.lat) }, moln))
    .filter((d) => Number.isFinite(d));
  console.log(`  ${punkter.length} punkter · median ${percentil(avst, 0.5)?.toFixed(0)} km · ` +
    `tre fjärdedelar ${percentil(avst, 0.75)?.toFixed(0)} km · nio av tio ${percentil(avst, 0.9)?.toFixed(0)} km · värst ${Math.max(...avst).toFixed(0)} km`);
  for (const b of fordela(avst)) {
    console.log(`    ${b.band.padEnd(10)} ${String(b.n).padStart(6)} (${pct(b.andel)})`);
  }
  console.log("");
}

console.log(`LÄSNINGEN — vad talen betyder för T-A`);
console.log(`  Molnet är en STORSKALIG storhet. Ett molntäcke sträcker sig tiotals mil, till skillnad`);
console.log(`  från yttemperaturen som varierar mellan dalgång och krön. Att sträcka en molnobservation`);
console.log(`  50 km är därför en helt annan sak än att sträcka en yttemperatur 50 km — men HUR långt`);
console.log(`  den får sträckas är inte mätt här, bara hur långt den MÅSTE sträckas.`);
console.log(`  Nästa steg, om täckningen räcker: kör T-A igen med molnet inhämtat och se om träffarna`);
console.log(`  faktiskt är vanligare klara nätter. Det är den mätningen som avgör, inte den här.`);
console.log(`\n  Källa: SMHI öppna data (CC BY 4.0), metobs parameter ${PARAM_MOLN}.`);
await pool.end();
