-- Rutfiltrets bevis efter deployen (kort #244, DECISIONS #360): tiden per steg, raderna och 546 sedan deployen. Körs med dbknapp.
SELECT to_char(created, 'HH24:MI:SS') AS t, status_code, content::jsonb->'ms' AS ms, content::jsonb->>'ankare' AS ankare FROM net._http_response WHERE content::text LIKE '%"ms":{%' ORDER BY id DESC LIMIT 4
SELECT to_char(run_at, 'HH24:MI:SS') AS varv, route, n_hazards, n_alerts, (prognos ? 'p') AS prognos, jsonb_array_length(COALESCE(prognos->'h', '[]')) AS holdout FROM shadow_log WHERE land = 'SE' AND run_at > '2026-09-25 08:25:00+00' ORDER BY run_at
SELECT count(*) FILTER (WHERE status_code = 546) AS svar_546, count(*) AS svar FROM net._http_response WHERE created > '2026-09-25 08:32:00+00'
