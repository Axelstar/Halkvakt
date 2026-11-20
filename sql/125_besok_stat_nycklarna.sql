-- 125: besok_stat får tillbaka nycklarna 'apple_ads', 'appen' och 'annonstratten' (DECISIONS #905). Idempotent.
-- sql/118 (DECISIONS #900, körd 18/11) skrev om besok_stat utifrån 075 för att ta bort listan 'tyngsta', men 075 är äldre än
-- 076, 077 och 102, som lade in de tre nycklarna genom att läsa definitionen ur databasen. Omskrivningen tog dem med sig, och
-- statistik.html:s flikar Appen och Annonser blev tomma. Samma tre block som i 076, 077 och 102: varje nyckel läggs in efter
-- 'genererad' om definitionen inte redan bär den, så en andra körning gör ingenting.
DO $$
DECLARE d text;
BEGIN
  IF to_regprocedure('besok_stat(integer)') IS NULL THEN RETURN; END IF;
  d := pg_get_functiondef('besok_stat(integer)'::regprocedure);
  IF position('apple_ads_stat' in d) = 0 AND to_regprocedure('apple_ads_stat(integer)') IS NOT NULL THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''apple_ads'', apple_ads_stat(dagar),');
  END IF;
  IF position('app_raknare_stat' in d) = 0 AND to_regprocedure('app_raknare_stat(integer)') IS NOT NULL THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''appen'', app_raknare_stat(dagar),');
  END IF;
  IF position('annonstratten_stat' in d) = 0 AND to_regprocedure('annonstratten_stat(integer)') IS NOT NULL THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''annonstratten'', annonstratten_stat(dagar),');
  END IF;
  IF d <> pg_get_functiondef('besok_stat(integer)'::regprocedure) THEN EXECUTE d; END IF;
END $$;
