-- 145: HALKANS VÄGTEST I SKUGGAN (Bengt 26/11: "Sätt igång en mätning av den"; DECISIONS #963, #967, kort #679). Vägtestet (PR #1841)
-- låter en hal sträcka tala bara när bilen är inom 80 m från sträckans linje och högst 30° från dess riktning, och det som stoppas loggas
-- ingenstans. Skuggmotorn lyssnar nu på motorns krok onVagtestStopp och skriver för varje körning i huvudvarvet de sträckor som testet
-- stoppade före sin första varning: {n, tyst, s: [{id, vag, n, forstaT, forstaM, linjeM, vinkel, talade: {t, distanceM} | null}]}.
-- talade = null: testet tystade sträckan hela vägen. En skugga, aldrig en röst: appen och live.json rörs inte. Null = ingen mätning
-- (grupp C, grannländerna, raderna före 145). Körs FÖRE deployen av skuggmotorn, annars avvisar databasen raden. Kan köras igen.
ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS vagtest jsonb;
COMMENT ON COLUMN shadow_log.vagtest IS '#967: hala sträckor som halkans vägtest (#963) stoppade före sin första varning i körningen. Aldrig hörda.';
