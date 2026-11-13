-- 112: OLYCKSFACITS K-LAGER FÖLJER DEN KANDIDAT SOM TALADE (DECISIONS #856, kort #655; TROSKLAR-OLYCKSFACIT §12; Bengt 13/11:
-- "vi signerar gör 1,2,3", Bengt och Axel).
--
-- VARFÖR. §9.1 säger att K är vad appen sa vid starten, men olycksfacit_k() (sql/095, sql/100) läste bara den nya kandidatens domlogg.
-- Appen talar med den nya när beslutet säger ny och den nyas timme är färsk, annars med den frysta (bytet, sql/070, talande_timme(),
-- FORREGISTRERING-2026-27 §12 f). När MET:s morgonfel 12/11 och 13/11 lämnade den nya utan timme medan den frysta hade en, skrev
-- olycksfacit "ingen timme" för K, fast appen talade med den frysta: 2 olyckor 12/11, ingen av dem halkkopplad (läst 13/11).
--
-- REGELN, räknad vid starten som talande_timme() räknas vid publiceringen:
--   beslutet  den senaste raden i kandidat_talar som var skriven vid starten, annars fryst (som kandidat_talar_nu());
--   ny        olycksfacit_k_ny(), sql/100:s olycksfacit_k ord för ord. Har den en timme gäller den, med talare "ny".
--   fryst     annars olycksfacit_k_fryst(), samma funktion ord för ord mot den frystas tabeller (kandidat_skugga_korning,
--             kandidat_skugga, kandidat_live). Har den en timme gäller den, med talare "fryst".
--   ingen     har ingen av dem en timme gäller den talandes "ingen timme", med talare "ingen".
-- Detaljen bär talaren; inget annat i fångsten ändras. Storstädernas punkter läses som förut ur den nyas stadslogg, eftersom den
-- frysta saknar en sådan logg (§12.3). Redan fångade olyckor rörs inte. Fast sökväg i definitionerna (DECISIONS #784). Idempotent.
-- TILLBAKA: kör sql/100 igen (olycksfacit_k läser då bara den nya); _ny och _fryst kan stå.

-- Den nya kandidatens K: sql/100:s olycksfacit_k ord för ord, bara namnet bytt.
CREATE OR REPLACE FUNCTION olycksfacit_k_ny(t timestamptz, p_punkt text, p_seg text, p_geom geometry,
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
    np_utfall := CASE WHEN np_pb IS NULL AND NOT EXISTS (SELECT 1 FROM ny_kandidat_live g WHERE g.tid = k_h) THEN 'gallrad'   -- #822
                      WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
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

-- Den frystas K: samma funktion ord för ord, mot den frystas domlogg och tal per punkt.
CREATE OR REPLACE FUNCTION olycksfacit_k_fryst(t timestamptz, p_punkt text, p_seg text, p_geom geometry,
                                         OUT talar boolean, OUT orsak text, OUT detalj jsonb)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE
  k_h timestamptz; k_status text; s record; varn_km real; np_utfall text; np_pb real;
BEGIN
  SELECT c.observed_at, c.status INTO k_h, k_status
  FROM kandidat_skugga_korning c WHERE c.korning <= t ORDER BY c.korning DESC LIMIT 1;
  IF k_h IS NULL OR k_status = 'tyst' OR k_h <= t - interval '2 hours' THEN                -- FARSK_TIMMAR
    talar := false; orsak := 'ingen timme';
    detalj := jsonb_build_object('timme', k_h, 'korning', k_status, 'narmaste_utfall', 'ingen timme', 'timregel', '#814');
    RETURN;
  END IF;
  SELECT x.* INTO s FROM kandidat_skugga x WHERE x.segment_id = p_seg AND x.observed_at = k_h;
  IF NOT FOUND THEN
    -- Domloggen skriver bara sträckor med kalla punkter: sträckan var inte kall i timmen.
    SELECT l.pb INTO np_pb FROM kandidat_live l WHERE l.punkt = p_punkt AND l.tid = k_h;
    talar := false; orsak := 'yta över 0';
    detalj := jsonb_build_object('timme', k_h, 'stracka_i_timmen', false, 'narmaste_utfall', 'yta över 0', 'narmaste_pb', np_pb,
                                 'timregel', '#814');
    RETURN;
  END IF;
  SELECT l.pb INTO np_pb FROM kandidat_live l WHERE l.punkt = p_punkt AND l.tid = k_h;
  SELECT min(ST_Distance(v.geom::geography, p_geom::geography) / 1000)::real INTO varn_km
  FROM unnest(s.fukt_punkter, s.fukt_utfall) AS x(p, u) JOIN vagpunkt v ON v.punkt = x.p WHERE x.u = 'varnar';
  SELECT x.u INTO np_utfall FROM unnest(s.fukt_punkter, s.fukt_utfall) AS x(p, u) WHERE x.p = p_punkt;
  IF np_utfall IS NULL THEN
    np_utfall := CASE WHEN np_pb IS NULL AND NOT EXISTS (SELECT 1 FROM kandidat_live g WHERE g.tid = k_h) THEN 'gallrad'   -- #822
                      WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
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

-- K vid starten, med den kandidat som talade (§12).
CREATE OR REPLACE FUNCTION olycksfacit_k(t timestamptz, p_punkt text, p_seg text, p_geom geometry,
                                         OUT talar boolean, OUT orsak text, OUT detalj jsonb)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE
  beslut text; f_talar boolean; f_orsak text; f_detalj jsonb;
BEGIN
  SELECT x.talar INTO beslut FROM kandidat_talar x WHERE x.tid <= t ORDER BY x.id DESC LIMIT 1;
  beslut := coalesce(beslut, 'fryst');
  IF beslut = 'ny' THEN
    SELECT k.talar, k.orsak, k.detalj INTO talar, orsak, detalj FROM olycksfacit_k_ny(t, p_punkt, p_seg, p_geom) k;
    IF orsak <> 'ingen timme' THEN detalj := detalj || jsonb_build_object('talare', 'ny'); RETURN; END IF;
  END IF;
  SELECT k.talar, k.orsak, k.detalj INTO f_talar, f_orsak, f_detalj FROM olycksfacit_k_fryst(t, p_punkt, p_seg, p_geom) k;
  IF f_orsak <> 'ingen timme' THEN
    talar := f_talar; orsak := f_orsak;
    detalj := f_detalj || jsonb_build_object('talare', 'fryst', 'beslut', beslut);
    RETURN;
  END IF;
  -- Ingen av dem hade en timme: den talandes "ingen timme" (den nyas när beslutet säger ny).
  IF beslut <> 'ny' THEN talar := f_talar; orsak := f_orsak; detalj := f_detalj; END IF;
  detalj := detalj || jsonb_build_object('talare', 'ingen', 'beslut', beslut);
END $$;

-- Låst dubbelt (CLAUDE.md, DECISIONS #653): bara service-rollen får funktionerna.
REVOKE ALL ON FUNCTION olycksfacit_k_ny(timestamptz, text, text, geometry), olycksfacit_k_fryst(timestamptz, text, text, geometry) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION olycksfacit_k_ny(timestamptz, text, text, geometry), olycksfacit_k_fryst(timestamptz, text, text, geometry) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION olycksfacit_k_ny(timestamptz, text, text, geometry), olycksfacit_k_fryst(timestamptz, text, text, geometry) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION olycksfacit_k_ny(timestamptz, text, text, geometry), olycksfacit_k_fryst(timestamptz, text, text, geometry) TO service_role;
  END IF;
END $$;
