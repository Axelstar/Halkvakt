-- PROVLISTAN (uppföljningen del 4a, DECISIONS #883, kort #662): småvägarna nära en plats där småvägsrösten varnar just nu.
-- Den enda kontrollen på själva småvägarna är att någon ser efter. Listan säger var: de statliga småvägar inom KM kilometer från
-- platsen som har minst en varnande punkt i regelns timme, närmast först, med en kartlänk till vägens närmaste punkt.
-- Bara läsning. Körs för hand i Supabase SQL-redigerare, aldrig i ett flöde: före påslaget är regelns utfall inte publicerat, och
-- en logg i det publika repot får inte bära det (#768). Regeln är smavag_regel() (sql/105), oberoende av brytarna.
-- Ändra platsen och radien på raden "plats" nedan. Exemplet är Ystad.
SET statement_timeout = '30s';
WITH plats AS (SELECT 55.4295::float8 AS lat, 13.8200::float8 AS lon, 15::float8 AS km),
mitt AS (SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography AS g, km FROM plats),
varnar AS (SELECT r.punkt FROM smavag_regel() r WHERE r.utfall = 'varnar'),
nara AS (
  SELECT s.vag, s.grupp, s.lat, s.lon, (v.punkt IS NOT NULL) AS varnar, ST_Distance(s.geom::geography, m.g) / 1000 AS km
  FROM smavagspunkt s CROSS JOIN mitt m LEFT JOIN varnar v ON v.punkt = s.punkt
  WHERE ST_DWithin(s.geom::geography, m.g, m.km * 1000)
)
SELECT vag, grupp,
       count(*) FILTER (WHERE varnar) AS varnande_punkter, count(*) AS punkter_inom_radien,
       round(min(km) FILTER (WHERE varnar)::numeric, 1) AS km_till_narmaste_varnande,
       (SELECT smavag_timme()) AS regelns_timme,
       'https://www.google.com/maps?q=' || round((array_agg(lat ORDER BY varnar DESC, km))[1]::numeric, 5) || ','
         || round((array_agg(lon ORDER BY varnar DESC, km))[1]::numeric, 5) AS karta
FROM nara
GROUP BY vag, grupp
HAVING count(*) FILTER (WHERE varnar) > 0
ORDER BY km_till_narmaste_varnande
LIMIT 30;
