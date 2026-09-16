-- 021: efterhalkans indata per station i skuggloggen (bedömning v3 S1, Bengts "bygg S1 nu" 16/9, DECISIONS #198).
--
-- S1 = skuggan läser N4:s råa fält (regn_h, lutning15/30/60, DECISIONS #188) vid sidan av motorn och loggar dem
-- per station i ruttens korridor, tillsammans med om motorn faktiskt larmade på stationen. Ingen tröskel, inget
-- villkor: S2 (E på K2) sätter villkoret senare, och då kan varje rad här spelas upp mot det. Att bygga in ett
-- villkor nu vore att lägga tröskeln i mätningen — samma fel som V-B3 per regndygn i loggen (Axel 16/9, #196).
--
-- Axels grind (#196): S1 körs INNAN något mer byggs på regn_h, för regntäckningen 13 % gör regn_h till
-- efterhalkans osäkra halva. Raden är alltså underlaget för att döma regn_h, inte ett larm.
-- En jsonb-lista per körning: [{id, yta, fukt, regn_h, lutning15, lutning30, lutning60, larm}]. Tom tills
-- weather[] har en station ≤ 3 °C i korridoren — i september är den tom, och det är rätt.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS efterhalka jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shadow_log.efterhalka IS 'S1 (DECISIONS #198): N4:s råa fält per station i korridoren + om motorn larmade. Underlag för S2, aldrig ett larm.';
