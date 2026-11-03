-- 081: fast search_path på våra egna PL/pgSQL-funktioner i public (DECISIONS #784; Axel 3/11).
-- Supabases säkerhetsgranskning (lint 0011 function_search_path_mutable) flaggade 45 funktioner utan fast search_path. En sådan
-- funktion slår upp tabellnamn i den anropandes sökväg, så den som kan skapa objekt kan i princip lura den att läsa sin egen tabell.
-- Värdet är det som redan gäller: postgres-rollen har "$user", public, extensions, och det finns inget schema som heter postgres,
-- så public, extensions ger samma uppslag som i dag. Inget beteende ändras.
-- BARA plpgsql. De 23 sql-funktionerna (reglerna, kandidat_hav, arkiv2_* m.fl.) lämnas med flit: en sql-funktion med en SET-klausul
-- inlinas inte längre av planeraren, och reglerna och kandidat_hav körs per rad i kandidatens timjobb.
-- Postgis och pg_nets egna funktioner rörs inte (pg_depend deptype 'e').
-- OBS: CREATE OR REPLACE FUNCTION utan SET nollställer inställningen. Kör om den här filen efter varje fil som skriver om en
-- plpgsql-funktion i public, eller skriv SET search_path = public, extensions i den nya definitionen.
-- Idempotent: tar bara funktioner som saknar search_path. Rör inga roller, så den går också i CI:s PostGIS.
DO $$
DECLARE
  f regprocedure;
  n integer := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE ns.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND l.lanname = 'plpgsql'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f);
    n := n + 1;
  END LOOP;
  RAISE NOTICE '081: search_path satt på % funktioner', n;
END
$$;
