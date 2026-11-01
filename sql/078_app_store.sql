-- 078: App Store-nedladdningarna per dygn och land (DECISIONS #773; Axel 1/11). Idempotent.
-- marknadsforing/appstore.mjs (appstore.yml) hämtar App Store Connects dagliga försäljningsrapport (SALES, SUMMARY, DAILY) för de
-- senaste sju dygnen och skriver om dem här varje körning. En rad per dygn och land: nya nedladdningar (produkttyp 1*), nya
-- nedladdningar av den som haft appen förut (3*) och uppdateringar (7*). Ett dygn utan nedladdningar får en rad med land '' och nollor.
-- Bara Apples egna aggregat: ingen användare, ingen enhet, ingen position.
-- statistik.html läser sammanställningen via besok_stat (nyckeln 'app_store'), som läser app_store_stat, som Apple Ads (076).
CREATE TABLE IF NOT EXISTS app_store_nedladdningar (
  dag date NOT NULL,
  land text NOT NULL DEFAULT '',
  nya integer NOT NULL DEFAULT 0,
  omladdningar integer NOT NULL DEFAULT 0,
  uppdateringar integer NOT NULL DEFAULT 0,
  hamtad timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, land)
);
ALTER TABLE app_store_nedladdningar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_store_nedladdningar FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_store_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with a as (select * from app_store_nedladdningar where dag > (now() at time zone 'Europe/Stockholm')::date - dagar),
senast as (select max(dag) d from app_store_nedladdningar),
sju as (select * from a where dag > (select d from senast) - 7)
select jsonb_build_object(
  'hamtad', (select max(hamtad) from app_store_nedladdningar),
  'senaste_dag', (select d from senast),
  'senaste', (select jsonb_build_object('nya', coalesce(sum(nya),0), 'omladdningar', coalesce(sum(omladdningar),0))
     from app_store_nedladdningar where dag = (select d from senast)),
  'period', (select jsonb_build_object('nya', coalesce(sum(nya),0), 'omladdningar', coalesce(sum(omladdningar),0),
      'uppdateringar', coalesce(sum(uppdateringar),0)) from a),
  'sju', (select jsonb_build_object('nya', coalesce(sum(nya),0), 'omladdningar', coalesce(sum(omladdningar),0)) from sju),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'nya', n, 'omladdningar', o, 'uppdateringar', u) order by dag)
     from (select dag, sum(nya) n, sum(omladdningar) o, sum(uppdateringar) u from a group by 1) x), '[]'),
  'per_land', coalesce((select jsonb_agg(jsonb_build_object('land', land, 'nya', n, 'omladdningar', o) order by n desc, land)
     from (select land, sum(nya) n, sum(omladdningar) o from a where land <> '' group by 1) x), '[]')
);
$function$;
REVOKE ALL ON FUNCTION app_store_stat(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE app_store_nedladdningar FROM anon; REVOKE ALL ON FUNCTION app_store_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE app_store_nedladdningar FROM authenticated; REVOKE ALL ON FUNCTION app_store_stat(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE app_store_nedladdningar TO service_role; GRANT EXECUTE ON FUNCTION app_store_stat(integer) TO service_role;
  END IF;
END $$;

-- besok_stat får nyckeln 'app_store' utan att resten av funktionen skrivs om, som 076 och 077: definitionen läses ur databasen och
-- nyckeln läggs in efter 'genererad'. En andra körning ser nyckeln och gör ingenting.
DO $$
DECLARE d text;
BEGIN
  IF to_regprocedure('besok_stat(integer)') IS NULL THEN RETURN; END IF;
  d := pg_get_functiondef('besok_stat(integer)'::regprocedure);
  IF position('app_store_stat' in d) = 0 THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''app_store'', app_store_stat(dagar),');
    EXECUTE d;
  END IF;
END $$;
