-- 068: DEN NYA KANDIDATENS SKUGGA (ersättningsregeln docs/FORREGISTRERING-ERSATTNING-2027-28.md §4, DECISIONS #692). INTE KÖRD.
-- Bengt migrerar (DB-knappen), och ingenting skrivs hit förrän flaggan i kuvos/ny-kandidat-skugga.json är på (efter migrationen och
-- paritetsprovet, kuvos-ny-kandidat.yml steg=paritet). Skrivs bara av den nya kedjans flöden (ny-kandidat-fysik.yml och
-- ny-kandidat-timme.yml, via ingest/ny-kandidat-db.ts); inget schema i pg_cron, så migrationen ensam skriver ingenting.
--
-- §4: "En egen logg. Den nyas stationsvärden och regelns utfall loggas i en egen tabell bredvid kandidat_skugga (sql/057), med samma
-- fält, så att domen i §5 kan räknas likadant för båda." Därför är allt här den frystas kedja i databasen med ny_ framför namnet:
--   ny_kandidat_ph, ny_kandidat_live            som kandidat_ph och kandidat_live (sql/050, 058): del A:s PH och del B:s värden;
--   ny_kandidat_skugga, ny_kandidat_station,    som kandidat_skugga, kandidat_station och kandidat_skugga_korning (sql/057, 058,
--   ny_kandidat_skugga_korning                  065): samma kolumner i samma ordning och med samma typer;
--   ny_kandidat_timme(), ny_kandidat_regel(),   kandidat_timme() (sql/057), kandidat_regel() (sql/058), kandidat_logga() (sql/065)
--   ny_kandidat_logga(), gallra_ny_kandidat()   och gallra_kandidat() (sql/052) ord för ord, bara tabell- och funktionsnamnen bytta.
-- Regelns tal står här en gång till och vaktas av kontraktsgrinden mot sql/058 (golven höjda med ett). test/ny-kandidat-skugga.test.ts
-- prövar att funktionerna är den frystas text med bytta namn och att tabellerna har den frystas kolumner, och integrationsprovet i
-- test/integration.test.ts kör båda regeln och loggen på samma rader och kräver samma svar.
--
-- DEN FRYSTA RÖRS INTE: inga av dess tabeller eller funktioner ändras här, och de nya funktionerna skriver bara i ny_-tabellerna.
-- Regeln läser samma gemensamma tabeller som den frystas (vagpunkt, road_conditions, radar_precip, weather_observations,
-- givarfel_dygn) och skriver ingenting i dem. Publiceringen, skuggmotorn och kartan läser kandidat_regel(), aldrig ny_kandidat_regel():
-- inget här når appen, rösten eller lägesfilen.
--
-- Arkivexporten (sql/053, 057, 063) tar inte ny_kandidat_skugga och ny_kandidat_station: de ligger kvar i databasen (cirka 2 MB per
-- dygn, som kandidat_station före exporten, #618; Pro-kvoten 8 GB, #652) tills exporten utökas med ett eget beslut.

CREATE TABLE IF NOT EXISTS ny_kandidat_ph (
  korning timestamptz NOT NULL,          -- körningen R som timmen räknades på
  tid timestamptz NOT NULL,              -- timmen (UTC)
  punkt text NOT NULL,
  ts_fysik real,                         -- fysikens yta (°C), långvågen ur reserven
  ph real,                               -- fysiken + rättelsen (°C)
  PRIMARY KEY (tid, punkt)
);
CREATE TABLE IF NOT EXISTS ny_kandidat_live (
  tid timestamptz NOT NULL,
  punkt text NOT NULL,
  ph real,
  pg real,                               -- PH + grannarnas fel
  ra real,                               -- RÅ vid punkten (NULL utan ankare inom 50 km)
  ank_km real,                           -- närmaste bidragande ankare (km)
  pb real,                               -- blandningen med den nyas par: kandidatens värde
  n_ank smallint,                        -- RÅ:s bidragande ankare (sql/058)
  spr real,                              -- deras spridning (sql/058)
  PRIMARY KEY (tid, punkt)
);
CREATE INDEX IF NOT EXISTS ny_kandidat_live_tid ON ny_kandidat_live (tid);

CREATE TABLE IF NOT EXISTS ny_kandidat_skugga (
  segment_id text NOT NULL,
  observed_at timestamptz NOT NULL,            -- kandidatens timme
  skriven_at timestamptz NOT NULL DEFAULT now(),
  punkter int NOT NULL,                        -- vägpunkter på sträckan med yta ≤ 0
  varnar int NOT NULL,
  veto int NOT NULL,
  torr int NOT NULL,
  vat boolean NOT NULL,
  flackvis_vat boolean NOT NULL,
  radar_mmh numeric,                           -- radarns högsta rate_mean de senaste 60 minuterna, null utan radarrad
  pb_min real NOT NULL,                        -- kandidatens kallaste värde på sträckan
  veto_station text,                           -- närmaste vetostation, om någon punkt vetades
  veto_km real,
  veto_yta numeric,
  spridning int NOT NULL DEFAULT 0,            -- sql/058
  fukt_glest int NOT NULL DEFAULT 0,
  fukt_spr_min real,
  fukt_punkter text[],                         -- sql/065
  fukt_utfall text[],
  fukt_ank_km real[],
  fukt_n_ank smallint[],
  fukt_spr real[],
  fukt_pb real[],
  PRIMARY KEY (segment_id, observed_at)
);
CREATE TABLE IF NOT EXISTS ny_kandidat_station (
  station_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  ph real, pg real, ra real, ank_km real, pb real,
  n_ank smallint,                              -- sql/058
  spr real,
  PRIMARY KEY (station_id, observed_at)
);
CREATE TABLE IF NOT EXISTS ny_kandidat_skugga_korning (
  korning timestamptz PRIMARY KEY DEFAULT now(),
  observed_at timestamptz,                     -- kandidatens timme (räknad) eller senaste timme (tyst)
  status text NOT NULL CHECK (status IN ('räknad', 'redan räknad', 'tyst')),
  stracker int NOT NULL DEFAULT 0,
  varnar int NOT NULL DEFAULT 0,
  veto int NOT NULL DEFAULT 0,
  torr int NOT NULL DEFAULT 0,
  stationer int NOT NULL DEFAULT 0,
  spridning int NOT NULL DEFAULT 0             -- sql/058
);
ALTER TABLE ny_kandidat_ph ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_skugga ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_skugga_korning ENABLE ROW LEVEL SECURITY;
-- Autovacuum som sql/060 för tabellerna som byts ut hela tiden.
ALTER TABLE ny_kandidat_ph SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000,
                                autovacuum_analyze_scale_factor = 0.02, autovacuum_analyze_threshold = 1000);
ALTER TABLE ny_kandidat_live SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000,
                                  autovacuum_analyze_scale_factor = 0.02, autovacuum_analyze_threshold = 1000);
