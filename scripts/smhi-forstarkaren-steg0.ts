// STEG 0 FÖR KORT #95 (d) — SMHI-FÖRSTÄRKAREN (TROSKLAR-SMHI-FORSTARKAREN §8 steg 3).
//
// FRÅGAN, och den är smalare än den låter: hur ofta ligger en stationstimme som REDAN kvalificerar
// för motorns frysrisk (yta ≤ tröskeln OCH fukt) under en AKTIV SMHI-vintervarning? Regeln får
// aldrig skapa en varning, bara förstärka en som redan finns (§1.1) — så nämnaren är de
// kvalificerande timmarna, och täljaren är de av dem som varningen täcker.
//
// VARFÖR EN ANDEL MED BÅDE GOLV OCH TAK. Under 5 % gör regeln ingenting. Över 80 % säger den "det
// är vinter" och skiljer inte två fall åt. En förstärkare som alltid är på är ingen förstärkare —
// det är F-A3, och taket är lika viktigt som golvet.
//
// TVÅ KÄNDA HÅL, båda skrivna i tröskeldokumentet innan mätningen gjordes:
//   1. GILTIGHETSFÖNSTRET saknades i arkivet fram till sql/015 (12/9). smhi_warnings töms vid varje
//      synk, så historiken visste när en varning PUBLICERADES, inte när den GÄLLDE — och SMHI
//      publicerar i förväg. Rader utan fönster får ett schablonfönster (OKAND_FONSTER_H) som är en
//      GISSNING, och andelen sådana rader skrivs ut i varje utfall (F-C3).
//   2. ETT LÄN ÄR INTE EN VÄG. Varningsområdena är länspolygoner. Stor träffyta är därför inget
//      bevis på att regeln vet något — det är precis vad taket i F-A3 finns för att fånga.
//
// VAD DEN INTE GÖR: dömer inte F-B. Den kräver facit, och `road_condition_history` står stilla
// sedan 25/8 eftersom Trafikverket klassar om vägar först på vintern. F-B är en vintergrind.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/smhi-forstarkaren-steg0.ts [dagar=30]
// Självtest utan DB: scripts/smhi-forstarkaren-steg0.ts --sjalvtest

import { andelSe, utfallGolv, utfallTak, grindutfall, marginalPe } from "../publish/marginal.ts";
import { vaktdiagnos, led234 } from "../publish/vaktdiagnos.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";

const MIN_TIMMAR = 200;          // F-A1
const MIN_OMRADEN = 20;          // F-A2
const ANDEL_GOLV = 0.05;         // F-A3 golv
const ANDEL_TAK = 0.80;          // F-A3 tak
const MAX_EN_VARNING = 0.25;     // F-A4
const OKAND_FONSTER_H = 12;      // schablon för rader utan giltighetsfönster — en gissning, se huvudet
const GIVARVAKT = `air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}`; // #75 (DECISIONS #106) + kort #234

// Fukten är en KOPIA av motorns (publish/snapshot-core.ts:41). Driftvakten i självtestet fäller om
// de glider isär — samma form som #89:s steg 0.
const DRY = new Set(["no", "dry"]);
export function fukt(r: { rain?: unknown; snow?: unknown; precipitation?: unknown }): boolean {
  return Boolean(r.rain || r.snow || (r.precipitation && !DRY.has(String(r.precipitation).toLowerCase())));
}
const FUKT_SQL =
  "(rain OR snow OR (precipitation IS NOT NULL AND precipitation <> ''" +
  " AND lower(precipitation) NOT IN ('no','dry')))";

/** F1 — vilka event_code räknas som vinter. Ingestens WINTER_CODES är den bredaste, och den tar
 *  med WIND, som inte hör hemma i en FRYSRISK-förstärkare (drivsnö är en sträckfråga). Den finns
 *  med i svepet för att visa vad bredden kostar, inte för att vinna. */
export const KODSVEP: [string, string][] = [
  ["SNOW_ICE", "^SNOW_ICE$"],
  ["SNOW|ICE|ICING", "SNOW|ICE|ICING"],
  ["WINTER_CODES", "SNOW|ICE|ICING|COLD|WIND"],
];

