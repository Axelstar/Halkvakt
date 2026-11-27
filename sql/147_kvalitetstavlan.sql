-- 147: KVALITETSTAVLAN (kort #682, DECISIONS #973; reglerna i docs/TROSKLAR-KVALITETSTAVLAN.md). En redovisning, ingen grind:
-- ingenting här ändrar vad som talar.
--
-- VAD SOM SPARAS. scripts/kvalitetstavlan.ts (flödet kvalitetstavlan.yml) räknar per svenskt dygn hur väl varje lager varnade, mätt
-- mot friktionen, väglaget, kamerorna och singelolyckorna, och skriver bara aggregat: en rad per dygn, lager, källa och mått, med
-- nämnaren n och täljaren k.
--   lager  A1 · A2 · K · R (småvägsrösten) · HV (Halkvakt som helhet) · J1 (snöflingan) · '-' (källans egna tal)
--   kalla  FR (friktionen) · VL (väglaget) · KA (kamerorna) · ALLA · OL (singelolyckorna) · LF (lägesfilen)
--   matt   tackning · traff · traff_samma · bas · risk_varn · risk_utan (n = fordonskm, för R punkttimmar; k = olyckor) ·
--          oenig · v3 · underlag
-- Skriptet raderar sina dygn och skriver dem på nytt i en transaktion, så en omräkning ger samma rader. Adminfunktionen läser tabellen.
--
-- KOSTNADEN. Några hundra rader per dygn. RLS på; inga rättigheter för anon och authenticated.

CREATE TABLE IF NOT EXISTS kvalitet_dag (
  dag         date NOT NULL,                      -- svenskt dygn
  lager       text NOT NULL CHECK (lager IN ('A1', 'A2', 'K', 'R', 'HV', 'J1', '-')),
  kalla       text NOT NULL CHECK (kalla IN ('FR', 'VL', 'KA', 'ALLA', 'OL', 'LF')),
  matt        text NOT NULL CHECK (matt IN ('tackning', 'traff', 'traff_samma', 'bas', 'risk_varn', 'risk_utan', 'oenig', 'v3', 'underlag')),
  n           double precision NOT NULL CHECK (n >= 0),
  k           double precision NOT NULL CHECK (k >= 0),
  skriven_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, lager, kalla, matt)
);
COMMENT ON TABLE kvalitet_dag IS 'Kvalitetstavlan (sql/147, DECISIONS #973, docs/TROSKLAR-KVALITETSTAVLAN.md): aggregat per svenskt dygn, lager, källa och mått. En redovisning, aldrig en röst. Bara service-rollen.';

ALTER TABLE kvalitet_dag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kvalitet_dag FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kvalitet_dag FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kvalitet_dag FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE kvalitet_dag TO service_role;
  END IF;
END $$;
