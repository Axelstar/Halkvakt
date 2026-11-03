-- 078: KANDIDATEN PÅ EN KVART — RÖRLEDNINGEN (DECISIONS #782, kort #373). Den nya kandidatens värde räknas också i databasen var
-- femte minut för det förarna hör, så att det vilar på stationsmätningar som är minuter gamla i stället för upp till en timme.
-- Domen fälls som förut på timkedjan i Actions (FORREGISTRERING-2026-27 §2, §12 c och e); det här är bara visningen.
--
-- RÄKNINGEN STÅR INTE HÄR. Den ligger i Axelstar/halkvakt-kuvos (fysik/live/kandidat_snabb.sql, F5 där) och läggs in med
-- DB-knappen med kuvos ovanpå: kandidat_grannar_bygg() och kandidat_snabb_rakna(tid, w, l). Här står tabellerna och anroparen
-- kandidat_snabb(), som pg_cron startar (sql/079) och som bara loggar 'räkningen saknas' så länge funktionerna inte finns.
-- Paret W · L står inte i koden: Del A skriver det ur kandidatfilen till kandidat_par (ingest/ny-kandidat-db.ts skriv-par).
--
-- TALAR INTE ÄN. talande_timme() och talande_regel() (sql/070) läser inte ny_kandidat_snabb; påslaget är en egen migration efter
-- skuggan i sju dygn (#782 punkt 5).
-- Idempotent. Bara service-rollen; vaktat för CI:s PostGIS utan Supabase-rollerna och utan pg_cron.

-- Paret ur kandidatfilen, en rad (Del A skriver den vid varje körning).
CREATE TABLE IF NOT EXISTS kandidat_par (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  w double precision NOT NULL,
  l_km double precision NOT NULL,
  skriven timestamptz NOT NULL DEFAULT now()
);

-- Punkternas lägen, som Del B:s punkter.csv (MET Nordics punkter: vägpunkterna och stationerna). Del A skriver dem; `andrad` flyttas
-- bara när läget ändras, och kandidat_snabb() bygger då om grannlistorna.
CREATE TABLE IF NOT EXISTS kandidat_punkter (
  punkt text PRIMARY KEY,
  nr integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  andrad timestamptz NOT NULL DEFAULT now()
);

-- Varje station som någon gång varit ankare, med senaste läget.
CREATE TABLE IF NOT EXISTS kandidat_stationer (
  station_id text PRIMARY KEY,
  nr integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  lon double precision NOT NULL,
  lat double precision NOT NULL
);

-- Grannlistorna, med heltal i stället för text (minnet, #782).
CREATE TABLE IF NOT EXISTS kandidat_grannar (
  punkt_nr integer NOT NULL,
  station_nr integer NOT NULL,
  km double precision NOT NULL,
  PRIMARY KEY (punkt_nr, station_nr)
);
CREATE TABLE IF NOT EXISTS kandidat_grannar_bygd (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  byggd timestamptz NOT NULL
);

-- Ankarna i körningen (vagpunkt_ankare(), som Del B), och den senaste räkningen. UNLOGGED: skrivs om var femte minut, sparas inte
-- och skriver inget till WAL; efter en krasch är de tomma tills nästa körning.
CREATE UNLOGGED TABLE IF NOT EXISTS kandidat_snabb_ankare (
  id text PRIMARY KEY,
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  yta double precision NOT NULL
);
CREATE UNLOGGED TABLE IF NOT EXISTS ny_kandidat_snabb (
  punkt text PRIMARY KEY,
  tid timestamptz NOT NULL,                -- PH-timmen
  raknad timestamptz NOT NULL,             -- när värdet räknades
  ph real, pg real, ra real, ank_km real, pb real, n_ank smallint, spr real   -- som ny_kandidat_live (sql/068)
);

-- En rad per körning: tiden, antalen och skälet när den inte räknade. Gallras efter 30 dygn.
CREATE TABLE IF NOT EXISTS ny_kandidat_snabb_korning (
  raknad timestamptz PRIMARY KEY,
  tid timestamptz NOT NULL,
  ms integer,
  punkter integer,
  ankare integer,
  ofullstandiga integer,                   -- punkter som räknades mot alla ankare (listan räckte inte)
  byggd boolean NOT NULL DEFAULT false,    -- grannlistorna byggdes om i körningen
  skal text                                -- NULL när den räknade
);

CREATE OR REPLACE FUNCTION kandidat_snabb() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  t0 timestamptz := clock_timestamp();
  v_tid timestamptz := date_trunc('hour', now());
  v_w double precision;
  v_l double precision;
  v_ank integer;
  v_n integer;
  v_of integer;
  v_byggd boolean := false;
BEGIN
  DELETE FROM ny_kandidat_snabb_korning WHERE raknad < now() - interval '30 days';
  IF to_regprocedure('kandidat_snabb_rakna(timestamptz, double precision, double precision)') IS NULL
     OR to_regprocedure('kandidat_grannar_bygg()') IS NULL THEN
    INSERT INTO ny_kandidat_snabb_korning (raknad, tid, skal) VALUES (now(), v_tid, 'räkningen saknas');
    RETURN 'räkningen saknas';
  END IF;
  SELECT k.w, k.l_km INTO v_w, v_l FROM kandidat_par k WHERE k.id = 1;
  IF v_w IS NULL THEN
    INSERT INTO ny_kandidat_snabb_korning (raknad, tid, skal) VALUES (now(), v_tid, 'paret saknas');
    RETURN 'paret saknas';
  END IF;

  TRUNCATE kandidat_snabb_ankare;
  INSERT INTO kandidat_snabb_ankare (id, lon, lat, yta) SELECT a.id, a.lon, a.lat, a.yta::double precision FROM vagpunkt_ankare() a;
  GET DIAGNOSTICS v_ank = ROW_COUNT;

  IF EXISTS (SELECT 1 FROM kandidat_snabb_ankare a LEFT JOIN kandidat_stationer s ON s.station_id = a.id
             WHERE s.station_id IS NULL OR (s.lon, s.lat) IS DISTINCT FROM (a.lon, a.lat))
     OR EXISTS (SELECT 1 FROM kandidat_punkter k
                WHERE k.andrad > coalesce((SELECT b.byggd FROM kandidat_grannar_bygd b WHERE b.id = 1), '-infinity'::timestamptz)) THEN
    PERFORM kandidat_grannar_bygg();
    v_byggd := true;
  END IF;

  DELETE FROM ny_kandidat_snabb;           -- DELETE, inte TRUNCATE: en läsare väntar inte på låset
  WITH r AS (SELECT * FROM kandidat_snabb_rakna(v_tid, v_w, v_l)),
  i AS (INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, ph, pg, ra, ank_km, pb, n_ank, spr)
        SELECT r.punkt, v_tid, now(), r.ph, r.pg, r.ra, r.ank_km, r.pb, r.n_ank, r.spr FROM r RETURNING 1)
  SELECT (SELECT count(*) FROM i), count(*) FILTER (WHERE r.ofullstandig) INTO v_n, v_of FROM r;

  INSERT INTO ny_kandidat_snabb_korning (raknad, tid, ms, punkter, ankare, ofullstandiga, byggd, skal)
  VALUES (now(), v_tid, (extract(epoch FROM clock_timestamp() - t0) * 1000)::integer, v_n, v_ank, v_of, v_byggd,
          CASE WHEN v_n = 0 THEN 'ingen PH för timmen' END);
  RETURN CASE WHEN v_n = 0 THEN 'ingen PH för timmen' ELSE 'räknad' END;
END $$;
COMMENT ON FUNCTION kandidat_snabb() IS 'Kandidaten på en kvart (DECISIONS #782): ankarna, grannlistorna vid behov och räkningen ur halkvakt-kuvos till ny_kandidat_snabb. Talar inte (sql/070 läser inte tabellen). Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE; service-rollen får tabellerna och funktionen (DECISIONS #653).
ALTER TABLE kandidat_par ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_punkter ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_stationer ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_grannar ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_grannar_bygd ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_snabb_ankare ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_snabb ENABLE ROW LEVEL SECURITY;
ALTER TABLE ny_kandidat_snabb_korning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kandidat_par, kandidat_punkter, kandidat_stationer, kandidat_grannar, kandidat_grannar_bygd, kandidat_snabb_ankare,
  ny_kandidat_snabb, ny_kandidat_snabb_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION kandidat_snabb() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_par, kandidat_punkter, kandidat_stationer, kandidat_grannar, kandidat_grannar_bygd, kandidat_snabb_ankare,
      ny_kandidat_snabb, ny_kandidat_snabb_korning FROM anon;
    REVOKE ALL ON FUNCTION kandidat_snabb() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_par, kandidat_punkter, kandidat_stationer, kandidat_grannar, kandidat_grannar_bygd, kandidat_snabb_ankare,
      ny_kandidat_snabb, ny_kandidat_snabb_korning FROM authenticated;
    REVOKE ALL ON FUNCTION kandidat_snabb() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE kandidat_par TO service_role;
    GRANT ALL ON TABLE kandidat_punkter TO service_role;
    GRANT ALL ON TABLE kandidat_stationer TO service_role;
    GRANT ALL ON TABLE kandidat_grannar TO service_role;
    GRANT ALL ON TABLE kandidat_grannar_bygd TO service_role;
    GRANT ALL ON TABLE kandidat_snabb_ankare TO service_role;
    GRANT ALL ON TABLE ny_kandidat_snabb TO service_role;
    GRANT ALL ON TABLE ny_kandidat_snabb_korning TO service_role;
    GRANT EXECUTE ON FUNCTION kandidat_snabb() TO service_role;
  END IF;
END $$;
