# DECISIONS.md — Halkvakt

| # | Date | Decision | Alternatives considered | Why |
|---|------|----------|------------------------|-----|
| 1 | 2026-08-24 | App name: **Halkvakt** | Svartis, Vägvakt, Nordic RoadSafe | Axel's pick; instantly understood by Swedish drivers. "Nordic RoadSafe" retained as possible company/B2B umbrella. |
| 2 | 2026-08-24 | Winter conditions = paid wedge; speed cameras = free bundled extra | Cameras as wedge | Google Maps/Waze/AmiGO ship camera alerts free since 2019; conditions layer is the actual gap. |
| 3 | 2026-08-24 | Android-first, Sweden-only v1; native Kotlin; alert engine as pure module with shared JSON test vectors | React Native/Expo cross-platform | Hard 20% (bg location, audio focus, battery) is platform-specific anyway; native removes a bug class. iOS later reuses test vectors. |
| 4 | 2026-08-24 | Event-driven weather archiving: store obs only if surface ≤5°C, precip, or Δtemp ≥0.5°C | Store everything | Full firehose ≈ >1 GB/winter, breaks Supabase free tier. Policy keeps ~full fidelity exactly when icing matters. |
| 5 | 2026-08-24 | Situation API: schemaversion 1.6 + namespace `road.trafficinfo` (verified live). v1 keeps Accident/Obstruction/AbnormalTraffic/Incident; roadworks excluded as chronic noise | Include roadworks | Roadworks would dominate alert volume and violate alert-discipline budget. Revisit for premium. |
| 6 | 2026-08-24 | On-device matching against CDN snapshots; no user location ever leaves the phone | Server-side matching API | 0 kr at any scale, works offline in Norrland, GDPR posture becomes a marketing claim. |
| 7 | 2026-08-24 | Repo private; GitHub cron at 30 min interim (private-repo free tier = 2000 Actions-min/mo; 5-min cron ≈ 8000). Move ingestion to Supabase pg_cron/Edge Function at 5 min once DB exists | Public repo (unlimited minutes) | PLAN.md contains business/marketing strategy; keep private. |
| 8 | 2026-08-24 | **Map ships first, public, in September** (Claude's call per Axel's delegation). The app is the product; the map is funnel + validation. Waitlist from the map = the closed-test testers Google Play requires | App-first, stealth | Zero cost/risk (open data), and it directly feeds decision #9's tester requirement. |
| 9 | 2026-08-24 | Google Play: start as **privatperson**. Personal accounts (created after Nov 2023) need a closed test with ≥12 testers opted in 14 consecutive days before production — our planned Oct–Nov beta satisfies this by design. Cannot convert personal→org later, but CAN transfer the app to a new org account (needs org.nr + D-U-N-S, takes weeks) when B2B makes it worthwhile | Org account now | Org route = 4–8 weeks D-U-N-S paperwork for zero current benefit. |
| 10 | 2026-08-24 | Waitlist stored in **our own Supabase** (insert-only table, RLS: anon may INSERT, never SELECT). No third-party form service | Tally/Formspree | Zero new accounts, GDPR-cleaner, emails become our beta pipeline directly. |
| 11 | 2026-08-24 | Domain deferred until product warrants it (Axel). Standing mandate confirmed: Claude decides+logs all non-money/law/brand. Beta distribution stays human (Axel posts, Claude drafts) — auto-posting to FB groups is spam and gets accounts banned; capture+onboarding automated instead | Full automation | Authenticity + platform ToS. |

## 12. Alert engine v0 semantics (2026-08-25, Claude)
Beslut vid implementation av PLAN §1, låsta som testvektorer (engine/vectors/):
- **45 s-regeln är hård, utan undantag** — även en olycka väntar inte in i fönstret utan SLÄPPS.
  Enklast möjliga tolkning av spec; omprövas endast på betabevis (t.ex. "olycka bör få bryta efter 15 s").
- **Repris-regeln tolkas som OCH**: samma fara tiger tills BÅDE 10 min gått OCH 5 km körts.
  Strängaste läsningen = minst tjat.
- **Fartspärr 15 km/h** + kontrakt: appen skickar alltid med telefonens dopplerfart när den finns
  (härledd fart ur parkerings-jitter kan se ut som 20 km/h — v12 bevisar fällan).
- **Kamerors riktningsfilter**: varna endast när färdriktning ligger inom 100° från kamerans
  bevakningsriktning (bearing i data); kameror utan bearing varnar åt båda håll.
- Segmentkälla får säga "på vägen framför dig", punktkälla endast "framöver" — kodat i texts.ts,
  låst av invarianttest (inte bara vektorfacit).
- Vektorerna är kontraktet för Kotlin/Swift-portarna: samma JSON in, samma logg ut, byte-identiskt.

## 13. Viltlagret: ärlighet före funktion (2026-08-25, Claude)
Verifierat mot levande data: polisens händelse-API ger LÄNSCENTRUM som koordinat (Jämtlands
alla viltolyckor "ligger" på samma punkt), och flödet är en kurerad rännil (~85 händelser
på ett halvår; Sverige har ~60 000 viltolyckor/år — merparten rapporteras till NVR, inte
polisens flöde). Viltolycka.se är botlåst (403), ingen öppen maskindata funnen.
Beslut:
- **Röstvarning A4 vilande** tills segmentkvalitativ hotspot-data finns. Disciplinregeln
  "säg bara vad datan bär" förbjuder "vanlig olycksplats" på länsnivå. Motor + vektor (v13)
  står redo att slås på.
- **Arkivera polisen-händelser från idag** med väg/art/plats extraherat ur fritexten
  (träff: 67 % väg, 95 % art på riktig data) — månader av detta = egen hotspot-grund.
- **Kartan visar statistik, inte punkter**: ticker på länsnivå ("4 VILTOLYCKOR SENASTE
  VECKAN — MEST REN"). Inga låtsasprickar på länscentrum.
- Framtida A4-väg: eget arkiv + ev. NVDB/Lastkajen (viltstängsel-lager) + NVR-kontakt
  (partnerpitch finns redan i PLAN §8.6 — datadelning kan ingå).

## 14. Snapshots: nationellt först, län-split vilande bakom mätkriterium (2026-08-25, Claude)
PLAN §2 antog per-län-filer (<3 MB gzip/län). Uppmätt verklighet: HELA landet = 65 kB gzip
statiskt (2 771 kameror) + ~0-200 kB live. Länsdelningen löser ett storleksproblem som inte
finns — och hade krävt länspolygoner (ny databeroende). Beslut: nationella filer i v1
(data/app/v1/{manifest,static,live}.json, sha256-manifest). Splitkriterium, mäts varje
publicering: live.json gzip > 1,5 MB två körningar i rad → implementera per-län
(gränser via PostGIS-länstabell). Freshness ärver 30-min-kadensen (beslut #7).
Formatet är motorns vokabulär (inte GeoJSON); engine/src/snapshot.ts är Kotlin-referensen.

## 15. Android-skelettets avgränsningar (2026-08-25, Claude)
- **Manuell start/stopp i v0** — autostart (Activity Recognition/Bluetooth) kommer i Fas 2-
  iterationen; skelettets jobb är att bevisa kedjan GPS→motor→röst på riktig enhet.
- **Endast while-in-use-platsbehörighet**: tjänsten startas i förgrunden av användaren, så
  ACCESS_BACKGROUND_LOCATION behövs inte ännu → Googles granskningsdossier för bakgrunds-
  plats skjuts till autostart-steget (mindre risk vid första Play-inskick).
- **Snapshotuppdatering var 30:e min bygger om motorn** = cooldown-state nollställs.
  Accepterat i skelett; BACKLOG-punkt: engine.updateHazards() i BÅDA implementationerna
  + delad vektor, så tillstånd överlever datauppdatering.
- Kotlin-motorn bevisad identisk med TS via delade vektorer i CI vid varje push (android.yml).

## 16. Grundaren har iPhone (2026-08-25, Claude — köpbeslut hos Axel)
Fakta: Axels enda telefon är en iPhone; Android-appen kan inte köras på den. Konsekvenser:
- **Android-först står fast** (beslut #3-skälen gäller oberoende av grundarens telefon:
  bakgrundstjänster, kostnad, sideload-beta utan granskningsgrind).
- **Rekommendation till Axel: begagnad Samsung Galaxy A-serie ~800–1 500 kr**
  (Blocket/Tradera/Webhallen outlet) som testenhet. SIM-kort behövs INTE: GPS är
  fristående, TTS är lokal, snapshots cacheas + iPhone-hotspot i bilen räcker.
  Samsung specifikt: Sveriges vanligaste Android + värsta batteridödar-OEM:en =
  exakt den hårdvara betan möter. Pengafråga → Axels beslut.
- **Claude bygger emulatortest i CI** (ny BACKLOG-punkt): appen bootas och matas med
  mock-GPS-replay i Actions — kedjan GPS→motor→TTS-anrop verifieras utan människa.
  Axels enhet behövs då bara för det riktiga: Bluetooth-ljud, batteri, OEM-beteende.
- **iOS-prioritet omprövas vid Fas 3-grinden** (tidigare än plan): Sverige är ~60 % iOS
  och grundaren kan inte dogfooda sin egen produkt förrän Swift-porten finns.
  Motorvektorerna är plattformsfria by design — porten är förberedd.
- Play-kontot imorgon påverkas INTE (det är för publicering, inte Axels enhet).

## 17. iOS lyfts från "Fas 5 kanske" till åtagande (2026-08-25, Axel + Claude)
Axel: "iOS är något vi måste ha support för." Verkställt samma kväll:
- **Swift-motorn FINNS och är bevisad**: ios/HalkvaktEngine klarar alla delade vektorer +
  Skånefixturen identiskt med TS och Kotlin. Tre runtimes, ett fruset facit, CI-vaktat
  (ios-engine.yml — körs på Linux, gratis; macOS-minuter behövs först för själva appen).
- **Sekvens**: Android-betan (okt) förblir först — Fas 0-domen måste falla innan två appar
  underhålls. iOS-APPEN startas vid Fas 3-grinden om betasignalen är god: TestFlight-beta
  nov, publik iOS-lansering i eller strax efter Android-fönstret (dec/jan).
- **Axels pengagrind i okt**: Apple Developer Program 99 USD/år (~1 050 kr).
- Kartan/butiken visar "iOS kommer" från dag ett; väntelistan fångar iPhone-användare.
- Vektordesignregel ur porten: eligibility-gränser får aldrig ligga <~1 m från en
  fixposition (v08 låg 2 cm från en — avgjordes av plattformarnas libm-avrundning,
  inte av semantik; flyttad till robust marginal, alla tre sviter omkörda gröna).

## 18. GTM utan grundarens privata kanaler (2026-08-25, Axel + Claude)
Axel vill inte posta från egna sociala konton. Planen byggs om (docs/GTM.md):
1) Flashback/Reddit via anonymt projektkonto, 2) Halkvakt-varumärkessida + liten
betald budget (500 kr beta, 3–5 tkr vid första snön — geo-styrd av VÅR snödata),
3) direktutskick till trafikskolor/åkerier (väntar på halkvakt.se-mejl),
4) press som huvudkanon vid betaöppning + första snökaoset. REKRYTERING.md:s
gruppinlägg degraderas till reserv. Öppet Axels-val till okt: namn i press eller
"teamet bakom"; Flashback-postning själv (anonym) eller lita helt på annonser.
Sajten uppgraderad samtidigt: röstdemo-knapp (produkten PÅ sidan), og.png
(delningskort — kritiskt för forumspridning), favicon, kö-räknare (visas ≥25,
publiceras ur DB var 30:e min), kartpanelens "november" rättad till oktober-beta.


## Beslut #20 · Kvittot: scrollytelling-final + betaspråket rivs (2026-08-25)
**Beslut (Axel):** Sista skärmen görs i samma scrollspråk som världen: skärmen fastnar, fyra rader (Halka/Vilt/Olyckor/Fartkameror) landar en i taget, sist stiger Google Play- och App Store-knappar upp ("Släpps i vinter") med live-läget under (olyckor/vilt/halka/klockslag ur egen data). Allt beta-testarspråk bort från sajten — iOS och Android släpps tillsammans. Mejlfångst kvar som diskret "mejl på släppdagen"-rad i sidfoten (source: release).
**Tillägg (samma dag, Axel):** Kvittot v2 = "Filmremsan": fyra stående filmpaneler sida vid sida (lätt lutade skiljelinjer, som Axels whiteboard-skiss), nya klipp utan repris av världens — Halka 3316 (bilar i snöig kurva), Vilt 10076 (hjort stirrar in i kameran), Olyckor 17376 (blåljusramp), Kameror 64 (hastighetsmätare). Snabbare rytm (240vh, tändning vid 12/27/42/57 %), final vid 74 %: panelerna dimmas och Google Play/App Store-knapparna stiger till skärmens mitt med live-raden. Klippen lat-laddas (preload none + IntersectionObserver) och är tysta loopar = autoplay-säkra på iOS.
**Teknisk läxa:** `overflow-x:hidden` på html/body (motorns) gör dem till scrollcontainers → `position:sticky` dör tyst. Kur: `overflow-x:clip` + gemensamt bakgrundsbälte i stället för inset:-100vw-hack. Playwright-mätning i wrappade element: använd getBoundingClientRect().top+scrollY, aldrig offsetTop (räknas mot närmsta position:relative-förälder).

## Beslut #21 · Logotypen: "Skylten" (2026-08-25)
**Beslut (Axel):** Halkvakts märke = varningstriangel i varselgult med två vågiga slirspår — vägmärkesspråket gjort till vårt. Valdes ur fyra kandidater (Rutan/Skylten/Flingvägen/Rösten); bil-varianten förkastad efter fyra iterationer (lästes som figur i små storlekar — spåren ensamma bär symbolen bättre).
**Utrullat:** favicon.png (128, transparent), logo.svg i karta-repot, topprad (.sw-brand__mark-override) och svarta finalen (data-URI-SVG). 512-master renderad för appikon/butik (halkvakt-logo-512.png). Kvar: og.png bär gamla rutan — byts vid nästa og-jobb; appikon genereras ur mastern i oktober.
**Läxa:** regex-rivningar med `.*?` mellan CSS-block slukar grannregler — .hv-logo-stilarna försvann osedda och finalen stod naken tills skärmdump avslöjade det. Vid blockkirurgi: kontrollera att intilliggande regler överlever, inte bara att målet försvann.

## Beslut #22 · Minutdiet + vakthund för livemotorn (2026-08-25)
**Problem:** Actions förbrukade ~3 600 min/mån (gratistak 2 000, Axels billing okontrollerad) — tar minuterna slut stannar väder/kameror/publicering/larm. Samtidigt saknade livemotorn (pg_cron, varje minut) egen övervakning.
**Beslut (Claude):** Sedan livemotorn äger minutfärskheten för deviations/road_conditions kan GitHub-flödet gå på diet utan att webben blir äldre: ingest timvis (väder/kameror/polisen/smhi + reserv), publish-map på egen 30-min-klocka mot den minutfärska databasen (+concurrency-lås), healthcheck varannan timme. Uppskattat ~1 750 min/mån — under gratistaket med marginal. Webbens värsta ålder oförändrad (~35 min), deviations/vägläge på kartan t.o.m. färskare än förr.
**Vakthund:** hälsokollen fick per-käll-trösklar (deviations/road_conditions 15 min — livemotorlarm; övriga 150 min) plus direktpuls på pg_cron-jobbets senaste körning (status failed ⇒ incident-issue). Skarpverifierad mot produktion: limit-15-rader + "livemotor cron: succeeded" i körlogg, HEALTHY.
**Läxa (igen!):** produktionens källnamn ≠ minnesbilden — LIMITS skrevs först mot situations/roadcondition, loggen avslöjade deviations/road_conditions. Regeln står sig: läs verklig data innan man skriver mot den, och verifiera med kvitto ur loggen.

## Beslut #19 · tillägg: livemotorn härdad (2026-08-25 kväll)
Edge-funktionen `ingest-live` var öppen (deployad `--no-verify-jwt`). Nu fail-closed på delad
hemlighet: secret `INGEST_KEY` + header `x-halkvakt-key` i cron-jobbet (cron.alter_job, jobid 1).
Verifierat i produktion: anrop utan nyckel → 403, med nyckel → ok, cron-pulsen fortsatt
succeeded med färska kursorer (0,7 min). Felsökning + rotation dokumenterad i RUNBOOK
("Livemotorn"). Nyckelvärdet finns ENDAST i Supabase (secret + cron-kommando) — aldrig i repo.


## #23 — Samtidig lansering iOS + Android (2026-08-27)
DAVIDS BESLUT (produkt/strategi = hans nyckel): båda plattformarna lanseras
tillsammans; Play- och Apple-konton öppnas måndag (lön). Claudes tidigare råd
(Android först) gavs och hördes; beslutet respekteras utan omprövning.
Taktisk konsekvens: Apple saknar 14-dagarskarantän ⇒ lanseringsdatum styrs
fortfarande av Googles klocka; iOS-spåret kostar inte datumet så länge
Play-processen startar måndag. Macen blir kritisk byggresurs (ios/MAC-GUIDE.md).
SwiftUI-appen skriven i dag som spegel av Android v0.3.0 (samma flikar, samma
svenska, samma motorkontrakt); FÖRSTA BYGGET sker på Axels Mac — koden är
oprövad tills dess och förväntas behöva ett justeringsvarv med skärmbilder.
Samsung struken ur Axels nycklar (finns ej); fysisk Android-testenhet =
öppen fråga (pappa? begagnad?).


## #24 — Åldersvakt, SYSTEM.md-disciplin, apptext-ärlighet (2026-08-28)
Ur Bengts kodgranskning (första sedan collaborator-skapet — träffade en äkta
säkerhetslucka): appen läste aldrig generated_at och kunde tala lugnt på timmar
gammal data när servern stod still, med både falsklarm och missar som följd.
ÅTGÄRD (båda plattformar): AgeGate FÖRE motorn (väglag >45 min bort, olyckor
>2 h, statiska består), UI visar datans tid ("väglag HH:mm"), EN röstrad per
körning vid passerad tröskel. Motorkontraktet orört — vakten är policy, inte
motor. Prov: AgeGateTest (3 fall).
REGEL: commit som ändrar regel/källa/rösttext ändrar docs/SYSTEM.md i samma
commit. Bengt läser SYSTEM.md mot koden månadsvis.
APPTEXT: "Varnar vid Trafikverkets mätstationer och rapporterade väglag" in i
OM-fliken — löftet följer källans täckning.
Bokfört även: #19 missmätningsskriptet (Bengts design: SMHI+Situation-händelser
× referensrutter → träffar/missar per vecka).


## #25 — Bengts repogranskning II: facit & mätning (2026-08-28)
Bengt gick igenom hela repot (88 commits) med marsfrågan i fokus: fångar vi
datan som behövs när vintern ska utvärderas? Hans dom: arkivlagret är repots
viktigaste egenskap ("vad visade VViS i Hörby 06:10 14 jan" går att svara på).
BESLUT ur granskningen:
a) **Prognosfriheten är ett MEDVETET val** (härmed bokfört, Bengts punkt 2):
   motorn varnar på uppmätt läge, inte prognos — få falsklarm, ärligt. MESAN/
   Nowcast-lagret = backlog #16, efter release.
b) **Kamerafacit + skuggmotor byggs** (server-side, rör ej apparna/löftet):
   backlog #20, deadline FÖRE FÖRSTA FROSTEN. Väglagskamerabilder är det
   billigaste facit och dagens enda oåterkalleliga dataförlust.
c) **Retention mäts löftesrent via Play Console-statistiken** (Googles egna
   aggregat: installationer/aktiva enheter — kräver noll telemetri från oss).
d) **Anonym puls + feedback-knapp = VILANDE AXEL-BESLUT** (backlog #21): även
   opt-in-aggregat bryter formuleringen "vi samlar in: ingenting" och kräver
   omskriven policy/butikstext/Data safety. Claudes råd: paketera med sensor-
   beslutet våren 2027; v1 mäter via Play-statistik + skuggmotor.
e) **Rollfördelning** (Bengts förslag: efterfrågan/affärsmodell/B2B = hans):
   AXELS BESLUT — kort på tavlan; PLAN uppdateras när Axel bekräftat.


## #26 — Pulsklockan + healthcheckens klippta koppel (2026-08-29)
Fynd vid verifiering: publiceringen stod stilla i 5 h — GitHubs schemaläggare
svälter cron (ingest-hål på 13 h uppmätta). Healthchecken UPPTÄCKTE stoppet
("UNHEALTHY ... publish-map står stilla?") men jobbet blev grönt: `| tee` utan
pipefail åt upp exit-koden. Bengts mening bokstavligen: vakthunden ser, signalen
når inte fram.
BESLUT: (a) taktpinnen flyttad till Supabase pg_cron (bevisat pålitlig) som
trycker på GitHubs workflow_dispatch — publish */30, ingest timvis; GitHub-cron
kvar som hängslen. (b) `shell: bash` i healthcheck (pipefail) — rött jobb ⇒
mejlnotis. LÄXA (järnlag): en vakt är inte en vakt förrän dess LARMVÄG är
provad — testa alltid felfallet, inte bara koden.

## #27 — Viljeinriktning: Halkvakt ska generera intäkter (Axel 2026-08-29)
Ägarbeslut: projektet ska bli en betalande verksamhet. RAMAR (Claudes råd,
Axel informerad): grundvarningen för konsument förblir GRATIS genom vintern
(Skyltfondsansökans beskrivning, kallstarten, varumärket). Intäktsordning:
(1) B2B-morgonöversikten — piloterna konverteras till betalavtal våren 2027;
(2) skolmomentet per elev; (3) ev. konsument-premium där #15 kö-slut (egen-
finansierad) är kandidat men #16 prognoslagret (fondfinansierat) hålls öppet
projektperioden ut. Modellens utformning = B2B-spåret (Bengt, vid Axels ja
på rollfördelningen). Bolagsform följer intäkterna (AB när avtal tecknas),
inte tvärtom.
## #28 (30/8 2026) Olycksprincipen — rösten före kartan
Halkvakt bygger aldrig egen navigering/omvägsberäkning. Vår fördel är
Trafikverkets officiella rapport FÖRE köbildning: därför graderas olycksrepliker
efter allvarlighet och det allvarliga sägs TIDIGT (10 km, medan avfarter
återstår) med "överväg annan väg" — förarens kartapp exekverar omvägen.
Inga skärmknappar under körning (heads-down-principen, jfr #23).

## #29 (31/8 2026) Utgivarnamnet: Lagerlöf Labs
Ägarbeslut (Axel). Gemensamt utgivarvarumärke för alla appar från Axel & Bengt.
Konsekvenser: bundle-ID-mönster `se.lagerloflabs.<app>` för nya appar (Halkvakt
behåller `se.halkvakt.app`); domäner lagerloflabs.com/.app/.se lediga 31/8 —
köps vid behov; App Store visar juridiskt namn tills organisation finns, då byts
säljarnamnet till Lagerlöf Labs (AB/förening). Namnet används redan nu i
butikstexter, webb och e-postsignaturer där varumärke efterfrågas.

## ÖPPET ÄGARBESLUT (31/8): Bengts höstplan — tidsfördelning TågRätt/Halkvakt
Bengts plan (25/8, Drive "Halkvakt mm"): TågRätt lanseras 1 jan 2027 och har
företräde i Axels 8–10 h/vecka; "september helt utan Halkvakt"; Halkvakt-MVP i
november. Planen skrevs före veckans sprint — Halkvakt är nu i TestFlight, MVP:t
finns. Kvar att besluta: tidsregeln (TågRätt vinner konflikter?) och vad "resttid"
betyder när Claude bär byggandet. Bengts svar väntar: JA/NEJ/ändrat.
Bengts öppna granskningsfrågor — SVAR: ålderströskeln för live.json ÄR byggd
(åldersvakten, "väglag HH:mm", DECISIONS #26); docs/SYSTEM.md FINNS; RLS = kort #30.

## #30 (31/8 2026) Olyckslyftet, implementationsvalen (Claude, inom Axels princip #28)
Fyra val gjorda under bygget av #28. Alla mätta, inget gissat.

**a) Tröskeln går vid SeverityCode ≥ 4.** Uppmätt i vårt eget arkiv: Trafikverket
använder 1 Ingen påverkan, 2 Liten, 4 Stor, 5 Mycket stor — kod 3 förekommer inte.
Axels spec sade "stor påverkan", vilket är 4. KONSEKVENS SOM AXEL BÖR VETA: av 307
arkiverade olyckor är 206 klassade 4–5, alltså två tredjedelar. "Allvarlig" är inte
ett sällsynt undantag i den här datan. Tröskeln ligger därför som ett reglage
(`accidentSeriousMinSeverity`) — flytt till 5 är en siffra, inte en omskrivning,
och skulle ge ungefär en tredjedel i stället. ÖPPET: Axel har inte omprövat 4.

**b) Röjningstiden formateras i publiceringssteget, aldrig i motorn.** Motorn läser
inga klockor och kan inga tidszoner — det är dess grundlag. Hade HH:MM-formateringen
legat där kunde Node, JVM och Swift gett olika svar och den byte-identiska parvisheten
spruckit. `slut` skrivs som färdig "HH:MM" i Europe/Stockholm av build-snapshot,
provad över både sommar- och vintertid.

**c) Tvåstegsvarningen bryter repris-regeln — men regeln försvagades INTE.** Två
varningsplatser per allvarlig olycka ("<id>#early" / "<id>#near") håller stegen isär
i motorns minne. Invarianten i test/engine.test.ts gjordes SKARPARE i stället för
lösare: undantaget kräver att larmet är en olycka, att andra repliken är exakt
påminnelsetexten, att första var det allvarliga ropet, att det är precis två, att
andra är närmare, och att de ligger minst 45 s isär. Sex villkor. Alternativet —
att sänka repeatMinS — hade öppnat för tjat överallt.

**d) Steget syns inte i Alert-objektet.** Det bor internt som varningsnyckel. Därmed
behövde ingen av de 14 frysta vektorerna regenereras, och loggformatet är oförändrat
i alla tre körtiderna. Backloggens formulering "stegmedvetna varnings-id" är alltså
uppfylld där den behövs, utan att kontraktet rörs.

**Skyddsräcke:** graderingen är låst till `message_type_value = "Accident"`. Den nya
repliken säger ordet "olycka" högt och får bara utlösas av något Trafikverket självt
klassat som olycka. Övriga avvikelsetyper faller igenom till den gamla mildare texten.

