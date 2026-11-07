-- 097: STORSTÄDERNAS BRYTARE PÅ (DECISIONS #804, #816; kort #378; halkvakt-kuvos F33).
-- Slår på alla fyra brytarna i stadsbrytare (sql/089): B i Stor-Stockholm, Stor-Göteborg och Stor-Malmö, och C i Stor-Stockholm.
-- Därefter tas storstädernas punkter med i kandidatens regel (sql/091, sql/094), och deras varningar står i live.json när regeln varnar.
-- KÖRS MED DB-KNAPPEN PÅ BENGTS OCH AXELS ORD efter avstämningen (telefonturen och varje del provad, F33), aldrig av ett flöde.
-- VAKTERNA. Filen vägrar och ändrar ingenting:
--   * om regeln saknar sql/094 (stadsgrenens timme som underfråga). Utan den tar regeln mer än 80 s med brytarna på, och
--     publiceringen, som läser regeln varannan minut, stannar (DECISIONS #813);
--   * om olycksfacit saknar sql/096 (stadsloggen). Utan den bokförs en olycka vid en stadspunkt som att K teg (DECISIONS #815).
-- TILLBAKA: sql/098 slår av alla fyra. Idempotent.

DO $$
BEGIN
  IF position('(SELECT ny_kandidat_timme())' in pg_get_functiondef('ny_kandidat_regel()'::regprocedure)) = 0
     OR position('(SELECT kandidat_timme())' in pg_get_functiondef('kandidat_regel()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'brytarna slås inte på: regeln saknar sql/094, stadsgrenens timme (DECISIONS #813)';
  END IF;
  IF to_regclass('public.ny_kandidat_skugga_stad_korning') IS NULL THEN
    RAISE EXCEPTION 'brytarna slås inte på: olycksfacit saknar sql/096, stadsloggen (DECISIONS #815)';
  END IF;
END $$;

UPDATE stadsbrytare SET pa = true, andrad_at = now(), skal = 'på med sql/097 (DECISIONS #816)' WHERE NOT pa;
