-- 042: arkivexportens återläsning (kort #291; Bengts ja 3/10, DECISIONS #450). Exportfilerna i hinken `arkiv` (sql/034) har
-- formatet rubrikrad + en JSON-lista per rad, med geom som lon, lat. Här läses de tillbaka — innan raderingen börjar ta dygn ur
-- databasen (vid 350 MB, runt 15/10 i takten 3/10), inte "före mars".
--   arkiv_rader(text)        filens rader som weather_observations-rader (ren tolkning, skriver inget)
--   arkiv_aterlas(text)      läser tillbaka filen till weather_observations, ON CONFLICT DO NOTHING — för en container i mars,
--                            eller för att återställa ett dygn; körs bara av postgres, aldrig av service-rollen
--   arkiv_jamfor(date, text) jämför filen med databasens rader för dygnet, kolumn för kolumn — skriver inget; arkivexportens
--                            ?aterlasprov=1 kör den mot det äldsta exporterade dygnet i hinken
-- Kolumnerna kommer ur rubrikraden, inte ur en lista här: en ny kolumn i tabellen följer med av sig själv, som i arkiv_dygn.

CREATE OR REPLACE FUNCTION arkiv_rader(t text) RETURNS SETOF weather_observations
LANGUAGE plpgsql STABLE AS $$
DECLARE hdr json; rad text; obj jsonb; r weather_observations;
BEGIN
  hdr := split_part(t, E'\n', 1)::json;
  FOR rad IN SELECT x FROM regexp_split_to_table(t, E'\n') WITH ORDINALITY AS s(x, n) WHERE n > 1 AND x <> '' ORDER BY n LOOP
    SELECT jsonb_object_agg(k.v, v.v) INTO obj
      FROM json_array_elements_text(hdr) WITH ORDINALITY AS k(v, i)
      JOIN json_array_elements(rad::json) WITH ORDINALITY AS v(v, i) USING (i);
    r := jsonb_populate_record(NULL::weather_observations, obj - 'wind_speed_ms');
    r.geom := ST_SetSRID(ST_MakePoint((obj->>'lon')::float8, (obj->>'lat')::float8), 4326);
    RETURN NEXT r;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION arkiv_aterlas(t text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  INSERT INTO weather_observations SELECT * FROM arkiv_rader(t) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Raden som jämförs: alla kolumner som json, geom som lon/lat — samma form som filen bär.
CREATE OR REPLACE FUNCTION arkiv_jamfor(d date, t text) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  WITH fil AS (SELECT to_jsonb(r) - 'geom' || jsonb_build_object('lon', ST_X(r.geom), 'lat', ST_Y(r.geom)) AS j FROM arkiv_rader(t) r),
       db AS (SELECT to_jsonb(w) - 'geom' || jsonb_build_object('lon', ST_X(w.geom), 'lat', ST_Y(w.geom)) AS j FROM weather_observations w
              WHERE w.sample_time >= d::timestamp AT TIME ZONE 'UTC' AND w.sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC')
  SELECT jsonb_build_object(
    'fil', (SELECT count(*) FROM fil), 'databas', (SELECT count(*) FROM db),
    'bara_i_filen', (SELECT count(*) FROM (SELECT j FROM fil EXCEPT ALL SELECT j FROM db) x),
    'bara_i_databasen', (SELECT count(*) FROM (SELECT j FROM db EXCEPT ALL SELECT j FROM fil) x))
$$;

-- Rättigheterna: ingen av dem öppen för andra än postgres. Arkivexporten når arkiv_jamfor över sin direkta databasanslutning.
REVOKE ALL ON FUNCTION arkiv_rader(text), arkiv_aterlas(text), arkiv_jamfor(date, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION arkiv_rader(text), arkiv_aterlas(text), arkiv_jamfor(date, text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION arkiv_rader(text), arkiv_aterlas(text), arkiv_jamfor(date, text) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON FUNCTION arkiv_rader(text), arkiv_aterlas(text), arkiv_jamfor(date, text) FROM service_role;
  END IF;
END $$;
