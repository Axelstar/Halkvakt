// SEKUNDERNA I KUVÖSENS TIDSSTÄMPLAR — HUR MÅNGA RADER TAPPAR 60-MINUTERSFÖNSTRET? (kort #232, DECISIONS #454; Bengts fråga 3/10:
// "hur många rader menar du att vi förlorar på totalen och har det någon verklig betydelse"). LÄS-ONLY på kuvösens vinter 2024/25.
//
// Trendens lutning (sql/018) kräver minst tre rader i ramen RANGE 60 minutes PRECEDING. Leveransen har en rad per station och
// halvtimme, stämplad hh:00:ss och hh:30:ss med sekunder 03–06. Raden en timme bakåt kommer med bara om dess sekunder är minst lika
// många som den aktuella radens. Mätningen räknar hur ofta det faller bort.
//
// Bestämt innan körningen (DECISIONS #454): bara tidsstämplar och antal läses — ingen lutning, ingen yta efter något, inget utfall.
//   (1) sekundernas fördelning, och hur många stationer som har samma sekund varje gång;
//   (2) andelen rader där 60-minutersramen har minst tre rader, mot samma ram vidgad till 62 minuter (då sekunderna inte spelar roll);
//       skillnaden är raderna som tappas av sekunderna. 30-minutersramen räknas också;
//   (3) samma sak för raderna i trendens bredaste startband (yta +1…+6 °C) — de enda som kan bli trendkandidater.
// Kör: knappen kuvos med inmatningen matning = den här filen.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string) => (await db.query(sql)).rows as any[];
const pct = (x: number, n: number) => `${(100 * x / (n || 1)).toFixed(1).replace(".", ",")} %`;

console.log("SEKUNDERNA I KUVÖSENS TIDSSTÄMPLAR (DECISIONS #454) — bara tidsstämplar och antal\n");

const sek = await q(`SELECT floor(extract(second FROM sample_time))::int AS s, count(*)::bigint AS n
  FROM weather_observations WHERE surface_temp_c IS NOT NULL GROUP BY 1 ORDER BY 1`);
const tot = sek.reduce((a, r) => a + Number(r.n), 0);
console.log(`(1) sekunderna: ${sek.map((r) => `${String(r.s).padStart(2, "0")} s: ${r.n} (${pct(Number(r.n), tot)})`).join(" · ")}`);
const [st] = await q(`SELECT count(*) AS stationer, count(*) FILTER (WHERE olika = 1) AS samma
  FROM (SELECT station_id, count(DISTINCT floor(extract(second FROM sample_time))) AS olika
        FROM weather_observations WHERE surface_temp_c IS NOT NULL GROUP BY station_id) x`);
console.log(`    stationer med samma sekund varje gång: ${st.samma} av ${st.stationer}\n`);

const ramar = (band: string) => `
  WITH b AS (SELECT station_id, sample_time, surface_temp_c FROM weather_observations WHERE surface_temp_c IS NOT NULL),
  r AS (SELECT surface_temp_c,
         count(*) OVER (PARTITION BY station_id ORDER BY sample_time RANGE BETWEEN interval '30 minutes' PRECEDING AND CURRENT ROW) AS n30,
         count(*) OVER (PARTITION BY station_id ORDER BY sample_time RANGE BETWEEN interval '60 minutes' PRECEDING AND CURRENT ROW) AS n60,
         count(*) OVER (PARTITION BY station_id ORDER BY sample_time RANGE BETWEEN interval '62 minutes' PRECEDING AND CURRENT ROW) AS n62
        FROM b)
  SELECT count(*)::bigint AS rader, count(*) FILTER (WHERE n30 >= 3)::bigint AS r30,
         count(*) FILTER (WHERE n60 >= 3)::bigint AS r60, count(*) FILTER (WHERE n62 >= 3)::bigint AS r62
  FROM r ${band}`;
for (const [namn, band] of [["(2) alla rader med yta", ""], ["(3) trendens startband, yta +1…+6 °C", "WHERE surface_temp_c >= 1 AND surface_temp_c <= 6"]] as const) {
  const [r] = await q(ramar(band));
  const tappas = Number(r.r62) - Number(r.r60);
  console.log(`${namn}: ${r.rader} rader`);
  console.log(`    30-minutersramen med minst tre rader: ${r.r30} (${pct(Number(r.r30), Number(r.rader))})`);
  console.log(`    en hel timme bakåt finns (ram 62 min): ${r.r62} (${pct(Number(r.r62), Number(r.rader))})`);
  console.log(`    60-minutersramen med minst tre rader: ${r.r60} (${pct(Number(r.r60), Number(r.rader))})`);
  console.log(`    TAPPAS AV SEKUNDERNA: ${tappas} rader = ${pct(tappas, Number(r.r62))} av raderna som har en hel timme bakåt\n`);
}
await db.end();
