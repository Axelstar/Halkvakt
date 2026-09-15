# Granskning av integrationskartan — 2026-09-15, sammanställd

**Status: UNDERLAG.** Inget byggt, inget beslutat. Sammanställd ur tre granskningsvändor 15/9 (Bengts
order: *"gör en ny genomgripande granskning"*, *"är allt täckt nu, även kort 95?"*, *"läs de 16
olästa korten också"*). **Bara fynd som stått sig** — det som rättades under vägen står i sin rättade
form, inte som historik. Tillsammans med *Bedömning v2* och integrationskartan är detta hela
underlaget.

**Vad som lästes:** integrationskartan §1–§14 · bedömning v1 · alla tio tröskeldokumentens statusrader
och grindar · DECISIONS #55, #79, #96, #103, #110, #116, #119, #134, #137, #153, #155, #156, #162,
#164, #168 · **alla 30 öppna kort på tavlan som kartan inte nämner, lästa i sin helhet** · korten #42,
#43, #81, #92, #93, #94, #98, #100, #103, #151 · `publish/snapshot-core.ts` rad 92–130.

---

## 0. Slutsatserna

1. **#42 vattenplaning var bedömningens största hål.** Den fick en rad ("som meta, efter L1"). I
   verkligheten har kortet en fastställd byggordning (#81 A–F) där A, B och halva C är **byggda**,
   grind V-A **föll tre gånger med tredubblat underlag**, radardomen **höll**, tröskeln är satt och
   kontrasignerad — och motorsteget är **ett sjätte farslag (F5) enligt kortet självt**, i strid med
   kartans §7.8. Dessutom det **enda** spåret med ett höstfönster.
2. **Kartans "radarn ligger redan i telefonen" är halvsann.** `regn` sätts bara på segment som redan
   passerat halkfiltret (`snapshot-core.ts:101–102`). En blöt, normalklassad väg — där vattenplaning
   uppstår — når aldrig `live.json`.
3. **Två av tre facitkällor är tomma eller stillastående.** Kamerafacit: 0 objekt. `road_condition_history`
   — husets *"winter archive (our moat)"* — 830 rader, nyaste 25/8. Den tredje, `situation_archive`,
   är omätt. **Ingen vakt mäter om historiken växer.** Varje vinterdom vilar på den här stacken.
4. **Tio tröskeldokument: ett fallit (V-A), noll passerade, nio väntar.** Bedömning v1 täckte fyra.
5. **Sjutton förkastanden prövade — alla rätt** på den fråga som ställdes. Men fyra efterord i kartan
   är fel eller överspelade, och två återanvändningar är svagare än kartan säger.
6. **Ett test låser motsatsen till #45:s vinterbaseline i alla tre portarna** (#52): kod 1 + "Packad
   snö" *måste* larma. Norrland: 31,7 % av vägsträckan. "#45 som meta" är låst av en vektor som måste
   beslutas först.
7. **Tre kort vill ha ett nytt farslag** (#42, #32, #45). Kartans §7.8 är en lärdom ur ett fall, inte
   ett kriterium. Ett kriterium föreslås (§9).
8. **Två nycklar går ut mitt i säsongen** (#86: PAT 22/11, Supabase-token 8/12) och fäller allt tyst —
   vakthunden kan inte larma, för larmvägen använder samma PAT.
9. **Motorfel och datakvalitetsfel kartan aldrig nämnde:** #97 (halk-regexen blind för "Rimfrost"/
   "Halkrisk"), #156 (halkorden i tre versioner), #45:s lapse-konstant 0,71 mot #96:s mätta 0,63,
   regntäckningen omätt sedan ingest-live-bytet (#44), gallringens räckvidd ~55 dygn (#83).
10. **Fjärde vändan (Bengts fråga om Skåne och dansk radar):** #15 kö-slut och #16 nowcast avfärdades som
    "release-låsta" — fel klassning. **#16 är L3:s saknade framåtblickande halva**, utanför produkten av
    beslut #25 (*observation, inte prognos*), och hör hemma i kartans §11 som namngiven gräns. **#15 är en
    fjärde kandidat till ett nytt farslag** (§9). Båda låsta efter release; båda ska stå i kartan.

---

## 1. Vad kartan och bedömningen saknade

### 1.1 Kort som kartan nämner men bedömning v1 inte

| Kort | Vad | Varför det spelar roll |
| :-- | :-- | :-- |
| **#38b** | Stråket / grind A:s byggordning | Novemberbeslutet (segmentmotorn nästa vinter eller på oklarerad modell) — Bengts och Axels |
| **#43** | Radarn som infrastruktur | Steg 4 öppnat 13/9. "Snöby bara radarn ser" (kartan §11) är inte längre kartans kant utan en mätbar fråga |
| **#94** | Samarbeten | **Kartan säger "stängt". Kortet är öppet** — bara försäkringsspåret stängdes; åkerier/NTF kvar |
| **#95** | SMHI, fem trådar | se §8 |
| **#98** | Tystnadsfelet | Fastställt, kontrasignerat, **noll kod**. T3 vägrar svara utan larmpositioner (form A 14/9) |
| #92 · #93 · #100 | Stängda kort | Rätt stängda — se §3 |
| #163 · #165 | — | **Inte kort utan DECISIONS-nummer** (vindtaket, spärren). Kartan kallar dem kort |

### 1.2 Alla 30 öppna kort som kartan aldrig nämner — lästa i sin helhet

| Rör integrationen | Kort | Fynd |
| :-- | :-- | :-- |
| **ja, i sak** | **#42** | egen byggordning, höstfönster, sjätte farslag — §2 |
| **ja** | **#32** | vill ha nytt `HazardKind` (djur på vägbanan, 173/vecka med riktig position) — §9 |
| **ja** | **#44** | regntäckning 44 % mätt 3/9, **före** ingest-live tog över regnmängden var minut 9/9 (#79). Ny täckning **omätt** — och T1:s `regn_h` vilar på den |
| **ja** | **#51** | vinterarkivet tomt — §5 |
| **ja** | **#52** | testet som låser motsatsen till #45 — §6 |
| **ja** | **#83** | gallringen **finns** (sql/014 i pg_cron); räcker ~55 dygn in i vintern; steg 2 (export/Pro) är ett beslut |
| **ja** | **#86** | nycklarna — §7 |
| **ja** | **#96** | höjdprovet **mäter varje måndag**; kartan säger "underkänd" — §3 |
| **ja** | **#97** | halk-regexen — §6 |
| **ja** | **#103** | frysklassningen: K-A körd, INGEN DOM (0 frysande punkter); **K2 osäkerhetszon är direkt återanvändbar** — §4 |
| **ja** | **#151** | väglagets ålder, fastställt, väntar på vinter — §4 |
| **ja** | **#154** | regnfältet når inte vattenplaningens segment — §2 |
| **ja** | **#156** | halkorden i tre versioner; vår halva gjord; Axels halva **kan inte avgöras på data** (0 vinterord i arkivet) |
| **ja** | **#158** | larm saknar position — form A deployad 14/9, **sexton dygn förlorade** |
| ja (facit) | **#161** | CRLF åtgärdat; **sex källvakter kan fortfarande aldrig larma** (state bär 7 av 13 källor) — §5 |
| ops, relevant | #76 | manifest-sha-vakten fixad på main 8/9, **deploybevis saknas** — det är vakten som gör "F1 är gratis" mätbart |
| ops, relevant | #146 | 27,6 MB byggutdata spårat — **klon faller på Windows** (260 tecken) |
| ops | #50 · #152 · #160 | vakthunden på pulsen (dygnsbevis öppet) · kassavakten byggd, väntar deploy · måndagsserien 5–7 h sen |
| historik | #53 · #85 | rotorsaken till kassaläget; ersatta av #152 |
| **ja — omklassade i fjärde vändan** | **#15 · #16** | #16 nowcast = L3:s framåtblickande halva, utanför produkten av #25-lagen — gräns, inte bygge (R23) · #15 kö-slut = fjärde kandidat till nytt farslag (R24). Båda låsta efter release |
| nej | #21 · #23 · #25 · #26 · #27 | produkt, verktyg — en rad var |

### 1.3 Två nummerkollisioner

- **#154** är både *TRV-anmälan om byvindgivare* och *steg C:s regnfält*.
- **#103** är både DECISIONS-numret för *ord-per-resa* (som kartan använder) och **kortet
  frysklassningen**. Kartans §10.2 "Ord-per-resa (#103)" läses lätt som frysklassningskortet.

---

## 2. #42 vattenplaning

| Steg | Läge | Källa |
| :-- | :-- | :-- |
| Grind **V-A** (stationsspåret bär intensitet?) | **FÖLL ×3**, sista 13/9: träff **60 %** mot 70, n = 73 194 | #104, #153 |
| Radardomen | **HÖLL**, Bengt valde (c): radarn ger intensiteten mellan stationer | #153 |
| Utlösartröskel | `rate_mean` **≥ 2,0 mm/h**, kontrasignerad av Axel | #155, #156 |
| #81 **A** kalibrering i dokumentet | ✅ faktor 0,65, §3.4 | #156 |
| #81 **B** datan utan nya minuter | ✅ radarn stannar i timingesten | #156 |
| #81 **C** snapshoten, radarhalvan | ✅ `regn` per segment byggt | #162 |
| #81 **C** stationshalvan | ⛔ blockerad — `weather_latest` saknar `rain_sum_mm` | #162 |
| #81 **D** motorn | ⏳ **ny `HazardKind` `aquaplaning`** — tre portar, egen vektor, "halkan vinner" | #81, #68 |
| #81 **E** skuggan V-B | ⏳ inte byggd | #81 |
| #81 **F** rösten | efter V-C + Axels ja | #81 |

**Fyra saker att veta:**

**(a) V-A:s nej är ett riktigt nej, på rätt fråga.** Stationerna vet *att* det regnar (träff + delvis
88–94 %) men inte *hur mycket*, och intensitet är exakt det vattenplaning kräver. Att skriva om V-A1
till "regnar det alls" avvisades sakligt: mätbart och värdelöst.

**(b) `regn` når inte vattenplaningens segment.** `snapshot-core.ts:101–102` sätter fältet bara på
segment som redan är `condition_code >= 2` eller bär ett halkord. Live 14/9: **0 segment** medan
radarn såg **124** med regn. Kort #154 ställer frågan: vidga väglagsfrågan, eller låt steg D läsa
`radar_precip` direkt (bryter en-skrivare-regeln #81:2)? **Kartans §5.2 gäller bara halkklassade
segment.**

**(c) #81 D är F5 — i strid med kartans §7.8.** Kortet säger "ny hazard `aquaplaning`, egen vektor".
Kartan säger "aldrig ett sjätte slag". Sakfrågan: rimfrosten (#46) blev rätt en gren i `icing_point`
därför att den *är* isrisk. Vattenplaning är en annan fara med annan handling (fart), eget förvillkor
(yta > +4 °C) och egen text — som meta på `slippery_segment` ärver den "halka rapporterad", fel ord.
**Sannolikt vinterns enda legitima F5** — men steg E (skugga) kommer före F (röst), och V-C kräver
≥ 200 varningar, ≥ 15 facithändelser, ≥ 5 regndygn. Rösten är ändå inte aktuell i vinter. Se §9.

**(d) #42 har ett HÖSTFÖNSTER.** "Höstregnen är en engångschans i år." Allt annat väntar på frost.
#42:s skuggmätning kan börja i regn — nu.

**Följdfel:** kartans §10.2 säger att oljefilmens torrdygnsräknare är "samma beräkning #42 behöver".
Sedan #155 är #42:s utlösare radarintensitet. **Överspelad.**

---

## 3. De sjutton förkastandena, prövade

Kriteriet: *var förkastandet rätt på den fråga som ställdes* — och *finns en ny fråga att ställa före
mätning, med egen grind* (kartans §9).

| # | Del | Vad som mättes | Rätt? | Vad överlever | Rättelse till kartan |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | **SMHI som ankare** (#119) | 1 918 p: 1,05 → **1,20**, sämre i varje band | **ja** | (a) räckviddsknapp — omätt · (b) **reserv när TRV tystnar: 2,36 °C** på 352 p · (c) #95(d) förstärkaren | (b) saknas i kartan |
| 2 | **Höjden** (#96) | 1 962 p: rå 1,65 → rå+höjd **1,65**; bättre i 0–7 km, sämre i två band | **ja** som medelkorrektion på yta | **Lapse 0,63 °/100 m ur 3 476 par** — starkt fysiskt faktum. Varianspredikator — omätt. **#96 mäter varje måndag** | kartan: "underkänd"; **#45 använder 0,71** |
| 3 | **Kamerorna som täckning** (#55) | 6 av 744 nytt ankarläge, två oberoende körningar | **ja** | Bildfacit — beslutat, **tomt** (0 objekt, form A 14/9, sexton dygn borta) | §9.1 "✅ omrollad" är sant om beslutet, inte om funktionen |
| 4 | **RH-guarden** (#96 0b) | RH **stiger** efter regn, 90 → 95 % | **ja** | Kondensationsförutsättning; R-A använder daggpunktsgap, RH är stödsignal | — |
| 5 | **Operatörens "Våt"** | 33 rader, 0 klassade | **ja** som proxy | Som facit? **33 rader är för lite också för det** | kartan överskattar |
| 6 | **Oljefilmen #89(b)** (#110) | 55 torrperioder, 6 olyckor mot 15 | **ja** — scope, "inte nåbar i höst" | Torrdygnsräknaren finns; **#42 använder den inte längre** | §10.2 överspelad |
| 7 | **Ord-per-resa** (DECISIONS #103) | Bengts fältdom | **ja** | Episoder som enhet | — |
| 8 | **R3 hård åldersgräns** | Förkastad **före mätning** — invariant | **ja** — formfel; 0 av 818 har `end_time` | Står i `snapshot-core.ts:96–99` | — |
| 9 | **E3 högre prioritet** | Aldrig | **ja** | Bindande villkor på #153 | — |
| 10 | **`rate_max`** (#134) | 727,54 mm/h, artefakt | **ja** | Kvot max/mean — **fältet SPÄRRAT tills rensat** (#155) | §10.2 säger inte "spärrat" |
| 11 | **K1 byvindkvot** (#164) | 335 av 748 — mäter fönsterglapp | **ja** | Detekterar ett **känt formatfaktum**. Läxa, inte verktyg | §10.2 överskattar |
| 12 | **Per fordonstyp** (#92) | Scope | **ja** | Riskmodifierare-begreppet står | — |
| 13 | **Radarns bidrag ∝ avstånd** (#168) | Platt ~1,5 % vid r ≥ 0,5 | **ja** — med två reservationer DECISIONS skriver: 25 segment i yttre bandet, 5,3 dygn frontregn | "Inget nej till radarn: 96 % precision." Segmentupplösning — omätt | §9.1 bör bära reservationerna |
| 14 | **#100 dämpning** | 1 larm för 39 min | **ja** | TOTALEN (11 larm/62 min) → #153 | — |
| 15 | **#93 kommunala vägar** | Ingen källa | **ja** | Halva → #95(d) | — |
| 16 | **#94 försäkringsbolagen** | Otillgängligt | **ja** — spåret | **Kortet öppet** | §10.1 "stängt" fel om kortet |
| 17 | **Breda SMHI-regeln** | Län ≠ punkt | **ja** | `N_varning` i #89 §2.3 | — |

**Den enda nya frågan som inte redan står på ett kort är höjden som varianspredikator** — den kan
ställas mot #96:s veckodata utan vinter.

---

## 4. Tio tröskeldokument — vad som faktiskt är dömt

| Dokument | Kort | Grind | Körd? | Utfall |
| :-- | :-- | :-- | :-- | :-- |
| SKUGGAN | #38b | A | ja, 2 881 p | **INGEN DOM** (A1 0,81 · A2 5,0 · A3 0,6) |
| OVERGANGAR | #89 | Ö-A..D | steg 0 + skattaren | väntar (frost) |
| TRENDEN | #88 | T-A/B/C | T-A byggd | väntar (frost) |
| TYSTNADSFEL | #98 | — | **noll kod** | T3 kräver positioner (form A 14/9) |
| RIMFROST | #46 | R-A..D | R-A körd (#137) | **OAVGJORT** — "fällde mig på ett tyst filter" |
| FRYSKLASSNINGEN | #103 | K-A/B/C | K-A körd (#137) | **INGEN DOM — 0 frysande punkter**; 99,5 % rätt klass "betyder ingenting" |
| VIND-SIKT | #90 | W-A/B/C | steg 0 körd | OAVGJORT; exponeringen diet-filtrerad (#116) |
| SMHI-FÖRSTÄRKAREN | #95(d) | F-A/B/C | körd 12/9 | OAVGJORT — 0 SNOW_ICE i september |
| VAGLAGETS-ALDER | #151 | Å-A/B | — | väntar (vinter) |
| VATTENPLANING | #42 | V-A/B/C | V-A ×3 | **FÖLL** (stationsspåret); V-B inte byggd |

**Ett fallet, noll passerade, åtta väntar, ett med noll kod.**

**En återanvändning ingen sett:** frysklassningens **K2 — osäkerhetszonen** (±0 · ±0,5 · ±1,0 °C;
modellen får säga "vet inte" nära gränsen). Det är exakt det graderade mått som *allvar som
försprång* behöver, och det är redan fastställt.

---

## 5. Facitstacken — två av tre källor tomma, ingen vakt mäter tillväxt

| Källa | Läge | Källa |
| :-- | :-- | :-- |
| **Kamerafacit** (#20/#157) | **0 objekt efter 5 657 skuggkörningar.** Kedjan lagad länk för länk (form A 14/9: larmen bär `lon`), men `archiveFacit` kör bara för `land === "se"` och provlarmet var danskt. Byggd, obevisad. **Sexton dygn förlorade** | #157, #158 |
| **`road_condition_history`** — *"our moat"* | **830 rader över 818 segment, nyaste 25/8.** Ett stillbildsavtryck plus tolv ändringar. Ingen vinterhistorik. Kursorhypotesen (minutjobbet flyttar kursorn ~59 ×/h, timjobbet ser bara sista deltat) är **otestbar tills snön kommer** | #51 |
| **`situation_archive`** | **omätt** | — |

**Blind fläck:** healthchecken vaktar `sync_state`-färskhet; edge-funktionen skriver `synced_at = now()`
varje minut oavsett om något hämtades. Vakten kan inte skilja *färsk och tyst* från *färsk och trasig*.

**Samma familj, #161:** `trv-bevakning` breddades 12/9 från 7 till 13 källor; state-filen på main bär
**7**. Sex källvakter seedar om sig varje körning och **kan aldrig larma**. CRLF-felet som fällde
pushen är åtgärdat; beviset att 13 källor sparas saknas.

Axels tröskelregel — *en storhet som inte kan motbevisas av en mätning får inte utlösa* — namnger två
vittnen: ytstatusgivaren (33 rader) och kameran (0 objekt). **Regeln är rätt och saknar vittne.**

---

## 6. Motorfel och datakvalitetsfel kartan aldrig nämnde

| Kort | Fel | Fog | Beslut |
| :-- | :-- | :-- | :-- |
| **#97** | `SLIPPERY_INFO`-regexens lookbehind matchar bara ordstart: "Rimfrost", "Halkrisk" passerar tysta oavsett kod. 0 träffar i 838 arkivsträngar i dag — **en tyst ALDRIG** den dag TRV skriver så | F4, en vektor | Bengt: kodgrind nu, ordlista senare |
| **#52** | `test/engine.test.ts:143–146` (+ Kotlin, Swift) låser att **kod 1 + "Packad snö" MÅSTE larma**. #45 säger att packad snö i vinterbaseline *larmar aldrig*. Norrland: **168 segment, 31,7 % av sträckan, 44,8 km/segment** — ett Jämtlandssegment är sex mil sammanhängande larmyta, upp till tre repriser. Ett tak, inte en prognos | vektor, tre portar | **Bengt + Axel, före #45** |
| **#156** | Halkorden i tre versioner: motorn har `mycket besvärligt`, SQL:en i `snapshot-core.ts:102` har det inte. Vår halva vaktad (fyra kontrakt); Axels halva **kan inte avgöras på data** — 0 vinterord i arkivet | F1/F4 | Axel, på semantik |
| **#154** | `regn` bara på halkklassade segment | F1 | Bengt / steg C:s ägare |
| **#44** | Regntäckning **44 %** mätt 3/9 — före ingest-live tog över var minut (#79). **Omätt sedan dess.** T1:s `regn_h` vilar på den | — | kör `regn-tackning` en gång |
| **#83** | Gallringen finns (sql/014); räcker ~55 dygn in i vintern. Septembertakt ~11 500 rader/dygn med dieten; vintern upphäver dieten | — | steg 2 (export/Pro) **före första kalla veckan** |
| **#45** | Lapse **0,71** — #96:s mätta tal är **0,63** ur 3 476 par | dokument, §5 | Bengt + Axel |

---

## 7. Vinterrisker utanför integrationen som ändå fäller den

**#86 Nyckelkalendern.** PAT:en (kartrepot/publicera + vakthundens larm) går ut **22/11**;
Supabase-tokenen (deploy-knappen) **8/12**. Kedjan när PAT:en dör: publicera får 401 ⇒ CDN fryser
⇒ appens åldersspärr tystnar vakten ⇒ **vakthunden kan inte larma, för larmvägen använder samma
PAT.** Ingenting ser trasigt ut. Rotera senast **15/11**, och en nyckel är inte bytt förrän en
publicering gått igenom med den.

**#76.** Vakthundens led 3 (manifest-sha) är fixad på main 8/9 men **deployen är inte bevisad**. Det
är den vakt som gör kartans "F1 är gratis, bevisas med manifestets sha" mätbart.

**#146.** Repot går inte att klona normalt på Windows (byggutdata, 260-teckengränsen).

---

## 8. #95 — fem trådar

| Tråd | Läge | I kartan? |
| :-- | :-- | :-- |
| SMHI som **ankare** | förkastat, robust (1,05 → 1,20) | ja |
| SMHI som **reserv när Trafikverket tystnar helt** | **uppmätt pris 2,36 °C** på 352 punkter — en kvantifierad beredskap | **nej** |
| #95(d) **förstärkaren** | fastställt tröskeldokument, E0 skuggkolumn planerad (inte byggd), **F-B är en tredje vintergrind**, körd 12/9 OAVGJORT | nej |
| **Verify 2** — luft→yta-korrelationen vintertid, *"den enda som kan avgöra reserven"* | omätt | **nej** |
| **Representativitetsradien** — hur långt molnet *får* sträckas (bara *måste* är mätt: 50 km, 108 stationer) | omätt | **nej** |

Bedömning v1:s T4 ("läs `smhi[]` i skuggan") ska bygga mot #95(d):s redan fastställda F-svep, inte
uppfinna en generisk loggning.

---

## 9. Sjätte farslag — tre kandidater och ett kriterium

Kartans §7.8 säger *"berika en befintlig faras underlag, lägg inte till farslag"*. Tavlan bär tre kort
som vill ha ett nytt `HazardKind`:

| Kort | Slag | Skäl | Fog |
| :-- | :-- | :-- | :-- |
| **#42** (#81 D) | `aquaplaning` | annan fara, annan handling (fart), eget förvillkor (yta > +4), egen text, "halkan vinner" | F5 |
| **#32** | hinder / djur på vägbanan | DECISIONS #5 lovade "olyckor + hinder"; 173/vecka med riktig position | F5 |
| **#45** | snö/slask — *om* meta inte räcker | våtbulb-klass per segment; #52:s vektor låser motsatsen | F5/F4 |
| **#15** | kö-slut (TrafficFlow) | varken halka, is, vilt eller kamera — förarens handling är "bromsa, kö framför"; låst efter release som uppdatering 1 | F5 |

§7.8 är en lärdom ur ett lyckat fall (#46), inte ett kriterium. **Förslag, att fastställas före något
av de tre byggs:** ett nytt farslag är motiverat bara om **(1)** förarens handling skiljer sig från
alla befintliga slag, **(2)** texten inte kan lånas från ett befintligt slag utan att ljuga, och
**(3)** prioriteten mot varje befintligt slag är beslutad av Axel före vektorn skrivs. Mot det:
**#42 ja** (1 och 2 klara, 3 öppen) · **#32 kanske** (1 klar) · **#45 nej** (handlingen är halkans,
texten kan vara halkans, prioriteten är halkans) · **#15 troligen ja** (1 och 2 klara — men efter release,
och prioriteten mot `accident` är öppen).

---

## 10. Rättelser — till kartan och till bedömningen

**Införda i bedömning v2.** **Till kartan: väntar på Bengts beslut** (kartan är det enda dokumentet
om helheten; ändringar där är hans).

| # | Var | Fel | Rätt |
| :-- | :-- | :-- | :-- |
| R1 | kartan §7.8, §5.4 | #42 "som meta" | egen byggordning (#81), höstfönster, byggd radarhalva, motorsteg **F5 av konstruktion**; det prövade undantaget från §7.8 |
| R2 | kartan §5.2 | "radarn ligger redan i telefonen" | …*för halkklassade segment*; vattenplaningens når den inte (#154) |
| R3 | kartan §9.1, §2 | "Höjden underkänd" | underkänd som medelkorrektion på **yta**; #96 mäter varje måndag; lapse 0,63; varianspredikator omätt |
| R4 | kartan §10.2 | oljefilm → #42:s vattenfilmålder | överspelad sedan #155 |
| R5 | kartan §10.2 | `rate_max` → kvot, "mätt faktum" | fältet **spärrat** tills rensat |
| R6 | kartan §10.2 | K1 "fönsterglappsdetektor" | detekterar ett känt formatfaktum — läxa, inte verktyg |
| R7 | kartan §10.1 | "#94 stängt" | försäkringsspåret stängt; kortet öppet |
| R8 | kartan §2, §4 | "#163", "#165" som kort | DECISIONS-nummer |
| R9 | kartan §10.2 | "Ord-per-resa (#103)" | "DECISIONS #103" — kollision med kort #103 |
| R10 | kartan §9.1 rad 13 | "platt ~1,5 %" utan förbehåll | bär #168:s två reservationer |
| R11 | kartan §11 | "snöby bara radarn ser (#43)" | #43 steg 4 öppnat — mätbar fråga, inte kant |
| R12 | kartan §2, #95-raden | — | reserven 2,36 °C, Verify 2, representativitetsradien som öppna L4-frågor |
| R13 | kartan §7.8 | "aldrig ett sjätte slag" | kriteriet i §9 som regel |
| R14 | kartan §12 / bedömningen §1.3 | "kamerafacit tomt" | **två av tre** facitkällor tomma/stilla; tredje omätt; ingen vakt mäter tillväxt |
| R15 | kartan §7.8 / bedömningen L4 | "#45 som meta" | …**efter att #52:s vektor beslutats** |
| R16 | bedömningen §1.2 | 8 rader | 10 tröskeldokument |
| R17 | bedömningen T4 | "läs `smhi[]`" | mot #95(d):s F-svep |
| R18 | bedömningen T8 | "#161 gradlew CRLF" | CRLF gjort; **bevisa att 13 källor sparas** |
| R19 | bedömningen E | "nivå + bevis i stället för enum" | bygg på **K2:s osäkerhetszon** |
| R20 | bedömningen §5 | "inget att ta bort" | sluta kalla #96 och #94 borttagna |
| R21 | bedömningen | #86, #97, #52, #83 steg 2, #44 saknas | tillagda |
| R22 | bedömningen §1.7 | gallring "saknas" (v1-utkast) | finns (sql/014); räcker ~55 dygn |
| **R23** | kartan §11, §7.2 | nowcast saknas helt | **#16 som namngiven gräns:** "vad som är på väg" ligger utanför produkten av beslut #25 (*observation, inte prognos*) tills #16 — L3 har i dag bara sin bakåtblickande halva. Radarn samplas bara över svenska segment; regn över Öresund tjugo minuter från Malmö kastas |
| **R24** | kartan §7.8 · granskningen §9 | tre kandidater till nytt farslag | **fyra:** #15 kö-slut är den fjärde, prövad mot samma kriterium (troligen ja, efter release) |

---

## 11. Vad som kan tas bort — omprövat

**Inget nytt.** Sjutton förkastanden håller. Två saker att **sluta kalla borttagna**: #96 (mäter) och
#94 (öppet). "Höjdkorrektionen i #45 fryses" står kvar — med tillägget att konstanten är inaktuell.

---

## 12. Beslut som behövs — samlade

| Beslut | Vem | Rekommendation |
| :-- | :-- | :-- |
| #42: skugga (E) i höstregn **nu** | Bengt | **ja** — enda spåret med höstfönster |
| #42: sjätte farslag eller meta? | Bengt + Axel | skjut till mars på V-B:s data; kriteriet i §9 avgör |
| **Kriterium för nytt farslag** (§9) in i kartan §7.8 — före #42 D, #32, #45 | Bengt + Axel | **ja** |
| **#52: ska kod 1 + "Packad snö" larma?** — vektor i tre portar | Bengt + Axel | **avgör före #45** |
| #154: vidga väglagsfrågan med `regn ≥ 2,0`? | Bengt / steg C | ja — en skrivare hålls |
| #97: kodgrind nu, ordlista senare | Bengt | ja — noll vektorer i dag |
| #45: lapse 0,71 → 0,63 (§5 dubbelsignatur) | Bengt + Axel | ja |
| `regn-tackning` en gång efter ingest-live-bytet | Bengt | ja — knapp, en minut |
| #83 steg 2 (export/Pro) före första kalla veckan | Bengt | ja |
| **#86: rotera PAT senast 15/11**, bevisa med publicering, datum i vakthunden | Axel | ja |
| Vakthundsrad "historiken växer" | Bengt | ja |
| Mät `situation_archive` | Claude, på ord | ja |
| Bevisa 13 källor i trv-bevaknings state | Claude | ja |
| #76: deploybevis för manifest-sha-vakten | Axel/Bengt | ja |
| Höjden som varianspredikator — ny fråga, egen grind | Bengt | ja — kräver inte vinter |
| E byggs på K2 | Bengt | ja |
| #146: `git rm --cached` + `.gitignore` | Bengt/Axel | ja |
| **Rätta kartan med R1–R15 + R23–R24** | Bengt | på ditt ord |

---

## 13. Metod och förbehåll

- **Läst, inte kört.** Prövningen av förkastandena bygger på DECISIONS-texterna och tavlan. Ingen
  mätning är omkörd.
- **Tre vändor.** Första vändan missade tre kort som klassats "inte integration" på rubrik — alla tre
  var det. Därför lästes alla 30 i sin helhet i tredje vändan: 12 av 19 återstående var "inte
  integration", 4 var det, 3 rättade min egen granskning (#44, #83, #161).
- **#51:s tal är från 5/9** och kursorhypotesen är otestbar före snö. **#52:s 31,7 % är ett tak.**
  **#44:s 44 % är från före ingest-live-bytet.**
- "Alla öppna kort lästa" betyder att listan är **läst**, inte att den är **komplett**. Fjärde vändan
  bevisade det: två kort som lästs och avfärdats (#15, #16) visade sig höra till kartan när frågan
  ställdes från Skåne i stället för från skuggan. Klassningen "inte integration" har nu fallit 5 av 7
  gånger den prövats.
