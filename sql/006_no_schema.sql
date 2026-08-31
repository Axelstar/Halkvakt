-- 006: Norskt skuggarkiv (#35), spegel av 004 (Finland). Schema `no`, isolerat, fött låst.
-- Fylls först när Vegvesens DATEX-konto finns (VEGVESEN_USER/PASS i GitHub Secrets).
CREATE SCHEMA IF NOT EXISTS no;
CREATE TABLE IF NOT EXISTS no.weather_latest       (LIKE public.weather_latest       INCLUDING ALL);
CREATE TABLE IF NOT EXISTS no.weather_observations (LIKE public.weather_observations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS no.deviations           (LIKE public.deviations           INCLUDING ALL);
CREATE TABLE IF NOT EXISTS no.sync_state           (LIKE public.sync_state           INCLUDING ALL);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['weather_latest','weather_observations','deviations','sync_state'] LOOP
    EXECUTE format('ALTER TABLE no.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON TABLE no.%I FROM anon', t); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE no.%I FROM authenticated', t); END IF;
  END LOOP;
END $$;
