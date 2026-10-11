-- 050: synkprovets tabell (DECISIONS #534). Bilen kör i GitHub Actions (favoritprov-synk.yml, pulsklockan :18/:48) och skriver en rad
-- per körning hit; favoritprovet (:08/:38) speglar de senaste raderna till hinken `favoritprov` (synk.json, synk-historik.json), där
-- visningen läser dem. Raden bär bara skuggans rutter och öppna data, inga förare. Skriptet raderar rader äldre än två dygn.
-- Låst för anon och authenticated som shadow_log_c (sql/046): bara tjänstenyckeln och DATABASE_URL når den.
CREATE TABLE IF NOT EXISTS favoritprov_synk (
  id bigserial PRIMARY KEY,
  t timestamptz NOT NULL DEFAULT now(),
  rapport timestamptz,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS favoritprov_synk_t_idx ON favoritprov_synk (t DESC);
ALTER TABLE favoritprov_synk ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON favoritprov_synk FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON favoritprov_synk FROM authenticated; END IF;
END $$;
