# Halkvakt — total genomlysning

**Beställd av Bengt 2026-09-20 inför riktlinjemötet med Axel. Metod: fem parallella granskare i repot plus egna
mätningar mot drift, GitHub-API och den publicerade snapshoten. Läs-only — inget i produktionen ändrades.**

---

## 1. Sammanfattning i tre meningar

Ni har byggt ett ovanligt hederligt **mätinstrument** — motorn är ren, den körs byte-för-byte i tre språk, trösklarna
skrivs före mätning och blindningen är kodad, inte bara utlovad. Men **produkten har ännu inte varit i en enda
utomståendes hand**, de fyra facitkällor som januaridomen vilar på ger i dag noll, noll, oläst och orsakslös, och
granskningen hittade tre fel som hörs i bilen — varav iOS säger *"på väg &lt;null&gt;"* vid var tjugonde olycka.
Den största enskilda risken är ändå att **arkivet saknar backup och inte går att återskapa**: allt som mätts sedan
24 augusti kan försvinna på en natt utan att någon vakt säger till.

**Det obekväma i korthet:** de 24 vektorerna certifierar inte korridorvinkeln och inte reprisavståndet — båda kan
ändras extremt mycket utan att ett enda prov reagerar. Tryggheten i "grönt i tre språk" är alltså delvis lånad.

---

## 2. Hårda siffror

### Repot

| Mått | Värde |
| :-- | --: |
| Commits (24/8–20/9, 27 dygn) | 736 (≈ 27 per dygn) |
| Spårade filer | 977 |
| **Motorns beslutslogik** (`engine/src`) | **593 rader** |
| Testvektorer (`engine/vectors`) | 20 860 rader, 24 vektorer |
| Mät- och analysskript (`scripts`) | 8 345 rader, 49 filer |
| Dokument (`docs`) | 14 826 rader, 63 filer |
| Android | 7 984 rader · iOS 3 007 rader |
| Fjärrgrenar | 169 (skräp: bara 1 behövs) |
| Öppna issues | 3 |

### Styrdokumenten

| Dokument | Rader | Ord | ≈ tokens | Senast innehållsändrad |
| :-- | --: | --: | --: | :-- |
| DECISIONS.md | 7 232 | 81 743 | ~162 000 | 20/9 |
| TAVLA.md | 3 550 | 51 481 | ~107 000 | 20/9 |
| STATUS.md | 1 846 | 21 198 | ~45 000 | **31/8** (rubriken "Current state") |
| BACKLOG.md | 280 | 2 922 | ~7 000 | **5/9** (i praktiken dött) |
| **De tre stora ihop** | **12 628** | **154 422** | **~315 000** | |

### Arbetsfördelning

| Period | Dokumentrader | Produktkod (engine/android/ios) | Övrig kod |
| :-- | --: | --: | --: |
| Senaste veckan | 9 087 | 3 065 | 4 845 |
| Hela projektets livstid | 33 % | 38 % (varav vektorer 21 k rader) | 26 % |

### Drift (mätt 20/9 08:00–08:10Z)

| Mått | Värde | Dom |
| :-- | --: | :-- |
| Databas | 178 av 500 MB | tak 1/11 |
| Väderarkivet, ålder | 5 min | ✅ |
| Radarn | 50 min | ✅ (regel ≤ 70 min) |
| Skuggloggen | 0 min | ✅ |
| Väglaget (`road_conditions`) | **43 h** | förväntat i september |
| Kameror | 26 h | förväntat |
| Publicerad snapshot | 3 min, **sha matchar manifestet** | ✅ ände-till-ände |
| CI-körningar senaste dygnet | 94, alla gröna utom mina fyra motprov | ✅ |
| Actions-kassan | 21,78 av 35 USD (19/9) | håller september |

### Facit — det domen ska vila på

