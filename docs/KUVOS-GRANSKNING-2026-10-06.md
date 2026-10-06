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

## 5. Utfallet 6/10 (Bengts ja *"ja till 295"*, DECISIONS #469; körning 37517980895)

**F1 — inget fönsterfel, en vinter i tre delar.** Grind A oförändrad på 60 dygn: förvintern (2/11–31/12) **3,4 %** klarar, midvintern
(31/12–28/2) **5,4 %** faller, vårvintern (30/1–31/3) **7,1 %** faller. Vinterns 5,5 % över 152 dygn var ett medel. Felet växer mot våren i
alla band, också 0–7 km (2,0 → 3,8 → 5,3 %) — dagsljuset, inte höjden, är den troliga förklaringen (hypotes, kort #91).
| Fönster (60 dygn) | stationer · punkter | 0–7 km | 7–15 km | 15–20 km | > 20 km | TOTALT MAE · A2 · A3 | Läsning |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 2/11–31/12 (klockan 1/1) | 729 · 1 680 540 | 0,42 °C · 2,0 % | 0,46 · 2,0 % | 0,52 · 3,1 % | 0,68 · 6,8 % | 0,51 °C · **3,4 %** · 0,1 % | klarar |
| 31/12–28/2 (klockan 1/3) | 735 · 1 990 534 | 0,47 · 3,8 % | 0,49 · 3,6 % | 0,54 · 5,4 % | 0,75 · 10,4 % | 0,53 °C · **5,4 %** · 0,2 % | faller |
| 30/1–31/3 (klockan 31/3) | 736 · 1 658 283 | 0,67 · 5,3 % | 0,70 · 5,3 % | 0,75 · 7,1 % | 0,91 · 11,6 % | 0,74 °C · **7,1 %** · 0,5 % | faller |

**F2 — priset sitter i bandets topp.** Kontrollen stämmer (90 min · 0,5 = 45,1 %). Fönster och band flyttar priset mellan 22 och 59 %;
startytan är den stora spaken: **+1…+2 °C ger 19,0 %, +2…+3 °C ger 63,4 %.** Ett smalare band finns inte i svepet (det vidgas bara uppåt),
så ingen kalibreringspunkt kunde nå det — ett beslut för TROSKLAR-OVERGANGAR §2 före mars, inte för betan.
| Utfallsfönster | band 0,3 | band 0,5 | band 1,0 |
| :-- | --: | --: | --: |
| 60 min | 58,9 % (239) | 52,0 % (211) | 31,5 % (128) |
| 90 min | 52,5 % (213) | **45,1 % (183)** — riktningsprovets tal | 25,6 % (104) |
| 120 min | 47,5 % (193) | 38,9 % (158) | 22,4 % (91) |

**F3 — nämnaren avgör.** Nettonytt 175 är 6,2 % av facit med regn inom 2 h, 4,3 % med 2 h + utfallsfönstret, 3,9 % med 4 h och 3,0 % med
4 h + 90 min. Ö-B1:s gräns är 5 %. Definitionen måste fastställas före mars-domen (kort #296). Förslag: *regn inom N h + utfallsfönstret*.

Inget ändras av utfallet: inga trösklar, startvärdena frysta, driftens dom står. Kort #295 stängt; kort #296 bär de två besluten.
