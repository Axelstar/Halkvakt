-- #127 (a), 13/9 2026: gör spärren synlig. Skuggloggen bar bara larm som ÖVERLEVDE regel 1b.
-- Det spärren kastade räknades inte och syntes inte. Nu en jsonb-lista per körning:
-- [{kind, id, distM, by, sinceS}] — vilken fara som tystades, av vad, med vilken marginal.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS suppressed jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shadow_log.suppressed IS '#127: vinnare som regel 1b (global spärr) kastade. Före 13/9 osynligt.';
