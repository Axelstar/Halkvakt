-- Halkvakt schema v1. Run once against Supabase (PostGIS is preinstalled there).
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS cameras (
  camera_id text PRIMARY KEY,
  name text NOT NULL,
  road_number text,
  bearing int,
  geom geometry(Point, 4326) NOT NULL,
  modified_time timestamptz,
  deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS cameras_geom_idx ON cameras USING gist (geom);

CREATE TABLE IF NOT EXISTS road_conditions (
  segment_id text PRIMARY KEY,
  condition_code int NOT NULL,
  condition_text text NOT NULL,
  condition_info text[] NOT NULL DEFAULT '{}',
  county_nos int[] NOT NULL DEFAULT '{}',
  road_number text,
  geom geometry(LineString, 4326),
  start_time timestamptz,
  end_time timestamptz,
  modified_time timestamptz,
  deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS road_conditions_geom_idx ON road_conditions USING gist (geom);

-- Append-only: this is the winter archive (our moat).
CREATE TABLE IF NOT EXISTS road_condition_history (
  segment_id text NOT NULL,
  condition_code int NOT NULL,
  condition_text text NOT NULL,
  condition_info text[] NOT NULL DEFAULT '{}',
  modified_time timestamptz NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (segment_id, modified_time)
);

-- Append-only, archive-policy filtered (see ingest/sources/weather.ts).
CREATE TABLE IF NOT EXISTS weather_observations (
  station_id text NOT NULL,
  name text NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  sample_time timestamptz NOT NULL,
  surface_temp_c numeric,
  air_temp_c numeric,
  dewpoint_c numeric,
  humidity_pct numeric,
  precipitation text,
  rain boolean NOT NULL DEFAULT false,
  snow boolean NOT NULL DEFAULT false,
  PRIMARY KEY (station_id, sample_time)
);
CREATE INDEX IF NOT EXISTS weather_obs_time_idx ON weather_observations (sample_time);

CREATE TABLE IF NOT EXISTS deviations (
  deviation_id text PRIMARY KEY,
  situation_id text NOT NULL,
  message_type text NOT NULL,
  message_type_value text NOT NULL,
  message text NOT NULL,
  severity_code int,
  severity_text text,
  road_number text,
  county_nos int[] NOT NULL DEFAULT '{}',
  geom geometry(Point, 4326),
  line_geom geometry(LineString, 4326),
  start_time timestamptz,
  end_time timestamptz,
  icon_id text,
  modified_time timestamptz,
  deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS deviations_geom_idx ON deviations USING gist (geom);

CREATE TABLE IF NOT EXISTS sync_state (
  source text PRIMARY KEY,
  last_change_id text NOT NULL,
  synced_at timestamptz NOT NULL
);

-- Current state per station (always upserted) — the map reads this.
-- weather_observations remains the event-filtered archive.
CREATE TABLE IF NOT EXISTS weather_latest (
  station_id text PRIMARY KEY,
  name text NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  sample_time timestamptz NOT NULL,
  surface_temp_c numeric,
  air_temp_c numeric,
  precipitation text,
  rain boolean NOT NULL DEFAULT false,
  snow boolean NOT NULL DEFAULT false
);

-- App waitlist. Anon may INSERT via Supabase REST; never SELECT (RLS).
CREATE TABLE IF NOT EXISTS waitlist (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (lower(email));
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY waitlist_anon_insert ON waitlist FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
