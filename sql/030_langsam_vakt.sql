-- 030: DEN LÅNGSAMMA VAKTEN (kort #236, DECISIONS #300) — alternativ (d) ur bedömningen §4.2, mätt 22/9 INNAN den byggdes
-- (scripts/matningar/langsam-vakt-d-2026-09-22.sql): formen tar exakt fem stationer i hela arkivet, alla bland de sju
-- anmälda, och ingen frisk vid gränsen 5, 6 eller 8 °.
--
-- VAD. En station vars yta legat ≥ 6 ° under luften i minst 90 % av det senaste dygnets rader (minst 24 rader) mäter fel,
-- inte kyla: äkta stora gap (blixthalka, töväder) varar timmar, aldrig dygn. Ö Ljungby 1106 låg så från 30/8 med gap
-- 6–12 ° — under #75:s 12 — och gav falska brolarm på E4 i tre veckor innan #75 såg något (18/9).
--
-- VARFÖR REGELN BOR HÄR, PÅ ETT STÄLLE. Talen 6, 0,9 och 24 finns bara i den här funktionen. ingest-live kör den varje varv
-- (fail-soft, som trenden i 018), och tabellen givarfel_dygn bär varje stationsdygn i felet med första och senaste ögonblick.
-- Snapshoten tystar stationer vars `senast` är färskare än tre timmar (publish/snapshot-core.ts, LANGSAM_FRIST_H) och
-- mätningarna utesluter stationens rader det dygnet (karantanSql/givarfelSql). Ingen kopia av regeln i TypeScript.
--
-- LÄKER ÅT BÅDA HÅLL AV SIG SJÄLV. In ~22 h efter att felet börjat (90 % av ett dygn), ut några timmar efter att givaren
-- mäter rätt igen (andelen faller under 90 % efter ~2,4 h, fristen 3 h därefter). Ingen lista att hålla, ingen som måste
-- minnas när Trafikverket lagat givaren (anmälan skickad av Bengt 22/9).
--
-- IDEMPOTENT. Varje anrop räknar om raderna i fönstret `sedan` (med ett dygns historia före, så fönstret är helt) och
-- skriver dygnen med least/greatest — överlappande anrop ger samma tabell. Backfill = samma funktion med långt fönster.

CREATE TABLE IF NOT EXISTS givarfel_dygn (
  station_id text NOT NULL,
  dag date NOT NULL,                    -- UTC-dygnet
  forst timestamptz NOT NULL,           -- första ögonblick i felet det dygnet
  senast timestamptz NOT NULL,          -- senaste ögonblick i felet det dygnet
  PRIMARY KEY (station_id, dag)
);

ALTER TABLE givarfel_dygn ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE givarfel_dygn FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE givarfel_dygn FROM authenticated;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION langsam_vakt(sedan interval DEFAULT interval '2 hours')
RETURNS int AS $$
DECLARE
  v_dygn int := 0;
BEGIN
  WITH r AS (
    SELECT station_id, sample_time, (air_temp_c - surface_temp_c >= 6)::int AS stort
    FROM weather_observations
    WHERE air_temp_c IS NOT NULL AND surface_temp_c IS NOT NULL
      AND sample_time > now() - sedan - interval '24 hours'
  ),
  w AS (
    SELECT station_id, sample_time, count(*) OVER f AS n24, sum(stort) OVER f AS stort24
    FROM r
    WINDOW f AS (PARTITION BY station_id ORDER BY sample_time RANGE BETWEEN interval '24 hours' PRECEDING AND CURRENT ROW)
  ),
  s AS (
    -- Bara rader INOM fönstret får dom: de har ett helt dygn av historia bakom sig.
    SELECT station_id, (sample_time AT TIME ZONE 'UTC')::date AS dag, min(sample_time) AS forst, max(sample_time) AS senast
    FROM w
    WHERE sample_time > now() - sedan AND n24 >= 24 AND stort24 >= 0.9 * n24
    GROUP BY 1, 2
  ),
  skriv AS (
    INSERT INTO givarfel_dygn (station_id, dag, forst, senast)
    SELECT station_id, dag, forst, senast FROM s
    ON CONFLICT (station_id, dag) DO UPDATE
      SET forst = least(givarfel_dygn.forst, EXCLUDED.forst),
          senast = greatest(givarfel_dygn.senast, EXCLUDED.senast)
    RETURNING 1
  )
  SELECT count(*)::int INTO v_dygn FROM skriv;
  RETURN v_dygn;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION langsam_vakt(interval) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION langsam_vakt(interval) FROM authenticated;
  END IF;
END $$;
