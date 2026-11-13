# TROSKLAR-OLYCKSFACIT

**Kort:** #376 OLYCKSFACIT — vilka olyckor hör ihop med halka? **Status:** ✅ **FASTSTÄLLT 2026-11-06 av Bengt och Axel** (DECISIONS #798;
skrivet i #797). Texten som signerades är filen på main 947d180f, sha256 `e2558045706e48ce525e03dc74a33a609750b05110738ac0ddf98b9b8323a3e3`.

Reglerna i §4 är skrivna innan någon olycka har klassats, och ingen av dem kommer ur ett utfall. Efterkontrollen (`sql/085`) migreras
först när dokumentet är signerat.

**§9 (steg 4: bedömningen per olycka, veckan och säsongen) tillades 6/11, före den första klassningen, och FASTSTÄLLDES samma dag av
Bengt och Axel** (DECISIONS #802, #803), med valen i §9.8 som rekommenderat. §1–§8 gäller som de signerades.

**§10 (klassningen efter sex timmar) tillades och FASTSTÄLLDES 11/11 av Bengt och Axel** (DECISIONS #841, #842). Det ändrar §2, §3, §5 och
§9.5; varje ändrat stycke säger det och bär den gamla lydelsen. Klasserna i §4 och allt annat gäller som förut.

**§11 (det nya upplägget: olycksarten, fönstret fram till starten, kollisionerna, småvägsröstens lager, förifyllda åtgärder, läsningen i
veckans ärende och nämnaren) tillades 13/11** (DECISIONS #852). Det ändrar §3, §4, §5, §9.1, §9.2 och §9.5, och varje ändrat stycke säger
det och bär den gamla lydelsen. **Bengt har signerat; Axels signatur väntar (§11.6).**

**Varifrån det kommer.** Bengt 6/11: *"Analys av olyckor är ett av de mest effektiva metoderna för att se om varningssystemen fungerar.
Olyckan fungerar som facit."*
- Steg 1 (DECISIONS #796) fryser vad varje varningslager sa när olyckan började.
- Steg 2 är det här dokumentet. Det avgör vilka tysta olyckor som hör ihop med halka och därför ska ha en åtgärd.

**Husreglerna som gäller:**
- tröskeldokument före kod;
- tystnad är en funktion;
- trösklarna är daterade före mätningen och skrivs inte om när talen har kommit (§7);
- inget fält bär en tröskel förrän det har passerat värdevakten.

---

## 1. Vad klassningen är, och vad den inte är

- **Olyckan är facit för varningssystemen, inte för vägen** (DECISIONS #247). Att en olycka hände visar inte att det var halt.
- **Klassningen avgör bara två saker:** vilka tysta olyckor som ska ha en åtgärd i dagens ärende (§5), och vad som räknas i veckans sammanställning (steg 4).
- **Den dömer ingen grind och ändrar ingen tröskel** i appen eller i kandidaten.
- **En tyst olycka som är TYDLIG eller TROLIG är ett skäl att läsa, inte ett bevis** på att appen hade fel.

## 2. Populationen

- Populationen är varje olycka av typen `Accident` i `situation_archive` som `olycksfacit_fanga()` (sql/084, sql/085) har fångat, med start från 6/11 2026.
- **Dubbletter** är en tidigare rad inom 300 m och 30 minuter. De klassas, men ärendet räknar dem inte.
- **En olycka klassas en gång**, när den är minst sex timmar gammal och händelsen inte har setts i flödet den senaste timmen, och klassen
  ändras aldrig efteråt. (Ändrat 11/11, §10. Förut: *när den är minst 24 timmar gammal*.)

## 3. Måtten: vad efterkontrollen läser

| Fält | Källa | Fönster |
| :-- | :-- | :-- |
| `text_efter` | `situation_archive.message` vid kontrollen. Klassningen läser den tillsammans med texten vid fångsten | vid kontrollen: minst sex timmar efter starten, när händelsen har lämnat flödet (§2). (Ändrat 11/11, §10. Förut: *ett dygn efter starten*.) |
| `yta_min`, `dagg_min` | den **närmaste vaktade stationen inom 15 km**: dess lägsta yta och daggpunkt | 2 timmar före till starten. (Ändrat 13/11, §11, D1. Förut: *2 timmar före till 2 timmar efter starten*.) |
| `fukt_efter` | samma station: regn, snö, eller nederbörd som inte är `no`/`Dry` (snapshotkärnans fukt) | samma |
| `rimfrost_efter` | samma station: yta ≤ 0 °C och under daggpunkten | samma |
| `halka_efter` | A1:s sträcka (inom 100 m vid fångsten): satte Trafikverket kod ≥ 2 eller ett halkord? **Bokförs, klassar inte** | 6 timmar efter starten |

**Vakterna är driftens**, som snapshoten och grind A har dem:
- #75: ytan högst 12 °C under luften;
- radvakten: vid luft ≥ 10 °C högst 8 °C gap;
- karantänen: tre brott mot #75 under de sju dygnen före starten;
- den långsamma vakten: `givarfel_dygn`, senaste ögonblick i felet inom tre timmar före starten.

Kontraktsgrinden vaktar talen. Fälten `surface_temp_c`, `air_temp_c` och `dewpoint_c` har spann i `scripts/vardevakten.ts`, och
`precipitation` läses som ordlista, aldrig som sanningsvärde.

## 4. Klasserna, i ordning

Den första regeln som stämmer gäller. "Texten" är texten vid fångsten och texten efteråt tillsammans, läst utan hänsyn till stora
och små bokstäver. Ett ord räknas bara som eget ord, inte inuti ett annat.

| # | Klass | Regel |
| :-- | :-- | :-- |
| 1 | **INTE** (vilt) | Texten nämner vilt, älg, rådjur, hjort, vildsvin, ren eller djur |
| 2 | **TYDLIG** | Texten har ett halkord (*hal, halt, halk…, is, isen, isig…, ishalk…, sladd…, glashal…, blixthalk…*) **och** `yta_min` ≤ +1 °C |
| 3 | **TROLIG** | Olycksarten är *ett fordon* eller *flera fordon* (§11.2) **och** `yta_min` ≤ 0 °C **och** fukt eller rimfrost. Skälet för *flera fordon* är *kollision*. (Ändrat 13/11, §11, D3 och D2. Förut: *Texten säger singel…*.) |
| 4 | **INTE** (varmt) | `yta_min` > +3 °C |
| 5 | **OKLAR** | Allt annat, också när ingen vaktad station finns inom 15 km |

Utan station är ytan okänd. Då kan bara regel 1 och regel 5 ge en klass. Reglerna står ordagrant i `sql/085_olycksfacit_klassning.sql`
(`olycksfacit_efterkontroll`), och integrationsprovet #797 prövar varje regel och varje vakt med en fälla. Sedan 13/11 står de i
`sql/110_olycksfacit_upplagg.sql`, med olycksarten i `olycksart()`; integrationsproven #852 prövar ändringarna med ett motprov var.

## 5. Vad som följer

- **Dagens ärende** med etiketten `olycka` (steg 3, funktionen `olycksfacit`, varje morgon 05:17 UTC) skrivs för det svenska dygnet i går.
  (Ändrat 11/11, §10. Förut: *i förrgår*.)
  - Det bär en tabell per klass och utfall, och orsakerna till tystnaden.
  - Under *Att åtgärda* listar det varje olycka som är TYDLIG eller TROLIG och där appen teg (täckt eller otäckt), utom kollisionerna
    (§11, D2).
  - Ärendet är publikt och bär bara väg, tid, läge, koder och antal, aldrig kandidatens tal.
- **Stängningsregeln:** dagens ärende stängs av funktionen. En rad som passar ett känt mönster (§11.3) har en förifylld åtgärd, och de övriga
  läses i veckans ärende, som stängs först när varje rad har en åtgärd: ett kort på tavlan eller *ingen åtgärd* med skälet. (Ändrat 13/11,
  §11, A och B. Förut: *ärendet stängs först när varje rad under Att åtgärda har en åtgärd … Ett dygn utan sådana olyckor får ett ärende som
  stängs direkt.*)
  - Ett öppet ärende påminns var sjunde dygn.
  - Öppna `olycka`-ärenden tas upp med Bengt först i varje session, som `frist` och `dom` (CLAUDE.md).
- **Veckans sammanställning** (steg 4) gör återkommande orsaker till kort och frågor. Reglerna står i §9 (tillagt 6/11).

## 6. Valen

Claude rekommenderar. Bengt och Axel väljer, och valen förs in här före signeringen.

**Sett före skrivningen:** handanalysen av morgonens olyckor 6/11 (`Desktop/Olyckorna_2026-11-06`) och den första fångsten 6/11
07:45 UTC (23 olyckor). **Ingen olycka är klassad.**

| # | Val | Claudes rekommendation | Alternativet | Valt |
| :-- | :-- | :-- | :-- | :-- |
| 1 | *Hindersfri* som INTE (förslaget §2 B) | **Stryks.** Trafikverket skriver över texten med *"Vägen är hindersfri"* när vägen är röjd. Väg 700 vid Kinnared 6/11 bar redan den texten vid fångsten, tre timmar efter olyckan. Regeln hade gjort de flesta olyckor till INTE | Behåll den | Som rekommenderat |
| 2 | Stationens räckvidd | **15 km.** Kisa och E4 vid Linköping 6/11 hade ingen station inom 5 km | 5 km, A2:s räckvidd (DECISIONS #245) | Som rekommenderat |
| 3 | Utan station inom 15 km | **OKLAR.** Texten ensam räcker inte för TYDLIG | TYDLIG på halkordet ensamt | Som rekommenderat |
| 4 | Radarn | **Bokförs i fångsten, klassar inte** | Radarregn räknas som nederbörd i TROLIG | Som rekommenderat |
| 5 | Väglaget efteråt | **Bokförs (`halka_efter`), klassar inte.** Trafikverkets klassning efter olyckan kan vara en följd av olyckan | Halka efteråt räcker för TYDLIG | Som rekommenderat |

## 7. Ordning och ändring

1. Dokumentet fastställs av **Bengt och Axel**. Båda signerar.
2. **Efter signeringen:**
   - funktionen `olycksfacit` deployas (deploy-supabase);
   - `sql/085` migreras med DB-knappen;
   - beviset är den första klassningen (`klass` på rader i `olycksfacit`) och det första ärendet med etiketten `olycka`.
3. **Fram till den första klassningen** får §4 och §6 ändras av Bengt eller Axel, med en rad i DECISIONS. Därefter gäller regel L.

**Ändring efter sett utfall: regel L** (införd 15/10 2026, TROSKLAR-KOMBINATIONEN §5b, DECISIONS #564).
- En lättnad efter att utfallet är sett prövas enligt L1–L4:
  - L1: domen på lästa data står;
  - L2: lättnaden gäller bara data som ingen har läst;
  - L3: en ändring som flyttar ett sett tal mot godkänt är en lättnad;
  - L4: skälet får inte vara utfallet.
- Lättnaden kräver båda signaturerna och en post med det sedda talet.
- Här betyder lättnad en regel som gör färre olyckor TYDLIG eller TROLIG, alltså färre rader att åtgärda.

**Undantag från all lättnad:** §1:s avgränsning (klassningen dömer ingen grind) och regel 1 (viltet). De får skärpas men aldrig mjukas upp.

## 8. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-06 | i chatten: *"när det gäller olyckorna så signerar axel och jag 1,2 och 3"*, på listan där steg 1 var signeringen med Claudes fem rekommendationer i §6 |
| Axel | 2026-11-06 | via Bengt i chatten, samma rad |

## 9. Steg 4: bedömningen per olycka, veckan och säsongen (tillagt 6/11 2026)

**Status:** ✅ **FASTSTÄLLT 2026-11-06 av Bengt och Axel** (DECISIONS #803). Texten som signerades är filen på grenen
`claude/olycksfacit-steg4` vid 62c58f4a, sha256 `4ad7dc7783ee25388a7d058dccb552e9ffd596019b2c56a52d38fe7f262c8c0f` med radsluten som LF. Skrivet före den första klassningen
(6/11 21:07 UTC): ingen olycka är klassad, och ingen regel här kommer ur ett utfall. Bengt 6/11: *"bygg steg 4"*, och *"en bedömning om halkvakt hade varnat vid olycka (för att
ev visa vid diskussion med försäkringsbolag o liknande i ett sälj) o alternativt varför halkvakt inte varnade och om det behövs någon
förbättring i systemet"*.

### 9.1 Vad *varnade* betyder

- Fångsten (`sql/084`, `sql/085`) fryser vad lagren sa **när olyckan började**:
  - A1: väglaget som gällde vid starten;
  - K: den timme kandidaten talade med vid starten. Det är domloggens senaste körning före starten, räknad och högst två timmar
    gammal, som regelns färskhet. Saknas sträckan i den timmen hade den ingen kall punkt (*yta över 0*). Var körningen tyst, eller
    är timmen äldre, är skälet *ingen timme*. (Ändrat 7/11, DECISIONS #814. Förut: *kandidatens senaste timme som var skriven före
    starten*, utan åldersgräns. Den regeln räknade in varningar som var släckta sedan flera timmar.)
    **Storstädernas punkter (B och C, DECISIONS #815; signerat av Bengt och Axel 7/11):** K omfattar också närmaste
    stadspunkt inom 2 km, när dess brytare var på vid timmen. Den läses ur stadsloggen med samma timregel. Med brytaren av gäller K som
    för vägpunkterna, och stadspunkten bokförs med *brytaren av*.
  - A2: stationernas värden timmen före starten.
  - Småvägsrösten (lagret `smavag`, §11.4): närmaste punkt i småvägsröstens punktfil inom 0,5 km och vad rösten hade sagt vid starten. Den
    räknas som en varning bara när brytaren för punktens grupp var på. Med brytarna av bokförs den, som skuggans facit. (Tillagt 13/11, §11, C.)
- **VARNADE** betyder att minst ett av appens lager hade en aktiv varning på platsen när olyckan började.
- Det säger inte att någon förare med appen var där, och inte att olyckan hade undvikits. Ingen förardata läses (förslaget §4).

### 9.2 Bedömningen per olycka

Varje klassad olycka utom dubbletterna får en bedömning. Den första raden som stämmer gäller.

| Bedömning | Villkor | Vad den betyder |
| :-- | :-- | :-- |
| **RÄTT VARNING** | VARNADE, och TYDLIG eller TROLIG | Halkvakt hade en varning på platsen när en olycka med koppling till halka började |
| **VARNING, HALKA INTE BEKRÄFTAD** | VARNADE, och OKLAR eller INTE | Bokförs. Ingen slutsats |
| **MISS** | Tyst (täckt eller otäckt), och TYDLIG eller TROLIG | Ska ha en åtgärd (§5) och får ett förbättringsområde (§9.3). En kollision (§11, D2) räknas som miss men får varken åtgärd eller område. (Ändrat 13/11.) |
| **OKLAR TYSTNAD** | Tyst, och OKLAR | Ingen slutsats |
| **RÄTT TYSTNAD** | Tyst, och INTE | Tystnaden är en funktion |

### 9.3 Förbättringsområdet för en miss

Området läses ur fångstens orsaker. Den första raden som stämmer gäller.

| # | Område | Villkor |
| :-- | :-- | :-- |
| 1 | **Täckningen** | Otäckt, eller *K: ingen vägpunkt* |
| 2 | **Spridningsspärren** | *K: spridningsspärren* |
| 3 | **Vetot** | *K: veto* |
| 4 | **Ytan i modellen** | *K: yta över 0* |
| 5 | **Rimfrosten** | *K: fukt saknades*, och rimfrost vid stationen |
| 6 | **Fukten syntes inte** | *K: fukt saknades* |
| 7 | **Kandidatens drift** | *K: ingen timme* eller *K: inget värde* |
| 8 | **Övrigt** | Allt annat. En människa läser fallet |

- K står i villkoren eftersom kandidaten är det lager Halkvakt själv bygger.
- A1:s och A2:s orsaker följer med i raden, men de styr inte området.

### 9.4 Dagens ärende

Två tillägg i ärendet från §5:
- Varje rad under *Att åtgärda* bär missens förbättringsområde.
- En lista *Rätt varning* tar upp varje RÄTT VARNING med tid, väg, läge, klass och lagren som varnade.

### 9.5 Veckans ärende

- **Rubriken** är *Olycksfacit vecka ÅÅÅÅ-Vnn*. Veckan är ISO-veckan, måndag till söndag i svensk tid, och etiketten är `olycka`.
- **Det skrivs** av samma funktion och samma jobb som dagens ärende (05:17 UTC). Det görs den första morgonen då veckans söndag ligger minst ett dygn bort och alla veckans olyckor är kontrollerade, normalt på måndagen. (Ändrat 11/11, §10. Förut: *minst två dygn bort … normalt på tisdagen*.)
- **Den första veckan** är 2026-V45, från 6/11.
- **Ärendet bär:**
  1. bedömningarna i §9.2, med antal;
  2. vid de halkkopplade olyckorna (TYDLIG och TROLIG): hur många gånger A1, K och A2 varnade;
  3. missarna per förbättringsområde;
  4. veckans RÄTT VARNING fall för fall: tid, väg, läge, klass och lager;
  5. säsongen sedan 6/11: halkkopplade olyckor, RÄTT VARNING i antal och andel, och missarna per område;
  6. nämnaren: per klass hur ofta Halkvakt varnade, med INTE delad på viltet och ytan över +3 °C och TROLIG på ett fordon och kollision
     (tillagt 13/11, §11, E);
  7. veckans missar utan förifylld åtgärd, en rad var att åtgärda (tillagt 13/11, §11, B).
- **Förslagen.** Ett område med minst **två** missar under veckan är återkommande. Det står som en rad att åtgärda, med ett kort på tavlan, en fråga i bedömningens §4.2 eller *ingen åtgärd* med skälet.
- **Stängning.** Ärendet stängs när varje rad har sin åtgärd. Utan ett återkommande område och utan en miss att läsa stängs det direkt. Ett öppet ärende påminns var sjunde dygn, som dagens. (Ändrat 13/11, §11. Förut: *Utan ett återkommande område stängs det direkt*.)
- **Publikt.** Som i §5 bär ärendet bara väg, tid, läge, koder och antal.

### 9.6 Säljregeln: vad som får sägas utåt

- **Bara RÄTT VARNING** får anföras som att Halkvakt varnade, med orden *"Halkvakt hade en aktiv varning på platsen när olyckan
  började"*. Lagret skrivs ut: Trafikverkets väglag (A1), stationerna (A2) eller kandidatens betavarning (K).
- **Aldrig** att en förare varnades eller att en olycka hade undvikits.
- **Aldrig ett enskilt fall utan säsongens andel bredvid**: RÄTT VARNING av de halkkopplade olyckorna.
- Missarna redovisas lika öppet, eftersom ärendena är publika.

### 9.7 Säsongsfacit för vinterläsningarna

- Förslagets säsongsfacit är andelen missar vägd på olyckor per variant: spridningsspärren, daggpunktsvägen och P1.
- Det byggs inte nu. Varje variant måste räknas om per olycka, och den räkningen skrivs som ett eget tillägg före marsdomen.
- Veckans säsongstal (§9.5 punkt 5) är grunden.

### 9.8 Valen

Claude rekommenderar. Bengt och Axel väljer, och valen förs in här före signeringen.

| # | Val | Claudes rekommendation | Alternativet | Valt |
| :-- | :-- | :-- | :-- | :-- |
| 6 | När ett område är återkommande | **Två missar samma vecka.** Varje miss har redan en åtgärd i dagens ärende, så veckan söker mönster, och två är det minsta mönstret | Tre i veckan, eller räknat över säsongen | Som rekommenderat |
| 7 | Säljregelns ord | **Som §9.6**: *"aktiv varning på platsen när olyckan började"*, med lagret och säsongens andel | Kortare: *"Halkvakt varnade"* | Som rekommenderat |
| 8 | Trafikverkets olyckstext i ärendena | **Nej.** Ärendet bär bara koder (§5). Texten hämtas ur databasen när ett fall ska visas utåt | Ja, för RÄTT VARNING | Som rekommenderat |
| 9 | Säsongsfacit per variant (§9.7) | **Inför marsdomen**, som eget tillägg | Nu | Som rekommenderat |

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-06 | i chatten: *"Vi signerar"*, på frågan om §9 med valen 6–9 som rekommenderat |
| Axel | 2026-11-06 | via Bengt i chatten, samma rad |
| Bengt | 2026-11-07 | §9.1, K-lagrets timme (DECISIONS #814): i chatten *"Ja, vi signerar"*, på frågan om ändringen till två timmar med omräkning bakåt |
| Axel | 2026-11-07 | via Bengt i chatten, samma rad |
| Bengt | 2026-11-07 | §9.1, storstädernas punkter i K-lagret (DECISIONS #815): i chatten *"ja till alla fem. Axel och jag signerar"* |
| Axel | 2026-11-07 | via Bengt i chatten, samma rad |

## 10. Tillägg 11/11 2026: klassningen efter sex timmar (DECISIONS #841, #842)

**Status:** ✅ **FASTSTÄLLT 2026-11-11 av Bengt och Axel.** Förslaget är `docs/FORSLAG-OLYCKSFACIT-DRIFTLARM-2026-11-08.md` §6. Bengt 8/11:
*"Jag vill gärna att vi inte ligger 24 timmar efter med olycksfacit"*.

### 10.1 Vad som ändras

| § | Förut | Nu |
| :-- | :-- | :-- |
| 2 | En olycka klassas när den är minst 24 timmar gammal | när den är minst sex timmar gammal **och** händelsen inte har setts i flödet den senaste timmen |
| 3 | `text_efter`: ett dygn efter starten | vid kontrollen, alltså enligt §2 |
| 5 | Dagens ärende gäller dygnet i förrgår | dygnet i går |
| 9.5 | Veckans ärende när söndagen ligger minst två dygn bort, normalt på tisdagen | minst ett dygn bort, normalt på måndagen |

- **Flödet** läses ur arkivet: den senaste timmen räknas bakåt från den händelse som `situation_archive` såg senast, inte från klockan. Står
  inläsningen still väntar kontrollen, i stället för att läsa en text som ännu kan ändras. Villkoret läser alltså data, inte ett
  klockslag, och en händelse som lever länge väntar tills den har lämnat flödet.
- **Oförändrat:** klasserna och deras ordning (§4), vakterna och stationens fönster (§3: två timmar före till två timmar efter starten),
  `halka_efter` (sex timmar efter starten, bokförs och klassar inte), dubbletterna, att en olycka klassas en gång, och §9:s bedömning.
- Byggt i `sql/108_olycksfacit_driftlarm.sql`: `olycksfacit_efterkontroll()` är `sql/085` ord för ord utom urvalet, och dagens och veckans
  dag i `supabase/functions/olycksfacit` (`DYGN_EFTER`). Integrationsprovet #842 prövar de båda villkoren och flödet när inläsningen står
  still, med ett motprov per villkor.
- **Fördröjningen** från olyckan till ärendet blir 6–30 timmar, i stället för 29–53.

### 10.2 Regel L

Ändringen kommer efter den första klassningen (6/11), så §7:s regel L gäller om den är en lättnad. Den ändrar inte vilka ord eller ytor som
ger en klass, bara när texten läses. Den kan bara göra färre olyckor TYDLIG eller TROLIG om Trafikverket skriver ett halkord eller *singel*
i texten efter kontrollen. Villkoret om flödet ska hindra det: texten läses först när händelsen har lämnat flödet.
- **L1:** de olyckor som redan är klassade rörs inte; en olycka klassas en gång (§2).
- **L2:** ändringen gäller bara olyckor som inte är kontrollerade när `sql/108` migreras.
- **L3, det sedda talet** (förslaget §6, mätt 8/11 i driften på 120 olyckor utan dubbletter sedan 6/11, varav 72 klassade):
  - ingen händelse syntes i flödet mer än 4 h 21 min efter starten; 2 över 3 h, ingen över 6 h;
  - texten efteråt var ändrad jämfört med fångsten i 27 av 72;
  - halkord bara i texten efteråt: 0; *singel* bara efteråt: 1, som blev TROLIG; vilt bara efteråt: 0.

  En kontroll sex timmar efter starten, med villkoret om flödet, hade läst samma text som kontrollen efter ett dygn för alla 120 och gett
  samma klass. Ändringen flyttar alltså inget sett tal.
- **L4:** skälet är fördröjningen till ärendet, inte utfallet.

### 10.3 Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-11 | i chatten: *"Ja, alla fyra"*, på förslagets fyra frågor, där fråga 4 var klassningen efter sex timmar (DECISIONS #841) |
| Axel | 2026-11-11 | via Bengt i chatten: *"axel signerar 641"* (DECISIONS #842) |

## 11. Tillägg 13/11 2026: det nya upplägget (DECISIONS #852)

**Status:** Bengt har signerat 13/11, och **Axels signatur väntar** (§11.6). Förslaget mättes på veckan 6–12/11, med SELECT i
Supabase-panelen 13/11; det ligger privat på Bengts dator. Bengt 13/11, på frågan om singelkravet: *"är det verkligen rätt behandling att
kräva singelolyckor"*, och på förslaget: *"bygg allt"*. Byggt i `sql/110_olycksfacit_upplagg.sql` och `supabase/functions/olycksfacit`.

### 11.1 Vad som ändras

| Del | § | Förut | Nu |
| :-- | :-- | :-- | :-- |
| D1 | 3 | stationens fönster två timmar före till två timmar efter starten | två timmar före till starten: halka som kom efter starten orsakade inte olyckan |
| D3 | 4, regel 3 | TROLIG kräver ordet *singel* i texten | TROLIG kräver olycksarten *ett fordon* (§11.2): förloppet, inte ett ord |
| D2 | 4, regel 3; 9.2 | en kollision kan aldrig bli TROLIG | arten *flera fordon* med samma yta och fukt blir TROLIG med skälet *kollision*; den räknas i statistiken men får ingen åtgärdsrad och inget område |
| C | 9.1 | lagren A1, K och A2 | också småvägsröstens lager (§11.4) |
| A | 5 | varje miss läses av en människa | en miss som passar ett känt mönster får en förifylld åtgärd (§11.3) |
| B | 5, 9.5 | dagens ärende står öppet tills varje rad har en åtgärd | dagens ärende stängs av funktionen; missarna utan förifylld åtgärd läses i veckans ärende |
| E | 9.5 | – | veckans ärende bär nämnaren: per klass hur ofta Halkvakt varnade |

Oförändrat: populationen och dubbletterna (§2), vakterna (§3), regel 1 (viltet), TYDLIG, INTE (varmt) och klassernas ordning (§4),
`halka_efter`, att en olycka klassas en gång, fångsten av A1, K och A2, driftlarmet (§10) och säljregeln (§9.6). D1 gäller alla klasser
som läser ytan, alltså också TYDLIG och INTE (varmt).

### 11.2 Olycksarten

Arten läses ur texten vid fångsten och texten efteråt, utan hänsyn till stora och små bokstäver. Ett ord räknas från sin början, inte
inuti ett annat. Den första raden som stämmer gäller; orden står ordagrant i `olycksart()` i `sql/110`.

| # | Art | Ord (urval) |
| --: | :-- | :-- |
| 1 | vilt | regel 1:s ord, tecken för tecken |
| 2 | oskyddad | fotgängare, cykel, cyklist, moped, motorcykel, mc |
| 3 | ett fordon | *singel…* |
| 4 | flera fordon | flera, två eller tre fordon, kollision, krock, personbilar, lastbilar, bilar, mötande, frontal, upphinnande, bakifrån, *mellan en personbil och …*, *personbil och lastbil*, *påkörd av en lastbil* |
| 5 | ett fordon | dike och vägdike, kört av, voltat, vält, på taket, tvärs, refug, räcke, stolpe, träd, bergvägg, omkull, i skogen, ställt sig |
| 6 | ett fordon, svag | bara ett fordon nämns (personbil, lastbil, buss, skåpbil, traktor, fordon, bil) |
| 7 | okänd | inget av ovanstående |

- *Svag* klassar inte: texten säger inget om förloppet, och olyckan blir OKLAR som förut.
- Trafikverkets texter har stavfel. Mönstret för personbil tål *pesonbil*.
- Ett ortnamn efter *mellan* är ingen kollision. *Buss i diket mellan Rättvik och Leksand* är ett fordon.

### 11.3 De förifyllda åtgärderna (A)

| Mönster | Villkor | Åtgärd |
| :-- | :-- | :-- |
| M1 småväg | tyst och otäckt, och en punkt i småvägsröstens punktfil inom 0,5 km (§11.4) | kort #647 |
| M2 rimfrost | tyst och täckt, TROLIG på rimfrost utan fukt | kort #46 |
| M3 fläckvis Våt | tyst och täckt, K:s sträcka hade *fläckvis Våt* i A1:s text, och K räknade sträckan torr | kort #645 |

En förifylld rad räknas som åtgärdad och kan skrivas om. Det som inte passar ett mönster läses av en människa i veckans ärende.

### 11.4 Småvägsröstens lager (C)

- Fångas en gång per olycka, inom sex timmar från fångsten, eftersom kedjans timmar gallras efter sex timmar.
- **Punkten:** närmaste punkt i småvägsröstens punktfil inom 0,5 km.
- **Timmen:** småvägsröstens regel räknad vid starten. Det är den senaste timmen som var skriven före starten, högst två timmar gammal och
  med minst 95 % av punkterna, som `smavag_timme()`.
- **Utfallet:**
  - *varnar*: regeln säger fryser, och den strängare N3 eller radarn i punktens bit de 60 minuterna före starten visar nederbörd;
  - *torr*;
  - *fryser inte*;
  - *ingen timme*;
  - *gallrad*;
  - *ingen småvägspunkt*.
- Lagret talar bara när brytaren för punktens grupp är på. Då varnade appen, och olyckan blir VARNADE. Med brytarna av är lagret skuggans
  facit, och utfallet rörs inte.
- Ärendet säger bara vad rösten hade gjort, i ord. Inga tal ur kuvösen sparas eller skrivs (#768).

### 11.5 Regel L

Tillägget kommer efter den första klassningen (6/11), så §7:s regel L gäller.
- **D1 är en lättnad:** veckans TROLIG går från 29 till 18.
- **D3 och D2 är skärpningar:** TROLIG går upp.
- **Tillsammans** blir raderna att åtgärda färre, så tillägget prövas som en lättnad med båda signaturerna.

- **L1:** de olyckor som redan är klassade rörs inte; en olycka klassas en gång (§2).
- **L2:** ändringen gäller bara olyckor som inte är kontrollerade när `sql/110` migreras.
- **L3, de sedda talen** (veckan 6–12/11, 362 olyckor utan dubbletter, förslagets mätning; vakterna är inte tillämpade på fönstret före
  starten, så en omklassning kan skilja sig något):

  | Veckan 6–12/11 | Förut | D1 + D3 | D1 + D2 + D3 |
  | :-- | --: | --: | --: |
  | TROLIG | 29 | 24 | 33 (varav 9 kollisioner) |
  | — varnade | 12 | 15 | 21 |
  | — tysta | 17 | 9 | 12 (varav 3 kollisioner utan rad) |
  | Rader att åtgärda, med TYDLIG | 18 | 10 | 10 |
  | Andelen varnade bland TYDLIG och TROLIG | 40 % (12 av 30) | 60 % (15 av 25) | 62 % (21 av 34) |

  Ordlistan i `olycksart()` gav 13/11, körd med SELECT på samma vecka, samma tal i fönstret före starten som provet. I hela veckan
  flyttade fyra olyckor mellan arterna.

- **L4, skälen:**
  - D1: värden efter starten kan inte ha orsakat olyckan. Elva av veckans 29 TROLIG faller bort med fönstret fram till starten, bland
    dem väg 631 11/11 (regnet 1,5 timmar efter) och väg 1885 12/11 (ytan 0,0 °C två timmar efter). Skälet syntes alltså i utfallet, och
    därför krävs båda signaturerna.
  - D3: ordet *singel* är ett ord, inte förloppet. Bengts fråga kom före talen.
  - D2: kollisioner på frusen väg räknades aldrig.

### 11.6 Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-13 | i chatten: *"bygg allt och axel signerar del 6"*, på förslaget där D-delarna krävde båda signaturerna |
| Axel | väntar | Bengts ord *"axel signerar del 6"* gäller §10, klassningen efter sex timmar, som Axel signerade 11/11. Frågan om Axel också signerar §11 står i bedömningens §4.2. `sql/110` migreras först efter hans signatur (§7). |

---

*Källor:*
- `sql/084_olycksfacit.sql` (steg 1), `sql/085_olycksfacit_klassning.sql` (steg 2 och 3), `sql/108_olycksfacit_driftlarm.sql` (§10) och
  `sql/110_olycksfacit_upplagg.sql` (§11);
- `supabase/functions/olycksfacit/`;
- förslaget `Desktop/Olyckorna_2026-11-06/OLYCKSFACIT_RUTINEN_FORSLAG_2026-11-06.md` (Bengt 6/11: *"Bygg olycksfacit"*, *"Ja, bygg steg 2 och 3"*);
- förslaget `docs/FORSLAG-OLYCKSFACIT-DRIFTLARM-2026-11-08.md` (§10);
- DECISIONS #247, #245, #564, #649, #784, #796, #797, #841 och #842;
- `publish/snapshot-core.ts`: vakterna och fukten.
