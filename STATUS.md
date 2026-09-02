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
