# Bedömning 2026-09-15 (v2) — allt material, och vad det föranleder

**Status: FÖRSLAG.** Inget här är byggt eller beslutat. Besluten är Bengts och Axels; åtgärderna är
sorterade efter när de måste ske och vad de kostar. **v2 är v1 med granskningens rättelser införda**
(R14–R22 i `docs/GRANSKNING-2026-09-15.md`) och med det som granskningen hittade. Integrationskartan
(`docs/INTEGRATIONSKARTAN.md`, main @ `0022d92`) är den enda källan för hur delarna hänger ihop; det här
dokumentet är en **handlingsbedömning ovanpå den**. Kartan har 15 kända rättelser som väntar på Bengts
beslut (granskningen §10, R1–R15).

**Underlag:** kartan §1–§14 · Axels brev 14/9 · granskningen (tre vändor, alla 30 öppna kort utanför
kartan lästa) · `engine/src` · de 23 vektorerna · publicerad `live.json` 14/9 · DECISIONS #131,
#153–#184 · tavlans kassavakt och måndagsserie 14/9 · `docs/PRODUKTBOK.md` · tio TROSKLAR-dokument.

---

## 0. Var Axels brev och kartan är i otakt

| Axel skriver | Vad som gäller nu | Var |
| :-- | :-- | :-- |
| *"Grind A föll den 12:e"* | **Grind A lever.** Med båda vakterna: MAE 0,85 / grova 5,1 % / frysklassfel 0,3 % ⇒ INGEN DOM (#131). **14/9, 2 881 punkter: MAE 0,81 · grova 5,0 % · frysklassfel 0,6 % ⇒ INGEN DOM.** Underlaget växte 48 %; domen stod stilla | kartan §6.1, tavlan #160 |
| *"L5 finns delvis, som tid i stället för ord"* — som förslag | **Redan beslutat** i #90 roll B och SMHI-förstärkarens E1. Kartan sade "finns inte" — fel, rättat | kartan §2, §7.1, §13.1 |
| Hänvisar till 4.3, 4.5, 4.6, 4.8 och §5 A–E | Kartan är omnumrerad: 4.3 → **§7.3** · 4.5 → **§6.2** · 4.6 → **§7.5–7.6** · 4.8 → **§7.8** · §5 A–E → **§8** | — |
| *"B och E väntar tills något klarat en grind"* | E är indata till hans egen punkt 1. **Oense om E**, enig om B | kartan §13.5 |
| *"sex veckor före första frosten"* | I norr kan första frostnatten komma när som helst; steg 0 körs om **inom sju dygn** efter den | tavlan |
| Drive-kopian Axel läste | var version `4434697` — saknade §13. **Nu utbytt mot main @ `0022d92`** | — |

---

## 1. Analys

### 1.1 Två produkter, en vinter

**Produkt 2026** är den `PRODUKTBOK.md:108` lovar: *varnar vid Trafikverkets mätstationer och
rapporterade väglag — mellan stationerna är vägen oövervakad.* Den finns i drift. Axel har rätt i att
det är vinterns leverans.

**Produkt 2027** är den kartans §1 frågar efter: *hur halt blir det där jag är om två–tre minuter?*
Den kräver L4 och en regel som binder tillstånd × utveckling till rösten. Ingenting av det är byggt.

Kartans första utkast mätte 2026 mot 2027 och kallade avståndet ett fel. Det var det inte. **Men
motsatsen är också fel:** att avfärda allt utom "vid stationen" som våning två. Det finns ett hål
*innanför* 2026-löftet (1.5) — och ett spår med höstfönster som inte väntar på frost (1.8).

### 1.2 Vad materialet bevisar och vad det antar — alla tio tröskeldokument

| Del | Dokument | Grind | Körd? | Dom | Vinter? |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Grind A, offset + två vakter (#38b) | SKUGGAN | A | ja, 2 881 p | **INGEN DOM** (A2 exakt 5,0) | L4 är nästa produkt |
| Tillståndsskattaren (#89) | OVERGANGAR | Ö-A..D | steg 0 + skattaren; **tre instrumentfel i egen kod** | ingen | **kandidat** — om facit finns |
| Trendarkivet (#88) | TRENDEN | T-A/B/C | T-A byggd, 4 713 kandidater | ingen (frost) | **kandidat** — med skattaren |
| Tystnadsfelet (#98) | TYSTNADSFEL | — | **noll kod** | — | kräver larmpositioner (form A 14/9) |
| Rimfrosten (#46) | RIMFROST | R-A..D | R-A körd | **OAVGJORT** | redan i motorn som gren |
| Frysklassningen (#103) | FRYSKLASSNINGEN | K-A/B/C | K-A körd | **INGEN DOM** — 0 frysande punkter; "99,5 % rätt klass betyder ingenting" | **K2 återanvänds** — 1.6 |
| Vind/sikt (#90) | VIND-SIKT | W-A/B/C | steg 0 körd | OAVGJORT; exponeringen diet-filtrerad | roll B = försprångets förebild |
| SMHI-förstärkaren (#95 d) | SMHI-FORSTARKAREN | F-A/B/C | körd 12/9 | OAVGJORT — 0 SNOW_ICE i september | **tredje vintergrind** |
| Väglagets ålder (#151) | VAGLAGETS-ALDER | Å-A/B | — | väntar | R3 förkastad före mätning |
| Vattenplaning (#42) | VATTENPLANING | V-A/B/C | V-A ×3 | **FÖLL** (stationsspåret); V-B inte byggd | **höstfönster** — 1.8 |
| Radarns `regn` (#81 C) | — | — | **publiceras** — bara på halkklassade segment | nej-på-fel-fråga | upplösningsrollen omätt |
| Kamerafacit (#20/#157) | — | — | **0 objekt efter 5 657 körningar** | — | **förutsättningen för allt ovan** |

**Ett fallit, noll passerade, åtta väntar, ett med noll kod.** Axels *"det som saknas är frost och en
dom"* är exakt rätt — och skattaren behöver en period av *oförändrad kod* under mätning innan den får
döma något.

### 1.3 Den största risken: två av tre facitkällor är tomma, och ingen vakt mäter om de växer

Varje vinterdom vilar på facitstacken. Axels egen tröskelregel — *en storhet som inte kan motbevisas
av en mätning får inte utlösa* — namnger två vittnen: ytstatusgivaren och kameran.

| Källa | Läge |
| :-- | :-- |
| **Kamerafacit** | **0 objekt efter 5 657 skuggkörningar.** Kedjan lagad (form A 14/9: larmen bär `lon`), men `archiveFacit` kör bara för `land === "se"` och provlarmet var danskt. Byggd, obevisad. Sexton dygn förlorade |
| **`road_condition_history`** — *"our moat"* | **830 rader, nyaste 25/8.** Ingen vinterhistorik. Kursorhypotesen otestbar tills snön kommer (#51) |
| **`situation_archive`** | **omätt** |
| Operatörens "Våt" | 33 rader, 0 klassade — för lite också som facit |

**Blind fläck:** healthchecken vaktar `sync_state`-färskhet; edge-funktionen skriver `synced_at = now()`
varje minut oavsett om något hämtades. Vakten kan inte skilja *färsk och tyst* från *färsk och trasig*.
Samma familj: sex källvakter i `trv-bevakning` seedar om sig varje körning och kan aldrig larma (#161).

**Facitstacken är kritisk väg för vinterleveransen.** Axels regel är rätt och saknar vittne.

### 1.4 Motorn slänger data den redan har — men bara för halkklassade segment

`snapshot-core.ts` skriver `regn` per segment och `smhi[]`; adaptern kastar båda. **Men `regn` sätts
bara på segment som redan passerat halkfiltret** (`condition_code >= 2` eller halkord, rad 101–102).
En blöt, normalklassad väg — där vattenplaning uppstår — når aldrig `live.json`. Live 14/9: 0 segment;
radarn såg 124 med regn (#154).

Att läsa ett fält och att döma på det är två olika saker. Åtgärden i dag är att skuggan **läser vid
sidan av** motorn (T4) — inte att motorn börjar döma. Och för #42 krävs ett beslut om själva
väglagsfrågan (K15).

### 1.5 Efterhalkan ligger INNANFÖR löftet — Axels "en sak" är bottenvåningen

Löftet är *varnar vid Trafikverkets mätstationer.* Stationen mäter var tionde minut. Regnet slutar,
`fukt` blir falsk inom tio minuter, ytan fortsätter falla. **Stationen ser det. Motorn gör det inte**
— `icing_point` kräver `moisture === true` i samma stund. Steg 0: **76 % av regnstoppen**, median
35 minuter. Det är en varning *vid stationen* som motorn missar av konstruktion.

Axels "en sak" — *frysrisk som fyrar när det inte regnar men vägen är blöt och ytan faller* — greppar
i **F1 + F3 + F4 på `icing_point`**, ingen F5, högst sex vektorer, grinden är `v11_silent_drive`.

### 1.6 Allvar som tid — och K2 är det graderade måttet

Axels omformulering flyttar #153 från F5 (23 vektorer) till F4 (högst 6). Spannet finns: `leadM`
400–3 000 m, vid 90 km/h **16–120 s**. Två sidoeffekter att mäta: korridoren växer med försprånget
(±35° vid 3 000 m är inte samma yta som vid 1 000), och `fukt()` räknar okänd nederbörd som våt —
andelen islarm på *okänd* nederbörd är aldrig mätt.

**Det graderade måttet finns redan:** frysklassningens **K2 — osäkerhetszonen** (±0 · ±0,5 · ±1,0 °C,
modellen får säga "vet inte" nära gränsen), fastställt i TROSKLAR-FRYSKLASSNINGEN. E ska byggas på
K2, inte uppfinna en egen skala.

### 1.7 Vad som sätter kalendern: kassan, cronen, nycklarna, gallringen

- **Kassan:** 16,21 av 35 USD, släpande takt 200 min/dygn. Takdatum ~26/9. Inget nytt cron före 1/10.
- **Cronen:** måndagsserien 14/9 kom 5 h 18 min till 6 h 48 min sent; healthcheck upp till 1 h 51 min;
  pulsklockan på sekunden. *Pulsen levererar; cronen lovar.*
- **Nycklarna (#86):** PAT:en går ut **22/11**, Supabase-tokenen **8/12**. Publicera får 401 ⇒ CDN
  fryser ⇒ åldersspärren tystnar vakten ⇒ **vakthunden kan inte larma, för larmvägen använder samma
  PAT.** Ingenting ser trasigt ut.
- **Gallringen (#83):** finns (sql/014 i pg_cron), räcker ~55 dygn in i vintern. Steg 2 (export eller
  Pro) är ett beslut som bör tas **före första kalla veckan**, inte i oktober.

### 1.8 #42 vattenplaning — ett eget spår, och det enda med höstfönster

V-A föll ×3 (träff 60 % mot 70 — stationerna vet *att* det regnar, inte *hur mycket*). Radardomen
höll. Tröskeln 2,0 mm/h är kontrasignerad. #81 A, B och radarhalvan av C är **byggda**. Kvar: C:s
stationshalva (blockerad), D (motorn), E (skugga V-B), F (röst). "Höstregnen är en engångschans i år."
**#42:s skuggmätning kan börja i regn — nu**, medan allt annat väntar på frost.

Men #81 D är **ett sjätte farslag** (`aquaplaning`, egen vektor) — i strid med kartans §7.8. Se 1.9.

### 1.9 Tre kandidater till ett sjätte farslag — §7.8 behöver bli en regel

#42 (`aquaplaning`), #32 (hinder/djur, 173/vecka med riktig position), #45 (snö/slask om meta inte
räcker). Kartans §7.8 är en lärdom ur ett lyckat fall (#46), inte ett kriterium. **Förslag, att
fastställas före något av dem byggs:** nytt farslag bara om **(1)** handlingen skiljer sig från alla
befintliga, **(2)** texten inte kan lånas utan att ljuga, **(3)** prioriteten mot varje slag är
beslutad av Axel före vektorn. Mot det: **#42 ja, #32 kanske, #45 nej.** Och #45 är dessutom låst av
#52: ett test i tre portar säger att kod 1 + "Packad snö" *måste* larma — motsatsen till #45:s
vinterbaseline. Norrland: 31,7 % av sträckan. Vektorn måste beslutas före #45.

---

## 2. Åtgärder som måste vidtas I DAG

### 2.1 I motorn: inget i reglerna

Motorn är inte trasig; den är begränsad. Ett villkor ändrat före frost, utan facit och utan grind, är
"våning två före grunden". Motorn ska **inte röras** medan skuggan mäter.

### 2.2 Det enda som inte väntar på frost

| # | Åtgärd | Varför i dag |
| :-- | :-- | :-- |
| **T0** | **#42 steg E: skuggan V-B i höstregn.** Loggar vad rösten *skulle* sagt, rör ingen användare. Kräver att `regn` når normalklassade segment (K15) | 1.8: enda spåret med höstfönster; V-C kräver ≥ 5 regndygn |

### 2.3 I snapshoten (F1 — noll vektorer, noll portar)

| # | Åtgärd | Varför i dag |
| :-- | :-- | :-- |
| **T1** | Publicera skattarens **råa indata** bredvid `fukt`: `regn_h`, `radar_h`, `lutning` (ur `trend_kandidater`, samma nyckel `station_id`). *Förbehåll: `regn_h` vilar på en regntäckning som är omätt sedan ingest-live-bytet 9/9 — T12* | F1 ett varv före F4. Råa tal, ingen tröskel låses |
| **T2** | Kontraktsgrind: en nyckel som publicerats i `live.json` får aldrig försvinna | "lägg till, ersätt aldrig" — ett borttaget `fukt` tystar varje icke-uppdaterad app |

**T1 är inte B.** B (bevisbärare per fara med styrka) väntar tills något klarat en grind — enig med
Axel.

### 2.4 I skuggmotorn och facitstacken

| # | Åtgärd | Varför i dag |
| :-- | :-- | :-- |
| **T3** | **Bevisa att kamerafacit fylls** — känt svenskt spår, ett objekt i hinken | kritisk väg |
| **T4** | Skuggan läser `segments[].regn` vid sidan av motorn och loggar vad villkoret skulle ändrat; **SMHI-halvan byggs mot #95(d):s fastställda F-svep** | fälten finns redan |
| **T5** | Logga andelen islarm där `precipitation` var **okänd** | tystnadsdoktrinen i siffror |
| **T11** | **Mät `situation_archive`** och lägg en vakthundsrad *"historiken växer"* — inte bara *"sync_state är färsk"* | 1.3: tredje källan omätt; ingen vakt mäter tillväxt |
| **T12** | Kör `regn-tackning` en gång | 44 % är från före bytet; T1 vilar på svaret |

### 2.5 Drift och dokument

| # | Åtgärd | Vems |
| :-- | :-- | :-- |
| **T6** | Rätta kartans §6.1 med 14/9-körningen (2 881 p · 0,81 · 5,0 · 0,6) | Claude |
| **T7** | ~~Ge Axel nuvarande karta~~ — **Drive-kopian utbytt mot main @ `0022d92`** | gjort |
| **T8** | **Bevisa att `trv-bevakning` pushar state med 13 källor** (CRLF är åtgärdat; sex vakter larmar aldrig) | Claude |
| **T9** | TRV-anmälan om nio byvindgivare (#154). Brevet är klart | Bengt |
| **T10** | Inget nytt cron-schema före 1/10 | alla |
| **T13** | #97: kodgrind vaktar "Rimfrost"/"Halkrisk" nu (noll vektorer); ordlistan vidgas när TRV skriver så | Bengt |

---

## 3. Kort sikt — till första frosten och genom oktober

| # | Åtgärd | Vems | Kostnad |
| :-- | :-- | :-- | :-- |
| **K1** | **C:** grinden för kombinationen — dokument, före mätningen | Claude skriver, Bengt fastställer | dokument |
| **K2** | **D:** regel för gemensam kalibrering | Bengt | ett stycke |
| **K3** | **Precisera tröskelregeln** till Axels lydelse — **efter T3**, annars saknar den vittne | Bengt + Axel | dokument |
| **K4** | **Omformulera #153 till försprång** | Axel | F5 → F4 |
| **K5** | **E:** graderad nivå + bevis, **byggd på K2:s osäkerhetszon** | Claude | F3, liten |
| **K6** | Skuggmätning av "en sak" mot facit från första frostnatten; T-A körs om; steg 0 inom sju dygn; **#95(d):s F-B i samma varv** | Claude | knapp |
| **K7** | Mät korridorens tillväxt: 3 000 m mot 1 000 m på verkliga spår | Claude | skugga |
| **K8** | Måndagsserien från naken cron till **pulsen eller knapp** | Claude, Bengts ja | 0 min |
| **K9** | Skattaren: en period **utan kodändring** under mätning | Claude | disciplin |
| **K10** | **#86: rotera PAT senast 15/11**, bevisa med en publicering, lägg datumet i vakthunden | Axel | — |
| **K11** | **#52: besluta vinterbaseline-vektorn** (kod 1 + "Packad snö") **före #45** | Bengt + Axel | vektor, tre portar |
| **K12** | **Kriteriet för nytt farslag** (1.9) in i kartan §7.8 — före #42 D, #32, #45 | Bengt + Axel | dokument |
| **K13** | #45: lapse 0,71 → **0,63** (#96:s mätning, §5 dubbelsignatur) | Bengt + Axel | dokument |
| **K14** | #83 steg 2 (export/Pro) — före första kalla veckan | Bengt | beslut |
| **K15** | #154: vidga väglagsfrågan med `regn ≥ 2,0` (en skrivare hålls) eller andra läsare | Bengt / steg C | F1 |
| **K16** | Höjden som **varianspredikator** — ny fråga, egen grind, mot #96:s veckodata | Claude, Bengts ja | kräver inte vinter |
| **K17** | #76: deploybevis för manifest-sha-vakten | Axel/Bengt | — |

---

## 4. Längre sikt — januari till mars

| # | Åtgärd | Villkor |
| :-- | :-- | :-- |
| **L1** | **F4 för "en sak"** — villkoret i `icing_point`, berörda vektorer, v11 tiger, tre portar | bara om K6:s grind passerar |
| **L2** | Försprång per fara i `evaluate*` (#153 som tid) | efter K4, K5, K7 |
| **L3** | L4-knappen: SMHI molnmängd som **räckviddsknapp** · **Verify 2** (luft→yta vintertid) · **representativitetsradien** | efter vinterns grind A-kurva |
| **L4** | #42: **sjätte farslag eller meta** — avgörs på V-B:s data mot kriteriet i K12 | efter T0:s höst |
| **L5** | #45 som meta — **efter K11**, med lapse 0,63 | efter L1 |
| **L6** | #32 hinder/djur — mot kriteriet i K12 | efter K12 |
| **L7** | Radarns segmentupplösning · #43 steg 4 (snöbyar) — mot befintligt arkiv | knapp när kassan tillåter |
| **L8** | Kombinationsgrinden (K1) tillämpad i skuggan | efter K1 + facit |
| **L9** | #91 kallplatslagret | L4-produkten |
| **L10** | SMHI som **reserv när Trafikverket tystnar** (uppmätt pris 2,36 °C) — beredskap, inte väg | om L3:s Verify 2 håller |

---

## 5. Vad som kan tas bort ur schemat

### 5.1 Ur arbetsplanen

| Tas bort / fryses | Skäl |
| :-- | :-- |
| "Allvarsskala i rösten" som mål | ersätts av försprång |
| "Fem lager med bevisbärare före frosten" som vintermål | Axels "våning två"; B väntar |
| Höjdkorrektionen i #45 — **fryses, och konstanten är inaktuell** (0,71 mot mätta 0,63) | §7.7 |
| SMHI som ankare — struket | återkommer bara som knapp, med egen grind |
| Radarn som "mer väta" — struket | återkommer bara som upplösning |

**Två saker att sluta kalla borttagna:** #96 höjdprovet (mäter varje måndag) och #94 (kortet är öppet).

### 5.2 Ur Actions-schemat

Redan nedskuret 240 → ~100 min/dygn. Måndagsserien: behåll innehållet, byt bärare (K8).
`healthcheck.yml`: Bengts beslut att behålla. `marknadsforing.yml`: Axels/Bengts fråga. Nya scheman:
inga före 1/10. **Det finns lite kvar att stryka utan att stryka mätning.**

---

## 6. Vad som bör jobbas med för en bättre produkt

1. **Facitstacken som strategisk investering** — och en vakt som mäter att den *växer*. Utan facit
   kan ingenting dömas, inte ens av Axels regel.
2. **Tystnaden som mätvärde:** islarm på okänd nederbörd (T5), larm per episod, korridortillväxt (K7).
3. **Segmentets försprång före ispunktens** — A1 plattar redan kod 2 och 4.
4. **"Lägg till, ersätt aldrig"** som skriven regel och grind (T2).
5. **Rätt fråga till varje underkänd del** — SMHI som knapp, radarn som upplösning, höjden som
   varianspredikator. Sjutton förkastanden håller; ingen återinförs på hopp.
6. **Ett kriterium för nya farslag** (K12) — så att #42, #32 och #45 avgörs på regel, inte kort för kort.

---

## 7. Beslut som behövs

| Beslut | Vem | Rekommendation |
| :-- | :-- | :-- |
| **#42 steg E i höstregn nu** (T0) | Bengt | **ja** |
| #154: vidga väglagsfrågan (K15) | Bengt / steg C | ja |
| Publicera skattarens råa indata (T1) | Bengt | ja — efter T12 |
| Vinterns röstleverans = Axels "en sak" | Bengt + Axel | ja |
| #153 → försprång (K4) | Axel | ja |
| Tröskelregeln till Axels lydelse (K3) | Bengt | ja, efter T3 |
| E på K2 före vintern (K5) | Bengt | ja |
| **Kriterium för nytt farslag** (K12) | Bengt + Axel | **ja, före #42 D, #32, #45** |
| **#52 vinterbaseline-vektorn** (K11) | Bengt + Axel | **före #45** |
| #45 lapse 0,63 (K13) | Bengt + Axel | ja |
| **#86 rotation 15/11** (K10) | Axel | ja |
| #83 steg 2 före kalla veckan (K14) | Bengt | ja |
| Måndagsserien av cron (K8) | Bengt | ja |
| #97 kodgrind (T13) | Bengt | ja |
| Vakthundsrad "historiken växer" + mät `situation_archive` (T11) | Bengt | ja |
| `regn-tackning` en gång (T12) | Bengt | ja |
| Höjden som varianspredikator (K16) | Bengt | ja |
| `marknadsforing.yml` | Axel + Bengt | ingen rekommendation |
| TRV-anmälan (T9) | Bengt | ja |
| **Rätta kartan (R1–R15)** | Bengt | på ditt ord |

---

## 8. Vad som ändrats mot v1

| Var | v1 | v2 |
| :-- | :-- | :-- |
| §1.2 | 8 rader | alla tio tröskeldokument |
| §1.3 | kamerafacit tomt | **två av tre** facitkällor tomma/stilla; ingen vakt mäter tillväxt |
| §1.4 | "radarn i telefonen" | bara halkklassade segment (#154) |
| §1.6 | — | K2 som graderat mått |
| §1.7 | kassa + cron + gallring "saknas" | + nycklarna #86; gallringen finns, räcker ~55 dygn |
| §1.8, §1.9 | — | #42 eget spår med höstfönster; kriterium för sjätte farslag |
| L4 | "#42 och #45 som meta, efter L1" | #42 avgörs mot kriteriet i mars, skugga nu (T0); #45 efter #52 |
| T4 | "läs `smhi[]`" | mot #95(d):s F-svep |
| T8 | "#161 gradlew CRLF" | bevisa 13 källor i state |
| §5 | "inget att ta bort" | #96 och #94 ska sluta kallas borttagna |
| Beslut | 8 | 20 |

*Kartan är den enda källan för hur delarna hänger ihop. Det här är vad den, tillsammans med Axels
brev, granskningen och driftläget, föranleder — som förslag.*
