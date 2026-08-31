-- 003: situation_archive (BACKLOG #33, 2026-08-31).
--
-- `deviations` is the LIVE table: what the app may warn about right now (accidents only,
-- see ingestAction in ingest/sources/situations.ts). It must stay small and honest.
--
-- The miss-measurement (#19, publish/missar.ts) needs the opposite: a durable record of
-- every winter-relevant thing Trafikverket reported, so that when the first real ice
-- comes we can ask "did the engine speak where Trafikverket said it was slippery?".
-- Before the tombstone fix that record was, by accident, the pile of deleted rows in
-- `deviations`. This table is the same idea done on purpose.
--
-- Discipline (free tier is a constraint, DECISIONS #4/#7):
--   * allow-listed types only — MaintenanceWorks and lane management are chronic noise
--     and 62 % of the feed; they never enter. Measured 2026-08-31: ~210 rows/day remain.
--   * insert-on-first-sight, update-on-resight (end_time/severity/message can change),
--     NEVER deleted by ingest. Trafikverket's delete is recorded as last_seen going stale.
--   * no line geometry (centroid is enough for a corridor test), no county arrays.
CREATE TABLE IF NOT EXISTS situation_archive (
  deviation_id       text PRIMARY KEY,
  message_type_value text NOT NULL,
  message_type       text,
  message            text,
  severity_code      int,
  road_number        text,
  icon_id            text,
  geom               geometry(Point, 4326),
  start_time         timestamptz,
  end_time           timestamptz,
  first_seen         timestamptz NOT NULL DEFAULT now(),
  last_seen          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS situation_archive_geom_idx  ON situation_archive USING gist (geom);
CREATE INDEX IF NOT EXISTS situation_archive_start_idx ON situation_archive (start_time);
CREATE INDEX IF NOT EXISTS situation_archive_type_idx  ON situation_archive (message_type_value);

-- Born locked (DECISIONS #32): the pipeline writes as postgres, nobody reads via anon.
-- The roles are Supabase-specific; CI's throwaway PostGIS has none, so guard the REVOKE.
ALTER TABLE situation_archive ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE situation_archive FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE situation_archive FROM authenticated;
  END IF;
END $$;
