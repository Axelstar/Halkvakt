-- 089: STORSTÄDERNAS PUNKTER I DRIFTEN — tabellen och brytarna (DECISIONS #804, kort #378; kuvösen F33, F34). Bengt: "Ja, börja".
--
-- stadspunkt bär storstädernas punkter, B (statliga vägar utanför dagens täckning) och C (kommunala gator i Stockholms stad), som
-- kandidatens betavarning (K) ska tala på. De hålls MED FLIT utanför vagpunkt: kandidat_timme() och ny_kandidat_timme() kräver PH för
-- minst 95 % av vagpunkt, och med stadspunkterna där hade båda kandidaternas timme blivit NULL och K tystnat i hela landet.
-- Punkterna (id, grupp, lager, område, läge) laddas av ingest/stadspunkter-db.ts ur kuvösens kuvos/stadspunkter-drift-2026-27.json
-- genom överlägget; inga punkter står i den här filen. Gruppen är appens K-sträcka (live.json kandidat[].id) och börjar med lagret, så
-- den kan aldrig krocka med Trafikverkets numeriska sträckor.
--
-- stadsbrytare: en brytare per område och lager, AV från början. Regeln (en senare migration) låter en stadspunkt tala bara där
-- brytaren är på. Brytarna slås på med Bengts och Axels ord efter telefonturen (kuvösen F33), och B tas bort per område om stadsmiljöns
-- dom efter 31/3 2027 faller. Varje ändring bär tid och skäl.
-- Ingenting raderas. Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS stadspunkt (
  punkt   text PRIMARY KEY CHECK (punkt ~ '^[BC][0-9]{5}$'),
  grupp   text NOT NULL CHECK (grupp ~ '^[BC]-'),
  lager   text NOT NULL CHECK (lager IN ('B', 'C')),
  omrade  text NOT NULL,
  lon     double precision NOT NULL,
  lat     double precision NOT NULL,
  geom    geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED,
  CHECK (left(punkt, 1) = lager AND left(grupp, 1) = lager)
);
CREATE INDEX IF NOT EXISTS stadspunkt_grupp ON stadspunkt (grupp);
CREATE INDEX IF NOT EXISTS stadspunkt_geom ON stadspunkt USING gist (geom);

CREATE TABLE IF NOT EXISTS stadsbrytare (
  omrade     text NOT NULL,
  lager      text NOT NULL CHECK (lager IN ('B', 'C')),
  pa         boolean NOT NULL DEFAULT false,
  andrad_at  timestamptz NOT NULL DEFAULT now(),
  skal       text NOT NULL DEFAULT 'byggt avstängt (DECISIONS #804)',
  PRIMARY KEY (omrade, lager)
);
INSERT INTO stadsbrytare (omrade, lager) VALUES
  ('Stor-Stockholm', 'B'), ('Stor-Göteborg', 'B'), ('Stor-Malmö', 'B'), ('Stor-Stockholm', 'C')
ON CONFLICT (omrade, lager) DO NOTHING;

ALTER TABLE stadspunkt ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadsbrytare ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE stadspunkt FROM PUBLIC;
REVOKE ALL ON TABLE stadsbrytare FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE stadspunkt FROM anon; REVOKE ALL ON TABLE stadsbrytare FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE stadspunkt FROM authenticated; REVOKE ALL ON TABLE stadsbrytare FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE stadspunkt TO service_role; GRANT ALL ON TABLE stadsbrytare TO service_role;
  END IF;
END $$;
