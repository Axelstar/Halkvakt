-- 028: uppspelningen ur arkiven som EN funktion — kombinationen och KB-A:s varianter (Bengts "gör uppspelningens
-- varianter nu" 20/9 2026, DECISIONS #244; TROSKLAR-KOMBINATIONEN §3–§4, DECISIONS #223–#226).
--
-- VAD DEN SVARAR PÅ. När skulle efterhalkans beta ha varnat, per dygn — för kombinationen och för varje variant som
-- KB-A ska döma i mars: utan faller, utan blöt, med radarn, med regnmängd, med bredare startband. Räknat ur arkiven
-- (weather_observations, trend_kandidater, radar_precip), med skuggloggen som kontroll i en egen sats.
--
-- STARTVÄRDENA STÅR HÄR, SOM STANDARDVÄRDEN, OCH BARA HÄR I SQL. Betans startvärden (DECISIONS #222/#225): regn inom
-- 2 h · fall >= 0,8 °C på 30 min · yta +1…+3 °C · allt regn > 0. Anropet utan argument ÄR kombinationen; varje variant
-- ändrar ETT argument. Kopiorna i scripts/matningar/uppspelning-efterhalka.sql vaktas av kontraktsgrinden, och när S3
-- för in talen i motorn ska motorns kopior in i samma kontrakt (bedömningen §0b).
--
-- D1 I KOD. "En gemensam kalibrering väljer — den uppfinner inte." Varje argument prövas mot delarnas fastställda svep
-- (TROSKLAR-KOMBINATIONEN §3) och ett värde utanför dem avvisas högljutt. Ingen kan pröva ett eget tal i smyg.
-- Jämförelserna är dokumentens egna (TROSKLAR-OVERGANGAR §2 och §4): regn > 0 eller >= minsta regn, radar
-- rate_mean_mmh > r — STRIKT. Första versionen (20/9 06:05Z) skrev >= r; rättad samma dag, med gränsprov i testet.
--
-- UTFALLET ÄR BLINDAT (p_blind, sant som standard). Trendarkivet sparar redan lägsta yta inom 90 min efter varje
-- ögonblick (min_yta_90min_c, besiktigad av värdevakten) — det är stationens egen facit, och den behöver inte byggas.
-- Men startvärdena ska stå orörda tills utfall läses vid de tidpunkter som står i planen (dom 1 i januari,
-- kalibreringen 1/2, dom 2 i mars; regel D2/D3/D6). Tills dess ger utfallskolumnerna NULL. Den som anropar med
-- p_blind := false lämnar ett spår i dbknapp-loggen.
--   Utfallet räknas per EPISOD = stationens första ögonblick per NATT (röst räknas i episoder, aldrig i rader —
--   kartan §10.2). En natt går från middag till middag i SVENSK TID: tiden skiftas 12 h i Europe/Stockholm, samma räknesätt
--   som T-A och R-A, så att en natt inte delas av midnatt. Bengt 20/9, DECISIONS #246 — första versionen räknade per
--   UTC-dygn och delade 159 av 454 stationsnätter i två (#245); den andra räknade natten i UTC medan T-A och R-A räknade i
--   svensk tid (kort #256, DECISIONS #366 — nu samma zon, och kontraktet "Nattens zon" vaktar den). Episoden bokförs på det UTC-dygn då den BÖRJADE;
--   stationer och ögonblick redovisas som förut per UTC-dygn. Ett dygn där ingen episod började ger 0, inte NULL —
--   NULL betyder bara "blindat". Klasserna är T-B:s: föll ut (yta <= 1 °C) · nära (inom nära-miss-bandet) · uteblev.
--   Varianten "utan faller" har inget utfall här: den räknas ur väderarkivet, och trendarkivet bär bara fallande ytor.
--
-- FACITSTACKEN, TVÅ KÄLLOR TILL (kort #207, DECISIONS #247). Stationens egen yta säger att det BLEV kallt, aldrig att
-- vägen blev hal. KB-B döms mot facitstacken, och KB-D3 säger att förarsvar ensamma varken fäller eller friar — blir
-- omklassningarna tomma blir januari OAVGJORT hur många förare som än svarat. Därför läses de två källor som redan
-- skrivs varje dygn, per episod, inom samma fönster som stationens eget utfall:
--   * OMKLASSNING (road_condition_history × road_conditions): vägavsnitt inom p_facit_km där väglaget klassades om till
--     halka. Halkorden är MOTORNS egna (engine.ts SLIPPERY_INFO, speglade i tystnadsfelet.ts) — kontraktsgrinden vaktar
--     att kopiorna inte glider isär. "fläckvis Våt" får aldrig matcha på delsträngen 'is'; ordgränsen är därför med.
--   * OLYCKA (situation_archive, Accident): räknas SEPARAT och läggs aldrig i grundtalet. Arkivet bär ingen orsak
--     (ingest/sources/situations.ts) — en olycka är facit på att något hände, inte på att det var halt. Samma regel som
--     tystnadsfelet (scripts/tystnadsfelet.ts T1 b).
--   Radien: 5 km från stationen (Bengt 20/9, DECISIONS #245), samma koppling station↔väg som radarn — EN koppling.
--   Stationens läge kommer ur weather_latest, samma källa som radarkopplingen. En station som saknas där får inget facit;
--   täckningen mäts i scripts/matningar/uppspelning-varianter.sql sats 3.
--   Fönstret: (t, t + p_utfall] — STRIKT efter episodens början, till och med slutet, exakt som publish/trendkandidat.ts
--   räknar stationens egen facit. p_utfall ärvs från T-A (TROSKLAR-TRENDEN §2, svep 60 · 90 · 120 min); standardvärdet
--   90 min är det arkivet redan räknar i min_yta_90min_c, så de två facitkällorna läses över samma fönster.
--   Kamerabilden är INTE med: en bild är inte facit förrän någon läst den, och granskningen är ett öppet beslut
--   (bedömningen §4.2, före 1/2). Förarsvaren har egna regler (KB-D1–D6) och är inte med här.
--
-- KOLUMNEN `episoder` ÄR INTE BLINDAD. Den räknar fyrningar, inte utfall — samma sak som `stationer` och `ogonblick`,
-- bara grupperat per natt. Den är facittalens nämnare, och den gör nattbytets (#246) verkan mätbar i drift.
--
-- SIGNATUREN SLÄPPS FÖRST. Både returtypen och antalet argument ändras med #207, och ett CREATE OR REPLACE hade då lagt
-- en ANDRA överlagring bredvid den gamla — `uppspelning_efterhalka()` utan argument blir tvetydig och faller. DROP:en
-- nedan är därför inte städning utan en förutsättning; migrationen bevisar efteråt att exakt EN signatur finns.
--
-- INTE MED ÄN, med skäl: SMHI-förlängningen (N_varning) — arkivet har inga vintervarningar och senast_sedd är inte
-- deklarerad i värdevakten · dagens icing_point som jämförelse (KB-B) — hör till utfallsläsningen.
--
-- Bara läsande. Idempotent. Låst som gallra_arkiv: ingen EXECUTE för PUBLIC, anon eller authenticated.
DROP FUNCTION IF EXISTS uppspelning_efterhalka(interval, interval, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, numeric, boolean);
CREATE OR REPLACE FUNCTION uppspelning_efterhalka(
  p_fonster interval DEFAULT '14 days',
  p_n interval DEFAULT '2 hours',
  p_fall numeric DEFAULT 0.8,
  p_trendfonster int DEFAULT 30,
  p_lag numeric DEFAULT 1,
  p_hog numeric DEFAULT 3,
  p_regn_min numeric DEFAULT 0,
  p_radar_r numeric DEFAULT NULL,
  p_radar_km numeric DEFAULT 5,
  p_krav_faller boolean DEFAULT true,
  p_krav_blot boolean DEFAULT true,
  p_band numeric DEFAULT 0.5,
  p_utfall interval DEFAULT '90 minutes',
  p_facit_km numeric DEFAULT 5,
  p_blind boolean DEFAULT true
) RETURNS TABLE (dag date, stationer int, ogonblick int, episoder int,
                 episoder_med_utfall int, foll_ut int, nara int, uteblev int,
                 med_omklassning int, med_olycka int)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  -- D1: bara värden ur de fastställda svepen.
  IF p_n NOT IN (interval '1 hour', interval '2 hours', interval '3 hours', interval '4 hours') THEN
    RAISE EXCEPTION 'p_n utanför svepet 1–4 h (TROSKLAR-OVERGANGAR §2): %', p_n; END IF;
  IF p_fall NOT IN (0.4, 0.6, 0.8, 1.2) THEN RAISE EXCEPTION 'p_fall utanför svepet 0,4 · 0,6 · 0,8 · 1,2: %', p_fall; END IF;
  IF p_trendfonster NOT IN (15, 30, 60) THEN RAISE EXCEPTION 'p_trendfonster utanför svepet 15 · 30 · 60 min: %', p_trendfonster; END IF;
  IF p_lag <> 1 OR p_hog NOT IN (3, 4, 6) THEN RAISE EXCEPTION 'startbandet utanför svepet +1…+3 · +1…+4 · +1…+6: % … %', p_lag, p_hog; END IF;
  IF p_regn_min NOT IN (0, 0.2, 0.5) THEN RAISE EXCEPTION 'p_regn_min utanför svepet > 0 · >= 0,2 · >= 0,5 mm: %', p_regn_min; END IF;
  IF p_radar_r IS NOT NULL AND p_radar_r NOT IN (0.1, 0.5, 2) THEN RAISE EXCEPTION 'p_radar_r utanför svepet 0,1 · 0,5 · 2 mm/h: %', p_radar_r; END IF;
  IF p_radar_km <> 5 THEN RAISE EXCEPTION 'kopplingen station–väg är 5 km (Bengt 17/9, DECISIONS #225): %', p_radar_km; END IF;
  IF p_band NOT IN (0.3, 0.5, 1.0) THEN RAISE EXCEPTION 'p_band utanför svepet 0,3 · 0,5 · 1,0 °C: %', p_band; END IF;
  IF p_utfall NOT IN (interval '60 minutes', interval '90 minutes', interval '120 minutes') THEN
    RAISE EXCEPTION 'p_utfall utanför T-A:s svep 60 · 90 · 120 min (TROSKLAR-TRENDEN §2): %', p_utfall; END IF;
  IF p_facit_km <> 5 THEN RAISE EXCEPTION 'räckvidden för facit är 5 km (Bengt 20/9, DECISIONS #245): %', p_facit_km; END IF;

  RETURN QUERY
  WITH bas AS (
    -- Med fallkravet: trendarkivet, som bär fallen färdigräknade och utfallet inom 90 min.
    SELECT tk.station_id AS sid, tk.observed_at AS t, tk.min_yta_90min_c AS min_efter, tk.utfall_rader AS rader
    FROM trend_kandidater tk
    WHERE p_krav_faller AND tk.observed_at > now() - p_fonster
      AND tk.surface_temp_c BETWEEN p_lag AND p_hog
      AND (CASE p_trendfonster WHEN 15 THEN tk.lutning15_c WHEN 60 THEN tk.lutning60_c ELSE tk.lutning30_c END) >= p_fall
    UNION ALL
    -- Utan fallkravet: väderarkivet i bandet, med givarvakten (#75) och kort #234:s två. Inget utfall — se huvudet.
    SELECT w.station_id, w.sample_time, NULL::numeric, NULL::int
    FROM weather_observations w
    WHERE NOT p_krav_faller AND w.sample_time > now() - p_fonster
      AND w.surface_temp_c BETWEEN p_lag AND p_hog
      AND w.air_temp_c IS NOT NULL AND w.surface_temp_c >= w.air_temp_c - 12
      AND (w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND (SELECT count(*) FROM weather_observations k WHERE k.station_id = w.station_id
             AND k.sample_time <= w.sample_time AND k.sample_time > w.sample_time - interval '7 days'
             AND k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12) < 3
      AND NOT EXISTS (SELECT 1 FROM givarfel_dygn g WHERE g.station_id = w.station_id AND g.dag = (w.sample_time AT TIME ZONE 'UTC')::date)
  ),
  seg_nara AS (
    -- Radarvarianten: vägavsnitt inom 5 km från stationen. Räknas en gång per station, inte per ögonblick.
    SELECT DISTINCT s.station_id AS sid, rc.segment_id
    FROM (SELECT DISTINCT b.sid FROM bas b) x
    JOIN weather_latest s ON s.station_id = x.sid
    JOIN road_conditions rc ON NOT rc.deleted AND rc.geom IS NOT NULL
      AND ST_DWithin(rc.geom::geography, s.geom::geography, p_radar_km * 1000)
    WHERE p_radar_r IS NOT NULL
  ),
  m AS (
    SELECT b.sid, b.t, b.min_efter, b.rader,
      (EXISTS (SELECT 1 FROM weather_observations w WHERE w.station_id = b.sid
          AND ((p_regn_min = 0 AND w.rain_sum_mm > 0) OR (p_regn_min > 0 AND w.rain_sum_mm >= p_regn_min))
          AND w.sample_time <= b.t AND w.sample_time > b.t - p_n)
       OR (p_radar_r IS NOT NULL AND EXISTS (SELECT 1 FROM seg_nara sn JOIN radar_precip rp ON rp.segment_id = sn.segment_id
          WHERE sn.sid = b.sid AND rp.rate_mean_mmh > p_radar_r
          AND rp.observed_at <= b.t AND rp.observed_at > b.t - p_n))) AS blot
    FROM bas b
  ),
  f AS (SELECT m.sid, m.t, (m.t AT TIME ZONE 'UTC')::date AS d, ((m.t AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date AS natt, ((m.t - interval '12 hours') AT TIME ZONE 'UTC')::date AS natt_utc,
      m.min_efter, m.rader FROM m WHERE (NOT p_krav_blot) OR m.blot),
  ep AS (SELECT DISTINCT ON (f.sid, f.natt_utc) f.sid, f.t, f.d, f.min_efter, f.rader FROM f ORDER BY f.sid, f.natt_utc, f.t),
  a AS (SELECT f.d, count(DISTINCT f.sid)::int AS st, count(*)::int AS og FROM f GROUP BY f.d),
  u AS (SELECT ep.d, count(*)::int AS ep_n,
      count(*) FILTER (WHERE ep.rader > 0)::int AS med,
      count(*) FILTER (WHERE ep.rader > 0 AND ep.min_efter <= 1.0)::int AS fo,
      count(*) FILTER (WHERE ep.rader > 0 AND ep.min_efter > 1.0 AND ep.min_efter <= 1.0 + p_band)::int AS na,
      count(*) FILTER (WHERE ep.rader > 0 AND ep.min_efter > 1.0 + p_band)::int AS ut
    FROM ep GROUP BY ep.d),
  fa AS (
    -- Facitstackens två skrivna källor, per episod, i fönstret (t, t + p_utfall]. Stationens läge ur weather_latest.
    SELECT ep.d,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM road_condition_history h JOIN road_conditions c ON c.segment_id = h.segment_id
        WHERE NOT h.deleted AND c.geom IS NOT NULL
          AND h.modified_time > ep.t AND h.modified_time <= ep.t + p_utfall
          AND ST_DWithin(c.geom::geography, wl.geom::geography, p_facit_km * 1000)
          AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i
                      WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)'
                         OR i ~* '(snö|frost)')))::int AS omk,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM situation_archive sa
        WHERE sa.message_type_value = 'Accident' AND sa.geom IS NOT NULL
          AND sa.start_time > ep.t AND sa.start_time <= ep.t + p_utfall
          AND ST_DWithin(sa.geom::geography, wl.geom::geography, p_facit_km * 1000)))::int AS oly
    FROM ep JOIN weather_latest wl ON wl.station_id = ep.sid GROUP BY ep.d)
  SELECT a.d, a.st, a.og, coalesce(u.ep_n, 0),
    CASE WHEN p_blind OR NOT p_krav_faller THEN NULL ELSE coalesce(u.med, 0) END,
    CASE WHEN p_blind OR NOT p_krav_faller THEN NULL ELSE coalesce(u.fo, 0) END,
    CASE WHEN p_blind OR NOT p_krav_faller THEN NULL ELSE coalesce(u.na, 0) END,
    CASE WHEN p_blind OR NOT p_krav_faller THEN NULL ELSE coalesce(u.ut, 0) END,
    -- Facitkolumnerna blindas bara av p_blind: de läses ur egna arkiv och finns även utan fallkravet.
    CASE WHEN p_blind THEN NULL ELSE coalesce(fa.omk, 0) END,
    CASE WHEN p_blind THEN NULL ELSE coalesce(fa.oly, 0) END
  FROM a LEFT JOIN u ON u.d = a.d LEFT JOIN fa ON fa.d = a.d ORDER BY a.d;
END $$;

REVOKE EXECUTE ON FUNCTION uppspelning_efterhalka(interval, interval, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, numeric, interval, numeric, boolean) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION uppspelning_efterhalka(interval, interval, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, numeric, interval, numeric, boolean) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION uppspelning_efterhalka(interval, interval, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, numeric, interval, numeric, boolean) FROM authenticated;
  END IF;
END $$;