## #31 (31/8 2026) Gravstensläckan — raderingar blir UPDATE, aldrig INSERT (Claude)
Uppmätt: 4 890 av 4 892 rader i `deviations` var raderade, och 4 584 av dem tillhörde
typer vi aldrig lagrat levande. Orsak: `if (!KEEP.has(x) && !s.Deleted) continue;` — en
rad med två effekter, där den andra var osynlig. `&& !s.Deleted` fanns av god anledning
(en röjd olycka MÅSTE kunna släckas i appen, annars varnas det för något som är borta),
men den släppte samtidigt in varje radering av varje typ som en ny rad.

BESLUT: raderingar hanteras separat och som UPDATE. De kan då fortfarande städa allt vi
trackar, men aldrig skapa en rad för något vi inte skeppar. Gäller båda ingestvägarna
(GitHub-jobbet och livemotorns edge function — de var identiskt drabbade).

BESLUT: KEEP smalnas till {"Accident"} — vilket är vad vi FAKTISKT skeppat hela tiden.
Koden slutar därmed påstå en räckvidd den aldrig haft. DECISIONS #5:s ursprungliga avsikt
("olyckor + hinder") är inte övergiven, den är flyttad till kort #32 där den hör hemma:
som ett produktbeslut om vad rösten säger, inte som en tyst stavfelsrättning.

