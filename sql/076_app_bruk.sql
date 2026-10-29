-- 076: appstatistiken, bara iOS (DECISIONS #746; Axel 28–29/10). Kör INTE förrän #746 är sammanslagen med Bengts ja.
-- En rad per telefon och AVSLUTAT dygn: dagen, kanalen (appstore/testflight/debug), appversionen och räknarna ur den fasta listan i
-- ios/HalkvaktEngine/Sources/HalkvaktEngine/Bruket.swift. Inget enhets-id, ingen IP, ingen position, inget klockslag; `mottagen` är
-- serverns tid. Skrivs och läses bara av edge-funktionen `appbruk` med servicenyckeln; RLS utan policy + REVOKE (CLAUDE.md-läxan).
CREATE TABLE IF NOT EXISTS app_bruk (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mottagen timestamptz NOT NULL DEFAULT now(),
  dag date NOT NULL,
  kanal text NOT NULL,
  ver text NOT NULL DEFAULT '',
  r jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS app_bruk_dag_idx ON app_bruk (dag);
ALTER TABLE app_bruk ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_bruk FROM PUBLIC;

-- Sammanställningen för statistik.html: telefoner per dygn (= rader, eftersom varje telefon skickar ett dygn en gång) och summan
-- av varje räknare, för perioden och per dygn, och versionerna.
CREATE OR REPLACE FUNCTION appbruk_stat(dagar int DEFAULT 30, kanal_ text DEFAULT 'appstore') RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
with a as (
  select dag, ver, r from app_bruk
  where kanal = kanal_ and dag > (now() at time zone 'Europe/Stockholm')::date - dagar
), k as (
  select a.dag, e.key namn, e.value::int n from a, jsonb_each_text(a.r) e
)
select jsonb_build_object(
  'genererad', now(),
  'kanal', kanal_,
  'telefondygn', (select count(*) from a),
  'summa', coalesce((select jsonb_object_agg(namn, n) from (select namn, sum(n) n from k group by 1) x), '{}'),
  'telefoner_med', coalesce((select jsonb_object_agg(namn, n) from (select namn, count(*) n from k where n > 0 group by 1) x), '{}'),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'telefoner', t,
        'r', coalesce((select jsonb_object_agg(namn, s) from (select namn, sum(n) s from k where k.dag = x.dag group by 1) y), '{}'))
        order by dag)
     from (select dag, count(*) t from a group by 1) x), '[]'),
  'versioner', coalesce((select jsonb_object_agg(ver, n) from (select ver, count(*) n from a group by 1) x), '{}')
);
$$;
REVOKE ALL ON FUNCTION appbruk_stat(int, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE app_bruk FROM anon; REVOKE ALL ON FUNCTION appbruk_stat(int, text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE app_bruk FROM authenticated; REVOKE ALL ON FUNCTION appbruk_stat(int, text) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE app_bruk TO service_role; GRANT EXECUTE ON FUNCTION appbruk_stat(int, text) TO service_role;
  END IF;
END $$;
