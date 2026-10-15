-- 058: SPRIDNINGSGRINDEN FÖR KANDIDATEN (DECISIONS #575; Bengt 15/10 "ja till grinden i appen, bygg loggningen").
-- #547: kandidaten döms med RÅ:s spridningsgrind, X = 2,25 °C. #563 punkt 3: kandidaten talar också långt från stationerna. Lästa
-- ihop (#574): spridningen grindar där minst två ankare bidrar; med färre ankare grindar den inte. Bengt 15/10: samma grind gäller
-- varningen i appen — regeln i #562 får ett villkor till, och det som döms är det användaren hör.
-- TROSKLAR-SKUGGAN §3: "bara varv med loggad spridning räknas". Del B (fysik/live/kandidat_timme.py) skriver nu RÅ:s bidragande
-- ankare (n_ank, högst fem inom 50 km) och deras spridning (spr, störst minus minst yta, en decimal; 0 med ett, null utan) till
-- kandidat_live, och domloggen bär det domen behöver för att räkna grinden vid vilket X som helst (S-B läser X = 1, 2, 2,25, 4):
--   spridning     punkter som grinden tystade (fukt, inget veto, minst två ankare, spridning ≥ 2,25)
--   fukt_glest    fuktiga punkter utan veto med färre än två ankare — dem grindar inget X
--   fukt_spr_min  minsta spridningen bland de fuktiga punkterna utan veto med minst två ankare
-- En sträcka varnar vid X om fukt_glest > 0 eller fukt_spr_min < X. Värdevaktens spann är deklarerade (scripts/vardevakten.ts).

ALTER TABLE kandidat_live ADD COLUMN IF NOT EXISTS n_ank smallint;
ALTER TABLE kandidat_live ADD COLUMN IF NOT EXISTS spr real;
ALTER TABLE kandidat_station ADD COLUMN IF NOT EXISTS n_ank smallint;
ALTER TABLE kandidat_station ADD COLUMN IF NOT EXISTS spr real;
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS spridning int NOT NULL DEFAULT 0;
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_glest int NOT NULL DEFAULT 0;
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_spr_min real;
ALTER TABLE kandidat_skugga_korning ADD COLUMN IF NOT EXISTS spridning int NOT NULL DEFAULT 0;

-- Regeln får två kolumner till i svaret, så den skapas om (CREATE OR REPLACE kan inte byta returtyp); rättigheterna läggs tillbaka nedan.
DROP FUNCTION IF EXISTS kandidat_regel();
CREATE FUNCTION kandidat_regel()
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
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.5) THEN 'torr'                -- RADAR_MMH
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
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#575): yta ≤ 0, fukt (Våt eller radar ≥ 0,5 mm/h på 60 min), veto inom 15 km över +2 °C på 45 min, spridningsgrinden 2,25 °C där minst två ankare bidrar, färsk och fullständig. Bara service-rollen.';
REVOKE ALL ON FUNCTION kandidat_regel() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON FUNCTION kandidat_regel() FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON FUNCTION kandidat_regel() FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT EXECUTE ON FUNCTION kandidat_regel() TO service_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION kandidat_logga() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE t timestamptz; n_st int := 0; n_seg int := 0; n_v int := 0; n_veto int := 0; n_torr int := 0; n_spr int := 0;
BEGIN
  INSERT INTO kandidat_station (station_id, observed_at, ph, pg, ra, ank_km, pb, n_ank, spr)
    SELECT l.punkt, l.tid, l.ph, l.pg, l.ra, l.ank_km, l.pb, l.n_ank, l.spr FROM kandidat_live l WHERE l.punkt NOT LIKE 'v%'
    ON CONFLICT (station_id, observed_at) DO NOTHING;
  GET DIAGNOSTICS n_st = ROW_COUNT;
  t := kandidat_timme();
  IF t IS NULL THEN
    INSERT INTO kandidat_skugga_korning (observed_at, status, stationer)
      VALUES ((SELECT max(l.tid) FROM kandidat_live l WHERE l.tid <= now()), 'tyst', n_st);
    RETURN format('kandidaten tyst (timmen gammal eller ofullständig); %s stationsrader', n_st);
  END IF;
  IF EXISTS (SELECT 1 FROM kandidat_skugga_korning k WHERE k.observed_at = t AND k.status = 'räknad') THEN
    INSERT INTO kandidat_skugga_korning (observed_at, status, stationer) VALUES (t, 'redan räknad', n_st);
    RETURN format('kandidatens timme %s redan räknad; %s stationsrader', t, n_st);
  END IF;
  WITH r AS (SELECT * FROM kandidat_regel()),
  ins AS (
    INSERT INTO kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, radar_mmh, pb_min,
                                 veto_station, veto_km, veto_yta, spridning, fukt_glest, fukt_spr_min)
    SELECT r.segment_id, r.tid, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'), count(*) FILTER (WHERE r.utfall = 'veto'),
           count(*) FILTER (WHERE r.utfall = 'torr'), bool_or(r.vat), bool_or(r.flackvis_vat), max(r.radar_mmh), min(r.pb),
           (array_agg(r.veto_station ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           min(r.veto_km),
           (array_agg(r.veto_yta ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           count(*) FILTER (WHERE r.utfall = 'spridning'),
           count(*) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) < 2),
           min(r.spr) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) >= 2)
    FROM r GROUP BY r.segment_id, r.tid
    ON CONFLICT (segment_id, observed_at) DO NOTHING
    RETURNING varnar, veto, torr, spridning
  )
  SELECT count(*), coalesce(sum(i.varnar), 0), coalesce(sum(i.veto), 0), coalesce(sum(i.torr), 0), coalesce(sum(i.spridning), 0)
    INTO n_seg, n_v, n_veto, n_torr, n_spr FROM ins i;
  INSERT INTO kandidat_skugga_korning (observed_at, status, stracker, varnar, veto, torr, spridning, stationer)
    VALUES (t, 'räknad', n_seg, n_v, n_veto, n_torr, n_spr, n_st);
  RETURN format('kandidatens timme %s: %s sträckor, %s varnande punkter, %s vetade, %s torra, %s tystade av spridningen; %s stationsrader',
                t, n_seg, n_v, n_veto, n_torr, n_spr, n_st);
END $$;
