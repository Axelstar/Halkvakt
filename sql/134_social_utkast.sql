-- 134: utkasten till Halkvakt live (DECISIONS #937). Idempotent.
-- Dagslägets inlägg ritas 30 minuter före passet (halkvakt-utkast.yml) och läggs här. Admin-sidan Sociala medier → Inlägg
-- (edge-funktionen admin, menyvalet social) kan ändra texten eller slänga utkastet, och posta.mjs skicka läser raden när
-- passet går: slängt ⇒ inget postas, ändrad text ⇒ den postas. Bilden ändras inte här. Larmen går inte via tabellen.
-- status: vantar → postad, eller vantar → slangd (och tillbaka till vantar med Ångra, så länge passet inte har gått).
CREATE TABLE IF NOT EXISTS social_utkast (
  namn text PRIMARY KEY,
  typ text NOT NULL,
  pass text NOT NULL,
  postas timestamptz NOT NULL,
  antal int,
  text text NOT NULL,
  text_ig text NOT NULL,
  status text NOT NULL DEFAULT 'vantar' CHECK (status IN ('vantar', 'slangd', 'postad')),
  andrad timestamptz,
  andrad_av text,
  skapad timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE social_utkast ENABLE ROW LEVEL SECURITY;

-- Låst dubbelt: RLS utan policy och REVOKE. Bara service_role (admin-funktionen) och flödets egen anslutning når tabellen.
REVOKE ALL ON TABLE social_utkast FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE social_utkast FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE social_utkast FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE social_utkast TO service_role;
  END IF;
END $$;
