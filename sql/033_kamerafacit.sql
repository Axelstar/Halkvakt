-- 033: kamerafacit — Bengts klassning av facit-hinkens bilder (kort #242, DECISIONS #329, Bengts "gör kamerafacit" 24/9).
--
-- TROSKLAR-SKUGGAN §2: kameran får BEKRÄFTA en träff (snö och slask syns i bild) men aldrig FÄLLA en varning (svartis
-- syns inte). Regeln bor i dom-knappen (publish/grind-s-b.ts), inte här — tabellen är bara facit: vilken bild, från vilken
-- kamera, när, och vad Bengt såg. Sex klasser: is · snö · slask · våt · bar · okänd. De tre första är halka (händelse och
-- bekräftelse), de tre sista gör ingenting i domen. Matas via dbknapp (INSERT-fil) tills en enkel sida finns.
-- Dubbellåst som förarfacitet (002-läxan): RLS utan policy + REVOKE, aldrig läsbar via REST.
CREATE TABLE IF NOT EXISTS kamerafacit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bild text NOT NULL,                                   -- sökvägen i facit-hinken, t.ex. 2026-12-01/12345-166000.jpg
  kamera_id text NOT NULL,                              -- Trafikverkets kamera-id
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  bild_tid timestamptz NOT NULL,                        -- när bilden togs (hinkens 3-timmarsbucket om inget annat)
  klass text NOT NULL CHECK (klass IN ('is', 'snö', 'slask', 'våt', 'bar', 'okänd')),
  av text NOT NULL DEFAULT 'Bengt',
  klassad timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bild)                                         -- en klassning per bild; en ny ersätter den gamla via UPSERT
);
CREATE INDEX IF NOT EXISTS kamerafacit_tid_idx ON kamerafacit (bild_tid);

ALTER TABLE kamerafacit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kamerafacit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kamerafacit FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE kamerafacit IS 'Kort #242 (DECISIONS #329): Bengts klassning av facit-hinkens bilder. Bekräftar träffar i grind S-B, fäller aldrig (§2). Matas via dbknapp.';
