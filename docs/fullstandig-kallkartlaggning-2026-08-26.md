# Fullständig källkartläggning — Halkvakt/Trafikrisk

**Sammanslagning av två utredningar, i sin helhet.** Ursprunglig källkartläggning (25 augusti 2026) och kompletterande källkartläggning (26 augusti 2026), sammanförda enligt den ursprungligas struktur. Ingenting är sammanfattat eller förkortat — allt material från båda rapporterna finns här, med markeringen **[K]** där texten kommer från den kompletterande utredningen.

**Arbetsprincip:** ingen uppgift utan läst källa med datum. Alla uppgifter bygger på källor lästa i augusti 2026.

---

## Sammanfattning

- **Grunddata räcker för en MVP vintern 2026/2027 helt gratis och lagligt**: Trafikverkets öppna API (VViS-vägväder, väglag, olyckor/Situation, fartkameror, väglagskameror; licens CC0) plus SMHI (CC BY 4.0) och MET Norge (CC BY 4.0, Nowcast med 5-minuterssteg över hela Sverige) täcker halka, olyckor och fartkameror. Viltrisk kan modelleras grovt av offentlig statistik + NVDB, men utan färdigt API.
- **Den avgörande begränsningen**: Trafikverkets nya fordonsbaserade väglagsdata är **inte öppen** — den köps direkt från biltillverkare (Volvo, VW, Skoda, Seat) och delas bara med driftentreprenörer. Enligt European Transport Safety Council (ETSC) köper Trafikverket informationen "for an annual cost of 7 million SEK (€635,000) … generated when a car's safety systems (such as ABS or traction control) activate". Generaldirektör Robert Maiorana (10 nov 2025, via Carup/Vi Bilägare): "Innan vi hade tillgång till den här datan gjorde vi mätningar runt 3 000 gånger per år. Nu får vi in över 300 miljoner mätpunkter under vintern." Kommersiella friktionsdata från NIRA Dynamics och Klimator säljs B2B till fordonsindustri och väghållare, utan publik prislista. Appen kan alltså **inte** täcka blindpunkterna mellan VViS-stationerna med fordonsfriktionsdata till en MVP — blindpunkterna måste fyllas med MESAN-modelldata och Nowcast istället.
- **Differentieringen finns**: Ingen konsumentapp identifierades som idag använder VViS-väglagsdata eller fordonsfriktion för röstburna halkvarningar. Waze/Radarbot m.fl. täcker fartkameror och crowdsourcade faror men inte VViS-baserad halkprediktion. Största externa risker är (1) SMHI:s pågående API-avveckling och (2) en EU-domstolsdom som ger medlemsstater rätt att förbjuda fartkameravarningar.

**[K] Kompletteringens sammanfattning:** Fyra av sex undersökta områden ger användbara, öppna eller billiga källor direkt: Trafikverkets **TrafficFlow** (realtidsflöde, CC0) för ködetektion i Stockholm/Göteborg, **MSB:s översvämningskarteringar** (WMS + nedladdning) för statisk översvämningsrisk, **SMHI:s konsekvensbaserade vädervarnings-API** (CC BY 4.0, inkluderar skyfall/översvämning/vind) och **broavstängningar via Trafikverkets Situation-data** (CC0). Två områden är svaga: driftåtgärdsdata (plogning/saltning) är **inte öppet tillgänglig** och kommersiell probe-trafikdata (TomTom/HERE/Google) fungerar men med licens- och volymfällor. Snödrev-tröskeln är inte ett fast nationellt värde: Trafikverket definierar snödrev (D) vid vindhastighet vanligen 6–10 m/s och "särskilt väder 1" (SV1) vid 8–15 m/s (parametervalt per driftområde), båda kräver "drevbenägen snö" (≥2,0 cm snö/24h). MESAN (Mesan2gv3) innehåller siktparametern `vis` men 2,5 km-grid varje timme är för grovt för lokala, snabbrörliga dimstråk. Rekommendation: bygg ködetektion på TrafficFlow (gratis, CC0), lägg SMHI-varningar + MSB-kartor + Situation-broavstängningar som grundlager, och håll kommersiell probe-data (HERE gratisnivå) som reserv först vid behov. Acceptera att plognings-/saltningssignal och lokal dimma/vattensamlingsvarning i realtid inte kan byggas på verifierad öppen data idag.

## 1. Fordonsdata — stängd för tredjepart (viktigast)

Trafikverkets nya fordonsbaserade väglagsmätning (nytt för vintern 2025/2026) är **upphandlad och intern**, inte tillgänglig via öppet API. Omfattningen bekräftas av Trafikverkets generaldirektör Robert Maiorana (10 nov 2025): från runt 3 000 mätningar per år till "över 300 miljoner mätpunkter under vintern". Datan köps direkt från OEM (Volvo, Volkswagen, Skoda, Seat) och delas endast med Trafikverkets kontrakterade driftentreprenörer (108 driftområden). Enligt ETSC:s genomgång "Sweden uses real-time car data to detect slippy roads" kostar det 7 miljoner kr/år (€635 000) och bygger på signaler när bilens säkerhetssystem (ABS/antispinn) aktiveras. NIRA/Klimator är **inte** bekräftade leverantörer i den skarpa driften; ny upphandling planeras till 2027.
**Konsekvens: en gratis konsumentapp kan i praktiken inte få tag på fordonsfriktionsdata till lansering.**

