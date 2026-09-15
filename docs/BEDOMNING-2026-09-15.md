# Bedömning 2026-09-15 — allt material, och vad det föranleder

**Status: FÖRSLAG.** Inget här är byggt eller beslutat. Besluten är Bengts och Axels; åtgärderna är
sorterade efter när de måste ske och vad de kostar. Integrationskartan (`docs/INTEGRATIONSKARTAN.md`,
main @ `0022d92`) är den enda källan för hur delarna hänger ihop; det här dokumentet är en
**handlingsbedömning ovanpå den**, inte en andra karta.

**Underlag:** kartan §1–§14 · Axels brev 14/9 · `engine/src` (588 rader) · de 23 vektorerna ·
publicerad `live.json` 14/9 · DECISIONS #131, #159–#184 · tavlans kassavakt och måndagsserie 14/9 ·
`docs/PRODUKTBOK.md` · TROSKLAR-dokumenten.

---

## 0. Var Axels brev och kartan är i otakt

Axel läste ett tidigt underlag. Innan något annat: vad som skiljer.

| Axel skriver | Vad som gäller nu | Var |
| :-- | :-- | :-- |
| *"Grind A föll den 12:e"* | **Grind A lever.** Med båda vakterna: MAE 0,85 / grova 5,1 % / frysklassfel 0,3 % ⇒ INGEN DOM (#131). **Måndagen 14/9, 2 881 punkter: MAE 0,81 · grova 5,0 % · frysklassfel 0,6 % ⇒ INGEN DOM.** Underlaget växte med 48 %; domen stod stilla | kartan §6.1, tavlan #160 |
| *"L5 finns delvis, som tid i stället för ord"* — framfört som förslag | **Redan beslutat** i #90 roll B och SMHI-förstärkarens E1. Kartan sade "finns inte" — fel, rättat | kartan §2, §7.1, §13.1 |
| Hänvisar till 4.3, 4.5, 4.6, 4.8 och §5 A–E | Kartan är omnumrerad: 4.3 → **§7.3** · 4.5 → **§6.2** · 4.6 → **§7.5–7.6** · 4.8 → **§7.8** · §5 A–E → **§8** | — |
| *"B och E väntar tills något klarat en grind"* | E är indata till hans egen punkt 1 (allvar som tid kräver ett graderat mått). **Oense om E**, enig om B | kartan §13.5 |
| *"sex veckor före första frosten"* | I norr kan första frostnatten komma när som helst; steg 0 ska köras om **inom sju dygn** efter den | minnesanteckning, tavlan |
| Drive-kopian Bengt klistrade in | Är version `4434697` — **saknar §13 och säger fortfarande "L5 finns inte"** | — |

Ingen av skillnaderna är Axels fel. Men den som läser hans brev bredvid den gamla Drive-kopian får
fel bild på exakt de två punkter som diskuteras.

---

## 1. Analys

### 1.1 Två produkter, en vinter

Materialet beskriver två produkter som råkar dela namn.

**Produkt 2026** är den `PRODUKTBOK.md:108` lovar: *varnar vid Trafikverkets mätstationer och
rapporterade väglag — mellan stationerna är vägen oövervakad.* Den finns i drift, med fem farslag
och en fast stege. Axel har rätt i att det är vinterns leverans.

**Produkt 2027** är den kartans §1 frågar efter: *hur halt blir det där jag är om två–tre minuter?*
Den kräver L4 (räckvidd) och en regel som binder tillstånd × utveckling till rösten. Ingenting av det
är byggt, och kartan är nu ärlig om det.

Kartans första utkast mätte 2026 mot 2027 och kallade avståndet ett fel. Det var det inte. **Men
motsatsen är också fel:** att avfärda allt utom "vid stationen" som våning två. Det finns ett hål
*innanför* 2026-löftet, och det är det som avgör vintern (1.5).

### 1.2 Vad materialet bevisar och vad det antar

| Del | Byggd | Mätt | Dom | Kan nå rösten i vinter? |
| :-- | :-- | :-- | :-- | :-- |
| Grind A (offset + två vakter) | ja | ja, 2 881 p | **INGEN DOM** (A2 exakt på gränsen 5,0) | nej — L4 är nästa produkt |
| Tillståndsskattaren (#89 steg 2) | ja | tre körningar, **tre instrumentfel funna i egen kod** | ingen | **kandidat** — om facit finns |
| Trendarkivet (#88) | ja, 4 713 kandidater, SQL + TS jämförda | ja | ingen (T-A kräver frost) | **kandidat** — tillsammans med skattaren |
| Radarns `regn` per segment (#81 C) | ja, **publiceras redan** | som ankarbidrag: platt ~1,5 % | nej-på-fel-fråga | nej — upplösningsrollen aldrig mätt |
| Rimfrosten (#46) | ja, i motorn | — | — | **redan där** |
| SMHI `N_varning` | publiceras (`smhi[]`), oläst | som ankare: fälld | nej-på-fel-fråga | nej |
| Stationsvakten K2 (#164) | ja | ja | i drift (L1) | redan där |
| Kamerafacit (#20/#157) | ja | **0 objekt efter 5 657 körningar** | — | **är förutsättningen för allt ovan** |

Tre saker att läsa ut ur tabellen:

1. **Inget har passerat en grind.** Axels *"det som saknas är frost och en dom"* är exakt rätt.
2. **Skattaren har hittat fel i sig själv i varje körning** (radarsaknad räknad som torr; fel
   nämnare; nominellt mot verkligt fönster). Den är inte ett pålitligt instrument ännu. Den behöver en
   period av *oförändrad kod* under mätning innan den får döma något.
3. **Den enda raden som är förutsättning för alla andra är den som står på noll.**

### 1.3 Den största risken är inte en saknad funktion — det är det tomma facitet

Varje vinterdom vilar på en facitstack: kamerafacit, väglagsarkivet, `situation_archive`. Axels
egen tröskelregel — *en storhet som inte kan motbevisas av en mätning får inte utlösa* — namnger
två vittnen: ytstatusgivaren och kameran. **Operatörens "Våt" har 33 rader utan efterföljande
klassning. Kamerafacit har noll objekt.**

Kedjan är diagnostiserad länk för länk: larmen saknade positioner (`Alert` bär inga koordinater) →
form A deployad → 10 av 12 larm bär nu `lon` → men `archiveFacit` kör bara för `land === "se"` och
det positionerade provlarmet var danskt. Mekanismen är alltså **byggd men obevisad**. Så länge
hinken är tom kan ingenting Axel vill släppa till rösten passera hans eget test.

**Det gör #157 till kritisk väg för vinterleveransen** — inte en lös tråd.

### 1.4 Motorn slänger data den redan har — och varför det ändå inte är en motoråtgärd i dag

`snapshot-core.ts:206` skriver `regn` per segment i varje `live.json`; `smhi[]` likaså. Adaptern
kastar båda. Den första riktiga integrationen (radarns väta × operatörens klass) kräver alltså ingen
ny publicering — bara F2+F3+F4.

**Men att läsa ett fält och att döma på det är två olika saker.** F4 är en regeländring med upp till
tre segmentvektorer, och det finns ingen grind för radarn som segmentupplösning — den frågan är
aldrig ställd (§9.1). Att ändra motorns villkor på ett fält utan grind vore precis det kartan varnar
för. Åtgärden i dag är därför **att skuggan läser fältet vid sidan av motorn och loggar vad villkoret
skulle ha ändrat** — inte att motorn börjar döma på det.

### 1.5 Efterhalkan ligger INNANFÖR löftet — det är därför Axels "en sak" inte är våning två

Det här är bedömningens viktigaste punkt, och den förenar Axel och kartan.

Löftet är *varnar vid Trafikverkets mätstationer.* Vid stationen mäter givaren yta, luft, daggpunkt,
nederbörd — var tionde minut. Regnet slutar, `fukt` blir falsk inom tio minuter, ytan fortsätter falla
mot noll. **Stationen ser det. Motorn gör det inte**, för `icing_point` kräver `moisture === true` i
samma stund. Steg 0 mätte: **76 % av regnstoppen** hade regn i mätaren i samma stund motorn slog om
till torrt, median 35 minuter.

Det är inte en varning mellan stationerna. Det är en varning **vid stationen** som motorn missar av
konstruktion. Axels "en sak" — *frysrisk som fyrar när det inte regnar men vägen är blöt och ytan
faller* — täpper ett hål i **bottenvåningen**, inte bygger en andra.

Och den greppar billigt: **F1 + F3 + F4 på `icing_point`**, ingen F5, högst sex vektorer, grinden
är `v11_silent_drive` (kartan §5.1, §5.4).

### 1.6 Allvar som tid: billigare än en allvarsskala — med två sidoeffekter som måste mätas

Axels omformulering flyttar #153 från F5 (23 vektorer, tre portar) till F4 (högst 6). Spannet
finns: `leadM` 400–3 000 m, vid 90 km/h **16–120 s**. Men två saker följer som ingen skrivit:

- **Korridoren växer med försprånget.** ±35° vid 1 000 m (dagens tak vid 120 km/h) och ±35° vid
  3 000 m är inte samma yta. Fler faror kvalificerar som "framför" i kurvor. Det är mätbart i
  skuggan på verkliga spår *innan* någon regel skrivs.
- **Försprång × "okänt räknas som vått."** `fukt()` i publiceraren räknar okänd nederbörd som våt
  (#75: hellre ett larm för mycket). Ett längre försprång på ett larm som bygger på "okänt" flyttar
  ett eventuellt falsklarm tidigare och längre bort. Andelen islarm som vilar på *okänd* nederbörd är
  aldrig mätt. Den borde vara det — den är Axels tystnadsdoktrin i siffror.

### 1.7 Kassan och cronen sätter kalendern

- **Kassan:** 16,21 av 35 USD, släpande takt 200 min/dygn, senaste halvdygn 100. Takdatum ~26/9.
  Allt nytt som schemaläggs före 1/10 tar från vinterns mätningar.
- **Cronen:** måndagsserien 14/9 kom **5 h 18 min till 6 h 48 min** sent, och förseningen växte
  genom serien. Healthchecks tre cron-körningar kom 32 min, 39 min och 1 h 51 min sent — medan
  pulsklockans nio låg på sekunden. *Pulsen levererar; cronen lovar.* En mätserie vars steg bygger
  på varandra kan inte ligga på naken GitHub-cron.
- **#161:** `android/gradlew.bat` är permanent smutsig (CRLF) och fäller commit-steget i två flöden;
  sex källvakter har aldrig fått sitt state sparat. Det är inte integration — men det är en vakt
  som tyst inte vaktar, och den sorten har kostat oss förr.

---

## 2. Åtgärder som måste vidtas I DAG

### 2.1 I motorn: **inget i reglerna**

Det ska sägas rakt. Motorn är inte trasig; den är begränsad. Att ändra ett villkor i `evaluate*`
före frost, utan facit och utan grind, är exakt "våning två före grunden". Det enda motorn behöver
i dag är att **inte röras** medan skuggan mäter.

### 2.2 I snapshoten (F1 — noll vektorer, noll portar)

| # | Åtgärd | Varför i dag |
| :-- | :-- | :-- |
| **T1** | Publicera skattarens **råa indata** per station bredvid `fukt`: `regn_h` (timmar sedan stationsregn), `radar_h` (timmar sedan radarregn), `lutning` (ur `trend_kandidater`, samma nyckel `station_id`) | §5.5: F1 måste ligga **ett varv före** F4. Utan fältet i `live.json` kan skuggan inte repetera Axels "en sak" i höst. Råa tal — inte domen — så ingen tröskel låses (§8-regimen orörd) |
| **T2** | Kontraktsgrind: *en nyckel som en gång publicerats i `live.json` får aldrig försvinna* — frusen nyckellista, körd i `ci` | Skyddar §5.3 ("lägg till, ersätt aldrig"). Portarna läser otypat; ett borttaget `fukt` tystar varje icke-uppdaterad app utan ett ord |

**T1 är inte B.** B är bevisbärare *per fara med styrka* och väntar tills något klarat en grind
(enig med Axel). T1 är tre tal per station som skattaren redan räknar. Utan T1 finns ingen
höstmätning; utan höstmätning finns ingen vinterdom.

### 2.3 I skuggmotorn

| # | Åtgärd | Varför i dag |
| :-- | :-- | :-- |
| **T3** | **Bevisa att kamerafacit fylls.** Kör skuggan mot ett känt svenskt spår som ger ett positionerat larm; bekräfta ett objekt i hinken | 1.3: kritisk väg. 5 657 körningar utan ett objekt är inte "väntar på data" — det är obevisat |
| **T4** | Skuggans `main.ts` läser `segments[].regn` och `smhi[]` **vid sidan av** motorn och loggar per körning vad villkoret *skulle* ha ändrat — motorn orörd | 1.4: fälten finns redan. Steg 2 i §5.5-sekvensen, utan F2/F4 |
| **T5** | Logga andelen islarm där `precipitation` var **okänd** (räknad som våt) | 1.6: Axels tystnadsdoktrin i siffror, före något försprång förlängs |

### 2.4 Drift och dokument

| # | Åtgärd | Vems |
| :-- | :-- | :-- |
| **T6** | Rätta kartans §6.1 med 14/9-körningen (2 881 p · 0,81 · 5,0 · 0,6) | Claude |
| **T7** | Ge Axel **nuvarande** karta (main @ `0022d92`, med §13), inte Drive-kopian | Bengt |
| **T8** | #161 gradlew CRLF — sex källvakter utan sparat state | Claude |
| **T9** | TRV-anmälan om nio byvindgivare (#154). Brevet är klart | Bengt |
| **T10** | Inget nytt cron-schema före 1/10 | alla |

---

## 3. Kort sikt — till första frosten och genom oktober

| # | Åtgärd | Vems | Fog / kostnad |
| :-- | :-- | :-- | :-- |
| **K1** | **C:** grinden för kombinationen — ett dokument, skrivet före mätningen (§8 C, §9) | Claude skriver, Bengt fastställer | dokument |
| **K2** | **D:** regel för gemensam kalibrering — tillägg till §8-regimerna | Bengt | ett stycke |
| **K3** | **Precisera tröskelregeln** till Axels lydelse i TROSKLAR-FRYSKLASSNINGEN §1: *"en storhet som inte kan motbevisas av en mätning får inte utlösa; extrapolation faller, minne av mätningar består"* | Bengt + Axel | dokument — **kräver T3, annars saknar regeln vittne** |
| **K4** | **Omformulera #153 till försprång** (kartan §13.1) | Axel | flyttar kortet från F5 till F4 |
| **K5** | **E:** skattaren returnerar nivå + bevis i stället för enum | Claude | F3, liten — indata till K4 |
| **K6** | Skuggmätning av Axels "en sak" mot facit från första frostnatten; T-A körs om efter den; steg 0 inom sju dygn | Claude | knapp, inte cron |
| **K7** | Mät korridorens tillväxt: extra "framför"-kandidater vid 3 000 m mot 1 000 m på verkliga spår | Claude | skugga |
| **K8** | Flytta måndagsserien från naken cron till **pulsen eller knapp** — sex steg 20 min isär tål inte 7 timmars drift | Claude, Bengts godkännande | 0 min extra |
| **K9** | Skattaren: en period **utan kodändring** under mätning — tre instrumentfel på tre körningar är för många för ett instrument som ska döma | Claude | disciplin |

---

## 4. Längre sikt — januari till mars

| # | Åtgärd | Villkor |
| :-- | :-- | :-- |
| **L1** | **F4 för "en sak"** — villkoret i `icing_point` ändras, berörda vektorer görs om, v11 bevisas tiga, tre portar | **bara om K6:s grind passerar** |
| **L2** | Försprång per fara i `evaluate*` (#153 som tid) | efter K4, K5, K7 |
| **L3** | L4-knappen: SMHI molnmängd som **räckviddsknapp** — ny fråga, skriven före mätningen, egen grind (§9) | efter vinterns grind A-kurva |
| **L4** | #45 snö/slask och #42 vattenplaning — **som meta, aldrig som sjätte slag** (§7.8) | efter L1 |
| **L5** | Höjd som varianspredikator · radarns segmentupplösning — båda mot befintligt arkiv | som knapp när kassan tillåter |
| **L6** | Kombinationsgrinden (K1) tillämpad i skuggan | efter K1 + facit |
| **L7** | #91 kallplatslagret | L4-produkten |

---

## 5. Vad som kan tas bort ur schemat

### 5.1 Ur arbetsplanen

| Tas bort / fryses | Skäl |
| :-- | :-- |
| **"Allvarsskala i rösten"** som mål | Ersätts av försprång. Rösten säger samma ord (Axel, #90 roll B, E3) |
| **"Fem lager med bevisbärare före frosten"** som vintermål | Axels "våning två". B väntar tills något klarat en grind |
| **Höjdkorrektionen i #45** — fryses | §7.7: #91 mätte den till noll på yta; #45 använder luft; ingen har skrivit varför det ändå går. Fryses tills det står |
| **SMHI som ankare** — struket, permanent | §9.1: fel fråga. Återkommer bara som räckviddsknapp med egen grind |
| **Radarn som "mer väta"** — struket | §9.1: platt 1,5 %. Återkommer bara som upplösning per sträcka |

### 5.2 Ur Actions-schemat

Schemat är redan hårt nedskuret (240 → ~100 min/dygn). Det som är kvar:

| Schema | Bedömning |
| :-- | :-- |
| Måndagsserien (6 flöden, veckovis) | **Behåll innehållet, byt bärare** (K8). Minuterna är små; problemet är driften |
| `healthcheck.yml` varannan timme | Bengts beslut 14/9 att behålla. ~6–12 min/dygn. Lämnas |
| `marknadsforing.yml` dagligen 04:45 | **Kom 4 h 22 min sent 14/9** och föll på #161. Kostnad och nytta är Axels/Bengts fråga — jag flaggar bara att den är den enda dagliga cronen utöver healthcheck |
| Nya scheman | **Inga före 1/10** (T10) |

Ärligt: det finns inte mycket kvar att ta bort utan att ta bort mätning. Vinsten ligger i K8 (rätt
bärare) och T10 (disciplin), inte i fler strykningar.

---

## 6. Vad som bör jobbas med för en bättre produkt

Utöver vinterleveransen — det som gör produkten *bättre* snarare än *mer*:

1. **Facitstacken som strategisk investering.** Kamerafacit, operatörens "Våt" som facit (inte
   indata), `situation_archive`. Utan facit kan ingenting någonsin dömas — varken av oss eller av
   Axels regel. Det är den enda posten i hela materialet som *alla* andra vilar på.
2. **Tystnaden som mätvärde.** Axel: *silence is a feature.* Mät den: andel islarm på okänd
   nederbörd (T5), larm per episod (#103:s enhet), korridortillväxt (K7). En doktrin som inte mäts
   är en åsikt.
3. **Segmentets försprång före ispunktens.** A1 plattar redan ihop kod 2 och 4. Om allvar blir tid är
   det där skillnaden märks först.
4. **"Lägg till, ersätt aldrig" som skriven regel** i CLAUDE.md och som grind (T2). Den dyraste
   sortens fel är det som gör systemet tystare utan spår.
5. **Rätt fråga till varje underkänd del** (§9). SMHI som knapp, radarn som upplösning, höjden som
   varianspredikator. Ingen återinförs på hopp; var och en får en ny fråga före mätning.

---

## 7. Beslut som behövs

| Beslut | Vem | Min rekommendation |
| :-- | :-- | :-- |
| Publicera skattarens råa indata i `live.json` (T1) | Bengt | **ja** — noll risk, förutsättning för allt efter |
| Vinterns röstleverans = Axels "en sak", inget annat | Bengt + Axel | **ja** |
| #153 omformuleras till försprång | Axel | **ja** |
| Tröskelregeln till Axels lydelse | Bengt | **ja, men efter T3** — annars saknar den vittne |
| E byggs före vintern | Bengt | **ja** — indata till försprånget, liten |
| Måndagsserien av naken cron | Bengt | **ja** |
| `marknadsforing.yml` dagligen | Axel + Bengt | ingen rekommendation — inte min att bedöma |
| TRV-anmälan skickas | Bengt | **ja** — gratis L1 |

---

*Kartan är den enda källan för hur delarna hänger ihop. Det här är vad den, tillsammans med Axels
brev och driftläget, föranleder — som förslag.*
