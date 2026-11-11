-- 075: besöksräknaren, andra steget (DECISIONS #745; Axel 28/10). KÖRD 28/10 00:35–00:40 i Halkvakt-projektet via Supabase-verktyget,
-- inskriven här 29/10 så att repot bär det som kör. Idempotent.
-- (1) appklick: klick på App Store- och Play-länkar på halkvakt.se och i tidningsrutorna.
-- (2) anonym dagsbesökare: edge-funktionen `besok` hashar IP + webbläsare med ett salt som slumpas varje dygn och raderas nästa dygn.
--     Bara hashen (16 tecken) sparas, aldrig IP:n, och den går inte att koppla över dygn eller tillbaka till en IP.
-- (3) oss: våra egna webbläsare (?oss=1 på sajten) räknas inte i siffrorna.
ALTER TABLE besok
  ADD COLUMN IF NOT EXISTS typ text NOT NULL DEFAULT 'visning',
  ADD COLUMN IF NOT EXISTS mal text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS besokare text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS oss boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS besok_salt (
  dag date PRIMARY KEY,
  salt text NOT NULL
);
ALTER TABLE besok_salt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE besok_salt FROM PUBLIC;

CREATE OR REPLACE FUNCTION besok_dagssalt()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
declare d date := (now() at time zone 'Europe/Stockholm')::date; s text;
begin
  delete from besok_salt where dag < d;
  select salt into s from besok_salt where dag = d;
  if s is null then
    insert into besok_salt(dag, salt) values (d, encode(extensions.gen_random_bytes(32), 'hex'))
      on conflict (dag) do nothing;
    select salt into s from besok_salt where dag = d;
  end if;
  return s;
end $$;
REVOKE ALL ON FUNCTION besok_dagssalt() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE besok_salt FROM anon; REVOKE ALL ON FUNCTION besok_dagssalt() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE besok_salt FROM authenticated; REVOKE ALL ON FUNCTION besok_dagssalt() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE besok_salt TO service_role; GRANT EXECUTE ON FUNCTION besok_dagssalt() TO service_role;
  END IF;
END $$;

-- Sammanställningen för statistik.html: besökare per dygn, appklick per källa och sida, de flitigaste besökarna, och allt utan "oss".
CREATE OR REPLACE FUNCTION besok_stat(dagar integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
with alla0 as (
  select (ts at time zone 'Europe/Stockholm') as lt, sida, enhet, kod, kalla as radkalla, typ, mal, besokare, oss,
    (sida like '/ruta/%' or sida = '/ruta.html') as ar_ruta
  from besok
  where ts >= now() - make_interval(days => dagar)
), alla as (select * from alla0 where not oss and typ = 'visning'),
v as (
  select lt, sida, enhet, kod, besokare,
    case
      when radkalla = '' then 'Direkt / okänd'
      when radkalla = '(intern)' then '(inom sajten)'
      when radkalla ~ '(^|\.)google\.' then 'Google'
      when radkalla ~ '(^|\.)bing\.com$' then 'Bing'
      when radkalla ~ '(^|\.)duckduckgo\.com$' then 'DuckDuckGo'
      when radkalla ~ 'facebook\.com$' then 'Facebook'
      when radkalla ~ 'instagram\.com$' then 'Instagram'
      when radkalla ~ 'threads\.(net|com)$' then 'Threads'
      when radkalla ~ '(^|\.)(t\.co|x\.com|twitter\.com)$' then 'X'
      when radkalla ~ 'bsky\.app$' then 'Bluesky'
      when radkalla ~ 'reddit\.com$' then 'Reddit'
      else radkalla end as kalla
  from alla where not ar_ruta
), r as (
  select lt, enhet,
    case when sida = '/ruta.html' then coalesce(nullif(kod, ''), 'okänd') else split_part(sida, '/', 3) end as tidning,
    radkalla as kalla,
    radkalla not in ('', '(intern)') as inbaddad
  from alla where ar_ruta
), idag as (select (now() at time zone 'Europe/Stockholm')::date d),
bes as (
  select lt::date dag, besokare, count(*) n,
    min(lt) forst, max(lt) sist, max(enhet) enhet,
    (array_agg(kalla order by (kalla = '(inom sajten)'), lt))[1] kalla,
    (array_agg(nullif(kod,'') order by (kod = ''), lt))[1] kod,
    count(distinct sida) sidor
  from v where besokare <> '' group by 1, 2
), klick as (
  select a.lt, a.mal, a.sida,
    coalesce(nullif(bs.kalla, '(inom sajten)'), 'Okänd') kalla,
    coalesce(bs.kod, nullif(a.kod,'')) kod
  from alla0 a left join bes bs on bs.dag = a.lt::date and bs.besokare = a.besokare and a.besokare <> ''
  where a.typ = 'appklick' and not a.oss
)
select jsonb_build_object(
  'genererad', now(),
  'idag', (select count(*) from v, idag where lt::date = idag.d),
  'igar', (select count(*) from v, idag where lt::date = idag.d - 1),
  'sju', (select count(*) from v, idag where lt::date > idag.d - 7),
  'period', (select count(*) from v),
  'ingangar', (select count(*) from v where kalla <> '(inom sajten)'),
  'besokare', (select count(*) from bes),
  'besokare_idag', (select count(*) from bes, idag where dag = idag.d),
  'besokare_igar', (select count(*) from bes, idag where dag = idag.d - 1),
  'besokare_sju', (select count(*) from bes, idag where dag > idag.d - 7),
  'oss', (select count(*) from alla0 where oss),
  'appklick', (select count(*) from klick),
  'appklick_sju', (select count(*) from klick, idag where lt::date > idag.d - 7),
  'appklick_mal', coalesce((select jsonb_object_agg(mal, n) from (select mal, count(*) n from klick group by 1) x), '{}'),
  'appklick_kallor', coalesce((select jsonb_agg(jsonb_build_object('kalla', kalla, 'visningar', n) order by n desc)
     from (select kalla, count(*) n from klick group by 1) x), '[]'),
  'appklick_sidor', coalesce((select jsonb_agg(jsonb_build_object('sida', sida, 'visningar', n) order by n desc)
     from (select sida, count(*) n from klick group by 1 order by 2 desc limit 20) x), '[]'),
  'appklick_koder', coalesce((select jsonb_object_agg(kod, n) from (select kod, count(*) n from klick where kod is not null group by 1) x), '{}'),
  'per_dag', coalesce((select jsonb_agg(jsonb_build_object('dag', d, 'visningar', n, 'ingangar', e,
        'besokare', (select count(*) from bes where bes.dag = x.d),
        'appklick', (select count(*) from klick where klick.lt::date = x.d)) order by d)
     from (select lt::date d, count(*) n, count(*) filter (where kalla <> '(inom sajten)') e from v group by 1) x), '[]'),
  'per_timme', coalesce((select jsonb_agg(jsonb_build_object('timme', h, 'visningar', n) order by h)
     from (select extract(hour from lt)::int h, count(*) n from v group by 1) x), '[]'),
  'sidor', coalesce((select jsonb_agg(jsonb_build_object('sida', sida, 'visningar', n) order by n desc)
     from (select sida, count(*) n from v group by 1 order by 2 desc limit 40) x), '[]'),
  'kallor', coalesce((select jsonb_agg(jsonb_build_object('kalla', kalla, 'visningar', n) order by n desc)
     from (select kalla, count(*) n from v where kalla <> '(inom sajten)' group by 1 order by 2 desc limit 25) x), '[]'),
  'koder', coalesce((select jsonb_agg(jsonb_build_object('kod', kod, 'visningar', n, 'senast', s) order by n desc)
     from (select kod, count(*) n, max(lt) s from v where kod <> '' group by 1) x), '[]'),
  'enheter', coalesce((select jsonb_object_agg(enhet, n) from (select enhet, count(*) n from v group by 1) x), '{}'),
  'tyngsta', coalesce((select jsonb_agg(jsonb_build_object('dag', dag, 'id', left(besokare, 6), 'visningar', n,
        'forst', to_char(forst, 'HH24:MI'), 'sist', to_char(sist, 'HH24:MI'), 'enhet', enhet, 'kalla', kalla,
        'sidor', sidor) order by n desc)
     from (select * from bes order by n desc limit 12) x), '[]'),
  'rutor', coalesce((select jsonb_agg(jsonb_build_object(
        'tidning', tidning, 'inbaddad', inb, 'sju', sju, 'idag', idg, 'direkt', dir, 'mobil', mob,
        'senast', senast, 'sajter', sajter) order by inb desc, dir desc)
     from (select tidning,
             count(*) filter (where inbaddad) inb,
             count(*) filter (where inbaddad and lt::date > (select d from idag) - 7) sju,
             count(*) filter (where inbaddad and lt::date = (select d from idag)) idg,
             count(*) filter (where not inbaddad) dir,
             count(*) filter (where inbaddad and enhet = 'mobil') mob,
             max(lt) filter (where inbaddad) senast,
             coalesce((select jsonb_agg(k order by k) from (select distinct r2.kalla k from r r2 where r2.tidning = r.tidning and r2.inbaddad) s), '[]') sajter
           from r group by tidning) x), '[]')
);
$function$;
