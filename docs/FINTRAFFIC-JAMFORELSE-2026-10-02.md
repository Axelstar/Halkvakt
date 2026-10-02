# Fintraffic och Halkvakt — vad de gör, vad vi gör, och vad vi kan ta efter

*Bengts fråga 2/10 2026: "kan du läsa in dej på vad fintraffic gör och jämföra med vad vi gör i halkvakt". Läs-only. Varje uppgift om
Fintraffic är läst på källan i webbläsaren eller i deras öppna API samma dag; källorna står sist. Kort #283.*

## 1. Svaret i korthet

Fintraffic är Finlands statliga trafikledningsbolag. Det driver vägväderstationerna, trafikcentralen och den öppna datan (Digitraffic), och
det ger förarna en karta och en app med pushnotiser. **Fintraffic säger själva att appen ska användas före resan eller som passagerare,
inte under körning.** Halkvakt gör det omvända: en röst under resan, matchad i telefonen, som tiger när inget är fel. De två krockar inte;
de täcker var sin halva av samma resa. Det Fintraffic har och vi saknar är framför allt **ruttkollen före resan**, **prognoser per
vägavsnitt** och **väghållningens egna data** (saltning, plogning, friktion). Det vi har och de saknar är **rösten under körningen** och
**mätta trösklar**.

## 2. Vad Fintraffic gör

| Del | Vad | Till vem |
| :-- | :-- | :-- |
| **Vägväder** | Omkring 450 vägväderstationer och över 1 000 väderkameror (Fintraffic). Digitraffic anger över 350 stationer och 470 kameror; vårt eget finska arkiv har 526 stationer (`ingest/fi.ts`) | Väghållningen först: när halkbekämpningen ska sättas in, hur mycket salt |
| **Trafikcentralen** (*Tieliikennekeskus*) | Varnar för dåligt väglag och styr de variabla hastighetsgränserna; omkring 10 000 trafikmeddelanden om året | Alla trafikanter, via medier, skyltar och appen |
| **Kartan** (*Liikennetilanne*) | Störningar, vägarbeten, **väglag per vägavsnitt med prognos**, väder, luft- och yttemperatur, kameror, **senaste plogning, sandning och saltning** (24 h, ur entreprenörernas fordon), köer, isvägar | Föraren före resan |
| **Appen** (*Fintraffic Mobiili*) | Gratis, ingen registrering, ingen reklam. Kartan, väglag och vägväderstationer, **vägvädervarningar**, **pushnotiser efter din position eller en vald rutt eller ett område**, **ruttsökning med sparade favoritrutter och automatiska notiser om störningar längs dem**, och förarnas egna rapporter (vilt, stillastående bilar, dåligt väglag), som syns på kartan i 30 minuter. Över 100 000 användare (oktober 2025), utsedd till Finlands bästa kundgärning 2024 | Föraren — *"innan du ger dig iväg eller när du åker med — och när du kör, så kör du"* |
| **Väglagsvarningarna** (Meteorologiska institutet, FMI) | Fyra nivåer: normalt, dåligt (gul), mycket dåligt (orange), extremt dåligt (röd). Gäller huvudvägarna, oktober–april, uppdateras fem gånger om dygnet; förvarning 2–3 dygn före mycket dåligt väglag | Alla, via FMI, medier och appen |
| **Öppna data** (Digitraffic, CC BY 4.0) | Stationerna varje minut, kamerorna var tionde minut, trafikmeddelanden, **prognoser per vägavsnitt** var femte minut: 277 avsnitt (förenklade), med läget nu och om 2, 4, 6 och 12 timmar — väglag, yt- och lufttemperatur, vind, vädersymbol, tillförlitlighet och skälet (vägytan, vinterhalka, underkylt regn, sikt, friktion). Prognoserna bygger enligt Fintraffic på Vaisalas vädermodeller | Alla utvecklare — det är den datan Halkvakt redan läser för sitt finska skuggarkiv |
| **Under utveckling** (ITS-världskongressen 2024) | *Virtuella skyltar*: varningar om tillfällig halka (med hänsyn till saltning och plogning), kraftigt snöfall, hård vind, nedsatt sikt, vägarbeten, olyckor och köslut, ut till bilar och appar via den nationella åtkomstpunkten. En betaversion finns för trafikcentralens operatörer. Därtill en **olycksriskmotor** med maskininlärning för rutter och informationstjänster, med Jyväskylä universitet | Biltillverkare, tjänsteleverantörer, trafikcentralen |
| **Bildata** (samma rapport) | Ett prov från en biltillverkare: **2,4 miljoner halkvarningar från personbilar i hela Finland under januari 2024**. De flesta kom när stationens uppmätta friktion var låg; skillnaden förklaras delvis av att stationen bara mäter körfältet, medan bilarna kör i alla. Slutsats: bildatan duger som andra källa bredvid stationerna | Trafikcentralen |

## 3. Jämförelsen