| Källa | Volym | Användbart i dag |
| :-- | --: | :-- |
| Förarsvar (`driver_facit`) | 2 rader, **0 riktiga** | nej |
| Omklassningar till halka, 14 dygn | **0** (hela arkivet: 7 rader) | nej |
| Kamerabilder | 451 | **oläst** — ingen granskning byggd |
| Olyckor | 504 | bara som sidoupplysning (ingen orsak) |
| Trendkandidater | 11 879 | ja, men det är stationens egen yta |

### Tavlan

96 öppna kort. 25 gjorbara av mig nu · 20 låsta av nyckel · 15 hos Bengt · **29 hos Axel** · 7 i "Axels nästa steg".
41 färdiga kort ligger kvar i ATT GÖRA. 🟡-sektionen ("pågår") är tom. **Ingen incheckning från Axel sedan 17/9.**

---

## 3. Det som är starkt — med bevis

1. **Motorn är ren, verifierat.** Inga träffar på klocka, slump, nätverk, process eller lokalisering i någon av de
   tre portarna — tiden kommer uteslutande ur positionens egen tidsstämpel. 24 delade vektorer körs byte-för-byte av
   TypeScript, Kotlin och Swift i CI, inklusive exakt rösttext. Granskningen jämförde prioritetsordning, spärrlogik,
   reprisgrindar, kamerans vändning, bro- och iströsklarna, avrundningen och geoformlerna: **inga skillnader** utom
   `<null>`-felet ovan.
2. **Snapshot-kedjan är fail-closed och fungerar just nu.** Jag hämtade den publicerade filen: sha256 matchar
   manifestet exakt, 3 minuter gammal. Båda apparna kontrollerar checksumman *före* cache-skrivning och behåller den
   förra vid fel.
3. **Noll telemetri.** Inga Firebase-, Crashlytics- eller Sentry-bibliotek. Android loggar ingenting till logcat.
   iOS har inga externa beroenden alls.
4. **Kontraktsgrinden fungerar på riktigt.** 38 kontrakt, alla håller; givarvakten finns i 19 kopior i 13 filer och
   vaktas över språkgränsen. Jag fällde den avsiktligt tre gånger i dag — den sa ifrån varje gång.
5. **Blindningen är kodad, inte utlovad.** `p_blind` är sant som standard, svepen avvisas med fel i databasen, och
   mätsatsen redovisar en egen noll-kontroll.
6. **Ingesterna är idempotenta.** Genomgående `ON CONFLICT`, och raderingar är `UPDATE` — gravstenar kan inte skapa
   rader. Den läxan sitter.
7. **Bevisdisciplinen.** Nästan varje färdigt kort bär mätdatum, körnings-id eller databassvar. Det är sällsynt.
8. **Fällistan i CLAUDE.md** (66 punkter) är genuint dyrköpt kunskap, varje rad med en mätning bakom sig.

---

## 4. Det som måste åtgärdas — prioriterat

### P0 — iOS säger "på väg &lt;null&gt;" högt i bilen, och det gäller var tjugonde olycka

- `SnapshotRepo.swift:117` gör JSON-`null` till **strängen** `"<null>"`. Fältet `road` läses med just den funktionen
  (rad 68). Kotlin och TypeScript hanterar null korrekt — **iOS är ensamt fel.**
- Publiceraren skriver medvetet `road: null` när vägnumret saknas.
- **Uppmätt i arkivet 20/9: 38 av 732 olyckor de senaste 30 dygnen saknar vägnummer — 5,2 %.**
- Rösten blir då: *"Allvarlig olycka på väg &lt;null&gt; 8 kilometer framför dig."*
- Vektor v22 låser bara *frånvarande* `road`, inte `road: null`. Sviten kan alltså inte se felet.
- **Åtgärd:** en rads fix i Swift plus en vektor med `road: null`. Bör göras före nästa arkivering.

### P0b — Det tidiga olycksropet kan sägas tre gånger

