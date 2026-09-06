# Minutplanen — omvärdering 2026-09-06 (Bengts sista omvärdering)

Villkor: inget beslut om publikt/privat repo, ingen höjd spending limit, inga betalda tjänster.
Underlag: tre kartläggare + två prövade planer (Supabase-flytt, GitHub-diet) ur workflow
`actions-minuter-omvardering` (stoppad före skeptikerfasen för att spara Bengts tokenbudget —
siffrorna nedan är därför förslagsställarnas egna, inte adversariellt prövade; märkta där osäkra).

## 1. Svar på Bengts fråga: "sammanslagning av de nordiska + flytt till Supabase löser det helt?"

Halvrätt. Den del som stämmer är flytten; den del som var fel är sammanslagningen — och båda
missar att utvecklarflödet ensamt spränger taket.

- **Den hårda gränsen är GitHubs avrundning, inte vår kod.** Varje jobbstart debiteras uppåt till
  hel minut och bär ~1 min prolog (checkout + setup-node + npm ci). Bevis: bridges 18 körningar =
  exakt 18 min, ios-engine 10/10. 2 000 min/mån = 66,7 min/dygn = **max ~66 jobbstarter per dygn
  totalt**. Bokad takt när pulsklockan levererar fullt ≈ 530 starter/dygn.
- **Sammanslagning på GitHub löser nästan inget.** Den sparar prologen för 3–4 starter/timme, men
  FI/NO:s rad-för-rad-INSERT (fi.ts:75–100, no.ts:90–104, ~1 000 nätverksvarv/körning) följer med:
  hopslaget timjobb ≈ 8 min ⇒ ~5 800 min/mån ensamt; med UNNEST-batchning ~2 880/mån — fortfarande
  över hela budgeten. Publish (616 av 1 985) och ci (299) rörs inte alls.
- **Flytt till Supabase tar bort golvet** — men bara för det som flyttas. Ingest+regn-30 = 37 % av
  minuterna; med publish + healthcheck = 68 %. Kvar: ci + android + ios ≈ 25 % ≈ 3 500 min/mån vid
  dagens push-takt (166 commits/5 dygn, 54 rörde kod). **Utvecklarflödet spränger taket ensamt.**
  "Helt och hållet" kräver därför också ci-filter + android på tag (arbetssättsbeslut, inte pengar)
  ⇒ GitHub ~1 250 min/mån.
- Rätt form på Supabase är **en funktion per källa på eget pg_cron-jobb**, inte en sammanslagen
  nordisk funktion: CPU-taket (2 s/anrop, verifierat mot docs 6/9) gäller per anrop — skuggmotorns
  rotation "3 rutter/varv" (main.ts:189) är repots eget bevis.