AVVÄGNING SOM AXEL BÖR KÄNNA TILL: missar.ts (#19) läser deviations utan deleted-filter
och använde gravstenarna som facit. Uppmätt förlust idag = noll (inga av 4 892 rader
träffar halk-regexet i augusti). I vinter kan det ändras. Kort #33 löser det rätt, med
ett eget arkivbord i stället för att smutsa ner livetabellen.

EJ GJORT: de 4 584 befintliga gravstenarna ligger kvar. Läckan är tätad så de slutar växa.
Städning är irreversibel och väntar på Axels ja.

## #32 (31/8 2026) RLS-låset — anon-nyckeln kunde skriva i arkivet (Claude, Bengts issue #3)
UPPMÄTT FÖRE: RLS av på 11 av 13 tabeller, en enda policy i hela databasen. Anon-nyckeln
(publicerad i halkvakt-karta/data/config.json för väntelistan — det är meningen) kunde
SELECT:a åtta arkivtabeller rått, och PATCH mot ett påhittat id gav 204: skrivrättighet
fanns. Vem som helst med kartans config kunde alltså lägga in en falsk olycka eller radera
riktiga väglag — och snapshoten som apparna talar ur byggs ur exakt de tabellerna.

BESLUT: två oberoende lås (hängslen och livrem). (1) RLS på utan policy för anon/
authenticated ⇒ nekat som standard. (2) Rättigheterna REVOKE:ade från samma roller ⇒ nekat
även om någon klickar av RLS i framtiden. Default privileges smalnade så nya tabeller inte
föds öppna. waitlist behåller sin INSERT-policy (DECISIONS #10) och får nu en GRANT som
matchar exakt: INSERT, inget annat.

UPPMÄTT EFTER: 401 permission denied på alla läs- och skrivförsök med anon-nyckeln;
väntelistan svarar 201 på insert; edge-funktionen läser shadow_log; CI-ingest grön efter
låset. Pipelinen är orörd eftersom allt kopplar som postgres-rollen via DATABASE_URL, som
kringgår RLS. Migration: sql/002_rls_lockdown.sql, idempotent.

VARFÖR INTE BARA RLS: RLS-flaggan är en klickruta i Supabase-panelen. Ett REVOKE överlever
klicket. Och tvärtom — ett GRANT kan smyga in via default privileges. Därför båda.

## #30a — TRÖSKELN AVGJORD: 5 (Axel 31/8, "kör på det du tycker")
Uppmätt: tröskel 4 gav tvåsteget för 206 av 307 olyckor. "Överväg annan väg" som sägs
i två tredjedelar av fallen förlorar sin tyngd. Tystnad är en funktion. Vid 5 ("Mycket
stor påverkan") sägs det när det är stopp på riktigt; severity 4 får fortfarande den
lindriga repliken. Låst i tre körtider och i v17, som nu bevisar att 4 är lindrig.
Omprövas på betabevis — det är en siffra.

## #31 — TILLÄGG: gravstenarna raderade + läckan var INTE tätad förrän deploy
Två saker hände efter första commiten. (a) Gravstenar fortsatte komma in i 20 minuter
efter pushen: edge-funktionen ingest-live kör ur Supabase, inte ur repot — en ändrad
fil är ingen deploy. Deployad 08:53, verifierad stillastående räknare + rullande kursor.
Läxa i CLAUDE.md. (b) De 4 587 befintliga gravstenarna exporterade till
sql/arkiv/gravstenar_2026-08-31.json.gz (239 kB) och raderade. Kvar: 308 rader, alla
olyckor. Reversibelt via exporten.

## #33 (31/8 2026) Två tabeller, två sanningar: live och arkiv (Claude)
`deviations` svarar på "vad får appen varna för NU" — bara olyckor, raderas när Trafikverket
röjer. `situation_archive` svarar på "vad HÄNDE" — tio allow-listade typer, insert vid
första syn, uppdateras vid återsyn, raderas aldrig av ingest. Gravstenarna var de två
sanningarna hoprörda i en tabell; nu har varje fråga sin egen.

Allow-listan (uppmätt volym 7 dygn): Accident, WeatherRelatedRoadConditions,
NonWeatherRelatedRoadConditions, PoorEnvironmentConditions, EnvironmentalObstruction,
AnimalPresenceObstruction, VehicleObstruction, GeneralObstruction, AbnormalTraffic,
AffectedCarriagewayAndLanes. Utestängt: MaintenanceWorks + RoadOrCarriagewayOrLaneManagement
= 62 % av flödet, chronic noise per DECISIONS #5. Kvar ~210 rader/dygn, ~77 000/år, små
rader — långt under gratistaket. Omprövas om en utestängd typ visar sig bära halkfacit.

## #34 (31/8 2026) Autostart utan CarPlay — starta tyst om du kan, visa dig om du måste
Axels egen bil: ingen CarPlay, kartan på mobilen. Bluetooth-utlösaren i #22 var ett
antagande om bilen, inte om föraren. Beslut: (a) guiden erbjuder FYRA utlösare —
Bluetooth, Fokus "Kör" (iOS motsvarighet till Androids rörelseigenkänning), kartappen
öppnas, laddaren ansluts — och användaren väljer. (b) StartGuardIntent byter från
openAppWhenRun till ForegroundContinuableIntent (iOS 17): med "Alltid" startar vakten i
bakgrunden och kartan stannar på skärmen; med "Vid användning" tas appen fram bara
den stund som krävs. Det gör "när kartappen öppnas" till en ren upplevelse i stället
för att Halkvakt lägger sig över kartan man just öppnade.

## #35 (31/8 2026) Självstopp: en vakt som startade själv ska sluta själv (Axels fråga)
Axel: "vad är enklast för användaren?" Svaret var att alla fyra utlösarna krävde TVÅ
automationer — start och stopp — och att kartappens stopp ("App stängs") triggar när
appen lämnar förgrunden, alltså även när man sveper till ett meddelande mitt i
körningen. Farligt. Beslut: iOS-vakten stoppar sig själv efter 15 min stillastående
(< 5 km/h), tyst. Då räcker EN automation, vilken utlösare som helst. Spegel av Androids
onVehicleExit, men tidsbaserad — iOS saknar rörelsesignalen utan extra behörighet.
Guidens rekommendationsordning: Bluetooth om bilen har det (precisast, bara din bil),
annars Fokus Kör (automatisk, fångar pendlingen), kartappen som komplement (missar
resor utan karta — pendlingen, där halkan överraskar). En kvart valdes för att
överleva en macka på macken; omprövas på betabevis.

## #36 (31/8 2026) Introduktionen först (Axels fråga)
Utlösaren för autostart sätts en gång och sedan aldrig mer — då ska det vara det första
man gör, inte något man hittar under Inställningar en vecka senare. iOS: fullscreen-intro
vid första start, fyra sidor i ordning — löftet, platsen, bannern, autostarten — allt
hoppbart, allt ändringsbart, visas igen från Inställningar. Platsen begärs där UTAN att
vakten startar (ny requestLocationPermission + startRequested-vakt i delegaten: tidigare
startade vakten i soffan i samma sekund tillståndet gavs). Android får samma intro i
nästa varv — inte nu, iOS är testplattformen.

## #37 (31/8 2026) En fråga före stegen (Axels fråga: "min setup är olik pappas")
Autostart-guiden ställer EN fråga — hur kopplas telefonen i bilen? — och visar bara
de steg som gäller svaret. CarPlay ⇒ utlösaren "CarPlay → Ansluts" (finns i Genvägar,
precisare än Bluetooth: startar när bilens skärm tänds). Bluetooth ⇒ "Är ansluten".
Inte alls ⇒ Fokus Kör, med kartappen som frivillig andra automation. Svaret sparas
(Prefs.carSetup) så Inställningar visar samma guide, bytbart. Bengt ska aldrig läsa
om Fokus Kör; Axel aldrig om CarPlay.

## #38 (31/8 2026) Förenklingen: Siri är autostarten, Genvägar är valfritt (Axel: "vi måste förenkla detta mycket")
Axel byggde automationen själv, med guide, deeplink och mig i chatten — och sa ändå att
det var för svårt. Då är det för svårt. Insikten: det finns redan en start som kräver
NOLL inställningar. "Hej Siri, starta Halkvakt" fungerar direkt efter installation
eftersom App Shortcuts registreras vid install, handsfree, med telefonen i facket.
BESLUT: introduktionens sida fyra blir "Du är klar" med två sätt att starta — knappen
och Siri. Genvägar-guiden flyttas till Inställningar, märkt valfritt, med engelska
termer i parentes (Axels telefon är engelsk; alla testare är inte svenskspråkiga i
systemet). Självstoppet gör att en start räcker. NÄSTA STEG (kort): en startknapp på
låsskärmen (widget, iOS 17) och i Kontrollcenter (iOS 18) — ett tryck utan att låsa upp,
byggt på samma intent. Det är den riktiga förenklingen på sikt; Siri är den idag.

## #39 (31/8 2026) Automationer kan inte scriptas — kvitto, bilder, film, och fysiska knappar
Axel: "kan man skriva ett script som de kan pasta in?" Nej. Apple tillåter varken att
appar skapar personliga automationer eller att automationer delas/importeras. Åtgärden
kan delas, utlösaren måste varje användare bygga själv. Beslut i tre lager:
(1) KVITTO — byggt: StartGuardIntent stämplar lastIntentStartAt; guiden visar
"Fungerar — startades utifrån HH:mm". Användaren slipper vänta till bilen för att veta.
(2) BILDER + FILM — kort: skärmbild per steg med ringad knapp, inbakade offline; 15 s
skärminspelning per spår på kartsajten med "Se hur det görs". Axels inspelningar 31/8
är råmaterial för Inte alls-spåret; Bengt tar CarPlay.
(3) EN-INSTÄLLNINGS-STARTER i stället för automation — kort: låsskärmswidget,
Kontrollcenter-kontroll (iOS 18), och ÅTGÄRDSKNAPPEN (iPhone 15 Pro+): Inställningar →
Åtgärdsknapp → Genväg → Starta vakten. Fysisk knapp, ett tryck. De flesta kommer aldrig
bygga en automation hur bra guiden än blir; Siri och knappar är produkten, automationen
är för entusiasten.

## #40 (31/8 2026) Vakna själv: betydande förflyttning är iOS:s rörelseigenkänning (Axel: "kommer folk komma ihåg Siri varje gång?")
Nej, det kommer de inte. Och jag hade fel om Apples lås: det gäller BLUETOOTH (appar får
inte vakna när bilen kopplar), inte PLATS. Med "Alltid" får en app begära
startMonitoringSignificantLocationChanges — iOS väcker den vid ~500 m förflyttning även
när den är helt stängd (relansering i bakgrunden, dokumenterat). BYGGT: vid väckning
provar vi full positionsström i högst 90 s; ≥ 15 km/h ⇒ vakten startar på riktigt, annars
somnar vi om. Manuellt stopp blockerar självstart i 10 min; självstopp gör det inte.
Standard PÅ, avstängbart. Pris: start några minuter in i resan, och Alltid krävs.
KONSEKVENS: introduktionen krymper till EN viktig fråga — säg ja till Alltid. Siri och
Genvägar blir "starta i första metern", inte förutsättningen. Detta borde byggts i morse
i stället för Genvägar-varven; Genvägar-arbetet är inte bortkastat (kvar som snabbväg)
men det var fel huvudväg. Version 0.3.2 (5).

## #41 (31/8 2026) Parkeringsstaketet: geofence på 150 m runt sista platsen (Axel: "vet vi inte farten?")
Fart mäts bara när appen är vaken — stängd app har ingen som mäter, iOS tillåter inte
lyssnande GPS. Väckningar Apple erbjuder: betydande förflyttning (~500 m, ≤ var 5:e min),
region-utträde, push. Fart är inte en. BYGGT: när vakten stoppar läggs en 150 m-cirkel
runt bilens sista plats; iOS väcker oss vid utträde, typiskt inom ett par hundra meter och
en minut. Betydande förflyttning kvar som reserv för första resan (ingen känd parkering).
Fartprovet (≥ 15 km/h i ≤ 90 s) avgör sedan om det är bil eller promenad. Förväntad
väckning: stad ~200–500 m, landsväg något längre. MÄTS på Bengts och Axels pendling
innan det skrivs som löfte i produktboken.

## #42 (31/8 2026) Finland: arkivet börjar före produkten (Axel: "vi kan sätta upp fejkresor")
BYGGT samma kväll. Eget schema `fi` med kopior av de svenska tabellerna — isolerat, fött
låst, ingen svensk fråga rör det. ingest/fi.ts hämtar Fintraffics 526 vägväderstationer
(TIE_1 vägyta, ILMA luft, SADE, KELI_1 väglagskod med klartext) och aktiva
trafikmeddelanden med geometri, var 30:e min, samma arkivpolicy som Sverige (DECISIONS #4).
Vägarbeten ("tietyö") stängs ute som i #5. Första körningen: 526 stationer, 10 händelser,
0 rader i svenska tabeller. Fynd: KELI_1 = 0 är "sensor fault" ⇒ TIE_1 ska ignoreras.
NÄSTA VARV: tre finska skuggrutter i skuggmotorn (E18 Åbo–Helsingfors, vt4/E75
Helsingfors–Lahtis, vt8 Vasa–Uleåborg) så "fejkresorna" kör. Inga användare, ingen röst —
Finland får en vinter av facit i mars 2027 utan att en enda finne märker något.

## #43 (31/8 2026) Skuggmotorn buntas, inte klistras — och Finland kör (Axel: "visa de finska bilarna också")
FYND: supabase/functions/skuggmotor/index.ts bar en HANDKLISTRAD kopia av engine/src från
före dagens arbete. Skuggflottan körde alltså hela 31/8 utan olyckslyftet — de tre
olycksreplikerna på rapportsidan var den gamla texten, och "levande testdata för #28"
var sant för snapshoten men inte för motorn. Beslut: index.ts är nu GENERERAD av
scripts/bundle-skuggmotor.ts ur engine/src + main.ts; CI fallerar om den driver.
FINLAND: ?land=fi kör tre rutter mot data/app/fi/v1 (build-snapshot-fi.ts i publiceringen),
loggar med land='FI' i shadow_log, cron 15,45. Rapporten tar ?land, sidan har SE/FI-växel.
Bevisat: 4 814 fixar, 0 larm (augusti), Sverige orörd. Facit-bilder bara i Sverige.

## #44 (31/8 2026) Tjugo finska testbilar — och samma olycksregel som Sverige
Axel: "kan vi köra 20 bilar här med?" Ja: E18-stråket Åbo–Helsingfors–Kotka–Vaalimaa,
vt2, vt3, vt4/E75 hela vägen Helsingfors–Rovaniemi, vt5, vt6, vt8 hela kusten, vt9,
vt20 Uleåborg–Kuusamo, E8 Torneå–Kilpisjärvi. Samma rotation som Sverige (3 per varv).
Första varvet talade E18 Helsingfors–Kotka "Olycka rapporterad" om något som troligen
var en avstängning — min finska snapshot släppte igenom ALLA trafikmeddelanden till
olycksfacket. Rättat: bara message_type_value='Accident' når rösten, som i Sverige.
Hinder får egen röst först med #32, i båda länderna samtidigt.

## #45 (31/8 2026) Danmark i skuggan — grästemperatur som frysproxy, öppet flöde som händelsekälla
Axel: Danmark hade en brutal vinter 2025/26 ⇒ upp i prio, "kör vidare". BYGGT: schema dk,
ingest/dk.ts, ingest-dk.yml var 30:e min, 20 danska rutter, cron 20,50, kartan + rapporten.
Händelser: Vejdirektoratets publika trafikkort-flöde (odokumenterat, stabilt sedan 2020,
DATEX-klassade — Accident/AbnormalTraffic/WeatherRelatedRoadConditions m.fl.). Byt till
NAP-flödet med gratisnyckel före produktion. Frysrisk: DMI:s GRÄSTEMPERATUR (temp_grass) i
surface_temp_c, märkt 'grass'. Danska VÄGYTESTATIONERNA ligger i VejVejr bakom avtal.
ÖPPET FÖR AXEL: räcker grästemperatur som grund för att rösten säger "frysrisk" i Danmark,
eller ska Bengt ringa Vejdirektoratet om VejVejr? Arkivet är ärligt oavsett; rösten väntar.
Uppmätt: 23 DMI-stationer rapporterar grästemp (tunt men riktigt), 41 händelser varav 8
olyckor och 4 halkrapporter — i augusti. Första varvet: 3 rutter, 0 larm, korrekt.

## #46 (31/8 2026) Kvitto för självväckningen (Axel: "hur vet vi om den startade automatiskt?")
Hålet: en självväckning som lyckas TYST lämnar inget spår — "Senast sagt" fylls bara om
rösten talade, och knappen visar bara nuläget. Bengt kan ha en perfekt vakt utan bevis.
Byggt till 0.3.3 (6): Prefs.lastAutoWakeAt + lastAutoWakeMinutes stämplas vid självstart
och självstopp; hemskärmens kort visar "Vaknade själv 18:42 · körde 23 min". Ikväll (0.3.2)
är beviset: rösten förbi en kamera, eller öppna appen före kvarten och läsa knappen.

## #40 — BEVISAT 31/8 16:00
Bengt, CarPlay, färsk installation, Alltid: vakten startade själv på första körningen.
Ingen parkering känd ⇒ betydande förflyttning-vägen. Skärmbild: körläge 6:03 / 4,3 km.

## #47 (31/8 2026 kväll) Skinnet v3 portat — 1a som stomme, 1b:s hemskärm och varningskort, 1c bort
Axel ritade i Claude Design mot DESIGN-BRIEF.md; tre riktningar kom tillbaka. Beslut:
1c (kartan i mitten) BORT — strider mot #28, skärmen är sekundär. 1b:s "Redo." med ett
ord och en knapp blir hemskärm; 1b:s helgula varningskort tar över, UTAN "Uppfattat"
(kortet försvinner själv — regeln om inga knappar under körning). 1a:s körläge och
inställningar behålls. Exporten docs/design/Halkvakt-App-v3.dc.html är källan;
tokens i Theme.swift är designens: bg #080B0D, panel #0F1518, gul #FFC94A, grön #1FB25A,
text #E9EFF2/#C7D3D9/#8FA0A9/#6C7B84. Typsnitt Instrument Sans + IBM Plex Mono (OFL),
buntade. Trettio typstorlekar blev Typo.sans/mono med designens skala. Röstväljaren
ersatt av "Halkvakt talar med iOS-rösten du valt i systemet". Genvägar-guiden fällbar.
INTE KOMPILERAT — Axels Mac i morgon. Android får samma skinn i nästa varv.

## #48 (31/8 2026) Om-fliken bort — innehållet till Inställningar (Axel: "behövs det?")
Innehållet behövs (löftet, källor med Fintraffics obligatoriska attribution, integritets-
policy för App Store). Fliken behövs inte — man läser det en gång. Två flikar: Vakten och
Inställningar. "Om Halkvakt" är sista avsnittet i Inställningar. Skinnets egen notering i v2.

## #49 (31/8 2026) Ikonsetet — fem faror, en linje, triangeln är märket
Axel: "olika ikoner vid olika fara?" Ja — kortet läses i ögonvrån; former känns igen utan
blick. Claude Design ritade fem i samma linjetjocklek: Halt väglag = bilen tappar greppet,
vågspåren gjorda (ÄR halt); Frysrisk = termometer + iskristall (KAN BLI); Olycka = samma
bilkropp + islagsstjärna; Vilt = hjorthuvud framifrån, hornen bär igenkänningen; Fartkamera
= låda på stolpe, den enda på stolpe. Triangeln är varumärket, inte olyckans ikon — står
kvar överst på kortet; ikonen sitter intill namnet. SVG i Assets.xcassets (template),
källa docs/design/icons/. Samma fem till Android och Live Activity.

## #50 (31/8 2026 kväll) Broarna — frysrisk mellan stationerna utan prognos (#38a, Bengts fråga)
Byggt i tre motorer + vektorer v18/v19 + publicering + OSM-hämtare med återförsök.
Regel: icing_point med meta.bridge ⇒ tröskel +3 °C (vägen +1) + fukt från NÄRMASTE station
≤ 15 km. Text: "Frysrisk framöver — bro om N meter." — invarianten stoppade första
utkastet ("Bro om N meter — frysrisk."): punktkällor säger "framöver", bara sträckor får
säga "på vägen framför dig". Bron är en punkt vars temperatur kommer från en station
någon annanstans; regeln har rätt. Publiceringen förfiltrerar (inga 3 000 broar i juli),
motorn kollar om. Data: OSM bridge=yes på motorway/trunk/primary i Sverige, ODbL,
attribution i appen; motorvägens två banor slås ihop inom 60 m. Overpass var nere hela
kvällen — bridges.yml försöker var 6:e timme tills filen finns. Stråket (#38b) väntar.

## #51 (31/8 2026 kväll) Skuggmotorn: ja till planen, men i tre steg — och trösklarna först
Bengts byggplan v3 tidigarelägger segmentmotorn till november i strikt skugga; dom i mars
("får den tala?" i stället för "ska den byggas?"). Axel: "varför inte nu — vi har ju
releasat?" Formellt rätt: #16:s villkor var "efter release", och 0.3.2 ligger hos testarna.
BESLUT: ja till planen, med tre skärpningar.
1) Ordningen styrs av VINTERN, inte av köplats. I augusti ligger hela landet på "Normalt" —
   skuggan skulle räkna "inte halt" på "inte halt" i sex veckor. Skuggkörningen startar när
   det finns halka (~mitten av oktober, Skåne).
2) Men de tre delar som INTE kräver frost börjar nu: tröskeldokumentet, ankarklippningen
   (kräver kamerafilen), offsetmodellen mot arkivet sedan 24/8.
3) HÅRT VILLKOR: ingen skuggkod före tröskeldokumentet. Utan daterade trösklar är
   skuggdriften en demo, och en färdigbyggd skugga vill tala — i mars kostar det mer att
   säga nej till något byggt än till ett förslag. Trösklarna är skyddet mot oss själva.
Dessutom: prognoskolumnen buntas ur engine/src som resten (läxan från 31/8 — skuggmotorn
körde gammal motor ett dygn utan att någon märkte det).
KONKURRENS OM AXELS TID: tolv testare i fjorton dagar är det som avgör om Halkvakt blir
något. Skuggbygget får aldrig tränga undan det — Bengt skriver samma sak i planen.

## #52 (1/9 2026) Trösklarna fastställda — mars-domens måttstock (Bengt + Claude, #51:s hårda villkor)
docs/TROSKLAR-SKUGGAN.md skrivet och daterat FÖRE första skuggkörningen och före all
skuggkod, enligt skuggregel 5 i Bengts byggplan v3 (2.3) och DECISIONS #51. Tre grindar:
A offsetmodellen (MAE ≤ 1,0 °C i beslutsbandet, grova fel ≤ 5 %, frysklassningsfel ≤ 10 %)
— prövas på arkivdata INNAN skuggbygget startar, ett gratis tidigt nej; B skuggdriften
(falsklarm ≤ 20 %, miss ≤ 30 %, mervärde ≥ 25 %); C domens giltighet (≥ 20 facithändelser
över ≥ 3 halkperioder, ≥ 30 varningar, backtest↔skugga ≤ 10 p.e.). Utan C: alltid fortsatt
skugga, aldrig tal. Asymmetriregeln operationaliserad: bara stationstemperatur > +2 °C
eller testarlogg får FÄLLA en varning — en ren kamerabild aldrig (svartis syns inte).
Ändringsregel med tand: efter första körningen kräver lättnad DECISIONS-post av båda plus
motivering som inte hänvisar till vinterns siffror. Värdena valda snäppet stränga med
flit (asymmetriska felkostnader: för strängt = en tyst vinter till, för slappt = en
talande skugga som har fel). Bengts "kör" 1/9 efter genomgång av varje värde i chatten.
KONSEKVENS: skuggspårets hårda villkor uppfyllt — ankarklippningen (#51 steg 2) och
offsetkörningen mot arkivet (#51 steg 3) är olåsta.

## #53 (1/9 2026) Resan håller ihop över pauser (Bengts fynd på Bodenresan)
Bengt: "den räknar inte rätt — vi har kört 50 mil men mätaren står på 23,5". Den räknade
rätt, men bara ETAPPEN: vakten självstoppar efter 15 min stillastående (#35) och vaknar när
bilen rullar igen (#40/#41) — och start() nollställde tid, sträcka och varningsräknare varje
gång. På en dagsresa med tankning och lunch blir det obegripligt. FIX: en resa fortsätter om
vakten vaknar inom 3 h; pausen räknas bort från körtiden (drivingSeconds), prevLoc nollas vid
stopp så pausens "hopp" inte adderas till sträckan. Längre uppehåll = ny resa. Sidoobservation
samma skärmbild: fyra fartkameror på 1,8–2,5 km medan bilen STOD STILLA — utan fart har
telefonen ingen kurs, så riktningsfiltret kan inte sålla. Kandidatkort: dölj "På din väg" när
farten är under gångfart, i stället för att visa allt runtomkring.

## #54 (1/9 2026) Ett grind A-skript, inte två — och domspärr i stället för fotnot
Axel och Bengt byggde samma prövning samtidigt (andra kollisionen samma dag efter #52/#53).
Bengts publish/grind-a.ts behålls som bas: den har ett SJÄLVTEST med syntetiska stationer
och känd sanning som FALLERAR jobbet om matematiken inte återfinner offseterna — koden
verifieras innan den mäter verkligheten. Claudes scripts/offsetmodell.ts raderas; det enda
den hade som saknades var minimikravet, som nu flyttats in: ≥ 500 bedömbara punkter över
≥ 20 stationer, annars fälls INGEN dom (—, inte KLARAR/FALLER). Skillnaden mot Bengts
fotnot är att domen inte går att läsa av på tunt underlag. TROSKLAR-SKUGGAN §3 säger
"ingen dom åt något håll" — nu är det en spärr, inte en anmärkning.
LÄXA: ta kortet innan du bygger. Två personer i samma repo utan synlig "pågår" ger
dubbelarbete — tre gånger på ett dygn.

## #55 (2/9 2026) Ankarfyndet bokfört: kamerorna ÄR stationerna — och fail-soft-läxan
Två oberoende körningar av ankaranalysen (parallellsessionens ankaranalys.yml, körning
33485863812, och scripts/ankaranalys.ts lokalt 2/9) ger SAMMA siffror: 744 väglagskameror,
alla med "VViS" i id, 99 % inom 1 km från en väderstation — 6 av 744 ger nytt ankarläge.
Byggplanens antagande "~1 500–1 650 kameror utöver 845 stationer; Norrlands 13 %-lucka är
målet" faller: Norrland 12,6 % >20 km OFÖRÄNDRAT med kameror. Kamerornas värde är BILDFACIT
vid stationen, inte täckning. Bengts v2-täthetssiffror reproducerade (median 6,8 km, 12,6 %).
Claudes råd: luckan fylls inte med gissningar — grind A:s felkarta hanterar den (utfall b);
ankarbreddningen (3b: FI/SMHI/höjd) är rätta spåret för att KRYMPA den. Bengt äger planfrågan.
LÄXA (fail-soft): TRV svarade 400 på ett ogiltigt query-attribut i VARJE varv i timmar och
fail-soft dolde det — grönt jobb, ingen fil. Rotorsaken lagades i parallellsessionen;
systematiska svaret är healthcheckens nya CDN-vakt på kamerafilen (finns/≥500 kameror/
≤7 dygn gammal, i den bevisade incident-larmvägen). En fail-soft utan extern vakt är
gravstensläckan om igen: felet finns men syns inte förrän någon råkar titta.

## #55 (1/9 2026) Kameratoleransen 100° → 60° (Bengts fynd på Bodenresan)
Bengt: "konsekvent fel på varning för fartkameror — den mäter alltid mot kameran som är i
motsatt färdriktning." Riktigt sett, och rotorsaken var inte den han gissade. Riktningsdata
FINNS och är tillförlitlig: alla 2 776 kameror har bearing, och 382 av 388 kamerapar inom
300 m pekar isär >135° — de sitter parvis och bevakar var sin körriktning. Filtret fanns
också. Felet var att toleransen stod på 100°, vilket ger ett fönster på 200° — mer än en
halvcirkel. En kamera som bevakar mötande trafik gled in så fort vägen svängde ~30°, alltså
konstant på E4:s kurvor. Ändrat till 60° i alla tre motorerna: släpper igenom egen riktning
i kurvor och på ramper, stänger ute mötande. Låst med v20 (motsatt ⇒ tyst) och v21 (40°
från kurs ⇒ varnar fortfarande) så gränsen inte kan glida åt något håll.
Bengts förslag "läs kameror på höger sida i färdriktningen" gick inte att bygga — vi har
position och riktning, inte vägsida, och positionen är för grov för att avgöra sida. Men
riktningen var exakt rätt spår; den behövde bara användas hårt.

## #56 (2/9 2026) Rösten säger VAR — vägnumret in i olycksfrasen (Axel + Bengt)
Kartan visade "OLYCKA · E18 — lastbil, mycket stor påverkan" medan rösten bara sa "tio
kilometer framför dig". Vägnumret fanns hela vägen från Trafikverket till motorn — bara
inte i texten. Nu: "Allvarlig olycka på E18, tio kilometer framför dig — stor påverkan…".
Talsyntesen läser "E18" som "E arton", men ett blott nummer blir "olycka på 25" — därför
roadPhrase(): bokstav ⇒ "på E18", siffra ⇒ "på väg 25", saknas ⇒ frasen oförändrad.
Tre motorer, v15/v16/v17 uppdaterade + v22 (utan vägnummer ⇒ exakt gamla frasen) så att
ingen framtida ändring kan låta rösten säga "på null". Bara olyckor tills vidare: halka
och frysrisk gäller sträckor/punkter där föraren redan ÄR, och "på E4" tillför inget där.

## #57 (2/9 2026) Kamerariktningen var 180° fel — och min #55-fix gjorde det synligt
Bengt på E4 en timme efter 0.3.3: "Passerade precis en kamera på min sida. Ingen varning.
20 sekunder senare varnade den, och då var det för motsatta sidan." Entydigt — och
motsatsen till vad #55 skulle ge.
ROTORSAKEN: Trafikverkets Camera.Bearing är riktningen kameran TITTAR, alltså rakt MOT
trafiken den fotograferar. Bekräftat av två oberoende källor: NVDB anger "vinkeln kameran
tittar i", medan databaser som listar färdriktning använder "diametralt motsatt vinkel";
och en publicerad mätplats för NORRgående körriktning har bäring 158° (sydsydost).
Vi jämförde bearing direkt med kursen — 180° fel sedan dag ett.
VARFÖR DET INTE SYNTES FÖRRÄN NU: med den gamla toleransen 100° var fönstret 200° och båda
kamerorna i ett par släpptes ofta igenom, så felet såg ut som "den varnar för fel kamera
ibland". När #55 skärpte till 60° blev filtret precist — och började konsekvent filtrera
bort rätt kamera. Min fix gjorde alltså felet värre och därmed mätbart; Bengt mätte det på
en timme. Rätt fix: angDiff((bearing + 180) % 360, heading) ≤ 60°.
BEVIS PÅ RIKTIG DATA: Skåne-fixturen byter varnade kameror — paret Västra Vemmerlöv
131693 → 131671, två kameror på samma plats som bevakar var sin riktning. Vi varnade
konsekvent för fel av dem. Alla kameravektorer vända 180°, facit regenererat.
LÄXA: ett filter som "nästan fungerar" på grund av en vid tolerans döljer ett fel i data-
tolkningen. Skärpningen som avslöjar felet är inte en regression — den är diagnosen.

## #58 (2/9 2026) Android-signeringen lagad — halva rotationen hade gjorts
Sedan 31/8 08:00 föll varje signerat Android-bygge på "keystore password was incorrect",
och tavlan antog att lösenordet var fel. Diagnos i CI (engångsjobb, skrev aldrig ut
hemligheten): filen avkodades till 4 300 byte men INGET lösenord öppnade den, och aliaset
kunde inte listas. Rotorsak: vid nyckelrotationen uppdaterades HV_KEYSTORE_PASS men inte
HV_KEYSTORE_B64 — filen i GitHub var lördagens keystore, lösenordet måndagens. Paret hörde
inte ihop, och jks-filen fanns inte kvar på någon disk (find ~ -name "*.jks" gav tomt).
ÅTGÄRD: ny keystore skapad 2/9 (RSA 4096, alias halkvakt, samma lösenord för store och
nyckel), båda hemligheterna satta från SAMMA fil. Ofarligt eftersom appen aldrig laddats
upp till Play — en keystore blir oersättlig först när Google känner den.
BEVIS: keystore-check grön (alias halkvakt, PrivateKeyEntry, lösenordet öppnar båda),
sedan android.yml grön hela vägen — signerad release-AAB 2,5 MB som artefakt.
LÄXOR: (1) rotera aldrig halva paret — B64 och PASS hör ihop och ska sättas i samma
sittning; (2) jks-filen MÅSTE ligga utanför GitHub (iCloud), annars går paret inte att
laga; (3) ett CI-jobb som bara säger "success" bevisar ingenting om grenarna saknar
exit 1 — min första diagnos läste grönt fast lösenordet inte fungerade.

## #59 (2/9 2026) Riktningsvändningen VERIFIERAD mot publicerat känt fall
Efter #57 kom en ny fältrapport som såg ut som fortsatt fel. Innan ännu en ändring:
verifiering mot ett externt, publicerat fall i stället för resonemang.
Kamera-ID 14102020, väg 535, 0,4 km från Öjersjö, har bearing 158 i vår data. Publicerad
beskrivning av SAMMA ID: "Öjersjö norrgående körriktning — riktad mot sydsydost (bäring
158°)". Kameran övervakar alltså NORRGÅENDE trafik med bearing 158; 158 + 180 = 338 ≈
nordnordväst. Vändningen ger rätt övervakad färdriktning. BEKRÄFTAT.
Slutsats: koden i 0.3.4 är korrekt. Kvarstående fältfel förklaras av att 0.3.4 ännu inte
var uppladdad när testaren installerade om — han fick 0.3.3 igen.
METODLÄXA: jag ändrade två saker samtidigt i #55 (tolerans 100→60) och #57 (vändning 180°).
Det gjorde fältrapporterna svårtolkade. En variabel per bygge när något mäts i verkligheten.

## #60 (2/9 2026) Vi deployade med rött kontraktstest — rutinfel, inte kodfel
Axel: "ska vi inte bara göra det en gång till så vi vet att allt gått rätt till?" Rätt fråga.
FYND: ios-engine (Swift-vektorerna) hade legat RÖD sedan 08:39 — fyra körningar — medan
0.3.4 byggdes, laddades upp och testades i bil. Xcode kompilerade utan invändning; det är
kontraktstestet som bevisar att de tre motorerna säger samma sak, och det sa nej.
ORSAK: vägnumret (#56) nådde aldrig EARLY-grenen i Swift eller Kotlin. Olyckstexten är
delad över två rader i båda språken, så min sträng-ersättning matchade bara LATE och den
enkla. Kotlin fångades av att jag körde gradle lokalt; Swift har ingen lokal körning här
och jag litade på att bygget gick igenom.
KONSEKVENS: Bengts fältrapporter från 0.3.4 kan inte tolkas — appen han körde hade rätt
kamerariktning men ofullständig olyckstext, och vi visste inte vilket bygge som testade vad.
ÅTGÄRD: lagat, ios-engine grön. Version 0.3.5 (8) så den trasiga går att skilja ut.
REGEL (CLAUDE.md): aldrig be om arkivering utan att först köra ios-engine + android + ci
och se alla gröna. Kompilering ≠ kontrakt.

## #60 (2/9 2026) KÄLLBESLUTET: SMHI:s radarkomposit in som källa (kort #43 steg 2)
Bengt + Axel (Axels ok relayerat av Bengt i chatten 2/9; Axel kan kontrasignera genom
att bocka kortet på tavlan). Beslut: SMHI:s öppna radarkomposit (Sverige, 5-min, CC BY
4.0) tas in som permanent extern källa enligt docs/RADAR-PLAN.md — observationsdelen
ENDAST (mätning, inom #25-lagen; extrapolering förblir #16:s parkerade prognosklass).
Grids lagras aldrig råa: samplas mot 818-skelettet, händelsefiltreras, fritier är lag.
Stationerna blir markkalibrering, pensioneras inte. MET api.met.no som nordisk
kompletterare för stickprov (identifierande User-Agent utan personuppgifter).
Underlag: rekognoseringen (körning 33616309645) — öppet utan nyckel, 261 kB/fil
(~77 MB rå/dygn), 26/26 ruttpunkter täckta inkl. E10 Kiruna/E14 Storlien, enda
strukturella luckan Tärnaby; cellmätningen (regnet dekorrelerar under ankaravstånden,
46–64 % diskordans 5–50 km). Alternativ som valdes bort: enbart stationstrigger
(cellmätningens dom), MET:s punkt-API för skelettet (deras villkor), köpta källor
(fritier). Nästa: steg 3 pilotintag i skugga, bevisas med cellmätning v3 mot radar
+ uppmätt fritier efter en vecka.

## #60 (2/9 2026 kväll) Frost-rekognoseringen + provet: Norge öppnar, men luckan är inlands
Bengt registrerade FROST_CLIENT_ID; rekognosering + prov byggda och körda mot levande API
samma kväll (frost-rekognosering #1–2, frost-prov #1, allt på Summary-sidorna). TRE FYND:
(a) VEGVESEN BOR I FROST: 473 av 1 606 norska stationer hålls av Statens vegvesen, 461
    aktiva med lufttemperatur — vägstationsnamn som "E10 BJØRNFJELL" (1 km från Riks-
    gränsen), "E14 TEVELDALEN" (3 km från Storlien). Skarpt dataprov: 8,6 °C @ 19:00Z.
    Norskt luftarkiv kan alltså börja tickas UTAN DATEX-kontot, som FI före produkten.
(b) YTTEMP KRÄVER ÄNDÅ DATEX: road_surface_temperature finns i elementkatalogen men
    availableTimeSeries ger 404 för både bas- och max-varianten — inga läsbara serier
    med öppna uppgifter. Väglag/yttemp går fortsatt genom Vegvesens DATEX.
(c) SVENSKA LUCKAN RUBBAS INTE: ankarstegen SE→+FI→+NO(Vegvesen)→+NO(alla) ger Norrland
    9,1 km / 11,5 % i ALLA tre påbyggnadsstegen — noll ytterligare effekt av 1 104 norska
    stationer. Slutsatsen är geometrisk och viktig: Norrlands >20 km-lucka ligger i
    INLANDET, inte vid gränsen. Kvarvarande spår för luckan: SMHI-luftankare + höjd
    (redan under prov) eller acceptans via grind A:s felkarta. OBS: Frost-ankare är
    lufttemperatur — provet mäter avstånd, prognosvärdet döms enligt TROSKLAR-SKUGGAN.
SAMMA KVÄLL: Vegvesens svar på DATEX-begäran anlänt till Axel (Bengts besked i chatten).
Nästa steg är Axels: VEGVESEN_USER/PASS i GitHub Secrets (och proxy-beslutet om fast IP
krävs) ⇒ parsern skrivs och Norge kör på riktigt. Frost förblir komplement (lufttemp).

## #61 (2/9 2026) TRÖSKLARNA FASTSTÄLLDA av Axel — mars-domens måttstock låst
Axels "kör" relayerat av Bengt i chatten 2/9 ("Axel säger kör via Bengt"); kontra-
signering sker genom att kortet bockas på tavlan, samma ordning som källbeslutet.
Innebörd: docs/TROSKLAR-SKUGGAN.md gäller oförändrad från Bengts 1/9-version
(inklusive §2-orsaksklassningen av missar), och från första skuggkörningen
(~mitten av oktober) kan dokumentet bara ändras med DECISIONS-post signerad av
BÅDA (§5) — lättnad dessutom med motivering som inte pekar på vinterns siffror.
Alternativ: vänta på strategimejlsvaret (valt bort — beslutet är detsamma och
skuggspåret ska inte stå still på formalia); justera värden (Axel valde att inte
göra det). Därmed är ALLA mänskliga förvillkor för skuggkörningen uppfyllda —
kvar är bara vintern. BOKFÖRINGSNOT: #60 är trippelbokat (rutinfelet, källbeslutet
radar, Frost-rekognoseringen) — två varv skrev parallellt. Numren lämnas orörda
(historik skrivs inte om); referenser till #60 bör ange vilket. Nästa nummer: #62.

## #62 (3/9 2026) TÄTHETSBESLUTET: motfashämtning av regnsummorna (kort #44 alternativ a)
Bengt + Axel i chatten ("Jag o Axel säger a") efter regntäckningsmätningen: timhämtningen
fångar 1 av 2 30-min-buckets i 78 % av regnmätartimmarna (täckning 44 %). Vald väg:
lätt regn-endast-körning i MOTFAS (:41, mot ingests :11) — ingest/regn30.ts + regn-30.yml,
samma parser och INSERT som ingest, bara nederbördsrader (arkivdieten #4), ON CONFLICT
DO NOTHING. Kostnad: ~1 CI-minut/timme (minutdieten #22 medvetet utökad med detta).
Alternativ: (b) hela ingest till 30-min-takt (dubbel kostnad, mer än frågan kräver) och
(c) acceptera 44 % (halv växttakt för vinterserierna) — båda bortvalda. BEVISKRAV
(rotationsläxan): beslutet är genomfört först när regn-tackning EFTER driftsättningen
visar 2/2-andelen stiga; skriptets egen täthetspuls (3 h-fönster) följer samma siffra
varje körning.

## #63 (4/9 2026) PULSKLOCKAN BREDDAD: FI, DK och regn-30 in på Supabase pg_cron
Bengt + Axel efter healthcheck-larmet 4/9 (fi 291 min, dk 139 min) och eftermätningen på
kort #44: de tre jobb som ännu hängde på GitHubs schemaläggare svalt, medan svenska ingest
och publish skyddats av pulsklockan sedan #26. BESLUT: puls-ingest-fi (7,37), puls-ingest-dk
(12,42) och puls-regn-30 (41) som pg_cron-jobb, skapade av scripts/pulsklocka.ts genom att
KOPIERA det bevisade ingest-pulsjobbets kommando och byta workflow-filnamn i databasen —
GitHub-token passerar aldrig en logg eller repot. Alternativ: fler GitHub-cron-tider
(bortvalt, svälten sitter i schemaläggaren) och pg_cron-kommandon skrivna för hand
(bortvalt, token i klartext). BEVIS: pulsklocka #2 14:05 (9 jobb), avfyrningar 14:12–14:42
med aktör Axelstar (token), healthcheck #73 15:06 HEALTHY med fi 30 / dk 25 min. Posten
skrevs i efterhand av terminal-Claude 15:10 — workflow-filen hänvisade till #63 innan
posten fanns.

## #64 (4/9 2026) NORGE: väderparsern mot mätt struktur, arkivpolicy #4 ordagrant
Bengt ("har du skrivit parsern mot den här strukturen — stationstabell + mätdata →
no.weather händelsefiltrerat enligt samma arkivpolicy som Sverige och Finland?").
BESLUT: (a) parsern skrivs mot rekognoseringens XML (ingest-no #28), inte mot DATEX-
schemat; det som låg utanför fönstret (stationens position) får en STRUKTURVAKT som
skriver inget och dumpar råa XML:et i loggen i stället för att fylla ett tomt arkiv
tyst. (b) Regex utan XML-bibliotek — gratisnivån, inga nya beroenden, namnrymdsprefix
ignoreras. (c) Arkivpolicyn är DECISIONS #4 ordagrant (≤ 5 °C, nederbörd, Δ ≥ 0,5,
första observationen) — inget norskt undantag. (d) GetSituation hämtas INTE av
väderparsern: 30 MB och nästan bara MaintenanceWorks; olyckor → no.deviations är ett
eget kort med eget filter (jfr #5). (e) Pulsen 17,47 läggs i pg_cron och healthchecken
vaktar no-arkivet med samma 120-minutersgräns som fi/dk, tyst tills första raden.
Alternativ bortvalda: vänta på fullständig XML-dump före parsern (ett varv till utan
arkiv), skriva mot DATEX-schemat blint (RoadNumber-läxan). BEVIS: ingest-no #29 15:24
468/468 stationer med koordinater, latest 468, archived 468; pulsklocka #3 10 jobb;
healthcheck #74 HEALTHY "no-arkivet: synkat för 5 min sedan". ÖPPET: nederbörd 0/468 —
elementvägen bevisas första regnvädret.

## #65 (4/9 2026) OMTAG kort #42: spårdjupet blockerar inte, skuggan startar oavsett
Bengts granskningsfråga efter att Lastkajen-rekognoseringen byggts ("är det här bästa
sättet?") — och svaret var nej i sin ursprungliga form. Steg 1 mätte TILLGÅNG (licens,
format, färskhet), inte NYTTA. Exakt ankarklippningens fälla: 744 kameror var fullt
tillgängliga och gav noll ny ankartäthet, vilket vi upptäckte först när nyttan mättes.
MEN det räckte inte att skjuta spårdjupet till efter skuggan (Claudes första förslag):
höstregnen är en engångschans i år — frosten återkommer varje vinter, den här
regnmängden gör det inte, och nästa chans vore hösten 2027. Ett skjutet steg blir
dessutom lätt liggande.
BESLUT (väg C, Bengt 4/9 efter att för- och nackdelar lagts fram för tre alternativ):
parallellt i stället för i serie. (a) Reconen körs som ren kunskap, blockerar inget.
(b) Kräver Lastkajen ansökan startar Bengt den direkt — kalendertid kostar ingen
arbetstid. (c) TROSKLAR-VATTENPLANING skrivs UTAN spårdjupströskel, så inget värde
behöver gissas (8 mm? 12 mm? — att gissa trösklar är vad tröskeldokumenten finns för
att förhindra). (d) Skuggkörningen börjar i höstregnen oavsett. (e) Hinner spårdjupet
fram läggs det in som ANALYSKOLUMN (steg 4b), aldrig som varningströskel — då mäts
nyttan mot samma skuggdata utan att ett fastställt dokument rörs.
Bortvalt: A, spårdjup med från början (en arkitektur i stället för två, men tvingar
fram en gissad tröskel och blockerar steg 2 bakom licens/format/klippning). B, spårdjup
villkorat efter skuggan (kortast stig, men riskerar förbruka höstens regn på en mätning
som ändå kräver spårdjup). PRIS FÖR C, ärligt: en mätning till att underhålla, och
visar sig spårdjupet avgörande måste tröskeln ändå in i tröskeldokumentet med
dubbelsignatur — vilket A hade sluppit.

## #66 (4/9 2026) Spårdjup finns inte öppet — trafikproxyn blir steg 4b:s första variant
Reconen (lastkajen-rekognosering #1–2, ren läsning) besvarade körschemats fyra frågor.
FYND 1, kärnfrågan: spårdjup finns INTE i Trafikverkets öppna API. PavementData (19 fält)
och RoadData (24 fält) inventerades fältnamn för fältnamn — noll träffar på
rut/djup/IRI/textur/friktion. FYND 2: Lastkajen kräver konto; /api/Identity/Login svarar
405 på GET (endpointen finns, vill ha POST), sajten är ett Angular-skal utan läsbar text.
FYND 3, det värdefulla: RoadData bär AADT och AADTHeavyVehicles, plus RoadWidth,
BearingCapacity och WearLayer; PavementData bär PavementDate, PavementType och Thickness.
Tung trafik ÄR spårens fysikaliska orsak, och allt ligger i vägnummer + löpande längd —
samma referenssystem som våra 818 segment, ingen klippning mot främmande geometri, ingen
licensgranskning, inget konto. FYND 4, mätt färskhetsvarning: beläggningsdatumen i
stickprovet var 1967, 1980 och 2013.
BESLUT (Bengt 4/9): trafikproxyn blir steg 4b:s FÖRSTA variant och byggs när skuggan
står; mätt spårdjup flyttas till steg 4c, villkorat av att Lastkajen-datan hunnit fram.
Räcker proxyn för att förklara falsklarmsklustren behövs Lastkajen aldrig.
ÄRLIG BEGRÄNSNING: åldersproxyn är grov på lågtrafikerade vägar — men samma svaghet
drabbar Lastkajens egna mätningar (vart 1–3 år på stora vägar, sällan på små). Ingen
källa är stark just där nätet är glest; det är ett villkor att redovisa i domen, inte
ett fel att dölja. Väg C (#65) står orörd: ansökan får fortfarande startas parallellt,
men den är inte längre kritisk stig.

## #67 (4/9 2026) TROSKLAR-VATTENPLANING: Bengt fäller värdena, Axels fastställande återstår
Kort #42 steg 2. Dokumentet skrevs som utkast med motiverade förslag och Bengt fällde det
oförändrat samma kväll ("låt värdena stå") efter genomgång av de fyra öppna punkterna.
FÄLLDA VÄRDEN: grind V-A (påståendets bärkraft, mätbar före all skuggkod) 70 % träff /
25 % falsklarm inom 0–10 km — motiverat av cellmätningens uppmätta 26–36 % diskordans
där; grind V-B (skuggdriften) 20 % falsklarm / 40 % miss / högst 3 varningar per rutt
och regndygn; grind V-C (domens giltighet) minst 200 skuggvarningar, 15 facitbekräftade
händelser, 5 regndygn, 3 län, med binomialbruset utskrivet (N=200, p=0,20 ⇒ ±5,5 p.e.).
TVÅ SAKER MEDVETET OSATTA: regntröskeln i mm/h ska falla ur V-A:s mätning, inte gissas
(samma disciplin som höll spårdjupet utanför, #65/#66), och radarns roll är villkorad av
domen 14/9 med båda utfallen förberedda — faller den tiger rösten bortom 15 km från
mätande station, vilket är produktinvarianten i arbete, inte ett misslyckande.
ASYMMETRIN, granskningens §7.3: "regn utan olycka" är INTE falsklarm — en korrekt
riskvarning följs oftast av att ingenting händer. Bara stationens egen mätning, en torr
kamerabild eller en testarlogg får fälla. Spegelvänt mot skuggmotorn, där kamerabilder
aldrig får fälla eftersom svartis inte syns; här SYNS torr asfalt.
KVAR HOS AXEL: fastställandet, plus vinterinteraktionen (§4) där Claudes rekommendation
är att halkan alltid vinner och vattenplaningen vilar helt vid yttemp ≤ +4 °C.
Ingen kod skrivs före Axels ja — #51:s hårda villkor, samma som skuggmotorn fick.

## #68 (4/9 2026) TROSKLAR-VATTENPLANING FASTSTÄLLT + vinterinteraktionen avgjord
Axels "fastställer och följer din rekommendation" relayerat av Bengt i chatten 4/9;
kontrasignering sker genom att kortet bockas på tavlan, samma ordning som #61 (skuggans
trösklar) och #60 (radarns källbeslut). Värdena är oförändrade från Bengts fällning
samma kväll (#67).
VINTERINTERAKTIONEN, granskningens §7.4, nu avgjord: HALKVARNINGEN VINNER ALLTID.
Vattenplaningsvarningen vilar HELT vid yttemp ≤ +4 °C på segmentet, oavsett
regnintensitet, och placeras i A-skalan under halkvarningen. Skälet: is och slask dödar,
och vattenplaning på slask är fysikaliskt samma händelse — föraren behöver en åtgärd,
inte två. Alternativ bortvalda: båda talar i tur och ordning (bryter 45-sekundersregeln,
gör rösten till radiopratare) och en sammanslagen fras (överdriver vad datat bär).
KODKONSEKVENS värd att notera nu, inte upptäcka i december: vilan är ett FÖRVILLKOR, inte
en prioritetsfråga i alarmkön. Fartgrind och regntröskel prövas aldrig när yttemp ≤ +4 °C.
Det gör den testbar som egen vektor i engine/vectors/ när steg 5 byggs.
LÄGET: #51:s hårda villkor uppfyllt — dokumentet låg i repot före all kod. Steg 3
(grind V-A: LOO-prövning mot arkivet med domspärr) är därmed olåst och blir Claudes
nästa bygge på kortet. Kvar hos människorna: ingenting före domen i nov/dec.

## #69 (4/9 2026) GRIND V-A FALLER — men fyndet är att grannarna vet ATT, inte HUR MYCKET
Första skarpa körningen (grind-v-a #1, 30 dygn bakåt, Bengts "kör skarpt"). Domen mot de
fastställda kraven (#67/#68: V-A1 ≥ 70 % träff, V-A2 ≤ 25 % falsklarm i bandet 0–10 km):
V-A FALLER på alla sex prövade trösklar. Underlaget räckte — n = 1 141 fall vid 0,5 mm/h,
väl över domspärrens 200 — så detta är en riktig dom, inte ett "för tunt".
MEN LÄS KOLUMNERNA, INTE BARA DOMEN. Falsklarmen ligger LÅGT och klarar V-A2 med marginal
på varje tröskel: 12 % (0,5), 10 % (1), 8 % (2), 7 % (4), 4 % (6). Det är TRÄFFEN som
fäller: 61 % som bäst, mot kravet 70 %. Och mellanläget är stort och växande: DELVIS
(det regnade, men svagare än tröskeln) 27 % → 38 % → 55 % → 63 % → 62 % → 71 %.
Slår man ihop träff och delvis säger grannarna rätt i 88 % (0,5 mm/h), 90 % (1), 91 % (2)
och 94 % (4) av fallen. SLUTSATSEN ÄR ALLTSÅ INTE "regn går inte att prognostisera mellan
stationer" utan: grannarna vet med hög säkerhet ATT det regnar hos målstationen — de vet
inte HUR MYCKET. Intensitetströskeln är det som inte bär, inte regnpåståendet.
VAD SOM INTE GÖRS NU: V-A1 skrivs INTE om till "regnar det alls". Dokumentet är fastställt
och att flytta målstolparna när siffrorna kommit är precis vad §5 förbjuder — en sådan
ändring kräver Axels och Bengts signaturer och en motivering som inte lutar sig mot detta
utfall. Frågan läggs som beslutsläge på kortet, inte som en tyst justering.
RESERVATION, mätt och inte gissad: rain_sum_mm började tickas 2/9 (steg 0a), så "30 dygn
bakåt" är i praktiken tre dygns septemberregn. Kurvan ska köras om när höstregnen fyllt
arkivet — knappen går måndagar 07:20 och siffrorna växer av sig själva.

## #70 (4/9 2026) VAKTHUNDEN SJÄLV IN PÅ PULSKLOCKAN — och regeln som följer av mätningen
Bengts order ("kör push healthcheck") efter läsvarvets fynd. Healthchecken var det sista
tidskritiska jobbet som gick på naken GitHub-cron, och den svalt precis som ingest gjorde
före #26. MÄTT över 98 h 56 min (20 schemalagda körningar, 31/8 17:38 – 4/9 20:34): cron
säger `23 */2 * * *` ≈ 49 avfyrningar, verkligheten gav 20 — 40 %. Mellanrum 3 h 03 som
kortast, 6 h 44 som längst (två gånger), snitt 4 h 59, och NOLL av 19 mellanrum inom de
bokade 2 timmarna. Workflowens egen kommentar, "vakthunden i skriptet larmar ändå inom
2 h", var alltså fel sedan den skrevs.
VARFÖR DET SPELADE ROLL: värsta hålet är 3,4× längre än stalehetsgränsen på 120 min som
vakten ska fånga. En tystnad hann alltså börja, pågå och rätta sig själv utan att någon
såg den. Det var exakt vad som hände 4/9: UNHEALTHY-larmet 11:27 var första blicken på en
FI/DK-stalehet som redan pågått, och nästa blick kom först 16:25.
ÅTGÄRD: en rad i pulsklockans NYA-lista. Schemat är oförändrat — bara leveransvägen byts,
inte avsikten — och GitHub-cronen står kvar som för regn-30, så pulsen är additiv.
Bevisvakten grön i pulsklocka #5 (21:08:18): puls-healthcheck aktiv, rätt workflow, token
med. Registrerad är dock inte levererad: beviskravet är healthcheckens EGNA mellanrum
under ett dygn, inget över 2 h 30.
GENOMGÅNGEN SOM GJORDES FÖRST, och som ändrade påståendet: alla 15 cron-rader i repot
lästes innan kortet skrevs. Pulsklockan bär ingest-familjen och regn-30. Publish-map
klarar sig av en anledning ingen planerat — den är kedjad på `workflow_run: [ingest]` och
ärver därmed pulsen gratis. Bridges (6 h), marknadsföring (dygn) och måndagsserien tål
drift. Utan den genomgången hade kortet påstått att healthchecken var "det enda jobbet på
GitHub-cron", vilket är falskt; det sanna är "det enda TIDSKRITISKA".
REGELN SOM FÖLJER: GitHub-cron är en reserv, inte ett schema. Varje nytt återkommande jobb
vars VÄRDE SITTER I TIDPUNKTEN ska bokas på pulsklockan i samma varv som det byggs — och
för ett jobb vars uppgift är att upptäcka tystnad räknas inte "det larmar ändå" som
argument, eftersom det argumentet är precis vad den här mätningen fällde. Drifttåliga
jobb (veckomätningar, dygnsrapporter) får ligga kvar på GitHub-cron.
LÄXAN I EN RAD: en vakthund som inte själv vaktas mäter inte tystnad, den mäter tur.
VÄNTAD BIEFFEKT, bokförd i förväg så den inte misstolkas som en försämring: en vakt som
tittar var annan timme i stället för var femte kommer se stalheter som förut hann rätta
sig osedda. Fler incident-issues den närmaste tiden är ett tecken på att vakten börjat
fungera.

## #71 (5/9 2026) ARKIVLÄCKAN MÄTT — nollresultat som friar ingen, och en tom moat
Bengts order "mät bortfallet på 51" efter att mekaniken bevisats i koden. Mätknapp byggd
(scripts/arkivlackan.ts + arkivlackan.yml) med självtest mot känd sanning, underlagsvakt och
invariantvakt. Körning #1, 5/9 04:02.
UTFALL: bortfall **0 av 818 segment (0,0 %)**. Varje nuvarande tillstånd återfinns i
road_condition_history — 806 ändrade före 25/8, 12 efter, noll saknade, noll segment utan
historikrad. Min hypotes om ett stort bortfall BEKRÄFTADES ALLTSÅ INTE, och det ska stå
lika tydligt som om den bekräftats.
MEN SIFFRAN FRIAR INGEN, och skälet är hela poängen: arkivet är 830 rader över 818 segment —
en rad per segment plus tolv — och nyaste raden är 2026-08-25 08:09. Tidsserien över 30 dygn
innehåller EN dag. Inte en enda omklassning har skett på elva dygn. Bortfallet är noll för
att flödet står stilla, inte för att arkivet fungerar. Ett nollresultat, inte en friande dom.
DET STÖRRE FYNDET, som mätningen inte letade efter: moaten är inte läckande — den är TOM.
"Vinterarkivet" innehåller ingen vinterhistorik alls, bara ett stillbildsavtryck plus tolv
ändringar. Kort #45:s säsongsbaseline per segment saknar därmed underlag oavsett läckan, och
det är en annan och närmare vägg än den jag beskrev igår.
VARFÖR DEN AVGÖRANDE MÄTNINGEN INTE GÅR ATT GÖRA ÄNNU: den delade changeid-kursorn kan bara
fälla eller fria när segment faktiskt klassas om. I september ligger RoadCondition-strömmen
still. Hypotesen är otestbar tills snön kommer — vilket är precis när den spelar roll.
BLIND FLÄCK UPPTÄCKT I SAMMA VARV: healthchecken vaktar sync_state-FÄRSKHET, och
edge-funktionen skriver synced_at = now() varje minut oavsett om något hämtades. Vakten kan
alltså inte skilja "färsk och tyst" från "färsk och trasig". Elva tysta dygn ser identiska ut
med elva trasiga. Det är samma familj av fel som fail-soft-läxan och gravstensläckan: ett
grönt kvitto på att ett jobb KÖRDE säger ingenting om att det UTRÄTTADE något.
LÄXAN, generell: mät hypotesen innan du bygger fixen — men mät också om mätningen ÖVERHUVUD
TAGET kan falsifiera hypotesen med det underlag som finns. En mätning som returnerar noll för
att ingenting hänt är inte ett svar, och att läsa den som ett svar hade varit värre än att
inte ha mätt alls. Här räddades det av att tidsserien och arkivets ålder skrevs ut bredvid
procenttalet; hade rapporten bara visat "0,0 %" hade kortet stängts på falska grunder.

## #72 (5/9 2026) KURSORMÄTNINGEN: pipelinen frias av Trafikverket, läckan förblir otestbar
Bengts order "kör kursormätningen". Som jag beskrev den igår krävde den en produktionsändring
— egen changeid-kursor åt GitHub-ingesten — och jag lovade att den skulle "fälla eller fria
hypotesen UTAN att vänta på snö". DET LÖFTET HÖLL INTE, och felet var mitt: med tyst ström kan
ingen mätning avgöra en starvationshypotes, eftersom svält kräver ett flöde att svälta på.
VAD SOM BYGGDES I STÄLLET (helt läsande, produktionsflödet orört): gårdagens mätning var
CIRKULÄR — den jämförde våra egna tabeller med varandra, så när båda stod still såg det ut som
hälsa. Den nya hämtar Trafikverkets fulla sanning (changeid 0) och prövar varje ModifiedTime
mot arkivet. Förlust mäts alltså mot KÄLLAN. Domen är trestegs med flit, och självtestet prövar
uttryckligen att tyst ström ger OTESTBAR och aldrig ett friande svar.
UTFALL (kursormatning #1, 04:38): vår last_change_id 7677878362341114260 = TRV:s just nu,
alltså IKAPP. 818 levande segment hos TRV, noll omklassade senaste timmen, dygnet ELLER veckan,
och 0 av 818 saknas i arkivet. road_conditions senast ändrad 25/8 08:09 — samma som TRV.
DOM: OTESTBAR.
AVGJORT, mot en extern domare: (a) vår pipeline är inte döv — tystnaden är Trafikverkets, inte
vår; (b) arkivet är komplett mot källan; (c) livemotorn ligger exakt ikapp. Därmed är den
BLINDA FLÄCKEN från #71 stängd: "färsk och tyst" är bevisat tyst och inte trasigt. Det var det
farligare av de två alternativen och det är nu uteslutet.
INTE AVGJORT: läckhypotesen. Den kan bara prövas när segment faktiskt klassas om.
LÄXAN, och den är dyrare än den låter: jag föreslog en produktionsändring som MÄTNING, och
motiverade den med att den skulle ge svar direkt. Den hade i själva verket gett noll — och
efteråt hade vi haft en ändrad kursor i drift utan att ha lärt oss något, alltså risk utan
utbyte. Regel: innan en mätning motiverar ett ingrepp i produktionen ska den prövas som
LÄSANDE variant först, och man ska kunna säga i förväg vilket utfall som skulle ha falsifierat
hypotesen. Kunde man inte det är det ingen mätning, det är en förhoppning.

## #73 (5/9 2026) EGEN KURSOR åt arkivspåret — och regnet som bevisade att strömmen är vinterbunden
Bengts "ja bygg" efter #72, där kursorbytet omdefinierades från MÄTNING till FÖRBÄTTRING:
det ger färre tappade rader när vintern kommer, men bevisar ingenting i dag.
ÄNDRINGEN: GitHub-ingesten läser sync_state-nyckeln "road_conditions_arkiv" i stället för den
delade "road_conditions". Livemotorns nyckel är orörd, dess minutkadens likaså. Arkivets enda
skrivare konsumerar därmed hela timmens ström i stället för sista minutens delta.
TRE FÖLJDÄNDRINGAR, som hörde till bygget och inte var extra arbete:
(a) BAKÅTVAKT på road_conditions-upserten: EXCLUDED.modified_time >= road_conditions.modified_time.
Nödvändig FÖLJD av kursorbytet — vi behandlar nu en hel timme samtidigt som livemotorn skriver
varje minut, så kapplöpningsfönstret växer och ett äldre tillstånd kunde annars skriva över ett
nyare. Historiken påverkas inte: den är en egen sats som ska arkivera allt TRV visat oss, även
det bakåtvakten hindrar från att röra nuläget. Nuläget ska vara färskast, arkivet fullständigast.
(b) Räknarna mäter VERKLIGA skrivningar (rowCount) i stället för försök (c.length). Utan det
går kursorbytets nytta inte att se — "history += 818" betydde rader vi PROVADE att skriva.
(c) Integrationstestet SKÄRPT. Det fällde första försöket, och hade rätt: det krävde history: 1
även på omkörning, trots att noll rader skrevs. Räknaren ljög och testet påstod lögnen. Nu krävs
history: 0 på andra körningen, vilket PRÖVAR CLAUDE.md:s invariant "en rerun får aldrig duplicera
rader" i stället för att anta den. Ett skärpt påstående, inte ett försvagat — skillnaden är hela
poängen med regeln om att aldrig mjuka upp ett test för att få grönt.
BEVIS (ingest #267, 04:55:26): kursorlistan saknade road_conditions-nyckel ⇒ full första synk som
väntat; 818 segment; DB WRITE OK {"road_conditions":818,"history":0}. Nollan är den ärliga
räknaren i arbete.
OVÄNTAD INSIKT SAMMA KÖRNING, och den är viktigare än bygget: radarsteget mätte 178 segment med
regn ≥ 0,1 mm/h och max 15,38 mm/h — det REGNADE över Sverige. Ändå var non-normal active 0.
REGN FLYTTAR INTE VÄGLAGSSTRÖMMEN. Omklassning är ett vinterfenomen, inte ett nederbördsfenomen.
Det förklarar elva tysta dygn definitivt och skärper förväntan för både #51 och #45: arkivet
förblir tyst tills det fryser, hur mycket det än regnar, och en säsongsbaseline per segment kan
alltså inte börja byggas förrän första frostvädret. Vi hade fel om att "höstregnen" skulle ge
väglagsdata — de ger regndata, vilket är något annat.

## #72 (8/9 2026) Livekedjan flyttad till Supabase — appen lever utan Actions-minuter
LÄGET: Actions-minuterna tog slut 5/9 13:12. Bengts mejl sa att livemotorn kör som vanligt;
mätning visade annat. weather_observations hade INGEN ny rad sedan 5/9 11:05, och live.json
på CDN var 66,7 timmar gammal med EN väderstation i sig. Åldersspärren (AgeGate) höll —
vakten sa "Ingen färsk väglagsdata" i stället för att ljuga — men den hade inget att säga.
FYND: pg_cron-jobben var mestadels KLOCKOR som väckte GitHub, inte arbete. Det enda som
faktiskt kördes i Supabase var ingest-live (olyckor + väglag), och den lever hela tiden.
Väderstationerna, de nordiska flödena och HELA publiceringen låg i Actions.
ÅTGÄRD, två steg, båda i Supabase:
 1. weather() inlagd i ingest-live — samma arkivpolicy som DECISIONS #4 (spara bara yta
    ≤ 5 °C eller nederbörd). Bevis: 106 nya observationer inom en minut efter driftsättning.
 2. Ny edge function `publicera` — speglar build-snapshot.ts (samma frågor, samma format)
    och push-data.ts (Git Data API, inte git). pg_cron var 10:e minut, jobid 19.
    Bevis: live.json på CDN 1,1 minut gammal, commit 76bdf30.
KOSTNAD: noll Actions-minuter. Kedjan Trafikverket → databas → CDN → app går nu helt
utanför GitHub.
FÖLJD FÖR REPOBESLUTET: publikt repo (Bengts minutplan) är nu ett val om öppenhet och
ekonomi, inte ett nödingrepp för att hålla appen vid liv. Beslutet kan fattas i lugn.
KVAR I ACTIONS (tål att vänta på kvotnollställning): FI/NO/DK-ingesten, broarna (#38),
kartlagren, grind A och veckoproven, marknadsmotorn, healthcheck.

## #74 (8/9 2026) EN skrivare av appens snapshot — snapshotkärnan, givarvakten och tre fynd ur grunden
BAKGRUND: #72 (8/9) flyttade publiceringen till Supabase-funktionen `publicera`, en handskriven
spegel av publish/build-snapshot.ts. Bengts "fungerar den?" mättes mot kartrepot: 35 commits var
10:e minut, live.json 6,8 min gammal. Kedjan levde. Men läst mot grunden gick TRE saker sönder:
 1. **Ingen manifest.json.** Båda apparna verifierar sha256 ur manifestet och förkastar filen vid
    fel (SnapshotRepo.kt/.swift: "checksum mismatch" ⇒ cachen gäller). Manifestet på CDN var från
    5/9 11:12, live.json från 8/9 — MISMATCH mätt. Appen har alltså INTE fått en enda ny snapshot
    sedan 5/9; "live.json 1,1 min gammal" var sant på CDN och falskt i telefonen.
 2. **Vädret nådde aldrig nuläget.** ingest-live:s nya weather() skrev bara weather_observations
    (arkivet). publicera läser weather_latest, som frös 5/9 11:05. Därför var Storvik 2135 med
    −10,7 °C i september appens enda väderpunkt: tabellen var död, inte stationen.
 3. **Två skrivare, två format.** publicera: broar alltid tomma, SMHI-fält `level`/`g` (motorn
    och kartan läser `niva`/`geom`), olyckans severity ograderad på typ (texten säger "olycka"
    högt — får bara utlösas av Trafikverkets "Accident"), inga gränsstationer (#49), ingen
    färskhetsgräns. publish-map i Actions skrev det gamla formatet — 7 ↔ 0 broar var bara det
    synligaste symptomet.
BESLUT:
 · **publish/snapshot-core.ts är enda källan** till data/app/v1/{static,live,manifest}.json.
   Körtidsneutral (Web Crypto, CompressionStream, Intl); Node (build-snapshot.ts) och Deno
   (publicera) matar in en fråge-funktion. Skuggmotor-mönstret: publicera/index.ts GENERERAS av
   scripts/bundle-publicera.ts ur kärnan + data/bridges.geojson (2 476 broar inbäddade,
   ~120 kB) + publicera/main.ts. CI kör --check.
 · **publish-map skriver aldrig mer data/app/v1/.** Kartlagren och fi/dk-snapshoterna bor kvar.
 · **Givarvakten (#75) i VARJE väderfråga** (svensk, gräns, bro): `sample_time > now() − 3 h`
   OCH `(air_temp_c IS NULL OR surface_temp_c >= air_temp_c − 12)`. Fäller bara på bevisad
   orimlighet, aldrig på okunskap. Storvik (−10,7 vs luft ~12) faller på båda.
 · **Fukt betyder fukt.** Båda gamla skrivarna gjorde `Boolean(precipitation)`; Trafikverket
   skriver "no" vid uppehåll (680 av 1 297 stationer 5/9) och de nordiska "Dry". Alltså var
   varje torr station "våt", och motorn larmar på kall OCH våt ⇒ en falsklarmsmaskin i väntan
   på första kalla torra natten. Nu: regn, snö, eller nederbördsklass som inte är "no"/"dry".
 · ingest-live upsertar weather_latest batchat (UNNEST) för VARJE mätning, inte bara
   arkivvärdiga, med bakåtvakt på sample_time — annars fryser en uppvärmd station på sitt
   sista kalla värde.
BEVIS: 50 tester gröna lokalt (7 nya: format, olycksgate, brokoppling, givarvakt i alla
frågor, fukt, grannschema, manifest-sha256 = node:crypto). PostGIS-testet av givarvakten
ligger i integration.test.ts och körs när CI lever. Bundlen parsar (node --check); Deno-
typkontroll och deploy kan bara Axel göra. Beviset EFTER deploy är en commit i kartrepot med
ALLA TRE filerna och manifestets sha = live.json:s — mät det, lita inte på deploy-kvittot.
LÄXA: "filen på CDN är färsk" är inte "appen har den". Kontrollera alltid manifestet.


## #73 (8/9 2026) Vakthunden flyttad till Supabase — en vakthund får inte dö med det den vaktar
healthcheck.yml låg i Actions. När minuterna tog slut 5/9 tystnade den SAMTIDIGT som kedjan
gick sönder, och att live.json var 66 h gammal upptäcktes bara för att Bengt råkade titta.
Ny edge function `vakthund`, pg_cron varje timme (jobid 20). Kollar tre led i den ordning de
kan brista: (1) hämtar vi — sync_state per källa; (2) sparar vi — nyaste väderobservationen;
(3) NÅR DET APPEN — live.json:s generated_at på CDN. Led 3 är det som faktiskt fallerade och
som healthcheck aldrig kollade: den mätte databasen, inte leveransen.
Larm via GitHub-issue över API:t (inga Actions-minuter), en issue i taget, stängs automatiskt
när allt är grönt. GitHub-flödets källor (cameras, arkivet, FI/NO/DK) har MJUK tröskel — de
vilar tills kvoten nollställs 1/10 och ska inte larma under september.
Bevis: första körningen grön — hämtning 0 min, väderdata 6 min, CDN 6 min.

## #76 (8/9 2026) Bengts granskning: "FIXAT" gällde till CDN:n, inte till telefonen
Bengt granskade #72/#73 mot verkligheten och hittade fyra fel. Alla bekräftade genom mätning,
alla åtgärdade. Granskningen var korrekt på varje punkt.
1. MANIFESTET. Apparna hämtar manifest.json och FÖRKASTAR en fil vars sha256 inte stämmer,
   och behåller den förra. Min publicera-version skrev inget manifest alls: CDN såg färsk ut,
   telefonerna stod kvar på 5/9-snapshoten. Uppmätt mismatch bekräftad. Bengts snapshot-core
   (redan på main, odeployad) skriver manifestet — driftsatt nu, sha stämmer.
2. WEATHER_LATEST ÄR EN TABELL, inte en vy. publicera läser den; min weather() skrev bara
   arkivet, så nuläget frös på 5/9 och appens enda väderpunkt var Storvik −10,7 °C i
   september. Bengts fix skriver båda. Vid driftsättning kraschade den varje minut på
   "cannot cast type boolean to boolean[]" (postgres.js serialiserar bool-arrayer så
   UNNEST inte tar dem) — löst med text[] + ::boolean. Nuläget tinat, verifierat.
3. VAKTHUNDENS BLINDA FLÄCK. Den mätte live.json:s ålder, inte det appen gör. Grön lampa
   på exakt det fel som gjorde att ingen märkte något på tre dygn. Mäter nu manifestets
   sha256 mot filen och larmar på mismatch.
4. PULSJOBBEN. halkvakt-puls-publish, halkvakt-puls-ingest och puls-healthcheck fyrade
   fortfarande mot Actions trots att Supabase gör jobbet. Hade bränt oktoberkvoten på ~9
   dagar. Avschemalagda. Kvar mot Actions: FI, DK, NO, regn-30 — de har ingen Supabase-
   motsvarighet ännu och ska väckas medvetet efter 1/10.
LÄXA: "ligger filen på CDN" är inte samma sak som "appen tog emot den". Verifiera alltid
sista metern, och låt vakthunden mäta det konsumenten gör — inte det producenten skickar.

## #77 (8/9 2026) Kartlagren in i publicera — publish-map:s egen cron bort
FYND (8/9 20:04, kontrollen av Axels åtgärder): tre pulsjobb var av, men publish-map.yml hade
kvar `schedule: */30` (körning #980 19:03:50 var `schedule`). Kartlagren tar 69–74 s ⇒ 2
debiterade minuter × 48/dygn = 96 min/dygn: hela oktoberpotten på 21 dagar, ensam.
BESLUT (Bengt: "vi gör nummer 1 nu"): kartsajtens sex filer byggs av `publish/map-core.ts`
(körtidsneutral, samma mönster som snapshotkärnan #74) och publiceras av `publicera` i SAMMA
commit som appfilerna, på körningarna :00 och :30 (`?karta=1` tvingar). Kadensen 30 min är
oförändrad: DECISIONS #22:s löfte om ≤ 35 min färsk webb, och issue #4:s halvtimmesserie av
vaglag.geojson. Noll Actions-minuter. publish-map.yml har ingen cron längre och bygger varken
kartlager eller data/app/v1 — kvar är fi/dk-snapshoterna, kedjade på ingest OCH ingest-grannar.
Väglagskamerornas fail-soft-gren behållen (TRV-fel ⇒ filen utelämnas, förra ligger kvar) men
noten bär API:ets svarskropp och meta.json bär `kameror_vaglag: null` när den hoppats över.
KOSTNAD PER :00/:30-KÖRNING: ~1,7 MB JSON till Git Data API i sex blobbar, uppskattat 10–20 s
wall-clock, CPU < 0,5 s. Svaret bär `ms` — MÄT första körningen, det är gissning tills dess.
BEVIS: 52 tester gröna lokalt (2 nya: sex filer i kartsajtens format, fail-soft i tre
riktningar), bundlen i synk och parsar. Efter deploy: en :00/:30-commit i kartrepot med nio
filer (tre app + sex karta) och meta.json:s generated_at inom 35 min. Tills dess är kartsajten
kvar på 5/9.


## #77-bevis (8/9 2026 kväll) Kartlagren driftsatta — Bengts tre bevis avklarade
Bengts Claude kunde inte deploya (ingen Supabase-token, ingen CLI, api.supabase.com blockerad
i den miljön). Deployat härifrån från main 15ba9ad efter synkkontroll
(`bundle-publicera.ts --check` ⇒ "publicera/index.ts i synk").
BEVIS 1 — tidmätningen: **ms 10727** (vägguret 11,3 s) mot Bengts 60-sekundersgräns. Ingen
uppdelning av kartlagren behövs. karta-objektet komplett: stationer 1300, kameror_vaglag 746,
vaglag_total 818, olyckor 9, kameror 2783.
BEVIS 2 — commit a8e843f skrev SEX filer, inte nio. Inte ett fel: Git Data API skapar bara
nya blobar för det som ÄNDRATS, och kameror.geojson + vaglag.geojson var byteidentiska med
förra körningen. Alla nio ligger på plats i data/. (Bengt: förväntan "nio filer per commit"
gäller bara när alla nio faktiskt ändrats — normalt är färre.)
BEVIS 3 — data/meta.json generated_at 2026-09-08T20:23:03Z, inte 5/9.
Vakthunden fortsatt grön med manifestkontrollen.
## #78 (8/9 2026) De tre gamla grannlandsfilerna raderade nu, och en deploy-knapp utan Axels terminal
BENGT: "så många som möjligt av de sex punkterna härifrån." Fyra av sex kräver Supabase-token,
databas eller Billing-sidan — inget av det finns i containern (ingen token, ingen CLI, proxyn
släpper bara github.com). Två gick att göra:
 1. **ingest-fi.yml, ingest-dk.yml, ingest-no.yml RADERADE.** Kort #53:s regel var "aldrig före
    avvecklingen — då uppstår ett glapp där ingen hämtar". Regeln antog att Actions levde. Nu
    hämtar ingen ändå (dött sedan 5/9 11:41), pulsen fyrar de tre 2×/h mot döda jobb (288
    misslyckandemejl/dygn till Bengt), och den 1/10 hade samma puls bränt oktoberpotten på de
    gamla filerna INNAN pulsklockan hunnit peka om. Utan filerna svarar GitHub 404 på dispatchen:
    ingen körning, ingen minut, inget mejl. Grannländerna vilar tills första oktoberkörningen
    är `pulsklocka` (inventering, sedan skarp), som skapar puls-ingest-grannar och avvecklar de
    tre pulsjobben — ordningen i kort #53 gäller, bara att filraderingen kom först eftersom
    glappet redan finns. regn-30 KVAR: hourly = 720 min/mån i oktober; sannolikt överflödig
    sedan ingest-live:s weather() arkiverar nederbörd varje minut (#72) — eget kort (#79).
 2. **deploy-supabase.yml**: workflow_dispatch, väljer funktion (eller alla), kontrollerar att
    bundlarna är i synk, deployar med `--no-verify-jwt` (pg_cron talar INGEST_KEY, inte JWT).
    Kräver SUPABASE_ACCESS_TOKEN i Secrets — Axels handgrepp, kort #78. Fäller tydligt utan den.
    Kan inte köras förrän Actions lever; den finns för att 8/9 aldrig ska upprepas: tre fixar
    färdiga på main i timmar och en enda deploy-väg.


## #78 (8/9 2026 kväll) Vakthundens larmväg var trasig — den kunde bara säga "allt bra"
Bengt ville se att vakthunden LEVER, inte bara att den kan anropas. Två fynd.
LEVER: ja. pg_cron har kört den 18:07, 19:07, 20:07, alla succeeded, svar 200. Att ingen
issue skapats var korrekt — allt har varit grönt.
MEN LARMVÄGEN VAR TRASIG: ett medvetet larmprov (?larmprov=1) gav HTTP 500 i stället för ett
larm. Orsak: PAT:en saknar Issues:Write (känt sedan 31/8, DECISIONS #32 — Bengts issue #3
kunde inte besvaras av samma skäl). Vakthunden kraschade alltså exakt när den behövdes och
fungerade bara när inget var fel. Samma slag av fel som #76: en grön lampa på ett led ingen
mätte.
ÅTGÄRD: larmvägen kan inte längre fälla vakthunden. Fel fångas och rapporteras som
`larmvag: TRASIG: …` i svaret, och `ok` blir false. Larmprovet är kvar som permanent
funktion — larmvägen ska kunna provas när som helst utan att något går sönder på riktigt.
KVAR FÖR AXEL: ge PAT:en Issues:Write (eller byt till en token som har det), så går larmet
fram. Tills dess syns problem bara i funktionssvaret, inte som issue.
LÄXA: en larmväg som aldrig provats är ingen larmväg. Prova den medvetet, och låt den aldrig
kunna tysta det den ska larma om.
## #79 (8/9 2026) Kort #42:s facit svalt sedan 5/9 — ingest-live bär nu regnmängden
FYND (Bengts "kan vi åtgärda #42 nu?"): ingest-live:s weather() (8/9, #72) skriver arkivet med
temperatur, daggpunkt, fukt och regn ja/nej — men INTE rain_sum_mm, snow_wateq_mm, vind eller
sikt. Steg 0a i #42 (2/9) lade in regnmängden via GitHub-ingesten, och grind V-A, regn-tackning
och hela vattenplaningsfacit läser rain_sum_mm. Sedan Actions dog 5/9 11:05 har alltså arkivet
fått rader men inga mängder: septemberregnen — "en engångschans i år" (DECISIONS #65) — har
gått förbi omätta i tre dygn, och hade fortsatt göra det med livemotorn i drift.
ÅTGÄRD: ingest-live:s arkivinsert speglar nu ingest/sources/weather.ts fält för fält:
rain_sum_mm och snow_wateq_mm (Aggregated30minutes), wind_speed_ms, wind_gust_ms (byvinden,
höga fordon), wind_dir_deg, visibility_m (sikt, hål C). Inget INCLUDE-filter i tv() ⇒ fälten
finns i svaret. Bevis efter deploy: `select count(*) from weather_observations where
rain_sum_mm is not null and sample_time > now() - interval '1 hour'` > 0 vid regn.
KORT #42 I ÖVRIGT: beslutsläget (a/b/c, DECISIONS #69) är oförändrat och Bengts + Axels.
Grind V-A kan inte köras förrän Actions lever (eller lokalt av Axel med DATABASE_URL:
`node --experimental-strip-types publish/grind-v-a.ts 30`). Radardomen 14/9 står.


## #80 (8/9 2026 kväll) Vintersiffran omräknad på MÄTT kadens — 14 dagar, inte 2 månader
Bengt: "40 000 rader/dygn är GitHub-ingestens takt, stationerna mäter var 10:e minut ⇒
~120 000, gratisnivån räcker 3 veckor." Rätt kritik, fel siffra — verkligheten är värre.
MÄTT (7 596 intervall, senaste 3 h): snitt 5,9 min mellan prover, vanligast 5 min. Alltså
8,6 rader per station och timme, inte 6. Med alla 848 stationer kalla: ~175 000 rader/dygn
= 30 MB/dygn. Databasen är 87 MB, gratisnivån 500 ⇒ **14 dagar**, inte 3 veckor och absolut
inte mina 2 månader. Mitt fel var att räkna på HÄMTNINGSfrekvens; det som styr är
stationens MÄTfrekvens, eftersom ON CONFLICT (station_id, sample_time) sparar varje unik
mättid oavsett hur ofta vi läser.
BENGTS FÖRSLAG HÅLLER OCH BLIR VIKTIGARE: arkivera var 30:e minut, behåll varje minut i
weather_latest. Det är den upplösning Grind A byggdes på, och det tar tillväxten från
175 000 till ~40 000 rader/dygn ⇒ utrymmet räcker en hel vinter. Beslut denna vecka.
ÖPPET, EJ LÖST: #42-fälten (rain_sum_mm, vind, sikt) skrivs fortfarande inte efter deploy av
945a532. Koden är identisk med weather.ts som fungerade före 5/9. Motorn rapporterar
"weather: 128" men max(sample_time) stod still på 20:50 i tio minuter — pekar mot markören
eller mot att samma stationer returneras om igen. Rotorsak EJ hittad. Kort för Bengt.

## #81 (8/9 2026 23:06) Actions-budget satt till 35 USD — pipelinen lever igen
Axel satte månadsbudget 35 USD (~400 kr) på Actions med "stop usage when budget limit is
reached" kvar påslaget. Krävde att ett betalsätt först lades in; budgetraden fanns redan men
stod på 0 med stop=yes, vilket var varför varje jobb dog på 4 s utan runner.
BEVIS: ios-engine dispatchad 23:07 ⇒ success på 66 s. Första gröna Actions-körningen sedan
5/9 13:12. Swift-kontraktet därmed verifierat på aktuell main.
VAD BUDGETEN RÄCKER TILL (mätt på faktiska körtider): efter kvällens flytt ligger bara
regn-30 (0,3 min × 24 = 7 min/dygn) och bridges kvar på cron. Byggena kostar ~11 min per
push (android 8, ios-engine 2, ci 1). 35 USD ≈ 3 500 min till verkligt pris (19,69/2000 =
0,0098 USD/min) — gott om marginal för resten av september.
RISKEN ATT BEVAKA: grannländerna var det som brände de 2 000 gratisminuterna. Bengt
kontrollmätte: 63 lyckade ingest-fi-körningar, median 137 s ⇒ 3 DEBITERADE min/körning
(GitHub rundar upp till hel minut), 48 körningar/dygn = 144 min för Finland ensamt.
De tre länderna ≈ 268 min/dygn. De ligger raderade (404) sedan Bengts avveckling.
RÄTTELSE 1 (Bengt): basförbrukningen är 40–50 min/dygn, inte mina 10. Uppåtrundningen per
jobb slår hårt på korta jobb: regn-30 tar 0,3 min men debiteras 1 min × 24 = 24 min/dygn.
Plus healthcheckens cron, broarna och veckoproven. ~5 kr/dygn — småpengar, men rätt siffra.
RÄTTELSE 2 (Bengt): mitt förslag "två gånger per dygn" för grannländerna var FEL och hade
tystat något utan att synas. Givarvakten (#75, WX_SANE) släpper bara igenom mätningar
yngre än TRE TIMMAR. Med två hämtningar/dygn vore gränsstationerna osynliga 21 av 24 timmar
och halkpunkterna på E8/E10/E12/E14 skulle försvinna. Rätt lösning är den byggda: ETT jobb
för alla tre länderna varje timme med batchade skrivningar (~7 kr/dygn) — eller flytta dem
till Supabase som allt annat, då noll.
RÄTTELSE 3 (Bengt): gränsen gäller från I DAG, inte 1/10. Bevisat: ios-engine grön 23:07.
Allt med cron börjar debiteras direkt, så första körningen ska vara pulsklockan.
De fyra övriga budgetarna (Codespaces, Packages, Git LFS, AI Credits) står kvar på 0 med
stop=yes — de används inte och skyddar mot överraskningar.

## #82 (8/9 2026) Betald Actions-gräns — undantag från gratisnivåregeln, Axels beslut
CLAUDE.md: gratisnivån är lag; en betald gräns kräver en DECISIONS-post godkänd av Axel.
Här är det Axel som beslutar och skriver posten (Bengts formkrav).
BELOPP: 35 USD/månad (~400 kr) på Actions, med "stop usage when budget limit is reached"
kvar påslaget. Övriga fyra budgetar (Codespaces, Packages, Git LFS, AI Credits) står kvar
på 0 med stop=yes.
VARFÖR: app-byggena. Datan behöver inte längre Actions (#72/#73), men CI, Android och iOS
gör det, och utan dem kan ingen ny version nå testarna före oktober. Det är det som avgör
om vintern blir en mätning eller en gissning.
VAD SOM SKA HA HÄNT FÖRE 1 OKTOBER FÖR ATT GRÄNSEN SKA KUNNA GÅ TILLBAKA TILL NOLL:
 1. Grannländerna (FI/DK/NO) sammanslagna till ETT timjobb med batchade skrivningar, eller
    flyttade till Supabase. Så länge de kan väckas i gammal form är 268 min/dygn en risk.
 2. regn-30 avgjord (#79): behövs den när ingest-live arkiverar vädret varje minut?
 3. Pulsklockan som första jobb varje månad, så inget dubbelarbete bränner potten dag ett.
 4. Gallringsregeln (#80) beslutad — den rör Supabase, men hör till samma budgetdisciplin.
Klaras 1–3 räcker gratisnivåns 2 000 min till byggena med marginal, och gränsen sätts
tillbaka till 0. Följs upp i oktober.
## #83 (8/9 2026 21:19) Pulsklockan omstartad efter avbrottet — grannar EN gång i timmen, tre pulsjobb avvecklade
FÖRSTA JOBBET NÄR ACTIONS VAKNADE (Axels 35 USD, #81/#82) var pulsklockan, som planerat sedan
kort #53. Två ändringar krävdes först: mallen (puls-ingest, ingest.yml) hade Axel stängt av 8/9,
så mallvakten hade fällt körningen — mallen är nu puls-regn-30 (regn-30.yml), det pulsjobb som
finns kvar och bär token. Och NYA-listan bar puls-healthcheck, som Axel stängt av med flit
(vakthunden i Supabase tog över) — struken, får inte återskapas härifrån.
INVENTERING (#6, 21:17): 10 cron-jobb, mall #9 puls-regn-30 token=true, skulle skapa 1 och
avveckla 3. SKARP (#7, 21:19): `schemalagt: puls-ingest-grannar (24 * * * *)`, `avvecklat:
puls-ingest-fi/dk/no`, bevisvakten: `OK puls-ingest-grannar … token=true`, `OK …-fi/dk/no: borta`,
"Alla 1 pulsjobben på plats". 8 cron-jobb kvar.
EN GÅNG I TIMMEN, inte 2×/h som de gamla: DECISIONS #82:s rättelse 2. Glesare än så tystar
gränsstationerna (givarvakten #75 släpper bara < 3 h); tätare kostar ~3 debiterade minuter per
körning i onödan. Uppskattad kostnad ~5 min/körning ⇒ ~120 min/dygn ⇒ ~12 kr/dygn tills FI/NO:s
rad-för-rad-inserts batchas (minutplanen A1) eller flyttas till Supabase.
BEVISET är inte den här raden utan grannar-jobbets EGNA körningar på :24 — tre länder på Summary.

## #84 (8/9 2026 23:20) Kort #80: svenska GitHub-ingesten tillbaka med --skip — moaten, kameror, vilt och SMHI har skrivare igen
FYND (healthcheck #144, första körningen sedan Actions vaknade): cameras och road_conditions_arkiv
synkade för 4 922 min sedan. När Axel stängde av puls-ingest 8/9 ("väderhämtningen har flyttat")
stannade fyra saker som INTE flyttat: kamerorna, vinterarkivets egna kursor (road_condition_history
— moaten, #51/#73), polisens viltolyckor och SMHI-varningarna. Inget av det skrevs sedan 5/9 11:11.
VARFÖR INTE BARA SLÅ PÅ: ingest/index.ts hämtade alla sex källor och delar sync_state-nycklarna
`weather` och `deviations` med ingest-live ⇒ två skrivare på samma changeid (läxan #73a).
BESLUT: `--skip=weather,deviations` i ingest/index.ts. Bara de två namnen tillåts (okänt namn fäller
körningen — ett skrivfel får inte bli en tyst nolla). Hoppad källa ⇒ tom lastChangeId ⇒ writeAll
rör inte sync_state (integrationstest #80). ingest.yml kör flaggan; pulsklockan skapar puls-ingest
`11 * * * *` — EN gång i timmen, ~1 debiterad minut (körningen tar 32 s).
BEVIS: ingest #375 från grenen: `hoppar över (livemotorn äger kursorn, kort #80): weather,
deviations`, weather 0 / deviations 0, wildlife 1, smhi 16, kameror delta 0, DB WRITE OK.
Kursorerna weather/deviations i loggen är livemotorns och rördes inte. Pulsklocka inventering #8:
skulle skapa puls-ingest; skarp körning därefter. Healthcheckens cameras/road_conditions_arkiv
ska gå grönt inom en timme — det är beviset, inte den här raden.

## #85 (9/9 2026 01:05) Kort #82: bridges.yml utan cron — knapp med --force
FYND under Bengts brofråga: bridges.yml körde `23 */6 * * *` "tills filen finns, sedan skippar
skriptet i 30 dagar". Filen finns sedan 4/9, men jobbet fortsatte: 32 körningar t.o.m. 8/9 21:15
(körning #32, 10 s, "hoppar över"), varje debiterad som en hel minut ≈ 120 min/mån för ingenting.
Spärren bet dessutom fel åt andra hållet: mtime i ett färskt checkout är alltid nu ⇒ i CI hade
filen ALDRIG uppdaterats, inte ens efter 30 dagar.
BESLUT: cronen stryks. Kvar är workflow_dispatch, och knappen kör `--force` så att ett tryck
hämtar på riktigt. Broar flyttar inte (#50: "statisk fil i repot"); uppdatering är ett medvetet
handgrepp, inte en klocka. Alternativet "cron en gång i månaden" (MINUTPLAN rad 5) valdes bort:
den hade behövt --force för att alls göra något, och en månatlig Overpass-hämtning mot en fil
som inte ändras är fortfarande en minut för ingenting.
BEVIS: inga schedule-körningar av bridges efter mergen; kortet bockas av morgonavläsningen.


## #86 (9/9 2026) Deploy-vägen öppen — Axel är inte längre flaskhals
SUPABASE_ACCESS_TOKEN inlagd i GitHub Secrets (Supabase-token, projekt-scopad till Halkvakt
i org tagratt, ENDAST Edge Functions: Write, 90 dagar). Övriga behörigheter None — särskilt
API Keys, Auth Config, Auth Signing Keys och Edge Function Secrets, alla märkta hög risk.
Full access valdes bort: en deploy-token ska inte kunna röra databasen eller nycklarna.
BEVIS: deploy-supabase.yml dispatchad med funktion=vakthund ⇒ "Deployed Functions on
project xmpfztykhyvhmrzsnjrc: vakthund", grönt. Bengt kan nu deploya utan Axels terminal —
orsaken till att tre färdiga fixar låg odriftsatta i timmar 8/9.
⚠️ GÅR UT ~8 DECEMBER (90 dagar), mitt i vintersäsongen. Påminnelse behövs, annars är det
nästa tysta fel: deployer slutar fungera utan att något ser trasigt ut.
KVAR: PAT:en behöver Issues:Write, annars kan vakthunden inte larma (#78).

## #87 (9/9 2026) Kort #83 steg 1: arkivet tunnas till 30 min efter 7 dygn — Axels ja, byggt av Claude
VARFÖR: Axels mätning 9/9 (183 B/rad, mest aktiva station 233 rader/dygn, 92 av 500 MB använda)
ger vintern ~11 dygn på gratisnivån innan ingest-live dör tyst. Ingen dom läser 10-minuters-
upplösningen: grind A och grind V-A hinkar på 30 min och tar senaste raden per hink (BUCKET_S =
1800, ORDER BY sample_time DESC), missar.ts läser 45-minutersfönster. GitHub-ingesten hade 2×/h
när grind A byggdes — tunningen återställer den upplösningen, inget mer.
BESLUT: sql/014_gallring.sql: `gallra_vader(dagar)` behåller per station och 30-minutershink
(ordagrant grind A:s floor(epoch/1800)) den senaste raden och raderar resten för allt äldre än
`dagar`; standard 7 (sista veckan i full upplösning för missar och felsökning). pg_cron
`halkvakt-gallring` 03:15 UTC dagligen, vaktad med IF EXISTS pg_extension (CI:s PostGIS saknar
pg_cron — samma läxa som rollerna i 003). Axel kör filen i SQL-editorn: deploy-tokenen får inte
röra databasen (#86), och 014 läggs INTE i ingest/db.ts auto-migration — ett cron-jobb ska
skapas av en människa, inte av nästa timkörning.
EFFEKT: 848 × 48 ≈ 41 000 rader ≈ 7,4 MB/dygn ⇒ ~55 dygn på återstående 408 MB. INTE en vinter:
nov–mars ≈ 1,1 GB även tunnat ⇒ steg 2 (export till Storage, gratis, eller Pro) är ett
oktoberbeslut med båda underskrifter. Stationer med 5-minuterstakt (233/dygn) tunnas till
samma 48. DELETE frigör inte disk förrän autovacuum återanvänt den — storleken planar ut.
BEVIS: (1) lokal Postgres 16 mot attrapptabell: 576 rader → 336 raderade (144→48, 288→48,
gårdagens 144 orörda), kvar i hink 0 är 00:20 resp 00:25 (senaste), andra körningen 0, filen
omkörd utan fel. (2) Integrationstest #83 i CI mot riktiga tabellen med PostGIS-geom. (3) Efter
Axels körning: rader/dygn äldre än 7 d ≤ 45 000 i SQL-editorn och grind-a:s n oförändrat 14/9.
Alternativ bortvalda: tunna vid SKRIVNING i ingest-live (rör livemotorn, tar bort felsökningens
minutupplösning, och en bugg där kostar data för alltid — en DELETE i efterhand kan provköras);
filtrera på yttemp (V-A behöver regn oavsett temperatur).

## #88 (9/9 2026) Kort #85: två snitt i Actions-takten — grannar batchade, publish-map nedlagd
MÄTT (morgonavläsning 9/9, kort #85): ~240 debiterade min/dygn med gratispotten slut ⇒ ~42 USD till
1/10 ⇒ 35 USD-gränsen (#82) nådd ~26/9 och Actions dör tyst en andra gång. Två av tre snitt byggda
nu; det tredje (puls-regn-30) är en SQL-rad som bara Axel kan köra.
SNITT 1 — GRANNAR BATCHADE (ingest/grannar-db.ts): fi.ts/no.ts/dk.ts skrev en INSERT per station
och tabell (FI 526 × 2, NO 468 × 2 nätverksvarv mot poolern). Uppmätt i ingest-grannar #10: FI 2 min
51 s, DK 32 s, NO 2 min 25 s ⇒ 6 debiterade minuter × 24 = 144 min/dygn. Nu en UNNEST-sats per
tabell (samma mönster som ingest/db.ts), kolumner och ON CONFLICT ordagrant desamma, transaktionen
orörd. Förväntat ≤ 2 min/körning; beviset är körtiden i nästa pulsade körning, inte den här raden.
SNITT 2 — PUBLISH-MAP NEDLAGD: workflowen kedjades (workflow_run) efter BÅDE ingest och grannar ⇒
48 jobbstarter/dygn à en debiterad minut för 20 s arbete, och efter ingest var körningen dessutom
meningslös (fi/dk-datan kommer från grannar). fi/dk-snapshoterna byggs nu som sista steg i
ingest-grannar.yml, bara när alla tre länder lyckats (samma villkor som förr: conclusion == success),
noll extra jobbstarter. publish-map.yml raderad. Kartlagren och den svenska snapshoten rörs inte —
publicera i Supabase äger dem sedan #74/#77.
EFFEKT om mätningen håller: 240 → ~100 min/dygn ⇒ ~17 USD till 1/10; med regn-30 stängd ~75 ⇒ ~13.
BEVIS: (1) integrationstest #85 mot CI:s PostGIS med riktiga fi/no/dk-scheman (typkastningen i
UNNEST är det som kan gå fel). (2) Nästa ingest-grannar på pulsen (:24): körtid och fi/dk-commit i
kartrepot i samma körning. (3) Kvällsavläsningen räknar min/dygn mot 240-baslinjen.
Bortvalt: kedja publish-map bara på grannar (halverar, men behåller en jobbstart för ingenting);
sammanslagning av ingest + grannar i ett jobb (#82 punkt 1 nämner det — sparar en prolog/timme men
binder svenska kameror/vilt/SMHI till grannländernas fel; oberoendet var Bengts villkor för #53).
BEVISAT 9/9 08:24 (ingest-grannar #12, första på b0420e8): 44 s totalt mot 6 min 04 s i #10 — FI 6 s
(2:51), DK 13 s (0:32), NO 7 s (2:25), fi/dk-steget 6 s; kartrepot commit a28ea98 08:24:42 med fi+dk
live/manifest ur samma körning. En debiterad minut i stället för sex.

## #89 (9/9 2026 10:47) puls-regn-30 avvecklad — kort #79 stängt, tredje snittet i #85
Axel ("i övrigt kör vi", 9/9 fm, relayerat av Bengt) + Bengt ("kör"): regn-30 är överflödig sedan
ingest-live deployades 9/9 05:00 — livemotorn skriver rain_sum_mm varje minut, och regn-30 kom bara
in där ingest-live inte skrivit alls (restnischen, kort #44/#84). Kostnad 24 debiterade min/dygn.
GENOMFÖRT via pulsklockan, inte handskrivet SQL: AVVECKLA += puls-regn-30, MALLFIL bytt till
ingest-grannar.yml FÖRE avvecklingen (mallvakten får aldrig peka på ett jobb som tas bort i samma
körning). Inventering #10 (10:46): 9 jobb, mall #21 puls-ingest-grannar token=true, "puls-regn-30
finns → tas bort". Skarp #11 (10:47): `avvecklat: puls-regn-30`, bevisvakten OK på alla sex rader,
8 jobb kvar. regn-30.yml står kvar som knapp (workflow_dispatch) för en manuell motfasmätning om
kort #44 någonsin behöver den. FYND i samma lista: inget `halkvakt-gallring`-jobb ännu — 014 har
inte körts av Axel (kort #83). Sista kvittot: ingen regn-30-körning 11:41.

## #90 (9/9 2026 10:58) DB-knappen: migrationer och larmprov via Actions — gallringen körd, larmvägen bevisad
Bengts order ("vi gör allt i meddelandet från Axel + halkvakt gallring jobb + kör larmprov"). Ingen av oss
kan nå SQL-editorn härifrån, men DATABASE_URL ligger redan i Actions-secrets och migrerar i ingesten varje
timme. Ett medvetet tryck är inte auto-migration: dbknapp.yml (scripts/dbknapp.ts) kör en namngiven fil ur
sql/ i en transaktion och skriver ut bevisrader efteråt, eller vakthundens larmprov genom att läsa
vakthundens eget cron-kommando ur cron.job och lägga ?larmprov=1 på URL:en (exakt en träff krävs,
kommandot skrivs aldrig ut — nyckeln passerar ingen logg).
GALLRINGEN (dbknapp #1, 10:58:37): 014 körd, `gallra_vader(7)` = 3 551 raderade, `halkvakt-gallring
15 3 * * * active=true`, rader 8–9 dygn gamla 15 744, tabellen 37 MB / 207 587 rader. Det låga talet är
väntat: allt äldre än 7 dygn kommer från GitHub-ingestens 2×/h (redan 30-minutersupplösning) och 5–8/9
saknar data. Minutupplösningen från ingest-live (8/9→) passerar 7-dygnsgränsen 15/9; första riktiga
tunningen är nattkörningen 16/9 03:15, beviset läses 16/9.
LARMPROVET (dbknapp #2, 10:58:29): issue #91 "🔴 Vakthunden: kedjan är bruten" skapad 10:58:40 med
etiketten vakthund och LARMPROV-raden. PAT:en har alltså Issues:Write — Axels "full behörighet" bevisad,
och kort #78:s larmväg är hel. Issuen ska stängas automatiskt av vakthundens nästa gröna körning 11:07;
det är kvittot på att larmvägen fungerar åt båda hållen.

## #91 (9/9 2026 11:09) puls-healthcheck tillbaka — som BRO, inte som slutläge (kort #50, Bengt)
Axel var osäker ("har inte pulsklockan orsakat bekymmer?"). Mätningarna säger nej: pulsen har levererat
på sekunden varje gång den mätts (healthcheck 6/6, regn-30 23/23, grannar och ingest 4/4 + 4/4 i natt);
GitHub-cronen gav 40 % och fyrtimmarshål 9/9 (02:23 uteblev, 04:23 kom 25 min sent). Det som såg ut som
pulsens fel 5/9 var Actions-gränsen. Bengts beslut: på, som bro.
VARFÖR BRO: vakthunden i Supabase har sedan 9/9 10:58 en bevisad larmväg (issue #91 öppnad av larmprovet,
stängd av nästa gröna körning 11:07:02), men den ser bara livekedjan och manifestet. Healthchecken är
ensam om grannländerna, gränsstationerna, kamerorna, arkivvakten och kartlagren. Rätt slutläge är #82:s
regel — allt nytt bor i Supabase: flytta de fem kontrollerna in i vakthunden och lägg ner healthcheck.yml
(kort #87, låst bakom 14/9). Tills dess: 12 jobbstarter/dygn ≈ 12 min ≈ 2 USD till 1/10.
GENOMFÖRT: pulsklocka #12 (inventering) + #13 (skarp, 11:09): `schemalagt: puls-healthcheck
(23 */2 * * *) → healthcheck.yml`, bevisvakten OK token=true, 10 cron-jobb (varav halkvakt-gallring
från 10:58). BEVIS: healthcheck som workflow_dispatch på :23 varannan timme från 12:23, inget mellanrum
över 2 h 30 under ett dygn — läses av morgonavläsningen 10/9.


## #92 (10/9 2026, incheckat 11/9) TROSKLAR-TRENDEN fastställt — kort #88:s nyckel öppnad
BESLUT: Bengt fastställde 10/9 i chatten trösklarna för TRENDEN (systemanalysen §2.1, kort #88):
svepet i §2, golven i T-B (B3 ≥ 20 %, nettonytt ≥ 5 %, falsklarm ≤ 25 %) och underlagskraven i T-C.
Axel kontrasignerar genom bock på tavlan, samma form som #61 och #68. Dokumentet är
`docs/TROSKLAR-TRENDEN.md`, 225 rader. Ingen kod; skuggkolumnen är fortsatt låst bakom radardomen
14/9 (kort #81:s ordning).

VAD SOM ÄR NYTT MOT SYSKONDOKUMENTEN: falsklarmsdefinitionen är ASYMMETRISK. Trenden säger *risk*,
inte *är*, och en risk som inte faller ut är inte automatiskt fel — molnen kan ha rullat in efter att
varningen gavs. Fyrningar som inte ledde till ≤ 1 °C delas därför i "risk som inte föll ut" (ytan kom
inom 0,5 °C av tröskeln inom 90 min; räknas INTE som falsklarm) och verkligt falsklarm. Utan den
delningen straffar måttet trenden för att vädret ändrade sig, och 25 %-taket mäter något annat än man
tror. Samma princip som V-A:s facittabell, där "regn utan olycka" inte är falsklarm.

ALTERNATIV SOM VALDES BORT: symmetrisk falsklarmsräkning (enklare, men mäter fel sak); att sätta
lutningströskeln direkt i dokumentet (bryter husregeln att trösklar faller ur mätning — därför svep,
och T-A väljer värdet); att låta B3 ensamt bära nyttan (en trend som bara är tidigare på tillfällen
punktregeln ändå fångar skulle passera, därför eget golv på nettonya svansen).

GOLVEN ÄR ETT MEDVETET UNDANTAG: 20/5/25 har inte fallit ur mätning. De är golv mot brus, inte
trösklar i regeln, och får flyttas fram till första skuggkörningen med en rad här. Därefter gäller
dokumentets §8: båda signaturerna, och en motivering som inte lutar sig mot utfallet.

TVÅ HÅL SOM BOKFÖRS I SAMMA ANDETAG, INTE TYST:
1. Dokumentet låg OINCHECKAT ett dygn (skrivet 10/9 23:04, incheckat 11/9 på Bengts order). Det fanns
   varken på origin, i gren eller PR — enda kopian låg i ett arbetsträd. Repot är enda synken mellan
   parallella sessioner. Läxan är förd till CLAUDE.md: ett fastställt tröskeldokument checkas in i
   samma varv som det fastställs, annars finns det inte.
2. Dokumentet citerar `docs/TROSKLAR-TYSTNADSFEL.md` på tre ställen som B3-syskon. Den filen finns
   inte i repot. Tystnadsfelsmåttet i T-B står därför på egna ben tills någon skriver den; källraden
   är märkt, och eget kort krävs innan T-B körs skarpt.

BEROENDE ATT MINNAS: T-A kan köras ur arkivet ensamt vid höstens första frostnätter, men T-B och T-C
kräver facit om verklig halka — marsdomen eller försäkringsbolagens skadedata (#94). Kortet är alltså
delvis en beställning på #94, och ett argument till för att ta försäkringsbolagen först. Datavarning
till domen: minutupplösningen började 9/9; allt äldre är 30-minutersrader som inte duger till
15/30-minutersfönster.

## #93 (11/9 2026) TROSKLAR-TYSTNADSFEL fastställt — kort #98, och ett sakfel i #92 rättat
BESLUT: Bengt fastställde 11/9 i chatten TROSKLAR-TYSTNADSFEL som godkänt och tillämpligt, inte som
utkast. Axel kontrasignerar genom bock på tavlan, samma form som #61/#68/#92. Fastställda: måttets
definition (§2–§4), räckviddsvillkoret (§6) och facitstacken (§8). Dokumentet är
`docs/TROSKLAR-TYSTNADSFEL.md`, bokfört som kort #98. Ingen kod; skuggkolumnen är låst bakom
radardomen 14/9 (kort #81:s ordning), och röst kräver grind-A/B/C-dom i mars.

VAD MÅTTET GÖR: det vänder på utvärderingen och räknar tystnadens fel i stället för larmens träff.
Varje bekräftat halttillfälle där systemet teg klassas som OURSÄKTLIGT (signal fanns — daggpunktsgapet
slöt sig, trenden pekade mot nollgenomgång, eller en station inom räckvidd visade risk och nattens
representativitetsradie sträckte sig dit) eller URSÄKTLIGT (ingen signal — snöby bara radarn ser #43,
saltbil utan öppen källa, kommunal gata utan givare #93). Bara det oursäktliga går att laga med en
tröskel; det ursäktliga är ett argument för nya källor. Priset räknas bredvid som nya falsklarm per
kandidattröskel, och där de två kurvorna korsar sitter tröskeln.

VARFÖR DET BEHÖVDES: det avgör Bengts egen tvist från 10/9 med data i stället för princip. Ett missat
svartisvarning kan döda, ett falsklarm irriterar — men varje larm sänker värdet av nästa. Utan måttet
är valet en åsiktsfråga.

RÄCKVIDDSVILLKORET (§6) ÄR DET SOM GÖR MÅTTET ÄRLIGT: en tyst miss räknas bara när halkan låg inom
systemets räckvidd men utanför dess röst. Annars drunknar tröskelsignalen i täckningshål, som är ett
annat problem (#93) och inte ska blandas in.

HUR DET HITTADES: dokumentet skrevs 10/9 kl 21:09 och låg kvar i Bengts Drive. Det gick alltså samma
väg som TROSKLAR-TRENDEN (#92) — skrivet, aldrig incheckat — men ett steg värre: trenden fanns
åtminstone på disk, det här fanns bara i Drive. Bengt hittade det själv 11/9. Läxan i CLAUDE.md från
#92 gäller därför även dokument som föds i Drive, inte bara i arbetsträdet.

SAKFEL I #92 SOM DETTA AVSLÖJADE, OCH SOM ÄR RÄTTAT: TROSKLAR-TRENDEN §6 påstod att T-B har "samma
beroende som TROSKLAR-TYSTNADSFEL", alltså kort #94 (försäkringsbolagens skadedata). Tystnadsfelets §8
skrevs om 10/9 kl 21:09 och tog uttryckligen bort det beroendet; trenden skrevs 23:04 och citerade
alltså en version som redan var ersatt. §6 bär nu en rättelse.

ÖPPEN FRÅGA SOM FÖLJER, INTE AVGJORD HÄR: om tystnadsfelet klarar sig på befintligt facit, varför ska
trendens grind T-B vänta på #94? Kamerafacit är kandidaten — 738 av 744 kameror står vid en
VViS-station (#55) och ligger därmed per konstruktion inom räckvidd, vilket är precis T-B:s
räckviddsvillkor. Håller det kan T-B köras i höst i stället för i mars. Frågan står på kort #88 och
#98 och kräver Bengt + Axel; den flyttar en tidplan och avgörs inte av en session.

FORMATERING: dokumentet hade rundgått via Drive, som escapar markdown och plattar tabeller.
Formateringen är återställd vid incheckningen; innehållet är oförändrat utom statusraden (förslag ⇒
fastställt) och kortnumret (#97 ⇒ #98, eftersom #97 togs av regex-blindfläcken 11/9 04:45).

## #94 (11/9 2026) Försäkringsspåret stängt — T-B väntar inte, och skuggar från första frosten
BESLUT (Bengt, i chatten): "Vi kommer inte att vänta på några försäkringsbolag i T-B. Det är klarlagt
att vi inte kan få det samarbetet." Försäkringsbolagen utgår därmed som facitkälla och som första spår
i kort #94. Grind T-B i TROSKLAR-TRENDEN (#88) och tystnadsfelet (#98) döms mot vår egen facitstack.

FACITSTACKEN SOM GÄLLER, oförändrad i sak sedan TROSKLAR-TYSTNADSFEL §8 (10/9 21:09), nu även för T-B:
- Kamerafacit (#20) är den BÄRANDE källan: 738 av 744 väglagskameror står vid en VViS-station (#55).
  Facit ligger därmed per konstruktion inom räckvidd, vilket är precis T-B:s räckviddsvillkor. Det är
  inte en lycklig tillfällighet utan skälet till att stacken duger: den mäter där systemet hade en
  chans att tala.
- road_condition_history: operatörens omklassning till halka/is är facit på att det var halt.
- situation_archive (#33): olyckor och stoppade fordon med position och tid.

KONSEKVENS SOM ÄR EN TIDPLAN, INTE BARA EN KÄLLA: facitstacken flödar kontinuerligt från första
frosten, så T-B skuggar FRÅN HÖSTEN i stället för att vänta på mars. Mars-domen är inte längre T-B:s
förutsättning utan dess fördjupning — en hel vinters bekräftade halttillfällen läggs ovanpå när den
finns. Samma sak gäller redan #98.

VAD SOM FÖRLORAS, ärligt: försäkringsbolagens skadedata hade varit facit av en annan kvalitet — verklig
personskada och plåtskada, inte operatörens klassning eller en kamerabild. Vi mäter nu mot vad
väghållaren och våra egna kameror såg, inte mot vad som faktiskt hände med bilarna. Den begränsningen
ska stå i domen, inte upptäckas i efterhand.

VAD SOM OCKSÅ FÖLJER: kort #94 förlorade sitt facitmotiv men inte hela sitt syfte. Åkerier och
bussbolag blir första spåret — de är både testbilar och B2B-marknad — följt av NTF och M Sverige som
kanaler. Drive-analysens §2.7 ("försäkringsbolag först, de har facit") är överspelad; tavlan gäller,
som den analysen själv skriver.

ÄNDRADE FILER: docs/TROSKLAR-TRENDEN.md §6 (omskriven) och §7 (tabellraden för T-B), TAVLA.md #88,
#94 och #98. Beslutet är Bengts ensamt; Axels bock på #88 och #98 kvarstår som förut och rör
trösklarna, inte facitkällan.

## #95 (11/9 2026) Axels kontrasignering av #88 och #98 — båda tröskeldokumenten fullt godkända
BESLUT: Axel kontrasignerar TROSKLAR-TRENDEN (kort #88) och TROSKLAR-TYSTNADSFEL (kort #98) genom
Bengt, i chatten. Samma form som #61 (trösklarna fastställda av Axel via Bengt) och #68. Båda
dokumenten är därmed godkända av båda, och ingen mänsklig signatur saknas längre för något av dem.

VAD SOM DÄRMED ÄR LÅST: trendens svep (§2), golven i T-B (B3 ≥ 20 %, nettonytt ≥ 5 %, falsklarm
≤ 25 % asymmetriskt räknat) och underlagskraven i T-C; tystnadsfelets måttdefinition (§2–§4),
räckviddsvillkoret (§6) och facitstacken (§8).

VAD BOCKEN INTE GÖR, och det ska stå tydligt så ingen tror något annat:
1. Den låser inte §8:s ändringsregim. Den är knuten till FÖRSTA SKUGGKÖRNINGEN, inte till signaturen.
   Fram till dess får svepet och kraven justeras av vem som helst av oss med en rad här; därefter
   krävs båda signaturer och en motivering som inte lutar sig mot utfallet.
2. Den låser inte upp bygget. Skuggkolumnerna står fortsatt bakom radardomen 14/9 (kort #81:s ordning).
   Det som återstår är alltså en teknisk grind, inte en mänsklig.
3. Den godkänner ingen röst. Röst kräver grind-A/B/C-dom i mars OCH ett separat ja från Axel, med
   rösttext, plats i A-skalan och PRODUKTBOK enligt produktboksregeln.

LÄGET EFTER DETTA: fyra tröskeldokument ligger i repot, alla fastställda — SKUGGAN (#61), VATTENPLANING
(#68), TRENDEN (#92 + detta) och TYSTNADSFEL (#93 + detta). Nästa grind för #88 och #98 är densamma
som för #42/#45: radardomen på söndag.

## #96 (11/9 2026) Steg 0 för kort #89 kört — hålet bevisat, två proxies stryks, en fråga skjuts på framtiden

BESLUT: förstudiens steg 0 (docs/OVERGANGAR-ANALYS.md §9) är byggt som `scripts/overgangar-steg0.ts`
med knappen `overgangar-steg0` (workflow_dispatch, aldrig cron — kort #85) och kört en gång mot
arkivet, 14 dygns fönster (PR #124, körning 34579255737). Helt läsande. Fyra av sex frågor gav svar,
två gav OAVGJORT — och båda OAVGJORT ändrar regelskissen i §4.2.

VAD SOM MÄTTES, och vad det betyder för bygget:
* **0a. Hålet är bevisat och bredare än förstudiens gissning.** På 124 av 189 användbara regnstopp
  (66 %) visade stationens regnmätare regn i de senaste 30 minuterna i exakt den stund motorns
  `moisture` slog om till torrt. Mätaren stod kvar över noll median 35 min efter omslaget. Förstudien
  skrev "väntat ~10 min"; golvet är ~35 min. p75/p90 (1,8–1,9 h) ligger mot frågans eget 2-timmarstak
  och är censurerade — de ska läsas som "minst så länge", aldrig som ett värde.
* **0b. RH-guarden i §4.2 stryks som svep.** Luftfuktigheten STIGER efter regnet (median 90 % vid
  +1 h, 95 % vid +4 h; ≥ 80 % i 74–84 % av fallen). En guard vid 80 eller 90 % filtrerar bort nästan
  ingenting och ger bara falsk precision. Svepet "ingen · 80 · 90 %" krymper till "ingen guard",
  och den som vill återinföra den får göra det mot mätning.
* **0c. Populationen finns, frysningen inte än.** 189 användbara omslag över 14 dygn ≈ 14/dygn i
  riket. Bara 3–4 följdes av yta ≤ 1 °C, och N = 1 h → 4 h lägger till exakt ett fall. Det är
  september och det är väntat: domen kräver höstens första frostnätter (samma fönster som #88:s T-A).
* **0d. Oljefilmen kan inte dömas i höst.** 55 äkta torrperioder ≥ 5 dygn med 6 olyckor i
  20-minutersfönstren, mot V-B-grindens krav på 200 fyrningar och 15 facit-olyckor. (b) får därför
  en uttrycklig nedläggningsklausul i tröskeldokumentet i stället för ett löfte om dom.
* **0e. Operatörens "Våt" stryks ur unionen i §4.2 tills vidare.** 33 Våt-rader i väglagsarkivet,
  NOLL med en efterföljande klassning, noll nya rader i fönstret — arkivet står stilla sedan 25/8.
  En proxy vars eftersläpning är omätbar får inte ingå i ett fuktvillkor. Frågan öppnas igen när
  operatören klassar om vägar, alltså i vinter.
* **0f. Radarn samplar 8,3 % av tiden.** 24 prov/dygn × 5 minuter. Resten är osamplat, och en skur
  som börjar och slutar mellan två prov lämnar inget spår. För (a):s N-timmarsfönster betyder det
  ungefär N prov — tunt, men inte tomt.

DRIFTVAKTEN, och varför den finns: fuktvillkoret bor i mätningen i två former, som SQL i frågan och
som motorns egen `fukt()` i TypeScript, och körningen jämför dem rad för rad. Utfallet: ense om alla
7 146 omslag. Utan den vakten hade mätningen kunnat mäta en annan regel än den motorn kör och ändå
se grön ut — samma klass av fel som kodgrindens falska gröna (#71).

ETT FEL RÄTTAT I SAMMA VARV: första körningens 0f-rad räknade `distinct observed_at` (median 15/dygn)
gånger 5 minuter och kallade det "5,2 % av dygnet observerat". Det var att läsa händelsefiltrering
som kadens — radar_precip får en rad bara när radarn ser regn ≥ 0,1 mm/h någonstans (sql/009), så
talet mäter hur många timmar som hade regn i landet. Kadensen är 24/dygn. Skriptets text är rättad;
siffrorna är oförändrade, så ingen omkörning gjordes (minutdieten, #22).

TVÅ KÄNDA LUCKOR I INSTRUMENTET, att täppa innan grinden i vinter läser det:
1. 0a:s svans är censurerad vid 2 h OCH kan innehålla återkommande regn — flimmervakten stänger bara
   de första 30 minuterna. Ett längre fönster plus ett krav på fortsatt uppehåll behövs för ett tal
   på p75/p90.
2. 0d räknar olyckor i fönstren utan förväntat antal. Sex olyckor är ett tal, inte ett bevis, förrän
   en nollhypotes finns (samma exponering, slumpmässiga tidpunkter).

ALTERNATIV SOM VALDES BORT: att gå direkt på tröskeldokumentet utan mätning (förstudien hade då
skrivit in "~10 min" och en RH-guard som inte filtrerar, och räknat "Våt" som en bärande proxy); att
köra om mätningen efter texträttelsen i 0f (siffrorna oförändrade, en minut sparad).

LÄGET EFTER DETTA: steg 0 är klart och kortet #89 kan gå vidare till steg 1 — TROSKLAR-OVERGANGAR,
som inte är kod och inte behöver radardomen. Steg 2–4 ligger kvar bakom 14/9.

## #97 (11/9 2026) Gallringsfällan i steg 0 — två tal i #96 rättade, och en regel för alla arkivläsningar

BESLUT: steg 0 (och varje framtida mätning som bygger på minutupplösning) körs med `dagar <= 7`,
och en händelse måste läsas INOM sju dygn efter att den inträffat. Två tal i #96 är rättade.

FYNDET: gallringen (kort #83, sql/014) behåller en rad per station och halvtimme för allt äldre än
sju dygn. Steg 0:s gap-vakt kastar varje omslag där föregående rad ligger mer än 20 minuter bort —
alltså blir HELA den gallrade halvan av ett 14-dygnsfönster obrukbar per konstruktion. Det syntes som
6 866 GAP av 7 146 omslag i den första körningen, och jag läste det som "arkivdieten", vilket bara var
halva sanningen: dieten glesar i nuet, gallringen raderar i efterhand.

BEVISET (körning 34580876588, `dagar=7`, mot 34579255737, `dagar=14`):
* 7 dygn:  1 971 omslag, 157 användbara, 120 med mätarregn vid omslaget (76 %), 22 omslag/dygn
* 14 dygn: 7 146 omslag, 189 användbara, 124 med mätarregn vid omslaget (66 %), 14 omslag/dygn
Den gallrade veckan bidrog alltså med 32 användbara omslag av 5 175 — en avkastning på 0,6 % mot den
ogallrade veckans 8 %. Skillnaden är gallringen, inte vädret.

RÄTTADE TAL I #96:
* 0a: mätarregn vid omslaget i **76 %** av fallen (120 av 157), inte 66 %. Hålet är större än
  rapporterat: tre av fyra regnstopp, inte två av tre.
* 0c: populationen är **22 användbara omslag/dygn**, inte 14.
* Oförändrat: medianen 35 min (robust mot fönstret), RH-guardens död (7-dygnskörningen är om möjligt
  tydligare — ≥ 80 % i 96 % av fallen vid +3 h), 0d, 0e och 0f.

VARFÖR DET SPELAR ROLL BORTOM DEN HÄR MÄTNINGEN: varje dom som behöver veta vad som hände MELLAN två
halvtimmar måste falla inom sju dygn. Det gäller #88:s trendkolumn och #98:s tystnadsfel lika mycket
som #89. Gallringen är rätt beslut (utrymmet räcker annars elva dygn i vinter), men den sätter en
tidsgräns på retrospektiv analys som ingen av tröskeldokumenten nämner i dag.

ALTERNATIV SOM VALDES BORT: att höja gap-vakten till 35 min så att gallrade rader duger. Det hade gett
fler "omslag" men inte fler observationer — en halvtimmesrad kan inte säga när regnet slutade, bara
att det var torrt vid provet. Falsk precision är värre än OAVGJORT.

LÄGET EFTER DETTA: #96 står kvar med sina slutsatser; bara de två talen är rättade. Regeln `dagar <= 7`
gäller från nu, och en körning efter höstens första frostnätter ska ske inom sju dygn efter dem.

## #98 (11/9 2026) Frostlarm i vakthunden — påminnelsen som larmar själv, och givarvakten som provet avslöjade

BESLUT: steg 0:s omkörning efter höstens första frost påminns av en HÄNDELSEVAKT i vakthunden
(check 5, PR #128), inte av en passiv issue. Larmet fyrar en enda gång när minst 50 stationer haft
vägyta ≤ 0 °C det senaste dygnet, öppnar en issue med etiketten `frostlarm` tilldelad Bengt, och
skriver sin räknare i mätvärdena varje timme. Timvis i Supabase via pg_cron ⇒ noll Actions-minuter.

VARFÖR INTE BARA EN ISSUE: avläsningen har en hård deadline på sju dygn (#97, gallringen). Issue #127
och en minnesfil finns kvar som passiva spår, men de förutsätter att någon tittar. Kommer frosten en
torsdag och veckan därpå går åt till annat är fönstret stängt innan påminnelsen lästs. Skillnaden mot
radardomen är att den har ett datum; frosten har bara ett villkor.

SNUBBELTRÅD, INTE MÄTNING: larmet räknar stationer med frusen yta — inte regnstopp följda av frost,
som är 0c:s fråga. Att bygga om steg 0:s klassning i en timvis funktion hade gett en andra
implementation av samma regel, vilket är precis vad steg 0:s driftvakt finns för att förhindra.
Tråden säger "gå och titta"; knappen mäter. Tröskeln 50 är ett golv mot brus i trendens mening
(TROSKLAR-TRENDEN §2), ingen mätt gräns — enstaka fjällstationer under noll i september ska inte
väcka någon. Räknaren i mätvärdena gör tröskeln ändringsbar mot verkligheten.

PROVET HITTADE ETT FEL, OCH DET ÄR HELA POÄNGEN MED PROV: första körningen (issue #129) rapporterade
"4 stationer … kallast −49,9 °C". Det är ingen vägyta utan en trasig givare — samma sort som Storvik
2135, som stod på −10,7 °C i september och var appens enda halkpunkt (#75). Snapshoten filtrerar bort
dem med WX_SANE; min frostfråga gjorde det inte, och en snubbeltråd som räknar trasiga givare kan
väcka folk mitt i sommaren. Rättat i PR #130 med ett krav STRÄNGARE än snapshotens egen vakt:
lufttemperaturen måste FINNAS, så att rimligheten alls går att pröva. En station vi inte kan
kontrollera får inte väcka någon — "silence is a feature" gäller vakthunden med.

BEVISET, mätt EFTER deployen (f964dd6) och inte ur commit-hashen: vakthundens mätvärden i issue #131
skriver `frost: 1 stationer med yta <= 0 °C senaste dygnet (larm vid 50)`, mot provets 4 före
rättelsen. Tre av fyra föll alltså på rimlighetsprövningen. Att provet och det skarpa larmet bär
skilda etiketter (`frostlarm-prov` mot `frostlarm`) gör att hela den här övningen aldrig rörde
engångslarmet: det står oanvänt och väntar på frosten.

ALTERNATIV SOM VALDES BORT: ett schemalagt veckojobb som frågar "har det frusit?" (kort #85:s
minutdiet säger nej till jobb som mäter ingenting elva månader om året); att låta larmet kommentera
på #127 i stället för att öppna en egen issue (etiketten är engångsnyckeln i det här mönstret, och
#127 bär redan etiketten `efter-frosten`); en absolut nedre gräns som −40 °C i stället för
givarvakten (godtycklig, och den hade inte fångat Storviks −10,7 °C).

LÄGET EFTER DETTA: kort #89 har allt steg 0 kan ge i september. Nästa avläsning sker när larmet
fyrar. Steg 1 (TROSKLAR-OVERGANGAR) väntar på Bengt och är varken kod eller Actions-minuter.
## #99 (11/9 2026) Vinterdagen — fem påhittade resor genom den riktiga motorn
scripts/vinterdag.ts. Fem scenarier på riktiga referensrutter med PÅHITTADE väderlägen:
novembermorgonen (allt samtidigt), klarnatten efter regnet (#89a:s hål), nollgradersdimman
(gränsfallet ±0,1 °C), torra vinterdagen (tystnadskontroll) och långresan (45-sekunders-
spärren under press).
VAD DEN INTE FÅR GÖRA: döma en regel. Grind A, tystnadsfelet och #89:s B3-par kräver
verklig frost mot verkligt facit; syntetiskt väder som får svara på "håller regeln" är en
maskin som bekräftar våra antaganden. Därför skriver den INGENTING — inte till
weather_observations, inte till skuggloggen, inte till CDN. Utdata är text till människor.
VAD DEN GER: rytmen. Vi har aldrig hört produkten i vinterläge.
FYND VID FÖRSTA KÖRNINGEN:
 • 45 röstlarm över fem resor. Novembermorgonen: 11 larm på 62 min = ett var 6:e minut.
 • Nollgradersdimman: 9 larm på 58 min, varav SEX identiska "Isrisk framöver — vägbanan
   nära noll grader." Samma mening, sex gånger, på en timme. Det är den allvarligaste
   observationen: frysrisken är en PUNKTkälla och varje station längs vägen fyrar separat.
   Husregeln "tystnad är en funktion" håller inte i vinter utan någon form av dämpning per
   fara och sträcka — en repris-regel finns för samma id, men inte för samma FARA.
 • #89a-jämförelsen, hörbar: klarnatten går från 3 larm (dagens regel, tyst om isen) till
   7 med utvidgat fuktvillkor — varav fem frysrisk. Utvidgningen gör inte regeln lite mer
   talför; den fördubblar resan. Stämmer med mätningen 11/9 (312 kalla mätningar, 14 larmar
   i dag, 71 hade regn inom 4 h).
 • Torra vinterdagen är korrekt tyst: −6 °C utan fukt ⇒ bara fartkameror. Tystnadskontrollen
   passerar.
FÖLJD: kandidatkort — dämpning per fara och sträcka (inte per id) före vintern. Det är
inte en ny fara, det är att befintliga faror inte ska upprepa sig längs en rutt.

## #100 (11/9 2026) Axels granskning av §2.2-förstudien — mätriktningen vänd, röstbudgeten införd, 61 % av frostdatan underkänd

BESLUT: Axels invändningar godtas i sak. Förstudien är omskriven på fem punkter, 0c är mätt om i hans
riktning, och en datakvalitetsregel som gäller långt utanför kort #89 är fastställd.

VAD HAN HADE RÄTT OM:
* **Mätriktningen.** Jag mätte från regnstoppen och frågade hur många som följdes av frost. Han mätte
  från FROSTEN och frågade hur många fall som skulle få röst. Hans är den beslutsrelevanta riktningen
  — falsklarmsrisken skalar med fyrningar, inte med tillfällen — och den tål dessutom gallringen
  (#97) bättre, eftersom en frostrad och dess regnsumma överlever halvtimmesglesningen medan ett
  omslag kräver att man vet NÄR regnet slutade. 0c är omskriven i hans form (PR #133).
* **Hålet i rösten.** Förstudien sade att (a) är "en strikt superset som bara kan lägga till larm"
  och åberopade husregeln "tystnad är en funktion" för (b) men inte för (a), där den är mer hotad.
  Det var dokumentets allvarligaste utelämnande. Nytt §4.7 täpper det.
* **0d mot §5.6.** Dokumentet sade att Axel ska svara innan (b) byggs och lade ändå mätningen i steg
  0. Motsägelsen är rättad: frågan först, mätningen bara vid ja.
* **För många frågor i första varvet.** Riktigt i ordningen, även om det kostade en enda
  Actions-minut att få alla sex. Utfallet gav honom rätt: 0e gav OAVGJORT och strök en proxy.

VAD HANS TAL BEHÖVDE, OCH SOM ÄNDRAR TOLKNINGEN: hans "sex gånger talförare" är räknat på ARKIVRADER.
Motorn talar inte per rad — högst ett larm per 45 s, ingen repris inom 10 min/5 km, snapshot var
tionde minut. Mätt i båda enheterna, efter givarvakten: rader 123 frostfall, 2 larmar i dag, 25 tysta
med regn ≤ 4 h ⇒ 13,5 ×. EPISODER 15 frostfall, 2 larmar, 2 med regn ≤ 4 h ⇒ **2,0 ×**. 8,2 rader per
episod, 6 stationer berörda. Röstkostnaden är alltså en fördubbling av 2 fall till 4 över fjorton
dygn — inte en sexdubbling. Korskontroll: den omslagsbaserade riktningen fann 4 fall samma period,
alltså samma handfull väder räknat från andra hållet. REGEL: röst räknas i episoder, aldrig i
arkivrader; ett radtal som citeras som röstpåstående är ett mätfel.

Hans poäng står ändå kvar efter reservationen, och det är därför §4.7 finns: i november är frost inte
15 episoder på 6 stationer, multiplikatorn kan gå åt båda hållen, och den ska mätas om på vinterdata
INNAN golvet sätts. Grinden i §4.4 får ord-per-resa som eget fällande kriterium — ett tillskott som
räddar missar men fördubblar rösten ska kunna falla på röstkriteriet ensamt.

OCH ETT FYND SOM INGEN AV OSS LETADE EFTER: av 317 frostrader (yta ≤ 1 °C) i fjortondygnsfönstret föll
**194, alltså 61 %**, på givarvakten (#75) — ytan mer än 12 ° under luften, värst −49,9 °C. NOLL
saknade lufttemperatur, så det är inte okontrollerbar data utan trasiga givare. Axels 312 är alltså
till nästan två tredjedelar skrot. FASTSTÄLLT: varje mätning som läser yttemperatur bär vakten
`air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12`. Det gäller #88:s trend och #98:s
tystnadsfel lika mycket som (a), och står inte i deras tröskeldokument i dag — en rad att lägga till
när de byggs efter 14/9.

ÄVEN INFÖRT: RH-guarden är struken ur svepet i §4.3 (0b visar att fuktigheten STIGER efter regnet), och
N sätts av golvet och röstbudgeten i stället för av svepet, eftersom kurvan saknar knä — att fördubbla
N fördubblar tillskottet (22→25 rader, 1→2 episoder).

ALTERNATIV SOM VALDES BORT: att försvara den ursprungliga mätriktningen (hans är bättre ställd); att
rapportera 194 som "skrot" utan att först dela upp i okontrollerbara och orimliga (PR #134 — det visade
sig vara noll respektive 194, men det fick inte antas).

LÄGET EFTER DETTA: förstudien är i sin femte version. Steg 1 (TROSKLAR-OVERGANGAR) väntar fortfarande
på Bengt och är varken kod eller Actions-minuter.

## #101 (11/9 2026) Upprepningen mätt — 50 % av resorna hör samma mening två gånger, och det är kamerorna

BESLUT: kort #100:s före-värde är mätt ur skuggloggen utan att något byggdes, och fyndet delar
kortet i två problem med två olika botemedel.

VARFÖR DET GICK ATT SVARA UTAN BYGGE: skuggmotorn har sedan kort #20 loggat varje larm den skulle
ha sagt på fasta rutter var 30:e minut, med kind, id, text och tid i `shadow_log.alerts`. De larmen
har redan passerat motorns egna spärrar (45 s global cooldown, ingen repris av samma id inom
10 min/5 km), så listan ÄR vad en förare hade hört. `scripts/upprepningen.ts` + knapp, helt läsande,
körning 34620622893.

TALEN (14 dygns fönster, 1 759 körningar på 20 rutter sedan 29/8, 678 resor med larm):
* **340 av 678 resor (50 %)** innehåller samma MENING minst två gånger. 215 (32 %) tre gånger,
  111 (16 %) fyra. Median 2, tre fjärdedelar 3, värst 4.
* Fördelningen per fara: `camera` 337 resor, `icing_point` 2, `accident` 1.
* Värsta fallen: "Fartkamera om 500 meter." fyra gånger på 46 min (E18 Örebro→Stockholm) och fyra
  gånger på 83 min (Rv70 Enköping→Mora).

MITT EGET ANTAGANDE FÖLL, OCH DET ÄR FYNDET: skriptet skrevs med kommentaren att fem olika
fartkameror ger fem olika meningar och därför inte skulle räknas som upprepning. Fel. A5 fyrar på
ett FAST avstånd (`cameraTriggerM`), så varje kamera säger ordagrant "Fartkamera om 500 meter."
Antagandet var precis det mätningen fanns till för att pröva, och det höll inte. Rättat i skriptets
kommentar och i dess utskrift.

FÖLJDEN: #100 är två problem, inte ett.
1. **Is och halka ska DÄMPAS.** Samma fara, samma åtgärd, ingen ny information i den andra
   meningen. Reprisregeln gäller i dag samma id; den behöver gälla samma FARA längs en sträcka.
   Det är en motorändring och kräver vektorer i tre portar.
2. **Kameror ska bli SÄRSKILJBARA.** De är olika objekt och förtjänar var sitt larm, men texten
   bär ingenting som skiljer dem åt, så örat kan inte avgöra om det är en ny kamera eller ett eko.
   Det är en RÖSTTEXT-fråga (PRODUKTBOKEN, Axels bord), inte en dämpningsregel. Att tysta dem vore
   fel botemedel på rätt symptom.

VARFÖR KAMERAFYNDET ÄR VIKTIGARE ÄN DET LÅTER: A5 är LÄGST i prioritetsstegen. Rösten fylls alltså
med det minst angelägna redan i september, innan vintern lagt halka, frysrisk och trend ovanpå.
Vinterdagens sex identiska isvarningar är inte nådda i verkligt väder än (värst i is: 3 gånger, 2
resor) — men mekanismen är bevisad, och den skalar med hur många punktkällor som fyrar samtidigt.
I november är det isen som är många.

TVÅ DISPLAYFEL RÄTTADE I SAMMA VARV: tidsstämpeln i "värsta resorna" klipptes till datum och fick
listan att se ut som dubbletter, och slutsatsmeningen var tvärsäkrare än datat bar. Siffrorna
oförändrade ⇒ ingen omkörning (minutdieten #22).

LÄGET EFTER DETTA: före-värdet finns. Efter en dämpning ska samma knapp tryckas igen, och kravet är
att upprepningarna faller UTAN att antalet distinkta meningar per resa gör det.

## #102 (11/9 2026) Kamerorna är rätt — Bengts fältdom river huvudtalet i #101, och mätfelet var mitt

BESLUT: fartkamerornas varningar rörs inte. #101:s huvudtal ("50 % av resorna hör samma mening två
gånger") dras tillbaka som missvisande, och kort #100 skrivs om kring uppdelningen objektfaror mot
tillståndsfaror. Före-värdet för dämpningen är OAVGJORT och väntar på vintern.

FÄLTDOMEN: Bengt körde Malmö–Boden och tillbaka. Kamerorna fyrade "helt perfekt hela vägen" — en
varning 500 m före varje verklig kamera. Det avgör saken, och det slår en slutsats dragen ur
skuggloggen: varje varning följdes av sitt eget objekt, så identisk text förvirrar inte. Kontexten
skiljer dem åt — du hör, du passerar, klart.

VAD JAG GJORDE FEL, i två led:
1. **Fel ombud.** Jag mätte "identisk mening" som ombud för "onödig upprepning" utan att pröva om
   upprepningen faktiskt var fel. En upprepad mening som är SANN varje gång och följs av det den
   varnar för är inte en defekt.
2. **Rätt vakt på fel nämnare, vilket är kodgrindens fel igen (#71).** Underlagsvakten stod på
   "resor med något larm" (678 st) och passerade med god marginal. Men populationen som betyder
   något är resor med en TILLSTÅNDSfara, och där finns 3. Domen skulle ha varit OAVGJORT. Gott om
   underlag om fel sak är inte underlag — det var precis den läxan #71 skrevs för, och jag
   upprepade den med en annan nämnare.

UPPDELNINGEN SOM BLIR KVAR, och den är mer värd än talet som föll:
* **OBJEKTFAROR** — `camera`, `accident`, `wildlife`. Distinkta saker föraren passerar. En varning
  per objekt är rätt, även med ordagrant samma mening. Rörs inte. Fältverifierat.
* **TILLSTÅNDSFAROR** — `slippery_segment`, `icing_point`. Ett sammanhängande tillstånd som råkar
  observeras av flera givare. Sex stationer längs en väg beskriver EN halka, inte sex. Andra
  meningen bär ingen ny information och kräver ingen ny åtgärd.
* Regeln: **varna en gång per OBJEKT, en gång per TILLSTÅND — aldrig en gång per givare.**

Det är också samma skiljelinje som OVERGANGAR-ANALYS §1b drar mellan yttillstånd och
riskmodifierare, och den passar ihop: ett tillstånd är något vägen ÄR, ett objekt är något som
STÅR där. Dämpningsregeln i #100 ska formuleras på tillståndssidan.

TILLBAKADRAGET FÖRSLAG: jag föreslog i chatten att kameratexten skulle bära vägnummer eller plats i
stället för ett fast avstånd, som "billigaste åtgärden först" — den hade halverat upprepningstalet.
Det förslaget är dött. Det hade ändrat något som bevisligen fungerar i bil, på grundval av ett tal
som mätte fel sak. Ingen ändring i `strings/sv.xml` eller PRODUKTBOKEN för A5.

MÄTNINGEN ÄR OMSKRIVEN, inte skrotad: `scripts/upprepningen.ts` delar nu larmen i de två klasserna,
ställer domen och underlagsvakten på tillståndsfarorna, och redovisar objektfarorna som en KONTROLL
— efter dämpningen ska den siffran stå still, annars har vi tystat något som ska höras.

LÄGET EFTER DETTA: #100:s före-värde är OAVGJORT (2 resor med upprepad frysrisk, värst 3 gånger;
halka i praktiken aldrig, eftersom väglagsarkivet står stilla sedan 25/8). Knappen finns och är
byggd rätt. Frågan mognar med vintern.

## #103 (12/9 2026) Kort #100 stängt utan att byggas, och ord-per-resa struket ur §4.4 — Bengts fältdom

BESLUT: dämpningsregeln byggs inte. Kort #100 stängs som ett dokumenterat nej, och kravet
"ord per resa" stryks som fällande kriterium i OVERGANGAR-ANALYS §4.4. Bengts order 12/9.

BENGTS ARGUMENT, och det är principiellt rätt: "Om du kör en sträcka, säg 80 km och väglaget är
detsamma; det är ishalka hela tiden … jag kan verkligen inte se att det skulle störa eller vara
någon cry wolf-situation. Det är halt hela tiden och att någon säger åt mej att det är halt; kom
ihåg det, det är fortfarande halt."

**Cry wolf handlar om FALSKA varningar.** Det är falskheten som äter förtroendet, inte upprepningen.
En sann varning som upprepas är redundans — och mot uppmärksamhetsförfall under två monotona timmar
är redundans snarare rätt design än fel. Hela kort #100 vilade på att upprepning i sig är en defekt,
och det antagandet prövades aldrig mot hur produkten faktiskt upplevs i bil.

MÄTNINGEN SOM AVGJORDE (scripts/segmentlangden.ts, kört 12/9 — helt ren, ingen databas):
* Jämtlands 59 km-segment, 39 min i 90 km/h: motorn talar **4 gånger**, vid minut 0, 10, 20, 30.
  Det är reprisregelns golv (10 min OCH 5 km) som sätter takten, inte ett fel.
* Variant B (kortare segment, eget id per bit): **12 larm** — att korta geometrin gör det värre.
* Variant C (den föreslagna dämpningen, ett larm per segment): **1 larm för 39 minuters halka.**

Kuren var alltså tystare än sjukdomen. Bengts gissning på fyra larm stämde för en dryg halvtimme;
över två timmar blir det ungefär tolv — och hans dom stod fast även med det korrigerade talet.

VAD SOM STRYKS I §4.4: kravet att ett tillskott som fördubblar rösten ska kunna falla på
röstkriteriet ensamt. Det var Axels invändning (#100 i DECISIONS), och den vilade på samma
antagande. Kvar blir B3-paret, som bär kostnaden där den hör hemma: i FALSKLARMEN.

SKILJELINJEN SOM BLIR KVAR, och den är mer användbar än den som ströks: **upprepning av en SANN
varning är billig, upprepning av en FÖRUTSAGD är dyr.** `slippery_segment` är operatörens
observation — den är sann, och då gäller Bengts argument fullt ut. Efterhalkan i #89 (a) är en
gissning om att en blöt väg ska frysa; fördubblas antalet gissningar fördubblas priset för att
gissa fel. Det är därför §4.7 är omskriven i stället för struken: talen står kvar som beskrivning,
domen bärs av B3 ensamt.

VAD SOM FORTFARANDE ÄR VÄRT ATT BEVAKA: totalen när många OLIKA faror kvalificerar samtidigt.
Vinterdagens novembermorgon gav 11 larm på 62 minuter, men det var halka, frysrisk, vilt och
kameror om vartannat — en annan fråga än upprepning, och den mäts i larm per timme.

ALTERNATIV SOM VALDES BORT: att parkera kortet i stället för att stänga det (husregeln i
systemanalysens §4 — klarar något inte sin prövning läggs det ner, inte på hyllan); att bygga
dämpningen "ändå, för säkerhets skull" (den hade tystat en sann och pågående fara).

BEHÅLLS: `scripts/upprepningen.ts` och dess knapp. De kostar ingenting i vila och ger ett vintertal
om frågan skulle komma tillbaka. Före-värdet är och förblir OAVGJORT.

LÄGET EFTER DETTA: tre kort har nu stängts eller krympts av mätning i stället för byggts — #100 här,
försäkringsspåret i #94, och (b):s nedläggningsklausul i #89. Det är avsett: ett dokumenterat nej
är ett bra utfall.

## #104 (12/9 2026) Grind V-A omkörd med tio dygns regn — domen står, och nu är den välmätt

BESLUT: V-A:s nej från 4/9 är bekräftat och får betraktas som slutgiltigt för stationsspåret.
Reservationen i #69 ("tre dygns septemberregn") är därmed upphävd.

BAKGRUND: #69 sade uttryckligen att kurvan skulle köras om när höstregnen fyllt arkivet, och att
måndagsknappen skulle sköta det av sig själv. Den gjorde den inte. Den schemalagda körningen
2026-09-07 13:31 FALLERADE — tillsammans med ingest-fi, ingest-no, publish-map och regn-30 samma
dygn, alltså minutkrisen från 5/9 och inte ett kodfel. Ingen körde om den när minuterna kom
tillbaka, och domen vilade på tre dygns data i åtta dygn utan att någon märkte det.

OMKÖRNINGEN (körning 34670516460, 30 dygns fönster, 755 stationer, 68 967 avläsningar):

| tröskel | n (0–10 km) | träff | delvis | falsklarm | dom |
| :-- | --: | --: | --: | --: | :-- |
| 0,5 mm/h | 3 594 | 61 ± 2 % | 27 % | 12 ± 1 % | faller |
| 1 mm/h | 2 495 | 54 ± 2 % | 36 % | 10 ± 1 % | faller |
| 2 mm/h | 1 266 | 41 ± 3 % | 51 % | 8 ± 2 % | faller |
| 4 mm/h | 510 | 28 ± 4 % | 65 % | 7 ± 2 % | faller |
| 6 mm/h | 216 | 20 ± 5 % | 75 % | 5 ± 3 % | faller |
| 10 mm/h | 53 | 11 ± 9 % | 83 % | 6 ± 6 % | faller |

Underlaget är tredubblat mot 4/9 (3 594 mot 1 141 vid 0,5 mm/h) och talen är i praktiken
oförändrade: 61 % träff och 12 % falsklarm då som nu. Ett nej som inte rör sig när underlaget
tredubblas är ett riktigt nej.

FYNDET FRÅN #69 STÅR OCKSÅ KVAR, och är nu välmätt: falsklarmen klarar V-A2 med marginal på varje
tröskel (4–12 %). Det är TRÄFFEN som fäller. Träff + delvis är 88 % vid 0,5 mm/h och stiger till
94 % vid 4 mm/h. **Grannarna vet med hög säkerhet ATT det regnar hos målstationen — de vet inte
HUR MYCKET.**

OCH DET ÄR PRECIS DÄRFÖR VATTENPLANINGEN ÄR SVÅR, vilket inte stod utskrivet i #69: intensiteten är
exakt det faran behöver. Duggregn ger ingen vattenplaning. Att skriva om V-A1 till "regnar det alls"
skulle göra påståendet mätbart och samtidigt värdelöst för den fara det ska bära. Frågan i #69 —
ska V-A1 skrivas om? — besvaras alltså med NEJ på sakliga grunder, inte bara på §5-formalia.
Stationsspåret kan inte bära en intensitetsvarning, och det är slutsatsen.

FÖLJDEN: hela vattenplaningsspåret vilar nu på radardomen 14/9, precis som DECISIONS #60 förutsåg
när radarspåret valdes — stationerna blir kalibrering och fartgrind, radarn blir triggern, eftersom
radarn mäter intensitet RUMSLIGT. Faller radardomen väl ut gäller kort #81:s ordning A–F. Faller den
illa står #42 utan trigger, och då är alternativ a/b på kortet det som återstår.

ALTERNATIV SOM VALDES BORT: att skriva om V-A1 till ett påstående som bär (se ovan — det hade varit
att flytta målstolparna OCH tappa faran på vägen); att vänta till måndagens schemalagda körning
(domen har redan legat åtta dygn på fel underlag).

## #105 (12/9 2026) Mätvakten i drift — och den hittade fyra döda mätningar till i samma andetag

BESLUT: schemalagda mätningar bevakas nu av vakthunden (check 6, kort #101, Bengts order att drifta
det så att allt bevakas och varnas i mätningarna). Deployad från 0e84812 och bevisad EFTER deployen
med issue #146.

VAD DEN GÖR: läser vilka arbetsflöden som har cron DIREKT UR REPOT, hämtar varje flödes senaste
körning, och larmar på två villkor — (a) senaste körningen fallerade, (b) det var längre än
1,5 × kadensen sedan den kördes alls. Kadensen räknas ur cron-uttrycket; ett uttryck som inte går
att tolka larmar i sig, för en vakt som inte förstår schemat är blind. Timvis i Supabase, noll
Actions-minuter.

VARFÖR SCHEMAT LÄSES UR REPOT och inte ur en lista i koden: en hårdkodad lista blir inaktuell i
tysthet, vilket är exakt det fel vakten finns för att fånga. Ett nytt schemalagt flöde bevakas
därför från första timmen utan att någon behöver minnas att lägga till det.

VARFÖR ÅLDERSVILLKORET ÄR DET VIKTIGARE: villkor (a) fångade grind V-A, som fallerade synligt. Men
det farligare fallet är att GitHub-cronen inte levererar alls — #70 mätte 40 % av bokad takt. Då
finns ingen körning att sätta en flagga på, och bara ålderskontrollen ser det.

EGEN ETIKETT, EGEN LIVSCYKEL, ALDRIG RÖD DRIFTVAKTHUND: ett schemafel kan upprepas, så engångs-
mönstret från vinterordslarmet passar inte — den öppnar, uppdaterar och stänger som driftvakthunden.
Men den skriver aldrig till problem-listan. Rött ska betyda att kedjan till appen är bruten NU; en
missad måndagsmätning är inte det, och låg den i samma issue skulle den hålla vakthunden röd i en
vecka och dränka ett riktigt driftlarm.

FYNDET VID FÖRSTA KÖRNINGEN, och det är större än väntat: fyra ytterligare mätningar hade fallerat
7/9 utan att någon visste — grind-a (skuggans offsetmodell, kort #61), smhi-prov, trv-bevakning och
hojd-prov (kort #96). Tillsammans med grind-v-a och cell-matning-v3, som kördes om för hand samma
dag, betyder det att HELA måndagsserien föll i minutkrisens svallvågor och att ingen upptäckte det
på fem dygn. Åtta schemalagda flöden bevakas nu; healthcheck och marknadsforing var gröna (de går
varannan timme respektive dagligen och hade hunnit återhämta sig).

VAD SOM INTE GÖRS: de fyra körs inte om för hand. Måndagsserien går 14/9 och ska då lyckas av sig
själv — och gör den inte det står issuen kvar öppen, vilket är hela poängen. Mätvakten får bevisa
sig på den körningen.

RESERVATION: om GitHub-cronens opålitlighet (40 %) gör vakten pratsam är svaret INTE att lossa på
tröskeln utan att flytta mätningarna till pulsklockan, precis som #53 gjorde med ingesten. Larmet
mäter då något verkligt: att cron inte duger som klocka.

LÄGET EFTER DETTA: två domar räddades av att hålet upptäcktes — grind V-A och radarunderlaget, båda
omkörda 12/9 (DECISIONS #104). Framöver larmar systemet självt.

## #106 (12/9 2026) Källkollen — alla tio källor växer, men fem har ingen vakt och två regimer har ingen insamlare

BESLUT: Bengts avstämning "ligger allt vi ska mäta på mätbara och aktiverade källor?" är besvarad med
mätning (scripts/kallkollen.ts + knapp, körning 34672334763). Svaret är ja på källorna och nej på
bevakningen.

ALLA TIO KÄLLOR VÄXER:

| källa | senaste rad | senaste dygnet | vaktas av |
| :-- | --: | --: | :-- |
| weather_observations | 6 min | 9 345 | healthcheck + vakthund |
| weather_latest | 6 min | 845 | healthcheck |
| radar_precip | 1,0 h | 841 | **INGEN** |
| situation_archive | 5 min | 240 | **INGEN** |
| shadow_log | 11 min | 384 | **INGEN** |
| polisen_events | 9,0 h | 4 | **INGEN** |
| smhi_warnings | 3,6 dygn | 0 | **INGEN** |
| cameras | 22,6 h | 3 | healthcheck |
| road_conditions | 17,8 dygn | 0 | healthcheck (arkivvakten) |
| road_condition_history | 17,8 dygn | 0 | healthcheck (arkivvakten) |

MITT EGET MÄTFEL, rättat i samma varv: jag satte 24 h som gräns för road_conditions och fick en
varning. Fel tröskel. road_conditions är NULÄGET, och Trafikverket klassar om vägar i vinter — i
september står det stilla i veckor, helt normalt. Vakten larmade alltså på årstiden. Den
säsongsoberoende frågan ställer healthcheckens arkivvakt (#51/#71): finns tillstånd som INTE
arkiverats? Den har ett rätt svar året om. Gränsen är höjd till 45 dygn som grovt livstecken.

FEM KÄLLOR HAR INGEN VAKT, och tre av dem är bärande:
* **radar_precip** — vattenplaningens enda kvarvarande trigger sedan grind V-A föll (#104). Och
  den är extra utsatt: ingest.yml kör radar.ts med `continue-on-error: true`, så om SMHI-hämtningen
  fallerar varje timme förblir jobbet grönt och ingen får veta.
* **situation_archive** — facit för varenda grind.
* **shadow_log** — skuggans utdata, som bär B3, V-B och upprepningen.
polisen_events och smhi_warnings är mindre kritiska men lika obevakade.

OCH DEN STÖRSTA LUCKAN ÄR INTE EN KÄLLA UTAN EN SAKNAD INSAMLARE: #88 TRENDEN och #98 TYSTNADSFELET
är fastställda och kontrasignerade, men ingenting samlar in åt dem. Det finns ingen trendkolumn i
skuggloggen och ingen missklassificering någonstans — kontrollerat 11/9 och igen 12/9. Källorna de
ska läsa (weather_observations) växer, men ingen läser dem. Det är inte en källa som dött, det är en
insamlare som aldrig byggts, och T-A är tidskritisk mot höstens första frostnätter.

VARFÖR KÄLLKOLLEN ÄR EN ANNAN FRÅGA ÄN HEALTHCHECKENS: healthchecken frågar om kedjan till appen är
hel — den har timmars tidshorisont. Källkollen frågar om domarna går att fälla i vinter. En tabell
som slutar växa i dag syns inte i appen förrän i mars, när underlaget skulle ha dömts.

LÄGET EFTER DETTA: knappen finns och är läsande. Nästa steg, om Bengt vill, är att flytta de tre
bärande källorna in i vakthunden som check 7 — samma mönster som mätvakten, noll Actions-minuter.

## #107 (12/9 2026) Check 7 byggd — mätvakten vaktar nu både körningarna och källorna

BESLUT: källkollens tre bärande tabeller vaktas av vakthunden. Bengts order "bygg check 7".
Lagd IN I mätvakten som en andra halva i stället för som en egen check, för det är samma fråga:
är mätapparaten frisk? 6a körningarna, 6b källorna — ett larm, en etikett, en livscykel.

VAD SOM VAKTAS OCH VARFÖR JUST DE TRE:
* shadow_log (tyst > 2 h) — skuggans utdata, bär B3, V-B och upprepningsmätningen.
* situation_archive (tyst > 3 h) — facit för varenda grind vi ska fälla.
* radar_precip — vattenplaningens enda kvarvarande trigger sedan grind V-A föll (#104).

RADARN TESTAS MED KORSKONTROLL, INTE MED REN FÄRSKHET, och det är avsnittets enda icke-triviala
designval. radar_precip är händelsefiltrerad (sql/009: rad bara vid regn ≥ 0,1 mm/h), så en tyst
tabell kan betyda rikstorrt väder. En färskhetsvakt hade larmat på solsken och blivit avstängd
inom en vecka. Larmet går därför bara när radarn tigit MEDAN stationerna rapporterat nederbörd de
senaste tre timmarna. Det fångar precis den fara som motiverade kortet: ingest.yml kör radar.ts med
continue-on-error, så ett stående SMHI-fel lämnar jobbet grönt och ingen får veta.

POLISEN_EVENTS OCH SMHI_WARNINGS VAKTAS INTE, med flit. Deras luckor är världens, inte vårt systems
— att ingen viltolycka rapporterats på ett dygn är inte ett fel. Att INGESTEN slutat hämta är det,
och den frågan ställer check 1 via sync_state. Att vakta båda hade gett två larm för ett fel och ett
larm för noll fel.

BEVIS EFTER DEPLOYEN (41929bd, larmprov 12/9), inte ur commit-hashen:
  källor: skuggloggen 1 min · olycksarkivet 6 min · radarn 21 min (stationsnederbörd 3 h: 339)
Raden är starkare än den ser ut: 339 stationsmätningar visade nederbörd de senaste tre timmarna OCH
radarn skrev för 21 minuter sedan. Korskontrollen prövades alltså skarpt i det läge där den ska
larma — det regnade, och radarn svarade.

LÄGET EFTER DETTA: hela kedjan är bevakad i tre lager. Kedjan till appen (healthcheck + vakthundens
check 1–3), mätningarnas körningar (6a) och mätningarnas underlag (6b). Kvar som obevakat är bara
det som inte finns: #88 trenden och #98 tystnadsfelet har fastställda tröskeldokument men ingen
insamlare, och T-A kan inte ta höstens första frostnätter i efterhand.

## #108 (12/9 2026) Kort #92 och #93 stängda — och halva #93 flyttad i stället för slängd

BESLUT: Bengts order efter att §2.5 och §2.6 tagits ur systemanalysen (v4). Båda korten stängs som
dokumenterade nej. Men #93 hade två halvor, och bara den ena lades ner.

#92 DÄCKTYP OCH FORDONSTYP — NED. Idén är inte fel: den är rätt formulerad som lager
2-riskmodifierare i OVERGANGAR-ANALYS §1b.2, och där står den kvar som begrepp. Men den kräver
tröskeljustering i FLERA tröskeldokument med dubbla signaturer, vektorer i tre portar och nya
PRODUKTBOK-bilder — och den bär ingen egen fara. Den konkurrerar alltså om exakt samma kvällar som
trenden (#88), som har naturens deadline i höstens första frostnätter. Öppnas igen om Axel vill ha
den, inte förr.

#93 KOMMUNALA VÄGAR — DELAT BESLUT, och det är poängen med posten.
* **(a) kommunernas stationsdata läggs ner.** Det finns ingen öppen källa, ingen förhandling pågår,
  och att hålla ett kort öppet för något ingen arbetar på är att låtsas att det är planerat. Hålet i
  täckningen är verkligt — svartisen som skadar flest finns på gator och infarter där vi inte har en
  enda givare — och det står kvar dokumenterat i SYSTEM.md. Det är skillnad på att VETA om ett hål
  och att ha en PLAN för det; vi behåller det första och slutar låtsas om det andra.
* **(b) SMHI-förstärkaren flyttas till kort #95.** `smhi_warnings` hämtas redan och ligger i
  arkivet, så regeln "snöfallsvarning + yta nära noll = högre konfidens" kostar 0 kr och kräver
  ingen ny källa. Den är en FÖRSTÄRKARE av frysrisken, aldrig en egen fara: den får höja konfidensen
  i en varning som redan kvalificerar, inte skapa en varning. Den hör dessutom begreppsligt hemma i
  §2.8, som är SMHI-punkten. Att slänga den med kortet hade varit att kasta den enda delen av #93
  som var byggbar i dag.

VARFÖR DEN UPPDELNINGEN ÄR VÄRD EN EGEN POST: ett kort som stängs tar med sig allt som står på det.
#93 bar en källa vi inte har OCH en regel vi redan kan bygga, och de två har inget med varandra att
göra utom att de skrevs samma dag. Innan ett kort stängs ska det läsas efter delar som lever.

LÄGET EFTER DETTA: av systemanalysens nio kort (#88–#96) är #92, #93 och #94 stängda, #100 stängt
tidigare i dag (#103), och kvar som aktiva är #88, #89, #90, #91, #95 och #96 — precis de fem
punkter Bengt valde att arbeta vidare med (2.1, 2.2, 2.3, 2.4, 2.8). Dokumentet och tavlan säger
samma sak igen.

## #109 (12/9 2026) TROSKLAR-OVERGANGAR skrivet — steg 1 klart, och (c) överlämnad till #46 och #90

BESLUT: kort #89:s tröskeldokument är skrivet och incheckat (`docs/TROSKLAR-OVERGANGAR.md`, 332
rader). Status UTKAST — väntar på Bengts fastställande och därefter Axels kontrasignering, samma form
som #61/#68/#92/#95. Ingen kod. Bengts order "skriv tröskeldokumentet".

DOKUMENTET ÄR SKRIVET PÅ MÄTNING, INTE PÅ RESONEMANG, och det är dess viktigaste egenskap. Varje tal
som inte är märkt RESONEMANG kommer ur steg 0 (körningarna 34579255737, 34580876588, 34590257682).
Det skiljer det från TROSKLAR-TRENDEN och TROSKLAR-VATTENPLANING, som skrevs före sina mätningar.

FYRA GRINDAR:
* **Ö-A — finns hålet?** REDAN PASSERAD: 76 % av regnstoppen hade mätarregn när fukten slog om,
  median 35 min kvar, 22 användbara omslag/dygn. Grinden bevisar att frågan är värd att ställa, inte
  att utvidgningen är rätt.
* **Ö-B — skuggdriften.** B3-paret PER PROXY: nettonytt ≥ 5 % av facit inom räckvidd, tillkomna
  falsklarm ≤ 25 % av tillkomna fyrningar. En union av svaga signaler är en falsklarmsmaskin om
  ingen mäts ensam.
* **Ö-C — giltighet.** ≥ 30 regn-följt-av-frost-nätter, ≥ 20 stationer, båda halvorna av perioden,
  plus fysikkontrollen: träffarna ska toppa efter midnatt och vara vanligast klara nätter. Faller de
  jämnt över dygnet mäter vi något annat än utstrålningshalka.
* **Ö-D — läsfönstret, ny och kan fälla allt annat.** Varje avläsning på minutupplösning måste ske
  inom sju dygn (gallringen, #97). Frostlarmet i vakthunden (#98) är därför en DEL av grinden, inte
  en bekvämlighet.

TVÅ PARAMETRAR ÄR STRUKNA INNAN DOKUMENTET ENS FASTSTÄLLTS, båda av mätning: RH-guarden (0b visade
att fuktigheten STIGER efter regnet, 90 → 95 % på fyra timmar) och operatörens "Våt" (0e gav
OAVGJORT — noll mätbara varaktigheter). Och N sätts av falsklarmsgolvet, inte av svepet, eftersom
kurvan saknar knä (22 → 25 rader, 1 → 2 episoder mellan 2 h och 4 h).

GIVARVAKTEN ÄR OBLIGATORISK OCH FÅR EGET AVSNITT (§3): 61 % av arkivets frostrader faller på den,
noll saknar lufttemperatur. Utan vakten är varje tal i grindarna meningslöst. Den gäller bortom det
här kortet — #88 och #98 läser samma kolumn och har den inte skriven i sina dokument (#106).

(b) OLJEFILMEN FÅR TVÅ SPÄRRAR FÖRE EN ENDA RAD KOD: Axels ja om den alls hör till löftet, och
konstaterandet att underlaget inte finns i höst (55 torrperioder, 6 olyckor mot kravets 15). Plus en
nedläggningsklausul och en utskriven svaghet i instrumentet — 0d räknar olyckor utan nollhypotes, och
utan den kan (b) varken fällas eller frias.

(c) ÖVERLÄMNAD, MED LAGER UTSKRIVET (§6): dimma × frysrisk = rimfrost går till #46 som
ÖVERGÅNGSORSAK i lager 1 (sikt som konfidenshöjare för kondensationsvillkoret), och sidvind × halka
plus dimma-som-sikt × halka går till #90 som RISKMODIFIERARE i lager 2 (inget minne, ingen skattare,
en rad plus en vektor). Båda korten har fått raden på tavlan. Utan lagermärkningen hade #46 byggt en
interaktion och #90 en skattare.

PARTITIONEN MOT #46 ÄR NU SKRIVEN PÅ BÅDA KORTEN: #46 äger fallet när yta ≤ daggpunkt, #89 (a) när
yta > daggpunkt men regn inom N h. Tystnadsfelet räknar då varje miss en gång.

I SAMMA VARV: TROSKLAR-TYSTNADSFEL §3 har fått sin FJÄRDE signaltyp — "det regnade inom N timmar vid
stationen". Utan den klassas efterhalkans missar på de tre befintliga signalerna, ofta oursäktliga
ändå, men utan att orsaken syns — och då kan tystnadsfelet inte skilja "för hög tröskel" från "hål i
fuktvillkoret". Ändringen gjordes före första skuggkörningen och är därmed tillåten med en rad i
DECISIONS enligt det dokumentets §9.

ORD-PER-RESA ÄR INTE ETT FÄLLANDE KRITERIUM i Ö-B, och det står utskrivet varför (#103): cry wolf
handlar om falska varningar. Röstbudgeten redovisas som beskrivning i §7 med båda enheterna, och
regeln "röst räknas i episoder, aldrig i arkivrader" är skriven in.

LÄGET EFTER DETTA: steg 1 av sju är klart. Steg 2 (tillståndsskattaren) ligger efter radardomen och
MÅSTE stå klar före frosten, annars finns ingen skugga att döma Ö-B på.

## #110 (12/9 2026) TROSKLAR-OVERGANGAR FASTSTÄLLT av Bengt — och (b) oljefilmen struken

BESLUT: Bengt fastställer TROSKLAR-OVERGANGAR med ett tillägg: **(b) oljefilmen stryks.** Dokumentet
är därmed fastställt i samma mening som #61, #68, #92 och #95 — Axels kontrasignering sker genom att
kortet bockas på tavlan. Från första skuggkörningen gäller §10:s ändringsregim.

VAD SOM FASTSTÄLLS: svepet i §2 (N 1·2·3·4 h, minsta regn, radarintensitet r, utfallsfönster),
givarvakten i §3 som obligatorisk, golven i Ö-B (nettonytt ≥ 5 %, tillkomna falsklarm ≤ 25 %),
underlagskraven i Ö-C (≥ 30 nätter, ≥ 20 stationer, båda halvorna, fysikkontrollen) och läsfönstret
i Ö-D (sju dygn).

VAD STRYKNINGEN AV (b) INNEBÄR:
* Första regnet efter torka byggs inte, mäts inte och skuggas inte. Kort #89 krymper till (a) plus
  överlämningen i §6.
* **§5.6-frågan till Axel förfaller.** Den skulle ha avgjort om oljefilm alls hör till Halkvakts
  löfte, och den behöver nu aldrig ställas. Kortet bär därmed ingen spärr som väntar på någon annan
  — det är en öppen fråga färre i hela systemanalysen.
* Det som redan var mätt står kvar som dokumenterat nej: 55 äkta torrperioder ≥ 5 dygn med 6 olyckor
  i 20-minutersfönstren mot V-B-grindens krav på 15. Grinden var inte nåbar denna höst oavsett
  beslut, och höstregnen är ett fönster som stänger när vintern kommer. Instrumentet var dessutom
  svagt på en punkt som aldrig lagades: 0d räknade olyckor utan förväntat antal.
* Tas frågan någonsin upp igen börjar den om från §9 steg 0 med en nollhypotes i instrumentet, inte
  från den befintliga texten.

ORDNINGEN I §9 KRYMPER FRÅN SJU STEG TILL SEX. Steg 2 (tillståndsskattaren) och steg 3 (a) som
skuggkolumn) är de enda som är kod, och båda ligger efter radardomen. Steg 4 och 5 (fjärde signalen i
TYSTNADSFEL, överlämningen till #46 och #90) är gjorda i samma varv som dokumentet.

LÄGET EFTER DETTA: fem tröskeldokument ligger i repot, alla fastställda — SKUGGAN (#61),
VATTENPLANING (#68), TRENDEN (#92/#95), TYSTNADSFEL (#93/#95) och ÖVERGÅNGARNA (detta). Tre av dem
har noll kod. Det som avgör vintern är inte fler dokument utan att skuggkolumnerna byggs före
frosten.

## #111 (12/9 2026) Axels kontrasignering av TROSKLAR-OVERGANGAR — kort #89:s nyckel öppen

BESLUT: Axel kontrasignerar TROSKLAR-OVERGANGAR, relayerat av Bengt i chatten samma dag som Bengt
fastställde det (#110). Samma form som DECISIONS #61 (skuggan), #68 (vattenplaningen) och #95
(trenden och tystnadsfelet): kontrasigneringen sker genom att kortet bockas på tavlan.

VAD SOM ÄR KONTRASIGNERAT: hela dokumentet som det står efter Bengts tillägg — svepet i §2 med
RH-guarden struken, givarvakten i §3 som obligatorisk, golven i Ö-B (nettonytt ≥ 5 %, tillkomna
falsklarm ≤ 25 %), underlagskraven i Ö-C, läsfönstret i Ö-D, strykningen av (b) i §5 och
överlämningen av (c) i §6.

VAD KONTRASIGNERINGEN INTE GÖR: den ändrar inte ändringsregimen. §10 är knuten till **första
skuggkörningen**, inte till signaturen — fram till dess får svepet och kraven justeras med en rad i
DECISIONS av vem som helst av oss, därefter krävs båda signaturer och en motivering som inte lutar
sig mot utfallet. Samma konstruktion som TROSKLAR-TRENDEN §8, och av samma skäl: det är siffrorna som
ska få ändra reglerna först när de inte längre kan väljas.

LÄGET EFTER DETTA: kort #89:s nyckel är öppen. Kvar är två kodsteg, båda bakom radardomen 14/9 och
kort #81:s ordning — steg 2 tillståndsskattaren i skuggloggen, steg 3 (a) som skuggkolumn, dömd mot
Ö-B vid höstens första frostnätter och inom Ö-D:s sjudygnsfönster.

Fem tröskeldokument ligger nu i repot, alla fastställda och alla utom SKUGGAN och VATTENPLANING även
kontrasignerade i den här formen. Tre av de fem har noll kod. Det som avgör vintern är inte fler
dokument utan att skuggkolumnerna byggs före frosten — och trenden (#88) är den som har naturens
deadline.

## #112 (12/9 2026) Axels ja till #90, och TROSKLAR-VIND-SIKT skrivet — med en distinktion kortet saknade

BESLUT: Axel säger ja till vind och sikt som faror (relayerat av Bengt 12/9), vilket öppnade halva
kort #90:s nyckel. Tröskeldokumentet `docs/TROSKLAR-VIND-SIKT.md` är skrivet och incheckat som utkast;
kvar är Bengts fastställande av värdena och Axels kontrasignering.

DEN DISTINKTION SOM SAKNADES, och som är dokumentets egentliga bidrag: kortet kallade dem
"punktfaror", överlämningen från #89 kallade dem "lager 2 — riskmodifierare", och BÅDA hade rätt. Det
är två roller som måste dömas var för sig:
* **Roll A — egen fara.** Byvind 25 m/s på en bro är farligt oavsett väglag. Döms som vilken ny fara
  som helst, från noll.
* **Roll B — modifierare.** Samma is, sämre grepp i sidled. Döms som en regel om en fara som redan
  finns, utan minne och utan tillståndsskattare.
Faller A men håller B är utfallet "vind är ingen egen fara men förvärrar halkan" — ett giltigt och
användbart svar som en enda grind hade dolt.

PER FORDONSTYP UTGÅR, och det är kortets största svaghet: nyckeln sade "byvind m/s per fordonstyp",
men kort #92 stängdes samma dag (#108) och motorn vet därför inte om den talar till en personbil
eller en husvagn. En tröskel för husvagn talar för mycket med personbilister; en för personbil missar
exakt den B2B-grupp som motiverade kortet. Svepet spänner hela intervallet och W-B mäter
falsklarmskostnaden vid varje tröskel. Räcker ingen enda tröskel för båda grupperna är DET ett mätt
argument för att öppna #92 igen — men argumentet ska bäras av mätning, inte av intuition.

GIVARVAKTEN ÄR OMÄTT TERRITORIUM, och dokumentet säger det rakt ut. För yttemperaturen vet vi att
61 % av frostraderna faller på vakten, värst −49,9 °C. För `wind_gust_ms` och `visibility_m` har
ingen någonsin mätt motsvarande. Därför är steg 0 inte valfritt: det ska leta sentineltal, fastnade
värden, byvind under medelvind och fältens täckning innan något tal i §4 får användas. En vakt som
inte vet vad den vaktar mot är ingen vakt.

W-A ÄR MÄTBAR NU, OCH DET ÄR DOKUMENTETS BÄSTA EGENSKAP: frågan är om olycksfrekvensen stiger
monotont med byvind respektive sjunkande sikt, räknad per stationstimme mot `situation_archive`. Till
skillnad från vattenplaningen **går nollhypotesen att räkna här** — exponeringen mäts kontinuerligt
vid varje station, så "hur ofta sker olyckor vid normal vind" är ett tal och inte en gissning. Det var
precis det 0d saknade i #89 (b). Faller W-A läggs kortet ner utan en rad motorkod.

ORDNINGEN VÄNDS: roll B byggs FÖRE roll A, tvärtemot kortets ursprungliga lydelse. Roll B är
billigare (ingen ny fara, ingen ny rösttext, ingen ny plats i A-skalan) och prövar samtidigt det
mönster som #46 och alla framtida lager 2-regler ska ärva. Den blir därmed **den första lager 2-regel
som faktiskt skrivs** — #68 beslutades men byggdes aldrig.

DESIGNFRÅGAN KORTET STÄLLDE ÄR BESVARAD: modifieraren ska FÖRLÄNGA FÖRSPRÅNGET, inte höja
prioriteten. Skälet är husregeln — prioritetsstegen droppar förloraren, så en höjd prioritet skulle
tysta något annat. Ett längre försprång säger samma sak tidigare, vilket är exakt vad sämre grepp och
sämre sikt kräver. Halkan vinner fortfarande alltid.

LÄGET EFTER DETTA: 2.3 står nu lika långt som 2.2 gjorde i morse — tröskeldokument skrivet, nyckel
halvöppen, och ett steg 0 som kan köras före radardomen. Sex tröskeldokument ligger i repot.

## #113 (12/9 2026) Två instrument byggda före måndag — grind T-A och #90:s steg 0, båda körda

BESLUT: Bengts "ta båda". Två läsande knappar byggda, självtestade och körda skarpt en gång var.
Ingen av dem rör skuggloggen, driften eller motorn, och ingen av dem väntar på radardomen.

### Grind T-A (kort #88) — instrumentet klart före frosten

Byggd FÖRE skuggkolumnen, tvärtemot TROSKLAR-TRENDEN §7:s sekvens. Skälet: T-A läser ARKIVET, inte
skuggloggen — de tre kolumnerna i §7 steg 2 matar T-B. Avvikelsen gäller ordningen, inte innehållet,
och är tillåten före första skuggkörningen enligt §8. Risken som motiverar den är mätt samma dag:
grind V-A och cellmätningen låg döda i fem dygn, och steg 0:s instrument hade två fel som bara
upptäcktes av att det kördes. T-A:s fönster är en engångschans och ska inte mötas med otestad kod.

FÖRSTA KÖRNINGEN (34675279484, 7 dygn): **OAVGJORT**, som väntat. 2 912 station-nätter, varav 17
frostnätter på 7 stationer — domspärren kräver 30 och 20. Svepets 144 kombinationer räknades, bästa
separation 17 % (60 min, 0,4 °C, gap 2,0, band +1..+3), men **ingen kombination klarar
båda-halvor-kravet**. Allt är rätt beteende.

SJÄLVTESTET FÄLLDE FÖRSTA FÖRSÖKET, och felet var mitt test: daggpunkt 0 mot yta 3,5 ger ett gap på
3,5 som aldrig kan passera tröskeln 1,0, så triggern föll på gapvillkoret i stället för på lutningen.
Testet mätte alltså inte det det påstod. Rättat.

**TVÅ FYND SOM HÖR HEMMA I TROSKLAR-TRENDEN, inte i koden:**
1. **Fysikkontrollens andra halva går inte att köra.** §4 kräver att träffarna ska vara "vanligast
   klara nätter", men molnmängd finns inte i arkivet — smhi-prov hämtar bara lufttemperatur och
   lagrar ingenting. Klarhetsdelen av T-A är alltså BEROENDE AV kort #95 (§2.8), och det beroendet
   står inte i dokumentet. Det bör skrivas in.
2. **Gallringen begränsar svepet.** Efter sju dygn finns bara halvtimmesrader; då faller
   15-minutersfönstret bort helt och 30-minutersfönstret på trendens egen vakt (≥ 3 mätningar i
   fönstret). Svepets tre fönster är alltså i praktiken två för varje läsning som sker sent.
3. Och ett tredje, som första körningen visade: septembers frostnätter är INTE utstrålningsnätter.
   Bara 5 av 17 hade sin kallaste stund kl 03–07; resten låg spridda över dygnet (22, 23, 10, 11,
   12, 14). Det stärker att det riktiga underlaget måste vara höstens frost och inte septembers.

### Steg 0 för kort #90 — givarkollen och W-A

FÖRSTA KÖRNINGEN (34675456017, 14 dygn). W-A gav **OAVGJORT** för både vind och sikt: högsta
vindbandet har 36 stationstimmar och högsta siktbandet 83, mot kravets 500. September är inte
blåsigast på året, så det är ett underlagsbesked och inte ett nej.

**MEN GIVARKOLLEN GAV TVÅ KONKRETA SAKER TILL VAKTEN, vilket var hela poängen med att köra den
först:**
* **Byvind max 85,5 m/s.** Sveriges uppmätta rekord ligger kring 81 m/s och då på fjällstation. 85,5
  vid en vägstation är med all sannolikhet en trasig givare. Givarvakten behöver ett tak.
* **Sikt 20 000 m förekommer 45 650 gånger** av ~92 000 siktrader — det är ett SENTINELVÄRDE ("minst
  20 km"), inte en mätning. Hälften av siktmaterialet är alltså ett tak och måste behandlas som
  "god sikt", aldrig som ett mätvärde i en tröskel.
* Täckningen är **42,5 % för byvind och 42,6 % för sikt** — mindre än hälften av arkivraderna bär
  fälten alls. Det halverar underlaget för W-A och ska stå i varje dom.
* Noll rader med byvind < medelvind och noll negativa värden. Den delen av vakten behövs inte.

**EN ANTYDAN SOM INTE FÅR ÖVERTOLKAS:** bandet 10–15 m/s har **2,23 × olycksfrekvensen** mot < 10
m/s (89,5 mot 40,2 per 1 000 stationstimmar, på 927 stationstimmar och 83 olyckstimmar). Det är över
W-A2:s krav på 1,5 ×, och det är den första kvantitativa antydan att #90 har något att mäta alls.
Men det är ETT band, i september, och situation_archive bär ingen orsak — samband, inte kausalitet.
Ingen dom får byggas på det.

LÄGET EFTER DETTA: 2.1:s instrument är prövat och laddat inför frostlarmet. 2.3 har både
tröskeldokument och ett kört steg 0 på en dag. Måndagen kan gå till det som verkligen kräver domen.
