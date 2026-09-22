// GRIND R-A — finns rimfrostsignalen alls, och är den fysik eller brus?
// (Kort #46, docs/TROSKLAR-RIMFROST.md §4, fastställt 12/9, DECISIONS #135.)
//
// KONDENSATIONSVILLKORET: när vägytan är kallare än luftens daggpunkt kondenserar vattenånga på
// ytan. Är ytan dessutom under noll blir kondensatet is. Det kräver INGEN nederbörd — och det är
// exakt det fall där motorn i dag tiger, eftersom `icing_point` kräver `moisture === true`.
//
// KÖRS PÅ DET FINSKA ARKIVET, och det är dokumentets eget val (§5, §8 steg 2): `KASTEPISTE`
// arkiveras ur Fintraffic sedan 4/9, och **Lapplands septemberfrost ger äkta rimfrostnätter veckor
// före Sverige**. Samma analys, finskt arkiv, ingen ny källa och inga svenska nätter att vänta på.
// `--land=se` kör samma mätning på det svenska arkivet när frosten kommer hit.
//
// TIDSZONEN ÄR INTE EN DETALJ. `sample_time` är UTC, men fysikkontrollen frågar efter LOKAL tid:
// utstrålningskylningen bottnar strax före gryningen. Finland ligger UTC+3 på sommartid, Sverige
// UTC+2 — räknar man kl 03–07 i UTC mäter man fel timmar i fel land. Frågan konverterar därför
// med `AT TIME ZONE`, och zonen följer landet.
//
// GIVARVAKTEN ÄR TREDELAD OCH UNDANTAGEN FRÅN ALL LÄTTNAD (§3). Kortets egna körningar 4/9: 53 av
// 58 kandidater kom från TRE stationer med yta − daggpunkt −28…−49 °C, och med äkthetsvillkoret
// överlevde **0 av 53**. Varenda kandidat var givarfel. En rimfrostgren byggd utan vakt hade fyrat
// på skrot natt efter natt.
//
// FYND UR FÖRSTA KÖRNINGEN (DECISIONS #137): DET FINSKA ARKIVET BÄR INGEN LUFTFUKTIGHET.
// ingest/fi.ts hämtar TIE_1, ILMA, KASTEPISTE, SADE och KELI_1 — men aldrig RH. Korsgivar-
// kontrollen i §3 går alltså inte att utvärdera där, och första versionen av det här skriptet
// svarade "0 rader, OAVGJORT" som om det vore ett underlagsbesked. Det var det inte: det var ett
// villkor som TYST FILTRERADE BORT ALLT därför att fältet inte finns. Samma familj som
// Boolean(precipitation) och vinddatan före #84 — ett filter som ser ut som en mätning.
// Därför räknas varje vaktled FÖR SIG nu, och en nolla kan aldrig vara tvetydig.
//
// VAD DEN INTE KAN GÖRA HÄR: R-A4, molnkontrollen. SMHI:s molnstationer är svenska och når inte
// finska vägstationer. Den halvan körs på svensk frost, och skriptet säger det i stället för att
// låtsas.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-r-a.ts [dagar=30] [--land=se]
// Självtest utan DB: scripts/grind-r-a.ts --sjalvtest

import { andelSe, utfallGolv, utfallTak, marginalPe } from "../publish/marginal.ts";
import { vaktdiagnos, led234 } from "../publish/vaktdiagnos.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { molnForPunkter, type Molnklass } from "../publish/moln.ts";

// ── Svepet ur TROSKLAR-RIMFROST §2. Inget tal är valt ur ett utfall.
export const R1_MARGINAL = [0, 0.5, 1.0];   // yta ≤ daggpunkt + M
export const R2_YTA = [0, 1.0];             // yta ≤ Y
export const R3_UTHALL = [30, 60];          // villkoret ska hålla i minst U minuter
// ── Kraven ur §4.
const R_A1_TIMMAR = 200, R_A2_STATIONER = 20, R_A3_NATT = 0.40, R_A5_DOMINANS = 0.20;
const R_A4_KVOT = 2, R_A4_MIN = 5;   // klara ska fyra dubbelt så ofta som mulna, minst 5 av varje
const MAXGAP_MIN = 45;   // längre lucka bryter episoden — arkivdieten, inte vädret

export type Rad = { station: string; t: number; yta: number; dagg: number; rh: number; timme: number;
  natt: string; lon: number; lat: number };
