-- 092: statistikens fönster räknas mot hela tabellen (DECISIONS #807; Axel 6/11). Idempotent.
-- Förut räknades "7 dygn" och "i dag" inom vald period (CTE:n a), så med perioden ett dygn blev 7-dygnskolumnen samma som
-- dagens tal, och varningarna den 4/11 syntes inte på halkvakt.se/statistik. Nu följer 'period' vald period som förut, medan
-- 'sju' och 'idag' är fasta fönster oavsett period. En rad som har tal i ett fönster men inte i perioden kommer med, med period 0.
-- 'per_dag' följer perioden som förut (stapeln över perioden). Inget nytt lagras; funktionen läser bara.
CREATE OR REPLACE FUNCTION app_raknare_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with idag as (select (now() at time zone 'Europe/Stockholm')::date d),
a as (select * from app_raknare, idag where dag > idag.d - dagar),
b as (select * from app_raknare, idag where dag > idag.d - greatest(dagar, 7)),
rad as (
  select handelse, varde, app, version, kohort,
    coalesce(sum(antal) filter (where dag > d - dagar), 0) period,
    coalesce(sum(antal) filter (where dag > d - 7), 0) sju,
    coalesce(sum(antal) filter (where dag = d), 0) dagens
  from b group by 1, 2, 3, 4, 5
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
    REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION app_raknare_stat(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION app_raknare_stat(integer) TO service_role;
  END IF;
END $$;
