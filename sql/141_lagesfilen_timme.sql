-- 141: LÄGESFILENS HISTORIA FRAMÅT, FÖR A1:S TÄCKNING OCH A2:S LEVERANS (TROSKLAR-SASONGSFACIT §2; körlistan C2; Bengt 23/11: "Ja till
-- båda", DECISIONS #955). En redovisning, ingen grind: ingenting här ändrar vad som talar.
--
-- VAD SOM SPARAS. publicera bygger lägesfilen varannan minut och sparar inget om den. Nu lägger varje körning in, per UTC-timme, vilka
-- hala sträckor filen bar (A1, `segments`) och vilka stationer den bar med yta högst +1 °C och fukt (A2, `weather`), som mängder:
-- en rad per timme, och körningarna i samma timme läggs ihop (lagesfil_spara). Bara id:n, inga tal ur mätningarna.
--   * lagesfil_timme: timmen, sträckorna, stationerna och körningarna. Gallras efter tio dygn, när dygnen är räknade.
--   * lagesfil_dag: varje svenskt dygn, de timmar filen byggdes, och
--       A1: sträcktimmarna med F1 (Trafikverkets väglag vid timmens slut, med säsongsfacits ord ur sql/099) och hur många av dem filen bar;
--       A2: stationstimmarna med uppmätt yta högst +1 °C och nederbörd (samma regel och samma radvakt som fuktskuggan, sql/138) och hur
--           många av dem filen bar med frysrisk. Skillnaden är vakternas tystnader och det publiceringen inte hann med.
--   Bara timmar då filen byggdes räknas; timmarna utan bygge står för sig.
--
-- NÄR. pg_cron räknar gårdagen 12.33 UTC, efter säsongsfacit (12.23). Stationernas rader gallras efter tre dygn (sql/044), så dygnet
-- räknas inom dem. lagesfil_rakna(dag) är idempotent. Ingen räkning i efterhand: historien börjar med deployen av publicera.
--
-- KOSTNADEN. En sats per del och dygn, ingen funktion per rad (#783). F1 läses för varje sträcka i road_conditions och i filen med två
-- uppslag i historikens nyckel: raden före dygnet och dygnets rader. Omkring 24 rader per dygn i lagesfil_timme, med några hundra id per rad, och en rad per dygn i
-- lagesfil_dag. RLS på; inga rättigheter för anon och authenticated.

CREATE TABLE IF NOT EXISTS lagesfil_timme (
  h          timestamptz PRIMARY KEY,           -- UTC-timmen
  seg        text[] NOT NULL DEFAULT '{}',     -- de hala sträckorna i filen (segment_id), någon gång i timmen
  wx         text[] NOT NULL DEFAULT '{}',     -- stationerna i filen med yta <= +1 °C och fukt (station_id), någon gång i timmen
  korningar  int NOT NULL DEFAULT 0 CHECK (korningar >= 0)
);

CREATE TABLE IF NOT EXISTS lagesfil_dag (
  dag            date PRIMARY KEY,               -- svenskt dygn
  timmar_bygge   int NOT NULL,                   -- timmar med minst ett bygge av filen
  timmar_utan    int NOT NULL,                   -- timmar utan bygge
  a1_f1          int NOT NULL,                   -- sträcktimmar med F1, i timmarna med bygge
  a1_i_filen     int NOT NULL,                   -- av dem: sträckan stod i filen
  a2_isrisk      int NOT NULL,                   -- stationstimmar med yta <= +1 °C och nederbörd, i timmarna med bygge
  a2_i_filen     int NOT NULL,                   -- av dem: stationen stod i filen med frysrisk
  skriven_at     timestamptz NOT NULL DEFAULT now()
);

-- publicera, en gång per körning: lägg körningens id:n till timmens mängder. Fail-soft i publicera; ett fel här stoppar inte filen.
CREATE OR REPLACE FUNCTION lagesfil_spara(p_h timestamptz, p_seg text[], p_wx text[]) RETURNS void
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  INSERT INTO lagesfil_timme AS t (h, seg, wx, korningar)
    VALUES (date_trunc('hour', p_h), coalesce(p_seg, '{}'), coalesce(p_wx, '{}'), 1)
  ON CONFLICT (h) DO UPDATE SET
    seg = ARRAY(SELECT DISTINCT x FROM unnest(t.seg || EXCLUDED.seg) x ORDER BY 1),
    wx = ARRAY(SELECT DISTINCT x FROM unnest(t.wx || EXCLUDED.wx) x ORDER BY 1),
    korningar = t.korningar + 1;
END $$;

CREATE OR REPLACE FUNCTION lagesfil_rakna(p_dag date) RETURNS text
LANGUAGE plpgsql SET search_path = public, extensions SET TimeZone = 'UTC' AS $$
DECLARE
  t0 timestamptz := p_dag::timestamp AT TIME ZONE 'Europe/Stockholm';
  t1 timestamptz := (p_dag + 1)::timestamp AT TIME ZONE 'Europe/Stockholm';
  v_bygge int; v_alla int; v_f1 int; v_f1_fil int; v_a2 int; v_a2_fil int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM weather_observations WHERE sample_time >= t0 AND sample_time < t0 + interval '1 hour') THEN
    RETURN 'saknas: stationsraderna för dygnet är gallrade';
  END IF;
  SELECT count(*) INTO v_alla FROM generate_series(t0, t1 - interval '1 hour', interval '1 hour') g;
  SELECT count(*) INTO v_bygge FROM lagesfil_timme WHERE h >= t0 AND h < t1 AND korningar > 0;

  -- A1. F1 vid varje bygd timmes slut. Per sträcka läses raden före dygnet och dygnets rader (två uppslag i nyckeln per sträcka),
  -- och varje rad gäller till nästa; en raderad rad betyder att väglaget upphört och är inte hal (som sql/099).
  WITH tim AS (SELECT h, seg FROM lagesfil_timme WHERE h >= t0 AND h < t1 AND korningar > 0),
  seg AS (SELECT segment_id FROM road_conditions UNION SELECT unnest(seg) FROM tim),
  rad AS (
    SELECT s.segment_id, x.fran, x.f1 FROM seg s CROSS JOIN LATERAL (
      (SELECT c.modified_time AS fran, coalesce(NOT c.deleted AND (c.condition_code >= 2 OR EXISTS (
             SELECT 1 FROM unnest(c.condition_info) i
             WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')), false) AS f1
       FROM road_condition_history c WHERE c.segment_id = s.segment_id AND c.modified_time < t0 ORDER BY c.modified_time DESC LIMIT 1)
      UNION ALL
      SELECT c.modified_time, coalesce(NOT c.deleted AND (c.condition_code >= 2 OR EXISTS (
             SELECT 1 FROM unnest(c.condition_info) i
             WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')), false)
      FROM road_condition_history c WHERE c.segment_id = s.segment_id AND c.modified_time >= t0 AND c.modified_time < t1) x
  ),
  iv AS (SELECT segment_id, fran, coalesce(lead(fran) OVER (PARTITION BY segment_id ORDER BY fran), 'infinity'::timestamptz) AS till, f1 FROM rad),
  rut AS (SELECT iv.segment_id, t.seg FROM iv JOIN tim t ON iv.f1 AND iv.fran < t.h + interval '1 hour' AND iv.till >= t.h + interval '1 hour')
  SELECT count(*), count(*) FILTER (WHERE segment_id = ANY (seg)) INTO v_f1, v_f1_fil FROM rut;

  -- A2. Stationstimmarna med uppmätt isrisk, med fuktskuggans regel och radvakt (sql/138), och om filen bar stationen med frysrisk.
  WITH tim AS (SELECT h, wx FROM lagesfil_timme WHERE h >= t0 AND h < t1 AND korningar > 0),
  st AS (
    SELECT station_id, date_trunc('hour', sample_time) AS h
    FROM weather_observations
    WHERE sample_time >= t0 AND sample_time < t1
      AND surface_temp_c BETWEEN -40 AND 60 AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)
    GROUP BY 1, 2
    HAVING min(surface_temp_c) <= 1
       AND bool_or(coalesce(rain, false) OR coalesce(snow, false) OR (precipitation IS NOT NULL AND lower(precipitation) NOT IN ('no', 'dry')))
  )
  SELECT count(*), count(*) FILTER (WHERE st.station_id = ANY (tim.wx)) INTO v_a2, v_a2_fil FROM st JOIN tim ON tim.h = st.h;

  DELETE FROM lagesfil_dag WHERE dag = p_dag;
  INSERT INTO lagesfil_dag (dag, timmar_bygge, timmar_utan, a1_f1, a1_i_filen, a2_isrisk, a2_i_filen)
    VALUES (p_dag, v_bygge, v_alla - v_bygge, v_f1, v_f1_fil, v_a2, v_a2_fil);
  DELETE FROM lagesfil_timme WHERE h < now() - interval '10 days';
  RETURN 'klart';
END $$;
COMMENT ON FUNCTION lagesfil_rakna(date) IS 'Lägesfilens leverans (sql/141, DECISIONS #955): A1:s täckning och A2:s andel i filen för ett svenskt dygn. En redovisning, aldrig en röst. Bara service-rollen.';

ALTER TABLE lagesfil_timme ENABLE ROW LEVEL SECURITY;
ALTER TABLE lagesfil_dag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lagesfil_timme, lagesfil_dag FROM PUBLIC;
REVOKE ALL ON FUNCTION lagesfil_spara(timestamptz, text[], text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION lagesfil_rakna(date) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE lagesfil_timme, lagesfil_dag FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE lagesfil_timme, lagesfil_dag FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE lagesfil_timme TO service_role;
    GRANT ALL ON TABLE lagesfil_dag TO service_role;
    GRANT EXECUTE ON FUNCTION lagesfil_spara(timestamptz, text[], text[]) TO service_role;
    GRANT EXECUTE ON FUNCTION lagesfil_rakna(date) TO service_role;
  END IF;
END $$;

-- Varje dygn 12.33 UTC: gårdagen i svensk tid. Bara där pg_cron finns (inte i CI:s PostGIS).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-lagesfilen') THEN
      PERFORM cron.schedule('halkvakt-lagesfilen', '33 12 * * *',
        $c$SELECT lagesfil_rakna(((now() AT TIME ZONE 'Europe/Stockholm')::date - 1))$c$);
    END IF;
  END IF;
END $$;
