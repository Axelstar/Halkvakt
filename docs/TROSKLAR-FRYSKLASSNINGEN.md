# TROSKLAR-FRYSKLASSNINGEN

**Kort:** #103 FRYSKLASSNINGEN — kan en modell som är opålitlig på grader ändå bära en
frysklassning? **Status:** ✅ **FASTSTÄLLT 2026-09-12 av Bengt** (DECISIONS #135).
Svepet i §2 och kraven i §4 är låsta enligt §7:s regim — och **inget tal i dem kommer ur A3:s
utfall**, vilket är hela skälet till att kortet är legitimt.

**Varifrån kortet kommer.** Grind A föll 12/9 (DECISIONS #119) *[rättelsenot 21/9, #288: överspelat samma dag — med givarvakten och marginalvakten blev domen INGEN DOM, inte ett nej (#131, #180). Kortets fråga står sig ändå; ingen tröskel i dokumentet berörs]*. Men A3 — frysklassningsfelet —
klarade med **1,1 % mot ett krav på 10 %**, alltså tio gånger bättre än vad som krävdes. Axels
bedömning satte ord på vad det betyder:

> *"Skillnaden mellan att flytta målstolpar och att ställa en ny fråga är hela poängen här. Att
> ändra A2 från 5 till 12 procent nu är målstolpsflytt. Att öppna ett nytt kort med frågan 'kan en
> modell som är opålitlig på grader ändå bära en frysklassning?' — med egna trösklar skrivna innan
> någon mäter — är legitimt. Samma data, ny fråga, ärlig ordning."*

**Det här dokumentet är den ärliga ordningen.** Varje tröskel nedan är skriven innan mätningen
gjorts. Ingen siffra här kommer ur A3:s utfall, och A3:s 1,1 % får inte åberopas som skäl för något
tal i §2 — det är just den återkopplingen som gör efterhandsjusteringar värdelösa.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · tystnad är en funktion ·
trösklar gissas inte, de faller ur mätning · trösklarna är daterade FÖRE mätningen och skrivs
inte om när talen kommit (§7).

---

## 1. Vad som döms — och vad som INTE döms

**Frågan:** kan offsetmodellen bära ett **binärt** påstående — *fryser den här vägytan eller inte* —
även om den inte kan bära ett **tal** i grader?

Det är en annan fråga än grind A, och den ska hållas isär från den på tre punkter:

| | Grind A | Den här frågan |
| :-- | :-- | :-- |
| Vad modellen levererar | en temperatur i grader | en klass: fryser / fryser inte |
| Hur fel mäts | avstånd i grader (MAE, grova fel) | rätt eller fel klass |
| Vad utfallet får bära | en modellerad yttemperatur | en **konfidenshöjare**, aldrig en egen varning |

**Och den viktigaste avgränsningen, som avgör allt annat:** en godkänd frysklassning ger **inte**
rätt att skapa en varning där motorn i dag tiger. Den får bara stärka eller försvaga en bedömning
som redan vilar på en uppmätt station. Samma regel som SMHI-förstärkaren (#95 d) fick, och av samma
skäl: **en storhet som inte kan motbevisas av en mätning får inte utlösa en varning.** Klassningen är en
modellprodukt — varken mätning eller minne av mätningar — och får stärka eller försvaga, aldrig ensam utlösa
(tröskelregeln i Axels lydelse, TROSKLAR-KOMBINATIONEN §6, T6). *Ändrat 16/9 (DECISIONS #220); tidigare: "en
modellerad storhet får aldrig vara en avtryckare".*

**Grind A:s dom står oavsett vad som händer här.** Om den här frågan besvaras ja betyder det inte
att offsetmodellen klarade grind A — det betyder att den duger till något annat än det grind A
prövade.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

Inget tal nedan är valt ur ett utfall. Svepet körs, kurvan ritas, Bengt sätter värdet.

| # | Parameter | Svep | Varför just det spannet |
| :-- | :-- | :-- | :-- |
| K1 | **Klassgränsen** — vid vilken modellerad yta klassen slår om | **0 · +0,5 · +1,0 °C** | Motorns egen frysrisk går vid ≤ 1 °C (bro +3). Under 0 är det redan is; över +1 talar motorn inte. |
| K2 | **Osäkerhetszonen** — hur nära gränsen modellen får säga "vet inte" | **±0 · ±0,5 · ±1,0 °C** | En modell som får avstå nära gränsen blir träffsäkrare på det den uttalar sig om. Priset är täckning, och det priset ska synas. |
| K3 | **Ankaravstånd** — längsta avstånd till bidragande granne | **15 · 20 · 50 km** | Grind A visade att felet beror av avståndet. En frysklassning kan få vara snävare än temperaturmodellen. |
| K4 | **Konfidenseffekten** — vad ett ja gör | **E0 skuggkolumn · E1 längre försprång** | Startläget är E0. Aldrig egen prioritet, aldrig egen text utan Axel. Samma stege som #95 (d) §1.2. |

**K2 är dokumentets egentliga idé.** Grind A tvingade modellen att svara i varje punkt. En
klassificerare får avstå, och frågan är om den blir tillräckligt bra på de punkter där den inte
avstår — och hur mycket den då måste avstå.

---

## 3. Givarvakt — ärvd och inte förhandlingsbar

`air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12` (#75, DECISIONS #106) gäller varje
rad som läses här, på både stationens och grannarnas sida.

**Att den saknades i grind A är hela skälet till att det här kortet ser ut som det gör.**
Anomalimätningen (#125) visade att utan vakten är bandet 7–15 km sämst av alla fyra; med den är det
näst bäst. **En frysklassning byggd på oguardad data skulle ärva exakt det felet**, och den skulle
göra det osynligt, eftersom en klass inte har någon storlek att avslöja sig med.

---

## 4. Grindarna

### K-A — Klassar modellen rätt sida av noll? (mätbar NU, på befintligt arkiv)

| # | Mått | Krav |
| :-- | :-- | :-- |
| K-A1 | **Andel korrekt klass** bland de punkter modellen uttalar sig om | **≥ 95 %** |
| K-A2 | **Farliga fel** — modellen säger "fryser inte", mätningen säger fryser | **≤ 1 %** |
| K-A3 | **Täckning** — andel punkter modellen alls uttalar sig om (K2) | **≥ 70 %** |
| K-A4 | Underlag | **≥ 500 punkter över ≥ 20 stationer**, och minst **100 punkter med uppmätt frys** |
| K-A5 | **Marginalvakten** (TROSKLAR-SKUGGAN §3, DECISIONS #126/#128) | utfall inom ±1,96 SE ⇒ **OAVGJORT** |

**K-A2 är asymmetrisk med flit och det är inte förhandlingsbart.** De två felen är inte lika
mycket värda: att säga "fryser" om en torr väg kostar ett onödigt larm, att säga "fryser inte" om
en isig väg kostar det löfte produkten vilar på. Taket är därför tio gånger hårdare än K-A1:s.

**K-A4:s sista led** — minst 100 punkter med uppmätt frys — finns därför att ett septemberunderlag
kan ge 99 % rätt klass genom att alltid säga "fryser inte". En klassificerare som aldrig ser ett
positivt fall är inte prövad.

### K-B — Tillför den något? (döms efter en vintermånad)

| # | Mått | Golv |
| :-- | :-- | :-- |
| K-B1 | Andel bekräftade halktillfällen där klassningen var rätt **och** punktmotorn var tyst eller > 30 min senare | **≥ 5 %** |
| K-B2 | Nya falsklarm som klassningen orsakat | **0 per konstruktion — mäts ändå och skrivs ut** |

**K-B2 mäts trots att svaret är känt av konstruktionen** (§1: ingen egen avtryckare). Samma
disciplin som fällde `Boolean(precipitation)`: ett påstående om noll ska bevisas med ett tal.

### K-C — Domens giltighet

| # | Krav |
| :-- | :-- |
| K-C1 | Minst **en vintermånad** med frost i minst **tre regioner** |
| K-C2 | Täckningen (K-A3) redovisad i varje dom — en hög träffsäkerhet på en tiondel av punkterna är inget resultat |
| K-C3 | Underlags- **och** marginalvakt utskrivna FÖRE tabellen |

---

## 5. Vad som skulle fälla kortet

Skrivet före mätningen (DECISIONS #71):

1. **K-A2 över 1 %** — modellen missar frysande vägar. Kortet läggs ner; det är felet som inte får
   finnas.
2. **Täckningen under 70 % vid den osäkerhetszon som krävs för K-A1** — modellen kan bara klassa
   det lätta fallet, och det fallet klarar punktmotorn redan.
3. **K-B1 under 5 %** — klassningen säger inget punktmotorn inte redan sagt.
4. **Träffsäkerheten faller när givarvakten är på** — då satt den i bruset, inte i modellen.

Utfall 4 är den intressanta: den är motsatsen till vad anomalimätningen visade för grind A, och om
den inträffar är den ett starkt skäl att misstro hela ansatsen.

---

## 6. Kostnad

Ingen ny källa. Mätningen läser samma arkiv som grind A och är en läsande knapp. En skuggkolumn är
en boolean per skuggrad. **0 kr/mån.**

---

## 7. Ordning och ändring

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

1. Det här dokumentet fastställs av Bengt, som äger mätningen. Ingen kontrasignering behövs.
2. **K-A körs på befintligt arkiv** — den kräver ingen ny data och kan köras i dag. I september
   väntas OAVGJORT på K-A4:s krav om 100 frysande punkter.
3. Vid första frostperioden: K-A om, skarpt.
4. Passerar K-A: skuggkolumnen byggs, **efter radardomen** enligt kort #81:s ordning.
5. Efter en vintermånad: K-B.
6. Först därefter en effekt i motorn (K4 = E1). **Rösten är Axels.**

Fram till **första skuggkörningen** får §2:s svep och §4:s krav justeras av vem som helst av oss med
en rad i DECISIONS. **Därefter ändras ingen tröskel alls** — en ändring som lutar sig mot
utfallet.

**Undantaget från all lättnad är K-A2:s tak, §1:s avgränsning och tröskelregeln** (TROSKLAR-KOMBINATIONEN §6, i sin
helhet). En storhet som inte kan motbevisas av en mätning får inte utlösa en varning, klassningen utlöser aldrig ensam,
och taket för farliga fel får skärpas men aldrig mjukas upp — oavsett signaturer. *Ändrat 16/9 (DECISIONS #220);
tidigare: "Ett modellerat värde får aldrig bli en avtryckare".*

---

*Källor: TAVLA.md kort #38b, #46, #75, #88, #95, #103; DECISIONS #71, #106, #119, #125, #126, #127,
#128, #129; docs/TROSKLAR-SKUGGAN.md §3 (grind A och marginalvakten), docs/TROSKLAR-RIMFROST.md §3
(givarvaktsdisciplinen), docs/TROSKLAR-SMHI-FORSTARKAREN.md §1.2 (effektstegen E0–E3);
publish/grind-a.ts, publish/marginal.ts, scripts/anomalin.ts.*
