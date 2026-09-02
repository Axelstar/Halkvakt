# Vattenplaningsvarningen — förstudie (kort #42)

*2026-09-01, Claude på Bengts beställning. Underlag för Axels ja/nej på kortet.
Allt märkt VERIFIERAT är kollat mot vår kod eller våra körningar idag; allt märkt
ATT VERIFIERA är antaganden som måste bevisas innan de får bära kod.*

## 1. Vad varningen ska fånga — och vad den aldrig kan veta

Vattenplaning kräver tre saker samtidigt: **vattenfilm** på vägbanan, **fart**
(risken börjar på allvar runt 70–80 km/h) och däckens skick. Vi kan aldrig mäta
vattenfilmen på metern där bilen är, och vi vet inget om däcken. Det vi kan bygga
är alltså en **risk**-varning av samma slag som frostmodellen: proxies med kända
felkällor, konservativa trösklar, tystnad som standard.

Tumreglerna ur litteraturen (att källbelägga i tröskeldokumentet innan de fryses):
risk för full vattenplaning vid vattenfilm ≥ ~2,5–4 mm i kombination med fart
över ~80 km/h; delvis vattenplaning (styrkänsla försvinner) tidigare. Djupa
hjulspår håller kvar vatten långt efter att regnet slutat — därför är spårdjupet
lika viktigt som regnet.

## 2. Datakällorna, ärligt sorterade

**A. Regnet — VViS-stationerna.**
- VERIFIERAT: vår ingester (`ingest/sources/weather.ts`) lagrar idag regn som
  **ja/nej** (`Aggregated10minutes.Precipitation` → boolean `rain`) plus typsträng.
  Ingen mängd, ingen intensitet.
- ATT VERIFIERA (steg 0): WeatherMeasurepoint 2.1 bär enligt schemat även
  regnmängd (RainSum o.dyl. i 10/30-minutersaggregaten). Bevisas med en
  provfråga i CI (containern når inte TRV — nätpolicyn), inte med dokumentation:
  RoadNumber-läxan från i morse gäller.
- KONSEKVENS REDAN NU: eftersom mängden inte lagras går höstregnens facit
  förlorat varje vecka vi väntar. Kolumnen är billig (samma rader — vi arkiverar
  redan varje nederbördsobservation via `isInteresting`, så radantalet växer inte;
  fritier-budgeten påverkas inte nämnvärt). **Steg 0 lönar sig oavsett om
  varningen sedan byggs eller inte.**

**B. Var vattnet blir stående — spårdjupet.**
- ATT VERIFIERA: Trafikverkets vägytemätningar (spårdjup per delsträcka) finns i
  Lastkajen. Tre frågor före löfte: licens (öppna data?), format (går det att
  klippa mot vårt 818-segmentskelett?), färskhet (mäts per väg vart 1–3 år —
  gott nog, spår flyttar sig långsamt).
- Utan spårdjup går varningen ändå att bygga på enbart regnintensitet, men
  skuggan får då visa om falsklarmen blir för många på slät ny asfalt.

**C. Farten — på enheten.**
- VERIFIERAT: motorn har redan fartdata per fix och en fartspärr
  (`minSpeedKmh`, `engine/src/engine.ts`) med delade testvektorer. En
  vattenplaningsgrind ≥ ~70 km/h är en konfigrad, inte ny arkitektur. Inget
  lämnar telefonen — invarianten orörd.

**D. Grov gratisnivå — SMHI.**
- VERIFIERAT: vi lagrar redan SMHI:s impact-varningar (alla typer,
  `smhi_warnings`). Ett SMHI-regnvarningsområde är en kvalitetssäkrad men grov
  signal — kandidat som extra villkor (höj tröskeln när SMHI är tyst) snarare
  än egen trigger.

**E. Facit för skuggan.**
- VERIFIERAT: `situation_archive` tar sedan igår emot stoppade fordon och
  olyckor med position och tid — olyckor i regnväder blir mätbara. Och
  kamerornas VViS-samlokalisering, som var en besvikelse för ankartätheten, är
  här en **styrka**: varje regnobservation har en kamerabild från exakt samma
  punkt. Skuggflottan arkiverar redan bild vid larm.

## 3. Motorbygget (skiss, byggs först efter tröskeldokument)

