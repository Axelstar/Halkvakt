// Regnbeviset (kort #42 steg 0a, körschemat §8; Axels ja via Bengt i chatten 2/9):
// bevisa mot VERKLIGHETEN vilka nederbörds-MÄNGDER WeatherMeasurepoint 2.1 levererar,
// och med vilken TÄCKNING (granskningens §7.1: ett fält kan finnas i schemat och ändå
// vara null på flertalet stationer — alla VViS har inte mängdgivare).
// Metod enligt RoadNumber-läxan: inga gissade INCLUDE-blad. Vi hämtar hela objekten
// och INSPEKTERAR nederbörds-underträden — varje numeriskt .Value-löv räknas per
// sökväg. Torrt väder är inget hinder: en station MED givare rapporterar 0.0
// (numeriskt), en utan givare saknar lövet helt.
//
// Kör (CI): TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/regn-bevis.ts
// Efter att mängdkolumnen byggts: sätt även DATABASE_URL så läses lagrade mängder
// tillbaka ur arkivet som slutbevis (kolumnen är inte klar förrän rader syns).

import { tvFetch } from "../ingest/trafikverket.ts";

const apiKey = process.env.TRAFIKVERKET_API_KEY;
if (!apiKey) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }

const { items } = await tvFetch<any>(apiKey, {
  objecttype: "WeatherMeasurepoint",
  schemaversion: "2.1",
  changeid: "0",
});
const alive = items.filter((w: any) => !w.Deleted);
console.log(`WeatherMeasurepoint 2.1: ${alive.length} stationer (full sync)`);
if (alive.length < 500) {
  console.error(`UNDERLAGSVAKT: bara ${alive.length} stationer — hämtningen är trasig (normalt ~845).`);
  process.exit(1);
}

// Räkna numeriska .Value-löv per sökväg i nederbörds-underträden.
type Agg = { n: number; min: number; max: number; nonZero: number };
const paths = new Map<string, Agg>();
function walk(node: any, path: string, seen: Set<string>) {
  if (node === null || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    const p = `${path}.${k}`;
    if (k === "Value" && typeof v === "number" && Number.isFinite(v)) {
      if (!seen.has(path)) {
        seen.add(path); // en station räknas en gång per fält
        let a = paths.get(path);
        if (!a) { a = { n: 0, min: Infinity, max: -Infinity, nonZero: 0 }; paths.set(path, a); }
        a.n++; a.min = Math.min(a.min, v); a.max = Math.max(a.max, v); if (v !== 0) a.nonZero++;
      }
    } else if (typeof v === "object") walk(v, p, seen);
  }
}
let weatherStr = 0;
for (const w of alive) {
  const seen = new Set<string>();
  walk(w?.Observation?.Aggregated10minutes?.Precipitation, "Aggregated10minutes.Precipitation", seen);
  walk(w?.Observation?.Aggregated30minutes?.Precipitation, "Aggregated30minutes.Precipitation", seen);
  if (typeof w?.Observation?.Weather?.Precipitation === "string") weatherStr++;
}

console.log(`\nTäckning per mängdfält (stationer med NUMERISKT värde just nu; 0.0 räknas — det bevisar givare):`);
console.log("fält                                                    stationer   andel   ≠0 nu      min…max");
const rows = [...paths.entries()].sort((a, b) => b[1].n - a[1].n);
for (const [p, a] of rows) {
  console.log(`${p.padEnd(55)} ${String(a.n).padStart(8)} ${(100 * a.n / alive.length).toFixed(0).padStart(6)} % ${String(a.nonZero).padStart(6)}  ${a.min.toFixed(1).padStart(7)}…${a.max.toFixed(1)}`);
}
if (!rows.length) console.log("(inga numeriska mängdfält alls i nederbörds-underträden)");
console.log(`(jämförelse: typsträngen Weather.Precipitation, som vi redan lagrar: ${weatherStr} stationer)`);

const best = rows[0];
console.log(best && best[1].n >= alive.length * 0.5
  ? `\nBEVIS: mängd finns med täckning ${(100 * best[1].n / alive.length).toFixed(0)} % (${best[0]}) — kolumnen byggs mot detta fält.`
  : `\nBEVIS SAKNAS: inget mängdfält når 50 % täckning — kort #42:s regntrigger måste omprövas (SMHI/radar i stället).`);

// Slutbevis efter kolumnbygget: läs tillbaka lagrade mängder ur arkivet.
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: dbUrl, max: 1, ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  try {
    const r = await pool.query(`
      SELECT count(*) FILTER (WHERE rain_sum_mm IS NOT NULL) AS med_mangd,
             count(DISTINCT station_id) FILTER (WHERE rain_sum_mm IS NOT NULL) AS stationer,
             max(sample_time) FILTER (WHERE rain_sum_mm IS NOT NULL) AS senaste
      FROM weather_observations WHERE sample_time > now() - interval '24 hours'`);
    const x = r.rows[0];
    console.log(`\nARKIVET (senaste dygnet): ${x.med_mangd} rader med rain_sum_mm från ${x.stationer} stationer, senaste ${x.senaste ?? "—"}.`);
  } catch (e) {
    console.log(`\nARKIVET: rain_sum_mm finns inte än (${String((e as Error).message).slice(0, 80)}) — kolumnbygget återstår.`);
  }
  await pool.end();
}
