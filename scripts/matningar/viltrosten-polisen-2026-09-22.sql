-- VILTRÖSTEN UR POLISENS DATA (22/9, Bengts fråga "vad har vi för mätning i appen, polisen eller trafikverket"). Bara läsande.
-- DECISIONS #13 (25/8): röstvarning A4 vilande, eftersom polisens koordinat är LÄNETS MITTPUNKT. Koden skickar ändå polisen_events
-- (48 h) som wildlife i live.json, båda apparna läser dem och motorn talar inom 400–3000 m. Sats 1: har skuggflottan någonsin fått
-- en viltvarning? Sats 2: samlas polisens punkter på en punkt per län? Bärare: sql/029_brott_index.sql (CREATE INDEX IF NOT EXISTS).

SELECT count(*) FILTER (WHERE a->>'kind' = 'wildlife') AS viltlarm_skuggflottan, count(DISTINCT s.snapshot_generated_at) FILTER (WHERE a->>'kind' = 'wildlife') AS varv_med_viltlarm, min(s.run_at) FILTER (WHERE a->>'kind' = 'wildlife') AS forsta, max(s.run_at) FILTER (WHERE a->>'kind' = 'wildlife') AS senaste, count(a) AS alla_larm FROM shadow_log s LEFT JOIN LATERAL jsonb_array_elements(s.alerts::jsonb) a ON true

SELECT county_name AS lan, count(*) AS handelser_60d, count(DISTINCT (round(ST_X(geom)::numeric, 4), round(ST_Y(geom)::numeric, 4))) AS olika_punkter FROM polisen_events WHERE datetime > now() - interval '60 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10
