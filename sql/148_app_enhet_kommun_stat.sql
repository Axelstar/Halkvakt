-- 148: platsdelningens statistik per kommun (DECISIONS #977; Axel 27/11). Idempotent. Ersätter länsräkningen i sql/130.
-- Antal installationer per kommun, avrundat till närmaste tiotal och aldrig för en kommun med färre än tjugo telefoner.
-- Gränsen hindrar att en liten kommun pekar ut enskilda, och avrundningen att en enskild telefon syns komma eller gå.
-- Det enda som får läsas ut ur app_enhet för statistik och partner. Raden per telefon lämnar aldrig tabellen.
-- En enda SELECT utan delfråga, som 130: funktionen anropas en gång per läsning, inte per rad.
CREATE OR REPLACE FUNCTION app_enhet_kommun_stat()
RETURNS TABLE (kommun text, antal integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.kommun, (round(count(*) / 10.0) * 10)::integer FROM app_enhet e GROUP BY e.kommun HAVING count(*) >= 20 ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.app_enhet_kommun_stat() FROM PUBLIC;

-- Länsräkningen med gränsen tio (sql/130) är ersatt och tas bort, så att det finns en enda väg ut ur tabellen.
DROP FUNCTION IF EXISTS public.app_enhet_lan_stat();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.app_enhet_kommun_stat() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.app_enhet_kommun_stat() FROM authenticated;
  END IF;
END $$;