- `engine.ts:246-254`: vid låg fart (uppmätt ≤ 45 km/h, 10,5 km, severity 5) blir det **tre repliker** —
  "Överväg annan väg" två gånger och sedan påminnelsen. Den tidiga grenen återarmeras när 600 s och 5 km passerats
  innan 2 km-gränsen nås.
- Det bryter DECISIONS #28 och motsägs av projektets **eget test**, som påstår att tvåstegsropet är "exakt två".
- Alla tre plattformarna är identiskt fel, så pariteten döljer felet i stället för att avslöja det.

### P0c — Prioritetsgenombrottet har noll testtäckning, och testet skulle fälla en vektor som prövade det

- Regeln från kort #127 — *inom 10 s får bara en VIKTIGARE fara tala* — är produktinvariant.
- Minsta avstånd mellan två varningar i hela vektorsviten är exakt 10 s. Grenen "viktigare släpps igenom" körs aldrig.
- Värre: `test/engine.test.ts` kräver ≥ 10 s mellan *alla* varningar och skulle alltså **underkänna** en vektor som
  testade regeln. Test och motor säger emot varandra.

### P1 — Arkivet har ingen backup och kan inte återskapas

- 178 MB på Supabase gratisnivå. **Inga backuper.** Inget flöde, inget skript, inget kort — jag sökte.
- Trafikverket levererar bara nuläge och delta. **Det som tappas är borta för alltid.**
- Januari- och marsdomen vilar helt på det här arkivet. Supabase Pro är schemalagt till 1/11 — sex veckor bort, och
  Pro skyddar först från den dagen.
- **Åtgärd:** veckovis dump till fil (GitHub-artefakt eller Bengts disk) från och med i veckan. Kostar nära noll.
  Vänta inte på Pro-beslutet.

### P2 — Play-deklarationen är osann sedan 16/9

- `docs/PLAY-DATASAFETY.md` svarar **"No"** på Googles fråga om appen samlar in data, och påstår att enda utgående
  trafik är en GET utan parametrar. Filen rördes senast **27/8**.
- Sedan 16/9 POSTar `FacitSender.kt` varnings-id, tidsstämpel, app och version. Databasens egen migration erkänner
  det: *"ett svar är alltså en plats och en tid"*.
- **En felaktig deklaration är grund för avslag eller nedtagning** — mitt i vinterns enda facitfönster.
- **Åtgärd:** rätta filen och formuläret innan något laddas upp. Beslut behövs också om produktinvariantens ord
  ("ingen positionsdata lämnar telefonen, punkt") ska formuleras om, eftersom facitsvaret i praktiken är en plats och
  en tid som användaren aktivt valt att skicka.

### P3 — Vakthunden kan tystna utan att någon märker det

- **Inget dödmansgrepp.** Inget utanför Supabase kontrollerar att vakthunden kört. Utgången nyckel, avaktiverat
  cron-jobb eller ett tidigt kast ⇒ total tystnad som ser ut som "allt grönt".
- **Tre checkar kan i praktiken aldrig fyra** (verifierat i koden):
  - 9c kräver färre än 4 källor i `sync_state`, men det finns minst 5 och rader raderas aldrig.
  - 9d läser cron-jobbets status, men anropet är asynkront — "lyckades" betyder "lades i kö". Ett 500-svar syns aldrig.
  - Check 1 mäter *senast anropad*, inte *kursorn rör sig*. En fastfrusen kursor ser kärnfrisk ut.
- Dessutom: ett `puls-`jobb som försvinner ur schemat faller tyst ur bevakningslistan, och en hängande körning
  passerar både utfalls- och ålderstestet.
- **Åtgärd:** externt hjärtslag (healthcheck-flödet kör redan varannan timme utanför Supabase) + laga de tre checkarna
  + jämför pg_cron mot pulsklockans deklarerade lista.

### P4 — En läcka i blindningen som ingen vakt ser

