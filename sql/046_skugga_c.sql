-- 046: väg C — skuggrutter där fallen ligger (DECISIONS #527, Bengts "gör denna" 11/10).
--
-- EGEN TABELL, EGET ANROP, som försprånget (sql/037). `skuggmotor?grupp=c` kör ROUTES_C (stationskedjor genom efterhalkans fall och
-- de frysnära stationerna) på :22/:52, mellan huvudvarvet (:02/:32) och försprånget (:12/:42), så varje anrop har sitt eget
-- datorkraftstak. Raderna skrivs till shadow_log_c, inte shadow_log: grindarna som läser shadow_log och ROUTES (tystnadsfelet, S-B,
-- V-B, upprepningen) får samma population som förut. Bara larmen loggas — ingen prognos, ingen efterhalka, inga facitbilder.
--
-- Samma kolumner som shadow_log (som skapades före sql/-katalogen, via Management API), därför LIKE. INCLUDING ALL tar med
-- standardvärden, villkor och index; id:ts standardvärde följer med som det står i shadow_log.
CREATE TABLE IF NOT EXISTS shadow_log_c (LIKE shadow_log INCLUDING ALL);

-- Dubbellåst som varje logg (CLAUDE.md-läxan om RLS): RLS utan policy, och inga rättigheter för anon/authenticated.
ALTER TABLE shadow_log_c ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON shadow_log_c FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON shadow_log_c FROM authenticated;
  END IF;
END $$;

-- Jobbet på :22/:52. Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil
-- (husregeln, som sql/034 och sql/037).
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/046: skuggmotorns jobbkommando har inte väntad form — väg C:s jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-skuggmotor-c';
    PERFORM cron.schedule('halkvakt-skuggmotor-c', '22,52 * * * *',
      replace(k, '/functions/v1/skuggmotor''', '/functions/v1/skuggmotor?grupp=c'''));
  END IF;
END $$;
