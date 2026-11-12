-- 109: FÖRSPRÅNGETS ELVA ANROP SPRIDS PÅ SEX JOBB (DECISIONS #845, kort #375; Bengt 12/11: "Ja").
-- sql/066 lät ett jobb på :12/:42 skicka alla elva försprångsanrop i samma sekund. Supabase lägger dem i samma isolat, och isolatets
-- CPU-tid räknas för alla tillsammans: 12/11 11.42 UTC stängdes isolatet efter tre sekunder ("CPU Time exceeded") och alla elva fick
-- 546. Från 02.42 UTC föll så många anrop att 271 av 600 rader saknades i forsprang_log till kl. 12. Arbetet per anrop var inte större
-- än nätterna innan; det är samtidigheten som fäller.
--
-- SEX JOBB, ETT ELLER TVÅ ANROP VAR, PÅ MINUTERNA 12–14 OCH 16–18 (42–44 OCH 46–48). Inom samma halvtimme, eftersom skuggmotorn väljer
-- rutter och svepvärde per halvtimme (forsprangUrval, FORSPRANG_SVEP_S). Inte på 15/45, där skuggmotorns finska varv går. Fler starter
-- för pg_cron än 066 ville undvika: morgonavbrotten (ärende #1100) kom av minnesbrist på Micro-instansen och upphörde med bytet till
-- Small 20/10 (projektkartans steg Drift utan morgonavbrott).
--
-- Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil (husregeln, som sql/066).
-- Vakten är `to_regclass('cron.job')` i stället för pg_extension, så att integrationsprovet kan spela pg_cron med egna tabeller. Efteråt
-- prövas att vart och ett av de elva anropen finns exakt en gång, annars rullas allt tillbaka. Inga tabeller, inga rättigheter. Idempotent.

DO $$
DECLARE
  k text; mal text := '/functions/v1/skuggmotor'''; cmd text; q text; i int; n int;
  schema text[] := ARRAY['12,42 * * * *', '13,43 * * * *', '14,44 * * * *', '16,46 * * * *', '17,47 * * * *', '18,48 * * * *'];
  anrop text[] := ARRAY['slot=0|slot=1', 'slot=2|slot=3', 'slot=4|slot=5', 'slot=6|grupp=c&slot=0', 'grupp=c&slot=1|grupp=c&slot=2',
                        'grupp=c&slot=3'];
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR (length(k) - length(replace(k, mal, ''))) / length(mal) <> 1 THEN
      RAISE EXCEPTION 'sql/109: skuggmotorns jobbkommando har inte väntad form (en adress till skuggmotorn) — försprångets jobb ändras inte';
    END IF;
    k := rtrim(k, E'; \n\t');
    PERFORM cron.unschedule(jobid) FROM cron.job
      WHERE jobname = 'halkvakt-skuggmotor-forsprang' OR jobname LIKE 'halkvakt-skuggmotor-forsprang-%';
    FOR i IN 1..array_length(schema, 1) LOOP
      cmd := '';
      FOREACH q IN ARRAY string_to_array(anrop[i], '|') LOOP
        cmd := cmd || replace(k, mal, format('/functions/v1/skuggmotor?lage=forsprang&%s''', q)) || E';\n';
      END LOOP;
      PERFORM cron.schedule('halkvakt-skuggmotor-forsprang-' || i, schema[i], cmd);
    END LOOP;
    -- Efterkontrollen: sex jobb, och varje anrop exakt en gång över dem.
    IF (SELECT count(*) FROM cron.job WHERE jobname LIKE 'halkvakt-skuggmotor-forsprang%') <> 6 THEN
      RAISE EXCEPTION 'sql/109: försprånget har inte sex jobb efter omläggningen';
    END IF;
    FOREACH q IN ARRAY string_to_array(array_to_string(anrop, '|'), '|') LOOP
      SELECT sum((length(command) - length(replace(command, format('?lage=forsprang&%s''', q), ''))) / length(format('?lage=forsprang&%s''', q)))
        INTO n FROM cron.job WHERE jobname LIKE 'halkvakt-skuggmotor-forsprang-%';
      IF n IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'sql/109: anropet % finns % gånger i försprångets jobb', q, coalesce(n, 0);
      END IF;
    END LOOP;
  END IF;
END $$;
