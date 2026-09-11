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

*Tredje läsningen 11/9 (Bengts fråga "var kommer tillståndsövergångarna in?"): de kom inte in alls,
och det var förstudiens största brist. §1b nedan är ramen som saknades — vägytan är ett tillstånd,
händelserna är övergångar, och motorn minns resan men inte vägen. §9 steg 2 är omskrivet därefter.*

*Fjärde läsningen 11/9 (Bengts frågor "täcks vattenplaning in? är rimfrost ett tillstånd? gäller
samma för sidvind × halka?"): ja, ja, och nej — och nejet är poängen. Vattenplaning är ett tillstånd
(vattenfilm) och saknades i grafen. Rimfrost är ett tillstånd (is), dimma och frysrisk är dess
orsaker. Men sidvind och dimma-som-sikt ändrar inte ytan alls; de ändrar faran för föraren givet en
yta. Det är ett ANNAT lager, byggs utan minne, och §6 hade blandat ihop de två. §1b har nu två lager,
§6 är omskriven, §9 steg 0 räknar sex frågor i stället för tre.*

*Femte läsningen 11/9 (Axels granskning, efter att steg 0 körts): kärnpåståendet verifierat av
honom oberoende, och han vände på mätriktningen — från FROSTEN i stället för från regnstoppen.
Det var rätt, och min riktning var fel vald: falsklarmsrisken skalar med fyrningar, inte med
tillfällen. Hans riktning tål dessutom gallringen bättre. Tre saker följde: §4.7 (röstbudgeten)
är ny och täpper det hål han hittade — dokumentet sa ingenting om vad utvidgningen gör med rösten,
och åberopade husregeln "tystnad är en funktion" för (b) men inte för (a), där den är mer hotad.
§4.3 säger nu att N sätts av golvet, inte av svepet. Och (b) flyttas ur steg 0 till en fråga till
Bengt, som §5.6 alltid sagt men §9 motsade.*

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
- `engine/src/types.ts:33` säger `moisture?: boolean; // rain/snow/wet surface at the station`.
  Kommentaren lovar "wet surface"; implementationen levererar nederbörd nu. Den som läser typen
  tror att hålet inte finns. Kommentaren bör rättas i samma varv som (a) byggs, inte förr.

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

## 1b. Ramen som förstudien saknade: vägytan är ett tillstånd (tillägg 11/9)

Bengts matris på kort #45 (4/9), ordagrant: *"vägytan är ett TILLSTÅND (torr → blöt → slask/modd →
snöbelagd → packad snöväg) och nederbörden en ÖVERGÅNG ovanpå det. Farligast är korsningarna."*
Och: *"Klassningen ska därför korsas med segmentets NUVARANDE väglagsstate, inte bara klassa det som
faller."*

Det är ramen. §2.2:s tre punkter, #45:s två övergångar, #46:s rimfrost och #88:s trend är alla
**kanter i samma graf**. Förstudiens första två versioner analyserade tre kanter var för sig utan att
rita grafen. Här är den, med ägare:

| Från | Till | Genom | Fara | Ägare |
| :-- | :-- | :-- | :-- | :-- |
| torr | blöt | första regnet efter ≥ D torrdygn | oljefilm | **#89 (b)** |
| torr | blöt | regn (annars) | ingen — blöt väg vid +8 °C är inte en fara | — |
| blöt | vattenfilm | kraftigt regn, dålig avrinning, hjulspår | vattenplaning | **#42** (saknades i första grafen — fjärde läsningen) |
| torr | is | kondensation, yta ≤ daggpunkt, klar natt — dimma gör den trivial | rimfrost | **#46** |
| blöt | is | yta faller under 0 medan vägen är blöt | efterhalka | **#89 (a)** — och #46 när daggpunkten nås först (§4.6) |
| torr/blöt | snöig | snöfall på bar väg | första snön | **#45** |
| snöig/packad | lös snö ovanpå | snö på snö | dold packad bana | **#45** |
| snöig/packad | is | regn på snö, polerar | den farligaste | **#45** |
| is/snöig | slask/blöt | tö, temperaturen stiger genom 0 | slask, vatten på is | **ingen** |
| blöt | torr | avdunstning | ingen fara — men *när ska rösten tystna?* | **#88** (stigande sida) |
| is | blöt | saltbil | ingen fara — men varningen ska släckas | **ingen källa** (källkartläggningen rad 222) |

Tre saker följer, och de är viktigare än något enskilt i §4–§6:

