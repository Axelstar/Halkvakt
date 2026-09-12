-- 015: SMHI-varningarnas giltighetsfönster in i arkivet (kort #95 d, DECISIONS #121, 2026-09-12).
--
-- HÅLET. smhi_warnings (nuläget) bär approx_start och approx_end — men den tabellen TÖMS och
-- skrivs om vid varje synk ("replace-all: feed IS the current truth", ingest/db.ts:243). Arkivet
-- smhi_warnings_history har sedan 001_init burit allt UTOM just de två fälten. Arkivet vet alltså
-- NÄR en varning publicerades, men inte NÄR den gällde.
--
-- VARFÖR DET SPELAR ROLL. SMHI publicerar i förväg: en snöfallsvarning som publiceras kl 14 kan
-- gälla 22–06. Förstärkarregeln (#95 d) frågar "låg stationen under en AKTIV vintervarning när
-- ytan var nära noll", och den frågan går inte att besvara med publiceringstiden. Utan de här två
-- fälten är parametern F4 i TROSKLAR-SMHI-FORSTARKAREN omätbar.
--
-- VARFÖR NU OCH INTE I DECEMBER. Fälten går INTE att hämta i efterhand — SMHI:s API ger bara
-- nuläget, och historikraderna är redan skrivna utan dem. Varje dygn som går utan den här
-- migrationen är ett dygn vinterunderlag som aldrig kan lagas. Samma logik som grind T-A:s
-- frostnätter: det som inte mäts när det händer finns inte.
--
-- Gamla rader får NULL och ska räknas som "okänt giltighetsfönster", ALDRIG som "gällde inte"
-- (TROSKLAR-SMHI-FORSTARKAREN §3.1, och F-C3 kräver att andelen okända redovisas i varje dom).
--
-- Additiv och idempotent: ligger i ingest/db.ts automigration och kan köras hur många gånger
-- som helst. Rör inga roller, så ingen pg_roles-vakt behövs (läxan från 003).

ALTER TABLE smhi_warnings_history ADD COLUMN IF NOT EXISTS approx_start timestamptz;
ALTER TABLE smhi_warnings_history ADD COLUMN IF NOT EXISTS approx_end   timestamptz;

-- Förstärkarens fråga är alltid "vilka varningar gällde vid tidpunkt t".
CREATE INDEX IF NOT EXISTS smhi_hist_giltighet_idx
  ON smhi_warnings_history (approx_start, approx_end);
