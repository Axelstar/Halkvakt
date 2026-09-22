-- GRANNLÄNDERNA I SUPABASE (kort #238, Bengts princip 22/9: återkommande körningar tar inga Actions-minuter). Två cron-jobb
-- skapas som kopior av befintliga — kommandot (med nyckeln i headern) kopieras med replace() inne i databasen och skrivs
-- aldrig ut. Sats 2: publicera?land=grannar var 30:e minut (:05 och :35, mellan Sveriges :00/:10/…-körningar), så fi/no/dk
-- får färsk snapshot före sina skuggkörningar (fi :15/:45, dk :20/:50, no :25/:55). Sats 3: skuggmotorn för Norge.
-- cron.schedule med befintligt namn uppdaterar jobbet, så satserna är idempotenta. Sats 4 visar jobben utan kommando.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/022_driver_facit.sql, bevis = satserna) — EFTER deploy av publicera.

SET statement_timeout = '60s'

SELECT cron.schedule('halkvakt-publicera-grannar', '5,35 * * * *', replace(command, 'functions/v1/publicera''', 'functions/v1/publicera?land=grannar''')) AS jobid FROM cron.job WHERE jobname = 'halkvakt-publicera'

SELECT cron.schedule('halkvakt-skuggmotor-no', '25,55 * * * *', replace(command, 'skuggmotor?land=dk', 'skuggmotor?land=no')) AS jobid FROM cron.job WHERE jobname = 'halkvakt-skuggmotor-dk'

SELECT jobname, schedule, active, position('land=grannar' in command) > 0 AS grannar, position('land=no' in command) > 0 AS norge FROM cron.job WHERE jobname LIKE 'halkvakt-publicera%' OR jobname LIKE 'halkvakt-skuggmotor%' ORDER BY 1
