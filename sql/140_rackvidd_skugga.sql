-- 140: RÄCKVIDDEN SOM EN FARA, SKUGGAN (Bengt 21/11: "bygg in"; DECISIONS #950, kort #676). Skuggmotorn spelar varje rutt i
-- huvudvarvet en gång till med väderstationerna som kan tala som A2 inom 15 km från rutten lagda på rutten, och en kedja där nästa
-- ligger högst 15 km längre fram som en fara (engine/src/rutfilter.ts stationerSomEnFara). Kolumnen bär det den körningen sade som
-- A2: {n, a: [{t, id, distanceM}]}. En skugga, aldrig en röst: appen och live.json rörs inte. Null = ingen skugga (grupp C, grannländerna,
-- raderna före 140). Kan köras igen.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS rackvidd jsonb;
