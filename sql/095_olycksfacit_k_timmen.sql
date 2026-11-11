-- 095: OLYCKSFACITS K-LAGER LÄSER DEN TIMME KANDIDATEN TALADE MED (DECISIONS #814; TROSKLAR-OLYCKSFACIT §9.1, ändrad 7/11 och
-- signerad av Bengt och Axel: "Ja, vi signerar").
--
-- FELET. Fångsten (sql/084, sql/085) tog kandidatens senaste skrivna timme på sträckan före starten, hur gammal den än var. Kandidatens
-- domlogg (ny_kandidat_skugga) har bara sträckor med kalla punkter, så efter några varma timmar var "den senaste timmen" den sista
-- kalla, upp till 62 timmar gammal. Av 50 olyckor med en K-timme 5/11–7/11 var 21 äldre än två timmar, och väg 193 6/11 15.00 UTC
-- bokfördes som VARNADE genom en kandidattimme från 08.00, sju timmar före olyckan. Vid olyckan teg kandidaten.
--
-- RÄTTELSEN. K-lagret läser den timme kandidaten talade med vid starten:
--   * timmen är domloggens senaste körning före starten (ny_kandidat_skugga_korning, status räknad eller redan räknad), högst två
--     timmar gammal: samma färskhet som regeln, som tiger när timmen är äldre (FARSK_TIMMAR i ny_kandidat_timme(), sql/068);
--   * sträckans rad i den timmen ger orsaken som förut (varnar, fukt saknades, spridningsspärren, veto, yta över 0, inget värde);
--   * saknas sträckan i timmen hade den ingen kall punkt: K tyst, "yta över 0";
--   * var den senaste körningen tyst, eller är timmen äldre än två timmar, tiger regeln: "ingen timme".
-- K-blocket ligger i olycksfacit_k(), som fångsten och omräkningen nedan delar. Resten av olycksfacit_fanga() är sql/085 ord för ord.
--
-- OMRÄKNINGEN. sql/085 sa att fångade rader inte räknas om. Beslutet #814 gör ett undantag för K-lagret: varje K-rad utan märket
-- timregel räknas om med samma funktion, och olyckans utfall och orsaker följer med. Klassningen (klass, efterkontrollen) rörs inte.
-- Raderna märks (timregel #814), så att filen kan köras om utan att räkna om något två gånger. Ingenting raderas.
-- Läst före bygget, som en läsning med samma regel på alla 82 rader: K varnade i 7 före och 6 efter (väg 193 blir tyst, "yta över 0"),
-- ingen tyst rad blir varnande, och "ingen timme" går från 22 till 0.

-- K-lagret för en olycka vid tiden t, med kandidatens punkt och sträcka (fångsten väljer dem som förut).
CREATE OR REPLACE FUNCTION olycksfacit_k(t timestamptz, p_punkt text, p_seg text, p_geom geometry,
                                         OUT talar boolean, OUT orsak text, OUT detalj jsonb)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE
  k_h timestamptz; k_status text; s record; varn_km real; np_utfall text; np_pb real;
BEGIN
  SELECT c.observed_at, c.status INTO k_h, k_status
  FROM ny_kandidat_skugga_korning c WHERE c.korning <= t ORDER BY c.korning DESC LIMIT 1;
  IF k_h IS NULL OR k_status = 'tyst' OR k_h <= t - interval '2 hours' THEN                -- FARSK_TIMMAR
    talar := false; orsak := 'ingen timme';
    detalj := jsonb_build_object('timme', k_h, 'korning', k_status, 'narmaste_utfall', 'ingen timme', 'timregel', '#814');
    RETURN;
  END IF;
  SELECT x.* INTO s FROM ny_kandidat_skugga x WHERE x.segment_id = p_seg AND x.observed_at = k_h;
  IF NOT FOUND THEN
    -- Domloggen skriver bara sträckor med kalla punkter: sträckan var inte kall i timmen.
    SELECT l.pb INTO np_pb FROM ny_kandidat_live l WHERE l.punkt = p_punkt AND l.tid = k_h;
    talar := false; orsak := 'yta över 0';
    detalj := jsonb_build_object('timme', k_h, 'stracka_i_timmen', false, 'narmaste_utfall', 'yta över 0', 'narmaste_pb', np_pb,
                                 'timregel', '#814');
    RETURN;
  END IF;
  SELECT l.pb INTO np_pb FROM ny_kandidat_live l WHERE l.punkt = p_punkt AND l.tid = k_h;
  SELECT min(ST_Distance(v.geom::geography, p_geom::geography) / 1000)::real INTO varn_km
  FROM unnest(s.fukt_punkter, s.fukt_utfall) AS x(p, u) JOIN vagpunkt v ON v.punkt = x.p WHERE x.u = 'varnar';
  SELECT x.u INTO np_utfall FROM unnest(s.fukt_punkter, s.fukt_utfall) AS x(p, u) WHERE x.p = p_punkt;
  IF np_utfall IS NULL THEN
    np_utfall := CASE WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
  END IF;
  talar := coalesce(varn_km <= 2, false);
  orsak := CASE WHEN talar THEN 'varnar'
                WHEN np_utfall = 'torr' THEN 'fukt saknades'
                WHEN np_utfall = 'spridning' THEN 'spridningsspärren'
                ELSE np_utfall END;
  detalj := jsonb_build_object('timme', k_h, 'skriven', s.skriven_at, 'punkter', s.punkter, 'varnar', s.varnar, 'veto', s.veto,
              'torr', s.torr, 'spridning', s.spridning, 'vat', s.vat, 'flackvis_vat', s.flackvis_vat, 'pb_min', s.pb_min,
              'narmaste_utfall', np_utfall, 'narmaste_pb', np_pb, 'varnande_km', round(varn_km::numeric, 2), 'timregel', '#814');
END $$;

-- Fast sökväg i definitionen (DECISIONS #784).
CREATE OR REPLACE FUNCTION olycksfacit_fanga() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; t timestamptz; n int := 0; dubb text;
  s_seg text; s_vag text; s_km real;                                            -- närmaste väglagssträcka
  h_kod int; h_text text; h_info text[]; h_tid timestamptz;                      -- väglaget vid starten
  a1_talar boolean; a1_orsak text;
  v_punkt text; v_seg text; v_km real;                                          -- kandidatens punkt
  kk record; k_talar boolean; k_orsak text; k_detalj jsonb;
  a2_talar boolean; a2_orsak text; a2_detalj jsonb; rimfrost boolean;
  radar_mmh numeric; tackt boolean; utf text; ors text[];
BEGIN
  FOR o IN
    SELECT s.deviation_id, coalesce(s.start_time, s.first_seen) AS start_time, s.message, s.road_number, s.severity_code, s.geom
    FROM situation_archive s
    WHERE s.message_type_value = 'Accident' AND s.geom IS NOT NULL
      AND coalesce(s.start_time, s.first_seen) > now() - interval '12 hours'
      AND NOT EXISTS (SELECT 1 FROM olycksfacit f WHERE f.deviation_id = s.deviation_id)
    ORDER BY coalesce(s.start_time, s.first_seen), s.deviation_id
  LOOP
    t := o.start_time;
    -- Varje varv börjar tomt: inget värde från förra olyckan följer med.
    dubb := NULL; s_seg := NULL; s_vag := NULL; s_km := NULL; h_kod := NULL; h_text := NULL; h_info := NULL; h_tid := NULL;
    v_punkt := NULL; v_seg := NULL; v_km := NULL; k_detalj := '{}'::jsonb; radar_mmh := NULL;

    SELECT f.deviation_id INTO dubb FROM olycksfacit f
    WHERE f.dubblett_av IS NULL AND abs(extract(epoch FROM f.start_time - t)) <= 1800
      AND ST_DWithin(f.geom::geography, o.geom::geography, 300)
    ORDER BY f.start_time LIMIT 1;

    -- A1: närmaste väglagssträcka, och väglaget vid starten (historiken; utan historik det nuvarande).
    SELECT r.segment_id, r.road_number, (ST_Distance(r.geom::geography, o.geom::geography) / 1000)::real INTO s_seg, s_vag, s_km
    FROM road_conditions r WHERE r.geom IS NOT NULL ORDER BY r.geom <-> o.geom LIMIT 1;
    IF s_seg IS NOT NULL THEN
      SELECT h.condition_code, h.condition_text, h.condition_info, h.modified_time INTO h_kod, h_text, h_info, h_tid
      FROM road_condition_history h
      WHERE h.segment_id = s_seg AND h.modified_time <= t AND NOT h.deleted
      ORDER BY h.modified_time DESC LIMIT 1;
      IF h_tid IS NULL THEN
        SELECT r.condition_code, r.condition_text, r.condition_info, r.modified_time INTO h_kod, h_text, h_info, h_tid
        FROM road_conditions r WHERE r.segment_id = s_seg;
      END IF;
    END IF;
    IF s_seg IS NULL OR s_km > 0.1 THEN
      a1_talar := false; a1_orsak := 'ingen sträcka';
    ELSE
      a1_talar := coalesce(h_kod, 0) >= 2 OR EXISTS (
        SELECT 1 FROM unnest(coalesce(h_info, '{}')) i
        WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)');
      a1_orsak := CASE WHEN a1_talar THEN 'väglag ' ELSE 'väglaget ' END || coalesce(h_text, 'okänt');
    END IF;

    -- K: kandidatens punkt på A1:s sträcka om den har en inom 2 km, annars den närmaste punkten överlag; sedan den timme kandidaten
    -- talade med vid starten (olycksfacit_k, DECISIONS #814).
    IF s_seg IS NOT NULL AND s_km <= 0.1 THEN
      SELECT v.punkt, v.segment_id, (ST_Distance(v.geom::geography, o.geom::geography) / 1000)::real INTO v_punkt, v_seg, v_km
      FROM vagpunkt v WHERE v.segment_id = s_seg ORDER BY v.geom <-> o.geom LIMIT 1;
      IF v_km > 2 THEN v_punkt := NULL; v_seg := NULL; v_km := NULL; END IF;
    END IF;
    IF v_punkt IS NULL THEN
      SELECT v.punkt, v.segment_id, (ST_Distance(v.geom::geography, o.geom::geography) / 1000)::real INTO v_punkt, v_seg, v_km
      FROM vagpunkt v ORDER BY v.geom <-> o.geom LIMIT 1;
    END IF;
    IF v_punkt IS NULL OR v_km > 2 THEN
      k_talar := false; k_orsak := 'ingen vägpunkt';
    ELSE
      SELECT * INTO kk FROM olycksfacit_k(t, v_punkt, v_seg, o.geom);
      k_talar := kk.talar; k_orsak := kk.orsak; k_detalj := kk.detalj;
    END IF;

    -- A2: de vaktade stationerna (som snapshoten), senaste värdet inom en timme före starten.
    WITH karantan AS (
      SELECT k.station_id FROM weather_observations k
      WHERE k.sample_time <= t AND k.sample_time > t - interval '7 days'  -- KARANTAN_DYGN
        AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12
      GROUP BY k.station_id HAVING count(*) >= 3  -- KARANTAN_BROTT
    ),
    langsam AS (
      SELECT g.station_id FROM givarfel_dygn g WHERE g.forst <= t AND g.senast > t - interval '3 hours'  -- LANGSAM_FRIST_H
    ),
    st AS (
      SELECT DISTINCT ON (w.station_id) w.station_id, w.name, (ST_Distance(w.geom::geography, o.geom::geography) / 1000)::real AS km,
             w.sample_time, w.surface_temp_c AS yta, w.air_temp_c AS luft, w.dewpoint_c AS dagg, w.humidity_pct AS rh,
             w.precipitation AS nb,
             (w.rain OR w.snow OR (w.precipitation IS NOT NULL AND lower(w.precipitation) NOT IN ('no', 'dry'))) AS fukt
      FROM weather_observations w
      WHERE w.sample_time BETWEEN t - interval '1 hour' AND t AND w.surface_temp_c IS NOT NULL
        AND ST_DWithin(w.geom::geography, o.geom::geography, 15000)
        AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
        AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
        AND w.station_id NOT IN (SELECT station_id FROM karantan)
        AND w.station_id NOT IN (SELECT station_id FROM langsam)
      ORDER BY w.station_id, w.sample_time DESC
    )
    SELECT coalesce(bool_or(km <= 5 AND yta <= 1 AND fukt), false),
           CASE WHEN count(*) FILTER (WHERE km <= 5) = 0 THEN 'ingen station inom 5 km'
                WHEN bool_or(km <= 5 AND yta <= 1 AND fukt) THEN 'isrisk'
                WHEN bool_or(km <= 5 AND yta <= 1) THEN 'ingen fukt vid stationen'
                ELSE 'yta över +1' END,
           coalesce(bool_or(yta <= 0 AND dagg IS NOT NULL AND yta < dagg), false),
           coalesce((SELECT jsonb_agg(jsonb_build_object('station', s2.station_id, 'namn', s2.name, 'km', round(s2.km::numeric, 1),
                       'tid', s2.sample_time, 'yta', s2.yta, 'luft', s2.luft, 'dagg', s2.dagg, 'rh', s2.rh, 'nb', s2.nb, 'fukt', s2.fukt,
                       'rimfrost', (s2.yta <= 0 AND s2.dagg IS NOT NULL AND s2.yta < s2.dagg)) ORDER BY s2.km)
                     FROM (SELECT * FROM st ORDER BY km LIMIT 3) s2), '[]'::jsonb)
      INTO a2_talar, a2_orsak, rimfrost, a2_detalj
    FROM st;

    -- Radarn på K:s sträcka, det K läser som fukt.
    IF v_seg IS NOT NULL THEN
      SELECT max(r.rate_mean_mmh) INTO radar_mmh FROM radar_precip r
      WHERE r.segment_id = v_seg AND r.observed_at BETWEEN t - interval '60 minutes' AND t;
    END IF;

    tackt := (s_seg IS NOT NULL AND s_km <= 0.1) OR (v_punkt IS NOT NULL AND v_km <= 2);
    utf := CASE WHEN a1_talar OR k_talar OR a2_talar THEN 'VARNADE' WHEN tackt THEN 'TYST_TACKT' ELSE 'TYST_OTACKT' END;
    ors := '{}';
    IF utf <> 'VARNADE' THEN
      ors := ors || ('A1: ' || a1_orsak) || ('K: ' || k_orsak) || ('A2: ' || a2_orsak);
      IF rimfrost THEN ors := ors || 'rimfrost'::text; END IF;
    END IF;

    INSERT INTO olycksfacit (deviation_id, start_time, message, road_number, severity_code, geom, dubblett_av, utfall, orsaker)
    VALUES (o.deviation_id, t, o.message, o.road_number, o.severity_code, o.geom, dubb, utf, ors);
    INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj) VALUES
      (o.deviation_id, 'A1', a1_talar, a1_orsak, jsonb_build_object('segment', s_seg, 'vag', s_vag, 'km', round(s_km::numeric, 2),
         'kod', h_kod, 'text', h_text, 'info', to_jsonb(h_info), 'satt', h_tid)),
      (o.deviation_id, 'K', k_talar, k_orsak, jsonb_build_object('punkt', v_punkt, 'segment', v_seg, 'km', round(v_km::numeric, 2))
         || k_detalj),
      (o.deviation_id, 'A2', a2_talar, a2_orsak, jsonb_build_object('stationer', a2_detalj, 'rimfrost', rimfrost)),
      (o.deviation_id, 'radar', NULL, CASE WHEN radar_mmh IS NULL THEN 'ingen radarrad' ELSE 'regn på radarn' END,
         jsonb_build_object('mmh', radar_mmh, 'segment', v_seg)),
      (o.deviation_id, 'tackning', NULL, CASE WHEN tackt THEN 'täckt' ELSE 'otäckt' END,
         jsonb_build_object('stracka_km', round(s_km::numeric, 2), 'vagpunkt_km', round(v_km::numeric, 2)));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- OMRÄKNINGEN (#814): varje K-rad med en kandidatpunkt och utan märket timregel räknas om vid sin olyckas start, och olyckans
-- utfall och orsaker byggs om ur de fyra lagren, som fångsten bygger dem. Rader utan punkt ("ingen vägpunkt") ändras inte.
DO $$
DECLARE r record; kk record; a1_talar boolean; a1_orsak text; a2_talar boolean; a2_orsak text; a2_rim boolean; tk_orsak text;
        utf text; ors text[];
BEGIN
  FOR r IN
    SELECT f.deviation_id, f.start_time, f.geom, l.detalj, l.talar AS fore_talar, l.orsak AS fore_orsak
    FROM olycksfacit f JOIN olycksfacit_lager l ON l.deviation_id = f.deviation_id AND l.lager = 'K'
    WHERE l.detalj->>'punkt' IS NOT NULL AND NOT (l.detalj ? 'timregel')
  LOOP
    SELECT * INTO kk FROM olycksfacit_k(r.start_time, r.detalj->>'punkt', r.detalj->>'segment', r.geom);
    -- Det fångsten skrev före omräkningen står kvar under "fore", så att ändringen går att läsa i efterhand.
    UPDATE olycksfacit_lager SET talar = kk.talar, orsak = kk.orsak,
           detalj = jsonb_build_object('punkt', r.detalj->'punkt', 'segment', r.detalj->'segment', 'km', r.detalj->'km') || kk.detalj
                    || jsonb_build_object('omraknad', now(),
                         'fore', jsonb_build_object('talar', r.fore_talar, 'orsak', r.fore_orsak, 'timme', r.detalj->'timme'))
    WHERE deviation_id = r.deviation_id AND lager = 'K';
    a1_talar := NULL; a1_orsak := NULL; a2_talar := NULL; a2_orsak := NULL; a2_rim := NULL; tk_orsak := NULL;
    SELECT l.talar, l.orsak INTO a1_talar, a1_orsak FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'A1';
    SELECT l.talar, l.orsak, (l.detalj->>'rimfrost')::boolean INTO a2_talar, a2_orsak, a2_rim
    FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'A2';
    SELECT l.orsak INTO tk_orsak FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'tackning';
    utf := CASE WHEN coalesce(a1_talar, false) OR kk.talar OR coalesce(a2_talar, false) THEN 'VARNADE'
                WHEN tk_orsak = 'täckt' THEN 'TYST_TACKT' ELSE 'TYST_OTACKT' END;
    ors := '{}';
    IF utf <> 'VARNADE' THEN
      ors := ors || ('A1: ' || a1_orsak) || ('K: ' || kk.orsak) || ('A2: ' || a2_orsak);
      IF coalesce(a2_rim, false) THEN ors := ors || 'rimfrost'::text; END IF;
    END IF;
    UPDATE olycksfacit SET utfall = utf, orsaker = ors WHERE deviation_id = r.deviation_id;
  END LOOP;
END $$;

-- Låst dubbelt (CLAUDE.md): bara service-rollen får köra K-funktionen, som fångsten.
REVOKE ALL ON FUNCTION olycksfacit_k(timestamptz, text, text, geometry) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION olycksfacit_k(timestamptz, text, text, geometry) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION olycksfacit_k(timestamptz, text, text, geometry) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION olycksfacit_k(timestamptz, text, text, geometry) TO service_role;
  END IF;
END $$;
