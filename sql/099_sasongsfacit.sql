-- 099: SÄSONGSFACIT, FÖRSTA DELEN (docs/TROSKLAR-SASONGSFACIT.md, fastställt 7/11 av Bengt och Axel; DECISIONS #818; kort #381).
-- En redovisning, ingen grind: ingenting här ändrar vad som talar.
--
-- VAD SOM RÄKNAS. Varje svenskt dygn, per län och tid på dygnet, för prognosen K och jämförelserna J1 och J2:
--   * sasongsfacit_dag: sträcktimmarna i populationen (K:s räknade timmar, ny_kandidat_skugga_korning), de varnande, träffarna (F1
--     inom en timme före till två timmar efter varningen, val 1), F1-timmarna och de täckta (varningen inom två timmar före F1 eller
--     samma timme).
--   * sasongsfacit_ledtid: varje början på F1 (sträckan blir hal), och hur långt före K varnade: samma timme, 1–3 h, 4–6 h eller ingen.
--   * sasongsfacit_olyckor: F4, olyckorna klassade TYDLIG eller TROLIG (olycksfacit, utan dubbletter), och hur många K varnade vid.
-- F1 är Trafikverkets väglag på sträckan vid timmens slut, med motorns regel för en hal sträcka (A1: kod ≥ 2, ett halkord eller en
-- halkstam; samma ord som olycksfacit och motorn, vaktade av kontraktsgrinden). En raderad rad i historiken betyder att väglaget
-- upphört och är inte hal.
-- J1 är bilens snöflinga: luften under +3 °C vid sträckans närmaste station den timmen. J2 är luften ≤ +1 °C och radarn ≥ 0,1 mm/h
-- på sträckan. F2 (stationens yta) ingår inte (val 2). F3, A1:s och A2:s leverans och falsklarmen per 100 km är nästa del.
--
-- NÄR. pg_cron räknar gårdagen varje dygn 12.23 UTC. Stationernas rader gallras efter tre dygn (sql/044), så J1 räknas inom dem;
-- F1 behöver två timmar in i nästa dygn. sasongsfacit_rakna(dag) är idempotent: dygnets rader skrivs om. Räkningen i efterhand från
-- 1/11 görs med samma funktion; för dygn utan stationsrader blir J1 och J2 noll, och raderna bär jamforelser = false.
--
-- KOSTNADEN. En sats per dygn, inga funktioner per rad (lärdomen från 3/11, #783). Kärnan prövad som läsning i full skala i
-- produktionen 7/11, på dygnet 6/11: 26 176 rutor (818 sträckor × 32 timmar) på 4,1 s (EXPLAIN ANALYZE).
-- Omkring 400 rader per dygn, under 10 MB för vintern. RLS på; inga rättigheter för anon och authenticated.
--
-- A1:S FÖRDRÖJNING FRAMÅT. road_condition_history får ingested_at: när raden kom in hos oss. Befintliga rader får NULL (ingen
-- default bakåt, och ingen omskrivning av tabellen); nya rader får now() ur ingesten, som skriver en kolumnlista (ingest/db.ts).

ALTER TABLE road_condition_history ADD COLUMN IF NOT EXISTS ingested_at timestamptz;
ALTER TABLE road_condition_history ALTER COLUMN ingested_at SET DEFAULT now();

CREATE TABLE IF NOT EXISTS sasongsfacit_dag (
  dag         date NOT NULL,                 -- svenskt dygn
  lan         int NOT NULL,                  -- Trafikverkets länsnummer (road_conditions.county_nos[1]); 0 = okänt
  dygnsdel    text NOT NULL CHECK (dygnsdel IN ('natt', 'morgonrusning', 'dag', 'kvällsrusning', 'kväll')),
  metod       text NOT NULL CHECK (metod IN ('K', 'J1', 'J2')),
  timmar      int NOT NULL,                  -- sträcktimmar i populationen
  varnar      int NOT NULL,                  -- där metoden varnade
  traff       int NOT NULL,                  -- varnande med F1 inom −1..+2 h
  f1          int NOT NULL,                  -- sträcktimmar med F1
  tackt       int NOT NULL,                  -- F1-timmar där metoden varnade inom −2..0 h
  jamforelser boolean NOT NULL,              -- false: stationsraderna var gallrade, J1 och J2 går inte att räkna
  skriven_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, lan, dygnsdel, metod)
);

CREATE TABLE IF NOT EXISTS sasongsfacit_ledtid (
  dag        date NOT NULL,
  lan        int NOT NULL,
  dygnsdel   text NOT NULL,
  band       text NOT NULL CHECK (band IN ('samma timme', '1–3 h', '4–6 h', 'ingen')),
  n          int NOT NULL,
  skriven_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, lan, dygnsdel, band)
);

