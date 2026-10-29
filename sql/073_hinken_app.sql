-- 073: lägesfilen i hinken (DECISIONS #741 punkt 2, kort #365; Bengt 28/10: "genomför hela uppsnabbningspaketet").
--
-- EGEN HINK, SOM FAVORITERNA (sql/061). Funktionen publicera skriver appens tre filer till den publika hinken `app` vid varje
-- körning: v1/static.json och v1/live.json först och v1/manifest.json sist, så att manifestet aldrig pekar på en fil som inte är
-- skriven. Sökvägen ger samma adress under storage/v1/object/public/ som manifestets `app/v1/…` under halkvakt.se/data/. GitHub och
-- Pages skrivs som förut, så kartan och de installerade apparna märker ingenting; appen läser hinken först efter fas 2 (punkt 4).
-- Hinken är läsbar för alla och bär bara Trafikverkets, SMHI:s och de andra öppna källornas data, inga rutter och inga förare.
-- Filerna skrivs över, så ingen historik växer. Bara tjänstenyckeln skriver.
-- Finns bara i Supabase; CI:s PostGIS saknar storage-schemat, och då gör filen ingenting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('app', 'app', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
