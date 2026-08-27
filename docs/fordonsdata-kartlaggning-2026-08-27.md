# Fordonsgenererad data för Halkvakt — kartläggning av vägar, kostnader och juridik (research 27 augusti 2026)

**Status:** underlag/utredning i Halkvakt-mappen, samma nivå som källkartläggningarna. Rapporten återges i sin helhet, oredigerad. Arbetsprincip: ingen uppgift utan läst källa med datum; alla uppgifter bygger på källor lästa i augusti 2026.

---

## Sammanfattning (TL;DR)

- **Den realistiska vägen för en liten aktör (0–50 000 kr/år) är i praktiken tvådelad: (1) telefonen-som-sensor med crowdsourcing, som är den enda metod där kostnaden ≈ utvecklingstid och där du äger hela datakedjan, och (2) gratis utvärderings-/prototypkonton hos NIRA Dynamics, High Mobility, Smartcar och Caruso för att bygga och testa mot simulerad data.** Att i produktion köpa fordonsgenererad väglagsdata från OEM-plattformar är tekniskt möjligt men prissatt per aktiverat fordon och per OEM, vilket gör en rikstäckande väglagskarta ekonomiskt orimlig för en mikroaktör.
- **EU:s dataakt (2023/2854, tillämplig sedan 12 september 2025) ger bilägaren/användaren rätt att låta en tredje part (t.ex. Halkvakt) få ut fordonets "readily available" data på FRAND-villkor — men just den bearbetade halk-/friktionssignal projektet vill åt är sannolikt "inferred/derived data" och därmed undantagen delningsplikten.** Volvo bekräftar själva att deras friktionsvärde är beräknat: PR-chef Magnus Holst (Volvo Cars Sverige, via Carup.se) säger att "datan kommer från vår tjänst Connected Safety där vi genom signaler från flera bilar kan beräkna ett friktionsvärde för en specifik vägsträcka." Designkraven på direktåtkomst börjar gälla 12 september 2026.
- **Dörrar som är stängda: Trafikverkets inköpta OEM-väglagsdata (delas bara med driftentreprenörer, inget öppet API), OBD-porten under körning (låst av cybersäkerhetsskäl), och de kollapsade datamarknadsplatserna Otonomo/Wejo. Öppna dörrar: telefonsensor-spåret, forskningssamarbeten (Drive Sweden/Vinnova, RISE), Data for Road Safety-ekosystemet (reciprocitet) och norska/finska öppna data.**

## Huvudfynd

1. **Dataakten ger en samtyckesväg, men den mest värdefulla halkdatan är undantagen.** Användaren (ägare eller leasetagare/förare som faktiskt använder bilen) har enligt artikel 4 rätt till fordonets data och enligt artikel 5 rätt att utse en tredje part som mottagare. Men EU-kommissionens vägledning (publicerad 12 september 2025, OJ-referens C/2025/5026, 15 september 2025) slår fast att "inferred or derived data" — t.ex. resultat av proprietära ABS-/friktionsalgoritmer — faller utanför delningsplikten. Rå sensordata och enkelt förbehandlad data (utomhustemperatur, torkarstatus, hjulhastighet) är däremot i regel i scope.

2. **De neutrala plattformarna är byggda för små utvecklare men prissätts per bil.** High Mobility: gratis registrering och simulator, minimiavgift €99/månad som krediteras mot aktiverade fordon ("usually consumed already after 20 active vehicles"), per-fordon-prissättning, "almost 30 brands". Smartcar: gratis nivå (1 uppkopplad bil), Build-plan från $1,99/bil/applikation/månad upp till 100 bilar, OAuth-samtyckesflöde, 40+ märken. Caruso Dataplace: 99 € engångsavgift för medlemskap, ingen minimimånadsavgift, 250 € datakredit, virtuell OEM för test.

3. **Volvo — mest relevant för svensk flotta — har ett självbetjänings-utvecklar-API med gratis nivå.** Volvo Cars Connected Vehicle API använder OAuth 2.0 mot Volvo ID med uttrycklig ägarsamtycke, "a free tier capped at 10,000 calls per day per app", och exponerar bl.a. odometer, däcktryck, bromsstatus, motorstatus, fönsterstatus, varningar och "environment values" (utomhustemperatur). Produktionscredentials ges efter manuell granskning. Volvo har även öppnat en Data Portal (data.volvocars.com) explicit för dataakten.

4. **Svensk fordonsflotta domineras av Volvo och VW-gruppen** — precis de märken vars data både Trafikverket köper och som finns på de neutrala plattformarna. 2025 nyregistrerades enligt Mobility Sweden 48 961 Volvo och 38 677 Volkswagen (VW ökade med över 9 000 bilar mot 2024), följt av Toyota, Kia, Mercedes, Skoda, BMW, Audi. Mest registrerade modell 2025 var Volvo XC60 (17 933 nyreg.), följt av Volvo EX40 och VW ID.7; i det totala beståndet är Volvo V70 och VW Golf de vanligaste.

