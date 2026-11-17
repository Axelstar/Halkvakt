-- 114: storstädernas logg (ny_kandidat_skugga_stad, ny_kandidat_skugga_stad_korning) exporteras till hinken (körlistan A2;
-- Bengt 17/11: "börja med A1 och A2"; DECISIONS #888).
--
-- VARFÖR. sql/096 gallrar båda tabellerna efter 14 dygn utan att spara dem. Stadsloggen är den enda källan för vad regeln sa vid
-- storstädernas punkter (kalla punkter, varnande, veto, torra, spärrade), och körningsloggen säger vilka brytare som var på vid varje
-- timme. Brytarna slogs på 8/11, så de första raderna hade försvunnit 22/11, och storstäderna hade inte gått att redovisa för säsongen.
--
-- HUR. Samma väg som den nya kandidatens domlogg (sql/083): ett dygn exporteras när det är färdigt (arkiv2_alder 1), läses tillbaka
-- och bokförs av funktionen arkivexport. Arkivets radering får nattjobbets golv, 14 dygn (arkiv2_golv ger dem min_dygn), samma som
-- gallringen i sql/096, som står kvar orörd. Körningsloggen räknar dygnet på kolumnen korning; stadsloggen på observed_at.
--
-- Listan finns på två ställen: TABELLER i supabase/functions/arkivexport/index.ts ändras i samma commit. Idempotent; inget raderas av
-- filen själv. Efter migrationen står dygnen sedan 8/11 i kö, och arkivexporten tar två dygn per tabell och timme.

-- plpgsql: fast sökväg i definitionen (DECISIONS #784); sql-funktionerna nedan får ingen, så att de kan inlinas.
CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public, extensions AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                                'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                                'ny_kandidat_skugga', 'ny_kandidat_station',
                                'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

-- Tidskolumnen som dygnet räknas på (sql/063). Körningsloggen har korning; stadsloggen har observed_at som de andra loggarna.
CREATE OR REPLACE FUNCTION arkiv2_tidkolumn(tab text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE arkiv2_tabell(tab) WHEN 'shadow_log' THEN 'run_at' WHEN 'road_condition_history' THEN 'modified_time'
    WHEN 'situation_archive' THEN 'first_seen' WHEN 'smhi_warnings_history' THEN 'archived_at'
    WHEN 'ny_kandidat_skugga_stad_korning' THEN 'korning' ELSE 'observed_at' END
$$;

-- Dygnens ålder före export: kandidaternas loggar och stadsloggen är färdiga dygnet efter; de andra efter åtta dygn.
CREATE OR REPLACE FUNCTION arkiv2_alder(tab text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station', 'ny_kandidat_skugga', 'ny_kandidat_station',
                           'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning') THEN 1 ELSE 8 END
$$;

ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station',
                    'shadow_log', 'road_condition_history', 'situation_archive', 'smhi_warnings_history',
                    'ny_kandidat_skugga', 'ny_kandidat_station',
                    'ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning'));

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
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_station', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga_stad', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('ny_kandidat_skugga_stad_korning', 100000)))::int
$$;

-- Arkivexporten läser som service_role, som går förbi RLS men inte förbi GRANT (DECISIONS #653). sql/096 gav redan rätten; raden
-- här gör att filen inte hänger på det.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
     AND to_regclass('public.ny_kandidat_skugga_stad') IS NOT NULL THEN
    GRANT SELECT ON TABLE ny_kandidat_skugga_stad, ny_kandidat_skugga_stad_korning TO service_role;
  END IF;
END $$;
