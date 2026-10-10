// Grind V-A (kort #42 steg 3; docs/TROSKLAR-VATTENPLANING.md §3, fastställd av Axel
// DECISIONS #68): BÄR PÅSTÅENDET "regn framöver" ALLS?
//
// Leave-one-out mot regnarkivet: för varje station och 30-min-bucket frågar vi
// grannarna — stationen själv aldrig med i sin egen prognos — och jämför med vad den
// faktiskt mätte. Samma metod och samma domspärr som grind A.
//
// REGNTRÖSKELN SÄTTS INTE HÄR, DEN FALLER UT: dokumentet lämnade mm/h-värdet osatt
// med flit, så skriptet sveper kandidattrösklar och redovisar V-A1/V-A2 för var och en.
// Den lägsta tröskel som klarar 70 % / 25 % inom 0–10 km är svaret mätningen ger.
//
// Trippeldelning i stället för tvådelning, för ärlighetens skull: när grannarna säger
// "över tröskel" kan stationen vara (a) också över — TRÄFF, (b) blöt men under —
// DELVIS, (c) helt torr — FALSKLARM. Att slå ihop (b) och (c) skulle blåsa upp
// falsklarmen; att slå ihop (a) och (b) skulle dölja dem.
//
// Run: DATABASE_URL=... node --experimental-strip-types publish/grind-v-a.ts [dagar=30]
// Självtest utan DB: publish/grind-v-a.ts --sjalvtest

const BUCKET_S = 1800;                        // stationernas egen 30-min-takt
const BAND: [string, number, number][] = [["0–10 km", 0, 10], ["10–15 km", 10, 15], [">15 km", 15, 50]];
const TROSKLAR = [0.5, 1, 2, 4, 6, 10];       // mm/h-kandidater som sveps
const V_A1 = 0.70, V_A2 = 0.25;               // fällda värden (Bengt #67, Axel #68)
const MIN_HANDELSER = 200, MIN_STATIONER = 20; // domspärr, samma anda som grind A

type Station = { id: string; lon: number; lat: number; mmh: Map<number, number> };
type Utfall = { traff: number; delvis: number; falsklarm: number };