- Var det fel att inte göra det tidigare? DECISIONS #7 (24/8) beslutade exakt detta; bara
  Situation/RoadCondition flyttades (#19/#22). Felet var att stanna halvvägs och att bygga ut
  GitHub-sidan (FI/DK/NO, regn-30, radar, ci på varje push, pulsbreddningen 4/9) utan ny
  minuträkning. GitHub-cronens svält (16–40 % leverans) dolde ~60 % av räkningen sedan #22.

## 2. Vad som kan göras utan de två besluten

| # | Åtgärd | Ger data när | Min sparade/mån (modell) | Insats | Vems händer | Risk / förbehåll |
|---|---|---|---|---|---|---|
| 1 | Ta bort GitHub-cron-hängslena i 6 driftfiler (pulsen är taktpinnen); behåll cron bara i healthcheck | efter nollställning | ~5 000 (3 000–7 000) | 10 min | Claude/Bengt; ny DECISIONS-rad (rör #26) | Om pg_cron dör larmar healthcheck inom 2–6 h |
| 2 | Publish som STEG i ingest-jobbet (ingen egen jobbstart); ta bort workflow_run | efter nollställning | ~700 | 30 min | Claude/Bengt | Inget beslut, struktur oförändrad |
| 3 | ci.yml paths-filter (engine/ingest/publish/sql/supabase/test/scripts/package*) | — | ~700 (350–1 100) | 5 rader | Claude; Bengt+Axel nickar | Docs-pushar får ingen bock |
| 4 | android: emulatorjobbet bara på dispatch, gradle-cache | — | ~850 | 3 rader | Claude; arbetssätt | Skärmbilder kräver knapptryck (PRODUKTBOK) |
| 5 | Städ: bridges 6 h → månad, marknadsforing timeout 10 min (saknas ⇒ 360 min default) | — | ~120 | 2 rader | Claude | Ingen |
| 6 | Nordiska (FI/DK/NO) som steg i timjobbet 1×/h i stället för egna jobb 2×/h | efter nollställning | ~9 400 | 45 min | Claude; **beslut Bengt+Axel** | Halverar vinterseriens upplösning permanent (latest-only-källor) |
| 7 | Stoppa puls-publish */30 (SQL av Axel, eller if-vakt i YAML) | — | ~2 900 | 1 rad | Axel (SQL) / Claude (if-vakt) | **Bryter appens 45-min-vakt** (AgeGate.kt:10, AgeGate.swift:6): timvis publish gör appen blind ~15 min/timme. Kräver höjd vakt ≥75 min i båda apparna + PRODUKTBOK, eller behåll 30 min (2 880/mån ensamt) |
| 8 | **A0 pilot: regn-30 som edge function** på pg_cron :41 — noll nya hemligheter (TRV-nyckel + DB-URL finns i edge-miljön) | när deployad (dagar) | ~280 (och bevisar deploy-vägen, pg_net-timeout, cron-mönstret) | 2–3 h + deploy | Claude kod; **Axel/webben deployar** | pg_net default timeout 2 000 ms — sätt ≥120 s; bevis = rad i weather_observations, inte "succeeded" |
| 9 | **A3 publish som edge function** (build-map-data + snapshots + push via Git Data API i minnet) | när deployad — **återupplivar appen** (väglag/olyckor är minutfärska i DB) | ~3 700 | 1,5–2 dagar + deploy | Claude kod; Axel: PUBLISH_TOKEN som Supabase-secret, bridges.geojson till CDN/tabell, deploy, cron | Wall-clock 150 s: uppskattat 20–40 s, MÅSTE mätas; CPU <0,5 s av 2 s |
| 10 | A2 ingest-se som edge function (väder/kameror/situation/polisen/smhi + arkivkursor) | när deployad | ~1 160 | 1–1,5 dag | Claude; Axel deploy | Aldrig parallellt med GitHub-ingest på samma arkivkursor (#73a) — stäng cron i samma varv |
| 11 | A1 FI/DK/NO som tre edge functions med UNNEST-batchning | när deployade | ~2 960 | ~1 dag | Claude; Axel: VEGVESEN-secrets, deploy, 3 cron | CPU omätt för NO (3,3 MB XML-regex) och DK (≤40 000 features); mät första varvet |
| 12 | A4 healthcheck som edge function | när deployad | ~290 | ½ dag | Axel: PAT med Issues:write som Supabase-secret | Vakthunden slutar bo på det den vaktar |
| 13 | DB-trigger road_conditions → road_condition_history (kort #51-granskningen) | migration | 0 GitHub-min, tar bort arkivets beroende av GitHub helt | 40 rader SQL | Axel/webben (Management API/dashboard) | Oberoende av allt ovan |
| 14 | Nödkörning lokalt på Bengts dator: `npm run ingest` + publish-kedjan | **i dag**, om hemligheterna lämnas över | — | 30 min | **Axel** lämnar DATABASE_URL (pooler), TRAFIKVERKET_API_KEY, PUBLISH_TOKEN till Bengt personligen (.env, aldrig chatten) | Handgrepp, inte beslut. Enda vägen till data FÖRE nollställningen |
| 15 | Self-hosted runner (Bengts PC/Axels Mac): 0 minuter även för privat repo, `runs-on: self-hosted` | dagar | allt som körs där | 1 h | **Axel** (kräver repo-admin att registrera) | EJ prövad av skeptiker. Datorn sover/WiFi (TradingOS-läxan 4/9), säkerhet OK på privat repo |

Summering per väg (modell, bokad takt): enbart dieten (1–7) ≈ 8 000 min/mån ⇒ ~7 dygn per pott
i stället för ~2; dieten + UNNEST-batchning ≈ 5 500; **Supabase-flytten (8–12) + ci/android-filter
≈ 1 250/mån = ryms**. Flytten utan ci/android-filter ≈ 3 500 ⇒ slut runt dag 17.

## 3. Vad som INTE går utan beslut
- Data **före** nollställningen: bara #14 (Axels hemligheter till Bengt) eller nollställningsdatumet
  (syns bara i Axels Billing & plans). Alla workflow-ändringar är verkningslösa tills potten är ny.
- Publikt repo / spending limit — utanför ramen, medvetet.
- #6 (upplösning 1×/h) och #7 (appens 45-min-vakt) är produktbeslut, inte teknik.

## 4. Avvikelser & överraskningar ur granskningen
1. **Skuggmotorn är påverkad**, tvärtemot vad jag skrev i går: den läser static/live ur CDN:n och kör
   sedan 5/9 11:12Z mot fryst snapshot (skuggmotor/index.ts:586–589). Raderna bär
   snapshot_generated_at och kan sorteras bort.
2. **Minutbantningskortets punkt 1 ("appen rör det inte") är fel**: timvis publish bryter 45-min-vakten
   i båda apparna.
3. **Dubbeltriggning**: alla driftjobb har GitHub-cron OCH puls på samma minuter; ingest/regn-30/
   healthcheck saknar concurrency helt, och `cancel-in-progress:false` betyder 1 körande + 1 väntande
   (båda debiteras). SYSTEM.md:75 "concurrency-gruppen dedupar" stämmer inte.
4. **~58 % av minuterna är prolog**, inte arbete (1 147 starter × ~1 min).
5. **ci**: ~60 % av körningarna 1–5/9 testade docs-only-pushar.
6. `ios/HalkvaktEngine/.build/` (504 filer, 29 MB) är incheckat och dras i varje checkout; `.gitignore`
   saknar det. Eget kort.
7. marknadsforing.yml saknar timeout-minutes ⇒ 360 min default; ett hängt anrop kan äta 18 % av
   månadspotten.
8. pg_net default timeout är 2 000 ms (inte 5 000 som antogs) — avgörande för edge-flytten.
9. Ingen deploy-notering av skuggmotorn efter 2/9-commits — deployad version kan ligga efter index.ts.
10. Okänt om de döda 3–7-sekunderskörningarna debiteras; pulsen avfyrar ~10 dispatcher/timme.
11. Supabase-projektet pausas efter 7 dygns inaktivitet på gratisnivån (ANTAGANDE ur docs-minne) —
    irrelevant så länge livemotorn skriver varje minut.

## 5. Rekommenderad ordning, närmaste 48 h
1. **Claude nu**: diet-PR med #1, #2, #3, #4, #5 (inga produktbeslut), YAML syntaxkontrollerad lokalt;
   kan inte verifieras av ci förrän potten är ny. Bokförs som förslag, inte klart.
2. **Frågor till Axel (handgrepp, inte beslut)**: nollställningsdatum; hemligheterna till Bengt för
   nödkörning (#14) eller eget beslut att avvakta; PUBLISH_TOKEN + VEGVESEN-paret som
   Supabase-secrets; deploy-väg (sbp-token till webben, eller SUPABASE_ACCESS_TOKEN i GitHub Secrets
   för en deploy-workflow); Issues-PAT för vakthunden.
3. **Beslut Bengt + Axel**: #6 (1×/h) och #7 (45-min-vakten).
4. **Claude därefter**: A0-piloten (#8) → A3 publish (#9) i webben-varvet; DB-triggern (#13) parallellt.
5. Beviskrav: Usage metrics per dygn som tal på tavlan varje måndag; första :11-körningens logg efter
   nollställningen; meta.json-ålder på CDN.
