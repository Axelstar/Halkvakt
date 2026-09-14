# Integrationskartan — hur delarna blir en produkt, och var vi byggt emot den

**Skriven 2026-09-14 på Bengts order:** *"allt det här jobbet har haft ett enda syfte, att delarna
skulle integrera och tillsammans bli starkare … om vi i någon eller några delar har byggt fel så att
det motverkar det syftet vill jag att du särskilt pekar på det."*

Fokus på skuggans delar (#88–#95), men vattenplaningen (#42), snön (#45), broarna (#38/#91) och det
som redan står i motorn vägs in.

---

## 1. Vad produkten egentligen frågar

Allt vi byggt är proxyer för en enda fråga:

> **Hur halt blir det där jag är om två–tre minuter?**

Motorn i dag kan inte ställa den frågan, och skälet är strukturellt: **den har varken minne eller
räckvidd.** `engine.ts:50–54` bär prevFix, odometer, kurs, tystnadsklocka och fired-karta — noll om
vad ytan var för en timme sedan, och ingen uppfattning om hur långt en stations mätning gäller.

Varje bygge de senaste dygnen levererar **antingen minne eller räckvidd**. Det är den gemensamma
nämnaren, och den är också nyckeln till hur de ska sitta ihop.

---

## 2. Fem lager, och var varje del hör hemma

| Lager | Frågan lagret svarar på | Delar som bor här | Läge |
| :-- | :-- | :-- | :-- |
| **L1 TROVÄRDIGHET** | Får vi tro på mätvärdet? | #75 givarvakten · stationsvakten (#164) · G_tak (#163) · värdevakten · R-A5 | ✅ i drift |
| **L2 TILLSTÅND** | Vad **är** ytan? | tillståndsskattaren (#89 steg 2) · radarns `regn` (#81 C) · operatörens klass · **#45 våtbulb → regn/slask/snö** · **#42 vattenfilm** | 🔨 blöt/torr byggt, resten kvar |
| **L3 UTVECKLING** | Vart är den på **väg**? | trendarkivet (#88) · övergångarna (#89 a) · **#46 rimfrost** · N_varning (SMHI) | 🔨 mätt, ingen regel |
| **L4 RÄCKVIDD** | Hur långt **gäller** mätningen? | grind A:s ankare (#38b) · SMHI molnmängd (#95) · **#91 kallplatslagret** | ⚠️ **ankaret mätt och dugligt, knappen saknas** |
| **L5 ALLVAR & RÖST** | Vad **sägs**, och hur illa är det? | #153 sammanvägt allvar · spärren (#165) · #90 riskmodifierare | ⛔ **finns inte** |

**Ordningen är inte godtycklig.** L1 gatar allt. L2 och L3 multiplicerar varandra. L4 avgör hur långt
produkten av L2×L3 får sträckas. L5 är det enda ställe där något når föraren.

---

## 3. Varför det är en multiplikation och inte en summa

En blöt yta säger ingenting om framtiden. En fallande yta säger ingenting om halka utan väta. Men:

```
blöt (L2)  ×  faller mot noll (L3)  ×  mätningen gäller hit (L4)   =   en FÖRUTSÄGELSE
```

Var för sig är alla tre observationer. Tillsammans är de det enda i hela systemet som kan säga något
om en plats föraren ännu inte nått.

**Efterhalkan är beviset att det behövs.** `icing_point` kräver `moisture === true` — *"det regnar
just nu"*. Regnet slutar, fukten blir falsk inom tio minuter, ytan fortsätter falla. Steg 0 mätte
hålet: **76 % av regnstoppen hade regn i mätaren i samma stund motorn slog om till torrt**, median
35 minuter. Regeln kan alltså per konstruktion inte fyra i exakt det fönster efterhalkan inträffar.

L2 + L3 stänger det hålet. Det är den enskilt största vinsten som finns att hämta, och båda halvorna
är nu mätta och sparade.

---

## 4. Var vi har byggt **mot** syftet

Det här är den del Bengt bad om särskilt. Åtta punkter, ordnade efter hur mycket de hindrar.

### 4.1 Utgången väljer på SLAG, inte på ALLVAR — och kan bara säga en sak

Regel 1a: *"priority selects the single winner; everything else is dropped."* Prioriteten är en fast
ordning mellan **farslag** (A3 > A1 > A2 > A4 > A5), inte ett mått på hur illa det är.

**Följden:** ett segment som är halt OCH har isrisk OCH kraftigt regn låter **exakt likadant** som ett
som bara är halt. Hela poängen med L2×L3×L4 är en sammanvägd allvarsgrad — och utgångslagret kan inte
uttrycka allvar över huvud taget.

> **En integration som inte kan sägas finns inte för föraren.**

Kort #153 bär frågan. Ingenting är byggt. Det här är den enskilt största motkraften.

### 4.2 "En modellerad storhet får aldrig vara en avtryckare"

TROSKLAR-FRYSKLASSNINGEN §1. Regeln är skriven mot varningar som inte kan motbevisas av en mätning —
ett riktigt skäl. **Men varje integrerad storhet är per definition modellerad.** Tillstånd ×
utveckling × räckvidd ÄR en modell.

Tolkad bokstavligt förbjuder regeln alltså produkten. Den ser ut som stringens och är i själva verket
ett principiellt stopp. Kort #153 beslut 2 öppnade ett smalare undantag (radarn är en mätning;
interpolation mellan två eniga mätningar är inte extrapolation) — **men det är inte avgjort.**

### 4.3 Varje grind dömer sin del ENSAM. Det finns ingen grind för kombinationen

T-A/B/C, W-A/B/C, Ö-A/B/C/D, V-A/B, F-A/B, R-A…R-D, Å-A/B. Var och en har golv som delen ska klara
**för sig**.

**Men en del kan vara svag ensam och avgörande i kombination.** Och vi har redan gjort det felet:
**SMHI mättes som ANKARE och underkändes** (MAE 1,05 → 1,20). Men SMHI:s roll i modellen ovan är inte
ankare — den är **räckviddsknappen i L4**. Grinden svarade på en fråga ingen behövde svar på, och
nejet ligger nu på kortet som om SMHI vore avgjort.

> **Vi riskerar att underkänna produktens ingredienser en och en, på prov som ställer fel fråga.**

### 4.4 Trösklarna fryses per del — gemensam kalibrering är inte tillåten

§8-regimen i varje dokument: från första skuggkörningen ändras ingen tröskel. Det skyddar mot att
flytta målstolparna när siffrorna kommit — rätt regel.

**Men en kombinerad modell behöver kalibreras GEMENSAMT.** N (#89), fönstret (#88), gapet (#46) och
r (#42) väljs var för sig, för solo-prestanda. Ingen text säger hur en kombination får kalibreras,
och som reglerna står i dag får den inte det.

### 4.5 Täckningen MULTIPLICERAS — och krymper därmed

Mätt 14/9 över segmenttimmar:

| lager | täckning |
| :-- | --: |
| stationen har en mätning | 18,5 % |
| radarn har en åsikt | 13,1 % |
| **båda samtidigt** | **8,2 %** |

Varje lager som läggs till **krymper** populationen där alla lager talar. Kräver den integrerade
regeln alla lager fyrar den på några få procent av vägnätet.

> **Integrationen måste degradera graciöst — falla tillbaka på färre lager med lägre säkerhet —
> inte kräva alla.**

### 4.6 Mina egna två byggen bär spår av precis det felet

**(a) Skattaren kastar bort bevisets STYRKA.** `skatta()` returnerar `blöt | torr | okänt` — en enum.
Men en sammanvägd allvarsgrad behöver *hur* blöt: 20 minuter sedan 2 mm är något annat än fyra timmar
sedan 0,2 mm. Underlaget finns i `Underlag` och slängs i returvärdet. Det är en hård OCH-logik där
integrationen behöver en gradient.

**(b) Trendarkivet är ett superset av TRIGGERN, inte av FENOMENET.** Det sparar bara rader i bandet
1–6 °C med fallande yta. Det kan därför inte svara på hur snabbt ytan faller *under* noll, och inte
på när ytan börjar **stiga** — vilket kortet självt kallar *"skälet att tystna tidigare på
morgonen"*. För L3 vill man ha trenden överallt där tillståndet betyder något.

### 4.7 #45 lutar på en höjdkorrektion som #91 mätte till noll

#45:s metod: våtbulb per segment via **offsetmodell + höjdkorrektion** (lapse 0,71 °/100 m), för att
höjden flyttar snögränsen.

#91:s mätning 12/9: på 1 962 punkter återvinner höjdkorrektionen **exakt noll** (1,65 → 1,65 °C) och
gör det **sämre i två av fyra band**.

De två är inte samma storhet — #91 mätte **yttemperatur**, #45 använder **lufttemperatur**, och lapse
rate är fysikaliskt rimligare för luft. **Men ingenstans står det.** Ett dokument lutar på en
korrektion ett annat dokument har mätt emot, och ingen har skrivit varför det ändå går.

### 4.8 En sak gjordes RÄTT, och den är förebilden

**Rimfrosten (#46) blev en ANDRA GREN i `icing_point` — inte en sjätte farotyp.** Skälet som skrevs:
en sjätte `kind` hade rört varje vektor och hela prioritetsstegen.

Det är exakt rätt mönster för integration: **berika en befintlig faras underlag, lägg inte till
farslag.** Varje nytt slag gör regel 1a värre — fler konkurrenter om en enda plats i rösten.

---

## 5. Vad som minst måste finnas för att helheten ska lyfta

| # | Vad | Vems | Kostnad |
| :-- | :-- | :-- | :-- |
| **A** | **En allvarsskala** — kombinationen ändrar ordval/försprång/prioritet för den ENDA varning vi säger | Axels (rösten) | kort #153, ej byggt |
| **B** | **Bevisbärare i snapshoten** — varje fara bär vilka lager som talade och hur starkt, inte en boolean | delad | snapshotändring |
| **C** | **En grind för KOMBINATIONEN** vid sidan av per-delsgrindarna | mätningen, alltså vår | ett dokument |
| **D** | **En skriven regel för gemensam kalibrering** — tillägg till §8-regimerna | Bengt fastställer | ett stycke |
| **E** | **Graciös degradering** — skattaren returnerar nivå + bevis i stället för enum | min kod | liten |

**C och D är dokument och kan skrivas före frosten.** E är en liten ändring i min egen modul. A är
Axels och den tyngsta. B följer av A.

---

## 6. Vad som förblir osynligt oavsett allt ovan

En **snöby mellan stationerna** (bara radarn ser den, #43) och **om saltbilen passerat** (ingen öppen
källa). Båda är kända och står i förstudierna. De hör till kartans kanter, inte till dess mitt.

---

## 7. Den ärliga sammanfattningen

Delarna **är** byggda så att de kan integrera: de faller i fem lager utan att någon behöver skrivas
om, och varje del producerar en mätt storhet i stället för en dom — vilket är förutsättningen för att
de ska kunna vägas ihop senare.

**Men tre saker står i vägen, och två av dem är regler vi själva skrivit:** utgången kan inte uttrycka
allvar (4.1), modellerade storheter får inte utlösa (4.2), och grindarna dömer delar i stället för
kombinationer (4.3). Ingen av dem är ett kodfel. Alla tre är beslut, och alla tre är Bengts och Axels
att ompröva.

**RÄTTAT 14/9 EFTER BENGTS INVÄNDNING — jag citerade en överspelad mätning.** Första utkastet sade
att L4 var praktiskt tomt och att grind A hade fallit. **Det är fel.** Domen jag citerade (MAE 1,06,
grova 10,7 %) gäller körningen FÖRE #75:s givarvakt och marginalvakten. Med båda på plats
(DECISIONS #131, 1 943 punkter):

| band | MAE | grova > 2 °C | frysklassfel |
| :-- | --: | --: | --: |
| 0–7 km | **0,33 °C** | 0,0 % | 0,0 % |
| 7–15 km | 0,78 | 3,1 % | 0,0 % |
| 15–20 km | 0,85 | 6,4 % | 0,0 % |
| > 20 km | 0,89 | 5,4 % | 0,4 % |
| **totalt** | **0,85** | **5,1 %** | **0,3 %** |

**A1 KLARAR** (0,85 mot 1,0, marginal ±0,05) · **A2 OAVGJORT** (5,1 mot 5,0) · **A3 KLARAR**
(0,3 mot 10). Domen är ⏳ INGEN DOM — inte ett nej.

**Och anomalin är borta:** 0,33 · 0,78 · 0,85 · 0,89 **stiger monotont med ankaravståndet**, som
fysiken kräver. Det bandet som var sämst av alla fyra är nu näst bäst.

**Det ändrar L4 i grunden.** Ankaret är inte en tom ruta — det är en **mätt avståndsberoende
osäkerhetskurva**, och det är precis den storhet räckviddslagret behöver. Vad som saknas är inte
mekanismen utan **knappen**: vad som gör kurvan brantare eller flackare en enskild natt (moln, vind,
terräng). Vi har alltså inte "vid stationen, med minne" — vi har ett ankare vars fel vi känner som
funktion av avstånd, och saknar bara det som modulerar det.

**Det är fortfarande mycket mer än i dag.** Men det är inte produkten Bengt beskriver, och skillnaden
sitter i L4 och L5 — inte i det vi byggt de senaste dygnen.


---

## 8. Ett nej gäller en ROLL, inte en del

**Bengts invändning 14/9:** *"är det inte så att vi får lyfta in alla underkända och bedöma dem på
nytt — även om de förlorade per se har de något att bidra med i det sammanvägda."*

Det är rätt, och prejudikatet finns redan i protokollet: **kamerorna** underkändes som täckning
(744 st, 99 % inom 1 km från en station, Norrlands lucka oförändrad) — och blev **bildfacit**, en av
tre facitkällor systemet i dag vilar på. Samma del, annan roll, avgörande värde.

**Men principen behöver en broms, annars blir den ett sätt att aldrig ta ett nej:**

> Ett underkännande gäller den **fråga som ställdes**. En del får prövas i en ny roll — men den nya
> rollen kräver en **ny fråga, skriven före mätningen, med egen grind**. Ingen del återinförs på hopp.

### De sju underkända, och deras obesvarade fråga i helheten

| Del | Vad som underkändes (mätt) | Obesvarad fråga i det sammanvägda |
| :-- | :-- | :-- |
| **SMHI** | som ANKARE: MAE 1,05 → 1,20 | som **räckviddsknapp** (L4): gör molnmängden grind A:s felkurva brantare klara nätter? Aldrig mätt |
| **Höjden** | återvinner noll på YTtemperatur | (a) #45 använder **luft**, inte yta — annan storhet. (b) förutsäger höjden **var modellen är opålitlig** i stället för att korrigera medelvärdet? |
| **Kamerorna** | som TÄCKNING: 6 av 744 ger nytt ankarläge | ✅ redan omrollad till **bildfacit** — prejudikatet |
| **RH-guarden** | som FILTER: fuktigheten stiger efter regn | den **stigningen** är i sig ett tillstånd — förutsättningen för kondensation och rimfrost (#46) |
| **Operatörens "Våt"** | som PROXY: omätbar eftersläpning | som **facit** i stället för indata — samma skifte som kamerorna gjorde |
| **`rate_max`** | som VÄRDE: 727 mm/h, spärrat | **kvoten max/mean** är en formsignal: konvektiv skur mot frontregn. Exakt vad #45 behöver för att skilja lokal snöby från utbrett regn |
| **Radarns bidrag** | växer inte med avståndet (platt ~1,5 %) | mätt där en station står **6,7 km** bort i median. Radarns roll är **upplösning per sträcka**, inte mer väta — aldrig mätt som det |

**Två av dem har dessutom en mätbar fråga som inte kräver vinter:** höjden som varianspredikator och
radarns segmentupplösning. Båda kan ställas mot befintligt arkiv.

**Och en varning som följer av samma logik:** #100:s dämpning och den breda SMHI-regeln underkändes
också — men deras kärnor flyttades redan (till #153 respektive `N_varning`). Det är formen: **nejet
stänger rollen, kärnan flyttar.** Det som inte får hända är att en kärna stryks utan att någon frågar
vart den tog vägen.
