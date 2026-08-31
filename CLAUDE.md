# CLAUDE.md — Halkvakt (working title)

## 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.
- State assumptions explicitly; if uncertain, ask rather than guess.
- Present multiple interpretations when ambiguity exists; don't pick silently.
- Push back when a simpler approach exists. Stop and name what's unclear when confused.

## 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code.
- No unrequested "flexibility"/"configurability". No error handling for impossible cases.
- If 200 lines could be 50, rewrite. Test: would a senior engineer call it overcomplicated?

## 3. Surgical Changes
Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken.
- Match existing style. Mention unrelated dead code; don't delete it.
- Remove imports/vars/functions YOUR change orphaned; leave pre-existing dead code alone.
Test: every changed line traces directly to the request.

## 4. Goal-Driven Execution
Define success criteria. Loop until verified.
- "Fix the bug" → "write a failing test that reproduces it, make it pass."
- Multi-step work: brief plan, each step with its verify check.

## Project-Specific Rules

**Product invariants (violating these is a bug, not a style issue):**
- No user location, GPS trace, or movement data may ever be transmitted off-device.
  Matching happens on the phone against downloaded snapshots. Full stop.
- Alert copy must never overstate the data: segment sources (RoadCondition) may say
  "on the road ahead"; point sources (weather stations) say "framöver", never a distance
  the data doesn't support.
- Alert discipline: max 1 spoken alert / 45 s; priority A3>A1>A2>A4>A5, lower dropped
  not queued; no repeat of same alert within 10 min / 5 km. These are covered by tests
  in `engine/vectors/` — never weaken a vector to make a build pass.
- Silence is a feature. When in doubt, don't alert.

**Engineering:**
- The alert engine is pure and platform-free; Android (and later iOS) implementations
  must pass the shared JSON test vectors in `engine/vectors/` byte-for-byte.
- Geometry is WGS84 everywhere. Timestamps UTC ISO-8601 everywhere.
- Ingesters are idempotent and delta-based (Trafikverket `changeid`); a rerun must never
  duplicate rows.
- Snapshot files are versioned + checksummed via `manifest.json`; the app must reject a
  snapshot with a bad checksum and keep the previous one.
- Free tier is a constraint, not a suggestion: no service or dependency that requires a
  paid plan without an entry in DECISIONS.md approved by Axel.
- Battery budget on device: < 8 %/h screen-off while active. Treat regressions as
  release blockers.
- Secrets (Trafikverket key etc.) live in GitHub Actions secrets / local `.env`; never
  in code, snapshots, or the client app.
- Log significant choices in DECISIONS.md (date, decision, alternatives, why).

**Language:** code + comments in English; all user-facing strings in `strings/sv.xml`
first, English second.

## Session protocol (self-steering)
Every session, in order:
1. Read TAVLA.md (människolagret — hålls i synk varje varv) och STATUS.md, BACKLOG.md, DECISIONS.md, latest CI runs.
2. Take the top unblocked BACKLOG item. Build against its *Verify* line.
3. Prove it: tests/CI/logs — never claim done without evidence.
4. Commit with a message explaining what + why. Update STATUS.md (state + session
   log) and BACKLOG.md. Log decisions in DECISIONS.md.
5. End by telling Axel: what shipped, what's next, and ONLY the questions that
   block progress. Batch questions; never drip them.

## Skills (obligatoriskt före app-kod)
Före kod i `android/` eller `ios/`: läs relevant `skills/<namn>/SKILL.md` enligt
katalogen i `docs/SKILLS.md`. Minimum: `halkvakt-android` för allt Android-arbete,
`swiftui-pro`+`swift-concurrency-pro` för iOS. Nya hårt vunna läxor förs in i
`skills/halkvakt-android/SKILL.md` §5 i samma commit som de lärs.


