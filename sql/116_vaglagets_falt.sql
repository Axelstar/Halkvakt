-- 116: TRAFIKVERKETS EGNA FÄLT PÅ VÄGLAGET (DECISIONS #897, kort #666 steg 1; Bengt 17/11: "axel har godkänt alla förslag. Då bygger vi").
--
-- VARFÖR. Trafikverkets väglagsobjekt bär en varning (Warning), en orsak (Cause) och en åtgärd (Measure) i schema 1.3. Ingesten
-- läser schema 1.2 och har aldrig hämtat dem. Läst 17/11 (#890): av 818 sträckor bar 154 en varning, 138 en orsak och 116 en
-- åtgärd med tidsfönster. Rutan till tidningarna ska visa fälten ordagrant per sträcka (#897).
--
-- VAD. Fyra kolumner på road_conditions. NULL betyder att fälten aldrig har lästs för sträckan, och en tom lista att de är lästa
-- och tomma. Livemotorn fyller dem i en egen hämtning som bara uppdaterar sträckor som redan finns (skrivVaglagsfalt i
-- supabase/functions/ingest-live/skriv.ts). Ingen regel läser fälten: vad som räknas som halt ändras inte (#897).
-- Idempotent. Tabellens rättigheter gäller också de nya kolumnerna, så ingen GRANT behövs.
-- TILLBAKA: ALTER TABLE road_conditions DROP COLUMN trv_varning, DROP COLUMN trv_orsak, DROP COLUMN trv_atgard, DROP COLUMN trv_falt_tid.

ALTER TABLE road_conditions ADD COLUMN IF NOT EXISTS trv_varning  text[];
ALTER TABLE road_conditions ADD COLUMN IF NOT EXISTS trv_orsak    text[];
ALTER TABLE road_conditions ADD COLUMN IF NOT EXISTS trv_atgard   text[];
ALTER TABLE road_conditions ADD COLUMN IF NOT EXISTS trv_falt_tid timestamptz;

COMMENT ON COLUMN road_conditions.trv_varning  IS 'Trafikverkets varning på sträckan (RoadCondition 1.3, Warning), ordagrant. NULL = aldrig läst (sql/116, #897).';
COMMENT ON COLUMN road_conditions.trv_orsak    IS 'Trafikverkets orsak (RoadCondition 1.3, Cause), ordagrant. NULL = aldrig läst (sql/116, #897).';
COMMENT ON COLUMN road_conditions.trv_atgard   IS 'Trafikverkets åtgärd med tidsfönster (RoadCondition 1.3, Measure), fri text. NULL = aldrig läst (sql/116, #897).';
COMMENT ON COLUMN road_conditions.trv_falt_tid IS 'Objektets ModifiedTime när de tre fälten senast lästes (sql/116, #897).';
