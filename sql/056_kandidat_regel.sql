-- 056: KANDIDATENS REGEL — PÅ ETT STÄLLE (DECISIONS #562, #565, #566, #568, #573; kort #343).
-- En funktion i databasen som både skuggan och publiceringen anropar (#562 punkt 3). Talen står bara här:
--   yta        kandidatens värde (kandidat_live.pb) ≤ 0 °C                                               (#562)
--   fukt       Trafikverkets väglag "Våt" på punktens sträcka (condition_info, exakt), eller radarn         (#562, #565)
--              rate_mean_mmh ≥ 0,5 mm/h över sträckan någon gång de senaste 60 minuterna                  (#568: 0,5 avgörs 26/10)
--   veto       ingen station inom 15 km mätte yta över +2 °C de senaste 45 minuterna, med ankarnas vakter  (#562, #566)
--   färskhet   kandidatens senaste timme är högst två timmar gammal och bär minst 95 % av vägpunkterna;
--              annars tiger regeln helt (#562 punkt 5: gammalt eller ofullständigt väder ⇒ tyst, aldrig fel)
-- Funktionen ger varje vägpunkt där ytan klarar villkoret, med utfallet: 'varnar', 'veto' (station varm i närheten) eller 'torr'
-- (inget fuktbesked). Skuggan loggar alla tre (Bengts "ja till 2" #565 och "ja 2" #573); publiceringen tar bara 'varnar'.
-- "fläckvis Våt" räknas INTE som fukt (#562 säger Våt), men bärs som egen flagga så att vintern visar vad det hade gett (§4.2).
-- Stationsvetot lånar vagpunkt_ankare():s vakter (sql/032: #75:s givarvakt, karantänen, den långsamma vakten) — en grind som lånar
-- en annan grinds tal ska låna dess vakter (CLAUDE.md, #324).

CREATE OR REPLACE FUNCTION kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, utfall text)
LANGUAGE sql STABLE AS $$
  WITH senast AS (
    SELECT max(l.tid) AS tid FROM kandidat_live l WHERE l.tid <= now()
  ),
  farsk AS (   -- färskheten: högst två timmar gammal och minst 95 % av vägpunkterna, annars ingen rad alls
    SELECT s.tid FROM senast s
    WHERE s.tid > now() - interval '2 hours'                                                      -- FARSK_TIMMAR
      AND (SELECT count(*) FROM kandidat_live l WHERE l.tid = s.tid AND l.punkt LIKE 'v%')
          >= 0.95 * (SELECT count(*) FROM vagpunkt)                                                -- FULLSTANDIG_ANDEL
  ),
  kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, v.geom
    FROM kandidat_live l JOIN farsk f ON l.tid = f.tid JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.pb <= 0                                                                                -- YTA_GRANS_C
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                      -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (   -- stationer som mätt yta över +2 °C de senaste 45 minuterna, med ankarnas vakter
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                  -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.5 THEN 'varnar'                 -- RADAR_MMH
              ELSE 'torr' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                    -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#573): yta ≤ 0, fukt (Våt eller radar ≥ 0,5 mm/h på 60 min), veto inom 15 km över +2 °C på 45 min, färsk och fullständig. Bara service-rollen.';

REVOKE ALL ON FUNCTION kandidat_regel() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON FUNCTION kandidat_regel() FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON FUNCTION kandidat_regel() FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT EXECUTE ON FUNCTION kandidat_regel() TO service_role; END IF;
END $$;
