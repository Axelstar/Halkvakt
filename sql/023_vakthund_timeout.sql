-- 023: vakthundens cron-anrop får vänta på svaret (16/9 2026, Bengts ja, DECISIONS #204).
--
-- pg_net väntar som mest timeout_milliseconds på funktionens svar och lägger sedan "Timeout of 30000 ms
-- reached" i net._http_response — medan edge-funktionen kör klart ändå. Vakthundens varv tar längre än
-- 30 s (nio kontroller, GitHub-anrop, kassavaktens sidor), så dbknapp kunde aldrig läsa dess svar
-- (#197: skuggmotorns svar gick bra, vakthundens blev timeout) och varje prov fick bevisas via en issue.
-- Nu 120 s: kassavaktens tunga varv ryms, och proven blir läsbara på det sätt #197 byggde för.
--
-- Rör BARA timeouten i det befintliga jobbet — inget jobb öppnas eller stängs (kort #85). Kommandot
-- innehåller nyckeln och skrivs aldrig ut; bevisraden plockar bara ut talet.
-- Idempotent: körs den igen sätts samma 120000.
DO $$
DECLARE j record;
BEGIN
  -- pg_cron finns bara i Supabase; CI:s slit-och-slang-PostGIS saknar den (014-monstret).
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN RETURN; END IF;
  FOR j IN SELECT jobid, command FROM cron.job WHERE jobname = 'halkvakt-vakthund' LOOP
    IF j.command ~ 'timeout_milliseconds\s*:=\s*\d+' THEN
      PERFORM cron.alter_job(j.jobid,
        command := regexp_replace(j.command, 'timeout_milliseconds\s*:=\s*\d+', 'timeout_milliseconds := 120000'));
    ELSE
      -- ingen timeout satt i kommandot: läggs till som sista argument till net.http_post(...)
      PERFORM cron.alter_job(j.jobid,
        command := regexp_replace(j.command, '\)(\s*;?\s*)$', ', timeout_milliseconds := 120000)\1'));
    END IF;
  END LOOP;
END $$;
