# Till Axel: bygge (19) — fyra fel från Bengts provresa 28/9, och vad som ska göras på iPhone och Android

**Från:** Bengt (analys mot koden: Claude, 28/9 2026)
**Gäller:** 0.3.9 (18) — kort #203 lager 2 (missarna), #259 (reglaget), #262 (batteripaketet); DECISIONS #320, #379
**Vad som behövs av dig:** rättelserna nedan i ett bygge **(19)** — iPhone nu, Android efter 1/10 — och integritetssidan
**före** utskicket till fler än Bengt. Ett beslut: iPhone punkt 4b.

> **1/10 kväll (kort #279, DECISIONS #430):** iPhone 1, 2 och 3 är **byggda** i main, skrivna utan kompilator; `CURRENT_PROJECT_VERSION`
> är 19. Punkt 3b löstes så att en vald miss visar *Skickad* och den gemensamma raden bara visas vid fel — besvarade varningar
> försvinner ur kortet, så de behöver ingen rad. Samma fel visade sig på Axels stora iPhone 1/10 så fort resan hade fyra varningar.
> Kvar för dig: bygget (19) i Xcode, 4a och 4b, `integritet.html`.

**Inget i det här rör motorn, vektorerna eller en tröskel.** Det är text, layout och en statusrad. Och inget ändrar *vad*
appen skickar — gör det det, gäller invariantregeln i CLAUDE.md (fyra dokument i samma commit).

---

## Vad Bengt såg

Bengt körde (18) på sin iPhone 28/9, en 4,7-tumsmodell. Skärmbilderna ligger i `docs/bygge-19/`.

- **13:41, körläget** (`provresa-2026-09-28-1341-korlaget.png`): tryckte *Appen missade* ⇒ *"Markerat 13:41 — du väljer vad
  det var efter resan."* Texten under tiden är avklippt: *"Rösten talar ungefär 30 sekunder före, som läng…"*.
- **13:52, Redo.** (`provresa-2026-09-28-1352-efter-resan.png`): efter-resan-kortet med **en** rad, *"13:52 Du markerade:
  appen missade — va…"*, ingen knapp vald — och under den *"Skickat 13:52 (1 missar)"*. Rubriken är avklippt, *EFTER RESAN*
  ligger under statusraden, *"Ingen tur ä…"* ligger under flikraden, och under *Redo.* står *"Din position stannar i telefonen."*
- **Databasen** (läst 28/9 14:17): den enda miss som kom in var markerad **13:49:26**, vald *vatten*, mottagen 13:52:06. Alltså
  tre markeringar på elva minuter — 13:41, 13:49 och 13:52 — varav en skickades. Raden är raderad på Bengts order (se nedan).

Funktionen fungerar i grunden: markering, kort, val och sändning gör det de ska. Men fyra saker är fel.

| # | Felet | iPhone | Android |
| :-- | :-- | :-- | :-- |
| 1 | Texter klipps med "…" på liten skärm | ✘ | ✅ opåverkad — skärmarna scrollar |
| 2 | *"Skickat … (1 missar)"* står under en rad utan val | ✘ | ✘ |
| 3 | Dubbeltryck ger två missar; ingen ångra | ✘ (knappen och Siri) | ✘ (knappen) |
| 4 | *"Din position stannar i telefonen"* | ✘ | ✅ opåverkad — säger redan *"lämnar inte telefonen av sig själv"* |

---

## iPhone

### 1. Löftet under *Redo.* — måste rättas före utskick

- **Fil:** `ios/HalkvaktApp/Sources/Views/VaktenView.swift`, `subtitle` (rad 72–77).
- **I dag:** *"… källor bevakade. Din position stannar i telefonen."* — alltid, även med Betatest på och direkt efter att en
  miss med station och klockslag skickats.
- **Ska vara:** *"Din position lämnar inte telefonen av sig själv."* Samma ord som Android (`ui/App.kt:726`), introduktionen och
  produktboken sedan 23/9 (DECISIONS #320). Just den här raden kom inte med då.
- **Verify:** *Redo.* visar den nya meningen, med Betatest av och på.

### 2. Skärmarna ska kunna scrollas — bör rättas före utskick

- **Filer:** `VaktenView.swift` och `KorlageView.swift`. Ingen av dem har en `ScrollView`; den enda i appen sitter i
  `OnboardingView`.
- **Varför det syns:** på en 4,7-tums iPhone får innehållet inte plats. iOS trycker då ihop texterna till en rad med "…" och
  skjuter ut rader under statusraden och flikraden. Frågan efter resan — *"vad var det?"* — är hela poängen med #203, och den
  går inte att läsa.
- **Ändring:** lägg innehållet i en `ScrollView`. *Redo.* centrerar med `Spacer()`, som inte verkar i en `ScrollView` — ge
  innehållet en minsta höjd lika med skärmen så att stora telefoner ser ut som i dag. Behåll fri höjd under sista raden, så att
  flikraden inte täcker den (samma läxa som sidprickarna 31/8).
- **Verify:** i simulatorn för iPhone SE (3:e gen.) finns inget "…" någonstans, kortet går att läsa helt och sista raden ligger
  ovanför flikraden. På en stor iPhone ser skärmarna ut som förut.

### 3. Statusraden i efter-resan-kortet — bör rättas före utskick

- **Filer:** `Services/FacitSender.swift` (rad 35–37) och `Views/EfterResanKort.swift` (rad 89–94).
- **I dag:** `facitStatus` är **en** textrad för hela appen — senaste sändningen av vad som helst — och den visas längst ned i
  kortet. Under en obesvarad rad läser den som att *raden* skickades, fast den gäller en annan miss (i Bengts fall den från
  13:49, enligt databasen). En testare som ser det tror att appen skickar utan att fråga, och det är precis löftet *"tystnad räknas aldrig
  som ja"* som då ser brutet ut.
- **Ändring:**
  - (a) Rätt böjning: *"1 miss"* / *"2 missar"* (i dag alltid *"missar"*).
  - (b) Visa läget **per rad**: bredvid en vald rad *"Skickad 13:52"*. Uppgifterna finns redan (`MissEntry.sent`, `.vad`;
    `FacitEntry` har samma). Den gemensamma raden visas i kortet bara vid fel (*"Kunde inte skicka …"*).
- **Verify:** en vald miss visar sitt val och *skickad*; en rad utan val har aldrig *"Skickat"* under sig.

### 4. Dubbeltryck och Siri när vakten är av — kan följa med

- **Filer:** `Services/GuardManager.swift`, `markeraMiss()` (rad 307); `Views/KorlageView.swift` (rad 74–79);
  `Intents/AppenMissadeIntent.swift`.
- **(a) Spärr:** ett andra tryck, eller ett andra *"appen missade"*, inom 60 sekunder räknas inte; kvittot säger *"Redan
  markerat 13:41"*. I dag blir varje tryck en egen miss.
- **(b) Ditt beslut — Siri när vakten är av.** `markeraMiss()` frågar inte om vakten kör, och använder då senaste kända
  position, som kan vara från en avslutad resa. Tre vägar: vägra när vakten är av (*"Starta vakten först"*), tillåta inom
  10 minuter efter stopp, eller som i dag. **Rekommendation: vägra** — en miss hör till en körning.
- **(c) Valfritt:** ett sätt att ta bort en felmarkerad miss i kortet. I dag skickas den aldrig om inget väljs, men den står
  kvar i kortet ett dygn.

### 5. Bygget

- `CURRENT_PROJECT_VERSION` 18 → **19** i `ios/HalkvaktApp/project.yml`, **i samma commit som den sista ändringen** — inte
  före (läxan 16/9, DECISIONS #240).
- Före arkivering: `ios-engine`, `android` och `ci` gröna (CLAUDE.md). Uppmaningen *"arkivera nu"* nämner commit-hashen.
- Produktboken: nya skärmbilder av *Redo.*, körläget och efter-resan-kortet i samma commit (PRODUKTBOKSREGELN).

---

## Android — efter 1/10

Android påverkas av fel 2 och 3, inte av 1 och 4. Ingen Android-telefon har (18) ännu, så felen når ingen i dag.

### 1. Statusraden (fel 2)

- **Filer:** `FacitSender.kt` (rad 34–36) och `ui/App.kt` (statusraden runt rad 404 och 438).
- Samma ändring som iPhone punkt 3: *"1 miss"*, läget per rad, gemensam rad bara vid fel.

### 2. Spärr mot dubbeltryck (fel 3a)

- **Fil:** `ui/App.kt`, körlägets knapp runt rad 545–553 (anropar `Prefs.markeraMiss`).
- Samma 60-sekundersregel. Android har ingen Siri-väg.

### 3. Bygget

- `versionCode` 18 → **19** i `android/app/build.gradle.kts`, i takt med iPhone.
- **Efter 1/10:** kassan säger inga app-byggen före månadsskiftet (bedömningen §0b).
- Kan åka med ur batteripaketet (kort #262) det som inte kräver beslut: Å1 stoppknapp i den pågående notisen, Å4 autostartens
  text (den nämner bara Bluetooth men slår också på Activity Recognition), Å5 cache i `Guard.nearestHazardM`. Å2 och Å3 bär
  trösklar och väntar på ditt och Bengts beslut.
- Obs: det enda en testare kan installera i dag är debug-APK:n, som saknar R8-optimeringen. Mät inte batteri på den (#262).

---

## Utanför appen — före (19) skickas till fler än Bengt

1. **`integritet.html`** i karta-repot — bara du har skrivrätt. De tre ändringarna står färdiga i `docs/PLAY-DATASAFETY.md`
   rad 66–76: raderingsmeningen, **en punkt om missarna** och datumraden. Policyn ska säga vad appen skickar innan appen
   skickar det till någon utanför projektet.
2. ~~**Bengts provmissar 28/9** ligger i databasen som riktiga rader.~~ ✅ **Raderade 28/9 14:18 på Bengts order** (DB-knappen,
   körning 36420976710, DECISIONS #390): en rad, markerad 13:49:26, *vatten*, `wx:7102`. `driver_miss` bär nu bara serverns
   provrad från 26/9; 0 riktiga missar. De två osända markeringarna (13:41, 13:52) ligger kvar i Bengts telefon och skickas bara
   om han väljer något för dem. Appen kan fortfarande inte märka ett provtryck — varje prov i bil landar i facit tills den kan.

## Ordning

1. `integritet.html`
2. iPhone 1–3 (och 4a), bygget (19), TestFlight till Bengt
3. Bengt provar på sin 4,7-tums iPhone — samma resa som 28/9
4. Utskick till fler
5. Android efter 1/10
