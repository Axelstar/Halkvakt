-- 004: Danskt skuggarkiv (BACKLOG #36, 2026-08-31). Eget schema `fi`, ISOLERAT:
-- ingen svensk fråga rör dk.*, ingen finsk rad kan läcka in i den svenska snapshoten.
-- Tabellerna är kopior av de svenska så att skuggmotorn och missmätningen kan peka
-- om med ett schemanamn den dag Finland blir produkt. Fött låst (DECISIONS #32).
CREATE SCHEMA IF NOT EXISTS dk;
CREATE TABLE IF NOT EXISTS dk.weather_latest       (LIKE public.weather_latest       INCLUDING ALL);
CREATE TABLE IF NOT EXISTS dk.weather_observations (LIKE public.weather_observations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS dk.deviations           (LIKE public.deviations           INCLUDING ALL);
CREATE TABLE IF NOT EXISTS dk.sync_state           (LIKE public.sync_state           INCLUDING ALL);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['weather_latest','weather_observations','deviations','sync_state'] LOOP
    EXECUTE format('ALTER TABLE dk.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE dk.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE dk.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
