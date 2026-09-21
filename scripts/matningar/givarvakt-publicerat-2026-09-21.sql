-- VAD SA DEN DEPLOYADE FUNKTIONEN SJÄLV? (kort #234, DECISIONS #298, 21/9 2026). publicera svarar med sina noter, och
-- pg_net sparar svaret. Karantänraden är beviset MED innehåll: den finns bara om den nya koden kör, och den namnger
-- stationerna. Sats 2: hade den GAMLA vakten publicerat någon av de sju som kall just nu? Bara läsande.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna).

SET statement_timeout = '120s'

SELECT to_char(created AT TIME ZONE 'UTC', 'HH24:MI:SS') AS utc, status_code, substring(content FROM '"generated_at":"([^"]+)"') AS generated_at, substring(content FROM '(karantän:[^"]*)') AS karantan_not FROM net._http_response WHERE content LIKE '%"generated_at"%' AND created > now() - interval '40 minutes' ORDER BY created DESC LIMIT 4

SELECT l.station_id, l.name, to_char(l.sample_time AT TIME ZONE 'UTC', 'HH24:MI') AS utc, l.surface_temp_c AS yta, l.air_temp_c AS luft, (l.rain OR l.snow OR (l.precipitation IS NOT NULL AND l.precipitation <> '' AND lower(l.precipitation) NOT IN ('no', 'dry'))) AS fukt, (l.sample_time > now() - interval '3 hours' AND l.surface_temp_c IS NOT NULL AND l.surface_temp_c >= l.air_temp_c - 12 AND l.surface_temp_c <= 3) AS gamla_vakten_hade_publicerat FROM weather_latest l WHERE l.station_id IN ('1106', '2346', '2135', '2132', '1713', '1612', '1302') ORDER BY l.station_id
