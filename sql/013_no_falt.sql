-- 013: no.weather_latest föddes LIKE public.weather_latest (006), som saknar dewpoint_c och
-- humidity_pct — samma fälla som fi (010, körning #24 föll på 42703). DATEX levererar båda
-- (dewPointTemperature, relativeHumidity) och rimfrost-analysen (#46) vill ha dem.
-- Idempotent — körs av ingest/no.ts vid varje start, efter 006.
ALTER TABLE no.weather_latest       ADD COLUMN IF NOT EXISTS dewpoint_c   numeric;
ALTER TABLE no.weather_latest       ADD COLUMN IF NOT EXISTS humidity_pct numeric;
ALTER TABLE no.weather_observations ADD COLUMN IF NOT EXISTS dewpoint_c   numeric;
ALTER TABLE no.weather_observations ADD COLUMN IF NOT EXISTS humidity_pct numeric;
