# TROSKLAR-TRENDEN

**Kort:** #88 TRENDEN (systemanalysen §2.1). **Status:** ✅ **FASTSTÄLLT OCH KONTRASIGNERAT** —
Bengt 2026-09-10 i chatten, Axel 2026-09-11 via Bengt (samma form som DECISIONS #61/#68; se #95).
Fastställda: svepet i §2, golven i T-B (20 / 5 / 25 %), underlagskraven i T-C. Ingen kod ännu.
Skuggkolumnen byggs först efter radardomen 14/9 (kort #81:s ordning). Från första skuggkörningen
gäller §8 — regimen är knuten till första skuggkörningen och
inte till signaturen.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · punktkällor säger
"framöver" · tystnad är en funktion · trösklar gissas inte, de faller ur mätning · ändring efter
trösklarna är daterade FÖRE mätningen och skrivs inte om när talen kommit (§8).

---

## 1. Vad som mäts

Sedan 9/9 skriver ingest-live arkivet med minutupplösning på 848 stationer. Det gör **lutningen**
mätbar utan prognosmodell: ytans temperaturförändring över tid, dT/dt.

Två riktningar, två olika nyttor, mäts **var för sig**:

**Fallande (svartisens förvarning).** Yttemperatur som faller mot noll med daggpunkten strax under
ytan är den fysiska föraningen av utstrålningssvartis (klar, vindstilla kväll). Det är ingen
prognos — det är en observerad trend — och får sägas som *"risk framöver"*. Värdet är **tidsvinst**
över dagens punktregel (yta ≤ 1 °C + fukt), plus en mindre svans av tillfällen där punktregeln
tiger helt.

**Stigande (tystna tidigare).** Yttemperatur som stiger genom +1 °C på morgonen är skälet att
släcka frysrisken tidigare än åldersspärren gör. Värdet är **färre onödiga varningar** — tystnadens
sida av samma mynt.

Trenden **ersätter inte** dagens frysregel. Den är additiv: en egen skuggkolumn bredvid, dömd mot
samma facit.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

Precis som regntröskeln i TROSKLAR-VATTENPLANING: dessa gissas inte. Dokumentet anger **svepet**;
T-A (§4) väljer värdet.

| Parameter | Vad den styr | Svep |
| :-- | :-- | :-- |
| **Fönster** | över hur många minuter lutningen räknas | 15 · 30 · 60 min |
| **Lutningströskel** | hur brant fallet måste vara för att räknas | 0,4 · 0,6 · 0,8 · 1,2 °C per fönster |
| **Daggpunktsgap** | hur nära ytan daggpunkten måste ligga | yta − dagg ≤ 0 · 0,5 · 1,0 · 2,0 °C |
| **Startband** | inom vilket ytband triggern får fyra | yta mellan +1 och +3 · +1 och +4 · +1 och +6 °C |
| **Stigande tröskel** | hur brant stigningen måste vara för tystnad | +0,4 · +0,8 °C per fönster, yta > +1 |
| **Nära-miss-band** | hur nära tröskeln ytan måste komma för att en fyrning ska räknas som "risk som inte föll ut" i stället för falsklarm (T-B) | 0,3 · 0,5 · 1,0 °C |
| **Utfallsfönster** | hur länge efter fyrningen utfallet får komma | 60 · 90 · 120 min |

**Varför startbandet finns:** under +1 °C fyrar redan punktregeln; ovanför bandets tak är ytan för
långt från noll för att "risk framöver" ska vara sant inom ett rimligt försprång. Bandet är alltså
det fönster där trenden tillför något — och dess tak är en tröskel som ska falla ur mätning, inte
sättas i förväg.

**Vad som INTE sveps:** riktningen. "Mot noll" är fysik, inte parameter. En yta som faller från +8
till +6 är inte en trend som betyder något; en som faller från +3 mot +1 är det.

---

## 3. Givarvakt — obligatorisk, ärvd

Trenden använder **både** yttemperatur och daggpunkt. Den ärver därför båda givarfelen vi redan
betalat för:

- **Daggpunkten** (#46): alla 53 rimfrostkandidater i första körningen var trasiga givare
  (Ollsta 2346, Storvik 2135, Bolhyttan 1713 — yta − dagg −28…−49 °C). Vakt: RH ≥ 90 % som
  korsgivare **och** yta − dagg ≥ −5 °C.
- **Yttemperaturen** (#75): Storvik −10,7 °C i september. Vakt: WX_SANE — färsk ≤ 3 h **och**
  yta ≥ luft − 12 °C.

**Plus ett fel som är trendens eget:** en lutning räknad över en rad som saknas, eller över ett
givarhopp, är brus. Vakt: fönstret måste innehålla ≥ 3 mätningar, och en enskild ändring > 3 °C
mellan två minutrader diskvalificerar fönstret (det är ett givarhopp, inte en trend).

En station som faller på någon av vakterna ger **inget** trendutfall — inte "okänt", inte "kanske".
Tystnad.

---

## 4. Grindarna

Tre grindar, samma form som TROSKLAR-SKUGGAN och -VATTENPLANING.

### T-A — Har trenden signal? (mätbar när frosten kommer)

Frågan: skiljer sig lutningsprofilen på nätter som slutar i frost från nätter som inte gör det?

Metod: leave-one-out mot arkivet — för varje natt där någon station nådde ≤ 1 °C, räkna lutning +
daggpunktsgap i timmen före; jämför med nätter där ytan stannade över +1. Svep §2:s parametrar och
läs av **vilken kombination som skiljer bäst**. Den kombinationen blir tröskeln.

Krav: skillnaden ska finnas i **båda halvorna** av mätperioden (samma tidsdelningskrav som
Öppningsmomentum i TradingOS — ett fynd som bara finns i ena halvan är en period, inte en regel).

Domspärr: < 30 frostnätter eller < 20 stationer ⇒ ingen dom, bara en tabell.

**Fysikkontrollen (den som fällde #46:s första körning):** träffarna ska toppa kl 03–07 och vara
vanligast klara nätter. Toppar de platt över dygnet är villkoret brus, oavsett hur bra siffrorna
ser ut.

**BEROENDE SOM SAKNADES I DOKUMENTET, infört 2026-09-12 efter T-A:s första körning (DECISIONS #113):
klarhetsdelen av fysikkontrollen kräver MOLNMÄNGD, som inte finns i vårt arkiv.** Kontrollen har
alltså två halvor med olika status: timfördelningen går att köra i dag, klarheten gör det inte.

Molnet hämtas ur **SMHI metobs parameter 16 (total molnmängd, timvärde)** — och det är billigare än
kort #95 antog: perioden `latest-months` sträcker sig **130 dygn bakåt** (mätt 12/9), med
`corrected-archive` därutöver. **Molnet kan alltså hämtas i EFTERHAND när T-A körs och behöver inte
arkiveras.** Ingen ny tabell, ingen lagringskostnad, ingen drift — samma hämtning vid körning som
`scripts/smhi-prov.ts` redan gör för lufttemperaturen.

**Begränsningen som ska mätas innan kontrollen litas på:** bara **108 av 459 SMHI-stationer**
rapporterar total molnmängd. Hur långt från närmaste molnstation en VViS-station ligger avgör om
klarhetsdelen går att köra alls, och för hur stor del av landet. Den mätningen är kort #95:s
täckningstabell och hör hemma där.

**Tills täckningen är mätt fälls ingen dom på klarhetsdelen** — timfördelningen ensam räcker inte.
En trend som toppar 03–07 men inte oftare klara nätter kan vara advektion i stället för utstrålning,
och det är en annan fysik med en annan regel.

**Och en andra gräns som första körningen visade:** gallringen (#83, DECISIONS #97) tunnar allt äldre
än sju dygn till en rad per halvtimme. Då faller **15-minutersfönstret i §2 bort helt**, och
30-minutersfönstret faller på §3:s egen vakt (≥ 3 mätningar i fönstret). Svepets tre fönster är i
praktiken **två** för varje läsning som sker senare än en vecka efter frostnätterna. T-A ska därför
köras inom sju dygn efter att frostlarmet gått.

### T-B — Skuggdriften (B3 + tystnadsfelet)

Skuggkolumnen loggar varje minut vad trenden **skulle** ha sagt. Facit läggs ovanpå i efterhand.
Måtten redovisas som ett par — nytta och pris — och **korsningskurvan är den verkliga domen**;
procenttalen nedan är bara golv och tak som hindrar att röst byggs på brus.

**Nyttan, i två delar som inte får slås ihop:**

- **B3** (kort #88:s ursprungliga mått): av alla facit-halttillfällen inom räckvidd, andelen där
  punktregeln var **tyst eller > 30 min senare** än trenden. Redovisas delat:
  - *Tidsvinst* — punktregeln kom, men sent. Komfort och förtroende.
  - *Nettonytt* — punktregeln kom aldrig. Den del som räddar någon.

  Trenden får inte klara T-B enbart på tidsvinst. Nettonya svansen har därför ett **eget golv**
  (nedan), så att en trend som bara är tidigare på tillfällen punktregeln ändå fångar inte går
  vidare.

- **Tystnadsfelet** (TROSKLAR-TYSTNADSFEL): av tillfällena där trenden teg — hur många var
  oursäktliga (signal fanns) mot ursäktliga (ingen signal)?

**Priset, definierat asymmetriskt** (samma princip som V-A:s facittabell, där "regn utan olycka"
*inte* är falsklarm). Trenden säger *risk*, inte *är*. En risk som inte faller ut är inte
automatiskt fel — molnen kan ha rullat in efter att varningen gavs. Därför delas trendfyrningar som
inte ledde till ≤ 1 °C i två kolumner:

- **Risk som inte föll ut** — ytan kom inom **0,5 °C** av tröskeln inom **90 min** efter fyrningen.
  Risken var verklig; utfallet uteblev. Räknas **inte** som falsklarm.
- **Falsklarm** — ytan kom aldrig inom 0,5 °C av tröskeln inom 90 min. Trenden såg något som inte
  fanns.

Nära-miss-bandet (0,5 °C) och fönstret (90 min) är själva parametrar och sveps i T-A tillsammans
med §2. Utan den här delningen straffar falsklarmsmåttet trenden för att vädret ändrade sig, och
25 %-taket mäter något annat än det ni tror.

Båda kolumnerna räknas **per kandidattröskel**, så att korsningskurvan — räddade missar (B3
nettonytt + tidsvinst) mot tillkomna falsklarm — kan ritas över hela svepet. Där marginalen korsar
sitter tröskeln.

**Sanity-golv och tak** (inte domen — den är kurvan):

| Mått | Golv/tak | Varför just detta |
| :-- | :-- | :-- |
| B3 totalt | ≥ 20 % | under detta är trenden inte värd en röst oavsett kurva; ligger under egen uppskattning 25–45 % med flit — ska fälla brus, inte svaghet |
| B3 nettonytt | ≥ 5 % | hindrar att trenden går vidare på ren tidsvinst |
| Falsklarm (asymmetriskt) | ≤ 25 % av trendfyrningar | lösare än V-B:s 20 % eftersom trenden säger *risk*, inte *är*; mitt emellan tystnadsregeln och "hellre larma vid 50 %" |

Talen är gissade i den meningen att de inte fallit ur mätning — det är ett medvetet undantag från
§2:s princip, eftersom de är golv mot brus och inte trösklar i regeln. Fastställda av Bengt 10/9
(Bengt äger mätningen); kan flyttas fram till första skuggkörningen med en rad i
DECISIONS, sedan gäller §8.

### T-C — Domens giltighet

Minst 40 facit-halttillfällen inom räckvidd, minst 15 frostnätter, minst 3 län, och underlaget får
inte domineras av en enda station (max 25 % från samma). Binomialbrus per andel redovisas. Under
detta: ingen dom, kortet står öppet.

---

## 5. Kommunikation och interaktion

- Trenden är en **punktkälla** ⇒ säger bara *"risk framöver"*, aldrig *"på vägen"*, aldrig avstånd.
  Segmentröst kräver stråket (#38b) och är en annan dom.
- **Halkan vinner.** Om ett segment redan har slippery_segment tiger trenden — samma regel som
  halka × vattenplaning (DECISIONS #68).
- **Ingen upprepning.** En trendvarning talar en gång per station och avkylningsförlopp; den tiger
  tills ytan vänt uppåt och fallit igen. Annars talar den var trettionde minut hela natten.
- **Tystnadsriktningen** (stigande) släcker bara frysrisk som trenden eller punktregeln själv tänt.
  Den rör aldrig halkvarningar från väglaget.
- **Märkning:** MODELLERAT i TROSKLAR-SKUGGAN:s trenivåmärkning. Det är en observerad trend men en
  slutsats om framtiden.

---

## 6. Facit — vad kortet beror på

T-A kan köras ur arkivet ensamt (frost mot icke-frost vid stationen). T-B och T-C kräver **facit om
verklig halka**.

**AVGJORT 2026-09-11 av Bengt (DECISIONS #94): T-B väntar INTE på försäkringsbolagen.** Samarbetet är
klarlagt otillgängligt, och kortet #94 bär det inte längre som facitkälla. T-B döms i stället mot den
facitstack vi **redan skriver varje dygn**, samma som TROSKLAR-TYSTNADSFEL §8 och mars-domen:

- **road_condition_history** — väglagets omklassningar till halka/is är facit på att det var halt.
- **Kamerafacit (#20)** — väglagskamerabilder vid varning och i gryningen. 738 av 744 kameror står vid
  en VViS-station (#55), alltså **per konstruktion inom räckvidd**, vilket är precis T-B:s
  räckviddsvillkor. Det är den bärande källan.
- **situation_archive (#33)** — olyckor och stoppade fordon med position och tid.

Konsekvensen är en tidplan, inte bara en källa: facitstacken flödar kontinuerligt från första frosten,
så **T-B kan börja räknas i höst i stället för i mars**. Mars-domen är därmed inte T-B:s förutsättning
utan dess fördjupning — en hel vinters bekräftade halttillfällen läggs ovanpå när den finns.

Kortet är alltså **inte längre** en beställning på #94. Den tidigare formuleringen här ("delvis en
beställning på #94, och ett argument till för att ta försäkringsbolagen först") föll med beslutet.

*Historik: fram till 11/9 stod här att T-B hade "samma beroende som TROSKLAR-TYSTNADSFEL", alltså #94.
Det var fel redan när det skrevs — tystnadsfelets §8 skrevs om 10/9 kl 21:09, två timmar före det här
dokumentet, och hade redan tagit bort beroendet (DECISIONS #93). Bengts beslut 11/9 stänger frågan för
båda dokumenten.*

**Datavarning att skriva in i domen:** minutupplösningen började 9/9. Allt äldre är GitHub-ingestens
30-minutersrader, som inte duger till 15/30-minutersfönster. T-A:s underlag börjar alltså vid
höstens första frost, inte i arkivets början.

---

## 7. Ordning — vad görs när

| Steg | När | Grind |
| :-- | :-- | :-- |
| Tröskeldokumentet (detta) | ✅ fastställt 10/9 | Bengt (äger mätningen) |
| Skuggkolumnen byggs | efter radardomen 14/9 | kort #81:s ordning |
| T-A körs | höstens första frostnätter (okt–nov) | ≥ 30 nätter, fysikkontrollen |
| T-B skuggar | **från första frosten**, hela vintern | facit ur egen stack (§6): kamerafacit #20, road_condition_history, situation_archive #33 |
| T-C dömer | mars | underlagskraven |
| Röst | bara efter T-C **och** Axels ja | rösttext, plats i A-skalan, PRODUKTBOK |

**Kostnad:** 0 kr/mån. En kolumn i skuggloggen (~1,4 kB/dygn), en fönsterfråga mot primärnyckeln i
Supabase (gratisnivån). Inga Actions-minuter i drift; T-A som måndagsknapp ≈ 1 min/vecka.

**Vad som byggs efter 14/9, i ordning:** (1) givarvakten (§3) som filter i frågan, (2) lutning +
gap + band som tre kolumner i skuggloggen, (3) T-A som knapp med svepet, (4) B3/tystnadsfelet som
veckorapport. Varje steg med eget bevis innan nästa.

### Vad som sparas och vad som räknas om — principen bakom byggformen

**SPARA DET SOM INTE GÅR ATT RÄKNA OM. RÄKNA OM DET SOM GÅR.** Och — det avgörande — **vilket som
är vilket är en MÄTNING, inte en smaksak**: frågan är om gallringen (#83, sql/014) förstör den
upplösning måttet behöver.

**Den stigande halvan sparas sedan 25/9** (kort #257, DECISIONS #368): `berakna_trendkandidater()` skriver stigande kandidater —
samma vakter, band och fönster, lutning ≤ −0,4 i något fönster, samma utfall 90 min efter — i en egen tabell, `trend_stigande`.
Förut sparades bara den fallande, och gallringen gjorde stigningen omöjlig att räkna fram i efterhand, så tystnadsriktningen i T-B
hade inte kunnat dömas. Egen tabell därför att snapshotkärnan läser `trend_kandidater`.

Gallringen behåller sista raden per station och 30-minutershink för allt äldre än sju dygn.

| Mått | Ingång | Upplösning måttet kräver | Överlever gallringen? | ⇒ byggform |
| :-- | :-- | :-- | :-- | :-- |
| **#88 trenden** | yttemperatur per minut | 15 min, ≥ 3 mätningar | **nej** | härledda storheter sparas (`trend_kandidater`) |
| **#89 skattaren** | regn per timme | 1 timme | **ja** | räknas om vid behov, inget sparas |
| **#98 tystnadsfelet** | facit + skuggloggen + fyra signaler | händelse | **ja** (append-only tabeller) | räknas om vid behov, inget sparas |

Att de tre byggena ser olika ut är alltså inte slarv. Den som sparar gör det för att ingången
förstörs; de som räknar om gör det för att ingången finns kvar. **Båda sparar dessutom bara MÄTTA
STORHETER, aldrig domar** — en sparad dom hade låst tröskeln innan grinden valt den.

⚠️ **SNUBBELTRÅDEN (kort #155):** principen vilar på att kvarhållningen inte skärps. Gallringens
eget huvud säger att gratisnivån räcker ~55 dygn in i vintern, och steg 2 (export eller Pro) är ett
öppet oktoberbeslut. Skärps kvarhållningen — eller börjar `radar_precip` gallras, vilket inget gör i
dag — **upphör ingången att vara återskapbar, och då måste måttet byta form.**

---

## 8. Ändring

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

Fram till första skuggkörningen får §2:s svep och §4:s krav justeras av vem som helst av oss med en
rad i DECISIONS. **Från första skuggkörningen ändras ingen tröskel alls** — varje motivering som inte lutar sig mot utfallet — att flytta målstolparna när siffrorna kommit är precis
vad regeln finns för att hindra.

---

*Källor: TAVLA.md #88, #46, #75, #81, #94, #38b; docs/TROSKLAR-SKUGGAN.md;
docs/TROSKLAR-VATTENPLANING.md; docs/TROSKLAR-TYSTNADSFEL.md (B3-syskon, kort #98 — fastställt och
incheckat 2026-09-11, DECISIONS #93); Drive: "Framtida utvecklingsmöjligheter — systemanalys
varningssystemen 2026-09-10 v3" §2.1.*
