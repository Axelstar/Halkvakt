# SYSTEM.md — vad Halkvakt gör, säger och INTE gör

Bengts krav (2026-08-28), Claudes form. Disciplin (DECISIONS #24): en commit som ändrar en regel, en källa eller en
rösttext ändrar OCKSÅ denna fil. Bengt läser den mot koden en gång i månaden. **Denna version: läst mot koden
2026-09-22** (första månadsläsningen; underlag till Skyltfondsansökans bilaga 3). Föregående version var från 31/8.

## 1 · Källor in
- **Trafikverket** (nyckel): vägväderstationer VViS (cirka 845, varav omkring 750 med vägytans temperatur), rapporterat
  väglag per sträcka (818 bedömningssegment), trafikhändelser (enbart olyckor, DECISIONS #5), väglagskameror (bilder
  arkiveras BARA som facit när motorn varnar, aldrig till användare) och fartkameror (metadata, aldrig bilder).
- **Polisen:** viltolyckor med position, 48-timmarsfönster. **SMHI:** vädervarningar; luftstationer och nederbördsradar
  används i mätningarna och radarn i snapshoten (nedan), ingen av dem talar i rösten.
- **Grannländerna, i skuggarkivet:** Finland (Fintraffic Digitraffic, daggpunkt sedan 4/9), Norge (Vegvesen DATEX,
  eget konto), Danmark (DMI öppet + Vejdirektoratets trafikflöde; NAP-nyckel före produktion). Finska och norska
  stationer inom 40 km av svenska vägar publiceras som gränspunkter (#49). Skuggflottan kör svenska, danska och finska
  rutter; de norska är definierade men har aldrig körts (kort #238).
- **Kadens:** `ingest-live` (Supabase, fail-closed nyckel) varje minut; `publicera` var tionde minut → `data/app/v1/
  {manifest,static,live}.json` på CDN med sha256 i manifestet; timvisa och dagliga flöden trycks igång av pulsklockan
  (Supabase pg_cron), eftersom GitHubs egen schemaläggare svälter jobb. Appen verifierar checksumman, behåller förra
  snapshoten vid fel och visar DATANS klocka (`generated_at`), inte nedladdningens.
- **Arkiv (Supabase, gratisnivå, 169 MB av 500 den 18/9):** väderobservationer (gallras till en rad per halvtimme efter
  sju dygn), väglagshistorik, händelsearkiv, SMHI-historik, radar (gallras aldrig), trendkandidater, skugglogg,
  förarfacit, stationsdygn i givarfel. Storleken mäts; Supabase Pro är ett öppet beslut (§4.2 i bedömningen).
- **Givarvakterna, före allt annat** (kort #75, #234, #236): en väderrad tystas om ytan ligger mer än 12 ° under luften;
  om luften är ≥ +10 °C och ytan ≥ 8 ° under den (radvakten); om stationen brutit mot 12-gränsen minst tre gånger på
  sju dygn (karantänen); eller om ytan legat ≥ 6 ° under luften i minst 90 % av det senaste dygnets rader (den
  långsamma vakten, `sql/030`, självläkande). Sju felmätande stationer är anmälda till Trafikverket 21–22/9. En
  station i vakt tystas både som väderpunkt och som källa för broarna, och varje publicering noterar vilka.

## 2 · Regler (ur EngineConfig/engine — sanningen är koden)
- Korridor ±35° framför färdriktningen. Minfart 15 km/h. Förvarningsavstånd fart × 30 s, klämt till 400–3000 m
  (skjutreglaget i appen ändrar taket, aldrig kontraktet).
- **Prioritet:** olycka > halksträcka > frysrisk > vilt > kamera. EN vinnare per steg; förlorare droppas, köas aldrig.
  Inom 10 s efter en varning får bara en VIKTIGARE fara tala (prioritetsmedveten spärr, 10 s sedan 13/9, var 45).
  Samma fara upprepas först efter ≥ 10 min OCH ≥ 5 km. Takten mäts i skuggrapporten, aldrig antas.
- **Frysrisk** utlöses av yta ≤ 1 °C OCH fukt vid stationen; **broar** inom 15 km av en kall blöt station (yta ≤ 3 °C)
  får egen frysrisk med gränsen 3 °C. **Halksträcka** av väglagskod ≥ 2 eller halkord i Trafikverkets fritext
  (ordbörjan: is, halka, halkrisk, halkig, halt, mycket besvärligt; snö och frost räknas även inuti ord, #97).
- **Olycka:** max 10 km fram; "mycket stor påverkan" varnas i två steg, det andra 2 km före. **Kamera:** 500 m, bara
  kameror som bevakar egen färdriktning (riktningsgrind 60°, mätt mot 388 kamerapar). **Vilt:** aktiv 48 h.
- **Åldersvakten** (före motorn): är live.json äldre än 45 min filtreras frysrisk och halksträckor bort; äldre än
  2 h även olyckor. Kameror och vilt består.
- **Regn i snapshoten:** radarns intensitet publiceras per segment (`rain_segments`, faktor 0,65 till stationens
  skala, öppnas vid ≥ 2,0 mm/h, tyst om radarn är äldre än 70 min). Rösten säger inget om vattenplaning än (#42/#81).

## 3 · Vad appen säger
- Motorns svenska varningstexter (avstånd + fara + uppmaning), byggda i motorn och identiska på alla plattformar —
  vektorerna i `engine/vectors/` ska klaras byte för byte av server, Android och iOS.
- Vid passerad ålderströskel, EN gång per körning: *"Ingen färsk väglagsdata – kör som om det kan vara halt."*
- Statusrader går till loggen, inte rösten. UI visar datans tid ("N faror · väglag 06:10").
- **Facit (S4, sedan 16/9):** efter en varning kan en testförare som själv slagit på funktionen trycka *Stämde* eller
  *Stämde inte*. Det som skickas är varningens id, tidpunkten och svaret — ingen identitet, inget spår. Av som standard.
- Designprincip: hellre tyst än tjatig — men tystnaden ska vara säker, inte bara tyst. Cry wolf = falska larm, inte
  upprepade sanna.
- **Byggen:** iOS 0.3.9 i TestFlight (facitknapparna sedan 0.3.8). Android 0.3.1, sju versioner efter (#219); publik
  lansering i Google Play väntar på Play-kontobeslutet (§4.2).

## 4 · Vad systemet INTE gör (viktigast — läs före varje löfte utåt)
- **Ingen prognos når användaren.** Prognoslagret för halka mellan stationerna (offsetmodell, grind A klarad 21/9
  och 22/9) och skuggreglerna (efterhalka, trend, rimfrost, övergångar, vind/sikt) körs i SKUGGDRIFT: de loggar vad de
  skulle ha sagt. Trösklarna fastställdes och daterades 1/9, före all skuggkod; utfall läses först vid dom 1 januari,
  kalibrering 1 februari, dom 2 mars (regel D1–D7). Regel T: en prognos talar aldrig ensam.
- **Tyst mellan mätpunkterna.** Medianavståndet från huvudvägnätet till närmaste station är 7 km; 13 % av Norrlands
  vägnät ligger mer än 20 km bort. Där ser motorn ingenting, och löftet följer källans täckning.
- **Tyst i stan.** I Malmö kommun finns tre stationer, alla på statens vägar. Kommunens egna stationer är inte öppna data
  (svar 18/9); avtal inom projektet är den öppna dörren.
- **Viltpunkternas precision är Polisens** — trakten, inte metern.
- **Ingen ködetektion** (#15), ingen vattenplaning i rösten, ingen solbländning, inget snödrev, ingen dimma, ingen
  vind- eller siktvarning (steg 0 mäts).
- **Läser inte** fordonsfriktionsdata (Nira/Volkswagen, stängd även för kommuner som köper den), plogdata eller
  Öresundsbrons status.
- **Ingen positionsdata lämnar telefonen utan aktivt val** (DECISIONS #264). Matchningen sker i telefonen mot den
  nedladdade snapshoten. Det ENDA som någonsin skickas är ett facitsvar föraren själv trycker — varningens id och
  tidpunkt, alltså ungefär var och när — och bara för testförare som slagit på funktionen. Ingen telemetri, inga
  konton. Ändras det som appen skickar ändras denna rad, Play-deklarationen, integritetssidan och produktboken i
  samma commit.
- **Kamerabilder:** sparas bara som facit när motorn varnar (dedupe station × 3 h), visas aldrig för användare.
- **Trösklarna är okalibrerade mot en verklig vinter.** ≤ 1 °C + fukt och kod ≥ 2 är startvärden; kalibreringen är
  första säsongens huvuduppgift, och skuggreglernas startvärden (betan, D2) rörs inte förrän utfallen lästs.
- **Mäter inte effekten på förare.** Inget säger i dag om förare sänker farten. Det är Skyltfondsansökans fråga.

## 5 · Mätning
- **Skuggmotorn** (Supabase, varje varv): riktiga motorn mot färska snapshoten på 60 körda fasta rutter i Sverige,
  Danmark och Finland (80 definierade, de 20 norska har aldrig körts — kort #238; E4 i etapper Helsingborg→Luleå, E22,
  E18, E14, E10, E20/E45/E47 i Danmark), 20 bilar i rotation per varv → `shadow_log` med indata, spärrade larm, efterhalkans indata och facit. Skuggrapporten visar
  takt, spärrar och kamerafacit.
- **Facit:** väglagskamerabild vid varning, SMHI-varningar, rapporterade halkhändelser, stationernas egna serier och
  förarnas facitsvar. Kamerabilderna öppnas och läses i mars (#157); bildfacit per vädertyp (#231) efter första
  frosten. **Missandelen** (knappen `missar`) rekonstruerar arkivets halkhändelser och kör motorn på dem.
  **Tystnadsfelet** mäter tystnadens fel, inte larmens träff (#98).
- **Grindarna** (knappar i Actions, en per fråga, marginalvakt och vaktdiagnos i varje): A (prognosmodellen mellan
  stationer — klarad, A2 3,5 % mot gränsen 5 %), K-A (frysklassning), R-A (rimfrost, även finska arkivet), T-A (trend),
  V-B (vattenplaning, radarn), plus steg 0-mätningar för övergångar, SMHI-förstärkaren, vind/sikt och tillstånd.
  Trendarkivet räknar kandidater i databasen (`sql/018`) och en driftvakt bevisar att SQL och TypeScript väljer samma
  rader. Uppspelningen (`sql/028`) spelar efterhalkans varianter mot arkivet, blindat.
- **Blindning:** startvärden låsta, ingen svepning före domarna, utfall läses vid dom 1 (jan), kalibrering (feb),
  dom 2 (mars). Kuvösen (#232) — hela systemet mot vintern 2024/25 — väntar på Trafikverkets svar om historiska data.
- **Vakterna kring mätningen:** kontraktsgrinden (44 kontrakt: ett tal som finns i mer än en fil får inte glida),
  värdevakten (ett fält utan deklarerat spann får inte bära en tröskel), kodgrinden, beslutsnumren, vaktdiagnosen
  (en nolla ska aldrig vara tvetydig), CI-replay av vektorerna vid varje push.
- **Driftvakter:** healthcheck varannan timme (rött jobb ⇒ mejl); vakthunden (frostvakt, kassavakt mot Actions-taket,
  databasvakt, förarfacit, mätvakten mot pulsklockan); gallring 03:15; bevakning av Trafikverkets nyheter; pulsklockan
  som klocka för allt som annars svälter.

## 6 · Vägar framåt (en rad per spår)
- **Skyltfonden** — ansökan senast 1/10 (v7A med partner, v7B utan); beslut 15/12; projektstart januari 2027.
- **Kuvösen** (#232) — bakåtprövning på vintern 2024/25 när Trafikverket levererat historiska VViS-data (begärt 21/9).
- **Bildfacit per vädertyp** (#231) och kamerabilderna i mars (#157) — produktionsregelns falsklarm mätt.
- **Nira** (#229) — partner, inte konkurrent: bilen mäter, vi varnar före bilen. Fordonsdata om Trafikverket öppnar dem.
- **Före resan** (#233) — ruttkoll för en sparad sträcka, matchad i telefonen; beslutsunderlag efter 28/9.
- **#15 Kö-slut** och **#16 blixthalkeprognos** — uppdatering 1 och 2, efter release. **Sensortrappan** och
  telefonkedjan (#237) — samtalet våren 2027, inte före.
- **Danmark** NAP-nyckel före produktion; **Norge** live i arkivet; **Finland** rimfrostgrinden i väntan på svenska nätter.

## Datakällor per land (läst 22/9 2026, DECISIONS #42–#45, #49)

Principen: officiella öppna källor först. Odokumenterade flöden bara för skuggarkivet, aldrig för något en användare
hör. Alla länder mappas till samma fem faror i motorn.

| Land | Källa | Status | Vägyta | Väglag (operatör) | Olyckor/händelser | Kameror | Saknas |
|---|---|---|---|---|---|---|---|
| 🇸🇪 Sverige | Trafikverket (nyckel), Polisen, SMHI | **Produktion** | 845 stationer (750 med yta) | Ja, per sträcka | Ja, m. allvarlighet | Fart + väglag | Stadens gator |
| 🇫🇮 Finland | Fintraffic/Digitraffic (CC BY 4.0) | Skugga, live i arkivet; gränspunkter i snapshoten | 526 stationer + daggpunkt | Via stationskod | Ja, m. geometri | Väderkameror | Fartkameror, sträckvis väglag |
| 🇳🇴 Norge | Vegvesen DATEX (konto) | Skugga, live i arkivet; gränspunkter i snapshoten | Ja, var 10:e min | Ja | Ja | Ja | — |
| 🇩🇰 Danmark | DMI (öppet) + Vejdirektoratets flöde → NAP | Skugga, live; skuggrutter | Grästemp som proxy | "Glat føre" i händelseflödet | Ja | — | Vägyta, NAP-registrering |

Öppna beslut: Danmark — räcker grästemperatur, eller avtal om vägyta? Play-kontot, Supabase Pro, sökande till
Skyltfonden — se bedömningen §4.2.