5. **Telefon-som-sensor är forskningsmässigt validerat och kommersiellt beprövat.** Accelerometer + gyroskop + GPS ger vägojämnhets-/potthålsdetektion med dokumenterad träffsäkerhet i intervallet ~84–96 % (t.ex. 84 % med k-means/PSD men bara 46 % precision, stigande till 92,4 % efter platsklustring i Wu et al., PMC7583950; Z-DIFF-algoritmen nådde 92 % true positive rate i pavement-studier; inkrementell inlärning med concept drift nådde 96 %). Halkdetektion via hjulslirning kräver dock referens till hjulhastighet (VehSense använde OBD-II). Kommersiellt kör Greater Than (Enerfy), Paydrive (numera OBD-fritt via Cambridge Mobile Telematics) och Folksam telematik-appar i Sverige i stor skala.

6. **OBD-porten är i praktiken stängd för din datatyp under körning.** Standard-OBD-PID:er (SAE J1979) ger inte ABS-/antispinnaktivering; det är tillverkarspecifikt och måste reverse-engineeras. UNECE R155 (cybersäkerhet) och OEM:ernas gateway-låsning gör realtidsläsning under körning svår, plus garantifrågor.

7. **Trafikverkets data är stängd, men forsknings- och nordiska vägar är öppnare.** Trafikverket köper OEM-väglagsdata för sju miljoner kronor per år (enligt Dagens Nyheter, återgivet av Vi Bilägare) och delar den bara med sina basunderhållskontrakt/driftentreprenörer; ny upphandling planeras 2027. Drive Sweden/Vinnova finansierar dock projekt (utlysningar ~12–20 Mkr, max 3–4 Mkr/projekt, max 50 % medfinansiering) där en liten part kan få tillgång till fordonsdata genom konsortiedeltagande. Norge (Statens vegvesen) och Data for Road Safety erbjuder reciprocitetsbaserad tillgång.

## 1. Rättsläget — EU:s dataakt tillämpad på fordon

**Grundmekanik.** EU:s dataakt (förordning (EU) 2023/2854) är horisontell och tillämplig från **12 september 2025**. EU-kommissionen publicerade **"Guidance on vehicle data"** (offentliggjord 12 september 2025, officiell OJ-referens C/2025/5026 daterad 15 september 2025). Vägledningen är inte juridiskt bindande (bindande tolkning görs bara av EU-domstolen) men ger den officiella synen på hur kapitel II tillämpas på fordon. Den gäller enbart fordonssektorn (OEM:er, underleverantörer, aftermarket, försäkringsbolag).

**Vem är "användare"?** Dataakten ger rättigheterna till "användaren" av den uppkopplade produkten — det kan vara ägaren, men också en leasetagare eller annan som faktiskt använder fordonet enligt avtal. Detta är viktigt för Halkvakt: det är bilens användare, inte nödvändigtvis den registrerade ägaren, som kan ge samtycke.

**Kan en apputvecklare begära ut data med ägarens samtycke?** Ja. Artikel 5 ger användaren rätt att begära att data holder (tillverkaren) delar "readily available data" med en tredje part som användaren utsett. Praktiskt: användaren (via Halkvakt) riktar en begäran till OEM:en; OEM:en måste dela på FRAND-villkor (fair, reasonable, non-discriminatory). Tillverkaren får inte ta betalt av användaren för att utöva rätten, men får avtala om skälig ersättning med tredje parten (artikel 9). Kommissionen ska komma med ytterligare vägledning om beräkning av ersättning enligt artikel 9(5). Gatekeepers utpekade enligt DMA får inte vara mottagande tredje part (artikel 5(3)).

**Vad är "readily available data"?** Data som data holder kan hämta utan oproportionerlig ansträngning. Kommissionens vägledning delar in i tre kategorier: (a) rådata (osorterade sensorsignaler, CAN-bus, användarinput), (b) förbehandlad data (hastighet, temperatur, bränsleförbrukning) — båda i scope; (c) **inferred/derived data** (förarpoäng, prediktiv analys) — utanför scope. Vägledningen preciserar att data som beskriver verkliga händelser/tillstånd är i scope "även om normaliserad, omformaterad, filtrerad, kalibrerad" — enkla matematiska operationer undantar inte. Men prediktioner och resultat av proprietära algoritmer faller normalt utanför.

**Konsekvens för Halkvakt (central juridisk begränsning):** Den bearbetade halk-/friktionssignalen är enligt Volvo själva ett beräknat värde. Magnus Holst, PR-chef Volvo Cars Sverige (via Carup.se): "Datan kommer från vår tjänst Connected Safety där vi genom signaler från flera bilar kan beräkna ett friktionsvärde för en specifik vägsträcka." Ett sådant beräknat friktionsvärde är sannolikt **derived data och därmed undantaget delningsplikten**. Däremot bör underliggande signaler som utomhustemperatur, torkarstatus, hjulhastighet och rå ABS-aktiveringshändelse (händelsen i sig, inte den beräknade friktionen) kunna begäras.

**Andra begränsningar:** förbud mot att använda data för att utveckla en konkurrerande uppkopplad produkt; företagshemligheter kan hållas tillbaka (artikel 4(8)/5(9-11)) om data holder kan visa sannolik allvarlig ekonomisk skada, med skriftlig motivering och anmälan till behörig myndighet; säkerhets-/typgodkännandeundantag finns.

**Designkrav på direktåtkomst:** Enligt artikel 3(1) ska nya uppkopplade produkter designas så att data är direkt åtkomlig för användaren — detta gäller från **12 september 2026**.

