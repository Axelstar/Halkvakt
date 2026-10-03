-- 041: byggsignalerna — kartsynkens indata (kort #288; Bengts ja 3/10, DECISIONS #447).
-- Det Bengt och Axel gör utanför repot, så som maskinerna ser det: App Store Connect (byggen, granskning, installationer per
-- bygge, testarna i grupperna) och förarsvaren per appversion. Skrivs bara av edge function byggsignaler (service role), varje
-- timme. forst_sedd är beviset: första gången en signal syntes. senast_sedd säger att den fortfarande syns.
-- github/issue bär numret på ärendet som funktionen speglar signalerna i, så att kartsynken kan läsa dem utan databasnyckel.
-- Dubbellåst som driver_facit (002-läxan): RLS utan policy + REVOKE.
CREATE TABLE IF NOT EXISTS byggsignaler (
  kalla text NOT NULL,                                -- 'asc', 'facit', 'github'
  nyckel text NOT NULL,                               -- 'bygge:22', 'bygge:22:installerad', 'appstore:0.3.9:READY_FOR_DISTRIBUTION', 'ios:0.3.10'
  varde jsonb NOT NULL,
  forst_sedd timestamptz NOT NULL DEFAULT now(),
  senast_sedd timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kalla, nyckel)
);

ALTER TABLE byggsignaler ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE byggsignaler FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE byggsignaler FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE byggsignaler IS 'Kort #288 (DECISIONS #447): kartsynkens indata. Skrivs bara av byggsignaler; läses aldrig via REST.';

-- Jobbet: minut 23 varje timme (inte :00/:30, kort #244). Kommandot kopieras ur skuggmotorns jobb med replace(), så att
-- nyckeln aldrig står i en fil (samma mönster som 039). Körs med dbknapp EFTER att funktionen deployats.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/041: skuggmotorns jobbkommando har inte väntad form — byggsignalernas jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-byggsignaler';
    PERFORM cron.schedule('halkvakt-byggsignaler', '23 * * * *', replace(k, '/functions/v1/skuggmotor''', '/functions/v1/byggsignaler'''));
  END IF;
END $$;
