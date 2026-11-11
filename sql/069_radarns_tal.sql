-- 069: RADARNS TAL R = 0,1 mm/h (FORREGISTRERING-2026-27 §10 a, DECISIONS #568, #725). Regeln skrevs 15/10 före läsningen:
-- visar alla tre veckokurvorna en majoritet (över 50 %) i bandet 0,1–0,5 på rate_mean_mmh blir R = 0,1, annars står 0,5. Kurvorna:
-- 38690393504 (62,0 %), 39257448840 (56,7 %) och 40279196066 (66,3 %). Regeln i drift följer det signerade talet från signeringen.
-- BARA RADARGRÄNSEN ÄNDRAS. kandidat_regel() (sql/058) och ny_kandidat_regel() (sql/068) skapas om ord för ord, med 0.1 i stället för
-- 0.5 på raden RADAR_MMH. Returtypen är densamma, så CREATE OR REPLACE räcker och rättigheterna står kvar. Kontraktsgrinden vaktar
-- gränsen här och i kuvösen (kuvos/facit-trv.ts RADAR_MMH); test/ny-kandidat-skugga.test.ts att de två är samma regel.

CREATE OR REPLACE FUNCTION kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
    FROM kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.spr >= 2.25 THEN 'spridning'                         -- SPRIDNING_X_C (#477)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#575, R #725): yta ≤ 0, fukt (Våt eller radar ≥ 0,1 mm/h på 60 min), veto inom 15 km över +2 °C på 45 min, spridningsgrinden 2,25 °C där minst två ankare bidrar, färsk och fullständig. Bara service-rollen.';

CREATE OR REPLACE FUNCTION ny_kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
    FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.spr >= 2.25 THEN 'spridning'                         -- SPRIDNING_X_C (#477)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION ny_kandidat_regel() IS 'Den nya kandidatens regel (sql/068, ersättningsregeln §4): den frystas regel i sql/069 ord för ord på ny_kandidat_live. Loggas, talar aldrig. Bara service-rollen.';
