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

## 7. Steg 0 — effekt och kostnad, mätt 26/9 (Bengts fråga, läs-only)

Mätt med `scripts/matningar/steg0-kamerabilder-2026-09-26.sql` via dbknapp (36226200792, 36226294067), och gratisnivåns gränser lästa
på supabase.com/pricing 26/9: **1 GB fillagring, 5 GB egress, 500 000 funktionsanrop i månaden.**

### 7.1 Läget i dag

| | |
| :-- | :-- |
| Bilder i `facit`-hinken sedan 15/9 | **988**, från **68** av 744 väglagskameror |
| Per dygn | 83–107 (≈ 90), från 17–29 kameror |
| Per kamera och dygn | ≈ 1,3 — taket är 8 (en per tretimmarsperiod) |
| Storlek | 23,1 kB per bild, 22,2 MB totalt (≈ 2 MB/dygn); lagringen totalt 25,5 MB (facit 22,2 + arkiv 3,3) av 1 GB |
| Tid på dygnet | jämnt över alla 24 timmar (32–58 bilder per timme) — i december blir ungefär tre av fyra tagna i mörker |
| **Vad larmen var**, skuggan SE 7 dygn | **fartkamera 760 · olycka 31 · frysrisk 14 · vilt 2** — 94 % av bilderna tas vid en fartkameravarning |
| Tretimmarsspärren, senaste 6 h | **0 av 48 körningar** träffade den; budgeten (5 bilder per körning) tog slut 0 gånger |
| Tid i skuggmotorn | bildsparandet 221 ms i snitt (max 2 s) av en körning på 991 ms — drygt en femtedel |

### 7.2 Steg 0 som det stod — ingen effekt

*"En bild i timmen i stället för var tredje, bara nära ett larm"* ändrar ingenting: bilderna tas när en skuggrutt passerar en kamera,
och varje rutt körs var 3,5:e timme. Samma kamera besöks alltså sällan två gånger inom tre timmar — spärren träffade 0 gånger av 48.
**Effekt ≈ 0, kostnad ≈ 0.** Det var ett fel i svaret 26/9 att kalla det "att vrida på en inställning".

### 7.3 Det som faktiskt begränsar bildfacit

1. **Bilderna följer skuggrutterna**, inte farorna: 68 av 744 kameror, och bara där en rutt råkar gå.
2. **Nästan alla är facit för fel sak:** 94 % vid fartkameravarningar, som inte behöver väglagsfacit. Frysrisk gav 14 bilder på en vecka.
3. **Bara nära larm:** där appen var tyst tas ingen bild — tystnadsfelet (#98) kan inte få kamerafacit alls.
4. **Mörkret:** jämnt fördelat över dygnet blir de flesta vinterbilder *okänd*.

### 7.4 Tre varianter som ger effekt

| Variant | Vad | Effekt | Kostnad |
| :-- | :-- | :-- | :-- |
| **V1 — rensa bort fartkamerorna** | ta ingen facitbild vid en fartkameravarning | ingen förlust (de behöver inget väglagsfacit); frigör lagring och tid | **negativ**: ≈ 2 → 0,15 MB/dygn; bildsparandet i skuggmotorn ≈ 221 → ~15 ms per körning (hjälper #244:s CPU-tak) |
| **V2 — varje faran, hela landet, i dagsljus först** | ett eget litet flöde (pg_cron + edge function, inga Actions-minuter) som varje timme tar bilden vid väglagskameran närmast varje *aktuell* frysrisk i `live.json`, med **gryningsbilden** först — bilden strax efter soluppgång efter en natt med larm, när vägen syns | frysriskfacit från ~9 % av kamerorna (rutterna) till alla 744 — i storleksordningen **tio gånger** fler; fler bilder i dagsljus | 720 anrop i månaden (0,1 % av 500 000); ≈ 0,4 s per bild; med tak 150 bilder/dygn ≈ 3,5 MB/dygn — **≈ 540 MB till 1 mars** i värsta fall |
| **V3 — tystnadsstickprov** | två bilder i timmen vid kalla stationer (yta ≤ 3 °C) **utan** larm | det enda sättet att få kamerafacit för tystnadsfelet (#98) | 48 bilder/dygn ≈ 1,1 MB/dygn ≈ 170 MB till 1 mars |

**Lagringen är den bindande kostnaden.** Bilderna läses först i mars (blindningen, DECISIONS #335), så de måste ligga kvar hela
vintern, och hinken delar 1 GB med arkivexporten (#334), som börjar skriva när databasen passerar 350 MB. Räknat till 1 mars:
i dag ≈ 360 MB · V1 ensam ≈ 50 MB · V1+V2 ≈ 260–590 MB · V1+V2+V3 ≈ 430–760 MB. Läsningen i mars (≈ 10 000 bilder à 23 kB ≈ 230 MB)
ryms i 5 GB egress. **Inga Actions-minuter** i någon variant; inget betalbeslut så länge taket i V2 hålls.

**Vad en bild inte kan:** svartis och rimfrost syns aldrig, så en *våt* bild en kall natt kan vara is eller vatten. Varianternas
värde är att bekräfta snö och slask, att visa *bar och torr* där appen sa fukt, och — med V3 — att visa snö där appen teg.

### 7.5 Rekommendation

**V1 nu** (en rad i skuggmotorn, ingen förlust, sparar lagring och tid), **V2 före frosten** med gryningsbilden och ett dygnstak,
**V3 först om TROSKLAR-TYSTNADSFEL behöver kamerafacit.** Inget av dem rör rösten. Frågan i bedömningen §4.2.
