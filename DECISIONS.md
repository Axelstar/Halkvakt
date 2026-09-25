# DECISIONS.md — Halkvakt

**Numrering (20/9, kort #220):** ett beslut = ett unikt nummer, nästa är alltid högsta + 1 — `scripts/beslutsnumren.ts` i CI fäller dubbletter och skriver ut nästa lediga. Sju nummer delades ut två eller tre gånger 1–12/9; historiken skrivs inte om, men de senare posterna bär bokstav (#55b, #60a/#60c, #72a, #73b, #78b, #124b, #126b; tillägg heter #30a, #31a, #40a, #77-bevis) och hänvisningarna i md-filerna pekar på rätt bokstav. Fyra nummerrymder delar skrivsättet #NN — skriv alltid `DECISIONS #NN`, `kort #NN`, `issue #NN`, `PR #NN`.

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

## #31a — TILLÄGG: gravstenarna raderade + läckan var INTE tätad förrän deploy
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

## #40a — BEVISAT 31/8 16:00
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

## #55b (1/9 2026) Kameratoleransen 100° → 60° (Bengts fynd på Bodenresan)
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
motsatsen till vad #55b skulle ge.
ROTORSAKEN: Trafikverkets Camera.Bearing är riktningen kameran TITTAR, alltså rakt MOT
trafiken den fotograferar. Bekräftat av två oberoende källor: NVDB anger "vinkeln kameran
tittar i", medan databaser som listar färdriktning använder "diametralt motsatt vinkel";
och en publicerad mätplats för NORRgående körriktning har bäring 158° (sydsydost).
Vi jämförde bearing direkt med kursen — 180° fel sedan dag ett.
VARFÖR DET INTE SYNTES FÖRRÄN NU: med den gamla toleransen 100° var fönstret 200° och båda
kamerorna i ett par släpptes ofta igenom, så felet såg ut som "den varnar för fel kamera
ibland". När #55b skärpte till 60° blev filtret precist — och började konsekvent filtrera
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
METODLÄXA: jag ändrade två saker samtidigt i #55b (tolerans 100→60) och #57 (vändning 180°).
Det gjorde fältrapporterna svårtolkade. En variabel per bygge när något mäts i verkligheten.

## #60a (2/9 2026) Vi deployade med rött kontraktstest — rutinfel, inte kodfel
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

## #60c (2/9 2026 kväll) Frost-rekognoseringen + provet: Norge öppnar, men luckan är inlands
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

## #72a (5/9 2026) KURSORMÄTNINGEN: pipelinen frias av Trafikverket, läckan förblir otestbar
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
Bengts "ja bygg" efter #72a, där kursorbytet omdefinierades från MÄTNING till FÖRBÄTTRING:
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


## #73b (8/9 2026) Vakthunden flyttad till Supabase — en vakthund får inte dö med det den vaktar
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


## #78b (8/9 2026 kväll) Vakthundens larmväg var trasig — den kunde bara säga "allt bra"
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
KVAR: PAT:en behöver Issues:Write, annars kan vakthunden inte larma (#78b).

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

> ⚠️ **Överspelad samma dag — grind A föll INTE.** Med #75:s givarvakt och marginalvakten blev domen **INGEN DOM** (#129, #131; A1 klarar, A2 oavgjort, A3 klarar), uttryckligen *"inte ett nej"*. Rättat i #180 (14/9) och igen i #288 (21/9), efter att rubriken nedan lurat två sessioner. Läs aldrig den här rubriken ensam.

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
exporterad men otestad sedan #73b. Logiken prövades i stället fristående, och larmvägen prövas
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

## #124b (12/9 2026) Väglagets ålder — end_time-klausul + vakt 6c, INGEN åldersgräns
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

## #126b (12/9 2026) Överskriven check: jag deployade vakthunden FÖRE rebasen mot main
Bengts fråga: "deployade du vakthunden efter 3f2a43a? vilken version kör den?" Svaret:
nej. Jag deployade min lokala fil (med 6c) INNAN jag hämtade main, där Bengt samma dag lagt
check 7 (källvaktspåminnelsen, 2ca4609). Resultat: main hade båda, driften hade bara min.
BEVIS: ?paminnelseprov=1 gav inget svar från check 7. Efter omdeploy från main svarar
både 7 och 6c. Mätvaktens #198 var alltså en ÖVERSKRIVEN CHECK, inte en missad takt.
Detta är samma fel som 2/9 (#60a: deployade med rött kontrakt) i ny form: jag deployade
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
lokala vakthundsfil före en pull, så driften fick 6c men tappade check 7 (#126b). Main hade båda,
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
`node:test` — samma skäl som `kadensTimmar` legat otestad sedan #73b.

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
refaktorering** — risk utan vinst, och #126b är läxan: en deploy tog då tyst bort check 7. Grinden ger
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
Axels regel (#126b).

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

**Bevis 16/9 (fältbeviset):** skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den. Fälten kan bara läsas ur `weather[]`, alltså fanns de publicerade med värde — manifest-sha stämde vid avläsningen 12:00Z. Vägen dit: **Bevis 15/9:** publicera deployad 15:52Z; live.json 2026-09-15T16:00:01Z: `weather` **tom** — ingen station ≤ 3 °C klarar givarvakten (lägsta riktiga yta 7,1 °C; Rovaniemi 0,0 °C mot luft 12,6 stoppas av #75). Fälten bevisas i CI:s PostGIS (integration.test.ts) men ÄNNU INTE på CDN.

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

## #197 (16/9 2026) Spärrprovet — beviset framkallas i stället för att inväntas, och dbknapp läser äntligen svaret

**Bengts ja 16/9 (kort #191, bevis för #188).** Regel 1b tystar bara när två larm konkurrerar inom 45 s, och
septembers farubild ger aldrig det: 20:00–22:00Z 15/9 och natten gav 0 kastade. Ett bevis som vilar på vädret är
inget bevis (Axel: "verifierat att något fanns, inte att det fungerade"). Skuggmotorn får `?sparrprov=1`: två
kameror 300 m isär på ett rakt spår i 80 km/h — den första talar, den andra tystas ~14 s senare, kroken ger EN rad.
Provet skriver INGET i shadow_log (en provrad hade förorenat tystnadsfelet och upprepningen); svaret returneras.

**Och svaret blev läsbart.** dbknapp skrev ut pg_nets request-id, inte funktionens svar — varje prov bevisades via
sitt utfall (en issue) och vakthundens `rad` var oläsbar utifrån (avvikelse 15/9). Nu väntar dbknapp in svaret ur
`net._http_response` (högst 90 s) och skriver ut det kortat: `ok`, `problem`, `rad`, `suppressed`. Provet går till
skuggmotorns svenska cron-jobb, hittat på URL (inte namn) och utan `land=fi|no|dk`; exakt ett jobb får matcha.

**Bevis som gäller:** dbknapp `sparrprov` visar `suppressed: [{kind: camera, id: prov:kam2, by: camera, sinceS ≈ 15}]`.

**Utfall 16/9:** dbknapp `sparrprov` 02:42Z: svaret läst ur `net._http_response` — `suppressed` med 1 rad: {kind: camera, id: prov:kam2, distM: 470, by: camera, sinceS: 5} — kam2 tystad 5 s efter kam1 och talad först vid t=15 när 10 s-spärren släppt. Första provet 02:38Z FÖLL: kamerorna 14 s isär, båda talade — spärren är 10 s sedan kort #127 (13/9), inte 45 s som CLAUDE.md:s invariant säger.

## #198 (16/9 2026) S1 byggt: efterhalkans indata per station i skuggloggen — inget villkor, bara underlag

**Bengts "bygg S1 nu" 16/9, Axels grind (#196): S1 körs innan något mer byggs på `regn_h`.** Skuggmotorn loggar per
körning kolumnen `efterhalka` (sql/021): varje väderpunkt i ruttens ruta (+5 km) med N4:s råa fält — `yta`, `fukt`,
`regn_h`, `lutning15/30/60` — och `larm`: om motorn faktiskt larmade på stationen (`wx:<id>` bland larmen). Inget
villkor: S2 (E på K2) sätter det senare, och varje rad ska kunna spelas upp mot vilket villkor som helst. Att lägga
villkoret i loggen vore samma fel som V-B3 per regndygn (Axel, #196). Skuggrapporten får `efterhalka` (stationer,
med regn_h, larmade).

**Tom i september, och det är rätt:** `weather[]` bär bara stationer ≤ 3 °C som klarar givarvakten — 0 sedan 15/9.
Första kalla natten i korridoren ger första raderna. **Bevis som gäller:** en `efterhalka`-rad med innehåll; tills
dess bevisas kolumnen bara som skriven (`[]`) — vilket enligt #196 INTE räknas som bevis.

**Utfall 16/9:** migration 021 (efterhalka jsonb, default []), deploy 02:36Z (skuggmotor + skuggrapport), 02:41Z (rättat prov); skuggrapportens `efterhalka` finns (0 stationer). **Innehåll kom samma dygn:** skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den — S1 mäter. En rad är dock ingen mätning: Axels grind (#196) är uppfylld först när `efterhalka` bär nätter, inte ögonblick.

## #199 (16/9 2026) Kartan öppnad en gång för R1–R16 — och fryst igen

**Bengts order 16/9 ("för in R1–R16 i kartan").** Frysvillkoret från 15/9 (#186) var "nästa ändring efter att något
byggts och mätts". NU-listan är byggd och mätt (#187–#198), så villkoret är uppfyllt. R1–R15 (granskningens
rättelser, sedan 15/9 i bedömningens bilaga A) och R16 (Axel 16/9: fog-tabellen läst, inte körd — #154:s F1 var
F4/F5 i koden) är införda: §5.2 (regn-raden), §5.6 (R16 med regeln "F1 först när det är verifierat i kod att ingen
port läser fältet"), §7.8 (kandidaterna prövade mot kriteriet, Axels utgångspunkt för D), §14. Bannern säger att
kartan är fryst igen; bilaga A är struken och står kvar som historik.

**Vad som inte ändrades:** inga tal, inga fogkostnader utöver R16, inga nya avsnitt. Kartan säger fortfarande
*varför*; bedömningen säger *vad och när*.

## #200 (16/9 2026) Invarianten skrivs om till motorns verkliga regel — och takten mäts i stället för antas

**Bengts beslut 16/9 ("kör, skriv om invarianten och lägg in måtten").** Spärrprovet (#197) visade att CLAUDE.md:s
produktinvariant "max 1 spoken alert / 45 s" inte stämde med motorn: sedan kort #127 (13/9) kör motorn en
prioritetsmedveten spärr på 10 s. Valet stod mellan att backa motorn och att skriva om texten.

**Beslut: motorn står, texten skrivs om.** 45 s var en gissning ur PLAN §1; 10 s är härlett ur kamerornas
minimidistans (520 m ⇒ 15,6 s i 120 km/h) så att en fartkamera aldrig tystas av takten. Det verkliga felet 45 s
gav var att en oviktigare fara tystade en viktigare — kameran talade, isen 20 s senare kastades, och när spärren
släppte var isen 61 m bort (v23). "Silence is a feature" betyder inga *fel* ord, inte färre ord: inom 10 s får
bara en viktigare fara tala, samma fara upprepas aldrig inom 10 min / 5 km, lägre prioritet kastas — köas aldrig.

**Och inget nytt tidstal utan mätning.** Skuggrapporten får `takt`: tätaste följden i sekunder mellan två
yttranden i samma körning (totalt och per rutt) och antalet följder inom 60 s. Om det talet någonsin visar att
förare får för mycket i öronen är det där ett tak ska komma ifrån — som V-B3 — inte från en siffra som låter lagom.
Loggen är rå (Axel, #196); rapporten räknar.

**Reservation:** invarianten är Axels och vektorernas domän — hans ja på texten väntar. Ingen motorändring,
ingen vektor rörd. **Axel sa ja till invarianttexten 16/9** — den är därmed fastställd med dubbelsignatur. Bevis: skuggrapporten bär `takt` efter deploy.

**Utfall 16/9:** skuggrapport deployad 02:51Z; `takt` 02:52Z: tätaste följd 70 s (E4 Sundsvall→Umeå), följder inom 60 s: 0 av 110 yttranden på 24 h; per rutt 70 · 145 · 370 · 380 · 525 · 3 665 s.

## #201 (16/9 2026) S4 steg 1: förarfacitets backend — öppen endpoint med flit, dubbellåst tabell, och ärligheten om vad ett svar är

**Bengts "kör S4" 16/9, efter räkningen (≈ 80–100 Actions-minuter för hela S4, 4–5 % av kassan; arbete ≈ 3 dagar).**
Steg 1 av fem: tabell `driver_facit` (sql/022), edge-funktionen `facit-svar`, vakthundsraden "förarfacit: n svar".

**Vad som sparas:** varnings-id (motorns `hazardId`), när varningen talade, svaret ja/nej, plattform, appversion.
Ingen identitet, ingen position, ingen resa. **Men ärligt:** ett varnings-id pekar på en fara med koordinat och
tiden säger när — ett svar ÄR en plats och en tid, en gles resa. Beslut #186 tog det med öppna ögon för tolv
testare med samtycke; Om-avsnittet i produktboken ska säga just det ordagrant (Axel, #196), inte "ingenting".

**Öppen endpoint, med flit.** Appen kan inte bära en hemlighet (CLAUDE.md), så `facit-svar` kräver ingen nyckel.
Skyddet är formen: strikt schema (id 1–64 tecken, ISO-tid inom ±48 h, svar ja|nej, app android|ios), 512 byte,
tak 2 000 svar per dygn (tolv testare × 30 varningar är 360 — taket är mot flod, inte mot förare). Ingen IP
sparas. Tabellen är dubbellåst som arkivet (RLS utan policy + REVOKE): inget kan läsas tillbaka via REST.
Räcker för en beta i känd krets — inte för allmänheten, då krävs #21:s sensorbeslut.

**Idempotent:** appen skickar när bilen står stilla och kan skicka om; nyckeln (id, t, app) gör omsändning
ofarlig, och ett ÄNDRAT svar på samma varning ersätter det förra — förarens senaste ord gäller.

**Förkastat:** att posta direkt till PostgREST med anon-nyckeln som väntelistan gör — det hade lagt en nyckel
i appen och en INSERT-policy på en tabell som ska vara stum; funktionen validerar och begränsar, det gör inte
en policy.

**Bevis som gäller (steg 1):** efter deploy — POST med giltigt svar ⇒ 204, ogiltigt ⇒ 400, GET ⇒ 405, och
vakthundens rad "förarfacit: 1 svar" (läst via dbknapp, som nu visar `rad`). Steg 2–5: Android, iOS,
PRODUKTBOK, Axels ja på flödet — med mellanstopp efter Android.

**Utfall 16/9 03:08Z:** migration 022 (7 kolumner) · deploy facit-svar + vakthund gröna · curl: giltigt **204**,
samma igen **204** (idempotent), `svar=kanske` **400**, GET **405**, t från 1/9 **400** · vakthundens rad
**"förarfacit: 1 svar"** — läst ur larmprovets issue #289, INTE ur dbknapp-svaret: pg_net:s svarstimeout är 30 s
och vakthundens hela varv tar längre, så `net._http_response` bar "Timeout of 30000 ms" (funktionen kör klart
ändå; issuen bevisar det). Avvikelse att avgöra: höj vakthund-jobbets `timeout_milliseconds` så proven blir
läsbara den vägen — rör cron-kommandot, alltså Bengts ord.

## #202 (16/9 2026) S4 steg 2: facitknappen i Android — två knappar, en brytare, en kö som töms när bilen står stilla

**Axels form (#196), byggd:** under "Senast sagt" två knappar, *Stämde* och *Stämde inte*, ingen fritext. Bara när
betatestet är på (brytaren i Inställningar, AV tills föraren själv slår på den) och bara på en varning som bär ett
id. Svaret loggas lokalt (`Facit.kt`, ren Kotlin, JVM-testad: ett svar per varning, ett ändrat svar ersätter och
blir osänt igen, kroppen är exakt fem fält och inget annat). Skickas av `FacitSender` när bilen stått stilla 30 s
(under 3 km/h, en gång per stopp) eller när appen öppnas — aldrig under körning, inga timers, ingen polling
(skill §3). Nätet borta ⇒ nästa stopp.

**Historiken bär nu varnings-id** (`AlertEntry.id`, fjärde kolumn, bakåtkompatibel med rader från före 16/9).
**Om-avsnittet skriver om löftet ordagrant** (Axel #196): *"Undantaget är betatestet, om du själv slår på det: då
skickas varningens id, klockslag och ditt svar — det säger ungefär var du var när rösten talade. Inget annat."*
Brytartexten i Inställningar säger detsamma.

**Rättat i förbifarten:** "Senast sagt" (#24) visade den ÄLDSTA raden — `firstOrNull` på en lista med nyaste sist.
Nu `lastOrNull`. Syntes först när knappen skulle sitta på rätt varning.

**Fotostudion:** `--ez fotostudio_facit true` (bara debug-byggen) slår på betatestet och lägger en påhittad
kameravarning så skärmbilden visar knapparna; android.yml tar dessutom `shot-6-betatest.png` av brytaren.

**Bevis som gäller:** android.yml grön på grenen (JVM-tester inkl. `FacitTest`, emulatorn), skärmbilderna i
produktboken, och — det som räknas — ett svar från en riktig telefon i `driver_facit`. **Mellanstopp:** Axels ja på
flödet innan iOS byggs (steg 3).

## #203 (16/9 2026) S4 steg 3: facitknappen i iOS — samma form, samma text, samma regler; kompileras av Axel

**Axels ja på Android-flödet 16/9 ⇒ steg 3.** Spegel av Android (#202): `Facit.swift` (ren Swift: ett svar per
varning, ändrat svar ersätter och blir osänt, kroppen är exakt fem fält), `FacitSender` (URLSession, skickar när
bilen stått stilla 30 s under 3 km/h, vid `stop()` och när appen blir aktiv — aldrig under körning, inga timers),
`Prefs.facitOn` (AV tills föraren själv slår på den), `Prefs.lastSaidId` (kortet vet vilken varning), knapparna i
`LastSaidCard` som `FacitButton` (egen fil, skill-regeln), BETATEST-avsnittet i Inställningar med samma text som
Android, Om-panelen med undantaget ordagrant, och introduktionens löfte: *"Vi samlar in: ingenting — om du inte
själv slår på betatestets facit i Inställningar."*

**En tillgänglighetsändring:** kortet "Senast sagt" hade `.accessibilityElement(children: .combine)` — med knappar
i kortet måste VoiceOver kunna trycka dem var för sig, så `.contain`.

**Vad som INTE är bevisat här:** Swift-appen kompileras inte i CI (ios-engine.yml testar bara motorpaketet på
Linux) och inte på den här maskinen. Beviset är Axels Xcode-bygge — och ett svar från hans telefon i
`driver_facit` (`app = 'ios'`). Regeln från 2/9 gäller: be aldrig Axel arkivera medan ios-engine är röd; den är
grön (motorn orörd).

**Utfall 16/9:** Axel byggde grenen i Xcode — **gick igenom** — och PR #291 mergades (main @ 0239f03). Kvar för S4: en
iOS-skärmbild till produktboken (steg 4) och ett riktigt svar från en telefon i `driver_facit` (steg 5, fälttest).

## #204 (16/9 2026) Vakthundens cron får vänta 120 s på svaret — proven blir läsbara

**Bengts ja 16/9.** pg_net väntar som mest `timeout_milliseconds` på funktionens svar; vakthundens varv tar längre än
de 30 s som stod i jobbet, så `net._http_response` bar "Timeout of 30000 ms reached" medan funktionen körde klart
ändå (#197: skuggmotorns svar lästes, vakthundens blev timeout, och steg 1-beviset togs ur en issue). sql/023 höjer
till **120 s** via `cron.alter_job` — bara timeouten, inget jobb öppnas eller stängs (kort #85), kommandot med nyckeln
skrivs aldrig ut. Kassavaktens tunga varv (05/11/17/23 UTC) ryms.

**Bevis som gäller:** migrationens bevisrad visar `timeout_ms = 120000`, och nästa `larmprov` via dbknapp skriver ut
vakthundens `rad` i stället för en timeout.

**Utfall 16/9:** migration 023: `timeout_ms = 120000`; larmprov 03:43Z: vakthundens svar läst ur `net._http_response` — status 200, `larmvag: ok`, rad-raderna lästa: mätvakten 8 flöden/0 problem · förarfacit 1 svar · issue matvakt 0 öppna · nyckel PAT 2026-11-22 (66 dygn) · Supabase 2026-12-08 (82 dygn) · issue vakthund 1 öppna (larmprovet).

## #205 (16/9 2026) S4 steg 5 förberett: förarfacit syns i skuggrapporten, och fälttestets recept

**Bengts "gör nummer 2" 16/9.** Steg 4 (iOS-bild) och 5 (fälttest) kräver en telefon och en förare — det jag kan
göra är att beviset syns utan mig: skuggrapporten (publik JSON) får `forarfacit` — svar senaste 7 dygn, ja/nej,
android/ios, senaste tidpunkt — läst med service-nyckeln ur den dubbellåsta tabellen, fail-soft. Provsvaret från
03:08Z (android, ver "prov") ska räknas som 1 tills det första riktiga kommer.

**Fälttestets recept (Android, debug-APK ur android.yml på main; iOS ur Axels bygge):** Inställningar → BETATEST →
*Svara på varningarna* PÅ (läs texten — den säger vad som skickas). Kör tills rösten talar. Stanna, öppna appen:
under "Senast sagt" står repliken med *Stämde* / *Stämde inte*. Tryck. Svaret går iväg när bilen stått stilla 30 s
eller när appen öppnas nästa gång. Bevis: `forarfacit.svar_7d` räknar upp i skuggrapporten, och vakthundens rad
"förarfacit: n svar" nästa timme.

**Vad som INTE bevisas av receptet:** att svaret är sant. Det är dom-knappens sak i januari (S6), mot kamerafacit.

**Utfall 16/9:** skuggrapport deployad 03:53Z; `forarfacit` 03:54Z: svar_7d 1 · ja 0 · nej 1 · android 1 · ios 0 · senast 03:07:58Z — provsvaret, som andra POST:en skrev om från ja till nej (senaste ord gäller).

## #206 (16/9 2026) Fotostudio-krok för iOS — produktbokens bilder utan en körning

**Bengts "gör fotostudio-kroken för iOS" 16/9.** Steg 4 kräver två skärmbilder av det nya iOS-bygget (Senast sagt med
knapparna, Betatest-brytaren), och knapparna syns bara på en riktig varning. Android har `--ez fotostudio_facit`;
iOS får startargumentet `-fotostudio_facit` i `HalkvaktApp.init()`, inuti `#if DEBUG`: slår på betatestet och lägger
in *"Fartkamera om femhundra meter."* med id `cam:fotostudio`. Receptet står i `ios/MAC-GUIDE.md`. Kompileras bort ur
release-byggen — ingen väg in i det som testarna får.

**Bevis:** Axels nästa Xcode-bygge (kompilering) och de två bilderna i `docs/produktbok/`. Ett svar tryckt i
simulatorn skickas på riktigt och syns i skuggrapportens `forarfacit` med app = ios.


## #207 (16/9 2026) iOS 0.3.6 (9) arkiverad och uppladdad — första bygget sedan 0.3.5 (2/9)
Axel arkiverade och laddade upp 12:21. Bygget bär tre saker som legat på main:
 • Prioritetsmedveten spärr, golv 10 s (#127, 13/9). Motorn ÄR rörd sedan 0.3.5 — receptet
   sa "orörd", det var fel. Bengt kommer höra skillnaden: tätare varningar när flera faror
   kvalificerar, is får avbryta en kamera. Avsiktligt.
 • Facitknappen Stämde/Stämde inte + betatest-brytaren (S4). Knappen är AV tills testaren
   slår på den. Tabellen driver_facit: sju kolumner, ingen position, ingen resa.
 • Fotostudio-kroken -fotostudio_facit (debug) för produktbokens bilder.
Kontrakt: ios-engine, ci, android gröna på faac4ff. Inget rött — inte 0.3.4 om igen.
BEVIS SOM VÄNTAR: första raden i driver_facit med app = ios. Det är beviset att hela kedjan
håller — knapp → facit-svar → tabell → skuggrapport. Fartkameran är rätt första test:
en fara vi vet är sann, kräver ingen halka.
Två veckor mellan byggena. 67 servercommits nådde telefonen utan deploy (lägg till, ersätt
aldrig); 5 appcommits väntade. Läxa: motoränderingar och appändringar ska inte ligga på
main i tre dygn utan bygge — skuggan kör då en annan motor än telefonen.

## #208 (16/9 2026) Fälttestets första fynd: ett svar tryckt med vakten av skickades inte förrän nästa appstart

**Bengts fälttest 16/9 med 0.3.6 (#207):** körde mot en fartkamera, tryckte *Stämde* — och svaret kom inte till
`driver_facit`. Skälet är en lucka i sändningsreglerna, inte i trycket: knapparna sitter på hemskärmen, som visas när
vakten är av, och sändningen triggades bara av stillastående *medan vakten kör*, av `stop()` och av att appen kommer i
förgrunden. Trycker man efter att vakten stoppats händer inget av det förrän appen öppnas nästa gång — svaret låg
kvar i telefonen.

**Rättelse på båda plattformarna:** vakten av = bilen står stilla ⇒ svaret skickas direkt vid trycket. Under körning
gäller den gamla regeln (stillastående 30 s i tjänsten). iOS bumpas till 0.3.7 (10); Android-APK:n byggs av CI.

**Rättelse av mitt eget recept till Axel (#207 påpekade det):** "motorn är orörd sedan 0.3.5" var fel — spärren
10 s (#127, 13/9) ligger i motorn och når telefonerna först nu. Bengt kommer höra tätare varningar när flera faror
kvalificerar, och is får avbryta en kamera. Avsiktligt (DECISIONS #200).

**Läxa:** "skickas när bilen står stilla" var rätt regel men fel villkor — stillastående mättes bara av en tjänst som
inte körde. Beviset avslöjade det: rapportens `forarfacit` stod kvar på 1.

## #209 (16/9 2026) Sändningsstatus under facitknapparna — fälttestets andra fynd: svaret nådde aldrig servern

**Bengts fälttest, fortsättning:** efter #208 öppnade Bengt appen flera gånger — inget svar kom. Serversidan friades
med ett iOS-format prov från Claude (204, `ios: 1` i rapporten); felet sitter i appen mellan knappen och nätet, och
appen sa ingenting om det. Det är samma sorts tystnad som #157:s kamerafacit: en fail-soft-gren utan spår.

**Rättelse på båda plattformarna:** sändaren skriver vad som hände i `facitStatus` — *"Skickat 12:03 (1 svar)"* eller
*"Kunde inte skicka 12:03: HTTP 400 …"* / nätfelet — och kortet visar raden under knapparna (grön/gul). `try?` som
svalde felet i iOS är borta. Nästa försök säger själv var det fastnar.

**Diagnosen som återstår** (Bengt: blev knappen fylld och texten "Tack …"? Axel: `facit-svar`-loggen — anrop från
telefonen och statuskod?) avgör om det är knappen, lagringen eller nätet. Ingår i 0.3.7 (10).

## #210 (16/9 2026) Fälttestets rotorsak: iOS-knapparna satt i en vy som ingen ser

**Bengt, efter körningen:** *"Det enda jag kunde göra var att trycka på Svara på varningarna. Sen kom jag inte vidare
till något annat."* Han tryckte alltså aldrig på Stämde/Stämde inte — knapparna fanns inte på skärmen. `LastSaidCard`
(#24) är **död kod sedan skinnet v3 (2/9)**: ingen vy refererar den; hemskärmen `VaktenView` visar "Senast sagt" som
en textrad. Jag la knapparna i kortet utan att kontrollera att kortet visas — spegelbilden av Androids `LastSaidCard`,
som faktiskt används, lurade mig. #208 och #209 var därför rättelser av fel som inte var det verkliga felet, även om
båda står kvar som riktiga förbättringar (direktsändning, statusrad).

**Rättelse:** `FacitRow` under "Senast sagt"-raden i `VaktenView` — knapparna, "Tack."-raden och statusraden. Bara
betatestare, bara på en varning med id. Hemskärmen visas när vakten är av ⇒ svaret skickas direkt. `LastSaidCard` är
märkt som död kod och lämnas (eget kort om den ska bort). Ingår i 0.3.7 (10) — Axels nästa bygge.

**Läxa:** en vy som finns i repot är inte en vy som visas. "Spegel av Android" var sant om koden, inte om skärmen.
Skärmbilden hade avslöjat det — och iOS har ingen fotostudio i CI. Det är kostnaden för att iOS bara kompileras hos Axel.

## #211 (16/9 2026) Grind V-B byggd som knapp — två mått mätbara, ett som säger nej i stället för att låtsas

**Bengts "kör A" 16/9, efter att första regndygnet loggats** (17 skuggvarningar på 8 rutter sedan 15/9 17:30Z).
`publish/grind-v-b.ts` + knappen `grind-v-b` dömer `shadow_log.vb` mot TROSKLAR-VATTENPLANING §3.

**V-B1 (falsklarm ≤ 20 %) mäts** mot §2:s enda fällande källa: närmaste stations `rain_sum_mm` inom 10 km och
±30 min, max över bucketarna (regnet behöver ha nått tröskeln en gång). Trippeldelning som i V-A —
BEKRÄFTAD · DELVIS · TORRT — men §2:s definition styr talet: allt under tröskeln är falsklarm, och
delvis-kolumnen står bredvid så att man ser vad man dömer. **Tröskeln skrivs inte, den härleds:**
`REGN_UTLOSARE_MMH / RADAR_FAKTOR` = 2,0 / 0,65 ≈ 3,1 mm/h i stationens skala, importerat ur snapshotkärnan —
ingen kopia att driva isär, inget nytt tal i kontraktsgrinden.

**V-B3 (≤ 3 per rutt och regndygn) mäts**, med regndygn = dygn då rutten faktiskt hade något att varna för.
Att räkna torra dygn i nämnaren hade dolt brus bakom soliga veckor.

**V-B2 (miss ≤ 40 %) mäts INTE, och skriptet skriver ut varför** i stället för att producera ett tal:
`situation_archive` bär ingen orsak (situations.ts:37) — en olycka är facit på att något hände, inte på att det
var vattenplaning — och skuggan kör åtta rutter, inte hela landet, så en olycka utanför dem kunde aldrig ha fått
en varning. Antalet redovisas som underlag. Måttet kräver testarlogg eller granskad kamerabild (§2): betans
uppgift, inte knappens.

**Nollpolitiken:** en varning utan station inom räckhåll är OMÄTBAR, aldrig "rätt" — de räknas separat och
aldrig in i V-B1. Samma regel som radarns `regn: null`.

**V-C:s domspärr gäller** (≥ 200 varningar, ≥ 15 facit, ≥ 5 regndygn, ≥ 3 län): under underlaget skrivs inga
domar, bara tal och vad som saknas. Med dagens 17 varningar kommer knappen säga ⊘ i månader — det är rätt, och
det är skälet att bygga instrumentet nu: måttet ska inte formas av siffror man redan sett.

**Bevis:** självtestet (nio fall med känd sanning, grönt) och första skarpa körningen.

**Kontraktsgrinden fällde bygget — och hade rätt.** Radien hette först `MAX_KM = 10`, och det namnet bär redan
husets **ankarradie** (50 km i sju filer: hur långt bort en station får vara och ändå räknas som GRANNE i en
interpolation). Grinden såg en åttonde kopia som drivit isär och stoppade CI. Det var ett namnkrock, inte drift —
två olika storheter med olika tal och olika dokument — men grinden kan ingenting om semantik (den säger det själv i
sin egen huvudkommentar), och att lägga till ett `filer:`-undantag hade varit att böja husets kontrakt för min
skull. Rätt åtgärd var att döpa om: `DOMANDE_STATION_KM`. **Läxa:** ett namn som redan bär en storhet i huset får
inte återanvändas för en annan — grinden är namnblind, och nästa läsare är det också.

## #212 (16/9 2026) Grind V-B körd första gången: TORRT = 0, men bara fyra av fjorton nådde tröskeln

**Första skarpa körningen 12:19Z** (14 dygn; `vb`-loggen börjar 15/9 17:30Z). **⊘ DOMSPÄRR — ingen dom**:
17 varningar mot V-C1:s 200, 0 facitbekräftade händelser mot 15, 2 regndygn mot V-C2:s 5. Talen nedan är
underlag, inget annat. Nio län är däremot redan uppfyllt (V-C2 kräver 3).

| Mått | Utfall | Krav |
| :-- | --: | --: |
| Mätbara varningar | 14 av 17 (3 utan station inom 10 km — OMÄTBARA, aldrig inräknade) | — |
| BEKRÄFTAD (station ≥ 3,1 mm/h) | 4 (29 %) | — |
| DELVIS (blöt men under tröskeln) | **10** | — |
| **TORRT (station = 0)** | **0** | — |
| V-B1 falsklarm enligt §2 (allt under tröskeln) | **71 ± 24 %** | ≤ 20 % |
| V-B3 frekvens | 2 av 8 rutter över (E18 Karlstad 5,0 · Väg 19 Ystad 5,0 per regndygn) | ≤ 3 |
| Avstånd till dömande station | median **2,5 km**, längst 15,6 km | — |

**Det som betyder något är inte 71 %, det är nollan.** Ingen enda varning gick ut på en väg där stationen var
torr. Radarn och stationerna är alltså **eniga om att det regnar** i varje mätbart fall — de är oeniga om HUR
MYCKET. Det är en annan sorts fel än falsklarm, och det syns bara för att trippeldelningen behölls: hade §2:s
tvådelning använts rakt av hade raden lytt "71 % falsklarm" och dolt att noll av dem var grundlösa.

**Sannolik orsak, och den står i tröskeldokumentet självt (§3.4):** *"Grovheten är känd och accepterad: en
5-minutersbild ställs mot en 30-minuterssumma."* En radarbild fångar en topp; stationens 30-minuterssumma
medelvärdesbildar samma skur. Radarn ska därför systematiskt ligga högre än stationens tal — och jämförelsen
mot tröskeln straffar den skillnaden en gång till, eftersom tröskeln härletts ur radarns skala (2,0 / 0,65).
Kalibreringsfaktorn 0,65 mättes på par där båda > 0, alltså på intensitet — inte på toppighet.

**INGET ÄNDRAS PÅ DEN HÄR KÖRNINGEN.** Tröskeln är dubbelsignerad (#155/#156), faktorn likaså (#154), och §5
kräver samma signaturer för att röra dem. Att flytta ett tal för att utfallet ser bättre ut på andra sidan är
precis vad huset finns emot. **Frågan som ska ställas till Axel när underlaget räcker:** ska V-B1 jämföra mot
tröskeln eller mot "regnade det alls" — och i så fall, vad blir kvar av påståendet? Underlaget för det beslutet
är den här kolumnen (DELVIS), och den växer med varje regnvecka.

**Att läsa igen vid nästa körning:** ligger DELVIS kvar nära 10 av 14 när N passerar 200 är det tidsupplösningen,
inte radarn. Faller TORRT-kolumnen från 0 är det däremot ett riktigt falsklarm och en helt annan fråga.

## #213 (16/9 2026) Grind V-B in i måndagsserien — och varför den inte får hoppa över tomma veckor

**Bengts order 16/9: "kör den varje regnvecka."** Knappen läggs sist i den befintliga mätserien, måndagar 07:40,
efter grind-v-a 07:20 som mäter samma spår från andra hållet (grind-a 05:40 · smhi 06:00 · v3 06:20 · trv 06:40
· höjd 07:00). Mätvakten (vakthundens check 6a) bevakar schemalagda flöden, så en missad måndag larmar själv —
grinden får sin vakt utan extra arbete (#81 regel 5).

**Det här öppnar inget som #85 stängde.** #85 gällde `bridges.yml`, en cron som körde var sjätte timme mot en fil
som aldrig ändrades: 32 körningar som "hoppade över" och debiterades en hel minut var. Måndagsserien är motsatsen
— sex grindar som mäter växande kurvor — och V-B hör hemma i den.

**Ingen "hoppa över om inget nytt"-spärr, med flit.** Frestelsen är att spara minuten en torr vecka, men det är
exakt #85:s fälla i omvänd form: checkout och `npm ci` kostar minuten oavsett, och ett jobb som tyst hoppar över
ger en tidsserie med hål i. En vecka utan nya `vb`-rader är också ett svar. Kostnad: ~1 min/vecka ≈ 4 min/månad,
mot dagens 130–278 min/dygn.

## #214 (16/9 2026) Halkordlistan vidgad: sammansättningarna talar, motåtgärderna tiger (kort #97 + S8)

**Bengts beslut 16/9: "kör grepp 1, vidga ordlistan."** Motorns halk-regex krävde att faroordet stod FÖRST i
ordet — en regel satt för att "fläckv**is** Våt" gav åtta falsklarm i augusti. Priset var att sammansättningar
tystnade. Mätt 16/9 mot motorns riktiga regex: på ett kod 1-segment tiger **Rimfrost** och **Halkrisk** (kortet
visste) och **Nysnö** och **Halt** (nytt fynd). Arkivet har inga av dem i dag — men arkivet är från september.

**Regeln, i två delar:**
- `SLIPPERY_INFO = (?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)` — ordbörjan, fläckvis-skyddet kvar.
- `SLIPPERY_STAM = (snö|frost)` — räknas även INUTI ord: Nysnö, Rimfrost, Blötsnö, Nattfrost.

**`halk` är medvetet INTE en stam:** "Halkbekämpning" och "Halkskydd" är motåtgärder, inte faror — därför står
halka/halkrisk/halkig explicit. Designen prövades mot 37 ord innan en fil rördes: alla befintliga ord oförändrade,
elva tysta börjar tala, fyra fällor (fläckvis, Halkbekämpning, Halkskydd, Salthalt) tiger.

**Elva ställen, inte tre.** Motorn i TS/Kotlin/Swift, skuggmotorns bunt, tystnadsfelet (mäter mot motorn),
**snapshotens SQL-filter** (avgör vad som ens NÅR motorn — utan det hade Nysnö tigit ändå, segmentet kommer aldrig
med i live.json), publiceras bunt, vakthundens vinterkoll ×2 och kodgrinden (TS + SQL ×2). SQL-listorna saknar
"mycket besvärligt" med flit — kod 3 passerar redan på `condition_code >= 2`.

**Vektor v24_vinterord_kod1 (S8 + #97):** sju kod 1-segment. Packad snö (S8), Rimfrost, Nysnö, Halkrisk och Halt
larmar; Halkbekämpning och fläckvis Våt tiger. v11_silent_drive oförändrad. **5-metersregeln bet:** på jämna
kilometer låg gränsen **0,65 m** från en fix — samma fälla som v15 — så avstånden är förskjutna 11 m (marginal
10,3 m på båda sidor, mätt före frysning).

**Tre saker grindarna fångade som jag missat:**
1. **Kontraktsgrinden fällde bygget** — två kontrakt jag inte hittat (*Snapshotens halkfilter*, *Vinterorden i
   vakthunden*) sökte den gamla formen och fann noll kopior. Grinden gjorde exakt sitt jobb: en kopia som tyst
   försvinner är lika farlig som en som tyst ändras.
2. **Mitt nya SQL-kontrakt buntade ihop snapshot och vakthund** i ett — det grindens egen kommentar varnar för
   (*"tvingat fram en falsk enighet"*). Borttaget; de tre befintliga, avgränsade kontrakten fick den nya formen.
3. **Kodgrinden bar egna SQL-kopior** av farlighetsorden som nu var i otakt med dess TypeScript. Följer nu.
Plus ett nytt kontrakt: *Halkstammarna i MOTORN* (engine.ts, skuggmotorns bunt, tystnadsfelet — golv 3).

**Generatorn har glidit isär från vektorerna:** `gen-vectors.ts` kallar v05 `v05_throttle_45s` (filen heter
`v05_throttle_floor_10s`) och saknar v18–v23. En fullkörning hade skrivit en spökfil. Den har nu ett filnamnsfilter
och en varning; att synka listan är ett eget kort.

**Rösten säger ingen ny fras** — "Varning: halka rapporterad på vägen framför dig." — men i fler lägen. PRODUKTBOK
uppdaterad. **Mellanstopp:** Axels ja på v24 (S8 är Bengt + Axel) innan merge. Når telefonerna först med nästa
app-bygge (iOS 0.3.8, Android ur CI).

**Utfall 16/9:** PR #306 mergad (8026aa9) med Axels ja på v24 — Kotlin-vektorerna, Swift-vektorerna, CI och emulatorn gröna på grenen. Före deploy: `git diff origin/main` = 0 rader för alla tre funktionerna, buntarna i synk, skuggmotorns bunt bär `SLIPPERY_STAM`, publiceras bunt bär det nya SQL-filtret. **Deploy 14:51Z** från 8026aa9: skuggmotor (34 kB), publicera (790 kB), vakthund (715 kB). Funktionernas egna prov efteråt:
- **publicera:** första snapshoten efter deploy, `live.json` 15:00:01Z (karta-commit 2589faf, 9 899 byte): manifestets sha256 = filens sha256 — STÄMMER. `segments` 0, precis som 14:40Z och 14:50Z före deployen (inget segment i september har kod ≥ 2 eller ett vinterord), `rain_segments` 2. Filtret kör alltså utan fel, men det finns ännu inget för det att släppa in.
- **vakthund** (dbknapp `vinterprov` 14:54Z, svaret ur `net._http_response`): status 200, `problem: []`, raden *"vinterord i väglagsarkivet: nej"* — den nya SQL-satsen kör i drift över hela arkivet utan fel (ett fel hade blivit problemraden *"Vinterkollen kunde inte larma"*). Ingen ny provissue: `vinterord-prov` finns sedan #112 (11/9), engångslarm.
- **skuggmotor** (dbknapp `sparrprov` 14:59Z): `suppressed` med EN rad {camera, prov:kam2, 470 m, by camera, 5 s} och kam2 talad vid t=15 — identiskt med provet 02:42Z, alltså motorn i den nya bunten beter sig som den gamla där inget ändrats.

**Vad deployen INTE bevisar:** att driften faktiskt talar på Nysnö. Regeln är bevisad av v24 i tre portar; driften är bevisad av att funktionerna kör den nya bunten. Ett bevis MED innehåll (DECISIONS #196:s regel — inte kortet #196 nedan) kräver första vinterordet i väglagsdatan — arkivet har inget (vakthundens egen rad ovan). Vakthundens vinterkoll larmar när det kommer.

**Vägen till telefonerna — rättelse av raden ovan:** det blir inte 0.3.8. Senast uppladdade iOS-bygge är 0.3.6 (9); main bär 0.3.7 (10) sedan faciträttelserna (#208–#210) och den är inte uppladdad. ETT bygge från main som 0.3.7 (10) täcker både facitknappen och ordlistan. Har Axel hunnit ladda upp 0.3.7 innan han läser detta: bumpa till 0.3.8 (11). Android-APK:n byggs av android.yml på main.

**Tre fynd i samma varv:**
1. **Vakthundens facitrad tappar klockslaget:** `String(df.senast).slice(0, 16)` på ett Date-objekt ger *"Wed Sep 16 2026 "* — datum utan tid. Min egen rad från S4 steg 1 (#201). Kort #196.
2. **"förarfacit: 2 svar" är två prov, inga riktiga svar:** id 1 = Android-provet 03:07Z (version `prov`), id 3 = mitt iOS-formade serverprov 11:47Z under felsökningen (`cam:prov-ios`, version `0.3.6`). Id 2 förbrukades av idempotensprovet (samma svar två gånger ⇒ ON CONFLICT). Det iOS-formade provet går INTE att skilja från ett riktigt svar på version eller plattform, bara på id:t — och skuggrapportens `forarfacit` räknar båda som svar i sju dygn. Kort #196.
3. **Generatorn i otakt med vectors/** (se ovan) har nu eget kort: #195.

## #215 (16/9 2026) Skyltfondsrundan krymper till tre samtal — och ett muntligt ja räcker

**Bengts beslut 16/9:** kontaktrundan gäller bara **halkbanan, trafikskolorna och intresseorganisationen (NTF)**.
Förhandssamtalet med fonden, skolskjuts, hemtjänst och åkeri stryks. **Ett muntligt ja räcker** för medverkan i
vinterns tester, och det skrivs in i ansökan — inga avsiktsförklaringar att skriva under.

**Kontrollerat innan planen skrevs om (16/9):**
- **Skyltfonden kräver inga underskrivna intyg.** Trafikverkets sida om projektbidrag säger bara att fonden *"ser
  positivt på projekt som genomförs i samverkan med samarbetspartner"*; formuläret (240909-f) frågar efter partnernas
  roll och åtaganden. Beslutet står alltså i regelverket, inte bara i önskan.
- **Riskutbildning del 2 är fortfarande obligatorisk.** Prop. 2025/26:127 tog bort introduktionsutbildningen, inget
  annat. Halkbaneförsöket (AP6) vilar på oförändrad grund.
- **NTF Skåne finns inte längre som eget förbund.** skane.ntf.se leder till NTF Jönköping, som har Jönköpings, Skåne,
  Blekinge, Kalmar och Kronobergs län. Kontakten blir verksamhetschefen där — v5:s "länsförbundet, inte riksförbundet"
  hade lett fel.

**Leverans:** Kontaktplan v6 i Bengts Drive-mapp ("Kontaktplan Skyltfonden 2026-09-16 v6", https://docs.google.com/document/d/1qL3maskkfMqV1_hEbA2vyuyiVZdV-7I5H2O-R1sny9w/edit). Noggrant talmanus
per samtal (öppning, varför just ni, frågor som låter dem berätta, idén, frågan, meningen som läses upp), svar på
vanliga invändningar, röstbrevlåda, tackmejl och uppföljningstabell. v5 och Bengts kopia av v5 orörda. Två första
uppladdningsförsök av v6 (samma namn, formateringsfel vid import) ligger i Drive-papperskorgen.

**Så hanteras ett muntligt ja (Claudes utformning):** meningen som ska stå i ansökan läses upp och godkänns; villkoret
("om bidraget beviljas, inte bindande") sägs högt; namn och titel antecknas; **tillstånd att nämnas med namn frågas
uttryckligen** — ansökan är en offentlig handling hos Trafikverket. Ett kort tackmejl samma dag *rekommenderas men krävs
inte*: det ger partnern chansen att rätta och projektet ett skriftligt spår om fonden frågar. I ansökan skrivs
"muntligen bekräftat [datum] ([namn], [titel])".

**Nytt sedan v5 som bärs in i samtalen:** Stämde det?-knappen (S4), rösten som inte tjatar (prioritet + spärr, #127),
kamerabild som facit (N1), fler vinterord (#214), efterhalkan i skuggan (S1), tröskeldokumentet daterat 1/9, och
testbilssidan som demonstration. Formulerat som det är: knappen når iPhone med nästa testversion, vinterorden med
nästa app-bygge, appen finns ännu inte öppet i butikerna.

**Följd som väntar på beslut — ansökan måste ändras (v5 → v6):**
1. **AP3 (pilot med yrkestrafik) saknar partner** när skolskjuts, hemtjänst och åkeri stryks: stryk eller skriv om.
   58 000 kr i kostnadsplanen och meningar i syfte, hypotes, innovationsgrad, personalplan och trafiksäkerhetsnytta.
2. "Avsiktsförklaring bifogas" → "muntligen bekräftat"; bilaga 2 och checklistans underskriftskrav stryks.
3. "NTF Skåne" → "NTF Jönköping (verksamhet i bland annat Skåne)".
4. YKB-raden i AP6 står bara om Bulltoftabanan säger ja till tung trafik.

## #216 (16/9 2026) Trafiklärare som testförare, AP3 sänkt — ansökan v6 skriven (363 200 kr)

**Bengts beslut 16/9:** *"trafiklärare får vara testförare om de vill. Vi sänker ap3. Du kan skriva v 6 men den kan
klart bli omarbetad."*

**Tolkningen av "sänker AP3" (Claudes, uttalad så den kan rättas):** AP3 finns kvar men krymper till det enda som har
en partnerbas efter #215 — **trafiklärare som testförare**. Flottpiloten (hemtjänst, skolskjuts, distribution) och
morgonöversikten för planerare lämnar ansökan; morgonöversikten lever kvar i B2B-spåret (egenfinansierad), inte i fonden.
Alternativet — behålla en flottverksamhet utan partner — valdes bort: en pilot utan deltagare är det svagaste en
beredningsgrupp kan läsa, och flottkontakterna är strukna. **AP3: 58 000 → 21 000 kr** (30 tim: rekrytering,
instruktion, uppföljning, analys av svaren mot facit, gruppintervju). **Sökt belopp: 400 200 → 363 200 kr.**
Lärarnas medverkan är frivillig och oersatt, i linje med kontaktplanens "utan kostnad för projektet".

**Varför trafiklärarna bär AP3:** de kör dagligen i alla väder och är vana att bedöma både väglag och förare — deras
"stämde / stämde inte" blir ett **expertfacit** i AP1 vid sidan av kamerafacit och vanliga testförares svar. Under
lektioner svarar läraren, inte eleven vid ratten. Knappen finns redan (S4, egenfinansierad).

**Ansökan v6** (https://docs.google.com/document/d/1xB6iLPuLCMp8SylrGaOLFNjpniXkYsAJIaIg-7GaT9c/edit): AP3 omskrivet; syfte punkt 3, H1, AP1:s facitlista, innovationsgrad punkt 5 (trafiklärare som
expertfacit ersätter yrkestrafikens planering), personalplanen och sida 8 följer. Avsiktsförklaringar → muntligt
bekräftad medverkan (#215). NTF Jönköping. Dataskydd säger ordagrant vad återkopplingen skickar (ett svar pekar ut en
plats och en tid). **Fyndet i v5:** sida 8 sa "tre led" men hade fyra rubriker — nu tre. Byggt sedan v5 och beskrivet som
förutsättning, inte sökt: förarnas återkoppling, kamerabild vid varning, efterhalkans indata i skuggan.

**Kontaktplan v6.1** (https://docs.google.com/document/d/1avAw47OAtqKnTeUzDV6ODTR3iXJ6ttW3eaSXaeNVR7c/edit): trafiklärarfrågan är fast del av trafikskolesamtalet, står i meningen som läses upp, och
tre nya invändningar/svar (vad det innebär, att läraren trycker, ingen ersättning). v6 märkt "ersatt av v6.1", inget raderat.

**Följd som väntar:**
1. **Inbjudningsvägen för lärarna (Axel):** iPhone — extern TestFlight-grupp kräver Beta App Review; intern kräver
   teammedlemskap. Android — APK ur CI eller Play intern testning (Play-kontot finns inte än). Avgör före november.
2. **AP3 kräver minst ett trafikskole-ja till lärare som testförare** senast 25/9 — annars skrivs AP3 om före sändning.
3. Bengt och Axel omarbetar v6 fritt; siffrorna i kostnadsplanen summerar (kontrollerat: 363 200).

## #217 (16/9 2026) Grepp 2 skrivet: TROSKLAR-KOMBINATIONEN — grinden för kombinationen, gemensam kalibrering, tröskelregeln (UTKAST)

**Bengts order 16/9: "kör grepp 2"** (bedömningens S10, kartans §8 C och D, §13.2). Kartan är fryst, så C och D blev ett
eget dokument: `docs/TROSKLAR-KOMBINATIONEN.md`. **Utkast — inget gäller förrän det är fastställt.** C och D fastställs
av Bengt och kontrasigneras av Axel. T ändrar TROSKLAR-FRYSKLASSNINGEN i Axels lydelse och kräver båda.

**C — fyra grindar för en kombination:** KB-A *bär varje del sin roll?* (varianter utan en del i taget, B3-paret,
marginalvakten — svaret på kartans §7.3: en del som föll ensam får bära i kombination, men bara via en fråga skriven
före mätning) · KB-B *räddar kombinationen mer än den kostar, mot dagens motor?* (efterhalkan: Ö-B:s golv 5 %/25 %,
oförändrade) · KB-C *domens giltighet* (den strängaste delens underlag, vart och ett: Ö-C och T-C) · KB-D *förarfacit*
(en ny källa: "Stämde" bekräftar, "Stämde inte" fäller bara utan annat facit och utanför nära-miss-bandet, ensamt
fäller det ingen dom, trafiklärare separat, provrader aldrig). Plus fem byggvillkor före grinden: additiv, graciös
degradering, ärvda vakter, eget vittne, skugga före röst.

**D — sju regler för gemensam kalibrering.** Skälet är räknat, inte resonerat: efterhalkans parametrar ur de
fastställda svepen bildar ett rutnät på **1 296 punkter** (5 184 med N_varning). En dels tröskel väljs i dag på en
kurva med 3–4 punkter — med 1 296 finns alltid en vinnare, även i brus. Därför: delarnas trösklar rörs aldrig (D1) ·
startvärden före första natten, utan utfall (D2) · **kalibrering och dom på skilda nätter** (D3) · målet skrivet före
(D4) · alla prövade punkter redovisade (D5) · frysning innan domdata läses (D6) · en andra kalibrering är en ny fråga (D7).

**T — Axels lydelse** (*"en storhet som inte kan motbevisas av en mätning får inte utlösa; extrapolation faller; minne
av mätningar består"*) med fem preciseringar, bland dem **vittneskravet**: en regel vars vittne är tomt är skriven men
inte i kraft. Vittnesläget 16/9: betans två premisser har var sitt levande vittne (kamerafacit 26 objekt; minutdata),
utfallet har ett som får bekräfta (olyckor) och inget levande som får fälla — en januaridom utan det blir OAVGJORT.

**Tre fynd på vägen:**
1. **Facitstackarna säger emot varandra om kamerabilden:** SKUGGAN §2 *nej* (svartis syns inte), VATTENPLANING §2 *ja*
   (torr väg motbevisar vatten), OVERGANGAR §8 *ja* utan förbehåll. Förslag: bilden får fälla **premissen** (blöt väg)
   men aldrig **utfallet** (is). OVERGANGAR §8 ändras bara som eget beslut vid fastställandet.
2. **FRYSKLASSNINGEN §7 säger att regeln "aldrig får mjukas upp — oavsett signaturer".** Dokumentets §6.4 svarar att
   Axels lydelse inte öppnar någon utlösare den gamla skrevs för att stoppa — och att ändringen inte får göras om Bengt
   eller Axel läser den som en uppmjukning. Det avgörs uttryckligen, inte i förbigående.
3. **Bedömningens §4.2 bar ett avgjort beslut som öppet:** #52-vektorn (S8) avgjordes 16/9 med v24 (DECISIONS #214).
   Flyttad till tagna.

**Förslag som väntar på Bengt:** KB-D4 (≥ 30 förarsvar, ≥ 5 förare, ingen > 25 %) · kalibreringspunkten 1 februari
(D3) · kamerabildens regel. **Inga byggminuter:** bara markdown.

**Rättelse samma varv, efter kodläsning:** första versionen sade att kombinationens varianter "skuggas redan" av Ö-B och
T-B. Det gör de inte — de kolumnerna är inte byggda. Varianterna ska spelas upp ur S1:s råa logg, och den läst i koden
(`publish/snapshot-core.ts`, `skuggmotor/main.ts`) har tre gränser: `regn_h` är timmar sedan *något* regn (minsta regn
bara > 0), radarns r finns inte i loggen, och `weather[]` bär bara stationer med yta ≤ 3 °C (startband bara +1…+3).
**Av rutnätets 1 296 punkter kan 48 spelas upp.** Nytt beslut för Bengt före första frostnatten: vidga loggen (kod,
byggminuter) eller stryk de sveppunkterna för kombinationen (D2). Dokumentets §3, §4, §7 och §9 rättade.

## #218 (16/9 2026) Mätt: utan radarn försvinner högst ~13 % av de blöta timmarna vid kalla stationer — ingen av dem för att mätare saknas

**Bengts "kör mätningen" 16/9**, på reservationen i TROSKLAR-KOMBINATIONEN: vad kostar det att stryka radarn ur
efterhalkans premiss "vägen är blöt"? Frågan i `scripts/matningar/radar-tackning-2026-09-16.sql`, körd via dbknapp
(35135412610). Station-timmar, 14 dygn, blöt inom 4 h; mätare > 0 mm, radar > 0,1 mm/h på väg inom 5 km — båda i
den generösa änden av sina svep, så radarns andel är en **övre gräns**.

| | Alla station-timmar | Kalla (yta ≤ +5 °C, givarvakt) |
| :-- | --: | --: |
| Timmar | 71 702 | 2 592 |
| Med mätardata | 90,0 % | **99,5 %** |
| Väg inom 5 km (radar möjlig) | 90,7 % | 80,5 % |
| Blöta timmar (mätare eller radar) | 36 718 | **115** |
| Bara radarn visste | 5 374 (14,6 %) | **15 (13,0 %)** |
| — varav station utan mätare | 1 211 | **0** |
| — varav mätaren visade torrt | 4 163 | 15 |

**Stationsnivå:** 755 av 848 stationer har mätare (89,0 % — övergångsdokumentets 89 % stämmer). **Alla 160 kalla
stationer har mätare.** Förlusten vid frost handlar alltså inte om saknade mätare, utan om timmar där mätaren visade
torrt men radarn såg regn inom 5 km — antingen duggregn mätaren missar, eller regn som föll bredvid stationen.

**Reservationer:** 115 blöta kalla timmar är tunt (13 % ± 6 procentenheter). September är regn, inte snö — en
vippskålsmätare fångar snö dåligt, så radarns bidrag kan växa i vinter. Radararkivet har 269 kompositer på 14 dygn
(ungefär en i timmen), vilket kan dölja korta skurar och drar åt andra hållet. **Nettoriktningen är okänd.**

**Följd:** rekommendationen att stryka radarn för kombinationen i vinter står — kostnaden är mätt och måttlig, inte
försumbar. Samma fråga körs om inom första frostmånaden (en byggminut), innan januari-domen.

## #219 (16/9 2026) Axels läsning av TROSKLAR-KOMBINATIONEN: sex ändringar, 1 248 punkter strukna

**Axel läste utkastet i sin helhet** och skrev under på innehållet: C och D (dom mot dagens motor, en kalibrering per
säsong på skilda nätter, alla prövade punkter redovisade) och T (en varning får bara bygga på något en mätning kan visa
var fel). §6.4 lämnar han till Bengt — *"läser du det som uppmjukning görs ändringen inte"*.

**Bengts beslut 16/9: "ja till alla tre, gör de sex ändringarna."**
1. **De 1 248 punkter som inte kan spelas upp ur S1:s logg stryks för kombinationen i vinter**, radarn inräknad.
   Priset står i dokumentets §3: radarns bidrag mätt till högst ~13 % av blöta kalla timmar (#218), "blöt" = allt regn
   över 0, fallet syns först under +3 °C. Axel: 48 punkter går att kalibrera ärligt på, 1 296 gör det inte.
2. **Radarmätningen körs om inom första frostmånaden**, före januari-domen — snö fångas sämre av mätarna.
3. **Sex ändringar i dokumentet:** V1 flytt i tid · V5 betan är facitinsamling och får stängas av · §3 strykningen med
   pris · KB-D3 följden (januari kan bli OAVGJORT trots många "stämde") · §5 D2 skyddar januari, D3 mars · §7 utfallet i
   januari och testförarnas information.

**Där jag skärpte Axels förslag — flytt i tid.** Axel ville att ett flyttat försprång (#153) ska räknas som tillägg. Det
räknas nu så **bara om spärrloggen (`suppressed`) inte visar någon undanträngd varning**: 10-sekundersspärren och
upprepningsspärren kan tysta en annan varning utan att någon regel "tystar". Kortare försprång räknas aldrig som tillägg.

**Fortfarande öppet:** §6.4 (Bengt, med Axel) · utfallet i januari — förslaget KLARAR/OAVGJORT ⇒ betan fortsätter, FALLER
⇒ ut (Bengt och Axel vid fastställandet) · principen för betans startvärden, D2 (S3, före frosten) · fastställandet.

## #220 (16/9 2026) Tröskelregeln i Axels lydelse fastställd — tätad i tre punkter, inte en uppmjukning

**Bengts beslut 16/9:** *"täta 6 och ta axels lydelse först … Axel håller med gällande otätade text"*. TROSKLAR-KOMBINATIONEN
§6.4 besvaras: **ingen uppmjukning, på villkor att tre hål täts** — tätade i samma commit.

1. **T1 prövar per tillstånd, inte på utfallet.** Utkastet prövade *påståendet* inom utfallsfönstret. En prognos kan
   alltid fällas i efterhand, så regeln hade släppt igenom varje prognos.
2. **T5: interpolation är förbjuden som utlösare.** Utkastet sade "varken tillåten eller förbjuden", fast T3:s
   definition — ett värde där ingen mätt — omfattar den.
3. **T6, ny: prognoser och modellprodukter** (SMHI:s varningar, frysklassningen, en trend räknad framåt) får stärka,
   försvaga eller förlänga (N_varning, E1) en varning som vilar på en mätning — aldrig ensamma utlösa.

**Införd i TROSKLAR-FRYSKLASSNINGEN §1 och §7**, med den gamla meningen citerad. **Skyddet följer med:** regel T i sin
helhet får skärpas men aldrig mjukas upp, oavsett signaturer — samma skydd som den gamla meningen hade. Ett smalare
skydd hade i sig varit en uppmjukning.

**Skärpt mot min rekommendation — #153 beslut 2 får ingen förbehållen öppning.** Jag rekommenderade "förbjuden tills
#153 beslut 2 fattas". Men den gamla meningen förbjöd en modellerad temperatur som avtryckare *oavsett signaturer*; en
öppning skriven i förväg hade gett den nya regeln något den gamla förbjöd — just den uppmjukning §6.4 frågade om. Beslut
2 lever, men måste klara T1–T3 som allt annat: ett vittne **på platsen** som kan fälla värdet. I de källor vi har i dag
finns inget sådant mellan stationerna.

**Alternativ som valdes bort:** (a) behålla den gamla meningen — bokstavligt förbjuder den minne av mätningar, alltså
betan (kartan §13.2); (b) Axels lydelse otätad — de tre hålen ovan; (c) skydda bara T3 — den gamla meningen var skyddad
som helhet; (d) en förbehållen öppning för #153 beslut 2 — se ovan.

**Avsteg från dokumentets §9:** T fastställs före C och D, inte i samma varv. D-raden i varje tröskeldokument och
kamerabildens rad i OVERGANGAR §8 väntar på fastställandet av C och D. **Axel** har hållit med om den otätade lydelsen;
tätningarna ändrar inte hans tre meningar, bara preciseringarna, och är alla skärpningar — han ska ha läst dem
(bedömningen §0b). Kartan §13.6 (*"Om tröskelregeln ska skrivas om till Axels lydelse — öppet"*) är besvarad, men kartan
är fryst (#186) och rättas efter bygge + mätning.

**Funnet i samma genomgång:** TROSKLAR-SKUGGAN §4 (a)/(b) låter segmentprognosen *tala* efter domen i mars 2027 — på
modellerade segment och nära ankare. Det krockade redan med den gamla meningen och krockar med T3. Inte rättat nu
(fastställt dokument, domen ligger ett år bort); kort #198.

## #221 (16/9 2026) #153: allvar som försprång — omformulerat, och väntar till efter grepp 2 och betan

**Bengts beslut 16/9:** *"gör 153 och omformulera 153"* — på mina två rekommendationer: #153 väntar till efter grepp 2
och betan, och omformuleras till försprång.

1. **Beslut 1 heter nu "allvar som försprång":** samma ord, tidigare (`leadM` per fara, 400–3 000 m). Formen är Axels
   egen (kartan §13.1: *"Rösten säger samma ord men tidigare"*) och redan beslutad för modifierare (#90 roll B, E1).
   **Struket ur kortet:** ordval (Axel: *"ett mätinstrument, inte en röst"*) och prioritet (E3 — det skulle tysta en
   olycka). Kostnaden blir F4, inte F5.
2. **Ordningen:** grepp 2 fastställt (C och D) → betan i november → S2: skattarens graderade nivå (utan graderat mått
   finns inget att sätta tiden efter, kartan §13.5) → eget tröskeldokument skrivet före mätning: svep för försprång per
   nivå och ett tak för undanträngda varningar i `suppressed` (V1) → skugga → dom, tidigast mars → F4 i tre portar.
   Rösten är Axels.
3. **Inget byggs nu.** Kortet är omskrivet så att ingen bygger det avvisade.
4. **Beslut 2** (interpolation mellan eniga stationer) är **fortfarande öppet** och skilt från beslut 1 — men utan egen
   öppning i tröskelregeln (#220).

**Alternativ som valdes bort:** bygga #153 före grepp 2 och betan — då döms betan i januari mot en motor vars försprång
ändrats under den, och KB-B mäter två saker på en gång. Kartan §13.6 (*"Om #153 ska omformuleras till försprång —
öppet"*) är besvarad; kartan är fryst och rättas efter bygge + mätning.

## #222 (16/9 2026) Betans startvärden (D2) — skrivna före frosten, utan utfall

**Bengts order 16/9:** *"startvärden för betan före frosten"*. Principfrågan — mitt i svepen eller i den försiktiga änden —
var inte avgjord. **Jag valde mitten, och den tystare av de två där svepet har två mittpunkter.** Värdena gäller tills
Bengt byter dem med en rad. Det får han göra fram till betans första natt, så länge ingen har läst facit eller räknat hur
ofta punkterna fyrar i S1:s logg.

**I klartext:** betan fyrar när ytan ligger mellan +1 och +3 °C, har fallit minst 0,8 °C de senaste 30 minuterna, och
stationens mätare visat regn inom de senaste 2 timmarna.

| Parameter | Svep | Startvärde | Varför |
| :-- | :-- | :-- | :-- |
| N | 1 · 2 · 3 · 4 h | **2 h** | mittpunkterna 2 och 3; 2 är tystare |
| Fönster | 15 · 30 · 60 min | **30 min** | mitten |
| Lutningströskel | 0,4 · 0,6 · 0,8 · 1,2 °C per fönster | **0,8 °C** (1,6 °C/h) | mittpunkterna 0,6 och 0,8; 0,8 är tystare |
| Minsta regn | > 0 · ≥ 0,2 · ≥ 0,5 mm | **> 0** | enda värdet som går att spela upp (#219) |
| Startband | +1…+3 · +1…+4 · +1…+6 °C | **+1…+3 °C** | enda värdet som går att spela upp (#219) |
| r (radar) | 0,1 · 0,5 · 2 mm/h | **av** | struken (#219) |
| N_varning | av · 2 · 4 · 6 h | **av** | mittpunkterna 2 och 4; 2 är tystare — och med N = 2 h är 2 h detsamma som av |

**Skälen till principen:**
1. **Betan samlar in facit** (V5). I den försiktiga änden fyrar den nästan aldrig — fall 1,2 °C på 15 minuter är
   4,8 °C/h — och då finns inga förarsvar att döma i januari.
2. **Januari kan ta bort grenen** (§7, förslag). Ett extremvärde riskerar att fälla idén för startvärdets skull: golvet
   (≥ 5 % nettonytt) i den försiktiga änden, taket (≤ 25 % falsklarm) i den generösa.
3. **Tystnad är en funktion.** Där svepet har två mittpunkter tas den tystare.
4. **Regeln är mekanisk.** Ingen kurva, inget facit och ingen rad i S1:s efterhalka-logg lästes när värdena valdes (D2).

**Punkten är en av de 48 som kan spelas upp** (§3), så KB-A:s varianter och kalibreringen har den i sitt rutnät.
**N_varning:s övriga värden (4 och 6 h) finns inte bland de 48** — om de kan spelas upp mot SMHI-arkivet (`sql/015`) är
inte prövat; tills dess står de utanför kalibreringen. **Vad punkten inte är:** en tröskel ur mätning. Den är gissad med
flit, och en dålig december är designen, inte ett fel (V5). **När S3 byggs** skrivs värdena i motorn och i
`scripts/kontraktsgrinden.ts` i samma commit (Axel, tre portar).

## #223 (17/9 2026) Radarn stryks inte — betan utan radar, radarn prövas i mars ur arkivet (väg C)

**Bengts beslut 17/9:** *"jag vill inte så gärna stänga radarn"* och därefter *"ja"* — på min rekommendation (väg C)
och på frågan om regnmängden skulle prövas. Jag läste "ja" som båda; menade Bengt bara provet räcker en rad.

**Rättelse av underlaget till #219.** Jag skrev 16/9 att radarn inte går att spela upp. Det gäller S1:s logg. Radar-
arkivet (`radar_precip`) gallras aldrig — ingen kod raderar i det — och kan kopplas till loggens stationer i efterhand,
som mätningen #218 gjorde. Valet presenterades som "bygg ut loggen eller stryk"; en tredje väg fanns.

**Beslutet (väg C):**
1. **Betan och kalibreringen 1/2 är oförändrade:** 48 punkter, radar av (#222). En radarvinnare i februari kunde ändå
   inte nå telefonerna: `radar_h` finns inte i live.json (uppskjuten #188, CPU) och apparna läser inte radarn förrän
   V-C är dömd (Axel 16/9).
2. **Radarn prövas i mars som egen variant i KB-A:** kombinationen i den kalibrerade punkten med radarn som tredje
   tecken på blöt väg, r = 0,1 · 0,5 · 2 mm/h — tre varianter, redovisade enligt D5.
3. **Samma källa på båda sidor.** Radarvarianten jämförs mot kombinationen räknad ur samma arkiv, inte mot loggen —
   arkivet och loggen skilde sig i 1 av 5 station-ögonblick i provet nedan.
4. **Går radarn igenom i mars** är det ett eget beslut om att bygga in den — inte en justering av betan.

**Villkor som följer:** kopplingen station↔väg skrivs före första frostnatten (FÖRSLAG 5 km, samma som #218 — en
definition, ingen inställning att kalibrera) · uppspelningen provkörs före januari · arkiven måste finnas kvar till
mars, och det gör de inte på gratisnivån (grepp 3, #83 steg 2, oktober).

**Provet 17/9** (`scripts/matningar/regnmangd-uppspelning-2026-09-17.sql`, dbknapp-körning 35182341540):

| Fråga | Svar |
| :-- | :-- |
| Hur mycket bär S1:s logg? | 2 658 skuggkörningar på 7 dygn, **5 med efterhalka-rader — 5 station-ögonblick** (16/9 06:00Z–17/9 04:30Z) |
| Går loggens `regn_h` att räkna om ur arkivet? | **4 av 5 lika** (±0,15 h); med simulerad gallring 4 av 5 lika och **5 av 5 inom en halvtimme** |
| Största skillnad | **2,7 h** i full upplösning — arkivet har fått data efter publiceringen. Vid N = 2 h: loggen blöt på 2, arkivet på 3 |
| Med minsta regn ≥ 0,2 eller ≥ 0,5 mm | blöt på **0 av 5** |
| Regnrader vid kalla stationer (yta ≤ 5 °C, 7 dygn) | 145 rader på 7 stationer: **96 under 0,2** · 37 mellan 0,2 och 0,5 · 12 minst 0,5; minsta värde 0,1 mm |
| Radarn mot loggens stationer | kopplingen fungerar: 5 av 5 har väg inom 5 km; ingen radar över 0,1 mm/h inom 2 h |
| Arkiven | radar sedan 2/9, 4,4 MB · väder sedan 24/8, 70 MB · databasen **165 av 500 MB** |

**Vad provet visar och inte visar.** Metoden fungerar, men fem station-ögonblick är ett funktionsprov, inte en
mätning. Regnmängden går att räkna fram ur arkivet på samma sätt som radarn, och den biter hårt: två tredjedelar av
regnraderna vid kalla stationer är under 0,2 mm. **Om regnmängden ska tillbaka som variant i efterhand är Bengts
beslut** — inte fattat här.

**Funnet:** S1 loggar bara stationer i skuggrutternas korridorer (`efterhalkaRader`, ±0,05°) och bara ytor ≤ 3 °C —
5 rader på ett septemberdygn. Om det räcker i vinter är inte mätt; arkivet ser alla stationer.

## #224 (17/9 2026) Startbandet och SMHI-förlängningen prövade — alla sex inställningar går att räkna ur arkivet

**Bengts order 17/9:** *"pröva startbandet. går smhi-förlängningen att mäta"*. Bara tillgång räknades — rader, fönster,
kopplingar — inte hur ofta någon variant skulle fyra (D2/D3). Mätfrågorna: `scripts/matningar/startband-smhi-uppspelning-2026-09-17.sql`,
dbknapp-körningar 35183998393 och 35184101126.

**Startbandet (+1…+4 och +1…+6 °C) går att spela upp i efterhand.**

| Fråga | Svar |
| :-- | :-- |
| Bär trend-tabellen (`trend_kandidater`) de varmare ytorna? | ja — sedan 8/9 **3 062** fallande ögonblick vid 3–4 °C (87 stationer) och **3 354** vid 4–6 °C (126), mot 1 388 vid 1–3 °C (43). Fallet för 15, 30 och 60 min finns i nästan alla rader |
| Tål den gallringen? | ja — fallen sparas färdigräknade, och tabellen gallras inte (sql/017) |
| Finns regnet i arkivet för de varmare raderna? | regn inom 48 h för **1 685 av 2 491** (3–4 °C) och **1 911 av 2 720** (4–6 °C), senaste 7 dygnen. Resten hade inget regn i arkivet — torrt och saknat går inte att skilja |
| Stämmer loggens fall med tabellen? | lika i 5 av 5 — **men alla fem var tomma** (inget fall), så jämförelsen säger inget om värdena |

**Rättelse av mitt svar 17/9:** jag skrev att 15-minutersfallet försvinner i gallringen. Det gäller råraderna, men
trend-tabellen byggdes 13/9 just för att spara fallen (#88).

**SMHI-förlängningen (N_varning) går att koppla men inte att mäta än.**

| Fråga | Svar |
| :-- | :-- |
| Finns vintervarningar i arkivet? | **nej** — inga `SNOW_ICE` eller `ICING`. Arkivet bär vind till sjöss, brand, vattenbrist, regn, översvämning |
| Följer giltighetstiden med? | för varningar arkiverade efter 13/9: **gula 13 av 13**, meddelanden 1 av 7. Före sql/015 saknas den av konstruktion (15 av 157 rader totalt) |
| Går kopplingen station × aktiv varning att köra? | ja — senaste 5 dygnen låg 15 av 747 stationer under brandmeddelande och 3 under vindvarning; inget av loggens 5 station-ögonblick |

**Tre gränser som inte går att mäta bort:** (1) bara varningar arkiverade efter 12/9; (2) arkivet sparar varje
publicering men inte när en varning försvinner (`ingest/db.ts`) — en varning som dras tillbaka i förtid ser ut att gälla
till sin sluttid; (3) vilka varningstyper och nivåer som räknas är självt osatt (TROSKLAR-SMHI-FORSTARKAREN F1, F2).

**Slutsatsen som ändrar läget.** Med #223 och den här mätningen går **alla sex inställningar att räkna fram ur
arkivet**: N och regnmängd ur väderarkivet, radarn ur radararkivet, fönster, fall och startband ur trend-tabellen. Av
de två skälen till strykningen #219 står alltså bara det ena kvar — **Axels: 1 296 punkter går inte att kalibrera
ärligt, 48 gör det.** Att loggen inte bär dem är inte längre ett skäl.

**Mitt förslag (inte beslutat):** kalibreringen står kvar på 48. Regnmängd, startband och SMHI-förlängningen prövas i
mars som radarn (#223) — var för sig mot den kalibrerade punkten, högst tio varianter. En variant som ser bättre ut i
mars byggs inte in direkt, den blir en ny fråga: med tio jämförelser kan någon se bra ut av en slump.

**Två frågor före kalibreringen 1/2:** (a) Bengt — strukna inställningar som varianter i mars; (b) Bengt och Axel —
**varifrån uppspelningen räknas.** Skuggloggen visar vad telefonen såg men bar 5 station-ögonblick på ett dygn (#223).
Arkivet ser alla stationer men får data i efterhand och skilde sig från loggen i 1 av 5.

## #225 (17/9 2026) Bengts ja på alla rekommendationer — vad det avgör och vad det inte täcker

**Bengts beslut 17/9:** *"jag svarar ja på alla dina frågor där du rekomenderat ja i den här sessionen"*. Tolkat som
frågorna i chatten 16–17/9 och bedömningens öppna beslutslista (§4.2) med rekommendationen ja.

| # | Frågan | Läge efter ja:et |
| :-- | :-- | :-- |
| 1 | #153 beslut 2 (interpolation) får ingen egen öppning i tröskelregeln (#220) | **beslutat** |
| 2 | Betans startvärden (#222) | **beslutade** |
| 3 | Strukna inställningar prövas i mars som varianter — regnmängd, startband, SMHI-förlängningen när vintervarningar finns; kalibreringen står på 48 (#223, #224) | **beslutat** |
| 4 | Kopplingen station↔väg för radarn: 5 km | **beslutat** |
| 5 | Ingesten sparar när en SMHI-varning försvinner, före första vintervarningen | **beslutat** — kort #199, byggt i samma PR (`sql/024`) |
| 6 | C och D fastställs | **Bengts del klar** — i kraft när Axel kontrasignerat. Då skrivs D-raden i varje tröskeldokument och kamerabildens rad i OVERGANGAR §8 (§9 steg 4) |
| 7 | Förslagen i C och D: förarfacits underlag (KB-D4) · kalibreringen 1/2 (D3) · kamerabilden fäller premiss, aldrig utfall | **Bengts del klar** — gäller med C och D |
| 8 | Utfallet i januari: KLARAR eller OAVGJORT ⇒ betan fortsätter, FALLER ⇒ grenen tas bort | **Bengts del klar** — väntar på Axel |
| 9 | #45 lapse 0,63 (S12) | **Bengts del klar** — väntar på Axel |
| 10 | TRV-anmälan om nio byvindgivare | **beslutat att skicka** — Bengt skickar själv; Claude skickar inget i hans namn |

**Täcks inte av ja:et — ingen rekommendation gavs:** varifrån uppspelningen räknas, skuggloggen eller arkivet (Bengt +
Axel, före 1/2, #224) · `marknadsforing.yml` (Axel + Bengt) · provraderna i förarfacit (kort #196, Bengt).

**Väntar på Axel:** kontrasignatur på C och D · utfallet i januari · #45 · läsa tätningarna T1, T5, T6 (#220).

## #226 (17/9 2026) Axels ja: C och D fastställda, tröskelregeln kontrasignerad, uppspelningen ur arkiven

**Axels beslut 17/9** (genom Bengt): *"Axel säger ja till alla rekommendationer"* — de sex punkterna i meddelandet till
honom. Bengts del av de tre nya rekommendationerna följer hans stående ja (#225).

| # | Beslut | Följd |
| :-- | :-- | :-- |
| 1 | **C och D fastställda** — Axel kontrasignerar Bengts ja (#225), med förslagen: förarfacits underlag (KB-D4) · den enda kalibreringen 1/2 på data november–januari (D3) · kamerabilden fäller premiss, aldrig utfall | **i kraft.** I samma commit (§9 steg 4): D-raden i ändringsparagrafen i tio tröskeldokument, och kamerabildens regel för kombinationer i TROSKLAR-OVERGANGAR §8 |
| 2 | **Utfallet i januari:** KLARAR eller OAVGJORT ⇒ betan fortsätter oförändrad till mars · FALLER ⇒ grenen tas bort | fastställt |
| 3 | **Tätningarna i tröskelregeln** (T1, T5, T6 — #220) | regel T kontrasignerad i sin tätade form |
| 4 | **#45 lapse 0,63 °C/100 m** (tidigare 0,71) | kort #45 rättat; ingen kod bär värdet i dag |
| 5 | **Uppspelningen räknas ur arkiven** — väderarkivet, radararkivet, trend-tabellen — **med skuggloggen som kontroll** | villkor: arkiven kvar till mars (grepp 3, oktober) · överensstämmelsen logg ↔ arkiv mäts vid första frosten och redovisas i varje dom |
| 6 | **marknadsforing.yml behålls och flyttas till pulsklockan** — flödets syfte är morgonen ("före pendlingen"), och GitHub-cronen levererade den 08:49–10:07 UTC mot bokade 04:45 | kort #200 |
| 7 | **Provraderna i förarfacit märks och utesluts — raderas inte** | kort #196: ISO-tid i vakthundsraden, filter på `alert_id` med `prov`, deploy och prov |

**Kamerabilden i OVERGANGAR §8:** regeln gäller kombinationer. (a):s egen rad — kamerafacit får fälla falsklarm — står
kvar. Att ändra den vore en **lättnad** av (a):s grind (färre falsklarm räknas), och betan behöver den inte.

**Inga öppna beslut kvar i bedömningens lista.** Det som återstår är arbete: kort #196, #199 (bevis), #200, och
uppföljningen med datum i bedömningen §0b.

## #227 (17/9 2026) Kort #196: provraderna i förarfacit märks i databasen, vakthunden visar klockslag

**Bengts order 17/9:** *"kör #196"* — på beslutet #226: provraderna märks och utesluts, raderas inte.

**Valet: en genererad kolumn, inte ett filter i funktionerna.** `sql/025` lägger `prov boolean GENERATED ALWAYS AS
(strpos(lower(alert_id), 'prov') > 0) STORED` på `driver_facit`. Definitionen finns på ett ställe och märker också
framtida prov utan kod. Vakthunden räknar `WHERE NOT prov` och skriver hur många prov som uteslöts; skuggrapporten läser
`prov=is.false`. **Alternativ som valdes bort:** samma villkor i båda funktionerna — två kopior av en regel som kan glida
isär (läxan bakom kontraktsgrinden) · radera raderna — Bengts och Axels beslut var att inte radera.

**Klockslaget:** vakthundsraden skrev `String(df.senast).slice(0, 16)`, alltså "Wed Sep 16 2026 " — datum utan tid. Nu
ISO i UTC, t.ex. "2026-09-16 11:47Z".

**Ordning i drift:** merge → `sql/025` med dbknapp (före deployen, annars saknar funktionerna kolumnen) → deploy av
vakthund och skuggrapport, var för sig → bevis: skuggrapportens `forarfacit.svar_7d` = 0 och vakthundens rad säger
"0 svar · 2 prov uteslutna".

## #228 (17/9 2026) Sessionsregeln: orientera vid start, sök innan något stryks, inga trådar bara i chatten

**Bengts order 17/9:** *"skriv in allt detta i claude.md som en handlingsregel för varje session"* — efter hans förslag
att varje session läser integrationskartan och bedömningen, så att inga obesvarade trådar lämnas efter.

**Regeln (CLAUDE.md, SESSIONSREGELN):** (1) vid start läses den senaste bedömningen hela, och kartan när den ändrats
eller ett nytt grepp börjar; (2) innan något stryks eller sägs vara omöjligt söks tabeller och nyckelord i repot;
(3) frågor och beslut från chatten skrivs in i bedömningen och DECISIONS i samma varv, med en kontroll före sessionens slut.

**Justeringar mot Bengts förslag, och varför:** kartan läses vid ändring i stället för varje gång — den är fryst till
efter bygge och mätning, och en omläsning kostar ~14 000 tokens utan ny information. Kontrollen i slutet lades till: trådar
tappas i chatten, inte i dokumenten, så en läsning i början hittar bara det som redan skrivits in. Sökregeln lades till
eftersom dagens största miss — radarn som "inte gick att spela upp" — inte stod i kartan eller bedömningen utan i
TROSKLAR-OVERGANGAR §4 och `sql/017`. En tabellista är 19 namn, ungefär 100 tokens.

**Ersatt:** sessionsprotokollets steg 1 sade att TAVLA, STATUS, BACKLOG och DECISIONS läses varje session — cirka 280 000
tokens, som i praktiken inte lästes. Steg 1 pekar nu på regeln och säger att de stora filerna söks i.

## #229 (17/9 2026) Bedömningen bär läget överst och stryks fortlöpande — kartan gör det inte

**Bengts order 17/9:** *"gör en uppdatering av bedömningen och bekräftar att strykningar som klar sker fortlöpande i det
dokumentet. Strykningar i integrationskartan förutsätter kanske läsning och det blir dyrt"* — och en lista där han ser
var vi är och vart vi är på väg.

**Gjort:** `docs/BEDOMNING-2026-09-15.md` har en ny översta sektion, *Läget 17/9*: en tabell över var vi är och en
tidslinje september–mars med vem som gör vad. Klara rader strukna: N4, S1, S10 och de rader i §0b som fått bevis.
**Regeln** står som punkt 4 i SESSIONSREGELN (CLAUDE.md): en rad stryks i samma varv som beviset finns, läget överst hålls
aktuellt, kartan stryks inte löpande. **Skäl:** kartan är fryst till efter bygge och mätning, och att stryka i den kräver
att den läses (~14 000 tokens) — bedömningen är listan, kartan är analysen.

## #230 (17/9 2026) Rekognosering: Trafikverkets öppna halkflöde är vårt väglag i annan form — inga fordonsdata

**Bengts order 17/9:** *"ja, kör rekognoseringen nu"* — på frågan om Trafikverkets öppna halkflöde (SRTI *"Temporary
slippery road"* på trafficdata.se) kunde täcka gatorna och ge januari-domen ett vittne.

**Vad som lästes:** katalogposten på trafficdata.se (CKAN-API:t) och Trafikverkets datautbytesportal — datamodellen,
situationssidan och frågesidan.

| Fråga | Svar |
| :-- | :-- |
| Var finns flödet? | Katalogposten pekar bara på Trafikverkets DATEX II-datamodell; ingen egen adress |
| Vilka datamängder finns? | Camera, LocationCode, Parking, RoadConditionSection, TrafficSafetyCamera, TrafficFlow, TravelTime, Truckparking, WeatherData och situationerna Accident, EmergencyInfo, Ferries, Frostdamage, Roadworks, **RoadSurfaceConditions**, Trafficmessage. **Ingen för fordonsdata eller SRTI särskilt** |
| Varifrån kommer halkuppgifterna? | `RoadSurfaceConditions`: *"Trafikledningen använder sig av kamerabilder, väderprognoser och information som entreprenörerna rapporterar för att bedöma väglaget"* — samma väglag som vi redan hämtar som `RoadCondition` |
| Åtkomst | POST till `https://api.trafikinfo.trafikverket.se/v2/datex.xml` med samma registrerade nyckel som vårt API |
| Sökord på portalen | varken "SRTI", "halk", "fordon" eller "Data for Road Safety" på situationssidan |

**Slutsats:** det öppna flödet ger inget nytt vittne och ingen täckning av gatorna. Bilarnas halkdetektering som
Trafikverket köper (Volvo, Nira Dynamics) och delar i Data for Road Safety syns inte i något öppet dataset. **Rättelse av
mitt svar 17/9:** jag kallade det "halkflöde från fordon" innan källan var läst.

**Kvar, som frågor till Bengt (bedömningen §4.2):** fråga en stad om egna data, och fråga Trafikverket om
fordonsbaserade halkhändelser publiceras öppet någonstans. Ingen live-hämtning gjordes — nyckeln finns bara i GitHubs
secrets, och dokumentationen besvarade frågan om källan.

## #231 (17/9 2026) Grepp 3: arkiven till mars — mätt, och gratisnivån räcker inte till vintern

**Bengts order 17/9:** *"kör grepp 3"*. Underlaget står i `docs/GREPP3-ARKIVEN.md`; mätfrågorna i
`scripts/matningar/grepp3-databasen-2026-09-17.sql` (dbknapp-körningar 35220139396 och 35220310144).

**Mätt:** databasen 168 MB (92 MB 9/9) — cirka 9 MB/dygn brutto i en mild september. Svenska väderdata 71 MB;
finska 21 MB och norska 13 MB, **ogallrade**; **pg_crons körningslogg 18 MB och rensas aldrig**; 54 500 döda rader i
det svenska väderarkivet. Gallringsjobbet lyckas varje natt.

**Läst hos Supabase 17/9:** gratisnivån skrivskyddar databasen vid 500 MB — då stannar ingest-live och appen visar gammal
data — och har inga backuper. Pro: 8 GB, dagliga backuper, funktioner 400 s i stället för 150 s, från 25 USD/mån.

**Uppskattat:** vintern kräver cirka 3 GB (november–mars), och bruttotakten når 500 MB runt 24 oktober om inget
återanvänds. Nettotakten mäts 24/9.

**Rekommendation, inte beslut:** Supabase Pro senast vid 400 MB eller 1 november (Bengt + Axel) · tre gratis småbyggen
nu: databasvakt, rensning av pg_crons logg, gallring av Finland och Norge (Bengt). **Bortvalt som förstahandsval:**
rullande export (2a) — sedan #226 läser domarna rådata över månader, och en export som fallerar skrivskyddar databasen.
**Funnet:** ingen vakt larmar på databasens storlek i dag.

## #232 (17/9 2026) Grepp 3, punkt 2: databasvakt, loggrensning och hård gallring av Finland och Norge

**Bengts order 17/9:** *"gör punkt 2. Gallra de finska och norska hårt för vi använder inte dessa så mycket"* — och på
frågan om rimfrostgrinden: *"Behåll kalla rader"*.

**Byggt (sql/026, vakthunden, dbknapp, integrationstest):**
1. **`gallra_arkiv(dagar)`** ersätter `gallra_vader` i nattjobbet 03:15 (samma jobb, nytt kommando): den svenska
   gallringen oförändrad, sedan
   - **Finland:** rader äldre än 7 dygn med yta över +3 °C eller utan yta raderas; kalla rader sparas i 60 dygn.
   - **Norge:** allt äldre än 7 dygn raderas.
   - **pg_crons logg:** körningar äldre än 7 dygn raderas.
2. **Databasvakten** i vakthunden: raden *"databas: N MB av 500"* och larm vid 400 MB. Prov: `databasprov`.

**Varför Finland inte gallras lika hårt som Norge.** Sökt i koden och dokumenten före radering: rimfrostgrinden R-A läser
det finska arkivet med 30 dygns fönster, och planen att köra den på Lapplands frostnätter är fastställd
(TROSKLAR-RIMFROST §8) och byggde på Bengts beslut #138 att spara luftfuktigheten. Det norska arkivet läses av ingen
analys — ingesten läser bara senaste raden per station. Det norska skuggarkivet var Axels start 31/8 (BACKLOG #35);
han informeras.

**Funnet och låst i samma migration:** gallringsfunktionerna låg i `public` utan spärr, alltså anropsbara via Supabases
REST-API. `gallra_vader(0)` hade tunnat ut även den senaste veckan. EXECUTE återkallas från PUBLIC, anon och
authenticated för båda.

**Storleken sjunker inte direkt:** en DELETE frigör inte disk förrän autovacuum återanvänt platsen (sql/014). Effekten
syns som lägre tillväxt — mätningen 24/9 visar den.

**Utfall 17/9:** migration 12:3xZ: `gallra_arkiv(7)` raderade **97 472 rader** — Finland 97 379 → 58 130, Norge 68 972 → 45 828, pg_crons logg 39 312 → 12 691, resten svensk gallring · EXECUTE låst för anon och authenticated · nattjobbet kör `SELECT gallra_arkiv(7)` 03:15 · databasvakten 12:35Z: *databas: 168 MB av 500*, provlarmet gick (larmväg ok).

## #233 (17/9 2026) Uppspelningen ur arkiven — grundversionen byggd och körd

**Bengts order 17/9:** *"kör uppspelningen"* — på beslutet #226 att domarna räknas ur arkiven med skuggloggen som
kontroll, och för att S1-grinden (Axel 16/9: inget mer byggs på `regn_h` före skuggjämförelsen) ska kunna passeras så
fort frosten kommer.

**Byggt:** `scripts/matningar/uppspelning-efterhalka.sql`, tre läsande satser via dbknapp (körning 35252328963). Talen står
en gång per sats: regn inom 2 h · fall ≥ 0,8 °C på 30 min · yta +1…+3 °C (#222/#225).
1. **Stationsdygn per dag:** i bandet · utan faller (regn i bandet) · utan blöt (fall i bandet) · kombinationen.
2. **De tio senaste tillfällena** då kombinationen skulle ha varnat.
3. **Kontrollen:** samma regel ur skuggloggen (det telefonen såg) mot arkiven, per station-ögonblick.

**Utfallet läses medvetet inte.** Startvärdena står till kalibreringen 1/2 (D2/D3).

**Resultat, 14 dygn i en mild september:**

| | |
| :-- | :-- |
| Stationer i bandet per dygn | 1–31 |
| Utan faller (regn inom 2 h i bandet) | 0–2 stationer per dygn |
| Utan blöt (fall i bandet) | 0–1 station per dygn |
| **Kombinationen** | **ett tillfälle:** station 2518, 14/9 06:25–06:35Z — yta 2,8–2,9 °C, fall 2,0–2,2 °C på 30 min, **regn samtidigt** |
| Kontrollen mot skuggloggen | 7 station-ögonblick, loggen och arkivet eniga i alla 7 — men ingen varnade, så jämförelsen säger ännu inget om träffar |

**Att den enda träffen kom under pågående regn** stämmer med definitionen: *blöt* är regn nu eller inom N h
(TROSKLAR-OVERGANGAR §4, `blöt = fukt_nu ELLER …`). Trendkolumnerna finns först från 8/9, då trend-tabellen började.

**Kvar:** radar-, regnmängds-, startbands- och SMHI-varianterna (#223–#225) och facit — de hör till domarna. **Nästa
körning:** vid första frosten, som underlag för S1-grinden.

## #234 (18/9 2026) Kort #195: vektorgeneratorn återskapar hela `engine/vectors/` — ingen vektor rörd

**Bengts order 18/9:** *"kör #195 och #200"*.

**Fyndet var större än kortet.** Kortet (16/9) sa att v05 hade fel namn och att v18–v23 saknades. En fullkörning 18/9
ändrade dessutom **elva** befintliga filer (v01–v04, v11–v17). Generatorn hade inte följt med när kamerornas bearing
vändes 180° (2/9), när vägnumret kom in i olycksrösten (2/9) och när spärren blev prioritetsmedveten (#127, 13/9).
Filerna hade alltså skrivits om utanför generatorn vid tre tillfällen.

**Gjort:** alla scenarier skrivna ur de frysta filerna. Varje tal uttrycks bara med ett uttryck som ger exakt samma
flyttal (`northOf(m)`, `northTrace(...)`). v05:s kamera B och hela v23 byggdes för hand med 111 000 m per latitudgrad
(v23 med nio decimaler) och återskapas exakt så (`n9`). Generatorn skriver nu en fil **bara när innehållet ändrats**:
arton filer bär andra byte för samma värden (inget radslut sist, v19:s `4.0`), och att skriva om dem hade rört
vektorfilerna utan skäl och startat Android- och iOS-bygget (~17 Actions-minuter).

**Bevis:** fullkörning ⇒ 24 *oförändrad*, 0 skrivna, `git status engine/vectors/` tom, ingen spökfil. Motprov: v18
`surfaceTempC` 2,5 → 2,6 i generatorn ⇒ *SKRIVEN* och diffen visar talet; återställt ⇒ *oförändrad*. `npm test`:
109 godkända, 0 fel.

**Varför nu:** motorregeln för efterhalkan (S3) ska ha nya vektorer. De ska komma ur generatorn, med 5-metersregeln
mätt, i stället för att skrivas för hand. Det var just handskrivningen som fick generatorn att glida isär.

**Kvar, nytt kort #202:** ett CI-steg som kör generatorn och fäller om `engine/vectors/` ändras. Utan det glider
generatorn isär vid nästa handändring, som den gjort tre gånger.

## #235 (18/9 2026) Kort #202: vektorgeneratorn i CI

**Bengts order 18/9:** *"kör #202 också"*.

**Skälet:** generatorn gled isär från vektorfilerna tre gånger (31/8, 2/9, 13/9), och ingen vakt såg det. Det upptäcktes
16/9, och hela omfånget först 18/9 (#234).

**Byggt:** ett steg i `ci.yml` kör `engine/gen-vectors.ts` och fäller om `engine/vectors/` ändras. Generatorn skriver
bara filer vars innehåll ändrats (#234), så steget är tyst när allt stämmer. En vektorfil utan scenario syns inte i
`git status`, så generatorn fäller själv på det när den körs utan filnamn.

**Bevis:**
- Lokalt, mot incheckad kod: rent läge grönt; handändrad vektorfil rött; vektorfil utan scenario rött (generatorns
  eget fel); scenario ändrat utan ny vektorfil rött; rent igen grönt.
- **I riktig CI:** provcommiten på PR #341 (v22 handändrad) gav röd körning 35305862118, fälld i steget *Vektorgeneratorn
  återskapar engine/vectors/ (#202)* med felmeddelandet om glidning. Återställd i nästa commit ⇒ grön. Squash-merge, så
  provet nådde aldrig main.

**Kostnad:** någon sekund per CI-körning.

## #236 (18/9 2026) Kort #200: marknadsföringen på pulsklockan

**Bengts order 18/9:** *"kör #195 och #200"*, på beslutet 17/9 (Bengt + Axel, #226).

**Gjort:** `scripts/pulsklocka.ts` fick pulsjobbet `puls-marknadsforing` (`45 4 * * *`), kopierat ur malljobbet som de
andra pulsjobben, så att nyckeln aldrig passerar en logg. `schedule` togs bort ur `marknadsforing.yml`, så att flödet inte
körs två gånger (PR #339). Pulsklockan kördes skarpt 03:53Z: fyra pulsjobb OK, alla med nyckel, och de tre befintliga
oförändrade.

**Första morgonen 18/9:** pulsklockan startade flödet **04:45:09Z**, 9 s efter bokad tid (GitHub-cronen levererade 08:49–10:07). Jobbet 04:45:12–04:45:31, alla steg gröna, och utkastet *Halkläget 2026-09-18* committades 04:45:25.

**Verify:** start inom 10 min från 04:45 UTC tre morgnar i rad (18–20/9). Raden i bedömningen stryks när den tredje finns.

**Obs vintertid:** pg_cron går i UTC. Från 25/10 blir 04:45 UTC 05:45 svensk tid i stället för 06:45 — samma två tider
som flödets gamla kommentar ("05:45/06:45 svensk tid") redan räknade med. Actions-kostnaden är oförändrad, en minut per
morgon.

## #237 (18/9 2026) Kort #160: måndagsserien på pulsklockan, mätvakten läser pulsklockan — och pulsnyckeln är PAT:en

**Bengts order 18/9:** *"kör #160 och kontrollera vilken nyckel pulsjobben har hos Axel och genomför bytet"*.

**Byggt (PR #344):**
- **(a)** De sju måndagsmätningarna (grind-a, smhi-prov, cell-matning-v3, trv-bevakning, hojd-prov, grind-v-a, grind-v-b)
  startas av pulsklockan, samma tider som förut. GitHub-cronen levererade dem 5–7 h sent 14/9 och 40 % av bokad takt i #70.
- **(c)** Mätvakten läser schemat också ur pulsklockans jobb i pg_cron. När #200 flyttade marknadsföringen dit föll den
  ur bevakningen utan ett ord, och ingest och grannar hade aldrig bevakats av samma skäl.
- **(b)** Fast frist, kadens + 3 h, i stället för × 1,5: en utebliven måndag syns samma dag, inte efter 10,5 dygn.
- **Pulsnyckeln i nyckelkalendern:** vakthunden läser pulsnyckelns utgång ur GitHubs svarshuvud och larmar om pulsjobben
  bär olika nycklar. Nyckeln används bara i databasen och i vakthunden och skrivs aldrig ut.
- **Bytesknappen:** `pulsklocka.yml` med läget **nyckel** provar att `PUBLISH_TOKEN` får starta ett flöde, skriver den i
  alla pulsjobb och läser tillbaka fingeravtrycken.

**Bevis:**
- Pulsklockan skarp 04:46Z: 11 pulsjobb OK, alla med nyckel, varav 7 nya för måndagsserien.
- Vakthunden deployad 04:35Z från main (lokal fil identisk med main före deploy). `nyckelprov` 04:47Z:
  *mätvakten: 11 schemalagda flöden (11 via pulsklockan), 0 med problem* (8 i morse, utan marknadsföringen) ·
  *nyckel pulsklockan: 1 olika i pulsjobben · samma som PAT: ja* · PAT och pulsnyckel går båda ut **2026-11-22**.
- Kontroll 04:28Z (dbknapp, pg_net mot GitHub): alla pulsjobb bär samma finkorniga PAT, som går ut
  **2026-11-22 20:55:49 UTC**.
- Bytesknappen 04:50Z: GitHub-hemligheten `PUBLISH_TOKEN` har samma fingeravtryck (`a0880e9a`) som pulsjobben — alla fyra
  ställen bär samma PAT. Provet startade `pulsklocka.yml` som *Axelstar* (HTTP 204); alla 11 jobb lästes tillbaka rätt.
  Första pulskörningen efter omskrivningen: ingest **05:11:01Z**, startad som *Axelstar*, grön — pulsjobben fungerar med den omskrivna nyckeln.
- **Måndag 21/9** avgör (a): alla sju ska starta inom minuten från sin bokade tid.

**Svaret på "vilken nyckel":** pulsjobben bär PAT:en från Axels konto — samma nyckel som publicera och vakthunden
använder och som ingest-grannar pushar kartrepot med. Den går ut 22/11.

**Bytet:** en ny nyckel kan bara skapas på Axels konto, och jag loggar inte in på någon annans konto. Därför är bytet nu
en knapp i stället för SQL för hand. Rotationen senast 15/11 blir: (1) Axel skapar den nya PAT:en, (2) byter
`PUBLISH_TOKEN` i Supabase, (3) byter `PUBLISH_TOKEN` i GitHub Secrets, (4) trycker `pulsklocka.yml` med läget **nyckel**.
Nyckelkalendern visar sedan det nya datumet för båda, och *samma som PAT: ja*.

**Rättelse i rotationslistan (kort #86, steg A):** listan från 9/9 gav den nya PAT:en *Contents* och *Issues*, "inget annat".
Pulsjobben startar flöden med nyckeln och vakthunden läser körningarna — det kräver **Actions: Read and write**, som
nuvarande nyckel har (provet gav 204). Hade listan följts ordagrant hade bytesknappen fällt på provet och pulsjobben stått
kvar på den gamla nyckeln tills den dog 22/11. Steg A är rättat, och knappen är steg C.

## #238 (18/9 2026) Kort #201: kassavakten hämtar dygnen parallellt — vakthunden svarar också i kassavaktens timmar

**Bengts order 18/9:** *"kör #201"*.

**Problemet:** kassavakten hämtade månadens körningar dygn för dygn och sida för sida, i följd. Tiden växte därför med
månaden, och vakthunden hann inte svara inom pg_nets 120 s i kassavaktens timmar (05, 11, 17, 23 UTC). Gratisnivån
stoppar funktionen vid 150 s. Sista septemberveckan, när taket är som trängst, hade kassavakten riskerat att stoppas mitt
i räkningen — och kontroll 9 (healthcheckens) och 10 (nyckelkalendern) går efter den.

**Gjort (PR #348):** sex dygn hämtas samtidigt; sidorna inom ett dygn fortfarande i följd, eftersom nästa sida bara behövs
när den förra var full. Räkningen är oförändrad — dygnssummorna sorteras innan den släpande takten räknas.

**Bevis:**
- **Före:** ordinarie körningen 05:07Z fick timeout vid 120 s. Kassaprovet 05:19Z svarade först efter 90–120 s
  (efter databasknappens väntan, före pg_nets gräns).
- **Efter** (deploy 05:23Z från main, lokal fil identisk): kassaprovet 05:24Z svarade med status 200 inom cirka 70 s, med
  alla rader till och med nyckelkalendern. Kassaraden: 4 558 min sedan 1/9 över 3 385 körningar, 20,46 USD — samma
  räkning som före (4 511 min över 3 346 körningar 23:08Z i går, plus nattens körningar).
- Ordinarie körningen 11:07Z är den första i kassavaktens timme efter deployen; den ska svara utan timeout.

**Kvar att veta:** vakthunden tar fortfarande cirka 70 s i kassavaktens timme. Kassavakten är nu några sekunder; resten
är de andra kontrollerna. Marginalen till 120 s är cirka 50 s.

## #239 (18/9 2026) S7: kamerafacit får en vakt, och flödena som committar tillbaka får --autostash (kort #161 b)

**Bengts order 18/9:** *"kör S7"*.

**Läget före:** kamerafacit — bilderna som ska döma betan i mars — flödade (31 · 97 · 107 · 27 bilder 15–18/9, skuggan
103–137 larm per dygn), men ingen vakt såg efter det, och bucketen stod tom i 16 dygn en gång utan att någon märkte det.
S7:s andra led, trv-bevakningens 13 källor, visade sig redan bevisat 16/9 02:44 (commit 1284e82) och ströks.

**Byggt (PR #351):**
- **Kamerafacit-vakten** i vakthundens 6b: larm i mätvaktens issue när skuggan gett minst 10 svenska larm de senaste
  12 h men bucketen `facit` inte fått en bild — korskontroll som radarns, så ett lugnt dygn inte larmar. Raden *källor*
  visar kamerafacits ålder och skuggans larm. Prov: `?facitprov=1` (dbknapp `facitprov`, i skriptet och i flödets lista).
- **Kort #161 (b):** `marknadsforing.yml` och `trv-bevakning.yml` gör `git pull --rebase --autostash` och skriver ut
  `git status --porcelain` när de faller, som läxan i CLAUDE.md kräver sedan 14/9.

**Bevis:**
- Vakthunden deployad 05:37Z från main (lokal fil identisk). `facitprov` 05:39Z: raden *kamerafacit 99.0 h (skuggans
  svenska larm 12 h: 68)* och issue #352 med *KÄLLA · kamerafacit … PROV*. Nästa timkörning ska stänga det.
- --autostash provat lokalt i två tillfälliga repon: gamla raden föll på en smutsig fil med *"Please commit or stash
  them"* (exit 128) — felet från 14/9; nya raden pushade (autostash lagd undan och tillbakalagd, exit 0); fel-grenen
  skrev ut ` M gradlew.bat` och gav exit 1. Första skarpa körningen med nya raden: marknadsföringen 19/9 04:45Z.

**Kvar av S7:** ett larm för förarfacit när betan går i november — i dag en rad utan dom, eftersom tabellen ska vara tom
till dess.

## #240 (18/9 2026) Fälttest 2: bygget 0.3.7 (10) i TestFlight saknar facitknapparna — main bumpad till 0.3.8 (11)

**Bengt 18/9:** passerade en fartkamera (appen varnade), men kunde inte svara — bara brytaren *Svara på varningarna*
gick att nå, som 16/9. Han har 0.3.7 (10) från TestFlight. (Claude antog först 0.3.6 — fel, rättat samma dag i PR #355.)

**Bevisen:**
- Skärmbild 09:40: *Redo.* med vakten avslutad, raden *Senaste tur · 18 Sep 08:25, 61 min, vaknade själv* — inga knappar.
- Skärmbild 09:46: brytaren *Svara på varningarna* PÅ.
- Kodens villkor för knapparna (`VaktenView`): brytaren på + senast sagd varning med text, id och klockslag. Varningar sägs
  bara på ett ställe (`GuardManager`), och där sparas alla tre först; id-lagringen finns sedan 0.3.6 (0239f03).
- `driver_facit` 07:37Z: bara de två provraderna från 16/9.

**Trolig orsak:** versionsnumret 0.3.7 (10) sattes i #300 kl. 13:45 16/9, och rättelsen `FacitRow` kom i #301 kl. 13:53 med
SAMMA nummer. Ett bygge från koden däremellan — eller från en äldre kopia — har rätt nummer men inga knappar. Axel kan
bekräfta med arkivets tid i Xcode Organizer.

**Åtgärd:** main bumpad till **0.3.8 (11)** (App Store tar inte samma byggnummer två gånger, och ett nytt nummer syns för
testarna i TestFlight). Axel: `git pull`, `xcodegen generate`, Product → Archive, TestFlight. Kontrollen före
"arkivera nu" körs på bumpen (ios-engine, ci; android oförändrad sedan sin gröna körning).

**Förslag till samma bygge eller nästa (S4:s utformning är Axels):** (1) visa bygget i appen — version och commit under
Inställningar/Om — då hade orsaken synts på en skärmbild; (2) visa varningens text ovanför knapparna — när det finns en
*Senaste tur* döljer hemskärmen *Senast sagt*; (3) brytarens text säger var knapparna finns; (4) knapparna även i körläget
när bilen står stilla — i dag syns de först när vakten är avslutad, och självstoppet kommer efter 15 min.

**Läxa (CLAUDE.md):** ett byggnummer som sätts före den sista ändringen bevisar inte vilket bygge som är ute — 0.3.7 (10)
fanns i två varianter i åtta minuter, och det räckte.

## #241 (19/9 2026) Skolans synlighet: QR-sida per skola på webben — ingen banner i appen (kort #204)

**Bengts idé 19/9:** en banner per trafikskola i appen, *"Halkvakt via Mårtenssons trafikskola"*, som indirekt reklam
för skolan. **Bengts beslut samma dag, på Claudes bedömning:** ja till webbversionen, nej till banner i appen.
*"Förbered men bygg inte."*

**Varför inte i appen:** eleven som ser bannern är redan skolans kund; det bryter mot *tyst app utan reklam*; iPhone
ger appen ingen uppgift om vilken länk installationen kom från; och "kom via skola X" är en uppgift om användaren som
löftet *vi samlar in: ingenting* inte täcker.

**Webbversionen:** bladet med skolans namn och QR-kod → en räknare (+1 per skola och månad, inget om besökaren) → skolans
egen sida *Välkommen från …* med butiksknapparna → App Store / Google Play. Partnerlista på startsidan utan siffror;
talen till skolan i ett månadsmejl; ett märke *Testpartner 2026/27* till skolans egna kanaler; i appen bara Om-sidans
gemensamma testpartner-rad.

**Förberett:** `docs/QR-SIDA-PER-SKOLA.md` (delarna, kedjan, integriteten, det som måste finnas före tryck, Axels sju
beslut, kostnad, bevis) och skissen `docs/skisser/qr-sida-per-skola.svg`. **Byggs när bladet byggs** — när appen finns i
butikerna. Inget lovas i Skyltfondssamtalen utöver *bladet med ert namn på*.

**Alternativ som valdes bort:** banner i appen (ovan) · per-skola-märkning i appen via installationslänk (går inte på
iPhone utan spårningspaket) · offentliga besökstal (en skola med tolv besök bredvid en med 143).

## #242 (20/9 2026) Byggordning C — ett sammanhållet iOS-bygge — och kort #205: fotostudions svar märks som prov

**Bengts beslut 20/9:** *"kör 205 och ja till byggordning c"*. Bakgrunden var hans invändning samma dag: *"är det då inte
bättre att avvakta hans svar och få en sammanhållen körning så att all uppdatering sker en gång och inte två"*.

**Läget som beslutet vilar på:** Axel har inte svarat på de åtta frågorna om #203 — sökt 20/9 i DECISIONS, bedömningen,
incheckningarna och GitHub-kommentarerna sedan 19/9. Hans ja 17/9 (#226) gällde C, D och T, två dygn före #203. Och 0.3.8
(11) innehåller INTE #203: den bär de gamla knapparna (nu fungerande) och ordlistan.

**Byggordning C:** ett iOS-bygge, med #203. Skälet för att arkivera 0.3.8 först — att sändningen från appen aldrig bevisats
— löses utan TestFlight och utan provkörning: Axel kör simulatorn med `-fotostudio_facit` och TRYCKER *Stämde*; raden
`cam:fotostudio` ska landa i `driver_facit` med `app = ios`, `version 0.3.8`. Det bevisar att knapparna syns (diagnosen
#240), att appens sändning fungerar och att servern tar emot. **Stoppdatum 27/9:** har de åtta svaren inte kommit då
arkiveras 0.3.8 ändå, till den interna gruppen. **Det som väntar till bygget:** det formella beviset från en riktig
telefon (S4 steg 5) och ordlistan i telefonerna.
*Alternativ:* A) 0.3.8 nu, #203 i 0.3.9 — två uppdateringar och en tredje provkörning på det gamla flödet; B) vänta utan
att bevisa kanalen — ett fel i sändningen hade då hittats först i oktober, ovanpå ny kod.

**Kort #205 — förutsättningen.** Kolumnen `prov` (sql/025, kort #196) matchade bara ordet *prov*. Fotostudio-kroken i
båda apparna lägger in `cam:fotostudio`, och ett tryck skickar ett riktigt anrop — raden hade landat som ett RIKTIGT
förarsvar, just den rad som ska bevisa S4 (KB-D6: provrader räknas aldrig). `sql/027`: `prov` också när `alert_id`
innehåller *fotostudio*; genererad kolumn ⇒ DROP + ADD i samma transaktion.

**Bevis:**
- Integrationstestet kördes mot riktig Postgres i CI (`ok 36 - kort #205 …`): fotostudio i två skiftlägen och `prov:kam1`
  märks, `wx:2135` och `seg:16010` inte, och en omkörning ger samma värden (PR #377).
- Migrationen i drift 05:33Z (dbknapp): kolumnen GENERATED ALWAYS med uttrycket
  `strpos(lower(alert_id),'prov') > 0 OR strpos(lower(alert_id),'fotostudio') > 0`; de två befintliga provraderna kvar och
  märkta; 0 riktiga svar, 2 prov, 2 rader — inget förlorat.
- Båda läsarna efter bytet: vakthundens fråga (samma SQL) ger 0 riktiga svar; skuggrapporten via REST svarar
  `forarfacit: {svar_7d: 0}` utan fel.
- **Kvar:** raden med innehåll — `cam:fotostudio` med `prov = true` — kommer med Axels tryck.

**Rättelse i samma varv:** regeln *ett svar är en handling, tystnad är inget svar* föreslogs 19/9 som KB-D5, men KB-D5
(trafiklärarnas svar) och KB-D6 (provrader) finns redan i TROSKLAR-KOMBINATIONEN. Förslaget heter **KB-D7**. Namngivet utan
att söka i det fastställda dokumentet först (SESSIONSREGELN punkt 2).


## #243 (20/9 2026) Steg B:s Verify uppfylld — radarn i timingesten kostar mätbart noll extra minuter

**Bakgrund.** #156 avgjorde 13/9 att radarn INTE flyttas till en edge function utan ligger kvar som
ett steg i timingesten (Bengt: "Vi flyttar inte nu"). Villkoret som skrevs in i kort #43 och #81 var
ordagrant: *"Actions-minuter per dygn oförändrade efter en vecka."* Baslinjen vid beslutet var
202 min/dygn, mätt över 26,5 h (11/9 16:25 → 12/9 18:51).

**Utfall: villkoret är uppfyllt, med marginal åt rätt håll.** De sju kompletta dygnen 13–19/9 gav
188 · 138 · 122 · 218 · 112 · 123 · 88 ⇒ **141 min/dygn i snitt**. Toppdygnet 16/9 är ett androidbygge
(55 min på 7 körningar), inte drift.

**Det avgörande talet är inte totalen utan ingest-jobbet**, för det är där radarn bor. Debiterade
minuter per dygn: 33 · 24 · 24 · 24 · 28 · 24 · 28 på 24 körningar, och mediantiden **30–36 s hela
veckan mot baslinjens 32 s**. Kortets tröskel ("ett ingest-jobb som vuxit förbi en minut per körning")
är alltså inte passerad. De dygn som landar på 28 i stället för 24 beror på 3–4 körningar vars svans
går strax över 60-sekundersstrecket (max 71 s) — inte på att jobbet blivit längre. Radarsteget mäts
direkt i loggen: **4–5 sekunder**.

**Datamängden bekräftar samtidigt att steget faktiskt kör.** 20/9 05:11: `radar_precip` 3 312 rader
över **24 av 24 kompositer**, senaste 05:10 — en minut gammal. Baslinjen 13/9 var 2 029 rader över 24.
Fler rader, samma kostnad: filtret är händelsestyrt, så ett regnigare dygn ger fler rader utan fler
minuter. Regel 7:s 70-minutersgräns var aldrig i närheten, och radarn har inte tigit en enda gång av
den orsaken.

**Vad beslutet INTE säger.** Edge-flytten för 5-minuterskadens är fortfarande inte förkastad, bara
inte aktuell. Tätare hämtning i Actions förblir uteslutet (12/h ≈ 288 min/dygn). Marginalen i timkadens
— rader som mest 60 min gamla mot regel 7:s ≤ 70 min — är oförändrat tunn men hel; faller en körning
bort tiger radarn, vilket är rätt utfall.

## #244 (20/9 2026) Uppspelningens varianter byggda: en funktion, betans startvärden som standard, D1 i kod, utfallet blindat

**Bengts beslut 20/9:** *"ja gör uppspelningens varianter nu"* — svaret på frågan i bedömningen §4.2. Instrumentet för
dom 1 (januari) och dom 2 (mars) är läsande SQL ur arkiven och bygger inget på `regn_h` i motorn, så S1-grinden (Axel 16/9)
hindrar det inte.

**Byggt (PR #379, #381):**
- `sql/028_uppspelning_varianter.sql` — `uppspelning_efterhalka()`. Anropet utan argument ÄR kombinationen (regn inom 2 h ·
  fall >= 0,8 °C på 30 min · yta +1…+3 °C · allt regn > 0); varje variant ändrar ETT argument. **D1 i kod:** ett värde
  utanför delarnas fastställda svep avvisas med fel — ingen kan pröva ett eget tal i smyg. **Utfallet blindat:**
  trendarkivet bär redan lägsta yta inom 90 min (`min_yta_90min_c`, besiktigad av värdevakten), men utfallskolumnerna ger
  NULL tills `p_blind := false` anges, och det anropet syns i dbknapp-loggen. Låst som `gallra_arkiv`: ingen EXECUTE för
  PUBLIC, anon eller authenticated.
- `scripts/matningar/uppspelning-varianter.sql` — sats 1: tio varianter på en rad var; sats 2: kombinationen per dygn;
  sats 3: bär radarkopplingen (skiljer vädret från röret utan att röra utfallet).
- Kontraktsgrinden: fem nya kontrakt — N, fall, startbandets två gränser, kopplingen 5 km. 35 kontrakt håller. Motprov:
  0,8→0,6 i den gamla mätfilen ⇒ exit 1; 5→6 km i täckningssatsen ⇒ exit 1; satsen borttagen ⇒ exit 1 (golvet).
- Integrationstestet (riktig Postgres i CI, `ok 37`, 117 av 117): sex påhittade stationer med känt rätt svar per variant,
  blindningen, åtta avvisade värden, och gränsprovet för radarn.

**Körd i drift 20/9 06:17Z, 14 dygn (7–20/9) — BARA ANTAL FYRNINGAR, inga utfall lästa:**

| Variant | Stationsdygn | Ögonblick | Dygn med fyrning |
| :-- | --: | --: | --: |
| kombinationen | 1 | 3 | 1 |
| utan *faller* | 9 | 201 | 8 |
| utan *blöt* | 7 | 10 | 5 |
| med radarn r = 0,1 · 0,5 · 2 mm/h | 1 · 1 · 1 | 3 · 3 · 3 | 1 · 1 · 1 |
| regnmängd >= 0,2 · >= 0,5 mm | 0 · 0 | 0 · 0 | 0 · 0 |
| startband +1…+4 | 1 | 4 | 1 |
| startband +1…+6 | 5 | 13 | 4 |

`utfall_synligt` = 0 i varje rad, och sats 2 visar utfallskolumnerna som NULL — blindningen håller i drift.

**Regressionen:** den gamla mätfilens sats 1 (`uppspelning-efterhalka.sql`, skriven 17/9 som CTE) kördes direkt efter och
gav samma tre tal: utan faller 9, utan blöt 7, kombinationen 1 stationsdygn med 3 ögonblick (14/9). Två oberoende
skrivningar av samma regel räknar lika.

**Radarn lade inte till ett enda dygn — och det är vädret, inte röret.** Sats 3: 140 stationer i trendarkivet, **110 har
ett vägavsnitt inom 5 km** (79 %; 16/9 mättes 80,5 % för kalla stationer, #218), 105 avsnitt, och **118 av 530**
stationsdygn hade radarregn på ett sådant avsnitt samma dygn. Kopplingen ger alltså träffar; de sex torra stationsdygnen
med fallande yta hade bara inget radarregn inom 2 h. Det är fysiken: ytan faller snabbast klara nätter, och då regnar det
inte. **30 av 140 stationer saknar väg inom 5 km** — där kan radarvarianten aldrig bidra (känt sedan #218).

**Rättat i samma varv (PR #381):** första versionen skrev `rate_mean_mmh >= r`. Den fastställda regeln säger `> r`
(TROSKLAR-OVERGANGAR §4), och radartäckningsmätningen 16/9 räknade så. Hittat när radarvarianterna gav exakt
kombinationens tal och regeln lästes om mot dokumentet. Talen i drift blev desamma före och efter — men vid r = 0,5 hade en
mätning på exakt 0,5 räknats fel i mars. Gränsprovet (station F, radar exakt 0,5) låser det.

**Numret:** filerna pekade först på #243, som parallellsessionen tog för Steg B (PR #380) medan bygget pågick. Rättat till #244.

**Blindningen, rätt formulerad.** Frågan i §4.2 sa att träffandelar *"inte får läsas före 1/2"*. Det som står i reglerna
(D2/D3/D6, TROSKLAR-KOMBINATIONEN §7) är: utfall läses första gången vid **dom 1 i januari**, därefter vid
**kalibreringen 1/2** och **dom 2 i mars** — och aldrig däremellan.

**INTE MED, med skäl:**
- **SMHI-förlängningen (N_varning):** arkivet har inga vintervarningar, och `senast_sedd` är inte deklarerad i
  värdevakten. Byggs när båda finns (bedömningen §0b).
- **Facitstackens tre andra källor** (omklassning, kamerabild, olycka): *nära stationen* har ingen skriven radie —
  TROSKLAR-TYSTNADSFEL §6 säger *"t.ex. inom ankaravståndet"*, och ankaravståndet är ett svep (15 · 20 · 50 km). Talet ska
  stå i tröskeldokumentet FÖRE mätningen. Öppen fråga i bedömningen §4.2, tillsammans med episoddefinitionen (v1:
  stationens första ögonblick per UTC-dygn).
- **Dagens `icing_point` som jämförelse (KB-B):** hör till utfallsläsningen.

*Alternativ som valdes bort:* tio separata SQL-satser med talen inskrivna (tio kopior av fyra trösklar — precis det
kontraktsgrinden finns för att slippa) · varianterna som skuggkolumner i motorn (förbjudet av #226: alla räknas ur
arkiven) · vänta till första frosten (instrumentet hade då byggts under tidspress, med utfallet synligt medan det byggdes).

## #245 (20/9 2026) Räckvidden för kombinationens facit: 5 km från stationen — och episoden: version 1, med en mätning som talar emot

**Bengts beslut 20/9:** *"vi kör 5 km"* och *"och version 1"* — svaren på de två definitionerna i bedömningen §4.2 (#244).

**(a) 5 km.** Ett facittillfälle (omklassning, kamerabild, olycka) hör till en station när det ligger inom 5 km från den.
Samma koppling station↔väg som radarn fick 17/9 (#225) — en koppling, ett tal, och kontraktet för 5 km finns redan i
kontraktsgrinden (#244). Inskrivet i TROSKLAR-KOMBINATIONEN §4 KB-B **före första utfallsläsningen**; §10 tillåter det med
en rad här fram till betans första natt. **Priset:** färre facittillfällen mot KB-C2:s golv på 40 — räcker de inte blir
domen OAVGJORD. **Gäller** kombinationens domar och uppspelningen, inte tystnadsfelsmåttet i övrigt (dess §6 rörs inte).
*Alternativ:* ankaravståndet 15 · 20 · 50 km (ett svep, inget tal — och en punktkälla 50 km bort säger lite om stationens yta).

**(b) Episoden: version 1** — stationens första ögonblick per UTC-dygn (som sql/028 räknar i dag). Bengt följde Claudes
rekommendation i §4.2. **Rekommendationen var given utan att repot var genomsökt** (SESSIONSREGELN punkt 2), och
sökningen — gjord minuterna innan beskedet kom — visade två saker:

1. **De två grindar som redan räknar nätter gör det middag till middag,** inte per kalenderdygn: `scripts/grind-t-a.ts`
   (`sample_time - interval '12 hours'`) och `scripts/grind-r-a.ts`. KB-C1 och KB-C2 räknar dessutom i *nätter*.
2. **Mätt i drift 20/9 06:33Z, hela trendarkivet (8–20/9, 11 879 ögonblick), utan trösklar och utan utfall:** 530
   stationsdygn blir **454 stationsnätter, och 159 av dem (35 %) delas i två av version 1.** Skälet syns i
   timfördelningen: **66 % av ögonblicken ligger 21–03 UTC**, med toppen 00–03. Version 1 klyver alltså dygnet precis där
   ytorna faller som mest — en natt vid en station blir två episoder med var sitt utfall, och antalen mot golven (KB-C2:s
   40, KB-D4:s 30) blåses upp.

   Satsen: `WITH r AS (SELECT station_id AS sid, (observed_at AT TIME ZONE 'UTC')::date AS d, ((observed_at - interval
   '12 hours') AT TIME ZONE 'UTC')::date AS natt FROM trend_kandidater) SELECT count(DISTINCT (sid, d)), count(DISTINCT
   (sid, natt)), (SELECT count(*) FROM (SELECT sid, natt FROM r GROUP BY sid, natt HAVING count(DISTINCT d) > 1) x) FROM r`.

**Därför:** version 1 står som beslutad och är det koden gör — men den skrivs INTE in i tröskeldokumentet ännu. Omprövningen
ligger i bedömningen §4.2 med Claudes rättade rekommendation: **natt = middag till middag UTC, som T-A.** Inget utfall är
läst, så bytet kostar ingenting i blindning; det kostar en ändring i `ep`-steget i sql/028, ett testfall över midnatt och
ett kontrakt för tolvtimmarsgränsen (den finns då i tre filer).

## #246 (20/9 2026) Episoden är en natt, middag till middag UTC — Bengts omprövning av version 1

**Bengts beslut 20/9:** *"ompröva beslutet och byt"* — efter mätningen i #245 (version 1 delar 159 av 454 stationsnätter i
två, eftersom 66 % av fallen ligger 21–03 UTC). Beslutet *version 1* togs och omprövades samma förmiddag och hann aldrig
läsa ett utfall.

**Regeln:** en episod är stationens första ögonblick per natt, och en natt går från middag till middag UTC — tiden skiftas
12 h, samma räknesätt som T-A (`scripts/grind-t-a.ts`: *"Natten tillhör det dygn den började"*). Inskriven i
TROSKLAR-KOMBINATIONEN §4 KB-B (§10: en rad här räcker fram till betans första natt).

**Byggt (PR #384):**
- `sql/028`: `ep`-steget räknar per (station, natt). Episoden bokförs på det UTC-dygn den BÖRJADE; stationer och ögonblick
  redovisas som förut per UTC-dygn, så jämförelsen mot den gamla mätfilen står kvar. **Följdändring:** öppnat
  (`p_blind := false`) ger ett dygn där ingen episod började **0, inte NULL** — NULL ska bara betyda *blindat*. Förut hade
  varje dygn med fyrning minst en episod, så frågan fanns inte.
- Integrationstestet: station G med två ögonblick samma natt, 23:30 (frös) och 00:30 UTC (uteblev). En episod, bokförd där
  natten började, och ingen andra efter midnatt.
- Kontraktsgrinden: *Nattens gräns* — 12 h i tre filer (T-A, R-A, uppspelningen), formen bunden till `AS natt` så att
  vakthundens tolvtimmarsfönster inte fångas. 36 kontrakt håller; motprov 12→6 ⇒ exit 1.

**Bevis:**
- CI på ändringen: `ok 37`, 117 av 117 mot riktig Postgres.
- **Motprov i CI (PR #385, stängd och raderad):** samma test mot en slängkopia med episoden per UTC-dygn ⇒ `not ok 37`,
  fälld på raden *"G: ingen andra episod efter midnatt UTC"*, 116 av 117. Testet fångar alltså den gamla räkningen.
- **I drift 20/9 07:06Z:** `pg_proc.prosrc` för den körande funktionen bär `DISTINCT ON (f.sid, f.natt)`, tolvtimmarsskiftet
  och `coalesce(u.med, 0)` — alla tre sanna. Varianttabellen oförändrad (kombinationen 1 · utan faller 9 · utan blöt 7 ·
  startband +1…+6: 5), `utfall_synligt` = 0, utfallskolumnerna NULL.

**Vad som INTE syns i drift, och varför:** bytets effekt på antalet episoder per variant. Episoderna räknas bara i
utfallskolumnerna, och de är blindade till dom 1. Effekten på hela trendarkivet är mätt utan utfall (#245): 530 stationsdygn
⇒ 454 stationsnätter.

**Läxan** (samma som #242:s KB-D5/KB-D7): en rekommendation till Bengt ges EFTER sökningen i repot, inte före. Två grindar
räknade redan nätter middag till middag, och en grep på `AS natt` hade visat det på sekunder.

*Alternativ:* lokal tid som R-A (Europe/Stockholm) — avstått: uppspelningen är UTC rakt igenom, skillnaden är en till två
timmar mitt på dagen då inget faller, och T-A är den del kombinationen ärver fallkravet från · hela redovisningen per natt
i stället för per UTC-dygn — avstått: det hade brutit jämförelsen mot den gamla mätfilen utan att ändra någon dom.

## #247 (20/9 2026) Kort #207: uppspelningen läser facitstackens två skrivna källor — och omklassningarna är TOMMA

**Bengts beslut 20/9:** *"kör 207"*. Stationens egen yta säger att det BLEV kallt, aldrig att vägen blev hal. KB-B döms
mot facitstacken, och KB-D3 säger att förarsvar ensamma varken fäller eller friar.

**Byggt (PR #388):** `uppspelning_efterhalka()` får två kolumner per variant — episoder med **omklassning till halka**
(`road_condition_history` × `road_conditions`) och episoder med **olycka** (`situation_archive`, Accident) — lästa inom
`(t, t + p_utfall]` från episodens början, exakt det fönster `publish/trendkandidat.ts` använder för stationens egen
facit. Halkorden är motorns egna. Olyckor räknas **separat och aldrig i grundtalet**: arkivet bär ingen orsak, så en
olycka är facit på att något hände, inte på att det var halt (samma regel som tystnadsfelet T1 b).
- Nya argument: `p_utfall` (ärvs från T-A, svep 60 · 90 · 120 min, standard 90 = det arkivet redan räknar) och
  `p_facit_km` (5, #245). Båda med D1-vakt.
- Ny **synlig** kolumn `episoder`. Den räknar fyrningar, inte utfall — nämnaren till facittalen, och den gör nattbytets
  (#246) verkan mätbar i drift.
- **Signaturen släpps före CREATE.** Returtyp och argumentantal ändras; ett `CREATE OR REPLACE` hade lagt en ANDRA
  överlagring bredvid den gamla och gjort `uppspelning_efterhalka()` utan argument tvetydigt. Testet kräver exakt en
  signatur, och migrationen bevisar den: `signaturer 1, argument 15`.
- Mätfilens variantlista vänsterjoinas nu i stället för att fyllas ut med handräknade NULL:ar — en kolumn till hade
  annars tyst skjutit utfyllnaden ur led.

**Bevis:**
- CI: `ok 37`, 117 av 117 mot riktig Postgres; 38 kontrakt håller.
- **Två motprov i CI, båda stängda och raderade.** (1) Ordgränsen borttagen (PR #389) ⇒ **kontraktsgrinden** fäller
  bygget innan testerna hinner köra (`✗ Halkorden i MOTORN`). (2) Facitradien vidgad till 500 km (PR #390) ⇒ grinden ser
  inget (38 kontrakt håller) men **testet** faller på rätt rad: *"bara H: 'fläckvis Våt', halka 3 h senare och halka
  50 km bort räknas inte"*. Grinden och provet vaktar alltså olika fel.
- I drift 20/9 07:48Z: en signatur, 15 argument, facitkolumnerna NULL (blindade), varianttabellen oförändrad.

**MÄTT OCH OVÄNTAT: omklassningarna till halka är NOLL — och arkivet har bara 7 rader på 14 dygn.** Hela
`road_condition_history` fick 7 rader från 7 vägavsnitt, och orden i dem är *Torrt* (7) och *fläckvis Våt* (6). Noll
halka. Det är **inte en läcka**: arkivvakten (#51, DECISIONS #71) frågar redan "finns ett nuvarande tillstånd som borde
ha hunnit arkiveras och inte gjorde det", och samma tomhet mättes 5/9 (noll omklassningar på elva dygn). I september
klassas inget om, och tystnad är då korrekt. Men det gör **KB-D3:s följd konkret**: förblir omklassningarna tomma blir
januari OAVGJORT hur många förare som än svarat *Stämde*. Olyckor finns det gott om — 504 på 14 dygn — men de bär ingen
orsak och får inte bära domen ensamma.

**Kopplingen bär, till skillnad från källan:** alla 140 stationer i trendarkivet har ett läge i `weather_latest`, så
facitkopplingen har 100 % täckning (radarkopplingen, som kräver väg inom 5 km, har 110 av 140).

**Nattbytet blev mätbart samma varv.** `utan faller`: 9 stationsdygn ⇒ **7 episoder** — två nätter som spände över
midnatt slogs ihop, precis det #246 rättade.

**ÖVERRASKNING ÅT ANDRA HÅLLET: `startband +1…+6` ger 5 stationsdygn men 6 episoder.** En station kan alltså få FLER
episoder än stationsdygn, när två fyrningar samma UTC-dygn ligger på var sin sida om **middag** — nattgränsen. Det är
korrekt (två skilda dagtidshändelser är inte en natt) och samma konvention som T-A, men det är den spegelvända formen av
midnattsproblemet och ska inte förvåna någon i januari. Det syns bara i det breda startbandet, eftersom varmare ytor
faller också mitt på dagen; i kombinationen är timmarna 09–15 UTC i praktiken tomma (#245).

**INTE MED, med skäl:** kamerabilden — en bild är inte facit förrän någon läst den, och granskningen är ett öppet beslut
(bedömningen §4.2, före 1/2) · förarsvaren — egna regler (KB-D1–D6), och noll riktiga svar finns · SMHI-förlängningen —
oförändrat läge.

*Alternativ:* koppla facit till varje ÖGONBLICK i stället för till episoden — avvisat: röst räknas i episoder (kartan
§10.2), och en station med tre ögonblick samma natt hade räknat samma omklassning tre gånger · räkna olyckor i
grundtalet — avvisat av samma skäl som tystnadsfelet: arkivet bär ingen orsak.

## #248 (20/9 2026) Bildfacitbeslutet flyttas från 1 februari till efter första frosten

**Bengts beslut 20/9:** *"ja skriv in det som egen rad"* — på Claudes förslag ur fyndet i #247.

**Skälet är mätt, inte anat.** Uppspelningens facitkoppling (#207) visade att omklassningarna till halka är **0 på
14 dygn**, och att hela `road_condition_history` bär **7 rader** (orden är *Torrt* och *fläckvis Våt*). I september är
det korrekt — inget klassas om — men KB-D3 säger att förarfacit ensamt varken fäller eller friar. Är omklassningarna
lika tomma i november–december står januaridomen och faller på kamerabilderna, och **granskningen av dem finns inte
byggd**. Ett beslut i februari hade då kommit efter domen det skulle rädda.

**Vad som ändras:** tidpunkten, ingenting annat. Beslutet fattas **inom sju dygn efter första frostnatten** i stället
för före 1/2, så att bygget hinner göras om svaret blir ja.

**Vad som INTE ändras — blindningen.** Beslutet gäller att BYGGA läsningen av bilderna, inte att läsa utfallet.
Bilderna öppnas fortfarande i mars (D2/D3/D6). Ett bygge före dom 1 får inte visa vad bilderna säger.

**Mätningen som avgör** körs i samma varv som T-A steg 0 vid första frosten: hur många omklassningar till halka som
faller inom 5 km och utfallsfönstret från en episod. Blir talet noll också då är kamerabilden den enda källa som kan
bära januari, och granskningen måste byggas i november.

*Alternativ:* behåll 1/2 — avvisat: beslutet hade kommit efter den dom det ska försörja · bygg granskningen nu utan
beslut — avvisat: den kostar, och första frosten kan visa att omklassningarna räcker.

## #249 (20/9 2026) Total genomlysning av projektet — tolv nya kort, tre fel som hörs i bilen

**Bengts order 20/9:** *"gör en total genomlysning av hela halkvaktprojektet"* inför riktlinjemötet med Axel. Fem
parallella granskare (motor/paritet · drift/vakter · mätning/blindning · produkt/leverans · styrning) plus egna
mätningar mot drift, GitHub-API och den publicerade snapshoten. Läs-only. Fullständig rapport:
`docs/GENOMLYSNING-2026-09-20.md` (även på Bengts skrivbord).

**Domen i tre meningar.** Mätinstrumentet är ovanligt hederligt: motorn är ren, den körs byte-för-byte i tre språk,
trösklarna skrivs före mätning och blindningen är kodad. Men produkten har inte varit i en enda utomståendes hand,
facitkällorna ger noll, och tre fel hörs eller kan höras i bilen. Största enskilda risken är att arkivet saknar backup
och inte går att återskapa.

**De tyngsta fynden, alla verifierade i kod eller mätning:**
- **iOS säger "på väg <null>"** — `SnapshotRepo.swift:117` gör JSON-null till en sträng. Uppmätt: 38 av 732 olyckor
  på 30 dygn saknar vägnummer (5,2 %). Kotlin och TypeScript gör rätt. Vektor v22 låser bara frånvarande `road`. (#210)
- **Det tidiga olycksropet kan sägas tre gånger** vid låg fart — bryter #28 och motsägs av projektets eget test. (#211)
- **Vektorsviten certifierar inte korridorvinkeln (5°–90° omärkt) eller reprisavståndet (0–50 000 m omärkt).**
  Prioritetsgenombrottet (#127) har noll täckning, och testet skulle fälla en vektor som prövade det. (#212)
- **Arkivet har ingen backup**, och Trafikverket ger bara nuläge och delta. (#213)
- **Play-deklarationen är osann sedan 16/9.** (#214)
- **Vakthunden saknar dödmansgrepp**, och tre checkar kan aldrig fyra. (#215)
- **Blindningsläcka:** T-A skriver ut hela svepet rangordnat genom hela kalibreringsfönstret, och delar tre av
  kombinationens sex dimensioner. (#216)

**Strukturellt:** 593 rader beslutslogik bärs av 8 345 rader mätskript, 20 860 rader vektorer och 154 000 ord
styrdokument. Senaste veckan: 9 087 dokumentrader mot 3 065 rader produktkod. 29 av 96 öppna kort väntar på Axel, och
ingen incheckning har kommit från honom sedan 17/9.

**Följd:** korten #210–#221 lagda. Två av dem bär beslut som Bengt och Axel måste ta (#214 produktinvariantens
lydelse, #216 blindningen mot T-A). Inget är åtgärdat i det här varvet — genomlysningen var läs-only.

## #250 (20/9 2026) Sex överspelade kort stängs, och ägarskapet skrivs ut på varje kort

**Bengts order 20/9:** *"ja stäng de sex korten och skriv en ny lista"* — efter genomlysningen (#249), som visade att
tavlan bär kort verkligheten sprungit förbi.

**Stängda, med beviset på varje kort:**
| Kort | Varför det var överspelat | Ålder som falskt öppet |
| :-- | :-- | --: |
| 5. TestFlight 0.3.5 (8) | Main bär 0.3.8 (11) sedan 18/9; byggordning C (#242) säger ETT bygge med #203 | 12 dygn |
| #79 regn-30 | Jobbet avvecklades 9/9 (pulsklocka #11); finns inte i pulsklockans elva jobb | 11 dygn |
| Gallringsregel för weather_observations | `gallra_vader` + `gallra_arkiv` i drift sedan 17/9, 97 472 rader raderade | 3 dygn |
| Vegvesen DATEX-konto | Beviljat 4/9; arkivet tickar. **Kortet bar sitt eget klarbesked i brödtexten** | 16 dygn |
| #158 Skuggloggens larm saknar position | Form A byggd och deployad 14/9 | 6 dygn |
| #157 Kamerafacit är tomt | Rotorsaken åtgärdad; **451 objekt i hinken 20/9** | 6 dygn |

Öppna kort: **102 → 96.** Axel 29 → 25, Bengt 15 → 13.

**Mönstret, inte bara raderna.** Fyra av de sex bar sitt eget bevis i brödtexten och stod ändå kvar som öppna —
TAVELREGELN punkt 3 säger att verkligheten flyttar kortet utan att fråga, och det skedde inte. Det är samma brist
genomlysningen mätte i stort: 41 klara kort låg kvar i ATT GÖRA och 🟡-sektionen var tom.

**Följd på samma order: ägarskapet skrivs ut.** Varje öppet kort ska säga om det är EXKLUSIVT en persons (kräver hans
konto, hans underskrift, hans telefon, hans relation) eller om någon annan kan verkställa det. Skälet är Bengts fråga
inför riktlinjemötet: 29 kort hos Axel såg ut som 29 blockeringar, men bara en del av dem kan bara han göra.
Listan ligger i `docs/KORTLISTOR-2026-09-20.md` (även på Bengts skrivbord).

**Räknat ur den listan:** av Axels 25 kort är **6 exklusivt hans** — de kräver hans konto eller hans godkännande
(Billing, #85, PAT-rotationen #86, Pro-godkännandet #83, Play-kontot, publikt repo/minuter). **5 kräver er båda**
(#203 med undantaget att Bengt beslutar vid tystnad 27/9, helgsamtalet, Skyltfondspaketet, rollfördelningen, #21).
**14 kan någon annan verkställa** — Claude skriver koden, Bengt rekryterar och registrerar.
Av Bengts 13 är **4 exklusivt hans** (TRV-anmälan #154, Skyltfondsrundan, #94, B2B-spåret), **3 kräver er båda**
(#159, #153, sensortrappan) och **6 kan någon annan göra**.

**Slutsatsen som ändrar mötet:** 29 kort hos Axel såg ut som 29 blockeringar. Sex är det.

## #251 (20/9 2026) Bedömningen uppdaterad smalt: det utelämnade in, det klara struket, korten per punkt

**Bengts order 20/9, efter en rättelse mitt i arbetet:** först bad han om en total omskrivning i tidsordning, och tog
sedan tillbaka det — *"Bedömning är en handling som är kopplad till integration av integrationskartan. Uppdatera bara
med saker som har utelämnat och glömt att strykas. Sen vill jag se bedömningen i sin helhet och kort som hör hemma där
listas under varje punkt."* Rättelsen var riktig: dokumentet har en roll mot kartan och ska inte byta form.

**Tre ändringar, inget annat:**
1. **Det utelämnade infört.** Genomlysningen (#249) fanns inte i bedömningen alls, trots SESSIONSREGELN punkt 3 — tolv
   kort lagda på tavlan i morse utan en rad här. Nu två rader i §0b (fynden och de två dubbletterna), plus stängningen
   av de sex överspelade korten (#250) och ägarskapslistan. §4.2 fick de två beslut som väntar: **#214** Play-deklarationen
   och **#216** blindningsläckan i T-A.
2. **Det klara struket.** S1 stod som öppet steg fast det byggdes 16/9.
3. **Korten per punkt.** Läget, §1, §2.1, §2.2, §3 och §4.2 har nu en **Kort**-kolumn, så tavlan och bedömningen går att
   läsa mot varandra. Ett kort utan rad här hör hemma på tavlan — bedömningen är kartans handling, inte hela tavlan.

**Fyndet som ändringen tvingade fram: två av genomlysningens kort var inte nya.**
- **#215 *vakthunden kan tystna utan att någon märker det*** är samma fråga som **#50 *Vakthunden är själv obevakad***,
  som legat på tavlan sedan **4/9**. Sexton dygn, och fem granskare hittade den som ett nytt fynd.
- **#51 *vinterarkivet skrivs nästan inte — moaten läcker*** (4/9) pekade redan på `road_condition_history`, samma tomhet
  som #247 mätte 20/9 (0 omklassningar till halka på 14 dygn, 7 rader totalt).

Det bekräftar genomlysningens egen slutsats om referensrymden och dokumentskulden (#220/#221) — på 96 öppna kort går det
inte längre att veta vad som redan står där. **Följd:** #215 slås ihop med #50 och #51 kopplas till facitraden; båda står
som åtgärd i §0b.

**Vad som INTE gjordes, med skäl:** ingen omskrivning till tidsordning (kartans koppling går före), ingen flytt av
klara rader till bilaga (historiken står struken på plats, som SESSIONSREGELN punkt 4 föreskriver), inga nya kort.

## #252 (20/9 2026) #215 slås ihop med #50, och #51 kopplas till facitraden

**Bengts order 20/9:** *"ja slå ihop 215 med 50 och koppla 51 till facitraden och uppdatera bedömning med detta"* —
efter att uppdateringen av bedömningen (#251) avslöjat att två av genomlysningens tolv kort inte var nya.

**#215 → #50.** Kortet *vakthunden kan tystna utan att någon märker det* ställer samma fråga som **#50 *Vakthunden är
själv obevakad***, öppet sedan **4/9**. #215 är stängt med en pekare; de tre mätta defekterna är införda i #50 som
avsnittet *GENOMLYSNINGEN 20/9*, med minsta åtgärd och Verify:
- inget dödmansgrepp utanför Supabase — **samma felläge som 5/9, bara flyttat**: pulsen gav en oberoende klocka, inte
  en oberoende löpare, och `larmvag: "TRASIG"` skrivs bara i ett HTTP-svar som pg_net kastar bort,
- check 9c kan aldrig fyra (färre än 4 källor i `sync_state`, men det finns minst 5 och rader raderas aldrig),
- check 9d mäter fel led (pg_net är asynkront — *lyckades* betyder *lades i kö*), check 1 mäter `synced_at` i stället
  för att kursorn rör sig, och schemat jämförs aldrig mot pulsklockans deklarerade lista.

**#51 → facitraden.** *Vinterarkivet skrivs nästan inte — moaten läcker* (4/9) bar redan frågan; 20/9 fick den ett tal:
**0 omklassningar till halka på 14 dygn, hela arkivet 7 rader** (orden *Torrt* och *fläckvis Våt*), 504 olyckor utan
orsak. Kortet är nu uttryckligen bedömningens rad *Facitstacken för domarna* och förutsättningen för **#209**, med ny
Verify: omklassningar till halka inom 5 km och utfallsfönstret under de första frostnätterna, mätt i samma varv som
T-A steg 0. Den gamla Verify-formuleringen (*nyttan går inte att mäta förrän strömmen lever*) var inte mätbar.

**Bedömningen uppdaterad i samma varv:** §0b-raden om dubbletterna struken med åtgärden på raden; facitraden och S7
pekar nu på #51 respektive #50 i stället för på de nya numren. Öppna kort 96 → 95.

**Läxan, och den är obekväm.** Fem granskare läste repot i morse och lade ett kort som redan fanns. Ingen av dem
sökte på tavlan efter en befintlig rad — och SESSIONSREGELN punkt 2 säger uttryckligen *sök i repot innan något sägs
vara nytt eller omöjligt*. Regeln skrevs för strykningar; den gäller lika mycket för fynd. **Följd: en granskning som
lägger nya kort ska först söka på tavlan efter frågan, inte bara efter koden.**

## #253 (20/9 2026) Kort #87 finns och är stängt — dödmansgreppet är en fråga till, inte ett flöde

**Bengts fråga 20/9:** *"kolla om kort #87 finns"* — ställd efter att #50 pekat ut #87 som sitt slutvillkor.

**Svaret: #87 finns, det är stängt sedan 14/9 (DECISIONS #178) — och beslutet blev motsatsen till vad #50 förutsatte.**
`healthcheck.yml` skulle enligt #50 läggas ner när kontrollerna flyttat in i vakthunden. Det gjordes inte. Bengt 14/9:
*"ta inte bort healthcheck eftersom den knappt kostar något"*, och kortets tyngre skäl: **den är den enda kontroll som
körs UTANFÖR det den vaktar.** Löparen som saknades 5/9 — *pulsen gav en oberoende klocka, inte en oberoende löpare* —
finns alltså redan, betald med 12 min/dygn och bevarad med flit.

**Följden för #50/#215:s dödmansgrepp: åtgärden krymper från ett bygge till en fråga.** `ingest/healthcheck.ts` läser
redan `cron.job_run_details` (rad 23–24), men bara för `halkvakt-ingest-live`. Den frågar aldrig om
**`halkvakt-vakthund`** själv. Det behövs alltså ingen ny mekanism, inget nytt flöde och ingen ny hemlighet — en fråga
till i en kontroll som redan kör varannan timme utanför Supabase, i en fil som redan är beslutad att stanna.

**Driften kontrollerad samma varv (20/9 08:4xZ, läst ur `cron.job`):** `halkvakt-vakthund` aktiv, schema `7 * * * *`,
senaste körning 6 min sedan, `succeeded`; `halkvakt-ingest-live` 0 min; `puls-healthcheck` 110 min; `halkvakt-gallring`
418 min — alla succeeded. **De sju måndagsjobben har aldrig kört** (`null`), vilket är väntat: första avfyrningen är
måndag 21/9 (#160).

**Bristen som fyndet blottar:** #50 skulle ha stängts eller skrivits om 14/9. Dess eget slutvillkor uppfylldes då, men
med motsatt utfall mot vad raden förutsatte, och kortet stod kvar i sex dygn och sa fortfarande att brons slut var
ogjort. Det är tredje gången på ett dygn samma mönster syns: ett kort som verkligheten sprungit förbi utan att någon
flyttat det (#250 sex kort, #252 två dubbletter, nu #50). **TAVELREGELN punkt 3 följs inte, och det kostar nu
dubbelarbete i granskningar, inte bara städning.**

## #254 (20/9 2026) Dödmansgreppet byggt och bevisat — #50 stängt efter sexton dygn, resten till kort #222

**Bengts order 20/9:** *"kör dödmansgreppet och stänger du därefter de kort som fortfarande står öppna men som ska
stängas efter denna åtgärd"*.

**Byggt (PR #400):** `ingest/healthcheck.ts` frågar nu om **vakthunden själv** — i den fil som redan kör varannan timme
utanför Supabase, och som behölls 14/9 av exakt det skälet (#87). Ingen ny mekanism, inget nytt flöde, ingen ny hemlighet.

**Tre frågor för tre dödssätt:**
1. jobbet saknas eller är avaktiverat,
2. det har inte kört inom **180 min** (tre missade timkörningar; healthcheck kör varannan timme och hinner se det),
3. det kör men **inget svar** har kommit.

Den tredje är 9d-läxan tillämpad på vakten själv: pg_net är asynkront, så `succeeded` i `job_run_details` betyder bara
*lades i kö*. Bara en rad i `net._http_response` som bär markören `larmvag` bevisar att vakthunden verkligen körde.
Existensvaktat med `to_regclass` i stället för en naken `catch`, så ett riktigt läsfel i drift faller högljutt medan CI
hoppar rent — fail-soft-läxan tillämpad i förväg.

**Bevis, båda hållen samma timme:**
- Skarpt på main 10:4xZ: `vakthunden: aktiv=1 · senaste körning 21 min · senaste svar 21 min (frist 180)` ⇒ HEALTHY.
  **Att *svar* och *körning* visar samma ålder är beviset** att markören spårar vakthundens egen körning och inget annat.
- **Framkallat fel** (jobbnamnet bytt på en slängkopia, grenen raderad): `aktiv=0 · senaste körning aldrig` ⇒ UNHEALTHY
  med rätt rad, och **issue #399 skapad**. Larmvägen är därmed bevisad hela vägen — detektion → exit 1 → issue. Issuen
  är stängd med en kommentar som säger att den kom ur ett motprov.

**Stängt: #50, efter sexton dygn.** Frågan kortet ställde 4/9 — *vem vaktar vakten* — är besvarad. Kortet hade redan
formulerat svaret 5/9 (*pulsen gav en oberoende klocka, inte en oberoende löpare*) och löparen fanns sedan 14/9; det som
saknades var frågan.

**Nytt: kort #222** för det som INTE löstes och som är en annan fråga — checkar som inte kan fyra: 9c (villkoret kan
aldrig bli sant), 9d (mäter fel led), check 1 (mäter `synced_at`, inte att kursorn rör sig) och mätvaktens schema som
aldrig jämförs mot pulsklockans lista. **Kräver deploy av vakthunden**, till skillnad från dödmansgreppet — därför eget
kort med fyra framkallade fel som Verify.

*Alternativ som valdes bort:* låta vakthunden stämpla en egen hjärtslagsrad i databasen — hade gett en starkare signal,
men kräver en deploy av funktionen och en ny tabell; `net._http_response` bär redan spåret. · behålla #50 öppet tills
allt i genomlysningen är åtgärdat — avvisat: kortet är 130 rader från 4 september, och en fråga per kort är hela poängen.

## #255 (20/9 2026) Kort #222 byggt, deployat och bevisat — vakthunden ljuger inte längre om fyra saker

**Bengts order 20/9:** *"kör 222 och stäng sedan vad som ska stängas"*.

**Fyra tätningar (PR #402), alla i drift efter deploy 11:2xZ:**
1. **Check 1 mätte bara `synced_at`**, som sätts vid varje lyckat ANROP — en fastfrusen `last_change_id` såg kärnfrisk
   ut. Nu jämförs livemotorns kursor mot GitHub-ingestens: samma ström, två kursorer, och faller den snabba bakom den
   långsamma har kursorn slutat röra sig. **Ingen historik behöver sparas.** Jämförelsen görs i SQL — changeid är 19
   siffror och spräcker JavaScripts heltal.
2. **Check 9c krävde färre än 4 källor** i `sync_state`, men det finns fem och rader raderas aldrig: villkoret kunde
   aldrig bli sant. Nu en namngiven lista, så ett bortfall larmar med källans namn.
3. **Check 9d läste cron-statusen** för ingest-live; pg_net är asynkront, så `succeeded` betyder *lades i kö*.
   Kommentaren säger nu det rakt ut, och **effekten mäts bredvid**: rör sig `situation_archive` inom 30 min?
4. **Mätvakten räknade aldrig pulsjobben mot listan** — ett avaktiverat jobb föll tyst ur bevakningen. Nu ett golv, och
   en **hängande** körning (inget utfall än) larmar i stället för att passera både utfalls- och ålderstestet.

**Bevis EFTER deploy, med funktionens eget larmprov — inte med commit-hashen.** Lokala filen diffades mot main före
deploy (noll skillnad, CLAUDE.md:s regel). Fyra nya rader med innehåll: `kursorer road_conditions: live 848028 · arkiv
848028` · `sync_state: 5 källor (väntade 5)` · `livemotorns effekt: situation_archive rörd för 3 min sedan (gräns 30)`
· `pulsjobb: 11 aktiva (golv 11)`.

**Varje check bevisad att den DISKRIMINERAR** (motfrågor mot drift, inget rört): kursorn larmar inte nu men larmar om
arkivet går ett steg före · 9c ger tom lista nu men namnger en källa som saknas · effekten ger `1 min` nu, **`null` om
arkivet vore tomt** och **`47` om inget rörts på 45 min** · pulsgolvet larmar vid 12 men inte vid 11.

**`PULS_GOLV` är en kopia** — vakthunden kör i Deno hos Supabase och kan inte importera pulsklockans TypeScript. Därför
under kontrakt (39 håller, värde 11), och pulsklockan vaktar dessutom själv att `ANTAL_NYA` stämmer med `NYA`. Två
motprov: 11→12 fäller grinden; ett struket jobb utan ändrat tal fäller pulsklockans självkontroll.

**Stängt: #222.** Öppna kort 95 → 94.

**Inte stängt, med skäl: #76** (*vakthunden mäter fel led*). Manifest-sha-kontrollen är bevisligen i drift
(`manifest: 2 min | sha stämmer`), men kortets egen Verify kräver att vakthunden **larmat OCH tystnat på RIKTIGA data**
— inte på ett larmprov. Det villkoret är inte uppfyllt, och kortet säger uttryckligen *"inte förr"*.

**Kvar som egen sak:** `runs?per_page=1` tar fortfarande senaste körningen oavsett trigger, så en manuell
knapptryckning kan nollställa mätvaktens klocka. Litet, kräver en till deploy, tas när något annat ändå rör vakthunden.

## #256 (20/9 2026) Kort #76 stängt — beviset fanns sedan 16/9, i issue-historiken ingen läste

**Bengts order 20/9:** *"kör 76"*. Kortet *vakthunden i Supabase mäter fel led* hade fixen på main sedan **8/9** och
stod öppet på ett beviskrav: *stängs när vakthunden bevisligen larmat OCH tystnat på RIKTIGA data (issue med etiketten
vakthund), inte förr.*

**Det fanns inget att bygga. Beviset var fyra dygn gammalt.** Av repots tio vakthund-issuer är **#317** den enda som
fällde på just led 3: öppnad av den **schemalagda timkörningen 16/9 21:07:49** med raden *❌ **Appen får gammal data**:
manifestet 47 min gammalt (publiceras var 10:e min)*, och **stängd 22:07** av nästa gröna körning. Inget larmprov,
ingen knapp — led 3 larmade på verkligheten och tystnade när den rättade sig. Exakt kortets villkor.
(#332 fällde på databasen, 168 MB, och #334 på väderdatan, 137 min — också riktiga larm, men andra led.)

**Deployen, som stod som obevisad sedan 8/9, är också bevisad:** vakthundens eget larmprov 20/9 10:42 bär raden
`manifest: 2 min | sha stämmer` ur det som faktiskt kör. Båda grenarna finns i driftkoden — åldern på `generated_at`
och sha256-jämförelsen — plus svarskoderna för `manifest.json` och `live.json`.

**Öppna kort 94 → 93.**

**Mönstret, fjärde gången på ett dygn.** #250 sex överspelade kort · #252 två dubbletter · #254 #50 vars slutvillkor
uppfylldes 14/9 · nu #76, stängbart sedan 16/9. Alla fyra hade sitt bevis i repot eller i GitHub, och inget av dem
flyttades. **Slutsatsen är inte att någon slarvat, utan att beviskraven pekar på ställen ingen läser:** ett kort vars
villkor är *"en issue med etiketten vakthund"* stängs bara om någon läser issue-historiken mot korten, och det gör
ingen rutin i dag. TAVELREGELN punkt 3 förutsätter att verkligheten kommer till tavlan; här måste någon hämta den.
**Följd att överväga (inte beslutad):** vakthunden kan själv stänga kort vars bevis är dess egna issuer — eller enklare,
en rad i månadens genomgång som läser stängda issuer mot öppna korts beviskrav.

**Kvar öppet i samma familj, med skäl:** inget. #50, #76, #215 och #222 är alla stängda. Vaktkedjan är för första
gången hel: healthchecken vaktar vakthunden (#50), vakthunden mäter rätt led (#76), och dess egna checkar kan fyra (#222).


## #257 (20/9 2026) Arkivet har en backup — veckodump till GitHub-release, återläst och radräknad i varje körning (kort #213)

**Axels order 20/9, efter genomlysningen:** *"vi börjar att göra backupen nu"*. P1 i `docs/GENOMLYSNING-2026-09-20.md`:
178 MB på gratisnivån, inga backuper, och Trafikverket ger bara nuläge och delta — det som tappas är borta för alltid.

**Beslut:** `.github/workflows/arkivbackup.yml`, söndag 03:17Z + knapp. `pg_dump` (custom-format) av alla scheman utom
Postgres egna och Supabases förvaltade — i dag `dk fi no public`, ett nytt landsschema följer med av sig självt — över
sessionspoolern (port 5432; 6543 är transaktionsläge). Dumpen läggs som release `arkiv-<tid>` i det här repot: utanför
Supabase, synlig i repot, nedladdningsbar till vilken disk som helst. De 12 senaste behålls (≈ tre månader; gallras SIST i
jobbet, så en fallen körning gallrar inget). Larm: issue med egen etikett `arkivbackup` — inte `incident`, som healthchecken
auto-stänger vid nästa gröna körning.

**Ett grönt jobb betyder återläst, inte bara sparad.** Radantalen räknas per tabell i källan före dumpen, dumpen läses
tillbaka i en PostGIS-container i samma körning och räknas igen; varje tabell måste nå ≥ 97 % (arkivet växer och gallras
mellan räkningen och dumpens ögonblicksbild).

**Alternativ som valdes bort:** Actions-artefakt (max 90 dygn, räknas mot lagringskvoten, osynlig utanför körningen) ·
eget backup-repo (växer utan gräns i git-historiken) · Bengts disk (handgrepp, inget larm) · vänta på Supabase Pro (1/11 —
sex veckor utan skydd; Pro ger sedan dagliga backuper med 7 dygns fönster, och veckodumpen behålls ändå som kopia utanför
leverantören).

**Bevis (körning 35518932054, grön 15:15Z, 84 s):** servern Postgres 17.6; 30 av 30 tabeller, **601 712 rader i källan =
601 712 återlästa**, alla ✅ — weather_observations 389 779, fi.weather_observations 64 105, radar_precip 50 292,
no.weather_observations 50 056, trend_kandidater 11 879, spatial_ref_sys 8 500. Release `arkiv-2026-09-20T1515Z`,
22 342 159 byte, sha256 `ffe70c8275a8a72108f6cd37e4b1b72b0a3d0700dcc743ea9075275884bb322c`; laddad ner oberoende på Axels
dator: samma storlek, samma sha256, huvudet `PGDMP`. Larmvägen bevisad på verkligheten, inte med prov: körning 2 föll och
skapade issue #406 15:12Z, körning 3 stängde den 15:15:34Z. Kostnad: cirka 1,5 debiterade minuter i veckan.

**Två lärdomar ur de två fallna körningarna:** (1) PostGIS ligger i `public` i arkivet (sql/001 skapar den utan schema),
inte i `extensions` som Supabases dokumentation antar — provet med PostGIS i `extensions` fällde 19 tabeller på
`type "public.geometry" does not exist`. En återläsning på en annan maskin börjar alltså med `create extension postgis` i
public. (2) `gh release` utan checkout kräver `--repo`; jobbet checkar medvetet inte ut repot.

**Kvar, som eget kort (#223):** dumpen kör i Actions, och Actions dog tyst 5/9. Då tystnar dumpen och healthchecken
samtidigt. Vakthunden i Supabase är det enda som kör utanför — den bör fråga GitHub om senaste `arkiv-`-releasen är yngre
än 8 dygn.

## #258 (20/9 2026) Motorfixarna ur genomlysningen: tidiga ropet engångs, road:null i iOS, prioritetsgenombrottet certifierat (kort #210, #211, #212-delen)

**Axels val 20/9:** *"motorfixarna först"* — det som hörs i bilen, utan att kräva beslut.

**#211 — det tidiga ropet är engångs per fara (engine/src + Kotlin + Swift).** Reprisregeln (600 s OCH 5 km) återarmade
`<id>#early` när båda passerats; under ~48 km/h hinner det ske innan 2 km-horisonten nås, och "Överväg annan väg" sades två
gånger före påminnelsen — tre repliker mot #28:s två. Alternativet, att göra reprisregeln undantagslös för olyckor, valdes
bort: felet är inte reprisregeln utan att det tidiga ropet aldrig var tänkt att repriseras. Nu: har `#early` talat talar det
aldrig igen för den faran; nära-platsen är orörd. **v25** låser det: 44,5 km/h och olyckan 10 945 m fram — sökt fram med
motorns egen haversine som **enda kombination i 30–47 km/h (halvsteg) där båda horisonterna får ≥ 5 m marginal till närmaste
fix** (5-metersregeln; 45 km/h jämnt gav 4,7 m). Gamla motorn på v25: t=76, **t=676 igen med 2 586 m kvar**, t=724. Nya:
t=76 och t=724.

**#210 — `road: null` i iOS-appen.** `SnapshotRepo.swift` plockade `road` med `str()`, som gör NSNull till strängen
`"<null>"`; publiceraren skriver `road: null` för 38 av 732 olyckor på 30 dygn. Rättat till `d["road"] as? String` (nil), samma
mönster som `slut` på raden ovan. **v26** (severity 5, `road: null`) låser JSON-null i alla tre vektorläsarna och motorerna.
**Ärligt:** vektorn föll INTE före fixen — Swift-motorns vektorläsare (`as? String`) gjorde redan rätt; felet satt i appens
plockare, som inget testmål täcker. Kortet stängs först när ett iOS-bygge säger en olycka utan vägnummer rätt.

**#212, prioritetsdelen — genombrottet har täckning.** Minsta avstånd mellan två varningar i sviten var exakt 10 s (v23:s is
kom 20 s efter kameran), så grenen "viktigare släpps igenom spärren" (#127) kördes aldrig. **v27:** kamera 3 000 m talar t=113,
isstation 3 300 m kvalificerar t=119 (leadM 666 m, marginal 11 m åt båda hållen) och talar ändå, 6 s senare. Och
`test/engine.test.ts` krävde ≥ 10 s mellan ALLA varningar — den hade fällt v27. Nu kräver den ≥ 10 s ELLER strikt viktigare,
motorns regel. Test och motor säger samma sak igen.

**Bevis:** `npm test` 31/31 lokalt; ci #35519941072 grön (kontraktsgrinden, beroendekartan, vektorgeneratorn återskapar sviten,
27 vektorer); android #35519579658 och ios-engine #35519579572 gröna på 9d3f56c — samma tre vektorer byte för byte i Kotlin och
Swift. Skuggmotorn buntad (`--check` i synk) och deployad i samma varv: deploy-supabase #35519582721, *"Deployed Functions on
project …: skuggmotor"*. Första ci-körningen föll på beroendekartan — `arkivbackup.yml` (#213) hämtar från apt.postgresql.org
och www.postgresql.org; deklarerade som bygg i `publish/beroenden.ts` (93ed4e8). Grinden gjorde sitt jobb.

**Kvar av #212:** trösklarna (korridor 5°–90°, repris 0–50 000 m, bäring, lägsta fart, förvarning) och v03/v20 — mätning per
tröskel och en vektor åt vardera hållet. Eget varv.

## #259 (20/9 2026) Beslutsnumren görs unika utan att historiken skrivs om — och en vakt som håller dem så (kort #220)

**Fyndet (genomlysningen, P9):** 245 rubriker, elva nummer utdelade mer än en gång. Sju var *olika* beslut under samma nummer
— #55, #60 (tre gånger), #72, #73, #78, #124, #126 — och fyra var tillägg till samma beslut (#30a, #31, #40, #77-bevis).
"Slå upp #126" gav marginalvakten i grind-a.ts och den överskrivna checken i CLAUDE.md.

**Beslut:** numret behålls av den post som flest hänvisningar menar; den andra får bokstav. #55 ankarfyndet / #55b
kameratoleransen · #60 källbeslutet radar / #60a rutinfelet med rött kontrakt / #60c frost-rekognoseringen · #72 livekedjan till
Supabase / #72a kursormätningen · #73 egen kursor / #73b vakthunden till Supabase · #78 grannlandsfilerna + deploy-knappen / #78b
larmvägen · #124 ruttberedskapen / #124b väglagets ålder · #126 marginalvakten / #126b överskriven check. Tilläggen #31a och #40a.
Alternativet — omnumrera löpande — valdes bort: var och en av de här numren är citerad i tavla, status, tröskeldokument och kod,
och #60-noten (2/9) sade redan *historik skrivs inte om*. **27 hänvisningar rättade,** var och en läst i sitt sammanhang (en
"#73" i STATUS var ett healthcheck-körningsnummer, inte ett beslut, och lämnades). Kodkommentarer under `supabase/functions/`
(vakthund #73/#124, publicera #124, snapshot-core #124) är orörda: en ändrad funktionsfil kräver deploy, och en kommentar är inte
värd en deploy.

**Vakten:** `scripts/beslutsnumren.ts` — läser rubrikerna `## #<id>`, fäller dubbletter, skriver ut nästa lediga nummer. Steg i
ci.yml efter beroendekartan, med självtest. Mutationsprov 20/9: påhittad `## #100` ⇒ *✗ DUBBLA BESLUTSNUMMER: #100 (2 gånger)*,
exit 1. Begränsning, uttalad i filen: ci hoppar över rena md-commits, så en dubblett i en md-commit fångas av nästa kodcommit.

**Nummerrymderna:** kortets Verify bad om ett K/D-prefix. Valt i stället: husstilen som redan står i nästan varje rad —
`DECISIONS #NN`, `kort #NN`, `issue #NN`, `PR #NN` — görs till regel i CLAUDE.md och överst i DECISIONS.md. Ett nytt prefix som
ingen text använder hade blivit en femte rymd.

## #260 (20/9 2026) Beslutsunderlag till kort #198: TROSKLAR-SKUGGAN §4 krockar med regel T — förslaget är en skärpning

**Bengts order 20/9** att arbeta vidare i genomlysningens lista, med #198 valt eftersom den parallella sessionen arbetar
uppifrån i samma lista. **PÅGÅR-kort satt före arbetet** — det steget missades tidigare samma dag och kostade två
stängda PR:er i dubbelarbete.

**Ingen text i det fastställda dokumentet är ändrad.** `TROSKLAR-SKUGGAN.md` §5 säger att dokumentet efter första
skuggkörningen bara ändras genom en DECISIONS-post från Bengt, som äger mätningen. Underlaget ligger i
`docs/SKUGGAN-PAR4-MOT-REGEL-T.md`; frågan står i bedömningen §4.2.

**Krocken är inte en tolkningsfråga.** T3 nämner offsetmodellen **vid namn**: *"Extrapolation är ett värde för en plats
där ingen mätt … offsetmodellens temperatur långt från ankare. Den får inte utlösa."* Segmentprognosen ÄR den storheten
— grind A prövar den med leave-one-out mot grannarnas offsetmodell. T6 säger samma sak från andra hållet: modellprodukter
får stärka, försvaga eller förlänga, aldrig ensamma utlösa. §4 (a) och (b) låter den tala.

**Förslaget:**
- **(a)** går från *"kopplas till app"* till **karta + konfidens**. Båda är uttryckligen tillåtna i regelns egen text —
  T3 säger *"får fortsatt stärka eller försvaga en varning som vilar på en mätning"*, och T6 ger två färdiga förebilder
  (`N_varning` som förlänger N, E1 som förlänger försprånget). En karta talar inte: föraren söker upp den.
- **(b)** står kvar, och det är **T5:s egen carve-out** som räddar den: ett värde som ett vittne på platsen kan fälla är
  *"inte längre extrapolation i T3:s mening"*. Men dagens lydelse villkorar på **grind A:s noggrannhet** (MAE ≤ 1,0 °C),
  och regeln kräver ett **vittne**. De två sammanfaller inte — en modell kan vara noggrann på 6 km utan att någon mätning
  på platsen kan fälla ett enskilt värde. Förslaget lägger till T1–T2 som andra villkor.
- **(c)** orörd.

**Det är en skärpning**, vilket är avgörande: §5 tillåter skärpning med en rad från Bengt, medan *lättnad är utesluten
så snart utfallet är sett*.

**Rekommendation: ta beslutet nu, inte i mars** (kortets formella frist). Skälet är inte formellt utan praktiskt: står
(a) kvar som *"kopplas till app"* kan röstvägen hinna byggas under vintern på en text som inte får användas. Och
TROSKLAR-KOMBINATIONEN §10 säger att regel T får skärpas men aldrig mjukas upp **oavsett signaturer** — ju längre §4 står
oförändrad, desto större risk att någon läser den som ett förhandlat undantag i stället för en orättad text.

**Vad som INTE föreslås:** grind A:s trösklar, banden eller minsta underlag · (c) · frysklassningens roll (#103, redan
låst av T5) · något i TROSKLAR-KOMBINATIONEN. Det är skuggans text som ska följa regeln, inte tvärtom.

## #261 (20/9 2026) Tavlans sektioner ljuger: 23 av 32 "olåsta" kort är det inte — kort #224 och #225

**Bengts fråga 20/9:** *"kan du lista de 32 som kan göras nu"*. Svaret blev en rättelse: **nio kan göras nu, inte 32.**

**Vad räkningen visade.** Sektionen *Claude — olåst* läses som *"det här kan Claude göra utan att fråga någon"*.
Kort för kort stämmer det för nio. De övriga 23:
- **7 kräver ett beslut av Bengt och Axel** — #214 (produktinvariantens lydelse), #216, #198, #151, #146, #32, och
  #185/#186 vars **egen text** säger *"väntar på Bengts och Axels"*. De är inte olåsta; de är låsta av er, utan att stå
  i någon av era sektioner.
- **5 väntar på vädret** — #209, #192, #51, #46, #45. De hör hemma i *Claude — låst*, där väderlåsta kort redan står.
- **4 väntar på en händelse** — #160, #152, #52, #44.
- **4 är överspelade** — #53 (Actions-krisen 5/9), minutbantningen, #43, och delar av flera andra.
- **3 ser byggda ut men står öppna** — #223, #210, #212, alla med commits från i dag.

**Varför det spelar roll, och det är inte bokföring.** Frågan *vad kan göras nu* är den som avgör om ett arbetspass
planeras på en dag eller en vecka. Svaret 32 hade gett fel plan. Och värre: **sju kort väntar i praktiken på er utan att
synas i era listor** — ni kunde ha gått igenom era 26 respektive 13 kort och ändå missat sju beslut som blockerar mig.

**Femte gången på ett dygn.** #250 sex överspelade kort · #252 två dubbletter · #254 kort #50 · #256 kort #76 · nu
sektionerna. Alla har samma form: förutsättningen ändrades och kortet stod kvar. TAVELREGELN punkt 3 säger att
verkligheten flyttar kortet utan att fråga — men **ingen rutin läser tavlan mot verkligheten**, och det är det som
saknas, inte omsorg.

**Två kort lagda:**
- **#224** — omklassa alla 32, stäng de överspelade med bevisrad, och för in antalet i bedömningens §0b så att nästa
  avvikelse syns.
- **#225** — verifiera de tre som ser byggda ut mot sina commits och stäng dem, eller skriv på kortet exakt vad som
  återstår. **#210 kan mycket väl vara avsiktligt öppet** — felet hörs i en telefon och ett bygge som bevisar det finns
  inte än — men då ska kortet säga det. Kortet bär också en varning: rör dem inte utan att läsa commiten, eftersom
  dubbelarbete på samma kort kostade två stängda PR:er tidigare samma dag (#407, #408).

*Alternativ som valdes bort:* rätta sektionerna direkt i samma varv — avvisat, det är 23 kort och sju av dem kräver ett
beslut om VAR de hör hemma (väntar #151 på Bengt eller är det Claudes mätning som saknas?). En omklassning utan den
genomgången hade bara flyttat felet. · bygga en maskinell vakt som läser sektionerna — avvisat tills vidare: etiketterna
är prosa, inte fält, och en regex-vakt hade gett falsk trygghet av samma slag som den trubbiga gröntoleransvakten.


## #262 (20/9 2026) Arkivbackupens ålder vaktas där Actions inte når — vakthundens check 9j (kort #223)

**Varför:** veckodumpen (#213, DECISIONS #257) kör i GitHub Actions, och Actions dog tyst 5/9 när minuterna tog slut. Då
tystnar dumpen och healthchecken samtidigt, och arkivet står oskyddat utan att någon säger till. Vakthunden i Supabase är det
enda som kör utanför och redan pratar med GitHub.

**Beslut:** check 9j i `supabase/functions/vakthund/index.ts`: `GET /releases`, senaste tagg `arkiv-`, ålder > 8 dygn eller ingen
alls ⇒ `problem.push` i driftvakthunden (samma issue som led 1–3 — arkivet utan backup är ett driftfel, inte en händelse).
Gränsen 8 = en missad söndag plus ett dygns marginal. Prov `?arkivprov=1` (dbknapp-flaggan `arkivprov`) låtsas 99 dygn.

**Bevis, i ordning:** deploy-supabase #35520901208 *"Deployed Functions … vakthund"* · dbknapp `arkivprov` 15:54Z: svaret
`arkivbackup: 1 dumpar, senaste 99.0 dygn (gräns 8) — PROV` + problemraden, larmväg ok · issue #411 skapad 15:54:35Z · **den
schemalagda timkörningen 16:07:51Z stängde #411 med den riktiga raden** `arkivbackup: 1 dumpar, senaste 0.0 dygn (gräns 8)`.

**Bifynd, rättat i samma varv:** deploy-knappen föll två gånger i rad (#35520704235, #35520805068) på `supabase/setup-cli@v1`
med `version: latest` — uppslaget mot GitHubs API görs oautentiserat från runnerns delade IP och fick *rate limit exceeded*.
Nu fast version 2.117.0 (273da5a); höjs medvetet. En deploy-knapp som faller på någon annans kvot är ingen knapp.

## #263 (20/9 2026) Trösklarna är låsta: nio vektorer och en känslighetsmätning som bor i repot (kort #212)

**Fyndet (genomlysningen, P4b):** korridorvinkeln 35° kunde vara allt mellan 5° och 90°, reprisavståndet 5 000 m allt mellan 0
och 50 000, utan att en enda av 24 vektorer reagerade. "Grönt i tre språk" bevisade alltså inte det man trodde.

**Beslut:** en vektor per regel som faller på ett steg åt vardera hållet, och mätningen som visar det görs i repot så att den
kan köras om: `scripts/matningar/vektorkanslighet-2026-09-20.ts` sveper varje tröskel i DEFAULT_CONFIG mot alla vektorer +
Skåneturen och skriver intervallet utan reaktion och vilken vektor som bryter först.

| tröskel | standard | före | efter (bryter under / över) |
|:--|--:|:--|:--|
| korridorhalvvinkel | 35° | 5–90° | **33,2–37,1°** — v28 (33° talar) / v29 (37° tyst) |
| reprisavstånd | 5 000 m | 0–50 000 | **4 510–5 990 m** — v30 |
| repristid | 600 s | (omätt) | **496–659 s** — v31 |
| bäringstolerans | 60° | 60–150° | **55,5–64,5°** — Skåneturen / v33 (65° tyst); v32 (55° talar) |
| lägsta fart | 15 km/h | 5–50 | **14,1–16** — v34 / v35 |
| kortaste förvarning | 400 m | 0–400 | **395–405 m** — v36 |

**Hur v30 skiljer sträckan från tiden:** i konstant fart över 30 km/h passeras 5 km före 600 s, så reglerna går inte att skilja.
v30 kör 80 km/h, förbi kameran, **står stilla 600 s med fart 0** (inget utvärderas, klockan går, vägmätaren står), och kör sedan
fram och tillbaka: 690 s/2 000 m tyst, 4 000 m tyst, 6 000 m talar. v31 gör tvärtom i 120 km/h: 21 km körda, tyst tills 659 s.

**Regler som följdes:** alla fixmarginaler mot en tröskel ≥ 5 m, uppmätta med motorns haversine (v36:s golv fick 5,43 / 5,67 m
efter sökning — 20 km/h gav max 2,8 m och förkastades). Ingen befintlig vektor rörd. Kotlin och Swift läser nu `headingDeg` ur
en vektor för första gången (v34/v35) — det fältet var oprövat i portarna.

**Bevis:** `npm test` 40/40; ci #35521365300, ios-engine #35521365311, android #35521365360 gröna på 88dd32c — 36 vektorer byte
för byte i tre språk. **Olåst med flit:** `leadMaxM` 3 000 (nås först över 360 km/h — ingen svensk väg), `warnLeadS` och
`globalCooldownS` låg redan på ±1.

**Läxa ur samma varv, mot mig själv:** tavelsynken som stängde #212 och #223 (ffea363) klippte "till nästa öppna kort" och
hoppade därmed över det FÄRDIGA kort #222 som låg kvar i ATT GÖRA — 39 rader bevis borta i fyra minuter. Upptäckt av
`git show --stat` (57 raderade rader mot väntade 18), återställt byte för byte ur HEAD~1 och kortmängden diffad: 118 = 118,
inget borta, inget nytt. Exakt CLAUDE.md:s regel om att diffa kortantal före push — den gäller även den som just läst den.
Numren #260/#261 i det första utkastet blev #262/#263: Bengts session tog #260 och #261 samtidigt, och `beslutsnumren.ts` sa ifrån — två gånger.

## #264 (20/9 2026) Produktinvarianten skrivs om: ingen positionsdata lämnar telefonen UTAN AKTIVT VAL (kort #214, Axel)

**Bakgrund:** sedan 16/9 POSTar facitsvaret (FacitSender.kt / Facit.swift) varnings-id, tid, app och version — och ett
varnings-id är en plats och en tid (`sql/022`). CLAUDE.md:s invariant säger *"No user location, GPS trace, or movement data may
ever be transmitted off-device. Full stop."* och `docs/PLAY-DATASAFETY.md` svarar **No** på Googles insamlingsfråga. Båda är
osanna sedan 16/9, och en osann deklaration är grund för avslag eller nedtagning mitt i facitfönstret (genomlysningen P2).

**Beslut (Axel, via Cowork 20/9 kväll):** invarianten lyder från och med nu: *ingen positionsdata lämnar telefonen automatiskt —
matchningen sker på telefonen mot nedladdade snapshots; det enda som någonsin skickas är ett facitsvar som föraren själv trycker
på, och det bär varnings-id och tid, inget spår.* Data Safety-formuläret svarar därmed **Ja** på insamling: kategori
ungefärlig plats (via varnings-id) + app-info, ändamål *appfunktioner/analys* (förbättra varningarna), frivilligt, kan inte
kopplas till person, delas inte.

**Alternativ som valdes bort:** behålla invarianten och ta bort facitsvaret (januaridomen förlorar sin enda förarkälla) ·
anonymisera svaret till bara Stämde/Stämde inte + grov tid (facit utan plats dömer ingenting).

**Bygg, nästa varv, i EN commit:** CLAUDE.md:s invariant, `docs/PLAY-DATASAFETY.md` (svaren och trafiklistan: GET på snapshoten
+ POST på facitsvaret), produktbokens integritetsrad. Formuläret i Play Console fylls i likadant före första uppladdningen.

## #265 (20/9 2026) Blindningsläckan i T-A: svepets tabell trycks inte förrän domspärren släpper — Axels val, väntar Bengts ja (kort #216)

**Fyndet (genomlysningen P4):** `scripts/grind-t-a.ts` skriver hela svepet rangordnat på separation även när domspärren håller,
och flödet ska köras inom sju dygn efter varje frostnatt — genom hela kalibreringsfönstret. Fönster, lutning och startband är
tre av kombinationens sex dimensioner; när kombinationen kalibreras 1/2 är deras utfall redan avläst och loggat i CI. D3
(kalibrering och dom på skilda nätter) skyddar då bara på papper.

**Axels val (20/9 kväll):** strypa utskriften. UNDERLAGET och fysikkontrollen skrivs som förut; svepets tabell (och
klarhetsdelens "bästa kombination", som bygger på den) skrivs först när domspärren släpper. Tre rader kod, och läckan är tät
i stället för deklarerad. Alternativet — en rad i TROSKLAR-KOMBINATIONEN om att dimensionerna är förvalda — skyddar bara den
som läser raden.

**Villkor:** mätningen är Bengts, så det byggs först när han sagt ja. Bygget: `grind-t-a.ts` + raden i TROSKLAR-KOMBINATIONEN
(hur delgrindarnas körningar förhåller sig till D3) i samma commit, före första frostnatten.

## #266 (20/9 2026) Viltrösten säger vad datan bär: "Viltrisk framöver." — utan art (kort #217, Axel)

**Fyndet (genomlysningen P7):** rösten säger *"Viltrisk — vanlig olycksplats för älg den här tiden"*, men källan är enskilda
polishändelser inom 48 h och ingen adapter läser arten — "älg" sägs även vid rådjur. Alert copy får aldrig överdriva vad datan
bär (CLAUDE.md, produktinvariant).

**Beslut (Axel, via Cowork 20/9 kväll):** rösttexten blir *"Viltrisk framöver."* — punktkälla, därför "framöver" (texts.ts-regeln),
ingen art, ingen "vanlig olycksplats". Arten kommer tillbaka den dag en adapter läser den ur polisens händelsetext (eget kort
då). Alternativ som valdes bort: bygga artläsaren nu (större bygge före ett facitfönster) · låta rösten stå kvar.

**Bygg, nästa varv, i EN commit:** `engine/src/texts.ts` + Kotlin + Swift, vektor v13 regenereras (den enda gången en frusen
vektor ändras är när regeln själv ändras — det är det här), skuggmotorn buntas och deployas, produktboken uppdateras
(PRODUKTBOKSREGELN) och vektorantalet där rättas till 36.

## #267 (20/9 2026) Axels svar på §8 i FACIT-EFTER-RESAN — sju av åtta avgjorda, byggordningen står öppen (kort #203)

**Axel svarade 20/9 kväll via Cowork**, på beslutsunderlaget `docs/FACIT-EFTER-RESAN.md` (skrivet 19/9). Sju svar följer
rekommendationen och är därmed avgjorda; ett krockar med ett beslut Bengt tog 20/9, och ett nytt krav tillkom.

**Avgjort:**
1. **Undantagsprincipen med underskrift — ja.** Axels skäl är fälttesterna, inte principen: *"med tystnad som ja hade
   två resor med en trasig app bokförts som bekräftelser."* KB-D7 (*ett svar är en handling; tystnad är inget svar*)
   går till Bengt för TROSKLAR-KOMBINATIONEN.
2. **Placeringen — ja, alla tre.** *"Låsskärmen är det viktiga. Föraren ska aldrig behöva öppna appen för att svara ja."*
3. **Siri — de två första fraserna.** *stämde inte* och *appen missade* kan inte vänta till efter resan; *stämde*
   behövs inte under körning, det är vad låsskärmen är till för. (Underlaget föreslog samma.)
4. **Missarna — ja, som ett medvetet integritetsbeslut.** Axel skrev ut vad han sa ja till: *"station-id plus klockslag
   säger ungefär var föraren var … det är inte en position, men det är en position i grova drag."* Villkor: brytarens
   text säger det ordagrant, och produktboken uppdateras samma dag. **Faller in under kvällens omskrivna invariant
   (#264):** ingenting lämnar telefonen utan förarens aktiva val — missen är ett tryck, inte ett spår.
5. **Stor knapp *Appen missade* — ja.** Androids enda väg, iPhones reserv.
6. **Lager 3 (knappar i körläget vid stillastående) — nej.** Utgår ur första bygget.
8. **Android i samma PR — ja.**

**Nytt krav, Axels eget tillägg: kortet ska visa varningarna, inte räkna dem.** *"Ja, alla stämde" efter tre timmars
körning — minns föraren de tre varningarna?* Kortet på *Redo.* visar i förslaget *"3 varningar"*; det ska i stället
visa de tre raderna med klockslag och text, så att trycket är ett svar på något föraren läser. Kostar en vy.
**Bedömning:** rätt, och det gör KB-D7-kontrollen mindre bärande — men inte onödig. Vanan att trycka *Ja, alla* utan
att läsa finns kvar, kontrollen (jämför *Ja, alla*-resor mot rad-för-rad-resor) kostar ingenting i domen, och en
kontroll som tas bort för att designen blev bättre är den sortens skydd huset redan förlorat en gång. Båda behålls.

**Öppet — beslut 7, byggordningen.** Axel svarade **A** (0.3.8 ut nu, #203 i 0.3.9): *"sändkanalen från en riktig
telefon har aldrig bevisats … att vänta och bygga allt i ett är att lägga en obevisad kanal under en ny funktion."*
Bengt beslutade **C** samma dag (#242): ett sammanhållet bygge, kanalen bevisad utan TestFlight genom simulatorprovet.
Underlaget Axel läste var 19/9-versionen — det rekommenderade C först efter Bengts invändning 20/9, och regeln hette
då ännu KB-D5 (rättat till KB-D7 samma dag, #242). **Två fakta som ingen av de två svaren kände till:**
- **Simulatorprovet är ogjort.** `driver_facit` 20/9 16:07Z: 0 riktiga svar, 2 provrader, ingen `cam:fotostudio`.
  C:s billiga kanalbevis har alltså inte tagits ut, och C:s fördel framför A är så länge bara påstådd.
- **Motorfixarna ligger i main sedan i kväll.** #210 (iOS sade *"på väg &lt;null&gt;"* vid var tjugonde olycka) och
  #211 (tredje olycksropet) når en telefon bara genom ett bygge. Det gör A till mer än ett kanalprov: det är vägen som
  får två hörbara fel ur Bengts bil före nästa fältrunda. Det skälet fanns inte när #242 skrevs.

**Ingen byggordning ändras här** — Bengts beslut står tills han och Axel talat. Frågan ligger på kort #203 med båda
skälen och de två nya fakta.

**Byggredo, kontrollerat i samma varv (Axels fråga):** ci ✅, ios-engine ✅, android ✅ på 88dd32c; allt pushat därefter
är dokument. Den gamla raden *"diffen mot 79e4195 är tom"* på tavlan är därmed osann sedan i kväll och är rättad.
**Enda oprövade biten:** `SnapshotRepo.swift` ligger i app-målet, som inget CI-flöde kompilerar (ios-engine kör
`swift test` på motorpaketet, på Linux). Typen stämmer (`PointMeta.road: String?`), men första kompileringen sker i
Axels Xcode.

## #268 (20/9 2026) Play-kontot: underlaget skrivet ur källan — testkravet låser produktion, inte betan

**Bengts order 20/9:** *"hjälp mej sätta upp ett google play konto"* och *"plocka upp kortet … och börja utföra"*.
Underlaget ligger i `docs/PLAY-KONTO.md`. **Allt är läst på Googles egna hjälpsidor samma dag**, enligt CLAUDE.md:s läxa
om att en instruktion till Bengt eller Axel ska vara läst på källsidan — reglerna ändrades 13/11 2023 och ett minne
hade varit fel.

**Fyndet som lättar i stället för att tynga.** Google kräver att personliga konton skapade efter 13/11 2023 kör ett
slutet test med **minst tolv testare som deltagit löpande i minst 14 dagar** innan produktionskanalen öppnas. Men samma
sida säger att kravet bara låser *Produktion* och *Förhandsregistrering*, och att **slutet test kan startas så snart
appen är konfigurerad**. **Novemberbetan ÄR det slutna testet**, och S5:s tolv testare är samma tolv Google räknar.
Kontot blockerar alltså inte betan. Det sätter en klocka: publik release tidigast fjorton löpande dygn efter att de
tolv är på plats — och bara om alla tolv är kvar hela tiden.

**Valet som måste göras före registreringen, för kontotypen väljs en gång:**
- **Personligt:** ingen ledtid, 25 USD engångsavgift. Kräver tolv × 14 dygn före produktion. Visar en **privatpersons**
  juridiska namn och land på Google Play.
- **Organisation:** inget testkrav, men **DUNS-nummer tar upp till 30 dagar**, och kräver organisationens namn, adress,
  telefon och webbplats. Föreningen finns inte än — det är samma obesvarade fråga som i Skyltfondspaketet, och 30 dagar
  från i dag är 20 oktober, tio dagar före betan.

**Rekommendation: personligt konto nu.** Organisationen finns inte, DUNS-ledtiden äter marginalen, och betan blockeras
inte. **Migrering till organisation senare är INTE verifierad** — den behandlas som okänd, inte som given. Apple-kontot
är Individual i Axels namn, så två olika säljare för samma app vore ett val, inte en slump.

**Ordningen som följer:** kontot kan registreras i dag, men **första uppladdningen bör vänta tills #214 är rättad** —
en osann Data Safety-deklaration är grund för avslag mitt i det enda facitfönster vintern ger. Och jks-filen ska ligga
i iCloud innan första uppladdningen: efter den är nyckeln bunden hos Google.

**Vad Claude inte gör:** skapar inte kontot, godkänner inte avtalet, betalar inte avgiften, anger inga
identitetsuppgifter och loggar inte in. Det är ägarens, och det är avsiktligt.


## #269 (20/9 2026) Byggordning A efter allt — simulatorprovet föll på Xcode, och det avgjorde frågan (kort #203, Axel)

**Axels beslut 20/9 18:35:** *"Jag gör en ny release."* 0.3.8 (11) arkiveras nu; #203 går i 0.3.9. Det ersätter
byggordning C (Bengts beslut samma dag, #242).

**Vad som hände, i ordning.** Axel svarade på §8 med A (#267). Han valde sedan själv att göra C:s simulatorprov först,
så att valet skulle stå mellan två kända alternativ i stället för ett vad. Provet kördes: `xcodegen`, Team nollställd
som alltid, destination bytt till iPhone 16e (iOS 26.1), `-fotostudio_facit` i schemat — och installationen föll på
**Xcodes egen infrastruktur**: *"Simulator device failed to launch se.halkvakt.app … The system shell probably
crashed"*, `BSErrorCodeDescription = host down`, `NSPOSIXErrorDomain 64`, efter 94 sekunder. Maskinen är en M1 Air med
8 GB som kör Xcode 26.1 mot en färsk iOS 26.1-runtime.

**Det är inte ett sidospår, det ÄR svaret.** C valdes framför A på premissen att kanalen kunde bevisas **billigt**,
utan TestFlight, i simulatorn (#242). Premissen höll inte på den här maskinen: provet kostade en kvart och gav inget
bevis, alltså mer än den fältrunda det skulle spara.

**Vad som faktiskt är bevisat, och inte.** Kedjan har tre led:
1. **Knapparna syns** — gick sönder i 0.3.7 (`FacitRow` saknades, #240); fixat i 0.3.8, obevisat på en telefon.
2. **Appen skickar** — aldrig bevisat, på någon plattform.
3. **Servern tar emot och skriver** — **bevisat 16/9, två gånger.** Tabellens två rader (`prov:kam1`, `cam:prov-ios`)
   är serverprov i apparnas form, inte app-sändningar (#227). Ett nytt serveranrop i kväll hade därför bevisat noll.

Simulatorprovets hela värde låg i led 2 — i en simulator. Bengts första resa bevisar led 1 OCH 2, i verkligheten, och
den provkörningen måste ske ändå.

**Det som gör A försvarbart, och det är kod, inte tillit:** appen skvallrar om sitt eget fel. `FacitSender.flush()`
skriver serverns svar rakt in i gränssnittet under knapparna — `"Skickat HH:MM (n svar)"` eller
`"Kunde inte skicka HH:MM: HTTP 400 …"` — och Android gör samma sak (`Prefs.setFacitStatus`, `FacitSender.kt:34`).
Ett trasigt led 2 kostar alltså en skärmbild, inte en tyst fältrunda. **Tystnaden var faran i 0.3.7, inte felet.**

**Bonus som inte fanns när C valdes:** 0.3.8 bär nu också kvällens motorfixar — #210 (`"på väg <null>"` vid var
tjugonde olycka) och #211 (det tidiga olycksropet engångs). De når en telefon bara genom ett bygge. Kort #210 stängs
när en olycka utan vägnummer sägs rätt i bilen.

**Förkontroll enligt CLAUDE.md före uppmaningen att arkivera:** ci ✅, ios-engine ✅, android ✅ på 88dd32c; allt pushat
därefter är dokument. Fotostudio-kroken är `#if DEBUG` och kompileras bort ur arkivet.
**Oprövat, uttalat:** `SnapshotRepo.swift` ligger i app-målet, som inget CI-flöde kompilerar — arkiveringen är första
gången kvällens rad kompileras.

**UTFALL 20/9 18:38: uppladdad.** Organizer: *Halkvakt 0.3.8 (11) — Uploaded to Apple*, Team Axel Lagerlöf, arm64,
`se.halkvakt.app`, build number 11. Arkiveringen bevisade tre saker på en gång: app-målet **kompilerar** med kvällens
rad (det oprövade ovan), versionsspåret håller (11 > 0.3.7:s 10), och signeringen gick igenom efter att `xcodegen`
nollställt Team. Exportdeklarationen låg redan i `project.yml` (`ITSAppUsesNonExemptEncryption: false`), så bygget
fastnar inte på *Missing Compliance*. **Kvar, och det är hela poängen med A:** led 1 och 2 bevisas av Bengts första
resa — receptet står på kort #203.

**Till Bengt:** C var rätt resonemang på fel maskin. Invändningen — en uppdatering i stället för två — står kvar och
gäller nästa gång; det som föll var antagandet att simulatorn kunde ersätta en telefon till en låg kostnad.

## #270 (20/9 2026) Data Safety sann igen — och fyndet att integritetspolicyn ljuger på samma sätt (kort #214)

**Byggt på Axels beslut #264 samma kväll.** `docs/PLAY-DATASAFETY.md` svarade **"No"** på Googles insamlingsfråga.
Det var sant 27/8 och osant från 16/9, när S4:s facitsvar började POSTa varnings-id och klockslag.

**Deklarationen nu, läst ur koden och inte ur minnet:** insamlingsfrågan **Yes**; datatyp **Location → Approximate
location** (vi skickar ingen koordinat, men varnings-id pekar på en fara som har en plats och `t` säger när — Googles
fråga är vad som lämnar enheten och vad det säger, inte vilket format det har); **Collected** ja, **Shared** nej,
**Processed ephemerally** nej, **Optional** (BETATEST är av som standard och varje svar kräver ett tryck), ändamål
**App functionality + Analytics**, **inte kopplad till identitet**, **inte tracking**. Krypterad i transit: ja.
Utgående trafik listad rad för rad ur `FacitSender.swift`/`.kt`, `Facit.body()`, `facit-svar/index.ts` och `sql/022`.

**CLAUDE.md:s invariant omskriven** enligt #264, med en rad om att en ändring i utgående trafik måste röra fyra
dokument i samma commit — det var precis det som inte hände 16/9.

**FYNDET, som kortet inte kände till: den publicerade integritetspolicyn ljuger på samma sätt.**
`integritet.html` i `Axelstar/halkvakt-karta` — den URL Google kräver i butiksfältet — säger fortfarande
*"Kärnlöftet: din position lämnar aldrig telefonen"* och *"Vad vi samlar in: **Ingenting.** … skickar aldrig din
position, dina resor eller något annat om dig till oss eller någon annan."* **Google jämför formuläret mot policyn.**
Två dokument som säger olika saker är ett avslag som ser ut som slarv. Utkast till nytt stycke skrivet; texten är
Axels att godkänna, för till skillnad från de andra tre är policyn ett publikt löfte.

**KVAR SOM ÄGARBESLUT: raderingsfrågan.** Formuläret frågar om användaren kan begära radering av sin data. Vi har
ingen väg — och kan inte ha en: ingenting i ett facitsvar identifierar avsändaren, så "mina rader" går inte att peka
ut. Bra för integriteten, obekvämt för formuläret. Tre alternativ i filen: (1) svara Nej och förklara varför i policyn
— testaren kan alltid slå av brytaren; (2) töm tabellen för perioden på begäran — trubbigt, förstör facit för alla
andra; (3) slumpat facit-id per telefon — löser formuläret men **inför en identifierare där ingen finns i dag**, och
det gör appen sämre på det den är bäst på. **Rekommendation: 1.** Bengt + Axel, före första uppladdningen.

## #271 (20/9 2026) Play-kontot skapat — och kravet som gör en begagnad Android-telefon till en grind (kort #219, punkt 7)

**Axel registrerade och betalade 20/9 18:51.** **Lagerlöf Labs**, personligt konto (enligt #268:s rekommendation),
konto-id `7591030412981889366`. Utgivarnamnet är detsamma som i App Store Connect — en säljare för samma app i båda
butikerna, vilket var ett av skälen mot organisationsvägen.

**Kontot är skapat men inte färdigt.** Play Console kräver tre verifieringar innan något kan publiceras:
1. **Identiteten** — officiellt ID-dokument laddas upp; Google skriver *"Verifieringen kan ta några dagar"*.
2. **Åtkomst till en fysisk Android-enhet** — bevisas genom inloggning i Play Console-mobilappen på en riktig telefon.
3. **Kontakttelefonnumret** — kan inte göras förrän 1 är klar.

**Fyndet: punkt 2 är en grind, inte en formalitet, och den har stått öppen i 26 dygn.** DECISIONS #16 (25/8) skrev
redan: *"Axels enda telefon är en iPhone … fysisk Android-testenhet = öppen fråga (pappa? begagnad?)"*, med
rekommendationen begagnad Samsung Galaxy A-serie för 800–1 500 kr. Då var den en bekvämlighet för fälttest. **Nu är
den ett publiceringskrav:** utan en Android-telefon kan kontot inte slutföras, och utan ett slutfört konto kan
ingenting laddas upp — oavsett hur färdig appen är. Det är den billigaste grinden i hela novemberkedjan och den
blockerar alla andra.

**Samma fråga, en storlek större.** Googles slutna test kräver **tolv testare med Android-telefoner** i fjorton
löpande dygn. Väntelistans tolv (Axels åtagande 31/8) är inte sorterade på plattform, och **Android-appen har aldrig
körts på hårdvara** — CI kör emulator, versionen står på 0.3.1 (versionCode 4) mot iOS 0.3.8 (11). Det är samma hål
som genomlysningens P6, men med en deadline på sig.

**Ledtiderna staplas och de är seriella:** ID-verifiering (några dagar) → telefonnumret → en Android-telefon som ska
skaffas → första uppladdningen (som väntar på #214, nu rättad) → tolv testare × 14 löpande dygn. Det är den kedjan
som bestämmer novemberdatumet, inte när koden blir klar.

**Nästa steg som inte kräver telefonen:** identitetsverifieringen kan startas i kväll, och appposten i Play Console
kan skapas med butiksmaterialet som redan finns (`marknadsforing/butik/`: text, feature graphic 1024×500, ikon 512,
plus skärmbilderna i `docs/produktbok/`).

**LÖST SAMMA KVÄLL:** Axel — *"vi har en Android som vi kan använda"*. Grinden var alltså en fråga ingen hade ställt,
inte en kostnad. Verifieringen görs genom att installera Play Console-appen på den telefonen och logga in med kontots
Google-konto. **Följden som är större än bocken:** Android-appen kan för första gången köras på hårdvara —
debug-APK:n byggs redan som artefakt i varje `android`-körning.

**Vad Android faktiskt saknar, mätt 20/9 (inte gissat).** Kortet #219 säger "sju versioner efter", men versionsnumret
mäter fel sak: Android 1 814 rader mot iOS 2 125, och funktionerna finns på båda — *Senast sagt*, facitknapparna,
BETATEST-brytaren, autostart, körläget, inställningarna. **Tre verkliga hål:**
1. **Introduktionen saknas helt** — noll träffar på onboarding i hela `android/`. iOS har fyra sidor (`OnboardingView`).
2. **Versionsnumret står stilla** på 0.3.1 / versionCode 4 sedan 0.3.1, trots att koden följt med. Första
   Play-uppladdningen låser versionCode-spåret, så det ska rättas FÖRE den, inte efter.
3. **Förvarningsreglagets spann skiljer sig** mellan plattformarna (iOS 400–3 000, Android 500–5 000, genomlysningen P7).

**Metodnot, värd att skriva ned:** första jämförelsen gjordes på FILNAMN och sa att körläget, autostartguiden och
facitknappen saknades på Android. Fel — Android lägger hela gränssnittet i `ui/App.kt` medan iOS har nio vyfiler. En
strukturskillnad såg ut som en funktionsskillnad. Mätt funktionellt i stället krympte listan från sex hål till tre.

## #272 (20/9 2026) "Tillåt hela tiden" går inte att välja i rutan — och behövs inte heller för att köra (kort #219)

**Axels fynd 20/9 kväll, när han satte upp appen på testtelefonen:** *"man kan endast välja alltid då man
väljer medans appen är igång och inte endast en gång"* — alltså: systemrutan erbjuder bara *Medan appen
används* och *Bara den här gången*, aldrig *Tillåt hela tiden*.

**Det är inte ett fel i appen. Det är Androids dokumenterade beteende** (developer.android.com, läst 20/9):
> *"On Android 11 (API level 30) and higher, however, the system dialog doesn't include the **Allow all the
> time** option. Instead, users must enable background location on a settings page."*

**Och det viktiga fyndet i samma andetag: vi behöver den inte för normalfallet.** `GuardService` är en
förgrundstjänst med `android:foregroundServiceType="location"` som startas från aktiviteten. Googles regel:
en sådan tjänst kräver bara `ACCESS_FINE_LOCATION` — `ACCESS_BACKGROUND_LOCATION` behövs enbart när appen
läser platsen UTAN en aktiv förgrundstjänst. Koden gör redan rätt: `onToggle()` begär bara plats +
aviseringar, och bakgrundsplatsen begärs enbart ur `onAutostartToggle()`, där den verkligen krävs (en
BroadcastReceiver startar tjänsten när appen inte är i förgrunden).

**Arkitekturen var alltså riktig. Det som var fel var GUIDEN — min, skriven samma kväll.** Den sade:
*"Plats: Tillåt alltid … Utan den tystnar rösten när skärmen släcks — och det är då du kör."* Falskt på det
sätt som kostar mest: en testare hade jagat en inställning som inte går att välja i rutan, och dragit
slutsatsen att appen är trasig när den fungerar. **Rättad i samma varv**, i både `docs/BETAGUIDE-ANDROID.md`
och den publicerade sidan: *medan appen används räcker; Tillåt hela tiden behövs bara för Autostart, och det
valet bor i inställningarna.* Felsökningsraden om att rösten tystnar vid släckt skärm pekade också fel — rätt
misstänkt är batterioptimeringen som dödar tjänsten, inte behörigheten.

**Läxan, och den är husets egen:** guiden skrevs "mot koden" men jag läste behörighetsanropen utan att läsa
vad `foregroundServiceType="location"` betyder för dem. Att läsa rätt fil är inte samma sak som att läsa
färdigt. Samma mönster som filnamnsjämförelsen tidigare samma kväll (#271).

**KVAR ATT BYGGA, litet men verkligt (eget kort):** på Android 11+ visar `requestPermissions(
ACCESS_BACKGROUND_LOCATION)` ingen ruta alls — anropet i `MainActivity.onAutostartToggle()` faller därför
tyst, och användaren ser ingenting hända när han slår på Autostart. Googles föreskrivna väg är en egen
förklaringsruta plus en resa till appens inställningssida, med alternativets namn hämtat ur
`getBackgroundPermissionOptionLabel()` (API 30+) så texten stämmer med just den telefonens ordval.

## #273 (20/9 2026) iOS tystnade med släckt skärm för varje testare som svarade "när appen används" — en rad, funnen av Axels prov

**Axels prov 20/9 kväll, och rättelsen till mig själv:** han rapporterade *"man kan endast välja alltid då
man väljer medans appen är igång"* — och jag antog Android, skrev DECISIONS #272 och kort #226 på det.
**Provet var på iPhone.** Det som stod i #272 om Android är läst i Googles dokumentation och i koden och
står kvar som riktigt, men det var inte det Axel såg. Att gissa plattform är samma fel som att gissa vad
som helst annat.

**Vad han faktiskt såg:** iOS erbjuder aldrig *Alltid* i första rutan — Apple ger *Tillåt en gång* och
*Tillåt när appen används*. *Alltid* kommer som en senare uppföljningsfråga eller sätts i Inställningar.
Samma form som på Android, andra skäl. **Varje ny testare landar alltså i `authorizedWhenInUse`.**

**Och där satt felet.** `GuardManager` rad 214:
`manager.allowsBackgroundLocationUpdates = manager.authorizationStatus == .authorizedAlways`
— alltså **false** för precis det läge varje ny testare hamnar i. Apples dokumentation för egenskapen
(läst 20/9) säger vad det betyder:

> *"When the value of this property is true and you start location updates while the app is in the
> foreground, Core Location configures the system to keep the app running to receive continuous background
> location updates … Updates continue even if the app subsequently enters the background."*

och, om `false`:

> *"location updates may or may not continue in the background … Core Location doesn't configure the system
> to keep the app running for delivery, or display the background location indicator **to extend the
> effectiveness of the `authorizedWhenInUse` authorization while the app is running in the background**."*

Egenskapen finns alltså till just för att göra *när appen används* användbar i bakgrunden. Vakten stängde
av den för alla utom dem som redan hade Always. **Följden: rösten tystnar när skärmen låses** — för en
app vars hela uppgift är att tala med släckt skärm under körning.

**Fixen:** `allowsBackgroundLocationUpdates = true` när vakten startas, oavsett auktorisering. Villkoret är
Apples eget — uppdateringarna ska startas medan appen är i förgrunden, och det är precis vad *Starta
vakten* är. `UIBackgroundModes: [location, audio]` finns redan i `project.yml` (utan den är `true` ett
fatalt fel). **Priset är den blå indikatorn**, som Apple visar för att vara ärlig om att appen läser
platsen i bakgrunden — vilket den gör, och som vi inte har något skäl att dölja.
**Always behövs fortfarande för SJÄLVSTARTEN** (betydande förflyttning, parkeringsstaketet) — de grenarna
är separat vaktade på `.authorizedAlways` och är orörda.

**Det obekväma:** 0.3.8 (11) laddades upp 18:38 i kväll och bär **inte** den här fixen. Ett fälttest med
0.3.8 på en telefon som står på *när appen används* mäter alltså delvis fel app. Om Bengts telefon har
Always sedan tidigare påverkas den inte — men det är inget vi vet, det är något vi antar, och just det
antagandet har kostat huset ett varv förr.

**Läxa, andra gången i kväll:** #271 var filnamn som såg ut som funktion, #272 var en plattform jag
antog. Båda hade rättats av en fråga på en rad.

## #274 (20/9 2026) Genomgång av dagens kort: 21 strukna, två till stängda, och farhågan om dubbelarbete besannades inte

**Bengts order 20/9:** *"gå igenom och stäng alla kort som är gjorda och avklarade idag"*.

**21 kort ströks i dag**, räknat ur tavlans egen historik (`git diff` från dagens första TAVLA-commit). Av dem stängde
jag elva och den parallella sessionen tio. Listan står i svaret till Bengt.

**Två till stängs nu:**
- **#225** (*tre kort ser byggda ut men står öppna*) — dess Verify är uppfylld: #223 och #212 är stängda med sina
  commits som bevis, och **#210 står öppet avsiktligt** med både villkoret och ägaren utskrivna. Kortet lades i eftermiddag
  ur en farhåga att något byggts två gånger utan att synas. **Farhågan besannades inte** — den andra sessionen stängde
  sina kort i samma varv som den byggde. Det är värt att notera, eftersom motsatsen var dagens återkommande fynd.
- **#53** (*hela pipelinen står*) — överspelat. 94 körningar senaste dygnet, alla gröna utom dagens medvetna motprov.
  Kortet var en diagnos av avbrottet 5–8/9. Det som det egentligen oroade sig för — att taket slår i osett — har fått en
  egen vakt i **#152 kassavakten**.

**Vad som INTE stängs, och skälen står på korten:** #210 (väntar på ett iOS-bygge, Axel) · #214 (Data Safety är rättad,
men raderingsfrågan är ett ägarbeslut, #270) · #216 (Axels val finns, Bengts ja saknas, #265) · #217 (viltrösten klar i
#266, fem av sex påståenden kvar) · #219 (Play-kontot skapat 18:51, men kedjan telefon → uppladdning → tolv testare
löper) · #203 (sju av åtta svar, byggordning A vald, bygget kvar).

**Iakttagelsen som är värd mer än siffran.** Dagen inleddes med fyndet att kort inte flyttas när förutsättningen ändras
— sex överspelade (#250), två dubbletter (#252), #50 (#254), #76 (#256), sektionerna (#261). Den andra halvan av dagen
gjorde motsatsen: 21 kort strukna med bevisrad, i samma varv som arbetet. **Skillnaden var inte omsorg utan takt** — när
någon arbetar på ett kort samma dag det skrivs, flyttas det. Det är de gamla korten som ruttnar, och det är dem #224
ska gå igenom.


## #275 (20/9 2026) 0.3.9 (12) — bygget som bär iOS-fixen, och Team-id:t skrivs in så xcodegen slutar nollställa det

**Axels ja 20/9 kväll:** *"vi kör fixen"*. `MARKETING_VERSION` 0.3.8 → **0.3.9**, `CURRENT_PROJECT_VERSION`
11 → **12**. Bygget bär `allowsBackgroundLocationUpdates`-fixen (#273) ovanpå allt som låg i 0.3.8:
`<null>`-raden (#210), det engångs tidiga olycksropet (#211) och de tolv nya vektorerna (#212).

**I samma varv, en papperssnitt som kostat sedan 29/8:** `DEVELOPMENT_TEAM` stod som `""` i `project.yml`
med kommentaren *"väljs manuellt i Xcode efter VARJE xcodegen"*. Det betydde att varje bygge började med
ett handgrepp som går att glömma — och glöms det faller arkiveringen på signeringen. Värdet **R93LGMM343**
lästes ur `Halkvakt.xcodeproj/project.pbxproj` efter Axels egen 0.3.8-arkivering, alltså ur det han själv
valde, och står nu i `project.yml`. Ett team-id är ingen hemlighet; det ligger i varje signerat bygge.
Läxan från 29/8 gäller fortfarande och står kvar i kommentaren: koden i *Lita på*-rutan på telefonen är
CERTIFIKATETS id, inte teamets.

**Vad 0.3.9 INTE bär:** #203 (facit efter resan) och #266 (viltrösten utan art). De är beslutade men
obyggda, och att smyga in dem i ett bygge som ska bevisa en enda rad vore att göra provet otolkbart.

**Beviset som stänger kort #227:** en resa med *Tillåt när appen används*, skärmen släckt, och en varning
som hörs — plus den blå indikatorn i statusfältet, som är kvittot på att Core Location håller appen vid
liv. Blir det tyst är fixen fel, och då vet vi det på en resa i stället för i november.

## #276 (20/9 2026) `<null>` stängs som klass, inte som fall — och mätningen som visar att hålet var latent (kort #210)

**Axels fråga före deployen:** *"kan vi fixa kort 210?"*. Svaret har två halvor, och den första är att kortets
FIX redan satt: `road` rättades i 9d3f56c och följer med i 0.3.9. Det som är kvar på kortet är ett **bevis**
från en riktig telefon, inte en kodändring. Men frågan var ändå rätt ställd, för instansen var lagad och
**klassen var det inte**.

**Hålet:** `SnapshotRepo.str()` var `d[k] as? String ?? "\(d[k] ?? "")"`. JSONSerialization ger `NSNull` —
inte `nil` — för JSON-null, så `NSNull` överlever `??` och stränginterpoleras till literalen `"<null>"`.
`road` fick sin egen rad 9d3f56c, men helpern bär **sex id-fält**: `cam:`, `seg:`, `wx:`, `bro:`, `vilt:`,
`dev:`. Ett null i något av dem hade gett `"cam:<null>"` som farans id — och farans id är inte kosmetika:
det är nyckeln i reprisspärrens `fired`-karta och det som skickas i ett facitsvar. En korrupt nyckel hade
alltså både kunnat tysta en riktig fara och landa som en oläsbar rad i `driver_facit`.

**Mätt innan något ändrades, enligt husregeln:** publicerade `static.json` (2 791 kameror) och `live.json`
hämtade 20/9 och räknade fält för fält. **Inget id är null i dag.** De enda null som faktiskt publiceras är
`lutning15/30/60` på väderstationerna, och dem läser iOS-parsern inte alls. Hålet var alltså **latent, inte
aktivt** — vilket är skälet att laga det nu och inte kalla det en incident.

**Fixen:** `str()` returnerar tom sträng för `NSNull`, behåller strängar som strängar och stringifierar
tal som förut. Fem rader, och "<null>" kan inte längre uppstå någonstans i appen.

**Inte rättat, med skäl: Android.** `SnapshotRepo.kt` läser ids med `getString("id")`, som för ett JSON-null
ger strängen `"null"` — samma form, samma sex ställen. Lämnad orörd i kväll av tre skäl: sex anropsställen
i stället för en helper, inget testmål som kan fälla ett misstag, och `getString` **kastar** vid saknat fält,
vilket avvisar hela snapshoten i stället för att skapa en trasig fara. Det är ett medvetet skydd, och att
byta det mot tom sträng vore att göra appen tystare om sina egna fel. Eget kort när någon ändå rör filen.

**Det strukturella som står kvar:** `SnapshotRepo` finns i app-målet på båda plattformarna, och **inget
CI-flöde bygger eller testar app-målet**. Det är därför #210 kunde levas i fyra dygn, och det är därför den
här rättelsen inte heller kan bevisas av ett test — bara av ett bygge. Samma rad står i #267.

## #277 (20/9 2026) Efter resan — ett tryck från låsskärmen, byggt på båda plattformarna (kort #203, lager 1)

**Beställningen.** Bengt 19/9: *"som det är i dag är det oerhört krångligt … det kommer inte många
svar"*. Axels svar på §8 (DECISIONS #267): **2 ja, alla tre** — *"låsskärmen är det viktiga — föraren
ska aldrig behöva öppna appen för att svara ja"* — plus tillägget ur hans läsning: kortet på *Redo.*
ska visa **raderna**, klockslag och text, inte bara ett tal. Byggordning **8 ja**: Android i samma PR,
och vald ordning Android först, iOS speglar.

**Vad som byggdes (lager 1, "grunden"):** resans logg, låsskärmsnotisen med knapparna i sig, och
kortet överst på *Redo.* med en rad per varning. **Siri-fraserna (lager 2) och missarna
(`driver_miss`) ingår inte** — de står kvar på kortet, medvetet uppskjutna.

**Räkningen är ren och delad.** `Resan` (Kotlin `Resan.kt`, Swift `Resan.swift`) svarar på fyra frågor
och bara dem: vilka varningar i resan är obesvarade, vad blir facit om alla besvaras med ett tryck,
står frågan fortfarande kvar (ett dygn), och hur lyder frågan (singular vid en varning — *"alla 1
varningarna"* är inte svenska). Ingenting i filen skriver ett svar av sig själv: **tystnad är inget
svar**, och den regeln bor i frånvaron av kod, inte i en kommentar. Åtta enhetstester på Android-sidan
— de första i app-modulen — och de är gröna i CI.

**Två fall som räkningen måste bära, och gör:** rader utan varnings-id (Androids historik före 16/9)
räknas *inte* som obesvarade, annars hade varje sådan rad hållit frågan öppen för evigt. Och ett svar
som ges igen ersätter det förra och blir osänt — förarens senaste ord gäller, precis som för ett
enskilt svar.

**Ordningen i notishanteraren är avsiktlig:** svaret sparas FÖRST, sändningen är det som får
misslyckas. Androids `FacitSvarReceiver` har ~10 s via `goAsync()`, och en sändning med 10 s timeout
per svar kan falla utanför fönstret. Misslyckas den ligger svaren kvar som osända och går iväg vid
nästa stillastående eller appstart — samma seghet som `FacitSender` redan har.

**"Något stämde inte" öppnar appen, med flit.** En avvikelse måste pekas ut på en RAD, och det går
inte från en notisknapp. Kortet överst på *Redo.* bär resans rader, så föraren landar rätt.

**iOS krävde mer än Android, och det var inte synligt förrän filerna lästes:**
- **iOS hade ingen persistent varningshistorik.** Android har `AlertHistory` i DataStore; iOS hade
  bara `lastSaidText/At/Id` — alltså *bara resans sista varning*. Ny `AlertEntry` + `AlertLog` i
  `Resan.swift`, JSON i UserDefaults (samma väg som facit redan går; Androids tabbformat behövs inte).
- **iOS registrerade inga notiskategorier och hade ingen delegat.** `HeadsUpService` bad om `[.alert]`
  och visade en knapplös banner. Ny `EfterResanNotis` med kategori, två åtgärder och delegat,
  registrerad i `HalkvaktApp.init()` — kategorin måste finnas *innan* en notis kan levereras, och
  delegaten måste finnas när föraren trycker, även när trycket är det som startar appen.
- **`willPresent` returnerar `[]`** — exakt som innan appen fick en delegat alls. Att lägga till en
  delegat ändrar annars tyst beteendet för heads-up-bannern (#23).

**En bugg som bara fanns på iOS och fångades när halvorna jämfördes:** `lastSaidAt` sattes till
`.now` medan historikraden skulle ha en egen tidsstämpel. Facitsvar nycklas på `(id, t)` — två `.now`
hade gett **två rader för samma varning**, så ett svar under "Senast sagt" hade inte släckt raden i
efter-resan-kortet. Nu tas EN tidsstämpel och används på båda ställena.

**Fotostudion utökad på båda plattformarna:** startargumentet lägger nu in en påhittad *resa* med två
varningar, inte bara en varning, så kortet går att se utan en körning.

**Det som INTE är bevisat, och måste sägas rakt:** Android-halvan är **grön i CI** — den kompilerar
och de åtta testerna passerar. **iOS-halvan är skriven utan kompilator.** `Resan.swift`,
`EfterResanNotis.swift`, `EfterResanKort.swift` och ändringarna i `GuardManager`, `Prefs` och
`VaktenView` kompileras första gången i Axels Xcode. Inget CI-flöde bygger app-målet — samma rad står
i #267 och #276, och det är tredje gången i dag den är skälet till ett förbehåll. Notisåtgärden kan
dessutom inte prövas i simulatorn på ett trovärdigt sätt: låsskärmen och bakgrundsleveransen är
poängen. **Verify står öppen tills en riktig resa på en riktig telefon ger rader i `driver_facit`
utan att föraren stannat.**

## #278 (20/9 2026) Svepet: blindningsläckan tätad (#216), portarnas flöden lagade, och läsarkontraktet byggt (#210)

**Bengts order 20/9:** *"jag tycker att vi gör 210 409 och 416 i ett svep"*. Tre saker i en gren, en CI-körning.

**1. #216 — blindningsläckan tätad.** Bengts ja på Axels val (#265). `scripts/grind-t-a.ts`: tabellen **räknas alltid**
— en grind som inte räknar kan inte visa att den fungerar — men **rangordningen trycks först när domspärren släpper**.
Klarhetsdelens kolumn *fyrade* bygger på svepets vinnare och hålls tillbaka likadant; antalet frostnätter per molnklass
är underlag och står kvar. **Bevis, skarp körning med domspärren hållande:** `SVEPET — 144 kombinationer` följt av
`(rangordningen hålls tillbaka — 144 punkter räknade, ingen redovisad)`, medan fysikkontrollen skrevs som förut.
TROSKLAR-KOMBINATIONEN bär nu regeln om delgrindarnas körningar mot D3, i samma commit — Axels villkor.

**2. Portarnas flöden lyssnade inte på `engine/src`.** `android.yml` och `ios-engine.yml` triggade på `engine/vectors`
men inte på referensmotorn. En ren motorändring hade alltså passerat otestad i Kotlin och Swift. Dagens motorfixar
råkade trigga portarna för att de också lade vektorer — skyddet hängde på tur. Rättat.

**3. #210 — läsarkontraktet.** Kortets egen invändning var *"inget testmål"*, och den var riktig: vektorerna börjar där
faran redan är TOLKAD. De är ett kontrakt för MOTORN och kan per konstruktion inte se ett fel i JSON-läsningen — vilket
är exakt var #210 satt. Nu finns samma sorts kontrakt ett lager ned: `engine/fixtures/lasarprov.json` med de fall som
är lätta att läsa fel, och `test/lasarkontraktet.test.ts` som prövar TS-läsaren mot dem.
**Motprov:** `road: d.road ?? null` → `String(d.road)` ⇒ testet faller med `actual: 'null'` mot `expected: null`.
**Nollpolitiken är hela poängen:** `bearing` null får inte bli 0 (0 är norrut, och kameran filtreras då på fel kurs) ·
`yta` null får inte bli 0 °C (0 ligger under fryströskeln och hade fyrat) · `road` null får inte bli ett ord.
**Kvar:** Swift och Kotlin läser i app-koden, som saknar testmål. Provfilen ligger färdig den dagen målet finns.
**Kortet #210 stängs fortfarande av Axels bygge** — läsarkontraktet gör inte fixen bevisad, det gör nästa regression synlig.

**Två PR:er stängda utan att slås ihop.** #409 hann bli halvt dubblerad — den parallella sessionen härdade `str()` i
90b5223 — och #416 hade `[skip ci]` i sin huvudcommit, vilket fick GitHub att hoppa över PR-körningen. Innehållet
ligger här i stället. **Läxa värd att skriva:** `[skip ci]` i en grens huvudcommit tystar också `pull_request`-körningen,
så en gren som bara bär dokument kan inte granskas av CI — och en gren som bär kod får aldrig ha märket.

## #279 (20/9 2026) Enhetsverifieringen kontrollerad mot källan: kravet stämmer, men en LÅNAD telefon räcker

**Bengts fråga 20/9:** *"stämmer det att playkontot inte aktiveras förrän en telefon android bevisas genom inloggning
på play console kontot"*. Frågan gällde ett påstående i #271, som kom ur Play Consoles gränssnitt och inte ur en läst
källa. CLAUDE.md:s läxa säger att en uppgift som ges till Bengt eller Axel ska vara läst på källsidan — den tillämpades
här, i efterhand.

**Kravet stämmer, ordagrant** (support.google.com/googleplay/android-developer/answer/14316361, läst 20/9):
*"Från och med början av 2024 måste utvecklare med nya personliga konton verifiera att de har åtkomst till en riktig
mobil Android-enhet via Play Console-appen innan de kan göra appen tillgänglig på Google Play."*
Google Play Console listar det som **steg 6** och märker det *(Endast personliga konton)*.

**Två rättelser som gör grinden billig:**
1. **Vilken telefon som helst duger.** FAQ, ordagrant: *"Du kan använda alla fysiska mobila Android-enheter som inte
   är rotade och kör operativsystemet Android 10 eller senare."*
2. **Den behöver inte behållas.** FAQ, ordagrant: *"Nej. Vi kan be dig om verifiering i framtiden, men du behöver inte
   använda samma enhet."*

**Följden:** #271:s rekommendation om en **begagnad Samsung för 800–1 500 kr** behövs INTE för verifieringen. Ett lån
på tio minuter räcker — skanna QR-koden i Play Console, installera Play Console-appen på den lånade telefonen, logga in
som kontoägare, tryck Verifiera, lämna tillbaka. En egen testtelefon är fortfarande motiverad för fälttest och för att
faktiskt köra appen, men den är då en **bekvämlighet igen, inte publiceringsgrinden**.

**Vad som INTE är klarlagt, och som därför inte påstås:** Googles formulering är *"göra appen tillgänglig på Google
Play"*. Om ett SLUTET TEST räknas dit går inte att avgöra ur texten. Testkravssidan säger att slutet test kan startas
*"när du är klar med konfigureringen av appen"*, vilket talar för att novemberbetan inte blockeras — men det är en
slutsats av två sidor, inte ett citat, och redovisas som sådan.

**Vad som ÄR klarlagt oavsett:** utvecklarens telefonnummer kan inte verifieras förrän identitet **och**
enhetsverifiering är klara (*Verifiera uppgifter för utvecklaridentitet*: *"Du kan inte verifiera ditt telefonnummer
förrän dessa förutsättningar är uppfyllda"*). Enhetsverifieringen ligger alltså i vägen för kontots färdigställande
hur betan än klassas — men den kostar ett telefonsamtal, inte tusen kronor.

## #280 (21/9 2026) Kort #218 kontrollerat mot koden: loopen är vanligare än kortet säger — och #279:s lån behövs inte

**Bengts fråga 21/9:** *"vad är 218"*. Kortet (genomlysningen P8, 20/9) lästes mot koden innan det förklarades.

**Stämmer:** iOS `BestForNavigation` med pausen av, satt på ett ställe och aldrig ändrat (`GuardManager.swift:90–92`,
inget `distanceFilter` någonstans) · Androids trappa 1 / 5 / 15 s efter avståndet till närmaste fara (`CadencePolicy.kt`)
· `CadencePolicyTest.tiers()` jämför mot sina egna konstanter, så `NEAR_MS` 1 → 10 s och `FAR_MS` 15 → 150 s passerar
hela sviten (läst, inte kört; motprovet görs i CI när testet lagas).

**Rättat:** kortets *"fyra HTTP-anrop per sekund … när nätet saknas och cachen är tom"*. Utan nät faller första anropet
och laddningen avbryts — ett försök per sekund. Fyra per sekund kräver att nätet FINNS och att en fil fäller utan sparad
kopia; då laddas `static.json` om varje sekund, 274 kB/s med storlekarna hämtade 21/9 (static 251 391 byte, live 22 262,
manifest 352) — ungefär 1 GB i timmen.

**Nytt, samma rotorsak, och det vanliga fallet:** `lastSnapshotLoad` sätts bara vid lyckad laddning, och inget markerar
att en pågår. Utan data går vakten i 1-sekundstakt, så varje GPS-punkt före den första lyckade laddningen startar en ny
komplett laddning i en egen tråd — vid varje start och varje självväckning efter ett stopp. På ett segt nät trängs de och
gör varandra långsammare. Kortets fall kräver ett tomt cacheminne; det här kräver bara ett segt nät. iOS har inte felet:
vägdatan laddas vid start och när vyn visas, inte per GPS-punkt.

**Mätningen:** Bodenresan 1/9 bad om batteriprocenten med laddare i bilen. Det enda försöket kunde alltså inte mäta
budgeten. Frågorna står i bedömningen §4.2.

**Rättelse av #279.** #279 skrev *"en LÅNAD telefon räcker"*, och svaret till Bengt rådde honom att fråga någon i
närheten. Onödigt: #271 slutar med Axels *"vi har en Android som vi kan använda"*, och #272 beskriver appen uppsatt på den
telefonen 20/9 kväll. Kvar för Play-grinden är bara inloggningen i Play Console-appen på den. **Läxa:** läs hela
beslutsposten som rättas — #271:s sista stycke hade redan löst det #279 rättade.

## #281 (21/9 2026) Göteborgs svar: stadens halkdata är köpt och avtalsbunden — vägen går via Nira, och Nira säljer halkvarningar

**Svaret 21/9 09:08** från Petri Stjernvall, planeringsledare vinterväghållning, stadsmiljöförvaltningen, på Bengts mejl
17/9 09:48 (repot sa 18/9): *"Vi använder friktionsdata från bilar och data levereras av Nira. Vi har också
väglagsprognoser via Klimator och SMHI, som i sin tur kan hanteras i ett system som heter BM Road Service Systems. Allt
detta hanteras av avtal och kan ej i dagsläget delas fritt."*

**Vad det betyder.** Prognoserna (Klimator, SMHI) faller på vår egen regel: en varning utlöses bara av en mätning
(regel T — Bengts mejl sa detsamma). Friktionsdatan är en mätning, men den är Niras och inte stadens, så stadens väg är
stängd och leverantörens öppen — samma mönster som Malmö. Fråga 2 (egna vägväderstationer på gatunätet) blev obesvarad;
fråga 4 (rätt person) besvarades i praktiken av avsändaren.

**Läst på källan 21/9** (niradynamics.com/products/road-surface-alerts): Nira säljer *Road Surface Alerts*, kartmatchade
varningar bland annat för *"Slippery road: Detects low-friction surfaces using real-time vehicle data"*, möjliga att
hämta via API och riktade till biltillverkare, underleverantörer och fordonsflottor. Sidan: *"Each alert is based on
measured data"*. Priset är inte publikt. Exempeldata och produktguide hämtas via ett formulär (namn, e-post, företag).
**Oläst:** källkartläggningens *gratis utvärderingskonto på roads.niradynamics.se* — adressen gick inte att öppna.

**Källkartläggningen 26/8 sa detsamma** (punkt 10: kontakta NIRA, *"enda vägen att på sikt täcka blindpunkterna med
faktiska mätdata"*), men fick inget kort och gjordes aldrig. Nu kort #229.

**Repot säger två saker om Trafikverkets fordonsdata:** #230 skriver att Trafikverket köper från *"Volvo, Nira
Dynamics"*; källkartläggningens rättelse säger att köpet går direkt till biltillverkarna och att NIRA/Klimator bara
figurerat i piloter. Inte avgjort här — det påverkar inte Göteborgs svar.

**Rekommendation (bedömningen §4.2):** Bengt tackar och ställer den obesvarade fråga 2 (utkast på kort #229) · Bengt
hämtar Niras exempeldata, gratis, och Claude läser den mot tre frågor: täthet i stan, färskhet, regel T · en fråga om
villkor bara om exempeldatan håller, och varje betalväg kräver en DECISIONS-post som Axel godkänner.

**Lydelsen i nästa utskick:** mejlet 17/9 skrev *"Användarens position lämnar aldrig telefonen"*. Sedan #264 gäller
*ingen position lämnar telefonen automatiskt* — facitsvaret som föraren själv trycker är undantaget. Nästa mejl, till
Göteborg eller Nira, använder den lydelsen.

## #282 (21/9 2026) Nira — konkurrent eller partner? Hypotesen håller för första bilen, inte för Nira som företag

**Bengts fråga 21/9:** *"Är det enbart data från bilar så är de steget efter. Vi ger en prognos om vad som kommer att
hända innan en bil kommer. Så vi kanske inte är konkurrenter utan partners."* Utredningen: `docs/NIRA-UTREDNING-2026-09-21.md`.
Niras sidor lästa i webbläsaren, två agenter sökte utanför, och varje bärande uppgift kontrollerades mot källan.

**Det som håller:** Niras egen signal kommer när bilar har kört — *"The first cars to encounter the black ice would have
automatically registered the dramatic change in friction"* (Niras artikel om Enköping). På mindre vägar kommer *"ofta
några mätningar per dygn"* (Trafikverket 10/11 2025), och 2021 kallade Trafikverket metoden *"främst eventbaserad"* —
jämn fart på en landsväg ger mindre data.

**Det som inte håller:** Nira är inte bara bildata. *"NIRA Dynamics AB is a part of the Volkswagen Group"*, och Nira har
redan prognosdelen: med Klimator sedan 2018 (*"detaljerade prognoser av halka på vägavsnitt"*) och Vaisala Xweather sedan
2024 (*"connects road weather forecasts … with real-time connected car data"*). Halkvakt är inte heller ensamt om att se
före: Klimators halkprognos på Expressen visar *"det förväntade väglaget på Sveriges vägar de närmaste åtta timmarna"*.
Nira ställer sig dessutom uttryckligen mot *"temperature thresholds"* — Halkvakts nuvarande varning (yta ≤ +1 °C och
fuktig, `engine.ts:213–218`) är en sådan.

**Nischen som återstår:** gratis, röst under körning, utlöst av mätning och inte modell, minuter till timmar före första
bilen. Forskningen stöder horisonten: de första timmarna är en ren mätning lika bra som vägvädermodellen (Karsisto 2024,
RoadSurf). Men förvarningen körs i skuggläge (S1), finns inte i motorn (S3) och är blindad till domarna.

**Slutsats: konkurrent i varningsledet, inte partner i prognosledet — och förhållandet är skevt.** Road Surface Alerts
säljs till *"third party applications used by drivers"*, alltså Halkvakts plats. Prognosplatsen hos Nira är upptagen.
Halkvakt skulle få mycket av Nira — facit, ett vittne på platsen som genom ett eget beslut kan göra varningar mellan
stationerna möjliga (T5), tystnad på saltad väg, gatorna — medan Nira i dag skulle få lite.

**Rekommendation:** exempeldatan nu (gratis) · beviset i vinter · kontakt efter domarna med ett konkret facitförslag,
gärna som innovationsprojekt med en väghållare · ingen förfrågan om partnerskap före beviset och ingen betalväg utan Axel.
**Krav i varje samtal:** alla varningar som fil — tjänsten levereras annars till *"vehicles approaching the affected area"*,
vilket kräver att positionen lämnar telefonen · det mätta skilt från det modellerade (regel T6) · licens för appen (de
gamla villkoren: *"you will not redistribute or transfer the Service or the Content"*).

**Sidofynd:**
1. **Trafikverket delar inte sin fordonsdata:** *"Data kommer inte att delas vidare från Trafikverket till tredje part om
   inte separat överenskommelse träffas"* (slutrapporten 2021). Frågan i bedömningen §0b får troligen svaret nej.
2. *(se #294: adressen står i katalogposten men studsar — läxan hade rätt i sak)* **CLAUDE.md:s läxa om `datex@trafikverket.se` är för stark.** Den säger att en sammanfattning *"hittade på"* adressen och
   att Trafikverket inte har någon sådan. Trafikverkets katalogpost *Temporary slippery road* på trafficdata.se anger just
   den adressen som `contact_email`. Läxans poäng — läs kontaktuppgifter på källan — står sig. Förslag att rätta meningen
   ligger hos Bengt.
3. **FMI:s vägvädermodell RoadSurf är öppen källkod (MIT).** Den skulle kunna bli ett stärkande lager under T6 — aldrig en
   utlösare.

## #283 (21/9 2026) Niras exempeldata mätt: tät över dygnet, tunn på natten — och värdena förs vidare utan ålder

**Bengt 21/9:** *"filerna är nedladdade nu"*. Exempeldatan lästes mot utredningens fyra frågor (§9, resultatet i §11).
Winter Road Insights, Stockholm 15/1 2024: friktion 305 316 rader, torkare och lufttemperatur 1 846 547 rader vardera
(samma bilrapporter), tiominutersperioder 01:00–00:50 svensk tid. Skript `scripts/matningar/nira-exempeldata-2026-09-21.py`;
filerna ligger inte i repot (villkoren förbjuder vidarespridning).

1. **Tätheten:** 2 275 km väg med minst ett friktionsvärde under dygnet; inom 8 km från Sergels torg 408 km — där Halkvakt
   har 7 stationer. Vägklass 5, lokalgatorna, saknas helt.
2. **Färskheten:** klockan 05 hade 2–9 % av vägavsnitten ett värde från den senaste timmen (klockan 07: 20–54 %); klockan
   02–03 fick under 1 % av dygnets 8 957 avsnitt något värde.
3. **Mätt eller modellerat:** ingen flagga. 22–56 % av friktionsvärdena ligger i en period utan bilrapport på avsnittet; i
   80–89 % av dem fanns en rapport inom 30 min före, i 98 % inom två timmar. Värdena förs alltså vidare, i följder om 60 min
   i median. Medelvärdet ligger i 6,4 % av raderna mer än 0,05 utanför radens egen min–max, som mest 0,83.
4. **Händelsestyrt:** kan inte avgöras. Friktion finns i 48 % av motorvägens rapportperioder mot 15,5 % på minsta
   vägklassen — men trafikmängden döljer effekten.

**Sidofynd:** lufttemperaturen är luftens, inte vägytans, och bär +29,5 °C en januaridag — värdevakten hade stoppat fältet ·
torkarna gick i 8,2 % av avsnittsperioderna, ett möjligt regnvittne på platsen (T1).

**Följd:** Bengts hypotes stärks där den stämde. Niras bild är tunnast när frosten bildas; Halkvakts stationer mäter vägytan
oavsett trafik. **Nytt krav i ett framtida samtal med Nira:** varje värde med tiden för den senaste mätningen under det — utan
den kan ett framfört värde inte bära en varning (T1: vittnet inom utfallsfönstret; T4: minne av mätning med känd kedja).
Repot är privat (kontrollerat 21/9: HTTP 404 utan inloggning), så utredningen och siffrorna syns inte utåt.

## #284 (21/9 2026) Efterhandstestet mot Niras exempeldag går inte — och skulle inte säga något; det riktiga testet är en övergångsnatt (kort #230)

**Bengts fråga 21/9:** *"kan vi testa vår app mot denna mätning som ett backlog försök"*.

**Hinder 1, indata.** Halkvakts regler läser vägytans temperatur och fukt från Trafikverkets stationer. För 15/1 2024 finns
de inte öppet. API:ets observationer räcker en vecka bakåt (källkartläggningen 26/8). Vårt arkiv börjar 2026 och gallras
efter sju dygn (sql/014; därför finns `trend_kandidater`, sql/017). Lastkajens post *NVDB VVIS* är stationsregistret och inte
mätningarna (katalogposten läst 21/9). Vintersidan, där Trafikverket har *"historisk väderdata från VViS och MESAN"*, är bara
för Trafikverkets anställda och entreprenörer på uppdrag (läst 21/9).

**Hinder 2, dagen.** Niras egna bilar visar −4 till −10 °C hela dygnet: 0,5 % av avläsningarna ≥ 0 °C, torkarna igång i
3–12 % av avsnittsperioderna per timme (snöfall). Efterhalkans startvärden (yta +1…+3 °C och fallande) hade aldrig fyrat;
dagens isvarning (yta ≤ +1 °C och fuktig) hade legat på överallt. Friktionen var lägst klockan 01–08 (median 0,26–0,30) och
steg under dagen till 0,46. Ett test den dagen kan inte skilja en bra regel från en dålig. **Sidonot:** en temperaturbaserad
varning hade legat kvar hela eftermiddagen medan friktionen steg — Niras invändning i praktiken, men utan Niras gräns för
*halt* går det inte att kalla det falsklarm.

**Kort #230 skapat med designen skriven före mätning:** en övergångsnatt · de låsta startvärdena, inget svep (D2, D6, D7) ·
facit = Niras friktion under Niras egen gräns för *halt* inom 5 km och 90 min (samma radie och fönster som KB-B) · mått:
träff, falsklarm och försprånget i minuter före första låga friktionsvärdet.

**Öppet (bedömningen §4.2):** väg A (den här vintern — skuggloggen och `trend_kandidater` mot Niras friktion för 2–3 nätter;
kräver att Niras friktion deklareras som facitkälla före nätterna, D3) eller väg B (en tidigare säsong — VViS-historik från
Trafikverket och friktion från Nira). Rekommendation: väg A, som en förfrågan om data, inte om partnerskap.

## #285 (21/9 2026) Efterhandstestet gäller hela systemet — motorn plus skuggmotorn — och blir därmed en del av domarna (kort #230)

**Bengts precisering 21/9:** *"jag vill inte bara testa den mot motorn som den ser ut i dag. Det ger inte så mycket. Men att
testa den mot motorn + skuggmotorn hade kunnat bevisa något till vår fördel för det är ju så vårt fullständiga system kommer
att se ut"*.

**Beslutat (Bengt):** testobjektet i kort #230 är hela systemet, redovisat lager för lager:
1. **Motorn som i appen:** isvarningen vid yta ≤ +1 °C och fuktig (`engine.ts:213–218`).
2. **Efterhalkan med startvärdena från 17/9.** Skuggmotorn loggar dess indata per station i ruttkorridoren sedan 16/9 (S1,
   `efterhalkaRader` i `supabase/functions/skuggmotor/main.ts`), och uppspelningen kör regeln ur arkivet.
3. **Skuggan, prognosen mellan stationerna** (TROSKLAR-SKUGGAN). Grind A prövar offsetmodellens matematik; koden skrivs i
   november om den håller. I provet mäts den men talar inte (T3/T6).
4. **SMHI-förlängningen** när vintervarningar finns.

**Två anspråk prövas:**
- **FÖRE:** minuter före första låga friktionen, där exempeldatan visar att Niras bild är tunnast, alltså natten (#283).
- **MELLAN:** träffar skuggan de sträckor mellan stationerna där bilarna sedan mäter låg friktion? Det vore det första provet
  av offsetmodellen mot ett vittne på platsen.

**Följden som gör det tidskritiskt:** efterhalkans och skuggans utfall är blindade till domarna (D2, D3, D6). Ett prov mot
Niras friktion är därför domarnas utfall med en ny facitkälla, och facitkällan måste deklareras **innan nätterna mäts** — före
den första övergångsnatten, som kan komma i oktober. S6 har i dag förarfacit och kamerafacit. Att lägga till Niras friktion,
och kriteriet för vilka nätter som prövas, är ett beslut för Bengt och Axel (bedömningen §4.2).

**Varför kriteriet måste stå först:** ett prov som bara kan visa vår fördel bevisar ingenting. Nätterna väljs på ett kriterium
som inte är vår egen regel. Skuggmotorns logg är skriven innan utfallet fanns, så det går inte att fuska i efterhand — åt något
håll — och det är just det som gör ett gott utfall trovärdigt för Nira, Skyltfonden och testförarna.

**Området:** Stockholm. Där finns Niras exempeldata, och skuggmotorns rutter *E4 Södertälje→Uppsala* och *E18
Örebro→Stockholm* går genom det.

**Begränsning:** skuggmotorn kör varje rutt var 3,5 timme. Minuterna före första bilen kommer därför ur uppspelningen per
station, inte ur rutternas logg.

## #286 (21/9 2026) Efterhandstestet på Niras exempeldag, låst före körningen: motorns regel och skuggmotorns kommande regel, med Niras material som indata

**Bengts order 21/9:** *"vi hämtar inte niras data. Vad jag bad om var om man kunde göra en backtest på den dagen då Nira
hade sin exempeldag den 15 januari 2024 och på det sättet få en bedömning av om vårt system hade larmat på de inlämnade
materialet"* — och *"viktigt att komma ihåg är att du i den här testen ska tillämpa både motorns regler och skuggmotorns
framtida regler"*.

**Följd:** väg A och B i kort #230 stryks — ingen ny data begärs från Nira — och därmed förslaget i #285 om Niras friktion
som tredje facitkälla. Testet körs på exempeldagens tre filer (#283).

**Indata — ersättare, och det är den viktigaste reservationen.** Halkvakts regler läser vägytans temperatur och stationens
nederbörd. Här används bilarnas mätningar på samma vägavsnitt i stället:
- **yta** ≈ bilarnas lufttemperatur (luften, inte vägbanan)
- **fukt** (motorns: nederbörd nu, `publish/snapshot-core.ts`) ≈ torkarna igång i samma tiominutersperiod
- **regn inom 2 h** ≈ torkarna igång någon gång under de två senaste timmarna på avsnittet
- **fall på 30 min** ≈ lufttemperaturens fall över 30 min, räknat som `publish/trenden.ts`: minst tre värden i fönstret,
  inget hopp över 3 °C, positivt när den faller, avrundat till tusendels grad
- **givarvakten** (`rimlig` — daggpunkten) går inte att tillämpa, eftersom materialet saknar daggpunkt. I stället en
  värdevakt: lufttemperatur utanför −35…+15 °C sorteras bort.

Varje vägavsnitt behandlas som en station.

**Reglerna, låsta:**
1. **Motorn** (`engine.ts:213–218`): yta ≤ +1 °C och fukt.
2. **Skuggmotorns kommande regel, efterhalkan med startvärdena** (DECISIONS #222/#225, `sql/028`): yta +1…+3 °C · fall
   ≥ 0,8 °C på 30 min · regn > 0 inom 2 h. En episod per avsnitt och natt (middag till middag UTC).

**Kan inte tillämpas:** *skuggan* (prognosen mellan stationerna) bygger på stationsankare och klimatologiska förskjutningar,
som materialet saknar. SMHI-förlängningen kräver SMHI:s varningar, som inte finns i materialet.

**Facit:** Niras friktion på samma avsnitt inom (t, t + 90 min]. Gränsen för *halt* är 0,30 — Niras skala är
odokumenterad i filerna, och därför redovisas känsligheten för 0,25 och 0,35.

**Mått:**
- antal varningar och episoder
- träffandel mot basnivån — andelen tiominutersperioder med bilrapport som följs av låg friktion, alltså vad en regel som
  larmar på allt hade fått
- andel halkaepisoder som föregicks av en varning
- försprånget i minuter
- fördelningen per timme

**Blindningen:** startvärdena prövas som de står, utan svep (D2, D6, D7). Materialet är från 2024, utanför säsongens
kalibrerings- och domnätter, och resultatet får inte ändra startvärdena. **Redan sett före låsningen (#284):** dygnets
lufttemperatur låg mellan −4 och −10 °C, så efterhalkans utfall är i praktiken förutsägbart — inga eller nästan inga
fyrningar. Motorns utfall är inte räknat.

## #287 (21/9 2026) Efterhandstestet på exempeldagen: motorn hade larmat mycket men sämre än slumpen — skuggmotorns regel kunde inte prövas

> ⚠️ **Läs med #290 (second opinion samma dag):** testet prövade i praktiken torkarna, inte motorn — temperaturvillkoret var sant i 99,7 % av perioderna, *"sämre än slumpen"* är till 70 % en blandningseffekt, och halkan började före datans fönster, så försprånget går inte att läsa. Talen nedan står kvar; läsningen av dem är ändrad.

**Körd enligt #286,** upplägget låst före körningen (PR #431). Skript `scripts/matningar/nira-efterhandstest-2026-09-21.py`.
**Reservationen först:** bilarnas lufttemperatur och torkare ersätter vägytans temperatur och stationens nederbörd, och
varje vägavsnitt behandlas som en station. Testet prövar reglernas logik, inte stationsnätet.

**Motorn** (yta ≤ +1 °C och fukt): 21 767 varningsögonblick på 7 557 av 16 810 avsnitt. Andelen som följdes av friktion under
0,30 inom 90 minuter var **33,7 % — mot basnivån 44,2 %**, alltså vad en regel som larmar på allt hade fått. Samma riktning vid
0,25 (20,8 % mot 26,4 %) och vid 0,35 (44,9 % mot 58,2 %). 40 % av varningarna hade inget facit, eftersom ingen bil mätte
friktion efteråt. Av 4 375 träffar kom 1 431 innan halkan fanns på avsnittet. Av 8 526 halkaepisoder föregicks 981 (11,5 %)
av en varning, med ett försprång på 50 minuter i median. Per timme: klockan 03–08 låg motorn i nivå med basnivån, och
klockan 09–19 klart under — varningarna följde snöfallet mitt på dagen, medan halkan var värst natt och morgon.

**Skuggmotorns efterhalka** (startvärdena): 894 ögonblick i startbandet +1…+3 °C på en dag som låg −4 till −10 °C, 41 med
räkningsbar lutning, 1 med fall ≥ 0,8 °C och regn inom 2 h — ett falsklarm. Regelns värde kan inte bedömas på materialet,
eftersom dygnet inte innehöll någon övergångsnatt. Skuggan och SMHI-förlängningen kunde inte tillämpas (#286).

**Följd:** på en jämnt kall snödag pekar en regel byggd på temperatur och nederbörd inte ut halkan — Niras invändning,
bekräftad på deras egen dag. Den del av systemet som ska ge försprånget prövas inte av det här materialet. Övergångsnattens
prov görs inte, eftersom ingen ny data hämtas från Nira (Bengt 21/9). **Iakttagelse, inte slutsats:** motorns *fukt* betyder
nederbörd *nu*, och den här dagen kom halkan efter snöfallet, inte under det. Ett dygn ändrar ingen regel, och motorns
beteende vaktas av vektorerna. Iakttagelsen bokförs till domarna. **Kort #230 stängt.**

## #288 (21/9 2026) Skuggsidan har sex isregler, inte en — övergångsregeln läggs till i efterhandstestet (låst före körningen); grind A föll inte

**Bengts fråga 21/9:** *"men finns det bara en regel i skuggmotorn som det här testades mot"*. **Nej.** #286 låste två regler
och räknade bara skuggan och SMHI-förlängningen som otillämpbara. Det var för smalt. Skuggsidans kommande isregler har var
och en sitt tröskeldokument:

| Regel | Vad den gör | Behöver | På Niras material |
| :-- | :-- | :-- | :-- |
| Kombinationen, efterhalkans beta (TROSKLAR-KOMBINATIONEN) | varnar före frysningen: yta +1…+3 °C som faller, blött inom 2 h | yta, lutning, regn | ✅ körd (#287) |
| **Övergångsregeln #89 (a)** (TROSKLAR-OVERGANGAR) | förlänger frysriskens fuktvillkor: *"en väg som nyligen var blöt fortfarande är blöt när den fryser"* | yta, regn inom N h | ✅ **tillämpbar — läggs till här** |
| Trenden #88 (TROSKLAR-TRENDEN) | fallande yta med daggpunkten strax under | yta, daggpunkt | ✘ daggpunkt saknas |
| Rimfrosten #46 (TROSKLAR-RIMFROST) | svartis utan nederbörd: yta ≤ daggpunkt + M | yta, daggpunkt, moln | ✘ daggpunkt saknas |
| SMHI-förstärkaren #95 (d) | vintervarning + yta nära noll förstärker | SMHI:s varningar | ✘ saknas |
| Väglagets ålder #151 | tystar en stående vinterklassning när mätningarna säger att vintern är slut | Trafikverkets väglag | ✘ saknas |
| Frysklassningen #103 och segmentmotorn (skuggan) | prognos mellan stationerna | stationsankare | ✘ saknas |

Vattenplaningen och vind och sikt är skuggregler men inte isregler.

**Övergångsregeln, låst före körningen:** yta ≤ +1 °C och nederbörd inom N h. N = **2 h**, samma som betans startvärde
(#222); Ö-B:s eget svep körs inte. Samma ersättare som i #286: bilarnas lufttemperatur för ytan, torkarna igång inom
(t − 2 h, t] för nederbörden. Samma facit och samma mått: friktion under 0,30 på samma avsnitt inom 90 min (känslighet 0,25
och 0,35), basnivån, halkaepisoderna och fördelningen per timme. **Redan sett före låsningen:** dygnets temperatur och
torkare per timme (#284), motorns utfall (#287) och att halkan kom efter snöfallet. Övergångsregelns utfall är inte räknat.

**Rättelse — grind A föll inte.** I mitt svar 21/9 skrev jag att grind A föll 12/9. Det är fel, och det är andra gången
samma fel görs (första gången rättades i #180). Med #75:s givarvakt och marginalvakten blev domen **INGEN DOM** (#129,
#131): A1 0,85 mot 1,0 klarar, A2 5,1 % mot 5,0 % är oavgjort, A3 0,3 % klarar — uttryckligen *"inte ett nej"*. Segmentmotorn
är inte byggd, eftersom grinden öppnar bara på KLARAR, och valet mellan att skjuta den och att bygga på en oklarerad modell
är Bengts och Axels (#131). #285 och kort #230 skrev att *"koden skrivs i november om den håller"*. Det var också för enkelt:
novemberbeslutet saknar underlag.

**Källan till felet var tre texter som sa "föll" utan förbehåll:** rubriken på #119, raden *"DOMEN HAR FALLIT"* på kort #38b
och inledningen till TROSKLAR-FRYSKLASSNINGEN. Alla tre har fått en rättelsenot i den här commiten. Ingen tröskel och inget
beslut ändras; historiken står kvar.

**Läxa (samma som #280, en gång till):** läs hela beslutskedjan fram till i dag innan ett läge påstås. En rubrik är inte ett
läge.

## #289 (21/9 2026) Övergångsregeln på exempeldagen: fångar mer halka och tidigare än motorn — men inte bättre än slumpen

> ⚠️ **Läs med #290 (second opinion samma dag):** testet prövade i praktiken torkarna, inte motorn — temperaturvillkoret var sant i 99,7 % av perioderna, *"sämre än slumpen"* är till 70 % en blandningseffekt, och halkan började före datans fönster, så försprånget går inte att läsa. Talen nedan står kvar; läsningen av dem är ändrad.

**Körd enligt #288,** som låstes före körningen (PR #433). Samma skript och ersättare som i #287. Motorns och
efterhalkans tal blev exakt desamma vid omkörningen — inget annat har rörts.

**Övergångsregeln #89 (a)** (yta ≤ +1 °C och nederbörd inom 2 h):

| | Basnivå — larma på allt | Motorn | Övergångsregeln |
| :-- | --: | --: | --: |
| Varningsögonblick | — | 21 767 | **95 646**, varav 73 879 efter att nederbörden upphört |
| Följdes av friktion < 0,30 inom 90 min | 44,2 % | 33,7 % | **35,5 %** |
| — vid 0,25 / 0,35 | 26,4 % / 58,2 % | 20,8 % / 44,9 % | 21,0 % / 47,8 % |
| Falsklarm vid 0,30 | — | 8 595 | 37 227 |
| Halkaepisoder varnade i förväg | — | 11,5 % | **16,3 %** |
| Försprång, median | — | 50 min | **70 min** |

Per timme var övergångsregeln klart bättre än motorn på förmiddagen (kl. 9: 46,8 % mot 30,9 %; kl. 10: 30,2 % mot 15,3 %),
men låg under basnivån. Natt och morgon låg alla tre i samma nivå.

**Läsning:** minnet av nederbörd gör det testet pekade på — det fångar halka som kommer *efter* snöfallet, fler episoder och
tidigare. Men på en jämnt kall snödag pekar ingen av reglerna ut halkan bättre än slumpen, och övergångsregeln betalar med
fyra gånger så många varningar. **Reservationen som kan dra åt båda håll:** torkarna går också för stänk från blöta, saltade
vägar, och saltade vägar är just de som inte är hala. Det kan sänka träffandelen för båda reglerna jämfört med en riktig
nederbördsgivare. Det är inte mätt här.

**Skuggsidans övriga isregler** (trenden, rimfrosten, SMHI-förstärkaren, väglagets ålder, frysklassningen, segmentmotorn)
kunde inte köras på materialet (#288). Kort #230 står stängt.

## #290 (21/9 2026) Second opinion på efterhandstestet: upplägget var ärligt, men två slutsatser håller inte — och dagen var Niras bästa sort, inte vår

**Bengts order 21/9:** *"läs detta och ge mej en second opinion. Svara också på om du anser att det här var ett dygn när
vårt system skulle vara som bäst"*. Granskningen är gjord av en annan modell (Fable 5.1) än den som körde testet (Opus 5).
Kontrollerna är **explorativa och gjorda i efterhand** (`scripts/matningar/nira-efterhandstest-granskning-2026-09-21.py`).
De får inte ändra någon tröskel eller något startvärde — bara hur #287 och #289 ska läsas.

**Det som håller.** Upplägget låstes före körningen, reservationerna stod först, och omkörningen gav samma tal. Fynden om
Niras data i #283 (tunn natt, framförda värden utan ålder, luft- i stället för yttemperatur) är materialets verkliga värde
och berörs inte.

**Det som inte håller:**
1. **"Motorn" var inte motorn.** Testet prövade stationsregeln (A2, `icing_point`). Appens första vinterröst är
   Trafikverkets väglag (A1, `slippery_segment`, `engine.ts:262–278`), som går före A2 och som inte finns i Niras material.
   Talen säger alltså inget om vad appen hade sagt den dagen.
2. **Temperaturvillkoret gjorde inget arbete.** 99,72 % av perioderna med bilrapport låg ≤ +1 °C. Det som prövades var i
   praktiken *går torkarna?*. Meningen i #287 och utredningen §12 om att *Niras invändning mot temperaturvarningar
   bekräftades* saknar grund — temperaturen korsade aldrig tröskeln — och stryks.
3. **"Sämre än slumpen" är till 70 % en blandningseffekt.** Torkare > 0 fanns i 13,6 % av motorvägens perioder mot 3,5 % på
   de mindre vägarna, och mest mitt på dagen — där basnivån var lägst (motorväg 19 % mot 50–56 % på vägklass 3–4). Med samma
   blandning av vägklass och timme hade en regel helt utan information fått **36,8 %**, inte 44,2 %. Kvar inom samma vägklass
   och timme: 3,0 procentenheter. På vägklass 3 och 4 låg regeln över dygnet i nivå med eller över referensen (57,1 mot 55,8 %
   och 56,0 mot 50,1 %).
4. **Torkare > 0 är ett dåligt nederbördsvittne — dagtid snarare ett saltstänksvittne.** Värdet är en andel (median 0,13,
   max 1,10), och sannolikheten för *torkare* växer mekaniskt med trafiken: 2,4 % av perioderna med en delsträcksrad, 19,6 %
   med tio eller fler. Dagtid hade avsnitt MED torkare medianfriktion **0,54** (11,8 % under 0,30); avsnitt UTAN hade 0,37
   (30,9 %). Torkarna gick alltså där vägen var blöt, saltad och hade grepp. Med strängare tröskel stiger träffandelen stadigt
   (max ≥ 0,5: 38,9 % · medel ≥ 0,5: 46,8 %); allra högst upp går den över förväntan, men på 62 respektive 12 ögonblick — för
   lite för ett påstående.
5. **Försprånget går inte att läsa.** 76,9 % av *halkaepisoderna* var redan hala vid avsnittets första friktionsmätning, och
   datans första timme (01:00) har medianfriktion 0,27. Halkan började före fönstret. *Föregicks av en varning* och *50
   respektive 70 minuter* mäter tiden till första MÄTNING, inte till halkans början. Övergångsregelns *"tidigare än motorn"*
   (#289) faller på samma skäl.
6. **Efterhalkans "ett falsklarm"** ska läsas *inte prövad*: +1…+3 °C en dag med −5 °C är bilar med varm givare, inte väder.

**Var det ett dygn där vårt system borde vara som bäst? Nej — närmast tvärtom.** Skuggreglerna är byggda för övergången:
blöt väg som faller genom noll, rimfrost under klar himmel, tidig morgon med få bilar. Den 15/1 2024 låg luften på −4 till
−10 °C hela dygnet, det snöade lätt, och vägarna var redan hala när datan börjar. Det fanns ingen övergång att förutse. En
sådan dag avgörs halkan av *var det är plogat och saltat* — det ser en friktionsmätning, och det kan ingen temperaturstation
se. Det är Niras bästa sorts dag, och Nira har själva valt den som säljexempel *(det sista är en slutsats, inte ett belägg)*.
Vårt bästa dygn ser ut så här: regn eller blöt väg på kvällen, uppklarnande, ytan från +3 genom noll mellan klockan 02 och 06.
Då mäter stationerna som vanligt — och Niras egen data visar att bara 2–9 % av avsnitten har ett friktionsvärde från den
senaste timmen klockan 05 (#283). Det dygnet finns inte i materialet.

**Det obekväma som står kvar, och som gäller den riktiga regeln också.** På en stadigt kall snödag säger stationsregeln
*kallt och nederbörd* överallt där det snöar — också på en saltad E4 med fullt grepp. Stationen kan inte se saltet
(TROSKLAR-TYSTNADSFEL: *"saltbil som inte passerat (ingen öppen källa)"*). Jag hittade ingen grind som mäter
produktionsregelns falsklarm uppdelat på vädertyp. Förslag i bedömningen §4.2: när bildfacit läses delas produktionsregelns
varningar i *stadigt kallt* och *övergång* — deklarerat före datan, utan att någon tröskel rörs.

**Hur #287 och #289 ska läsas härefter:** som ett prov av en ersättare (torkarna), inte av motorn — varken för eller emot
Halkvakt. Rubrikerna står kvar för spårbarheten och har fått en pekare hit.

## #291 (21/9 2026) Produktionsregelns falsklarm mäts per vädertyp när bildfacit läses (kort #231)

**Bengts ja 21/9:** *"ja till förslaget om bildfacit per vädertyp"* — förslaget ur second opinion på efterhandstestet (#290).

**Beslutat:** när bildfacit läses (#209; beslutet efter första frosten, bilderna öppnas i mars enligt D2/D3/D6) delas
produktionsregelns varningar (`icing_point`) i *stadigt kallt* och *övergång*, och andelen bilder med bar eller våt väg
redovisas per grupp.

**Varför:** på en stadigt kall snödag säger stationsregeln *kallt och nederbörd* också på en saltad väg med fullt grepp.
Stationen ser inte saltet, och ingen grind mäter i dag hur ofta det händer. Efterhandstestet på Niras exempeldag visade
mönstret med en ersättare (dagtid hade avsnitt med torkare medianfriktion 0,54 mot 0,37 utan, #290); det här mäter det med
vår egen regel, våra egna stationer och en bild som facit.

**Vad beslutet INTE är:** ingen tröskel rörs, ingen röst ändras, ingen ny kod före mars. Asymmetriregeln i TROSKLAR-SKUGGAN §2
står orörd — en ren kamerabild fäller aldrig en VARNING, eftersom svartis inte syns i bild. Måttet är därför beskrivande: det
säger hur ofta bilden visar bar eller våt väg, inte att varningen var falsk. Skillnaden MELLAN de två vädertyperna är det som
bär informationen.

**Villkor:** definitionen av vädertyperna skrivs i DECISIONS innan den första bilden öppnas. Förslaget på kortet — *övergång*
= ytan över +1 °C någon gång under de N timmarna före varningen, N redovisat för 3 · 6 · 12 h, alla tre utskrivna — är ett
förslag, inte ett beslut. Läsningen av bildfacit är Bengts och Axels gemensamma beslut (#209), så raden följer med dit.

**Axel 21/9, via Bengt:** *"Axel har inte några synpunkter"*. Beslutet står därmed hos båda. Definitionen av vädertyperna
fastställs som planerat i samband med #209, före den första bilden.

## #292 (21/9 2026) Kuvösen: hela systemet bakåtprövat på en gången vinter — möjligt, och det hänger på ett datauttag från Trafikverket (kort #232)

**Bengts idé 21/9:** en testbädd där allt i motorn och allt i skuggmotorn körs tillsammans, *"i kuvös … långt från bilar och
appar och människor"*, mot historiska dygn — *"säg 50 vinterdygn 2025"* — som ett prov på *"om det är på rätt väg eller fel
väg"*. Skälet: *"Om vi inte gör det kommer vi ju bara få bevis för en efter en och inte sammantaget."*

**Idén är kartans egen brist, uttalad.** Integrationskartan §7.3: *"Varje grind dömer sin del ENSAM. Det finns ingen grind för
kombinationen … Vi riskerar att underkänna produktens ingredienser en och en."* TROSKLAR-KOMBINATIONEN täcker EN kombination
(efterhalkan: blöt + faller + startband). Ingen mätning svarar i dag på vad helheten ger.

**Delarna finns redan:** grindarnas skript (A, T-A, R-A, K-A, V-A, V-B), uppspelningen ur arkiven (sql/028), och kedjan
`snapshot-core` → `snapshotToHazards` → `AlertEngine` längs skuggmotorns 20 rutter. Kuvösen är att mata dem med en annan vinter.
Den körs i en slit-och-släng-databas som CI:s — aldrig i Supabase, där en vinter inte ryms (177 av 500 MB i dag).

**Vad det hänger på — kontrollerat 21/9, på källorna och inte i sammanfattningar:**

| Källa | Historik | Läst |
| :-- | :-- | :-- |
| Trafikverkets API (WeatherObservation) | sju dygn | källkartläggningen 26/8 (Trafiklabs notis 26/10 2023 säger detsamma enligt en söksammanfattning — notisen är inte läst) |
| Lastkajen | vägnät och järnväg — inga mätvärden | trafikverket.se *Hämta öppen data* (en söksammanfattning påstod *"historiska data finns på Lastkajen"*; sidan säger det inte) |
| Vintersidan | *"historisk väderdata från VViS och MESAN"* — bara Trafikverkets anställda och entreprenörer | bransch.trafikverket.se (#284) |
| Finland, Digitraffic | *"Sensor history for the last 24 hours"* | digitraffic.fi |
| Finland, FMI öppna data | vägväderfrågorna (`livi::observations::road`) finns inte längre | `listStoredQueries`: 151 frågor, ingen för väg |
| Norge, Statens vegvesen | realtid, kräver konto | dataut.vegvesen.no |
| Norge, MET Frost | arkiv, kräver konto — **inte kontrollerat** om vägbanetemperaturen finns | — |

**Slutsats:** vägen till vintern 2024/25 är en förfrågan till Trafikverket. Forskare får sådana uttag; om vi får det vet
ingen förrän vi frågat. Utkast och mottagare på kort #232. **Kartrepots historik** bär 2 606 versioner av `live.json` sedan
24/8 (144 per dygn) — exakt det apparna såg — och blir kuvösens källa för ÅRETS vinter, om svaret blir nej.

**Facit bakåt i tiden är lika gott som facit framåt — för det som stationen kan se.** Stationens egen yta efter varningen
säger att det BLEV kallt, inte att vägen blev hal (sql/028:s egen reservation), och den ser inte saltet (#290). För
övergångsreglerna — efterhalkan, trenden, rimfrosten — räcker det långt som riktningsprov. Väglag och olyckor för samma
period stärker facit, om Trafikverket ger dem.

**Blindningen:** vintern 2024/25 ligger utanför säsongens kalibrerings- och domnätter, så D3 bryts inte av ett riktningsprov
med låsta startvärden. Två saker gäller ändå: upplägget skrivs i DECISIONS före körningen, och hela vintern körs — inga
handplockade dygn. **Vill Bengt och Axel i stället låta den gångna vintern bli KALIBRERINGSDATA** — vilket uppfyller D3
(*kalibrering och dom på skilda nätter*) bättre än att dela årets vinter i två — är det en ändring av planen (kalibreringen
står i dag på 1/2) och ett eget beslut, taget före körningen.

**Bonus:** en hel vinter avgör grind A:s oavgjorda A2 (#131: *"A2 kan inte avgöras på septemberdata, och vinterdata kommer
efter november"*) — alltså novemberbeslutet om segmentmotorn.

**Tillägg 21/9 — SMHI för samma vinter (Bengts fråga *"behöver vi mer smhi data för den perioden också"*).** Prövat mot SMHI:s
tre öppna tjänster: **molnmängd, lufttemperatur och nederbörd** finns i metobs `corrected-archive` (parameter 16: 2010-03-01
till 2026-06-01, 24 timvärden för 15/1 2025) · **radarn** finns med 288 kompositer per dygn för 15/11 2024, 15/1 2025 och
15/3 2025 · **varningarna har inget öppet arkiv** — API:t bär bara de aktiva. SMHI-förstärkaren (#95 d) och N_varning kräver
därför en egen fråga till SMHI, eller körs inte i kuvösen. Ingen ny förfrågan behövs för det övriga; det hämtas vid bygget.

## #293 (21/9 2026) Kuvösens två förfrågningar: mottagarna lästa på källan — och läxan om datex-adressen rättad

> ⚠️ **Fel samma dag, se #294:** datex@trafikverket.se studsar — Bengts mejl 17/9 kom tillbaka med *"Adressen hittades
> inte"*. Trafikverket nås via formulär. SMHI-adressen nedan berörs inte.

**Bengts order 21/9:** *"kan du kontrollera vilken som är rätt mejladress och skriva ett färdigt mejl till mej att skicka"*.

| Mottagare | Adress | Läst var |
| :-- | :-- | :-- |
| Trafikverket, öppna trafikdata | **datex@trafikverket.se** | `contact_email` och `publisher_email` i Trafikverkets egna katalogposter på trafficdata.se (*Temporary slippery road*, *Exceptional weather conditions* — den senare ändrad 3/12 2025) |
| Trafikverket, reserv 1 | formuläret *Frågor till Trafikverket*, etjanster.trafikverket.se/kundfragor-trafikverket | trafikverket.se/om-oss/kontakta-oss — sidan har **inga e-postadresser alls**, bara formulär |
| Trafikverket, reserv 2 | e-tjänsten *Begär ut allmänna handlingar* | samma sida |
| SMHI (varningarna, valfritt) | **kundtjanst@smhi.se** | smhi.se/kontakta-smhi: *"Vi tar emot och vidarebefordrar uppdrag och beställningar"* |

VViS-sidan på bransch.trafikverket.se anger bara växeln (0771-921 921) och det allmänna formuläret. Att datex-adressen
faktiskt tar emot post går inte att pröva härifrån — därför reserverna. Båda mejlen frågar efter kostnaden innan något
arbete påbörjas (gratisnivån: ingen betalväg utan Axels godkännande).

**CLAUDE.md rättad:** läxan från 17/9 sa att sammanfattningen *"hittade på"* adressen och att Trafikverket inte har någon
sådan. Adressen finns (#282). Felet 17/9 var att den gavs vidare oläst — och felet därefter var att den kallades påhittad,
också det oläst. Regeln gäller åt båda hållen.

## #294 (21/9 2026) datex@trafikverket.se studsar — #293:s mottagare var fel, och felet var mitt två gånger om

**Bengts skärmbild 21/9:** hans mejl *"Publiceras halkhändelser från fordon som öppen data"* till datex@trafikverket.se
17/9 08:12 kom tillbaka samma minut från Gmails Mail Delivery Subsystem: *"Adressen hittades inte. Meddelandet levererades
inte eftersom adressen datex@trafikverket.se inte hittades eller inte kan ta emot e-post."*

**Vad som är sant om adressen:** den STÅR som `contact_email` och `publisher_email` i Trafikverkets egna katalogposter på
trafficdata.se (läst 21/9; en post ändrad så sent som 3/12 2025) — och den TAR INTE EMOT POST. Båda sakerna gäller samtidigt.
CLAUDE.md:s läxa från 17/9 hade fel om varifrån adressen kom men rätt i det som räknas: den går inte att använda.

**Mitt fel, två gånger:** (1) #282 och #293 kallade läxan *"för stark"* och *"rättade"* den, utan att fråga sig varför den
skrivits — spåret fanns på raden: *"En fel adress kostar ett utskick och ett varv."* (2) Adressen gavs till Bengt en andra
gång, med reservationen att leveransen inte gick att pröva. Den gick att pröva: genom att fråga Bengt, som hade studsen i
sin inkorg. **Skärpt regel i CLAUDE.md:** att en adress står på en källsida bevisar inte att den fungerar.

**Rätt väg för kuvösens förfrågan (kort #232), läst på källan 21/9:**
1. **Datautbytesportalens kontaktformulär**, data.trafikverket.se/about-us/contact — ärendetyperna är *API Öppna Data ·
   Datex II · Vägdata - NVDB · Öppna Data*; fälten är e-postadress, ämne och innehåll. Välj **API Öppna Data**:
   WeatherObservation ligger i API:t. Samma väg som Bengts Datex II-ärende (skickat, bekräftat 19/9, obesvarat).
2. Reserv: formuläret *Frågor till Trafikverket*, etjanster.trafikverket.se/kundfragor-trafikverket.
3. Reserv: e-tjänsten *Begär ut allmänna handlingar*.
SMHI-adressen (kundtjanst@smhi.se) berörs inte — den är läst på SMHI:s kontaktsida, men inte heller den är prövad.

## #295 (21/9 2026) Göteborg: följdfrågan skickas inte — stadens egen rapport har redan svarat, och vi har inga testare där

**Bengts fråga 21/9:** är det värt att skriva igen till Göteborg, när vi inte har några testare där?

**Bedömning: nej, inte nu.**
1. **Frågan är besvarad.** Följdfrågan gällde om staden har egna vägväderstationer. Stadens slutrapport (InfraSweden 2025,
   s. 8) säger att det före projektet fanns *"tre egna väderstationer som var utplacerade på väderkritiska platser"*, och att
   Klimators system RSI samlar in *"IoT-stationer av olika tillverkare"* vid sidan av Trafikverkets VViS.
2. **Svaret ändrar ingenting.** Tre punkter lyfter inte täckningen (inom 7 km från centrum finns en Trafikverksstation, #93),
   och datan ligger sannolikt i samma avtalsbundna system som Petri Stjernvall redan sagt inte kan delas. Rapporten pekar
   själv ut ägandet av datan som en olöst fråga (§4.3.3.4).
3. **Ingen nytta på plats.** Inga testare i Göteborg (Bengt 21/9); Skyltfondsparterna — halkbanan och trafikskolorna — finns i Skåne. En ny källa kostar en avtalsfråga,
   en egen inläsare och underhåll — för tre punkter ingen förare passerar.
4. **Kraften gör mer nytta där svar väntas:** Malmö (följdmejl 19/9 — halkbanan och skolorna finns där), Trafikverkets
   historikuttag (#232) och Skyltfondsansökan 28/9.

**Vad som ÄR värt att behålla:** kontakten. Petri Stjernvall är planeringsledare för vinterväghållningen, svarade inom fyra
dygn, och staden har drivit ett innovationsprojekt med just Nira och Klimator. Är förvarningen bevisad efter domarna är
Göteborg en naturlig väghållare att återkomma till (#282:s rekommendation om en väghållare som tredje part). Ett kort tack
utan fråga är valfritt och kostar ingenting; en ny fråga en vecka efter ett tydligt nej kostar lite förtroende och ger inget.

## #296 (21/9 2026) Niras produktsida läst mot repot: två saker vi inte har — före resan och snöflingan — och en vi parkerat

**Bengts fråga 21/9:** ser du på Niras sida *Road Surface Alerts* något vi tydligt missat i appen och borde utreda?
Varje punkt på sidan söktes i TAVLA, BACKLOG, PLAN, produktboken och DECISIONS innan den kallades missad.

| På Niras sida | Hos oss |
| :-- | :-- |
| *Slippery road* | kärnan: väglag (A1) och stationsregeln (A2) |
| *Hydroplaning*, *Heavy rain* | #42/#81 vattenplaningen i skugga; vind och sikt (W-A) |
| *Slow traffic alert* | **parkerat:** kort #15 köslut (TrafficFlow, 43 s färsk), beslutad som uppdatering 1 efter release |
| *Very rough road*, *Pothole* | saknas — och ska saknas nu: ingen öppen källa utom tjälskademeddelanden, fel säsong, fel produkt |
| *"route planning that avoids known hazards"* | **saknas helt** — appen talar bara under körning |
| *"…temperature thresholds, such as a snowflake symbol"* | **saknas helt** som jämförelse — ingen mätning ställer oss mot bilens egen varning |
| flottor, tredjepartsappar | #94 (åkerier), PLAN (B2B är Axels fil) |
| bekräftelse över flera bilar | kartans bevisbärare (§8 B), inte byggd |

**(1) Före resan.** Beslutet som betyder mest fattas före avfärd. En ruttkoll för en sparad sträcka använder samma vägdata
och matchas i telefonen — produktinvarianten håller. Och den ger förvarningen en laglig plats: regel T3/T6 förbjuder
modellprodukter att UTLÖSA, inte att visas i en vy föraren själv öppnar (samma resonemang som SKUGGAN-PAR4-MOT-REGEL-T om
kartan). Formen är Axels; först ett beslutsunderlag.

**(2) Snöflingan.** Varje bil varnar vid omkring +3 °C i luften. Second opinion (#290) visade att stationsregeln en stadigt
kall dag säger *kallt och nederbörd* överallt — det gör snöflingan också. Värdet ligger där ytan är kall fast luften inte är
det, och det ser en station men ingen bil. Andelen fyrningar med luft över +3 °C är mätbar ur arkivet i dag. Den läser
fyrningar, inte utfall, så blindningen rörs inte. Hög andel är ett säljargument; låg andel är en varningsklocka inför vintern.

**(3) Köslut** lämnas orört — noterat att en konkurrent räknar det till kärnan.

Frågan om vad som ska utredas står i bedömningen §4.2; kort #233.

## #297 (21/9 2026) Snöflingemätningen: för tidigt att säga — men den hittade trasiga ytgivare som ger falska brolarm på E4 i Skåne (kort #234)

**Bengts order 21/9:** *"kör snöflingemätningen nu"* (kort #233, #296). Tre läsande körningar via dbknapp (35629700266,
35629869303, 35630131080; satserna i `scripts/matningar/snoflingan-*.sql`). Arkivet 24/8–21/9: 393 803 rader, 850 stationer.
Fyrningar lästes, inga utfall — blindningen är orörd.

**Svaret på frågan: för tidigt.** Stationsregeln (yta ≤ +1 °C och fukt) fyrade 4 episoder på 29 dygn — alla med luft
+8,5…+11,5 °C, alltså givarfel och inte frost. Äkta frost (yta ≤ 0 °C med gap luft − yta ≤ 3 °C): 7 episoder, alla i Norrland
(Kiruna, Nikkaluokta, Kätkesuando, Umasjö, Vassijaure, Bergfors, Ollsta 10/9) med luft ≤ +0,4 °C. Snöflingan lyste i
samtliga. Inget stöd än för att stationen ser det bilen inte ser — och sju septemberepisoder avgör ingenting. Körs om efter
första frostmånaden.

**Fyndet som är viktigare än frågan: givarfel slinker förbi #75:s vakt, och det låter i appen.**

| Station | Mönster | Följd |
| :-- | :-- | :-- |
| **1106 Ö Ljungby** (E4, Skåne) | yta +1,1…+3,5 °C vid luft +13…+15 °C, daggpunkt +8…+13 °C, regn — timme efter timme 19–21/9 | **24 broar** inom 0,3–14,6 km publiceras med frysrisk (brotröskeln +3 °C). Skuggmotorn: *"Frysrisk framöver — bro om 600 meter"* sju gånger per varv på E4 Helsingborg→Jönköping 5/9, 16/9, 17/9, 19/9, 20/9, 21/9 |
| 2346 Ollsta (Jämtland) | yta −4,6…+0,7 °C vid luft +8…+10 °C, 8 dagar | stationsregeln fyrade 3 nätter, i regn |
| 2135 Storvik · 2132 Testeboån · 1302 Kullavik · 1713 Bolhyttan | yta under noll vid luft +6…+11 °C | 1–5 dagar vardera |

Vakten släpper allt med yta ≥ luft − 12. Felen ligger på 10,6–12,0 °C — de pendlar kring gränsen och går igenom de rader som
råkar hamna under. 13 av arkivets 21 *frostepisoder* är sådana fel. (5/9 publicerades Storvik med yta −16,9 °C; det var före
#75, som kom 8/9.)

**Varför 12 inte bara ska sänkas:** varmfront med regn över frusen väg — yta −3 °C, luft +4 °C, daggpunkt +3 °C — ger ett ÄKTA
gap på 7–10 °C. Det är blixthalkan, det farligaste fallet, och en lägre fast gräns tystar just den. Av samma skäl duger inte
trendens `rimlig()`-vakt (yta − dagg < −5, `publish/trenden.ts`) rakt av i produktion. Kandidater att MÄTA innan någon väljs:
(a) gapvakten görs beroende av lufttemperaturen — en blöt yta nära noll vid luft ≥ +8 °C finns inte; (b) kronikerlista;
(c) båda. Tröskeln är fastställd (#75) och kopierad på 17 ställen under kontraktsgrinden: ändringen är Bengts och Axels
beslut, och byggs med motprov (1106:s rader är färdiga provdata).

**Kopplingen till #290:** second opinion pekade på produktionsregelns falsklarm som den svaghet som står kvar mot oss. Det här
är det första uppmätta exemplet — inte salt, utan en trasig givare — och det hittades av en mätning som letade efter något
annat. CLAUDE.md:s värdevaktsläxa en gång till: *"Inget av dem hittades av en vakt."*

## #298 (21/9 2026) Givarvakten får två tillägg — radvakten och karantänen — och talet 12 står orört (kort #234)

**Bengts order 21/9:** *"gör 1-3. jag är helt inne på att vi måste sätta en annan typ av vakt. välj den gräns du tycker är mest
logisk och kolla upp så vi inte förstör något annat i de 17 kopior i koden"*.

**Vad mätningen visade** (fyra läsande körningar via dbknapp, satserna i `scripts/matningar/givarvakt-*.sql`):
- Av de rader som i dag kan publiceras som kalla (yta ≤ +3 °C, förbi #75) har 5 343 ett gap luft − yta under 5 °C. **Alla 811
  rader med gap ≥ 5 °C kommer från sju stationer** — 1106 Ö Ljungby, 2346 Ollsta, 2135 Storvik, 2132 Testeboån, 1713 Bolhyttan,
  1612 Fagersanna, 1302 Kullavik. Ingen äkta rad ligger där.
- Felen är av **två slag.** Sex av stationerna visar andra stunder **−46…−50 °C** — en urkopplad givare — och läcker förbi
  vakten när värdet driver tillbaka. **Ö Ljungby** bryter aldrig grovt: ytan följer luften, ~12 °C för lågt, 24 av 29 dygn.

**Varför inte bara sänka 12, och varför inte en ren gräns i (luft, gap):** varmfront med regn över frusen väg (yta −3, luft +4)
ger ett ÄKTA gap på 7–10 °C, och blankis i töväder håller ytan vid 0 °C medan luften är +8…+10 °C. Det är de två farligaste
väglagen. En gräns som tar givarfelen vid låg lufttemperatur tar också dem.

**Beslutat (gränserna valda av Claude på Bengts order):**
1. **Radvakten** — luft ≥ **+10 °C** och yta ≥ **8 °C** under luften ⇒ raden publiceras inte. Bara varm luft: under +10 °C rör
   vakten ingenting, och en station den tystat talar igen så fort luften kyls av. +8 °C hade tagit 47 rader till men ligger
   närmare töväderfallet; den försiktigare gränsen räcker (nedan).
2. **Karantänen** — en station med ≥ **3** brott mot #75 (yta < luft − 12) de senaste **7** dygnen publiceras inte alls, varken
   som väderpunkt eller som broarnas källa. Tre, inte ett: Vassijaure hade en enstaka studs (−32,8 °C, 1 rad på 29 dygn) och
   är en frisk fjällstation. Fönstren 3, 7 och 14 dygn gav samma utfall; 7 valdes som mitten.

| Mätt mot arkivet | Felrader tagna (av 811) | Äkta rader tystade | Kvar |
| :-- | --: | --: | :-- |
| Karantänen ensam (7 dygn, ≥ 3) | 597 | 4 — alla från Ollsta och Storvik, som själva är trasiga | 212 rader från Ö Ljungby |
| Radvakten ensam (+10 °C, 8 °C) | 675 | 0 | — |
| **Båda** | **706** | 4 (samma) | 105 rader, varav **1 fuktig** — alltså en enda som kan fyra |

**De 17 kopiorna av #75 är orörda.** Tilläggen ligger BREDVID vakten, i `publish/snapshot-core.ts` (och därmed i den
genererade `supabase/functions/publicera/index.ts`, som CI håller i synk). Genomgången av kopiorna:

| Var | Vad den gör | Rörd? |
| :-- | :-- | :-- |
| `publish/snapshot-core.ts` + genererad `publicera/index.ts` | det appen hör | **ja — de två tilläggen** |
| `supabase/functions/vakthund/index.ts` | frostvakten räknar kalla stationer | nej — sju felande stationer av 850 flyttar inte ett larm vid 50 |
| grind A, K-A, R-A, T-A · `anomalin` · `ruttberedskap` · `overgangar-steg0` · `smhi-forstarkaren-steg0` · `publish/trenden.ts` · `sql/018` · `sql/028` | mätningar och domar | **nej — se nedan** |
| `test/snapshot-core.test.ts`, `test/integration.test.ts` | bevisar vakten | utökade |

**Kontraktsgrinden:** #75-kontraktet har fått en andra form — brottet, `surface_temp_c < air_temp_c - N` — bredvid vaktens
`>=`, så att karantänens 12 inte kan glida från vaktens 12. Golvet höjt 17 → 19. De nya talen (10, 8, 7, 3) står på ETT ställe,
som exporterade konstanter; testerna importerar dem. Kopieras de någon gång ska de in i grinden i samma commit.

**Öppen fråga (bedömningen §4.2): ska MÄTNINGARNA ärva vakterna?** 13 av arkivets 21 frostepisoder är givarfel, och de hamnar i
grindarnas och uppspelningens underlag. Att lägga till vakterna där ändrar talen — samma fråga som #129 — men utfallen är inte
lästa, så det går att göra rent. Bengts och Axels beslut; rekommendation: ja, före första frostmånaden.

**Bevis:** enhetstester (karantänen tystar väderpunkt OCH bro; gränsstationer med samma id rörs inte; oläsbar historik fäller
inte snapshoten) och ett integrationstest mot riktig PostGIS med fallet som det såg ut (yta +1,3 °C, luft +13,3 °C) samt de fall
vakten INTE får ta: blixthalkan (−5/+4), töväder (0/+9,9), gränsen (gap 7,9 vid +10) och den enstaka studsen. Motprov och
mätning efter deploy redovisas på kortet.

**Anmälan** om de sju stationerna är skriven: `docs/ANMALAN-TRV-YTGIVARE.md`. Bengt skickar den via Datautbytesportalens
formulär. **Snöflingemätningen** (#297) står som bevakningsrad i bedömningen §0b och körs om efter första frostmånaden.

**BEVIS, samma kväll (21/9):**
- **CI på PR #446:** 135 av 135 tester, inget överhoppat. `ok 45` är integrationstestet mot riktig PostGIS; `ok 94–97` enhetstesterna.
- **Motprov (PR #447, stängd utan sammanslagning):** radvaktens luftgräns satt till 99 och karantänfiltret borttaget ur broarnas
  källa — två mutationer som kontraktsgrinden INTE ser (*ALLA 39 KONTRAKT HÅLLER* i samma körning). Domen: `not ok 45` på raden
  *'LJUNGBY ska vara tyst'*, `not ok 94` på *radvakten, nollsäker*, `not ok 95` på *bron vid den trasiga givaren får ingen
  frysrisk*. Tre fall, tre rätta rader, 132 av 135.
- **Deploy:** `publicera` deployad 18:19:01Z från 73688a4 (körning 35637540366), efter `git pull` och noll rader diff mot main.
- **Mätning EFTER deployen — en rad med innehåll:** funktionens eget svar i `net._http_response`. Körningarna 17:50, 18:00 och
  18:10 har ingen karantänrad; **18:20:00, den första efter deployen, svarar** *"karantän: 5 station(er) tysta efter brott mot
  #75: 1106, 1612, 2132, 2135, 2346"*. Manifestets sha = filens sha för samma `live.json` (generated_at 18:20:01Z).
- **Vad som INTE är bevisat än:** i kväll ligger ingen av de sju under +3 °C med ett gap under 12 (Ö Ljungby: yta 3,2 °C, luft
  11,2 °C), så den gamla vakten hade inte heller publicerat något just nu. Att brolarmen faktiskt uteblir en natt då givaren
  visar fel läses ur skuggloggen i morgon (bevakningsrad i bedömningen §0b). Kortet står öppet till dess.

## #299 (22/9 2026) Mätningarna ärver radvakten och karantänen — samma tal ur samma källa, karantänen per rad (kort #234)

**Beslut (Bengt 21/9: *"ja lägg in vakterna i mätningarna också"*; formen Claudes 22/9).** Kort #234:s två vakter (DECISIONS #298)
gäller nu VARJE mätning som läser yttemperatur med #75, inte bara det appen hör.

**Hur — fyra val:**
1. **En källa, inga nya kopior i TypeScript.** `publish/snapshot-core.ts` exporterar `RADVAKT_SQL` (samma sträng som `WX_SANE`
   bär — testet kräver att `WX_SANE` slutar med den), `brottSql(rad, tabell)` och `karantanSql(rad, tabell)`. Grind A, K-A, R-A
   (svenska och finska arkivet), T-A, trendarkivet, anomalin, ruttberedskapen, övergångarnas och SMHI-förstärkarens steg 0
   importerar dem. Vaktdiagnosen (`led234()`) visar i varje grind hur många rader de två vakterna tar, så en nolla aldrig blir
   tvetydig (DECISIONS #141). `rimlig()` i trenden bär vakterna i TypeScript (gapet avrundat till tusendelen, 13/9-läxan) och
   raden bär `brott` ur arkivet.
2. **Karantänen räknas PER RAD**, sju dygn bakåt från radens egen tid — inte per station för hela fönstret, som snapshoten gör
   från nu. Skälet: en mätning över 60 dygn ska inte tysta en frisk fjällstation hela vintern för tre studsar en vecka.
3. **Ett delindex (`sql/029`) över just brotten.** Delfrågan per rad läser annars varje rad hos stationen i sju dygn, för varje
   rad i fönstret — miljarder radbesök på 60 dygn (enda indexet var på `sample_time`). Brotten är sällsynta (811 rader på 60 dygn),
   så indexet är litet; predikatet är ordagrant delfrågans, och kontraktsgrinden vaktar talet 12 i båda. Samma index på det
   finska arkivet när schemat finns.
4. **SQL-tvillingarna bär talen literalt, under kontrakt.** `sql/018` (drifträkningen, tvilling till `rimlig()`), `sql/028`
   (uppspelningens variant *utan faller*) och mätsatsen `uppspelning-efterhalka.sql` får radvakten och karantänen ordagrant, och
   fyra nya kontrakt (10, 8, 7, 3) i `scripts/kontraktsgrinden.ts` håller ihop dem med konstanterna. 43 kontrakt håller.

**Alternativ som valdes bort:** att kopiera talen till varje skript (det var precis så #75 blev sjutton kopior); att låta
snapshotkärnans stationslista (från nu) gälla mätningarna (fel för långa fönster, punkt 2); en CTE per fråga i stället för
indexet (åtta frågor att bygga om, och vaktdiagnosen hade inte kunnat bära ledet).

**Fynd på vägen:** #75:s kontraktsform räknade inte KVALIFICERADE kopior — `r.surface_temp_c >= r.air_temp_c - 12` i sql/018
och `w.…` i sql/028 stod utanför grinden sedan de skrevs. Formen tar nu en valfri kvalificerare; 55 kopior, alla 12, golvet
satt till 29 (utanför de daterade mätfilerna).

**Bevis (PR:n 22/9):** 138 tester (128 lokalt, 10 integrationstester i CI mot PostGIS), nio självtester gröna, kontraktsgrinden 43/43,
bunten i synk (`--check`). **Motprov:** radvakten avslagen i `rimlig()` ⇒ trendtestet rött på rätt rad; karantänen avslagen ⇒ rött
på samma rad. **Nytt integrationstest** för sql/018: fyra stationer med samma fall i bandet — KAR_A frisk och KAR_D med två brott
räknas, KAR_B med Ö Ljungby-felet (luften 12 ° över, #75 släpper, radvakten ensam tar) och KAR_C med tre brott är tysta.
Idrifttagningen (029, 018 via `trendarkivet --jamfor`, 028, deploy av bunten) och grind A i båda läsningarna redovisas på kortet
och i bedömningen §0b.

**Nattbeviset för #298, läst 22/9** (`scripts/matningar/givarvakt-nattbevis-2026-09-22.sql`): Ö Ljungby 1106 visade 21/9 18–19Z
yta 1,8–3,3 °C vid luft 9,6–11,6 °C (16 felrader med yta ≤ 3 vid luft ≥ 10) och gled sedan till −2 °C vid luft +4…+6 °C, regn
hela natten. Skuggloggen på E4 Helsingborg→Jönköping: 7 brolarm 20/9 21Z och 21/9 04Z (före deployen); **0 brolarm 21/9 18Z, 22Z
och 22/9 01Z**, medan stationen visade −0,2…−1,1 °C. 36 av 36 publiceringar 22:40–04:30Z bar karantännoten (1106, 1713, 2132,
2135, 2346 — 1612 har lämnat, 1713 kommit till). **Avvikelse, sagd högt:** det var karantänen som bar natten, inte radvakten —
från 20Z låg luften under +10 °C, där radvakten inte gäller, och gapet 6–8 ° släpps av #75. Brotten som håller 1106 i karantän
är från de varma dagarna 19–21/9 och åldras ut runt 28/9; håller sig luften sval till dess publiceras stationen igen. Frågan om
vad som ska bära hösten står i bedömningen §4.2 (rekommendation: låt karantänen räkna radvaktens brott också — inget nytt tal).

**IDRIFTTAGNING 22/9, bevis:**
- **PR #455** sammanslagen 04:46Z (b567bf6); CI: `ok 52` är det nya integrationstestet mot PostGIS, `ok 132` enhetstestet, 43 kontrakt.
- **`sql/029`** (dbknapp 04:47Z, `scripts/matningar/karantan-idrift-029-2026-09-22.sql`): indexet i `pg_indexes` på public och fi;
  EXPLAIN för delfrågan: *Index Only Scan using weather_obs_brott_idx*; hela karantänräkningen över 7 dygn (195 442 rader) tar
  0,7 s; i dag är 1 670 rader hos 5 stationer i karantän och 1 468 rader tas av radvakten.
- **`sql/018`** körd in av `trendarkivet --jamfor` 04:48Z; **`sql/028`** av dbknapp 04:59Z (`karantan-idrift-028-2026-09-22.sql`):
  `pg_proc` visar båda funktionskropparna med karantänen per rad, radvakten och tre-brott-gränsen; varianten *utan faller* kör.
- **Bunten** deployad 04:48:22Z från b567bf6 efter `git pull` och noll diff mot main. Publiceringen 04:50:01Z: manifestets sha =
  filens, 79 väderstationer, ingen av de sju, noll broar; funktionens eget svar bär karantännoten (1106, 1713, 2132, 2135, 2346).
- **Grind A i båda läsningarna.** Utan vakterna (måndagskörningen 21/9 05:40Z): 714 stationer, 199 742 avläsningar, A1 0,75 °C på
  5 745 punkter, A2 3,8 % [±0,5], A3 0,3 % — KLARAD. Med vakterna (22/9 04:49Z): 711 stationer, 202 087 avläsningar, A1 0,71 °C på
  7 356 punkter, **A2 3,5 % [±0,4], A3 0,0 %** — KLARAD. Vaktdiagnosen på 60 dygn: radvakten tar 1 965 rader, karantänen 1 993.
  Sagt högt: fönstren skiljer ett dygn och natten emellan var kall i Skåne, så skillnaden är en riktning, inte ett rent
  vaktresultat. A2 står inte längre oavgjort (5,1 % 13/9 var en äldre läsning).
- **Driftvakten** (SQL mot TypeScript) dömde först drift två gånger utan att kopiorna glidit — och båda var driftvaktens egna fel.
  (1) 23 rader, alla med arkivets nyaste tidsstämpel: ingest-live skrev dem mellan TypeScript-laddningen (05:00:09Z) och
  funktionen (05:00:10–47Z); omkörningen hade dem på båda sidor. (2) 17 rader i fönstrets första kvart: sql/018:s `bas` läser
  en timme FÖRE fönstret för lutningens historia, TypeScript-sidan gjorde det inte, så fönstrets första rader var kandidater
  bara i SQL — ett fel i trendarkivets skrivläge också, sedan 13/9 (7-dygnsfönstrets kant låg i gallrat material och syntes
  aldrig). Rättat i `scripts/trendarkivet.ts` (PR #456): timmen läses som historia, kanten sätts en gång, kandidater bara inom
  fönstret, och rader som bara kan finnas på ena sidan (ingest under körningen, kantminuten) sägs högt i stället för att dömas.
  **Domen, 1 dygn från grenen:** 1 dygn från grenen (körning 35689485866, 05:08Z): TypeScript valde 5 687 rader, SQL 5 687, bara TypeScript 0, bara SQL 0 — **ENSE OM VARJE RAD**, inga rader undantagna. Sju dygn faller på funktionens timeout (kort #235).
- **Fynd, eget kort #235:** `berakna_trendkandidater` över 7 dygn faller på statement timeout (600 s) — TypeScript-sidan räknade
  11 061 kandidater ur 195 444 rader, funktionen hann inte. 13/9 gick 118 054 rader. Orsaken är den materialiserade CTE:n `bas`
  och lateralen över den, kvadratisk i arkivets storlek — inte karantänens delfråga (0,7 s, mätt). Driften (2 h) berörs inte.

## #300 (22/9 2026) Den långsamma vakten byggs — alternativ (d), regeln på ett ställe, självläkande tills Trafikverket lagar givaren (kort #236)

**Beslut (Bengt 22/9: *"jag har anmält det till trafikverket. ingen vet när det fixas hos dem. vi måste ha något som läker detta
till de fixar"* — och sedan *"bygg den långsamma vakten nu och gör den klar"*).** Alternativ (d) ur bedömningen §4.2 byggs i den form
som mättes samma dag: en station vars yta legat ≥ 6 ° under luften i ≥ 90 % av det senaste dygnets rader (minst 24) mäter fel.

**Varför (d) och inte de andra.** (a) anmälan gäller alltid men lagar inget i appen. (b) en längre karantän skjuter bara problemet och
tystar en lagad station en månad. (c) radvaktens brott i karantänen hjälper bara så länge varma dagar återkommer — i sval luft fyrar
varken #75 eller radvakten. (d) håller i sval luft, och mätningen (`scripts/matningar/langsam-vakt-d-2026-09-22.sql`) visade att den
tar exakt fem stationer i hela arkivet, alla bland de sju anmälda, och ingen frisk vid gränsen 5, 6 eller 8 °. Ö Ljungby har haft
felet sedan 30/8 med gap under 12; (d) hade tystat den från dag ett.

**Formen — fyra val:**
1. **Regeln bor på ETT ställe:** `sql/030`:s `langsam_vakt(sedan)`. Talen 6, 0,9 och 24 finns bara där. Ingen kopia i TypeScript,
   inget kontrakt behövs för dem; fristen som snapshoten läser tabellen med (`LANGSAM_FRIST_H = 3`) kopieras av bunten och har kontrakt.
2. **En liten tabell, `givarfel_dygn`** (station, UTC-dygn, första och senaste ögonblick i felet), skriven idempotent med least/greatest.
   Backfill är samma funktion med långt fönster. Tabellen är också listan Bengt kan visa Trafikverket: vilka stationer, sedan när.
3. **ingest-live kör funktionen** varje varv, fail-soft som trenden i sql/018: ett fel här kan bara tysta vakten, aldrig ingesten.
   Inget nytt cron-jobb (kort #85), noll Actions-minuter.
4. **Läser, inte räknar:** snapshoten tystar stationer vars `senast` är färskare än tre timmar (väderpunkt och broarnas källa, med not);
   mätningarna utesluter stationens rader det dygnet (`givarfelSql`, i `karantanSql`; `rimlig()` och `sql/018` som tvillingar, `sql/028`
   och efterhalkans mätsats). Dygnsupplösning i mätningarna med flit — en trasig givare är trasig hela dagen.

**Självläkande åt båda håll.** In ~22 h efter att felet börjat (90 % av ett dygn), ut några timmar efter att givaren mäter rätt igen
(andelen faller under 90 % efter ~2,4 h, fristen 3 h därefter). Ingen lista att hålla, ingen som måste minnas när Trafikverket lagat.

**Reservation.** Arkivet är augusti–september. Formen mäts om efter första frostmånaden innan den räknas som vinterbeprövad
(bevakningsrad i §0b). Det finska arkivet omfattas inte (id-krock, funktionen räknar bara det svenska).

**Bevis (PR:n 22/9):** 142 tester — nya: tabellen tystar väderpunkt OCH bro med not och utan att regeln står i snapshoten, en
oläsbar tabell fäller inte snapshoten, fragmenten bär dygnsflaggan för det svenska arkivet men inte det finska, `rimlig()` fäller
på flaggan; integrationstest mot riktig PostGIS: LV_FEL (7 ° under i 30 h) får ett färskt dygn, LV_FRISK inget, LV_KORT (rätt de
sista tio timmarna) ett gammalt, omkörning ger identisk tabell, och snapshoten tystar bara LV_FEL; KAR_E i drifträkningen. Nio
självtester, 44 kontrakt, bunten i synk. **Motprov:** tystnaden borttagen ur snapshoten ⇒ rött på rätt rad; `rimlig()` utan flaggan
⇒ rött. Driftsättningen och beviset ur driften redovisas på kortet och i §0b.

**I DRIFT 22/9, bevis:** `sql/030` körd med backfill (28 stationsdygn: 1106 tjugo, 2135 fyra, 2346 två, 1612 och 2132 ett — mätningens
fem, ingen annan), tysta med fristen 3 h just nu: 1106; livekörningen 60 ms. `sql/018` in via trendarkivet, driftvakten ENSE 5 767 = 5 767.
`sql/028`: `pg_proc` visar dygnsflaggan i `berakna_trendkandidater`, `uppspelning_efterhalka` och `langsam_vakt`. `ingest-live`
deployad 05:44:03Z — svaren 05:53–05:55Z bär *langsam_vakt: 1 stationsdygn*. `publicera` deployad 05:45:01Z — publiceringen 05:50:02Z
bär noten *"långsam vakt: 1 station(er) tysta, ytan ≥ 6 ° under luften ett helt dygn: 1106"* (05:30 och 05:40 saknar den), manifestets
sha = filens, 57 stationer, ingen av de sju, noll broar. Kort #236 stängt. Omkörning av formen efter första frostmånaden står i §0b.

## #301 (22/9 2026) Grannländerna i Supabase, Norge i skuggflottan, Danmark friat, gallringen får Danmark, gravstenarna och en tidsvakt (kort #238, #239, #240)

**Bengts order 22/9:** *"gör kort 238 och 239"*, sedan *"det är viktigt att de här körningarna inte tar actionsminuter för oss så det
ska ligga i supabase"*, och *"gör 240 efter 238 och stäng det när det är klart"*.

**#238 — Norge körs aldrig.** Utvärderingen av skuggflottan (samma dag) visade 20 norska rutter i koden och noll norska rader i loggen på
25 dygn. Orsak: ingen byggde `data/app/no/v1` (CDN 404) och inget cron-jobb anropade `land=no`; det norska arkivet var live (469
stationer). **Beslut:** grannländernas skuggsnapshot byggs i Supabase av `publicera?land=fi|no|dk|grannar` (snapshotkärnan,
`buildGrannSnapshot`: väder ≤ 3 °C eller snö, bara Accident — samma form och regel som de gamla byggarna), alla tre i EN commit
var 30:e minut (`halkvakt-publicera-grannar`, :05/:35), och `halkvakt-skuggmotor-no` (:25/:55). Jobben skapades med `replace()` ur
befintliga jobb inne i databasen, så nyckeln aldrig skrevs ut. Actions-steget för fi/dk och `build-snapshot-{fi,dk}.ts` togs bort;
`push-data.ts` behålls (RUNBOOK, planerad för QR-sidorna). **Alternativet som valdes bort:** Norges byggare i grannflödet på Actions
(PR #468, sammanslagen och tillbakadragen samma dag) — några sekunder på ett timjobb, men fel riktning: återkommande körningar tar
inga Actions-minuter. **Bevis:** publicera?land=grannar körde 09:35:00Z och 10:05:00Z (jobid 46, commit f9dbf12 och 136c0ef i kartrepot, cirka 6 s per varv): Norge 10 väderpunkter, Finland 1 väderpunkt och 1 olycka, Danmark 3 olyckor (körning 35714295337) · skuggmotor?land=no körde 09:55:00Z (jobid 47) och skuggloggen fick sina första norska rader: 3 varv på 3 rutter mot snapshoten 09:35, noll larm — efter 25 dygn med noll

**#239 — Danmarks olyckor, friat.** Hypotesen var att mappningen släppte vägarbeten som olycka. Mätt: ingesten släpper bara klassen
Accident till Olycka, byggaren publicerar bara Accident, de 200 danska olyckorna är "Uheld" som lever 0,8–1 dygn och raderas när
flödet släpper dem, snapshoten byggs om varje timme. Volymen (642 varningar) kommer av fem rutter genom Köpenhamn och olyckshorisonten
10 km. Ingen ändring. Samma sak väntar Stockholm när svenska rutter förtätas.

**#240 — gallringen.** Bengts fråga: har grannarna gallring som Sverige? Nej — Sverige tunnas till halvtimme efter sju dygn och raderas
aldrig; Finland raderar varma rader efter sju dygn och allt efter 60; Norge allt efter sju; Danmark inget. Mätt 22/9: databasen 190 MB
(169 den 18/9, ~4,5 MB/dygn netto), Danmark 1,3 MB, gravstenar i händelsetabellerna (Sverige 1 118 av 1 122, Danmark 986 av 1 055),
en rad med tidsstämpeln 1970-01-01 i det finska arkivet. **Beslut:** `sql/031` — Danmark får Norges regel; tidsstämplar före 2020
raderas i alla fyra väderarkiv; gravstenar raderade i 30 dygn tas bort ur alla länders händelsetabeller (situation-arkivet, som
uppspelningen läser, rörs inte; en sen radering skapar ändå aldrig en rad — raderingar är UPDATE). Sveriges, Finlands och Norges regler
orörda. `ingest/fi.ts` släpper inte in tom eller epoknoll-tid. **Bevis:** integrationstestet (Danmark, epoknoll, gravstenar i båda
tabellerna) i CI; i drift: sql/031 körd 22/9 (körning 35714435556): första körningen raderade 12 184 rader; Danmark 2 480 rader kvar, 0 äldre än sju dygn (äldsta 15/9); 0 rader före 2020 i något arkiv, 1970-raden borta; inga gravstenar äldre än 30 dygn ännu (regeln biter från 24/9, arkivet började 24/8); pg_proc bär Danmark, tidsvakten och gravstensregeln; databasen 190 MB tills autovacuum frigör

**Sagt högt:** databasen växer ~4,5 MB/dygn netto ⇒ 400 MB runt 9/11 och 500 MB (skrivskydd) runt 1/12. Pro-beslutet i §4.2 ("senast
1 november") håller, utan marginal. Bevakningsrad i §0b med veckovis mätning.

## #302 (22/9 2026) Drifträkningen räknar fönstren i ramar i stället för en lateral — sju dygn på 8,6 s (kort #235)

**Beslut (Bengts order 22/9: *"gör kort 235 och stäng det när det är klart"*).** `berakna_trendkandidater` (sql/018) räknar lutningens
fönster med fönsterfunktioner över stationens rader i tidsordning. Vilka rader som väljs och vilka tal som skrivs är oförändrat;
vakterna, trösklarna och tvillingen `publish/trenden.ts` är orörda.

**Varför.** Lateralen läste den materialiserade CTE:n `bas`, som saknar index, en gång per kandidatrad, så kostnaden växte med
kvadraten på arkivet. Sju dygn gick 13/9 på 118 054 rader och föll 22/9 på statement timeout vid 195 444. Driftvakten, det enda
beviset för att SQL och TypeScript väljer samma rader, kunde bara köras på ett dygn.

**Alternativ.** (a) Höja timeouten: döljer tillväxten, och arkivet växer. (b) En lateral mot tabellen med `(station_id,
sample_time)`-index: linjär, men hoppvaktens lag-kolumner måste räknas om per rad, alltså mer SQL för samma sak. (c) Driftvakten på
ett dygn för alltid: knappen skriver sju dygn, så vakten hade vaktat ett annat fönster än det som skrivs. (d) Fönsterfunktioner —
valt: en sortering per station och lateralens villkor ordagrant.

**Formen.** `RANGE BETWEEN interval 'N minutes' PRECEDING AND CURRENT ROW` är lateralens `b.sample_time >= r.sample_time − N` och
`<= r.sample_time`; primärnyckeln `(station_id, sample_time)` ger inga delade tider. Hoppvakten: hoppet bokförs på den tidigare raden i
paret (`lead` i stället för `lag`) och läses i en ram utan den egna raden (`EXCLUDE CURRENT ROW`). Då räknas varje hopp mellan två
rader i fönstret men inte hoppet in i det, som i lateralen. Ramarna räknas över hela `bas` innan kandidaterna filtreras.

**Bevis.** (1) Före incheckningen, bara läsande (körning 35729035969, `scripts/matningar/driftrakningen-ramar-2026-09-22.sql`, genererad
ur origin/main:s och grenens sql/018): 2 h — 9 rader efter vakterna, 0 skillnader; 1 dygn — 15 635 rader och 5 797 kandidater i båda,
0 skillnader i 14 kolumner åt båda hållen; livets fönster 0,01 s (lateralen) mot 0,00 s; sju dygn med ramarna 8,6 s (31 668 rader,
11 317 kandidater). (2) Integrationsprovet `#235` (hoppet in i fönstret räknas inte, hoppet inuti fäller lutningen) grönt mot
lateralen (körning 35729309079) och mot ramarna (35729454227), 144 prov, 0 överhoppade. (3) I drift: sql/018 körd 12:50Z (körning
35729702635), `pg_proc` bär `EXCLUDE CURRENT ROW` och inte `CROSS JOIN LATERAL`, livets anrop 0,01 s, ingest-lives svar 12:52Z
`0 nya, 0 utfall`. (4) Driftvakten 7 dygn från main (körning 35729913535): TypeScript 11 317, SQL 11 317, bara TypeScript 0, bara
SQL 0 — ENSE OM VARJE RAD, inga rader undantagna, knappsteget 10 s mot 605 s.

**Sagt högt.** Hoppvakten prövades inte av arkivets data (0 rader med hopp > 3 °C på dygnet), bara av integrationsprovet — därför
kördes provet mot båda formerna. En lokal commit `bffd225` med texten "Create driftrakningen-ramar-idrift-2026-09-22.sql" dök upp
på grenen 12:49:50Z, samma sekund som bevisfilen skrevs. Den pushades aldrig och ingår inte i PR #473; filen togs tillbaka ur den
och checkades in med stängningen. *(Förklarad 22/9: Bengt tryckte på Commit i GitHub Desktop av misstag — samma arbetsträd som
sessionen. Läxa: `git log` mot grenens väntade topp före varje push.)* Generatorn bakom mätfilen checkades in i efterhand
(`scripts/matningar/driftrakningen-ramar-generator-2026-09-22.py`, Bengts ja 22/9); den återskapar mätfilens satser byte för byte
ur `8a9eca9:sql/018` och main:s 018.

## #303 (22/9 2026) Kortavstämningen: 18 kort stängda med bevis, sju dubbletter sammanslagna — tavlan 94 → 69 öppna

**Beslut (Bengt 22/9: *"ja stäng de 18 och slå ihop paren"*).** Efter avstämningen av alla 94 öppna kort mot repot
(`docs/KORTAVSTAMNING-2026-09-22.md`, bedömningen §4.2) stängs de 18 vars bevis höll, och sju dubbletter slås ihop. Varje stängning
bär sitt bevis på kortet, och varje sammanslaget kort pekar på det kort som bär resten. Korten stängs på plats med `- [x]`, som
#100 och gallringsregeln tidigare; texten blir kvar och går att läsa. Sorteringen av de 25 korten i fel sektion (#224) görs separat.

**Varför.** Tavlan hade bara uppdaterats kort för kort sedan 20/9, och ingen hade prövat helheten. Kort som blivit klara i andra
varv stod kvar som öppna, och tre kort ställde samma fråga till Axel. En tavla där en femtedel av korten är gjorda ljuger om var
arbetet finns (TAVELREGELN: *"finns det inte på tavlan finns det inte"* gäller åt båda håll).

**Stängda (18):** Bengts egna händer i koden · #72 · #85 · #229 · #159 · #192 · #187 · #186 · #185 · #154 (regnfältet) ·
minutbantningen · #52 · #43 · #44 · varvloggen · #100 (en kvarglömd kopia av det stängda kortet) · designlyftet (med
underpunkterna #22–#24) · #194.

**Sammanslagna (7):** kort 6 *Tolv testare till väntelistan* → *Tolv testare till Play-perioden* · *Domänen halkvakt.se* →
*Skydda namnet: PRV + domänen* · #27 *Helgsamtalet* och *Rollfördelningen* → *Skyltfonden-paketet före 1/10* · #237 → *Samtal med
Axel: sensortrappan* · #81 → #42 · #51 → #209 · designlyftets #23 → #23 heads-up.

**Sagt högt.** (1) Två sammanslagningar gick åt andra hållet än i listan: domänkortet slogs in i *Skydda namnet* (inte tvärtom),
eftersom det bredare kortet också bär PRV-ansökan och inget då går förlorat. (2) #85 stängs fast den släpande takten var 118
min/dygn 19/9 mot kortets mål 100: kortets tre snitt är gjorda, och kassabevakningen till 1/10 bärs av #152 (prognos 31 av 35 USD).
(3) Bedömningens rader om Actions-kassan och Actions-kontot pekar nu på #152 i stället för #85; `radar_h`-raden i §0b bär sin egen
bevakning sedan #187 stängts. (4) Kvar ur avstämningen: fyra oklara kort (§4.2, frågor till Bengt och Axel), 0.3.9 (12) som bär
okompilerad #203-kod, och produktbokens rader 21 och 82 mot invarianten (#264).

## #304 (22/9 2026) Bengts svar ur kortavstämningen: två kort stängda, 0.3.9 höjs till (13), produktboken i linje med invarianten

**Beslut (Bengt 22/9: *"2 skickade stäng och 3 ja"* och *"kameravarningen är klar"*).**
(1) **#154 Byvindgivarna** stängs: anmälningarna är skickade. (2) **Kameravarningen i fel riktning** stängs: Bengt bekräftar att
den är klar; beviset är fältdomen Malmö–Boden (DECISIONS #102), som kortet aldrig tog upp. Tavlan 69 → 67 öppna.
(3) **`CURRENT_PROJECT_VERSION` 12 → 13** i `ios/HalkvaktApp/project.yml`, och **produktboken rad 21 och 82** säger nu samma sak
som invarianten (#264).

**Varför numret höjs.** 0.3.9 (12) sattes 20/9 17:37 (0451016), och förkontrollen gjordes på 90b5223 (17:42). Kort #203:s iOS-kod
kom 18:17 (eb81b50) utan ny höjning. DECISIONS #275 och arkiveringsinstruktionen säger att 0.3.9 *inte* bär #203 — men ett arkiv
från main gör det, med kod som aldrig kompilerats. Det är fällan från 0.3.7 (CLAUDE.md, 18/9): ett byggnummer som sätts före den
sista ändringen bevisar inte vilket bygge som är ute. #269 (*"#203 går i 0.3.9"*) och #275 säger emot varandra; det här rättar
läget, inte besluten. **Axels val (§4.2 (d)):** (a) arkivera från main som **(13)**, med #203 lager 1, där Xcode kompilerar #203 för
första gången; eller (b) den rena fixen som **(12)** från `90b5223`. Instruktionen på tavlan bär båda vägarna.

**Produktboken.** Rad 21 sa *"ingen position som lämnar telefonen"* och rad 82 *"att positionen aldrig lämnar telefonen"*.
Invarianten skrevs om 20/9, och regeln är att invarianten, Data Safety, integritet.html och produktboken ändras i samma commit;
produktboken kom inte med. Nu: *"ingen position lämnar telefonen av sig själv — det enda som någonsin skickas är betatestets
facitsvar, som du själv slår på"*, och rad 82 citerar introduktionens text ordagrant. Ingen apptext ändrad.

**Sagt högt.** (1) Samma löfte utan undantag står i iOS behörighetsruta (`project.yml` rad 47 och 50: *"Positionen lämnar aldrig
enheten"*). Introduktionen och Om säger undantaget; behörighetsrutan gör det inte. Det är en text användaren ser och Axels text
(#196), så den rördes inte — frågan står i §4.2 (d). (2) Höjningen gör inte #203:s iOS-kod kompilerad: ingen CI bygger iOS-appen
(ios-engine prövar bara Swift-motorn på Linux). Det första provet är Axels Xcode. (3) *"2 skickade"* tolkades som att anmälningarna
är skickade (fråga 1 i listan); datum och väg är inte angivna.

## #305 (22/9 2026) Tavlans sektioner sorterade: 22 kort flyttade dit nästa steg finns, Claude — olåst 7 kort (kort #224)

**Beslut (Bengt 22/9: *"sortera korten som står i fel sektion och lämna förslag på de 5 enklaste att slutföra"*).** Regeln är #224:s
egen: *Claude — olåst* betyder *"det här kan Claude börja på utan att vänta på någon"*. Ett kort som väntar på vädret, en händelse
eller en persons beslut innan Claude bygger står i *Claude — låst* med nyckeln utskriven. Ett kort där allt som återstår är en
persons handling eller beslut står i den personens sektion. Varje flyttat kort bär en rad om varför.

**Flyttat (22):** till *Claude — olåst* #203 (lager 2; Axels beslut är tagna) och välkomsttexten · till *Claude — låst* #228 (Axel vid
Macen), #209, #151, #103, #95, #46, #45 (frosten eller vintern), #152 (1/10), #32 (releasen), #21 (iOS-bygget ute), #153 (betan och S2) ·
till *Bengt* #233, #218, #198, #146 och Danmark-nyckeln · till *Axel — beslut att ta* #204, #156, #214 · till *Axel — därefter* #210.
**Kvar i Claude — olåst (7):** #226, #217, #219, #221, #160, #203, välkomsttexten. #224 stängs: dess Verify är uppfylld. Tavlan 67 → 66.

**Varför.** En sektion som ljuger gör tavlan obrukbar för planering: 20/9 gav *"vad kan göras nu"* svaret 32, när det rätta var 9.

**Sagt högt.** (1) Kontrollen var att inga rader försvann: flyttningen jämfördes rad för rad mot originalet, och de enda nya raderna
är de 22 förklaringsraderna. Diffen ser stor ut (cirka 900 rader) eftersom hela block flyttats. (2) Ett fel från DECISIONS #303
rättades på vägen: sammanslagningsraden för #81 hade hamnat efter avgränsaren `---` i slutet av *Claude — låst*. (3) Två kort i
*Claude — olåst* är gränsfall. #221 kräver Bengts eller Axels ja för ändringen i CLAUDE.md och grenraderingen, men arkivet och
motsägelserna kan göras nu. #219:s konto och uppladdning är Axels, men versionshöjningen och introduktionen på Android kan byggas
nu. (4) Kort som redan stod i *Claude — låst* men med föråldrad nyckeltext (#89, #90, #97) flyttades inte — sektionen är rätt, bara
nyckelns ordalydelse är gammal.

**De fem enklaste att slutföra** (§4.2): #160 (Claude, nu) · #146 (Bengts ja, sedan en commit) · #156 (Axels rad) · skinnet v3 på
Android (Axels skärmbild) · Billing (Axel, före 24/9).

## #306 (22/9 2026) Kort #146 och #160 stängda — Swifts byggutdata ur repot, måndagsserien bevisad

**Beslut (Bengt 22/9: *"ja gör 146 och kör 160"*).** Två av de fem enklaste korten i §4.2.

**#146 — Swifts byggutdata ur repot (PR #481, 0c2d92a).** `ios/HalkvaktEngine/.build/` bar 504 filer (27,6 MB) från en CI-körning,
incheckade av misstag i början av september. Nu borttagna ur git (`git rm -r --cached`) och mappen i `.gitignore`. Ingenting i repot
läser mappen: sökt utanför den, inga träffar; ios-engine bygger sina egna. **Före:** `git -c core.longpaths=false clone --depth 1` på
Bengts Windowsdator gav *"Filename too long"* och *"Clone succeeded, but checkout failed"* (djupaste sökvägen 291 tecken, gränsen
260). **Efter:** samma kloning av 0c2d92a går igenom, med 0 saknade filer. ci (35739390674) och ios-engine (35739390740) gröna på main.

**#160 — måndagsserien.** **(a)** 21/9 startade alla sju pulsjobb 1–45 s efter sin bokade minut, alla gröna, som `workflow_dispatch`
från pulsklockan: grind-a 05:40:43 · smhi-prov 06:00:01 · cell-matning-v3 06:20:01 · trv-bevakning 06:40:45 · hojd-prov 07:00:01 ·
grind-v-a 07:20:43 · grind-v-b 07:40:44 (`scripts/matningar/mandagsserien-2026-09-22.py`, läser bara GitHubs API). 14/9 kom samma
serie 5–7 timmar sent på naken cron. **(b)** `matvaktprov` 22/9 14:16Z (körning 35739124629): issue #482 med etiketten `matvakt`
öppnades 14:16:29Z med provraden och stängdes 15:07:04Z av nästa gröna timkörning. Fristen är fast 3 h (`MATVAKT_FRIST_H` i
vakthunden), så en utebliven måndag syns 3 h efter sin bokade tid i stället för efter 10,5 dygn. **(c)** i drift sedan 18/9 (#237):
*mätvakten: 12 schemalagda flöden (11 via pulsklockan)*.

**Sagt högt.** (1) Commitmeddelandet för #146 säger att filerna *"inte raderas från någons disk"*. Det gäller den som gör ändringen
(`--cached`), men en `git pull` på en annan dator tar bort de gamla byggfilerna ur arbetskopian. Det är ofarligt: nästa Swift-bygge
skapar dem igen, och de var värdelösa utanför maskinen som byggde dem. Här tog pullen bort dem ur Bengts arbetskopia. (2) Historiken
är oförändrad; en ny kloning laddar fortfarande ner filerna men packar inte ut dem. (3) Provet visar larmvägen, inte fristen själv.
Fristen är kod (kadens + 3 h), och det första verkliga provet är en måndag som uteblir. (4) På vägen syntes att vakthunden räknar
**1 riktigt facitsvar** (senast 21/9 22:13Z, 2 prov uteslutna). Kortavstämningen byggde på DECISIONS #267 (20/9: 0 riktiga).
Kort #21:s steg 5 kan alltså vara uppfyllt; en rad om det står på kortet. (5) `matvaktprov` kostade en dbknapp-körning (cirka en
minut); mätningen av måndagen läste bara API:t.

## #307 (22/9 2026) Snapshotens halkfilter får "mycket besvärligt" — servern släpper in allt motorn kan varna för (kort #156)

**Beslut (Bengt 22/9: *"gör b"*).** Frågan var ställd till Axel (kort #156, `docs/TILL-AXEL-HALKORDEN.md`): lämna luckan *"med flit"*
(DECISIONS #214) eller lägga till ordet. Bengt avgjorde den i Axels ställe och valde att lägga till. `publish/snapshot-core.ts`:s
filter är nu `(is|halka|halkrisk|halkig|halt|mycket besvärligt)|snö|frost`, samma ord som motorns `SLIPPERY_INFO` och samma stammar
som `SLIPPERY_STAM`.

**Varför.** Servern bestämmer vad motorn över huvud taget får se; motorn bestämmer vad som sägs. Servern måste då släppa in minst
allt motorn kan varna för. Före ändringen nådde ett segment med kod 1 och texten *"mycket besvärligt"* aldrig telefonen, fast motorn
skulle ha kallat det halt. #214:s skäl (texten kommer i praktiken med kod 3, som släpps in på koden) var rimligt, men 0 fall av 830
rader bevisar lite när arkivet saknar vinter. Ändringen kostar en rad och tar bort en lucka som annars bara vilar på ett antagande.

**Alternativ.** (a) Lämna som det var, med #214 som svar — förkastat av Bengt. (c) Vänta på vintern och mäta — förkastat, eftersom
en lucka som bara syns när den redan kostat en varning inte kan mätas i tid.

**Bevis.** Enhetsprovet (`test/snapshot-core.test.ts`) läser motorns ordlista och stammar och kräver att snapshotens filter bär
vartenda ord. Motprov: ordet bort ur filtret ⇒ just det provet faller (25 gröna, 1 fel), filen återställd. Integrationsprovet
mot PostGIS: kod 1 med *Mycket besvärligt* och *Halkigt* når live.json, *fläckvis Våt* och *Halkbekämpning* gör det inte. CI 146
gröna. 44 kontrakt håller (snapshot-core och bunten bär samma värde). publicera ombuntad, PR #484 (0bb2ae3), deployad 15:38Z från
main (körning 35748665010) efter `git diff origin/main` utan skillnad. Första live.json efter deployen: 15:40:01Z, manifestets sha
lika med filens (`scripts/matningar/halkfiltret-156-2026-09-22.py`).

**Sagt högt.** (1) Beslutet var märkt som Axels, eftersom det ändrar vad appen kan varna för. Bengt tog det; Axel ser det här och
på kortet. (2) I dag har live.json 0 halksegment alls — september — så ändringen syns först när vintern kommer. Deploybeviset visar
att funktionen kör den kod som ligger på main, inte att ordet redan släppt in något. (3) Produktboken rad 137 hade inte heller
*halkig*, som motorn talat på sedan 16/9; båda står nu med. (4) Vakthundens vinterkoll och kodgrinden ställer andra frågor och är
orörda, som brevet till Axel föreslog.

## #308 (22/9 2026) Kort 3 (Billing) stängs — Actions-förbrukningen bevakas genom mätning, inte genom avläsning

**Beslut (Bengt 22/9: *"du kan stänga billings. Den har vi koll på genom mätning"*).** Kort 3 (Axels skärmklipp av Settings → Billing)
och §4.2-raden *Actions-kontot* (Axel, före 24/9) stängs. Bevakningen av Actions-taket till 1/10 bärs av kassavakten (#152,
vakthundens check 8, räknar fyra gånger om dygnet) och av §0b-raden *Actions-taket i september*.

**Sagt högt.** Kortets skäl var att kassavakten bara ser Halkvakts körningar, medan taket på 35 USD gäller hela Axels konto. Andra
repon på kontot syns alltså inte i mätningen. Bengts bedömning är att det är tillräckligt; skulle taket slå i ser vakthunden det som
stoppade körningar. Tavlan 63 → 62 öppna.

## #309 (22/9 2026) Tre kort stängda på Bengts ja: Norden efter facit, #16 Nowcast och guiden med bilder + film

**Beslut (Bengt 22/9: *"stäng 3, 4 och 5"*, ur förslaget *Fem nya att slutföra* i §4.2).**
(3) **Norden efter facit** stängs som dubblett: arkivdelen är klar (FI, NO och DK i arkivet; Norge i skuggflottan och grannsnapshoten
i Supabase sedan 22/9, DECISIONS #301), och produktdelen står ordagrant som Ä7 i bedömningen.
(4) **#16 Blixthalke-prognos (MET Nowcast)** stängs: kortets form, en prognos som varnar, krockar med regel T6 (TROSKLAR-KOMBINATIONEN,
fastställd 17/9, DECISIONS #220/#226 — prognoser får aldrig ensamma utlösa). Idén förs som en rad till #233:s *före resan*-vy, där en
prognos får visas men inte talas. Ä7 bär nu bara Nordenprodukten.
(5) **Guiden med bilder + film** stryks: sedan DECISIONS #38/#40 är Siri och självväckningen huvudvägen och Genvägar valfritt.

**Sagt högt.** Guidens råmaterial (Axels inspelningar 31/8) finns kvar om behovet kommer tillbaka; ingen film raderad. #16 var
Axels idé i ordningen *efter kö-slut*; Bengt stänger den, och idén är flyttad, inte borta. Tavlan 62 → 59 öppna.

## #310 (22/9 2026) Sensortrappans steg 2 tidsätts till våren 2027 — telefonkedjan avgörs i samma prövning

**Beslut (Bengt 22/9: *"stäng den med våren 2027 som beslut"*).** Kortet *Samtal med Axel: sensortrappan* stängs med tiden satt:
**steg 2 i sensortrappan** (synergianalysen 27/8 — telefonens egna sensorer som egen datamängd, bara opt-in) **prövas våren 2027**,
efter vinterns domar. **Telefonkedjan (#237)**, bil 1:s telefon som varnar bil 2, avgörs i samma prövning: byggs, avvisas eller blir
en del av #21. Frågan bärs av **Ä8** i bedömningens §3, så den kommer tillbaka i mars.

**Varför nu och inte i ett samtal.** Tiden var i praktiken redan satt: Axel beslutade 28/8 att v1 lanseras utan datainsamling och
att sensortrappan är strategi, inte MVP, med sensorspåret som eget opt-in-beslut *tidigast våren 2027*; SYSTEM.md säger *"samtalet
våren 2027, inte före"*. Ett kort som väntar på att någon ska bekräfta en tid som redan står i tre dokument är ett kort som ljuger om
att något återstår nu.

**Sagt högt.** Steg 2 krockar med invarianten (ingen position lämnar telefonen automatiskt, DECISIONS #264); prövningen i vår måste
ändra invarianten, Data Safety, integritet.html och produktboken i samma commit om den säger ja. Axel var part i kortets namn; beslutet
följer hans egen ordning från 28/8. Tavlan 59 → 58 öppna.

## #311 (22/9 2026) Tre framtidskort stängs och tas upp våren 2027: skolpaketet som produkt, dess material och Danmarks NAP-nyckel

**Beslut (Bengt 22/9: *"lägg B2B skolpaketet, skolpaketets material och Danmark som stäng och ta upp våren 2027"*).** Tre av de nio
framtidskorten i §4.2 stängs, och frågorna bärs av bedömningens vårlista i stället för tavlan:
- **B2B: skolpaketet som produkt** och **#26 skolpaketets material** (QR-blad, manus, checklista) → raden *Efter mars*: säljs våren
  2027 med halkbanedata.
- **Danmarks NAP-nyckel** → Ä7 under Nordenprodukten: registreras av Bengt och `ingest/dk.ts` läggs om före dansk produktion,
  tidigast 2027/28.

**Villkor.** #26 kan behövas tidigare: beviljar Skyltfonden ansökan med trafikskolorna (besked senast 15/12) öppnas kortet igen.
Villkoret står i bedömningens decemberrad, så att det syns när beskedet kommer.

**Sagt högt.** De övriga sex framtidskorten (#15, #32, #91, #96, #153, betalviljan) och gränsfallen står kvar öppna, eftersom Bengt
valde ut tre. Tavlan 58 → 55 öppna.

## #312 (22/9 2026) Samarbetena #94 stängs; QR-sidan per skola (#204) blir en vårfråga

**Beslut (Bengt 22/9: *"du kan stänga samarbetena 94 också och göra qr sidan till en vårfråga"*).**
- **#94 Samarbeten vi inte prövat** stängs. NTF-delen bärs av Skyltfondsrundan, där samtalen pågår 21–25/9; åkerierna ströks ur
  rundan (DECISIONS #215) och försäkringsbolagen tidigare. Inget möte bokas nu.
- **#204 Skolans namn på QR-sidan** stängs som kort och tas upp våren 2027 i bedömningens rad *Efter mars*, bredvid skolpaketet.
  Underlaget (`docs/QR-SIDA-PER-SKOLA.md`, Axels sju beslut i §6) ligger kvar. §0b-raden struken.

**Sagt högt.** (1) Åkeri- och bussbolagsspåret bärs inte längre av något kort; det finns kvar i DECISIONS #94 och i det stängda kortet.
(2) Domänen halkvakt.se krävdes före tryck av QR-bladet. Med QR-sidan på våren är domänen mindre bråttom, men kortet *Skydda namnet:
PRV + domänen* står kvar öppet. Tavlan 55 → 53 öppna.

## #313 (22/9 2026) Kort #27 asc-CLI:t stängs

**Beslut (Bengt 22/9: *"asc cli kan du stänga"*).** Kortet om App Store Connect-kommandoradsverktyget (en uppladdning till TestFlight i
ett kommando, och testarfeedback hämtad av CI) stängs. Det är ett bekvämlighetsverktyg som ingen bett om sedan 31/8, och uppladdning via
Xcodes Organizer fungerar. Idén står kvar i BACKLOG.md punkt 27. Tavlan 53 → 52 öppna.

## #314 (22/9 2026) Live Activity och startknappen på låsskärmen stängs

**Beslut (Bengt 22/9: *"stäng live activity och startknappen också"*).** Två iOS-kort från Axels höstlista stängs utan att byggas:
**Live Activity** (varningskortet i Dynamic Island och på låsskärmen) och **startknappen** (widget på låsskärmen, knapp i Kontrollcenter,
åtgärdsknappen). Inget av dem är byggt (ingen ActivityKit, WidgetKit eller ControlWidget i ios/), och produktboken lovar inget av dem.
Vakten startas redan av självväckningen och Siri (DECISIONS #38/#40).

**Sagt högt.** Båda var Axels idéer (31/8), och startknappen var beställd i DECISIONS #38/#39(3). Designen för Live Activity ligger kvar i
`docs/design/Halkvakt-Live-Activity.dc.html`. Tavlan 52 → 50 öppna.

## #315 (22/9 2026) #15 kö-slut och #32 hinder stängs som kort och öppnas våren 2027

**Beslut (Bengt 22/9: *"stäng 15 och 32 också men öppna våren 2027"*).** Kort **#15 Kö-slutsmotorn** (TrafficFlow: *"Kö framför dig,
bromsa lugnt"*, Bengts idé, faktatestad 26/8) och **#32 Hindren in i rösten** (först djur på vägbanan) stängs på tavlan. Ä3 i bedömningens
§3 bär dem och säger nu **våren 2027** i stället för *efter release*.

**Sagt högt.** Inget arbete går förlorat: #15:s villkor står i BACKLOG.md punkt 15, och #32:s underlag samlas redan i arkivet
(`AnimalPresenceObstruction` arkiveras, rösten talar bara om olyckor). Att vidga filtret släpper in vägarbeten, som DECISIONS #5
stängde ute; rösttexten för hinder är Axels beslut. Tavlan 50 → 48 öppna.

## #316 (22/9 2026) Djur på vägen: Trafikverket publicerar inom två minuter, polisen publicerar nästan inget — underlag för #32

**Fråga (Bengt 22/9):** hur snabbt rapporterar Trafikverket djur på vägen, var rapporteras det, och är polisen snabbare för samma händelse?

**Var.** Trafikverket publicerar öppet, inte bara internt: i sitt öppna API (som ingest-live läser varje minut) och på trafikverket.se
under Trafikinformation → Textmeddelanden, läst 22/9: t.ex. *"Djur på vägen - E18 … En hjort rör sig i närheten av körbanan. Starttid
18:37"*, uppdaterad 18:39.

**Mätt (körning 35757322550, `scripts/matningar/djur-trv-mot-polisen-2026-09-22.sql`, 14 dygn):**
- **Trafikverket, djur på vägen:** 480 händelser (~34/dygn). Hos oss median **1,8 min** efter Trafikverkets starttid, p90 3,0 min,
  0 över 30 min. Giltiga i median 72 min. **437 av 480 (91 %) namnger djurslaget** (älg, hjort, rådjur …); 474 har vägnummer.
- **Polisen, "Trafikolycka, vilt":** bara **11** händelser på 14 dygn, 6 med vägnummer. Samma nivå som i augusti (5 i veckan), alltså
  polisens urval och inte ett fel hos oss. Polisen anger länets mittpunkt, inte platsen (DECISIONS #13).
- **Samma händelse:** ett par gick att para ihop (samma väg, inom 150 km och 3 h). Där var Trafikverket först, 45 min före polisen.

**Slutsats för #32 (Ä3, våren 2027).** Trafikverkets flöde är det enda som duger för en varning: snabbt, med riktig position och
djurslaget i texten. Polisen rapporterar krockar som redan hänt och publicerar för få. Djurslaget i Trafikverkets text öppnar för en
röst som säger vad datan bär (*"Älg på vägen framöver"*), till skillnad från viltrösten ur polisens data (#266).

**Sagt högt.** (1) 1,8 min mäter från Trafikverkets starttid, som är när händelsen lades in — inte när djuret kom ut på vägen; den
tiden syns i ingen källa. (2) Ett enda par säger inget statistiskt om vem som är snabbast; det som väger är att polisen har 11
händelser mot 480. (3) Polisen hämtas en gång i timmen, så deras tid till oss (median 24,5 min) är inte jämförbar och används inte.


## #317 (22/9 2026) 0.3.9 arkiveras som den rena fixen (12) från `90b5223`; behörighetsrutans text rättas i main och följer med (13)

**Frågan (§4.2 (d), DECISIONS #304).** Axel lämnade de två frågorna till Claude 22/9 kväll: *"fråga din code om detta ska göras och kör
den i så fall klar"*.

**(1) Väg (b): 0.3.9 (12) från `90b5223`.** Skälen, i vikt: (i) bygget finns för att bevisa EN rad (#273, släckt skärm på *när appen
används*) — #275 säger det ordagrant, och provet är bara tolkningsbart om inget annat rör sig. #203 lager 1 rör just det som provet
tittar på: en ny notisdelegat, `willPresent`, `GuardManager` och talvägen i `SpeechService`. Blir det tyst på väg (a) vet ingen om det
är #273 som inte håller eller #203 som tystat något. (ii) #203:s iOS-kod har aldrig kompilerats; faller den i Xcode står releasen
stilla i kväll för en funktion som inte är det kvällen gäller. (iii) Förkontrollen (ci, ios-engine) gjordes på exakt `90b5223`, och
ett arkiv från den commiten är det enda som bevisar vilket bygge som är ute — läxan från 0.3.7 och #304. (12) är inte uppladdat,
så numret är ledigt. **(13) blir nästa bygge från main** och bär #203 lager 1 + texterna nedan; där kompileras #203 första gången,
med ett eget prov.
Taggen `ios-0.3.9-12` sitter på `90b5223` så steget blir `git checkout ios-0.3.9-12` i stället för ett hash att skriva av.

**(2) Behörighetsrutan: ja, rättas — i main, inte i (12).** Texterna var osanna på två sätt, inte ett: (a) *"Positionen lämnar
aldrig enheten"* utan betatestets undantag bryter invarianten (#264), medan introduktionen och Om säger undantaget; (b) *"Med
"Alltid" kan vakten varna även när skärmen är släckt"* är fel sedan #273 — släckt skärm fungerar på *Vid användning*, och Alltid
behövs bara för självstarten. Samma fel (b) stod i introduktionens sida två, i en kommentar i `GuardManager` och i produktbokens
rad 85–86; alla rättade i samma commit. Formuleringen följer produktbokens rad 21 (#304) ordagrant, så appen, rutan och boken
säger samma mening.

**Skärmbilden: inte i samma commit, och skälet är mekaniskt.** Produktboksregeln tar skärmbilder ur fotostudions artefakt, och
fotostudion är Android-CI; iOS egen behörighetsruta är en systemdialog som ingen fotostudio kan fotografera, och inget CI bygger
iOS-appen. Rutans text står i stället ordagrant i produktboken, och skärmbilden tas ur första bygget som bär den — 0.3.9 (13).

**Sagt högt.** (1) Texten *"även med släckt skärm"* vilar på #273, som är byggd men ännu inte hörd på en resa. Faller (12):s prov
(a) ska texten backas i samma varv som fixen lagas. (2) `docs/PLAY-BACKGROUND-LOCATION.md` rad 26 säger fortfarande *"Positionen
lämnar aldrig enheten"* — det är Play-deklarationen, inte en app-text, och den rättas med Data Safety före första uppladdningen
till Google, inte här. (3) Swift-ändringen är en strängliteral; den är inte kompilerad förrän (13) byggs.

## #318 (22/9 2026) Viltvarningen byts: Trafikverkets *djur på vägen* ersätter polisens länspunkter — A–D byggt i ett (kort #241)

**Beställningen.** Axel 22/9 kväll: *"Vi byter ut polisens viltvarning mot Trafikverkets. Trafikverket lämnar 10 ggr så många o på
rätt plats … vi gör detta också, sen gör vi en deploy"* — alltså ja till skissen (`docs/SKISS-VILT-TRAFIKVERKET-2026-09-22.md`) och
till att bygga A–D nu. De två öppna frågorna togs enligt skissens rekommendation: **texten exakt #266**, *"Viltrisk framöver."*,
utan art; **punkten**, inte sträckan.

**Steg 0, mätt först** (dbknapp, körning 35778427029, bara läsande): **487** djurhändelser på 14 dygn (~35/dygn), **alla** med punkt
och sluttid, median giltighet **73 min**. **33 (7 %)** beskriver en sträcka (*"mellan Sävsjö och Vrigstad"*) — där ligger punkten vid
ena änden; det räcker inte för att bygga sträcklogik nu. Fritexten bekräftar arten i de flesta, men visar också något skissen inte
sa: **tamdjur ingår** — *"Flertalet lösa kor på vägen"*, *"En fårskock i närheten av körbanan"*, *"Ko i vägområdet"*. Rösten säger
*"Viltrisk"* också då. Det är fel ord men rätt varning (ett djur på vägen är samma fara för föraren), och det är skälet att artbeslutet
är Axels och kommer senare.

**Byggt:**
- **A. Hämtningen.** `AnimalPresenceObstruction` i `KEEP` i ingest-live och i spegeln `ingest/sources/situations.ts`. Djuren ligger
  nu i `deviations`, så Trafikverkets radering släcker dem — arkivet ser aldrig en radering, och utan det här hade en bortplockad älg
  varnat till sluttiden.
- **B. Snapshoten.** Olycksfrågan får `message_type_value = 'Accident'` (samma rad som grannarna), annars hade en älg sagts som
  *"olycka"*. Ny nyckel **`djur`** `[{id, lon, lat, art, slut}]`; **`wildlife` publiceras tom** — polisens fråga borttagen. Kartans
  olyckslager fick samma Accident-rad (`publish/map-core.ts`), annars hade älgarna ritats som olyckor.
- **C. Motorn.** Texten *"Viltrisk framöver."* i TS, Kotlin och Swift; v13 omgenererad till den; ny **v37** (djur framför talar t=38
  vid 655 m med 11 m marginal åt båda håll, djur bakom tiger). Parsrarna (`engine/src/snapshot.ts`, `SnapshotRepo.kt`,
  `SnapshotRepo.swift`) läser `djur` som viltfara med id `djur:<id>`. Skuggmotorn och publicera buntade om.
- **Åldersvakten** (fynd under bygget, inte i skissen): vilt räknades som *statiskt* och överlevde gammal data för evigt — rätt för
  en olycksplatsstatistik, fel för ett djur som står där nu. Viltfaror åldras nu som olyckorna (120 min) på båda plattformarna; test
  i `AgeGateTest`.
- **D. Visningen.** Android: *"Djur rapporterat på vägen"*, källan *"Trafikverket · läget nu"*, inställningen *"Djur på vägen enligt
  Trafikverket"*; iOS samma inställningstext. Polisen struken ur attributionen i båda apparna — ingen polisdata når appen längre.
  Produktboken: rösttabellen, attributionen och dataflödet.

**Ingen prioritet, inget ledavstånd, ingen dämpning ändrad.** Invarianten, Data Safety och integritetssidan orörda — inget nytt lämnar
telefonen.

**Övergången, som skissen lovade:** gamla appar läser bara `wildlife`, som är tom ⇒ tysta för vilt (DECISIONS #13 uppfylld igen).
Nya appar (Android efter CI, iOS i 0.3.9 (13)) läser `djur`. Skuggflottan talar på djuren direkt efter deployen.

**Sagt högt.** (1) Det här gör djurhalvan av #32 nu, trots att kortet stängdes till våren (#315); övriga hinder och #15 ligger kvar.
(2) Rader som fanns i arkivet före deployen kommer in i `deviations` först när Trafikverket ändrar dem; med median 73 min är det
borta inom en timme eller två. (3) Android-versionen höjdes inte: inget har laddats upp till Play än, och testarna får APK:n ur CI.
(4) `polisen_events` samlas fortfarande in till arkivet; bara appens väg är stängd.

## #319 (23/9 2026) TROSKLAR-SKUGGAN §4 rättad mot regel T: prognosen blir karta och förstärkare, aldrig röst ensam (kort #198)

**Beslut (Bengt 23/9: *"ja anta förslaget med B3-meningen i raden"*).** §4 i `docs/TROSKLAR-SKUGGAN.md` ändras enligt
`docs/SKUGGAN-PAR4-MOT-REGEL-T.md` §4: **(a)** klarar segmentprognosen A + B + C blir den ett kartlager (trenivåmärkt,
"risk"-språk) som får stärka, försvaga eller förlänga en varning som vilar på en mätning — **den utlöser aldrig röst ensam**;
**(b)** nära ankare talar den bara om **både** bandet är godkänt **och** T1–T2 uppfyllda, alltså en namngiven mätning som på
varningens plats och inom utfallsfönstret kan visa att tillståndet inte rådde; **(c)** orörd. **B3-meningen:** en B3-träff är
att prognosen visade rätt på kartan eller förlängde/stärkte en mätt varning — inte att den talade där punktmotorn teg; talet
i B3 är oförändrat. Grind A, B och C oförändrade.

**Varför.** §4 (1/9) lät ett modellerat värde starta rösten. Regel T (16–17/9, DECISIONS #220/#226) förbjuder det och nämner
offsetmodellen vid namn (T3), och regeln får skärpas men aldrig mjukas upp, oavsett signaturer (TROSKLAR-KOMBINATIONEN §10).
Två fastställda dokument sa emot varandra; det här är rättelsen av det svagare. Skärpning enligt §5 — en rad från Bengt, som
äger mätningen; ingen kontrasignatur. Gjord nu, före prognosens första skuggkörning (#38b steg 4, oktober), så att vintern
loggas under ett dokument som stämmer.

**Alternativ.** Vänta till mars (kortets frist): risk att röstvägen byggs på en text som inte får användas. Stryka (b) helt:
enklare men oåterkalleligt (att öppna igen vore en lättnad). Valt: förslaget som det står, med B3-meningen.

**Vad som inte ändras.** Produktionsmotorn, skuggmotorn (flottan), skuggreglerna, #153 beslut 2 (styrs av T5), #103
frysklassningen (konfidenshöjare), något i TROSKLAR-KOMBINATIONEN.

**Sagt högt.** (1) (b) kan visa sig nästan tom: ett vittne på platsen är i praktiken en station inom några kilometer, och då
är stationens mätning redan utlösaren. Prognosens värde blir försprång, längd och karttäckning. (2) Ingen kod ändras:
prognoskolumnen är inte byggd. (3) Genomlysningen ligger på Bengts skrivbord (`Halkvakt-198-genomlysning-2026-09-23.md`) och
underlagets §7 bär tilläggen. Tavlan 49 → 48 öppna.


## #320 (23/9 2026) Halkvakt till App Store: iOS först, 0.3.9 (13) är kandidaten, ingen näringsidkare — och integritetspolicyn rättad

**Axels svar 23/9 kväll** på frågorna i dokumentet *Halkvakt till App Store*:
(1) **Kontakt** för supportsidan och granskningen: axel.lagerlof.45@gmail.com.
(2) **EU:s näringsidkarstatus (DSA): inte näringsidkare** — gratisapp utan verksamhet bakom; adress och telefon visas då inte i butiken.
(3) **iOS släpps före Android.** Det ändrar DECISIONS #23 (samtidig lansering). Android följer när Googles stängda test (12 testare,
14 dygn) är klart.
(4) **Versionsnumret spelar ingen roll** — butiken visar 0.3.9. Kandidaten är **0.3.9 (13)**, uppladdad 23/9 20:53, efter en provresa.

**Gjort samma kväll (halkvakt-karta a2b7981, live efter Pages-bygget 88f5dfd):**
- **`integritet.html` omskriven** — den gamla sa *"Vi samlar in: ingenting"*, osant sedan facitsvaret 16/9, och #264 krävde att sidan
  ändrades i samma commit som invarianten; det blev aldrig gjort. Nu: ingen position lämnar telefonen av sig själv; undantaget
  betatestets facitsvar, med vad det bär (varnings-id, klockslag, svar, plattform, version) och vad det inte bär. Polisen struken
  som källa (#318), Androids behörigheter märkta som Android, utgivare och kontakt utskrivna. Gäller från 2026-09-23.
- **Ny `support.html`** (Hjälp & kontakt) — App Store Connects support-URL.
- `om.html` (appens *Om appen*-länk) och `index.html` sa också *"positionen lämnar aldrig telefonen"* och nämnde Polisen; i linje nu.

**App Privacy-etiketten:** Coarse Location + Product Interaction, inte kopplat till identitet, ingen spårning, ändamål App
Functionality + Analytics. Integritetsmanifestet i bygge 13 deklarerar bara Coarse Location; Product Interaction läggs till i nästa
bygge.

**Sagt högt.** (1) Policyn lovar ingen lagringstid för facitsvaren — ingen är beslutad. Det är Axels fråga när betatestet avslutas.
(2) Butikstexten för Play (`marknadsforing/butik/butikstext.md`) nämner fortfarande Polisen; rättas före Play-uppladdningen.

## #321 (23/9 2026) Grind A dömd: KLARAD — offsetmodellen håller vid stationerna (kort #38b steg 3)

**Beslut (Bengt 23/9: *"Döm grind A"*).** Grind A i `docs/TROSKLAR-SKUGGAN.md` §3 är **KLARAD**. Domen fälls på körningen 22/9
04:49Z med radvakten och karantänen (DECISIONS #298/#299): 711 stationer, 202 087 avläsningar, 7 356 punkter — **A1 0,71 °C**
(krav ≤ 1,0), **A2 3,5 % ± 0,4** (krav ≤ 5; marginalvaktens övre gräns 3,9), **A3 0,0 %** (krav ≤ 10). Måndagskörningen 21/9 utan
vakterna säger samma sak: A1 0,75, A2 3,8 ± 0,5, A3 0,3 på 5 745 punkter. Underlagsvakten (≥ 500 punkter, ≥ 20 stationer) och
marginalvakten (DECISIONS #126) är uppfyllda. Felet stiger monotont med ankaravståndet, som fysiken säger.

**Varför nu.** Talen har stått i två läsningar sedan 22/9, Axel har redan sagt att grind A står (bedömningen §4.1), och steg 4
(DECISIONS #322) förutsätter en dom. Historiken: 1/9 INGEN DOM (57 punkter); 12/9 FALLEN i rubriken men INGEN DOM med vakterna
(#119/#129/#131, A2 5,1 % ± 1,0); 21–22/9 KLARAD.

**Alternativ.** Vänta på Axels formella rad — Axel fäller marsdomen (§4, §6), men grind A är byggets förgrind och Bengt äger
mätningen; Axel ser domen här. Förlängd mätning — underlaget är fjorton gånger vaktens golv, det finns inget att vänta på.

**Vad domen säger, och inte.** Den gäller leave-one-out vid stationerna, där en offset kan läras ur stationens egen historik: det
är modellens tak. En vägpunkt mellan stationerna har ingen historik (kort #38b, raden 23/9); vad vägen får döms av grind B och C i
mars. Ingen röst, inget till användaren: §4 (DECISIONS #319) gäller. Måndagsserien fortsätter som bevakning; faller ett mått på
vinterdata tas det upp i bedömningen §4.2 — domen är fälld på höstdata (60 dygn, yta ≤ +5 °C).

## #322 (23/9 2026) Novemberbeslutet: segmentmotorn byggs i skugga i vinter (kort #38b steg 4)

**Beslut (Bengt 23/9: *"gör novemberbeslutet nu"*).** Segmentmotorn (offsetmodell + ankarklippning, TROSKLAR-SKUGGAN §1) byggs i
**strikt skugga** den här vintern: en prognoskolumn i `shadow_log`, buntad ur `engine/src` som allt annat (DECISIONS #43/#51),
körd på skuggrutterna från mitten av oktober när halkan kommer till Skåne. Ungefär tre veckors bygge. Varje segment loggas
uppmätt / modellerat / okänt. Inget når användaren — ingen röst, ingen karta — före domen i mars 2027 (§4, DECISIONS #319).

**Villkor före bygget (delsteg 4a).** Hur offseten når en vägpunkt utan historik (rå avståndsviktning, offset interpolerad ur
grannparen, eller terrängkorrigerad) ska stå i TROSKLAR-SKUGGAN innan första raden kod skrivs. Annars loggar vintern rå-modellen
(1,65 °C mot offsetens 1,06 i höjdprovet 12/9) och grind B mäter något annat än grind A godkände. Claude skriver förslaget;
Bengts rad enligt §5.

**Varför.** Grind A är klarad (DECISIONS #321). Skugga kostar ingen risk för förare, ingen ny tjänst och inga Actions-minuter
(skuggmotorn kör redan i Supabase) — bara arbete och Bengts söndagsläsning. Skjuts bygget till 2027/28 förloras en hel vinters
facit, och kartlagret kommer tidigast 2028/29. Frågan ställdes 12/9 när A2 var oavgjord; sedan 22/9 är den avgjord med marginal.

**Alternativ som valdes bort.** Skjuta till 2027/28 (vintern förlorad). Bygga direkt mot appen (förbjudet av regel T och §4).
Vänta på Axels novemberrad: kortet sa att sekvenseringen mot lanseringen är Axels. Bengt fattade beslutet att bygga; Axel äger
fortfarande NÄR i förhållande till App Store-lanseringen (DECISIONS #320) — flyttar lanseringen bygget säger han till, annars
står starten. Raden står i bedömningen §4.2.

**Vad det inte är.** Ingen prognos bortom två timmar, ingen blixthalka (#16), ingen ersättning för SMHI, inga nya trösklar.
Höjden (#96) och kallplatslagret (#91) läggs in bara om vinterdata ger dem en rad (#96) eller de förklarar residualer (#91).

**Sagt högt.** (1) Skuggmotorns körtid med prognoskolumnen är inte mätt; den mäts efter första varvet och skrivs på kortet.
(2) Bengts söndagsrutin får en kolumn till att läsa. (3) Byggnumret och deployen följer bundle-läxan: bunta, `--check` i CI,
deploya, bevisa med en rad MED innehåll i `shadow_log`.

## #323 (23/9 2026) Vägpunktsgrinden före bygget, och holdout-stationer på skuggrutterna (kort #38b delsteg 4b, 4c)

**Beslut (Bengt 23/9: *"ja till ändringarna. kör på"*, på Claudes bedömning av planen).** Två skärpningar av segmentmotorns plan:
1. **Vägpunktsgrinden (4b).** Grind A:s tre mått, trösklar, underlags- och marginalvakt prövas mot arkivet en gång till — men på
   kandidater som INTE får låna målets egen historik: rå avståndsviktning, offset interpolerad ur grannparen, höjdkorrigerad.
   Grinden öppnar om minst en kandidat klarar A1–A3; den kandidaten är svaret på 4a (offsetens väg till vägpunkten). Öppnar den
   inte byggs ingen skuggkörning i oktober (DECISIONS #322). Provet bor i `scripts/hojd-prov.ts`, som redan räknade två av
   kandidaterna, och går på måndagsklockan utan nya Actions-minuter. Första körningen på knapp i dag.
2. **Holdout-stationer (4c).** Skuggrutterna ska ha stationer mitt på sträckan som hålls utanför modellen: prognosen för platsen
   räknas ur grannarna, facit är stationens egen mätning. Det ger vägen en domare hela vintern (TROSKLAR-SKUGGAN §2: bara en
   station eller en testarlogg får fälla) och grind C sina händelser.

**Varför.** Grind A dömde taket (DECISIONS #321): vid en station lärs offseten ur stationens egen historik, en vägpunkt har ingen.
Byggplanens "gratis tidiga nej" (DECISIONS #51) krävdes för stationerna men aldrig för vägen. Och facit mellan stationerna är tunt
av samma skäl som problemet finns; utan holdouts kan mars sluta i "obedömbar" och fortsatt skugga utan att någon vet mer än nu.

**Mätt i dag** (`scripts/matningar/holdout-kandidater-2026-09-23.ts`: CDN-stationerna mot skuggmotorns rutter, station ≤ 5 km
från linjen, band = avstånd till närmaste ANDRA station, alltså det band platsen hamnar i när stationen tas bort):

| | på rutterna | 0–7 km | 7–15 km | 15–20 km | > 20 km |
| :-- | --: | --: | --: | --: | --: |
| Sverige, 20 rutter | 227 | 133 | 79 | 11 | 4 |
| Finland, 20 rutter | 246 | 166 | 40 | 19 | 21 |

**Nittio svenska stationer** på rutterna hamnar i 7–20 km-banden — där prognosen ska bevisa sig. Flest på E4 Helsingborg→Jönköping
(10), Rv70 Enköping→Mora (8), E6 Halmstad→Göteborg och E4 Gävle→Sundsvall (7 var). **Avvikelse:** E4 Umeå→Luleå fick noll
stationer inom 5 km — rutten är fyra brytpunkter på 218 km, så den riktiga vägen ligger längre från linjen. Talen är en undre gräns.

**Vad det inte ändrar.** Grind A:s dom, trösklarna i TROSKLAR-SKUGGAN (4b är en grind till med samma tal — en skärpning enligt §5),
grind B och C, §4. Höjden (#96) och kallplatslagret (#91) är fortsatt villkorade grenar. Trösklarna och domspärren finns nu i två
filer och vaktas av fem nya kontrakt i `scripts/kontraktsgrinden.ts` (49 kontrakt).

**Sagt högt.** (1) Interpolationskandidaten viktar målets grannar med 1/km² från målet, inte 1/km som grind A:s grannvikt:
självtestet visade att 1/km gav stationer 20 km bort en tredjedel av vikten och drog offseten fel. Ett val i provet, inte en
tröskel. (2) Två kandidater hade tal redan 12/9: rå 1,65 °C och rå+höjd 1,65 °C, båda över A1. Grinden hänger på
interpolationen. (3) Holdout-urvalet — vilka stationer, hur de tas ur modellen — görs i bygget och skrivs in i
tröskeldokumentet tillsammans med 4a. (4) Självtestet "två byar": rå 0,111 °C → interp 0,007 °C på 1 040 punkter.

## #324 (23/9 2026) Vägpunktsgrinden ÖPPEN: rå avståndsviktning, ingen offset, är prognosens väg till vägpunkten (kort #38b 4a/4b)

**Utfall (två körningar 23/9 på Bengts "kör på", DECISIONS #323).** Grind A:s tre mått på kandidater som inte får låna målets
egen historik, 60 dygn, samma leave-one-out som grind A.

| Körning | Population | RÅ | INTERP | RÅ+HÖJD | OFFSET (taket) |
| :-- | :-- | :-- | :-- | :-- | --: |
| 20:20Z (35915159831) | **utan** vakterna: 768 stationer, 8 432 p | 1,11 °C · 9,1 % · 3,1 % ⇒ FALLER | 1,42 · 17,7 % · 4,5 % ⇒ FALLER | 1,16 · 10,1 % · 3,1 % ⇒ FALLER | 0,86 °C |
| 20:25Z (35915703198) | **med** #75, radvakten, karantänen: 712 stationer, 8 132 p | **0,71 °C [±0,01] · 3,8 % [±0,4] · 0,0 % ⇒ KLARAR** | 0,88 · 9,5 % · 0,0 % ⇒ FALLER | 0,74 · 4,7 % [±0,5] · 0,0 % ⇒ OAVGJORT | 0,72 °C |

**DOM: ÖPPEN.** RÅ — grannarnas yttemperatur avståndsviktad, upp till fem ankare inom 50 km, vikt 1/km, ingen offset — klarar
A1–A3 utan målets historik, och lika bra som grind A:s lärda offset (0,71 mot 0,72 °C). Per band (RÅ, med vakterna): 0–7 km
0,73 °C / 0,9 %, 7–15 km 0,55 / 1,1 %, 15–20 km 0,73 / 5,0 %, > 20 km 0,72 / 4,0 %.

**Vad det svarar på.** Delsteg 4a (DECISIONS #322): prognosen räknas som RÅ på grind A:s population. Texten står i
`docs/TROSKLAR-SKUGGAN.md` §3, skriven under mandatet i DECISIONS #323 ("den kandidaten är svaret på 4a"); Bengts rad
bekräftar eller ändrar lydelsen (bedömningen §4.2). Bygget i oktober står (DECISIONS #322). **Offsettabellen utgår ur bygget:**
prognoskolumnen behöver ingen lärd offset, bara stationerna, vakterna och avstånden. Interpolerad offset ur grannparen är
underkänd (A2 9,5 %): offsetarna är lokala, inte en jämn karta, som #96 och #119 redan antydde. Höjden är oavgjord: hjälper
inom 7 km (0,59 mot 0,73), stjälper bortom 20 (0,79 mot 0,72, 5,7 % grova); #96 mäter vidare på måndagsklockan.

**Den första körningen föll på fel population — och det är läxan.** Höjdprovet läste arkivet utan #75:s givarvakt, radvakten och
karantänen, som grind A bär sedan 22/9 (DECISIONS #298/#299; höjdprovet stod inte i den listan). Vakterna tar under två procent
av raderna (874 + 1 961 + 2 553 av 337 096) men bar hela skillnaden: 7–15 km-bandet gick från 2,68 °C och 24,9 % grova till
0,55 °C och 1,1 %. Det säger också något om DECISIONS #119:s "7–15 km-anomali": den var trasiga givare, inte terräng. Rättat
i PR #511 innan domen bokfördes. Regel, nu i CLAUDE.md: en grind som lånar en annan grinds trösklar måste låna dess vakter;
kontraktsgrinden vaktar talen, ingen vaktar populationen.

**Vad det inte ändrar.** Grind A:s dom (#321), trösklarna, grind B och C, §4 (aldrig röst ensam). Holdout-stationerna (4c) står:
med RÅ som prognos är en holdout exakt grind A:s leave-one-out, så måndagskörningen ÄR vinterns vägpunktsprov för alla 712
stationer; rutternas holdouts ger dessutom facit för grind B på just skuggrutterna.

**Sagt högt.** (1) Grinden är klarad på höstdata (60 dygn, yta ≤ +5 °C); vinterkurvan är bevakningen, faller RÅ tas frågan upp i
§4.2. (2) 15–20 km-bandet ligger på 5,0 % grova, exakt på tröskeln — bandet står, men det är där vintern kan vända. (3) Att RÅ
och OFFSET är lika bra betyder att grind A:s "tak" inte var något tak: modellens värde ligger i vakterna och ankartätheten,
inte i den lärda offseten. Det förenklar bygget och gör höjden och terrängen till precis vad Bengt frågade om i morse —
delar av samma modell, som läggs in bara om de förklarar något.

## #325 (23/9 2026) Bygg nu: segmentprognosen byggs och körs från 23/9, inte från mitten av oktober (kort #38b steg 4)

**Beslut (Bengt 23/9: *"bygg nu"*, på frågan *"vad vinner vi på att inte gå vidare nu"*).** Starten i DECISIONS #322 (mitten av
oktober) flyttas till nu. Skälet till oktober i DECISIONS #51 gällde körningen — ingen halka att skugga i augusti — inte bygget,
och bygget krympte 23/9 när offsettabellen utgick (DECISIONS #324). Vad vi förlorar på att vänta: höstens första halkperioder
(grind C1 kräver tre skilda), ett oprövat facitmaskineri, inga holdouts på rutterna. Kolumnen kostar ingen röst och ingen
användare oavsett när den startar. Axel äger fortfarande sekvenseringen mot App Store (DECISIONS #320/#322).

**Byggt samma kväll (PR:n bär koden):**
- `sql/032_prognos.sql`: kolumnen `shadow_log.prognos` (jsonb, `{}`) och funktionen `vagpunkt_ankare()` — alla vaktade, färska
  svenska stationer med yttemperatur, "från nu" som snapshoten: 3 h färskhet, #75, radvakten, karantänen (≥ 3 brott/7 dygn),
  långsamma vakten (dygn i felet inom 3 h). Bara service-rollen får köra den; rättigheterna guardade mot CI:s PostGIS.
- `engine/src/segment.ts`: rå avståndsviktning — upp till fem ankare inom 50 km, vikt 1/max(km, 1), grind A:s grannvikt
  ordagrant. Provpunkt var 2 km längs rutten (facitradien i §2). Rad per punkt: `[km, yta, narm, n, status, frys]` — status
  2 uppmätt (ankare ≤ 2 km) · 1 modellerat (≤ 50 km) · 0 okänt; frys = skattning ≤ 1 °C (A3:s klassgräns), satt på det
  oavrundade talet. Rent, plattformsfritt, buntat in i skuggmotorn som allt annat; tio tester i `test/segment.test.ts`.
- Skuggmotorn hämtar ankarna en gång per anrop (RPC), räknar per rutt och loggar `prognos`; svaret bär `ankare` och `ankareSkal`
  så en tom kolumn aldrig är tvetydig. Bara Sverige tills det finska arkivet får samma funktion.
- Skuggrapporten räknar körningar, punkter, uppmätta, modellerade, okända och frysflaggade ur raden — inga trösklar i rapporten.
- Kontraktsgrinden: tre nya former så att SQL-kopiorna av karantänens tal och den långsamma vaktens frist vaktas.

**Vad som INTE är med, sagt högt.** (1) **Tidsdelen.** TROSKLAR-SKUGGAN §1 säger *risk vid beräknad ankomsttid, högst två timmar
fram*. Vägpunktsgrinden bevisade den rumsliga delen; inget har prövat den tidsliga. Kolumnen loggar nuläget per segment; tiden
väntar på trendregeln (kort #88). Att logga en gissning på en gissning vore att förfalska grind B. (2) Fukt: prognosen bär
temperatur, inte fukt — punktmotorns fuktvillkor finns inte mellan stationerna. Frysflaggan är en temperaturflagga. (3)
Värdevakten: prognosens yta ärver `surface_temp_c`:s spann; jsonb-vägen besiktigas när dom-knappen för grind B byggs.

**Kvar i steg 4:** migrationen körd (dbknapp), bunten deployad, **första raden MED innehåll**, facitkopplingen
(`publish/missar.ts`), dom-knappen för grind B och C, holdout-urvalet (4c), Finland. Radstorleken (≈ 1–4 kB per rutt, tre rutter
per varv) mäts efter första dygnet mot databasvakten.

**Alternativ som valdes bort.** Vänta till oktober (perioder förlorade). Läsa ankarna ur live.json (bär bara stationer ≤ 3 °C).
Publicera en ny CDN-fil (kartrepot växer var tionde minut). Höjdkorrigering i prognosen (oavgjord i grinden, stjälper bortom 20 km).

**IDRIFTTAGNING 23/9, bevis:**
- **PR #514** sammanslagen (a894f01); CI grön inklusive integrationstestet som körde sql/032 mot PostGIS.
- **`sql/032`** körd via dbknapp: kolumnen `prognos` (jsonb, `{}`) i `information_schema.columns`; `vagpunkt_ankare()` gav **744 ankare**
  av 747 färska stationer (5,2–17,4 °C); EXECUTE bara för postgres och service_role.
- **Deploy** 20:51:52Z (skuggmotor, 37 kB) och 20:52:33Z (skuggrapport) från a894f01 efter `git pull` och noll diff mot main.
- **Radstorleken, mätt 24/9 02:00Z (Bengt: *"gör radstorleken"*):** 26 rader med prognos 21:00Z–02:00Z, 1 098 byte i snitt, 28 kB totalt, 5,2 rader per timme ⇒ ≈ 125 rader och ≈ 140 kB per dygn, ≈ 4 MB per månad; skuggloggen 2,4 MB på 9 896 rader, databasen 193 MB (24/9 02:00Z). Provpunkterna står kvar var 2 km — inget att krympa.
- **Första raden MED innehåll:** 2 rader med innehåll i `shadow_log.prognos` efter varvet 2026-09-23T21:00:02Z; t.ex. E14 Sundsvall→Åre: 130 provpunkter, 7 uppmätta, 123 modellerade, 0 okända, 0 frysflaggade, 1465 byte; skuggmotorns svar: ankare 5 bidragande per provpunkt (744 i funktionen); E4 Linköping→Södertälje 77 punkter, 970 byte, ankareSkal det svenska svaret hann rulla ur net._http_response före läsningen; det norska varvet svarade ankare 0, "bara Sverige", som avsett.

## #326 (23/9 2026) Holdout-urvalet: varje station på rutten är holdout varje varv — inget tas bort ur prognosen (kort #38b 4c)

**Beslut (Claude på Bengts "kör vidare" 23/9, inom DECISIONS #323:s ram).** Holdout blir inte ett urval av stationer som hålls
utanför modellen för vintern, utan **leave-one-out varje varv**: varje ankare inom 2 km av skuggrutten (facitradien i §2) skattas
ur de övriga ankarna, precis som grind A gör för alla stationer varje måndag, och loggas bredvid sin egen mätning i
`shadow_log.prognos.h` som `[km längs rutten, id, mätt yta, skattad yta, avstånd till närmaste övriga ankare, antal ankare]`.
Stationen bär prognosen för alla andra punkter och är facit för sin egen.

**Varför så, i stället för ett fast urval.** (1) Med rå avståndsviktning (DECISIONS #324) finns ingen inlärning att hålla stationen
utanför — att ta bort den ur ankarna hade bara försämrat prognosen längs rutten. (2) Alla 227 svenska stationer på rutterna
(DECISIONS #323) blir facit, var trettionde minut, i stället för ett handplockat tiotal. (3) Det är exakt §2:s stationsfacit
("VViS-station på segmentet, holdout eller kant: får bekräfta träff, får fälla falsklarm") — utan att någon behöver välja.
(4) Grind C3 (backtest och skuggdrift åt samma håll) får ett direkt jämförbart tal: samma leave-one-out i båda.

**Vad som INTE ändras.** Prognoskolumnen `p` (DECISIONS #325), grindarna, §2:s facitkällor. Kamerafacit, RoadCondition,
situation_archive och testarloggen kopplas i facitkopplingen (`publish/missar.ts`, nästa delsteg).

**Blindningen.** Skuggrapporten visar BARA antalet holdout-rader. Träffar och fel läses vid domens tidpunkt av dom-knappen, inte
löpande — samma regel som för alla skuggmått (inga träffandelar före utsatt tid).

**Sagt högt.** (1) Rutlinjerna är grova: E14 hade 7 stationer inom 2 km av linjen mot 10 inom 5 km (DECISIONS #323). Talet
2 km står för att det är §2:s facitradie; vill vi ha fler holdouts är det linjerna som ska förtätas, inte radien som ska vidgas.
(2) Skattningen för en holdout använder ankare upp till 50 km bort som alla andra punkter; `narm` i raden säger vilket band den
hamnade i. (3) `publish/missar.ts` bär en egen kopia av tre rutter ("håll i takt") — den ska läsa rutterna ur skuggmotorn som
ruttberedskapen gör, i samma varv som facitkopplingen byggs.

**Bevis (PR #516, deploy 21:24Z från cdd7889):** varvet 21:30Z: E4 Sundsvall→Umeå 2 holdout-rader (station 2244 vid km 1,1: mätt 11,0 °C, skattad 9,7, närmaste övriga ankare 4,7 km, fem ankare), E18 Karlstad→Örebro 3 (1712 vid km 45,7: 12,3 mot 13,8; 1830 vid km 63,3: 13,3 mot 13,4); 798 och 1 315 byte per rad. Raderna före deployen bär `p` utan `h`, som avsett.

## #327 (23/9 2026) Facitkopplingen och dom-knappen för grind B och C: `publish/grind-s-b.ts`, två lägen (kort #38b steg 4)

**Beslut (Claude på Bengts "kör vidare" 23/9; formen enligt TROSKLAR-SKUGGAN §2–§3 och grind V-B:s mönster).** Segmentprognosens
skuggdrift döms av en knapp, `publish/grind-s-b.ts` (`grind-s-b.yml`, dispatch, inget schema), som läser `shadow_log.prognos`
(p och h, DECISIONS #325/#326) och `alerts`:
- **Skuggvarning = episod:** samma provpunkt flaggad i varv som ligger ≤ 2 h isär. Ett varv var trettionde minut är inte en ny
  varning var trettionde minut.
- **B1** döms av holdout-stationen inom facitradien (2 km, importerad ur segmentmotorn) i episodens egna varv: mätt yta > +2 °C
  ⇒ FALSK, ≤ frysgränsen ⇒ BEKRÄFTAD, annars OMÄTBAR och aldrig i B1. Kamerabild fäller aldrig (§2).
- **B2** ur facithändelser inom 2 km av rutterna: SMHI-isvarningar, halka i `situation_archive`, operatörens väglag kod ≥ 2
  (`road_condition_history`, närmaste punkt på segmentet mot rutten i PostGIS), förarens *stämde* (`driver_facit`). På täckta
  segment (närmaste provpunkt status ≥ 1); miss när ingen provpunkt inom 2 km var flaggad de 2 h före. Orsaksklassad: nederbörd
  vid närmaste station inom ±1 h ⇒ NEDERBÖRDSDRIVEN, redovisad för #16, aldrig i B2.
- **B3** bland bekräftade episoder: punktmotorn (samma rads `alerts`, punktfaror med position inom 2 km) tyst hela episoden eller
  > 30 min efter starten. Läsningen enligt DECISIONS #319, talet oförändrat.
- **C1** ≥ 20 bedömbara händelser över ≥ 3 halkperioder (> 2 dygn isär), **C2** ≥ 30 bedömbara episoder, **C3** holdout-radernas
  grova fel mot grind A:s A2 ≤ 10 pe (`--grindA2`), annars OAVGJORT. Utan C: ingen dom, alltid fortsatt skugga.
- **Två lägen — blindningen:** `--underlag` (standard) skriver bara antal och C1/C2:s framfart; `--dom` skriver andelarna med
  marginalvakten, vid domens tidpunkt eller på Bengts uttryckliga order. Självtestet fäller om underlagsläget nämner en procent.

**Bevis:** självtestet — en rutt, sju varv, fem händelser med känd sanning: tre episoder (bekräftad, falsk, omätbar), mervärde
när punktmotorn kom 60 min senare, en träff, en utstrålningsmiss, en nederbördsmiss, två obedömbara; B1 50 %, B2 50 %, B3 100 %;
C1/C2 inte uppfyllda; ruttparsern läser skuggmotorns 20 rutter. Kontraktsgrinden 49/49. Första skarpa körningen i underlagsläge
efter sammanslagningen (bara antal).

**Sagt högt.** (1) **Kamerabildernas klassning har ingen tabell.** Bengt klassar facit-hinkens bilder veckovis, men ingenstans
läsbart för en knapp. Källan är noll tills den får en plats — nytt kort #242, rad i bedömningen §4.2. (2) Punktmotorns
segmentlarm utan position (`geo: "segment"`) räknas inte i B3; det är form B (Alert bär position) och rör vektorerna. (3) Med en
enda bekräftad episod ger binomialfelet noll bredd och B3 läser KLARAR på 1 av 1 — C2:s trettio episoder är spärren som gör
att det aldrig blir en dom. (4) SMHI-varningar är områden; centroiden kan ligga långt från rutten, så de flesta faller utanför
2 km — samma begränsning som i `publish/missar.ts`. (5) `missar.ts` bär fortfarande sin egen kopia av tre rutter; dom-knappen
läser skuggmotorns tjugo. Rättas när missar.ts nästa gång rörs.

**Bevis, första skarpa körningen:** körning 35923243716, 21:34Z, läge underlag, 1 dygn: självtestet grönt först; skarpt 4 varv på 4 rutter, 371 provpunkter, 5 holdout-rader, 0 episoder, 0 facithändelser, 0 halkperioder, C1 0/20, C2 0/30 — och inte en enda procentsats i utskriften. Blindningen höll i drift, inte bara i självtestet.

## #328 (24/9 2026) Vägpunktstexten i TROSKLAR-SKUGGAN §3 bekräftad av Bengt (kort #38b 4a)

**Beslut (Bengt 24/9: *"gör vägpunkt"*).** Lydelsen som skrevs 23/9 under mandatet i DECISIONS #323 (DECISIONS #324/#325/#326)
står som Bengts rad enligt §5: rå avståndsviktning av upp till fem ankare inom 50 km, vikt 1/km, ingen offset, på grind A:s
population; status per provpunkt (uppmätt ≤ 2 km, modellerat ≤ 50 km, annars okänt; flaggad ≤ 1 °C); provpunkt var 2 km;
holdout = varje station inom 2 km av rutten, varje varv. Tidsdelen loggas inte förrän något prövat den. Ingen kod ändras.

## #329 (24/9 2026) Kamerafacit får en tabell och blir femte källan i grind S-B — kameran bekräftar, fäller aldrig (kort #242)

**Beslut (Bengt 24/9: *"gör kamerafacit"*, på förslaget i bedömningen §4.2).** `sql/033_kamerafacit.sql`: tabellen `kamerafacit`
(bild, kamera_id, lon, lat, bild_tid, klass, av, klassad) med sex klasser — is · snö · slask · våt · bar · okänd — en klassning
per bild, dubbellåst som förarfacitet (RLS utan policy + REVOKE). Matas via dbknapp (INSERT-fil) tills en enkel sida finns.
`publish/grind-s-b.ts` läser den som femte källa: en bild klassad is/snö/slask inom facitradien är en facithändelse (B2) och
bekräftar en episod som pågick när bilden togs (±30 min); våt, bar och okänd gör ingenting. **Kameran fäller aldrig** (§2): i
självtestet mäter stationen vid km 20 +4 °C medan kamerabilden visar snö, och episoden döms FALSK ändå.

**Bevis:** självtestet (två kamerahändelser: en bekräftar en episod utan station, en får inte rädda en varm station; B1 1/3,
B2 1/4, B3 100 %); migrationen och den skarpa körningen i underlagsläge redovisas nedan. Kortet #242 stängs först när en riktig
bild är klassad och räknad — Verify på kortet.

**Sagt högt.** (1) Klassningen görs i dag genom att skriva en INSERT-fil till dbknapp — en söndagsrutin på tio bilder tål det,
hundra gör det inte; sidan är nästa steg när bilderna kommer. (2) Bildens tid tas ur hinkens sökväg (3-timmarsbucket) om
ingen bättre tid finns; ±30 min-fönstret i bekräftelsen är därför generöst i kamerans favör, men kameran kan bara bekräfta.
(3) **Axels ord** (Bengt: *"gör axels ord"*): jag kan inte tala för Axel och skickar inget i någons namn. Frågan står i stället
överst i bedömningens läge, som hans session läser först: starten står om han inte säger annat (DECISIONS #322/#325).

**IDRIFTTAGNING 24/9, bevis:** `sql/033` körd via dbknapp — kolumnerna id, bild, kamera_id, lon, lat, bild_tid, klass, av, klassad; rättigheter bara postgres och service_role; 0 klassade bilder. Grind S-B i underlagsläge (1 dygn, 02:0xZ): 26 varv på 18 rutter, 2 118 provpunkter, 90 holdout-rader, 0 episoder, 0 händelser (kamerakällan läst utan fel), C1 0/20, C2 0/30, inga andelar.

## #330 (24/9 2026) Tystnadsfelet: §3 gjord mätbar — tal ur fastställda dokument, tre klasser, orsak per tröskel, två lägen (kort #98)

**Beslut (Bengt 24/9: *"vi gör 98 först"* → *"gör förslaget"*, på `docs/TYSTNADSFEL-KLASSNING-2026-09-24.md`).** Skärpning av
det fastställda och kontrasignerade dokumentet (talen in, ingen gräns flyttad): (1) signalerna får tal — kondensation ur
TROSKLAR-TRENDEN/RIMFROST, trend ur betans startvärden (#222), risk = motorns egen regel med fukt, regn ur OVERGANGAR §2;
(2) tre klasser: oursäktlig (signal), ursäktlig (bevisad yttre orsak — radarn såg nederbörd inom 5 km medan stationen var torr),
okänd (resten, saltbilen); (3) orsak per tyst miss — fukt, tid, avstånd eller yttröskel — så att §5:s kurva ritas mot rätt
tröskel; (4) räckvidd 7 km, tyst avgjort mot flottans kadens (senaste varvet inom 4 h, larm inom 2 km), facitradie 2 km;
(5) minsta underlag 20 tillfällen i 3 halkperioder; (6) priset som tillkomna varningstillfällen över svepet 1,0–2,5 °C;
(7) två lägen — underlag (antal) och dom (andelar, paret, priset).

**Byggt i samma varv:** `scripts/tystnadsfelet.ts` (instrumentet från 14/9, PR #236) bär allt ovan; facit ur den delade
händelselistan `publish/skuggfacit.ts` (ny modul: SMHI, situation-halka, väglag kod ≥ 2 eller motorns halkord, förarens
*stämde*, kamerafacit) — samma lista som grind S-B (`publish/grind-s-b.ts` omskriven att läsa den). Kontraktsgrindens
ankarradiegolv 5 → 4 med skäl (tystnadsfelet bytte MAX_KM mot RACKVIDD_KM, egen storhet). Knappen `tystnadsfelet.yml`
fick lägesvalet. Självtester: tre klasser, orsakskolumnen, svepen är andras, halkperioder, prisets episoder, rutterna.

**Avvikelse, sagd högt.** Bedömningen 24/9 sa att #98 saknade kod. Fel: instrumentet fanns sedan 14/9 (PR #236,
`scripts/tystnadsfelet.ts`, 280 rader) med signalerna, okänt-utfallet och underlagsvakten. Jag upptäckte det när Write sa
*updated* om knappfilen. Förslaget fördes därför in i det befintliga skriptet i stället för i ett nytt; det som var nytt i
förslaget var talen, tre klasser med bevisad orsak, orsakskolumnen, räckvidden 7 km, flottans kadens, fukten i
riskvillkoret, den delade listan, lägena och priset. Läxan står i CLAUDE.md redan (sök i repot innan något sägs saknas);
den bröts ändå, och det är värt att säga.

**Sagt högt.** (1) Trendsignalen kan bara prövas inom sju dygn (trend_kandidater gallras) — instrumentet skriver ut hur
många tysta missar som är okända på tid. (2) Priset är tillfällen, inte falsklarm; falskheten kräver kamerafacit (#242)
eller förarens nej. (3) SMHI-varningar är områden — centroiden ligger oftast utanför 2 km.

**Bevis, första skarpa körningen (PR #524, c25f6bd):** körning 35948719580, 24/9 02:47Z, underlagsläge, 14 dygn: 2 bekräftade tillfällen (situation-halka), båda inom 7 km (median 4,2 km), skuggloggen 1 360 larm med position av 1 847, båda tysta, båda OKÄNDA i alla 16 celler (ingen signal vid stationen, ingen radar), trenden okänd för båda (äldre än sju dygn), 2/20 tillfällen och 2/3 perioder — inga andelar skrivna. Alla fem avsnitt körde utan fel mot databasen; paret läses först i vinter.

## #331 (24/9 2026) Skuggmotorns ordning: Bengts "2, 3, 5, 6" — fyra knappar tryckta, S3 väntar bakom S1-grinden, #83 hos Axel

**Beslut (Bengt 24/9: *"då gör vi 2,3,5,6"* på ordningen i bedömningen §4.2).** Av de sex: (1) #83 gallringens steg 2 lämnas
till Axel (Pro eller export); (4) #98 gjort tidigare samma natt (DECISIONS #330). De fyra beställda:

- **(2) T-A steg 0 (#88) och bildfacitets definition (#209/#231).** Förfaller först vid första frosten — frostvakten (50 stationer under noll) har inte larmat: senaste tio nätterna som mest 4 stationer under noll (17/9), kallast −5,6 °C (22/9). Knappen
  trycktes ändå som prov: T-A steg 0, 7 dygn (körning 35949108311): 3 765 station-nätter, 47 frostnätter (yta ≤ 1 °C) på 26 stationer, 3 718 icke-frostnätter; separationen går inte att skilja från noll; kallaste stunden 03–07 i 70 % av frostnätterna; molnet hämtat för 34 av 47 punkter. Bildfacitets definition skrivs in i DECISIONS när första frosten kommit, som kortet säger.
- **(3) #89 S2/S3 efterhalkan.** Kan inte byggas nu: S3 är Axels bygge och väntar bakom S1-grinden (Axel 16/9, DECISIONS #196:
  regn_h döms innan något mer byggs på det), som kräver blöta frostnätter. S1-kolumnen bär 35 rader med innehåll (senast 22/9
  06:30Z) och trendarkivet 19 469 kandidater, 1 följd av frost. Förberett, inte byggt.
- **(5) #46 rimfrosten.** R-A på det finska arkivet, 30 dygn (körning 35949100922): 39 244 rader, 419 stationer efter vakten — 0 episoder på 0 stationer, OAVGJORT (spärren 200 stationstimmar / 20 stationer); molnkontrollen R-A4 kan inte köras på Finland (SMHI:s moln når inte dit).
- **(6) #103 och #90.** K-A, 60 dygn (körning 35949104486): 712 stationer, 207 647 avläsningar; 1 099 punkter över 44 stationer men 0 frysande vid gränsen 0 °C — INGEN DOM (septembervakten K-A4). W-A steg 0, 14 dygn (körning 35949166508): 209 834 rader, byvind i 99,3 % (750 stationer), sikt i 99,9 %; täckningsgrad 17,9 % av möjliga stationstimmar; 11 stationer med omöjliga timmar (byvind ≥ 15 m/s och kvot > 5) tas av stationsvakten; högsta byvind 87,7 m/s bakom taket 30; W-A OAVGJORT — underlagsvakten W-A4 håller (16 respektive 243 stationstimmar i högsta bandet).

**Vad det säger.** Alla fyra knappar fungerar mot databasen med de fem vakterna; ingen har underlag än. Vintern är inte här:
frostvakten har inte larmat, Finland har inga rimfrostnätter, ingen station har frusit vid nollgränsen på 60 dygn. Det är
rätt utfall i september. Kvar i ordningen: knapparna trycks om vid första frosten (T-A inom sju dygn, K-A, R-A på båda
arkiven, W-A), S3 när S1-grinden passerats, #83 när Axel valt.

**Frågan om måndagsklockan** (K-A, R-A, T-A, W-A är knappar, inte på pulsklockan) står kvar i §4.2 — Bengt sa inget om den.

## #332 (24/9 2026) Tre stängningar på Bengts "tre ja": #97 stängt, #155 sammanslaget i #83, #242 stängs på första klassade bilden

**Beslut (Bengt 24/9: *"tre ja"* på förslagen i bedömningen §4.2).**
1. **#97 halk-regexen STÄNGT.** Byggt 16/9 (DECISIONS #214): ordbörjan `is|halka|halkrisk|halkig|halt|mycket besvärligt` +
   stammarna `snö|frost`, elva ställen, vektorn `v24_vinterord_kod1.json`. Bevis: android och ios-engine gröna på main
   (cdd7889, 23/9 21:23Z), deployad 16/9, i apparna sedan 0.3.9. Vakthundens check 4 (första vinterordet i väglagsarkivet) är
   bevakning, inte ett villkor för kortet — den larmar när Trafikverket skriver ordet, oavsett om kortet står öppet.
2. **#155 snubbeltråden SAMMANSLAGEN i #83.** Kortet sa "vad som ska göras nu: ingenting" och fanns för att oktoberbeslutet
   om kvarhållningen ska veta att det avgör två mätinstruments byggform (#89 räknar om, #98 räknar om; #88 sparar). Det står
   nu som stycke på #83, där beslutet tas. Ingen tråd tappad.
3. **#242 kamerafacit stängs på första klassade bilden.** Hinken bär 790 bilder sedan 15/9 16:00Z. Bengt får den senaste:
   `2026-09-24/SE_STA_CAMERA_VViS_329_K1-165760.jpg` (arkiverad 02:30:02Z, kamera VViS 329 K1, position ur kamerafilen), klassar den i sex-klasserna, klassningen
   går in via dbknapp och grind S-B räknar den som händelse. Kortet stängs när det skett — tillägg här.

Tavlan 49 → 47 öppna (#242 kvar tills bilden är klassad).

## #333 (24/9 2026) Kamerafacit: första klassningen — Trafikverkets direktbild, inte hinkens; kort #242 stängt

**Beslut (Bengt 24/9: *"klassa som våt"*, efter att båda vägarna till den arkiverade bilden stoppats — bedömningen §4.2).**
Den första raden i `kamerafacit` gäller **Trafikverkets direktbild** från kameran Tierp (E4, VViS 329 K1) 2026-09-24 03:11:34Z,
hämtad ur det publika API:et 03:18:51Z och sparad i repot som `docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg`
— inte den arkiverade bilden i hinken (02:30Z), som bara Axel når. Läsningen var Claudes (*mörk, blöt lins, våt vägbana,
ingen snö*), klassen Bengts: **våt**. Raden bär det: `av = 'Bengt (på Claudes läsning av direktbilden)'`.

**Vad som därmed ändras i tabellens mening.** `bild` är en sökväg i hinken ELLER i repot under `docs/kamerafacit/` för bilder
hämtade direkt från Trafikverket och sparade där. Dom-knappen bryr sig bara om position, tid och klass; sökvägen är
spårbarheten. Ingen kolumn ändras.

**Bevis.** raden id 1: bild docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg, kamera VViS 329 K1, 17,511/60,324, bild_tid 03:11:34Z, klass våt, av Bengt (på Claudes läsning av direktbilden), klassad 03:29:56Z; 1 klassad bild, 0 halkbilder. Grind S-B i underlagsläge efter klassningen: 1 dygn, 03:3xZ: 31 varv på 18 rutter, 2 488 provpunkter, 117 holdout-rader, 0 facithändelser, C1 0/20, C2 0/30 — kamerakällan läst utan fel; en våt väg är ingen
halkhändelse, så den räknas inte som händelse (rätt), och det är precis vad §2 säger: kameran får bekräfta halka, aldrig
fälla, och våt/bar/okänd gör ingenting.

**Kort #242 stängs.** Verify löd *en klassad bild i tabellen och grind S-B räknar den som händelse*. Första halvan är uppfylld
med en riktig bild; andra halvan är bevisad i självtestet (kamerahändelsen E6 i `publish/grind-s-b.ts`) och syns skarpt
först vid första is/snö/slask-bilden — kortets syfte, en plats för klassningarna, är fyllt. Tavlan 47 → 46.

**Sagt högt.** (1) Vägen till hinkens bilder är fortfarande stängd för alla utom Axel — söndagsklassningen i vinter kräver
antingen panelinloggning för Bengt eller att Axel hämtar bilder; raden i §4.2 står kvar. (2) En klassning per INSERT-fil
i repot är spårbar men tung — sidan är nästa steg när bilderna blir många. (3) dbknapp migrera tar bara `sql/NNN`-filer som
bärare, så INSERT-filen i `scripts/matningar/` kunde inte köras som fil: klassningen gick in som BEVISRAD (enradsform) med
`sql/033` som bärare. Fungerar, men det är fel kanal på sikt — sidan i (2) ska skriva direkt.

## #334 (24/9 2026) Kort #83 steg 2: vinterarkivet exporteras till Supabase Storage — inte Pro

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, på beslutsrundan `docs/BESLUTSRUNDA-2026-09-24.md` §1).** Gratisvägen 2a i stället för Pro
(25 USD/mån). Ingen betaltjänst, alltså ingen DECISIONS-post med Axels ja krävs enligt gratisnivåregeln; Axel ser beslutet här.

**Byggt och i drift samma morgon (PR #540, #541):**
- `sql/034_arkivexport.sql`: `arkiv_export` (bokföringen), `arkiv_att_exportera` (färdiga, gallrade dygn äldre än 8 dygn),
  `arkiv_dygn` (rubrikrad + en JSON-lista per rad; kolumnerna ur katalogen, geom som lon/lat), `arkiv_export_klar` (räknar
  dygnet en gång till och bokför bara vid exakt radantal; ett raderat dygn skrivs aldrig över), `arkiv_radera_exporterat`
  (bara över **350 MB**, bara äldsta bokförda dygnet, **ett per natt**, aldrig yngre än **30 dygn**, aldrig om databasen bär
  fler rader än filen), `arkiv_efterslap`. Privat hink `arkiv`. Jobb `halkvakt-arkivexport` varje timme :40 (kommandot
  kopierat ur skuggmotorns jobb inne i databasen med replace(), aldrig i en fil) och `halkvakt-arkivradering` 03:45.
- `supabase/functions/arkivexport`: två dygn per anrop — packar, laddar upp, **läser tillbaka ur hinken**, jämför sha256
  och radantal, bokför. Raderar aldrig.
- Vakthundens check 9k: exporten får ligga efter, inte stå still (> 3 dygn väntar och ingen export på 3 h ⇒ larm).
- Integrationstest mot PostGIS (ok 49): text med kommatecken och citattecken, fel radantal bokförs inte, gränsen, min_dygn,
  en sen rad stoppar raderingen högljutt, ett raderat dygn skrivs inte över.

**Bevis.** Första varvet 05:40Z: **24/8 (4 711 rader, 70 157 byte) och 25/8 (17 843 rader, 236 388 byte)** bokförda, samma
storlek i `storage.objects`, sha `929c8d1a…` och `ce8f7031…`; 19 dygn väntar. Torrkörd radering: *"databasen 193 MB, under
350 MB — inget raderas"*. 25/8 gav 2,74 MB text (153 byte/rad) och 236 kB packad (11,6 ×) — ett vinterdygn (848 stationer
× 48) blir ~6 MB text och ~0,5 MB packat, vintern ~80 MB i hinken (1 GB gratis; kamerabilderna 18 MB).

**Fynd på vägen, sagt högt.** Bevisraden efter sql/034 visade `anon` och `authenticated` med EXECUTE på raderingen: Supabase ger
nya funktioner i public-schemat EXECUTE genom standardrättigheter, och `REVOKE FROM PUBLIC` tar inte bort dem. RLS hindrade att
något kunde raderas, men huset låser dubbelt — `sql/035` samma timme; nu postgres + service_role, raderingen bara postgres.

**Kvar, före mars:** återläsningssteget — marsdomarna ska kunna köras på exporten återläst i en PostGIS-container (som
arkivbackupen provar varje vecka). Behövs först när raderingen börjat, alltså när databasen passerat 350 MB. Så länge den är
under räknas grind A:s 60-dygnsfönster i databasen som förut.

## #335 (24/9 2026) Kamerabilderna öppnas i mars (DECISIONS #248 står); TROSKLAR-SKUGGAN §6 omskriven: Claude klassar, Axel ok:ar

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §2).** #248 står — bilderna i hinken öppnas vid domens tidpunkt, blindningen är värd
mer än en tidigare läsning. §6 i `docs/TROSKLAR-SKUGGAN.md` skrivs om: Claude klassar blint ur kontaktark (kort #246; sökvägen
visar kamera och tid, aldrig skuggans larm), Axel ok:ar (stickprov ≥ 10 % plus varje is/snö/slask, de enda som räknas som
händelse), Bengt stickprovar. Spåret byggs och provas nu på Trafikverkets direktbilder, som är publika och inte facit. Den
motsägelse som stod mellan §6 (veckovis, 1/9) och #248 (mars, 20/9) är därmed borta. Beslutet var Bengts och Axels i rundan;
Bengt svarade, Axel ser det här — hans del är exporten av hinken och ok:et.

## #336 (24/9 2026) Kort #231:s definition: *övergång* = ytan över +1 °C någon gång de sex timmarna före varningen

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §3).** Skrivet FÖRE första hinkbilden öppnas, som kortet kräver. När bildfacit läses
delas produktionsregelns varningar (`icing_point`) i **övergång** — stationens yttemperatur låg över **+1 °C** någon gång under de
**6 timmarna** före varningen — och **stadigt kallt** för resten. Andelen bilder med bar eller våt väg redovisas per grupp. Sex
timmar täcker en kvällsavkylning från plus till frost; två hade kallat de flesta nattvarningar stadigt kalla fast vägen saltats
på eftermiddagen. Talet sveps inte — det är en läsning, inte en tröskel — men redovisas också vid 3 och 12 h så att valet syns.
Ingen tröskel rörs, ingen röst ändras.

## #337 (24/9 2026) Integrationskartan öppnad för R17–R20 — och fryst igen

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §4).** Frysvillkoret ("efter bygge + mätning") är uppfyllt av segmentprognosen och
facitkopplingen. Införda: **R17** §6.1 och §2 — grind A KLARAD (#321), 7–15 km-anomalin var givarfel (#324); **R18** §5.4 —
segmentprognosen går ingen fog i motorn i vinter, den loggas i skuggan och blir karta och förstärkare vid dom (#319, #325);
**R19** §12 — facitstacken är tunn men inte tom eller obevakad (#327, #329, #330, #333); **R20** §7.2–7.4, §8 C/D och §13.6 —
motkrafterna avgjorda 16–17/9 (#220, #221, #226), kombinationsgrinden och regel D skrivna. Bevisbäraren (§8 B) fick kortet #245.
Inga fogar och ingen sekvens ändras. Kartan fryst igen i samma commit; §14 har raden.

## #338 (24/9 2026) Frosttriggern: vakthunden trycker de fem frostmätningarna själv — ingen veckoklocka

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §5).** I stället för att sätta K-A, R-A, T-A och W-A på måndagsklockan (Actions-minuter,
mot regeln 22/9) trycker vakthunden flödena **en gång**, i samma ögonblick som det riktiga frostlarmet (≥ 50 stationer under noll)
skapas: `overgangar-steg0` (7 dygn), `grind-t-a` (7), `grind-r-a` med `land = se` (30), `grind-k-a` (60), `vindsikt-steg0` (14).
Utfallet per flöde skrivs i frostissuen; ett ❌ säger att det flödet ska tryckas för hand. Provet trycker inga flöden. Därefter
knapp på Bengts order, som förut. Kostar ~20 Actions-minuter en gång.

**Bevis.** Deploy 05:36:53Z (PR #540). Utlösarprovet via dbknapp (`utlosarprov`, ny flagga) 05:38Z: vakthunden svarade 200,
och en körning av `vindsikt-steg0` skapades 05:38:35Z av repots nyckel och blev grön — PAT:en får trycka flöden. Det riktiga
larmet kan inte provas utan att förbruka engångslarmet; grenen är samma `utlos()` som provet.

**Sagt högt.** Mitt hjälpskript skickade först provet som en migration med filnamnet *utlosarprov*; dbknapp avvisade det
(*"ange en fil som sql/014…"*) innan något kördes. Lärdom i skriptet: prov går genom `flode_kor.py`, inte `dbknapp_kor.py`.

## #339 (24/9 2026) Bildläsningsspåret byggt och provat på direktbilder — väntar på Axels ok (kort #246, steg 2 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 2 bildläsningsspåret"*; formen enligt DECISIONS #335).** `scripts/kontaktark.py`, fyra steg:
`direkt` (Trafikverkets direktbilder från väglagskameror inom 2 km av skuggrutterna, jämnt spridda längs rutterna — hinken rörs
inte) eller `mapp` (Axels export av hinken, i mars) · kontaktark 4 × 5 rutor med nummer, kameranamn och UTC-tid, aldrig skuggans
larm · `stickprov` (varje is/snö/slask plus minst 10 % av resten, valt på filnamnets sha så att valet inte går att styra) och
ok-sidan för Axel · `sql`, som skriver en INSERT per bild **bara om** klassningen bär Axels ok, och annars vägrar.

**Provet 24/9 13:33–13:44Z:** 20 bilder på 20 kameror längs rutterna (`docs/kamerafacit/prov-2026-09-24/`: arket, bilderna, manifest, klassning, ok-sida).
Klassade blint av Claude: **bar 20, hög säkerhet** — sol och torr vägbana i hela landet. Två rutor granskades i full storlek
(Drälinge: mörka bågar är däckspår; Ristjärn: mörkt körfält är skugga). Stickprov för Axel: nr 6 Helsingborg N och nr 16
Sandsjöbacka. `sql` vägrade utan ok, som den ska.

**Vad provet bevisar, och inte.** Kedjan fungerar från kamera till en rad som väntar på ok. Det bevisar INTE att klassningen skiljer
våt från bar eller snö från slask — ett soligt septembereftermiddagsark har bara ett svar. Ett andra prov vid regn eller i mörker
behövs innan mars (kortet bär det).

**I mars:** bara arken, klassningen och ok-sidan går in i repot; bilderna stannar i hinken och i Axels export. Provets 1,2 MB
bilder ligger i repot med flit, så att Axel kan öppna stickprovet direkt på GitHub.

## #340 (24/9 2026) Axels ok på bildläsningsspårets första ark — 20 rader in i kamerafacit, kort #246 stängt

**Beslut (Axel, framfört av Bengt i chatten 24/9: *"Axel okayar"* — samma form som DECISIONS #61).** Arket
`docs/kamerafacit/prov-2026-09-24/` godkänt utan rättelser. `klassning.json` bär `"ok": {"av": "Axel (framfört av Bengt i chatten)",
"nar": "2026-09-24T13:49Z"}`; `python scripts/kontaktark.py sql` skrev 20 INSERT-satser (`scripts/matningar/kamerafacit-prov-2026-09-24.sql`,
genererad), körda via dbknapp som bevisrader.

**Bevis:** `kamerafacit` bär **21 rader** — de 20 nya, alla `bar`, med `av = 'Claude (ok: Axel (framfört av Bengt i chatten) …)'`,
plus Tierp-raden från 03:11Z (`våt`, #333). Ingen av dem är halka, så grind S-B räknar ingen händelse — rätt.

**Kort #246 stängt:** Verify (*ett kontaktark ur direktbilderna klassat och ok:at, med tabellrader*) uppfylld. Det andra provet —
ett ark vid regn eller i mörker, som prövar att klassningen skiljer våt från bar — är nytt arbete och har eget kort, #247.

## #341 (24/9 2026) S2 byggt: skattaren ger nivå och bevis bredvid ordet — före S1-grinden (kort #89, steg 3 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 3"*, på förslaget i bedömningen §4.2 att bygga S2 nu).** Bedömningen hade lagt S2 bakom
S1-grinden. Grinden (Axel 16/9, DECISIONS #196) gäller regnfältets tillförlitlighet innan S3 bygger en REGEL på det; S2 är
skattarens FORM, och den rör varken motorn, rösten eller någon tröskel. Därför nu, S3 väntar kvar bakom grinden.

**Byggt:** `skattaNiva(bevis, N, K1, K2)` i `publish/tillstand.ts`, bredvid `skatta()` som är orörd (kartans §5.3: lägg till,
ersätt aldrig). Svaret: `tillstand` (alltid exakt `skatta()`s), `vata` (antal N i N_SVEP som ger blött — hur nyligen),
`mangd` (antal steg i REGN_SVEP stationens regn klarar), `radar` (antal steg i R_SVEP), `kallor` (station/radar inom N),
`frys` (ytan mot K1 med zonen K2: under · nära · över — frysklassningens idé att få avstå nära gränsen), `bevis` (läsbar rad).
**Inget nytt tal:** varje nivå är ett antal steg i ett svep som står i TROSKLAR-OVERGANGAR §2 eller TROSKLAR-FRYSKLASSNINGEN §2,
och argumenten prövas mot svepen (D1) — ett eget tal avvisas. Frånvaro är inte noll: okänd mängd och saknad radarrad är null.

**Bevis:** åtta nya tester (kontraktet `tillstand = skatta()` över 64 fall × fyra N, väta, mängd med null, radar, frys med
K2 = 0 som alltid svarar, källor, beviset som text, D1), steg 2-knappens självtest med fem S2-rader, 155 enhetstester gröna.
K1- och K2-svepen står nu i två filer (`scripts/grind-k-a.ts` och `publish/tillstand.ts`) — två nya kontrakt, 51 håller.

**Vad det låser upp:** kort #245 (bevisbäraren, nyckeln var S2) och indata till #153:s försprång. Ingen konsument i drift än:
nivån är indata, inte en varning. Integrationskartan är fryst och säger fortfarande att E inte är byggd; det rättas nästa gång
den öppnas efter mätning (bedömningen §5.2 bär läget).

## #342 (24/9 2026) Bevisbäraren: varje väderpunkt i live.json bär `bevis` bredvid `fukt` (kort #245, steg 4 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 4"*).** Integrationskartans §8 B, fog F1: ett nytt fält, aldrig i stället för ett gammalt (§5.3).
`weather[].bevis = { vata, mangd, radar }` ur skattarens nivå (S2, DECISIONS #341): väta 0–4 (antal N i N_SVEP som ger blött),
mängd 0–3 (steg i REGN_SVEP för regnet vid stationens senaste regn, null = okänd), radar 0–3 (null = ingen rad). Alla tre är
oberoende av N och av K1/K2, så inget startvärde kopieras in i snapshoten.

**F1 verifierat i kod, som R16 kräver (kartans §5.6):** Android `SnapshotRepo.kt` läser `id`, `lon`, `lat`, `yta`, `fukt`
(`optBoolean`), iOS `SnapshotRepo.swift` samma nycklar, motorns adapter `engine/src/snapshot.ts` samma. Ingen itererar över
nycklarna. Ett nytt fält kan inte fälla en installerad app.

**Byggt:** `publish/snapshot-core.ts` (regnfrågan bär också mängden vid senaste regnet; `bevisRad`), `scripts/bundle-publicera.ts`
buntar `publish/tillstand.ts` före kärnan, `supabase/functions/publicera/index.ts` genererad om. Två tester fick fältet i sitt
facit, ett nytt (#245) prövar väta och mängd, null för okänd mängd, `fukt` orört och att adaptern ger samma hazard.

**Sagt högt.** Radarn per station finns inte i snapshoten — `radar` är null tills en koppling station→radarsegment byggs.
Fältet står ändå, så formen är stabil när det fylls (att lägga till nu och fylla senare är additivt; att ändra form senare vore
det inte). Ingen läser `bevis` i dag: det är indata till försprånget (#153) och till S3.

**Idrifttagning 24/9:** PR #547 (a00435d), CI grön — integrationstestet körde den nya regnfrågan mot PostGIS efter att dess facit
fått fältet. Deploy av publicera 14:09Z från main, noll diff. Publiceringarna 14:10 och 14:20 svarade `ok` och kartrepot fick sina
commits; manifestets sha stämmer med live.json. **Men live.json bär noll väderpunkter** i eftermiddagssolen (ingen station ≤ +3 °C),
så fältet har ingen rad att sitta på. Beviset med innehåll kommer när stationerna kallnar: vakthunden fick raden
`bevis: N av M väderpunkter` (larm om punkter finns och någon saknar fältet), så beviset skrivs i timkontrollen utan att någon
behöver titta.

## #343 (24/9 2026) Vakthundens arkivgräns: 3 timmar i stället för 30 minuter (kort #243)

**Beslut (Bengt 24/9: *"ja till 3 och 4"*, femma nummer fem).** `LIVEMOTOR_EFFEKT_MIN` i vakthundens check 9d (b) går från 30 till
**180** minuter. Kommentarens premiss var fel: `situation_archive` rörs inte varje minut, bara när Trafikverket ändrar en avvikelse.
Mätt 24/9: 32 gluggar över 30 min på sju dygn, medel 54 min, största 128 min. Issue #528 (24/9 03:07Z) var ett sådant falsklarm
medan livemotorn svarade 360 av 360 minuter. Tre timmar ger 52 minuters marginal mot den största uppmätta gluggen och fångar
ett riktigt stopp (kort #222:s fall) inom tre timmar. Kortet stängs efter sju dygn utan falsklarm ur checken.

## #344 (24/9 2026) Skuggmotorns svenska schema flyttat till :02/:32 — lagning och prov för 546 på hel- och halvtimmen (kort #244)

**Beslut (Bengt 24/9: *"ja till 3 och 4"*).** `sql/036`: `cron.alter_job` för `halkvakt-skuggmotor`, `*/30` → `2,32 * * * *`. Sedan
24/9 00:30 har en funktion svarat 546 WORKER_RESOURCE_LIMIT på :00/:30 (00:30, 01:00, 02:00, 04:00, 11:00, 14:30), aldrig de tre
dygnen före; på :00/:30 startade publicera, livemotorn och skuggmotorn samma sekund, och skuggmotorn räknar sedan 23/9 kväll 744
ankare per varv. Försvinner 546 efter flytten är orsaken bevisad utan Axels funktionslogg; finns de kvar läser Axel loggen.
Rotationen påverkas inte (halvtimmen avgör rutterna). Backas med samma rad och `*/30`. Kortet stängs efter tre dygn utan 546.
Sagt högt: svarstabellen (`net._http_response`) sparar bara sex timmar, så tre dygn läses som tre dygns stickprov — beviset tas
vid varje läsning (en dbknapp-fråga per dygn räcker). Ingen vakt räknar 546 i dag.

## #345 (24/9 2026) Skyltfondsrundan, Skyltfonden-paketet och #25 Halkbaneläget stängda på tavlan — följs utanför repot

**Beslut (Bengt 24/9: *"stäng skyltfondsrundan och skyltfondspaketet. Vi har koll på dessa på annat sätt. Stäng halkbaneläget vi har koll på den på annat sätt"*).** De tre korten stängs. Bengt och Axel följer Skyltfondsansökan (samtalen, sökande och roller,
sändningen 28/9) och halkbaneförsöket på annat sätt än genom tavlan. Kvar i repot som underlag, orört: `docs/FINANSIERING.md`
(ansökan, plan B, adresserna, föreningen som sökande) och BACKLOG punkt 25 (halkbanelägets form). Bedömningens datumrader för
28/9 och Skyltfondens besked står kvar som kalender, märkta att de följs utanför repot.

**Vad som inte längre bevakas här:** att ansökan faktiskt skickas 28/9, att ingen adress studsar, och vem som står som sökande.
Kommer ett besked eller en fråga som rör koden — till exempel att halkbaneförsöket beviljas och halkbaneläget ska byggas —
får det ett nytt kort då. Tavlan 50 → 47 öppna.

## #346 (24/9 2026) De äldsta korten: Android-testenheten in i #219, butiksuppladdningen in i #214, #21 stängt

**Beslut (Bengt 24/9: *"ja till de äldsta korten, slå ihop och stäng"*, ur förslaget i bedömningen §4.2).**
(1) **Fysisk Android-testenhet** (29/8) slås ihop i #219 *Android har ingen väg till en telefon*. Telefonen finns: Axels Android
med appen uppsatt sedan 20/9 (DECISIONS #280). Kvar är bara enhetsverifieringen i Play Console, och den följer med till #219
tillsammans med kortets Verify-rad (uppgiften *Kontrollera att du har åtkomst till en mobil Android-enhet* försvinner).
(2) **Butiksuppladdning + Data safety-inklistring** (29/8) slås ihop i #214 *Play-deklarationen*. Inklistringen är sista steget där
(formuläret likadant som filen, i samma commit som nästa uppladdning). Uppladdningen står redan i *Play: uppladdningsguide*, och
iOS går före Android (DECISIONS #320).
(3) **#21 Anonym puls + feedback-knapp** stängs. Feedback-knappen finns sedan 16/9 (S4, *Stämde/Stämde inte*, PR #290/#291). Den
anonyma pulsen förs till sensortrappan, Ä8 i bedömningen (mars 2027, efter vinterns domar), där telefonkedjan #237 tidigare
hänvisade till #21.
(4) **Intäktsmodellen**, som låg i Skyltfonden-paketet (stängt samma dag, DECISIONS #345), är ingen Skyltfondsfråga. Den förs till
vårlistan i bedömningen (*Efter mars*) bredvid betalviljan, så att den inte stängs med paketet.

**Sagt högt.** Inget arbete är gjort på korten — de byter bara hemvist. Tavlan 47 → 44 öppna.

## #347 (24/9 2026) Produktboken läst rad för rad mot koden — kort #217 klart, tre nya kort ur fynden

**Uppdraget (Bengt 24/9: *"gör kort 217"*).** Kortets Verify: varje rad i produktboken bevisad i kod eller struken, med färsk
skärmbild där det syns. Boken lästes hel (507 rader) mot motorn, publiceringen, skuggmotorn och båda apparna; skärmpåståendena
lästes av en sökagent och varje fynd som ändrade texten kontrollerades i koden innan det skrevs.

**De sex löftena från 20/9:** hastighetsgränsen i kameratexten struken (kamerafilen bär ingen gräns, grenen i motorn talar
aldrig) · viltrösten var redan rättad (#318) · "fyra flikar" skrivet om till två flikar och ett körläge — *Nära dig* finns inte ·
SMHI-pilen säger nu att varningarna följer med i snapshoten men att motorn inte läser dem · introduktionen märkt iOS, Androids
behörighetsväg beskriven · vektorerna 37, inte 23. Förvarningsreglaget beskrivs per plattform (iOS 400–3 000 m i steg om 100,
Android 500–5 000 m steglöst).

**Fler fel än kortet visste om:** flödesbilden lovade 45 s tystnad (10 s sedan 13/9) · grind A stod som *FALLEN* (klarad 23/9,
#321) och grindtabellen var från 13/9 · Om-citatet var det gamla löftet · Androids autostart beskrevs som *inget att ställa in* fast
den står av och ber om fyra behörigheter · guiden sades finnas i introduktionen · "Vakna själv" heter *Vaknar själv* · Norge stod
som väntande på Vegvesens konto · broarna sades ligga i appen · facitsvaret sades bära bara id, tid och svar (appens namn och
version följer med, som Play-filen redan deklarerar) · versionstabellen slutade vid 0.3.7 · avsnittet *iOS då?* var från 29/8.
Beskrivningen av skinnet gällde bara iOS; Androids avvikelser står nu i ett eget stycke.

**Skärmbilder:** de tre i boken bytta mot fotostudions artefakt 10778151609 (android.yml-körning 35922113783, cdd7889, 23/9 —
efter senaste Android-ändringen c1483be). Fotostudion tar sex bilder men bara tre skiljer sig: Om, Nära dig och Körläget är
inte längre egna skärmar.

**Tre nya kort ur fynden (TAVELREGELN):** #248 Android-autostarten stoppar aldrig vakten (en ny styrning skapas per händelse och
glömmer att vakten startades automatiskt; ingen tomgångsstopp heller) · #249 Om-avsnittet säger mindre än sanningen (Android
saknar ärlighetsraden och källorna, där Fintraffic och OpenStreetMap kräver att de anges; båda plattformarnas undantagstext säger
*"Inget annat"*) · #250 tre småfel (Android säger raden om gammal data två gånger, iOS körläge visar klockan nu vid Senast sagt,
fotostudions dubbletter). Androids skinnavvikelser skrivna på kortet *Skinnet v3 på Android*.

**Inte omprövat:** stegen i Genvägar-guiden (de beskriver Apples app, inte vår) och de historiska raderna i versionstabellen och
lärdomsavsnittet. Tavlan 44 − 1 + 3 = 46 öppna.


## #348 (24/9 2026) Axels beslut på #347:s frågor — texten skrivs om, källorna in i Androids Om, #248 och #250 byggda

**Axel 24/9 kväll:** *"Be din Claude gå igenom detta. Besluta att köra det han säger."* Claudes beslut, på Axels uppdrag:

1. **#249 (b): texten skrivs om, fälten stannar.** Appens namn och version gör facitsvaret tolkningsbart per bygge (vilken motor
   talade?), och de bär ingen plats. Undantagstexten säger nu *"… och ditt svar (Stämde / Stämde inte), plus appens namn och
   version …"* på båda plattformarna. Invariantregeln: integritet.html (23/9, #320) och PLAY-DATASAFETY.md nämner redan plattform och
   version; produktboken rättad i samma commit.
2. **#249 (a): ja — källorna och ärlighetsraden in i Androids Om,** ordagrant som iOS. Fintraffic (CC BY 4.0) och OSM (ODbL) kräver
   attribution när deras data når appen, så det är en licensplikt och inte ett val; frågan var ställd till Bengt men Axel äger besluten.
3. **#248 byggt.** Autostartens flagga (`autoStarted`) sparas nu i SharedPreferences och följer med varje ny styrning, så
   *Bluetooth kopplas från* och *bilen lämnas* stoppar en autostartad vakt. Manuellt stopp och självstopp nollställer den.
   Nytt: **självstopp efter en kvart stilla** (under 5 km/h), samma regel som iOS (`IdleStop`, ren klass). Tre nya JVM-prov.
4. **#250 byggt.** (a) Raden om gammal data nollställs vid vaktens start, inte vid första laddningen ⇒ en gång per körning.
   (b) iOS körläge visar när repliken sades (`lastSaidAt`). (c) Fotostudion tar tre bilder, inte sex; de tre borttagna var dubbletter.

**iOS-bygget höjt till 0.3.9 (15)** — texterna och körlägets klocka ändrade. **Sagt högt:** #248 är bevisat på JVM, inte i bil;
verify på en riktig Android-telefon (autostartad vakt stannar när bilens Bluetooth kopplas från) står kvar. Android-versionen är
inte höjd (inget uppladdat till Play). #250 (a) har inget JVM-prov: raden sitter i tjänsten, och flytten är två rader.

## #349 (25/9 2026) Kort #42: facit enligt §2, V-C från 15/9, C-station struken — definitionerna skrivna före första räkningen

**Beslut (Bengt 25/9: *"ja till 1, 2 och 3"*, ur förslaget i bedömningen §4.2).**
(1) **Grind V-B räknar facit så som TROSKLAR-VATTENPLANING §2 säger.** Knappen har sedan 16/9 skrivit *0 facitbekräftade händelser*
som en fast rad, och eftersom testarlogg kräver en röst som i sin tur väntar på V-C kunde domspärren aldrig släppa.
(2) **V-C räknas från 15/9**, vb-loggens start. §3 har inget fönster; måndagskörningen räknade 14 dygn.
(3) **Steg C:s stationshalva stryks** (kvar ur #81). V-A visade att stationerna inte bär intensiteten, och domen läser stationerna direkt
ur arkivet — ett stationsfält i snapshoten skulle inte läsas av någon.

**Definitionerna, skrivna innan något tal räknats (så att de inte formas av utfallet):**
- **Facitbekräftad händelse (V-C1):** en olycka i `situation_archive` (`message_type_value = 'Accident'`) som startar inom fönstret,
  ligger inom **2 km** från en svensk skuggrutt (`FACIT_KM`, samma radie som den delade facitlistan) och där den **dömande stationen**
  — närmaste station inom 10 km, samma som V-B1 — mätte regn (`rain_sum_mm > 0`) inom **±30 min** från olyckans start. Olyckan får
  bara bekräfta, aldrig fälla (§2:s asymmetri). Utan station inom 10 km är olyckan omätbar och räknas inte.
- **Fönstret** för V-C och för alla mått i knappen: från 15/9 till körningen.

**Sagt högt.** Det här är en operationalisering av §2, inte en ändring: inga tal i §3 rörs. Men dokumentet är kontrasignerat av Axel
(DECISIONS #68), så hans invändning tas upp före första dom. Antalet olyckor i regn längs rutterna är okänt; räcker det inte till 15
före domfönstret i nov/dec är nästa facitkälla kamerabilderna i hinken, som öppnas i mars (DECISIONS #248) — det blir en egen fråga då.

## #350 (25/9 2026) Grind V-B visar bara räkningar under spärren — och #349 byggt

**Beslut (Bengt 25/9: *"ja, bara räkningar under spärren"*).** När fönstret blev hela perioden (#349) skulle måndagskörningen visa
V-B:s andelar över allt som loggats, varje vecka, långt före domen. Nu skriver knappen under V-C:s spärr bara räkningar: varningar,
mätbara och omätbara, olyckor längs rutterna och hur många av dem som föll i regn, regndygn och län. Andelarna för V-B1 och V-B3 och
domraden skrivs första gången när V-C är uppfylld. Samma princip som dom-knappen för S-B. Körningarna 16/9 och 21/9 skrev andelar
över 14 dygn i Actions-loggen; de läses inte.

**Byggt i samma varv (`publish/grind-v-b.ts`, kort #42):** facit enligt #349 (`facit()`, samma dömande station och ±30 min som V-B1,
gränsen regn > 0), olyckorna hämtade inom 2 km från skuggrutterna med den delade facitlistans radie och rutter, fönstret från 15/9
(`dagarSedanStart()`, flödets standard är nu tomt), och en rad om väderarkivets hål: ett dygn helt utan väderrader i fönstret
redovisas som saknat — varningar och olyckor de dygnen blir omätbara, aldrig torra — så att en export och radering aldrig tyst
förvandlas till torka. Stationsindexet byggs en gång per körning i stället för en gång per fall, eftersom fönstret nu växer hela
vintern.

**Bevis före sammanslagning:** självtestet med sju nya fall (duggregn under tröskeln räknas som facit, torrt och omätbart gör det
inte, fönstret, och blindningen i båda riktningarna) och **två motprov, ett per vakt:** facit mot utlösarens tröskel i stället för
regn > 0 fäller *"olycka i duggregn under tröskeln räknas"*; utan spärrens `return` fäller *"under spärren: ingen procentsats"* och
*"ingen dom"*. Självtestet körs nu också i CI, inte bara i flödet självt.

## #351 (25/9 2026) Grind V-B: en station som är igång men tyst räknas som torr (kort #251)

**Beslut (Bengt 25/9: *"ja till 251, ±3 timmar"*), fattat medan V-C är spärrad och innan någon andel lästs.** Arkivet sparar bara
kalla, blöta eller ändrade avläsningar (DECISIONS #4), så en varm, torr och stilla station lämnade ingen rad, och V-B1 kallade
varningen OMÄTBAR fast en torr station är just ett falsklarm enligt §2. Första körningen 16/9 visade *TORRT = 0* (#212); 25/9 var 16
av 57 varningar och 84 av 98 olyckor omätbara. **Nu:** har den dömande stationen arkivrader inom ±3 h men ingen inom ±30 min var den
igång och torr — TORRT. Utan rader inom ±3 h förblir den OMÄTBAR. Rör §2:s mätning, inte §3:s tal; noten står i
TROSKLAR-VATTENPLANING §2. Axel kontrasignerade dokumentet (#68) och kan invända före första dom.

**Varför regeln inte gör en blöt station torr:** den levande ingesten sparar varje avläsning med regnflaggan på (regn de senaste tio
minuterna), så regn inom fönstret lämnar alltid rader. Kanteffekten som återstår: regn som slutade strax före fönstrets början kan ge en
30-minuterssumma över noll på en avläsning som inte sparades. En station som var igång före och efter men nere just i ±30 min räknas
också som torr — det är priset för ±3 h, valt av Bengt.

**Bevis:** självtestet med fyra nya fall (igång men tyst ⇒ TORRT, före och efter; tyst i ±3 h ⇒ OMÄTBAR; en olycka vid en tyst men
igång station blir torr — fällan ligger där den annars ger noll) och **två motprov:** utan tak på ±3 h fäller *"tyst i ±3 h är
omätbart"*; med tyst alltid omätbar fäller *"igång men tyst i ±30 min är torrt"*, *"igång efteråt"* och facitfällan. Ett gammalt fall
ändrades med beslutet, inte för bygget: *"utanför tidsfönstret är omätbart"* (en rad två timmar före) heter nu *"igång men tyst i ±30
min är torrt"*. Kortet stängs: Verify är självtestet och beslutet före första dom. I drift syns det på måndagens körning 28/9 som fler
mätbara varningar och fler torra olyckor.

**Rättelse 25/9 (granskningen av grindarna, kort #252):** premissen ovan är fel i ett led. Den levande ingesten, som ensam
skriver det svenska väderarkivet sedan 8/9, sparar en avläsning bara om ytan är ≤ 5 °C eller det regnar eller snöar
(`supabase/functions/ingest-live/index.ts:144`). Regeln om ändrad temperatur finns bara i den gamla ingesten. Regeln ovan
fångar därför bara en torr station som haft en kall eller blöt rad inom ±3 h; den gör inget fel, men hjälper mindre än
beslutet säger. Noten i TROSKLAR-VATTENPLANING §2 rättad i samma varv.

## #352 (25/9 2026) Granskningens sex förslag (kort #252) — definitionerna skrivna före bygget

**Beslut (Bengt 25/9: *"ja till 1 till 6"*; Axel via Bengt samma dag: *"har inget att invända"*).** Alla sex byggs. Varje definition
nedan är skriven innan någon kod eller något tal finns, och ingen av dem läser en andel.

1. **Censuren i grind A och vägpunktsgrinden mäts — bara antal.** För varje kall målhalvtimme (yta ≤ 5 °C, #75 och radvakten) i
   60 dygn: hur många av målets fem närmaste stationer inom 50 km (grindarnas grannval) har en arkivrad i samma halvtimme, och hur
   många saknar. En granne som saknas i en kall halvtimme är varm och torr eller nere — arkivet kan inte skilja dem, så talet är
   ett tak för censuren. Karantänen och den långsamma vakten tas inte med i räkningen (de rör 1–3 stationer per dygn och gör frågan
   tung). Ingen felkvot räknas. Resultatet avgör om nästa steg behövs: en rad i timmen per station i arkivet, eller en grind som
   prövar ankare ur nuläget.
2. **Frostgrindarna trycks om.** Vakthunden trycker de fem flödena (T-A 7 dygn, R-A 30 dygn Sverige, K-A 60, övergångarna 7, vind och
   sikt 14) **kl 09 UTC** ett dygn då minst 50 stationer haft ytan ≤ 0 °C det senaste dygnet, och **högst en gång per sju dygn**.
   Issuen om frosten skapas som förut vid första larmet, vilken timme det än är; tryckningarna skrivs som kommentarer på den, och
   den senaste kommentaren är klockan som räknar de sju dygnen. Kl 09 UTC ligger efter morgonen, så T-A ser hela natten. Frosten
   upphör ⇒ tryckningarna upphör av sig själva.
3. **S-B:** fönstret från 23/9 (prognosloggens start) i stället för 14 rullande dygn. C3 jämför med grind A:s dömda A2, **3,5 %**
   (DECISIONS #321, dokumentets *offsetbacktest 3.3*), utan inmatning; `--grindA2` får fortfarande ersätta talet. **B1 och C2 döms
   på holdoutens leave-one-out:** en *holdout-episod* är en station inom 2 km av rutten vars skattning ur de ÖVRIGA ankarna
   (`prognos.h`, fjärde fältet) är ≤ 1 °C i varv som ligger högst 2 h isär; stationens egen mätning i samma varv dömer — över +2 °C
   i något varv ⇒ FALSK, ≤ 1 °C ⇒ BEKRÄFTAD (en kamerabild med halka inom 2 km under episoden bekräftar också, fäller aldrig), annars
   OMÄTBAR. §2:s regel (stationen fäller, kameran bara bekräftar) står kvar; det som ändras är att stationen dömer en prognos som
   inte redan innehåller den. B3 och B2 döms som förut. I dom-läget skrivs andelarna först när C1 och C2 är uppfyllda, och
   underlagsläget slutar skriva antalet nederbördsmissar (det är ett utfall).
4. **Tystnadsfelet:** en halkvarning på ett segment (`seg:<id>`, sparad utan position) räknas som att systemet talade om
   segmentets linje i `road_conditions` ligger inom 2 km från händelsen. I dom-läget skrivs paret och priset bara när T5-underlaget
   (20 tillfällen i 3 halkperioder) är uppfyllt.
5. **Saknade dygn:** grind A, vägpunktsgrinden och K-A skriver ut dygn i fönstret som saknar arkivrader efter arkivets början —
   exporterade och raderade eller aldrig hämtade — och räknar inte dem som lugna. Arkivets början är det tidigaste av första
   exporterade dygnet och första raden, så att raderade dygn inte tas för dygn före arkivet.
6. **R-A:s spärr i stationstimmar:** R-A1 räknar episodernas sammanlagda längd i timmar (Σ minuter / 60) i den bästa kombinationen,
   inte antalet episoder. Episodlängden är sista minus första raden, så talet är något försiktigt.

**Sagt högt.** (3) ändrar vad B1 räknar och därmed C2:s nämnare; det är ett byte av mätning, inte av tröskel, och det görs innan
någon andel lästs. (2) gör fler Actions-körningar i vinter — fem flöden en gång i veckan medan frosten varar, någon minut vardera.

## #353 (25/9 2026) Arkivet sparar en rad per station och halvtimme även när stationen är varm och torr (kort #253)

**Beslut (Bengt 25/9: *"ja till 253"*).** Axel äger ingesten och informeras genom bedömningen §4.2; ändringen backas med en rad.
Mätt samma dag (kort #252): i kalla halvtimmar saknade 49,5 % av grind A:s grannplatser en arkivrad, eftersom den levande ingesten
bara sparade kalla eller blöta avläsningar (DECISIONS #4). Driftens prognos tar med de varma ur `weather_latest`; grindarna gjorde det
inte. Domarna #321 och #324 gäller därför ett snällare underlag än driften.

**Regeln i `supabase/functions/ingest-live`:** en kall eller blöt avläsning (yta ≤ 5 °C, regn, snö eller nederbörd) sparas alltid, som
förut. En varm och torr avläsning sparas bara om stationen saknar en arkivrad i samma halvtimme (`floor(epok / 1800)`, grindarnas
hink). Vilka stationer som redan har en rad i sina halvtimmar läses med EN fråga per körning över de tre senaste timmarna; en rad som
skrivs i körningen räknas in direkt, så att två varma avläsningar i samma halvtimme aldrig blir två rader. Fallerar frågan faller
ingesten tillbaka till den gamla regeln och skriver felet i svaret — ingesten är livemotorns och får aldrig stanna för en mätfråga.
Logiken bor i `arkivpolicy.ts` och prövas i `test/arkivpolicy.test.ts`.

**Vad det kostar och ger.** Ungefär dubbelt så många rader den första veckan (≈ 4,5 → ≈ 10 MB/dygn), sedan gallrar sql/014 allt
äldre än sju dygn till en rad per station och halvtimme ändå, så de äldre dygnen växer mindre. Exporten och raderingen (sql/034) tar
resten; gratisnivån påverkas inte. Varma rader hjälper också den långsamma vakten (ett varmt dygn döms inte längre på nattraderna
ensamma), #351:s torra station och V-A. Den gamla ingesten (`ingest/sources/weather.ts`) skriver inget väder sedan 8/9 och följer
inte med. Grindarna mäter från och med nu samma värld som driften; novembers skarpa prövning får veckor av ocensurerat underlag.

**Axels ja 25/9 (via Bengt: *"Axel säger ja"*):** ingesten är hans, och ändringen står nu på båda signaturerna.

## #354 (25/9 2026) Betalviljan stängs på tavlan och öppnas våren 2027

**Beslut (Bengt 25/9: *"stäng betalningsviljan och flytta kortet till att öppnas våren 2027"*).** Kortet *Betalvilja mäts i mars, inte
gissas i augusti* (en fråga i appen: *"N varningar i vinter — skulle du betala X för nästa?"*; vinterpass per säsong som kandidatmodell,
B2B som tak) stängs och står i vårlistan (bedömningen, *Efter mars*) bredvid intäktsmodellen.

**Sagt högt, så att det inte glöms i vår:** frågan i appen skickar ett svar och ändrar därmed produktinvarianten — CLAUDE.md:s rad,
Play-deklarationen, integritet.html och produktboken ändras i samma commit. Ska den ställas redan i mars 2027 måste beslutet och bygget
ligga i februari; öppnas kortet senare flyttas mätningen till nästa säsong. Övriga fyra i grupp A (#91, #96, #153, SYSTEM.md) står kvar.

## #355 (25/9 2026) #91 Kallplatslagret stängs på tavlan och öppnas våren 2027

**Beslut (Bengt 25/9: *"stäng 91 och flytta den till våren 2027"*).** Kortet — broar som specialfall av strukturellt kallare platser,
prövat som ett kallplatsindex mot grind A:s residualer (leave-one-out), annars läggs det ner — stängs och står i vårlistan (Ä6, mars).

**Sagt högt:** kortets inledning (grind A *föll* 12/9) är inaktuell — grind A klarades 23/9 (#321), och 25/9 mättes att hälften av
grannplatserna saknades i kalla halvtimmar (#352), vilket #353 lagar från och med nu. Residualerna som #91 ska förklaras mot blir
alltså först meningsfulla på vinterdata med de varma grannarna; våren är rätt tid. Kvar i grupp A: #96, #153 och SYSTEM.md-läsningen.

## #356 (25/9 2026) SYSTEM.md-läsningen stängs som kort och blir en rutin i kalendern

**Beslut (Bengt 25/9: *"stäng system.md-läsningen som kort"*).** Att läsa `docs/SYSTEM.md` mot koden varje månad är en rutin, inte en
uppgift som kan bli klar, och ett kort som aldrig kan stängas gör tavlan otydlig. Kortet stängs; läsningen står i bedömningens
kalender som en rad *Varje månad*, med nästa läsning i oktober (den första gjordes 22/9, underlag till Skyltfondens bilaga 3). Kvar i
grupp A: #96 och #153.

## #357 (25/9 2026) #96 höjdprovet står kvar — med datum 23/10

**Beslut (Bengt 25/9: *"ja, behåll 96 med datum 23/10"*).** Kortet stängs inte. Mätningen hade inte gått förlorad (måndagsschemat,
#324, TROSKLAR-SKUGGAN §3, vårlistan Ä5), men frågan — ska höjden in i segmentprognosen? — hade inget datum och ingen ägare utanför
kortet. Och den blev viktigare 25/9: höjdvarianten (A2 4,7 %, oavgjord, hjälper inom 7 km och stjälper längre bort) prövades på ett arkiv
där hälften av grannarna saknades, just de varma (#352) — där höjdskillnaden spelar roll.

**Datumet:** omkring **23/10**, efter fyra veckor med de varma grannarna i arkivet (#353, i drift 25/9), läser Claude vägpunktsgrindens
RÅ mot RÅ+HÖJD ur måndagskörningen, och beslutet om höjden tas före novembers skarpa prövning. Datumet står på kortet, i kalendern under
oktober och i vårlistan Ä5. Kvar i grupp A: #153.

## #358 (25/9 2026) #153 delas: beslut 1 står kvar med datum, beslut 2 flyttas till våren 2027

**Beslut (Bengt 25/9: *"ja, dela 153"*).** **Beslut 1 — allvar som försprång** (eget `leadM` per fara, 400–3 000 m; aldrig ordval, aldrig
prioritet) står kvar på kortet, nu med datum: senast när betan startar i november skrivs dess tröskeldokument (steg 4), så att skuggan
går december–februari och domen kan falla i mars 2027; stängt till våren hade domen flyttats ett år. Steg 3 (skattarens nivå, S2) är
klart sedan 24/9. **Beslut 2 — det smalare undantaget** (en modellerad temperatur får utlösa bara mellan två närliggande stationer som
är eniga om tecknet) är blockerat av tröskelregeln T5 och saknar ett vittne på platsen; det flyttas till vårlistan (Ä8) bredvid
sensortrappan, vars telefonsensorer är just ett sådant vittne.

**Beroendet som följer med beslut 2 (Bengts fråga samma dag):** det strider inte mot beslut 1 utan bygger på det — beslut 1:s gradering
(uppmätt/modellerat) är språket som gör en modellerad varning säker, så 1 före 2, aldrig tvärtom. Taket för undanträngda varningar i
beslut 1:s steg 4 ska gälla båda, och beslut 2:s 0,33 °C (grind A inom 7 km) mäts om på de varma grannarna (#353) innan det tas upp.

## #359 (25/9 2026) TROSKLAR-FORSPRANG fastställt, och försprångets skugga byggd (kort #153 beslut 1, steg 4 och 5)

**Beslut (Bengt 25/9: *"ja, skriv tröskeldokumentet för beslut 1 nu och Axel ger ok till allt som behövs för att göra beslut 1 färdigt
idag"*).** `docs/TROSKLAR-FORSPRANG.md` är fastställt av Bengt och kontrasignerat av Axel (via Bengt) samma dag, innan någon mätning finns.
**Färdigt i dag är steg 4 och 5.** Steg 6 (domen) kräver vinterns data och steg 7 (tre portar) kräver domen — husets egen regel, inte
en fråga om ok.

**Vad dokumentet slår fast.** Försprång gäller bara A1 halt väglag och A2 frysrisk — inte olyckor, kameror eller vilt. **Nivå 2:** A1 med
väglagskod 3 eller 4; A2 med ytan ≤ 0 °C och stationen blöt inom 2 h (väta ≥ 3 av 4). Allt annat är nivå 1 med dagens 30 s. **Svep för
nivå 2:** 45 · 60 · 90 s, klämt till samma 400–3 000 m; valregeln är det kortaste värde som klarar grindarna. **Grindar:** FS-A (nivå 2
i 5–50 % av varningarna; kod 3 eller 4 ska finnas i arkivet), FS-B (vinst ≥ 15 s i median · undanträngning ≤ 2 % och noll olyckor ·
takten inom 60 s ökar högst 5 procentenheter · högst 1 % nya varningar), FS-C (≥ 60 nivå 2-varningar per svepvärde, ≥ 3 halkperioder,
≥ 3 län). Bara räkningar under spärren.

**Vad som byggdes.** Motorn fick en valfri krok för förvarningsavståndet per fara, klämd till 400–3 000 m; utan kroken är motorn byte för
byte densamma (vektorerna oförändrade, generatorn ren). Nivåer och svep bor i `engine/src/forsprang.ts`. Skuggmotorn har läget
`?lage=forsprang`, på **:12/:42** som eget jobb (sql/037, kommandot kopierat inne i databasen), med loggen `forsprang_log`. Provet
`forsprangprov` i mätknappen visar bas mot variant på ett påhittat spår. **Bevis före sammanslagning:** 7 tester och 3 motprov (taket,
att nivå 1 är orörd, nivågränsen), alla fällda på rätt test.

**Varför eget anrop — fyndet som ändrar kort #244.** CPU-felen 546 kom **04:32 och 05:02Z 25/9**, på skuggmotorns nya minuter. Flytten
från :00/:30 till :02/:32 (DECISIONS #344) löste alltså inte felet: det är skuggmotorns eget arbete (segmentprognosen och holdout sedan
23/9) som slår i taket, inte en krock med andra jobb. Försprånget läggs därför i ett eget, lätt anrop. Huvudvarvets tak är en egen fråga
på kort #244.

**Kvar:** FS-A kräver vinter (arkivet har bara kod 1, och ingen yta under noll med färskt regn i september). Dom-knappen byggs före
mars. Steg 7 efter domen, med Axels röst oförändrad.

## #360 (25/9 2026) Skuggmotorns huvudvarv lagat med rutfiltret — samma utfall, en bråkdel av arbetet (kort #244)

**Beslut (Bengt 25/9: *"laga skuggmotorns huvudvarv på kort 244"*).** Flytten till :02/:32 (DECISIONS #344) löste inte CPU-felet 546 —
det kom 04:32 och 05:02Z 25/9, på de nya minuterna (DECISIONS #359). Felet följer alltså skuggmotorns eget arbete. Två loopar prövade
hela Sverige för varje rutt: **motorn** prövade varje fara (tusentals kameror, olyckor och stationer) i varje fix (några tusen per rutt),
och **segmentprognosen** mätte avståndet från varje provpunkt till alla ~744 ankare. Prognosen och holdouten kom 23/9, och 546 började
24/9 00:30 — det var droppen, inte hela kärlet.

**Lagningen — rutfiltret (`engine/src/rutfilter.ts`).** Före motorn tas faror bort som ligger längre från rutans ruta än motorns längsta
räckvidd (olyckornas 10 km, härledd ur `DEFAULT_CONFIG`) plus 5 km; ett segment behålls om dess egen ruta skär rutans, så ett långt
segment som korsar rutten aldrig tappas. Före prognosen tas ankare bort som ligger längre bort än prognosens grannradie (`MAX_KM` 50 km)
plus holdoutens 2 km plus 3 km. **Utfallet är detsamma byte för byte:** en fara bortom räckvidden kan aldrig tala, och ett ankare bortom
50 km kan aldrig väga in. `n_hazards` i skuggloggen är fortsatt hela snapshotens antal. Försprångets anrop använder samma filter. Svaret
bär nu tiden per steg (`ms`: motor, prognos, facit, totalt), eftersom funktionsloggen bara finns i Axels panel.

**Bevis före sammanslagning:** tre tester — samma varningar och samma undanträngda med och utan filtret (med minst tre varningar i
jämförelsen, bland dem ett långt segment vars brytpunkter ligger över 100 km bort), olyckan 9 km från rutten kvar, samma prognos och
holdout — och **tre motprov**, ett per vakt, fällda på rätt test. Vektorerna oförändrade. **Verify står kvar:** tre dygn utan 546.


## #361 (25/9 2026) Nederbördstypen: mätningen finns redan, tröskeldokumentet fastställt, domen byggd och spärrad (kort #45)

**Beslut (Bengt 25/9: *"ja till 1, 2 och 3"*)** på rekommendationen i bedömningen §4.2: (1) mät premissen, (2) skriv tröskeldokumentet
innan någon siffra läses, (3) bygg klassningen per station före december. **Axels kontrasignatur på dokumentet väntar** (§4.2).

**Steg 1 ändrade formen** (`scripts/matningar/nederbordstyp-ordlista-2026-09-25.sql`). Trafikverkets `precipitation` är en UPPMÄTT typ,
inte ett ja/nej: på 30 dygn `no` 177 888 rader, `rain` 144 908, null 17 269 (134 stationer), `sleet` 32 (14 stationer, 8–24/9) och `snow`
7 (18/9). Luft och fuktighet finns i 99,98 % av nederbördsraderna och hos 752 av 844 stationer; spannen håller. Vid en station med
typgivare är sorten alltså en mätning (T4). Våtbulben behövs bara där ingen givare ser och får där bara stärka (T3/T6), och givaren blir
modellens facit på samma plats. Kortets invändning från 4/9 (ingen tät serie av fuktighet) är överspelad sedan #353.

**Steg 2: `docs/TROSKLAR-NEDERBORDSTYPEN.md`.** Våtbulb ur WMO:s psykrometerekvation. Klass: Tw ≤ L snö, däremellan slask, Tw ≥ U regn;
svep L {0; +0,5} × U {+1,5; +2,0}, kortets 0/+1,5 primärt, valregel lägst farligt fel. Facit: stationens givare och SMHI:s rådande väder
(parameter 13, 162 aktiva stationer, läst i SMHI:s API 25/9), par inom 5 km. Grindarna: **NT-A** givaren mot SMHI · **NT-B** modellen vid
stationen (träff ≥ 80 %, det farliga felet ≤ 10 %, slask ≥ 40 %, två av tre vintermånader) · **NT-C** lämna-en-ute med segmentprognosens
grannmodell · **NT-D** giltighet (≥ 100 snö- och ≥ 40 slaskepisoder, 30 stationer, tre av fyra breddgradsband, 10 slaskdygn, 50
SMHI-partimmar). Domspärr: bara räkningar på facitsidan till 1 mars 2027. Inget utfall når rösten — #45 är meta (kartan §7.8).

**Stulls formel föll på sin egen kontroll** innan dokumentet checkades in: den ligger 0,2–0,7 °C för lågt nära 0 °C (vid +2 °C och 80 %
gav den +0,25 mot psykrometerns +0,77) — just där gränserna ligger. Psykrometerekvationen valdes; ingen mätning var läst.

**Steg 3: byggt och spärrat.** `engine/src/nederbord.ts` (våtbulb, klass, givarens ordlista, SMHI:s koder; 6 tester) och
`scripts/grind-nt.ts` (knappen `grind-nt`, självtest i CI; läser arkivet en dag i taget genom #75, radvakten och karantänen). **Ingen
skuggkolumn och inget nytt jobb:** allt domen behöver ligger redan i arkivet, och SMHI hämtas vid domen ur `latest-months` (≈ 130 dygn) och
`corrected-archive` — samma väg C som radarn (#223). Beroendet som följer: arkivet eller dess export måste gå att läsa i mars
(återläsningssteget, #334). Fyra motprov, ett per vakt, fällde på rätt rad: klassgränsen, torrorden i kontraktsgrinden, spärrens utskrift
och episodluckan. Torrordsprovet missade först, eftersom kontraktsgrinden bara läser `git ls-files` och modulen var ospårad.

**Kända luckor, sagda nu:** underkylt regn syns inte i våtbulben och saknar eget ord hos Trafikverket; SMHI:s kod 156 är underkylt enligt
WMO fast listan säger "Tätt duggregn"; Norge viker in `sleet` i `snow`.

**Bevis efter sammanslagningen (spärrkörning 25/9 13:07Z, run 36138915848, 30 dygn):** knappen går mot riktiga data och skriver bara
räkningar. Givarklasser per station och halvtimme: regn 62 628 rader (745 stationer), slask 17 (11), snö 1; 596 rader i bandet, varav 244
med minst två grannar; 757 stationer med luft och fuktighet, 756 med typsträng; **43 SMHI-par inom 5 km**; 2 057 partimmar med en vägrad
inom ±10 minuter. NT-D står på 1/100 snöepisoder och 14/40 slaskepisoder — september, som väntat. **Två räkningar är låga av en känd
orsak, inte av skriptet:** före #353 (25/9 07:20Z) sparades inga varma torra rader, så grannar och vägrader saknas i septemberdata. Vintern
sparar kalla rader alltid. Tidsparningen håller efter gallringen: stationerna mäter var 5:e minut och gallringen behåller halvtimmens
senaste rad, 4:57 före hel timme (`scripts/matningar/nederbordstyp-tidsparning-2026-09-25.sql`).

## #362 (25/9 2026) Axel kontrasignerar TROSKLAR-NEDERBORDSTYPEN (kort #45)

**Beslut (Axel 25/9, via Bengt: *"Axel säger ja till tröskeldokumentet"*).** `docs/TROSKLAR-NEDERBORDSTYPEN.md` (DECISIONS #361) är
fastställt av Bengt och kontrasignerat av Axel, oförändrat — gränserna, svepet, facit, grindarna NT-A–D och domspärren gäller som
skrivna. Inget utfall är läst: den enda körningen mot data (25/9 13:07Z) var spärrad och skrev bara räkningar. Ändringar före domen
följer dokumentets §8. **Nästa punkt är domen, tidigast 1 mars 2027** (`grind-nt`, läget `dom`); inget mer väntar före den.

## #363 (25/9 2026) Rimfrosten och förstärkarna döms ur arkivet, inte i skuggkolumner (kort #46, #90, #95 d, #103)

**Beslut (Bengt 25/9: *"ja till 1 och 2"*)** på rekommendationen i bedömningen §4.2, efter hans iakttagelse i systembilden att
rimfrosten och förstärkarna ligger efter. **Läget:** A-grindarna R-A, W-A, F-A och K-A är byggda, kördes 24/9 utan underlag (#331) och
startas av frostflödet; ingen B-mätning var byggd, och alla fyra dokument byggde skuggkolumnen först när A passerat — vid sen frost mitt
i vintern, med tunt underlag i mars. **Läsningen per kort** (bara läsning):

| Kort | B-grinden mäts per | Fälten i arkivet | Uppspelning |
| :-- | :-- | :-- | :-- |
| #46 rimfrosten | station och halvtimme (R-B1, R-B2) | yta, daggpunkt, luft, fuktighet, sikt, nederbörd; molnet ur SMHI i efterhand (130 dygn) | **ja** — R-B3 redovisas per station och frostdygn |
| #90 vind och sikt | halkfall (W-B4) · rutt (W-B5, roll A) | vind, byvind, sikt; halksträckorna ur `road_condition_history` | **ja** — W-B4 per fall; rutterna körs med farorna återskapade ur arkivet som i missmätningen (efter #255) |
| #95 d SMHI-förstärkaren | stationstimme | varningarna med område och giltighetsfönster sedan 12/9 (sql/015) | **ja** |
| #103 frysklassningen | bekräftat halktillfälle | grind A:s population, samma lämna-en-ute som K-A redan kör | **ja** |

**Ändrat i de fyra dokumenten**, enligt deras ändringsregel (före första skuggkörningen, en rad här): "skuggkolumnen byggs" blir
"uppspelningen byggs, spärrad som grind NT", E0 heter "bara mätning". **Låsankaret flyttas:** regimen var knuten till *första
skuggkörningen*, som nu aldrig inträffar — ankaret är i stället den första körning som läser ett B-utfall. Utan den flytten hade
trösklarna i praktiken aldrig låsts. Rimfrostens uthållighet R3 räknas i halvtimmar i uppspelningen (30 min = två följande rader),
eftersom gallringen lämnar en rad per halvtimme efter 7 dygn. **Inga trösklar, svep eller facit är ändrade.**

**Vad som följer:** inget behöver byggas i skuggmotorn före frosten. Uppspelningarna byggs när respektive A-grind passerat, före domen.
Beroenden: arkivet eller exporten måste gå att läsa vid domen (#334); W-B5 och roll A kräver kort #255:s rättelse av missmätningen.
Facit är fortfarande den svaga länken (`road_condition_history` står nästan still till vintern, kamerafacit öppnas i mars) — oavsett
om B mäts i skugga eller ur arkivet.

## #364 (25/9 2026) Kort #255: rekonstruktionens fukt rättad och flyttad till en egen modul — missmätningen stängs inte

**Beslut (Bengt 25/9: *"gör kort 255"*).** `publish/missar.ts` byggde fukten som `COALESCE(precipitation,'') <> ''`, så Trafikverkets
"no" blev fukt och varje torr station fick frysrisk i rekonstruktionen — samma fälla som `Boolean(precipitation)`. **Lagningen:**
`hazardsAt` flyttas till `publish/rekonstruktion.ts` med `FUKT_SQL`, snapshotkärnans torrord i kontraktsgrindens form, så att en lista
som glider isär fälls i CI. Missmätningen importerar modulen; i övrigt är skriptet orört.

**Bevis:** provet `#255 rekonstruktionen` i `test/integration.test.ts` kör den riktiga frågan mot PostGIS i CI — "no", "Dry" och null
torra; regn, snö och en tiominuterssumma med regn blöta, som snapshotkärnans `fukt`. Grönt i PR #593 (205 av 205, inget hoppat över).
**Motprov** (PR #594, stängd): den gamla formen återinsatt, osynlig för kontraktsgrinden (alla 51 kontrakt höll). Provet föll på
rätt rader, `R255-NO` och `R255-DRY` blöta, 204 av 205.

**Körs `missar.yml`?** Nej: sex gånger 29/8 (tre fel innan det gick), aldrig sedan. Kortets verify sa "annars stängs skriptet i stället".
**Det stängs inte**, eftersom rekonstruktionen sedan DECISIONS #363 är det W-B5 och roll A ska spelas upp med — och flytten till en egen
modul är just för den användningen. Om själva veckomätningen (#19) ska stå kvar bredvid tystnadsfelet (#98) och grind S-B hör till
kort #254 (h).

**Kvar i #254 (h), nu villkor för #363:s W-B5 och roll A:** rekonstruktionen saknar vakterna (#75, radvakten, karantänen, den
långsamma vakten), och — **nytt fynd 25/9** — den släpper in varje segment ur väglagshistoriken oavsett kod, även kod 1 utan halkord
som snapshoten aldrig publicerar (kort #97:s kodgrind). Båda gör uppspelningen mer larmbenägen än motorn.

## #365 (25/9 2026) Kort #254: granskningens äldre fel — fyra byggda, fyra avskrivna med skäl; rättelse av #364

**Beslut (Bengt 25/9: *"gör kort 254"*).** Kortets Verify: varje punkt byggd med självtest och motprov, eller avskriven med skäl här.
Först mätt, som kortet sa: täckningen sedan #353 är **829–833 av 834** aktiva stationer per halvtimme (11:00–13:00Z,
`scripts/matningar/tackning-halvtimme-2026-09-25.sql`) — de varma och torra stationerna har rader nu.

**Byggda:**

| | Fel | Lagning | Bevis |
| :-- | :-- | :-- | :-- |
| **(d)** | T-A:s *kl 03–07* och natten räknades i UTC (`EXTRACT(hour)` i sessionens zon) | timmen och natten i `Europe/Stockholm`, i TypeScript; natten skiftas 12 h som förut (`NATT_SKIFT_H`, nu i kontraktet "Nattens gräns") | självtest sommar- och vintertid; motprov (zonen UTC) föll på "kl 04 i Sverige" |
| **(c)** | K-A, R-A, vind och sikt och SMHI-förstärkaren skrev andelar under spärren; R och F tabellen före spärren (C4) | spärren skrivs FÖRE tabellen; under den visar tabellen bara räkningar (och K-A täckningen) — som V-B (#350) | en radfunktion per knapp med självtest; fyra motprov, ett per knapp, föll på "spärrad rad visar ingen …" |
| **(g)** | orsaksklassningen tog de åtta närmaste RADERNA utan avståndsgräns — en glest mätande närmaste station kunde överröstas | `nederbordVid`: den närmaste STATIONEN (TROSKLAR-SKUGGAN §2 ordagrant), inom `MAX_KM` 50 km — ingen ny siffra. **Skärpning** (§5): utan station inom radien är orsaken okänd och bokförs som förut på utstrålningen (B2), aldrig som ursäkt | prov mot PostGIS (torr närmaste station avgör; 60 km bort ger null); motprovet (åtta rader) föll |
| **(h)** | rekonstruktionen läste frysriskpunkter utan vakterna | #75, radvakten och karantänen med den långsamma vakten, importerade ur snapshotkärnan; **missmätningens knapp stängd** (`publish/missar.ts`, `missar.yml` borttagna — kördes senast 29/8, ersatt av tystnadsfelet #98 och grind S-B, som mäter missar mot den delade facitlistan med skuggmotorns egna rutter); modulen står kvar för #363 | prov mot PostGIS (givarfel, radvakt och karantän tysta, blixthalkan talar); motprovet (vakterna bort) föll |

Motproven för (g) och (h) kördes i CI (PR #596, stängd) och var osynliga för kontraktsgrinden — alla 51 kontrakt höll, så det
var proven som föll. Hela sviten 207 av 207 i PR #595.

**Avskrivna med skäl:**
- **(a) V-A** prövade bara timmar där målstationen hade en rad och dolde falsklarm. Snedvridningen gynnade V-A, som ändå föll på
  träffen — nej-domen står. Orsaken är borta vid källan sedan #353 (täckningen ovan), så V-A:s veckokörningar räknar rätt framåt.
- **(b) Övergångarnas 0d** kastade tysta torra perioder. Det var rätt beteende: tyst är inte torrt. Med #353 har de torra
  perioderna rader, och den första torrperioden på fem dygn som helt ligger efter 25/9 07:20Z går att döma från 30/9.
- **(e) Tystnadsfelet:** en miss vid en station utan rader blir *okänd*. Det är dokumentets egen klass — en ursäktlig miss
  kräver att radarn såg nederbörd **medan stationen var torr** (TROSKLAR-TYSTNADSFEL), och det går inte att fastställa utan
  rader. Efter #353 händer det bara när en station är nere.
- **(f) S-B:s missfönster 2 h** mot flottans 3,5 h mellan varven snedvrider inte B2: utan körning inom 2 h blir händelsen
  OBEDÖMBAR, inte en miss, och räknas redan för sig. Priset är underlag, inte riktning — och 2 h är dokumentets egen definition
  (TROSKLAR-SKUGGAN §2); ett längre fönster skulle döma prognosen på äldre körningar.

**Rättelse av #364:** där stod att rekonstruktionen "släpper in varje segment oavsett kod … och gör uppspelningen mer
larmbenägen än motorn". **Det är fel.** Motorn tystar själv kod 1 utan halkord (`engine/src/engine.ts`, `evaluateSegment`), så en
sträcka med "Normalt" talar lika lite i uppspelningen som i bilen. Upptäckt när lagningen skulle skrivas.

**Nytt fynd, eget kort #256:** uppspelningen av efterhalkan (`sql/028`) räknar natten i UTC (`AT TIME ZONE 'UTC'`), medan R-A och
nu T-A räknar i svensk tid. Kontraktet "Nattens gräns" vaktar bara att talet 12 är detsamma, inte zonen.

## #366 (25/9 2026) Kort #256: uppspelningens natt räknas i svensk tid — samma natt som T-A och R-A, och kontraktet vaktar zonen

**Beslut (Bengt 25/9: *"gör kort 256"*).** `uppspelning_efterhalka()` (`sql/028`) skiftade natten 12 h i UTC, medan R-A och sedan
#254 d även T-A skiftar i `Europe/Stockholm`. DECISIONS #246 säger att de tre ska mena samma natt; kontraktet "Nattens gräns" vaktade
bara talet 12. **Lagat:** natten är `((t AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date`. Episoden bokförs som förut på
det UTC-dygn den började, och stationer och ögonblick redovisas per UTC-dygn — bara nattindelningen är ändrad. Nytt kontrakt **"Nattens
zon"** vaktar zonen i alla tre kopiorna (T-A:s `ZON`, R-A:s svenska `TZ`, uppspelningens `AT TIME ZONE`), golv 3.

**Migrationen redigerad på plats, inte en ny fil** (kortets Verify sa "ny migration"). `sql/028` är idempotent (släpper signaturen och
skapar om), CI:s prov läser den filen, och en `sql/038` bredvid hade lämnat två definitioner i repot, där den gamla med UTC-natten
hade fällt det nya kontraktet. Körd i drift med databasknappen 25/9 (run 36147121022): en signatur, den svenska natten finns i funktionen
och UTC-natten är borta.

**Bevis:** fall J i uppspelningsprovet — två ögonblick en halvtimme före och efter lokal middag — är två nätter i svensk tid men en i
UTC. Grönt i PR #597 (207 av 207). **Motprov:** kontraktet fällde både den gamla UTC-formen och den nya formen med zonen UTC; och i CI
(PR #598, stängd) fällde fall J en mutation som kontraktsgrinden inte såg (episoden vald på en extra UTC-natt): väntat 2, fick 1.

**Uppspelningen körd om och jämförd** (`scripts/matningar/uppspelning-natt-2026-09-25.sql`, före och efter): kombinationen 2
episoder · 4 ögonblick · 2 dygn, utan blöt 12 · 27 · 7, utan faller och utan blöt 204 · 7 380 · 12 — **identiskt**. Ögonblicken lika
bekräftar samma population. Episoderna lika är väntat: de två zonerna delar natten olika bara för ögonblick mellan kl 12 och 14 svensk
tid, och septembers kandidater i bandet +1…+3 °C ligger på natten. Skillnaden kan synas en mild vinterdag med töväder mitt på dagen.

## #367 (25/9 2026) Tiden i systemet: NT:s dygn i svensk tid, och kontraktet "Givarfelsdygnets zon"

**Beslut (Bengt 25/9: *"ja till a och b"*)** på kartläggningen i bedömningen §4.2 (Bengts frågor samma dag: *"mäter de utc eller svensk
tid och har det någon betydelse"* och *"kan det uppstå problem om de olika sakerna sammanförs"*). **Svaret som ligger till grund:**
lagring, källor, scheman och bokföringsdygn räknar i UTC med flit; fysiken som följer dygnet (T-A, R-A, rimfrostanalysen, uppspelningens
natt) i svensk tid; apparna visar enhetens tid och skickar UTC. Problem kan bara uppstå där två delar paras på en ETIKETT (dygn, natt,
timme) räknad i olika zoner — aldrig där de paras på exakta tidpunkter och fönster. Databasens sessionszon mätt till UTC.

**(a) Grind NT räknar dygn och månader i svensk tid** (`scripts/grind-nt.ts`, `lokalDag`): NT-D:s slaskdygn och B4:s vintermånader.
I UTC blev en slasknatt över midnatt UTC två dygn, och kravet ≥ 10 skilda dygn nåddes lättare. Dokumentet ändrat enligt §8 (skriftligt,
en rad här, Bengts ja) — före första domläsningen. Självtest för sommar- och vintertid; motprovet (zonen UTC) föll på "22:30Z 24/9 är
25/9 i Sverige".

**(b) Kontraktet "Givarfelsdygnets zon"** (`scripts/kontraktsgrinden.ts`): den långsamma vakten skriver `givarfel_dygn` per UTC-dygn
(sql/030) och snapshotkärnan, bunten, trendberäkningen (sql/018) och uppspelningen (sql/028) slår upp det på samma etikett. Kontraktet
kräver samma zon hos skrivaren och alla läsare, golv 5 (15 förekomster i 8 filer med mätfilerna). Motprovet (sql/018 i svensk tid) föll.
Den långsamma vakten själv står kvar i UTC-dygn: en frostnatt delas av midnatt i båda zonerna.
