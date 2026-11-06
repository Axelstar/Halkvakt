-- 091: STORSTÄDERNAS PUNKTER I KANDIDATENS REGEL (DECISIONS #804, kort #378; halkvakt-kuvos F33 och förregistreringen för
-- stadsmiljön §13 posterna 2 och 3, signerade av Bengt och Axel 6/11).
--
-- kandidat_regel() och ny_kandidat_regel() skapas om ur sql/087 ord för ord, med tre tillägg i var och en:
--   * kall får en andra gren (UNION ALL) med storstädernas punkter (sql/089). Gruppen står i segment_id, så att publiceringen gör en
--     sträcka av varje grupp, och bara punkter vars brytare (stadsbrytare, område och lager) är på tas med. Alla fyra brytarna är av
--     när filen körs, så regeln ger samma svar som förut tills Bengt och Axel slår på dem.
--   * Marsfönstret i den grenen: punkterna tiger kl. 10.00–15.59 svensk tid i mars söder om 62° N, räknat på värdets timme (l.tid).
--     Det är regel B i förregistreringen. För röstvarningar skyddar fönstret ingenting; det tystar bara K.
--   * radar får en andra gren med radar_stad (sql/090) per grupp, samma 60 minuter och samma gräns 0,1 mm/h. Radarn är stadspunkternas
--     enda fukt: Trafikverkets väglag har inga grupper, så vaglag ger dem aldrig Våt.
-- Vetot (15 km, +2 °C, 45 min) och spärren F1 gäller per punkt som förut. Den frystas kandidat_live har inga stadspunkter, så
-- stadsgrenen är tom där. test/ny-kandidat-skugga.test.ts prövar att de två regelfunktionerna är samma regel med bytta namn.
-- WHERE-satsen i stadsgrenen står i en annan ordning än vägpunkternas, så att raden som den snabba härledningen (sql/080) byter bara
-- finns en gång.
--
-- DOMLOGGEN. ny_kandidat_logga() (sql/068) skrivs om med två undantag: stadspunkterna läggs inte bland stationerna
-- (ny_kandidat_station tar varje rad som inte börjar med v), och deras grupper läggs inte i ny_kandidat_skugga, som är kandidatens
-- domlogg för vägpunkterna. Stadspunkternas dom räknas i kuvösen (F32). Fast sökväg i definitionen (DECISIONS #784).
--
-- DEN SNABBA REGELN (sql/080) härleds inte om här. Den har inte gått att härleda sedan sql/087: ny_kandidat_snabb saknar frys_min.
-- En ny härledning måste också byta stadsgrenens källa.
--
-- ORDNINGEN: efter sql/089 och sql/090 (båda migrerade 6/11). Stadspunkternas rader i ny_kandidat_live skrivs av kedjan, som byggs
-- efter den här filen. TILLBAKA: kör om sql/087 (regeln utan stadsgrenen). Domloggen kan stå kvar, för den utesluter bara stadspunkterna.
-- Returtypen är densamma, så CREATE OR REPLACE räcker och rättigheterna står kvar. Idempotent.

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
    WHERE l.tid = kandidat_timme()
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
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#575, R #725): yta ≤ 0, fukt (Våt eller radar ≥ 0,1 mm/h på 60 min), veto inom 15 km över +2 °C på 45 min, spridningsspärren F1 (minoritetens viktandel kring noll ≥ 0,45 där minst två ankare bidrar, #800), färsk och fullständig. Storstädernas punkter (sql/091, #804) med påslagen brytare, gruppen som sträcka, radarn ur radar_stad som enda fukt och tysta kl. 10–16 svensk tid i mars söder om 62°. Bara service-rollen.';

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
    WHERE l.tid = ny_kandidat_timme()
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
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION ny_kandidat_regel() IS 'Den nya kandidatens regel (sql/068, ersättningsregeln §4): den frystas regel i sql/091 ord för ord på ny_kandidat_live, med storstädernas punkter (#804). Talar genom talande_regel() (sql/070). Bara service-rollen.';

-- Domloggen (sql/068) med stadspunkterna undantagna: inte bland stationerna, och deras grupper inte bland sträckorna.
CREATE OR REPLACE FUNCTION ny_kandidat_logga() RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE t timestamptz; n_st int := 0; n_seg int := 0; n_v int := 0; n_veto int := 0; n_torr int := 0; n_spr int := 0;
BEGIN
  INSERT INTO ny_kandidat_station (station_id, observed_at, ph, pg, ra, ank_km, pb, n_ank, spr)
    SELECT l.punkt, l.tid, l.ph, l.pg, l.ra, l.ank_km, l.pb, l.n_ank, l.spr FROM ny_kandidat_live l
    WHERE l.punkt NOT LIKE 'v%' AND l.punkt !~ '^[BC][0-9]{5}$'                                      -- stadspunkterna (sql/089)
    ON CONFLICT (station_id, observed_at) DO NOTHING;
  GET DIAGNOSTICS n_st = ROW_COUNT;
  t := ny_kandidat_timme();
  IF t IS NULL THEN
    INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stationer)
      VALUES ((SELECT max(l.tid) FROM ny_kandidat_live l WHERE l.tid <= now()), 'tyst', n_st);
    RETURN format('kandidaten tyst (timmen gammal eller ofullständig); %s stationsrader', n_st);
  END IF;
  IF EXISTS (SELECT 1 FROM ny_kandidat_skugga_korning k WHERE k.observed_at = t AND k.status = 'räknad') THEN
    INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stationer) VALUES (t, 'redan räknad', n_st);
    RETURN format('kandidatens timme %s redan räknad; %s stationsrader', t, n_st);
  END IF;
  WITH r AS (SELECT * FROM ny_kandidat_regel() x WHERE x.punkt !~ '^[BC][0-9]{5}$'),                 -- stadspunkterna (sql/089)
  ins AS (
    INSERT INTO ny_kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, radar_mmh, pb_min,
                                 veto_station, veto_km, veto_yta, spridning, fukt_glest, fukt_spr_min,
                                 fukt_punkter, fukt_utfall, fukt_ank_km, fukt_n_ank, fukt_spr, fukt_pb)
    SELECT r.segment_id, r.tid, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'), count(*) FILTER (WHERE r.utfall = 'veto'),
           count(*) FILTER (WHERE r.utfall = 'torr'), bool_or(r.vat), bool_or(r.flackvis_vat), max(r.radar_mmh), min(r.pb),
           (array_agg(r.veto_station ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           min(r.veto_km),
           (array_agg(r.veto_yta ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           count(*) FILTER (WHERE r.utfall = 'spridning'),
           count(*) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) < 2),
           min(r.spr) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) >= 2),
           -- 065: punkterna som inte är torra, i punktordning; fälten hämtas ur ny_kandidat_live för samma timme och punkt (1:1, nyckeln).
           array_agg(r.punkt ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.utfall ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(l.ank_km ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.n_ank ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.spr ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.pb ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr')
    FROM r LEFT JOIN ny_kandidat_live l ON l.tid = r.tid AND l.punkt = r.punkt
    GROUP BY r.segment_id, r.tid
    ON CONFLICT (segment_id, observed_at) DO NOTHING
    RETURNING varnar, veto, torr, spridning
  )
  SELECT count(*), coalesce(sum(i.varnar), 0), coalesce(sum(i.veto), 0), coalesce(sum(i.torr), 0), coalesce(sum(i.spridning), 0)
    INTO n_seg, n_v, n_veto, n_torr, n_spr FROM ins i;
  INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stracker, varnar, veto, torr, spridning, stationer)
    VALUES (t, 'räknad', n_seg, n_v, n_veto, n_torr, n_spr, n_st);
  RETURN format('kandidatens timme %s: %s sträckor, %s varnande punkter, %s vetade, %s torra, %s tystade av spridningen; %s stationsrader',
                t, n_seg, n_v, n_veto, n_torr, n_spr, n_st);
END $$;
