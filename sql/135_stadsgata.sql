-- 135: STADENS GATOR — linjerna som kartan ritar storstädernas varningar längs (DECISIONS #935; Bengt 21/11: "Bygg linjer").
--
-- Kartan ritar kandidatens varningar som bitar av vägen längs Trafikverkets sträckor (KANDIDAT_BITAR_SQL, DECISIONS #579). Storstädernas
-- punkter (stadspunkt, sql/089) har ingen sådan sträcka och ritas sedan 20/11 som prickar (DECISIONS #928). Här får de en linje:
--   stadspunkt.element_id  vägen eller gatan punkten ligger på, ur kuvösens driftlista (halkvakt-kuvos F79): NVDB:s element för B
--                          ("1000:1289"), och för C "rutt:" med elementet eller "gata:" med gatunamnet. Laddaren skriver den
--                          (ingest/stadspunkter-db.ts); null tills den gjort det, och då ritas punkten som prick som förut.
--   stadsgata              elementets linje ur Trafikverkets öppna API (NVDB, licens CC0), skriven av scripts/stadsgator-hamta.ts skriv.
--                          En rad per element_id, delarna sammanslagna till en MultiLineString i WGS84.
-- Ingen förardata. Ingenting här är kuvösens särdrag: bara id:t och vägens linje. Idempotent. service_role får sina rättigheter i samma
-- fil (DECISIONS #653), anon och authenticated ingenting.
ALTER TABLE stadspunkt ADD COLUMN IF NOT EXISTS element_id text;
CREATE INDEX IF NOT EXISTS stadspunkt_element ON stadspunkt (element_id);

CREATE TABLE IF NOT EXISTS stadsgata (
  element_id  text PRIMARY KEY,
  geom        geometry(MultiLineString, 4326) NOT NULL,
  hamtad_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stadsgata_geom ON stadsgata USING gist (geom);

ALTER TABLE stadsgata ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE stadsgata FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE stadsgata FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE stadsgata FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE stadsgata TO service_role; END IF;
END $$;
