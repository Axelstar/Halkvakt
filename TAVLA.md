# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-08-31 kväll av Claude — 14 commits idag; toppen omskriven som Axels checklista*

---

## 🔴 ATT GÖRA

### AXELS NÄSTA STEG — i den här ordningen

**1. Fem minuter, var som helst: signeringshemligheten** 🔴
CI kan inte signera Android-bygget: `keystore password was incorrect`. Gick sönder vid
nyckelrotationen 08:00 (sista gröna bygget 30/8 15:07), inte av kod. GitHub → Settings →
Secrets and variables → Actions → sätt om **HV_KEYSTORE_PASS** (och HV_KEYSTORE_B64) från
SAMMA jks som ligger i iCloud. Blockerar all Play-uppladdning tills det är gjort.

**2. ~~Vid Macen: till TestFlight~~ ✅ 0.3.1 och 0.3.2 uppladdade 31/8 em.**
Kvar: lägg 0.3.2 i gruppen i App Store Connect → skicka Bengt testinstruktionen.

**3. På telefonen (efter bygget): fyra kontroller i `ios/MAC-GUIDE.md`**
Genvägar hittar "Starta vakten" · Siri "Starta Halkvakt" · automationen med Kör direkt ·
"Senast sagt" står kvar dagen efter. Ge Halkvakt platsen **Alltid** — annars blinkar appen
förbi vid varje autostart.

**4. I bilen:** Fokus Kör + kartappen som utlösare (du har ingen CarPlay — se PRODUKTBOK
"Autostart i bilen"). Kör förbi en fartkamera med Maps framme: bannern i 8 s, rösten talar
med släckt skärm, vakten stannar när du stänger av.

