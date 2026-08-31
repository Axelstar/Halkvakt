35. **Norskt skuggarkiv** (Axel 31/8: "vi börjar med Norge nu"): DATEX-konto begärt hos
    Vegvesen 15:43 (Lagerlöf Labs, Axel). FÖRBERETT samma kväll: schema no (fött låst),
    ingest/no.ts som rekognoserar XML:et första gången, ingest-no.yml (hoppar över tills
    VEGVESEN_USER/PASS finns), 20 norska rutter i skuggmotorn (E6 i sju etapper Oslo–
    Kirkenes, E18, E39 kusten, E16/Rv7/E134 över fjället, E10 Lofoten, E8 mot Kilpisjärvi,
    E14 mot Storlien), Norge-knapp på testbilarna. KVAR NÄR KONTOT KOMMER: parsern mot
    riktigt XML, build-snapshot-no.ts, cron. Risk: formuläret krävde "fast IP" — vi svarade
    ärligt att vi saknar en; om Vegvesen kräver IP-låsning behövs en proxy med fast adress
    (kostar, Axels beslut per gratisregeln).
34. **Finskt skuggarkiv före produkten** (Axel 31/8: "vi bör täcka Skandinavien snart"):
    det som tar tid i ett nytt land är facit, inte kod. Fintraffic (Digitraffic) är öppet
    och bäst i Norden. Bygg ingest för väglag/väderstationer/kameror + 3 skuggrutter
    (E18 Åbo–Helsingfors, E75 Helsingfors–Lahtis, Rv8 Vasa–Uleåborg) i samma tabeller
    med landskod. Ingen app, ingen röst. I mars 2027 har Finland en vinter av facit.
    Kolla Vegvesen Datex II för Norge i samma varv. Olåst; efter Bengts resultat.
