// Grind V-B (kort #42 steg E, kort #81; docs/TROSKLAR-VATTENPLANING.md §3, fastställd av Axel
// DECISIONS #68): TALAR SKUGGAN FÖR OFTA, OCH TALAR DEN OM INGENTING?
//
// Skuggan skriver sedan 15/9 vad vattenplaningsrösten SKULLE sagt i `shadow_log.vb` (DECISIONS #191).
// Den här knappen dömer de raderna mot §3:s fällda värden — och bara dem; loggen är rå, domen räknar
// (Axel, DECISIONS #196). Ingen tröskel sätts här: utlösaren är fastställd (#155/#156) och importeras
// ur snapshotkärnan, så det finns ingen kopia att driva isär.
//
// VAD VARJE MÅTT VILAR PÅ, och var det INTE räcker:
//  · V-B1 falsklarm ≤ 20 % — mätbart nu. §2 ger stationens `rain_sum_mm` rätten att fälla: nådde
//    närmaste station aldrig tröskeln inom ±30 min är varningen falsk. Trippeldelning som i V-A
//    (BEKRÄFTAD · DELVIS · TORRT) för ärlighetens skull, men §2:s definition styr talet: allt under
//    tröskeln är falsklarm, och delvis-kolumnen står bredvid så att man ser vad man dömer.
//  · V-B3 frekvens ≤ 3 per rutt och regndygn — mätbart nu. Regndygn = ett dygn då rutten faktiskt
//    hade något att varna för; utan regn finns ingen frekvens att mäta.
//  · V-B2 missandel ≤ 40 % — INTE mätbart här, och skriptet säger det i stället för att låtsas.
//    `situation_archive` bär ingen orsak (situations.ts:37): en olycka är facit på att NÅGOT hände,
//    inte på att det var vattenplaning. Dessutom kör skuggan åtta rutter, inte hela landet — en
//    olycka någon annanstans kunde aldrig ha fått en varning. Talet redovisas som UNDERLAG.
//
// EN VARNING UTAN STATION INOM RÄCKHÅLL ÄR OMÄTBAR, aldrig "rätt". Samma nollpolitik som radarns
// `regn: null`: frånvaro av mätning är inte frånvaro av regn. De räknas separat och aldrig in i V-B1.
//
// Run: DATABASE_URL=... node --experimental-strip-types publish/grind-v-b.ts [dagar=14]
// Självtest utan DB: publish/grind-v-b.ts --sjalvtest
import { REGN_UTLOSARE_MMH, RADAR_FAKTOR } from "./snapshot-core.ts";
import { Z, andelSe, utfallTak, grindutfall, type Utfall } from "./marginal.ts";
import { vaktdiagnos } from "./vaktdiagnos.ts";

/** Tröskeln i STATIONENS skala — härledd ur de två fastställda talen, aldrig skriven för hand.
 *  Radarn utlöser på 2,0 mm/h rått; stationen mäter i sin egen skala, alltså 2,0 / 0,65 ≈ 3,1. */
export const TROSKEL_STATION_MMH = REGN_UTLOSARE_MMH / RADAR_FAKTOR;
/** Hur nära en station måste ligga för att få döma segmentet. V-A3:s domband, inte ett nytt tal. */
const MAX_KM = 10;
const FONSTER_MIN = 30;                     // §2: "inom ±30 min"
const V_B1 = 0.20, V_B3 = 3;                // fällda värden (Bengt 4/9, Axel DECISIONS #68)
const MIN_VARNINGAR = 200, MIN_FACIT = 15;  // V-C1
const MIN_REGNDYGN = 5, MIN_LAN = 3;        // V-C2

export type Varning = { tid: Date; rutt: string; segment: string; lon: number; lat: number };
export type Matning = { lon: number; lat: number; bucket: number; mmh: number };

