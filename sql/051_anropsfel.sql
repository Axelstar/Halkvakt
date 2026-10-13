-- 051: de schemalagda jobbens misslyckade anrop sparas med svaret (Bengt 13/10: "spara svaren på misslyckade anrop också" och
-- "logga alla jobb på samma sätt", DECISIONS #542, #543). Omskriven för alla jobb innan den körts i drift (#543).
--
-- Varför: pg_net lägger varje svar i net._http_response men bara i sex timmar (pg_net.ttl), och utan adress, så ett svar går inte att
-- knyta till ett jobb. 12/10 07:38 skickade schemaläggaren favoritprovets anrop men funktionen skrev ingen historik, och när det
-- upptäcktes fanns svaret inte kvar (#541). 13/10 fanns 2 svar med kod 500 (00:00, 00:50 UTC) som inget jobb kunde knytas till.
--
-- Hur:
--   1. Varje jobb som anropar en funktion skriver anropets id och sitt processnummer i public.anrop i samma sats:
--      SELECT net.http_post(...) blir INSERT INTO public.anrop (id, pid) SELECT net.http_post(...), pg_backend_pid().
--      Jobbets namn står INTE i kommandot. Sopningen läser det ur cron.job_run_details (job_pid och start_time), så ett kommando som
--      kopieras till ett nytt jobb (pulsklockan, sql/047:s replace()) loggar under rätt namn. Kommandona ändras INNE i databasen med
--      regexp_replace(), så nyckeln aldrig står i en fil (husregeln, som sql/023 och 047).
--   2. Varje ny form prövas med EXPLAIN innan något jobb ändras (planeras, körs inte, inget anrop skickas). Faller ett enda jobb, eller
--      har ett jobb en annan form, rullas hela filen tillbaka och felet namnger bara jobben, aldrig kommandot.
--   3. Jobbet halkvakt-anropsfel (:27/:57, bara SQL, ingen funktion) läser svaren: ett lyckat (2xx) tas bort, ett misslyckat (annan
--      kod, tidsgräns eller fel) sparas med koden och de första 4 000 tecknen. Ett anrop utan svar efter sju timmar sparas som det.
--      Allt äldre än 30 dygn tas bort.
-- Svaren kommer från våra egna funktioner, GitHubs API (pulsklockan) och Supabases portvakt; nycklarna står i anropets huvud, aldrig i
-- svaret. Låst dubbelt: RLS utan policy och REVOKE för anon och authenticated (CLAUDE.md-läxan om RLS). Vakthunden larmar om
-- ingest-lives senaste körning har status failed (9d), så en inskrivning som faller syns inom en timme.
-- CI:s PostGIS saknar pg_cron och pg_net: där skapas bara tabellen och sopningen, och resten gör ingenting.
-- Idempotent: körs filen igen ändras inget (ett kommando som redan skriver i public.anrop hoppas över).

CREATE TABLE IF NOT EXISTS public.anrop (
  id          bigint PRIMARY KEY,                -- pg_net:s anrops-id = net._http_response.id
  pid         integer,                           -- jobbets process (pg_backend_pid() = cron.job_run_details.job_pid)
  jobb        text,                              -- ur cron.job_run_details, skrivet av sopningen
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

-- Jobbet ur processnumret, svaren ur pg_net: lyckade bort, misslyckade sparade. plpgsql, så att net och cron bara behövs när den körs.
CREATE OR REPLACE FUNCTION public.anropsfel_sopa() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  UPDATE public.anrop a SET jobb = x.jobname FROM (
    SELECT DISTINCT ON (a2.id) a2.id, j.jobname FROM public.anrop a2
    JOIN cron.job_run_details d ON d.job_pid = a2.pid AND d.start_time <= a2.t + interval '5 seconds' AND d.start_time > a2.t - interval '1 hour'
    JOIN cron.job j ON j.jobid = d.jobid
    WHERE a2.jobb IS NULL AND a2.pid IS NOT NULL ORDER BY a2.id, d.start_time DESC) x
  WHERE a.id = x.id;
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
DECLARE j record; prov bigint; r record; ny text; avvikande text := ''; fallna text := ''; andras int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN;
  END IF;

  -- Självprovet FÖRST, på riktiga svar: ett misslyckat ska sparas med svaret, ett lyckat ska tas bort. Faller det rullas allt tillbaka.
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
  SELECT id INTO prov FROM net._http_response WHERE status_code BETWEEN 200 AND 299 AND NOT timed_out AND error_msg IS NULL
    AND id NOT IN (SELECT id FROM public.anrop) ORDER BY created DESC LIMIT 1;
  IF prov IS NOT NULL THEN
    INSERT INTO public.anrop (id, jobb) VALUES (prov, 'sjalvprov 051');
    PERFORM public.anropsfel_sopa();
    IF EXISTS (SELECT 1 FROM public.anrop WHERE id = prov) THEN
      RAISE EXCEPTION 'sql/051: självprovet föll — det lyckade svaret % togs inte bort', prov;
    END IF;
  END IF;

  -- Varje jobb som anropar en funktion: formen prövas (läst 13/10 med DB-knappen: alla 26 är SELECT net.http_post(...), ett anrop),
  -- och den nya formen planeras med EXPLAIN. Inget ändras förrän alla har klarat båda.
  FOR j IN SELECT jobid, jobname, command FROM cron.job WHERE command ~ 'net\.http_post' ORDER BY jobname LOOP
    CONTINUE WHEN j.command ~ '^\s*INSERT INTO public\.anrop ';
    IF j.command !~ '^\s*SELECT\s+net\.http_post\(' OR j.command !~ '\)\s*;?\s*$'
       OR (length(j.command) - length(replace(j.command, 'net.http_post', ''))) / length('net.http_post') <> 1 THEN
      avvikande := avvikande || j.jobname || ' ';
      CONTINUE;
    END IF;
    ny := regexp_replace(regexp_replace(j.command, '^\s*SELECT\s+net\.http_post\(', 'INSERT INTO public.anrop (id, pid) SELECT net.http_post('),
      '\)(\s*;?\s*)$', '), pg_backend_pid()\1');
    BEGIN
      EXECUTE 'EXPLAIN ' || regexp_replace(ny, '\s*;?\s*$', '');
    EXCEPTION WHEN OTHERS THEN
      fallna := fallna || j.jobname || ' (' || SQLSTATE || ') ';
    END;
  END LOOP;
  IF avvikande <> '' OR fallna <> '' THEN
    RAISE EXCEPTION 'sql/051: inget jobb ändras — annan form: [%], föll i EXPLAIN: [%]', trim(avvikande), trim(fallna);
  END IF;
  FOR j IN SELECT jobid, command FROM cron.job WHERE command ~ 'net\.http_post' AND command !~ '^\s*INSERT INTO public\.anrop ' LOOP
    PERFORM cron.alter_job(j.jobid, command := regexp_replace(
      regexp_replace(j.command, '^\s*SELECT\s+net\.http_post\(', 'INSERT INTO public.anrop (id, pid) SELECT net.http_post('),
      '\)(\s*;?\s*)$', '), pg_backend_pid()\1'));
    andras := andras + 1;
  END LOOP;
  RAISE NOTICE 'sql/051: % jobb skriver nu sina anrop i public.anrop', andras;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-anropsfel';
  PERFORM cron.schedule('halkvakt-anropsfel', '27,57 * * * *', 'SELECT public.anropsfel_sopa()');
END $$;