**Svensk tillsynsmyndighet:** Post- och telestyrelsen (PTS) får ansvaret för dataakten i Sverige. En särskild utredare skulle föreslå kompletterande svenska bestämmelser med redovisning i december 2025; till dess har PTS inte fullständiga befogenheter. För personuppgiftsdelen är Integritetsskyddsmyndigheten (IMY) tillsynsmyndighet.

**Efterlevnad/tvister sedan 12 sep 2025:** Inga rapporterade formella tvister eller sanktioner specifikt om fordonsdata under dataakten hittades så här långt. CLEPA (europeiska underleverantörer) varnade 30 oktober 2025 för att ett kommande "Digital Omnibus"-initiativ (väntat mitten av november 2025) kan "vattna ur" dataakten, och påpekar att OEM:er erbjuder mycket olika mängd datapunkter — enligt CLEPA "some offering 6 data points and others well over 200".

**Sektorsspecifik EU-lagstiftning om fordonsdata:** Den länge diskuterade dedikerade sektorsspecifika förordningen om "access to in-vehicle data, functions and resources" har **aldrig publicerats som förslag** — utlovad till slutet av 2021, upprepade gånger skjuten (CLEPA noterade förseningen redan i januari 2023) och i praktiken ersatt av den horisontella dataakten plus vägledningen från september 2025. Branschen fortsätter kräva den. Inget officiellt kommissionsbesked som formellt drar tillbaka förslaget hittades — statusen är "ej levererad/i praktiken skrinlagd till förmån för dataakt + vägledning".

## 2. Neutrala serverplattformar och Extended Vehicle

**High Mobility** (bekräftat via prissida, 27 aug 2026): gratis registrering, gratis bilsimulator/sandbox ("start experimenting with the car API for free using our car simulator"), ingen plattforms-/licensavgift. Minimiavgift **€99/månad krediteras mot aktiverade fordon** ("a flat minimum fee of €99 per month that is credited toward your activated vehicles ... In our experience, the minimum fee is usually consumed already after 20 active vehicles for popular data packages"). Per-fordon-prissättning per månad. Stöder "almost 30 brands" (även angivet "over 22 OEMs", "over 500 models", "more than 300 data items" — siffrorna varierar mellan sidor). Bekräftade märken inkl. Volvo Cars, Mercedes-Benz, BMW/Mini, VW-gruppen, Toyota/Lexus, Stellantis, Polestar, Tesla. Relevanta datapunkter bekräftade: extern temperatur (Climate: "external temperature"), dimljus (Lights: "fog lights"), GPS-koordinater/heading (Vehicle Location), däcktryck. Wiper-/ABS-/ESP-/hastighetsdatapunkter kunde inte verifieras explicit på publika sidor (ligger i Airtable-katalog/konsol; en "Dashboard Lights 180 items"-kapabilitet finns som troligen omfattar varningslampor). Live-data endast EEA + UK. Leverans via REST (pull) eller MQTT/AWS/Azure.

**Smartcar** (bekräftat via prissida 2025): 4 planer. Free ($0, 1 uppkopplad bil, 3 simulerade, begränsade signaler). Build från **$1,99/bil/applikation/månad**, upp till 100 bilar. Custom (500 bilar minimum). OAuth2-samtyckesflöde ("Smartcar Connect" — bilägaren kopplar bilen med några klick, granskar exakt vilka data appen får). 40+ märken, tidig tillgång i Europa (ursprungligen USA-fokuserat). Relevanta datapunkter: position, odometer, däcktryck (TPMS), bränslenivå/räckvidd, EV-batteri, VIN. Notera: Smartcars styrka är laddning/mätarställning/position — inte nödvändigtvis väglagsspecifik data som torkare/ABS. Billing: per bil, per applikation, per månad; prorateras vid anslutning.

**Caruso Dataplace** (bekräftat): neutral VIN-baserad marknadsplats, "more than 90% of the connected car park in Europe", 400+ dataitems. 99 € engångs-medlemsavgift, **ingen minimimånadsavgift** för datakonsumtion ("we don't charge a minimum monthly fee for data consumption"), 250 € datakredit per period i vissa paket, "Virtual OEM" med simulerad data för test, developer portal, consent-portal. Flexibla prismodeller (per VIN/månad, per anrop, flat rate). EU-baserad.

**OEM:ernas egna utvecklarportaler:** Mercedes-Benz, BMW (ConnectedDrive), Stellantis har egna portaler; dessa är ofta inriktade på in-car/infotainment snarare än flottdatauttag. High Mobility och Caruso aggregerar dem.

**Tesla Fleet API:** pay-per-use sedan jan/feb 2025. Vehicle Data-abonnemang från $2,50/bil/månad; kommandon i pack (2000 credits för $2,50); $10/månad rabatt per konto (ej per bil). Streaming-signaler billigare. En tredjepartsutvecklare (Tessie) uppskattade offentligt att köra en befintlig Tesla-app skulle kosta ~$60 miljoner/år under den nya modellen — dvs. designat för att begränsa storskalig polling. För Halkvakt är Tesla en mindre del av svenska flottan (Tesla föll ca 67 % under 2025 till 7 254 bilar för helåret enligt Mobility Sweden, efter att Model Y rasat 68 %).

