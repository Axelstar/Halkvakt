-- 017: trendens kandidatarkiv (kort #88 steg 2, TROSKLAR-TRENDEN §7, Bengts order 13/9).
--
-- VARFÖR TABELLEN FINNS. Gallringen (#83, sql/014) tunnar weather_observations äldre än sju dygn
-- till EN rad per halvtimme. Då faller trendens 15-minutersfönster bort helt och 30-minuters på
-- trendens egen vakt (≥ 3 mätningar i fönstret). Underlaget för T-B finns alltså bara i sju dygn
-- efter varje frostnatt, och höstens första frostnätter går inte att ta igen.
--
-- Tabellen är den durabla kopian: en rad per KANDIDAT, alltså per stationsögonblick där någon
-- parameterkombination i §2:s svep skulle KUNNA fyra. Lutningarna är redan uträknade, så
-- gallringen kan äta råraderna utan att underlaget går förlorat.
--
-- VAD SOM INTE SPARAS: ingen dom, ingen vald tröskel. Raden bär de MÄTTA storheterna (lutning per
-- fönster, daggpunktsgap, yta) så att hela svepet kan prövas i efterhand. En sparad dom hade låst
-- tröskeln innan T-A valt den.
--
-- HÄNDELSEFILTRERAD som radarn och arkivdieten: bara rader inom bredaste startbandet där minst en
-- lutning når svepets lägsta steg. Utanför det kan ingen kombination fyra, och raden vore vikt utan
-- innehåll. Supersetet är låst med ett prov i test/trenden.test.ts.
--
-- Idempotent: nyckeln är (station_id, observed_at) och skrivningen är ON CONFLICT DO NOTHING.
-- En omkörning får aldrig dubblera (husregeln för ingesters).
CREATE TABLE IF NOT EXISTS trend_kandidater (
  station_id text NOT NULL,
  observed_at timestamptz NOT NULL,     -- ögonblicket fönstren slutar vid
  surface_temp_c numeric NOT NULL,
  air_temp_c numeric,
  dewpoint_c numeric,
  humidity_pct numeric,
  dagg_gap_c numeric,                   -- yta − daggpunkt
  lutning15_c numeric,                  -- °C per fönster, POSITIVT när ytan faller
  lutning30_c numeric,                  -- null = trendens egen vakt fällde fönstret
  lutning60_c numeric,
  min_yta_90min_c numeric,              -- utfallet: lägsta yta inom 90 min efter (§2 utfallsfönster)
  utfall_rader int,                     -- hur många mätningar utfallet vilar på (0 = okänt, inte torrt)
  skriven_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (station_id, observed_at)
);
CREATE INDEX IF NOT EXISTS trend_kandidater_tid_idx ON trend_kandidater (observed_at);

-- Fött låst, samma dubbellås som #30/#33/#43 och med rollvakten ur 003-läxan: CI:s slit-och-släng-
-- PostGIS saknar anon/authenticated, och en naken REVOKE fäller integrationstestet.
ALTER TABLE trend_kandidater ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE trend_kandidater FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE trend_kandidater FROM authenticated;
  END IF;
END $$;
