// SNÖFLINGAN PÅ EN HEL VINTER (kort #233, DECISIONS #296/#297, förregistrerad i #440 innan körningen; Bengt 2/10: "är snöflingan
// något att satsa på. gör en körning och se hur det skulle falla ut").
// Frågan, oförändrad sedan 21/9: hur stor andel av stationsregelns fyrningar (yta <= +1 °C och fukt, engine.ts) sker när LUFTEN ligger
// över +3 °C respektive +4 °C — alltså när bilens egen snöflinga är släckt och bara stationen ser faran?
// Underlaget: kuvösens vinter 2024/25 (Trafikverkets leverans, DECISIONS #438/#439), hela perioden, alla stationer med läge.
// Läser FYRNINGAR, inte utfall: ingen yta efter en tidpunkt läses, inget facit, ingen träff. Ingen tröskel och ingen kod ändras.
//
// Räknas exakt som 21/9 (scripts/matningar/snoflingan-2026-09-21.sql), två gånger:
//   A. som 21/9: bara #75 (luft finns och yta >= luft − 12)
//   B. HUVUDTALET: med alla fyra vakterna som snapshoten bär — #75, radvakten, karantänen och den långsamma vakten (snapshot-core.ts)
// Fukt som snapshoten: rain eller snow eller en klass som inte är "no"/"dry". I kuvösen kommer de ur nederbördskoderna 2/4/6 (#439);
// 3, 9 och −9 är NULL och räknas som torrt. Episod = stationens första ögonblick per natt, natt = middag till middag UTC. Broregeln
// (+3 °C) är inte med. Sessionen i UTC (CLAUDE.md, DECISIONS #439).
// Kör (i knappen kuvos, efter inläsningen och vakterna): DATABASE_URL=... node --experimental-strip-types <den här filen>
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string) => (await db.query(sql)).rows as any[];
const tal = (x: unknown) => (x === null || x === undefined ? "–" : Number(x).toLocaleString("sv-SE"));

// Kandidaterna: varje rad med yta <= +1 °C och luft. Vakterna räknas en gång per rad (karantänens delfråga träffar sql/029:s delindex).
await q(`CREATE TEMP TABLE kand AS
  SELECT w.station_id, w.sample_time, w.surface_temp_c AS yta, w.air_temp_c AS luft, ST_Y(w.geom) AS lat,
         ((w.sample_time - interval '12 hours') AT TIME ZONE 'UTC')::date AS natt,
         to_char(w.sample_time AT TIME ZONE 'UTC', 'YYYY-MM') AS manad,
         (w.rain OR w.snow OR (w.precipitation IS NOT NULL AND w.precipitation <> '' AND lower(w.precipitation) NOT IN ('no', 'dry'))) AS fukt,
         (w.surface_temp_c >= w.air_temp_c - 12) AS v75,
         (w.surface_temp_c >= w.air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("w")}) AS vall
  FROM weather_observations w
  WHERE w.surface_temp_c <= 1 AND w.air_temp_c IS NOT NULL`);
const [u] = await q(`SELECT min(sample_time) AS fran, max(sample_time) AS till, count(*) AS rader, count(DISTINCT station_id) AS stationer,
  count(*) FILTER (WHERE fukt) AS fukt, count(*) FILTER (WHERE v75) AS v75, count(*) FILTER (WHERE vall) AS vall FROM kand`);
const [arkiv] = await q(`SELECT count(*) AS rader, count(DISTINCT station_id) AS stationer FROM weather_observations`);
console.log("SNÖFLINGAN PÅ KUVÖSENS VINTER — fyrningar, inga utfall (DECISIONS #440)\n");
console.log(`Arkivet: ${tal(arkiv.rader)} rader, ${tal(arkiv.stationer)} stationer. Rader med yta ≤ +1 °C och luft: ${tal(u.rader)} ` +
  `(${tal(u.stationer)} stationer, ${new Date(u.fran).toISOString().slice(0, 16)} – ${new Date(u.till).toISOString().slice(0, 16)} UTC); ` +
  `varav fukt ${tal(u.fukt)}, klarar #75 ${tal(u.v75)}, klarar alla fyra vakterna ${tal(u.vall)}.`);

const episoder = (vakt: string, krav: string) => `
  WITH ep AS (SELECT DISTINCT ON (station_id, natt) station_id, natt, manad, lat, yta, luft FROM kand
              WHERE ${vakt} AND ${krav} ORDER BY station_id, natt, sample_time)`;
const andel = (villkor: string) => `round(100.0 * count(*) FILTER (WHERE ${villkor}) / NULLIF(count(*), 0), 1)`;

