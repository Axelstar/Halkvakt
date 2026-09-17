-- Mätning 2026-09-17, grepp 3 (#83 steg 2): databasens storlek, största tabeller, tillväxt per dygn,
-- döda rader och gallringsjobbets senaste körningar. Bara läsning. Körs via dbknapp (atgard migrera, bevis).

SET statement_timeout = '300s';

SELECT pg_size_pretty(pg_database_size(current_database())) AS databas, pg_database_size(current_database()) AS byte, now() AS tid;

SELECT n.nspname || '.' || c.relname AS tabell, pg_size_pretty(pg_total_relation_size(c.oid)) AS storlek, round(pg_total_relation_size(c.oid) / 1048576.0, 1) AS mb, c.reltuples::bigint AS rader_uppsk FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 16;

SELECT 'weather_observations' AS tabell, count(*) FILTER (WHERE sample_time > now() - interval '7 days') / 7 AS per_dygn_senaste_7, count(*) FILTER (WHERE sample_time BETWEEN now() - interval '14 days' AND now() - interval '7 days') / 7 AS per_dygn_dag_8_14 FROM weather_observations UNION ALL SELECT 'shadow_log', count(*) FILTER (WHERE run_at > now() - interval '7 days') / 7, count(*) FILTER (WHERE run_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') / 7 FROM shadow_log UNION ALL SELECT 'trend_kandidater', count(*) FILTER (WHERE observed_at > now() - interval '7 days') / 7, count(*) FILTER (WHERE observed_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') / 7 FROM trend_kandidater UNION ALL SELECT 'radar_precip', count(*) FILTER (WHERE observed_at > now() - interval '7 days') / 7, count(*) FILTER (WHERE observed_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') / 7 FROM radar_precip;

SELECT relname AS tabell, n_live_tup AS levande, n_dead_tup AS doda, last_autovacuum, last_vacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 6;

SELECT start_time, status, left(return_message, 60) AS svar FROM cron.job_run_details WHERE command LIKE '%gallra_vader%' ORDER BY start_time DESC LIMIT 3;

-- Tillägg samma dag: de nordiska väderarkiven, pg_crons körningslogg och svenska rader per dygn.

SELECT 'fi.weather_observations' AS tabell, count(*) FILTER (WHERE sample_time > now() - interval '7 days') / 7 AS per_dygn_7, min(sample_time) AS forsta, count(*) AS rader FROM fi.weather_observations UNION ALL SELECT 'no.weather_observations', count(*) FILTER (WHERE sample_time > now() - interval '7 days') / 7, min(sample_time), count(*) FROM no.weather_observations UNION ALL SELECT 'dk.weather_observations', count(*) FILTER (WHERE sample_time > now() - interval '7 days') / 7, min(sample_time), count(*) FROM dk.weather_observations;

SELECT count(*) FILTER (WHERE start_time > now() - interval '1 day') AS per_dygn, count(*) AS rader, min(start_time) AS forsta, count(DISTINCT jobid) AS jobb FROM cron.job_run_details;

SELECT date_trunc('day', sample_time) AS dag, count(*) AS rader, count(*) FILTER (WHERE surface_temp_c <= 5) AS kalla FROM weather_observations WHERE sample_time > now() - interval '7 days' GROUP BY 1 ORDER BY 1;
