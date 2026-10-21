-- 065: DOMLOGGEN BÄR PUNKTERNA OCH ANKARAVSTÅNDET (åtgärdslistan B4-36, paket A; Bengt 21/10: "Bygg PR:en" och "Stryk, dom per band").
-- Kandidaten döms i mars per ankarband (förregistreringen §4: 0–7, 7–15, 15–20 och över 20 km; domslut (b) i TROSKLAR-SKUGGAN
-- §4). Domloggen (sql/057–058, kandidat_skugga) sparar bara ANTAL per sträcka och timme: vilka punkter som varnade och hur långt de
-- låg från närmaste ankare finns inte, och vägpunkternas värden i kandidat_live raderas efter sex timmar (sql/052). Utan
-- ankaravståndet går en varning inte att lägga i ett band, och utan punkterna går "station på segmentet" bara att pröva per sträcka.
--
-- Här får varje rad sex fält till, i samma ordning, för sträckans punkter som INTE är torra — de som varnar, de som
-- spridningsgrinden tystade och de som vetades:
--   fukt_punkter   vägpunkternas id
--   fukt_utfall    regelns utfall per punkt: varnar · spridning · veto
--   fukt_ank_km    närmaste bidragande ankare (kandidat_live.ank_km), null utan ankare inom 50 km
--   fukt_n_ank     RÅ:s bidragande ankare (kandidat_live.n_ank)
--   fukt_spr       ankarnas spridning (kandidat_live.spr)
--   fukt_pb        kandidatens värde (kandidat_live.pb)
-- De vetade punkterna är med för att domen ska kunna redovisa B1 utan vetot (B1-fällan, åtgärdslistan B4-37); om en vetad punkt var
-- fuktig läses ur radens vat och radar_mmh. Torra punkter sparas inte: de varnar vid inget X och bär ingen B.
--
-- REGELN RÖRS INTE. kandidat_regel() är orörd, och inget av regelns tal står i den här filen (kontraktsgrinden vaktar dem i
-- sql/058). Bara kandidat_logga() skrivs om, med 058:s innehåll oförändrat plus de sex fälten. Inga nya tabeller (sql/064:s regel
-- gäller inte); exporten (arkiv2_dygn) läser kolumnerna ur katalogen och tar de nya fälten till hinken av sig själv. Värdevakten
-- besiktar bara numeriska fält, inte listor. Idempotent.

ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_punkter text[];
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_utfall text[];
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_ank_km real[];
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_n_ank smallint[];
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_spr real[];
ALTER TABLE kandidat_skugga ADD COLUMN IF NOT EXISTS fukt_pb real[];

CREATE OR REPLACE FUNCTION kandidat_logga() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE t timestamptz; n_st int := 0; n_seg int := 0; n_v int := 0; n_veto int := 0; n_torr int := 0; n_spr int := 0;
BEGIN
  INSERT INTO kandidat_station (station_id, observed_at, ph, pg, ra, ank_km, pb, n_ank, spr)
    SELECT l.punkt, l.tid, l.ph, l.pg, l.ra, l.ank_km, l.pb, l.n_ank, l.spr FROM kandidat_live l WHERE l.punkt NOT LIKE 'v%'
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
                                 veto_station, veto_km, veto_yta, spridning, fukt_glest, fukt_spr_min,
                                 fukt_punkter, fukt_utfall, fukt_ank_km, fukt_n_ank, fukt_spr, fukt_pb)
    SELECT r.segment_id, r.tid, count(*), count(*) FILTER (WHERE r.utfall = 'varnar'), count(*) FILTER (WHERE r.utfall = 'veto'),
           count(*) FILTER (WHERE r.utfall = 'torr'), bool_or(r.vat), bool_or(r.flackvis_vat), max(r.radar_mmh), min(r.pb),
           (array_agg(r.veto_station ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           min(r.veto_km),
           (array_agg(r.veto_yta ORDER BY r.veto_km) FILTER (WHERE r.veto_station IS NOT NULL))[1],
           count(*) FILTER (WHERE r.utfall = 'spridning'),
           count(*) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) < 2),
           min(r.spr) FILTER (WHERE r.utfall IN ('varnar', 'spridning') AND coalesce(r.n_ank, 0) >= 2),
           -- 065: punkterna som inte är torra, i punktordning; fälten hämtas ur kandidat_live för samma timme och punkt (1:1, nyckeln).
           array_agg(r.punkt ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.utfall ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(l.ank_km ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.n_ank ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.spr ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr'),
           array_agg(r.pb ORDER BY r.punkt) FILTER (WHERE r.utfall <> 'torr')
    FROM r LEFT JOIN kandidat_live l ON l.tid = r.tid AND l.punkt = r.punkt
    GROUP BY r.segment_id, r.tid
    ON CONFLICT (segment_id, observed_at) DO NOTHING
    RETURNING varnar, veto, torr, spridning
  )
  SELECT count(*), coalesce(sum(i.varnar), 0), coalesce(sum(i.veto), 0), coalesce(sum(i.torr), 0), coalesce(sum(i.spridning), 0)
    INTO n_seg, n_v, n_veto, n_torr, n_spr FROM ins i;
  INSERT INTO kandidat_skugga_korning (observed_at, status, stracker, varnar, veto, torr, spridning, stationer)
    VALUES (t, 'räknad', n_seg, n_v, n_veto, n_torr, n_spr, n_st);
  RETURN format('kandidatens timme %s: %s sträckor, %s varnande punkter, %s vetade, %s torra, %s tystade av spridningen; %s stationsrader',
                t, n_seg, n_v, n_veto, n_torr, n_spr, n_st);
END $$;
COMMENT ON COLUMN kandidat_skugga.fukt_punkter IS 'sql/065: punkterna som inte är torra (varnar, spridning, veto), i punktordning; fukt_* i samma ordning';
COMMENT ON COLUMN kandidat_skugga.fukt_ank_km IS 'sql/065: närmaste bidragande ankare per punkt (kandidat_live.ank_km) — ankarbandet i domen per band';
