-- 126: MET NORDIC'S MOISTURE AT THE CITY POINTS (DECISIONS #908, körlistan C7; the preregistration signed as halkvakt-kuvos F75, its §12
-- point 2). The moisture shadow's M-dagg (sql/127) compares the candidate's value with MET Nordic's dew point at the city point, in the
-- hour and the hour before, and reads MET's relative humidity in the hour. This table holds those two values per city point and hour.
--   ny_kandidat_met_stad   one row per city point (the drift id, B… and C…, sql/089) and hour
--
-- WHERE THE VALUES COME FROM. ny-kandidat-fysik.yml fetches MET Nordic's run for the city points and del A computes their PH from it.
-- Right after the PH is written, a step of its own (continue-on-error) lets the kuvös chain read the same run file for the same points
-- and hours as the PH, and ingest/ny-kandidat-db.ts skriv-met-stad writes the rows here. The dew point is computed in the kuvös chain
-- (#768, #810); this file and the writer only carry it.
--
-- THE SAME RUN AS THE PH. The table is keyed and written as ny_kandidat_ph (sql/068): one row per hour and point, and a later run for
-- the same hour replaces the row with its own korning. The rows are written in the same job and step chain, after the PH of the same run
-- and only when that PH was written, so the row for hour h comes from the run whose PH del B read for h. Unlike ny_kandidat_live, the
-- table may hold hours ahead of the candidate's hour: no rule reads it, and ny_kandidat_timme() never looks here.
--
-- KEPT 48 hours: the writer removes older rows. The shadow needs the candidate's hour and the hour before. Not exported: the shadow's
-- counts are (sql/127). scripts/vardevakten.ts knows the table and its fields.
-- No rule function is created or replaced here (halkvakt-kuvos F75 §3). ORDER: before sql/127. BACK: drop the table. Idempotent.

CREATE TABLE IF NOT EXISTS ny_kandidat_met_stad (
  tid         timestamptz NOT NULL,                     -- the hour (UTC), as ny_kandidat_ph
  punkt       text NOT NULL CHECK (punkt ~ '^[BC][0-9]{5}$'),   -- the city point's drift id (sql/089)
  korning     timestamptz NOT NULL,                     -- MET Nordic's run R that the hour was read from, the PH's run
  met_td_c    double precision,                         -- MET Nordic's dew point at the point (°C), from the kuvös chain; NULL when MET has none
  rh2m        double precision,                         -- MET Nordic's relative humidity at 2 m, as a fraction; NULL when MET has none
  raknad_at   timestamptz NOT NULL DEFAULT now(),       -- when the row was written
  PRIMARY KEY (tid, punkt)
);
COMMENT ON TABLE ny_kandidat_met_stad IS 'MET Nordic''s dew point and humidity per city point and hour, from the run whose PH del B used (sql/126, DECISIONS #908, halkvakt-kuvos F75). Read only by the moisture shadow (sql/127). Service role only.';

-- Locked twice (CLAUDE.md, DECISIONS #653): RLS without a policy; only the service role gets the table.
ALTER TABLE ny_kandidat_met_stad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ny_kandidat_met_stad FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE ny_kandidat_met_stad FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE ny_kandidat_met_stad FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE ny_kandidat_met_stad TO service_role; END IF;
END $$;