## TAVELREGELN (Axels order 2026-08-28 — järnlag)
Varje arbetsvarv AVSLUTAS med att TAVLA.md synkas mot verkligheten:
1. Byggt klart något → kortet till 🟢 KLART (med en rads bevis).
2. Nytt arbete upptäckt/beställt → NYTT KORT direkt, i rätt sektion
   (Axel/Bengt/Claude olåst/Claude låst — låsta kort anger sin nyckel).
3. Verkligheten bevisar något (commit, kvitto, skärmbild) → kortet flyttas
   utan att fråga.
4. Finns det inte på tavlan finns det inte. Idéer utan kort = tappade idéer.
Tavlan är människolagret; BACKLOG/STATUS/DECISIONS är djuplagren.

## PRODUKTBOKSREGELN (Axels order 2026-08-29)
Ändras något användaren SER, HÖR eller GÖR (skärm, rösttext, flöde, behörighet)
⇒ docs/PRODUKTBOK.md uppdateras i samma varv, med färska skärmbilder ur
fotostudions senaste artefakt (app-screenshots) committade till docs/produktbok/. Alla fyra
i samma commit när de överlappar.
- Supabase-gatewayen TVÅNGSSTÄMPLAR funktions-HTML till text/plain + nosniff på GET (HEAD ljuger och visar text/html — verifiera alltid med GET!). Regel: funktioner serverar JSON-API, människosidor bor på Pages (karta-repot).
- /tmp/karta kan sakna git-identitet i färsk container: git config user.email/name lokalt före commit.
- Apple Developer-inskrivning: Developer-APPEN kan låsa ID-steget till körkort; WEBBEN (developer.apple.com/enroll) gick igenom utan ID-fråga och gav omedelbar beställning (31/8 2026, Sverige). Individual visar juridiskt namn som säljare; migrering till organisation möjlig senare.
- iOS-uppladdning kräver AppIcon i Assets.xcassets (1024 px universal räcker sedan Xcode 14) + ASSETCATALOG_COMPILER_APPICON_NAME — utan ikon vägrar App Store Connect bygget.
- xcodegen-genererad Info.plist får 1.0 (1) som standard — koppla CFBundleShortVersionString/CFBundleVersion till $(MARKETING_VERSION)/$(CURRENT_PROJECT_VERSION) i info.properties, ANNARS låser första uppladdningen versionsspåret (Apple tillåter aldrig lägre version än uppladdad). Fångat i Organizer 31/8 sekunder före upload.
- Xcodes gula "All interface orientations must be supported unless the app requires full screen" är INTE kosmetisk: App Store-valideringen stoppar uploaden. iPhone-app ⇒ TARGETED_DEVICE_FAMILY "1" + UIRequiresFullScreen true. (Ignorerade varningen 31/8, kostade ett arkiveringsvarv.)
- App Store Connect i Brave: Shields dödar kryssrutor/knappar (formulär ser döda ut). Använd Safari för alla Apple-webbsidor. (31/8, Users and Access-formuläret.)
- Intern TestFlight-testare = teammedlem i App Store Connect (Users and Access → +, roll App Manager räcker) — granskningsfritt, bygget direkt. Extern grupp/publik länk = Beta App Review (timmar–dygn).
- Filer som presenteras i chatten måste LADDAS NER samma stund — de finns inte kvar på ägarens dator av sig själva (lördagens nyckelfiler försvann så). Upload-nyckeln roterad 31/8 (ny jks + lösenord i GitHub Secrets HV_KEYSTORE_B64/PASS, alias halkvakt, utfärdare Lagerlöf Labs). Riskfritt före första Play-uppladdningen — efter den är nyckeln bunden hos Google.
- Vektorgeneratorns 5-metersregel är inte kosmetisk: första utkastet till v15 lade
  10 km-gränsen 1,7 m från en fixpunkt. Node valde t=41; Swift/Kotlin hade mycket väl
  kunnat välja t=40 på libm-avrundning och brutit parvisheten. MÄT marginalen (avstånd
  vid fixen före och efter tröskeln) innan en vektor fryses — gissa aldrig på geometrin.
