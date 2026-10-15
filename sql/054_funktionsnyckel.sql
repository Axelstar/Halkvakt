-- 054: FUNKTIONERNAS NYCKEL I DATABASEN (DECISIONS #571; Bengt 15/10 "gör den tredje vägen").
-- INGEST_KEY läckte (DECISIONS #570), och funktionshemligheten kan bara bytas med en Supabase-nyckel som har
-- edge_functions_secrets_write — deploynyckeln har den inte. Nu prövar de nio funktionerna x-halkvakt-key mot raden här
-- (nyckel_giltig, anropad med service-rollen, supabase/functions/_shared/nyckel.ts), och nyckeln byts med DATABASE_URL:
-- raden och cron-jobben i samma transaktion (nyckelbyte-ingest.yml). Funktionshemligheten INGEST_KEY läses inte längre.
-- Första fyllningen tar nyckeln som pg_cron:s jobb redan bär, så att inget anrop faller när funktionerna deployas om —
-- och inget värde står i en fil eller en logg.

CREATE TABLE IF NOT EXISTS funktionsnyckel (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nyckel text NOT NULL CHECK (length(nyckel) >= 32),
  bytt_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE funktionsnyckel ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE funktionsnyckel IS 'DECISIONS #571: nyckeln som x-halkvakt-key prövas mot. Bara service-rollen och postgres.';

CREATE OR REPLACE FUNCTION nyckel_giltig(k text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(EXISTS (SELECT 1 FROM funktionsnyckel WHERE nyckel = k), false)
$$;

-- Rättigheterna: bara service-rollen (funktionerna) får pröva och läsa. Supabase ger anon och authenticated rätt till nya
-- tabeller och funktioner i public som standard, så de tas bort uttryckligen, inte bara från PUBLIC (RLS-läxan i CLAUDE.md).
REVOKE ALL ON TABLE funktionsnyckel FROM PUBLIC;
REVOKE ALL ON FUNCTION nyckel_giltig(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE funktionsnyckel FROM anon;
    REVOKE ALL ON FUNCTION nyckel_giltig(text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE funktionsnyckel FROM authenticated;
    REVOKE ALL ON FUNCTION nyckel_giltig(text) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION nyckel_giltig(text) TO service_role;
    GRANT SELECT ON TABLE funktionsnyckel TO service_role;
  END IF;
END $$;

-- Första fyllningen: nyckeln ur arkivexportens jobb, med samma mönster som arbetsflödena läser den. Finns raden redan rörs den inte.
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND NOT EXISTS (SELECT 1 FROM funktionsnyckel) THEN
    SELECT substring(command from 'x-halkvakt-key[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)') INTO k FROM cron.job WHERE jobname = 'halkvakt-arkivexport';
    IF k IS NULL OR length(k) < 32 THEN RAISE EXCEPTION 'sql/054: nyckeln gick inte att läsa ur cron.job (halkvakt-arkivexport)'; END IF;
    INSERT INTO funktionsnyckel (id, nyckel) VALUES (1, k);
  END IF;
END $$;
