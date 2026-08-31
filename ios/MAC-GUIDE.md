# MAC-GUIDEN — bygga Halkvakt för iPhone (Axels klicksteg)

Claude skriver all Swift-kod i Linux men bara en Mac kan BYGGA iOS-appar.
Din Mac är byggmaskinen; den här guiden är hela receptet. Ingen kodkunskap krävs.

## REDAN I DAG (medan du väntar på lönen)

**Axels Mac (verifierad 27/8): MacBook Air M1, macOS Sequoia 15.0.**
**Apple-krav sedan 28 april 2026:** App Store/TestFlight tar ENDAST emot appar
byggda med iOS 26-SDK (Xcode 26+). Äldre Xcode (16.x) bygger men stoppas vid
uppladdning (ITMS-90725). Xcode 26 kräver macOS Sequoia 15.6+.

**VALD VÄG (Axels beslut 27/8): stanna på Sequoia, ta Xcode 26 manuellt.**
1. Programuppdatering → installera LILLA Sequoia-uppdateringen (15.0 → 15.7.x).
   Välj INTE "Uppgradera till macOS 26" om båda visas. (~30–60 min)
2. developer.apple.com/download/all (vanligt Apple-ID) → hämta **Xcode 26.1**
   (.xip) → dubbelklicka i Hämtade (packar upp länge) → dra Xcode till Program.
   Diskbehov under uppackning: ~40 GB ledigt.
3. Öppna Xcode en gång: godkänn licens, låt den hämta "iOS components".

(Alternativ som också funkar: uppgradera hela vägen till macOS 26 och ta
Xcode från App Store — mer förändring, samma slutresultat.)

## MÅNDAG — steg för steg

### 1. Hämta koden (5 min)
Öppna appen **Terminal** (finns i Program → Verktyg) och klistra in, rad för rad:

    xcode-select --install
    git clone https://github.com/Axelstar/Halkvakt.git ~/Halkvakt

(Om git frågar efter inloggning: användarnamn Axelstar + en "personal access
token" — säg till Claude så ordnar vi en läs-token åt Macen.)

### 2. Installera byggverktyget XcodeGen (5 min)

    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install xcodegen

(Första raden installerar Homebrew, Macens paketbutik. Följ dess instruktioner
om den ber dig köra två extra rader i slutet — kopiera dem bara.)

### 3. Skapa och öppna projektet (2 min)

    cd ~/Halkvakt/ios/HalkvaktApp
    xcodegen
    open Halkvakt.xcodeproj

Xcode öppnas med hela appen.

### 4. Signering — koppla ditt Apple-ID (3 min)
I Xcode: klicka på **Halkvakt** överst i vänsterspalten → fliken
**Signing & Capabilities** → bocka i **Automatically manage signing** →
**Team**: välj ditt Apple-ID (lägg till via "Add an Account…" om listan är tom
— ditt vanliga Apple-ID duger).

💡 **Du behöver INTE 99-dollarskontot för att köra på din egen iPhone.**
Ett gratis "Personal Team" räcker för att installera på din telefon (appen
lever då 7 dagar per bygge). Betalkontot behövs först för TestFlight till
andra — det öppnar du samma dag.

### 5. Kör på din iPhone (5 min)
Koppla iPhonen med kabel → välj den i enhetslistan högst upp i Xcode
(där det står en simulatornamn) → tryck ▶. Första gången: iPhonen säger
"Otillförlitlig utvecklare" → Inställningar → Allmänt → VPN & enhetshantering
→ lita på ditt Apple-ID. Tryck ▶ igen.

**Halkvakt är nu på din iPhone.** Ge platsbehörighet, tryck Starta vakten,
provlyssna rösten under Inställningar.

### 6. TestFlight (när Apple-kontot är godkänt)
1. developer.apple.com → Enroll (99 USD/år, personligt konto, ID-verifiering
   kan ta 1–2 dygn).
2. I Xcode: Product → Archive → Distribute App → App Store Connect → Upload.
3. appstoreconnect.apple.com → TestFlight → lägg till testare med e-post.
   Ingen 14-dagarskarantän — testare kan köra samma kväll.

## Om något krånglar
Ta en skärmbild på felet och klistra in i chatten med Claude — exakta
felmeddelanden är guld. Vanligast: glömt välja Team (steg 4), eller iPhonen
litar inte på utvecklaren än (steg 5).


## ⚠️ Efter varje `xcodegen`: välj Team igen
xcodegen bygger om projektfilen från receptet — då nollställs signeringen.
Rutin: projektroten → Signing & Capabilities → Team → "axel Lagerlof
(Personal Team)". Två klick, sen ▶. (Felbilden är "No Account for Team" +
"No profiles for se.halkvakt.app".)


