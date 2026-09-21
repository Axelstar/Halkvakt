-- GIVARVAKTENS KANDIDATER (kort #234, DECISIONS #298, Bengts order 21/9: "välj den gräns du tycker är mest logisk").
-- Trasiga ytgivare pendlar kring #75:s gräns (yta >= luft − 12) och slinker igenom. Frågan: vilken TILLÄGGSVAKT skiljer
-- givarfelen från äkta kyla — utan att röra talet 12 och utan att tysta blixthalkan (varmfront över frusen väg)?
-- Population: rader som i dag KAN publiceras som kalla — yta <= +3 °C och förbi #75:s vakt. Bara läsande.
-- Sats 1: var ligger raderna, lufttemperatur × gap (luft − yta)? Sats 2: mellanzonen, station för station.
-- Sats 3: vad tar varje kandidat (luft >= A OCH gap >= G)? Sats 4: samma stationer ovanför 12 — är det samma givare?
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '300s'

WITH r AS (SELECT station_id, (sample_time AT TIME ZONE 'UTC')::date AS dag, air_temp_c AS luft, air_temp_c - surface_temp_c AS gap FROM weather_observations WHERE sample_time > now() - interval '60 days' AND surface_temp_c <= 3 AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12) SELECT CASE WHEN luft < 0 THEN 'a luft under 0' WHEN luft < 3 THEN 'b 0-3' WHEN luft < 5 THEN 'c 3-5' WHEN luft < 8 THEN 'd 5-8' WHEN luft < 10 THEN 'e 8-10' ELSE 'f 10 och over' END AS luftklass, CASE WHEN gap < 3 THEN '1 gap under 3' WHEN gap < 5 THEN '2 3-5' WHEN gap < 8 THEN '3 5-8' WHEN gap < 10 THEN '4 8-10' ELSE '5 10-12' END AS gapklass, count(*) AS rader, count(DISTINCT station_id) AS stationer, count(DISTINCT (station_id, dag)) AS stationsdagar FROM r GROUP BY 1, 2 ORDER BY 1, 2

WITH r AS (SELECT station_id, name, (sample_time AT TIME ZONE 'UTC')::date AS dag, surface_temp_c AS yta, air_temp_c AS luft, air_temp_c - surface_temp_c AS gap FROM weather_observations WHERE sample_time > now() - interval '60 days' AND surface_temp_c <= 3 AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND air_temp_c - surface_temp_c >= 5) SELECT station_id, name, count(DISTINCT dag) AS dagar, count(*) AS rader, min(luft) AS luft_min, max(luft) AS luft_max, min(yta) AS yta_min, max(yta) AS yta_max, min(gap) AS gap_min, max(gap) AS gap_max FROM r GROUP BY 1, 2 ORDER BY dagar DESC, rader DESC

WITH r AS (SELECT station_id, air_temp_c AS luft, air_temp_c - surface_temp_c AS gap FROM weather_observations WHERE sample_time > now() - interval '60 days' AND surface_temp_c <= 3 AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12), k(a, g) AS (VALUES (5, 8), (6, 8), (8, 8), (10, 8), (8, 6), (6, 6), (8, 10)) SELECT k.a AS luft_minst, k.g AS gap_minst, count(*) FILTER (WHERE r.luft >= k.a AND r.gap >= k.g) AS rader_bort, count(DISTINCT r.station_id) FILTER (WHERE r.luft >= k.a AND r.gap >= k.g) AS stationer_bort, count(*) AS rader_totalt, count(DISTINCT r.station_id) AS stationer_totalt FROM r CROSS JOIN k GROUP BY 1, 2 ORDER BY 2, 1

SELECT station_id, name, count(*) AS rader_over_12, count(DISTINCT (sample_time AT TIME ZONE 'UTC')::date) AS dagar, min(surface_temp_c) AS yta_min, max(air_temp_c) AS luft_max, max(air_temp_c - surface_temp_c) AS storsta_gap FROM weather_observations WHERE sample_time > now() - interval '60 days' AND surface_temp_c <= 3 AND air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12 GROUP BY 1, 2 ORDER BY rader_over_12 DESC LIMIT 12
