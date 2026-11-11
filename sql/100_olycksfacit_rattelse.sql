-- 100: RÄTTELSEN AV OLYCKSFACITS OMRÄKNING (DECISIONS #822, kort #642; Bengt 8/11: "gör rättelsen").
--
-- FELET. Omräkningen i sql/095 (DECISIONS #814) räknade 7/11 07.13 UTC om K-lagret för 82 olyckor 5–7/11, med två fel:
--   * Kandidatens tal per punkt (ny_kandidat_live) gallras efter sex timmar (sql/068). När punkten inte stod bland domloggens
--     fuktpunkter läste omräkningen därför inget värde, och orsaken blev "inget värde". Det ger området Kandidatens drift
--     (TROSKLAR-OLYCKSFACIT §9.3), fast fångsten vid olyckan hade läst samma timme med punkten kvar (33 rader).
--   * Fångsten sparar punkten också när den ligger mer än 2 km bort och orsaken är "ingen vägpunkt" (sql/084). Omräkningen prövade
--     inte avståndet, och 14 rader fick en orsak ur en punkt 5–6 km bort.
-- Läst i driften 8/11 före bygget, med samma regel som nedan, på alla 82 omräknade rader:
--   * 41 rader ändras: 19 "inget värde" blir "fukt saknades", 8 "inget värde" blir "yta över 0", och 14 blir "ingen vägpunkt";
--   * ingen rad som talar ändras, ingen olycka byter mellan VARNADE och tyst, och ingen rad blir "gallrad".
--
-- RÄTTELSEN, en gång per omräknad K-rad (märket rattelse #822):
--   * Punkten mer än 2 km bort ⇒ K tiger med "ingen vägpunkt", som i fångsten.
--   * "inget värde" utan punktens värde, och fångstens timme (fore.timme) är omräkningens ⇒ fångstens besked gäller, eftersom den
--     läste samma timme medan punkten fanns kvar.
--   * "inget värde" utan punktens värde och med en annan timme ⇒ "gallrad". Värdet går inte längre att läsa, och raden går till
--     §9.3 Övrigt.
--   * Det omräkningen skrev står kvar under "omrakningen". Olyckans utfall och orsaker byggs om ur de fyra lagren som i sql/095,
--     och kontrollen och klassningen rörs inte.
-- FRAMÅT. olycksfacit_k() och olycksfacit_k_stad() skriver "gallrad" i stället för "inget värde" när kandidatens timme inte längre
-- finns i ny_kandidat_live. En olycka som Trafikverket publicerar sent (10 av 120 fångster kom mer än fem timmar efter starten)
-- får annars samma falska drift. Villkoret läser datan, inte ett klockslag: timmen saknas helt i tabellen. Resten av funktionerna
-- är sql/095 och sql/096 ord för ord (kopierade maskinellt; raden märkt #822 är den enda ändringen). Idempotent.

-- Fast sökväg i definitionen (DECISIONS #784).
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
    np_utfall := CASE WHEN np_pb IS NULL AND NOT EXISTS (SELECT 1 FROM ny_kandidat_live g WHERE g.tid = kr.observed_at) THEN 'gallrad'   -- #822
                      WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
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

-- Rättelsen, en gång per rad. Märket sätts också på en rad som inte ändras, så att filen kan köras om utan att läsa raden igen.
DO $$
DECLARE r record; ny_orsak text; ny_talar boolean; a1_talar boolean; a1_orsak text; a2_talar boolean; a2_orsak text; a2_rim boolean;
        tk_orsak text; utf text; ors text[];
BEGIN
  FOR r IN
    SELECT f.deviation_id, l.talar, l.orsak, l.detalj
    FROM olycksfacit f JOIN olycksfacit_lager l ON l.deviation_id = f.deviation_id AND l.lager = 'K'
    WHERE l.detalj ? 'omraknad' AND NOT (l.detalj ? 'rattelse')
  LOOP
    ny_orsak := NULL; ny_talar := NULL;
    IF (r.detalj->>'km')::numeric > 2 THEN                                                    -- fångstens 2 km (sql/084)
      ny_orsak := 'ingen vägpunkt'; ny_talar := false;
    ELSIF r.orsak = 'inget värde' AND r.detalj->>'narmaste_pb' IS NULL THEN
      IF r.detalj->'fore'->>'timme' IS NOT NULL AND r.detalj->>'timme' IS NOT NULL
         AND (r.detalj->'fore'->>'timme')::timestamptz = (r.detalj->>'timme')::timestamptz AND r.detalj->'fore'->>'orsak' IS NOT NULL THEN
        ny_orsak := r.detalj->'fore'->>'orsak'; ny_talar := coalesce((r.detalj->'fore'->>'talar')::boolean, false);
      ELSE
        ny_orsak := 'gallrad'; ny_talar := false;
      END IF;
    END IF;
    UPDATE olycksfacit_lager
    SET talar = coalesce(ny_talar, talar), orsak = coalesce(ny_orsak, orsak),
        detalj = detalj || jsonb_build_object('rattelse', '#822')
                 || CASE WHEN ny_orsak IS NULL OR ny_orsak = r.orsak THEN '{}'::jsonb
                         ELSE jsonb_build_object('omrakningen', jsonb_build_object('talar', r.talar, 'orsak', r.orsak),
                                'narmaste_utfall', CASE ny_orsak WHEN 'fukt saknades' THEN 'torr' WHEN 'spridningsspärren' THEN 'spridning'
                                                                 ELSE ny_orsak END) END
    WHERE deviation_id = r.deviation_id AND lager = 'K';
    CONTINUE WHEN ny_orsak IS NULL OR ny_orsak = r.orsak;
    -- Olyckans utfall och orsaker ur de fyra lagren, som sql/095.
    a1_talar := NULL; a1_orsak := NULL; a2_talar := NULL; a2_orsak := NULL; a2_rim := NULL; tk_orsak := NULL;
    SELECT l.talar, l.orsak INTO a1_talar, a1_orsak FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'A1';
    SELECT l.talar, l.orsak, (l.detalj->>'rimfrost')::boolean INTO a2_talar, a2_orsak, a2_rim
    FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'A2';
    SELECT l.orsak INTO tk_orsak FROM olycksfacit_lager l WHERE l.deviation_id = r.deviation_id AND l.lager = 'tackning';
    utf := CASE WHEN coalesce(a1_talar, false) OR ny_talar OR coalesce(a2_talar, false) THEN 'VARNADE'
                WHEN tk_orsak = 'täckt' THEN 'TYST_TACKT' ELSE 'TYST_OTACKT' END;
    ors := '{}';
    IF utf <> 'VARNADE' THEN
      ors := ors || ('A1: ' || a1_orsak) || ('K: ' || ny_orsak) || ('A2: ' || a2_orsak);
      IF coalesce(a2_rim, false) THEN ors := ors || 'rimfrost'::text; END IF;
    END IF;
    UPDATE olycksfacit SET utfall = utf, orsaker = ors WHERE deviation_id = r.deviation_id;
  END LOOP;
END $$;
