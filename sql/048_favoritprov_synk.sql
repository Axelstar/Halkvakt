-- 048: synkprovet — rapporten tio minuter innan mot bilen (DECISIONS #533, kort #340; Bengt 11/10: "jag simulerar en pendlingsresa
-- och den info man får 10 minuter innan o sen kör en skuggflottebil 10 minuter efter").
--
-- Funktionen favoritprov med `?lage=synk` på :18/:48, tio minuter efter favoritprovet (:08/:38, sql/047). Ingen annan minut i
-- databasens klocka använder :18/:48 (cron.job läst 11/10 med DB-knappen 38158674309: publicera :x0, grannarna :05/:35, skuggmotorn :02/:32, :12/:42, :15/:45, :20/:50, :22/:52, :25/:55, vakthunden :07, favoritprovet :08/:38, :17, :23, :24, :40; ingesten varje minut). Bilen kör på publiceringen :10/:40, rapporten räknades på :00/:30. Skriver bara
-- till hinken `favoritprov` (synk.json, synk-historik.json); ingen app läser något av det.
-- Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil (husregeln, som
-- sql/034, 037, 046 och 047). Finns bara i Supabase; CI:s PostGIS saknar pg_cron, och då gör filen ingenting.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/048: skuggmotorns jobbkommando har inte väntad form — synkprovets jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-favoritprov-synk';
    PERFORM cron.schedule('halkvakt-favoritprov-synk', '18,48 * * * *',
      replace(k, '/functions/v1/skuggmotor''', '/functions/v1/favoritprov?lage=synk'''));
  END IF;
END $$;
