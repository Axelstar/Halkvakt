# Före resan — pendlingsvägen som Halkvakt kollar åt dig

*Bengts fråga 2/10 2026: "utveckla det där om planering före resan och favoritsträckor (till och från arbetet; pendling etc". Ett
beslutsunderlag för kort #233 del 1, ingen kod. Formen är Axels. Bygger på Fintraffic-jämförelsen (`docs/FINTRAFFIC-JAMFORELSE-2026-10-02.md`,
kort #283).*

## Varför

Det viktigaste beslutet om halka fattas innan bilen startar: att åka tio minuter tidigare, ta en annan väg eller låta bli. Finsk
forskning om 1 437 förare fann att de som var välinformerade främst ändrade sina resplaner, inte sin körning (Kilpeläinen och Summala
2007, i Skyltfondsansökans bilaga 4). Halkvakt talar i dag bara under körningen och kan alltså inte påverka det beslutet.

Pendlaren är det enklaste fallet: samma väg till och från jobbet, ungefär samma tider, fem dagar i veckan. Vägen är känd i
förväg, och det är just den vägen föraren behöver veta något om på morgonen.

Andra har redan byggt det här. Fintraffics app låter föraren spara en rutt och få en notis när något händer längs den, och har över
100 000 användare. Trafikverkets app Trafiken.nu gör samma sak för Stockholm och Göteborg, med meddelanden om störningar på
favoritsträckorna under de tider man väljer. Ingen av dem har en röst under körningen, och ingen av dem lovar att positionen stannar
i telefonen.

## Hur det skulle fungera

**Spara vägen efter en resa.** När föraren har kört till jobbet frågar efter-resan-kortet om resan ska sparas som en väg, till exempel
*Till jobbet*. Telefonen sparar då den körda vägen, och bara den, lokalt. Föraren behöver inte skriva in någon adress, och ingen
tjänst för ruttsökning på nätet får veta var föraren bor eller arbetar. Det är skälet till att vägen ska sparas ur en körd resa och inte sökas fram: en
ruttsökning skickar start och mål till någon annan.

**Välj tiderna.** *Vardagar 07:15* och *hem 16:30*. Halvtimmen före varje tid kollar telefonen vägen.

**Kollen är en provkörning i förväg.** Telefonen hämtar samma lägesbild som under en riktig resa, samma fil för alla användare, och
låter motorn köra den sparade vägen i förväg. Motorn gör det redan i skuggan: skuggmotorn kör tjugo rutter varje halvtimme på samma sätt
(`traceAlong` och `run` i motorn). Det som motorn skulle ha sagt under resan blir kollens svar.

**Notisen kommer bara när något är fel.** Är vägen fri kommer ingenting, eftersom tystnad är en funktion också här. Är något fel kommer
en notis, till exempel:

> *Till jobbet, just nu: halt väglag rapporterat på E18 vid Västerås, och frysrisk vid två mätstationer längs vägen.*

**Siri och CarPlay.** *"Hej Siri, hur är vägen till jobbet?"* ger samma svar i en mening, i bilen innan föraren kör.

**Under körningen** är allt som i dag: rösten tar över.

## Vad kollen får säga

Samma regler som rösten. Det som är uppmätt eller rapporterat får sägas: halt väglag på sträckan, frysrisk vid en station, olyckor,
vilt, och vägarbeten när de kommer till våren. **Prognoser får inte utlösa en notis.** Regel T6 säger att en prognos får stärka och
visas, aldrig ensam utlösa, och en notis är en utlösning. Prognoslagret får visas i vyn som föraren själv öppnar, och först efter domen
i mars om det klarar sina grindar.

Kollen säger *just nu*, inte *när du kör*. Lägesbilden gäller nu, och vägen kan ändras på en halvtimme. Texten får aldrig låta som en
prognos.

## Köer, vägarbeten och annat som hör till planeringen

*Bengts fråga samma kväll: "borde det inte finnas information om köbildning, vägarbeten etc". Läst i Trafikverkets datamodell för det
öppna API:t samma kväll.*

Ja. Före resan är det inte bara halkan som avgör, och det mesta finns i Trafikverkets öppna data (talen i *Talen* nedan), med samma nyckel som Halkvakt redan har
och under samma öppna licens.

