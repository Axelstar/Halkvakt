-- 035: arkivexportens funktioner låsta för anon och authenticated (rättelse till sql/034, 24/9, DECISIONS #334).
--
-- VAD SOM HÄNDE. sql/034 gjorde REVOKE ... FROM PUBLIC och GRANT till service_role — men Supabase ger varje ny funktion i
-- public-schemat EXECUTE till anon, authenticated och service_role genom standardrättigheter (ALTER DEFAULT PRIVILEGES), och
-- en REVOKE från PUBLIC tar inte bort uttryckliga rättigheter. Bevisraden efter migrationen visade anon: EXECUTE på
-- arkiv_radera_exporterat. RLS på weather_observations och arkiv_export gjorde att ett anrop som anon inte kunde radera
-- något (noll synliga rader, ingen tabellrätt) — men "RLS på bevisar ingenting" (CLAUDE.md), och huset låser dubbelt.
-- Samma sak gäller sql/032:s vagpunkt_ankare, som redan gjorde REVOKE från anon och authenticated uttryckligen.
--
-- NU: anon och authenticated får ingenting; service_role får läsa, lista och bokföra men aldrig radera. Raderingen körs
-- bara av pg_cron som postgres.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION arkiv_att_exportera(int), arkiv_dygn(date), arkiv_export_klar(date, int, int, text, text),
                      arkiv_radera_exporterat(int, int), arkiv_efterslap() FROM %I', r);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON FUNCTION arkiv_radera_exporterat(int, int) FROM service_role;
  END IF;
END $$;