**1. Motorn minns resan men inte vägen.** VERIFIERAT: `engine.ts:50–54` bär `prevFix`, `odometerM`,
`lastHeadingDeg`, `lastSpokenT` och `fired`-kartan — allt om *bilen* och vad som redan *sagts*.
Ingenting om vad *ytan* var för en timme sedan. Varje fara utvärderas ur ögonblickets värden i
snapshoten. Fukthålet i §1 är därför inte ett fel i ett villkor utan **ett symptom**: en motor utan
tillstånd kan inte veta att vägen var blöt, bara att det regnar. Regnhistorik, daggpunkt, radar och
operatörens "Våt" (§4.6) är fyra sätt att **skatta ett tillstånd som motorn inte bär**.

**2. Tillståndet måste skattas, för det kan inte observeras i skala** (§1: ytstatusgivare på 30–50
av 750 stationer). Skattaren är en funktion av operatörens klass när den finns (Torrt, Våt, Slask,
Snöigt, Is och snö, Packad snö — hela alfabetet är operatörens, kodgrinden mäter det), regn- och
snöhistorik (station + radar), yttemperatur mot noll, daggpunkt mot yta, och tid sedan sista
händelse. Den har ett eget facit: **stämmer skattat "blöt" med operatörens "Våt" när båda finns,
och skattat "is" med omklassningen till halka?** Det är en mätning i sig, före någon övergångsregel.

**3. Övergångsreglerna blir enkla när tillståndet finns.** (a) = tillstånd ∈ {blöt} OCH yta passerar
≤ 1. (b) = tillstånd = torr sedan ≥ D dygn OCH regn börjar. Regn på snö = tillstånd ∈ {snöig,
packad} OCH regn börjar. Rimfrost = tillstånd = torr OCH yta ≤ daggpunkt. Utan gemensamt tillstånd
härleder varje regel "vad vägen var" på sitt eget sätt — (a) ur regn inom N h, (b) ur torrdygn, #45
ur operatören — och de kommer att säga emot varandra. Med det delar de en skattare och mäts var för
sig.

**Vad som INTE följer, och det är lika viktigt:** att bygga en tillståndsmaskin i motorn nu. Motorn
är ren, plattformsfri och vektorbunden i tre språk; en arkitekturändring där, före en enda övergång
klarat sin grind, är "våning två före grunden" (#45:s egna ord om radarn). Tillståndsskattaren hör
hemma **i skuggloggen först** — en kolumn per segment, beräknad i Supabase ur arkivet, dömd mot
operatörens klasser. Övergångsreglerna läser den kolumnen som skuggkolumner. Motorn rörs när en
övergång bevisat sig, och då som en kolumn i snapshoten (skattat tillstånd per segment, märkt
MODELLERAT), inte som minne i motorn. Det håller motorn ren och tillståndet mätbart.

**Två celler saknar ägare:** töet (is → slask när temperaturen stiger — vatten på is är halt på ett
annat sätt än is, och rösten tystnar i dag när ytan passerar +1) och saltbilen (ingen öppen källa,
känt sedan källkartläggningen). Töet är en kandidat till eget kort; saltbilen är ett dokumenterat hål.

### 1b.2 Det andra lagret: riskmodifierare som inte rör ytan (fjärde läsningen 11/9)

Grafen ovan är **lager 1: yttillståndet**. Noderna är torr, blöt, vattenfilm, slask, snöig, packad
och is. Kanterna är övergångarna. Allt i lager 1 kräver **minne** — man måste veta vad ytan *var* för
att veta vad den *blev*. Det är därför skattaren (§9 steg 2) finns.

Men flera saker på korten är inte tillstånd och inte övergångar. De ändrar inte ytan. De ändrar
**faran för föraren givet en yta**:

| Modifierare | Vad den gör med en given yta | Källa | Ägare |
| :-- | :-- | :-- | :-- |
| Fart | vattenfilm blir vattenplaning först över ~70 km/h; is är farligare i 110 än i 50 | telefonen, motorn har `minSpeedKmh` redan | #42 (fartgrinden) |
| Sidvind, byvind | is + sidvind på bro/slätt: släp och husbil tappar greppet i båda leden | VViS `wind_gust_ms`, arkiverad sedan 9/9 | **#90** |
| Dimma som sikt | is + kort sikt: reaktionstiden räcker inte till varningens försprång | VViS `visibility_m`, arkiverad sedan 9/9 | **#90** |
| Däck och fordon | sommardäck vid +3 är halare än dubb vid −5; släp ändrar vad vind betyder | inställning på enheten, lämnar aldrig telefonen | **#92** |
| Mörker | samma is, sämre chans att se den | ingen källa i dag (solhöjd vore trivial) | ingen |

Det här är **lager 2**, och det har tre egenskaper som skiljer det från lager 1:

1. **Inget minne.** En modifierare gäller om den är sann *nu*, oavsett historik. Sidvind × halka
   behöver inte veta att det blåste för en timme sedan. Därför behöver lager 2 **inte skattaren**.
2. **Byggs som regler i motorn**, av det slag som redan finns: #68 (halkan vinner, vattenplaningen
   vilar ≤ +4 °C) och vattenplaningens fartgrind är lager 2-regler. Mönstret är förvillkor,
   prioritet eller modifiering av försprång — testbart som egen vektor i tre portar.