**Otonomo/Wejo — kollapsade båda:** Wejo gick i administration/konkurs 30 maj 2023 (avnoterades från Nasdaq; värderat till <$10M mot $800M–$1,4 md vid IPO 2021; förlust $159,3M år 2022). Otonomo förvärvades av Urgent.ly i en reverse merger (uppgifter anger februari 2024, ~$270M). Kombinerad intäkt 2022 ~$15M mot driftskostnader >$250M. Lärdomen (S&P Global): problemet var inte databrist utan brist på köpare — "nobody's yet ready to share" och tvist om vem som äger fordonsdata. **Detta är en central varningssignal:** ren datamarknadsplats-modell för fordonsdata har inte fungerat kommersiellt.

**ISO 20077/20078 (Extended Vehicle/ExVe):** OEM:ernas standardiserade ramverk för att exponera fordonsdata via egna backend-servrar ("Extended Vehicle"). Det är den arkitektur som gör att data alltid går via OEM:ens moln (inte direkt från bilen), vilket är exakt det som dataaktens designkrav (2026) och aftermarket-branschen ifrågasätter eftersom det ger OEM:en kontroll över vad som exponeras.

## 3. Tillverkarnas egna API:er med fokus på Volvo

**Volvo Cars Connected Vehicle API (v2):** OAuth 2.0 mot Volvo ID, uttrycklig ägarsamtycke, VCC-API-Key, **gratis nivå "capped at 10,000 calls per day per app"**. Endpoints: fordonsdata (status, diagnostik, statistik, metadata) — odometer, bränslemängd, däcktryck, bromsstatus, motorstatus, fönsterstatus, varningar, "environment values". Kräver Volvo On Call eller Google Built-In. Produktionscredentials efter manuell granskning. Volvo Data Portal (data.volvocars.com) är explicit byggd för dataakten. Kommersiell användning kräver partneravtal utöver självbetjäning. Detta är den mest lovande enskilda OEM-vägen för Halkvakt givet Volvos dominans i svensk flotta.

**VW-gruppen (Cariad):** VW/Skoda/Seat/Cupra/Audi. Data finns via High Mobility och Caruso; egen utvecklarportal mindre öppen för små aktörer. VW är näst största märket i Sverige, så täckningen är strategiskt viktig.

**Tesla:** se ovan — dyrt och begränsat.

**Toyota/Kia/Hyundai:** Toyota (3:a i Sverige 2025, 22 189 nyreg.), Kia (4:a, 19 922). Finns via High Mobility (Toyota/Lexus, Kia, Hyundai). Egna öppna självbetjänings-API:er för väglagsdata är begränsade i Europa.

**Svensk flotta (nyreg. 2025, Mobility Sweden):** Volvo 48 961, VW 38 677, Toyota 22 189, Kia 19 922, Mercedes 17 372, Skoda 16 664, BMW 15 001, Audi 14 887, Peugeot 9 059, Polestar 7 601, Tesla 7 254, Cupra 7 034. Slutsats: Volvo + VW-gruppen (VW+Skoda+Seat+Cupra+Audi) täcker en mycket stor andel — och det är precis dessa Trafikverket köper från och de neutrala plattformarna täcker bäst.

## 4. Smartphone som sensor

**Forskningsläget:** Vägojämnhet/potthål med accelerometer + gyroskop + GPS ger dokumenterat ~84 % (k-means/PSD, men bara 46 % precision), 92,4 % efter platsklustring (Wu et al., PMC7583950), 92 % true positive rate (Z-DIFF), 93,75 % (tröskel + hastighet), och upp till 96 % (inkrementell inlärning med concept drift). Federated learning-studier når 97–98 % för potthål/gupp. Kraftig inbromsning och sladd detekteras via accelerometer/gyro. **Halka/friktion är svårast:** kräver referens till hjulslirning (skillnad mellan mark- och hjulhastighet) — VehSense löste detta genom telefon + OBD-II. Med enbart telefon kan man approximera via hård acceleration/inbromsning-respons och GPS-hastighet vs. förväntad, men det är mindre tillförlitligt än bilens egna ABS-baserade signal.

**Kommersiella tjänster i Sverige/Norden:** Greater Than (Enerfy, Stockholm, börsnoterat) — AI-baserad körbeteendeanalys per sekund/meter, numera OBD-fri (enbart telefon). Paydrive (~8 500 användare historiskt, samarbetar med Gjensidige; ny app via Cambridge Mobile Telematics/MIT). Folksam "Köra Säkert" med Telia. Moderna Smart Flex. Cambridge Mobile Telematics är den globala infrastrukturleverantören bakom flera. Detta bevisar att telefon-baserad insamling i skala fungerar tekniskt och juridiskt i Sverige.

**Tekniska begränsningar:** iOS/Android begränsar bakgrundsinsamling hårt (iOS särskilt strikt — kräver "Always" location-permission, energieffektiv triggning); batteriförbrukning vid kontinuerlig GPS + hög-frekvens IMU; telefonens montering/orientering kräver kalibrering (reorientering av accelerometeraxlar mot fordonets ram); brus från handhållning. Lösning: automatisk trip-detektion (aktivera bara vid körning), sensor-fusion, on-device förbehandling.

