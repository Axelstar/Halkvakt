-- 146: TRAFIKVERKETS VÅT RÄKNAS SOM FUKT BARA EFTER NEDERBÖRD (DECISIONS #972, kort #681). Bengt 26/11 på beslutskortet: "Ändra
-- regeln nu", och "axel säger ja till ändringen".
-- kandidat_regel() och ny_kandidat_regel() skapas om ur sql/094 ord för ord, med samma ändring i båda: en punkt vars enda fukt är
-- Trafikverkets Våt varnar bara när radarn har visat minst 0,1 mm/h på sträckan de senaste sex timmarna. Radarvägen (0,1 mm/h på
-- 60 minuter) står kvar, och storstäderna, som bara har radarn, rörs inte.
-- SKÄLET (läsningen 26/11, DB-knappen 45805730615, 45806032260 och 45806267905). Den nya kandidatens timmar på Normalt, Våt från 6/11
-- gav 0,50 singelolyckor per miljon fordonskilometer med nederbörd i radarn inom 6 h och 0,127 utan, mot 0,130 på Normalt utan K.
-- Utan nederbörd var det 44 % av all tid K varnade. En väg som är blöt under noll många timmar efter nederbörden är troligen saltad.
-- UTFALLET 'uppehåll'. De punkter som ändringen tystar får ett eget utfall i stället för 'torr', efter spridningsspärren, så att
-- domloggen visar vad den gamla regeln hade sagt: den gamla regelns varnande punkter är varnar och uppehåll tillsammans (Bengt 26/11:
-- varianterna mäts mot singelolyckorna och redovisas 1/12). Allt som talar läser bara 'varnar' (talande_regel, publicera,
-- olycksfacit), och domloggen räknar uppehållets punkter i punkter och fukt_utfall men i ingen av kolumnerna varnar, veto, torr och
-- spridning. Olycksfacit skriver orsaken som 'uppehåll'.
-- DEN SNABBA REGELN (sql/080) härleds ur den här texten, och raderna den byter ut är orörda. Regeln ändras, så den snabba tiger
-- tills sql/080 och sql/081 körts om, och under tiden talar timvärdet (sql/121).
-- Kuvösens facitläsning (kuvos/facit-trv.ts, DECISIONS #593) räknar fortfarande Våt utan villkor. Skillnaden är det här beslutet.
-- ORDNINGEN: sql/146, sql/080 och sql/081 med DB-knappen (atgard=migrera), i den ordningen. TILLBAKA: kör om sql/094, sedan sql/080
-- och sql/081. Returtypen är densamma, så CREATE OR REPLACE räcker och rättigheterna står kvar. Idempotent.

CREATE OR REPLACE FUNCTION kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, v.geom
    FROM kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
    UNION ALL
    -- Storstädernas punkter (sql/089, DECISIONS #804): gruppen i segment_id, bara där brytaren för området och lagret är på, och
    -- tysta i marsfönstret (F33, regel B).
    SELECT l.punkt, s.grupp, s.lon, s.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, s.geom
    FROM kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt
    JOIN stadsbrytare b ON b.omrade = s.omrade AND b.lager = s.lager AND b.pa
    WHERE l.tid = (SELECT kandidat_timme())                                            -- en gång per körning (#813)
      AND l.pb <= 0                                                                                  -- YTA_GRANS_C
      AND NOT (s.lat < 62                                                                            -- STAD_MARS_LAT
               AND extract(month FROM l.tid AT TIME ZONE 'Europe/Stockholm') = 3                     -- STAD_MARS_MANAD
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') >= 10                    -- STAD_MARS_FRAN
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') < 16)                    -- STAD_MARS_TILL
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
    UNION ALL
    -- Storstädernas grupper (sql/090): radarn är deras enda fukt.
    SELECT r.grupp, max(r.rate_mean_mmh) FROM radar_stad r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.grupp                             -- RADAR_FONSTER_MIN
  ),
  -- Trafikverkets Våt räknas som fukt bara när radarn har visat nederbörd på sträckan de senaste sex timmarna (DECISIONS #972).
  regn AS (
    SELECT r.segment_id FROM radar_precip r
    WHERE r.observed_at > now() - interval '6 hours' AND r.rate_mean_mmh >= 0.1                     -- VAT_REGN_TIMMAR, RADAR_MMH
    GROUP BY r.segment_id
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.frys_min >= 0.45 THEN 'spridning'                     -- FRYS_MINORITET_Y (#800)
              WHEN coalesce(r.mmh, 0) < 0.1 AND rg.segment_id IS NULL THEN 'uppehåll'                    -- RADAR_MMH, Våt utan regn (#972)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN regn rg ON rg.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#575, R #725): yta ≤ 0, fukt (radar ≥ 0,1 mm/h på 60 min, eller Våt med radar ≥ 0,1 mm/h på sträckan de senaste 6 h, sql/146, #972; Våt utan den heter uppehåll), veto inom 15 km över +2 °C på 45 min, spridningsspärren F1 (minoritetens viktandel kring noll ≥ 0,45 där minst två ankare bidrar, #800), färsk och fullständig. Storstädernas punkter (sql/091, #804) med påslagen brytare, gruppen som sträcka, radarn ur radar_stad som enda fukt och tysta kl. 10–16 svensk tid i mars söder om 62°. Bara service-rollen.';

CREATE OR REPLACE FUNCTION ny_kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, v.geom
    FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
    UNION ALL
    -- Storstädernas punkter (sql/089, DECISIONS #804): gruppen i segment_id, bara där brytaren för området och lagret är på, och
    -- tysta i marsfönstret (F33, regel B).
    SELECT l.punkt, s.grupp, s.lon, s.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, s.geom
    FROM ny_kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt
    JOIN stadsbrytare b ON b.omrade = s.omrade AND b.lager = s.lager AND b.pa
    WHERE l.tid = (SELECT ny_kandidat_timme())                                            -- en gång per körning (#813)
      AND l.pb <= 0                                                                                  -- YTA_GRANS_C
      AND NOT (s.lat < 62                                                                            -- STAD_MARS_LAT
               AND extract(month FROM l.tid AT TIME ZONE 'Europe/Stockholm') = 3                     -- STAD_MARS_MANAD
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') >= 10                    -- STAD_MARS_FRAN
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') < 16)                    -- STAD_MARS_TILL
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
    UNION ALL
    -- Storstädernas grupper (sql/090): radarn är deras enda fukt.
    SELECT r.grupp, max(r.rate_mean_mmh) FROM radar_stad r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.grupp                             -- RADAR_FONSTER_MIN
  ),
  -- Trafikverkets Våt räknas som fukt bara när radarn har visat nederbörd på sträckan de senaste sex timmarna (DECISIONS #972).
  regn AS (
    SELECT r.segment_id FROM radar_precip r
    WHERE r.observed_at > now() - interval '6 hours' AND r.rate_mean_mmh >= 0.1                     -- VAT_REGN_TIMMAR, RADAR_MMH
    GROUP BY r.segment_id
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.frys_min >= 0.45 THEN 'spridning'                     -- FRYS_MINORITET_Y (#800)
              WHEN coalesce(r.mmh, 0) < 0.1 AND rg.segment_id IS NULL THEN 'uppehåll'                    -- RADAR_MMH, Våt utan regn (#972)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN regn rg ON rg.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION ny_kandidat_regel() IS 'Den nya kandidatens regel (sql/068, ersättningsregeln §4): den frystas regel i sql/146 ord för ord på ny_kandidat_live, med storstädernas punkter (#804). Talar genom talande_regel() (sql/070). Bara service-rollen.';
