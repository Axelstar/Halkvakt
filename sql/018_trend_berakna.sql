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
--   · kort #236 (DECISIONS #300), den långsamma vakten: stationens dygn i felet (givarfel_dygn, sql/030) utesluter dygnets rader
--
-- LUTNINGENS EGEN VAKT: minst 3 mätningar i fönstret, och inget givarhopp > 3 °C MELLAN rader som
-- båda ligger i fönstret. Den sista preciseringen är inte kosmetisk — tas den bort räknar SQL ett
-- hopp som TypeScript inte räknar, och de två väljer olika rader utan att någon ser det.
--
-- RAMAR, INTE EN LATERAL (kort #235, 22/9). Fönstren räknades förut med en CROSS JOIN LATERAL över `bas`. `bas`
-- materialiserades (den lästes två gånger), och en CTE har inget index — så lateralen läste HELA underlaget en gång per
-- kandidatrad. Kostnaden växte med kvadraten på arkivet: sju dygn gick 13/9 på 118 054 rader och föll 22/9 på
-- statement timeout (600 s) på 195 444. Driften (2 h) märkte inget. Nu räknas samma tal med fönsterfunktioner över
-- stationens rader i tidsordning: `RANGE BETWEEN '15 minutes' PRECEDING AND CURRENT ROW` är exakt lateralens villkor
-- (b.sample_time >= r.sample_time − 15 min och <= r.sample_time; primärnyckeln gör att ingen rad delar tid med en annan).
-- Hoppet bokförs på den TIDIGARE raden i paret (lead i stället för lag): ett hopp ligger då i fönstret precis när paret
-- gör det, och ramen utan den egna raden (EXCLUDE CURRENT ROW) tar med varje hopp inom fönstret men inte hoppet in i
-- det. Samma rader, samma tal (mätt mot lateralen över ett dygn, scripts/matningar/driftrakningen-ramar-2026-09-22.sql);
-- `trendarkivet --jamfor` är beviset mot TypeScript.
--
-- DEN STIGANDE HALVAN (kort #257, DECISIONS #368, Bengts ja 25/9). TROSKLAR-TRENDEN mäter två riktningar: fallande (förvarning)
-- och STIGANDE (tystna tidigare när ytan värms genom +1 °C). Den stigande sparades aldrig, och efter sju dygn gallras arkivet till
-- en rad per halvtimme — lutningens vakt kräver tre rader i fönstret, så den går inte att räkna fram i efterhand (§7: spara det
-- som inte går att räkna om). Den skrivs därför här, i samma varv och med samma vakter, band, fönster och utfall, men i en EGEN
-- tabell: snapshotkärnan läser trend_kandidater (lutningen i live.json), och en stigande rad där hade ändrat vad skuggan ser.
-- Tecknet är detsamma i båda tabellerna — lutning = ytans FALL per fönster, alltså negativ när ytan stiger. Ingen TypeScript-kopia:
-- stigningen har en enda skrivare, och returvärdet (nya, utfall) räknar som förut bara den fallande halvan.
CREATE TABLE IF NOT EXISTS trend_stigande (LIKE trend_kandidater INCLUDING ALL);
ALTER TABLE trend_stigande ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON trend_stigande FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON trend_stigande FROM authenticated; END IF;
END $$;

CREATE OR REPLACE FUNCTION berakna_trendkandidater(sedan interval DEFAULT interval '2 hours')
RETURNS TABLE(nya int, utfall int) AS $$
DECLARE
  v_nya int := 0;
  v_utfall int := 0;
BEGIN
  WITH bas AS (
    SELECT station_id, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
           abs(lead(surface_temp_c) OVER s - surface_temp_c) AS hopp_fram
    FROM weather_observations
    WHERE sample_time > now() - sedan - interval '60 minutes' AND surface_temp_c IS NOT NULL
    WINDOW s AS (PARTITION BY station_id ORDER BY sample_time)
  ),
  ramar AS (
    SELECT *,
      (count(*) OVER w15)::int AS n15, (count(*) OVER w30)::int AS n30, (count(*) OVER w60)::int AS n60,
      first_value(surface_temp_c) OVER w15 AS f15,
      first_value(surface_temp_c) OVER w30 AS f30,
      first_value(surface_temp_c) OVER w60 AS f60,
      max(hopp_fram) OVER x15 AS h15, max(hopp_fram) OVER x30 AS h30, max(hopp_fram) OVER x60 AS h60
    FROM bas
    WINDOW s   AS (PARTITION BY station_id ORDER BY sample_time),
           w15 AS (s RANGE BETWEEN interval '15 minutes' PRECEDING AND CURRENT ROW),
           w30 AS (s RANGE BETWEEN interval '30 minutes' PRECEDING AND CURRENT ROW),
           w60 AS (s RANGE BETWEEN interval '60 minutes' PRECEDING AND CURRENT ROW),
           x15 AS (s RANGE BETWEEN interval '15 minutes' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW),
           x30 AS (s RANGE BETWEEN interval '30 minutes' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW),
           x60 AS (s RANGE BETWEEN interval '60 minutes' PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW)
  ),
  kandidat AS (
    -- Ramarna räknas över HELA `bas` först och filtreras sedan: ett filter före fönsterfunktionerna hade tagit rader ur
    -- fönstren.
    SELECT r.*
    FROM ramar r
    WHERE r.sample_time > now() - sedan
      -- Givarvakterna, §3.
      AND r.air_temp_c IS NOT NULL AND r.surface_temp_c >= r.air_temp_c - 12
      AND (r.air_temp_c < 10 OR r.air_temp_c - r.surface_temp_c < 8)
      AND (SELECT count(*) FROM weather_observations k WHERE k.station_id = r.station_id
             AND k.sample_time <= r.sample_time AND k.sample_time > r.sample_time - interval '7 days'
             AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) < 3
      AND NOT EXISTS (SELECT 1 FROM givarfel_dygn g WHERE g.station_id = r.station_id AND g.dag = (r.sample_time AT TIME ZONE 'UTC')::date)
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
  ),
  -- Den stigande halvan (kort #257): samma rader, samma svep åt andra hållet — stigningen når svepets lägsta steg +0,4.
  skriv_stigande AS (
    INSERT INTO trend_stigande (station_id, observed_at, surface_temp_c, air_temp_c, dewpoint_c,
        humidity_pct, dagg_gap_c, lutning15_c, lutning30_c, lutning60_c)
    SELECT station_id, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
           surface_temp_c - dewpoint_c, lut15, lut30, lut60
    FROM med_lutning
    WHERE least(coalesce(lut15, 99), coalesce(lut30, 99), coalesce(lut60, 99)) <= -0.4
    ON CONFLICT (station_id, observed_at) DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT count(*)::int FROM skriv) INTO v_nya;

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

  -- Den stigande halvans utfall (kort #257): samma 90 minuter och samma "0 = okänt". Lägsta ytan efter en stigning säger om ytan
  -- frös om — det tystnadsriktningen döms på (TROSKLAR-TRENDEN T-B). Räknas inte in i v_utfall: returvärdet är oförändrat.
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
    FROM trend_stigande t
    WHERE t.utfall_rader IS NULL AND t.observed_at <= now() - interval '90 minutes'
  )
  UPDATE trend_stigande t SET min_yta_90min_c = m.min_yta, utfall_rader = m.n
  FROM moget m WHERE t.station_id = m.station_id AND t.observed_at = m.observed_at;

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
