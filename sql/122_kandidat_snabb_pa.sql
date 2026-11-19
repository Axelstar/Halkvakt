-- 122: KANDIDATEN PÅ EN KVART — PÅ (DECISIONS #782 punkt 5, kort #373). Bengts beslut om påslaget. En rad i kandidat_snabb_talar
-- (sql/121): från nästa publicering talar den snabba när den är färsk och fullständig, annars timvärdet som förut (#782 punkt 3).
-- Skuggan 7/11 08 – 19/11 06 UTC: 0,81 gånger så många utfallsbyten som timvärdet (högst 1,5), avvikelsen vid :47 0,00 °C i median.
-- AV: en ny rad med talar = 'av' och beslutets nummer, i samma form. Raderna tas aldrig bort; den senaste avgör.
-- Körs en gång med DB-knappen (atgard=migrera), efter sql/121 och på Bengts ord. En andra körning lägger en likadan rad, och den
-- senaste avgör ändå.

INSERT INTO kandidat_snabb_talar (talar, beslut, korning)
VALUES ('pa', 'DECISIONS #782', 'skuggan 7/11 08 – 19/11 06 UTC (ny_kandidat_skugga_snabb, 282 timmar, 3 049 körningar)');
