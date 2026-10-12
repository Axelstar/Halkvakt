-- 049: synkprovets Supabase-jobb av (DECISIONS #534). Första körningen 17:48 11/10 föll på resurstaket (546 WORKER_RESOURCE_LIMIT):
-- motorn längs de 30 vägrutterna tar 5–9 s, mer än en funktion får. Bilen flyttar till GitHub Actions (favoritprov-synk.yml, startad
-- av pulsklockan på :18/:48). Funktionens läge ?lage=synk står kvar men anropas inte. Idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-favoritprov-synk';
  END IF;
END $$;
