-- 124: STORSTÄDERNA I DEN SNABBA, OCH VAKTEN SOM SER OM DE TYSTNAR (DECISIONS #903, #782; kort #373, #378).
-- 19/11 07.41 UTC slogs den snabba kandidaten på (sql/122), och storstäderna tystnade: den snabba räkningen bär inga stadspunkter
-- (kandidat_punkter har dem inte, sql/080), så talande_regel() gav noll rader vid stadspunkterna. Avstängt 08.14 UTC (sql/123).
--
-- RÄTTELSEN. När den snabba talar ger talande_regel() den snabbas rader för punkterna den bär, och timvärdets rader (den nyas
-- regel, med sin egen tid och talaren 'ny') för punkterna den inte bär, alltså storstäderna. Varje punkt som timvärdet varnar för
-- finns därmed också med när den snabba talar. Talar den nya eller den frysta är allt som i sql/121.
-- Den snabba slås på igen med sql/122 (en ny rad 'pa'), på Bengts ord.
--
-- VAKTEN. storstader_tyst() jämför den talande regelns rader vid stadspunkterna med timvärdets regel för samma talare (den nyas när
-- den snabba eller den nya talar, den frystas annars). Vakthunden larmar när timvärdet har rader och den talande har noll
-- (supabase/functions/vakthund, kontroll 3c). Noll i båda, en varm dag eller med brytarna av, är inget att mäta.
-- Idempotent. Bara service-rollen; vaktat för CI:s PostGIS utan Supabase-rollerna.

CREATE OR REPLACE FUNCTION talande_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text, talare text)
LANGUAGE sql STABLE AS $$
  WITH v AS (SELECT t.tid, t.talare FROM talande_timme() t)
  SELECT r.punkt, r.segment_id, r.lon, r.lat, (SELECT v.tid FROM v), r.pb, r.vat, r.flackvis_vat, r.radar_mmh,
         r.veto_station, r.veto_km, r.veto_yta, r.n_ank, r.spr, r.utfall, 'snabb'::text
  FROM ny_kandidat_regel_snabb() r WHERE (SELECT v.talare FROM v) = 'snabb'
  UNION ALL
  -- Punkterna den snabba inte bär (storstäderna): timvärdet, med sin egen tid och talaren ny.
  SELECT r.*, 'ny'::text FROM ny_kandidat_regel() r
  WHERE (SELECT v.talare FROM v) = 'snabb' AND NOT EXISTS (SELECT 1 FROM ny_kandidat_snabb s WHERE s.punkt = r.punkt)
  UNION ALL
  SELECT r.*, 'ny'::text FROM ny_kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'ny'
  UNION ALL
  SELECT r.*, 'fryst'::text FROM kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'fryst'
$$;
COMMENT ON FUNCTION talande_regel() IS 'Bytet (sql/070, §12 d), påslaget (sql/121) och storstäderna (sql/124): den talande kandidatens värden; när den snabba talar har punkterna den inte bär (storstäderna) timvärdet. Bara service-rollen.';

-- Vakten: talar kandidaten i storstäderna?
CREATE OR REPLACE FUNCTION storstader_tyst() RETURNS TABLE (talare text, stad_talande bigint, stad_timvarde bigint)
LANGUAGE sql STABLE AS $$
  WITH v AS (SELECT t.talare FROM talande_timme() t)
  SELECT (SELECT v.talare FROM v),
         (SELECT count(*) FROM talande_regel() r WHERE r.punkt IN (SELECT s.punkt FROM stadspunkt s)),
         CASE WHEN (SELECT v.talare FROM v) = 'fryst'
              THEN (SELECT count(*) FROM kandidat_regel() r WHERE r.punkt IN (SELECT s.punkt FROM stadspunkt s))
              ELSE (SELECT count(*) FROM ny_kandidat_regel() r WHERE r.punkt IN (SELECT s.punkt FROM stadspunkt s)) END
$$;
COMMENT ON FUNCTION storstader_tyst() IS 'Vakten (sql/124, DECISIONS #903): den talande regelns rader vid stadspunkterna och timvärdets för samma talare. Noll mot fler är tystnad. Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): REVOKE från alla utom service-rollen, vaktat på rollerna.
REVOKE ALL ON FUNCTION talande_regel(), storstader_tyst() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION talande_regel(), storstader_tyst() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION talande_regel(), storstader_tyst() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION talande_regel(), storstader_tyst() TO service_role;
  END IF;
END $$;
