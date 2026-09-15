-- #154 steg E (15/9 2026, Bengts "ja på #154, bygg steg E", DECISIONS #191): skuggan loggar vad
-- vattenplaningsrösten SKULLE sagt. Egen kolumn, aldrig i `alerts`: den kolumnen är motorns ord och
-- läses av skuggrapporten, tystnadsfelet och upprepningen — en inblandad skuggvarning hade förfalskat
-- alla tre mätningarna på en gång.
-- En jsonb-lista per körning: [{t, id, regn, code, road, distanceM, geo, lon, lat}] — segmentet ur
-- live.json:s `rain_segments`, radarns regn i stationens skala, och BILENS position (geo "bil") när
-- rösten skulle talat. Positionen är facitbildens plats, inte segmentets.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS vb jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shadow_log.vb IS '#154 steg E: vattenplaningsvarningar rösten SKULLE sagt (grind V-B). Aldrig hörda av någon.';
