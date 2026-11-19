-- 119: sajtens besöksrader sparas i 13 månader (DECISIONS #900, fråga 6; integritetssidan, dataskyddet steg 2). Idempotent.
-- Raderna började 28/10 2026, så den första raderingen sker i slutet av november 2027. Jobbet går varje natt kl. 03.25 UTC,
-- tio minuter efter väderdatans gallring (014). Funktionen får bara köras av databasens egna roller.
CREATE OR REPLACE FUNCTION gallra_besok() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.besok WHERE ts < now() - interval '13 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.gallra_besok() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.gallra_besok() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.gallra_besok() FROM authenticated;
  END IF;
END $$;

-- pg_cron finns bara i Supabase; CI:s PostGIS saknar den (som i 014). Jobbnamnet ersätts vid omkörning.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-gallring-besok';
    PERFORM cron.schedule('halkvakt-gallring-besok', '25 3 * * *', 'SELECT gallra_besok()');
  END IF;
END $$;
