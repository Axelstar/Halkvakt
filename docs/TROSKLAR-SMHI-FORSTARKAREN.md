# TROSKLAR-SMHI-FORSTARKAREN

**Kort:** #95 (d) SMHI-FÖRSTÄRKAREN — snöfallsvarning + yta nära noll (systemanalysens §2.8,
övertagen från #93 den 12/9, DECISIONS #108). **Status:** ✅ **FASTSTÄLLT 2026-09-12 av Bengt**
(DECISIONS #135), på hans order "vi bygger smhi förstärkaren". Svepet i §2 och kraven i §4 är låsta
enligt §8:s regim. Ingen kod i motorn, ingen röst.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · **punktkällor säger
"framöver", aldrig en sträcka** · tystnad är en funktion · trösklar gissas inte, de faller ur mätning
· trösklarna är daterade FÖRE mätningen och skrivs inte om när talen kommit (§8).

---

## 1. Vad som döms — och en spänning i kortet som måste lösas först

Motorns frysrisk (`icing_point`, A2) fyrar på **yta ≤ 1 °C** (bro +3) **och `moisture === true`**.
SMHI:s varningar (`smhi_warnings`, `smhi_warnings_history`) hämtas redan varje timme och kostar
tiotals kB per dygn. Frågan kortet ställer: **säger en aktiv vintervarning över samma område något
som stationen inte redan sagt?**

### 1.1 Spänningen, och hur den löses

Kortet säger två saker som drar åt olika håll:

> "snöfallsvarning + **yta nära noll** = högre konfidens"
> "Förstärkare av frysrisken, **ALDRIG en egen fara** — den får höja konfidensen i en varning som
> redan kvalificerar, **inte skapa en varning**."

"Yta nära noll" är ett **bredare** villkor än motorns `yta ≤ 1 °C OCH fukt`. Läst bokstavligt skulle
regeln alltså kunna fyra där motorn i dag tiger — vilket den andra meningen uttryckligen förbjuder.

**Lösningen i det här dokumentet:** förstärkaren verkar **bara på den delmängd som redan
kvalificerar**. Parametern F3 ("yta nära noll") får därför ett **tak vid motorns egen tröskel** och
kan aldrig sättas högre. Regeln kan skära bort, aldrig lägga till.

✅ **AVGJORT AV BENGT 12/9: den smala** (DECISIONS #123). Frågan ställdes rakt — smal eller bred —
och svaret var den smala. Skälet som fällde den breda: **ett län är ingen punkt och ingen sträcka.**
Om det verkligen snöar över länet rapporterar de flesta av våra stationer där redan nederbörd, och
motorn varnar. De stationer som är TORRA under en aktiv länsvarning är just de där varningen är
lokalt fel eller där snön inte kommit än — alltså precis falsklarmen. En varning född ur en
länspolygon hade legat på varenda väg i länet i åtta timmar, och det på den sorts larm som DECISIONS
#103 pekade ut som den dyra: en förutsägelse, inte en observation.

➡️ **Den breda idéns berättigade kärna flyttades till #89, inte till papperskorgen.** SMHI vet två
saker våra stationer inte vet: ytan mellan stationerna, och **tiden före händelsen** — varningarna
publiceras i förväg. Den smala regeln använder ingendera. Därför lades **N_varning** in i
`TROSKLAR-OVERGANGAR §2.3`: en aktiv vintervarning **förlänger N** — hur länge efter uppmätt regn
eller snö frysrisken får leva vidare — utan att uppfinna väta ur en polygon. Utlösaren förblir
stationens eget uppmätta regn. **Det är SMHI som prior på en redan öppen fråga, i stället för som
avtryckare.**

### 1.2 Vad "höja konfidensen" konkret gör — motorn har inget konfidensfält

Det finns **ingen konfidensgrad i `engine/src`**. En förstärkare som inte gör något är värdelös, så
effekten måste namnges före svepet. Tre kandidater, och bara två är tillåtna:

| Effekt | Tillåten? | Kommentar |
| :-- | :-- | :-- |
| **E0 — bara mätning** | **ja, och det är startläget** | Uppspelning ur arkivet (DECISIONS #363; tidigare `smhi_forstarkt` i skuggloggen). Ingen förarupplevelse alls. |
| **E1 — längre försprång** | ja, om F-B passerar | Samma form som #90:s roll B: modifieraren **förlänger försprånget**, den höjer aldrig prioriteten (prioritetsstegen droppar förloraren). |
| **E2 — annan rösttext** | **nej, inte av mig** | Rösten är Axels, och PRODUKTBOKSREGELN gäller i samma varv. Föreslås först om F-B passerar med marginal. |
| E3 — högre prioritet | **aldrig** | Skulle tysta en olycka eller en halksträcka. Prioritetsstegen rörs inte. |

**Vi bygger E0 nu.** E1 är en parameter i svepet (F6) och byggs bara om grinden säger det.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

Inget tal nedan är valt. Svepet körs, kurvan ritas, Bengt sätter värdet.

| # | Parameter | Svep | Varför just det spannet |
| :-- | :-- | :-- | :-- |
| F1 | **Vilka `event_code` räknas** | `SNOW_ICE` · `SNOW\|ICE\|ICING` · ingestens `WINTER_CODES` | Ingesten flaggar redan vinterrelevans med `SNOW\|ICE\|ICING\|COLD\|WIND`. **WIND hör inte hemma i en frysriskförstärkare** — drivsnö är en sträckfråga, inte en isfråga. Det breda alternativet finns med för att visa vad det kostar, inte för att vinna. |
| F2 | **Vilken `level_code` räcker** | `YELLOW`+ · `ORANGE`+ · alla inkl. `MESSAGE` | SMHI:s `MESSAGE` är "meddelande", inte varning. Att ta med den är att ta med nästan allt. |
| F3 | **"Yta nära noll"** | `≤ 0` · `≤ 1` (motorns egen) | **Tak: aldrig över motorns tröskel** (§1.1). Regeln får skära, aldrig lägga till. |
| F4 | **Tidsmatchning** | giltighetsfönstret · +0/−0 h · ±1 h · ±3 h | SMHI publicerar i förväg. Se §3.1 — fönstret finns inte i arkivet ännu. |
| F5 | **Rumslig matchning** | stationen **inuti** området · ≤ 10 km utanför · ≤ 25 km | Varningsområdena är **län**. Se §3.2. |
| F6 | **Effekten** (§1.2) | E0 bara mätning · E1 försprång × 1,5 · E1 försprång × 2 | E0 är startläget. E1 byggs bara om F-B passerar. |

---

## 3. Givarvakt — två hål som är kända innan mätningen börjar

### 3.1 Arkivet saknade varningens giltighetsfönster (åtgärdat 12/9)

`smhi_warnings` (nuläget) bär `approx_start` och `approx_end` — men tabellen **töms och skrivs om vid
varje synk**. Arkivet `smhi_warnings_history` har sedan `001_init` burit allt **utom just de två
fälten**. Arkivet visste alltså **när en varning publicerades, men inte när den gällde**.

Det spelar roll eftersom **SMHI publicerar i förväg**: en snöfallsvarning som publiceras kl 14 kan
gälla 22–06. F4 kan inte sättas mot ett fönster som inte finns.

✅ **`sql/015_smhi_giltighet.sql` lägger till de två fälten**, och `ingest/db.ts` skriver dem framåt.
**Fälten går inte att hämta i efterhand** — SMHI:s API ger bara nuläget, och de historiska raderna är
redan skrivna utan dem. Rader från före 12/9 får NULL och räknas som **"okänt giltighetsfönster",
aldrig som "gällde inte"**. Därför måste F4:s slutliga värde sättas på rader skrivna efter
migrationen, och det är ett skäl till att den gjordes i september och inte i december.

### 3.2 Ett län är inte en väg

Varningsområdena är **länspolygoner**. Att en snöfallsvarning täcker en station säger ingenting om
den stationens hundra meter. Det är samma läxa som §2.8:s täckningsmätning gav: **täckning är inte
duglighet.** Konsekvensen för grinden: F-A får aldrig läsas som att regeln "stämmer" bara för att
träffytan är stor — en regel som förstärker 80 % av alla kvalificerande stationstimmar har inte
skilt något, den har bara sagt "vinter".

### 3.3 Ärvda vakter

Stationssidan ärver **#75:s givarvakt** (`air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c -
12`), som **61 % av arkivets frostrader faller på**. Fukten räknas med motorns egen definition
(`publish/snapshot-core.ts:41` — `rain OR snow OR (precipitation AND NOT IN ('no','dry'))`; okänt
värde räknas som vått, "no"/"Dry" är kända och betyder torrt) och skriptets självtest har en
**driftvakt** som fäller om SQL och motor skulle glida isär. Varningsrader utan `geom` räknas inte —
de kan inte matchas rumsligt och ska inte gissas.

---

## 4. Grindarna

### F-A — Finns paret alls? (mätbar NU, före all skuggkod)

Frågan: **hur ofta ligger en kvalificerande frysriskstationstimme under en aktiv vintervarning?**

| # | Mått | Krav |
| :-- | :-- | :-- |
| F-A1 | Kvalificerande stationstimmar under en vintervarning | **≥ 200** |
| F-A2 | Distinkta varningsområden bakom dem | **≥ 20** |
| F-A3 | **Förstärkt andel** av alla kvalificerande stationstimmar | **mellan 5 % och 80 %** |
| F-A4 | Ingen enskild varning står för mer än | **25 %** av träffarna |

**F-A3 har ett tak, inte bara ett golv, och det är avsiktligt.** Under 5 % gör regeln ingenting.
Över 80 % säger den "det är vinter" och skiljer inte två fall åt. En förstärkare som alltid är på är
inte en förstärkare.

**F-A4 är rimfrostens läxa i förebyggande form** (TROSKLAR-RIMFROST R-A5): en enda länsvarning över
Norrbotten kan ensam skapa tusentals stationstimmar.

### F-B — Skiljer den? (döms efter en vintermånad)

**Uppspelning ur arkivet**, aldrig röst: stationstimmarna ur `weather_observations`, varningarna ur `smhi_warnings_history` med
område och giltighetsfönster (sql/015). *Ändrat 25/9 (DECISIONS #363); tidigare: skuggkolumn `smhi_forstarkt` i skuggmotorn.*
Jämförelsen är **förstärkta mot oförstärkta kvalificerande stationstimmar**, mot facitstacken:

| # | Mått | Krav |
| :-- | :-- | :-- |
| F-B1 | Andel med bekräftad halka i facit, förstärkta ÷ oförstärkta | **≥ 1,5 ×** |
| F-B2 | Falsklarm: nya varningar regeln skapat | **0 per konstruktion — mäts ändå och skrivs ut** |
| F-B3 | Med F6 = E1: extra tidiga larm som sedan klarnade | redovisas, **fäller inte** |

**F-B2 mäts trots att svaret är känt.** En regel som "per konstruktion inte kan skapa varningar" ska
bevisa det med ett tal, inte med ett påstående — det är samma disciplin som fällde
`Boolean(precipitation)`.

**F-B3 fäller inte** (DECISIONS #103): upprepning av en SANN varning är billig. Men ett längre
försprång på en **förutsagd** fara är dyrare än på en observerad, och därför redovisas det.

### F-C — Domens giltighet

| # | Krav |
| :-- | :-- |
| F-C1 | Minst **en vintermånad** med varningar skrivna EFTER `sql/015` (§3.1) |
| F-C2 | Minst **tre län** representerade |
| F-C3 | Andelen rader med okänt giltighetsfönster redovisad i varje dom |
| F-C4 | Underlagsvakten skrivs ut **FÖRE** tabellen — OAVGJORT ska inte kunna läsas som en dom |

---

## 5. Vad som skulle fälla kortet

Skrivet före mätningen, så utfallet inte kan tolkas i efterhand (DECISIONS #71):

1. **F-A3 över taket** — regeln är på nästan jämt ⇒ den säger "vinter", inte "just här".
2. **F-B1 under 1,5 ×** — förstärkta timmar är inte farligare än oförstärkta ⇒ länspolygonen bär
   ingen information som stationen inte redan gav.
3. **F-A4 fälls av ett enda län** ⇒ vi mäter en varning, inte en regel.
4. **Paret existerar knappt** — under 200 kvalificerande stationstimmar på en hel vinter ⇒ regeln är
   sann men betydelselös.

**Ett dokumenterat nej är ett bra utfall** och kostar en mätning i stället för en motorändring.

---

## 6. Facit

Samma stack som #88, #89 och #98 döms mot (DECISIONS #94): `road_condition_history`
(operatörens omklassningar — vinterfacit), kamerafacit #20, `situation_archive` #33. **Inget
samarbete utanför huset krävs.**

Svagheten som ska stå i varje dom: `road_condition_history` **står stilla sedan 25/8** eftersom
Trafikverket klassar om vägar först på vintern. Facit för den här grinden **existerar inte ännu**,
och det är ett skäl till att F-B är en vintergrind och F-A inte är det.

---

## 7. Kostnad

Ingen ny källa, ingen ny hämtning. `smhi_warnings` hämtas redan varje timme av pulsklockans
ingest-varv och kostar tiotals kB per dygn. `sql/015` lägger till två `timestamptz` per historikrad,
alltså storleksordningen **16 byte per varningsrad** — och varningsrader är tiotal per dygn, inte
tusental. Skuggkolumnen `smhi_forstarkt` är en boolean per skuggrad. **0 kr/mån.**

---

## 8. Ordning — vad görs när

1. ✅ **`sql/015` + ingesten** — giltighetsfönstret in i arkivet. Gjort 12/9; måste göras före vintern
   eller data går förlorad (§3.1).
2. ✅ **Det här dokumentet** fastställs av Bengt, som äger mätningen.
3. ✅ **Steg 0 / grind F-A** — `scripts/smhi-forstarkaren-steg0.ts`, läsande knapp. Kan köras i dag;
   i september väntas OAVGJORT, och det är ett underlagsbesked.
4. **Vid första vintervarningarna:** F-A körs om skarpt.
5. **Passerar F-A:** uppspelningen för F-B byggs, spärrad som grind NT (DECISIONS #363). Radardomen är avklarad (13/9).
6. **Efter en vintermånad:** F-B döms mot facitstacken.
7. **Först därefter** en effekt i motorn (F6 = E1), vektorer i tre portar, PRODUKTBOKEN i samma varv.
   **Rösten är Axels.**

---

## 9. Ändring

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

Fram till **första skuggkörningen** får svepet i §2 och kraven i §4 justeras av vem som helst av oss
med en rad i DECISIONS. **Därefter ändras ingen tröskel alls.** En ändring som lutar sig mot
utfallet är värdelös — det är hela skälet till att dokumentet är daterat. Regimen är knuten till första skuggkörningen, inte till signaturen — samma form som
TROSKLAR-TRENDEN §8, TROSKLAR-OVERGANGAR §10 och TROSKLAR-RIMFROST §9.

**Ankaret flyttat 25/9 (DECISIONS #363):** B döms genom uppspelning ur arkivet, inte i en skuggkolumn, så "första skuggkörningen" inträffar aldrig. Ankaret är i stället **den första körning som läser ett B-utfall** — fram till dess gäller lättnaden ovan, därefter ändras ingen tröskel.

**Undantaget från all lättnad är §1.1:s tak.** F3 får aldrig sättas över motorns egen tröskel,
oavsett signaturer — den dagen regeln får skapa varningar är den ett annat kort med en egen
falsklarmsräkning.

---

*Källor: TAVLA.md kort #20, #75, #89, #90, #93, #95, #98, #101; DECISIONS #71, #94, #103, #106,
#108, #114, #118, #119, #120; engine/src/engine.ts:189 (icing_point), publish/snapshot-core.ts:41
(fukt); ingest/sources/smhi.ts (WINTER_CODES), ingest/db.ts (historikskrivningen);
sql/001_init.sql, sql/015_smhi_giltighet.sql; docs/TROSKLAR-VIND-SIKT.md §5 (modifierarformen),
docs/TROSKLAR-RIMFROST.md §3 (vaktdisciplinen).*