- `scripts/grind-t-a.ts` skriver ut **hela svepet rangordnat på träffandel minus falsklarmsandel** — även när
  domspärren håller. Skriptet är tänkt att köras inom sju dygn efter varje frostnatt, alltså genom hela november–januari.
- T-A:s svep är fönster · lutning · startband — **tre av kombinationens sex dimensioner.**
- När kombinationen kalibreras 1 februari är de delade dimensionernas utfall alltså redan avläst, rangordnat och
  loggat i CI. Regel D3 skyddar mars-domen mot att samma nätter både väljer och dömer; skyddet är poröst här.
- Mindre, men samma familj: `episoder`, `stationer` och `ögonblick` är avsiktligt synliga, och larmfrekvensen är halva
  målfunktionen i D4. Halva urvalskriteriet är alltså synligt före 1/2.
- **Åtgärd:** skriv i TROSKLAR-KOMBINATIONEN hur delgrindarnas körningar förhåller sig till D3 — **innan frosten**,
  inte efter. Antingen (a) T-A:s utskrift stryps till domspärren släpper, eller (b) det skrivs uttryckligen att de
  delade dimensionerna är förvalda och att kombinationen bara kalibrerar de återstående.

### P4b — Vektorsviten certifierar inte de två regler produkten vilar på

Granskaren varierade varje tröskel mot alla 24 vektorer plus den riktiga Skåneturen och mätte var utdatan ändras.
Följande intervall passerar **utan att en enda vektor märker något**:

| Tröskel | Gällande värde | Intervall där ingen vektor reagerar |
| :-- | --: | :-- |
| **Korridorvinkeln** | 35° | **5° – 90°** |
| **Reprisavståndet** | 5 000 m | **0 – 50 000 m** |
| Kamerans bäringstolerans | 60° | 60° – 150° (det förkastade 100° passerar) |
| Lägsta fart | 15 km/h | 5 – 50 |
| Kortaste förvarning | 400 m | 0 – 400 |

Korridoren är den grind **varje** fara passerar, och den styr båda felriktningarna: 5° gör appen stum i kurvor,
90° släpper in halva omvärlden. Reprisavståndet är "5 km"-halvan av en regel ni själva kallar produktinvariant.
Två vektorer är dessutom tandlösa: v03 ("kamera utanför korridoren") tystas redan av kamerans 500-metersgräns, och
v20 har 120° marginal till den tolerans den ska låsa.

**Det betyder att grönt ljus från 24 vektorer i tre språk inte är det bevis ni tror att det är.** Er egen regel —
*mät marginalen innan en vektor fryses* — tillämpades på 10-kilometersgränsen men aldrig på korridoren.

Två följdfynd i samma familj: portarnas byggflöden lyssnar inte på `engine/src/**`, så en ändring i referensmotorn
kör inte Android- och iOS-vektortesten; och "bokstav" i vägnamnsfrasen är definierad på tre olika sätt (Unicode mot
stängt svenskt alfabet), vilket spelar roll den dag Norge och Danmark tas in.

### P5 — Facit är tomt, och det är inte en teori längre

- 0 riktiga förarsvar. 0 omklassningar till halka på 14 dygn. 451 obetraktade bilder. 504 olyckor utan orsak.
- Regel KB-D3 säger att förarfacit ensamt varken fäller eller friar. **Blir omklassningarna tomma blir januari
  oavgjort även med hundratals förarsvar.**
