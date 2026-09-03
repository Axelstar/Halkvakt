// Regn-30 (täthetsbeslutet a, kort #44, DECISIONS #62): ingest går :11 varje timme
// och fångar EN av stationernas två 30-min-regnsummor (regntäckningen mätte 78 %
// enbucket-timmar). Den här lätta körningen går i motfas (:41) och fångar den andra.
// Samma parser och samma INSERT som ingest — bara nederbördsrader skrivs (arkiv-
// dieten #4: torrt och ointressant lagras inte), ON CONFLICT DO NOTHING gör varje
// omkörning ofarlig. Bevisrad + eftermätning: regn-tackning ska visa 2/2-andelen
// stiga — beslutet är inte bokfört klart förrän den mätningen gjorts (rotationsläxan).
//
// Run: TRAFIKVERKET_API_KEY=... DATABASE_URL=... node --experimental-strip-types ingest/regn30.ts

import pg from "pg";
import { fetchWeather } from "./sources/weather.ts";

const apiKey = process.env.TRAFIKVERKET_API_KEY;
const url = process.env.DATABASE_URL;
if (!apiKey || !url) { console.error("TRAFIKVERKET_API_KEY / DATABASE_URL not set"); process.exit(1); }

const { items } = await fetchWeather(apiKey, "0");
const wet = items.filter(o => (o.rainSumMm ?? 0) > 0 || (o.snowWateqMm ?? 0) > 0 || o.rain || o.snow
  || (o.precipitation && o.precipitation !== "no"));

const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const col = <T,>(a: typeof wet, f: (x: (typeof wet)[number]) => T) => a.map(f);
const res = await pool.query(
  `INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c,
     air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow, rain_sum_mm, snow_wateq_mm)
   SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
          u.surface_temp_c, u.air_temp_c, u.dewpoint_c, u.humidity_pct, u.precipitation, u.rain, u.snow,
          u.rain_sum_mm, u.snow_wateq_mm
   FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],
               $7::numeric[],$8::numeric[],$9::numeric[],$10::text[],$11::bool[],$12::bool[],
               $13::numeric[],$14::numeric[])
        AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c,
             humidity_pct, precipitation, rain, snow, rain_sum_mm, snow_wateq_mm)
   ON CONFLICT (station_id, sample_time) DO NOTHING`,
  [col(wet, x => x.stationId), col(wet, x => x.name), col(wet, x => x.lon), col(wet, x => x.lat),
   col(wet, x => x.sampleTime), col(wet, x => x.surfaceTempC), col(wet, x => x.airTempC),
   col(wet, x => x.dewpointC), col(wet, x => x.humidityPct), col(wet, x => x.precipitation),
   col(wet, x => x.rain), col(wet, x => x.snow), col(wet, x => x.rainSumMm), col(wet, x => x.snowWateqMm)]);

// Bevisraden (fail-soft-läxan) + täthetspulsen: 2/2-andelen bland våta station-timmar
// senaste 3 h är siffran som ska stiga när motfasen verkar.
const puls = await pool.query(`
  SELECT count(*) FILTER (WHERE b >= 2) AS fulla, count(*) AS alla FROM (
    SELECT station_id, floor(extract(epoch FROM sample_time) / 3600),
           count(DISTINCT floor(extract(epoch FROM sample_time) / 1800)) AS b
    FROM weather_observations
    WHERE sample_time > now() - interval '3 hours' AND rain_sum_mm > 0
    GROUP BY 1, 2) t`);
await pool.end();
const { fulla, alla } = puls.rows[0];
console.log(`regn-30: ${items.length} stationer lästa, ${wet.length} med nederbörd, ${res.rowCount} nya rader skrivna (resten fanns redan)`);
console.log(`täthetspuls 3 h: ${fulla}/${alla} våta station-timmar har båda 30-min-buckets${alla > 0 ? ` (${(100 * fulla / alla).toFixed(0)} %)` : ""} — ska stiga mot ~100 % när motfasen verkat`);
