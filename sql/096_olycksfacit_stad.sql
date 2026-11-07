-- 096: OLYCKSFACIT FÖR STORSTÄDERNAS PUNKTER (DECISIONS #815, kort #378; TROSKLAR-OLYCKSFACIT §9.1, ändrad 7/11).
-- Kandidatens domlogg (ny_kandidat_skugga) tar inte storstädernas grupper (#804, sql/091): stadspunkternas dom räknas i kuvösen. Olycksfacit
-- läste K bara ur domloggen, så en olycka i en storstad hade bokförts som att K teg, också när B eller C varnade. Den här filen:
--   1. ny_kandidat_skugga_stad: per grupp och timme vad regeln sa om stadspunkterna, med de fält olycksfacit läser. Tabellen är
--      olycksfacits underlag och ingen dom; stadsmiljöns dom räknas i kuvösen som förut.
--      ny_kandidat_skugga_stad_korning: en rad per körning, med brytarna som var på, så att olycksfacit vet om en stadspunkt var påslagen
--      vid timmen och inte bara i dag.
--   2. ny_kandidat_logga_stad(): skriver dem för den nyas timme. ny-kandidat-timme.yml anropar den sist i stadsomgången, efter att
--      stadspunkternas värden är skrivna (ny-kandidat-db.ts logga-stad). Med alla brytare av räknas inte regeln (den har då inga
--      stadspunkter); körningen loggas som av.
--   3. olycksfacit_k_stad(): K vid närmaste stadspunkt inom 2 km. Brytaren av vid timmen ger "brytaren av"; annars samma timregel
--      som olycksfacit_k() (#814): körningen före starten, räknad och högst två timmar gammal, och gruppens rad i den timmen.
--   4. olycksfacit_fanga(): sql/095 ord för ord, med stadspunkten i K-lagret. K varnar också när stadspunkten varnar. Utan vägpunkt
--      inom 2 km och med brytaren på är det stadspunktens skäl som gäller. Täckningen räknar en påslagen stadspunkt inom 2 km.
--      Detaljen (K:s "stad") skrivs alltid, också med brytaren av. Med brytarna av ändras alltså ingenting utom detaljen.
-- Fångade rader räknas inte om: brytarna har varit av sedan sql/089, så ingen rad hade fått ett annat utfall.
-- Loggar och ärenden säger inga tal om stadspunkterna (#768). Tabellerna är låsta som domloggen. Idempotent.

CREATE TABLE IF NOT EXISTS ny_kandidat_skugga_stad (
  grupp         text NOT NULL,                   -- stadspunktens grupp, regelns segment_id för storstäderna (sql/091)
  observed_at   timestamptz NOT NULL,            -- kandidatens timme
  skriven_at    timestamptz NOT NULL DEFAULT now(),
  omrade        text NOT NULL,
  lager         text NOT NULL,
  punkter       int NOT NULL,                    -- stadspunkter i gruppen med yta ≤ 0 i regeln
  varnar        int NOT NULL,
  veto          int NOT NULL,
  torr          int NOT NULL,
  spridning     int NOT NULL,
  pb_min        real,
  fukt_punkter  text[],                          -- punkterna som inte är torra, i punktordning, som domloggen (sql/065)
  fukt_utfall   text[],
  PRIMARY KEY (grupp, observed_at)
);
CREATE TABLE IF NOT EXISTS ny_kandidat_skugga_stad_korning (
  korning      timestamptz PRIMARY KEY DEFAULT now(),
  observed_at  timestamptz,                       -- kandidatens timme (räknad) eller senaste timme (tyst, av)
  status       text NOT NULL CHECK (status IN ('räknad', 'tyst', 'av')),
  brytare      jsonb NOT NULL DEFAULT '[]',        -- område/lager som var på, till exempel "Stor-Stockholm/B"
  grupper      int NOT NULL DEFAULT 0
);
COMMENT ON TABLE ny_kandidat_skugga_stad IS 'Storstädernas punkter per grupp och timme (sql/096, DECISIONS #815): olycksfacits underlag, ingen dom. Bara service-rollen.';

CREATE OR REPLACE FUNCTION ny_kandidat_logga_stad() RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE t timestamptz; b jsonb; n int := 0;
BEGIN
  SELECT coalesce(jsonb_agg(x.omrade || '/' || x.lager ORDER BY x.omrade, x.lager) FILTER (WHERE x.pa), '[]'::jsonb) INTO b FROM stadsbrytare x;
  t := ny_kandidat_timme();
  IF jsonb_array_length(b) = 0 THEN
    INSERT INTO ny_kandidat_skugga_stad_korning (observed_at, status, brytare) VALUES (t, 'av', b);
    RETURN 'brytarna av';
  END IF;
  IF t IS NULL THEN
    INSERT INTO ny_kandidat_skugga_stad_korning (observed_at, status, brytare)
      VALUES ((SELECT max(l.tid) FROM ny_kandidat_live l WHERE l.tid <= now()), 'tyst', b);
    RETURN 'tyst';
  END IF;
  INSERT INTO ny_kandidat_skugga_stad (grupp, observed_at, omrade, lager, punkter, varnar, veto, torr, spridning, pb_min,
                                       fukt_punkter, fukt_utfall)
    SELECT r.segment_id, r.tid, s.omrade, s.lager, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'),
           count(*) FILTER (WHERE r.utfall = 'veto'), count(*) FILTER (WHERE r.utfall = 'torr'),
           count(*) FILTER (WHERE r.utfall = 'spridning'), min(r.pb),
           array_agg(r.punkt ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.utfall ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr')
    FROM ny_kandidat_regel() r JOIN stadspunkt s ON s.punkt = r.punkt
    WHERE r.punkt ~ '^[BC][0-9]{5}$'                                                                -- stadspunkterna (sql/089)
    GROUP BY r.segment_id, r.tid, s.omrade, s.lager
    ON CONFLICT (grupp, observed_at) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO ny_kandidat_skugga_stad_korning (observed_at, status, brytare, grupper) VALUES (t, 'räknad', b, n);
  DELETE FROM ny_kandidat_skugga_stad WHERE observed_at < now() - interval '14 days';
  DELETE FROM ny_kandidat_skugga_stad_korning WHERE korning < now() - interval '14 days';
  RETURN 'klart';
END $$;

-- K vid närmaste stadspunkt inom 2 km från olyckan vid tiden t. Utan stadspunkt inom 2 km: detalj NULL (fångsten skriver ingenting).
CREATE OR REPLACE FUNCTION olycksfacit_k_stad(t timestamptz, p_geom geometry,
                                              OUT talar boolean, OUT orsak text, OUT aktiv boolean, OUT detalj jsonb)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE sp record; kr record; s record; varn_km real; np_utfall text; np_pb real;
BEGIN
  talar := false; orsak := 'ingen stadspunkt'; aktiv := false; detalj := NULL;
  SELECT x.punkt, x.grupp, x.omrade, x.lager, (ST_Distance(x.geom::geography, p_geom::geography) / 1000)::real AS km INTO sp
  FROM stadspunkt x ORDER BY x.geom <-> p_geom LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  IF sp.km > 2 THEN RETURN; END IF;
  SELECT c.observed_at, c.status, c.brytare INTO kr FROM ny_kandidat_skugga_stad_korning c WHERE c.korning <= t
  ORDER BY c.korning DESC LIMIT 1;
  IF FOUND THEN aktiv := kr.brytare ? (sp.omrade || '/' || sp.lager); ELSE aktiv := false; END IF;
  detalj := jsonb_build_object('punkt', sp.punkt, 'grupp', sp.grupp, 'omrade', sp.omrade, 'lager', sp.lager,
                               'km', round(sp.km::numeric, 2), 'aktiv', aktiv);
  IF NOT aktiv THEN
    talar := false; orsak := 'brytaren av';
    detalj := detalj || jsonb_build_object('orsak', orsak, 'talar', talar);
    RETURN;
  END IF;
  IF kr.status <> 'räknad' OR kr.observed_at IS NULL OR kr.observed_at <= t - interval '2 hours' THEN      -- FARSK_TIMMAR
    talar := false; orsak := 'ingen timme';
    detalj := detalj || jsonb_build_object('timme', kr.observed_at, 'korning', kr.status, 'orsak', orsak, 'talar', talar);
    RETURN;
  END IF;
  SELECT x.* INTO s FROM ny_kandidat_skugga_stad x WHERE x.grupp = sp.grupp AND x.observed_at = kr.observed_at;
  IF NOT FOUND THEN
    -- Stadsloggen skriver bara grupper med kalla punkter: gruppen var inte kall i timmen.
    talar := false; orsak := 'yta över 0';
    detalj := detalj || jsonb_build_object('timme', kr.observed_at, 'orsak', orsak, 'talar', talar);
    RETURN;
  END IF;
  SELECT min(ST_Distance(x.geom::geography, p_geom::geography) / 1000)::real INTO varn_km
  FROM unnest(s.fukt_punkter, s.fukt_utfall) AS u(p, ut) JOIN stadspunkt x ON x.punkt = u.p WHERE u.ut = 'varnar';
  SELECT u.ut INTO np_utfall FROM unnest(s.fukt_punkter, s.fukt_utfall) AS u(p, ut) WHERE u.p = sp.punkt;
  SELECT l.pb INTO np_pb FROM ny_kandidat_live l WHERE l.punkt = sp.punkt AND l.tid = kr.observed_at;
  IF np_utfall IS NULL THEN
    -- Inte bland gruppens icke torra punkter: torr om den var kall, annars varm (som olycksfacit_k() för vägpunkterna).
    np_utfall := CASE WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
  END IF;
  talar := coalesce(varn_km <= 2, false);
  orsak := CASE WHEN talar THEN 'varnar'
                WHEN np_utfall = 'torr' THEN 'fukt saknades'
                WHEN np_utfall = 'spridning' THEN 'spridningsspärren'
                ELSE np_utfall END;
  detalj := detalj || jsonb_build_object('timme', kr.observed_at, 'skriven', s.skriven_at, 'punkter', s.punkter, 'varnar', s.varnar,
              'veto', s.veto, 'torr', s.torr, 'spridning', s.spridning, 'narmaste_utfall', np_utfall, 'narmaste_pb', np_pb,
              'varnande_km', round(varn_km::numeric, 2), 'orsak', orsak, 'talar', talar);
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
  ks record; stad_aktiv boolean;                                                -- storstädernas punkter (#815)
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
    v_punkt := NULL; v_seg := NULL; v_km := NULL; k_detalj := '{}'::jsonb; radar_mmh := NULL; stad_aktiv := false;

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
    -- Storstädernas punkter (#815): närmaste stadspunkt inom 2 km. Den räknas bara när dess brytare var på vid timmen; då varnar K
    -- också om den varnar, och utan vägpunkt inom 2 km är det dess skäl som gäller. Detaljen skrivs alltid, också med brytaren av.
    SELECT * INTO ks FROM olycksfacit_k_stad(t, o.geom);
    IF ks.detalj IS NOT NULL THEN k_detalj := k_detalj || jsonb_build_object('stad', ks.detalj); END IF;
    stad_aktiv := coalesce(ks.aktiv, false);
    IF coalesce(ks.talar, false) THEN
      k_talar := true; k_orsak := 'varnar';
    ELSIF NOT k_talar AND k_orsak = 'ingen vägpunkt' AND stad_aktiv THEN
      k_orsak := ks.orsak;
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

    tackt := (s_seg IS NOT NULL AND s_km <= 0.1) OR (v_punkt IS NOT NULL AND v_km <= 2) OR stad_aktiv;
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

-- Låst dubbelt (CLAUDE.md, DECISIONS #653): RLS utan policy; bara service-rollen får tabellerna och funktionerna.
ALTER TABLE ny_kandidat_skugga_stad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_skugga_stad_korning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ny_kandidat_skugga_stad, ny_kandidat_skugga_stad_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION ny_kandidat_logga_stad(), olycksfacit_k_stad(timestamptz, geometry) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE ny_kandidat_skugga_stad, ny_kandidat_skugga_stad_korning FROM anon;
    REVOKE ALL ON FUNCTION ny_kandidat_logga_stad(), olycksfacit_k_stad(timestamptz, geometry) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE ny_kandidat_skugga_stad, ny_kandidat_skugga_stad_korning FROM authenticated;
    REVOKE ALL ON FUNCTION ny_kandidat_logga_stad(), olycksfacit_k_stad(timestamptz, geometry) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE ny_kandidat_skugga_stad TO service_role;
    GRANT ALL ON TABLE ny_kandidat_skugga_stad_korning TO service_role;
    GRANT EXECUTE ON FUNCTION ny_kandidat_logga_stad(), olycksfacit_k_stad(timestamptz, geometry) TO service_role;
  END IF;
END $$;
