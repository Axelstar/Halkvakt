-- 128: SÄSONGSFACIT FOR THE CITIES, THE DAILY AGGREGATE (docs/TROSKLAR-SASONGSFACIT.md §11, signed 19/11 2026 by Bengt and Axel;
-- DECISIONS #904 answer 2 (a), #913; körlistan C3). A report, not a gate: nothing here changes what speaks, and no rule function is
-- created or replaced.
--
-- WHAT IS COUNTED. Every Swedish day, per cell (a switch's area and layer, the four in sql/089), part of the day (§5) and level (§11.2),
-- from the city log (ny_kandidat_skugga_stad) and its runs (ny_kandidat_skugga_stad_korning, sql/096):
--   * the hours per class (§11.3): räknad (a counted run bears the hour and the cell is in its switches), brytaren av (counted, the cell
--     is not), ingen timme (tyst), av, and ingen körning (no run for the hour), in that order. A counted run bears its candidate hour
--     (observed_at), the others the clock hour of the run (korning);
--   * the cold and the warning group hours, and the counted hours when at least one group in the cell warned (§11.3);
--   * why the rule was silent (§11.4): the points per reason in the cold group hours that did not warn, the March window's hours (rule
--     B, sql/091: March 10.00–15.59 Swedish time, silent where every point of the cell lies south of 62° N), and ytan över 0, the cell's
--     groups (stadspunkt when the day is counted) times the counted hours outside the March window, minus the cold group hours there.
-- It carries no group and no point (§11.8).
--
-- THE LEVEL (§11.2). Every hour is i drift, except two cases that are kept apart and never added to the rest:
--   inte ny    the decision in kandidat_talar, when the hour was logged, did not say ny (the city points are only in the new
--              candidate's rule). When the hour was logged = the run whose rows the hour carries, else the earliest run that bears the
--              hour, else the hour itself; the decision is read as sql/112 reads it (the latest row by id written by then, else fryst);
--   undantag   the hour [h, h + 1 h) overlaps an interval in sasongsfacit_stad_undantag: 19/11 07.42–08.14 UTC, when the fast candidate
--              spoke without the city points (DECISIONS #903), and each later alarm from the watchdog's check 3c, as a row of its own.
--              A day whose exception is added later is counted again with sasongsfacit_stad_rakna() while the log is in the database.
--
-- THE PERIOD starts with the first counted run (§11.2), read from the data: an earlier day in the aggregate, or the earliest counted run
-- among the rows the day is counted from. It ends 31/3 2027 (§2).
--
-- §11.4, THE CHECK IN THE BUILD: in every row of the city log punkter is the sum of varnar, veto, torr and spridning, since sql/096
-- counts every cold point once. A row where it is not stops the day with an error instead of a number.
--
-- WHEN AND FROM WHERE (§11.8). pg_cron counts yesterday every day 03.37 UTC, before sql/096 thins the log after 14 days. A day the run
-- log no longer reaches back to is counted once from the bucket's copy (sql/114) with sasongsfacit_stad_rakna_ur_hinken(), with the same
-- core and so the same definitions; test/integration.test.ts (#913) shows that a day in both places gives the same rows. The days since
-- the first counted run are counted when the file is migrated, where pg_cron exists (not in CI's PostGIS).
--
-- THE COST. One statement per day and no function per row (the lesson of 3/11, #783): the day's rows of the log are read once into an
-- array, and the core reads them with unnest(). Some twenty rows per day. The functions answer in words, never with a number (#768).
-- Fixed search path and UTC in the definitions (DECISIONS #784, #439). RLS without a policy, and only the service role (#653).
-- Idempotent: a day's rows are written again.

CREATE TABLE IF NOT EXISTS sasongsfacit_stad_dag (
  dag                  date NOT NULL,                       -- Swedish day
  omrade               text NOT NULL,                       -- the cell: a switch's area and layer (sql/089)
  lager                text NOT NULL CHECK (lager IN ('B', 'C')),
  dygnsdel             text NOT NULL CHECK (dygnsdel IN ('natt', 'morgonrusning', 'dag', 'kvällsrusning', 'kväll')),
  niva                 text NOT NULL CHECK (niva IN ('drift', 'inte ny', 'undantag')),
  timmar_raknad        int NOT NULL,                        -- §11.3 räknad, the March window included
  timmar_mars          int NOT NULL,                        -- of those, in the March window: no rows, never ytan över 0 (§11.4)
  timmar_brytaren_av   int NOT NULL,
  timmar_ingen_timme   int NOT NULL,
  timmar_av            int NOT NULL,
  timmar_ingen_korning int NOT NULL,
  kalla                int NOT NULL,                        -- cold group hours: counted group hours with a row in the city log
  varnande             int NOT NULL,                        -- cold group hours with at least one warning point
  timmar_varning       int NOT NULL,                        -- counted hours when at least one group in the cell warned
  tysta_punkter        int NOT NULL,                        -- the cold points of the cold group hours that did not warn
  veto                 int NOT NULL,                        -- of those, stopped by the veto
  torr                 int NOT NULL,                        -- of those, without moisture
  spridning            int NOT NULL,                        -- of those, blocked by F1
  ytan_over_0          int NOT NULL,                        -- group hours without a cold point, outside the March window
  grupper              int NOT NULL,                        -- the cell's groups in stadspunkt when the day was counted
  skriven_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, omrade, lager, dygnsdel, niva)
);
COMMENT ON TABLE sasongsfacit_stad_dag IS 'Säsongsfacit for the cities (sql/128, TROSKLAR-SASONGSFACIT §11, DECISIONS #913): the city log per day, cell, part of the day and level. No group and no point. Service role only.';

CREATE TABLE IF NOT EXISTS sasongsfacit_stad_undantag (
  fran  timestamptz PRIMARY KEY,
  till  timestamptz NOT NULL CHECK (till >= fran),
  skal  text NOT NULL
);
COMMENT ON TABLE sasongsfacit_stad_undantag IS 'The intervals when the city points were not in the published file although the log was written (TROSKLAR-SASONGSFACIT §11.2 point 2, sql/128). Service role only.';
INSERT INTO sasongsfacit_stad_undantag (fran, till, skal) VALUES
  ('2026-11-19 07:42:00+00', '2026-11-19 08:14:00+00', 'den snabba kandidaten talade utan stadspunkterna, och lägesfilen bar dem inte (DECISIONS #903)')
ON CONFLICT (fran) DO NOTHING;

-- The core: one Swedish day from the rows given, the database's own (sasongsfacit_stad_rakna) or the bucket's (…_ur_hinken). The arrays
-- may hold more than the day; the core takes the rows the day carries.
CREATE OR REPLACE FUNCTION sasongsfacit_stad_karna(p_dag date, p_logg ny_kandidat_skugga_stad[], p_korning ny_kandidat_skugga_stad_korning[])
RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  fran timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  till timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
  borjan timestamptz;
BEGIN
  IF p_dag > DATE '2027-03-31' THEN RETURN 'utanför perioden'; END IF;                                  -- SASONG_SLUT (§2, §11.2)
  -- §11.4: a row where punkter is not the sum of the four outcomes stops the day. The message names the day, never a count (#768).
  IF EXISTS (SELECT 1 FROM unnest(p_logg) l WHERE l.observed_at >= fran AND l.observed_at < till
               AND l.punkter IS DISTINCT FROM l.varnar + l.veto + l.torr + l.spridning) THEN
    RAISE EXCEPTION 'säsongsfacit för storstäderna %: en rad i stadsloggen där punkterna inte är summan av skälen (§11.4)', p_dag;
  END IF;
  -- The period starts with the first counted run (§11.2): an earlier day in the aggregate, or the earliest counted run given.
  borjan := CASE WHEN EXISTS (SELECT 1 FROM sasongsfacit_stad_dag d WHERE d.dag < p_dag) THEN '-infinity'::timestamptz
                 ELSE (SELECT min(k.observed_at) FROM unnest(p_korning) k WHERE k.status = 'räknad') END;
  DELETE FROM sasongsfacit_stad_dag WHERE dag = p_dag;
  IF borjan IS NULL OR borjan >= till THEN RETURN 'före perioden'; END IF;

  WITH timmar AS (
    SELECT h FROM generate_series(fran, till - interval '1 hour', interval '1 hour') h WHERE h >= borjan
  ),
  -- The runs that bear each hour (§11.3): a counted run its candidate hour, the others the clock hour of the run.
  korning AS (
    SELECT CASE WHEN k.status = 'räknad' THEN k.observed_at ELSE date_trunc('hour', k.korning) END AS h, k.korning, k.status, k.brytare
    FROM unnest(p_korning) k
  ),
  -- The cell's groups when the day is counted (§11.4), and whether rule B silences all its points in the March window.
  punkter AS (
    SELECT s.omrade, s.lager, count(DISTINCT s.grupp) AS grupper,
           bool_and(s.lat < 62)                                                                            -- STAD_MARS_LAT
             AS soder
    FROM stadspunkt s GROUP BY s.omrade, s.lager
  ),
  timklass AS (
    SELECT c.omrade, c.lager, t.h,
           CASE WHEN bool_or(k.status = 'räknad' AND k.brytare ? (c.omrade || '/' || c.lager)) THEN 'räknad'
                WHEN bool_or(k.status = 'räknad') THEN 'brytaren av'
                WHEN bool_or(k.status = 'tyst') THEN 'ingen timme'
                WHEN bool_or(k.status = 'av') THEN 'av'
                ELSE 'ingen körning' END AS klass,
           -- When the hour was logged: the run whose rows the hour carries, else the earliest run that bears it, else the hour.
           coalesce(min(k.korning) FILTER (WHERE k.status = 'räknad' AND k.brytare ? (c.omrade || '/' || c.lager)),
                    min(k.korning), t.h) AS loggad
    FROM stadsbrytare c CROSS JOIN timmar t LEFT JOIN korning k ON k.h = t.h
    GROUP BY c.omrade, c.lager, t.h
  ),
  timme AS (
    SELECT x.omrade, x.lager, x.h, x.klass, p.grupper,
           CASE WHEN extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 6 AND 9 THEN 'morgonrusning'
                WHEN extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 10 AND 15 THEN 'dag'
                WHEN extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 16 AND 18 THEN 'kvällsrusning'
                WHEN extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 19 AND 21 THEN 'kväll'
                ELSE 'natt' END AS dygnsdel,
           CASE WHEN coalesce((SELECT b.talar FROM kandidat_talar b WHERE b.tid <= x.loggad ORDER BY b.id DESC LIMIT 1), 'fryst') <> 'ny'
                  THEN 'inte ny'
                WHEN EXISTS (SELECT 1 FROM sasongsfacit_stad_undantag u WHERE u.fran < x.h + interval '1 hour' AND u.till >= x.h)
                  THEN 'undantag'
                ELSE 'drift' END AS niva,
           x.klass = 'räknad' AND coalesce(p.soder, true)
             AND extract(month FROM x.h AT TIME ZONE 'Europe/Stockholm') = 3                                  -- STAD_MARS_MANAD
             AND extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') >= 10                                 -- STAD_MARS_FRAN
             AND extract(hour FROM x.h AT TIME ZONE 'Europe/Stockholm') < 16                                  -- STAD_MARS_TILL
             AS mars
    FROM timklass x LEFT JOIN punkter p ON p.omrade = x.omrade AND p.lager = x.lager
  ),
  logg AS (
    SELECT l.omrade, l.lager, l.observed_at AS h, count(*) AS kalla, count(*) FILTER (WHERE l.varnar > 0) AS varnande,
           coalesce(sum(l.punkter) FILTER (WHERE l.varnar = 0), 0) AS tysta_punkter,
           coalesce(sum(l.veto) FILTER (WHERE l.varnar = 0), 0) AS veto,
           coalesce(sum(l.torr) FILTER (WHERE l.varnar = 0), 0) AS torr,
           coalesce(sum(l.spridning) FILTER (WHERE l.varnar = 0), 0) AS spridning
    FROM unnest(p_logg) l WHERE l.observed_at >= fran AND l.observed_at < till
    GROUP BY l.omrade, l.lager, l.observed_at
  )
  INSERT INTO sasongsfacit_stad_dag (dag, omrade, lager, dygnsdel, niva, timmar_raknad, timmar_mars, timmar_brytaren_av,
                                     timmar_ingen_timme, timmar_av, timmar_ingen_korning, kalla, varnande, timmar_varning,
                                     tysta_punkter, veto, torr, spridning, ytan_over_0, grupper)
  SELECT p_dag, t.omrade, t.lager, t.dygnsdel, t.niva,
         count(*) FILTER (WHERE t.klass = 'räknad'),
         count(*) FILTER (WHERE t.mars),
         count(*) FILTER (WHERE t.klass = 'brytaren av'),
         count(*) FILTER (WHERE t.klass = 'ingen timme'),
         count(*) FILTER (WHERE t.klass = 'av'),
         count(*) FILTER (WHERE t.klass = 'ingen körning'),
         coalesce(sum(g.kalla) FILTER (WHERE t.klass = 'räknad'), 0),
         coalesce(sum(g.varnande) FILTER (WHERE t.klass = 'räknad'), 0),
         count(*) FILTER (WHERE t.klass = 'räknad' AND g.varnande > 0),
         coalesce(sum(g.tysta_punkter) FILTER (WHERE t.klass = 'räknad'), 0),
         coalesce(sum(g.veto) FILTER (WHERE t.klass = 'räknad'), 0),
         coalesce(sum(g.torr) FILTER (WHERE t.klass = 'räknad'), 0),
         coalesce(sum(g.spridning) FILTER (WHERE t.klass = 'räknad'), 0),
         coalesce(max(t.grupper), 0) * count(*) FILTER (WHERE t.klass = 'räknad' AND NOT t.mars)
           - coalesce(sum(g.kalla) FILTER (WHERE t.klass = 'räknad' AND NOT t.mars), 0),
         coalesce(max(t.grupper), 0)
  FROM timme t LEFT JOIN logg g ON g.omrade = t.omrade AND g.lager = t.lager AND g.h = t.h
  GROUP BY t.omrade, t.lager, t.dygnsdel, t.niva;
  RETURN 'klart';
END $$;
COMMENT ON FUNCTION sasongsfacit_stad_karna(date, ny_kandidat_skugga_stad[], ny_kandidat_skugga_stad_korning[]) IS 'Säsongsfacit for the cities (sql/128): one Swedish day from the rows given. Answers klart, före perioden or utanför perioden. Service role only.';

-- The daily path: the database's own rows. sql/096 thins both tables after 14 days with the same cut, the oldest first, so the day is
-- whole while it is younger than 14 days or while the run log still reaches back to it; otherwise it is counted from the bucket
-- instead. A day that has not ended is not counted. The conditions read the data and the day, not a clock time in a night step.
CREATE OR REPLACE FUNCTION sasongsfacit_stad_rakna(p_dag date) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  fran timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  till timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
BEGIN
  IF till > now() THEN RETURN 'dygnet är inte slut'; END IF;
  IF fran < now() - interval '14 days'                                                                   -- the thinning in sql/096
     AND NOT EXISTS (SELECT 1 FROM ny_kandidat_skugga_stad_korning k WHERE k.korning <= fran) THEN
    RETURN 'gallrat: räknas ur hinken (sql/114)';
  END IF;
  RETURN sasongsfacit_stad_karna(p_dag,
    ARRAY(SELECT l FROM ny_kandidat_skugga_stad l WHERE l.observed_at >= fran AND l.observed_at < till),
    ARRAY(SELECT k FROM ny_kandidat_skugga_stad_korning k WHERE k.korning >= fran - interval '1 day' AND k.korning < till + interval '1 day'));
END $$;
COMMENT ON FUNCTION sasongsfacit_stad_rakna(date) IS 'Säsongsfacit for the cities (sql/128): one Swedish day from the city log in the database. pg_cron counts yesterday. Service role only.';

-- The bucket's day files (sql/114), as arkivexport wrote them: a header line with the column names, then one JSON array per row. Read
-- once per call, never per row of a statement.
CREATE OR REPLACE FUNCTION sasongsfacit_stad_filrader(p_filer text[]) RETURNS SETOF jsonb
LANGUAGE sql IMMUTABLE AS $$
  WITH rader AS (
    SELECT f.i, x.n, x.rad::jsonb AS rad
    FROM unnest(p_filer) WITH ORDINALITY f(t, i), regexp_split_to_table(f.t, E'\n') WITH ORDINALITY x(rad, n)
    WHERE x.rad <> ''
  )
  SELECT (SELECT jsonb_object_agg(h.rad ->> k.i, d.rad -> k.i) FROM generate_series(0, jsonb_array_length(h.rad) - 1) k(i))
  FROM rader d JOIN rader h ON h.i = d.i AND h.n = 1
  WHERE d.n > 1
$$;

-- The once-only path for a thinned day (§11.8): the bucket's files for the UTC days that touch the Swedish day, the day before and the
-- day after it (the city log's and the run log's). The same core as the daily path.
CREATE OR REPLACE FUNCTION sasongsfacit_stad_rakna_ur_hinken(p_dag date, p_logg text[], p_korning text[]) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
BEGIN
  RETURN sasongsfacit_stad_karna(p_dag,
    ARRAY(SELECT jsonb_populate_record(NULL::ny_kandidat_skugga_stad, r) FROM sasongsfacit_stad_filrader(p_logg) r),
    ARRAY(SELECT jsonb_populate_record(NULL::ny_kandidat_skugga_stad_korning, r) FROM sasongsfacit_stad_filrader(p_korning) r));
END $$;
COMMENT ON FUNCTION sasongsfacit_stad_rakna_ur_hinken(date, text[], text[]) IS 'Säsongsfacit for the cities (sql/128): a thinned day from the bucket''s copy (sql/114), with the same core. Service role only.';

-- Locked twice (CLAUDE.md, DECISIONS #653): RLS without a policy; only the service role gets the tables and the functions.
ALTER TABLE sasongsfacit_stad_dag ENABLE ROW LEVEL SECURITY;
ALTER TABLE sasongsfacit_stad_undantag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE sasongsfacit_stad_dag, sasongsfacit_stad_undantag FROM PUBLIC;
REVOKE ALL ON FUNCTION sasongsfacit_stad_karna(date, ny_kandidat_skugga_stad[], ny_kandidat_skugga_stad_korning[]),
  sasongsfacit_stad_rakna(date), sasongsfacit_stad_filrader(text[]), sasongsfacit_stad_rakna_ur_hinken(date, text[], text[]) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE sasongsfacit_stad_dag, sasongsfacit_stad_undantag FROM anon;
    REVOKE ALL ON FUNCTION sasongsfacit_stad_karna(date, ny_kandidat_skugga_stad[], ny_kandidat_skugga_stad_korning[]),
      sasongsfacit_stad_rakna(date), sasongsfacit_stad_filrader(text[]), sasongsfacit_stad_rakna_ur_hinken(date, text[], text[]) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE sasongsfacit_stad_dag, sasongsfacit_stad_undantag FROM authenticated;
    REVOKE ALL ON FUNCTION sasongsfacit_stad_karna(date, ny_kandidat_skugga_stad[], ny_kandidat_skugga_stad_korning[]),
      sasongsfacit_stad_rakna(date), sasongsfacit_stad_filrader(text[]), sasongsfacit_stad_rakna_ur_hinken(date, text[], text[]) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE sasongsfacit_stad_dag TO service_role;
    GRANT ALL ON TABLE sasongsfacit_stad_undantag TO service_role;
    GRANT EXECUTE ON FUNCTION sasongsfacit_stad_karna(date, ny_kandidat_skugga_stad[], ny_kandidat_skugga_stad_korning[]),
      sasongsfacit_stad_rakna(date), sasongsfacit_stad_filrader(text[]), sasongsfacit_stad_rakna_ur_hinken(date, text[], text[]) TO service_role;
  END IF;
END $$;

-- Every day 03.37 UTC: yesterday in Swedish time, well before the 14 days. Scheduled, and the days since the first counted run counted,
-- only where pg_cron exists (not in CI's PostGIS). A day the run log no longer reaches back to answers gallrat and is counted from the
-- bucket (§11.8): migrated before 22/11 00.00 Swedish time, the database still holds the first day of the period, 8/11.
DO $$
DECLARE d date; forsta date;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-sasongsfacit-stad') THEN
      PERFORM cron.schedule('halkvakt-sasongsfacit-stad', '37 3 * * *',
        $c$SELECT sasongsfacit_stad_rakna(((now() AT TIME ZONE 'Europe/Stockholm')::date - 1))$c$);
    END IF;
    SELECT (min(k.observed_at) AT TIME ZONE 'Europe/Stockholm')::date INTO forsta
    FROM ny_kandidat_skugga_stad_korning k WHERE k.status = 'räknad';
    IF forsta IS NOT NULL THEN
      FOR d IN SELECT generate_series(forsta, (now() AT TIME ZONE 'Europe/Stockholm')::date - 1, interval '1 day')::date LOOP
        PERFORM sasongsfacit_stad_rakna(d);
      END LOOP;
    END IF;
  END IF;
END $$;
