-- 074: publiceringen varannan minut (DECISIONS #741 punkt 3, kort #365; Bengt 29/10: "Ja, bygg steg 3").
--
-- Villkoret i #741 före bytet var att en körning med bara hinken tar under 60 s i median och under 90 s som mest. Läst 29/10 (DB-knappen
-- 40832014499, 36 publiceringar 01:00–06:50 UTC, inga fel): utan kartan median 7,5 s och högst 8,3 s, varav bygget 3,6 s och hinken
-- 0,66 s (40830698966); med kartan median 16,2 s och högst 19,4 s.
--
-- publicera skriver hinken (sql/073) varje körning och väljer GitHub och kartan på minuten (PUBLICERA_TAKT_MIN i
-- supabase/functions/publicera/main.ts): GitHub var tionde minut och kartan var 30:e, som förut, så att Pages inte får fler byggen och
-- kartrepot inte växer fortare. Kontraktsgrinden vaktar att schemat här och fönstret i funktionen bär samma tal.
--
-- ORDNINGEN: den deployade publicera måste välja GitHub på minuten INNAN schemat byts — den gamla koden skriver GitHub i varje körning och
-- kartan fem gånger per halvtimme. Därför fäller filen om ingen publicering den senaste halvtimmen svarat med `"github":true`, som bara
-- den nya koden skriver. Efter filen deployas vakthunden, vars datavakter räknar publiceringar i rad (I_RAD 15 = en halvtimme).
-- Backas med samma rad och '*/10 * * * *'. Idempotent; pg_cron bara där tillägget finns, och i CI:s PostGIS gör filen ingenting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-publicera') THEN
      RAISE EXCEPTION 'sql/074: halkvakt-publicera saknas — inget ändrat';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM net._http_response WHERE created > now() - interval '30 minutes'
                     AND content LIKE '{"ok":true,"sha"%' AND content LIKE '%"github":true%') THEN
      RAISE EXCEPTION 'sql/074: ingen publicering med "github":true den senaste halvtimmen — deploya publicera först, inget ändrat';
    END IF;
    PERFORM cron.alter_job(jobid, schedule := '*/2 * * * *') FROM cron.job WHERE jobname = 'halkvakt-publicera';  -- PUBLICERA_TAKT_MIN
  END IF;
END $$;
