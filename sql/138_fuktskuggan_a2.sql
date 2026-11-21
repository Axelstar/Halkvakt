-- 138: THE MOISTURE SHADOW FOR A2, AND THE BASE RATE PER ACCIDENT (Bengt 21/11: "jag vill att du sätter upp skuggkörningen …
-- och fortsätter med prototypen"; DECISIONS #940). A shadow, never a voice: nothing here changes what speaks. No rule function, no
-- engine, no live.json and no app reads these tables; only the admin page (Olyckor) and the backtest flow (fuktskuggan.yml) do.
--
-- WHAT IS COUNTED, per Swedish day, from weather_observations and olycksfacit:
--   fuktskugga_timmar  per part of the day (dag 07–18 Swedish time, natt the rest) and weather bucket (hink below): the station hours,
--                      the hours today's A2 would have stood on (surface <= +1 °C and precipitation at the station), and the hours
--                      proposal 2 would have stood on (surface <= +1 °C and precipitation or surface below the dew point);
--   fuktskugga_olycka  per accident (no duplicates, no wildlife, classified): its bucket, and whether today's A2 (a station within
--                      5 km, the reach olycksfacit counts A2 with) and proposal 2 (a station within 15 km) had a station that met
--                      their condition in the two hours before the start.
--
-- A VALID ROW is the one the reading of 21/11 used: a surface temperature, -40…+60 °C, and not more than 12 °C below the air (#75).
-- Precipitation is rain, snow or a precipitation word other than no or Dry (the strings that mean dry). The dew point counts only
-- inside -50…+30 °C. A station hour is the clock hour (UTC) of its rows: the lowest surface, and moisture if any row has it.
--
-- THE BUCKET (the prototype of 21/11): the station hour's lowest surface in four bands (> +3, +1…+3, 0…+1, <= 0 °C), wet or dry. Wet
-- is precipitation or surface below the dew point at the station, or precipitation at another station within 15 km in the same hour
-- (the neighbours, Bengt 21/11). An accident takes the bucket of its nearest station with a valid row within 15 km in the clock hour
-- of its start; without one its bucket is NULL (ingen station). The share of accidents caused by the weather in a bucket is computed
-- by the page from these rows (olycksfacit/vyn.ts): the accidents per station hour against the same part of the day above +3 °C.
--
-- WHEN. pg_cron counts the Swedish day today and yesterday every hour at minute 52 (after the efterkontroll has classified). The
-- season before that, and every day again, is counted by fuktskuggan.yml (the backtest): it builds the temporary database from the
-- bucket and the database (kort #323), runs this file and the function there, prints the aggregates and, when asked, copies the days
-- here. A day whose weather is no longer in the database (the floor of 14 days, sql/072) answers 'saknas' here and keeps its rows.
-- THE COST. One statement per table and day, the neighbours read once per day from the day's stations, and no function per row
-- (the lesson of 3/11, DECISIONS #783). Fixed search path and UTC (#784, #439). RLS without a policy, only the service role (#653).
-- Idempotent: a day's rows are written again. BACK: drop the job, the function and the two tables.

CREATE TABLE IF NOT EXISTS fuktskugga_timmar (
  dag           date NOT NULL,                                      -- Swedish day
  dygn          text NOT NULL CHECK (dygn IN ('dag', 'natt')),      -- dag = 07–18 Swedish time
  hink          text NOT NULL,                                      -- the weather bucket, FUKTSKUGGA_HINKAR in olycksfacit/vyn.ts
  timmar        int NOT NULL,                                       -- station hours
  larm_a2       int NOT NULL,                                       -- station hours with surface <= +1 °C and precipitation
  larm_forslag  int NOT NULL,                                       -- station hours with surface <= +1 °C and precipitation or dew
  raknad_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, dygn, hink)
);
CREATE TABLE IF NOT EXISTS fuktskugga_olycka (
  deviation_id  text PRIMARY KEY,                                   -- olycksfacit
  dag           date NOT NULL,
  dygn          text NOT NULL CHECK (dygn IN ('dag', 'natt')),
  hink          text,                                               -- NULL: no valid station within 15 km in the hour
  a2_nu         boolean NOT NULL,                                   -- today's A2 had a station within 5 km
  forslag       boolean NOT NULL,                                   -- proposal 2 had a station within 15 km
  raknad_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fuktskugga_olycka_dag_idx ON fuktskugga_olycka (dag);

CREATE OR REPLACE FUNCTION fuktskugga_rakna(p_dag date) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  t0 timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  t1 timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
BEGIN
  -- The two hours before the day are read for the accidents just after midnight; without them the day is not counted here.
  IF NOT EXISTS (SELECT 1 FROM weather_observations WHERE sample_time >= t0 - interval '2 hours' AND sample_time < t0 - interval '1 hour') THEN
    RETURN 'saknas';
  END IF;
  DROP TABLE IF EXISTS pg_temp.fs_rad, pg_temp.fs_tim, pg_temp.fs_stn, pg_temp.fs_par, pg_temp.fs_granne, pg_temp.fs_hink;   -- a second day in the same transaction

  CREATE TEMP TABLE fs_rad ON COMMIT DROP AS
    SELECT station_id, geom, sample_time, surface_temp_c AS yta,
           (coalesce(rain, false) OR coalesce(snow, false) OR (precipitation IS NOT NULL AND lower(precipitation) NOT IN ('no', 'dry'))) AS ned,
           (dewpoint_c BETWEEN -50 AND 30 AND surface_temp_c < dewpoint_c) AS dagg
    FROM weather_observations
    WHERE sample_time >= t0 - interval '2 hours' AND sample_time < t1
      AND surface_temp_c BETWEEN -40 AND 60 AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12);
  CREATE INDEX ON fs_rad USING gist (geom);
  ANALYZE fs_rad;
  CREATE TEMP TABLE fs_tim ON COMMIT DROP AS
    SELECT station_id, date_trunc('hour', sample_time) AS h, min(yta) AS y, bool_or(ned) AS ned, bool_or(coalesce(dagg, false)) AS dagg
    FROM fs_rad WHERE sample_time >= t0 GROUP BY 1, 2;
  CREATE TEMP TABLE fs_stn ON COMMIT DROP AS SELECT DISTINCT ON (station_id) station_id, geom FROM fs_rad ORDER BY station_id, sample_time DESC;
  CREATE TEMP TABLE fs_par ON COMMIT DROP AS
    SELECT a.station_id AS a, b.station_id AS b FROM fs_stn a JOIN fs_stn b ON a.station_id <> b.station_id
      AND b.geom && ST_Expand(a.geom, 0.4) AND ST_DWithin(a.geom::geography, b.geom::geography, 15000);
  CREATE TEMP TABLE fs_granne ON COMMIT DROP AS
    SELECT DISTINCT p.a AS station_id, n.h FROM fs_par p JOIN fs_tim n ON n.station_id = p.b WHERE n.ned;
  CREATE TEMP TABLE fs_hink ON COMMIT DROP AS
    SELECT t.station_id, t.h, t.y, t.ned, t.dagg,
           CASE WHEN extract(hour FROM t.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 7 AND 18 THEN 'dag' ELSE 'natt' END AS dygn,
           CASE WHEN t.y > 3 THEN 'över +3' ELSE
             CASE WHEN t.y > 1 THEN '+1 till +3' WHEN t.y > 0 THEN '0 till +1' ELSE 'kall' END || ', ' ||
             CASE WHEN t.ned OR t.dagg OR g.h IS NOT NULL THEN 'fukt' ELSE 'torrt' END END AS hink
    FROM fs_tim t LEFT JOIN fs_granne g ON g.station_id = t.station_id AND g.h = t.h;

  DELETE FROM fuktskugga_timmar WHERE dag = p_dag;
  INSERT INTO fuktskugga_timmar (dag, dygn, hink, timmar, larm_a2, larm_forslag)
    SELECT p_dag, dygn, hink, count(*), count(*) FILTER (WHERE y <= 1 AND ned), count(*) FILTER (WHERE y <= 1 AND (ned OR dagg))
    FROM fs_hink GROUP BY 1, 2, 3;

  DELETE FROM fuktskugga_olycka WHERE dag = p_dag;
  INSERT INTO fuktskugga_olycka (deviation_id, dag, dygn, hink, a2_nu, forslag)
    SELECT o.deviation_id, p_dag,
           CASE WHEN extract(hour FROM o.start_time AT TIME ZONE 'Europe/Stockholm') BETWEEN 7 AND 18 THEN 'dag' ELSE 'natt' END,
           (SELECT k.hink FROM fs_hink k JOIN fs_stn s USING (station_id)
            WHERE k.h = date_trunc('hour', o.start_time) AND s.geom && ST_Expand(o.geom, 0.4)
              AND ST_DWithin(s.geom::geography, o.geom::geography, 15000)
            ORDER BY ST_Distance(s.geom::geography, o.geom::geography) LIMIT 1),
           EXISTS (SELECT 1 FROM fs_rad r WHERE r.sample_time BETWEEN o.start_time - interval '2 hours' AND o.start_time
                     AND r.yta <= 1 AND r.ned AND r.geom && ST_Expand(o.geom, 0.2) AND ST_DWithin(r.geom::geography, o.geom::geography, 5000)),
           EXISTS (SELECT 1 FROM fs_rad r WHERE r.sample_time BETWEEN o.start_time - interval '2 hours' AND o.start_time
                     AND r.yta <= 1 AND (r.ned OR coalesce(r.dagg, false)) AND r.geom && ST_Expand(o.geom, 0.4)
                     AND ST_DWithin(r.geom::geography, o.geom::geography, 15000))
    FROM olycksfacit o
    WHERE o.start_time >= t0 AND o.start_time < t1 AND o.dubblett_av IS NULL AND o.klass IS NOT NULL AND coalesce(o.art, '') <> 'vilt';
  RETURN 'klart';
END $$;
COMMENT ON FUNCTION fuktskugga_rakna(date) IS 'The moisture shadow for A2 and the base rate per accident (sql/138, DECISIONS #940): one Swedish day. A shadow, never a voice. Service role only.';

ALTER TABLE fuktskugga_timmar ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuktskugga_olycka ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fuktskugga_timmar, fuktskugga_olycka FROM PUBLIC;
REVOKE ALL ON FUNCTION fuktskugga_rakna(date) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE fuktskugga_timmar, fuktskugga_olycka FROM anon;
    REVOKE ALL ON FUNCTION fuktskugga_rakna(date) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE fuktskugga_timmar, fuktskugga_olycka FROM authenticated;
    REVOKE ALL ON FUNCTION fuktskugga_rakna(date) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE fuktskugga_timmar TO service_role;
    GRANT ALL ON TABLE fuktskugga_olycka TO service_role;
    GRANT EXECUTE ON FUNCTION fuktskugga_rakna(date) TO service_role;
  END IF;
END $$;

-- The job, only where pg_cron exists (not in CI's PostGIS). The days before it are counted by fuktskuggan.yml, in full scale outside
-- production first (the lesson of 3/11), and copied here; the migration itself counts nothing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-fuktskuggan') THEN
      PERFORM cron.schedule('halkvakt-fuktskuggan', '52 * * * *',
        $j$SELECT fuktskugga_rakna((now() AT TIME ZONE 'Europe/Stockholm')::date - 1), fuktskugga_rakna((now() AT TIME ZONE 'Europe/Stockholm')::date)$j$);
    END IF;
  END IF;
END $$;
