-- 093: skuggans kandidatpunkter i ett enda värde (kort #374, DECISIONS #812).
-- Skuggmotorn hämtade kandidat_regel() via REST, och Supabases REST lämnar högst 1000 rader per svar. 31/10–7/11 stod skuggans
-- lista på exakt 1000 i 265 körningar, och 7/11 05.04 UTC varnade 3 311 punkter. Ett ensamt värde har inget radtak, så funktionen
-- lämnar alla varnande punkter som en json, och regeln räknas en gång per anrop i stället för en gång per sida.
-- Den läser talande_regel() (sql/070): det föraren hör, den nya kandidaten sedan 26/10 (DECISIONS #729) och storstädernas punkter
-- när deras brytare är på (#804). Förut läste skuggan den frysta kandidaten.
-- LANGUAGE sql utan SET (CLAUDE.md, #784): den anropas en gång per skuggvarv, inte per rad i en stor sats.

CREATE OR REPLACE FUNCTION skuggans_kandidat() RETURNS json
LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'tid', max(r.tid),
    'talare', max(r.talare),
    'n', count(*),
    'p', coalesce(json_agg(json_build_object('segment_id', r.segment_id, 'lon', r.lon, 'lat', r.lat) ORDER BY r.punkt), '[]'::json))
  FROM talande_regel() r
  WHERE r.utfall = 'varnar'
$$;
COMMENT ON FUNCTION skuggans_kandidat() IS 'Skuggans kandidatpunkter (sql/093, kort #374): den talande regelns varnande punkter som en json, utan REST:s radtak. Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): REVOKE från alla utom service-rollen, vaktat på rollerna (CI:s PostGIS har dem inte).
REVOKE ALL ON FUNCTION skuggans_kandidat() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION skuggans_kandidat() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION skuggans_kandidat() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION skuggans_kandidat() TO service_role;
  END IF;
END $$;
