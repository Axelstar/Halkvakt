-- 070: BYTET (FORREGISTRERING-2026-27 §12, tillägget till ersättningsregeln §6 punkt 5, DECISIONS #703, #723). Den nya kandidaten
-- får tala i appen i stället för den frysta först när Bengt och Axel har beslutat det (§12 b). Byggt 25/10 med den frysta som talare:
-- så länge ingen rad finns i kandidat_talar talar den frysta, och publiceringen ger exakt det den ger i dag.
-- En logg, inte en flagga (som brytaren, sql/059): varje omställning är en rad med beslutet och körningen, och den senaste raden
-- avgör. Tillbaka är en ny rad med 'fryst'.
-- §12 (f) TILLBAKA TILL DEN FRYSTA: talar den nya men saknas dess timme, eller är den för gammal eller ofullständig (ny_kandidat_timme()
-- med samma färskhet som kandidat_timme(), §3), talar den frysta den timmen. Andelen sådana timmar räknas ur ny_kandidat_skugga_korning.
-- §12 (c) DEN FRYSTA PÅVERKAS INTE: kandidat_regel(), kandidat_logga() och deras tabeller är orörda; domloggen räknas som förut.
-- Publiceringen (publish/snapshot-core.ts och supabase/functions/publicera/index.ts) läser talande_timme() och talande_regel(), och
-- faller tillbaka till kandidat_timme() och kandidat_regel() om de inte går att läsa (före migrationen).

CREATE TABLE IF NOT EXISTS kandidat_talar (
  id bigserial PRIMARY KEY,
  tid timestamptz NOT NULL DEFAULT now(),
  talar text NOT NULL CHECK (talar IN ('fryst', 'ny')),
  beslut text NOT NULL,
  korning text
);
COMMENT ON TABLE kandidat_talar IS 'Bytet (FORREGISTRERING-2026-27 §12, DECISIONS #723): en rad per omställning med beslutet. Utan rader talar den frysta.';

-- Ordningen räknas på id, som brytaren.
CREATE OR REPLACE FUNCTION kandidat_talar_nu() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT t.talar FROM kandidat_talar t ORDER BY t.id DESC LIMIT 1), 'fryst')
$$;
COMMENT ON FUNCTION kandidat_talar_nu() IS 'Vem som ska tala enligt beslutet (sql/070): den senaste raden i kandidat_talar, annars fryst. Bara service-rollen.';

-- Timmen som talar och vem: den nyas färska timme när beslutet säger ny, annars den frystas (§12 f).
CREATE OR REPLACE FUNCTION talande_timme() RETURNS TABLE (tid timestamptz, talare text)
LANGUAGE sql STABLE AS $$
  SELECT coalesce(n.t, kandidat_timme()), CASE WHEN n.t IS NOT NULL THEN 'ny' ELSE 'fryst' END
  FROM (SELECT CASE WHEN kandidat_talar_nu() = 'ny' THEN ny_kandidat_timme() END AS t) n
$$;
COMMENT ON FUNCTION talande_timme() IS 'Bytet (sql/070, §12 f): den nyas färska timme när beslutet säger ny, annars den frystas. Bara service-rollen.';

-- Regeln som talar: kandidat_regel():s kolumner och talaren. Bara den talande kandidatens regel räknas.
CREATE OR REPLACE FUNCTION talande_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text, talare text)
LANGUAGE sql STABLE AS $$
  WITH v AS (SELECT t.talare FROM talande_timme() t)
  SELECT r.*, 'ny'::text FROM ny_kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'ny'
  UNION ALL
  SELECT r.*, 'fryst'::text FROM kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'fryst'
$$;
COMMENT ON FUNCTION talande_regel() IS 'Bytet (sql/070, §12 d): samma regel, den talande kandidatens värden; kandidat_regel():s kolumner och talaren. Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE; service-rollen får tabellen och funktionerna (DECISIONS #653).
ALTER TABLE kandidat_talar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kandidat_talar FROM PUBLIC;
REVOKE ALL ON FUNCTION kandidat_talar_nu(), talande_timme(), talande_regel() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_talar FROM anon; REVOKE ALL ON SEQUENCE kandidat_talar_id_seq FROM anon;
    REVOKE ALL ON FUNCTION kandidat_talar_nu(), talande_timme(), talande_regel() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_talar FROM authenticated; REVOKE ALL ON SEQUENCE kandidat_talar_id_seq FROM authenticated;
    REVOKE ALL ON FUNCTION kandidat_talar_nu(), talande_timme(), talande_regel() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE kandidat_talar TO service_role; GRANT USAGE, SELECT, UPDATE ON SEQUENCE kandidat_talar_id_seq TO service_role;
    GRANT EXECUTE ON FUNCTION kandidat_talar_nu(), talande_timme(), talande_regel() TO service_role;
  END IF;
END $$;
