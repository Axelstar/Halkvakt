-- 121: KANDIDATEN PÅ EN KVART — PÅSLAGET FÖRBERETT (DECISIONS #782 punkt 3 och 5, kort #373). Skuggan 7/11–19/11 klarade gränsen
-- i #782 punkt 5: 0,81 gånger så många utfallsbyten som timvärdet (högst 1,5). Filen bygger vägen men slår inte på den: så länge
-- kandidat_snabb_talar saknar en rad 'pa' ger talande_timme() och talande_regel() exakt samma rader som i sql/070.
--
-- VEM SOM TALAR (#782 punkt 3), när beslutet i kandidat_talar säger ny:
--   1. den snabba, när
--      - påslaget står i kandidat_snabb_talar (den senaste raden),
--      - dess senaste körning räknade (skal saknas), är högst 10 minuter gammal och bär minst 95 % av vägpunkterna,
--      - den härledda regeln är härledd ur den gällande regeln (kandidat_skugga_meta, sql/080): ändras ny_kandidat_regel() tiger
--        den snabba tills sql/080 körts om, i stället för att tala med en gammal regel,
--      - och den nyas timme är färsk, eftersom den snabba regeln lånar timmens frys_min (sql/080, DECISIONS #808);
--   2. annars den nyas timme, som förut;
--   3. annars den frysta.
-- Den snabbas tid i regeln är när värdet räknades (raknad), så att lägesfilen säger klockslaget (#782 punkt 6).
-- I timmarna 00, 06, 12 och 18 UTC saknar den snabba ofta timmens PH (skal 'ingen PH för timmen', läst 19/11): då talar timvärdet
-- tills PH finns, och sedan den snabba igen.
-- DOMEN RÖRS INTE (#782 punkt 4): det snabba värdet loggas inte. Olycksfacit (sql/112) räknar K på timvärdena som förut.
-- PÅ: sql/122 (en rad). AV: en rad med talar = 'av' och beslutets nummer, i samma form. Raderna tas aldrig bort; den senaste avgör.
-- Idempotent. Bara service-rollen; vaktat för CI:s PostGIS utan Supabase-rollerna.

CREATE TABLE IF NOT EXISTS kandidat_snabb_talar (
  id serial PRIMARY KEY,
  tid timestamptz NOT NULL DEFAULT now(),
  talar text NOT NULL CHECK (talar IN ('pa', 'av')),
  beslut text NOT NULL,                      -- t.ex. 'DECISIONS #782'
  korning text                               -- körningen eller provet som bär beslutet
);
COMMENT ON TABLE kandidat_snabb_talar IS 'Påslaget av kandidaten på en kvart (DECISIONS #782 punkt 5, sql/121): en rad per omställning med beslutet. Utan rader talar den snabba inte.';

-- Påslaget: den senaste raden, annars av.
CREATE OR REPLACE FUNCTION kandidat_snabb_pa() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT t.talar = 'pa' FROM kandidat_snabb_talar t ORDER BY t.id DESC LIMIT 1), false)
$$;
COMMENT ON FUNCTION kandidat_snabb_pa() IS 'Påslaget (sql/121): sant när den senaste raden i kandidat_snabb_talar säger pa. Bara service-rollen.';

-- Den snabbas färska körning: när den räknades, eller NULL när den inte får tala (#782 punkt 3).
CREATE OR REPLACE FUNCTION ny_kandidat_snabb_tid() RETURNS timestamptz
LANGUAGE sql STABLE AS $$
  WITH k AS (SELECT max(r.raknad) AS raknad FROM ny_kandidat_snabb_korning r WHERE r.skal IS NULL AND r.raknad <= now())
  SELECT k.raknad FROM k
  WHERE k.raknad > now() - interval '10 minutes'                                                    -- #782 punkt 3
    AND (SELECT count(*) FROM ny_kandidat_snabb s WHERE s.raknad = k.raknad AND s.punkt LIKE 'v%')
        >= 0.95 * (SELECT count(*) FROM vagpunkt)                                                    -- FULLSTANDIG_ANDEL
    AND (SELECT m.regel_md5 FROM kandidat_skugga_meta m) = md5(pg_get_functiondef('ny_kandidat_regel()'::regprocedure))
$$;
COMMENT ON FUNCTION ny_kandidat_snabb_tid() IS 'Den snabbas färska körning (sql/121): högst 10 minuter, minst 95 % av vägpunkterna och regeln härledd ur den gällande, annars NULL. Bara service-rollen.';

-- Timmen som talar och vem: den snabba, den nyas timme eller den frysta (#782 punkt 3, sql/070 §12 f).
CREATE OR REPLACE FUNCTION talande_timme() RETURNS TABLE (tid timestamptz, talare text)
LANGUAGE sql STABLE AS $$
  SELECT coalesce(s.t, n.t, kandidat_timme()),
         CASE WHEN s.t IS NOT NULL THEN 'snabb' WHEN n.t IS NOT NULL THEN 'ny' ELSE 'fryst' END
  FROM (SELECT CASE WHEN kandidat_talar_nu() = 'ny' THEN ny_kandidat_timme() END AS t) n
  CROSS JOIN LATERAL (SELECT CASE WHEN n.t IS NOT NULL AND kandidat_snabb_pa() THEN ny_kandidat_snabb_tid() END AS t) s
$$;
COMMENT ON FUNCTION talande_timme() IS 'Bytet (sql/070, §12 f) och påslaget (sql/121, #782 punkt 3): den snabbas körning när den får tala, annars den nyas färska timme när beslutet säger ny, annars den frystas. Bara service-rollen.';

-- Regeln som talar: kandidat_regel():s kolumner och talaren. Den snabbas tid är när värdet räknades.
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
  SELECT r.*, 'ny'::text FROM ny_kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'ny'
  UNION ALL
  SELECT r.*, 'fryst'::text FROM kandidat_regel() r WHERE (SELECT v.talare FROM v) = 'fryst'
$$;
COMMENT ON FUNCTION talande_regel() IS 'Bytet (sql/070, §12 d) och påslaget (sql/121): samma regel, den talande kandidatens värden; kandidat_regel():s kolumner och talaren (snabb, ny eller fryst). Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE, vaktat på rollerna (CI:s PostGIS har dem inte).
ALTER TABLE kandidat_snabb_talar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kandidat_snabb_talar FROM PUBLIC;
REVOKE ALL ON FUNCTION kandidat_snabb_pa(), ny_kandidat_snabb_tid(), talande_timme(), talande_regel() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_snabb_talar FROM anon; REVOKE ALL ON SEQUENCE kandidat_snabb_talar_id_seq FROM anon;
    REVOKE ALL ON FUNCTION kandidat_snabb_pa(), ny_kandidat_snabb_tid(), talande_timme(), talande_regel() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_snabb_talar FROM authenticated; REVOKE ALL ON SEQUENCE kandidat_snabb_talar_id_seq FROM authenticated;
    REVOKE ALL ON FUNCTION kandidat_snabb_pa(), ny_kandidat_snabb_tid(), talande_timme(), talande_regel() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE kandidat_snabb_talar TO service_role;
    GRANT USAGE, SELECT, UPDATE ON SEQUENCE kandidat_snabb_talar_id_seq TO service_role;
    GRANT EXECUTE ON FUNCTION kandidat_snabb_pa(), ny_kandidat_snabb_tid(), talande_timme(), talande_regel() TO service_role;
  END IF;
END $$;
