-- 051: favoritprovets misslyckade anrop sparas (Bengt 13/10: "spara svaren på misslyckade anrop också", DECISIONS #542).
--
-- Varför: pg_net lägger varje svar i net._http_response men bara i sex timmar (pg_net.ttl), och utan adress, så ett svar går inte att
-- knyta till en funktion. 12/10 07:38 skickade schemaläggaren favoritprovets anrop (cron.job_run_details: succeeded) men funktionen
-- skrev ingen historik, och när det upptäcktes fanns svaret inte kvar (DECISIONS #541).
--
-- Hur:
--   1. Favoritprovets jobb skriver anropets id i public.anrop när det skickar anropet: kommandot SELECT net.http_post(...) blir
--      INSERT INTO public.anrop (id, jobb) SELECT net.http_post(...), 'halkvakt-favoritprov'. Kommandot ändras INNE i databasen med
--      regexp_replace(), så nyckeln aldrig står i en fil (husregeln, som sql/023 och 047). Bara det jobbet ändras.
--   2. Jobbet halkvakt-anropsfel (:27/:57, bara SQL, ingen funktion) läser svaren: ett lyckat svar (2xx) tas bort, ett misslyckat
--      (annan kod, tidsgräns eller fel) sparas med koden och de första 4 000 tecknen. Ett anrop utan svar efter sju timmar sparas som
--      det. Allt äldre än 30 dygn tas bort.
-- Svaren kommer från våra egna funktioner och Supabases portvakt; nyckeln står i anropets huvud, aldrig i svaret.
-- Låst dubbelt: RLS utan policy och REVOKE för anon och authenticated (CLAUDE.md-läxan om RLS).
-- CI:s PostGIS saknar pg_cron och pg_net: där skapas bara tabellen och funktionen, och resten gör ingenting.
-- Idempotent: körs filen igen ändras inget.

CREATE TABLE IF NOT EXISTS public.anrop (
  id          bigint PRIMARY KEY,                -- pg_net:s anrops-id = net._http_response.id
  jobb        text NOT NULL,
  t           timestamptz NOT NULL DEFAULT now(),
  klar        boolean NOT NULL DEFAULT false,    -- svaret läst (eller sju timmar utan svar)
  status_code integer,
  timed_out   boolean,
  fel         text,
  svar        text,
  svar_t      timestamptz
);
ALTER TABLE public.anrop ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON public.anrop FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON public.anrop FROM authenticated; END IF;
END $$;

-- Läser svaren: lyckade bort, misslyckade sparade. plpgsql, så att net._http_response bara behövs när den körs (inte i CI).
CREATE OR REPLACE FUNCTION public.anropsfel_sopa() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  UPDATE public.anrop a SET klar = true, status_code = r.status_code, timed_out = r.timed_out, fel = left(r.error_msg, 500),
    svar = left(r.content, 4000), svar_t = r.created
  FROM net._http_response r WHERE r.id = a.id AND NOT a.klar;
  DELETE FROM public.anrop WHERE klar AND status_code BETWEEN 200 AND 299 AND NOT coalesce(timed_out, false) AND fel IS NULL;
  UPDATE public.anrop SET klar = true, fel = 'inget svar i net._http_response efter sju timmar'
  WHERE NOT klar AND t < now() - interval '7 hours';
  DELETE FROM public.anrop WHERE t < now() - interval '30 days';
  SELECT count(*) INTO n FROM public.anrop WHERE klar;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.anropsfel_sopa() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON FUNCTION public.anropsfel_sopa() FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON FUNCTION public.anropsfel_sopa() FROM authenticated; END IF;
END $$;

DO $$
DECLARE j record; prov bigint; r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN;
  END IF;

  -- Självprovet FÖRST, på ett riktigt misslyckat svar: id:t läggs in som ett anrop, sopningen körs, och raden ska bära svaret.
  -- Faller provet rullas hela filen tillbaka, och inget jobb ändras.
  SELECT id INTO prov FROM net._http_response
  WHERE (status_code IS NULL OR status_code NOT BETWEEN 200 AND 299 OR timed_out OR error_msg IS NOT NULL)
    AND id NOT IN (SELECT id FROM public.anrop) ORDER BY created DESC LIMIT 1;
  IF prov IS NOT NULL THEN
    INSERT INTO public.anrop (id, jobb) VALUES (prov, 'sjalvprov 051');
    PERFORM public.anropsfel_sopa();
    SELECT * INTO r FROM public.anrop WHERE id = prov;
    IF NOT FOUND OR NOT r.klar OR r.svar_t IS NULL OR (r.status_code IS NULL AND r.fel IS NULL) THEN
      RAISE EXCEPTION 'sql/051: självprovet föll — det misslyckade svaret % sparades inte', prov;
    END IF;
    DELETE FROM public.anrop WHERE id = prov;
  END IF;
  -- Och ett lyckat svar ska tas bort.
  SELECT id INTO prov FROM net._http_response WHERE status_code BETWEEN 200 AND 299 AND NOT timed_out AND error_msg IS NULL
    AND id NOT IN (SELECT id FROM public.anrop) ORDER BY created DESC LIMIT 1;
  IF prov IS NOT NULL THEN
    INSERT INTO public.anrop (id, jobb) VALUES (prov, 'sjalvprov 051');
    PERFORM public.anropsfel_sopa();
    IF EXISTS (SELECT 1 FROM public.anrop WHERE id = prov) THEN
      RAISE EXCEPTION 'sql/051: självprovet föll — det lyckade svaret % togs inte bort', prov;
    END IF;
  END IF;

  -- Favoritprovets jobb skriver anropets id. Formen prövas först (läst 13/10 med DB-knappen: SELECT net.http_post(...), ett anrop).
  SELECT jobid, command INTO j FROM cron.job WHERE jobname = 'halkvakt-favoritprov';
  IF j.jobid IS NULL THEN RAISE EXCEPTION 'sql/051: jobbet halkvakt-favoritprov saknas'; END IF;
  IF j.command !~ '^\s*INSERT INTO public\.anrop ' THEN
    IF j.command !~ '^\s*SELECT\s+net\.http_post\(' OR j.command !~ '\)\s*;?\s*$'
       OR (length(j.command) - length(replace(j.command, 'net.http_post', ''))) / length('net.http_post') <> 1 THEN
      RAISE EXCEPTION 'sql/051: favoritprovets jobbkommando har inte väntad form — inget ändras';
    END IF;
    PERFORM cron.alter_job(j.jobid, command := regexp_replace(
      regexp_replace(j.command, '^\s*SELECT\s+net\.http_post\(', 'INSERT INTO public.anrop (id, jobb) SELECT net.http_post('),
      '\)(\s*;?\s*)$', '), ''halkvakt-favoritprov''\1'));
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-anropsfel';
  PERFORM cron.schedule('halkvakt-anropsfel', '27,57 * * * *', 'SELECT public.anropsfel_sopa()');
END $$;