**Kan crowdsourcing bygga en väglagskarta med 1 000–10 000 användare?** Ja för vägojämnhet/potthål/kraftiga händelser — det är precis vad forskningen visar och vad mobile crowdsensing-system gör. För ren halk-/friktionskarta är telefondata svagare än bilens ABS-data, men aggregerad över många fordon (kraftiga inbromsningar, sladdhändelser, hastighetsavvikelser på specifika segment) kan den ge en probabilistisk riskindikator. 1 000 aktiva användare i ett geografiskt fokuserat område kan ge meningsfull täckning på stora vägar; 10 000 ger nationell relevans på högtrafikerade sträckor. Glesa landsbygdsvägar förblir underrepresenterade.

## 5. OBD-donglar och eftermonterad hårdvara

**Standard vs. tillverkarspecifikt:** Standard-OBD-II PID:er (SAE J1979, Mode 01) ger motorvarv, fordonshastighet, kylvätsketemp, insugsdata m.m. — men **inte** ABS-/antispinnaktivering, individuella hjulhastigheter eller friktionsberäkning. Dessa ligger på tillverkarspecifika CAN-ID:n som inte publiceras och måste reverse-engineeras per modell (forumbelägg: användare kämpar med att hitta GM-specifika PID:er för hjulhastighet/ABS).

**Leverantörer:** Teltonika (FMB-serien, egna API/plattform), Munic, CSS Electronics (CAN-loggning), Geotab (telematik i skala, DFRS-medlem). Priser varierar; hårdvara + abonnemang typiskt några hundra kr/enhet + månadsavgift.

**Juridiska/tekniska hinder:** UNECE R155 (cybersäkerhets-typgodkännande, obligatoriskt) driver OEM:er att låsa CAN-gateway så tredjepart inte kan läsa känsliga bussar under körning. OBD-portens fulla åtkomst begränsas i praktiken till stillastående/diagnostik. Garantifrågor vid inkoppling. Slutsats: OBD-dongel kan ge grov körbeteendedata (som försäkringsbolagens boxar) men **inte** den ABS-baserade friktionssignalen utan modellspecifik reverse-engineering — inte skalbart för Halkvakt.

## 6. GDPR och integritet

**EDPB Guidelines 01/2020** (slutversion 2.0, antagen 9 mars 2021) om personuppgifter i uppkopplade fordon. Huvudkrav: (1) Fordonet betraktas som "terminal equipment" enligt ePrivacy-direktivet art. 5(3) — därför krävs som huvudregel **samtycke** för att lagra/läsa data i fordonet, och samtycke är den primära rättsliga grunden även för efterföljande behandling (ordet "consent" förekommer 86 gånger i vägledningen). (2) Nästan all positions- och körbeteendedata är personuppgift när den kan kopplas till individ. (3) Undantag från samtycke: eCall (112), stöldspårning (samtycke), strikt nödvändigt för uttryckligen begärd tjänst. (4) Lokal behandling i fordonet rekommenderas för att minimera risk. (5) Dataminimering, ändamålsbegränsning, korta lagringstider.

**När är fordonsdata personuppgift?** Position + tidsstämpel + körmönster är nästan alltid personuppgift (identifierbar via mönster även utan namn). Ren aggregerad/anonymiserad väglagsdata (t.ex. "friktion låg på segment X kl 08") är det inte om den är verkligt anonymiserad.

**Rättslig grund för Halkvakt:** För insamling av position + körbeteende från appens användare krävs **samtycke** (och för telefonsensor-spåret är appen själv personuppgiftsansvarig). Nyckeln är: samla in med samtycke → förbehandla/aggregera on-device eller omedelbart → lagra endast anonymiserad/aggregerad väglagsdata för kartan. Då hamnar själva kartprodukten utanför GDPR medan insamlingen är laglig.

**IMY:** Inga IMY-uttalanden specifikt om fordonsdata/telematik hittades. IMY:s prioriteringar 2025 var arbetsliv, AI i vården, digitala verktyg i vård/omsorg, kamerabevakning; 2026 brottsbekämpning, barn/unga, AI i offentlig sektor. Fordonstelematik är alltså inte i uttalat tillsynsfokus — men allmänna GDPR-krav gäller fullt ut.

**Praktiska krav på Halkvakt:** tydlig samtyckesdialog (granulär, återkallelig), transparent integritetspolicy, dataminimering, on-device-förbehandling, anonymisering/aggregering före lagring, korta råloggslagringstider, DPIA (konsekvensbedömning) eftersom storskalig positionsinsamling är hög risk, personuppgiftsbiträdesavtal med ev. molnleverantör.

## 7. Svenska/nordiska samarbetsvägar

**Trafikverkets 2027-upphandling:** Trafikverket köper i dag OEM-väglagsdata (Volvo, VW, Skoda, Seat) för sju miljoner kronor per år (enligt Dagens Nyheter, återgivet av Vi Bilägare) och delar den bara med sina basunderhållskontrakt/driftentreprenörer; ny upphandling planeras 2027. Generaldirektör Roberto Maiorana (via Ny Teknik): "Nu får vi in 300 miljoner mätpunkter under ett år, det innebär en väldigt stor skillnad och en betydligt bättre precision" — mot tidigare ca 3 000 konventionella mätningar/säsong. Björn Eklund, senior utredare på avdelning Underhåll: "Vi förbereder en ny upphandling av fordonsdata som ska vara på plats 2027, då kan det bli aktuellt med kompletterande fabrikat." En liten aktör kan realistiskt inte vinna denna upphandling, men kan bevaka den och positionera sig som underleverantör/analystjänst. Trafikverket bygger också uppkopplade vägytemätningar (potthål, tjälskador via stötdämparrörelser/bildanalys) — i vissa fall daglig datainsamling — vilket öppnar för samarbete.

