// TRENDARKIVET — kort #88 steg 2 (TROSKLAR-TRENDEN §7, Bengts order 13/9 "bygga 88 och 98").
//
// VAD STEGET SKULLE VARA: "lutning + gap + band som tre kolumner i skuggloggen".
// VAD DET BLEV, OCH VARFÖR: en durabel kandidattabell i stället, skriven av en knapp.
//
//   · Skuggloggen skrivs av skuggmotorn, som läser SNAPSHOTEN — en ögonblicksbild utan historik.
//     Lutningen finns inte där och kan inte räknas där. Att lägga den i snapshoten hade krävt en
//     ändring i publicera OCH en deploy av två funktioner för ett fält ingen röst läser.
//   · Ett cron-jobb som räknar löpande är stängt sedan #85 och öppnas inte utan Bengts ord.
//   · Ingångarna finns däremot i arkivet — men bara i SJU DYGN. Gallringen (#83) tunnar äldre
//     rader till en per halvtimme, och då faller 15-minutersfönstret bort helt och 30-minuters på
//     trendens egen vakt. Underlaget är alltså färskvara, och höstens frostnätter går inte att ta igen.
//
// Alltså: knappen räknar kandidaterna INOM sju dygn och skriver dem durabelt. Vakthundens check 5
// larmar redan vid frost och säger "kör inom sju dygn" — samma disciplin som T-A redan lyder under.
// AVVIKELSEN FRÅN §7 ÄR ARKITEKTUR, INTE TRÖSKEL: svepet, vakterna och utfallsfönstret är
// dokumentets, oförändrade, och delas med T-A genom publish/trenden.ts.
//
// RISKEN SOM FÖLJER, utskriven för att den ska kunna vägas: trycks knappen inte inom sju dygn efter
// en frostnatt är den natten borta. En skrivande kolumn hade tagit bort den risken till priset av en
// deploy och ett jobb i drift. Vägvalet är Bengts; instrumentet är byggt så att båda vägarna är öppna.
//
// Run:      DATABASE_URL=... node --experimental-strip-types scripts/trendarkivet.ts [dagar=7]
// Torrkör:  ... scripts/trendarkivet.ts --torrkor      (räknar och rapporterar, skriver inget)
// Självtest utan DB: scripts/trendarkivet.ts --sjalvtest

import { FONSTER, BREDASTE_BAND, MINSTA_LUTNING, type Rad } from "../publish/trenden.ts";
import { arKandidat, utfall } from "../publish/trendkandidat.ts";

const UTFALLSFONSTER_MIN = 90;   // §2:s utfallsfönster, mitt i svepet 60·120·180
const MAX_DAGAR = 7;             // Ö-D:s syskon: bortom detta har gallringen ätit upplösningen

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — kandidaturvalet mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const natt: Rad[] = Array.from({ length: 13 }, (_, i) => {
    const yta = 5 - i * 0.4;
    return { t: i * 5, yta, dagg: yta - 0.3, rh: 95, luft: yta + 1 };
  });
  k("fallande natt ger kandidat i bandet", arKandidat(natt, 10) !== null, true);
  k("under bandets golv är ingen kandidat", arKandidat(natt, 12), null);
  k("platt natt ger ingen kandidat",
    arKandidat(Array.from({ length: 13 }, (_, i) => ({ t: i * 5, yta: 3, dagg: 2.8, rh: 95, luft: 4 })), 12), null);
  k("utfallet utan efterföljande rader är okänt", utfall(natt, 12, 90).min, null);
  k("supersetets band är svepets bredaste", BREDASTE_BAND.join("–"), "1–6");
  k("supersetets lutning är svepets minsta", MINSTA_LUTNING, 0.4);
  k("fönstren är svepets", FONSTER.join("·"), "15·30·60");
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: supersetet härleds ur svepet och släpper inte igenom platt väder.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const TORRKOR = process.argv.includes("--torrkor");
const DAGAR = Math.min(Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 7), MAX_DAGAR);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

console.log(`TRENDARKIVET — kandidater ur ${DAGAR} dygn${TORRKOR ? "  (TORRKÖRNING, inget skrivs)" : ""}\n`);
console.log(`  Fönstret är hårt taket ${MAX_DAGAR} dygn: bortom det har gallringen (#83) tunnat`);
console.log(`  arkivet till en rad per halvtimme, och 15-minutersfönstret finns inte längre.\n`);

// Tabellen skapas av knappen själv, som radarn gör (#162) — ingen separat migrationstryckning.
const migration = (await import("node:fs")).readFileSync(
  new URL("../sql/017_trend_kandidater.sql", import.meta.url), "utf8");
if (!TORRKOR) { await pool.query(migration); console.log("  sql/017 körd (idempotent)\n"); }

const rader = await q(`
  SELECT station_id, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' AND surface_temp_c IS NOT NULL
  ORDER BY station_id, sample_time`, [DAGAR]);
console.log(`  ${rader.length} arkivrader med yttemperatur, ${new Set(rader.map((r) => r.station_id)).size} stationer`);
if (!rader.length) { console.error("\nUNDERLAGSVAKT: arkivet är tomt i fönstret. Avbryter."); await pool.end(); process.exit(1); }