- **NIRA Dynamics** (Linköping, grundat 2001, Mjärdevi Science Park): produkterna Road Surface Information/Road Surface Conditions bygger på data från uppkopplade bilar i 25-meterssegment. Enligt NIRA/Vaisala Xweather-pressrelease (2024) och Automotive World (2026) är tekniken driftsatt i **över 120 miljoner fordon världen över**, med kunder som Audi, Volkswagen, Honda, Volvo, Stellantis, Renault och Geely. Säljs till OEM, Tier 1 och "application developers". Ett gratis konto på roads.niradynamics.se ger visualiseringsverktyg och utvärderingsdata via API/datadump. Ingen publik prislista — priser sätts via direktkontakt.
- **Klimator** (Göteborg, noterat på Nasdaq First North Growth Market, ticker KLIMAT): plattformen Road Condition Data (RCD, prognoser i realtid + upp till 18 h) och sensorfusionslösningen AHEAD. Lanserade 2026 varumärket "Saltera" (saltera.io) för vinterunderhåll och sade upp sin likviditetsgarant (upphör 30 juni 2026). Litet bolag med rörelseförlust; ingen konkurs/uppköp konstaterad. Säljer B2B till väghållare och fordonsindustri; inget självbetjänings-API eller publika priser för småutvecklare hittades.
- **Data for Road Safety (SRTI-ekosystemet)**: EU-backat public-private-samarbete där "tillfälligt halt väglag" (temporary slippery road) är en av åtta delade SRTI-kategorier enligt Delegated Regulation 886/2013. Medlemskap är enligt ACEA (2 dec 2020) "open to all willing and relevant actors in the SRTI domain and subject to the approval of the General Assembly chair" och bygger på reciprocitet — "safety data being offered in return for safety services". Multi-Party Agreement anger att en Service Provider är skyldig att leverera L3-data som hämtats via ekosystemet "Free of Charge to the End User", och PoC-utvärderingen (Sweco) beskriver att data delas "in-kind (based on reciprocity)". Trafikverket är medlem. Oklart om en liten apputvecklare kan gå med helt utan att bidra med egen data; kontakt: info@dataforroadsafety.eu. **Bedömning: inte realistiskt för en solo-utvecklare på MVP-nivå, men en möjlig framtida väg.**

### 1b. [K] Driftåtgärdsdata (plogning/saltning) — också stängd

Trafikverkets vinterväghållningssida beskriver att man med "Trafikverkets vägväderstationer och rapportering av utförda åtgärder" kan följa väglaget. SBV (Standardbeskrivning för Basunderhåll Väg) kräver att "Utförda åtgärder ska redovisas via GPS." Entreprenörernas fordon är GPS-spårade och Trafikverket har 108 driftområden där alla kontrakterade entreprenörer delar samma data.

**Men denna data är inte öppen.** Den finns inte som objekttyp i det öppna API:t, och det finns ingen verifierad publik datamängd med plogbilspositioner eller åtgärdstidpunkter. Nytt för vintern 2025/2026 är att fordonsdata (friktion från bilar i trafik) används internt "för uppföljning, analys och erfarenhetsåterföring" — även detta internt.

**Räcker källan?** NEJ. Det går inte att bygga vare sig en "åtgärdat väglag"-nedgradering efter saltbil eller grus-efter-sandning-varning på verifierad öppen data idag. Vad som saknas: en öppen åtgärds-/positionsdatamängd. Rekommenderad åtgärd: kontakta Trafikverket direkt om möjlig åtkomst; annars lämna denna risk utan källa (i linje med projektets ärlighetsprincip).

## 2. Trafikverkets öppna API — ryggraden

- **Licens**: Creative Commons CC0 (fri även kommersiellt; källangivelse ej rättsligt krävd men lämplig). API-nyckel krävs (registrering med e-post, acceptera licens). POST-anrop mot `api.trafikinfo.trafikverket.se/v2/data.json` (eller `.xml`), svar i JSON eller XML. Nyckel kan även hämtas via Trafiklab.
- **Relevanta datamängder**: WeatherMeasurepoint (senaste observation per VViS-mätpunkt), WeatherObservation (alla observationer 7 dagar bakåt), RoadCondition (väglag; koder 1=Normalt, 2=Delvis hal, 3=Hal vägbana, 4=Mycket halt), Situation (händelser/olyckor/störningar, med utbredning och riktning), TrafficSafetyCamera (fartkameror/ATK-positioner), samt väglagskamerabilder (t.ex. `RoadConditionCamera_[id].Jpeg`).
- **VViS**: Trafikverket anger "totalt 750 stycken väderstationer … från Smygehamn i söder till Karesuando i norr" (svenska Wikipedia anger 763 stationer). Samtliga har väglagskameror som fotograferar var tionde minut även nattetid (yttemperatur, daggpunkt, lufttemperatur, nederbörd, vind i realtid). Endast statligt vägnät — ingen täckning på kommunala/enskilda vägar. Ett 30–50-tal platser har beröringsfria ytstatusgivare som uppskattar friktionsvärde (svenska Wikipedia anger "ett 30-tal platser"; Trafikverkets branschwebb anger "ett 50-tal väderstationer" med ytstatussensor).
- **Rate limits**: Ingen hård publicerad gräns; Trafikverket övervakar trafikvolym och kontaktar användare som överskrider dokumenterade gränser. Äldre API-versioner (<2) är avvecklade (v1–v1.3 stängdes 1 juli 2022).
- **Kända begränsningar**: RoadConditionOverview har tagits bort; WeatherStation-datamängden avvecklades 31 januari 2024 (ersatt av WeatherMeasurepoint/WeatherObservation). RoadCondition-anrop kan vara relativt tunga (>500 ms enligt Clear Bytes granskning). Enligt tredjepartsintegration (sverigenu.se) uppdateras RoadCondition-data i praktiken ca var 15:e minut.

### 2b. [K] Realtidsflöde: TrafficFlow finns i öppna API:t

Datamodellen på api.trafikinfo.trafikverket.se listar objekttypen **TrafficFlow** (schemaversion 1) med definitionen: "Uppmätta eller härledda värden relaterat till trafik eller enskilda fordonets rörelser på en viss sektion eller vid en specifik punkt på vägnätet." I API:ts versionshistorik beskrevs den vid lanseringen av v1.1 som "TrafficFlow – Trafikflöde i form av antal fordon och hastighet vid en given mätpunkt i större städer." (Trafikverket API VersionHistory / Model-sidan; bekräftat via NuGet-biblioteket Trafikverket.NET, hämtat aug 2026.)

Datakällan är MCS-detektorerna. Stockholms stads dataportal bekräftar att trafikmängder i Stockholm sammanställs bl.a. från "MCS-systemet (Motorway Control System) på E4/E18/E20 m.fl." Det betyder att MCS-flödesdata som frågan efterlyste faktiskt exponeras via TrafficFlow — antal fordon och medelhastighet vid mätpunkter.

