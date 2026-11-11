-- 103: SMÅVÄGSRÖSTEN — punkterna och brytarna (DECISIONS #828, kort #647; halkvakt-kuvos F53). Bengt: "Jag beställer bygget" och
-- "kör nästa byggsteg".
--
-- smavagspunkt bär småvägsröstens punkter längs de statliga vägar som saknar väglagsmätning: P1 (småvägarna, mer än 2 km från
-- väglagsnätet) och N (nära nätet men utanför sträckorna). De hålls MED FLIT utanför vagpunkt och stadspunkt: kandidat_timme() och
-- ny_kandidat_timme() kräver PH för minst 95 % av vagpunkt, och stadsregeln läser stadspunkt. Punkterna (id, grupp, väg, ordning,
-- läge) laddas av ingest/smavagspunkter-db.ts ur kuvösens data/vagdata/smavagsrosten-punkter.json genom överlägget; inga punkter står
-- i den här filen, och särdragen bor kvar i kuvösen (#768). Väg och ordning är kuvösens: en väg går från korsning till korsning, och
-- ordningen är punktens plats längs den. Appens punktfil följer punktens id (#828: en bit per punkt i punktfilens ordning).
--
-- smavagsbrytare: en brytare per grupp, AV från början. Regeln (en senare migration) låter en punkt tala bara där brytaren är på.
-- Brytarna slås på med Bengts och Axels ord, efter villkoren i #828. Varje ändring bär tid och skäl.
-- Migrationen raderar ingenting. Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS smavagspunkt (
  punkt   text PRIMARY KEY CHECK (punkt ~ '^r[0-9]{5,}$'),
  grupp   text NOT NULL CHECK (grupp IN ('P1', 'N')),
  vag     text NOT NULL CHECK (vag ~ '^v[0-9]{5,}$'),
  ordning integer NOT NULL CHECK (ordning >= 0),
  lon     double precision NOT NULL CHECK (lon > 10 AND lon < 25),
  lat     double precision NOT NULL CHECK (lat > 55 AND lat < 70),
  geom    geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED
);
CREATE INDEX IF NOT EXISTS smavagspunkt_geom ON smavagspunkt USING gist (geom);

CREATE TABLE IF NOT EXISTS smavagsbrytare (
  grupp      text PRIMARY KEY CHECK (grupp IN ('P1', 'N')),
  pa         boolean NOT NULL DEFAULT false,
  andrad_at  timestamptz NOT NULL DEFAULT now(),
  skal       text NOT NULL DEFAULT 'byggt avstängt (DECISIONS #828)'
);
INSERT INTO smavagsbrytare (grupp) VALUES ('P1'), ('N') ON CONFLICT (grupp) DO NOTHING;

ALTER TABLE smavagspunkt ENABLE ROW LEVEL SECURITY;
ALTER TABLE smavagsbrytare ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE smavagspunkt FROM PUBLIC;
REVOKE ALL ON TABLE smavagsbrytare FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE smavagspunkt FROM anon; REVOKE ALL ON TABLE smavagsbrytare FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE smavagspunkt FROM authenticated; REVOKE ALL ON TABLE smavagsbrytare FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE smavagspunkt TO service_role; GRANT ALL ON TABLE smavagsbrytare TO service_role;
  END IF;
END $$;