function haversineKm(a: Station, b: Station): number {
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Kärnan: för en tröskel T, vad händer när grannarna i ett band säger "≥ T"?
function utvardera(stationer: Station[], T: number): Utfall[] {
  const per = BAND.map(() => ({ traff: 0, delvis: 0, falsklarm: 0 }));
  for (let i = 0; i < stationer.length; i++) {
    const mal = stationer[i];
    // Grannarna per band — målstationen är per konstruktion aldrig sin egen granne.
    const grannar: Station[][] = BAND.map(() => []);
    for (let j = 0; j < stationer.length; j++) {
      if (i === j) continue;
      const km = haversineKm(mal, stationer[j]);
      const bi = BAND.findIndex(([, lo, hi]) => km >= lo && km < hi);
      if (bi >= 0) grannar[bi].push(stationer[j]);
    }
    for (const [t, eget] of mal.mmh) {
      for (let bi = 0; bi < BAND.length; bi++) {
        // Grannarnas påstående: någon av dem mätte ≥ T i samma bucket.
        const sager = grannar[bi].some(g => (g.mmh.get(t) ?? -1) >= T);
        if (!sager) continue;
        if (eget >= T) per[bi].traff++;
        else if (eget > 0) per[bi].delvis++;
        else per[bi].falsklarm++;
      }
    }
  }
  return per;
}

// Binomialbruset (V-C3): en andel utan sitt brus är en gissning som låtsas vara en mätning.
// MARGINALVAKTEN 12/9 (DECISIONS #128): bruset räknades redan ut här och SKREVS UT — men domen
// fälldes ändå på punktskattningen. Nu avgör den. V-A:s stående nej berörs inte: 61 % mot kravets
// 70 % är nio procentenheters gap mot två i brus, alltså avgjort med bred marginal.
import { Z, andelSe, utfallGolv, utfallTak, grindutfall } from "./marginal.ts";
import { vaktdiagnos, saknadeDygn, skrivSaknade } from "./vaktdiagnos.ts";
const brus = (p: number, n: number) => n > 0 ? Z * andelSe(p, n) : NaN;

function rapport(stationer: Station[], label: string, domspärr: boolean) {
  console.log(`Grind V-A — bär påståendet "regn framöver"? (${label})`);
  console.log(`Leave-one-out: stationen aldrig med i sin egen prognos. Trippeldelning per`);
  console.log(`band när grannarna säger "≥ tröskel": TRÄFF (egen ≥ T) · DELVIS (0 < egen < T)`);
  console.log(`· FALSKLARM (egen = 0). Krav ur TROSKLAR-VATTENPLANING §3: V-A1 ≥ ${(100 * V_A1).toFixed(0)} %,`);
  console.log(`V-A2 ≤ ${(100 * V_A2).toFixed(0)} % — och de gäller BARA bandet 0–10 km (V-A3).\n`);
  let basta: number | null = null;
  for (const T of TROSKLAR) {
    const per = utvardera(stationer, T);
    console.log(`tröskel ${String(T).padStart(4)} mm/h`);
    for (let bi = 0; bi < BAND.length; bi++) {
      const u = per[bi], n = u.traff + u.delvis + u.falsklarm;
      if (!n) { console.log(`  ${BAND[bi][0].padEnd(9)} — inga fall`); continue; }
      const p1 = u.traff / n, p2 = u.falsklarm / n;
      // V-A1 har GOLV (träff ≥ 70 %), V-A2 har TAK (falsklarm ≤ 25 %). Marginalvakten på båda.
      const utf = grindutfall([utfallGolv(p1, V_A1, andelSe(p1, n)), utfallTak(p2, V_A2, andelSe(p2, n))]);
      const dom = bi === 0 && !domspärr
        ? (utf === "KLARAR" ? "  ⇒ KLARAR V-A" : utf === "OAVGJORT" ? "  ⇒ OAVGJORT (inom bruset)" : "  ⇒ faller")
        : (bi === 0 ? "  ⇒ — (för tunt underlag)" : "  (räknas inte in, V-A3)");
      console.log(`  ${BAND[bi][0].padEnd(9)} n=${String(n).padStart(6)}  träff ${(100 * p1).toFixed(0)}±${(100 * brus(p1, n)).toFixed(0)} %  delvis ${(100 * u.delvis / n).toFixed(0)} %  falsklarm ${(100 * p2).toFixed(0)}±${(100 * brus(p2, n)).toFixed(0)} %${dom}`);
      if (bi === 0 && !domspärr && utf === "KLARAR" && basta === null) basta = T;
    }
  }
  console.log("");
  if (domspärr) {
    console.log(`DOMSPÄRR: underlaget räcker inte (kräver ≥ ${MIN_HANDELSER} fall i 0–10 km och ≥ ${MIN_STATIONER} stationer).`);
    console.log(`Ingen dom går att läsa av. Kurvan växer med varje regnvecka — mätningen upprepas.`);
  } else if (basta !== null) {
    console.log(`DOM: V-A KLARAS från och med tröskeln ${basta} mm/h. Det är den lägsta tröskel`);
    console.log(`mätningen bär — och därmed regntröskelns kandidatvärde, som dokumentet lämnade`);
    console.log(`osatt med flit. Värdet in i TROSKLAR-VATTENPLANING kräver §5-signaturerna.`);
  } else {
    console.log(`DOM: V-A FALLER på alla prövade trösklar (${TROSKLAR.join(", ")} mm/h).`);
    console.log(`Det är ett dokumenterat nej — regnarkivet finns kvar och är husets billigaste utfall.`);
  }
}

// ── Självtest med känd sanning: två poler som måste ge motsatta svar.
if (process.argv.includes("--sjalvtest")) {
  const bygg = (spridning: number): Station[] => {
    const st: Station[] = [];
    for (let i = 0; i < 8; i++) {
      const mmh = new Map<number, number>();
      for (let t = 0; t < 300; t++) {
        // spridning=0: alla stationer har identiskt regn (perfekt korrelation).
        // spridning=1: varje station har sitt eget, oberoende regn.
        const gemensam = (t * 7919) % 11 < 4 ? 5 : 0;
        const eget = ((t * 104729 + i * 7717) % 11) < 4 ? 5 : 0;
        mmh.set(t, spridning ? eget : gemensam);
      }
      st.push({ id: `s${i}`, lon: 13 + i * 0.05, lat: 60, mmh });  // ~2,8 km isär ⇒ band 0–10
    }
    return st;
  };
  console.log("SJÄLVTEST A — identiskt regn överallt: träff ska bli 100 %, falsklarm 0 %");
  const a = utvardera(bygg(0), 2)[0];
  const na = a.traff + a.delvis + a.falsklarm, pa = a.traff / na, fa = a.falsklarm / na;
  console.log(`  n=${na} träff ${(100 * pa).toFixed(0)} % falsklarm ${(100 * fa).toFixed(0)} %`);
  console.log("SJÄLVTEST B — oberoende regn: träffen ska falla, falsklarmen stiga");
  const b = utvardera(bygg(1), 2)[0];
  const nb = b.traff + b.delvis + b.falsklarm, pb = b.traff / nb, fb = b.falsklarm / nb;
  console.log(`  n=${nb} träff ${(100 * pb).toFixed(0)} % falsklarm ${(100 * fb).toFixed(0)} %`);
  let ok = true;
  if (!(pa > 0.99 && fa < 0.01)) { console.error(`SJÄLVTEST A: träff ${pa.toFixed(2)}, falsklarm ${fa.toFixed(2)} — väntat 1,00 / 0,00`); ok = false; }
  if (!(pb < pa - 0.3)) { console.error(`SJÄLVTEST B: träff ${pb.toFixed(2)} skiljer sig för lite från A (${pa.toFixed(2)})`); ok = false; }
  if (!(fb > 0.2)) { console.error(`SJÄLVTEST B: falsklarm ${fb.toFixed(2)} — oberoende regn måste ge tydliga falsklarm`); ok = false; }
  if (!ok) process.exit(1);
  console.log(`SJÄLVTEST OK: mätningen skiljer korrelerat regn från okorrelerat åt rätt håll.`);
  process.exit(0);
}

// ── Skarpt: regnmängderna ur arkivet, 30-min-summa → mm/h.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAGAR = Number(process.argv[2] ?? 30);
// Saknade dygn (kort #322, DECISIONS #511): raderingen tar dygn äldre än 14 ur databasen och får aldrig krympa fönstret tyst.
skrivSaknade(await saknadeDygn((s, p) => pool.query(s, p as any[]).then((r) => r.rows), "weather_observations", DAGAR));
// VAKTDIAGNOSEN FÖRST (DECISIONS #141).
await vaktdiagnos((s, p) => pool.query(s, p as any[]).then((r) => r.rows),
  "weather_observations", `WHERE sample_time > now() - ${DAGAR} * interval '1 day'`, [
    { namn: "regnmangd (rain_sum_mm) finns", bar: "rain_sum_mm IS NOT NULL", villkor: "true" },
    { namn: "regn > 0 nagon gang", bar: "rain_sum_mm IS NOT NULL", villkor: "rain_sum_mm > 0" },
  ]);

const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b,
    rain_sum_mm * 2 AS mmh
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' AND rain_sum_mm IS NOT NULL
  ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
await pool.end();

const byId = new Map<string, Station>();
for (const r of res.rows) {
  let s = byId.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, mmh: new Map() }; byId.set(r.station_id, s); }
  s.mmh.set(Number(r.b), Number(r.mmh));
}
console.log(`Arkivet: ${byId.size} stationer med mängdgivare, ${res.rows.length} bucketade avläsningar, ${DAGAR} dygn bakåt\n`);
if (byId.size < 100 || res.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: ${byId.size} stationer / ${res.rows.length} avläsningar — hämtningen eller arkivet är trasigt.`);
  process.exit(1);
}
const stationer = [...byId.values()];
// Domspärren mäts på det band domen gäller (0–10 km) vid den lägsta tröskeln.
const prov = utvardera(stationer, TROSKLAR[0])[0];
const fall = prov.traff + prov.delvis + prov.falsklarm;
rapport(stationer, `senaste ${DAGAR} dygnen`, fall < MIN_HANDELSER || byId.size < MIN_STATIONER);
