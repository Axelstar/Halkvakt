-- 111: FAVORITPROVETS RUTT-STEG I TRE DELAR (DECISIONS #855, kort #650; Bengt 13/11: "gör favoritprovet").
-- Sedan 11/11 16.38 UTC föll varje körning av halkvakt-favoritprov (:08/:38) på Supabases CPU-gräns, 2 s per anrop (546, "CPU Time
-- exceeded"): slingan över de 30 provrutterna kostar omkring 3 s CPU, och hämtningen och rapporten gick igenom före den. Funktionen gör nu
-- hämtningen, rapporten och synken i anropet utan del (del 0, jobbet halkvakt-favoritprov, orört) och rutterna i tre anrop med var tredje
-- rutt (?del=1, ?del=2, ?del=3), som läser rapporten ur hinken. Mätt lokalt 13/11 med dagens filer: 0,94–1,25 s CPU per del.
--
-- TRE JOBB EFTER DEL 0, PÅ UDDA MINUTER: :09/:39, :11/:41 och :19/:49. Udda, så att de inte startar samtidigt med publicera (varannan
-- minut); inte på minuter där en annan funktion startar (skuggmotorn :02/:32, grannarna :05/:35, favoriter :x6, försprånget :12–:14 och
-- :16–:18, skuggmotorns fi :15/:45, kamerafacit :17, dk :20/:50, c :22/:52, no :25/:55, arkivexporten :40). Delarna går i tur och ordning,
-- och den sista skriver historiken.
--
-- Kommandot KOPIERAS ur favoritprovets eget jobb inne i databasen med replace(), så nyckeln aldrig står i en fil (husregeln, som sql/047
-- och sql/109). Vakten är `to_regclass('cron.job')`, så att integrationsprovet kan spela pg_cron med egna tabeller. Efteråt prövas att var
-- och en av de tre delarna finns exakt en gång, annars rullas allt tillbaka. Inga tabeller, inga rättigheter. Idempotent.
-- TILLBAKA: cron.unschedule på halkvakt-favoritprov-1, -2 och -3; del 0 gör då bara rapporten, och rutterna står still.

DO $$
DECLARE
  k text; mal text := '/functions/v1/favoritprov'''; i int; n int;
  schema text[] := ARRAY['9,39 * * * *', '11,41 * * * *', '19,49 * * * *'];
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-favoritprov';
    IF k IS NULL OR (length(k) - length(replace(k, mal, ''))) / length(mal) <> 1 THEN
      RAISE EXCEPTION 'sql/111: favoritprovets jobbkommando har inte väntad form (en adress till favoritprov) — delarnas jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'halkvakt-favoritprov-%';
    FOR i IN 1..array_length(schema, 1) LOOP
      PERFORM cron.schedule('halkvakt-favoritprov-' || i, schema[i], replace(k, mal, format('/functions/v1/favoritprov?del=%s''', i)));
    END LOOP;
    -- Efterkontrollen: tre jobb, och varje del exakt en gång över dem.
    IF (SELECT count(*) FROM cron.job WHERE jobname LIKE 'halkvakt-favoritprov-%') <> 3 THEN
      RAISE EXCEPTION 'sql/111: favoritprovet har inte tre deljobb';
    END IF;
    FOR i IN 1..3 LOOP
      SELECT sum((length(command) - length(replace(command, format('?del=%s''', i), ''))) / length(format('?del=%s''', i)))
        INTO n FROM cron.job WHERE jobname LIKE 'halkvakt-favoritprov-%';
      IF n IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'sql/111: del % finns % gånger i favoritprovets jobb', i, coalesce(n, 0);
      END IF;
    END LOOP;
  END IF;
END $$;