## Testkörning från soffan (GPX-rutten)
Appen kan "köra bil" utan bil: `Sources/TestkorningE22.gpx` är en simulerad
färd Malmö→Kristianstad i 80 km/h som passerar riktiga fartkameror.
1. Kör appen i **simulatorn** (välj en iPhone-simulator i stället för din
   telefon uppe i toppraden) eller på din iPhone via Xcode.
2. Tryck **Starta vakten** i appen.
3. I Xcodes nedre felsökningsrad: klicka **platspilen** (📍) →
   välj **TestkorningE22**.
4. Skruva upp ljudet. Vakten börjar tala när första kameran närmar sig.
Xcode spelar upp rutten i verklig hastighet — luta dig tillbaka och lyssna.

## TestFlight — från Archive till kompisarnas fickor
Förutsättning: aktiveringsmejlet "Welcome to the Apple Developer Program" har kommit
och `git pull` + `xcodegen` + Team-valet är gjort (Team heter nu "axel Lagerlof" utan
"(Personal Team)").

1. **Bundle-ID + apposten (engångs):** appstoreconnect.apple.com → My Apps → **+** →
   New App → iOS, namn *Halkvakt*, primärt språk *Svenska*, Bundle ID *se.halkvakt.app*
   (Xcode registrerar det automatiskt vid första arkiveringen om det saknas i listan —
   arkivera då först, kom tillbaka hit sen), SKU *halkvakt-ios*.
2. **Arkivera:** i Xcode välj mål **"Any iOS Device (arm64)"** i toppraden (inte din
   telefon) → meny **Product → Archive**. Tar några minuter. Organizer-fönstret öppnas.
3. **Ladda upp:** i Organizer: **Distribute App → App Store Connect → Upload** →
   nästa, nästa (behåll standardval: automatisk signering) → **Upload**.
4. **Vänta 5–15 min** på mejlet "Halkvakt has completed processing".
5. **TestFlight-fliken** i App Store Connect → bygget syns → **External Testing →
   + (ny grupp) "Kompisarna"** → lägg till testarnas e-post → välj bygget → svara på
   frågorna (exportregler: "No" — vi har ITSAppUsesNonExemptEncryption=false) →
   *Submit for review*. Första bygget granskas av Apple (typiskt < 1 dygn).
6. Testarna får mejl → laddar ner **TestFlight-appen** → Halkvakt installeras.
   Bygget lever i 90 dagar. Nya byggen = steg 2–3 igen, testarna uppdateras automatiskt.

## Vit skärm efter xcodegen/team-byte — städtrappan
1. iPhonen: håll in ikonen → Ta bort app → Radera
2. Xcode: Product → Clean Build Folder (⇧⌘K)
3. ▶ mot telefonen
4. **Biverkan:** radering nollställer "Lita på" — gör Inställningar → Allmänt →
   VPN & enhetshantering → Lita på igen innan du öppnar appen. (Läxa 31/8.)

## Testa #22 Autostart (efter xcodegen + Team + bygge till telefonen)

Bevisas i bilen, inte i CI. Fyra kontroller, i ordning:

