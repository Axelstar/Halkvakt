-- 050: KANDIDATEN LIVE (kort #343 steg 3, DECISIONS #556, #558): NIVÅ 2+BLANDNING räknad levande vid stationerna och
-- väglagspunkterna, i två steg som replikan räknar (fysik/kuvos_replica.py).
--   kandidat_ph    del A, var sjätte timme (fysik/live/kandidat_fysik.py i Actions): fysikens yta och rättelsen (PH) per punkt
--                  för timmarna R+6…R+11 efter körningen R (00, 06, 12, 18 UTC) — +6 h-klassen, som kuvösen prövade (#519).
--   kandidat_live  del B, varje timme (fysik/live/kandidat_timme.py): grannarnas fel, RÅ, ankaravståndet och blandningen (PB),
--                  kandidatens värde vid timmen. Skuggan loggar den bredvid RÅ (steg 7) och publiceringen läser den (steg 6).
-- Punkten är stationens id eller "v" + väglagspunktens radnummer (fysik/live/indata.py). Talen är avrundade som filerna.
--
-- GALLRINGEN hålls kort: 13 814 punkter i timmen är 330 000 rader om dygnet, och databasens gratisnivå går i skrivskydd vid
-- 500 MB (DECISIONS #511). PH behålls två dygn, värdet tre; vinterns facit bor i skuggloggen, inte här. gallra_kandidat() körs
-- av timjobbet efter varje skrivning. Ingen app läser tabellerna; bara service-rollen (och databasens ägare i Actions) når dem.
CREATE TABLE IF NOT EXISTS kandidat_ph (
  korning timestamptz NOT NULL,          -- körningen R som timmen räknades på
  tid timestamptz NOT NULL,              -- timmen (UTC)
  punkt text NOT NULL,
  ts_fysik real,                         -- fysikens yta (°C)
  ph real,                               -- fysiken + rättelsen (°C)
  PRIMARY KEY (tid, punkt)
);
CREATE TABLE IF NOT EXISTS kandidat_live (
  tid timestamptz NOT NULL,
  punkt text NOT NULL,
  ph real,
  pg real,                               -- PH + grannarnas fel
  ra real,                               -- RÅ vid punkten (NULL utan ankare inom 50 km)
  ank_km real,                           -- närmaste bidragande ankare (km)
  pb real,                               -- blandningen: kandidatens värde
  PRIMARY KEY (tid, punkt)
);
CREATE INDEX IF NOT EXISTS kandidat_live_tid ON kandidat_live (tid);

ALTER TABLE kandidat_ph ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_live ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_ph, kandidat_live FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_ph, kandidat_live FROM authenticated;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION gallra_kandidat() RETURNS bigint AS $$
DECLARE n bigint := 0; m bigint;
BEGIN
  DELETE FROM kandidat_ph WHERE tid < now() - interval '2 days';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  DELETE FROM kandidat_live WHERE tid < now() - interval '3 days';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
REVOKE ALL ON FUNCTION gallra_kandidat() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION gallra_kandidat() TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kandidat_ph, kandidat_live TO service_role;
  END IF;
END $$;
