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
