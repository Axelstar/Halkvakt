-- 077: appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11). Idempotent.
-- Appen skickar ett ord per händelse till edge-funktionen app-raknare, som räknar upp EN rad per dygn, app, händelse och värde.
-- Inget per användare: ingen position, ingen resa, inget enhets-id, ingen IP, ingen tid finare än dygnet. Fyra händelser:
--   onboarding_klar   introduktionen gick igenom (bara iOS; Android har ingen introduktion)
--   behorighet        platsbehörigheten som appen ser den: alltid | nar (när appen används) | nekad — räknas när den ÄNDRAS
--   vakt_startad      vakten startade: hand (knappen eller intentet) | sjalv (vaknade själv vid körning)
--   forsta_varningen  första repliken någonsin på enheten
-- statistik.html läser sammanställningen via besok_stat (nyckeln 'appen'), som läser app_raknare_stat, som Apple Ads (076).
CREATE TABLE IF NOT EXISTS app_raknare (
  dag date NOT NULL,
  app text NOT NULL,
  handelse text NOT NULL,
  varde text NOT NULL DEFAULT '',
  antal integer NOT NULL DEFAULT 0,
  PRIMARY KEY (dag, app, handelse, varde)
);
ALTER TABLE app_raknare ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_raknare FROM PUBLIC;

-- Räknar upp dagens rad. Dygnet är svenskt, som besöksräknarens. Returnerar dygnets summa över alla rader, så att
-- funktionen kan vägra vid ett tak utan en andra fråga.
CREATE OR REPLACE FUNCTION app_raknare_okna(p_app text, p_handelse text, p_varde text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare d date := (now() at time zone 'Europe/Stockholm')::date; s integer;
begin
  insert into app_raknare (dag, app, handelse, varde, antal) values (d, p_app, p_handelse, p_varde, 1)
    on conflict (dag, app, handelse, varde) do update set antal = app_raknare.antal + 1;
  select coalesce(sum(antal), 0) into s from app_raknare where dag = d;
  return s;
end $$;
REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text) FROM PUBLIC;

-- Sammanställningen för statistik.html: per händelse och värde i perioden, de senaste sju dygnen och i dag, och per dygn.
CREATE OR REPLACE FUNCTION app_raknare_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with idag as (select (now() at time zone 'Europe/Stockholm')::date d),
a as (select * from app_raknare, idag where dag > idag.d - dagar),
rad as (
  select handelse, varde, app,
    sum(antal) period,
    sum(antal) filter (where dag > (select d from idag) - 7) sju,
    sum(antal) filter (where dag = (select d from idag)) dagens
  from a group by 1, 2, 3
)
select jsonb_build_object(
  'period', (select coalesce(sum(antal), 0) from a),
  'rader', coalesce((select jsonb_agg(jsonb_build_object('handelse', handelse, 'varde', varde, 'app', app,
        'period', period, 'sju', sju, 'idag', dagens) order by handelse, varde, app) from rad), '[]'),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'handelse', handelse, 'varde', varde, 'antal', n) order by dag, handelse, varde)
     from (select dag, handelse, varde, sum(antal) n from a group by 1, 2, 3) x), '[]')
);
$function$;
REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE app_raknare FROM anon;
    REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text) FROM anon; REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE app_raknare FROM authenticated;
    REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text) FROM authenticated; REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE app_raknare TO service_role;
    GRANT EXECUTE ON FUNCTION app_raknare_okna(text, text, text) TO service_role; GRANT EXECUTE ON FUNCTION app_raknare_stat(integer) TO service_role;
  END IF;
END $$;

-- besok_stat får nyckeln 'appen' på samma sätt som 'apple_ads' (076): definitionen läses ur databasen och nyckeln läggs in efter
-- 'genererad'. En andra körning ser nyckeln och gör ingenting.
DO $$
DECLARE d text;
BEGIN
  IF to_regprocedure('besok_stat(integer)') IS NULL THEN RETURN; END IF;
  d := pg_get_functiondef('besok_stat(integer)'::regprocedure);
  IF position('app_raknare_stat' in d) = 0 THEN
    d := replace(d, '''genererad'', now(),', '''genererad'', now(),' || chr(10) || '  ''appen'', app_raknare_stat(dagar),');
    EXECUTE d;
  END IF;
END $$;
