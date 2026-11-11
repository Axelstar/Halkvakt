-- 090: RADARN FÖR STORSTÄDERNAS PUNKTER (DECISIONS #804, kort #378). Kandidatens regel kräver fukt: Våt på Trafikverkets sträcka
-- eller radarregn ≥ 0,1 mm/h på sträckan (radar_precip, sql/009). Stadspunkterna (sql/089) har ingen Trafikverkets sträcka, så utan
-- den här tabellen hade de aldrig fått fukt och K aldrig talat där.
--
-- ingest/radar.ts läser radarn i varje stadspunkt i samma komposit som radar_precip (radar-karna.ts gruppRader) och skriver max och
-- medel per grupp, händelsefiltrerat (bara grupper med regn ≥ 0,1 mm/h, som radar_precip). radar_precip rörs inte: publiceringen,
-- vakthunden, sql/069 och arkivexporten läser den som förut.
-- Gallring: regeln läser bara den senaste timmen, så radar.ts tar bort rader äldre än två dygn (gratisnivåns databasstorlek). Ingen
-- förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS radar_stad (
  grupp          text NOT NULL CHECK (grupp ~ '^[BC]-'),
  observed_at    timestamptz NOT NULL,       -- kompositens giltighetstid
  rate_max_mmh   numeric NOT NULL,           -- max regnintensitet över gruppens punkter
  rate_mean_mmh  numeric NOT NULL,
  ingested_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupp, observed_at)
);
CREATE INDEX IF NOT EXISTS radar_stad_time_idx ON radar_stad (observed_at);
ALTER TABLE radar_stad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE radar_stad FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE radar_stad FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE radar_stad FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE radar_stad TO service_role; END IF;
END $$;
