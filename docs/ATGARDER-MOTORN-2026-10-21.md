# Åtgärdslistan för block 4, Motorn (kort #361)

**Varför:** Bengt 21/10: *"jag vill åtgärda alla brister i block 4 motorn som du har listat i dokumentet. hur går vi tillväga för att
göra det och utan att tappa bort någon del"* och *"börja med åtgärdslistan"*. Underlaget är genomgången av projektkartans block 4
(läs-only 20/10, rättad samma kväll om vad som fallit; Bengts rapport på Skrivbordet, `Halkvakt_Genomgang_Motorn_2026-10-20.md`).

**Reglerna:**
- Varje brist har ett nummer, B4-01 till B4-60 (B4-61 tillkom vid paket B; B4-62 och framåt är Skuggan och prövningen, avsnitt H, sedan 21/10). Numren byts aldrig och återanvänds aldrig; en ny brist får nästa lediga nummer.
- En rad stängs bara av en **PR** (som skriver *Stänger B4-xx* i beskrivningen), ett **beslut** (DECISIONS-posten skriver numret) eller
  ett uttryckligt **bortvalt** (Bengts ord, med skälet). Statusen skrivs här i samma ändring.
- Status: `öppen` · `pågår` · `klar` · `bortvald`. Kolumnen *Stängd av* bär PR-numret eller beslutet.
- Kort #361 stängs när varje rad är `klar` eller `bortvald` och listan är avstämd mot rapporten och projektkartan en sista gång.

**Paketen** går i den här ordningen: A (före signeringen 31/10) · B och C (rättelser, små PR:er samma dag) · D (Bengts beslut i omgångar)
· E (byggen som besluten beställer) · F (publikt och appen) · G (integrationskartan) · H (Skuggan och prövningen, från 21/10).

Förkortningar: sc = `publish/snapshot-core.ts`, sk = `supabase/functions/skuggmotor/main.ts`, il = `supabase/functions/ingest-live/`.

## A. Brådskande, före signeringen av förregistreringen 31/10

