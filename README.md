# Halkvakt

Bakgrundsapp som varnar svenska förare för halka, vilt, olyckor och fartkameror —
medan de kör med Google Maps. Data direkt från Trafikverket. Din position lämnar
aldrig telefonen.

- `PLAN.md` — full project plan
- `CLAUDE.md` — engineering guidelines (read before contributing)
- `DECISIONS.md` — decision log
- `ingest/` — Trafikverket → PostGIS ingesters (runs on GitHub Actions cron)
- `sql/` — database schema

## Quick start
```
npm ci
TRAFIKVERKET_API_KEY=... npm run ingest:dry     # live smoke test, no DB
TRAFIKVERKET_API_KEY=... DATABASE_URL=... npm run ingest
```
