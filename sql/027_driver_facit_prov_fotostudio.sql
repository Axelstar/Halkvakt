-- 027: fotostudions svar märks som prov (kort #205, Bengts "kör" 20/9 2026, DECISIONS #242).
--
-- HÅLET. Kolumnen prov (sql/025, kort #196) matchar bara ordet "prov" i varnings-id:t. Fotostudio-kroken i båda apparna
-- (-fotostudio_facit på iOS, fotostudio_facit på Android; bara debug-byggen) lägger in varningen "cam:fotostudio", och ett
-- tryck på Stämde skickar ett RIKTIGT anrop. Raden landade därmed som ett riktigt förarsvar — just den rad som ska bevisa
-- S4 ("ett riktigt svar från en riktig telefon"), och KB-D6 säger att provrader aldrig räknas.
--
-- VARFÖR NU. Byggordning C (Bengt 20/9): sändkanalen bevisas i simulatorn med ett tryck i stället för med en egen
-- TestFlight-omgång. Med den här märkningen blir trycket beviset i stället för fällan.
--
-- HUR. En genererad kolumns uttryck går inte att ändra på plats i alla Postgres-versioner, så kolumnen tas bort och
-- läggs tillbaka i samma transaktion. Inget annat databasobjekt rör prov (inga index, inga vyer); vakthunden och
-- skuggrapporten läser bara kolumnens namn. Värdena räknas om ur alert_id — inget går förlorat.
--
-- Idempotent: en omkörning ger samma kolumn med samma värden. Kräver 022 och 025.
ALTER TABLE driver_facit DROP COLUMN IF EXISTS prov;
ALTER TABLE driver_facit ADD COLUMN prov boolean
  GENERATED ALWAYS AS (strpos(lower(alert_id), 'prov') > 0 OR strpos(lower(alert_id), 'fotostudio') > 0) STORED;
