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

## #114 (12/9 2026) 2.8 är T-A:s blockerare — och täckningen räcker. Molnet behöver inte arkiveras

BESLUT: Bengts fråga "bör vi inte göra det som krävs av 2.8 för att kunna köra det andra" besvaras
med ja, och den blockerande delen är nu mätt (scripts/smhi-tackning.ts + knapp, körning 34676483898).
Utfallet ändrar både §2.8:s kostnad och dess plats i ordningen.

BAKGRUNDEN: grind T-A:s fysikkontroll (TROSKLAR-TRENDEN §4) kräver att träffarna ska vara "vanligast
klara nätter". Molnmängd finns inte i vårt arkiv, så halva kontrollen gick inte att köra vid T-A:s
första körning (#113). Kort #95 var därmed inte längre en förstärkare som kunde vänta till våren —
den blockerade #88:s dom, och #88 är den enda punkten med naturens deadline.

FYND 1 — MOLNET BEHÖVER INTE ARKIVERAS, och det river §2.8:s dyraste rad. SMHI metobs parameter 16
(total molnmängd, momentanvärde, 1 gång/tim) har perioden latest-months som sträcker sig 130 dygn
bakåt (mätt 12/9), plus corrected-archive därutöver. Molnet kan alltså hämtas I EFTERHAND när T-A
körs, på samma sätt som scripts/smhi-prov.ts redan hämtar lufttemperatur vid körning. Ingen ny
tabell, ingen ingest, ingen drift, noll lagring. §2.8:s tal "+25 MB/mån och oktoberbeslutet fem dagar
närmare" gäller ANKARROLLEN (SMHI som extra ankare i offsetmodellen), inte molnet för fysikkontrollen.

FYND 2 — TÄCKNINGEN RÄCKER, men bara 108 av 459 stationer rapporterar molnmängd, så frågan var inte
retorisk:

| Avstånd till närmaste molnobservation | VViS-stationer (848) | Vägsegment (818) |
| :-- | --: | --: |
| <= 15 km | 133 (16 %) | 127 (16 %) |
| <= 30 km | 449 (53 %) | 453 (55 %) |
| <= 50 km | 774 (91 %) | 765 (94 %) |
| <= 100 km | 842 (99 %) | 816 (100 %) |
| median | 29 km | 28 km |

VARFÖR 50 KM ÄR ETT RIMLIGT AVSTÅND HÄR, till skillnad från för yttemperaturen: molnet är en
STORSKALIG storhet. Ett molntäcke sträcker sig tiotals mil, medan yttemperaturen varierar mellan
dalgång och krön inom någon kilometer. Att sträcka en molnobservation 50 km är därför inte samma sak
som att sträcka ett VViS-värde 50 km — vilket är hela poängen med §2.8:s representativitetsradie.
Men hur långt molnet FÅR sträckas är inte mätt här, bara hur långt det MÅSTE sträckas. Det avgörs av
nästa körning, inte av den här.

VAD SOM ÅTERSTÅR FÖR ATT LYFTA BLOCKERINGEN: koppla in hämtningen i scripts/grind-t-a.ts — hämta
parameter 16 för närmaste molnstation per frostnatt, klassa natten som klar eller mulen, och
redovisa träffandelen per klass. Det är en läsande ändring i ett läsande skript, kräver inte
radardomen, och är det sista steget innan T-A:s fysikkontroll kan köras hel.

FÖLJD FÖR ORDNINGEN i systemanalysens §3 (v4): 2.8 flyttas från fjärde till ANDRA plats i prioritet,
inte för egen skull utan för att 2.1 inte kan dömas utan den. Rekommendationen var
2.1 → 2.2 → 2.3 → 2.8 → 2.4; den bör läsas som 2.1 (med 2.8:s molnbit inbakad) → 2.2 → 2.3 → resten
av 2.8 → 2.4.

## #115 (12/9 2026) Grind T-A:s fysikkontroll är hel — och första signalen stödjer utstrålningshypotesen

BESLUT: 2.8:s blockering av 2.1 är lyft. Molnet hämtas vid körning i scripts/grind-t-a.ts ur SMHI
metobs parameter 16, och fysikkontrollen kör nu båda sina halvor. Ingen arkivering, ingen ny tabell,
noll lagring (#114).

FÖRSTA HELA KÖRNINGEN (34677154925, 7 dygn): 16 av 17 frostnätter fick en molnobservation inom 50 km,
hämtad från 6 stationer.

| molnklass | frostnätter | fyrade (bästa kombinationen) |
| :-- | --: | --: |
| klar | 7 | 2 (29 %) |
| mellan | 4 | 0 |
| mulen | 5 | 0 |
| okänd | 1 | 1 |

Fyrningsandel klara nätter 29 % mot mulna 0 %. **Fysikkontrollen stödjer utstrålningshypotesen** —
triggern fyrar på klara nätter och inte på mulna, vilket är precis vad utstrålningskylning förutsäger.

MEN TALET ÄR TVÅ, och det ska sägas högre än slutsatsen. Sju klara nätter och fem mulna är precis över
skriptets egen gräns för att alls jämföra, och 2 mot 0 är ingen statistik. Riktningen är rätt;
styrkan är okänd. Domen kräver fortfarande ≥ 30 frostnätter och ≥ 20 stationer, och den kommer med
höstens frost.

TVÅ FYND I SMHI:S DATAFORMAT, båda inbyggda i klassningen och båda av samma sort som tidigare
sentinelfynd:
* Enheten heter "procent" men värdena är OCTAS omräknade: 0, 13, 25, 38, 50, 63, 75, 88, 100 = noll
  till åtta åttondelar. Klassningen följer skalan i stället för att dela intervallet jämnt.
* **113 % förekommer.** Det är 9/8 — SMHI:s kod för HIMLEN SKYMD (dimma, tätt snöfall). Som
  procenttal är det omöjligt, och fysikaliskt är en skymd himmel MOTSATSEN till en klar natt: ingen
  utstrålning mot rymden. Den klassas som "skymd" och räknas med de mulna. Hade den behandlats som
  ett procenttal hade den blivit "mest molnigt av allt", vilket råkar bli rätt klass av fel skäl —
  men bara tills någon jämför tal i stället för klasser.

EN OLÖST OBSERVATION SOM STÅR KVAR: timfördelningen är fortfarande platt. Bara 5 av 17 frostnätter
hade sin kallaste stund kl 03–07; resten låg spridda över dygnet (22, 23, 10, 11, 12, 14). Att
triggern ändå fyrar på klara nätter men inte mulna är förenligt med att de FÅ utstrålningsnätter som
finns i materialet är just de klara — men det betyder också att septembers "frostnätter" till
största delen inte är utstrålningsnätter alls. Det stärker att underlaget måste vara höstens frost.

LÄGET EFTER DETTA: grind T-A är komplett — svep, tre givarvakter, domspärr, båda halvorna av
fysikkontrollen, och ett molnberoende som är löst utan lagring. Instrumentet är prövat end-to-end och
väntar bara på frostlarmet.

## #116 (12/9 2026) W-A:s exponering är diet-filtrerad — rättelse, och kolumnerna var äldre än värdena

BESLUT: TROSKLAR-VIND-SIKT §4 och `scripts/vindsikt-steg0.ts` huvud påstod att "exponeringen är mätt
kontinuerligt vid varje station". Det är FEL och är rättat. **Arkivdieten** (DECISIONS #4,
`ingest/sources/weather.ts:69`) sparar bara rader vid yta ≤ 5 °C, nederbörd, eller när ytan rört sig
≥ 0,5 °C sedan senast. En lugn, torr, mild timme lämnar ofta inget spår. W-A:s nämnare är
**stationstimmar som dieten sparade**, inte stationstimmar som inträffade.

SAMMA KLASS AV FEL SOM 0f:s (DECISIONS #96): att läsa en händelsefiltrerad tabell som om den vore en
kadens. Det är andra gången på två dygn, i två olika skript, och det är därför rättelsen inte stannar
vid en textändring: **täckningsgraden mäts nu i givarkollen och skrivs ut med varje utfall.**

RIKTNINGEN PÅ FELET ÄR RESONERAD, INTE MÄTT, och det ska stå så: dieten sparar oftare vid nederbörd
och snabba temperaturfall, alltså i just det väder som blåser. Referensbandet < 10 m/s borde därför
tappa fler lugna timmar än de höga banden, vilket blåser upp referensens frekvens och TRYCKER NER
kvoten. Om resonemanget håller är W-A konservativ och antydan 2,23 × underskattad snarare än
överskattad. Men det är inte mätt, och kvoten får inte läsas som om det vore det.

ANDRA FYNDET, OCH DET ÄR STÖRRE: **kolumnerna är äldre än värdena.** `sql/011_vind_sikt.sql` la till
`wind_speed_ms`, `wind_gust_ms` och `visibility_m` den 4/9 (kort #48) — men de fylldes inte förrän
ingest-live deployades 9/9 ca 05:00 (kort #84, DECISIONS #79), vars eget SQL-bevis lyder
`vind 844 | regn 907 | sikt 844` mot `vind 0` före deployen.

| Följd | Vad som ändras |
| :-- | :-- |
| Täckningsraden "42,5 % byvind" | Tolkades som att mindre än hälften av STATIONERNA bär fälten. Fel: 751 stationer bär dem. Det som saknas är rader från dygn då fälten inte fanns eller inte skrevs — tid, inte givare. |
| Underlaget i steg 0 | 14-dygnsfönstret bär vind och sikt i bara en del av tiden; hur stor del MÄTTES i omkörningen, se nedan. |
| W-A:s OAVGJORT | Går inte att laga med ett längre fönster, bara med mer tid. Grinden körs om EFTER FÖRSTA HÖSTSTORMEN, som T-A körs om efter första frostnatten. |

Ingen gallringsdeadline här, till skillnad från T-A och #89: W-A räknar stationstimmar, och gallringen
(#83) tunnar till en rad per halvtimme, vilket lämnar stationstimmen intakt.

Skriptet skriver numera ut första `sample_time` som bär byvind, så talet inte behöver härledas igen.

## #117 (12/9 2026) TROSKLAR-RIMFROST skrivet — #89:s överlämning har landat

BESLUT: `docs/TROSKLAR-RIMFROST.md` skrivet som UTKAST för kort #46. Väntar på Bengts fastställande
av värdena och därefter Axels kontrasignering.

VARFÖR NU: TROSKLAR-OVERGANGAR §6 (DECISIONS #109, fastställt OCH kontrasignerat 12/9) lämnade över
två saker till "#46:s eget tröskeldokument" — och det dokumentet fanns inte. Samma form som den
dinglande källan 11/9, när TROSKLAR-TYSTNADSFEL bara låg i Bengts Drive. **En överlämning till ett
dokument som inte finns är en tappad idé med kvitto.**

FORMEN ÄR AVGJORD FÖRE SVEPET: rimfrosten blir **en andra gren i `icing_point`**, inte en sjätte
farotyp. Motorn har fem faror med en prioritetsstege där förloraren droppas; en sjätte kind skulle
röra vid varje vektor i `engine/vectors/` och vid prioritetsordningen. Samma fara — is på vägen — med
en annan väg fram till slutsatsen.

TVÅ SAKER ÖVERTAGNA ORDAGRANT FRÅN #89: (1) partitionen — **#46 äger fallet yta ≤ daggpunkt**
(kondensation pågår), **#89 (a) yta > daggpunkt men regn inom N h** (kvarvarande vatten fryser i torr
luft), så överlappet är tomt per konstruktion och tystnadsfelet inte dubbelräknar. (2) **dimma är en
ÖVERGÅNGSORSAK, inte en interaktion** — dimma är daggpunkt ≈ lufttemperatur, så `visibility_m < S` är
en konfidenshöjare för kondensationsvillkoret, aldrig en egen fara.

GIVARVAKTEN ÄR DOKUMENTETS TYNGSTA AVSNITT och är undantagen från all lättnad — den får skärpas men
aldrig mjukas upp, oavsett signaturer. Skälet är kortets egna körningar 4/9: 53 av 58 kandidater kom
från TRE stationer (Ollsta 2346, Storvik 2135, Bolhyttan 1713) med yta − daggpunkt −28…−49 °C, och
med äkthetsvillkoret överlevde **0 av 53**. Vakten är tredelad: #75:s ärvda vakt (61 % av arkivets
frostrader faller på den), daggpunktens egen (yta − dagg ≥ −5 °C) och korsgivarkontrollen (RH ≥ 90).
**R-A5 gör läxan till ett krav:** ingen enskild station får stå för mer än 20 % av träffarna.

BILLIGASTE VÄGEN TILL UNDERLAG, OCH DEN KRÄVER INGEN SVENSK FROST: det finska arkivet. `KASTEPISTE`
arkiveras ur Fintraffic sedan 4/9 (505 av 528 stationer), och **Lapplands septemberfrost ger äkta
rimfrostnätter veckor före Sverige**. Samma analys, finskt arkiv, ingen ny källa.

R5 (molnklassen) kostar heller ingenting nytt: molnhämtningen byggd för grind T-A (DECISIONS #115)
återanvänds rakt av, med samma sentinelfälla — 113 % är "himlen skymd", inte molnmängd.

## #118 (12/9 2026) SMHI-täckningen svarar på §2.8:s Verify 1 — reservfrågan skild från representativitetsradien

BESLUT: `scripts/smhi-tackning.ts` mäter nu BÅDA parametrarna, och de två frågorna hålls isär i
utskriften. Molnkörningen 12/9 (DECISIONS #114) svarade på representativitetsradien — men lämnade
§2.8:s EGEN Verify 1 obesvarad, och det syntes inte eftersom båda talen ser ut som "täckning".

| Del | Parameter | Frågan | Bandet |
| :-- | --: | :-- | :-- |
| 1 | 16 (moln) | Hur långt får en VViS-yta sträckas ut? Går T-A:s klarhetskontroll att köra? | 50 km, för molnet är storskaligt |
| 2 | 1 (lufttemp) | §2.8 ordagrant: hur många av de 818 segmenten får en SMHI-station inom 15 km? | **15 km**, för luften varierar med terrängen |

Molnets 108 stationer är en ANNAN population än luftens 235, och 50 km en annan fråga än 15. Att
svara på den ena och tro att den andra är besvarad är ett täckningshål i läsningen, inte i datan.

VAKTEN SOM FÖLJER MED SVARET: **täckning är inte duglighet.** Att en station finns inom 15 km säger
ingenting om hur väl dess lufttemperatur följer VViS-ytan vintertid. Det är Verify 2, och den är inte
körd. Ett högt tal i Verify 1 är ett VILLKOR för reserven, aldrig ett kvitto på den.

## #119 (12/9 2026) De fyra måndagsmätningarna återstartade — och grind A föll för första gången

BESLUT (Bengts "ta alla fem"): de fyra flöden som fallerade 7/9 trycktes igång manuellt.
**Alla fyra gröna.** Felsignaturen visade sig inte vara en bugg: jobben hade **noll steg och två
sekunders körtid**, alltså vägrade GitHub starta dem — kostnadstaket 7/9, inte kod. Det fanns
ingenting att laga, bara att trycka. Mätvakten (check 6) larmade rätt i issue #146; **handgreppet var
det som saknades**, och det är den halvan vakten inte kan ersätta.

DE TRE MÄTNINGARNA GAV TRE DOMAR, och två av dem ändrar bilden av §2.4 och §2.8.

**(1) GRIND A FALLEN — första domen alls** (körning 12/9 06:51, 60 dygn, 761 stationer, 155 339
bucketade avläsningar). Den 1/9 hade grinden 57 mätpunkter och underlagsvakten höll: "INGEN DOM". Nu
finns 2 042 punkter, **36 gånger fler**, och vakten släpper.

| band | mätpunkter | MAE | grova > 2 °C |
| :-- | --: | --: | --: |
| 0–7 km | 101 | 0,38 °C | 0,0 % |
| 7–15 km | 147 | **1,41 °C** | **18,4 %** |
| 15–20 km | 243 | 0,95 °C | 8,2 % |
| > 20 km | 1 551 | 1,09 °C | 11,1 % |
| **TOTALT** | **2 042** | **1,06 °C** | **10,7 %** |

A1 (MAE ≤ 1,0 °C): 1,06 ⇒ **FALLER**. A2 (grova ≤ 5 %): 10,7 % ⇒ **FALLER**. A3 (frysklassfel
≤ 10 %): 1,1 % ⇒ **KLARAR med bred marginal.** Skriptets egen dom: *"GRIND A FALLEN — bygg ingen
skugga (tre veckor sparade)."*

TVÅ SAKER SOM MÅSTE LÄSAS MED: (a) **A1 faller på sex hundradelar** — 1,06 mot 1,00 — medan A2 faller
med marginal. Det är de grova felen som fäller, inte medelfelet. (b) **Bandet 7–15 km är sämst av
alla**, sämre än > 20 km. Det är inte monotont i avstånd och har ingen förklaring i dag. (c)
**Frysklassfelet klarar med 1,1 % mot 10 %:** modellen är nästan tillräcklig för det BESLUT den
används till, men inte för den TEMPERATUR den rapporterar. Domen är Bengts och Axels, inte min.

**(2) HÖJDEN ÅTERVINNER NOLL — augustifyndet håller med 49 gånger mer data** (1 962 punkter mot 40).

| band | n | MAE rå | MAE rå+höjd | MAE offset |
| :-- | --: | --: | --: | --: |
| 0–7 km | 102 | 2,58 | 2,31 | 0,38 |
| 7–15 km | 129 | 5,21 | **5,34** | 1,41 |
| 15–20 km | 249 | 1,52 | 1,38 | 0,95 |
| > 20 km | 1 482 | 1,30 | **1,33** | 1,09 |
| **ALLA** | **1 962** | **1,65** | **1,65** | **1,06** |

Totalt återvinner höjdkorrektionen **exakt ingenting** (1,65 → 1,65), och i två av fyra band gör den
det SÄMRE. **Empirisk lapse 0,63 °C/100 m ur 3 476 par** — tidigare rapporterat 0,71 ur 3 455 par,
alltså närmare lärobokens 0,65 när underlaget växte. Rangordningen "felkartan dömer, luftankarna
lagar, höjden finjusterar" står kvar i sin andra och tredje del — men **första delen dömer nu emot
sig själv.**

**(3) SMHI SOM EXTRA ANKARE GÖR MODELLEN SÄMRE — §2.8:s Verify 3 besvarad, och svaret är nej.**
235 aktiva luftstationer, alla med data i fönstret. På **samma punkter** (1 918 st, jämförbart rakt
av): bas 1,05 °C → **+SMHI 1,20 °C**. Varje band blir sämre, inte bara helheten. De 352 punkter som
BARA finns tack vare SMHI har MAE 2,36 °C.

Läsningen, och den är tvådelad: **som förtätning där VViS redan finns är svaret nej** — luftankaret
stör. **Som reserv där VViS saknas helt** är 2,36 °C priset, och det är en annan fråga som Verify 2
ska svara på ordentligt. §2.8:s ankarroll är därmed i praktiken avgjord utan att en rad byggts.

**(4) trv-bevakning:** grön, inga nya poster i Trafikverkets RSS, state committad (88a55bf).

KOSTNAD FÖR HELA OMGÅNGEN: fyra körningar, storleksordningen tio debiterade minuter, under en krona.

## #120 (12/9 2026) Båda rättelserna mätta i stället för härledda — och §2.8:s Verify 1 har ett svar

BESLUT: de två skript som rättades i #116 och #118 kördes om, och talen är nu mätta. **Det var inte
en formalitet: min härledda gissning var nästan dubbelt så hög som verkligheten.**

**(1) W-A:S EXPONERING — 18,9 %, inte de ~32 % jag räknade fram.** Skriptet skriver nu ut både första
arkivtimmen med byvind och täckningsgraden (körning 12/9, 14 dygns fönster, 216 514 rader):

| | |
| :-- | --: |
| Första timmen med byvind | **4/9 05:00** ⇒ 8,1 dygn med data av fönstrets 14 |
| Möjliga stationstimmar i de 8,1 dygnen | 145 819 (751 stationer × 8,1 dygn × 24 h) |
| Efter minutkrisens lucka 5/9 → 9/9 05:00 | ≈ 73 900 |
| **Efter arkivdieten — faktiskt underlag** | **27 557 (18,9 %)** |

RÄTTELSE TILL #116: jag skrev där att fönstret innehåller "ungefär tre dygn" med vind och sikt,
härlett ur kort #84:s SQL-bevis `vind 0`. Mätningen säger **8,1 dygn** — kolumnerna fylldes redan
från 4/9 05:00, och #84:s nolla gällde den fyra dygn långa minutkrisluckan, inte fälten som sådana.
Båda fakta är sanna; min slutsats av dem var inte. **Det är tredje gången på två dygn som ett
härlett tal fallit på en mätning** (0f:s kadens, 1/9:s SMHI-ankare, och nu det här) — och det är
argumentet för att varje sådant tal ska komma ur skriptets utskrift, inte ur ett resonemang i ett
dokument.

Dieten kostar alltså ungefär TVÅ TREDJEDELAR av det som återstår efter luckan. Riktningen på
snedvridningen står kvar som resonemang (#116) och är fortfarande inte mätt.

W-A:s utfall är oförändrat: **OAVGJORT**, 36 stationstimmar i högsta bandet mot kravets 500, och
antydan i bandet 10–15 m/s står kvar på 2,23 × (89,54 mot 40,16 per 1 000 stationstimmar, 927
stationstimmar). Sikt-sentinelen 20 000 m förekommer i 45 924 rader.

**(2) §2.8:s VERIFY 1 — 40 % av vägnätet har en SMHI-luftstation inom 15 km.**

| Fråga | Parameter | Stationer | Median | ≤ 15 km | ≤ 30 km | ≤ 50 km |
| :-- | --: | --: | --: | --: | --: | --: |
| Representativitetsradien (segment → moln) | 16 | 108 av 459 | 28 km | 16 % | 55 % | **94 %** |
| **Verify 1** (segment → lufttemp) | 1 | **235 av 1 003** | **17 km** | **40 %** | 88 % | 100 % |
| Överföringsfunktionens par (VViS → lufttemp) | 1 | 235 | 17 km | 41 % | 86 % | 99 % |

LÄSNINGEN: **vid den gräns §2.8 själv satte — 15 km — räcker täckningen inte.** 331 av 818 segment,
alltså 40 %. Vid 30 km är den 88 % och vid 50 km fullständig, men var gränsen FÅR ligga är inte
mätt här; det är Verify 2. Och Verify 2 har redan fått ett förhandsbesked från samma kväll: SMHI som
extra ankare gör offsetmodellen SÄMRE (#119), och de punkter som bara finns tack vare SMHI kostar
2,36 °C i MAE.

SAMLAD LÄSNING AV #95 EFTER KVÄLLEN: molnet är klart och gav T-A sin fysikkontroll. Ankarrollen är
besvarad med ett nej. Reservrollen har täckningen mätt men dugligheten omätt, och det första
förhandsbeskedet är svagt. **Kvar som levande i kortet är SMHI-förstärkaren (snöfallsvarning + yta
nära noll), som kom in från #93 och inte berörs av något av ovanstående.**

## #121 (12/9 2026) SMHI-förstärkaren byggd — och arkivet visade sig sakna varningens giltighetsfönster

BESLUT (Bengts "vi bygger smhi förstärkaren"): kort #95 (d) har fått tröskeldokument, migration,
ingestfix och ett läsande steg 0-instrument. Ingen motorkod, ingen röst.

**SPÄNNINGEN I KORTET, LÖST FÖRE SVEPET.** Kortet säger två saker som drar åt olika håll:
"snöfallsvarning + **yta nära noll** = högre konfidens" och "ALDRIG en egen fara — den får höja
konfidensen i en varning som redan kvalificerar, **inte skapa en varning**". "Yta nära noll" är ett
BREDARE villkor än motorns `yta ≤ 1 °C OCH fukt`, så läst bokstavligt skulle regeln kunna fyra där
motorn i dag tiger. Lösningen: parametern F3 får ett **tak vid motorns egen tröskel** och kan aldrig
sättas högre — regeln får skära bort, aldrig lägga till. **Om Bengt menade det bredare är det ett
annat kort**, efterhalkans syskon, med egen grind och egen falsklarmsräkning. Det byggs inte
smygande in i en förstärkare.

**OCH EN ANDRA SAK SOM MÅSTE AVGÖRAS FÖRE SVEPET: motorn har inget konfidensfält.** En förstärkare
som inte gör något är värdelös, så effekten är namngiven i dokumentet: **E0 skuggkolumn (startläget)
· E1 längre försprång (samma form som #90:s roll B) · E2 annan text (Axels, inte min) · E3 högre
prioritet (ALDRIG — skulle tysta en olycka).** Vi bygger E0.

**FYNDET UNDER BYGGET, och det är dyrare än regeln själv: `smhi_warnings_history` saknade
giltighetsfönstret.** Nuläget `smhi_warnings` bär `approx_start`/`approx_end`, men den tabellen TÖMS
och skrivs om vid varje synk ("replace-all: feed IS the current truth", ingest/db.ts:243). Historiken
har sedan `001_init` burit allt utom just de två fälten.

| | |
| :-- | :-- |
| Vad arkivet visste | NÄR en varning publicerades |
| Vad det inte visste | NÄR den gällde |
| Varför det spelar roll | **SMHI publicerar i förväg** — en varning publicerad kl 14 kan gälla 22–06 |
| Går det att laga i efterhand | **Nej.** API:et ger bara nuläget; historikraderna är redan skrivna |

Åtgärdat med `sql/015_smhi_giltighet.sql` (två kolumner + index, additiv och idempotent), inlagd i
**automigrationen i ingest/db.ts** så den appliceras av nästa timkörning utan knapptryck, och
historikskrivningen bär nu fälten framåt. Gamla rader får NULL och räknas som **"okänt
giltighetsfönster", aldrig som "gällde inte"** — F-C3 kräver att andelen okända redovisas i varje dom.

**Varje dygn utan den här migrationen hade varit ett dygn vinterunderlag som aldrig kan lagas.**
Samma logik som grind T-A:s frostnätter, och det är skälet till att den gjordes i september.

**GRIND F-A HAR BÅDE GOLV OCH TAK, och taket är det ovanliga.** Kraven: ≥ 200 förstärkta
stationstimmar, ≥ 20 varningsområden, **andelen förstärkta mellan 5 % och 80 %**, och inget enskilt
område får bära mer än 25 % av träffarna. Under golvet gör regeln ingenting; **över taket säger den
bara "det är vinter" och skiljer inte två fall åt.** En förstärkare som alltid är på är ingen
förstärkare. F-A4 är rimfrostens läxa (#117 R-A5) i förebyggande form: en enda länsvarning över
Norrbotten kan ensam skapa tusentals stationstimmar.

**DEN ÄRLIGA SVAGHETEN, skriven före mätningen: ett län är inte en väg.** Varningsområdena är
länspolygoner, och att en snöfallsvarning täcker en station säger ingenting om den stationens hundra
meter. Det är samma läxa som §2.8:s täckningsmätning gav — **täckning är inte duglighet** — och
taket i F-A3 är den mekanism som ska fånga den.

F-B (skiljer regeln?) är en VINTERGRIND: facit är `road_condition_history`, som står stilla sedan
25/8 eftersom Trafikverket klassar om vägar först på vintern. Den kan inte dömas i september, och
dokumentet säger det i stället för att låtsas annat.

KOSTNAD: ingen ny källa, ingen ny hämtning. Två `timestamptz` per varningsrad (~16 byte), och
varningsrader är tiotal per dygn. **0 kr/mån.**

## #122 (12/9 2026) Förstärkarens första körning — OAVGJORT som väntat, och två fynd på vägen dit

BESLUT: grind F-A kördes end-to-end (30 dygns fönster). **Utfall OAVGJORT** — underlagsvakten håller
på noll förstärkta stationstimmar och noll områden. Det är ett underlagsbesked, inte ett nej, och
det var det väntade utfallet i september. Värdet ligger i att instrumentet är prövat innan det
behövs, precis som grind T-A (#113).

| Inventeringen, 30 dygn | |
| :-- | --: |
| Historikrader | 126 (41 områden) |
| Med `geom` | 97,6 % |
| **Med giltighetsfönster** | **0,0 %** — alla skrivna före `sql/015` |
| Spann | 18/8 – 10/9 |
| Kvalificerande stationstimmar (yta ≤ 1 °C och fukt, efter givarvakten) | **3** |
| Förstärkta, i alla nio F1 × F2-kombinationer | **0** |

Varningstyperna i fönstret: `WIND_SEA` 85 · `FIRE` 25 · `WATER_SHORTAGE` 10 · `RAIN` 3 ·
`FLOODING` 3. **Noll `SNOW_ICE`, noll `ICING`.** Känsligheten i F4 (±0/±1/±3 h) och F5 (inuti /
10 km / 25 km) ändrar ingenting — noll av tre i varje ruta.

**FYND 1: `isWinterRelevant()` räknar kuling till havs som vinter.** Ingestens regex
(`ingest/sources/smhi.ts`) är `SNOW|ICE|ICING|COLD|WIND`, och **`WIND` matchar `WIND_SEA`**. Alla 85
"vinterrelevanta" varningar i fönstret är sjövarningar. Det är **ofarligt i drift** — flaggan
används bara i en loggrad (`ingest/index.ts:61`), policyn är "lagra allt" och ingenting filtreras på
den — men loggraden "winter-relevant: N" betyder inte vad den ser ut att betyda, och min egen
falsifierbarhetsvakt skrev först ut just det talet. **Rättat:** vakten räknar nu per kodmängd och
skriver ut alla tre, med en rad som säger varför WINTER_CODES-talet inte får läsas ensamt.
Det bekräftar också F1:s svep: **WIND hör inte hemma i en frysriskförstärkare.**

**FYND 2: en migration i automigrationslistan är inte en körd migration.** Första försöket föll på
`column "approx_start" does not exist`. `sql/015` ligger i `ingest/db.ts`:s automigration, men den
listan körs först när INGESTEN kör — och mätskriptet kördes emellan. Samma form som läxan "en ändrad
fil under supabase/functions/ är INTE en deploy": koden var mergad, databasen visste inget.
Åtgärd: dbknappen (`migrera sql/015_smhi_giltighet.sql`) kördes med kolumnlistan som bevis.
**Regel att ta med: efter en migration som ett mätskript beror på, tryck dbknappen i samma varv —
vänta inte på nästa timkörning.** Ingesten går timvis och grön (senast 07:11), så fälten skrivs
framåt från och med nästa varv.

**VAD SOM INTE GÅR ATT VETA ÄNNU:** med 3 kvalificerande stationstimmar på 30 dygn finns ingen
nämnare värd namnet. F-A körs om vid de första vintervarningarna, och då bär de sitt
giltighetsfönster — vilket de 126 raderna i arkivet i dag inte gör och aldrig kommer att göra.

## #123 (12/9 2026) Den smala förstärkaren vald — och den breda idéns kärna flyttad till #89 som N_varning

BESLUT (Bengt, på direkt fråga "vilken är din bedömning av rätt; den smala eller den breda" och
ordern "ta den smala och skriv in det tredje i 89"):

**1. SMHI-förstärkaren (#95 d) är SMAL.** Regeln verkar bara på stationstimmar som redan kvalificerar
för motorns frysrisk. F3:s tak vid motorns egen tröskel står fast, och det är undantaget från all
lättnad i §9 — den dagen regeln får skapa varningar är den ett annat kort.

SKÄLET SOM FÄLLDE DEN BREDA, och det är värt att kunna utantill: **ett län är ingen punkt och ingen
sträcka.** Om det verkligen snöar över länet rapporterar de flesta av våra stationer där redan
nederbörd, och motorn varnar. De stationer som är TORRA under en aktiv länsvarning är just de där
varningen är lokalt fel eller där snön inte hunnit fram — **alltså exakt falsklarmen.** En varning
född ur en länspolygon hade legat på varenda väg i Jämtland i åtta timmar, på den sorts larm som
DECISIONS #103 pekade ut som den dyra: en förutsägelse, inte en observation.

OCH DET AVGÖRANDE ARGUMENTET: **hålet ägs redan av ett annat kort, som gör det bättre.** #89 (a)
efterhalkan attackerar samma blindhet — att `moisture` betyder "nu" — men med en PUNKTKÄLLA:
stationens egen regnhistorik, uppmätt till 76 % av regnstoppen med median 35 minuter. En punktkälla
får säga "framöver"; en länspolygon får inte det. **Den breda förstärkaren var inte en bättre
förstärkare, den var en sämre #89 (a).**

ÄRLIGT OM DEN SMALA: dess informationsvinst är NÄRA NOLL. Stationen har redan mätt vägytan på plats
och sagt att det faller nederbörd; en länsvarning som säger "det snöar någonstans i Jämtland" är
strikt svagare information än en direkt mätning. Den byggs ändå därför att den kostar noll,
instrumentet finns, och **ett dokumenterat nej stänger den sista levande delen av #95** i stället
för att lämna den som en idé. F-A3:s TAK är den intressanta mätningen: täcker vintervarningarna
90 % av de kvalificerande timmarna säger regeln bara "det är vinter" och svaret är nej med siffror.

**2. DEN BREDA IDÉNS BERÄTTIGADE KÄRNA FLYTTAS TILL #89 SOM PARAMETERN `N_varning`**
(TROSKLAR-OVERGANGAR §2.3, ny). SMHI vet två saker våra stationer inte vet: **ytan mellan
stationerna** och **tiden före händelsen** — varningarna publiceras i förväg. Den smala regeln
använder ingendera. N_varning använder den andra:

> Utlösaren är oförändrad — **stationens EGET uppmätta regn**. Vägen var mätbart blöt. Det enda
> varningen påverkar är hur länge vi antar att den förblir det.

Svep: **av · 2 · 4 · 6 h**, mot N:s 1 · 2 · 3 · 4. Kodmängden ärvs från förstärkarens F1/F2 och
sveps inte två gånger.

**DET ÄR INGEN GRATIS ÄNDRING, och dokumentet säger det rakt ut: N_varning FYRAR LARM som annars
inte fyrat.** Skillnaden mot den breda regeln är i art, inte i storlek — här finns alltid en uppmätt
väta i botten. Därför gatas den som en egen proxy: **B3-paret körs med och utan förlängningen**, och
den överlever bara om den räddar missar utan att bära mer än sin del av falsklarmen. Går den inte att
döma sätts den till **av**, aldrig till ett gissat värde.

HÅRD BEGRÄNSNING: `smhi_warnings_history` bar inte giltighetsfönstret förrän `sql/015` (#121).
**N_varning kan därför bara dömas på varningar skrivna efter 12/9.** Rader med okänt fönster räknas
som "vet inte", aldrig som "ingen varning", och andelen ska stå i varje utfall.

ÄNDRINGSREGIMEN: TROSKLAR-OVERGANGAR är fastställt av Bengt och kontrasignerat av Axel 12/9. §10
tillåter ändringar i §2:s svep med en rad i DECISIONS fram till första skuggkörningen, och någon
sådan har inte gjorts — tillägget är alltså formellt i sin ordning. **Men en ny parameter är mer än
ett justerat svepvärde.** §10 bär därför en rad om att Axel ska se §2.3, och att ingen skuggkörning
får göras innan han läst den. Den som kontrasignerat ska veta vad som står i det han signerat.

## #124 (12/9 2026) Ruttberedskapen — vilken av skuggflottans tjugo bilar kan pröva vilken grind

BESLUT (Bengts order "gör beredskapstabellen"): `scripts/ruttberedskap.ts` + knapp. Läsande.
Fem av de skuggkolumner vi skrivit tröskeldokument för ska köras på skuggflottan (Axels idé
29/8) — trenden #88, tillståndsskattaren och efterhalkan #89, rimfrosten #46 och SMHI-
förstärkaren #95 (d). I vinter kommer frågan "vilken bil ska vi titta på?", och att läsa alla
tjugo är inte ett svar.

RUTTERNA LÄSES UR SKUGGMOTORN, de kopieras inte. Självtestet fäller om parsningen slutar hitta
dem — det är driftvakten, och den finns därför att en kopia av `fukt()` behövde skyddas mot
samma sak i går.

**UTFALL (körning 12/9, 30 dygn, 849 stationer):**

| Grind | Bästa bil | Talet |
| :-- | :-- | :-- |
| **A** | **E4 Umeå→Luleå** | **58 %** av rutten i det oförklarade 7–15 km-bandet |
| T-A / #46 | E6 Halmstad→Göteborg | kallast −0,5 °C — **ombud, inte mätning** |
| W-A | E6 Malmö→Halmstad | högsta rimliga by 18,4 m/s på 24 givare |
| F-A | ingen rangordning | arkivet saknar vintervarningar |

GRIND A-RADEN ÄR DEN SOM BETYDER NÅGOT NU. E4 Umeå→Luleå ligger till 58 % i det band som föll
sämst i grind A (MAE 1,41 °C, 18,4 % grova fel, #119) och som saknar förklaring. Ingen annan
rutt kommer i närheten; tvåan och trean ligger på 53 och 50 %. Samtidigt har den bara **10
stationer** inom räckvidd, och E10 Luleå→Kiruna — den kallaste — har **6 stationer och 49 % av
sin längd bortom 20 km från närmaste ankare**. **De rutter som kan pröva de svåraste frågorna är
de som har tunnast underlag.** Det är inte en slump: glest stationsnät är både orsaken till
ankarproblemet och hindret för att mäta det.

**FÖRSTA KÖRNINGEN FÄLLDE TVÅ AV SINA EGNA DOMAR, och båda är lagade med vakt och självtest:**

**(1) Rätt vakt på fel nämnare, igen.** Tabellen utsåg E6 Malmö→Halmstad till bästa rutt för T-A
på EN enda frostrad vid exakt 0,0 °C, medan E10 Luleå→Kiruna (0,5 °C) hamnade långt ned.
Underlagsvakten fanns men vaktade ANTALET STATIONER, inte antalet frostrader. Landet har tre
frostrader totalt. Golv 20 infört; under det rangordnas på kallaste uppmätta yta, uttryckligen
märkt OMBUD. Samma klass av fel som fällde upprepningsmätningen (#103) — tredje gången i den
här familjen på tre dygn.

**(2) Tabellen läste inte sitt eget tröskeldokument.** Den utsåg E4 Södertälje→Uppsala till
bästa rutt för W-A på en byvind av **55,1 m/s**, tvåan 45,0. Sveriges rekord ligger kring 81 m/s
och då på fjällstation; 55 m/s på E4 i september är en trasig givare. TROSKLAR-VIND-SIKT §3.1
hade REDAN skrivit att vakten behöver ett tak (svep 30 · 40 · 50) — dokumentet fanns, skriptet
läste det inte. Rangordning sker nu under taket 30 m/s, med råmaxvärdet bredvid som
givarmisstanke. Tre rutter bär en sådan: E4 Södertälje→Uppsala (55,1), E4 Uppsala→Gävle (45,0)
och E4 Jönköping→Linköping (32,0).

**EN VARNING SOM SKA FÖLJAS UPP I VINTER:** tre rutter skär **noll** arkiverade varningsområden
— E4 Umeå→Luleå, E10 Luleå→Kiruna och E14 Sundsvall→Åre. Sommarens varningar (FIRE,
WATER_SHORTAGE, WIND_SEA) är sydliga, så det är sannolikt årstiden och inte trasig geometri. Men
det är just de tre rutterna förstärkaren behöver i vinter, och skillnaden mellan "inga varningar
ännu" och "polygonerna matchar inte däruppe" syns först vid första snövarningen. Läsningen
skriver ut det av sig själv.

GILTIGHET: tabellen säger var en grind KAN prövas, aldrig vad den kommer att visa. Ankarbanden
vandrar med stationsbortfall, så den ska köras om när vintern satt sig.

## #125 (12/9 2026) Anomalin i grind A är förklarad — och domen står ändå

BESLUT (Bengts order efter Axels bedömning, "mät anomalin med de tre uppdelningarna"):
`scripts/anomalin.ts` + knapp. Modellen är grind A:s, inte en egen — samma konstanter, samma
leave-one-out, samma `DISTINCT ON` per hink, och ett självtest som LÄSER `publish/grind-a.ts`
och fäller om konstanterna glidit isär.

**HUVUDFYNDET: GRIND A BÄR INTE #75:s GIVARVAKT — OCH DET ÄR DÄR ANOMALIN SITTER.**
Frågan i `publish/grind-a.ts` tar varje rad med `surface_temp_c`, utan att kräva att
lufttemperaturen finns eller att yta − luft är rimlig. **61 % av arkivets frostrader faller på
den vakten** (#106). En trasig givare förstör både sin egen punkt och sina GRANNARS
prediktioner — och en granne på 10 km får hög vikt i den inversa avståndsviktningen.

| band | utan vakt (grind A i dag) | med #75:s vakt |
| :-- | --: | --: |
| 0–7 km | 0,38 / 0,0 % (101) | 0,33 / 0,0 % (81) |
| **7–15 km** | **1,41 / 18,4 % (147)** | **0,78 / 3,1 % (129)** |
| 15–20 km | 0,95 / 8,2 % (243) | 0,85 / 6,4 % (250) |
| > 20 km | 1,09 / 11,1 % (1 551) | 0,89 / 5,4 % (1 483) |
| **TOTALT** | **1,06 / 10,7 % (2 042)** | **0,85 / 5,1 % (1 943)** |

Med vakten på är **anomalin borta**: 0,33 · 0,78 · 0,85 · 0,89 stiger monotont med
ankaravståndet, precis som fysiken förutsäger. Bandet 7–15 km går från sämst till näst bäst,
och de grova felen där faller från 18,4 % till 3,1 %.

**OCH DOMEN STÅR ÄNDÅ.** A1 skulle klara (0,85 mot kravets 1,0). **A2 faller på en tiondels
procentenhet: 5,1 % mot kravets 5,0 %.** Det är därför en decimal lades till i utskriften innan
något rapporterades — avrundningen till "5 %" dolde exakt den skillnaden. Grind A faller i båda
läsningarna; det som ändras är VARFÖR. Utan vakten föll den på trasiga givare. Med vakten faller
den knappt, på äkta modellfel.

**(a) REGION — min egen hypotes är FALSIFIERAD.** Jag hade föreslagit att anomalin kunde vara
geografi: 76 % av punkterna ligger i bandet > 20 km, alltså Norrland, och beslutsbandet −5…+5 °C
gör att bara kalla stunder kvalificerar. Mätningen säger nej. **Inom Norrland ENSAMT är 7–15 km
fortfarande värst med bred marginal:** 0,33 · **2,10** · 0,96 · 1,09. I syd är samma band
välartat (0,57). Anomalin överlever regionuppdelningen — den är inte geografi.

*Bifynd värt ett eget kort:* mellersta Sverige (58,5–60,5°) bidrar med **tolv punkter totalt** i
hela fönstret. Grind A:s dom vilar i praktiken på Norrland och Skåne.

**(b) HÖJDSKILLNAD — Axels hypotes träffar PLATSEN men inte FORMEN.** Inom 7–15 km, uppdelat på
höjdskillnad station ↔ närmaste bidragande granne: 20–50 m ger 0,51 / 0,0 % (42 punkter),
**50–100 m ger 4,16 / 55,3 % (47 punkter)**, och ≥ 100 m ger 0,59 / 2,2 % (45 punkter). Hela
skadan ligger i EN cell. Men om mekanismen vore "nära nog för hög vikt, långt nog för annan
terräng" borde ≥ 100 m vara värst av alla — och den är välartad. Tillsammans med (d) är den
troligaste läsningen att de 47 punkterna är NÅGRA FÅ TRASIGA STATIONER som råkar ligga 50–100 m
isär i höjd, inte en terrängeffekt. Terränghypotesen är inte motbevisad, men den behöver ett
underlag där givarfelen redan är borta.

**(c) FILTERUTFALLET — och här måste Axels verifiering kompletteras.** Han kontrollerade
stationsantalet per band och fann att 7–15 km har flest, 302 stycken; min mätning ger 291 för
samma band (annat fönster). **Den kontrollen är rätt gjord på fel storhet.** Geometriskt band
säger hur många stationer som HAR en granne på det avståndet. Domen bärs av de stationer som
faktiskt producerade en utvärderingspunkt, och där ser det ut så här:

| band | stationer (geometriskt) | stationer (utvärderade) | punkter |
| :-- | --: | --: | --: |
| 0–7 km | 182 | **5** | 101 |
| 7–15 km | **291** | **13** | 147 |
| 15–20 km | 140 | 19 | 243 |
| > 20 km | 141 | 88 | 1 551 |

**7–15 km-domen vilar på tretton stationer.** Av 761 stationer hade **629 ingen enda vintertimme**
(ingen hink under 5 °C på 60 dygn), och bara 109 gav någon punkt alls. Det ÄR alltså ett
urvalsfel — inte i geometrin Axel kontrollerade, utan i vilka stationer som blev kalla nog och
samtidigt hade en samobserverande granne. Med 11,3 punkter per station i det bandet räcker tre
eller fyra trasiga stationer för att bära hela de 47 punkterna i den värsta höjdcellen.

**VAD SOM FÖLJER, och inget av det är mitt att besluta:**
1. **Domen står** — A2 faller i båda läsningarna. Ingen tröskel har rörts.
2. **Grind A:s frågesats saknar en vakt som huset kallar obligatorisk.** #75 gäller "varje
   väderfråga", TROSKLAR-RIMFROST §3 kallar den "obligatorisk del av varje framtida frostgren",
   och grind A har den inte. Att lägga till den är inte att flytta målstolpar — men det ändrar
   talen, och därför ska Bengt och Axel besluta det, inte jag.
3. **Anomalin behöver inte längre stoppa er.** Den har en förklaring som är prövbar och som
   pekar på datakvalitet, inte på att modellen gör något annat än vi tror.

## #126 (12/9 2026) Marginalvakten — en grind får inte fälla på två mätvärdens marginal

BESLUT (Bengts order "lägg in marginalvakten"): TROSKLAR-SKUGGAN §3 får ett nytt stycke och
`publish/grind-a.ts` en ny vakt. **Ligger ett A-mått inom ±1,96 standardfel från sin tröskel
skrivs OAVGJORT ut i stället för KLARAR eller FALLER.**

VARFÖR. Domspärren från 1/9 vaktar MÄNGDEN underlag — minst 500 punkter över minst 20
stationer — men ingenting vaktar MARGINALEN. Därför läser ett "FALLER" på två raders marginal
exakt likadant som ett "FALLER" på tvåhundra raders. Anomalimätningen (#125) gjorde skillnaden
konkret: A2 med #75:s givarvakt landar på **5,1 % mot kravets 5,0 %**, och på 1 943 punkter är
en tiondels procentenhet ungefär **två mätvärden**. Två rader är ingen marginal, det är brus.

| läsning | A2 | ±1,96 SE | kravet 5,0 % inom intervallet? |
| :-- | --: | --: | :-- |
| grind A som den körs (utan givarvakt) | 10,7 % | ±1,3 pe | **nej — långt utanför** |
| med #75:s givarvakt | 5,1 % | ±1,0 pe | **ja — mitt i** |

**DEN STÅENDE DOMEN BERÖRS INTE.** 10,7 % mot 5,0 % ligger långt utanför bruset och faller lika
brett med vakten som utan. Det bevisades genom omkörning efter att vakten lagts in, inte genom
resonemang — en ändring i domlogiken ska visas ofarlig, inte antas vara det.

**VAKTEN ÄR ENSIDIG, och det är själva poängen.** Mätpunkterna är inte oberoende (samma
stationer, intilliggande halvtimmar), så binomial- och medelvärdesfelet är en **undre gräns**
för osäkerheten. Ligger utfallet INOM intervallet är frågan säkert oavgjord. Ligger det UTANFÖR
är den inte därmed avgjord — vakten är minimikravet, inte ett tillräckligt bevis. Ett tal som
klarar marginalvakten har alltså inte fått ett kvalitetsintyg, bara passerat den lägsta ribban.

**DEN KAN ALDRIG ÖPPNA EN STÄNGD GRIND.** Ett KLARAR inom bruset blir OAVGJORT (skärpning), och
ett FALLER inom bruset blir OAVGJORT (mät vidare). Grinden öppnar bara på KLARAR. Domlogiken är
därför: **något mått FALLER ⇒ grinden faller; annars något OAVGJORT ⇒ ingen dom; annars klarad.**
En avgörande fallning räcker alltså fortfarande för att fälla hela grinden, även om ett annat
mått är oavgjort.

SJÄLVTESTET har fått sju nya kontroller mot känd sanning, bland annat de två tal som föranledde
vakten: att 5,1 % mot 5,0 % på 1 943 punkter INTE är skiljbart, och att 10,7 % mot 5,0 % på
2 042 punkter ÄR det. Noll punkter och en enda punkt ger aldrig skiljbarhet.

ÄNDRINGSREGIMEN: TROSKLAR-SKUGGAN är fastställt av båda 1/9, och §5 kräver båda underskrifterna
efter första skuggkörningen. Segmentets skuggkörning har inte startat (#38b steg 4 väntar på
halka i oktober), så tillägget är formellt i sin ordning med Bengts order och den här raden.
**Men dokumentet är bådas, och stycket bär därför en rad om att Axel ska se det.** Ingen dom som
VILAR på marginalvakten får fällas innan han läst den — den stående domen gör inte det.

STÖRRE ÄN GRIND A: samma lucka finns i varje grind vi skrivit i dag. T-A, W-A, F-A, Ö-A och R-A
har alla underlagsvakter men ingen marginalvakt. De har hittills bara sagt OAVGJORT av
underlagsskäl, så luckan har inte kostat något än — men den ska stängas i samma form när de
börjar fälla. Eget kort.

## #127 (12/9 2026) Marginalvakten körd — A1 föll aldrig, och domen vilar på ETT mått

BESLUT: omkörning av grind A med marginalvakten inlagd (#126). Domen står oförändrad, men
**en av de tre raderna var fel läst hela tiden**.

| mått | uppmätt | ±1,96 SE | tröskel | före vakten | efter vakten |
| :-- | --: | --: | --: | :-- | :-- |
| A1 medelfel | 1,06 °C | **±0,09 °C** | ≤ 1,0 | FALLER | **OAVGJORT** |
| A2 grova fel | 10,7 % | ±1,3 pe | ≤ 5,0 % | FALLER | **FALLER** |
| A3 frysklassfel | 1,1 % | ±0,4 pe | ≤ 10 % | KLARAR | KLARAR |

**A1 FÖLL ALDRIG.** 1,06 mot 1,0 är sex hundradelar, och osäkerheten är nio. Intervallet
0,97–1,15 omsluter tröskeln. Jag rapporterade det i morse som "faller på sex hundradelar" och
behandlade det som en fallning — det var fel läst, och det är precis den sortens läsning vakten
byggdes för att hindra. **Måttet är inte avgjort åt något håll.**

**DOMEN STÅR, och den vilar på ETT mått: A2.** Gapet är 5,7 procentenheter mot en osäkerhet på
1,3 — det faller brett och utan tvekan. A3 klarar lika brett (1,1 % mot 10, osäkerhet 0,4).

**DET SKÄRPER VAD DOMEN FAKTISKT SÄGER.** Inte "modellen är i genomsnitt för dålig" — det är
oavgjort. Utan **"modellen går tillräckligt ofta tillräckligt fel"**: vart tionde svar mer än två
grader bort. En modell med acceptabelt medelfel och oacceptabla utliggare är ett annat problem än
en som är jämnt dålig, och det pekar åt samma håll som anomalifyndet (#125): utliggarna kommer
från trasiga givare, och med #75:s vakt faller de grova felen från 10,7 % till 5,1 %.

Formuleringen i lägesrapporten och i TAVLA — "A1 och A2 faller" — ska läsas om till **"A2 faller;
A1 är oavgjort"**. Axels bedömning berörs inte i sak: han lät domen stå på att A1 OCH A2 faller,
och den står fortfarande, men på en smalare grund än han fick se.

## #128 (12/9 2026) Marginalvakten i varje grind — och den flyttades till en delad modul

BESLUT (Bengts order, Axels ja): marginalvakten från #126 gäller nu **varje grind i huset** och
bor i **en enda modul**, `publish/marginal.ts`. En statistisk regel kopierad till sex skript är
exakt den drift vi vaktat mot hela dygnet.

| Grind | Vad som fick vakten |
| :-- | :-- |
| **A** (offsetmodellen) | A1/A2/A3 mot sina tak; sammanvägningen via `grindutfall` |
| **V-A** (vattenplaningen) | V-A1 (golv 70 %) och V-A2 (tak 25 %) — **bruset räknades redan ut och SKREVS UT här, men domen fälldes på punktskattningen** |
| **W-A** (vind och sikt) | kvoten ≥ 1,5 × |
| **F-A** (SMHI-förstärkaren) | andelen mot BÅDA sina gränser, golv 5 % och tak 80 % |
| **T-A** (trenden) | separationen mot noll, i topplistan |
| **Ö-A** (övergångarna) | 0a:s huvudtal, det som blev Ö-A:s dom |

**EN KVOT FÅR INTE BINOMIALFEL, och det är inte en detalj.** W-A:s mått är en kvot mellan två
olycksfrekvenser, inte en andel. Osäkerheten sitter i logaritmen och domineras av det minsta
antalet händelser: SE(ln kvot) ≈ √(1/a + 1/b). Att applicera binomialfelet där hade gett ett
snyggt tal som mäter fel sak — samma klass av fel som "rätt vakt på fel nämnare" (#103, #124).
Modulen har därför två funktioner, `skiljbar` för andelar och medelvärden, `skiljbarKvot` för
kvoter, och T-A:s separation — en SKILLNAD mellan två andelar — får √(se₁² + se₂²).

**V-A ÄR DET TYDLIGASTE EXEMPLET PÅ LUCKAN.** Skriptet räknade redan ut binomialbruset och skrev
ut det bredvid varje tal ("61 ± 2 %"), men domen fälldes ändå på punktskattningen. Talet syntes,
det avgjorde bara ingenting. **V-A:s stående nej berörs inte:** 61 % mot kravets 70 % är nio
procentenheters gap mot två i brus.

Domlogiken är delad och densamma överallt: **något mått FALLER ⇒ grinden faller; annars något
OAVGJORT ⇒ ingen dom; annars klarad.** En avgörande fallning räcker alltså fortfarande.

## #129 (12/9 2026) #75:s givarvakt in i grind A — och den stående domen får därmed omprövas

BESLUT (Bengts order, **Axels ja**): `publish/grind-a.ts` läser nu bara rader som klarar #75:s
givarvakt. Fram till i dag gjorde den inte det, trots att vakten enligt #75 gäller "varje
väderfråga" och enligt TROSKLAR-RIMFROST §3 är "obligatorisk del av varje framtida frostgren".

**VARFÖR DET INTE ÄR MÅLSTOLPSFLYTT — och varför frågan ändå ställdes till Axel.** Ingen tröskel
har rörts. Det som ändras är att indata följer en husregel som fanns före mätningen. Men vi
upptäckte att vakten saknades **därför att vi letade efter något som kunde förklara ett dåligt
utfall**, och den ordningen gör att fyndet inte får bokföras av oss ensamma. Därför gick frågan
till Axel innan vakten lades in, med alla tal framme.

**VAD SOM FAKTISKT ÄNDRAS.** Anomalimätningen (#125) gav förhandsbeskedet: A1 0,85 (mot 1,0),
A2 5,1 % (mot 5,0 %), A3 klarar. Med marginalvakten (#126) blir A2 därmed **OAVGJORT**, inte en
fallning — 5,1 mot 5,0 är ungefär två mätvärden. **Grind A går alltså sannolikt från FALLEN till
INGEN DOM.**

**Det är inte ett godkännande.** Grinden öppnar bara på KLARAR, så segmentmotorn får fortfarande
inte byggas. Skillnaden är att husets svar blir "vi vet inte än" i stället för "nej" — och det har
en kostnad som ska stå här: **grind A fanns för att fatta novemberbeslutet tidigt och billigt. Ett
OAVGJORT i september betyder att novemberbeslutet saknar underlag, och vinterdata som kan avgöra
det kommer efter november.** Valet står då mellan att skjuta segmentmotorn till nästa vinter eller
att bygga på en modell som inte är klarerad. Det valet är Bengts och Axels.

**A1 FÖLL ALDRIG** (#127), och det ska sägas en gång till här eftersom det ändrar vad Axel
godkände: han lät domen stå på att "A1 och A2 faller". A1:s intervall (1,06 ± 0,09) omslöt
tröskeln hela tiden. Domen vilade på A2 ensamt redan innan givarvakten kom på tal.

## #130 (12/9 2026) Frysklassningskortet öppnat — Axels fråga, med trösklar skrivna före mätning

BESLUT: kort **#103** och `docs/TROSKLAR-FRYSKLASSNINGEN.md` (utkast). Frågan är Axels, ordagrant:
*"kan en modell som är opålitlig på grader ändå bära en frysklassning?"*

Skälet den är legitim och inte en efterhandsräddning står i hans egen formulering: **samma data,
ny fråga, ärlig ordning.** Dokumentet är därför skrivet så att inget tal i §2 eller §4 kommer ur
A3:s utfall, och det står uttryckligen att A3:s 1,1 % inte får åberopas som skäl för någon tröskel
— det är just den återkopplingen som gör efterhandsjusteringar värdelösa.

**AVGRÄNSNINGEN SOM AVGÖR ALLT ANNAT (§1):** en godkänd frysklassning ger **inte** rätt att skapa
en varning där motorn tiger. Den får bara stärka eller försvaga en bedömning som redan vilar på en
uppmätt station. Samma regel som SMHI-förstärkaren fick, av samma skäl: **en modellerad storhet får
aldrig vara en avtryckare.**

**K2 ÄR DOKUMENTETS EGENTLIGA IDÉ.** Grind A tvingade modellen att svara i varje punkt. En
klassificerare får avstå nära gränsen — och frågan blir hur bra den är på det den uttalar sig om,
och hur mycket den då måste avstå. Därför har K-A både ett träffsäkerhetskrav och ett
täckningskrav; en hög träffsäkerhet på en tiondel av punkterna är inget resultat.

**K-A2 ÄR ASYMMETRISK MED FLIT:** att säga "fryser" om en torr väg kostar ett onödigt larm, att
säga "fryser inte" om en isig väg kostar löftet produkten vilar på. Taket för det felet är tio
gånger hårdare än för det andra, och det är undantaget från all lättnad.

**OCH EN VAKT MOT SEPTEMBER:** K-A4 kräver minst 100 punkter med UPPMÄTT frys. Ett septemberunderlag
kan annars ge 99 % rätt klass genom att alltid svara "fryser inte". En klassificerare som aldrig
sett ett positivt fall är inte prövad.

## #131 (12/9 2026) Grind A med båda vakterna: INGEN DOM — och anomalin är borta ur talen

BESLUT: omkörning av grind A med #75:s givarvakt (#129) och marginalvakten (#126/#128) på plats.

| band | mätpunkter | MAE | grova > 2 °C | frysklassfel |
| :-- | --: | --: | --: | --: |
| 0–7 km | 81 | 0,33 °C | 0,0 % | 0,0 % |
| 7–15 km | 129 | 0,78 °C | 3,1 % | 0,0 % |
| 15–20 km | 250 | 0,85 °C | 6,4 % | 0,0 % |
| > 20 km | 1 483 | 0,89 °C | 5,4 % | 0,4 % |
| **TOTALT** | **1 943** | **0,85 °C** | **5,1 %** | **0,3 %** |

| mått | utfall | marginal | dom |
| :-- | --: | --: | :-- |
| A1 MAE ≤ 1,0 °C | 0,85 | ±0,05 | **KLARAR** |
| A2 grova ≤ 5,0 % | 5,1 % | ±1,0 pe | **OAVGJORT** |
| A3 frysklassfel ≤ 10 % | 0,3 % | ±0,2 pe | **KLARAR** |

**⏳ INGEN DOM.** Precis som förutsagt i #129. Det är inte ett godkännande — grinden öppnar bara på
KLARAR — men husets svar är nu "vi vet inte än" i stället för "nej".

**ANOMALIN FINNS INTE LÄNGRE I TALEN.** 0,33 · 0,78 · 0,85 · 0,89 stiger monotont med
ankaravståndet, som fysiken kräver. Det band som var sämst av alla fyra är nu näst bäst. Fyndet i
#125 håller hela vägen genom till den skarpa körningen.

**A1 KLARAR PÅ RIKTIGT**, inte inom bruset: 0,85 mot 1,0 är femton hundradelar mot en marginal på
fem. Det är den enda av de tre raderna som är avgjord åt det positiva hållet.

**A3 FÖRBÄTTRADES FRÅN 1,1 % TILL 0,3 %** och är noll i tre av fyra band. Det talet får enligt
TROSKLAR-FRYSKLASSNINGEN §2 **inte** användas för att sätta någon tröskel i kort #103 — men det är
ett skäl att tycka att frågan är värd att ställa.

**VAD SOM NU LIGGER PÅ BENGT OCH AXEL, och det är en tidsfråga:** novemberbeslutet har inget
underlag. A2 kan inte avgöras på septemberdata, och vinterdata kommer efter november. Valet står
mellan att skjuta segmentmotorn till nästa vinter eller att bygga på en modell som inte är
klarerad. **Grinden har gjort sitt jobb — den vägrar svara på en fråga materialet inte kan svara
på.** Det är dyrare än ett nej, men det är sant.

## #132 (12/9 2026) Kontrasigneringen var aldrig beslutad — arbetsdelningen är en annan

BESLUT (Bengt, ägaren): **kontrasigneringsregimen avskaffas.** Den var en konvention som växte i
repot utan att någon beslutat den, och den har i praktiken bara producerat väntan. Åtta av nio
tröskeldokument hade den inskriven, och varje nytt dokument ärvde den vidare — inklusive de fyra
som skrevs 12/9.

**DEN VERKLIGA ARBETSDELNINGEN, Bengts ord:**

| Axel | Bengt |
| :-- | :-- |
| Motorn, appen, allt som är igång — vektorerna, rösten, telefonkopplingarna | Utvecklingen framåt: kan motorn förbättras, kan vi mäta mer eller bättre för att minska osäkerheten i prognoser och varningar |

**Följden, och den städar upp ett fel jag gjort genomgående:** grindomarna är **Bengts**, inte
gemensamma. Jag har skrivit "domen är Bengts och Axels" om grind A hela dygnet. Det är fel.
Överlämningspunkten till Axel är när något färdigmätt ska bli **kod i motorn eller ord i bilen** —
inte när en tröskel ska sättas.

**VAD SOM INTE FÖRSVINNER, och skillnaden är hela poängen.** Två saker hade blandats ihop:

* **Ceremonin** — två underskrifter, versionering, tak på antal öppna dokument. Avskaffad.
* **Disciplinen** — att trösklarna är daterade FÖRE mätningen och inte skrivs om när talen kommit.
  **Den står kvar**, och den gjorde verkligt arbete 12/9: grind A:s tal går att lita på enbart
  därför att gränserna skrevs 1/9. Den behöver ingen signatur — den behöver ett datum och att den
  som skrev tröskeln inte skriver om den efter att ha sett utfallet. Under den här arbetsdelningen
  är det **Bengt själv** skyddet gäller.

ÅTGÄRDAT I SAMMA VARV: alla nio tröskeldokuments ändringsstycken och husregelrader bytta från
"kräver båda signaturer" till ändringsdisciplinen, statusraderna från "väntar på kontrasignering"
till "klart att köra", och tavlans fyra 🔑-rader avblockerade. Historiska rader — vad som faktiskt
hände 11/9 och 12/9 — står kvar som historik. **Ett dokument som säger en sak medan ägarna gör en
annan är värre än inget dokument**, och det är samma glapp som lät fyra mätningar stå döda i fem
dygn medan tavlan sa att de kördes.

AVBLOCKERAT DIREKT: TROSKLAR-VIND-SIKT (#90), TROSKLAR-RIMFROST (#46),
TROSKLAR-SMHI-FORSTARKAREN (#95 d) och TROSKLAR-FRYSKLASSNINGEN (#103) väntar nu bara på Bengts
fastställande. §10-raden i OVERGANGAR om att Axel ska läsa §2.3 före första skuggkörningen är
nedgraderad från spärr till notis — han är underrättad, och mätningen är Bengts område.

AXELS MOTFÖRSLAG som därmed FALLER: versionering av signerade dokument, och ett tak på tre öppna
tröskeldokument. Båda var rimliga svar på en styrningsrisk — men risken var en följd av ceremonin,
inte av arbetet. Utan ceremonin finns ingen signatur som kan bli innehållslös.

## #133 (12/9 2026) Värdevakten — ett fält får inte bära en mätning innan det besiktats

BESLUT (Bengts order "bygg värdevakten för allt i arkivet och lägg till det som ett krav"):
`scripts/vardevakten.ts` + knapp, och en **husregel i CLAUDE.md**.

**SKÄLET, och det är en mönsterlista Axel satte ord på.** På ett dygn visade sig nio antaganden
vara fel eller datan smutsig — men fyra av dem var inte resonemangsfel alls, utan **samma defekt i
källan: ett fält vars värden innehåller koder som är typgiltiga men fysiskt omöjliga.**

| fält | såg ut som | var |
| :-- | :-- | :-- |
| `wind_gust_ms` | 85,5 m/s | trasig givare (rekordet ≈ 81, på fjällstation) |
| `visibility_m` | 20 000 m i hälften av raderna | **sentinel**, "minst 20 km" |
| molnmängd | 113 % | **kod** för himlen skymd |
| `precipitation` | "no" / "Dry" | strängar som betyder torrt |

Plus två äldre av samma sort: `SeverityCode 3` som aldrig förekommit, och `Camera.Bearing` som
pekar åt MOTSATT håll mot kursen den bevakar.

**INTE ETT ENDA AV DEM HITTADES AV EN VAKT.** Alla hittades av att en människa läste en utskrift,
och varje vakt vi har — #75, DRY-listan, G_tak — skrevs EFTER att samma defekt bitit oss. Det var
den systematiska luckan, och den här vakten är svaret.

**TRE KONTROLLER, och den tredje gör den till en grind:**
1. **Spannet** — ligger min/max inom det fysiskt rimliga? (85,5 m/s fastnar här)
2. **Dominans** — tar ett enda värde över 5 % i ett fält med ≥ 50 distinkta värden? Det är
   sentinelns signatur. (20 000 m fastnar här) Kodlistor som `condition_code` fälls INTE — de har
   för få distinkta värden, och att klass 1 är vanligast är legitimt.
3. **Deklarationen** — **ett fält utan deklarerat spann rapporteras som OBESIKTIGAT.**

**PUNKT 3 ÄR AVSIKTLIGT OBEKVÄM.** Ett nytt fält dyker upp som obesiktigat den dag det finns i
arkivet och står så tills någon skrivit ned vad det får innehålla. Och obesiktigat **slår** de
andra kontrollerna: ett fält vi inte vet något om friskförklaras inte av att dess tal råkar se
rimliga ut. Det är billigare att deklarera ett spann än att upptäcka en sentinel i en tröskel.

**SCHEMAT LÄSES UR DATABASEN**, inte ur en lista i skriptet — `information_schema.columns` över
arkivets tolv tabeller. Ett nytt fält är därmed med från dag ett utan att någon behöver komma ihåg
att lägga till det. Det är samma form som mätvaktens kadensläsning ur repot (#105) och
ruttberedskapens ruttläsning ur skuggmotorn (#124): **listan som ska vara komplett läses från
källan, inte från minnet.**

**HUSREGELN (CLAUDE.md):** ett fält får inte bära en mätning, en tröskel eller en varning förrän
det passerat värdevakten. Bygger man något nytt som ska mätas: deklarera spannet och kör knappen
INNAN fältet används i en grind.

**VAD DET BETYDER FÖR AXELS OMRÅDE:** motorn läser nio fält, och inget av de sentinelbärande
(vind, sikt, moln, daggpunkt) når den — de stannar i arkivet. Men **vind och sikt är nästa fält i
kön till motorn** (roll B i #90), och de är just de två som bär sentinelerna. Vakten står därmed
där den ska: mellan arkivet och motorn, före roll B byggs.

SJÄLVTESTET prövar alla fyra verkliga fallen plus att en kodlista inte fälls för dominans och att
ett odeklarerat fält är obesiktigat även när talen ser rimliga ut.

## #134 (12/9 2026) Värdevaktens första körning — en radarartefakt på 727 mm/h, och fyra falska larm av mina

BESLUT: värdevakten kördes (30 dygn, 31 numeriska fält i 12 tabeller) och skärptes omedelbart.
Den hittade en sak som gäller **i dag**, och den ropade vargen på fyra ställen där den inte borde.

**FYNDET SOM GÄLLER RADARDOMEN: `radar_precip.rate_max_mmh` går upp till 727,54 mm/h.**
Världens uppmätta extremintensiteter ligger kring 150–200 mm/h för en femminutersskur. **727 är
inte regn, det är en radarartefakt** — och det fältet bär hela vattenplaningsspåret sedan grind
V-A föll (#104). Tröskelsvepet i TROSKLAR-VATTENPLANING går på 0,1 · 0,5 · 2 mm/h, så artefakten
ligger långt ovanför varje kandidattröskel och påverkar sannolikt ingen dom — **men den har aldrig
varit besiktad, och den ligger i det fält domen i dag vilar på.** Spannet är nu deklarerat till
0–200 mm/h och fältet står som UTANFÖR SPANN tills någon tittat på de raderna.

**OCH SENTINELERNA FASTNADE, precis som de skulle:** `visibility_m` med takvärdet 20 000 i 49,5 %
av `weather_observations` och **89,4 % av `weather_latest`** — alltså nio av tio rader i den tabell
snapshoten byggs ur. `wind_gust_ms` max 85,5 m/s fälldes på spannet.

**MEN FYRA LARM VAR MINA EGNA, och regeln var för trubbig.** Första dominansregeln var "ett värde
över 5 % i ett fält med många distinkta värden". Den flaggade `rain_sum_mm` (0 i 58 %),
`snow_wateq_mm` (0 i 99,9 %), `wind_speed_ms` (0,5 i 6,8 %) och `shadow_log.n_hazards` (1 i 19 %).
**Noll nederbörd i september ÄR det vanligaste värdet. Det är inte en sentinel, det är väder.**

Den verkliga signaturen är smalare och nu inskriven: **en sentinel ligger vid TAKET och tar en
stor andel.** 20 000 m är maxvärdet. 113 % låg över taket. Ett dominerande MINIMUM är däremot
nästan alltid "ingenting hände", och ett sentinelvärde under golvet (−999 och liknande) fastnar på
spannkontrollen i stället. Regeln är därför: topp ≥ 20 % **och** toppvärdet = maxvärdet.

**En vakt som ropar varg på fyra av elva är sämre än ingen vakt** — det är hela produktens egen
lag tillämpad på vårt eget verktyg. De fyra fallen ligger nu som självtester, så regeln inte kan
glida tillbaka.

**IDENTIFIERARE FICK EN EGEN KATEGORI.** `id`, `event_id`, `area_id`, `warning_id` stod som
OBESIKTIGADE, vilket är fel sorts larm: de är inte mätvärden. De rapporteras nu som 🔖 ID — *inte
ett mätvärde, får inte bära en tröskel*. Att tiga om dem hade varit lika fel som att larma.

KVAR ATT DEKLARERA EFTER SKÄRPNINGEN: inga — `wind_dir_deg` och radarns två intensiteter fick
sina spann i samma varv.

## #135 (12/9 2026) Fyra tröskeldokument fastställda — och därmed står inget som utkast längre

BESLUT (Bengt, klartecken): **TROSKLAR-VIND-SIKT (#90), TROSKLAR-RIMFROST (#46),
TROSKLAR-SMHI-FORSTARKAREN (#95 d) och TROSKLAR-FRYSKLASSNINGEN (#103) är fastställda.**
Ingen kontrasignering — mätningen är Bengts område (#132).

**VAD FASTSTÄLLANDET FAKTISKT BETYDER, och det ska inte missförstås:** det är inte värdena som
sätts. Det är **svepen och kraven** som låses. Värdena faller ur grindarna — det är hela
konstruktionen, och skälet till att talen går att lita på efteråt. Från och med nu gäller varje
dokuments egen ändringsregim: fram till första skuggkörningen får svepet justeras med en rad i
DECISIONS, därefter inte alls.

**LÄGET EFTER DETTA: nio tröskeldokument, noll utkast.**

| Dokument | Grind | Vad som händer nu |
| :-- | :-- | :-- |
| **#103 FRYSKLASSNINGEN** | K-A | **kan köras på befintligt arkiv** — ingen ny data, ingen frost. Instrumentet är inte byggt. |
| **#46 RIMFROSTEN** | R-A | **kan köras på det FINSKA arkivet** — Lapplands septemberfrost, ingen svensk frost behövs. Instrumentet är inte byggt. |
| #90 VIND OCH SIKT | W-A | redan kört: OAVGJORT av strukturella skäl. Körs om efter **första höststormen** (#120). |
| #95 (d) FÖRSTÄRKAREN | F-A | redan kört: OAVGJORT, arkivet saknar vintervarningar (#122). |

**Två instrument blir alltså byggbara i dag och två grindar väntar på väder.** Det är första gången
sedan helgens början som kön inte innehåller en enda mänsklig signatur — allt som står stilla står
stilla på data eller på årstid.

**Och en sak värd att notera om formen:** K-A och R-A kan båda köras utan att vänta på svensk
vinter. K-A läser samma arkiv som grind A. R-A läser `KASTEPISTE` ur det finska arkivet, som
arkiverats sedan 4/9 och där Lapplands frostnätter kommer veckor före Sveriges. Det var inte en
slump utan ett val när dokumenten skrevs: **varje grind fick en väg till underlag som inte kräver
att man väntar på naturen, om en sådan väg alls fanns.**

## #136 (12/9 2026) Grind K-A och grind R-A byggda — de två som inte behöver vänta på naturen

BESLUT (Bengts order "bygg K-A och R-A"): `scripts/grind-k-a.ts` och `scripts/grind-r-a.ts`, båda
med knapp. Helt läsande, ingen motorkod, ingen röst.

**K-A — FRYSKLASSNINGEN (kort #103).** Axels fråga: kan en modell som är opålitlig på grader ändå
bära ett binärt påstående om vilken sida av noll ytan ligger?

Modellen är **grind A:s, inte en egen** — samma leave-one-out, samma konstanter, samma givarvakt,
och ett självtest som läser `publish/grind-a.ts` och fäller om de glidit isär.

**Den avgörande skillnaden mot grind A: här får modellen AVSTÅ.** Grind A tvingade den att svara i
varje punkt; en klassificerare får säga "vet inte" nära gränsen. Det gör den träffsäkrare på det
den uttalar sig om, och priset är täckning. Därför sveps K2 (osäkerhetszonen ±0 · 0,5 · 1,0 °C) och
därför har K-A **både** ett träffsäkerhetskrav och ett täckningskrav — en hög träffsäkerhet på en
tiondel av punkterna är inget resultat. Svepet är 3 × 3 × 3 = 27 kombinationer.

**K-A2 räknas åt rätt håll och det finns ett prov på det:** ett farligt fel är när modellen säger
"fryser inte" om en yta mätningen säger fryser. Det omvända är fel men inte farligt, och
självtestet skiljer dem.

**Och septembervakten:** K-A4 kräver ≥ 100 punkter med UPPMÄTT frys. Utan den kan ett
septemberunderlag ge 99 % rätt klass genom att alltid svara "fryser inte" — en klassificerare som
aldrig sett ett positivt fall är inte prövad. Det är den vakten som väntas hålla i dag.

**R-A — RIMFROSTEN (kort #46), på det FINSKA arkivet.** Dokumentets eget val (§5): `KASTEPISTE`
arkiveras sedan 4/9, och Lapplands septemberfrost ger äkta rimfrostnätter veckor före Sverige.
`--land=se` kör samma mätning här när frosten kommer.

**TIDSZONEN ÄR INTE EN DETALJ, och den hade tyst förstört fysikkontrollen.** `sample_time` är UTC,
men R-A3 frågar efter LOKAL tid: utstrålningskylningen bottnar strax före gryningen. Finland ligger
UTC+3 på sommartid, Sverige UTC+2. **Räknar man kl 03–07 i UTC mäter man fel timmar i fel land** —
och felet hade sett ut som ett fysikaliskt resultat. Frågan konverterar med `AT TIME ZONE`, och
zonen följer landet.

**Uthålligheten räknar SPANN, inte antal rader.** Finska arkivet har 30-minuterstakt, så R3 = 30 min
kräver två rader och 60 min kräver tre. Självtestet provar just det, plus att en lucka över 45
minuter bryter episoden (arkivdieten gör hålen, inte vädret).

**GIVARVAKTEN ÄR TREDELAD OCH SITTER I FRÅGAN:** #75:s vakt, daggpunktens egen (yta − dagg ≥ −5 °C)
och korsgivarkontrollen (RH ≥ 90 %). Skälet är kortets egna körningar 4/9 — 53 av 58 kandidater
från tre stationer, noll överlevande.

**R-A4 MOLNKONTROLLEN GÅR INTE ATT KÖRA PÅ FINSKA STATIONER, och skriptet säger det i stället för
att låtsas.** SMHI:s molnstationer är svenska. Att sträcka en molnobservation över Bottenviken och
kalla det en mätning vore precis det representativitetsfelet vi mätte oss fram till i går.

**Ett självtest fällde mig under bygget:** dominansprovet skrev "en station med 2 av 10 dominerar
inte" med bara två stationer i materialet — då bär den andra 80 % och provet blev meningslöst.
Rättat till spridda stationer, med det triviala fallet kvar som eget prov.

## #137 (12/9 2026) K-A och R-A körda — vakterna höll, och R-A fällde mig på ett tyst filter

**K-A (frysklassningen, kort #103): ⊘ INGEN DOM, och septembervakten är precis det som biter.**

| | |
| :-- | --: |
| Underlag | 709 stationer, 147 060 bucketade avläsningar |
| Mätpunkter (K3 = 15 km) | 210 över 16 stationer |
| **Punkter med UPPMÄTT frys** | **0** |

Kravet är ≥ 500 punkter över ≥ 20 stationer **och ≥ 100 punkter med uppmätt frys**. Talen i svepet
ser lysande ut — 99–100 % rätt klass, 0,0 % farliga fel i varje kombination — **och de betyder
ingenting.** Med noll frysande punkter säger modellen "fryser inte" varje gång och har rätt varje
gång. Det är exakt det septembervakten skrevs för att hindra, och det är första gången den biter.

**Att talen ser bra ut och ändå inte får läsas är hela poängen med en underlagsvakt.** Hade
dokumentet skrivits efter mätningen hade 99,5 % varit svårt att inte citera.

**R-A (rimfrosten, kort #46) på det finska arkivet: 0 rader efter vakten — och det var MITT fel.**

Första körningen svarade "⊘ OAVGJORT — inga rader överlever vakten" som om det vore ett
underlagsbesked. Det var det inte. **`ingest/fi.ts` hämtar TIE_1, ILMA, KASTEPISTE, SADE och
KELI_1 — men aldrig luftfuktighet.** Korsgivarkontrollen `humidity_pct >= 90` filtrerade därmed
bort **varje rad i arkivet**, och skriptet rapporterade det som ett resultat.

**Det är samma familj som `Boolean(precipitation)` och vinddatan före #84: ett villkor som tyst
filtrerar allt därför att fältet inte finns, presenterat som en mätning.** Att jag byggde det
samma dygn som värdevakten — vars hela poäng är att ett fält ska besiktas innan det bär något —
gör det värre, inte bättre.

RÄTTAT I SAMMA VARV, i tre delar:
1. **Vaktdiagnos före allt annat:** frågan räknar nu varje led för sig — hur många rader som bär
   yta+daggpunkt, luft, RH, och hur många som klarar #75:s respektive daggpunktens vakt.
   **En nolla kan aldrig mer vara tvetydig.**
2. **RH-ledet tas med bara när fältet finns**, och dess frånvaro skrivs ut i klartext.
3. **Grindutfallet blir OAVGJORT när ett vaktled inte går att utvärdera** — oavsett hur talen ser
   ut. Att köra vidare på två av tre led vore att mjuka upp en vakt §3 kallar undantagen från all
   lättnad, och talen redovisas därför som **FÖRHANDSBESKED**, aldrig som ett grindutfall.

**FÖLJDEN FÖR KORTET:** R-A kan inte köras vid full vaktstyrka på det finska arkivet. Antingen
hämtar ingest/fi.ts RH framåt — Fintraffic levererar det, fältet plockades bara aldrig upp — eller
så väntar R-A på svensk frost. Det är Bengts val, och det är billigare än det låter: RH ligger i
samma svar som de fält vi redan läser.

## #138 (12/9 2026) Luftfuktigheten in i den finska ingesten — noll kronor, och den verkar bara framåt

BESLUT (Bengts order efter kostnadsfrågan): `ingest/fi.ts` läser nu `ILMAN_KOSTEUS` och skriver den
till `humidity_pct` i både `fi.weather_latest` och `fi.weather_observations`.

**MÄTT FÖRE BESLUTET, inte gissat.** Jag hämtade Fintraffics stationssvar och räknade:

| | |
| :-- | --: |
| Stationer i svaret | 528 |
| **`ILMAN_KOSTEUS`** | **505 stationer** |
| `KASTEPISTE` | 505 stationer |
| Distinkta givarnamn i svaret | **131** |
| Givare vi läste | 6 |

**Luftfuktigheten ligger på exakt samma 505 stationer som daggpunkten, i samma svar vi redan
laddar ner var trettionde minut — och kastade på golvet.** Precis samma miss som KASTEPISTE var
den 4/9, och som svenska motorns oanvända `dewpoint_c` var dessförinnan.

KOSTNADEN, post för post: noll extra anrop, noll extra bytes (360 kB gzippat, fältet är redan med),
**ingen migration** (`fi.weather_observations` skapades `LIKE public.weather_observations INCLUDING
ALL`, så kolumnen fanns redan och stod tom), noll Actions-minuter, storleksordningen 0,15 MB/dygn,
tre rader kod.

**DEN VERKAR BARA FRAMÅT, och det är hela skälet att göra den i dag.** Rader som redan skrivits
förblir tomma. R-A vid full vaktstyrka behöver alltså finska frostnätter som kommer EFTER den här
ändringen — och Lapplands frost kommer om veckor, inte månader. Samma logik som `sql/015` i går:
det som inte hämtas när det händer finns inte sedan.

BIFYND SOM INTE SKA GLÖMMAS: **131 givarnamn i svaret, sex som vi läser.** Det är ingen kritik —
arkivdieten och gratisnivån är verkliga skäl — men den finska källan är mycket rikare än vad vi tar
ur den. Behöver ett framtida kort ett finskt fält ligger det sannolikt redan i svaret, och kostar
noll att plocka upp. Det är tredje gången på nio dygn vi hittar ett användbart fält på golvet.

BEVISET ÄR EN RAD, INTE EN COMMIT: `fi: … daggpunkt N st, luftfuktighet N st, …` i nästa timkörning.
Utan den raden är fältet inte skrivet, oavsett vad koden säger (kort #73:s läxa).

## #139 (12/9 2026) Typkastet som inte flyttade med — och ett rött bygge som jag mergade ändå

TVÅ FEL, båda mina, och det andra är värre än det första.

**FEL 1 — DEN POSITIONELLA FÄLLAN.** `FI_SELECT` bygger raderna med `UNNEST($1::text[], $2::text[],
…)`, och **typkasten är positionella**. När `humidity_pct` lades in som kolumn 9 (#138) sköts
`precipitation` till $10 och de två boolean-fälten till $11/$12 — men jag la bara till `$21` i
slutet och lät casten ligga kvar. **$9 kastades alltså som `text[]` och fick ett tal, $10 som
`bool[]` och fick en sträng.**

CI fällde det direkt — integrationstestet kör mot riktig PostGIS och skriver en finsk rad. Vakten
fungerade exakt som den skulle.

**LÄXAN, och den gäller varje sådan lista i repot:** en ny kolumn mitt i en UNNEST-lista flyttar
**alla efterföljande typer**, inte bara antalet parametrar. Det syns inte i en diff — raden med
casten ligger tre rader bort från raden med kolumnnamnen. Rättat, och kontrollerat kolumn för
kolumn: 21 kast, 21 kolumner, alla i rätt ordning.

**FEL 2, OCH DET ÄR DET ALLVARLIGA — JAG MERGADE ETT RÖTT BYGGE.** Mitt kommando kedjade
`vänta på CI → merga` utan att pröva utfallet. CI skrev `test failure` och merge-steget körde ändå.
PR #188 gick in i main med en trasig ingest.

Det är precis den sorts tyst genomgång huset har regler mot: **en grön körning är beviset, inte en
grön känsla** (nyckelrotationens läxa 31/8). Att jag byggde marginalvakten och värdevakten samma
dygn gör det sämre, inte bättre — jag automatiserade bort exakt den kontroll jag skrev regler om.

**FÖLJDEN I DRIFT:** ingesten kör timvis, så fönstret mellan den trasiga mergen och den här
rättelsen är som mest en körning. Den körningen skulle ha fallit på typfelet och gett ett rött jobb
— alltså bortfall, inte tyst felskrivning. Inga felaktiga rader kan ha skrivits: PostgreSQL
förkastar hela satsen, den skriver inte halva.

**REGEL FRAMÅT:** merge-steget ska läsa CI:s slutsats och avbryta på annat än `success`. Att kedjan
är bekväm är inget skäl — det var bekvämligheten som orsakade felet.

## #140 (12/9 2026) Latest-tabellens lucka — tredje gången samma fälla, och nu står regeln skriven

BESLUT: `sql/016_fi_humidity_latest.sql`, inlagd i automigreringen i `ingest/fi.ts` och i
integrationstestets schemalista.

**CI:s andra röda körning avslöjade den verkliga orsaken**, och det var inte typkasten (#139) utan
något strukturellt:

```
column "humidity_pct" of relation "weather_latest" does not exist   (42703)
```

**`public.weather_observations` har TIO fält. `public.weather_latest` har NIO** — den saknar både
`dewpoint_c` och `humidity_pct`. Grannschemana skapas med `LIKE public.… INCLUDING ALL`, så
**varje granntabell ärver luckan**. Lägger man till ett fält i arkivvägen fungerar det direkt, och
nulägesvägen faller på 42703 först när koden körs.

**DET HAR NU HÄNT TRE GÅNGER:**

| | |
| :-- | :-- |
| `sql/010` | fi.weather_latest saknade `dewpoint_c` — körning #24 föll på 42703 |
| `sql/013` | no.weather_latest saknade `humidity_pct` — migrationens egen kommentar: *"samma fälla som fi (010)"* |
| `sql/016` | fi.weather_latest saknade `humidity_pct` — CI föll på 42703, igen |

Norges migration **namnger fällan i sin egen kommentar** och den fångade mig ändå. Det är inte
slarv i stunden — det är att luckan är osynlig i den fil man redigerar. Man skriver i `fi.ts`, och
felet ligger i en tabell som skapades av ett annat skript i augusti.

**REGELN, skriven i migrationen så att nästa person läser den på rätt ställe:** ett nytt väderfält
kräver **två kolumner, inte en** — arkivet och nuläget. Kontrollera latest-tabellen INNAN koden
skrivs, inte efter att CI fällt den.

**OCH DET HÄR ÄR VAD SOM RÄDDADE OSS:** integrationstestet kör mot riktig PostGIS och skriver en
finsk rad. Utan det hade felet nått drift och visat sig som ett rött timjobb — eller värre, som
tysta bortfall om satsen hade delvis lyckats. Den vakten är från augusti och har nu betalat sig
tre gånger.

## #141 (12/9 2026) Vaktdiagnosen i varje grind — en nolla ska aldrig vara tvetydig

BESLUT (Bengts order "för in vaktdiagnosen överallt"): `publish/vaktdiagnos.ts`, delad av alla sju
grindar — A, V-A, T-A, K-A, R-A, W-A och F-A.

**DEN FÖDDES UR ETT AV MINA EGNA FEL, och det ska stå.** Grind R-A svarade "0 rader överlever
vakten — OAVGJORT" som om det vore ett underlagsbesked. Det var det inte: `ingest/fi.ts` hämtade
aldrig luftfuktighet, så korsgivarkontrollen filtrerade bort **varje rad i arkivet**. Ett villkor
som tyst filtrerar allt därför att fältet inte finns, presenterat som en mätning.

**TRE SVAR SOM SÅG LIKADANA UT OCH INTE ÄR DET:**

| Utfall | Vad det betyder | Vad grinden ska göra |
| :-- | :-- | :-- |
| **SAKNAS** | fältet finns inte i arkivet | **OAVGJORT** — ledet går inte att utvärdera |
| **FÄLLER ALLT** | fältet finns, ingen rad klarar villkoret | det **ÄR** ett mätresultat |
| SLÄPPER | rader klarar | normalfallet |

Skillnaden mellan de två första är hela skillnaden mellan att veta något och att tro att man gör
det. Varje grind räknar nu sina vaktled **för sig, före allt annat**, och `garAttUtvardera()`
gatar domen: ett enda ouvärderbart led räcker för att svara OAVGJORT.

**VAD VARJE GRIND NU DIAGNOSTISERAR:**

| Grind | Vaktled |
| :-- | :-- |
| A, K-A | yttemperatur · #75:s två led (+ K-A: vintertimme ≤ 5 °C) |
| V-A | regnmängd finns · regn > 0 någon gång |
| T-A | #75:s två led · #46:s daggpunktsled (finns / yta − dagg ≥ −5) |
| R-A | de tre ovan **plus korsgivaren RH ≥ 90** — den som fällde mig |
| W-A | byvind · sikt · **sikt under taket 20 000 m** · lufttemperatur |
| F-A | #75:s två led · nederbördsklassen bakom fukten |

**W-A:s tredje led är värt att peka på:** "sikt under taket 20 000 m" gör sentinelen till ett
vaktled i stället för en fotnot. Blir den 100 % en dag bär arkivet bara tak, och grinden säger det
själv i stället för att någon ska läsa en fördelning för hand.

**MÖNSTRET, för tredje gången i dag:** listan som ska vara komplett läses från källan, inte från
minnet — mätvaktens kadens ur repot (#105), ruttberedskapens rutter ur skuggmotorn (#124),
värdevaktens schema ur databasen (#133). Vaktdiagnosen är samma sak för vaktleden: de deklareras
bredvid frågan de hör till, och räknas av databasen.

## #142 (12/9 2026) Vaktdiagnosens egen barnsjukdom — och varför den fick ett klartextfel

Första skarpa körningen av den delade vaktdiagnosen föll: `bind message supplies 1 parameters, but
prepared statement "" requires 0` (08P01). Orsaken var min egen anropsrad i R-A — fönstret
interpolerar `${DAGAR}` direkt, så frågan har **noll platshållare**, men jag skickade ändå med
`[DAGAR]`.

Ett trivialt fel, men **Postgres svar säger ingenting om vad man gjorde fel**, och nästa person
skulle ha letat i frågebyggaren. Modulen kastar därför nu i stället:

> `vaktdiagnos: frågan har inga platshållare men 1 parametrar skickades — fönstret interpolerar
> troligen värdet direkt.`

**Och det är värt en rad om varför vakterna inte fångade det:** självtesterna kör utan databas, så
ett anropsfel mot pg kan bara upptäckas skarpt. Det är inte ett hål att täppa med fler självtest —
det är skälet till att varje ny mätning körs som knapp direkt efter merge, i stället för att antas
fungera. Den vanan fångade det här inom en minut.

## #143 (12/9 2026) Molnet blir delat, R-A4 byggs för svensk frost — och frostlarmet namnger alla fyra

BESLUT (Bengt: "vi mäter inte bara mot Finland utan även mot Sverige när det kommer frost"):

**1. MOLNET FLYTTAR TILL `publish/moln.ts`.** Fysikkontrollen "träffarna ska vara vanligast klara
nätter" behövs i BÅDE grind T-A (#88) och grind R-A (#46) — utstrålningskylning är samma fysik i
båda. Den byggdes i T-A 12/9 (#115); att kopiera den till R-A hade varit precis den drift vi vaktat
mot hela dygnet. T-A läser nu ur modulen i stället för ur sina egna kopior, och dess självtest
täcker fortfarande sentinelen 113 % (himlen skymd) och octas-skalan.

**2. R-A4 ÄR BYGGD, INTE BARA BESKRIVEN.** `--land=se` kör nu molnkontrollen på riktigt: klara
nätter ska fyra minst **dubbelt** så ofta som mulna (§4), med minst fem nätter i varje klass innan
kvoten alls räknas. Tidigare stod det bara en notis om att den "kopplas in senare" — en notis är
inte en mätning.

**DEN FINSKA KÖRNINGEN ÄR ETT FÖRHANDSBESKED, DEN SVENSKA ÄR DOMEN.** Två skäl, och båda är
arkivets, inte valets:
* **R-A4 går inte att köra finskt.** SMHI:s molnstationer är svenska. Att sträcka en molnobservation
  över Bottenviken vore precis det representativitetsfel §2.8 mätte bort.
* **Korsgivarkontrollen fanns inte finskt** förrän i dag (#138), och den verkar bara framåt.

Finland ger däremot något Sverige inte kan: **frostnätter veckor tidigare**. Rollerna är alltså
tydliga — Finland provar instrumentet och ger tidiga signaler, Sverige fäller domen.

**3. FROSTLARMET NAMNGER NU ALLA FYRA MÄTNINGAR.** Vakthundens check 5 sa tidigare "kör steg 0" och
nämnde #88 i en bisats. Fyra mätningar väntar på exakt samma nätter och **ingen av dem kan ta dem
ikapp**:

| # | Knapp | Kort | Vad som kräver just de nätterna |
| :-- | :-- | :-- | :-- |
| 1 | `overgangar-steg0` `dagar=7` | #89 | gallringen äter minutupplösningen efter sju dygn |
| 2 | `grind-t-a` | #88 | ≥ 30 frostnätter på ≥ 20 stationer |
| 3 | `grind-r-a` `land=se` | #46 | enda körningen som kan köra R-A4 |
| 4 | `grind-k-a` | #103 | septembervakten kräver ≥ 100 punkter med UPPMÄTT frys — har haft noll |

**Ett larm som namnger en av fyra mätningar är ett larm som tappar tre.** Att #88 låg i en bisats
var precis den sortens glapp som lät fyra mätningar stå döda i fem dygn.

## #144 (12/9 2026) Kontraktsgrinden — sjutton kopior av samma tröskel, noll vakter

**Beslut:** `scripts/kontraktsgrinden.ts` byggd och inlagd som eget CI-steg före `npm test`.
Den läser repots spårade filer ur `git ls-files`, letar upp varje förekomst av en deklarerad
FORM, plockar ut VÄRDET och fäller om kopiorna inte bär samma värde — eller om antalet sjunkit
under det uppmätta golvet.

**Hålet den stänger.** #75:s givarvakt (`surface_temp_c >= air_temp_c - 12`) står ordagrant på
**sjutton ställen i tolv filer** och hade ingen vakt alls. Varje kopia sitter i en mätning som
lämnar en DOM. Ändras 12 till 10 i en av dem mäter grindarna olika populationer *tyst*: samma
arkiv, olika svar, ingen som märker det. Det är inte en hypotes — CLAUDE.md:s TradingOS-avsnitt
beskriver exakt samma fälla två gånger, där en tröskeländring inte följdes av en fullständig grep
och fem ytterligare ställen hittades först veckor senare.

**Uppmätt i dag — alla fem kontrakt håller redan:**

| Kontrakt | Förekomster | Filer | Värde |
| :-- | --: | --: | :-- |
| #75 givarvakten (`yta >= luft − N`) | 17 | 12 | 12 |
| Fukten (TS-mängd + SQL-lista) | 6 | 4 | `dry\|no` |
| Takten (`BUCKET_S`) | 7 | 7 | 1800 |
| Ankarradien (`MAX_KM`) | 5 | 5 | 50 |
| Grannantalet (`K_NEIGHBOURS`) | 5 | 5 | 5 |

**Fuktkontraktet är det som bär mest.** Det är deklarerat i två språk — en TypeScript-mängd
(`DRY = new Set(["no","dry"])`) och en SQL-lista (`lower(precipitation) NOT IN ('no','dry')`) —
och normaliseras som MÄNGD, inte som text, så att ordning och versaler inte spelar roll. Det gör
grinden till den enda kontroll vi har som jämför över språkgränsen.

**Bevisat, inte påstått.** Självtestet kör fem fall mot känd sanning utan disk: samstämmiga
kopior håller, en drivande kopia fäller *och pekas ut vid namn*, en försvunnen kopia fäller på
golvet trots att de kvarvarande är eniga, samma ordlista i två språk normaliseras lika, och en
SQL-lista som tappat ett ord fäller. Därefter två mutationsprov mot det riktiga repot:

* `grind-t-a.ts` ändrad 12 → 10 ⇒ exitkod 1, `värde "12" — 16 st` mot `värde "10" — 1 st`,
  avvikaren utpekad på `scripts/grind-t-a.ts:190`.
* `overgangar-steg0.ts` SQL-listan tappar `'dry'` ⇒ exitkod 1 — och **drift inuti EN fil**,
  mellan TypeScript-definitionen på rad 42 och SQL-frågan på rad 48. Det är precis den klassen
  av fel som tyst dödade grind R-A (#141).

**Två avsiktliga olikheter vaktas INTE, och skälet står i filens huvud:**

1. **Nollpolitiken.** Motorn (`snapshot-core`, `publicera`) skriver
   `(air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)` — rader utan lufttemperatur
   släpps igenom. Grindarna kräver `air_temp_c IS NOT NULL AND ...`. Motorn publicerar alltså
   en något större population än grindarna mäter. **Talet** är kontraktet; nollpolitiken är ett
   medvetet val på varje sida.
2. **`MIN_SHARED`.** `cell-matning.ts` kör 10 där grind A kör 20, för ett annat syfte än
   leave-one-out. Ett kontrakt med en legitim avvikare är inget kontrakt — att vakta det ändå
   vore att bygga en vakt som ropar varg.

**Golvet är inte en formalitet.** En kopia som försvinner är lika tyst som en som ändras. Sjunker
antalet fäller grinden, och felmeddelandet säger uttryckligen: är borttagningen avsiktlig, sänk
golvet i samma commit — så att den blir ett beslut och inte ett slarv.

**Alternativet som valdes bort:** att refaktorera de sjutton kopiorna till en delad modul. Bengts
invändning höll: mätningarna i de olika -A är riktiga och korrekta, 80–90 % av mätningarna är
redan byggda, och en refaktorering skulle röra fungerande kod för att stänga ett hål som en
läsande kontroll stänger lika bra. Grinden rör ingen kod — den läser.

**Vad den INTE bevisar:** bara deklarerade kontrakt vaktas. Grinden är ett skyddsnät MELLAN
ändringstillfällena, inte en ersättning för en fullständig grep när en tröskel faktiskt ändras.

## #145 (12/9 2026) CRLF-glappet stängt — två kontroller som aldrig kunde köras före push

**Beslut:** `.gitattributes` med `* text=auto eol=lf` (plus `*.bat`/`*.cmd` som `eol=crlf`).
Radslut bestäms nu av REPOT, inte av varje maskins git-installation.

**Glappet.** `bundle-skuggmotor --check` och `bundle-publicera --check` **föll alltid** lokalt på
Windows och gick **alltid** igenom i CI. Orsaken var inte koden: git lagrar varje blob med LF,
men Git for Windows sätter `core.autocrlf=true` i sin SYSTEM-config
(`C:/Program Files/Git/etc/gitconfig`) utan att fråga, så arbetsträdet fick CRLF. Generatorn
skriver LF, filen på disk bar CRLF, jämförelsen sa "matchar inte källorna".

Följden: **de två kontrollerna kunde aldrig användas som förkontroll.** En verklig buntdrift —
precis den som lät skuggmotorn köra ett dygn på gammal motor efter #28 — hade bara kunnat fångas
efter push, aldrig före. En vakt som alltid ropar varg är en vakt ingen längre läser.

**Uppmätt före:** 364 av 411 spårade textfiler bar CRLF lokalt; varje blob i git bar LF. Inställningen
fanns varken i repots eller användarens git-config — bara i systemets, alltså osynlig och olika på
varje dator.

**Vad ändringen rörde, mätt fil för fil mot fingeravtryck tagna före:**

| | Antal |
| :-- | --: |
| Filer totalt | 909 |
| Oförändrade | 546 |
| Ändrade — **bara radslut** | 363 |
| Ändrade på annat sätt | **0** |
| Binära filer som rörts | **0** |
| Filer som saknas efteråt | **0** |
| Bär fortfarande CRLF | 1 (`android/gradlew.bat`, avsett) |

**Noll blobbar i historiken ändrades.** `git status` visade efteråt bara `?? .gitattributes`. Det
är hela poängen: med `text=auto` är en CRLF-fil *likvärdig* med LF-bloben, så git ser aldrig någon
skillnad — vilket också är varför `git checkout-index -a -f` inte rörde någonting och filerna fick
materialiseras om (raderas ur arbetsträdet och hämtas tillbaka ur git).

**Bevis efteråt:** `bundle-skuggmotor --check` = "skuggmotor/index.ts i synk", `bundle-publicera
--check` = "publicera/index.ts i synk", kontraktsgrindens självtest OK, `npm test` 57 tester
52 gröna 0 fel (5 hoppade, DB-beroende).

**Slutbeviset är en FÄRSK KLON på samma maskin**, med samma system-config som skapade problemet:

| | Före | Efter (färsk klon) |
| :-- | --: | --: |
| Textfiler med rena LF | 47 | **411** |
| Textfiler med CRLF | 364 | **1** (`android/gradlew.bat`) |
| Binära | 498 | 498 |
| `bundle-skuggmotor --check` | föll | **i synk** |
| `bundle-publicera --check` | föll | **i synk** |
| `git status` i klonen | — | rent |

**Undantaget.** `android/gradlew.bat` behåller CRLF; cmd.exe vill ha det. `android/gradlew` (skalet
som CI kör) är och förblir LF.

**Bifynd som inte åtgärdats här:** 26 av de 363 renormaliserade filerna ligger under
`ios/HalkvaktEngine/.build/` — spårade Swift-byggartefakter. Bara lokala radslut ändrades, deras
blobbar är orörda, och de är döda Linux-artefakter. Att de är spårade över huvud taget är ett eget
kort (se TAVLA): **504 filer, 27,6 MB**, och `.gitignore` täcker `android/build/` men inte Swifts
`.build/`.

## #147 (12/9 2026) Beroendekartan — bedömningen kan aldrig bli bättre än listan den bedöms mot

**Beslut:** `scripts/beroendekartan.ts` byggd och inlagd som eget CI-steg. Den läser varje extern
värd ur spårad kod, jämför med en deklarerad karta, och **fäller om koden hämtar från något som
inte står i kartan**. Helt läsande.

**Frågan bakom** är Bengts, 12/9: *"har vi något system som tar hand om uppdateringar från vägverket,
smhi och alla andra som vi hämtar uppgifter från"* — och sedan: *"kan man bygga det så att all ny
information processas maskinellt och man får en bedömning av en nyhet."*

Svaret på första frågan är ja: källvakten (#31, `scripts/trv-bevakning.ts`, cron måndagar 06:40)
bevakar sju källor med bevisad larmväg källa → issue → notis. **Men listan valdes när issue #2
skrevs, i augusti.** Sedan dess har radar, moln, Finland, Norge, Danmark och polisen tillkommit,
och listan följde inte med. Det är samma husregel som mätvakten (#105), ruttberedskapen (#124),
värdevakten (#133) och kontraktsgrinden (#144): **listan som ska vara komplett läses från källan,
inte från minnet.**

**Uppmätt: 23 externa värdar i koden, 9 av dem produktionsberoenden.**

| Roll | Antal | Bevakade |
| :-- | --: | --: |
| Produktion — matar motorn, arkivet eller en grind | 9 | **1** |
| Signalkälla — annonserar ändringar i ett produktionsberoende | 3 | 3 |
| Verktyg — bara mätskript och rekognosering | 7 | 0 |
| Omvärld — vi hämtar inga data därifrån | 3 | 3 |
| Bygg — byggkedjan, inte data | 1 | 0 |

**Gapet, med vad som brister:**

| Obevakat produktionsberoende | Vad som brister |
| :-- | :-- |
| `opendata-download-warnings.smhi.se` | varningsarkivet och grind F-A:s hela underlag |
| `opendata-download-radar.smhi.se` | radardomen och en av tre proxies i #89 (a) |
| `opendata-download-metobs.smhi.se` | grind R-A4 och grind T-A:s molnkontroll |
| `tie.digitraffic.fi` | gränssnapshoten mot Finland och grind R-A `--land=fi` |
| `datex-…vegvesen.no` | gränssnapshoten mot Norge |
| `opendataapi.dmi.dk` + `storage.googleapis.com` | dk-arkivet |
| `polisen.se` | viltvarningarna (varningsslag A4) |

**Två fynd som kartan tvingade fram:**

1. **SMHI-täckningen är indirekt och OPRÖVAD.** Källvakten bevakar `opendata.smhi.se` — SMHI:s
   dokumentationssajt. Vi hämtar från tre helt andra värdar (`opendata-download-warnings`,
   `-radar`, `-metobs`). Ingen har prövat om en ändring i nedladdnings-API:erna ens syns i den
   sitemapen. Att kalla SMHI "bevakat" var en tro, inte en mätning.
2. **Tre av de sju bevakade är omvärld, inte beroenden** (halkvarning, klimator, met.no). Ett larm
   om att en konkurrent bytt framsida är inte värdelöst, men det är inte samma sak som att veta
   att DMI byter API-version.

**Bevisat:** självtest mot känd sanning utan nät (ny värd fångas, borttagen rapporteras utan att
fälla, egen infrastruktur ignoreras, gapet räknas bara i produktionsledet, varje produktionsrad
måste säga vad som brister). Plus mutationsprov mot riktiga repot: en påhittad värd i
`smhi-tackning.ts` gav exit 1 med värden utpekad; återställd gav 0.

**Vad kartan INTE gör:** den bedömer ingen nyhet. Den är underlaget en sådan bedömning måste slå
upp i — steget före, inte steget självt. Och där `signal`-kolumnen säger OKÄND har ingen letat
ännu; det är ärligare än att gissa en feed som inte finns.

## #148 (12/9 2026) Källvakten breddad — sex nya källor, och SMHI bevakades på fel sida

**Beslut:** `scripts/trv-bevakning.ts` utökad från sju till **tretton källor**. Efter breddningen
täcker källvakten **9 av 9 produktionsberoenden** (beroendekartan #147 mätte 1 av 9).

**De sex nya, var och en uppmätt före inkoppling:**

| Källa | Signal | Typ | Uppmätt |
| :-- | :-- | :-- | :-- |
| `smhi-uppdateringar` | `www.smhi.se/rss/uppdateringar-oppna-data-fran-smhi` | RSS | 7 poster, 18/1 2024 → 28/5 2026 |
| `fi-digitraffic` | `digitraffic.fi/en/news/` | hash | 20 857 tecken, stabil |
| `no-vegvesen` | vegvesen.no `…/hva-er-datex/informasjon-og-nyheter/` | hash | 1 364 tecken, stabil |
| `dk-dmi` | `www.dmi.dk/frie-data` | hash | 3 980 tecken, stabil |
| `polisen-regler` | polisen.se `…/regler-for-oppna-data/` | hash | 5 318 tecken, stabil |
| `polisen-api` | polisen.se `…/api-over-polisens-handelser/` | hash | 4 327 tecken, stabil |

Varje hash-kandidat hämtades **två gånger före inkoppling** och jämfördes efter sifferstrippning;
samtliga gav identisk hash. En instabil sida hade blivit en vakt som säger "INSTABIL" varje vecka,
alltså ingen vakt alls.

**FYND 1 — SMHI bevakades på fel sida, och det var en tro, inte en mätning.** Källvakten bevakade
`opendata.smhi.se/sitemap.xml`. Det är SMHI:s **dokumentationssajt**. Våra tre SMHI-värdar
(varningar, radar, metobs) får sina ändringar annonserade på **www.smhi.se**, som har en egen
RSS för öppna data. **Ingen av feedens sju poster har någonsin kunnat synas i den sitemapen.**

De tre senaste posterna lästes för hand: *Nytt API för meteorologiska analyser* (28/5 2026),
*API för PMP3 avvecklas 31 mars* (16/3 2026) och *Nya API:er för meteorologiska prognoser och
analyser* (12/9 2025). Alla tre rör **prognoser och analyser** — PMP3gv2 och Mesan2gv1, avvecklade
31 mars 2026. **Ingen av dem rör metobs, radar eller varningar.** Vi var alltså inte drabbade —
men vi hade inte vetat om vi varit det.

**FYND 2 — DMI:s dokumentation har flyttat, och den gamla är helt borta.**
`opendatadocs.dmi.govcloud.dk` svarar **404 på varje sökväg** och `dmiapi.govcloud.dk` svarar 503.
Gamla API-värden `dmigw.govcloud.dk` pensionerades 30/6 2026; nya `opendataapi.dmi.dk` kom
2/12 2025. Vår `ingest/dk.ts` skrevs **31/8 2026 — efter pensioneringen** — och pekar på den nya
värden, som svarar 200. Vi klarade alltså en migrering vi inte bevakade genom att komma in efteråt,
inte genom skicklighet. Den nya adressen står i DMI:s eget API-rotsvar:
*"Please visit us at https://www.dmi.dk/frie-data"*.

**FYND 3 — user-agent saknades i källvaktens egna hämtningar.** Polisens villkor för öppna data
kräver en user-agent som namnger appen; saknas den kan svaret bli 403 eller blockeras. `fetchText`
skickade bara `Accept`. Rättat för alla källor. (Ingesterna själva var redan rätt: `polisen.ts`
skickar User-Agent och `fi.ts` skickar `Digitraffic-User`, som Fintraffic kräver sedan 3/12 2024
för att slippa strypning med 429.)

**FYND 4 — beroendekartan fällde sitt eget bygge, direkt.** När de sex källorna lagts in fällde
`beroendekartan.ts` på fyra odeklarerade värdar: `www.smhi.se`, `www.digitraffic.fi`,
`www.vegvesen.no`, `www.dmi.dk`. Signalkällor är också beroenden. Driftvakten från #147 gjorde
sitt jobb på sin första riktiga användning, och mot mitt eget arbete.

**Metodval:** RSS-parsern generaliserades (`rss(url)`) i stället för att kopieras — SMHI:s feed
behöver exakt samma parsning som Trafikverkets, och en andra kopia hade varit ett nytt kontrakt
utan vakt (#144). Digitraffics egen `api-changes`-sida valdes BORT: den är JS-renderad och ger
bara 1 694 tecken skal. Nyhetssidan är den sturdiest access path som finns, samma princip som
när smhi-sitemapen valdes framför Docusaurus-skalet.

**Vad breddningen INTE bevisar:** bara Trafikverkets larmväg har fyrat skarpt (#31, tre gånger
3/9). De sex nya är uppmätta som **stabila och läsbara**, inte som **bevisat larmande**. Beviset
kommer med första äkta ändringen. Och ingen av dem är en maskinell BEDÖMNING — larmtexten säger
fortfarande "Bedöm: rör det våra källor/ingest?". Det ledet är kvar att bygga.

**Kvarstår, eget beslut:** filen heter `trv-bevakning.ts` men vakten är inte längre
trafikverksspecifik. Omdöpning rör workflow, statefil och kortreferenser och görs inte som
sidoeffekt.

## #149 (12/9 2026) Nyhetsbedömningen — larmet svarar på frågan i stället för att ställa den

**Beslut:** `publish/nyhetsbedomning.ts` byggd och inkopplad i källvakten. Varje larm slår nu upp
sin källa i beroendekartan, matchar nyhetens text mot radernas nyckelord och skriver **vad som
brister**. Rubriken bär domen: 🔴 RÖR OSS · 🟡 VET INTE · ⚪ RÖR OSS INTE.

**Frågan, ordagrant (Bengt 12/9):** *"kan man bygga det så att all ny information processas
maskinellt och man får en bedömning av en nyhet. Det här kan komma att påverka det och det, och
att en människa, jag eller Axel, bara säger ok."*

Före det här löd larmtexten: *"Bedöm: rör det våra källor/ingest? Stäng när läst."* Hela
bedömningen låg på läsaren.

**TRE REGLER som står i modulens huvud och som inte får brytas:**

1. **Bedömningen fäller aldrig ett larm.** Samma issue, samma mottagare, samma frekvens — en rad
   text ovanför posten, aldrig ett filter. En tyst felbedömning vore långt värre än en läst rad
   för mycket. "Silence is a feature" gäller våra egna varningar; här är tystnaden inte vår utan
   källans.
2. **"RÖR OSS INTE" kräver POSITIVT BEVIS.** Att inga av våra nyckelord finns räcker inte — då
   blir svaret VET INTE. Först när posten matchar ett **främmande** ord (något kanalen skriver om
   som vi bevisligen inte hämtar) får den säga att den inte rör oss. Frånvaro av bevis är inte
   bevis om frånvaro.
3. **Utan text finns ingen bedömning.** En hash-källa som ändrats vet bara ATT något ändrats.
   Därför sparas nu den normaliserade texten i state, så att nästa ändring kan **diffas** och
   bedömas på innehåll. Utan diffen hade åtta av tretton källor alltid blivit VET INTE.

**Bevisat mot verkliga poster, inte bara påhittade.** 18 tester, varav fem kör ordagranna poster
ur SMHI:s och Trafikverkets flöden lästa 12/9:

| Verklig post | Dom | Varför |
| :-- | :-- | :-- |
| SMHI 16/3 2026 "API för PMP3 avvecklas 31 mars" | ⚪ RÖR OSS INTE | PMP3 är prognos, inte vårt |
| SMHI 28/5 2026 "Nytt API för meteorologiska analyser" | ⚪ RÖR OSS INTE | analys, inte observation |
| SMHI 12/9 2025 "Nya API:er för prognoser och analyser" | ⚪ RÖR OSS INTE | samma |
| SMHI 11/2 2025 "Uppdaterad portal för API-dokumentation" | 🟡 VET INTE | inga ord åt något håll — **regel 2** |
| TRV 19/5 2026 "Ny version av BanInfo" | ⚪ RÖR OSS INTE | järnväg |

Den fjärde raden är den viktiga: den hade varit lätt att klassa som ointressant, och bedömningen
vägrar. Skarp provkörning gav samma svar på BanInfo-posten i verkligheten som i testet.

**Strukturen flyttades för att bedömningen skulle bli möjlig.** Kartan låg i
`scripts/beroendekartan.ts`, ett skript med toppnivåkod — en import hade kört hela den skarpa
körningen och avslutat processen. Den bor nu i `publish/beroenden.ts` som ren modul, läst av två
saker: driftvakten och bedömningen. Samma mönster som `publish/marginal.ts`, `vaktdiagnos.ts`
och `moln.ts`.

**Två driftvakter tillkom på köpet:**

* **Trafikverkets objekttyper** i kartan jämförs mot vad koden faktiskt frågar efter
  (`git grep objecttype`). Vakten fällde direkt på sitt eget bygge: mönstret utan citationstecken
  matchade även typdeklarationen `objecttype: string` och plockade ut **"tring"**. Rättat till att
  bara citerade värden räknas.
* **Varje produktionsrad måste bära nyckelord.** En rad utan dem kan aldrig bedömas, och skulle
  tyst bli VET INTE för alltid.

**Vad den INTE gör, och det ska stå i klartext:** den matchar **ord**, den förstår ingenting. En
post som beskriver en brytande ändring med andra ord än de deklarerade blir 🟡 VET INTE — inte
grön. Och den genomför ingenting automatiskt: Bengts mening slutade *"…så genomförs uppdateringen
i systemet automatiskt"*, och det steget är medvetet inte byggt. Att låta en nyhetstext utlösa en
kodändring utan att en människa läst diffen är inte samma sak som att säga ok till en bedömning.

### #149 b (12/9 2026) Kalibreringen — torrkörningen mot 31 verkliga poster hittade två fel i mitt eget bygge

Innan bedömningen mergades kördes den mot **alla poster som redan ligger i flödena**: Trafikverkets
24 och SMHI:s 7. Två fel föll ut, båda mina egna.

**FEL 1 — två falska röda, båda på ett nyckelord som matchade kanalens NAMN.** `"öppna data"` låg
i Trafikverkets produktionsrad. Det gjorde att *"Välkommen på Trafikverkets webbinarie för
användare av öppna data"* och *"Nu är det lättare att söka efter Trafikverkets Öppna data"* båda
blev 🔴 RÖR OSS. Ett nyckelord som matchar rubriken på ungefär varje post i en feed är en
falsklarmsmaskin, och **falska röda äter upp förtroendet för de äkta**. Borttaget; två tester låser
fast rättningen med posternas ordagranna text.

**FEL 2 — delsträngsmatchning på korta ord.** `orden()` använde `String.includes`. Det betyder att
`"api"` träffar **rapid**, `"cap"` träffar **kapacitet** och `"is"` hade träffat **Diesel** — exakt
den fälla motorns lookbehind en gång sattes mot (engine.ts:43, åtta falsklarm på augustidata).
Rättat till samma lookbehind: matchning kräver **ordbörjan**.

Priset är detsamma som i motorn och är medvetet valt: en sammansättning där ordet inte står först
missas — *"snöfallsvarning"* matchar inte `"varning"`. **Men båda missarna faller åt det säkra
hållet:** ett missat nyckelord ger 🟡 VET INTE, aldrig tystnad, och ett missat främmande ord gör att
vi *inte* säger "rör oss inte". Ingen avslutande gräns, för `"pmp"` måste träffa **PMP3** — namnet
på det API SMHI avvecklade 31 mars.

**NetInfo och Inspire** lades till som främmande för Trafikverkets kanal: egna produkter som inte
kan röra våra fem objekttyper. **NVDB gjordes medvetet INTE främmande** — NVDB-data på väg *in* i
Öppet API vore i högsta grad vår sak, och regel 2 säger att tveksamma fall ska läsas, inte tystas.
Flödet domineras av NVDB, så priset är gula larm i stället för missade röda.

**Utfall efter rättningen, samma 31 poster:**

| | trv-rss (24) | smhi-uppdateringar (7) |
| :-- | --: | --: |
| 🔴 RÖR OSS | **0** | **0** |
| 🟡 VET INTE | 18 | 1 |
| ⚪ RÖR OSS INTE | 6 | 6 |

Noll falska röda. Att 19 av 31 blir gula är inte en brist utan designen: bedömningen matchar ord,
och den vägrar gissa. Nitton poster fördelade över drygt två år är ungefär en läsning i månaden.

**Läxan som är värd att behålla:** en bedömningsregel som aldrig prövats mot det material den ska
bedöma är ett antagande. Torrkörningen tog tio minuter och hittade två fel som annars hade landat
i Bengts inkorg som falska larm.

## #150 (12/9 2026) Källvaktspåminnelsen — en larmväg som fungerar en gång är inte en larmväg

**Beslut:** vakthunden får en sjunde check som letar öppna `trv-nyhet`-issues och lyfter dem när
de legat över sin frist. Egen etikett (`kallvaktspaminnelse`), egen öppna/uppdatera/stäng-cykel,
och den färgar **aldrig** driftvakthunden röd — samma regel som mätvakten.

**Frågan var Bengts:** *"hur får vi veta att vi ska agera på en"*. Svaret var, ända till nu:
källvakten skapar ett GitHub-issue tilldelat Bengt, och GitHub skickar notisen. Det är hela vägen.

**Den vägen har inget golv, och det är uppmätt — inte befarat:**

| Fynd 12/9 | Tal |
| :-- | :-- |
| Issue #165 (met-api) låg öppet utan att något påminde | **11 timmar**, noll kommentarer |
| Källvaktens körningar totalt sedan 3/9 | 4, varav **1 schemalagd** |
| Den enda schemalagda körningen (7/9) | **misslyckades** — dog i spending-limit-stoppet |
| Tid innan någon märkte det | **5 dygn** (och då för att jag letade) |
| Vakthundens checkar som nämner `trv-nyhet` | **0** |
| Källvakten på pulsklockan | **nej** — naken GitHub-cron, som #70 mätte till 40 % |

**FRISTERNA, och varför den vita aldrig larmar:**

| Dom i rubriken | Frist | Skäl |
| :-- | --: | :-- |
| `[RÖR OSS]` | 24 h | ett beroende vi hämtar från har annonserat något |
| `[VET INTE]` | 72 h | måste läsas av en människa, men brådskar inte lika |
| ingen dom (före #149) | 72 h | de är inte vita, de är obedömda |
| `[RÖR OSS INTE]` | **aldrig** | bedömningen har svarat; att det ligger öppet är städning |

Att låta den vita larma vore att bygga en vakt som aldrig kan tystna, och en sådan blir ignorerad —
då dör de riktiga larmen med den. Samma resonemang som när check 4 fick förbud mot att färga
vakthunden röd.

**Påminnelsen lyfter bedömningens egna `Brister:`-rader** ur nyhetsissuets kropp och visar dem
direkt. Skillnaden mellan en notis och en åtgärd är att man kan se VAD som står på spel utan att
öppna något.

**Alternationsordningen i regexen är inte kosmetisk.** `[RÖR OSS INTE]` måste stå FÖRE `[RÖR OSS]`
i alternationen, annars matchar den senare först och den vita domen läses som röd — alltså precis
tvärtemot. Prövat mot fem rubriker, inklusive de två verkliga issuena i repot i dag.

**Varför den inte testas i `npm test`:** vakthunden är en Deno-funktion som importerar postgresjs
över nätet vid toppnivå och kan inte laddas av node:test. Det är därför `kadensTimmar` legat
exporterad men otestad sedan #73. Logiken prövades i stället fristående, och larmvägen prövas
skarpt med `?paminnelseprov=1` efter deployen — vilket är husets egen standard: beviset är en
mätning EFTER deployen, inte commit-hashen.

**Vad den INTE löser:** veckotakten. En avveckling som annonseras på en tisdag hittas ändå först
följande måndag. Att flytta källvakten till pulsklockan och köra den dagligen kostar debiterade
minuter och är ett eget beslut mot fritier-regeln.

## #151 (12/9 2026) Väglagets ålder — Axel mätte i stället för att bygga det jag antog

**Beslut:** `docs/TROSKLAR-VAGLAGETS-ALDER.md` skrivet som **utkast**, väntar på Bengts
fastställande. Frågan omformulerad från *"är klassningen gammal?"* till *"motsäger världen den?"*.

**Bakgrunden är en rättelse av mig.** Jag flaggade under systemanalysen att `road_conditions`
saknar den åldersgräns väderpunkterna har, och antog underförstått att den skulle läggas till.
Axel mätte i stället, och mätningen upphävde antagandet:

| Axels mätning 12/9 | Värde |
| :-- | :-- |
| Segment i `road_conditions` | 818 |
| Med kod ≥ 2 eller vinterord | **0** |
| Exponering i snapshoten | **noll** |
| Senaste `modified_time` | 25 augusti |
| Äldsta `modified_time` | 21 februari |
| Segment med `end_time` | **0** |

**Domänfaktan:** Trafikverkets operatör skriver bara om ett segment när läget ÄNDRAS, inte när det
består. En klassning som står sedan i förrgår kan alltså vara sann. Väderpunkternas tretimmarsgräns
fungerar av motsatt skäl — en station mäter kontinuerligt, så en gammal mätning betyder trasig
givare. **Samma form, olika källa, olika betydelse.**

En hård åldersgräns skulle därmed tysta en halkvarning på en väg som varit hal i tre dygn. Det är
exakt det fel dämpningen (#100) fälldes för, och det är skälet att R3 förkastas **före** mätning:
felet ligger i regelns form, inte i dess tröskel, så ingen mätning kan rädda den.

**Axels tre kodpåståenden verifierade rad för rad:**

| Påstående | Verifierat |
| :-- | :-- |
| Väderpunkterna har 3 h | `publish/snapshot-core.ts:26` |
| Segmenten har ingen tidsgräns | rad 82–85: bara `NOT deleted`, `geom IS NOT NULL` och kod/ord |
| Avvikelser filtreras på `end_time` | rad 140: `AND (end_time IS NULL OR end_time > now())` |
| "Det är en rad" | ✅ och bättre: kolumnen finns (`sql/001_init.sql:24`) och ingesten skriver den redan (`roadcondition.ts:36`) — ingen migration |

**Tre påpekanden tillbaka till Axel:**

1. **Nollan är ett utsagolöst noll.** Arkivet har inga vinterord alls i september, så mätningen KAN
   inte falsifiera hypotesen — läxan i #71, som kodgrindens C-avsnitt vaktar med sin
   `vinterord`-räkning. Han formulerar sig försiktigt, men talet **noll** kommer att citeras utan
   brasklappen i november.
2. **Mätningen finns redan som knapp.** `scripts/kodgrinden.ts` avsnitt D mäter exakt "hur länge står
   en klassning?" med percentiler och säger ⊘ under 30 övergångar. Handmätningen är samma fråga;
   knappen är repeterbar och svarar av sig själv när vintern ger övergångar.
3. **Stillaståendevakten har en mall.** Mätvaktens 6b löser samma problem för radarn: larma inte på
   tystnad, larma på tystnad MEDAN den andra signalen säger att något borde röra sig. Och tröskeln
   behöver ett riktigt tal — **"alla 848 stationer visar minus" inträffar aldrig**, så den vakten
   skulle aldrig fyra.

**En reservation på hans "en rad":** `end_time`-klausulen blir oprövad kod dagen den skrivs, eftersom
inget segment har fältet. Samma form som fail-soft-grenen för filen som aldrig fanns — **ett tyst
ALDRIG**. Lägg in den, men räkna den inte som en åtgärd förrän Trafikverket satt en EndTime en gång
och vi sett den filtrera. Och eftersom `snapshot-core.ts` buntas in i `publicera` måste raden följas
av bunt + deploy i samma varv.

**Varför taket i §5 är hårdare än i andra tröskeldokument.** Alla andra reglerar när vi får SÄGA
något. Det här reglerar när vi får TIGA. Ett fel åt det hållet syns inte i någon logg — det syns i
att en förare inte fick veta. Därför: E0 skuggkolumn direkt, E1 efter Å-A, E2 bara efter Å-B och
Bengts uttryckliga ord, **E3 aldrig**.

**Arbetsdelningen höll.** Axel äger motorn och det som är igång — `end_time`-raden och vakten är
hans. Bengt äger mätning, grindar och trösklar — modellen är hans, och det här dokumentet är den.
Ingen kontrasignering behövdes för att avgöra det.

## #124 (12/9 2026) Väglagets ålder — end_time-klausul + vakt 6c, INGEN åldersgräns
Bengts Claude fann att väderpunkterna har tre timmars åldersgräns men segmenten ingen.
MÄTT före bygge: exponeringen är NOLL just nu — alla 818 segment står som kod 1 "Normalt"
utan vinterord, inget i snapshoten. Men nollan är utsagolös (samma fälla som #71): arkivet
har inga vinterord alls i september, så den kan inte falsifiera hypotesen. Körs om efter
första vinterklassningen; kodgrindens avsnitt D svarar av sig själv när övergångar finns.
DOMÄNFAKTA SOM UPPHÄVER DEN UPPENBARA FIXEN: senaste modified_time 25/8, äldsta 21/2, ingen
end_time på något segment. Operatören skriver om ett segment när läget ÄNDRAS, inte medan
det består. En klassning "Is och snö" som är sann i tre dygn får ingen ny stämpel. En hård
åldersgräns skulle tysta en sann varning — exakt felet Bengt fällde dämpningen för (#103).
Ålder ≠ inaktualitet för operatörsklassningar. Väderpunkternas gräns fungerar för att de
MÄTER kontinuerligt; en gammal mätning = trasig givare. Det gäller inte här.
BYGGT (tystar inget):
 1. end_time-klausul på segmenten, samma som avvikelserna redan har. Kolumnen fanns,
    ingesten skriver den. OPRÖVAD KOD tills Trafikverket satt en EndTime en gång — i dag
    0 av 818 — och ska inte räknas som åtgärd förrän vi sett den filtrera (Bengts
    reservation). Buntad in i publicera, deployad, publicera grön.
 2. Vakt 6c i vakthunden, i mätvaktens 6b-form (radarns korskontroll): larma när
    road_conditions stått stilla > 48 h MEDAN ≥ 10 % av stationerna legat ≤ 0 °C senaste
    3 h. Bengt: "alla 848 visar minus" inträffar aldrig och skulle aldrig fyra; 10 % är en
    tröskel som kan slå. Första körning: väglaget 441,8 h stilla, 1/192 kalla ⇒ korrekt tyst.
INTE BYGGT: om ett gammalt "Is och snö" ska tystas när stationerna visat +8 i tre timmar.
Det är en modell, inte en vakt, och hör hemma i TROSKLAR-VAGLAGETS-ALDER med vinterfacit —
Bengt skriver det, fastställt före vintern så tröskeln inte skrivs efter utfallet.

## #152 (12/9 2026) TROSKLAR-VAGLAGETS-ALDER fastställd

**Beslut:** Bengt fastställer `docs/TROSKLAR-VAGLAGETS-ALDER.md` (#151). Svepet i §4 och kraven i
§5 är därmed låsta enligt §8:s regim. Ingen kontrasignering — trösklar är Bengts, och det räckte
med ordet.

**Vad som låses:**

| | Innehåll |
| :-- | :-- |
| Svep (§4) | T 2·5·8 °C · H 2·3·6 h · N 1·3 stationer · D 1·3·7 dygn · **R = 50 km, ärvd** |
| Grindar (§5) | Å-A1 ≥ 70 % · Å-A2 ≥ 5 % · **Å-A3 ≤ 10 %** · Å-A4 ≥ 100 fall annars OAVGJORT · Å-B1 ≥ 20 · Å-B2 ≥ 90 % |
| Effektstege (§5) | E0 skuggkolumn · E1 efter Å-A · E2 efter Å-B **och Bengts uttryckliga ord** · **E3 aldrig** |
| Förkastat före mätning (§3) | **R3, hård åldersgräns** — felet ligger i formen, inte i tröskeln |

**Tre satser som inte får mjukas upp, oavsett vem som ber om det** (§8:s undantag):

1. **Ingen tystnad utan motsägelse.** Ingen regel härifrån får tysta en klassning som operatören
   inte avslutat och som mätningarna inte motsäger.
2. **R3 förblir förkastad.** En hård åldersgräns kan tysta en sann varning utan något belägg för
   att den blivit falsk — samma fel som dämpningen (#100) fälldes för.
3. **E3 aldrig.** Tystnad utan föregående skuggkörning finns inte som alternativ.

**Skälet att taket är hårdare här än i de nio andra tröskeldokumenten** står i §5 och tål att
upprepas: alla andra reglerar när vi får SÄGA något. Det här reglerar när vi får TIGA. Ett fel åt
det hållet syns inte i någon logg — det syns i att en förare inte fick veta.

**Nästa steg är naturens, inte vårt.** Inget mäts förrän arkivet fått vinterklassningar. Körs Å-A i
september blir svaret OAVGJORT på Å-A4, och det är rätt svar. Vid första vinterklassningen körs
exponeringsmätningen (§2) om med `scripts/kodgrinden.ts` avsnitt D.

**Tionde tröskeldokumentet, och noll utkast kvar.**

## #126 (12/9 2026) Överskriven check: jag deployade vakthunden FÖRE rebasen mot main
Bengts fråga: "deployade du vakthunden efter 3f2a43a? vilken version kör den?" Svaret:
nej. Jag deployade min lokala fil (med 6c) INNAN jag hämtade main, där Bengt samma dag lagt
check 7 (källvaktspåminnelsen, 2ca4609). Resultat: main hade båda, driften hade bara min.
BEVIS: ?paminnelseprov=1 gav inget svar från check 7. Efter omdeploy från main svarar
både 7 och 6c. Mätvaktens #198 var alltså en ÖVERSKRIVEN CHECK, inte en missad takt.
Detta är samma fel som 2/9 (#60: deployade med rött kontrakt) i ny form: jag deployade
utan att först säkerställa att det jag deployade var main. Två personer deployar samma
funktion samma dag; den som deployar sist utan att ha pullat först raderar den andres jobb
utan att något ser trasigt ut. En check som tyst försvinner är värre än en som aldrig
byggdes — den fanns i loggen, i DECISIONS och på tavlan, men inte i drift.
REGEL (CLAUDE.md): deploya ALDRIG en Supabase-funktion utan att först git pull och verifiera
att den lokala filen är identisk med main. Och efter deploy: kör funktionens egna prov
(?larmprov, ?paminnelseprov) så att varje check bevisligen finns i det som kör.

## #153 (13/9 2026) Radardomen HÖLL — Bengt valde (c): radarn ger intensiteten mellan stationerna

BESLUT (Bengt, "Kör c", 13/9 efter att underlaget lagts fram samma natt): radarpiloten godkänns,
och kort #42:s beslutsläge avgörs till **(c)**. Radar blir utlösare mellan stationerna. Kort #43
steg 3 är därmed passerat och steg 4 öppnat. Axels kontrasignering på tröskeldokumentets §3.4
återstår innan kod skrivs (§5:s dubbelsignatur, kort #81 steg A).

UNDERLAGET, framlagt en dag före den bokade domen på Bengts order. Grinden i RADAR-PLAN steg 3→4
har två delar och båda mättes:

(1) KALIBRERINGSKURVAN, cellmätning v3 i TVÅ oberoende fönster:
    13/9 01:07 (7 dygn, 98 kompositer, 13 577 par): 42 / 56 / 77 / 82 % bekräftelse för banden
    0,1–0,5 / 0,5–2 / 2–10 / ≥10 mm/h. Median 0,65 över 7 931 par. Täckning 91 %.
    12/9 03:37 (förskjutet fönster): 39 / 54 / 73 / 79 %, median 0,66, täckning 93 %.
    Att kurvan stiger monotont med intensiteten OCH att den inte rör sig mellan två fönster är
    det som bär domen. Ett mått som står still när underlaget byts är ett mätt mått.

(2) FRITIER EFTER EN VECKA, ur ingest 13/9 00:11: radar_precip 2 029 rader/dygn över 24
    kompositer ≈ 0,3 MB/dygn ≈ 9 MB/mån mot gratisnivåns 500 MB. Händelsefiltret håller:
    124 av 818 segment bar regn ≥ 0,1 mm/h i senaste bilden, 13 049 provpunkter, 84 utanför
    täckning, grids lagras aldrig. Fritier-lagen hålls med marginal.

VARFÖR (c) OCH INTE (a) ELLER (b): grind V-A kördes om 13/9 01:06 på 30 dygn och 73 194 bucketade
avläsningar och FÖLL på alla sex trösklarna — träff 60 % som bäst mot kravet 70, för tredje gången
med samma svar. Falsklarmen klarade V-A2 överallt (5–12 % mot 25). Det är träffen som fäller, och
delvis-andelen växer monotont med tröskeln (28 → 83 %). Stationerna vet ATT det regnar, inte HUR
MYCKET — och intensiteten är exakt det vattenplaning behöver. (b), att skriva om V-A1 till "regnar
det alls", avvisades redan 12/9 på saklig grund: det hade gjort påståendet mätbart och samtidigt
värdelöst för faran. (a) hade kastat en källa som mäter just det som fattas.

TVÅ RESERVATIONER SOM FÖLJER MED IN I BYGGET, båda upptäckta efter att grinden skrevs:
- `rate_max_mmh` går till 727,54 mm/h (DECISIONS #134) och står som UTANFÖR SPANN. Kalibreringen
  är mätt på `rate_mean_mmh`. Fältregeln är nu inskriven i §3.4: rate_max får inte bära tröskel
  eller utlösare förrän spannet 0–200 är rensat.
- §3.4 namngav tidigare inget fält alls. Faktorn 0,65 är nu inskriven MED fältnamn och med
  riktningen utskriven (dividera med 0,65, alltså ×1,54 — multiplicera halverar i stället).

ÖPPET: själva utlösartröskeln i mm/h. Den sätts inte av utfallet och kräver dubbelsignatur.
Bekräftelsekurvan står i §3.4 som dess underlag.

## #154 (13/9 2026) Axel kontrasignerar §3.4 — kalibreringsfaktorn fastställd, steg A klart

BESLUT (Axel, relayerad av Bengt i chatten samma väg som källbeslutet #60 och trösklarna #61):
Axel kontrasignerar TROSKLAR-VATTENPLANING §3.4. Dubbelsignaturen enligt §5 är därmed fullständig
och kalibreringsfaktorn **0,65 på `rate_mean_mmh`** är FASTSTÄLLD. Kort #81 steg A är klart.

VAD SOM ÄR LÅST MED DETTA: faktorns värde, fältet den gäller, riktningen (dividera med 0,65,
alltså ≈ ×1,54), och spärren mot `rate_max_mmh` tills dess spann 0–200 är rensat. Ändring av
något av detta kräver ny dubbelsignatur enligt §5.

VAD SOM INTE ÄR LÅST: **utlösartröskeln i mm/h är fortfarande öppen.** Den är medvetet inte satt
i samma varv som domen föll — att härleda tröskeln ur den körning som nyss dömde är precis vad §5
förbjuder. Bekräftelsekurvan i §3.4 är dess underlag.

FÖLJD FÖR BYGGORDNINGEN (kort #81): steg A klart ⇒ steg B öppet. Steg B har en gaffel som är ett
eget beslut: radar.ts ligger i dag som ett steg i timingesten och kostar noll extra minuter. Att
täta kadensen till var 5:e minut kräver att den flyttas till en edge function OCH att CPU:n bevisas
under 2 s — aldrig tätare i Actions, där 12 körningar i timmen vore 288 min/dygn. Stegen C–F kräver
tröskeln och rörs inte förrän den är satt.

## #155 (13/9 2026) Utlösartröskeln satt av Bengt: radar rate_mean ≥ 2,0 mm/h

BESLUT (Bengt, "Ja till 2", 13/9): vattenplaningens utlösare mellan stationerna sätts till
`radar_precip.rate_mean_mmh` **≥ 2,0 mm/h** över segmentet. Inskrivet i TROSKLAR-VATTENPLANING §3.4.

MOTIVERING, formulerad mot underlaget och inte härledd ur en enskild körnings utfall: bandet
2–10 mm/h är det lägsta där en station inom 5 km bekräftar regn i en klar majoritet av fallen —
77 % i det färska fönstret, 73 % i det föregående. Under det faller bekräftelsen till 56 % (0,5–2)
och 42 % (0,1–0,5). Omräknat med den fastställda faktorn 0,65 motsvarar 2,0 mm/h på radarn ungefär
3,1 mm/h verklig intensitet, alltså regn som lägger vatten på vägbanan i stället för att fukta den.
Det är samma sakskäl som avvisade (b) i #153: duggregn ger ingen vattenplaning, och en varning som
går på duggregn är mätbar och samtidigt värdelös för faran.

FÄLTET: tröskeln gäller `rate_mean_mmh`, samma fält som faktorn. `rate_max_mmh` är fortsatt spärrat
tills dess spann 0–200 är rensat (#134) — en tröskel på ett obesiktigat fält är ingen tröskel.

KVAR: Axels kontrasignering av tröskeln enligt §5, samma krav som faktorn hade (#154). Stegen C–F i
kort #81 öppnas först då. Steg B beror inte av tröskeln och är redan öppet.

## #156 (13/9 2026) Axel kontrasignerar tröskeln, och radarn STANNAR i timingesten (steg B avgjort)

TVÅ BESLUT i samma svar från Bengt ("Axel signerar. Vi flyttar inte nu").

(1) AXEL KONTRASIGNERAR UTLÖSARTRÖSKELN (relayerad av Bengt, samma väg som #60, #61 och #154).
Dubbelsignaturen enligt §5 är fullständig och `rate_mean_mmh` ≥ 2,0 mm/h är FASTSTÄLLD. Därmed är
hela §3.4 avgjord: faktorn 0,65, fältet, riktningen, spärren mot `rate_max_mmh` och tröskeln.
Stegen C–F i kort #81 är öppna.

(2) STEG B AVGJORT: RADARN FLYTTAS INTE NU. `ingest/radar.ts` ligger kvar som ett steg i
timingesten och kostar noll extra Actions-minuter. Alternativet — flytt till edge function med
bevisad CPU < 2 s för 5-minuterskadens — är inte förkastat, bara inte nu. Tätare kadens i Actions
förblir uteslutet: 12 körningar i timmen vore 288 min/dygn, oktoberpotten på en vecka.

VARFÖR DET ÄR RÄTT BESLUT NU, och inte bara ett uppskjutande: kadensen bestämmer hur färsk en
varning kan bli, inte om den är sann. Med timkadens är radarraden som mest 60 min gammal, och
#81:s regel 7 kräver ändå ålder ≤ 70 min för att fältet ska få tala — marginalen är 10 minuter och
alltså tunn men hel. Faller en körning bort blir raden för gammal och radarn tiger, vilket är rätt
utfall. Kassan är dessutom det verkliga trycket just nu (202 min/dygn mot taket 35 USD), och steg B
är det enda steget som kan kosta minuter.

STEG B:S VERIFY ENLIGT KORT #81: "Actions-minuter per dygn oförändrade efter en vecka." Avläses
20/9. Ingen kod skrevs för detta beslut — att inte flytta är beslutets hela innehåll.

## #157 (13/9 2026) Kassavakten — check 8 räknar själv i stället för att läsa fakturan

BESLUT (Bengts order 13/9, "Bygg check 8"): vakthunden får en åttonde check som räknar Actions-
minuter mot taket och larmar innan det hårda stoppet slår i. Kort #152.

VALET SOM AVGJORDE DESIGNEN: GitHubs Billing-API ger den exakta siffran men kräver en nyckel med
KONTObehörighet. PUBLISH_TOKEN har bara repo-behörigheter, och att skaffa en kontonyckel är Axels
handgrepp. Alternativen var alltså (a) vänta på nyckeln och inte ha någon vakt under tiden, eller
(b) räkna själva ur workflow-runs-API:t, som samma nyckel redan läser i mätvakten. (b) valdes: en
skattning som finns i dag slår ett exakt tal som kanske finns i morgon, när felet vi skyddar mot är
att pipelinen dör tyst.

PRISET FÖR (b) ÄR TVÅ KÄNDA FEL, och regeln är att de skrivs ut i VARJE larm i stället för att
döljas: taket är kontoomfattande men vi ser bara ett repo, och GitHub avrundar per jobb medan vi
avrundar per körning (android.yml är enda flödet med två jobb). Talet är därför ett GOLV för
förbrukningen. Ett golv duger för frågan som ställdes — "närmar vi oss" — men får aldrig kallas
faktura.

LARMET GÅR PÅ PROGNOSEN, inte på procenten. "I dagens takt slår taket i den 25:e" går att agera på;
"62 % förbrukat" gör det inte. Andelsvillkoret (70 %) finns kvar som ett andra nät för det fall
takten faller men förbrukningen redan är hög.

GRATISPOTTEN DRAS BORT FÖRST. 2 000 min ingår per månad och nollställs den 1:a. Utan den raden
rapporterar vakten tjugo dollar den 1 oktober när verkligheten är noll — och en vakt som ropar varg
den första dagen varje månad blir ignorerad i resten av den.

FYRA GÅNGER PER DYGN, inte varje timme: en räkning är ~30 API-anrop och budgeten rör sig 1–2 USD per
dygn. Att lösa ett slöserifel med slöseri vore fel medicin.

FÄRGAR ALDRIG DRIFTVAKTHUNDEN RÖD, samma regel och skäl som mätvakten (#101) och påminnelsen (#150):
rött ska betyda "kedjan till appen är bruten NU". Ett tak vi når om nio dygn är inte det, och i samma
issue skulle det hålla vakthunden röd i en vecka och dränka ett riktigt driftlarm.

BEVIS: aritmetiken prövad fristående mot sex handräknade fall (husets konvention för vakthundslogik
— funktionen importerar postgresjs över nätet på toppnivå och kan inte laddas av node:test). Testet
checkades medvetet inte in: det hade blivit en andra kopia av tre trösklar och utlöst
kontraktsgrindens regel för noll nytta. Konstanterna finns i en enda fil. Larmvägen bevisas skarpt
med ?kassaprov=1 EFTER deployen, enligt husregeln att en ändrad fil under supabase/functions/ inte
är en deploy.

## #158 (13/9 2026) Check 7 bevisad hela vägen — och min felhypotes bokförd, inte bortstädad

**Bevis för #150.** Källvaktspåminnelsens öppna/uppdatera/stäng-cykel är nu prövad ände till ände
mot issue #198:

| Tid (12/9, UTC) | Vad | Vad det bevisar |
| :-- | :-- | :-- |
| 17:37:25 | issue skapad med provrad | larmvägen **öppnar** |
| 18:07 | **ingenting** | — se nedan |
| 19:01:06 | kommentar, provraden igen | **uppdaterar** när listan inte är tom |
| 19:07:04 | kommentar utan prov, **stängning** | takten slår, och den **stänger** |

**Tystnaden 18:07 var en ÖVERSKRIVEN CHECK, inte en missad takt.** Axels Claude hade deployat sin
lokala vakthundsfil före en pull, så driften fick 6c men tappade check 7 (#126). Main hade båda,
driften hade en. Efter omdeploy från main svarar båda.

**MIN FELHYPOTES, och den skrivs ut i stället för att städas bort.** Jag konstaterade att 19:01
inte var `:07` och drog slutsatsen att `pg_net` levererat om ett anrop den trodde hade misslyckats.
Det var fel. 19:01 var Axels egen `?paminnelseprov=1` efter omdeployen — alltså ett andra, avsiktligt
prov, inte en omleverans. Jag sa dessutom till Bengt att min oro för en överskriven check var
**obefogad**, och det var det motsatta mot sant.

Varför det bokförs: en förkastad hypotes är billigare för nästa läsare än en tyst rättelse. Den som
ser en oväntad tid i en logg kommer att gissa på omleverans igen, och då ska det stå här att
förklaringen förra gången var mänsklig och inte teknisk. **Leta efter en andra deploy innan du
misstänker transportlagret.**

**Vad som gjorde diagnosen möjlig** var att bevakningen skilde på *kommentar utan stängning* och
*stängning*. Hade den bara frågat "är den stängd?" hade 19:01 sett ut som tystnad, och det verkliga
felet — att provraden fanns i indata — hade aldrig synts. En vakt som bara mäter slutläget kan inte
säga varför.

---

## #159 (13/9 2026) ci hoppar över rena dokumentändringar — kassan styr formen

**Beslut (Bengts order, "lägg in det"):** `paths-ignore: ["**.md"]` på både `push` och
`pull_request` i `.github/workflows/ci.yml`.

**Skälet är kassavaktens tal, inte en känsla.** Check 8 mätte 13/9: **311 min/dygn**, 3 761 min
sedan 1/9, debiterat 14,09 av 35 USD, och **taket slår i den 21 september** — före vintern, och före
de fem mätningar som väntar på första frostnätterna och som alla kör i Actions.

**Uppmätt fördelning 12/9:** av de hundra senaste körningarna var **femtio `ci`**, det enskilt
största flödet. Två av mina sju PR samma dag var rena dokumentändringar som ändå startade en
postgres-tjänst och körde hela sviten.

**Vad raden inte kan missbrukas till:** `paths-ignore` hoppar över bara när VARJE ändrad fil
matchar. En gren som rör kod och dokument kör fortfarande allt — kontraktsgrinden (#144) och
beroendekartan (#147) går inte att smyga förbi genom att lägga till en md-fil.

**Fällan som är dokumenterad i filen:** detta är säkert enbart så länge `ci` inte är en obligatorisk
statuskontroll. Kontrollerat 13/9 via API — `main` har inget grenskydd alls. Införs grenskydd med
`ci` som krav måste raden bort i samma ändring, annars kan en ren dokument-PR aldrig mergas:
kontrollen rapporterar då aldrig, och grenen ser trasig ut utan att vara det.

**Besparingen lovades inte i förväg.** Den här posten är själva provet — en ren dokumentcommit som
ska passera utan `ci`-körning. Utfallet skrivs in nedan när det lästs.

**UTFALLET, läst 13/9:** provet HÖLL. Commiten `e15fa19` rörde bara `DECISIONS.md` och startade
ingen ci-körning — senaste körningen var och förblev **#604**, från paths-ignore-mergen själv.
Raden verkar alltså som avsett.

Vad det INTE säger: hur mycket det sparar. Det vet vi först när kassavakten mätt några dygn med
raden på plats, och den siffran ska läsas ur vakten och inte skattas här. Det enda som är bevisat
är att mekanismen fungerar — att en ren dokumentändring inte längre startar en postgres-tjänst.

## #160 (13/9 2026) Kassavakten räknar två takter — månadssnittet svarade på fel fråga

**Beslut (Bengts order 13/9, "vi kommer att bygga nu, gör kort 152 nu"):** check 8 rapporterar
**förbrukningen** ur månad-till-datum men räknar **prognosen** på en **släpande takt** över de två
senaste kompletta dygnen. Båda talen skrivs ut i varje larm.

**Felet var mätt, inte befarat.** Vakten sa 13/9 att taket slår i den **21 september** vid
311 min/dygn. I det snittet låg fem flöden som slutade köra vid konsolideringen 8–9/9 —
`ingest-fi`, `ingest-no`, `ingest-dk`, `publish-map` och `regn-30` (kort #53/#79/#85). Deras
`.yml`-filer finns inte längre; deras körningar ligger kvar i månadens summa.

**Uppmätt verklig förbrukning samma natt:**

| Fönster | min/dygn | varav bygge (`ci`) |
| :-- | --: | --: |
| Månad-till-datum | 311 | — |
| Senaste 24 h | **232** | 103 |
| Senaste 48 h | **180** | 66 |
| Driften ensam (ingest + grannar + healthcheck) | **81** | 0 |

**Konsekvensen av rättelsen, UPPMÄTT ur den deployade funktionen 13/9 03:0x:** släpande takt
**169 min/dygn** mot månadssnittets 311 ⇒ taket flyttas från **21 till 28 september**.

*(Rättelse i samma post: jag skrev först 26 september utifrån ett fristående prov med påhittade
dygnssummor som gav 201 min/dygn. Den deployade funktionen räknar på de verkliga dygnen och ger
169 och den 28:e. Koden hade rätt, min bokföring hade fel — och en post som citerar ett
skattat tal i stället för ett uppmätt är precis det fel hela kortet handlar om.)*

**VARFÖR BÅDA TALEN STÅR KVAR, och inte bara det nya.** Månadssnittet är rätt för frågan *vad har
vi förbrukat* — det är den frågan fakturan ställer. Den släpande takten är rätt för *när tar det
slut*. Att byta ut det ena mot det andra hade flyttat felet i stället för att ta bort det: en
släpande takt är i gengäld känslig för en enskild byggskur, och ett dygn med mycket PR-arbete
skulle slå igenom hårt i prognosen. Avviker talen mer än **25 %** säger larmet uttryckligen
**TAKTEN ÄNDRAS** och att prognosen vilar på mark som rör sig.

**TVÅ KOMPLETTA DYGN, inte ett och inte det pågående.** Ett enda dygn domineras av en byggskur;
det pågående dygnet är alltid delvis och räknar därför för lågt. Den 1:a och 2:a i månaden finns
inget komplett dygn — då faller den tillbaka på månadssnittet, vilket är rätt eftersom de då är
samma sak.

**Kostar noll extra API-anrop.** Dygnsloopen fanns redan (Axels rättelse mot GitHubs tysta
1 000-träffstak); dygnssummorna sparas nu medan den ändå går igenom dygnen.

**Prövat fristående mot tre fall innan deploy:** verkliga tal 13/9 (311 månad / 201 släpande /
taket 26 sept / gungar), första dygnet i månaden (fallback till månadssnittet), och en halverad
takt (gungar, taket nås inte inom månaden). Vakthunden är en Deno-funktion och kan inte laddas av
`node:test` — samma skäl som `kadensTimmar` legat otestad sedan #73.

**Vad det INTE ändrar:** talet är fortfarande ett GOLV, inte fakturan. Taket är kontoomfattande
men vakten ser ett repo, och GitHub avrundar per jobb medan vi avrundar per körning. Den exakta
siffran kräver en nyckel med kontobehörighet och ligger hos Axel.

## #161 (13/9 2026) Övergångarnas radarfält bytt till rate_mean — en tvingad rättelse, inte en justering

**Beslut (Bengts order 13/9, "ändra 89 till rate_mean och bygg sedan c"):** §2:s svep och §4:s
regelskiss i TROSKLAR-OVERGANGAR byter radarfält från `rate_max` till **`rate_mean_mmh`**.

**Varför det var tvunget.** `rate_max_mmh` står som UTANFÖR SPANN hos värdevakten sedan 727,54 mm/h
hittades i det (#134) — en radarartefakt, inte regn — och TROSKLAR-VATTENPLANING §3.4 förbjuder
uttryckligen att fältet bär tröskel eller utlösare. Kort #89:s skuggkolumn var därmed blockerad:
den väntade på radardomen, domen kom (#153–#156), och då visade sig regelskissen peka på ett
spärrat fält.

**Och bytet gör dokumentet MER konsekvent, inte mindre.** Svepets tal 0,1 · 0,5 · 2 mm/h kommer ur
bekräftelsekurvans radarband, och de banden mättes på `rate_mean_mmh`. Att använda dem på
`rate_max` var alltså felmatchningen — inte tvärtom. Svepet är därför oförändrat; bara fältet byts.

**Skalan skrevs ut i samma varv.** Ny stycke i §2: `r` gäller RÅRADARVÄRDET, samma skala som
faktorn 0,65 mättes på. I stationens skala motsvarar 0,1 · 0,5 · 2 ungefär 0,15 · 0,8 · 3,1 mm/h,
eftersom radarvärdet **divideras** med 0,65. Utan den raden hade nästa läsare gissat, och att blanda
skalorna är precis den tysta drift §3.4:s fältregel och kontraktsgrinden (#144) finns mot.

**Regimen tillät det.** §10: svep och krav får justeras fram till första skuggkörningen med en rad i
DECISIONS. Ingen skuggkörning har gjorts — den väntade på just den här domen. Ändringen lutar sig
inte mot något utfall; den tar bort ett fält som inte får användas.

**Förstudien lämnas orörd.** `docs/OVERGANGAR-ANALYS.md` rad 273 bär fortfarande den gamla
formuleringen. Den är ett daterat underlag och redigeras inte i efterhand — ersättningen noteras i
tröskeldokumentets §10 i stället, så att den som grepar hittar pekaren.

**OMPRÖVNINGEN ÄR MÖJLIG, OCH VÄGEN ÄR MÄTT — INTE ARGUMENTERAD.** Bengt frågade vad som egentligen
är bäst: byta fält eller rensa `rate_max`. Svaret som gavs, och som beslutet vilar på:

`rate_mean` är bättre på sakskäl, inte bara för att `rate_max` är spärrat. (1) Kalibreringen och
hela bekräftelsekurvan (42/56/77/82 %) är mätta på `rate_mean`; för `rate_max` finns **varken
faktor eller kurva**, så svepets tal skulle vara tal vars innebörd vi aldrig mätt. (2) `rate_max`
är max över segmentets provpunkter — **en enda dålig bildpunkt blir hela segmentets värde**, medan
medelvärdet späder ut den. Att rensa 727,54 en gång gör inte fältet säkert; det är en egenskap hos
måttet, inte ett engångsfel.

**Priset erkänns:** `rate_mean` missar en kraftig cell som täcker en mindre del av ett långt
segment. För en säkerhetsvarning är det ingen oviktig invändning.

**Det som skulle avgöra saken ordentligt är inte att rensa `rate_max` utan att MÄTA det.**
`scripts/cell-matning-v3.ts` läser redan båda fälten på samma rad (`rate_max_mmh AS mx,
rate_mean_mmh AS mn`), så en bekräftelsekurva för `rate_max` är en **körning, inte ett bygge** —
samma två fönster och samma metod som gav 0,65. Visar den att max bekräftas väsentligt bättre är
det ett skäl att rensa fältet och byta tillbaka, och då vilar bytet på mätning i båda riktningarna.

**Det som vore fel är att rensa `rate_max` FÖR ATT låsa upp #89.** Då väljer schemat fält, bara
åt andra hållet.

## #162 (13/9 2026) Steg C, radarhalvan: regn per segment i snapshoten — och stationshalvan är blockerad

**Beslut (Bengts order 13/9, "bygg sedan c"):** snapshotkärnan får fältet **`regn`** per segment,
mm/h i **stationens skala**, ur `radar_precip.rate_mean_mmh` dividerat med faktorn 0,65 och med
giltighetsfönstret 70 minuter. Kort #81 steg C, radarhalvan.

**EN SKRIVARE.** Ingen annan sätter fältet. Faktorn och fönstret är konstanter i
`publish/snapshot-core.ts` med §3.4 och #81 regel 7 utskrivna intill.

**FRÅNVARO ÄR INTE TORRT — och det är byggets viktigaste rad.** `radar_precip` skrivs bara när ett
segment hade eko ≥ 0,1 mm/h OCH låg inom täckningen: `ingest/radar.ts` returnerar `null` för
nodata, och provpunkten räknas då inte alls. En saknad rad kan därför betyda **torrt ELLER utanför
täckning**, och tabellen kan inte skilja dem åt. Fältet blir alltså **`null`, aldrig 0**. En nolla
hade påstått en torrhet vi inte mätt, och det är precis den tysta osanningen värdevakten (#133)
och septembervakten finns emot. Ett eget test låser fast det.

**RIKTNINGEN LÅST MED ETT TEST, inte med en kommentar.** 2,0 råradar ⇒ **3,1** i stationens skala.
Testet slår också fast att 1,3 är FEL svar — alltså att faktorn inte får multipliceras. §3.4 skrev
ut riktningen i ord; nu finns den som ett fällande test.

**KONTRAKTSGRINDEN FICK TVÅ NYA KONTRAKT I SAMMA COMMIT**, enligt husregeln i CLAUDE.md. Skälet är
mekaniskt: `snapshot-core.ts` buntas in i `publicera/index.ts`, så faktorn och fönstret fanns på
**två** ställen i samma ögonblick som de skrevs. 7 kontrakt håller.

**STATIONSHALVAN GÅR INTE ATT BYGGA — FÄLLAN SLOG EN FJÄRDE GÅNG, men den här gången före koden.**
Steg C säger `regn` per station ur `rain_sum_mm × 2`. Men `sql/008_rain_sum.sql` lade
`rain_sum_mm` **bara i `weather_observations`**. `weather_latest` har nio fält och saknar det —
exakt det strukturella hål sql/016 dokumenterade: *"ett nytt väderfält kräver TVÅ kolumner, inte
en. Kontrollera latest-tabellen INNAN koden skrivs, inte efter att CI fällt den."* Regeln gjorde
sitt jobb.

Stationshalvan kräver därmed tre saker som radarhalvan inte gjorde: en migration, en ändring i
`ingest/db.ts`, och en ändring i `supabase/functions/ingest-live/index.ts` — **livemotorns egen
ingest, med deploy**. Det är en annan sorts ändring och ett eget steg. Den läggs inte in här i
smyg för att kortet råkade skriva båda halvorna på samma rad.

**KVAR AV STEG C:s VERIFY:** vakthundens rad "regn i snapshoten", och att fältet syns i live.json
efter deploy. Radarn är torr i september, så fältet väntas vara `null` på varje segment — och
**det är rätt utfall**, inte ett misslyckande.

**RÖD CI PÅ FÖRSTA FÖRSÖKET, och den avslöjade ett produktionsfel — inte bara ett testfel.**
Integrationstestet mot riktig PostGIS föll på `relation "radar_precip" does not exist`. Tabellen
skapas av `ingest/radar.ts` vid varje körning (även torra dygn), så i drift finns den — men felet
betydde att **publicera nu skulle DÖ om den saknades**, och publicera bygger snapshoten för ALLA
fem varningsslag. Att döda halka, is, olyckor, vilt och kameror för att ett valfritt fält saknas
vore oproportionerligt.

**Löst åt båda hållen, för ingetdera räcker ensamt:**
1. **Radarfrågan får en fail-soft-gren MED NOT.** Samma avvägning som grannschemana redan har i
   samma funktion. Men aldrig tyst: felet skrivs i `notes`, för en fail-soft-gren utan spår är ett
   **tyst ALDRIG** — CLAUDE.md-läxan från kameror-vaglag, som hoppade över en skrivning i varje varv
   medan jobbet var grönt. Eget test: tabellen kastar ⇒ snapshoten byggs ändå, `regn` blir null,
   och noten finns.
2. **Integrationstestet applicerar sql/009 före `buildSnapshot`** — samma mönster som gallringen
   (014) och grannschemana. Utan det prövas bara den degraderade vägen, och den riktiga aldrig.

Att bara göra (1) hade gjort testet grönt utan att någonsin köra den riktiga frågan mot en riktig
tabell. Att bara göra (2) hade lämnat publicera dödlig mot en saknad tabell. **Rött bygge som
hittade ett verkligt fel är billigt; det var därför det skulle vara rött.**

## #163 (13/9 2026) Vindtaket in i W-A — 87,7 m/s låg i det band domen vilar på

**Beslut (Bengts order 13/9, "lägg in vindtaket"):** `scripts/vindsikt-steg0.ts` får G_tak ur
TROSKLAR-VIND-SIKT §3.1. Översta vindbandet går från `[20, 999]` till `[20, 30]`; allt däröver
räknas som trasig givare och ingår inte i något band.

**Fyndet som utlöste det.** Körningen 13/9: **byvind max 87,7 m/s**. Sveriges rekord ligger kring
81 m/s och då på fjällstation — 87,7 vid en vägstation i september är en givare, inte väder. Utan
tak låg den i det HÖGSTA bandet, alltså i exakt de **45 stationstimmar** hela W-A-domen vilar på
(kravet är 500). Dokumentet hade redan förutsett det och skrivit svepet; ingen hade satt det.

**Svepet är dokumentets, inte mitt:** 30 · 40 · 50 m/s, regeln "det lägsta som inte kastar verkliga
stormar vinner". Lägsta steget valdes, samma som ruttberedskapen redan gjort (#124). Och skriptet
**skriver nu ut vad varje steg skulle kasta** — stationstimmar och antal stationer över 30, 40 och
50 — så att valet kan omprövas på mätning när höststormarna kommit, i stället för på antagande.
Larmar det på fler än två stationer över 30 m/s ska raden läsas för hand: då kan det vara väder.

**Siktsentinelen rördes INTE, och det är ett aktivt beslut.** 44 % av siktvärdena är exakt
20 000 m. Men 20 000 betyder "minst 20 km", vilket faktiskt ÄR god sikt — den ligger i
referensbandet utan att bära någon tröskel, precis som §3.1 kräver. Att "rätta" den vore att
kasta verkliga timmar med god sikt ur nämnaren och därmed blåsa upp varje kvot i B2.

**Fyra kontroller i självtestet**, varav två är driftvakter mot framtida ändringar: att G_TAK är
svepets lägsta steg, att översta bandet faktiskt SLUTAR vid G_TAK (annars kan konstanten ändras
utan att bandet följer med, och givaren släpps in igen utan att något ser fel ut), att 87,7 hamnar
utanför alla band, och att 25 m/s fortfarande ryms.

**KONTRAKTSGRINDEN FICK ETT ÅTTONDE KONTRAKT, och det är av en ny sort.** Tröskeln finns nu under
TVÅ NAMN: `BY_TAK` i ruttberedskapen och `G_TAK` i W-A. En regex per namn hade missat den ena,
så kontraktet bär två former — samma konstruktion som fuktkontraktet använder över språkgränsen.
Mutationsprov: `BY_TAK` driven till 40 ⇒ exit 1.

**Vad det INTE gör:** W-A är fortfarande ⊘ OAVGJORT. Taket tar bort en trasig givare ur ett band
som ändå bara har 45 av 500 krävda stationstimmar. Nyttan ligger i höst: när blåsten kommer ska
underlaget vara rent från början, inte städat efteråt.

## #164 (13/9 2026) Stationsvakten — och kriteriet som föll på sin egen mätning innan det fick gälla

**Beslut (Bengts order 13/9, "bygg stationsvakten"):** `scripts/vindsikt-steg0.ts` utesluter
stationer med bevisligen trasig byvindgivare ur grind W-A:s B1. Kriteriet är fysikaliskt, inte en
lista med ID:n — en lista blir inaktuell i tysthet, ett mått fångar nästa trasiga station också.

**Varför G_tak (#163) inte räckte.** Ett värdetak tar bort dåliga AVLÄSNINGAR. Det tar inte bort en
dålig STATION. Station 2312 bar 26 av 36 stationstimmar över 30 m/s och 18 av 24 över 50, spridda
över hela arkivet 4–13/9; medelbyvind 21,9 men median 6,4. Spikarna drar upp varje aggregat den
bidrar till — också i timmarna UNDER taket, där G_tak per konstruktion inte gör något.

**FÖRSTA KRITERIET (K1) FÖLL, och det bokförs här i sin helhet därför att felet är lärorikt.**
K1 var kvoten byvind/medelvind **per rad**, bedömd vid medelvind ≥ 1 m/s, tak 5. Den skarpa
körningen på grenen gav **335 diskvalificerade av 748 stationer (45 %)** och åt **47 % av B1:s
stationstimmar**. Golvsvepet visade en klippa: 335 vid golv 1,0 → 17 vid 2,0 → 3 vid 3,0 → 1 vid
5,0 → 0 vid 6,0. Upprepningen saknades helt: vid golv 5 fanns EN station med EN rad över kvoten,
och en trasig givare gör det om och om igen.

Orsaken syns i råraderna. Station 2534, 13/9 02:50–03:20, femminuterskadens: byvinden står stilla
på **10,5 · 10,5 · 10,5 · 10,5 · 10,5 · 10,4** medan medelvinden faller **3,8 → 3,3 → 2,5 → 1,9 →
1,4 → 1,0**. **Byvinden är ett max över ett bakåtfönster som inte flyttar sig; medelvinden är
ögonblicket.** Kvoten var två olika tidsfönster delade med varandra. Det är samma klass av fel som
0f:s (#96) — att läsa en tabell som om den vore något annat än den är.

**Taket 5 var däremot rätt, och det flyttades INTE.** Arkivets egna byvindfaktorer vid
meteorologiskt meningsfull vind (medel ≥ 5 m/s, 3 142 rader): median **1,75**, p95 **2,25**,
p99,9 **3,08**, alltså exakt den fysik som skrevs före mätningen (1,3–2, extremt 3). Felet satt i
nämnaren, inte i gränsen — och att flytta taket till 10 för att utfallet såg bättre ut hade varit
precis den glidning huset förbjuder.

**Att bara höja golvet dög inte heller.** Vid medel ≥ 5 m/s fångas EN station (426: 87,7/5,8 =
15,1), och **2312 slipper undan** — när den rapporterar 85 m/s står dess medelvind under golvet.
En vakt som missar den kända trasiga stationen men ser ut att vakta är sämre än ingen vakt.

**K2, SOM GÄLLER — deklarerat med falsifieringsvillkor FÖRE mätningen.** Räkna per **stationstimme**
i stället för per rad: timmens högsta byvind mot timmens högsta medelvind. Inom timmen är de
rättvisa följeslagare, och fönsterglappet dör. En stationstimme är **omöjlig** vid byvind
**≥ 15 m/s** — W-A:s egen bandgräns, inte ett tal jag valt; under den kan en felkvot inte lyfta en
timme in i ett band grinden bryr sig om — och kvot **> 5**. En station diskas vid **≥ 1** sådan
timme. Villkoren som skulle ha fällt också K2: fler än 20 stationer, eller 2312 omissad.

**Utfallet: 9 stationer av de 42 som har någon timme över 15 m/s.**

| station | omöjliga / höga timmar | värsta kvot | max byvind |
|---|---|---|---|
| 2312 | 29 / 30 | 100,3 | 85,5 |
| 2438 | 4 / 4 | 39,7 | **29,9 — under G_tak** |
| 1732 | 3 / 3 | 37,3 | 78,4 |
| 227 | 3 / 3 | 78,7 | 55,1 |
| 426 | 2 / 2 | 25,8 | 87,7 |
| 618 · 1311 · 310 | 1 / 1 | 64,0 · 27,4 · 37,5 | 32,0 · 30,1 · 45,0 |
| 2107 | 1 / 1 | 64,0 | **25,6 — under G_tak** |

**TVÅ AV DE NIO HAR SINA OMÖJLIGA VÄRDEN UNDER 30 M/S.** G_tak kan per konstruktion aldrig se dem.
Det är vaktens starkaste existensskäl, och det var inte känt när kortet beställdes.

Stationerna är inte ibland trasiga: de nio har **46 av arkivets 110 stationstimmar över 15 m/s** (42 %),
och när de rapporterar en hög by är den nästan alltid omöjlig (2312: 29 av 30).

**Effekten på B1**, mot körningen med enbart G_tak: < 10 m/s 30 095 → 29 774, 10–15 1 121 → 1 111,
15–20 65 → 61, **20–30 9 → 3**. Vakten tar **1,1 %** av arkivets stationstimmar och **67 %** av det
högsta bandet — det högsta bandet bestod alltså till två tredjedelar av trasiga givare. Taksvepet
visar dessutom att valet inte är bärande: kvot > 5 och kvot > 10 ger båda 9 stationer, kvot > 3 ger 11.

**Bara B1 utesluter. B2 utesluter ingen.** En trasig byvindgivare säger ingenting om siktgivaren på
samma stolpe — de är olika instrument, och att kasta båda vore att slänga mätningar vi inte har
skäl att misstro. B2:s tal är oförändrade, vilket också syns i körningen.

**Provet ligger mot verkligheten, inte mot påhittade tal:** självtestet prövar 2312:s och 2438:s
faktiska timmar, att 2438 ligger under G_tak, att verklig storm (faktor 2,0) och ruggig terräng
(faktor 3,0) behålls — och **K1:s fälla är inbakad som prov**: 2534:s 10,5 mot 1,0 får aldrig
fälla en station.

**Vad det INTE gör:** W-A är fortfarande ⊘ OAVGJORT — 3 stationstimmar i högsta bandet mot kravet
500. Vakten rensar underlaget inför hösten; den avgör ingenting i september. Och de nio stationerna
har en trasig byvindgivare som bör meddelas Trafikverket: skriptet listar dem, det anmäler dem inte.

## #165 (13/9 2026) Spärren var prioritetsblind — inverterade prioriteten för faror i följd

*Skriven som #127 av Axel och OMNUMRERAD till #165 vid mergen: #127 var upptaget sedan 12/9 (marginalvakten körd). Texten är hans, oförändrad. Produktbokens versionstabell pekar om till #165. Samma krock finns kvar på #126 — den refereras redan i CLAUDE.md och lämnas därför orörd.*
BENGTS FYND: den globala 45-sekundersspärren (regel 1b) kördes EFTER prioritetsvalet (1a)
och visste inte vad den tystade. Faror som kvalificerar samtidigt prioriterades rätt; faror
som kvalificerar EFTER varandra fick inverterad ordning. Kamera vid X, is vid X+200, 50 km/h:
kameran kvalificerar vid X−500 (fast 500 m), isen vid X−217 (leadM 417). Kameran talar, isen
kastas 20 s senare (< 45), spärren öppnar när föraren är 75 m från isen.
REPRODUCERAT (v23): 61 m, inte 75. Verkligheten var värre än aritmetiken.
Aritmetiken behövde inte mätas. Det som var uppmätt (Bengt, static.json, 2 790 kameror):
minsta avstånd mellan två kameror i SAMMA riktning är 520 m, median 3 946, noll under 500.
Det ger golvet ett härlett värde: 520 m i 120 km/h = 15,6 s ⇒ ett golv på 10 s kan aldrig
tysta en kamera. Fartkameror behöver ingen spärr alls.
ÄNDRINGEN, tre motorer: regel 1b får bara kasta en vinnare vars prioritet inte är HÖGRE
än det som senast sades (lastSpokenKind). Golvet 45 → 10 s. Upprepningsregeln (regel 2,
10 min / 5 km) orörd. Is får avbryta en kamera; en kamera kan aldrig avbryta is. Motorn
omprövar varje fix och köar inget, så kortare golv skapar ingen kö — en passerad fara är
inte kandidat. Arkitekturen gjorde redan rätt; konstanten var fel.
VEKTORER: v23 ny (sekvensfallet: isen talar 409 m före i stället för 61). v04/v13 uppdaterade
— kameran får plats 10 s efter olyckan/viltet, sann och aktuell. v05 OMSKRIVEN från
"throttle_45s" till "throttle_floor_10s": det gamla fallet (kameror 400 m isär) finns inte
i verkligheten; det nya låser golvet (camB t=123, inte t=122) och att en kamera aldrig
tystas permanent. Kedjetestets 45-s-invariant ersatt med prioritetsmedveten 10-s.
BEVIS: TS 84/84, Kotlin grön lokalt, ios-engine + ci gröna på 7250068.
(a) SPÄRREN SYNLIG: motorn har onSuppressed; skuggmotorn loggar varje kastad vinnare i
shadow_log.suppressed (sql/016: kind, id, distM, by, sinceS). Första körning: 0 kastade på
3 rutter — väntat i september (bara kameror, ≥ 520 m isär). I vinter blir kolumnen talet
som saknats sedan början: hur ofta spärren tystade, och vad.
INTE ARKIVERAT: rösten är Axels. Ändringen ligger på main med grönt kontrakt; nästa
app-version bär den. Bengt: "skickas som ett konstaterat fel med ett förslag" — det var
rätt form, och förslaget höll i alla tre portar.

## #166 (13/9 2026) Stationsvaktens trösklar fastställda i §3.3 — och de nio givarna anmälda uppåt

**Beslut (Bengts order 13/9, "gör 1 och 2"):** (1) anmälan om de nio trasiga byvindgivarna skrivs och
ställs till Bengt för utskick; (2) stationsvaktens trösklar förs in i `docs/TROSKLAR-VIND-SIKT.md`
som **§3.3, FASTSTÄLLD 2026-09-13** — byvindgolv **15 m/s**, kvottak **5**, krav **≥ 1 omöjlig
timme**, och vakten gäller **bara B1**.

**Varför de hör hemma i dokumentet och inte i skriptet.** En tröskel som bara bor i koden kan ändras
av den som råkar redigera filen. §3 är givarvaktens hem, och stationsvakten ÄR givarvakten — samma
plats som G_tak och siktsentinelen fick 12/9. §8 tillåter tillägget: det rör §3, inte §2:s svep eller
§4:s krav, och det görs före första skuggkörningen.

**ETT FYND UR INGESTERN SOM AVGJORDE FRÅGAN, och som ingen hade skrivit ned:**
`wind_gust_ms` är `Aggregated30minutes.Wind.SpeedMax` — ett **maximum över de föregående 30
minuterna**. `wind_speed_ms` är `Observation.Wind[0].Speed` — ett **ögonblicksvärde**. De två fälten
har alltså aldrig mätt samma tid, och det är exakt varför det första kriteriet (#164) fällde 335 av
748 stationer. Kommentaren stod i `ingest/sources/weather.ts:59` hela tiden; ingen mätning hade
behövt läsa den förrän nu.

**DEN KVARVARANDE SVAGHETEN ÄR NAMNGIVEN OCH MÄTT.** Eftersom byvinden är ett 30-minutersmaximum kan
en VERKLIG by i princip parras mot en efterföljande lugn timme och ge en falsk diskning. Kontrollen
är gjord: med medelvinden tagen som högsta värde över timmen OCH timmen före — ett fönster som säkert
täcker byvindens hela mätperiod — blir resultatet **identiskt**: samma 9 stationer, samma 45 timmar,
samma fördelning per station. Svagheten finns i konstruktionen men har noll verkan på materialet.
Det som ska väcka frågan igen står i §3.3: en station som diskas på EXAKT en omöjlig timme medan den
i övrigt beter sig normalt.

**ANMÄLAN: `docs/ANMALAN-TRV-BYVINDGIVARE.md`.** Nio stationer, med id, namn, WGS84, antal omöjliga
timmar, värsta kvot, median byvind och den tydligaste enskilda observationen per station:

| id | namn | omöjliga timmar | värsta kvot | max byvind | median byvind |
| :-- | :-- | --: | --: | --: | --: |
| 2312 | Handöl | 29 | 100,3 | 85,5 | 6,6 |
| 2438 | Ruskträsk | 4 | 39,7 | 29,9 | 2,8 |
| 227 | Arlanda | 3 | 78,7 | 55,1 | 4,7 |
| 1732 | Fastnäs | 3 | 37,3 | 78,4 | 2,9 |
| 426 | Oxelösund | 2 | 25,8 | 87,7 | 3,4 |
| 618 · 2107 · 310 · 1311 | Brahehus · Hamnäs · Överboda · Mossjön | 1 | 64,0 · 64,0 · 37,5 · 27,4 | 32,0 · 25,6 · 45,0 · 30,1 | 4,8 · 2,1 · 4,2 · 3,0 |

**Mönstret är detsamma i alla nio: spiken inträffar i nära vindstilla.** Värsta raden per station
parar medelvind **0,4–2,1 m/s** mot byvind **23,8–87,7 m/s**. Det är inte ett väderläge; en trasig
givarkanal spikar oberoende av vinden, och medelvindskanalen på samma stolpe läser rätt.

**Anmälan påstår inte var felet sitter** — givare, överföring eller aggregering. Vi ser bara de
öppna data vi hämtar, och det står i brevets reservationer tillsammans med fönstrets längd (4–13/9,
med hämtningsavbrottet 5–9/9 inuti) och att vi inte jämfört mot grannstationer. Beviset vilar på
stationens EGET förhållande mellan by och medel och är därför oberoende av väderläget.

**UTSKICKET ÄR BENGTS, INTE MITT.** Brevet är komplett utom kontaktuppgifterna, som står som
platshållare. Kort #154 bär det. Skälet att skicka alls: vi har uteslutit stationerna ur vårt eget
underlag och är inte blockerade — men felet ligger kvar för alla andra som läser samma öppna data.

## #167 (13/9 2026) Steg 2 för #89: tillståndsskattaren byggd, mätt — och instrumentet rättat tre gånger

**Beslut (Bengts order 13/9, "bygg steg 2 nu på det som finns" + "kör knappen"):** skattaren finns
som ren modul (`publish/tillstand.ts`), mätningen som knapp (`scripts/tillstand-steg2.ts`), och
skattningen räknas **retroaktivt ur arkiven** i stället för att skrivas som kolumn.

**GRINDEN SPÄRRAR ANVÄNDNING, INTE BYGGE — och det är hela skälet att steget kunde göras nu.**
Dokumentets grind lyder "eget facit först … **INNAN någon övergångsregel läser den**". Facit finns
inte: `road_condition_history` står stilla sedan 25/8, dess 33 blöta rader slutar **12 juni**, och
`radar_precip` börjar **2 september**. Fönstren överlappar inte med en enda dag, och bara **12 av
818 segment** har någonsin bytt klass. Grinden spärrar därför steg 3, inte steg 2.

**INGEN SKRIVANDE KOLUMN, och det är ett beslut.** Planen sa "en kolumn per segment i skuggloggen".
Den behövs inte: ingångarna är redan sparade och gallringen (#83) rör bara `weather_observations`,
så skattningen kan räknas om i efterhand för vilket fönster som helst — också för frostnätterna,
inom Ö-D:s sju dygn. En kolumn hade dessutom krävt ett nytt cron-jobb, stängda sedan #85.

**SVEPEN ÄR DOKUMENTETS, ORD FÖR ORD.** N 1·2·3·4 h, stationsregn >0·≥0,2·≥0,5 mm/30 min, r
0,1·0,5·2 mm/h i råradarskala. Ett prov faller om de driver isär från §2. Skattaren väljer ingen
punkt; den skriver ut hela rutnätet.

**BÄRANDE REGEL: FRÅNVARO ÄR INTE TORRT.** Radarn kan aldrig ensam säga "torr" — en saknad rad
betyder torrt ELLER utanför täckning (#162). Bara stationen kan, och bara när den observerat.
Annars "okänt". Tio prov låser det.

### Mätningen (7 dygns fönster, arkivets faktiska spann 8–13/9)

| Fråga | Utfall |
| :-- | :-- |
| 2a täckning | 818 segment · närmaste station median **6,7 km**, p90 15,2 km, värst 48,5 km · 808 segment har radartimmar |
| 2b radarn | 11 752 segmenttimmar med rad · r ≥ 0,1: 57,3 % · r ≥ 0,5: 25,5 % · r ≥ 2: 7,3 % |
| 2b stationen | 15 285 stationstimmar · > 0: 61,7 % · ≥ 0,2: 41,1 % · ≥ 0,5: 22,1 % |
| 2c jämförbara | 7 367 segmenttimmar där **båda** har en åsikt |
| 2c utfall | båda blöta 2 338 · bara radarn 97 · bara stationen 3 520 · båda torra 1 412 |
| 2d skattningen | 63,1–78,4 % blöt över rutnätet, av 15 504 segmenttimmar |
| 2e operatörsfacit | ⊘ **INGEN DOM** — fönstren överlappar inte |

**RADARN ÄR PRECIS MEN INTE KÄNSLIG, och det är mätningens viktigaste fynd.** När radarn säger regn
håller stationen med i **2 338 av 2 435 fall (96,0 %)**. När stationen säger regn håller radarn med i
**2 338 av 5 858 (39,9 %)**. Radarn har dessutom en åsikt om bara **13,1 %** av segmenttimmarna —
resten är osamplat, inte torrt.

**FÖLJDEN FÖR (a):** i unionen `fukt ELLER regn inom N h` bidrar radarn med **97 timmar av 5 955**
där någon såg regn. N dominerar: 1 → 4 h lägger till ~11 procentenheter blöt, medan r 0,1 → 2 tar
bort ~4. Vid median 6,7 km till närmaste station är stationen helt enkelt närmare än radarns
upplösning. **Det säger inte att radarn är onödig** — den testades här bara på segment som har en
station nära, alltså där den behövs minst. Segment långt från station är inte mätta, och det är den
naturliga nästa frågan.

### TRE FEL I MITT EGET INSTRUMENT, funna av att knappen faktiskt trycktes

1. **2c läste en saknad radarrad som "torrt"** (`COALESCE(..., 0) >= r`) — exakt den tysta osanning
   modulen förbjuder i sin egen regel. Rättat: universumet är nu segmenttimmar där båda har en åsikt.
   Före rättelsen såg det ut som att radarn missade 76 % av stationens regn; sant är 60 %.
2. **2d:s nämnare är arkivdietens urval, inte tiden**, och skriptet sa det inte. Dieten (#4) sparar
   rader just vid nederbörd. Andelen blöt är därför kraftigt uppblåst. Reservationen skrivs nu ut.
3. **Nämnarna räknade det NOMINELLA fönstret (7 dygn) mot ett arkiv som sträcker sig 5,3.**
   Radarns täckning rapporterades som 8,7 % när den är **13,1 %**. Felet var värre än en decimal:
   8,7 % ligger nära steg 0:s 0f-tal **8,3 %** (radarns kadens), och jag var nära att skriva ut det
   som en oberoende bekräftelse. Det hade varit en **falsk bekräftelse** — två olika storheter som
   råkade sammanfalla för att nämnaren var uppblåst. Båda nämnarna räknar nu arkivets faktiska spann.

**En bekräftelse som däremot håller:** dietens täckning mätt på regn är **18,5 %**, mot **18,9 %**
mätt på byvind i TROSKLAR-VIND-SIKT §3.2. Två olika fält, olika fönster, samma diet — storleken
stämmer, och det är en konsistens, inte ett bevis.

**Vad detta INTE är:** ingen dom. Skattaren är byggd och mätt, inte godkänd. Ingen regel läser den,
ingen röst rörs, ingen kolumn skrivs. Steg 3 väntar på operatörens klasser OCH på frosten.

## #168 (13/9 2026) Radarns bidrag växer INTE med avståndet — hypotesen föll på sin egen mätning

**Beslut (Bengts order 13/9, "mät radarns bidrag mot avståndet till närmaste station"):** fråga 2f
läggs till i `scripts/tillstand-steg2.ts`. Hypotesen skrevs i koden före svaret och står kvar där.

**HYPOTESEN:** stationens regn är ett punktvärde, så ju längre bort stationen sitter desto sämre
representerar den segmentet — och desto mer borde radarn lägga till. Banden valdes före mätningen
ur 2a:s egen fördelning (median 6,7 km, p90 15,2, värst 48,5): 0–5 · 5–10 · 10–20 · 20–50 km.

**UTFALLET ÄR PLATT, och det är ett nej.**

| band | segment | r ≥ 0,1 | r ≥ 0,5 | r ≥ 2 |
| :-- | --: | --: | --: | --: |
| 0–5 km | 268 | 10,4 % | 1,4 % | 0,1 % |
| 5–10 km | 245 | 10,1 % | 1,6 % | 0,2 % |
| 10–20 km | 200 | 10,4 % | 2,0 % | 0,3 % |
| 20–50 km | 25 | 9,4 % | 1,6 % | 0,0 % |

Talen är radarns UNIKA bidrag: andelen av "någon såg regn"-timmar där bara radarn såg det. Ingen
lutning i någon kolumn. **Radarn är begränsad av sin egen sampling — 13,1 % av segmenttimmarna —
inte av geografin.** Avstånd till station låser inte upp något värde.

**OCH ASYMMETRIN PEKAR ÅT FEL HÅLL FÖR HYPOTESEN.** Oenigheten växer visserligen med avståndet
(58,0 → 62,8 → 61,6 → 70,3 %), men den växer i riktningen **"bara stationen"**: 1 321 → 1 213 →
905 → 88 fall mot radarns 33 → 32 → 30 → 2. Ju längre bort stationen sitter, desto oftare påstår
den regn radarn inte ser — inte tvärtom. Hade radarn burit verklig information där stationen är
långt bort skulle asymmetrin ha vänt.

**FÖLJDEN FÖR (a):** segmentupplösningen köper ingen extra vätedetektion i glesbygden. Unionens
`fukt ELLER regn inom N h` bärs av stationen; radarn bidrar med ~1,5 % vid r ≥ 0,5 oavsett avstånd,
och ~10 % vid det lägsta svepsteget r ≥ 0,1.

**TVÅ RESERVATIONER SOM BEGRÄNSAR DOMEN:**
1. **Bandet 20–50 km bär 25 segment och 149 jämförelser.** Det passerar underlagsvakten (100) men
   är tunt, och dess två "bara radarn"-fall är för få för att bära något.
2. **Fönstret är 5,3 dygn i ett regnigt september.** Frontregn är storskaligt — där SKA stationen
   och radarn vara ense. Konvektiva skurar är lokala, och det är där radarn borde vinna. Vilken
   sorts regn som föll 8–13/9 är inte mätt, så en omkörning i annat väder kan ge annat svar. Det är
   ett skäl att köra om 2f, inte ett skäl att läsa talen ovan som mindre än vad de är.

**Vad domen INTE är:** inget nej till radarn som källa. Radarn är fortfarande **precis** (96,0 % av
det den kallar regn bekräftas av stationen, #167) och den täcker segment som saknar station helt.
Det som föll är att bidraget skulle VÄXA med avståndet.

## #169 (13/9 2026) Kort #88 steg 2: trendarkivet — en tabell i stället för en skuggkolumn, och varför

**Beslut (Bengts order 13/9, "kan vi göra issuen bygga 88 och 98", issue #119):** trendens
kandidater sparas i en egen durabel tabell, skriven av en knapp, i stället för som kolumner i
skuggloggen. Svepet, vakterna och utfallsfönstret är dokumentets, oförändrade.

**VARFÖR §7:s ORDALYDELSE INTE GÅR ATT FÖLJA.** Steg 2 säger "lutning + gap + band som tre kolumner
i skuggloggen". Skuggloggen skrivs av skuggmotorn, och **skuggmotorn läser snapshoten** — en
ögonblicksbild utan historik (`supabase/functions/skuggmotor/main.ts`: hämtar static.json +
live.json, kör motorn över syntetiska spår). Lutningen finns inte där och kan inte räknas där. Att
lägga den i snapshoten hade krävt en ändring i `publicera` och en deploy av två funktioner för ett
fält ingen röst läser. Ett cron-jobb som räknar löpande är stängt sedan #85.

**VARFÖR DET ÄNDÅ BRÅDSKAR.** Ingångarna finns i arkivet, men bara i **sju dygn**: gallringen (#83,
sql/014) tunnar äldre rader till en per halvtimme, och då faller 15-minutersfönstret bort **helt**
och 30-minuters på trendens egen vakt (≥ 3 mätningar i fönstret). Underlaget är färskvara, och
höstens första frostnätter går inte att ta igen. Knappen räknar därför inom sju dygn och skriver
durabelt. Vakthundens check 5 larmar redan vid frost och säger just "kör inom sju dygn".

**AVVIKELSEN ÄR ARKITEKTUR, INTE TRÖSKEL** — §8:s regim rör §2:s svep och §4:s krav, och de är orörda.

**EN KÄLLA FÖR TRÖSKLARNA.** Svepet och givarvakterna satt i `scripts/grind-t-a.ts` och behövdes nu
av arkivet. De flyttades till `publish/trenden.ts`, importerad av båda. En andra kopia hade fött
precis den drift kontraktsgrinden finns emot — och värre än en siffra på drift: **T-A hade dömt med
en uppsättning trösklar och arkivet sparat kandidater med en annan**, så domen och underlaget hade
slutat handla om samma sak.

**SUPERSETINVARIANTEN, låst med prov.** En kandidat är ett stationsögonblick där NÅGON kombination i
svepet skulle kunna fyra. Provet kör hela svepet — 1 872 kombinationer — och kräver: *fyrar någon
kombination på en rad så ÄR raden kandidat*. Faller den sparar arkivet bort just de rader T-B
behöver, och tyst.

**RADERNA BÄR MÄTTA STORHETER, INGEN DOM.** Lutning per fönster, daggpunktsgap, yta, och utfallet
(lägsta yta inom 90 min) — så att hela svepet kan prövas i efterhand. En sparad dom hade låst
tröskeln innan T-A valt den. Noll utfallsrader betyder **OKÄNT**, aldrig "blev inte kallare".

**KÖRT OCH BEVISAT 13/9.** Torrkörning först, sedan skarpt: **3 851 kandidater över 98 stationer**,
8–13/9, ur 117 962 arkivrader från 696 stationer. **Noll följdes av yta ≤ 0 °C inom 90 min** — det
är september, och det är rätt utfall. Omkörning direkt efteråt: **0 nya rader, 3 851 fanns redan**,
alltså idempotens bevisad med mätning och inte med en kommentar.

**RISKEN SOM FÖLJER, och den är Bengts att väga:** trycks knappen inte inom sju dygn efter en
frostnatt är den natten borta. En skrivande kolumn hade tagit bort risken till priset av en deploy
och ett jobb i drift. Instrumentet är byggt så att båda vägarna är öppna.

**#98 ÄR INTE BYGGT.** Tystnadsfelets mått behöver bekräftade halttillfällen, och facitstacken är
tom just nu: `road_condition_history` står stilla sedan 25/8 och `slippery_segment` fyrar i praktiken
aldrig i september. Instrumentet kan byggas före datat — samma skäl som T-A byggdes före frosten —
men det är ett eget steg och det görs inte i smyg här.

## #170 (13/9 2026) Trendberäkningen in i ingest-live — och driftvakten fällde flyttalen

**Beslut (Bengts order 13/9, "lägg trendberäkningen i ingest-live"):** trendkandidaterna räknas nu i
driften, i `sql/018_trend_berakna.sql`, anropad av `ingest-live`. Sjudygnsrisken från #169 är borta:
en frostnatt kräver inte längre att någon hinner trycka en knapp.

**KOSTNADEN VAR FRÅGAN, och svaret är noll.** `ingest-live` kör redan var minut i Supabase. Ett
Actions-schema var 30:e minut hade kostat ~48 debiterade minuter per dygn — nästan en tredjedel av
hela förbrukningen (kassavakten mätte 169 min/dygn) för en enda kolumn. Ett nytt pg_cron-jobb hade
varit gratis men öppnat något #85 stängde. Påhänget kostar ingetdera.

**LOGIKEN LIGGER I SQL, INTE I FUNKTIONEN, och det är en riskavvägning.** `ingest-live` ÄR
livemotorns ingest — situationer, väglag och väder i samma anrop. Kod som kastar där stoppar hela
kedjan för hela appen. Trenden är en skuggmätning och får aldrig kosta driften något. Den deployade
funktionen bär därför **en enda rad**, inlindad i try/catch, och felet går med i svaret: en
fail-soft-gren utan spår är ett tyst ALDRIG (kameror-vaglag-läxan).

**DRIFTVAKTEN FÄLLDE PÅ FÖRSTA KÖRNINGEN, och fyndet är allmängiltigt.** Två kopior av samma
trösklar — TypeScript för T-A och knappen, SQL för driften — jämfördes över samma sjudygnsfönster i
en transaktion som rullades tillbaka. Utfallet: **TypeScript 3 851 rader, SQL 4 713, och 862 rader
bara i SQL.** Noll i andra riktningen.

Orsaken var inte logik utan **aritmetik**: station 2004, 11/9 01:55, yta faller 4,8 → 4,4 på
60 minuter. TypeScript räknar `4.8 - 4.4` i binär flyttal och får **0,39999999999999947**, vilket är
under tröskeln 0,4. Postgres räknar samma subtraktion exakt i `numeric` och får **0,4**, vilket är
lika med tröskeln. **SQL hade rätt** — ett fall på 0,4 grader är ett fall på 0,4 grader.

Rättelsen är en avrundning till tusendels grad på TypeScript-sidan före jämförelsen. Mätvärdena har
EN decimal, så tusendelen kan inte dölja någon verklig skillnad. Provet låser det exakta fallet ur
station 2004. Omkörning: **4 713 mot 4 713, noll i någon riktning.** Läxan förd till CLAUDE.md.

**TVÅ VAKTER, OCH DE VAKTAR OLIKA SAKER.** Kontraktsgrinden fick två nya kontrakt (minsta lutning
0,4 och bredaste bandets tak 6; nu tio stycken, mutationsprovade) — den vaktar att kopiorna bär samma
TAL. Jämförelsen vaktar att de fattar samma BESLUT. Grinden hade sagt grönt hela tiden medan 862
rader låg isär; utan jämförelsen hade T-A dömt på en uppsättning kandidater och driften sparat en annan.

**BEVISET EFTER DEPLOYEN ÄR OFULLSTÄNDIGT, och det sägs rakt ut.** Deployen gick igenom och
`ingest-live` kör: `sync_state.weather` var fem sekunder gammal vid mätningen. Men **noll rader**
skrevs, och orsaken är mätt och inte antagen: **0 av 750 stationer har just nu en yta mellan 1 och
6 °C.** Mitt på dagen i september finns ingen kandidat att skriva. Att livepathen fungerar hela vägen
kan därför inte påstås ännu — det syns först när ytan kyls ner.

**SIGNATUREN ATT LETA EFTER:** en rad i `trend_kandidater` med `utfall_rader IS NULL` och
`observed_at` inom de senaste 90 minuterna kan bara ha skrivits av driften, eftersom knappen fyller
utfallet direkt för mogna rader. Finns en sådan i morgon är kedjan bevisad.

**Och de 862 raderna är ifyllda:** knappen kördes om efter rättelsen och skrev dem. Arkivet rymmer
**4 713 kandidater** 8–13/9, fortfarande noll följda av yta ≤ 0 °C.

## #171 (14/9 2026) Principen skriven, och #98:s instrument byggt i det billigaste formatet

**Beslut (Bengts frågor och order 14/9):** (1) principen bakom byggformen skrivs in i båda
tröskeldokumenten, (2) tre inkonsekvenser i mitt eget rättas, (3) #98:s instrument byggs — i det
format principen pekar ut.

**PRINCIPEN:** *spara det som inte går att räkna om, räkna om det som går* — och **vilket som är
vilket är en MÄTNING, inte en smaksak**: frågan är om gallringen (#83) förstör den upplösning måttet
behöver. #88 sparar (15-minutersfönster överlever inte), #89 och #98 räknar om (timme respektive
händelse överlever). Bengts fråga var om de borde ha samma bygge; svaret är **samma princip, inte
samma bygge** — byggena skiljer sig för att datat skiljer sig.

**TRE RÄTTELSER, ALLA MINA EGNA.** #89:s skript hade bara en UTSKRIVEN varning om sju dygn medan #88
har hårt tak (nu `Math.min` mot 14). Varningstexten var dessutom **fel** — den ärvde trendens problem;
timupplösningen överlever gallringen, som behåller sista raden per 30-minutershink, och `rain_sum_mm`
är en 30-minuters BAKÅTSUMMA, så den sparade raden är just den som ser hinkens regn. Och skriptet
säger nu varför ingen driftvakt behövs där: skattaren finns bara i ett språk.

**KORT #155 BÄR SNUBBELTRÅDEN:** principen vilar på att kvarhållningen inte skärps. Skärps den i
oktoberbeslutet upphör ingången att vara återskapbar, och två mätinstrument måste byta form.

**#98:S FORMAT ÄR PRINCIPENS, INTE ETT VAL.** Allt måttet behöver är append-only och överlever
gallringen: facit, skuggloggen, `trend_kandidater` (sparad av #88) och väderarkivets timupplösning.
Alltså en LÄSANDE knapp. **Ingen tabell, ingen deploy, inget cron-jobb, noll kostnad tills den trycks.**
Fem avsnitt med egna underlagsvakter, och §9:s regel kodad: "okänt" är ett giltigt utfall och tvingas
aldrig till en gissning.

**PRISKURVAN (§5) ÄR MEDVETET INTE BYGGD, och säger det högljutt i utskriften.** Priset kräver att
motorn körs om med andra trösklar över skuggrutterna — ett bygge i motorkedjan — och det går inte att
öva på ett material där M är noll. Utan priset är måttet en halva, inte ett par.

### Körningen 14/9: ⊘ OAVGJORT, som väntat — men två fynd som inte är årstidens

| | |
| :-- | --: |
| (a) väglagets omklassningar till halka, 30 dygn | **0** |
| (b) olyckor i `situation_archive` | 2 773 — men **utan orsak**, räknas inte in |
| (c) **arkiverade kamerabilder** | **0** |
| skuggloggen | 5 657 körningar · 60 rutter · 29/8 → 14/9 |

**KAMERAFACIT ÄR TOMT, och det är inte september som förklarar det.** `TROSKLAR-TYSTNADSFEL` §8 gör
kamerafacit till en **bärande** källa — "738 av 744 kameror står vid en VViS-station, facit ligger per
konstruktion inom räckvidd" — och skuggmotorn arkiverar bilder vid varje larm (`archiveFacit`, bucket
`facit`). Efter 5 657 skuggkörningar innehåller bucketen **noll objekt**. Frågan ställdes utan fel och
fick svaret 0, så det är inte en rättighet som saknas. Kort **#157**.

**GRINDEN HITTADE EN DRIFT SAMMA STUND DEN SKREVS.** Halkorden — vilka ConditionInfo-ord som betyder
HALT — finns på **nio ställen i sju filer med TRE olika värden**: motorn och skuggmotorn har
`is|snö|halka|frost|mycket besvärligt`, snapshoten och vakthunden saknar "mycket besvärligt", och
kodgrinden saknar dessutom "snö". Ingen hade någonsin jämförts mot en annan.

Det KAN vara tre olika frågor: snapshotens rad är en ELLER-gren ovanpå `condition_code >= 2`, och
kodgrindens saknade "snö" kan vara medvetet eftersom packad snö vid kod 1 är normalt vinterväglag i
norr. **Men ingen vet, för ingen har mätt det**, och en ändring i snapshoten ändrar vad appen varnar
för. Kort **#156** bär frågan; kontraktet vaktar tills vidare bara motorns egen lista över tre filer.
Elva kontrakt håller.

**OCH ETT FEL I MITT EGET VERKTYG:** mergeslingan snurrade tio minuter utan att hitta någon
CI-körning och **avslutade sedan tyst med kod 0** — den såg ut som en lyckad körning. Orsaken var att
PR:en hade en konflikt med main, och GitHub kör ingen CI på en PR den inte kan slå ihop. Slingan
säger nu ifrån högljutt när den ger upp. En vakt som ger upp tyst är samma klass av fel som en
fail-soft-gren utan spår.

## #172 (14/9 2026) Båda korten utredda: kamerafacitets fel inringat till en rad, halkorden kan inte mätas ännu

**Bengts order 14/9, "titta på båda":** kort #157 (tomt kamerafacit) och #156 (halkorden i tre
versioner). Båda är läsande utredningar; ingenting byggdes och ingenting deployades.

### #157 — KAMERAFACIT: sex av sju led håller

| Led | Utfall |
| :-- | :-- |
| Bucketen `facit` existerar | ✅ skapad **2026-08-29 10:22** |
| TRV-frågan (`Camera`, `Type = Väglagskamera`) fungerar | ✅ **749 kameror** ligger publicerade i kartlagret ur SAMMA fråga |
| Kamerabildens URL går att hämta | ✅ HTTP 200, `image/jpeg`, 13 kB, giltiga JPEG-byte (provat utifrån 14/9) |
| Skuggan larmar i Sverige | ✅ **756 av 1 802 körningar** hade larm på 14 dygn |
| Objekt i bucketen | ❌ **NOLL** — i alla bucketar, inte bara `facit` |

**Det enda ledet som inte går att prova utifrån är uppladdningen — och det är också det enda som
skiljer sig från husets övriga anrop.** `archiveFacit` postar till `/storage/v1/object/facit/...`
med **bara** `Authorization: Bearer`. Varje annat Supabase-anrop i samma fil skickar
**`Authorization` OCH `apikey`** (jfr `main.ts:210`, skrivningen till `shadow_log`). Det är repots
enda storage-anrop, så ingen annan kod har någonsin prövat den vägen.

**HYPOTESEN ÄR INTE BEVISAD:** att gatewayen avvisar anropet utan `apikey` kan bara visas genom att
lägga till raden och mäta efteråt. Jag har inte tjänstenyckeln och ska inte ha den.

**MEN DET VERKLIGA FELET ÄR ATT INGEN VET, och det är strukturellt.** `archiveFacit` har **fyra tysta
grenar**: `if (!cams.length) return 0`, `if (!best || seen.has(...)) continue`, `if (!img) continue`,
`if (up.ok) saved++`. Ingen loggar varför, och funktionen returnerar en siffra som blir `facit: 0` i
svaret — omöjligt att skilja från "inga larm". Det är exakt kameror-vaglag-läxan i CLAUDE.md: en
fail-soft-gren utan spår är ett tyst ALDRIG, och fel-loggen ska bära API:ets svarskropp. Läxan fanns
nedskriven; den hade inte tillämpats här.

**ÅTGÄRDEN ÄR INTE MIN:** `archiveFacit` bor i `skuggmotor/main.ts` och `index.ts` är den genererade
bunten. En rättelse kräver bunt + deploy i motorkedjan. Kort #157 bär förslaget: lägg till `apikey`,
och gör varje gren högljudd med svarskroppen.

### #156 — HALKORDEN: frågan är riktig men kan inte mätas i dag

Den avgörande frågan var om listorna skiljer sig åt i PRAKTIKEN. Mätt över hela arkivet (830 rader,
21/2–25/8) och hela livetabellen (818 segment):

| Fråga | Arkivet | Livetabellen |
| :-- | --: | --: |
| "mycket besvärligt" vid `condition_code < 2` | **0** | **0** |
| "snö" vid `condition_code = 1` | **0** | **0** |

Skälet är att **inget vinterord någonsin förekommit**: hela materialet är `condition_code 1` med
Torrt (799), Våt (25), fläckvis Våt (8), fläckvis Torrt (6). Arkivet börjar 21 februari, alltså efter
förra vinterns slut.

**⊘ KAN INTE AVGÖRAS PÅ DATA.** Skillnaden mellan de tre listorna är i dag **utan verkan** — men det
är inte samma sak som ofarlig, för den blir verksam i samma stund operatören börjar klassa om i
vinter. Beslutet måste fattas på semantik, eller skjutas till vintern med en omkörning inbokad.
Ingen lista rörd.

**En sak mätningen gav på köpet:** samma tomhet förklarar #98:s ⊘ OAVGJORT och steg 2:s
operatörsfacit (#167). Tre mätningar står stilla på samma orsak — operatören har inte klassat om en
enda väg sedan 25 augusti.

## #174 (14/9 2026) Halkorden: fyra frågor fick fyra kontrakt — och grinden lärde sig avgränsa

**Beslut (Bengts order 14/9, "de tre som rör oss kan vi åtgärda"):** de listor som INTE kräver Axels
beslut vaktas nu var för sig, med sitt eget namn och sitt eget skäl. **Ingen ordlista ändrad, ingen
funktion deployad.**

**FYNDET SOM ÄNDRADE ÅTGÄRDEN.** Nio förekomster i sju filer med tre värden såg ut som en lista på
drift. Läser man vad varje ställe FRÅGAR efter är det fyra frågor, och tre av skillnaderna är
försvarbara: vakthunden letar vinterns första tecken (en allvarlighetsfras är inget vinterord),
kodgrinden prövar "kod 1 trots farlighetsord" (packad snö vid kod 1 är normalt vinterväglag i norr).
Att rätta alla till en lista hade alltså varit fel — det hade tvingat fram falsk enighet.

**GRINDEN FICK ETT NYTT FÄLT: `filer`.** Utan det gick frågorna inte att skilja, eftersom raderna ser
likadana ut (`WHERE i ~* '(^|[^a-zåäö])(...)'`). Med avgränsningen blir varje fråga ett eget kontrakt:

| Kontrakt | Filer | Golv | Värde |
| :-- | :-- | --: | :-- |
| Halkorden i MOTORN | engine.ts + skuggmotorns bunt + tystnadsfelet | 3 | `is\|snö\|halka\|frost\|mycket besvärligt` |
| Snapshotens halkfilter | snapshot-core + publiceras bunt | 2 | `is\|snö\|halka\|frost` |
| Vinterorden i vakthunden | vakthund (två kopior, rad 137 och 148) | 2 | `is\|snö\|halka\|frost` |
| Farlighetsorden i kodgrinden | kodgrinden (två kopior, rad 198 och 201) | 2 | `is\|halka\|frost\|mycket besvärligt` |

**Fjorton kontrakt håller.** Mutationsprov på båda de nya: vakthundens ena kopia driven ⇒ exit 1,
kodgrindens ⇒ exit 1.

**DUBBLERINGEN VAKTAS I STÄLLET FÖR ATT STÄDAS.** Både vakthunden och kodgrinden bär sin lista två
gånger i samma fil. Att lyfta dem till en konstant hade krävt en **deploy av vakthunden för en ren
refaktorering** — risk utan vinst, och #126 är läxan: en deploy tog då tyst bort check 7. Grinden ger
samma skydd till noll risk.

**VAD SOM ÄR KVAR OCH BARA AXELS:** ska `mycket besvärligt` in i snapshotens filter, så att snapshoten
blir ett superset av motorn? I dag är den det inte, och motorn bär därmed en regel den inte kan
utöva. Underlaget: `docs/TILL-AXEL-HALKORDEN.md`.

**EN RÄTTELSE AV MIG SJÄLV:** brevet till Axel skrev "de tre andra listorna rör mätningar och kan vi
ta själva". Det var slarvigt — motorns egen lista är också hans domän. Den skillnaden är att motorns
lista inte BEHÖVER ändras; den är referensen de andra mäts mot. Våra var två, inte tre.

## #175 (14/9 2026) Kort #87: healthcheckens kontroller in i vakthunden — och kortet sa fem av tio

**Beslut (Bengts order 14/9, "sätt igång"):** `healthcheck.yml`:s kontroller flyttas till vakthunden
som **check 9**. Den kostar 12 Actions-minuter per dygn — 360 i månaden — mot ett tak kassavakten
(check 8) räknar ner till slutet av september. Allt den gör är SQL eller en GET; i Supabase kostar
det noll.

**KORTET SA FEM KONTROLLER. FILEN INNEHÅLLER TIO.** Det upptäcktes när de skulle flyttas, och det är
kortets viktigaste fynd: hade bara de fem porterats och `healthcheck.yml` sedan raderats hade **fem
kontroller försvunnit tyst**. Kortets lista är rättad i samma varv.

| Kortets fem | De fem som saknades i listan |
| :-- | :-- |
| grannarkivens ålder (120 min) | `sync_state`-källräkningen (< 4 källor) |
| gränsstationerna (FI 10, NO 20) | de **vilande** källornas 150-minutersgräns |
| arkivvakten (> 3 h oarkiverat) | livemotorns cron-puls (`failed`) |
| kartans meta.json (90 min) | fältgolvet (vind < 100, sikt < 30) |
| kameralagret (500 st, 7 dygn) | räknarna (kameror < 2000, segment < 400) |

**Den vilande gränsen är den som förvånar mest.** Vakthundens check 1 ger `cameras` och
`road_conditions_arkiv` **ingen gräns alls** — den skriver ut "GitHub-flödet, vilar". Healthchecken
hade 150 minuter på dem. Utan den raden kan en kamerakursor frysa utan att någon ser det, och det
hade blivit läget dagen `healthcheck.yml` försvann.

**DE HÖR TILL DEN OPERATIVA VAKTEN**, inte till en egen etikett som 6/7/8. De mäter om kedjan är
trasig här och nu — ett arkiv som står stilla, en gränssnapshot som tunnats ut, en kartfil som frusit.
Samma sort som check 1–3, och en trasig kedja ska inte behöva två ställen att synas på.

**BEVISAT EFTER DEPLOY, inte med deploykvittot.** Vakthundens eget larmprov kördes och issue #243
bär mätvärdesblocket ur det som faktiskt kör:

```
fi-arkivet: 32 min (gräns 120) · dk 32 · no 31
gräns-wx FI: 20 nåbara inom 40 km (golv 10) · NO: 44 (golv 20)
cameras: 46 min (mjuk gräns 150) · road_conditions_arkiv: 46 min
livemotorns cron: succeeded
fältgolv: vind 747 (golv 100), sikt 736 (golv 30)
arkivvakt: 0 oarkiverade av 818 prövade (>3 h)
räknare: 2790 kameror (golv 2000), 818 segment (golv 400)
kartans meta.json: 26 min (gräns 90)
kameror-vaglag: 749 st (golv 500), 0.0 dygn (gräns 7)
```

Alla tio syns. Enda problemraden är larmprovet självt; issuen stängs av nästa gröna timkörning.

**TOLV NYA KONTRAKT, TIDSBEGRÄNSADE MED FLIT.** Trösklarna finns nu i två filer, och husregeln kräver
då kontraktsgrinden. De vaktar parallellveckan och **ska bort i samma commit som `healthcheck.yml`** —
annars faller de på golvet och ser ut som drift. Formen är annorlunda än husets övriga: talet är
**pinnat i mönstret** i stället för fritt fångat, eftersom de två filerna skriver samma tröskel med
olika variabelnamn. Ändras en kopia försvinner den ur räkningen och golvet fäller. Mutationsprov:
120 → 130 ⇒ exit 1. **26 kontrakt håller.**

**EN FÖRSTA FORM HADE ETT HÅL, och det rättades före commit.** Arkivvaktens kontrakt matchade först
varje `interval 'N hours'` i båda filerna — elva förekomster med olika värden. Pinnat till 3 blev det
grönt, men med golv 6 mot nio förekomster kunde en ändring passera obemärkt. Formen är nu bunden till
`modified_time`-kontexten, golv 4.

**HEALTHCHECK.YML RADERAS INTE HÄR, och det är kortets egen Verify som bestämmer det:** en vecka där
vakthunden larmat på ett **framkallat** fel i var och en — `?larmprov` räcker inte. Tills dess kör
båda parallellt. Besparingen på 12 min/dygn realiseras alltså först om en vecka.

**EN SPRICKA I DEPLOYVÄGEN, upptäckt på köpet.** Första deployförsöket föll på
`Failed to resolve latest Supabase CLI release: rate limit exceeded` — `supabase/setup-cli@v1` med
`version: latest` slår upp senaste utgåvan via GitHubs API **oautentiserat**, och det taket kan slå.
Omförsöket gick igenom. Det är den enda deployvägen som inte kräver Axels terminal (kort #78), och den
hänger på en oautentiserad uppslagning. Att pinna CLI-versionen tar bort beroendet — eget kort behövs.

## #176 (14/9 2026) Kamerafacit: skälet är framme — och det var INTE apikey

**Fyndet (kort #157, samma dygn som rättelsen deployades):** pg_net lagrar skuggmotorns svar i
`net._http_response`, och där står nu skälet svart på vitt:

```json
{"ok":true,"results":{"E14 Sundsvall→Åre":{"fixes":2315,"alerts":1}, ...},
 "facit":0,"facitSkal":["ingen kamera inom 15 km"]}
```

**RÄTTELSE 3 VAR DEN SOM BETYDDE NÅGOT.** Tre rättelser gick ut (#173): `apikey` i uppladdningen,
budgeten per anrop, och grenar som säger varför. Den tredje — den som såg minst ut — är den som
svarade på frågan. Utan den hade vi läst `facit: 0` och trott att apikey-rättelsen behövde mer tid.

**MIN HYPOTES ÄR DÄRMED OPRÖVAD, INTE BEKRÄFTAD.** Koden når aldrig uppladdningen, så vi vet
fortfarande inte om `apikey` saknades i praktiken. Den slutsats jag var närmast att dra 14/9 — "sex
av sju led håller, alltså är det headern" — var ett korrekt resonemang på ofullständigt underlag.
Det sjunde ledet var inte uppladdningen utan **kameravalet**, och det låg före.

**VAD SOM FAKTISKT HÄNDER:** larmet inträffar, TRV svarar med kameror (annars hade skälet varit
"TRV gav noll väglagskameror"), men **närmaste väglagskamera ligger längre bort än 15 km** från
larmets position. Radien är hårdkodad i `archiveFacit` och har aldrig mätts mot skuggrutterna.

**NÄSTA FRÅGA ÄR MÄTBAR OCH INTE GISSAD:** hur långt är det egentligen från ett skugglarm till
närmaste väglagskamera? 749 kameror ligger publicerade i kartlagret med koordinater, och
`shadow_log.alerts` bär varje larms lon/lat. Fördelningen avgör om 15 km är fel radie för de här
rutterna eller om facitstacken bara är gles i norr. **Ingen radie ändras innan det är mätt** —
§8:s regim och husets tröskeldisciplin gäller även ett tal som aldrig skrivits in i ett dokument.

**EN BIFYND SOM INTE HÖR TILL KORTET:** två av skuggmotorns anrop 02:00 gav **status 546**
(Supabases WORKER_LIMIT — funktionen slog i CPU- eller minnestaket). Skuggmotorn roterar redan tre
rutter per varv just på grund av CPU-taket (läxan 29/8). Två träffar på tre timmar är inte ett larm,
men det är värt en rad någonstans innan någon lägger till arbete i den funktionen.

## #177 (14/9 2026) Rotorsaken bakom det tomma kamerafacit: skuggloggens larm har ingen position

**Bengts order 14/9, "mät radien".** Mätningen gjordes — och svarade på en annan fråga än den
ställdes: **radien var aldrig problemet.**

**FACITRADIEN GAV ⊘, OCH TOMHETEN VAR LEDTRÅDEN.** `scripts/facitradien.ts` hämtade 749
väglagskameror ur kartlagret och frågade skuggloggen efter larmpositioner. Svaret: **0 skugglarm i
Sverige med position** — trots 756 larmande körningar på fjorton dygn. Ett tomt material i en fråga
vars population bevisligen finns är inte ett underlagsproblem, det är ett fynd.

**BEVISAT PÅ LAGRAD DATA, inte härlett ur typerna.** En verklig rad ur `shadow_log`:

```json
{"t": 1705, "id": "cam:22029010", "kind": "camera", "text": "Fartkamera om 500 meter."}
```

Och över hela fönstret: **2 103 larm, 0 med `lon`, 0 med `distanceM`.**

**VARFÖR.** Motorns `Alert` (`engine/src/types.ts:77`) bär `t`, `hazardId`, `kind`, `distanceM` och
`text` — **ingen koordinat**. Skuggmotorn skriver ändå `lon: a.lon, lat: a.lat` (`main.ts:205`) på
fält som inte finns. I TypeScript hade det varit ett typfel; edge-funktionen deployas utan
typkontroll, så det blir `undefined`, och `JSON.stringify` tappar nycklarna tyst.

**OCH DÄRMED FALLER HELA KEDJAN PÅ EN RAD:** `archiveFacit` räknar
`haversineM({lon: undefined, lat: undefined}, kamera)` ⇒ **NaN** ⇒ `d < bd` är falskt för varje
kamera ⇒ `best` förblir null ⇒ skälet blir *"ingen kamera inom 15 km"*, precis som rättelse 3
rapporterade. **Bucketen har aldrig kunnat fyllas.**

**TRE SLUTSATSER, och den mittersta är den obehagliga:**

1. **Radien 15 km är oprövad, inte fel.** Den har aldrig fått en giltig position att mäta mot.
   Ingen radie ändras; frågan går inte att ställa förrän positionerna finns.
2. **MITT EGET INSTRUMENT HADE SVARAT FEL.** Tystnadsfelets T3 (#171) frågar om något skugglarm
   låg nära facit i tid och rum. Utan positioner hittar den aldrig ett larm och klassar därför
   **varje** bekräftat halttillfälle som en **tyst miss** — ett svar som ser ut som en mätning men
   är en artefakt. Det spelade ingen roll i dag (facit är tomt) och hade spelat all roll i vinter.
   T3 har nu en vakt som **vägrar svara** i stället för att svara fel.
3. **Min apikey-hypotes (#173) är fortfarande oprövad och nu också oviktig** — koden når inte
   uppladdningen och har aldrig gjort det. Rättelsen skadar inget och kan stå kvar.

**ÅTGÄRDEN ÄR INTE MIN ATT GÖRA.** `main.ts` måste slå upp faran på `hazardId` bland `hazards` och
skriva dess position — plus `distanceM`, som Alert faktiskt bär och som skuggmotorn i dag kastar
bort. Det är en ändring i skuggmotorns egen fil, men den ändrar vad skuggloggen INNEHÅLLER, och
skuggloggen är underlaget för mars-domen. Eget kort, och Axels ögon på formen.

**LÄXAN, och den är generell:** ett fält som skrivs från en typ som saknar det blir `undefined`,
försvinner tyst ur JSON, och syns först när någon frågar efter det tre veckor senare. Kedjan såg
frisk ut i varje led som hade en logg. Det var först när en gren TVINGADES säga varför den gav upp
som frågan kunde ställas alls.

## #178 (14/9 2026) healthcheck.yml blir KVAR — raderingen inställd, och kort #87 stängt

**Beslut (Bengt 14/9, ordagrant):** *"ta bort inte bort healthcheck eftersom den knappt kostar något
och stäng kortet som hänvisar till det."*

**VAD SOM ÄNDRAS MOT DEN URSPRUNGLIGA PLANEN.** `healthcheck.yml` skrevs 9/9 som en **BRO** — Bengts
eget ord i kort #50 — som skulle läggas ner när kontrollerna flyttat in i vakthunden. Kontrollerna
flyttade 14/9 (#175, alla tio bevisade i produktion). **Bron blir ändå kvar, och blir därmed ett
andra spår i stället för en bro.**

**SKÄLET ÄR INTE KOSTNADEN, OCH DET ÄR POÄNGEN.** 12 min/dygn är ungefär 7 % av uppmätta 169, och
taket slår omkring 28 september — besparingen var verklig. Den väljs bort mot något som väger tyngre:
**healthcheck.yml är den enda kontroll som körs UTANFÖR det den vaktar.** Vakthunden lever inuti
Supabase. Slutar den fungera öppnas ingen issue, och **tystnad efter grönt ser identiskt ut som
"allt väl"**.

Samma dygn gav två bevis på att det inte är en teoretisk risk: skuggmotorn returnerade status **546**
(Supabases WORKER_LIMIT) två gånger på tre timmar, och kamerafacit visade sig ha varit **tyst trasigt
i sexton dygn** (#177) utan att någon vakt kunde se det. Redundans är vad som fångar sådant.

**Vad beslutet INTE löser:** båda spåren drivs av samma pg_cron. Dör den dör båda. Den punkten finns
kvar och berörs inte av det här beslutet.

### Följder som måste skrivas in, annars biter de senare

1. **De tolv kontrakten är nu PERMANENTA.** De skrevs samma morgon med kommentaren *"ska tas bort i
   SAMMA commit [som healthcheck.yml]"*. Den instruktionen är nu fel och hade fått en framtida läsare
   att ta bort tolv vakter i god tro. Kommentaren är omskriven: dupliceringen är avsiktlig och
   permanent, och kontrakten ska stå kvar.
2. **Pulsklockans kommentar är rättad.** Den sa *"tills … healthcheck.yml lagts ner (kort #87)"*.
   `puls-healthcheck` blir kvar permanent.
3. **Verify-veckan blockerar ingenting längre.** Den var villkoret för raderingen. Att bevisa varje
   larm på ett framkallat fel har fortfarande värde — men det är nu ett frivilligt kvalitetssteg,
   inte en grind.
4. **Kort #87 är stängt** med raderingen som ett dokumenterat NEJ. Ett kort som stängs med en
   inställd delåtgärd måste säga vilken, annars ser det ut som att den bara glömdes bort.

**En anmärkning om proportioner.** Rekommendationen jag gav var att bygga #87 just för att taket
närmar sig. Bygget gjordes, besparingen uteblir, och det är rätt beslut ändå — men kortets
ursprungliga motiv var kostnaden, och det motivet gäller inte längre. Det som blev kvar av värde är
att **vakthunden nu ser tio kontroller den inte såg i går**, och att fem av dem aldrig stod på kortet.

## #179 (14/9 2026) Larmets position in i skuggloggen — form A, och frånvaron får ett skäl

**Beslut (Axels ja via Bengt 14/9, kort #158):** skuggmotorn skriver larmets position, hämtad ur
**faran** och inte ur motorn. Form A av de två som lades fram; form B — att motorns `Alert` bär
punkten `distanceM` mättes till — rör vektorerna och ligger kvar som ett senare val.

**VAD SOM VAR FEL.** `main.ts` skrev `lon: a.lon` på ett fält som inte finns: `Alert`
(`engine/src/types.ts:77`) bär `t`, `hazardId`, `kind`, `distanceM` och `text`. Edge-funktioner
deployas utan typkontroll, så det blev `undefined` och `JSON.stringify` tappade nyckeln tyst. Mätt
14/9: **2 103 larm på fjorton dygn, 0 med `lon`, 0 med `distanceM`** (#177).

**VAD SOM ÄNDRAS.** Punktfaror bär `lon`/`lat` själva, så en uppslagning på `hazardId` bland
`hazards` räcker — ingen motorlogik i edge-funktionen (CLAUDE.md:s regel om att aldrig klistra
motorkod i en edge function). `distanceM` skrivs också; Alert har alltid burit det och skuggmotorn
kastade bara bort det.

**SEGMENT FÅR INGEN KOORDINAT, OCH DET ÄR ETT BESLUT.** En `slippery_segment` är en polyline vars
centroid kan ligga milsvitt från larmpunkten — Jämtlands segment är 59 km (kort #100:s mätning). Att
skriva en ungefärlig punkt hade varit att göra om exakt samma fel en gång till, fast tystare: ett
tal som ser ut som en position men pekar fel. Exakt punkt kräver form B.

**FÄLTET `geo` SÄGER VARFÖR EN KOORDINAT SAKNAS**, och det är den egentliga läxan ur #177:

| `geo` | betyder |
| :-- | :-- |
| `punkt` | koordinaten finns |
| `segment` | den finns inte och **ska** inte finnas |
| `okänd` | faran hittades inte i `hazards` — i sig ett larm värt att se |

En saknad nyckel var förut omöjlig att skilja från en bugg. Nu bär varje larm sitt eget skäl, och
det var precis den formen som löste #157 när `archiveFacit` tvingades säga varför den gav upp.

**MOTORKODEN OCH VEKTORERNA ÄR ORÖRDA:** `engine/` har noll ändrade rader, bunten är omgenererad och
`bundle-skuggmotor --check` är grön. Deployad efter `git pull` och verifiering mot main, enligt
Axels regel (#126).

**VAD SOM LÅSES UPP NÄR POSITIONERNA BÖRJAR FLYTA:**
1. **Kamerafacit (#157)** — `archiveFacit` kan äntligen hitta en kamera och spara en bild.
2. **Facitradien (#157)** — knappen finns och kan mäta om 15 km är rätt radie, för första gången.
3. **Tystnadsfelets T3 (#98)** — vakten som i dag vägrar svara kan börja svara.

**RESERVATION SOM SKA FÖLJA MED:** det som redan passerat är borta. Kamerabilden för en passerad natt
finns inte hos Trafikverket, och sexton dygns larm har loggats utan position. Facitstacken börjar
alltså från i dag, inte från 29 augusti.

## #180 (14/9 2026) Integrationskartan rättad: grind A står, och ett nej gäller en ROLL

**Bengts två invändningar 14/9**, båda riktiga: *"är det inte så att vi får lyfta in alla underkända
och bedöma dem på nytt"* och *"jag tror inte offset är förkastad, ny mätning visade att den duger."*

**RÄTTELSE — JAG CITERADE EN ÖVERSPELAD MÄTNING.** Integrationskartan och mitt svar samma dag sade
att grind A hade **fallit** (MAE 1,06, grova 10,7 %). Den domen gäller körningen **före** #75:s
givarvakt (#129) och marginalvakten (#126/#128). Med båda på plats, DECISIONS #131:

| band | MAE | grova > 2 °C | frysklassfel |
| :-- | --: | --: | --: |
| 0–7 km | **0,33 °C** | 0,0 % | 0,0 % |
| 7–15 km | 0,78 | 3,1 % | 0,0 % |
| 15–20 km | 0,85 | 6,4 % | 0,0 % |
| > 20 km | 0,89 | 5,4 % | 0,4 % |
| **totalt (1 943 p)** | **0,85** | **5,1 %** | **0,3 %** |

A1 **KLARAR** (0,85 mot 1,0) · A2 **OAVGJORT** (5,1 mot 5,0) · A3 **KLARAR** (0,3 mot 10).
Domen är ⏳ **INGEN DOM** — uttryckligen *"inte ett nej"*.

**OCH DET ÄNDRAR L4 I GRUNDEN.** Talen stiger monotont med ankaravståndet — 0,33 · 0,78 · 0,85 · 0,89
— som fysiken kräver. Det är inte en tom ruta utan en **mätt avståndsberoende osäkerhetskurva**, och
det är precis den storhet räckviddslagret behöver. Det som saknas är inte mekanismen utan **knappen**:
vad som gör kurvan brantare eller flackare en enskild natt.

Att jag skrev "praktiskt tomt" var alltså inte en nyansfråga — det var fel underlag, och det gjorde
ett lager som fungerar till ett som saknas.

**PRINCIPEN SOM FÖLJER AV DEN ANDRA INVÄNDNINGEN, nu skriven i kartans §8:**

> Ett underkännande gäller den **fråga som ställdes**. En del får prövas i en ny roll — men den nya
> rollen kräver en **ny fråga, skriven före mätningen, med egen grind**. Ingen del återinförs på hopp.

Bromsen är nödvändig, annars blir principen ett sätt att aldrig ta ett nej. Men prejudikatet finns
redan: **kamerorna** underkändes som täckning (6 av 744 gav nytt ankarläge) och blev **bildfacit** —
en av tre facitkällor systemet i dag vilar på. Samma del, annan roll, avgörande värde.

**De sju underkända har alla en obesvarad fråga i det sammanvägda**, och två av dem kräver inte ens
vinter: **höjden som varianspredikator** (förutsäger den var modellen är opålitlig, i stället för att
korrigera medelvärdet?) och **radarns segmentupplösning** (mätt där en station stod 6,7 km bort i
median — aldrig mätt som upplösning). Båda går att ställa mot befintligt arkiv.

**OCH EN FORM SOM REDAN VISAT SIG:** #100:s dämpning och den breda SMHI-regeln underkändes, men deras
kärnor flyttades (till #153 respektive `N_varning`). Nejet stänger rollen, kärnan flyttar. Det som
inte får hända är att en kärna stryks utan att någon frågar vart den tog vägen.

## #181 (14/9 2026) Integrationskartans register — allt struket, stängt och flyttat i samma dokument

Bengts invändning: allt som strukits eller flyttats ska in i integrationsdokumentet, så
att det inte landar bredvid när man tar ett samlat grepp - och den samlade effekten
bidrar ändå till en klarare bild.

Rätt, och skarpare än §8. Ett underkännande gällde en ROLL. Ett struket spår lämnar
nästan alltid något kvar, och det kvarlämnade faller i tre slag:

  GRÄNS       definierar var produkten inte kan nå (#92 däcken, #93 kommunala vägar)
  VILLKOR     binder vad kombinationen inte får göra (E3, R3, ord-per-resa, #94)
  MÄTT FAKTUM mätningen överlever även när delen inte gjorde det (RH, rate_max, K1)

Registret täcker fyra stängda kort, nio strukna parametrar och fem flyttade kärnor.

Tre saker blir synliga först när allt står på ett ställe:

1. Gränserna är inte hål - de är produktens FORM. #92 och #93 säger tillsammans: vi
   talar om vägen där någon mäter den, inte om fordonet och inte där ingen mäter. Det
   är en skarpare produktdefinition än något av korten säger ensamt.

2. Villkoren på allvarsskalan är redan skrivna, fast utspridda. E3 säger att prioritet
   aldrig får röras, #103 att enheten är episoder, #100 ger talen för hur rösten låter
   över en lång sträcka. Kort #153 behöver inte uppfinna sina ramar - de finns, i tre
   stängda kort.

3. Flera strukna delar lämnade en BERÄKNING efter sig, inte bara en idé.
   Torrdygnsräknaren är #42:s vattenfilmålder, kvoten max/mean är #45:s formsignal,
   K1:s radkvot är en givarvaktsdetektor. Billigare att återanvända än att bygga om.

## #182 (14/9 2026) Motorn och fogarna inarbetade i integrationskartan

**Bengts fråga 14/9:** *"tar integrationskartan hänsyn till det som faktiskt ligger i motorn nu och hur
det som är i motorn och det som ligger i kartan som inte klart sömlöst ska kunna länkas ihop."*

**Nej, den gjorde inte det.** Kartan var skriven från skuggans sida; motorn nämndes bara anekdotiskt
(`engine.ts:50–54`, regel 1a, `icing_point`). Ny §4 (motorn som den faktiskt ser ut) och §5 (fogarna),
lästa ur `engine/src/{types,engine,snapshot,texts}.ts`, de 23 vektorerna, båda portarnas
snapshot-läsare och den publicerade `live.json` — inte ur minnet.

**MOTORN HAR EXAKT FEM FOGAR, och de kostar dramatiskt olika mycket:**

| Fog | Var | Vektorer som måste göras om | Portar |
| :-- | :-- | --: | --: |
| F1 | `live.json` (`snapshot-core.ts`) | **0** | **0** |
| F2 | `snapshotToHazards()` | 0 | 3 |
| F3 | `meta` på Point/SegmentHazard | 0 | 3 |
| F4 | `evaluatePoint`/`evaluateSegment` | **6 is / 3 segment** | 3 |
| F5 | `PRIORITY`, regel 1a/1b, `alertText()` | **23 (alla)** | 3 |

F4:s tal är räknade: sex vektorer bär en `icing_point` (v08, v09, v11, v18, v19, v23), tre ett
`slippery_segment` (v04, v07, v11).

**v11_silent_drive är den verkliga grinden för hela tillståndslagret.** Den bevisar TYSTNAD och bär
både en ispunkt och ett segment som måste förbli tysta. Varje vidgning av L2 — skattaren säger "blöt"
där `fukt` var falskt — får v11 att tala, och en vektor försvagas aldrig för att få ett bygge grönt.

**TRE FYND SOM ÄNDRAR BILDEN:**

1. **Fogen läcker redan.** `snapshot-core.ts` skriver `segments[].regn` (radarns mm/h, #81 C) i varje
   publicerad `live.json` — men `LiveDoc` i `engine/src/snapshot.ts` deklarerar inte fältet och
   adaptern kastar det. Radarlagret ligger alltså **redan i telefonen** och slängs vid adaptern.
   Samma sak för `smhi[]` (deklarerat `unknown[]`, "map/UI layer"), `segments[].road`,
   `deviations[].typ`, `wildlife[].art`, `cameras[].road`. Första riktiga integrationen — radarns
   väta × operatörens klass — kräver alltså INGEN ny publicering, bara F2+F3+F4.

2. **F1 är gratis, men "ersätt" är livsfarligt.** Båda portarna läser snapshoten otypat
   (`org.json.JSONObject` respektive `JSONSerialization` → `[String: Any]`), så okända nycklar
   ignoreras per konstruktion — ett nytt fält kan inte fälla en installerad app. Men Android läser
   `w.optBoolean("fukt", false)`: byts `fukt` mot en graderad nivå blir defaultvärdet `false` och
   **varje app som inte uppdaterats tystnar på is**, utan felmeddelande och utan checksummefel.
   Regeln som skrivs in i kartan: **LÄGG TILL, ERSÄTT ALDRIG.**

3. **Repetitionsscenen finns redan och tvingar fram en ordning.** `bundle-skuggmotor.ts` buntar
   `engine/src/*.ts` ordagrant, och både `ci` och `deploy-supabase` kör `--check` — skuggmotorn ÄR
   motorn. Men skuggan läser samma `live.json` som apparna, så ett opublicerat fält finns inte heller
   för skuggan. Sekvensen blir: **F1 publicera → mät i skuggan → F4 ändra villkoret → tre portar**, och
   F1 ligger alltid minst ett varv före F4. Görs de i samma varv finns ingen mätning som skiljer
   "regeln blev bättre" från "fältet blev tillgängligt".

**MÖNSTRET:** nio av tio skuggdelar greppar **additivt**. Bara #153 (allvarsskalan) kostar F5. Det är
§7.8:s lärdom tillämpad — rimfrosten valde F3+F4 i stället för F5 och slapp 23 vektorer — och samma val
står öppet för #45 (snö/slask) och #42 (vattenplaning): de ska byggas som meta, aldrig som ett sjätte
farslag.

**SKÄRPNING AV EN GAMMAL FORMULERING:** motorns `leadM` (fart × 30 s, klämt till 400–3 000 m) är inte
en giltighetsradie — den mäter förarens fart, inte mätningens räckvidd. Grind A:s felkurva mäter den
andra storheten. Två olika saker med samma ord, och motorn har bara den första.

**Uppmätt i den publicerade `live.json` 14/9 05:10:** 28 väderstationer, 1 avvikelse, 1 viltpunkt,
0 segment, 0 broar, 0 SMHI-ytor. I september har motorn i praktiken bara `icing_point` och kamerorna.

Kartan är nu 13 paragrafer, 508 rader. Inget kortnummer ur föregående version saknas.

## #183 (14/9 2026) Metodförbehållen in i kartan — och ett tal som var för starkt

**Bengts kontrollfråga 14/9:** *"är detta inarbetat i integrationskartan"* om det jag rapporterat i chatten.

**Kontrollerat post för post mot filen. Sju av sju avvikelser fanns där** — fogen som läcker (§5.2),
"lägg till, ersätt aldrig" (§5.3), v11 som grind (§5.1), två sorters räckvidd (§4.2), de olästa fälten
(§5.2), `live.json` 05:10 (§4.3), sekvensen F1 före F4 (§5.5).

**Men REservationerna gjorde det inte, och en av dem döljde ett överdrivet påstående.** Kartan sade
*"F4:s tal är räknade, inte gissade"* om 6/3/23. Talen kommer av att söka efter `icing_point` respektive
`slippery_segment` i `engine/vectors/` — de räknar alltså vektorer som **bär** en sådan fara, vilket är
en **övre gräns** för vad en regeländring kan rubba. En vektor som bär en ispunkt kan mycket väl ge
samma utfall efter ändringen. Formuleringen gjorde ett tak till en kostnad.

**Ny §5.6 "Vad §4 och §5 vilar på — och vad de inte bevisar":** en tabell där varje påstående står mot
sin källa och mot vad den INTE täcker. Två rader är viktigare än de andra:

- **Vektortalen är ett tak, inte en kostnad.** Det enda som gör dem till kostnader är att köra dem —
  alltså steg 3 i §5.5, som därmed inte är byråkrati utan mätpunkten.
- **§5.3:s premiss kan falla.** "F1 är gratis" vilar på att båda portarna läser snapshoten OTYPAT
  (`org.json.JSONObject`, `JSONSerialization`). Byts någon port till typad avkodning slutar ett nytt
  fält vara ofarligt, utan att någon text någonstans säger det.

**Och kostnadskolumnerna mäter FOG, inte arbete.** Tillståndsskattaren och kallplatslagret har samma
fog och helt olika vägar dit.

Läxan är densamma som för registret (#181): **ett förbehåll som bara står i chatten finns inte.** Det
gäller även — kanske särskilt — förbehåll mot mina egna siffror.

## #184 (14/9 2026) Axels fyra invändningar mot integrationskartan — tre står, en föll på fel underlag

**Bengt skickade kartan till Axel i ett tidigt underlag, där rättelsen av grind A ännu inte fanns.**
Axel svarade med fyra invändningar. Bengts order: bedöm dem och arbeta in dem i kartan, med det
öppna markerat som öppet.

### 1. "Utgången väljer på slag, inte allvar" är inte ett fel — det är produkten

**Axel har rätt, och mer rätt än han själv skriver: det är inte ett förslag, det är ett fattat
beslut som kartan missade.** Två dokument säger redan hur allvar får uttryckas:

- **TAVLA #90 roll B:** *"Designfrågan besvarad: modifieraren FÖRLÄNGER FÖRSPRÅNGET, den höjer inte
  prioriteten, för prioritetsstegen droppar förloraren."*
- **TROSKLAR-SMHI-FORSTARKAREN E1:** samma form, ordagrant.

Kartan skrev **"L5 ⛔ finns inte"** medan mekanismen stod nedskriven på två ställen. Det var fel och
är rättat.

**TVÅ FÖLJDER SOM AXEL INTE NÄMNER, OCH SOM GÖR HANS LINJE STARKARE:**

| | Tal |
| :-- | :-- |
| Allvar som ord/prioritet (allvarsskala i rösten) | **F5 — 23 vektorer, tre portar** |
| Allvar som försprång (`leadM` per fara) | **F4 — högst 6 is / 3 segment** |
| Försprångets spann (`leadMinM`–`leadMaxM`) | **400–3 000 m** |
| Samma spann i tid vid 90 km/h | **16–120 s, faktor 7,5** |

Det flyttar #153 från en arkitekturändring till en regeländring — alltså från nästa vinter till den
här. **Hake:** A1-rösten plattar redan ihop ConditionCode 2 och 4 till samma mening, så det första
försprånget att modulera är troligen segmentets, inte ispunktens.

### 2. Tröskelregeln ska preciseras, inte upphävas

Axels lydelse — *"en storhet som inte kan motbevisas av en mätning får inte utlösa; extrapolation
faller, minne av mätningar består"* — är **bättre än kartans §7.2**, som sade att regeln "förbjuder
produkten". Det var uppblåst.

**MEN KRITERIET SAKNAR VITTNE I DAG.** Han namnger två motbevisande mätningar; båda är tomma:

| Vittne | Läge |
| :-- | :-- |
| ytstatus / operatörens "Våt" | **33 rader, noll med efterföljande klassning** — skälet den ströks |
| kameran visar torr asfalt | **kamerafacit: 0 objekt efter 5 657 skuggkörningar** (#157) |

**Kort #157 blir därmed bärande för Axels egen punkt 4.** Den enda funktion han vill släppa till
rösten i vinter kan inte passera hans eget test förrän kamerafacit fylls.

### 3. Kartan mäter mot ett löfte som inte getts — premissen faller, ramkritiken står

**"Grind A föll den 12:e" är falskt.** Den domen (MAE 1,06, grova 10,7 %) är körningen FÖRE
givarvakten och marginalvakten. Med båda, #131, 1 943 punkter: **MAE 0,85 · grova 5,1 ·
frysklassfel 0,3 % ⇒ ingen dom**, uttryckligen inte ett nej. Felkurvan stiger monotont med
ankaravståndet och ÄR räckviddsstorheten. Felet är underlagets, inte Axels.

**Men slutsatsen överlever delvis**, av andra skäl: domen är ingen dom och inte godkänt (A2 5,1 mot
5,0), knappen saknas, materialet är höst. Och **ramkritiken ger jag helt** — `PRODUKTBOK.md:108`
säger ordagrant det han citerar. Kartan mätte det byggda mot ett löfte ingen gett.

### 4. En sak kan nå rösten i vinter — vi konvergerar

Hans "en sak" (frysrisk som fyrar när det inte regnar men vägen är blöt och ytan faller) greppar i
**F1 + F3 + F4** på `icing_point`: ingen F5, ingen ny arkitektur, högst sex vektorer, grind
`v11_silent_drive`. Sekvensen står i kartans §5.5.

### Där jag är oense: E kan inte vänta

Axel låter B och E vänta. **E bör inte det, och skälet är hans eget:** blir allvar till TID behövs ett
GRADERAT mått för att sätta tiden — en tregradig enum ger tre försprångsvärden. E är indata till
hans punkt 1, inte en förfining efteråt.

**Hans invändning avslöjade dessutom ett tankefel i kartans eget §7.5.** Där stod att "en enum kan
bara ERSÄTTA `fukt`:s booleska roll medan en gradient kan läggas bredvid". Det är fel — en enum kan
också läggas bredvid. Det riktiga skälet till E är försprånget, och §7.5 säger nu det, med den gamla
formuleringen utskriven som rättad.

### Vad som är avgjort och vad som är öppet

**Avgjort (mätt eller redan beslutat):** L5:s form är försprång · #153 som försprång kostar F4 ·
grind A står · #157 är bärande för vinterleveransen.

**Öppet — Bengts och Axels:** om #153 ska omformuleras till försprång (jag rekommenderar ja) · om
tröskelregeln skrivs om till Axels lydelse (ja, men säg åt honom om #157) · om E byggs före vintern
(jag rekommenderar ja) · om vinterns röstleverans begränsas till Axels "en sak" (jag rekommenderar
ja).

Allt står i kartans nya **§13**, så att brevet inte landar bredvid dokumentet.

## #185 (14/9 2026) En CRLF-blob fällde två flöden i nio dygn — och gjorde sex källvakter till attrapper

**Beslut:** `android/gradlew.bat` renormaliseras (`git add --renormalize`) så att bloben bär LF och
arbetsträdet CRLF, som `.gitattributes` föreskriver. Flödenas commit-steg RÖRS INTE i det här varvet
— härdningen är kort #161 och Bengts beslut.

**Vad som mättes.** `trv-bevakning` och `marknadsforing` är de enda två flöden i repot som gör
`git pull --rebase`. Båda faller i sitt commit-steg med `error: cannot pull with rebase: You have
unstaged changes.` — efter att deras EGEN commit gått igenom. marknadsforing: röd 6, 7, 8, 13 och
14/9; trv-bevakning: båda sina schemalagda körningar (7/9, 14/9). Fyra gröna dygn emellan gjorde
mönstret svårt att se, och rotorsaken förklarar just nyckfullheten.

**Rotorsaken.** `.gitattributes` infördes 12/9 med `*.bat text eol=crlf`. `android/gradlew.bat`
ligger i git med CRLF redan i bloben. Rengöringsfiltret normaliserar arbetsträdets CRLF till LF före
jämförelsen — LF ≠ blobens CRLF — så filen är permanent "ändrad" varje gång git faktiskt läser
innehållet i stället för att lita på stat-cachen. Bevis lokalt 14/9: `touch android/gradlew.bat`
följt av `git status` ger ` M android/gradlew.bat`, `git diff --stat` ger 94 +/94 − med enbart
radslut, och `git ls-files --eol` gav `i/crlf w/crlf` — index och arbetsträd båda CRLF, alltså exakt
det attributet förbjuder. Efter renormaliseringen: `i/lf w/crlf`.

**Den dyra följden är inte de röda jobben — det är tystnaden bakom dem.** `trv-bevakning` skriver sitt
state, committar det lokalt och når aldrig pushen. Källvakten breddades 12/9 (6354771) från 7 till 13
källor. State-filen på main bär fortfarande 7 källor, senast skriven 12/9 06:52. De sex nya —
`smhi-uppdateringar`, `fi-digitraffic`, `no-vegvesen`, `dk-dmi`, `polisen-regler`, `polisen-api` —
seedar om sig vid varje körning och kan därför aldrig larma. Vakten ser levande ut i loggen och
bevakar sex källor i tomma luften. Samma familj som fail-soft-grenen för en fil som aldrig funnits.

**Varför flödena inte härdas i samma varv.** Läsanvisningen för dygnet är "bygg inget utan Bengts ja".
Renormaliseringen tas ändå: den är en reparation med bevis, den ändrar ingen funktionell rad, och utan
den är arbetsträdet smutsigt i varje kommande varv. Härdningen (`--autostash`, och en `git status
--porcelain` i fel-grenen) ändrar hur flödena BETER sig och är därför ett beslut, inte en reparation.

**Läxan, i samma form som de andra:** ett commit-steg som stagar en enskild sökväg antar tyst att
resten av trädet är rent. Antagandet håller tills någon inför ett attribut, och då faller steget på
en fil det aldrig rört. Felmeddelandet nämner dessutom inte VILKEN fil — "You have unstaged changes"
utan filnamn kostade ett diagnosvarv, precis som "TRV 400" utan svarskropp gjorde.

## #186 (15/9 2026) Axels andra brev: kartan fryst, förarna som facit, efterhalkan som märkt beta i november

**Axels brev 15/9**, efter att han läst karta, bedömning v2 och granskning: *"Ni har byggt en mätapparat av en
klass jag inte sett i ett projekt av den här storleken. Den saknar två saker: facit som fylls, och en väg från
skugga till förare som är kortare än en vinter."* Han rättade sig själv på två punkter — grind A föll inte,
och E kan inte vänta — och föreslog fyra saker. **Bengt beslutade samma dag:**

1. **Kartan fryses.** Tjugofyra rättelser på ett dygn var en ekokammare. Nästa ändring i kartan kommer efter
   att något byggts och mätts. R1–R15 väntar i bedömningens bilaga A tills en av dem rör kod. Enda undantaget:
   kriteriet för nytt farslag, tre rader i §7.8, som Bengt fastställde: *handling · text · prioritet beslutad
   av Axel före vektorn.*
2. **Betatestarna får skicka varningsfacit** — *"stämde det?"* efter varje varning, varnings-id + svar, inget
   spår — med uttryckligt samtycke i känd krets. Löftet *"samlar in: ingenting"* gäller oförändrat för
   allmänheten (kort #21 hade skjutit knappen till våren 2027 av just det skälet).
3. **Efterhalkan släpps som märkt beta i november**, före grinden: *"Halkvakt tror: frysrisk framöver"*, som
   ny gren i `icing_point` (F3+F4+text, tre portar, `v11_silent_drive` måste tiga). Dom i januari på
   förarfacit plus vad kamerafacit hunnit ge; mars-domen blir en dom på riktig data. Trösklarna rörs inte.
4. **Tre dokument blir ett levande och två stilla:** kartan (varför, fryst) · bedömning v3 (vad och när, den
   enda listan: nu 5 rader, senare, ännu senare) · granskningen (arkiverad).

**Axels tre "måste oavsett" är bedömningens N1–N3:** kamerafacit bevisat med ett objekt i hinken, #42 i
höstregn, nycklarna roterade senast 15/11 med publiceringsbevis. Ingen av dem var startad när brevet kom.

**Två kostnader Axel inte nämnde, nu i listan:** *"kräver ingenting nytt i motorn"* stämmer inte — regeln
finns som skript, inte i motorn apparna kör; betan är L1 flyttad till november, ett motorbygge med v11 som
grind (S3). Och facitknappen kräver samtyckesbeslutet ovan (S4).

## #187 (15/9 2026) Regnsegmenten får en EGEN nyckel i live.json — vidgningen av väglagsfrågan hade blivit en falsklarmsmaskin

**Bedömning v3 N2 (kort #154, Bengts "då gör vi nu nu" 15/9, PR #270).** Uppgiften: låta radarns `regn` nå de
normalklassade segment vattenplaningen sitter på. Den första ritningen — vidga väglagsfrågans WHERE med
`rate_mean_mmh ≥ 2,0` — stoppades av koden själv: `engine/src/snapshot.ts` gör VARJE rad i `segments[]` till en
`slippery_segment`, och `SnapshotRepo.kt`/`.swift` likaså. En vidgad fråga hade fått tre portar att säga "halka
på vägen framför" på varje blöt normalväg i höstregn — F4/F5 utklädd till F1.

**Beslut:** ny toppnyckel **`rain_segments`** med samma form som `segments` (`id, line, code, info, road, regn`),
fylld av segment som INTE är halkklassade och vars senaste radarrad inom 70 min har rå `rate_mean_mmh ≥
REGN_UTLOSARE_MMH = 2,0` (#155/#156, jämförd mot råvärdet). Ingen port läser nyckeln — båda läser otypat och
okända nycklar ignoreras ("LÄGG TILL, ERSÄTT ALDRIG"); skuggan kan (steg E, V-B). Samma enda `regn`-skrivare.
Fail-soft med not, aldrig tyst. Tre nya konstanter finns i två filer (källan + buntade publicera/index.ts) och
står i kontraktsgrinden (golv 2). Test: normalklassat S2 över 2,0 hamnar i `rain_segments`, `segments` orörd,
motorn ser fortfarande EN slippery_segment.

**Förkastat:** vidgad WHERE (falsklarm i tre portar) · filter i `snapshotToHazards` (motorändring + tre portar för
en F1-uppgift) · `regn` som separat karta `{id: mm/h}` (skuggan behöver geometrin ändå). **Bengts ja på #154**
togs som givet av ordern att köra NU-listan; eftersom nyckeln inte når någon port ändrar ett nej ingenting apparna gör.

**Bevis 15/9:** publicera deployad 15:52Z; live.json 2026-09-15T16:00:01Z (manifest-sha STÄMMER): **`rain_segments` 34 st** — t.ex. segment 16010 E16, kod 1 "Torrt", `regn` 3,1 (= 2,0 rå); `segments` 0 st, som förut i september.

## #188 (15/9 2026) F1: skattarens råa indata i live.json — `regn_h` och `lutning15/30/60`; `radar_h` uppskjuten

**Bedömning v3 N4 (kort #187, PR #270).** Varje väderpunkt bär nu `regn_h` (timmar sedan arkivet senast såg
`rain_sum_mm > 0`, fönster `REGN_H_FONSTER_H = 48`) och `lutning15/30/60` (°C per fönster ur `trend_kandidater`,
senaste rad inom `LUTNING_MAX_ALDER_MIN = 60`, positivt = ytan faller). Null = inget i fönstret eller okänt,
aldrig noll. Gränsstationer (fi/no) får null. Motorn läser inget av det — F1 ligger ett varv före F4, S1 mäter först.

**`radar_h` uppskjuten:** kräver en LATERAL-koppling segment↔station i publicera var tionde minut; skuggmotorn slog i
WORKER_LIMIT två gånger 14/9 (#176) och ingen CPU-mätning finns. Byggs när steg E ändå läser radarn per station.

**Regntäckningen mätt (N4:s förkrav, 7 dygn t.o.m. 15/9):** 750 stationer × 169 körtimmar, bucket-täckning
**13 %** (2/2 10 %, 1/2 7 %, 0/2 83 %). 3/9 var talet 44 %, 9/9 36 %. INTE jämförbart rakt av: nämnaren är alla
station-körtimmar, och arkivdieten (#4) sparar bara "intressanta" rader — i en varm torr septembervecka är 0/2
oftast rätt, inte tappat. Måttet skiljer inte torrt från missat. Konsekvens för `regn_h`: en regnbucket
arkiveras bara medan nederbördsflaggan är satt eller ytan ≤ 5 °C, så `regn_h` kan överskatta med upp till en
bucket (30 min). S1:s skuggjämförelse är beviset som gäller, inte täckningsprocenten.

**Värdevakten:** innan fälten bär en tröskel (S2/S3) deklareras de i `scripts/vardevakten.ts` SPANN och knappen körs.

**Bevis 15/9:** publicera deployad 15:52Z; live.json 2026-09-15T16:00:01Z: `weather` **tom** — ingen station ≤ 3 °C klarar givarvakten (lägsta riktiga yta 7,1 °C; Rovaniemi 0,0 °C mot luft 12,6 stoppas av #75). Fälten bevisas i CI:s PostGIS (integration.test.ts) men ÄNNU INTE på CDN.

## #189 (15/9 2026) Kamerafacit: den åttonde länken — `archiveFacit` fick aldrig positionen

**Bedömning v3 N1 (kort #157, PR #270).** Två mätningar 15/9: facitradien (14 dygn) — **174 positionerade svenska
skugglarm, 100 % inom 15 km** från en väglagskamera (närmast 0,2 km, längst bort 13,4; medianer per rutt
0,4–13,4 km); tystnadsfelet (30 dygn) — **0 arkiverade kamerabilder**. Radien friad, hinken tom: en länk till.

**Fyndet, i koden:** form A (#179) gav skuggloggens rader lon/lat genom uppslag i faran — men `archiveFacit(alerts, …)`
fick fortfarande motorns `Alert`, som inte bär någon position (`engine/src/types.ts`), och räknade haversine på NaN
precis som före form A. "Ingen kamera inom 15 km" var sant för NaN, inte för larmen.

**Rättelse 4:** funktionen tar PUNKTER, uppslagna ur faran på samma sätt som loggen; segmentlarm ger ingen punkt
(form A:s regel) och grenen säger det: "bara segmentlarm — ingen punkt att söka kamera från". **Bevis: ett objekt i
bucketen efter deploy, räknat av tystnadsfelet — inte en commit.** Utfall 15/9: skuggmotor deployad 15:52Z; tystnadsfelet 16:02Z: **1 bild i `facit`**, senast 15/9 — första objektet någonsin.

**Bifynd ur samma körning:** `situation_archive` är INTE tomt — **3 122 olyckor på 30 dygn** (S7 sa "mät"; nu mätt).
`road_condition_history`: 0 omklassningar till halka på 30 dygn — moaten är tom, som väntat i september.

## #190 (15/9 2026) Nyckelkalendern i vakthunden — PAT:ens utgång läses live, Supabase-tokenens står i koden

**Bedömning v3 N3 (kort #86, PR #270).** Vakthundens check 10 läser PAT:ens utgångsdatum ur GitHubs svarshuvud
`github-authentication-token-expiration` vid varje körning — roterar Axel nyckeln flyttas datumet av sig självt,
och en rotation som inte nått Supabase-hemligheten syns som ett datum som inte flyttat sig. Supabase-tokenen
(deploy-knappen) saknar sådant huvud; `SUPABASE_TOKEN_UTGAR = 2026-12-08` står i koden och flyttas vid rotation.
Varsel 14 dygn (rotationsläxan: bytet bevisas med en publicering, och det tar dagar). Egen etikett `nyckelkalender`,
egen cykel, skrivs 06 UTC en gång om dygnet, färgar aldrig driftvakthunden röd. Prov `?nyckelprov=1` via dbknapp
(flaggan i skriptets ENDA lista + YAML-menyn, 13/9-läxan).

**Rotationen själv är Axels** (senast 15/11, bevis = publicering med ny nyckel). Kalendern larmar 8/11 för PAT:en och
24/11 för Supabase-tokenen — om ingen rört dem.

**Bevis 15/9:** deployad 15:52Z; `nyckelprov` via dbknapp gav issue #272 15:53Z med PAT:ens datum läst live ur
svarshuvudet: 2026-11-22 (67 dygn) — samma datum som kort #86 — och Supabase 2026-12-08 (83 dygn).

## #191 (15/9 2026) Steg E byggt: vattenplaningens skugga i skuggmotorn — och Bengts ja på #154

**Bengt 15/9: "ja på #154, bygg steg E."** #154 är därmed avgjord i sak (nyckeln `rain_segments`, DECISIONS #187),
och kort #81:s steg E — *skuggan loggar vad rösten SKULLE sagt* — är byggt (PR #274).

**Hur, och varför just så.** Skuggmotorn kör en EGEN `AlertEngine`-instans över samma spår med `rain_segments`
som syntetiska segmentfaror. Motorns korridor, försprång, 45 s och 10 min/5 km gäller därmed ordagrant —
ingen andra implementation av reglerna, vilket är fällan #89:s frostvakt uttryckligen undvek. Två saker att
läsa rakt: (1) den syntetiska faran bär `code: 2`, eftersom `evaluateSegment` tiger på kod 1 — det betyder
bara "får tala" i den här mätningen, och den riktiga koden går med i loggraden; (2) motorns `alerts` rörs
inte alls — skuggvarningarna får en egen kolumn `vb` (sql/019), för `alerts` läses av skuggrapporten,
tystnadsfelet och upprepningen, och en inblandad rad hade förfalskat alla tre. Bara segment i ruttens ruta
(+5 km) matas in: CPU-taket (läxa 29/8) och korridoren når ändå inte längre. Positionen som loggas är
BILENS när rösten skulle talat (`geo: "bil"`), och den går också till `archiveFacit`: en torr vägbana i bild
fäller falsklarm enligt TROSKLAR-VATTENPLANING §2.

**Rapporten:** skuggrapporten (publik JSON) får fältet `vattenplaning` — skuggvarningar totalt och per rutt
senaste dygnet. Det är "skuggrapporten i Supabase" som kort #81 nämner som veckorapportens ena väg.

**Vad som INTE byggs nu:** grind V-B:s dom-knapp (falsklarm mot stationens `rain_sum_mm` ±30 min, miss mot
`situation_archive`) — den mäter ingenting förrän `vb`-rader finns, och instrumentets form ska följa datan,
inte föregå den. Nästa länk när första regndygnet loggats. Domen fälls över V-C:s underlag (≥ 200 varningar,
≥ 15 facit, ≥ 5 regndygn, ≥ 3 län) — inte förr.

**Ordning vid driftsättning:** migrationen (sql/019) FÖRE deployen — PostgREST avvisar en okänd kolumn och
hade annars fällt hela skuggloggningen, inte bara `vb`.

**Bevis 15/9:** första `vb`-raderna 17:30Z: **5 skuggvarningar** (E18 Karlstad→Örebro, 5 st, regnsegment 18060/18065/18067) i skuggrapportens `vattenplaning`.

**Bifynd:** kolumnen `shadow_log.suppressed` (sql/016, #127 a) skrivs aldrig av skuggmotorn — `onSuppressed`
finns i motorn men ingen lyssnar. Kolumnen har stått tom sedan 13/9. Eget kort behövs innan någon "fixar" det.

## #192 (15/9 2026) Trendfälten besiktigade — värdevakten skannade aldrig `trend_kandidater`

**Bengts fråga 15/9 ("finns det något annat av nu-sakerna som kan påbörjas") — svaret var förkravet för S2/S3.**
Värdevaktsregeln (12/9) säger att ett fält inte får bära en tröskel förrän det passerat vakten. `lutning15/30/60`
bär redan `lutning` i live.json (N4, #188) och ska bära efterhalkans villkor (S3). Men `trend_kandidater` stod
inte i vaktens tabellista (`TID`), så dess fält skannades aldrig — **inte ens som OBESIKTIGADE.** "Schemat läses
ur databasen" gällde bara inom listan. Tabellen är tillagd, sex fält har spann.

**Domen (knappen på grenen, 30 dygn, 7 787 rader):** alla sex ✅ OK — `lutning15_c` −1,7…1,7, `lutning30_c`
−0,8…2,2, `lutning60_c` −1,4…2,0 (°C per fönster, positivt = faller), `dagg_gap_c` −4,6…8,2, `min_yta_90min_c`
0,3…6,3, `utfall_rader` 0…18 (17 vanligast, 50 %). Spannen: lutning ±20 per fönster (fysikens yttergräns; bortom
det är ett givarhopp, som trendens egen vakt redan kastar mellan rader), gap och min-yta ±60, utfall 0–200.

**Bifynd:** `lutning30_c` har minimum **−0,7999999999999998** — en binär flyttalsrest i en `numeric`-kolumn.
Skrivaren avrundar alltså inte (13/9-läxan: avrunda på TypeScript-sidan till fler decimaler än mätvärdet har).
Ofarligt för besiktningen, men en tröskel på 0,8 skiljer −0,8 från −0,79999. Eget kort innan S2 sätter en tröskel
på fältet.

**Vad det INTE bevisar:** att värdena är rätt. Vakten säger att de är fysiskt möjliga och fria från sentineler;
T-A (första frostnätterna) säger om lutningen förutsäger något.

## #193 (15/9 2026) Spärren synlig på riktigt — `shadow_log.suppressed` skrivs efter två dygns tystnad

**Bengts ja 15/9 (kort #188).** #127 a (13/9) byggde kroken `onSuppressed` i motorn och kolumnen i sql/016 — men
skuggmotorn kopplade aldrig in kroken, så kolumnen har stått `[]` i varje rad sedan dag ett. Inte en regression:
`git log -S` visar att strängen bara någonsin funnits i motorkällan, aldrig i `main.ts`. Nu lyssnar skuggmotorn
och skriver `[{kind, id, distM, by, sinceS}]` per körning — vad regel 1b kastade, tystat av vad, med vilken marginal.
Skuggrapporten får fältet `sparren` (kastade totalt och per par "X tystad av Y"), så beviset är publikt.

**Bevis som gäller:** en körning med `sparren.kastade > 0` efter deploy — inte commit-hashen. Rutter med tät
kameraföljd (E18 Örebro→Stockholm, 28 kameralarm/dygn) ger den inom några varv.

**RÄTTELSE 16/9 (Axel):** orsaken är känd och var hans egen. Kroken skrevs i den GENERERADE `index.ts`
(bundle-skuggmotor rad 4: "ändra aldrig här"), bunten skrev över den från `main.ts`, deployen gick utan krok,
kolumnen verifierades som skriven — tom — och #127 bokförde spärren som synlig. "Det är fjärde gången samma fel
på tio dagar: verifierat att något fanns, inte att det fungerade." Inte en regression: ett bygge som aldrig fanns.
Läxan står i CLAUDE.md (#196). Beviset med innehåll väntar fortfarande: 20:00–22:00Z 15/9 och natten gav 0
kastade — septembers farubild konkurrerar sällan inom 45 s.

## #194 (15/9 2026) Trendarkivets flyttalsrester: en 26-minuters lucka 13/9, rundad i efterhand — och gapet var orundat

**Bengts ja 15/9 (kort #189).** Värdevakten (#192) visade `lutning30_c` min −0,7999999999999998. Källan: tabellen
föddes 13/9 14:21, den första knappkörningen skrev TypeScript-lutningar oavrundade, och avrundningen till tre
decimaler kom 14:47 (9b6b317, flyttalsläxan). SQL-vägen (018) räknar i `numeric` och är exakt. **Men `dagg_gap_c`
var fortfarande orundat** i `publish/trendkandidat.ts` (`r.yta - r.dagg`) — samma klass av fel, ännu inte fångat.

**Två rättelser:** (1) gapet avrundas till tre decimaler vid beräkningen, som lutningen; (2) sql/020 rundar de
befintliga raderna (fem kolumner, idempotent — rör bara rader som inte redan är rundade). Bevis: migrationens
bevisrad räknar orundade rader före/efter; värdevakten ska visa −0,8, inte −0,79999.

**Varför nu och inte "före S2":** en tröskel på 0,8 skiljer −0,8 från −0,79999, och att i stället avrunda vid
jämförelsen i S2 är exakt fällan 13/9 — två sidor som avrundar olika.

## #195 (15/9 2026) Två öppna mätvaktsissues — ett tomt listsvar utan felkod, och vakthunden hade inget försvar

**Bengts order 15/9 ("utred #224/#268", sedan "ja till båda").** #224 (mätvakten, öppen sedan 13/9 10:07Z, 52
kommentarer en per timme) fick sin sista kommentar 15/9 13:07Z. Nästa timkörning, 14:07:04Z, skapade #268 med
samma innehåll — och har kommenterat där sedan dess. #224 var aldrig stängd eller återöppnad (inga händelser),
hade etikett och markör på plats; ingen vakthund-deploy skedde 15/9 före 15:51Z, inget anrop från Actions,
ingen röd vakthund kring 14:07Z. Det enda som skiljer den timmen är GitHubs svar: `GET /issues?state=open&labels=
matvakt` gav inget som matchade. Orsaken går inte att se — sökningen loggades aldrig. Effekten är deterministisk:
koden tar första träffen i listan (nyast först) och kommenterar där; en äldre dubblett stängs aldrig av någon.

**Beslut:** (1) #224 stängd 21:39Z som dubblett av #268. (2) Skyddsnät i vakthunden, `enOppen(etikett, mark, rad)`,
för alla fem egencykel-issuerna (vakthund, mätvakt, källvaktspåminnelse, kassavakt, nyckelkalender): ett tomt svar
frågas om EN gång innan något skapas; finns fler än en öppen stängs de äldre som dubbletter med kommentar; antalet
träffar skrivs i `rad` så att nästa gång är observerbar. Samma fälla som kassavaktens 1 000-tak (CLAUDE.md): ett
list-API som svarar tunt utan felkod ser ut som sanning.

**Bevis som gäller:** `matvaktprov` efter deploy — raden `issue matvakt: 1 öppna` i vakthundens svar, en kommentar
i #268 och ingen ny issue.

**Utfall 15/9:** vakthund deployad 21:41Z; `matvaktprov` 21:43Z: raden `issue matvakt: 1 öppna — bevisat via utfallet: provet kommenterade #268 (kommentar 9), ingen ny issue; själva raden ligger i pg_nets net._http_response och läses inte utifrån` i svaret, 1 öppen mätvaktsissue (#268), ingen ny skapad.

## #196 (16/9 2026) Axels svar på eftermiddagsrapporten 15/9 — fem beslut, en rättelse, en omprioritering

**Axel verifierade själv:** 27 `rain_segments` på CDN med rätt manifest-sha; **26 objekt i `facit`** sedan 16:00Z
15/9 (från noll efter 5 657 körningar). Han bekräftade också att `suppressed`-felet var hans (rättelse i #193).

**Fem svar, nu beslut:**
1. **`rain_segments` som egen nyckel — rätt.** Det enda skälet för motorsidan vore om apparna skulle läsa den i vinter,
   och det ska de inte förrän V-C dömt. Skuggans egen instans är billigare än risken.
2. **Steg D, utgångspunkt (beslut först efter V-C):** vattenplaning gäller vid yta över +4, frysrisk under +1 — de
   utesluter varandra i praktiken, prioriteten dem emellan är nästan teoretisk. **Under halka (#68), över vilt.**
   Text i frysriskens form: *"Vattenplaning framöver — sakta ner."* Sex ord; punktkälla säger "framöver". Öppet att
   avgöra då: `rain_segments` är en segmentkälla (radar per segment) — kort #81 D låter segmentkällan säga "på
   vägen framöver". Kriteriet i kartans §7.8 (handling · text · prioritet före vektorn) är därmed förberett, inte uppfyllt.
3. **PAT-rotationen:** Axels, senast 15/11; bevis = publicering med ny nyckel; kalendern larmar 8/11.
4. **Facitknappen (S4) — ja:** två knappar under "Senast sagt", *Stämde* och *Stämde inte*. Inget annat — ingen fritext
   i en bil. Loggas lokalt, skickas när bilen står stilla. **Krav i samma commit:** produktbokens Om-avsnitt säger
   "vi samlar in: ingenting"; med knappen samlas larm-id + svar in — inte position, inte resa, men något. Det ska stå
   ordagrant, frivilligt och synligt, annars bryter knappen löftet. Kort #21 bär detta.
5. **V-B3 mot fem varningar på ett varv:** loggen ska vara RÅ. Räknar skuggan per regndygn redan i loggen är tröskeln
   inbyggd i mätningen och antalet syns inte längre. Dom-knappen räknar — samma princip som spärrloggen: logga vad
   som hände, låt domen tolka. Så är det byggt (#191).

**Två synpunkter på det byggda:**
- **Kamerafacit, reservation:** 100 % inom 15 km beror på att 738 av 744 väglagskameror står vid en station. Radien
  säger att det finns en kamera nära — inte att bilden visar rätt sträcka. Det avgörs i mars när någon öppnar bilderna.
- **Den stoppade väglagsfrågan är rapportens viktigaste fynd** — och den säger att kartans fog-tabell inte är
  tillförlitlig som byggplan: den är läst, inte körd, precis som §5.6 varnar. Kartan är fryst; rättelsen (R16) läggs i
  bedömningens bilaga A och förs in när kartan öppnas — vilket villkoret "efter bygge + mätning" nu tillåter.

**Omprioritering:** regntäckningen 13 % oroar Axel mer än rapporten låter. `regn_h` vilar på arkivet, och `regn_h` är
efterhalkans ena halva. **S1 (skuggjämförelsen) körs INNAN något mer byggs på `regn_h`** — före S2, inte efter.
Bedömningens §2.1 bär det som grind.

**Läget på morgonen 16/9 (02:20Z):** `rain_segments` 38, `vb` 13 skuggvarningar på fyra rutter sedan 17:30Z,
`sparren` 0, `weather` fortfarande tom (ingen station ≤ 3 °C) — N4:s fältbevis väntar.

