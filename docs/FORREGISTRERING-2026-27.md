# Förregistrering — kandidaten NIVÅ 2+BLANDNING, vintern 2026/27

**Status: UTKAST 15/10 2026, klart att signera när punkterna i §10 är besvarade och spridningen loggas.** Signeras av Bengt och Axel senast
**31/10 2026** (DECISIONS #544, #547). Domfönstret börjar den dag förregistreringen är signerad och pushad; varje dygn utan signatur är
ett dygn vinter utanför domen. Källorna är DECISIONS #544, #547, #552, #558–#573 och TROSKLAR-SKUGGAN §2–§4. Utkastet i #560 ersätts
av det här dokumentet; frågorna (A) och (B) där är besvarade av #562.

## 1. Vad som döms — kandidatens identitet

Den frysta kandidaten ur #552, ingenting annat (`kuvos/kandidat-2026-27.json`, körning 38368369876):
- fysiken `lw` (utan terräng) med de femton parametrarna i manifestet, kalibrerad på vintern 2024/25 (754 stationer, 4 152 timmar
  10/10 2024–31/3 2025);
- rättelsen `modell.pkl`, 9 757 699 byte, **sha256 c96c4072f4ecc6a979afea23c7854f77cb9f205a1cf47d8ed68fba53f58fc0ae**, i hinken `arkiv`
  under `kuvos/kuvos-kandidat-2026-27/`, med de 70 särdragen i manifestet;
- blandningen **W 0,25 · L 160 km**.

En annan modell, ett annat par eller en annan fysik är en annan kandidat och en annan fråga.

## 2. Hur den räknas — den levande kedjan

- Del A var sjätte timme (PH för R+6…R+11) och del B varje timme (grannarnas fel, RÅ, blandningen ⇒ PB), i Actions, startade av
  pulsklockan (#558). Snötäcket ackumuleras från säsongens början (#562 punkt 6). Saknad PH är tyst och räknad när del A förklarar
  den (#561).
- **Pariteten är bevisad:** kedjan räknar samma sak som kuvösens frysta procedur, inom toleransen median ≤ 0,10 °C och p95 ≤ 0,30 °C,
  på alla tre körningarna (38651194568; #561, #562).
- **Domen fälls på det kedjan räknade vid timmen**, inte på en omräkning i efterhand: kandidatens värden vid stationerna i
  `kandidat_station` och regelns utfall per sträcka och timme i `kandidat_skugga`, båda exporterade till hinken dygnet efter (#572,
  #573). Körningsloggen `kandidat_skugga_korning` säger för varje timme om regeln räknade eller teg.

## 3. Regeln som utlöser varningen (#562, #565, #566, #568, #573)

`kandidat_regel()` (sql/057), med talen på ett ställe:

| Villkor | Tal |
| :-- | :-- |
| Yta | kandidatens värde ≤ **0 °C** |
| Fukt | väglagets *Våt* på punktens sträcka (`condition_info`, exakt — *fläckvis Våt* räknas inte, #573), **eller** radarn `rate_mean_mmh` ≥ **R** mm/h över sträckan de senaste 60 minuterna |
| Veto | ingen station inom **15 km** mätte yta över **+2 °C** de senaste 45 minuterna, med ankarnas vakter (#75, karantänen, den långsamma vakten) |
| Färskhet | kandidatens timme högst **två timmar** gammal och med minst **95 %** av vägpunkterna, annars tiger regeln |
| Märkning | BETA och *modellerat*, aldrig *uppmätt* |

**R** är 0,5 eller 0,1 enligt regeln i #568, läst på cellmätningens kurvor 15/10, 19/10 och 26/10 (§10 a). Kandidaten talar också långt
från ankare till domen i mars, som ett undantag från regel T (#563, TROSKLAR-SKUGGAN §4(d)).

## 4. Måtten — oförändrade

Grind A–C med trösklarna i TROSKLAR-SKUGGAN §3, spridningsgrinden vid X = 2,25 °C där minst två ankare bidrar (§10 b) och regeln att **tystnad på ett täckt segment är en
miss** (#475, #477). Inget krav sänks. Allt redovisas också per ankarband 0–7, 7–15, 15–20 och över 20 km (#563).

| Grind | Population | För kandidaten |
| :-- | :-- | :-- |
| A1–A3 | stationerna, mot mätt yta, leave-one-out | kandidatens värde vid stationen i `kandidat_station` mot stationens mätning; **754 av ~761 stationer (99,1 %)**; samma vakter och mätningar yngre än tre timmar |
| B1–B3 | sträckorna, mot facit (§2) | en skuggvarning är en sträcka och timme i `kandidat_skugga` där regeln varnar och grinden släpper fram; falsklarm, miss och mervärde som §2 och §3 |
| C1–C3 | ≥ 20 facithändelser på täckta sträckor i ≥ 3 halkperioder, ≥ 30 skuggvarningar | följer av B |

**Grind A är en övre gräns** för kvaliteten mellan stationerna (#562 punkt 4): `modell.pkl` är tränad på samma 754 stationer, så grind A
prövar *samma stationer, nytt år*. En kontroll med regionmodeller körs i mars och redovisas bredvid, inte som grind.

**Täckt sträcka** är en sträcka och timme där körningsloggen säger *räknad*. Timmar där regeln teg för att kandidaten var gammal eller
ofullständig räknas som *okänt* — inte täckta — och deras andel redovisas för sig (§10 d).

## 5. Domfönstret

Från signeringens dag till domen i mars 2027. Bara data som ingen sett räknas (regel L, #564: L1–L4).

## 6. RÅ bredvid

RÅ:s dom fälls som förut och redovisas som **kontroll**. Kan kandidaten inte räknas för vintern fälls domslutet på RÅ i stället —
en **reserv**, inte två chanser att klara grinden (#547).

## 7. Förväntan, skriven före vintern

- Kandidatens andel grova fel vid +6 h i kuvösen är **5,12 %** mot grind A:s tak **5 %** (#552). Den väntas alltså **inte** klara A2 på
  det talet; slår det in är domen ett nej på A2, och det är ett giltigt utfall av en ärlig fråga.
- Talet kommer från *andra stationer, samma år* (fold-vis, #544 väg B); grind A vid stationerna prövar *samma stationer, nytt år*. Hur
  de två förhåller sig är inte mätt — därför är grind A en övre gräns (§4).
- Kandidaten har aldrig dömts på sträckor; grind B är ett mått utan tidigare mätning.
- Fysiken är kalibrerad på 2024/25; ingen justering görs under vintern.

## 8. Fryst vid signeringen

Identiteten (§1), regeln med talen (§3), måtten och populationen (§4), domfönstret (§5). Ändras något av det efteråt sker det bara
genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 9. Inte en del av domen

Formen i appen, texten (*"Halkvakt tror: halka framöver."* / *"Halkvakt thinks: slippery ahead."*) och avstängningen (#560 punkt 8,
#562 punkt 5, #573). De rör användaren, inte måttet.

## 10. Före signeringen

**(a) Radarns tal R.** Läses 26/10 enligt #568: visar alla tre kurvorna en majoritet i bandet 0,1–0,5 på `rate_mean` blir R = 0,1,
annars 0,5. Claude för in talet samma dag.

**(b) Spridningsgrinden för kandidaten — avgjord av #547 och #563 tillsammans; kvar är en fråga om appen och ett bygge.**
- *Grinden.* #547: kandidaten döms med RÅ:s spridningsgrind, **X = 2,25 °C**. #563 punkt 3: *"Bandet faller som krav. Kandidaten
  talar överallt där regeln slår till, också långt från stationerna."* Lästa ihop: **spridningen grindar där minst två ankare
  bidrar** (spridning ≥ 2,25 °C ⇒ okänt), och med färre ankare grindar den inte — kandidaten döms där också, redovisad per ankarband
  (0–7, 7–15, 15–20, över 20 km). RÅ:s andra villkor, *färre än två ankare ⇒ okänt*, gäller inte kandidaten, eftersom #563 säger att
  den talar långt från ankare.
- *Fråga: gäller samma grind varningen i appen?* **Claudes förslag: ja** — då döms det användaren hör (#562 punkt 4: domen gäller
  modellen som är live); annars mäter B1 en delmängd av varningarna. Det är en ändring av regeln i #562 och kräver båda signaturerna.
- *Bygget.* TROSKLAR-SKUGGAN §3 säger *"bara varv med loggad spridning räknas"*, och kandidatens logg bär i dag varken antalet
  bidragande ankare eller spridningen — **utan dem kan grind B inte räknas på kandidaten, och domen faller på RÅ.** Del B skriver
  dem till `kandidat_live` (värdevaktens spann först), och `kandidat_skugga` bär för varje sträcka den minsta spridningen bland de
  varnande punkterna med minst två ankare och antalet varnande punkter med färre — så att domen kan räkna grinden vid X = 1, 2, 2,25
  och 4 °C, som S-B gör för RÅ. Byggs före signeringen.

**(c) "845 stationer" i TROSKLAR-SKUGGAN §3** (rad 62) är en räkning av mätpunkter från före #344. Rättas till *"761 stationer (854
mätpunkter, varav 93 fjärrytor)"* i samma post som signeringen — ingen tröskel ändras.

**(d) Tysta timmar.** Claudes förslag i §4: en timme där regeln teg för att kandidaten var gammal eller ofullständig är *okänt*, inte
täckt; andelen redovisas. Alternativet — tystnaden som miss — straffar kedjans driftavbrott som om modellen missat halkan.

## 11. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
