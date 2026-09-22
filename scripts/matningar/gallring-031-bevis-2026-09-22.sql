-- GALLRINGEN I DRIFT, kort #240 (22/9 2026). Bärare: sql/031_gallring_dk_gravstenar_tid.sql. Sats 2 kör funktionen en gång
-- (samma som nattjobbet 03:15, idempotent). Sats 3–6: vad som blev kvar — danska rader äldre än sju dygn, rader före 2020,
-- gravstenar äldre än 30 dygn, databasens storlek. Sats 7: funktionskroppen i pg_proc bär de tre nya reglerna.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/031_gallring_dk_gravstenar_tid.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT gallra_arkiv(7) AS raderade_rader

SELECT count(*) AS dk_rader, count(*) FILTER (WHERE sample_time < now() - interval '7 days') AS dk_aldre_an_7d, min(sample_time)::date AS dk_aldsta FROM dk.weather_observations

SELECT (SELECT count(*) FROM fi.weather_observations WHERE sample_time < '2020-01-01') AS fi_fore_2020, (SELECT min(sample_time)::date FROM fi.weather_observations) AS fi_aldsta, (SELECT count(*) FROM weather_observations WHERE sample_time < '2020-01-01') AS se_fore_2020

SELECT 'se' AS tabell, count(*) AS rader, count(*) FILTER (WHERE deleted) AS gravstenar, count(*) FILTER (WHERE deleted AND coalesce(modified_time, end_time, start_time) < now() - interval '30 days') AS gamla_gravstenar FROM deviations UNION ALL SELECT 'dk', count(*), count(*) FILTER (WHERE deleted), count(*) FILTER (WHERE deleted AND coalesce(modified_time, end_time, start_time) < now() - interval '30 days') FROM dk.deviations UNION ALL SELECT 'fi', count(*), count(*) FILTER (WHERE deleted), count(*) FILTER (WHERE deleted AND coalesce(modified_time, end_time, start_time) < now() - interval '30 days') FROM fi.deviations

SELECT pg_size_pretty(pg_database_size(current_database())) AS databasen

SELECT position('dk.weather_observations' in prosrc) > 0 AS danmark, position('2020-01-01' in prosrc) > 0 AS tidsvakt, position('30 days' in prosrc) > 0 AS gravstenar FROM pg_proc WHERE proname = 'gallra_arkiv'
