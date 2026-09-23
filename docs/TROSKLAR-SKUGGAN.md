# Trösklarna för skuggmotorn — mars-domens måttstock

**Datum: 2026-09-01. Fastställt av Bengt (metod) 1/9. FASTSTÄLLT AV AXEL 2/9
(ägarbeslut — "kör", relayerat av Bengt i chatten; bekräftas genom att kortet
bockas på tavlan; DECISIONS #61). Värdena är oförändrade från Bengts 1/9-version
inklusive §2-orsaksklassningen. Från och med första skuggkörningen (~mitten av
oktober) gäller ändringsregeln i §5 fullt ut.** Detta är skuggregel 5 i Byggplan v3 (2.3) och det hårda villkoret i
DECISIONS #51: ingen skuggkod skrivs innan detta dokument ligger i repot. Domen i
mars 2027 fälls mot värdena nedan — ingen flyttar målstolparna när siffrorna kommit.

**Frågan dokumentet besvarar:** vilken felnivå, falsklarmsandel och missandel krävs
för att segmentmotorns skuggprognos ska **få tala** till användare säsong 2?

---

## 1. Vad som döms

Segmentmotorn (#38b / Byggplan v3 F1): offsetmodell + ankarklippning som påstår
vägyteläge **mellan** mätpunkterna, som **risk vid beräknad ankomsttid** (horisont
max 2 h). Den befintliga punktmotorn (yta ≤ 1 °C + fukt; bro ≤ 3 °C) är redan i
produktion och döms inte här — den är jämförelsebasen.

Varje segmentprognos i skuggloggen är märkt **uppmätt / modellerat / okänt**
(trenivåprincipen). Endast *uppmätt* och *modellerat* döms; *okänt* får aldrig
tala oavsett utfall, bara skrivas ut som okänt.

## 2. Vad som räknas som facit

| Källa | Får bekräfta träff | Får fälla falsklarm | Anm |
|---|---|---|---|
| VViS-station på segmentet (holdout eller kant) | ja | ja | den enda källa som får fälla |
| Väglagskamerabild (facit-hinken) | ja (snö/slask syns) | **NEJ** | asymmetriregeln: svartis syns inte i bild |
| situation_archive-halka + SMHI-isvarning (missar.ts) | ja | nej | frånvaro av rapport ≠ frånvaro av halka |
| Trafikverkets RoadCondition (operatörsbedömt väglag) | ja | nej | oberoende av segmentmotorns indata (stationstemperaturer) |
| Testarlogg (Boden-typ: förare + tid + plats) | ja | ja | mänskligt vittne väger tyngst |

**Falsklarm** = skuggvarning där en station på segmentet inom ±45 min mätte yttemp
> +2 °C (is fysiskt osannolik), eller en testarlogg aktivt säger torr/bar väg.
En ren kamerabild fäller ALDRIG en varning.
**Miss** = facithändelse (halka bekräftad av någon källa ovan) på ett segment med
status uppmätt/modellerat, där ingen skuggkörning under 2 h före händelsens start
flaggade segmentet. Händelse matchas till segment inom 2 km från segmentlinjen.
**Obedömbar** = varning eller händelse utan någon facitkälla — räknas separat,
aldrig som träff.

**Orsaksklassning av missar** (tillagt 1/9 på Bengts order, efter nowcast-frågan —
dokumentet är ännu fritt att ändra, Axels fastställande väntar): varje miss klassas
mot nederbördsdata (närmaste stations regn/snö-flagga inom ±1 h från händelsen) som
**utstrålningsdriven** eller **nederbördsdriven**. Endast utstrålningsdrivna missar
bokförs på B2 — en snöby eller underkylt regn mellan stationerna är blixthalkans hål
(kort #16), inte offsetmodellens, och en dom som blandar dem fäller eller friar fel
komponent. Nederbördsdrivna missar redovisas separat i marsdomen som underlag för
#16:s prioritering; klumpar de sig är det ett argument för att tidigarelägga #16,
inte för att underkänna segmentmotorn.

## 3. Trösklarna

### Grind A — offsetmodellen (felkartan; 3.2/3.3 i byggplanen, mätbar från arkivet 24/8)

Leave-one-out per station: prognostisera varje stations yttemp ur grannarnas
offsetmodell, jämför med mätt. Räknat på vintertimmar (mätt yta ≤ +5 °C),
nationellt över alla 845 stationer, redovisat per ankaravståndsband
(0–7 / 7–15 / 15–20 / >20 km).

| # | Mått | Tröskel |
|---|---|---|
| A1 | MAE i beslutsbandet (mätt yta −5…+5 °C) | ≤ 1,0 °C |
| A2 | Grova fel (\|fel\| > 2 °C) | ≤ 5 % av timmarna |
| A3 | Frysklassningsfel: modell och mätning på olika sidor om 1 °C-gränsen med > 1 °C marginal | ≤ 10 % |

Grind A prövas första gången på arkivdata (steg 3 i DECISIONS #51) **innan**
skuggbygget startar i november. Faller A redan där byggs ingen skugga —
matematiken håller inte och tre veckor sparas.

**Minsta underlag för grind A** (tillagt 1/9 efter rökprovet, Bengts ja): prövningen
kräver **≥ 500 bedömbara mätpunkter spridda över ≥ 20 stationer** — annars förlängd
mätning, ingen dom åt något håll. Rökprovet 1/9 (43 punkter, 29 av dem >20 km från
ankare) visade varför: tunt underlag är dessutom skevt mot de glesaste delarna av
nätet och fäller eller friar på urvalsartefakter.

**Marginalvakten** (tillagd 12/9 på Bengts order, DECISIONS #126): underlagsspärren ovan
vaktar **mängden** underlag, inte **marginalen**. Ett "FALLER" på två raders marginal läser
exakt likadant som ett "FALLER" på tvåhundra raders, och de två påståendena är inte samma
sak. Därför gäller nu också:

> **Ligger ett A-mått inom ±1,96 standardfel från sin tröskel skrivs OAVGJORT ut i stället
> för KLARAR eller FALLER.** Andelar (A2, A3) får binomialfel, medelfelet (A1) får
> medelvärdets fel. Grinden öppnar bara på KLARAR, så vakten kan aldrig öppna en stängd grind.

**Vakten är ENSIDIG, och det är avsiktligt.** Mätpunkterna är inte oberoende — samma
stationer, intilliggande halvtimmar — så intervallet är en **undre gräns** för osäkerheten.
Ligger utfallet **inom** det är frågan därmed säkert oavgjord. Ligger det **utanför** är den
inte därmed avgjord; vakten är minimikravet, inte ett tillräckligt bevis.

Skälet den skrevs: anomalimätningen 12/9 (DECISIONS #125) visade att A2 med #75:s givarvakt
landar på **5,1 % mot kravets 5,0 %**, vilket på 1 943 punkter är en skillnad på ungefär **två
mätvärden**. Den standande domen berörs inte — 10,7 % mot 5,0 % ligger långt utanför bruset
(±1,3 procentenheter) och faller lika brett med vakten som utan.

⚠️ **Axel ska se det här stycket.** Tillägget är en skärpning av vad som får kallas en dom och
kan aldrig öppna en stängd grind, men §5 nedan gör dokumentet till bådas. Ingen dom som vilar
på marginalvakten får fällas innan han läst den.

*Grind A dömd 23/9 2026: **KLARAD** (Bengt, DECISIONS #321) på körningen 22/9 med radvakten och karantänen — A1 0,71 °C,
A2 3,5 % ± 0,4, A3 0,0 % på 7 356 punkter från 711 stationer; 21/9 utan vakterna A1 0,75, A2 3,8 ± 0,5, A3 0,3 på 5 745.
Domen gäller leave-one-out vid stationerna, där offseten lärs ur stationens egen historik. Hur offseten når en vägpunkt
utan historik ska stå i detta dokument innan skuggkörningen byggs (kort #38b, delsteg 4a; DECISIONS #322).*

**Vägpunkten — hur prognosen räknas där ingen station står** (delsteg 4a, 23/9 2026, DECISIONS #324, skriven under
mandatet i DECISIONS #323; Bengts rad bekräftar lydelsen): segmentprognosen räknas som **rå avståndsviktning** av de
närmaste stationernas yttemperatur — upp till fem ankare inom 50 km, vikt 1/km som grind A:s grannvikt, **ingen offset** —
på grind A:s population: #75:s givarvakt, radvakten och karantänen (DECISIONS #298/#299). Vägpunktsgrinden
(`scripts/hojd-prov.ts`, måndagar 07:00) visade 23/9 att den räkningen klarar A1–A3 utan målets historik (A1 0,71 °C,
A2 3,8 % ± 0,4, A3 0,0 % på 8 132 punkter från 712 stationer), lika bra som grind A:s lärda offset (0,72 °C). Interpolerad
offset ur grannparen är underkänd (A2 9,5 %); höjdkorrigering oavgjord (A2 4,7 % ± 0,5), hjälper inom 7 km och stjälper
bortom 20. Bandet per segment är avståndet till närmaste bidragande ankare; bortom yttersta bandet alltid *okänt*.
Faller RÅ på vinterdata tas frågan upp i bedömningen §4.2 — grinden körs om varje måndag.

### Grind B — skuggdriften (hela vintern, dom i mars)

| # | Mått | Tröskel |
|---|---|---|
| B1 | Falsklarmsandel: falsklarm / bedömbara skuggvarningar | ≤ 20 % |
| B2 | Missandel: missar / bedömbara facithändelser på täckta segment | ≤ 30 % |
| B3 | Mervärde: andel av träffarna där punktmotorn var tyst eller > 30 min senare | ≥ 25 % |

B3 är existensvillkoret: en skugga som bara talar där punktmotorn redan talar
adderar risk utan värde.

### Grind C — domens giltighet (utan C fälls ingen dom alls)

| # | Villkor | Krav |
|---|---|---|
| C1 | Bedömbara facithändelser på täckta segment | ≥ 20, spridda över ≥ 3 skilda halkperioder |
| C2 | Bedömbara skuggvarningar | ≥ 30 |
| C3 | Samstämmighet: offsetbacktest (3.3) och skuggdrift pekar åt samma håll | avvikelse i A-måtten ≤ 10 procentenheter |

Uppströmsledtiden (1.2/3.4, danska stationerna) redovisas som underlag men är
**inte** en talarättströskel.

## 4. Domslutet (mars 2027, Axel fäller mot Bengts mätning)

- **(a) KARTA OCH KONFIDENS:** A + B + C klaras nationellt → segmentprognosen kopplas till
  **kartan** som säsong 2-funktion, trenivåmärkt, "risk"-språk (aldrig "uppmätt"), och får
  **stärka, försvaga eller förlänga** en varning som vilar på en mätning (regel T3, T6).
  **Den utlöser aldrig röst ensam.** SYSTEM.md skrivs om i samma commit.
- **(b) TALAR NÄRA ANKARE:** A + B klaras i banden 0–7 km (ev. 7–15) men inte
  längre ut → skuggan talar endast på segment som uppfyller **båda**: maxavstånd till
  ankare i godkänt band, **och** T1–T2 — ankarstationens mätning kan på varningens plats
  och inom utfallsfönstret visa att tillståndet inte rådde. Är vittnet inte namngivet och
  bevisat med innehåll (T2) talar skuggan inte. Resten skrivs ut som okänt.
- **(c) TYST:** något av A/B faller, eller C uppfylls inte → skuggan skrotas
  eller får en vinter till i tystnad. Vid otillräckligt underlag (C) är utfallet
  ALLTID fortsatt skugga — aldrig tal på tunn dom.

**B3 efter denna lydelse:** en B3-träff (mervärde där punktmotorn var tyst eller > 30 min
senare) är att prognosen visade rätt på kartan, eller förlängde eller stärkte en varning som
vilade på en mätning — inte att den talade där punktmotorn teg. Talet i B3 är oförändrat.

*Ändrat 23/9 2026 (DECISIONS #319, Bengts rad — skärpning enligt §5): (a) och (b) ovan ersatte
lydelsen från 1/9, som lät prognosen tala på modellerade värden i strid med regel T3/T6
(TROSKLAR-KOMBINATIONEN §6, fastställd 16–17/9). Grind A, B och C oförändrade. Underlag:
`docs/SKUGGAN-PAR4-MOT-REGEL-T.md`.*

Bevisbördan ligger på skuggan. Vid tvekan: tystnad (produktinvarianten).

## 5. Ändringsregler

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

Efter första skuggkörningen får detta dokument bara ändras genom en DECISIONS-post
från Bengt, som äger mätningen. Skärpning kräver en rad; **lättnad är utesluten
så snart utfallet är sett** —
det är hela poängen med att dokumentet är daterat före första körningen.

## 6. Mätansvar

Claude räknar (missar.ts utökas med prognoskolumnen; felkartan skriptas som
engångsskript i repot). Bengt läser skuggloggen i söndagsrutinen och klassar
facit-hinkens bilder veckovis. Axel fäller domen. Prognoskolumnen buntas ur
`engine/src` som allt annat (DECISIONS #43/#51) — en handklistrad kolumn driver
isär på ett dygn.
