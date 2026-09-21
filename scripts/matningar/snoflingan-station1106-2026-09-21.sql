-- STATIONEN BAKOM BROLARMEN PÅ E4 (kort #233/#234, DECISIONS #297, 21/9 2026). Skuggmotorn sa "Frysrisk framöver — bro"
-- sju gånger per varv på E4 Helsingborg→Jönköping 16–21/9. Alla 24 broarna matas av station 1106. Mäter den rätt?
-- Bara läsande. Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT station_id, name, round(ST_X(geom)::numeric, 3) AS lon, round(ST_Y(geom)::numeric, 3) AS lat FROM weather_latest WHERE station_id IN ('1106', '2346', '2132', '2135', '1302', '1713')

SELECT to_char(date_trunc('hour', sample_time) AT TIME ZONE 'UTC', 'MM-DD HH24') AS utc_timme, count(*) AS rader, min(surface_temp_c) AS yta_min, max(surface_temp_c) AS yta_max, min(air_temp_c) AS luft_min, max(air_temp_c) AS luft_max, min(dewpoint_c) AS dagg_min, max(humidity_pct) AS rh_max, bool_or(rain) AS regn, bool_or(snow) AS sno, string_agg(DISTINCT coalesce(precipitation, '-'), ',') AS nederbord FROM weather_observations WHERE station_id = '1106' AND sample_time > now() - interval '54 hours' AND surface_temp_c <= 3.5 GROUP BY 1 ORDER BY 1

SELECT station_id, name, count(DISTINCT (sample_time AT TIME ZONE 'UTC')::date) AS dagar, count(*) AS rader, min(surface_temp_c) AS yta_min, round(avg(air_temp_c), 1) AS luft_medel, max(air_temp_c - surface_temp_c) AS storsta_gap, min(sample_time)::date AS forsta, max(sample_time)::date AS senaste FROM weather_observations WHERE sample_time > now() - interval '60 days' AND air_temp_c >= 6 AND surface_temp_c <= 1 AND surface_temp_c >= air_temp_c - 12 GROUP BY 1, 2 ORDER BY dagar DESC, rader DESC
