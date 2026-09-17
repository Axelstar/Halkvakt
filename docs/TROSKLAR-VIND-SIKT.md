# TROSKLAR-VIND-SIKT

**Kort:** #90 VIND OCH SIKT (systemanalysen §2.3). **Status:** ✅ **FASTSTÄLLT 2026-09-12 av Bengt**
(DECISIONS #135). Axels ja till själva frågan gavs 12/9 via Bengt; mätningen är Bengts område, så
ingen kontrasignering behövs (#132). Svepet i §2 och kraven i §4 är därmed låsta enligt §8:s regim.
Ingen kod ännu.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · **punktkällor säger
"framöver", aldrig "på vägen"** · tystnad är en funktion · trösklar gissas inte, de faller ur mätning
· trösklarna är daterade FÖRE mätningen och skrivs inte om när talen kommit (§8).

---

## 1. Vad som döms — och en distinktion kortet saknade

`wind_speed_ms`, `wind_gust_ms` och `visibility_m` hämtas varje minut sedan kort #48 (sql/011, 4/9)
men **arkiveras bara när arkivdieten släpper igenom raden** (§4) och har **aldrig använts nedströms**. Kortet formulerade dem som "punktfaror". Överlämningen från #89
(TROSKLAR-OVERGANGAR §6) kallade dem "lager 2 — riskmodifierare". **Båda har rätt, och det är två
olika roller som måste dömas var för sig:**

| Roll | Vad det betyder | Exempel |
| :-- | :-- | :-- |
| **A. Egen fara** | Storheten är farlig i sig, oavsett väglag | Byvind 25 m/s på en bro, torr vägbana, husvagn |
| **B. Modifierare** | Storheten ändrar inte ytan, men gör en ANNAN fara värre | Is + sidvind: samma is, sämre grepp i sidled |

Roll A är en **ny fara** i A-skalan och döms som en sådan — från noll, med eget facit.
Roll B är en **regel om en fara som redan finns** och döms som #68 var tänkt: ett förvillkor eller ett
modifierat försprång, ingen historik, ingen tillståndsskattare.

**Dokumentet dömer rollerna separat.** Faller A men håller B är utfallet "vind är ingen egen fara men
förvärrar halkan" — ett helt giltigt och användbart svar. Faller båda läggs kortet ner.

**Punktspråket är inte förhandlingsbart.** Vind och sikt mäts vid en station. Rösten säger
"framöver", aldrig ett avstånd eller "på vägen framför". Samma regel som frysrisken lyder under.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

| Parameter | Vad den styr | Svep |
| :-- | :-- | :-- |
| **G** byvindtröskel | när byvind är en egen fara (roll A) | 15 · 18 · 21 · 25 m/s |
| **G_tak** rimlighetstak | över detta är byvinden en trasig givare, inte väder (§3.1) | 30 · 40 · 50 m/s |
| **G_mod** byvind som modifierare | när vind förvärrar halka (roll B) | 10 · 13 · 16 m/s |
| **S** siktgräns | när sikt är en egen fara | 200 · 300 · 500 m |
| **S_mod** sikt som modifierare | när sikt förvärrar halka | 300 · 500 · 800 m |
| **Utfallsfönster** | hur länge efter fyrningen facit får komma | 30 · 60 · 120 min |

**Vad som INTE sveps:** att båda är punktkällor, och att halkan vinner prioritetsstriden. Det är
avgjort i DECISIONS #68:s anda och ändras inte här.

### 2.1 Per fordonstyp är INTE längre möjligt — och det är kortets största svaghet

Kortets ursprungliga nyckel sade "byvind m/s **per fordonstyp**". Det går inte längre: **kort #92
(däcktyp och fordonstyp som inställning på enheten) stängdes 2026-09-12** (DECISIONS #108). Utan den
inställningen vet motorn inte om den talar till en personbil eller en husvagn.

Konsekvensen är oundviklig och ska stå utskriven:

- En tröskel satt för **husvagn och släp** (där faran är verklig vid 15–18 m/s) kommer att tala till
  personbilsförare som inte behöver höra det.
- En tröskel satt för **personbil** (kanske 25 m/s) missar exakt den B2B-grupp som motiverade kortet.

**Beslutet skjuts till grinden, inte till gissningen:** svepet ovan spänner hela intervallet, och
W-B mäter falsklarmskostnaden vid varje tröskel. Räcker inte en enda tröskel för båda grupperna är
det ett argument för att öppna #92 igen — men det argumentet ska bäras av mätning, inte av intuition.

---

## 3. Givarvakt — obligatorisk, men OMÄTT för de här givarna

Varje fråga i det här dokumentet som läser vind eller sikt **måste** bära en givarvakt, av samma skäl
som yttemperaturen bär #75:ans.

**Och här är en varning som inte får läsas förbi:** för yttemperaturen VET vi vad vakten fångar —
**61 % av arkivets frostrader föll på den**, med −49,9 °C som värsta värde (DECISIONS #106). För vind
och sikt **vet vi ingenting**. Ingen har någonsin mätt hur ofta `wind_gust_ms` eller `visibility_m`
är orimliga i vårt arkiv.

**Därför är steg 0 (§7) inte valfritt.** Det ska mäta, innan något annat:

- Fördelningen av `wind_gust_ms` och `visibility_m` — finns sentineltal (−1, 0, 9999), fastnade
  värden, byvind under medelvind?
- Andelen rader där byvind < medelvind (fysiskt omöjligt) eller sikt exakt lika för en hel dag.
- Hur stor andel av stationerna som över huvud taget rapporterar de tre fälten.

Utan den mätningen är varje tal i §4 meningslöst. **En vakt som inte vet vad den vaktar mot är ingen
vakt.**

### 3.1 Mätt 2026-09-12 — vakten har fått två tal och en täckningssiffra

Steg 0 kördes (körning 34675456017, 14 dygn, 216 041 rader) och gav vakten dess innehåll:

| Fynd | Vad vakten ska göra |
| :-- | :-- |
| **Byvind max 85,5 m/s** | Sveriges uppmätta rekord ligger kring 81 m/s, och då på fjällstation. 85,5 vid en vägstation är med all sannolikhet en trasig givare. **Vakten behöver ett tak** — svepet 30 · 40 · 50 m/s, och det lägsta som inte kastar verkliga stormar vinner. |
| **Sikt 20 000 m i 45 650 av ~92 000 rader** | Det är ett **SENTINELVÄRDE** ("minst 20 km"), inte en mätning. Hälften av siktmaterialet är ett tak. Vakten ska behandla 20 000 som "god sikt" och aldrig låta det bära en tröskel eller räknas som ett mätvärde. |
| **Täckning 42,5 % byvind, 42,6 % sikt** | Mindre än hälften av arkivraderna bär fälten alls (751 respektive 747 stationer). Det halverar W-A:s underlag och **ska stå i varje dom**, som andel, enligt W-C5. |
| Noll rader med byvind < medelvind, noll negativa värden | Den delen av vakten behövs inte. Ett mätt nej är också ett svar. |

**En antydan som INTE får bära en tröskel:** bandet 10–15 m/s hade 2,23 × olycksfrekvensen mot
< 10 m/s (89,5 mot 40,2 per 1 000 stationstimmar, på 927 stationstimmar). Det är över W-A2:s krav —
men det är ETT band, i september, `situation_archive` bär ingen orsak, och nämnaren är diet-filtrerad
(§4). Det är ett skäl att köra om W-A när vinterstormarna kommit, inte ett skäl att sätta G nu.

### 3.2 Fönstret går inte att vidga — och täckningssiffran betyder något annat än den ser ut att göra

**Mätt i omkörningen 12/9, inte härlett:** första arkivtimmen med byvind är **4/9 05:00**, alltså
**8,1 dygn** av steg 0:s 14-dygnsfönster. De sex dygnen därutöver är tomma på alla tre fälten —
`sql/011_vind_sikt.sql` la till kolumnerna den 4/9 (kort #48), och dessförinnan fanns de inte.
Inuti de 8,1 dygnen ligger dessutom **minutkrisens lucka 5/9 → 9/9 05:00**, permanent eftersom
Trafikverket bara ger senaste mätningen (kort #84).

**Följd 1 — täckningsraden i 3.1 ska läsas om.** "42,6 % byvind" tolkades som att mindre än hälften
av stationerna bär fälten. Det är fel: **751 stationer bär dem.** Det som saknas är rader från dygn
då fälten inte fanns eller inte skrevs — tid, inte givare.

**Följd 2 — den verkliga exponeringen är mätt, och den är låg.** I fönstret finns **27 557
stationstimmar med byvind av 145 819 möjliga (751 stationer × 8,1 dygn × 24 h) = 18,9 %.**

| Vad som äter exponeringen | Kvar |
| :-- | --: |
| Alla möjliga stationstimmar i de 8,1 dygnen | 145 819 |
| Efter minutkrisens lucka 5/9 → 9/9 (≈ 4 dygn borta) | ~73 900 |
| Efter arkivdieten | **27 557 (18,9 %)** |

Dieten kostar alltså ungefär **två tredjedelar** av det som återstår efter luckan. Talet skrivs
numera ut av skriptet vid varje körning och behöver inte härledas igen.

**Följd 3 — W-A går inte att laga med ett längre fönster.** Ett fönster över 8,1 dygn läser tomma
dygn, och luckan går inte att fylla i efterhand.

Bara mer tid hjälper. W-A4:s krav på 500 stationstimmar i det högsta bandet nås när höstens stormar
koncentrerar exponeringen. Det säger också när grinden ska köras om: **efter första höststormen**, på
samma sätt som T-A körs om efter första frostnatten. Till skillnad från T-A finns ingen
gallringsdeadline — W-A räknar stationstimmar, och gallringen (#83) tunnar till en rad per halvtimme,
vilket lämnar stationstimmen intakt.

### 3.3 Stationsvakten — FASTSTÄLLD 2026-09-13 av Bengt (DECISIONS #164, #166)

§3.1 gav vakten ett **värdetak** (G_tak 30 m/s). Ett värdetak tar bort dåliga **avläsningar**. Det
tar inte bort en dålig **station**, och skillnaden visade sig vara hela frågan: station 2312 bar 26
av arkivets 36 stationstimmar över 30 m/s, spridda över hela perioden, och dess spikar drar upp
varje aggregat den bidrar till — också i timmarna UNDER taket, där G_tak per konstruktion inte gör
något. Två av de nio stationerna (2438, 2107) har dessutom sina omöjliga värden **under 30 m/s** och
är därmed osynliga för värdetaket.

**Kriteriet är fysik, inte en lista med id:n.** En lista blir inaktuell i tysthet; ett mått fångar
nästa trasiga station också.

| Tröskel | Värde | Varför just det |
| :-- | --: | :-- |
| **Byvindgolv** | **15 m/s** | W-A:s egen bandgräns (§4). Under den kan en felkvot inte lyfta en timme in i ett band grinden bryr sig om, och då ska vakten tiga. |
| **Kvottak** | **5** | Byvindfaktorn är 1,3–1,5 över öppen terräng, 2,5–3 i den ruggigaste. Arkivets egna tal vid medelvind ≥ 5 m/s (3 142 rader): median **1,75**, p95 **2,25**, p99,9 **3,08**. |
| **Krav för diskning** | **≥ 1 omöjlig timme** | En omöjlig timme är omöjlig. Svepet 1 · 2 · 5 skrivs ut vid varje körning. |
| **Parningen** | timmens högsta by mot timmens högsta medelvind | Byvinden är `Aggregated30minutes.Wind.SpeedMax`, medelvinden `Observation.Wind[0].Speed` — ett bakåtfönster mot ett ögonblick. Timmen är den minsta parning som inte ställer dem mot varandra. |

**Vakten gäller BARA B1.** En trasig byvindgivare säger ingenting om siktgivaren på samma stolpe —
de är olika instrument, och att kasta båda vore att slänga mätningar vi inte har skäl att misstro.
B2 utesluter ingen station.

**Utfall 2026-09-13:** 9 av de 42 stationer som har någon timme över 15 m/s diskvalificeras. De bär
46 av arkivets 110 stationstimmar över 15 m/s, och 45 av dessa 46 är omöjliga — stationerna är inte
ibland trasiga. Effekten på B1: −1,1 % av alla stationstimmar men **−67 % av det högsta bandet**
(9 → 3). Taksvepet visar att valet inte är bärande: kvot > 5 och kvot > 10 ger båda 9 stationer,
kvot > 3 ger 11.

#### Det första kriteriet föll — och det står här för att ingen ska bygga om det

Första utkastet mätte kvoten **per rad** vid medelvind ≥ 1 m/s. Den skarpa körningen gav **335
diskvalificerade av 748 stationer** och åt 47 % av B1:s stationstimmar. Orsaken syns i råraderna:
station 2534, 13/9 02:50–03:20, står byvinden stilla på 10,5 · 10,5 · 10,5 · 10,5 · 10,5 · 10,4
medan medelvinden faller 3,8 → 3,3 → 2,5 → 1,9 → 1,4 → 1,0. Ingestern säger varför:
`wind_gust_ms` är ett **30-minutersmaximum** (`Aggregated30minutes.Wind.SpeedMax`) medan
`wind_speed_ms` är ögonblicket (`Observation.Wind[0].Speed`). Kvoten var två tidsfönster delade med
varandra.

**Att bara höja golvet dög inte.** Vid medelvind ≥ 5 m/s fångas EN station (426), och 2312 — den som
motiverade hela vakten — slipper undan, eftersom dess medelvind står under golvet när byvinden visar
85. En vakt som missar den kända trasiga stationen men ser ut att vakta är sämre än ingen vakt.

**Kvottaket 5 flyttades INTE**, trots att utfallet hade sett prydligare ut vid 10. Felet satt i
nämnaren, inte i gränsen, och att flytta en tröskel efter att ha sett utfallet är precis den
glidning §8 finns för att förhindra.

#### Den kvarvarande svagheten — namngiven och mätt

Eftersom byvinden är ett 30-minutersmaximum kan en **verklig** by i princip parras mot en
efterföljande lugn timme och ge en falsk diskning. Kontrollen är gjord: med medelvinden tagen som
högsta värde över timmen **och timmen före** — ett fönster som säkert täcker byvindens hela
mätperiod — blir resultatet **identiskt**: samma 9 stationer, samma 45 timmar, samma fördelning per
station. Svagheten finns alltså i konstruktionen men har noll verkan på det här materialet.

**Vad som ska väcka den frågan igen:** en framtida körning som diskar en station på **exakt en**
omöjlig timme medan den i övrigt beter sig normalt. Då ska kravet ≥ 1 omprövas mot ≥ 2 innan
stationen kastas — med en rad i DECISIONS, enligt §8.

**De nio stationerna är anmälda uppåt:** `docs/ANMALAN-TRV-BYVINDGIVARE.md` (2026-09-13). En vakt som
bara gömmer felet för oss själva lämnar det kvar för alla andra som läser samma öppna data.

---

## 4. Grindarna

### W-A — Finns signalen alls? (mätbar NU, före all skuggkod)

Frågan: **stiger olycksfrekvensen mätbart med byvind respektive sjunkande sikt i vårt eget arkiv?**

Metod: för varje station och timme, para `wind_gust_ms` och `visibility_m` mot olyckor i
`situation_archive` inom räckvidd. Jämför olycksfrekvensen per stationstimme i band (byvind < 10,
10–15, 15–20, ≥ 20 m/s; sikt > 1000, 500–1000, 200–500, < 200 m).

**Detta är den avgörande skillnaden mot vattenplaningen:** där fanns ingen nämnare alls — oljefilmens
0d kunde inte räkna hur många torrperioder som passerat utan olycka. Här finns en, så en
**nollhypotes går att räkna**: vad är olycksfrekvensen vid normal vind, och stiger den?

⚠️ **MEN NÄMNAREN ÄR INTE ALLA TIMMAR — rättat 12/9 (DECISIONS #116).** Den här paragrafen påstod
tidigare att "exponeringen är mätt kontinuerligt vid varje station". Det är fel. **Arkivdieten**
(DECISIONS #4, `ingest/sources/weather.ts:69`) sparar bara rader vid yta ≤ 5 °C, nederbörd, eller när
ytan rört sig ≥ 0,5 °C sedan senast. En lugn, torr, mild timme lämnar ofta inget spår. W-A:s nämnare
är alltså **stationstimmar som dieten sparade**, inte stationstimmar som inträffade. Det är samma
klass av fel som 0f:s (DECISIONS #96): att läsa en händelsefiltrerad tabell som en kadens.

**Täckningsgraden mäts numera och skrivs ut med varje utfall** (`scripts/vindsikt-steg0.ts`,
givarkollen). Riktningen på felet är **resonerad, inte mätt**: dieten sparar oftare vid nederbörd och
snabba temperaturfall, alltså i just det väder som blåser, så referensbandet < 10 m/s borde tappa
fler lugna timmar än de höga banden. Det blåser upp referensens frekvens och **trycker ner kvoten** —
om resonemanget håller är W-A konservativ. Kvoten får inte läsas som om det vore bevisat.

| # | Mått | Krav |
| :-- | :-- | :-- |
| W-A1 | Olycksfrekvensen ska stiga **monotont** med byvindbandet | ja/nej |
| W-A2 | Högsta bandet mot lägsta | **≥ 1,5 ×** |
| W-A3 | Samma två krav för sikt, räknade separat | ja/nej |
| W-A4 | Underlag | **≥ 500** stationstimmar i det högsta bandet, **≥ 20** olyckor totalt |

**Faller W-A är svaret ett dokumenterat nej** och kortet läggs ner utan en rad kod. Det är ett
billigt och bra utfall — och det är därför W-A byggs först.

*Reservation som ska stå i utfallet: olyckor i `situation_archive` bär ingen orsak
(situations.ts:37). En association mellan vind och olycka är inte ett bevis på orsak, och en
hastighetsrelaterad olycka i blåst räknas som "vindolycka" här. W-A mäter samband, inte kausalitet.*

### W-B — Skuggdriften (döms efter en höst- eller vintermånad)

Skuggkolumn i skuggmotorn, ingen röst. Rollerna mäts **var för sig**:

| # | Mått | Fällt värde (Bengt) |
| :-- | :-- | :-- |
| W-B1 | **Roll A** — falsklarmsandel av utfärdade skuggvarningar | **≤ 20 %** |
| W-B2 | **Roll A** — missandel av facitbekräftade händelser | **≤ 40 %** |
| W-B3 | **Roll A** — varningsfrekvens per rutt och blåsdygn | **≤ 3** |
| W-B4 | **Roll B** — nettonytt: halkfall där modifieraren hade gett bättre försprång | **≥ 5 %** av halkfacit |
| W-B5 | **Roll B** — priset: tillkomna fyrningar som inte var hala | **≤ 25 %** |

Asymmetrin i W-B1/W-B2 är avsiktlig och ärvd ur TROSKLAR-VATTENPLANING §3: en missad varning lämnar
föraren där hen redan är; ett falsklarm lär föraren att ignorera rösten, och då dör även halkvarningen.

### W-C — Domens giltighet

| # | Villkor | Fällt värde |
| :-- | :-- | :-- |
| W-C1 | Skuggvarningar i underlaget | **≥ 200** |
| W-C2 | Facitbekräftade händelser | **≥ 15** |
| W-C3 | Blås- eller dimdygn | **≥ 5** |
| W-C4 | Län | **≥ 3** |
| W-C5 | Givarvaktens bortfall redovisat | alltid, som andel |

W-C5 finns för att §3:s okända inte ska försvinna i en dom. Faller 60 % av vindmätningarna på vakten
ska det synas bredvid talen, inte döljas i dem.

---

## 5. Modifierarrollen — formen, och varför den är billig

Roll B byggs som DECISIONS #68 var tänkt, och **den blir den första lager 2-regel som faktiskt
skrivs** (#68 beslutades men byggdes aldrig — motorn har fem faror och ingen av dem är vattenplaning).

Formen är:

```
om halka ELLER frysrisk kvalificerar
   och byvind >= G_mod (eller sikt <= S_mod)
då  förläng försprånget  ELLER  höj prioriteten inom A-skalan
```

**Ingen historik, ingen tillståndsskattare, inget minne.** Båda signalerna finns i samma snapshot i
samma ögonblick. Det är hela skillnaden mot lager 1 (§2.2 i OVERGANGAR-ANALYS) och skälet att roll B
är väsentligt billigare att bygga än roll A.

**Den öppna designfrågan, som kortet ställde och som besvaras här:** modifieraren ska **förlänga
försprånget**, inte höja prioriteten. Skälet är husregeln — prioritetsstegen droppar förloraren, så
en höjd prioritet skulle tysta något annat. Ett längre försprång säger samma sak tidigare, vilket är
exakt vad sämre grepp och sämre sikt kräver. Halkan vinner fortfarande alltid.

---

## 6. Facit — och en ärlig svaghet

| Källa | Får bekräfta träff | Får fälla falsklarm |
| :-- | :-- | :-- |
| Olycka i `situation_archive` inom räckvidd och fönster | ja | nej |
| Stationens egen mätning i efterhand (byvind/sikt nådde aldrig tröskeln) | ja | **ja** |
| SMHI:s vindvarningsklasser (`smhi_warnings`) | ja | nej |
| Testarlogg (förare, tid, plats) | ja | ja |

**Svagheten, utskriven:** olyckor bär ingen orsak. Vi kan aldrig visa att en olycka orsakades av
sidvind — bara att den inträffade när det blåste. Därför får bara stationens egen mätning och en
mänsklig testarlogg fälla falsklarm; allt annat får bara bekräfta. Samma asymmetri som
vattenplaningens §2, och av samma skäl: **"blåst utan olycka" är inte ett falsklarm** — en korrekt
riskvarning följs oftast av att ingenting händer.

---

## 7. Ordning — vad görs när

| Steg | Vad | När | Grind |
| :-- | :-- | :-- | :-- |
| 0 | **Givarkollen + W-A**, läsande knapp mot arkivet | **kan göras nu** — kräver inte radardomen | W-A |
| 1 | Detta dokument fastställs | efter steg 0:s tal | Bengt (äger mätningen) |
| 2 | Roll B som skuggkolumn (billigast, ingen ny fara) | efter 14/9 | W-B4/W-B5 |
| 3 | Roll A som skuggkolumn | efter 14/9 | W-B1–W-B3 |
| 4 | Röst | efter W-C och Axels ja — rösttext, A-skalan, PRODUKTBOK | — |

**Steg 0 kan göras i helgen.** Det kräver ingen ny källa, ingen skuggkolumn och ingen deploy — bara
`weather_observations` och `situation_archive`, som båda växer (källkollen 12/9). Faller W-A är
kortet klart utan att en rad motorkod skrivits.

**Roll B före roll A** i steg 2–3, tvärtemot kortets ursprungliga ordning. Skälet: roll B är
billigare (ingen ny fara, ingen ny rösttext, ingen ny plats i A-skalan) och den prövar samtidigt det
mönster som #46 och framtida lager 2-regler ska ärva.

---

## 8. Ändring

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

Fram till första skuggkörningen får §2:s svep och §4:s krav justeras av vem som helst av oss med en
rad i DECISIONS. **Från första skuggkörningen ändras ingen tröskel alls** — varje motivering som inte lutar sig mot utfallet.

**Tillägg 2026-09-13 (Bengts order "bygg stationsvakten"):** §3.3 lägger till stationsvakten —
byvindgolv 15 m/s, kvottak 5, krav ≥ 1 omöjlig timme, bara B1. Tillägget rör givarvakten (§3),
inte §2:s svep eller §4:s krav, och görs före första skuggkörningen. Det första kriteriet föll på
sin egen mätning och är bevarat i §3.3 som varning, inte bortstädat (DECISIONS #164, #166).

En ändring är redan gjord mot kortets ursprungliga lydelse och ska inte göras om: **per fordonstyp
utgår** (§2.1), eftersom kort #92 stängdes 12/9. Vill någon tillbaka dit är vägen att öppna #92 med
mätning som skäl, inte att skriva om det här dokumentet.

---

*Källor: TAVLA.md #90, #46, #68, #75, #81, #84, #92 (stängt), #95; docs/TROSKLAR-OVERGANGAR.md §6
(överlämningen, lagerindelningen); docs/OVERGANGAR-ANALYS.md §1b.2 (lager 1 mot lager 2);
docs/TROSKLAR-VATTENPLANING.md §2/§3 (asymmetrin, grindformen); docs/TROSKLAR-TRENDEN.md §8
(ändringsregimen); DECISIONS #68, #106, #108, #109, #111; sql/011_vind_sikt.sql;
ingest/sources/situations.ts:37; scripts/kallkollen.ts (källorna växer).*
