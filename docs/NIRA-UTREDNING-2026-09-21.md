# Nira — konkurrent eller partner? Utredning 21/9 2026

**Beställning (Bengt 21/9):** *"jag vill att du noggrant går igenom vad Nira erbjuder. Är det enbart data från bilar så är
de steget efter. Vi ger en prognos om vad som kommer att hända innan en bil kommer. Så vi kanske inte är konkurrenter utan
partners. Kan du utreda detta"*

**Upphov:** Göteborgs svar 21/9 (DECISIONS #281, kort #229): staden köper friktionsdata från bilar av Nira och prognoser
av Klimator och SMHI, och får inte dela något av det.

**Metod.** Niras egna sidor lästes i webbläsaren 21/9. Två agenter sökte utanför: ägare, samarbeten, svenska kunder, andra
aktörer och forskning. **Varje bärande uppgift kontrollerades därefter mot källan** — de är märkta ✔. Uppgifter som bara
bygger på en agents läsning är märkta *(agent)* och ska behandlas som troliga, inte som fastställda.

---

## 1. Svaret i korthet

**Hypotesen stämmer för den första bilen och för de glesa vägarna — inte för Nira som företag.** Niras egen signal kommer
när bilar har kört över platsen. Men Nira har redan prognosdelen, genom Klimator sedan 2018 och Vaisala sedan 2024, och
säljer produkter som kombinerar bildata med vägvädermodeller. Platsen som "den som ser före" är alltså upptagen hos Nira.

**Halkvakt är inte heller ensamt om att se före.** Klimators halkprognos ligger öppet på Expressen, Vaisalas prognoser
säljs in i bilar, SMHI varnar för plötslig ishalka och Finland publicerar öppna prognoser per vägavsnitt.

**Det som återstår — och det är en verklig nisch:** en gratis telefonapp som under körningen säger till med röst, utlöst
av en *mätning* och inte av en modell, med minuter till ett par timmars försprång där ingen bil ännu har kört. Ingen av
de undersökta aktörerna gör just det *(agent — bevisat genom att inget hittades, inte genom att motsatsen visats)*. Men
den nischen är **obevisad**: förvarningsregeln körs i skuggläge och prövas först vid domarna i januari och mars.

**Konkurrent eller partner?** Båda, i olika led — och förhållandet är skevt. Halkvakt behöver Nira mer än Nira behöver
Halkvakt. Ett partnerskap blir realistiskt först när Halkvakt kan visa ett uppmätt försprång.

### Tre lager, tre tidshorisonter

| Lager | Vad som händer | Vem som gör det | Horisont |
| :-- | :-- | :-- | :-- |
| **Prognos** | en vädermodell räknar fram väglaget | Klimator, Vaisala Xweather, SMHI, FMI (Finland) | timmar till dygn |
| **Förvarning ur mätning** | stationen visar att ytan är blöt och faller mot noll | Halkvakt — i skuggläge, inte i appen | minuter till ett par timmar |
| **Upptäckt** | bilen känner att greppet släpper | Nira (Volkswagen), Volvo | nu — där bilar har kört |

Halkvakt ligger i mitten: efter prognosen, före bilen. Det är där ingen annan levererar till föraren under körning.

---

## 2. Vad Nira erbjuder

**Ägare:** *"NIRA Dynamics AB is a part of the Volkswagen Group"* ✔ (niradynamics.com/companyinformation). Grundat 2001,
Linköping. Cirka 127 anställda och omsättning 2024 cirka 310 MSEK *(agent, allabolag)*.

| Produkt | Vad | För vem | Data | Åtkomst |
| :-- | :-- | :-- | :-- | :-- |
| **Tire Grip Indicator** | programvara i bilen som skattar greppet under normal körning, *"long before ABS, ESC or traction control are activated"* ✔ | biltillverkare | hjulhastighet m.m. i bilen | inbyggd |
| **Road Surface Alerts** | varningar för bland annat *"Slippery road: Detects low-friction surfaces using real-time vehicle data"* ✔ | biltillverkare, underleverantörer, fordonsflottor — och *"third party applications used by drivers"* ✔ | *"When multiple vehicles detect low friction … the system generates a hazard alert"* *(agent, Volkswagens fallstudie)* | API, pris inte publikt, "premium" |
| **Road Surface Conditions** | *"Combining vehicle data and road weather models"* ✔ — greppet per vägavsnitt | biltillverkare (förarstöd, navigering, elbilar) | 25 m, var tionde minut, *"extended coverage through weather data and external sources"* ✔ | API |
| **Winter Road Insights** | läget i vägnätet för vinterväghållning; *"Map of slippery-prone roads"*, *"Thermal mapping"* ✔ | väghållare och entreprenörer | *"more than two million vehicles"*, 25 m, var tionde minut ✔ | webbverktyg, API, via partnersystem |
| **Road Health** | gropar och ojämnheter | väghållare | — | Trafikverket köper *(agent)* |

**Kunder till Winter Road Insights enligt Niras egen bild** ✔: Trafikverket, Svevia, Göteborgs stad, Vejdirektoratet,
Köpenhamns kommun, Lahtis, Schweiziska edsförbundet, Latvijas Valsts Ceļi och Mesta.

**Det gamla gratiskontot.** Källkartläggningen 26/8 nämnde ett gratis utvärderingskonto på roads.niradynamics.se. Adressen
finns inte längre. Villkoren i arkivet (Winter Road Insights, gällande från 2021-11-01) ✔: *"When signing up to the service
you will gain a trial account for the selected region for 60 days"* — och *"you will not redistribute or transfer the
Service or the Content"*. Kontot var alltså en provperiod för väghållare, och datan fick inte spridas vidare.

---

## 3. Hur Nira beskriver sig själva — fyra citat ✔

1. **Om första bilen** (Niras artikel om Enköpingsolyckan, 10/3 2025): *"The first cars to encounter the black ice would
   have automatically registered the dramatic change in friction … Drivers further back in the traffic flow would have
   received a warning in time."* Modellen är uttryckligen: de första upptäcker, de bakom varnas.
2. **Om temperaturvarningar** (frågor och svar om Road Surface Alerts): *"Traditional vehicle warnings often rely on
   temperature thresholds … Road Surface Alerts instead analyses real vehicle data to detect actual changes in road
   surface behaviour."* Det är Halkvakts nuvarande sorts varning de ställer sig mot.
3. **Om fasta stationer** (samma artikel): *"the number of weather stations is quite limited and increasing the number is
   costly."*
4. **Om telefoner** (samma artikel): bilar utan egna givare kan ta emot varningar — *"If they have a smart phone navigation
   app, the same applies. The data is available."*

---

## 4. Där Nira faktiskt är efter

- **Första bilen** — per konstruktion, se citat 1.
- **De mindre vägarna.** Trafikverket 10/11 2025 ✔: *"Tekniken har hög täckningsgrad på de högtrafikerade vägarna och även
  det mindre vägnätet får ofta några mätningar per dygn."* Några mätningar per dygn betyder att läget kan vara timmar gammalt.
- **Jämn fart.** Trafikverkets rapport 2021 ✔ om tekniken som *"NIRA Dynamics och Volvo Car Corporation använder"*:
  *"Nackdelen är att metoden främst är eventbaserad … ett fordon som färdas med konstant hastighet, på till exempel en
  landsväg, inte levererar lika mycket data."* Det säger emot Niras marknadsföring 2026 om nästan kontinuerlig mätning.
  Tekniken kan ha blivit bättre sedan 2021 — det avgörs inte här.
- **Flera bilar krävs** för att en varning ska bekräftas *(agent, Volkswagens fallstudie)*.
- **Bara vissa bilar mäter:** Volkswagenkoncernens märken och partnerflottor. Volvo säljer sin egen halkdata direkt till
  Trafikverket *(agent)*.

---

## 5. Där Halkvakt faktiskt står

- **I appen i dag** fyrar en väderstation när ytan är **+1 °C eller kallare och fuktig** (broar +3 °C) —
  `engine/src/engine.ts:213–218`. Det är en temperaturbaserad varning, precis den sort Nira ställer sig mot i citat 2.
  Därtill Trafikverkets väglag, olyckor, kameror och vilt.
- **Förvarningen (efterhalkan)** — regeln fastställd 17/9: regn inom 2 h · fall ≥ 0,8 °C på 30 min · yta +1…+3 °C.
  Skuggloggen (S1) har gått sedan 16/9. Regeln finns **inte i motorn** (S3) och utfallet är blindat till domarna i januari
  och mars. Räknat ur startvärdena, inte uppmätt: från +1 °C tar det drygt en halvtimme att nå noll i den takten, från
  +3 °C knappt två timmar. Det är försprånget regeln lovar — om den håller.
- **Täckningen:** cirka 850 stationer, på statens vägar. Inom 7 km från Göteborgs centrum finns **en** (kort #93, 19/9).
- **Regel T** (TROSKLAR-KOMBINATIONEN §6.2): bara en mätning får utlösa. Prognoser och modellprodukter får *"stärka,
  försvaga eller förlänga"* en varning som vilar på en mätning — *"aldrig ensamma utlösa"* (T6).
- **Svagheten Nira pekar på är verklig:** en saltad väg vid 0 °C är blöt och kall men inte hal. Stationen kan inte se
  skillnaden — en bil kan. Det är en mekanism, inte ett uppmätt tal i vårt material. *(agent, ej kontrollerat:)* VTI 2013,
  med hänvisning till Wallman 2005: väglaget som räknas fram ur VViS-stationerna varnar för ofta jämfört med människors
  iakttagelser, och missar ibland is.

---

## 6. Andra som redan ser före

- **Klimator** (Göteborg, Nasdaq First North).
  - **2018 med Nira** ✔: *"Road Status Information är en programvara där information från uppkopplade bilar kombineras med
    information från fasta väderstationer och väderprognoser"*, och Niras väglag *"kommer nu att omsättas till detaljerade
    prognoser av halka på vägavsnitt"*. Tjänsten riktade sig till entreprenörerna i vinterväghållningen.
  - **Till allmänheten** ✔: Expressens *"Halkprognos – se om det är risk för halka där du ska köra"*: *"Halkprognoskartan
    från Klimator uppdateras i realtid och visar det förväntade väglaget på Sveriges vägar de närmaste åtta timmarna."* En
    karta man tittar på före resan — inte en röst under den.
  - *(agent)* halkvarning.se tillsammans med Icebug, för fotgängare och cyklister · ett API med prognos per vägavsnitt på
    begäran, som Klimator marknadsför för ruttplanering och biltillverkares halkvarningar · omsättning 36 MSEK 2025,
    förlust första halvåret 2026, 19 anställda.
- **Vaisala Xweather med Nira** (12/11 2024) ✔: *"the first to release an integrated data set which connects road weather
  forecasts and computer vision observations with real-time connected car data"*.
- **Göteborg i praktiken** (slutrapporten 2025) ✔: *"Projektet använde beslutsstödsystem från Vaisala (MDSS och Horizon)
  samt Klimator (RSI). Friktionsdata togs fram av NIRA Dynamics."* Den dagliga genomgången var *"Vad sa prognosen?
  (WxHorizon, MDSS och RSI)"* … *"Vad blev utkomsten? (Winter Road Insights)"*. **Niras data användes som facit för
  prognoserna** — samma användning som Halkvakt skulle ha nytta av.
- **SMHI** *(agent)*: gul varning för plötslig ishalka, per region — den täcker regn på kall väg och blöt väg som fryser
  när det klarnar, alltså Halkvakts eget scenario, men utan plats på vägen.
- **Finland** *(agent)*: FMI publicerar öppna vägväderprognoser per vägavsnitt. FMI:s modell RoadSurf är **öppen källkod
  (MIT)** ✔.

**Forskningen om horisonten.** Utvärderingen av RoadSurf (Karsisto 2024) ✔: *"The RMSE of the RoadSurf forecast and the
persistence forecast are quite similar in the first hours of the forecast"* — och att bara anta att det uppmätta består
*"gives slightly better results at first, but the error quickly increases"*. De närmaste timmarna räcker alltså mätningen
självt; längre fram vinner modellen. *(agent, ej kontrollerat:)* Shao & Lister 1996 — en modell driven bara av
vägsensorer, upp till 3 h, rätt på över 92 % av frost- och frostfria nätter. Halkvakts mätbaserade förvarning ligger alltså
i den horisont där metoden har stöd.

---

## 7. Konkurrent eller partner?

**Konkurrent — i varningsledet.** Road Surface Alerts säljs till *"third party applications used by drivers"* — Halkvakts
plats. Köper en stor navigeringsapp eller en biltillverkare tjänsten, får deras förare varningar byggda på upptäckt,
utan Halkvakt. Klimator marknadsför sitt API åt samma håll *(agent)*.

**Partner — i prognosledet är platsen upptagen.** Nira har redan Klimator och Vaisala, båda etablerade och större än
Halkvakt i just prognoser.

**Vad Nira skulle få av Halkvakt i dag:** lite. En telefonkanal — som Nira själva säger att appar kan vara — men Nira är
Volkswagen-ägt, tjänsten säljs som premium, och de gamla villkoren förbjöd vidarespridning. Och en förvarning som ännu inte
är bevisad.

**Vad Halkvakt skulle få av Nira:** mycket.
1. **Facit** — var det halt när vi sa det? Det är så Göteborg använder Niras data.
2. **Ett vittne på platsen** (regel T1–T2). T5 förbjuder interpolation mellan stationer som utlösare; ett eget beslut får
   bara bära utlösning *"där ett vittne på platsen kan fälla värdet"*. En uppmätt friktion är ett sådant vittne — Niras
   data kunde alltså, genom ett eget beslut, göra varningar mellan stationerna möjliga.
3. **Tystnad där det inte är halt** — den saltade vägen vid 0 °C. *Silence is a feature.*
4. **Gatorna**, där Halkvakt i dag är tyst.

**Slutsats:** förhållandet är skevt. Ett partnerskap blir realistiskt först när Halkvakt kan visa en uppmätt fördel.

---

## 8. Villkor som gäller vilken väg som än väljs

- **Produktinvarianten.** Road Surface Alerts levereras till *"vehicles approaching the affected area"* ✔ — det förutsätter
  att leverantören vet var bilen är. Halkvakt får bara ta emot **alla aktuella varningar som en fil** och matcha i
  telefonen. Det är krav nummer ett i varje samtal.
- **Regel T.** Bara det bilarna har *mätt* får utlösa. Det modellförlängda lagret i Road Surface Conditions är T6: stärka,
  aldrig utlösa. Leverantören måste kunna märka vad som är mätt och vad som är modell.
- **Licensen.** Villkoren förbjöd vidarespridning ✔. Data i appen kräver en egen licens.
- **Kostnaden.** Premium och inte publik. Gratisnivån är ett krav: varje betalväg kräver en DECISIONS-post som Axel godkänner.
- **Blindningen.** Facit från Nira som påverkar trösklarna måste läggas in i kalibreringsplanen (D2/D3). Historisk data får
  inte bli ett sätt att kika i förväg.

---

## 9. Rekommendation

1. **Nu, gratis:** hämta Niras exempeldata — helst formuläret *Download sample data* på sidan Winter Road Insights
   (friktion, torkarhastighet och lufttemperatur, Stockholm 15/1 2024); RSA-sidans formulär ger en dags halkvarningar
   och produktguiden. Filerna visas som länkar direkt efter formuläret. Läs den mot fyra frågor: hur tät i en stad och på
   en landsväg, hur färsk, går det mätta att skilja från det modellerade, och syns eventbaserad mätning (jämn fart ger
   mindre data)? — kort #229 steg 1.
2. **I vinter:** bevisa förvarningen. S1 → S3, domarna i januari och mars. Det Halkvakt kan visa utan Nira är att
   varningen kommer **före frysningen**; att den kommer före första bilen kräver Niras data.
3. **Efter beviset, februari–mars:** ta kontakt — inte med ordet *partner*, utan med ett konkret förslag: Niras
   friktionsdata som facit för Halkvakts förvarning, gärna som den sortens innovationsprojekt som Göteborgsprojektet var
   (InfraSweden2030/Vinnova), med en väghållare som tredje part. **Alternativet Klimator** är mindre, har ett API och har
   sökt sig mot allmänheten — men gör modellprognoser, som enligt regel T bara får stärka.
4. **Inte nu:** ingen förfrågan om partnerskap utan bevis, och ingen betalväg utan Axel.

---

## 10. Sidofynd

- **Trafikverkets fordonsdata delas inte.** Rapporten 2021 ✔: *"Data kommer inte att delas vidare från Trafikverket till
  tredje part om inte separat överenskommelse träffas eller om lagstiftning ålägger Trafikverket att göra detta."* Frågan
  till Trafikverket (bedömningen §0b) får därför troligen svaret nej. Upphandlingen gäller *"4+2 år med start oktober 2021"*.
  *(agent, andrahandsuppgift via ETSC:)* köpet ska kosta cirka 7 MSEK per år.
- **Halkdatasetet på trafficdata.se** (*Safety related traffic information, Temporary slippery road*) ✔ är Trafikverkets
  katalogpost från 2017 för EU-kravet om säkerhetsrelaterad trafikinformation, CC0, statliga vägar. Den pekar bara på
  Trafikverkets allmänna sida om trafikinformation — ingen ny källa. **Men posten anger `datex@trafikverket.se` som
  kontaktadress.** CLAUDE.md:s läxa från 17/9 säger att adressen kom ur en sammanfattning som *"hittade på"* och att
  Trafikverket inte har någon sådan adress. Det är för starkt: adressen står i Trafikverkets egen katalogpost. Läxans poäng
  — läs kontaktuppgifter på källan — står sig, och kontaktformuläret var ändå en giltig väg.
- **Klimator och halkvarning.se** bevakas redan av `trv-bevakning` som omvärld (DECISIONS: *"Tre av de sju bevakade är
  omvärld"*).

---

## 11. Exempeldatan — uppmätt 21/9

**Vad Nira skickade:** tre filer från Winter Road Insights, Stockholm 15/1 2024 — friktion (305 316 rader), torkarhastighet
och lufttemperatur (1 846 547 rader vardera, samma bilrapporter). Ett dygn i tiominutersperioder, 01:00–00:50 svensk tid,
vägklass 1–4. **Vägklass 5, de minsta lokalgatorna, finns inte med alls.** Skript:
`scripts/matningar/nira-exempeldata-2026-09-21.py`. Filerna ligger inte i repot — villkoren förbjuder vidarespridning.

**1. Tätheten.** Under dygnet fick 2 275 km väg i Stockholmsregionen minst ett friktionsvärde (delsträckorna mäter 24,8 m i
median; Nira säger 25). **Inom 8 km från Sergels torg: 408 km väg — där Halkvakt har 7 stationer** (kort #93). Över dygnet
är Nira överlägset i stan.

| Vägklass | km väg med friktion | vägavsnitt | tiominutersperioder med friktion per avsnitt, median (av 144) |
| :-- | --: | --: | --: |
| 1 — motorväg | 655 | 853 | 35 |
| 2 | 307 | 1 164 | 22,5 |
| 3 | 632 | 3 526 | 17 |
| 4 | 681 | 3 414 | 8 |

**2. Färskheten — och natten.** Klockan 02 och 03 fick 54 respektive 85 vägavsnitt ett friktionsvärde, mot 2 100–4 600 i
timmen dagtid — under 1 % av dygnets 8 957. **Klockan 05 hade bara 2–9 % av vägavsnitten ett värde från den senaste
timmen.** Bilden är tunnast just när frosten bildas och de första bilarna kör — då Halkvakts stationer mäter oavsett trafik.

| Andel av vägavsnitten med ett värde från senaste timmen | vägklass 1 | 2 | 3 | 4 |
| :-- | --: | --: | --: | --: |
| klockan 05 | 5,5 % | 8,7 % | 2,4 % | 1,6 % |
| klockan 07 | 53,9 % | 43,0 % | 30,1 % | 20,1 % |

**3. Mätt eller modellerat — filen säger det inte, men visar att värden förs vidare.** Lufttemperaturen och torkarna har
exakt samma rader, alltså samma bilrapporter. **22–56 % av friktionsvärdena (från motorväg till minsta vägklassen) ligger i en
tiominutersperiod där ingen bil rapporterade på avsnittet.** I 80–89 % av de fallen hade en bil rapporterat på samma avsnitt
inom 30 minuter före, i 98 % inom två timmar. Friktionsvärdet gäller alltså en tid efter att bilen passerat; följderna av
perioder med friktion är i median 60 minuter långa, också på natten. Dessutom ligger medelvärdet i 6,4 % av raderna mer än
0,05 utanför radens egen min–max (som mest 0,83) — det är inte ett enkelt medel av periodens mätningar.
**Följd för regel T:** ett framfört värde är ett minne av en mätning (T4) och får bära en varning bara om åldern är känd.
**Krav till Nira: varje värde måste bära tiden för den senaste mätningen under det.**

**4. Händelsestyrt — kan inte avgöras.** När en bil rapporterar på ett avsnitt finns ett friktionsvärde i samma period i
48 % av fallen på motorväg och i 15,5 % på minsta vägklassen. Vore friktionen händelsestyrd borde gatorna, med fler
inbromsningar och svängar, ligga högre. De ligger lägre — men motorvägen har fler bilar per period, och det döljer
effekten. Provet är för trubbigt för att fälla Trafikverkets ord från 2021.

**Sidofynd.**
- Lufttemperaturen är **luftens**, inte vägytans (filnamnet), och bär orimliga värden: **+29,5 °C en januaridag**, lägst
  −30,5 °C, median −5,2 °C. Den kan inte ersätta stationernas yttemperatur — och den hade inte passerat värdevakten.
- Torkarna gick i 8,2 % av avsnittsperioderna. Ett möjligt regnvittne på platsen för efterhalkans premiss *vägen är blöt*
  (T1), där stationer saknas.
- Friktionen den dagen: median 0,35, 35 % av värdena mellan 0,15 och 0,3 — vinterväglag. Skalan är inte dokumenterad i filen.

**Vad det betyder.** Exempeldatan stärker Bengts hypotes på den punkt där den stämde. Niras bild är tät på dagen och tunn på
natten, och den bär framförda värden utan ålder. Halkvakts stationer mäter vägytans temperatur oavsett trafik — starkast
just när Nira är svagast. Det är argumentet i ett framtida samtal, med Niras egna siffror, när förvarningen är bevisad.

---

## Källor (lästa 21/9 2026)

| ✔ | Källa |
| :-- | :-- |
| ✔ | niradynamics.com: produktsidorna Road Surface Alerts, Road Surface Conditions, Winter Road Insights, Tire Grip Indicator; kundbilden WRI_partners.jpg; companyinformation |
| ✔ | niradynamics.com/latest: *How technology could prevent multi-vehicle crashes: Lessons from Enköping* (10/3 2025) |
| ✔ | news.cision.com: *NIRA Dynamics och Klimator fördjupar samarbetet* (2/2 2018) |
| ✔ | vaisala.com: *Vaisala Xweather to add NIRA's connected car data to their road condition platform* (12/11 2024) |
| ✔ | via.tt.se: Trafikverket, *Fordonsdata ger bättre vintervägar* (10/11 2025) |
| ✔ | Trafikverket: *Införande av Digital Vinterväglagsinformation*, slutrapport 2021 (FUD-publikation 6049) |
| ✔ | InfraSweden2030: *Införandet av Digital Vinterväglagsinformation för Hållbar och Effektiv Kommunal Vinterväghållning*, slutrapport 2025 |
| ✔ | expressen.se/nyheter/vader/halkprognos |
| ✔ | web.archive.org: roads.niradynamics.se, villkoren (arkiverade 15/4 2024) |
| ✔ | trafficdata.se: `package_show?id=temporaryslipperyroad` |
| ✔ | gmd.copernicus.org: Karsisto, *RoadSurf 1.1: open-source road weather model library* (2024) |
| agent | allabolag (Nira), Volkswagens fallstudie, Bosch 30/9 2025, AiRAP 22/6 2026, DFRS, Klimators rapporter och API, BM System, SMHI, FMI/Digitraffic, Shao & Lister 1996, VTI 2013, ETSC |
