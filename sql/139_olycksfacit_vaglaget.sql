-- 139: OLYCKSFACIT, KLASSEN TROLIG, VÄGLAGET (TROSKLAR-OLYCKSFACIT §4 regel 3b och §13; förslaget för de oklara signerat 21/11 av
-- Bengt för båda: "Vi signerar 1770 också", DECISIONS #942).
--
-- 1. Efterkontrollen är sql/110:s ord för ord, utom de rader som är märkta #942 (integrationsprovet #942 prövar det). En olycka som
--    annars blir OKLAR blir TROLIG, väglaget när Trafikverket satte halka på A1:s sträcka inom sex timmar efter starten (halka_efter)
--    och ytan är högst +1 °C eller okänd. I tabellen står den som klass TROLIG med ett skäl som börjar med "väglaget efteråt", så att
--    den räknas som halkkopplad överallt där TROLIG räknas (olycksfacit/arende.ts vaglaget() håller isär den). Vilt, TYDLIG och TROLIG
--    kommer före, och ytgränsen +1 °C gör att regeln aldrig tar en olycka som regel 4 (yta över +3) skulle ge.
-- 2. Säsongen räknas om på de mått som sparades vid kontrollen, som sql/137: bara OKLAR med halka_efter och ytan högst +1 °C eller
--    okänd rörs, och bara till den nya klassen. Filen kan köras igen utan att ändra något mer. TILLBAKA: sql/110:s funktion igen, och
--    klassen OKLAR med skälet ur yta_min för raderna vars skäl börjar med "väglaget efteråt".
-- Fast sökväg i definitionen (DECISIONS #784).

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

    -- Väglaget efteråt på A1:s sträcka: satte Trafikverket halka under de sex timmarna efter starten? Klassar i regel 3b.   -- #942
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
      WHEN he AND (y IS NULL OR y <= 1) THEN 'TROLIG, väglaget'   -- #942 regel 3b
      WHEN y > 3 THEN 'INTE'
      ELSE 'OKLAR' END;
    sk := CASE kl
      WHEN 'TYDLIG' THEN 'halkord i texten och yta ≤ +1 °C'
      WHEN 'TROLIG' THEN CASE WHEN ar = 'flera fordon' THEN 'kollision' ELSE 'singelolycka' END || ', yta ≤ 0 °C och ' || CASE WHEN fu THEN 'fukt' ELSE 'rimfrost' END   -- #852 D2
      WHEN 'TROLIG, väglaget' THEN 'väglaget efteråt, ' || CASE WHEN y IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'yta ≤ +1 °C' END   -- #942
      WHEN 'INTE' THEN CASE WHEN y > 3 AND alla !~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)'
                            THEN 'yta över +3 °C' ELSE 'vilt' END
      ELSE CASE WHEN y IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'övrigt i kallt väder' END END;

    UPDATE olycksfacit SET kontrollerad_at = now(), text_efter = txt, halka_efter = he, yta_station = st_id, yta_km = st_km,
           yta_min = y, dagg_min = d, fukt_efter = fu, rimfrost_efter = rf, klass = split_part(kl, ',', 1), klass_skal = sk, art = ar   -- #852 #942
    WHERE deviation_id = o.deviation_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

UPDATE olycksfacit SET
  klass = 'TROLIG',
  klass_skal = 'väglaget efteråt, ' || CASE WHEN yta_min IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'yta ≤ +1 °C' END
WHERE klass = 'OKLAR' AND kontrollerad_at IS NOT NULL AND halka_efter AND (yta_min IS NULL OR yta_min <= 1);
