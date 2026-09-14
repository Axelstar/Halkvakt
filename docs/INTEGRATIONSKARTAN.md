# Integrationskartan

**Hur delarna blir en produkt, var vi byggt emot den, hur det nya greppar i motorn som redan kör,
och vad allt underkänt lämnade kvar.**

Det här är det enda dokumentet över hur Halkvakts delar hänger ihop. Allt som rör integrationen står
här: lagren, multiplikationen, **motorn som den faktiskt ser ut**, **fogarna där en skuggdel kan
greppa**, motkrafterna, principen för hur en del döms, och registret över allt som strukits, stängts
eller flyttats. Ligger något om helheten någon annanstans är det ett fel.

Fokus på skuggans delar (#88–#95), men vattenplaningen (#42), snön (#45), broarna (#38/#91) och det
som redan står i motorn vägs in. Beslutens historik — vad som rättats och när — ligger i DECISIONS
(#159, #180, #181, #182) och sammanfattas i §13. Brödtexten säger vad som *gäller*, inte vad som
ändrats.

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
| **L4 RÄCKVIDD** | Hur långt **gäller** mätningen? | grind A:s ankare (#38b) · SMHI molnmängd (#95) · **#91 kallplatslagret** | ⚠️ ankaret mätt och dugligt, **knappen saknas** |
| **L5 ALLVAR & RÖST** | Vad **sägs**, och hur illa är det? | #153 sammanvägt allvar · spärren (#165) · #90 riskmodifierare | ⛔ **finns inte** |

**Ordningen är inte godtycklig.** L1 gatar allt. L2 och L3 multiplicerar varandra. L4 avgör hur långt
produkten av L2×L3 får sträckas. L5 är det enda ställe där något når föraren.

Var varje enskild del måste greppa i den motor som redan kör står i **§5.4**.

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

## 4. Motorn som den faktiskt ser ut i dag

Kartan ovan är skriven från skuggans sida. Det här är den andra sidan — inte som minne, utan läst ur
koden: `engine/src/{types,engine,snapshot,texts}.ts`, 588 rader, och den publicerade `live.json`.

### 4.1 Fem farslag, en fast stege — och vad var och en kvalificerar på

| Prio | `kind` | Källa | Villkoret i dag | Vilka lager det använder |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `accident` (A3) | TRV Situation/Deviation | avstånd ≤ **10 km**; `SeverityCode ≥ 5` ⇒ två steg (10 km "överväg annan väg", 2 km "sakta ner") | — |
| 2 | `slippery_segment` (A1) | TRV RoadCondition | `code ≥ 2` **eller** `info` matchar `is\|snö\|halka\|frost\|mycket besvärligt` | **L2** (operatörens klass) |
| 3 | `icing_point` (A2) | WeatherMeasurepoint | `yta ≤ 1 °C` (bro: ≤ 3) **OCH** `fukt === true` | **L1** + en **binär L2** |
| 4 | `wildlife` (A4) | polisen, senaste 48 h | inget utöver korridor + ledsträcka | — |
| 5 | `camera` (A5) | TrafficSafetyCamera | ≤ **500 m**, `bearing+180°` inom **60°** av kursen | — |

Talen som styr allt annat (`DEFAULT_CONFIG`): korridor **±35°**, minsta fart **15 km/h**, global spärr
**10 s** (prioritetsmedveten sedan #127), upprepning **600 s OCH 5 000 m**, ledtid **30 s** klämd till
**400–3 000 m**, segmentsampling **100 m**.

### 4.2 Vad motorn inte har — och varför "räckvidd" betyder två olika saker

- **Inget minne om vägen.** Odometern och fired-kartan minns *rösten*, inte ytan. Ingen struktur bär
  vad en station visade för en timme sedan.
- **Ingen allvarsgrad.** Prioriteten är en ordning mellan *slag*, inte ett mått på hur illa det är
  (§7.1).
- **Ingen giltighetsradie.** Det enda avståndsbegrepp motorn har är `leadM` = fart × 30 s, klämt till
  400–3 000 m.

Den sista punkten är den viktigaste, och den är lätt att läsa fel: **`leadM` mäter förarens fart, inte
mätningens giltighet.** Grind A:s felkurva (§6.1) mäter något helt annat — hur fel ett ankarvärde blir
på 7, 15, 20 km. Två storheter, samma ord. Motorn har i dag bara den första, och den säger ingenting
om huruvida stationens `yta` över huvud taget gäller där föraren är.

### 4.3 Ledningen, hela vägen

```
snapshot-core.ts (Supabase)
   → live.json + static.json på CDN   (manifest.json bär sha256; app förkastar fel summa)
      → SnapshotRepo  (Android: org.json · iOS: JSONSerialization)
         → snapshotToHazards()        (adaptern — 1:1 i tre språk)
            → AlertEngine.step(fix)   (kvalificering → regel 2 → regel 1a → regel 1b)
               → alertText()          → rösten
```

Uppmätt i den publicerade `live.json` 14/9 05:10: **28 väderstationer, 1 avvikelse, 1 viltpunkt,
0 segment, 0 broar, 0 SMHI-ytor.** September — motorn har alltså i praktiken bara `icing_point` och
kamerorna att arbeta med just nu.

---

## 5. Fogarna — var en skuggdel kan greppa, och vad den kostar

Frågan *"hur ska det som ligger i skuggan sömlöst kunna länkas ihop med det som kör?"* har ett exakt
svar: motorn har **fem** ställen där något nytt kan fästa, och de kostar dramatiskt olika mycket.

### 5.1 De fem fogarna

| Fog | Var | Vad som ändras | Vektorer som måste göras om | Portar |
| :-- | :-- | :-- | --: | --: |
| **F1** | `live.json` / `static.json` (`snapshot-core.ts`) | ett nytt fält på en rad | **0** | **0** |
| **F2** | `snapshotToHazards()` | fältet läses in | 0 | 3 |
| **F3** | `PointHazard.meta` / `SegmentHazard.meta` | ny nyckel i typen | 0 | 3 |
| **F4** | `evaluatePoint()` / `evaluateSegment()` | **villkoret** ändras | **6 is / 3 segment** | 3 |
| **F5** | `PRIORITY`, regel 1a/1b, `alertText()` | ordningen eller rösten | **23 (alla)** | 3 |

F4:s tal är räknade, inte gissade — men de ska läsas rätt: de är antalet vektorer som
**innehåller** en fara av det slaget, alltså en **övre gräns** för vad en regeländring kan rubba.
Sex bär en `icing_point` (v08, v09, **v11**, v18, v19, v23), tre ett `slippery_segment` (v04, v07,
**v11**). Hur många som faktiskt vänder beror på ändringen — se §5.6.

**v11 är grinden som betyder något.** `v11_silent_drive` bevisar *tystnad* — den bär både en
isvärnpunkt och ett segment som måste förbli tysta. Varje **vidgning** av L2 (skattaren säger "blöt"
där `fukt` var falskt) får v11 att tala. Och husregeln är absolut: *en vektor försvagas aldrig för att
få ett bygge grönt.* Alltså är v11 den verkliga tröskeln för hela tillståndslagret — inte en
formalitet, utan platsen där påståendet "det här är en förbättring" måste bevisas.

### 5.2 Fogen läcker redan: publicerat men oläst

| Fält som publiceras | Läses av motorn? | Följd |
| :-- | :-- | :-- |
| **`segments[].regn`** — radarns mm/h per segment (#81 C) | **NEJ.** Finns inte ens i `LiveDoc`-typen | **Radarlagret ligger redan i telefonen och kastas vid adaptern** |
| `smhi[]` | NEJ — deklarerat `unknown[]`, *"map/UI layer"* | SMHI når appen men inte motorn |
| `segments[].road` | deklarerat, men adaptern lägger det aldrig i `meta` | segmentrösten kan inte säga vägnummer |
| `deviations[].typ` · `wildlife[].art` · `cameras[].road` | deklarerade, aldrig lästa | — |
| `meta.speedLimitKmh` | rösten *kan* säga den, men adaptern fyller den aldrig | kamerorna säger alltid den **korta** raden — den fältverifierade |
| `meta.active` (vilt, säsong × timme) | aldrig satt ⇒ alltid `true` | grinden är **sovande, inte trasig**: dagens källa är färska polisanmälningar (< 48 h), inte historiska hotspots |

**Det här är den enskilt mest användbara upptäckten i hela kartan.** Den första riktiga
integrationen — radarns väta × operatörens klass på samma segment — kräver **ingen ny publicering
alls.** Fältet skrivs redan. Det som saknas är F2 + F3 + F4.

### 5.3 Regeln som gör länkningen sömlös: lägg till, ersätt aldrig

Båda portarna läser snapshoten **otypat**: Android via `org.json.JSONObject`, iOS via
`JSONSerialization` → `[String: Any]`. Okända nycklar ignoreras alltså per konstruktion. **F1 är
därför gratis: ett nytt fält i `live.json` kan inte fälla en installerad app.**

Men samma egenskap gör motsatsen livsfarlig:

> **LÄGG TILL. ERSÄTT ALDRIG.**
> Android läser `w.optBoolean("fukt", false)`. Byts `fukt` mot en graderad nivå försvinner nyckeln,
> defaultvärdet blir `false`, och **varje app som inte uppdaterats tystnar på is** — utan
> felmeddelande, utan checksummefel, utan ett spår i någon logg. Ett fält som en publicerad app läser
> är ett **kontrakt**. Nya lager läggs BREDVID det, aldrig i stället för det.

Det är den regeln som gör skillnaden mellan en sömlös länkning och en tyst katastrof, och den är
samma familj som gravstensläckan och den halverade kassavakten: **ett fel som gör systemet tystare
syns inte av sig självt.**

### 5.4 Vad varje skuggdel greppar i

| Del | Lager | Greppar i | Ersätter? | Tyngsta kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **Radarns `regn`** (#81 C) | L2 | F2+F3+F4 — **redan publicerat** | nej, nytt villkor vid sidan | 3 segmentvektorer |
| **Tillståndsskattaren** (#89 steg 2) | L2 | F1 `weather[].tillstand` + F3 + F4 | **nej — bredvid `fukt`** | 6 isvektorer, **v11 är grinden** |
| **Trendarkivet** (#88) | L3 | F1 `weather[].lutning` + F3 + F4 | nej | 6 isvektorer |
| **Grind A:s ankare** (#38b) | L4 | F1 `weather[].osakerhet` + F3 + F4 | nej | F4 — **och att `leadM` slutar vara motorns enda avståndsbegrepp** (§4.2) |
| **#46 rimfrost** | L3 | F3+F4 — **redan gjort**, som andra gren i `icing_point` | nej | klar; förebilden (§7.8) |
| **#45 snö/slask** | L2 | F1 + F3 + F4 | nej | 6 isvektorer — **och frestelsen att göra det till ett sjätte slag måste avvisas** (§7.8) |
| **#42 vattenplaning** | L2 | F1 + F3 + F4 | nej | 6 isvektorer |
| **#91 kallplatslagret** | L4 | F1 på `weather[]` + F3 + F4 | nej | 6 isvektorer |
| **SMHI `N_varning`** (#95) | L3/L4 | F2+F3+F4 — **`smhi[]` publiceras redan** | nej | 6 isvektorer |
| **#153 allvarsskalan** | L5 | **F5** | ja — rösten och stegen | **23 vektorer, tre portar** |

Trendarkivets fog är extra billig av ett skäl värt att skriva ut: `trend_kandidater` är nycklad på
`station_id`, **samma nyckel som `live.json`:s `weather[].id`**. Ingen ny sammanfogningslogik behövs —
bara en kolumn till i den fråga som redan bygger `weather`-raden.

Mönstret som faller ut: **allt utom #153 är additivt.** Nio av tio delar kan greppa utan att röra
prioritetsstegen eller rösten. Det är inte en slump — det är §7.8:s lärdom tillämpad, och den är
anledningen till att arbetet i skuggan faktiskt går att landa.

### 5.5 Repetitionsscenen finns redan — och den tvingar fram en ordning

`scripts/bundle-skuggmotor.ts` buntar `engine/src/*.ts` **ordagrant** in i skuggfunktionen, och både
`ci` och `deploy-supabase` kör `--check` på att bunten är i synk. **Skuggmotorn är alltså inte en
kopia av motorn — den är motorn**, med samma adapter och samma regler, körd mot verklig trafik.

Det ger varje F2/F3/F4-ändring en plats att bevisas på innan den når en telefon. Men det lägger också
en ordning som inte går att kringgå: **skuggan läser samma `live.json` som apparna.** Ett fält som
inte publicerats finns inte heller för skuggan.

> **Sekvensen för varje ny länk:**
> **(1) F1** — publicera fältet. Ofarligt, ignoreras av alla appar, bevisas med manifestets sha.
> **(2) mät i skuggan** — F2+F3 in, villkoret av, se vad fältet *skulle* ha ändrat.
> **(3) F4** — ändra villkoret, gör om de berörda vektorerna, bevisa att v11 fortfarande tiger.
> **(4) tre portar** — Kotlin och Swift speglar, vektorerna går byte-för-byte.
>
> F1 ligger alltid **minst ett varv före** F4. Görs de i samma varv finns ingen mätning som skiljer
> "regeln blev bättre" från "fältet blev tillgängligt".

---

### 5.6 Vad §4 och §5 vilar på — och vad de inte bevisar

Kartans två motorparagrafer är **lästa ur koden, inte körda**. Det är en starkare grund än minne och
en svagare än en mätning, och skillnaden ska stå skriven här och inte upptäckas senare.

| Påstående | Vad det vilar på | Vad det inte bevisar |
| :-- | :-- | :-- |
| §4.1 villkor och tal | `engine/src/{types,engine}.ts` lästa i sin helhet | — detta ÄR koden |
| §4.3 ledningen | `snapshot-core.ts` → `publicera` → `SnapshotRepo` → `snapshot.ts`, lästa | att alla tre portarna beter sig lika i drift; bara vektorerna bevisar det |
| §4.3 talen 28/1/1/0/0/0 | den publicerade `live.json` hämtad 14/9 05:10 | något om vintern — i september är materialet nästan tomt |
| §5.1 vektortalen 6/3/23 | filsökning efter `icing_point` respektive `slippery_segment` i `engine/vectors/` | **att alla sex faktiskt vänder.** En vektor som BÄR en fara kan mycket väl ge samma utfall efter ändringen. Talet är ett tak, inte en kostnad |
| §5.2 oläst-listan | fält för fält mellan publiceraren och `LiveDoc`/adaptern | att inget ANNAT läses fel — listan är över det som publiceras, inte en revision av motorn |
| §5.3 otypad läsning | `org.json.JSONObject` i `SnapshotRepo.kt`, `JSONSerialization` i `SnapshotRepo.swift` | att en FRAMTIDA port gör likadant. Byts någon port till typad avkodning faller §5.3:s premiss, och F1 slutar vara gratis |

**Kostnadskolumnerna mäter FOG, inte arbete.** Att en del "bara" kostar F4 säger var den greppar —
inte hur svår regeln är att formulera, och inte hur lång mätningen blir innan den får ändras.
Tillståndsskattaren och kallplatslagret har samma fog och helt olika vägar dit.

**Det enda som gör talen till kostnader är att köra dem.** Sekvensen i §5.5 steg 3 är därför inte
byråkrati: den är stället där "sex vektorer" blir ett verkligt tal i stället för ett tak.

---
## 6. Var lagren står, mätt

### 6.1 L4 är inte tomt — ankaret är en mätt osäkerhetskurva

Grind A (offsetmodellen) med både givarvakten (#129) och marginalvakten (#126/#128), DECISIONS #131,
1 943 punkter:

| band | MAE | grova > 2 °C | frysklassfel |
| :-- | --: | --: | --: |
| 0–7 km | **0,33 °C** | 0,0 % | 0,0 % |
| 7–15 km | 0,78 | 3,1 % | 0,0 % |
| 15–20 km | 0,85 | 6,4 % | 0,0 % |
| > 20 km | 0,89 | 5,4 % | 0,4 % |
| **totalt** | **0,85** | **5,1 %** | **0,3 %** |

**A1 KLARAR** (0,85 mot 1,0, marginal ±0,05) · **A2 OAVGJORT** (5,1 mot 5,0) · **A3 KLARAR**
(0,3 mot 10). Domen är ⏳ **INGEN DOM** — uttryckligen *inte ett nej*.

**Talen stiger monotont med ankaravståndet:** 0,33 · 0,78 · 0,85 · 0,89 — som fysiken kräver. Det
bandet som en gång var sämst av alla fyra är nu näst bäst.

Det betyder att räckviddslagret inte saknar en mekanism. Det har **en avståndsberoende felkurva som
faktiskt är uppmätt** — precis den storhet L4 behöver. Vad som saknas är **knappen**: vad som gör
kurvan brantare eller flackare en enskild natt (moln, vind, terräng). Vi har alltså inte bara "vid
stationen, med minne" — vi har ett ankare vars fel vi känner som funktion av avstånd, och saknar bara
det som modulerar det.

### 6.2 Täckningen multipliceras — och krymper därmed

Mätt 14/9 över segmenttimmar:

| lager | täckning |
| :-- | --: |
| stationen har en mätning | 18,5 % |
| radarn har en åsikt | 13,1 % |
| **båda samtidigt** | **8,2 %** |

Varje lager som läggs till **krymper** populationen där alla lager talar. Kräver den integrerade
regeln alla lager fyrar den på några få procent av vägnätet. Det är inte ett argument mot
integrationen — det är kravet att den måste **degradera graciöst** (§8 E).

---

## 7. Var vi har byggt **mot** syftet

Åtta punkter, ordnade efter hur mycket de hindrar.

### 7.1 Utgången väljer på SLAG, inte på ALLVAR — och kan bara säga en sak

Regel 1a: *"priority selects the single winner; everything else is dropped."* Prioriteten är en fast
ordning mellan **farslag** (A3 > A1 > A2 > A4 > A5), inte ett mått på hur illa det är.

**Följden:** ett segment som är halt OCH har isrisk OCH kraftigt regn låter **exakt likadant** som ett
som bara är halt. Hela poängen med L2×L3×L4 är en sammanvägd allvarsgrad — och utgångslagret kan inte
uttrycka allvar över huvud taget.

> **En integration som inte kan sägas finns inte för föraren.**

Kort #153 bär frågan. Ingenting är byggt. Det här är den enskilt största motkraften — och den enda
delen i hela kartan som kräver **F5**, alltså alla 23 vektorer och tre portar (§5.4).

### 7.2 "En modellerad storhet får aldrig vara en avtryckare"

TROSKLAR-FRYSKLASSNINGEN §1. Regeln är skriven mot varningar som inte kan motbevisas av en mätning —
ett riktigt skäl. **Men varje integrerad storhet är per definition modellerad.** Tillstånd ×
utveckling × räckvidd ÄR en modell.

Tolkad bokstavligt förbjuder regeln alltså produkten. Den ser ut som stringens och är i själva verket
ett principiellt stopp. Kort #153 beslut 2 öppnade ett smalare undantag (radarn är en mätning;
interpolation mellan två eniga mätningar är inte extrapolation) — **men det är inte avgjort.**

### 7.3 Varje grind dömer sin del ENSAM. Det finns ingen grind för kombinationen

T-A/B/C, W-A/B/C, Ö-A/B/C/D, V-A/B, F-A/B, R-A…R-D, Å-A/B. Var och en har golv som delen ska klara
**för sig**.

**Men en del kan vara svag ensam och avgörande i kombination.** Och vi har redan gjort det felet:
**SMHI mättes som ANKARE och underkändes** (MAE 1,05 → 1,20). Men SMHI:s roll i modellen ovan är inte
ankare — den är **räckviddsknappen i L4**. Grinden svarade på en fråga ingen behövde svar på, och
nejet ligger nu på kortet som om SMHI vore avgjort.

> **Vi riskerar att underkänna produktens ingredienser en och en, på prov som ställer fel fråga.**

Motmedlet är §9 — och den grind för kombinationen som §8 C beställer. Grinden för kombinationen har
dessutom en färdig mätplats: **skuggmotorn** (§5.5).

### 7.4 Trösklarna fryses per del — gemensam kalibrering är inte tillåten

§8-regimen i varje tröskeldokument: från första skuggkörningen ändras ingen tröskel. Det skyddar mot
att flytta målstolparna när siffrorna kommit — rätt regel.

**Men en kombinerad modell behöver kalibreras GEMENSAMT.** N (#89), fönstret (#88), gapet (#46) och
r (#42) väljs var för sig, för solo-prestanda. Ingen text säger hur en kombination får kalibreras,
och som reglerna står i dag får den inte det.

### 7.5 Skattaren kastar bort bevisets STYRKA

`skatta()` returnerar `blöt | torr | okänt` — en enum. Men en sammanvägd allvarsgrad behöver *hur*
blöt: 20 minuter sedan 2 mm är något annat än fyra timmar sedan 0,2 mm. Underlaget finns i `Underlag`
och slängs i returvärdet. Det är en hård OCH-logik där integrationen behöver en gradient.

Felet har dessutom en fog-konsekvens: en **enum** kan bara ersätta `fukt`:s booleska roll, medan en
**gradient** kan läggas bredvid den — alltså är §8 E inte bara en förfining, den är förutsättningen
för att följa "lägg till, ersätt aldrig" (§5.3). Mitt eget bygge, min egen fix.

### 7.6 Trendarkivet är ett superset av TRIGGERN, inte av FENOMENET

Det sparar bara rader i bandet 1–6 °C med fallande yta. Det kan därför inte svara på hur snabbt ytan
faller *under* noll, och inte på när ytan börjar **stiga** — vilket kortet självt kallar *"skälet att
tystna tidigare på morgonen"*. För L3 vill man ha trenden överallt där tillståndet betyder något.

### 7.7 #45 lutar på en höjdkorrektion som #91 mätte till noll

#45:s metod: våtbulb per segment via **offsetmodell + höjdkorrektion** (lapse 0,71 °/100 m), för att
höjden flyttar snögränsen.

#91:s mätning 12/9: på 1 962 punkter återvinner höjdkorrektionen **exakt noll** (1,65 → 1,65 °C) och
gör det **sämre i två av fyra band**.

De två är inte samma storhet — #91 mätte **yttemperatur**, #45 använder **lufttemperatur**, och lapse
rate är fysikaliskt rimligare för luft. **Men ingenstans står det.** Ett dokument lutar på en
korrektion ett annat dokument har mätt emot, och ingen har skrivit varför det ändå går.

### 7.8 En sak gjordes RÄTT, och den är förebilden

**Rimfrosten (#46) blev en ANDRA GREN i `icing_point` — inte en sjätte farotyp.** Skälet som skrevs:
en sjätte `kind` hade rört varje vektor och hela prioritetsstegen.

I fogarnas språk: **#46 valde F3+F4 i stället för F5** — sex vektorer i stället för 23, och
prioritetsstegen orörd. Det är exakt rätt mönster: **berika en befintlig faras underlag, lägg inte
till farslag.** Varje nytt slag gör regel 1a värre — fler konkurrenter om en enda plats i rösten.

Samma val står öppet för #45 (snö/slask) och #42 (vattenplaning). Båda *känns* som egna faror. Båda
ska byggas som meta på `icing_point` respektive segmentet.

---

## 8. Vad som minst måste finnas för att helheten ska lyfta

| # | Vad | Vems | Fog | Kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **A** | **En allvarsskala** — kombinationen ändrar ordval/försprång/prioritet för den ENDA varning vi säger | Axels (rösten) | **F5** | kort #153, ej byggt |
| **B** | **Bevisbärare i snapshoten** — varje fara bär vilka lager som talade och hur starkt, inte en boolean | delad | F1+F3 | additiv |
| **C** | **En grind för KOMBINATIONEN** vid sidan av per-delsgrindarna | mätningen, alltså vår | — | ett dokument |
| **D** | **En skriven regel för gemensam kalibrering** — tillägg till §8-regimerna | Bengt fastställer | — | ett stycke |
| **E** | **Graciös degradering** — skattaren returnerar nivå + bevis i stället för enum | min kod | F3 | liten |

**C och D är dokument och kan skrivas före frosten.** E är en liten ändring i min egen modul — och
enligt §7.5 en förutsättning, inte en förfining. A är Axels och den tyngsta; den är också den enda
som kostar F5.

---

## 9. Hur en del döms: ett nej gäller en ROLL, inte en del

Prejudikatet finns i protokollet: **kamerorna** underkändes som täckning (744 st, 99 % inom 1 km från
en station, Norrlands lucka oförändrad) — och blev **bildfacit**, en av tre facitkällor systemet i dag
vilar på. Samma del, annan roll, avgörande värde.

**Men principen behöver en broms, annars blir den ett sätt att aldrig ta ett nej:**

> Ett underkännande gäller den **fråga som ställdes**. En del får prövas i en ny roll — men den nya
> rollen kräver en **ny fråga, skriven före mätningen, med egen grind**. Ingen del återinförs på hopp.

### 9.1 De sju underkända, och deras obesvarade fråga i helheten

| Del | Vad som underkändes (mätt) | Obesvarad fråga i det sammanvägda |
| :-- | :-- | :-- |
| **SMHI** | som ANKARE: MAE 1,05 → 1,20 | som **räckviddsknapp** (L4): gör molnmängden grind A:s felkurva brantare klara nätter? Aldrig mätt |
| **Höjden** | återvinner noll på YTtemperatur | (a) #45 använder **luft**, inte yta — annan storhet. (b) förutsäger höjden **var modellen är opålitlig** i stället för att korrigera medelvärdet? |
| **Kamerorna** | som TÄCKNING: 6 av 744 ger nytt ankarläge | ✅ redan omrollad till **bildfacit** — prejudikatet |
| **RH-guarden** | som FILTER: fuktigheten stiger efter regn | den **stigningen** är i sig ett tillstånd — förutsättningen för kondensation och rimfrost (#46) |
| **Operatörens "Våt"** | som PROXY: omätbar eftersläpning | som **facit** i stället för indata — samma skifte som kamerorna gjorde |
| **`rate_max`** | som VÄRDE: 727 mm/h, spärrat | **kvoten max/mean** är en formsignal: konvektiv skur mot frontregn. Exakt vad #45 behöver för att skilja lokal snöby från utbrett regn |
| **Radarns bidrag** | växer inte med avståndet (platt ~1,5 %) | mätt där en station står **6,7 km** bort i median. Radarns roll är **upplösning per sträcka**, inte mer väta — aldrig mätt som det |

**Två av dem har en mätbar fråga som inte kräver vinter:** höjden som varianspredikator och radarns
segmentupplösning. Båda kan ställas mot befintligt arkiv.

---

## 10. Registret över allt struket, stängt och flyttat

Ett underkännande gällde en roll. **Ett struket spår lämnar nästan alltid något kvar**, och det
kvarlämnade faller i tre slag:

- **GRÄNS** — det definierar var produkten *inte* kan nå. Utan gränsen läses varje mätning som om
  den gällde överallt.
- **VILLKOR** — det binder vad kombinationen inte får göra. Ett villkor som glöms bort återuppfinns
  som ett misstag.
- **MÄTT FAKTUM** — mätningen överlever även när delen inte gjorde det.

### 10.1 Stängda kort

| Kort | Varför stängt | Vad det bidrar med i helheten | Slag |
| :-- | :-- | :-- | :-- |
| **#92 däck och fordonstyp** | kräver tröskeljustering i flera dokument, tre portar, nya produktboksbilder — och bär ingen egen fara | **Gränsen för hur precis en varning får vara.** Vi vet inget om däcken, alltså ska rösten tala om VÄGEN, aldrig om bromssträcka. Begreppet står kvar som **lager 2-riskmodifierare** (OVERGANGAR-ANALYS §1b.2) | gräns |
| **#93 kommunala vägar** | inga givare där | **Räckviddsvillkoret** (#98 §6) finns tack vare det: en tyst miss räknas bara där systemet HADE en chans. Utan den gränsen drunknar varje tröskelsignal i täckningshål | gräns |
| **#100 dämpning per fara** | kuren var tystare än sjukdomen: variant C ger **1 larm för 39 minuters halka** | Mätningen av hur rösten beter sig över långa sträckor — **4 larm på 59 km** — är indata till allvarsskalan (#153). Kärnan (TOTALEN när många OLIKA faror kvalificerar) flyttad dit | mätt faktum |
| **#94 försäkringsbolagen** | samarbetet klarlagt otillgängligt | Tvingade fram att facitstacken definierades ur **vår egen** data. Det är skälet att T-B och #98 kan dömas i vinter i stället för nästa | villkor |

### 10.2 Strukna parametrar och regler

| Vad | Varför | Vad som överlever | Slag |
| :-- | :-- | :-- | :-- |
| **RH-guarden** (#89 §4.3) | fuktigheten STIGER efter regn: 90 % vid +1 h → 95 % vid +4 h | Själva mätningen är ett positivt faktum om efterregnstillståndet — **förutsättningen för kondensation och rimfrost** (#46) | mätt faktum |
| **Operatörens "Våt"** (#89 §2.1) | 33 rader, noll med efterföljande klassning | Kandidat som **facit** i stället för indata (samma skifte som kamerorna) | mätt faktum |
| **Oljefilmen, #89 (b)** | 55 torrperioder, 6 olyckor mot grindens 15 — inte nåbar i höst | **Torrdygnsräknaren är samma beräkning #42 behöver** för vattenfilmens ålder. Kortet säger att frågan börjar om från steg 0 — men koden är inte förlorad | mätt faktum |
| **Ord-per-resa** (#103) | fel valuta | **Röst räknas i EPISODER, aldrig i rader.** Det är enheten allvarsskalan måste använda | villkor |
| **R3 hård åldersgräns** (vägens ålder) | avvisad FÖRE mätning | Principen *"ålder ≠ inaktualitet — en klassning står tills den ändras"* ärvs rakt av tillståndsskattaren | villkor |
| **E3 högre prioritet** (#95 d) | skulle tysta en olycka | **Bindande villkor på #153:** kombinationen får ändra ordval och försprång — **aldrig prioritet**. I fogarnas språk: #153 får röra `alertText()`, aldrig `PRIORITY` | villkor |
| **`rate_max`** (#134) | 727,54 mm/h, spärrat av värdevakten | **Kvoten max/mean** är en formsignal: konvektiv skur mot frontregn — precis vad #45 behöver | mätt faktum |
| **K1, byvindkvot per rad** (#164) | 335 av 748 stationer | Kvoten per rad är en **fönsterglappsdetektor** — ett datakvalitetsmått för L1 | mätt faktum |
| **Per fordonstyp** (vind/sikt §2.1) | #92 stängt | Samma gräns som #92 | gräns |

### 10.3 Kärnor som flyttats — och vart

| Från | Till | Vad som flyttade |
| :-- | :-- | :-- |
| #95 breda SMHI-regeln | **#89 §2.3 `N_varning`** | SMHI vet **tiden före händelsen** (varningar publiceras i förväg). Utlösaren förblir stationens eget regn; varningen förlänger bara N |
| #100 dämpningen | **#153** | TOTALEN när många OLIKA faror kvalificerar samtidigt |
| #93 halva kortet | **#95 (d) förstärkaren** | snöfallsvarning + yta nära noll = högre konfidens |
| #89 (c) interaktionerna | **#46** (lager 1, dimma som konfidens) och **#90** (lager 2, sidvind × halka) | dimma × frysrisk är en ORSAK; sidvind ändrar faran givet en yta |
| #88 T-B:s facit | **egen facitstack** | kamerafacit, väglagsarkivet, situation_archive |

### 10.4 Vad registret sammantaget säger

Tre saker blir synliga först när allt står på ett ställe:

1. **Gränserna är inte hål — de är produktens form.** #92 och #93 säger tillsammans: *vi talar om
   vägen där någon mäter den, inte om fordonet och inte där ingen mäter.* Det är en skarpare
   produktdefinition än något av korten säger ensamt.

2. **Villkoren på allvarsskalan är redan skrivna, fast utspridda.** E3 säger att prioritet aldrig får
   röras. #103 säger att enheten är episoder. #100 ger talen för hur rösten låter över en lång
   sträcka. **#153 behöver inte uppfinna sina ramar — de finns, i tre stängda kort.**

3. **Flera strukna delar lämnade en BERÄKNING efter sig, inte bara en idé.** Torrdygnsräknaren
   (#89 b) är #42:s vattenfilmålder. Kvoten max/mean (`rate_max`) är #45:s formsignal. K1:s
   radkvot är en givarvaktsdetektor. Det är billigare att återanvända dem än att bygga om dem.

---

## 11. Vad som förblir osynligt oavsett allt ovan

En **snöby mellan stationerna** (bara radarn ser den, #43) och **om saltbilen passerat** (ingen öppen
källa). Båda är kända och står i förstudierna. De hör till kartans kanter, inte till dess mitt.

---

## 12. Den ärliga sammanfattningen

Delarna **är** byggda så att de kan integrera: de faller i fem lager utan att någon behöver skrivas
om, och varje del producerar en mätt storhet i stället för en dom — vilket är förutsättningen för att
de ska kunna vägas ihop senare. Räckvidden är mätt och duger (§6.1), tillståndet och utvecklingen är
byggda och sparade, och registret visar att även det underkända lämnat användbara beräkningar efter
sig (§10.4).

**Och fogen mot motorn är smalare än jag trodde innan jag läste den.** Nio av tio skuggdelar greppar
additivt — ett fält i `live.json` som ingen app kan snubbla på, en nyckel i `meta`, en rad i
villkoret. Radarn och SMHI publiceras **redan** och kastas först vid adaptern. Skuggmotorn är
bokstavligen motorn, så varje länk kan mätas på riktig trafik innan den når en telefon. Det som
återstår är alltså inte ett brobygge — det är sex vektorer, tre portar, och disciplinen i §5.3 och
§5.5.

**Men tre saker står i vägen, och två av dem är regler vi själva skrivit:** utgången kan inte uttrycka
allvar (§7.1), modellerade storheter får inte utlösa (§7.2), och grindarna dömer delar i stället för
kombinationer (§7.3). Ingen av dem är ett kodfel. Alla tre är beslut, och alla tre är Bengts och Axels
att ompröva.

**Skillnaden mellan det vi har och produkten Bengt beskriver sitter alltså i L4:s knapp och i L5** —
och L5 är den enda delen i hela kartan som kostar F5.

---

## 13. Rättelsehistorik

Brödtexten ovan säger vad som gäller i dag. Det här är vad som ändrats sedan kartan skrevs, så att
ingen läser en överspelad version någon annanstans.

| Datum | Vad | Var beslutet står |
| :-- | :-- | :-- |
| 14/9 | Kartan skriven | DECISIONS #159 |
| 14/9 | **Grind A hade inte fallit.** Första utkastet sade att L4 var praktiskt tomt och citerade domen MAE 1,06 / grova 10,7 % — den gäller körningen FÖRE givarvakten och marginalvakten. Rätt dom är MAE 0,85 / 5,1 % / 0,3 %, ⏳ ingen dom. §6.1 säger nu det | DECISIONS #180 |
| 14/9 | **Ett nej gäller en roll** (§9) och **registret** (§10) tillagda på Bengts två invändningar | DECISIONS #180, #181 |
| 14/9 | Dokumentet omarbetat till **en** sammanhängande karta | — |
| 14/9 | **Motorn och fogarna inarbetade** (§4, §5) på Bengts fråga om kartan tar hänsyn till det som faktiskt kör. Läst ur koden, inte ur minnet | DECISIONS #182 |
| 14/9 | **§5.6 tillagd:** metodförbehållen stod bara i chatten. Vektortalen 6/3/23 är ett **tak** (vektorer som BÄR faran), inte en uppmätt kostnad; §4–§5 är lästa, inte körda | DECISIONS #183 |
