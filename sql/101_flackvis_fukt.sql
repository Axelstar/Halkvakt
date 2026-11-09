-- 101: FLÄCKVIS VÅT ÄR FUKT UTANFÖR STORSTÄDERNA (DECISIONS #825, kort #644). Bengt och Axel 9/11: "vårt val är A".
-- kandidat_regel() och ny_kandidat_regel() skapas om ur sql/094 ord för ord, med två ändringar i var och en:
--   * väglaget räknar också ut flackvis_fukt: Trafikverkets fläckvis Våt på sträckan, ensamt eller med fläckvis Torrt och inget annat
--     ord (FLACKVIS_FOLJE). Med Torrt, eller med något annat ord, räknas det inte;
--   * fukten är Våt, eller flackvis_fukt där vägpunkten ligger mer än 2 km från varje stadspunkt, eller radarn (RADAR_MMH står kvar
--     sist före THEN 'torr').
-- Allt annat är oförändrat: kolumnen flackvis_vat säger som förut bara att ordet står på sträckan, vetot går före fukten och
-- spridningsspärren efter den, och storstädernas gren har radarn som enda fukt (gruppen är aldrig en av Trafikverkets sträckor).
-- SKÄLET: väg 233 7/11, en tyst miss på fläckvis Våt (olycksfacit, ärende #1472). Mätningen är kuvösens (halkvakt-kuvos F41/F42).
-- AVSTÅNDET RÄKNAS INTE I REGELN. vagpunkt_nara_stad bär vägpunkterna inom 2 km från någon stadspunkt, och regeln läser den med en
-- vanlig koppling på punkten. Båda tabellerna kan ändras: stadspunkt skrivs om av laddaren (ingest/stadspunkter-db.ts) varje timme ur
-- kuvösens lista, och vagpunkt av sql/055 när den genereras om. Därför bygger triggrar på båda om listan efter varje sats, och bygget
-- skriver bara skillnaden. Regelfunktionerna förblir LANGUAGE sql utan SET och utan SECURITY DEFINER (CLAUDE.md, DECISIONS #783, #784);
-- bygget är plpgsql med fast sökväg och körs per sats, aldrig per rad i regeln.
-- SLÅS PÅ (migreras) FÖRST när kuvösens omkörning är läst mot villkoren som bestämdes före den. Följs upp dagligen i sju dygn.
-- DEN SNABBA REGELN (sql/080): raderna som byts står som i 094, så den härleds om utan ändring. Regeln ändras, så den snabba skuggan
-- stannar tills sql/080 och sql/081 körts om, och dess sju dygn börjar om.
-- ORDNINGEN: 101, sedan 080 och 081. TILLBAKA: kör om sql/094 och sedan 080 och 081; tabellen och triggrarna kan stå kvar, eftersom
-- ingen regel läser dem då. Returtypen är densamma, så CREATE OR REPLACE räcker och rättigheterna står kvar. Idempotent.
-- service_role får tabellen och funktionerna i samma fil (DECISIONS #653).

CREATE TABLE IF NOT EXISTS vagpunkt_nara_stad (
  punkt text PRIMARY KEY
);
-- Stadspunkterna på geografin, så att bygget slår upp avståndet i ett index i stället för att jämföra alla par.
CREATE INDEX IF NOT EXISTS stadspunkt_geog ON stadspunkt USING gist ((geom::geography));

CREATE OR REPLACE FUNCTION vagpunkt_nara_stad_bygg() RETURNS void
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  WITH nara AS (
    SELECT v.punkt FROM vagpunkt v
    WHERE EXISTS (SELECT 1 FROM stadspunkt s WHERE ST_DWithin(s.geom::geography, v.geom::geography, 2000))   -- STAD_FLACKVIS_M
  ),
  bort AS (DELETE FROM vagpunkt_nara_stad n WHERE NOT EXISTS (SELECT 1 FROM nara WHERE nara.punkt = n.punkt))
  INSERT INTO vagpunkt_nara_stad (punkt) SELECT nara.punkt FROM nara ON CONFLICT (punkt) DO NOTHING;
END $$;
COMMENT ON FUNCTION vagpunkt_nara_stad_bygg() IS 'Vägpunkterna inom 2 km från någon stadspunkt till vagpunkt_nara_stad (sql/101, DECISIONS #825); skriver bara skillnaden. Anropas av triggrarna på stadspunkt och vagpunkt. Bara service-rollen.';

CREATE OR REPLACE FUNCTION vagpunkt_nara_stad_trigger() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  PERFORM vagpunkt_nara_stad_bygg();
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS nara_stad ON stadspunkt;
CREATE TRIGGER nara_stad AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON stadspunkt
  FOR EACH STATEMENT EXECUTE FUNCTION vagpunkt_nara_stad_trigger();
DROP TRIGGER IF EXISTS nara_stad ON vagpunkt;
CREATE TRIGGER nara_stad AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON vagpunkt
  FOR EACH STATEMENT EXECUTE FUNCTION vagpunkt_nara_stad_trigger();
SELECT vagpunkt_nara_stad_bygg();

CREATE OR REPLACE FUNCTION kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, v.geom
    FROM kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
    UNION ALL
    -- Storstädernas punkter (sql/089, DECISIONS #804): gruppen i segment_id, bara där brytaren för området och lagret är på, och
    -- tysta i marsfönstret (F33, regel B).
    SELECT l.punkt, s.grupp, s.lon, s.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, s.geom
    FROM kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt
    JOIN stadsbrytare b ON b.omrade = s.omrade AND b.lager = s.lager AND b.pa
    WHERE l.tid = (SELECT kandidat_timme())                                            -- en gång per körning (#813)
      AND l.pb <= 0                                                                                  -- YTA_GRANS_C
      AND NOT (s.lat < 62                                                                            -- STAD_MARS_LAT
               AND extract(month FROM l.tid AT TIME ZONE 'Europe/Stockholm') = 3                     -- STAD_MARS_MANAD
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') >= 10                    -- STAD_MARS_FRAN
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') < 16)                    -- STAD_MARS_TILL
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis,
           'fläckvis Våt' = ANY (rc.condition_info)
             AND rc.condition_info <@ ARRAY['fläckvis Våt', 'fläckvis Torrt'] AS flackvis_fukt                 -- FLACKVIS_FOLJE (#825)
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
    UNION ALL
    -- Storstädernas grupper (sql/090): radarn är deras enda fukt.
    SELECT r.grupp, max(r.rate_mean_mmh) FROM radar_stad r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.grupp                             -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              -- fläckvis Våt bara utanför storstäderna: vägpunkten mer än 2 km från varje stadspunkt (vagpunkt_nara_stad, #825)
              WHEN NOT (coalesce(g.vat, false) OR (coalesce(g.flackvis_fukt, false) AND n.punkt IS NULL)
                        OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                                       -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.frys_min >= 0.45 THEN 'spridning'                     -- FRYS_MINORITET_Y (#800)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN vagpunkt_nara_stad n ON n.punkt = k.punkt
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION kandidat_regel() IS 'Kandidatens regel (DECISIONS #562–#575, R #725, #825): yta ≤ 0, fukt (Våt, fläckvis Våt ensamt eller med fläckvis Torrt mer än 2 km från varje stadspunkt, eller radar ≥ 0,1 mm/h på 60 min), veto inom 15 km över +2 °C på 45 min, spridningsspärren F1 (minoritetens viktandel kring noll ≥ 0,45 där minst två ankare bidrar, #800), färsk och fullständig. Storstädernas punkter (sql/091, #804) med påslagen brytare, gruppen som sträcka, radarn ur radar_stad som enda fukt och tysta kl. 10–16 svensk tid i mars söder om 62°. Bara service-rollen.';

CREATE OR REPLACE FUNCTION ny_kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, v.geom
    FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
    UNION ALL
    -- Storstädernas punkter (sql/089, DECISIONS #804): gruppen i segment_id, bara där brytaren för området och lagret är på, och
    -- tysta i marsfönstret (F33, regel B).
    SELECT l.punkt, s.grupp, s.lon, s.lat, l.tid, l.pb, l.n_ank, l.spr, l.frys_min, s.geom
    FROM ny_kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt
    JOIN stadsbrytare b ON b.omrade = s.omrade AND b.lager = s.lager AND b.pa
    WHERE l.tid = (SELECT ny_kandidat_timme())                                            -- en gång per körning (#813)
      AND l.pb <= 0                                                                                  -- YTA_GRANS_C
      AND NOT (s.lat < 62                                                                            -- STAD_MARS_LAT
               AND extract(month FROM l.tid AT TIME ZONE 'Europe/Stockholm') = 3                     -- STAD_MARS_MANAD
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') >= 10                    -- STAD_MARS_FRAN
               AND extract(hour FROM l.tid AT TIME ZONE 'Europe/Stockholm') < 16)                    -- STAD_MARS_TILL
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis,
           'fläckvis Våt' = ANY (rc.condition_info)
             AND rc.condition_info <@ ARRAY['fläckvis Våt', 'fläckvis Torrt'] AS flackvis_fukt                 -- FLACKVIS_FOLJE (#825)
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
    UNION ALL
    -- Storstädernas grupper (sql/090): radarn är deras enda fukt.
    SELECT r.grupp, max(r.rate_mean_mmh) FROM radar_stad r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.grupp                             -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta, k.n_ank, k.spr,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              -- fläckvis Våt bara utanför storstäderna: vägpunkten mer än 2 km från varje stadspunkt (vagpunkt_nara_stad, #825)
              WHEN NOT (coalesce(g.vat, false) OR (coalesce(g.flackvis_fukt, false) AND n.punkt IS NULL)
                        OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                                       -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.frys_min >= 0.45 THEN 'spridning'                     -- FRYS_MINORITET_Y (#800)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN vagpunkt_nara_stad n ON n.punkt = k.punkt
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;
COMMENT ON FUNCTION ny_kandidat_regel() IS 'Den nya kandidatens regel (sql/068, ersättningsregeln §4): den frystas regel i sql/101 ord för ord på ny_kandidat_live, med storstädernas punkter (#804) och fläckvis Våt utanför storstäderna (#825). Talar genom talande_regel() (sql/070). Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE; service-rollen får tabellen och funktionerna, vaktat för CI:s PostGIS.
ALTER TABLE vagpunkt_nara_stad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE vagpunkt_nara_stad FROM PUBLIC;
REVOKE ALL ON FUNCTION vagpunkt_nara_stad_bygg(), vagpunkt_nara_stad_trigger() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE vagpunkt_nara_stad FROM anon;
    REVOKE ALL ON FUNCTION vagpunkt_nara_stad_bygg(), vagpunkt_nara_stad_trigger() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE vagpunkt_nara_stad FROM authenticated;
    REVOKE ALL ON FUNCTION vagpunkt_nara_stad_bygg(), vagpunkt_nara_stad_trigger() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE vagpunkt_nara_stad TO service_role;
    GRANT EXECUTE ON FUNCTION vagpunkt_nara_stad_bygg(), vagpunkt_nara_stad_trigger() TO service_role;
  END IF;
END $$;
