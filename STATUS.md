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
