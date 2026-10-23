-- 064: RÄTTIGHETERNA SKRIVS UT (DECISIONS #653). Supabase slutar 30/10 2026 att ge nya tabeller i public rättigheter av sig själv.
-- Hittills har varje ny tabell fått service_role (och en sekvens alla tre rollerna) ur Supabases standardrättigheter, inte ur våra
-- filer: 059 ger service_role ingenting på kandidat_brytare, 055 bara SELECT på vagpunkt, men databasen visar fullt för service_role på
-- båda. Efter 30/10 får en ny tabell ingenting, och edge-funktionerna (supabase-js med service-nyckeln) får "permission denied".
-- Gäller också om schemat byggs upp på nytt ur sql/ (nytt projekt, gren): då ges inget av sig självt för någon tabell alls.
--
-- Den här filen skriver ut det databasen redan har (läst 20/10 21:50 ur pg_class.relacl), så att sql/ ensamt räcker:
--   alla egna tabeller i public:   ALL till service_role (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)
--   alla egna sekvenser i public:  USAGE, SELECT, UPDATE till service_role
--   waitlist:                      INSERT till anon (webbsidans väntelista, oförändrad)
-- anon och authenticated får ingenting nytt. Låsningen står kvar (CLAUDE.md: RLS utan policy + REVOKE).
-- Bara tabeller som postgres äger: spatial_ref_sys och PostGIS-vyerna ägs av supabase_admin, och deras rättigheter kan vi varken ge
-- eller ta. Idempotent: körd mot produktionen ändrar den ingenting. Vaktad på pg_roles, så att ci:s PostGIS utan rollerna klarar den.
-- Regeln framåt (CLAUDE.md, test/rattigheter.test.ts): varje ny tabell i public ger service_role sina rättigheter i samma fil.

DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    FOR r IN
      SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S') AND c.relowner = current_user::regrole
    LOOP
      IF r.relkind = 'S' THEN
        EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.%I TO service_role', r.relname);
      ELSE
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', r.relname);
      END IF;
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND to_regclass('public.waitlist') IS NOT NULL THEN
    GRANT INSERT ON TABLE public.waitlist TO anon;
  END IF;
END $$;
