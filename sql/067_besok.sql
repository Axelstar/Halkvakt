-- 067: besöksräknaren för halkvakt.se (DECISIONS #684, Axels beställning 20/10; körd 20/10 som 064 och numrerad om 23/10).
-- En rad per sidvisning: sökväg, hänvisande domän, ?r=-kod och mobil/dator. Ingen IP, inga kakor, inget användar-id.
-- Skrivs och läses bara av edge-funktionen `besok` med servicenyckeln; RLS utan policy + REVOKE (CLAUDE.md-läxan).
-- Nyckeln till statistiksidan ligger som sha256 i besok_nyckel och sätts för hand, aldrig i repot.
CREATE TABLE IF NOT EXISTS besok (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  sida text NOT NULL,
  kalla text NOT NULL DEFAULT '',
  kod text NOT NULL DEFAULT '',
  enhet text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS besok_ts_idx ON besok (ts);
ALTER TABLE besok ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS besok_nyckel (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), hash text NOT NULL);
ALTER TABLE besok_nyckel ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION besok_stat(dagar int DEFAULT 30) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
with b as (
  select (ts at time zone 'Europe/Stockholm') as lt, sida, enhet, kod,
    case
      when kalla = '' then 'Direkt / okänd'
      when kalla = '(intern)' then '(inom sajten)'
      when kalla ~ '(^|\.)google\.' then 'Google'
      when kalla ~ '(^|\.)bing\.com$' then 'Bing'
      when kalla ~ '(^|\.)duckduckgo\.com$' then 'DuckDuckGo'
      when kalla ~ 'facebook\.com$' then 'Facebook'
      when kalla ~ 'instagram\.com$' then 'Instagram'
      when kalla ~ 'threads\.(net|com)$' then 'Threads'
      when kalla ~ '(^|\.)(t\.co|x\.com|twitter\.com)$' then 'X'
      when kalla ~ 'bsky\.app$' then 'Bluesky'
      when kalla ~ 'reddit\.com$' then 'Reddit'
      else kalla end as kalla
  from besok
  where ts >= now() - make_interval(days => dagar)
), idag as (select (now() at time zone 'Europe/Stockholm')::date d)
select jsonb_build_object(
  'genererad', now(),
  'idag', (select count(*) from b, idag where lt::date = idag.d),
  'igar', (select count(*) from b, idag where lt::date = idag.d - 1),
  'sju', (select count(*) from b, idag where lt::date > idag.d - 7),
  'period', (select count(*) from b),
  'ingangar', (select count(*) from b where kalla <> '(inom sajten)'),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', d, 'visningar', n, 'ingangar', e) order by d)
     from (select lt::date d, count(*) n, count(*) filter (where kalla <> '(inom sajten)') e from b group by 1) x), '[]'),
  'per_timme', coalesce((select jsonb_agg(jsonb_build_object('timme', h, 'visningar', n) order by h)
     from (select extract(hour from lt)::int h, count(*) n from b group by 1) x), '[]'),
  'sidor', coalesce((select jsonb_agg(jsonb_build_object('sida', sida, 'visningar', n) order by n desc)
     from (select sida, count(*) n from b group by 1 order by 2 desc limit 40) x), '[]'),
  'kallor', coalesce((select jsonb_agg(jsonb_build_object('kalla', kalla, 'visningar', n) order by n desc)
     from (select kalla, count(*) n from b where kalla <> '(inom sajten)' group by 1 order by 2 desc limit 25) x), '[]'),
  'koder', coalesce((select jsonb_agg(jsonb_build_object('kod', kod, 'visningar', n, 'senast', s) order by n desc)
     from (select kod, count(*) n, max(lt) s from b where kod <> '' group by 1) x), '[]'),
  'enheter', coalesce((select jsonb_object_agg(enhet, n) from (select enhet, count(*) n from b group by 1) x), '{}')
);
$$;
REVOKE ALL ON FUNCTION besok_stat(int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON besok, besok_nyckel FROM anon; REVOKE ALL ON FUNCTION besok_stat(int) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON besok, besok_nyckel FROM authenticated; REVOKE ALL ON FUNCTION besok_stat(int) FROM authenticated;
  END IF;
END $$;
-- Rättigheterna för service_role står uttryckligen i filen (DECISIONS #653). Filen numrerades om från 064 till 067 23/10 (#684);
-- tabellerna skapades 20/10 och fick då också Supabases standard. Raderna nedan är idempotenta.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE besok TO service_role;
    GRANT ALL ON TABLE besok_nyckel TO service_role;
    GRANT EXECUTE ON FUNCTION besok_stat(int) TO service_role;
  END IF;
END $$;
