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
- **🛑 ACTIONS-MINUTERNA SLUT (6/9):** 1 985/2 000 min förbrukade 1–5/9, alla GitHub-jobb dör på
  4 s sedan 5/9 13:12 ("spending limit needs to be increased"). Beslut: publikt repo / höjt
  spending limit / vänta till nollställning — se tavlans kort 0. Livemotorn opåverkad.
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

## 2026-08-31 — #28 Olyckslyftet BYGGT (Claude, samma dag som STATUS-varvet)
Frysen släppte i och med att 0.3.0 (3) gick in till Apple. Axel beordrade designlyftet;
jag tog motorkortet först eftersom det är det enda av de fyra som kan bevisas utan Mac.

**Byggt:** severity/endtime hela vägen från Trafikverket till rösten.
build-snapshot (`sev` + `slut`) → live.json → TS-, Kotlin- och Swift-parsrarna →
motorns A3-gradering → texts. Allvarlig olycka (SeverityCode ≥ 4) får två repliker:
tidigt rop vid 10 km-horisonten med omvägsbeslut + röjningstid, påminnelse innanför
2 km med bara farten. Lindrig olycka helt oförändrad.

**Bevis:** 34 TS-prov gröna. Tre nya delade vektorer (v15 tvåsteg, v16 sen påhoppning,
v17 lindrig oförändrad). Inga av de 14 gamla vektorerna behövde regenereras — den frysta
kontraktsloggen står orörd, vilket var själva poängen med att hålla steget internt.
Kotlin- och Swift-portarna är spegelkodade men bevisas av CI, inte lokalt (containern
saknar Gradle och Swift).

**Fyra val, bokförda i DECISIONS #30:** tröskeln vid 4 (öppet för Axel — 2/3 av alla
olyckor hamnar där), tidsformatering i publiceringen inte i motorn, skärpt invariant
i stället för försvagad repris-regel, och steget internt så kontraktet inte rörs.

**Fångat före frysning:** första v15-utkastet lade 10 km-gränsen 1,7 m från en fixpunkt
— exakt den libm-fälla generatorns egen designregel varnar för. Uppmätt och flyttad till
11 019 m, marginal nu ≥ 6 m åt alla håll vid båda trösklarna. Läxa i CLAUDE.md.

**Fynd, ej åtgärdat:** KEEP-filtret i situations.ts matchar ord Trafikverket inte
använder. Släpper i praktiken bara igenom "Accident". Läxa skriven, eget kort krävs.

**Ej gjort:** #24, #23, #22 — app-UI och autostart, kräver Mac/emulator för bevis.

## 2026-08-31 — Gravstensläckan tätad (Axels order: "det som måste fixas")
Fyndet från #28 visade sig vara större än en stavfelsbugg.

**Mätt:** 4 890 av 4 892 rader i `deviations` var raderade. 4 584 tillhörde typer vi
aldrig lagrat levande — vägarbeten, körfältsomläggningar, fordonshinder. De växte med
ca 650/dygn. Orsak: `if (!KEEP.has(x) && !s.Deleted) continue;` har två effekter, och
den andra var osynlig.

**Inte det uppenbara fixet.** `&& !s.Deleted` fanns av god anledning: en röjd olycka
måste kunna släckas i appen. Att bara ta bort villkoret hade riskerat att gamla olyckor
låg kvar och varnades för — värre än gravstenarna. Fixen är i stället att skilja
"vad vi lagrar" från "vad som får radera": raderingar är nu UPDATE, aldrig INSERT.
De städar allt vi trackar och skapar aldrig något vi inte skeppar.

**Båda ingestvägarna var drabbade** — GitHub-jobbet och livemotorns edge function hade
identisk kod. Båda lagade.

**KEEP smalnad till {"Accident"}** — vilket är vad vi faktiskt skeppat hela tiden.
"Obstruction" och "Incident" finns inte i Trafikverkets vokabulär; de riktiga värdena
är VehicleObstruction, GeneralObstruction, AnimalPresenceObstruction m.fl. Koden slutar
alltså påstå en räckvidd den aldrig haft. Vidgningen är kort #32, som produktbeslut.

**Bevis:** 35 TS-prov gröna, varav ett nytt regressionsprov som låser båda riktningarna:
otrackad typ får aldrig skapa en rad, trackad typ måste fortfarande kunna raderas.

