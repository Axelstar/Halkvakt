-- 128: THE SMALL ROADS' MOISTURE FLAGS (DECISIONS #908, körlistan C7; the preregistration signed as halkvakt-kuvos F75, its §2.3 and §12
-- point 3). Two flags beside ned in smavag_live, written by the kuvös chain with the hour's rows (ingest/smavag-live-db.ts skriv):
--   rim  the hoar-frost state of the variant N3+rim, as the kuvös chain counts it for the point and hour
--   n6   precipitation in the hour or the six before, the variant N6
-- Both are nullable: NULL means not counted (a row written before the chain carried the flags), never false (sql/043).
-- A SHADOW, NEVER A VOICE (F75 §3). smavag_regel() and smavag_talar() read only ned and are not created or replaced here; the voice,
-- live.json and the app are unchanged. Only the hour's file to the private bucket reads the flags (kuvos-smavag-timme.yml, the file
-- fukt_<hour>.csv.gz), for the pace along the small roads and the accident facit.
-- The table's rights are sql/105's: the service role has the whole table, so it has the new columns. scripts/vardevakten.ts knows the
-- table and its flags. ORDER: after sql/105; before the kuvös chain writes the flags. BACK: drop the two columns. Idempotent.

ALTER TABLE smavag_live ADD COLUMN IF NOT EXISTS rim boolean, ADD COLUMN IF NOT EXISTS n6 boolean;
COMMENT ON COLUMN smavag_live.rim IS 'The variant N3+rim''s hoar-frost state for the point and hour, from the kuvös chain (sql/128, DECISIONS #908, halkvakt-kuvos F75). NULL = not counted. No rule reads it.';
COMMENT ON COLUMN smavag_live.n6 IS 'The variant N6: precipitation in the hour or the six before, from the kuvös chain (sql/128, DECISIONS #908, halkvakt-kuvos F75). NULL = not counted. No rule reads it.';
