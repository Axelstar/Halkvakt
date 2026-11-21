-- 136: menyvalet Olyckor på admin.halkvakt.se (DECISIONS #936). Idempotent.
-- Olycksfacit fick ett eget menyval (Bengt 21/11: alternativ A, "kalla den olyckor"). De konton som redan ser statistiken får det
-- en gång här; därefter ges och tas det på sidan Användare som de andra menyvalen.
UPDATE admin_behorighet SET menyval = array_append(menyval, 'olyckor')
WHERE 'statistik' = ANY (menyval) AND NOT 'olyckor' = ANY (menyval);
