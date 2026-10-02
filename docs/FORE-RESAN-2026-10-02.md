# Före resan — favoritrutter med allt Halkvakt vet om vägen

*Bengts frågor 2/10 2026: "utveckla det där om planering före resan och favoritsträckor (till och från arbetet; pendling etc", "borde det
inte finnas information om köbildning, vägarbeten etc", och förtydligandet samma kväll: "jag tänkte att pendlingsstråken skulle vara något
som ingick som en del i favoritrutter som kunde sparas och att man i förväg fick information om pågående vägarbeten och allt annat som
appen kan ge information om." Ett beslutsunderlag för kort #233 del 1, ingen kod. Formen är Axels. Bygger på Fintraffic-jämförelsen
(`docs/FINTRAFFIC-JAMFORELSE-2026-10-02.md`, kort #283).*

*Omskrivet samma kväll efter Bengts förtydligande. Första utgåvan gjorde pendlingen till hela idén och en notis om frysrisk till
huvudsaken. Bengts tanke är bredare: favoritrutter, där pendlingen är ett av flera fall, och en rapport om allt längs rutten.*

## Idén

Föraren sparar sina vanliga rutter: till jobbet och hem, till stugan, till föräldrarna, till träningen. Innan en resa öppnar föraren
rutten och ser allt Halkvakt vet om den just nu — halkan, olyckorna, vägarbetena, köerna där de finns, färjorna och fartkamerorna. Under
resan är det som i dag: rösten säger bara det som inte kan vänta.

Det viktigaste beslutet fattas innan bilen startar: att åka tidigare, ta en annan väg eller låta bli. Finsk forskning om 1 437 förare
fann att de välinformerade främst ändrade sina resplaner, inte sin körning (Kilpeläinen och Summala 2007, i Skyltfondsansökans bilaga 4).
Fintraffic i Finland och Trafikverkets Trafiken.nu i Stockholm och Göteborg har redan favoritrutter med notiser. Ingen av dem har en röst
under körningen, och ingen av dem lovar att positionen stannar i telefonen.

## Hur det skulle fungera

**Spara en rutt ur en körd resa.** Efter en resa frågar efter-resan-kortet om resan ska sparas som en rutt, och föraren ger den ett namn.
Telefonen sparar den körda vägen lokalt. Föraren skriver aldrig in en adress, och ingen tjänst för ruttsökning på nätet får veta var
föraren bor, arbetar eller har sin stuga. Rutter som föraren inte vill ha kvar tas bort med ett tryck.

**Ruttrapporten.** När föraren öppnar en rutt visar appen allt som gäller längs den just nu, i en lista som går att läsa på några sekunder.
Ett påhittat exempel:

> **Till stugan** · just nu, 15:40
> - Vägarbete på E4 vid Gävle: ett körfält avstängt, stor påverkan, till 30 november
> - Halt väglag rapporterat på väg 83 mellan Bollnäs och Ljusdal
> - Frysrisk vid två mätstationer längs vägen
> - Hastigheten nedsatt till 60 km/h vid Hudiksvall
> - Fyra fartkameror
> - Inga olyckor och inget vilt rapporterat

Är allt lugnt står det det: *Inget rapporterat längs rutten just nu.*

**Pendlingen är ett fall av favoritrutterna.** En rutt kan få tider, till exempel *vardagar 07:15* och *hem 16:30*. Då gör appen rapporten
en halvtimme före och skickar en notis om något har tillkommit som föraren bör veta. Tiderna och notisen är frivilliga; rapporten finns
alltid när föraren öppnar rutten.

**Siri och CarPlay.** *"Hej Siri, hur är vägen till stugan?"* ger det viktigaste i en mening, i bilen innan föraren kör.

**Under resan** säger rösten som i dag bara det som inte kan vänta: halka, frysrisk, olyckor, vilt och fartkameror. Vägarbetena och köerna
stannar i rapporten.

## Vad rapporten kan innehålla, och var det kommer ifrån

Allt finns i Trafikverkets öppna data, med samma nyckel som Halkvakt redan har och under samma öppna licens. Läst i Trafikverkets
datamodell och räknat i deras API 2/10 (DECISIONS #442).

| I rapporten | Källa | Täckning | Hos Halkvakt i dag |
| :-- | :-- | :-- | :-- |
| Halt väglag på sträckor | *RoadCondition* | Hela landet, november–april | I rösten |
| Frysrisk vid mätstationer, broar | Väderstationerna | Hela landet, omkring 750 stationer enligt Trafikverket | I rösten |
| Olyckor, hinder, djur på vägen | *Situation* | Hela landet | I rösten (olyckor och vilt) |
| **Vägarbeten**: körfält, påverkan, start och slut | *Situation* | Hela landet: 1 876 aktiva 2/10, och 3 262 som vilar | Hämtas, sägs inte |
| **Hastighetsnedsättningar och omledningar** | *Situation* | Hela landet: 801 och 39 aktiva 2/10 | Hämtas, sägs inte |
| **Köer och restider** | *TravelTimeRoute*, *TrafficFlow* | Nästan bara Stockholm: 191 av 198 restidssträckor, 2 400 av 3 125 detektorer | Används inte |
| Kömeddelanden från trafikcentralerna | *Situation* (*AbnormalTraffic*) | Hela landet, när de skrivs | Arkiveras |
| **Färjor**: avgångar och störningar | *FerryAnnouncement* | Vägfärjorna, 36 leder | Används inte |
| Fartkameror | *TrafficSafetyCamera* | Hela landet | I rösten |
| SMHI:s varningar | SMHI | Hela landet | I arkivet |
| *Halkvakt tror*, prognosen längs vägen | Prognoslagret | — | Först efter domen i mars, och bara om det klarar sina grindar |

**Det som inte går att få öppet:** realtidstrafik från Google, Waze, TomTom eller HERE kostar pengar eller kräver avtal, och gratisnivån
är ett krav i projektet. Bilarnas egna halkvarningar finns inte i något öppet dataset (DECISIONS #282). Utanför Stockholm och Göteborg
finns inga mätta köer.

## Vad som får stå var

Rapporten är något föraren själv öppnar och läser i lugn och ro. Där får allt stå som är uppmätt eller rapporterat, också vägarbeten som
pågår i månader. Det är den stora skillnaden mot rösten, som måste vara tyst om det som inte är bråttom.

Notisen är något annat, eftersom den kommer utan att föraren bett om den. Den ska bara gälla det som är nytt eller som ändrar resan: ny
halka, en olycka, ett nytt vägarbete som stänger ett körfält, en inställd färja. Ett vägarbete som har pågått i två månader är inte en notis.

Två regler gäller överallt. **Ingen prognos får utlösa en notis**, eftersom regel T6 säger att en prognos får visas och stärka men aldrig
ensam utlösa. Och **rapporten säger *just nu***, inte *när du kör* — läget kan ändras på en halvtimme.

## Integriteten

Rutterna ligger i telefonen och ingen annanstans. Rapporten bygger på gemensamma filer för hela landet, som lägesbilden i dag, och
jämförs med rutten i telefonen. Ingen fråga skickas om just förarens rutt, notisen skapas i telefonen, och ingen server vet vilka rutter
som finns. Invarianten i CLAUDE.md står kvar: ingen position lämnar telefonen av sig själv.

Två saker måste sägas öppet. Appen sparar för första gången vägar som föraren har kört, på förarens begäran, så produktboken,
introduktionen och integritetssidan ska säga det. Och rapporten får inte hämta något som är särskilt för rutten, till exempel bilder från
kamerorna längs den, eftersom det berättar för Trafikverkets server ungefär vilken väg föraren tänker köra.

## Talen (räknade 2/10, DECISIONS #442)

*Bengts ord: "räkna på allt men bara som information inte något bygge alls". Inget är byggt.*

**Filerna.** Vägarbetena och restiderna i en gemensam fil blir omkring **120 kB packad**, ungefär lika stor som hela lägesbilden i dag
(83 kB). Det går bra för en rapport som föraren öppnar och för en koll två gånger om dagen, men inte för hämtningen var 30:e minut under
körningen. Rapporten ska därför ha en egen fil.

**Hur ofta en notis om frysrisk hade kommit** på vintern 2024/25, om rutten passerar två eller tre stationer: vid ungefär 14 procent av
kollerna, en och en halv gång i veckan för den som kollar morgon och eftermiddag, och nästan tre gånger i veckan norr om 62 grader. Det
är frysrisken ensam, eftersom kuvösen bara har stationerna. Talet visar att notisen måste vara sparsam, och att den bör gälla det som är
nytt. För rapporten spelar talet ingen roll: den läses när föraren vill.

**Vägarbetena** är färre än mätningen 26/9 sa: 1 876 aktiva, inte 5 280, som räknade också de vilande. Av de aktiva är 50 nya eller
kortare än en vecka.

## Tekniken i korthet

- **Motorn finns redan** i Swift och Kotlin och kan köra en väg i förväg (`run`), som skuggmotorn gör varje halvtimme. Rapportens halka
  och frysrisk är det motorn skulle ha sagt längs rutten; vägarbetena, köerna och färjorna läggs till ur den egna filen.
- **På iPhone** väcker systemet inte appen på minuten. För de tidsatta notiserna är den säkra vägen en automation i Genvägar som kör en
  åtgärd *Kolla mina rutter*. Om den kan köras utan att föraren bekräftar varje gång ska provas på Axels telefon. Rapporten själv kräver
  ingenting av det slaget.
- **På Android** kan telefonen schemalägga kollen själv.
- **Batteriet** påverkas inte märkbart.

## Vad det kan ge projektet

Halkvakt blir den första appen som både berättar om vägen före resan och säger till under den, utan att positionen lämnar telefonen.
Fintraffic säger själva om sin app *"när du kör, så kör du"*; Halkvakt täcker båda halvorna. Pendlarna är den tydligaste målgruppen,
men favoritrutterna gäller också fritidsresorna och yrkesförare som kör kända vägar, till exempel taxi, bud och hemtjänst.

## Förslaget

Ingenting byggs nu; idén är på experimentstadiet (Bengt 2/10).

1. **Formen** bestämmer Axel: var rutterna bor i appen, hur rapporten ser ut, och om tiderna och notisen ska finnas i första versionen.
2. **Innehållet** i första versionen: det som redan finns i rösten, plus vägarbeten, hastighetsnedsättningar, omledningar och färjor i
   hela landet, och köer och restider där de finns.
3. **Prognosen** i rapporten först efter domen i mars, och bara om prognoslagret klarar sina grindar.

**Öppna frågor till Bengt och Axel:** hur många rutter man får spara; om rapporten ska ha en egen flik eller ligga på *Redo.*-skärmen; om
notisen ska finnas i första versionen och vad som i så fall räknas som nytt.