CREATE TABLE IF NOT EXISTS sasongsfacit_olyckor (
  dag        date NOT NULL,
  lan        int NOT NULL,
  dygnsdel   text NOT NULL,
  olyckor    int NOT NULL,                   -- TYDLIG eller TROLIG, utan dubbletter
  k_varnade  int NOT NULL,
  skriven_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, lan, dygnsdel)
);

CREATE OR REPLACE FUNCTION sasongsfacit_rakna(p_dag date) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  fran timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  till timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
  jamf boolean;
  n_dag int; n_led int; n_oly int;
BEGIN
  -- Finns stationsraderna för dygnet? Annars räknas J1 och J2 inte (de blir noll och märks).
  SELECT EXISTS (SELECT 1 FROM weather_observations w WHERE w.sample_time >= fran AND w.sample_time < fran + interval '1 hour') INTO jamf;

  DELETE FROM sasongsfacit_dag WHERE dag = p_dag;
  DELETE FROM sasongsfacit_ledtid WHERE dag = p_dag;
  DELETE FROM sasongsfacit_olyckor WHERE dag = p_dag;

  CREATE TEMP TABLE sf_rut ON COMMIT DROP AS
  WITH timmar AS (
    SELECT DISTINCT k.observed_at AS h FROM ny_kandidat_skugga_korning k
    WHERE k.status IN ('räknad', 'redan räknad') AND k.observed_at >= fran AND k.observed_at < till
  ),
  alla_h AS (
    SELECT generate_series(fran - interval '6 hours', till + interval '1 hour', interval '1 hour') AS h
  ),
  seg AS (
    SELECT s.segment_id, coalesce(r.county_nos[1], 0) AS lan, r.geom
    FROM (SELECT DISTINCT v.segment_id FROM vagpunkt v) s LEFT JOIN road_conditions r ON r.segment_id = s.segment_id
  ),
  stn AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom FROM weather_observations w
    WHERE w.sample_time >= fran - interval '6 hours' AND w.sample_time < till ORDER BY w.station_id, w.sample_time DESC
  ),
  narmast AS (
    SELECT g.segment_id, (SELECT t.station_id FROM stn t ORDER BY t.geom <-> g.geom LIMIT 1) AS station_id
    FROM seg g WHERE g.geom IS NOT NULL
  ),
  luft AS (
    SELECT w.station_id, date_trunc('hour', w.sample_time) AS h, avg(w.air_temp_c) AS luft FROM weather_observations w
    WHERE w.sample_time >= fran - interval '6 hours' AND w.sample_time < till + interval '2 hours' AND w.air_temp_c IS NOT NULL
    GROUP BY 1, 2
  ),
  radar AS (
    SELECT r.segment_id, date_trunc('hour', r.observed_at) AS h, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at >= fran - interval '6 hours' AND r.observed_at < till + interval '2 hours'
    GROUP BY 1, 2
  ),
  kand AS (
    SELECT k.segment_id, k.observed_at AS h, k.varnar > 0 AS k FROM ny_kandidat_skugga k
    WHERE k.observed_at >= fran - interval '6 hours' AND k.observed_at < till + interval '2 hours'
  ),
  rut AS (
    SELECT g.segment_id, g.lan, a.h,
           coalesce(kd.k, false) AS k,
           coalesce(l.luft < 3, false) AS j1,
           coalesce(l.luft <= 1 AND rd.mmh >= 0.1, false) AS j2,
           coalesce(NOT x.deleted AND (x.condition_code >= 2 OR EXISTS (
             SELECT 1 FROM unnest(x.condition_info) i
             WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')), false) AS f1
    FROM seg g CROSS JOIN alla_h a
    LEFT JOIN LATERAL (SELECT h.condition_code, h.condition_info, h.deleted FROM road_condition_history h
                       WHERE h.segment_id = g.segment_id AND h.modified_time < a.h + interval '1 hour'
                       ORDER BY h.modified_time DESC LIMIT 1) x ON true
    LEFT JOIN kand kd ON kd.segment_id = g.segment_id AND kd.h = a.h
    LEFT JOIN narmast n ON n.segment_id = g.segment_id
    LEFT JOIN luft l ON l.station_id = n.station_id AND l.h = a.h
    LEFT JOIN radar rd ON rd.segment_id = g.segment_id AND rd.h = a.h
  )
  -- Tid på dygnet i svensk tid (TROSKLAR-SASONGSFACIT §5), en gång per ruta; ingen funktion per rad (#783).
  SELECT r.*, (r.h IN (SELECT h FROM timmar)) AS i_pop,
         CASE WHEN extract(hour FROM r.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 6 AND 9 THEN 'morgonrusning'
              WHEN extract(hour FROM r.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 10 AND 15 THEN 'dag'
              WHEN extract(hour FROM r.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 16 AND 18 THEN 'kvällsrusning'
              WHEN extract(hour FROM r.h AT TIME ZONE 'Europe/Stockholm') BETWEEN 19 AND 21 THEN 'kväll'
              ELSE 'natt' END AS dygnsdel,
         bool_or(r.f1) OVER w_traff AS f1_fonster,
         bool_or(r.k) OVER w_fore AS k_fore, bool_or(r.j1) OVER w_fore AS j1_fore, bool_or(r.j2) OVER w_fore AS j2_fore,
         lag(r.f1) OVER (PARTITION BY r.segment_id ORDER BY r.h) AS f1_forra
  FROM rut r
  WINDOW w_traff AS (PARTITION BY r.segment_id ORDER BY r.h ROWS BETWEEN 1 PRECEDING AND 2 FOLLOWING),
         w_fore AS (PARTITION BY r.segment_id ORDER BY r.h ROWS BETWEEN 2 PRECEDING AND CURRENT ROW);
  CREATE INDEX ON sf_rut (segment_id, h);

  INSERT INTO sasongsfacit_dag (dag, lan, dygnsdel, metod, timmar, varnar, traff, f1, tackt, jamforelser)
  SELECT p_dag, r.lan, r.dygnsdel, m.metod, count(*),
         count(*) FILTER (WHERE m.v), count(*) FILTER (WHERE m.v AND r.f1_fonster),
         count(*) FILTER (WHERE r.f1), count(*) FILTER (WHERE r.f1 AND m.fore), jamf OR m.metod = 'K'
  FROM sf_rut r
  CROSS JOIN LATERAL (VALUES ('K', r.k, r.k_fore), ('J1', r.j1, r.j1_fore), ('J2', r.j2, r.j2_fore)) m(metod, v, fore)
  WHERE r.i_pop AND r.h >= fran AND r.h < till
  GROUP BY 1, 2, 3, 4;
  GET DIAGNOSTICS n_dag = ROW_COUNT;

  -- Ledtiden: varje början på F1 i populationen, och K:s tidigaste varning på sträckan inom sex timmar före.
  INSERT INTO sasongsfacit_ledtid (dag, lan, dygnsdel, band, n)
  SELECT p_dag, b.lan, b.dygnsdel,
         CASE WHEN f.forst IS NULL THEN 'ingen'
              WHEN f.forst = b.h THEN 'samma timme'
              WHEN b.h - f.forst <= interval '3 hours' THEN '1–3 h'
              ELSE '4–6 h' END, count(*)
  FROM sf_rut b
  LEFT JOIN LATERAL (SELECT min(r.h) AS forst FROM sf_rut r
                     WHERE r.segment_id = b.segment_id AND r.k AND r.h BETWEEN b.h - interval '6 hours' AND b.h) f ON true
  WHERE b.i_pop AND b.h >= fran AND b.h < till AND b.f1 AND NOT coalesce(b.f1_forra, false)
  GROUP BY 1, 2, 3, 4;
  GET DIAGNOSTICS n_led = ROW_COUNT;

  -- F4: olyckorna (olycksfacit), klassade TYDLIG eller TROLIG, utan dubbletter; länet ur närmaste väglagssträcka.
  INSERT INTO sasongsfacit_olyckor (dag, lan, dygnsdel, olyckor, k_varnade)
  SELECT p_dag, coalesce(s.lan, 0),
         CASE WHEN extract(hour FROM o.start_time AT TIME ZONE 'Europe/Stockholm') BETWEEN 6 AND 9 THEN 'morgonrusning'
              WHEN extract(hour FROM o.start_time AT TIME ZONE 'Europe/Stockholm') BETWEEN 10 AND 15 THEN 'dag'
              WHEN extract(hour FROM o.start_time AT TIME ZONE 'Europe/Stockholm') BETWEEN 16 AND 18 THEN 'kvällsrusning'
              WHEN extract(hour FROM o.start_time AT TIME ZONE 'Europe/Stockholm') BETWEEN 19 AND 21 THEN 'kväll'
              ELSE 'natt' END,
         count(*), count(*) FILTER (WHERE l.talar)
  FROM olycksfacit o
  JOIN olycksfacit_lager l ON l.deviation_id = o.deviation_id AND l.lager = 'K'
  LEFT JOIN LATERAL (SELECT coalesce(r.county_nos[1], 0) AS lan FROM road_conditions r WHERE r.geom IS NOT NULL
                     ORDER BY r.geom <-> o.geom LIMIT 1) s ON true
  WHERE o.start_time >= fran AND o.start_time < till AND o.klass IN ('TYDLIG', 'TROLIG') AND o.dubblett_av IS NULL
  GROUP BY 1, 2, 3;
  GET DIAGNOSTICS n_oly = ROW_COUNT;

  DROP TABLE IF EXISTS sf_rut;
  RETURN format('klart: %s rader, %s ledtidsrader, %s olycksrader%s', n_dag, n_led, n_oly,
                CASE WHEN jamf THEN '' ELSE '; utan stationsrader' END);
END $$;

ALTER TABLE sasongsfacit_dag ENABLE ROW LEVEL SECURITY;
ALTER TABLE sasongsfacit_ledtid ENABLE ROW LEVEL SECURITY;
ALTER TABLE sasongsfacit_olyckor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE sasongsfacit_dag, sasongsfacit_ledtid, sasongsfacit_olyckor FROM PUBLIC;
REVOKE ALL ON FUNCTION sasongsfacit_rakna(date) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE sasongsfacit_dag, sasongsfacit_ledtid, sasongsfacit_olyckor FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE sasongsfacit_dag, sasongsfacit_ledtid, sasongsfacit_olyckor FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE sasongsfacit_dag TO service_role;
    GRANT ALL ON TABLE sasongsfacit_ledtid TO service_role;
    GRANT ALL ON TABLE sasongsfacit_olyckor TO service_role;
    GRANT EXECUTE ON FUNCTION sasongsfacit_rakna(date) TO service_role;
  END IF;
END $$;

-- Varje dygn 12.23 UTC: gårdagen i svensk tid. Schemaläggs, och räknas i efterhand från 1/11, bara där pg_cron finns (inte i CI:s
-- PostGIS). Räkningen i efterhand är en sats per dygn, omkring fyra sekunder vardera (prövad 7/11 på dygnet 6/11 i produktionen).
DO $$
DECLARE d date;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-sasongsfacit') THEN
      PERFORM cron.schedule('halkvakt-sasongsfacit', '23 12 * * *',
        $c$SELECT sasongsfacit_rakna(((now() AT TIME ZONE 'Europe/Stockholm')::date - 1))$c$);
    END IF;
    FOR d IN SELECT generate_series(DATE '2026-11-01', (now() AT TIME ZONE 'Europe/Stockholm')::date - 1, interval '1 day')::date LOOP
      PERFORM sasongsfacit_rakna(d);
    END LOOP;
  END IF;
END $$;
