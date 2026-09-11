# Övergångarna mellan faror — förstudie (kort #89, systemanalysen §2.2)

*2026-09-11, Claude på Bengts beställning ("gör en ordentlig genomlysning av problembilden, vart
vi ska börja, vad vi ska göra sen och hur vi ska angripa det"). Underlag för ett tröskeldokument,
inte tröskeldokumentet självt. Ingenting här är beslutat. Allt märkt VERIFIERAT är läst i vår kod
eller våra dokument i dag; allt märkt RESONEMANG är fysik eller slutledning som måste bära sin
egen märkning tills mätning finns; allt märkt ATT VERIFIERA kräver databasen eller vintern.*

Samma form som docs/VATTENPLANING-ANALYS.md (kort #42:s förstudie, 1/9), som föregick
TROSKLAR-VATTENPLANING.

---

## 0. Slutsatsen i fyra meningar

§2.2 ser ut som tre jämbördiga punkter. Det är de inte. **(a) efterhalkan är ett hål i den regel
vi redan har**, inte ett nytt samband — motorn kan per definition inte larma för en blöt väg som
fryser efter att regnet slutat. **(b) första regnet är den enda genuint nya faran**, och den enda
som går att mäta i höst. **(c) interaktionerna är inte ett eget arbete** utan tre stycken i två
andra korts tröskeldokument. Ordningen blir därför: mät hålet nu, skriv tröskeldokumentet med (a)
som huvudsak, bygg (b) som skugga i höstregnen om Axel vill ha den alls, och lämna (c) till #46
och #90.

---

## 1. Fyndet som ändrar bilden: frysrisken är blind efter regnet

VERIFIERAT, tre ställen i koden 11/9:

- `engine/src/engine.ts:189–193`: `icing_point` larmar om och endast om
  `surfaceTempC <= (bro ? 3 : 1) && moisture === true`.
- `ingest/sources/weather.ts:42–56`: `rain` och `snow` kommer ur `Aggregated10minutes.Precipitation`,
  `precipitation` ur `Weather.Precipitation`. Alla tre säger **om det faller nederbörd just nu**,
  med som mest tio minuters eftersläpning.
- `publish/snapshot-core.ts:42–43` och `publish/missar.ts` (citerat på kort #45): `fukt` =
  `rain OR snow OR precipitation ∉ {torrt}`. Ingen annan ingrediens.

Konsekvens: **när regnet slutar blir `moisture` falskt inom tio minuter, och frysrisken kan inte
fyra igen förrän det börjar regna på nytt** — oavsett hur blöt vägen är och hur långt under noll
ytan sjunker. Den klassiska efterhalkan (regn på kvällen, klart och stilla, yta från +3 till −1 på
två timmar) inträffar nästan alltid *efter* att nederbörden upphört. Det är exakt fönstret där
regeln tiger.

Det här är inte en brist i §2.2:s formulering, det är dess kärna. Analysen sade "regnsumma, yttemp
och trend finns alla i arkivet; inget sitter ihop". Rättare: **fuktvillkoret är definierat så att
det inte kan sitta ihop med något som hänt tidigare än tio minuter sedan.**

VERIFIERAT, och det stänger den enkla utvägen: Trafikverket har ytstatusgivare (friktion, torr/våt/
is) på ett 30–50-tal av ~750 stationer (källkartläggningen rad 38 och 233). Vi hämtar dem inte, och
de täcker under 7 % av nätet. Det finns alltså **ingen blöt-väg-givare i skala**. Vägens fukt måste
härledas.

---

## 2. Vad §2.2 egentligen består av

| Punkt | Analysen kallar det | Vad det är | Rätt mått |
| :-- | :-- | :-- | :-- |
| (a) Efterhalka | "samband vi missat" | **Utvidgning av frysriskens fuktvillkor** med regnhistorik | B3-paret: räddade missar mot tillkomna falsklarm — samma kurva som TYSTNADSFEL §5 |
| (b) Första regnet | "samband vi missat" | **Ny fara**, finns inte alls i motorn | V-B-liknande: träffar och falsklarm mot facit, från noll |
| (c) Interaktioner | "samband vi missat" | **Prioritets- och modifieringsregler** mellan faror som redan finns eller planeras | Ingen egen mätning — avgörs i respektive tröskeldokument, #68 som mall |

Skillnaden mellan (a) och (b) är avgörande för hur de döms. (a) är en strikt utvidgning: den kan
bara *lägga till* larm, aldrig ta bort, så frågan är vad tilläggen är värda. (b) börjar på noll och
måste bevisa sig som vilken ny fara som helst. Att slå ihop dem i ett kort med en nyckel var
bekvämt i analysen men fel som byggplan.

---

## 3. Datakällorna, ärligt sorterade

**Har, i arkivet, per station (VERIFIERAT i sql/001, 008, 010, 011):** yttemperatur, lufttemperatur,
daggpunkt, luftfuktighet, nederbördstyp, regn/snö ja-nej (10-min-aggregat), `rain_sum_mm` och
`snow_wateq_mm` (mm per 30 min), vind, byvind, vindriktning, sikt. Minutupplösning sedan 9/9
(ingest-live, kort #84), 30-minutersrader dessförinnan; regnmängden sedan 2/9 (89 % täckning,
regn-bevis #1).

**Har, som facit (VERIFIERAT, DECISIONS #94:s stack):** `road_condition_history` (operatörens
omklassning till halka/is), kamerafacit (#20: bild arkiverad vid varning och i gryningen — 738 av 744
kameror står vid en VViS-station, #55), `situation_archive` (bara `Accident`, ~210 rader/dygn, med
position och tid men **utan orsak** — situations.ts:37).

**Har inte:** vägens faktiska blöthet i skala (§1). Saltbilens passage (ingen öppen källa,
källkartläggningen rad 222). Olyckans orsak. Spårdjup (DECISIONS #66).

**Gallringen (kort #83, sql/014) påverkar analysen:** efter sju dygn överlever bara
30-minutersraderna. Det räcker för torrdygnsräkning och för "regn inom N timmar" i drift, men
retrospektiv analys av *exakt när* regnet slutade måste ske inom veckan eller nöja sig med
halvtimmesprecision.

**Arkivdieten (DECISIONS #4) påverkar den också:** rader sparas bara vid yta ≤ 5 °C, nederbörd, eller
yttemperatursprång ≥ 0,5 °C. Det betyder att timmarna *efter* ett varmt höstregn ofta saknas i
arkivet, medan timmarna efter ett kallt regn — de som betyder något för (a) — finns. Dieten är
alltså gynnsam för (a) och neutral för (b), som bara behöver regnets *början* och torrdygnen före.

---

## 4. (a) Efterhalkan — den blöta vägen som fryser när regnet slutat

### 4.1 Problembilden

RESONEMANG (fysik, att källbelägga i tröskeldokumentet): regn lägger en vattenfilm på vägen. Om
molnen sedan drar bort strålar ytan ut värme mot en klar himmel och kyls snabbare än luften. Filmen
fryser när ytan passerar noll. De förhållanden som gör frysningen sannolik — klart, vindstilla,
fuktig luft, kallt — är **samma förhållanden som hindrar vägen från att torka**. Proxyn "det regnade
för N timmar sedan" är därför mest träffsäker i exakt det scenario den ska fånga, och minst
träffsäker (varm, blåsig eftermiddag) i scenarier där frysningen ändå inte sker. Det är en
självkonsistens som gör proxyn bättre än den ser ut.

VERIFIERAT: motorn ser i dag ingenting av detta (§1).

### 4.2 Regelskissen

Utvidga fuktvillkoret, rör ingenting annat:

    fukt_utvidgad = fukt_nu  ELLER  (regn_sum_mm > 0 inom senaste N timmar vid stationen)
    icing_point   = yta <= tröskel  OCH  fukt_utvidgad

Allt annat i `icing_point` (tröskel 1 °C, bro 3 °C, räckvidd, repris, prioritet A2) är oförändrat.
Utvidgningen är en strikt superset: varje larm som fyrar i dag fyrar också med den.

Valfri skärpning att svepa: kräv dessutom luftfuktighet ≥ RH_min, som guard mot "regnade vid lunch,
torkade, frös på kvällen". RESONEMANG: i det fallet är vägen torr när den fryser, och torr frost
utan nederbörd är #46:s rimfrost, inte efterhalka. Guarden avgör var gränsen mellan korten går.

### 4.3 Parametrar att svepa — medvetet OSATTA

Samma princip som TROSKLAR-TRENDEN §2: dokumentet anger svepet, grinden väljer värdet.

| Parameter | Vad den styr | Svep |
| :-- | :-- | :-- |
| **N** | hur länge efter sista regnet vägen räknas som blöt | 1 · 2 · 3 · 4 h |
| **RH_min** | fuktguard mot torkad väg | ingen · 80 · 90 % |
| **Minsta regn** | hur lite regn som räknas som "blöt väg" | > 0 · ≥ 0,2 · ≥ 0,5 mm/30 min |
| **Utfallsfönster** | hur länge efter fyrningen facit får komma | 60 · 120 · 180 min |

Vad som INTE sveps: yttröskeln (1 °C / bro 3 °C). Den är frysriskens och ändras inte av (a).

### 4.4 Facit och grind

Facit ur den fastställda stacken (DECISIONS #94): omklassning till halka/is i
`road_condition_history` på segment nära stationen, kamerafacit i gryningen, olyckor i
`situation_archive` inom räckvidd. Räckviddsvillkoret ur TYSTNADSFEL §6 gäller: en miss räknas bara
där systemet hade en chans.

Grinden är **B3-paret** (TROSKLAR-TRENDEN §4 T-B, TYSTNADSFEL §5): för varje kandidat-N, hur många
facit-halttillfällen räddar utvidgningen som dagens regel missade (nettonytt), och hur många nya
falsklarm tillkommer på tillfällen som inte blev hala. Två kurvor mot N; där marginalen korsar sitter
N. Golv mot brus, samma logik som trendens: nettonytt ≥ 5 % av facit inom räckvidd, tillkomna
falsklarm ≤ 25 % av tillkomna fyrningar. Talen är gissade i trendens mening (golv, inte trösklar) och
fastställs av Bengt.

ATT VERIFIERA (vintern): allt ovan. T-A-liknande grind: minst 30 regn-följt-av-frost-nätter, minst
20 stationer, båda halvorna av perioden. Fysikkontrollen: träffarna ska toppa efter midnatt och vara
vanligast klara nätter.

### 4.5 Relationen till #88 (trenden)

RESONEMANG: de överlappar inte, de staplas. Trenden säger *"risk framöver"* när ytan faller mot noll
med daggpunkten nära — det är förvarningen. (a) är själva träffen: när ytan passerar 1 °C på en väg
som är blöt av regn ska frysrisken fyra. Utan (a) skulle trenden varna, och sedan skulle den verkliga
frysningen vara tyst — en incoherent röst. Med (a) hänger de ihop: förvarning, sedan larm.

---

## 5. (b) Första regnet efter torka — oljefilmen

### 5.1 Problembilden

RESONEMANG (fysik, att källbelägga): under torrperioder samlas olja, gummi och damm på vägbanan.
Det första regnet lyfter dem till en emulsion som sänker friktionen markant under de första
10–30 minuterna, tills regnet spolat bort den. Fenomenet är väl belagt i trafiksäkerhetslitteraturen
och varnas för i förarutbildning. Det är **inte is**, och det inträffar oavsett temperatur.

### 5.2 Varför den är annorlunda än allt annat i Halkvakt

- Den är en **ny fara**, inte en utvidgning. Motorn har ingen regel som liknar den.
- Den är **frekvent**: varje station upplever "första regnet efter ≥ 5 torrdygn" flera gånger per
  höst. Det är många tillfällen att tala vid.
- Den har **svagt facit**: operatören klassar inte om vägen för oljefilm, kameror visar inte
  friktion, och `situation_archive` bär olyckor utan orsak. Facit blir "olycka inom räckvidd under
  fönstrets 20 minuter" mot en låg basfrekvens (~210 olyckor/dygn på hela nätet).
- Den riskerar **"fler ord i bilen"**: föraren kan inte göra mycket annat än sakta ner, vilket
  regn ändå kräver. Husregeln tystnad är en funktion är direkt hotad.
- Men den är **den enda punkten i §2.2 som går att mäta nu**, i höstregnen, innan vintern.

### 5.3 Regelskissen

    torrdygn(station)  = dygn sedan senaste rad med regn_sum_mm > 0
    oljefilm           = regn_sum_mm > 0 nu  OCH  torrdygn >= D  OCH  minuter sedan regnstart <= T

Punktkälla ⇒ "framöver", aldrig avstånd. Plats i A-skalan under halkan (halkan vinner, som allt
annat). Talar en gång per station och regnstart.

### 5.4 Parametrar att svepa

| Parameter | Svep |
| :-- | :-- |
| **D**, torrdygn | 3 · 5 · 7 |
| **T**, fönstret efter regnstart | 15 · 20 · 30 min |
| **Minsta regn för "start"** | > 0 · ≥ 0,2 mm/30 min |

### 5.5 Facit och grind

Grind av V-B:s sort (TROSKLAR-VATTENPLANING §3): falsklarm ≤ 20 % av fyrningar, miss ≤ 40 % av
facit, över ett underlag av minst 200 fyrningar, 15 facit-olyckor inom fönster och räckvidd, 5
regndygn efter torka, 3 län. **Ett dokumenterat nej är ett bra utfall.** Klarar den inte grinden
läggs den ner, inte parkeras (husregeln i systemanalysens §4).

ATT VERIFIERA (nu): hur många torrperioder ≥ 5 dygn följda av regn finns i arkivet sedan 2/9, och hur
många olyckor faller i deras första 20 minuter. Det avgör om grinden alls är nåbar i höst.

### 5.6 Frågan som bara Axel kan svara på

Är oljefilm inom Halkvakts löfte? Appen heter Halkvakt och lovar is och halka. Oljefilm är halka i
ordets vidare mening men inte i produktens. Om svaret är nej ska (b) inte byggas ens som skugga —
en rad i DECISIONS och kortet krymper till (a) och (c). Om svaret är ja, eller "mät och se", är
höstregnen fönstret och det öppnar nu.

---

## 6. (c) Interaktionerna — inte ett eget arbete

VERIFIERAT: motorn har en förhandlad interaktion (halka × vattenplaning, DECISIONS #68: halkan
vinner, vattenplaningen vilar helt vid yta ≤ +4 °C) och en till i trendens §5 (halka vinner över
trend). Prioritetsstegen A3 > A1 > A2 > A4 > A5 avgör resten mekaniskt: en vinnare, övriga släpps.

De tre paren i §2.2 hör hemma på olika ställen:

- **Dimma × frysrisk = rimfrost → kort #46.** RESONEMANG: dimma är luft vid ~100 % relativ
  fuktighet, alltså daggpunkt ≈ lufttemperatur. #46:s villkor (yta ≤ daggpunkt) blir då trivialt
  uppfyllt så snart ytan understiger luften. Sikt < X m är därför en **konfidenshöjare** för #46:s
  regel, inte en egen fara. En rad i #46:s tröskeldokument när det skrivs, inget mer.
- **Sidvind × halka och dimma × halka → kort #90.** Ingen av dem finns förrän vind och sikt är
  faror, och det kräver Axels ja och ett tröskeldokument (#90:s nyckel). Interaktionsregeln skrivs
  då, med #68 som mall. Den öppna designfrågan, som bör stå i #90:s dokument: ska dimma eller sidvind
  **modifiera** halkvarningen (längre försprång, eftersom reaktionstiden är sämre) i stället för att
  bara förlora prioritetsstriden? Det är den enda nya tanken i (c), och den är #90:s.

Rekommendation: kort #89 lämnar över (c) uttryckligen och behåller bara (a) och (b).

---

## 7. Tystnadsfelets roll — det är instrumentet

TROSKLAR-TYSTNADSFEL (#98) klassar varje tyst miss som *oursäktlig* (signal fanns) eller *ursäktlig*
(ingen signal). §3 räknar upp signalerna: daggpunktsgapet slöt sig, trenden pekade mot noll, eller en
station inom räckvidd visade risk.

**"Det regnade inom N timmar" saknas i den listan.** Efterhalkans missar skulle i dag klassas på de
andra signalerna — ofta oursäktliga ändå, eftersom daggpunkten är hög efter regn — men utan att
orsaken syns. Två saker följer:

1. Tystnadsfelet är det som **mäter hur stort §2.2:s hål är**, redan innan (a) byggs. Varje
   oursäktlig tyst miss där det regnat inom N timmar är ett efterhalkefall regeln missade.
2. TYSTNADSFEL §3 bör få "regn inom N timmar vid stationen" som **fjärde signaltyp**. Det är en
   ändring före första skuggkörningen och får göras med en rad i DECISIONS (dokumentets egen §9 ärver
   trendens §8-regim).

Det är sannolikt varför tystnadsfelet nämndes i beställningen: (a) och #98 är samma fråga från två
håll.

---

## 8. Låset — #45:s dom är fel nyckel för (a) och (b)

VERIFIERAT: kort #89:s nyckel är "#45:s dom + tröskelrader (§5)". #45 är nederbördstypen (regn,
snö, slask via våtbulb × radar) och är låst bakom radardomen 14/9. #45:s *egna* övergångar är regn
på snö och snö på snö.

Men (a) behöver **regnhistorik och yttemperatur** — båda finns per station sedan 2/9 respektive
24/8. (b) behöver **regnhistorik**. Ingen av dem behöver radarn eller typklassningen. Bara
snöövergångarna beror på #45, och de är redan #45:s.

Rekommendation: **dela nyckeln.** (a) och (b) låses upp av sitt eget tröskeldokument; (c) av #46
och #90; regn-på-snö och snö-på-snö stannar hos #45. Kort #81:s byggordning gäller fortfarande för
*kod* — men mätning (§9 steg 0) och tröskeldokument (steg 1) är inte kod.

---

## 9. Ordningen — vart vi börjar, vad som kommer sedan

| Steg | Vad | När | Grind | Kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **0. Mät hålet** | Läsande skript mot arkivet: för varje regnstopp per station sedan 9/9 — hur snabbt går `fukt` falskt, och vad gör ytan och fuktigheten de följande fyra timmarna? Plus: antal regnstopp per dygn (underlagets storlek), antal torrperioder ≥ 5 dygn följda av regn (b:s underlag). | Nu | Ingen — det är en läsning | 1 Actions-minut som knapp, eller steg i måndagsserien |
| **1. Tröskeldokumentet** | TROSKLAR-OVERGANGAR med (a) som huvudsak, (b) som egen gate med nedläggningsklausul, (c) som överlämning. Svep, inte värden. | Nu, direkt efter steg 0 | Bengt fastställer, Axel bockar | 0 |
| **2. Regnhistoriken** | En härledning per station: senaste regn (tid), regn inom N h (bool per N i svepet), torrdygn. Vy eller kolumn i Supabase, skriven av ingest-live. Tjänar både (a) och (b). | Efter 14/9 (#81:s ordning, det är kod) | Vakthundsrad innan den går skarpt (#81 regel 5) | 0 kr, ~50 kB |
| **3. (b) i skugga** | Oljefilm som skuggkolumn i skuggmotorn, V-B-grind. **Bara om Axel säger att den hör till löftet (§5.6).** | Efter 14/9, medan höstregnen pågår | V-B | 0 kr |
| **4. (a) i skugga** | Utvidgat fuktvillkor som skuggkolumn bredvid dagens `icing_point`, B3-paret. Data finns från steg 2; domen kräver frost. | Efter 14/9; döms vid höstens första frostnätter | B3 ≥ golven, fysikkontrollen | 0 kr |
| **5. Tystnadsfelet** | "Regn inom N h" som fjärde signal i TYSTNADSFEL §3. | Med steg 1 | Rad i DECISIONS | 0 |
| **6. (c) överlämnas** | En rad på #46 (sikt som konfidens), en designfråga i #90:s framtida dokument (modifiera eller förlora). Kort #89 krymper. | Med steg 1 | Tavlan | 0 |
| **7. Röst** | Bara efter dom och Axels ja. (a) ändrar ingen rösttext — det är samma larm, oftare rätt. (b) kräver ny text, plats i A-skalan, PRODUKTBOK. | Mars | Grind + Axel | — |

**Vad som är tidskritiskt:** steg 0 och 1 kan göras i dag. Steg 3 har sitt fönster *nu* — höstregn
efter torka slutar när vintern kommer. Steg 4:s dom har samma fönster som #88:s T-A: höstens första
frostnätter, som inte kan tas ikapp.

---

## 10. Vad som talar emot

- **(a) kan bli en falsklarmsmaskin i söder.** En blöt väg vid +1 °C fryser inte alltid; salt,
  trafik och dagsljus håller den flytande. Utan N-svepet och falsklarmsgolvet blir utvidgningen
  "regnade det i går? då larmar vi". Grinden finns för det.
- **(a) och #46 kan dubbelräkna.** Rimfrost efter regn (daggpunkt hög, yta faller under den) fyrar
  båda. Det är inte fel — det är samma is — men tystnadsfelet ska inte räkna en räddad miss två
  gånger. Tröskeldokumentet måste säga vem som äger fallet: förslagsvis (a) om det regnat inom N h,
  annars #46.
- **(b) kan vara utanför löftet** (§5.6). Att mäta något som sedan visar sig oönskat kostar en
  skuggkolumn och en höst. Frågan ska ställas före steg 3, inte efter.
- **Facit för (b) är tunt.** Om underlaget i steg 0 visar färre än ett tiotal olyckor i fönstren
  över hela hösten fälls ingen dom, och kortet står öppet till nästa höst. Det är ett giltigt utfall
  men ett dyrt sätt att lära sig det.
- **Arkivdieten döljer varma efterregn.** För (a) spelar det ingen roll. För steg 0:s
  torkningskurvor betyder det att vi bara ser hur vägen torkar när det är kallt — vilket är det vi
  vill veta, men det ska sägas.

---

## Rekommendation

1. **Kör steg 0 nu** — en läsning, en minut, inga beslut. Den ger tre tal: hålets storlek,
   (a):s underlag och (b):s underlag. Utan dem är resten av planen antaganden.
2. **Skriv tröskeldokumentet direkt efter**, med (a) som huvudsak. Det är det som låser upp allt
   annat, och det är inte kod.
3. **Ställ §5.6-frågan till Axel innan (b) byggs.** Ett nej sparar en höst.
4. **Dela #89:s nyckel** så att (a) inte väntar på #45 i onödan.
5. **Lägg "regn inom N h" i TYSTNADSFEL §3** i samma varv som tröskeldokumentet.

Det billigaste stora klivet i §2.2 är inte ett nytt samband. Det är att sluta definiera bort den
blöta vägen tio minuter efter att regnet slutat.

---

## Källor i repot

engine/src/engine.ts:189–193 (icing_point); ingest/sources/weather.ts:42–56 (fukt = nederbörd nu);
publish/snapshot-core.ts:42–43 (fukt i snapshoten); ingest/sources/situations.ts:37 (KEEP = Accident);
sql/001_init.sql, 003_situation_archive.sql, 008_rain_sum.sql, 011_vind_sikt.sql, 014_gallring.sql;
docs/fullstandig-kallkartlaggning-2026-08-26.md rad 38 och 233 (ytstatusgivarna);
docs/TROSKLAR-TRENDEN.md §2, §4, §5; docs/TROSKLAR-TYSTNADSFEL.md §3, §5, §6, §8;
docs/TROSKLAR-VATTENPLANING.md §3, §4; docs/VATTENPLANING-ANALYS.md (formen); DECISIONS #4, #66,
#68, #94; TAVLA.md #45, #46, #81, #83, #88, #89, #90, #98; Drive: "Framtida utvecklingsmöjligheter —
systemanalys varningssystemen 2026-09-10 v3" §2.2.
