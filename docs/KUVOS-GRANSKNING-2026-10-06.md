# Kuvösens beräkningar granskade 6/10 2026 — vad som kan ändra bilden, och vad som inte kan

*Skriven 6/10 2026 av Claude på Bengts fråga (*"finns det några missar/misstag/tankefel i våra beräkningar när det gäller kuvösen som
skulle kunna ändra det som kommit fram"*). Läst i koden och körloggarna, inget kört, inget ändrat. Kartans del (p-kuvosen) räcker inte
som underlag: den säger vad som kördes, inte om det räknades rätt. Underlaget här är `publish/grind-a.ts`, `publish/vaktdiagnos.ts`,
`sql/018`, `sql/028`, `kuvos/ovanpa.ts`, `kuvos/oversattning.sql`, `ingest/sources/weather.ts` och loggarna 37447617038 (riktningsprovet,
DECISIONS #467) och 37464971791 (kalibreringen, #468). Kort #295.*

## 1. Kontrollerat och rätt

| Vad | Hur det kontrollerades | Utfall |
| :-- | :-- | :-- |
| Grind A:s och höjdprovets datafönster går genom kuvösens klocka | `grind-a.ts` rad 214 och 239: `sample_time > now() - DAYS` — databasens `now()`, som är `kuvos.now()` | rätt: 4 353 206 punkter ur vintern, inte ur 2026 |
| Startvärdena i kalibreringen räknar som riktningsprovet | samma funktion, samma facit | identiskt: 1 109 · 983 · 461 · 175 · 45,1 % |
| Regnmängdens betydelse är samma i drift och kuvös | `weather.ts` rad 20: `Aggregated30minutes RainSum` (mm/30 min); översättningen (#464) ger mm/30 min | samma sort, samma "blöt" |
| Baslinjens fukt finns i kuvösen | `FUKT_SQL` = rain OR snow OR precipitation ∉ {no, dry}; översättningen sätter alla tre ur koden | fukt = nederbörd i ögonblicket; baslinjen fångar 20,3 % av de kalla nätterna |
| Kalibreringens halvor och regel | mittnatten 15/1 ur facitnätterna som T-A; D4 som ren funktion med prov | inga punkter nära taket: 15 procentenheter som närmast |
| Tidszonen | mätt 2/10 mot SMHI, tio av tio stationer | rätt |

## 2. Fynd som KAN ändra en slutsats

**F1. Grind A på vintern jämförs med fel fönster.** Driftens grind A (A2 3,7 %, 28/9) lär varje stations offset över **60 dygn**; kuvösens
körning lärde den över **152 dygn** (`DAYS` = hela vintern, `grind-a.ts` rad 207, offset = medelskillnad över delade hinkar). En offset som
medlas över en hel vinter passar sämre i varje enskild månad än en som medlas över två. Läsningen *"en hel vinter har fler grova fel"* (#467)
kan alltså lika gärna vara *"ett längre fönster ger sämre offset"*. **Det går inte att skilja utan att köra grind A på 60-dygnsfönster i
kuvösen** (klockan på t.ex. 31/12, 28/2 och 31/3). Hamnar A2 under 5 % där står driftens dom oförändrad och vinterläsningen var ett
fönsterfel; hamnar den över är vintern verkligen hårdare. Det här är den enda punkten som kan vända en läsning.

**F2. Efterhalkans pris bär två uppåtriktade skevheter, omätta.** (a) *Utfallet räknas på tre rader i stället för arton:* `min_yta_90min`
(`sql/018` rad 140–146) är lägsta ytan i fönstret (t, t + 90 min]; i driften finns 18 femminutersrader där, i kuvösen tre halvtimmesrader.
En kort dipp under +1,5 mellan två halvtimmar syns inte ⇒ *uteblev* räknas oftare. (b) *Fönstrets aritmetik straffar de långsamma fallen:*
med fall 0,4 °C per 30 min från +3 °C når ytan +1,8 vid 90 min — *uteblev* av konstruktion, inte av fel prognos. Startvärdena (0,8) klarar
aritmetiken från +3, men punkterna med 0,4 och 0,6 gör det inte från bandets övre del. **Storleken på (a) och (b) är inte mätt.** Att
ingen av 32 punkter kommer under 25 % står (15 procentenheter som närmast), men prisets *nivå* 45 % kan vara för hög. Det mäts med en
läsning som räknar samma episoder med 120-minutersfönstret (T-A:s svep 60 · 90 · 120) och nära-bandet 1,0 (svepet 0,3 · 0,5 · 1,0) —
läsning, ingen dom, inga trösklar.

**F3. "Nettonytt 0,2 % av facit" jämför med fel nämnare.** Facit är alla 82 985 kalla stationsnätter, också de utan regn på fyra timmar, där
efterhalkan aldrig kan tala. Ö-B1 säger *"≥ 5 % av facit **inom räckvidd**"*. Talet 0,2 % är rätt räknat men underskattar delen mot
Ö-B1:s mått. Före mars-domen måste *inom räckvidd* definieras i kod (facit med regn inom N h före), annars döms efterhalkan mot en
nämnare den inte kan nå. Ändrar ingen läsning nu; ändrar hur domen i mars ska räknas.

## 3. Fynd som INTE ändrar någon slutsats

- **Diagnosraden "153 saknade dygn 2026-05-07…"** (`vaktdiagnos.ts` `saknadeDygn`): förväntade dygn byggs i JavaScript ur riktig tid medan de
  funna dygnen kommer ur klockan. Fel utskrift, rätt mätning. Rättas i samma varv som nästa körning.
- **NT:s ordlista** känner inte `yes` och `freezing_rain` (#464): 1 411 av 5,4 miljoner rader räknas som okända. Påverkar inte NT-A/NT-D och
  inte NT-B/NT-C:s två decimaler.
- **Vägpunktsgrinden** (fallen för alla kandidater) vilar på tre oberoende omtag i höstas (#399, #405–#408) och på kuvösen — robust.
- **Höjdprovets lapse 0,18** är en läsning; att rå+höjd är sämre än rå mäts direkt och står.
- **Facitets tunnhet** (*det blev kallt*, inte *det blev halt*) är sagd före körningen (#424, #455) och ändras bara av Trafikverkets ytstatus
  och åtgärder (begäran §5d).

## 4. Rekommendation

Tre läsningar, förregistrerade i DECISIONS innan de körs, inga trösklar rörs: (1) grind A i kuvösen på 60-dygnsfönster vid tre
klockslag (F1); (2) efterhalkans pris med 120-minutersfönstret och nära-bandet 1,0 på samma episoder (F2); (3) *inom räckvidd* definierad och
räknad för Ö-B1 (F3). Kostnad: en knapptryckning på `kuvos` var (inläsningen 5 min + mätningen), ett mätskript under `scripts/matningar/`.
Bengts ja krävs (kort #295).