- **Geografisk täckning:** "större städer" — i praktiken Stockholm och Göteborg där MCS finns, samt högbelastade trafiksystem. Inte nationellt heltäckande.
- **Format:** JSON eller XML via POST-request. Koordinater i SWEREF 99 TM och WGS 84.
- **Licens:** CC0 (Trafikverkets generella öppna datalicens).
- **Uppdateringsfrekvens:** MCS-detektorer mäter i realtid (sekund/minutnivå internt); den exakta publiceringsfrekvensen i TrafficFlow bör verifieras mot exempelsvar i datamodellen. API:t stöder även push via Server-Sent Events (SSE) för förändrat data.
- **Komplement:** `TravelTimeRoute` (schemaversion 1.4) ger "Restider i större städer eller i högbelastade trafiksystem. Beräkning av restid baseras på data från detektorer som är utplacerade längs bestämda rutter" — direkt användbart för att detektera onormalt långa restider = kö.

**Alternativa vägar (DATEX II):** Trafikverket levererar även "Measured and Elaborated Data Publications" via DATEX II på Datautbytesportalen (data.trafikverket.se). Sveriges National Access Point är Trafikverket självt. DATEX II är dock tyngre för en liten app än JSON-API:t.

**Räcker källan?** JA (geografiskt begränsad). TrafficFlow + TravelTimeRoute räcker för ködetektion på storstädernas motorvägar. Vad som saknas: nationell täckning (endast större städer) och verifiering av den exakta publiceringslatensen.

## 3. SMHI och nordiska väderkällor

- **SMHI** (licens Creative Commons Erkännande 4.0 SE / CC BY 4.0, källa måste anges): relevanta API:er efter generationsväxlingen är punktprognos/meteorologisk prognos (SNOW1gv1, ersätter PMP3gv2 som avvecklades 31 mars 2026), meteorologisk analys MESAN (Mesan2gv3, ~2,5 km rutnät, timvis; Mesan2gv2 avvecklas 1 november 2026 enligt SMHI 28 maj 2026), vädervarningar och observationer. MESAN levereras i JSON via punkt- eller områdesfråga. **Risk: aktiv API-generationsväxling kräver att appen byggs mot de nyaste versionerna direkt.**
- **MET Norge (api.met.no)** (licens CC BY 4.0): gratis, "no guarantees of delivery … or possibilities to obtain an SLA" (Terms of Service, rev. 2020-06-26). Nowcast 2.0 täcker Norge, Sverige, Finland och Danmark, uppdateras var 5:e minut, nederbördsprognos 2 timmar framåt baserad på väderradar (MEPS 2,5 km i botten). **Krav**: identifierande User-Agent med app/domän och kontakt-e-post (annars 403 Forbidden), koordinater trunkerade till max 4 decimaler (annars 403 för nya produkter), ingen kontinuerlig uppdatering av mobiler i bakgrunden när appen inte används, max 20 req/s per app totalt (annars särskild överenskommelse), samt caching via egen proxy-gateway rekommenderas starkt (browsers/appar bör inte anropa API:t direkt). MET är UN-godkänd "digital public good". Nowcast är förstahandskälla för närtidsnederbörd (snö/regn) mellan VViS-punkterna.
- **FMI (Finland) och DMI (Danmark)**: båda erbjuder öppna data, men relevansen för svensk halkprediktion är marginell jämfört med SMHI+MET; MET:s Nowcast och SMHI:s MESAN täcker redan Sverige väl. (Detaljerade villkor ej verifierade i denna omgång.)

**Not om nordiskt gränsstöd (verifierat 26 aug 2026):** SMHI, norska MET, finska FMI och estniska ESTEA driver prognosmodellen gemensamt i samarbetet MetCoOp, som producerar prognosensemblen MEPS — konvektionsupplösande, 2,5 km, täcker Skandinavien och de nordiska haven, och assimilerar observationer från radiosonder, SYNOP-stationer, fartyg, flygplan och väderradar från hela samarbetsområdet. MEPS ligger under både SMHI:s MESAN och MET:s Nowcast. Finska observationer finns därmed redan i den svenska prognosen och norska i Norrlandsprognosen — på modellnivå, utan separat integration. Danmark står utanför MetCoOp (egen Harmonie-modell), men de nordiska väderradarerna delas i ett gemensamt kompositnät som inkluderar dansk radar. Separat DMI-/FMI-integration tillför därför marginellt; de behålls som dokumenterad reserv enligt utbytbarhetsprincipen. **Den verkliga danska luckan är vägdata, inte väderdata — Vejdirektoratets vägväderstationer och trafikdata är outredda och en prioriterad framtida punkt för Öresundssegmentet.**

### 3b. [K] MESAN-siktparameterns användbarhet för dimvarning

**MESAN-sikt:** Mesan2gv3 (öppna data, ersätter Mesan2gv2 som avvecklas 1 nov 2026 enligt SMHI:s nyhet 2026-05-28) innehåller parametern **`vis` (Horizontal visibility, enhet km, en decimal)**. MESAN körs i **2,5 × 2,5 km grid, uppdaterad varje timme** via optimal interpolation av observationer + prognos. Historiskt beskriven med parametrarna: 2 m-temperatur, nederbörd, nysnö, vind/byvind, **sikt (visibility)**, relativ fuktighet, molnighet, molnbas, snödjup, m.m.

**Är 2,5 km/timme meningsfullt för dimstråk?** Endast delvis. För storskalig dimma (havsdimma, dalgångsdimma) ja, men lokala snabbrörliga dimbankar (hundratals meter, minuter) fångas inte. SMHI själva noterar att sikt "kan variera en hel del på relativt små områden" och att automatstationers Present Weather-givare "extrapolerar sikten på ett mycket kort avstånd."

**Bättre källor för dimma/sikt längs väg:**
- **VViS-siktgivare:** Endast ett 50-tal av Trafikverkets ~750 väderstationer har siktsensor — gles täckning men punktexakt där de finns, i realtid via WeatherStation-API (CC0).
- **METAR** från flygplatser: öppen, hög kvalitet, men bara vid flygplatser.
- **Vägkamerors bildanalys:** VViS-stationer har kameror riktade mot vägen; bildanalys för sikt är tekniskt möjlig men kräver egen utveckling.

### 3c. [K] Snödrev-tröskelvärden (Trafikverkets driftregler)

