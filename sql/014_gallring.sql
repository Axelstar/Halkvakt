-- 014: gallring av weather_observations (kort #83 steg 1, DECISIONS #87, 2026-09-09).
--
-- Vintern upphäver arkivdieten (#4): under 5 °C är alla 848 stationer "intressanta" var
-- 5–10:e minut dygnet runt. Axels mätning 9/9: 183 B/rad, mest aktiva station 233 rader/dygn
-- ⇒ upp till ~36 MB/dygn ⇒ gratisnivån (500 MB, 92 MB använda) full på ~11 dygn.
--
-- Ingen dom läser 10-minutersupplösningen: grind A och grind V-A hinkar på 30 min och tar
-- SENASTE mätningen per hink (BUCKET_S = 1800, ORDER BY sample_time DESC); missar.ts läser
-- 45-minutersfönster. Den här funktionen behåller exakt den raden per station och hink för
-- allt äldre än `dagar` dygn och raderar resten. Sista veckan behålls i full upplösning.
-- Effekt i vinter: 848 × 48 ≈ 41 000 rader/dygn ≈ 7,4 MB ⇒ ~55 dygn på återstående utrymme.
-- Steg 2 (export eller Pro, oktoberbeslut) är ett annat kort — vintern är längre än 55 dygn.
--
-- Hinken är ordagrant grind A:s: floor(epoch / 1800). Ändras den ena ska den andra följa med.
-- Idempotent: en andra körning hittar inget (varje hink har redan bara sin sista rad).
-- DELETE frigör inte disk förrän autovacuum återanvänt den: pg_total_relation_size planar
-- ut, sjunker inte. Det är rätt utfall.
--
-- Körs av Axel i SQL-editorn (deploy-tokenen får inte röra databasen, DECISIONS #86).
-- Bevis: rader per dygn äldre än 7 d ≤ 45 000, och grind-a:s n oförändrat veckan efter.
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
    RETURNING 1
  )
  SELECT count(*) FROM bort;
$$;

-- Nattjobb 03:15 UTC: lågtrafik, mitt emellan healthcheckens slots 02:23 och 04:23. pg_cron
-- finns bara i Supabase; CI:s slit-och-släng-PostGIS saknar den — vakta som rollerna i 003.
-- Jobbnamnet ersätts vid omkörning, dubbleras aldrig.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-gallring';
    PERFORM cron.schedule('halkvakt-gallring', '15 3 * * *', 'SELECT gallra_vader(7)');
  END IF;
END $$;
