-- 129: MODDEN ÄR HAL ÄVEN I VÄGENS HALA TID (DECISIONS #915; Bengt 20/11: "lägg till ordet modd och gör en koppling mellan de olika").
--
-- VARFÖR. Motorn, snapshoten och länssidorna räknar sedan 20/11 Trafikverkets modd som halka (Moddig vägbana, Moddsträngar, med eller
-- utan fläckvis). vaglag_hal_sedan (sql/117) bär samma regel för halt som de, tecken för tecken, och rutan och sidorna läser den för att
-- skilja ny halkrisk från vinterväglag (#897). Utan den här filen skulle en sträcka med bara modd på klassen Normalt stå som hal på
-- sidan men sakna sin tid, och då räknas den som vinterväglag utan att vara det.
--
-- VAD. Samma funktion som sql/117, ord för ord, med modd sist i halkorden på de två ställen där regeln står. sql/117 ändras inte: den
-- är körd i drift, och den här filen ersätter dess definition (CREATE OR REPLACE, samma signatur). Kontraktsgrinden läser halkorden
-- här och inte i sql/117 ("Halkorden i MOTORN").
--
-- Körs med DB-knappen (migrera, sql/129_vaglag_hal_sedan_modd.sql) FÖRE deployen av publicera, så att sidorna och tiden byter regel
-- samtidigt. sql-funktion utan SET-klausul (CLAUDE.md, #784). Bara läsning. TILLBAKA: kör sql/117 igen.

CREATE OR REPLACE FUNCTION vaglag_hal_sedan(vid timestamptz DEFAULT now())
RETURNS TABLE (segment_id text, hal_sedan timestamptz, sedan_kand boolean, hojd_sedan timestamptz, ny boolean)
LANGUAGE sql STABLE AS $$
  WITH lage AS (
    SELECT c.segment_id, nu.kod, nu.ord, nu.raderad, nu.tid
    FROM road_conditions c
    CROSS JOIN LATERAL (
      SELECT x.kod, x.ord, x.raderad, x.tid FROM (
        SELECT c.condition_code AS kod, c.condition_info AS ord, c.deleted AS raderad, c.modified_time AS tid
        WHERE c.modified_time <= vid
        UNION ALL
        (SELECT h.condition_code, h.condition_info, h.deleted, h.modified_time FROM road_condition_history h
         WHERE h.segment_id = c.segment_id AND h.modified_time <= vid ORDER BY h.modified_time DESC LIMIT 1)
      ) x ORDER BY x.tid DESC LIMIT 1
    ) nu
  ), hala AS (
    SELECT l.segment_id, l.kod, l.tid FROM lage l
    WHERE NOT l.raderad AND (l.kod >= 2 OR EXISTS (
      SELECT 1 FROM unnest(l.ord) i
      WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt|modd)' OR i ~* '(snö|frost)'))
  )
  SELECT a.segment_id, coalesce(forsta.t, a.tid), ohal.t IS NOT NULL, hojd.t,
         (vid - coalesce(forsta.t, a.tid) < interval '24 hours') OR coalesce(vid - hojd.t < interval '24 hours', false)   -- NY_TIMMAR
  FROM hala a
  -- Den senaste raden då sträckan INTE var hal.
  LEFT JOIN LATERAL (
    SELECT h.modified_time AS t FROM road_condition_history h
    WHERE h.segment_id = a.segment_id AND h.modified_time <= vid
      AND NOT (NOT h.deleted AND (h.condition_code >= 2 OR EXISTS (
        SELECT 1 FROM unnest(h.condition_info) i
        WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt|modd)' OR i ~* '(snö|frost)')))
    ORDER BY h.modified_time DESC LIMIT 1) ohal ON true
  -- Den första raden efter den: där det hala läget började. Saknas den har historiken inte hunnit ifatt, och nulägets tid gäller.
  LEFT JOIN LATERAL (
    SELECT min(h.modified_time) AS t FROM road_condition_history h
    WHERE h.segment_id = a.segment_id AND h.modified_time <= vid AND (ohal.t IS NULL OR h.modified_time > ohal.t)) forsta ON true
  -- Höjningen: den första raden efter att klassen senast var något annat än Mycket besvärligt, om den är det nu.
  LEFT JOIN LATERAL (
    SELECT coalesce(
      (SELECT min(h.modified_time) FROM road_condition_history h
       WHERE h.segment_id = a.segment_id AND h.modified_time <= vid
         AND h.modified_time > coalesce((SELECT max(h2.modified_time) FROM road_condition_history h2
               WHERE h2.segment_id = a.segment_id AND h2.modified_time <= vid AND (h2.deleted OR h2.condition_code <> 3)),
             '-infinity'::timestamptz)),
      a.tid) AS t
    WHERE a.kod = 3) hojd ON true
$$;
COMMENT ON FUNCTION vaglag_hal_sedan(timestamptz) IS 'Hala sträckor vid en tidpunkt (sql/117 och 129, #897, #915): när det hala läget började, om början är känd, när klassen gick upp till Mycket besvärligt, och om halkrisken är ny (yngre än 24 timmar). Samma regel för halt som rutan och motorn.';

-- Låst som i sql/117: bara service-rollen, vaktat på rollerna (CI:s PostGIS har dem inte).
REVOKE ALL ON FUNCTION vaglag_hal_sedan(timestamptz) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION vaglag_hal_sedan(timestamptz) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION vaglag_hal_sedan(timestamptz) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION vaglag_hal_sedan(timestamptz) TO service_role;
  END IF;
END $$;
