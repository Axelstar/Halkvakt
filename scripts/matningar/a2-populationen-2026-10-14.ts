// A2:s POPULATION — var på yttemperaturskalan de grova felen ligger (DECISIONS #554, Bengts
// "läs A2:s population" 14/10).
//
// VARFÖR. En rad i grind A:
//
//     const dec = rows.filter((r) => r.measured >= -5);   // decision band −5…+5
//
// A1 räknas i beslutsbandet −5…+5 °C. A2 och A3 räknas över ALLA rader i populationen
// (uppmätt yta ≤ +5 °C), alltså också under −5 °C — där koden själv säger att vi är utanför
// beslutsbandet. Vid −15 °C är ett tvågradersfel ofarligt: vägen är frusen hur som helst.
// Och i det varma hörnet, +3…+5 °C, kan ingenting fyra: frysriskbetan kräver att ytan ligger
// mellan +1 och +3 °C och har fallit minst 0,8 °C på 30 minuter.
//
// Frågan är alltså inte om modellen är bra. Den är om A2 — det mått som FALLER för
// vägpunktsgrinden (6,9 %, DECISIONS #399) och för FYSIK (#485) — räknar fel i rader som
// inte kan skada någon.
//
// INGEN DOM. Inga trösklar rörs, ingen kod i driften ändras, och ingen dom skrivs om.
// TROSKLAR-SKUGGAN §3 gäller oförändrat. Läsningen ger ett underlag för EN fråga till Bengt
// och Axel: vilken population A2 ska ha. Det valet är deras, inte läsningens.
//
// BANDEN ÄR INTE VALDA EFTER UTFALL. Varje gräns kommer ur en källa som fanns före körningen:
//   < −5 °C     utanför A1:s eget beslutsband (publish/grind-a.ts, raden ovan)
//   −5…−1 °C    fruset, inom beslutsbandet
//   −1…+1 °C    frysklassens avgörande (A3 mäter 2 °C tvärs över gränsen)
//   +1…+3 °C    där frysriskbetan KAN fyra (DECISIONS #186/#222: +1…+3 °C med fall ≥ 0,8 °C/30 min)
//   +3…+5 °C    i populationen, men ingenting kan fyra där
//
// FÖRVÄNTNINGAR, SKRIVNA FÖRE KNAPPEN (DECISIONS #554):
//   andel av populationen i +3…+5 °C ........ 25–50 %
//   andel av de grova felen i +3…+5 °C ...... 15–40 %
//   andel av de grova felen under −5 °C ..... 0–8 %
//   A2 i beslutsbandet −5…+5 mot A2 alla .... 0,2–2,0 pe lägre
//   A2 i −5…+3 mot A2 alla .................. 0,5–3,0 pe lägre
// Faller ett tal utanför sitt spann läses POPULATIONEN först, inte slutsatsen.
//
// DRIFTVAKT. Både beslutsbandets gräns (−5), grovfelströskeln (> 2 °C) och A2:s tak läses ur
// grind A:s egen källa i självtestet. Ändras de där utan att de ändras här blir jobbet rött —
// läxan om en grind som lånar en annan grinds trösklar utan att låna dess vakter.
//
// Självtest (ingen databas): a2-populationen-2026-10-14.ts --sjalvtest
// Skarpt (läser bara):       DATABASE_URL=... a2-populationen-2026-10-14.ts [dygn]

import { readFileSync } from "node:fs";
import { evaluate, stats, type Eval, type Station } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const BUCKET_S = 1800;
const DEC_LO = -5;          // beslutsbandets undre gräns i grind A
const POP_HI = 5;           // populationens tak: uppmätt yta ≤ +5 °C
const BETA_HI = 3;          // frysriskbetans övre gräns

/** Banden på UPPMÄTT yta. lo inklusive, hi exklusive; sista bandet tar taket med. */
const YTBAND: [string, number, number][] = [
  ["< −5", -Infinity, DEC_LO], ["−5…−1", DEC_LO, -1], ["−1…+1", -1, 1],
  ["+1…+3", 1, BETA_HI], ["+3…+5", BETA_HI, Infinity]];

const grovt = (r: Eval) => Math.abs(r.pred - r.measured) > 2;

/** Per band: antal, andel av populationen, A2 i bandet, och bandets andel av ALLA grova fel. */
export function delaPaYta(evals: Eval[]) {
  const nGrova = evals.filter(grovt).length;
  return YTBAND.map(([namn, lo, hi]) => {
    const rader = evals.filter((r) => r.measured >= lo && r.measured < hi);
    const g = rader.filter(grovt).length;
    return { namn, n: rader.length, andelPop: evals.length ? rader.length / evals.length : NaN,
             a2: rader.length ? g / rader.length : NaN, andelGrova: nGrova ? g / nGrova : NaN };
  });
}

