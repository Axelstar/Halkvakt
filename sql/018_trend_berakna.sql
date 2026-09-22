-- 018: trendkandidaterna räknas i databasen (kort #88 steg 2, Bengts order 13/9
-- "lägg trendberäkningen i ingest-live").
--
-- VARFÖR I SQL OCH INTE I FUNKTIONEN. `ingest-live` är livemotorns egen ingest — situationer,
-- väglag och väder i samma anrop. Kod som kastar där stoppar hela kedjan för hela appen, och
-- trenden är en SKUGGMÄTNING. Därför bor logiken här, i en funktion som deployas med en migration,
-- och edge-funktionen bär en enda rad: `SELECT berakna_trendkandidater()`, inlindad i try/catch.
-- Mindre deployad kod, mindre att verifiera, och ett fel kan bara tysta trenden — aldrig ingesten.
--
-- VARFÖR INTE ETT NYTT CRON-JOBB. Jobben stängdes av kort #85 och öppnas inte utan Bengts ord.
-- `ingest-live` kör redan, och räknar på rader den nyss skrivit. Ingen ny kadens, ingen ny kostnad,
-- noll Actions-minuter.
--
-- TVÅ KOPIOR AV SAMMA TRÖSKLAR, och det är medvetet. TypeScript-kopian i `publish/trenden.ts`
-- driver T-A:s dom och knappens räkning; den här driver drifträkningen. Kontraktsgrinden vaktar
-- att de bär samma tal, och `scripts/trendarkivet.ts --jamfor` bevisar att de väljer SAMMA rader.
-- Ett värde på drift här hade betytt att domen och underlaget slutar handla om samma sak.
--
-- GIVARVAKTERNA ÄR §3:s, ordagrant ur publish/trenden.ts:rimlig():
--   · #75: ytan får inte ligga mer än 12 ° under luften, och lufttemperaturen måste finnas
--   · trenden kräver daggpunkten
--   · #46: yta − daggpunkt får inte understiga −5
--   · #46:s korsgivare: RH < 90 % samtidigt som yta ≤ daggpunkt är motsägelsefullt
--   · kort #234 (DECISIONS #299), radvakten: luft ≥ 10 °C och ytan ≥ 8 ° under luften är givarfel, inte kyla
--   · kort #234, karantänen: högst 2 brott mot #75 hos stationen de 7 dygnen före raden (sql/029 bär delindexet)
--
-- LUTNINGENS EGEN VAKT: minst 3 mätningar i fönstret, och inget givarhopp > 3 °C MELLAN rader som
-- båda ligger i fönstret. Den sista preciseringen är inte kosmetisk — tas den bort räknar SQL ett
-- hopp som TypeScript inte räknar, och de två väljer olika rader utan att någon ser det.

CREATE OR REPLACE FUNCTION berakna_trendkandidater(sedan interval DEFAULT interval '2 hours')
RETURNS TABLE(nya int, utfall int) AS $$
DECLARE
  v_nya int := 0;
  v_utfall int := 0;
