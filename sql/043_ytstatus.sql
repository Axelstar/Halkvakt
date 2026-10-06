-- 043: ytstatusfälten (kort #294; Bengts ja 6/10, DECISIONS #465). Cirka 50 av Trafikverkets stationer har beröringsfria
-- ytstatusgivare, och API:t bär dem som Observation.Surface.Water, Ice, Snow (förekomst) och Surface.Grip (friktion 0–1).
-- De är det enda i VViS som mäter att vägen BLEV HAL, inte bara kall, och de saknades i arkivet: vinterns facit (kamera, förare,
-- rapporterad halka, SMHI) hade ingen rad som sa is. Livemotorn (ingest-live/skriv.ts) skriver dem från och med deployen;
-- arkivpolicyn (DECISIONS #4, #353) är oförändrad, så fälten finns på de rader som ändå sparas. Kolumnerna är NULL där
-- stationen saknar givare — NULL betyder "mäts inte", aldrig "torrt". Storleken: fyra små kolumner på rader som redan finns.
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS surface_water boolean;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS surface_ice boolean;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS surface_snow boolean;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS surface_grip numeric;
COMMENT ON COLUMN weather_observations.surface_grip IS 'Trafikverkets Surface.Grip, friktion 0–1 från ytstatusgivaren (DECISIONS #465); NULL = ingen givare';
