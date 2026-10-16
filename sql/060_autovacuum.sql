-- 060: AUTOVACUUM PÅ TABELLERNA SOM BYTS UT HELA TIDEN (DECISIONS #580; Bengt 16/10: "ja till migrationen").
-- Vakthunden 16/10 05:08: databasen 482 MB av 500, och den växte cirka 0,4 MB/timme. Orsaken är inte mer data utan städningen:
-- `weather_observations` bar 154 000 döda rader (19 %) efter nattens raderingar, och autovacuum städar först vid 20 % + 50 rader.
-- Platsen blev aldrig ledig att återanvända, så nya rader lades i nytt utrymme och filen växte. Med 2 % + 1 000 rader städar
-- autovacuum efter varje radering, och den lediga platsen fylls av nästa dygns rader i stället för att filen växer.
-- Ändringen sätter bara tabellernas lagringsparametrar: den raderar inget, kostar inget utrymme och låser inte läsning eller skrivning
-- (SHARE UPDATE EXCLUSIVE). Ingen VACUUM FULL — den skriver om hela tabellen och dubblar den tillfälligt (skrivskydd över 500 MB).
-- Tabeller som saknas (grannländernas scheman i CI) hoppas över.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.weather_observations', 'fi.weather_observations', 'no.weather_observations', 'dk.weather_observations',
                           'public.trend_kandidater', 'public.trend_stigande', 'public.radar_precip',
                           'public.kandidat_live', 'public.kandidat_ph', 'public.kandidat_station'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000, '
                     'autovacuum_analyze_scale_factor = 0.02, autovacuum_analyze_threshold = 1000)', t);
    END IF;
  END LOOP;
END $$;