Ny `HazardKind` enligt bro-mönstret (#38a): snapshotbyggaren räknar fram
risksegment/punkter ur regn (+ ev. spårdjup), motorn grindar på fart, texts.ts
får frasen. Punktkälla ⇒ invarianten tvingar **"framöver"**, aldrig avstånd:
*"Kraftigt regn framöver — risk för vattenplaning. Sänk farten."* Tre körtider,
delade vektorer med mätt marginal (5-metersregeln), prioritetsplats i A-skalan
= Axels beslut.

## 4. Största risken: regnceller är små, stationsnätet är glest

Ankartätheten är densamma som frostmodellens (median 6,8 km till station,
uppmätt igår) — men **konvektiva sommarskurar är mer lokala än utstrålningsfrost**.
En skur mellan två stationer missas helt; en skur över stationen ger larm milen
runt. Detta är exakt vad skuggan ska mäta, och det är analysens starkaste skäl
att inte lova något förrän grindarna dömt. (SMHI:s radar/Nowcast vore den riktiga
lösningen på cellproblemet, men den är prognosdata — samma beslutsklass som
blixthalkan #16, medvetet parkerad.)

## 5. Mätbarheten — kortets bästa egenskap

Till skillnad från halkan behöver skuggan **inte vänta på vintern**: det regnar
i september. Ordningen enligt huslagen:

0. **RainSum-kolumnen** (efter API-bevis i CI) — facit börjar ticka direkt.
1. Spårdjupsverifieringen (licens/format/färskhet ur Lastkajen).
2. **Tröskeldokument** à la TROSKLAR-SKUGGAN: mm/h-tröskel, stationsavstånd,
   spårdjupströskel, fartgrind, falsklarms-/missgrindar — med binomialbruset
   redovisat som förra gången.
3. Skuggkörning i höstregnen, dom mot grindarna.
4. Först därefter röst — om domen håller.

## 6. Vad som talar emot

- Uppdateringskön är redan bestämd: kö-slut (#15) är uppdatering 1, blixthalka
  (#16) uppdatering 2. Var #42 sorteras in är Axels beslut, och inget här ska
  tränga före lanseringsarbetet.
- Falsklarmsrisken är strukturellt högre än frostens (cellproblemet, §4) —
  varningen kan visa sig obyggbar med gott samvete. Då har vi ändå fått
  regnarkivet (steg 0) och ett dokumenterat nej, vilket är husets billigaste utfall.
- Ingen ny extern tjänst, inga nya kostnader; allt ryms i befintliga källor och
  fritier. (Lastkajen kräver konto — gratis, ATT VERIFIERA.)

## Rekommendation

Steg 0 är riskfritt och lönsamt oavsett utfall — det enda som behöver Axels ja
*nu*. Steg 1–4 väntar bakom kortets nyckel som tavlan redan anger: rösttext,
plats i A-skalan och ordning mot #15/#16.

## 7. Granskning vid andra läsningen (1/9 kväll, Bengts beställning)

Fyra luckor hittade när förstudien lästes kritiskt — de är inarbetade i
körschemat i §8:

1. **RainSum-beviset var underspecificerat.** Ett fält kan finnas i schemat och
   ändå vara null på flertalet stationer (alla VViS har inte mängdgivare).
   Beviset ska mäta TÄCKNING: hur många av 845 stationer levererar numerisk
   mängd — inte bara att fältet svarar.
2. **Cellproblemet (§4) lämnades okvantifierat i onödan.** Regnets
   dekorrelationslängd kan mätas I DAG ur arkivets befintliga ja/nej-flaggor:
   hur ofta regnar det på station A men inte grannen B, per avståndsband?
   Det är vattenplaningens motsvarighet till grind A:s felkarta och kräver
   varken RainSum eller ny data.
3. **Falsklarmsdefinitionen saknades.** "Regn utan olycka" är INTE falsklarm —
   korrekta riskvarningar följs sällan av olyckor. Tröskeldokumentet behöver
   sin egen asymmetriregel (kandidat: bara en station som i efterhand visar
   att tröskeln aldrig nåddes, eller kamerabild med torr väg, får fälla).
4. **Vinterinteraktionen saknades.** Snöslask kan trigga både halk- och
   vattenplaningsvarning på samma segment. Vem vinner i A-skalan, och ska
   vattenplaningen vila när vintervarning är aktiv? Axel-beslut som hör hemma
   i tröskeldokumentet, inte i december.

## 8. Körschema (fastlagt 1/9 kväll; ägare: Bengt, issue #15)

| Steg | Vad | Vecka | Ägare | Släpper vidare när |
|---|---|---|---|---|
| 0a | RainSum-bevis i CI **med täckningsmätning** + mängdkolumn i båda ingestvägarna | v.36 | Axels ja → Claude | Mängd bevisad; facit börjar ticka |
| 0b | Cellmätningen ur befintliga ja/nej-flaggor (dekorrelation per avståndsband) | v.36–37 | Claude (olåst mätning) | Siffra på missrisken mellan stationer |
| 1 | Lastkajen-rekognosering: licens, format, färskhet för spårdjup | v.37 | Bengt (konto) + Claude | Beslutspunkt: med spårdjup, eller utan med högre regntröskel |
| 2 | TROSKLAR-VATTENPLANING: regn-/avståndströskel, fartgrind, falsklarmsdefinition (§7.3), vinterinteraktion (§7.4), radar-observationsfrågan | v.38–39 | Bengt fäller värden, Axel fastställer | Dokumentet i repot FÖRE all kod |
| 3 | Grind V-A: LOO-prövning av "regn framöver"-påståendet mot arkivet, knapp à la grind-a med domspärr | v.39–40 | Claude | Klarar → skugga; faller → dokumenterat nej |
| 4 | Skuggkörning i höstregnen (kolumn i skuggmotorn, buntad ur engine/src) | okt–nov | Claude bygger, Bengts söndagsrutin läser | Grindarna ur steg 2 |
| 5 | Dom + ev. röst: HazardKind i tre motorer, delade vektorer, produktbok | nov/dec | Axel dömer, Claude bygger | Endast om domen håller |

Kritisk stig: **0a** — varje regnvecka utan mängdkolumn är förlorat facit, och
oktoberstormarna är skuggsäsongen. Allt före steg 5 är mätning; ingen app-kod rörs.
