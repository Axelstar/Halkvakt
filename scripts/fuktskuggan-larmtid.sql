-- LARMTIDEN FÖR FUKTREGELN (Bengt 21/11: krutet på fuktregeln; DECISIONS #941). Var och när förslag 2 står på, och om det går att korta
-- utan att tappa missarna. Läser den tillfälliga databasen (kort #323) med säsongens väder och olycksfacit; skriver bara aggregat,
-- eftersom sammanfattningen är publik (#498): ingen olycka, ingen station och ingen plats finare än breddgradsbandet.
--
-- RADERNA är sql/138:s: yta -40…+60 °C och högst 12 °C under luften (#75), nederbörd som regn, snö eller ett ord utom no och Dry,
-- daggpunkten bara inom -50…+30 °C. Till skillnad från sql/138 prövas villkoret PER RAD och en stationstimme står på om någon av dess
-- rader uppfyller det (sql/138 tar lägsta ytan och fukten ur olika rader), så förslag 2 kan ge en något lägre andel här.
--
-- VARIANTERNA, alla med ytan <= +1 °C:
--   a2       nederbörd (dagens fukt)
--   f2       nederbörd eller ytan under daggpunkten (förslag 2)
--   rim0     nederbörd, eller ytan under daggpunkten när ytan är <= 0 °C (rimfrost; kondens på yta över noll fryser inte)
--   y05      nederbörd, eller ytan under daggpunkten när ytan är <= +0,5 °C
--   m05      nederbörd, eller ytan minst 0,5 °C under daggpunkten
--   m1       nederbörd, eller ytan minst 1 °C under daggpunkten
--   natt     nederbörd, eller ytan under daggpunkten kl. 19–06 svensk tid
-- OLYCKORNA är fuktskugga_olycka:s: klassade, inga dubbletter, inget vilt, från 6/11. En variant "har" en olycka när en station inom
-- 15 km (a2 också inom 5 km, dagens räckvidd i olycksfacit) uppfyllde villkoret i någon rad de två timmarna före starten.
-- OBS cirkeln: TROLIG kräver yta <= 0 och fukt eller rimfrost vid närmaste station inom 15 km (TROSKLAR-OLYCKSFACIT §4), alltså
-- nästan samma villkor som f2 och rim0. En TROLIG-miss som f2 fångar är därför delvis given på förhand; TYDLIG (halkordet i texten)
-- och OKLAR är de oberoende måtten.
\set ON_ERROR_STOP on
SET TimeZone = 'UTC';

CREATE TEMP TABLE lr AS
  SELECT station_id, geom, sample_time, surface_temp_c AS y,
         (coalesce(rain, false) OR coalesce(snow, false) OR (precipitation IS NOT NULL AND lower(precipitation) NOT IN ('no', 'dry'))) AS ned,
         CASE WHEN dewpoint_c BETWEEN -50 AND 30 THEN dewpoint_c END AS dg,
         extract(hour FROM sample_time AT TIME ZONE 'Europe/Stockholm') NOT BETWEEN 7 AND 18 AS natt
  FROM weather_observations
  WHERE sample_time >= timestamp '2026-11-06' AT TIME ZONE 'Europe/Stockholm' - interval '2 hours'
    AND surface_temp_c BETWEEN -40 AND 60 AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12);
CREATE TEMP TABLE lv AS
  SELECT station_id, geom, sample_time, natt, y,
         y <= 1 AND ned                                          AS a2,
         y <= 1 AND (ned OR y < dg)                              AS f2,
         y <= 1 AND (ned OR (y < dg AND y <= 0))                 AS rim0,
         y <= 1 AND (ned OR (y < dg AND y <= 0.5))               AS y05,
         y <= 1 AND (ned OR y < dg - 0.5)                        AS m05,
         y <= 1 AND (ned OR y < dg - 1)                          AS m1,
         y <= 1 AND (ned OR (y < dg AND natt))                   AS natt_v
  FROM lr;
CREATE INDEX ON lv USING gist (geom);
CREATE INDEX ON lv (sample_time);
ANALYZE lv;

CREATE TEMP TABLE sh AS
  SELECT station_id, date_trunc('hour', sample_time) AS h, bool_or(natt) AS natt,
         CASE WHEN max(ST_Y(geom::geometry)) < 60 THEN '1 söder om 60°' WHEN max(ST_Y(geom::geometry)) < 63 THEN '2 60–63°' ELSE '3 norr om 63°' END AS band,
         min(y) AS y, bool_or(a2) a2, bool_or(f2) f2, bool_or(rim0) rim0, bool_or(y05) y05, bool_or(m05) m05, bool_or(m1) m1, bool_or(natt_v) natt_v
  FROM lv WHERE sample_time >= timestamp '2026-11-06' AT TIME ZONE 'Europe/Stockholm' GROUP BY 1, 2;

\echo 'Larmtiden: andelen stationstimmar varje variant står på (procent), hela säsongen, dag och natt'
SELECT CASE WHEN g IS NULL THEN 'alla' WHEN g THEN 'natt 19–06' ELSE 'dag 07–18' END AS del, count(*) AS stationstimmar,
       round(100.0 * avg(a2::int), 1) a2, round(100.0 * avg(f2::int), 1) f2, round(100.0 * avg(rim0::int), 1) rim0,
       round(100.0 * avg(y05::int), 1) y05, round(100.0 * avg(m05::int), 1) m05, round(100.0 * avg(m1::int), 1) m1, round(100.0 * avg(natt_v::int), 1) natt
FROM (SELECT *, natt AS g FROM sh) s GROUP BY GROUPING SETS ((), (g)) ORDER BY 1;

\echo 'Larmtiden per breddgradsband (procent)'
SELECT band, count(*) AS stationstimmar, round(100.0 * avg(a2::int), 1) a2, round(100.0 * avg(f2::int), 1) f2,
       round(100.0 * avg(rim0::int), 1) rim0, round(100.0 * avg(m05::int), 1) m05, round(100.0 * avg(m1::int), 1) m1
FROM sh GROUP BY 1 ORDER BY 1;

\echo 'Daggtimmarna (f2 men inte a2): var de ligger, efter ytan och del av dygnet (procent av alla stationstimmar)'
SELECT CASE WHEN y <= 0 THEN 'yta <= 0' WHEN y <= 0.5 THEN 'yta 0 till +0,5' ELSE 'yta +0,5 till +1' END AS yta,
       CASE WHEN natt THEN 'natt' ELSE 'dag' END AS del,
       count(*) AS timmar, round(100.0 * count(*) / (SELECT count(*) FROM sh), 1) AS procent_av_alla
FROM sh WHERE f2 AND NOT a2 GROUP BY 1, 2 ORDER BY 1, 2;

\echo 'Larmtiden per timme svensk tid (procent): a2 och f2'
SELECT extract(hour FROM h AT TIME ZONE 'Europe/Stockholm')::int AS timme, round(100.0 * avg(a2::int), 1) a2, round(100.0 * avg(f2::int), 1) f2,
       round(100.0 * avg(rim0::int), 1) rim0
FROM sh GROUP BY 1 ORDER BY 1;

\echo 'Hur länge: f2:s sammanhängande episoder per station (timmar i följd), och hur många av dem som bara är dagg'
WITH f AS (SELECT station_id, h, a2, h - (row_number() OVER (PARTITION BY station_id ORDER BY h)) * interval '1 hour' AS grp FROM sh WHERE f2),
     e AS (SELECT station_id, grp, count(*) AS n, bool_or(a2) AS med_ned FROM f GROUP BY 1, 2)
SELECT CASE WHEN med_ned THEN 'med nederbörd' ELSE 'bara dagg' END AS episod, count(*) AS episoder,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY n) AS median_timmar, round(avg(n), 1) AS medel_timmar,
       count(*) FILTER (WHERE n = 1) AS en_timme, sum(n) AS timmar
FROM e GROUP BY 1 ORDER BY 1;

CREATE TEMP TABLE oa AS
  SELECT o.deviation_id, o.geom, o.start_time,
         CASE WHEN o.klass IN ('TYDLIG', 'TROLIG') THEN CASE WHEN o.utfall = 'VARNADE' THEN '1 halka, varnade'
                WHEN o.klass = 'TYDLIG' THEN '2a halka, tyst, TYDLIG' ELSE '2b halka, tyst, TROLIG' END
              WHEN o.klass = 'OKLAR' THEN CASE WHEN o.utfall = 'VARNADE' THEN '3 oklar, varnade' ELSE '4 oklar, tyst' END
              ELSE '5 varm (INTE)' END AS grupp
  FROM olycksfacit o
  WHERE o.start_time >= timestamp '2026-11-06' AT TIME ZONE 'Europe/Stockholm' AND o.dubblett_av IS NULL AND o.klass IS NOT NULL
    AND coalesce(o.art, '') <> 'vilt' AND o.geom IS NOT NULL;
CREATE TEMP TABLE om AS
  SELECT a.deviation_id, a.grupp,
         coalesce(bool_or(r.a2 AND ST_DWithin(r.geom::geography, a.geom::geography, 5000)), false) AS a2_5km,
         coalesce(bool_or(r.a2), false) a2, coalesce(bool_or(r.f2), false) f2, coalesce(bool_or(r.rim0), false) rim0,
         coalesce(bool_or(r.y05), false) y05, coalesce(bool_or(r.m05), false) m05, coalesce(bool_or(r.m1), false) m1,
         coalesce(bool_or(r.natt_v), false) natt_v
  FROM oa a LEFT JOIN lv r ON r.sample_time BETWEEN a.start_time - interval '2 hours' AND a.start_time
    AND r.geom && ST_Expand(a.geom, 0.4) AND ST_DWithin(r.geom::geography, a.geom::geography, 15000)
  GROUP BY 1, 2;

\echo 'Olyckorna: hur många varje variant hade en station för (inom 15 km; a2_5km = dagens räckvidd), två timmar före starten'
SELECT grupp, count(*) AS olyckor, count(*) FILTER (WHERE a2_5km) a2_5km, count(*) FILTER (WHERE a2) a2_15km, count(*) FILTER (WHERE f2) f2,
       count(*) FILTER (WHERE rim0) rim0, count(*) FILTER (WHERE y05) y05, count(*) FILTER (WHERE m05) m05, count(*) FILTER (WHERE m1) m1,
       count(*) FILTER (WHERE natt_v) natt
FROM om GROUP BY ROLLUP (grupp) ORDER BY grupp NULLS LAST;
