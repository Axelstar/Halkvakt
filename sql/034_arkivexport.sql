-- 034: vinterarkivets export till Supabase Storage (kort #83 steg 2a, DECISIONS #334; Bengt 24/9: "kör export till supabase storage").
--
-- VAD DEN GÖR. Varje färdigt och gallrat dygn i `weather_observations` (äldre än 8 dygn: gallringen i sql/014 tunnar allt
-- äldre än 7 dygn till en rad per station och halvtimme, så dygnet är stilla) packas av edge-funktionen `arkivexport` till
-- `arkiv/weather_observations/ÅÅÅÅ-MM-DD.ndjson.gz` i en privat hink, läses tillbaka, räknas och bokförs här. Raderna
-- lämnar databasen FÖRST när databasen närmar sig gratisnivåns skrivskydd (500 MB) — och då bara det äldsta exporterade,
-- verifierade dygnet, ett per natt, aldrig ett dygn yngre än 30. Så länge databasen är liten står allt kvar och grind A:s
-- 60-dygnsfönster räknas som förut.
--
-- FORMAT. Första raden är kolumnnamnen som JSON-lista (geom blir lon, lat), sedan en JSON-lista med värden per rad. Ungefär
-- 200 byte per rad mot 480 med kolumnnamnen på varje rad (mätt 24/9); ett vinterdygn (848 stationer × 48) ≈ 8 MB text,
-- ≈ 1 MB packad. Kolumnerna läses ur katalogen, så en ny kolumn följer med utan att någon ändrar här.
--
-- ÅTERLÄSNING (för marsdomarna, när raderingen väl börjat): filerna läses tillbaka i en PostGIS-container, som arkivbackupen
-- (kort #213) redan provar varje vecka för sin dump. Det steget byggs före mars — raden står i DECISIONS #334.

CREATE TABLE IF NOT EXISTS arkiv_export (
  dag date PRIMARY KEY,
  rader int NOT NULL,
  bytes int NOT NULL,
  sha256 text NOT NULL,
  sokvag text NOT NULL,
  exporterad timestamptz NOT NULL DEFAULT now(),
  raderad timestamptz,
  raderade_rader int
);
ALTER TABLE arkiv_export ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE arkiv_export IS 'Kort #83 steg 2a (DECISIONS #334): exporterade och verifierade dygn av weather_observations i hinken arkiv.';

-- Dygn att exportera: färdiga (äldre än 8 dygn), med rader, inte redan exporterade. Äldst först.
CREATE OR REPLACE FUNCTION arkiv_att_exportera(maxantal int DEFAULT 2) RETURNS SETOF date
LANGUAGE sql STABLE AS $$
  SELECT g.d::date
  FROM generate_series((SELECT (min(sample_time) AT TIME ZONE 'UTC')::date FROM weather_observations),
                       (now() AT TIME ZONE 'UTC')::date - 9, interval '1 day') g(d)
  WHERE NOT EXISTS (SELECT 1 FROM arkiv_export e WHERE e.dag = g.d::date)
    AND EXISTS (SELECT 1 FROM weather_observations w
                WHERE w.sample_time >= (g.d::date)::timestamp AT TIME ZONE 'UTC'
                  AND w.sample_time < (g.d::date + 1)::timestamp AT TIME ZONE 'UTC')
  ORDER BY 1 LIMIT maxantal
$$;

-- Ett dygn som text: rubrikrad + en JSON-lista per rad, sorterad så att samma dygn alltid ger samma bytes.
CREATE OR REPLACE FUNCTION arkiv_dygn(d date) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE kol text; hdr text; ut text;
BEGIN
  SELECT string_agg(CASE WHEN column_name = 'geom' THEN 'ST_X(w.geom), ST_Y(w.geom)' ELSE format('w.%I', column_name) END, ', ' ORDER BY ordinal_position),
         json_agg(CASE WHEN column_name = 'geom' THEN 'lon' ELSE column_name END ORDER BY ordinal_position)::text
    INTO kol, hdr
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations';
  hdr := replace(hdr, '"lon"', '"lon", "lat"');
  EXECUTE format('SELECT coalesce(string_agg(json_build_array(%s)::text, E''\n'' ORDER BY w.station_id, w.sample_time), '''')
                  FROM weather_observations w WHERE w.sample_time >= $1 AND w.sample_time < $2', kol)
    INTO ut USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  RETURN hdr || E'\n' || ut;
END $$;

-- Bokför ett exporterat dygn. Räknar dygnet en gång till i databasen: bär filen inte exakt lika många rader som dygnet har
-- nu, bokförs ingenting (och raderingen kan därmed aldrig ta det dygnet).
CREATE OR REPLACE FUNCTION arkiv_export_klar(d date, antal int, storlek int, sha text, vag text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM weather_observations
   WHERE sample_time >= d::timestamp AT TIME ZONE 'UTC' AND sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC';
  IF n <> antal THEN RAISE EXCEPTION 'arkiv_export_klar: dygnet % har % rader i databasen men filen bär %', d, n, antal; END IF;
  INSERT INTO arkiv_export (dag, rader, bytes, sha256, sokvag) VALUES (d, antal, storlek, sha, vag)
    ON CONFLICT (dag) DO UPDATE SET rader = EXCLUDED.rader, bytes = EXCLUDED.bytes, sha256 = EXCLUDED.sha256,
                                    sokvag = EXCLUDED.sokvag, exporterad = now()
    WHERE arkiv_export.raderad IS NULL;
  RETURN n;
END $$;

-- Raderingen: bara när databasen är över max_mb, bara det ÄLDSTA exporterade dygnet, ett per anrop, aldrig yngre än min_dygn,
-- och bara om databasen inte bär FLER rader för dygnet än filen (en sen insättning stoppar raderingen högljutt).
CREATE OR REPLACE FUNCTION arkiv_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 30) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE d date; filrader int; n int;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT dag, rader INTO d, filrader FROM arkiv_export
   WHERE raderad IS NULL AND dag < (now() AT TIME ZONE 'UTC')::date - min_dygn ORDER BY dag LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat dygn äldre än %s dygn att radera', min_dygn); END IF;
  SELECT count(*) INTO n FROM weather_observations
   WHERE sample_time >= d::timestamp AT TIME ZONE 'UTC' AND sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC';
  IF n > filrader THEN RAISE EXCEPTION 'arkiv_radera_exporterat: dygnet % har % rader, filen bara % — raderar inte', d, n, filrader; END IF;
  DELETE FROM weather_observations
   WHERE sample_time >= d::timestamp AT TIME ZONE 'UTC' AND sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC';
  UPDATE arkiv_export SET raderad = now(), raderade_rader = n WHERE dag = d;
  RETURN format('raderade %s rader för %s (filen bär %s)', n, d, filrader);
END $$;

-- Eftersläpningen, för vakthunden: färdiga dygn med rader som inte är exporterade.
CREATE OR REPLACE FUNCTION arkiv_efterslap() RETURNS int
LANGUAGE sql STABLE AS $$ SELECT count(*)::int FROM arkiv_att_exportera(100000) $$;

-- Rättigheterna. Edge-funktionen (service-rollen) får läsa, lista och bokföra — aldrig radera. Raderingen körs bara av pg_cron.
REVOKE ALL ON FUNCTION arkiv_att_exportera(int), arkiv_dygn(date), arkiv_export_klar(date, int, int, text, text),
                       arkiv_radera_exporterat(int, int), arkiv_efterslap() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION arkiv_att_exportera(int), arkiv_dygn(date), arkiv_export_klar(date, int, int, text, text),
                              arkiv_efterslap() TO service_role;
    GRANT SELECT, INSERT, UPDATE ON arkiv_export TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE arkiv_export FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE arkiv_export FROM authenticated; END IF;
END $$;

-- Hinken: privat. Finns bara i Supabase; CI:s PostGIS saknar storage-schemat.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('arkiv', 'arkiv', false) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Schemat. Exporten varje timme på minut 40 (inte :00/:30, där kort #244:s resursgräns slår), två dygn per anrop — eftersläpningen
-- från 24/8 är borta på ett halvt dygn, sedan har anropet inget att göra. Kommandot KOPIERAS ur skuggmotorns jobb inne i
-- databasen med replace(), så nyckeln aldrig står i en fil (husregeln). Raderingen 03:45, efter gallringen 03:15.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/034: skuggmotorns jobbkommando har inte väntad form — arkivexportens jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('halkvakt-arkivexport', 'halkvakt-arkivradering');
    PERFORM cron.schedule('halkvakt-arkivexport', '40 * * * *', replace(k, '/functions/v1/skuggmotor''', '/functions/v1/arkivexport'''));
    PERFORM cron.schedule('halkvakt-arkivradering', '45 3 * * *', 'SELECT arkiv_radera_exporterat(350, 30)');
  END IF;
END $$;