Trafikverket anger inte ett fast värde. I ersättningsmodellen (VädErs/VädErsKombi/Väderindex, VTI-underlag):
- **Snödrev (D):** vindhastighet ≥ V_D m/s samtidigt som "drevbenägen snö" förekommer; V_D valbart per driftområde, **vanligen 6–10 m/s** (steg 1 m/s), i genomsnitt under minst 4 timmar i följd.
- **Särskilt väder 1 (SV1) – snödrev vid hög vindhastighet:** ≥ V_SV1 m/s, **vanligen 8–15 m/s** (steg 1 m/s), i genomsnitt under minst 6 timmar i följd.
- **"Drevbenägen snö":** snöfall de senaste 14 dygnen med minst 2,0 cm i fast form under en 24-timmarsperiod.
- I SBV/ATB likställs snödrev med snöfall i standardbeskrivningen; vindhastighet och snöintensitet för snödrev/särskilt väder redovisas i bilaga 1–2 till mät- och ersättningsreglerna (ME). Räkneexempel i VTI-underlaget använder ibland V_D = 5,0–6,0 m/s, vilket bekräftar att den faktiska gränsen sätts individuellt.

**Räcker källan?** DELVIS. MESAN-sikt duger som grovt lager; VViS-sikt och METAR är bättre men glesa. För snödrev finns tydliga tröskelvärden (6–10 m/s + snö) som kan appliceras på VViS-vind + MESAN-nederbörd — en byggbar snödrevsvarning.

## 4. Vilt

- **Nationella Viltolycksrådet (viltolycka.se)**: statistik baseras på polisanmälda olyckor rapporterade av eftersöksjägare (uppdateras varje natt; rapportering kan dröja upp till två månader). Enligt Naturvårdsverket (feb 2026, data från viltolycka.se) rapporterades "drygt 73 300 trafikolyckor med klövvilt" under 2025 (varav rådjur ca 50 000/år; 2024 var siffran 76 867 enligt NVR). Flest olyckor i oktober–november; störst risk mellan skymning och gryning, samt en topp maj–juni för älg. Rapportverktyg och kartor per kommun finns (statistik.viltolycka.se) och statistik hos Naturvårdsverket, men **inget öppet API för sträck-/tidsupplöst data identifierades** — data presenteras via webbrapporter.
- **Prediktiv viltmodell**: Möjlig men grov. Man kan kombinera säsongs- och dygnsmönster (offentlig statistik), NVDB:s viltstängseldata (var stängsel saknas = högre risk) och funktionell vägklass, men utan öppna koordinat-/sträckdata i realtid blir modellen approximativ (län/kommun-nivå snarare än exakt vägsträcka). Forskningsunderlag finns (Trafikverkets DiVA-rapporter, Seiler m.fl.).

## 5. Kompletterande källor

- **NVDB** (via öppet API i Datautbytesportalen, licens CC0; historik via Lastkajen som kräver konto): 12+ datamängder, bl.a. Hastighetsgräns, Bärighet, Väghållare, Funktionell vägklass. Viltstängsel finns som dataprodukt på statligt vägnät (via Lastkajen). TN-ITS-tjänsten ger inkrementella uppdateringar av vägdata (CC0 1.0, "No fee is charged for access or use").
- **Kommunala öppna data**: Stockholm (dataportalen.stockholm.se, delvis CC0), Göteborg och Malmö har öppna geodataportaler för tätortsgator — relevanta eftersom VViS saknar kommunal täckning.
- **Trafikkameror**: utöver VViS-väglagskameror finns Trafikverkets trafikflödeskameror. Enligt tredjepartsöversikt (fartkameran.se, 14 aug 2026) omfattar stationsförteckningen 1 657 platser och 1 638 kameror totalt. Ingen mäter hastighet; bilder är lågupplösta, går inte att läsa registreringsskyltar på och sparas inte över tid.
- **Crowdsourcing**: möjlig framtida differentiator (användarrapporterad halka/vilt), men kräver kritisk massa.
- **Spårdjup/vägytemätningar (Trafikverket, via Lastkajen):** Trafikverket mäter vägytans tillstånd inkl. spårdjup på statliga nätet. Åtkomst via Lastkajen (samma konto som viltstängsel). Används av vattenplaningsrisk (spårdjup × regnintensitet). Statisk/årlig data — hämtas en gång per säsong. Att verifiera vid uttag: exakt dataprodukt, format, uppdateringstakt.
- **STRADA (Transportstyrelsen):** nationell olycksdatabas (polis + sjukvård). Används av risken "olycksdrabbad sträcka" (historik → riskkarta). Åtkomstform: uttagsansökan krävs hos Transportstyrelsen, licens och detaljnivå oklara. Åtgärd: ansökan/förfrågan, räkna med handläggningstid.
- **Solgeometri (beräkning, ingen extern källa):** solens azimut/höjd mot vägens riktning ur NVDB-väggeometrin. Används av solbländningsrisk. Licens: ej tillämplig (astronomi + CC0-data). Risknivå noll.

### 5b. [K] Vind- och brodata

**Öresundsbron – gränsvärden** (från Øresundsbrons trafikcenter, återgivna av Fokus Öresund mars 2020 med säkerhetschef Ulla V. Eilersen som källa):
- **> 19 m/s** (vid sidvind **> 15 m/s**): varsel om kraftig vind, avrådan för vindkänsliga fordon.
- **> 24 m/s:** godstågstrafik ställs in.
- **> 25 m/s medelvind: motorvägen (vägtrafiken) stängs;** passagerartåg kör fortfarande.
- **> 27 m/s:** all järnvägstrafik ställs in.
- Hastigheten sänks vid hård vind (t.ex. till 70 km/h; en äldre uppgift anger 50 km/h vid >19 m/s — värdena varierar mellan mediakällor). Öresundsbrons presstjänst bekräftar "vårt gränsvärde på 25 sekundmeter i medelvind" för stängning.