3. **Vattenplaningen bevisar redan mönstret.** VATTENPLANING-ANALYS §1: "vattenfilm på vägbanan,
   fart och däckens skick". Det är lager 1 × lager 2 × lager 2. Designen finns; den var bara inte
   namngiven som ett mönster.

**Dimma sitter i båda lagren, och det är inte en motsägelse.** Som *orsak* gör den kondensation
trivial (RH ≈ 100 % ⇒ daggpunkt ≈ luft ⇒ ytan under daggpunkten så fort den är kallare än luften):
det är lager 1, övergången torr → is, ägare #46. Som *sikt* förkortar den reaktionstiden på vilken
yta som helst: det är lager 2, ägare #90. Samma givare, två helt olika roller.

**"Frysrisk" och "halka" är inte tillstånd — de är namn på larm om tillstånd.** Frysrisk är motorns
skattning att ytan är eller strax blir is (`icing_point`: yta ≤ 1 och fukt). Halka är operatörens
observation att ytan ∈ {is, snöig, packad …} (`slippery_segment`). Bengts fråga "är dimma och
frysrisk tillstånd?" har därför svaret: nej, ingen av dem — dimma är en orsak (lager 1) eller en
modifierare (lager 2), frysrisk är ett larm om lager 1-noden *is*. Rimfrost är däremot ett tillstånd:
det är *is*, nådd via kondensation.

**Arkitekturkonsekvensen, som §6 hade fel om:** lager 1 kräver skattaren och kan inte byggas förrän
den finns. Lager 2 kräver bara att båda signalerna finns i snapshoten samtidigt, och kan byggas som
#68 byggdes — en rad i tröskeldokumentet, en vektor, ingen historik. De två lagren ska inte dela
kort, nyckel eller mått.

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

