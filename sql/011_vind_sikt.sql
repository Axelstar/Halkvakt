-- 011: vind + sikt i svenska väderarkivet och LocationText i väglaget (kort #48,
-- GOLVET.md byggen 1+4, Bengts order 4/9). Fältvägarna verifierade mot levande API
-- (fältrekognoseringen, körning 33840067087): Observation.Wind[].Speed/Direction,
-- Aggregated30minutes.Wind.SpeedMax (byvind), Observation.Air.VisibleDistance.
-- Fälten TRIGGAR inte lagring (arkivpolicyn DECISIONS #4 orörd) — de åker med när
-- raden ändå sparas. Idempotent — auto-migreras av ingest/db.ts vid varje körning.
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS wind_speed_ms numeric;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS wind_gust_ms numeric;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS wind_dir_deg numeric;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS visibility_m numeric;
ALTER TABLE weather_latest ADD COLUMN IF NOT EXISTS wind_speed_ms numeric;
ALTER TABLE weather_latest ADD COLUMN IF NOT EXISTS wind_gust_ms numeric;
ALTER TABLE weather_latest ADD COLUMN IF NOT EXISTS wind_dir_deg numeric;
ALTER TABLE weather_latest ADD COLUMN IF NOT EXISTS visibility_m numeric;
-- LocationText: "E 4 Sundsvall Trafikplats Skönsmon - Gnarp" — röstens VAR-kandidat.
-- Fylls i takt med att segment omklassas (delta-ingest) — full täckning först vintern.
ALTER TABLE road_conditions ADD COLUMN IF NOT EXISTS location_text text;
