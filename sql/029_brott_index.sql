-- 029: delindex för karantänen i mätningarna (kort #234, DECISIONS #299).
--
-- Karantänen räknas PER RAD i mätningarna: hur många brott mot #75 (ytan mer än 12 ° under luften) har stationen
-- haft de sju dygnen före radens egen tid? Delfrågan står i publish/snapshot-core.ts (brottSql) och ordagrant i
-- sql/018 och sql/028. Utan index läser den VARJE rad hos stationen i sju dygn — för varje rad i fönstret, miljarder
-- radbesök på ett 60-dygnsarkiv. Brotten är sällsynta (811 rader på 60 dygn, 21/9), så ett delindex över just dem
-- gör delfrågan till några indexuppslag per rad. Predikatet måste vara ORDAGRANT delfrågans, annars väljer planeraren
-- inte indexet — kontraktsgrinden vaktar talet 12 i båda. Det finska arkivet får samma index när schemat finns
-- (grind R-A --fi); CI:s slit-och-släng-PostGIS saknar det, därav vakten (003-läxan).
CREATE INDEX IF NOT EXISTS weather_obs_brott_idx ON weather_observations (station_id, sample_time)
  WHERE air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'fi') THEN
    CREATE INDEX IF NOT EXISTS weather_obs_brott_idx ON fi.weather_observations (station_id, sample_time)
      WHERE air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12;
  END IF;
END $$;
