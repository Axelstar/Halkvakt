-- 053: ARKIVEXPORTEN FÖR TRENDTABELLERNA OCH RADARN (kort #347, DECISIONS #569; Bengt 15/10 "kör steg 1 och steg 2 a").
-- `trend_kandidater`, `trend_stigande` och `radar_precip` gallrades aldrig och växte ~3–5 MB per dygn mot gratisnivåns 500 MB.
-- Samma väg som väderarkivet (sql/034, 045): varje färdigt dygn packas av arkivexporten till arkiv/<tabell>/ÅÅÅÅ-MM-DD.ndjson.gz,
-- läses tillbaka och bokförs här, och nattjobbet raderar exporterade dygn äldre än 14 dygn. Ingen rad raderas som inte står i en
-- fil; ett dygn som vuxit efter exporten tas ur bokföringen och exporteras om (045:s läxa). Alla tre tabellerna har tiden i
-- `observed_at` och nyckeln (första kolumnen, observed_at).
--   arkiv2_att_exportera(tab, n)   färdiga dygn (minst åtta dygn gamla: trendens utfall och trendarkivets omräkning är klara)
--   arkiv2_dygn(tab, d)            rubrikrad + en JSON-lista per rad, sorterad så att samma dygn alltid ger samma bytes
--   arkiv2_export_klar(...)        bokför bara om filen bär exakt dygnets radantal
--   arkiv2_radera_exporterat(...)  det äldsta bokförda tabelldygnet, ett per anrop, bara över max_mb och äldre än min_dygn
--   arkiv2_efterslap()             färdiga dygn som väntar, för vakthunden

CREATE TABLE IF NOT EXISTS arkiv_export_tabell (
  tabell text NOT NULL CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip')),
  dag date NOT NULL,
  rader int NOT NULL,
  bytes int NOT NULL,
  sha256 text NOT NULL,
  sokvag text NOT NULL,
  exporterad timestamptz NOT NULL DEFAULT now(),
  raderad timestamptz,
  raderade_rader int,
  PRIMARY KEY (tabell, dag)
);
ALTER TABLE arkiv_export_tabell ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE arkiv_export_tabell IS 'Kort #347 (DECISIONS #569): exporterade och verifierade dygn av trendtabellerna och radarn i hinken arkiv.';

-- Vitlistan: tabellnamnet går in i dynamisk SQL, så bara de tre släpps igenom.
CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_att_exportera(tab text, maxantal int DEFAULT 2) RETURNS SETOF date
LANGUAGE plpgsql STABLE AS $$
DECLARE forsta date;
BEGIN
  EXECUTE format('SELECT (min(observed_at) AT TIME ZONE ''UTC'')::date FROM %I', arkiv2_tabell(tab)) INTO forsta;
  IF forsta IS NULL THEN RETURN; END IF;
  RETURN QUERY EXECUTE format(
    'SELECT g.d::date FROM generate_series($1::timestamp, ((now() AT TIME ZONE ''UTC'')::date - 8)::timestamp, interval ''1 day'') g(d)
      WHERE NOT EXISTS (SELECT 1 FROM arkiv_export_tabell e WHERE e.tabell = $2 AND e.dag = g.d::date)
        AND EXISTS (SELECT 1 FROM %I t WHERE t.observed_at >= g.d AT TIME ZONE ''UTC''
                                         AND t.observed_at < (g.d + interval ''1 day'') AT TIME ZONE ''UTC'')
      ORDER BY 1 LIMIT $3', tab) USING forsta, tab, maxantal;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_dygn(tab text, d date) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE kol text; hdr text; forst text; ut text;
BEGIN
  SELECT string_agg(format('t.%I', column_name), ', ' ORDER BY ordinal_position),
         json_agg(column_name::text ORDER BY ordinal_position)::text,
         (array_agg(column_name::text ORDER BY ordinal_position))[1]
    INTO kol, hdr, forst
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = arkiv2_tabell(tab);
  EXECUTE format('SELECT coalesce(string_agg(json_build_array(%s)::text, E''\n'' ORDER BY t.%I, t.observed_at), '''')
                  FROM %I t WHERE t.observed_at >= $1 AND t.observed_at < $2', kol, forst, tab)
    INTO ut USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  RETURN hdr || E'\n' || ut;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_export_klar(tab text, d date, antal int, storlek int, sha text, vag text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I WHERE observed_at >= $1 AND observed_at < $2', arkiv2_tabell(tab))
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n <> antal THEN RAISE EXCEPTION 'arkiv2_export_klar: % dygnet % har % rader i databasen men filen bär %', tab, d, n, antal; END IF;
  INSERT INTO arkiv_export_tabell AS e (tabell, dag, rader, bytes, sha256, sokvag) VALUES (tab, d, antal, storlek, sha, vag)
    ON CONFLICT ON CONSTRAINT arkiv_export_tabell_pkey DO UPDATE SET rader = EXCLUDED.rader, bytes = EXCLUDED.bytes,
      sha256 = EXCLUDED.sha256, sokvag = EXCLUDED.sokvag, exporterad = now()
    WHERE e.raderad IS NULL;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 14) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE tb text; d date; filrader int; n int;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT e.tabell, e.dag, e.rader INTO tb, d, filrader FROM arkiv_export_tabell e
   WHERE e.raderad IS NULL AND e.dag < (now() AT TIME ZONE 'UTC')::date - min_dygn ORDER BY e.dag, e.tabell LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat tabelldygn äldre än %s dygn att radera', min_dygn); END IF;
  EXECUTE format('SELECT count(*) FROM %I WHERE observed_at >= $1 AND observed_at < $2', arkiv2_tabell(tb))
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n > filrader THEN
    DELETE FROM arkiv_export_tabell e WHERE e.tabell = tb AND e.dag = d;
    RETURN format('%s %s har %s rader, filen bara %s — exporteras om, raderas en senare natt', tb, d, n, filrader);
  END IF;
  EXECUTE format('DELETE FROM %I WHERE observed_at >= $1 AND observed_at < $2', tb)
    USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  UPDATE arkiv_export_tabell e SET raderad = now(), raderade_rader = n WHERE e.tabell = tb AND e.dag = d;
  RETURN format('%s: raderade %s rader för %s (filen bär %s)', tb, n, d, filrader);
END $$;

CREATE OR REPLACE FUNCTION arkiv2_efterslap() RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT ((SELECT count(*) FROM arkiv2_att_exportera('trend_kandidater', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('trend_stigande', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('radar_precip', 100000)))::int
$$;

-- Rättigheterna som i sql/034: edge-funktionen (service-rollen) får läsa, lista och bokföra — aldrig radera.
REVOKE ALL ON FUNCTION arkiv2_tabell(text), arkiv2_att_exportera(text, int), arkiv2_dygn(text, date),
                       arkiv2_export_klar(text, date, int, int, text, text), arkiv2_radera_exporterat(int, int), arkiv2_efterslap() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION arkiv2_tabell(text), arkiv2_att_exportera(text, int), arkiv2_dygn(text, date),
                              arkiv2_export_klar(text, date, int, int, text, text), arkiv2_efterslap() TO service_role;
    GRANT SELECT, INSERT, UPDATE ON arkiv_export_tabell TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE arkiv_export_tabell FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE arkiv_export_tabell FROM authenticated; END IF;
END $$;

-- Raderingen 03:50, efter väderarkivets 03:45: upp till 40 tabelldygn per natt (ikapp på två nätter, sedan tre per natt).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-arkivradering-tabeller';
    PERFORM cron.schedule('halkvakt-arkivradering-tabeller', '50 3 * * *', 'SELECT arkiv2_radera_exporterat(350, 14) FROM generate_series(1, 40)');
  END IF;
END $$;
