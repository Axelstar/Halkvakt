-- 024: när en SMHI-varning FÖRSVINNER ur flödet (kort #199, Bengts ja 17/9, DECISIONS #224/#225).
--
-- HÅLET. smhi_warnings_history sparar varje publicering (area_id, published) — men inte när varningen
-- försvinner ur flödet. En varning som SMHI drar tillbaka i förtid ser i arkivet ut att gälla till
-- approx_end, och SMHI-förlängningen (N_varning, TROSKLAR-OVERGANGAR §2.3) skulle då förlänga efterhalkan
-- under en varning som inte längre fanns.
--
-- VARFÖR NU. Samma läxa som sql/015: det går INTE att hämta i efterhand — SMHI:s API ger bara nuläget.
-- Varje vintervarning som försvinner innan detta finns är en som aldrig kan lagas.
--
-- HUR. `senast_sedd` = tidpunkten för den senaste synk där raden fanns i flödet. `smhi_synk` = en rad per
-- lyckad synk, så att "varningen försvann" går att skilja från "ingen synk kördes" (avbrott) och från
-- "flödet var tomt". En varning räknas som borta från den första synk efter sin `senast_sedd`.
--
-- Additiv och idempotent: ligger i ingest/db.ts automigration. Den nya tabellen föds låst med rollvakten
-- (003-läxan: CI:s slit-och-släng-PostGIS saknar anon/authenticated).
ALTER TABLE smhi_warnings_history ADD COLUMN IF NOT EXISTS senast_sedd timestamptz;

CREATE TABLE IF NOT EXISTS smhi_synk (
  synkad_at timestamptz PRIMARY KEY,   -- transaktionens now(), samma stämpel som senast_sedd får
  varningar int NOT NULL               -- antal rader i flödet vid synken (0 = tomt flöde, inte avbrott)
);

ALTER TABLE smhi_synk ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE smhi_synk FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE smhi_synk FROM authenticated;
  END IF;
END $$;
