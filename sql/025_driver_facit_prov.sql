-- 025: provrader i förarfacit märks och utesluts — raderas inte (kort #196, Bengt + Axel 17/9, DECISIONS #226/#227).
--
-- HÅLET. driver_facit bar två PROV (Android "prov" 16/9 03:07Z och ett serverprov i iOS-format, "cam:prov-ios" 11:47Z)
-- och noll riktiga svar — men vakthunden och skuggrapporten räknade båda som svar. Serverprovet går inte att skilja
-- från ett riktigt svar på plattform eller version.
--
-- HUR. En GENERERAD kolumn: prov = varnings-id:t innehåller "prov". Definitionen finns på ett enda ställe — ingen
-- kopia i funktionerna som kan glida isär (läxan bakom kontraktsgrinden) — och den märker också framtida prov utan
-- kod. Läsarna räknar bara rader där prov är falskt. Raderna raderas inte: de är spårbara och beslutet går att ångra.
-- Motorns varnings-id har formen typ:id ur Trafikverkets och SMHI:s nycklar; dbknapp-beviset visar vilka rader som
-- märks, så ett riktigt id som råkar innehålla "prov" skulle synas där.
--
-- Additiv och idempotent. Körs med dbknapp (atgard migrera) FÖRE deployen av vakthund och skuggrapport.
ALTER TABLE driver_facit ADD COLUMN IF NOT EXISTS prov boolean
  GENERATED ALWAYS AS (strpos(lower(alert_id), 'prov') > 0) STORED;
