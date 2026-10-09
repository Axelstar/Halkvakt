# Bilaga 1 — Ansökan till Skyltfonden: Halkvakt

*ERSATT 29/9 kväll (DECISIONS #404): ansökan lämnas av Bengt som privatperson med Axels V2 (413 000 kr, Drive-mappen Ansökan V2). Texten nedan är förmiddagens alternativ och skickas inte.*

**Utökade svar på formulärets fält 2–8** (Trafikverkets ansökningsformulär, version 240909). Sökande: Föreningen Halkvakt, ideell förening under bildande, genom ordföranden Bengt Lagerlöf. Sökt belopp: **283 000 kr**. Projektperiod: 2027-01-11 – 2028-04-30.

**Projektets titel:** Räcker Trafikverkets öppna väglagsdata för att varna alla förare i tid? Utvärdering av röstburen förhandsvarning för halka (Halkvakt) under två vintrar, och validering av ett prognoslager för halka mellan mätstationerna.

## Projektets syfte

*Vad behöver göras och varför?*

Halkvakt är en gratis mobilapp som med rösten varnar bilföraren när vägen framför är hal, innan föraren når platsen. Rösten bygger helt på Trafikverkets öppna data: vägväderstationerna (VViS), rapporterat väglag (RoadCondition) och trafikhändelser som olyckor och djur på vägen (Situation). SMHI:s varningar och nederbördsradar samt Trafikverkets väglagskameror används som facit och i skuggdrift, men rösten talar aldrig på dem. All matchning mot förarens väg sker i telefonen, och ingen position lämnar telefonen automatiskt.

Projektgruppen har utvecklat appen under 2026. Den används av en testkrets på iPhone sedan 31 augusti 2026 och på Android sedan 20 september 2026. Publiceringen i App Store och Google Play planeras till hösten 2026, App Store först. Datapipelinen har varit i drift sedan 24 augusti 2026: den hämtar Trafikverkets data varje minut och arkiverar alla mätvärden.

Under hösten 2026 har projektgruppen dessutom, på egen bekostnad, byggt ett **prognoslager**. Det skattar vägytans temperatur var annan kilometer längs vägen *mellan* mätstationerna, avståndsviktat ur upp till fem närmaste stationer inom 50 km. Varje punkt märks som uppmätt (station inom 2 km), modellerad eller okänd.

Sedan 23 september 2026 körs lagret enbart i **skuggdrift**. Det beräknar och loggar vad det skulle ha sagt, men når aldrig någon användare. Det får kopplas till användare först när det klarat kvalitetströsklar som fastställdes och daterades 2026-09-01, före lagrets kod (bilaga 7). Även då blir det en karta och en förstärkare, aldrig en röst som talar ensam.

Den första av lagrets tre grindar, korsvalideringen vid stationerna, klarades 23 september 2026 och höll i omkörningen 28 september på ett fullständigare arkiv: medelfel 0,74 °C mot kravet högst 1,0 °C och grova fel 3,7 % mot kravet högst 5 %. Den enklare skattning som ska gälla mellan stationerna, där ingen egen mätserie finns, föll däremot 28 september med 6,9 % grova fel. Utfallet är bokfört, och det är just den frågan, vad som går att uppnå mellan stationerna, som vinterns grindar och ansökan avser att pröva.

**Sökt belopp:** 283 000 kr för perioden januari 2027–april 2028, fördelat på fyra arbetspaket enligt kostnadsplanen. Inget av det som redan är byggt ingår i det sökta; det är projektets verktyg.

Projektet ställer en fråga som ingen i dag kan besvara: räcker de väglagsdata staten redan samlar in och publicerar för att varna förare i tid, och hur mycket tillför en prognos mellan mätstationerna? Ansökan avser två saker.

**1. Utvärdera om förhandsvarning på öppna data fungerar i verklig trafik.** Ingen har mätt hur väl VViS-data fungerar som varningskälla för allmänheten. Under vintern 2026/27 loggas varje varning med de indata som utlöste den, och den ställs mot vad som faktiskt hände enligt fem källor:
- väglagskamerornas bilder;
- SMHI:s varningar;
- Trafikverkets rapporterade halka;
- stationernas egna mätserier;
- testförarnas svar och de missar förarna själva markerar.

Från januari 2027 analyseras detta systematiskt: träffsäkerhet, falsklarmsandel, missandel och om användarna behåller appen. Resultatet blir en öppen rapport.

**2. Validera och driftsätta prognoslagret för halka mellan mätstationerna.** Vid projektstart har lagret loggat i skuggdrift sedan september, och det fortsätter hela vintern. Från januari utvärderas prognoserna mot vinterns facit och mot förhandsdaterade trösklar för falsklarm, missar och mervärde. Resultatet redovisas som en nationell felkarta som visar var prognosen är tillförlitlig i förhållande till avståndet till närmaste station. Klarar lagret trösklarna driftsätts det inför vintern 2027/28 som kartlager och som förstärkare av mätta varningar. Klarar det dem inte publiceras det resultatet lika öppet — även ett välgrundat nej är kunskap som Trafikverket saknar i dag.

**Granskningsbar i stället för granskad.** Projektet köper ingen extern granskning. I stället är allt som behövs för att pröva slutsatserna öppet och daterat: tröskeldokumenten med sin versionshistorik, arkivet, skuggloggen och utvärderingsskripten. Trafikverket, fondens beredningsgrupp och VTI erbjuds tillgång till underlaget för egen omprövning, när som helst under projektet.

**Vad som inte ingår, och varför.** Det starkaste effektbeviset vore ett kontrollerat försök med nya förare vid en trafikövningsplats, där elever med och utan varning jämförs i samma moment. Försöket kräver en trafikövningsplats som partner. Någon sådan har inte bekräftats till denna ansökan, och därför står försöket utanför.

Effekten på förarna mäts i stället utan kontrollgrupp, genom testförarnas svar, en enkät och en gruppintervju, och skattas ur forskningslitteraturen. Hastighetsdata samlas inte in. Appens princip är att ingen position eller rörelsedata lämnar telefonen automatiskt, och den principen går före mätbarheten.

**Varför.** Halka är en av de största enskilda orsakerna till skador i vägtrafiken i Norden, och förare får i dag ingen förvarning. Trafikverket mäter väglaget vid cirka 845 vägväderstationer, varav omkring 750 rapporterar vägytans temperatur, men datan når inte föraren i bilen. De halkvarningar som finns i bilar i dag är knutna till bilmärke och betalas som tilläggstjänst. Projektet mäter om gapet kan stängas för alla förare, med data och teknik som redan finns.

## Egen hypotes

*Finns en egen teori eller ett antagande som grund för projektidén?*

**H1. Öppna data räcker för nytta men inte för fullständighet.** Vi antar att VViS-stationerna och rapporterat väglag fångar merparten av de halkhändelser som inträffar vid eller nära mätstationer. Vi antar också att de missar en väsentlig andel mellan stationerna och vid snabbt uppkommande underkylt regn.

Prognoslagret förväntas sänka missandelen påtagligt, och hur mycket är projektets viktigaste okända. Skuggdriften gör att effekten kan mätas prospektivt, mot trösklar som fastställdes innan den första prognosen beräknades. Missarna mäts på två oberoende sätt: ur arkivets halkhändelser som motorn inte varnade för, och ur förarnas egna markeringar ("appen missade", byggd i september 2026).

**H2. En återhållsam varning behålls, en pratig stängs av.** Falsklarm urholkar förtroendet för varningssystem. Halkvakt är därför tyst som standard och talar bara vid mätt eller rapporterad risk. Vi antar att en falsklarmsandel under ett falsklarm per tre korrekta varningar är förenlig med att användarna behåller appen över en vinter. Det mäts genom att falsklarmsandelen per vecka jämförs med appbutikernas statistik över installationer, avinstallationer och aktiva enheter, och med testförarnas enkätsvar.

**H3. Förhandsvarning ger föraren en möjlighet som bilens egna system saknar.** ABS, antisladd och automatisk nödbroms reagerar när greppet redan är förlorat eller ett hinder redan syns. Ingen bil på marknaden sänker farten för att det är halt två kilometer fram, men en varning som når föraren i tid ger möjlighet att aldrig hamna i situationen.

Vi antar att en majoritet av testförarna uppger att de sänker farten eller ökar avståndet vid en varning som de bedömer som korrekt. I denna ansökan mäts det genom självrapportering, utan kontrollgrupp och utan hastighetsdata. Det är en svagare mätning än ett kontrollerat försök, och den redovisas som sådan och ställs mot litteraturens effektskattningar.

## Kunskapsläge

*Vad har gjorts tidigare inom området av er eller andra aktörer?* Fullständiga referenser finns i bilaga 4.

**Omfattning av problemet.** Hälften av de årliga 27 000 vägskadorna och 50 000 fotgängarskadorna i Finland, Norge och Sverige kan spåras till halt väglag (Freistetter m.fl., Regional Environmental Change 22:58, 2022). Studien pekar på att halksäsongen i stora delar av de tre länderna kan bli kortare men halare.

**Förarbeteende.** Kilpeläinen och Summala (Transportation Research Part F 10, 2007; 1 437 finska förare) visar tre saker:
- förare underskattar systematiskt hur halt det är;
- en minoritet hämtar in väglagsinformation före resan;
- välinformerade förare ändrar främst sina reseplaner, inte sitt körbeteende på vägen.

Slutsatsen är att information måste vara lokal och komma under resan för att påverka körningen. Det är vad Halkvakt gör.

**Effekt av varningar.** Rämä och Kulmala (Transportation Research Part F 3, 2000) fann två effekter av variabla vägskyltar:
- en skylt som varnade för halt väglag sänkte medelhastigheten med 1–2 km/h;
- en skylt som rekommenderade minsta avstånd minskade andelen korta avstånd med 28–47 %.

I en svensk simulatorstudie med 75 förare (Kircher och Thorslund, VTI, Ergonomics 52, 2009) gav ett varningssystem som visade rekommenderad hastighet lägst fart och fick högst förtroende. Utan varning körde förarna långsammare där isen syntes än där vägen såg torr ut.

Halkvakts röst säger i dag vad och var ("Isrisk framöver — vägbanan nära noll grader"). Olycksvarningarna säger också vad föraren bör göra ("Sakta ner", "Överväg annan väg"). Om en uttrycklig åtgärd i halkvarningarna ändrar förarnas svar är en fråga projektet prövar med testförarna. Effektskattningen i denna ansökan bygger på dessa studier och på testförarnas egna svar; ett kontrollerat försök i verklig bil ligger utanför ansökan.

**Falsklarm och missar.** Falsklarm minskar förarnas följsamhet till varningar. I en simulatorstudie fanns effekten för varningar med ljud men inte för enbart visuella (Naujoks m.fl., Accident Analysis & Prevention 97, 2016). En studie från 2025 visade att ett system med missar gav långsammare eller uteblivna reaktioner i kritiska lägen, medan falsklarm gav onödiga inbromsningar (Vollrath och Morawietz, Transportation Research Part F, 2025). Avvägningen mellan falsklarm och missar är projektets centrala mätfråga.

**Vägvädersystem och prognoshorisonten.** Finska utvärderingar av vägväderinformation (RWIS) har visat en nytto-kostnadskvot omkring 5:1 och 3–17 % färre olyckor genom snabbare driftåtgärder, sammanställda i USA:s transportdepartements databas över ITS-nyttor. Datan är alltså bevisat värdefull för väghållare, men att den kan nå föraren direkt är oprövat.

Karsisto (Geoscientific Model Development, 2024) utvärderade den öppna finska vägvädermodellen RoadSurf. Under prognosens första timmar var modellen och antagandet att den senaste mätningen består ungefär lika bra; längre fram vann modellen. För de närmaste timmarna är alltså färska mätningar det viktigaste underlaget, och det är i den horisonten Halkvakt varnar.

**Finland som förebild för prognoslagret.** Finska statens trafikledningsbolag Fintraffic publicerar väglagsprognoser per vägavsnitt som öppna data (Digitraffic). Segmentvisa väglagsprognoser mellan mätstationer är alltså etablerad myndighetspraxis i grannlandet, men någon svensk motsvarighet har vi inte funnit. Projektets prognoslager följer den finska datamodellen med fasta vägavsnitt och prognos per avsnitt, och dokumenterar öppet vad som går att uppnå på svenska öppna data utan upphandlad prognosleverantör. Trafikverket planerar en ny upphandling av fordonsdata 2027, och projektets resultat ger ett oberoende kunskapsunderlag inför den.

**Befintliga tjänster.** Trafikverkets trafikinformation och SMHI:s trafikväder visar väglag per karta och län, utan varning i bilen. Volvo Cars delar halkdata mellan bilar sedan 2016, men bara för egna bilar.

NIRA Dynamics (Volkswagen-koncernen) beräknar friktion ur bilens egna givare. Företaget säljer väglagsdata till väghållare och halkvarningar till biltillverkare och fordonsflottor. Datan är stängd: Göteborgs stad, som köper friktionsdata från bilar av Nira, får inte dela den vidare (stadens svar till projektgruppen 2026-09-21). Fordonsdata har också en inbyggd gräns:
- Nira beskriver själva modellen som att *"the first cars to encounter the black ice would have automatically registered the dramatic change in friction"* — de bakomvarande varnas.
- Enligt Trafikverket får det mindre vägnätet *"ofta några mätningar per dygn"* (2025).
- Enligt Trafikverket är metoden *"främst eventbaserad"* (2021).

En station mäter däremot innan första bilen har kommit dit. Waze och Google Maps varnar för olyckor och köer, inte för väglag. Vi har inte funnit någon märkesoberoende tjänst som ger bilister förhandsvarning om halka på sträckan de kör.

**Eget arbete (egenfinansierat, 24 augusti–28 september 2026).**
- **Källkartläggning.** Samtliga tillgängliga källor och deras licenser är kartlagda (bilaga 5).
- **Datapipeline.** Den hämtar Trafikverkets data varje minut och arkiverar den.
- **Varningsmotorn** är deterministisk, med identiska implementationer för server, Android och iOS. Alla tre måste klara samma 37 testfall tecken för tecken.
- **Skuggmotorn** har sedan 29 augusti var 30:e minut kört simulerade resor längs fasta referensrutter och loggat varje varning den skulle ha gett. I dag omfattar den 80 rutter i Sverige, Finland, Norge och Danmark.
- **Tröskeldokument.** Tretton tröskeldokument är fastställda och daterade *före* den mätning eller kod de styr (förteckning i bilaga 7).
- **Prognoslagrets grind A.** Lagret är prövat med korsvalidering: varje station hålls utanför och skattas ur grannarna. Senaste körningen, 28 september över 715 stationer, 308 852 avläsningar och 14 594 punkter, gav medelfel 0,74 °C och 3,7 % grova fel, inom kraven även bortom 20 km från närmaste station.
- **Det enklare prövades, och föll där det saknar historik.** En skattning utan inlärd stationsoffset var lika bra vid stationerna i september (0,72 mot 0,71 °C), men gav 6,9 % grova fel när arkivet från 25 september också sparade de varma grannstationerna. Offseten håller (3,7 %) men finns bara där en station har egen mätserie. SMHI:s luftstationer som extra ankare gjorde modellen sämre (1,05 → 1,20 °C) och ströks. Hur en vägpunkt utan station ska skattas är därmed en öppen och bokförd fråga (29 september 2026), och den är kärnan i arbetspaket 2.
- **Stationstätheten.** Medianavståndet från huvudvägnätet till närmaste VViS-station är 7 km. Omkring 13 % av Norrlandslänens vägnät ligger mer än 20 km från en station, och den luckan ligger i inlandet.
- **Givarvakter.** Vakterna sorterar automatiskt bort felmätande stationer och släpper in dem igen när de mäter rätt. De tog bort 706 av 811 felaktiga avläsningar. På E4 gick falsklarmen för broar från 7 till 0.
- **Anmälningar till Trafikverket.** Sju stationer med fysiskt omöjlig yttemperatur och nio med fysiskt omöjlig byvind anmäldes till Trafikverket 22 september 2026 (bilaga 8).
- **Förarnas återkoppling.** Förarsvaren per varning ("stämde / stämde inte") byggdes 16 september 2026, och förarens egen markering av missar ("appen missade") 26 september. Väglagskamerans bild arkiveras som facit när motorn varnar, och sedan 26 september även varje timme vid aktuell frysrisk i hela landet.
- **Viltvarningarna** bygger sedan 22 september 2026 på Trafikverkets rapporter om djur på vägen. Under 14 dygn var de 480. De nådde appens data i median 1,8 minuter efter Trafikverkets starttid, och 91 % angav djurslaget.
- **Batteriförbrukningen** på iPhone är uppmätt till 7 % per timme med skärmen släckt, mot projektets gräns på 8 %.
- **Nordiska arkiv.** Motsvarande dataarkiv för Finland, Danmark och Norge drivs parallellt sedan augusti–september 2026.

## Metod

*Hur ska projektet läggas upp och genomföras?*

**Förutsättningar vid projektstart (januari 2027).** Appen fungerar i hela Sverige. Sedan augusti–september 2026 arkiveras alla mätvärden med tidsstämpel: VViS, väglag, händelser, SMHI-varningar och radar. Skuggmotorn har loggat varningar sedan 29 augusti 2026 längs fasta referensrutter, oberoende av hur många förare som är ute. Bland dem finns 20 svenska rutter, till exempel E22 Malmö–Kristianstad, väg 23 Höör–Osby och väg 19 Ystad–Kristianstad.

Prognoslagret har körts i skuggdrift sedan 23 september 2026 och loggar sina prognoser märkta som uppmätt, modellerat eller okänt. Skuggdriften loggar också efterhalka, det vill säga blöt vägbana som fryser när temperaturen faller, en halktyp som är svår att förutse. I fondens ordval är lagret projektets första prototyp, och utvärderingen är förstudien av vad det ger.

Kvalitetströsklarna fastställdes och daterades innan de mätningar de styr (bilaga 7), och tröskeldokumenten har gemensamma regler:
- Domarna har fasta datum: betans varningsregler döms i januari 2027 och prognoslagret i mars 2027.
- Flera av dokumenten föreskriver blindning: fram till domen redovisas bara antal, inte andelar.
- En tröskel får skärpas men aldrig lättas när utfallet väl är sett, och varje ändring loggas med datum.
- Förarnas svar ensamma avgör aldrig domen över en ny varningsregel.

Data som samlats före projektstart — arkiv, skugglogg och mätserier — är indata till projektet. De sökta aktiviteterna är analysen, valideringen och driftsättningen.

**Facit utan partner.** Utvärderingen vilar på fyra oberoende facitkällor som alla finns i projektets arkiv:
- väglagskamerornas bilder;
- SMHI:s varningar;
- Trafikverkets rapporterade halka och väglag;
- mätstationernas egna serier.

Till det kommer testförarnas svar per varning och deras egna markeringar av missar. Källorna kan läsas mot varandra: en varning som bekräftas av kamera, station och förare väger annat än en som bara en av dem bekräftar.

### Arbetspaket 1 — Utvärdering av vintern 2026/27 (jan–apr 2027)

- **Klassning.** Varje varning klassas mot facit: kamerabild, SMHI-varning, rapporterad halka, stationsmätning och testförarnas svar (AP3). Det ger träffsäkerhet och falsklarmsandel per vecka, typ av varning och rutt.
- **Missandel.** Alla halkhändelser i arkivet ställs mot vad motorn sa, både längs skuggrutterna och där testförarna körde, och förarnas egna missmarkeringar läggs till. Missandelen mäts alltså på två oberoende sätt.
- **Användning.** Den mäts med appbutikernas aggregerade statistik: installationer, avinstallationer och aktiva enheter per vecka, i relation till falsklarmsandelen. Appen själv skickar ingen användningsstatistik.
- **Reproducerbarhet.** Motorn kan köras om på det arkiverade materialet med ändrade trösklar, så att det går att beräkna hur träffsäkerhet och missandel hade ändrats med andra inställningar.
- **Retrospektivt underlag.** Projektgruppen har begärt att få ut Trafikverkets historiska stationsobservationer för vintern 2024/25. Lämnas de ut körs motorn även på den vintern.

### Arbetspaket 2 — Validering och driftsättning av prognoslagret (jan–sep 2027)

- **Trösklarna.** Skuggdriftens prognoser utvärderas mot vinterns facit, mätt mot de förhandsdaterade trösklarna:
  - falsklarm högst 20 %;
  - missar högst 30 % på täckta avsnitt;
  - mervärde: minst 25 % av träffarna där punktmotorn var tyst eller mer än 30 minuter senare.

  Domen fälls bara om underlaget räcker: minst 20 bedömbara halkhändelser, spridda över minst tre skilda halkperioder.
- **Nationell felkarta.** Prognosfelet beräknas som funktion av avståndet till närmaste station, genom korsvalidering över hela stationsnätet. Grind A klarades i september på ett arkiv där varma, torra avläsningar ännu inte sparades. Sedan 25 september sparas även de, och andelen saknade grannvärden sjönk från 49,5 % till 0,4 %. Omkörningen 28 september visade att korsvalideringen vid stationerna håller, men att skattningen mellan stationerna inte gör det utan stationens egen historik. Vilken modell som ska bära vägpunkten avgörs därför på vinterns underlag, inte på höstens.
- **Kalibrering och kontroll.** Modellparametrarna (antal ankare, avståndsvikt och höjdkorrektion) kalibreras mot vinterns data. Skuggdriftens prospektiva logg kontrolleras mot en retrospektiv körning på arkivet.
- **Driftsättning.** Prognosen driftsätts inför vintern 2027/28 bara om trösklarna klaras. Den kopplas då till app och karta med förtroendenivån synlig, och en färdvy visar risken per vägavsnitt vid beräknad ankomsttid. Prognosen får stärka, försvaga eller förlänga en varning som vilar på en mätning, men den talar aldrig ensam. Klaras trösklarna inte redovisas det i rapporten, och prognosen förblir avstängd.

### Arbetspaket 3 — Testförare med återkoppling per varning (jan–apr 2027, fortsättning nov 2027–mar 2028)

- **Rekrytering.** Projektgruppen rekryterar 30–50 testförare som kör regelbundet vintertid, främst i Skåne: pendlare och, där det går, yrkesförare (bilaga 2). Medverkan är frivillig, och en mindre ersättning (presentkort) ges för fullföljd vinter.
- **Svar och missar.** Efter varje varning kan föraren svara i appen: *stämde* eller *stämde inte*. Efter resan kan föraren markera en halka som appen missade. Båda funktionerna är byggda på egen bekostnad i september 2026 och slås bara på av testföraren själv.
- **Förarfacit.** Svaren används som förarfacit i AP1:s klassning och jämförs med kamera-, station- och SMHI-facit. Där förarna och kamerorna är oense redovisas det som ett eget resultat.
- **Enkät och gruppintervju** genomförs i april 2027 och upprepas i april 2028. De gäller upplevd träffsäkerhet, om rösten stör, om appen behålls, om föraren sänkte farten eller ökade avståndet vid varning, och vilken formulering av varningen föraren helst vill ha.

### Arbetspaket 4 — Rapport och spridning (apr–jun 2027, slutrapport apr 2028)

- **Rapporten** redovisar öppet metoden, resultaten och vad öppna data räcker till och inte, inklusive prognoslagrets utfall mot trösklarna, oavsett vilket det blir. Rapporten, metoden och tröskeldokumenten publiceras, så att väghållare, kommuner och andra utvecklare kan bygga vidare och pröva slutsatserna själva.
- **Presentationer** görs för Trafikverket (som dataägare och inför upphandlingen av fordonsdata 2027) och SKR:s nätverk för trafiksäkerhet. VTI och relevanta lärosäten erbjuds underlaget. NTF, trafikskolor och kommuner bjuds in när resultaten finns.
- **Appen** är den snabbaste spridningen: gratis i Google Play och App Store och i drift under två vintrar.

**Dataskydd.** Ingen position, inget GPS-spår och ingen rörelsedata lämnar telefonen automatiskt. All matchning sker i telefonen mot nedladdade ögonblicksbilder av de öppna datakällorna. Det enda som någonsin skickas är svar som föraren själv trycker:
- varningens id och tidpunkt tillsammans med svaret *stämde* eller *stämde inte*;
- en miss som föraren markerar efter resan: närmaste station, tidpunkt och vad det var.

Det gäller bara testförare som själva slagit på funktionen, som är avslagen från början. Ett svar pekar alltså ut ungefär var och när, och det står i appen. Inget konto, inget enhets-id och ingen IP-adress sparas, och ingen data delas med tredje part. Testförarnas kontaktuppgifter för presentkort och enkät hålls av projektledaren, åtskilda från appens data, och raderas när projektet avslutas.

## Innovationsgrad

*Vad är nytt med projektet, jämfört med det som redan finns?*

1. **Förhandsvarning i stället för reaktion.** Bilens egna system (ABS, antisladd, nödbroms) agerar när det redan har hänt, och SMHI varnar per län. Halkvakt varnar för platsen framför, i tid att sänka farten. Steget från mätstation till förare, under körning och på sträckan, har vi inte funnit i någon svensk tjänst för allmänheten.
2. **Alla förare, inte bara vissa bilmärken.** Fordonsburna halkvarningar finns i dag som betaltjänster knutna till bilmärke, med data som är stängd även för de kommuner som köper den. Den som kör en äldre bil, en ny förare med sin första bil eller en förare som inte betalar för en tilläggstjänst får ingenting. Fordonsdata varnar dessutom per konstruktion först när de första bilarna redan har kört på isen. Halkvakts varning bygger på data som staten redan samlar in och publicerar. Den är mätt innan första bilen är där, når varje förare med en telefon och kostar inget. De två systemen utesluter inte varandra, men bara det ena når alla.
3. **Mätbar från dag ett, och prövad innan den släpps.** Systemet är byggt för utvärdering:
   - alla indata arkiveras och alla varningar loggas med sina orsaker;
   - motorn är deterministisk och kan köras om på historiska data;
   - tretton tröskeldokument är fastställda och daterade *innan* de mätningar de styr;
   - versionshistoriken i projektets kodarkiv (omkring 1 000 versioner och fler än 380 numrerade, daterade beslut sedan 24 augusti 2026) styrker ordningen och kan visas för fonden.

   Metoden har redan sagt nej där data sa nej. En grind för vattenplaningsvarning föll (61 % träff mot kravet 70 %) och bokfördes som ett nej, utan att kravet flyttades. Två förbättringar av prognoslagret ströks när de mättes sämre. Prospektiv utvärdering mot förhandsregistrerade trösklar är standard i klinisk forskning. Såvitt vi funnit har den aldrig tillämpats på en trafikvarningstjänst för allmänheten.
4. **Återhållsam röst som designprincip.** Systemet är tyst som standard:
   - en fara vinner per ögonblick, och de övriga släpps i stället för att köas;
   - samma fara upprepas aldrig inom 10 minuter eller 5 km;
   - en punktmätning ger rösten "framöver", aldrig ett avstånd som datan inte bär.

   Takten är mätt, inte antagen. Under ett dygn i skuggmotorns logg (16 september 2026) kom 0 av 110 yttranden inom 60 sekunder efter ett annat.
5. **Facit ur fyra oberoende källor, plus föraren.** Varje varning prövas mot väglagskamera, SMHI-varning, rapporterad halka och mätstationens egen serie, och därtill mot förarens svar och missmarkeringar. Källorna läses mot varandra.
6. **Datakvalitet som bieffekt.** Varje mätvärde prövas mot ett fysiskt spann innan det får bära en varning. Arbetet har redan gett Trafikverket något tillbaka: sexton felmätande vägväderstationer upptäckta och anmälda i september 2026.
7. **Öppen metod, replikerbar i Norden.** Allt bygger på öppna data och dokumenteras öppet. Motsvarande arkiv för Finland, Danmark och Norge är redan i drift. Mätningen kan upprepas i ett annat län eller land med samma metod och samma trösklar.

**Kopplingar till andra projekt.** Projektet är fristående. Det bygger på Trafikverkets öppna API och SMHI:s öppna data, i skuggarkivet också på Fintraffics, Statens vegvesens och DMI:s data. Forskningsunderlaget kommer från bland andra VTI, VTT och Meteorologiska institutet i Finland (bilaga 4). Prognoslagrets datamodell följer Fintraffics öppet publicerade väglagsprognoser (Digitraffic). Ingen tidigare finansiering har sökts eller erhållits.

**Efter projektet.**
- Appen förblir gratis och i drift. Målet är att den ska bära sig genom tjänster till yrkestrafik och väghållare, inte genom konsumentavgifter.
- Rapporten, metoden och tröskeldokumenten publiceras öppet.
- Resultaten presenteras för Trafikverket och SKR och erbjuds VTI och lärosäten, inte minst inför Trafikverkets upphandling av fordonsdata 2027.
- Klarar prognoslagret trösklarna är nästa steg att förtäta det med fler mätkällor. Kommuner har egna vägväderstationer i gatunätet som i dag bara styr halkbekämpningen, och metoden tar emot en sådan källa med några dagars arbete.
- Ett kontrollerat försök vid en trafikövningsplats är nästa steg i effektmätningen, när en sådan partner finns.

## Personalplan

*Vem eller vilka ansvarar för planering och genomförande?*

**Bengt Lagerlöf, projektledare.** Ansvarar för projektplanen, rekrytering och uppföljning av testförare, utvärderingens uppläggning, kontakten med Trafikverket, rapport och spridning. Bakgrund: [ ]. Beräknad insats: [ ] timmar.

**Axel Lagerlöf, systemansvarig.** Ansvarar för datapipelinen, varningsmotorn, prognoslagrets drift, loggning och utvärderingsverktyg samt appens drift och publicering. Har utvecklat systemet under 2026. Bakgrund: [ ]. Beräknad insats: [ ] timmar.

Tillsammans 350 timmar enligt kostnadsplanen (AP1 180, AP2 100, AP3 30, AP4 40).

**Sökande organisation.** Föreningen Halkvakt är en ideell förening under bildande, med ändamålet att främja trafiksäkerheten på vintervägar: att utveckla, driva och utvärdera Halkvakt, att öppet redovisa hur väl öppna väglagsdata räcker för att varna förare i tid, och att sprida kunskap om halka och vinterkörning. Konstituerande möte hölls den 29 september 2026. Styrelsen består av Bengt Lagerlöf (ordförande), Axel Lagerlöf (kassör) och [namn borttaget] (ledamot och sekreterare); revisor är [namn borttaget]. Ansökan om organisationsnummer lämnades till Skatteverket den 30 september 2026, och numret och bankuppgifterna kompletteras så snart de finns. Stadgarna och protokollet från det konstituerande mötet bifogas som bilaga 9 och 10. Föreningen bedriver ingen näringsverksamhet; appen är gratis och utvecklingen 2026 är egenfinansierad.

**Samverkan.** Projektet har inga formella samarbetspartner.
- Trafikverket är dataägare och främsta mottagare av resultatet, och informeras vid projektstart och vid rapport. Projektgruppen anmälde i september 2026 sexton felmätande stationer till Trafikverket och har begärt att få ut historiska stationsobservationer.
- Testförarna (AP3) rekryteras av projektgruppen.
- NTF, trafikskolor, kommuner och trafikövningsplatser bjuds in som mottagare av resultaten.

## Kostnadsplan

**Sökt belopp totalt: 283 000 kr.**

Egen finansiering, ej sökt, omfattar utvecklingsarbetet 2026: appen, datapipelinen, prognoslagrets bygge, förarnas återkoppling och missmarkering, mätinfrastrukturen, givarvakterna och skuggdriften hösten och vintern 2026. Dessutom driften av det befintliga systemet fram till projektstart.

| Aktivitet | Kostnadspost | Antal | Pris | Summa | Sökt |
| :-- | :-- | :-: | :-: | --: | --: |
| AP1 Utvärdering | Analys och klassning av varningar mot facit | 120 tim | 700 kr | 84 000 | 84 000 |
| AP1 Utvärdering | Utvärderingsverktyg (jämförelseskript, rapportgenerering) | 60 tim | 700 kr | 42 000 | 42 000 |
| AP2 Prognoslager | Validering mot facit och trösklar, nationell felkarta, kalibrering, driftsättning inkl. ankomsttidsvy | 100 tim | 700 kr | 70 000 | 70 000 |
| AP3 Testförare | Rekrytering, instruktion, uppföljning, analys av svaren mot facit, enkät och gruppintervju | 30 tim | 700 kr | 21 000 | 21 000 |
| AP3 Testförare | Ersättning för fullföljd vinter (presentkort) | 40 st | 500 kr | 20 000 | 20 000 |
| AP4 Rapport | Rapport, presentationer, spridning | 40 tim | 700 kr | 28 000 | 28 000 |
| Drift | Server, lagring, körtid för mätningarna, appbutiker, domän (15 mån) | 15 mån | 800 kr | 12 000 | 12 000 |
| Resor | Möten med Trafikverket och testförare | — | — | 6 000 | 6 000 |
| **Totalt** | | | | **283 000** | **283 000** |

**Kommentarer.**
- Timpriset 700 kr avser egen tid för projektledning, analys och utveckling.
- AP2:s medel avser uteslutande validering, kalibrering och driftsättning mot användare från januari 2027.
- Inget belopp avser redan slutfört arbete.
- Ingen annan finansiär finns.
- Blir det beviljade beloppet lägre än det sökta prioriteras AP1 och AP2.

## Trafiksäkerhetsnyttan

*På vilket sätt förväntas projektet bidra till att öka trafiksäkerheten på väg?*

Halka står bakom ungefär hälften av vägskadorna i Norden. Den enskilt viktigaste faktorn föraren styr är farten i förhållande till väglaget. Det största hindret är att föraren inte vet att det är halt förrän det är för sent. Halkvakt ger föraren den kunskapen i tid, på den väg som körs, utan att kräva ny bil, visst bilmärke eller en betald tilläggstjänst.

Nyttan uppstår i tre led:
- **Direkt, för förare vintern 2026/27 och 2027/28.** Varje korrekt varning är ett tillfälle där en förare kan sänka farten före en hal sträcka i stället för på den. Med 300 aktiva användare och tio halkdagar per vinter blir det tusentals varningstillfällen, och även en liten andel förändrat beteende är olyckor som inte sker.
- **För de förare som ingen annan varnar.** Halkvarningar i bilen finns i dag för den som köper rätt bil och betalar för tjänsten. Halva bilparken saknar dem, och där finns de äldre bilarna, de nya förarna och de som kör mest på landsväg i mörker. En varning som når varje telefon når också dem.
- **För Trafikverket och andra aktörer.** Projektet ger den första mätta bilden av hur öppna väglagsdata fungerar som varning för allmänheten: vad datan fångar, vad den missar och hur mycket ett prognoslager tillför. Prövningen görs prospektivt mot förhandsdaterade trösklar, med finska Digitraffic som referens. Kunskapen är användbar för Trafikverkets egna tjänster, för upphandlingen av fordonsdata 2027, för väghållare och för andra som bygger på samma data. Redan under förberedelserna har arbetet gett Trafikverket något tillbaka: sexton felmätande vägväderstationer upptäckta och anmälda.

Projektet ligger i linje med Nollvisionen och med Skyltfondens prioritering av trafiksäkra transporter genom ny teknik. Det är gratis för trafikanten, i drift från start och mätbart.

## Bilagor

1. Denna text (utökade svar på fält 2–8).
2. Rekryteringsplan för testförare.
3. Systembeskrivning — vad Halkvakt gör, säger och inte gör.
4. Litteratur och källor som ansökan bygger på.
5. Källkartläggning, kort version med licenser.
6. Appen: skärmbilder och rösttexter.
7. Tröskeldokument för prognoslagret, med förteckning över samtliga tröskeldokument.
8. Anmälningar till Trafikverket om felmätande vägväderstationer.
9. Föreningens stadgar, antagna den 29 september 2026.
10. Protokoll från det konstituerande mötet den 29 september 2026.
