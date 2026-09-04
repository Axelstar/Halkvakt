-- 010: daggpunkt i fi.weather_latest (kort #46 del 2.1, 4/9). fi-tabellerna skapades
-- LIKE public.weather_latest som saknar dewpoint_c — arkivtabellen har den, latest inte.
-- Upptäckt av rotationsläxan: ingest-fi #24 föll direkt på 42703 efter KASTEPISTE-bygget.
-- Idempotent — körs av ingest/fi.ts vid varje start (samma mönster som db.ts/008).
ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS dewpoint_c numeric;
