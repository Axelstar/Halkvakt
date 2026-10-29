-- 076: Apple Ads sökordsrapport per dygn (DECISIONS #748; Axel 30/10). Idempotent.
-- marknadsforing/appleannonser.mjs (apple-annonser.yml) hämtar kampanjens searchterms-rapport ur Apples Campaign Management API
-- och skriver om de senaste 14 dygnen här varje körning. En rad per dygn, annonsgrupp, nyckelord och sökterm; Search Match-rader har
-- tomt nyckelord, och Apples "låg volym" har tom sökterm. Bara annonsplattformens egna aggregat: ingen användare, ingen position.
-- statistik.html läser sammanställningen via besok_stat (nyckeln 'apple_ads'), som läser apple_ads_stat.
CREATE TABLE IF NOT EXISTS apple_ads_sokord (
  dag date NOT NULL,
  kampanj text NOT NULL,
  annonsgrupp text NOT NULL,
  nyckelord text NOT NULL DEFAULT '',
  matchning text NOT NULL DEFAULT '',
  sokterm text NOT NULL DEFAULT '',
  kalla text NOT NULL DEFAULT '',
  visningar integer NOT NULL DEFAULT 0,
  tryck integer NOT NULL DEFAULT 0,
  installationer integer NOT NULL DEFAULT 0,
  tryckinstallationer integer NOT NULL DEFAULT 0,
  kostnad numeric(10,2) NOT NULL DEFAULT 0,
  valuta text NOT NULL DEFAULT '',
  hamtad timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, kampanj, annonsgrupp, nyckelord, sokterm)
);
ALTER TABLE apple_ads_sokord ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE apple_ads_sokord FROM PUBLIC;

CREATE OR REPLACE FUNCTION apple_ads_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with a as (select * from apple_ads_sokord where dag > (now() at time zone 'Europe/Stockholm')::date - dagar),
sju as (select * from a where dag > (now() at time zone 'Europe/Stockholm')::date - 7)
select jsonb_build_object(
  'hamtad', (select max(hamtad) from apple_ads_sokord),
  'valuta', (select max(valuta) from a),
  'period', (select jsonb_build_object('visningar', coalesce(sum(visningar),0), 'tryck', coalesce(sum(tryck),0),
      'installationer', coalesce(sum(installationer),0), 'kostnad', coalesce(sum(kostnad),0)) from a),
  'sju', (select jsonb_build_object('visningar', coalesce(sum(visningar),0), 'tryck', coalesce(sum(tryck),0),
      'installationer', coalesce(sum(installationer),0), 'kostnad', coalesce(sum(kostnad),0)) from sju),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'visningar', v, 'tryck', t, 'installationer', i, 'kostnad', k) order by dag)
     from (select dag, sum(visningar) v, sum(tryck) t, sum(installationer) i, sum(kostnad) k from a group by 1) x), '[]'),
  'nyckelord', coalesce((select jsonb_agg(jsonb_build_object('annonsgrupp', annonsgrupp, 'nyckelord', nyckelord, 'visningar', v,
        'tryck', t, 'installationer', i, 'kostnad', k, 'sju_visningar', v7, 'sju_installationer', i7) order by v desc)
     from (select annonsgrupp, nyckelord, sum(visningar) v, sum(tryck) t, sum(installationer) i, sum(kostnad) k,
             sum(visningar) filter (where dag > (now() at time zone 'Europe/Stockholm')::date - 7) v7,
             sum(installationer) filter (where dag > (now() at time zone 'Europe/Stockholm')::date - 7) i7
           from a group by 1, 2) x), '[]'),
  'soktermer', coalesce((select jsonb_agg(jsonb_build_object('sokterm', sokterm, 'annonsgrupp', annonsgrupp, 'nyckelord', nyckelord,
        'visningar', v, 'tryck', t, 'installationer', i, 'kostnad', k) order by v desc)
     from (select sokterm, annonsgrupp, nyckelord, sum(visningar) v, sum(tryck) t, sum(installationer) i, sum(kostnad) k
           from a where sokterm <> '' group by 1, 2, 3 order by 4 desc limit 40) x), '[]')
);
$function$;
REVOKE ALL ON FUNCTION apple_ads_stat(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE apple_ads_sokord FROM anon; REVOKE ALL ON FUNCTION apple_ads_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE apple_ads_sokord FROM authenticated; REVOKE ALL ON FUNCTION apple_ads_stat(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE apple_ads_sokord TO service_role; GRANT EXECUTE ON FUNCTION apple_ads_stat(integer) TO service_role;
  END IF;
END $$;

-- besok_stat får nyckeln 'apple_ads' utan att resten av funktionen skrivs om (den kör sedan 28/10 ur 075 + besok_stat_stadad):
-- definitionen läses ur databasen och nyckeln läggs in efter 'genererad'. En andra körning ser nyckeln och gör ingenting.
DO $$
DECLARE d text;
BEGIN
  IF to_regprocedure('besok_stat(integer)') IS NULL THEN RETURN; END IF;
  d := pg_get_functiondef('besok_stat(integer)'::regprocedure);
  IF position('apple_ads_stat' in d) = 0 THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''apple_ads'', apple_ads_stat(dagar),');
    EXECUTE d;
  END IF;
END $$;
