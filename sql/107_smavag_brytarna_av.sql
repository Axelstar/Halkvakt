-- 107: SMÅVÄGSRÖSTENS BRYTARE AV (DECISIONS #828, kort #647; avbrottsvillkoren i docs/FORSLAG-AVBROTT-SMAVAGSROSTEN-2026-11-11.md).
-- Slår av båda brytarna i smavagsbrytare (sql/103), P1 och N. Från nästa publicering saknas nyckeln smavag i live.json (publish/
-- snapshot-core.ts), och appen tiger för småvägarna. Punkterna, regeln, kedjan och skuggan rörs inte: skuggan räknar vidare med
-- brytarna av (smavag_regel). K, A1, A2 och storstäderna rörs inte.
-- KÖRS MED DB-KNAPPEN vid ett avbrott enligt villkoren. Varje körning ger en rad i STATUS och ett besked till Bengt.
-- TILLBAKA: påfilen, som byggs till påslaget med sina vakter. Idempotent.

UPDATE smavagsbrytare SET pa = false, andrad_at = now(), skal = 'av med sql/107 (DECISIONS #828)' WHERE pa;
