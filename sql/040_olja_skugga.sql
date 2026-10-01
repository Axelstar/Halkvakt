-- 040: oljeskuggan (kort #276 väg (a), Bengt 1/10, DECISIONS #421). Skuggan loggar var rösten SKULLE ha talat om Trafikverkets
-- NonWeatherRelatedRoadConditions — mest olja, diesel och hydraulolja med "risk för halka" (99 på 26 dygn, #420). Ingen text och ingen
-- ändring i appen; det är Axels beslut efter skuggan.
--
-- KÖRS FÖRE deployen av skuggmotorn: funktionen skriver kolumnen `olja` i varje rad, och PostgREST avvisar en okänd kolumn.

-- Egen kolumn, aldrig i `alerts` (samma skäl som `vb`, sql/019): `alerts` är motorns ord och läses av skuggrapporten, tystnadsfelet
-- och upprepningen. En jsonb-lista per körning: [{t, id, text, sev, distanceM, geo, lon, lat}].
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS olja jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shadow_log.olja IS 'Kort #276: väglag utan väder (olja m.m.) som rösten SKULLE ha talat om. Aldrig hört av någon.';

-- AKTIV = start ≤ nu < slut. Arkivet ser aldrig Trafikverkets radering (last_seen står stilla, sql/003), så sluttiden är det enda
-- som avgör. Mätt 1/10 (scripts/matningar/olja-aktiv-2026-10-01.sql): 117 händelser sedan 31/8, alla med sluttid och punkt, median
-- 1 h 48 min. En händelse UTAN sluttid räknas bara det första dygnet — annars hade den varit aktiv för alltid.
CREATE OR REPLACE FUNCTION olja_aktiva()
RETURNS TABLE (id text, lon double precision, lat double precision, meddelande text, sev int)
LANGUAGE sql STABLE AS $$
  SELECT deviation_id, ST_X(geom), ST_Y(geom), left(message, 160), severity_code
  FROM situation_archive
  WHERE message_type_value = 'NonWeatherRelatedRoadConditions'
    AND geom IS NOT NULL
    AND start_time <= now()
    AND (end_time > now() OR (end_time IS NULL AND start_time > now() - interval '24 hours'))
$$;
COMMENT ON FUNCTION olja_aktiva() IS 'Kort #276: aktiva NonWeatherRelatedRoadConditions med punkt, för skuggmotorns oljeskugga. Bara service-rollen.';

-- Rättigheterna: bara service-rollen, som vagpunkt_ankare (sql/032). Guardat mot CI:s PostGIS utan Supabase-rollerna (läxan 003).
REVOKE ALL ON FUNCTION olja_aktiva() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION olja_aktiva() TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION olja_aktiva() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION olja_aktiva() FROM authenticated;
  END IF;
END $$;
