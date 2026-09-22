-- 031: gallringen får Danmark, gravstenarna och en tidsvakt (kort #240, Bengts fråga 22/9: "du har gallring på grannar som
-- på sverige"). Svaret var nej: tre regler och ingen alls för Danmark. Mätt 22/9: databasen 190 MB (169 den 18/9, ~4,5 MB/dygn
-- netto); dk.weather_observations 1,3 MB utan gallring sedan 31/8; händelsetabellerna bär gravstenar för evigt (Sverige 1 118
-- raderade av 1 122 rader, Danmark 986 av 1 055); en rad i fi.weather_observations har tidsstämpeln 1970-01-01 — epoknoll,
-- ett tomt fält som blivit ett datum.
--
-- REGLERNA (Bengts ja 22/9, DECISIONS #301):
-- * Sverige, Finland, Norge och pg_crons logg: oförändrade (014, 026).
-- * Danmark: Norges regel — allt äldre än `dagar` raderas. Inget läser det danska arkivet; grästemperaturen är en proxy och
--   skuggflottan läser snapshoten, inte arkivet.
-- * Tidsvakten: en tidsstämpel före 2020 är ingen mätning. Raderas i alla fyra väderarkiv varje natt; finska ingesten släpper
--   inte längre in sådana rader (ingest/fi.ts).
-- * Gravstenarna: en händelse som varit raderad i 30 dygn tas bort ur alla länders händelsetabeller. Situation-arkivet (003),
--   som uppspelningen läser, rörs inte. Gravstenens uppgift — att en sen radering aldrig SKAPAR en rad (31/8-läxan) — gäller
--   ändå: raderingar är UPDATE, och ett saknat id ger noll rader.
-- Samma vakter som 026: to_regclass per tabell (CI:s PostGIS saknar schemana), plpgsql, idempotent, EXECUTE bara för ägaren.

CREATE OR REPLACE FUNCTION gallra_arkiv(dagar int DEFAULT 7) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
  n bigint := 0;
  m bigint;
  t text;
BEGIN
  n := gallra_vader(dagar);
  IF to_regclass('fi.weather_observations') IS NOT NULL THEN
    DELETE FROM fi.weather_observations
     WHERE sample_time < now() - dagar * interval '1 day'
       AND sample_time >= now() - interval '60 days'
       AND (surface_temp_c IS NULL OR surface_temp_c > 3);
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
    DELETE FROM fi.weather_observations WHERE sample_time < now() - interval '60 days';
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  END IF;
  IF to_regclass('no.weather_observations') IS NOT NULL THEN
    DELETE FROM no.weather_observations WHERE sample_time < now() - dagar * interval '1 day';
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  END IF;
  -- Danmark (kort #240): Norges regel.
  IF to_regclass('dk.weather_observations') IS NOT NULL THEN
    DELETE FROM dk.weather_observations WHERE sample_time < now() - dagar * interval '1 day';
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  END IF;
  -- Tidsvakten (kort #240): före 2020 är ingen mätning.
  FOREACH t IN ARRAY ARRAY['weather_observations', 'fi.weather_observations', 'no.weather_observations', 'dk.weather_observations'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %s WHERE sample_time < %L', t, '2020-01-01');
      GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
    END IF;
  END LOOP;
  -- Gravstenarna (kort #240): raderade i 30 dygn.
  FOREACH t IN ARRAY ARRAY['deviations', 'fi.deviations', 'no.deviations', 'dk.deviations'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %s WHERE deleted AND coalesce(modified_time, end_time, start_time) < now() - interval ''30 days''', t);
      GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
    END IF;
  END LOOP;
  IF to_regclass('cron.job_run_details') IS NOT NULL THEN
    DELETE FROM cron.job_run_details WHERE end_time < now() - dagar * interval '1 day';
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  END IF;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM authenticated;
  END IF;
END $$;
