-- 061: favoriter — appens rapportfil (favoriterna version 1, kort #357; DECISIONS #541, #616, #617, Bengts val a 17/10: "a").
--
-- EGEN HINK, EGET ANROP. Funktionen favoriter bygger rapportfilen var tionde minut med samma frågor och samma kärna som favoritprovet
-- (publish/rapport-core.ts) och skriver rapport-snabb.json, rapport-lang.json (bara när linjerna ändrats), manifest.json (sha256 för
-- båda, skrivet sist) och historik.json till hinken `favoriter` i Supabase Storage. Hinken är läsbar för alla: appen hämtar
-- manifestet och filerna därifrån. Den bär bara Trafikverkets och SMHI:s öppna data, inga rutter och inga förare — matchningen mot
-- förarens rutt sker i telefonen. Filerna skrivs över, så ingen historik växer. Bara tjänstenyckeln skriver.
-- Finns bara i Supabase; CI:s PostGIS saknar storage-schemat och pg_cron, och då gör filen ingenting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('favoriter', 'favoriter', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Jobbet på :x6 (6, 16, 26, 36, 46, 56): minuter som inget annat jobb använder (cron.job läst 17/10 med DB-knappen 39043120615), sex
-- minuter efter publiceringen (:x0), så att lägesfilens kalla stationer är färska, och ensamt på sin minut — resursfelen 546 kom när
-- flera funktioner startade samtidigt (#344, #360). Kommandot KOPIERAS ur skuggmotorns svenska jobb inne i databasen med replace(), så
-- nyckeln aldrig står i en fil (husregeln, som sql/034, 037, 046 och 047).
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/061: skuggmotorns jobbkommando har inte väntad form — favoriternas jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-favoriter';
    PERFORM cron.schedule('halkvakt-favoriter', '6,16,26,36,46,56 * * * *', replace(k, '/functions/v1/skuggmotor''', '/functions/v1/favoriter'''));
  END IF;
END $$;
