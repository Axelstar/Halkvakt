# Granskning 2026-09-15 — det kartan inte gick igenom, de förkastade prövade på nytt, och vad bedömningen missade

**Status: FÖRSLAG.** Inget byggt, inget beslutat. Det här är underlaget för en **ny, heltäckande
bedömning** — inte bedömningen själv. Bengts order: gå igenom de delar av integrationskartan som inte
granskats noggrant, pröva varje förkastande på nytt, leta efter det som kan återanvändas i
helhetsgreppet, och lista allt som missats.

**Vad som lästes den här gången, som inte lästes förut:** alla tio tröskeldokumentens statusrader
och grindar · DECISIONS #55, #96, #103, #110, #116, #119, #134, #137, #153, #155, #156, #162, #164,
#168 · korten #42, #43, #81, #92, #93, #94, #96, #97, #98, #100, #103, #151, #154, #158 i sin helhet ·
`publish/snapshot-core.ts` rad 92–130. Allt som står nedan har en rad i något av dem.

---

## 0. Slutsatsen först

1. **#42 vattenplaning är det största enskilda hålet i bedömningen.** Den fick en rad ("som meta,
   efter L1"). I verkligheten har kortet en egen fastställd byggordning (#81 A–F), varav A, B och
   halva C är **byggda**; dess grind V-A **föll tre gånger med tredubblat underlag**; radardomen
   **höll**; utlösartröskeln är satt och kontrasignerad; och dess motorsteg är **ett sjätte farslag
   (F5) enligt Bengts eget kort** — i direkt strid med kartans §7.8 och bedömningens L4. Dessutom är
   det den **enda** delen med ett höstfönster i stället för ett vinterfönster.
2. **Kartans "radarn ligger redan i telefonen" är bara halvsann.** `regn` sätts på segment som redan
   passerat halkfiltret (`snapshot-core.ts:101`). En blöt, normalklassad väg — där vattenplaning
   uppstår — når aldrig `live.json` (kort #154, bekräftat i koden).
3. **Av tio tröskeldokument har ett fallit (V-A, stationsspåret), noll passerat och nio väntar.**
   Bedömningens §1.2 listade åtta delar; fyra fastställda dokument saknades helt: #103
   frysklassningen, #46 rimfrosten, #90 vind/sikt, #151 väglagets ålder.
4. **Förkastandena var rätt — alla sjutton — på den fråga som ställdes.** Men fyra av dem har fått
   fel efterord i kartan: höjden mäter fortfarande (#96 öppet), `rate_max`-kvoten är **spärrad**
   tills fältet är rensat, oljefilmens "återanvändning i #42" är **överspelad** sedan #155, och #94
   är ett öppet kort, inte ett stängt.
5. **Tre motorfel och två datakvalitetsfel som kartan aldrig nämner:** #97 (halk-regexen blind för
   "Rimfrost"/"Halkrisk"), #156 (halkorden i tre versioner), #154 (regnfältet), #44 (regnmätarna
   fångar varannan bucket — 44 % täckning), #83 (gallringen före första kalla veckan).