1. **Intentet finns.** Öppna Genvägar → + → sök "Halkvakt". Du ska se *Starta vakten* och
   *Stoppa vakten*. Saknas de: appen behöver ha startats en gång efter installation
   (iOS registrerar intents vid första körning) — öppna Halkvakt, stäng, sök igen.
2. **Siri.** Säg "Starta Halkvakt". Appen ska tändas och statusen bli VAKTEN PÅ.
3. **Automationen.** Följ guiden i Inställningar → Autostart i bilen. Viktigt: *Kör direkt*
   i steg 3 — annars frågar iOS varje gång och hela poängen faller.
4. **I bilen.** Lås telefonen, starta bilen. Inom några sekunder: Halkvakt tänds, vakten
   startar. Lägg telefonen i facket. Kör förbi en fartkamera — rösten ska tala med släckt
   skärm. Stäng av bilen: vakten ska stanna (automation 2).

Om steg 4 startar men rösten tystnar när skärmen släcks: platsbehörigheten är "Vid
användning". Inställningar → Halkvakt → Plats → *Alltid*.

## Genvägarna ska fungera perfekt — testprotokoll (#22)

Kör dem i ordning på telefonen. Varje rad har ett väntat utfall och vad det betyder om
det inte händer. Genvägar visar intentets svarstext som en liten banner högst upp
("Halkvakt vaktar.") — det är kvittot på att intentet faktiskt kördes.

**T1 · Intentet syns.** Genvägar → + → sök "Halkvakt". Väntat: *Starta vakten* och
*Stoppa vakten* i listan, utan att appen behöver öppnas. Om inte: intents registreras
vid installation — radera appen, installera igen, sök igen.

**T2 · Siri.** "Starta Halkvakt". Väntat: bannern "Halkvakt vaktar." + appen visar
VAKTEN PÅ. Säg det igen: "Vakten är redan igång." Om Siri inte hittar frasen: kolla att
appnamnet är exakt "Halkvakt" i telefonen (Inställningar → Allmänt → iPhone-lagring).

**T3 · Kör direkt.** Bygg automationen enligt guiden. Utlös den (koppla Bluetooth /
sätt Fokus Kör på manuellt / öppna Maps). Väntat: vakten startar UTAN att iOS frågar.
Om iOS frågar "Kör Starta vakten?": automationen står på *Fråga innan* — öppna den och
byt till *Kör direkt*. Det är det vanligaste felet, och det dödar hela poängen.

**T4 · Tyst start.** Ge Halkvakt platsen *Alltid* (Inställningar → Halkvakt → Plats).
Öppna Maps, låt automationen utlösa. Väntat: Maps ligger kvar på skärmen, bannern
"Halkvakt vaktar." blinkar till, rösten finns. Om Halkvakt tar över skärmen: platsen
är fortfarande *Vid användning* — det är väntat beteende där, men byt till Alltid.

**T5 · Låst telefon.** Lås telefonen, utlös automationen (Bluetooth/CarPlay/Fokus).
Väntat med Alltid: vakten startar utan att skärmen tänds. Med *Vid användning*: iOS
kan inte visa appen bakom låset ⇒ start uteblir eller iOS frågar. Det är Apples gräns,
inte vår — därför är Alltid rekommendationen i guiden.

**T6 · Stopp.** Kör automationen för Stoppa vakten (eller vänta en kvart stillastående).
Väntat: "Halkvakt vilar." och VAKTEN AV. Stoppet ska INTE tända appen.

**T7 · I bilen, på riktigt.** Telefonen i facket, bilen startar. Kör förbi en fartkamera.
Väntat: rösten talar med släckt skärm. Stäng av bilen, vänta en kvart: vakten av.

Fallerar T3 eller T4 är det inställningen, inte koden. Fallerar T1 eller T2 är det koden
— skicka skärmbild + Xcode-loggen, så rättar jag.
