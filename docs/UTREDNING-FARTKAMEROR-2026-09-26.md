# Fartkamerorna som väglagsbild — utredning av Bengts idé 26/9

*Bengts fråga 26/9: "om man fått till ett samarbete med Trafikverket som innebar att man la in beställning på snapshots av
fartkamerorna, säg en gång per timme — ett foto utan att det kommer någon bil — och den bilden analyserades för att utröna om
det är halka, snö etc." Läs-only; inget byggt. Frågan står i bedömningen §4.2.*

## 1. Slutsats

**Riktningen är rätt, vägen är fel — för nu.** Fler bilder av vägbanan är mer facit, och facit är det som domarna väntar på. Men
fartkamerorna är byggda för att *inte* ta den bilden: de fotograferar bara vid en hastighetsöverträdelse och krypterar bilden i
kameran tills polisen öppnar ett ärende. Samma nytta finns billigare i de 744 öppna väglagskamerorna, som vi redan använder — och
det bilderna aldrig kan visa, svartisen, är just det vi varnar mest för.

## 2. Vad fartkamerorna är (läst på källan 26/9)

Trafikverkets sida om trafiksäkerhetskameror:
- **Cirka 2 735 fasta kameror** längs de statliga vägarna (årsskiftet 2025/2026), plus ett tjugotal mobila hos polisen. I appen
  finns 2 794 punkter (`static.json`), alltså samma bestånd.
- Kamerorna **mäter farten med radar och fotograferar bara när någon kör fortare än tillåtet.** Bilden kompletteras med tid, plats
  och hastighet.
- Bilderna **krypteras direkt i kameran och dekrypteras när polisen påbörjar en utredning.** Trafikverket ansvarar för de fasta
  kamerorna, polisen för de mobila och för utredningen.
- Sidan säger inget om tomma skåp eller om kameror som flyttas mellan skåp — det är okontrollerat här.

## 3. Vad idén skulle ge

| | Fartkameror | Väglagskameror (öppna) |
| :-- | :-- | :-- |
| Antal | ~2 735 | 744 (738 vid en VViS-station, DECISIONS #55) |
| Placering | vägar med hög fart och stor skaderisk | vid mätstationerna |
| Bild i dag | bara vid överträdelse, krypterad, polisens | publik direktbild; vi sparar en per kamera och tretimmarsperiod när ett larm ligger inom 15 km (`facit`-hinken) |
| En bild i timmen | ~65 600 bilder/dygn | ~17 900 bilder/dygn (alla) |

Värdet är **facit**: en bild bekräftar eller motsäger det rösten sa. Fartkamerorna står dessutom där det är farligt, och där fler
än väderstationernas 744 punkter finns.

## 4. Hindren, i den ordning de biter

**4.1 Ändamålet.** Systemet är byggt för bevis i ett brottmål: radarn utlöser, bilden krypteras i kameran, polisen dekrypterar. En
schemalagd bild av vägen är ett *nytt ändamål* i ett system vars hela konstruktion är ett ändamål. Även en bild "utan bil" kan
fånga fordon, skyltar och människor i vägrenen, alltså personuppgifter, och kräver då en egen rättslig grund och
konsekvensbedömning hos Trafikverket och polisen. Det är inte ett nej, men det är ett beslut på myndighetsnivå, inte en beställning.

**4.2 Tekniken.** Kameran är riktad och fokuserad för att läsa en registreringsskylt och se föraren i ett körfält, på en bestämd
punkt, med blixt eller IR i mörker. Det är en smal bild av en vägbana, inte en överblick. Och det finns ingen väg ut ur systemet
till ett öppet API — bilderna går krypterade till polisen. En timbild kräver ny funktion i ett upphandlat system.

**4.3 Vad en bild kan visa.** Snö och slask syns i dagsljus. I mörker blir mycket *okänd* — morgonens ark 26/9 gav 8 okända av 20,
sju av dem på grund av spindelväv över linsen. **Svartis och rimfrost syns aldrig i bild.** Därför är kamerans roll enligt
asymmetriregeln (TROSKLAR-SKUGGAN §2) att *bekräfta* en träff, aldrig att *fälla* en varning. De varningar vi mest behöver facit för
— frysrisk vid en kall, blöt station — är de en bild minst kan döma.

**4.4 Volymen.** ~65 600 bilder per dygn går inte att klassa för hand; det kräver automatisk bildanalys, lagring (gratisnivån har
1 GB) och beräkning utanför gratisnivån — ett betalbeslut enligt husregeln (DECISIONS, Axels godkännande).

## 5. Stegen i stället — billigast först

| Steg | Vad | Kostnad | Ger |
| :-- | :-- | :-- | :-- |
| 0 | **Väglagskamerorna oftare, där det spelar roll:** en bild i timmen i stället för var tredje, bara nära ett larm (samma regel som i dag, 15 km) | nästan ingen; samma hinke | fler facit per larm, mer dagsljus |
| 1 | **Trafikverkets historiska bildarkiv** för väglagskamerorna, beställt via Datautbytesportalens formulär | ingen | facit för en gången vinter — kuvösen (#232) |
| 2 | **Automatisk klassning** snö/slask/våt/bar/okänd, tränad och prövad mot de ark vi klassar för hand | beräkning; ett beslut | gör steg 0–1 hanterbara i volym |
| 3 | **Samarbetsfrågan till Trafikverket** — med steg 0–2 som bevis på nytta: timbilder ur trafiksäkerhetskamerorna, eller fler väglagskameror där de saknas | tid, ett avtal | täckning där stationerna saknas |

För det bilderna aldrig ser — isen — är friktionsdata från bilarna vägen (Nira, kort #233), inte fler kameror.

## 6. Rekommendation

Lägg idén i vårlistan som en fråga till ett framtida samarbete med Trafikverket, och pröva steg 0 och 1 före — de kräver inget avtal
och bygger det underlag som ett samarbete skulle behöva. Inget av det rör rösten: bilderna är facit, inte varningar.
