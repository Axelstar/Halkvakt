-- 115: PUBLICERINGENS BYGGTID SPARAS (DECISIONS #896, körlistan B6; Bengt 17/11: "b6 ja").
--
-- VARFÖR. Ett av småvägsröstens avbrottsvillkor (#833) lyder: publiceringens bygge tar mer än dubbelt så lång tid som medianen
-- veckan före påslaget, två körningar i rad. Byggtiden står i publiceras eget svar (tider.bygget, #741), men svaren finns bara kvar
-- i pg_net i omkring sex timmar, och public.anrop raderar lyckade anrop (sql/051). Mätt 17/11 (#892): ingen kunde läsa veckans
-- median, och ingen vakt jämförde mot den. Villkoret gick alltså inte att pröva.
--
-- VAD.
--   publicera_bygge          en rad per publicering: när svaret kom och hur lång tid bygget tog.
--   publicera_bygge_samla()  lägger in de svar pg_net ännu bär och som saknas i tabellen, och gallrar efter 60 dygn — utom
--                            referensveckan före påslaget, som står kvar så länge brytarna är på. Vakthunden anropar den varje
--                            timme, och pg_net bär omkring sex timmar, så ingen körning tappas på ett missat varv.
--   publicera_bygge_lage()   underlaget för vakthundens rad och för villkoret:
--                              - referensen: medianen de sju dygnen före påslaget, eller de sju senaste dygnen medan brytarna är av;
--                              - påslaget: den tidigaste ändringen bland de brytare som är på (smavagsbrytare.andrad_at, sql/103);
--                              - över: sant när brytarna är på och två körningar i rad den senaste timmen tog mer än det dubbla
--                                av referensen. Med brytarna av är det aldrig sant: villkoren gäller från påslaget (#833).
-- Funktionerna anropas en gång i timmen, inte per rad i en stor sats (CLAUDE.md, #783). samla är plpgsql med fast sökväg (#784).
-- Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
-- ORDNINGEN: efter sql/103. TILLBAKA: DROP FUNCTION publicera_bygge_lage(), publicera_bygge_samla(); DROP TABLE publicera_bygge.

CREATE TABLE IF NOT EXISTS publicera_bygge (
  t          timestamptz PRIMARY KEY,                      -- när svaret kom (net._http_response.created)
  bygget_ms  integer NOT NULL CHECK (bygget_ms >= 0)       -- publiceras tider.bygget: bygget av lägesfilen, i millisekunder
);

CREATE OR REPLACE FUNCTION publicera_bygge_samla() RETURNS integer
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE n integer := 0; pa_sedan timestamptz;
BEGIN
  -- Gallringen: 60 dygn, men aldrig referensveckan före påslaget. Utan undantaget hade referensen försvunnit 53 dygn efter
  -- påslaget, och villkoret hade tystnat utan ett ord.
  SELECT min(andrad_at) FILTER (WHERE pa) INTO pa_sedan FROM smavagsbrytare;
  DELETE FROM publicera_bygge WHERE t < now() - interval '60 days'
    AND (pa_sedan IS NULL OR t < pa_sedan - interval '7 days' OR t >= pa_sedan);                    -- REFERENS_DYGN
  -- CI:s PostGIS har inget pg_net. Då finns inget att samla, och satsen nedan står som text så att funktionen ändå går att skapa.
  IF to_regclass('net._http_response') IS NULL THEN RETURN 0; END IF;
  EXECUTE $q$
    INSERT INTO publicera_bygge (t, bygget_ms)
    SELECT created, substring(content from '"tider":\{[^}]*"bygget":([0-9]+)')::integer
    FROM net._http_response
    WHERE status_code = 200 AND content LIKE '%"bygget_delar"%'
      AND substring(content from '"tider":\{[^}]*"bygget":([0-9]+)') IS NOT NULL
    ON CONFLICT (t) DO NOTHING $q$;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
COMMENT ON FUNCTION publicera_bygge_samla() IS 'Publiceringens byggtid (sql/115, #896): lägger in de svar pg_net ännu bär och gallrar efter 60 dygn, utom referensveckan före påslaget. Returnerar antalet nya rader. Bara service-rollen.';

CREATE OR REPLACE FUNCTION publicera_bygge_lage()
RETURNS TABLE (pa_sedan timestamptz, referens_ms integer, referens_n integer, referens_dygn numeric, senaste_ms integer,
               senaste_t timestamptz, rader integer, par_i_rad integer, over boolean)
LANGUAGE sql STABLE AS $$
  WITH f AS (
    SELECT b.pa_sedan, coalesce(b.pa_sedan, now()) AS slut
    FROM (SELECT min(andrad_at) FILTER (WHERE pa) AS pa_sedan FROM smavagsbrytare) b
  ), ref AS (
    SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY p.bygget_ms))::integer AS ms, count(*)::integer AS n,
           round((extract(epoch FROM max(p.t) - min(p.t)) / 86400)::numeric, 1) AS dygn
    FROM publicera_bygge p, f WHERE p.t >= f.slut - interval '7 days' AND p.t < f.slut             -- REFERENS_DYGN
  ), sist AS (
    SELECT (SELECT p.bygget_ms FROM publicera_bygge p ORDER BY p.t DESC LIMIT 1) AS ms, max(t) AS t, count(*)::integer AS rader
    FROM publicera_bygge
  ), par AS (
    SELECT count(*) FILTER (WHERE x.bygget_ms > 2 * ref.ms AND x.forra > 2 * ref.ms)::integer AS n   -- DUBBLA, TVA_I_RAD
    FROM (SELECT p.t, p.bygget_ms, lag(p.bygget_ms) OVER (ORDER BY p.t) AS forra
          FROM publicera_bygge p WHERE p.t > now() - interval '70 minutes') x, ref                  -- SENASTE_TIMMEN
  )
  SELECT f.pa_sedan, ref.ms, ref.n, ref.dygn, sist.ms, sist.t, sist.rader, par.n,
         (f.pa_sedan IS NOT NULL AND ref.ms IS NOT NULL AND par.n > 0)
  FROM f, ref, sist, par
$$;
COMMENT ON FUNCTION publicera_bygge_lage() IS 'Publiceringens byggtid (sql/115, #896): referensens median (veckan före påslaget, eller de sju senaste dygnen med brytarna av), den senaste körningen, och om två körningar i rad den senaste timmen tog mer än det dubbla av referensen medan brytarna är på (avbrottsvillkoret i #833). Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE, vaktat på rollerna (CI:s PostGIS har dem inte).
ALTER TABLE publicera_bygge ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE publicera_bygge FROM PUBLIC;
REVOKE ALL ON FUNCTION publicera_bygge_samla(), publicera_bygge_lage() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE publicera_bygge FROM anon;
    REVOKE ALL ON FUNCTION publicera_bygge_samla(), publicera_bygge_lage() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE publicera_bygge FROM authenticated;
    REVOKE ALL ON FUNCTION publicera_bygge_samla(), publicera_bygge_lage() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE publicera_bygge TO service_role;
    GRANT EXECUTE ON FUNCTION publicera_bygge_samla(), publicera_bygge_lage() TO service_role;
  END IF;
END $$;
