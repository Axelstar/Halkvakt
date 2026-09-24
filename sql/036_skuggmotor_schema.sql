-- 036: skuggmotorns svenska schema flyttas från :00/:30 till :02/:32 (kort #244, DECISIONS #344, Bengts ja 24/9).
--
-- VARFÖR. Sedan 24/9 00:30 svarar en funktion ibland 546 WORKER_RESOURCE_LIMIT ("för lite datorkraft"), alltid på hel- eller
-- halvtimmen (00:30, 01:00, 02:00, 04:00, 11:00, 14:30 den 24/9), och aldrig de tre dygnen före. På :00/:30 startar tre
-- funktioner samma sekund: publicera (*/10), livemotorn (varje minut) och skuggmotorn (*/30) — som sedan 23/9 kväll hämtar och
-- räknar 744 ankare per varv (segmentprognosen, DECISIONS #325). Att flytta skuggmotorn två minuter är både lagningen och
-- provet: försvinner 546 är orsaken bevisad utan funktionsloggen.
--
-- Rotationen påverkas inte: skuggmotorn väljer rutter efter halvtimmen (Date.now() / 1800 s), och :02 ligger i samma halvtimme
-- som :00. Finland (:15/:45), Danmark (:20/:50) och Norge (:25/:55) ligger redan utanför. Backas med samma rad och '*/30 * * * *'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-skuggmotor') THEN
      RAISE EXCEPTION 'sql/036: jobbet halkvakt-skuggmotor finns inte';
    END IF;
    PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'halkvakt-skuggmotor'), schedule := '2,32 * * * *');
  END IF;
END $$;
