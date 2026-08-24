# RUNBOOK — when something breaks

## You got a GitHub Issue labeled `incident`
The hourly health check found stale or missing data. Usually self-heals
(Trafikverket blips, Actions delays). Do nothing for 2 h. If the issue is still
open after that: open a Claude session and paste the issue link — Claude debugs
from CI logs. The issue auto-closes on the next healthy check.

## A scheduled `ingest` run is red
One red run among green: ignore (transient). Several in a row: the health check
will file an incident issue — see above.

## Rotating secrets
GitHub → repo → Settings → Secrets and variables → Actions:
`TRAFIKVERKET_API_KEY`, `DATABASE_URL`. After a Supabase password reset, give
Claude the new password — or edit DATABASE_URL yourself (percent-encode specials).

## Data sources cheat sheet (hard-won specifics)
- Trafikverket v2: POST XML → JSON. Situation REQUIRES namespace="road.trafficinfo"
  + schemaversion 1.6. Others: WeatherMeasurepoint 2.1, RoadCondition 1.2,
  TrafficSafetyCamera 1. Delta via changeid; LASTCHANGEID in every response.
- Supabase: use the POOLER url (aws-0-eu-north-1...:6543). Direct db.*:5432 is
  IPv6-only → fails from GitHub Actions and most sandboxes.
