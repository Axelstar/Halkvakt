-- 062: kortare förvaring i databasen för kandidatens loggar och för trendtabellerna och radarn (DECISIONS #618, Bengts val 17/10:
-- "1 b och c", på #580:s steg 2 som föll: +4,2 MB på dygnet mot högst 2).
--
-- (b) Kandidatens två loggar (kandidat_skugga, kandidat_station) raderas ur databasen efter ett dygn i stället för tre (#573). De
--     exporteras till hinken dygnet efter (arkiv2_alder 1), så ett dygn i databasen räcker: nattjobbet 03:50 tar dygn som är äldre än
--     i går, och i går exporterades 00:40 samma natt. kandidat_station växte 1,9 MB per dygn och hade fyllt tre dygn till 19/10.
-- (c) Trendtabellerna och radarn (trend_kandidater, trend_stigande, radar_precip) raderas efter tio dygn i stället för fjorton. De
--     exporteras när de är åtta dygn gamla (arkiv2_alder 8), så inget raderas innan det ligger i hinken. Läsare som går längre bak än
--     tio dygn i databasen (steg 0 läser radarn 14 dygn) ser tio dygn, och skriver ut det.
-- Väderobservationerna står kvar på fjorton dygn (Bengt valde inte (a)). Raderingen tar bara dygn som är exporterade och bokförda,
-- och bara när radantalet stämmer med filen (arkiv2_radera_exporterat, oförändrad utom texten).
CREATE OR REPLACE FUNCTION arkiv2_golv(tab text, min_dygn int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 1 ELSE min_dygn END $$;

-- Samma funktion som sql/057; bara texten när inget finns att radera läser golvet ur arkiv2_golv i stället för att säga "3".
CREATE OR REPLACE FUNCTION arkiv2_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 14) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE tb text; d date; filrader int; n int;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT e.tabell, e.dag, e.rader INTO tb, d, filrader FROM arkiv_export_tabell e
   WHERE e.raderad IS NULL AND e.dag < (now() AT TIME ZONE 'UTC')::date - arkiv2_golv(e.tabell, min_dygn) ORDER BY e.dag, e.tabell LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat tabelldygn äldre än golvet (%s dygn, kandidatens loggar %s) att radera', min_dygn,
    arkiv2_golv('kandidat_station', min_dygn)); END IF;
  EXECUTE format('SELECT count(*) FROM %I WHERE observed_at >= $1 AND observed_at < $2', arkiv2_tabell(tb))
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n > filrader THEN
    DELETE FROM arkiv_export_tabell e WHERE e.tabell = tb AND e.dag = d;
    RETURN format('%s %s har %s rader, filen bara %s — exporteras om, raderas en senare natt', tb, d, n, filrader);
  END IF;
  EXECUTE format('DELETE FROM %I WHERE observed_at >= $1 AND observed_at < $2', tb)
    USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  UPDATE arkiv_export_tabell e SET raderad = now(), raderade_rader = n WHERE e.tabell = tb AND e.dag = d;
  RETURN format('%s: raderade %s rader för %s (filen bär %s)', tb, n, d, filrader);
END $$;

-- (c) Nattjobbet 03:50 med golvet tio i stället för fjorton. Kommandot är ren SQL utan nyckel, så det skrivs här som i sql/053.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-arkivradering-tabeller';
    PERFORM cron.schedule('halkvakt-arkivradering-tabeller', '50 3 * * *', 'SELECT arkiv2_radera_exporterat(350, 10) FROM generate_series(1, 40)');
  END IF;
END $$;
