-- 127: THE MOISTURE SHADOW IN THE CITIES (DECISIONS #907, körlistan C4; the preregistration signed as halkvakt-kuvos F74, its §13).
--
-- A SHADOW, NEVER A VOICE. Every hour, after the city log (sql/096), it counts what more moisture sources would have given at the
-- city points, beside the radar that is their only moisture in the rule (sql/091, sql/094). It writes its two tables and nothing
-- else. No rule function, no voice, no live.json and no app reads them; only the archive export below and the kuvös reading do.
--   ny_kandidat_fuktskugga_stad          one row per group and candidate hour, only for groups with points in P0
--   ny_kandidat_fuktskugga_stad_korning  one row per run: räknad, tyst or av, and the switches that were on
--   ny_kandidat_logga_fuktskugga()       writes them; ny-kandidat-timme.yml calls it in a step of its own after the city log
--
-- THE POINTS (preregistration §2.1, §2.3 points 2 and 3). The city rows of ny_kandidat_regel() at the time of the call, so the
-- switches and the March window are the rule's own. P0 is the rows without veto and without the block F1. F1 is counted again for
-- every row, the dry ones included, from the rule's n_ank and ny_kandidat_live.frys_min for the same point and hour: the rule
-- writes 'torr' before it tries F1 (sql/091), so its outcome cannot tell whether a dry point was blocked.
--
-- THE VARIANTS (§2.2, §2.3 points 3–7). Each variant has moisture where R0 has it, or where its own source has it.
--   R0   the rule's radar for the group: radar_mmh in the rule's row, at least 0.1 mm/h.
--   K1   the nearest station within 15 km of the point with a valid row in (e - 30 min, e], never a remote surface (<nr>100). A
--        valid row is grind A's population: surface and air present, the surface inside the value guard's span, #75, the row
--        guard, and the quarantine and the slow guard per row (publish/snapshot-core.ts, karantanSql). Precipitation when any row of
--        that station in (e - 60 min, e] says rain, freezing_rain, snow or sleet (yes, no and Dry never do). Hoar frost from its
--        latest valid row: surface <= 0 and surface <= dew point, with the dew point inside -50…+30 °C and surface - dew point at
--        least -5 °C. A neighbour without moisture ends the search; a station without a valid row is passed over. No valid station
--        within 15 km: no value, and no moisture from K1.
--   K2a  Våt in condition_info on a road segment within 2 km, read as the rule reads the road state: road_conditions without the
--        deleted rows, and 'Våt' = ANY, so fläckvis Våt and the ice words never count. No segment within 2 km: no value.
--   Without a moisture condition: every point in P0 (p0_punkter).
-- r0_f1_punkter is the check in §8: the points with R0 that F1 blocks, which should be the city log's spridning. The points in P0
-- with R0 should be its varnar.
--
-- SVARTIS AND RIMFROST (DECISIONS #908, körlistan C7; the preregistration signed as halkvakt-kuvos F75, its §2.2, §2.4, §2.5 and §12
-- point 1). Their variants are columns of their own in the same rows, with the same P0, and each has moisture where R0 has it:
--   G-rim  the neighbour's hoar frost, exactly K1's hoar-frost part above (k1_rim_punkter, F75 question 2 (b)); g_rim_utan_varde
--          counts the points whose neighbour is valid but whose row has no dew point, or one outside the span (§2.5 point 3).
--   M-dagg the candidate's value at or below MET Nordic's dew point at the point in the candidate's hour and in the hour before,
--          and MET's relative humidity at least 0.9 in the candidate's hour (F15's daggfukt with AVGOR in the kuvös). The values of the
--          two hours come from ny_kandidat_live, MET's from ny_kandidat_met_stad (sql/126), each hour from its own run. A missing value
--          is no value, never moisture (m_dagg_utan_varde, §2.5 point 4).
--   S-Nh   the group's radar_stad at least 0.1 mm/h at some time in (e - N h, e], for N = 1, 2, 3 and 4 hours; S-3h decides and the
--          others stand beside (§2.5 point 5, question 3 (a)).
--   c7_alla_punkter: R0, G-rim, M-dagg or S-3h, a union the other counts cannot give.
--
-- THE TIME e (§2.3 point 1) is now() in the call. The shadow reads the rule itself, so the rule's radar and veto and the shadow's
-- sources are read at the same e. It runs in its own call after the city log, never in the same one, so that an error here cannot
-- undo the city log. Every row carries its e (raknad_at), and the city log's rows carry theirs (skriven_at), so the check can show
-- both times wherever the two differ.
--
-- KEPT 14 days, as the city log, and exported to the bucket before that, the same way as sql/114; TABELLER in
-- supabase/functions/arkivexport/index.ts changes in the same commit. scripts/vardevakten.ts knows both tables and their fields.
-- No rule function is created or replaced here (§3), so ny_kandidat_regel()'s md5 still matches kandidat_skugga_meta (sql/080,
-- sql/121). The function answers klart, tyst or brytarna av, never a number (#768, #810).
-- ORDER: after sql/096, sql/114 and sql/126; the migration first, then the deploy of arkivexport. BACK: drop the function and take the two
-- names out of the export again (sql/114); the tables can stay. Idempotent.

CREATE TABLE IF NOT EXISTS ny_kandidat_fuktskugga_stad (
  grupp           text NOT NULL,                        -- the city point's group, the rule's segment_id for the cities (sql/091)
  observed_at     timestamptz NOT NULL,                 -- the candidate's hour, the rule's tid
  raknad_at       timestamptz NOT NULL DEFAULT now(),   -- the time e: when the shadow read the rule and its sources
  omrade          text NOT NULL,
  lager           text NOT NULL,
  p0_punkter      int NOT NULL,                         -- points in P0, which is also the variant without a moisture condition
  r0_punkter      int NOT NULL,                         -- points in P0 with R0
  r0_f1_punkter   int NOT NULL,                         -- points with R0 that F1 blocks, outside P0: the check against spridning
  k1_punkter      int NOT NULL,                         -- points in P0 with R0 or K1
  k1_nb_punkter   int NOT NULL,                         -- points in P0 with R0 or K1's precipitation
  k1_rim_punkter  int NOT NULL,                         -- points in P0 with R0 or K1's hoar frost
  k1_utan_varde   int NOT NULL,                         -- points in P0 without a valid station within 15 km
  k2a_punkter     int NOT NULL,                         -- points in P0 with R0 or K2a
  k2a_utan_varde  int NOT NULL,                         -- points in P0 without a road segment within 2 km
  g_rim_utan_varde int NOT NULL,                        -- points in P0 whose valid neighbour gives no dew point inside the span (#908)
  m_dagg_punkter  int NOT NULL,                         -- points in P0 with R0 or M-dagg
  m_dagg_utan_varde int NOT NULL,                       -- points in P0 without the candidate's value or MET's row in one of the hours
  s1h_punkter     int NOT NULL,                         -- points in P0 with R0 or the group's radar within 1 hour
  s2h_punkter     int NOT NULL,                         -- … within 2 hours
  s3h_punkter     int NOT NULL,                         -- … within 3 hours: S-3h, the one that decides
  s4h_punkter     int NOT NULL,                         -- … within 4 hours
  c7_alla_punkter int NOT NULL,                         -- points in P0 with R0, G-rim, M-dagg or S-3h
  PRIMARY KEY (grupp, observed_at)
);
CREATE TABLE IF NOT EXISTS ny_kandidat_fuktskugga_stad_korning (
  korning      timestamptz PRIMARY KEY DEFAULT now(),   -- the time e
  observed_at  timestamptz,                             -- the candidate's hour (räknad), or the latest hour (tyst, av)
  status       text NOT NULL CHECK (status IN ('räknad', 'tyst', 'av')),
  brytare      text[] NOT NULL DEFAULT '{}',            -- area/layer switched on, e.g. Stor-Stockholm/B; a text list, so the value guard reads it
  p0_grupper   int NOT NULL DEFAULT 0                   -- groups written in the run
);
COMMENT ON TABLE ny_kandidat_fuktskugga_stad IS 'The moisture shadow in the cities (sql/127, DECISIONS #907 and #908, halkvakt-kuvos F74 and F75): per group and hour, the points in P0 with moisture per variant. A shadow: nothing that speaks reads it. Service role only.';

CREATE OR REPLACE FUNCTION ny_kandidat_logga_fuktskugga() RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE t timestamptz; b text[]; n int := 0;
BEGIN
  SELECT coalesce(array_agg(x.omrade || '/' || x.lager ORDER BY x.omrade, x.lager) FILTER (WHERE x.pa), '{}') INTO b FROM stadsbrytare x;
  t := ny_kandidat_timme();
  IF cardinality(b) = 0 THEN
    INSERT INTO ny_kandidat_fuktskugga_stad_korning (observed_at, status, brytare) VALUES (t, 'av', b);
    RETURN 'brytarna av';
  END IF;
  IF t IS NULL THEN
    INSERT INTO ny_kandidat_fuktskugga_stad_korning (observed_at, status, brytare)
      VALUES ((SELECT max(l.tid) FROM ny_kandidat_live l WHERE l.tid <= now()), 'tyst', b);
    RETURN 'tyst';
  END IF;
  WITH r AS (
    -- The rule's city rows at e, as the city log reads them (sql/096), without veto. F1 again for every row, the dry ones too.
    SELECT x.punkt, x.segment_id AS grupp, x.tid, s.omrade, s.lager, s.geom,
           coalesce(x.radar_mmh, 0) >= 0.1 AS r0,                                                       -- RADAR_MMH
           (coalesce(x.n_ank, 0) >= 2 AND l.frys_min >= 0.45) IS TRUE AS f1                             -- FRYS_MINORITET_Y (#800)
    FROM ny_kandidat_regel() x
    JOIN stadspunkt s ON s.punkt = x.punkt
    LEFT JOIN ny_kandidat_live l ON l.tid = x.tid AND l.punkt = x.punkt
    WHERE x.punkt ~ '^[BC][0-9]{5}$' AND x.utfall <> 'veto'                                             -- the city points (sql/089)
  ),
  -- Grind A's population at e: each station's latest valid row in (e - 30 min, e]. MATERIALIZED: read in the lateral below and
  -- counted once, not once per point (the lesson in #567).
  giltiga AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c AS yta, w.dewpoint_c AS dagg,
           w.dewpoint_c BETWEEN -50 AND 30                                                              -- DAGG_SPANN
             AS dagg_i_spann
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '30 minutes' AND w.sample_time <= now()
      AND w.station_id !~ '^\d{3,4}100$'                                                                -- FJARRYTA
      AND w.air_temp_c IS NOT NULL
      AND w.surface_temp_c BETWEEN -60 AND 60                                                           -- SPANN surface_temp_c
      AND w.surface_temp_c >= w.air_temp_c - 12
      AND (w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND (SELECT count(*) FROM weather_observations k WHERE k.station_id = w.station_id
             AND k.sample_time <= w.sample_time AND k.sample_time > w.sample_time - interval '7 days'
             AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) < 3
      AND NOT EXISTS (SELECT 1 FROM givarfel_dygn g WHERE g.station_id = w.station_id
                        AND g.dag = (w.sample_time AT TIME ZONE 'UTC')::date)
    ORDER BY w.station_id, w.sample_time DESC
  ),
  -- M-dagg (#908; F75 §2.5 point 4): MET's rows of the U hours up to the candidate's hour, each with the candidate's value of the same
  -- hour (ny_kandidat_live holds the rule's value of the hour, sql/094). A point has a value only when every one of the U hours has
  -- both, and MET's humidity of the candidate's hour decides with them. Read once for all points, by the tables' keys.
  dagg AS (
    SELECT m.punkt, h.tid, count(*) AS timmar,
           count(*) FILTER (WHERE l.pb <= m.met_td_c + 0) AS vid_dagg,                                    -- DAGG_M
           max(m.rh2m) FILTER (WHERE m.tid < h.tid) AS rh
    FROM (SELECT DISTINCT r.tid FROM r) h
    JOIN ny_kandidat_met_stad m ON m.tid > h.tid - interval '2 hours' AND m.tid <= h.tid                -- DAGG_U
    JOIN ny_kandidat_live l ON l.tid = m.tid AND l.punkt = m.punkt
    WHERE l.pb IS NOT NULL AND m.met_td_c IS NOT NULL AND m.rh2m IS NOT NULL
    GROUP BY m.punkt, h.tid
  ),
  -- S-1h … S-4h (#908; F75 §2.5 point 5): the group's radar at least 0.1 mm/h at some time in (e - N h, e]. radar_stad only has rows
  -- with rain (sql/090) and keeps two days, so a group without a row has had no rain in the windows.
  regn AS (
    SELECT rs.grupp,
           bool_or(rs.observed_at > now() - interval '1 hour') AS s1h,                                  -- S_TIMMAR
           bool_or(rs.observed_at > now() - interval '2 hours') AS s2h,                                 -- S_TIMMAR
           bool_or(rs.observed_at > now() - interval '3 hours') AS s3h,                                 -- S_TIMMAR
           bool_or(rs.observed_at > now() - interval '4 hours') AS s4h                                  -- S_TIMMAR
    FROM radar_stad rs
    WHERE rs.rate_mean_mmh >= 0.1 AND rs.observed_at <= now()                                           -- RADAR_MMH
    GROUP BY rs.grupp
  ),
  k AS (
    SELECT p.grupp, p.tid, p.omrade, p.lager, p.r0,
           g.station_id IS NULL AS k1_utan,
           coalesce(g.yta <= 0 AND g.yta <= g.dagg AND g.dagg_i_spann
                    AND g.yta - g.dagg >= -5, false) AS k1_rim,                                         -- DAGG_VAKT_C
           -- G-rim (#908) is k1_rim. A valid neighbour whose row has no dew point inside the span gives no value (F75 §2.5 point 3).
           g.station_id IS NOT NULL AND g.dagg_i_spann IS NOT TRUE AS g_rim_utan,
           EXISTS (SELECT 1 FROM weather_observations w WHERE w.station_id = g.station_id
                     AND w.sample_time > now() - interval '60 minutes' AND w.sample_time <= now()
                     AND w.precipitation IN ('rain', 'freezing_rain', 'snow', 'sleet')) AS k1_nb,         -- NEDERBORD
           -- The box only picks candidates through the index on road_conditions.geom: 0.1° is wider than 2 km in both directions
           -- everywhere in Sweden (a degree of longitude is more than 38 km south of 70° N).
           EXISTS (SELECT 1 FROM road_conditions rc WHERE NOT rc.deleted AND rc.geom && ST_Expand(p.geom, 0.1)
                     AND ST_DWithin(rc.geom::geography, p.geom::geography, 2000)) AS k2a_finns,           -- PAR_M
           EXISTS (SELECT 1 FROM road_conditions rc WHERE NOT rc.deleted AND 'Våt' = ANY (rc.condition_info)
                     AND rc.geom && ST_Expand(p.geom, 0.1)
                     AND ST_DWithin(rc.geom::geography, p.geom::geography, 2000)) AS k2a,                 -- PAR_M
           coalesce(d.timmar, 0) = 2 AS dagg_finns,                                                     -- DAGG_U
           coalesce(d.vid_dagg = d.timmar AND d.rh >= 0.9, false) AS dagg_under,                           -- DAGG_H
           coalesce(s.s1h, false) AS s1h, coalesce(s.s2h, false) AS s2h, coalesce(s.s3h, false) AS s3h, coalesce(s.s4h, false) AS s4h
    FROM r p
    LEFT JOIN dagg d ON d.punkt = p.punkt AND d.tid = p.tid
    LEFT JOIN regn s ON s.grupp = p.grupp
    LEFT JOIN LATERAL (
      SELECT x.station_id, x.yta, x.dagg, x.dagg_i_spann FROM giltiga x
      WHERE ST_DWithin(x.geom::geography, p.geom::geography, 15 * 1000)                                 -- K1_KM
      ORDER BY ST_Distance(x.geom::geography, p.geom::geography), x.station_id
      LIMIT 1
    ) g ON true
    WHERE NOT p.f1
  ),
  f1 AS (SELECT r.grupp, r.tid, count(*) FILTER (WHERE r.r0) AS n FROM r WHERE r.f1 GROUP BY r.grupp, r.tid),
  ins AS (
    INSERT INTO ny_kandidat_fuktskugga_stad (grupp, observed_at, omrade, lager, p0_punkter, r0_punkter, r0_f1_punkter,
                                             k1_punkter, k1_nb_punkter, k1_rim_punkter, k1_utan_varde, k2a_punkter, k2a_utan_varde,
                                             g_rim_utan_varde, m_dagg_punkter, m_dagg_utan_varde,
                                             s1h_punkter, s2h_punkter, s3h_punkter, s4h_punkter, c7_alla_punkter)
    SELECT k.grupp, k.tid, k.omrade, k.lager, count(*), count(*) FILTER (WHERE k.r0), coalesce(max(f.n), 0),
           count(*) FILTER (WHERE k.r0 OR k.k1_nb OR k.k1_rim),
           count(*) FILTER (WHERE k.r0 OR k.k1_nb),
           count(*) FILTER (WHERE k.r0 OR k.k1_rim),
           count(*) FILTER (WHERE k.k1_utan),
           count(*) FILTER (WHERE k.r0 OR k.k2a),
           count(*) FILTER (WHERE NOT k.k2a_finns),
           count(*) FILTER (WHERE k.g_rim_utan),
           count(*) FILTER (WHERE k.r0 OR (k.dagg_finns AND k.dagg_under)),
           count(*) FILTER (WHERE NOT k.dagg_finns),
           count(*) FILTER (WHERE k.r0 OR k.s1h),
           count(*) FILTER (WHERE k.r0 OR k.s2h),
           count(*) FILTER (WHERE k.r0 OR k.s3h),
           count(*) FILTER (WHERE k.r0 OR k.s4h),
           count(*) FILTER (WHERE k.r0 OR k.k1_rim OR (k.dagg_finns AND k.dagg_under) OR k.s3h)
    FROM k LEFT JOIN f1 f ON f.grupp = k.grupp AND f.tid = k.tid
    GROUP BY k.grupp, k.tid, k.omrade, k.lager
    ON CONFLICT (grupp, observed_at) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO n FROM ins;
  INSERT INTO ny_kandidat_fuktskugga_stad_korning (observed_at, status, brytare, p0_grupper) VALUES (t, 'räknad', b, n);
  DELETE FROM ny_kandidat_fuktskugga_stad WHERE observed_at < now() - interval '14 days';
  DELETE FROM ny_kandidat_fuktskugga_stad_korning WHERE korning < now() - interval '14 days';
  RETURN 'klart';
END $$;
COMMENT ON FUNCTION ny_kandidat_logga_fuktskugga() IS 'The moisture shadow in the cities (sql/127, DECISIONS #907 and #908): reads the rule at its own now() and writes its two tables. Answers klart, tyst or brytarna av. Service role only.';

-- Locked twice (CLAUDE.md, DECISIONS #653): RLS without a policy; only the service role gets the tables and the function.
ALTER TABLE ny_kandidat_fuktskugga_stad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_fuktskugga_stad_korning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ny_kandidat_fuktskugga_stad, ny_kandidat_fuktskugga_stad_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION ny_kandidat_logga_fuktskugga() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE ny_kandidat_fuktskugga_stad, ny_kandidat_fuktskugga_stad_korning FROM anon;
    REVOKE ALL ON FUNCTION ny_kandidat_logga_fuktskugga() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE ny_kandidat_fuktskugga_stad, ny_kandidat_fuktskugga_stad_korning FROM authenticated;
    REVOKE ALL ON FUNCTION ny_kandidat_logga_fuktskugga() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE ny_kandidat_fuktskugga_stad TO service_role;
    GRANT ALL ON TABLE ny_kandidat_fuktskugga_stad_korning TO service_role;
    GRANT EXECUTE ON FUNCTION ny_kandidat_logga_fuktskugga() TO service_role;
  END IF;
END $$;

-- THE EXPORT, as sql/114: the white list, the time column (the run log counts its day on korning, the shadow on observed_at), a
-- day exported when it is finished, the check on arkiv_export_tabell and the backlog. The archive's deletion keeps the night job's
-- floor, 14 days (arkiv2_golv gives the two min_dygn), the same as the thinning above.
CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public, extensions AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                                'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                                'ny_kandidat_skugga', 'ny_kandidat_station',
                                'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning',
                                'ny_kandidat_fuktskugga_stad', 'ny_kandidat_fuktskugga_stad_korning') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

CREATE OR REPLACE FUNCTION arkiv2_tidkolumn(tab text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE arkiv2_tabell(tab) WHEN 'shadow_log' THEN 'run_at' WHEN 'road_condition_history' THEN 'modified_time'
    WHEN 'situation_archive' THEN 'first_seen' WHEN 'smhi_warnings_history' THEN 'archived_at'
    WHEN 'ny_kandidat_skugga_stad_korning' THEN 'korning' WHEN 'ny_kandidat_fuktskugga_stad_korning' THEN 'korning'
    ELSE 'observed_at' END
$$;

CREATE OR REPLACE FUNCTION arkiv2_alder(tab text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station', 'ny_kandidat_skugga', 'ny_kandidat_station',
                           'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning',
                           'ny_kandidat_fuktskugga_stad', 'ny_kandidat_fuktskugga_stad_korning') THEN 1 ELSE 8 END
$$;

ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                    'ny_kandidat_skugga', 'ny_kandidat_station',
                    'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning',
                    'ny_kandidat_fuktskugga_stad', 'ny_kandidat_fuktskugga_stad_korning'));

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
        + (SELECT count(*) FROM arkiv2_att_exportera('smhi_warnings_history', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_station', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga_stad', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga_stad_korning', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_fuktskugga_stad', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_fuktskugga_stad_korning', 100000)))::int
$$;
