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
