# TROSKLAR-OVERGANGAR

**Kort:** #89 ÖVERGÅNGARNA (systemanalysen §2.2). **Status:** ✅ **FASTSTÄLLT OCH KONTRASIGNERAT** —
Bengt 2026-09-12 i chatten med tillägget att **(b) oljefilmen stryks** (§5), Axel 2026-09-12 via
Bengt (samma form som DECISIONS #61/#68/#95). Fastställda: svepet i §2, givarvakten i §3, golven i
Ö-B, underlagskraven i Ö-C, läsfönstret i Ö-D. Ingen kod ännu.
Skuggkolumnerna byggs efter radardomen 14/9 (kort #81:s ordning). Från första skuggkörningen gäller
§10 — regimen är knuten till första skuggkörningen och inte
till signaturen.

**Förstudie:** `docs/OVERGANGAR-ANALYS.md` (fem läsningar, 11–12/9). **Steg 0 kört** tre gånger
12/9 (DECISIONS #96, #97, #100, #104) — det här dokumentet skrivs alltså på mätning, inte på
resonemang. Varje tal nedan som inte är märkt RESONEMANG är mätt.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · punktkällor säger
"framöver" · tystnad är en funktion · trösklar gissas inte, de faller ur mätning · ändring efter
trösklarna är daterade FÖRE mätningen och skrivs inte om när talen kommit (§10).

---

## 1. Vad som döms

Kortet bar tre punkter. De är **inte tre av samma sort**, och dokumentet behandlar dem därefter:

| Punkt | Vad det är | Var det döms |
| :-- | :-- | :-- |
| **(a) Efterhalkan** | **Utvidgning av en regel vi redan har** — frysriskens fuktvillkor | Här, §4 (grind Ö-B) |
| ~~**(b) Oljefilmen**~~ | ~~Ny fara~~ | **STRUKEN 12/9** — §5 |
| **(c) Interaktionerna** | Stycken i två ANDRA korts tröskeldokument | Överlämnas, §6 |

**Huvudsaken är (a).** `icing_point` larmar om och endast om `surfaceTempC <= (bro ? 3 : 1) &&
moisture === true` (engine.ts:189–193), och `moisture` betyder **det faller nederbörd nu** — som
mest tio minuters eftersläpning (weather.ts:42–56, snapshot-core.ts:42). När regnet slutar blir
fukten falsk och frysrisken kan inte fyra igen, oavsett hur blöt vägen är och hur långt under noll
ytan sjunker. Den klassiska efterhalkan inträffar nästan alltid **efter** att nederbörden upphört.

**Hålet är mätt, inte antaget** (steg 0, körning 34590257682, sju dygns ogallrat fönster): på
**120 av 157 användbara regnstopp — 76 %** — visade stationens regnmätare fortfarande regn i de
senaste 30 minuterna i exakt den stund motorns fukt slog om till torrt. Mätaren stod kvar över noll
**median 35 minuter** efter omslaget. Förstudiens gissning var ~10 minuter; verkligheten är tre
gånger så bred.

Vad som döms är alltså **påståendet att en väg som nyligen var blöt fortfarande är blöt när den
fryser** — och om det påståendet räddar fler missar än det kostar i falsklarm.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

Samma princip som TROSKLAR-TRENDEN §2 och TROSKLAR-VATTENPLANING §2: dokumentet anger **svepet**,
grinden väljer värdet.

| Parameter | Vad den styr | Svep |
| :-- | :-- | :-- |
| **N** | hur länge efter sista regnet vägen räknas som blöt | 1 · 2 · 3 · 4 h |
| **N_varning** | samma sak, men när en aktiv SMHI-vintervarning täcker punkten (§2.3) | av · 2 · 4 · 6 h |
| **Minsta regn** | hur lite regn som räknas som "blöt väg" | > 0 · ≥ 0,2 · ≥ 0,5 mm/30 min |
| **r** | radarintensitet som räknas som regn på segmentet — gäller **`rate_mean_mmh`** | 0,1 · 0,5 · 2 mm/h |
| **Utfallsfönster** | hur länge efter fyrningen facit får komma | 60 · 120 · 180 min |

**Vad som INTE sveps:** yttröskeln (1 °C, bro 3 °C). Den är frysriskens egen och ändras inte av (a).
Riktningen sveps inte heller — "vägen var blöt" är fysik, inte parameter.

**SKALAN PÅ `r`, utskriven för att den annars gissas.** Svepet gäller **råradarvärdet** i
`rate_mean_mmh` — samma fält och samma skala som kalibreringsfaktorn 0,65 mättes på
(TROSKLAR-VATTENPLANING §3.4). I stationens skala motsvarar 0,1 · 0,5 · 2 ungefär
**0,15 · 0,8 · 3,1 mm/h**, eftersom radarvärdet **divideras** med 0,65 för att uttryckas i
stationens skala. Att blanda skalorna är precis den tysta drift som §3.4:s fältregel och
kontraktsgrinden (#144) finns för att fånga.

### 2.1 Två parametrar är redan strukna, av mätning

**RH-guarden är död.** Förstudien föreslog ett fuktvillkor (luftfuktighet ≥ RH_min) som skydd mot
"regnade vid lunch, torkade, frös på kvällen". Steg 0 (0b) mätte motsatsen: luftfuktigheten **stiger**
efter regnet — median 90 % vid +1 h, 95 % vid +4 h, ≥ 80 % i 74–84 % av fallen. En guard vid 80 eller
90 % filtrerar bort nästan ingenting och ger bara falsk precision. Struken ur svepet.

**Operatörens "Våt" är ute ur unionen tills vidare.** Steg 0 (0e) gav **OAVGJORT**: 33 Våt-rader i
väglagsarkivet, **noll** med en efterföljande klassning, noll nya rader i fönstret — arkivet står
stilla sedan 25/8. En proxy vars eftersläpning är omätbar får inte bära ett fuktvillkor. Frågan
öppnas igen när operatören klassar om vägar, alltså i vinter; då prövas den som egen proxy enligt
§4:s per-proxy-krav innan den släpps in.

### 2.2 N väljs av golvet, inte av svepet

Steg 0 mätte tillskottet vid två och fyra timmar: **22 respektive 25 arkivrader, 1 respektive 2
episoder**. Att fördubbla N fördubblar ungefär tillskottet, och kurvan har alltså **inget knä** i
det materialet. Det finns ingen punkt där fysiken säger "hit men inte längre".

Konsekvensen är att **falsklarmsgolvet i §4 sätter N**, inte svepet. Golvraden är därmed dokumentets
viktigaste, inte en formalitet.

### 2.3 N_varning — SMHI som prior på en redan öppen fråga (Bengts beslut 12/9)

**Var den kommer ifrån.** Kort #95 (d) skulle bygga en förstärkare av frysrisken ur SMHI:s
vintervarningar. Frågan blev: ska varningen få **skapa** en varning där stationen är torr (den
"breda" regeln) eller bara förstärka en som redan kvalificerar (den "smala")? Bengt valde **den
smala** (DECISIONS #123), och skälet gäller även här: **ett län är ingen punkt och ingen sträcka.**
En varning född ur en länspolygon skulle ligga på varenda väg i länet i åtta timmar, och de
stationer som är torra under en aktiv länsvarning är just de där varningen är lokalt fel — alltså
precis falsklarmen.

**Men SMHI vet två saker våra stationer inte vet:** ytan mellan stationerna, och **tiden före
händelsen** — varningarna publiceras i förväg. Den smala förstärkaren använder ingendera. Den här
parametern använder den andra, utan att uppfinna väta ur en polygon:

> **Utlösaren är oförändrad — stationens EGET uppmätta regn.** Vägen var mätbart blöt. Det enda
> varningen påverkar är **hur länge vi antar att den förblir det.** Är ett vinterväder enligt SMHI
> pågående över området är det mindre troligt att vägen hann torka.

**Detta är ingen gratis ändring, och det ska sägas rakt ut: N_varning FYRAR LARM som annars inte
fyrat.** Med N = 2 h och N_varning = 6 h lever frysriskgrenen fyra timmar längre. Skillnaden mot den
breda regeln är i art, inte i storlek: här finns alltid en uppmätt väta i botten. Därför gatas
N_varning **precis som varje proxy i §4** — B3-paret körs med och utan förlängningen, och den
överlever bara om den räddar missar utan att bära mer än sin del av falsklarmen.

**Vilka varningar räknas:** samma smala kodmängd som förstärkarens F1 (`SNOW_ICE`, `ICING`), nivå
enligt dess F2. Sveps inte om här — ändras den där ändras den här.

⚠️ **Hård begränsning som inte går att förhandla bort:** `smhi_warnings_history` bar inte varningens
**giltighetsfönster** förrän `sql/015` (12/9, DECISIONS #121). Arkivet visste när en varning
publicerades, inte när den gällde — och SMHI publicerar i förväg. **N_varning kan därför bara dömas
på varningar skrivna efter 12/9.** Andelen rader med okänt fönster ska stå i varje utfall, och
rader med okänt fönster räknas som "vet inte", aldrig som "ingen varning".

---

## 3. Givarvakt — obligatorisk, ärvd, och inte förhandlingsbar

Varje fråga i det här dokumentet som läser yttemperatur **måste** bära givarvakten (#75):

```sql
air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
```

**Skälet är mätt och drastiskt.** Av 317 frostrader (yta ≤ 1 °C) i ett fjortondygnsfönster föll
**194 — 61 %** på vakten: ytan låg mer än 12 ° under luften, värst −49,9 °C. **Noll** rader saknade
lufttemperatur, så det är inte okontrollerbar data utan **trasiga givare**. Utan vakten är sex av tio
frostfall skrot, och varje tal i grindarna nedan blir meningslöst.

Kravet är strängare än snapshotens egen vakt: lufttemperaturen måste **finnas**, så att rimligheten
alls går att pröva. En station vi inte kan kontrollera får inte bära en dom — silence is a feature
gäller mätningen med.

*Det här gäller bortom det här kortet: #88:s trend och #98:s tystnadsfel läser samma kolumn och har
inte vakten skriven i sina dokument (DECISIONS #106). En rad att lägga till när de byggs.*

---

## 4. Grindarna för (a)

### Regelskissen som döms

```
N_eff = N_varning  om en aktiv SMHI-vintervarning täcker punkten   (§2.3, annars N)
        ANNARS N

blöt = fukt_nu
     ELLER regn_sum_mm > Minsta regn inom N_eff h vid stationen    (VViS, 30-min, 89 % täckning)
     ELLER radar_precip.rate_mean_mmh > r inom N_eff h på segmentet (radar, redan i arkivet)

icing_point = yta <= tröskel  OCH  blöt
```

Allt annat i `icing_point` (tröskel, bro, räckvidd, repris, prioritet A2) är oförändrat.
Utvidgningen är en **strikt superset**: varje larm som fyrar i dag fyrar också med den.

**Varje proxy gatas för sig.** En union av svaga signaler är en falsklarmsmaskin om ingen mäts
ensam. B3-paret nedan körs **per proxy**, och den proxy som inte räddar missar utan att kosta
falsklarm tas bort ur unionen innan röst.

**N_varning gatas som en egen proxy, fast den inte är en.** Den lägger ingen ny signal till unionen
— den förlänger fönstret för de två som redan finns. Men den fyrar larm som annars inte fyrat
(§2.3), så B3-paret körs **med och utan** förlängningen, och den överlever bara om den räddar missar
utan att bära mer än sin del av falsklarmen. Kan den inte dömas på varningar med känt
giltighetsfönster sätts den till **av**, aldrig till ett gissat värde.

### Ö-A — Finns hålet och finns underlaget? ✅ **BESVARAD 12/9**

| # | Mått | Krav | Utfall |
| :-- | :-- | :-- | :-- |
| Ö-A1 | Andel regnstopp där mätaren visar regn när fukten slår om | > 50 % | **76 %** (120/157) |
| Ö-A2 | Hur länge mätaren står kvar över noll efter omslaget | median > 15 min | **35 min** |
| Ö-A3 | Population: användbara regnstopp per dygn i riket | ≥ 10 | **22** |

Grinden är passerad. Hålet finns, är brett, och det finns tillräckligt med tillfällen för att mäta
på. **Detta bevisar inte att utvidgningen är rätt** — bara att frågan är värd att ställa.

### Ö-B — Skuggdriften: räddar utvidgningen mer än den kostar? (döms vid frost)

Skuggkolumn bredvid dagens `icing_point`, ingen röst. **B3-paret** (TROSKLAR-TRENDEN §4 T-B,
TROSKLAR-TYSTNADSFEL §5): för varje kandidat-N och varje proxy, två tal.

| # | Mått | Fällt värde (Bengt) |
| :-- | :-- | :-- |
| Ö-B1 | **Nettonytt:** facit-halttillfällen som utvidgningen räddar och dagens regel missade | **≥ 5 %** av facit inom räckvidd |
| Ö-B2 | **Priset:** tillkomna falsklarm på tillfällen som inte blev hala | **≤ 25 %** av tillkomna fyrningar |

Två kurvor mot N; där marginalen korsar sitter N. Talen är golv mot brus i trendens mening — de är
gissade som golv, inte som trösklar, och fastställs av Bengt.

**Ord-per-resa är INTE ett fällande kriterium.** Det fanns i utkastet efter Axels granskning och
ströks 12/9 (DECISIONS #103) efter Bengts fältkörning: cry wolf handlar om **falska** varningar, och
en sann varning som upprepas är redundans. Röstkostnaden redovisas som **beskrivning** i §7, aldrig
som grind — kostnaden bärs av Ö-B2, där den hör hemma.

### Ö-C — Domens giltighet (utan C fälls ingen dom alls)

| # | Villkor | Fällt värde |
| :-- | :-- | :-- |
| Ö-C1 | Regn-följt-av-frost-nätter i underlaget | **≥ 30** |
| Ö-C2 | Stationer som bidragit | **≥ 20** |
| Ö-C3 | Spridning i tid | båda halvorna av perioden |
| Ö-C4 | **Fysikkontrollen** | träffarna ska toppa efter midnatt och vara vanligast klara, vindstilla nätter |

Ö-C4 är inte kosmetisk. Faller träffarna jämnt över dygnet mäter vi något annat än utstrålningshalka,
och då är regeln rätt av fel skäl — vilket inte är rätt.

### Ö-D — Läsfönstret (ny, och den kan fälla allt det andra)

**Varje avläsning som bygger på minutupplösning måste ske inom sju dygn efter händelsen.** Gallringen
(kort #83, sql/014) tunnar allt äldre än sju dygn till en rad per station och halvtimme, och då kan
arkivet inte längre säga **när** regnet slutade.

Mätt 12/9 (DECISIONS #97): den ogallrade veckan gav 157 användbara omslag av 1 971; den gallrade gav
**32 av 5 175**. Avkastning 8 % mot 0,6 %. Läses frostnätterna för sent blir Ö-A och Ö-B OAVGJORT —
raderna finns kvar, men de bär inte svaret.

Därför: **frostlarmet i vakthunden (DECISIONS #98) är en del av den här grinden**, inte en
bekvämlighet. Det larmar när ≥ 50 stationer haft vägyta ≤ 0 °C ett dygn, och avläsningen ska ske
inom sju dygn efter det.

---

## 5. (b) Oljefilmen — STRUKEN

**BESLUT: struken av Bengt 2026-09-12, vid fastställandet av det här dokumentet.** Första regnet
efter torka byggs inte, mäts inte och skuggas inte. Kortet #89 krymper därmed till (a) plus
överlämningen i §6.

**Vad strykningen gör med de öppna frågorna:** den förra versionens §5.6-fråga till Axel — *är
oljefilm inom Halkvakts löfte?* — **förfaller**. Den behöver aldrig ställas, och kortet bär inte
längre en spärr som väntar på någon annan.

**Vad mätningen redan hade visat, och som står kvar som dokumenterat nej** (steg 0, fråga 0d): 55
äkta torrperioder ≥ 5 dygn i arkivet, med **6 olyckor** i 20-minutersfönstren mot V-B-grindens krav
på 15. Grinden var alltså **inte nåbar denna höst** oavsett beslut, och höstregnen är ett fönster
som stänger när vintern kommer. Dessutom var instrumentet svagt på ett sätt som inte var lagat: 0d
räknade olyckor utan förväntat antal, så sex var ett tal och inte ett bevis.

**Om frågan någon gång tas upp igen** ska den börja om från §9 steg 0 med en nollhypotes i
instrumentet, inte från den här texten. Husregeln gäller: ett dokumenterat nej är ett bra utfall, och
det som inte klarar sin grind läggs ner — inte parkeras.

---

## 6. (c) Interaktionerna — överlämnas, byggs inte här

De tre paren är inte tre av samma sort, och överlämningen anger vilket **lager** var och en hör till
(OVERGANGAR-ANALYS §1b.2):

| Par | Lager | Ägare | Vad som ska stå i deras dokument |
| :-- | :-- | :-- | :-- |
| Dimma × frysrisk = rimfrost | **1 — övergångsorsak** | **#46** | Sikt < X m som **konfidenshöjare för kondensationsvillkoret**, inte egen fara, inte egen prioritet |
| Sidvind × halka | **2 — riskmodifierare** | **#90** | Förvillkor eller längre försprång, #68 som mall, ingen historik |
| Dimma-som-sikt × halka | **2 — riskmodifierare** | **#90** | Samma |

**Lager 1 kräver minne** (tillståndsskattaren, §9 steg 2) och kan inte byggas förrän den finns.
**Lager 2 kräver bara att båda signalerna finns i snapshoten samtidigt** och byggs som en rad plus en
vektor. De två lagren delar inte kort, nyckel eller mått.

**Rättelse att bära med:** DECISIONS #68 *beslutade* interaktionen halka × vattenplaning, men den
byggdes aldrig — motorn har fem faror och `aquaplaning` är ingen av dem. #68 visar alltså **formen**
en lager 2-regel ska ha, men bevisar den inte. Första lager 2-regeln som faktiskt skrivs blir
precedensen.

---

## 7. Kommunikation, interaktion och röstbudget

**Rösten ändras inte av (a).** Det är samma larm som i dag, oftare rätt. Ingen ny text, ingen ny
plats i A-skalan, ingen PRODUKTBOK-ändring. (b) kräver däremot allt det, och bara efter Axels ja.

**Partitionen mot #46 (rimfrosten) — avgörande för att inte dubbelräkna.** Fysiken har två
varianter:

- *Fuktig efterhalka:* regnet slutar, daggpunkten ligger kvar högt, ytan strålar ut och faller
  **under daggpunkten** → kondensation ovanpå regnvattnet. **#46 äger fallet** (yta ≤ daggpunkt).
- *Torr efterhalka:* kallfront passerar, daggpunkten faller långt under ytan, regnvattnet fryser utan
  kondensation. #46 är tyst. **(a) äger fallet** (yta > daggpunkt men regn inom N h).

Regeln: **#46 när yta ≤ daggpunkt, (a) när yta > daggpunkt.** Tystnadsfelet räknar då varje miss en
gång.

**Röstbudgeten redovisas, men dömer inte.** Steg 0 mätte tillskottet i två enheter:

| Enhet | Frostfall | Larmar i dag | Med N = 4 h | Kvot |
| :-- | --: | --: | --: | --: |
| Arkivrader | 123 | 2 | 27 | 13,5 × |
| **Episoder** | 15 | 2 | 4 | **2,0 ×** |

**Röst räknas i episoder, aldrig i arkivrader.** Motorn talar högst en gång per 45 s, aldrig samma
larm inom 10 min eller 5 km, och läser en snapshot var tionde minut — en station som är frusen hela
natten ger 8,2 arkivrader men **ett** larm per förbipasserande förare. Ett radtal som citeras som
röstpåstående är ett mätfel.

Talen är septembertal med nämnaren utskriven: 2 fall som blir 4, över fjorton dygn, på 6 stationer.
De ska mätas om på vinterdata som beskrivning innan Ö-B döms.

---

## 8. Facit — vad kortet döms mot

Ur den fastställda stacken (DECISIONS #94):

| Källa | Får bekräfta träff | Får fälla falsklarm |
| :-- | :-- | :-- |
| Omklassning till halka/is i `road_condition_history` nära stationen | ja | ja |
| Kamerafacit (#20, bild i gryningen) | ja | ja |
| Olycka i `situation_archive` inom räckvidd | ja | nej |

**Räckviddsvillkoret gäller** (TROSKLAR-TYSTNADSFEL §6): en miss räknas bara där systemet hade en
chans att tala. Frånvaro av olycka är inte frånvaro av risk — samma asymmetri som i
TROSKLAR-VATTENPLANING §2.

**Försäkringsbolagen ingår inte.** Spåret är stängt (DECISIONS #94) och (a) väntar inte på det.

---

## 9. Ordning — vad görs när

| Steg | Vad | När | Grind |
| :-- | :-- | :-- | :-- |
| 0 | Mät hålet — sex frågor | ✅ **klart 12/9** | Ö-A passerad |
| 1 | **Detta dokument** | ✅ **12/9** | Bengt fastställer |
| 2 | Tillståndsskattaren i skuggloggen, per segment | efter 14/9 | egen träffsäkerhet mot operatörens klasser FÖRE någon övergångsregel läser den |
| 3 | (a) som skuggkolumn | efter 14/9 | Ö-B, döms vid frost inom **sju dygn** (Ö-D) |
| 4 | "Regn inom N h" som fjärde signal i TYSTNADSFEL §3 | med detta dokument | rad i DECISIONS |
| 5 | (c) överlämnas till #46 och #90 | med detta dokument | tavlan |
| 5b | **N_varning (§2.3)** — sveps i steg 3, döms bara på varningar skrivna efter `sql/015` | med steg 3 | B3 med och utan |
| 6 | Röst | mars, efter dom och Axels ja | — |

**Tidskritiskt:** steg 3:s dom har samma fönster som #88:s T-A — höstens första frostnätter, som inte
kan tas ikapp. Steg 2 måste därför stå klart innan frosten, annars finns ingen skugga att döma.

---

## 10. Ändring

Fram till första skuggkörningen får §2:s svep och §4:s krav justeras av vem som helst av oss med en
rad i DECISIONS. **Från första skuggkörningen ändras ingen tröskel alls** — varje motivering som inte lutar sig mot utfallet — att flytta målstolparna när siffrorna kommit är precis
vad regeln finns för att hindra.

Fem ändringar är redan gjorda och ska inte göras om: RH-guarden struken (§2.1), ord-per-resa struket
som fällande kriterium (§4, DECISIONS #103), **(b) oljefilmen struken (§5, Bengt 12/9)**,
**N_varning tillagd i svepet (§2.3, Bengts beslut 12/9, DECISIONS #123)** och **radarfältet bytt
från `rate_max` till `rate_mean_mmh` (§2 och §4, Bengts order 13/9, DECISIONS #161)**. Alla fem
skedde före första skuggkörningen och vilar på mätning, fältdom respektive beslut — inte på utfall.

📎 **Om radarfältet (13/9).** Bytet är inte en justering mot ett utfall utan en **tvingad rättelse**:
`rate_max_mmh` står som UTANFÖR SPANN hos värdevakten sedan 727,54 mm/h hittades i det (DECISIONS
#134) och får enligt TROSKLAR-VATTENPLANING §3.4 inte bära tröskel eller utlösare. Bytet gör
dessutom dokumentet **mer** konsekvent, inte mindre: svepets tal 0,1 · 0,5 · 2 kommer ur
bekräftelsekurvans radarband, och de banden mättes på `rate_mean_mmh`. Att använda dem på
`rate_max` var alltså felmatchningen — inte tvärtom.

⚠️ **Förstudien bär den gamla formuleringen.** `docs/OVERGANGAR-ANALYS.md` rad 273 säger fortfarande
`rate_max > r`. Den är ett daterat underlag och redigeras inte i efterhand; **det här dokumentet
gäller**, och den raden är därmed ersatt.

📎 **Historik:** §2.3 lades till 12/9 efter att dokumentet fastställts. Regeln i
stycket ovan säger att tillägget är tillåtet med en rad i DECISIONS så länge ingen skuggkörning
gjorts. Axel har läst parametern och är underrättad; den **blockerar ingenting** (Bengts beslut
12/9, DECISIONS #132 — mätningen är Bengts område, motorn och rösten är Axels).

---

*Källor: TAVLA.md #89, #42, #45, #46, #75, #81, #83, #88, #90, #95, #98; docs/OVERGANGAR-ANALYS.md
(förstudien, fem läsningar); docs/TROSKLAR-TRENDEN.md §2/§4/§8; docs/TROSKLAR-TYSTNADSFEL.md
§3/§5/§6; docs/TROSKLAR-VATTENPLANING.md §2/§3; **docs/TROSKLAR-SMHI-FORSTARKAREN.md §1.1/§2 (F1,
F2 — kodmängden N_varning läser)**; DECISIONS #4, #68, #71, #94, #96, #97, #98, #100,
#103, #104, #106, **#121, #123**; engine/src/engine.ts:189–193, types.ts:6–10;
publish/snapshot-core.ts:42; ingest/sources/weather.ts:42–56; sql/009_radar_precip.sql,
sql/014_gallring.sql, **sql/015_smhi_giltighet.sql**;
scripts/overgangar-steg0.ts (steg 0, körningar 34579255737 · 34580876588 · 34590257682).*