// Per station: bygg Rad[] i minuter sedan epok, plocka kandidater, räkna utfallet.
type Ut = { station: string; tid: Date; rad: Rad; lut: (number | null)[]; gap: number | null;
  minYta: number | null; utfallN: number };
const ut: Ut[] = [];
let station = "", grupp: { r: Rad; tid: Date }[] = [];
const tomGruppen = () => {
  const rad = grupp.map((g) => g.r);
  for (let i = 0; i < rad.length; i++) {
    const kand = arKandidat(rad, i);
    if (!kand) continue;
    const u = utfall(rad, i, UTFALLSFONSTER_MIN);
    ut.push({ station, tid: grupp[i].tid, rad: rad[i], lut: kand.lutningar, gap: kand.gap,
      minYta: u.min, utfallN: u.n });
  }
};
for (const r of rader) {
  if (r.station_id !== station) { tomGruppen(); station = r.station_id; grupp = []; }
  grupp.push({
    tid: r.sample_time,
    r: { t: new Date(r.sample_time).getTime() / 60000, yta: Number(r.surface_temp_c),
         dagg: r.dewpoint_c === null ? null : Number(r.dewpoint_c),
         rh: r.humidity_pct === null ? null : Number(r.humidity_pct),
         luft: r.air_temp_c === null ? null : Number(r.air_temp_c) },
  });
}
tomGruppen();

console.log(`  ${ut.length} kandidater (yta i ${BREDASTE_BAND[0]}–${BREDASTE_BAND[1]} °C, någon lutning ≥ ${MINSTA_LUTNING})`);
if (ut.length) {
  const stationer = new Set(ut.map((u) => u.station)).size;
  const utanUtfall = ut.filter((u) => !u.utfallN).length;
  const nadde0 = ut.filter((u) => u.minYta !== null && u.minYta <= 0).length;
  console.log(`  ${stationer} stationer · ${utanUtfall} utan mätt utfall (OKÄNT, inte "blev inte kallare")`);
  console.log(`  ${nadde0} kandidater följdes av yta ≤ 0 °C inom ${UTFALLSFONSTER_MIN} min`);
  const tider = ut.map((u) => new Date(u.tid).getTime()).sort();
  console.log(`  ${new Date(tider[0]).toISOString().slice(0, 16)} → ${new Date(tider[tider.length - 1]).toISOString().slice(0, 16)}`);
}

if (TORRKOR) {
  console.log("\nTORRKÖRNING: inget skrevs. Kör utan --torrkor för att spara kandidaterna.");
  await pool.end(); process.exit(0);
}

// Skrivningen är idempotent: en omkörning får aldrig dubblera (husregeln för ingesters).
let skrivna = 0;
for (let i = 0; i < ut.length; i += 500) {
  const bit = ut.slice(i, i + 500);
  const varden = bit.map((u, j) => {
    const b = j * 11;
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11})`;
  }).join(", ");
  const p = bit.flatMap((u) => [u.station, u.tid, u.rad.yta, u.rad.luft, u.rad.dagg, u.rad.rh,
    u.gap, u.lut[0], u.lut[1], u.lut[2], u.minYta === null ? null : u.minYta]);
  const r = await pool.query(
    `INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, air_temp_c, dewpoint_c,
       humidity_pct, dagg_gap_c, lutning15_c, lutning30_c, lutning60_c, min_yta_90min_c)
     VALUES ${varden} ON CONFLICT (station_id, observed_at) DO NOTHING`, p);
  skrivna += r.rowCount ?? 0;
}
// utfall_rader skrivs separat så INSERT-listan hålls läsbar; noll rader betyder OKÄNT.
for (let i = 0; i < ut.length; i += 500) {
  const bit = ut.slice(i, i + 500);
  await pool.query(
    `UPDATE trend_kandidater t SET utfall_rader = v.n
     FROM (SELECT unnest($1::text[]) AS s, unnest($2::timestamptz[]) AS o, unnest($3::int[]) AS n) v
     WHERE t.station_id = v.s AND t.observed_at = v.o AND t.utfall_rader IS DISTINCT FROM v.n`,
    [bit.map((u) => u.station), bit.map((u) => u.tid), bit.map((u) => u.utfallN)]);
}

const total = (await q("SELECT count(*)::int AS n, min(observed_at) AS forst, max(observed_at) AS sist FROM trend_kandidater"))[0];
console.log(`\n  SKRIVET: ${skrivna} nya rader (${ut.length - skrivna} fanns redan — omkörning dubblerar inte)`);
console.log(`  Arkivet rymmer nu ${total.n} kandidater, ${String(total.forst).slice(0, 16)} → ${String(total.sist).slice(0, 16)}`);
console.log("\n  Ingen dom. Inga trösklar valda. Raderna bär de MÄTTA storheterna så att hela");
console.log("  svepet kan prövas i efterhand — T-A väljer, arkivet minns.");

await pool.end();
