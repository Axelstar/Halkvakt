-- 132: erbjudandets avsändare och länk i utskicket (DECISIONS #926; Axel 20/11). Idempotent.
-- Ett tryck på ett erbjudande öppnar ett blad i appen som säger vem det kommer från och har en länk dit. Därför bär ett
-- erbjudande partnerns namn och en https-länk, och inget annat slag får bära dem.
ALTER TABLE push_utskick ADD COLUMN IF NOT EXISTS partner text CHECK (length(partner) BETWEEN 1 AND 40);
ALTER TABLE push_utskick ADD COLUMN IF NOT EXISTS lank text;   -- regeln för länken står i sql/133: den första här gick inte att använda
ALTER TABLE push_utskick DROP CONSTRAINT IF EXISTS push_utskick_erbjudande;
ALTER TABLE push_utskick ADD CONSTRAINT push_utskick_erbjudande
  CHECK ((slag = 'erbjudande') = (partner IS NOT NULL) AND (slag = 'erbjudande') = (lank IS NOT NULL));
