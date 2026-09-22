-- SKUGGFLOTTAN HITTILLS (Bengts fråga 22/9 2026): vad har flottan åstadkommit sedan start? Läser bara produktionsmotorns
-- varningar och flottans eget arbete — sedan när, varv, rutter, länder, larm per fara, rutt och månad, faror som hörs
-- varv efter varv (kandidater till falsklarm eller långlivade händelser), spärrar, efterhalkans INDATA (aldrig dess
-- utfall — blindningen D1–D7), kamerafacit och förarfacit. Bara läsande.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT min(snapshot_generated_at::timestamptz)::date AS forsta, max(snapshot_generated_at::timestamptz)::date AS senaste, count(*) AS varv, count(DISTINCT route) AS rutter, count(DISTINCT land) AS lander, sum(n_alerts) AS larm, sum(n_hazards) AS faror_i_snapshoten, count(*) FILTER (WHERE n_alerts > 0) AS varv_med_larm, coalesce(sum(jsonb_array_length(vb::jsonb)), 0) AS vb_kandidater FROM shadow_log

SELECT land, count(*) AS varv, count(DISTINCT route) AS rutter, sum(n_alerts) AS larm, round(avg(n_alerts), 2) AS larm_per_varv FROM shadow_log GROUP BY 1 ORDER BY 2 DESC

SELECT a->>'kind' AS fara, count(*) AS larm, count(DISTINCT s.route) AS rutter, count(DISTINCT a->>'id') AS unika_faror FROM shadow_log s, jsonb_array_elements(s.alerts::jsonb) a GROUP BY 1 ORDER BY 2 DESC

SELECT to_char(s.snapshot_generated_at::timestamptz, 'YYYY-MM') AS manad, a->>'kind' AS fara, count(*) AS larm FROM shadow_log s, jsonb_array_elements(s.alerts::jsonb) a GROUP BY 1, 2 ORDER BY 1, 2

SELECT s.route, s.land, count(DISTINCT s.snapshot_generated_at) AS varv, count(a) AS larm, string_agg(DISTINCT a->>'kind', ',') AS faror FROM shadow_log s LEFT JOIN LATERAL jsonb_array_elements(s.alerts::jsonb) a ON true GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 12

SELECT a->>'kind' AS fara, a->>'id' AS id, left(a->>'text', 70) AS text, count(*) AS varv, min(s.snapshot_generated_at::timestamptz)::date AS forsta, max(s.snapshot_generated_at::timestamptz)::date AS senaste FROM shadow_log s, jsonb_array_elements(s.alerts::jsonb) a GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 14

SELECT count(*) FILTER (WHERE jsonb_array_length(suppressed::jsonb) > 0) AS varv_med_sparr, coalesce(sum(jsonb_array_length(suppressed::jsonb)), 0) AS sparrade_larm, min(snapshot_generated_at::timestamptz) FILTER (WHERE jsonb_array_length(suppressed::jsonb) > 0)::date AS forsta_sparr FROM shadow_log WHERE suppressed IS NOT NULL

SELECT count(*) FILTER (WHERE (efterhalka::jsonb->>'stationer')::int > 0) AS varv_med_efterhalka_indata, coalesce(sum((efterhalka::jsonb->>'stationer')::int), 0) AS stationsogonblick, coalesce(sum((efterhalka::jsonb->>'med_regn_h')::int), 0) AS med_regn_h, min(snapshot_generated_at::timestamptz) FILTER (WHERE (efterhalka::jsonb->>'stationer')::int > 0)::date AS forsta FROM shadow_log WHERE efterhalka IS NOT NULL

SELECT count(*) AS kamerabilder, min(created_at)::date AS forsta, max(created_at)::date AS senaste, count(DISTINCT split_part(name, '/', 1)) AS mappar FROM storage.objects WHERE bucket_id = 'facit'

SELECT count(*) AS forarfacit_rader FROM driver_facit

-- Kontrollsatser (körning 35709261552): efterhalkans fält är en lista per station, Danmarks larmtexter, bro- och vilttexterna, per land.

SELECT efterhalka::text AS efterhalka, snapshot_generated_at FROM shadow_log WHERE efterhalka IS NOT NULL AND efterhalka::text NOT IN ('{}', 'null', '[]') ORDER BY snapshot_generated_at DESC LIMIT 3

SELECT count(*) AS varv_med_efterhalka FROM shadow_log WHERE efterhalka IS NOT NULL AND efterhalka::text NOT IN ('{}', 'null', '[]')

SELECT s.land, left(a->>'text', 60) AS text, count(*) AS larm, count(DISTINCT a->>'id') AS unika FROM shadow_log s, jsonb_array_elements(s.alerts::jsonb) a WHERE s.land IN ('DK', 'FI') GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8

SELECT left(a->>'text', 70) AS text, count(*) AS larm FROM shadow_log s, jsonb_array_elements(s.alerts::jsonb) a WHERE a->>'kind' IN ('icing_point', 'wildlife') GROUP BY 1 ORDER BY 2 DESC LIMIT 6

SELECT land, min(snapshot_generated_at::timestamptz)::date AS forsta, max(snapshot_generated_at::timestamptz)::date AS senaste FROM shadow_log GROUP BY 1
