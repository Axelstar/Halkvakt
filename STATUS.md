# STATUS — Halkvakt
*Updated by Claude at the end of every session. Read this first.*

## Current state (2026-08-31, verifierat live i STATUS-varvet)
- **Fas 0 avslutad i praktiken — vi är i TestFlight-fönstret.** iOS 0.3.0 (3) uppladdat
  till App Store Connect 31/8 ~10:10, 90 min efter kontoköpet. Android 0.3.0 är
  släppfärdig (signerad AAB byggs i CI vid varje push); Play-kontot ännu inte köpt.
- Datapipen lever och är färsk: `meta.json` och appens `manifest.json` genererade
  08:11:42Z, hämtade 08:17Z — 6 minuter gamla. 2 776 kameror, 818 väglagssegment,
  845 stationer, 1 avvikelse, 5 viltolyckor senaste veckan (vanligast älg).
- CI helgrönt: senaste 40 körningarna över `ci`, `ingest`, `publish-map`, `ios-engine`
  är 40/40 success. `android`, `missar`, `marknadsforing` gröna vid senaste körning.
- Skuggflottan i drift: 138 provkörningar, 99 röstvarningar, senaste 08:00 idag.
  9 rutter har talat, 11 är tysta (korrekt — augusti).
- Väntelistan: **4 anmälda.** Play kräver 12 i 14 sammanhängande dygn (se tavlan).

## Phase 0 exit criteria — DOM FÄLLD 2026-08-31 (checkdatumet)
- [✗→~] **Ingest grön 7 dygn i rad: UNDERKÄNT på kontinuitet, godkänt på kod.**
  Ärligt: 27/8 och 28/8 körde ingest 2 gånger per dygn i stället för 24 — GitHub-cron
  svalt (13 h-hål uppmätta). Enda röda körningen i perioden (29/8 19:11) var en manuell
  `workflow_dispatch`, inga schemalagda körningar har fallerat. Rotorsaken är åtgärdad:
  Supabase-pulsklockan trycker sedan 29/8 på dispatch-knapparna. **Ny klocka startad
  2026-08-29 → nytt checkdatum 2026-09-05.** Mätning sedan dess: 17/30/10 körningar per
  dygn, alla gröna.
- [✓] **Publik karta: KLART.** Pages-växeln är på — index/karta/testbilarna/integritet
  svarar 200 live 31/8.
