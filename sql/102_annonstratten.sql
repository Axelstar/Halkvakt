-- 102: annonstratten — Meta-annonsernas dagssiffror och App Store-nedladdningarna (DECISIONS #827; Axel 9/11). Idempotent.
-- marknadsforing/annonsdata.mjs (annonsdata.yml) skriver om de senaste 14 dygnen i båda tabellerna varje körning.
-- Bara plattformarnas egna aggregat: ingen användare, ingen position. annonstratten_stat lägger dem bredvid Apple Ads (076)
-- och appräknarens nya iPhone-installationer (077, 082) per dygn. Appräknaren har inget län, så tratten går per dygn, inte per län.
CREATE TABLE IF NOT EXISTS meta_annons_dag (
  dag date NOT NULL,
  kampanj text NOT NULL,
  annonsuppsattning text NOT NULL,
  visningar integer NOT NULL DEFAULT 0,
  rackvidd integer NOT NULL DEFAULT 0,
  klick integer NOT NULL DEFAULT 0,
  lankklick integer NOT NULL DEFAULT 0,
  kostnad numeric(10,2) NOT NULL DEFAULT 0,
  valuta text NOT NULL DEFAULT '',
  hamtad timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, kampanj, annonsuppsattning)
);
ALTER TABLE meta_annons_dag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE meta_annons_dag FROM PUBLIC;

-- Apples försäljningsrapport, bara Halkvakts rader. produkttyp 1* = första nedladdning, 3* = återhämtning, 7* = uppdatering.
CREATE TABLE IF NOT EXISTS appstore_dag (
  dag date NOT NULL,
  land text NOT NULL,
  produkttyp text NOT NULL,
  version text NOT NULL DEFAULT '',
  enheter integer NOT NULL DEFAULT 0,
  hamtad timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, land, produkttyp, version)
);
ALTER TABLE appstore_dag ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE appstore_dag FROM PUBLIC;

-- Tratten per dygn: annonskostnad → klick till App Store → nedladdningar → nya iPhone-installationer som kom igenom vägen in.
CREATE OR REPLACE FUNCTION annonstratten_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with idag as (select (now() at time zone 'Europe/Stockholm')::date d),
dygn as (select generate_series(idag.d - dagar + 1, idag.d - 1, interval '1 day')::date dag from idag),
m as (select dag, sum(kostnad) kostnad, sum(visningar) visningar, sum(lankklick) lankklick from meta_annons_dag group by 1),
aa as (select dag, sum(kostnad) kostnad, sum(installationer) installationer from apple_ads_sokord group by 1),
s as (select dag, sum(enheter) filter (where produkttyp like '1%') nedladdningar,
             sum(enheter) filter (where produkttyp like '1%' and land = 'SE') nedladdningar_se from appstore_dag group by 1),
r as (select dag,
        sum(antal) filter (where handelse = 'onboarding_klar') onboarding_klar,
        sum(antal) filter (where handelse = 'behorighet' and varde = 'alltid') behorighet_alltid,
        sum(antal) filter (where handelse = 'forsta_starten') forsta_starten,
        sum(antal) filter (where handelse = 'forsta_varningen') forsta_varningen
      from app_raknare where app = 'ios' and kohort = 'ny' group by 1),
rad as (
  select d.dag, coalesce(m.kostnad, 0) meta_kostnad, coalesce(m.visningar, 0) meta_visningar, coalesce(m.lankklick, 0) meta_lankklick,
    coalesce(aa.kostnad, 0) apple_ads_kostnad, coalesce(aa.installationer, 0) apple_ads_installationer,
    coalesce(s.nedladdningar, 0) nedladdningar, coalesce(s.nedladdningar_se, 0) nedladdningar_se,
    coalesce(r.onboarding_klar, 0) onboarding_klar, coalesce(r.behorighet_alltid, 0) behorighet_alltid,
    coalesce(r.forsta_starten, 0) forsta_starten, coalesce(r.forsta_varningen, 0) forsta_varningen
  from dygn d left join m using (dag) left join aa using (dag) left join s using (dag) left join r using (dag))
select jsonb_build_object(
  'hamtad', jsonb_build_object('meta', (select max(hamtad) from meta_annons_dag), 'appstore', (select max(hamtad) from appstore_dag)),
  'valuta_meta', (select max(valuta) from meta_annons_dag),
  'per_dag', coalesce((select jsonb_agg(to_jsonb(rad) order by dag) from rad), '[]'),
  'per_lan', coalesce((select jsonb_agg(jsonb_build_object('annonsuppsattning', annonsuppsattning, 'kostnad', k, 'visningar', v,
        'lankklick', l) order by k desc)
     from (select annonsuppsattning, sum(kostnad) k, sum(visningar) v, sum(lankklick) l from meta_annons_dag, idag
           where dag > idag.d - dagar group by 1) x), '[]')
);
$function$;
REVOKE ALL ON FUNCTION annonstratten_stat(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE meta_annons_dag FROM anon; REVOKE ALL ON TABLE appstore_dag FROM anon;
    REVOKE ALL ON FUNCTION annonstratten_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE meta_annons_dag FROM authenticated; REVOKE ALL ON TABLE appstore_dag FROM authenticated;
    REVOKE ALL ON FUNCTION annonstratten_stat(integer) FROM authenticated;
  END IF;
END $$;

-- besok_stat får nyckeln 'annonstratten' på samma sätt som 'apple_ads' (076): definitionen läses ur databasen och nyckeln läggs
-- in efter 'genererad'. En andra körning ser nyckeln och gör ingenting.
DO $$
DECLARE d text;
BEGIN
  IF to_regprocedure('besok_stat(integer)') IS NULL THEN RETURN; END IF;
  d := pg_get_functiondef('besok_stat(integer)'::regprocedure);
  IF position('annonstratten_stat' in d) = 0 THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''annonstratten'', annonstratten_stat(dagar),');
    EXECUTE d;
  END IF;
END $$;
