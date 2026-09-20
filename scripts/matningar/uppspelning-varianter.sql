-- Uppspelningens varianter — KB-A:s tabell räknad ur arkiven (DECISIONS #244, 2026-09-20, Bengts "gör uppspelningens
-- varianter nu"), med facitstackens två skrivna källor (kort #207, DECISIONS #247).
-- Funktionen uppspelning_efterhalka() (sql/028) bär betans startvärden som standardvärden: anropet utan argument ÄR
-- kombinationen, och varje variant ändrar ETT argument. Inga tal står här utom variantens eget. Ett värde utanför de
-- fastställda svepen avvisas av funktionen (regel D1).
-- UTFALLET ÄR BLINDAT: utfalls- och facitkolumnerna ger NULL tills de läses vid dom 1 (januari), kalibreringen 1/2 och
-- dom 2 (mars). Kolumnen `episoder` räknar fyrningar, inte utfall, och är därför synlig.
-- Sats 1: en rad per variant över 14 dygn. Varianten står i EN lista (v) som satsen vänsterjoinar mot, så en variant med
-- noll fyrningar syns som en nolla utan handräknad NULL-utfyllnad. Sats 2: kombinationen per dygn (ska stämma med
-- uppspelning-efterhalka.sql sats 1). Sats 3: BÄR KOPPLINGARNA? Radarns väg inom 5 km, stationens läge i weather_latest,
-- och hur mycket facit arkiven överhuvudtaget bär i fönstret — ger en variant noll kan det vara vädret eller röret, och
-- satsen skiljer dem åt utan att röra utfallet.
-- INTE MED ÄN: SMHI-förlängningen (inga vintervarningar i arkivet, senast_sedd inte i värdevakten) och kamerabilden
-- (en bild är inte facit förrän någon läst den) — se huvudet i sql/028.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/028_uppspelning_varianter.sql, bevis = satserna). Datum i UTC.

SET statement_timeout = '300s';

WITH x AS (SELECT 1 AS nr, * FROM uppspelning_efterhalka() UNION ALL SELECT 2, * FROM uppspelning_efterhalka(p_krav_faller := false) UNION ALL SELECT 3, * FROM uppspelning_efterhalka(p_krav_blot := false) UNION ALL SELECT 4, * FROM uppspelning_efterhalka(p_radar_r := 0.1) UNION ALL SELECT 5, * FROM uppspelning_efterhalka(p_radar_r := 0.5) UNION ALL SELECT 6, * FROM uppspelning_efterhalka(p_radar_r := 2) UNION ALL SELECT 7, * FROM uppspelning_efterhalka(p_regn_min := 0.2) UNION ALL SELECT 8, * FROM uppspelning_efterhalka(p_regn_min := 0.5) UNION ALL SELECT 9, * FROM uppspelning_efterhalka(p_hog := 4) UNION ALL SELECT 10, * FROM uppspelning_efterhalka(p_hog := 6)), v(nr, variant) AS (VALUES (1, 'kombinationen'), (2, 'utan faller'), (3, 'utan blot'), (4, 'med radarn r=0,1'), (5, 'med radarn r=0,5'), (6, 'med radarn r=2'), (7, 'regnmangd >= 0,2 mm'), (8, 'regnmangd >= 0,5 mm'), (9, 'startband +1..+4'), (10, 'startband +1..+6')) SELECT v.nr, v.variant, coalesce(sum(x.stationer), 0) AS stationsdygn, coalesce(sum(x.ogonblick), 0) AS ogonblick, coalesce(sum(x.episoder), 0) AS episoder, count(x.dag) AS dygn_med_fyrning, count(x.foll_ut) AS utfall_synligt, count(x.med_omklassning) AS facit_synligt FROM v LEFT JOIN x ON x.nr = v.nr GROUP BY v.nr, v.variant ORDER BY v.nr;

SELECT * FROM uppspelning_efterhalka();

WITH td AS (SELECT DISTINCT station_id AS sid, (observed_at AT TIME ZONE 'UTC')::date AS d FROM trend_kandidater WHERE observed_at > now() - interval '14 days'), par AS (SELECT s.sid, rc.segment_id FROM (SELECT DISTINCT sid FROM td) s JOIN weather_latest wl ON wl.station_id = s.sid JOIN road_conditions rc ON NOT rc.deleted AND rc.geom IS NOT NULL AND rc.geom && ST_Expand(wl.geom, 0.15) AND ST_DWithin(rc.geom::geography, wl.geom::geography, 5 * 1000)), rd AS (SELECT DISTINCT p.sid, (rp.observed_at AT TIME ZONE 'UTC')::date AS d FROM par p JOIN radar_precip rp ON rp.segment_id = p.segment_id WHERE rp.observed_at > now() - interval '14 days') SELECT (SELECT count(DISTINCT sid) FROM td) AS stationer_i_trendarkivet, (SELECT count(*) FROM weather_latest wl WHERE wl.station_id IN (SELECT sid FROM td)) AS med_lage_i_weather_latest, (SELECT count(DISTINCT sid) FROM par) AS med_vagavsnitt_inom_5_km, (SELECT count(DISTINCT segment_id) FROM par) AS vagavsnitt, (SELECT count(*) FROM td) AS stationsdygn, (SELECT count(*) FROM td JOIN rd USING (sid, d)) AS stationsdygn_med_radarregn, (SELECT count(*) FROM road_condition_history h WHERE h.modified_time > now() - interval '14 days' AND NOT h.deleted AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')) AS omklassningar_till_halka_14d, (SELECT count(*) FROM road_condition_history WHERE modified_time > now() - interval '14 days' AND NOT deleted) AS omklassningar_totalt_14d, (SELECT count(*) FROM situation_archive WHERE message_type_value = 'Accident' AND start_time > now() - interval '14 days' AND geom IS NOT NULL) AS olyckor_14d;
