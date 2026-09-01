# Trösklarna för skuggmotorn — mars-domens måttstock

**Datum: 2026-09-01. Fastställt av Bengt (metod) och Axel (ägarbeslut) FÖRE första
skuggkörningen.** Detta är skuggregel 5 i Byggplan v3 (2.3) och det hårda villkoret i
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

- **(a) TALAR:** A + B + C klaras nationellt → segmentprognosen kopplas till app
  och karta som säsong 2-funktion, trenivåmärkt, "risk"-språk (aldrig "uppmätt"),
  SYSTEM.md skrivs om i samma commit.
- **(b) TALAR NÄRA ANKARE:** A + B klaras i banden 0–7 km (ev. 7–15) men inte
  längre ut → skuggan talar endast på segment vars maxavstånd till ankare ligger
  i godkänt band; resten skrivs ut som okänt.
- **(c) TYST:** något av A/B faller, eller C uppfylls inte → skuggan skrotas
  eller får en vinter till i tystnad. Vid otillräckligt underlag (C) är utfallet
  ALLTID fortsatt skugga — aldrig tal på tunn dom.

Bevisbördan ligger på skuggan. Vid tvekan: tystnad (produktinvarianten).

## 5. Ändringsregler

Efter första skuggkörningen får detta dokument bara ändras genom en DECISIONS-post
undertecknad av **både** Axel och Bengt. Skärpning kräver en rad; **lättnad kräver
dessutom skriftlig motivering som inte hänvisar till vinterns uppmätta siffror** —
det är hela poängen med att dokumentet är daterat före första körningen.

## 6. Mätansvar

Claude räknar (missar.ts utökas med prognoskolumnen; felkartan skriptas som
engångsskript i repot). Bengt läser skuggloggen i söndagsrutinen och klassar
facit-hinkens bilder veckovis. Axel fäller domen. Prognoskolumnen buntas ur
`engine/src` som allt annat (DECISIONS #43/#51) — en handklistrad kolumn driver
isär på ett dygn.
