# RUNBOOK — when something breaks

## You got a GitHub Issue labeled `incident`
The hourly health check found stale or missing data. Usually self-heals
(Trafikverket blips, Actions delays). Do nothing for 2 h. If the issue is still
open after that: open a Claude session and paste the issue link — Claude debugs
from CI logs. The issue auto-closes on the next healthy check.

## A scheduled `ingest` run is red
One red run among green: ignore (transient). Several in a row: the health check
will file an incident issue — see above.

## Livemotorn (Supabase pg_cron → edge function) — "deviations/road_conditions stale"
Arkitektur: `cron.job` (jobid 1, varje minut) → `net.http_post` med header `x-halkvakt-key`
→ edge-funktionen `ingest-live` (fail-closed på samma nyckel, secret `INGEST_KEY`)
→ delta-hämtar Situation/RoadCondition från Trafikverket → upsert + `sync_state`-kursorer.
GitHub-ingesten (timvis) delar kursorerna och fungerar som reserv.

Felsökningstrappa när vakthunden larmar (>15 min stale):
1. **Cron-historik** (Management-API, token i STATUS):
   `curl -s -X POST https://api.supabase.com/v1/projects/xmpfztykhyvhmrzsnjrc/database/query \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
     -d '{"query":"SELECT status,return_message,end_time FROM cron.job_run_details WHERE jobid=1 ORDER BY end_time DESC LIMIT 5"}'`
   `failed` + meddelande pekar oftast direkt på orsaken (timeout/DNS/403).
2. **Funktionsloggar**: dashboard → Edge Functions → ingest-live → Logs (500-stackar syns här).
3. **Manuell trigg** (nyckeln ligger i cron-kommandot):
   hämta: `SELECT command FROM cron.job WHERE jobid=1` → kopiera `x-halkvakt-key`-värdet →
   `curl -X POST -H "x-halkvakt-key: <nyckel>" https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/ingest-live`
   Svar `{"ok":true,...}` = funktionen frisk ⇒ felet ligger i cron/nät; `403` = nyckelosynk (se rotation).
4. **Trafikverksnyckeln**: 401 i loggarna ⇒ nyckeln roterad/spärrad — uppdatera secreten
   `TRAFIKVERKET_API_KEY` (`supabase secrets set ... --project-ref xmpfztykhyvhmrzsnjrc`) och
   GitHub-secreten med samma namn.
5. **Pausa/återstarta**: `SELECT cron.unschedule(1);` resp. återskapa enligt beslut #19/#22
   (schema `* * * * *`, kommandot i punkt 3). Sajten överlever paus — GitHub-reserven
   håller datat ≤ ~75 min gammalt.

Rotation av `INGEST_KEY` (3 steg, ingen nertid):
a) ny nyckel: `openssl rand -hex 24`; b) `supabase secrets set INGEST_KEY=<ny> --project-ref ...`
+ deploya om funktionen (`supabase functions deploy ingest-live --no-verify-jwt --use-api`);
c) `SELECT cron.alter_job(1, command:='...samma http_post med nya nyckeln...');`
(ordningen ger max ~1 missad minut).

