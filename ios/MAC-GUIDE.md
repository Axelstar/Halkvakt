# MAC-GUIDEN — bygga Halkvakt för iPhone (Davids klicksteg)

Claude skriver all Swift-kod i Linux men bara en Mac kan BYGGA iOS-appar.
Din Mac är byggmaskinen; den här guiden är hela receptet. Ingen kodkunskap krävs.

## REDAN I DAG (medan du väntar på lönen)

**Davids Mac (verifierad 27/8): MacBook Air M1, macOS Sequoia 15.0.**
App Stores Xcode kräver nyare macOS ⇒ välj väg:

**Väg A (rekommenderad): uppdatera macOS först.**  → Systeminställningar →
Allmänt → Programuppdatering → installera stora uppdateringen (timmar; kör
över natten). KOLLA FÖRST: ~50 GB ledig disk (Om den här datorn → Mer info →
Lagring). Därefter: App Store → Xcode → Hämta (12–15 GB). Öppna Xcode en gång,
godkänn licensen, låt den installera "iOS components".

**Väg B (om A strular/trång disk): Xcode 16.2 på befintlig 15.0.**
developer.apple.com/download/all (vanligt Apple-ID) → "Xcode 16.2" → hämta
.xip → dubbelklicka (packar upp länge) → dra Xcode till Program → öppna en
gång, godkänn licens + iOS components. 16.2 bygger vår iOS 17-app utmärkt.

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
