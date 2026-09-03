// Regntäckningen (Bengts täthetsfråga 3/9): stationerna räknar regn i 30-minuters-
// summor men ingest hämtar en gång i timmen och tar senaste observationen — tappar
// vi varannan bucket? Mätningen räknar, per station och timme, hur många av timmens
// två 30-min-buckets som faktiskt står i arkivet: 2 = full täckning, 1 = varannan
// summa tappad den timmen, 0 = ingenting. Två dataset: alla observationer (sample_time)
// och regnmätarna specifikt (rain_sum_mm). Nämnaren är timmar där NÅGON station har
// data — pipelinens egna körtimmar, inte kalendern (annars döms kolumnens ungdom,
// inte samplingen). Underlag för beslutet om tätare hämtning — ingen dom fälls här.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/regn-tackning.ts [dagar=7]
// Självtest utan DB: scripts/regn-tackning.ts --sjalvtest

type Rad = { station: string; h: number; b: number }; // b = distinkta 30-min-buckets den timmen

function tackning(rows: Rad[]) {
  const timmar = new Set(rows.map(r => r.h));
  const stationer = new Set(rows.map(r => r.station));
  const per = new Map<string, number>(); // "station:h" → b
  for (const r of rows) per.set(`${r.station}:${r.h}`, r.b);
  let h2 = 0, h1 = 0, h0 = 0, fangade = 0;
  for (const s of stationer)
    for (const h of timmar) {
      const b = per.get(`${s}:${h}`) ?? 0;
      if (b >= 2) h2++; else if (b === 1) h1++; else h0++;
      fangade += Math.min(b, 2);
    }
  const tot = 2 * stationer.size * timmar.size;
  return { timmar: timmar.size, stationer: stationer.size, h2, h1, h0, pct: tot ? 100 * fangade / tot : 0 };
}

function rapport(t: ReturnType<typeof tackning>, label: string) {
  const th = t.h2 + t.h1 + t.h0;
  console.log(`${label}: ${t.stationer} stationer × ${t.timmar} körtimmar`);
  console.log(`  2 buckets/timme: ${t.h2} (${th ? (100 * t.h2 / th).toFixed(0) : 0} %)   1: ${t.h1} (${th ? (100 * t.h1 / th).toFixed(0) : 0} %)   0: ${t.h0} (${th ? (100 * t.h0 / th).toFixed(0) : 0} %)`);
  console.log(`  bucket-täckning: ${t.pct.toFixed(0)} % av teoretiska 48/station-dygn`);
}

// ── Självtest med känd sanning, utan DB: A full i 10 h, B halv i 5 h och tyst i 5 h.
if (process.argv.includes("--sjalvtest")) {
  const rows: Rad[] = [];
  for (let h = 0; h < 10; h++) rows.push({ station: "A", h, b: 2 });
  for (let h = 0; h < 5; h++) rows.push({ station: "B", h, b: 1 });
  const t = tackning(rows);
  rapport(t, "SJÄLVTEST — A full 10 h, B halv 5 h + tyst 5 h");
  let ok = true;
  if (t.h2 !== 10 || t.h1 !== 5 || t.h0 !== 5) { console.error(`SJÄLVTEST: histogram ${t.h2}/${t.h1}/${t.h0}, väntat 10/5/5`); ok = false; }
  if (Math.abs(t.pct - 62.5) > 0.01) { console.error(`SJÄLVTEST: täckning ${t.pct}, väntat 62,5`); ok = false; }
  if (!ok) process.exit(1);
  console.log(`SJÄLVTEST OK: histogram och täckningsprocent återfinner den kända sanningen.`);
  process.exit(0);
}

// ── Skarpt.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 7);

const SQL = (filter: string) => `
  SELECT station_id AS station,
    floor(extract(epoch FROM sample_time) / 3600)::bigint AS h,
    count(DISTINCT floor(extract(epoch FROM sample_time) / 1800)::bigint)::int AS b
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' ${filter}
  GROUP BY 1, 2`;
const alla = await pool.query(SQL(""), [DAYS]);
const regn = await pool.query(SQL("AND rain_sum_mm IS NOT NULL"), [DAYS]);
await pool.end();

console.log(`Regntäckningen — fångar timhämtningen stationernas 30-min-buckets? (${DAYS} dygn bakåt)`);
console.log(`Arkivet: ${alla.rows.length} station-timmar totalt, ${regn.rows.length} med regnsumma\n`);
if (new Set(alla.rows.map((r: any) => r.station)).size < 100 || alla.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: för lite data — hämtningen eller arkivet är trasigt. Grön-men-tom räknas inte.`);
  process.exit(1);
}
rapport(tackning(alla.rows as Rad[]), "ALLA OBSERVATIONER (sample_time)");
console.log("");
rapport(tackning(regn.rows as Rad[]), "REGNMÄTARNA (rain_sum_mm)");
console.log(`\nLäsning: 2 buckets/timme = ingen förlust; 1 = varannan 30-min-summa tappas den timmen.`);
console.log(`Detta är underlag för beslutet om tätare hämtning — mätningen fäller ingen dom.`);
