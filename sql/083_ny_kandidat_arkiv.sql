-- 083: den nya kandidatens domlogg (ny_kandidat_skugga, ny_kandidat_station) exporteras till hinken och raderas efter 14 dygn
-- (Bengt 4/11: "Ja, bygg båda"; DECISIONS #792). sql/068 lät dem ligga kvar i databasen "tills exporten utökas med ett eget beslut".
-- 4/11 bar de 28,9 MB sedan 24/10, cirka 2,6 MB per dygn, och inget raderade dem.
--
-- Samma väg som den gamla kandidatens loggar (sql/057, 062, 063): ett dygn exporteras när det är färdigt (arkiv2_alder 1, sista timmen
-- skrivs 23:50), läses tillbaka och bokförs av funktionen arkivexport. Golvet för raderingen är däremot nattjobbets 14 dygn (sql/072),
-- inte de gamlas tre (sql/072; arkiv2_golv ger de nya min_dygn), så att värdevakten och skuggmätningen har sina dygn kvar. Den som
-- bygger den nya kandidatens dom läser de äldre dygnen ur hinken, som den gamla kandidatens.
--
-- Listan finns på två ställen: TABELLER i supabase/functions/arkivexport/index.ts ändras i samma commit. Idempotent; inget raderas av
-- filen själv. Efter migrationen står den nya domloggens dygn sedan 24/10 i kö, och arkivexporten tar två dygn per tabell och timme.
CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                                'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                                'ny_kandidat_skugga', 'ny_kandidat_station') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

-- Dygnens ålder före export: kandidaternas loggar är färdiga dygnet efter; de andra efter åtta dygn.
CREATE OR REPLACE FUNCTION arkiv2_alder(tab text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station', 'ny_kandidat_skugga', 'ny_kandidat_station') THEN 1 ELSE 8 END
$$;

ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                    'ny_kandidat_skugga', 'ny_kandidat_station'));

CREATE OR REPLACE FUNCTION arkiv2_efterslap() RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT ((SELECT count(*) FROM arkiv2_att_exportera('trend_kandidater', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('trend_stigande', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('radar_precip', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_skugga', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_station', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('shadow_log', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('road_condition_history', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('situation_archive', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('smhi_warnings_history', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_station', 100000)))::int
$$;