export function km(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Utslag = "BEKRÄFTAD" | "DELVIS" | "TORRT" | "OMÄTBAR";

/** Vad säger närmaste station om varningen? Max över bucketarna i fönstret — regnet behöver bara
 *  ha nått tröskeln en gång inom ±30 min för att varningen ska ha haft fog för sig. */
export function dom(v: Varning, matningar: Matning[]): { utslag: Utslag; km: number | null; mmh: number | null } {
  let bastaKm = Infinity, bast: Matning[] = [];
  const perStation = new Map<string, Matning[]>();
  for (const m of matningar) {
    const nyckel = `${m.lon},${m.lat}`;
    (perStation.get(nyckel) ?? perStation.set(nyckel, []).get(nyckel)!).push(m);
  }
  for (const [, ms] of perStation) {
    const d = km(v, ms[0]);
    if (d < bastaKm) { bastaKm = d; bast = ms; }
  }
  if (!bast.length || bastaKm > MAX_KM) return { utslag: "OMÄTBAR", km: bast.length ? bastaKm : null, mmh: null };
  const t = v.tid.getTime();
  const inom = bast.filter((m) => Math.abs(m.bucket * 1800_000 + 900_000 - t) <= FONSTER_MIN * 60_000);
  if (!inom.length) return { utslag: "OMÄTBAR", km: bastaKm, mmh: null };
  const mmh = Math.max(...inom.map((m) => m.mmh));
  return { utslag: mmh >= TROSKEL_STATION_MMH ? "BEKRÄFTAD" : mmh > 0 ? "DELVIS" : "TORRT", km: bastaKm, mmh };
}

/** V-B3: varningar per rutt och regndygn. Ett regndygn för en rutt är ett dygn då rutten hade minst
 *  en skuggvarning — fanns inget regn fanns ingen frekvens att mäta, och att räkna torra dygn i
 *  nämnaren skulle dölja brus bakom soliga veckor. */
export function frekvens(varningar: Varning[]): { rutt: string; dygn: number; n: number; snitt: number }[] {
  const per = new Map<string, Map<string, number>>();
  for (const v of varningar) {
    const dag = v.tid.toISOString().slice(0, 10);
    const m = per.get(v.rutt) ?? per.set(v.rutt, new Map()).get(v.rutt)!;
    m.set(dag, (m.get(dag) ?? 0) + 1);
  }
  return [...per.entries()].map(([rutt, dagar]) => {
    const n = [...dagar.values()].reduce((a, b) => a + b, 0);
    return { rutt, dygn: dagar.size, n, snitt: n / dagar.size };
  }).sort((a, b) => b.snitt - a.snitt);
}

const brus = (p: number, n: number) => (n > 0 ? Z * andelSe(p, n) : NaN);

export function rapport(varningar: Varning[], matningar: Matning[], olyckor: number, lan: number, label: string) {
  console.log(`Grind V-B — talar skuggan för ofta, och talar den om ingenting? (${label})`);
  console.log(`Krav ur TROSKLAR-VATTENPLANING §3: V-B1 falsklarm ≤ ${(100 * V_B1).toFixed(0)} %, V-B2 miss ≤ 40 %,`);
  console.log(`V-B3 ≤ ${V_B3} varningar per rutt och regndygn. Tröskeln i stationens skala:`);
  console.log(`${REGN_UTLOSARE_MMH} / ${RADAR_FAKTOR} = ${TROSKEL_STATION_MMH.toFixed(1)} mm/h (härledd, #155/#156).\n`);

  const utslag = varningar.map((v) => dom(v, matningar));
  const antal = (u: Utslag) => utslag.filter((x) => x.utslag === u).length;
  const bekraftad = antal("BEKRÄFTAD"), delvis = antal("DELVIS"), torrt = antal("TORRT"), omatbar = antal("OMÄTBAR");
  const matta = bekraftad + delvis + torrt;

  console.log(`V-B1 FALSKLARM — vad sa närmaste station inom ${MAX_KM} km och ±${FONSTER_MIN} min?`);
  console.log(`  skuggvarningar ${varningar.length}  ·  mätbara ${matta}  ·  OMÄTBARA ${omatbar} (ingen station inom räckhåll — räknas aldrig in)`);
  if (!matta) {
    console.log(`  ⊘ inget att döma: ingen varning hade en station inom räckhåll.\n`);
  } else {
    const falska = delvis + torrt, p = falska / matta;
    console.log(`  BEKRÄFTAD ${bekraftad} (${(100 * bekraftad / matta).toFixed(0)} %)  ·  DELVIS ${delvis} (blöt men under tröskeln)  ·  TORRT ${torrt}`);
    console.log(`  falsklarm enligt §2 (allt under tröskeln): ${(100 * p).toFixed(0)}±${(100 * brus(p, matta)).toFixed(0)} %  (krav ≤ ${(100 * V_B1).toFixed(0)} %)`);
    const km = utslag.filter((x) => x.km != null).map((x) => x.km!).sort((a, b) => a - b);
    if (km.length) console.log(`  avstånd till dömande station: median ${km[km.length >> 1].toFixed(1)} km, längst ${km[km.length - 1].toFixed(1)} km\n`);
  }

  console.log(`V-B3 FREKVENS — varningar per rutt och regndygn (dygn med minst en varning)`);
  const f = frekvens(varningar);
  for (const r of f) console.log(`  ${r.rutt.padEnd(28)} ${String(r.n).padStart(4)} varningar / ${r.dygn} dygn = ${r.snitt.toFixed(1)}${r.snitt > V_B3 ? "  ⚠ över " + V_B3 : ""}`);
  const over = f.filter((r) => r.snitt > V_B3).length;
  console.log(`  ${over} av ${f.length} rutter över ${V_B3}\n`);

  console.log(`V-B2 MISSANDEL — ⊘ GÅR INTE ATT MÄTA HÄR, och det är inte en brist i underlaget:`);
  console.log(`  situation_archive bär ingen ORSAK (situations.ts:37) — en olycka är facit på att något`);
  console.log(`  hände, inte på att det var vattenplaning. Och skuggan kör åtta rutter, inte hela landet:`);
  console.log(`  en olycka utanför dem kunde aldrig ha fått en varning. UNDERLAG: ${olyckor} olyckor i fönstret.`);
  console.log(`  Måttet kräver testarlogg eller granskad kamerabild (§2) — det är betans uppgift, inte knappens.\n`);

  // ── V-C: domens giltighet. Utan C fälls ingen dom alls.
  const regndygn = new Set(varningar.map((v) => v.tid.toISOString().slice(0, 10))).size;
  const sparr: string[] = [];
  if (varningar.length < MIN_VARNINGAR) sparr.push(`${varningar.length} varningar (kräver ≥ ${MIN_VARNINGAR})`);
  sparr.push(`0 facitbekräftade händelser (kräver ≥ ${MIN_FACIT}) — se V-B2`);
  if (regndygn < MIN_REGNDYGN) sparr.push(`${regndygn} regndygn (kräver ≥ ${MIN_REGNDYGN})`);
  if (lan < MIN_LAN) sparr.push(`${lan} län (kräver ≥ ${MIN_LAN})`);

  console.log(`V-C GILTIGHET: ${varningar.length} varningar · ${regndygn} regndygn · ${lan} län`);
  if (sparr.length) {
    console.log(`\n⊘ DOMSPÄRR — ingen dom går att läsa av:`);
    for (const s of sparr) console.log(`   · ${s}`);
    console.log(`\nTalen ovan är underlag, inte dom. Kurvan växer med varje regnvecka; mätningen upprepas.`);
    console.log(`Att fälla en dom på det här underlaget vore precis vad §3:s V-C finns för att hindra.`);
    return;
  }
  const p = matta ? (delvis + torrt) / matta : 1;
  const utf: Utfall = grindutfall([utfallTak(p, V_B1, andelSe(p, matta)), over ? "FALLER" : "KLARAR"]);
  console.log(`\nDOM: V-B ${utf === "KLARAR" ? "KLARAS" : utf === "OAVGJORT" ? "OAVGJORT (inom bruset)" : "FALLER"} på V-B1 och V-B3. V-B2 saknas fortfarande (se ovan).`);
}

// ── Självtest med känd sanning: två poler som måste ge motsatta svar ────────────────────────
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — grind V-B mot påhittade fall med känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (JSON.stringify(fick) !== JSON.stringify(vantat)) { console.error(`  FEL: ${namn} = ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`); ok = false; }
    else console.log(`  ok: ${namn} = ${JSON.stringify(fick)}`);
  };
  const t0 = new Date("2026-09-16T12:15:00Z");
  const b = Math.floor(t0.getTime() / 1800_000);
  const v = (lon: number): Varning => ({ tid: t0, rutt: "E18", segment: "S1", lon, lat: 59.0 });
  // Station på plats: 4,0 mm/h ≥ 3,1 ⇒ BEKRÄFTAD. 1,0 ⇒ DELVIS. 0 ⇒ TORRT. Station 30 km bort ⇒ OMÄTBAR.
  k("tröskeln i stationens skala", Number(TROSKEL_STATION_MMH.toFixed(2)), 3.08);
  k("station över tröskeln", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 4 }]).utslag, "BEKRÄFTAD");
  k("blöt men under", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 1 }]).utslag, "DELVIS");
  k("helt torr", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 0 }]).utslag, "TORRT");
  k("ingen station inom räckhåll", dom(v(15.0), [{ lon: 15.6, lat: 59.0, bucket: b, mmh: 9 }]).utslag, "OMÄTBAR");
  k("rätt station vinner (närmast, inte högst)", dom(v(15.0), [
    { lon: 15.01, lat: 59.0, bucket: b, mmh: 0 }, { lon: 15.08, lat: 59.0, bucket: b, mmh: 9 }]).utslag, "TORRT");
  k("utanför tidsfönstret är omätbart", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b - 4, mmh: 9 }]).utslag, "OMÄTBAR");
  // Max över fönstret: regnet behöver ha nått tröskeln EN gång inom ±30 min.
  k("max över fönstret gäller", dom(v(15.0), [
    { lon: 15.0, lat: 59.0, bucket: b, mmh: 0 }, { lon: 15.0, lat: 59.0, bucket: b - 1, mmh: 5 }]).utslag, "BEKRÄFTAD");
  const f = frekvens([v(15), v(15), { ...v(15), tid: new Date("2026-09-17T12:15:00Z") }]);
  k("frekvens: 3 varningar på 2 dygn = 1,5", f[0].snitt, 1.5);
  console.log(ok ? "\nSJÄLVTEST OK: utslagen följer §2, och nämnaren är regndygn — inte kalenderdygn." : "\nSJÄLVTEST FALLERAR");
  process.exit(ok ? 0 : 1);
}

