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
nya minuterna :02/:32 — flytten i kort #244 löste det inte). Försprånget körs därför som eget anrop på **:12/:42**, samma rutter som
halvtimmens huvudvarv, och bara för rutter som har minst en nivå 2-fara i sin ruta. Per sådan rutt körs motorn två gånger på samma spår:
**baskörningen** (dagens motor) och **varianten** (nivå 2 med halvtimmens svepvärde; värdet roterar över de tre så att varje rutt möter
alla). Båda körningarnas varningar och undanträngda (`suppressed`) loggas, med nivån per varning.

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

**Blindningen:** under FS-C skriver knappen bara antal — varningar, nivåer, svepvärden, perioder, län. Andelarna först när C är uppfylld
(samma princip som grind V-B och S-B, DECISIONS #350).

## 6. Domslutet (mars 2027, Axel fäller mot Bengts mätning)

- **KLARAR** (A + B + C) ⇒ valregeln i §3 väljer svepvärdet; steg 7: kroken och nivåerna förs in i tre portar (F4), med vektorer som
  låser nivå 2:s försprång och att nivå 1 och alla andra faror är orörda. Rösten är Axels och ändras inte.
  **Taket är motorns, inte reglagets** (kort #261 väg (a), Bengt 26/9, DECISIONS #381): krokens svar kläms till `DEFAULT_CONFIG.leadMaxM` (3 000 m), och appens reglage *Längsta förvarning* (`leadMaxM` 400–1 200 m) tar bara grundvarningen. Portarna för över klämningen som den står i `engine/src`; provet i `test/forsprang.test.ts` och en vektor låser den. Inget tal i §3 ändras — spannet 400–3 000 m var redan det som mäts.
- **FALLER** ⇒ dokumenterat nej: försprånget förblir 30 s för alla. Nivåerna står kvar som mätinstrument.
- **FÖR LITE UNDERLAG** ⇒ fortsatt skugga en vinter till. Aldrig ett tal på tunn dom.

## 7. Kända luckor — sagt nu, inte efter

- **Skuggans spår svänger aldrig av.** En tidigare varning kan i verkligheten gälla en väg föraren aldrig kör. Skuggan kan inte mäta det;
  betans förarfacit (TROSKLAR-KOMBINATIONEN KB-D) kan. Redovisas, är ingen grind.
- **A1:s nivå vilar på operatören.** Koden sätts för hela segmentet; den säger inget om var på segmentet det är värst.
- **A2:s nivå ärver arkivets bevis.** `vata` bygger på stationens regn; sedan 25/9 finns varma stationer i arkivet (DECISIONS #353), men
  radarn når inte bevisbäraren i snapshoten (fältet är null) och räknas inte.

## 8. Ändring

Trösklarna i §2–§5 ändras bara med båda signaturerna och en motivering som inte lutar sig mot utfallet (samma regel som varje
tröskeldokument). Efter första lästa andel får inget tal i §3 eller §5 ändras före domen.
