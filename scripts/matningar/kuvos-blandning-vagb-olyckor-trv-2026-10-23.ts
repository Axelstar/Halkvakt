// OLYCKORNA 2024/25 MOT KUVÖSEN — LÄSNINGEN (DECISIONS #697; docs/FORREGISTRERING-OLYCKOR-2024-25.md). LÄSER UTFALL. Vägrar utan
// båda signaturerna i förregistreringen; samma spärr står först i kuvos.yml, så att fysikkedjans tre timmar inte körs förgäves. Namnet
// ger jobbet väg B varv 1 (fysik/niva2/vagb.py och fysik/blandning/vagb_blandning.py, som facitläsningen) och olycksfilen i trv/ med
// manifestets summa (kuvos/trv-111808-leverans.json, 'komplettering'). Indata:
//   fråga (a)  kandidaten NIVÅ 2 ÄRLIG+BLANDNING med identitetsprovet mot körning 38368369876 (#597), stationernas egna kalla timmar
//              vid kandidatens stationer, efterhalkans fyrningar och stationernas lägen: forbered() i facitläsningens skript, alltså
//              samma populationer som väglagsläsningen (§4);
//   fråga (b)  kuvösens VViS-rader 1/11 2024–31/3 2025 (§5), alla halvtimmar: per station och UTC-timme den högsta byvinden
//              (wind_gust_ms = vimax) och den lägsta sikten (visibility_m = siktdjup, där −100 redan är NULL i kuvos/oversattning.sql),
//              och stationsvaktens omöjliga timmar med driftens SQL ur scripts/vindsikt-steg0.ts (#164).
// Utskriften och artefakten (olyckor-ut/) är aggregat; fritexten och platsen skrivs aldrig ut (PUBLIKT REPO).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb-olyckor-trv-2026-10-23.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { forbered } from "./kuvos-blandning-vagb-facit-trv-2026-10-16.ts";
import { FORREG, lasning, sparr, type Stationstimmar } from "../../kuvos/olyckor-trv.ts";
import { PERIOD_START, PERIOD_SLUT } from "../../kuvos/facit-trv.ts";
import { BYVIND_GOLV, BYKVOT_TAK } from "../vindsikt-steg0.ts";

/** Stationstimmarna i perioden ($1, $2): timmens högsta byvind och lägsta sikt som W-A:s band (max och min hoppar över NULL), och
 *  stationsvakten som i driften: timmens högsta by och högsta medelvind ur raderna som bär båda, omöjlig när byn når BYVIND_GOLV och
 *  kvoten överstiger BYKVOT_TAK. Läget är stationens första i perioden (kuvösen sätter det ur stationslistan, ett per station). */
