-- NATTBEVISET FÖR GIVARVAKTEN (kort #234, DECISIONS #298, 22/9 2026). Vakterna gick i drift 21/9 18:19Z. Beviset som
-- saknades: att brolarmen på E4 Helsingborg→Jönköping faktiskt UTEBLIR en natt då Ö Ljungby 1106 fortfarande visar fel
-- (yta ≤ +3 °C vid luft ≥ +10 °C). Sats 2: stationen timme för timme. Sats 3: skuggloggens brolarm på E4 timme för
-- timme, dygnet FÖRE och EFTER deployen i samma tabell. Sats 4–5: funktionens egna karantännoter över natten.
-- Bara läsande. Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '120s'

SELECT to_char(date_trunc('hour', sample_time) AT TIME ZONE 'UTC', 'MM-DD HH24') AS utc, count(*) AS rader, min(surface_temp_c) AS yta_min, max(surface_temp_c) AS yta_max, min(air_temp_c) AS luft_min, max(air_temp_c) AS luft_max, count(*) FILTER (WHERE surface_temp_c <= 3 AND air_temp_c >= 10) AS felrader_kall_yta_varm_luft, bool_or(rain) AS regn FROM weather_observations WHERE station_id = '1106' AND sample_time > '2026-09-21T12:00Z' GROUP BY 1 ORDER BY 1

SELECT to_char(date_trunc('hour', snapshot_generated_at::timestamptz) AT TIME ZONE 'UTC', 'MM-DD HH24') AS utc, route, count(*) AS varv, sum(n_alerts) AS larm, sum((SELECT count(*) FROM jsonb_array_elements(alerts::jsonb) a WHERE a->>'text' ILIKE '%bro%')) AS brolarm FROM shadow_log WHERE snapshot_generated_at::timestamptz > '2026-09-20T18:00Z' AND (route ILIKE '%E4%' OR route ILIKE '%Helsingborg%') GROUP BY 1, 2 ORDER BY 1, 2

SELECT count(*) FILTER (WHERE content LIKE '%karantän:%') AS svar_med_karantan, count(*) FILTER (WHERE content NOT LIKE '%karantän:%') AS svar_utan, min(created) AS forsta, max(created) AS senaste FROM net._http_response WHERE content LIKE '%"generated_at"%' AND created > '2026-09-21T18:19Z'

SELECT to_char(created AT TIME ZONE 'UTC', 'MM-DD HH24:MI') AS utc, substring(content FROM '(karantän:[^"]*)') AS karantan FROM net._http_response WHERE content LIKE '%karantän:%' ORDER BY created DESC LIMIT 2
