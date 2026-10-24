# Förregistrering — kandidaten NIVÅ 2+BLANDNING, vintern 2026/27

**Status: UTKAST 15/10 2026, §4b tillagt 21/10, §12 (bytet) tillagt 24/10 (#703), §4b punkt 12–17 (domens mått) tillagt 24–25/10 (#710). Kvar före signeringen: radarns tal 26/10 (§10 a). §4b fastställt 21/10 (#655, #656); omgång 1 avgjord 21/10
(#659: populationen i §4, förarsvaren i §4b punkt 4, kameran i punkt 5, Bengt signerar för båda); loggen sql/065 i drift sedan 21/10 (§10 e). Spridningen loggas i drift sedan 16/10 (§10 b).** Signeras av Bengt och Axel senast
**31/10 2026** (DECISIONS #544, #547). Domfönstret börjar den dag förregistreringen är signerad och pushad; varje dygn utan signatur är
ett dygn vinter utanför domen. Källorna är DECISIONS #544, #547, #552, #558–#573 och TROSKLAR-SKUGGAN §2–§4. Utkastet i #560 ersätts
av det här dokumentet; frågorna (A) och (B) där är besvarade av #562.

## 1. Vad som döms — kandidatens identitet

Den frysta kandidaten ur #552, ingenting annat (`kuvos/kandidat-2026-27.json`; väg B i körning 38368369876, modellen byggd i
38400052837, #550):
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
  #573). Sedan sql/065 bär `kandidat_skugga` också punkterna som inte är torra, med utfall, ankaravstånd, ankare, spridning och värde
  (§4b). Körningsloggen `kandidat_skugga_korning` säger för varje timme om regeln räknade eller teg; den raderas aldrig.

## 3. Regeln som utlöser varningen (#562, #565, #566, #568, #573)

`kandidat_regel()` (sql/058, med spridningsgrinden; sql/057 till 16/10), med talen på ett ställe:

| Villkor | Tal |
| :-- | :-- |
| Yta | kandidatens värde ≤ **0 °C** |
| Fukt | väglagets *Våt* på punktens sträcka (`condition_info`, exakt — *fläckvis Våt* räknas inte, #573), **eller** radarn `rate_mean_mmh` ≥ **R** mm/h över sträckan de senaste 60 minuterna |
| Veto | ingen station inom **15 km** mätte yta över **+2 °C** de senaste 45 minuterna, med ankarnas vakter (#75, karantänen, den långsamma vakten) |
| Färskhet | kandidatens timme högst **två timmar** gammal och med minst **95 %** av vägpunkterna, annars tiger regeln |
| Spridning | där minst två av RÅ:s ankare bidrar tiger kandidaten när deras spridning är **2,25 °C** eller mer; med färre ankare grindar spridningen inte (#547, #563, #575) |
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

**Populationen (Bengt 21/10, #659):** A1 räknas i beslutsbandet −5…+5 °C, A2 och A3 över alla stationstimmar med mätt yta ≤ +5 °C, som `publish/grind-a.ts`. Den är oförändrad för vintern 2026/27; en ändrad population kan bara gälla 2027/28, med en daterad post i TROSKLAR-SKUGGAN §3 före den vinterns data. Läsningen 14/10 (#554) gav nästan samma A2 i bandet som över alla rader (OFFSET 4,0 mot 4,1 %, RÅ 8,3 mot 8,4 %).

**Grind A är en övre gräns** för kvaliteten mellan stationerna (#562 punkt 4): `modell.pkl` är tränad på samma 754 stationer, så grind A
prövar *samma stationer, nytt år*. En kontroll med regionmodeller körs i mars och redovisas bredvid, inte som grind.

**Täckt sträcka** är en sträcka och timme där körningsloggen säger *räknad*. Timmar där regeln teg för att kandidaten var gammal eller
ofullständig räknas som *okänt* — inte täckta — och deras andel redovisas för sig (§10 d).

## 4b. Läsningen — hur domen räknas

*Skrivet 21/10 (Claude, Bengts beslut ur underlaget för paket A, DECISIONS #655). Punkterna 5, 6, 7, 10 och 11 fastställda samma dag av Bengt och Axel (*"Axel och jag säger ja till rekommendationer 5,6,7,10 och 11"*, DECISIONS #656); övriga punkter signeras med texten. Punkt 4 och 5 kompletterade 21/10 (Bengt, DECISIONS #659).* Avsnittet fryses med §4 (§8). Skriptet som räknar enligt det byggs efter signeringen,
provas bara på låtsasdata och på kuvösens redan kända tal, och fryses med sin sha256 i en daterad post med båda signaturerna innan
det första gången läser data ur domfönstret.

**1. Varningen.** En skuggvarning är en sträcka och timme i `kandidat_skugga` där regeln varnar vid X = 2,25 °C (§4): minst en punkt
med utfallet *varnar*. Varningens tid är `skriven_at`, då den fanns i domloggen — inte kandidatens timme, som ligger upp till tre
timmar tidigare. *Skäl:* en varning får inte räknas före den fanns; den senare tiden kan bara göra B2 strängare. Påföljande timmar på
samma sträcka är var sin varning, som §4 säger; antalet *episoder* (sammanhängande timmar på samma sträcka) redovisas bredvid C2.

**2. Bandet.** En varning hör till bandet för den varnande punkt som ligger **längst** från sitt ankare (`fukt_ank_km`, sql/065):
0–7, 7–15, 15–20 eller över 20 km; en punkt utan ankare inom 50 km hör till *över 20 km*. *Skäl:* domslut (b) låter kandidaten tala
där *maxavståndet* till ankare ligger i ett godkänt band (TROSKLAR-SKUGGAN §4). Vid stationerna (grind A) är bandet stationens
`ank_km` i `kandidat_station`; stationen är aldrig sitt eget ankare.

**3. Domen per band (ersätter val (d) på kort #270).** Domslut (b) prövas per band med **samma krav, räknade inom bandet**: A1–A3,
marginalvakten och underlagsspärren (≥ 500 bedömbara punkter över ≥ 20 stationer) för grind A; B1–B3 på varningarna och
facithändelserna i bandet; C1–C2 inom bandet. Ett band under spärren är *obedömt*, aldrig godkänt. Banden prövas inifrån: 0–7 km
först, 7–15 km bara om också 0–7 km klarar. Ingen egen spärr och inget sänkt krav — en sänkt spärr för ett band vore en lättnad
(regel L3), eftersom kuvösens tal per band redan är sedda. *Skäl:* §7 väntar sig att A2 inte klaras nationellt; utan regeln måste
"klaras i banden" tolkas i mars, efter att utfallet syns. Hela nätet har 103 av 761 stationer med närmaste granne inom 7 km, så
spärren kan nås (räknat 21/10 på `data/vagdata/stationer.json`).

**4. Facit och matchningen** som TROSKLAR-SKUGGAN §2: en facithändelse matchas till en sträcka inom 2 km från sträckans linje, och
*station på segmentet* (falsklarmet) är en VViS-station inom 2 km från sträckans linje. Falsklarm är det när en sådan station mätte
yta över +2 °C någon gång inom ±45 minuter från varningens tid, med grind A:s vakter (#75, karantänen, den långsamma vakten). Vid
grind A jämförs kandidatens värde för timmen med stationens senaste mätning i halvtimmen som börjar vid timmen, som grind A gör för RÅ
(`publish/grind-a.ts`, 30-minutersbuckets). **Förarnas svar i appen** (*Stämde* eller *Stämde inte*) på kandidatens varningar är inte §2:s testarlogg: de bär varken förare eller ett uttryckligt *torr/bar väg*. De redovisas bredvid med antalet svar och varken fäller eller bekräftar (Bengt 21/10, #659).

**5. Väglaget är både indata och facit.** §2 kallar Trafikverkets väglag oberoende av segmentmotorns indata; för kandidaten gäller det
inte, eftersom *Våt* är ett av regelns fuktvillkor. B räknas som §2 föreskriver, och **redovisas också utan väglaget som facit**
(stationer, kamera, situation_archive, SMHI, testare), med skillnaden utskriven. Raden utan väglaget är **bara redovisning**; domen
fälls som §2 föreskriver (Bengt och Axel 21/10, #656). *Skäl:* att döma utan väglaget sänker antalet facithändelser och kan göra C1
ouppnåelig. Kamerabilderna väljs vid kalla stationer och vid skuggans larm, aldrig vid kandidatens varningar, och kamerorna står vid stationerna (738 av 744); kamerakolumnen redovisas därför per band med antalet bilder och når i praktiken bara bandet närmast ankarna. Urvalet ändras inte för kandidaten: en källa som bara får bekräfta, riktad dit kandidaten varnade, vore en lättnad i praktiken (Bengt 21/10, #659).

**6. B1 och vetot (B1-fällan).** Regelns veto tystar varje punkt där en station inom 15 km mätt över +2 °C de senaste 45 minuterna, och
just de punkterna är de som B1 kunde fälla. B1 blir därför nära noll av konstruktion. Det skrivs ut i domen. Bredvid redovisas
**B1 utan vetot**: på de vetade punkter som var fuktiga (sql/065: `fukt_utfall` = *veto* på en sträcka med Våt eller radar över R)
räknas hur många som hade varit falsklarm. Raden fäller inte domen. (Fastställt 21/10, #656.)

**7. B3, mervärdet.** Punktmotorns larm loggas bara längs skuggrutterna (`shadow_log`). B3 räknas på de träffar som ligger på
skuggrutternas sträckor, och antalet sådana träffar skrivs ut; under C-spärren är B3 OAVGJORT. Punktmotorns frysrisk räknas inte om
för hela landet (Bengt och Axel 21/10, #656). *Skäl:* det vore en ny beräkning som själv måste provas och förregistreras.

**8. Grind A och spridningsgrinden.** A räknas på alla stationstimmar, som för RÅ: spridningsgrinden grindar tal, inte temperatur.
Talen redovisas också utan de stationstimmar där grinden hade tystat (minst två ankare och spridning ≥ 2,25 °C).

**9. C3.** Backtest och drift jämförs i A-måtten: kuvösens tal vid +6 h (#552; 5,12 % grova fel) mot driftens A vid stationerna.
*Skäl:* del A lämnar PH för R+6…R+11, så PB i drift vilar på en prognos som är sex till elva timmar gammal.

**10. När kandidaten inte kan dömas (reserven, §6).** Bara om loggen saknas, aldrig för att utfallet är dåligt: om mindre än hälften av
domfönstrets timmar är *räknad* i körningsloggen, eller om hinkens dygnsfiler för `kandidat_station` eller `kandidat_skugga` saknas
för mer än 30 av domfönstrets dygn. Ett otillräckligt underlag (C) ger fortsatt skugga, inte reserven. Gränserna
hälften och 30 dygn är fastställda 21/10 av Bengt och Axel (#656) och ändras inte efter att loggen setts.

**11. Frysflaggan (bedömningen §4.2, #650; fastställd 21/10, #656).** Kandidatens frysflagga med 1 °C marginal (*fryser* när kandidatens värde
är ≤ +1 °C) döms i mars mot K-A:s krav (rätt klass ≥ 95 %, farliga fel ≤ 1 %, täckning ≥ 70 %, underlag K-A4) och mot K-B1 (≥ 5 % av
de bekräftade halktillfällena där klassningen var rätt och punktmotorn tyst eller mer än 30 min senare), på grind A:s population
(`kandidat_station`, utan stationen själv) och i samma domfönster; RÅ och offsetmodellen redovisas bredvid som kontroll. K-C1 gäller.
**Flaggan mäter klassen, inte rösten:** dess tröskel (≤ +1 °C) är inte regelns i §3 (≤ 0 °C och fukt), och domen säger ingenting om
när kandidaten talar.

*Punkt 12–16 inskrivna 24/10 och punkt 17 25/10, före signeringen (Bengt: *"ok för utkastet och posten med regel Ls formkrav"*; 25/10
*"Ja, skriv in båda"*, DECISIONS #710). Punkt 13, 14 och 16 är lättnader enligt regel L, med formkraven i #710; punkt 12 och 17 är
skärpningar och punkt 15 en redovisning.*

**12. Den ärliga osäkerheten.** Marginalvakten (`publish/marginal.ts`) räknar felet som om stationstimmarna vore oberoende, och vakten
säger själv att det är en undre gräns. På 2022/23 var det ärliga intervallet för den låstas A2 3,79–5,28 %, mot marginalvaktens
4,50–4,54 % (#708). Därför prövas varje A-mått också mot ett intervall som tar hänsyn till att timmarna hänger ihop:
- **Metoden** är omdragning av hela stationer och hela UTC-dygn, som schemat SD i `fysik/vintrar/osakerhet.py` (#707, #708). B = 2000,
  och fröet skrivs i domskriptet innan något läses.
- **Läsningen är ensidig**, eftersom frågan är om måttet ligger *under* taket. Den övre gränsen är 95 %-percentilen av omdragningarna.
- **KLARAR** bara om både marginalvaktens intervall och omdragningens övre gräns ligger under tröskeln. **OAVGJORT** om punkttalet
  ligger under men omdragningens övre gräns över; grinden öppnar då inte. **FALLER** som förut.
- **På förarnas mått** (punkt 13) räknar marginalvakten standardfelet för det vägda medlet, med punkterna som oberoende och samma
  vikter, alltså med det effektiva antalet punkter (Σv)² / Σv². Den är fortfarande en undre gräns.
- **Omfånget** är A1, A2 och A3, nationellt och i varje band som prövas (punkt 3), på det mått som avgör (punkt 14).
- **Den kan aldrig öppna en stängd grind.** Den kan bara göra ett KLARAR till ett OAVGJORT.

*Skäl:* ett KLARAR som bara ligger utanför den undre gränsen för osäkerheten är inget bevis. Det här är en skärpning, skriven före
signeringen.

**13. Förarnas mått.** Domen väger varje stationstimme lika. Förarna kör där trafiken går: 68,1 % av fordonskilometerna ligger inom
7 km från en station och 3,6 % bortom 15 km (#490). Därför räknas grind A också **vägd med trafiken**:
- **Vikten** för en station är summan av ÅDT × 2 km för de väglagspunkter som ligger närmast den stationen, bland grind A:s stationer.
  Väglagspunkterna kommer ur `data/vagdata/vaglagspunkter.json`: 12 960 punkter, NVDB via Trafikverket, läst 7/10 2026, sha256
  `2cb7f738ede8a8f865ecdebae31e9c8bacc3b8242da1732c16c99882fd13db67`. Vikterna ligger i repot före signeringen:
  `kuvos/forarnas-vikter-2026-27.json`, sha256 `2817ccda146a88c22bdd0eef4fb012df34e108b56891b327472aa6818155b994`, byggda och
  provade i ci med `fysik/vintrar/forarnas_vikter.py` (#709). 705 av de 754 stationerna har vikt; 49 ligger inte närmast någon
  väglagspunkt och väger 0.
- **En station utan mätningar** i domens population tas bort, och dess punkter går till närmaste station som finns kvar, med samma
  funktion (`vikter()`, #709).
- **Måttet:** varje punkt vid stationen *s* väger *w_s / n_s*, där *n_s* är stationens antal punkter i populationen eller bandet.
  Förarnas A1, A2 och A3 är de vägda medlen. Populationen, vakterna, banden och trösklarna är oförändrade (§4, A1 ≤ 1,0 °C, A2 ≤ 5 %,
  A3 ≤ 10 %).
- **Det ärliga intervallet** (punkt 12) räknas på det vägda måttet, med samma omdragning.

**14. Vilket mått som avgör.** Grind A avgörs på **förarnas mått** (punkt 13) med den ärliga osäkerheten (punkt 12), nationellt och per
band (punkt 3). Det tidigare måttet, där varje stationstimme väger lika, **redovisas bredvid** i varje tabell med båda intervallen.
Det gör talen jämförbara med kuvösen, #680 och vintrarna före, men **avgör ingenting**. Grind B och C, kontrollen med regionmodeller
(§4) och frysflaggan (punkt 11) är oförändrade.

*Skäl:* ett enda mått avgör, och det väljs nu. Annars finns det i mars flera mått att välja det bästa bland.

**15. Det förarna fick.** Domen prövar den låsta (§1, §12 c) och den nya bredvid (§12 e). Det förarna faktiskt hörde är, timme för
timme, utfallet från den kandidat som **talade** den timmen. Det redovisas för sig:
- **Vem som talade** är den låsta före bytets tidpunkt (§12 b). Efter bytet är det den nya, utom de timmar då den låsta talade enligt
  §12 f. Bytet i koden loggar vem som talade varje timme, och den loggen raderas aldrig.
- **Måtten** är förarnas mått och stationstimmarna med båda intervallen, för grind A, och grind B på varningarna.
- **Det avgör ingenting.** Det blandar två kandidater och kan inte döma någon av dem. Byts inget är det lika med den låstas dom.

*Skäl:* det är det enda talet som svarar på hur bra det var som nådde förarna.

**16. Följden av OAVGJORT.** I dag öppnar grinden bara på KLARAR. Ett OAVGJORT leder därför till domslut (c), *"skuggan skrotas eller
får en vinter till i tystnad"* (TROSKLAR-SKUGGAN §4), precis som ett FALLER. För kandidaten, som talar som betavarning sedan oktober
(TROSKLAR-SKUGGAN §4 d), gäller i stället:
- **Om grind A blir OAVGJORT** mot taket (punkt 12–14) men kandidaten är **tydligt bättre än RÅ**, fortsätter den att tala som nu
  (TROSKLAR-SKUGGAN §4 d, märkt BETA och *modellerat*) **en vinter till**, alltså 2027/28.
- **Tydligt bättre än RÅ** betyder att den övre 95 %-gränsen, ensidigt med omdragning av stationer och dygn som i punkt 12, för både
  ΔA2 och ΔA3 ligger under 0. Δ är kandidaten minus RÅ, på förarnas mått och på samma punkter. ΔA1 redovisas.
- **Omfånget** är nationellt. Banden redovisas.
- **Gäller en gång.** Vintern 2027/28 får en egen förregistrering (§12 g). Ett nytt OAVGJORT då ger inte automatiskt ännu en vinter.
- **Oförändrat:** FALLER mot taket, eller ett OAVGJORT som *inte* är tydligt bättre än RÅ, ger domslut (c) som förut. Ett KLARAR ger
  (a) eller (b) som förut.
- **Den nya kandidaten:** punkten gäller den låstas dom. Den nyas dom bredvid (§12 e) läses på samma sätt och är underlag för valet i
  §12 g.

*Skäl:* ett OAVGJORT betyder *"vi vet inte säkert än"*, inte *"den är dålig"*. Förarnas alternativ är stationerna ensamma (RÅ). En
kandidat som säkert slår RÅ, men ännu inte säkert ligger under taket, ska inte tystna. Den ska få en vinter till med samma märkning och
samma mätning.

**17. Säkerhetsläsningen.** Kandidaten talar till förarna hela vintern, men domen fälls först i mars. Därför prövas den 1/12, 1/1 och
1/2 om den **säkert är sämre än stationerna ensamma** (RÅ):
- **Måttet** är ΔA2, kandidaten minus RÅ, på förarnas mått (punkt 13) och på samma punkter, för domfönstret från signeringen till och
  med UTC-dygnet före läsningen. Intervallet räknas med omdragning av stationer och dygn som i punkt 12, ensidigt 95 %.
- **Stopp** om den *undre* 95 %-gränsen för ΔA2 ligger över 0. Då stängs kandidatens betavarning av med nyckeln (TROSKLAR-SKUGGAN
  §4 d) samma dag. Den talar sedan bara om Bengt och Axel beslutar det i en daterad DECISIONS-post.
- **Vilken kandidat:** den låsta, och efter bytet (§12 b) också den nya, var och en på sin egen logg. Stoppas den nya talar den låsta
  bara om den inte själv stoppades vid samma läsning.
- **Bara *stopp* eller *inget stopp*** rapporteras. Talen, intervallen och underlaget visas inte före domen i mars. Claude kör
  läsningen och rapporterar svaret till Bengt.
- **Domen påverkas inte.** Den fälls i mars på hela fönstret som förut (L1). Ingen lättnad får efter en säkerhetsläsning gälla de dygn
  den har läst (L2).
- **Skriptet** är domskriptets räkning av ΔA2. Det fryses enligt inledningen till §4b före 1/12. Är det inte fryst den 1/12 görs
  läsningen den dag det fryses, och förseningen redovisas.
- **Den kan bara tysta**, aldrig öppna en grind eller lätta ett krav. Den är inte vinterläsningen av spridningsgrinden i KALENDERN
  (#478).

*Skäl:* förarna hör kandidaten nu. Är den säkert sämre än stationerna ensamma ska det inte vänta till mars. Måttstocken är RÅ av samma
skäl som i punkt 16: förarnas alternativ är stationerna. En skärpning, skriven före signeringen.

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

*Tillagt 24–25/10 (#710), för §4b punkt 12–17:*
- **Förarnas mått väntas ge lägre A2 än stationstimmarna.** På 2022/23, räknat efteråt med bandens trafikandelar i stället för
  stationsvikterna, gav den låsta ungefär 4,3 % mot 4,52 %, och den nya ungefär 3,7 % mot 4,33 %.
- **Det ärliga intervallet väntas bli brett**, ungefär ± 0,8–1,0 procentenheter nationellt. Det är bredare än för stationstimmarna
  (± 0,75 på 2022/23), eftersom de stora stationerna väger tyngre.
- **Domen väntas därför bli OAVGJORT nationellt** om A2 hamnar mellan cirka 4 och 5 %. Det är ett giltigt utfall och inget misslyckande.
- **I banden** väntas 7–15 km klara A2 (2,8 % och 2,22–3,41 % på 2022/23). 0–7 km har få stationer (81) och väntas bli OAVGJORT, och
  bandet över 20 km väntas falla. Banden prövas inifrån (punkt 3). Blir 0–7 km OAVGJORT prövas alltså inte 7–15 km, och det står kvar
  (regel L3).
- **Norr väntas falla A2 och söder klara den**, men domen delar inte på norr och söder.
- **Kandidaten väntas vara tydligt bättre än RÅ** (punkt 16). På 2022/23 var skillnaden ungefär 4,1 procentenheter i A2 (4,52 mot
  8,66 %), mycket större än osäkerheten i en skillnad (± 0,2 procentenheter mellan två kandidater, #707). Väntat utfall om A blir
  OAVGJORT: kandidaten talar vidare en vinter till.
- **Säkerhetsläsningen väntas inte stoppa** (punkt 17). På 2022/23 var kandidaten ungefär 4,1 procentenheter bättre än RÅ i A2.

## 8. Fryst vid signeringen

Identiteten (§1), regeln med talen (§3), måtten och populationen (§4), läsningen (§4b, med punkt 12–17), domfönstret (§5) och villkoren för bytet (§12). Ändras något av det efteråt sker det bara
genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 9. Inte en del av domen

Formen i appen, texten (*"Halkvakt tror: halka framöver."* / *"Halkvakt thinks: slippery ahead."*) och avstängningen (#560 punkt 8,
#562 punkt 5, #573). De rör användaren, inte måttet.

Den nya kandidaten på sex vintrar (#670). Ersättningsregelns V2 föll (#702), så den körs inte i skugga enligt
`docs/FORREGISTRERING-ERSATTNING-2027-28.md`. Den räknas i en egen kedja, talar i appen bara enligt §12, och rör varken regeln,
grindarna eller den här domen över den frysta. Valet inför 2027/28 görs enligt §12 (g), och domen över den frysta fälls som här står.

## 10. Före signeringen

**(a) Radarns tal R.** Läses 26/10 enligt #568: visar alla tre kurvorna en majoritet i bandet 0,1–0,5 på `rate_mean` blir R = 0,1,
annars 0,5. Claude för in talet samma dag. Saknas en kurva står R = 0,5 kvar, och bortfallet redovisas vid signaturerna (Bengt
23/10, #689). Signeringen sker samma dag (#689). Läsningen är `scripts/radarns-tal.ts` (självtest i ci): den läser bandet 0,1–0,5 på `rate_mean_mmh` ur de tre körningarnas loggar och tillämpar regeln. Kurva 1 (38690393504, 8–15/10): 13 026 av 21 012 par, 62,0 %.

**(b) Spridningsgrinden — besvarad 15/10 (DECISIONS #574, #575).** Spridningen grindar där minst två ankare bidrar (#547 och #563
lästa ihop), **samma grind gäller varningen i appen** (Bengts ja; regeln i §3 har villkoret), och loggningen är byggd: del B skriver
antalet ankare och spridningen, och `kandidat_skugga` bär `spridning`, `fukt_glest` och `fukt_spr_min`, så att domen kan räkna
grinden vid X = 1, 2, 2,25 och 4 °C. ✅ Beviset i drift, en timme i domloggen med spridningen ifylld, är bevisat i drift 16/10 (DB-knappen 38899101913): domloggen 15/10 10:00–16/10 08:00 UTC har 23 timmar, varav 12 med spridningsgrinden i spel (36 rader, 183 punkter), `fukt_spr_min` ifylld i 133 rader och 153 punkter med glest fuktbesked; 12 av 26 körningar bar spridningen.

**(c) "845 stationer" — rättat 15/10** (Bengts ja, DECISIONS #575): TROSKLAR-SKUGGAN §3 säger nu *761 stationer (854 mätpunkter,
varav 93 fjärrytor)*. Ingen tröskel ändrades.

**(d) Tysta timmar — besvarad 15/10** (Bengts ja, DECISIONS #575): en tyst timme är *okänt*, inte täckt, och räknas inte som miss;
andelen redovisas. Står i TROSKLAR-SKUGGAN §3.

**(e) Loggen för domen per band — sql/065** (Bengts ja 21/10, DECISIONS #655, åtgärdslistan B4-36). `kandidat_skugga` bär punkterna
och ankaravståndet (§2, §4b punkt 2). Måste vara i drift före signeringen: det som loggas före saknar fälten för alltid. ✅ **I drift:** migrerad 21/10 04:44 UTC med DB-knappen (39545613098, transaktionen bekräftad; alla sex kolumner och den nya loggfunktionen på plats); första timmen 04:50 UTC (DB-knappen *las* 39546397709): timmen 04:00 *räknad*, 85 sträckor, 23 med punkter, 330 punkter = 194 varnande + 133 tystade av spridningen + 3 vetade, 0 rader där listan och räknarna skiljer, ankaravstånd 0–42,3 km.

**(f) Fler vintrar (Bengt 22/10, DECISIONS #666).** VViS har levererat stationsdata för 2018–2024. Den frysta kandidaten prövas på de
fem hela vintrarna 2018/19–2022/23, en i taget, med en egen förregistrering, och körs så fort kedjan är byggd, alltså möjligen
före signeringen. Är utfallet läst före signeringen står det vid signaturerna med datum och körning. Inget i §1–§5 får då ändras
mot godkänt på grund av det (regel L). Utfallet är det första mått som säger något om *samma stationer, nytt år* (§4, §7).
*Tillägg 23/10 (#689):* bara 2022/23 gick att köra, eftersom MET:s arkiv saknar långvågen före 14/3 2022 (#672). Utfallet lästes
22/10 (kuvos-vintrar 39766761188, #680) och ska stå vid signaturerna. Den nya kandidaten på sex vintrar (#670–#672) prövas utanför
den här domen, och dess provning trycks först när ersättningsregeln är signerad (#689).

**(g) Förarnas vikter (§4b punkt 13; Bengt 24/10, DECISIONS #709).** ✅ I repot 24/10, före signeringen:
`kuvos/forarnas-vikter-2026-27.json` (sha256 2817ccda…b994) med indatans kontrollsummor; `fysik/vintrar/forarnas_vikter.py --prova`
i ci kräver att filen är exakt det indatan ger. Räknade bara på indatan; inga mätningar och inga modelltal är lästa.

## 12. Om den nya kandidaten talar i appen

*Inskrivet 24/10, före signeringen (DECISIONS #703). Står före §11 eftersom det är en del av den signerade texten. Ändrar
ersättningsregelns följd när V2 föll, genom tillägget `docs/FORREGISTRERING-ERSATTNING-TILLAGG-2026-10-24.md`, som signeras samtidigt.*

**(a) Villkoret.** Den nya kandidaten (sex vintrar, #670, #702) får tala i appen i stället för den frysta bara när:
- dess egen kedja (ersättningsregeln §4, `fysik/ny_kandidat/levande.py`) har klarat paritetsprovet på 2024/25
  (`kuvos-ny-kandidat` steg=paritet), med n exakt och inom ± 0,01 °C för A1 och ± 0,02 pe för A2; och
- kedjan räknar och loggar i drift i sin egen tabell, med samma färskhetskrav som i §3: högst två timmar gammal och minst 95 % av
  punkterna.

**(b) Beslutet.** Bytet beslutas av Bengt och Axel i en daterad DECISIONS-post med båda signaturerna, innan någon timme av vinterns
utfall för någon av kandidaterna är läst. Posten anger tidpunkten för bytet. Den säger öppet att ersättningsregelns V2 föll (#702),
och att bytet är ett beslut om **vad förarna hör**, inte en ändring av någon dom.

**(c) Den frysta påverkas inte.** Den räknas och loggas oförändrat hela vintern i sin kedja (`kandidat_station`, `kandidat_skugga`).
Domen i §1–§5 fälls över den, på det den kedjan räknade (§2), oavsett vilken kandidat som talar.

**(d) Regeln är densamma för den som talar.** Tal, villkor, grindar, spridningen, vetot, färskheten och märkningen (BETA, *modellerat*)
i §3 gäller oförändrade.

**(e) Den nya döms bredvid, i efterhand.** Samma mått och samma läsning (§4, §4b), på dess egen logg och på de timmar och punkter där
båda har ett värde. Domen redovisas bredvid den frystas och avgör ingenting i den här förregistreringen.

**(f) Tillbaka till den frysta.** Saknas den nyas timme, eller är den för gammal eller ofullständig enligt §3, talar den frysta den
timmen. Andelen sådana timmar redovisas.

**(g) Valet inför 2027/28** görs i en egen förregistrering, skriven och signerad före mars, med båda domarna som underlag.

## 11. Signaturer

*Bengt signerar för Bengt och Axel (Bengts val 21/10, DECISIONS #659; som #564 och #656–#658).*

*Läst före signeringen (§10 f): den frysta kandidaten på vintern 2022/23, 22/10 2026, körning 39766761188 (DECISIONS #680).
NIVÅ 2+BLANDNING på grind A:s population, 4 361 591 punkter vid 718 stationer: A1 0,522 °C, A2 4,52 %, A3 0,30 % (RÅ 0,693 °C,
8,66 %, 0,60 %). Inget i §1–§5 är ändrat på grund av det.*

*Lättnader före signeringen enligt regel L (#564), skrivna efter läsningen ovan: §4b punkt 13, 14 och 16. Det sedda talet, skälet
(L4 a), vilka data (domfönstret, L2) och svaret på L3 står i DECISIONS #710.*

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