export const STATIONSTIMMAR_SQL = `
  WITH t AS (
    SELECT station_id, floor(extract(epoch FROM sample_time) / 3600)::int AS h,
           max(wind_gust_ms) AS byvind, min(visibility_m) AS sikt,
           max(wind_gust_ms) FILTER (WHERE wind_speed_ms IS NOT NULL) AS vby,
           max(wind_speed_ms) FILTER (WHERE wind_gust_ms IS NOT NULL) AS vmedel
    FROM weather_observations
    WHERE sample_time >= $1::timestamptz AND sample_time < $2::timestamptz AND (wind_gust_ms IS NOT NULL OR visibility_m IS NOT NULL)
    GROUP BY 1, 2),
  p AS (
    SELECT DISTINCT ON (station_id) station_id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM weather_observations
    WHERE geom IS NOT NULL AND sample_time >= $1::timestamptz AND sample_time < $2::timestamptz
    ORDER BY station_id, sample_time)
  SELECT t.station_id, p.lon, p.lat,
         count(*) FILTER (WHERE vby >= ${BYVIND_GOLV} AND vmedel > 0 AND vby / vmedel > ${BYKVOT_TAK})::int AS omojliga,
         array_agg(t.h ORDER BY t.h) AS h, array_agg(t.byvind::float8 ORDER BY t.h) AS byvind, array_agg(t.sikt::float8 ORDER BY t.h) AS sikt
  FROM t JOIN p USING (station_id)
  GROUP BY t.station_id, p.lon, p.lat`;

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  k(STATIONSTIMMAR_SQL.includes("max(wind_gust_ms) AS byvind, min(visibility_m) AS sikt"), "byvinden är timmens högsta vimax och sikten timmens lägsta siktdjup (§5)");
  k(STATIONSTIMMAR_SQL.includes("max(wind_gust_ms) FILTER (WHERE wind_speed_ms IS NOT NULL) AS vby")
    && STATIONSTIMMAR_SQL.includes("max(wind_speed_ms) FILTER (WHERE wind_gust_ms IS NOT NULL) AS vmedel")
    && STATIONSTIMMAR_SQL.includes("vby >= 15 AND vmedel > 0 AND vby / vmedel > 5"),
    "stationsvakten som driftens SQL: raderna med både by och medel, byn ≥ 15 m/s och kvoten över 5 (#164)");
  k(STATIONSTIMMAR_SQL.includes("floor(extract(epoch FROM sample_time) / 3600)::int AS h") && STATIONSTIMMAR_SQL.includes("sample_time < $2::timestamptz"),
    "timmen är UTC-timmen, perioden halvöppen");
  k(new Date(PERIOD_START).toISOString() === "2024-10-31T23:00:00.000Z" && new Date(PERIOD_SLUT).toISOString() === "2025-03-31T22:00:00.000Z",
    "perioden 1/11 2024 00:00 till 31/3 2025 24:00 svensk tid, som facitläsningen");
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: kuvos-blandning-vagb-olyckor-trv");
}

/** Kuvösens stationstimmar för fråga (b). Antalen skrivs ut; inga värden. */
async function stationstimmar(): Promise<Stationstimmar[]> {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const period = [new Date(PERIOD_START).toISOString(), new Date(PERIOD_SLUT).toISOString()];
  const [{ negativ }] = (await db.query(`SELECT count(*)::int AS negativ FROM weather_observations
    WHERE visibility_m < 0 AND sample_time >= $1::timestamptz AND sample_time < $2::timestamptz`, period)).rows;
  const rader = (await db.query(STATIONSTIMMAR_SQL, period)).rows as any[];
  await db.end();
  const st: Stationstimmar[] = rader.map((r) => ({ station: String(r.station_id), lon: Number(r.lon), lat: Number(r.lat), omojliga: Number(r.omojliga),
    h: (r.h as unknown[]).map(Number), byvind: r.byvind, sikt: r.sikt }));
  const n = (f: (s: Stationstimmar, i: number) => boolean) => st.reduce((s, x) => s + x.h.filter((_, i) => f(x, i)).length, 0);
  console.log(`  stationstimmarna (§5): ${n(() => true)} vid ${st.length} stationer; med byvind ${n((s, i) => s.byvind[i] !== null)}, med sikt ` +
    `${n((s, i) => s.sikt[i] !== null)}; stationer med en omöjlig timme (stationsvakten): ${st.filter((s) => s.omojliga > 0).length}; ` +
    `rader med sikt under 0 m i perioden: ${negativ} (−100 är NULL i kuvos/oversattning.sql)`);
  return st;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) sjalvtest();
else if (korsSjalv) {
  const forreg = readFileSync(FORREG, "utf8"), fel = sparr(forreg);
  if (fel) { console.error(fel); process.exit(2); }
  const ind = await forbered("OLYCKORNA 2024/25 MOT KUVÖSEN (DECISIONS #697) — facit för kandidaten och efterhalkan, och W-A:s andra serie. " +
    "Sikten avgörs här (§5); allt annat är diagnos.");
  lasning({ xlsx: "trv/Olyckor24-25.xlsx", forreg, kandidat: ind.kandidat, kalla: ind.kalla, fyrningar: ind.fyrningar, stationer: ind.stationer,
    stationstimmar: await stationstimmar(), ut: "olyckor-ut" });
}
