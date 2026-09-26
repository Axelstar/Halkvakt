-- 039: kamerafacit V2 och V3 varje timme (Bengts ja 26/9, DECISIONS #380; docs/UTREDNING-FARTKAMEROR-2026-09-26.md §7).
-- Funktionen supabase/functions/kamerafacit tar bilden vid väglagskameran närmast varje aktuell frysrisk i hela landet (V2) och två
-- stickprov vid kalla stationer utan larm (V3). Minut 17, inte :00/:30 där kort #244:s resursgräns slår. Kommandot KOPIERAS ur
-- skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil (husregeln, som sql/034 och sql/037).
-- Idempotent: jobbet tas bort och skapas om. Körs med dbknapp EFTER att funktionen deployats.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/039: skuggmotorns jobbkommando har inte väntad form — kamerafacitets jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-kamerafacit';
    PERFORM cron.schedule('halkvakt-kamerafacit', '17 * * * *', replace(k, '/functions/v1/skuggmotor''', '/functions/v1/kamerafacit'''));
  END IF;
END $$;