**Drive Sweden / Vinnova:** Strategiskt innovationsprogram; finansierar ~20 projekt/år via Vinnova/Energimyndigheten/Formas. Utlysningar typiskt ~12–20 Mkr totalt, max 3–4 Mkr/projekt, max 50 % medfinansiering, minst 2–3 parter varav behovsägare/näringsliv/offentlig. Detta är den **mest konkreta vägen för en liten aktör att lagligt få tillgång till riktig fordonsdata** — genom att gå in i ett konsortium med t.ex. RISE, en OEM eller Trafikverket. Exempel finns redan: RISE-projekt om "integritetsskyddande fordonsdatadelning" (Alkit Communications, Privasea, blockkedja/Web3, kopplat till dataakten).

**RISE / AstaZero:** RISE driver fordonsdata- och vägväderprojekt; AstaZero (testbana) för aktiv säkerhet. ISET/SMHI-vägväderprojekt kan ge partnerskap. Vägen in är projektdeltagande, inte köp.

**Norge (Statens vegvesen):** Historisk Volvo–Trafikverket–Statens vegvesen-pilot (50 Volvo-bilar delade friktionsdata via moln, då bilen detekterade halt väglag). Statens vegvesen har omfattande öppna data (dataut.vegvesen.no, DATEX-baserat) inkl. trafikmeldinger/situationsdata — men fordonsgenererad friktionsdata per fordon verkar inte publiceras öppet. Norge har varit aktivt i NordicWay-piloterna (C-ITS).

**Finland (Fintraffic/Traficom):** Finland är känt för öppen trafikdata via Fintraffic (Digitraffic-API:er). Exakt vilken fordonsgenererad väglagsdata Fintraffic delar öppet kunde inte verifieras inom budget — bör verifieras direkt.

**Data for Road Safety (SRTI-ekosystemet):** reciprocitetsmodell — "safety data being offered in return for safety services". Öppet för "any industry partner in the transportation, mobility and traffic data domain and public authorities" att gå med. Baserat på EU-förordning 886/2013 (åtta SRTI-kategorier inkl. halka). Detta är potentiellt en väg för Halkvakt att både bidra (telefon-crowdsourcad data) och få tillgång — men kräver att man kan leverera värde tillbaka och uppfyller de tekniska/organisatoriska self-declaration-kraven.

## 8. Kostnadsbild och realism

**Vad en aktör med 0–50 000 kr/år faktiskt kan få:**

- **Gratis:** NIRA Dynamics utvärderingskonto (roads.niradynamics.se), High Mobility registrering + simulator, Smartcar Free (1 bil + 3 simulerade), Caruso Virtual OEM, Volvo API gratis nivå (10 000 anrop/dag), all öppen data (Trafikverket VViS, SMHI, MET Norge, Statens vegvesen, ev. Fintraffic).

- **Räkneexempel Smartcar (Build, $1,99/bil/app/månad ≈ ~22 kr/bil/månad vid ~11 kr/USD):** 100 kopplade bilar ≈ $199/månad ≈ ~2 400 kr/månad ≈ **~29 000 kr/år**. 1 000 bilar överskrider Build-planens tak (100) → Custom-plan (min 500 bilar), sannolikt volymrabatterat men fortfarande i storleksordningen **hundratusentals kr/år**. OBS: Smartcar exponerar dessutom begränsat väglagsrelevanta signaler.

- **Räkneexempel High Mobility (€99/månad minimi, krediteras; per-fordon-pris ovanpå):** minimiavgiften "usually consumed after 20 active vehicles". Det exakta per-fordon-priset för väglagsrelevanta datapaket publiceras inte utan visas i konsolen och drivs av OEM-datakostnad. Realistiskt: **€99/månad ≈ ~13 000 kr/år som golv**, men verklig kostnad för 100–1 000 bilar med kontinuerlig temperatur/däcktryck/positionsström kan snabbt bli **tiotusentals till hundratusentals kr/år** beroende på uppdateringsfrekvens och OEM-mix. Caruso: 99 € engångs + datakostnad per VIN/anrop, ingen månadsminimi — potentiellt billigast för lågvolym-experiment.

- **Telefonsensor-spåret:** kostnad ≈ utvecklingstid + molndrift (billig). Ingen per-fordon-avgift. Skalar till 10 000+ användare för marginalkostnad. **Detta är det enda spåret som skalar inom en mikrobudget.**

**Trösklar:** Under ~50 000 kr/år: gratis konton + telefonsensor + öppen data + prototyping mot simulatorer. Medelstora belopp (100 000–500 000 kr/år): produktions-OEM-data för några hundra–tusen bilar via High Mobility/Caruso. Helt utom räckhåll: rikstäckande realtids-OEM-friktionsdata för hela flottan (Trafikverkets 7 Mkr/år-nivå), egen datamarknadsplats (Otonomo/Wejo brände hundratals miljoner).

## Sammanfattande tabell — vägar till fordonsdata

