# Integrationskartan

**Hur delarna blir en produkt, var vi byggt emot den, hur det nya greppar i motorn som redan kör,
och vad allt underkänt lämnade kvar.**

**Kartan stäms av som de andra stomdokumenten.** Frysregeln är hävd sedan 22/10 (Bengt, DECISIONS #678, åtgärdslistan B4-60):
kartan rättas mot besluten och koden på main i dokumentsynken, som de andra stomdokumenten. Den var fryst från 15/9 (#186) och
öppnades fyra gånger efter bygge och mätning: 16/9, 24/9, 1/10 och 7/10 (#199, #337, #416, #483). *Vad som görs, och när, står i
`docs/BEDOMNING-2026-09-15.md` — den enda listan.*

Det här är det enda dokumentet över hur Halkvakts delar hänger ihop. Allt som rör integrationen står
här: lagren, multiplikationen, **motorn som den faktiskt ser ut**, **fogarna där en skuggdel kan
greppa**, motkrafterna, principen för hur en del döms, och registret över allt som strukits, stängts
eller flyttats. Ligger något om helheten någon annanstans är det ett fel.

Fokus på skuggans delar (#88–#95), men vattenplaningen (#42), snön (#45), broarna (#38/#91), kandidaten NIVÅ 2+BLANDNING
(#343) och det som redan står i motorn vägs in. Beslutens historik — vad som rättats och när — ligger i DECISIONS
(#159, #180, #181, #182, #183, #184) och sammanfattas i §14. **Axels invändningar och vad de
gjorde med kartan står i §13.** Brödtexten säger vad som *gäller*, inte vad som
ändrats.

---

## 1. Vad produkten egentligen frågar

Allt vi byggt är proxyer för en enda fråga:

> **Hur halt blir det där jag är om två–tre minuter?**

Motorn i dag kan inte ställa den frågan, och skälet är strukturellt: **den har varken minne eller
räckvidd.** `engine.ts:62–80` bär prevFix, kurs, odometer, tystnadsklockan, kandidatens takklocka, fired-kartan och halkzonens
grannar — noll om vad ytan var för en timme sedan, och ingen uppfattning om hur långt en stations mätning gäller. Det minne och den
räckvidd motorn har kommer utifrån, ur lägesfilen: S3 läser `regn_h` och `lutning30` (#524), och kandidaten ger ytan mellan
stationerna som färdiga varningspunkter (#576, #577).

Varje bygge de senaste dygnen levererar **antingen minne eller räckvidd**. Det är den gemensamma
nämnaren, och den är också nyckeln till hur de ska sitta ihop.

---

## 2. Fem lager, och var varje del hör hemma

| Lager | Frågan lagret svarar på | Delar som bor här | Läge |
| :-- | :-- | :-- | :-- |
| **L1 TROVÄRDIGHET** | Får vi tro på mätvärdet? | #75 givarvakten · stationsvakten (#164) · G_tak (DECISIONS #163) · värdevakten · R-A5 | ✅ i drift |
| **L2 TILLSTÅND** | Vad **är** ytan? | tillståndsskattaren (#89 steg 2) · radarns `regn` (#81 C) · operatörens klass · **#45 våtbulb → regn/slask/snö** · ~~#42 vattenfilm~~ (stängd 21/10, #648, #657) · **#276 olja på vägen** (Trafikverkets NonWeatherRelatedRoadConditions) | 🔨 blöt/torr byggt · S3 läser `regn_h` i motorn sedan 11/10 (#524) · väglagets *Våt* och radarn är kandidatens fuktvillkor (#562, #565) · olja i skugga sedan 1/10 (#421) · #45 döms tidigast 1/3 2027 · skattaren går inte till appen (#654) |
| **L3 UTVECKLING** | Vart är den på **väg**? | trendarkivet (#88) · övergångarna (#89 a) · **#46 rimfrost** · N_varning (SMHI) | 🔨 mätt; `lutning30` läses av motorn sedan 11/10, bara i efterhalkans gren (#524); trendens egen regel och T-B vilar till 2027/28, trendens värden prövas inom efterhalkan (#675); R-B döms 9/11 (#510); Ö-B läses på senare frost (#658) · **8/10:** T-A:s domspärr släppt på 169 frostnätter, värdena i TROSKLAR-TRENDEN §2 — 60 min · 0,4 °C · gap ≤ 2,0 °C · +1…+3 °C (#491, #492); rimfrostens R-A visar fysik, R-B:s uppspelning nästa (#491); övergångarnas steg 0c har 42 regnstopp med frost inom 4 h, Ö-B saknar instrument (#491) |
| **L4 RÄCKVIDD** | Hur långt **gäller** mätningen? | grind A:s ankare (#38b) · **kandidaten NIVÅ 2+BLANDNING** (#343) · SMHI molnmängd som räckviddsknapp (#95; mätt 6/10: 0,3 procentenheter, #471; Verify 2 och SMHI som reserv strukna 22/10, #675) · ~~#91 kallplatslagret~~ (struket ur vårlistans Ä6 22/10, #675) | ✅ **grind A KLARAD** (#321); segmentprognosen i skugga sedan 23/9 (#325) · **knappen = ankarspridningen (7/10):** spridningsgrinden är regel, X = 2,25 °C, 2,8 % grova fel på 61 % av punkterna i kuvösen (#474–#478) · ⚠️ **R21 (1/10): vägpunktsgrinden FALLEN 28/9** (#399) — rå avståndsviktning 6,9 % ± 0,4 grova fel med varma grannrader; premissmätningarna 30/9 (#405–#408) räddar ingen vägpunktskandidat på ärliga rader, bandet 0–7 km håller (Finland 2,3 %), höjden stängd (#650, #657) · **2/10:** premissmätningen går varje måndag och läses 24/11 (#435), Finland är stöd och inte dom (#436), flaggmarginalen mätt i kuvösen 6/10 (#437, #467) · **8–9/10:** FYSIK ensam sämre än RÅ i varje band, 9,85 mot 7,51 % (#485); kallkartan åt sidan, sämre än RÅ också på natten (#496, #497); 3,6 % av trafiken går bortom 15 km (#490) · **11–14/10:** FYSIK+BLANDNING 6,00 % (#516), NIVÅ 2+BLANDNING 5,02 % (#517) och på MET Nordics prognoser 5,24 % vid +6 h (#519), väg B med ärliga 4,84 och 5,12 % (#544); domen i mars gäller NIVÅ 2+BLANDNING med RÅ som kontroll och reserv (#547); kriging nedlagd (#548); vägpunkternas fasta särdrag inlagda i data/vagdata/ (#553) · **15–22/10:** kandidaten i motorn sedan 16/10, sist i prioriteten (#577), och på i lägesfilen sedan 17/10 (#631); förregistreringens §4b fastställd 21/10 med domen per ankarband (#655, #656); RÅ är kontroll och reserv (#657) |
| **L5 ALLVAR & RÖST** | Vad **sägs**, och hur illa är det? | #153 allvar som **försprång** · spärren (DECISIONS #165) · **#90 roll B** | ✅ **R22 (1/10): försprånget byggt och i skugga sedan 25/9** (#359), S2 nivå + bevis 24/9 (#341); taket är motorns 3 000 m, inte appens reglage (#275, #419); på alla 30 rutter sedan T0 22/10 11:12 UTC, räkneregeln fastställd (#664, #674); rösten efter domen i mars · två betaröster i motorn, båda *"Halkvakt tror"*: S3 (#524) och kandidaten (#577) |

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

**Efterhalkan är beviset att det behövs.** `icing_point`:s första gren kräver `moisture === true` — *"det regnar
just nu"*. Regnet slutar, fukten blir falsk inom tio minuter, ytan fortsätter falla. Steg 0 mätte
hålet: **76 % av regnstoppen hade regn i mätaren i samma stund motorn slog om till torrt**, median
35 minuter. Regeln kan alltså per konstruktion inte fyra i exakt det fönster efterhalkan inträffar.

L2 + L3 stänger det hålet, och sedan 11/10 gör motorn det i en andra gren: S3, efterhalkan som märkt beta, talar när ytan
ligger på +1…+3 °C, har fallit minst 0,8 °C på 30 minuter och mätaren sett regn inom 2 timmar, broar undantagna
(`engine.ts:279–285`, #222, #524). Det är den enskilt största vinsten som finns att hämta.

---

## 4. Motorn som den faktiskt ser ut i dag

<!-- LÄGESRADER §4: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [Trafikverkets väderstationer](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-vader): delvis, 89 % · kvar: Mätpunkter utan lufttemperatur vaktas inte (kort #344, #345): avgjort 14/10, ingen ändring nu, frågan tas upp inför 2027/28 (bedömningen §4.2). Mätt mot kandidatens veto 20/10: tre fjärrytor vetade 16 punkter på 9 sträcktimmar 17–20/10 och tystade ingen fuktig sträcka (DB-knappen 39415616056)
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
koden på main 22/10: `engine/src/{types,engine,snapshot,texts}.ts`, 707 rader, Kotlin- och Swift-portarnas speglar av S3 och
kandidaten (`Engine.kt`, `Engine.swift`, `SnapshotRepo.kt`, `SnapshotReader.swift`), publiceraren `publish/snapshot-core.ts` och den
publicerade `live.json`.

### 4.1 Sex farslag, en fast stege — och vad var och en kvalificerar på

| Prio | `kind` | Källa | Villkoret i dag | Vilka lager det använder |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `accident` (A3) | TRV Situation/Deviation | avstånd ≤ **10 km**; `SeverityCode ≥ 5` ⇒ två steg (10 km "överväg annan väg", en gång per olycka, #211; 2 km "sakta ner") | — |
| 2 | `slippery_segment` (A1) | TRV RoadCondition | `code ≥ 2` **eller** `info` har ett ord som börjar på `is`, `halka`, `halkrisk`, `halkig`, `halt` eller `mycket besvärligt`, eller `snö`/`frost` var som helst i ordet (`engine.ts:49–54`, kort #97, v24); halkzonen: grannsträckor inom **500 m** är en fara för upprepningsregeln (#621, #624) | **L2** (operatörens klass) |
| 3 | `icing_point` (A2) | WeatherMeasurepoint, broarna ur OSM | gren 1: `yta ≤ 1 °C` (bro: ≤ 3) **OCH** `fukt === true`. Gren 2, **S3** (märkt beta, inte broar): `yta` **+1…+3 °C**, `lutning30` ≥ **0,8 °C**, `regn_h` ≤ **2 h** (`engine.ts:273–286`, #222, #524) | **L1** + en **binär L2**; S3: **L2** (`regn_h`) × **L3** (`lutning30`) |
| 4 | `wildlife` (A4) | TRV djur på vägen (`djur`, AnimalPresenceObstruction, #318); `wildlife` publiceras tom | inget utöver korridor + ledsträcka | — |
| 5 | `camera` (A5) | TrafficSafetyCamera | ≤ **500 m**, `bearing+180°` inom **60°** av kursen | — |
| 6 | `kandidat` (K) | kandidatens regel i databasen, nyckeln `kandidat` (#576) | inget eget tal: varje publicerad punkt är en där regeln säger *varnar*; korridor + ledsträcka över sträckans punkter, en fara per sträcka, alltid beta (`engine.ts:352–367`, #577); §4.4 | **L4** (ytan mellan stationerna) × **L2** (fukten, i regeln) |

Talen som styr allt annat (`DEFAULT_CONFIG`, `types.ts:152–189`): korridor **±35°**, minsta fart **15 km/h**, global spärr
**10 s** (prioritetsmedveten sedan #127), upprepning **600 s OCH 5 000 m**, ledtid **30 s** klämd till
**400–3 000 m**, segmentsampling **100 m**, halkzonen **500 m** (#624), kandidaten tyst **120 s** efter samma sträckas A1 (#581) och
högst en kandidat per **600 s** (#606). S3:s fyra tal (1,0 · 3,0 · 0,8 · 2,0) står i samma tabell (#222, #524).

### 4.2 Vad motorn inte har — och varför "räckvidd" betyder två olika saker

- **Inget eget minne om vägen.** Odometern och fired-kartan minns *rösten*, inte ytan. Ingen struktur i motorn bär
  vad en station visade för en timme sedan. Minnet räknas i publiceringen och kommer in som fält: `regn_h` (timmar sedan
  stationens mätare såg regn) och `lutning30` (ytans fall på 30 minuter), som S3 läser (`snapshot.ts:46`, #524).
- **Ingen allvarsgrad i rösten** — och det är avsiktligt (§7.1, §13.1). Men maskineriet för att
  uttrycka allvar som **tid** finns redan: `leadM` spänner 400–3 000 m, vid 90 km/h **16–120 s**.
  Regeln finns i skuggan: kroken `leadFor` (`engine.ts:75`, `131–133`) med nivåerna i `engine/src/forsprang.ts` (#359). Bara
  skuggan sätter kroken, på alla 30 rutter sedan 22/10 (#674); Kotlin och Swift får den först efter domen i mars (steg 7, #419).
- **Ingen giltighetsradie.** Avståndsbegreppen i motorn är `leadM` = fart × 30 s klämt till 400–3 000 m, kamerans 500 m,
  olyckans 10 och 2 km och halkzonens 500 m. Kandidatens räckvidd avgörs inte i motorn: regeln i databasen bär stationsvetot
  inom 15 km och spridningsgrinden (§4.4), och motorn får bara punkterna där regeln varnar.

Den sista punkten är den viktigaste, och den är lätt att läsa fel: **`leadM` mäter förarens fart, inte
mätningens giltighet.** Grind A:s felkurva (§6.1) mäter något helt annat — hur fel ett ankarvärde blir
på 7, 15, 20 km. Två storheter, samma ord. Motorn har i dag bara den första, och den säger ingenting
om huruvida stationens `yta` över huvud taget gäller där föraren är. Den andra bor i kandidatens regel, på servern.

### 4.3 Ledningen, hela vägen

```
kandidat_live (Actions via pulsklockan: del A var sjätte timme, del B varje timme)
   → kandidat_regel() i databasen     (yta, fukt, veto, spridning, färskhet — talen bor bara här)
snapshot-core.ts (Supabase, var tionde minut; frågar regeln bara när brytaren kandidat_pa() är på)
   → live.json + static.json på CDN   (manifest.json bär sha256; app förkastar fel summa)
      → SnapshotRepo  (Android: org.json · iOS: JSONSerialization → SnapshotReader)
         → snapshotToHazards()        (adaptern — 1:1 i tre språk)
            → AlertEngine.step(fix)   (kvalificering → regel 2 med halkzonen → regel 1a → regel 1b)
               → alertText()          → rösten (S3 och kandidaten: "Halkvakt tror …", kortet märkt BETA)
```

Uppmätt i den publicerade `live.json` 14/9 05:10: **28 väderstationer, 1 avvikelse, 1 viltpunkt,
0 segment, 0 broar, 0 SMHI-ytor.** I september hade motorn alltså i praktiken bara `icing_point` och
kamerorna att arbeta med. 15/10 17:30 bar `live.json` 40 sträckor i `segments` och kandidatens 2 sträckor med 16 punkter,
79 531 byte (#576).

### 4.4 Kandidaten: en egen väg in, sist i stegen

Kandidaten NIVÅ 2+BLANDNING (den frysta, #552) går live i appen före domen (#556) som en egen betavarning (#562). Den har
inte gått genom `weather[]` eller `segments`, utan har en egen väg hela vägen.

| Led | Vad som gäller | Var |
| :-- | :-- | :-- |
| **Räkningen** | Axels Python-kedja i GitHub Actions: fysiken på MET Nordic, rättelsen `modell.pkl`, grannarnas fel med RÅ och blandningen (W 0,25 · L 160 km) ⇒ ytan `pb` vid 13 714 punkter (väglagspunkterna och stationerna), varje timme | `fysik/live/`, `kandidat-fysik.yml`, `kandidat-timme.yml` (#558); paritet med kuvösen inom toleransen (#562) |
| **Regeln** | yta ≤ **0 °C** · fukt mätt på platsen: väglagets *Våt* på sträckan eller radarn `rate_mean_mmh` ≥ **0,5 mm/h** de senaste 60 min · veto: ingen station inom **15 km** med yta över **+2 °C** de senaste 45 min, med ankarnas vakter · spridningsgrinden: tyst där minst två ankare bidrar och spridningen är ≥ **2,25 °C** · färskhet: timmen högst 2 h gammal och ≥ 95 % av punkterna, annars tiger regeln | `kandidat_regel()`, `sql/058` (#562, #565, #566, #573, #575); radarns tal är ett arbetstal som avgörs 26/10 (#568) |
| **Publiceringen** | egen nyckel `kandidat`: en rad per sträcka med de varnande punkterna. *Lägg till, ersätt aldrig* — `segments` är orörd. Brytaren av ⇒ nyckeln utelämnas helt | `snapshot-core.ts:240–277`, `:446` (#576, #578) |
| **Adaptern** | en fara per sträcka, `kand:<id>`, med punkterna och sträckans A1-id `seg:<id>`; `tid` läses inte | `snapshot.ts:64–66`, `SnapshotRepo.kt`, `SnapshotReader.swift` (#577, #581) |
| **Motorn** | korridor och ledsträcka som ett segment, över punkterna; **sist i prioriteten**, A3 > A1 > A2 > A4 > A5 > K, så den kan aldrig tysta eller fördröja en annan varning; tyst 120 s efter samma sträckas A1; högst en per 600 s; upprepning 10 min och 5 km per sträcka | `engine.ts:352–367`, `types.ts:15–25` (#577, #581, #606); vektorerna v42–v47 |
| **Rösten och kortet** | *"Halkvakt tror: halka framöver."*, alltid `beta`; kortet *BETA · Halka · Halkvakt tror — modellerat · FRAMÖVER*; styrs av reglaget *Halka*; inte i *I närheten* | `texts.ts:32` (#573, #577) |

**Spärrarna.** Regeln tiger utan mätt fukt, vid veto, vid stor spridning och när kandidatens timme är gammal eller ofullständig.
Brytaren tar bort nyckeln: att tysta kräver en av Bengt och Axel, att starta igen båda (#578). Apparnas åldersvakt släpper
kandidaten efter 45 minuter (#577). Kandidaten talar också långt från stationerna, som ett undantag från regel T till domen i
mars (#563); bortom 15 km bär fuktkravet, BETA-märkningen och brytaren varningen.

**Läget 22/10.** Brytaren är på sedan 17/10 21:04 UTC (#631). Motorn med kandidaten finns i byggena 0.3.13 (26)–(32), uppladdade
till App Store Connect; inskicket till App Review med (32) återstår (#643). App Store-versionen 0.3.9 bär den inte. Skuggans
motorvarv körs utan kandidaten, eftersom deras domar är förregistrerade utan den; kandidatens egen takt och domlogg räknas ur
regeln (#573, #577).

**Var den döms.** I mars 2027, som en ny fråga (#547), enligt `docs/FORREGISTRERING-2026-27.md`: grind A–C med
TROSKLAR-SKUGGAN §3, spridningsgrinden och tystnad på täckt sträcka som miss (§4), räknat på det kedjan räknade vid timmen
(`kandidat_station`, `kandidat_skugga`) och prövat per ankarband 0–7, 7–15, 15–20 och över 20 km (§4b, #655, #656). RÅ redovisas
bredvid som kontroll och reserv (§6). Förväntan är skriven före vintern: 5,12 % grova fel vid +6 h mot grind A:s tak 5 % (§7,
#552). Förregistreringen signeras senast 31/10.

---

## 5. Fogarna — var en skuggdel kan greppa, och vad den kostar

<!-- LÄGESRADER §5: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [SMHI:s varningar](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-smhi-varningar): delvis, 92 % · kvar: Ingen läsare i motorn: efter F-A (de första vintervarningarna) och F-B (en vintermånad)
- [SMHI:s nederbördsradar](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-radar): delvis, 88 % · kvar: Radarns tal R i förregistreringen §10 (a), läses 26/10 (#568)
- [Vägdatalagret (NVDB)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-k-vagdata): delvis, 92 % · kvar: Kuvösens inläsning till kuvos_ra.vagdata (kort #303)
- [Lägesfilens fält för skuggdelarna](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-l-falten): klar
- [L3 trenden](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-trenden): delvis, 44 % · kvar: T-B vilar till 2027/28 (#675); trendens värden prövas inom efterhalkan
- [Rimfrosten](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-rimfrost): väntar, 44 % · En frostmånad för R-B; uppspelningen ur arkivet är byggd (#510), domen läses 9/11 (frist r-b-dom).
- [Nederbördstypen (snö, slask)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-nederbord): väntar, 44 % · Domen tidigast 1/3 2027 när vintern gett ≥100 snö- och ≥40 slaskepisoder (NT-D).
- [Kallplatserna](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-kallplatser): stängd · Kortet #91 stängt 25/9; vårlistans Ä6 struken 22/10 (#675): idén lever i kandidatens terrängsärdrag och kort #321

<!-- /LÄGESRADER -->

Frågan *"hur ska det som ligger i skuggan sömlöst kunna länkas ihop med det som kör?"* har ett exakt
svar: motorn har **fem** ställen där något nytt kan fästa, och de kostar dramatiskt olika mycket.

### 5.1 De fem fogarna

| Fog | Var | Vad som ändras | Vektorer som måste göras om | Portar |
| :-- | :-- | :-- | --: | --: |
| **F1** | `live.json` / `static.json` (`snapshot-core.ts`) | ett nytt fält på en rad | **0** | **0** |
| **F2** | `snapshotToHazards()` | fältet läses in | 0 | 3 |
| **F3** | `PointHazard.meta` / `SegmentHazard.meta`, eller en ny typ som `KandidatHazard` | ny nyckel i typen | 0 | 3 |
| **F4** | `evaluatePoint()` / `evaluateSegment()` / `evaluateKandidat()` | **villkoret** ändras | **12 is / 9 segment** | 3 |
| **F5** | `PRIORITY`, regel 1a/1b, `alertText()` | ordningen eller rösten | **50 (alla)** | 3 |

F4:s tal är räknade, inte gissade — men de ska läsas rätt: de är antalet vektorer som
**innehåller** en fara av det slaget, alltså en **övre gräns** för vad en regeländring kan rubba.
Räknat 22/10 i `engine/vectors/` (50 vektorer): tolv bär en `icing_point` (v08, v09, **v11**, v18, v19, v23, v27, v36, v38–v41),
nio ett `slippery_segment` (v04, v07, **v11**, v24, v45, v46, v48–v50). 14/9 var talen 6, 3 och 23; §7.8 och §13 citerar dem som
de räknades då. Hur många som faktiskt vänder beror på ändringen — se §5.6.

**v11 är grinden som betyder något.** `v11_silent_drive` bevisar *tystnad* — den bär både en
isvärnpunkt och ett segment som måste förbli tysta. Varje **vidgning** av L2 (skattaren säger "blöt"
där `fukt` var falskt) får v11 att tala. Och husregeln är absolut: *en vektor försvagas aldrig för att
få ett bygge grönt.* Alltså är v11 den verkliga tröskeln för hela tillståndslagret — inte en
formalitet, utan platsen där påståendet "det här är en förbättring" måste bevisas. S3 vidgade frysrisken efter regn, och v11
tiger fortfarande (#524).

### 5.2 Publicerat, läst och oläst

| Fält som publiceras | Läses av motorn? | Följd |
| :-- | :-- | :-- |
| **`weather[].regn_h`** · **`weather[].lutning30`** | **JA**, sedan 11/10 i alla tre portarna (`snapshot.ts:46`, `SnapshotRepo.kt`, `SnapshotReader.swift`; #524) | efterhalkans gren i `icing_point`, S3 (§4.1); i iOS- och Android-apparna töms `regn_h` vid inläsningen utan Betatest, så S3 talar bara för testgruppen (#677) |
| **`kandidat`** | **JA**, sedan 16/10 i alla tre portarna (`snapshot.ts:64–66`; #577); regelns timme `tid` läses inte | kandidatens betavarning (§4.4) |
| **`segments[].regn`** och **`rain_segments`** — radarns mm/h per segment (#81 C) | **NEJ**, och det gäller inte längre (#654). `regn` finns inte i `LiveDoc`-typen | Radarns väta når rösten genom kandidatens fuktvillkor på servern, inte genom adaptern (#562, #565). Normalklassade segment med radarregn ≥ 2,0 mm/h har en egen toppnyckel, `rain_segments` (DECISIONS #187), eftersom varje rad i `segments[]` blir en halkvarning i motorn och båda portarna — fogen var F4/F5, inte F1 (R16). Skuggmotorn läser `rain_segments` (`skuggmotor/main.ts:238`); vattenplaningen föll (#648) |
| `weather[].lutning15/60` · `weather[].bevis` | NEJ, och det gäller inte (#654) | tillståndet ska inte in i appen; skuggan läser `lutning15/60` och `bevis.vata`, vakthunden `bevis` |
| `smhi[]` | NEJ — deklarerat `unknown[]`, *"map/UI layer"* | SMHI når appen men inte motorn: favoritrapporten läser `smhi[]`, motorn talar inte SMHI (#654) |
| `segments[].road` | deklarerat, men adaptern lägger det aldrig i `meta` | segmentrösten kan inte säga vägnummer |
| `deviations[].typ` · `wildlife[].art` · `djur[].art` · `djur[].slut` · `cameras[].road` | aldrig lästa | — |
| `meta.speedLimitKmh` | rösten *kan* säga den, men adaptern fyller den aldrig | kamerorna säger alltid den **korta** raden — den fältverifierade |
| `meta.active` (vilt, säsong × timme) | aldrig satt ⇒ alltid `true` | grinden är **sovande, inte trasig**: dagens källa är Trafikverkets djur på vägen (`djur`, #318), inte historiska hotspots |

**Två länkar har gått hela vägen, på två olika sätt.** S3 gick genom fält som redan publicerades: `regn_h` och `lutning30` låg
i `live.json` sedan 15/9 (#188), och 11/10 kom F2 + F3 + F4 i tre portar (#524) — mönstret som 14/9 förutsågs för radarns väta.
Kandidaten fick en egen nyckel, eftersom en rad i `segments` hade blivit en vanlig halkvarning (#576). Radarns väta, som 14/9 såg
ut som den första integrationen utan ny publicering, når i stället rösten genom kandidatens regel; i motorn gäller den inte längre
(#654). För #42 är frågan stängd: båda spåren föll (#648, #657).

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

Kandidaten följer regeln: en egen nyckel bredvid `segments`, som är orörd (#576). Där är en saknad nyckel tystnad med flit —
brytaren tar bort den, och en oläsbar brytare gör detsamma, eftersom tyst är det säkra hållet (#578).

### 5.4 Vad varje skuggdel greppar i

| Del | Lager | Greppar i | Ersätter? | Tyngsta kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **S3, efterhalkan** (#89, #222) | L2×L3 | **byggd:** F1 `weather[].regn_h` och `lutning30` (15/9, #188) + F2 + F3 + F4 i tre portar (11/10, #524) | **nej — andra gren i `icing_point`, bredvid `fukt`** | fyra nya vektorer (v38–v41); v01–v37 orörda, **v11 tyst** |
| **Kandidaten NIVÅ 2+BLANDNING** (#343) | L4 (+ L2 genom fukten) | **byggd:** F1 egen nyckel `kandidat` (15/10, #576) + F2 + F3 `KandidatHazard` + F4 `evaluateKandidat` + **F5**: eget slag sist i `PRIORITY` och egen text (16/10, #577); regeln i databasen (§4.4) | **nej — egen nyckel, `segments` orörd** | sex nya vektorer (v42–v47); vid #577 var alla 41 tidigare byte för byte orörda |
| **Radarns `regn`** (#81 C) | L2 | **gäller inte i motorn** (#654): radarn är kandidatens fuktvillkor i databasen (#562, #565); publiceras för skuggan | — | — |
| **Tillståndsskattaren** (#89 steg 2) | L2 | **gäller inte i appen** (#654): `bevis` publiceras (#342) och läses av skuggan och vakthunden | — | — |
| **Trendarkivet** (#88) | L3 | `lutning30` läses i S3:s gren (#524); trendens egen regel vilar till 2027/28 (#675) | nej | — |
| **Segmentprognosen, RÅ** (#38b) | L4 | **ingen fog i motorn:** RÅ är kontroll och reserv och medvetet opublicerad (#547, #657); loggas i `shadow_log.prognos` (rå avståndsviktning, #324); rå viktning föll vägpunktsgrinden 28/9 (#399); kort #270 har inga öppna val kvar, och val (d) är ersatt av domen per band (#655, #657) | nej | ingen — kandidaten är den som publiceras och talar (§4.4) · spridningen loggas sedan 7/10 (#474); marsdomen räknas med spridningsgrinden vid 2,25 °C och tystnad på täckt segment som miss (#475, #477, #478) |
| **#46 rimfrost** | L3 | F1 (daggpunkten saknas i `live.json`) + F3 + F4 som andra gren i `icing_point` — **beslutad, inte byggd**: `engine.ts:273–286` har ingen daggpunktsgren; R-B döms 9/11 (#510) | nej | isvektorerna; förebilden (§7.8) |
| **#45 snö/slask** | L2 | F1 + F3 + F4, som meta på halkans fara | nej | vektorerna med halka (nio 22/10) — **och frestelsen att göra det till ett eget slag måste avvisas** (§7.8). Vektorn som #52 låste är beslutad: kod 1 med snö- eller frostord talar (kort #97, v24; #52 stängt 22/9, #303). Domen tidigast 1/3 2027 |
| ~~**#42 vattenplaning**~~ | L2 | **stängd 21/10** (#657): V-A och V-B fallna (#69, #104, #648), steg D, farslaget `aquaplaning`, struket. Skuggan loggar vattenplaning vidare med flit (#648, #662) | — | — |
| ~~**#91 kallplatslagret**~~ | L4 | var tänkt som F1 på `weather[]` + F3 + F4; **stängt 25/9** (#355) och struket ur vårlistans Ä6 22/10 (#675): idén lever i kandidatens terrängsärdrag och kort #321 | — | — |
| **SMHI `N_varning`** (#95) | L3/L4 | motorn läser inte `smhi[]` (#654); favoritrapporten gör det. Förstärkaren E1 i motorn först efter F-A och F-B | nej | isvektorerna |
| **#153 allvar som FÖRSPRÅNG** | L5 | F4 — `leadM` per fara, genom kroken `leadFor` (`engine.ts:75`, `131–133`); bara skuggan sätter den, på 30 rutter sedan 22/10 (#674) | nej | utan krok är motorn byte för byte densamma; i Kotlin och Swift efter domen (steg 7, #419) |
| *#153 om allvar någonsin rör ORD eller PRIORITET* | L5 | **F5** | ja | **alla vektorer, tre portar** — och E3 förbjuder redan det senare (§10.2) |

Trendarkivets fog var extra billig av ett skäl värt att skriva ut: `trend_kandidater` är nycklad på
`station_id`, **samma nyckel som `live.json`:s `weather[].id`**. Ingen ny sammanfogningslogik behövdes —
bara kolumnerna `lutning15/30/60` i den fråga som redan bygger `weather`-raden (#188).

Mönstret som faller ut: **allt är additivt så länge allvar uttrycks som TID.** Varje del kan greppa
utan att röra prioritetsstegen eller rösten. Det är inte en slump — det är §7.8:s lärdom tillämpad, och den är
anledningen till att arbetet i skuggan faktiskt går att landa. Kandidaten är undantaget som håller mönstret: den fick ett eget
slag (F5), men sist i stegen, så ingen annan varning beter sig annorlunda (#577).

### 5.5 Repetitionsscenen finns redan — och den tvingar fram en ordning

`scripts/bundle-skuggmotor.ts` buntar `engine/src/*.ts` **ordagrant** in i skuggfunktionen, och både
`ci` och `deploy-supabase` kör `--check` på att bunten är i synk. **Skuggmotorn är alltså inte en
kopia av motorn — den är motorn**, med samma adapter och samma regler, körd mot verklig trafik.

Det ger varje F2/F3/F4-ändring en plats att bevisas på innan den når en telefon. Men det lägger också
en ordning som inte går att kringgå: **skuggan läser samma `live.json` som apparna.** Ett fält som
inte publicerats finns inte heller för skuggan. Undantaget är kandidaten: skuggan hämtar dess varnande punkter direkt ur regeln i
databasen (`kandidatVarnar`, #573), och skuggans motorvarv körs utan den, eftersom deras domar är förregistrerade utan den (#577).

> **Sekvensen för varje ny länk:**
> **(1) F1** — publicera fältet. Ofarligt, ignoreras av alla appar, bevisas med manifestets sha.
> **(2) mät i skuggan** — F2+F3 in, villkoret av, se vad fältet *skulle* ha ändrat.
> **(3) F4** — ändra villkoret, gör om de berörda vektorerna, bevisa att v11 fortfarande tiger.
> **(4) tre portar** — Kotlin och Swift speglar, vektorerna går byte-för-byte.
>
> F1 ligger alltid **minst ett varv före** F4. Görs de i samma varv finns ingen mätning som skiljer
> "regeln blev bättre" från "fältet blev tillgängligt".

**Så har det gått.** S3 följde sekvensen: F1 15/9 (#188), skuggan S1 från 16/9 (#198) och S1-grinden läst 11/10 (#521), sedan F4
och de tre portarna i samma PR 11/10 (#524) — F1 låg nästan en månad före F4. Kandidaten tog en kortare väg: nyckeln
publicerades 15/10 (#576) och motorn i tre språk kom 16/10 (#577). Steg 2 mättes inte i skuggans motor, utan i regelns domlogg
(`kandidat_skugga`, #573) och i takten längs skuggrutterna, som gav taket högst en kandidat per 10 minuter (#583, #606).

---

### 5.6 Vad §4 och §5 vilar på — och vad de inte bevisar

Kartans två motorparagrafer är **lästa ur koden, inte körda**. Det är en starkare grund än minne och
en svagare än en mätning, och skillnaden ska stå skriven här och inte upptäckas senare.

| Påstående | Vad det vilar på | Vad det inte bevisar |
| :-- | :-- | :-- |
| §4.1 villkor och tal | `engine/src/{types,engine}.ts` lästa i sin helhet på main 22/10 | — detta ÄR koden |
| §4.3 ledningen | `snapshot-core.ts` → `publicera` → `SnapshotRepo` → `snapshot.ts`, lästa | att alla tre portarna beter sig lika i drift; bara vektorerna bevisar det |
| §4.3 talen 28/1/1/0/0/0 | den publicerade `live.json` hämtad 14/9 05:10 | något om vintern — i september är materialet nästan tomt |
| §4.4 kandidatens väg | `snapshot-core.ts`, `snapshot.ts`, `engine.ts`, `sql/058` och portarnas speglar, lästa; besluten #562–#606 | att regeln talar rätt; det avgör domen i mars |
| §5.1 vektortalen 12/9/50 | filsökning efter `icing_point` respektive `slippery_segment` i `engine/vectors/` 22/10 | **att alla faktiskt vänder.** En vektor som BÄR en fara kan mycket väl ge samma utfall efter ändringen. Talet är ett tak, inte en kostnad |
| §5.2 läst och oläst | fält för fält mellan publiceraren och `LiveDoc`/adaptern, 22/10 | att inget ANNAT läses fel — listan är över det som publiceras, inte en revision av motorn |
| §5.3 otypad läsning | `org.json.JSONObject` i `SnapshotRepo.kt`, `JSONSerialization` i `SnapshotRepo.swift` | att en FRAMTIDA port gör likadant. Byts någon port till typad avkodning faller §5.3:s premiss, och F1 slutar vara gratis |

**R16 (Axel 16/9, DECISIONS #196/#199): fog-tabellen är läst, inte körd — och det bet 15/9.** #154:s steg stod som F1
("lägg `regn` på fler segment"), men `snapshotToHazards` och båda portarna gör VARJE rad i `segments[]` till en
`slippery_segment` — en vidgad väglagsfråga hade sagt "halka" på varje blöt normalväg i höstregn, F4/F5 utklädd
till F1. Det fångades i koden före deploy och löstes med egen nyckel (`rain_segments`, DECISIONS #187). Regeln
som följer: **en fog i tabellen räknas som F1 först när det är verifierat i kod att ingen port läser fältet.**
Verifierade 15/9: `rain_segments`, `weather[].regn_h`, `weather[].lutning15/30/60` (nya nycklar, otypad läsning,
§5.3). Sedan dess läser alla tre portarna `regn_h` och `lutning30` (S3, 11/10, #524) och `kandidat` (16/10, #577); `rain_segments`,
`lutning15/60` och `bevis` läser ingen port (#654). Två länkar är körda hela vägen, S3 och kandidaten; resten av §5 är läst.

**Kostnadskolumnerna mäter FOG, inte arbete.** Att en del "bara" kostar F4 säger var den greppar —
inte hur svår regeln är att formulera, och inte hur lång mätningen blir innan den får ändras.
Tillståndsskattaren och kallplatslagret hade samma fog och helt olika vägar dit.

**Det enda som gör talen till kostnader är att köra dem.** Sekvensen i §5.5 steg 3 är därför inte
byråkrati: den är stället där "sex vektorer" blir ett verkligt tal i stället för ett tak. Två gånger är det gjort: S3 (F4) rubbade
ingen av de 37 vektorer som fanns och lade till fyra (v38–v41, #524); kandidaten (F5, sist i stegen) rubbade ingen av 41 och lade
till tre (v42–v44, #577). Taket var i båda fallen långt över kostnaden.

---
## 6. Var lagren står, mätt

<!-- LÄGESRADER §6: skrivs av scripts/projektkartan.ts ur docs/projektkartan.json, ändra inte för hand -->
*Läget i projektkartan:*

- [L2 tillståndet (skattaren S1–S3)](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-tillstand): delvis, 100 % · kvar: Skattarens träffsäkerhet mot operatörens klasser, dömbar först med vinterfacit
- [L4 räckvidden: segmentprognosen](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-segmentprognos): väntar, 74 % · Domen i mars 2027 (grind A–C) på kandidaten NIVÅ 2+BLANDNING som ny fråga, RÅ kontroll och reserv (#547), val d på kort #270 struket 21/10, domslut (b) döms per band (#655).
- [L5 allvar som försprång](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-forsprang): delvis, 56 % · kvar: FS-A: nivå 2-fall i vinter (kod 3–4, eller yta ≤ 0 °C med väta ≥ 3); kod 3 och 4 finns i arkivet sedan 20–21/10 (kodgrinden 39617620449: 75 och 5 rader), andelen döms i mars
- [RÅ: kontroll och reserv](https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8#del-m-prognoslagret): väntar, 88 % · Premissläsningen tisdag 24/11 (DECISIONS #435), som kunskap om RÅ; RÅ:s dom i mars redovisas bredvid kandidatens som kontroll och reserv (#547).

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

**Läget 9/10:** knappen är ankarspridningen. Spridningsgrinden är regel med X = 2,25 °C och ger 2,8 % grova fel på 61 % av punkterna i kuvösen (#474–#478). På vintern 2024/25 föll grind A (A2 5,5 %) och vägpunktsgrinden för alla kandidater (#467); med offsetmodellen gav 15–20 km 5,4 % och bortom 20 km 10,3 %, och 60-dygnsfönstren 3,4, 5,4 och 7,1 % (#469). Molnet köper 0,3 procentenheter (#471 L4), och terräng och vägdata förklarar nästan inget av stationernas särart mot grannarna (#471 L8, #479). FYSIK, Axels fysikmodell som fil, är ensam sämre än RÅ i varje band (9,85 mot 7,51 % grova fel, bortom 20 km 15,5 mot 13,6 %), men kuvösen räknar samma tal som replikan, så en kandidat utanför repot kan dömas där (#485). Kallkartan ur satelliten bär inte heller stationernas särart: alla tre rättelserna sämre än RÅ, totalt 7,63–9,76 mot 7,26 % och på natten 6,03–8,14 mot 5,73 %, och kartan är lagd åt sidan (#496, #497). Bortom 15 km går 3,6 % av trafiken, bortom 20 km 1,3 % (#490).

**Läget 22/10:** FYSIK+BLANDNING 6,00 % (#516), NIVÅ 2+BLANDNING 5,02 % (#517) och på MET Nordics prognoser 5,24 % vid +6 h (#519), väg B med ärliga 4,84 och 5,12 % (#544); domen i mars gäller NIVÅ 2+BLANDNING med RÅ som kontroll och reserv (#547, #657); kriging nedlagd (#548); vägpunkternas fasta särdrag inlagda i data/vagdata/ (#553); höjden stängd, eftersom den är ett särdrag i kandidaten (#650, #657). Kandidaten går live i appen före domen (#556), räknas i GitHub Actions via pulsklockan (#558) och räknar samma sak som kuvösens frysta procedur: alla tre paritetskörningarna inom toleransen efter rättelsen av snötäcket (#562). Den talar som betavarning sedan 16–17/10 (§4.4). Förregistreringen (`docs/FORREGISTRERING-2026-27.md`) har §4b fastställd 21/10 med domen per ankarband (#655, #656), radarns tal läses 26/10 (#568) och signeringen sker senast 31/10. Den frysta kandidaten prövas också på en äldre vinter ur VViS, 2022/23, den enda av de fem som går att räkna som förregistrerat (#666–#670); identitetsprovet på 2024/25 är klarat (#671). En ny kandidat för 2027/28 tränas på sex vintrar; den frysta kandidaten och vintern 2026/27 påverkas inte (#670–#672). **24/10:** den nya provades på sex vintrar (A2 4,03 %, på 2022/23 4,33 mot den frystas 4,52 %); V2 föll, så ingen skugga enligt ersättningsregeln (#702). Bytet till den nya står som utkast i förregistreringens §12 och signeras 26/10 (#703), paritetsprovet är klarat (#704), och den nya loggar bredvid den låsta i egna tabeller (sql/068) utan att nå föraren: publiceringen läser bara `kandidat_regel()` (#706). Pulsjobben är 21 (#706).

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
ordning mellan **farslag** (A3 > A1 > A2 > A4 > A5 > K), inte ett mått på hur illa det är.

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
att **ingen regel i appen kopplar ett sammanvägt tillstånd till ett försprång**. Kort #153 bär den
frågan, och som försprång kostar den **F4, inte F5** (§5.4). Regeln finns i skuggan sedan 25/9 (#359), på alla 30 rutter sedan
22/10 (#674), och döms i mars.

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
regeln 23/9 (#319). **Sedan 15/10 är regel T en vanlig tröskelregel** (#563): låset *"aldrig mjukas upp, oavsett signaturer"* är
hävt, T1–T6 står som huvudregel, och kandidaten har ett undantag till domen i mars — T3 och T5 lyfts för kandidatens yta och för
inget annat, medan fukten kräver ett mätt vittne på platsen (§4.4).

### 7.3 Varje grind dömer sin del ENSAM. Det finns ingen grind för kombinationen

T-A/B/C, W-A/B/C, Ö-A/B/C/D, V-A/B, F-A/B, R-A…R-D, Å-A/B. Var och en har golv som delen ska klara
**för sig**.

**Men en del kan vara svag ensam och avgörande i kombination.** Och vi har redan gjort det felet:
**SMHI mättes som ANKARE och underkändes** (MAE 1,05 → 1,20). Men SMHI:s roll i modellen ovan är inte
ankare — den är **räckviddsknappen i L4**. Grinden svarade på en fråga ingen behövde svar på, och
nejet låg på kortet som om SMHI vore avgjort. Som knapp mättes molnet 6/10 i kuvösen: 0,3 procentenheter (#471 L4).

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
faller *under* noll. När ytan börjar **stiga** — vilket kortet självt kallar *"skälet att
tystna tidigare på morgonen"* — räknas sedan #368 i en egen tabell, `trend_stigande`, men publiceras inte. För L3 vill man ha
trenden överallt där tillståndet betyder något.

### 7.7 #45 lutar på en höjdkorrektion som #91 mätte till noll

#45:s metod: våtbulb per segment via **offsetmodell + höjdkorrektion** (lapse 0,71 °/100 m — **R28 (7/10):** #45 använder 0,63 sedan 17/9 (#226); på vintern 2024/25 var lapsen 0,18 (#467), och RÅ+HÖJD var sämre än RÅ (#481)), för att
höjden flyttar snögränsen.

#91:s mätning 12/9: på 1 962 punkter återvinner höjdkorrektionen **exakt noll** (1,65 → 1,65 °C) och
gör det **sämre i två av fyra band**.

De två är inte samma storhet — #91 mätte **yttemperatur**, #45 använder **lufttemperatur**, och lapse
rate är fysikaliskt rimligare för luft. **Men ingenstans står det.** Ett dokument lutar på en
korrektion ett annat dokument har mätt emot, och ingen har skrivit varför det ändå går.

### 7.8 En sak gjordes RÄTT, och den är förebilden

**Rimfrosten (#46) är beslutad som en ANDRA GREN i `icing_point` — inte en sjätte farotyp.** Skälet som skrevs:
en sjätte `kind` hade rört varje vektor och hela prioritetsstegen. Grenen är inte byggd: daggpunkten saknas i `live.json`, och R-B
döms 9/11 (#510). Mönstret är däremot byggt i S3, efterhalkan, som sedan 11/10 är en andra gren i `icing_point` (#524).

I fogarnas språk: **#46 valde F3+F4 i stället för F5** — sex vektorer i stället för 23 (räknat 14/9), och
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
F (röst) i alla tre fallen. **#42 föll:** V-A och V-B är fallna, och steg D med slaget `aquaplaning` ströks 21/10 (#648, #657).

**Det slag som byggdes blev ett annat: kandidaten, `kandidat`** (#562, #577). Den ligger sist i prioriteten, A3 > A1 > A2 > A4 >
A5 > K, beslutat av Bengt 16/10 (#577); platsen prövas på nytt efter domen i mars. Sist i stegen kan den aldrig tysta eller fördröja
en annan varning (v44), men den viker för en kamera och talar tidigast 10 s senare (v43). Därför rubbade den ingen av de 41
vektorer som fanns.

---

## 8. Vad som minst måste finnas för att helheten ska lyfta

| # | Vad | Vems | Fog | Kostnad |
| :-- | :-- | :-- | :-- | :-- |
| **A** | **Allvar som FÖRSPRÅNG** — samma ord, tidigare. Formen beslutad (#90 roll B); regeln i skuggan | Axels (rösten) | **F4** | ✅ R25 (1/10): byggd som skugga 25/9 (#359), på alla 30 rutter sedan 22/10 (#674), räkneregeln fastställd (#664), dom mars 2027 |
| **B** | **Bevisbärare i snapshoten** — varje fara bär vilka lager som talade och hur starkt, inte en boolean | delad | F1+F3 | additiv — ✅ byggd 24/9 (#342, kort #245 klart 25/9), radarn per station sedan 4/10 (#459); motorn läser den inte, och det gäller inte (#654): skuggan läser `bevis.vata` för försprånget, och vakthunden larmar om fältet saknas |
| **C** | **En grind för KOMBINATIONEN** vid sidan av per-delsgrindarna | mätningen, alltså vår | — | ✅ skriven 17/9 (KB-A–D) |
| **D** | **En skriven regel för gemensam kalibrering** — tillägg till §8-regimerna | Bengt fastställer | — | ✅ regel D, 17/9 |
| **E** | **Graciös degradering** — skattaren returnerar nivå + bevis i stället för enum | min kod | F3 | ✅ byggd 24/9 (#341) |

**C och D är skrivna (17/9, TROSKLAR-KOMBINATIONEN).** E är en liten ändring i min egen modul — och
enligt §7.5 **indata till A**, inte en förfining. A är Axels; sedan hans invändning (§13.1) kostar
den **F4, inte F5**, vilket gör att den mäts i skuggan den här vintern. I appen kommer den först efter domen i mars (steg 7, #419).

---

## 9. Hur en del döms: ett nej gäller en ROLL, inte en del

Prejudikatet finns i protokollet: **kamerorna** underkändes som täckning (744 st, 99 % inom 1 km från
en station, Norrlands lucka oförändrad) — och blev **bildfacit**, en av tre facitkällor systemet i dag
vilar på. Samma del, annan roll, avgörande värde.

**Men principen behöver en broms, annars blir den ett sätt att aldrig ta ett nej:**

> Ett underkännande gäller den **fråga som ställdes**. En del får prövas i en ny roll — men den nya
> rollen kräver en **ny fråga, skriven före mätningen, med egen grind**. Ingen del återinförs på hopp.

### 9.1 De tio underkända, och deras obesvarade fråga i helheten

| Del | Vad som underkändes (mätt) | Obesvarad fråga i det sammanvägda |
| :-- | :-- | :-- |
| **SMHI** | som ANKARE: MAE 1,05 → 1,20; som **reserv när Trafikverket tystnar helt** kostar den uppmätt 2,36 °C på 352 punkter — en kvantifierad beredskap, ingen väg; SMHI som reserv och Verify 2 strukna 22/10, reserven är RÅ och kandidaten (#675) | som **räckviddsknapp** (L4): gör molnmängden grind A:s felkurva brantare klara nätter? Aldrig mätt — **R29 (7/10):** mätt i kuvösen 6/10 (#471 L4): 0,3 procentenheter; knappen är spridningen, inte molnet |
| **Höjden** | återvinner noll på YTtemperatur *som medelkorrektion*, och lapse **0,63 °/100 m ur 3 476 par** är ett stabilt fysiskt faktum (#45 använder 0,63 sedan 17/9, #226 — **R30 (7/10):** på vintern 0,18 ur 3 431 par, #467; RÅ+HÖJD 8,8 mot 7,4 % grova fel, #481). **#96 stängt 20/10 och delen stängd 21/10** (#650, #657): höjden är ett särdrag i kandidaten (#547); premissläsningen 24/11 står under RÅ (#435) | (a) #45 använder **luft**, inte yta — annan storhet. (b) förutsäger höjden **var modellen är opålitlig** i stället för att korrigera medelvärdet? Ställs inte längre som egen fråga |
| **Kamerorna** | som TÄCKNING: 6 av 744 ger nytt ankarläge | ✅ redan omrollad till **bildfacit** — prejudikatet |
| **RH-guarden** | som FILTER: fuktigheten stiger efter regn | den **stigningen** är i sig ett tillstånd — förutsättningen för kondensation och rimfrost (#46) |
| **Operatörens "Våt"** | som PROXY för skattaren; eftersläpningen är inte längre omätt: *Våt* hade median 9,6 h i väglagsarkivets 12 469 rader på sju dygn (#491, steg 0e) | i dag **både indata och facit** för kandidaten: *Våt* är ett av regelns fuktvillkor (#562, #573), och domen redovisas också utan väglaget som facit (förregistreringen §4b punkt 5, #656) |
| **`rate_max`** | som VÄRDE: 727 mm/h, spärrat | **kvoten max/mean** är en formsignal: konvektiv skur mot frontregn. Exakt vad #45 behöver för att skilja lokal snöby från utbrett regn |
| **Radarns bidrag** | växer inte med avståndet (platt ~1,5 %) — med #168:s två reservationer: yttre bandet bär 25 segment, och fönstret var 5,3 dygn frontregn; "inget nej till radarn som källa, 96 % precision" | mätt där en station står **6,7 km** bort i median. Radarns roll är **upplösning per sträcka**, inte mer väta — aldrig mätt som det. Per sträcka är radarn i dag kandidatens fuktvillkor, `rate_mean_mmh` ≥ 0,5 mm/h som arbetstal (#565, #568) |
| **Fysiken som givarvakt** | fångar 10,4 % av det vakterna tar, krav minst hälften (#493) | tar vakterna i vinterluft också verkligt kalla ytor? En hypotes, ingen egen läsning (#494) |
| **Kallkartan (MODIS) som rättelse på RÅ** | alla tre rättelserna sämre än RÅ, totalt 7,63–9,76 mot 7,26 % grova fel; lagd åt sidan (#496, #497) | stationernas särart är mikroskala (#471 L8); idén lever i kandidatens terrängsärdrag och kort #321 (#675) |
| **Sikten som egen fara** | W-A B2 föll 8/10: kvoten 0,37 mot kravet ≥ 1,5 på 14 höstdygn (#491) | **struken 24/10**: W-A-serien på vintern 2024/25 med Trafikverkets olyckor föll på W-A3 (kvot 0,76) och riktningen på dagtid (0,85) (#675, #705) |

**En av dem har en mätbar fråga som inte kräver vinter:** radarns segmentupplösning, mot befintligt arkiv. Höjden som
varianspredikator ställs inte längre: delen är stängd (#657).

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
| **#94 försäkringsspåret** (stängt 22/9, #312: samarbetena stängda, NTF i Skyltfondsrundan) | försäkringssamarbetet klarlagt otillgängligt | Tvingade fram att facitstacken definierades ur **vår egen** data. Det är skälet att #98 kan dömas i vinter i stället för nästa | villkor |
| **#42 vattenplaningen** (stängt 21/10, #657) | båda spåren fallna: V-A (#69, #104) och V-B 19/10, falsklarm 81 ± 5 % mot ≤ 20 % (#648) | Utlösaren 2,0 mm/h och bekräftelsekurvan på `rate_mean` står (#568). Skuggan loggar vattenplaning vidare med flit, så frågan kan öppnas igen om ny data visar något (#657, #662) | mätt faktum |
| **#96 höjdprovet** (stängt 20/10, #650; delen stängd 21/10, #657) | höjden avgjordes i #547: den är ett särdrag i kandidaten | Lapsen 0,63 °/100 m på hösten och 0,18 på vintern (#467), och RÅ+HÖJD sämre än RÅ (#481). Premissläsningen 24/11 står under RÅ (#435) | mätt faktum |
| **#91 kallplatslagret** (stängt 25/9, #355; struket ur vårlistans Ä6 22/10, #675) | stationernas särart förklaras nästan inte av grova kovariater, R² 0,01 (#471); kallkartan sämre än RÅ (#496, #497) | Idén lever i kandidatens terrängsärdrag, i terrängen i fysikens energibalans och i kort #321 (#675) | mätt faktum |
| **#271 termisk kartering** (stängt 22/10, #678; Axel 6/10: *"görs inte"*, #481) | ingen utrustning köps och ingen karteringsnatt planeras | **Gränsen för facit mellan stationerna:** ingen mätning av vägytans temperatur mellan stationerna; kandidatens grind B döms mot sträckornas facit (förregistreringen §4), och kort #321 prövas mot satellitens kallkarta utan mätbilen | gräns |

### 10.2 Strukna parametrar och regler

| Vad | Varför | Vad som överlever | Slag |
| :-- | :-- | :-- | :-- |
| **RH-guarden** (#89 §4.3) | fuktigheten STIGER efter regn: 90 % vid +1 h → 95 % vid +4 h | Själva mätningen är ett positivt faktum om efterregnstillståndet — **förutsättningen för kondensation och rimfrost** (#46) | mätt faktum |
| **Operatörens "Våt"** (#89 §2.1) | 33 rader, noll med efterföljande klassning | Struken som indata till skattaren, inte som källa: i dag **facit** och, för kandidaten, ett av regelns fuktvillkor (#562, #573); kandidatens dom redovisas därför också utan väglaget som facit (förregistreringen §4b punkt 5) | mätt faktum |
| **Oljefilmen, #89 (b)** | 55 torrperioder, 6 olyckor mot grindens 15 — inte nåbar i höst | Torrdygnsräknaren finns kvar som beräkning — men **#42 använde den inte**: sedan #155 var vattenplaningens utlösare radarintensitet ≥ 2,0 mm/h, inte vattenfilmålder, och #42 är stängd (#657) | mätt faktum |
| **Ord-per-resa** (DECISIONS #103 — inte kort #103, frysklassningen) | fel valuta | **Röst räknas i EPISODER, aldrig i rader.** Det är enheten allvarsskalan måste använda | villkor |
| **R3 hård åldersgräns** (vägens ålder) | avvisad FÖRE mätning | Principen *"ålder ≠ inaktualitet — en klassning står tills den ändras"* ärvs rakt av tillståndsskattaren | villkor |
| **E3 högre prioritet** (#95 d) | skulle tysta en olycka | **Bindande villkor på #153:** kombinationen får ändra ordval och försprång — **aldrig prioritet**. I fogarnas språk: #153 får röra `alertText()`, aldrig `PRIORITY` | villkor |
| **`rate_max`** (#134) | 727,54 mm/h, spärrat av värdevakten | **Kvoten max/mean** är en formsignal: konvektiv skur mot frontregn — precis vad #45 behöver. **Men fältet är spärrat** tills spannet 0–200 rensats (#155) — kvoten kan inte räknas förrän dess | mätt faktum, spärrat |
| **K1, byvindkvot per rad** (#164) | 335 av 748 stationer | Kvoten per rad detekterar ett **känt formatfaktum** (byvind = bakåtfönstrets max, medelvind = ögonblicksvärde), inte en trasig station. En läxa, inte ett verktyg | läxa |
| **Per fordonstyp** (vind/sikt §2.1) | #92 stängt | Samma gräns som #92 | gräns |
| **Regel T:s lås** (#220: *"aldrig mjukas upp, oavsett signaturer"*) | hävt 15/10 av Bengt och Axel (#563) | T1–T6 står som huvudregel och ändras bara genom en daterad post med båda signaturerna, aldrig som en lättnad efter sett utfall. Kandidaten har ett undantag till domen i mars, för ytan och inget annat (§7.2) | villkor |
| **Steg D, slaget `aquaplaning`** (#42) | struket 21/10, båda spåren fallna (#657) | §7.8:s enda prövade nya slag föll på mätningen; kriteriet för ett nytt slag står | villkor |
| **Verify 2** (SMHI:s lufttemperatur som reserv för vägytan) och **SMHI som reserv** i vårlistans Ä6 | strukna 22/10 (#675) | Luften som vägyta ger fel på mer än 2 °C ungefär var tredje timme (Axels mätning, 33,5 %); reserven är RÅ och kandidaten | mätt faktum |
| **Prognoslagrets val (c), (e) och (h)** (kort #270) | strukna 21/10 (#657) | (h) molnet köper 0,3 procentenheter (#471); (e) ÅDT kom ur öppna API:et och är ett särdrag i kandidaten (#472) | mätt faktum |
| **Val (d) på kort #270** | ersatt 21/10 av domen per band (#655) | Samma krav räknade inom varje ankarband, inifrån; ett band under underlagsspärren är obedömt, aldrig godkänt (förregistreringen §4b punkt 3) | villkor |
| **Kriging** | nedlagd 13/10 (#548) | Grannarnas fel i kandidaten är redan en interpolation av felen mellan stationerna; NIVÅ 2+BLANDNING 5,02 % mot RÅ 7,51 % grova fel (#517, #548) | mätt faktum |

### 10.3 Kärnor som flyttats — och vart

| Från | Till | Vad som flyttade |
| :-- | :-- | :-- |
| #95 breda SMHI-regeln | **#89 §2.3 `N_varning`** | SMHI vet **tiden före händelsen** (varningar publiceras i förväg). Utlösaren förblir stationens eget regn; varningen förlänger bara N |
| #100 dämpningen | **#153** | TOTALEN när många OLIKA faror kvalificerar samtidigt |
| #93 halva kortet | **#95 (d) förstärkaren** | snöfallsvarning + yta nära noll = högre konfidens |
| #89 (c) interaktionerna | **#46** (lager 1, dimma som konfidens) och **#90** (lager 2, sidvind × halka) | dimma × frysrisk är en ORSAK; sidvind ändrar faran givet en yta |
| #88 T-B:s facit | **egen facitstack** | kamerafacit, väglagsarkivet, situation_archive |
| #88 T-B, trendens skuggprov | **efterhalkan** (S3) | trendens värden prövas inom efterhalkan; T-B och trendens egen röst vilar till 2027/28 (#675) |
| #81 C, radarns väta i motorn | **kandidatens regel i databasen** | radarn är kandidatens fuktvillkor per sträcka (#562, #565); motorn läser inte `regn` (#654) |
| #96 höjden och #91 kallplatserna | **kandidatens särdrag** | höjd och terräng är särdrag i kandidatens rättelse (#547, #553); kallplatsidén lever där och i kort #321 (#675) |
| Segmentprognosen RÅ som det som talar | **kandidaten NIVÅ 2+BLANDNING** | RÅ är kontroll och reserv (#547, #657); kandidaten publiceras och talar (§4.4) |

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
   men behövdes inte av #42 (#155), som är stängd (#657). K1:s radkvot är en läxa om fönsterglapp, inte ett verktyg.

---

## 11. Vad som förblir osynligt oavsett allt ovan

**Om saltbilen passerat** (ingen öppen källa) hör till kartans kant. **Snöbyn mellan stationerna** gör det
inte längre: radarn finns per sträcka i arkivet (`radar_precip`; kort #43 stängt med bevis 22/9, #303), och radarns roll som
*upplösning per sträcka* är en mätbar fråga mot befintligt arkiv (§9.1) — omätt, inte osynlig.

---

## 12. Den ärliga sammanfattningen

Delarna **är** byggda så att de kan integrera: de faller i fem lager utan att någon behöver skrivas
om, och varje del producerar en mätt storhet i stället för en dom — vilket är förutsättningen för att
de ska kunna vägas ihop senare. Räckvidden är mätt och duger på hösten, på vintern bara med spridningsgrinden (§6.1, #477; **R31, 7/10**), tillståndet och utvecklingen är
byggda och sparade, och registret visar att även det underkända lämnat användbara beräkningar efter
sig (§10.4). Två länkar talar i motorn som märkt beta: efterhalkan S3 och kandidaten (§4.1, §4.4).

**Och fogen mot motorn var smalare än jag trodde innan jag läste den, och två byggen har visat det.** S3 kom in
additivt — fält som redan publicerades, en gren i villkoret — och rubbade ingen av 37 vektorer. Kandidaten fick en egen nyckel och
ett eget slag sist i stegen och rubbade ingen av 41 (§5.6). Radarn når rösten genom kandidatens regel på servern, och SMHI når
favoritrapporten men inte motorn (#654). Skuggmotorn är bokstavligen motorn, så varje länk kan mätas på riktig trafik innan den
når en telefon. Det som återstår är alltså inte ett brobygge — det är domarna, och disciplinen i §5.3 och §5.5.

**Och det som allt ska dömas mot är fortfarande tunt — men inte längre tomt eller obevakat.** Kamerafacit: 988 bilder
i hinken 26/9 (R26), tabellen `kamerafacit`, 41 provbilder klassade blint (#329/#333/#380), läsning i mars (#248, #335) med
ett spår för blind klassning och Axels ok (kort #246); bygget av bildläsningen beslutas före 1/2 (#660).
`road_condition_history` rör sig: kodgrinden 20/10 fann 1 929 rader med kod 2, varav 485 *fläckvis Is*, och 624 omklassningar
till halka på sju dygn (STATUS 20/10), och omklassningarna bär januaridomen (#660).
`situation_archive` är mätt (3 122 olyckor på 30 dygn, #189) men bär ingen orsak. Förarfacit: ~~0 riktiga svar 28/9 (#390)~~ — **R32 (7/10):** förarsvaren fanns (#460); 32 riktiga svar 6/10, alla projektgruppens, inget om halka. Mätvakten
(S7) mäter att facitkällorna växer, och alla läses genom en delad händelselista (`publish/skuggfacit.ts`, #327/#330).
Axels tröskelregel har vittnen på väg, inte i hand (§13.2).

**Tre saker stod i vägen, och alla tre är nu avgjorda som beslut:** allvar uttrycks som försprång (§7.1, #221), en
modellerad storhet utlöser inte ensam — regel T (§7.2, #220), med kandidatens undantag till domen i mars (#563) — och
kombinationen har en egen grind och en regel för gemensam kalibrering (§7.3–7.4, TROSKLAR-KOMBINATIONEN, #217–#228).
Försprånget är byggt i skuggan (#359, #674) och kombinationen kalibrerad i kuvösen 6/10 (#468); kvar är domarna.

**Skillnaden mellan det vi har och produkten Bengt beskriver sitter alltså i L4:s knapp och i L5** (**R33, 7/10:** knappen finns nu — ankarspridningen, #474–#478) —
och L5 är billigare än kartan först påstod: som **försprång** kostar den F4 (§13.1). L4 talar sedan 16–17/10 som märkt beta genom
kandidaten, med spridningsgrinden i regeln, och döms i mars (§4.4). Att kartan mätte det byggda mot ett löfte ingen gett är
Axels kritik, och den ger jag (§13.3).

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
| Ytstatus / operatörens "Våt" | **33 rader, noll med efterföljande klassning** — skälet den ströks (§10.2) · 8/10: *Våt* median 9,6 h i väglagsarkivet (#491); i dag ett av kandidatens fuktvillkor (#562) |
| Kameran visar torr asfalt | **kamerafacit: 0 objekt efter 5 657 skuggkörningar** (kort #157) — **R34 (7/10):** objekt sedan 15/9 (#189), 988 bilder 26/9; ytstatusen ur stationerna i arkivet sedan 6/10 (#465) |

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
för den här vintern. *Läget 22/10: L4 når föraren redan i vinter, som kandidatens betavarning (#556, #563, §4.4); domen i mars
avgör om den får stanna.*

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
villkoret → tre portar.** *Byggt så: S3, 11/10 (#524), med v11 tyst; godkänd av Bengt i Axels ställe (#526) och till Kompisarna
först, inte publikt i bygge (32) (#676).*

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
| Grind A | **KLARAD 23/9** (#321) · vintern 2024/25 A2 5,5 %, ingen dom (#467, #469) |
| #157 är bärande för vinterleveransen | **följer av 13.2** · #157 löst och stängt 20/9 (#250) |
| Om #153 **ska** omformuleras till försprång | **avgjort 16/9** (#221) |
| Om tröskelregeln ska skrivas om till Axels lydelse | **avgjort 16/9** (#220), tätad · låset hävt 15/10, med kandidatens undantag till domen i mars (#563) |
| Om E byggs före vintern | ✅ **byggd 24/9** (#341) |
| Om försprånget kläms av appens reglage | **avgjort 26/9** (#419): nej — motorns 3 000 m; reglaget tar bara grundvarningen |
| Provet av helheten (§7.3: *varje grind dömer sin del ensam*) | **kuvösen** (kort #232): klockan och inventeringen byggda 1/10, Trafikverkets vinterdata 2024/25 mottagen 2/10 (5,5 miljoner rader, 777 stationer, lokaltid mätt, #438; inläst 2/10 kväll med nederbördskoderna 1/2/4/6 ur VädErs 2019 — 5,39 miljoner rader, 754 stationer; 3/9, mängden och vinden översatta ur dokumentationen 6/10, #464; SMHI för samma vinter hämtat, radarn som tif ≈ 3,4 dBZ över h5, #441), riktningsprovet kört 6/10 (#467), granskat (#469, #470); rösten i två serier — de 20 skuggrutterna och hela väglagsnätet (#426) · **8/10:** eget block i projektkartan (#489); FYSIK körd — kuvösen räknar en kandidat utanför repot som replikan (#485); Trafikverkets svar: de 23 stationerna utanför förklarade, ytstatusen sparas inte historiskt, väglag, vinterväghållning och händelser kräver ett nytt ärende (KUVOS-LEVERANSEN §5e) · **9/10:** kallkartan prövad och lagd åt sidan (#496, #497) · **11–14/10:** nivå 2 på MET Nordic (#509), nivå 2 med grannarna och blandningen 5,02 % (#517), prognosläget +6 h 5,24 % (#519), väg B ärliga 4,84 och 5,12 % (#544), den frysta kandidaten varv 1 i hinken (#550, #552); Trafikverkets svar 13/10: åtgärderna per sträcka och tid finns inte i något rimligt format (KUVOS-LEVERANSEN §5g); vägpunkternas fasta särdrag (#553) · **15–22/10:** facitläsningen mot Trafikverkets väglag 2024/25: efterhalkan bekräftad i 4,2 % av fyrningarna mot basnivån 37,9 %, lyft 0,11 — en diagnos, ingen dom (#602, #607); olyckorna 2024/25 som facit, förregistrerade före läsningen (#665, #669); fler vintrar ur VViS, och identitetsprovet på 2024/25 klarat (#666–#673) |
| När kombinationen kalibreras | **ändrat 1/10** (#425): i kuvösen på vintern 2024/25, inte 1/2 2027 — årets vinter blir bara domdata · ✅ **gjord 6/10** (#468): 32 räknebara punkter, ingen under taket 25 %, startvärdena frysta |
| Om vinterns röstleverans begränsas till Axels "en sak" | ~~öppet — jag rekommenderar ja~~ · **8/10:** T-A:s tröskel skriven (#492); steg 0c har 42 regnstopp med frost inom 4 h; Ö-B saknar instrument (#491) och läses på senare frost (#658) · **avgjort 14–16/10:** nej — kandidaten blev en egen betavarning bredvid S3 (#556, #562, #577); S3 är byggd (#524) och går till Kompisarna först (#676) |

---

## 14. Rättelsehistorik

Brödtexten ovan säger vad som gäller i dag. Det här är vad som ändrats sedan kartan skrevs, så att
ingen läser en överspelad version någon annanstans.

| Datum | Vad | Var beslutet står |
| :-- | :-- | :-- |
| 22/10 | **Frysregeln hävd och kartan rättad mot main** (Bengt: *"öppna den och uppdatera med kandidatens väg rätt allt och strunta i att frysa den"*, åtgärdslistan B4-60). Kandidatens väg in i nya §4.4: egen nyckel, eget slag sist i prioriteten, BETA, spärrarna och domen i mars · §1 och §3 minnet ur lägesfilen och S3 · §2 lägesraderna · §4 sex farslag med S3, talen och ledningen · §5.2 `regn_h` och `lutning30` läses av motorn sedan S3 (#524), de olästa fälten gäller inte (#654) · §5.1 och §5.6 vektortalen 22/10 och två körda länkar · §5.4 och §5.5 fogarna som de byggdes · §6.1 läget 22/10 · §7.1 försprånget i skuggan, §7.2 regel T (#563), §7.6 `trend_stigande`, §7.8 rimfrostens gren obyggd, #42 fallen · §8 · §9.1 tre nej till och *Våt* mätt · §10 #42, #94, #96, #91 och #271 stängda, Verify 2, Ä6 och regel T:s lås · §11 #43 · §12 · statusuppgifter i §13. Bedömningens frågor (B2)–(B5) är rättade; (B1) väntar på en egen läsning | DECISIONS #678 |
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
| 7/10 | **Läge-raderna efter kuvösens utfall och spridningsgrinden:** L4-raden (§2), §6.1, §8 B och §13.6 (grind A på vintern, riktningsprovet, kalibreringen) — ingen innehållsändring | DECISIONS #464, #467–#478 |
| 7/10 | **Kartan öppnad för R27–R34 — efter kuvösens läsningar 6–7/10 — och fryst igen.** R27 segmentprognosens fog (§5.4) · R28 lapsen i #45:s metod (§7.7) · R29 molnet som räckviddsknapp (§9.1) · R30 höjden (§9.1) · R31 räckvidden (§12) · R32 förarfacit (§12) · R33 L4:s knapp (§12) · R34 kamerafacit och ytstatus (§13.2) | DECISIONS #483 |
| 9/10 | **Läge-raderna efter frosten, FYSIK och kallkartan:** L3 och L4 (§2), §6.1 och §13.6 (provet av helheten, Axels "en sak") — inget innehåll ändrat; fem innehållsfrågor (Ö-A1:s 76 % mot 18 % på frosten, operatörens *Våt*, väglagsarkivet, tre nej i §9.1, rimfrostens gren i §5.4) står i bedömningens §4.2 | DECISIONS #467, #485, #489–#492, #496, #497 |
| 14/10 | **Läge-raderna efter nivå 2, prognosläget och väg B:** L4-raden (§2), §6.1 och §13.6 (provet av helheten) — ingen innehållsändring | DECISIONS #509, #516–#519, #544, #547–#553 |
| 15/10 | **Läge-raden §13.6 efter beslutet att gå live:** kandidaten i appen före domen, körplatsen och pariteten — ingen innehållsändring | DECISIONS #556–#561 |

<!-- ÖPPNA KORT: genereras av scripts/kortkartan.ts ur TAVLA.md och docs/kortkartan.json, ändra inte för hand -->
## Öppna kort

Korten på tavlan som rör den här sidan, ordnade efter sidans avsnitt: 4 kort. Ägaren står efter strecket. Listan skrivs av `scripts/kortkartan.ts` ur `TAVLA.md` och `docs/kortkartan.json`.

**§5 Fogarna — var en skuggdel kan greppa, och vad den kostar**

- #303 VÄGDATALAGRET, STEG 3 — KUVÖSENS INLÄSNING OCH AXELS KOLUMNER — Bengt
- #88 TRENDEN — vi mäter var minut men använder bara sista värdet — Claude, låst

**§6 Var lagren står, mätt**

- #270 PROGNOSLAGRET EFTER PREMISSMÄTNINGARNA — BENGTS VAL a–h — Bengt
- #38b Stråket / skuggmotorn — ÅTERSTÄLLT 10/9 — Claude, låst

<!-- /ÖPPNA KORT -->