**Övriga broar:**
- **Högakustenbron & Sundsvallsbron:** stängs vid toppvindar/byar omkring 30 m/s. Trafikverkets pressinformatör Lennart Helsing: "När det är toppvindar på 30 meter i sekunden eller mer stänger man bron helt för trafik därför att det blir för vindkänsligt." Vid dokumenterade stängningar uppmättes byar 28–31 m/s.
- **Ölandsbron:** normal hastighet 70 km/h; variabla skyltar sänker hastigheten via en sensor som läser trafik, väder och vind; kan tillfälligt stängas/få begränsad framkomlighet vid kraftig vind eller halka.
- **Uddevallabron (Sunningesundsbron):** vindrestriktioner förekommer men exakta gränsvärden kunde inte verifieras i denna kartläggning.

**Publicering av driftstatus:**
- **Öresundsbron:** status på oresundsbron.com/trafikinformation och i Øresundsbrons app. **Inget känt publikt API** — endast webb/app. Bron drivs av Øresundsbro Konsortiet, inte Trafikverket.
- **Statliga broar (Högakustenbron, Sundsvallsbron, Ölandsbron m.fl.):** avstängningar ingår i **Trafikverkets Situation-data** (Deviation-objekt) i öppna API:t (CC0) och visas i trafikinformationskartan som "händelser med restriktioner på vägen."

**VViS vid broar:** Alla ~750 VViS-stationer mäter vindhastighet och vindriktning; vinddata är tillgänglig via WeatherStation-API (CC0). Den exakta förekomsten av en station vid varje enskild bro behöver dock verifieras station för station.

**Räcker källan?** DELVIS. För statliga broar: JA via Situation + VViS-vind. För Öresundsbron: NEJ på API-nivå — endast webbskrapning eller manuell hantering. Vad som saknas: Öresundsbrons drift-API och en verifierad mappning VViS-station↔bro.

### 5c. [K] Översvämning och vattensamlingar

**MSB:s översvämningskarteringar (Översvämningsportalen):** Innehåller alla MSB:s översvämningskarteringar samt hot- och riskkartor enligt förordningen om översvämningsrisker (SFS 2009:956). Visar vattenutbredning vid 100-årsflöde, 200-årsflöde och beräknat högsta flöde (BHF, grovt uppskattat ~10 000-årsflöde), samt klimatanpassade scenarier för slutet av seklet. Även Mälaren, Vänern, Göta älv, Torne älv och kustöversvämningar (decimeterintervall +0,1 till +5,0 m).
- **Format:** WMS-visningstjänster + nedladdning; GIS-skikt i Esri Shape, hotkartor som raster (tiff), lyr-filer medföljer. Inspire-anpassade tjänster finns.
- **Åtkomst:** gisapp.msb.se/Apps/oversvamningsportal. PFRA (områden med historiska översvämningar) som separat visningstjänst (inspire.msb.se/pfra/wms).
- **Karaktär:** **statisk planeringsdata**, inte realtid. Bra för att flagga riskområden/underfarter, inte för aktuell översvämning.

**SMHI hydrologiska varningar:** SMHI:s konsekvensbaserade vädervarnings-API (IBWW, opendata-download-warnings.smhi.se/ibww) levererar varningar i JSON och CAP/XML. Systemet omfattar bland annat skyfall, översvämning (höga flöden) och vind — de hydrologiska varningarna ingår i samma varnings-API. Licens CC BY 4.0.

**Kommunala skyfallskarteringar:** Malmö, Göteborg och Stockholm har skyfalls-/lågpunktskarteringar, men de publiceras fragmenterat via respektive kommuns GIS/öppna data och saknar enhetligt format/licens. Kräver kommun-för-kommun-integration.

**Trafikverkets Situation-data:** Översvämmade vägar och underfarter rapporteras som händelser (Deviation) i Situation-datan när de upptäcks/rapporteras — CC0, realtid, men beroende av manuell rapportering och därmed inte heltäckande vid plötsliga skyfall.

**Räcker källan?** DELVIS. För statisk risk (var det brukar översvämmas): JA via MSB + kommunala kartor. För akut varning vid skyfall: DELVIS via SMHI-varningar (regional geometri, inte vägspecifik) + Situation (rapportberoende). Vad som saknas: realtidsdata om faktiska vattensamlingar på specifika vägavsnitt/underfarter.

### 5d. [K] Kommersiell probe-/trafikdata — gratisnivåer

**HERE Traffic API:** Freemium med **250 000 platform-transaktioner/månad gratis, inget kreditkort krävs** (enligt HERE:s eget pressmeddelande 2018-01-08: "Freemium – Free access to the HERE platform ... with a limit of 250,000 platform transactions, 5,000 SDK active users and 250 managed assets per month"). Över gränsen: "Pay-as-you-grow: $1 per additional 1,000 transactions"; Pro-plan "$449/month ... 1 million platform transactions". Vissa avancerade trafik-API:er (Advanced Traffic) har lägre fribelopp (ca 2 500/månad). Detta är den mest lämpade gratisnivån för en liten app.

**TomTom Traffic API:** **2 500 icke-tile-anrop/dag** gratis plus 50 000 tile-anrop/dag ("50,000 tile and 2,500 non-tile requests every day ... daily free amounts apply on all plans", TomTom Developer Portal). Inget kreditkort, kommersiell användning tillåten; överskrids gränsen returneras "HTTP 403 – Over the limit". Från ca €0,50 per 1 000 anrop därutöver. TomTom lyfter fram mer tillåtande licens än Google — uttryckligen inget förbud mot att visa resultat ovanpå icke-TomTom-baskartor. **OBS: prismodellen revideras från juli 2026.** TomTom bygger på "billions of connected-vehicle and probe data points".

**Google Routes/Roads API:** Efter 1 mars 2025 finns ingen samlad $200-kredit; Google "modifying the USD $200 monthly recurring credit by offering a free monthly usage threshold for each Core Services SKU" (Google for Developers). Per-SKU fribelopp: Essentials 10 000, Pro 5 000, Enterprise 1 000 events/månad. Trafikmedveten routing ligger i Pro (5 000 gratis/månad). Billing-konto med kreditkort krävs alltid, även inom gratisnivån. Google har typiskt de striktaste villkoren om att kombinera med/visa över andra kartleverantörer.

