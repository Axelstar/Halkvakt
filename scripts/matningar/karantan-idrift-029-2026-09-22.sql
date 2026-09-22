-- DELINDEXET I DRIFT (kort #234, DECISIONS #299, 22/9 2026). Bärare: sql/029_brott_index.sql. Bevisen: indexet finns i
-- pg_indexes (public och fi), planeraren VÄLJER det för delfrågan, och hela karantänräkningen över sju dygns arkiv
-- klockas (EXPLAIN ANALYZE) innan grind A får läsa 60 dygn genom den. Sista satsen: hur många rader och stationer
-- karantänen tar i dag, räknat per rad. Bara läsande efter migrationen.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/029_brott_index.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE indexname = 'weather_obs_brott_idx' ORDER BY 1

EXPLAIN SELECT count(*) FROM weather_observations k WHERE k.station_id = '1106' AND k.sample_time <= now() AND k.sample_time > now() - interval '7 days' AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12

EXPLAIN ANALYZE SELECT count(*) FROM weather_observations w WHERE w.sample_time > now() - interval '7 days' AND w.surface_temp_c IS NOT NULL AND (SELECT count(*) FROM weather_observations k WHERE k.station_id = w.station_id AND k.sample_time <= w.sample_time AND k.sample_time > w.sample_time - interval '7 days' AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) < 3

SELECT count(*) AS rader_7d, count(*) FILTER (WHERE (SELECT count(*) FROM weather_observations k WHERE k.station_id = w.station_id AND k.sample_time <= w.sample_time AND k.sample_time > w.sample_time - interval '7 days' AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) >= 3) AS rader_i_karantan, count(DISTINCT w.station_id) FILTER (WHERE (SELECT count(*) FROM weather_observations k WHERE k.station_id = w.station_id AND k.sample_time <= w.sample_time AND k.sample_time > w.sample_time - interval '7 days' AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) >= 3) AS stationer_i_karantan, count(*) FILTER (WHERE w.air_temp_c >= 10 AND w.air_temp_c - w.surface_temp_c >= 8) AS rader_radvakten FROM weather_observations w WHERE w.sample_time > now() - interval '7 days' AND w.surface_temp_c IS NOT NULL