| Väg / aktör | Vilka data | Täckning i Sverige | Kostnad | Juridisk grund / krav | Tid att komma igång | Realism (liten utv.) |
|---|---|---|---|---|---|---|
| Telefonsensor + crowdsourcing (egen app) | Ojämnhet, potthål, hård inbromsning, sladd; indirekt halka | Skalar med användarbas | ≈ utvecklingstid + billig molndrift | GDPR-samtycke, DPIA, anonymisering | Veckor–månader | **Hög** |
| Öppna data (VViS/SMHI/MET/Statens vegvesen) | Vägväder, väglag, trafik | Nationell (stationer) | Gratis | Öppen licens | Dagar | **Hög** |
| NIRA Dynamics utvärderingskonto | Friktion/väglag (utvärdering) | Volvo+VW-baserat, stort | Gratis (utvärdering) | Kontovillkor | Dagar | **Hög** (test), Låg (produktion utan pris) |
| Volvo Connected Vehicle API | Temp, däcktryck, broms/motorstatus, varningar, position | Volvo (störst i SE) | Gratis nivå 10 000 anrop/dag; kommersiellt = partneravtal | OAuth + ägarsamtycke; dataakt | Dagar–veckor (+granskning) | **Medel–Hög** för Volvo |
| High Mobility | Extern temp, dimljus, position, däcktryck m.m. (~30 märken) | Bred (Volvo, VW, Merc, BMW…) | €99/mån golv + per bil; sim gratis | Consent flow; FRAND/OEM-villkor | Veckor | **Medel** (test hög) |
| Smartcar | Position, odometer, däcktryck, EV, VIN | 40+ märken, växande i EU | Free→$1,99/bil/mån→Custom | OAuth consent | Dagar–veckor | **Medel** |
| Caruso Dataplace | 400+ items, multi-brand | >90 % EU connected park | 99 € engångs + data per VIN | Consent-portal | Veckor | **Medel** |
| Tesla Fleet API | Fordonssignaler, position | Tesla (liten & krympande i SE) | $2,50/bil/mån+; dyrt i skala | OAuth | Veckor | **Låg** |
| OBD-dongel (Teltonika/Munic) | Körbeteende, standard-PID; ej ABS-friktion | Alla bilar (hårdvara) | Hårdvara + abonnemang | Ägarsamtycke; R155-lås under körning | Månader | **Låg** för väglag |
| Trafikverket OEM-väglagsdata | ABS-baserad friktion, >300M punkter | Nationell | 7 Mkr/år (endast entreprenörer) | Upphandling | — | **Låg/stängd** (bevaka 2027) |
| Drive Sweden/Vinnova/RISE-projekt | Riktig fordonsdata via konsortium | Projektberoende | Medfinansiering ~50 % | Konsortieavtal | Månader (utlysningscykel) | **Medel** (bästa lagliga väg till riktig data) |
| Data for Road Safety (SRTI) | Safety-events (inkl. halka) | Europeisk, reciprocitet | Medlemskap + bidra data | Self-declaration, tekniska krav | Månader | **Medel** |
| Otonomo/Wejo | — | — | — | — | — | **Stängd** (kollapsade) |

## Rekommendationer

**Fas 1 (0–6 mån, budget <50 000 kr) — bygg fundamentet du äger:**
1. Fortsätt bygga Halkvakt på öppna data (VViS, SMHI, MET Norge) — kärnan.
2. Bygg **telefonsensor-crowdsourcing** som primär egen datainsamling: automatisk trip-detektion, on-device förbehandling (accelerometer/gyro/GPS), aggregering till anonymiserade vägsegment. Detta är det enda spåret som skalar inom budget och som du äger fullt ut. Investera i korrekt GDPR-design (granulärt samtycke, DPIA, anonymisering) från dag ett.
3. Registrera gratis konton hos **NIRA Dynamics, High Mobility, Smartcar, Caruso** och prototypa mot simulatorerna. Registrera Volvo-utvecklarkonto och testa gratisnivån (10 000 anrop/dag) — Volvo är den strategiskt viktigaste enskilda OEM:en för svensk flotta.

**Fas 2 (6–18 mån) — validera OEM-data i liten skala:**
4. Kör ett litet pilotuttag via **Volvo API** eller **Caruso** (lägst tröskel, ingen månadsminimi) för att validera om rå ABS-händelse/temperatur/torkardata faktiskt går att få med användarsamtycke — testa dataaktens artikel 5-väg i praktiken och dokumentera vad OEM:erna faktiskt lämnar ut (kom ihåg: det *beräknade* friktionsvärdet är sannolikt undantaget).
5. Ansök om **Drive Sweden/Vinnova-finansiering** i konsortium (med RISE och/eller en OEM och/eller Trafikverket). Detta är den mest realistiska vägen till riktig fordonsdata i volym utan egen kapitalinsats.

**Fas 3 (18+ mån) — positionera mot ekosystemet:**
6. Utvärdera medlemskap i **Data for Road Safety** där din crowdsourcade telefondata kan bli din "reciprocitets-valuta".
7. Bevaka **Trafikverkets 2027-upphandling** och positionera dig som analys-/tjänsteleverantör ovanpå datan snarare än som dataköpare.

**Tröskelvärden som ändrar strategin:** Om telefonsensor-crowdsourcing når >1 000 aktiva användare med god geografisk spridning → bygg egen väglagskarta och sök DFRS-medlemskap. Om dataaktens artikel 5-uttag visar sig ge rå ABS-/temperaturdata till FRAND-pris under ~50 öre/bil/månad → skala OEM-spåret. Om Vinnova-finansiering beviljas → prioritera OEM-datavalidering.