**Räcker gratisnivåerna för 1 000–10 000 användare?** DELVIS. Räkneexempel: 10 000 användare × 1 pollning per resa/dag ≈ 300 000 anrop/månad — överstiger HERE:s 250 000 och Googles Pro-nivå men klarar inte heller TomToms 2 500/dag (=75 000/månad). Vid frekvent polling längs rutt (t.ex. var 30:e sekund under en resa) spricker alla gratisnivåer snabbt. Realistiskt: gratisnivån räcker för i storleksordningen ~1 000 måttligt aktiva användare, inte 10 000 med kontinuerlig rutt-polling. **Licensfällor:** Google förbjuder generellt cachning/lagring och visning över konkurrentkartor; HERE och TomTom är mer tillåtande. Kombinationsförbud mot andra kartleverantörer gäller främst Google.

## 6. Konkurrentanalys

- **Waze** (Google): crowdsourcade faror (olyckor, stillastående fordon, poliskontroller), fartkameravarningar och röstvarningar, fungerar i Sverige. Täcker **inte** VViS-baserad halkprediktion; eventuell halka bygger på användarrapporter.
- **Google Maps**: fartkameror i Sverige, men saknar dedikerad halk-/väglagsvarning.
- **Fartkameravarnare** (Radarbot, CamSam, Blitzer, RadarAll; samt Saphe som hårdvara): fokuserar på fartkameror/farozoner och marknadsför sig som "100 % laglig" i Sverige, men täcker inte väglag. Coyote System (franska processens motpart) uppgav 650 000 användare i Europa (Fleet News).
- **Slutsats**: Ingen identifierad app använder Trafikverkets VViS-väglagsdata eller fordonsfriktion för röstburna halkvarningar till konsument. **Tydlig differentieringsmöjlighet.**
- **Juridik**: Fartkameravarning är lagligt i Sverige (till skillnad från Tyskland där appar/GPS-varning är förbjudna med böter 75 € och prick). EU-domstolen (CJEU) prövade en tvist mellan franska Conseil d'État och Coyote System och slog fast att medlemsstater får införa begränsningar av varningar i navigationsappar som Waze, men att det inte finns något generellt EU-förbud och att åtgärder måste vara "necessary, proportionate, and limited in time". I Sverige är det upp till regeringen att eventuellt införa förbud — ännu ej gjort, men en regulatorisk risk att bevaka. Butikspolicyer (Google Play/App Store) tillåter fartkameravarnare; flera sådana appar finns redan i svenska butiken.

## 7. Rekommenderad dataarkitektur i lager

1. **Stationspunkter (bas)**: Trafikverket WeatherMeasurepoint + RoadCondition (VViS). Ger faktiskt väglag och yttemperatur i ~750 punkter på statligt vägnät.
2. **MESAN-utfyllnad**: SMHI Mesan2gv3 (2,5 km, timvis) för att interpolera väderläge mellan stationerna — kritiskt för blindpunkterna eftersom fordonsdata är stängd.
3. **Nowcast-närprognos**: MET Norge Nowcast 2.0 (5-minuterssteg, 2 h framåt) för snö-/regnfronter i realtid över hela Sverige.
4. **[K] Trafikflödeslager**: TrafficFlow + TravelTimeRoute för ködetektion i storstad; Situation för rapporterade händelser nationellt.
5. **[K] Statiska risklager**: spårdjup, viltsträckor, solgeometri, MSB-översvämningskarteringar, STRADA-historik — hämtas per säsong, inte per anrop.
6. **Fordonsdata (om/när tillgänglig)**: NIRA/Klimator via avtal eller DFRS-medlemskap — framtida uppgradering, inte MVP.
7. **Kameraverifiering**: Trafikverkets väglagskamerabilder (var 10:e minut) som visuell bekräftelse vid osäkerhet.

## Källkarta (fullständig tabell, båda utredningarna)

