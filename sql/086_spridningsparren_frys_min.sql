-- 086: SKUGGKOLUMNEN frys_min för spridningsspärrens nya form (Bengt 6/11: "F1 vid 0,45"; DECISIONS #799, kort #377; kuvösens
-- spärrprov halkvakt-kuvos F26 och F28).
--
-- Kandidatens spridningsspärr i dag (sql/068, ny_kandidat_regel(); sql/058, kandidat_regel()): en punkt med minst två ankare tystas när
-- ankarnas yta skiljer 2,25 °C eller mer (n_ank, spr). Bytet till F1 tystar i stället när minoritetens andel av vikten 1/max(km, 1)
-- på andra sidan noll är minst 0,45. Det måttet finns inte i databasen, så det loggas först:
--   frys_min   minoritetens viktandel kring noll bland RÅ:s ankare (0–0,5; 0 med ett ankare; NULL utan ankare eller från en kedja som
--              inte räknar den). Den nya kandidatens del B skriver den (fysik/ny_kandidat/levande.py, frys_min()); den frystas del B
--              räknar den inte, och dess rader får NULL.
-- Regeln ändras INTE här: kolumnen är en skuggkolumn tills bytet beslutas (kort #377).
-- ORDNINGEN: den här filen migreras FÖRE att ingesten som skriver kolumnen (ingest/kandidat-db.ts, ingest/ny-kandidat-db.ts) slås
-- ihop — annars faller skrivningen av de levande värdena. Idempotent.

ALTER TABLE ny_kandidat_live ADD COLUMN IF NOT EXISTS frys_min real;
ALTER TABLE kandidat_live ADD COLUMN IF NOT EXISTS frys_min real;
COMMENT ON COLUMN ny_kandidat_live.frys_min IS 'Spridningsspärrens F1 (kort #377): minoritetens viktandel kring noll bland RÅ:s ankare. Skuggkolumn tills bytet.';
COMMENT ON COLUMN kandidat_live.frys_min IS 'Spridningsspärrens F1 (kort #377). Den frystas del B räknar den inte: NULL.';
