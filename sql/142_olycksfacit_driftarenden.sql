-- 142: DRIFTLARMETS ÄRENDEN (kort #641, TROSKLAR-OLYCKSFACIT §10; Bengts val 24/11 på beslutskortet: "Bara våra egna fel", DECISIONS #959).
-- Skuggan (sql/108) har sedan 11/11 skrivit en rad i olycksfacit_driftlarm per olycka och feltyp. Nu får tre feltyper göra ärenden:
-- 'appen stilla', 'K ingen timme' och 'K gallrad' (listan bor i supabase/functions/olycksfacit/drift.ts, DRIFT_FELTYPER). 'A2 tyst' och
-- 'appen okänd' skrivs som förut men gör inga ärenden.
--   * olycksfacit_driftlarm.skickad_at och arende_nr: när raden nådde GitHub och vilket ärende den hamnade i. Skuggans rader (före den
--     här filen) märks skickade utan nummer, så att inga gamla olyckor blir ärenden.
--   * olycksfacit_drift_arenden: ett ärende per svenskt dygn och feltyp; följande olyckor blir kommentarer.
--   * Jobbet halkvakt-olycksfacit-driftarende anropar funktionen olycksfacit med ?drift=1 tio minuter efter fångsten (:10, :25, :40, :55),
--     fem minuter efter skuggans prövning. Kommandot kopieras ur skuggmotorns jobb med replace(), som sql/085, så att nyckeln aldrig står i
--     en fil. ORDNINGEN: funktionen olycksfacit deployas FÖRST; en äldre funktion läser inte ?drift=1.
-- Av: cron.unschedule('halkvakt-olycksfacit-driftarende'). Idempotent.

-- Skuggans rader märks bara när kolumnen läggs till, så att en omkörning av filen aldrig tar en väntande rad för en skickad.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olycksfacit_driftlarm' AND column_name = 'skickad_at') THEN
    ALTER TABLE olycksfacit_driftlarm ADD COLUMN skickad_at timestamptz;
    UPDATE olycksfacit_driftlarm SET skickad_at = upptackt_at;
  END IF;
END $$;
ALTER TABLE olycksfacit_driftlarm ADD COLUMN IF NOT EXISTS arende_nr int;

CREATE TABLE IF NOT EXISTS olycksfacit_drift_arenden (
  dag        date NOT NULL,                   -- svenskt dygn då felet upptäcktes
  feltyp     text NOT NULL,
  nr         int NOT NULL,                    -- ärendets nummer i GitHub
  skapad_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dag, feltyp)
);

ALTER TABLE olycksfacit_drift_arenden ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE olycksfacit_drift_arenden FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE olycksfacit_drift_arenden FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE olycksfacit_drift_arenden FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT ALL ON TABLE olycksfacit_drift_arenden TO service_role; END IF;
END $$;

DO $$
DECLARE k text; mal text := '/functions/v1/skuggmotor''';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT command INTO k FROM cron.job WHERE jobname = 'halkvakt-skuggmotor';
    IF k IS NULL OR (length(k) - length(replace(k, mal, ''))) / length(mal) <> 1 THEN
      RAISE EXCEPTION 'sql/142: skuggmotorns jobbkommando har inte väntad form (en adress till skuggmotorn) — jobbet skapas inte';
    END IF;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-olycksfacit-driftarende';
    PERFORM cron.schedule('halkvakt-olycksfacit-driftarende', '10-59/15 * * * *', replace(k, mal, '/functions/v1/olycksfacit?drift=1'''));
  END IF;
END $$;