- Beslutet om bildgranskning flyttades i dag från 1/2 till sju dygn efter första frosten (DECISIONS #248). Det var
  rätt, men det räcker inte som plan.
- **Åtgärd:** bestäm i dag vad januaridomen faktiskt ska vila på, och bygg den källan i oktober.

### P6 — Android är sju versioner efter och har ingen väg till en telefon

- Android står på **0.3.1 (versionCode 4)**, iOS på 0.3.8 (11).
- **Google Play-kontot finns inte.** Det finns inget uppladdningsflöde alls — CI bygger en AAB som artefakt och där
  slutar det.
- Android saknar dessutom introduktionen helt, och autostart är av som standard trots att produktboken säger
  "inget att ställa in".
- **Åtgärd:** om november ska hålla är Play-kontot en grind som måste passeras i september, inte i oktober.

### P7 — Produktboken lovar saker koden inte gör

| Produktboken | Verkligheten |
| :-- | :-- |
| "Fartkamera om 500 meter. Gränsen är 80." | Hastighetsgränsen publiceras aldrig — **kan inte sägas i någon av de tre motorerna** |
| "Vanlig olycksplats för älg den här tiden" | Enskilda polishändelser inom 48 h; arten läses av ingen adapter ⇒ **"älg" sägs även vid rådjur** |
| Fyra flikar | Två finns |
| SMHI → motorn | Motorn läser inte SMHI |
| Introduktion i fyra sidor | Finns inte på Android |
| "23 vektorer" | 24 |

Viltrösten är den allvarligaste: den **överdriver vad datan bär**, vilket är ett uttryckligt förbud i era egna regler.

### P8 — Batteribudgeten har aldrig mätts, och iOS kör full gas

- `< 8 %/h` står som krav på tre ställen och har **noll motprov**.
- iOS kör `BestForNavigation` med avstängd automatisk paus och har **ingen motsvarighet till Androids kadensreglering**.
- Androids kadenstest är tautologiskt: sänk gränsen tiofalt och det passerar ändå.
- En snapshot-omladdningsloop i Androids vakttjänst kan ge **fyra HTTP-anrop per sekund utan tak** när nätet saknas
  och cachen är tom.

### P9 — Referenserna är inte unika

- **11 DECISIONS-nummer är utdelade två gånger** (verifierat: 235 poster, 11 dubbletter).
- Fyra nummerrymder delar syntaxen `#NN` — tavelkort (15–209), beslut (1–248), issues och PR:er — och de överlappar.
- En session som slår upp "#126" får två olika beslut. Repot är enda synken mellan dator, webb och mobil, så det här
  kan tyst förfalska ett beslutsunderlag.

### P10 — Styrdokumenten har vuxit förbi användbarhet

- 315 000 tokens i de tre stora. Varje session betalar för att orientera sig.
- Motsägelser överlever därför länge. Exempel: tavlan har kort #79 både som öppet och som avvecklat 9/9; STATUS.md
  säger fortfarande "Actions-minuterna slut" och "iOS 0.3.0"; lapse-talet 0,71 och 0,63 står blandade utan att raden
  säger vilket som gäller.
- **Regler som bevisligen inte följs:** 41 klara kort ligger kvar i ATT GÖRA (TAVELREGELN 1), 🟡-sektionen är tom
  (TAVELREGELN 3), STATUS.md är 20 dygn gammal trots krav på uppdatering varje session, BACKLOG står kvar som order i
  CLAUDE.md men är dött sedan 5/9.

---

## 5. Var vi har missat — de strukturella dragen

**1. Instrumentet växte förbi produkten.** 593 rader beslutslogik bärs av 8 345 rader mätskript, 20 860 rader
vektorer och 154 000 ord styrdokument. Varje enskilt beslut var rimligt. Summan är en organisation som mäter sig själv
mer än den möter världen.

**2. Ingen utanför projektet har använt appen.** På 27 dygn och 736 commits har noll utomstående kört den, och noll
riktiga förarsvar finns. Allt vi vet om användbarhet kommer från er två.

**3. Vi har byggt mot mätningar i stället för mot leverans.** Senaste veckan: 9 087 dokumentrader mot 3 065 rader
produktkod. Android har inte rörts på tre dygn och ligger sju versioner efter.

**4. Distributionen är obyggd.** Play-konto saknas, Data Safety är osann, ingen uppladdningsväg finns, iOS-bygget
väntar på en arkivering sedan 18/9. Tolv testare i november har i dag ingen väg in.

**5. Reglerna har blivit fler än de går att följa.** TAVELREGELN, SESSIONSREGELN, PRODUKTBOKSREGELN, VÄRDEVAKTEN,
kontraktsgrinden, 5-metersregeln, blindningen. Flera följs inte, och en regel som inte följs är värre än ingen regel
— den ger falsk trygghet.

**6. Axel är flaskhals, och det syns i mätningen.** 29 öppna kort väntar på honom och ingen incheckning har kommit
sedan 17/9. Det är inte ett gnäll utan en planeringsfaktor: bygg inte mer som kräver hans svar innan de gamla är
besvarade.

---

## 6. Vad jag föreslår att ni beslutar i dag

| # | Beslut | Varför nu |
| :-- | :-- | :-- |
| 0 | **Motorfixarna först:** iOS `<null>`, det tredje olycksropet, och en vektor för prioritetsgenombrottet | Hörs i bilen i dag; billiga; ett bygge till Axel bör bära dem |
| 0b | **Mät marginalen på korridoren och reprisavståndet, och frys dem med vektorer** | De två reglerna produkten vilar på är i praktiken otestade |
| 1 | **Backup av arkivet, veckovis, från och med den här veckan** | Enda oåterkalleliga risken. Kostar nära noll |
| 2 | **Leveransfrys två veckor:** ingen ny mätfunktion, bara det som krävs för att appen ska nå en främling | Novemberfönstret stängs annars |
| 3 | **Play-kontot köps i september** | Grind för Android-betan, ledtid okänd |
| 4 | **Data Safety rättas före första uppladdningen** | Avslagsrisk mitt i facitfönstret |
| 5 | **Vakthunden får dödmansgrepp och tre lagade checkar** | Tyst tystnad är det farligaste driftläget |
| 6 | **Blindningens förhållande till T-A skrivs ned före frosten** | Efter frosten är det för sent att välja |
| 7 | **Bestäm januaridomens facitkälla** — omklassningar räcker sannolikt inte | Kamerabildsgranskningen tar tid att bygga |
| 8 | **Viltrösten: läs arten eller sluta säga "älg"** | Bryter er egen regel om att inte överdriva |
| 9 | **Ett batteriprov på ett känt bygge, skärmen av** | Ett krav utan mätning är inget krav |
| 10 | **Dokumentstädning:** arkivera DECISIONS före 1/9, avveckla BACKLOG, städa nummerrymden, rensa 168 grenar | Varje session betalar annars |

---

## 7. Metod och förbehåll

- Fem parallella granskare läste motorn/pariteten, driften/vakterna, mätapparaten/blindningen, produkten/leveransen
  och styrningen. Jag verifierade själv de tyngsta fynden i koden: 9c/9d-checkarna, dödmansgreppet, T-A:s utskrift,
  Play-deklarationen mot `FacitSender`, de dubbla beslutsnumren och avsaknaden av backup.
- Egna mätningar mot drift gjordes via databasknappen och mot den publicerade snapshoten. **Inget ändrades.**
- Granskningen av Android/iOS bygger på källkoden, inte på en körd app. Batteri och verklig kadens är **inte uppmätta**
  av någon — det är i sig ett av fynden.
- Motorgranskaren körde en känslighetsanalys: varje tröskel varierades mot alla 24 vektorer plus Skåneturen, och
  intervallen i P4b är därmed **mätta, inte gissade**. Samma granskare körde buntningens `--check` och fann
  skuggmotorn i synk.
- `<null>`-felet verifierade jag själv i tre filer och kvantifierade mot arkivet (38 av 732 olyckor på 30 dygn).
- Siffror om tavlan och dokumenten är räknade med `grep -c` och `wc`; tokentalen är uppskattningar (ord × 1,95).
