-- 104: RADARN FÖR SMÅVÄGSRÖSTENS PUNKTER (DECISIONS #828, kort #647; sql/103). Rösten väcks av nederbörd: MET Nordic per punkt, och
-- radarn där den finns. Småvägspunkterna har ingen Trafikverkets sträcka, så radar_precip når dem inte.
--
-- ingest/radar.ts läser radarn i varje småvägspunkt i samma komposit som radar_precip och radar_stad (radar-karna.ts gruppRader) och
-- skriver max och medel per bit, händelsefiltrerat (bara bitar med regn ≥ 0,1 mm/h, som radar_precip och radar_stad). En bit är högst
-- fem punkter i följd längs en väg (radar-karna.ts SMAVAG.BIT), alltså högst omkring 5 km: en hel väg är för grov (den längsta har
-- nära hundra punkter), och en rad per punkt hade gett nästan tre gånger så många rader var 15:e minut.
-- Gallring: regeln läser bara den senaste timmen, så radar.ts tar bort rader äldre än två timmar (gratisnivåns databasstorlek; radarn
-- skrivs var 15:e minut). radar_precip och radar_stad rörs inte. Ingen förardata. Idempotent. service_role får sina rättigheter i samma
-- fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS radar_smavag (
  bit            text NOT NULL CHECK (bit ~ '^v[0-9]{5,}-[0-9]+$'),
  observed_at    timestamptz NOT NULL,       -- kompositens giltighetstid
  rate_max_mmh   numeric NOT NULL,           -- max regnintensitet över bitens punkter
  rate_mean_mmh  numeric NOT NULL,
  ingested_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bit, observed_at)
);
CREATE INDEX IF NOT EXISTS radar_smavag_time_idx ON radar_smavag (observed_at);
ALTER TABLE radar_smavag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE radar_smavag FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE radar_smavag FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE radar_smavag FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE radar_smavag TO service_role; END IF;
END $$;
