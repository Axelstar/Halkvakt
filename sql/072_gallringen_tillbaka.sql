-- 072: tre gallringar tillbaka efter Supabase Pro (DECISIONS #740, Bengts val 28/10: "Ta tillbaka de tre billiga: full upplösning i
-- 7 dygn, trendtabellerna och radarn 14 dygn och kandidatens loggar 3 dygn. Golvet för vädret står kvar på 14.").
-- Mätt 28/10 15:48 UTC (dbknapp 40719575626, 40719923034): 513 MB av 8 GB, ≈ 1,2 MB per dygn sedan 20/10. De tre kostar
-- uppskattningsvis 75 + 28 + 5 MB en gång, och fönstren fylls framåt — det som redan raderats kommer inte tillbaka.
--
-- * Nattjobbet gallrar efter SJU dygn i stället för tre: gallra_arkiv(7), som före 10/10 (#511 punkt 1). Brotten mot #75 sparas som
--   förut (gallra_vader i sql/044 är orörd). Frostläsningarna får sju dygn på sig; kontraktsgrinden vaktar talet mot GALLRING_DYGN
--   i koden (frosttryck.ts, grind-t-a.ts, trendarkivet.ts).
-- * Trendtabellerna och radarn raderas efter FJORTON dygn i stället för tio (#618 c): steg 0 läser radarn fjorton dygn bakåt.
-- * Kandidatens två loggar raderas efter TRE dygn i stället för ett (#618 b, som #573), så att varför kandidaten teg går att läsa
--   några dygn bakåt i databasen.
-- Oförändrat: väderobservationernas raderingsgolv (14 dygn, halkvakt-arkivradering), exportens ålder per tabell (arkiv2_alder) och
-- de fyra tabellerna som aldrig raderas (golvet NULL, sql/063).
-- Idempotent; pg_cron bara där tillägget finns. Saknas ett jobb fäller migrationen: en tyst nolla vore ett tyst aldrig.

CREATE OR REPLACE FUNCTION arkiv2_golv(tab text, min_dygn int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 3
              WHEN tab IN ('shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history') THEN NULL
              ELSE min_dygn END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-gallring')
       OR NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'halkvakt-arkivradering-tabeller') THEN
      RAISE EXCEPTION 'sql/072: halkvakt-gallring eller halkvakt-arkivradering-tabeller saknas — inget ändrat';
    END IF;
    PERFORM cron.alter_job(jobid, command := 'SELECT gallra_arkiv(7)') FROM cron.job WHERE jobname = 'halkvakt-gallring';
    PERFORM cron.alter_job(jobid, command := 'SELECT arkiv2_radera_exporterat(350, 14) FROM generate_series(1, 40)')
      FROM cron.job WHERE jobname = 'halkvakt-arkivradering-tabeller';
  END IF;
END $$;
