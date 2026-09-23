-- 032: segmentprognosen i skuggloggen (kort #38b steg 4, DECISIONS #322/#324/#325, Bengts "bygg nu" 23/9).
--
-- Prognosen är rå avståndsviktning av de närmaste vaktade stationernas yttemperatur längs skuggrutten — ingen offset,
-- ingen inlärning (vägpunktsgrinden 23/9, DECISIONS #324). Skuggmotorn räknar den per körning ur engine/src/segment.ts
-- och loggar den här: {steg_km, p: [[km, yta, narm_km, n, status, frys], …]}. Aldrig hörd, bara loggad — grind B och C
-- dömer den i mars (TROSKLAR-SKUGGAN §3–§4). Tom ({}) för länder utan svenskt arkiv.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS prognos jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shadow_log.prognos IS 'Segmentprognosen (DECISIONS #324): rå avståndsviktning per provpunkt längs rutten. Loggad, aldrig hörd. Döms av grind B/C.';

-- ANKARNA: alla stationer som får bära prognosen, "från nu" som snapshoten (publish/snapshot-core.ts buildSnapshot):
-- färsk inom 3 h, #75:s givarvakt, radvakten (kort #234), karantänen (≥ 3 brott mot #75 på 7 dygn tystar) och den
-- långsamma vakten (kort #236, ett dygn i felet inom 3 h). Samma population som det appen hör — och som grind A
-- och vägpunktsgrinden dömdes på. Talen är kopior av snapshotkärnans konstanter; kontraktsgrinden vaktar dem.
-- Skuggmotorn anropar den via PostgREST (rpc/vagpunkt_ankare) med service-rollen; ingen annan roll får köra den.
CREATE OR REPLACE FUNCTION vagpunkt_ankare()
RETURNS TABLE (id text, lon double precision, lat double precision, yta numeric)
LANGUAGE sql STABLE AS $$
  WITH karantan AS (
    SELECT station_id FROM weather_observations
    WHERE sample_time > now() - interval '7 days'  -- KARANTAN_DYGN
      AND air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12
    GROUP BY station_id HAVING count(*) >= 3  -- KARANTAN_BROTT
  ),
  langsam AS (
    SELECT station_id FROM givarfel_dygn WHERE senast > now() - interval '3 hours'  -- LANGSAM_FRIST_H
  )
  SELECT w.station_id, ST_X(w.geom), ST_Y(w.geom), w.surface_temp_c
  FROM weather_latest w
  WHERE w.surface_temp_c IS NOT NULL
    AND w.sample_time > now() - interval '3 hours'
    AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
    AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
    AND w.station_id NOT IN (SELECT station_id FROM karantan)
    AND w.station_id NOT IN (SELECT station_id FROM langsam)
$$;
COMMENT ON FUNCTION vagpunkt_ankare() IS 'Segmentprognosens ankare: vaktade, färska svenska stationer med yttemperatur (DECISIONS #324). Bara service-rollen.';

-- Rättigheterna: bara service-rollen. Guarda mot CI:s slit-och-släng-PostGIS som saknar Supabase-rollerna (läxan 003, 31/8).
REVOKE ALL ON FUNCTION vagpunkt_ankare() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION vagpunkt_ankare() TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION vagpunkt_ankare() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION vagpunkt_ankare() FROM authenticated;
  END IF;
END $$;
