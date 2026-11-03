-- 079: KANDIDATEN PÅ EN KVART — SCHEMAT (DECISIONS #782, kort #373). kandidat_snabb() (sql/078) var femte minut på :04, :09, :14 …
-- (`4-59/5`): minuter som pulsklockans jobb inte använder (scripts/pulsklocka.ts). Publiceringen går varannan minut och tar värdet
-- inom två minuter. Körs efter sql/078 och efter räkningen ur halkvakt-kuvos (fysik/live/kandidat_snabb.sql); utan räkningen loggar
-- anroparen bara 'räkningen saknas'. Talar inte: talande_timme() och talande_regel() läser inte ny_kandidat_snabb (påslaget kommer
-- efter skuggan, #782 punkt 5).
-- Varannan minut är en rad: cron.alter_job(..., schedule := '1-59/2 * * * *'). Av: cron.unschedule('halkvakt-kandidat-snabb').
-- Idempotent; pg_cron bara där tillägget finns, och i CI:s PostGIS gör filen ingenting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-kandidat-snabb') THEN
      PERFORM cron.schedule('halkvakt-kandidat-snabb', '4-59/5 * * * *', 'SELECT kandidat_snabb()');  -- KANDIDAT_SNABB_TAKT
    END IF;
  END IF;
END $$;
