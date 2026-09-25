# TROSKLAR-NEDERBORDSTYPEN — regn, slask eller snö (kort #45)

**Fastställt 25/9 2026 av Bengt** (*"ja till 1, 2 och 3"* — steg 2 är det här dokumentet), DECISIONS #361. **Axels kontrasignatur
väntar** (bedömningen §4.2). Skrivet efter steg 1:s premissmätning (ordlistan och fälten, `scripts/matningar/nederbordstyp-ordlista-
2026-09-25.sql`) och **innan något utfall är läst**: ingen sats har korsat nederbördstypen mot temperaturen.

## 1. Frågan — och vad den INTE är

**Kan Halkvakt veta vilken sorts nederbörd som faller — regn, slask eller snö — också där ingen givare ser den, så att en varning
som redan vilar på en mätning bär rätt underlag?**

Formen är beslutad och prövas inte här: #45 är **meta på halkans fara, aldrig ett eget farslag och aldrig en egen röst** (kartan
§7.8, R15; DECISIONS #182). Handlingen, texten och prioriteten är halkans. Inget utfall i det här dokumentet når rösten; en
röständring kräver ett eget tröskeldokument och Axels beslut.

**Inte med:** vägytans tillstånd som nederbörden faller på (regn på snö, snö på snö — Bengts matris 4/9) och vinterbaselinen som
hindrar larm på normal snöväg (#51/#209). Det är steg 2, med eget dokument, när väglagshistoriken bär en vinter. Prognos av
kommande snöfall (#16) är inte med.

## 2. Mätningen finns redan vid stationerna (steg 1, 25/9)

Trafikverkets `precipitation` är **inte ett ja/nej utan en typ**, uppmätt av stationens nederbördsgivare. Arkivet 26/8–25/9:

| Värde | Rader | Stationer | Tolkning |
| :-- | --: | --: | :-- |
| `no` | 177 888 | 756 | uppehåll |
| `rain` | 144 908 | 756 | regn |
| *(null)* | 17 269 | 134 | ingen typgivare eller inget värde |
| `sleet` | 32 | 14 | snöblandat regn — **slask** (8/9–24/9) |
| `snow` | 7 | 1 | snö (18/9) |

Fälten för modellen är hela: 752 av 844 stationer bär luft, fuktighet och daggpunkt; i nederbördsraderna har 183 502 av 183 541
(99,98 %) luft och fuktighet. Spannen håller (värdevakten): luft −4,5…+26,7 °C, fuktighet 22,6–100 %, daggpunkt aldrig över luften.

**Följden avgör dokumentets form.** Vid en station med typgivare är sorten en **mätning** — den får bära en varning enligt
tröskelregeln (T4). Modellen behövs bara **där ingen givare ser**: mellan stationerna och vid stationer utan typgivare. Där får den
bara stärka, försvaga eller förlänga en varning som vilar på en mätning (T3/T6). Och givaren blir modellens facit på samma plats.

## 3. Modellen — våtbulbstemperaturen

Sorten avgörs av temperaturen nederbörden faller genom. Våtbulbstemperaturen **Tw** räknas ur luftens temperatur **T** (°C) och
relativa fuktighet **RH** (%) med **WMO:s psykrometerekvation** (Guide nr 8), löst med halvering:

    e = RH/100 · es(T)      es(x) = 6,112 · exp(17,62·x / (243,12 + x))   (hPa, över vatten)
    e = es(Tw) − 6,53·10⁻⁴ · (1 + 0,000944·Tw) · p · (T − Tw)             p = 1 013,25 hPa

Giltig för T −40…+50 °C och RH över 0 upp till 100 %; utanför ingen Tw. Mättad luft ger Tw = T exakt. Tw avrundas till tre decimaler
innan den jämförs med en gräns (CLAUDE.md, flyttalsläxan 13/9). *Stulls formel (2011) prövades först och föll på sin egen kontroll
25/9: den ligger 0,2–0,7 °C för lågt nära 0 °C — just där gränserna ligger (vid T +2 °C och RH 80 % ger den +0,25 mot +0,77).*

**Klassen:** Tw ≤ **L** ⇒ snö · L < Tw < **U** ⇒ slask · Tw ≥ U ⇒ regn. Kortets värden (L = 0, U = +1,5) prövas mot tre grannar:

| | U = +1,5 | U = +2,0 |
| :-- | :-- | :-- |
| **L = 0,0** | primär (kortet) | |
| **L = +0,5** | | |

Fyra punkter, inte fler (regel D, TROSKLAR-KOMBINATIONEN §3). **Valregeln, bestämd nu:** bland de kombinationer som klarar NT-B
väljs den med **lägst NT-B2** (det farliga felet); lika ⇒ den primära.

**Mellan stationerna** skattas Tw i en punkt ur grannarnas Tw med **segmentprognosens grannmodell** (`engine/src/segment.ts`,
`skatta`: upp till fem stationer inom 50 km, viktade 1/km) — samma modell som kartan redan prövas med, inga nya konstanter.
Höjdkorrektion (0,63 °C per 100 m på luften, DECISIONS #226) prövas som variant **C′** först om höjdprovet 23/10 (#96) säger ja.

## 4. Facit

| Facit | Vad | Var | Hur |
| :-- | :-- | :-- | :-- |
| **Stationens givare** | `rain` / `sleet` / `snow` | samma station, samma rad | ur arkivet |
| **SMHI:s rådande väder** | parameter 13, kod en gång i timmen, 162 aktiva stationer (läst i SMHI:s API 25/9) | SMHI-station inom **5 km** från en vägstation (**10 km** om färre än 20 par) | hämtas vid domen: `latest-months` (≈ 130 dygn) och `corrected-archive` — **inget nytt jobb** |

**SMHI-koderna** (100-serien följer WMO:s tabell 4680): **regn** 150–153, 157–158, 160–163, 180–184 · **slask** 167–168 ·
**snö** 145–146, 170–173, 177, 185–187 · **underkylt** 147–148, 154–156, 164–166 (räknas för sig, se §7) · **ingen nederbörd**
100–139 · allt annat (140–144, 174–176, 178, 189–199) utesluts. Tidsparning: SMHI:s timvärde mot vägstationens rad närmast hel timme,
inom ±10 minuter.

**En rad** är en station och en halvtimme — den senaste raden i 30-minutershinken, eftersom gallringen lämnar en per halvtimme
efter 7 dygn och domen annars skulle väga färska dygn tyngre än gamla.

**Bandet:** jämförelserna görs bara i rader där givaren ser pågående nederbörd (`rain`, `sleet`, `snow`) och Tw ligger i
**−3…+5 °C**. Utanför bandet är svaret trivialt (sommarregn) och skulle blåsa upp träffen.

**Vakterna följer med:** raderna läses genom #75, radvakten och karantänen, som grind A och R-A (läxan 23/9: en grind som lånar en
annan grinds population lånar dess vakter).

## 5. Grindarna

### NT-A — kan givaren tros? (premissen)
- **A1 täckning:** ≥ **70 %** av stationerna med luft och fuktighet bär en typsträng (inte null) under domfönstret.
- **A2 mot SMHI:** i paren, timmar då båda ser nederbörd i en klass: överensstämmelse på de tre klasserna ≥ **70 %**, och givaren
  säger regn när SMHI säger snö eller slask i ≤ **15 %** av SMHI:s snö- och slasktimmar.
- *Faller A:* givaren används inte som facit; NT-B och NT-C döms mot SMHI i paren med samma gränser.

### NT-B — modellen vid stationen (dom i mars)
- **B1 träff:** modellens klass = givarens i ≥ **80 %** av raderna i bandet.
- **B2 det farliga felet:** modellen säger regn när givaren säger snö eller slask i ≤ **10 %** av givarens snö- och slaskrader.
- **B3 slasket syns:** av givarens slaskrader klassar modellen ≥ **40 %** som slask — annars är tredelningen i praktiken tvådelad.
- **B4 stabilitet:** B1 håller i minst två av de tre månaderna december, januari, februari.

### NT-C — modellen mellan stationerna (lämna-en-ute)
Varje stations Tw skattas ur de **andra** stationernas rader i samma halvtimme (30-minutershinken som grind A och skuggmotorn
delar; minst två grannar) och klassas; facit är stationens egen givare. Bandet avgörs av stationens **egen** Tw, så att B och C mäts
på samma rader. **C1** träff ≥ **75 %** · **C2** det farliga felet ≤ **15 %** · **C3** slaskträff ≥ **30 %**. C′ (med höjd) samma gränser.

### NT-D — domens giltighet (utan D fälls ingen dom)
En **episod** är en stations följd av rader med samma givarklass och högst 60 minuters lucka. Under domfönstret:
≥ **100** snöepisoder och ≥ **40** slaskepisoder · ≥ **30** stationer med snö eller slask · stationer i minst **tre av fyra**
breddgradsband (< 57,5 · 57,5–60 · 60–63 · ≥ 63 °N) · slask på ≥ **10** skilda dygn · för A2: ≥ **50** partimmar med snö eller
slask enligt SMHI. *Faller D:* OAVGJORT, fönstret förlängs med mars — räcker inte heller det bärs domen till nästa vinter.

**Domspärren.** Fram till domen visar skriptet **bara räkningar på facitsidan**: rader, episoder, stationer, band och dygn per
givarklass, SMHI:s timmar per klass och antalet par. **Aldrig modellens klasser och aldrig en överensstämmelse** (som V-B, DECISIONS
#350). Domläget låser upp **1 mars 2027**.

## 6. Domslutet (mars 2027, Axel fäller mot Bengts mätning)

| Utfall | Följd |
| :-- | :-- |
| **A klarar** | Givarens uppmätta typ får publiceras som meta per station i snapshotens bevis (bevisbäraren, DECISIONS #342). |
| **A + B klarar** | Tw-klassen får stå för typen vid stationer utan typgivare, och är villkoret för C. |
| **C klarar** (vald kombination) | Klassen får publiceras som meta per segment — stärker eller förlänger, utlöser aldrig (T3/T6). |
| **B eller C faller** | Modellen används inte där; den uppmätta typen står kvar om A klarat. |

I inget utfall ändras rösten, prioriteten eller en vektor. Hur metan sedan används — försprångets nivå (#153), matrisen (steg 2) —
är egna beslut mot egna dokument.

## 7. Kända luckor — sagt nu, inte efter
1. **Underkylt regn syns inte i våtbulben** — det kräver ett varmt luftlager ovanför, som ingen marktemperatur ser — och
   Trafikverkets ordlista har inget eget ord för det i september. SMHI:s underkylt-koder räknas och skrivs ut, men ingår inte i B/C.
   **Den farligaste formen står alltså utanför.**
2. SMHI:s kodlista kallar 156 "Tätt duggregn", men i WMO 4680 är 56 tätt **underkylt** duggregn; räknas som underkylt.
3. Stationer utan luft och fuktighet (92 av 844) får ingen Tw; stationer utan typgivare (134) ger inget facit.
4. Strängen är ett ögonblicksvärde, `rain`/`snow` är tiominuterssummor: 38 546 rader `no` hade `rain = true` i september. Domen
   klassar på strängen; booleanerna används inte.
5. Ordlistan kan växa i vinter. En okänd sträng räknas som **okänd**, skrivs ut med antal och är ett larm — aldrig en klass.
6. Ekvationen räknar med havsytans tryck, eftersom stationstrycket inte arkiveras. På 500 m höjd är trycket ~6 % lägre och Tw
   några hundradels grader annorlunda — i nederbörd är luften nära mättad och Tw nära T, så felet är litet där domen mäter.
7. **Arkivet måste finnas kvar till mars.** Gallringen behåller en rad per halvtimme efter 7 dygn, så domen mäter halvtimmar.
   Exporten raderar dagar äldre än 30 dygn först när databasen passerar 350 MB (i dag 182 MB); då läser domen exporten
   (återläsningssteget, DECISIONS #334).
8. SMHI hämtas vid domen. Körs den efter början av april faller december ur `latest-months`; `corrected-archive` täcker den med
   några månaders eftersläpning.
9. Norge (Vegvesen viker in `sleet` i `snow`) och Finland ingår inte.

## 8. Ändring
Före första domläsningen: bara skriftligt, med en rad i DECISIONS och Bengts ja. Efter att ett utfall lästs: ingen ändring av gränser,
svep eller population — bara en ny prövning med ett nytt dokument.
