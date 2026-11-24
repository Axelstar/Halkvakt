-- 144: VÄGNUMREN VID SMÅVÄGSRÖSTENS OCH STORSTÄDERNAS PUNKTER (DECISIONS #962, kort #678). Bengt 24/11: "då vill jag att du hämtar
-- vägnummer på alla huvudvägar och småvägar".
--
-- Väglagssträckorna bär redan Trafikverkets vägnummer (road_conditions.road_number), och kandidatens punkter får sitt ur sträckan
-- (DECISIONS #739). Småvägsröstens vägar (smavagspunkt.vag är kuvösens löpnummer) och storstädernas punkter (stadspunkt bär gruppens
-- id) har inget. vagnummer_punkt bär ett svar per småvägsväg (kalla 'smavag', nyckel = smavagspunkt.vag) och per storstadspunkt
-- (kalla 'stad', nyckel = stadspunkt.punkt), skrivet av ingest/vagnummer-punkter.ts ur NVDB:s objekttyp Vägnummer i Trafikverkets
-- öppna API (CC0). Inga lägen står här, och tabellen används inte av rösten eller appen: det kräver ett eget beslut och Axels ord.
-- utfall: 'nummer' (huvudnummer satt), 'onumrerad' (inget Vägnummer vid punkterna), 'oenig' (punkterna eller objekten säger olika),
-- 'fel' (inga svar). Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).

CREATE TABLE IF NOT EXISTS vagnummer_punkt (
  kalla       text NOT NULL CHECK (kalla IN ('smavag', 'stad')),
  nyckel      text NOT NULL CHECK ((kalla = 'smavag' AND nyckel ~ '^v[0-9]{5,}$') OR (kalla = 'stad' AND nyckel ~ '^[BC][0-9]{5}$')),
  utfall      text NOT NULL CHECK (utfall IN ('nummer', 'onumrerad', 'oenig', 'fel')),
  huvudnummer integer CHECK (huvudnummer BETWEEN 1 AND 9999),
  europavag   boolean,
  fragade     integer NOT NULL CHECK (fragade >= 1),
  svar        integer NOT NULL CHECK (svar BETWEEN 0 AND fragade),
  lika        integer NOT NULL CHECK (lika BETWEEN 0 AND svar),
  hamtad      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kalla, nyckel),
  CHECK ((utfall = 'nummer') = (huvudnummer IS NOT NULL))
);

ALTER TABLE vagnummer_punkt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE vagnummer_punkt FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE vagnummer_punkt FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE vagnummer_punkt FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE vagnummer_punkt TO service_role;
  END IF;
END $$;

COMMENT ON TABLE vagnummer_punkt IS 'Vägnumren vid småvägsröstens vägar och storstädernas punkter (sql/144, DECISIONS #962), ur NVDB Vägnummer (CC0). Används inte av rösten.';
