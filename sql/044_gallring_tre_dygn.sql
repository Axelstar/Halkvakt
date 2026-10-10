-- 044: arkivet ryms i vinter — gallring efter tre dygn och raderingens golv 14 dygn (kort #322, DECISIONS #511, Bengts
-- beslut 10/10: "vi kör alternativ 1+2 redan idag"). Mätt 10/10: databasen 388 MB (dbknapp 38030231454), ~30 MB/dygn det
-- senaste dygnet; gratisnivån skrivskyddar vid 500 MB omkring 14–16/10. Raderingen ur exporten (034) tog dygn från augusti
-- med ~8 200 rader mot ~57 000 in per dygn och bet inte.
--
-- TRE ÄNDRINGAR, alla Bengts val 10/10:
-- * Nattjobbet gallrar efter TRE dygn i stället för sju: gallra_arkiv(3). Samma tal styr Norge, Danmark, Finlands varma rader
--   och pg_crons logg, och inget läser dem längre bakåt: rimfrosten läser Finlands KALLA rader, som sparas 60 dygn för sig
--   (031), och vakthunden läser bara livemotorns senaste cron-körning. Frostläsningarnas frist blir tre dygn; vakthundens
--   frosttryck följer med (supabase/functions/vakthund/frosttryck.ts, GALLRING_DYGN).
-- * gallra_vader SPARAR brotten mot #75 — rader där ytan ligger mer än 12 °C under luften. Karantänen i snapshoten räknar dem
--   över sju dygn (KARANTAN_DYGN, kort #234). Utan undantaget hade dygn 4–7 bara burit de brott som råkade vara sista raden
--   i sin halvtimme, och en trasig givare hade släppts tidigare. Brotten är få. coalesce: en rad utan yta är inget brott.
-- * Raderingen ur exporten tar allt exporterat äldre än 14 dygn i stället för 30, upp till 40 dygn per natt: första natten
--   tar den ikapp (~32 dygn, 25/8–26/9), sedan ett dygn per natt av sig själv. Varje dygn prövas som förut mot filens
--   radantal, och ett fel stoppar hela nattens körning högljutt. Databasen krymper inte — platsen återanvänds.
--
-- Grindarna som läser längre än 14 dygn (A, K-A, K-B, R-B, V-A, V-B, NT, R-A) skriver ut sina saknade dygn tills de läser
-- dem ur hinken (kort #323).
--
-- Funktionens standardvärde (7) står kvar: CREATE OR REPLACE får inte röra signaturen, och nattjobbet anger alltid talet.
-- Kontraktsgrinden vaktar talet i jobbet mot GALLRING_DYGN i koden. Idempotent; pg_cron bara där tillägget finns.

CREATE OR REPLACE FUNCTION gallra_vader(dagar int DEFAULT 7) RETURNS bigint
LANGUAGE sql AS $$
  WITH bort AS (
    DELETE FROM weather_observations w
    USING (
      SELECT station_id, sample_time,
             row_number() OVER (PARTITION BY station_id, floor(extract(epoch FROM sample_time) / 1800)
                                ORDER BY sample_time DESC) AS rn
      FROM weather_observations
      WHERE sample_time < now() - dagar * interval '1 day'
    ) k
    WHERE w.station_id = k.station_id AND w.sample_time = k.sample_time AND k.rn > 1
      AND NOT coalesce(w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12, false)
    RETURNING 1
  )
  SELECT count(*) FROM bort;
$$;

-- Jobben byts, schemat står kvar (03:15 och 03:45). Saknas ett jobb fäller migrationen: en tyst nolla vore ett tyst aldrig.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-gallring')
       OR NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-arkivradering') THEN
      RAISE EXCEPTION 'sql/044: halkvakt-gallring eller halkvakt-arkivradering saknas — inget ändrat';
    END IF;
    PERFORM cron.alter_job(jobid, command := 'SELECT gallra_arkiv(3)') FROM cron.job WHERE jobname = 'halkvakt-gallring';
    PERFORM cron.alter_job(jobid, command := 'SELECT arkiv_radera_exporterat(350, 14) FROM generate_series(1, 40)')
      FROM cron.job WHERE jobname = 'halkvakt-arkivradering';
  END IF;
END $$;
