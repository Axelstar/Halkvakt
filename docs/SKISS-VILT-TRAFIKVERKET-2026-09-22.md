# Skiss: viltvarningen på Trafikverkets *djur på vägen* — steg 1 och 2 i ett (kort #241)

**22/9 2026, Bengts fråga:** *"om jag vill göra steg 1 och 2 i ett och samma med röst i appen där det framgår att viltrisk framöver
(266) kan du skissa fram hur det skulle göras så att allt var på plats i motorn från nu".*

**Mål.** Appen talar om djur på vägen ur Trafikverkets data med texten ur DECISIONS #266, *"Viltrisk framöver."*, polisens
länspunkter försvinner, och **ingen telefon — gammal eller ny — säger något fel under övergången.**

**Grundidén: en ny nyckel i live.json.** `wildlife` töms, så att alla appar som finns ute tystnar för vilt direkt (steg 1, som
DECISIONS #13 kräver). Trafikverkets djur skickas under en ny nyckel, `djur`, som bara de nya apparna läser — och de säger den nya
texten. Samma mönster som regnsegmenten fick en egen nyckel i #187. Då finns ingen period där en gammal app säger *"vanlig
olycksplats för älg"* om en hjort som står på vägen just nu.

---

## Fem delar

### A. Hämtningen (ingest-live) — djuren in i `deviations`
I dag hamnar *djur på vägen* bara i `situation_archive`, och där syns **aldrig Trafikverkets raderingar**: raderingar går bara till
`deviations` (ingest-live, `if (s.Deleted) UPDATE deviations …`). En älg som Trafikverket tagit bort skulle alltså varna vidare tills
sluttiden (median 72 min). Därför: `AnimalPresenceObstruction` läggs till i `KEEP`, så att raden får `deleted` som olyckorna.
Spegeln i `ingest/sources/situations.ts` ändras i samma commit (MIRROR-regeln).

⚠️ **Risk som måste tas i samma commit:** snapshotens avvikelsefråga läser *alla* rader i `deviations` och gör dem till olyckor i
appen. Utan del B skulle en älg sägas som *"olycka"*. Därför filtreras frågan i B.

### B. Snapshoten (snapshot-core + publicera)
- Avvikelsefrågan får `AND message_type_value = 'Accident'` — samma regel som grannsnapshoten redan har.
- **Ny nyckel `djur`:** `[{id, lon, lat, art, slut}]` ur `deviations` där typen är `AnimalPresenceObstruction`, inte raderad och
  sluttiden i framtiden. `art` läses ur texten med samma artlista som polisen.ts (älg, hjort, rådjur, vildsvin, ren …; 91 % bär en art).
- **`wildlife` skickas tom** — polisens länspunkter bort.
- publicera buntas om. ingest-live och publicera deployas i samma varv: `git pull`, diff mot main, deploy, bevis efter deployen.

### C. Motorn i tre portar + vektorer
- **Texten** för viltfaran blir *"Viltrisk framöver."* (#266) i `engine/src/texts.ts`, `android/engine/…/Types.kt` och
  `ios/HalkvaktEngine/…/Engine.swift`. Vektor **v13** uppdateras till den nya texten.
- **Parsrarna** (`engine/src/snapshot.ts`, `SnapshotRepo.kt`, `SnapshotRepo.swift`) läser `djur` som viltfara (id `djur:<id>`).
  `wildlife` läses fortfarande, men är tom.
- **Ny vektor v37:** ett djur framför inom ledavståndet ger *"Viltrisk framöver."*; samma djur bakom bilen tiger; djur och olycka på
  samma sträcka — olyckan vinner (A3 före A4); mot kamera som i v13.
- **Ingen ändring** i prioritet (A3 > A1 > A2 > A4 > A5), ledavstånd (400–3 000 m), dämpning eller tysta fönster.
- **Skuggmotorn** buntas och deployas i samma varv → skuggflottan börjar logga djurvarningar direkt, **före** appbygget. Då syns
  hur ofta och var rösten skulle tala, utan en enda förare.

### D. Apparnas visning och produktboken
- Källan i appen: *"Polisen"* → *"Trafikverket"*; raden *"Vilt rapporterat i området"* → *"Djur rapporterat på vägen"* (Android
  `ui/App.kt` rad 101 och 108, motsvarande i iOS).
- PRODUKTBOK: texten, källan och en skärmbild, i samma commit (PRODUKTBOKSREGELN).
- Invarianten, Data Safety och integritetssidan **oförändrade** — inget nytt lämnar telefonen.

### E. Ut till telefonerna
Android via CI med höjd version. iOS: Axel arkiverar. Före *"arkivera nu"*: ci, android och ios-engine gröna, byggnumret höjt i
samma commit som den sista ändringen, och commit-hashen i uppmaningen.

---

## Ordningen — vad varje telefon gör under tiden

| Efter | Gamla appar | Nya appar | Skuggflottan |
| :-- | :-- | :-- | :-- |
| A + B deployade | tysta för vilt (rätt enligt #13) | finns inte än | tyst för vilt |
| C deployad (skuggmotorn) | tysta | finns inte än | **loggar djurvarningar** — mätbart |
| E ute | tysta tills de uppdateras | **"Viltrisk framöver."** på Trafikverkets djur | loggar |

## Steg 0 — mät innan (en läsande körning)
1. **Volymen längs skuggrutterna:** hur många djurhändelser per dygn ligger inom 3 km från en rutt? Det är hur ofta rösten talar.
2. **Raderingar:** hur ofta tar Trafikverket bort en djurhändelse före sluttiden? (Kräver A för att synas framåt; bakåt går det att
   uppskatta ur arkivets `last_seen`.)
3. **Sträckor:** hur stor andel beskriver en sträcka mellan två trafikplatser (*"E6 från Trafikplats Kungsbacka C till Kungsbacka N"*)?
   Då ligger punkten vid ena änden och kan missa en bil som kör in mitt på sträckan.

## Öppna frågor
1. **Texten.** Exakt #266, *"Viltrisk framöver."* (Axels beslut 20/9) — eller djurslaget, *"Älg på vägen framöver."*? Trafikverkets
   text bär arten i 91 %. **Rekommendation:** #266 först; arten är ett eget textbeslut för Axel, när skuggflottan visat att arten
   läses rätt.
2. **Punkt eller sträcka.** Börja med punkten; mät i skuggan hur många sträckor som är längre än ledavståndet innan sträcklogik byggs.
3. **#32.** Kortet stängdes till våren i dag (DECISIONS #315). Det här gör djurhalvan av #32 nu; andra hinder och #15 kö-slut
   stannar på våren.

## Arbetet
| Del | Vem | Ungefär |
| :-- | :-- | :-- |
| Steg 0 | Claude | en körning |
| A + B med deploy och bevis | Claude | ett par timmar |
| C (tre portar, två vektorer, skuggmotorn) | Claude | ett halvt arbetspass |
| D (visning, produktbok) | Claude | en timme |
| E (bygge och uppladdning) | Axel (iOS), CI (Android) | ett Mac-varv |

**"På plats i motorn från nu"** betyder alltså: A–D kan byggas nu, och efter C talar skuggmotorn redan. Bara E kräver Axel.
