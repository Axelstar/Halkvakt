-- 037: försprångets skugga (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4, DECISIONS #359, Bengts och Axels ja 25/9).
--
-- EGEN TABELL, EGET ANROP. Skuggmotorns huvudvarv slår redan i datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32), så
-- försprånget körs som `skuggmotor?lage=forsprang` på :12/:42 — samma halvtimmes rutter, bara de med en nivå 2-fara i rutan, motorn
-- två gånger per rutt (baskörningen och varianten). En rad per sådan rutt och varv. Aldrig hört, aldrig läst av apparna.
CREATE TABLE IF NOT EXISTS forsprang_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  route text NOT NULL,
  svep_s int NOT NULL CHECK (svep_s IN (45, 60, 90)),   -- TROSKLAR-FORSPRANG §3
  niva2 int NOT NULL,                                   -- nivå 2-faror i rutans ruta
  bas jsonb NOT NULL DEFAULT '[]',                      -- baskörningens varningar: t, id, kind, distanceM, niva
  variant jsonb NOT NULL DEFAULT '[]',                  -- variantens varningar, samma form
  bas_suppressed jsonb NOT NULL DEFAULT '[]',
  variant_suppressed jsonb NOT NULL DEFAULT '[]',
  nytt jsonb NOT NULL DEFAULT '[]'                      -- FS-B4: varianten talade, baskörningen aldrig — med km kvar till rutans slut
);
CREATE INDEX IF NOT EXISTS forsprang_log_run_idx ON forsprang_log (run_at);

-- Dubbellåst som varje logg (CLAUDE.md-läxan om RLS): RLS utan policy, och inga rättigheter för anon/authenticated.
ALTER TABLE forsprang_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON forsprang_log FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON forsprang_log FROM authenticated;
  END IF;
END $$;

-- Jobbet på :12/:42. Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil
-- (husregeln, som sql/034). Samma halvtimme som huvudvarvet på :02/:32, så rotationen väljer samma rutter.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/037: skuggmotorns jobbkommando har inte väntad form — försprångets jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-skuggmotor-forsprang';
    PERFORM cron.schedule('halkvakt-skuggmotor-forsprang', '12,42 * * * *',
      replace(k, '/functions/v1/skuggmotor''', '/functions/v1/skuggmotor?lage=forsprang'''));
  END IF;
END $$;
