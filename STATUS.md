# STATUS — Halkvakt
*Updated by Claude at the end of every session. Read this first.*

## Current state (2026-08-24)
- **Phase 0 in progress.** Data pipeline LIVE and autonomous: GitHub Actions cron
  every 30 min → delta-syncs 4 Trafikverket sources → Supabase PostGIS.
- Archive accumulating since 2026-08-24. First full sync: 2 771 cameras,
  818 road-condition segments, 844 weather stations, 654 deviations.
- CI: unit tests (5) + PostGIS integration tests on every push.
- Self-monitoring: hourly health check opens a GitHub Issue if data goes stale.

## Phase 0 exit criteria
- [ ] Ingest green 7 consecutive days (started 2026-08-24 → check 2026-08-31)
- [~] Public map: site + data pipeline DONE (5 GeoJSON files auto-published every 30 min); awaiting Pages toggle
- [ ] Replay harness produces deterministic alert logs (BACKLOG #3)
- [ ] Kill-criterion verdict on first real ice events (Sep/Oct, Norrland)

## Waiting on David
- Enable Pages on halkvakt-karta (Settings → Pages → Branch: main → Save) — API
  create 403s even with Pages permission; one-time manual toggle
- Revoke the unused second PAT (public-read-only one from 2026-08-24)
- Google Play account, privatperson (~w40; see DECISIONS #9)

## Session log
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
- David skapar Play-konto ~2026-08-26 (före plan v40 — bra: Googles ID-verifiering kan ta dagar)

## 2026-08-25 — Snapshot-byggare KLAR (BACKLOG #6) + falsklarmsbugg fixad
- data/app/v1/{manifest,static,live}.json publiceras var 30:e min; sha256-verifierat från CDN
- Nationellt-först (DECISIONS #14): 65 kB gz för hela Sveriges kameror; splitkriterium mäts varje körning
- BUGG FÅNGAD AV RIKTIG DATA: substrängen 'is' i "fläckvis" gav 8 falska halksegment — samma
  regex satt i MOTORN och hade gett falska röstvarningar i vinter. Ordgränser + regressionstest
  i båda lagren; v11-tystnadsvektorn härdad med fällan.
- 28/28 tester gröna. Nästa: #7 Android-skelett — byggs och CI-kompileras UTAN Play-konto,
  sideload-APK till David som mål. Play-kontot blockerar först butiksuppladdningen.

