-- KUVÖSENS KLOCKA (kort #232, DECISIONS #424; docs/PLAN-KUVOSEN-2026-10-01.md steg 1).
--
-- Kuvösen kör produktionens egen kod — snapshotbyggaren, grindarna, uppspelningen — mot en gången vinter. Koden frågar databasen
-- vad klockan är (`now()`) och vad som är "senast". Två saker måste därför stämma, och ingen av dem får kräva en ändring i koden:
--
--   1. KLOCKAN. `kuvos.now()` svarar med kuvösens tid (inställningen `kuvos.nu`) i stället för väggklockan. En anslutning som
--      sätter `search_path = kuvos, public, pg_catalog` får den för varje okvalificerat `now()` — i frågetext OCH inuti
--      databasens egna funktioner — eftersom pg_catalog bara söks först när den INTE står i sökvägen.
--   2. FRAMTIDEN. Produktionens frågor säger bara "nyare än X", aldrig "äldre än nu": i driften finns ingen framtid. I kuvösen
--      ligger hela vintern i tabellerna, så utan skydd ser karantänen brott som inte hänt än, regn_h blir negativ och lutningen
--      hämtas ur nästa timme. Vyerna nedan visar varje tidsindexerad tabell SOM DEN SÅG UT vid kuvösens klocka.
--
-- Är `kuvos.nu` inte satt går klockan som väggklockan, och vyerna visar allt som har hänt — samma värld som produktionen.
--
-- Bara läsning. Migrationerna (sql/) och alla skrivningar görs med den vanliga sökvägen: med kuvös-sökvägen hade en okvalificerad
-- CREATE TABLE hamnat i schemat kuvos, och en INSERT träffat en vy. Schemat innehåller bara härledda objekt och byggs om helt.
--
-- TILLSTÅNDSTABELLERNA (road_conditions, deviations, smhi_warnings, cameras) har ingen vy: de bär ett nuläge, inte en historik.
-- I kuvösen är de tomma tills Trafikverket levererar historiken — då behövs en vy per tabell, och det är ett eget steg.

DROP SCHEMA IF EXISTS kuvos CASCADE;
CREATE SCHEMA kuvos;

CREATE FUNCTION kuvos.now() RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('kuvos.nu', true), '')::timestamptz, pg_catalog.now())
$$;
COMMENT ON FUNCTION kuvos.now() IS 'Kuvösens klocka: inställningen kuvos.nu om den är satt, annars väggklockan.';

CREATE VIEW kuvos.weather_observations AS
  SELECT * FROM public.weather_observations WHERE sample_time <= kuvos.now();

-- Produktionens weather_latest hålls av ingesten: varje stations senaste rad. Här härleds den ur arkivet vid klockan. Fönstret
-- 24 h håller frågan billig (index på sample_time); en station som tigit längre än så finns inte i vyn, medan produktionens
-- tabell behåller den. Det rör bara stationslistan i static.json — allt som varnar kräver ändå en rad yngre än 3 h (WX_SANE).
CREATE VIEW kuvos.weather_latest AS
  SELECT DISTINCT ON (station_id) *
  FROM public.weather_observations
  WHERE sample_time > kuvos.now() - interval '24 hours'
  ORDER BY station_id, sample_time DESC;

CREATE VIEW kuvos.radar_precip AS
  SELECT * FROM public.radar_precip WHERE observed_at <= kuvos.now();

-- Utfallskolumnerna (min_yta_90min_c, utfall_rader) fylls i efterhand också i produktionen. De är facit, inte indata:
-- snapshotbyggaren läser dem inte, och en regel som gör det läser framtiden.
CREATE VIEW kuvos.trend_kandidater AS
  SELECT * FROM public.trend_kandidater WHERE observed_at <= kuvos.now();

-- Ett dygn i felet som börjar efter klockan finns inte än; ett som pågår slutar "nu".
CREATE VIEW kuvos.givarfel_dygn AS
  SELECT station_id, dag, forst, least(senast, kuvos.now()) AS senast
  FROM public.givarfel_dygn WHERE forst <= kuvos.now();
