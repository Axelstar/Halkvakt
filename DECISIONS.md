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