for (const [namn, vakt] of [["A. Som 21/9, bara #75", "v75"], ["B. HUVUDTALET, alla fyra vakterna", "vall"]] as const) {
  const [r] = await q(`${episoder(vakt, "fukt")}
    SELECT count(*) AS episoder, count(DISTINCT station_id) AS stationer, count(DISTINCT natt) AS natter,
           count(*) FILTER (WHERE luft > 3) AS over3, ${andel("luft > 3")} AS p3, count(*) FILTER (WHERE luft > 4) AS over4, ${andel("luft > 4")} AS p4,
           ${andel("luft > 0")} AS p0, ${andel("luft > 1")} AS p1, ${andel("luft > 2")} AS p2, ${andel("luft > 5")} AS p5,
           round(avg(luft - yta)::numeric, 2) AS gap, percentile_cont(0.5) WITHIN GROUP (ORDER BY luft) AS luft_median,
           min(luft) AS luft_min, max(luft) AS luft_max FROM ep`);
  console.log(`\n${namn}: ${tal(r.episoder)} episoder vid ${tal(r.stationer)} stationer under ${tal(r.natter)} nätter`);
  console.log(`  luft > +3 °C: ${tal(r.over3)} (${tal(r.p3)} %) · luft > +4 °C: ${tal(r.over4)} (${tal(r.p4)} %)`);
  console.log(`  luften vid fyrningen: > 0: ${tal(r.p0)} % · > 1: ${tal(r.p1)} % · > 2: ${tal(r.p2)} % · > 3: ${tal(r.p3)} % · > 4: ${tal(r.p4)} % · > 5: ${tal(r.p5)} %`);
  console.log(`  median luft ${tal(r.luft_median)} °C (min ${tal(r.luft_min)}, max ${tal(r.luft_max)}), medel luft − yta ${tal(r.gap)} °C`);
}

const [h] = await q(`WITH t AS (SELECT station_id, date_trunc('hour', sample_time) AS h, min(luft) AS luft FROM kand WHERE vall AND fukt GROUP BY 1, 2)
  SELECT count(*) AS timmar, count(*) FILTER (WHERE luft > 3) AS over3, ${andel("luft > 3")} AS p3,
         count(*) FILTER (WHERE luft > 4) AS over4, ${andel("luft > 4")} AS p4 FROM t`);
console.log(`\nC. Stationstimmar med fyrning (alla fyra vakterna, timmens lägsta luft): ${tal(h.timmar)} · luft > +3: ${tal(h.over3)} (${tal(h.p3)} %) · luft > +4: ${tal(h.over4)} (${tal(h.p4)} %)`);

console.log("\nD. Per månad (B): månad · episoder · luft > +3 · luft > +4");
for (const r of await q(`${episoder("vall", "fukt")} SELECT manad, count(*) AS n, ${andel("luft > 3")} AS p3, ${andel("luft > 4")} AS p4 FROM ep GROUP BY 1 ORDER BY 1`))
  console.log(`  ${r.manad} · ${tal(r.n)} · ${tal(r.p3)} % · ${tal(r.p4)} %`);

console.log("\nE. Per breddgrad (B): band · episoder · stationer · luft > +3 · luft > +4");
for (const r of await q(`${episoder("vall", "fukt")} SELECT CASE WHEN lat < 58 THEN '1: under 58 °N' WHEN lat < 62 THEN '2: 58–62 °N' ELSE '3: över 62 °N' END AS band,
    count(*) AS n, count(DISTINCT station_id) AS s, ${andel("luft > 3")} AS p3, ${andel("luft > 4")} AS p4 FROM ep GROUP BY 1 ORDER BY 1`))
  console.log(`  ${r.band.slice(3)} · ${tal(r.n)} · ${tal(r.s)} · ${tal(r.p3)} % · ${tal(r.p4)} %`);

const [f] = await q(`${episoder("vall", "yta <= 0")}
  SELECT count(*) AS n, count(DISTINCT station_id) AS s, count(*) FILTER (WHERE luft > 3) AS over3, ${andel("luft > 3")} AS p3,
         ${andel("luft > 4")} AS p4, ${andel("luft > 0")} AS p0, round(avg(luft - yta)::numeric, 2) AS gap FROM ep`);
console.log(`\nF. Sammanhanget, utan fuktkravet (B): frostepisoder med yta ≤ 0 °C: ${tal(f.n)} vid ${tal(f.s)} stationer · luft > +3: ${tal(f.over3)} (${tal(f.p3)} %) · ` +
  `luft > +4: ${tal(f.p4)} % · luft över noll: ${tal(f.p0)} % · medel luft − yta ${tal(f.gap)} °C`);
await db.end();