Kadenser efter beslut #22: livemotorn 1 min · GitHub-ingest timvis (väder/kameror/polisen/smhi)
· publicera (Supabase pg_cron) var 10:e min, kartlager :00/:30 · fi/dk-snapshoter sist i ingest-grannar (#85) · healthcheck varannan timme
(trösklar: deviations/road_conditions 15 min, övriga 150 min, + puls på cron-status).

## Arkivet tillbaka — ett raderat dygn behövs (kort #291, DECISIONS #450)
Raderingen (sql/034 `arkiv_radera_exporterat`, 03:45) tar det äldsta exporterade dygnet ur `weather_observations` när databasen
passerar 350 MB. Dygnet finns kvar i två kopior: exportfilen `arkiv/weather_observations/ÅÅÅÅ-MM-DD.ndjson.gz` i Supabase Storage
(privat hink) och veckodumpen `arkiv-…` som GitHub-release (arkivbackup.yml, de 12 senaste).
- **Att filerna går att läsa tillbaka** prövas med databasknappen: `dbknapp` med `atgard = aterlasprov`. Den hämtar det äldsta
  ännu inte raderade dygnet ur hinken och jämför det med databasen kolumn för kolumn (`arkiv_jamfor`). Inget skrivs. Väntat:
  `ok: true`, `sha_lika`, och `bara_i_filen` = `bara_i_databasen` = 0.
- **Marsvägen, för en dom som behöver raderade dygn:**
  1. Starta en tom PostGIS (en Actions-container eller lokalt) med `create extension postgis`.
  2. Läs in den senaste veckodumpen med `pg_restore --no-owner --no-privileges`. Fel om pg_net/pg_cron är väntade.
  3. Ladda ner de raderade dygnens filer ur hinken. Storage → `arkiv` i panelen, eller REST med service-nyckeln; nyckeln läggs aldrig
     i repot.
  4. Läs in varje fil med `SELECT arkiv_aterlas(convert_from(…, 'UTF8'))`, eller med `psql -c "SELECT arkiv_aterlas(:'t')" -v t="$(zcat fil.ndjson.gz)"`.
     Funktionen hoppar över rader som redan finns, så dumpen och filerna kan överlappa.
  5. Kör domens skript med `DATABASE_URL` mot containern.
- **Ett dygn tillbaka i driften** (bara om det verkligen behövs; databasen växer igen): `arkiv_aterlas` på samma sätt mot
  `DATABASE_URL`, och sedan `UPDATE arkiv_export SET raderad = NULL WHERE dag = …`, så att raderingen kan ta dygnet nästa gång.

## Rotating secrets
**Förnyelseklocka:** Supabase-accesstoken (sbp_…, Management-API/CLI) och GitHub-PAT löper ut ~nov 2026 —
förnya båda och uppdatera STATUS. `INGEST_KEY` roteras enligt livemotor-avsnittet ovan.
GitHub → repo → Settings → Secrets and variables → Actions:
`TRAFIKVERKET_API_KEY`, `DATABASE_URL`. After a Supabase password reset, give
Claude the new password — or edit DATABASE_URL yourself (percent-encode specials).

## Data sources cheat sheet (hard-won specifics)
- Trafikverket v2: POST XML → JSON. Situation REQUIRES namespace="road.trafficinfo"
  + schemaversion 1.6. Others: WeatherMeasurepoint 2.1, RoadCondition 1.2,
  TrafficSafetyCamera 1. Delta via changeid; LASTCHANGEID in every response.
- Supabase: use the POOLER url (aws-0-eu-north-1...:6543). Direct db.*:5432 is
  IPv6-only → fails from GitHub Actions and most sandboxes.

## Known weirdness
- Git-over-HTTPS from Actions runners returns 403 against halkvakt-karta with a
  fine-grained PAT that the REST API accepts (200) on the same runner. Unsolved;
  publish/push-data.ts therefore commits via the Git Data API instead. Do not
  "simplify" it back to git push without testing from a runner.
- Fine-grained PAT lessons (learned 2026-08-24, three times): (1) GET /repos
  "permissions" shows the USER's rights, not the token's — never use it to verify
  a token; test with a real write. (2) "Public repositories" access mode = read-
  only everywhere, ignores the permission list. (3) Nothing applies until Update
  is clicked. The active token covers both repos: Contents/Actions/Secrets/
  Workflows/Pages RW. Second (read-only) PAT from same date should be revoked.

## Polisen events-API — kända egenheter
- `?type=Trafikolycka%2C%20vilt` returnerar IBLAND ofiltrerad feed (cache-nyck hos polisen).
  `parseEvents` filtrerar defensivt på type klientsidan; enstaka ofiltrerade svar minskar
  bara pollnings-djupet, arkivet ackumulerar ändå komplett över tid (poll var 30:e min).
- Tider har ENSIFFRIGA timmar ("9:43:26") — parsern nollutfyller. Rör ej utan test.
- GPS = länscentrum. Får ALDRIG bli punktvarningar eller kartpunkter (DECISIONS #13).
