# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-09-04 kväll av Claude (webben) — grind V-A byggd (kort #42 steg 3): regntröskeln faller ur mätningen, självtest grönt*

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
- [x] 🔑 ~~Fastställ trösklarna för skuggan~~ ✅ FASTSTÄLLT 2/9 — Axels "kör" relayerat
  av Bengt i chatten (DECISIONS #61). Kontrasignera genom att låta bocken stå; vill du
  ändå justera ett värde går det fram till första skuggkörningen (~mitten av oktober).
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
    inte täckning. Knappen ankaranalys.yml LIVE på main. Fyndet bokfört som DECISIONS #55
    2/9 (terminalsessionen reproducerade siffrorna oberoende med scripts/ankaranalys.ts —
    två verktyg, samma resultat). Healthchecken vaktar nu kamerafilen på CDN
    (finns/≥500 kameror/≤7 dygn) — fail-soft-läxan från TRV-400-episoden.
  - [ ] **(3) Offsetmodellen mot arkivdata** 🔓 — vi har data sedan 24/8. Tunt, men nog för
    att se om matematiken alls håller innan tre veckor läggs på den.
    SKRIPTET BYGGT 1/9: publish/grind-a.ts + knappen Actions → grind-a (leave-one-out,
    A1–A3 mot TROSKLAR-SKUGGAN, självtest med känd sanning grönt).
    RÖKPROVET KÖRT 1/9 (grind-a #1, Bengts knapptryck): 43 punkter — felet växer med
    ankaravståndet precis som teorin säger (0,63 °C vid 0–7 km → 5,39 °C bortom 20 km).
    Nära ankare under A1-tröskeln redan på sämsta möjliga data; för tunt för dom
    (minsta underlag ≥ 500 punkter infört i dokumentet). AUTOMATISK: körs varje MÅNDAG
    05:40 (skriptsammanslagningen #54 flyttade dagen), resultatet på körningens
    Summary-sida. Domspärr i skriptet: under 500 punkter/20 stationer skrivs "—", ingen
    dom går att läsa av. Underlagsvakt: grön-men-tom mätning (<100 stationer) blir rött
    jobb — larmvägen HELT BEVISAD 1/9 (avsiktlig dagar=0-körning → rött → mejlet "Alla
    jobb har misslyckats" framme hos Bengt, skärmbildskvitto). OBS 2/9: workflow-
    omskrivningen tappade `shell: bash` ⇒ `| tee` åt exit-koden igen (tee-läxan #26,
    larmvägen avväpnad) — LAGAD i terminalsessionens tavelsynk samma kväll. 🔑 Skarp
    prövning på vinterdata (≥ 500 punkter) före november.
  - [ ] **(3b) Ankarbreddningen** (Bengts fråga 1/9: "vad krymper avståndet?") —
    tre kandidater, en mätt, en byggd, en väntar:
    · Grannländerna: FI MÄTT 1/9 (Norrland >20 km 12,6→11,5 %, gratis — stationerna
      finns redan i vader.geojson); NO mäts samma dag Vegvesen-kontot fungerar; DK = 0.
    · **Frost-ankare (NO)** ✅ KÖRT 2/9 kväll (DECISIONS #60): Bengt registrerade nyckeln,
      rekognosering + prov byggda och körda mot levande API samma kväll (knappar:
      frost-rekognosering, frost-prov). TRE FYND: (a) Vegvesen bor i Frost — 461 aktiva
      vägstationer med lufttemp, "E10 BJØRNFJELL" 1 km från Riksgränsen, dataprov 8,6 °C;
      norskt luftarkiv möjligt UTAN DATEX. (b) Yttemp kräver ändå DATEX (404 på serierna).
      (c) Svenska Norrlandsluckan RUBBAS INTE (9,1 km / 11,5 % i alla påbyggnadssteg) —
      luckan är INLANDS, inte vid gränsen; kvarvarande spår är SMHI+höjd eller felkartan.
      *(Bengts beställning 2/9, terminalsessionen)*
    · SMHI-luftankare: PROVET BYGGT + KÖRT 1/9 (Bengts order): scripts/smhi-prov.ts +
      knappen Actions → smhi-prov (235 SMHI-stationer, samma leave-one-out som grind-a,
      självtest där ett fjärran-VViS räddas av luftankare). Första signalen på tunna
      augustidata (34 punkter, INGEN dom): stör inte där VViS är tätt (2,56→2,50 °C),
      och i >20 km-bandet 5,83→4,37 °C plus 4 nya punkter à 1,57 °C som basen inte
      når alls. SCHEMALAGD från 2/9 (Bengts order): måndagar 06:00, 20 min efter grind-a
      — båda vinterkurvorna växer av sig själva, läses i samma rutin. 🔑 Omkörning på
      vinterdata; värderas i tröskeldokumentet.
    · Höjden: PROVET BYGGT + KÖRT 1/9 kväll (Bengts order): scripts/hojd-prov.ts +
      knappen Actions → hojd-prov (EU-DEM-höjder, tre varianter RÅ / RÅ+HÖJD /
      OFFSET=taket; självtestet fällde ett teckenfel före push). Två fynd: (1) STARKT,
      3 455 par: empirisk lapse 0,71 °C/100 m (standard 0,65) — höjden bär en äkta del
      av parsystematiken; (2) ÄRLIGT, 40 augustipunkter: rå+höjd 8,36 ≈ rå 8,36 mot
      offsetens 2,50 °C — i utstrålningslägen räcker höjden INTE ensam, lärda offsets
      bär stationskaraktären. AUTOMATISK 4/9 (Bengts ja): måndagar 07:00, sist i
      mätserien efter grind-a/smhi/v3/trv — vinterkurvan växer utan knapptryck, och
      rangordningen står: felkartan dömer, luftankarna lagar, höjden finjusterar.
      🔑 Omkörning på vinterdata avgör.
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
- [x] ~~issue #4: segment_id i vaglag.geojson~~ ✅ KLART + BEVISAT 3/9 (Bengt + Claude):
  818/818 features på CDN bär segment_id (publicering 16:37Z). Segmentstabilitetens
  tidsserie inför mars tickar nu gratis i kartrepots halvtimmescommits. Issue stängd.
- [x] ~~#31 Trafikverksbevakningen~~ ✅ KLART 3/9 (detaljkortet under Claude — olåst)

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
- [x] ~~Fastställ trösklarna för skuggan~~ ✅ FASTSTÄLLT 2/9 (DECISIONS #61): Axels
  "kör" relayerat av Bengt i chatten, värdena oförändrade från Bengts 1/9-version inkl.
  §2-orsaksklassningen. Kvitto: huvudet i docs/TROSKLAR-SKUGGAN.md. Bocken här är
  kontrasigneringen. Från första skuggkörningen gäller §5: ändring kräver båda.
- [x] 🔑 ~~Fastställ TROSKLAR-VATTENPLANING~~ ✅ FASTSTÄLLT 4/9 (DECISIONS #68): Axels
  ja relayerat av Bengt, värdena oförändrade från #67. Vinterinteraktionen avgjord enligt
  rekommendationen — HALKAN VINNER ALLTID, vattenplaningen vilar helt vid yttemp ≤ +4 °C
  och ligger under halkan i A-skalan. Bocken här är kontrasigneringen; vill du ändå
  justera går det fram till första skuggkörningen, sedan gäller §5 (båda signerar).
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
- [ ] **Vegvesen DATEX-konto** — ✅ TILLSTÅNDET BEVILJAT 4/9 (Bengt): användarnamn
  TjeDatexlagerlof. Koden härdad samma varv: ingest/no.ts gör en REKOGNOSERING vid
  första körningen med hemligheter (verklig XML + elementräkning på Summary), fel-
  loggen bär svarskroppen och skiljer 401 (fel par / ej aktiverat) från 403 (saknad
  rätt / IP-spärr); workflowen har pipefail + Summary.
  ✅ HELA KEDJAN KLAR 4/9 em (Bengt + Claude, terminalen): hemligheterna inlagda → #28
  rekognosering (406 → Accept */* mätt) → parsern (ingest/sources/vegvesen.ts, test mot
  fixtur) → ingest-no #29 15:24: 468 stationer med koordinater, vägyta 422, luft 427,
  daggpunkt 425, fukt 436, latest 468 / archived 468 → puls-ingest-no 17,47 i pg_cron
  (pulsklocka #3, 10 jobb) → healthcheck #74 HEALTHY med "no-arkivet: synkat för 5 min".
  Arkivpolicyn DECISIONS #4 ordagrant som SE/FI. Kortet flyttat till KLART (DECISIONS #64).
  ÖPPET: nederbörd 0 av 468 — DATEX-nederbördens form är omätt (torr eftermiddag eller
  annan elementväg?), bevisas första regnvädret; olyckor → no.deviations är eget kort.
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
- [ ] 📞 **Skyltfondsrundan** (efter Axels klartecken): fonden + trafikövningsplats v.36 → avsiktsförklaringar 25/9 → SKICKA 28/9.
  UNDERLAGEN UPPDATERADE 3/9 (Bengts order, terminalsessionen): ansökan v5 + kontaktplan v5
  i Drive-mappen. Nytt däri: (a) VERIFIERAT att handledarkursen slopades 2026-08-01
  (prop. 2025/26:127) — trafikskole-pitchen omskriven; (b) prognoslagrets beskrivning i
  linje med tröskeldokumentet (offsetmodell, inte Nowcast) så bilaga 7 stämmer med texten;
  (c) grind A-infrastrukturen synliggjord som egenfinansierad indata (gränsdragningen);
  (d) konkreta kandidater: AB Bulltoftabanan Malmö (040-29 29 05) + 7 trafikskolor.
  ⏰ Förhandssamtalet till fonden = "första veckan i september" = NU.

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
  via Bengt i chatten; Axel kontrasignerar genom att bocka här). ✅ Steg 3 PILOTEN I DRIFT 2/9 kväll
  (Bengts "bygg piloten"): ingest/radar.ts — ODIM HDF5 → proj4 → 2 km-sampling mot
  818-skelettet → Marshall–Palmer → radar_precip (händelsefiltrerad, fött låst),
  som steg i ingest-jobbet (minutdieten hålls). Prov-läget fällde ett API-fel före
  skarp drift (h5wasm FS) och bevisade formatet (DBZH, hörnkontroll 458,0×881,0).
  FÖRSTA SKARPA RADERNA (radar-pilot #3, 18:28): 63 segment med regn just då, max
  15,38 mm/h, färskhetsrad i varje logg. ✅ V3-KNAPPEN BYGGD 3/9 (Bengts "bygg och kör
  kedjebevis men ingen dom"): scripts/cell-matning-v3.ts + Actions-knappen cell-matning-v3
  — A) bekräftelse per radarband, B) Marshall–Palmer-kalibrering (mediankvot radar/mätare),
  C) missriktningen; självtest med känd sanning grönt, underlagsvakt (< 20 par = rött),
  domspärr i utskriften. KEDJEBEVISET KÖRT 3/9 (körning #2; #1 fällde en riktig bugg —
  geography-svep utan bbox-förfilter sprängde statement_timeout, lagad): 1 311 par ur
  18 kompositer, bekräftelsen växer monotont med radarintensiteten 13→30→51→71 %,
  mediankvot 0,39, missriktningen 85 % — kedjan (parning, enheter, tidsmatchning)
  bevisad; siffrorna är INTE domen (14 h data). AUTOMATISK 3/9 (Bengts order): körs varje
  MÅNDAG 06:20 efter grind-a 05:40 och smhi-prov 06:00 — tre mätkurvor i följd varje
  måndagsmorgon, resultatet på Summary-sidan. 🔑 Pilotens dom efter ~1 vecka: v3 på moget underlag + uppmätt
  volym/fritier. Steg 4 nyttjarna i kortens egen takt. Blind fläck
  kvarstår: frosten ser radarn aldrig.
- [ ] 📏 **#44 Regntäckningen** (Bengts täthetsfråga 3/9: "räcker timhämtningen?") —
  stationerna summerar regn per 30 min, ingest hämtar per timme: tappar vi varannan
  bucket? KNAPPEN BYGGD 3/9: scripts/regn-tackning.ts + Actions → regn-tackning
  (histogram 2/1/0 buckets per station-timme + täckningsprocent, självtest med känd
  sanning grönt, underlagsvakt). Nämnaren är pipelinens körtimmar, inte kalendern.
  MÄTT 3/9 kväll (körning #1): hypotesen BEKRÄFTAD — regnmätarna fångar 1 av 2
  buckets i 78 % av station-timmarna (2/2 bara 5 %), total täckning 44 % av
  teoretiska 48/dygn; alla observationer 39 % (där späder händelsefiltreringen på
  0-timmarna, 29 %). Vi tappar alltså ungefär varannan 30-min-regnsumma. Ofarligt
  för v3/cellmätningen (slumpvis förlust = mindre urval, ingen skevhet, ±45 min-
  parningen hittar den fångade bucketen) men halverar vinterseriernas växttakt.
  ✅ TÄTHETSBESLUTET TAGET 3/9 kväll (Bengt + Axel i chatten, DECISIONS #62): väg (a).
  BYGGT samma varv: ingest/regn30.ts + regn-30.yml — lätt motfashämtning :41 (mot
  ingests :11), samma parser/INSERT, bara nederbördsrader, idempotent. EFTERMÄTNING
  KÖRD 4/9 (regn-tackning #2, dagar=1): 2/2-andelen 5 → 9 % — MEKANIKEN BEVISAD
  (pulsen nådde 30 % under aktiva timmar; varje körning skriver ~85 rader som annars
  tappats) men GITHUB-CRONEN SVALT: 3 avfyrningar av ~14 möjliga, 2 fullbordade,
  5-timmarshål — samma syndrom som fällde ingest före pulsklockan. KORTET ÖPPET.
  🔑 ÅTGÄRDSFÖRSLAG (Claudes): regn-30 in i Supabase-pulsklockan (:41), samma bot
  som #26 gav ingest. Kräver handgrepp i pg_cron — Bengt/Axel säger kör.
  ✅ PULSKLOCKAN SKARP 4/9 14:05 (pulsklocka #2, DECISIONS #63): tre pulsjobb i pg_cron.
  BEVISADE I DRIFT 15:06 (Bengts "kör igång", terminalen): pulsen trycker — ingest-fi #29
  14:37, ingest-dk #27/#28 14:12/14:42, regn-30 #7 14:41, alla "Manually run by Axelstar"
  = dispatch via token, inte GitHub-cron. Healthcheckvakten #73 15:06 HEALTHY: fi-arkivet
  30 min, dk-arkivet 25 min (gräns 120), gräns-wx 20 FI-stationer, 0 öppna incident-issues
  (#70/#71 var röda på just fi/dk-stalehet — larmvägen provad i skarpt läge). KVAR på
  kortet: regn-tackning efter ≥1 dygn på pulsen ska visa 2/2-andelen stiga (beviskravet i #62).
- [x] ~~⛏️ **#48 Golvbyggena**~~ ✅ KLART 4/9 (utom bygge 3) (Bengts order 4/9: "ta hela kortet, allt självförsörjande")
  — PÅGÅR (terminalen): GOLVET.md:s byggen 1–4 med automatiseringskrav: automigrering
  vid varje ingest (db.ts/fi.ts-mönstret), healthcheck-golv på varje ny fältfamilj
  (exists-vaktade så de inte larmar på ofött), förstapubliceringsbevis i loggrader.
  (1) SE vind×3 + sikt, (2) FI-breddningen ~9 sensorer (frostpunkt, saltfryspunkt,
  saltmängd, vind, sikt, nederbördsform, ytstatus), (3) PhotoTime — UPPTÄCKT: ingen
  deploy-väg för edge-funktioner finns från terminalen/CI (inga Supabase-tokens i
  Secrets) — skjuts till webben-varvet med deploy-läxan, (4) LocationText in i ingest +
  vaglag.geojson (OBS: fylls i takt med omklassningar — full först under vintern).
  Bonus i samma svep: healthchecken får FI/DK-stalehetsvakt (fanns inte — bara svenska
  sync_state vaktades!). Kortanteckningar: SMHI-moln→#46, SATEEN_OLOMUOTO→#45,
  SensorNames→#46, DMI/NO→sina spår, röst-LocationText→Axel.
- [x] ~~🧹 **#47 Vad ligger mer på golvet?**~~ ✅ KLART 4/9 (Bengt + Claude, terminalen):
  docs/GOLVET.md — tio källor genomgångna mot LEVANDE fältdumpar (TRV-recon körning
  33840067087 + lokala dumpar). FEM TUNGA FYND: (1) SIKTEN finns i ALLA källor
  (TRV VisibleDistance!, FI, SMHI 12, DMI) — hål C var ett hämtningshål, inte källhål;
  (2) VINDEN likaså (TRV Wind[] + byvind SpeedMax); (3) Finland levererar RIMFROSTEN
  FÄRDIGRÄKNAD (KUURAPISTE, KASTEPISTE_ERO_TIE) + saltjusterad FRYSPUNKT (JÄÄTYMISPISTE)
  + nederbördens FORM (SATEEN_OLOMUOTO = #45-facit); (4) SMHI:s MOLNMÄNGD = rimfrostens
  klar natt-detektor; (5) metadata-guld: TRV SensorNames (sensorspecifik givarvakt),
  Camera PhotoTime (daterat facit), RoadCondition LocationText (röstens VAR).
  Rent golv: TrafficSafetyCamera, Polisen. Recon-lucka: Situation-dumpens datumfilter.
  🔑 Fynden är KANDIDATER — föreslagen ordning i GOLVET.md; inget hämtas utan eget kort.
- [x] ~~🌉 **#49 Gränssnapshoten — grannländernas data in i svenska appen**~~ ✅ BYGGT +
  BEVISAT 4/9 (Bengt + Claude, terminalen). Publicering #596 grön, loggraden: FI 16
  stationer inom 40 km av svenska vägnätet nåbara för appen (0 kalla i sept = rätt, som
  broarna). Healthcheckgolv (<10 = larm) + reachability-logg varje publish. FYND: build-snapshot.ts läser BARA weather_latest
  (svenska stationer) — FI/DK/NO ligger i egna scheman och matar bara skuggsnapshoterna,
  når ALDRIG appen. En förare i Haparanda/Karesuando/Riksgränsen/Storlien får varningar
  mot närmaste SVENSKA station även när en finsk står två km bort. Vi MÄTTE nyttan 1/9
  (Norrland >20 km 12,6→11,5 % med FI) — men mätningen blir produktnytta först när
  gränsstationerna når snapshoten. BYGGE: UNION i snapshotens väderfråga, utländska
  stationer inom 40 km av svenska vägnätet, källmärkta. Tre invarianter ORÖRDA: privacy
  (matchning fortfarande on-device), röst (punktkälla = samma text), licens (attribution
  finns för kartan, appen är Axels kolumn). v1 = FI (äkta vägyta TIE_1); DK HÅLLS
  (grästemp-ärligheten #45, Bengt/Axel), NO faller in med kontot. 🔑 Attribution i
  app-copyn = Axels beslut; grässtemp-DK = Bengt/Axel.
- [ ] 🔨 ❄️ **#46 Rimfrosten — svartis utan nederbörd** (Bengts hål A, 4/9) — PÅGÅR:
  ANALYSFAS (Bengt + Claude, terminalen 4/9). Fyndet: motorns fuktvillkor är enbart
  nederbörd, men dewpoint_c ligger oanvänd i varje arkivrad sedan 24/8. Rimfrost
  (klar natt, yta ≤ daggpunkt, ingen nederbörd) = höstens klassiska svartis — motorn
  tiger. Analysen backtestar villkoret mot arkivet INNAN någon metodändring föreslås:
  hur många stationstimmar skulle nya grenen fånga (marginaler 0/0,5/1 °C × yttröskel
  0/1 °C), överlappar den befintlig fukt, och toppar den kl 03–07 (fysikens signatur —
  gör den inte det är villkoret brus)? KÖRNING #1 (4/9, 6 min): fysikkontrollen FÄLLDE
  resultatet — platt dygnsprofil, och topp-3-stationerna hade yta−dagg −28…−49° =
  TRASIGA DAGGPUNKTSGIVARE (53/58 kandidater från 3 stationer). STORT BIFYND: frost-
  grenen kräver GIVARVAKT innan den byggs, annars falsklarmsmaskin. v2 med äkthetsvillkor (RH ≥ 90
  korsgivare + yta−dagg ≥ −5°) KÖRD (#2, 2m58s): 0 av 53 kandidater överlevde — ALLA
  var givarfel (57 rader < −10°, stationerna Ollsta 2346, Storvik 2135, Bolhyttan 1713).
  ANALYSFASENS DOM: (a) arkivet saknar ännu äkta rimfrostnätter — kvantifieringen görs
  om vid höstens första riktiga frostnätter (knappen redo); (b) ETABLERAT: givarvakten
  är obligatorisk del av varje framtida frostgren — utan den hade rimfrostvarningar
  avfyrats på skrot från tre stationer; (c) felet är isolerat till daggpunkten —
  offsetmodellen/grind A använder bara yttemp och är opåverkad. KANDIDAT (Bengts
  kolumn): påtala de tre stationernas orimliga daggpunkter för Trafikverket (mejlutkast
  levererat i chatten 4/9).
  ANALYSFAS DEL 2 (beslutad 4/9, Bengt: "gör 1,2,3") — metodgenomgångens tre spår:
  (1) ✅ FI-DAGGPUNKTEN IN I INGESTEN 4/9: KASTEPISTE fanns i källan men släpptes på
  golvet (verifierat live: 505/528 stationer, ex. station 1001 = 7,5°). Lapplands
  septemberfrost ger äkta rimfrostnätter VECKOR före Sverige — samma analys, finskt
  arkiv. ✅ BEVISAT 4/9: körning #24 föll på 42703 (latest-tabellen saknade kolumnen —
  rotationsläxan fångade det på minuter), sql/010 + automigrering i fi.ts, körning #25
  GRÖN med loggraden "daggpunkt 505 st". Finska daggpunkter arkiveras från och med nu.
  (2) HÖSTENS OMKÖRNING GÖRS UTFALLSDRIVEN, inte villkorsräknande: starta i FACIT
  (väglagets frost-omklassningar en klar morgon + gryningsbilder ur kamerafacit) och
  fråga bakåt om daggpunktsgrenen såg det 1–3 h innan där nederbördsgrenen var blind.
  Missmätningens (#19) riktning; bevis per händelse i stället för timstatistik.
  (3) NOTERADE, DRIVS EJ: historik bakåt är stängd väg (TRV live-only, SMHI saknar
  vägyta — begränsning, inte slarv); fysisk mikrovalidering (frostplatta/termometer)
  är trevlig men ger aldrig statistik.
  🔑 Motoränring + vektor är ETT SENARE beslut på höstens siffror; rösten är Axels.
- [ ] 🌨️ **#45 Nederbördstypen — regn, snö eller slask?** (Bengts fråga 3/9: "hur mäter
  vi snö, snöslask etc som är lika riskabla?") 🔒 LÅST BAKOM RADARDOMEN 14/9.
  **Läget när kortet skrevs:** snö och slask PÅ vägen talas redan — men bara indirekt:
  (a) VViS-stationernas snow-flagga räknas som fukt i frysriskmotorn ("frysrisk framöver"),
  (b) väglagets operatörsklasser ("Snöigt", "Is och snö", "Slask") blir slippery_segment
  och rösten säger "halt väglag". Hålet är eftersläpningen (operatören måste hinna klassa)
  och att radarn — som ser nederbörd i realtid MELLAN stationerna — inte vet SORTEN.
  **Metoden (det som ska mätas, inte gissas):** sorten avgörs av temperaturen nederbörden
  faller genom. Standard: VÅTBULBSTEMPERATUR (luft + fuktighet, båda finns per station):
  ≳ +1,5 °C regn · ≲ 0 °C snö · DÄREMELLAN SLASK — farligaste zonen, vattenplaning och
  blivande is samtidigt. Klassningen = våtbulb per segment (offsetmodell + höjdkorrektion,
  höjden flyttar snögränsen — ankarbreddningens lapse 0,71°/100 m) × radarintensitet
  (radar_precip, redan per segment var 5:e min). ALLA ingredienser ligger redan i arkivet
  — detta är en beräkning, ingen ny källa.
  **Facit finns gratis:** SMHI:s stationer rapporterar observerad nederbördstyp, och
  väglagets operatörsklasser är andra domaren. Klassningen körs i skugga och döms mot
  båda innan något får synas — tröskeldokumentets princip, samma som allt annat.
  **Varför låst till 14/9:** typklassning ovanpå en radarkälla som inte bestått sitt
  eget kedjebevis vore våning två före grunden. Klarar radarn domen: bygg klassningen
  som skuggkolumn i radarspåret (litet steg). Faller radarn: kortet omprövas — våtbulben
   enbart kan fortfarande klassa nederbörd SOM STATIONERNA ser, men inte mellan dem.
  **BENGTS MATRIS (4/9) — kortets egentliga mål är ÖVERGÅNGARNA, inte vädertyperna:**
  vägytan är ett TILLSTÅND (torr → blöt → slask/modd → snöbelagd → packad snöväg) och
  nederbörden en ÖVERGÅNG ovanpå det. Farligast är korsningarna: SNÖ PÅ SNÖ (nysnö på
  packad bana) och framför allt REGN PÅ SNÖ (polerar snövägen till is — fönstret innan
  operatören klassat om är där varningen är värd mest). Klassningen ska därför korsas
  med segmentets NUVARANDE väglagsstate (finns i arkivet), inte bara klassa det som
  faller. VIKTIG PRINCIP: snöväg som VINTERBASELINE i norr larmar ALDRIG — TRV kodar
  packad snöväg som normalt vinterväglag, och en app som ropar halt nov–april i Norrland
  avinstalleras (H2/cry wolf). Värdet är AVVIKELSEN från segmentets säsongsbaseline,
  som nu är mätbar ur väglagshistoriken + segment_id-tidsserien (issue #4). OVERIFIERAT
  tills vintern: exakt hur norrlandsetiketterna faller ut i vår data — prövas mot
  arkivets första vintermånad innan någon regel fryses.
  **Rösten är ett SEPARAT beslut (Axels kolumn, som #32):** om "snöfall framöver" eller
  "slask på vägen" blir egna rösthändelser avgör Axel; tystnadsdisciplinen gäller —
  ett slask-larm som har fel är värre än inget. Prognos av KOMMANDE snöfall är #16,
  fortsatt medvetet parkerat. *(Bengt + Claude, terminalen 3–4/9)*
- [ ] **#32 Hindren in i rösten** — vi har aldrig skeppat annat än olyckor trots att
  DECISIONS #5 sade "olyckor + hinder". Kräver ny HazardKind + egen röstfras + Axels
  beslut om vad rösten säger. Bäst kandidat: **djur på vägbanan** (173 på en vecka, med
  RIKTIG position — vida bättre än polisens länscentrum som vi underkände i #13).
- [x] ~~**#31 Bevakning av Trafikverkets nyheter**~~ ✅ KLART 3/9 (Bengt + Claude, terminalen):
  KÄLLVAKT måndagar 06:40 (scripts/trv-bevakning.ts) över ALLA sju källor ur issue #2
  (Visualping-ersättaren): TRV bransch-RSS + portalens nyheter (CMS-GraphQL, 125 poster —
  där väglagskameror-25/8 låg) + driftinformationen (17 poster) + SMHI opendata (sitemap,
  238 sidor) + met.no + halkvarning + klimator (texthash, siffror strippade, instabil sida
  självdetekteras och jämförs inte). Nytt/ändrat = issue per källa (trv-nyhet, assignad
  Bengt); trasig källa = rött jobb. LARMVÄGEN BEVISAD 3/9 två gånger: testissues #35/#36
  + äkta brusfynd #37 som ledde till stabilitetskontrollen. Öppna API:ets egna utskick har
  ingen feed — täcks av Bengts medlemskap i Google-gruppen "Öppet API Trafikverket" (mejl per
  utskick). KVITTERAT 3/9: Bengt bekräftade alla tre notiserna (#35–#37) mottagna; issues stängda.
  Google-gruppen visade sig DÖD sedan 2014 (Bengts koll) — portalvakten täcker API-
  utskicken. Kortet HELT stängt: larmkedjan bevisad källa→issue→notis→mottagare.
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
  📅 **EFTER RADARDOMEN 14/9** (Bengts order 4/9): fundera på att koppla in radar-
  spåret som #42:s trigger mellan stationerna — MED kalibreringsfaktorn från v3,
  inskrivet i TROSKLAR-VATTENPLANING (steg 2) före triggerkod. Före domen är det
  låst: cirkularitet (stationerna är radarns domare) + okalibrerad skala (kvot 0,39
  på tunt underlag). Faller domen väl ut är detta nästa steg; faller den illa
  omprövas hela triggerfrågan. Beslut: Bengt + Axel.
  🔨 **STEG 1 FÖRBEREDD 4/9** (Bengts order): scripts/lastkajen-rekognosering.ts +
  knappen lastkajen-rekognosering — REN LÄSNING som söker svar på körschemats fyra
  frågor (licens · format mot 818-skelettet · färskhet · kontokrav). Två spår:
  öppna API:et (kandidatobjekttyper — felmeddelandet är den ärligaste katalogen,
  RoadNumber-läxan) och Lastkajens egna ytor (katalog/swagger/licenstext). Laddar
  inget, skriver inget; en fallen kandidat är ett svar, bara total tystnad fäller
  jobbet. Det som kräver konto är Bengts handgrepp — kortet är hans.
  🔄 **OMTAG 4/9 (Bengts granskningsfråga → väg C, DECISIONS #65): spårdjupet
  blockerar inte längre.** Steg 1 mätte tillgång, inte nytta — ankarklippningens
  fälla. Men att skjuta spårdjupet vore värre: höstregnen är en engångschans i år
  (nästa hösten 2027). Nu parallellt: reconen = ren kunskap · ansökan startas om
  konto krävs (kalendertid löper gratis) · TROSKLAR-VATTENPLANING skrivs UTAN
  spårdjupströskel (ingen gissad tröskel) · skuggan börjar oavsett · hinner datan
  fram blir spårdjup ANALYSKOLUMN (nytt steg 4b), aldrig varningströskel förrän
  nyttan är mätt. Körschemat §8 omskrivet.
  ✅ **RECONEN KÖRD 4/9 (körning #1–2, DECISIONS #66) — svaret ändrar kortet:**
  spårdjup finns INTE i öppna API:et (PavementData 19 fält, RoadData 24 fält,
  inventerade namn för namn — noll rut/djup/IRI/textur/friktion). Lastkajen kräver
  konto (/api/Identity/Login → 405 på GET: finns, vill ha POST). MEN GRATIS PROXY
  HITTAD: RoadData bär **AADT + AADTHeavyVehicles** (tung trafik = spårens orsak),
  RoadWidth, BearingCapacity, WearLayer; PavementData bär PavementDate/-Type/
  Thickness — allt i vägnummer + löpande längd, samma referenssystem som våra 818
  segment. Steg 4b = TRAFIKPROXYN (byggs när skuggan står), mätt spårdjup flyttat
  till nytt steg 4c, villkorat. Räcker proxyn behövs Lastkajen aldrig.
  ⚠️ Mätt färskhetsvarning: beläggningsdatum 1967/1980/2013 i stickprovet — grov på
  småvägar, men Lastkajens egna mätningar har samma svaghet där. Redovisas i domen.
  📏 **STEG 2 UTKAST SKRIVET 4/9** (Bengts order): docs/TROSKLAR-VATTENPLANING.md —
  tre grindar (V-A påståendets bärkraft, mätbar NU; V-B skuggdriften; V-C domens
  giltighet med binomialbruset), asymmetrisk facittabell där "regn utan olycka"
  INTE är falsklarm (granskningens §7.3), vinterinteraktionen som Axel-beslut med
  rekommendation (halkan vinner alltid, vattenplaningen vilar ≤ +4 °C), radarns roll
  villkorad av domen 14/9, ingen spårdjupströskel (#65/#66). Regntröskeln i mm/h
  medvetet OSATT — den ska falla ur V-A:s mätning, inte gissas.
  ✅ **VÄRDENA FÄLLDA AV BENGT 4/9** ("låt värdena stå", DECISIONS #67): V-A 70 %/25 %
  inom 0–10 km · V-B 20 % falsklarm / 40 % miss / max 3 varningar per rutt och regndygn ·
  V-C ≥200 varningar, ≥15 facithändelser, ≥5 regndygn, ≥3 län. Regntröskeln i mm/h
  förblir osatt (ska falla ur V-A:s mätning) och radarn är villkorad av domen 14/9.
  ✅ **FASTSTÄLLT AV AXEL 4/9** (DECISIONS #68, relayerat av Bengt): värdena står,
  vinterinteraktionen avgjord — halkan vinner alltid, vattenplaningen vilar helt vid
  yttemp ≤ +4 °C (förvillkor i koden, inte prioritetsfråga i alarmkön ⇒ egen vektor).
  ✅ **STEG 3 BYGGT 4/9** (Bengts "bygg grinden"): publish/grind-v-a.ts + knappen
  grind-v-a, måndagar 07:20 sist i mätserien. LOO mot regnarkivet, stationen aldrig
  med i sin egen prognos. TRIPPELDELNING i stället för tvådelning: när grannarna säger
  "≥ T" är egen mätning TRÄFF (≥T), DELVIS (0<egen<T) eller FALSKLARM (=0) — att slå
  ihop delvis+falsklarm hade blåst upp falsklarmen, att slå ihop träff+delvis hade
  dolt dem. REGNTRÖSKELN SÄTTS INTE, DEN FALLER UT: 0,5/1/2/4/6/10 mm/h sveps och
  lägsta som klarar 70 %/25 % i bandet 0–10 km är svaret. Binomialbrus per andel (V-C3),
  domspärr < 200 fall, underlagsvakt. Självtest med känd sanning grönt: identiskt regn
  ⇒ 100 % träff / 0 % falsklarm, oberoende regn ⇒ 34 % / 66 %.
  *(nyckel för röst: Axels ja — rösttext, plats i A-skalan, ordning mot #15/#16)*

---

## 🟡 GÖRA (pågår just nu)


---

## 🟢 KLART (senaste vinsterna)

- [x] 🇳🇴 **NORGE I GRÄNSSNAPSHOTEN** (4/9 15:47, Bengt: "kör gränssnapshoten"): #49-mönstret
  som loop över fi + no i build-snapshot.ts — publicering #621 (e217891): "NO 42 stationer
  inom 40 km av svenska vägnätet (varav 0 kalla nu)", FI 16 som förut. En förare på E8/E10/
  E12/E14 matchas nu mot närmaste station oavsett land. Healthcheckgolv NO 20 (< 20 larmar).
  0 kalla i september är rätt — samma som FI och broarna. Ingen rösttext ändrad (punktkälla).
  DK MEDVETET UTANFÖR: dk.weather_latest bär GRÄSTEMP, inte vägyta (#45) — hade den legat i
  snapshoten hade appen sagt frysrisk på fel grund. In först när Vejdirektoratet svarar.
- [x] 🇳🇴 **NORGE TICKAR — no.weather fylls från Vegvesen DATEX** (4/9 15:24, Bengt +
  Claude, DECISIONS #64): parsern skriven mot MÄTT struktur (rekognosering #28), inte mot
  schemat; strukturvakt som dumpar XML och skriver inget om positionen saknas — den
  behövde aldrig larma (468/468 med koordinater). Puls 17,47 i pg_cron, healthcheckvakt
  på plats. Norden: SE + FI + NO med äkta vägyta, DK grästemp.
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

