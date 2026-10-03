---
name: halkvakt-android
description: Projektspecifika regler för Halkvakts Android-app — bakgrundsposition, doze/OEM-överlevnad, TTS/Bluetooth-röst, Play-policyn och motor-kontraktet. Läses FÖRE all kod i android/. Kompletterar kotlin-concurrency-and-flow (Flow-mönster) och compose-state-and-effects (UI).
---

# Halkvakt Android — det generiska skills inte täcker

Appens natur: bakgrundstjänst som röstvarnar under körning. UI:t är sekundärt.
Allt nedan är destillat av projektets beslut (DECISIONS.md) och Play-dossiern.

## 1 · Motor-kontraktet (viktigast av allt)
- `engine/` är facit. Kotlin-porten i `android/` får ALDRIG avvika i beteende utan att
  replay-vektorerna i `engine/replay/` uppdateras i samma commit — vektorerna är domaren.
- Motorlogik hålls JVM-ren: inga `android.*`-importer i motorlagret. Androidberoenden
  (plats, ljud, livscykel) injiceras via gränssnitt. Detta gör motorn testbar med `./gradlew test`
  utan emulator.
- Positionen lämnar aldrig enheten. Ingen telemetri med koordinater, inte ens loggning.
  Detta är produktlöftet OCH Play-deklarationen — bryts det ena bryts båda.

## 2 · Bakgrundsposition & Play-policyn
- Foreground service med `foregroundServiceType="location"` måste vara STARTAD innan
  platsuppdateringar begärs i bakgrund. Ordningen är policykrav, inte stil.
- Behörighetstrappa (Android 11+): FINE i förgrunden → egen förklaringsskärm ("varnar
  medan du kör, skärmen släckt") → först därefter BACKGROUND, som slussar användaren
  till systeminställningar. Begär aldrig allt på en gång — det ger avslag i Play-granskningen.
- Ny bakgrundsanvändning av plats? Uppdatera `docs/PLAY-BACKGROUND-LOCATION.md`
  (deklarationstext + demovideo-manus) FÖRE koden. Konsol-deklaration och kod i osynk
  = avslag eller nedplockning.

## 3 · Doze, batteri och OEM-döden
- Inga exakta alarm, inga polling-timers. Motor-tick drivs av fused-location-callbacks
  (intervall styrt av hastighet); underhåll (datauppdatering) via WorkManager med
  nätverksvillkor.
- Activity Recognition (`IN_VEHICLE`) är väckningen — appen startar sig själv när körning
  upptäcks. Ingen "kom ihåg att öppna appen".
- Anta att processen dödas när som helst (Samsung/Xiaomi är aggressivast — vår testmobil
  är Samsung A just därför). ALLT tillstånd (aktiva varningszoner, senaste positionshink,
  TTS-kö) måste återskapas ur persistens vid kallstart, tyst och snabbt.
- Vid batterisparläge: degradera hellre uppdateringstakt än att döda varningar.

## 4 · Rösten (TTS + Bluetooth)
- Initiera TTS vid tjänstestart, inte vid första varningen — kallstart tar sekunder och
  första varningen får inte ätas upp.
- En `TtsGate` äger allt tal: prioritetskö (halka > olycka > vilt > kamera), dedupe per
  zon, max en aktiv utterance.
- Audio focus: `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` — musiken duckar, navigatorn
  avbryts inte. Tala först EFTER focus-grant (Bluetooth-fördröjning annars klipper
  första ordet).
- Svensk röst kan saknas på enheten: kontrollera vid start, fall tillbaka till
  engelska + visa engångshänvisning till röstinställningar.

## 5 · Datakällornas egenheter (hårt vunna)
- Produktionens källnamn är `deviations` och `road_conditions` — INTE "situations"/
  "roadcondition". Fel namn ⇒ tysta nollresultat.
- Trafikverkets delta-protokoll: spara `LASTCHANGEID` per källa; `changeid=0` = full
  omhämtning; `includedeletedobjects=true` krävs för att zoner ska släckas.
- WKT-geometri är `lon lat`-ordning (WGS84). Blandas ordningen hamnar varningarna i
  Norska havet.
- android-emulator-runner (CI): kör VARJE script-rad i eget skal — `cd` och variabler
  överlever inte radbyten; kedja med `&&`/`;` eller använd fulla sökvägar. `profile:
  pixel_5` bootar inte alls med default-imagen — standard-AVD + UI-knack i PROCENT av
  `wm size` är det stabila mönstret för skärmdumpar.

- JVM-enhetstester har INTE Androids org.json: `testImplementation("org.json:json:…")` ger json-java, som beter sig annorlunda
  (3/10, kort #289). `getString()` på ett tal KASTAR där Android gör om det till text, och `optString()` på JSON-null ger `""` där
  Android ger `"null"`. Läsarkod som ska provas i JVM läser id med `get("id").toString()` och null med `isNull()`, aldrig med
  `optString`. Utan testberoendet alls är `JSONObject` en stubbe som kastar "Method … not mocked".
- android.yml körs bara vid push till main (och workflow_dispatch) — PR:ens CI (`ci.yml`) bygger inte Android alls. Beviset
  före sammanslagning tas med workflow_dispatch på grenen, och motprovet likadant på en egen gren (kort #218, 26/9).

## 6 · Innan du kodar
1. Läs bedömningen (`docs/BEDOMNING-*.md`) + relevant kort på tavlan (BACKLOG avvecklad 26/9).
2. UI-arbete → läs `skills/compose-state-and-effects/SKILL.md`.
3. Coroutines/Flow-arbete → läs `skills/kotlin-concurrency-and-flow/SKILL.md`.
4. Motorändring → kör replay-vektorerna, uppdatera vid avsiktlig beteendeändring.