- [✓] **Replay-riggen: KLART** (BACKLOG #3, S3) — 13 vektorer gröna, deterministiska
  omkörningar byte-identiska, Skåne-fixturen med.
- [ ] **Kill-kriteriet: ÖPPET** — kräver riktig halka (sep/okt, Norrland). Faller inte
  förrän vädret levererar. Skuggflottan + missmätningsskriptet står redo som domare.

## Waiting on Axel
- **Google Play-kontot** (25 USD) — enda återstående köp; 14-dagarsklockan startar där
- **Testare**: 4 på väntelistan, 12 krävs (se TAVLA)
- Revoke the unused second PAT (public-read-only one from 2026-08-24) — ej verifierad

## Session log
- **S-2026-08-25em**: Startsidan = scrollvärlden (4 filmscener). Kvittot v2 "Filmremsan":
  4 nya filmpaneler (3316/10076/17376/64) tänds i snabb takt efter världen; final =
  hård klippning till SVART med logotyp + Google Play/App Store centrerat och
  live-tickern som eftertext (Axels regi). Betaspråket rivet sajten runt —
  "släpps i vinter", släppmejl-rad i footern (source: release). Livemotorn (beslut
  #19) i drift: minutfärsk ingest via edge function + pg_cron. Sticky-läxan
  (overflow-x:clip) i DECISIONS #20. Axel iPhone-testar filmer + kvitto.
- **S-2026-08-25em (forts):** Varumärkessvep alla sidor: Skylten i header på karta+om,
  favicon-länk + og-taggar på index+karta (saknades!), ny og.png (1200×630, Skylten),
  betaspråk utrensat överallt, beta.html → redirect, sitemap städad, kartpanelens
  kö-formulär → släppdagsspråk. Bugg lagad: om.html:s JSON-LD-öppningstaggar hade
  halshuggits vid morgonens SEO-flytt → rå JSON syntes som sidtext; återställda och
  JSON-validerade. Filmpaneler/FAQ/footer rivna på Axels order — sidan slutar på
  svart final (logo + butiksknappar + ticker).
- **S-2026-08-25kväll:** Beslut #22 — minutdiet (Actions ~3 600→~1 750 min/mån, under
  gratistaket) + vakthund för livemotorn i hälsokollen (15-min-trösklar på
  deviations/road_conditions + pg_cron-puls). Skarpverifierad mot prod, HEALTHY.
- **S-2026-08-25kväll (forts):** press.html live (presskit m. live-siffror, boilerplate,
  logotyppaket); marknadsmotorns texter sanerade från betaspråk + pressnotis
  länkar kitet. Provkört: 0 beta-träffar i utkast.
- **S-2026-08-25natt:** Livemotorn HÄRDAD — fail-closed INGEST_KEY + cron-header
  (utan nyckel 403 / med nyckel ok / cron succeeded, allt produktionsbevisat).
  RUNBOOK: nytt kapitel "Livemotorn" (felsökningstrappa, rotation utan nertid,
  kadens-tabell, token-förnyelseklocka ~nov). Kvällsrond: alla 5 sidor 200.
  Vakthunden bevakar nu även WEBBENS ålder (meta.json >90 min ⇒ incident; skarpkvitto
  "50 min, limit 90, HEALTHY"). OBS: publish-*/30-schemats första tick släpade (GitHub-
  cron-skew) — manuellt publicerad som brygga; om webbvakten larmar i morgon: kolla att
  schedule-körningar rullar i Actions.
- **S-2026-08-25sen kväll:** Mobilfilm-fix efter Axels iPhone-dumpar (scen 2 grå/4 svart):
  rotorsak = SVG-gradient-"postrar" + lat klipphämtning som förlorar mot tummen på 4G.
  Åtgärd: riktiga posterbildrutor ur klippen (~105 KB, syns direkt oavsett nät),
  ivrig staggrad förladdning av alla klipp från start, robustare frame-reveal
  (canplaythrough/timeupdate utöver seeked), ?vdebug-överlägg för fjärrdiagnos.
  Robot-bevisat: alla 4 klipp loading direkt + postrar målas. Axel omtestar på iPhone
  (vid strul: skärmdump MED ?vdebug).
- **S-2026-08-25natt (skills):** 6 agentskills installerade i `skills/` inför appbygget
  (twostraws SwiftUI/Concurrency/Testing · chrisbanes kotlin-flow/compose-state · egen
  halkvakt-android). docs/SKILLS.md = katalog + skippade med motivering. CLAUDE.md:
  obligatorisk läsning före app-kod; nya läxor förs in i halkvakt-android §5.
- **S-2026-08-25natt (Betaputs II):** Appbygget igång på Axels "kör". Skelettet →
  riktig app: Compose-UI (3 flikar, mörkt varumärkestema), inställningar (kategori-
  filter via DataStore-Flow), persistent varningshistorik, testa-rösten, autostart-
  switch. Skills styrde arkitekturen (en state-ägare; explicit coroutine-ägare i
  tjänsten). Trappan orörd. v0.2.0. Lokalt: JVM-prov + APK gröna; CI-emulatorn dömer.
- **S-2026-08-26 (Design v2):** Claude Design-guiden granskad (1a+1b in, 1c struken) och
  implementerad: levande hemskärm, körläge m skärm-vaken, helskärmsvarning "Uppfattat",
  avståndsslider, röstvalsrad. Nearby-hjälpen ren + provad.
- **S-2026-08-26 (Betaputs III):** Release-rustning klar — SDK 35, R8 (2,59 MB AAB),
  upload-nyckel i GitHub-secrets + Axels kopia, CI-byggd signerad AAB per push,
  integritetspolicy live. Appen är tekniskt släppfärdig; återstår butiksmaterial vid
  "kontot är godkänt". Beslut: kö-slutsvarning (TrafficFlow) = uppdatering 1 efter release.
- **S-2026-08-27 (iOS-start, DECISIONS #23):** Axel beslutade samtidig lansering.
  SwiftUI-appen skriven (spegel av Android: 3 flikar, körläge, varningskort, Nearby,
  snapshot m. sha-verifiering + offlinecache). Byggs första gången på Axels Mac
  (MAC-GUIDE.md). Fynd: vilt saknas i snapshoten = backlog #17 FÖRE release.
  Måndag: Play- + Apple-konton (Axels lön).
- **S-2026-08-25natt (foto):** CI-emulatorn plåtar nu appens tre flikar vid varje push
  (artefakt app-screenshots) — Axels första titt levererad. Två runner-läxor in i skillen.
- **S-2026-08-26fm (UI v2):** Axel valde design i Claude Design — porterad rakt av:
  statuskort, I NÄRHETEN m. riktig närhetsdata, körläget "Passageraren är vaken",
  Inställningar v2 m. avståndsreglage (motor-configvägen, kontraktssäkert). CI grön,
  nya flikbilder plåtade.
- **S2 2026-08-25**: Public map shipped end-to-end. weather_latest table (map
  needs current state; archive stays event-filtered). Map site (MapLibre,
  VMS-ticker, waitlist vs Supabase RLS). Publisher commits via Git Data API
  (git-over-HTTPS 403s with fine-grained PATs in ways REST does not — three
  token lessons in RUNBOOK). Waitlist table live, needs anon key in
  data/config.json to activate the form.
- **S1 2026-08-24**: Plan, repo, ingesters for 4 sources (Situation needed
  ns=road.trafficinfo + schema 1.6), batched writes (run #2 timeout → 5 s),
  delta sync wired (was written-not-read), Supabase live (eu-north-1 pooler;
  direct 5432 is IPv6-only — unusable from CI). Self-steering layer added.

## 2026-08-25 — Väntelistan LIVE
- config.json publicerad till halkvakt-karta; formuläret aktivt på https://axelstar.github.io/halkvakt-karta/
- Skarpt verifierat med anon-nyckeln: INSERT 201 ✓, SELECT ger tom lista (RLS) ✓, DELETE påverkar 0 rader (bevisat via 409 på dubblett EFTER raderingsförsök) ✓, dubblettskydd 409 ✓, CORS från axelstar.github.io ✓
- Testrader i waitlist: pipeline-test@halkvakt.dev, browser-test@halkvakt.dev (kan rensas via Table Editor)
- Nästa: BACKLOG #3 varningsmotor v0 + replay-harness

## 2026-08-25 — Varningsmotor v0 KLAR (BACKLOG #3)
- engine/src/{types,geo,texts,engine}.ts — ren, deterministisk, noll beroenden, inga klockor
- 13 testvektorer (engine/vectors/) täcker: korridor, prioritet-med-släpp, 45 s-spärr,
  10 min/5 km-repris, fartspärr, tystnadskörning, segment- vs punkt-frasering
- Verklig-data-fixture: dagens Skånekameror/väglag/väder + rutt väg 108 → 3 kameravarningar,
  2 korrekt tystade av 45 s-regeln, 0 falsklarm från Normalt-segment/varma ytor
- replay-CLI: node --experimental-strip-types engine/replay.ts <fil>
- 21/21 tester gröna lokalt; determinism byte-verifierad
- Nästa: BACKLOG #4 viltlagret (polisen.se + NVR-hotspots)

## 2026-08-25 — Viltlager del 1 KLAR (BACKLOG #4)
- ingest/sources/polisen.ts: viltolyckor arkiveras var 30:e min; väg/art/plats ur fritext
- polisen_events i DB; ticker visar länsstatistik ("4 VILTOLYCKOR SENASTE VECKAN — MEST REN")
- A4-röstvarning medvetet VILANDE (DECISIONS #13) — datan bär inte punktpåståenden än
- 24/24 tester gröna (nytt: polisen-parser mot riktig fixture + kantfall)
- Nästa: BACKLOG #5 SMHI-varningar

## 2026-08-25 — SMHI-varningar KLAR (BACKLOG #5)
- ingest/sources/smhi.ts: impact-based warnings, alla lagras, vinterrelevans flaggas
- smhi_warnings (replace-all = aktuell sanning) + smhi_warnings_history (arkiv)
- Skarpt verifierat: DB WRITE smhi:17; live-meta har smhi_vinter; ticker redo för första snön
- 26/26 tester gröna. Kvar före Android: #6 snapshot-byggaren (blockerar ingen)
- Axel skapar Play-konto ~2026-08-26 (före plan v40 — bra: Googles ID-verifiering kan ta dagar)

## 2026-08-25 — Snapshot-byggare KLAR (BACKLOG #6) + falsklarmsbugg fixad
- data/app/v1/{manifest,static,live}.json publiceras var 30:e min; sha256-verifierat från CDN
- Nationellt-först (DECISIONS #14): 65 kB gz för hela Sveriges kameror; splitkriterium mäts varje körning
- BUGG FÅNGAD AV RIKTIG DATA: substrängen 'is' i "fläckvis" gav 8 falska halksegment — samma
  regex satt i MOTORN och hade gett falska röstvarningar i vinter. Ordgränser + regressionstest
  i båda lagren; v11-tystnadsvektorn härdad med fällan.
- 28/28 tester gröna. Nästa: #7 Android-skelett — byggs och CI-kompileras UTAN Play-konto,
  sideload-APK till Axel som mål. Play-kontot blockerar först butiksuppladdningen.

## 2026-08-25 — ANDROID-SKELETTET BYGGER: APK i CI (BACKLOG #7 milstolpe)
- android/: Kotlin-motor som klarar ALLA delade vektorer + Skånefixturen fält-för-fält
  (plattformskontraktet håller — TS och Kotlin bevisat beteendeidentiska)
- App: GuardService (foreground location, 1 Hz), SnapshotRepo (CDN+sha256+offline-cache),
  sv-SE TTS med audio-ducking, MainActivity med behörighetsgrind
- android.yml: vektortest + assembleDebug varje push; APK-artefakt (2,2 MB, 30 dagars retention)
- CI fångade eftersläpande integrationstest (counts-objektet) — utökat med wildlife/smhi-täckning
- Allt grönt: ci ✓ android ✓ ingest ✓ publish ✓

## 2026-08-25 — Emulatortest i CI KLART (BACKLOG #8)
- Virtuell Android bootas i Actions vid varje push: APK installeras, MainActivity startar,
  Skånefixturen replayas genom appens Guard-pipeline på riktiga Android-runtimen
- TRE runtimes bevisat identiska på samma frysta facit: TypeScript, Kotlin/JVM, Kotlin/ART
- Axels enhetstest krymper till det bara verkligheten kan ge: Bluetooth-ljud, batteri, OEM
- Nästa: #9 engine.updateHazards, därefter autostart (AR + Bluetooth)

## 2026-08-25 — SWIFT-MOTORN KLAR: iOS-åtagande verkställt (DECISIONS #17)
- ios/HalkvaktEngine: komplett port; alla delade vektorer + Skånefixtur identiska — TRE
  runtimes (Node/JVM/Swift-Linux) mot samma frysta facit, alla gröna ikväll
- ios-engine.yml vaktar kontraktet vid varje push (Linux = gratis minuter)
- Vektordesignregel tillagd efter knivseggs-fynd i v08 (2 cm-marginal → libm avgjorde);
  v08 flyttad till robust marginal, alla sviter omkörda
- iOS-appen startas vid Fas 3-grinden; Axels Apple-konto (~1 050 kr/år) behövs i okt

## 2026-08-25 — Vaktens minne överlever databyte (BACKLOG #9)
- updateHazards i TS+Kotlin+Swift: farorna byts, minnet (odometer, kylklocka, fired-karta)
  behålls; försvunna id:n behålls avsiktligt (flimmer ut/in ska ändå lyda repris-reglerna)
- Ny delad vektor v14_snapshot_swap: databyte vid t=20 mitt i körning — en ombyggd motor
  fyrar om cam1 vid t=20, en korrekt motor är tyst till cam2 vid t=91; alla tre sviter gröna
- GuardService: "Vägdata uppdaterad" mitt i körning istället för omstart av motorn
- Nästa (#10 är låst till Fas 3): autostart — Activity Recognition + Bluetooth ACL

## 2026-08-25 — AUTOSTART KLAR: "installera en gång, glöm den" (S5)
- Vakten vaknar själv: rörelseigenkänning (IN_VEHICLE) + inlärd bil-Bluetooth som turbo;
  slutar själv när körningen är slut; manuellt startad vakt dödas ALDRIG av automatiken
- Beslutslogiken är en ren, JVM-testad klass (8 regler = 8 prov) — Android-limmet tunt
- Reservväg där OEM blockerar bakgrundsstart: högprio-notis "Kör du? Tryck för att starta"
- Behörighetstrappan slutar i "Tillåt hela tiden"; Play-dossiern för den utkastad (docs/)
- Kvar före beta: betaputs (larmljudnivå, batterisnålhet), rekryteringsmaterial

## 2026-08-25 — Betaputs I: batteri, ljudkanal, ikon (S6)
- GPS-takt styrs av avstånd till närmaste fara: 1 s inom 5 km, 5 s inom 20 km, 15 s bortom
  — säkerhetsmarginalerna vid 140 km/h ligger som körbara prov (CadencePolicyTest)
- Rösten går nu på navigationskanalen: rätt volymratt, korrekt routing över bil-Bluetooth
- Adaptiv vektorikon: gul varningstriangel, utropstecken med snöflinga som prick
- Kvar i betaputsen: rekryteringsmaterial (FB-inlägg + testarguide) — sist före betan

## 2026-08-25 — Hemsida, SEO-grund & rekryteringsmaterial (S7)
- halkvakt-karta är nu en riktig sajt: landningssida (hero, live-ticker, FAQ, betakö),
  kartan på /karta.html, testarguide på /beta.html, sitemap+robots+JSON-LD
- Väntelistan tar emot från tre källor: karta, landing, beta (alla skarptestade 201)
- Två färdiga FB-inlägg + postningsplan i docs/REKRYTERING.md — inlägg A kan postas IDAG
- halkvakt.se + .nu saknar DNS → ser lediga ut; Axels köp (~150 kr/år) låser upp #13–14
- SEO-logik: innehåll publicerat nu hinner ranka till december; läns-sidorna blir vårt
  unika innehåll (livedata ingen kan kopiera)

## 2026-08-25 — GTM v2 (utan privata kanaler) + sajt-uppgradering (S8)
- docs/GTM.md: Flashback/Reddit (anonymt), varumärkessida + 500 kr/3–5 tkr annons,
  yrkesutskick (väntar domänmejl), press vid beta + första snön; DECISIONS #18
- Sajten: 🔊 "Hör hur rösten låter"-knapp (talar appens riktiga fraser), og.png +
  favicon, kö-räknare i publiceringspipen (waitlist_count i meta.json, visas ≥25),
  kartpanel synkad (oktober), hemlänk från kartan
- Axels öppna val (deadline okt): press med namn eller anonymt; Flashback själv eller ej

## 2026-08-25 — Mobilfixar + visuell hero efter konkurrentresearch (S9)
- Mobilbuggar (Axels skärmdump): OM APPEN-krocken fixad (länken bor nu i panelen),
  tickern rullar som riktig VMS-skylt vid överflöd (båda sidorna), hero-CTA:er staplas
- Research (Flitsmeister m.fl.) → docs/SITE-INSPIRATION.md; genrens mönster: telefon i
  heron, nyttorubrik, sifferbevis, badges, demovideo, citat
- BYGGT: animerad CSS-telefonmockup (varningskort glider in i loop, puls-position,
  snöflinga på vägen) + statrad (844 / 30 min / 0 kr / 0 spårning)
- Väntar på Axel: fundering kring nästa visuella steg (video okt, skärmdumpar, badges)


## 2026-08-25 · Scrollvärlden live
- varlden.html deployad på halkvakt-karta (Axels godkännande: "fix this up and then we deploy"): scroll-scrubbad körning i 4 scener (scroll-world-motorn MIT, Mixkit-film fri licens, klipp 24946/3317/36024/26253 kurerade via ffmpeg-bildrutor). Badges Google Play/App Store/Betakön i toppraden → väntelistan tills Play-länk finns (byts i okt). Länk från hero på index + sitemap. Landningssidans SEO/formulär orörda.
- Kvar: ev. promota till startsida efter Axels beslut; riktiga app-skärmdumpar in i scenerna i okt; ev. betald AI-sömlös kamerafärd (~300 kr) om Axel vill.

## 2026-08-25 · Livemotorn I DRIFT
- Databasen minutfärsk på olyckor+halka (beslut #19). Snölarmet ser första halkan inom en minut. Kartan ~16 min (kedjad publicering + cache-bust, tidigare idag). Token claude-halkvakt går ut ~nov — förnya före betan.

## 2026-08-25 · Scrollvärlden ÄR startsidan
- index.html = scrollvärlden + inbyggd betakö-anmälan (source: varlden) + FAQ + footer efter världen (z-lagerfix: sektioner z45 över motorns fasta lager). Gamla landningssidan → om.html (röstdemo, detaljer). varlden.html → redirect. SEO (FAQ JSON-LD, description) flyttat till nya index. Kartpanelens länk → Betakön-ankaret. Mobil-QA:ad med skärmdumpar.
- Beslut m Axel: app-skärmdumpar STRYKS ur sajtjobbet — behövs endast som Play-butiksmaterial (Googles krav, min 2 st) i oktober.

## 2026-08-31 — STATUS-varv (Claude, chattsession från Grekland)
Inget byggt denna gång; hela varvet gick åt till att mäta verkligheten mot tavlan
efter sex dygn där arbetet bokförts i commits men inte i djuplagret.

**Verifierat live (allt med kvitto, inget påstått):**
- CI: 40/40 senaste körningarna gröna över fyra workflows. `android`/`missar`/
  `marknadsforing` gröna vid senaste körning (30/8, 29/8, 30/8).
- Datafärskhet: `meta.json` + appens `manifest.json` genererade 08:11:42Z, hämtade
  08:17Z. Statisk snapshot 250 kB / 66,8 kB gzip, live 233 B. Checksummor på plats.
- Publika sidor: index, karta, testbilarna, integritet — alla HTTP 200.
- Skuggrapporten: 138 provkörningar, 99 röstvarningar, 2 777 bevakade objekt.
- Bengts två issues (#2, #3) lästa med Axels nya Issues-rättighet — den fungerar.

**Fynd som ändrade bilden:**
1. **Fas 0:s 7-dagarsstreck höll inte** — cron-svälten 27–28/8 slog hål i kedjan.
   Koden är oskyldig, GitHub-cron var boven, pulsklockan är lagningen. Ny klocka
   från 29/8, ny dom 5/9. Bokfört ovan i stället för att tyst bockas av.
2. **Claudes olåsta kolumn stod tom medan två olåsta kort fanns i BACKLOG** — #30
   RLS-kontrollen och #31 TrV-bevakningen. Båda är nu kort på tavlan. #30 är
   säkerhetsarbete och går före allt annat olåst.
3. **Väntelistan har 4 namn.** Play kräver 12 i 14 sammanhängande dygn. Detta är
   projektets enda icke-tekniska lanseringsrisk just nu och den syns inte i någon
   grön CI-ikon.
4. **Skuggflottan säger redan olycksrepliken** — "Olycka rapporterad 10 kilometer
   framför dig", 7 gånger idag över tre rutter, helt ograderad. Det är exakt den
   replik kort #28 (Olyckslyftet) ska gradera efter SeverityText. Bygget har alltså
   levande testdata att mäta mot i samma sekund frysen släpper.

**Städat på tavlan:** kronjuvelerna, Xcode 26.1 och Apple Developer låg kvar som
öppna kort trots att de var klara och bevisade; Grekland-genvägen var överspelad.