| Källa | Innehåll | API/Format | Licens | Kostnad | Uppdatering | Täckning | Risknivå |
|---|---|---|---|---|---|---|---|
| Trafikverket VViS (WeatherMeasurepoint) | Vägväder, yttemp, daggpunkt, vind | REST POST, JSON/XML | CC0 | Gratis | Realtid (min-nivå) | Statligt vägnät, ~750 pkt | Låg |
| Trafikverket RoadCondition | Väglag (koder 1–4) | JSON/XML | CC0 | Gratis | ~var 15:e min | Statliga riks-/länsvägar | Låg |
| Trafikverket Situation | Olyckor, störningar, broavstängning, översvämmad väg | JSON/XML | CC0 | Gratis | Realtid | Statligt vägnät | Låg |
| **[K] Trafikverket TrafficFlow** | Antal fordon + medelhastighet per mätpunkt (MCS) | JSON/XML POST, SSE-push | CC0 | Gratis | Realtid (frekvens verifieras) | Större städer (Sthlm/Gbg) | Medel (täckning) |
| **[K] Trafikverket TravelTimeRoute** | Aktuella + statistiska restider på rutter | JSON/XML | CC0 | Gratis | Realtid | Större städer | Medel |
| **[K] Trafikverket DATEX II** | Mätt/härledd trafikdata | DATEX II XML | CC0 | Gratis | Realtid | Statligt vägnät | Medel (tyngre format) |
| Trafikverket TrafficSafetyCamera | Fartkameror/ATK | JSON/XML | CC0 | Gratis | Sällan (statisk) | Nationellt | Medel (regulatorisk) |
| Trafikverket väglagskameror | Bilder var 10:e min | JPEG-URL | CC0 | Gratis | Var 10:e min | VViS-master | Låg |
| **[K] VViS siktgivare** | Punktsikt vid station | JSON/XML | CC0 | Gratis | Realtid | ~50 av ~750 stationer | Låg |
| **[K] Trafikverket ME/SBV snödrevströsklar** | Definition D/SV1 (vind + snö) | PDF (referens) | Publik | — | Statisk | Nationellt | Låg |
| SMHI MESAN (Mesan2gv3, inkl. `vis`) | Väderanalys 2,5 km, sikt | REST, JSON | CC BY 4.0 | Gratis | Timvis | Hela Sverige | Medel (äldre version avvecklas 1 nov 2026) |
| SMHI prognos (SNOW1gv1) | Punktprognos | REST, JSON | CC BY 4.0 | Gratis | Löpande | Hela Sverige | Medel (PMP3 avvecklades 31 mar 2026) |
| SMHI vädervarningar (IBWW) | Varningar: skyfall, översvämning, vind | REST, JSON + CAP/XML | CC BY 4.0 | Gratis | Löpande/realtid | Hela Sverige (regional geometri) | Låg |
| MET Norge Nowcast 2.0 | Nederbörd 5-min, 2 h | REST, JSON | CC BY 4.0 | Gratis (ingen SLA) | Var 5:e min | Norden inkl. Sverige | Medel (ingen leveransgaranti) |
| **[K] METAR (flygplatser)** | Sikt, väder vid flygplats | Öppen | Öppen | Gratis | ~30–60 min | Flygplatser | Låg |
| NVDB (öppet API) | Hastighet, vägklass, väghållare, väggeometri | REST | CC0 | Gratis | Löpande | Nationellt | Låg |
| NVDB viltstängsel | Stängselutbredning | Lastkajen (konto) | CC0 | Gratis | Löpande | Statligt vägnät | Låg |
| Spårdjup (Lastkajen) | Vägytemätning | Lastkajen (konto) | CC0 (verifiera) | Gratis | Årlig | Statligt vägnät | Medel (format oklar) |
| Solgeometri | Beräkning ur NVDB | — | — | 0 | Deterministisk | Överallt | Ingen |
| **[K] MSB Översvämningsportal** | Karteringar 100/200-år, BHF, kust | WMS + Shape/tiff | Öppen (MSB) | Gratis | Statisk | Nationell (utpekade vattendrag/kust) | Låg |
| **[K] Kommunala skyfallskarteringar** | Lågpunkter/skyfall | WMS/GIS (varierar) | Varierar | Gratis | Statisk | Malmö/Gbg/Sthlm m.fl. | Medel (fragmenterat) |
| Viltolycka.se/NVR | Viltolycksstatistik | Webbrapport (ej öppet API) | Oklar | Gratis | Nattlig | Nationellt (kommun-nivå) | Hög (inget API) |
| STRADA | Olyckshistorik | Uttagsansökan | Oklar | Oklar | Periodisk | Nationellt | Hög (åtkomst oklar) |
| **[K] HERE Traffic API** | Realtidstrafik/probe | REST JSON | Proprietär | 250 000 trans./mån gratis (inget kort), sedan $1/1000; Pro $449/mån = 1 M | Realtid | Nationell+ | Medel (prismodell) |
| **[K] TomTom Traffic API** | Realtidstrafik/probe | REST JSON | Proprietär (tillåtande) | 2 500 icke-tile-anrop/dag gratis, sedan ~€0,50/1000 (revideras juli 2026) | Realtid | Nationell+ | Medel |
| **[K] Google Routes API** | Trafikmedveten routing | REST JSON | Proprietär (restriktiv) | Pro-SKU 5 000 events/mån gratis, kreditkort krävs | Realtid | Nationell+ | Hög (villkor) |
| **[K] Öresundsbron driftstatus** | Aktuell driftstatus/avstängning | Endast webb/app | Proprietär | — | Realtid | Öresundsbron | Hög (inget API) |
| NIRA RSI/RSC | Fordonsfriktion | API/datadump | Kommersiell | Ej publik | Realtid | Där uppkopplade bilar kör | Hög (avtal krävs) |
| Klimator RCD / Saltera | Vägväderprognos | API | Kommersiell | Ej publik | Realtid + 18 h | Vägnät | Hög (avtal krävs) |
| DFRS/SRTI | Halka m.m. från fordon | DATEX II | Reciprocitet + MPA | "Gratis"/in-kind | Realtid | EU | Hög (medlemskap + godkännande) |
| FMI / DMI | Reservinstitut, nationella varningar | Öppen | Öppen | Gratis | Löpande | FI/DK | Låg (dokumenterad reserv) |
| Vejdirektoratet (DK) | Dansk vägväder-/trafikdata | Att utreda | Att utreda | Att utreda | — | Danmark | Öppen fråga (outredd) |

## Rekommendationer

**Fas 1 – MVP vintern 2026/2027 (starta nu, kostnad noll):**
1. Bygg mot Trafikverkets öppna API v2 (registrera API-nyckel omgående): WeatherMeasurepoint, RoadCondition, Situation, TrafficSafetyCamera, väglagskameror. Detta ensamt ger halka (VViS), olyckor och fartkameror.
2. Integrera SMHI direkt mot **de nyaste** API-versionerna (Mesan2gv3, SNOW1gv1) — bygg aldrig mot de äldre som redan avvecklas. Ange SMHI som källa (CC BY 4.0-krav).
3. Integrera MET Norge Nowcast 2.0 med korrekt identifierande User-Agent och egen caching-proxy (respektera 20 req/s, 4-decimalers koordinater, ingen bakgrundspolling). Ange MET som källa.
4. Viltvarning som "statisk riskvarning" per sträcka/säsong/dygnstid från offentlig statistik + NVDB viltstängsel — marknadsför **inte** som realtid.
5. Fartkameravarning från TrafficSafetyCamera — lagligt idag, men lägg in en on/off-inställning som snabbt kan aktiveras vid framtida regeländring.
6. **[K] Bygg ködetektion på TrafficFlow + TravelTimeRoute först** (gratis, CC0). Testa faktisk publiceringslatens mot exempelsvar i datamodellen. Tröskel för att gå vidare: om latensen är >5 min eller täckningen otillräcklig utanför Stockholm/Göteborg — gå till kommersiell reserv.
7. **[K] Grundlager för väder-/miljörisk:** SMHI:s vädervarnings-API (IBWW) för skyfall/översvämning/vind + MSB Översvämningsportal (statiska riskområden, WMS) + Trafikverket Situation (broavstängningar, översvämmad väg). Detta ger fyra risktyper direkt.
8. **[K] Snödrevsvarning:** kombinera VViS-vind (tröskel 6–10 m/s för D, 8–15 m/s för SV1) med nederbördsvillkor (drevbenägen snö: ≥2,0 cm snö senaste 14 dygn) enligt Trafikverkets egen logik. Byggbar utan ny datakälla. Sätt initialt V_D=8 m/s som konservativ default och kalibrera regionalt.
9. **[K] Dimvarning (begränsad):** använd MESAN `vis` som grovt lager, förstärkt av VViS-siktgivare och METAR där de finns. Kommunicera osäkerheten tydligt för användaren.

