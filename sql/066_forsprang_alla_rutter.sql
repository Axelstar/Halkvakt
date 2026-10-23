-- 066: FÖRSPRÅNGET PÅ ALLA 30 RUTTER VARJE HALVTIMME (DECISIONS #662, åtgärdslistan B4-94; Bengt 21/10: "Alla 30 rutter, med B4-90").
-- Försprånget prövades på halvtimmens 2–3 av de 20 rutterna (sql/037), och första veckan gav en nivå 2-varning per svepvärde mot FS-C1:s
-- krav på 60 (DB-knappen 39633634808, 39638598817). Nu prövas alla 20 rutterna (ROUTES, platserna 0–6) och de 10 C-rutterna (ROUTES_C,
-- platserna 0–3, DECISIONS #527) varje halvtimme, högst tre rutter per anrop som förut (skuggmotorns tak, kort #244).
--
-- ETT JOBB, ELVA ANROP. Jobbet `halkvakt-skuggmotor-forsprang` på :12/:42 står kvar, men dess kommando skickar nu elva anrop i stället för
-- ett: `?lage=forsprang&slot=k` för k = 0–6 och `?lage=forsprang&grupp=c&slot=k` för k = 0–3. Ett jobb i stället för elva håller pg_cron:s
-- starter som i dag — morgonavbrotten (fristen morgonavbrotten, ärende #1100) var *job startup timeout*, och orsaken är inte utredd.
-- Anropen går genom pg_net och körs parallellt som egna funktionsanrop. Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen
-- med replace(), så nyckeln aldrig står i en fil (husregeln, som sql/034 och sql/037).
--
-- Kräver att skuggmotorn med `slot` och `grupp=c` i försprångsanropet är driftsatt FÖRST (B4-94): en äldre skuggmotor ignorerar slot och
-- kör halvtimmens plats elva gånger. Inga nya tabeller, inga rättigheter (sql/064:s regel gäller nya tabeller). Idempotent.

DO $$
DECLARE k text; mal text := '/functions/v1/skuggmotor'''; cmd text := ''; s int;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR (length(k) - length(replace(k, mal, ''))) / length(mal) <> 1 THEN
      RAISE EXCEPTION 'sql/066: skuggmotorns jobbkommando har inte väntad form (en adress till skuggmotorn) — försprångets jobb ändras inte';
    END IF;
    k := rtrim(k, E'; \n\t');
    FOR s IN 0..6 LOOP
      cmd := cmd || replace(k, mal, format('/functions/v1/skuggmotor?lage=forsprang&slot=%s''', s)) || E';\n';
    END LOOP;
    FOR s IN 0..3 LOOP
      cmd := cmd || replace(k, mal, format('/functions/v1/skuggmotor?lage=forsprang&grupp=c&slot=%s''', s)) || E';\n';
    END LOOP;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-skuggmotor-forsprang';
    PERFORM cron.schedule('halkvakt-skuggmotor-forsprang', '12,42 * * * *', cmd);
  END IF;
END $$;