| Nr | Brist | Slag | Ägare | Senast | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| B4-01 | **Ingen domläsning för kandidaten.** `publish/grind-s-b.ts` dömer bara RÅ (`shadow_log.prognos`); kandidatens domlogg (`kandidat_skugga`, `kandidat_station`, sql/057) läses bara av värdevakten och arkivexporten. Ingen läsning mot grind A–C, inget kort | bygge + beslut | Claude (bygge), Bengt | 31/10 (vad som måste finnas då utreds i paket A) | pågår — beslut (Bengt 21/10, ur underlaget för paket A): *"Ja, skriv utkastet"* till förregistreringens §4b *Läsningen*; loggen B4-36; skriptet byggs i november och fryses före första läsningen · **utkastet skrivet 21/10** (§4b, DECISIONS #655); §4b fastställt 21/10 av Bengt och Axel (#656); frist `domskriptet-kandidaten` 30/11 (Claude); stängs när skriptet är fryst | |
| B4-02 | **Val (d) på kort #270: egen spärr för bandet 0–7 km.** Står den inte i förregistreringen före signeringen kan den inte läggas till efteråt (§8). Härledningen prövades i paket A och **höll inte**: 103 av 761 stationer har sin närmaste granne inom 7 km, och spärren nås utan (d). Det som saknades var regeln för domslut (b) per band | beslut | Bengt, Axel | 31/10 | pågår — beslut (Bengt 21/10, ur underlaget för paket A): **klar** — *"Stryk, dom per band"*; texten i §4b punkt 3, fastställd (DECISIONS #655, #656; kort #270 och §4.2 rättade); signeras med förregistreringen 31/10 | #655, #656 |
| B4-03 | **Kandidatens frysflagga och K-B** i förregistreringen (utkastet i bedömningen §4.2, #650) | beslut | Bengt, Axel | 28/10 (frist `kb-frysflaggan`) | pågår — beslut (Bengt 21/10, ur underlaget för paket A): *"Ja, i utkastet"*, med en mening om att flaggan (≤ +1 °C) mäter klassen och inte rösten (≤ 0 °C och väta) · **klar** — fastställd 21/10 av Bengt och Axel (§4b punkt 11, DECISIONS #656); fristen `kb-frysflaggan` borttagen; signeras med förregistreringen 31/10 | #656 |

## B. Rättelser i projektkartan (en eller två PR:er)

| Nr | Del | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-04 | m-motorn | engine.ts 368 rader (kartan 292), Engine.swift 466 (379); **50 vektorer** (37); fixtures; hänvisning till var kandidaten (m-segmentprognos) och halkzonen (m-halka) bor | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-05 | m-olyckor | skrivningarna i `il/skriv.ts:16-59` och `situationspolicy.ts:23` (inte ingest-live/index.ts); sc:385-392, :456-464; sk:494-500; engine.ts:306-327; "31 på 7 dygn" är från 26/9 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-06 | m-halka | `il/skriv.ts:61-85`; sc:166-180; engine.ts:329-345; vektorerna v45–v46 (kandidaten) och v48–v50 (halkzonen); MATNINGAR-talen står nu på :448; halkzonen i appen från (29) | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-07 | m-frysrisk | `il/skriv.ts:87-167`; engine.ts:273-286, grenen bär S3; vektorerna v38–v41; texts.ts:64-70 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-08 | m-vilt | `situationspolicy.ts:23, :36`; sc:393-403; på iOS läses djuren i `SnapshotReader.swift:55-56` | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-09 | m-kameror | 22 vektorer med kamera (v43, v44 tillkomna); sc:149-162; engine.ts:259-270 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-10 | m-tillstand | saknas-raden *S1-grinden på frostnätter (Axel, #196)* stämmer inte med #196, och ägaren är tillståndet (#649); sk:286-300, :504-512 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-11 | m-efterhalkan | nyckeln *(24) till Kompisarna* är överspelad (vägen är App Review med (32)); texten finns i tre språk (texts.ts:28, Engine.swift:171, Types.kt:156); kort #297:s tre beslut saknas i saknas-listan; **facitläsningen 2024/25, lyft 0,11** (#602) saknas | **klar** — nyckeln och saknas rättade; facitläsningen #602 inlagd med #607:s delning efter planerad åtgärd (2,5 % mot 7,1 %) | PR paket B |
| B4-12 | m-trenden | stegen säger att lägesfilen saknar lutning; motorn läser `lutning30` sedan S3 (#524, snapshot.ts:46, engine.ts:279-285); TROSKLAR-TRENDEN :245 → :264 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-13 | m-overgangar | saknas-raderna nämner de gallrade nätterna 6–8/10 (fristen `ob-beslut` gäller 19–20/10) och S3 som Axels bygge (byggt 11/10, PR #872); motor-, testfalls- och appstegen står *saknas* men är klara i m-efterhalkan | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-14 | m-rimfrost | *Mätt i skuggan* säger att R-B byggs när R-A passerat; R-B är byggd 10/10 (#510) | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-15 | m-nederbord | radnummer: grind-nt.ts :186 → :188, vakthund :73-76 → :82-86 | **klar** — grind-nt-raden rättad; m-nederbord bär ingen vakthund-hänvisning (frostflödenas rader rättade där de står) | PR paket B |
| B4-16 | m-vattenplaning | stegen efter beslutet B4-38 | **klar** — delen stängd 21/10: stegen *Villkoret i motorn*, *Testfall* och *I appen* gäller inte, kort #42 bort (DECISIONS #657) | #657 |
| B4-17 | m-vind-sikt | W-A-läget 8/10 (B2 sikt föll, B1 byvind 116 av 500 stationstimmar, #491) står inte i saknas; vakthund :82-86 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-18 | m-hojd | saknas-raden om kuvösens flaggmarginal (#437) är gjord (#467, #490); läsningen 24/11 hör till prognoslagret (#649) | **klar** — delen stängd 21/10 (#657); *Dom* gäller inte, 24/11 under RÅ-delen; saknas-raden om #437 borta med delen | #657 |
| B4-19 | m-segmentprognos | nyckeln säger grind B/C, men kandidaten döms på A–C (#547); betavarningens *Kvar* (avstängningen, bygget 0.3.13) är gjord; förregistreringssteget (A) och (B) besvarade av #562; *takten före App Review* klar (#606); TROSKLAR-SKUGGAN :148-151 → :187; INTEGRATIONSKARTAN :195 → :225 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-20 | m-kallplatser | kallkartan (MODIS) föll och lades åt sidan (#496, #497) — står inte i delen | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-21 | m-smhi-forstarkare | radnummer (vakthund :81-87, INTEGRATIONSKARTAN :189, sc :404, :465); beslutet *#114* ska vara #121–#123 och #135 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-22 | m-forsprang | radnummer (engine.ts:75, :131-132; sk:337; sc:434, :453); kort #153 står på TAVLA :1521, inte :1575 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-23 | m-vaglagets-alder | *0 vinterklassningar* är inaktuellt: kodgrinden 20/10 (39401059236) 1 929 rader med kod 2, 485 *fläckvis Is*; 624 omklassningar (39401269093) | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-24 | m-frysklassning | nyckeln *uppspelningen byggs först* och steget *K-B obyggd (#363)* är inaktuella (byggd, #510); TROSKLAR-FRYSKLASSNINGEN :167; skrivningen i `il/skriv.ts:132-135` | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-25 | m-tystnadsfel | *2 av 20* är från 24/9 | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-26 | m-olja | radnummer: `situationspolicy.ts:34`, sc:389-403, sk:255-290 (den syntetiska faran på :279) | **klar** — rättad mot koden på main 21/10 (kontrollerad rad för rad) | PR paket B |
| B4-27 | m-prognoslagret | val (b) står öppen fast struken (#547); efter besluten B4-42 och B4-44 | **klar** — omdöpt till *RÅ: kontroll och reserv*, vikt 1, inga öppna val (#657) | #657 |
| B4-28 | fem delar | *beskrivs*-hänvisningarna till MATNINGAR pekar på fel avsnitt: prognoslagret MAT 6 → 5.1, frysklassningen MAT 7 → 5.2, väglagets ålder MAT 7 → 6.5, SMHI MAT 9 → 7.6, tystnadsfelet MAT 4 → 3.4 | **klar** — *beskrivs* pekar på MATNINGAR:s huvudavsnitt (5, 5, 6, 7, 3): kartskriptet godtar bara numrerade huvudrubriker, så radens förslag 5.1 m.fl. hade fällt det | PR paket B |
| B4-61 | 21 delar | **Funna 21/10 vid kontrollen av paket B, utanför raderna:** 42 döda eller glidna hänvisningar av samma slag — `ingest-live/index.ts:124–216` i åtta delar (filen har 106 rader), `skuggmotor/main.ts:449-452` i fyra gröna delar (pekar nu på spärrprovet), integrationskartan +30 rader, snapshot-core +1 rad efter rad 244, m-efterhalkan *beskrivs* MAT 7 → 6, texter som #655 och #656 gjort inaktuella | **klar** — rättade i samma PR, var och en kontrollerad mot koden | PR paket B |

## C. Handtext utanför kartan

| Nr | Var | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-29 | TAVLA kort #42, vårlistans Ä1 | V-B-domen (#648) saknas; Ä1 säger *avgörs på V-B:s data* | **klar** — kort #42 stängt och vårlistans Ä1 avgjord (#648, #657) | #657 |
| B4-30 | MALET §5 | säger att S3 väntar på S1-grinden | **klar** — MALET säger att S3 byggdes 11/10 (#524) och hänvisar S1-frågan till B4-47; vattenplaningens rad rättad | PR paket C/D |
| B4-31 | NIVA2-LIVE | säger att förregistreringen gäller *för alla spår*; den gäller kandidaten | **klar** — NIVA2-LIVE: förregistreringen gäller kandidaten, RÅ som kontroll och reserv (#547) | PR paket C/D |
| B4-32 | bedömningen §4.2 | raden *Fysikregeln i hela skuggan* står öppen fast #563 löste regel T; kort #153:s beslut 2 är avgjort av #563 för kandidaten | **klar** — §4.2-raden markerad avgjord för kandidaten (#563), givarvakten nej (#493) | PR paket C/D |
| B4-33 | TROSKLAR-SKUGGAN :110-123 | vägpunktsgrinden står som *klarar*, utan not om att RÅ föll (#399) | **klar** — not i TROSKLAR-SKUGGAN om #399; ingen tröskel ändrad | PR paket C/D |
| B4-34 | kort #270, kartan, §4.2, PROGNOSLAGRET §4, m-segmentprognos | de öppna valen står olika på fem ställen (c, d, e, h mot b, c, d, e, h mot bara d); §4.2 märker (h) *mätt* men listar den öppen | **klar** — alla fem ställen säger att inga val är öppna (#655, #657); m-segmentprognos rättad i paket B | PR #1122, PR paket B |
| B4-35 | fristerna.json | KB-B kallas *S6* i fristen för efterhalkans dom (kontrolleras och rättas) | **klar utan ändring** — *S6* är bedömningens eget steg *Dom i januari* (§4.2-tabellen, rad 428), inget fel | — |

## D. Bengts beslut (i omgångar om tre eller fyra frågor)

| Nr | Fråga | Vem | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-36 | **Loggen för domen per band:** `kandidat_skugga` sparade bara antal per sträcka; sql/065 lägger till punkterna, deras utfall, ankaravstånd, ankare, spridning och värde (regeln orörd). Måste vara i drift före signeringen 31/10 | Bengt (*"Bygg PR:en"*, Bengt 21/10, ur underlaget för paket A); i drift med DB-knappen på Bengts ord | **klar** — migrerad 21/10 04:44 UTC med DB-knappen (39545613098, transaktionen bekräftad; alla sex kolumner och den nya loggfunktionen på plats); första timmen 04:50 UTC (DB-knappen *las* 39546397709): timmen 04:00 *räknad*, 85 sträckor, 23 med punkter, 330 punkter = 194 varnande + 133 tystade av spridningen + 3 vetade, 0 rader där listan och räknarna skiljer, ankaravstånd 0–42,3 km | PR #1117 (0859d863), DB-knappen 39545613098 |
| B4-37 | **B1-fällan:** kandidatens veto (station inom 15 km över +2 °C) tar bort nästan alla varningar som B1 kunde räkna som falsklarm, så B1 blir nära noll av konstruktion. Förslag i §4b: skriv ut det, och redovisa B1 utan vetot på en rad som inte fäller domen (sql/065 loggar de vetade punkterna) | Bengt, Axel (med §4b) | **klar** — fastställt 21/10 (§4b punkt 6, DECISIONS #656): fällan skrivs ut och B1 utan vetot redovisas utan att fälla domen | #656 |
| B4-38 | Vattenplaningens steg D: stryks? (fallen, V-A #69/#104 och V-B #648) | Bengt; formellt Axel | **klar** — stryks, för Bengt och Axel (*"Stryk, för oss båda"*, #657) | #657 |
| B4-39 | Sikten som egen fara: stryks, eller prövas i vinter? (en höstläsning på 14 dygn, #491) | Bengt | öppen | |
| B4-40 | Höjden: *gäller inte*? (redan avgjord, #547, #650) | Bengt | **klar** — delen stängd (*"Ja, stäng delen"*, #657) | #657 |
| B4-41 | Kallplatserna: stryks, eller står vårlistans Ä6 kvar för RÅ-reserven? (bedömning: kandidatens särdrag, vikterna okända) | Bengt | öppen | |
| B4-42 | Prognoslagrets val (c), (e) och (h): strykas? (besvarade av #556, #472, #471) | Bengt | **klar** — alla tre strukna (*"Stryk alla tre"*, #657) | #657 |
| B4-43 | SMHI:s Verify 2 (luft mot yta som reserv): stryks? | Bengt | öppen | |
| B4-44 | Prognoslagret: slås ihop med segmentprognosen, eller döps om till *RÅ: kontroll och reserv* (vikten sänks, vägpunktsgrinden kvar, #649)? | Bengt | **klar** — omdöpt till *RÅ: kontroll och reserv*, vikt 1 (*"Döp om, sänk vikten"*, #657) | #657 |
| B4-45 | Läsningen 24/11 (#435): står kvar fast frågan (b) är struken? | Bengt | **klar** — står kvar som förregistrerad kunskap om RÅ, under RÅ-delen (#650, #657) | #657 |
| B4-46 | S3 till användarna: publikt med (32), eller Kompisarna först? (underlag: facit lyft 0,11, #602) | Bengt, Axel | öppen | |
| B4-47 | S1-grinden: räknas den som passerad (S3 byggdes efter S1-läsningen 11/10, #521, #524)? | Bengt | öppen | |
| B4-48 | Trenden: byggs T-B nu, eller vilar trendens röst till T-C? | Bengt, Axel | öppen | |
| B4-49 | Tystnadsfelet: ska kandidatens betavarning räknas med? | Bengt | öppen | |
| B4-50 | Väglagets ålder: byggs Å-A-skriptet nu? | Bengt | öppen | |
| B4-51 | Försprånget: byggs domknappen för FS-A–C före mars? | Bengt | öppen | |
| B4-52 | Byvinden: vilken utlösare ska köra W-A igen (*efter första höststormen* har ingen), och en frist? | Bengt | öppen | |

## E. Byggen som besluten beställer

| Nr | Bygge | Beror på | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-53 | Domrad (#649) och frist för F-A, FS, tystnadsfelet och Å-A | — | öppen | |
| B4-54 | Å-A-skriptet | B4-50 | öppen | |
| B4-55 | Domknappen för FS-A–C | B4-51 | öppen | |
| B4-56 | Tystnadsfelet med kandidaten (`scripts/tystnadsfelet.ts:225`) | B4-49 | öppen | |
| B4-57 | En vektor som prövar S3 och kandidaten tillsammans (S3 kastar kandidaten inom 10 s men inte tvärtom) | — | öppen | |

## F. Publikt och appen

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-58 | Butikstexten `marknadsforing/butik/appstore-ios.md`: :136 säger att *Halkvakt tror* följer *Halt väglag* (gäller bara kandidaten; S3 följer *Frysrisk*), :91 säger *near or below 0 °C* (S3 talar vid +1…+3 °C) | Claude (utkast), Axel (App Store Connect) | öppen | |
| B4-59 | Bygget (32) har kvar raden om gammal data som #647 tog bort på main — rättas i nästa bygge | Axel | öppen | |

## G. Integrationskartan

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-60 | Integrationskartan (fryst) beskriver fortfarande fogarna F2–F4 som vägen och säger i §5.2 att motorn inte läser `regn_h`/`lutning`; kandidatens väg in (egen nyckel, sist i prioriteten) saknas. Öppnas den för fysikspåret? | Bengt | öppen | |

## H. Skuggan och prövningen (från 21/10)

**Varför:** Bengt 21/10: *"tar vi skuggan för själv eller ingår den i det här"* och *"lägg upp en arbetsplan för att komma igenom
det här på bästa sätt"*. Blocket i projektkartan (`provningen`, sju delar) gicks igenom läs-only 21/10 (Bengts rapport på Skrivbordet,
`Halkvakt_Genomgang_Skuggan_2026-10-21.md`). Samma regler som ovan, samma kort #361. Fem frågor i D (B4-47, B4-49–B4-52) och B4-53
rör grindarna och domkalendern; de står kvar där. S-1–S-11 är rapportens namn på frågorna.

**Rättelser (inga beslut)**

| Nr | Del | Rättelse | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-62 | p-skuggmotorn | *I drift*: deploy 17/10 (96d1045, 39060328769), sex cron-jobb (SE, försprånget, FI, DK, väg C, NO), morgonavbrotten; *Data finns*: takläsningen 17/10, V-B 19/10, dygnsexporten; nytt steg *Vad skuggan loggar* (`main.ts:573–590`); kandidatens domlogg går inte genom skuggmotorn; *beslut* + #344, #359, #389, #523, #527, #573, #577 | **klar** — rättad 21/10 | PR Skuggan |
| B4-63 | p-grindarna | *Fristvakten* klar (#1098–#1101 öppnade 20/10); *Domlarmet* med första körningen på main 21/10 (kodgrinden, C SPÄRRAD, tyst) och kriteriet 26/10; alla tretton tröskeldokument; pulsklockans sju måndagsjobb (`pulsklocka.ts:53–59`); självtesterna; fristerna i domkalendern; *beslut* #338, #352, #554, #649; *beskrivs* + BED 4 | **klar** — rättad 21/10 | PR Skuggan |
| B4-64 | domkalendern | MATNINGAR §11: 26/10, 27/10, 31/10, 2/11, 9/11, 16/11 och 30/11 inlagda; kandidaten i mars i stället för prognoslagret; V-B dömd; bygget (32) och B4-46; väglagsarkivet, inte bildfacitet, gav noll omklassningar. §10: 50 testfall, 100 kontrakt, kandidaten döms i mars. fristerna: måndagsserien sju jobb och domlarmet, `mars-domar`, `nt-dom` med Axel, ny frist `taklasningen-2-11`, domskriptets grindnamn | **klar** — rättad 21/10 | PR Skuggan |
| B4-65 | facitdelarna, termisk, regel L | p-kamerafacit: talens källa (kort #260, bedömningen §6.2), Pro-gränserna (#652); p-bildfacit-domen: 624 omklassningar 20/10, Bengts val (b), Axels svar 23/10, saknad kod för #231; p-forarfacit: 41 svar 21/10 (vakthunden), KB-D4 mot #378; p-termisk: Axels *"görs inte"* (#481), fristen 15/12; p-regel-l: BED 4 och förslagsfilens status; Bengts val (b) i bedömningen §4.2 och på kort #209 | **klar** — rättad 21/10 | PR Skuggan |
| B4-66 | m-segmentprognos | sql/065 i drift 21/10 i steget *Regeln i databasen och skuggloggen*; nytt steg *Domskriptet* (B4-01) | **klar** — rättad 21/10 | PR Skuggan |
| B4-67 | kartskriptet | `hinder()` och hävstången hoppar över stängda (grå) delar — m-hojd stod kvar som hinder för *Domarna i mars*; självtest | **klar** — rättad 21/10 | PR Skuggan |

**Byggen och kontroller**

| Nr | Vad | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-68 | Domskriptets domrader under egna grindnamn: `domlarm.ts:16–20` bokför RÅ:s *Grind A:KLARAR* och *K-A:KLARAR*, som annars tystar kandidatens KLARAR | Claude, med B4-01 | öppen | |
| B4-69 | Kod för tabellen vädertyp × bar/våt väg (kort #231): `kontaktark.py` läser en platt mapp, hinken har `v2/<datum>/` och `v3/<datum>/` | Claude, före 1/2 | öppen | |
| B4-70 | Vakthundens engångsspärr släppte igenom #1125 (21/10 14:07 UTC) fast #815 med etiketten `vinterord` finns; samma spärr skyddar frostlarmet | Claude | öppen | |
| B4-71 | Domlarmets kanter: ärendena tilldelas alltid Bengt (`domlarm.ts:89`), också NT där domslutet är Axels; vakthundens utlösarprov startar vindsikt-steg0 och "skriver ingen issue" (`vakthund/index.ts:141–143`), men flödet har nu domlarmet; en handkörd finsk R-A skriver `R-A FI`, som inte är bokförd | Claude | öppen | |
| B4-72 | Syns Betatest och facitfrågan i App Store-versionen? I så fall kan vem som helst svara utan identitet, och premissen i #201 (tolv testare med samtycke) rubbas | Axel | öppen | |
| B4-73 | KALENDERN: Ubuntu 26 (19/10) står oavbockad, och vägdatalagret *före vintern* saknar frist | Claude | öppen | |
| B4-74 | DECISIONS-posten om bildfacitet (kort #209) när Axel svarat på val (b) — fristen `bildfacit-axel` 23/10 | Bengt, Axel | **klar** — *"axel har svarat vi kör b)"* (Bengt 21/10); fristen `bildfacit-axel` borttagen före sitt ärende | #660 |
| B4-75 | Kartskriptet räknar stängda delar som 0 % i målens procent (`malDelar`, `andel`); B4-67 rättade bara hindren och hävstången | Bengt | öppen | |
| B4-88 | Kandidatens del A föll 3 av 10 körningar 19–21/10 på MET Nordic: katalogen svarade inte på fyra försök (19/10 12:13), avkortade svar som till sist gav RangeError i `kuvos/metnordic-prognos.ts:57` (21/10 06:13); 19/10 00:13 inte läst. Reserven (#651) gör ett nytt försök, men två fall i rad tystar kandidaten sex timmar — fler omförsök med längre väntan, och RangeError som ett omförsök | Claude | öppen | |

**Beslut**

| Nr | Fråga | Vem | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B4-76 | S-1 **A2:s population** (bedömningen §4.2, #554): stängs före signeringen? Förregistreringen säger "Måtten — oförändrade" | Bengt, Axel; före 31/10 | **klar** — *"Oförändrad, stäng"* (Bengt 21/10): A2 oförändrad för 2026/27, meningen i förregistreringen §4, bedömningen §4.2 avgjord | #659 |
| B4-77 | S-2 **Kamerabilderna i §4b punkt 5:** en mening om att bilderna väljs vid kalla stationer och skuggans larm, inte vid kandidatens varningar | Bengt, Axel; före 31/10 | **klar** — *"Ja, en mening"* (Bengt 21/10): meningen i §4b punkt 5 | #659 |
| B4-78 | S-3 **Förarsvar på kandidatens varningar:** räknas *Stämde inte* i B1, eller bara redovisning? | Bengt, Axel; före 31/10 | **klar** — *"Bara redovisning"* (Bengt 21/10): meningen i §4b punkt 4 | #659 |
| B4-79 | **Signaturen:** signerar Axel förregistreringen med egna ord? Flera beslut bär Bengts ord för båda (#564, #656, #657); regel L kräver båda signaturerna för en lättnad | Bengt, Axel; före 31/10 | **klar** — *"Bengt för båda"* (Bengt 21/10): raden i förregistreringen §11 | #659 |
| B4-80 | S-4 **V2-taket** (150 per UTC-dygn) fylls troligen av nattbilder: höjas eller få en dagsljuskvot — efter en mätning med DB-knappen *las* | Bengt | öppen | |
| B4-81 | S-5 **V3** fotograferar bara kalla stationer som vakterna tystat: behålls med ny text, eller stryks? | Bengt | öppen | |
| B4-82 | S-6 **KB-D4** (≥ 5 förare, ingen > 25 %) utan identitet: räkna testarna i gruppen och skriv att 25 %-villkoret inte kan prövas? | Bengt, Axel; före 15/12 | öppen | |
| B4-83 | S-7 **Termisk kartering:** stängas, stå kvar för 2027/28, eller in i §4b? | Bengt, Axel; före 15/12 | öppen | |
| B4-84 | S-8 **Två domar utan ägardel:** kodgrinden C till m-halka, KB-A/KB-B i mars till m-efterhalkan? | Bengt | öppen | |
| B4-85 | S-9 **p-grindarnas beroenden:** bara i-arkivet, i-vakterna och p-skuggmotorn? | Bengt | öppen | |
| B4-86 | S-10 **Fallna spår som körs vidare:** V-A och V-B varje måndag, vattenplaningens bilpositioner till kamerafacit — "med flit"? | Bengt | öppen | |
| B4-87 | S-11 **Regel L och Skyltfonden** (bilaga 7: en tröskel "aldrig lättas"): en saknas-rad i u-skyltfonden? | Bengt; före 15/12 | öppen | |
