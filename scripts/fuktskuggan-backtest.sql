-- Backtestet i fuktskuggan.yml (sql/138, DECISIONS #940): bara aggregat, eftersom sammanfattningen är publik (#498).
-- Samma andel som sidan Olyckor räknar (olycksfacit/vyn.ts basfrekvens): olyckor per stationstimme i en hink, mot samma del av
-- dygnet över +3 °C; andelen som vädret orsakade är 1 − referensen/takten, aldrig under 0.

\echo 'Olyckorna per grupp: hade A2 i dag (5 km, nederbörd) och förslag 2 (15 km, nederbörd eller daggpunkt) en station?'
SELECT CASE WHEN o.klass IN ('TYDLIG', 'TROLIG') THEN CASE WHEN o.utfall = 'VARNADE' THEN '1 halka, varnade' ELSE '2 halka, tyst (miss)' END
            WHEN o.klass = 'OKLAR' THEN CASE WHEN o.utfall = 'VARNADE' THEN '3 oklar, varnade' ELSE '4 oklar, tyst' END
            ELSE '5 varm (INTE)' END AS grupp,
       count(*) AS olyckor, count(*) FILTER (WHERE s.a2_nu) AS a2_i_dag, count(*) FILTER (WHERE s.forslag) AS forslag_2,
       count(*) FILTER (WHERE s.hink IS NULL) AS ingen_station
FROM fuktskugga_olycka s JOIN olycksfacit o USING (deviation_id) GROUP BY 1 ORDER BY 1;

\echo 'Stationstimmarna: andelen som larmet hade stått på'
SELECT sum(timmar) AS stationstimmar, round(100.0 * sum(larm_a2) / sum(timmar), 1) AS a2_i_dag_procent,
       round(100.0 * sum(larm_forslag) / sum(timmar), 1) AS forslag_2_procent, min(dag)::text AS fran, max(dag)::text AS till
FROM fuktskugga_timmar;

\echo 'Basfrekvensen per hink: olyckor per 10 000 stationstimmar och andelen som vädret orsakade'
WITH t AS (SELECT dygn, hink, sum(timmar) AS timmar FROM fuktskugga_timmar GROUP BY 1, 2),
     o AS (SELECT dygn, hink, count(*) AS olyckor FROM fuktskugga_olycka WHERE hink IS NOT NULL GROUP BY 1, 2),
     r AS (SELECT t.dygn, t.hink, t.timmar, coalesce(o.olyckor, 0) AS olyckor, 10000.0 * coalesce(o.olyckor, 0) / t.timmar AS takt
           FROM t LEFT JOIN o USING (dygn, hink))
SELECT r.dygn, r.hink, r.timmar, r.olyckor, round(r.takt, 1) AS per_10000,
       round(100 * greatest(0, 1 - (SELECT b.takt FROM r b WHERE b.dygn = r.dygn AND b.hink = 'över +3') / nullif(r.takt, 0))) AS orsakat_procent
FROM r ORDER BY 1, 2;

\echo 'Per vecka: väntat antal halkolyckor (summan av andelarna) mot de klassade TYDLIG och TROLIG'
WITH t AS (SELECT dygn, hink, sum(timmar) AS timmar FROM fuktskugga_timmar GROUP BY 1, 2),
     o AS (SELECT dygn, hink, count(*) AS olyckor FROM fuktskugga_olycka WHERE hink IS NOT NULL GROUP BY 1, 2),
     r AS (SELECT t.dygn, t.hink, coalesce(o.olyckor, 0)::numeric / t.timmar AS takt FROM t LEFT JOIN o USING (dygn, hink)),
     p AS (SELECT r.dygn, r.hink, greatest(0, 1 - (SELECT b.takt FROM r b WHERE b.dygn = r.dygn AND b.hink = 'över +3') / nullif(r.takt, 0)) AS p FROM r)
SELECT to_char(s.dag, 'IYYY-"V"IW') AS vecka, count(*) AS olyckor, count(*) FILTER (WHERE o.klass IN ('TYDLIG', 'TROLIG')) AS klassade_halka,
       round(sum(coalesce(p.p, 0)), 1) AS vantat_halka, count(*) FILTER (WHERE s.hink IS NULL) AS ingen_station,
       count(*) FILTER (WHERE o.klass IN ('TYDLIG', 'TROLIG') AND o.utfall <> 'VARNADE') AS missar,
       count(*) FILTER (WHERE o.klass IN ('TYDLIG', 'TROLIG') AND o.utfall <> 'VARNADE' AND s.forslag) AS missar_forslag_2
FROM fuktskugga_olycka s JOIN olycksfacit o USING (deviation_id) LEFT JOIN p USING (dygn, hink) GROUP BY 1 ORDER BY 1;
