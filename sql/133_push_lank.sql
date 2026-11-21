-- 133: länkens regel i push_utskick gick inte att använda (DECISIONS #926). Idempotent.
-- sql/132 skrev regeln med upprepningen {4,300}, och Postgres tar högst 255. Felet syns först när en rad med en länk läggs in,
-- så migrationen gick igenom och det första erbjudandet föll (20/11). Regeln skrivs om med längden för sig.
ALTER TABLE push_utskick DROP CONSTRAINT IF EXISTS push_utskick_lank_check;
ALTER TABLE push_utskick DROP CONSTRAINT IF EXISTS push_utskick_lank;
ALTER TABLE push_utskick ADD CONSTRAINT push_utskick_lank CHECK (lank ~ '^https://[^\s]+$' AND length(lank) <= 300);
