-- 016: luftfuktigheten in i fi.weather_latest (kort #46, DECISIONS #140, 2026-09-12).
--
-- TREDJE GÅNGEN SAMMA FÄLLA, och den ska skrivas ned en gång till eftersom den uppenbarligen
-- inte har fastnat:
--
--   sql/010  fi.weather_latest saknade dewpoint_c   — körning #24 föll på 42703
--   sql/013  no.weather_latest saknade humidity_pct — "samma fälla som fi (010)"
--   sql/016  fi.weather_latest saknar humidity_pct  — CI föll på 42703, igen
--
-- ORSAKEN ÄR STRUKTURELL, inte slarv i stunden. `public.weather_observations` har TIO fält;
-- `public.weather_latest` har NIO — den saknar dewpoint_c OCH humidity_pct. Grannschemana
-- skapas med `LIKE public.…  INCLUDING ALL`, så varje granntabell ÄRVER luckan. Lägger man till
-- ett fält i observations-vägen fungerar arkivet direkt, och latest-vägen faller på 42703 först
-- när koden körs.
--
-- REGEL ATT TA MED: ett nytt väderfält kräver TVÅ kolumner, inte en. Arkivet och nuläget.
-- Kontrollera latest-tabellen innan koden skrivs, inte efter att CI fällt den.

ALTER TABLE fi.weather_latest ADD COLUMN IF NOT EXISTS humidity_pct numeric;
