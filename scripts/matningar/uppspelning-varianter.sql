-- Uppspelningens varianter — KB-A:s tabell räknad ur arkiven (DECISIONS #243, 2026-09-20, Bengts "gör uppspelningens varianter nu").
-- Funktionen uppspelning_efterhalka() (sql/028) bär betans startvärden som standardvärden: anropet utan argument ÄR
-- kombinationen, och varje variant ändrar ETT argument. Inga tal står här utom variantens eget. Ett värde utanför de
-- fastställda svepen avvisas av funktionen (regel D1).
-- UTFALLET ÄR BLINDAT: utfallskolumnerna ger NULL tills de läses vid dom 1 (januari), kalibreringen 1/2 och dom 2 (mars).
-- Sats 1: en rad per variant över 14 dygn — stationsdygn, ögonblick, dygn med fyrning. Sats 2: kombinationen per dygn
-- (ska stämma med uppspelning-efterhalka.sql sats 1, och visar de blindade kolumnerna).
-- INTE MED ÄN: SMHI-förlängningen (inga vintervarningar i arkivet, senast_sedd inte i värdevakten) och facitstackens
-- tre andra källor ("nära stationen" saknar skriven radie) — se huvudet i sql/028.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/028_uppspelning_varianter.sql, bevis = satserna). Datum i UTC.

SET statement_timeout = '300s';

SELECT variant, coalesce(sum(stationer), 0) AS stationsdygn, coalesce(sum(ogonblick), 0) AS ogonblick, count(dag) AS dygn_med_fyrning, count(foll_ut) AS utfall_synligt FROM (SELECT 1 AS nr, 'kombinationen' AS variant, * FROM uppspelning_efterhalka() UNION ALL SELECT 2, 'utan faller', * FROM uppspelning_efterhalka(p_krav_faller := false) UNION ALL SELECT 3, 'utan blot', * FROM uppspelning_efterhalka(p_krav_blot := false) UNION ALL SELECT 4, 'med radarn r=0,1', * FROM uppspelning_efterhalka(p_radar_r := 0.1) UNION ALL SELECT 5, 'med radarn r=0,5', * FROM uppspelning_efterhalka(p_radar_r := 0.5) UNION ALL SELECT 6, 'med radarn r=2', * FROM uppspelning_efterhalka(p_radar_r := 2) UNION ALL SELECT 7, 'regnmangd >= 0,2 mm', * FROM uppspelning_efterhalka(p_regn_min := 0.2) UNION ALL SELECT 8, 'regnmangd >= 0,5 mm', * FROM uppspelning_efterhalka(p_regn_min := 0.5) UNION ALL SELECT 9, 'startband +1..+4', * FROM uppspelning_efterhalka(p_hog := 4) UNION ALL SELECT 10, 'startband +1..+6', * FROM uppspelning_efterhalka(p_hog := 6) UNION ALL SELECT nr, variant, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM (VALUES (1, 'kombinationen'), (2, 'utan faller'), (3, 'utan blot'), (4, 'med radarn r=0,1'), (5, 'med radarn r=0,5'), (6, 'med radarn r=2'), (7, 'regnmangd >= 0,2 mm'), (8, 'regnmangd >= 0,5 mm'), (9, 'startband +1..+4'), (10, 'startband +1..+6')) v(nr, variant)) x GROUP BY nr, variant ORDER BY nr;

SELECT * FROM uppspelning_efterhalka();
