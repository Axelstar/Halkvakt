-- 047: favoritprovet — favoriternas testmiljö (DECISIONS #529, Bengt 11/10: "en testmiljö … under faktiska förhållanden och inte
-- når ut till själva telefonen").
--
-- EGEN HINK, EGET ANROP. Funktionen favoritprov bygger rapportfilen och det fliken skulle visa för skuggans 30 rutter var 30:e minut,
-- och skriver allt till hinken `favoritprov` i Supabase Storage — aldrig till kartrepot eller data/app/v1/, så ingen app läser något
-- av det. Filerna skrivs över, så ingen historik växer. Hinken är läsbar för alla (visningen docs/favoritprov.html läser den utan
-- nyckel); den bär bara Trafikverkets och SMHI:s öppna data och skuggans rutter, inga förare. Bara tjänstenyckeln skriver.
-- Finns bara i Supabase; CI:s PostGIS saknar storage-schemat och pg_cron, och då gör filen ingenting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('favoritprov', 'favoritprov', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Jobbet på :05/:35, mellan publiceringens tiominutersvarv (:00, :10 …) och skuggans (:02/:32, :12/:42, :22/:52). Kommandot KOPIERAS
-- ur skuggmotorns svenska jobb inne i databasen med replace(), så nyckeln aldrig står i en fil (husregeln, som sql/034, 037 och 046).
DO $$
DECLARE k text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR position('/functions/v1/skuggmotor''' in k) = 0 THEN
      RAISE EXCEPTION 'sql/047: skuggmotorns jobbkommando har inte väntad form — favoritprovets jobb skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-favoritprov';
    PERFORM cron.schedule('halkvakt-favoritprov', '5,35 * * * *', replace(k, '/functions/v1/skuggmotor''', '/functions/v1/favoritprov'''));
  END IF;
END $$;
