-- 057: KANDIDATENS SKUGGLOGG (DECISIONS #573 del 2; Bengt 15/10 "ja, bygg del 2 enligt A och B"; kort #343, #349).
-- A. DOMLOGGEN. Varje timme på :50, efter del B (:43), skriver kandidat_logga() en rad per sträcka med kall yta ur
--    kandidat_regel() till kandidat_skugga, och kandidatens stationsvärden ur kandidat_live (som sparas sex timmar, sql/052) till
--    kandidat_station (kort #349). En rad per körning i kandidat_skugga_korning säger om regeln räknade eller teg — en varm timme
--    (räknad, noll sträckor) ska gå att skilja från en tyst (gammal eller ofullständig). kandidat_skugga och kandidat_station
--    exporteras till hinken av arkivexporten dygnet efter och raderas ur databasen efter tre dygn (sql/053:s väg, med egen ålder
--    och eget golv för de två; gratisnivån, DECISIONS #569). Domen i mars läser hinken.
-- B. TAKTEN. Skuggmotorn loggar de varnande sträckorna längs varje rutt i shadow_log.kandidat (engine/src/segment.ts
--    kandidatLangsRutten).
-- FÄRSKHETEN flyttas till kandidat_timme(), så att dess tal står på ett ställe och både regeln och loggen läser dem; kandidat_regel()
-- skrivs om här med samma innehåll i övrigt (sql/056).

-- Färskheten: kandidatens senaste timme om den är högst två timmar gammal och bär minst 95 % av vägpunkterna, annars null.
CREATE OR REPLACE FUNCTION kandidat_timme() RETURNS timestamptz
LANGUAGE sql STABLE AS $$
  WITH s AS (SELECT max(l.tid) AS tid FROM kandidat_live l WHERE l.tid <= now())
  SELECT s.tid FROM s
  WHERE s.tid > now() - interval '2 hours'                                                          -- FARSK_TIMMAR
    AND (SELECT count(*) FROM kandidat_live l WHERE l.tid = s.tid AND l.punkt LIKE 'v%')
        >= 0.95 * (SELECT count(*) FROM vagpunkt)                                                    -- FULLSTANDIG_ANDEL
$$;

CREATE OR REPLACE FUNCTION kandidat_regel()
RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, utfall text)
LANGUAGE sql STABLE AS $$
  WITH kall AS (
    SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, v.geom
    FROM kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt
    WHERE l.tid = kandidat_timme() AND l.pb <= 0                                                     -- YTA_GRANS_C
  ),
  vaglag AS (
    SELECT rc.segment_id, 'Våt' = ANY (rc.condition_info) AS vat, 'fläckvis Våt' = ANY (rc.condition_info) AS flackvis
    FROM road_conditions rc WHERE NOT rc.deleted
  ),
  radar AS (
    SELECT r.segment_id, max(r.rate_mean_mmh) AS mmh FROM radar_precip r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.segment_id                        -- RADAR_FONSTER_MIN
  ),
  karantan AS (
    SELECT w.station_id FROM weather_observations w
    WHERE w.sample_time > now() - interval '7 days' AND w.air_temp_c IS NOT NULL AND w.surface_temp_c < w.air_temp_c - 12
    GROUP BY w.station_id HAVING count(*) >= 3
  ),
  langsam AS (SELECT g.station_id FROM givarfel_dygn g WHERE g.senast > now() - interval '3 hours'),
  -- MATERIALIZED: läses inne i den laterala frågan nedan och ska räknas en gång, inte en gång per vägpunkt (läxan i #567).
  varma AS MATERIALIZED (
    SELECT DISTINCT ON (w.station_id) w.station_id, w.geom, w.surface_temp_c
    FROM weather_observations w
    WHERE w.sample_time > now() - interval '45 minutes' AND w.surface_temp_c > 2                    -- VETO_MIN, VETO_YTA_C
      AND (w.air_temp_c IS NULL OR w.surface_temp_c >= w.air_temp_c - 12)
      AND (w.air_temp_c IS NULL OR w.air_temp_c < 10 OR w.air_temp_c - w.surface_temp_c < 8)
      AND w.station_id NOT IN (SELECT station_id FROM karantan)
      AND w.station_id NOT IN (SELECT station_id FROM langsam)
    ORDER BY w.station_id, w.surface_temp_c DESC
  )
  SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb,
         coalesce(g.vat, false), coalesce(g.flackvis, false), r.mmh,
         ve.station_id, ve.km, ve.yta,
         CASE WHEN ve.station_id IS NOT NULL THEN 'veto'
              WHEN coalesce(g.vat, false) OR coalesce(r.mmh, 0) >= 0.5 THEN 'varnar'                   -- RADAR_MMH
              ELSE 'torr' END
  FROM kall k
  LEFT JOIN vaglag g ON g.segment_id = k.segment_id
  LEFT JOIN radar r ON r.segment_id = k.segment_id
  LEFT JOIN LATERAL (
    SELECT s.station_id, (ST_Distance(s.geom::geography, k.geom::geography) / 1000)::real AS km, s.surface_temp_c AS yta
    FROM varma s WHERE ST_DWithin(s.geom::geography, k.geom::geography, 15000)                      -- VETO_KM
    ORDER BY ST_Distance(s.geom::geography, k.geom::geography) LIMIT 1
  ) ve ON true
$$;

CREATE TABLE IF NOT EXISTS kandidat_skugga (
  segment_id text NOT NULL,
  observed_at timestamptz NOT NULL,            -- kandidatens timme
  skriven_at timestamptz NOT NULL DEFAULT now(),
  punkter int NOT NULL,                        -- vägpunkter på sträckan med yta ≤ 0
  varnar int NOT NULL,
  veto int NOT NULL,
  torr int NOT NULL,
  vat boolean NOT NULL,
  flackvis_vat boolean NOT NULL,
  radar_mmh numeric,                           -- radarns högsta rate_mean de senaste 60 minuterna, null utan radarrad
  pb_min real NOT NULL,                        -- kandidatens kallaste värde på sträckan
  veto_station text,                           -- närmaste vetostation, om någon punkt vetades
  veto_km real,
  veto_yta numeric,
  PRIMARY KEY (segment_id, observed_at)
);
CREATE TABLE IF NOT EXISTS kandidat_station (
  station_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  ph real, pg real, ra real, ank_km real, pb real,
  PRIMARY KEY (station_id, observed_at)
);
CREATE TABLE IF NOT EXISTS kandidat_skugga_korning (
  korning timestamptz PRIMARY KEY DEFAULT now(),
  observed_at timestamptz,                     -- kandidatens timme (räknad) eller senaste timme (tyst)
  status text NOT NULL CHECK (status IN ('räknad', 'redan räknad', 'tyst')),
  stracker int NOT NULL DEFAULT 0,
  varnar int NOT NULL DEFAULT 0,
  veto int NOT NULL DEFAULT 0,
  torr int NOT NULL DEFAULT 0,
  stationer int NOT NULL DEFAULT 0
);
ALTER TABLE kandidat_skugga ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandidat_skugga_korning ENABLE ROW LEVEL SECURITY;

-- Domloggen: stationsvärdena först (allt i kandidat_live som inte redan sparats, så att en missad körning tas igen), sedan
-- regeln per sträcka för kandidatens timme — en gång per timme.
CREATE OR REPLACE FUNCTION kandidat_logga() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE t timestamptz; n_st int := 0; n_seg int := 0; n_v int := 0; n_veto int := 0; n_torr int := 0;
BEGIN
  INSERT INTO kandidat_station (station_id, observed_at, ph, pg, ra, ank_km, pb)
    SELECT l.punkt, l.tid, l.ph, l.pg, l.ra, l.ank_km, l.pb FROM kandidat_live l WHERE l.punkt NOT LIKE 'v%'
    ON CONFLICT (station_id, observed_at) DO NOTHING;
  GET DIAGNOSTICS n_st = ROW_COUNT;
  t := kandidat_timme();
  IF t IS NULL THEN
    INSERT INTO kandidat_skugga_korning (observed_at, status, stationer)
      VALUES ((SELECT max(l.tid) FROM kandidat_live l WHERE l.tid <= now()), 'tyst', n_st);
    RETURN format('kandidaten tyst (timmen gammal eller ofullständig); %s stationsrader', n_st);
  END IF;
  IF EXISTS (SELECT 1 FROM kandidat_skugga_korning k WHERE k.observed_at = t AND k.status = 'räknad') THEN
    INSERT INTO kandidat_skugga_korning (observed_at, status, stationer) VALUES (t, 'redan räknad', n_st);
    RETURN format('kandidatens timme %s redan räknad; %s stationsrader', t, n_st);
  END IF;
  WITH r AS (SELECT * FROM kandidat_regel()),
  ins AS (
    INSERT INTO kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, radar_mmh, pb_min,
                                 veto_station, veto_km, veto_yta)
    SELECT r.segment_id, r.tid, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'), count(*) FILTER (WHERE r.utfall = 'veto'),
           count(*) FILTER (WHERE r.utfall = 'torr'), bool_or(r.vat), bool_or(r.flackvis_vat), max(r.radar_mmh), min(r.pb),
           (array_agg(r.veto_station ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           min(r.veto_km),
           (array_agg(r.veto_yta ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1]
    FROM r GROUP BY r.segment_id, r.tid
    ON CONFLICT (segment_id, observed_at) DO NOTHING
    RETURNING varnar, veto, torr
  )
  SELECT count(*), coalesce(sum(i.varnar), 0), coalesce(sum(i.veto), 0), coalesce(sum(i.torr), 0)
    INTO n_seg, n_v, n_veto, n_torr FROM ins i;
  INSERT INTO kandidat_skugga_korning (observed_at, status, stracker, varnar, veto, torr, stationer)
    VALUES (t, 'räknad', n_seg, n_v, n_veto, n_torr, n_st);
  RETURN format('kandidatens timme %s: %s sträckor, %s varnande punkter, %s vetade, %s torra; %s stationsrader',
                t, n_seg, n_v, n_veto, n_torr, n_st);
END $$;

-- ARKIVEXPORTEN (sql/053) tar de två nya tabellerna: dygnet efter, och raderingen efter tre dygn i stället för fjorton.
ALTER TABLE arkiv_export_tabell DROP CONSTRAINT IF EXISTS arkiv_export_tabell_tabell_check;
ALTER TABLE arkiv_export_tabell ADD CONSTRAINT arkiv_export_tabell_tabell_check
  CHECK (tabell IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station'));

CREATE OR REPLACE FUNCTION arkiv2_tabell(tab text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF tab IS NULL OR tab NOT IN ('trend_kandidater', 'trend_stigande', 'radar_precip', 'kandidat_skugga', 'kandidat_station') THEN
    RAISE EXCEPTION 'arkiv2: okänd tabell %', tab;
  END IF;
  RETURN tab;
END $$;

-- Dygnens ålder före export: kandidatens loggar är färdiga dygnet efter (sista timmen skrivs 23:50); de andra efter åtta dygn.
CREATE OR REPLACE FUNCTION arkiv2_alder(tab text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 1 ELSE 8 END $$;
-- Golvet för raderingen: kandidatens loggar tre dygn i databasen (DECISIONS #573), de andra det golv nattjobbet anger (14).
CREATE OR REPLACE FUNCTION arkiv2_golv(tab text, min_dygn int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN tab IN ('kandidat_skugga', 'kandidat_station') THEN 3 ELSE min_dygn END $$;

CREATE OR REPLACE FUNCTION arkiv2_att_exportera(tab text, maxantal int DEFAULT 2) RETURNS SETOF date
LANGUAGE plpgsql STABLE AS $$
DECLARE forsta date;
BEGIN
  EXECUTE format('SELECT (min(observed_at) AT TIME ZONE ''UTC'')::date FROM %I', arkiv2_tabell(tab)) INTO forsta;
  IF forsta IS NULL THEN RETURN; END IF;
  RETURN QUERY EXECUTE format(
    'SELECT g.d::date FROM generate_series($1::timestamp, ((now() AT TIME ZONE ''UTC'')::date - $4)::timestamp, interval ''1 day'') g(d)
      WHERE NOT EXISTS (SELECT 1 FROM arkiv_export_tabell e WHERE e.tabell = $2 AND e.dag = g.d::date)
        AND EXISTS (SELECT 1 FROM %I t WHERE t.observed_at >= g.d AT TIME ZONE ''UTC''
                                         AND t.observed_at < (g.d + interval ''1 day'') AT TIME ZONE ''UTC'')
      ORDER BY 1 LIMIT $3', tab) USING forsta, tab, maxantal, arkiv2_alder(tab);
END $$;

CREATE OR REPLACE FUNCTION arkiv2_radera_exporterat(max_mb int DEFAULT 350, min_dygn int DEFAULT 14) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE tb text; d date; filrader int; n int;
BEGIN
  IF pg_database_size(current_database()) < max_mb::bigint * 1024 * 1024 THEN
    RETURN format('databasen %s MB, under %s MB — inget raderas', pg_database_size(current_database()) / 1048576, max_mb);
  END IF;
  SELECT e.tabell, e.dag, e.rader INTO tb, d, filrader FROM arkiv_export_tabell e
   WHERE e.raderad IS NULL AND e.dag < (now() AT TIME ZONE 'UTC')::date - arkiv2_golv(e.tabell, min_dygn) ORDER BY e.dag, e.tabell LIMIT 1;
  IF d IS NULL THEN RETURN format('inget exporterat tabelldygn äldre än golvet (%s dygn, kandidatens loggar 3) att radera', min_dygn); END IF;
  EXECUTE format('SELECT count(*) FROM %I WHERE observed_at >= $1 AND observed_at < $2', arkiv2_tabell(tb))
    INTO n USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  IF n > filrader THEN
    DELETE FROM arkiv_export_tabell e WHERE e.tabell = tb AND e.dag = d;
    RETURN format('%s %s har %s rader, filen bara %s — exporteras om, raderas en senare natt', tb, d, n, filrader);
  END IF;
  EXECUTE format('DELETE FROM %I WHERE observed_at >= $1 AND observed_at < $2', tb)
    USING (d::timestamp AT TIME ZONE 'UTC'), ((d + 1)::timestamp AT TIME ZONE 'UTC');
  UPDATE arkiv_export_tabell e SET raderad = now(), raderade_rader = n WHERE e.tabell = tb AND e.dag = d;
  RETURN format('%s: raderade %s rader för %s (filen bär %s)', tb, n, d, filrader);
END $$;

CREATE OR REPLACE FUNCTION arkiv2_efterslap() RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT ((SELECT count(*) FROM arkiv2_att_exportera('trend_kandidater', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('trend_stigande', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('radar_precip', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_skugga', 100000))
        + (SELECT count(*) FROM arkiv2_att_exportera('kandidat_station', 100000)))::int
$$;

-- B. Takten: kolumnen i skuggloggen. {} när skuggmotorn inte loggar kandidaten (utanför Sverige, grupp C) — skälet står i svaret.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS kandidat jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shadow_log.kandidat IS 'Kandidatens varnande sträckor längs rutten (DECISIONS #573): {tid, n, h: [[t, sträcka, km, avstånd, punkter], …]}. Loggad, aldrig hörd.';

-- Rättigheterna: service-rollen läser (arkivexporten, skuggmotorn), ingen annan; loggen skrivs bara av pg_cron.
REVOKE ALL ON TABLE kandidat_skugga, kandidat_station, kandidat_skugga_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION kandidat_timme(), kandidat_logga(), arkiv2_alder(text), arkiv2_golv(text, int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_skugga, kandidat_station, kandidat_skugga_korning FROM anon;
    REVOKE ALL ON FUNCTION kandidat_timme(), kandidat_logga(), arkiv2_alder(text), arkiv2_golv(text, int) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_skugga, kandidat_station, kandidat_skugga_korning FROM authenticated;
    REVOKE ALL ON FUNCTION kandidat_timme(), kandidat_logga(), arkiv2_alder(text), arkiv2_golv(text, int) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON TABLE kandidat_skugga, kandidat_station, kandidat_skugga_korning TO service_role;
    GRANT EXECUTE ON FUNCTION kandidat_timme(), arkiv2_alder(text), arkiv2_golv(text, int) TO service_role;
  END IF;
END $$;

-- Schemat: :50, efter del B (:43) och före skuggmotorns huvudvarv (:02/:32).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'halkvakt-kandidat-logg';
    PERFORM cron.schedule('halkvakt-kandidat-logg', '50 * * * *', 'SELECT kandidat_logga()');
  END IF;
END $$;