32. **Hindren in i rösten — kräver ny HazardKind** (fyndet 31/8): KEEP-filtret var skrivet
    för "Obstruction"/"Incident", ord Trafikverket aldrig använder, så vi har i praktiken
    ALDRIG skeppat annat än olyckor — trots att DECISIONS #5 sade "olyckor + hinder".
    Filtret säger nu sanningen (bara "Accident"). Att vidga det är ett PRODUKTBESLUT:
    alla tre parsrarna mappar varje deviation till HazardKind "accident", så ett stoppat
    fordon skulle uttalas "Olycka rapporterad 3 kilometer framför dig" — direkt brott mot
    överdrivandeförbudet i CLAUDE.md. Kräver: ny HazardKind (motorkontrakt ⇒ vektorer i
    tre körtider), egen röstfras, prioritetsplats, falsklarmsbudget.
    KANDIDATER, uppmätt volym över 7 dygn: VehicleObstruction 780 (~110/dygn, stillastående
    fordon — sannolikt värdefullast), GeneralObstruction 271, AnimalPresenceObstruction 173
    (LEVANDE djur på vägbanan med riktig position — kvalitativt MYCKET bättre än polisens
    länscentrum-flöde som DECISIONS #13 underkände). Olåst, men börjar med Axels beslut om
    vad rösten ska säga.
33. ~~**Eget arkivbord för hela Situation-flödet**~~ (S-2026-08-31: LIVE — situation_archive).
    deviations är LIVE (olyckor), situation_archive är ARKIVET: tio allow-listade typer,
    insert-vid-första-syn, refresh-vid-återsyn, raderas aldrig av ingest. Bruset
    (MaintenanceWorks + körfältsomläggning, 62 %) stängs ute ⇒ ~210 rader/dygn. Båda
    ingestvägarna skriver; missar.ts läser arkivet. Född låst. sql/003.
    *Verified: 36 prov + integrationstestet räknar archive:1; första hindret in 09:04 med
    position; livetabellen orörd; anon 401. Två CI-varv för att få migrationen portabel.*
    BONUS: AnimalPresenceObstruction + VehicleObstruction sparas från idag ⇒ #32 får underlag.
30. ~~**RLS-kontroll på alla tabeller**~~ (S-2026-08-31: LÅST — DECISIONS #32). Anon-nyckeln
    kunde läsa 8 arkivtabeller och hade skrivrättighet (PATCH 204). Nu RLS + REVOKE på alla
    elva, INSERT-only-grant på waitlist, default privileges smalnade. Bevisat med anon-nyckeln:
    401 överallt, väntelistan 201, CI-ingest grön efter låset. sql/002_rls_lockdown.sql.
31. **Bevakning av Trafikverkets nyheter** (Bengts issue #2): API-ändringar/avvecklingar
    (t.ex. TrafficFlow 1.4-namespace) ska fångas innan de bryter ingest — RSS/changelog-
    koll i healthchecken eller veckojobb som mejlar. Olåst, litet.
28. ~~**Olyckslyftet**~~ (S-2026-08-31: BYGGT i motorn — TS/Kotlin/Swift + v15/v16/v17).
    Graderade olycksrepliker efter Trafikverkets SeverityCode: allvarlig (≥4) får ett
    tidigt rop vid 10 km med omvägsbeslutet och röjningstiden, och en kort påminnelse
    innanför 2 km; lindrig behåller gamla repliken oförändrad. Körde man ut innanför
    2 km utan att höra det tidiga ropet talas "late"-repliken i stället.
    severity/endtime går nu hela vägen: build-snapshot → live.json (`sev`/`slut`) →
    alla tre parsrarna → motorn → rösten. Röjningstiden formateras i publiceringen,
    inte i motorn (motorn läser inga klockor). Se DECISIONS #30 för de fyra valen.
    *Verified: 34 TS-prov gröna, tre nya delade vektorer, invarianten skärpt (ej försvagad).*
    PRINCIP (oförändrad): vi bygger ALDRIG egen navigering — rösten levererar beslutet
    före sista avfarten, förarens kartapp exekverar omvägen. Inga knappar i farten.
    ÖPPET för Axel: tröskeln står på 4 ⇒ två tredjedelar av alla olyckor blir "allvarliga".
27. **asc-CLI:t** (rorkai/App-Store-Connect-CLI, Axels fynd 29/8 — 6,3k★, MIT,
    brew install asc): (a) TestFlight-uppladdning som ETT kommando åt Axel;
    (b) kör på Linux ⇒ CI kan hämta TestFlight-feedback/krascher till repot
    automatiskt. LÅST: Apple-kontot + ASC API-nyckel (skapas måndag). Telemetri
    stängs av vid install; deras skills-paket hoppas.
25. **Halkbaneläget** (försöksläge i appen): manuellt konfigurerad fara +
    geofence på övningsplatsens område, fast fras ("halka om 300 meter, sänk
    farten"), slumpad på/av per elev, instruktörsprotokoll. LÅST: påskriven
    avsiktsförklaring från trafikövningsplats.
26. **Skolpaketet**: QR-blad (tryck-PDF), femminutersmanus för handledarkursen,
    landningssida, "Handledarens checklista vinterkörning", samtyckesblankett.
    LÅST: påskriven avsiktsförklaring från trafikskola. (QR-bladet kan tidigare-
    läggas som testarrekrytering.)
22. **Bluetooth-autostart** — KOD SKRIVEN 31/8, BEVISAS I BILEN.
    Android: klart sedan 9b (BT-mottagare + självlärning + rörelseigenkänning för första
    körningen). Orört — testat, fungerar.
    iOS (Apples lås: appar får ej självstarta på BT): StartGuardIntent/StopGuardIntent
    (AppIntents, openAppWhenRun för att CoreLocation ska få starta med "Vid användning"),
    HalkvaktShortcuts (Siri: "Starta Halkvakt"), AutostartGuideView i Inställningar med
    fem steg + "Öppna Genvägar". PRODUKTBOK + MAC-GUIDE (fyra kontroller i bilen).
    *Verify (Axel, hemma): Genvägar hittar intenten → Siri startar → automation Kör direkt
    → bilen startar vakten med låst telefon, rösten talar med släckt skärm, stannar vid
    frånkoppling.* OBS: app-målet kompileras inte i CI (bara motorn) — första bygget på
    Macen är också första kompileringen av de fyra nya filerna.
23. **Heads-up-varning över kartappar** — KOD SKRIVEN 31/8, BEVISAS PÅ SKÄRM.
    Android: egen kanal "Varning under körning" IMPORTANCE_HIGH, tyst, utan vibration,
    CATEGORY_NAVIGATION, autoCancel + timeout 8 s (samma som helskärmskortet). Ingen ny
    behörighet — POST_NOTIFICATIONS fanns för förgrundstjänsten. Bara riktiga larm når den.
    iOS: HeadsUpService (UNUserNotificationCenter, .timeSensitive, tyst, tas bort efter 8 s),
    entitlement time-sensitive i project.yml, tillstånd frågas en gång vid första start.
    Förgrund täcks av varningskortet, bakgrund av bannern — ingen delegate behövs.
    "Testa rösten" fanns redan på båda. *Verify: kör med Maps framme förbi en fartkamera —
    bannern ska synas i 8 s och försvinna; på iPhone även med Fokus "Kör" på.*
24. **Designlyftet** — DELVIS 31/8: "Senast sagt" på hemskärmen, persisterat, båda
    plattformarna (Android ur befintlig alert_history; iOS ny Prefs.lastSaidText/At).
    KVAR, låst bakom designunderlag: farokortens utseende och typografin. Repot har
    ingen Claude Design-export för skinnet — det byggs inte på gissning. Axel exporterar
    designen till docs/design/ ⇒ kortet öppnas. Helskärms-"Uppfattat" adopteras INTE
    (kräver blick+tryck i fart; strider mot röst-tesen).
# BACKLOG — ordered. Any session: take the top unblocked item, build, verify, commit, update STATUS.md.

1. ~~Self-steering layer~~ (this commit): CI integration tests vs throwaway PostGIS,
   hourly health check → auto GitHub Issue, docs, session protocol.
   *Verify: ci.yml green; healthcheck dispatch green; issue created on simulated failure.*
2. ~~Public map~~ (S2: shipped; residual = Pages toggle + anon key for waitlist form) — (marketing engine, PLAN §8.1): new PUBLIC repo `halkvakt-karta`
   (GitHub Pages is free only on public repos; main repo stays private). MapLibre +
   OSM, layers from a small read-only JSON published by a new `publish-map-data`
   workflow (writes latest state to the public repo every 30 min; service-role key
   NOT exposed — static JSON only). Swedish UI, "Appen kommer i november" banner.
   *Verify: page loads on phone; all 4 layers render; data ≤ 35 min old; no secrets in public repo.*
   *Unblocked when Axel creates public repo `halkvakt-karta` + extends token scope (see STATUS). Waitlist per DECISIONS #10 included.*
3. ~~Alert engine v0 + replay harness~~ (S3: shipped): engine/src/, 13 vectors +
   real-data fixture (skane_vag108), replay CLI, determinism + invariant tests.
   *Verified: 13 vectors green; real Skåne snapshot ⇒ only camera alerts, throttle live; byte-identical reruns.*
4. ~~Wildlife layer, del 1~~ (S3: polisen-ingester + arkiv + kartstatistik klart; A4-röst
   VILANDE per DECISIONS #13 — hotspot-modellen kräver data vi bygger själva över tid).
   *Verified: events i DB (4 st senaste veckan = källan exakt), extraktion 67/95 %, ticker live.*
   Restpunkt (låst, väntar på arkivmognad ~dec): hotspot-modell ur eget arkiv + NVDB viltstängsel.
5. ~~SMHI warnings ingester~~ (S3: klart). Aktuell+historik-tabell, vinterrelevans-flagga,
   ticker visar högsta vintervarningen. *Verified: 17 areor i DB (skarp körlogg), fixture-test grönt,
   smhi_vinter i live-meta (tomt i augusti = korrekt), tickerkod live på sajten.*
6. ~~Snapshot builder~~ (S4: klart, nationellt per DECISIONS #14). data/app/v1/ live på CDN.
   *Verified från live-CDN: sha256+bytes OK båda filer; 65 kB gz statiskt / ~0 kB live (budget
   krossad); adapterkedja snapshot→motor→varning testlåst; fläckvis-buggen fångad+regressad.*
7. **Android-app** — SKELETT KLART S4 (android/: Kotlin-motorport BEVISAD identisk med TS
   via delade vektorer i CI; foreground-tjänst, snapshot-synk m. sha256+offline-cache,
   sv-SE TTS m. ducking, permission-flöde, 2,2 MB APK som CI-artefakt varje push).
   Kvar till Fas 2-vägtestet: autostart (AR+Bluetooth), engine.updateHazards (state över
   datauppdatering), Axels enhetstest. *Verify kvarstår: PLAN §4 Phase 2 road-test checklist.*
8. ~~Emulator-smoketest i CI~~ (S4: klart). Guard-klass utbruten ur tjänsten; instrumenterade
   tester: MainActivity-boot + Skånereplay genom appens pipeline på ART med fejk-TTS/notis.
   *Verified: emulatorjobb grönt i android.yml; tre runtimes (Node/JVM/ART) ger identisk logg.*
9. ~~engine.updateHazards~~ (S4: klart i ALLA TRE motorerna + delad vektor v14_snapshot_swap
   som dödar ombyggnadsbuggen; GuardService byter nu data mitt i körning utan minnesförlust).
   *Verified: TS 29/29, Kotlin 3/3, Swift 3/3 gröna med v14; app bygger.*
9b. ~~Autostart~~ (S5: klart). Ren AutostartController (8 JVM-prov) + tunt lim:
    IN_VEHICLE enter/exit via Activity Recognition (undantagen bakgrundsstart),
    Bluetooth-turbo med självlärning av bilens enhet, tryck-för-start-notis som
    reservväg, boot-omarmering, behörighetstrappa i UI, Play-dossier utkastad.
    *Verified: 8/8 JVM-test gröna; CI (bygge+emulator) grönt; dossier i docs/.*
10. **iOS-app-skelett** (LÅST till Fas 3-grinden, DECISIONS #17): SwiftUI-skal runt
    HalkvaktEngine — CoreLocation bakgrundsläge, AVSpeechSynthesizer sv-SE m. ducking,
    snapshot-synk (spegla SnapshotRepo), 2.5.4-dossier. *Verify: TestFlight-build + replay på simulator.*

11. ~~Betaputs I~~ (S6: klart). Batteri: CadencePolicy — GPS 1 s/5 s/15 s efter avstånd
    till närmaste fara (marginalbevis vid 140 km/h som körbart test); ljud: TTS på
    navigationskanalen (USAGE_ASSISTANCE_NAVIGATION_GUIDANCE — rätt volym i bil-BT);
    adaptiv appikon (triangel + snöflinga, vektor).
    *Verified: 11/11 JVM-prov; APK bygger med ikon; emulator-CI grönt.*

12. ~~Hemsida + SEO-grund + rekryteringsmaterial~~ (S7: klart). Landningssida på roten
    (kartan flyttad till karta.html), beta.html-testarguide, sitemap/robots, JSON-LD
    (FAQPage + MobileApplication), live-ticker på landningen; två FB-inlägg + postnings-
    plan i docs/REKRYTERING.md. *Verified: alla sidor 200 live; väntelista 201 från båda
    nya källorna (landing/beta); kartan intakt på nya adressen.*
12b. ~~Minutdiet + livemotor-vakthund~~ (S-2026-08-25em: klart, beslut #22). Ingest timvis,
    publish egen 30-min-klocka, healthcheck 2 h m. per-käll-trösklar + pg_cron-puls.
    *Verified: skarp dispatch mot prod — "limit 15"-rader, cron-puls succeeded, HEALTHY; ~3 600→~1 750 min/mån.*
11d. ~~Betaputs III — release-rustning~~ (S-2026-08-26: klart). targetSdk/compileSdk 35
    (Googles krav för nya appar aug-26), R8+resurskrympning (9,4 MB debug → 2,59 MB AAB),
    upload-nyckel RSA-4096 giltig till 2052 (GitHub-secrets HV_KEYSTORE_B64/_PASS; Axels
    kopia levererad — FÅR EJ TAPPAS), CI bygger signerad release-AAB som artefakt vid
    varje push, integritetspolicy live (Play-krav) + länkad i app/om/sitemap. v0.3.0.
    *Verified: AAB signerad lokalt (cert till 2052), integritet.html 200, CI-artefakt.*
    Kvar till Play-inlämning: butiksmaterial + Data safety-formulär (låst till kontot).
11c. ~~Design v2 (Claude Design-guiden)~~ (S-2026-08-26: klart). Guiden granskad m Axel:
    1a stomme + 1b-principer, 1c (karta i mitten) STRUKEN — rösten är appen, kartan är
    fönstret (webben). Implementerat: levande hemskärm ("I NÄRHETEN" ur snapshot, sex mil,
    människorader: "+0,4° och vått"/"80 km/h"/TrV-infotext; Nearby ren + 3 JVM-prov),
    körläge (PASSAGERAREN ÄR VAKEN, tid/km/räknare, SENAST SAGT, PÅ DIN VÄG, avsluta lågt,
    skärmen hålls vaken), HELSKÄRMSVARNING i bärnstensgult m "Uppfattat" (8s auto-släck),
    avståndsslider (EngineConfig.leadMaxM — ej kontraktsbrott), röstvalsrad → systemets TTS.
    *Verified: JVM-prov gröna, APK lokalt, CI-emulator+foto på push.*
11b. ~~Betaputs II — riktig app~~ (S-2026-08-25natt: klart). Compose-UI i varumärkets
    mörka tema, tre flikar: VAKTEN (stor start/stopp, autostart-switch, datafärskhet,
    livehändelser + persistent varningshistorik), INSTÄLLNINGAR (kategori-val per
    HazardKind + "Testa rösten" i riktiga TTS-kanalen), OM (integritetslöftet, länkar,
    version). Nya lager: AlertHistory (ren, 4 JVM-prov) + Prefs (DataStore→Flow, en
    ägare per state enligt skill) + Guard-krokar isEnabled/onAlert (tystad kategori
    behåller motorminnet — ingen dubbelvarning vid återaktivering). Tjänsten fick
    explicit CoroutineScope (skill-regel) + runningFlow/snapshotInfo. Behörighets-
    trappan porterad ORDAGRANT (Play-logik). v0.2.0.
    *Verified: JVM-prov gröna, APK bygger lokalt; emulator-CI = domare på push.*
    Kvar till släppkandidat (Betaputs III): release-bygge m. R8+signering,
    integritetspolicy-URL (Play-krav), butiksmaterial (låst till kontot).
11c. ~~UI v2 — Claude Design-porten~~ (S-2026-08-26fm: klart, Axels designval).
    Mockupen porterad: statuskort ("Redo att köra", grön ▶-start, autostart-i-kortet),
    I NÄRHETEN (Nearby.kt: ren närhetslogik + 5 JVM-prov; sekundärer ur metan —
    frystemp/vått, km/h, väglagstext; ärliga tomlägen), körläge AKTIV ("Passageraren
    är vaken" tid·km·räknare via Session-flow i tjänsten, SENAST SAGT, PÅ DIN VÄG,
    Avsluta), Inställningar v2 (grupperade kort, röstrad, "Varna på avstånd"-reglage
    → EngineConfig.leadMaxM — kontraktssäkert, vektorerna kör default), statuspiller
    LIVEDATA/VAKTEN PÅ. Färgsemantik: grönt=kör, gult=varningsdata.
    *Verified: 9 JVM-prov gröna, CI-emulator success, tre flikar plåtade.*
    Känt datagap: snapshotten saknar vägnamn → närhetstitlar är kategoribaserade;
    vägnamn = framtida pipeline-punkt.
12c. ~~Presskit + generator-sanering~~ (S-2026-08-25kväll: klart). press.html live
    (live-siffror ur meta.json, snabbfakta, fri boilerplate, logotyp-paket 512-PNG+SVG,
    presskontakt-platshållare tills halkvakt.se); i sitemap + om-footern. Marknadsmotorns
    kanaltexter befriade från betaspråk; pressnotisen länkar presskitet.
    *Verified: 200 live, livesiffror renderar (844), 0 beta-träffar i provgenererat utkast.*
    Rest (låst till domän): riktig pressmejladress på sidan.
12d. ~~Skills inför appbygget~~ (S-2026-08-25natt: klart, Axels initiativ via Paul Solt-tråden).
    6 skills i `skills/`: twostraws×3 (iOS), chrisbanes×2 (Kotlin/Compose), egen
    halkvakt-android (bakgrundsplats/doze/TTS/Play/motor-kontrakt). Katalog docs/SKILLS.md,
    CLAUDE.md kräver läsning före app-kod. *Verified: frontmatter ok i alla 6, licenser medföljer.*
20. ~~Skuggmotor + kamerafacit~~ (S-2026-08-29: LIVE — cron */30, shadow_log + facit-hink) (Bengt granskning II; server-side, FÖRE FÖRSTA
    FROSTEN): (a) cron kör motorn mot arkivet på referensrutterna (E22, väg 23,
    väg 19) var 30:e min → varningslogg med indata, oavsett användarantal;
    (b) vid skugg-varning arkiveras närmaste väglagskamerabild (Supabase storage;
    dedupe per station/3 h, gallring >90 dgr, budgetvakt mot 1 GB-taket).
    Ger falsklarmssidan; missarsidan = #19. Tillsammans = marsens facit.
21. **VILANDE (Axels beslut): anonym puls + feedback-knapp** — bryter "samlar
    in: ingenting"-formuleringen även som opt-in ⇒ policy/butik/Data safety
    skrivs om. Rekommenderas paketerat med sensorbeslutet våren 2027.
19. ~~Missmätningsskriptet~~ (S-2026-08-29: klart — missar.yml, verifierat tomt augusti) (Bengt 28/8): jämför arkivets halkhändelser
    (smhi_warnings_history + Situation-halka) mot motorkörning på referensrutterna
    → händelser/träffar/missar per vecka. Byggs på augustidata (tomt ok), skarpt
    från första halkdagen. Missandelen avgör tystnadsdesignen.
17. ~~Vilt in i snapshoten~~ (S-2026-08-29: klart — byggare + TS/Kotlin/Swift-parsrar + prov) — upptäckt 2026-08-27:
    live.json saknar wildlife-array; apparnas vilt-switch har inget data. Åtgärd i ETT
    varv: snapshot-builder skriver wildlife[] ur polisen-arkivet + Android- och
    Swift-parsern läser den + replay-vektor. Även: oanvänd smhi-array i live.json
    (karta-bruk? verifiera eller rensa).
18. **iOS-app första bygget** — koden skriven (ios/HalkvaktApp, XcodeGen), byggs och
    felrättas på Axels Mac per MAC-GUIDE.md. Sedan: TestFlight vid Apple-konto.
16. **Blixthalke-prognos (uppdatering 2-kandidat)** — ur Bengts Trafikriskkarta
    (docs/RISKKARTA-BENGT.md): yttemp/daggpunkt + MET Nowcast 2 h. Kommuniceras
    som RISK, aldrig mätning. Kräver Nowcast-proxy (MET-villkor). Efter kö-slut.
15. **KÖSLUT-varning (TrafficFlow)** — idé från Axels pappa, faktatestad 2026-08-26:
    vår befintliga nyckel öppnar TrafficFlow; mätdata 43 s färsk (hastighet+flöde per
    körfält, schemaversion 1.4). Möjliggör uppmätta kö-slut i Sthlm/Gbg — "Kö framför
    dig, bromsa lugnt". Slår Waze-modellen vid låg användarbas (slingor kräver ingen
    crowd). Kräver: ny HazardKind (motorkontrakt ⇒ vektorer utökas), kö-slutslogik
    (slinga N långsam + N−1 snabb), falsklarmsskydd (vägarbete/väder). EFTER release.
    Stängda dörrar (bygg ALDRIG mot): friktionsdata (säljs via biltillverkare→entrepre-
    nörer), plogåtgärder, Öresundsbrons driftstatus (inget API). SMHI-generationsskiftet
    (Mesan2gv3/SNOW1gv1) träffar oss inte — vi kör varnings-API:t (ibww), frysrisk via
    Trafikverkets stationer; väljs rätt generation den dag prognoslager byggs (MET Norge
    CC BY är då kandidat).
13. **Läns-sidor för SEO** ("Halka i Skåne just nu" ×21): statiska sidor genererade i
    publiceringssteget ur livedatan — innehåll ingen konkurrent kan kopiera. Görs när
    domänen finns så länkkraften hamnar rätt. *Verify: 21 sidor live m. färsk data + i sitemap.*
14. **Domänflytt halkvakt.se** (väntar på Axels köp): CNAME-fil, Pages-config via API,
    canonical/OG/sitemap-byte, 301-tänk. *Verify: https://halkvakt.se serverar sajten grönt cert.*

## Questions for Axel
All seven answered 2026-08-24 → DECISIONS.md #8–11. No open questions.

## S10 · Livemotorn (Supabase, minutfärsk data) — VÄNTAR PÅ: Axels access-token
Klart: edge function ingest-live (Situation+RoadCondition, changeid-delta, upserts), delta-
mekanik bevisad live (4105→1 objekt), migration live_cursors. Återstår när token finns:
kör migration + deploy + secrets + pg_cron varje minut (via Management API) + verifiera
kursorer rullar + GitHub-ingest till reservläge för dessa två flöden. Kartan fortsatt ~16 min;
appen läser direkt från Supabase i oktober (då märks minutfärskheten på riktigt).