6. **Andra vändan (Bengts "är allt täckt nu?") hittade sex hål till — se §9.** Två av tre facitkällor
   är tomma eller stillastående (kamerafacit 0 objekt, `road_condition_history` 830 rader, nyaste 25/8);
   ett test låser **motsatsen** till #45:s vinterbaseline i alla tre portarna (#52); två nycklar går ut
   mitt i säsongen och fäller allt utan att något ser trasigt ut (#86); och #95:s Verify 2 och
   representativitetsradie står i inget dokument.

---

## 1. Vad som saknades — på kortnivå

### 1.1 Kort som kartan nämner men bedömningen inte

| Kort | Vad | Varför det spelar roll |
| :-- | :-- | :-- |
| **#38b** | Stråket / grind A:s byggordning | Novemberbeslutet (segmentmotorn nästa vinter eller på oklarerad modell) står här — Bengts och Axels |
| **#43** | Radarn som infrastruktur, sex nyttor | Steg 4 öppnat 13/9. Snöbyar mellan stationer (§11 i kartan) är radarns roll — aldrig mätt |
| **#92 · #93 · #100** | Stängda kort | Rätt stängda — se §3 |
| **#94** | Samarbeten | **Kartan säger "stängt". Kortet är ÖPPET** — bara försäkringsspåret stängdes; åkerier/NTF kvar |
| **#95** | SMHI (fem trådar) | Behandlat i föregående svar — F-B är en tredje vintergrind |
| **#98** | Tystnadsfelet | Fastställt, kontrasignerat, **noll kod**. T3 vägrar svara utan larmpositioner (form A 14/9) |
| #163 · #165 | — | **Inte kort utan DECISIONS-nummer** (vindtaket, spärren). Kartan kallar dem kort |

### 1.2 Öppna kort på tavlan som kartan ALDRIG nämner — de som rör integrationen

Tavlan bär 30 öppna kort utanför kartan. Elva rör helheten:

| Kort | Vad | Klass |
| :-- | :-- | :-- |
| **#42** | Vattenplaning — en rad i bedömningen, ett helt spår i verkligheten | **saknas i sak** — §2 |
| **#44** | Regntäckningen: mätarna fångar **1 av 2** 30-min-buckets, 44 % täckning; regn-30 byggd, cronen svalde | **datakvalitet för T1** (`regn_h`) |
| **#83** | Gallring av `weather_observations` före första kalla veckan — 500 MB fulla på 11–16 dygn | avgör #89/#98:s byggform (#155) |
| **#96** | Höjdprovet — **mäter varje måndag**, lapse 0,63 °/100 m ur 3 476 par | kartan säger "underkänd" — §3 |
| **#97** | Halk-regexen blind för sammansättningar | **motorfel**, F4, en vektor — §5 |
| **#103** | Frysklassningen (K-A körd: INGEN DOM, 0 frysande punkter) — **K2 "osäkerhetszon" är direkt återanvändbar** | fastställt, saknas i §1.2 |
| **#151** | Väglagets ålder (Å-A väntar på vinter) | fastställt, saknas i §1.2 |
| **#154** | Regnfältet når inte vattenplaningens segment | **bryter kartans §5.2** — §2 |
| **#156** | Halkorden i tre versioner (motor · SQL · ?) | Axels beslut väntar |
| **#158** | Larm saknar position — form A deployad 14/9; **sexton dygn förlorade** | facitstacken börjar från 14/9 |
| #32 · #15 · #16 | Hindren, kö-slut, blixthalka | låsta efter release — rätt att lämna |

### 1.3 Två nummerkollisioner som förvirrar läsningen

- **#154** är både *TRV-anmälan om byvindgivare* (rad 620) och *steg C:s regnfält* (rad 806).
- **#103** är både DECISIONS-numret för *ord-per-resa* (som kartan använder) och **kortet
  frysklassningen**. Kartans §10.2 "Ord-per-resa (#103)" läses lätt som frysklassningskortet.

---

## 2. #42 vattenplaning — vad bedömningen missade

Bedömningen: *"L4 — #45 snö/slask och #42 vattenplaning — som meta, aldrig som sjätte slag, efter
L1."* Verkligheten, läst ur kortet, #81 och DECISIONS #153–#162:

| Steg | Läge | Källa |
| :-- | :-- | :-- |
| Grind **V-A** (stationsspåret bär intensitet?) | **FÖLL ×3**, sista 13/9: träff **60 %** mot 70, n = 73 194 | #104, #153 |
| Radardomen | **HÖLL**, Bengt valde (c): radarn ger intensiteten mellan stationer | #153 |
| Utlösartröskel | **`rate_mean` ≥ 2,0 mm/h**, kontrasignerad av Axel | #155, #156 |
| #81 **A** kalibrering i dokumentet | ✅ faktor 0,65, §3.4 | #156 |
| #81 **B** datan utan nya minuter | ✅ radarn stannar i timingesten | #156 |
| #81 **C** snapshoten, radarhalvan | ✅ `regn` per segment byggt | #162 |
| #81 **C** stationshalvan | ⛔ **blockerad** — `weather_latest` saknar `rain_sum_mm` | #162 |
| #81 **D** motorn | ⏳ **ny `HazardKind` `aquaplaning`** — tre portar, egen vektor, "halkan vinner" | #81, #68 |
| #81 **E** skuggan V-B | ⏳ inte byggd | #81 |
| #81 **F** rösten | efter V-C + Axels ja | #81 |

**Fyra saker bedömningen inte visste:**

**(a) V-A:s nej är ett riktigt nej — och ett nej på rätt fråga.** Stationerna vet *att* det regnar
(träff + delvis 88–94 %) men inte *hur mycket*, och intensitet är exakt det vattenplaning kräver.
Alternativet att skriva om V-A1 till "regnar det alls" avvisades sakligt: mätbart och värdelöst.
Det är ett förkastande som håller.

**(b) `regn` når inte vattenplaningens segment.** Bekräftat i `snapshot-core.ts:101–102`: fältet sätts
bara på segment som redan är `condition_code >= 2` eller bär ett halkord. Live 14/9 hade **0
segment** medan radarn såg **124** med regn. Kortet #154 ställer frågan till Bengt: vidga
väglagsfrågan, eller låt steg D läsa `radar_precip` direkt (bryter en-skrivare-regeln #81:2)?
**Kartans §5.2 måste omformuleras:** radarn ligger i telefonen *för halkklassade segment* — inte för
de segment #42 behöver.

**(c) #81 D är F5, inte F4 — och det strider mot kartans §7.8.** Kortet säger uttryckligen "ny hazard
`aquaplaning`, egen vektor, plats i A-skalan = Axels ja". Kartan säger "aldrig ett sjätte slag";
bedömningen säger "som meta". **Båda mina dokument är i konflikt med ett kort Bengt beställt.**

Min bedömning av sakfrågan: rimfrosten (#46) blev rätt en andra gren i `icing_point` därför att den
*är* isrisk — samma fara, samma handling, samma text. Vattenplaning är en **annan** fara med en
annan handling (fart, inte is), ett annat förvillkor (yta > +4 °C, halkan vinner) och egen text.
Som meta på `slippery_segment` ärver den "halka rapporterad" — fel ord. Som meta på `icing_point`
ärver den frysvillkoret — fel fysik. **Vattenplaning är sannolikt vinterns enda legitima F5.**
Men steg E (skugga) kommer före F (röst) oavsett, och V-C kräver ≥ 200 varningar, ≥ 15
facithändelser, ≥ 5 regndygn — så rösten är ändå inte aktuell i vinter. **Rekommendation:** låt
§7.8 stå som regel med #42 som prövat undantag; besluta slag-eller-meta i mars på V-B:s data;
skugga nu.

**(d) #42 har ett HÖSTFÖNSTER.** "Höstregnen är en engångschans i år (nästa hösten 2027)." Allt
annat i kartan väntar på frost. #42:s skuggmätning (E) kan börja i regn — nu. Bedömningen sorterade
den till "längre sikt, efter L1". Det är fel ordning.

**Följdfel i kartan:** §10.2 säger att oljefilmens torrdygnsräknare är "samma beräkning #42 behöver
för vattenfilmens ålder". Sedan #155 är #42:s utlösare radarintensitet, inte vattenfilmålder.
Återanvändningen är **överspelad**.

---

## 3. De förkastade — prövade på nytt, ett i taget

Kriteriet: *var förkastandet rätt på den fråga som ställdes* (kartans §9) — och *finns en ny fråga
som kan ställas före mätning, med egen grind*.

| # | Del | Vad som mättes | Rätt att förkasta? | Vad överlever / ny fråga | Rättelse till kartan |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | **SMHI som ankare** (#119) | 1 918 p: bas 1,05 → +SMHI **1,20**, sämre i varje band | **Ja**, robust | (a) räckviddsknapp — aldrig mätt · (b) **reserv när TRV tystnar: uppmätt pris 2,36 °C** på 352 punkter · (c) #95(d) förstärkaren, egen vintergrind F-B | (b) saknas helt i kartan |
| 2 | **Höjden** (#96, #91) | 1 962 p: rå 1,65 → rå+höjd **1,65**; sämre i 7–15 och > 20 km; **bättre i 0–7** (2,58→2,31) | **Ja** som medelkorrektion på yta | **Lapse 0,63 °/100 m ur 3 476 par är ett starkt fysiskt faktum.** Varianspredikator — aldrig mätt. **#96 mäter fortfarande varje måndag** | Kartan: "underkänd". Tavlan: "mäter redan". **Och #45 använder 0,71 — det gamla talet** |
| 3 | **Kamerorna som täckning** (#55) | 6 av 744 nytt ankarläge, två oberoende körningar | **Ja** | Bildfacit — beslutat, **men tomt**: 0 objekt, form A 14/9, sexton dygn förlorade | §9.1 "✅ redan omrollad" — sant om beslutet, falskt om funktionen |
| 4 | **RH-guarden** (#96 0b) | RH **stiger** efter regn: 90 % vid +1 h, 95 % vid +4 h | **Ja**, filtrerar inget | Faktumet är en förutsättning för kondensation. R-A använder daggpunktsgap, inte RH — RH är bara stödsignal | ingen |
| 5 | **Operatörens "Våt"** (#96) | 33 rader, 0 med efterföljande klassning | **Ja** som proxy | Som facit? **33 rader är för lite också för det.** Vänta på vinter | Kartan överskattar återanvändningen |
| 6 | **Oljefilmen #89(b)** (#110) | 55 torrperioder, 6 olyckor mot 15 | **Ja** — scope, inte mätfel; "inte nåbar i höst oavsett" | Torrdygnsräknaren finns. **Men #42 använder den inte längre** (#155) | §10.2 överspelad |
| 7 | **Ord-per-resa** (#103) | Bengts fältdom: cry wolf = falska larm | **Ja**, principiellt | Episoder som enhet — Axel bekräftade 14/9 | ingen |
| 8 | **R3 hård åldersgräns** | Förkastad **före mätning** — en invariant: skulle tysta en sann varning | **Ja** — formfel, inte talfel; 0 av 818 segment har `end_time` | Principen står redan i `snapshot-core.ts:96–99` | ingen |
| 9 | **E3 högre prioritet** | Aldrig | **Ja** | Bindande villkor på #153 | ingen |
| 10 | **`rate_max`** (#134) | 727,54 mm/h — radarartefakt; spann 0–200 deklarerat | **Ja**, sentinel | Kvoten max/mean som formsignal — **men fältet är SPÄRRAT tills raderna rensats** (#155) | §10.2 säger "mätt faktum" utan att säga "spärrat" |
| 11 | **K1 byvindkvot per rad** (#164) | 335 av 748 — kvoten mäter fönsterglapp, inte givare | **Ja**, föll på egen mätning | Som "fönsterglappsdetektor"? Den detekterar ett **känt formatfaktum**, inte en trasig station. **Läxa, inte verktyg** | §10.2 överskattar |
| 12 | **Per fordonstyp** (#92) | Stängt som scope | **Ja** | Riskmodifierare-begreppet står i OVERGANGAR §1b.2 | ingen |
| 13 | **Radarns bidrag ∝ avstånd** (#168) | Platt: ~1,5 % vid r ≥ 0,5 i alla band | **Ja** — med två reservationer DECISIONS själv skriver: bandet 20–50 km bär 25 segment; 5,3 dygn frontregn | "Inget nej till radarn som källa: 96 % precision." Segmentupplösning — aldrig mätt | §9.1 bör bära reservationerna |
| 14 | **#100 dämpning** | 1 larm för 39 min halka | **Ja**, fältdom | TOTALEN (11 larm/62 min) → #153 | ingen |
| 15 | **#93 kommunala vägar** | Ingen källa | **Ja** | Halva flyttad till #95(d) | ingen |
| 16 | **#94 försäkringsbolagen** | Klarlagt otillgängligt | **Ja** — spåret | **Kortet är öppet** (åkerier, NTF) | §10.1 "stängt" är fel om kortet |
| 17 | **Breda SMHI-regeln** | Län ≠ punkt | **Ja** | `N_varning` i #89 §2.3 | ingen |

**Sammanfattning av §3:** sjutton förkastanden, sjutton rätt — ingen bör upphävas. Men fyra efterord
i kartan är felaktiga eller överspelade (2, 6, 10, 16), och två återanvändningar är svagare än
kartan låter påskina (5, 11). **Den enda nya frågan som inte redan står på ett kort är höjden som
varianspredikator**, och den kan ställas mot #96:s veckodata utan vinter.

---

## 4. Tio tröskeldokument — vad som faktiskt är dömt

| Dokument | Kort | Grind | Körd? | Utfall | I bedömningens §1.2? |
| :-- | :-- | :-- | :-- | :-- | :-- |
| SKUGGAN | #38b | A | ja, 2 881 p | **INGEN DOM** | ja |
| OVERGANGAR | #89 | Ö-A..D | steg 0 + skattaren | väntar (frost) | ja |
| TRENDEN | #88 | T-A/B/C | T-A byggd | väntar (frost) | ja |
| TYSTNADSFEL | #98 | — | **noll kod** | T3 kräver positioner (form A 14/9) | **nej** |
| RIMFROST | #46 | R-A..D | R-A körd (#137) | **OAVGJORT** — "fällde mig på ett tyst filter" | **nej** |
| FRYSKLASSNINGEN | #103 | K-A/B/C | K-A körd (#137) | **INGEN DOM — 0 frysande punkter**; 99,5 % rätt klass "betyder ingenting" | **nej** |
| VIND-SIKT | #90 | W-A/B/C | steg 0 körd | OAVGJORT; exponeringen diet-filtrerad (#116) | **nej** |
| SMHI-FÖRSTÄRKAREN | #95(d) | F-A/B/C | körd 12/9 | OAVGJORT — 0 SNOW_ICE i september | **nej** |
| VAGLAGETS-ALDER | #151 | Å-A/B | — | väntar (vinter); R3 förkastad före mätning | **nej** |
| VATTENPLANING | #42 | V-A/B/C | V-A ×3 | **FÖLL** (stationsspåret); V-B inte byggd | **nej** — en rad |

**Ett fallet, noll passerade, åtta väntar, ett med noll kod.** Bedömningens tabell täckte fyra av tio.

**En återanvändning som ingen sett:** frysklassningens **K2 — osäkerhetszonen** (±0 · ±0,5 ·
±1,0 °C, modellen får säga "vet inte" nära gränsen). Det är exakt det graderade mått bedömningens
**E** efterlyser, och det är redan fastställt i ett tröskeldokument. E bör byggas på K2, inte
uppfinna en egen skala.

---

## 5. Motorfel och datakvalitetsfel som kartan aldrig nämner

| Kort | Fel | Fog | Kostnad | Beslut |
| :-- | :-- | :-- | :-- | :-- |
| **#97** | `SLIPPERY_INFO`-regexens lookbehind matchar bara ordstart: "Rimfrost", "Halkrisk" passerar tysta oavsett kod. 0 träffar i 838 arkivsträngar i dag — **en tyst ALDRIG** den dag TRV skriver så | F4 | en vektor, tre portar | Bengt: vidga ordlistan, eller låt kodgrinden vakta |
| **#156** | Halkorden i tre versioner: motorn har `mycket besvärligt`, SQL:en i `snapshot-core.ts:102` har det **inte** | F1/F4 | — | Axel |
| **#154** | `regn` bara på halkklassade segment | F1 | vidga frågan (snapshot större) eller andra läsare (bryter #81:2) | Bengt / steg C:s ägare |
| **#44** | Regnmätarna fångar **1 av 2** buckets (78 % av stationstimmarna), täckning **44 %**. `regn-30` byggd 3/9, GitHub-cronen svalde den (3 av 14 avfyrningar) | — | halverar vinterseriernas växttakt; **T1:s `regn_h` vilar på detta** | Bengt: regn-30 på pulsen, eller släpp |
| **#83** | Gallring saknas före första kalla veckan: 122 000–175 000 rader/dygn ⇒ 500 MB på 11–16 dygn | — | avgör om #89/#98 kan "räkna om" eller måste spara som #88 (#155) | **oktoberbeslut**, ligger inte i bedömningen |
| **#45** | Lapse-konstant **0,71** — #96:s färska tal är **0,63** ur 3 476 par | dokument | §5 dubbelsignatur | Bengt + Axel |

---

## 6. Rättelser som följer — till kartan och till bedömningen

| # | Var | Fel | Rätt |
| :-- | :-- | :-- | :-- |
| R1 | Bedömningen L4 · kartan §7.8 | #42 "som meta, efter L1" | #42 har egen byggordning (#81), höstfönster, byggd radarhalva, och ett motorsteg som är **F5 av konstruktion**. Skugga nu; slag-eller-meta i mars |
| R2 | Kartan §5.2 | "radarn ligger redan i telefonen" | …*för halkklassade segment*. Vattenplaningens segment når den inte (#154) |
| R3 | Bedömningen §1.2 | 8 rader | 10 tröskeldokument — #103, #46, #90, #151, #95(d), #42 saknades |
| R4 | Kartan §9.1 · §2 | "Höjden underkänd" | Underkänd som medelkorrektion på **yta**. #96 mäter varje måndag; lapse 0,63; varianspredikator omätt |
| R5 | Kartan §10.2 | oljefilm → #42:s vattenfilmålder | Överspelad sedan #155 (radarintensitet) |
| R6 | Kartan §10.2 | `rate_max` → kvot, "mätt faktum" | Fältet **spärrat** tills spannet rensats (#155) |
| R7 | Kartan §10.1 | "#94 stängt" | Försäkringsspåret stängt; kortet öppet |
| R8 | Kartan §2, §4 | "#163", "#165" som kort | DECISIONS-nummer |
| R9 | Kartan §10.2 | "Ord-per-resa (#103)" | Kollision med kort #103 frysklassningen — skriv "DECISIONS #103" |
| R10 | Bedömningen E | "nivå + bevis i stället för enum" | Bygg på **K2:s osäkerhetszon** (#103) — redan fastställd |
| R11 | Bedömningen T4 | "läs `smhi[]` i skuggan" | Peka mot #95(d):s F-svep (föregående svar) |
| R12 | Bedömningen §5 | "inget att ta bort" | Två saker att **sluta kalla borttagna**: #96, #94 |
| R13 | Bedömningen | #97 saknas | En-vektors F4 eller kodgrind — dagens-kandidat |
| R14 | Bedömningen T1 | `regn_h` utan förbehåll | Vilar på 44 % bucket-täckning (#44) — säg det |
| R15 | Bedömningen | #83 saknas | Oktoberbeslutet avgör #89/#98:s byggform — hör till "kort sikt" |
| R16 | Kartan §9.1 rad 13 | "platt ~1,5 %" utan förbehåll | Bär #168:s två reservationer: tunt yttre band, 5,3 dygn frontregn |
| R17 | Kartan §11 | "snöby bara radarn ser (#43)" | #43 steg 4 är öppnat — det är inte längre "kartans kant", det är en mätbar fråga |

---

## 7. Vad som kan tas bort — omprövat

**Inget nytt.** De sjutton förkastandena håller. Men listan "tas bort/fryses" i bedömningens §5.1
måste rättas på två punkter: **#96 höjdprovet** ska inte stå som avslutat (det mäter), och **#94** är
ett öppet kort. "Höjdkorrektionen i #45 fryses" står kvar — med tillägget att konstanten dessutom är
inaktuell.

---

## 8. Beslut som tillkommer

| Beslut | Vem | Min rekommendation |
| :-- | :-- | :-- |
| #42: skugga (E) i höstregn **nu**, före allt vinterberoende | Bengt | **ja** — det enda spåret med höstfönster |
| #42: sjätte farslag eller meta? | Bengt + Axel | **skjut till mars** på V-B:s data; skriv in i kartan att #42 är det prövade undantaget från §7.8 |
| #154: vidga väglagsfrågan eller andra läsare? | Bengt / steg C | vidga frågan med `regn ≥ 2,0` — en skrivare hålls, snapshoten växer marginellt (124 segment i regn) |
| #97: vidga ordlistan eller kodgrind? | Bengt | **kodgrind nu** (noll vektorer), ordlistan när TRV skriver så |
| #45: lapse 0,71 → 0,63 | Bengt + Axel (§5) | ja — det är #96:s mätning, inte ett tyckande |
| #44: regn-30 på pulsen | Bengt | ja — halverad växttakt drabbar varje vinterserie |
| #83: gallringen (oktoberbeslutet) | Bengt | **måste tas före första kalla veckan**, inte i oktober |
| Höjden som varianspredikator — ny fråga, egen grind | Bengt | ja — kräver inte vinter, #96:s data finns |
| E byggs på K2 | Bengt | ja |

---

---

## 9. Andra vändan — det jag avfärdade utan att läsa, och #95:s trådar som inte står någonstans

Bengts kontrollfråga: *"är allt täckt nu, även kort 95?"* Kontrollerat mot alla tre dokumenten (kartan,
bedömningen, granskningen §0–§8). Svaret var nej på sex punkter.

### 9.1 #95 — två trådar står i inget dokument

| Tråd | Kartan | Bedömningen | Granskningen §0–8 |
| :-- | :-- | :-- | :-- |
| Ankaret förkastat (1,05 → 1,20) | ja | — | ja |
| Reserv när Trafikverket tystnar helt — **uppmätt pris 2,36 °C** på 352 punkter | — | — | ja (§3 rad 1) |
| #95(d) förstärkaren, F-B som tredje vintergrind | — | — | ja (§4) |
| T4 ska bygga mot #95(d):s F-svep | — | — | ja (R11) |
| **Verify 2** — luft→yta-korrelationen vintertid, *"den enda som kan avgöra reserven"* | **—** | **—** | **—** |
| **Representativitetsradien** — hur långt molnet FÅR sträckas (bara hur långt det MÅSTE är mätt: 50 km, 108 stationer) | **—** | **—** | **—** |

Dessutom: analysen av #95:s fem trådar gavs **i chatten** 15/9 och skrevs aldrig in någonstans förrän nu.
Enligt husregeln fanns den alltså inte. Båda saknade trådarna hör till **längre sikt** (reserven är en
beredskap, inte en väg; radien är L4-arbete) — men de ska stå på #95:s rad i kartan.

### 9.2 Tre kort jag klassade som "inte integration" utan att läsa dem — alla tre var det

**#86 NYCKELKALENDERN — kan stoppa vintern mitt i säsongen, tyst.** PAT:en (kartrepot/publicera +
vakthundens larm) går ut **22/11**; Supabase-tokenen (deploy-knappen) **8/12**. Kedjan när PAT:en dör:
publicera får 401 ⇒ CDN fryser ⇒ appens åldersspärr tystnar vakten (5/9-läget) ⇒ **vakthunden kan inte
larma, för larmvägen använder samma PAT.** Ingenting ser trasigt ut. Rotera senast **15/11**, och en
nyckel är inte bytt förrän en publicering gått igenom med den. Axels kort — men det hör till varje lista
över vad som kan fälla vinterleveransen, och det stod i ingen av mina.

**#51 VINTERARKIVET — moaten är inte läckande, den är tom.** `road_condition_history` är husets
uttryckliga vinterarkiv (*"our moat"*, sql/001). Mätt 5/9: **830 rader över 818 segment, nyaste rad
2026-08-25** — ett stillbildsavtryck plus tolv ändringar, ingen vinterhistorik alls. Hypotesen om den
delade kursorn (minutjobbet flyttar kursorn ~59 gånger i timmen, timjobbet — arkivets enda skrivare —
ser bara sista deltat) är **otestbar tills snön kommer**, vilket är exakt när den spelar roll. Och en
blind fläck: healthchecken vaktar `sync_state`-färskhet, men edge-funktionen skriver `synced_at = now()`
varje minut oavsett om något hämtades — vakten kan inte skilja *färsk och tyst* från *färsk och trasig*.

**Det ändrar §1.3 i bedömningen.** Där står att kamerafacit är tomt. Nu vet vi att **två av tre
facitkällor** är tomma eller stillastående (kamerafacit 0 objekt, `road_condition_history` still sedan
25/8). Den tredje, `situation_archive`, har jag inte mätt. T-B, #98 och #42 döms mot den här stacken.
**Facitstacken är inte en lös tråd — den är nästan tom, och ingen vakt mäter om den växer.**

**#52 ETT TEST LÅSER MOTSATSEN TILL #45:S VINTERBASELINE — i alla tre portarna.**
`test/engine.test.ts:143–146` (och Engine.kt:162, Engine.swift:306) hävdar att ett segment med **kod 1
(Normalt)** och info **"Packad snö"** MÅSTE larma. Kort #45 säger att packad snö i vinterbaseline
*"larmar ALDRIG"* — i Norrland är det normaltillståndet. Principen är alltså inte obyggd; den är
**aktivt låst åt andra hållet**, och att ändra den är en kontraktsändring i vektorerna. Exponeringen
mätt 5/9: Norrland 168 segment, **31,7 % av vägsträckan**, snitt **44,8 km per segment** (1,8 × resten).
Ett "Packad snö"-segment i Jämtland är nästan sex mil sammanhängande larmyta, upp till tre repriser
per resa. Det är ett tak, inte en prognos — arkivet har ingen vinter. Men kartans §7.8 och bedömningens
L4 säger "#45 som meta" som om vägen vore fri. **Den är låst av en vektor som måste beslutas först.**

### 9.3 Vad det gör med listorna

| Var | Tillägg |
| :-- | :-- |
| Bedömningen §1.3 | facitstacken: **två av tre källor** tomma/stilla, tredje omätt; ingen vakt mäter tillväxt |
| Bedömningen §2.4 (I DAG) | **T11:** mät `situation_archive`:s tillväxt och lägg en vakthundsrad för *historiken växer* — inte bara *sync_state är färsk* |
| Bedömningen §3 (kort sikt) | **K10:** #86 rotera PAT senast 15/11, bevisa med en publicering · **K11:** #52 — beslut om vinterbaseline-vektorn FÖRE #45 byggs |
| Kartan §2, #95-raden | Verify 2 och representativitetsradien som öppna L4-frågor |
| Kartan §7.8 / bedömningen L4 | "#45 som meta" ⇒ "#45 som meta, **efter att #52:s vektor beslutats**" |
| Kartan §11 (det osynliga) | #51: säsongsbaselinen har inget underlag oavsett läckan |

### 9.4 Beslut som tillkommer

| Beslut | Vem | Rekommendation |
| :-- | :-- | :-- |
| #52: ska kod 1 + "Packad snö" larma? | Bengt + Axel (vektor i tre portar) | **avgör före #45** — annars byggs #45 mot en vektor som säger emot den |
| #86: rotation senast 15/11 med publiceringsbevis | Axel | ja — och lägg datumet i vakthunden, inte bara på tavlan |
| #51: vakthundsrad "historiken växer" | Bengt | ja — samma klass som kamerafacit-vakten |
| `situation_archive` mätt | Claude, på Bengts ord | ja — tredje facitkällan är omätt |

*Lärdomen från den här vändan: "inte integration" var en klassning jag gjorde på rubrik. Tre av tre
lästa kort var integration. Resten av de 19 avfärdade är fortfarande olästa.*
*Underlag till en ny bedömning. Kartan är fortfarande den enda källan för hur delarna hänger ihop;
rättelserna R1–R17 ska in där, inte här.*
