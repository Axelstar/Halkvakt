-- 143: WHERE ON THE STRETCH (Bengt 24/11: "bygg en mätning på p 2"; DECISIONS #960, kort #677). A shadow, never a voice: nothing here
-- changes what speaks. No rule function, no engine, no live.json and no app reads these tables.
--
-- WHY. Trafikverket classes a whole road stretch at once. 24/11 the voice said "halka rapporterad" in Stockholm for road 222
-- Orminge–Stockholm, Besvärligt (risk för) with only the word Våt, from Slussen to Värmdö in one line. The question is whether the
-- stations along a stretch can tell WHERE on it the road is cold, so that a later rule could keep quiet on the warm parts, and whether
-- such a rule would have kept quiet before a slippery accident. Nothing is decided; the reading is pre-registered in DECISIONS #960.
--
-- WHAT IS COUNTED.
--   strackdel_timme   every clock hour, one row per stretch that is slippery by the engine's rule (code 2 or higher, or a winter word;
--                     the same selection as live.json, publish/snapshot-core.ts). The stretch is cut in pieces of about DEL_KM, and each
--                     piece's midpoint gets the segment forecast's estimate of the surface (engine/src/segment.ts skatta, the same in SQL):
--                     the K_NEIGHBOURS nearest anchors within MAX_KM, weighted 1/max(km, 1). The anchors are vagpunkt_ankare() (sql/032),
--                     the population the forecast and grind A were judged on. The row counts the pieces per band (<= +1, +1…+3, > +3,
--                     no anchor) and the pieces with an anchor within UPPMATT_KM (a measurement, not a model).
--   strackdel_olycka  per accident (no duplicates, no wildlife) where the A1 layer of olycksfacit says the stretch within 100 m was
--                     slippery at the start: the same estimate at the accident's point, from the anchors as they were then, and whether
--                     the text carries olycksfacit's halkord. The halkord is the only facit independent of both the stations and A1
--                     (TROSKLAR-OLYCKSFACIT §14.3).
-- Two differences from the live anchors, written down so the reading knows them: the accident's anchors are each station's latest row
-- within three hours before the start, with the same guards (#75, the row guard, quarantine and the slow guard), read at the start and
-- not at now(); and the nearest anchors are found with a planar index and sorted by true distance among the 20 nearest.
--
-- WHEN. pg_cron at minute 47 every hour: the hour's stretches, and the accidents of today and yesterday (olycksfacit adds the text
-- afterwards for six hours, so a day is counted again until it is complete). Idempotent: an hour's and a day's rows are written again.
-- THE COST. One statement per table, the anchors read once, and no function per row (the lesson of 3/11, DECISIONS #783). Fixed search
-- path and UTC (#784, #439). RLS without a policy, only the service role (#653). BACK: drop the job, the two functions and the two tables.

CREATE TABLE IF NOT EXISTS strackdel_timme (
  timme       timestamptz NOT NULL,                       -- the clock hour (UTC) of the count
  segment_id  text NOT NULL,                              -- road_conditions
  kod         int NOT NULL,                               -- Trafikverket's ConditionCode
  vinterord   boolean NOT NULL,                           -- a winter word in ConditionInfo (the engine's halkord)
  langd_km    real NOT NULL,
  delar       int NOT NULL,                               -- pieces of about DEL_KM
  kalla       int NOT NULL,                               -- pieces estimated at +1 °C or colder
  mellan      int NOT NULL,                               -- pieces estimated above +1 and at most +3 °C
  varma       int NOT NULL,                               -- pieces estimated above +3 °C
  okanda      int NOT NULL,                               -- pieces with no anchor within MAX_KM
  uppmatta    int NOT NULL,                               -- pieces with an anchor within UPPMATT_KM
  yta_min     real,
  yta_max     real,
  raknad_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (timme, segment_id)
);
CREATE TABLE IF NOT EXISTS strackdel_olycka (
  deviation_id  text PRIMARY KEY,                         -- olycksfacit
  dag           date NOT NULL,                            -- Swedish day of the start
  segment_id    text,                                     -- A1's stretch
  kod           int,                                      -- its code at the start (olycksfacit_lager)
  vinterord     boolean NOT NULL,
  yta           real,                                     -- the estimate at the accident; NULL without an anchor within MAX_KM
  narm_km       real,                                     -- the nearest anchor
  ankare        int NOT NULL,                             -- anchors in the estimate (0–5)
  halkord       boolean NOT NULL,                         -- olycksfacit's halkord in the text, at the capture or afterwards
  raknad_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strackdel_olycka_dag_idx ON strackdel_olycka (dag);

CREATE OR REPLACE FUNCTION strackdel_rakna() RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  h timestamptz := date_trunc('hour', now());
  n int;
BEGIN
  DROP TABLE IF EXISTS pg_temp.sd_ank, pg_temp.sd_str, pg_temp.sd_del, pg_temp.sd_skatt;   -- a second call in the same transaction
  CREATE TEMP TABLE sd_ank ON COMMIT DROP AS
    SELECT a.yta::real AS yta, ST_SetSRID(ST_MakePoint(a.lon, a.lat), 4326) AS geom FROM vagpunkt_ankare() a;
  IF NOT EXISTS (SELECT 1 FROM sd_ank) THEN
    RETURN 'inga ankare';   -- no fresh station: nothing is written, so the hour is missing rather than unknown everywhere
  END IF;
  CREATE INDEX ON sd_ank USING gist (geom);
  ANALYZE sd_ank;
  CREATE TEMP TABLE sd_str ON COMMIT DROP AS
    SELECT r.segment_id, r.condition_code AS kod, r.geom, ST_Length(r.geom::geography) / 1000 AS km,
           EXISTS (SELECT 1 FROM unnest(r.condition_info) i
                   WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt|modd)' OR i ~* '(snö|frost)') AS vinterord
    FROM road_conditions r
    WHERE NOT r.deleted AND r.geom IS NOT NULL AND (r.end_time IS NULL OR r.end_time > now());
  DELETE FROM sd_str WHERE kod < 2 AND NOT vinterord;
  CREATE TEMP TABLE sd_del ON COMMIT DROP AS
    SELECT s.segment_id, i AS del, ST_LineInterpolatePoint(s.geom, ((i - 0.5) / s.n)::float8) AS geom
    FROM (SELECT segment_id, geom, greatest(1, round(km / 1))::int AS n FROM sd_str) s   -- DEL_KM 1
    CROSS JOIN LATERAL generate_series(1, s.n) i;
  CREATE TEMP TABLE sd_skatt ON COMMIT DROP AS
    SELECT d.segment_id, k.ankare, k.narm, k.yta
    FROM sd_del d CROSS JOIN LATERAL (
      SELECT count(*)::int AS ankare, min(x.km) AS narm, sum(x.yta / greatest(x.km, 1)) / nullif(sum(1 / greatest(x.km, 1)), 0) AS yta
      FROM (SELECT y.yta, y.km FROM (
              SELECT a.yta, ST_Distance(a.geom::geography, d.geom::geography) / 1000 AS km FROM sd_ank a ORDER BY a.geom <-> d.geom LIMIT 20
            ) y WHERE y.km <= 50 ORDER BY y.km LIMIT 5) x   -- MAX_KM 50, K_NEIGHBOURS 5
    ) k;

  DELETE FROM strackdel_timme WHERE timme = h;
  INSERT INTO strackdel_timme (timme, segment_id, kod, vinterord, langd_km, delar, kalla, mellan, varma, okanda, uppmatta, yta_min, yta_max)
    SELECT h, s.segment_id, s.kod, s.vinterord, round(s.km::numeric, 1), count(*),
           count(*) FILTER (WHERE k.yta <= 1),                    -- FRYS_C 1
           count(*) FILTER (WHERE k.yta > 1 AND k.yta <= 3),
           count(*) FILTER (WHERE k.yta > 3),
           count(*) FILTER (WHERE k.yta IS NULL),
           count(*) FILTER (WHERE k.narm <= 2),                   -- UPPMATT_KM 2
           round(min(k.yta)::numeric, 1), round(max(k.yta)::numeric, 1)
    FROM sd_str s JOIN sd_skatt k USING (segment_id)
    GROUP BY s.segment_id, s.kod, s.vinterord, s.km;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n || ' sträckor';
END $$;
COMMENT ON FUNCTION strackdel_rakna() IS 'Where on the stretch (sql/143, DECISIONS #960): the slippery stretches this hour, cut in pieces with the segment forecast''s surface. A shadow, never a voice. Service role only.';

CREATE OR REPLACE FUNCTION strackdel_olyckor(p_dag date) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  t0 timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  t1 timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
  n int;
BEGIN
  DELETE FROM strackdel_olycka WHERE dag = p_dag;
  INSERT INTO strackdel_olycka (deviation_id, dag, segment_id, kod, vinterord, yta, narm_km, ankare, halkord)
    SELECT o.deviation_id, p_dag, l.detalj->>'segment', (l.detalj->>'kod')::int,
           EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(l.detalj->'info') = 'array' THEN l.detalj->'info' ELSE '[]'::jsonb END) i
                   WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt|modd)' OR i ~* '(snö|frost)'),
           k.yta, k.narm, k.ankare,
           (coalesce(o.message, '') || ' | ' || coalesce(o.text_efter, ''))
             ~* '(^|[^a-zåäö])(hal|halt|halk[a-zåäö]*|is|isen|isig[a-zåäö]*|ishalk[a-zåäö]*|sladd[a-zåäö]*|glashal[a-zåäö]*|blixthalk[a-zåäö]*)([^a-zåäö]|$)'
    FROM olycksfacit o
    JOIN olycksfacit_lager l ON l.deviation_id = o.deviation_id AND l.lager = 'A1' AND l.talar
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS ankare, min(x.km)::real AS narm,
             (sum(x.yta / greatest(x.km, 1)) / nullif(sum(1 / greatest(x.km, 1)), 0))::real AS yta
      FROM (
        SELECT s.yta, s.km FROM (
          SELECT DISTINCT ON (w.station_id) w.station_id, w.surface_temp_c AS yta, w.air_temp_c AS luft,
                 ST_Distance(w.geom::geography, o.geom::geography) / 1000 AS km
          FROM weather_observations w
          WHERE w.sample_time > o.start_time - interval '3 hours' AND w.sample_time <= o.start_time   -- fresh within 3 h, as vagpunkt_ankare
            AND w.surface_temp_c IS NOT NULL
            AND w.geom && ST_Expand(o.geom, 1.5) AND ST_DWithin(w.geom::geography, o.geom::geography, 50000)   -- MAX_KM 50
          ORDER BY w.station_id, w.sample_time DESC
        ) s
        WHERE (s.luft IS NULL OR s.yta >= s.luft - 12)
          AND (s.luft IS NULL OR s.luft < 10 OR s.luft - s.yta < 8)
          AND s.station_id NOT IN (
            SELECT k.station_id FROM weather_observations k
            WHERE k.sample_time <= o.start_time AND k.sample_time > o.start_time - interval '7 days'  -- KARANTAN_DYGN
              AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12
            GROUP BY k.station_id HAVING count(*) >= 3)  -- KARANTAN_BROTT
          AND s.station_id NOT IN (
            SELECT g.station_id FROM givarfel_dygn g WHERE g.forst <= o.start_time AND g.senast > o.start_time - interval '3 hours')  -- LANGSAM_FRIST_H
        ORDER BY s.km LIMIT 5   -- K_NEIGHBOURS 5
      ) x
    ) k
    WHERE o.start_time >= t0 AND o.start_time < t1 AND o.dubblett_av IS NULL AND coalesce(o.art, '') <> 'vilt';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n || ' olyckor';
END $$;
COMMENT ON FUNCTION strackdel_olyckor(date) IS 'Where on the stretch (sql/143, DECISIONS #960): the accidents on a slippery stretch on one Swedish day, with the estimated surface at the accident. A shadow, never a voice. Service role only.';

ALTER TABLE strackdel_timme ENABLE ROW LEVEL SECURITY;
ALTER TABLE strackdel_olycka ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE strackdel_timme, strackdel_olycka FROM PUBLIC;
REVOKE ALL ON FUNCTION strackdel_rakna() FROM PUBLIC;
REVOKE ALL ON FUNCTION strackdel_olyckor(date) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE strackdel_timme, strackdel_olycka FROM anon;
    REVOKE ALL ON FUNCTION strackdel_rakna() FROM anon;
    REVOKE ALL ON FUNCTION strackdel_olyckor(date) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE strackdel_timme, strackdel_olycka FROM authenticated;
    REVOKE ALL ON FUNCTION strackdel_rakna() FROM authenticated;
    REVOKE ALL ON FUNCTION strackdel_olyckor(date) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE strackdel_timme TO service_role;
    GRANT ALL ON TABLE strackdel_olycka TO service_role;
    GRANT EXECUTE ON FUNCTION strackdel_rakna() TO service_role;
    GRANT EXECUTE ON FUNCTION strackdel_olyckor(date) TO service_role;
  END IF;
END $$;

-- The job, only where pg_cron exists (not in CI's PostGIS). The migration itself counts nothing; the days before it can be counted with
-- strackdel_olyckor(day) as far back as the weather is kept (14 days, sql/072), and the stretches only from the first hour.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-strackdelen') THEN
      PERFORM cron.schedule('halkvakt-strackdelen', '47 * * * *',
        $j$SELECT strackdel_rakna(), strackdel_olyckor((now() AT TIME ZONE 'Europe/Stockholm')::date - 1), strackdel_olyckor((now() AT TIME ZONE 'Europe/Stockholm')::date)$j$);
    END IF;
  END IF;
END $$;
