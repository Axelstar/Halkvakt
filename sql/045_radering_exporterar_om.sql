-- 045: raderingen exporterar om ett dygn som vuxit sedan exporten, i stället för att stoppa hela natten (kort #322, #323;
-- DECISIONS #514).
--
-- VARFÖR. sql/034 lät en sen rad i ett exporterat dygn stoppa raderingen högljutt: RAISE EXCEPTION. Det var byggt för ett anrop
-- per natt. Sedan sql/044 (#511) anropar nattjobbet raderingen 40 gånger i EN sats, och ett undantag rullar då tillbaka hela
-- natten — också dygnen som redan raderats före det. Provet för kort #323 10/10 visade att fyra exporterade dygn, 19–22/9, bär 6–10
-- rader fler i databasen än i sina filer: rader från en eller två stationer, insatta långt efter exporten (transaktions-id kring
-- 1,52 miljoner mot dygnens 0,75–0,87). Raderingen hade nått 19/9 efter 22 dygn den första natten och rullat tillbaka alla 22.
--
-- NU. Ett dygn som har fler rader än sin fil tas ur bokföringen, så att arkivexporten tar det igen nästa timme (den skriver över
-- filen, x-upsert) med de sena raderna, och raderingen går vidare till nästa dygn. Dygnet raderas en senare natt, när filen och
-- databasen åter bär lika många rader. Ingen rad raderas som inte står i en fil; det skyddet är detsamma som förut.
-- Läkningen nederst tar de dygn som redan vuxit nu, så att de exporteras om i dag och inte först när raderingen når dem.

CREATE OR REPLACE FUNCTION arkiv_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 30) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE d date; filrader int; n int;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT dag, rader INTO d, filrader FROM arkiv_export
   WHERE raderad IS NULL AND dag < (now() AT TIME ZONE 'UTC')::date - min_dygn ORDER BY dag LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat dygn äldre än %s dygn att radera', min_dygn); END IF;
  SELECT count(*) INTO n FROM weather_observations
   WHERE sample_time >= d::timestamp AT TIME ZONE 'UTC' AND sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC';
  IF n > filrader THEN
    DELETE FROM arkiv_export WHERE dag = d;
    RETURN format('dygnet %s har %s rader, filen bara %s — exporteras om, raderas en senare natt', d, n, filrader);
  END IF;
  DELETE FROM weather_observations
   WHERE sample_time >= d::timestamp AT TIME ZONE 'UTC' AND sample_time < (d + 1)::timestamp AT TIME ZONE 'UTC';
  UPDATE arkiv_export SET raderad = now(), raderade_rader = n WHERE dag = d;
  RETURN format('raderade %s rader för %s (filen bär %s)', n, d, filrader);
END $$;

-- Läkningen: exporterade, ej raderade dygn som nu bär fler rader än sin fil tas ur bokföringen och exporteras om.
DELETE FROM arkiv_export e
 WHERE e.raderad IS NULL
   AND e.rader < (SELECT count(*) FROM weather_observations w
                   WHERE w.sample_time >= e.dag::timestamp AT TIME ZONE 'UTC' AND w.sample_time < (e.dag + 1)::timestamp AT TIME ZONE 'UTC');