BEGIN
  WITH bas AS (
    SELECT station_id, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
           lag(surface_temp_c) OVER w AS prev_yta,
           lag(sample_time)    OVER w AS prev_tid
    FROM weather_observations
    WHERE sample_time > now() - sedan - interval '60 minutes' AND surface_temp_c IS NOT NULL
    WINDOW w AS (PARTITION BY station_id ORDER BY sample_time)
  ),
  kandidat AS (
    SELECT r.*, f.*
    FROM bas r
    CROSS JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE b.sample_time >= r.sample_time - interval '15 minutes')::int AS n15,
        count(*) FILTER (WHERE b.sample_time >= r.sample_time - interval '30 minutes')::int AS n30,
        count(*)::int AS n60,
        (array_agg(b.surface_temp_c ORDER BY b.sample_time)
           FILTER (WHERE b.sample_time >= r.sample_time - interval '15 minutes'))[1] AS f15,
        (array_agg(b.surface_temp_c ORDER BY b.sample_time)
           FILTER (WHERE b.sample_time >= r.sample_time - interval '30 minutes'))[1] AS f30,
        (array_agg(b.surface_temp_c ORDER BY b.sample_time))[1] AS f60,
        max(abs(b.surface_temp_c - b.prev_yta)) FILTER (
          WHERE b.prev_tid IS NOT NULL AND b.prev_tid >= r.sample_time - interval '15 minutes') AS h15,
        max(abs(b.surface_temp_c - b.prev_yta)) FILTER (
          WHERE b.prev_tid IS NOT NULL AND b.prev_tid >= r.sample_time - interval '30 minutes') AS h30,
        max(abs(b.surface_temp_c - b.prev_yta)) FILTER (
          WHERE b.prev_tid IS NOT NULL AND b.prev_tid >= r.sample_time - interval '60 minutes') AS h60
      FROM bas b
      WHERE b.station_id = r.station_id
        AND b.sample_time >= r.sample_time - interval '60 minutes'
        AND b.sample_time <= r.sample_time
    ) f
    WHERE r.sample_time > now() - sedan
      -- Givarvakterna, §3.
      AND r.air_temp_c IS NOT NULL AND r.surface_temp_c >= r.air_temp_c - 12
      AND (r.air_temp_c < 10 OR r.air_temp_c - r.surface_temp_c < 8)
      AND (SELECT count(*) FROM weather_observations k WHERE k.station_id = r.station_id
             AND k.sample_time <= r.sample_time AND k.sample_time > r.sample_time - interval '7 days'
             AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) < 3
      AND r.dewpoint_c IS NOT NULL AND r.surface_temp_c - r.dewpoint_c >= -5
      AND NOT (r.humidity_pct IS NOT NULL AND r.humidity_pct < 90
               AND r.surface_temp_c - r.dewpoint_c <= 0)
      -- Bredaste startbandet i svepet.
      AND r.surface_temp_c >= 1 AND r.surface_temp_c <= 6
  ),
  med_lutning AS (
    SELECT *,
      CASE WHEN n15 >= 3 AND coalesce(h15, 0) <= 3 THEN f15 - surface_temp_c END AS lut15,
      CASE WHEN n30 >= 3 AND coalesce(h30, 0) <= 3 THEN f30 - surface_temp_c END AS lut30,
      CASE WHEN n60 >= 3 AND coalesce(h60, 0) <= 3 THEN f60 - surface_temp_c END AS lut60
    FROM kandidat
  ),
  skriv AS (
    INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, air_temp_c, dewpoint_c,
        humidity_pct, dagg_gap_c, lutning15_c, lutning30_c, lutning60_c)
    SELECT station_id, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
           surface_temp_c - dewpoint_c, lut15, lut30, lut60
    FROM med_lutning
    -- Svepets minsta lutning: når ingen av dem 0,4 kan ingen kombination fyra.
    WHERE greatest(coalesce(lut15, -99), coalesce(lut30, -99), coalesce(lut60, -99)) >= 0.4
    ON CONFLICT (station_id, observed_at) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_nya FROM skriv;

  -- Utfallet fylls i efterhand: vid skrivtillfället har de 90 minuterna inte hänt än.
  -- NULL = ännu inte räknat. 0 = räknat och tomt, alltså OKÄNT — aldrig "blev inte kallare".
  WITH moget AS (
    SELECT t.station_id, t.observed_at,
           (SELECT min(w.surface_temp_c) FROM weather_observations w
             WHERE w.station_id = t.station_id AND w.surface_temp_c IS NOT NULL
               AND w.sample_time > t.observed_at
               AND w.sample_time <= t.observed_at + interval '90 minutes') AS min_yta,
           (SELECT count(*)::int FROM weather_observations w
             WHERE w.station_id = t.station_id AND w.surface_temp_c IS NOT NULL
               AND w.sample_time > t.observed_at
               AND w.sample_time <= t.observed_at + interval '90 minutes') AS n
    FROM trend_kandidater t
    WHERE t.utfall_rader IS NULL AND t.observed_at <= now() - interval '90 minutes'
  ),
  fyll AS (
    UPDATE trend_kandidater t SET min_yta_90min_c = m.min_yta, utfall_rader = m.n
    FROM moget m WHERE t.station_id = m.station_id AND t.observed_at = m.observed_at
    RETURNING 1
  )
  SELECT count(*)::int INTO v_utfall FROM fyll;

  RETURN QUERY SELECT v_nya, v_utfall;
END;
$$ LANGUAGE plpgsql;

-- Bara tjänsterollen får räkna. anon/authenticated rörde aldrig tabellen (017) och ska inte
-- kunna kalla funktionen heller. Rollvakten som i 003-läxan: CI:s PostGIS saknar rollerna.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION berakna_trendkandidater(interval) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION berakna_trendkandidater(interval) FROM authenticated;
  END IF;
END $$;
