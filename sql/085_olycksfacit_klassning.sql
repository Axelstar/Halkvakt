-- 085: OLYCKSFACIT, STEG 2 OCH 3 — efterkontrollen med klassningen, och dagens ärende (Bengt 6/11: "Ja, bygg steg 2 och 3";
-- DECISIONS #797, kort #376). Klassningens regler står i docs/TROSKLAR-OLYCKSFACIT.md och gäller först
-- när den är signerad: den här filen migreras efter signeringen, och efter att funktionen olycksfacit är deployad (jobbet nedan
-- anropar den).
--
-- 1. FÅNGSTEN SKRIVS OM (sql/084), med två rättelser. Rader som redan är fångade räknas inte om: de fryser läget i tid.
--    * K tar kandidatens punkt på A1:s sträcka när A1 har en sträcka inom 100 m och den har en punkt inom 2 km, annars den
--      närmaste punkten överlag. Vid E18 6/11 05:23 tog den närmaste en punkt på en annan väg, och orsaken blev "fukt saknades"
--      i stället för kandidatens egen sträckas.
--    * A2 läser stationerna med driftens vakter, som snapshoten: #75 (yta högst 12 °C under luften), radvakten (vid luft ≥ 10 °C
--      högst 8 °C gap), karantänen (tre brott mot #75 de sju dygnen före starten) och den långsamma vakten (givarfel_dygn,
--      senaste ögonblick i felet inom tre timmar före starten). Utan dem kunde en trasig givare ge "isrisk" där appen teg.
-- 2. EFTERKONTROLLEN, olycksfacit_efterkontroll(), varje timme på minut 7: varje fångad olycka som är minst ett dygn gammal läses
--    om och klassas en gång:
--      text_efter      olyckans text i situation_archive nu (Trafikverket fyller på den, och skriver ofta över den när vägen är
--                      fri: "Vägen är hindersfri")
--      halka_efter     satte Trafikverket halka på A1:s sträcka (inom 100 m) under de sex timmarna efter starten? Bokförs, klassar inte
--      yta_*, dagg_min, fukt_efter, rimfrost_efter   den närmaste vaktade stationen inom 15 km med yta två timmar före till två
--                      timmar efter starten: dess lägsta yta och daggpunkt, om den hade fukt, och om ytan låg under daggpunkten
--                      vid ≤ 0 °C (rimfrost)
--      klass           TYDLIG, TROLIG, OKLAR eller INTE, i den ordningen tröskeldokumentet §4 anger; klass_skal säger vilken regel
-- 3. olycksfacit_arenden: ett ärende per svenskt dygn, skrivet av funktionen olycksfacit (supabase/functions/olycksfacit), som
--    pg_cron anropar varje morgon 05:17 UTC (inte :00/:30, kort #244). Kommandot kopieras ur skuggmotorns jobb, så att nyckeln
--    aldrig står i en fil (som 041 och 066).
-- Ingenting raderas. Ingen förardata läses. Idempotent; pg_cron bara där tillägget finns.

ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS kontrollerad_at timestamptz;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS text_efter text;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS halka_efter boolean;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS yta_station text;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS yta_km real;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS yta_min real;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS dagg_min real;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS fukt_efter boolean;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS rimfrost_efter boolean;
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS klass text CHECK (klass IN ('TYDLIG', 'TROLIG', 'OKLAR', 'INTE'));
ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS klass_skal text;
CREATE INDEX IF NOT EXISTS olycksfacit_okontrollerad_idx ON olycksfacit (start_time) WHERE kontrollerad_at IS NULL;

CREATE TABLE IF NOT EXISTS olycksfacit_arenden (
  dag         date PRIMARY KEY,                        -- det svenska dygnet olyckorna började
  nr          int NOT NULL,                            -- ärendets nummer i Axelstar/Halkvakt
  atgarda     int NOT NULL,                            -- tysta halkkopplade olyckor som ska ha en åtgärd
  stangd      boolean NOT NULL DEFAULT false,
  skapad_at   timestamptz NOT NULL DEFAULT now(),
  paminnd_at  timestamptz
);
ALTER TABLE olycksfacit_arenden ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE olycksfacit_arenden TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE olycksfacit_arenden FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE olycksfacit_arenden FROM authenticated;
  END IF;
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

    -- K: kandidatens punkt på A1:s sträcka om den har en inom 2 km, annars den närmaste punkten överlag; sedan kandidatens
    -- senaste skrivna timme på punktens sträcka.
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

-- Efterkontrollen och klassningen (tröskeldokumentet §3–§4). Ordningen i CASE är tröskeldokumentets: vilt, TYDLIG, TROLIG,
-- yta över +3, annars OKLAR. Utan vaktad station inom 15 km blir ytan okänd, och då kan bara viltet och OKLAR ges.
CREATE OR REPLACE FUNCTION olycksfacit_efterkontroll() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; n int := 0; seg text; txt text; alla text;
  st_id text; st_km real; y real; d real; fu boolean; rf boolean; he boolean; kl text; sk text;
BEGIN
  FOR o IN
    SELECT f.deviation_id, f.start_time AS t, f.message, f.geom FROM olycksfacit f
    WHERE f.kontrollerad_at IS NULL AND f.start_time <= now() - interval '24 hours'
    ORDER BY f.start_time, f.deviation_id
  LOOP
    seg := NULL; txt := NULL; st_id := NULL; st_km := NULL; y := NULL; d := NULL; fu := NULL; rf := NULL; he := NULL;

    SELECT s.message INTO txt FROM situation_archive s WHERE s.deviation_id = o.deviation_id;
    alla := coalesce(o.message, '') || ' | ' || coalesce(txt, '');

    -- Väglaget efteråt på A1:s sträcka: satte Trafikverket halka under de sex timmarna efter starten? Bokförs, klassar inte.
    SELECT l.detalj->>'segment' INTO seg FROM olycksfacit_lager l
    WHERE l.deviation_id = o.deviation_id AND l.lager = 'A1' AND (l.detalj->>'km')::real <= 0.1;
    IF seg IS NOT NULL THEN
      he := EXISTS (
        SELECT 1 FROM road_condition_history h
        WHERE h.segment_id = seg AND NOT h.deleted AND h.modified_time > o.t AND h.modified_time <= o.t + interval '6 hours'
          AND (coalesce(h.condition_code, 0) >= 2 OR EXISTS (
            SELECT 1 FROM unnest(coalesce(h.condition_info, '{}')) i
            WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')));
    END IF;

    -- Vägytan: den närmaste vaktade stationen inom 15 km med yta två timmar före till två timmar efter starten.
    WITH karantan AS (
      SELECT k.station_id FROM weather_observations k
      WHERE k.sample_time <= o.t AND k.sample_time > o.t - interval '7 days'  -- KARANTAN_DYGN
        AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12
      GROUP BY k.station_id HAVING count(*) >= 3  -- KARANTAN_BROTT
    ),
    langsam AS (
      SELECT g.station_id FROM givarfel_dygn g WHERE g.forst <= o.t AND g.senast > o.t - interval '3 hours'  -- LANGSAM_FRIST_H
    ),
    rader AS (
      SELECT w.station_id, (ST_Distance(w.geom::geography, o.geom::geography) / 1000)::real AS km,
             w.surface_temp_c AS yta, w.dewpoint_c AS dagg,
             (w.rain OR w.snow OR (w.precipitation IS NOT NULL AND lower(w.precipitation) NOT IN ('no', 'dry'))) AS fukt
      FROM weather_observations w
      WHERE w.sample_time BETWEEN o.t - interval '2 hours' AND o.t + interval '2 hours' AND w.surface_temp_c IS NOT NULL
        AND ST_DWithin(w.geom::geography, o.geom::geography, 15000)
        AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
        AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
        AND w.station_id NOT IN (SELECT station_id FROM karantan)
        AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ),
    narmast AS (SELECT r.station_id, min(r.km) AS km FROM rader r GROUP BY r.station_id ORDER BY 2, 1 LIMIT 1)
    SELECT n.station_id, n.km, min(r.yta), min(r.dagg), coalesce(bool_or(r.fukt), false),
           coalesce(bool_or(r.yta <= 0 AND r.dagg IS NOT NULL AND r.yta < r.dagg), false)
      INTO st_id, st_km, y, d, fu, rf
    FROM narmast n JOIN rader r ON r.station_id = n.station_id
    GROUP BY n.station_id, n.km;

    kl := CASE
      WHEN alla ~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)' THEN 'INTE'
      WHEN alla ~* '(^|[^a-zåäö])(hal|halt|halk[a-zåäö]*|is|isen|isig[a-zåäö]*|ishalk[a-zåäö]*|sladd[a-zåäö]*|glashal[a-zåäö]*|blixthalk[a-zåäö]*)([^a-zåäö]|$)'
           AND y <= 1 THEN 'TYDLIG'
      WHEN alla ~* '(^|[^a-zåäö])singel' AND y <= 0 AND (fu OR rf) THEN 'TROLIG'
      WHEN y > 3 THEN 'INTE'
      ELSE 'OKLAR' END;
    sk := CASE kl
      WHEN 'TYDLIG' THEN 'halkord i texten och yta ≤ +1 °C'
      WHEN 'TROLIG' THEN 'singelolycka, yta ≤ 0 °C och ' || CASE WHEN fu THEN 'fukt' ELSE 'rimfrost' END
      WHEN 'INTE' THEN CASE WHEN y > 3 AND alla !~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)'
                            THEN 'yta över +3 °C' ELSE 'vilt' END
      ELSE CASE WHEN y IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'övrigt i kallt väder' END END;

    UPDATE olycksfacit SET kontrollerad_at = now(), text_efter = txt, halka_efter = he, yta_station = st_id, yta_km = st_km,
           yta_min = y, dagg_min = d, fukt_efter = fu, rimfrost_efter = rf, klass = kl, klass_skal = sk
    WHERE deviation_id = o.deviation_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Jobben. Efterkontrollen varje timme på minut 7. Ärendet varje morgon 05:17 UTC: kommandot kopieras ur skuggmotorns jobb med
-- replace(), så att nyckeln aldrig står i en fil. Körs med dbknapp EFTER att funktionen olycksfacit deployats.
DO $$
DECLARE k text; mal text := '/functions/v1/skuggmotor''';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-olycksfacit-efter';
    PERFORM cron.schedule('halkvakt-olycksfacit-efter', '7 * * * *', 'SELECT olycksfacit_efterkontroll()');
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR (length(k) - length(replace(k, mal, ''))) / length(mal) <> 1 THEN
      RAISE EXCEPTION 'sql/085: skuggmotorns jobbkommando har inte väntad form (en adress till skuggmotorn) — ärendets jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-olycksfacit-arende';
    PERFORM cron.schedule('halkvakt-olycksfacit-arende', '17 5 * * *', replace(k, mal, '/functions/v1/olycksfacit'''));
  END IF;
END $$;
