-- 113: SMÅVÄGSRÖSTENS BRYTARE PÅ (DECISIONS #828, #881; kort #647; påfilen som sql/107 hänvisar till).
-- Slår på båda brytarna i smavagsbrytare (sql/103), P1 och N. Från nästa publicering står nyckeln smavag i live.json (publish/
-- snapshot-core.ts) när regeln varnar, och apparna hämtar punktfilen och talar (#846).
-- KÖRS MED DB-KNAPPEN PÅ BENGTS OCH AXELS ORD, aldrig av ett flöde. Varje körning ger en rad i STATUS.
-- VAKTERNA. Filen vägrar och ändrar ingenting:
--   * om punktfilen inte ligger både i hinken och i kartrepot med tabellens sha. Beskedet i live.json pekar på filens sha, och en app
--     som inte kan hämta just den filen behåller ingen och tiger (#846);
--   * om punktfilen och tabellen smavagspunkt inte har lika många punkter. Bitarna i live.json står i filens ordning, och en fil ur fas
--     hade lagt varningarna på fel vägar (sql/106);
--   * om regeln inte räknar timmen som en underfråga. Utan den räknas timmen per rad, och publiceringen, som läser regeln varannan
--     minut, stannar (#813, sql/105);
--   * om olycksfacit saknar småvägsröstens lager (sql/110). Utan det bokförs en olycka under rösten utan vad rösten sa (#857, #867).
-- TILLBAKA: sql/107 slår av båda. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM smavag_punktfil WHERE i_hinken = sha256 AND i_github = sha256) THEN
    RAISE EXCEPTION 'brytarna slås inte på: punktfilen ligger inte i hinken och kartrepot med tabellens sha (sql/106, #846)';
  END IF;
  IF (SELECT punkter FROM smavag_punktfil) <> (SELECT count(*) FROM smavagspunkt) THEN
    RAISE EXCEPTION 'brytarna slås inte på: punktfilen och smavagspunkt har olika många punkter (sql/106)';
  END IF;
  IF position('(SELECT smavag_timme())' in pg_get_functiondef('smavag_regel()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'brytarna slås inte på: regeln räknar inte timmen som en underfråga (sql/105, #813)';
  END IF;
  IF to_regprocedure('olycksfacit_smavag()') IS NULL THEN
    RAISE EXCEPTION 'brytarna slås inte på: olycksfacit saknar småvägsröstens lager (sql/110)';
  END IF;
END $$;

UPDATE smavagsbrytare SET pa = true, andrad_at = now(), skal = 'på med sql/113 (DECISIONS #881)' WHERE NOT pa;
