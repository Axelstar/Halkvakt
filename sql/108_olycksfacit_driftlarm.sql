-- 108: OLYCKSFACIT I NÄRA REALTID (kort #641; Bengt 11/11: "Ja, alla fyra", DECISIONS #841; Axel via Bengt 11/11: "axel signerar 641",
-- DECISIONS #842). Förslaget står i docs/FORSLAG-OLYCKSFACIT-DRIFTLARM-2026-11-08.md. Två delar:
--
-- 1. DRIFTLARMET I SKUGGA (förslaget §3 och §4, frågorna 2 och 3). olycksfacit_driftlarm() prövar varje olycka som fångats de senaste
--    sex timmarna och inte prövats än (driftlarm_at), en gång, och skriver en rad i olycksfacit_driftlarm per feltyp när
--    (1) olyckan kan gälla halka: texten vid fångsten har ett halkord (klassningens TYDLIG-ord, sql/085, tecken för tecken), eller den
--        närmaste vaktade stationen inom 15 km hade en yta på högst +1 °C senast vid starten (fångstens A2-stationer, närmast först,
--        redan vaktade: #75, radvakten, karantänen och den långsamma vakten);
--    (2) och ett lager fungerade inte vid starten, läst ur data och inte ur ett klockslag:
--        'K ingen timme'  K:s orsak i fångsten: kedjans senaste körning var tyst eller äldre än två timmar (#814)
--        'K gallrad'      K:s orsak i fångsten: kandidatens tal per punkt hann gallras före fångsten (#822)
--        'A2 tyst'        en station finns inom 5 km (weather_latest, oberoende av tid), men ingen av dem har en yta i weather_observations
--                         den sista timmen före starten, vakterna oräknade. Fångstens "ingen station inom 5 km" skiljer inte en tyst
--                         station från ingen station; en station vars värden vakterna tog bort är inte tyst och ger ingen rad.
--        'appen stilla'   ingen lyckad publicering de 15 minuterna före starten. Lyckad = publiceras svar i net._http_response med
--                         "ok":true och hinken skriven (appens väg). public.anrop duger inte: sopningen tar bort de lyckade (sql/051).
--        'appen okänd'    publiceringen går inte att avgöra: pg_net saknas (CI), eller dess svar, som sparas sex timmar, når inte 15
--                         minuter före starten. Hellre okänd än en gissning.
--    Ingen dubblett får en rad (samma olycka som en tidigare rad, som i ärendet). Inga ärenden skrivs under skuggan: veckan läses, och
--    Bengt väljer vilka feltyper som får göra ärenden (fråga 3). Ingen förardata läses. Jobbet halkvakt-olycksfacit-drift går fem
--    minuter efter fångsten (:05, :20, :35, :50), bara SQL. Av: cron.unschedule('halkvakt-olycksfacit-drift').
-- 2. EFTERKONTROLLEN EFTER SEX TIMMAR (del 6; TROSKLAR-OLYCKSFACIT §10, tillägget 11/11 2026). olycksfacit_efterkontroll() är sql/085
--    ord för ord (kopierad maskinellt) utom urvalet: en olycka kontrolleras när den är minst sex timmar gammal och händelsen inte har
--    setts i flödet den senaste timmen. Flödets timme räknas från arkivets senast sedda händelse, inte från klockan: står inläsningen
--    still väntar kontrollen, i stället för att läsa en text som ännu kan ändras. text_efter läses vid kontrollen, som förut;
--    halka_efter och stationens fönster är oförändrade. Jobbet halkvakt-olycksfacit-efter (sql/085, varje timme :07) rörs inte.
-- Ingenting raderas, och redan klassade olyckor rörs inte. Idempotent; pg_cron bara där tillägget finns, och i CI:s PostGIS
-- schemaläggs inget.

ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS driftlarm_at timestamptz;   -- när driftlarmet prövade olyckan

CREATE TABLE IF NOT EXISTS olycksfacit_driftlarm (
  deviation_id  text NOT NULL REFERENCES olycksfacit (deviation_id) ON DELETE CASCADE,
  feltyp        text NOT NULL CHECK (feltyp IN ('K ingen timme', 'K gallrad', 'A2 tyst', 'appen stilla', 'appen okänd')),
  halka         text NOT NULL CHECK (halka IN ('halkord', 'yta', 'halkord och yta')),   -- vad i villkor (1) som höll
  sedan         timestamptz,                         -- K: kandidatens timme; A2: stationernas senaste yta; appen: senaste lyckade publicering
  detalj        jsonb NOT NULL DEFAULT '{}',
  upptackt_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deviation_id, feltyp)
);
COMMENT ON TABLE olycksfacit_driftlarm IS 'Driftlarmet i skugga (sql/108, DECISIONS #841, #842): en rad per olycka och feltyp när ett lager inte fungerade vid en olycka som kan gälla halka. Bara service-rollen.';

-- Fast sökväg i definitionen (DECISIONS #784).
CREATE OR REPLACE FUNCTION olycksfacit_driftlarm() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; n int := 0; r int; har_net boolean; halkord boolean; ytan boolean; halka text;
  k_orsak text; k_detalj jsonb; a2_orsak text; a2_detalj jsonb;
  k_fel text; a2_fel text; a2_sedan timestamptz; a2_st jsonb; app_fel text; app_detalj jsonb; svar_nar boolean; pub timestamptz;
BEGIN
  -- pg_net finns i Supabase men inte i CI:s PostGIS. Frågorna mot den körs med EXECUTE, så att funktionen fungerar utan net-schemat.
  har_net := to_regclass('net._http_response') IS NOT NULL;
  FOR o IN
    SELECT f.deviation_id, f.start_time AS t, f.message, f.geom, f.dubblett_av FROM olycksfacit f
    WHERE f.driftlarm_at IS NULL AND f.fangad_at > now() - interval '6 hours'
    ORDER BY f.start_time, f.deviation_id
  LOOP
    UPDATE olycksfacit SET driftlarm_at = now() WHERE deviation_id = o.deviation_id;
    CONTINUE WHEN o.dubblett_av IS NOT NULL;
    -- Varje varv börjar tomt: inget värde från förra olyckan följer med.
    k_orsak := NULL; k_detalj := NULL; a2_orsak := NULL; a2_detalj := NULL; k_fel := NULL; a2_fel := NULL; a2_sedan := NULL;
    a2_st := NULL; app_fel := NULL; app_detalj := NULL; svar_nar := NULL; pub := NULL;
    SELECT l.orsak, l.detalj INTO k_orsak, k_detalj FROM olycksfacit_lager l WHERE l.deviation_id = o.deviation_id AND l.lager = 'K';
    SELECT l.orsak, l.detalj INTO a2_orsak, a2_detalj FROM olycksfacit_lager l WHERE l.deviation_id = o.deviation_id AND l.lager = 'A2';

    -- (1) Kan olyckan gälla halka?
    halkord := coalesce(o.message, '') ~* '(^|[^a-zåäö])(hal|halt|halk[a-zåäö]*|is|isen|isig[a-zåäö]*|ishalk[a-zåäö]*|sladd[a-zåäö]*|glashal[a-zåäö]*|blixthalk[a-zåäö]*)([^a-zåäö]|$)';
    ytan := coalesce((a2_detalj->'stationer'->0->>'yta')::real <= 1, false);   -- HALKYTA, som klassningens TYDLIG
    CONTINUE WHEN NOT (halkord OR ytan);
    halka := CASE WHEN halkord AND ytan THEN 'halkord och yta' WHEN halkord THEN 'halkord' ELSE 'yta' END;

    -- (2) K: kedjans timme saknades, eller kandidatens tal hann gallras.
    IF k_orsak IN ('ingen timme', 'gallrad') THEN k_fel := 'K ' || k_orsak; END IF;

    -- (2) A2: en station finns inom 5 km, men ingen av dem hade en yta den sista timmen före starten.
    IF a2_orsak = 'ingen station inom 5 km' THEN
      WITH nara AS (
        SELECT w.station_id, round((ST_Distance(w.geom::geography, o.geom::geography) / 1000)::numeric, 1) AS km,
               (SELECT max(x.sample_time) FROM weather_observations x
                WHERE x.station_id = w.station_id AND x.sample_time <= o.t AND x.surface_temp_c IS NOT NULL) AS senast
        FROM weather_latest w WHERE ST_DWithin(w.geom::geography, o.geom::geography, 5000)     -- A2:s räckvidd (DECISIONS #245)
      )
      SELECT jsonb_agg(jsonb_build_object('station', nara.station_id, 'km', nara.km, 'senast', nara.senast)
                       ORDER BY nara.km, nara.station_id), max(nara.senast)
        INTO a2_st, a2_sedan FROM nara;
      -- A2 läser värdena den sista timmen före starten (sql/084): tyst är när ingen station inom 5 km hade en yta i den timmen.
      IF a2_st IS NOT NULL AND (a2_sedan IS NULL OR a2_sedan < o.t - interval '1 hour') THEN a2_fel := 'A2 tyst'; END IF;
    END IF;

    -- (2) Appen: den senaste lyckade publiceringen före starten, ur pg_nets svar.
    IF NOT har_net THEN
      app_fel := 'appen okänd'; app_detalj := jsonb_build_object('skal', 'pg_net saknas');
    ELSE
      EXECUTE $q$SELECT EXISTS (SELECT 1 FROM net._http_response r WHERE r.created <= $1 - interval '15 minutes'),
                        (SELECT max(r.created) FROM net._http_response r WHERE r.created <= $1
                           AND r.content LIKE '{"ok":true,"sha"%' AND r.content LIKE '%"hinken":"ok"%')$q$
        INTO svar_nar, pub USING o.t;
      IF pub IS NULL OR pub < o.t - interval '15 minutes' THEN
        IF svar_nar THEN
          app_fel := 'appen stilla'; app_detalj := jsonb_build_object('senaste_publicering', pub);
        ELSE
          app_fel := 'appen okänd'; app_detalj := jsonb_build_object('skal', 'pg_nets svar når inte 15 minuter före starten');
        END IF;
      END IF;
    END IF;

    INSERT INTO olycksfacit_driftlarm (deviation_id, feltyp, halka, sedan, detalj)
    SELECT o.deviation_id, x.feltyp, halka, x.sedan, x.detalj
    FROM (VALUES
      (k_fel, coalesce(k_detalj->>'timme', k_detalj->'stad'->>'timme')::timestamptz,
       jsonb_build_object('orsak', k_orsak, 'punkt', k_detalj->>'punkt', 'stadspunkt', k_detalj->'stad'->>'punkt',
                          'korning', coalesce(k_detalj->>'korning', k_detalj->'stad'->>'korning'))),
      (a2_fel, a2_sedan, jsonb_build_object('stationer', a2_st)),
      (app_fel, pub, coalesce(app_detalj, '{}'::jsonb))
    ) AS x(feltyp, sedan, detalj)
    WHERE x.feltyp IS NOT NULL
    ON CONFLICT (deviation_id, feltyp) DO NOTHING;
    GET DIAGNOSTICS r = ROW_COUNT;
    n := n + r;
  END LOOP;
  RETURN n;
END $$;

-- 2. Efterkontrollen efter sex timmar: sql/085 ord för ord, utom urvalet (märkt #842).
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
    WHERE f.kontrollerad_at IS NULL AND f.start_time <= now() - interval '6 hours'
      AND NOT EXISTS (SELECT 1 FROM situation_archive s WHERE s.deviation_id = f.deviation_id                   -- #842: lämnat flödet
                        AND s.last_seen > (SELECT max(a.last_seen) FROM situation_archive a) - interval '1 hour')
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

-- Låst dubbelt (CLAUDE.md, DECISIONS #653): RLS utan policy; bara service-rollen får tabellen och funktionen.
ALTER TABLE olycksfacit_driftlarm ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE olycksfacit_driftlarm FROM PUBLIC;
REVOKE ALL ON FUNCTION olycksfacit_driftlarm() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE olycksfacit_driftlarm FROM anon;
    REVOKE ALL ON FUNCTION olycksfacit_driftlarm() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE olycksfacit_driftlarm FROM authenticated;
    REVOKE ALL ON FUNCTION olycksfacit_driftlarm() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE olycksfacit_driftlarm TO service_role;
    GRANT EXECUTE ON FUNCTION olycksfacit_driftlarm() TO service_role;
  END IF;
END $$;

-- Jobbet: fem minuter efter fångsten (halkvakt-olycksfacit, */15), bara SQL, ingen funktion och ingen nyckel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-olycksfacit-drift';
    PERFORM cron.schedule('halkvakt-olycksfacit-drift', '5-59/15 * * * *', 'SELECT olycksfacit_driftlarm()');
  END IF;
END $$;
