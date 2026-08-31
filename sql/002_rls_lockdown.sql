-- 002: Row-level security lockdown (BACKLOG #30, Bengts issue #3, 2026-08-31).
--
-- MEASURED BEFORE THIS MIGRATION: the anon key — published in halkvakt-karta/data/config.json
-- by design, for the waitlist form — could SELECT from 8 archive tables and had UPDATE/DELETE
-- authority on all of them (PATCH → 204 against a probe id). Anyone with the map's config
-- could insert a fake accident or delete real road conditions; the app's snapshot is built
-- from these tables. Nothing legitimate reads them through the REST API: the map is static
-- JSON on Pages, the apps read Pages, the report page uses an edge function.
--
-- Two independent locks, on purpose (belt and braces):
--   1. RLS enabled with NO policy for anon/authenticated ⇒ deny by default.
--   2. Privileges revoked from anon/authenticated ⇒ denied even if RLS were disabled again.
-- The pipeline is untouched: ingest, publish, edge functions and cron all connect as the
-- postgres role via DATABASE_URL/SUPABASE_DB_URL, which bypasses RLS. shadow_log already
-- had RLS on and skuggmotor writes to it every 30 min — living proof.
--
-- waitlist keeps its single INSERT-only policy (DECISIONS #10): anon may add, never read.
-- spatial_ref_sys is PostGIS's own; left alone.
-- Idempotent: safe to run on every ingest like 001.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cameras', 'deviations', 'polisen_events', 'road_condition_history', 'road_conditions',
    'shadow_log', 'smhi_warnings', 'smhi_warnings_history', 'sync_state',
    'weather_latest', 'weather_observations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- waitlist: RLS already on with waitlist_anon_insert. Make the grant match the policy
-- exactly — INSERT only, so a future "disable RLS" click cannot expose the emails.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.waitlist FROM anon, authenticated;
GRANT INSERT ON TABLE public.waitlist TO anon;

-- Stop future tables from being born open. Supabase's default privileges grant ALL on new
-- tables to anon/authenticated; this narrows the default for tables created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
