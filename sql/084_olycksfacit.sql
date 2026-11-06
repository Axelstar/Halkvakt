-- 084: OLYCKSFACIT, STEG 1 — varje olycka fångas inom 15 minuter med vad varje varningslager sa på platsen (Bengt 6/11: "Bygg
-- olycksfacit"; förslaget Desktop/Olyckorna_2026-11-06/OLYCKSFACIT_RUTINEN_FORSLAG_2026-11-06.md, DECISIONS #796).
-- Olyckan är facit för varningssystemen, inte för vägen: en olycka visar att något hände, inte att det var halt (DECISIONS #247).
-- Kopplingen till halka klassas i steg 2, efter en egen förregistrering; steg 1 fryser bara läget, i tid.
--
-- Fångsten måste ske direkt: kandidatens tal per punkt (ny_kandidat_live) gallras efter sex timmar. olycksfacit_fanga() tar varje
-- olycka i situation_archive som inte fångats och som börjat de senaste tolv timmarna, och skriver
--   olycksfacit        en rad per olycka: läget, texten, dubbletten (samma olycka som en tidigare rad inom 300 m och 30 min), utfallet
--                      VARNADE (något lager talade på platsen), TYST_TACKT (platsen täcks men allt var tyst) eller TYST_OTACKT (ingen
--                      väglagssträcka inom 100 m och ingen vägpunkt inom 2 km), och orsakerna till tystnaden
--   olycksfacit_lager  en rad per lager och olycka: talar (null = bedöms inte i steg 1), orsaken och detaljerna
-- Lagren, som appen räknar dem vid olyckans start:
--   A1     närmaste väglagssträcka inom 100 m, väglaget ur road_condition_history vid starten; talar vid kod ≥ 2 eller halkord i infon
--          (motorns SLIPPERY_INFO och SLIPPERY_STAM, engine/src/engine.ts).
--   K      kandidatens senaste timme som var skriven före starten (ny_kandidat_skugga.skriven_at, som appens fil hade den), på sträckan
--          för närmaste vägpunkt inom 2 km; talar om en varnande punkt ligger inom 2 km. Den närmaste punktens utfall (varnar, veto,
--          torr, spridning; yta över 0 eller inget värde utanför regelns kalla punkter) är orsaken när K tiger.
--   A2     stationerna inom 5 km (räckvidden, DECISIONS #245), senaste värdet inom en timme före starten; talar vid yta ≤ +1 °C och fukt
--          (snapshotkärnans fukt: regn, snö eller nederbörd som inte är "no"/"Dry"). Detaljerna bär de tre närmaste inom 15 km, med
--          rimfrosten (yta under daggpunkten).
--   radar  regnet på K:s sträcka de 60 minuterna före starten (det K läser som fukt); talar alltid null.
--   tackning  avstånden till närmaste väglagssträcka och vägpunkt; talar alltid null.
-- Ingenting raderas; tabellerna gallras inte. Ingen förardata läses (produktens regel om platsdata berörs inte).
-- Schemat var 15:e minut (:00, :15, :30, :45). pg_cron bara där tillägget finns; i CI:s PostGIS schemaläggs inget. Av:
-- cron.unschedule('halkvakt-olycksfacit'). Idempotent.

CREATE TABLE IF NOT EXISTS olycksfacit (
  deviation_id   text PRIMARY KEY,                     -- situation_archive
  fangad_at      timestamptz NOT NULL DEFAULT now(),
  start_time     timestamptz NOT NULL,
  message        text,
  road_number    text,
  severity_code  int,
  geom           geometry(Point, 4326) NOT NULL,
  dubblett_av    text,                                 -- en tidigare rad inom 300 m och 30 minuter (Trafikverket ger ibland två)
  utfall         text NOT NULL CHECK (utfall IN ('VARNADE', 'TYST_TACKT', 'TYST_OTACKT')),
  orsaker        text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS olycksfacit_start_idx ON olycksfacit (start_time);
CREATE INDEX IF NOT EXISTS olycksfacit_geom_idx ON olycksfacit USING gist (geom);

CREATE TABLE IF NOT EXISTS olycksfacit_lager (
  deviation_id  text NOT NULL REFERENCES olycksfacit (deviation_id) ON DELETE CASCADE,
  lager         text NOT NULL CHECK (lager IN ('A1', 'K', 'A2', 'radar', 'tackning')),
  talar         boolean,
  orsak         text,
  detalj        jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (deviation_id, lager)
);

ALTER TABLE olycksfacit ENABLE ROW LEVEL SECURITY;
ALTER TABLE olycksfacit_lager ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE olycksfacit TO service_role;
    GRANT ALL ON TABLE olycksfacit_lager TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE olycksfacit FROM anon;
    REVOKE ALL ON TABLE olycksfacit_lager FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE olycksfacit FROM authenticated;
    REVOKE ALL ON TABLE olycksfacit_lager FROM authenticated;
  END IF;
END $$;

-- Fast sökväg i definitionen (DECISIONS #784): CREATE OR REPLACE utan SET nollställer den som sql/081 satte.
CREATE OR REPLACE FUNCTION olycksfacit_fanga() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; t timestamptz; n int := 0; dubb text;
  s_seg text; s_vag text; s_km real;                                            -- närmaste väglagssträcka
  h_kod int; h_text text; h_info text[]; h_tid timestamptz;                      -- väglaget vid starten
  a1_talar boolean; a1_orsak text;
  v_punkt text; v_seg text; v_km real;                                          -- närmaste vägpunkt
  k_obs timestamptz; k_skr timestamptz; k_punkter int; k_varnar int; k_veto int; k_torr int; k_spr int;
  k_vat boolean; k_fl boolean; k_pbmin real; k_fp text[]; k_fu text[];
  varn_km real; np_utfall text; np_pb real; k_talar boolean; k_orsak text;
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
    v_punkt := NULL; v_seg := NULL; v_km := NULL; k_obs := NULL; k_skr := NULL; k_punkter := NULL; k_varnar := NULL;
    k_veto := NULL; k_torr := NULL; k_spr := NULL; k_vat := NULL; k_fl := NULL; k_pbmin := NULL; k_fp := NULL; k_fu := NULL;
    varn_km := NULL; np_utfall := NULL; np_pb := NULL; radar_mmh := NULL;

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

    -- K: närmaste vägpunkt inom 2 km och kandidatens senaste skrivna timme på dess sträcka.
    SELECT v.punkt, v.segment_id, (ST_Distance(v.geom::geography, o.geom::geography) / 1000)::real INTO v_punkt, v_seg, v_km
    FROM vagpunkt v ORDER BY v.geom <-> o.geom LIMIT 1;
    IF v_punkt IS NULL OR v_km > 2 THEN
      k_talar := false; k_orsak := 'ingen vägpunkt';
    ELSE
      SELECT s.observed_at, s.skriven_at, s.punkter, s.varnar, s.veto, s.torr, s.spridning, s.vat, s.flackvis_vat, s.pb_min,
             s.fukt_punkter, s.fukt_utfall
        INTO k_obs, k_skr, k_punkter, k_varnar, k_veto, k_torr, k_spr, k_vat, k_fl, k_pbmin, k_fp, k_fu
      FROM ny_kandidat_skugga s WHERE s.segment_id = v_seg AND s.skriven_at <= t
      ORDER BY s.observed_at DESC LIMIT 1;
      IF k_obs IS NOT NULL THEN
        SELECT min(ST_Distance(v.geom::geography, o.geom::geography) / 1000)::real INTO varn_km
        FROM unnest(k_fp, k_fu) AS x(p, u) JOIN vagpunkt v ON v.punkt = x.p WHERE x.u = 'varnar';
        SELECT x.u INTO np_utfall FROM unnest(k_fp, k_fu) AS x(p, u) WHERE x.p = v_punkt;
        SELECT l.pb INTO np_pb FROM ny_kandidat_live l WHERE l.punkt = v_punkt AND l.tid = k_obs;
        IF np_utfall IS NULL THEN
          np_utfall := CASE WHEN np_pb IS NULL THEN 'inget värde' WHEN np_pb <= 0 THEN 'torr' ELSE 'yta över 0' END;
        END IF;
      ELSE
        np_utfall := 'ingen timme';
      END IF;
      k_talar := coalesce(varn_km <= 2, false);
      k_orsak := CASE WHEN k_talar THEN 'varnar'
                      WHEN np_utfall = 'torr' THEN 'fukt saknades'
                      WHEN np_utfall = 'spridning' THEN 'spridningsspärren'
                      ELSE np_utfall END;
    END IF;

    -- A2: stationerna, senaste värdet inom en timme före starten.
    WITH st AS (
      SELECT DISTINCT ON (w.station_id) w.station_id, w.name, (ST_Distance(w.geom::geography, o.geom::geography) / 1000)::real AS km,
             w.sample_time, w.surface_temp_c AS yta, w.air_temp_c AS luft, w.dewpoint_c AS dagg, w.humidity_pct AS rh,
             w.precipitation AS nb,
             (w.rain OR w.snow OR (w.precipitation IS NOT NULL AND lower(w.precipitation) NOT IN ('no', 'dry'))) AS fukt
      FROM weather_observations w
      WHERE w.sample_time BETWEEN t - interval '1 hour' AND t AND w.surface_temp_c IS NOT NULL
        AND ST_DWithin(w.geom::geography, o.geom::geography, 15000)
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
      (o.deviation_id, 'K', k_talar, k_orsak, jsonb_build_object('punkt', v_punkt, 'segment', v_seg, 'km', round(v_km::numeric, 2),
         'timme', k_obs, 'skriven', k_skr, 'punkter', k_punkter, 'varnar', k_varnar, 'veto', k_veto, 'torr', k_torr,
         'spridning', k_spr, 'vat', k_vat, 'flackvis_vat', k_fl, 'pb_min', k_pbmin, 'narmaste_utfall', np_utfall,
         'narmaste_pb', np_pb, 'varnande_km', round(varn_km::numeric, 2))),
      (o.deviation_id, 'A2', a2_talar, a2_orsak, jsonb_build_object('stationer', a2_detalj, 'rimfrost', rimfrost)),
      (o.deviation_id, 'radar', NULL, CASE WHEN radar_mmh IS NULL THEN 'ingen radarrad' ELSE 'regn på radarn' END,
         jsonb_build_object('mmh', radar_mmh, 'segment', v_seg)),
      (o.deviation_id, 'tackning', NULL, CASE WHEN tackt THEN 'täckt' ELSE 'otäckt' END,
         jsonb_build_object('stracka_km', round(s_km::numeric, 2), 'vagpunkt_km', round(v_km::numeric, 2)));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-olycksfacit') THEN
      PERFORM cron.schedule('halkvakt-olycksfacit', '*/15 * * * *', 'SELECT olycksfacit_fanga()');
    END IF;
  END IF;
END $$;
