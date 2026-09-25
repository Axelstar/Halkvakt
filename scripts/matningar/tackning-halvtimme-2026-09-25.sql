-- Arkivets täckning per halvtimme mot aktiva stationer (kort #253, DECISIONS #353). Körs med dbknapp: en sats per rad.
SELECT to_char(to_timestamp(b * 1800) AT TIME ZONE 'UTC', 'HH24:MI') AS halvtimme_utc, count(DISTINCT station_id) AS stationer_med_rad, count(*) AS rader FROM (SELECT station_id, floor(extract(epoch FROM sample_time) / 1800)::bigint AS b FROM weather_observations WHERE sample_time > now() - interval '3 hours') x GROUP BY b ORDER BY b
SELECT count(*) AS aktiva_stationer FROM weather_latest WHERE sample_time > now() - interval '1 hour'
