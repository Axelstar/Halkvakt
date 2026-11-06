-- 088: OLYCKSFACIT, STEG 4 — veckans ärende (Bengt 6/11: "Slå ihop o bygg steg 4"; DECISIONS #802, kort #376). Reglerna står i
-- docs/TROSKLAR-OLYCKSFACIT.md §9 och gäller först när den delen är signerad: den här filen migreras efter signeringen, och efter
-- att funktionen olycksfacit är deployad med veckan.
--
-- Inget nytt jobb. Dagens jobb, halkvakt-olycksfacit-arende (sql/085, 05:17 UTC), anropar samma funktion, som efter dygnen skriver
-- ett ärende för varje ISO-vecka (måndag–söndag svensk tid) vars söndag är minst två dygn bort och vars olyckor alla är
-- kontrollerade, oftast på tisdagen. olycksfacit_veckor bokför vilka veckor som har fått sitt ärende.
-- Ingenting raderas. Ingen förardata läses. Idempotent.

CREATE TABLE IF NOT EXISTS olycksfacit_veckor (
  vecka       text PRIMARY KEY,                        -- ISO-veckan, ÅÅÅÅ-Vnn
  nr          int NOT NULL,                            -- ärendets nummer i Axelstar/Halkvakt
  forslag     int NOT NULL,                            -- återkommande förbättringsområden som ska ha en åtgärd
  stangd      boolean NOT NULL DEFAULT false,
  skapad_at   timestamptz NOT NULL DEFAULT now(),
  paminnd_at  timestamptz
);
ALTER TABLE olycksfacit_veckor ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE olycksfacit_veckor TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE olycksfacit_veckor FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE olycksfacit_veckor FROM authenticated;
  END IF;
END $$;
