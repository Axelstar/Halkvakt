-- 120: testarnas svar görs om till summor och raderas en månad efter vinterns slutrapport (DECISIONS #900, fråga 5; dataskyddet
-- steg 3; Bengt 19/11: "kör" på datumet 31 maj 2027). Idempotent.
--
-- Facitsvaren (driver_facit) och missarna (driver_miss) säger ungefär var och när en testare var. De behövs för vinterns mätningar,
-- inte längre. Den 31 maj varje år läggs svaren som kom in före 1 maj samma år ihop till summor per säsong, källa, app och svar
-- (eller vad som missades), och raderas sedan. Provraderna (prov) räknas inte i summorna men raderas med de andra. Summorna kan inte
-- kopplas till någon. Funktionen gör ingenting före 31 maj 2027, så ett anrop för tidigt kan inte radera vinterns underlag.

CREATE TABLE IF NOT EXISTS testarnas_svar_summa (
  sasong text NOT NULL,                                   -- t.ex. '2026/27' (juli–juni)
  kalla text NOT NULL CHECK (kalla IN ('facit', 'miss')),
  app text NOT NULL,
  varde text NOT NULL,                                    -- facit: 'ja' eller 'nej'; miss: vad som missades
  antal integer NOT NULL DEFAULT 0,
  PRIMARY KEY (sasong, kalla, app, varde)
);
ALTER TABLE testarnas_svar_summa ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.testarnas_svar_summa FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.testarnas_svar_summa FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.testarnas_svar_summa TO service_role;
  END IF;
END $$;
COMMENT ON TABLE testarnas_svar_summa IS 'DECISIONS #900 fråga 5: testarnas svar som summor per säsong, efter att raderna raderats 31 maj.';

CREATE OR REPLACE FUNCTION sammanfatta_testarnas_svar() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  grans timestamptz := make_timestamptz(extract(year from now())::int, 5, 1, 0, 0, 0, 'UTC');
  n_facit integer;
  n_miss integer;
BEGIN
  IF now() < timestamptz '2027-05-31 00:00:00+00' THEN
    RETURN 0;
  END IF;
  INSERT INTO testarnas_svar_summa (sasong, kalla, app, varde, antal)
  SELECT to_char(received_at - interval '6 months', 'YYYY') || '/' || to_char(received_at + interval '6 months', 'YY'),
         'facit', app, svar, count(*)
  FROM driver_facit WHERE received_at < grans AND NOT prov GROUP BY 1, 3, 4
  ON CONFLICT (sasong, kalla, app, varde) DO UPDATE SET antal = testarnas_svar_summa.antal + EXCLUDED.antal;
  INSERT INTO testarnas_svar_summa (sasong, kalla, app, varde, antal)
  SELECT to_char(received_at - interval '6 months', 'YYYY') || '/' || to_char(received_at + interval '6 months', 'YY'),
         'miss', app, vad, count(*)
  FROM driver_miss WHERE received_at < grans AND NOT prov GROUP BY 1, 3, 4
  ON CONFLICT (sasong, kalla, app, varde) DO UPDATE SET antal = testarnas_svar_summa.antal + EXCLUDED.antal;
  DELETE FROM driver_facit WHERE received_at < grans;
  GET DIAGNOSTICS n_facit = ROW_COUNT;
  DELETE FROM driver_miss WHERE received_at < grans;
  GET DIAGNOSTICS n_miss = ROW_COUNT;
  RETURN n_facit + n_miss;
END $$;

REVOKE ALL ON FUNCTION public.sammanfatta_testarnas_svar() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.sammanfatta_testarnas_svar() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.sammanfatta_testarnas_svar() FROM authenticated;
  END IF;
END $$;

-- Den 31 maj kl. 04.10 UTC varje år. pg_cron finns bara i Supabase (som i 014). Jobbnamnet ersätts vid omkörning.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-testarnas-svar';
    PERFORM cron.schedule('halkvakt-testarnas-svar', '10 4 31 5 *', 'SELECT sammanfatta_testarnas_svar()');
  END IF;
END $$;
