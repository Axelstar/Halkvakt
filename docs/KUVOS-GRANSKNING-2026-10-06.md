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

## 6. Matematiken och fysiken bakom beräkningarna — bedömning (Bengts fråga 6/10 kväll)

*Inte "stämmer talen" utan "är metoden rätt". Läst i koden: `publish/grind-a.ts`, `scripts/hojd-prov.ts`, `kuvos/ovanpa.ts`, `sql/028`,
`sql/018`, `engine/src/nederbord.ts`, `engine/src/segment.ts`, tröskeldokumenten. Två fynd kan ändra en slutsats (6.2, 6.3); resten är
sunt med kända gränser. Kort #297.*

### 6.1 Prognoslagret och grind A — sunt som prov, fysiken sätter gränsen
Modellen är avståndsviktning (vikt 1/km, upp till fem ankare inom 50 km) med en inlärd offset per stationspar; grinden håller ute en station
i taget. Det är en låg ordningens interpolation, och det är rätt verktyg för frågan *"räcker grannarna?"* — den uppfinner inget. Fysiken:
vägytans temperatur en klar, stilla natt styrs av lokala ting (himmelsfaktor, skugga, vattennärhet, massa, trafik), och sådana anomalier
avklingar på 10–20 km. Resultaten följer det: 2,5 % grova fel inom 7 km, 12 % bortom 20 km, i båda länderna. Att felet växer mot våren i
alla band (#469) är samma fysik med sol i stället för utstrålning. **Offsetmodellen lär en konstant skillnad; verkligheten har en skillnad
per regim** (klart/mulet, stilla/blåsigt, mörkt/soligt). Nästa steg är därför inte en bättre interpolation utan regimen — som kräver
molnmängd (#408, §4.2 h) — eller facit mellan stationerna (kort #271). **Höjden:** standardatmosfärens 0,65 °C/100 m gäller fri luft om
dagen; om natten på vintern ligger kalluften i dalarna och lapsen vänder — den empiriska 0,18 (vinter) mot 0,63 (höst) är väntad, inte ett fel.
En fast lapse är fel fysik för nattlig vägyta; en regimstyrd (klart: dalgång kallare; mulet/blåsigt: standard) vore rätt, och den behöver
molnmängd. **Felmarginalerna:** ±1,96 SE räknas på oberoende punkter, men halvtimmarna vid samma station är starkt korrelerade; kuvösens
"± 0,0" på miljoner punkter betyder ingenting. Blockbootstrap per station × dygn (som premissmätningen, #405) är rätt och ger ~±0,4
procentenheter på 60 dygn. Grind A:s egen marginal är en undre gräns; att skriva det i grinden är en skärpning, aldrig en lättnad.

### 6.2 Efterhalkans mått straffar försprånget — ett räknefel i konstruktionen, inte i koden
Ovanpå-måttet (#456) räknar **fångad** bara om fyrningen ligger inom 90 minuter före facitögonblicket, och **uteblev** om ytan inte nått +1,5
inom 90 minuter efter fyrningen. Båda fönstren är fästa vid fyrningen. Följden: **en riktig varning som kommer 2 h före frysningen räknas
som falsklarm** — den fångar inte (för tidig) och dess 90 minuter tar slut innan ytan är nere. Måttet och målet (tidsvinst) drar åt motsatt
håll: ju tidigare regeln talar, desto dyrare ser den ut. Talen visar det: *föll ut* växer 117 → 147 → 168 av 406 när fönstret vidgas 60 → 90
→ 120 min och har inte planat ut; priset i bandets topp (63 %) är till stor del samma sak — därifrån tar vägen ner mer än 90 minuter. I
driften, med femminutersdata och 15-minutersfönstret, fyrar regeln ännu tidigare, så skevheten blir större där. Ö-B2:s ord är *"tillfällen som
inte blev hala"*, inte *"inom 90 minuter"*; nettonyttan räknas redan per natt. **Rätt mått är per natt:** en tillkommen episod är falsklarm om
stationen inte nådde ≤ +1,5 °C senare samma natt; fönstret 90 min hör till tidsvinsten, inte till priset. Det går att läsa i kuvösen utan ny
kod av betydelse (samma episoder, facitets stationsnätter finns). Om priset per natt hamnar under 25 % för någon punkt är kalibreringens
"ingen vinnare" ett artefakt av måttet — och frågan om en ny kalibrering på rätt mått är Bengts och Axels (regel D7). Inget ändras av
läsningen i sig; startvärdena står.

**Rättelse samma kväll (Bengts fråga *"blir det bättre om vi gör dessa ändringar?"*):** *per natt* är för långt. Rösten hörs av en förare som
passerar nu; en varning kl. 22 för en frysning kl. 00:30 är ett falsklarm för den föraren, och 90-minutersfönstret är förarens horisont
(T-B:s utfallsfönster). Det dagens mått gör fel är att det bara dömer **nattens första fyrning** — det tidigaste och sämsta ögonblicket —
fast regeln fyrar om och om igen under natten. Ö-B2:s ord är *"av tillkomna fyrningar"*: **varje fyrning med sitt eget 90-minutersfönster.**
Per natt redovisas bredvid som övre gräns, aldrig som mått. Läsningen (1) i §6.5 är därför *priset per fyrning*, inte per natt.
Ingen av ändringarna gör vintern 2026/27 bättre (startvärdena står, D1 stänger nya dimensioner för betan); måttet gör domen rättvisare,
daggpunkten kan göra regeln bättre från mars om kuvösen bekräftar fysiken — med priset att daggpunkten vid fyrningen inte är daggpunkten
två timmar senare (advektion av torrare luft). Mäts, antas inte.

### 6.3 Efterhalkan saknar sin fysik: daggpunkten avgör om fallet fortsätter
Regeln är *blöt + i bandet + faller*. Fysiken för en våt yta efter regn: den kyls av utstrålning och avdunstning tills den når daggpunkten —
då börjar kondensationen, och det frigjorda värmet bromsar fallet. **Ytan stannar vid daggpunkten.** Är daggpunkten +3 °C uteblir
frysningen; är den −2 °C fortsätter fallet genom +1 och frosten lägger sig (det är rimfrostens fysik, TROSKLAR-RIMFROST). Ingen av svepets
dimensioner (N, fönster, fall) bär det; daggpunkten finns i regeln bara som vakt (yta − dagg ≥ −5), inte som prediktor. Kuvösen har
`dewpoint_c` (levererad, inte räknad). **Läsning:** priset och nettonyttan för startvärdena delade på daggpunkten vid fyrningen (≤ +1 °C mot
> +1 °C) och på yta − dagg. Förutsägelse, skriven före talen: episoder med daggpunkt ≤ +1 faller ut i klar majoritet, de över +1 uteblir i
majoritet. Håller den är ett daggpunktsvillkor efterhalkans viktigaste dimension — en ny dimension i TROSKLAR-OVERGANGAR §2, med båda
signaturerna, tidigast som mars-variant (D1 förbjuder den i kalibreringen).

### 6.4 Det som är sunt med kända gränser
- **Trenden:** fallet på 30 min ur två rader; givarens upplösning 0,1 °C ger ~0,14 °C brus på en differens, så svepets lägsta steg 0,4 ligger
  tre gånger över bruset. 15-minutersfönstret går inte i halvtimmesdata — redovisat.
- **Nederbördstypen:** WMO:s psykrometerformel med fast tryck 1 013 hPa; stationer upp till ~600 m ligger ~70 hPa lägre, vilket flyttar
  våtbulben ~0,1 °C. Godtagbart; VViS ger inget tryck. Gränserna L 0/0,5 och U 1,5/2,0 ligger där litteraturen lägger regn/snö-gränsen
  (Tw ≈ +0,5…+1,5). Att underkylt regn står utanför är rätt sagt.
- **Radarn:** faktorn 0,65 är en median av kvoter; kvoten beror på intensiteten (bekräftelsekurvan 42 → 82 %), så en tröskel översatt med
  medianen är grov men ärlig. Vattenplaningens 2,0/0,65 = 3,1 mm/h följer.
- **Vinden:** olyckor per stationstimme och band är ett exponeringsmått; det blandar årstid och trafik. Grindens krav på 500
  stationstimmar och 20 olyckor i högsta bandet är det som skyddar.
- **Frysflaggan med marginal:** asymmetriskt fel (farligt = säger "fryser inte" när det fryser) är rätt riktning; täckningen bredvid gör
  att marginalen inte kan väljas gratis.
- **Facit *det blev kallt*:** VViS-stationerna sitter på saltade vägar; ≤ +1 °C är inte is. Alla kuvösens domar är temperaturprov, inte
  halkprov — sagt före körningen, gäller fortfarande.

### 6.5 Rekommendation
Två läsningar, förregistrerade före körning, inga trösklar: **(1) priset per fyrning** (varje ögonblick med sitt eget 90-minutersfönster, per
natt som övre gräns bredvid) för startvärdena och de 32 punkterna (6.2, rättelsen) — svarar på om kalibreringens "ingen vinnare" är måttets fel; **(2) daggpunkten vid fyrningen** (6.3) — svarar på om efterhalkan saknar sin viktigaste
dimension. Båda ur kuvösen, samma knapp, minuter. Därefter är tre beslut Bengts och Axels: måttet för Ö-B2 i januari (per natt eller
fönster), daggpunkten som mars-variant, och om en kalibrering på rätt mått får göras (D7). Bengts ja krävs (kort #297).

## 7. Utfallet av M1 och M2 (Bengts ja *"ja till 297"*, DECISIONS #470; körning 37524718907)

**M1 — måttet ändrar inte kalibreringens utfall.** Per fyrning: startvärdena **43,4 %** (per episod 45,1 %), lägst 35,0 %; **0 av 32 under
25 %**, i någon halva. Per natt (övre gräns, inte måttet): startvärdena **16,7 %**, 21 av 32 under 25 % — av de 183 *uteblev* inom 90 minuter
frös stationen senare samma natt i 116 fall. Det talet avgör hur Ö-B2:s *tillfällen som inte blev hala* ska läsas i januari (kort #296/#297).
Ingen kalibrering om: måttet var inte felet.
| Punkt | per fyrning: uteblev av n ⇒ pris | halva A | halva B | per episod (dagens mått) | per natt (övre gräns) |
| :-- | :-- | --: | --: | --: | --: |
| N 1 h · 30 min · fall 0,4 | 668 av 1087 ⇒ **61,5 %** | 68,5 % | 53,7 % | 62,6 % | 256 av 863 ⇒ 29,7 % |
| N 1 h · 30 min · fall 0,6 | 278 av 466 ⇒ **59,7 %** | 68,8 % | 48,1 % | 61,6 % | 123 av 409 ⇒ 30,1 % |
| N 1 h · 30 min · fall 0,8 | 134 av 233 ⇒ **57,5 %** | 66,4 % | 45,5 % | 59,2 % | 56 av 213 ⇒ 26,3 % |
| N 1 h · 30 min · fall 1,2 | 37 av 61 ⇒ **60,7 %** | 66,7 % | 53,6 % | 62,7 % | 14 av 57 ⇒ 24,6 % |
| N 1 h · 60 min · fall 0,4 | 1287 av 1919 ⇒ **67,1 %** | 73,5 % | 61,4 % | 68,1 % | 386 av 1225 ⇒ 31,5 % |
| N 1 h · 60 min · fall 0,6 | 543 av 882 ⇒ **61,6 %** | 69,6 % | 53,9 % | 63,2 % | 184 av 665 ⇒ 27,7 % |
| N 1 h · 60 min · fall 0,8 | 284 av 488 ⇒ **58,2 %** | 66,4 % | 49,1 % | 60,7 % | 107 av 395 ⇒ 27,1 % |
| N 1 h · 60 min · fall 1,2 | 97 av 166 ⇒ **58,4 %** | 64,5 % | 50,7 % | 60,7 % | 33 av 144 ⇒ 22,9 % |
| N 2 h · 30 min · fall 0,4 | 1124 av 2076 ⇒ **54,1 %** | 61,0 % | 45,4 % | 60,2 % | 372 av 1382 ⇒ 26,9 % |
| N 2 h · 30 min · fall 0,6 | 441 av 928 ⇒ **47,5 %** | 56,2 % | 36,9 % | 51,7 % | 172 av 744 ⇒ 23,1 % |
| N 2 h · 30 min · fall 0,8 **(start)** | 195 av 449 ⇒ **43,4 %** | 52,4 % | 32,3 % | 45,1 % | 67 av 401 ⇒ 16,7 % |
| N 2 h · 30 min · fall 1,2 | 50 av 100 ⇒ **50,0 %** | 61,5 % | 37,5 % | 52,1 % | 17 av 92 ⇒ 18,5 % |
| N 2 h · 60 min · fall 0,4 | 2405 av 3965 ⇒ **60,7 %** | 66,3 % | 54,3 % | 67,0 % | 587 av 1959 ⇒ 30,0 % |
| N 2 h · 60 min · fall 0,6 | 1161 av 2155 ⇒ **53,9 %** | 61,0 % | 44,9 % | 58,5 % | 317 av 1280 ⇒ 24,8 % |
| N 2 h · 60 min · fall 0,8 | 628 av 1275 ⇒ **49,3 %** | 58,1 % | 37,8 % | 53,2 % | 200 av 861 ⇒ 23,2 % |
| N 2 h · 60 min · fall 1,2 | 211 av 478 ⇒ **44,1 %** | 55,3 % | 31,6 % | 47,5 % | 68 av 370 ⇒ 18,4 % |
| N 3 h · 30 min · fall 0,4 | 1598 av 3233 ⇒ **49,4 %** | 54,5 % | 42,4 % | 58,8 % | 493 av 1939 ⇒ 25,4 % |
| N 3 h · 30 min · fall 0,6 | 625 av 1483 ⇒ **42,1 %** | 48,0 % | 34,4 % | 48,1 % | 230 av 1114 ⇒ 20,6 % |
| N 3 h · 30 min · fall 0,8 | 267 av 689 ⇒ **38,8 %** | 44,8 % | 30,6 % | 41,7 % | 94 av 597 ⇒ 15,7 % |
| N 3 h · 30 min · fall 1,2 | 60 av 129 ⇒ **46,5 %** | 58,8 % | 32,8 % | 48,0 % | 25 av 121 ⇒ 20,7 % |
| N 3 h · 60 min · fall 0,4 | 3417 av 6034 ⇒ **56,6 %** | 60,6 % | 51,4 % | 66,6 % | 737 av 2566 ⇒ 28,7 % |
| N 3 h · 60 min · fall 0,6 | 1733 av 3505 ⇒ **49,4 %** | 54,4 % | 42,3 % | 58,7 % | 446 av 1825 ⇒ 24,4 % |
| N 3 h · 60 min · fall 0,8 | 938 av 2119 ⇒ **44,3 %** | 50,5 % | 35,4 % | 51,6 % | 282 av 1302 ⇒ 21,7 % |
| N 3 h · 60 min · fall 1,2 | 301 av 803 ⇒ **37,5 %** | 45,8 % | 27,8 % | 42,7 % | 103 av 593 ⇒ 17,4 % |
| N 4 h · 30 min · fall 0,4 | 2110 av 4416 ⇒ **47,8 %** | 52,4 % | 41,2 % | 60,0 % | 606 av 2426 ⇒ 25,0 % |
| N 4 h · 30 min · fall 0,6 | 815 av 2021 ⇒ **40,3 %** | 45,9 % | 33,2 % | 48,6 % | 283 av 1440 ⇒ 19,7 % |
| N 4 h · 30 min · fall 0,8 | 329 av 893 ⇒ **36,8 %** | 43,4 % | 28,9 % | 41,0 % | 114 av 756 ⇒ 15,1 % |
| N 4 h · 30 min · fall 1,2 | 68 av 158 ⇒ **43,0 %** | 58,8 % | 26,9 % | 44,7 % | 28 av 148 ⇒ 18,9 % |
| N 4 h · 60 min · fall 0,4 | 4513 av 8231 ⇒ **54,8 %** | 58,3 % | 50,0 % | 68,0 % | 880 av 3131 ⇒ 28,1 % |
| N 4 h · 60 min · fall 0,6 | 2391 av 4959 ⇒ **48,2 %** | 53,1 % | 40,9 % | 59,9 % | 555 av 2334 ⇒ 23,8 % |
| N 4 h · 60 min · fall 0,8 | 1342 av 3088 ⇒ **43,5 %** | 49,8 % | 34,6 % | 52,6 % | 362 av 1733 ⇒ 20,9 % |
| N 4 h · 60 min · fall 1,2 | 408 av 1166 ⇒ **35,0 %** | 43,1 % | 25,7 % | 40,4 % | 130 av 825 ⇒ 15,8 % |

**M2 — daggpunkten nästan halverar priset och bär 118 av 175 nettonytt.** Riktningen bekräftad; den starka formen (klar majoritet föll ut
inom 90 min) inte — 49 % inom 90 min, 78 % under natten. Yta − dagg ≤ 0 är dyrast (48,8 %): kondensationsvärmet bromsar, som §6.3 sade.
| Daggpunkten vid fyrningen | episoder | föll ut · nära · uteblev (90 min) | pris per episod | per fyrning | per natt | fångar · nettonytt |
| :-- | --: | :-- | --: | --: | --: | :-- |
| dagg ≤ +1 °C | 198 | 97 · 37 · 64 | **32,3 %** | 30,9 % | **10,9 %** | 387 · **118** |
| dagg > +1 °C | 213 | 51 · 41 · 121 | **56,8 %** | 55,2 % | 22,5 % | 74 · 57 |

| Yta − dagg vid fyrningen | episoder | pris per episod | per natt |
| :-- | --: | --: | --: |
| ≤ 0 (kondensation pågår) | 129 | **48,8 %** | 22,5 % |
| 0–1 | 124 | 44,4 % | 14,9 % |
| 1–2 | 97 | **38,1 %** | 10,3 % |
| > 2 | 72 | 44,4 % | 15,7 % |

Följd: inga trösklar, ingen kod. Daggpunkten som mars-variant och Ö-B2:s mått är Bengts och Axels beslut (kort #297).
