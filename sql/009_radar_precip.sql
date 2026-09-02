-- 009: radarpiloten i skugga (kort #43 steg 3, DECISIONS #60 — källbeslutet Axel + Bengt).
-- Händelsefiltrerad per planens §2: rader finns BARA när radarn ser nederbörd över ett
-- segment (rate_max ≥ 0,1 mm/h). Grids lagras aldrig. Fött låst: dubbellås som #30/#33,
-- rollvakten per 003-läxan (CI:s PostGIS saknar anon/authenticated).
CREATE TABLE IF NOT EXISTS radar_precip (
  segment_id text NOT NULL,
  observed_at timestamptz NOT NULL,   -- kompositens giltighetstid (5-min)
  rate_max_mmh numeric NOT NULL,      -- max regnintensitet över segmentets provpunkter
  rate_mean_mmh numeric NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, observed_at)
);
CREATE INDEX IF NOT EXISTS radar_precip_time_idx ON radar_precip (observed_at);
ALTER TABLE radar_precip ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE radar_precip FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE radar_precip FROM authenticated;
  END IF;
END $$;
