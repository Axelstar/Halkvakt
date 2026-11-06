-- 080: KANDIDATEN PÅ EN KVART — SKUGGAN (DECISIONS #782 punkt 5, kort #373). Innan den snabba får tala mäts två saker i sju dygn,
-- modell mot modell och aldrig mot facit (regel L berörs inte):
--   1. FLADDRET: hur ofta en sträcka byter mellan varnar och inte varnar från körning till körning, med regeln på de snabba värdena
--      och med samma regel på timvärdena, i samma ögonblick och med samma väglag, radar och veto. Gränsen i #782: den snabba får ge
--      högst 1,5 gånger så många byten som timvärdet.
--   2. AVVIKELSEN VID :47: när timkedjan har skrivit en ny timme, skillnaden i yta (pb) mellan det snabba värdet och timvärdet vid
--      varje vägpunkt, median och p95.
-- Plus hur många sträckor som varnar, så att nätterna med frysrisk går att räkna (minst tre, #782).
--
-- REGELN SKRIVS INTE AV. ny_kandidat_regel_snabb() härleds ur den gällande ny_kandidat_regel() (sql/069): samma text med två rader
-- utbytta, så att den läser ny_kandidat_snabb i stället för timmens ny_kandidat_live. Raderna prövas: finns de inte exakt en gång
-- fäller migrationen. Regelns kontrollsumma sparas, och ändras regeln senare slutar mätningen med skälet tills filen körs om.
-- kandidat_snabb() (sql/078) skrivs om här med ett anrop till mätningen sist, i en egen deltransaktion: faller mätningen räknas och
-- sparas de snabba värdena ändå.
-- TALAR INTE: talande_timme() och talande_regel() (sql/070) är orörda.
-- Idempotent. Bara service-rollen; vaktat för CI:s PostGIS utan Supabase-rollerna.

-- Timmarnas mått.
CREATE TABLE IF NOT EXISTS ny_kandidat_skugga_snabb (
  timme timestamptz PRIMARY KEY,
  korningar integer NOT NULL DEFAULT 0,      -- körningar med mätning i timmen
  byten_snabb integer NOT NULL DEFAULT 0,    -- sträckor som bytte varnar ↔ inte, de snabba värdena, summa över körningarna
  byten_tim integer NOT NULL DEFAULT 0,      -- samma med timvärdena (det förarna hör i dag)
  varnar_snabb_max integer,                  -- flest varnande sträckor i en körning, de snabba värdena
  varnar_tim_max integer,                    -- samma med timvärdena
  avvik_n integer,                           -- vägpunkter i jämförelsen vid :47
  avvik_median real,                         -- |pb snabb − pb timme| vid :47, median (°C)
  avvik_p95 real                             -- samma, p95 (°C)
);

-- De varnande sträckorna i förra körningen, per källa ('snabb', 'tim'). UNLOGGED: skrivs om varje körning.
CREATE UNLOGGED TABLE IF NOT EXISTS kandidat_skugga_tillstand (
  kalla text NOT NULL CHECK (kalla IN ('snabb', 'tim')),
  segment_id text NOT NULL,
  PRIMARY KEY (kalla, segment_id)
);
CREATE TABLE IF NOT EXISTS kandidat_skugga_meta (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  regel_md5 text NOT NULL,                   -- ny_kandidat_regel():s kontrollsumma när den snabba härleddes
  har_tillstand boolean NOT NULL DEFAULT false,
  tim_tid timestamptz                        -- timkedjans senaste timme som jämförts vid :47
);

-- Den snabba regeln, härledd ur den gällande.
-- F1 (sql/087, DECISIONS #800) läser frys_min, som ny_kandidat_snabb inte har. Den snabba lånar därför måttet ur timvärdet som talar
-- (ny_kandidat_live vid ny_kandidat_timme(), samma punkt), så att fladdret mäts med timmens spärr (väg (a), DECISIONS #808).
-- Storstädernas gren (sql/091) läser också ny_kandidat_snabb och lånar måttet likadant; kandidat_punkter har inga stadspunkter, så
-- grenen är tom här. Raderna för F1 och stadsgrenen byts bara när de finns, så att en regel utan dem härleds som förut.
DO $$
DECLARE
  d text;
  a text := 'FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt';
  b text := 'WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0';
  f text := 'l.frys_min, v.geom';                                                     -- sql/087
  s text := 'FROM ny_kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt';         -- sql/091
  fs text := 'l.frys_min, s.geom';
  ts text := 'WHERE l.tid = ny_kandidat_timme()';                                     -- finns också i b
  lan text := ' LEFT JOIN ny_kandidat_live h ON h.punkt = l.punkt AND h.tid = (SELECT ny_kandidat_timme())';
  n_a integer;
  n_b integer;
  n_f integer;
  n_s integer;
  n_fs integer;
  n_ts integer;
BEGIN
  IF to_regprocedure('ny_kandidat_regel()') IS NULL THEN RAISE EXCEPTION 'ny_kandidat_regel() saknas (sql/068, 069)'; END IF;
  d := pg_get_functiondef('ny_kandidat_regel()'::regprocedure);
  n_a := (length(d) - length(replace(d, a, ''))) / length(a);
  n_b := (length(d) - length(replace(d, b, ''))) / length(b);
  n_f := (length(d) - length(replace(d, f, ''))) / length(f);
  n_s := (length(d) - length(replace(d, s, ''))) / length(s);
  n_fs := (length(d) - length(replace(d, fs, ''))) / length(fs);
  n_ts := (length(d) - length(replace(d, ts, ''))) / length(ts);
  IF n_a <> 1 OR n_b <> 1 OR n_f > 1 OR n_s > 1 OR n_fs <> n_s OR (n_s = 1 AND n_f <> 1) OR n_ts <> 1 + n_s THEN
    RAISE EXCEPTION 'ny_kandidat_regel() har ändrats: raderna som byts ska finnas exakt en gång (a % b % f % s % fs % ts %)',
      n_a, n_b, n_f, n_s, n_fs, n_ts;
  END IF;
  INSERT INTO kandidat_skugga_meta (id, regel_md5) VALUES (1, md5(d))
  ON CONFLICT (id) DO UPDATE SET regel_md5 = EXCLUDED.regel_md5, har_tillstand = false;
  d := replace(d, a, 'FROM ny_kandidat_snabb l JOIN vagpunkt v ON v.punkt = l.punkt' || CASE WHEN n_f = 1 THEN lan ELSE '' END);
  d := replace(d, b, 'WHERE l.pb <= 0');
  d := replace(d, f, 'h.frys_min, v.geom');
  d := replace(d, s, 'FROM ny_kandidat_snabb l JOIN stadspunkt s ON s.punkt = l.punkt' || lan);
  d := replace(d, fs, 'h.frys_min, s.geom');
  d := replace(d, ts, 'WHERE true');
  d := regexp_replace(d, 'FUNCTION ((\S+\.)?)ny_kandidat_regel\(\)', 'FUNCTION \1ny_kandidat_regel_snabb()');
  -- Timmens tabell och dess timme får bara stå kvar i lånet av frys_min.
  IF position('ny_kandidat_live' IN replace(d, lan, '')) > 0 OR position('ny_kandidat_timme' IN replace(d, lan, '')) > 0
     OR position('ny_kandidat_regel_snabb()' IN d) = 0 THEN
    RAISE EXCEPTION 'härledningen av ny_kandidat_regel_snabb() blev fel';
  END IF;
  EXECUTE d;
END $$;
COMMENT ON FUNCTION ny_kandidat_regel_snabb() IS 'Kandidaten på en kvart (sql/080, DECISIONS #782): ny_kandidat_regel() på ny_kandidat_snabb, härledd ur den gällande regelns text. Talar inte. Bara service-rollen.';

-- Mätningen, en gång per snabb körning (kandidat_snabb() anropar den sist).
CREATE OR REPLACE FUNCTION kandidat_snabb_skugga() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_timme timestamptz := date_trunc('hour', now());
  v_meta record;
  v_bs integer := 0;
  v_bt integer := 0;
  v_ns integer;
  v_nt integer;
  v_tim timestamptz;
  v_n integer;
  v_med double precision;
  v_p95 double precision;
BEGIN
  SELECT * INTO v_meta FROM kandidat_skugga_meta WHERE id = 1;
  IF v_meta IS NULL OR to_regprocedure('ny_kandidat_regel_snabb()') IS NULL THEN RETURN 'den snabba regeln saknas'; END IF;
  IF md5(pg_get_functiondef('ny_kandidat_regel()'::regprocedure)) <> v_meta.regel_md5 THEN
    RETURN 'regeln har ändrats sedan sql/080 kördes; kör om filen';
  END IF;

  DROP TABLE IF EXISTS skugga_nu;
  CREATE TEMP TABLE skugga_nu ON COMMIT DROP AS
    SELECT 'snabb'::text AS kalla, s.segment_id FROM (SELECT DISTINCT r.segment_id FROM ny_kandidat_regel_snabb() r WHERE r.utfall = 'varnar') s
    UNION ALL
    SELECT 'tim'::text, t.segment_id FROM (SELECT DISTINCT r.segment_id FROM ny_kandidat_regel() r WHERE r.utfall = 'varnar') t;
  SELECT count(*) FILTER (WHERE kalla = 'snabb'), count(*) FILTER (WHERE kalla = 'tim') INTO v_ns, v_nt FROM skugga_nu;

  IF v_meta.har_tillstand THEN
    SELECT count(*) FILTER (WHERE x.kalla = 'snabb'), count(*) FILTER (WHERE x.kalla = 'tim') INTO v_bs, v_bt
    FROM ((SELECT kalla, segment_id FROM skugga_nu EXCEPT SELECT kalla, segment_id FROM kandidat_skugga_tillstand)
          UNION ALL
          (SELECT kalla, segment_id FROM kandidat_skugga_tillstand EXCEPT SELECT kalla, segment_id FROM skugga_nu)) x;
  END IF;
  DELETE FROM kandidat_skugga_tillstand;
  INSERT INTO kandidat_skugga_tillstand (kalla, segment_id) SELECT kalla, segment_id FROM skugga_nu;
  UPDATE kandidat_skugga_meta SET har_tillstand = true WHERE id = 1;

  INSERT INTO ny_kandidat_skugga_snabb (timme, korningar, byten_snabb, byten_tim, varnar_snabb_max, varnar_tim_max)
  VALUES (v_timme, CASE WHEN v_meta.har_tillstand THEN 1 ELSE 0 END, v_bs, v_bt, v_ns, v_nt)
  ON CONFLICT (timme) DO UPDATE SET
    korningar = ny_kandidat_skugga_snabb.korningar + EXCLUDED.korningar,
    byten_snabb = ny_kandidat_skugga_snabb.byten_snabb + EXCLUDED.byten_snabb,
    byten_tim = ny_kandidat_skugga_snabb.byten_tim + EXCLUDED.byten_tim,
    varnar_snabb_max = greatest(ny_kandidat_skugga_snabb.varnar_snabb_max, EXCLUDED.varnar_snabb_max),
    varnar_tim_max = greatest(ny_kandidat_skugga_snabb.varnar_tim_max, EXCLUDED.varnar_tim_max);

  -- Avvikelsen vid :47: första snabba körningen efter att timkedjan skrivit en ny timme med samma PH-timme.
  v_tim := ny_kandidat_timme();
  IF v_tim IS NOT NULL AND v_tim IS DISTINCT FROM v_meta.tim_tid
     AND EXISTS (SELECT 1 FROM ny_kandidat_snabb s WHERE s.tid = v_tim) THEN
    SELECT count(*), percentile_cont(0.5) WITHIN GROUP (ORDER BY abs(s.pb - l.pb)),
           percentile_cont(0.95) WITHIN GROUP (ORDER BY abs(s.pb - l.pb))
      INTO v_n, v_med, v_p95
    FROM ny_kandidat_snabb s JOIN ny_kandidat_live l ON l.punkt = s.punkt AND l.tid = v_tim
    WHERE s.punkt LIKE 'v%' AND s.tid = v_tim AND s.pb IS NOT NULL AND l.pb IS NOT NULL;
    INSERT INTO ny_kandidat_skugga_snabb (timme, avvik_n, avvik_median, avvik_p95) VALUES (v_tim, v_n, v_med, v_p95)
    ON CONFLICT (timme) DO UPDATE SET avvik_n = EXCLUDED.avvik_n, avvik_median = EXCLUDED.avvik_median, avvik_p95 = EXCLUDED.avvik_p95;
    UPDATE kandidat_skugga_meta SET tim_tid = v_tim WHERE id = 1;
  END IF;
  RETURN 'mätt';
END $$;
COMMENT ON FUNCTION kandidat_snabb_skugga() IS 'Skuggan för kandidaten på en kvart (sql/080, DECISIONS #782 punkt 5): fladdret snabb mot timvis och avvikelsen vid :47, per timme i ny_kandidat_skugga_snabb. Modell mot modell. Bara service-rollen.';

-- kandidat_snabb() som i sql/078, med mätningen sist i en egen deltransaktion.
CREATE OR REPLACE FUNCTION kandidat_snabb() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  t0 timestamptz := clock_timestamp();
  v_tid timestamptz := date_trunc('hour', now());
  v_w double precision;
  v_l double precision;
  v_ank integer;
  v_n integer;
  v_of integer;
  v_byggd boolean := false;
  v_skugga text;
BEGIN
  DELETE FROM ny_kandidat_snabb_korning WHERE raknad < now() - interval '30 days';
  IF to_regprocedure('kandidat_snabb_rakna(timestamptz, double precision, double precision)') IS NULL
     OR to_regprocedure('kandidat_grannar_bygg()') IS NULL THEN
    INSERT INTO ny_kandidat_snabb_korning (raknad, tid, skal) VALUES (now(), v_tid, 'räkningen saknas');
    RETURN 'räkningen saknas';
  END IF;
  SELECT k.w, k.l_km INTO v_w, v_l FROM kandidat_par k WHERE k.id = 1;
  IF v_w IS NULL THEN
    INSERT INTO ny_kandidat_snabb_korning (raknad, tid, skal) VALUES (now(), v_tid, 'paret saknas');
    RETURN 'paret saknas';
  END IF;

  TRUNCATE kandidat_snabb_ankare;
  INSERT INTO kandidat_snabb_ankare (id, lon, lat, yta) SELECT a.id, a.lon, a.lat, a.yta::double precision FROM vagpunkt_ankare() a;
  GET DIAGNOSTICS v_ank = ROW_COUNT;

  IF EXISTS (SELECT 1 FROM kandidat_snabb_ankare a LEFT JOIN kandidat_stationer s ON s.station_id = a.id
             WHERE s.station_id IS NULL OR (s.lon, s.lat) IS DISTINCT FROM (a.lon, a.lat))
     OR EXISTS (SELECT 1 FROM kandidat_punkter k
                WHERE k.andrad > coalesce((SELECT b.byggd FROM kandidat_grannar_bygd b WHERE b.id = 1), '-infinity'::timestamptz)) THEN
    PERFORM kandidat_grannar_bygg();
    v_byggd := true;
  END IF;

  DELETE FROM ny_kandidat_snabb;
  WITH r AS (SELECT * FROM kandidat_snabb_rakna(v_tid, v_w, v_l)),
  i AS (INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, ph, pg, ra, ank_km, pb, n_ank, spr)
        SELECT r.punkt, v_tid, now(), r.ph, r.pg, r.ra, r.ank_km, r.pb, r.n_ank, r.spr FROM r RETURNING 1)
  SELECT (SELECT count(*) FROM i), count(*) FILTER (WHERE r.ofullstandig) INTO v_n, v_of FROM r;

  IF v_n > 0 AND to_regprocedure('kandidat_snabb_skugga()') IS NOT NULL THEN
    BEGIN
      v_skugga := kandidat_snabb_skugga();
    EXCEPTION WHEN OTHERS THEN
      v_skugga := 'skuggan föll (' || SQLSTATE || ')';
    END;
  END IF;

  INSERT INTO ny_kandidat_snabb_korning (raknad, tid, ms, punkter, ankare, ofullstandiga, byggd, skal)
  VALUES (now(), v_tid, (extract(epoch FROM clock_timestamp() - t0) * 1000)::integer, v_n, v_ank, v_of, v_byggd,
          CASE WHEN v_n = 0 THEN 'ingen PH för timmen'
               WHEN v_skugga IS NOT NULL AND v_skugga <> 'mätt' THEN v_skugga END);
  RETURN CASE WHEN v_n = 0 THEN 'ingen PH för timmen' ELSE 'räknad' END;
END $$;

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE; service-rollen får tabellerna och funktionerna (DECISIONS #653).
ALTER TABLE ny_kandidat_skugga_snabb ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_skugga_tillstand ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_skugga_meta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ny_kandidat_skugga_snabb, kandidat_skugga_tillstand, kandidat_skugga_meta FROM PUBLIC;
REVOKE ALL ON FUNCTION ny_kandidat_regel_snabb(), kandidat_snabb_skugga(), kandidat_snabb() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE ny_kandidat_skugga_snabb, kandidat_skugga_tillstand, kandidat_skugga_meta FROM anon;
    REVOKE ALL ON FUNCTION ny_kandidat_regel_snabb(), kandidat_snabb_skugga(), kandidat_snabb() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE ny_kandidat_skugga_snabb, kandidat_skugga_tillstand, kandidat_skugga_meta FROM authenticated;
    REVOKE ALL ON FUNCTION ny_kandidat_regel_snabb(), kandidat_snabb_skugga(), kandidat_snabb() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE ny_kandidat_skugga_snabb TO service_role;
    GRANT ALL ON TABLE kandidat_skugga_tillstand TO service_role;
    GRANT ALL ON TABLE kandidat_skugga_meta TO service_role;
    GRANT EXECUTE ON FUNCTION ny_kandidat_regel_snabb(), kandidat_snabb_skugga(), kandidat_snabb() TO service_role;
  END IF;
END $$;
