-- KORT #235 I DRIFT (22/9 2026). Bärare: sql/018_trend_berakna.sql (CREATE OR REPLACE, idempotent). Sats 2: funktionskroppen i
-- pg_proc bär ramarna och inte lateralen. Sats 3: livets anrop (2 h, samma som ingest-live varje minut, skriver med ON CONFLICT
-- DO NOTHING) och dess tid. Sats 4–5: efter 90 s, ingest-lives egna svar sedan bytet — trendfältet ska vara "N nya, M utfall",
-- aldrig "FEL".
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/018_trend_berakna.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT position('EXCLUDE CURRENT ROW' in prosrc) > 0 AS ramarna, position('CROSS JOIN LATERAL' in prosrc) > 0 AS lateralen FROM pg_proc WHERE proname = 'berakna_trendkandidater'

SELECT t.nya, t.utfall, round(extract(epoch FROM clock_timestamp() - statement_timestamp())::numeric, 2) AS sekunder FROM berakna_trendkandidater(interval '2 hours') t

SELECT pg_sleep(90) IS NULL AS vantat

SELECT id, created, substring(content from '"trend":"[^"]*"') AS trend FROM net._http_response WHERE content LIKE '%"trend":%' AND created > now() - interval '85 seconds' ORDER BY id DESC LIMIT 5
