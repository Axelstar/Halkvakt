-- BEVISET FÖR GRANNLÄNDERNA I SUPABASE (kort #238, 22/9 2026). Läses EFTER första körningarna av de nya cron-jobben:
-- Sats 2: publicera?land=grannar-svaren (pg_net sparar dem) — sha, per land väder och olyckor. Sats 3: cron-jobbens egna
-- körloggar för de två nya jobben (46, 47). Sats 4: norska rader i skuggloggen — det som saknats i 25 dygn. Bara läsande.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '120s'

SELECT to_char(created AT TIME ZONE 'UTC', 'HH24:MI:SS') AS utc, status_code, substring(content FROM '"sha":"?([^",]*)"?') AS sha, substring(content FROM '"no":\{[^}]*\}') AS norge, substring(content FROM '"fi":\{[^}]*\}') AS finland, substring(content FROM '"dk":\{[^}]*\}') AS danmark, substring(content FROM '"ms":([0-9]+)') AS ms FROM net._http_response WHERE content LIKE '%"land":"grannar"%' ORDER BY created DESC LIMIT 3

SELECT jobid, status, return_message, to_char(start_time AT TIME ZONE 'UTC', 'HH24:MI:SS') AS start FROM cron.job_run_details WHERE jobid IN (46, 47) ORDER BY start_time DESC LIMIT 6

SELECT land, count(*) AS varv, count(DISTINCT route) AS rutter, sum(n_alerts) AS larm, to_char(min(snapshot_generated_at::timestamptz) AT TIME ZONE 'UTC', 'MM-DD HH24:MI') AS forsta, to_char(max(snapshot_generated_at::timestamptz) AT TIME ZONE 'UTC', 'MM-DD HH24:MI') AS senaste FROM shadow_log WHERE land = 'NO' GROUP BY 1
