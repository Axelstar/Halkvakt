-- 022: förarfacit — betatestarnas "stämde det?" (bedömning v3 S4; DECISIONS #186 punkt 2, Axels design #196,
-- Bengts "kör S4" 16/9, DECISIONS #201).
--
-- VAD SOM SPARAS, och inget annat: varnings-id (motorns hazardId), när varningen talade, svaret (ja/nej),
-- plattform och appversion. Ingen identitet, ingen position, ingen resa. MEN ÄRLIGT: ett varnings-id pekar på
-- en fara med koordinat och alert_t säger när — ett svar är alltså en plats och en tid. Det står ordagrant i
-- produktbokens Om-avsnitt, och knappen finns bara för betatestare som själva slagit på den (#186).
--
-- Skrivs enbart av edge-funktionen facit-svar (service role). Dubbellåst som arkivet (002-läxan): RLS utan
-- policy + REVOKE, så en klickruta i panelen aldrig kan öppna svaren för läsning via REST.
-- Omsändning (appen skickar när bilen står stilla) får aldrig dubblera: nyckeln är (alert_id, alert_t, app),
-- och ett nytt svar på samma varning ersätter det förra — förarens senaste ord gäller.
CREATE TABLE IF NOT EXISTS driver_facit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id text NOT NULL,                                  -- motorns hazardId, t.ex. "wx:2135" eller "seg:16010"
  alert_t timestamptz NOT NULL,                            -- när varningen talade (appens klocka, UTC)
  svar text NOT NULL CHECK (svar IN ('ja', 'nej')),        -- Stämde / Stämde inte
  app text NOT NULL CHECK (app IN ('android', 'ios')),
  version text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, alert_t, app)
);
CREATE INDEX IF NOT EXISTS driver_facit_received_idx ON driver_facit (received_at);

ALTER TABLE driver_facit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE driver_facit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE driver_facit FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE driver_facit IS 'S4 (DECISIONS #201): betatestarnas svar per varning. Skrivs bara av facit-svar; läses aldrig via REST.';
