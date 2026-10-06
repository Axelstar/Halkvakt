# Integrationskartan

**Hur delarna blir en produkt, var vi byggt emot den, hur det nya greppar i motorn som redan kör,
och vad allt underkänt lämnade kvar.**

**Kartan är fryst** (Axels förslag, Bengts beslut 15/9): en ändring kommer bara efter att något byggts och
mätts. **Öppnad tre gånger: 16/9 för R1–R16** (DECISIONS #199), **24/9 för R17–R20** (DECISIONS #337) **och 1/10 för R21–R26** (DECISIONS #416) — varje gång
efter bygge och mätning, och fryst igen. *Sedan 1/10 hålls kartans läge-rader (§2, §6.1, §8, §13.6, §14) aktuella löpande
(STOMREGELN, DECISIONS #415); innehållet ändras fortfarande bara efter bygge och mätning.* *Vad som görs, och när, står i `docs/BEDOMNING-2026-09-15.md` — den enda listan.*

Det här är det enda dokumentet över hur Halkvakts delar hänger ihop. Allt som rör integrationen står
här: lagren, multiplikationen, **motorn som den faktiskt ser ut**, **fogarna där en skuggdel kan
greppa**, motkrafterna, principen för hur en del döms, och registret över allt som strukits, stängts
eller flyttats. Ligger något om helheten någon annanstans är det ett fel.

Fokus på skuggans delar (#88–#95), men vattenplaningen (#42), snön (#45), broarna (#38/#91) och det
som redan står i motorn vägs in. Beslutens historik — vad som rättats och när — ligger i DECISIONS
(#159, #180, #181, #182, #183, #184) och sammanfattas i §14. **Axels invändningar och vad de
gjorde med kartan står i §13.** Brödtexten säger vad som *gäller*, inte vad som
ändrats.

---

## 1. Vad produkten egentligen frågar

Allt vi byggt är proxyer för en enda fråga:

> **Hur halt blir det där jag är om två–tre minuter?**

Motorn i dag kan inte ställa den frågan, och skälet är strukturellt: **den har varken minne eller
räckvidd.** `engine.ts:50–54` bär prevFix, odometer, kurs, tystnadsklocka och fired-karta — noll om
vad ytan var för en timme sedan, och ingen uppfattning om hur långt en stations mätning gäller.

Varje bygge de senaste dygnen levererar **antingen minne eller räckvidd**. Det är den gemensamma
nämnaren, och den är också nyckeln till hur de ska sitta ihop.

---

## 2. Fem lager, och var varje del hör hemma

| Lager | Frågan lagret svarar på | Delar som bor här | Läge |
| :-- | :-- | :-- | :-- |
| **L1 TROVÄRDIGHET** | Får vi tro på mätvärdet? | #75 givarvakten · stationsvakten (#164) · G_tak (DECISIONS #163) · värdevakten · R-A5 | ✅ i drift |
| **L2 TILLSTÅND** | Vad **är** ytan? | tillståndsskattaren (#89 steg 2) · radarns `regn` (#81 C) · operatörens klass · **#45 våtbulb → regn/slask/snö** · **#42 vattenfilm** · **#276 olja på vägen** (Trafikverkets NonWeatherRelatedRoadConditions) | 🔨 blöt/torr byggt · olja i skugga sedan 1/10 (#421) · resten kvar |
| **L3 UTVECKLING** | Vart är den på **väg**? | trendarkivet (#88) · övergångarna (#89 a) · **#46 rimfrost** · N_varning (SMHI) | 🔨 mätt, ingen regel |
| **L4 RÄCKVIDD** | Hur långt **gäller** mätningen? | grind A:s ankare (#38b) · SMHI molnmängd som räckviddsknapp (#95; Verify 2 och representativitetsradien omätta; SMHI som reserv när Trafikverket tystnar helt — uppmätt pris 2,36 °C) · **#91 kallplatslagret** | ✅ **grind A KLARAD** (#321); segmentprognosen i skugga sedan 23/9 (#325) · ⚠️ **knappen saknas** · ⚠️ **R21 (1/10): vägpunktsgrinden FALLEN 28/9** (#399) — rå avståndsviktning 6,9 % ± 0,4 grova fel med varma grannrader; premissmätningarna 30/9 (#405–#408) räddar ingen vägpunktskandidat på ärliga rader, bandet 0–7 km håller (Finland 2,3 %), höjden läses 23/10 · **2/10:** premissmätningen går varje måndag och läses 24/11 (#435), Finland är stöd och inte dom (#436), flaggmarginalen mäts i kuvösen (#437) |
| **L5 ALLVAR & RÖST** | Vad **sägs**, och hur illa är det? | #153 allvar som **försprång** · spärren (DECISIONS #165) · **#90 roll B** | ✅ **R22 (1/10): försprånget byggt och i skugga sedan 25/9** (#359), S2 nivå + bevis 24/9 (#341); taket är motorns 3 000 m, inte appens reglage (#275, #419); rösten efter domen i mars |

**Ordningen är inte godtycklig.** L1 gatar allt. L2 och L3 multiplicerar varandra. L4 avgör hur långt
produkten av L2×L3 får sträckas. L5 är det enda ställe där något når föraren.

Var varje enskild del måste greppa i den motor som redan kör står i **§5.4**.

---

## 3. Varför det är en multiplikation och inte en summa

En blöt yta säger ingenting om framtiden. En fallande yta säger ingenting om halka utan väta. Men:

```
blöt (L2)  ×  faller mot noll (L3)  ×  mätningen gäller hit (L4)   =   en FÖRUTSÄGELSE
```

Var för sig är alla tre observationer. Tillsammans är de det enda i hela systemet som kan säga något
om en plats föraren ännu inte nått.

**Efterhalkan är beviset att det behövs.** `icing_point` kräver `moisture === true` — *"det regnar
just nu"*. Regnet slutar, fukten blir falsk inom tio minuter, ytan fortsätter falla. Steg 0 mätte
hålet: **76 % av regnstoppen hade regn i mätaren i samma stund motorn slog om till torrt**, median
35 minuter. Regeln kan alltså per konstruktion inte fyra i exakt det fönster efterhalkan inträffar.

L2 + L3 stänger det hålet. Det är den enskilt största vinsten som finns att hämta, och båda halvorna
är nu mätta och sparade.

---

## 4. Motorn som den faktiskt ser ut i dag

<!-- LÄGESRADER §4: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [Trafikverkets väderstationer](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-vader): delvis, 93 % · kvar: Värdevaktens dom OK på surface_grip när underlaget räcker (6/10: för tunt, 60 rader), och friktionen 0,82 förstådd innan fältet döms (kort #294)
- [Trafikverkets väglag (RoadCondition)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-vaglag): klar
- [Trafikverkets olyckor, djur och hinder](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-situation): klar
- [Publiceringen var tionde minut](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-l-publicera): klar
- [Motorn i tre språk](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-motorn): klar
- [Olyckor (A3), med olycksläget](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-olyckor): klar
- [Rapporterad halka (A1)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-halka): klar
- [Frysrisk vid stationer och broar (A2)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-frysrisk): klar
- [Djur på vägen (A4)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-vilt): klar
- [Fartkameror (A5)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-kameror): klar

<!-- /LÄGESRADER -->

Kartan ovan är skriven från skuggans sida. Det här är den andra sidan — inte som minne, utan läst ur
koden: `engine/src/{types,engine,snapshot,texts}.ts`, 588 rader, och den publicerade `live.json`.

### 4.1 Fem farslag, en fast stege — och vad var och en kvalificerar på

| Prio | `kind` | Källa | Villkoret i dag | Vilka lager det använder |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `accident` (A3) | TRV Situation/Deviation | avstånd ≤ **10 km**; `SeverityCode ≥ 5` ⇒ två steg (10 km "överväg annan väg", 2 km "sakta ner") | — |
| 2 | `slippery_segment` (A1) | TRV RoadCondition | `code ≥ 2` **eller** `info` matchar `is\|snö\|halka\|frost\|mycket besvärligt` | **L2** (operatörens klass) |
| 3 | `icing_point` (A2) | WeatherMeasurepoint | `yta ≤ 1 °C` (bro: ≤ 3) **OCH** `fukt === true` | **L1** + en **binär L2** |
| 4 | `wildlife` (A4) | polisen, senaste 48 h | inget utöver korridor + ledsträcka | — |
| 5 | `camera` (A5) | TrafficSafetyCamera | ≤ **500 m**, `bearing+180°` inom **60°** av kursen | — |

Talen som styr allt annat (`DEFAULT_CONFIG`): korridor **±35°**, minsta fart **15 km/h**, global spärr
**10 s** (prioritetsmedveten sedan #127), upprepning **600 s OCH 5 000 m**, ledtid **30 s** klämd till
**400–3 000 m**, segmentsampling **100 m**.

### 4.2 Vad motorn inte har — och varför "räckvidd" betyder två olika saker

- **Inget minne om vägen.** Odometern och fired-kartan minns *rösten*, inte ytan. Ingen struktur bär
  vad en station visade för en timme sedan.
- **Ingen allvarsgrad i rösten** — och det är avsiktligt (§7.1, §13.1). Men maskineriet för att
  uttrycka allvar som **tid** finns redan: `leadM` spänner 400–3 000 m, vid 90 km/h **16–120 s**.
  Ingen regel sätter det per fara ännu.
- **Ingen giltighetsradie.** Det enda avståndsbegrepp motorn har är `leadM` = fart × 30 s, klämt till
  400–3 000 m.

Den sista punkten är den viktigaste, och den är lätt att läsa fel: **`leadM` mäter förarens fart, inte
mätningens giltighet.** Grind A:s felkurva (§6.1) mäter något helt annat — hur fel ett ankarvärde blir
på 7, 15, 20 km. Två storheter, samma ord. Motorn har i dag bara den första, och den säger ingenting
om huruvida stationens `yta` över huvud taget gäller där föraren är.

### 4.3 Ledningen, hela vägen

```
snapshot-core.ts (Supabase)
   → live.json + static.json på CDN   (manifest.json bär sha256; app förkastar fel summa)
      → SnapshotRepo  (Android: org.json · iOS: JSONSerialization)
         → snapshotToHazards()        (adaptern — 1:1 i tre språk)
            → AlertEngine.step(fix)   (kvalificering → regel 2 → regel 1a → regel 1b)
               → alertText()          → rösten
```

Uppmätt i den publicerade `live.json` 14/9 05:10: **28 väderstationer, 1 avvikelse, 1 viltpunkt,
0 segment, 0 broar, 0 SMHI-ytor.** September — motorn har alltså i praktiken bara `icing_point` och
kamerorna att arbeta med just nu.

---

## 5. Fogarna — var en skuggdel kan greppa, och vad den kostar

<!-- LÄGESRADER §5: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [SMHI:s varningar](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-smhi-varningar): delvis, 75 % · kvar: Ingen läsare i motorn eller apparna
- [SMHI:s nederbördsradar](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-radar): delvis, 92 % · kvar: Motorn och apparna läser inte regn eller rain_segments
- [Lägesfilens fält för skuggdelarna](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-l-falten): delvis, 57 % · kvar: Motorn läser inte regn, rain_segments, regn_h, lutning, bevis eller smhi (fogarna F2–F4)
- [L3 trenden](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-trenden): delvis, 44 % · kvar: T-B (B3-paret och tystnadsfelet för trenden) har inget instrument
- [Rimfrosten](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-rimfrost): väntar, 38 % · Första svenska frosten: R-A inom sju dygn; vakthunden trycker den själv (#338).
- [Nederbördstypen (snö, slask)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-nederbord): väntar, 44 % · Domen tidigast 1/3 2027 när vintern gett ≥100 snö- och ≥40 slaskepisoder (NT-D).
- [Kallplatserna](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-kallplatser): stängd · Kortet #91 stängt 25/9, öppnas våren 2027 (vårlistan Ä6)

<!-- /LÄGESRADER -->

Frågan *"hur ska det som ligger i skuggan sömlöst kunna länkas ihop med det som kör?"* har ett exakt
svar: motorn har **fem** ställen där något nytt kan fästa, och de kostar dramatiskt olika mycket.

### 5.1 De fem fogarna

| Fog | Var | Vad som ändras | Vektorer som måste göras om | Portar |
| :-- | :-- | :-- | --: | --: |
| **F1** | `live.json` / `static.json` (`snapshot-core.ts`) | ett nytt fält på en rad | **0** | **0** |
| **F2** | `snapshotToHazards()` | fältet läses in | 0 | 3 |
| **F3** | `PointHazard.meta` / `SegmentHazard.meta` | ny nyckel i typen | 0 | 3 |
| **F4** | `evaluatePoint()` / `evaluateSegment()` | **villkoret** ändras | **6 is / 3 segment** | 3 |
| **F5** | `PRIORITY`, regel 1a/1b, `alertText()` | ordningen eller rösten | **23 (alla)** | 3 |

F4:s tal är räknade, inte gissade — men de ska läsas rätt: de är antalet vektorer som
**innehåller** en fara av det slaget, alltså en **övre gräns** för vad en regeländring kan rubba.
Sex bär en `icing_point` (v08, v09, **v11**, v18, v19, v23), tre ett `slippery_segment` (v04, v07,
**v11**). Hur många som faktiskt vänder beror på ändringen — se §5.6.

**v11 är grinden som betyder något.** `v11_silent_drive` bevisar *tystnad* — den bär både en
isvärnpunkt och ett segment som måste förbli tysta. Varje **vidgning** av L2 (skattaren säger "blöt"
där `fukt` var falskt) får v11 att tala. Och husregeln är absolut: *en vektor försvagas aldrig för att
få ett bygge grönt.* Alltså är v11 den verkliga tröskeln för hela tillståndslagret — inte en
formalitet, utan platsen där påståendet "det här är en förbättring" måste bevisas.

### 5.2 Fogen läcker redan: publicerat men oläst

| Fält som publiceras | Läses av motorn? | Följd |
| :-- | :-- | :-- |
| **`segments[].regn`** — radarns mm/h per segment (#81 C) | **NEJ.** Finns inte ens i `LiveDoc`-typen | **Radarlagret ligger redan i telefonen och kastas vid adaptern — men bara för halkklassade segment:** `snapshot-core.ts:101–102` sätter `regn` enbart på segment som redan passerat halkfiltret. En blöt, normalklassad väg — där vattenplaning uppstår — nådde aldrig `live.json` (#154). **Löst 15/9 med egen toppnyckel `rain_segments`** (DECISIONS #187): den vidgade väglagsfrågan stoppades, för varje rad i `segments[]` blir en varning i motorn och båda portarna — fogen var F4/F5, inte F1 (R16) |
| `smhi[]` | NEJ — deklarerat `unknown[]`, *"map/UI layer"* | SMHI når appen men inte motorn |
| `segments[].road` | deklarerat, men adaptern lägger det aldrig i `meta` | segmentrösten kan inte säga vägnummer |
| `deviations[].typ` · `wildlife[].art` · `cameras[].road` | deklarerade, aldrig lästa | — |
| `meta.speedLimitKmh` | rösten *kan* säga den, men adaptern fyller den aldrig | kamerorna säger alltid den **korta** raden — den fältverifierade |
| `meta.active` (vilt, säsong × timme) | aldrig satt ⇒ alltid `true` | grinden är **sovande, inte trasig**: dagens källa är färska polisanmälningar (< 48 h), inte historiska hotspots |

**Det här är den enskilt mest användbara upptäckten i hela kartan.** Den första riktiga
integrationen — radarns väta × operatörens klass på samma segment — kräver **ingen ny publicering
alls.** Fältet skrivs redan. Det som saknas är F2 + F3 + F4. **För #42 gäller det inte:** vattenplaningens
segment är normalklassade och bär inget `regn` förrän väglagsfrågan vidgas (#154, beslut Bengt).

### 5.3 Regeln som gör länkningen sömlös: lägg till, ersätt aldrig

Båda portarna läser snapshoten **otypat**: Android via `org.json.JSONObject`, iOS via
`JSONSerialization` → `[String: Any]`. Okända nycklar ignoreras alltså per konstruktion. **F1 är
därför gratis: ett nytt fält i `live.json` kan inte fälla en installerad app.**

Men samma egenskap gör motsatsen livsfarlig:

> **LÄGG TILL. ERSÄTT ALDRIG.**
> Android läser `w.optBoolean("fukt", false)`. Byts `fukt` mot en graderad nivå försvinner nyckeln,
> defaultvärdet blir `false`, och **varje app som inte uppdaterats tystnar på is** — utan
> felmeddelande, utan checksummefel, utan ett spår i någon logg. Ett fält som en publicerad app läser
> är ett **kontrakt**. Nya lager läggs BREDVID det, aldrig i stället för det.

Det är den regeln som gör skillnaden mellan en sömlös länkning och en tyst katastrof, och den är
samma familj som gravstensläckan och den halverade kassavakten: **ett fel som gör systemet tystare
syns inte av sig självt.**

### 5.4 Vad varje skuggdel greppar i

| Del | Lager | Greppar i | Ersätter? | Tyngsta kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **Radarns `regn`** (#81 C) | L2 | F2+F3+F4 — **redan publicerat** | nej, nytt villkor vid sidan | 3 segmentvektorer |
| **Tillståndsskattaren** (#89 steg 2) | L2 | F1 `weather[].tillstand` + F3 + F4 | **nej — bredvid `fukt`** | 6 isvektorer, **v11 är grinden** |
| **Trendarkivet** (#88) | L3 | F1 `weather[].lutning` + F3 + F4 | nej | 6 isvektorer |
| **Segmentprognosen** (#38b) | L4 | **ingen fog i motorn i vinter:** loggas i `shadow_log.prognos` (rå avståndsviktning, #324); **R23 (1/10): rå viktning föll vägpunktsgrinden 28/9 (#399), ingen byggtid i höst, kandidaten till marsdomen är öppen (kort #270/#271)** · 2/10: Bengt valde a, f och g (#435–#437), b och d står öppna; vid dom (a) i mars karta och förstärkare, aldrig röst ensam (TROSKLAR-SKUGGAN §4, #319) — förstärkningen går då genom F1 + F3 + F4 | nej | F4 vid (a) — **och att `leadM` slutar vara motorns enda avståndsbegrepp** (§4.2) |
| **#46 rimfrost** | L3 | F3+F4 — **redan gjort**, som andra gren i `icing_point` | nej | klar; förebilden (§7.8) |
| **#45 snö/slask** | L2 | F1 + F3 + F4 | nej | 6 isvektorer — **och frestelsen att göra det till ett sjätte slag måste avvisas** (§7.8). **Låst av #52:** ett test i tre portar säger att kod 1 + "Packad snö" MÅSTE larma — motsatsen till #45:s vinterbaseline. Vektorn beslutas före #45 |
| **#42 vattenplaning** | L2 | egen byggordning **#81 A–F**: A, B och radarhalvan av C **byggda**, C:s stationshalva blockerad, **D = nytt farslag `aquaplaning`** | — | **F5 av konstruktion** — det prövade undantaget från §7.8 (kriteriet i §9). Skugga (E) i **höstregn** först; enda spåret med höstfönster |
| **#91 kallplatslagret** | L4 | F1 på `weather[]` + F3 + F4 | nej | 6 isvektorer |
| **SMHI `N_varning`** (#95) | L3/L4 | F2+F3+F4 — **`smhi[]` publiceras redan** | nej | 6 isvektorer |
| **#153 allvar som FÖRSPRÅNG** | L5 | F4 — `leadM` per fara | nej | 6 is / 3 segment (§13.1) |
| *#153 om allvar någonsin rör ORD eller PRIORITET* | L5 | **F5** | ja | **23 vektorer, tre portar** — och E3 förbjuder redan det senare (§10.2) |

Trendarkivets fog är extra billig av ett skäl värt att skriva ut: `trend_kandidater` är nycklad på
`station_id`, **samma nyckel som `live.json`:s `weather[].id`**. Ingen ny sammanfogningslogik behövs —
bara en kolumn till i den fråga som redan bygger `weather`-raden.

Mönstret som faller ut: **allt är additivt så länge allvar uttrycks som TID.** Varje del kan greppa
utan att röra prioritetsstegen eller rösten. Det är inte en slump — det är §7.8:s lärdom tillämpad, och den är
anledningen till att arbetet i skuggan faktiskt går att landa.

### 5.5 Repetitionsscenen finns redan — och den tvingar fram en ordning

`scripts/bundle-skuggmotor.ts` buntar `engine/src/*.ts` **ordagrant** in i skuggfunktionen, och både
`ci` och `deploy-supabase` kör `--check` på att bunten är i synk. **Skuggmotorn är alltså inte en
kopia av motorn — den är motorn**, med samma adapter och samma regler, körd mot verklig trafik.

Det ger varje F2/F3/F4-ändring en plats att bevisas på innan den når en telefon. Men det lägger också
en ordning som inte går att kringgå: **skuggan läser samma `live.json` som apparna.** Ett fält som
inte publicerats finns inte heller för skuggan.

> **Sekvensen för varje ny länk:**
> **(1) F1** — publicera fältet. Ofarligt, ignoreras av alla appar, bevisas med manifestets sha.
> **(2) mät i skuggan** — F2+F3 in, villkoret av, se vad fältet *skulle* ha ändrat.
> **(3) F4** — ändra villkoret, gör om de berörda vektorerna, bevisa att v11 fortfarande tiger.
> **(4) tre portar** — Kotlin och Swift speglar, vektorerna går byte-för-byte.
>
> F1 ligger alltid **minst ett varv före** F4. Görs de i samma varv finns ingen mätning som skiljer
> "regeln blev bättre" från "fältet blev tillgängligt".

---

### 5.6 Vad §4 och §5 vilar på — och vad de inte bevisar

Kartans två motorparagrafer är **lästa ur koden, inte körda**. Det är en starkare grund än minne och
en svagare än en mätning, och skillnaden ska stå skriven här och inte upptäckas senare.

| Påstående | Vad det vilar på | Vad det inte bevisar |
| :-- | :-- | :-- |
| §4.1 villkor och tal | `engine/src/{types,engine}.ts` lästa i sin helhet | — detta ÄR koden |
| §4.3 ledningen | `snapshot-core.ts` → `publicera` → `SnapshotRepo` → `snapshot.ts`, lästa | att alla tre portarna beter sig lika i drift; bara vektorerna bevisar det |
| §4.3 talen 28/1/1/0/0/0 | den publicerade `live.json` hämtad 14/9 05:10 | något om vintern — i september är materialet nästan tomt |
| §5.1 vektortalen 6/3/23 | filsökning efter `icing_point` respektive `slippery_segment` i `engine/vectors/` | **att alla sex faktiskt vänder.** En vektor som BÄR en fara kan mycket väl ge samma utfall efter ändringen. Talet är ett tak, inte en kostnad |
| §5.2 oläst-listan | fält för fält mellan publiceraren och `LiveDoc`/adaptern | att inget ANNAT läses fel — listan är över det som publiceras, inte en revision av motorn |
| §5.3 otypad läsning | `org.json.JSONObject` i `SnapshotRepo.kt`, `JSONSerialization` i `SnapshotRepo.swift` | att en FRAMTIDA port gör likadant. Byts någon port till typad avkodning faller §5.3:s premiss, och F1 slutar vara gratis |

**R16 (Axel 16/9, DECISIONS #196/#199): fog-tabellen är läst, inte körd — och det bet 15/9.** #154:s steg stod som F1
("lägg `regn` på fler segment"), men `snapshotToHazards` och båda portarna gör VARJE rad i `segments[]` till en
`slippery_segment` — en vidgad väglagsfråga hade sagt "halka" på varje blöt normalväg i höstregn, F4/F5 utklädd
till F1. Det fångades i koden före deploy och löstes med egen nyckel (`rain_segments`, DECISIONS #187). Regeln
som följer: **en fog i tabellen räknas som F1 först när det är verifierat i kod att ingen port läser fältet.**
Verifierade 15/9: `rain_segments`, `weather[].regn_h`, `weather[].lutning15/30/60` (nya nycklar, otypad läsning,
§5.3). Allt annat i §5 är fortfarande läst.

**Kostnadskolumnerna mäter FOG, inte arbete.** Att en del "bara" kostar F4 säger var den greppar —
inte hur svår regeln är att formulera, och inte hur lång mätningen blir innan den får ändras.
Tillståndsskattaren och kallplatslagret har samma fog och helt olika vägar dit.

**Det enda som gör talen till kostnader är att köra dem.** Sekvensen i §5.5 steg 3 är därför inte
byråkrati: den är stället där "sex vektorer" blir ett verkligt tal i stället för ett tak.

---
## 6. Var lagren står, mätt

<!-- LÄGESRADER §6: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [L2 tillståndet (skattaren S1–S3)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-tillstand): delvis, 57 % · kvar: S1-grinden på frostnätter (Axel, DECISIONS #196)
- [L4 räckvidden: segmentprognosen](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-segmentprognos): väntar, 50 % · Domen i mars 2027 (grind B/C) och Bengts öppna val b och d på kort #270.
- [L5 allvar som försprång](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-forsprang): delvis, 56 % · kvar: FS-A: nivå 2-fall i vinter (kod 3–4, eller yta ≤ 0 °C med väta ≥ 3)
- [Prognoslagret](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-prognoslagret): väntar, 44 % · Bengts öppna val b, c, d, e och h; läsningen tisdag 24/11 (DECISIONS #435); (g) väntar på kuvösen (#437).

<!-- /LÄGESRADER -->

### 6.1 L4 är inte tomt — ankaret är en mätt osäkerhetskurva

Grind A (offsetmodellen) med givarvakten, radvakten och karantänen (DECISIONS #298/#299), dömd 23/9 (#321): **A1 0,71 °C ·
A2 3,5 % ± 0,4 · A3 0,0 %** på 7 356 punkter från 711 stationer — **KLARAD**. Vägpunktsgrinden (#324) prövade samma mått utan
målets egen historik, alltså det fall vägen mellan stationerna har, och rå avståndsviktning klarar dem lika bra som den lärda
offseten (0,71 mot 0,72 °C):

| band (rå avståndsviktning, 8 132 punkter) | MAE | grova > 2 °C | frysklassfel |
| :-- | --: | --: | --: |
| 0–7 km | 0,73 °C | 0,9 % | 0,0 % |
| 7–15 km | 0,55 | 1,1 % | 0,0 % |
| 15–20 km | 0,73 | **5,0 %** | 0,0 % |
| > 20 km | 0,72 | 4,0 % | 0,0 % |
| **totalt** | **0,71** | **3,8 %** | **0,0 %** |

**7–15 km-anomalin var trasiga givare, inte terräng:** utan vakterna låg bandet på 2,68 °C och 25 % grova fel, med dem 0,55 °C och
1,1 % (#324). Felet är i stort sett platt med avståndet efter vakterna; 15–20 km ligger exakt på A2:s tröskel och är där vintern
kan vända. Segmentprognosen loggar sedan 23/9 i skugga på denna modell, med varje station på rutten som holdout (#325/#326).

**R24 (1/10): med varma grannrader föll vägpunktsgrinden.** 28/9 (#399), 715 stationer, 14 644 punkter: rå avståndsviktning
0,82 °C · **6,9 % ± 0,4** · 0,0 %, per band 1,4 · 7,8 · 8,0 · 7,0 % grova fel — tabellen ovan är 23/9 med halva grannraderna
saknade. Grind A håller (0,74 °C · 3,7 %). De förregistrerade premissmätningarna 30/9 (#405–#408) på ärliga rader: rå faller
vägviktat (7,2–7,5 %), rå + höjd oavgjord (5,1–5,3 %), ANOM faller, bandet 0–7 km håller i båda länderna (Finland 2,3 % på
108 stationer) men är odömbart i Sverige (15 stationer). Kurvan är alltså inte platt: den stiger från 0–7 till 7–15 km och
ligger sedan platt — "monoton" i #321 och §13.3 är rättat.

Det betyder att räckviddslagret inte saknar en mekanism. Det har **en avståndsberoende felkurva som
faktiskt är uppmätt** — precis den storhet L4 behöver. Vad som saknas är **knappen**: vad som gör
kurvan brantare eller flackare en enskild natt (moln, vind, terräng). Vi har alltså inte bara "vid
stationen, med minne" — vi har ett ankare vars fel vi känner som funktion av avstånd, och saknar bara
det som modulerar det.

### 6.2 Täckningen multipliceras — och krymper därmed

Mätt 14/9 över segmenttimmar:

| lager | täckning |
| :-- | --: |
| stationen har en mätning | 18,5 % |
| radarn har en åsikt | 13,1 % |
| **båda samtidigt** | **8,2 %** |

Varje lager som läggs till **krymper** populationen där alla lager talar. Kräver den integrerade
regeln alla lager fyrar den på några få procent av vägnätet. Det är inte ett argument mot
integrationen — det är kravet att den måste **degradera graciöst** (§8 E).

---

## 7. Var vi har byggt **mot** syftet

Åtta punkter, ordnade efter hur mycket de hindrar.

### 7.1 Utgången väljer på SLAG, inte på ALLVAR — och kan bara säga en sak

Regel 1a: *"priority selects the single winner; everything else is dropped."* Prioriteten är en fast
ordning mellan **farslag** (A3 > A1 > A2 > A4 > A5), inte ett mått på hur illa det är.

**Följden:** ett segment som är halt OCH har isrisk OCH kraftigt regn låter **exakt likadant** som ett
som bara är halt. Hela poängen med L2×L3×L4 är en sammanvägd allvarsgrad — och utgångslagret kan inte
uttrycka allvar över huvud taget.

> **En integration som inte kan sägas finns inte för föraren.**

**Första utkastet kallade det den enskilt största motkraften. Axel har visat att det är fel** (§13.1):
rösten SKA säga samma ord. En förare i 90 km/h behöver veta att det är halt, inte om det är 60 eller
85 procent halt — en sammanvägd allvarsgrad i rösten är ett mätinstrument, inte en varning.

**Men allvar KAN uttryckas, som TID.** Rösten säger samma ord, tidigare. Formen är redan beslutad:
#90 roll B — *"modifieraren förlänger försprånget, den höjer inte prioriteten"* — och SMHI-
förstärkarens E1 upprepar den. Motorn har maskineriet: `leadM`, klämt till **400–3 000 m**, vid
90 km/h **16 till 120 sekunder** — en faktor **7,5** utan att röra ett enda ord.

Den verkliga motkraften är alltså mycket mindre än jag skrev: inte att utgången saknar allvar, utan
att **ingen regel ännu kopplar ett sammanvägt tillstånd till ett försprång**. Kort #153 bär den
frågan, och som försprång kostar den **F4, inte F5** (§5.4).

### 7.2 "En modellerad storhet får aldrig vara en avtryckare"

TROSKLAR-FRYSKLASSNINGEN §1. Regeln är skriven mot varningar som inte kan motbevisas av en mätning —
ett riktigt skäl. **Men varje integrerad storhet är per definition modellerad.** Tillstånd ×
utveckling × räckvidd ÄR en modell.

Tolkad bokstavligt förbjuder regeln alltså produkten. Den ser ut som stringens och är i själva verket
ett principiellt stopp. Kort #153 beslut 2 öppnade ett smalare undantag (radarn är en mätning;
interpolation mellan två eniga mätningar är inte extrapolation) — **avgjort 16–17/9:**

**Regel T (TROSKLAR-KOMBINATIONEN §6, DECISIONS #220/#226)** — Axels lydelse, tätad: T3 extrapolation utlöser aldrig,
T5 interpolation bara där ett vittne på platsen kan fälla värdet, T6 prognoser och modellprodukter aldrig ensamma.
#153 beslut 2 styrs av T5 och har ingen egen öppning. Segmentprognosens domslut (TROSKLAR-SKUGGAN §4) rättades mot
regeln 23/9 (#319).

### 7.3 Varje grind dömer sin del ENSAM. Det finns ingen grind för kombinationen

T-A/B/C, W-A/B/C, Ö-A/B/C/D, V-A/B, F-A/B, R-A…R-D, Å-A/B. Var och en har golv som delen ska klara
**för sig**.

**Men en del kan vara svag ensam och avgörande i kombination.** Och vi har redan gjort det felet:
**SMHI mättes som ANKARE och underkändes** (MAE 1,05 → 1,20). Men SMHI:s roll i modellen ovan är inte
ankare — den är **räckviddsknappen i L4**. Grinden svarade på en fråga ingen behövde svar på, och
nejet ligger nu på kortet som om SMHI vore avgjort.

> **Vi riskerar att underkänna produktens ingredienser en och en, på prov som ställer fel fråga.**

Motmedlet är §9 — och den grind för kombinationen som §8 C beställer. Grinden för kombinationen har
dessutom en färdig mätplats: **skuggmotorn** (§5.5). **Avgjort 17/9:** kombinationsgrinden KB-A–D står i
`docs/TROSKLAR-KOMBINATIONEN.md` (DECISIONS #217–#228).

### 7.4 Trösklarna fryses per del — gemensam kalibrering är inte tillåten

§8-regimen i varje tröskeldokument: från första skuggkörningen ändras ingen tröskel. Det skyddar mot
att flytta målstolparna när siffrorna kommit — rätt regel.

**Men en kombinerad modell behöver kalibreras GEMENSAMT.** N (#89), fönstret (#88), gapet (#46) och
r (#42) väljs var för sig, för solo-prestanda. **Avgjort 17/9:** regel D (D1–D7, TROSKLAR-KOMBINATIONEN §5, DECISIONS
#226) säger hur en kombination får kalibreras — värden ur delarnas svep, startvärden före första natten, kalibrering
och dom på skilda nätter, alla prövade punkter redovisade.

### 7.5 Skattaren kastar bort bevisets STYRKA

`skatta()` returnerar `blöt | torr | okänt` — en enum. Men en sammanvägd allvarsgrad behöver *hur*
blöt: 20 minuter sedan 2 mm är något annat än fyra timmar sedan 0,2 mm. Underlaget finns i `Underlag`
och slängs i returvärdet. Det är en hård OCH-logik där integrationen behöver en gradient.

Felets riktiga fog-konsekvens blev tydlig först genom Axels invändning (§13.5): **uttrycks allvar som
TID behövs ett graderat mått för att sätta tiden.** En tregradig enum ger tre försprångsvärden. §8 E
är därför **indata till §7.1**, inte en förfining efteråt. Mitt eget bygge, min egen fix.

*(Första utkastet gav ett annat skäl — att en enum bara kan ERSÄTTA `fukt`:s booleska roll medan en
gradient kan läggas bredvid. Det var fel: en enum kan också läggas bredvid. Skälet ovan är det som
håller.)*

### 7.6 Trendarkivet är ett superset av TRIGGERN, inte av FENOMENET

Det sparar bara rader i bandet 1–6 °C med fallande yta. Det kan därför inte svara på hur snabbt ytan
faller *under* noll, och inte på när ytan börjar **stiga** — vilket kortet självt kallar *"skälet att
tystna tidigare på morgonen"*. För L3 vill man ha trenden överallt där tillståndet betyder något.

### 7.7 #45 lutar på en höjdkorrektion som #91 mätte till noll

#45:s metod: våtbulb per segment via **offsetmodell + höjdkorrektion** (lapse 0,71 °/100 m), för att
höjden flyttar snögränsen.

#91:s mätning 12/9: på 1 962 punkter återvinner höjdkorrektionen **exakt noll** (1,65 → 1,65 °C) och
gör det **sämre i två av fyra band**.

De två är inte samma storhet — #91 mätte **yttemperatur**, #45 använder **lufttemperatur**, och lapse
rate är fysikaliskt rimligare för luft. **Men ingenstans står det.** Ett dokument lutar på en
korrektion ett annat dokument har mätt emot, och ingen har skrivit varför det ändå går.

### 7.8 En sak gjordes RÄTT, och den är förebilden

**Rimfrosten (#46) blev en ANDRA GREN i `icing_point` — inte en sjätte farotyp.** Skälet som skrevs:
en sjätte `kind` hade rört varje vektor och hela prioritetsstegen.

I fogarnas språk: **#46 valde F3+F4 i stället för F5** — sex vektorer i stället för 23, och
prioritetsstegen orörd. Det är exakt rätt mönster: **berika en befintlig faras underlag, lägg inte
till farslag.** Varje nytt slag gör regel 1a värre — fler konkurrenter om en enda plats i rösten.

**Kriteriet, fastställt av Bengt 15/9 (DECISIONS #186):** ett nytt farslag är motiverat bara om **(1)** förarens
handling skiljer sig från alla befintliga slag, **(2)** texten inte kan lånas från ett befintligt slag utan att
ljuga, och **(3)** prioriteten mot varje befintligt slag är beslutad av Axel före vektorn skrivs.

**Tre kort vill ha ett nytt slag, prövade mot kriteriet (R1/R15, 16/9):** **#42 ja** — annan fara, annan
handling (fart), eget förvillkor (yta > +4 °C), egen text; som meta på segmentet ärver den "halka rapporterad",
fel ord. Axels utgångspunkt 16/9 (DECISIONS #196): under halka (#68), över vilt, *"Vattenplaning framöver —
sakta ner"* — beslut efter V-C. **#32 kanske.** **#45 nej** — handlingen är halkans, texten kan vara halkans,
prioriteten är halkans; #45 byggs som meta, **efter att #52:s vektor beslutats**. Steg E (skugga) kommer före
F (röst) i alla tre fallen — för #42 är E byggt (DECISIONS #191).

---

## 8. Vad som minst måste finnas för att helheten ska lyfta

| # | Vad | Vems | Fog | Kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **A** | **Allvar som FÖRSPRÅNG** — samma ord, tidigare. Formen beslutad (#90 roll B); regeln saknas | Axels (rösten) | **F4** | ✅ R25 (1/10): byggd som skugga 25/9 (#359), dom mars 2027 |
| **B** | **Bevisbärare i snapshoten** — varje fara bär vilka lager som talade och hur starkt, inte en boolean | delad | F1+F3 | additiv — kort #245 |
| **C** | **En grind för KOMBINATIONEN** vid sidan av per-delsgrindarna | mätningen, alltså vår | — | ✅ skriven 17/9 (KB-A–D) |
| **D** | **En skriven regel för gemensam kalibrering** — tillägg till §8-regimerna | Bengt fastställer | — | ✅ regel D, 17/9 |
| **E** | **Graciös degradering** — skattaren returnerar nivå + bevis i stället för enum | min kod | F3 | ✅ byggd 24/9 (#341) |

**C och D är skrivna (17/9, TROSKLAR-KOMBINATIONEN).** E är en liten ändring i min egen modul — och
enligt §7.5 **indata till A**, inte en förfining. A är Axels; sedan hans invändning (§13.1) kostar
den **F4, inte F5**, vilket flyttar den från nästa vinter till den här.

---

## 9. Hur en del döms: ett nej gäller en ROLL, inte en del

Prejudikatet finns i protokollet: **kamerorna** underkändes som täckning (744 st, 99 % inom 1 km från
en station, Norrlands lucka oförändrad) — och blev **bildfacit**, en av tre facitkällor systemet i dag
vilar på. Samma del, annan roll, avgörande värde.

**Men principen behöver en broms, annars blir den ett sätt att aldrig ta ett nej:**

> Ett underkännande gäller den **fråga som ställdes**. En del får prövas i en ny roll — men den nya
> rollen kräver en **ny fråga, skriven före mätningen, med egen grind**. Ingen del återinförs på hopp.

### 9.1 De sju underkända, och deras obesvarade fråga i helheten

| Del | Vad som underkändes (mätt) | Obesvarad fråga i det sammanvägda |
| :-- | :-- | :-- |
| **SMHI** | som ANKARE: MAE 1,05 → 1,20; som **reserv när Trafikverket tystnar helt** kostar den uppmätt 2,36 °C på 352 punkter — en kvantifierad beredskap, ingen väg | som **räckviddsknapp** (L4): gör molnmängden grind A:s felkurva brantare klara nätter? Aldrig mätt |
| **Höjden** | återvinner noll på YTtemperatur *som medelkorrektion* — men **#96 mäter fortfarande varje måndag**, och lapse **0,63 °/100 m ur 3 476 par** är ett stabilt fysiskt faktum (#45 använder det gamla 0,71) | (a) #45 använder **luft**, inte yta — annan storhet. (b) förutsäger höjden **var modellen är opålitlig** i stället för att korrigera medelvärdet? |
| **Kamerorna** | som TÄCKNING: 6 av 744 ger nytt ankarläge | ✅ redan omrollad till **bildfacit** — prejudikatet |
| **RH-guarden** | som FILTER: fuktigheten stiger efter regn | den **stigningen** är i sig ett tillstånd — förutsättningen för kondensation och rimfrost (#46) |
| **Operatörens "Våt"** | som PROXY: omätbar eftersläpning | som **facit** i stället för indata — samma skifte som kamerorna gjorde |
| **`rate_max`** | som VÄRDE: 727 mm/h, spärrat | **kvoten max/mean** är en formsignal: konvektiv skur mot frontregn. Exakt vad #45 behöver för att skilja lokal snöby från utbrett regn |
| **Radarns bidrag** | växer inte med avståndet (platt ~1,5 %) — med #168:s två reservationer: yttre bandet bär 25 segment, och fönstret var 5,3 dygn frontregn; "inget nej till radarn som källa, 96 % precision" | mätt där en station står **6,7 km** bort i median. Radarns roll är **upplösning per sträcka**, inte mer väta — aldrig mätt som det |

**Två av dem har en mätbar fråga som inte kräver vinter:** höjden som varianspredikator och radarns
segmentupplösning. Båda kan ställas mot befintligt arkiv.

---

## 10. Registret över allt struket, stängt och flyttat

Ett underkännande gällde en roll. **Ett struket spår lämnar nästan alltid något kvar**, och det
kvarlämnade faller i tre slag:

- **GRÄNS** — det definierar var produkten *inte* kan nå. Utan gränsen läses varje mätning som om
  den gällde överallt.
- **VILLKOR** — det binder vad kombinationen inte får göra. Ett villkor som glöms bort återuppfinns
  som ett misstag.
- **MÄTT FAKTUM** — mätningen överlever även när delen inte gjorde det.

### 10.1 Stängda kort

| Kort | Varför stängt | Vad det bidrar med i helheten | Slag |
| :-- | :-- | :-- | :-- |
| **#92 däck och fordonstyp** | kräver tröskeljustering i flera dokument, tre portar, nya produktboksbilder — och bär ingen egen fara | **Gränsen för hur precis en varning får vara.** Vi vet inget om däcken, alltså ska rösten tala om VÄGEN, aldrig om bromssträcka. Begreppet står kvar som **lager 2-riskmodifierare** (OVERGANGAR-ANALYS §1b.2) | gräns |
| **#93 kommunala vägar** | inga givare där | **Räckviddsvillkoret** (#98 §6) finns tack vare det: en tyst miss räknas bara där systemet HADE en chans. Utan den gränsen drunknar varje tröskelsignal i täckningshål | gräns |
| **#100 dämpning per fara** | kuren var tystare än sjukdomen: variant C ger **1 larm för 39 minuters halka** | Mätningen av hur rösten beter sig över långa sträckor — **4 larm på 59 km** — är indata till allvarsskalan (#153). Kärnan (TOTALEN när många OLIKA faror kvalificerar) flyttad dit | mätt faktum |
| **#94 försäkringsspåret** (*kortet är öppet* — åkerier och NTF står kvar) | försäkringssamarbetet klarlagt otillgängligt | Tvingade fram att facitstacken definierades ur **vår egen** data. Det är skälet att T-B och #98 kan dömas i vinter i stället för nästa | villkor |

### 10.2 Strukna parametrar och regler

| Vad | Varför | Vad som överlever | Slag |
| :-- | :-- | :-- | :-- |
| **RH-guarden** (#89 §4.3) | fuktigheten STIGER efter regn: 90 % vid +1 h → 95 % vid +4 h | Själva mätningen är ett positivt faktum om efterregnstillståndet — **förutsättningen för kondensation och rimfrost** (#46) | mätt faktum |
| **Operatörens "Våt"** (#89 §2.1) | 33 rader, noll med efterföljande klassning | Kandidat som **facit** i stället för indata (samma skifte som kamerorna) | mätt faktum |
| **Oljefilmen, #89 (b)** | 55 torrperioder, 6 olyckor mot grindens 15 — inte nåbar i höst | Torrdygnsräknaren finns kvar som beräkning — men **#42 använder den inte längre**: sedan #155 är vattenplaningens utlösare radarintensitet ≥ 2,0 mm/h, inte vattenfilmålder | mätt faktum |
| **Ord-per-resa** (DECISIONS #103 — inte kort #103, frysklassningen) | fel valuta | **Röst räknas i EPISODER, aldrig i rader.** Det är enheten allvarsskalan måste använda | villkor |
| **R3 hård åldersgräns** (vägens ålder) | avvisad FÖRE mätning | Principen *"ålder ≠ inaktualitet — en klassning står tills den ändras"* ärvs rakt av tillståndsskattaren | villkor |
| **E3 högre prioritet** (#95 d) | skulle tysta en olycka | **Bindande villkor på #153:** kombinationen får ändra ordval och försprång — **aldrig prioritet**. I fogarnas språk: #153 får röra `alertText()`, aldrig `PRIORITY` | villkor |
| **`rate_max`** (#134) | 727,54 mm/h, spärrat av värdevakten | **Kvoten max/mean** är en formsignal: konvektiv skur mot frontregn — precis vad #45 behöver. **Men fältet är spärrat** tills spannet 0–200 rensats (#155) — kvoten kan inte räknas förrän dess | mätt faktum, spärrat |
| **K1, byvindkvot per rad** (#164) | 335 av 748 stationer | Kvoten per rad detekterar ett **känt formatfaktum** (byvind = bakåtfönstrets max, medelvind = ögonblicksvärde), inte en trasig station. En läxa, inte ett verktyg | läxa |
| **Per fordonstyp** (vind/sikt §2.1) | #92 stängt | Samma gräns som #92 | gräns |

### 10.3 Kärnor som flyttats — och vart

| Från | Till | Vad som flyttade |
| :-- | :-- | :-- |
| #95 breda SMHI-regeln | **#89 §2.3 `N_varning`** | SMHI vet **tiden före händelsen** (varningar publiceras i förväg). Utlösaren förblir stationens eget regn; varningen förlänger bara N |
| #100 dämpningen | **#153** | TOTALEN när många OLIKA faror kvalificerar samtidigt |
| #93 halva kortet | **#95 (d) förstärkaren** | snöfallsvarning + yta nära noll = högre konfidens |
| #89 (c) interaktionerna | **#46** (lager 1, dimma som konfidens) och **#90** (lager 2, sidvind × halka) | dimma × frysrisk är en ORSAK; sidvind ändrar faran givet en yta |
| #88 T-B:s facit | **egen facitstack** | kamerafacit, väglagsarkivet, situation_archive |

### 10.4 Vad registret sammantaget säger

Tre saker blir synliga först när allt står på ett ställe:

1. **Gränserna är inte hål — de är produktens form.** #92 och #93 säger tillsammans: *vi talar om
   vägen där någon mäter den, inte om fordonet och inte där ingen mäter.* Det är en skarpare
   produktdefinition än något av korten säger ensamt.

2. **Villkoren på allvarsskalan är redan skrivna, fast utspridda.** E3 säger att prioritet aldrig får
   röras. #103 säger att enheten är episoder. #100 ger talen för hur rösten låter över en lång
   sträcka. **#153 behöver inte uppfinna sina ramar — de finns, i tre stängda kort.**

3. **Några strukna delar lämnade en BERÄKNING efter sig — men färre än första utkastet påstod.**
   Kvoten max/mean (`rate_max`) är #45:s formsignal, när fältet väl är rensat. Torrdygnsräknaren finns
   men #42 behöver den inte längre (#155). K1:s radkvot är en läxa om fönsterglapp, inte ett verktyg.

---

## 11. Vad som förblir osynligt oavsett allt ovan

**Om saltbilen passerat** (ingen öppen källa) hör till kartans kant. **Snöbyn mellan stationerna** gör det
inte längre: #43 steg 4 är öppnat sedan radardomen 13/9, och radarns roll som *upplösning per sträcka*
är en mätbar fråga mot befintligt arkiv (§9.1) — omätt, inte osynlig.

---

## 12. Den ärliga sammanfattningen

Delarna **är** byggda så att de kan integrera: de faller i fem lager utan att någon behöver skrivas
om, och varje del producerar en mätt storhet i stället för en dom — vilket är förutsättningen för att
de ska kunna vägas ihop senare. Räckvidden är mätt och duger (§6.1), tillståndet och utvecklingen är
byggda och sparade, och registret visar att även det underkända lämnat användbara beräkningar efter
sig (§10.4).

**Och fogen mot motorn är smalare än jag trodde innan jag läste den.** Nio av tio skuggdelar greppar
additivt — ett fält i `live.json` som ingen app kan snubbla på, en nyckel i `meta`, en rad i
villkoret. Radarn och SMHI publiceras **redan** och kastas först vid adaptern. Skuggmotorn är
bokstavligen motorn, så varje länk kan mätas på riktig trafik innan den når en telefon. Det som
återstår är alltså inte ett brobygge — det är sex vektorer, tre portar, och disciplinen i §5.3 och
§5.5.

**Och det som allt ska dömas mot är fortfarande tunt — men inte längre tomt eller obevakat.** Kamerafacit: 988 bilder
i hinken 26/9 (R26), tabellen `kamerafacit`, 41 provbilder klassade blint (#329/#333/#380), läsning i mars (#248, #335) med
ett spår för blind klassning och Axels ok (kort #246). `road_condition_history` står nästan stilla (rätt i september).
`situation_archive` är mätt (3 122 olyckor på 30 dygn, #189) men bär ingen orsak. Förarfacit: 0 riktiga svar 28/9 (#390). Mätvakten
(S7) mäter att facitkällorna växer, och alla läses genom en delad händelselista (`publish/skuggfacit.ts`, #327/#330).
Axels tröskelregel har vittnen på väg, inte i hand (§13.2).

**Tre saker stod i vägen, och alla tre är nu avgjorda som beslut:** allvar uttrycks som försprång (§7.1, #221), en
modellerad storhet utlöser aldrig ensam — regel T (§7.2, #220), och kombinationen har en egen grind och en regel för
gemensam kalibrering (§7.3–7.4, TROSKLAR-KOMBINATIONEN, #217–#228). Kvar är att bygga dem, i den ordning bedömningen
§5 säger.

**Skillnaden mellan det vi har och produkten Bengt beskriver sitter alltså i L4:s knapp och i L5** —
och L5 är billigare än kartan först påstod: som **försprång** kostar den F4 (§13.1). Att kartan mätte
det byggda mot ett löfte ingen gett är Axels kritik, och den ger jag (§13.3).

---

## 13. Axels invändningar, och vad de gör med kartan

Axel läste kartan i sin helhet 14/9 — i ett **tidigt underlag, där rättelsen av grind A ännu inte
fanns med**. Fyra invändningar. Tre står och är inarbetade i brödtexten ovan; en faller på det
underlag han fick, men bär en ramkritik som står.

Det som är **beslut** står här som öppet. Kartan föregriper dem inte.

### 13.1 "Utgången väljer på slag, inte allvar" är inte ett fel — det är produkten

> **Axel:** *"En förare i 90 km/h behöver veta att det är halt — inte om det är 60 eller 85 procent
> halt. En sammanvägd allvarsgrad är ett mätinstrument, inte en röst. Det finns ett smalare sätt att
> uttrycka allvar som inte bryter det: försprång. Rösten säger samma ord men tidigare."*

**Han har rätt — och mer rätt än han själv skriver.** Det är inte ett förslag. Det är ett **fattat
beslut** som kartan missade att koppla till L5:

- **TAVLA #90 roll B:** *"Designfrågan besvarad: modifieraren FÖRLÄNGER FÖRSPRÅNGET, den höjer inte
  prioriteten, för prioritetsstegen droppar förloraren."*
- **TROSKLAR-SMHI-FORSTARKAREN E1:** samma form, ordagrant.

Kartans första utkast skrev "L5 ⛔ finns inte" medan mekanismen stod nedskriven på två ställen.

**Två följder han inte nämner, och som gör hans linje starkare:**

| | Tal |
| :-- | :-- |
| Allvar som **ord/prioritet** (allvarsskala i rösten) | **F5 — 23 vektorer, tre portar** |
| Allvar som **försprång** (`leadM` per fara) | **F4 — högst 6 is / 3 segment** |
| Försprångets spann (`leadMinM`–`leadMaxM`) | **400–3 000 m** |
| Samma spann i tid vid 90 km/h | **16 s – 120 s, en faktor 7,5** |

Att uttrycka allvar som tid är alltså inte en kompromiss utan en **regeländring i stället för en
arkitekturändring** — skillnaden mellan den här vintern och nästa.

**En hake han bör känna till:** A1-rösten plattar redan ihop ConditionCode 2 (Besvärligt) och 4
(Extremt) till samma mening. Under hans egen regel är det rätt — förarens handling är densamma — men
det betyder att det **första** försprånget att modulera troligen är segmentets, inte ispunktens.

### 13.2 Tröskelregeln ska preciseras, inte upphävas

> **Axel:** *"Regeln kom från Grind A och handlade om en extrapolerad temperatur — ett tal gissat där
> ingen mätt, som inte kan motbevisas. 'Vägen är blöt, det regnade 2 mm för 40 minuter sedan' är
> aggregation av mätningar med känd kedja, och det kan motbevisas … En storhet som inte kan
> motbevisas av en mätning får inte utlösa. Extrapolation faller. Minne av mätningar består."*

**Rätt, och bättre formulerat än mitt §7.2.** Att säga att regeln "förbjuder produkten" var uppblåst;
hans kriterium är operativt och pekar ut *vilken* mätning som ska kunna fälla påståendet.

**Men kriteriet saknar vittne i dag, och det är inte en detalj.** Han namnger två motbevisande
mätningar. Båda är tomma:

| Vittne | Läge |
| :-- | :-- |
| Ytstatus / operatörens "Våt" | **33 rader, noll med efterföljande klassning** — skälet den ströks (§10.2) |
| Kameran visar torr asfalt | **kamerafacit: 0 objekt efter 5 657 skuggkörningar** (kort #157) |

Följden: **kort #157 blir bärande för Axels egen punkt 13.4.** Den enda funktion han vill släppa till
rösten i vinter kan inte passera hans eget test förrän kamerafacit faktiskt fylls.

### 13.3 Kartan mäter det byggda mot en produkt som inte är lovad

> **Axel:** *"Om-avsnittet säger ordagrant: varnar vid Trafikverkets mätstationer och rapporterade
> väglag — mellan stationerna är vägen oövervakad. Grind A föll den 12:e, och det var Grind A som
> skulle ha gett räckvidden. 'Vid stationen, med minne' är inte en brist. Det är vinterns leverans."*

**Premissen faller. Ramkritiken står.**

**Grind A föll inte.** Domen han citerar (MAE 1,06, grova 10,7 %) är körningen **före** givarvakten
och marginalvakten. Med båda: **MAE 0,85 · grova 5,1 % · frysklassfel 0,3 % ⇒ ⏳ ingen dom**,
uttryckligen *inte ett nej* (§6.1). Felkurvan stiger från 0–7 till 7–15 km och ligger sedan platt (rättat 1/10, R24; "monotont" stod här och i #321) — den *är*
räckviddsstorheten. Felet är underlagets, inte Axels.

**Men slutsatsen överlever delvis ändå**, av andra skäl än han anger: domen är *ingen dom* och inte
godkänt (A2 står 5,1 mot 5,0), knappen saknas, och materialet är höst. "L4 är nästa produkt" håller
för den här vintern.

**Och ramkritiken ger jag helt.** `docs/PRODUKTBOK.md:108` säger ordagrant det han citerar. Kartan
mätte det byggda mot ett löfte ingen gett. "Vid stationen, med minne" är vinterns leverans och mer än
appen gör i dag.

### 13.4 Vad som faktiskt kan nå rösten i vinter

> **Axel:** *"En sak kan gå till röst i vinter — frysrisk som fyrar när det inte regnar men vägen är
> blöt och ytan faller. Det är L2 × L3 utan L4 och L5 … Allt annat i kartan är mätapparat, och det
> ska byggas — men som skugga, för mars."*

**Vi konvergerar, och §5 ger hans rekommendation dess byggplan.** Hans "en sak" greppar i
**F1 + F3 + F4** på `icing_point` — ingen F5, ingen ny arkitektur, högst sex vektorer, och grinden är
`v11_silent_drive` (§5.1). Sekvensen står i §5.5: **publicera fältet → mät i skuggan → ändra
villkoret → tre portar.**

### 13.5 Där jag är oense: E kan inte vänta

Axel skriver att B och E väntar tills något klarat en grind. **E bör inte det, och skälet är hans
eget:** blir allvar till **tid** behövs ett **graderat** mått för att sätta tiden. En tregradig enum
ger tre försprångsvärden. E är alltså indata till 13.1, inte en förfining efteråt.

Hans invändning avslöjade dessutom ett tankefel i kartans eget §7.5 — se rättelsen där.

### 13.6 Vad som är avgjort och vad som är öppet

| Sak | Läge |
| :-- | :-- |
| L5:s form är **försprång**, inte ord | **redan beslutat** (#90 roll B, E1) — kartan säger det nu |
| #153 som försprång kostar **F4**, inte F5 | **mätt** (§5.1, §5.4) |
| Grind A | **KLARAD 23/9** (#321) |
| #157 är bärande för vinterleveransen | **följer av 13.2** |
| Om #153 **ska** omformuleras till försprång | **avgjort 16/9** (#221) |
| Om tröskelregeln ska skrivas om till Axels lydelse | **avgjort 16/9** (#220), tätad |
| Om E byggs före vintern | ✅ **byggd 24/9** (#341) |
| Om försprånget kläms av appens reglage | **avgjort 26/9** (#419): nej — motorns 3 000 m; reglaget tar bara grundvarningen |
| Provet av helheten (§7.3: *varje grind dömer sin del ensam*) | **kuvösen** (kort #232): klockan och inventeringen byggda 1/10, Trafikverkets vinterdata 2024/25 mottagen 2/10 (5,5 miljoner rader, 777 stationer, lokaltid mätt, #438; inläst 2/10 kväll med nederbördskoderna 1/2/4/6 ur VädErs 2019 — 5,39 miljoner rader, 754 stationer; 3/9, mängden och vinden väntar, #439; SMHI för samma vinter hämtat, radarn som tif ≈ 3,4 dBZ över h5, #441), riktningsprovet vecka 42 (#424); rösten i två serier — de 20 skuggrutterna och hela väglagsnätet (#426) |
| När kombinationen kalibreras | **ändrat 1/10** (#425): i kuvösen på vintern 2024/25, inte 1/2 2027 — årets vinter blir bara domdata |
| Om vinterns röstleverans begränsas till Axels "en sak" | **öppet** — jag rekommenderar ja |

---

## 14. Rättelsehistorik

Brödtexten ovan säger vad som gäller i dag. Det här är vad som ändrats sedan kartan skrevs, så att
ingen läser en överspelad version någon annanstans.

| Datum | Vad | Var beslutet står |
| :-- | :-- | :-- |
| 14/9 | Kartan skriven | DECISIONS #159 |
| 14/9 | **Grind A hade inte fallit.** Första utkastet sade att L4 var praktiskt tomt och citerade domen MAE 1,06 / grova 10,7 % — den gäller körningen FÖRE givarvakten och marginalvakten. Rätt dom är MAE 0,85 / 5,1 % / 0,3 %, ⏳ ingen dom. §6.1 säger nu det | DECISIONS #180 |
| 14/9 | **Ett nej gäller en roll** (§9) och **registret** (§10) tillagda på Bengts två invändningar | DECISIONS #180, #181 |
| 14/9 | Dokumentet omarbetat till **en** sammanhängande karta | — |
| 14/9 | **Motorn och fogarna inarbetade** (§4, §5) på Bengts fråga om kartan tar hänsyn till det som faktiskt kör. Läst ur koden, inte ur minnet | DECISIONS #182 |
| 14/9 | **§5.6 tillagd:** metodförbehållen stod bara i chatten. Vektortalen 6/3/23 är ett **tak** (vektorer som BÄR faran), inte en uppmätt kostnad; §4–§5 är lästa, inte körda | DECISIONS #183 |
| 15/9 | **Kartan fryst.** Kriteriet för nytt farslag infört i §7.8 (tre rader, Bengt fastställde). Femton kända rättelser väntar i bedömningens bilaga A tills en rör kod | DECISIONS #186 |
| 16/9 | **Kartan öppnad för R1–R16 — efter bygge + mätning, enligt frysvillkoret — och fryst igen.** R1–R15 ur granskningen: #42 är ett eget spår med höstfönster och ett sjätte farslag av konstruktion (§5.4, §7.8) · `regn` bara på halkklassade segment, nu löst med `rain_segments` (§5.2) · höjden mäter fortfarande, lapse 0,63 (§9.1) · oljefilm→#42 överspelad, `rate_max` spärrat, K1 en läxa (§10.2, §10.4) · #94 öppet (§10.1) · #163/#165 är DECISIONS · #103-kollisionen · #168:s reservationer · #43 steg 4 öppnat (§11) · SMHI:s reserv, Verify 2, radien (§2, §9.1) · facitstacken två av tre tomma (§12) · #45 efter #52 (§5.4). **R16 (Axel):** fog-tabellen är läst, inte körd — #154:s F1 var F4/F5 i koden (§5.2, §5.6) | DECISIONS #199 |
| 14/9 | **Axels fyra invändningar inarbetade (§13).** L5 var inte tomt — formen är beslutad som FÖRSPRÅNG (#90 roll B); #153 kostar därmed **F4, inte F5**; §7.5:s enum-resonemang var fel | DECISIONS #184 |
| 24/9 | **Kartan öppnad för R17–R20 — efter bygge + mätning (segmentprognosen och facitkopplingen) — och fryst igen.** R17 grind A klarad, 7–15 km-anomalin var givarfel (§2, §6.1) · R18 segmentprognosen: ingen fog i motorn i vinter, karta och förstärkare vid dom (§5.4) · R19 facitstacken tunn men inte tom eller obevakad (§12) · R20 motkrafterna §7.2–7.4 avgjorda 16–17/9, §8 B/C/D, §13.6 | DECISIONS #337 |
| 1/10 | **Kartan öppnad för R21–R26 — efter vägpunktsgrindens fall 28/9 och premissmätningarna 30/9 — och fryst igen.** R21 L4-raden (#399, #405–#408) · R22 L5: försprånget i skugga (#359), S2 (#341) · R23 segmentprognosens fog (#399) · R24 §6.1 med 28/9 och 30/9, "monoton" rättat här och i #321 · R25 §8 A och E byggda · R26 §12 facitstacken 988 bilder, 0 riktiga förarsvar. Sedan 1/10 hålls läge-raderna löpande (STOMREGELN, #415) | DECISIONS #416 |
| 1/10 | **Läge-raderna efter omtaget av PR #624 och Bengts bekräftelse av STOMREGELN** — ingen innehållsändring: L2 oljan i skugga (#421) · L5 försprångets tak är motorns (#419) · §13.6 frågan om taket avgjord | DECISIONS #419, #421, #422 |
| 1/10 | **Kuvösen in i läge-raderna** — ingen innehållsändring: §13.6 provet av helheten och kalibreringens tidpunkt. §7.3:s brist (ingen grind för kombinationen) står kvar som den skrevs; kuvösen är svaret på den | DECISIONS #424, #425 |
| 1/10 | **Läge-raden för kuvösen:** rösten prövas i två serier (de 20 skuggrutterna och hela väglagsnätet) — ingen innehållsändring | DECISIONS #426 |
| 2/10 | **Läge-raderna efter Bengts val på kort #270** — ingen innehållsändring: L4-raden och segmentprognosens fog bär valen a, f och g | DECISIONS #435, #436, #437 |
| 2/10 | **Läge-raden för kuvösen:** Trafikverkets leverans mottagen och besiktigad — ingen innehållsändring | DECISIONS #438 |
| 2/10 | **Läge-raden för kuvösen:** vintern inläst, nederbördskoderna 1/2/4/6 ur VädErs 2019 — ingen innehållsändring | DECISIONS #439 |
| 2/10 | **Läge-raden för kuvösen:** SMHI för samma vinter hämtat (steg 4) — ingen innehållsändring | DECISIONS #441 |

<!-- ÖPPNA KORT: genereras av scripts/kortkartan.ts ur TAVLA.md och docs/kortkartan.json, ändra inte för hand -->
## Öppna kort

Korten på tavlan som rör den här sidan, ordnade efter sidans avsnitt: 4 kort. Ägaren står efter strecket. Listan skrivs av `scripts/kortkartan.ts` ur `TAVLA.md` och `docs/kortkartan.json`.

**§4 Motorn som den faktiskt ser ut i dag**

- #294 YTSTATUSFÄLTEN I ARKIVET — vägytans is, snö, vatten och friktion från de cirka 50 stationerna med givare — Claude

**§5 Fogarna — var en skuggdel kan greppa, och vad den kostar**

- #88 TRENDEN — vi mäter var minut men använder bara sista värdet — Claude, låst

**§6 Var lagren står, mätt**

- #270 PROGNOSLAGRET EFTER PREMISSMÄTNINGARNA — BENGTS VAL a–h — Bengt
- #38b Stråket / skuggmotorn — ÅTERSTÄLLT 10/9 — Claude, låst

<!-- /ÖPPNA KORT -->
