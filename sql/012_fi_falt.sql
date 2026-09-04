-- 012: FI-breddningen (kort #48 bygge 2, GOLVET.md): Digitraffic bär 131 sensorer,
-- vi arkiverade 6. In: frostpunkt (KUURAPISTE — rimfrostens storhet färdigräknad),
-- saltjusterad fryspunkt (JÄÄTYMISPISTE_1), saltmängd (SUOLAN_MÄÄRÄ_1), vind
-- medel/max/riktning, sikt (NÄKYVYYS_M), nederbördens form (SATEEN_OLOMUOTO_PWDXX —
-- facit för #45-klassningen), ytstatus (TIENPINNAN_TILA_1). Triggar inte lagring.
-- Idempotent — auto-migreras av ingest/fi.ts vid varje körning (010-mönstret).
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS frost_point_c numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS freeze_point_c numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS salt_gm2 numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS wind_speed_ms numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS wind_gust_ms numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS wind_dir_deg numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS visibility_m numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS precip_form numeric;
ALTER TABLE fi.weather_observations ADD COLUMN IF NOT EXISTS surface_state numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS frost_point_c numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS freeze_point_c numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS salt_gm2 numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS wind_speed_ms numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS wind_gust_ms numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS wind_dir_deg numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS visibility_m numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS precip_form numeric;
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS surface_state numeric;