/** F2 — vilken nivå räcker. MESSAGE är "meddelande", inte varning. */
export const NIVASVEP: [string, string[]][] = [
  ["ORANGE+", ["ORANGE", "RED"]],
  ["YELLOW+", ["YELLOW", "ORANGE", "RED"]],
  ["alla", ["MESSAGE", "YELLOW", "ORANGE", "RED"]],
];

export const FONSTERSVEP = [0, 1, 3];              // F4, timmar utanför giltighetsfönstret
export const AVSTANDSVEP = [0, 10000, 25000];      // F5, meter utanför polygonen

/** F-A3: andelen måste ligga mellan golv och tak. Ett tak, inte bara ett golv — se huvudet. */
export function andelOk(andel: number): boolean {
  return andel >= ANDEL_GOLV && andel <= ANDEL_TAK;
}

/** Underlagsvakten (F-A1, F-A2). null = ingen dom får fällas. */
export function dom<T>(timmar: number, omraden: number, svar: T): T | null {
  return timmar >= MIN_TIMMAR && omraden >= MIN_OMRADEN ? svar : null;
}

/** F-A4: ingen enskild varning får bära för stor del av träffarna. */
export function enVarningDominerar(storsta: number, totalt: number): boolean {
  return totalt > 0 && storsta / totalt > MAX_EN_VARNING;
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

/** Svepets rad (kort #254 c, F-C4): under underlagsvakten bara räkningar — andelen och dess läge mot golv och tak är
 *  utfallet och visas först när spärren släppt (som V-B:s, DECISIONS #350). */
function faRad(kod: string, niva: string, t: { n: number; traff: number }, oppen: boolean): string {
  const andel = t.n ? t.traff / t.n : 0;
  const flagga = !oppen ? "spärrad" : t.traff === 0 ? "—" : andelOk(andel) ? "inom" : andel < ANDEL_GOLV ? "UNDER golv" : "ÖVER tak";
  return `  ${kod.padEnd(17)} ${niva.padEnd(11)} ${String(t.n).padStart(14)} ${String(t.traff).padStart(12)} ` +
    `${(oppen ? pct(t.traff, t.n) : "spärrad").padStart(8)}   ${flagga}`;
}

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — fukt (driftvakt), svepen, andelsfönstret och underlagsvakten\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Fukten: exakt motorns. "no"/"Dry" är uppehåll, okänd klass räknas som vått.
  k('fukt({snow:true})', fukt({ snow: true }), true);
  k('fukt({precipitation:"no"})', fukt({ precipitation: "no" }), false);
  k('fukt({precipitation:"Dry"})', fukt({ precipitation: "Dry" }), false);
  k('fukt({precipitation:"snow"})', fukt({ precipitation: "snow" }), true);
  k('fukt({})', fukt({}), false);
  // F1: SNOW_ICE ska träffa alla tre kodmängderna, WIND bara den bredaste.
  const trf = (m: string, kod: string) => new RegExp(m, "i").test(kod);
  k("SNOW_ICE i smalaste", trf(KODSVEP[0][1], "SNOW_ICE"), true);
  k("WIND i smalaste", trf(KODSVEP[0][1], "WIND"), false);
  k("WIND i bredaste", trf(KODSVEP[2][1], "WIND"), true);
  k("SNOW_ICE i bredaste", trf(KODSVEP[2][1], "SNOW_ICE"), true);
  k("WATER_SHORTAGE i bredaste", trf(KODSVEP[2][1], "WATER_SHORTAGE"), false);
  // F2: MESSAGE ska bara finnas i den vidaste nivåmängden.
  k("MESSAGE bara i alla", NIVASVEP.filter(([, n]) => n.includes("MESSAGE")).length, 1);
  k("RED i alla tre", NIVASVEP.filter(([, n]) => n.includes("RED")).length, 3);
  // F-A3: både golv och tak.
  k("andel 4 % faller (golvet)", andelOk(0.04), false);
  k("andel 5 % håller", andelOk(0.05), true);
  k("andel 80 % håller", andelOk(0.80), true);
  k("andel 81 % faller (TAKET)", andelOk(0.81), false);
  // Underlagsvakten.
  k("dom: för få timmar", dom(199, 100, "svar"), null);
  k("dom: för få områden", dom(5000, 19, "svar"), null);
  k("dom: båda räcker", dom(200, 20, "svar"), "svar");
  // F-A4.
  k("en varning med 26 % dominerar", enVarningDominerar(26, 100), true);
  k("en varning med 25 % gör det inte", enVarningDominerar(25, 100), false);
  k("noll träffar dominerar inte", enVarningDominerar(0, 0), false);
  // Kort #254 c: under spärren visar svepets rad ingen andel och inget läge mot golv och tak.
  k("spärrad rad visar ingen andel", faRad("SNOW|ICE", "YELLOW+", { n: 400, traff: 37 }, false).includes("%"), false);
  k("spärrad rad visar inget läge", /inom|golv|tak/.test(faRad("SNOW|ICE", "YELLOW+", { n: 400, traff: 37 }, false)), false);
  k("öppen rad visar andelen", faRad("SNOW|ICE", "YELLOW+", { n: 400, traff: 37 }, true).includes("%"), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: fukten är motorns, WIND syns bara i den breda kodmängden,");
  console.log("andelen har både golv och tak, och vakten släpper inte igenom tunt underlag.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

console.log(`Steg 0 för kort #95 (d) — SMHI-förstärkaren, grind F-A (${DAGAR} dygns fönster)\n`);

// VAKTDIAGNOSEN FÖRST (DECISIONS #141): bär stationssidan det den ska?
await vaktdiagnos(q, "weather_observations",
  `WHERE sample_time > now() - ${DAGAR} * interval '1 day'`, [
    { namn: "yttemperatur finns", bar: "surface_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: lufttemperatur finns", bar: "air_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: yta - luft >= -12 grader", bar: "surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL", villkor: "surface_temp_c >= air_temp_c - 12" },
    ...led234(),
    { namn: "fukt: nederbordsklass finns", bar: "precipitation IS NOT NULL OR rain OR snow", villkor: "true" },
  ]);

// ── A. INVENTERINGEN: vad bär varningsarkivet egentligen?
console.log(`A — INVENTERINGEN: vad finns i smhi_warnings_history?`);
const inv = (await q(`SELECT count(*)::int AS rader,
    count(DISTINCT area_id)::int AS omraden,
    count(*) FILTER (WHERE geom IS NOT NULL)::int AS med_geom,
    count(*) FILTER (WHERE approx_start IS NOT NULL AND approx_end IS NOT NULL)::int AS med_fonster,
    min(published) AS forsta, max(published) AS sista
  FROM smhi_warnings_history WHERE published > now() - $1 * interval '1 day'`, [DAGAR]))[0];
console.log(`  ${inv.rader} rader · ${inv.omraden} områden · geom i ${pct(inv.med_geom, inv.rader)}`);
console.log(`  giltighetsfönster (approx_start+end) i ${pct(inv.med_fonster, inv.rader)} — resten får`);
console.log(`     schablonen ${OKAND_FONSTER_H} h efter publicering, vilket är en GISSNING (F-C3).`);
console.log(`  spann: ${inv.forsta ?? "–"} … ${inv.sista ?? "–"}`);

const koder = await q(`SELECT event_code, level_code, count(*)::int AS n
  FROM smhi_warnings_history WHERE published > now() - $1 * interval '1 day'
  GROUP BY 1,2 ORDER BY 3 DESC LIMIT 12`, [DAGAR]);
console.log(`  varningstyper i fönstret:`);
for (const r of koder) console.log(`    ${String(r.event_code).padEnd(18)} ${String(r.level_code).padEnd(9)} ${r.n}`);
if (!koder.length) console.log(`    (inga alls)`);

// FALSIFIERBARHETSVAKTEN (DECISIONS #71): finns det någon vintervarning att mäta på? Räknas per
// kodmängd, för ETT tal här är vilseledande — se varningen under tabellen.
console.log(`\n  varningar med geom per kodmängd i F1:`);
let bredast = 0;
for (const [namn, re] of KODSVEP) {
  const n = Number((await q(`SELECT count(*)::int AS n FROM smhi_warnings_history
    WHERE published > now() - $1 * interval '1 day' AND geom IS NOT NULL AND event_code ~* $2`,
    [DAGAR, re]))[0].n);
  console.log(`    ${namn.padEnd(17)} ${n}`);
  bredast = Math.max(bredast, n);
}
console.log(`  ⚠️  Läs WINTER_CODES-raden för hand. Ingestens regex matchar WIND, och därmed också`);
console.log(`     WIND_SEA — kuling till havs, som inte är en frysriskfråga alls. Ett högt tal där`);
console.log(`     tillsammans med noll i SNOW_ICE betyder "inga vintervarningar", inte "gott om dem".`);
if (bredast === 0) {
  console.log(`\n⊘ OAVGJORT — det finns ingen vintervarning i fönstret att mäta paret på.`);
  console.log(`  Det är ett UNDERLAGSBESKED, inte ett nej: september ger inga snöfallsvarningar.`);
  console.log(`  Grind F-A körs om vid de första vintervarningarna (TROSKLAR-SMHI-FORSTARKAREN §8).`);
  console.log(`  Migrationen sql/015 är gjord, så de varningarna kommer att bära sitt`);
  console.log(`  giltighetsfönster — vilket de som ligger i arkivet i dag inte gör.`);
  await pool.end();
  process.exit(0);
}

// ── B. PARET: hur stor del av de kvalificerande stationstimmarna täcks?
// Kvalificerande = motorns egen frysrisk (yta ≤ tröskeln OCH fukt), efter #75:s givarvakt.
const kvalSql = `
  WITH kval AS (
    SELECT station_id, date_trunc('hour', sample_time) AS h,
           (array_agg(geom ORDER BY sample_time))[1] AS geom
    FROM weather_observations
    WHERE sample_time > now() - $1 * interval '1 day'
      AND surface_temp_c IS NOT NULL AND surface_temp_c <= $2
      AND ${FUKT_SQL} AND ${GIVARVAKT}
    GROUP BY 1, 2
  )`;

const nammare = (await q(`${kvalSql} SELECT count(*)::int AS n FROM kval`, [DAGAR, 1]))[0];
console.log(`\nB — PARET: ${nammare.n} kvalificerande stationstimmar (yta ≤ 1 °C och fukt, efter givarvakten)`);
if (nammare.n === 0) {
  console.log(`\n⊘ OAVGJORT — inga kvalificerande stationstimmar alls i fönstret. Utan nämnare`);
  console.log(`  finns ingen andel att mäta. September, inte ett fel.`);
  await pool.end();
  process.exit(0);
}

async function traffar(kodRe: string, nivaer: string[], yta: number, fonsterH: number, avstandM: number) {
  const r = (await q(`${kvalSql}
    SELECT count(*)::int AS n,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM smhi_warnings_history w
        WHERE w.geom IS NOT NULL AND w.event_code ~* $3 AND w.level_code = ANY($4::text[])
          AND CASE WHEN w.approx_start IS NOT NULL AND w.approx_end IS NOT NULL
                   THEN kval.h < w.approx_end + $5 * interval '1 hour'
                    AND kval.h + interval '1 hour' > w.approx_start - $5 * interval '1 hour'
                   ELSE kval.h >= w.published - $5 * interval '1 hour'
                    AND kval.h < w.published + ($6 + $5) * interval '1 hour'
              END
          AND ST_DWithin(kval.geom::geography, w.geom::geography, $7)))::int AS traff
    FROM kval`, [DAGAR, yta, kodRe, nivaer, fonsterH, OKAND_FONSTER_H, avstandM]))[0];
  return { n: Number(r.n), traff: Number(r.traff) };
}

// ── C. GRIND F-A — underlagsvakten skrivs ut FÖRE tabellen (F-C4, kort #254 c); under spärren visar tabellen bara räkningar.
const bast = await traffar(KODSVEP[1][1], NIVASVEP[1][1], 1, 1, 0);
// Vilka områden bär träffarna, och bär ett enda område för mycket (F-A4)? En stationstimme kan
// täckas av flera överlappande områden, så summan per område kan överstiga antalet träffar —
// talet är ett dominansmått, inte en andel som summerar till hundra.
const omr = (await q(`${kvalSql},
  traff AS (
    SELECT kval.station_id, kval.h, w.area_id
    FROM kval JOIN smhi_warnings_history w
      ON w.geom IS NOT NULL AND w.event_code ~* $3 AND w.level_code = ANY($4::text[])
     AND CASE WHEN w.approx_start IS NOT NULL AND w.approx_end IS NOT NULL
              THEN kval.h < w.approx_end + interval '1 hour'
               AND kval.h + interval '1 hour' > w.approx_start - interval '1 hour'
              ELSE kval.h >= w.published - interval '1 hour'
               AND kval.h < w.published + ($5 + 1) * interval '1 hour'
         END
     AND ST_DWithin(kval.geom::geography, w.geom::geography, 0)
  )
  SELECT count(DISTINCT area_id)::int AS omraden, coalesce(max(n), 0)::int AS storsta
  FROM (SELECT area_id, count(*)::int AS n FROM traff GROUP BY area_id) x`,
  [DAGAR, 1, KODSVEP[1][1], NIVASVEP[1][1], OKAND_FONSTER_H]))[0];
const omraden = Number(omr?.omraden ?? 0);
const storsta = Number(omr?.storsta ?? 0);

console.log(`\nC — GRIND F-A`);
console.log(`  Domspärr: ≥ ${MIN_TIMMAR} förstärkta stationstimmar och ≥ ${MIN_OMRADEN} varningsområden.`);
console.log(`  Uppmätt: ${bast.traff} förstärkta stationstimmar, ${omraden} områden.`);
if (enVarningDominerar(storsta, bast.traff)) {
  console.log(`  ⚠️  F-A4: ett enda varningsområde bär ${storsta} av ${bast.traff} träffar`);
  console.log(`     (> ${100 * MAX_EN_VARNING} %) — då mäts en varning, inte en regel.`);
}
const utfall = dom(bast.traff, omraden, true);
const oppen = !!utfall;
if (!utfall) {
  console.log(`\n⊘ OAVGJORT — underlagsvakten håller. Det är ett underlagsbesked, inte ett nej.`);
  console.log(`  September har varken vintervarningar eller frostnätter i mängd. Grinden körs om`);
  console.log(`  vid de första vintervarningarna, och då bär varningarna sitt giltighetsfönster.`);
}

console.log(`\n  F1 × F2 vid yta ≤ 1 °C, fönster ±1 h, stationen INUTI området:`);
console.log(`  kodmängd          nivå        kvalificerande   förstärkta   andel   F-A3`);
for (const [kodNamn, kodRe] of KODSVEP) {
  for (const [nivaNamn, nivaer] of NIVASVEP) {
    const t = await traffar(kodRe, nivaer, 1, 1, 0);
    console.log(faRad(kodNamn, nivaNamn, t, oppen));
  }
}

console.log(`\n  Känslighet i F4 (tidsfönster) och F5 (avstånd), vid ${KODSVEP[1][0]} / ${NIVASVEP[1][0]}:`);
for (const h of FONSTERSVEP) {
  const t = await traffar(KODSVEP[1][1], NIVASVEP[1][1], 1, h, 0);
  console.log(`    fönster ±${h} h, inuti området        ${String(t.traff).padStart(8)} av ${t.n}  ${oppen ? `(${pct(t.traff, t.n)})` : "(andel spärrad)"}`);
}
for (const m of AVSTANDSVEP) {
  const t = await traffar(KODSVEP[1][1], NIVASVEP[1][1], 1, 1, m);
  console.log(`    fönster ±1 h, ≤ ${String(m / 1000).padStart(2)} km utanför  ${String(t.traff).padStart(8)} av ${t.n}  ${oppen ? `(${pct(t.traff, t.n)})` : "(andel spärrad)"}`);
}

if (utfall) {
  const andel = bast.traff / bast.n;
  const se = andelSe(andel, bast.n);
  console.log(`  Andel förstärkta: ${pct(bast.traff, bast.n)}${marginalPe(se)} (golv ${100 * ANDEL_GOLV} %, tak ${100 * ANDEL_TAK} %)`);
  // MARGINALVAKTEN (DECISIONS #128): andelen har BÅDA gränserna, så båda prövas mot bruset.
  const mot = grindutfall([utfallGolv(andel, ANDEL_GOLV, se), utfallTak(andel, ANDEL_TAK, se)]);
  console.log(`  ⇒ ${mot === "KLARAR" ? "F-A PASSERAD"
    : mot === "OAVGJORT" ? "⊘ OAVGJORT — andelen ligger inom bruset från en av gränserna"
    : andel < ANDEL_GOLV ? "F-A FALLER — regeln gör nästan ingenting"
    : "F-A FALLER — regeln säger bara 'det är vinter'"}`);
}
console.log(`\n  Att läsa med, alltid: varningsområdena är LÄN. En stor träffyta är inget bevis på`);
console.log(`  att regeln vet något om vägen — det är just vad taket i F-A3 finns för att fånga.`);
await pool.end();
