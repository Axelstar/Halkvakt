-- 106: SMÅVÄGSRÖSTENS PUNKTFIL (DECISIONS #828, kort #647; byggsteg 5b). Bengt 10/11: "Ja, var för sig"; 11/11: "sen 3".
--
-- Punkternas lägen står i en egen fil, som appen bara hämtar när den ändras. I live.json står en bit per punkt i filens ordning
-- (publish/snapshot-core.ts, nyckeln smavag), och bara när någon brytare är på. Filen byggs av laddaren (ingest/smavagspunkter-db.ts)
-- i samma transaktion som punkterna, så att filen och tabellen smavagspunkt aldrig går isär. Ordningen är
-- smavagspunkt ORDER BY punkt COLLATE "C", samma som bitarna.
--
-- Publiceringen (supabase/functions/publicera) laddar upp filen till hinken (app/v1/smavag.json) och kartrepot
-- (data/app/v1/smavag.json) bara när sha:n är ny. i_hinken och i_github säger vilken sha som ligger där; laddaren nollar dem när
-- filen ändras. En rad. Lägena kommer ur Lastkajen (CC0) och får vara publika (#828); särdragen bor kvar i kuvösen.
-- Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS smavag_punktfil (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sha256      text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  punkter     int NOT NULL CHECK (punkter >= 0),
  bytes       int NOT NULL CHECK (bytes > 0),
  gz_bytes    int NOT NULL CHECK (gz_bytes > 0),
  json        text NOT NULL,
  skriven_at  timestamptz NOT NULL DEFAULT now(),
  i_hinken    text,                                       -- sha:n som ligger i hinken
  i_github    text                                        -- sha:n som ligger i kartrepot
);

ALTER TABLE smavag_punktfil ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE smavag_punktfil FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE smavag_punktfil FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE smavag_punktfil FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE smavag_punktfil TO service_role; END IF;
END $$;
