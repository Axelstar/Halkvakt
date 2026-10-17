-- 061: KANDIDATENS LOGGAR ETT DYGN, OCH DE FYRA TABELLERNA SOM ALDRIG RENSATS TILL HINKEN (kort #347, DECISIONS #611;
-- Axel 17/10: "Gör (b)", "exportera till arkivet först och gallra sedan").
-- 1. (b) i bedömningen §4.2: kandidat_skugga och kandidat_station raderas ur databasen efter ett dygn i stället för tre (sql/057).
--    De exporteras dygnet efter som förut, och domen i mars läser hinken.
-- 2. shadow_log, road_condition_history, situation_archive och smhi_warnings_history exporteras till arkiv/<tabell>/ÅÅÅÅ-MM-DD.ndjson.gz
--    av arkivexporten, samma väg som trendtabellerna (sql/053): läses tillbaka och bokförs bara om filen bär dygnets radantal.
--    Tabellerna har var sin tidskolumn, så den läses ur arkiv2_tid() i stället för att `observed_at` står i frågorna.
--    RADERINGEN AV DE FYRA ÄR AVSTÄNGD (arkiv2_golv ger null): grindarna K-B och R-B läser 30 dygn av road_condition_history och
--    situation_archive, höjdprovet 60 dygn av shadow_log och V-B hela säsongen, och grindarnas tillfälliga databas kopierar de
--    tabellerna HELA ur driften (scripts/tillfalliga-arkivet.ts steg 5) — inte ur hinken. Ett golv sätts i en egen migration när
--    valet är gjort (DECISIONS #611).

ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history'));

CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                                'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

-- Tidskolumnen som delar tabellen i dygn (samma som scripts/vardevakten.ts TID). situation_archive delas på last_seen: en händelse
-- som fortfarande syns flyttar till ett senare dygn och exporteras där igen; den senaste filen bär den senaste raden.
CREATE OR REPLACE FUNCTION arkiv2_tid(tab text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE arkiv2_tabell(tab) WHEN 'shadow_log' THEN 'run_at' WHEN 'road_condition_history' THEN 'modified_time'
                                 WHEN 'situation_archive' THEN 'last_seen' WHEN 'smhi_warnings_history' THEN 'published'
                                 ELSE 'observed_at' END
$$;

-- Golvet för raderingen: kandidatens loggar ett dygn (b, DECISIONS #611; förut tre, #573), de fyra ingen radering (null), de andra
-- det golv nattjobbet anger (14).
CREATE OR REPLACE FUNCTION arkiv2_golv(tab text, min_dygn int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 1
              WHEN tab IN ('shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history') THEN NULL
              ELSE min_dygn END
$$;

CREATE OR REPLACE FUNCTION arkiv2_att_exportera(tab text, maxantal int DEFAULT 2) RETURNS SETOF date
LANGUAGE plpgsql STABLE AS $$
DECLARE forsta date; k text := arkiv2_tid(tab);
BEGIN
  EXECUTE format('SELECT (min(%I) AT TIME ZONE ''UTC'')::date FROM %I', k, arkiv2_tabell(tab)) INTO forsta;
  IF forsta IS NULL THEN RETURN; END IF;
  RETURN QUERY EXECUTE format(
    'SELECT g.d::date FROM generate_series($1::timestamp, ((now() AT TIME ZONE ''UTC'')::date - $4)::timestamp, interval ''1 day'') g(d)
      WHERE NOT EXISTS (SELECT 1 FROM arkiv_export_tabell e WHERE e.tabell = $2 AND e.dag = g.d::date)
        AND EXISTS (SELECT 1 FROM %I t WHERE t.%I >= g.d AT TIME ZONE ''UTC''
                                         AND t.%I < (g.d + interval ''1 day'') AT TIME ZONE ''UTC'')
      ORDER BY 1 LIMIT $3', tab, k, k) USING forsta, tab, maxantal, arkiv2_alder(tab);
END $$;

CREATE OR REPLACE FUNCTION arkiv2_dygn(tab text, d date) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE kol text; hdr text; forst text; ut text; k text := arkiv2_tid(tab);
BEGIN
  SELECT string_agg(format('t.%I', column_name), ', ' ORDER BY ordinal_position),
         json_agg(column_name::text ORDER BY ordinal_position)::text,
         (array_agg(column_name::text ORDER BY ordinal_position))[1]
    INTO kol, hdr, forst
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = arkiv2_tabell(tab);
  EXECUTE format('SELECT coalesce(string_agg(json_build_array(%s)::text, E''\n'' ORDER BY t.%I, t.%I), '''')
                  FROM %I t WHERE t.%I >= $1 AND t.%I < $2', kol, forst, k, tab, k, k)
    INTO ut USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  RETURN hdr || E'\n' || ut;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_export_klar(tab text, d date, antal int, storlek int, sha text, vag text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int; k text := arkiv2_tid(tab);
BEGIN
  EXECUTE format('SELECT count(*) FROM %I WHERE %I >= $1 AND %I < $2', arkiv2_tabell(tab), k, k)
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n <> antal THEN RAISE EXCEPTION 'arkiv2_export_klar: % dygnet % har % rader i databasen men filen bär %', tab, d, n, antal; END IF;
  INSERT INTO arkiv_export_tabell AS e (tabell, dag, rader, bytes, sha256, sokvag) VALUES (tab, d, antal, storlek, sha, vag)
    ON CONFLICT ON CONSTRAINT arkiv_export_tabell_pkey DO UPDATE SET rader = EXCLUDED.rader, bytes = EXCLUDED.bytes,
      sha256 = EXCLUDED.sha256, sokvag = EXCLUDED.sokvag, exporterad = now()
    WHERE e.raderad IS NULL;
  RETURN n;
END $$;

-- Som sql/057, men tidskolumnen per tabell och bara tabeller med ett golv (null hoppas över: dag < idag - null är aldrig sant).
CREATE OR REPLACE FUNCTION arkiv2_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 14) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE tb text; d date; filrader int; n int; k text;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT e.tabell, e.dag, e.rader INTO tb, d, filrader FROM arkiv_export_tabell e
   WHERE e.raderad IS NULL AND e.dag < (now() AT TIME ZONE 'UTC')::date - arkiv2_golv(e.tabell, min_dygn) ORDER BY e.dag, e.tabell LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat tabelldygn äldre än golvet (%s dygn, kandidatens loggar 1) att radera', min_dygn); END IF;
  k := arkiv2_tid(tb);
  EXECUTE format('SELECT count(*) FROM %I WHERE %I >= $1 AND %I < $2', arkiv2_tabell(tb), k, k)
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n > filrader THEN
    DELETE FROM arkiv_export_tabell e WHERE e.tabell = tb AND e.dag = d;
    RETURN format('%s %s har %s rader, filen bara %s — exporteras om, raderas en senare natt', tb, d, n, filrader);
  END IF;
  EXECUTE format('DELETE FROM %I WHERE %I >= $1 AND %I < $2', tb, k, k)
    USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  UPDATE arkiv_export_tabell e SET raderad = now(), raderade_rader = n WHERE e.tabell = tb AND e.dag = d;
  RETURN format('%s: raderade %s rader för %s (filen bär %s)', tb, n, d, filrader);
END $$;

CREATE OR REPLACE FUNCTION arkiv2_efterslap() RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT sum((SELECT count(*) FROM arkiv2_att_exportera(t, 100000)))::int
  FROM unnest(ARRAY['trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history']) t
$$;

-- Rättigheterna som i sql/053 och 057: service-rollen får läsa, lista och bokföra — aldrig radera. De fyra tabellerna läses av
-- arkiv2_dygn som service-rollen.
REVOKE ALL ON FUNCTION arkiv2_tid(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON FUNCTION arkiv2_tid(text) FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON FUNCTION arkiv2_tid(text) FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION arkiv2_tid(text) TO service_role;
    GRANT SELECT ON TABLE shadow_log, road_condition_history, situation_archive, smhi_warnings_history TO service_role;
  END IF;
END $$;