// ── Skarpt ────────────────────────────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const q = (s: string, p?: unknown[]) => pool.query(s, p as any[]).then((r) => r.rows);
const DAGAR = Number(process.argv[2] ?? 14);

// Vaktdiagnosen först (DECISIONS #141): bär raderna fälten alls?
await vaktdiagnos(q, "shadow_log", `WHERE run_at > now() - ${DAGAR} * interval '1 day' AND land = 'SE'`, [
  { namn: "vb-kolumnen finns", bar: "vb IS NOT NULL", villkor: "true" },
  { namn: "vb bär varningar", bar: "vb IS NOT NULL", villkor: "jsonb_array_length(vb) > 0" },
]);

const rader = await q(`
  SELECT run_at, route, vb FROM shadow_log
  WHERE land = 'SE' AND run_at > now() - $1 * interval '1 day' AND jsonb_array_length(vb) > 0
  ORDER BY run_at`, [DAGAR]);
const varningar: Varning[] = [];
for (const r of rader)
  for (const a of r.vb as any[])
    if (typeof a.lon === "number" && typeof a.lat === "number")
      varningar.push({ tid: new Date(r.run_at), rutt: r.route, segment: String(a.id), lon: a.lon, lat: a.lat });

const mat = await q(`
  SELECT DISTINCT ON (station_id, b) ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / 1800)::bigint AS b, rain_sum_mm * 2 AS mmh
  FROM weather_observations
  WHERE sample_time > now() - ($1 + 1) * interval '1 day' AND rain_sum_mm IS NOT NULL
  ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
const matningar: Matning[] = mat.map((r) => ({ lon: +r.lon, lat: +r.lat, bucket: Number(r.b), mmh: Number(r.mmh) }));

const [ol] = await q(`SELECT count(*)::int AS n FROM situation_archive
  WHERE start_time > now() - $1 * interval '1 day' AND geom IS NOT NULL`, [DAGAR]);
// Län: grov spridningsmätning på varningarnas positioner — en cell om ~1° ≈ ett län i storlek.
const lan = new Set(varningar.map((v) => `${Math.floor(v.lon)},${Math.floor(v.lat * 2)}`)).size;
await pool.end();

console.log(`Skuggloggen: ${rader.length} körningar med varningar, ${varningar.length} skuggvarningar, ${DAGAR} dygn bakåt`);
console.log(`Regnarkivet: ${matningar.length} bucketade avläsningar\n`);
rapport(varningar, matningar, Number(ol.n), lan, `senaste ${DAGAR} dygnen`);
