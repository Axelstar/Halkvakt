-- DEN LÅNGSAMMA VAKTEN I DRIFT, DEL 1 (kort #236, DECISIONS #300, 22/9 2026). Bärare: sql/030_langsam_vakt.sql. Sats 2 är
-- backfillen: samma funktion med 60 dygns fönster, så tabellen bär historien från arkivets början. Sats 3–5: vad tabellen
-- säger — per station, Ö Ljungbys senaste dygn, och vilka som tystas just nu med fristen 3 h. Sats 6 klockar det anrop
-- ingest-live kommer att göra varje varv (2 timmar): det får inte kosta mer än trenden. Bara läsande efter migrationen.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/030_langsam_vakt.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT langsam_vakt(interval '60 days') AS backfill_stationsdygn

SELECT station_id, count(*) AS dygn, min(dag) AS forsta_dag, max(dag) AS senaste_dag, to_char(max(senast) AT TIME ZONE 'UTC', 'MM-DD HH24:MI') AS senast FROM givarfel_dygn GROUP BY 1 ORDER BY 2 DESC

SELECT station_id, dag, to_char(forst AT TIME ZONE 'UTC', 'HH24:MI') AS forst, to_char(senast AT TIME ZONE 'UTC', 'HH24:MI') AS senast FROM givarfel_dygn WHERE station_id = '1106' ORDER BY dag DESC LIMIT 5

SELECT string_agg(station_id, ', ' ORDER BY station_id) AS tysta_nu FROM (SELECT DISTINCT station_id FROM givarfel_dygn WHERE senast > now() - interval '3 hours') x

EXPLAIN ANALYZE SELECT langsam_vakt(interval '2 hours')