**HAR, MEN KAN INTE LITA PÅ — mätt 11/9, och det gäller långt bortom det här kortet.** Av 317
frostrader (yta ≤ 1 °C) i ett fjortondygnsfönster föll **194, alltså 61 %**, på givarvakten (#75):
ytan låg mer än 12 ° under luften, värst −49,9 °C. Noll rader saknade lufttemperatur, så det är
inte okontrollerbar data utan **trasiga givare**. Varje mätning som läser yttemperatur måste
därför bära vakten `air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12`, annars är sex
av tio frostfall skrot. Det gäller #88:s trend och #98:s tystnadsfel lika mycket som (a), och står
inte i något av deras tröskeldokument i dag.

**Har inte:** vägens faktiska blöthet i skala (§1). Saltbilens passage (ingen öppen källa,
källkartläggningen rad 222). Olyckans orsak. Spårdjup (DECISIONS #66).

**Har, men förbisåg i första versionen (tillägg 11/9 efter Bengts fråga "har vi förbisett något i
pipen?" — VERIFIERAT):**
- **`radar_precip`, per SEGMENT** (sql/009): `rate_max_mmh`/`rate_mean_mmh` per segment och
  5-minuterskomposit, skriven en gång i timmen av `ingest/radar.ts` sedan 2/9 (kort #43 steg 3).
  Regnhistorik finns alltså redan på segmentnivå, inte bara vid stationen. Timvis sampling av
  5-minutersbilder: en skur som börjar och slutar mellan två prov syns inte, men "regnade det på
  det här segmentet de senaste 2–4 timmarna" går att svara på i dag.
- **Operatörens "Våt"** i `road_conditions.condition_info` (kodgrinden 11/9: 25 "Våt" + 8
  "fläckvis Våt" i arkivet). Trafikverkets egen klassning av att vägbanan är blöt — segmentnivå,
  mänskligt bedömd, ~var 15:e minut. **Helt oanvänd nedströms:** snapshoten filtrerar bort kod 1
  utan vinterord (snapshot-core.ts:84–85) och motorn säger uttryckligen att "Normalt/Våt segments
  make no sound" (engine.ts:240). Hur länge "Våt" står kvar efter regnet är okänt och avgör värdet.
- **Daggpunkten** (#46) — planerad, inte förbisedd, men underskattad i §10 nedan: yta ≤ daggpunkt
  betyder att vatten kondenserar på vägen just nu, alltså ett blöt-signal i sig.

Vad som **inte** finns, trots §2.8: SMHI:s molnmängd. `scripts/smhi-prov.ts` hämtar bara
parameter 1 (lufttemperatur), live, och lagrar ingenting. Bara `smhi_warnings` (varningsklasser) är
i arkivet. §2.8:s "molnmängd som representativitetsradie" är helt framtida.

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

    blöt = fukt_nu
         ELLER regn_sum_mm > 0 inom N h vid stationen          (VViS, 30-min, 89 % täckning)
         ELLER radar_precip.rate_max > r inom N h på segmentet  (radar, redan i arkivet — §3)
         ELLER segmentet är "Våt" enligt operatören             (RoadCondition, oanvänd — §3)
    icing_point = yta <= tröskel  OCH  blöt

*(Reviderad 11/9: första versionen hade bara stationsregnet. De tre proxyerna är inte likvärdiga —
§4.6 rangordnar dem — och de ska gatas var för sig: B3-paret per proxy avgör vilka som förtjänar
sin plats. En union av fyra svaga signaler är en falsklarmsmaskin om ingen mäts ensam.)*

Daggpunkten (#46, yta ≤ daggpunkt) är den fjärde blöt-signalen men hör till ett annat kort och en
annan fysik (kondensation, inte kvarvarande regnvatten); §4.6 säger hur de delar fallen.

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
| ~~**RH_min**~~ | ~~fuktguard mot torkad väg~~ | **STRUKEN 11/9** — 0b visar att fuktigheten STIGER efter regnet (median 90 % vid +1 h, 95 % vid +4 h). En guard vid 80 eller 90 % filtrerar bort nästan ingenting och ger bara falsk precision. |
| **Minsta regn** | hur lite regn som räknas som "blöt väg" | > 0 · ≥ 0,2 · ≥ 0,5 mm/30 min |
| **Utfallsfönster** | hur länge efter fyrningen facit får komma | 60 · 120 · 180 min |

Vad som INTE sveps: yttröskeln (1 °C / bro 3 °C). Den är frysriskens och ändras inte av (a).

**Och N väljs inte av svepet — det väljs av golvet.** Steg 0 mätte tillskottet vid 2 h och 4 h:
22 respektive 25 rader, 1 respektive 2 episoder. Att fördubbla N fördubblar ungefär tillskottet,
och kurvan har alltså inget knä i det här materialet. Det finns ingen punkt där fysiken säger
"hit men inte längre". Därmed är det **falsklarmsgolvet och röstbudgeten (§4.7) som sätter N**,
inte svepet — och de två raderna i §4.4 blir dokumentets viktigaste, inte en formalitet.

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

**Grinden har ett tredje krav sedan 11/9: ORD PER RESA.** B3-paret mäter om utvidgningen har rätt.
Det mäter inte om den är uthärdlig. Ett tillskott som räddar missar men fördubblar rösten ska kunna
falla på röstkriteriet ensamt, utan att B3 ens behöver vägas. Se §4.7 för talen och för varför måttet
måste räknas i episoder och inte i arkivrader.

ATT VERIFIERA (vintern): allt ovan. T-A-liknande grind: minst 30 regn-följt-av-frost-nätter, minst
20 stationer, båda halvorna av perioden. Fysikkontrollen: träffarna ska toppa efter midnatt och vara
vanligast klara nätter.

### 4.5 Relationen till #88 (trenden)

RESONEMANG: de överlappar inte, de staplas. Trenden säger *"risk framöver"* när ytan faller mot noll
med daggpunkten nära — det är förvarningen. (a) är själva träffen: när ytan passerar 1 °C på en väg
som är blöt av regn ska frysrisken fyra. Utan (a) skulle trenden varna, och sedan skulle den verkliga
frysningen vara tyst — en incoherent röst. Med (a) hänger de ihop: förvarning, sedan larm.

### 4.6 Andra fuktproxies i pipen — vad som kompenserar hålet, rangordnat (tillägg 11/9)

Bengts fråga: *har vi förbisett något i pipen som kompenserar det här på annat sätt, t.ex. bygget av
§2.8?* Svaret är ja — men §2.8 är inte det. Rangordnat efter vad som faktiskt finns i dag:

**1. Radarn (#43) — redan i arkivet, per segment, förbisedd i första versionen.** `radar_precip`
skrivs timvis sedan 2/9 (§3). Det gör att (a) kan vara **segmentnivå från dag ett**: "regnade det på
den här sträckan" i stället för "regnade det vid närmaste station". Det är dessutom precis det
§2.8:s "3 km fram"-stack vill ha: radar säger *var* det regnade, stationen säger *hur kall ytan är*
vid ankaret, terrängen (#91/#96) säger om sträckan är kallare än ankaret. Datat är inte låst bakom
14/9 — det skrivs nu. Bara *ny* radarkod är det (#81 steg B).

**2. Daggpunkten (#46) — planerad, och den DELAR efterhalkan med (a).** RESONEMANG, fysiken har två
varianter som är olika vanliga och fångas av olika regler:
- *Fuktig efterhalka* (fronten stannar, luften förblir fuktig): regnet slutar, daggpunkten ligger
  kvar högt, himlen klarnar, ytan strålar ut och faller **under daggpunkten** → kondensation ovanpå
  regnvattnet → is. Här fyrar #46:s regel (yta ≤ daggpunkt). (a) behövs inte för att larma, bara
  för att förklara varför.
- *Torr efterhalka* (kallfront passerar): regn, sedan torr kall luft bakom fronten, daggpunkten
  **faller** långt under ytan, himlen klarnar, regnvattnet fryser utan någon kondensation. #46 är
  tyst (yta > daggpunkt). Bara regnhistoriken ser det. Det är det klassiska svenska höstmönstret
  med nordvästlig kallfront, och det är (a):s egentliga domän.
Så: inte dubbelräkning utan **partition**. Tröskeldokumentet ska säga att #46 äger fallet när yta ≤
daggpunkt och (a) när yta > daggpunkt men regn inom N h. Tystnadsfelet räknar då varje miss en gång.

**3. Operatörens "Våt" — ingesterad, oanvänd, värde okänt.** Trafikverkets egen bedömning att
vägbanan är blöt, på segmentnivå, ~var 15:e minut. Om den står kvar timmar efter regnet är den den
bästa proxyn av alla: mänsklig, per sträcka, gratis. Om den släcks när regnet slutar är den
värdelös för (a). ATT VERIFIERA nu, i höstregnen: när ett segment blir "Våt", hur länge står det
kvar, och hur förhåller sig det till `rain_sum_mm` vid närmaste station? Det är en fråga till
steg 0 (§9), inte till vintern.

**4. SMHI (§2.8) — ingenting i dag, en skärpare i morgon.** Bara lufttemperatur hämtas, inget
lagras (§3). Molnmängden, när den finns, är inte en blöt-signal utan en **frys-signal**: klar himmel
= utstrålning = ytan faller. Den skärper trenden (#88) och (a):s dom — "risk som inte föll ut"
blir tolkbar om man vet att molnen rullade in — men den fyller inte hålet i fuktvillkoret. §2.8:s
egen punkt 4 ("nederbördstyp och -mängd per timme till #89") överträffas redan av VViS (30 min) och
radarn (5 min) i kadens; SMHI:s bidrag där är täckning inåt landet, inte precision.

**Slutsats för (a):** hålet har tre kompensationer i pipen, varav en skriver data i dag och en är
oanvänd. Regelskissen i §4.2 är reviderad till en union av proxyer, var och en gatad för sig.
Ordningen i §9 ändras inte, men steg 0 får två frågor till (radarn och "Våt"), och steg 2:s
regnhistorik ska byggas per segment ur radarn, inte bara per station ur VViS.

### 4.7 Röstbudgeten — vad utvidgningen gör med tystnaden (nytt 11/9, Axels invändning)

Dokumentets första version behandlade (a) som en ren vinst: "en strikt superset, kan bara lägga till
larm". Just den formuleringen döljer kostnaden. Husregeln **tystnad är en funktion** åberopades för
(b) i §5.2 men inte för (a) — trots att (a) rör den fara som talar oftast. Axel hittade hålet, och
det är dokumentets allvarligaste utelämnande.

Steg 0 mätte det, i två enheter, fjortondygnsfönster, efter givarvakten (§3):

| Enhet | Frostfall | Larmar i dag | Tysta | Tysta med regn ≤ 2 h | ≤ 4 h | Med N = 4 h |
| :-- | --: | --: | --: | --: | --: | --: |
| **Arkivrader** | 123 | 2 | 121 | 22 | 25 | 27 mot 2 = **13,5 ×** |
| **Episoder** | 15 | 2 | 13 | 1 | 2 | 4 mot 2 = **2,0 ×** |

**Skillnaden mellan raderna är hela poängen, och den är sju gånger.** Motorn talar inte per arkivrad:
högst ett larm per 45 s, aldrig samma larm inom 10 min eller 5 km, och den läser en snapshot som
publiceras var tionde minut. En station som är frusen hela natten ger 8,2 rader i snitt men **ett**
larm per förbipasserande förare. En multiplikator räknad på rader säger hur ofta villkoret är sant;
bara episodtalet säger något om rösten. Röstbudgeten ska därför alltid räknas i episoder, och ett
radtal som smyger sig in i ett tröskeldokument är ett mätfel.

**Vad talen faktiskt säger, med nämnaren utskriven.** Tvåan är en fördubbling, inte en sexdubbling —
men den är räknad på 2 fall som blir 4, över fjorton dygn, på 6 stationer. Det är september, den
årstid där både täljare och nämnare är som minst, och ett förhållande byggt på två observationer är
inte en prognos. Korskontrollen stöder att nivån är låg: den omslagsbaserade riktningen fann 4
regnstopp följda av frost inom 4 h under samma period, alltså samma handfull väder räknat från andra
hållet.

**Det som ändå står kvar efter alla reservationer, och som är Axels egentliga poäng:** i november är
frost inte längre 15 episoder på 6 stationer. Multiplikatorn kan bli mindre (fler frostfall har då
nederbörd och fyrar redan i dag) eller större, och vi vet inte vilket. Därför:

1. Röstbudgeten mäts om på vinterdata **innan** golvet sätts, i episoder.
2. Grinden i §4.4 får ord-per-resa som eget, fällande kriterium.
3. Ett radtal får aldrig citeras som röstpåstående — varken i det här dokumentet eller i
   TROSKLAR-OVERGANGAR.

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

De tre paren i §2.2 är **inte tre av samma sort** (fjärde läsningen, §1b.2). Ett av dem är en
övergångsorsak i lager 1; två är riskmodifierare i lager 2. Första versionen av det här avsnittet
kallade alla tre "interaktioner", och det var fel:

- **Dimma × frysrisk = rimfrost → kort #46, som ÖVERGÅNGSORSAK (lager 1), inte interaktion.**
  RESONEMANG: dimma är luft vid ~100 % relativ fuktighet, alltså daggpunkt ≈ lufttemperatur. #46:s
  villkor (yta ≤ daggpunkt) blir då uppfyllt så fort ytan är kallare än luften, vilket den är varje
  klar natt. Dimma är alltså inte något som *samverkar* med frysrisken — den är en av mekanismerna
  som *flyttar ytan* från torr till is. Sikt < X m hör hemma i #46:s tröskeldokument som en
  **konfidenshöjare för kondensationsvillkoret**, och den läser skattarens tillstånd (torr → is).
  Ingen egen fara, ingen egen prioritet.
- **Sidvind × halka och dimma × halka → kort #90, som RISKMODIFIERARE (lager 2).** Här ändras ytan
  inte. Isen är densamma; det som ändras är att föraren har sämre grepp i sidled eller sämre sikt
  framåt. Ingen av dem finns förrän vind och sikt är faror, och det kräver Axels ja och ett
  tröskeldokument (#90:s nyckel). Regeln skrivs då med #68 som mall — och den behöver inget minne,
  ingen skattare, bara båda signalerna i snapshoten samtidigt. Den öppna designfrågan, som bör stå i
  #90:s dokument: ska dimma eller sidvind **modifiera** halkvarningen (längre försprång, eftersom
  reaktionstiden är sämre) i stället för att bara förlora prioritetsstriden? Det är den enda nya
  tanken i (c), och den är #90:s.
- **Vattenplaning × halka (#68) är lager 2-precedensen.** Halkan vinner, vattenplaningen vilar ≤
  +4 °C. Det är exakt formen sidvind × halka ska få: ett förvillkor, en vektor, ingen historik.

Rekommendation: kort #89 lämnar över (c) uttryckligen och behåller bara (a) och (b). Och när (c)
lämnas över ska det stå vilket lager varje del hör till, så #46 inte bygger en interaktion och #90
inte bygger en skattare.

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
| **0. Mät hålet — sex frågor** (utökat 11/9 efter andra och fjärde läsningen) | Läsande skript mot arkivet, samma form som kodgrinden, med självtest och falsifierbarhetsvakt. **(0a) Eftersläpningen:** för varje regnstopp per station sedan 9/9, hur snabbt går `fukt` falskt? Väntat ~10 min; det är hålets bredd. **(0b) Torkningskurvan:** yta och luftfuktighet de följande fyra timmarna efter regnstopp — ger N. **(0c) Underlag (a) — FRÅN FROSTEN, inte från regnstoppen** (omskriven 11/9 efter Axels granskning; hans riktning är den beslutsrelevanta, eftersom falsklarmsrisken skalar med fyrningar och inte med tillfällen, och den tål gallringen bättre): av alla frostfall (yta ≤ 1 °C, efter givarvakten i §3), hur många larmar dagens regel på, hur många är tysta, och hur många av de tysta hade regn inom 2 respektive 4 timmar? **Räknas i BÅDA enheterna — arkivrader och episoder** — eftersom bara episodtalet säger något om rösten (§4.7). **(0d) Underlag (b) — MEN FÖRST §5.6-FRÅGAN** (rättat 11/9: dokumentet sade redan i §5.6 att Axel ska svara innan (b) byggs, och lade ändå mätningen här; Axel påpekade motsägelsen). Svaret tar trettio sekunder och sparar en höst om det är nej. Blir det ja: torrperioder ≥ 5 dygn följda av regn, och olyckor i `situation_archive` inom räckvidd under deras första 20 minuter. **(0e) Operatörens "Våt":** när ett segment blir Våt, hur länge står det kvar, och hur förhåller det sig till `rain_sum_mm` vid närmaste station? Avgör om "Våt" duger som proxy (§4.6). **(0f) Radarn:** för regnstopp vid en station, ser `radar_precip` samma regn på segmenten inom 15 km, och hur ofta missar timsamplingen ett regn stationen såg? Avgör om radarn duger som segmentproxy (§4.6). Varje fråga med egen underlagsvakt: färre än 20 händelser ⇒ "oavgjort", aldrig ett tal. | Nu | Ingen — det är en läsning | 1 Actions-minut som knapp, eller steg i måndagsserien |
| **1. Tröskeldokumentet** | TROSKLAR-OVERGANGAR med (a) som huvudsak, (b) som egen gate med nedläggningsklausul, (c) som överlämning. Svep, inte värden. | Nu, direkt efter steg 0 | Bengt fastställer, Axel bockar | 0 |
| **2. Tillståndsskattaren i skugga** (omskrivet 11/9, §1b) | En kolumn per SEGMENT i skuggloggen: skattat yttillstånd ∈ {torr, blöt, slask, snöig, packad, is} ur operatörens klass när den finns, regn/snö-historik (station + `radar_precip`), yta mot noll, daggpunkt mot yta, tid sedan sista händelse. Beräknad i Supabase, rör inte motorn. **Eget facit först:** skattat "blöt" mot operatörens "Våt", skattat "is" mot omklassning till halka. Tjänar (a), (b), #45, #46. | Efter 14/9 (#81:s ordning, det är kod) | Skattarens egen träffsäkerhet mot operatören ≥ golv (sätts i tröskeldokumentet) INNAN någon övergångsregel läser den; vakthundsrad (#81 regel 5) | 0 kr, en kolumn × ~140 rader/dygn |
| **3. (b) i skugga** | **Föregås ALLTID av §5.6-frågan till Axel** — ett nej avslutar (b) här. Blir det ja: oljefilm som skuggkolumn i skuggmotorn, V-B-grind. Steg 0 visade att grinden inte är nåbar i höst (55 torrperioder, 6 olyckor mot kravets 15), så ett ja betyder "mät till nästa höst", inte "döm i vinter". | Efter 14/9, medan höstregnen pågår | V-B | 0 kr |
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
- **(a) och #46 ska partitionera, inte dubbelräkna** (reviderat 11/9, se §4.6). Första versionen
  här sade "(a) om det regnat inom N h, annars #46". Det är fel håll: daggpunkten är den starkare
  signalen när den finns. Rätt gräns är fysikens — #46 äger fallet när yta ≤ daggpunkt
  (kondensation pågår), (a) när yta > daggpunkt men regn inom N h (kvarvarande regnvatten fryser i
  torr luft). Tystnadsfelet räknar då varje miss en gång.
- **En union av fyra blöt-proxyer är en falsklarmsmaskin om ingen mäts ensam.** §4.2:s reviderade
  skiss lägger ihop stationsregn, segmentradar och operatörens "Våt". Var och en har egna fel:
  stationsregnet missar skurar mellan stationer, radarn samplas bara en gång i timmen, "Våt" har
  okänd eftersläpning. B3-paret ska köras **per proxy**, och den som inte räddar missar utan att
  kosta falsklarm tas bort ur unionen innan röst.
- **(b) kan vara utanför löftet** (§5.6). Att mäta något som sedan visar sig oönskat kostar en
  skuggkolumn och en höst. Frågan ska ställas före steg 3, inte efter.
- **Facit för (b) är tunt.** Om underlaget i steg 0 visar färre än ett tiotal olyckor i fönstren
  över hela hösten fälls ingen dom, och kortet står öppet till nästa höst. Det är ett giltigt utfall
  men ett dyrt sätt att lära sig det.
- **Arkivdieten döljer varma efterregn.** För (a) spelar det ingen roll. För steg 0:s
  torkningskurvor betyder det att vi bara ser hur vägen torkar när det är kallt — vilket är det vi
  vill veta, men det ska sägas.
- **Tillståndsskattaren kan bli ett projekt i sig** (§1b). Sex tillstånd, fem signalkällor och en
  facitmatchning är mer än en kolumn om man låter det växa. Skyddet är ordningen: skattaren byggs för
  de två tillstånd (a) och (b) behöver — blöt och torr-sedan-D-dygn — och utökas per övergång som
  öppnas, aldrig i förväg. Snö och is läggs till när #45 låses upp, inte innan.
- **Operatörens klasser är inte sanningen, de är en observation.** Skattaren döms mot dem för att de
  är det bästa vi har i skala, men kort #52 visade i veckan att "Packad snö" på kod 1 är vinter-
  baseline i norr, inte fara. Facitmatchningen måste ärva #45:s baselineprincip: ett tillstånd som är
  normalt för säsongen och regionen är inte en övergång.

---

## Rekommendation

1. ~~**Kör steg 0 nu**~~ — **GJORT 11/9** (körningar 34579255737, 34580876588, 34590257682). Utfall:
   hålet är bevisat och bredare än gissningen (0a: 76 % av regnstoppen hade mätarregn, median 35 min);
   RH-guarden är död (0b); populationen finns men frysningen inte än, och röstkostnaden är 2,0 × i
   episoder (0c, §4.7); oljefilmen kan inte dömas i höst (0d); "Våt" är OAVGJORT och stryks ur
   unionen (0e); radarn samplar 8,3 % av tiden (0f). Två av proxyerna visade sig vara luft, precis
   som raden befarade. Nästa avläsning sker när frostlarmet i vakthunden fyrar — inom sju dygn,
   eftersom gallringen då äter upplösningen.
2. **Skriv tröskeldokumentet direkt efter**, med (a) som huvudsak. Det är det som låser upp allt
   annat, och det är inte kod.
3. **Ställ §5.6-frågan till Axel innan (b) byggs.** Ett nej sparar en höst.
4. **Dela #89:s nyckel** så att (a) inte väntar på #45 i onödan.
5. **Lägg "regn inom N h" i TYSTNADSFEL §3** i samma varv som tröskeldokumentet.
6. **Bär givarvakten i varje mätning som läser yttemperatur** (§3). Sex av tio frostfall i arkivet
   är trasiga givare, och det gäller #88 och #98 lika mycket som det här kortet.
7. **Räkna röst i episoder, aldrig i arkivrader** (§4.7). Skillnaden var sju gånger i höstens data.

Det billigaste stora klivet i §2.2 är inte ett nytt samband. Det är att sluta definiera bort den
blöta vägen tio minuter efter att regnet slutat.

Men det klivet har ett pris i ord, och priset ska mätas innan det tas. Det är skillnaden mellan den
här versionen och den förra.

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
