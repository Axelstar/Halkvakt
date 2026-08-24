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
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;  -- exists on Supabase; created here for CI's vanilla PostGIS
  END IF;
END $$;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY waitlist_anon_insert ON waitlist FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Polisen viltolyckor. GPS = LÄNSCENTRUM (se DECISIONS #13) — aldrig punktvarningar.
-- Arkiveras för hotspot-utvinning ur fritext (road_number/species/place_hint).
CREATE TABLE IF NOT EXISTS polisen_events (
  event_id bigint PRIMARY KEY,
  datetime timestamptz NOT NULL,
  county_name text NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  summary text NOT NULL,
  url text NOT NULL,
  road_number text,
  species text,
  place_hint text,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS polisen_events_dt_idx ON polisen_events (datetime DESC);

-- SMHI-varningar: aktuell bild (byts helt varje synk) + append-only historik (arkiv).
CREATE TABLE IF NOT EXISTS smhi_warnings (
  area_id bigint PRIMARY KEY,
  warning_id bigint NOT NULL,
  event_code text NOT NULL,
  event_sv text NOT NULL,
  level_code text NOT NULL,
  level_sv text NOT NULL,
  description_sv text,
  area_name text,
  affected_areas jsonb NOT NULL DEFAULT '[]',
  geom geometry(Geometry, 4326),
  approx_start timestamptz,
  approx_end timestamptz,
  published timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS smhi_warnings_history (
  area_id bigint NOT NULL,
  published timestamptz NOT NULL,
  warning_id bigint NOT NULL,
  event_code text NOT NULL,
  level_code text NOT NULL,
  area_name text,
  geom geometry(Geometry, 4326),
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_id, published)
);