**5. Beslut som väntar på dig** (rekommendationer i chatten 31/8, DECISIONS #30–#34)
- [ ] Svara pappa på höstplanen — ja till TågRätt-företräde för DIN tid, ~1 h/vecka till Halkvakt
- [ ] Rollfördelningen: B2B = Bengt (ja) · Skyltfondsrundan: klartecken (v.36 börjar onsdag)
- [ ] Exportera Claude Design-skinnet till `docs/design/` ⇒ resten av #24 öppnas
- [ ] TestFlight intern (Bengt) + extern (kompisarna, Test Information → Submit for Review)
- [ ] Google Play Console — VÄNTA tills 12 står på väntelistan (4 idag); klockan startar vid köp

**Claude — nästa förenkling (DECISIONS #38):**
- [ ] **Startknapp på låsskärmen + i Kontrollcenter + åtgärdsknappen** — widget (iOS 17),
  Control (iOS 18), och en rad i guiden om Åtgärdsknapp → Genväg → Starta vakten (iPhone 15
  Pro+). Ett tryck, ingen Genvägar. DECISIONS #39.
- [ ] **Guiden med bilder + film** — skärmbild per steg (ringad knapp) inbakade i appen;
  15 s film per spår på kartsajten. Råmaterial: Axels inspelningar 31/8 (Inte alls), Bengt
  filmar CarPlay-spåret.

**Claude — i väntan på Macen:**
- [ ] Introduktionen på Android (spegel av iOS, DECISIONS #36) — efter att iOS-varianten testats
- [ ] #31 Trafikverksbevakningen (litet, olåst, kan bevisas härifrån)
- [ ] **#34 Finska skuggrutter** — arkivet är LIVE (31/8 kväll, 526 stationer var 30:e min).
  Kvar: tre rutter i skuggmotorn så fejkresorna kör, + Vegvesen-koll för Norge.
- [x] ~~Testinstruktion till Bengt~~ ✅ docs/TEST-BENGT-0.3.2.md (31/8) — skicka länken ikväll
- [ ] Välkomsttext + testinstruktion till kompisarna
- [ ] Play: uppladdningsguide för den CI-signerade AAB:n så fort hemligheten är satt
- [ ] Fotostudion tag 2 — facit ur CI + produktboken
- [ ] Vid kompilatorfel från Macen: rätta → push → nytt varv

**Skrivet idag, väntar på bevis i din hand:**
- [ ] **#22 autostart** — T1+T2 GRÖNA på Axels telefon 31/8 (intentet syns, Siri startar).
  Automationen skapad, Fokus Kör på Automatiskt. Kvar: T3–T7 i bilen. Android fanns.
- [ ] **#23 heads-up** — bannern över kartappen, båda plattformarna
- [ ] **#24 skinnet** — DELVIS: "Senast sagt" på hemskärmen, båda. Resten bakom designexport.
- [ ] **Introduktionen** (iOS) — fyra sidor vid första start: löftet, platsen, bannern, autostart.
  Kontroll: radera appen → installera → intron ska komma först; "Visa igen" i Inställningar.

*(Kronjuvelerna, Xcode 26.1 och Apple Developer är avklarade och flyttade till KLART.
Play-kontot lever kvar i IDAG-listan ovan — det är den enda köp-punkten som återstår.)*

### Axel — beslut att ta
- [ ] **Helgsamtalet med pappa — nu fyra punkter:** roller (B2B=Bengt?), föreningen, klartecken ringrundan, OCH intäktsmodellen (#27: din viljeinriktning → hans utformning)
- [ ] **Skyltfonden-paketet (före 1/10):** (a) klartecken till pappas ringrunda (startar v.36!), (b) sökande: pappa privat eller ideell förening?, (c) rollfördelningen — allt hänger ihop. Underlag: `docs/FINANSIERING.md`
- [ ] **Rollfördelningen**: efterfrågan/affärsmodell/B2B = Bengts ansvar? (hans förslag; vid ja uppdateras PLAN)
- [ ] **#21 Anonym puls + feedback-knapp** — rör "samlar in: ingenting"-löftet; Claudes råd: paketera med sensorbeslutet våren 2027

### Axel — hösten (brainstorm 31/8)
- [ ] **Skydda namnet:** varumärket Halkvakt hos PRV + domänen halkvakt.se. Enda juridiska
  muren som finns i branschen; arkivet och relationerna är resten av försvaret.
- [ ] **Betalvilja mäts i mars, inte gissas i augusti:** en fråga i appen ("N varningar i
  vinter — skulle du betala X för nästa?"). Ja/nej, inget insamlat utom räkningen. Vinterpass
  per säsong är kandidatmodellen; B2B (hemtjänst, försäkring, åkerier) är taket.
- [ ] **Norden efter facit:** Finland LIVE i arkivet (31/8). Norge sedan, Danmark sist.
  Tidigast vintern 2027/28 som produkt. Nordiskt namn vid det laget (Nordic RoadSafe, #1).
- [ ] **Registrera Vegvesen DATEX-konto** (gratis, personligt: namn + e-post) → användarnamn/
  lösenord till GitHub Secrets ⇒ Claude bygger det norska skuggarkivet som det finska.
  Danmark: Vejdirektoratet delvis nyckelfritt, API-nyckel gratis — väntar, svagast vintervärde.
  Gör i samma svep som PRV + domänen.

### Axel — därefter
- [ ] ⚠️ **Rekrytera testare — mätt läge 31/8: väntelistan har 4 namn.** Google Play kräver
  minst 12 testare som är med i 14 SAMMANHÄNGANDE dygn innan produktion (DECISIONS #9), och
  klockan startar när Play-kontot betalas. Fyra räcker inte. Mål 20 (`docs/REKRYTERING.md`).
  Detta är den enda punkten på tavlan som kan skjuta lanseringen framåt utan att något går
  sönder tekniskt — inlägg A ligger färdigt att posta.
- [ ] Domänen halkvakt.se (vilande beslut)
- [ ] Fysisk Android-testenhet (pappas telefon? begagnad?)

### Bengt
- [ ] Läsa SYSTEM.md mot koden månadsvis (första: september)
- [ ] Samtal med Axel: sensortrappan — tidsättning av steg 2 (våren 2027?)
- [ ] 💼 **B2B: skolpaketet som produkt** — per-elev-moment i körkortspaketen; STR som skalkanal; säljs våren 2027 med halkbanedata *(Axels idé, Bengts spår)*
- [ ] 📞 **Skyltfondsrundan** (efter Axels klartecken): fonden + trafikövningsplats v.36 → avsiktsförklaringar 25/9 → SKICKA 28/9

### Claude — olåst
- [ ] **#32 Hindren in i rösten** — vi har aldrig skeppat annat än olyckor trots att
  DECISIONS #5 sade "olyckor + hinder". Kräver ny HazardKind + egen röstfras + Axels
  beslut om vad rösten säger. Bäst kandidat: **djur på vägbanan** (173 på en vecka, med
  RIKTIG position — vida bättre än polisens länscentrum som vi underkände i #13).
- [ ] **#31 Bevakning av Trafikverkets nyheter** (Bengts issue #2, 29/8) — API-ändringar
  och avvecklingar ska fångas innan de bryter ingest. Litet jobb: RSS/changelog-koll i
  healthchecken eller veckojobb som mejlar.
- [ ] **Varvloggen ikapp:** STATUS.md:s sessionslogg slutar 2026-08-25 och "Current state"
  står kvar på 2026-08-24 — sex dygns arbete (Android-release, iOS-bygget, skuggflottan,
  Apple-kontot, uppladdningen) är bokfört i commits och på tavlan men inte i djuplagret.
  Bryter dokumentationsregeln. *(Delvis åtgärdad i detta varv — resten nästa.)*

### Claude — låst (väntar på nyckel)
- [ ] **#27 asc-CLI:t** — enkommandos-TestFlight + CI-hämtad testarfeedback.
  🔓 **Halvöppnad 31/8:** Apple-kontot finns. Kvarvarande nyckel = en ASC API-nyckel
  som Axel skapar i App Store Connect → Users and Access → Integrations. Säg till så
  skriver jag stegen.
- [ ] Butiksuppladdning + Data safety-inklistring *(låst: Play-kontot)*
- [x] ~~TestFlight-UPPLADDNING~~ ✅ KLART 31/8 — 0.3.0 (3) inne hos Apple.
  Kvar (Axels hand, inte låst): testarinbjudningarna, internt + externt
- [x] ~~Skarp support vid första Mac-bygget~~ ✅ KLART 29/8 — appen körde på Axels iPhone
  två dygn före schemat
- [ ] 🎨 **DESIGNLYFTET** — startar samma dag releasen är inne; byggs under 14-dagarstestet, rullas till testarna som v0.3.1:
  - [ ] **#24 Skinnet** (Claude Design: hemskärmens farokort, "senast sagt", typografin)
  - [ ] **#22 Bluetooth-autostart** (vakten startar när bilen kopplar)
  - [ ] **#23 Heads-up över Google Maps + "Testa rösten"** *(nyckel: releasen inskickad)*
- [ ] **#25 Halkbaneläget** *(låst: halkbanans avsiktsförklaring)*
- [ ] **#26 Skolpaketet** (QR-blad, manus, checklista) *(låst: trafikskolans avsiktsförklaring)*
- [ ] **#15 Kö-slutsmotorn** (TrafficFlow) *(låst: efter release — uppdatering 1)*
- [ ] **#16 Blixthalke-prognos** (MET Nowcast) *(låst: efter kö-slut — uppdatering 2)*

---

## 🟡 GÖRA (pågår just nu)


---

## 🟢 KLART (senaste vinsterna)

- [x] 🇫🇮 **FINSKT SKUGGARKIV LIVE** (31/8 kväll): schema fi, Fintraffic var 30:e min, 526
  stationer + trafikmeddelanden, isolerat från Sverige. Facit börjar tickas innan produkten finns.
- [x] 🚀 **0.3.2 (5) UPPLADDAT** (31/8 ~14:50) — hela dagens batch: olyckslyftet, heads-up,
  senast sagt, introduktionen, Siri, självstopp, självväckning + parkeringsstaket. Bengt
  testar ikväll med CarPlay (docs/TEST-BENGT-0.3.2.md). 0.3.1 (4) laddades upp strax före
  med samma kod minus självväckningen.

- [x] **#33 Arkivbordet LIVE** (31/8): situation_archive tar emot vinterfacit från båda
  ingestvägarna, missmätningen läser det, bruset utestängt, fött låst. Djur på vägbanan och
  stoppade fordon sparas från idag — #32 får underlag innan beslutet.

- [x] 🔒 **#30 RLS-LÅSET** (31/8, Bengts issue #3): anon-nyckeln kunde läsa 8 arkivtabeller
  och SKRIVA i dem (PATCH 204). Nu dubbellåst — RLS + REVOKE — på alla elva. Bevisat: 401
  överallt, väntelistan 201, pipelinen grön. DECISIONS #32.
- [x] **Gravstensläckan tätad + städad** (31/8): raderingar är UPDATE, aldrig INSERT, i båda
  ingestvägarna; edge-funktionen deployad; 4 587 gravstenar exporterade och raderade.
  Tabellen: 308 rader, alla olyckor.
- [x] **#28 tröskeln avgjord: 5** (31/8) — tvåsteget bara vid "Mycket stor påverkan".
  v17 bevisar att 4 är lindrig. DECISIONS #30a.

- [x] **Kronjuvelerna säkrade** (31/8): ny upload-nyckel i Lagerlöf Labs namn, lösenord i Apples Lösenord-app, jks i iCloud Drive/Halkvakt-nycklar, CI-secrets roterade
- [x] 🚀 **HALKVAKT 0.3.0 (3) UPPLADDAT TILL APP STORE CONNECT** (mån 31/8 ~10:10) — 90 min från
  kontoköp till inlämnat bygge. Varv som krävdes: team-cache (omstart), version 1.0→0.3.0
  (plist-koppling), iPad-orienteringar (iPhone-only). Nästa: Apples behandling → TestFlight.
- [x] **APPLE DEVELOPER KÖPT** (mån 31/8 09:37, 999 kr, order W1845082767) — via WEBBEN
  (appen krävde körkort; webbvägen ställde ingen ID-fråga = läxa för nästa app).
  AKTIVERAT 09:55 (18 min efter köpet — webbvägen levererar). Förberett: iOS-appikon (spegel av Android), export­-
  compliance-nyckel, TestFlight-guide i MAC-GUIDE. Utgivarnamn BESLUTAT: Lagerlöf Labs (DECISIONS #29).
- [x] **BENGT UPPKOPPLAD** (30/8, live under pappasamtalet): Claude-appen installerad på
  Axelstar-kontot (All repositories ⇒ täcker även framtida repon), Bengts GitHub-koppling
  omkopplad, läs-testet mot docs/VALKOMMEN-BENGT.md godkänt. 404-gåtan stängd —
  projektet har nu två uppkopplade Lagerlöfar.
- [x] **SKUGGFLOTTAN 20 BILAR + RAPPORTSIDAN** (Axels idé 29/8): skuggmotorn utökad 3→20 rutter
  över hela Sverige (E4 i sex etapper, E6, E10 Kiruna, E14 fjället, E18, Rv40, Rv70), rotation
  3 rutter/varv (CPU-taket), fotobudget 5/varv. Publik rapportsida visar allt bilarna "hört":
  https://axelstar.github.io/halkvakt-karta/testbilarna.html — Norrlandsbilen larmade
  på första varvet (E4 Umeå→Luleå, 2 varningar)
- [x] 🏆 **HALKVAKT KÖR PÅ iOS** — första Mac-bygget genomfört lördag 29/8 18:04, två dygn före schemat: Xcode 26.1-verkstad från noll, EN byggfix (Swift-typning), appen live på Axels iPhone med färsk snapshot ("väglag 17:37" = åldersvakten + pulsklockan i drift). Kvar till måndag: bara konton + TestFlight
- [x] **macOS 15.7.9 installerat** på Axels MacBook Air (skärmbildskvitto 29/8 17:00) — Xcode 26.1-vägen öppen
- [x] **Pipelinen räddad** — GitHub-cron svälte publiceringen (5 h-stopp, 13 h-hål uppmätta); Supabase-pulsklockan trycker nu på dispatch-knapparna (*/30 + timvis). Vilt VERIFIERAT live på CDN (2 st i wildlife-arrayen)
- [x] **Healthcheckens koppel lagat** — larmade rätt men `| tee` åt exit-koden; pipefail på ⇒ rött jobb ⇒ mejl. Läxa: prova larmvägen, inte bara vakten
- [x] **📖 PRODUKTBOKEN** (`docs/PRODUKTBOK.md`) — produkten genom användarens ögon: skärmbilder, exakta röstfraser, två flödesdiagram; levande dokument med egen regel i protokollet
- [x] **#19 Missmätningsskriptet** — arkivhändelser × rekonstruerade hazards × riktiga motorn; träffar/missar per vecka; augustikörning verifierad (0 händelser = rent); knapp: Actions → "missar"
- [x] **#20 Skuggmotorn LIVE** — var 30:e min: motorn körs mot tre Skånerutter, loggar till shadow_log, arkiverar väglagskamerabild vid varning (facit-hinken). Provkört: 1 955 fixar E22, ärlig augustinolla
- [x] **#17 Vilt in i snapshoten** — polisen_events (48 h, med position) → wildlife-array → alla tre parsrar; TS-prov + bakåtkompatibilitet; motorbeteendet var redan vektorbevisat (v13)
- [x] **Bengts granskning II bokförd** — arkivlagret = repots styrka; prognosfrihet nu dokumenterat val (#25); kamerafacit+skuggmotor = #20; retention löses löftesrent via Play-statistiken
- [x] **Tavelregeln** inristad i CLAUDE.md — varje varv slutar med tavelsynk
- [x] **Bengt fullt ombord** — konto `895845` bekräftat i praktiken: committar dokument, granskar kod på radnivå (åldersvakts-fyndet!)
- [x] **Åldersvakten** (Bengts granskning): appen läser generated_at, filtrerar gammalt väglag, säger till EN gång — Android + iOS + prov
- [x] **docs/SYSTEM.md** — systembeskrivningen med "vad systemet inte gör" + månadsdisciplin

- [x] **Android-appen tekniskt släppfärdig** — v0.3.0, signerad AAB 2,55 MB byggs i CI varje push
- [x] **iOS-appen skriven** — SwiftUI-spegel av Android, väntar på första Mac-bygget
- [x] Butiksmaterial klart: texter, feature graphic, ikon, skärmdumpar (fotostudion)
- [x] Data safety-svaren förskrivna (`docs/PLAY-DATASAFETY.md`)
- [x] Integritetspolicyn live + länkad överallt
- [x] Signeringsnyckeln skapad, krypterad i CI + Axels kopia levererad
- [x] Pappa collaborator med Write + välkomstdokument
- [x] Pappas synergianalys bokförd + **beslut: v1 lanseras utan datainsamling** — sensortrappan = strategi, inte MVP (Axel 28/8)
- [x] Kö-slut beslutad som uppdatering 1 (TrafficFlow verifierad 43 s färsk)
- [x] Mobilvideo 720p-fixen på sajten
- [x] Presskit + livemotor härdad + webbåldersvakt

---

*Djupare detaljer: BACKLOG.md (teknisk kö) · STATUS.md (varvlogg) · DECISIONS.md (vägval).
Tavlan är människornas lager ovanpå dem.*