**Vägarbeten, avstängningar och begränsningar** finns i *Situation*, samma datamängd som olyckorna och viltet redan kommer ifrån. Varje
händelse har typ (till exempel *Vägarbete*), påverkansgrad, antal avstängda körfält, typen av begränsning (till exempel *körfält
blockerat*), tillfälliga gränser som *bruttovikt 8 ton*, och när den börjar och slutar. Halkvakt hämtar redan situationerna och arkiverar
olyckor, hinder och väglagsmeddelanden, men inte vägarbetena, och rösten talar bara om olyckor och vilt. Mätningen 26/9 (DECISIONS #420) visade varför: 5 280 vägarbeten var aktiva, nio av tio längre än en
månad, och rösten hade talat 151 gånger på ett skuggvarv. **I en vy före resan är det annorlunda.** Där är det nyttigt att se att ett
körfält på vägen till jobbet är avstängt till slutet av november, och föraren läser det i lugn och ro. Notisen ska däremot bara gälla det
som är nytt eller kortvarigt, annars kommer den varje dag.

**Köer och restider** finns i två datamängder. *TravelTimeRoute* ger för bestämda sträckor den aktuella restiden, den normala restiden och
en status i fyra steg från fri framkomlighet till framkomligheten omöjlig. *TrafficFlow* ger hastighet och flöde per körfält från
detektorerna i vägen, omkring en minut gammalt (mätt 26/8, kort #15). Trafikcentralernas egna meddelanden om köer och onormal trafik finns
dessutom som situationstypen *AbnormalTraffic* i hela landet, när de skrivs, och dem arkiverar vi redan. **Detektordatan finns bara i större
städer och högbelastade trafiksystem**,
enligt Trafikverkets egen beskrivning, alltså i praktiken Stockholm och Göteborg. Där finns redan Trafikverkets app Trafiken.nu med
favoritsträckor och notiser om störningar. Halkvakt skulle därför inte tillföra köerna i sig, utan att köer, vägarbeten och halka står i
samma kolla, med positionen kvar i telefonen. Utanför storstäderna finns ingen öppen källa för köer.

**Färjor** finns i *FerryAnnouncement*, med avgångar och störningar. Det är värdefullt för den som pendlar över ett sund.

**Väglaget och väderstationerna** är de Halkvakt redan läser, och **SMHI:s varningar** finns redan i arkivet.

**Kamerorna** längs vägen är öppna, men de ska inte hämtas automatiskt för den sparade vägen (se *Integriteten* nedan).

**Det som inte går att få öppet:** realtidstrafik från Google, Waze, TomTom eller HERE kostar pengar eller kräver avtal, och
gratisnivån är ett krav i projektet. Bilarnas egna halkvarningar, som Trafikverket köper och delar i *Data for Road Safety*, finns inte i
något öppet dataset (DECISIONS #282). Polisens händelser är sämre än Trafikverkets för vägarna (DECISIONS #316, #318).

**Hur det passar in utan att integriteten rubbas.** Allt ovan hämtas som en gemensam fil för hela landet, som lägesbilden i dag, och
jämförs med den sparade vägen i telefonen. Ingen fråga skickas om just förarens väg. Vägarbetena är många och skulle göra den fil som
hämtas under körningen mycket större, så de hör hemma i en egen gemensam fil som bara hämtas för kollen före resan. Hur stor den blir
ska mätas innan något byggs.

## Integriteten

Den sparade vägen ligger i telefonen och ingen annanstans. Kollen hämtar samma offentliga fil som appen redan hämtar, utan konto och
utan någon uppgift om vem som frågar. Notisen skapas i telefonen; ingen server skickar den, och ingen server vet vilka vägar som finns.
Invarianten i CLAUDE.md står kvar: ingen position lämnar telefonen av sig själv.

Två saker måste ändå sägas öppet. Appen sparar för första gången en väg som föraren har kört, även om det är på förarens begäran, så
produktboken, introduktionen och integritetssidan ska säga det. Och kollen får inte hämta något som är särskilt för vägen, till exempel
bilder från kamerorna längs den: en sådan hämtning berättar för Trafikverkets server vilka kameror föraren intresserar sig för, och
därmed ungefär vilken väg föraren kör. Bara den gemensamma filen hämtas automatiskt.

## Det som måste mätas först

Den viktigaste frågan är hur ofta notisen skulle komma. Kommer den varje vintermorgon i Norrland slutar föraren läsa den, och då är den
värdelös. Det går att mäta innan något byggs:

- **På kuvösens vinter 2024/25:** låt de tjugo skuggrutterna stå för pendlingsvägar och räkna hur många vardagsmorgnar kl. 06:45 och
  eftermiddagar kl. 16:00 motorn skulle ha sagt något längs dem. Kuvösen har stationerna, så frysrisken går att räkna; väglaget och
  olyckorna saknas där.
- **På årets skugglogg:** samma räkning med väglag och olyckor, när vintern har kommit.

Gränsen för hur ofta en notis får komma ska skrivas innan talen läses, av Bengt och Axel. Blir det för ofta finns tre vägar: bara halt
väglag och olyckor i notisen, frysrisken bara i vyn; bara det som är nytt sedan förra kollen; eller en notis bara när läget är sämre än
vad som är vanligt för vägen den månaden.

## Tekniken i korthet

- **Motorn finns redan** i Swift och Kotlin och klarar de gemensamma testfallen. En provkörning längs en sparad väg är att köra den
  befintliga `run` över vägens punkter. Nya testfall läggs till i alla tre språken.
- **På iPhone** väcker systemet inte appen på minuten. Den säkra vägen är en automation i Genvägar på en viss tid, som kör en
  åtgärd *Kolla min väg*. Appen har redan åtgärder för Siri (starta, stoppa, stämde inte, appen missade), och guiden till Genvägar finns. Om tidsautomationen kan köras utan att föraren bekräftar varje gång ska provas på Axels telefon innan formen bestäms.
- **På Android** kan telefonen schemalägga kollen själv.
- **Batteriet** påverkas inte märkbart: en hämtning och en provkörning, två gånger om dagen.

## Vad det kan ge projektet

För föraren blir Halkvakt något mer än en röst i bilen: den första appen som både säger till före resan och under den, utan att
positionen lämnar telefonen. För marknadsföringen är pendlaren den tydligaste målgruppen, och det finns redan en färdig fras att jämföra
med: Fintraffic säger *"när du kör, så kör du"*. För Skyltfondsansökan nämndes ruttkollen som argument mot yrkesflottor, till exempel
taxi, bud och hemtjänst, som också kör kända vägar. Där ska den fortfarande skrivas med förbehåll tills den är byggd.

## Talen (mätt 2/10, DECISIONS #442)

*Bengts ord: "räkna på allt men bara som information inte något bygge alls". Inget är byggt. Ingen gräns för notisen är satt.*

**Hur ofta skulle notisen ha kommit på vintern 2024/25?** Om pendlingsvägen passerar två eller tre stationer hade motorn sagt något vid
ungefär **14 procent av kollerna, eller en och en halv gång i veckan** för den som kollar morgon och eftermiddag. I norr, över 62 grader,
nästan **tre gånger i veckan**, och söder om 58 grader knappt en gång i veckan. Januari var värst: då hade nästan var fjärde station
frysrisk vid kollen. Att bara skicka det som är nytt sedan förra kollen sänker det till ungefär en gång i veckan. Det här är frysrisken
ensam. Väglaget, olyckorna och vägarbetena kommer ovanpå, för de finns inte i kuvösen.

Den första räkningen, längs skuggrutternas linjer, gav nästan inga notiser alls. Det berodde på linjerna, inte på vintern: de är så grova
att de flesta stationer ligger för långt ifrån dem för att motorn ska se dem. Talen ovan räknar i stället på stationerna själva.

**Vägarbetena** är färre än vi trodde: **1 876 aktiva**, och 3 262 till som vilar just nu. Mätningen 26/9 räknade båda och kom till 5 280.
Nio av tio aktiva pågår längre än en månad, och **50 är nya eller kortare än en vecka** — det är dem en notis skulle gälla.

**Köerna** finns nästan bara i Stockholm: **191 av 198 restidssträckor** (213 km sammanlagt) och **2 400 av 3 125 detektorer**. Göteborg
har 5 sträckor och 715 detektorer, Skåne 2 och 10. Utanför storstäderna finns inga mätta köer.

**En gemensam fil** med vägarbetena och restiderna blir omkring **120 kB packad**, ungefär lika stor som hela lägesbilden i dag (83 kB).
Det går för en koll två gånger om dagen, men inte för hämtningen var 30:e minut under körningen.

## Förslaget

1. **Mätningen först:** hur ofta skulle en notis komma på kuvösens vinter, med gränsen skriven före. Ett beslut i DECISIONS och en körning
   i knappen `kuvos`. Samtidigt: hur stor en gemensam fil med vägarbeten och restider blir.
2. **Därefter, om talet håller:** *Spara som väg* i efter-resan-kortet, tiderna, provkörningen i telefonen, notisen och Siri-frågan, bara
   med det som är uppmätt och rapporterat — halkan, olyckorna, vägarbetena och, i storstäderna, köerna och restiden. Formen bestämmer Axel.
3. **Prognoserna i vyn** först efter domen i mars, och bara om prognoslagret klarar sina grindar.

**Öppna frågor till Bengt och Axel:** ska mätningen göras; hur många vägar får man spara; ska kollen ha en egen flik eller ligga på
*Redo.*-skärmen; och vilken gräns för notisens frekvens ska gälla.
