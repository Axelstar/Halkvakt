-- GIVARVAKTEN EFTER DEPLOY (kort #234, DECISIONS #298, 21/9 2026). Beviset är en mätning efter deployen, inte kvittot:
-- vad visar de sju stationerna JUST NU, vad hade den gamla vakten släppt fram, och vad tar de två tilläggen?
-- Läses tillsammans med live.json på CDN vid samma tidpunkt. Bara läsande.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '120s'

SELECT l.station_id, l.name, to_char(l.sample_time AT TIME ZONE 'UTC', 'HH24:MI') AS utc, l.surface_temp_c AS yta, l.air_temp_c AS luft, l.air_temp_c - l.surface_temp_c AS gap, (l.rain OR l.snow OR (l.precipitation IS NOT NULL AND l.precipitation <> '' AND lower(l.precipitation) NOT IN ('no', 'dry'))) AS fukt, (l.sample_time > now() - interval '3 hours' AND l.surface_temp_c >= l.air_temp_c - 12 AND l.surface_temp_c <= 3) AS gamla_vakten_publicerar_kall, (l.air_temp_c >= 10 AND l.air_temp_c - l.surface_temp_c >= 8) AS radvakten_tar, (SELECT count(*) FROM weather_observations w WHERE w.station_id = l.station_id AND w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12) AS brott_7d FROM weather_latest l WHERE l.station_id IN ('1106', '2346', '2135', '2132', '1713', '1612', '1302') ORDER BY l.station_id

SELECT station_id, count(*) AS brott_7d FROM weather_observations WHERE sample_time > now() - interval '7 days' AND air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12 GROUP BY station_id HAVING count(*) >= 3 ORDER BY 2 DESC
