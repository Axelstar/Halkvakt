# TROSKLAR-FORSPRANG — allvar som försprång (kort #153 beslut 1)

**Fastställt 25/9 2026** — Bengt (*"skriv tröskeldokumentet för beslut 1 nu"*), Axel kontrasignerar samma dag (via Bengt: *"Axel ger
ok till allt som behövs för att göra beslut 1 färdigt idag"*). DECISIONS #359. Skrivet och fastställt innan någon mätning finns.

## 1. Frågan — och vad den INTE är

**Kan en varning som vilar på en mätning sägas tidigare när mätningen säger att faran är allvarligare — utan att rösten blir pratsam,
tränger undan andra varningar eller säger något den inte sa förut?**

Formen är beslutad sedan länge och prövas inte här: allvar uttrycks som **tid**, inte som ord och aldrig som prioritet (Axel, kartan
§13.1; #90 roll B; TROSKLAR-SMHI-FORSTARKAREN E1; kort #153 omskrivet 16/9, DECISIONS #221). Rösten säger **samma ord, tidigare.**

**Inte i frågan:** olyckor (A3 — har redan sitt tvåsteg med det tidiga ropet på en mil, DECISIONS #28), fartkameror (A5 —
`cameraTriggerM` och texten rörs inte), vilt (A4 — punktkälla, *"framöver"*), och prioriteten (E3: den skulle kunna tysta en olycka).
Försprånget gäller **A1 halt väglag** och **A2 frysrisk**, och bara dem.

**Förhållandet till tröskelregeln (TROSKLAR-KOMBINATIONEN §6).** Försprånget utlöser ingenting: det ändrar bara *när* en varning sägs
som redan utlöses av sin egen mätning. Det är precis den roll T3 och T6 tillåter (*stärka, försvaga eller förlänga*). Grind FS-B4 vaktar
att det förblir så.

## 2. Nivån — vad som gör en varning allvarligare

Två nivåer per fara, ur fält som redan finns i snapshoten. **Inga nya tal:** gränserna är delarnas redan fastställda svep (regel D1).

| Fara | Nivå 2 (allvarligare) | Nivå 1 (i övrigt) | Källa |
| :-- | :-- | :-- | :-- |
| **A1 halt väglag** | Trafikverkets väglagskod **3 eller 4** (mycket besvärligt / is- och snövägbana) | kod 2, eller kod 1 med halkord | `segments[].code` — operatörens bedömning |
| **A2 frysrisk** | ytan **≤ 0 °C** (K1_GRANS[0]) **och** stationen blöt inom **2 h** (väta ≥ 3 av 4 i N_SVEP) | ytan ≤ +1 °C och fuktig, som i dag | `weather[].yta`, `weather[].bevis.vata` (DECISIONS #342) |

*Varför just dessa:* fritt vatten på en yta som redan är under noll är svartisens klassiska fall (TROSKLAR-OVERGANGAR), och kod 3–4 är
operatörens egen skärpning. Båda är mätningar eller minne av mätningar (T4), aldrig en modell. Kod 3 har inte setts i arkivet och kod 2–4
inte alls före 25/9 (846 rader, alla kod 1) — därför grind FS-A. **Broarna står på nivå 1 i vinter:** snapshoten ger en bro
närmaste stationens yta men inte stationens id, så broarnas väta går inte att slå upp.

## 3. Försprånget — svepet

I dag: `leadM` = fart × **30 s**, klämt till **400–3 000 m** (vid 90 km/h 750 m). Nivå 1 behåller exakt det. **Nivå 2 prövas med tre
värden**, klämda till samma spann — spannet ändras inte:

| Svep för nivå 2 | vid 90 km/h | tillägg mot i dag |
| :-- | --: | --: |
| **45 s** | 1 125 m | +15 s |
| **60 s** | 1 500 m | +30 s |
| **90 s** | 2 250 m | +60 s |

Tre punkter, inte fler: ett större rutnät överanpassas på samma tunna vinter (TROSKLAR-KOMBINATIONEN §3, regel D). **Valregeln, bestämd
nu:** klarar flera värden grindarna väljs det **kortaste** som klarar FS-B1 — inget längre försprång än det som behövs.

## 4. Hur det mäts — skuggan

**Eget anrop, inte skuggmotorns huvudvarv.** Skuggmotorns huvudvarv slår redan i datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på de
nya minuterna :02/:32 — flytten i kort #244 löste det inte). Försprånget körs därför som eget anrop på **:12/:42**.
**Populationen från T0** (DECISIONS #662, #664): **alla 30 rutter varje halvtimme** — de 20 i `ROUTES` och de 10 i `ROUTES_C`
(`supabase/functions/skuggmotor/main.ts`), högst tre per anrop (sql/066). T0 är första körningen med sql/066:s jobb; datum och
klockslag (UTC) skrivs i posten som driftsätter det. För varje rutt och varv avgörs om någon nivå 2-fara finns bland motorns faror vid
linjen (`farorVidLinjen`). Finns en körs motorn två gånger på samma spår: **baskörningen** (dagens motor) och **varianten** (nivå 2 med
halvtimmens svepvärde; värdet är detsamma för alla rutter i varvet, så varje rutt möter alla tre var 90:e minut). Båda körningarnas
varningar och undanträngda (`suppressed`) loggas, med nivån per varning. Finns ingen skrivs en **nämnarrad** (`niva2` = 0):
baskörningens A1- och A2-varningar med nivå, ingen variant — den vore byte för byte densamma. Varje varning bär `beta` när den är
efterhalkans betavarning (S3). En rad per rutt och varv. **Raderna före T0** (halvtimmens 2–3 av de 20 rutterna, urval på rutans
rektangel; vid beslutet 15 rader 14–18/10, sedda som antal) räknas med samma regel men redovisas för sig och ingår inte i domen.

**Motorn får en krok, ingen ny regel:** en valfri funktion som ger försprånget per fara. Utan kroken är motorn byte för byte densamma,
och vektorerna i `engine/vectors/` rörs inte. Kroken förs till Kotlin och Swift först vid steg 7, efter domen.

## 5. Grindarna

### FS-A — finns nivån? (mätbar när vintern kommit)

| # | Mått | Krav |
| :-- | :-- | :-- |
| FS-A1 | Andel av skuggans A1- och A2-varningar som har nivå 2 | **5–50 %** — en nivå som aldrig eller alltid slår till bär ingenting |
| FS-A2 | Väglagskod 3 eller 4 i arkivet | **minst ett objekt** innan A1:s nivå 2 räknas (T2: vittnet ska finnas) |

### FS-B — skuggdriften (dom i mars)

| # | Mått | Krav |
| :-- | :-- | :-- |
| FS-B1 | **Vinst:** median extra förvarning för nivå 2-varningar, i sekunder vid bilens fart | **≥ 15 s** |
| FS-B2 | **Undanträngning:** baskörningens varningar som saknas i varianten | **≤ 2 %**, och **noll olyckor** (E3) |
| FS-B3 | **Takt:** andel yttranden med ett annat yttrande inom 60 s före (skuggrapportens `takt`, DECISIONS #200) | ökar med **högst 5 procentenheter** mot baskörningen |
| FS-B4 | **Inget nytt:** varningar i varianten om en fara baskörningen aldrig talade om på samma rutt och varv | **högst 1 %**; faror där baskörningens spår tog slut före faran redovisas separat och räknas inte |

### FS-C — domens giltighet (utan C fälls ingen dom)

| # | Villkor | Krav |
| :-- | :-- | :-- |
| FS-C1 | Nivå 2-varningar i varianten, per svepvärde | **≥ 60** per värde |
| FS-C2 | Spridning | **≥ 3 halkperioder** och **≥ 3 län** |
| FS-C3 | Bruset | ±1,96·√(p(1−p)/N) redovisas med varje andel |

### Räkneregeln (fastställd 21/10 2026 före första lästa andel, DECISIONS #664)

Gäller rader från T0. Inga nya tal: 2 h och 2 dygn är grind S-B:s och S-C:s, 20 km länssidornas.

- **R1 Episod.** En fara (`id`) på en rutt med en nivå, över körningar där den gav en varning med den nivån, så länge det är högst 2 h
  mellan två på varandra följande sådana körningar. Längre glapp eller annan nivå börjar en ny episod. FS-B och FS-C: nivå 2-varning i
  basen eller varianten. FS-A1: varning i basen.
- **R2 Räkneenhet.** En nivå 2-episod och ett svepvärde, representerad av episodens första körning (tidigast `run_at`) med det värdet.
  Senare körningar i episoden med samma värde räknas inte.
- **R3 Domkörningar.** Per svepvärde de rader som representerar minst en räkneenhet, varje rad en gång, samt rader där basen och
  varianten skiljer sig fast ingen har en nivå 2-varning (antalet redovisas). Övriga rader bara som antal.
- **R4 FS-A1.** Täljare: basens episoder med nivå 2. Nämnare: basens episoder om `slippery_segment` och `icing_point`, broarna (`bro:`) på
  nivå 1, `beta` inte medräknad. Alla rader från T0, nämnarraderna med; ett tal, inte per svepvärde. A1:s nivå 2 räknas först när FS-A2
  är uppfyllt.
- **R5 FS-C1.** Per svepvärde: räkneenheter där varianten i den representerande körningen har en nivå 2-varning om faran.
- **R6 Län.** Farans län. `seg:<id>`: `road_conditions.county_nos[1]` (Trafikverkets länsnummer). `wx:<id>`: länet för närmaste
  väglagssträcka inom 20 km (`STATION_LAN_SQL`, `publish/map-core.ts`). Utan träff: okänt — räknas i FS-C1, inte i FS-C2; antalet
  redovisas. FS-C2:s län = olika län bland FS-C1:s enheter, per svepvärde.
- **R7 Halkperiod.** Per svepvärde och län sorteras FS-C1:s enheter i tid; en enhet mer än 2 dygn efter föregående i länet börjar en ny
  länsperiod. Länsperiodernas starter i hela landet sorteras, och samma regel räknar halkperioderna. Enheter utan län räknas inte.
- **R8 FS-B per svepvärde, på domkörningarna.** B1: där båda körningarna har en varning om faran, basens tid minus variantens (första
  varningen i var och en), sekunder; medianen. B2: täljare = per `id` hur många fler varningar basen har än varianten; nämnare = basens
  varningar; noll `accident` bland de saknade. B3: yttranden = alla varningar; följd = yttrande vars föregående ligger högst 60 s före
  (skuggrapportens `foljder_inom_60s`); takt = summa följder / summa yttranden, för basen och varianten var för sig; kravet gäller
  skillnaden i procentenheter. B4: täljare = `nytt`; nämnare = variantens varningar; `kvarKm` = 0,0 (spåret tog slut) redovisas separat
  och står utanför båda.
- **R9 Bruset.** N = andelens nämnare. Varningar i samma körning hänger ihop, så bruset är snarare för smalt; det står i domraden.

**Blindningen** (ersätter meningen *"varningar, nivåer, svepvärden, perioder, län"*, DECISIONS #664): Under FS-C skriver knappen bara antal
rader (totalt, per dygn, före och efter T0), FS-C1:s enheter per svepvärde (också per A1 och A2), FS-C2:s halkperioder och län per
svepvärde med enheterna utan län, FS-A2:s sträckor med kod 3 eller 4, och om FS-C är uppfyllt per värde. Den skriver **inte** A1/A2-
episoder, nivå 1-episoder, basens nivå 2-varningar, domkörningar, varningar i bas eller variant, saknade, nya, följder, yttranden eller
sekunder — ur två sådana tal går en andel att räkna (FS-A1 = nivå 2 / alla). Andelarna med bruset skrivs bara i domläget, 1/3 2027
(`mars-domar`) eller på Bengts uttryckliga beställning, för de värden där FS-C är uppfyllt; FS-A1 när FS-C är uppfyllt för minst ett
värde (samma princip som grind V-B och S-B, DECISIONS #350).

## 6. Domslutet (mars 2027, Axel fäller mot Bengts mätning)

- **KLARAR** (A + B + C) ⇒ valregeln i §3 väljer svepvärdet; steg 7: kroken och nivåerna förs in i tre portar (F4), med vektorer som
  låser nivå 2:s försprång och att nivå 1 och alla andra faror är orörda. Rösten är Axels och ändras inte.
  **Taket är motorns, inte reglagets** (kort #275 väg (a), Bengt 26/9, DECISIONS #419): krokens svar kläms till `DEFAULT_CONFIG.leadMaxM` (3 000 m), och appens reglage *Längsta förvarning* (`leadMaxM` 400–1 200 m) tar bara grundvarningen. Portarna för över klämningen som den står i `engine/src`; provet i `test/forsprang.test.ts` och en vektor låser den. Inget tal i §3 ändras — spannet 400–3 000 m var redan det som mäts.
- **FALLER** ⇒ dokumenterat nej: försprånget förblir 30 s för alla. Nivåerna står kvar som mätinstrument.
- **FÖR LITE UNDERLAG** ⇒ fortsatt skugga en vinter till. Aldrig ett tal på tunn dom.

## 7. Kända luckor — sagt nu, inte efter

- **Skuggans spår svänger aldrig av.** En tidigare varning kan i verkligheten gälla en väg föraren aldrig kör. Skuggan kan inte mäta det;
  betans förarfacit (TROSKLAR-KOMBINATIONEN KB-D) kan. Redovisas, är ingen grind.
- **A1:s nivå vilar på operatören.** Koden sätts för hela segmentet; den säger inget om var på segmentet det är värst.
- **A2:s nivå ärver arkivets bevis.** `vata` bygger på stationens regn; sedan 25/9 finns varma stationer i arkivet (DECISIONS #353), men
  radarn når inte bevisbäraren i snapshoten (fältet är null) och räknas inte.
  *Not 4/10 (DECISIONS #459): `bevis.radar` fylls nu med radarn inom 5 km. Vätan, som A2 läser, räknar fortfarande bara
  stationen. Ingen tröskel i det här dokumentet är ändrad.*

## 8. Ändring

**Ändring efter sett utfall — regel L** (införd 15/10 2026, TROSKLAR-KOMBINATIONEN §5b, DECISIONS #564). En lättnad efter att
utfallet är sett prövas enligt L1–L4 och ersätter detta dokuments mening om att lättnad är utesluten: domen på lästa data står
(L1), lättnaden gäller bara data som ingen har läst (L2), en ändring som flyttar ett sett tal mot godkänt är en lättnad (L3), och
skälet får inte vara utfallet (L4). Den kräver båda signaturerna och en post med det sedda talet. Dokumentets absoluta undantag
står kvar oavsett signaturer, och där dokumentet förbjuder all ändring efter första läsningen blir en lättnad en ny prövning med
egen text och eget domfönster.

Trösklarna i §2–§5 ändras bara med båda signaturerna och en motivering som inte lutar sig mot utfallet (samma regel som varje
tröskeldokument). Efter första lästa andel får inget tal i §3 eller §5 ändras före domen.

*Not 21/10 2026 (DECISIONS #664; Bengt för Bengt och Axel, som #564 och #656–#659):* §4:s population och §5:s räkneregel skrevs före
första lästa andel. Sett: `forsprang_log` 15 rader 14–18/10, en nivå 2-varning per svepvärde (DB-knappen 39633634808, 39638598817) —
antal, ingen andel. Inget tal i §3 eller §5 ändras. L1: ingen dom finns. L2: raderna före T0 redovisas för sig. L3: nej — de 30
rutterna hade inte föreslagits om FS-C1 redan var uppfyllt; den delen prövas som lättnad av underlagsspärren, medan R2–R3 skärper.
L4: skälet är underlaget, inte ett utfall; 2–3 rutter per halvtimme var datorkraftens tak (#359), inte ett val av vad som skulle
mätas. Räkneregeln fryses med sha256 i domknappen (B4-55); efter första lästa andel ändras varken talen i §3 och §5 eller räkneregeln
före domen.