**Fas 2 – börja avtals- och ansökningsprocesser nu (lång ledtid):**
10. Kontakta NIRA Dynamics (öppna gratis utvärderingskonto på roads.niradynamics.se) och Klimator/Saltera för att förstå licensvillkor och pris för fordonsfriktion — detta är enda vägen att på sikt täcka blindpunkterna med faktiska mätdata.
11. Kontakta info@dataforroadsafety.eu om SRTI-medlemskap och exakt reciprocitetskrav (måste man bidra med egen data? finns penningavgift?).
12. Bevaka Trafikverkets kommande fordonsdata-upphandling 2027 och öppna dialog om eventuell framtida tredjepartsåtkomst.
13. **[K] Kommersiell probe-data som reserv:** välj **HERE** (250 000/mån gratis, tillåtande licens) framför TomTom/Google. Aktivera när nationell täckning krävs eller TrafficFlow inte räcker. Undvik Google för konsumentapp pga restriktiva kombinations- och cachningsvillkor. Benchmark: om månadsanrop närmar sig 200 000, planera betald HERE-nivå eller egen cachning/aggregering.
14. **[K] Acceptera datagap:** plognings-/saltningssignal och realtids-vattensamlingar på specifika vägavsnitt saknar öppen källa. Öresundsbrons status kräver webbskrapning. Kontakta Trafikverket respektive Øresundsbro Konsortiet om formell dataåtkomst; annars lämna dessa risker utan källa enligt projektets princip. Benchmark som ändrar beslutet: om Trafikverket öppnar en åtgärds-/positionsdatamängd (bevaka Datautbytesportalens nyheter) eller Öresundsbron publicerar ett drift-API.

**Tröskelvärden som ändrar rekommendationen:**
- Om NIRA/Klimator erbjuder friktionsdata under rimlig kostnad → lyft in som eget lager och marknadsför realtidstäckning mellan stationer.
- Om svensk lagstiftning förbjuder fartkameravarning → stäng den funktionen, behåll halk-/vilt-/olycksvarning (kärnvärdet påverkas inte).
- Om SMHI/MET ändrar villkor eller inför avgift → växla till kvarvarande gratis nordisk källa; håll dataabstraktion så att väderlager är utbytbart.

## Förbehåll

**Från den ursprungliga utredningen:**
- **Fordonsdata-premissen korrigerad**: Trafikverkets fordonsdata för vintern 2025/2026 köps direkt från OEM (Volvo, VW, Skoda, Seat), inte via NIRA/Klimator i den skarpa driften; NIRA/Klimator har figurerat i tidigare pilot-/forskningsprojekt. Priset 7 miljoner kr/år (€635 000) är belagt av ETSC med DN som ursprungskälla (delvis bakom betalvägg) — bör dubbelkollas mot DN om exakt siffra är affärskritisk.
- **Antal VViS-stationer och friktionsgivare**: källorna spretar (750 respektive 763 stationer; "ett 30-tal" respektive "ett 50-tal" med ytstatusgivare). Använd storleksordningen, inte exakt tal.
- **Rate limits**: Trafikverket publicerar ingen exakt hård gräns; MET Norges 20 req/s gäller totalt per app (alla installationer sammanräknat).
- **Viltdata**: inget öppet API bekräftades hos NVR/viltolycka.se; sträckupplöst realtidsdata saknas offentligt, och licensvillkoren för statistiken är oklara. En prediktiv viltmodell blir därför approximativ.
- **DFRS-avgift**: dokumenten betonar "free of charge" och "in-kind/reciprocity", men det gick inte att verifiera om en liten apputvecklare kan gå med helt utan att bidra med egen data eller om penningavgift förekommer. Kräver direktkontakt.
- **Ej fullt verifierat**: FMI/DMI:s exakta villkor; eventuell existens av svenska nischade halk-appar (ingen hittad, men marknaden kunde inte uttömmande genomsökas då sökbudgeten tog slut innan en riktad app-sökning hann göras).

**[K] Från den kompletterande utredningen:**
- **TrafficFlow-latens och exakt täckning** är inte fullt verifierade; datamodellsidan (datacache.trafikverket.se/API/Model) blockerar automatiserad åtkomst — verifiera exempelsvar manuellt med API-nyckel innan implementation.
- **Snödrev-tröskeln är parametervald per driftområde** (D vanligen 6–10 m/s, SV1 vanligen 8–15 m/s), inte ett nationellt fast värde. Räkneexempel i VTI-underlaget använder ibland 5–6 m/s. Bekräfta mot aktuell SBV-bilaga 1–2 / ME om exakthet krävs.
- **Öresundsbrons vindgränser** varierar något mellan mediakällor (t.ex. hastighetssänkning till 50 vs 70 km/h); 25 m/s medelvind för stängning är dock konsekvent. Öresundsbron är inte en Trafikverket-bro och dess status ligger utanför Trafikverkets API.
- **Kommersiella prismodeller ändras** (TomTom reviderar från juli 2026; Google ändrade 1 mars 2025). Verifiera aktuella villkor före implementation.
- **Kommersiella API:ers gratisnivåer** definieras i "transaktioner/anrop" som kan skilja sig från antal användarpollningar; en pollning kan generera flera transaktioner.
- **Mesan2gv3 vs v2:** SMHI noterar "vissa skillnader i vilka parametrar som ingår"; `vis` är standardparameter i MESAN och finns i den aktuella parametertabellen, men v3-specifik parameterlista bör slutverifieras mot SMHI:s länkade metadata (Mesan2gv3) före driftsättning.
- **Kommunala skyfallskarteringar** har inte enhetligt format/licens och kräver integration kommun för kommun.

**Gemensamt:** Alla uppgifter bygger på källor lästa i augusti 2026; API-villkor och avvecklingsdatum kan ändras — prenumerera på SMHI:s och MET:s ändringsflöden samt Trafikverkets API-versionshistorik. Villkorsvakts-receptet (Visualping, motorkrav M8) kan återanvändas för att bevaka just dessa ändringssidor.
