# GOLVET — vad källorna bär som vi inte arkiverar

**Kort #47, Bengts order 2026-09-04.** Systematisk genomgång av varje källas fulla
fältlista mot vad ingest faktiskt lagrar. Motiv: samma mönster tre gånger på fyra dygn —
svensk daggpunkt (arkiverad men oanvänd i motorn), svensk vind (ohämtad), finsk
KASTEPISTE (ohämtad). Metod: **levande fältdumpar** (fältrekognoseringen, körning
33840067087, 4/9 + lokala dumpar av Fintraffic/SMHI/Polisen samma dag) — inte
dokumentation. Dom per fält: **GULD** (på golvet, bör övervägas) · **BORTVALT**
(medvetet, med källa) · — (irrelevant/ej vår domän).

**Regel:** fynden här är KANDIDATER. Inget hämtas utan eget kort och beslut —
arkivpolicyn (DECISIONS #4, free tier) är ett skäl att välja, inte en ursäkt att slippa veta.

---

## 1. Trafikverket WeatherMeasurepoint 2.1 (SE-väder — huvudkällan)

Arkiverar: surface/air/dewpoint °C, humidity, precipitation-text, rain/snow-flaggor,
rain_sum/snow_wateq (30 min). Fältträdet visar därutöver:

| Fält (levande, 4/9) | Dom | Kommentar |
|---|---|---|
| `Observation.Air.VisibleDistance` | **GULD** | **SIKT i meter (PWD22-givare)!** Väderkartans hål C var aldrig ett källhål — vi hämtade den bara inte. Dimma/dis per station. |
| `Observation.Wind[].Speed/Direction/Height` | **GULD** | Vind med riktning — snödrev + sidvind (hål B). |
| `Aggregated10/30minutes.Wind.SpeedMax` | **GULD** | **Byvind** — det är byarna som fäller höga fordon. |
| `SnowSum.Solid.Value` | GULD (låg) | Snömängd i fast form; vi tar bara WaterEquivalent. |
| `Aggregated5minutes.*` | — | Finare kadens än vår hämtning kan nyttja (30 min-läxan). |
| `*.Origin` + `*.SensorNames` | **GULD** (metadata) | Givarnamn per mätvärde (DTS12G/HMP155/PWD22/WMT700). Gör givarvakten (kort #46) och TRV-felrapporter **sensorspecifika**. |

## 2. Trafikverket RoadCondition 1.2 (väglaget, 818 segment)

Arkiverar: code/text/info, road_number, county, geometri, tider. Därutöver:

| Fält | Dom | Kommentar |
|---|---|---|
| `LocationText` | **GULD** | "E 4 Sundsvall Trafikplats Skönsmon – Gnarp" — mänsklig sträckbeskrivning. Kandidat för röstens VAR (jfr #56 vägnumret) och rapportsidor. |
| `RoadNumberNumeric` | — | Har text-varianten; numerisk är gratis men oanvänd. |
| `Creator`, `Geometry.ModifiedTime` | — | Förvaltningsmetadata. |

## 3. Trafikverket Camera 1 (väglagskameror, facit)

Publicerar: id, position, PhotoUrl, name (kameror-vaglag.geojson). Därutöver:

| Fält | Dom | Kommentar |
|---|---|---|
| `PhotoTime` | **GULD** | Bildens exakta tagningstid — daterar facit-bilden i stället för nedladdningstiden. Liten ändring i skuggmotorns arkivering, stor skillnad i mars-analysen. |
| `CameraGroup` | GULD (metadata) | "SE_STA_VVIS2353" — kamera↔station-kopplingen explicit (vi mätte den via avstånd i #55; här står den i klartext). |
| `HasFullSizePhoto`, `Status`, `Active` | — | Drift-metadata; Status kan filtrera döda kameror i facit. |

## 4. Trafikverket TrafficSafetyCamera 1 (fartkameror)

Arkiverar: id, name, road, bearing, position. Fältträdet visar **inget ytterligare av
värde** — källan är i princip tömd. ✅ Rent golv.

## 5. Trafikverket Situation 1.6

Rekognoseringens Situation-dump föll på datumfiltret (stderr, syns ej i Summary) —
**kvarstående recon-lucka**, tas vid behov. Ur ingest vet vi att vi lagrar deviation-
kärnan (typ, allvar, väg, geometri, tider, ikon). Kända bortval: vägarbeten
(BORTVALT, DECISIONS #5), icke-Accident-typer i rösten (kort #32 väntar på Axel).

## 6. Fintraffic Digitraffic (FI) — **131 sensorer, vi arkiverar ~6**

Största golvet i hela genomgången (fulldump 4/9, 528 stationer):

| Sensor | Dom | Kommentar |
|---|---|---|
| `NÄKYVYYS_M/KM` (455 st) | **GULD** | Sikt i meter — hål C löst för Finland. |
| `KUURAPISTE` + `_ERO_ILMA` (433) | **GULD** | **FROSTPUNKTEN färdigberäknad** + differens mot luft — rimfrostens (kort #46) exakta storhet, levererad av källan. |
| `KASTEPISTE_ERO_TIE` (386) | **GULD** | Daggpunkt−vägyta färdigräknad = rimfrostvillkoret som ETT tal. |
| `JÄÄTYMISPISTE_1` (414) | **GULD** | **Fryspunkt på ytan, saltjusterad** — "när fryser DEN HÄR vägen" i stället för 0 °C-antagande. |
| `SUOLAN_MÄÄRÄ/VÄKEVYYS` (414) | **GULD** | Saltmängd g/m² + koncentration — extremkyla/salt-frågan (väderkartan) mätbar. |
| `KESKITUULI/MAKSIMITUULI/TUULENSUUNTA` (433) | **GULD** | Vind medel/max/riktning — hål B för FI. |
| `SATEEN_OLOMUOTO` (486) | **GULD** | **Nederbördens FORM ur givare** — facit för #45-klassningen (regn/snö/slask). |
| `SADE_INTENSITEETTI` mm/h (475) | GULD | Intensitet direkt, slipper härledas. |
| `TIE_1_DERIVAATTA`, `ILMA_DERIVAATTA` °C/h | GULD | Temperaturtrend färdig — nollgenomgångsprognosens råvara. |
| `TIENPINNAN_TILA_1`, `KOSTEUDEN_MÄÄRÄ` | GULD | Ytans tillstånd + vattenmängd på ytan. |
| `JOHTAVUUS`, `JÄÄTAAJUUS`, `KUITUVASTE*`, `PWD_*`, `ASEMAN_STATUS` | — | Givarinterna/råsignaler; status-fälten dock användbara för givarvakt. |

## 7. SMHI metobs — 49 parametrar, vi använder 1 (lufttemp, i smhi-provet)

| Param | Dom | Kommentar |
|---|---|---|
| 12 Sikt | **GULD** | Timvis sikt, hundratals stationer — dimlagret för Sverige. |
| 16/28–35 Molnmängd/molnbas | **GULD** | **Utstrålningsnattens nyckelprediktor** — klar natt = rimfrostmotorn; korsgivaren kort #46 saknar idag. |
| 8 Snödjup | GULD | Snötäcke = vinterbaseline-indikator (Bengts matris). |
| 39 Daggpunkt | GULD | Oberoende daggpunktskälla — korsvalidering av TRV:s trasiga givare. |
| 21 Byvind · 3/4 vind | GULD | Sekundärt vindnät. |
| 15 Nederbördsintensitet 15 min | GULD (låg) | Radarns markfacit i finare kadens. |
| Övriga (dygns-/månadsaggregat, hav) | — | Fel kadens eller fel domän. |

## 8. DMI (DK) — hämtar temp_grass/temp_dry/temp_dew/precip_past1h

DMI metObs bär därutöver bl.a. `visibility`, `wind_speed/dir/max`, `humidity`,
`snow_depth`, `temp_soil`. Samma GULD-familj som övriga länder (sikt/vind/fukt).
Dansk vinter är sist i kön — noteras, drivs inte förrän DK-spåret vaknar.

## 9. Polisen events — ✅ rent golv

Live-fälten (id, datetime, name, summary, url, type, location{name,gps}) mot lagrat:
allt av värde tas redan (typ/art parsas till species/road/place_hint). Länscentrum-
begränsningen är källans, inte vår (DECISIONS #13).

## 10. MET Frost (NO) — rekognoserad 2/9 (DECISIONS #60)

461 Vegvesen-vägstationer med lufttemp arkiveras ännu inte alls (NO-ingest väntar på
DATEX-beslutet). När NO-arkivet byggs: ta lufttemp + fukt + vind ur Frost från dag ett;
yttemp kräver DATEX. Elementkatalogens road/surface-familj (142 st) dokumenterad i
frost-rekognoseringens körning.

---

## Sammanfattning — de fem tyngsta fynden

1. **Sikten finns överallt** (TRV VisibleDistance, FI NÄKYVYYS, SMHI 12, DMI visibility) — hål C var aldrig ett källhål, bara ett hämtningshål.
2. **Vinden finns överallt** (TRV Wind[] + byvind, FI, SMHI, DMI) — hål B likaså.
3. **Finland levererar rimfrosten färdigräknad** (KUURAPISTE, KASTEPISTE_ERO_TIE) och **saltets fryspunkt** (JÄÄTYMISPISTE) — kort #46 och extremkyla-frågan har källstöd.
4. **SMHI:s molnmängd** är rimfrostens saknade korsgivare (klar natt-detektorn).
5. **Metadata-guldet**: TRV SensorNames (sensorspecifik givarvakt), Camera PhotoTime (daterat facit), RoadCondition LocationText (röstens VAR).

**Föreslagen ordning om/när kort skrivs:** (a) TRV vind+sikt (två kolumner + två rader
ingest — hål B+C för Sverige i ett svep), (b) FI-breddningen (KUURAPISTE m.fl. — fem
kolumner, frostpunkt färdig), (c) SMHI moln till kort #46:s omkörning, (d) PhotoTime i
facit-arkiveringen, (e) LocationText till röstspåret (Axels kolumn).
*Free tier-vakten gäller: varje ny kolumn ska genom arkivpolicyns filter (DECISIONS #4).*