export type Episod = { station: string; natt: string; minuter: number; kallastTimme: number;
  kallastT: number; lon: number; lat: number; moln?: Molnklass };

/** Villkoret. Vakten sitter i frågan; den här funktionen prövar bara fysiken. */
export function uppfyller(r: { yta: number; dagg: number }, m: number, y: number): boolean {
  return r.yta <= r.dagg + m && r.yta <= y;
}

/** Episoder: sammanhängande rader som uppfyller villkoret, med lucka ≤ MAXGAP_MIN.
 *  Längden är sista minus första — med 30-minuterstakt kräver U = 30 alltså TVÅ rader. */
export function episoder(rader: Rad[], m: number, y: number, uthall: number): Episod[] {
  const ut: Episod[] = [];
  const perStation = new Map<string, Rad[]>();
  for (const r of rader) {
    if (!perStation.has(r.station)) perStation.set(r.station, []);
    perStation.get(r.station)!.push(r);
  }
  for (const [station, rr] of perStation) {
    rr.sort((a, b) => a.t - b.t);
    let lopande: Rad[] = [];
    const stang = () => {
      if (lopande.length >= 2) {
        const minuter = (lopande[lopande.length - 1].t - lopande[0].t) / 60;
        if (minuter >= uthall) {
          const kallast = lopande.reduce((a, b) => (b.yta < a.yta ? b : a));
          ut.push({ station, natt: lopande[0].natt, minuter, kallastTimme: kallast.timme,
            kallastT: kallast.t / 60, lon: kallast.lon, lat: kallast.lat });
        }
      }
      lopande = [];
    };
    for (const r of rr) {
      if (!uppfyller(r, m, y)) { stang(); continue; }
      if (lopande.length && (r.t - lopande[lopande.length - 1].t) / 60 > MAXGAP_MIN) stang();
      lopande.push(r);
    }
    stang();
  }
  return ut;
}

/** R-A5: bär en enskild station för stor del av träffarna? */
export function dominans(ep: Episod[]): { storsta: number; andel: number; station: string } {
  const per = new Map<string, number>();
  for (const e of ep) per.set(e.station, (per.get(e.station) ?? 0) + 1);
  let station = "", storsta = 0;
  for (const [s, n] of per) if (n > storsta) { storsta = n; station = s; }
  return { storsta, andel: ep.length ? storsta / ep.length : 0, station };
}

/** Underlagsvakten R-A1/R-A2. null = ingen dom. */
export function dom<T>(timmar: number, stationer: number, svar: T): T | null {
  return timmar >= R_A1_TIMMAR && stationer >= R_A2_STATIONER ? svar : null;
}

const pct = (x: number) => `${(100 * x).toFixed(0)} %`;

