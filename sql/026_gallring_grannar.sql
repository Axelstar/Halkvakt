-- 026: gallringen vidgas till Finland, Norge och pg_crons körningslogg (grepp 3, Bengts order 17/9, DECISIONS #232).
--
-- MÄTT 17/9 (docs/GREPP3-ARKIVEN.md): databasen 168 MB och ~9 MB/dygn brutto redan i september. fi.weather_observations
-- 21 MB och no.weather_observations 13 MB gallrades inte alls; cron.job_run_details 18 MB rensades aldrig.
-- Gratisnivån skrivskyddar databasen vid 500 MB — då stannar ingest-live.
--
-- REGLERNA (Bengt 17/9):
-- * Finland: rader äldre än `dagar` med yta över +3 °C — eller utan yta — raderas. Kalla rader (yta ≤ +3 °C) sparas i
--   60 dygn, sedan raderas allt. Skälet: rimfrostgrinden R-A väntar på Lapplands frostnätter i det finska arkivet
--   (TROSKLAR-RIMFROST §8, DECISIONS #138). R-A:s fönster är 30 dygn.
-- * Norge: allt äldre än `dagar` raderas ("vi använder inte dessa så mycket"). Ingen analys läser det norska arkivet;
--   ingesten läser bara senaste raden per station.
-- * pg_crons logg: körningar äldre än `dagar` raderas.
-- Den svenska gallringen (gallra_vader, sql/014) är orörd och körs först.
--
-- LÅST: funktioner i public går att anropa via Supabases REST-API med den publika nyckeln. gallra_vader(0) hade
-- tunnat ut även den senaste veckan. Båda funktionerna får EXECUTE bara för ägaren — rollvakten ur 003-läxan.
--
-- plpgsql, inte sql: tabellerna och cron-schemat finns inte i CI:s PostGIS, och en sql-funktion valideras mot
-- tabellerna när den skapas. Varje del vaktas med to_regclass. Idempotent: en andra körning hittar inget.
CREATE OR REPLACE FUNCTION gallra_arkiv(dagar int DEFAULT 7) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
  n bigint := 0;
  m bigint;
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
  IF to_regclass('cron.job_run_details') IS NOT NULL THEN
    DELETE FROM cron.job_run_details WHERE end_time < now() - dagar * interval '1 day';
    GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  END IF;
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gallra_vader(int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM anon;
    REVOKE EXECUTE ON FUNCTION gallra_vader(int) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION gallra_arkiv(int) FROM authenticated;
    REVOKE EXECUTE ON FUNCTION gallra_vader(int) FROM authenticated;
  END IF;
END $$;

-- Nattjobbet 03:15 byter kommando — samma jobb, samma tid, inget nytt schema (kort #85). pg_cron finns bara i Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.alter_job(jobid, command := 'SELECT gallra_arkiv(7)') FROM cron.job WHERE jobname = 'halkvakt-gallring';
  END IF;
END $$;
