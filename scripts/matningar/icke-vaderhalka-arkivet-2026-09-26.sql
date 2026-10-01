-- Vägarbeten i appen? (Bengts ja 26/9 till läsmätningen, bedömningen §4.2): friktionsdelen ur VÅRT arkiv. situation_archive sparar
-- Trafikverkets NonWeatherRelatedRoadConditions (väglag som inte beror på väder — grus, olja, ny beläggning?) sedan 31/8. Vad står i
-- klassen, hur ofta, hur länge? Bara antal och exempeltext, ingen tröskel. Körs med dbknapp: en sats per rad.
SELECT message_type_value, count(*) AS rader, min(first_seen)::date AS forst, max(last_seen)::date AS sist FROM situation_archive GROUP BY 1 ORDER BY 2 DESC
SELECT coalesce(message_type, '(tom)') AS typ, coalesce(icon_id, '(tom)') AS ikon, count(*) AS rader, round(avg(extract(epoch FROM (coalesce(end_time, last_seen) - start_time)) / 3600)::numeric, 1) AS timmar_snitt, sum((severity_code IN (4, 5))::int) AS stor_paverkan FROM situation_archive WHERE message_type_value = 'NonWeatherRelatedRoadConditions' GROUP BY 1, 2 ORDER BY 3 DESC
SELECT left(regexp_replace(coalesce(message, ''), '\s+', ' ', 'g'), 110) AS text, count(*) AS rader FROM situation_archive WHERE message_type_value = 'NonWeatherRelatedRoadConditions' GROUP BY 1 ORDER BY 2 DESC LIMIT 25
