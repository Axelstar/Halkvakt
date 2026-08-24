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
   *Unblocked when David creates public repo `halkvakt-karta` + extends token scope (see STATUS). Waitlist per DECISIONS #10 included.*
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
   datauppdatering), Davids enhetstest. *Verify kvarstår: PLAN §4 Phase 2 road-test checklist.*
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

## Questions for David
All seven answered 2026-08-24 → DECISIONS.md #8–11. No open questions.