ALTER TABLE ny_kandidat_station SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000,
                                     autovacuum_analyze_scale_factor = 0.02, autovacuum_analyze_threshold = 1000);

-- Färskheten (sql/057 kandidat_timme): den nya kandidatens senaste timme om den är högst två timmar gammal och bär minst 95 % av
-- vägpunkterna, annars null.
CREATE OR REPLACE FUNCTION ny_kandidat_timme() RETURNS timestamptz
LANGUAGE sql STABLE AS $$
  WITH s AS (SELECT max(l.tid) AS tid FROM ny_kandidat_live l WHERE l.tid <= now())
  SELECT s.tid FROM s
  WHERE s.tid > now() - interval '2 hours'                                                          -- FARSK_TIMMAR
    AND (SELECT count(*) FROM ny_kandidat_live l WHERE l.tid = s.tid AND l.punkt LIKE 'v%')
        >= 0.95 * (SELECT count(*) FROM vagpunkt)                                                    -- FULLSTANDIG_ANDEL
$$;

-- Regeln (sql/058 kandidat_regel, orörd där): yta ≤ 0, fukt (Våt eller radar ≥ 0,5 mm/h på 60 min), veto inom 15 km över +2 °C på
-- 45 min, spridningsgrinden 2,25 °C där minst två ankare bidrar — på den nya kandidatens värden. DROP och CREATE som sql/058, så att
-- filen går att köra om.
DROP FUNCTION IF EXISTS ny_kandidat_regel();
CREATE FUNCTION ny_kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
    FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
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
              WHEN NOT (coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.5) THEN 'torr'                -- RADAR_MMH
              WHEN coalesce(k.n_ank, 0) >= 2 AND k.spr >= 2.25 THEN 'spridning'                         -- SPRIDNING_X_C (#477)
              ELSE 'varnar' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;

COMMENT ON FUNCTION ny_kandidat_regel() IS 'Den nya kandidatens regel (sql/068, ersättningsregeln §4): den frystas regel i sql/058 ord för ord på ny_kandidat_live. Loggas, talar aldrig. Bara service-rollen.';

-- Domloggen (sql/065 kandidat_logga): stationsvärdena först, sedan regeln per sträcka för timmen — en gång per timme. Anropas av den
-- nya kedjans del B (ingest/ny-kandidat-db.ts logga) efter skrivningen, inte av pg_cron.
CREATE OR REPLACE FUNCTION ny_kandidat_logga() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE t timestamptz; n_st int := 0; n_seg int := 0; n_v int := 0; n_veto int := 0; n_torr int := 0; n_spr int := 0;
BEGIN
  INSERT INTO ny_kandidat_station (station_id, observed_at, ph, pg, ra, ank_km, pb, n_ank, spr)
    SELECT l.punkt, l.tid, l.ph, l.pg, l.ra, l.ank_km, l.pb, l.n_ank, l.spr FROM ny_kandidat_live l WHERE l.punkt NOT LIKE 'v%'
    ON CONFLICT (station_id, observed_at) DO NOTHING;
  GET DIAGNOSTICS n_st = ROW_COUNT;
  t := ny_kandidat_timme();
  IF t IS NULL THEN
    INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stationer)
      VALUES ((SELECT max(l.tid) FROM ny_kandidat_live l WHERE l.tid <= now()), 'tyst', n_st);
    RETURN format('kandidaten tyst (timmen gammal eller ofullständig); %s stationsrader', n_st);
  END IF;
  IF EXISTS (SELECT 1 FROM ny_kandidat_skugga_korning k WHERE k.observed_at = t AND k.status = 'räknad') THEN
    INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stationer) VALUES (t, 'redan räknad', n_st);
    RETURN format('kandidatens timme %s redan räknad; %s stationsrader', t, n_st);
  END IF;
  WITH r AS (SELECT * FROM ny_kandidat_regel()),
  ins AS (
    INSERT INTO ny_kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, radar_mmh, pb_min,
                                 veto_station, veto_km, veto_yta, spridning, fukt_glest, fukt_spr_min,
                                 fukt_punkter, fukt_utfall, fukt_ank_km, fukt_n_ank, fukt_spr, fukt_pb)
    SELECT r.segment_id, r.tid, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'), count(*) FILTER (WHERE r.utfall = 'veto'),
           count(*) FILTER (WHERE r.utfall = 'torr'), bool_or(r.vat), bool_or(r.flackvis_vat), max(r.radar_mmh), min(r.pb),
           (array_agg(r.veto_station ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           min(r.veto_km),
           (array_agg(r.veto_yta ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           count(*) FILTER (WHERE r.utfall = 'spridning'),
           count(*) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) < 2),
           min(r.spr) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) >= 2),
           -- 065: punkterna som inte är torra, i punktordning; fälten hämtas ur ny_kandidat_live för samma timme och punkt (1:1, nyckeln).
           array_agg(r.punkt ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.utfall ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(l.ank_km ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.n_ank ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.spr ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.pb ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr')
    FROM r LEFT JOIN ny_kandidat_live l ON l.tid = r.tid AND l.punkt = r.punkt
    GROUP BY r.segment_id, r.tid
    ON CONFLICT (segment_id, observed_at) DO NOTHING
    RETURNING varnar, veto, torr, spridning
  )
  SELECT count(*), coalesce(sum(i.varnar), 0), coalesce(sum(i.veto), 0), coalesce(sum(i.torr), 0), coalesce(sum(i.spridning), 0)
    INTO n_seg, n_v, n_veto, n_torr, n_spr FROM ins i;
  INSERT INTO ny_kandidat_skugga_korning (observed_at, status, stracker, varnar, veto, torr, spridning, stationer)
    VALUES (t, 'räknad', n_seg, n_v, n_veto, n_torr, n_spr, n_st);
  RETURN format('kandidatens timme %s: %s sträckor, %s varnande punkter, %s vetade, %s torra, %s tystade av spridningen; %s stationsrader',
                t, n_seg, n_v, n_veto, n_torr, n_spr, n_st);
END $$;

-- Gallringen (sql/052 gallra_kandidat): PH en timme bakåt, värdena sex timmar. Del B anropar den efter varje skrivning.
CREATE OR REPLACE FUNCTION gallra_ny_kandidat() RETURNS bigint AS $$
DECLARE n bigint := 0; m bigint;
BEGIN
  DELETE FROM ny_kandidat_ph WHERE tid < now() - interval '1 hour';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  DELETE FROM ny_kandidat_live WHERE tid < now() - interval '6 hours';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Rättigheterna som den frystas (sql/050, 057, 058), låsta dubbelt (RLS utan policy och REVOKE) och uttryckligen per tabell (#653):
-- service-rollen skriver PH och värdena och kör gallringen, läser loggen och regeln; loggen skrivs bara av kedjans eget anrop.
REVOKE ALL ON TABLE ny_kandidat_ph, ny_kandidat_live, ny_kandidat_skugga, ny_kandidat_station, ny_kandidat_skugga_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION ny_kandidat_timme(), ny_kandidat_regel(), ny_kandidat_logga(), gallra_ny_kandidat() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE ny_kandidat_ph, ny_kandidat_live, ny_kandidat_skugga, ny_kandidat_station, ny_kandidat_skugga_korning FROM anon;
    REVOKE ALL ON FUNCTION ny_kandidat_timme(), ny_kandidat_regel(), ny_kandidat_logga(), gallra_ny_kandidat() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE ny_kandidat_ph, ny_kandidat_live, ny_kandidat_skugga, ny_kandidat_station, ny_kandidat_skugga_korning FROM authenticated;
    REVOKE ALL ON FUNCTION ny_kandidat_timme(), ny_kandidat_regel(), ny_kandidat_logga(), gallra_ny_kandidat() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ny_kandidat_ph TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ny_kandidat_live TO service_role;
    GRANT SELECT ON TABLE ny_kandidat_skugga TO service_role;
    GRANT SELECT ON TABLE ny_kandidat_station TO service_role;
    GRANT SELECT ON TABLE ny_kandidat_skugga_korning TO service_role;
    GRANT EXECUTE ON FUNCTION ny_kandidat_timme(), ny_kandidat_regel(), gallra_ny_kandidat() TO service_role;
  END IF;
END $$;