## Ärlig bedömning: vilka dörrar är stängda och varför

- **Trafikverkets inköpta OEM-friktionsdata:** stängd. Delas enbart med basunderhållskontraktens driftentreprenörer, inget öppet API, ~7 Mkr/år-nivå. Bevaka 2027 men förvänta dig inte tillgång som mikroaktör.
- **Det beräknade friktionsvärdet (Volvo Connected Safety / NIRA-algoritm):** juridiskt stängt via dataakten eftersom det sannolikt är "derived data" — Volvo bekräftar själva att det är ett beräknat värde.
- **OBD-porten under körning:** tekniskt stängd av UNECE R155/gateway-låsning; ABS-data är dessutom tillverkarspecifik och opublicerad.
- **Ren datamarknadsplats-modell:** kommersiellt bevisat ohållbar (Otonomo/Wejo).
- **Storskalig Tesla-polling:** prohibitivt dyr och Tesla är litet i Sverige.
- **Öppna dörrar:** telefonsensor-crowdsourcing, öppna data, gratis prototypkonton, Volvo-gratisnivå, forskningskonsortier (Drive Sweden/Vinnova/RISE), Data for Road Safety.

## Strategisk slutsats: kan dataaktens per-bilägare-samtyckesväg bygga en egen väglagsdatamängd?

**Kort svar: teoretiskt ja, praktiskt nej för en mikroaktör — och den är underlägsen telefonsensor-spåret.**

Dataaktens samtyckesväg (appens egna användare kopplar sina bilar via High Mobility/Smartcar/Caruso/Volvo) fungerar juridiskt och tekniskt, men tre faktorer gör den olämplig som *primär* datakälla för Halkvakt: (1) **Kostnad skalar linjärt med flottan** — per-fordon-avgifter gör 1 000+ bilar till en hundratusentkronorsfråga per år, medan telefonspåret har nära noll marginalkostnad. (2) **Den mest värdefulla signalen (beräknad friktion) är undantagen** delningsplikten som derived data; det du kan få (temperatur, torkare, rå ABS-händelse) är nyttigt men inte den färdiga halkindikatorn. (3) **Kritisk massa kräver dubbelt samtycke** — användaren måste både installera appen *och* koppla sin bil via ett OAuth-flöde per OEM, vilket ger betydligt lägre konvertering än ren telefonsensor som fungerar direkt.

**Jämförelse med telefonsensor-spåret:** Telefonsensorn ger sämre ren friktionsdata men överlägsen ekonomi, täckning (alla bilar oavsett märke/årsmodell) och tillväxt (ingen per-bil-kostnad, ingen OEM-koppling). För en aktör med 0–50 000 kr/år är telefonsensor + crowdsourcing det enda spår som kan bygga en egen, växande datamängd. Dataaktens samtyckesväg bör användas *kompletterande och selektivt* — för Volvo-ägare via Volvos gratisnivå, för att kalibrera/validera telefonsensordatan mot bilens riktiga signaler, och för att i pilotform testa exakt vad OEM:erna lämnar ut under artikel 5. På sikt (om användarbasen växer och Vinnova-finansiering säkras) kan OEM-data läggas till som premiumlager, men den kan inte vara fundamentet.

## Förbehåll

- **Priser för OEM-data i produktion är inte publika** (High Mobility per-fordon-pris, Smartcar Custom, NIRA, Klimator/Saltera) — kostnadsuppskattningarna för 100/1 000 bilar bygger på publicerade golvpriser + rimliga antaganden, inte offerter. Verklig kostnad måste inhämtas via konsol/offert.
- **Om High Mobility exakt exponerar torkarstatus, ABS/ESP-händelser och hastighet** kunde inte verifieras på publika sidor (ligger i Airtable-katalog/konsol). Extern temperatur, dimljus, position och däcktryck är bekräftade.
- **Den juridiska bedömningen att beräknad friktion är "derived data" och undantagen** är en tolkning av kommissionens vägledning (styrkt av Volvos egen beskrivning av ett "beräknat friktionsvärde"), inte ett avgörande — gränsdragningen rå ABS-händelse vs. beräknad friktion är oprövad och kan komma att prövas rättsligt.
- **Ingen känd formell dataakt-tvist om fordonsdata** hittades ännu (tidigt; endast ~1 år sedan tillämpning). PTS saknar ännu fullständiga befogenheter i väntan på svensk kompletteringslag.
- **Fintraffic/Traficoms exakta öppna fordonsdata** kunde inte verifieras inom budget.
- **Träffsäkerhetssiffrorna för telefonsensorer** avser i huvudsak vägojämnhet/potthål, inte halka/friktion specifikt; halka via enbart telefon är mindre validerat.
- **Valutakurs USD/EUR→SEK** är approximativ (~11 kr/USD, ~11,5 kr/EUR) och påverkar kronbeloppen.
- Vissa siffror från bolagens egna sidor (t.ex. High Mobilitys varierande märkes-/OEM-antal: "almost 30 brands" vs "over 22 OEMs" vs "over 500 models") är inkonsekventa och bör dubbelkollas i konsolen.
