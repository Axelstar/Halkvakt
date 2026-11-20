-- 130: platsdelningen (DECISIONS #917; Axel och Bengt 20/11). Idempotent.
-- EN rad per installation: ett slumpat id som appen själv skapar, plattform, pushtoken, kommunen telefonen senast var i och
-- om föraren valt erbjudanden. Bara senaste läget: raden skrivs över, ingen historik. Ingen exakt position, ingen resa,
-- inget namn, ingen IP. Appen skickar raden först när föraren godkänt det i appen; den som säger nej får ingen rad.
-- Raden tas bort av föraren (Radera min data), när pushtoken slutat gälla, eller av gallringen efter 30 dygn utan kontakt.
CREATE TABLE IF NOT EXISTS app_enhet (
  id uuid PRIMARY KEY,
  app text NOT NULL CHECK (app IN ('ios', 'android')),
  pushtoken text,
  kommun text NOT NULL CHECK (kommun ~ '^[0-9]{4}$'),
  erbjudanden boolean NOT NULL DEFAULT false,
  uppdaterad timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_enhet_kommun ON app_enhet (kommun);
ALTER TABLE app_enhet ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_enhet FROM PUBLIC;

-- Gallringen: 30 dygn utan kontakt. Varje natt kl. 03.35 UTC, tio minuter efter besöksradernas (119).
CREATE OR REPLACE FUNCTION gallra_app_enhet() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.app_enhet WHERE uppdaterad < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.gallra_app_enhet() FROM PUBLIC;

-- Statistiken: antal installationer per län (kommunkodens två första siffror), aldrig per kommun och aldrig ett tal under tio,
-- så att ett litet län inte pekar ut enskilda. Det enda som får läsas ut ur tabellen för statistik och partner.
CREATE OR REPLACE FUNCTION app_enhet_lan_stat()
RETURNS TABLE (lan text, antal integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT left(kommun, 2), count(*)::integer FROM app_enhet GROUP BY 1 HAVING count(*) >= 10 ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.app_enhet_lan_stat() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE app_enhet FROM anon;
    REVOKE ALL ON FUNCTION public.gallra_app_enhet() FROM anon; REVOKE ALL ON FUNCTION public.app_enhet_lan_stat() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE app_enhet FROM authenticated;
    REVOKE ALL ON FUNCTION public.gallra_app_enhet() FROM authenticated; REVOKE ALL ON FUNCTION public.app_enhet_lan_stat() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE app_enhet TO service_role;
  END IF;
END $$;

-- pg_cron finns bara i Supabase; CI:s PostGIS saknar den (som i 014 och 119). Jobbnamnet ersätts vid omkörning.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-gallring-app-enhet';
    PERFORM cron.schedule('halkvakt-gallring-app-enhet', '35 3 * * *', 'SELECT gallra_app_enhet()');
  END IF;
END $$;
