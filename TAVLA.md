# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-09-02 av Claude — KÄLLBESLUTET taget (DECISIONS #60, Bengt + Axel): radarn in; cellmätningens v2-dom ren (26→60 %), pilotintaget olåst*

---

## 🔴 ATT GÖRA

### Beslutsgången
Roller och ägarskap: `docs/BESLUTSGANGEN.md` (31/8). Tavlan är sanningen — en plan som inte
står här finns inte. Kortregeln ersätter möten: allt som bestäms blir ett kort direkt.
- [ ] **Ge Bengt egna händer i koden** — `docs/BENGT-CLAUDE-KODEN.md`: Claude Pro + Claude
  Desktop mot Halkvakt-mappen, ingen terminal. Axel: skrivrättigheter till repot.
  Löser roten till 31/8 — han kan köra sina egna analyser i stället för att beskriva dem.

### AXELS NÄSTA STEG — i den här ordningen

**1. ~~Signeringshemligheten~~ ✅ LAGAD 2/9 (DECISIONS #58)** — rotorsak: bara HV_KEYSTORE_PASS
hade roterats 31/8, inte B64; paret hörde inte ihop och jks-filen fanns inte kvar. Ny keystore
skapad 2/9, båda hemligheterna från samma fil, signerad AAB 2,5 MB grön i CI.
✅ Filen uppladdad till iCloud Drive/Halkvakt-nycklar 2/9 (utrymmet var fullt, Axel köpte mer)
och anteckningen i Apple Passwords uppdaterad. Kortet HELT stängt.

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
- [ ] 🔑 **Fastställ trösklarna för skuggan** — ETT ORD räcker ("kör" som svar på Bengts
  strategimejl 1/9), eller justera värdena fritt i docs/TROSKLAR-SKUGGAN.md före första
  skuggkörningen (~mitten av oktober). Detaljkortet under "Axel — beslut att ta" nedan.
- [ ] Svara pappa på höstplanen — ja till TågRätt-företräde för DIN tid, ~1 h/vecka till Halkvakt
- [ ] Rollfördelningen: B2B = Bengt (ja) · Skyltfondsrundan: klartecken (v.36 börjar onsdag)
- [x] ~~Skinnet v3 (#24) iOS~~ ✅ BEVISAT på Axels telefon 31/8 19:20 — alla skärmar, ikonsetet,
  intro med kvitton. Går till Bengt som 0.3.3 efter Bodenresan.
- [ ] 🔨 **PÅGÅR (Claude, 2/9 ~15:00) — Skinnet v3 på Android** — samma tokens, fem ikoner som Compose-vektorer, två flikar.
- [ ] **Introduktionen i Claude Design** — enda skärmen som inte ritats om än.
- [ ] TestFlight intern (Bengt) + extern (kompisarna, Test Information → Submit for Review)
- [ ] Google Play Console — VÄNTA tills 12 står på väntelistan (4 idag); klockan startar vid köp

**Claude — nästa förenkling (DECISIONS #38):**
- [ ] **Live Activity — varningskortet i Dynamic Island och på låsskärmen** (Axel 31/8: "ska den
  ligga över Maps?"). Ingen app får rita över en annan; Live Activity är det Apple tillåter:
  gul rad "Vakten på · 42 min" under körning, blossar upp "▲ Halt väglag · 2,0 km" när rösten
  talar, synlig över kartan och på låst skärm. Bannern (#23) kvar som textvariant.
- [ ] **Startknapp på låsskärmen + i Kontrollcenter + åtgärdsknappen** — widget (iOS 17),
  Control (iOS 18), och en rad i guiden om Åtgärdsknapp → Genväg → Starta vakten (iPhone 15
  Pro+). Ett tryck, ingen Genvägar. DECISIONS #39.
- [ ] **Guiden med bilder + film** — skärmbild per steg (ringad knapp) inbakade i appen;
  15 s film per spår på kartsajten. Råmaterial: Axels inspelningar 31/8 (Inte alls), Bengt
  filmar CarPlay-spåret.

**Claude — i väntan på Macen:**
- [ ] Introduktionen på Android (spegel av iOS, DECISIONS #36) — efter att iOS-varianten testats
- [x] ~~#38a Broarna~~ ✅ BYGGT 31/8 kväll (DECISIONS #50): tre motorer, v18/v19, publicering,
  OSM-hämtare. "Frysrisk framöver — bro om N meter." VÄNTAR PÅ DATA: Overpass nere, bridges.yml
  försöker var 6:e timme. Rösten säger inget om broar förrän filen finns. Appen: 0.3.3.
- [ ] **#38b Stråket / skuggmotorn** — Bengts byggplan v3 (31/8) tidigarelägger segmentmotorn
  till november, i strikt skugga, dom i mars. AXELS BESLUT: sekvensering mot lanseringen.
  Claudes råd: börja med de tre delar som INTE kräver frost, låt skuggkörningen vänta på snö.
  - [x] ~~**(1) Tröskeldokumentet**~~ ✅ KLART 1/9 (DECISIONS #52): docs/TROSKLAR-SKUGGAN.md
    — tre grindar (A offsetmodellen, B skuggdriften, C domens giltighet), daterat före all
    skuggkod. Bengt fällde värdena efter genomgång i chatten. 🔓 Hårda villkoret uppfyllt —
    (2) och (3) olåsta. Grind A prövas på arkivet INNAN november: ett gratis tidigt nej.
  - [x] ~~**(2) Ankarklippningen**~~ ✅ KÖRD 1/9 (Bengts fråga avslöjade att morgonens
    kamerafil ALDRIG nått CDN — TRV 400 i varje varv, fail-soft dolde det; rotorsak
    "Invalid query attribute Camera.RoadNumber", lagad, 744 kameror live i körning
    33485863812). MÄTRESULTAT: kamerorna ger nästan ingen ny ankartäthet — 738/744
    står exakt vid en väderstation (VViS). Nationellt 6,8→6,7 km median, >20 km-andel
    4,7→4,6 %; Norrland oförändrat 9,2 km / 12,6 %. Kamerornas värde är BILDFACIT,
    inte täckning. Knappen ankaranalys.yml aktiveras när grenen når main.
  - [ ] **(3) Offsetmodellen mot arkivdata** 🔓 — vi har data sedan 24/8. Tunt, men nog för
    att se om matematiken alls håller innan tre veckor läggs på den.
    SKRIPTET BYGGT 1/9: publish/grind-a.ts + knappen Actions → grind-a (leave-one-out,
    A1–A3 mot TROSKLAR-SKUGGAN, självtest med känd sanning grönt).
    RÖKPROVET KÖRT 1/9 (grind-a #1, Bengts knapptryck): 43 punkter — felet växer med
    ankaravståndet precis som teorin säger (0,63 °C vid 0–7 km → 5,39 °C bortom 20 km).
    Nära ankare under A1-tröskeln redan på sämsta möjliga data; för tunt för dom
    (minsta underlag ≥ 500 punkter infört i dokumentet). AUTOMATISK från 1/9: körs varje
    söndagsmorgon, resultatet på körningens Summary-sida — läses i Bengts söndagsrutin,
    ingen behöver minnas oktober. Underlagsvakt: grön-men-tom mätning (<100 stationer)
    blir rött jobb — larmvägen HELT BEVISAD 1/9 (avsiktlig dagar=0-körning → rött →
    mejlet "Alla jobb har misslyckats" framme hos Bengt, skärmbildskvitto). 🔑 Skarp
    prövning på vinterdata (≥ 500 punkter) före november.
  - [ ] **(3b) Ankarbreddningen** (Bengts fråga 1/9: "vad krymper avståndet?") —
    tre kandidater, en mätt, en byggd, en väntar:
    · Grannländerna: FI MÄTT 1/9 (Norrland >20 km 12,6→11,5 %, gratis — stationerna
      finns redan i vader.geojson); NO mäts samma dag Vegvesen-kontot fungerar; DK = 0.
    · SMHI-luftankare: PROVET BYGGT + KÖRT 1/9 (Bengts order): scripts/smhi-prov.ts +
      knappen Actions → smhi-prov (235 SMHI-stationer, samma leave-one-out som grind-a,
      självtest där ett fjärran-VViS räddas av luftankare). Första signalen på tunna
      augustidata (34 punkter, INGEN dom): stör inte där VViS är tätt (2,56→2,50 °C),
      och i >20 km-bandet 5,83→4,37 °C plus 4 nya punkter à 1,57 °C som basen inte
      når alls. 🔑 Omkörning på vinterdata; värderas i tröskeldokumentet.
    · Höjden: PROVET BYGGT + KÖRT 1/9 kväll (Bengts order): scripts/hojd-prov.ts +
      knappen Actions → hojd-prov (EU-DEM-höjder, tre varianter RÅ / RÅ+HÖJD /
      OFFSET=taket; självtestet fällde ett teckenfel före push). Två fynd: (1) STARKT,
      3 455 par: empirisk lapse 0,71 °C/100 m (standard 0,65) — höjden bär en äkta del
      av parsystematiken; (2) ÄRLIGT, 40 augustipunkter: rå+höjd 8,36 ≈ rå 8,36 mot
      offsetens 2,50 °C — i utstrålningslägen räcker höjden INTE ensam, lärda offsets
      bär stationskaraktären. 🔑 Omkörning på vinterdata avgör.
    · GIS-svansen (dalgångar/skuggning): rörs inte förrän vinterns höjdprov motiverar den.
  - [ ] (4) Skuggkörningen — startar när det finns halka att skugga (~mitten av oktober,
    Skåne). I augusti räknar den "inte halt" på "inte halt".
  - [ ] **Skuggmotorns prognoskolumn måste buntas ur engine/src** som resten (läxan 31/8):
    en handklistrad prognoskolumn driver isär på ett dygn.
- [ ] **Kameravarningen i fel riktning** — tre varv 2/9: #55 tolerans 100°→60°, #57
  riktningen vänd 180° (Trafikverkets Bearing = dit kameran TITTAR), #59 verifierad mot
  Öjersjö-kameran ID 14102020. Koden är nu bevisat rätt i alla tre motorerna.
  0.3.5 (8) uppladdad 14:42 — första bygget med grönt kontrakt (#60).
  🔑 BEVIS SAKNAS ÄN: Bengt kör 0.3.5 och noterar KLOCKSLAG + PLATS per larm och per
  kamera utan larm. Beskrivningar räcker inte, vi har gissat tre gånger.
- [ ] #31 Trafikverksbevakningen (litet, olåst, kan bevisas härifrån)

- [x] ~~Testinstruktion till Bengt~~ ✅ docs/TEST-BENGT-0.3.2.md (31/8)
- [ ] **Bodenresan 1/9** — docs/TEST-BENGT-BODEN.md: E4 hela vägen = skuggflottans väg.
  Efteråt: Bengts logg bredvid testbilarnas rapport för samma dag = första riktiga facit.
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
- [ ] **Fastställ trösklarna för skuggan** — docs/TROSKLAR-SKUGGAN.md (DECISIONS #52),
  Bengts metodvärden fällda 1/9. Domen i mars avgör vad rösten får säga = din kolumn.
  Strategimejlet med länken SKICKAT 1/9 (Bengt → axel.lagerlof@, "Meddelandet har
  skickats"-kvitto). 🔑 Ditt ja (eller justerade värden), före första skuggkörningen.
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
- [ ] **Vegvesen DATEX-konto** — BEGÄRT 31/8 15:43. När svaret kommer: VEGVESEN_USER +
  VEGVESEN_PASS i GitHub Secrets ⇒ Claude skriver parsern och Norge kör. Allt annat är
  förberett (#35). Kräver de fast IP: proxy-beslut till Axel.
  Gör i samma svep som PRV + domänen.
- [x] ~~Mejl till Vejdirektoratet om VejVejr~~ ✅ SKICKAT 31/8 16:05 via kontaktformuläret
  (ämne "Forespørgsel om en sag eller et projekt" — vinterdriftens formulär var stängt).
  Väntar svar. Tills dess: grästemp i arkivet, rösten tyst om frysrisk i DK (#45).
- [ ] **Danmark — NAP-nyckel** (gratis registrering) före produktion: trafikkort-flödet vi
  läser nu är publikt men odokumenterat.

### Axel — därefter
- [ ] **Tolv testare till Play-perioden** — Axels åtagande 31/8: "hittar dem utan problem".
  Väntelisterutan på kartan borttagen på hans beslut. Kvar i `docs/REKRYTERING.md` om det behövs.
- [ ] Domänen halkvakt.se (vilande beslut)
- [ ] Fysisk Android-testenhet (pappas telefon? begagnad?)

### Bengt
- [ ] Läsa SYSTEM.md mot koden månadsvis (första: september)
- [ ] Samtal med Axel: sensortrappan — tidsättning av steg 2 (våren 2027?)
- [ ] 💼 **B2B: skolpaketet som produkt** — per-elev-moment i körkortspaketen; STR som skalkanal; säljs våren 2027 med halkbanedata *(Axels idé, Bengts spår)*
- [ ] 📞 **Skyltfondsrundan** (efter Axels klartecken): fonden + trafikövningsplats v.36 → avsiktsförklaringar 25/9 → SKICKA 28/9

### Claude — olåst
- [ ] 📡 **#43 Radarn som infrastruktur** (Bengts beställning 2/9, efter cellmätningens
  dom) — EN källa, SEX nyttor: vattenplaningens trigger (#42), blixthalkans pipeline
  (#16), marsdomens orsaksklassning, miss-/skuggfacit, vinterns snöbyar, Norden.
  PLAN: docs/RADAR-PLAN.md — observation inte prognos (#25-lagen), grids samplas mot
  skelettet och händelsefiltreras (fritier är lag), stationerna blir kalibrering.
  ✅ Steg 1 REKOGNOSERING KÖRD 2/9 (körning 33616309645, resultat i planens §5):
  SMHI-kompositen öppen utan nyckel, 5-min-kadens, 261 kB/fil (~77 MB rå/dygn, samplas
  — lagras aldrig), HDF5 + tif-spår. FJÄLLFYNDET: 26/26 ruttpunkter täckta — E10
  Kiruna och E14 Storlien radar_coverage:ok (nordisk komposit slår nationell); enda
  strukturella luckan är Tärnaby. Licenser CC BY/NLOD, gratis. DOMEN: inget stoppar
  källbeslutet. 🔑 Steg 2 KÄLLBESLUT: DECISIONS-rad Axel + Bengt — underlaget är
  komplett. ✅ Steg 2 KÄLLBESLUTET TAGET 2/9: DECISIONS #60 — Bengt + Axel (Axels ok
  via Bengt i chatten; Axel kontrasignerar genom att bocka här). 🔓 Steg 3 pilotintag
  i skugga OLÅST — byggs på Bengts ord, bevisas med cellmätning v3 mot radar +
  uppmätt fritier efter en vecka. Steg 4 nyttjarna i kortens egen takt. Blind fläck
  kvarstår: frosten ser radarn aldrig.
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
- [ ] 🌧️ **#42 Vattenplaningsvarningen** — ÄGARE: BENGT (issue #15, 1/9) — regnintensitet (VViS RainSum,
  ny ingestkolumn — vi lagrar idag bara regn ja/nej) × spårdjupslager (Trafikverkets
  vägytemätning via Lastkajen; licens/färskhet kollas först) × fartgrind ≥ ~70 km/h
  på enheten. Punktkälla ⇒ "framöver"-fras, aldrig avstånd. Ordning enligt huslagen:
  eget tröskeldokument FÖRE kod, sedan skugga — kan mätas i höstregn redan i september,
  behöver inte vänta på vintern. Facit: situation_archive (stoppade fordon/olyckor i
  regnväder). FÖRSTUDIE: docs/VATTENPLANING-ANALYS.md (1/9, granskning + körschema §7–8).
  ✅ **Steg 0a KLART 2/9** (Axels ja via Bengt): RainSum bevisad 89 % täckning FÖRE bygget
  (regn-bevis #1), rain_sum_mm + snow_wateq_mm i arkivet, slutbevis 658 stationer med
  mängd (regn-bevis #3). Facit tickar från nu.
  ✅ **Steg 0b KLAR 2/9, v2-dom** (cell-matning #2, 84 341 händelser, givarelösa
  uteslutna): artefakten bekräftad och borta — kurvan nu rent monoton 26 % (0–5 km)
  → 36 → 41 → 47 → 52 → 60 % (30–50 km). Redan vid 5–10 km är över en tredjedel av
  regnhändelserna enstations. DOMEN STÅR: stationstrigger ensam räcker inte —
  radarspåret valt (DECISIONS #60), stationerna blir kalibrering + fartgrind.
  *(nyckel för röst: Axels ja — rösttext, plats i A-skalan, ordning mot #15/#16)*

---

## 🟡 GÖRA (pågår just nu)


---

## 🟢 KLART (senaste vinsterna)

- [x] 📏 **TRÖSKELDOKUMENTET — mars-domens måttstock, skriven FÖRE all skuggkod** (1/9,
  Bengt + Claude, DECISIONS #52): docs/TROSKLAR-SKUGGAN.md med tre grindar (A offset-
  modellen, B skuggdriften, C domens giltighet) — #51:s hårda villkor uppfyllt, skugg-
  spårets steg 2–3 olåsta. Samma dag: grind A-mätningen byggd och automatisk varje söndag,
  larmvägen bevisad hela kedjan (avsiktligt rött jobb → mejl framme hos Bengt), rökprovet
  kört (felgradienten följer teorin), strategimejlet med länken hos Axel. Kvar hos Axel:
  fastställandet (eget kort under hans beslut).

- [x] ✅ **SJÄLVVÄCKNINGEN FUNGERAR I FÄLT** (31/8 15:51, Bengts telefon, första försöket):
  0.3.2 startade vakten själv utan att han rörde telefonen. DECISIONS #40 bevisat samma dag
  det byggdes. Kvar i morgon: rösten i CarPlay, bannern, självstoppet.
- [x] 🇩🇰 **DANSKA TESTBILARNA KÖR** (31/8 kväll): DMI + trafikkort, 20 rutter, cron, kartan.
  Grästemp som frysproxy — beslut till Axel (#45). Norge förberett, väntar på Vegvesen.
- [x] 🇫🇮 **FINSKA TESTBILARNA KÖR** (31/8 kväll): tre rutter var 30:e min mot finsk snapshot,
  SE/FI-växel på testbilarna.html. Bonusfynd: skuggmotorn körde gammal motor — nu buntad
  ur engine/src med CI-vakt (DECISIONS #43).
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

