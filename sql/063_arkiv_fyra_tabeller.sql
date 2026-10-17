-- 063: de fyra tabellerna som aldrig rensas exporteras till hinken, men raderas inte (DECISIONS #618, Bengts val 17/10: "2 välj ii").
--
-- shadow_log, road_condition_history, situation_archive och smhi_warnings_history bär facit och skuggans utdata för vinterns domar, och
-- 43 filer läser dem, vissa 21 och 60 dygn bakåt eller från ett fast datum. De exporteras nu per dygn till hinken `arkiv` som de fem
-- andra (sql/053, 057), så att facit är säkrat utanför databasen. De RADERAS INTE: golvet är NULL, och `dag < i dag - NULL` är aldrig
-- sant. Radering väljs först när läsarna läser hinken (Bengt valde (ii), inte (i)). Det sparar alltså ingen plats.
--
-- Dygnet räknas på tabellens egen tidskolumn (arkiv2_tidkolumn): skuggans run_at, väglagets modified_time, händelsernas first_seen
-- (sätts när raden skrivs) och SMHI:s archived_at. Exporten sker när dygnet är åtta dygn gammalt (arkiv2_alder, som trendtabellerna):
-- en händelse i situation_archive skrivs om så länge den pågår (last_seen, message, end_time), och väglagets rader kan komma in sent med
-- en äldre modified_time. Kopian i hinken är alltså dygnet som det såg ut åtta dygn senare, inte för alltid.
CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                                'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

-- Tidskolumnen som dygnet räknas på. De fem första har observed_at.
CREATE OR REPLACE FUNCTION arkiv2_tidkolumn(tab text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE arkiv2_tabell(tab) WHEN 'shadow_log' THEN 'run_at' WHEN 'road_condition_history' THEN 'modified_time'
    WHEN 'situation_archive' THEN 'first_seen' WHEN 'smhi_warnings_history' THEN 'archived_at' ELSE 'observed_at' END
$$;

-- Golvet för raderingen: kandidatens loggar ett dygn (sql/062), de fyra aldrig (NULL), de andra det golv nattjobbet anger (10).
CREATE OR REPLACE FUNCTION arkiv2_golv(tab text, min_dygn int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 1
              WHEN tab IN ('shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history') THEN NULL
              ELSE min_dygn END
$$;

ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history'));

CREATE OR REPLACE FUNCTION arkiv2_att_exportera(tab text, maxantal int DEFAULT 2) RETURNS SETOF date
LANGUAGE plpgsql STABLE AS $$
DECLARE forsta date; k text := arkiv2_tidkolumn(tab);
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
DECLARE kol text; hdr text; forst text; ut text; k text := arkiv2_tidkolumn(tab);
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

-- Som sql/053: bokför ett exporterat dygn bara om filen bär lika många rader som databasen, räknat på tabellens tidskolumn.
CREATE OR REPLACE FUNCTION arkiv2_export_klar(tab text, d date, antal int, storlek int, sha text, vag text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int; k text := arkiv2_tidkolumn(tab);
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

-- Samma som sql/062, med tabellens tidskolumn (de fyra når hit aldrig, eftersom golvet är NULL).
CREATE OR REPLACE FUNCTION arkiv2_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 14) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE tb text; d date; filrader int; n int; k text;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT e.tabell, e.dag, e.rader INTO tb, d, filrader FROM arkiv_export_tabell e
   WHERE e.raderad IS NULL AND e.dag < (now() AT TIME ZONE 'UTC')::date - arkiv2_golv(e.tabell, min_dygn) ORDER BY e.dag, e.tabell LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat tabelldygn äldre än golvet (%s dygn, kandidatens loggar %s) att radera', min_dygn,
    arkiv2_golv('kandidat_station', min_dygn)); END IF;
  k := arkiv2_tidkolumn(tb);
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
  SELECT ((SELECT count(*) FROM arkiv2_att_exportera('trend_kandidater', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('trend_stigande', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('radar_precip', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_skugga', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_station', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('shadow_log', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('road_condition_history', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('situation_archive', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('smhi_warnings_history', 100000)))::int
$$;

-- Rättigheterna: som de andra arkiv2-funktionerna (sql/053, 057) — bara service-rollen, som arkivexporten kör som.
REVOKE ALL ON FUNCTION arkiv2_tidkolumn(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON FUNCTION arkiv2_tidkolumn(text) FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON FUNCTION arkiv2_tidkolumn(text) FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION arkiv2_tidkolumn(text) TO service_role;
    GRANT SELECT ON TABLE shadow_log, road_condition_history, situation_archive, smhi_warnings_history TO service_role;
  END IF;
END $$;