**Avvägning bokförd (DECISIONS #31):** missar.ts läste gravstenarna som facit. Förlust
idag = noll (0 av 4 892 rader träffar halk-regexet i augusti); i vinter kan det ändras.
Kort #33 löser det med ett eget arkivbord.

**Ej gjort:** de 4 584 befintliga gravstenarna ligger kvar. Läckan är tätad så de slutar
växa; städning är irreversibel och väntar på Axels ja.

**Skarpt kvitto på #28 samma varv:** publish-map körde den nya snapshot-byggaren i
produktion. live.json bär nu `sev` och `slut`. Motorn körd mot den skarpa filen gav
mot en verklig severity-5-olycka på Väg 32:
  t=160s  9989 m  "Allvarlig olycka 10 kilometer framför dig — stor påverkan på
                   trafiken. Överväg annan väg. Beräknas röjd vid 11:15."
  t=480s  1998 m  "Sakta ner — olycksplats strax framför dig."
CI: ci ✅, ios-engine ✅ (Swift-porten klarar v15–v17), android kördes vid pushtillfället.

## 2026-08-31 — CI-domen: tre körtider gröna, signeringen trasig (ej av oss)
**#28 bevisat i alla tre körtiderna:**
- `ci` ✅ — 35 TS-prov
- `ios-engine` ✅ — Swift-porten klarar v15/v16/v17 mot delade vektorer
- `android` → steget "Kotlin engine vs shared vectors (the cross-platform contract)" ✅,
  och emulator-jobbet ✅ i sin helhet. Kontraktet håller byte-identiskt i Node, JVM och Swift.

**Men android-jobbet är rött** på steget "Bygg signerad release-AAB":
`Failed to read key halkvakt from store "/tmp/upload.jks": keystore password was incorrect`.
Inte orsakat av vår kod. Sista gröna Android-bygget: 30/8 15:07. Nyckelrotationen: 31/8 08:00.
Vår commit 08:35 var helt enkelt den första körningen EFTER rotationen — den avslöjade felet,
den orsakade det inte. HV_KEYSTORE_PASS och HV_KEYSTORE_B64 kommer inte från samma jks.
Axel måste sätta om dem. Blockerar Play-uppladdningen: ingen signerad AAB finns.

## 2026-08-31 — #30 RLS LÅST, tröskeln 5, gravstenarna borta ("kör på det du tycker")
**#30, uppmätt före:** RLS av på 11/13 tabeller. Anon-nyckeln ur kartans config.json
läste 8 arkivtabeller rått och hade skrivrättighet — PATCH mot påhittat id gav 204.
Snapshoten apparna talar ur byggs ur de tabellerna. **Efter:** sql/002_rls_lockdown.sql,
dubbellås (RLS + REVOKE), 401 på allt, väntelistan 201, edge-funktion + CI-ingest gröna.
DECISIONS #32. Bengts issue #3 besvarad.

**Tröskeln → 5** i tre körtider. v15 kör nu på severity 5, v17 låser att 4 är lindrig.
35 prov gröna. DECISIONS #30a.

**Gravstenarna:** upptäckte att läckan fortsatte 20 min efter pushen — edge-funktionen
var aldrig deployad. Deployad 08:53, verifierad. Sedan 4 587 rader exporterade
(sql/arkiv/, 239 kB gz) och raderade. Kvar: 308, alla olyckor. Två läxor i CLAUDE.md.

**Kvar för Axel:** signeringshemligheten (blockerar Android-AAB). Allt annat på min
lista från förmiddagen är gjort.

## 2026-08-31 — #33 situation_archive LIVE
Livetabell och arkiv separerade (DECISIONS #33). Båda ingestvägarna skriver, missar.ts
läser arkivet, icon_id bevarad som signal. Fött låst. Bevis: 36 prov, integrationstestet
räknar archive:1, första hindret in 09:04 med position, anon 401, ingest grön.
Två CI-varv: (1) REVOKE mot roller som CI:s PostGIS saknar — nu vaktad med pg_roles;
(2) writeAll:s nya archive-räknare saknades i kontraktet. Båda läxor/bokförda.

## 2026-08-31 — #22 Autostart: iOS-koden skriven, Android redan klar
Android: BT-mottagare, självlärning, rörelseigenkänning — allt sedan 9b, manifest verifierat.
Orört. iOS: fyra nya filer (StartGuardIntent, StopGuardIntent, HalkvaktShortcuts,
AutostartGuideView) + panel i Inställningar. Designval: openAppWhenRun=true på start —
CoreLocation får bara starta i förgrunden med "Vid användning", så appen tänds, vakten
startar, bakgrundsläget tar över. Stopp kör i bakgrunden. Skills lästa (swiftui-pro,
swift-concurrency-pro): en typ per fil, @MainActor på perform, inga tredjepartsramverk.
INTE BEVISAT: app-målet kompileras inte i CI. Bevis = Axels fyra kontroller i MAC-GUIDE.

## 2026-08-31 — #23 + #24 (del) skrivna: hela v0.3.1 kan testas i ett Mac-varv
**#23 heads-up, båda:** Android egen HIGH-kanal, tyst, 8 s timeout, bara riktiga larm.
iOS HeadsUpService (.timeSensitive, entitlement i project.yml), tillstånd vid första start.
Förgrund = varningskortet, bakgrund = bannern. **#24:** "Senast sagt" på hemskärmen,
persisterat, båda plattformarna. Resten av skinnet låst bakom designexport — ingen
gissning. Skills lästa. INTE KOMPILERAT: app-målen byggs inte i CI. v0.3.1-batchen
(#22, #23, #24-del) väntar nu på ett enda Mac-varv + bilen.

## 2026-08-31 — Mac-varvet: v0.3.1 på Axels telefon, T1–T3 gröna (hotellet i Grekland)
Åtta nya Swift-filer kompilerade på FÖRSTA försöket (13:11). Sedan sju rättningsvarv
på riktiga fynd från Axels hand: sidprickar över knapp, CarSetup.none = Optional.none,
fel-plusset i Genvägar, tyst no-op vid avslagen plats, guiden svårläst, Fokus Kör saknades.
BEVISAT PÅ TELEFON: introduktionen (4 sidor, tillståndsdialoger med våra texter),
valet CarPlay/Bluetooth/Inte alls, Starta vakten, deeplink till Ny automation, automationen
"When Driving is turned on → Starta vakten" skapad, Fokus Kör satt till Automatiskt,
**T1 intentet syns, T2 Siri "Starta Halkvakt" startar vakten**.
KVAR: T3–T7 (automationen i bilen, bannern, självstoppet). Arkiv → TestFlight nu.

## 2026-08-31 kväll — 🚀 0.3.2 (5) UPPLADDAT TILL APP STORE CONNECT (~14:50)
Andra uppladdningen samma dag. Innehåll sedan 0.3.0 i morse: olyckslyftet (#28), heads-up
(#23), senast sagt (#24-del), introduktionen (#36–37), Siri + App Intents (#22),
självstopp (#35), självväckning på betydande förflyttning (#40), parkeringsstaketet (#41),
Alltid-trappan på sida två. Kompilerade rent (14:46). Bevisat på Axels telefon före
upload: intro fyra sidor, Vid användning → Alltid → grön bock.
OBEVISAT, Bengt testar ikväll: självväckningen i bil, bannern, rösten i CarPlay,
självstoppet. Instruktion: docs/TEST-BENGT-0.3.2.md. Ett tomt resultat är också data.

## 2026-08-31 kväll — 🇫🇮 Finskt skuggarkiv LIVE (#34, DECISIONS #42)
Axel: "vi bör täcka Skandinavien snart" → arkivet börjar före produkten. sql/004 (schema fi,
fött låst), ingest/fi.ts, ingest-fi.yml var 30:e min. Första körningen grön: 526 stationer,
526 arkiverade, 10 händelser, 0 läckta rader till Sverige. Sensorfel-filter inlagt efter
fyndet i Rovaniemi. Kvar: tre finska skuggrutter i skuggmotorn.

## 2026-08-31 sen kväll — 🇫🇮 Finska testbilarna kör + skuggmotorn buntad (DECISIONS #43)
Skuggmotorn hade handklistrad motor från igår ⇒ körde utan olyckslyftet hela dagen. Nu
genererad ur engine/src, CI-vaktad, deployad. ?land=fi: tre finska rutter, egen snapshot,
land-kolumn i shadow_log, cron 15,45, rapport + sida med växel. Bevisat skarpt: 4 814
fixar, 0 larm, SE orörd (131 körningar). Sidan: testbilarna.html → 🇫🇮 Finland.

## 2026-08-31 sen kväll — 🇩🇰 Danmark kör, 🇳🇴 Norge förberett (DECISIONS #45, #35)
Danmark: schema dk, DMI grästemp (23 st) + trafikkort-händelser (41, 8 olyckor, 4 halka),
20 rutter, cron, kartan, rapport-knapp. Första varvet 0 larm. Norge: schema, rekognoserings-
ingest, workflow, 20 rutter, knapp — allt utom parsern, som väntar på Vegvesens konto
(begärt 15:43). Norden på rapportsidan: fyra flaggor. Sverige orörd genom allt.

## 2026-08-31 ~16:00 — ✅ SJÄLVVÄCKNINGEN BEVISAD på Bengts telefon (0.3.2, CarPlay)
Bengt installerade 0.3.2, gav Alltid, rörde inte telefonen. Vakten STARTADE SJÄLV —
skärmbild 15:51: körläge, 6:03 min, 4,3 km, 4 fartkameror 6–7 km fram, 0 varningar.
Korrekt tyst: han svängde av E65 vid Skabersjö innan kamerorna. Första riktiga körning
med DECISIONS #40 i fält, tre timmar efter att koden skrevs. KVAR i morgon: rösten i
CarPlay förbi kamerorna på E65, bannern, självstoppet. Notering: han satt i samtal
(telefonikon) — röst under pågående samtal är ett eget testfall.

## 2026-08-31 ~19:20 — ✅ Skinnet v3 bevisat på Axels telefon (DECISIONS #47–#49)
Typsnitten laddade, "Redo."-hemskärm, körläge, det gula varningskortet med ikonsetet,
Inställningar med Om som sista avsnitt, intro med kvitton. Axel: "ser riktigt snyggt ut".
Fynd på vägen: notissidan saknade kvitto (fixat); halvinstallerad app efter Xcode-attach-fel
(läxa i CLAUDE.md). INTE skickat till Bengt — han kör 0.3.2 till Boden i morgon (#40-testet).
0.3.3 = skinnet + kvittot för självväckning, efter Boden. Android: samma skinn, nästa varv.

## 2026-08-31 ~20:00 — #38a Broarna byggt i tre motorer (DECISIONS #50)
Bengts fråga "halka mellan kameror?" → beslut: mätning + faktum, ingen prognos. Broar ur OSM,
tröskel +3 vid närmaste station ≤ 15 km, text "Frysrisk framöver — bro om N meter." (invarianten
tvingade fram "framöver"). TS 38/38, Swift-CI grön efter argumentordning, Kotlin-tester gröna
(AAB-signeringen är Axels hemlighet). Skuggmotorn buntad + deployad. Overpass nere hela kvällen:
bridges.yml hämtar var 6:e timme tills filen finns — då börjar broarna synas i live.json.

## 2026-09-01 — Tröskeldokumentet skrivet och fällt (DECISIONS #52, #51:s hårda villkor)
Bengt + Claude, en session i stället för en oktoberkväll. docs/TROSKLAR-SKUGGAN.md:
tre grindar (A offsetmodellen ≤ 1,0 °C MAE / ≤ 5 % grova fel / ≤ 10 % frysklassningsfel;
B skuggdriften ≤ 20 % falsklarm / ≤ 30 % miss / ≥ 25 % mervärde; C giltighet ≥ 20 händelser,
≥ 30 varningar, backtest↔skugga ≤ 10 p.e.). Underlag: Bengts byggplan v3 läst ur Drive
(818 segment, median 7 km ankartäthet), motorns skarpa gräns verifierad i engine.ts
(yta ≤ 1 °C + fukt, bro ≤ 3). Bengt fick varje värde motiverat med osäkerhet redovisad
(binomialbruset vid n=30 uttalat) och sa "kör". Skuggspåret är nu olåst: ankarklippning
och offsetkörning mot arkivet kan börja; grind A på arkivdata är nästa naturliga steg.

## 2026-09-01 — Grind A-skriptet byggt: publish/grind-a.ts + Actions-knapp (grind-a.yml)
Leave-one-out över weather_observations (30-min-buckets, K=5 grannar ≤ 50 km, exakt
uteslutning av utvärderingsbucketen ur paroffseten), redovisat per ankaravståndsband
0–7/7–15/15–20/>20 km, dömt mot A1–A3 i TROSKLAR-SKUGGAN.md. Självtest utan DB:
sex syntetiska stationer med kända offsetar och OLIKA serielängder — kravet fångade
ett teckenfel i par-loopens ena gren som första versionen (lika långa serier) släppte
igenom. Grönt: 800 punkter, MAE 0,0000 °C, exit 0. CI kör självtestet före den skarpa
körningen i samma jobb. Kvar: trycka på knappen (rökprov mot arkivet); skarp prövning
på vinterdata före november. Ingen motor- eller appkod rörd.

## 2026-09-01 — Rökprovet: grind A:s första kontakt med arkivet (grind-a #1)
Bengt tryckte på knappen (efter GitHubs tvåstegsfälla — "Run workflow" är två klick;
Claude läste och körde via Bengts Chrome). Resultat på 60 dygn: 757 stationer, 67 995
avläsningar, men bara 43 vintertimmar (yta ≤ 5 °C) — sensommarens enda kyla är avlägsna
fjällstationer, 29/43 punkter >20 km från ankare. Felet växer med ankaravståndet exakt
som teorin förutsäger: 0,63 °C (0–7 km) → 0,92 → 1,83 → 5,39 °C (>20 km). Nära ankare
ligger modellen under A1 redan på sitt systematiskt svåraste data (utstrålningskyla i
glesbygdsterräng). Totalens FALLER är urvalsartefakt, ingen klausul utlöst. Luckan
rökprovet blottade: grind A saknade minsta underlag — infört i TROSKLAR-SKUGGAN.md
(≥ 500 punkter, ≥ 20 stationer, Bengts ja) medan dokumentet ännu är fritt att ändra
(Axels fastställande väntar). Kör: https://github.com/Axelstar/Halkvakt/actions/runs/33466632642

## 2026-09-01 — Grind A schemalagd: söndagsmorgnar, resultat på Summary-sidan
Bengts fråga "måste jag komma ihåg oktober?" → nej: cron söndagar 05 UTC + resultatet
tee:at till GITHUB_STEP_SUMMARY (shell: bash för pipefail — tee-läxan från DECISIONS #26).
Fixade samtidigt: schemakörningar saknar inputs, "${{ inputs.dagar }}" hade blivit tom
sträng → Number("") = 0 dagar → tomt resultat; nu || '60'. Läsningen ingår i söndags-
rutinen; jobbet är grönt oavsett KLARAR/FALLER — domen är mänsklig, mätningen automatisk.

## 2026-09-01 — Vaktinventering + underlagsvakt i grind A
Bengts fråga: vaktar systemet sig självt? Inventering: hämtningarna vaktas av healthcheck
(stalehet per källa + radgolv + pulskoll, incident-issue vid rött — larmvägen bevisad
sedan tee-fixen); grind A-krasch ger rött schemajobb med GitHub-notis. Hålet: en mätning
som lyckas tekniskt men mäter ingenting förblir grön (tee-/gravstensläxans mönster).
Stängt med underlagsvakt i grind-a.ts: <100 stationer eller <1000 avläsningar ⇒ exit 1 ⇒
rött jobb. Självtestet fortsatt grönt. KVAR ATT PROVA: larmvägen (järnlagen — en vakt är
ingen vakt förrän larmet provats): en avsiktlig körning med dagar=0 ska ge rött jobb +
notis till Bengt. Väntar på Bengts tryck eller klartecken.

## 2026-09-01 — Larmvägen provad: underlagsvakten fäller på riktigt (grind-a #2, avsiktligt röd)
Järnlagen ur DECISIONS #26 tillämpad: avsiktlig körning med dagar=0 via Bengts Chrome.
Resultat: jobbet RÖTT, "Process completed with exit code 1", summary "0 stationer,
0 bucketade avläsningar" — vakten fällde på exakt det scenario den byggdes för, och
Summary-sidan fungerar även vid rött (tee hann skriva innan pipefail fällde steget).
Kör: https://github.com/Axelstar/Halkvakt/actions/runs/33467812822
Sista länken i larmkedjan — att NOTISEN når Bengt — kan bara Bengt bekräfta (klockan
på GitHub / mejl beroende på hans notisinställningar). Väntar på hans kvitto; först
då skrivs larmvägen som HELT bevisad. Kommande söndagskörningar notifierar samma
konto (schemakörningens actor = senaste committern av workflow-filen = 895845).

## 2026-09-01 — Larmvägen HELT bevisad: mejlet framme hos Bengt
Skärmbildskvitto i chatten: "[Axelstar/Halkvakt] grind-a arbetsflödeskörning —
grind-a: Alla jobb har misslyckats" i Bengts inkorg. Hela kedjan provad i följd:
tomt fönster → underlagsvakt exit 1 → rött jobb → notismejl → mottagaren såg det.
Grind A-mätningen är därmed självövervakande med bevisad larmväg — ingen behöver
minnas oktober, och en trasig hämtning i november når Bengt av sig själv.

## 2026-09-02 kväll — Radarpiloten I DRIFT (kort #43 steg 3, Bengts "bygg piloten")
ingest/radar.ts: senaste SMHI-kompositen (ODIM HDF5) → h5wasm → proj4 mot filens egen
projdef → 2 km-sampling mot 818-skelettet → Marshall–Palmer (kalibreras i v3, gissas
inte) → radar_precip, händelsefiltrerad (≥ 0,1 mm/h), idempotent, fött låst med
rollvakt. Drift som steg i ingest-jobbet — ryms i redan betalda minuter (minutdieten
#22); continue-on-error under pilotfasen med färskhetsrad som motvikt; bevisknapp
radar-pilot (prov/skarp). Bevisordningen höll: prov-läget (RoadNumber-läxan för
binärformat) fällde först ett API-fel (h5wasm:s FS bor på ready-modulen — radar-pilot
#1 röd, lagad, #2 grön) och bevisade sedan formatet mot verkligheten: DBZH 458×881 px
à 2 km, gain 0,4/offset −30, hörnkontroll 458,0×881,0 — geometrivakterna nöjda.
SKARP (radar-pilot #3 18:28): regnväder över skelettet i realtid — 13 049 provpunkter
(84 utanför täckning), 63 segment ≥ 0,1 mm/h, max 15,38 mm/h, "radar_precip senaste
dygnet: 63 rader, senaste 18:20Z". Från nästa timvisa ingest-varv matar piloten sig
själv. 🔑 Domen efter ~1 vecka: cellmätning v3 (radar mot stationernas rain_sum_mm =
kalibreringskurvan) + uppmätt radantal/fritier. Beroenden: h5wasm + proj4 (rena
JS/wasm, gratis).

## 2026-09-02 em — KÄLLBESLUTET (DECISIONS #60) + cellmätningens v2-dom
**Källbeslutet taget:** Bengt + Axel ("jag o Axel säger ok" i chatten — Axels ok
relayerat av Bengt, kontrasigneras på tavlan). SMHI:s radarkomposit in som permanent
källa enligt RADAR-PLAN: observation endast, grids samplas/lagras aldrig råa,
stationerna blir kalibrering. Kort #43 steg 3 (pilotintag i skugga) därmed olåst;
byggs på Bengts ord.

**Cellmätningen v2** (givarelösa stationer uteslutna — de utan en enda regnrapport i
fönstret): artefakten bekräftad och borta. Kurvan nu rent monoton: 26 % (0–5 km) → 36
→ 41 → 47 → 52 → 60 % (30–50 km), 84 341 händelser. v1:s 0–5-band på 70 % var falsk
diskord från givarelösa grannar, precis som misstänkt. Domen står och skärps: redan
vid 5–10 km är >1/3 av regnhändelserna enstations — stationstrigger ensam räcker inte
för vattenplaning. Beslutet #60 vilar nu på rensad siffra.

## 2026-09-02 — Kort #43 steg 1: radar-rekognoseringen körd (Bengts "kör")
Plan + kort upprättade på Bengts beställning (docs/RADAR-PLAN.md: EN källa, SEX
nyttjare, bygge låst bakom rekognosering + källbeslut). Sonden körd samma förmiddag
(radar-rekognosering #1): SMHI:s Sverigekomposit helt öppen — 5-min-kadens, 261 kB/fil
(~77 MB rå/dygn; grids lagras aldrig, samplas till segmentrader), HDF5 per fil + tif-spår
i dagslistningen. FJÄLLFYNDET som fällde farhågan: 26/26 punkter längs referensrutterna
har täckning, radar_coverage:ok även E10 Kiruna och E14 Storlien — METs nordiska komposit
(norska+svenska+finska radarer) slår nationell täckning; enda strukturella luckan är
Tärnaby (no coverage), Mora var transient otillgänglig. Arkitekturkonsekvens bokförd:
SMHI-fil + lokal sampling för skelettet, METs punkt-API bara för stickprov (deras
villkor). Licenser CC BY 4.0/NLOD, User-Agent = repo-URL utan personuppgifter.
DOMEN: inget stoppar källbeslutet — steg 2 (DECISIONS-rad Axel + Bengt) har komplett
underlag. Ingen intagskod skriven, per planens lås.

## 2026-09-02 — Kort #42 steg 0a KLART + 0b körd: regnfacit tickar, cellrisken uppmätt
**Steg 0a (Axels ja via Bengt i chatten):** ordningen bevis → bygge → slutbevis, hela
kedjan grön. Regn-bevis #1 (inga gissade INCLUDE-blad — hela objekten inspekterade):
RainSum finns med 89 % täckning (751/844 stationer). Kolumnbygget: rain_sum_mm +
snow_wateq_mm ur Aggregated30minutes (matchar ingestkadensen; snön i samma svep som
vinterfacit för #16), migration 008 i auto-migrationen, isInteresting orörd (radantal/
fritier opåverkade), integrationsprov låser att mängden landar i arkivraden. Självtestet
i CI + grön integrationskörning. SLUTBEVIS (regn-bevis #3, 06:35): 658 stationer med
rain_sum_mm i arkivet, senaste 06:05. Mellanläget 0 rader (regn-bevis #2) var deltasynkens
tremninutersfönster — inte fel; fail-soft-läxan följdes: inget bokfördes förrän arkivets
egen rad fanns.

**Steg 0b (cellmätningen):** scripts/cell-matning.ts + knapp, självtest som återfinner
teorikurvan 2d/(L+d) ur svepta syntetceller. Skarpt (92 983 regnhändelser i par, 845
stationer): P(diskord|regn) stiger monotont 46 % (5–10 km) → 64 % (30–50 km) — redan vid
vår mediana ankartäthet är regnflaggan nära slantsingling om grannpunkten. ARTEFAKT
FUNNEN av mätningen själv: 0–5 km-bandet visar 70 % för att givarelösa stationer (~11 %)
får rain=false i parsern och producerar falsk diskord — v2 som utesluter dem behövs, och
nivåerna är därmed uppblåsta åt ena hållet medan arkivfiltrets torra-grannar-skevhet
drar åt andra.

**Vägvalet som öppnats (Bengts fråga "meningsfullt utan nowcast?"):** för vattenplaning
är stationsspåret sannolikt för svagt — regnet dekorrelerar under ankaravstånden. Radar-
observationsspåret (SMHI:s öppna radarkomposit, senaste 5 min = MÄTNING, inom "mätning +
faktum"-lagen; extrapoleringen förblir #16:s parkerade prognosklass) kandiderar som
huvudtrigger med stationerna som markkalibrering. Beslutsunderlaget byggs av: v2 av
cellmätningen (fäller/friar stationsspåret med rensad siffra) + radar-rekognosering
(format/volym/kadens/fritier — föreslaget som steg 1b i körschemat). Bengts ord väntas;
permanent radarintag är ett källbeslut som får egen DECISIONS-rad när det tas.

## 2026-09-01 kväll — Ankarbreddningen: FI mätt, SMHI-provet byggt och kört (Bengt + Claude)
Bengts fråga "vad kan krympa avståndet när kamerorna inte kunde?" → tre spår, två med
siffror samma kväll:
1. **Grannländerna, mätt ur befintlig CDN-data:** finska stationerna (431 st, redan i
   vader.geojson) krymper Norrlands >20 km-andel 12,6 → 11,5 %, >15 km 25,4 → 24,0 %.
   Danmark: noll. Norge: mäts samma dag Vegvesen-kontot fungerar (hemligheterna ännu
   inte inlagda — ingest-no #7 21:09 loggar "saknas", trots att tillståndet enligt
   Bengt är beviljat; Axel lägger VEGVESEN_USER/PASS och triggar jobbet som bevis).
2. **SMHI-provet (Bengts order):** scripts/smhi-prov.ts + smhi-prov.yml — grind A:s
   leave-one-out med två ankarpooler (bas/+SMHI-luft), bandat på VViS-avstånd, nya
   punkter (utom VViS-räckhåll) särredovisade. Självtest: fjärran-station utan
   VViS-grannar ska lämnas av basen och räddas av luftankaret (MAE ≈ 0) — grönt.
   Skarp körning (smhi-prov #1): 757 VViS, 235 SMHI-stationer, 60 dygn. Första signal
   på tunna augustidata (34 punkter, INGEN dom): samma punkter 2,56→2,50 °C (stör
   inte); >20 km-bandet 5,83→4,37 °C och 4 nya punkter à 1,57 °C som basen inte når.
   Pekar åt rätt håll; avgörs på vinterdata och värderas i tröskeldokumentet.
3. **Höjdprovet (Bengts order, samma kväll):** scripts/hojd-prov.ts + hojd-prov.yml.
   Designfynd före bygget: lärda paroffsets absorberar redan statisk höjdskillnad, så
   höjden testas i SEGMENTFALLET (RÅ / RÅ+HÖJD / OFFSET=taket). Självtestet fällde ett
   teckenfel i korrektionen före push (dubblade felet i stället för att nolla det).
   Skarp körning (hojd-prov #1): 747/757 stationer fick EU-DEM-höjd. Fynd 1 (STARKT,
   3 455 par): empirisk lapse 0,71 °C avkylning/100 m mot standardens 0,65 — höjden
   bär en äkta del av parsystematiken. Fynd 2 (ÄRLIGT, 40 augustipunkter): rå+höjd
   8,36 ≈ rå 8,36 °C mot offsetens 2,50 — i augusti-utstrålningslägen räcker höjd
   inte ensam; lärda offsets bär stationskaraktär (himmelsvy m.m.) som höjd inte ser.
   Vinterdata avgör; GIS-svansen rörs inte förrän dess.
4. Terrängens GIS-svans (dalgångar/skuggning): parkerad bakom vinterns höjdprov.
Samma kväll: TROSKLAR-SKUGGAN §2 fick orsaksklassning av missar (utstrålnings- vs
nederbördsdriven; nederbördsdrivna bokförs på #16, inte B2) på Bengts order efter
nowcast-diskussionen. Kort #42 (vattenplaning) + förstudie docs/VATTENPLANING-ANALYS.md
lades tidigare under dagen, också ur Bengts frågor.

## 2026-09-01 — Ankarklippningen körd + kamerafilsbuggen (Bengts fråga fällde den)
Bengt frågade "har vi inte gjort ankarklippningen?" — och svaret visade sig vara nej,
på ett sätt tavlan inte såg. Morgonens kamerafil hade ALDRIG nått CDN: Trafikverket
svarade 400 i varje publiceringsvarv sedan 06:06, och fail-soft-grenen ("förra filen
kvar på CDN") gjorde jobbet grönt fast det aldrig funnits någon förra fil. Grön körning
≠ gjort — tee-/gravstensmönstret igen, nu i fail-soft-form.

**Diagnos med bevis:** felutskriften utökad till att visa TRV:s svarskropp; körning
33485723523 gav domen ordagrant: "Invalid query attribute Camera.RoadNumber".
RoadNumber finns i TrafficSafetyCamera (fartkamerorna), inte i Camera. Committens
"samma fråga som skuggmotorn" var inte samma — skuggmotorns fungerande fråga har
bara Id/PhotoUrl/Geometry. Fältet struket; körning 33485863812:
"kameror-vaglag.geojson: 744 väglagskameror", pushed 15 files (14 förut).

**Ankaranalysen körd** (lokalt mot klonad karta-data — containerns nätpolicy blockerar
CDN; ankaranalys.yml-knappen finns på grenen och registreras av GitHub när den når main):
- Ankare: 845 stationer + 744 kameror. MEN 738/744 kameror står exakt vid en station
  (median 0,0 km; bara 6 st > 1 km). Kamerorna är VViS-samlokaliserade.
- Täthet, bara stationer → + kameror: nationellt median 6,8→6,7 km, >20 km 4,7→4,6 %;
  Norrland 9,2→9,2 km, 12,6→12,6 %. Byggplanens hopp att kamerorna krymper glappet
  bär alltså inte: deras värde är bildfacit (foto vid larm), inte ankartäthet.
- Ruttklippningen: 3–16 ankare per rutt söderut; artefaktvarning för grova polylinjer —
  E4 Umeå→Luleå visar 0 ankare för att ruttens raka brytpunktslinje går > 5 km från
  vägen, inte för att ankare saknas. Skelettmåttet (818 riktiga segment) är det ärliga.

**Kvar:** allt ligger på gren claude/latest-changes-w9lyvo — main kör fortfarande den
trasiga frågan (ofarligt: filen ligger kvar på CDN, men den uppdateras inte förrän
merge). Axel/Bengt: merga grenen, sedan finns även ankaranalys-knappen i Actions.

## 2026-09-01 — Strategimejlet skickat (byggplanens huvudbeslut-kommunikation + 2.3-länken)
Skickat från Bengts Gmail via Chrome på hans uppdrag (utkastet godkänt i chatten, adressen
hans): Axel har nu huvudbeslutet, länken till TROSKLAR-SKUGGAN.md, grindarna i tre meningar,
vad som är hans (fastställandet, fri justering till första skuggkörningen) och löftet att
inget rör hans tid förrän november. Gmail-kvitto "Meddelandet har skickats". Därmed är
byggplanens båda kommunikationskrav uppfyllda: strategimejl + tröskellänk i samma mejl.

## 2026-09-02 morgon — Ankarfyndet till DECISIONS (#55) + kameravakten i healthchecken
Terminalsessionens varv efter ett dygns paus: körde scripts/ankaranalys.ts mot CDN och
fick SAMMA siffror som parallellsessionens ankaranalys.yml-körning — oberoende
reproduktion (744 kameror, alla VViS-monterade, Norrland 12,6 % oförändrat). Fyndet
stod bara på tavlan; nu bokfört som DECISIONS #55. Healthcheckens CDN-vakt på kamera-
filen (skriven 1/9, medvetet tillbakahållen tills filen fanns) committad — extra
motiverad av TRV-400-episoden där fail-soft dolde felet i timmar. Tre rebasar mot
parallellsessionen under varvet; #54-läxan ("ta kortet innan du bygger") gäller även
terminalen — ankaranalysen byggdes dubbelt för att ingen såg den andres pågår.

## 2026-09-02 11:28 — 🚀 0.3.3 (6) UPPLADDAT och installerat hos Bengt mitt i Bodenresan
Tredje uppladdningen på tre dagar. Innehåll: kameratoleransen 100°→60° (#55, hans eget fynd
på E4), resan håller ihop över pauser (#53, hans fynd), skinnet v3 med ikonsetet (#47–49),
broarna vilande tills OSM svarar (#50). Han uppdaterade via TestFlight utan att radera —
inställningar, platstillstånd och parkeringsstaket behållna mitt i en testresa.
🔑 HEMRESAN ÄR BEVISET: han vet var kamerorna sitter och var 0.3.2 varnade fel. Tystnad på
rätt ställen = #55 bevisad av den som hittade felet.

## 2026-09-02 14:42 — 🚀 0.3.5 (8) uppladdad, första bygget idag med GRÖNT kontrakt
Innehåll: kamerariktningen vänd + verifierad mot Öjersjö (#57, #59), vägnumret i
olycksfrasen och nu även i EARLY-grenen i Swift OCH Kotlin (#56, #60), resan över
pauser (#53), skinnet, broarna vilande.
LÄRDOMEN FRÅN DAGEN (#60): 0.3.3 och 0.3.4 byggdes och deployades medan ios-engine låg
RÖD — fyra körningar. Xcode kompilerade glatt; kontraktstestet gjorde inte det. Bengts
fältrapporter från de byggena går inte att tolka i efterhand. Regeln nu i CLAUDE.md:
aldrig be om arkivering utan grön ios-engine + android + ci.
🔑 NÄSTA BEVIS: Bengt kör 0.3.5 och noterar KLOCKSLAG + PLATS vid varje kameralarm och
varje kamera som passeras utan larm. Beskrivningar räcker inte — vi har gissat tre gånger.
Notera: max EN varning per 45 s, så tätt sittande ATK-kameror ger bara ett larm (avsiktligt).

## 2026-09-02 kväll — Frost-varvet: nyckel → rekognosering → prov, allt bevisat live (DECISIONS #60)
Bengt registrerade FROST_CLIENT_ID (Bitwarden + Secrets, hemligheten aldrig genom Claude).
frost-rekognosering #1–2 + frost-prov #1, alla gröna med resultat på Summary-sidorna.
Fynden: Vegvesen bor i Frost (461 aktiva vägstationer, lufttemp, dataprov 8,6 °C
Bossovarri); yttemp kräver ändå DATEX (404 på serierna, felkroppen loggad); svenska
Norrlandsluckan orubbad av 1 104 norska stationer — den är inlands, inte vid gränsen.
Vegvesens DATEX-svar anlände till Axel under kvällen; hans handgrepp (USER/PASS i
Secrets) är nästa nyckel. Ingen VEGVESEN-hemlighet fanns i repot vid kontroll (Secrets-
sidan läst via Bengts Chrome); Bengts inkorg hade noll vegvesen-träffar.
- **S-2026-09-03fm (webbsessionen): TRÖSKLARNA FASTSTÄLLDA — sista mänskliga förvillkoret
  för skuggkörningen avklarat.** Axels "kör" relayerat av Bengt i chatten ("Axel säger kör
  via Bengt") → DECISIONS #61, huvudet i docs/TROSKLAR-SKUGGAN.md uppdaterat (värdena
  oförändrade från Bengts 1/9-version inkl. §2-orsaksklassningen), båda tavelkorten
  bockade (bocken = Axels kontrasignering, samma ordning som källbeslutet #60/radar).
  Från första skuggkörningen (~mitten av oktober) gäller §5: ändring kräver bådas
  signatur. Bokföringsfynd i samma varv: #60 var trippelbokat (två varv skrev
  parallellt) — noterat i #61, numren lämnade orörda, nästa nummer #62. Kvar för
  skuggan: bara vintern.

## 2026-09-03 — Skyltfondsunderlagen granskade mot senaste dagarnas arbete → v5 i Drive
Bengts order: granska ansökan + kontaktplan (Drive) mot det som byggts sedan 31/8.
Fynd som krävde ändring: (1) prognoslagrets beskrivning sa Nowcast — det beslutade bygget
är offsetmodellen (bilaga 7 hade motsagt texten); (2) tröskeldokumentet finns nu (daterat
1/9) — tempus + bevislinje in; (3) grind A-infrastrukturen kör redan veckovis — synliggjord
som egenfinansierad indata så gränsdragningen mot fonden håller; (4) NYTT LÄGE, verifierat
mot riksdagen: handledarkursen slopades 2026-08-01 (prop. 2025/26:127) — trafikskole-
pitchen omskriven till kanaloberoende. Research: AB Bulltoftabanan = Malmös trafiköv-
ningsplats (040-29 29 05, kandidat AP6), Ljungbyhed reserv, 7 trafikskolekandidater.
Två nya dokument skapade i samma Drive-mapp (v4 orörda): "Ansökan ... 2026-09-03 v5" och
"Kontaktplan ... 2026-09-03 v5". Tidsflagga: förhandssamtalet till fonden är DENNA vecka.
- **S-2026-09-03fm (forts): Cellmätningen v3 byggd — kedjebeviset före radardomen.**
  Bengts order "bygg och kör kedjebevis men ingen dom". scripts/cell-matning-v3.ts +
  knappen cell-matning-v3: radar_precip paras mot stationernas rain_sum_mm (station
  ≤ 5 km från segmentet i PostGIS, närmaste observation ±45 min) och ger A) bekräftelse
  per radarband, B) Marshall–Palmer-kalibrering (mediankvot radar/mätare), C) miss-
  riktningen (stationsregn utan radarrad vid samplad komposittid). Självtest med känd
  sanning (injicerade par, kvot exakt 2,0) grönt lokalt; underlagsvakt < 20 par = rött
  jobb; domspärren står i varje utskrift. Kedjebeviskörningen görs direkt efter merge
  (knappen registreras först på main) — domen fälls i eget varv på ~7 dygns data.
- **S-2026-09-03fm (forts 2): v3-kedjebeviset KÖRT.** Körning #1 fällde en riktig bugg —
  precis det kedjebeviset var till för: geography-ST_DWithin över 818 segment × 658
  stationer utan förfilter sprängde Supabase statement_timeout (57014, felkroppen i
  loggen). Fix: bbox-förfilter (&& ST_Expand 0,15°) + SET statement_timeout 300s
  (PR #32). Körning #2 grön på 27 s: 1 311 radar↔station-par ur 18 kompositer
  (2/9 18:20 → 3/9 08:00), bekräftelsen växer monotont med radarbandet
  13→30→51→71 %, kalibreringsmediankvot 0,39 (radar under mätarna — rimligt:
  5-min-bild mot 30-min-summa, medel mot punktmätare), missriktningen 85 % radartäckt.
  KEDJAN BEVISAD — parning, enheter och tidsmatchning håller, underlaget växer av sig
  självt. Domen fälls i eget varv på ~7 dygn; siffrorna ovan är inte den.
- **S-2026-09-03fm (forts 3): v3 automatisk** (Bengts order "boka radarraden"). Måndagscron
  06:20 i cell-matning-v3.yml — landar efter grind-a (05:40) och smhi-prov (06:00) så alla
  tre mätkurvorna står i följd på måndagens Summary-sidor. Domspärr och underlagsvakt
  gäller varje körning; första schemalagda: måndag 7/9 (~4,5 dygns data, fortfarande
  kedjekoll), andra 14/9 på fullt underlag — där kan domvarvet läsa av.

## 2026-09-03 kväll — #31 Trafikverksbevakningen byggd och larmvägsbevisad (Bengt + Claude)
Källan verifierad före koden: bransch-sidans RSS "Nyheter om Trafikverkets data" (24 poster,
välformad). Veckovakt måndagar 06:40 — fjärde jobbet i måndagsserien: nya poster ⇒ issue
med label trv-nyhet assignad Bengt (healthcheckens bevisade mönster), tom/trasig feed ⇒
rött jobb med svarskropp. State seedad lokalt (ingen flod på första körningen), tyst
omkörning bevisad grön. Larmvägstest via --testlarm: issue #35 skapad, grönt jobb.
Windows-fälla på vägen: process.exit under undici-teardown ⇒ libuv-assert, exit 127 —
löst med naturlig exit (main() + exitCode). Öppna API:ets egna utskick saknar feed
(Google-gruppen) — täcks av Bengts medlemskap, dokumenterat i skript och workflow.
Bengts issues #3 och #5 stängda samma kväll med bevis (redan åtgärdade sedan 31/8 resp 2/9).

## 2026-09-03 sen kväll — Källbevakningen fullbordad enligt issue #2:s HELA spec
Ärlighetsvarv: första bygget täckte en källa; issuens text (läst i sin helhet först vid
stängningen) specade sex. Nu sju källor via var sin stadigaste väg — portalens nyheter
och driftinformation via CMS-GraphQL (rekognoserad live: GetRootPages/GetPagesByParentIds,
öppen endpoint), SMHI via sitemap, resten texthash. Tre fällor fångade av provkörningar
INNAN de blev tysta ALDRIG eller veckobrus: GetPageContent gav 21 tecken (driftposterna
låg som CMS-barn), SMHI-skalet 0 tecken (Docusaurus), halkvarning varierar per request
(stabilitetskontroll: två hämtningar, olika = ingen jämförelse). Larmväg dubbelt bevisad
(#35/#36 test + #37 äkta). Kvar hos Bengt: Google-gruppmedlemskapet + stänga testissues
som notiskvitto.

## 2026-09-03 — Rättelse: Google-gruppen är död sedan 2014 (Bengts koll)
Bengt öppnade gruppen innan han gick med: 14 trådar, senaste 2014-03-17 — betatestets
forum, inte en levande kanal. Claudes råd byggde på en overifierad sökträff; rättat i
skript och tavla. Ingen täckningslucka uppstår: portalens nyhetssida (som trv-portal-news
vaktar) är där dagens API-utskick faktiskt publiceras. Läxan är samma som alltid —
verifiera källan mot verkligheten, inte mot dess rykte.

## 2026-09-03 — Kvittot: Bengt bekräftade notiserna #35–#37 — kort #31 HELT stängt
Alla tre testissues nådde Bengts inkorg (hans besked i chatten) och stängdes med bevis-
kommentarer. Larmkedjan därmed bevisad i varje länk: källa → diff → issue → notis →
mottagare läste. Källvakten rullar själv måndagar 06:40 utan obevisade antaganden kvar.

## 2026-09-03 kväll — Issue #4 klar och CDN-bevisad: segment_id i vaglag.geojson
Enraders-ändring i build-map-data.ts (kolumnen hämtades redan). Bevis: 818/818 features
på CDN bär segment_id efter 16:37Z-publiceringen; issue #4 stängd med kvittot. Bifynd:
min CDN-väktare läste bara första 600 tecknen (koordinater, aldrig properties) och hade
tigit till timeout — Bengts fråga avslöjade den; direktverifiering med full parse i
stället. Segmentstabilitetens tidsserie inför mars börjar ticka med detta varv.
- **S-2026-09-03em: Regntäckningsknappen byggd (kort #44).** Bengts täthetsfråga: tappar
  timhämtningen varannan av stationernas 30-min-regnsummor? scripts/regn-tackning.ts +
  knappen regn-tackning: histogram 2/1/0 buckets per station-timme + täckningsprocent,
  för alla observationer och regnmätarna separat; nämnaren är pipelinens egna kör-
  timmar så kolumnens ungdom inte döms som samplingsförlust. Självtest med känd
  sanning (63 % på konstruerat A/B-fall) grönt lokalt. Underlag för täthetsbeslutet;
  ingen dom i skriptet. Skarp körning direkt efter merge.
- **S-2026-09-03kväll: Regntäckningen MÄTT (kort #44, körning #1).** Hypotesen bekräftad
  med siffror: regnmätarna fångar exakt 1 av 2 30-min-buckets i 78 % av station-
  timmarna (2/2 bara 5 %, 0/2 17 %), total bucket-täckning 44 %; alla observationer
  39 % (händelsefiltreringen späder på 0-timmarna där). Timhämtningen tappar alltså
  ungefär varannan regnsumma. Konsekvens: ingen skevhet i v3/cellmätningen (slumpvis
  förlust, parningen hittar den fångade bucketen) men vinterns mätserier växer i halv
  takt. Täthetsbeslutet ligger nu på tavlan med tre vägar och kostnad (minutdieten #22).
- **S-2026-09-03kväll (forts): täthetsbeslutet taget och byggt (kort #44 → DECISIONS #62).**
  Bengt + Axel valde (a) i chatten. ingest/regn30.ts + regn-30.yml: lätt motfashämtning
  :41 mot ingests :11 — samma parser och INSERT som ingest, bara nederbördsrader
  (arkivdieten #4), ON CONFLICT DO NOTHING, ~1 CI-minut/timme. Bevisrad + täthetspuls
  (2/2-andel våta station-timmar, 3 h-fönster) i varje körning. EFTERMÄTNING BOKAD:
  regn-tackning körs om efter ~ett dygns drift — först när 2/2-andelen bevisligen
  stigit stängs kortet (rotationsläxan: ett beslut är inte klart förrän bygget bevisat).
- **S-2026-09-04: Radarinkopplingen i regnspåret DAGSATT** (Bengts order): rad på kort #42
  — efter radardomen 14/9 tas frågan upp om radarn som trigger mellan stationerna, med
  v3:s kalibreringsfaktor och via TROSKLAR-VATTENPLANING före kod. Före domen låst
  (cirkularitet + okalibrerad skala). Beslut Bengt + Axel.

## 2026-09-04 — Rimfrost-analysen (kort #46, hål A): körning #1 fällde sig själv — givarfelsfyndet
Analysfas på Bengts order. Skript + knapp byggda (sex villkorsvarianter, dygnsprofil som
fysikverifiering, underlagsvakt). Körning #1: 136 901 rader, 58 vintertimmar — men 53
"kandidater" kom från 3 stationer med yta−dagg −28…−49° (omöjligt = trasiga daggpunkts-
givare) och dygnsprofilen var platt; skriptets inbyggda kontroll skrev själv "dom får
inte fällas". LÄXAN STÖRRE ÄN FRÅGAN: en frostgren utan givarvakt blir en falsklarms-
maskin — RH-korsgivare + fysikaliskt band är obligatoriska delar av varje framtida
metodändring. v2 med äkthetsvillkor pushad och körd samma kväll (körning #2).

## 2026-09-04 — Rimfrost-analysen körning #2: 0 av 53 äkta — analysfasen levererade sin dom
Äkthetsfiltret (RH ≥ 90 + yta−dagg ≥ −5°) rensade ALLT: samtliga kandidater var givarfel
(57 rader, tre stationer: Ollsta, Storvik, Bolhyttan — daggpunkter upp till 49° över ytan).
Domen: metodhålet (daggpunkten oanvänd) står kvar men kan inte kvantifieras förrän höstens
första äkta frostnätter — knappen är redo; givarvakten är från och med nu obligatoriskt
förvillkor för frostgrenen; felet är isolerat till daggpunktskolumnen (offsetmodellen
opåverkad). Analysfasen betalade sig innan en rad motorkod skrevs: falsklarmsmaskinen
hittades i data, inte i produktion.

## 2026-09-04 — Kort #46 analysfas del 2 (Bengts metodfråga: "var detta enda sättet?")
Metodgenomgång gav tre spår, alla beslutade av Bengt ("gör 1,2,3"): (1) FI-daggpunkten
in i ingesten — KASTEPISTE fanns i Digitraffic men släpptes på golvet (verifierat live:
505/528 stationer); Lapplands septemberfrost ger äkta rimfrostnätter veckor före Sverige.
Bevis vid nästa ingest-fi-körning: ny loggrad "daggpunkt N st". (2) Höstens omkörning
byggs om till UTFALLSDRIVEN (starta i väglagets frost-omklassningar + gryningsbilder,
fråga bakåt) — missmätningens riktning, bevis per händelse. (3) Historik bakåt (stängd
väg) och fysisk mikrovalidering noterade, drivs ej. Mejlutkast till Trafikverket om de
tre trasiga daggpunktsgivarna levererat i chatten. Mönstret bekräftat tredje gången:
källan har fältet, ingest släpper det (svensk dewpoint, svensk vind, finsk KASTEPISTE)
— värt en egen genomgång: "vad mer ligger på golvet?"

## 2026-09-04 — FI-daggpunkten BEVISAD i drift: körning #25 grön, "daggpunkt 505 st"
Kedjan i sin helhet, med två läxor som gjorde sitt jobb: (1) rotationsläxan — bygget
triggades direkt efter push och körning #24 föll på 42703 (fi.weather_latest saknade
dewpoint_c; LIKE public ärvde avsaknaden) i stället för att ligga trasig till nästa cron;
(2) förstapubliceringsläxan — beviset är körning #25:s egen loggrad "fi: latest 528,
archived 361, daggpunkt 505 st", som matchar liveverifieringens 505/528 exakt.
sql/010 + automigrering i fi.ts (008-mönstret). Lapplands frostnätter arkiveras nu med
daggpunkt — rimfrost-analysen får äkta finska kandidater veckor före de svenska.

## 2026-09-04 — Automatkörningsinventering (Bengts fråga) + broarna väckta ur fyra dygns dvala
Full inventering: 13 cron-workflows verifierade — måndagskvartetten (grind-a 05:40,
smhi-prov 06:00, radar 06:20, källvakten 06:40), kontinuerliga (ingest SE/FI/NO/DK,
regn-30, publish */30, healthcheck 2h, marknadsföring, bridges 6h) + pulsklockan.
GULA FLAGGAN som inventeringen fångade: bridges.geojson hade ALDRIG fötts trots 6h-cron
sedan 31/8. Tvålagersrotorsak: exit 0 när speglarna fallerar (fail-soft utan vakt) +
ENOENT när Overpass kom tillbaka (data/ finns inte i färskt checkout — git spårar inte
tomma kataloger). mkdir-fix + lokal körning: 2476 broar committade (spegel 1 gav 504,
spegel 2 levererade). CDN-väktare på static.json armerad (fullkroppsgrep denna gång —
läxan från segment_id-väktaren som läste 600 tecken). Rimfrost-analysen är enda mätningen
utan cron — medvetet, Bengts val om den ska in i måndagsserien.

## 2026-09-04 — Kort #47 KLART: golvgenomgången (docs/GOLVET.md)
Tio källor mot levande fältdumpar — TRV via ny recon-knapp (fulla objekt utan INCLUDE,
körning 33840067087), Fintraffic/SMHI/Polisen lokalt, DK/NO ur ingest+tidigare recon.
Fem tunga fynd (sikt överallt, vind överallt, FI:s färdigräknade frostpunkt/fryspunkt/
nederbördsform, SMHI-moln som klar natt-detektor, metadataguldet SensorNames/PhotoTime/
LocationText) + två rena golv (fartkameror, Polisen) + en recon-lucka (Situation-dumpens
datumfilter). Allt som kandidater med föreslagen ordning — inget hämtat utan beslut,
free tier-vakten (DECISIONS #4) uttryckligen i dokumentet.

## 2026-09-04 — Kort #48 Golvbyggena LEVERERADE: arkivet breddat på två länder, allt självförsörjande
Byggen 1+2+4 i ett varv med Bengts automatiseringskrav uppfyllt: automigreringar (011 via
db.ts, 012 via fi.ts) körs vid varje ingest; healthchecken breddad med FI/DK-stalehetsvakt
(fanns inte alls!) och exists-vaktade fältgolv (vind ≥100/sikt ≥30 — larmar först efter
första skörden, ofödd-falsklarm omöjligt); förstapubliceringsloggrader i båda ingesterna.
BEVIS: SE #237 grön, FI #26 grön med "frostpunkt 433, sikt 455, vind 433" (= rekog-
noseringen exakt), healthcheck #69 grön. Sverige arkiverar nu vind×3 + sikt; Finland
därtill frostpunkt, saltfryspunkt, saltmängd, nederbördsform, ytstatus. LocationText in
i väglaget (COALESCE-bevarad, publiceras som "plats", fylls med vinterns omklassningar).
Fångat vid bygget: history-insertens args-index förskjöts av nya kolumnen (10/11-fixen).
Bygge 3 (PhotoTime) till webben-varvet — ingen edge-deploy-väg från terminalen/CI.
Motorvektorerna orörda: npm test 0 fallerande.

## 2026-09-04 — Broarnas rörläggning CDN-bevisad: bridges-nyckeln live, tom av rätt skäl
Väktaren greppade static.json — fel fil (broarna bor i live.json, tredje väktarläxan:
väktare ska verifieras mot rätt mål innan de armeras). Direktverifiering: live.json
05:54Z bär bridges-nyckeln, 0 broar = förfiltret gör sitt jobb (bara broar nära station
med yta ≤ +3° + fukt skickas — ingen bro i september är rätt svar). Kedjan repo-fil →
snapshot → CDN fungerar; första frostmorgonen nära en bro fyller arrayen automatiskt,
och publish-loggens "broar N" är löpande bevis. #38a är därmed HELT i drift: 2476 broar
i underlaget, väntar bara på väder.

## 2026-09-04 — Kort #49 Gränssnapshoten BYGGD + bevisad: FI in i svenska appen
build-snapshot.ts UNION:ar nu fi.weather_latest via ST_DWithin (40 km, ST_Collect av
hela svenska vägnätet), schema-vaktat. Publicering #596 grön, loggrad "gräns-wx (#49):
FI 16 stationer inom 40 km av svenska vägnätet (0 kalla nu)" — rörläggningen bevisad,
0 kalla i sept korrekt (samma som broarna). En förare i Haparanda/Karesuando/Riksgränsen/
Storlien matchas nu mot närmaste station oavsett land. Invarianterna orörda: privacy
(on-device), röst (punktkälla), motorvektorer (npm test 41/0). Healthcheck: FI-nåbarhets-
golv (<10 larmar), schema-vaktat. v1 = FI (äkta vägyta). Kvar: DK (grästemp-beslut #45,
Bengt/Axel), NO (via Vegvesen-kontot, samma mekanism), attribution i app-copyn (Axel).
Veckans Norrlands-mätning (12,6→11,5 %) är nu FAKTISK produktnytta, inte bara geometri.
- **S-2026-09-04 (eftermätningen, kort #44):** regn-tackning #2 (dagar=1): regnmätarnas
  2/2-andel 5 → 9 %, täckning 42 %. Tudelad dom: MEKANIKEN BEVISAD — pulsen nådde 30 %
  under timmar då motfasen gick, varje körning skriver ~85 rader som annars tappats —
  men GitHub-cronen svalt precis som före pulsklockan: 3 avfyrningar av ~14 möjliga
  (23:31 grön, 01:21 avbruten i npm-seghet, 06:31 grön), 5-timmarshål. Kortet står
  ÖPPET enligt beviskravet. Åtgärdsförslag till Bengt/Axel: regn-30 in i Supabase-
  pulsklockan (:41), samma bot som DECISIONS #26 gav ingest. Notabelt: npm-registret
  hade en dålig dag (npm ci 2–7 min i flera jobb) — orelaterat till vår kod.
- **S-2026-09-04: Norge-tillståndet beviljat** (Bengt fick DATEX-kontot, användarnamn
  TjeDatexlagerlof). ingest/no.ts härdad med varvets läxor före första skarpa körningen:
  rekognoseringen räknar nu även nyckelelementen (measurementSiteRecord, siteMeasurements,
  situationRecord, roadSurfaceTemperature, airTemperature) så parsern kan skrivas mot mätt
  struktur; fel-loggen bär API:ets svarskropp och skiljer 401 (fel par/ej aktiverat) från
  403 (saknad rätt/IP-spärr); identifierande User-Agent (NLOD-källangivelse, inga person-
  uppgifter); workflowen fick pipefail + Summary + npm-cache. Kvar: hemligheterna i GitHub
  Secrets (mänskligt handgrepp — passerar aldrig chatt eller repo), sedan rekognoserings-
  körning → parser i eget varv. Ingen no.*-skrivning förrän parsern finns.
- **S-2026-09-04 15:06: Pulsklockan + healthcheckvakten BEVISADE (Bengt: "kör du igång"):**
  pulsklocka #2 (14:05, skarp) la puls-ingest-fi 7,37 / puls-ingest-dk 12,42 / puls-regn-30
  41 i pg_cron (9 jobb totalt). Avfyrningar sedan dess: ingest-fi 14:37, ingest-dk 14:12 +
  14:42, regn-30 14:41 — aktören är Axelstar (token-dispatch), inte Scheduled. Healthcheck
  #73 (manuell 15:06, aa322b1) HEALTHY: cameras/weather 55 min, deviations/road_conditions
  1 min, fi 30 min, dk 25 min, gräns-wx 20 stationer, meta.json 30 min; incident-issues 0
  öppna. Avvikelse: pulsklocka.yml hänvisar till DECISIONS #63 som inte fanns i filen —
  skrivet i efterhand i detta varv. Inget skrivet i pg_cron från terminalen.
- **S-2026-09-04em: höjdprovet måndagsbokat** (Bengts ja): cron 07:00, sist i måndags-
  serien (grind-a 05:40 · smhi-prov 06:00 · cell-matning-v3 06:20 · trv-bevakning 06:40
  · hojd-prov 07:00). Workflowen hade redan pipefail + input-fallback. Tankeläget bokfört
  på 3b-kortet: felkartan dömer (behöver vi laga inlandsluckan alls?), luftankarna lagar
  (billigast, bevisade bortom 20 km men på höstdata), höjden finjusterar (0,71 °C/100 m
  äkta, men vänder tecken i inversionsnätter — aldrig fristående). "Okänt" i inlandet är
  ett legitimt utfall, inte ett misslyckande.
- **S-2026-09-04em: Norge REKOGNOSERAD** (ingest-no #28, efter 406-fixen — Accept */*):
  stationstabell 1,9 MB, mätdata 1,4 MB med 936 siteMeasurements varav 848 bär
  roadSurfaceTemperature (det Frost inte kunde ge), GetSituation 30 MB / 15 414 poster
  (gravstensläxan gäller vid inläsning). Parsern skrevs av terminalsessionen samma
  eftermiddag mot exakt den strukturen — se nästa post.
- **S-2026-09-04 15:47: 🇳🇴 Norge i gränssnapshoten (Bengt: "kör gränssnapshoten"):**
  build-snapshot.ts:s #49-block är nu en loop över fi + no (samma ST_DWithin 40 km mot
  svenska vägnätet, samma kall-filter, schema-vaktat per land, bevisrad per land).
  Pulsen (#619 15:37) och GitHub-cronen (#620) hann köra på förra commiten; manuell
  publicering #621 (e217891, webben-commit ovanpå c2eb330) gav: "gräns-wx (#49): NO 42
  stationer inom 40 km av svenska vägnätet (varav 0 kalla i snapshoten nu)", FI 16 (0 kalla).
  wx 0 i live.json = september, inte fel. Healthcheck: gränsvakten loopar fi/no med golv
  10/20 (NO-golvet satt EFTER mätningen, inte före). DK medvetet utanför (grästemp #45).
  Kartan (build-map-data vader.geojson) visar SE/FI/DK men INTE NO än — eget litet kort,
  karta-repots landfärger måste vaktas först.
- **S-2026-09-04 15:24: 🇳🇴 NORGE TICKAR (Bengt: "har du skrivit parsern?", DECISIONS #64):**
  parsern (ingest/sources/vegvesen.ts, regex utan beroenden, prefix-agnostisk) skriven mot
  rekognoseringen i ingest-no #28 (Accept */*; 468 siteMeasurements, 848 roadSurface-
  Temperature-element). Test mot fixtur (3 nya, 44/0 lokalt). Position låg utanför
  rekognoseringens fönster ⇒ strukturvakt (skriver inget + dumpar första stationen om
  koordinater/matchningar saknas). ingest-no #29 (dec1a05): 468 stationer (468 med
  koordinater), vägyta 422, luft 427, daggpunkt 425, fukt 436, nederbörd 0, mättid 468;
  latest 468, archived 468 (första observationen, policy #4). 013 la dewpoint_c +
  humidity_pct på no.weather_latest (samma fälla som fi/010). GetSituation hämtas inte
  längre (30 MB, 15 414 poster, nästan allt MaintenanceWorks). pulsklocka #3 skarp:
  puls-ingest-no 17,47 → 10 jobb i pg_cron. healthcheck #74 HEALTHY: no-arkivet 5 min,
  fi 23, dk 18. Reservation: nederbörd 0/468 — elementvägen (precipitationType/
  millimetresPerHourIntensity) är DATEX-standardens, inte mätt; bevisas första regnvädret.
- **S-2026-09-04kväll: kort #42 steg 1 förberett** (Bengts "förbered lastkajen recon"):
  scripts/lastkajen-rekognosering.ts + knapp. Ren läsning mot körschemats fyra frågor
  (licens, format mot 818-skelettet, färskhet, kontokrav) i två spår: öppna API:et med
  kandidatobjekttyper (RoadNumber-läxan: felmeddelandet listar ofta vad som finns) och
  Lastkajens publika ytor (katalog/swagger/licensord). Gissar ingen URL — provar
  kandidater, rapporterar status + svarskropp, säger vilken som bar frukt. Lokalt
  0 svar (containerproxyn), vakten fällde korrekt; mätningen sker i CI.
- **S-2026-09-04kväll (forts): OMTAG på kort #42 (DECISIONS #65, väg C).** Bengt frågade
  om Lastkajen-reconen var bästa sättet — den var det inte i sin serieform: den mätte
  tillgång, inte nytta (ankarklippningens fälla). Men mitt första motförslag (skjut
  spårdjupet till efter skuggan) var sämre: höstregnen är en engångschans i år. Valet
  blev parallellt — recon som kunskap, ansökan startas om den krävs, tröskeldokument
  utan gissad spårdjupströskel, skuggan startar oavsett, spårdjup som analyskolumn
  (steg 4b) om datan hinner fram. Körschemat §8 omskrivet med omtaget motiverat i löptext.
- **S-2026-09-04kväll (forts 2): reconen körd, kortet #42 ändrat (DECISIONS #66).**
  Kärnfrågan besvarad: spårdjup finns INTE i öppna API:et — PavementData (19 fält) och
  RoadData (24 fält) inventerade fältnamn för fältnamn, noll kandidater. Lastkajen
  kräver konto (405 på GET mot /api/Identity/Login = endpointen finns). Men samma
  körning gav en gratis proxy: AADT + AADTHeavyVehicles + RoadWidth + BearingCapacity +
  WearLayer + PavementDate/-Type/Thickness, allt i vägnummer + löpande längd. Steg 4b
  blir trafikproxyn, mätt spårdjup flyttas till nytt steg 4c. Färskhetsvarning mätt,
  inte antagen: beläggningsdatum 1967/1980/2013 i stickprovet — grov proxy på småvägar,
  men Lastkajens mätningar delar svagheten där. Reconen kostade två CI-minuter och
  sparade möjligen ett konto, en licensgranskning och en formatkonvertering.
- **S-2026-09-04kväll (forts 3): TROSKLAR-VATTENPLANING utkast skrivet** (kort #42 steg 2,
  Bengts order). Speglar TROSKLAR-SKUGGANs form: tre grindar (V-A påståendets bärkraft
  — LOO mot arkivet, mätbar före all skuggkod; V-B skuggdriften i höstregnen; V-C domens
  giltighet med binomialbruset utskrivet: N=200, p=0,20 ⇒ ±5,5 p.e.), asymmetrisk
  facittabell (granskningens §7.3: "regn utan olycka" är INTE falsklarm — bara stationen
  själv, torr kamerabild eller testarlogg får fälla), vinterinteraktionen (§7.4) som
  Axel-beslut med rekommendation, radarns roll villkorad av domen 14/9, och INGEN
  spårdjupströskel (#65/#66). Regntröskeln i mm/h avsiktligt osatt — ska falla ur V-A:s
  mätning, inte gissas. Fyra öppna punkter listade för Bengt att fälla; Axel fastställer.
- **S-2026-09-04kväll (forts 4): tröskeldokumentets värden fällda** (DECISIONS #67).
  Bengt fällde utkastet oförändrat samma kväll: V-A 70 %/25 % inom 0–10 km, V-B 20 %
  falsklarm / 40 % miss / max 3 varningar per rutt och regndygn, V-C ≥200 varningar,
  ≥15 facithändelser, ≥5 regndygn, ≥3 län. Regntröskeln i mm/h och radarns roll medvetet
  osatta — den första ska falla ur V-A:s mätning, den andra ur radardomen 14/9. Nytt
  kort under "Axel — beslut att ta": fastställandet + vinterinteraktionen. Ingen kod
  före Axels ja.
- **S-2026-09-04kväll (forts 5): TROSKLAR-VATTENPLANING FASTSTÄLLT** (DECISIONS #68).
  Axels ja relayerat av Bengt samma kväll, värdena oförändrade från #67. Vinterinteraktionen
  avgjord enligt rekommendationen: halkan vinner alltid, vattenplaningen vilar HELT vid
  yttemp ≤ +4 °C och ligger under halkan i A-skalan. Kodkonsekvens noterad nu i stället för
  upptäckt i december: vilan är ett förvillkor, inte en prioritetsfråga i alarmkön — fartgrind
  och regntröskel prövas aldrig under gränsen, vilket gör den testbar som egen vektor.
  #51:s hårda villkor uppfyllt (dokument före kod) ⇒ STEG 3 OLÅST: grind V-A är nästa bygge.
- **S-2026-09-04kväll (forts 6): grind V-A byggd** (kort #42 steg 3, Bengts "bygg grinden").
  publish/grind-v-a.ts + knapp + måndagscron 07:20 (sist i mätserien). LOO mot regnarkivet
  med stationen utesluten ur sin egen prognos. Två designval värda att minnas: (1) TRIPPEL-
  delning — träff / delvis / falsklarm — eftersom en tvådelning antingen blåser upp eller
  döljer falsklarmen; (2) regntröskeln SÄTTS inte utan faller ur mätningen, som dokumentet
  krävde: sex kandidattrösklar sveps och den lägsta som klarar 70 %/25 % i bandet 0–10 km
  är svaret. Binomialbrus per andel (V-C3), domspärr < 200 fall / < 20 stationer,
  underlagsvakt. Självtest med känd sanning grönt: identiskt regn 100 %/0 %, oberoende 34 %/66 %.
- **S-2026-09-04kväll (forts 7): grind V-A körd skarpt — FALLER, men fyndet är större än
  domen** (DECISIONS #69). n=1 141 fall i 0–10 km ⇒ riktig dom, inte "för tunt". Mot de
  fastställda kraven faller V-A på alla sex trösklar. Men falsklarmen klarar V-A2 med
  marginal överallt (12/10/8/7/4 %) — det är träffen som fäller (61 % mot 70 %), och
  DELVIS-andelen är stor och växande (27→71 %). Träff+delvis = 88–94 %. Slutsats:
  grannarna vet med hög säkerhet ATT det regnar hos målstationen, men inte HUR MYCKET.
  Intensitetströskeln bär inte; regnpåståendet gör det. V-A1 skrivs INTE om av Claude —
  att flytta målstolparna när siffrorna kommit är vad §5 förbjuder. Tre vägar lagda som
  beslutsläge på kortet (nej / §5-ändring / vänta på radardomen 14/9). Reservation mätt:
  rain_sum_mm startade 2/9, så fönstret är tre dygns septemberregn; måndagscronen fyller på.
- **S-2026-09-04kväll (forts 8): läsvarv inför radardomen — vakthunden visade sig vara
  obevakad** (Bengts "vi väntar på radardomen, du läser o samlar data"). Ingen kod ändrad,
  bara Actions-historik läst. Två mätningar, båda bokförda på tavlan:
  (1) **Kort #44, pulsen verkar.** Regn-30 har gått 8/8 hela timmar 12:41–19:41 på
  token-dispatch. Samma dygn dessförinnan, på ren GitHub-cron, landade 1 av 12 möjliga
  timmar — 3 avfyrningar varav 2 dog i jobbets 5-minutersgräns med hängande `npm ci`
  (normalt 1–2 s). Täthetspulsen i körningarnas egna loggar: 34 → 59 → 51 %. Varning mot
  övertolkning skriven in på kortet: pulsens 3 h-fönster klipper sin äldsta timme mitt itu,
  så den timmen kan aldrig få båda buckets ⇒ inbyggt tak klart under 100 %. Dygnsbeviset
  5/9 18:00 ska dömas mot den insikten, inte mot 100.
  (2) **NYTT KORT #50: healthchecken svälter.** Vakthunden är det enda tidskritiska jobbet
  som ännu går på naken GitHub-cron (genomgång av alla 15 cron-rader: pulsklockan bär
  ingest-familjen + regn-30; publish-map ärver pulsen via `workflow_run: [ingest]` —
  oavsiktligt men verkligt; bridges/marknadsföring/måndagsserien tål drift). Mätt över
  98 h 56 min: 20 av ~49 bokade avfyrningar = 40 %. Kortaste mellanrum 3 h 03, längsta
  6 h 44 (två gånger), snitt 4 h 59 — **noll** av 19 mellanrum nådde de bokade 2 timmarna.
  Workflowens egen kommentar ("vakthunden i skriptet larmar ändå inom 2 h") är därmed
  motbevisad. Konsekvensen är inte teoretisk: värsta hålet är 3,4× längre än
  stalehetsgränsen på 120 min som vakten ska fånga, och UNHEALTHY-larmet 4/9 11:27 var
  första blicken på en FI/DK-stalehet som redan pågått — nästa blick kom först 16:25.
  Läxa i klartext: **en vakthund som inte själv vaktas mäter inte tystnad, den mäter tur.**
  Åtgärden är en rad i pulsklockans NYA-lista (`puls-healthcheck`), men den rör skarp
  pg_cron och väntar därför på Bengts/Axels "kör". Beviskrav när det gått: ett dygn utan
  mellanrum över 2 h 30.
- **S-2026-09-04kväll (forts 9): vakthunden in på pulsklockan** (Bengts "kör push
  healthcheck", DECISIONS #70, PR #57). En rad i pulsklockans NYA-lista: `puls-healthcheck`
  `23 */2 * * *` → healthcheck.yml. Schemat oförändrat från workflowens eget cron — bara
  leveransvägen byttes — och GitHub-cronen står kvar, så pulsen är additiv som för regn-30.
  Kört inventering först (formatet bevisat), sedan skarpt: pulsklocka #5 21:08:18 grön med
  `OK puls-healthcheck: workflow=healthcheck.yml schema=23 */2 * * * aktiv=true token=true`
  och `Alla 5 pulsjobben på plats`. Elva cron-jobb i pg_cron nu, var tio. Bevisvakten är
  vad som gör raden värd något: den hade fällt jobbet rött om något av de fem pekat fel,
  tappat token eller fått fel schema.
  KORTET ÄR INTE STÄNGT. Rotationsläxan gäller — pg_cron-raden är inte beviset, avfyrningen
  är. Första pulsavfyrningen 22:23 UTC, avläsning bokad 22:38, dygnsmätning därefter;
  beviskravet är att inget mellanrum överstiger 2 h 30.
  Två sidofynd värda att minnas. (1) Genomgången av alla 15 cron-rader gjordes FÖRE kortet
  skrevs och ändrade påståendet: publish-map svälter inte, eftersom den är kedjad på
  `workflow_run: [ingest]` och därmed ärver pulsen — oavsiktligt men verkligt. Utan den
  läsningen hade kortet påstått något falskt. (2) Väntad bieffekt bokförd i förväg: en vakt
  som tittar var annan timme i stället för var femte kommer se stalheter som förut hann
  rätta sig osedda, så fler incident-issues betyder att vakten börjat fungera.
- **S-2026-09-04kväll (forts 10): kort #45:s grind kopplad — den hade annars förblivit låst**
  (Bengts fråga "hur gick det med allt vårt snack om vad som faller på vad"). Svaret: matrisen
  finns komplett på kort #45, inskriven 4/9 — vägytan som TILLSTÅND (torr → blöt → slask →
  snöbelagd → packad snöväg), nederbörden som ÖVERGÅNG ovanpå, och regn-på-snö som farligaste
  korsningen. Metoden är våtbulb per segment × radarintensitet, båda redan i arkivet.
  MEN TVÅ SAKER SOM INTE STÄMDE. (1) Kortet är låst bakom radardomen 14/9, och avläsningen den
  dagen var skriven för tre frågor som alla rörde #43 och #42 — #45 nämndes inte. Grinden hade
  alltså ingen som öppnade den. Avläsningen heter nu "Radardomen + #42-inkopplingen +
  #45-grinden" och bär #45 som fjärde fråga med båda utfallen samt snöbaseline-spärren
  (packad snöväg är NORMALT vinterväglag i norr och får aldrig larma).
  (2) Läst i koden, inte antaget: motorn kan i dag inte skilja fallen åt alls. `icing_point`
  avgörs av `surfaceTempC <= tröskel && moisture === true`, och `moisture` är hopslagen till en
  bit — `rain OR snow OR COALESCE(precipitation,'') <> ''` (publish/missar.ts). Regn på torrt,
  regn på snö och snö på snö ger samma `true`. Matrisens farligaste korsning är osynlig för
  motorn just nu. Det står nu på kortet, så nästa läsare ser luckan i stället för att anta att
  resonemanget redan blivit kod.
  LÄXA: ett kort som är låst bakom en dom måste NAMNGES i den domens avläsning. Annars är
  "låst" i praktiken samma sak som glömt — tavelregelns idéer-utan-kort-fälla, ett steg upp.
- **S-2026-09-04 22:40: pulsen TRYCKTE på vakthunden** (kort #50, bokad avläsning 22:38).
  healthcheck **#77**, `workflow_dispatch`, **22:23:02 UTC** — två sekunder efter schemats
  minut, utlöst av token precis som ingest-familjen. En schedule-körning hade inte bevisat
  något; det är skillnaden avläsningen letade efter. Utfall HEALTHY: gräns-wx 20 FI / 44 NO
  inom 40 km, 2 783 kameror, 818 segment, 153 150 väderobs, meta.json 11 min gammal, inga
  incident-issues (larmsteget hoppades över, auto-close körde).
  Mellanrummen kring bytet: #75 16:25 → #76 20:48 (4 h 23, gammal cron) → #77 22:23
  (1 h 35, pulsen). Det är första mellanrummet under de bokade 2 timmarna sedan mätningen
  i #70 började — men ETT mellanrum är inte ett dygn, och kortet stängs inte på det.
  Dygnsmätning bokad 5/9 21:30 UTC mot beviskravet: inget mellanrum över 2 h 30.
  Sidonotering: NO-stationerna i gränssnapshoten står nu på 44, mot 42 vid publicering #621.
  Fluktuation i vilka stationer som är nåbara, inte en ändring vi gjort — noterat, inget kort.
- **S-2026-09-05: svep inför kort #45 gav tre fynd större än frågan** (Bengts fråga: tar
  mätningen hänsyn till snö-på-snö och regn-på-snö, och hur bestäms Norrland?). Fyra parallella
  läsvarv genom repot; allt nedan efterkontrollerat av mig i koden, inte taget på ord.
  **SVARET PÅ NORRLAND-FRÅGAN: det definieras inte, och ska inte göra det.** Produkten är helt
  regionblind — inga läns-, latitud-, zon- eller gränsbegrepp i motorn, snapshoten eller
  ingesten, i någon av de tre portarna. Repots enda Norrland är `new Set([21,22,23,24,25])` i
  två MÄTSKRIPT (ankaranalys.ts:13, frost-prov.ts:16) som bara delar statistik. Rätt design:
  en geografisk gräns vore fel tre gånger om — baseline flyttar med årstiden, en bar blöt väg
  i Kiruna i november är en avvikelse värd att varna för, och baseline skiftar inom samma län.
  Per segment löser alla tre.
  **FYND 1 (NYTT KORT #51, brådskar): vinterarkivet skrivs nästan inte.**
  `road_condition_history` kallas i sql/001 "the winter archive (our moat)", men dess enda
  skrivare är GitHub-ingesten. Livemotorns edge function — som äger väglaget sedan 25/8 och kör
  varje minut — skriver bara `road_conditions` som UPSERT, noll träffar på historiken. Båda
  delar changeid-kursor (`sync_state` källa road_conditions), så minutjobbet flyttar fram
  kursorn ~59 ggr/timme och timjobbet ser bara sista minutens delta. Omklassningarna däremellan
  försvinner. Ingen vakt märker det: healthchecken mäter färskhet och antal segment, aldrig om
  historiken växer. Kort #45:s baseline OCH marsdomens vinterfacit vilar båda på detta.
  Magnituden är ännu inte mätt — mekanismen är bevisad, siffran är en slutsats, och första
  steget är därför en mätning (rader/dygn före och efter 25/8), inte en fix.
  **FYND 2 (NYTT KORT #52): ett test låser fast motsatsen till baseline-principen.**
  test/engine.test.ts:143-146 kräver att code 1 (Normalt) + "Packad snö" MÅSTE ge ett larm —
  exakt det fall kort #45 säger aldrig får larma i norr. Samma test i alla tre portarna. Att
  ändra det är en kontraktsändring mot engine/vectors, alltså ett beslut, inte en fix.
  **FYND 3: #45:s "alla ingredienser ligger redan i arkivet" var för optimistiskt.**
  weather_latest (som snapshoten byggs ur) bär varken fuktighet eller daggpunkt; höjd lagras
  inte alls (hojd-prov hämtar live från opentopodata); ingen våtbulbsformel finns i koden.
  Det som FINNS per segment är radar_precip. Halva metoden är verklig, andra halvan obyggd.
  **SIDOFYND (bugg, bara marknadsmotorn):** vader.geojson publicerar ingen `lan`-egenskap
  (build-map-data.ts:48), men marknadsforing/generator.mjs:36 läser `p.lan` på väderstationer
  ⇒ alltid hink 0 ⇒ LAN[0] undefined ⇒ frys-/snöräknarna kan aldrig bidra till ett länslarm.
  Rör inte produkten. Nämnt, inte fixat — inte mitt uppdrag i det här varvet.
  **LÄXA:** kortet påstod "alla ingredienser finns" utan att någon läst schemat. Ett
  ingredienspåstående är en mätning, inte en känsla — det ska beläggas när kortet skrivs.
- **S-2026-09-05 04:02: arkivläckan MÄTT — nollresultat, och en tom moat** (Bengts "mät
  bortfallet på 51", DECISIONS #71, PR #61). Knapp byggd med självtest mot känd sanning
  (10 segment, 4 oarkiverade, 2 utan historik — alla fyra måtten gröna), underlagsvakt under
  100 segment och invariantvakt mot trasig join.
  UTFALL: bortfall 0 av 818 segment. Hypotesen om ett stort bortfall bekräftades INTE.
  Men arkivet är 830 rader över 818 segment, nyaste raden 2026-08-25 08:09, och tidsserien
  över 30 dygn innehåller en enda dag. Ingen omklassning på elva dygn. Bortfallet är noll för
  att flödet står stilla — nollresultat, inte friande dom.
  Det större fyndet: moaten är inte läckande utan TOM. Ingen vinterhistorik finns, bara ett
  stillbildsavtryck per segment. Kort #45:s baseline saknar underlag oavsett läckan.
  Blind fläck i samma varv: healthchecken vaktar sync_state-färskhet, men edge-funktionen
  skriver synced_at varje minut oavsett utfall — vakten kan inte skilja "färsk och tyst" från
  "färsk och trasig". Samma familj som fail-soft-läxan: ett kvitto på att jobbet KÖRDE säger
  inget om att det UTRÄTTADE något.
  REKOMMENDATION till Bengt + Axel: bygg vakten, inte fixen. En tillväxtvakt på
  road_condition_history ger besked första dygnet snön faller. Den avgörande mätningen —
  egen kursor åt GitHub-ingesten och mät differensen — ändrar produktionsflödet och kräver ja.
- **S-2026-09-05 04:25: arkivvakten byggd och i drift** (Bengts "bygg vakten", kort #51,
  PR #63). Sitter i healthchecken, som går var annan timme på pulsklockan sedan #50.
  Den svåra delen var att "arkivet växte inte" inte går att larma på: i september klassas
  inget om, och en tillväxtvakt hade tjutit hela hösten och blivit avstängd precis före
  vintern då den behövs. Vakten frågar i stället något som bara har ett svar — finns ett
  NUVARANDE tillstånd som borde ha hunnit arkiveras och inte gjorde det? Tröskeln 3 h är tre
  ingestkörningar, så en saknad rad är förlorad och inte försenad, och en enstaka fallerad
  ingest fäller inte vakten.
  BEVIS (healthcheck #82, HEALTHY): `arkivvakt: 0 oarkiverade av 818 prövade tillstånd (>3 h)
  · arkivet 830 rader, nyaste 260 h gammal · 0 omklassningar senaste dygnet`.
  Loggraden bär nämnaren och tystnaden med flit. "0 oarkiverade" utan skala är ett tal utan
  mening, och utan omklassningsräknaren bredvid kan det läsas som hälsa när det bara är tyst
  — exakt det fel gårdagens mätning nästan lurade mig att göra.
  EJ BEVISAT och sagt som sådant: larmgrenen har aldrig fällt skarpt och kan inte bevisas
  förrän strömmen rör sig. Joinens semantik är prövad mot känd sanning i arkivlackans
  självtest. Kvar att besluta: den avgörande kursormätningen, som ändrar produktionsflödet.
- **S-2026-09-05 04:38: kursormätningen körd — TRV som domare, pipelinen friad, läckan kvar
  otestbar** (Bengts order, DECISIONS #72, PR #65). Jag hade lovat att mätningen skulle avgöra
  saken utan att vänta på snö. Löftet höll inte, och felet var mitt: starvation kräver ett
  flöde att svälta på, och strömmen står still.
  Byggdes därför om till en HELT LÄSANDE variant som låter Trafikverket vara domare i stället
  för att jämföra våra tabeller med varandra — gårdagens cirkulära fel.
  BEVIS (kursormatning #1): last_change_id 7677878362341114260 = TRV:s just nu ⇒ IKAPP.
  818 levande segment, 0 omklassade senaste timmen/dygnet/veckan, 0 av 818 saknas i arkivet.
  DOM: OTESTBAR — och domspärren är prövad i självtestet så tyst ström aldrig kan bli friande.
  AVGJORT: pipelinen är inte döv, arkivet är komplett mot källan, livemotorn ligger ikapp.
  Blinda fläcken från #71 är därmed STÄNGD — "färsk och tyst" är bevisat tyst, inte trasigt.
  INTE AVGJORT: läckan. Kortet #51 står öppet till första omklassningsvädret, då arkivvakten
  (var annan timme) och kursormätningen (på knapp) gör jobbet automatiskt.
- **S-2026-09-05 04:55: egen kursor åt arkivspåret i drift** (Bengts "ja bygg", DECISIONS #73,
  PR #67). GitHub-ingesten läser nu road_conditions_arkiv; livemotorns nyckel orörd. Tre
  följdändringar hörde till: bakåtvakt mot regression på upserten (kapplöpningsfönstret växer
  när vi behandlar en hel timme), räknare på rowCount i stället för c.length, och ett SKÄRPT
  integrationstest — det fällde mig först och hade rätt, eftersom det krävde history: 1 på
  omkörning trots att noll rader skrevs.
  BEVIS (ingest #267): full första synk (ingen road_conditions-nyckel i kursorlistan),
  818 segment, DB WRITE OK {"road_conditions":818,"history":0}. Nollan är ärlig — inget nytt
  att arkivera. Gamla räknaren hade skrivit 818 och ljugit.
  OVÄNTAD INSIKT, viktigare än bygget: samma körning mätte 178 segment med regn (max 15,38
  mm/h) men noll omklassade väglag. REGN FLYTTAR INTE VÄGLAGSSTRÖMMEN — omklassning är ett
  vinterfenomen. Det förklarar tystnaden definitivt, och det betyder att vi hade fel om att
  höstregnen skulle ge väglagsdata. De ger REGNdata, vilket är något annat. Gäller #51 och #45.
- **S-2026-09-05 07:28: cry-wolf-ytan mätt inför #52** (Bengts "mät norrlandssegmenten",
  vinterbaltet #1, PR #69, helt läsande). Vägnätet är 818 segment och 23 700 km. Alla 818 bär
  exakt en länskod — noll utan län, noll över flera — så uppdelningen är entydig.
  Norrland (21–25): 168 segment (20,5 %) men 7 519,6 km (31,7 % av sträckan).
  Vinterbältet (17,20–25): 258 segment (31,5 %), 10 389,6 km (43,8 %).
  FYNDET SOM INTE SYNS I PROCENTTALET: nordliga segment är LÅNGA. Jämtland 59,0 km per
  segment, Västerbotten 50,4, Norrbotten 47,1 — mot Stockholm 18,4 och Skåne 20,7. Snittet i
  Norrland är 44,8 km mot 24,9 i resten, alltså 1,8 gånger längre. Ett enda "Packad snö"-
  segment i Jämtland är nästan sex mil sammanhängande varningsyta, och eftersom repriser
  släpps efter 10 min OCH 5 km kan samma segment tala upp till tre gånger under en resa
  längs det. Procenttalet underskattar alltså problemet mätt i tid under larmande segment.
  GRÄNSEN, upprepad: exponering, inte incidens. Ett tak, inte en prognos — vi har ingen
  vinter i arkivet. Två länsgränser redovisas för att valet är ett produktbeslut.
  Beslutet ligger hos Bengt + Axel; ingen ändring görs på eget bevåg eftersom den rör
  engine/vectors och tre körtider.
- **S-2026-09-05: "går det göra segmenten kortare?" — mätt i motorn, svaret är NEJ**
  (Bengts fråga → "mät"). scripts/segmentlangden.ts + knapp: motorn körs skarpt mot
  syntetiska resor i 90 km/h längs hela segmentet, code 1 + "Packad snö". Ingen databas,
  inget nät, helt reproducerbar. Självtest med känd sanning: 5 km ⇒ exakt 1 larm (200 s
  körtid < 600 s reprisfönster), och 59 km klassat "Torrt" ⇒ 0 larm.
  Larm per resa — A som i dag · B delat i 5 km-bitar · C regeln "en gång per segment":
  Jämtland 39 min: 4 · 12 · 1. Västerbotten 34 min: 4 · 10 · 1. Norrbotten 31 min: 4 · 9 · 1.
  Dalarna 25 min: 3 · 8 · 1. Utanför Norrland 17 min: 2 · 5 · 1. Stockholm 12 min: 2 · 4 · 1.
  Jämtland delat talar minut 0, 3, 6, 9, 13, 16, 19, 22, 26, 29, 32, 36 — var tredje minut
  i trettionio minuter.
  VARFÖR: ett nytt id har ingen reprishistorik (`if (!f) return true`), så varje bit är
  berättigad direkt och talar en gång. Geometrin är inte spaken. Dessutom vore kortare
  segment FALSK PRECISION — Trafikverket klassar hela sträckan, så finare geometri bär
  inte finare information, och att låtsas annat bryter mot överdrivandeförbudet.
  SPAKARNA i stället: (1) #52/#45 — larmar inte baseline-snö alls blir längden irrelevant;
  (2) reprisregeln för segment ger kolumn C, 4→1 i norr och 2→1 i söder, utan geometriändring
  och med verkan i hela landet (men en avvägning: en påminnelse efter en halvtimme kan vara
  önskad); (3) rösten säger inte hur långt sträckan räcker — Axels spår.
- **S-2026-09-05 ~15:40: HELA PIPELINEN STÅR — nytt kort #53** (Bengt rapporterade ett
  regn-30-fel; det visade sig vara mycket större än regn-30).
  DIAGNOS: ingest #275 kl 11:11 lyckades på 32 s, #276 kl 12:11 föll på 4 s — SAMMA COMMIT
  (a7caa3d), samma workflow-fil, ingenting ändrat däremellan. Efter ~12:11 faller varenda
  workflow: ingest, fi, dk, no, publish-map, bridges, healthcheck, regn-30. Alla dör på
  3–5 s med noll steg och noll loggar (logg-API 404). Ett jobb som dör före första steget,
  i alla workflows samtidigt, på oförändrad kod, är ett konto- eller inställningsfel.
  TROLIGAST: Actions-minuterna slut. Repot är privat (verifierat: visibility private) och
  privata repon på Free har 2 000 min/månad. Räknat ur observerade körningar 12:00–15:37:
  ~9 körningar/h, och GitHub avrundar varje jobb uppåt till hel minut medan våra jobb tar
  20–40 s ⇒ ~216 min/dygn ⇒ 2 000 räcker ~9 dygn. Repot skapades 24/8.
  LÄXA VÄRD ATT MINNAS: vår jobbform är maximalt dyr under den modellen — många små jobb,
  där ett 25-sekundersjobb kostar en hel minut. Pulsklockan (#63/#70) gav oss tillförlitlighet
  och fördubblade samtidigt minutförbrukningen. Ingen räknade på den avvägningen när den
  byggdes, och fritier-regeln i CLAUDE.md säger att vi skulle gjort det.
  KRÄVER BENGT/AXEL: Settings → Billing → Actions, och Settings → Actions. Jag har varken
  behörighet eller insyn. Tre vägar om det är minuterna: höj spending limit (kostar pengar,
  kräver DECISIONS-post), gör repot publikt (Actions blir gratis; hemligheter i Secrets
  läcker inte men kod och tavla blir offentliga), eller skär i kadensen — att slå ihop
  ingest-fi/dk/no till ett jobb sparar ensamt ~4 min/h.
  Livemotorn i Supabase (pg_cron) berörs INTE — den kör utanför GitHub.
- **S-2026-09-05: de två gratisdelarna byggda (kort #53)** (Bengts "ja bygg de två").
  (1) Cron borttagen ur ingest, ingest-fi, ingest-dk, ingest-no och regn-30 — de fem
  pulsdrivna, som körde dubbelt (bevis: ingest-dk 15:11:16 schedule + 15:12:01 dispatch,
  45 s isär). Varje rad bär nu ett VARFÖR så ingen återställer den som en glömska.
  Healthcheckens cron BEHÅLLS: hänger allt annat på pulsen måste något ha en oberoende
  klocka, annars dör pulsen tyst — vakthundsläxan från #50 i ny form.
  (2) ingest-grannar.yml kör FI+DK+NO i ett jobb: en checkout, en npm ci. Oberoendet
  bevarat med `if: !cancelled()` så ett lands fel inte tystar de andras insamling.
  (3) Pulsklockan kan nu AVVECKLA jobb. Den kunde bara skapa — ett hål som var osynligt
  tills merget krävde det, för utan borttagning hade de gamla pulsjobben fortsatt fyra mot
  de gamla filerna och besparingen blivit noll. Avveckling sker SIST, efter att ersättaren
  skapats, och bevisvakten kräver att de avvecklade faktiskt är borta.
  INTE AKTIVERAT: kräver en pulsklocka-körning, som kräver att Actions lever. De gamla
  filerna ligger kvar med borttagen cron så pulsen träffar dem tills den pekas om — inget
  glapp. Radering av dem blir ett eget varv EFTER att avvecklingen bevisats.
  ÄRLIGT OM RÄCKVIDDEN: det räcker inte. publish-map är uppmätt till 69-74 s per körning,
  alltså 2 debiterade minuter, var 30:e minut = 96 min/dygn ≈ 2 880 min/månad. Publiceringen
  ensam överskrider hela gratisnivån. Under 2 000 kommer vi inte utan att publish-map också
  flyttas eller saktas ned, och kadensen är beslut #22:s löfte om ≤ 35 min färsk webb.
  BEHÖRIGHETSFYND: Bengts konto har `admin: false` på repot (verifierat via API). Han kan
  alltså varken se fakturering eller ändra Actions-inställningar — det måste Axel göra.
- **S-2026-09-05 18:00: dygnsbeviset för kort #44 — halva delen klar, andra omöjlig**
  (bokad avläsning). KADENSEN BEVISAD: regn-30 gick 23 av 23 timmar i följd 4/9 12:41 →
  5/9 10:41, varje timme på minuten :41, alla via workflow_dispatch, alla gröna. Ett helt
  dygn utan ett missat varv. GitHub-cronen i samma fönster: 8 av 29 möjliga (28 %), och
  utspridda 16:35, 19:07, 21:48, 00:22, 04:55, 09:20, 13:01, 16:14 — aldrig på :41. Det
  bekräftar #70:s 40 %-mätning oberoende och motiverar i efterhand borttagningen i #53.
  ANDRA HALVAN GÅR INTE: 2/2-andelen kräver en regn-tackning-körning och Actions ligger
  nere. Beviskravet i #62 gäller, kortet stängs inte. Kadens är inte täckning.
  BIFYND som skärper #53: regn-30:s sista gröna var 10:41 och första röda 11:41, alltså
  började avbrottet mellan 11:11 och 11:41 — snävare än fönstret jag först angav ur ingest.
- **S-2026-09-05 21:35: dygnsmätningen för kort #50 — mätt, men dygnet finns inte**
  (bokad avläsning). Fönstret kortet bokade (4/9 22:23 → 5/9 22:23) är inte mätbart:
  Actions har inte startat ett jobb sedan ~11:41. Mätte därför det levande fönstret och
  sa det uttryckligen. 4/9 22:23:02 → 5/9 10:40:27 (12 h 17 min, 11 lyckade körningar,
  10 mellanrum): kortast 1 min, längst 2 h 00 min 01 s, snitt 1 h 13 min, 0 av 10 över
  gränsen 2 h 30. Pulsen levererade 6 av 6 tvåtimmarsavfyrningar på :23, varje gång inom
  2 sekunder. Så långt håller beviskravet — men ett halvdygn är inte ett dygn, och
  KORTET STÄNGS INTE. Pågående hål vid mätningen: 10 h 54 min, 4,4 gånger stalehetsgränsen.
  FYNDET SOM VAR NYTT: pulsen gav vakthunden en oberoende KLOCKA men ingen oberoende
  LÖPARE. Pulsklockan fyrade planenligt genom hela avbrottet (dispatch på 12:23, 14:23,
  16:23, 18:23, 20:23 finns alla) och varenda körning dog på 1 sekund utan steg.
  Vakthundens enda eskaleringsväg är att öppna en incident-issue, vilket kräver att jobbet
  får köra. Kvitto: 0 öppna incident-issues efter elva timmars totalstopp. Ett fel som
  slår ut runnern slår alltså ut både insamlingen och larmet om den — samma enda punkt.
  Att avbrottet ändå syns beror på GitHubs egna misslyckandemejl, inte på något vi byggt.
  LÄGET I #53: 100 av de 100 senaste körningarna (15:11 → 21:17, alla workflows) röda,
  ~16 döda körningar i timmen, logg-API 404 även på den senaste. Kortet kan inte drivas
  vidare utan Billing-sidan, och den kräver Axel.

## 2026-09-06 — 🛑 GitHub-pipelinen död sedan 5/9 13:12: Actions-minuterna slut (Bengts larm)
Bengt: "vår lagring i GitHub har nått maxgräns och vi får inte längre data". MÄTT: det är inte
lagring utan Actions-MINUTER — Usage metrics visar 1 985 av 2 000 (privat repo, gratisplan) förbrukade
1–5 september; publish-map #761 och alla körningar sedan 5/9 ~13:12 dör efter 3–7 s med "The job
was not started because recent account payments have failed or your spending limit needs to be
increased". CDN meta.json senast 2026-09-05 11:11Z. Livemotorn (pg_cron, Supabase) och skuggmotorn
rullar opåverkade; healthchecken kan inte larma eftersom den själv bor på Actions. Fördelning:
publish-map 616 · ci 299 · ingest-fi 236 · android 197 · ingest 193 · ingest-no 160 · ingest-dk 97
· healthcheck 49 · regn-30 46 (av 1 985). DECISIONS #22 budgeterade ~1 750/mån; sedan dess: ci på
404 pushar/30 d, pulsklockans breddning 4/9 (FI/DK/NO/regn-30 ≈ 539 min på två dygn — Claude
terminalen, utan minuträkning) och publish-map var 30:e min. Bokfört: tavlans kort 0 (Axels
beslut) + nytt Claude-kort "Minutbantning". INGEN ändring i pipelinen gjord — allt väntar på
Axels val; bantningen byggs oavsett men släpps på först när minuter finns.
KONSEKVENS FÖR GRANSKNINGEN AV #51 (Bengts fråga samma morgon): trigger-förslaget står sig —
det flyttar arkivskrivningen IN i databasen och bort från GitHub-minuterna. Den egna kursorn och
varje pulsdriven GitHub-körning går åt andra hållet: de kostar minuter per körning.

## 2026-09-06 07:00 — Bokad avläsning: Actions lever inte
Provkörde den lättaste workflowen i repot (`segmentlangden` — varken databas eller nät) på main:
körning #1, workflow_dispatch 07:00:32 UTC, död efter 4 sekunder med noll steg. Samma symptom
som 5/9, nu på annan kod (main hade fyra nya commits). Ingen aktivering av kort #53:s färdiga
gratisdelar, ingen regn-tackning för #44, ingen ny dygnsmätning för #50 — alla tre kräver att
jobb får köra. FÖRLORAD INSAMLING: 19 h 24 min från första döda körningen 11:41 (19 h 54 min
från sista säkra 11:11). Byggde ingenting; incheckningen sa uttryckligen att inte göra det.
TIDSZONSNOT: terminalvarvets kort säger "död sedan 5/9 13:12" och jag säger 11:11–11:41 — samma
ögonblick, CEST mot UTC. Husregeln är UTC.
MERGE: origin/main (terminalvarvets minutplan, fyra commits) merged in i grenen, konflikterna i
TAVLA/STATUS var ren append-mot-append och båda sidor behölls.

## 2026-09-06 15:05 — Avläsning 2: Actions lever fortfarande inte
segmentlangden #2, workflow_dispatch 15:05:17 UTC, död efter 4 sekunder med noll steg — identiskt
med #1 åtta timmar tidigare, samma commit (0c2f1bc). Förlorad insamling sedan 5/9 11:41: 27 h 24 min.
Ingen ny diagnos, inget byggt: minutplanen räknar problemet färdigt och nästa steg kräver Axel
(Billing, publikt repo eller self-hosted runner). Ny avläsning bokad ~8 h fram.

## 2026-09-07 12:01 — Avläsning 3 (Bengts "kolla igen"): Actions lever fortfarande inte
segmentlangden #3, workflow_dispatch 12:01:24 UTC, död efter 5 sekunder med noll steg. Pulsen
fyrar fortfarande varje slot (ingest 11:11, fi 11:37, regn-30 11:41, dk 11:42, no 11:47 — alla
röda på 4 s). Förlorad insamling sedan 5/9 11:41: 48 h 21 min, två dygn. Ingen ändring på main
sedan 6/9. Inget byggt. Nästa steg kräver Axel.

## 2026-09-07 20:05 — Avläsning 4: Actions lever fortfarande inte
segmentlangden #4, workflow_dispatch 20:05:17 UTC, död efter 5 sekunder med noll steg. Alla
pulsslottar 19:37–19:56 röda på 3–4 s. Förlorad insamling sedan 5/9 11:41: 56 h 25 min. Ingen
ändring på main sedan 6/9. Inget byggt. Nästa steg kräver Axel.

## 2026-09-08 04:09 — Avläsning 5: Actions lever fortfarande inte
segmentlangden #5, workflow_dispatch 04:09:28 UTC, död efter 5 sekunder med noll steg. Pulsslottarna
03:37–04:07 röda på 4 s. Förlorad insamling sedan 5/9 11:41: 64 h 29 min. Ingen ändring på main.
Inget byggt. Nästa steg kräver Axel.

## 2026-09-08 11:56 — Kontroll av #72 (Bengts "fungerar den?"): JA, bevisat oberoende
Klonade kartrepot och läste historiken: 35 commits "data: … (Supabase)" i följd 06:10:30 →
11:50:05, exakt var 10:e minut, inget hål; dessförinnan tystnad sedan 5/9 11:12. live.json
6,8 min gammal vid avläsningen: 0 segment, 1 väderstation, 1 olycka, 15 SMHI, 2 783 kameror.
Actions samtidigt fortfarande dött (segmentlangden #6, 11:55:40, 5 s, noll steg) — kedjan lever
utan GitHub. Bifynd: (1) broarna föll ur appen 7 → 0, publicera skriver bridges: [] över hela
filen — kort #74, två skrivare till en fil; (2) kartsajten fortfarande 5/9 11:11 (bara app-filerna
publiceras ur Supabase); (3) appens enda väderpunkt är Storvik 2135 med yta −10,7 °C i september,
känt givarfel från #46 men där ansågs felet isolerat till daggpunkten — motorn gör det till en
icing_point. Kort #75, givarvakt före publicering.

## 2026-09-08 12:22 — Avläsning 6, läst mot grunden: Actions lever inte, minuterna orörda
Bengt: Axel säger att han vidtagit åtgärder. Axels åtgärd är #72 (Supabase-flytten), bevisad.
På minutsidan per API: repot private; jobbet 102054360896 (prov #7, 12:06:35) runner_id 0,
runner_name tom, dött efter 2 s med tom check-run; alla 35 workflows active; pulsen fyrar
(12:07–12:17, alla röda på 4 s); inga commits eller grenar efter 06:12. Spending limit och
betalstatus kan bara Axel läsa. Förlorad insamling sedan 5/9 11:41: 72 h 41 min. Inget byggt.

## 2026-09-08 12:45 — #74/#75 byggda: snapshotkärnan, givarvakten, och tre fynd ur grunden
Bengts "bygg 74 och 75". Läst mot grunden före kod: (1) publicera skriver ingen manifest.json —
apparna verifierar sha256 och förkastar; manifestet på CDN 5/9, live.json 8/9, MISMATCH mätt.
Appen har inte fått en ny snapshot sedan 5/9. (2) ingest-live:s väder skrev bara arkivet, aldrig
weather_latest som publicera läser — tabellen frös 5/9 11:05. (3) Båda skrivarna gjorde
Boolean(precipitation) och Trafikverket skriver "no" vid uppehåll: varje torr station var "våt".
BYGGT: publish/snapshot-core.ts (enda källan, körtidsneutral), build-snapshot.ts som tunn
Node-ingång, publicera/main.ts + scripts/bundle-publicera.ts → genererad index.ts med 2 476
broar inbäddade, CI --check, publish-map utan app-steg, WX_SANE i alla väderfrågor, fukt-regel,
weather_latest-upsert i ingest-live. 50 tester gröna (7 nya), bundlarna parsar, YAML ok.
KAN INTE BEVISAS HÄRIFRÅN: Deno-typkontroll, deploy, PostGIS-testet. Axel deployar publicera +
ingest-live; beviset är en kartrepo-commit med alla tre filerna och manifest-sha = live-sha.
DECISIONS #74.


## 2026-09-08 20:04 — Axels åtgärder kontrollerade mot kartrepot och main
Manifest och live.json båda generated_at 20:00:12, sha256 MATCH för live och static; första
commit med manifest 4013689 kl 17:18. SMHI i motorns format, bundle-publicera --check "i synk"
på main. Storvik borta ur live.json (0 väderpunkter). Axel lagade ett bool-array-fel i min
weather_latest-upsert (postgres.js + UNNEST; nu text[] med ::boolean, 822d178) och lade
manifestkontrollen i vakthunden. Tre pulsjobb av: inga dispatch-körningar av ingest,
publish-map eller healthcheck sedan 18:37. #74/#75 KLART, #76 åtgärdad på main (deploy ej
bevisad härifrån). Nytt fynd #77: publish-map.yml har kvar schedule */30 (körning #980
19:03:50 var schedule) — 96 min/dygn när kvoten kommer tillbaka. Actions fortfarande dött.

## 2026-09-08 20:40 — #77 byggt: kartlagren in i publicera, publish-map utan cron
Bengts "vi gör nummer 1 nu". publish/map-core.ts (kärna, körtidsneutral) + tunn build-map-data.ts;
publicera bygger kartlagren på :00/:30 och committar dem med appfilerna; bundlern buntar båda
kärnorna; publish-map.yml utan cron och utan kartlager/app-steg, kedjad på ingest + ingest-grannar
för fi/dk. 52 tester gröna (2 nya), bundlen i synk och parsar, YAML ok, tsc rent. Kan inte
bevisas härifrån: deploy och wall-clock för 1,7 MB via Git Data API — svaret bär `ms`.
DECISIONS #77.

## 2026-09-08 21:00 — Bengts "så många som möjligt härifrån": två av sex
Blockerat härifrån (mätt): ingen Supabase-token eller CLI, ingen DATABASE_URL, proxyn släpper
bara github.com ⇒ deploy (1), SQL-bevis (2), vakthundsbevis (3) och Billing (5) kräver Axel.
Gjort: (4) ingest-fi/dk/no.yml raderade — pulsen får 404 i stället för att skapa döda körningar
och mejl, och oktoberpotten bränns inte på gamla filer; (6) deploy-supabase.yml byggd, kräver
SUPABASE_ACCESS_TOKEN (kort #78). Nytt kort #79: regn-30 troligen överflödig sedan #72, 720
min/mån annars. DECISIONS #78.


## 2026-09-08 21:15 — #77 bevisat av Axel, weather_latest bevisat tinat, #78 mergat
Axel deployade publicera från 15ba9ad: ms 10 727, meta.json 20:23:03, stationer 1 300,
kameror_vaglag 746 (DECISIONS #77-bevis). Sex filer i commiten, inte nio — Git Data API
blobbar bara det som ändrats; min förväntan var fel. Ur vader.geojson: 848 SE-stationer, 99 %
med sample_time ≤ 12 min, Storvik nu yta null med tid 20:15 ⇒ weather_latest-tinandet (punkt 2)
är bevisat i grunden. PR #75 (#78) mergad efter en append-konflikt i DECISIONS, båda sidor
behållna. Kvar av sex: vakthundsbevis (3), Billing-klipp (5), SUPABASE_ACCESS_TOKEN (6).

## 2026-09-08 21:40 — Kort #42: facitet svalt sedan 5/9, lagat i ingest-live
Bengts "kan vi åtgärda #42 nu?". Läst i koden: ingest-live:s weather() skriver arkivet utan
rain_sum_mm, snow_wateq_mm, vind och sikt — grind V-A och regn-tackning läser rain_sum_mm.
Arkivet har fått rader sedan 8/9 men inga mängder; septemberregnen 5/9–8/9 omätta. Insert
speglar nu ingest/sources/weather.ts fält för fält; tv() har inget INCLUDE så fälten finns.
Parsar. Deploy och bevis: Axel. Beslutsläget a/b/c (DECISIONS #69) rörs inte. DECISIONS #79.


## 2026-09-08 21:32 — Actions lever, pulsklockan körd, grannar-jobbet bevisat
Axel satte 35 USD (DECISIONS #81/#82) 21:07. Första jobbet: pulsklockan från grenen —
mallen bytt till puls-regn-30 (puls-ingest avstängd), NYA bara grannar hourly, healthcheck
återskapas inte. Inventering #6 ren, skarp #7 bevisad (DECISIONS #83). Första grannar-
dispatchen 21:24:01, körning #1 grön: FI 2:17, DK 0:29, NO 2:06 = 5:00 ⇒ ~120 min/dygn.
ci grön på main (#455/#456) ⇒ PostGIS-testet av givarvakten passerade. Healthcheck #144
UNHEALTHY på cameras/road_conditions_arkiv/fi/dk/no: grannländerna löser sig från nu, men
kameror, moaten, vilt och SMHI saknar skrivare sedan puls-ingest stängdes — kort #80.
PR #78 mergad efter en append-konflikt i DECISIONS.

## 2026-09-08 23:25 — #80 byggt: svenska ingesten tillbaka med --skip, puls-ingest hourly
ingest/index.ts: --skip=weather,deviations (tillåtna namn bara de två; hoppad källa ⇒ tom
lastChangeId ⇒ sync_state orörd, integrationstest). ingest.yml kör flaggan. pulsklocka NYA:
puls-ingest 11 * * * *. Bevis: ingest #375 från grenen grön på 32 s, "hoppar över: weather,
deviations", wildlife 1, smhi 16, kursorerna orörda. Inventering #8: skulle skapa puls-ingest.
Skarp pulsklocka därefter. DECISIONS #84.


## 2026-09-08 23:59 — Healthcheck #145 GRÖN, första gröna sedan 5/9 — #80 KLART
Körd manuellt efter ingest #375 (23:20) och grannar 23:24: cameras, road_conditions_arkiv,
fi/dk/no alla färska, gränsstationerna nåbara. Healthchecken stängde incident-issue #77 själv.
Enda öppna issue är #15 (kort #42, Bengts). Pipelinen är hel igen: livemotorn i Supabase
(väder/olyckor/väglag varje minut, publicering var 10:e min, kartlager var 30:e), GitHub-
ingesten en gång i timmen för kameror/arkiv/vilt/SMHI, grannländerna en gång i timmen.

## 2026-09-09 01:05 — Kort #82: bridges-cronen struken (DECISIONS #85)
Svar på Bengts fråga om broarna i skuggan (de ligger i den skarpa motorn, icing_point med
broflagga, och följer därmed med i shadow_log automatiskt) avslöjade att bridges.yml fortfarande
körde var 6:e timme: 32 körningar sedan start, de senaste veckorna bara "hoppar över", en minut
styck. Cron borttagen, knappen kvar med --force. Bevis kommer i Actions efter mergen.

## 2026-09-09 01:45 — Kort #83 (gallring) och #84 (deploya ingest-live) skrivna för Axel
Bengt bad om kort + lösningsförslag på de två punkter som avgör om arkivet överlever vintern.
Fynd under skrivandet: (1) regn-30 kan inte ersätta deployen — ingest-live (varje minut) hinner
alltid först på (station_id, sample_time) och ON CONFLICT DO NOTHING kastar regn-30:s rad med
regnmängden; luckan 5/9 → deploy är permanent. (2) Ingen dom läser 10-minutersupplösningen:
grind A och V-A hinkar på 30 min (BUCKET_S = 1800), så tunning till 30 min efter 7 dygn rör
inte domen men fyrdubblar tiden på gratisnivån. (3) Även tunnat räcker 500 MB ~45 dygn, inte en
vinter — steg 2 (export till Storage, gratis, eller Pro) är ett oktoberbeslut efter Axels mätning.

## 2026-09-09 04:45 — Morgonavläsning: kedjan hel, vakten hålig, kassan läcker
GRÖNT: ci #468 grön på main (bundle-checkar + PostGIS-testerna). Kartrepot 04:30: manifestets
live-sha = sha256(live.json), meta.json 04:30:47, vader.geojson 1 247 av 1 298 stationer ≤ 12 min
(96 %). Healthcheck #146 00:18 HEALTHY (cameras 7 min, arkiv 7 min, fi/dk/no 52–54 min, gräns-wx
20 FI / 44 NO), issue #77 auto-stängd 23:59. puls-ingest 01:11–04:11 och grannar 01:24–04:24 alla
gröna på minuten. bridges: ingen körning 03:23 ⇒ kort #82 slutbevisat.
INTE GRÖNT: (1) #50 — healthchecken går på naken GitHub-cron igen (puls-healthcheck avstängd av
Axel), slots 02:23 och 04:23 uteblev: 2 av 2 mellanrum över 2 h 30. (2) #44 — regn-tackning #3
gav 26 % men på regn-30:s restnisch (ingest-live låser raden först); riktig mätning efter deploy.
(3) #85 NYTT — 98 debiterade minuter på 7,4 h ⇒ ~240 min/dygn ⇒ ~42 USD till 1/10, över 35 USD
runt 26/9. Tre snitt föreslagna (publish-map-kedjan, regn-30, batchad grannar-INSERT) ⇒ ~13 USD.
Egen läxa: tre docs-mergar i natt kostade 6 ci-minuter — `[skip ci]` på rena tavelcommits.
Byggt: inget (avläsningsvarv). Nästa avläsning bokas till kvällen.

## 2026-09-09 05:45 — Axels varv: ingest-live deployad, deploy-knappen lever, gallringen har ett ja
Axel (relayerat av Bengt): (1) ingest-live deployad, bevis 30 min efter `vind 844 | regn 907 | sikt 844
| alla 907` ⇒ #84 KLART, #42:s facit räddat, regn-30 helt överflödig. (2) SUPABASE_ACCESS_TOKEN i
Secrets, scopad Edge Functions: Write enbart; deploy-supabase #1 grön 05:20 (vakthund) ⇒ #78 KLART.
(3) Arkivet mätt: 183 B/rad, 205 763 rader, 42 582/dygn nu, mest aktiva station 233/dygn ⇒ vintern
11–16 dygn på gratisnivån; ja till gallringens steg 1. (4) ios-engine #60 grön 66 s (8/9 21:07),
första gröna sedan 5/9. (5) Kvar hos Axel: Issues:Write på PAT:en. Nytt kort #86: PAT går ut 22/11,
Supabase-token 8/12. Healthcheck #147 kom 04:48 (slot 04:23, 25 min sent) — #50 står.
Byggt: inget än; nästa byggsteg är sql/014_gallring.sql på Axels ja.

## 2026-09-09 07:15 — Kort #83 steg 1 byggt: gallra_vader + nattlig pg_cron (DECISIONS #87)
sql/014_gallring.sql tunnar allt äldre än 7 dygn till en rad per station och 30-minutershink
(grind A:s hink, senaste raden). Bevisat lokalt mot Postgres 16 (576 → 336 raderade, rätt rad kvar,
idempotent, filen omkörbar) och med integrationstest #83 mot CI:s PostGIS. Inte i auto-migrationen:
Axel kör filen i SQL-editorn och klistrar första körningens tal. Effekt ~55 dygn på gratisnivån;
steg 2 för hela vintern (1,1 GB) är ett oktoberbeslut.

## 2026-09-09 07:45 — Kort #85 snitt 1+2: grannar batchade, publish-map nedlagd (DECISIONS #88)
Bengts "bygg båda nu". FI/NO/DK skriver nu en UNNEST-sats per tabell (ingest/grannar-db.ts) i
stället för en INSERT per station (uppmätt 6 min/körning i grannar #10). publish-map.yml raderad:
fi/dk-snapshoterna byggs som sista steg i ingest-grannar.yml, bara vid full framgång, noll extra
jobbstarter. Integrationstest #85 mot riktiga scheman i CI. Bevis: nästa pulsade grannar (:24)
≤ 2 min + fi/dk-commit i kartrepot; kvällsavläsningen räknar min/dygn mot 240. Kvar: Axel stänger
puls-regn-30.

## 2026-09-09 08:40 — Kort #85 snitt 1+2 bevisade: grannar 44 s i stället för 6 min
ingest-grannar #12 (08:24, första på nya koden): FI 6 s, DK 13 s, NO 7 s, fi/dk-publicering 6 s,
44 s totalt = 1 debiterad minut (var 6). Kartrepot a28ea98 08:24:42 med fi+dk-filerna ur samma
körning. publish-map körde inte (nedlagd). Väntat: ~168 min/dygn mindre; kvällsavläsningen 17:30
mäter hela dygnet. Kvar: Axel stänger puls-regn-30 (24 min/dygn).

## 2026-09-09 11:00 — puls-regn-30 avvecklad (DECISIONS #89); Axels svar bokfört
Axel: "i övrigt kör vi", osäker på pulsklockan, tror sig ha full behörighet. Kört: pulsklocka #10
(inventering) + #11 (skarp) från grenen: puls-regn-30 borta, 8 cron-jobb kvar, mall = grannar.
Alla tre #85-snitten i drift. Svar på pulsfrågan på kort #50: pulsen har aldrig missat en avfyrning
i någon mätning (6/6, 23/23, 4/4, 4/4), GitHub-cronen 40 %. "Full behörighet" är obevisad: ingen
issue med etiketten vakthund finns ⇒ larmprovet är inte kört. Gallringen (014) inte körd än:
inget halkvakt-gallring-jobb i cron-listan.

## 2026-09-09 11:05 — DB-knappen: gallringen körd, larmvägen bevisad (DECISIONS #90)
dbknapp.yml (PR #90) kör en sql/-fil eller vakthundens larmprov med DATABASE_URL ur Secrets. Körd 10:58:
014 in, gallra_vader(7) 3 551 raderade, halkvakt-gallring aktivt 03:15 UTC, tabellen 37 MB / 207 587
rader. Riktig tunning börjar 16/9 när minutupplösningen passerat 7 dygn. Larmprovet skapade issue #91
med etiketten vakthund ⇒ PAT:en har Issues:Write, Axels punkt 2 bockad. Kvar: issue #91 ska auto-stängas
11:07; puls-healthcheck är fortfarande Axels val (kort #50).

## 2026-09-09 11:15 — puls-healthcheck på som bro (DECISIONS #91), larmvägen hel åt båda hållen
Bengt: "gör den som en bro". pulsklocka #12/#13: puls-healthcheck 23 */2 tillbaka, token=true, 10 cron-jobb.
Issue #91 (larmprovet) stängdes av vakthunden 11:07:02. Nytt kort #87: healthcheckens fem kontroller in i
vakthunden, sedan healthcheck.yml ner (låst bakom 14/9). Dagens facit: alla punkter i Axels lista
verkställda utom nyckelrotationerna (datum i #86). Kvällsavläsningen 17:30 räknar minuter och hål.

## 2026-09-09 12:05 — Nyckelrotationen förberedd (kort #86), go ahead till Axel
Bengt: rotera nu, inte i november. Fynd: PUBLISH_TOKEN ligger på tre ställen (Supabase-secrets för publicera
och vakthund, GitHub Secrets för grannar-jobbets fi/dk-push). Kortet bär Axels exakta steg (två tokens, utgång
2027-04-30, samma smala rättigheter) och fyra bevis som Bengt/Claude kör efteråt. Gamla nycklar raderas först
när bevisen är gröna.

## 2026-09-09 17:45 — Kvällsavläsning: kassan under kontroll, bron levererar, kedjan hel
Actions 04:31→17:32: 60 körningar, 84 debiterade min ⇒ 155 min/dygn (baslinje 240); steady state
efter dagens tre snitt ~60 min/dygn ⇒ ~10 USD till 1/10. regn-30 sist 10:41, publish-map sist 07:11,
bridges sist 8/9 21:15. Healthcheck på pulsen 12:23/14:23/16:23 alla inom 2 s, 0 hål över 2 h 30 sedan
11:09 (före: 6 h 41). Kartrepot 17:30: manifest-sha = live-sha, meta 1 min, SE 93 % ≤ 12 min, FI 76 %
(timvis), DK 0/24 (DMI timvärden — väntat). ci #475 grön på main. Arkivet +8 355 rader netto på
dagen (~24 000 brutto/dygn med dieten). Byggt: inget. Nästa: morgonavläsning 10/9 04:30 UTC.

## 2026-09-10 04:45 — Morgonavläsning: rent dygn 79 min/dygn, bron levererar 9/9, kedjan hel
Actions 9/9 17:32 → 10/9 04:31: 30 körningar, 36 debiterade min ⇒ 79 min/dygn ⇒ ~13 USD till 1/10
(grannar 11, ingest 11, healthcheck 8, noll röda). Healthcheck på pulsen 9/9 sedan 12:23 inom 2 s,
0 hål över 2 h 30 på 17 h; dygnsbeviset klart 11:09. Arkivet +14 734 rader 16:43→02:23 (~36 600/dygn
i natt), inget fall vid 03:15 — väntat, jobbets körning kan bara databasen bevisa (SQL på kortet).
Kort #86: ingen deploy-supabase-körning, ingen ny vakthund-issue ⇒ Axel har inte roterat än.
Kartrepot 04:30: manifest-sha = live-sha, meta 1 min, SE 92 % / FI 96 % / DK 92 % ≤ 12 min, fi/dk
från grannar 04:24. ci #475 grön (inga nya pushar). bridges tyst sedan #32, regn-30 sedan 10:41.
Radardomen 14/9 08:30 UTC bokad. Byggt: inget. Nästa: kvällsavläsning 10/9 17:30 UTC.

## 2026-09-10 05:30 — Systemanalysen blev åtta kort (Bengts "gör kort för allt")
Claudes övergripande analys av varningssystemen (samband, beroenden, samarbeten) bokförd som kort så
inget tappas: #88 trenden ur minutarkivet (billigaste stora klivet, skugga först), #89 övergångarna
regn→frost och torka→första regnet, #90 vind/sikt som punktfaror, #91 kallplatslagret (statisk
geometri, förklaringsvariabel i grind A), #92 däcktyp/fordonstyp på enheten (Axel), #93 kommunala
vägar + SMHI som förstärkare (Bengt), #94 samarbeten försäkringsbolag/åkerier/NTF (Bengt), #95 SMHI
som reserv för Trafikverket-beroendet (mätning). Alla nya faror: skuggkolumn före röst, tröskel-
dokument före kod — tystnaden är funktionen. Byggt: inget.