// ── Självtest med känd sanning.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — villkoret, episoderna, uthålligheten och vakterna mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Villkoret: ytan måste vara under BÅDE daggpunkten (+M) och yttröskeln.
  k("yta −2, dagg −1 ⇒ uppfyller", uppfyller({ yta: -2, dagg: -1 }, 0, 0), true);
  k("yta −1, dagg −2 ⇒ nej (varmare än daggpunkten)", uppfyller({ yta: -1, dagg: -2 }, 0, 0), false);
  k("marginal 1,0 räddar yta −1 mot dagg −2", uppfyller({ yta: -1, dagg: -2 }, 1, 0), true);
  k("yta +0,5 fälls av yttröskeln 0", uppfyller({ yta: 0.5, dagg: 3 }, 0, 0), false);
  k("yta +0,5 passerar yttröskeln 1", uppfyller({ yta: 0.5, dagg: 3 }, 0, 1), true);
  // Episoder på 30-minuterstakt.
  const rad = (min: number, yta: number, timme = 4): Rad =>
    ({ station: "A", t: min * 60, yta, dagg: yta + 1, rh: 95, timme, natt: "2026-09-12", lon: 15, lat: 60 });
  k("två rader 30 min isär ⇒ en episod på 30 min",
    episoder([rad(0, -1), rad(30, -2)], 0, 0, 30).length, 1);
  k("två rader räcker inte för 60 min",
    episoder([rad(0, -1), rad(30, -2)], 0, 0, 60).length, 0);
  k("tre rader ger 60 min",
    episoder([rad(0, -1), rad(30, -2), rad(60, -3)], 0, 0, 60).length, 1);
  k("en ensam rad är ingen episod", episoder([rad(0, -1)], 0, 0, 30).length, 0);
  k("lucka över 45 min bryter episoden",
    episoder([rad(0, -1), rad(60, -2), rad(90, -3)], 0, 0, 30).length, 1);
  k("kallaste timmen plockas ur episoden",
    episoder([rad(0, -1, 22), rad(30, -5, 4), rad(60, -2, 5)], 0, 0, 30)[0].kallastTimme, 4);
  // R-A5.
  const ep = (s: string): Episod => ({ station: s, natt: "n", minuter: 30, kallastTimme: 4,
    kallastT: 0, lon: 15, lat: 60 });
  // Spridda över många stationer — annars dominerar den största trivialt, vilket vore rätt svar
  // men inte ett prov (första skrivningen hade två stationer och B bar 80 %).
  const spritt = (n: number) => Array.from({ length: n }, (_, i) => ep(`s${i}`));
  k("en station med 3 av 10 dominerar", dominans([...Array(3).fill(ep("A")), ...spritt(7)]).andel > R_A5_DOMINANS, true);
  k("en station med 2 av 10 gör det inte", dominans([...Array(2).fill(ep("A")), ...spritt(8)]).andel > R_A5_DOMINANS, false);
  k("två stationer: den största dominerar alltid — och det är rätt",
    dominans([...Array(2).fill(ep("A")), ...Array(8).fill(ep("B"))]).andel > R_A5_DOMINANS, true);
  // Underlagsvakten.
  k("för få timmar", dom(199, 100, "x"), null);
  k("för få stationer", dom(5000, 19, "x"), null);
  k("båda räcker", dom(200, 20, "x"), "x");
  // Svepen är dokumentets.
  k("R1 är dokumentets", R1_MARGINAL.join(","), "0,0.5,1");
  k("R3 är dokumentets", R3_UTHALL.join(","), "30,60");
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: villkoret kräver BÅDA leden, uthålligheten räknar spann och inte");
  console.log("antal rader, luckan bryter episoden, och en dominerande station fastnar.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const LAND = (process.argv.find((a) => a.startsWith("--land="))?.split("=")[1] ?? "fi").toLowerCase();
if (!["fi", "se"].includes(LAND)) { console.error(`okänt land: ${LAND}`); process.exit(1); }
const SCHEMA = LAND === "fi" ? "fi.weather_observations" : "weather_observations";
const TZ = LAND === "fi" ? "Europe/Helsinki" : "Europe/Stockholm";
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");

console.log(`Grind R-A — rimfrosten (kort #46), ${LAND.toUpperCase()}-arkivet, ${DAGAR} dygn\n`);
if (LAND === "fi") {
  console.log(`Finskt arkiv med flit: KASTEPISTE sedan 4/9, och Lapplands septemberfrost ger äkta`);
  console.log(`rimfrostnätter VECKOR före Sverige. Ingen ny källa, inga svenska nätter att vänta på.\n`);
}

// VAKTDIAGNOSEN FÖRST — nu den DELADE (DECISIONS #141). Den föddes här, ur att `humidity_pct`
// inte finns i det finska arkivet och tyst filtrerade bort varje rad; nu bär varje grind samma.
const vd = await vaktdiagnos((q2, p2) => pool.query(q2, p2 as any[]).then((r) => r.rows),
  SCHEMA, `WHERE sample_time > now() - ${DAGAR} * interval '1 day'`, [
    { namn: "yta + daggpunkt finns", bar: "surface_temp_c IS NOT NULL AND dewpoint_c IS NOT NULL", villkor: "true" },
    { namn: "#75: lufttemperatur finns", bar: "air_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: yta - luft >= -12 grader", bar: "surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL", villkor: "surface_temp_c >= air_temp_c - 12" },
    { namn: "daggpunktens: yta - dagg >= -5", bar: "surface_temp_c IS NOT NULL AND dewpoint_c IS NOT NULL", villkor: "surface_temp_c - dewpoint_c >= -5" },
    { namn: "korsgivare: luftfuktighet >= 90 %", bar: "humidity_pct IS NOT NULL", villkor: "humidity_pct >= 90" },
    ...led234(SCHEMA),
  ]);
const harRh = vd.utfall[4] !== "SAKNAS" && vd.utfall[4] !== "TOMT ARKIV";

// GIVARVAKTEN SITTER I FRÅGAN (§3). RH-ledet tas med bara när fältet finns.
const rader = (await pool.query(`
  SELECT station_id,
    extract(epoch FROM sample_time)::bigint AS t,
    surface_temp_c AS yta, dewpoint_c AS dagg, humidity_pct AS rh,
    ST_X(geom) AS lon, ST_Y(geom) AS lat,
    extract(hour FROM sample_time AT TIME ZONE $2)::int AS timme,
    ((sample_time AT TIME ZONE $2) - interval '12 hours')::date::text AS natt
  FROM ${SCHEMA} w
  WHERE sample_time > now() - $1 * interval '1 day'
    AND surface_temp_c IS NOT NULL AND dewpoint_c IS NOT NULL
    AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12   -- #75:s vakt
    AND ${RADVAKT_SQL} AND ${karantanSql("w", SCHEMA)}                 -- kort #234: radvakten och karantänen
    AND surface_temp_c - dewpoint_c >= -5                               -- daggpunktens egen (4/9)
    ${harRh ? "AND humidity_pct IS NOT NULL AND humidity_pct >= 90" : ""}  -- korsgivarkontrollen
  ORDER BY station_id, t`, [DAGAR, TZ])).rows as any[];
const data: Rad[] = rader.map((r) => ({
  station: r.station_id, t: Number(r.t), yta: Number(r.yta), dagg: Number(r.dagg),
  rh: Number(r.rh), timme: Number(r.timme), natt: r.natt,
  lon: Number(r.lon), lat: Number(r.lat) }));
console.log(`Efter den femdelade givarvakten: ${data.length} rader, ${new Set(data.map((d) => d.station)).size} stationer.`);
console.log(`  (#75:s vakt · radvakten · karantänen · yta − daggpunkt ≥ −5 °C · ${harRh ? "luftfuktighet >= 90 %" : "RH SAKNAS I ARKIVET"}. Tidszon ${TZ}.)`);
if (!data.length) {
  console.log(`\n⊘ OAVGJORT — inga rader överlever vakten i fönstret.`);
  console.log(`  Läs vaktdiagnosen ovan för VILKET led som tömde materialet: ett fält som saknas`);
  console.log(`  och en vakt som fäller är två helt olika svar.`);
  await pool.end(); process.exit(0);
}

console.log(`\nSVEPET — R1 marginal × R2 yttröskel × R3 uthållighet`);
console.log(`  Domspärr (R-A1/R-A2): ≥ ${R_A1_TIMMAR} stationstimmar och ≥ ${R_A2_STATIONER} stationer.`);
console.log(`\n  R1    R2    R3   episoder  stationer  medianlängd   kl 03–07  största station`);
type Ut = { m: number; y: number; u: number; ep: Episod[] };
const alla: Ut[] = [];
for (const m of R1_MARGINAL) for (const y of R2_YTA) for (const u of R3_UTHALL) {
  const ep = episoder(data, m, y, u);
  alla.push({ m, y, u, ep });
  const st = new Set(ep.map((e) => e.station)).size;
  const langder = ep.map((e) => e.minuter).sort((a, b) => a - b);
  const median = langder.length ? langder[Math.floor(langder.length / 2)] : 0;
  const natt = ep.filter((e) => e.kallastTimme >= 3 && e.kallastTimme <= 7).length;
  const d = dominans(ep);
  console.log(`  ${m.toFixed(1)}  ${y.toFixed(1)}  ${String(u).padStart(3)}  ` +
    `${String(ep.length).padStart(8)}  ${String(st).padStart(9)}  ${String(median).padStart(9)} min  ` +
    `${(ep.length ? pct(natt / ep.length) : "–").padStart(8)}  ${(ep.length ? pct(d.andel) : "–").padStart(8)}`);
}

// ── Domen, med domspärren FÖRE tabellen i anda (R-C4) och marginalvakten på R-A3.
const bast = alla.reduce((a, b) => (b.ep.length > a.ep.length ? b : a));
const stationer = new Set(bast.ep.map((e) => e.station)).size;
console.log(`\nGRIND R-A`);
if (!harRh) {
  console.log(`  OAVGJORT — korsgivarkontrollen (§3, tredje ledet) går inte att utvärdera i det`);
  console.log(`  här arkivet. Talen ovan är ett FÖRHANDSBESKED och får inte läsas som ett`);
  console.log(`  grindutfall. Kör om med --land=se när svensk frost kommer, där RH finns.`);
} else if (!dom(bast.ep.length, stationer, true)) {
  console.log(`  ⊘ OAVGJORT — domspärren håller. Bästa kombinationen gav ${bast.ep.length} episoder`);
  console.log(`    på ${stationer} stationer, kravet är ${R_A1_TIMMAR} och ${R_A2_STATIONER}.`);
  console.log(`    Det är ett UNDERLAGSBESKED, inte ett nej. Frosten har inte kommit än.`);
} else {
  const natt = bast.ep.filter((e) => e.kallastTimme >= 3 && e.kallastTimme <= 7).length;
  const andel = natt / bast.ep.length;
  const se = andelSe(andel, bast.ep.length);
  const d = dominans(bast.ep);
  console.log(`  Bästa kombinationen: R1 ${bast.m}, R2 ${bast.y}, R3 ${bast.u} min — ${bast.ep.length} episoder, ${stationer} stationer.`);
  console.log(`  R-A3 fysikkontroll (dygnsprofil): ${pct(andel)}${marginalPe(se)} har kallaste stunden kl 03–07 (krav ${pct(R_A3_NATT)})`);
  console.log(`     ⇒ ${utfallGolv(andel, R_A3_NATT, se)}`);
  console.log(`  R-A5 dominans: största stationen bär ${pct(d.andel)} av träffarna (tak ${pct(R_A5_DOMINANS)})`);
  console.log(`     ⇒ ${utfallTak(d.andel, R_A5_DOMINANS, andelSe(d.andel, bast.ep.length))}`);
}

// R-A4 FYSIKKONTROLLEN, MOLNET. Rimfrost är per definition ett utstrålningsfenomen: den bildas
// när ytan strålar bort sin värme mot en klar himmel. Fyrar villkoret lika ofta mulna nätter som
// klara är det inte utstrålning som driver träffarna — och då är hypotesen fel även om talen ser
// bra ut (§5 utfall 2). Kravet i §4: klara nätter ska fyra minst DUBBELT så ofta som mulna.
if (LAND === "se") {
  console.log(`\nR-A4 MOLNKONTROLLEN — molnet hämtas vid körning ur SMHI metobs parameter 16`);
  try {
    const klass = await molnForPunkter(bast.ep.map((e) => ({ lon: e.lon, lat: e.lat, tMin: e.kallastT })));
    bast.ep.forEach((e, i) => { e.moln = klass[i]; });
    const n = bast.ep.length;
    const klara = bast.ep.filter((e) => e.moln === "klar").length;
    const mulna = bast.ep.filter((e) => e.moln === "mulen" || e.moln === "skymd").length;
    const okand = bast.ep.filter((e) => e.moln === "okänd").length;
    console.log(`  klar ${klara} · mellan ${n - klara - mulna - okand} · mulen/skymd ${mulna} · okänd ${okand}`);
    if (klara < R_A4_MIN || mulna < R_A4_MIN) {
      console.log(`  ⊘ OAVGJORT — för få nätter i endera klassen (kräver ${R_A4_MIN} vardera för att jämföra).`);
    } else {
      const kvot = klara / mulna;
      console.log(`  klara mot mulna: ${kvot.toFixed(2)} × (krav ≥ ${R_A4_KVOT})`);
      console.log(`  ⇒ ${kvot >= R_A4_KVOT ? "R-A4 STÖDJER utstrålningshypotesen" : "R-A4 STÖDJER INTE hypotesen — och då är den fel även om talen ser bra ut"}`);
    }
    console.log(`  Sentinelen: 113 % är SMHI:s kod för HIMLEN SKYMD, inte molnmängd — fysikaliskt`);
    console.log(`  motsatsen till klar natt. Den räknas med de mulna (publish/moln.ts).`);
  } catch (e) {
    console.log(`  SMHI svarade inte: ${String((e as Error).message).slice(0, 90)}`);
    console.log(`  Molnkontrollen är OKÖRD — det är tystnad, inte ett negativt svar.`);
  }
} else {
  console.log(`\nR-A4 MOLNKONTROLLEN — INTE KÖRD PÅ DET FINSKA ARKIVET, och skälet ska stå här`);
  console.log(`  SMHI:s molnstationer är svenska och når inte finska vägstationer. Att sträcka en`);
  console.log(`  molnobservation över Bottenviken och kalla det en mätning vore precis det`);
  console.log(`  representativitetsfel §2.8 mätte bort. Kör om med --land=se vid svensk frost.`);
}

console.log(`\n  Att läsa med: R-A prövar om SIGNALEN finns och är fysik. Den ger ingen rätt till röst.`);
console.log(`  Rimfrosten blir en ANDRA GREN i icing_point, aldrig en sjätte farotyp (§1).`);
await pool.end();
