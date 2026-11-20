-- 131: utskicket av notiser (DECISIONS #924; Axel 20/11). Idempotent.
-- En rad är ETT utskick: till en telefon (provet), en kommun eller ett län. Funktionen app-push läser de öppna raderna, skickar
-- till telefonerna i app_enhet som har en notisadress, och skriver hur många som gick och föll. Ingen rad per telefon sparas:
-- det finns ingen logg över vem som fått vad. Bara SQL med tjänsterollen kan lägga ett utskick; appen och webben kan det inte.
CREATE TABLE IF NOT EXISTS push_utskick (
  id bigserial PRIMARY KEY,
  slag text NOT NULL CHECK (slag IN ('prov', 'varning', 'erbjudande')),
  enhet uuid,                                      -- provet: en enda telefon
  kommun text CHECK (kommun ~ '^[0-9]{4}$'),
  lan text CHECK (lan ~ '^[0-9]{2}$'),
  rubrik text NOT NULL CHECK (length(rubrik) BETWEEN 1 AND 60),
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 180),
  skapad timestamptz NOT NULL DEFAULT now(),
  klar timestamptz,
  skickade integer,
  fallna integer,
  fel text,
  -- Exakt ett mål. Ett prov går bara till en telefon, så att ett prov aldrig når förarna.
  CHECK (num_nonnulls(enhet, kommun, lan) = 1),
  CHECK (slag <> 'prov' OR enhet IS NOT NULL)
);
ALTER TABLE push_utskick ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE push_utskick FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE push_utskick FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE push_utskick FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE push_utskick TO service_role;
    GRANT USAGE, SELECT, UPDATE ON SEQUENCE push_utskick_id_seq TO service_role;
  END IF;
END $$;
