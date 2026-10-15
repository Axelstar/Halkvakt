-- 052: KANDIDATENS GALLRING I TIMMAR, INTE DYGN (DECISIONS #569, Bengt 15/10 "kör steg 1").
-- 050 sparade PH två dygn och värdet tre: ~700 000 + ~1 000 000 rader, ungefär 165 MB, mot gratisnivåns 500 MB som
-- Supabase räknade till 483 MB 15/10 06:38 UTC (summan över alla databaser). Inget läser äldre rader: del B läser PH för
-- sin timme (kandidat-timme.yml, TID = timmen nu), och skuggloggen och publiceringen (steg 6–7) är inte byggda.
--   kandidat_ph    från en timme bakåt: timmen del B räknar och de kommande som del A redan skrivit.
--   kandidat_live  sex timmar.
-- Samma funktion, samma anropare (timjobbet efter varje skrivning). Rättigheterna står kvar vid CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION gallra_kandidat() RETURNS bigint AS $$
DECLARE n bigint := 0; m bigint;
BEGIN
  DELETE FROM kandidat_ph WHERE tid < now() - interval '1 hour';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  DELETE FROM kandidat_live WHERE tid < now() - interval '6 hours';
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
