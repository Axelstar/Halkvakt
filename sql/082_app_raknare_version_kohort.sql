-- 082: räknaren får version och kohort (DECISIONS #787; Axel och Bengt 3/11). Idempotent.
-- Varje rad räknas nu också per appversion (ver, t.ex. 0.3.16) och kohort: 'ny' = telefonen installerade appen efter att
-- räknaren kom, 'befintlig' = den hade appen förut. Det skiljer "nya användare" från "gamla som uppdaterade", vilket 0.3.15:s
-- tal blandade ihop. Fortfarande inget per användare: ingen position, inget enhets-id, ingen IP, ingen tid finare än dygnet.
-- Rader från 0.3.15 (som inte skickar ver eller k) får '' i båda.
ALTER TABLE app_raknare ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '';
ALTER TABLE app_raknare ADD COLUMN IF NOT EXISTS kohort text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'app_raknare'::regclass AND c.contype = 'p' AND a.attname = 'kohort'
  ) THEN
    ALTER TABLE app_raknare DROP CONSTRAINT IF EXISTS app_raknare_pkey;
    ALTER TABLE app_raknare ADD PRIMARY KEY (dag, app, version, kohort, handelse, varde);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION app_raknare_okna(p_app text, p_version text, p_kohort text, p_handelse text, p_varde text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$   -- fast sökväg, som sql/081
declare d date := (now() at time zone 'Europe/Stockholm')::date; s integer;
begin
  insert into app_raknare (dag, app, version, kohort, handelse, varde, antal) values (d, p_app, p_version, p_kohort, p_handelse, p_varde, 1)
    on conflict (dag, app, version, kohort, handelse, varde) do update set antal = app_raknare.antal + 1;
  select coalesce(sum(antal), 0) into s from app_raknare where dag = d;
  return s;
end $$;
REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text, text, text) FROM PUBLIC;

-- Den gamla formen finns kvar så att den driftsatta funktionen räknar rätt mellan migrationen och nästa deploy av app-raknare.
CREATE OR REPLACE FUNCTION app_raknare_okna(p_app text, p_handelse text, p_varde text)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  select app_raknare_okna(p_app, '', '', p_handelse, p_varde);
$$;
REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text) FROM PUBLIC;

-- Sammanställningen: som 077, med version och kohort på varje rad och per dygn.
CREATE OR REPLACE FUNCTION app_raknare_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with idag as (select (now() at time zone 'Europe/Stockholm')::date d),
a as (select * from app_raknare, idag where dag > idag.d - dagar),
rad as (
  select handelse, varde, app, version, kohort,
    sum(antal) period,
    sum(antal) filter (where dag > (select d from idag) - 7) sju,
    sum(antal) filter (where dag = (select d from idag)) dagens
  from a group by 1, 2, 3, 4, 5
)
select jsonb_build_object(
  'period', (select coalesce(sum(antal), 0) from a),
  'rader', coalesce((select jsonb_agg(jsonb_build_object('handelse', handelse, 'varde', varde, 'app', app,
        'version', version, 'kohort', kohort, 'period', period, 'sju', sju, 'idag', dagens)
        order by handelse, varde, app, version, kohort) from rad), '[]'),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'handelse', handelse, 'varde', varde, 'kohort', kohort, 'antal', n)
        order by dag, handelse, varde, kohort)
     from (select dag, handelse, varde, kohort, sum(antal) n from a group by 1, 2, 3, 4) x), '[]')
);
$function$;
REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text, text, text) FROM anon;
    REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION app_raknare_okna(text, text, text, text, text) FROM authenticated;
    REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE app_raknare TO service_role;
    GRANT EXECUTE ON FUNCTION app_raknare_okna(text, text, text, text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION app_raknare_stat(integer) TO service_role;
  END IF;
END $$;