| | Fintraffic | Halkvakt |
| :-- | :-- | :-- |
| **När föraren får veta** | Före resan, eller som pushnotis; appen ska inte användas under körning | Under resan, med röst och släckt skärm |
| **Hur** | Karta och notiser som föraren läser | En mening, en fara i taget; tystnad är grundläget |
| **Var** | Hela vägnätet på kartan; varningarna för huvudvägarna och regioner | Framför bilen längs den väg den kör |
| **Vad** | Väglag, väder, störningar, vägarbeten, väghållning, köer, kameror | Halka, frysrisk, olyckor, vilt, fartkameror (vägarbeten till våren, kort #32) |
| **Prognos** | Ja: per vägavsnitt 12 h framåt, och FMI:s varningar dagar framåt | Nej, inte till föraren. Prognoslagret mäts i skuggan; regel T6: en prognos får stärka, aldrig ensam utlösa |
| **Ruttkoll före resan** | Ja: favoritrutter med automatiska notiser | Nej (kort #233 del 1, ej utrett) |
| **Väghållningen** | Plogning, sandning, saltning senaste dygnet; saltmängd på stationerna | Nej — *"saltet syns inte"* är kuvösens och betans känsligaste svaghet |
| **Förarnas egna rapporter** | Ja, publika i 30 minuter | Bara facit: *Stämde / Stämde inte / Appen missade*, privat, med brytaren på |
| **Positionen** | Används för notiser efter din plats (var den behandlas framgår inte av sidan) | Lämnar aldrig telefonen av sig själv |
| **Hur träffsäkerheten bevisas** | Framgår inte av de sidor som är lästa | Tröskeldokument före mätning, blindade domar, skuggmotor, kuvösen |
| **Bilarnas data** | Prövas som andra källa (2,4 miljoner varningar på en månad) | Ingen öppen källa i Sverige hittad; Trafikverkets upphandling säger att datan inte delas vidare (DECISIONS #282) |

## 4. Vad vi kan ta efter

Bara förslag, inget är beställt. Kort #283 bär valen.

1. **Ruttkollen före resan finns redan hos en statlig aktör, med 100 000 användare.** Det stärker kort #233 del 1. Fintraffic visar också
   formen: sparade rutter och en notis när något händer längs dem. Halkvakt skulle göra det utan att positionen lämnar telefonen.
2. **Fintraffics prognoser per vägavsnitt i vårt finska skuggarkiv.** Datan är öppen och vi läser redan samma API. Då går det att jämföra
   hur ofta den finska prognosen sa *dåligt väglag* när vår regel slog till, och tvärtom — en extern jämförelse för prognoslagret, utan att
   något når en förare. Kostnaden är ett anrop till i det timvisa finska flödet och några tusen rader om dygnet.
3. **Väghållningens data som facit i Finland.** Digitraffic publicerar var och när vägarna plogats, sandats och saltats, och stationerna
   mäter saltmängd (`SUOLAN_MÄÄRÄ`, som vi inte arkiverar — `docs/GOLVET.md` §6). Det är den del av facit som saknas i Sverige: en varning
   före en saltning kan vara rätt fast vägen aldrig blev hal.
4. **Formuleringen *"när du kör, så kör du"*.** Fintraffic avråder själva från att använda appen under körning. Halkvakts poäng — att
   föraren aldrig behöver titta på telefonen — är precis det Fintraffics app inte gör. Det är ett ärligt argument i marknadsplanen (kort #281).

**Inte för oss nu:** förarnas publika rapporter (kräver positioner från förare, och invarianten förbjuder det automatiskt);
olycksriskmotorn (en modell som utlöser bryter regel T6); de virtuella skyltarna (de går till bilar och appar via åtkomstpunkten — öppna
de sig blir de en källa, inte en konkurrent).

## 5. Källor (lästa 2/10 2026)

- Fintraffic, *Road weather*: https://www.fintraffic.fi/en/road_traffic/road-traffic-services/road-weather
- Fintraffic, *Liikennetilanne-palvelu*: https://www.fintraffic.fi/fi/digitaalisetpalvelut/digitaaliset-palvelut-kuluttajille/liikennetilanne-palvelu
- Fintraffic, *Fintraffic Mobiili*: https://www.fintraffic.fi/fi/digitaalisetpalvelut/mobiili
- Digitraffic, *Road traffic* (API-förteckningen): https://www.digitraffic.fi/en/road-traffic/
- Digitraffic, öppet API: `/api/weather/v1/forecast-sections-simple/forecasts` (277 avsnitt, läst 2/10 15:48 UTC)
- Ilmatieteen laitos, *Liikennesää*: https://www.ilmatieteenlaitos.fi/liikennesaa
- Kariniemi m.fl., *Exchange of operationally valuable and safety-critical data within ecosystems*, ITS World Congress 2024 (Fintraffic):
  https://www.fintraffic.fi/sites/default/files/2024-09/Exchange%20of%20operationally%20valuable%20and%20safety-critical%20data%20within%20ecosystems.pdf
