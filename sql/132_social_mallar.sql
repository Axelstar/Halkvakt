-- 132: textmallarna till Halkvakt live (DECISIONS #919). Idempotent.
-- Standardtexterna står i marknadsforing/mallar.json. En rad här skriver över en mall med samma nyckel, och posta.mjs läser
-- raderna varje gång ett inlägg ritas eller skickas. Admin-sidan Sociala medier → Mallar (edge-funktionen admin, menyvalet
-- social) skriver dem; att ta bort raden återställer standardtexten.
CREATE TABLE IF NOT EXISTS social_mallar (
  nyckel text PRIMARY KEY,
  text text NOT NULL,
  andrad timestamptz NOT NULL DEFAULT now(),
  andrad_av text
);
ALTER TABLE social_mallar ENABLE ROW LEVEL SECURITY;

-- Låst dubbelt: RLS utan policy och REVOKE. Bara service_role (admin-funktionen) och flödenas egen anslutning når tabellen.
REVOKE ALL ON TABLE social_mallar FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE social_mallar FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE social_mallar FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE social_mallar TO service_role;
  END IF;
END $$;
