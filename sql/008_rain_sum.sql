-- 008: nederbördsmängder i väderarkivet (kort #42 steg 0a; Axels ja via Bengt 2/9).
-- Ur Aggregated30minutes — matchar ingestkadensen 30 min (10-min-fönstret hade missat
-- två tredjedelar av regnet mellan hämtningarna). Täckning bevisad 89 % av stationerna
-- (regn-bevis #1, körning 33593431669). Snömängden tas i samma svep: samma givare,
-- samma bevisade täckning, vinterfacit för blixthalkan (#16).
-- Idempotent — auto-migreras av ingest/db.ts vid varje körning.
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS rain_sum_mm numeric;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS snow_wateq_mm numeric;