function rapport(evals: Eval[], etikett: string): void {
  const tot = stats(evals);
  console.log(`\n═══ A2:s population — ${etikett} ═══`);
  console.log(`${evals.length} mätpunkter, ${new Set(evals.map((e) => e.station)).size} stationer`);
  console.log(`\nuppmätt yta   punkter   av populationen   A2 i bandet   av alla grova fel`);
  for (const b of delaPaYta(evals)) {
    console.log(`${b.namn.padEnd(12)} ${String(b.n).padStart(8)}   ${(b.andelPop * 100).toFixed(1).padStart(14)} %` +
      `   ${(b.n ? (b.a2 * 100).toFixed(1) + " %" : "—").padStart(11)}   ${(b.andelGrova * 100).toFixed(1).padStart(16)} %`);
  }
  // De tre talen frågan handlar om. Samma mått, tre populationer.
  const iBand = (lo: number, hi: number) => stats(evals.filter((r) => r.measured >= lo && r.measured < hi));
  const dec = iBand(DEC_LO, Infinity), beta = iBand(DEC_LO, BETA_HI);
  console.log(`\nA2 över ALLA rader (dagens tal) ....... ${(tot.gross * 100).toFixed(1)} %  (${tot.n} punkter)`);
  console.log(`A2 i beslutsbandet −5…+5 (A1:s) ...... ${(dec.gross * 100).toFixed(1)} %  (${dec.n} punkter)` +
    `   skillnad ${((tot.gross - dec.gross) * 100).toFixed(2)} pe`);
  console.log(`A2 i −5…+3 (där något kan fyra) ...... ${(beta.gross * 100).toFixed(1)} %  (${beta.n} punkter)` +
    `   skillnad ${((tot.gross - beta.gross) * 100).toFixed(2)} pe`);
  console.log(`\nIngen dom. Talen är underlag för frågan om vilken population A2 ska ha (DECISIONS #554).`);
}

// ── Självtest (ingen databas).
const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    const bra = JSON.stringify(fick) === JSON.stringify(vantat);
    if (!bra) ok = false;
    console.log(`${bra ? "✓" : "✗"} ${namn}${bra ? "" : `  fick ${JSON.stringify(fick)}, väntade ${JSON.stringify(vantat)}`}`);
  };
  // Tio punkter med känd yta och känt fel: ett grovt fel i varje band utom −1…+1.
  const rad = (measured: number, fel: number): Eval =>
    ({ measured, pred: measured + fel, ankKm: 1, station: "S", t: 0, spridning: 0, ankare: 1 });
  const rader: Eval[] = [
    rad(-9, 3), rad(-7, 0),          // < −5: ett grovt av två
    rad(-3, 3), rad(-2, 0),          // −5…−1: ett grovt av två
    rad(0, 0), rad(-0.5, 0),         // −1…+1: inga grova
    rad(2, 3), rad(1.5, 0),          // +1…+3: ett grovt av två
    rad(4, 3), rad(4.5, 3),          // +3…+5: två grova av två
  ];
  const d = delaPaYta(rader);
  k("fem band", d.map((b) => b.namn), ["< −5", "−5…−1", "−1…+1", "+1…+3", "+3…+5"]);
  k("varje band får sina två punkter", d.map((b) => b.n), [2, 2, 2, 2, 2]);
  k("A2 per band", d.map((b) => Math.round(b.a2 * 100)), [50, 50, 0, 50, 100]);
  k("andelarna av de fem grova summerar till 100 %", Math.round(d.reduce((a, b) => a + b.andelGrova, 0) * 100), 100);
  k("+3…+5 bär 2 av 5 grova fel", Math.round(d[4].andelGrova * 100), 40);
  k("gränsen är exklusiv uppåt: −1 hamnar i −1…+1", delaPaYta([rad(-1, 0)]).map((b) => b.n), [0, 0, 1, 0, 0]);
  // DRIFTVAKT: beslutsbandet, grovfelströskeln och A2:s tak läses ur grind A:s källa.
  const ga = readFileSync(new URL("../../publish/grind-a.ts", import.meta.url), "utf8");
  k("beslutsbandets gräns = grind A:s", DEC_LO, Number(ga.match(/r\.measured >= (-?\d+)/)?.[1]));
  k("grovfelströskeln = grind A:s", 2, Number(ga.match(/Math\.abs\(r\.pred - r\.measured\) > (\d+)/)?.[1]));
  k("A2:s tak oförändrat", 0.05, Number(ga.match(/A2_MAX_GROSS = (\d*\.?\d+)/)?.[1]));
  k("populationens tak = grind A:s beslutsbandskommentar", POP_HI, Number(ga.match(/decision band −5…\+(\d)/)?.[1]));
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: banden delar rätt, andelarna summerar, och gränserna lästes ur grind A:s källa.");
  process.exit(0);
}

// ── Skarpt (läser bara).
if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 60);
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  await pool.query("SET statement_timeout = '300s'");
  // Frågan är grind A:s, rad för rad, med dess fyra vakter — importerade, inte kopierade.
  const res = await pool.query(`
    SELECT DISTINCT ON (station_id, b) station_id,
      ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
      AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
  const stationer = new Map<string, Station>();
  for (const r of res.rows as any[]) {
    let s = stationer.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stationer.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  await pool.end();
  console.log(`A2:s population — ${stationer.size} stationer, ${res.rows.length} bucketade avläsningar, ${DAGAR} dygn bakåt`);
  // Underlagsvakt, samma skäl som grind A:s: grönt-men-tomt är felet ingen tröskel fångar.
  if (stationer.size < 100 || res.rows.length < 1000) {
    console.error(`UNDERLAGSVAKT: ${stationer.size} stationer / ${res.rows.length} avläsningar — hämtningen eller arkivet är trasigt.`);
    process.exit(1);
  }
  rapport(evaluate(stationer), `OFFSET — grind A:s egen modell, ${DAGAR} dygn`);
  rapport(evaluate(stationer, { utanOffset: true }), `RÅ — rå avståndsviktning, samma punkter`);
}
