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
- No user location, GPS trace, or movement data may ever leave the device AUTOMATICALLY.
  Matching happens on the phone against downloaded snapshots. The ONLY thing ever transmitted is a
  facit answer the driver presses themselves — warning id + timestamp, i.e. roughly where and when —
  and only for beta testers who turned the switch on (off by default). Rewritten 20/9 by Axel
  (DECISIONS #264) because the old wording ("Full stop") became untrue on 16/9 when S4 shipped, and
  stayed in four documents for four days. Change what the app sends ⇒ this line, the Play Data Safety
  file, integritet.html in the map repo and the product book change in the SAME commit.
- Alert copy must never overstate the data: segment sources (RoadCondition) may say
  "on the road ahead"; point sources (weather stations) say "framöver", never a distance
  the data doesn't support.
- Alert discipline: priority A3>A1>A2>A4>A5 picks ONE winner per step, lower dropped —
  never queued. Within 10 s of an utterance only a MORE important hazard may speak
  (priority-aware cooldown, kort #127 13/9 — replaced the blind 45 s that silenced ice
  20 s behind a camera, v23). Same hazard never repeated within 10 min / 5 km. Covered by
  tests in `engine/vectors/` — never weaken a vector to make a build pass. The cadence is
  MEASURED, not assumed: skuggrapportens `takt` (tätaste följd, följder inom 60 s) is where
  any cap must come from (Bengt 16/9, DECISIONS #200).
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
- Log significant choices in DECISIONS.md (date, decision, alternatives, why). Ett beslut = ett
  unikt nummer, nästa är högsta + 1 (`scripts/beslutsnumren.ts` i CI fäller dubbletter). Hänvisa
  alltid med rymden utskriven: `DECISIONS #NN`, `kort #NN`, `issue #NN`, `PR #NN` (kort #220).
- **VÄRDEVAKTEN (Bengts order 2026-09-12).** Ett fält får inte bära en mätning, en tröskel eller
  en varning förrän det passerat `scripts/vardevakten.ts`. Ett fält utan deklarerat spann
  rapporteras som **OBESIKTIGAT** — det är ett hinder, inte en varning, och det friskförklaras
  inte av att talen råkar se rimliga ut. Bygger du något nytt som ska mätas: deklarera spannet i
  skriptets `SPANN` och kör knappen INNAN fältet används i en grind eller en tröskel.
  Skälet: på ett dygn visade sig fyra fält innehålla koder som är typgiltiga men fysiskt omöjliga
  — byvind 85,5 m/s (trasig givare), sikt 20 000 m (sentinel i halva materialet), molnmängd 113 %
  (SMHI:s kod för himlen skymd), `precipitation` "no"/"Dry" (strängar som betyder torrt). Plus två
  äldre: SeverityCode 3 som aldrig funnits, och Camera.Bearing som pekar åt motsatt håll.
  **Inget av dem hittades av en vakt** — alla av att en människa läste en utskrift.

**Language:** code + comments in English; all user-facing strings in `strings/sv.xml`
first, English second.

## Session protocol (self-steering)
Every session, in order:
1. Orient per SESSIONSREGELN below: the latest `docs/BEDOMNING-*.md` in full, `docs/INTEGRATIONSKARTAN.md` when it
   changed or a new grepp starts, TAVLA.md's 🟡 section, DECISIONS added since last session, latest CI runs. Search
   TAVLA, STATUS and DECISIONS — don't read them whole (~280 000 tokens together).
2. Take the top unblocked BACKLOG item. Build against its *Verify* line.
3. Prove it: tests/CI/logs — never claim done without evidence.
4. Commit with a message explaining what + why. Update STATUS.md (state + session
   log) and BACKLOG.md. Log decisions in DECISIONS.md.
5. End by telling Axel: what shipped, what's next, and ONLY the questions that
   block progress. Batch questions; never drip them.

## SESSIONSREGELN (Bengts order 2026-09-17 — inga obesvarade trådar, DECISIONS #228)
Repot är enda synken mellan sessioner (dator, webb, mobil). Det som bara stod i chatten finns inte nästa gång.
1. **Vid start — orientera.** Läs den senaste bedömningen (`docs/BEDOMNING-*.md`) hela: den är den enda listan, med
   bevakningen (§0b) och de öppna besluten (§4.2). Läs `docs/INTEGRATIONSKARTAN.md` när `git log` visar att den ändrats
   sedan förra sessionen eller när ett nytt grepp börjar — den är fryst och ger annars inget nytt (~14 000 tokens).
2. **Innan något stryks eller sägs vara omöjligt — sök i repot.** Lista tabellerna
   (`grep -ho "CREATE TABLE[A-Z ]* [a-z_]*" sql/*.sql`) och sök nyckelordet i `docs/TROSKLAR-*.md` och i koden. Det
   kostar några hundra tokens. Skälet: 16/9 ströks radarn för att den "inte gick att spela upp" — fast `radar_precip`
   aldrig gallras och `trend_kandidater` sparar fallen. Missen kostade en dags omtag (DECISIONS #223/#224).
3. **Inga trådar bara i chatten.** En fråga till Bengt eller Axel skrivs in i bedömningen (§4.2) i samma varv som den
   ställs; ett beslut i chatten skrivs in i DECISIONS och bedömningen (§4.1, §0b) i samma varv som det fattas.
   Kontroll före sessionens slut: frågorna i sista svaret ska finnas som rader i §4.2.
4. **Stryk fortlöpande i bedömningen.** En rad stryks i samma varv som beviset finns, med beviset på raden, och
   läget överst (var vi är, vart vi är på väg) hålls aktuellt. Integrationskartan stryks inte löpande — den är fryst
   och ändras först efter bygge och mätning.

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
- Genvägar har TVÅ plus. Det uppe till höger på första fliken skapar en GENVÄG; utlösare
  (CarPlay/Bluetooth/Fokus/App) finns bara under fliken Automation längst ner i mitten,
  som en scrollbar lista — inte sökbara bland åtgärder. Axel gick rakt i fällan 31/8 trots
  att guiden sa "fliken Automation". Deeplink shortcuts://create-automation (odokumenterad,
  Vox Silva) landar rätt; steg 1 måste ändå namnge fel-plusset uttryckligen.
- Döp aldrig ett enum-fall till `none` om typen någonsin används som optional: `x = .none`
  på `Enum?` blir `Optional.none` (nil), tyst, utan varning. CarSetup.none → "Inte alls"
  sparade ingenting (Axels telefon 31/8). Använd `noConnection`, `off`, `manual` — vad som
  helst utom `none`.
- Fokus "Kör" finns INTE som standard på alla iPhones (Axels hade DND/Personal/Sleep/Work).
  Guider som säger "Fokus → Kör" måste täcka "+ → Kör → Anpassa fokus". Uppmätt 31/8.
  Bonus-fynd: Fokus Kör har inbyggda utlösare "Automatiskt", "Vid bilens Bluetooth" och
  "Aktivera med CarPlay" — EN automation ("Kör slås på → Starta vakten") skulle kunna täcka
  alla tre bilkopplingarna. Genvägars direkta CarPlay/Bluetooth-utlösare är färre steg, så
  guiden behåller tre spår; men det är ett kandidatsätt att förenkla till ett spår.
- Klistra ALDRIG motorkod in i en edge function. Skuggmotorn körde ett dygn på gammal motor
  efter #28 utan att någon märkte det — rapportsidan såg levande ut. Regel: index.ts är
  genererad (scripts/bundle-skuggmotor.ts), källan är engine/src, CI kör --check.
  Efter varje motorändring: bunta + deploya skuggmotor i samma varv som testerna.
- Xcode "Attaching to … / Logging Error: Failed to initialize logging system" + vit skärm som
  överlever omstart + INGEN kraschrapport i Analysdata = halvinstallerad app (installationen
  avbröts när debuggern föll). Lösning: radera appen från telefonen → ▶. Inte koden. 31/8.
- En fail-soft-gren för en fil som aldrig funnits är ett tyst ALDRIG: kameror-vaglag hoppade
  över skrivningen på TRV 400 i varje varv ("förra filen kvar på CDN" — det fanns ingen) och
  jobbet var grönt. Regel: en ny fils FÖRSTA publicering bevisas med filens egen logg-rad,
  och fel-loggen ska bära API:ets svarskropp — "TRV 400" utan kropp kostade ett diagnosvarv.
  (1/9: rotorsaken var "Invalid query attribute Camera.RoadNumber" — fältet finns i
  TrafficSafetyCamera, inte i Camera.)
- Trafikverkets Camera.Bearing = riktningen kameran TITTAR (mot trafiken), INTE färdriktningen
  den bevakar. Övervakad kurs = bearing + 180°. Samma fälla finns i NVDB. Kontrollera alltid
  vinkelkonventioner mot en känd mätplats innan filter byggs på dem (2/9, Bengts E4-mätning).
- Signeringshemligheter roteras ALLTID i par: HV_KEYSTORE_B64 och HV_KEYSTORE_PASS måste komma
  från samma jks i samma sittning. 31/8 roterades bara lösenordet ⇒ tre dagars trasig
  Play-pipeline. jks-filen ska ligga i iCloud, aldrig bara i GitHub — utan filen kan paret
  inte lagas, bara ersättas (2/9, DECISIONS #58).
- ALDRIG be Axel arkivera när ios-engine (Swift-vektorerna) är röd. Xcode kompilerar glatt
  kod som bryter kontraktet — 2/9 låg ios-engine röd i FYRA körningar medan 0.3.4 byggdes,
  deployades och testades i bil av Bengt. Vägnumret nådde aldrig EARLY-grenen i vare sig
  Swift eller Kotlin (texten delad över två rader ⇒ min sträng-ersättning missade), och
  fältrapporterna blev omöjliga att tolka. Kontroll före varje "arkivera nu": kör
  ios-engine + android + ci, alla gröna, INNAN uppmaningen skickas.
- "Filen på CDN är färsk" är INTE "appen har den". Apparna verifierar sha256 ur manifest.json
  och behåller cachen vid fel. publicera skrev live.json utan manifest 8/9 06:10–12:40: 38 gröna
  commits, noll nya snapshots i telefonen. Bevisa alltid med manifestets sha = filens sha.
- Ett tröskelvärde som kopieras till mer än en fil FÖRS IN i `scripts/kontraktsgrinden.ts` i samma
  commit som den andra kopian skrivs. #75:s givarvakt hann bli sjutton kopior i tolv filer innan
  någon vakt fanns; varje kopia sitter i en mätning som lämnar en dom, så en drivande kopia
  förfalskar domen och inte bara en siffra. Grinden är ett skyddsnät MELLAN ändringstillfällena —
  när en tröskel faktiskt ändras gäller fortfarande en fullständig grep över hela kodbasen.
- Ett commit-steg som gör `git add <en sökväg>` antar tyst att RESTEN av trädet är rent, och faller på
  en fil det aldrig rört. 12/9 infördes `*.bat text eol=crlf` medan `android/gradlew.bat` låg i git med
  CRLF redan i bloben ⇒ filen är permanent "ändrad" varje gång git läser innehåll i stället för att lita
  på stat-cachen, och `git pull --rebase` vägrar med "You have unstaged changes" UTAN att nämna filen.
  Nyckfullt (fyra gröna dygn emellan), så mönstret syns inte i en enskild logg. Följden var värre än de
  röda jobben: trv-bevaknings state nådde aldrig main, och sex källvakter seedade om sig varje körning —
  levande i loggen, oförmögna att larma. Regel: flöden som committar tillbaka använder
  `git pull --rebase --autostash` och skriver ut `git status --porcelain` i fel-grenen; och ett nytt
  radslutsattribut följs av `git add --renormalize` i samma commit.
- `Boolean(precipitation)` är en falsklarmsmaskin: Trafikverket skriver "no" vid uppehåll och
  de nordiska källorna "Dry". Nederbördsklasser är strängar med ordlista, aldrig sanningsvärden.
- Ett bevis på att en KOLUMN skrivs är inte ett bevis på att den bär något. `shadow_log.suppressed`
  verifierades som `[]` i varje rad i två dygn och bokfördes som "spärren synlig" (#127 a): kroken hade
  skrivits i den GENERERADE `index.ts`, bunten skrev över den från `main.ts`, och deployen gick utan
  krok. Fjärde gången på tio dagar som "fanns" togs för "fungerade" (Axel 16/9, DECISIONS #193/#196).
  Regel: ändra aldrig en genererad fil (bundle-skriptets rad 4 säger det), och beviset för en ny logg
  är en rad MED innehåll — framkallad med prov eller inväntad — aldrig att fältet finns.

- En tavelsynk som ERSÄTTER en sektion måste diffas på kortantal före push. 99473c7 (8/9 20:43)
  skrev om "Axels nästa steg" och svalde 174 rader — hela #38b (stråket, grind A, ankar-
  breddningen med höjd- och SMHI-proven) plus tretton kort till, utan att någon märkte det på
  två dygn; tre nya kort hänvisade till ett #38b som inte fanns. Regel: `git diff --stat TAVLA.md`
  med fler än ~30 raderade rader ⇒ lista de raderade `- [ ]`-raderna och bekräfta varje flytt.
- Ett FASTSTÄLLT dokument som inte är incheckat finns inte. TROSKLAR-TRENDEN skrevs och fastställdes
  10/9 23:04 och låg ett dygn som enda kopia i ett arbetsträd — inte på origin, inte i gren, inte i
  PR. Repot är enda synken mellan parallella sessioner, så ett dygns arbete hängde på en disk, och
  tavlans kort #88 sa fortfarande "tröskeldokument först" som om inget fanns. Regel: fastställande
  och incheckning sker i SAMMA varv, med kortraden och DECISIONS-raden i samma commit. Kontroll före
  varje sessionsslut: `git status --porcelain --untracked-files=all` — en ospårad fil under docs/ är
  ett larm, inte en detalj.
- DEPLOYA ALDRIG en Supabase-funktion utan att först `git pull` och verifiera att lokala filen
  är identisk med main (`git diff origin/main -- supabase/functions/X/`). 12/9 skrev jag över
  Bengts check 7 med en version som saknade den; main hade båda, driften bara min. Efter
  deploy: kör funktionens egna prov så varje check bevisligen finns i det som kör. En check
  som tyst försvinner ur driften är värre än en som aldrig byggdes (DECISIONS #126b).
- En vitlista som finns på TVÅ ställen är en lista som glider isär. `scripts/dbknapp.ts` hade
  FLAGGOR och `dbknapp.yml` räknade upp samma flaggor i sin if-sats. 13/9 lades `kassaprov` till i
  skriptet men inte i YAML:en, och körningen föll TYST ned i else-grenen och körde en migration i
  stället för larmprovet. Ofarligt just då (filen var idempotent) men fel sak gjord utan ett ord.
  Regel: när ett val ska styra vilken gren som körs, fråga efter DEN ENA grenen (`if migrera`) och
  låt allt annat gå till den andra, så att den riktiga listan ligger i koden och en okänd flagga
  avvisas högljutt i stället för att tolkas som något annat.
- GitHubs `/actions/runs` paginerar bara fram till **1 000 träffar** och säger det inte. Kassavaktens
  första körning 13/9 räknade exakt 1 000 körningar, rapporterade 94 min/dygn och såg fullt rimlig ut
  — mot 202 min/dygn som mätts oberoende samma dygn. Talet var alltså halverat utan ett felmeddelande,
  och en vakt som tyst halverar sig själv ger lugn på fel grund. Regel: paginera aldrig en månad i ett
  svep, dela upp i fönster som säkert rymmer under taket (ett dygn), och lita aldrig på att "sista
  sidan var kort" betyder "det var allt". Samma fälla finns i alla list-API:er med hårt träfftak.
- TypeScript räknar i binär flyttal, Postgres i exakt `numeric`. `4.8 - 4.4` är **0,39999999999999947**
  i den ena och **0,4** i den andra — och en tröskel på 0,4 skiljer dem åt. Uppmätt 13/9 av
  trendarkivets driftvakt: SQL valde **862 av 4 713** kandidater som TypeScript inte valde, utan en
  enda skillnad i logik. Regel: när samma regel finns i BÅDA språken, avrunda på TypeScript-sidan
  till fler decimaler än mätvärdet har (mätvärde med en decimal ⇒ avrunda till tre) INNAN
  jämförelsen mot tröskeln. Och bygg en jämförelse som kör båda sidorna över samma fönster —
  kontraktsgrinden vaktar att kopiorna bär samma TAL, men bara en jämförelse vaktar att de fattar
  samma BESLUT.
- Ett byggnummer som sätts FÖRE den sista ändringen bevisar inte vilket bygge som är ute. 16/9 sattes iOS 0.3.7 (10) kl.
  13:45 och facitknapparna (`FacitRow`) kom 13:53 med samma nummer; bygget i TestFlight saknade knapparna, och två
  provkörningar gick åt innan det syntes (18/9, DECISIONS #240). Regel: byggnumret höjs i samma commit som den sista
  ändringen före ett bygge — eller efter den, aldrig före — och uppmaningen "arkivera nu" nämner commit-hashen.
- Ett motprov som fälls av KONTRAKTSGRINDEN bevisar inte att PROVET fångar felet — grinden kör före testerna och
  stoppar bygget innan de startar. 20/9 (#207) såg motprovet grönt ut som bevis: ordgränsen i halkorden togs bort,
  bygget blev rött, och det såg ut som om testet hade fångat fällan "fläckvis Våt". Det hade det inte. Ett andra
  motprov, osynligt för grinden (facitradien vidgad till 500 km), krävdes för att fälla provet självt. Regel: när en
  regel vaktas av BÅDE ett kontrakt och ett prov, mutera en gång per vakt — och läs VILKEN rad som föll.
- En fälla i testdata måste ligga där den kan fälla något. Samma dag låg "fläckvis Våt" vid stationen som redan hade
  ett riktigt fynd, och eftersom kolumnen räknar EPISODER och inte rader kunde fällan aldrig ändra ett tal. Regel:
  lägg varje falsk-positiv-fälla vid ett fall som annars ger NOLL.
- En kontaktuppgift — e-postadress, telefonnummer, formulär — som ges till Bengt eller Axel ska vara LÄST på
  källsidan, inte tagen ur en automatisk sammanfattning (WebFetch). 17/9 fick Bengt `datex@trafikverket.se`, som
  sammanfattningen av trafficdata.se hittade på: katalogposten har inga kontaktfält och Trafikverket ingen sådan
  adress. Rätt väg var Datautbytesportalens kontaktformulär. En fel adress kostar ett utskick och ett varv.
  *(Rättelse 21/9, DECISIONS #282/#293: adressen FINNS — den står som `contact_email` i Trafikverkets egna katalogposter på
  trafficdata.se. Det som var fel 17/9 var att den gavs vidare oläst. Regeln står: läs på källan, åt båda hållen — också
  innan något kallas påhittat.)*
- `[skip ci]` verkar på HELA commit-meddelandet, inte bara rubriken. 21/9 fick mätskriptets PR (#428) ingen körning
  alls på nio minuter: kroppen sa *"Egen commit utan [skip ci]: den bär kod"*, och GitHub läste märket i meningen som
  förnekade det. Regel: skriv aldrig märket i ett meddelande som ska testas, inte ens för att säga att det saknas — och
  kontrollera direkt efter push att en körning har startat (`/actions/runs?head_sha=`) innan du väntar på den.
