// KUVÖSENS VAKTER SOM ANTAL (kort #232, PLAN-KUVOSEN steg 3: "vakterna körda och redovisade som antal", DECISIONS #439).
// Kör den långsamma vakten över hela vintern (samma funktion som driften, sql/030 — backfill = långt fönster) och räknar hur många
// rader och stationer varje vakt tar: #75, radvakten, karantänen och den långsamma vakten, var för sig och tillsammans. Vakterna
// lånas ur publish/snapshot-core.ts som grindarna gör (DECISIONS #299); talet 12 står som i grind K-A och kontraktsgrinden vaktar det.
//
// Läser inget utfall: inga varningar, ingen yta efter en varning — bara vilka rader som får tala.
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/vakterna.ts
import { RADVAKT_SQL, karantanSql, brottSql, givarfelSql, KARANTAN_BROTT } from "../publish/snapshot-core.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
// UTC som Supabase: `interval '7 days'` på timestamptz räknas i sessionens zon, och över sommartiden 30/3 är sju dygn i
// Europe/Stockholm en timme kortare. Mätt 2/10: 20 karantänrader skilde mellan en lokal databas i svensk tid och Actions i UTC.
await db.query("SET TimeZone = 'UTC'");
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];

const [{ forst }] = await q(`SELECT min(sample_time) AS forst FROM weather_observations`);
const [{ dygn }] = await q(`SELECT langsam_vakt(now() - $1::timestamptz + interval '1 day') AS dygn`, [forst]);
console.log(`den långsamma vakten (sql/030) över hela vintern: ${dygn} stationsdygn skrivna till givarfel_dygn`);

const B75 = `NOT (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)`;   // brott mot #75 (WX_SANE:s led)
const RAD = `NOT ${RADVAKT_SQL}`;
const KAR = `${brottSql("w")} >= ${KARANTAN_BROTT}`;
const LANG = givarfelSql("w");
const [r] = await q(`
  SELECT count(*)::bigint AS rader,
         count(*) FILTER (WHERE surface_temp_c IS NULL)::bigint AS utan_yta,
         count(*) FILTER (WHERE surface_temp_c IS NOT NULL AND ${B75})::bigint AS b75,
         count(*) FILTER (WHERE surface_temp_c IS NOT NULL AND ${RAD})::bigint AS rad,
         count(*) FILTER (WHERE surface_temp_c IS NOT NULL AND ${KAR})::bigint AS kar,
         count(*) FILTER (WHERE surface_temp_c IS NOT NULL AND ${LANG})::bigint AS lang,
         count(*) FILTER (WHERE surface_temp_c IS NOT NULL AND NOT ${B75} AND NOT ${RAD} AND ${karantanSql("w")})::bigint AS talar,
         count(DISTINCT station_id) FILTER (WHERE surface_temp_c IS NOT NULL AND ${B75}) AS s75,
         count(DISTINCT station_id) FILTER (WHERE surface_temp_c IS NOT NULL AND ${RAD}) AS srad,
         count(DISTINCT station_id) FILTER (WHERE surface_temp_c IS NOT NULL AND ${KAR}) AS skar,
         count(DISTINCT station_id) FILTER (WHERE surface_temp_c IS NOT NULL AND ${LANG}) AS slang
  FROM weather_observations w`);
const pct = (n: number) => `${(Math.round((n / Number(r.rader)) * 10000) / 100).toLocaleString("sv-SE")} %`;
console.log(`rader i arkivet: ${r.rader} · utan yta: ${r.utan_yta} (${pct(r.utan_yta)})`);
console.log(`  #75 (ytan > 12 ° under luften):      ${r.b75} rader (${pct(r.b75)}), ${r.s75} stationer`);
console.log(`  radvakten (luft ≥ 10, gap ≥ 8):       ${r.rad} rader (${pct(r.rad)}), ${r.srad} stationer`);
console.log(`  karantänen (≥ ${KARANTAN_BROTT} brott på 7 dygn):     ${r.kar} rader (${pct(r.kar)}), ${r.skar} stationer`);
console.log(`  långsamma vakten (dygn i felet):     ${r.lang} rader (${pct(r.lang)}), ${r.slang} stationer`);
console.log(`  får tala efter alla fyra:            ${r.talar} rader (${pct(r.talar)})`);
await db.end();
