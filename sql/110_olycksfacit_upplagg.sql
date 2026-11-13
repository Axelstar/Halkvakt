-- 110: OLYCKSFACIT, DET NYA UPPLÄGGET (Bengt 13/11: "bygg allt"; DECISIONS #852; TROSKLAR-OLYCKSFACIT §11). Förslaget står i
-- Desktop/Olycksfacit_nytt_upplagg_FORSLAG_2026-11-13.md, mätt på veckan 6–12/11. Fyra delar här; A, B och E bor i funktionen
-- olycksfacit (supabase/functions/olycksfacit/arende.ts):
--
-- 1. OLYCKSARTEN (D3). olycksart(text) läser olycksarten ur texten med en ordlista, och den första träffen gäller: vilt (klassningens
--    regel 1, tecken för tecken), oskyddad, ordet singel, flera fordon, ett fordon (förloppet: diket, voltat, tvärs …), ett fordon
--    svag (bara ett fordon nämns) och annars okänd. Ett ord räknas från sin början, inte inuti ett annat (§4). Ett enda CASE-uttryck
--    utan SET, så att funktionen inlinas (CLAUDE.md, #783 och #784). Kolumnen olycksfacit.art bär arten.
-- 2. EFTERKONTROLLEN (D1, D2, D3). olycksfacit_efterkontroll() är sql/108 ord för ord utom tre ställen, märkta #852:
--    D1  stationens fönster är två timmar före till starten, inte till två timmar efter: halka efter starten orsakade inte olyckan;
--    D3  TROLIG kräver arten ett fordon i stället för ordet singel, så att en personbil i diket räknas fast ordet saknas;
--    D2  arten flera fordon med samma yta och fukt blir också TROLIG, med skälet "kollision, …". Funktionen ger den ingen åtgärdsrad.
--    Urvalet (sex timmar och flödet, #842), vakterna, halka_efter och klassernas ordning är oförändrade.
-- 3. SMÅVÄGSRÖSTENS LAGER (C). olycksfacit_smavag() skriver lagret smavag för varje olycka som fångats de senaste sex timmarna
--    (smavag_live gallras efter sex timmar, sql/105), en gång: närmaste småvägspunkt inom 0,5 km, och vad småvägsrösten hade sagt vid
--    starten, med smavag_regel():s regel räknad vid starten och inte nu:
--      timmen   den senaste i smavag_korning som var skriven före starten, högst två timmar gammal och med minst 95 % av punkterna;
--      utfallet 'varnar' (D säger fryser, med den strängare N3 eller radarn i punktens bit de 60 minuterna före starten), 'torr'
--               (fryser, men ingen fukt), 'fryser inte' (punkten har ingen rad i timmen), 'gallrad' (timmen har inga rader alls och
--               är äldre än gallringen), 'ingen timme', eller 'ingen småvägspunkt' (ingen punkt inom 0,5 km).
--    talar är sant bara när brytaren för punktens grupp är på och utfallet är varnar: då varnade appen, och olyckan blir VARNADE.
--    Med brytarna av (sql/107) talar lagret aldrig, och utfallet rörs inte. Det är skuggans facit. Inga tal ur kuvösen sparas:
--    bara punkten, avståndet, timmen och brytaren. Jobbet halkvakt-olycksfacit-smavag går två minuter efter fångsten.
-- 4. Dagens ärenden får kolumnen veckolasning (B): ett dygn vars ärende skrevs med det nya upplägget lämnar sina rader utan
--    förifylld åtgärd till veckans ärende.
-- Ingenting raderas, och redan klassade olyckor rörs inte (regel L1–L2: bara olyckor som inte är kontrollerade när filen migreras).
-- Idempotent; pg_cron bara där tillägget finns, och i CI:s PostGIS schemaläggs inget. TILLBAKA: kör sql/108 igen (efterkontrollen),
-- cron.unschedule('halkvakt-olycksfacit-smavag'); kolumnerna och lagret kan stå.

ALTER TABLE olycksfacit ADD COLUMN IF NOT EXISTS art text
  CHECK (art IN ('vilt', 'oskyddad', 'ett fordon', 'flera fordon', 'ett fordon, svag', 'okänd'));   -- olycksarten (D3), vid kontrollen
ALTER TABLE olycksfacit_arenden ADD COLUMN IF NOT EXISTS veckolasning boolean NOT NULL DEFAULT false;  -- raderna läses i veckans (B)
ALTER TABLE olycksfacit_lager DROP CONSTRAINT IF EXISTS olycksfacit_lager_lager_check;
ALTER TABLE olycksfacit_lager ADD CONSTRAINT olycksfacit_lager_lager_check
  CHECK (lager IN ('A1', 'K', 'A2', 'radar', 'tackning', 'smavag'));

-- 1. Olycksarten (D3). Ordningen är förslagets: vilt, oskyddad, singel, flera fordon, ett fordon, ett fordon svag, okänd.
CREATE OR REPLACE FUNCTION olycksart(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN t ~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)' THEN 'vilt'
    WHEN t ~* '(^|[^a-zåäö])(fotgängar|cykel|cykl|moped|motorcykel|mc([^a-zåäö]|$))' THEN 'oskyddad'
    WHEN t ~* '(^|[^a-zåäö])singel' THEN 'ett fordon'
    WHEN t ~* '(^|[^a-zåäö])(flera fordon|fler fordon|två fordon|tre fordon|kollision|kollider|krock|personbilar|lastbilar|bilar|mötande|frontal|upphinnande|bakifrån|mellan (en |ett |två )?(pe?r?sonbil|lastbil|buss|bil)|(pe?r?sonbil|lastbil|buss|bil) och (en |ett )?(pe?r?sonbil|lastbil|buss|bil)|påkörd av (en |ett )?(pe?r?sonbil|lastbil|buss|bil))' THEN 'flera fordon'
    WHEN t ~* '(^|[^a-zåäö])((väg)?dike|kört av|körde av|åkt av|åkte av|volt|vält|på taket|tvärs|refug|(väg|mitt)?räcke|stolpe|träd|bergvägg|omkull|i skogen|ställt[a-zåäö]* sig)' THEN 'ett fordon'
    WHEN t ~* '(^|[^a-zåäö])(pe?r?sonbil|lastbil|buss|skåpbil|traktor|fordon|bil([^a-zåäö]|$)|bilen([^a-zåäö]|$))' THEN 'ett fordon, svag'
    ELSE 'okänd' END
$$;
COMMENT ON FUNCTION olycksart(text) IS 'Olycksarten ur Trafikverkets text (sql/110, D3, DECISIONS #852, TROSKLAR-OLYCKSFACIT §11): vilt, oskyddad, ett fordon, flera fordon, ett fordon, svag, eller okänd. Första träffen gäller.';

-- 2. Efterkontrollen: sql/108 ord för ord, utom fönstret (D1), TROLIG (D3, D2) och arten (märkt #852).
-- Efterkontrollen och klassningen (tröskeldokumentet §3–§4). Ordningen i CASE är tröskeldokumentets: vilt, TYDLIG, TROLIG,
-- yta över +3, annars OKLAR. Utan vaktad station inom 15 km blir ytan okänd, och då kan bara viltet och OKLAR ges.
CREATE OR REPLACE FUNCTION olycksfacit_efterkontroll() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; n int := 0; seg text; txt text; alla text;
  st_id text; st_km real; y real; d real; fu boolean; rf boolean; he boolean; kl text; sk text;
  ar text;   -- #852 D3: olycksarten
BEGIN
  FOR o IN
    SELECT f.deviation_id, f.start_time AS t, f.message, f.geom FROM olycksfacit f
    WHERE f.kontrollerad_at IS NULL AND f.start_time <= now() - interval '6 hours'
      AND NOT EXISTS (SELECT 1 FROM situation_archive s WHERE s.deviation_id = f.deviation_id                   -- #842: lämnat flödet
                        AND s.last_seen > (SELECT max(a.last_seen) FROM situation_archive a) - interval '1 hour')
    ORDER BY f.start_time, f.deviation_id
  LOOP
    seg := NULL; txt := NULL; st_id := NULL; st_km := NULL; y := NULL; d := NULL; fu := NULL; rf := NULL; he := NULL;
    ar := NULL;   -- #852

    SELECT s.message INTO txt FROM situation_archive s WHERE s.deviation_id = o.deviation_id;
    alla := coalesce(o.message, '') || ' | ' || coalesce(txt, '');
    ar := olycksart(alla);   -- #852 D3: arten ur texten vid fångsten och texten efteråt

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

    -- Vägytan: den närmaste vaktade stationen inom 15 km med yta två timmar före till starten (#852 D1: förut till två timmar efter).
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
      WHERE w.sample_time BETWEEN o.t - interval '2 hours' AND o.t AND w.surface_temp_c IS NOT NULL   -- #852 D1
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
      WHEN ar IN ('ett fordon', 'flera fordon') AND y <= 0 AND (fu OR rf) THEN 'TROLIG'   -- #852 D3 och D2
      WHEN y > 3 THEN 'INTE'
      ELSE 'OKLAR' END;
    sk := CASE kl
      WHEN 'TYDLIG' THEN 'halkord i texten och yta ≤ +1 °C'
      WHEN 'TROLIG' THEN CASE WHEN ar = 'flera fordon' THEN 'kollision' ELSE 'singelolycka' END || ', yta ≤ 0 °C och ' || CASE WHEN fu THEN 'fukt' ELSE 'rimfrost' END   -- #852 D2
      WHEN 'INTE' THEN CASE WHEN y > 3 AND alla !~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)'
                            THEN 'yta över +3 °C' ELSE 'vilt' END
      ELSE CASE WHEN y IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'övrigt i kallt väder' END END;

    UPDATE olycksfacit SET kontrollerad_at = now(), text_efter = txt, halka_efter = he, yta_station = st_id, yta_km = st_km,
           yta_min = y, dagg_min = d, fukt_efter = fu, rimfrost_efter = rf, klass = kl, klass_skal = sk, art = ar   -- #852
    WHERE deviation_id = o.deviation_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- 3. Småvägsröstens lager (C), en gång per olycka, med regeln räknad vid starten.
CREATE OR REPLACE FUNCTION olycksfacit_smavag() RETURNS int
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  o record; n int := 0; p_punkt text; p_grupp text; p_vag text; p_ordning int; p_km real;
  s_tid timestamptz; s_ned boolean; s_ut text; s_pa boolean; s_talar boolean;
BEGIN
  FOR o IN
    SELECT f.deviation_id, f.start_time AS t, f.geom, f.utfall FROM olycksfacit f
    WHERE f.fangad_at > now() - interval '6 hours'                             -- smavag_live gallras efter sex timmar (sql/105)
      AND NOT EXISTS (SELECT 1 FROM olycksfacit_lager l WHERE l.deviation_id = f.deviation_id AND l.lager = 'smavag')
    ORDER BY f.start_time, f.deviation_id
  LOOP
    p_punkt := NULL; p_grupp := NULL; p_vag := NULL; p_ordning := NULL; p_km := NULL;
    s_tid := NULL; s_ned := NULL; s_ut := NULL; s_pa := NULL;

    -- Närmaste småvägspunkt inom 0,5 km. Rutan i grader väljer med indexet; 0,02° är minst 0,7 km öster–väster vid 70° N.
    SELECT s.punkt, s.grupp, s.vag, s.ordning, (ST_Distance(s.geom::geography, o.geom::geography) / 1000)::real
      INTO p_punkt, p_grupp, p_vag, p_ordning, p_km
    FROM smavagspunkt s
    WHERE s.geom && ST_Expand(o.geom, 0.02) AND ST_DWithin(s.geom::geography, o.geom::geography, 500)       -- SMAVAG_M
    ORDER BY ST_Distance(s.geom::geography, o.geom::geography), s.punkt LIMIT 1;

    IF p_punkt IS NULL THEN
      s_ut := 'ingen småvägspunkt';
    ELSE
      SELECT b.pa INTO s_pa FROM smavagsbrytare b WHERE b.grupp = p_grupp;
      -- Timmen som rösten hade talat med vid starten: smavag_timme() (sql/105) räknad vid starten, alltså bara timmar som var skrivna då.
      SELECT k.tid INTO s_tid FROM smavag_korning k
      WHERE k.tid = (SELECT max(x.tid) FROM smavag_korning x WHERE x.tid <= o.t AND x.skriven_at <= o.t)
        AND k.tid > o.t - interval '2 hours'                                                          -- FARSK_TIMMAR
        AND k.punkter >= 0.95 * (SELECT count(*) FROM smavagspunkt)                                      -- FULLSTANDIG_ANDEL
      ;
      IF s_tid IS NULL THEN
        s_ut := 'ingen timme';
      ELSE
        SELECT l.ned INTO s_ned FROM smavag_live l WHERE l.tid = s_tid AND l.punkt = p_punkt;
        IF s_ned IS NULL THEN
          -- Ingen rad för punkten: D säger att den inte fryser. Har timmen inga rader alls och är äldre än gallringen går det inte att avgöra.
          s_ut := CASE WHEN s_tid <= now() - interval '6 hours' AND NOT EXISTS (SELECT 1 FROM smavag_live g WHERE g.tid = s_tid)
                       THEN 'gallrad' ELSE 'fryser inte' END;
        ELSE
          SELECT CASE WHEN NOT (s_ned OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr' ELSE 'varnar' END INTO s_ut           -- RADAR_MMH
          FROM (SELECT max(r.rate_mean_mmh) AS mmh FROM radar_smavag r
                WHERE r.bit = p_vag || '-' || (p_ordning / 5)                                                     -- SMAVAG_BIT
                  AND r.observed_at > o.t - interval '60 minutes' AND r.observed_at <= o.t) r;                      -- RADAR_FONSTER_MIN
        END IF;
      END IF;
    END IF;

    s_talar := coalesce(s_pa, false) AND s_ut = 'varnar';
    INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj)
    VALUES (o.deviation_id, 'smavag', s_talar, s_ut,
            jsonb_build_object('punkt', p_punkt, 'km', round(p_km::numeric, 2), 'timme', s_tid, 'brytaren', s_pa))
    ON CONFLICT (deviation_id, lager) DO NOTHING;
    -- Med brytaren på talade rösten: då varnade appen (TROSKLAR-OLYCKSFACIT §9.1), och tystnadens orsaker gäller inte.
    IF s_talar AND o.utfall <> 'VARNADE' THEN
      UPDATE olycksfacit SET utfall = 'VARNADE', orsaker = '{}' WHERE deviation_id = o.deviation_id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Låst dubbelt (CLAUDE.md, DECISIONS #653): bara service-rollen får funktionerna.
REVOKE ALL ON FUNCTION olycksart(text), olycksfacit_smavag() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION olycksart(text), olycksfacit_smavag() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION olycksart(text), olycksfacit_smavag() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION olycksart(text), olycksfacit_smavag() TO service_role;
  END IF;
END $$;

-- Jobbet: två minuter efter fångsten (halkvakt-olycksfacit, */15), bara SQL, ingen funktion och ingen nyckel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-olycksfacit-smavag';
    PERFORM cron.schedule('halkvakt-olycksfacit-smavag', '2-59/15 * * * *', 'SELECT olycksfacit_smavag()');
  END IF;
END $$;
