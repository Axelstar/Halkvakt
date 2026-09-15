-- 020: trendkandidaternas lutningar avrundas i arkivet (15/9 2026, Bengts ja, DECISIONS #194).
--
-- VAD SOM HITTADES. Värdevakten (DECISIONS #192) visade lutning30_c med minimum −0,7999999999999998 —
-- en binär flyttalsrest i en numeric-kolumn. Skrivaren i TypeScript (scripts/trendarkivet.ts via
-- publish/trenden.ts) avrundar till tre decimaler sedan 13/9 14:47 (9b6b317, flyttalsläxan), men
-- tabellen föddes 14:21 och den första knappkörningen skrev innan avrundningen fanns. SQL-vägen
-- (018, berakna_trendkandidater) räknar i numeric och är exakt. Resten är alltså ett fåtal rader
-- från ett fönster på 26 minuter — men en tröskel på 0,8 skiljer −0,8 från −0,79999, och S2 ska
-- sätta trösklar på just de här fälten.
--
-- Idempotent: rundar bara rader som inte redan är rundade; en omkörning rör noll rader.
UPDATE trend_kandidater
SET lutning15_c     = round(lutning15_c, 3),
    lutning30_c     = round(lutning30_c, 3),
    lutning60_c     = round(lutning60_c, 3),
    dagg_gap_c      = round(dagg_gap_c, 3),
    min_yta_90min_c = round(min_yta_90min_c, 3)
WHERE lutning15_c     IS DISTINCT FROM round(lutning15_c, 3)
   OR lutning30_c     IS DISTINCT FROM round(lutning30_c, 3)
   OR lutning60_c     IS DISTINCT FROM round(lutning60_c, 3)
   OR dagg_gap_c      IS DISTINCT FROM round(dagg_gap_c, 3)
   OR min_yta_90min_c IS DISTINCT FROM round(min_yta_90min_c, 3);
