# Radarn — plan för ett intag som servar sex områden (kort #43)

*2026-09-02, Claude på Bengts beställning efter cellmätningens dom (kort #42 steg 0b:
regnet dekorrelerar under våra ankaravstånd — 46–64 % diskordans 5–50 km).
Planen är ramen; **ingen intagskod skrivs före steg 1:s rekognosering och steg 2:s
källbeslut** — samma hårda ordning som #51/#52 gav skuggmotorn.*

## 1. Varför en plan och inte bara en trigger

Radarkompositen är inte en funktion utan en **infrastruktur** som minst sex kort/behov
lutar sig mot. Byggs den bara som vattenplaningens trigger får vi göra om den när
blixthalkan öppnas. Byggs den rätt en gång tjänar den:

1. **Vattenplaningen (#42)** — ytbaserad regntrigger i stället för enstations-slantsingling.
2. **Blixthalkan (#16)** — underkylt regn/snöby på kall väg; radarintaget ÄR den kortens
   datapipeline. (#16:s *extrapolering* förblir parkerad prognosklass — se §3.)
3. **Marsdomens orsaksklassning** (TROSKLAR-SKUGGAN §2) — missar klassas mot vad som
   faktiskt föll över segmentet, inte mot närmaste stations flagga ±1 h.
4. **Missmätningen/skuggfacit** — "föll det något där, då?" besvaras med mätdata för
   varje olycka och varje skuggvarning.
5. **Vinterns snöbyar** — samma cellgeometri som sommarregnet, segmentmotorns blinda fläck.
6. **Norden** — MET:s nordiska produkt täcker FI/NO/DK; samma pipeline, fyra länder.

**Vad radarn ALDRIG hjälper:** utstrålningsfrosten (vinterns kärna — stationernas och
offsetmodellens jobb, orört) och fjällens radarskuggor (§4-risken).

## 2. Principer (husets lagar tillämpade)

- **Observation, inte prognos.** Endast kompositens mätdel (senaste ~5 min) används —
  det ryms i "mätning + faktum" (DECISIONS #25). Extrapolering framåt är #16:s
  parkerade klass och kräver Axels separata öppning.
- **Grids lagras aldrig råa.** Samplas mot 818-segmentskelettet + referensrutterna vid
  hämtning; endast händelser lagras (nederbörd > 0 över segment), samma
  händelsefiltrering som vädret. Fritier är lag.
- **Stationerna pensioneras inte** — de blir markkalibrering och facit (radar över-/
  underskattar systematiskt; rain_sum_mm från steg 0a är kalibreringsdatat).
- **Varje steg bevisas** med körningens egen loggrad (fail-soft-läxan), självtest med
  känd sanning, underlagsvakt.

## 3. Stegen, med grindar

| Steg | Vad | Lås |
|---|---|---|
| 1 | **REKOGNOSERING** (ren läsning, olåst mätspår): SMHI:s öppna radardata + MET Nordic — åtkomst, format, kadens, volym per hämtning, licens/attribution, och **kvalitetskartan över fjällen** (radarskuggor längs E10/E14 — mäts, inte antas). Utfall: rapport med siffror + fritier-kalkyl. | 🔓 olåst |
| 2 | **KÄLLBESLUT**: DECISIONS-rad undertecknad Axel + Bengt (som Finland fick, #42) — permanent extern källa in i arkivet. | 🔑 Axel + Bengt |
| 3 | **PILOTINTAG i skugga**: hämtare + segmentsampling + `radar_precip` (händelsefiltrerad), vaktad av healthchecken. Bevis: cellmätning v3 mot radar (radar vs stationsflaggor — kalibreringskurvan) + uppmätt fritier-förbrukning efter 1 vecka. | 🔑 steg 2 |
| 4 | **NYTTJARNA kopplas i kortens egen takt**: #42:s trigger (via dess tröskeldokument), TROSKLAR §2-klassningen (dokumentändring, fri före Axels fastställande), missar.ts-facit. #16 väntar på sin egen öppning. | 🔑 respektive korts nyckel |

Rekognoseringen (steg 1) ÄR den "ordentliga analysen" — planen bygger ramen, analysen
fäller vägvalet, och faller den (fjällskuggor för stora, volym för dyr) har vi ett
dokumenterat nej för priset av ett kvällsvarv.

## 4. Riskerna, namngivna

- **Fjällskuggorna**: radartäckningen är sämst där stationsnätet är glesast. Om steg 1
  visar stora hål längs E10/E14 krymper nytta 1–2 och 5 i Norrland — då gäller radar i
  söder + stationer/tystnad i norr, ärligt redovisat per band som allt annat.
- **Kvalitetsfällor**: smältskiktets överskattning, markekon — därav kalibreringen (steg 3).
- **Volym mot fritier**: mäts i steg 1 och bevisas i steg 3-piloten; taket är hårt.

## 5. Rekognoseringens resultat (steg 1 KÖRD 2/9, körning 33616309645)

**A. SMHI:s öppna radardata — helt öppen, rätt form för oss:**
- API:t svarar 200 på alla nivåer utan nyckel. Sverigekompositen: **5-minuterskadens**
  (234 filer räknade fram till 09:41 = 288/dygn-takt), **261 kB/fil ≈ 77 MB rå/dygn**
  — hanterbart eftersom grids aldrig lagras utan samplas till segmentrader (§2).
- Format: **HDF5/ODIM** (`radar_sweden_comp_*.h5`) per 5-minutersfil; dagslistningen
  exponerar även en **tif**-nedladdning. Pilotens (steg 3) tekniska val: GeoTIFF-spåret
  är enklast att sampla i Node — utvärderas där, inte gissas här.

**B. Fjälltäckningen — farhågan höll INTE, med en namngiven lucka:**
- 422-svepet över 26 punkter längs referensrutterna: **26/26 svarar med data.**
  `radar_coverage: ok` på E4:s hela sträckning, E10 Gällivare/Kiruna, E14
  Östersund/Åre/**Storlien** — gränsfjällen täcks, sannolikt för att MET komponerar
  norska + svenska + finska radarer (nordisk komposit slår nationell).
- Två undantag, ärligt bokförda: **Tärnaby `no coverage`** (djupa inlandsfjällen
  mellan radarstationerna — den kända luckan, lokal) och Mora `temporarily
  unavailable` vid mättillfället (transient, inte struktur).
- Arkitekturkonsekvens: MET:s punkt-API duger för stickprov men inte för
  818-segmentssvep var 5:e minut (deras villkor). Rätt mönster är SMHI-kompositen
  (en fil, 261 kB) + lokal sampling; MET som nordisk kompletterare/verifierare.

**C. Licenser:** SMHI CC BY 4.0, MET NLOD 2.0/CC BY 4.0 med identifierande
User-Agent (repo-URL, inga personuppgifter). Båda gratis — fritier-lagen hålls.

**Domen från steg 1: inget i rekognoseringen stoppar källbeslutet.** Öppet, gratis,
5-minutersfärskt, fjällen väsentligen täckta med Tärnaby som enda strukturella lucka.
Underlaget för steg 2 (DECISIONS-rad, Axel + Bengt) är komplett.

## 6. Relation till kort #42:s körschema

Steg 1 här = körschemats föreslagna "steg 1b" (VATTENPLANING-ANALYS §8). #42:s
tröskeldokument (dess steg 2) skrivs för det spår rekognoseringen + cellmätningens v2
pekar ut — stationstrigger, radartrigger eller kombination.
