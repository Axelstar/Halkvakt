# SYSTEM.md — vad Halkvakt gör, säger och INTE gör

Bengts krav (2026-08-28), Claudes form. Disciplin (DECISIONS #24): en commit som
ändrar en regel, en källa eller en rösttext ändrar OCKSÅ denna fil. Bengt läser
den mot koden en gång i månaden.

## 1 · Källor in
- **Timvis** (GitHub Actions `ingest`): Trafikverket deviations + road conditions
  + väderstationer + fartkameror (metadata, ALDRIG bilder); Polisens viltolyckor
  (→ snapshotens wildlife-array, 48 h-fönster, endast händelser med position);
  SMHI vädervarningar (ibww v1). Arkiveras i Supabase (deviations,
  road_conditions, smhi_warnings_history, vilt) med vinterrelevansfilter.
- **Minutvis** (Supabase `ingest-live`, fail-closed INGEST_KEY): färska lägen.
- **Var 30:e min** (`publish`): snapshot → `data/app/v1/{manifest,static,live}.json`
  på CDN med sha256 i manifestet. `generated_at` i live.json är datans klocka.
- Appen hämtar snapshoten, verifierar checksumman, cachar för offline.

## 2 · Regler (ur EngineConfig/engine — sanningen är koden)
- Korridor: ±35° framför färdriktningen. Minfart för varning: 15 km/h.
- Förvarningsavstånd: fart × 30 s, klämd till 400–3000 m (skjutreglaget i appen
  ändrar taket, aldrig kontraktet).
- Global tystnad 45 s efter varje varning; samma fara upprepas först efter
  ≥10 min OCH ≥5 km. Prioritet = kategoriordningen; förlorare DROPPAS, köas aldrig.
- Kamera: 500 m. Olycka: max 10 km fram.
- **Frysrisk** utlöses av: yttemperatur ≤ 1,0 °C OCH fukt. **Halksträcka** av:
  väglagskod ≥ 2 eller halk-ord i Trafikverkets fritext. Inget annat.
- **Åldersvakten** (FÖRE motorn): är live.json äldre än 45 min filtreras frysrisk
  och halksträckor bort; äldre än 2 h även olyckor. Kameror och vilt består.

## 3 · Vad appen säger
- Motorns svenska varningstexter (avstånd + fara + uppmaning), byggda i motorn
  och identiska på alla plattformar.
- Vid passerad ålderströskel, EN gång per körning: *"Ingen färsk väglagsdata –
  kör som om det kan vara halt."* Sedan tyst.
- Statusrader ("Vägdata laddad: N faror") går till loggen, inte rösten.
- UI visar DATANS tid ("N faror · väglag 06:10"), inte nedladdningens.
- Designprincip: hellre tyst än tjatig — men tystnad ska vara säker, inte bara tyst.

## 4 · Vad systemet INTE gör (viktigast — läs före varje löfte utåt)
- **Ingen prognos.** Endast nu-läge. Blixthalka-prognos = backlog #16, finns inte.
- **Tyst mellan mätpunkterna.** VViS-stationer sitter 12–13 mil isär på statligt
  vägnät; däremellan ser motorn ingenting. Löftet följer källans täckning.
- **Viltpunkternas precision är Polisens.** Vilt (48 h-fönster) kan ha kommun-
  grov position i källan; varningen pekar på trakten, inte metern. Kalibreras
  mot vintern.
- **Ingen ködetektion** (#15, uppdatering 1). Ingen vattenplaning, solbländning,
  snödrev, dimma.
- **Läser inte** fordonsfriktionsdata, plogdata eller Öresundsbrons status
  (stängda källor — se docs/RISKKARTA-BENGT.md).
- **Samlar inte in någonting.** Ingen telemetri, inga konton, ingen position ut.
  Baksidan av löftet: vi vet inte hur appen används — mätningen (§5) sker helt
  på serversidan mot öppna data, aldrig mot användare.
- **Sparar inga kamerabilder**, endast stationsmetadata.
- **Trösklarna är okalibrerade.** ≤1 °C + fukt och kod ≥2 är rimliga startvärden,
  oprövade mot verklig vinter. Kalibrering = första säsongens huvuduppgift.
- **iOS-appen är skriven men obyggd** tills första Mac-bygget (#18).

## 5 · Mätning
- **Skuggmotorn** (LIVE sedan 29/8, Supabase cron var 30:e min): kör motorn mot
  färska snapshoten på tre fasta referensrutter (E22 Malmö→Kristianstad, väg 23
  Höör→Osby, väg 19 Ystad→Kristianstad; grova men FASTA polylinjer, 80 km/h) →
  shadow_log med indata. Vid varning arkiveras närmaste väglagskamerabild i
  facit-hinken (dedupe station×3 h). Falsklarmsandelen får därmed logg + bildfacit.
- **Missandelen** (#19, jämförelseskript): SMHI-halkvarningar + Situation-halka
  ur arkivet × referensrutterna → händelser/träffar/missar per vecka. Byggs på
  augustidata (tomt är ok), körs skarpt från första halkdagen. Missandelen
  avgör om tystnadsdesignen är rätt.
- **Driftvakter:** healthcheck varannan timme (API:er + webbens dataålder >90 min
  larmar), CI-replay av vektorerna vid varje push.

## 6 · Vägar framåt (en rad per spår)
- #15 Kö-slut (TrafficFlow, verifierad 43 s färsk) — uppdatering 1.
- #16 Blixthalke-prognos (MET Nowcast) — uppdatering 2.
- #18 Första iOS-bygget på Axels Mac — måndag.
- #19 Missmätningsskriptet — byggs nu, skördar i vinter.
- Sensortrappan (Bengts synergianalys) — strategi, EJ i MVP (beslut 2026-08-28).