- Trafikverkets SeverityCode är fyrgradig i praktiken: 1, 2, 4, 5. Kod 3 finns i
  dokumentationen men har aldrig dykt upp i vårt arkiv. Skriv aldrig `>= 3`-logik.
- ÅTGÄRDAT 31/8 (upptäckt under #28): `KEEP`-filtret i ingest/sources/situations.ts
  matchar "Obstruction" och "Incident", men Trafikverket använder aldrig de orden — de
  riktiga värdena är "VehicleObstruction", "GeneralObstruction", "AnimalPresenceObstruction"
  m.fl. Filtret släpper alltså i praktiken bara igenom "Accident". Inte trasigt för oss
  idag, men det gör inte det man tror. Eget kort krävs innan någon "fixar" det — att
  vidga filtret släpper in vägarbeten, som DECISIONS #5 medvetet stängde ute.
  ÅTGÄRD: filtret säger nu sanningen (bara "Accident"); vidgningen är kort #32.
- Ett filter med formen `if (!KEEP.has(x) && !deleted) continue;` har TVÅ effekter, inte en.
  Den andra är osynlig: raderingar av OTRACKADE typer släpps in och skapar rader. Halkvakts
  deviations-tabell bestod till 94 % av gravstenar för vägarbeten vi aldrig lagrat levande
  (4 584 rader, ~650/dygn). Läxa: separera "vad vi lagrar" från "vad som får radera" —
  raderingar ska vara UPDATE, aldrig INSERT, så de kan städa men aldrig skapa.
- Nyckelrotation är inte klar förrän ett BYGGE har signerats med den nya nyckeln.
  31/8 roterades upload-nyckeln och CI-secrets "byttes ut" — men HV_KEYSTORE_PASS och
  HV_KEYSTORE_B64 kom inte från samma jks, och det syntes först fyra commits senare när
  android.yml kördes nästa gång ("keystore password was incorrect"). Läxa: efter varje
  rotation, TRIGGA bygget direkt och läs domen. Ett grönt kort på tavlan är inte bevis;
  en grön körning är.
- En ändrad fil under supabase/functions/ är INTE en deploy. Livemotorn kör ur Supabase,
  inte ur repot. Gravstensläckan "tätades" 08:45 i git och läckte vidare till 08:53 när
  funktionen faktiskt deployades. Regel: varje commit som rör supabase/functions/ följs av
  `supabase functions deploy` i samma varv, och beviset är en mätning EFTER deployen
  (räknare som står still / kursor som rullar), inte commit-hashen.
- "RLS på" i panelen bevisar ingenting. Bevisa med anon-nyckeln: PATCH mot ett påhittat id
  ger 204 om rättigheten finns (0 rader matchade men anropet var tillåtet) och 401 om den
  saknas. Ett DELETE som faller på kolumnnamn (400) har PASSERAT rättighetskontrollen.
  Lås alltid dubbelt: RLS utan policy + REVOKE, så en klickruta inte kan öppna arkivet igen.
- Migrationer som rör Supabase-rollerna (anon/authenticated) måste vakta med
  `IF EXISTS (SELECT 1 FROM pg_roles ...)`. CI:s slit-och-släng-PostGIS har inga sådana
  roller, och en naken REVOKE fäller integrationstestet (003, 31/8). 002 kördes bara via
  Management API och gick därför oupptäckt förbi — hade den legat i auto-migrationen hade
  samma sak hänt.
- SwiftUI TabView(.page) lägger sidprickarna OVANPÅ innehållet, inte under det. Sista
  elementet på varje sida måste ha ≥ 56 pt fri höjd under sig, annars täcks knappar.
  Fångat på Axels telefon 31/8: "Byt bilkoppling" låg under prickarna och gick inte att träffa.
