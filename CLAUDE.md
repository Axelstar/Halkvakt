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
  or a miss the driver marks themselves ("appen missade": nearest station id + timestamp + what it was,
  chosen after the trip; DECISIONS #267/#379) — and only for beta testers who turned the switch on (off by
  default). Rewritten 20/9 by Axel
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
- Log significant choices in DECISIONS.md (date, decision, alternatives, why). Varje nytt beslut slutar med raden
  `**Stomdokument:** MAT, SYS` eller `**Stomdokument:** inga — skälet` (DOKUMENTSYNKEN nedan; stomvakten i md-vakt fäller annars). Ett beslut = ett
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
1. Run the kartsynk first (`node --experimental-strip-types scripts/kartsynk.ts`) and book what it lists (PROJEKTKARTAN →
   Kartsynken below). Read the morning's dokumentsynk (DOKUMENTSYNKEN below): its STATUS line, its PR, and republish every artifact its line lists under
   *Att republicera* that this machine can reach. Then orient per SESSIONSREGELN below: the project map (`docs/PROJEKTKARTAN.html`, PROJEKTKARTAN below) for where every part stands, the latest `docs/BEDOMNING-*.md` in full, `docs/INTEGRATIONSKARTAN.md` when it
   changed or a new grepp starts, TAVLA.md's 🟡 section, DECISIONS added since last session, latest CI runs. Search
   TAVLA, STATUS and DECISIONS — don't read them whole (halved 26/9; the older half is in TAVLA-ARKIV.md and
   DECISIONS-ARKIV.md — search there too).
2. Take the top unblocked item in the bedömning (§1 NU, then its calendar) or the TAVLA card it names. Build against its
   *Verify* line. (BACKLOG.md avvecklad 26/9, kort #221 — kön bor i bedömningen och på tavlan.)
3. Prove it: tests/CI/logs — never claim done without evidence.
4. Commit with a message explaining what + why. Update the bedömning (läget överst,
   §4.2) and TAVLA; a session-log line in STATUS.md. Log decisions in DECISIONS.md. Stäm av mot de sju
   stomdokumenten och för in rättelserna där i samma varv (STOMREGELN). Run the card review (`scripts/kortkartan.ts
   --genomgang`) and close every card whose Verify is met, in the same commit (TAVELREGELN 5).
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
5. **Kortgenomgången (Bengts krav 3/10, DECISIONS #451) — ett krav, som kartan och artefakterna:** varje varv avslutas, och varje
   kartsynk körs, med `node --experimental-strip-types scripts/kortkartan.ts --genomgang`, som listar varje öppet kort med dess
   Verify-rad och "Kvar". Vart och ett prövas mot beviset: ett kort vars Verify är uppfylld med ett bevis som går att följa flyttas
   till 🟢 med beviset på raden **i samma commit** (kortkartan.json och delens `kort` i projektkartan.json följer med), och ett kort
   utan Verify-rad får en. Kortvakten i CI (#449) fäller det kartan själv vet; genomgången tar resten.
Tavlan är människolagret; bedömningen, STATUS och DECISIONS är djuplagren.

## STOMREGELN (Bengts order 2026-10-01 — sju stomdokument, DECISIONS #415, #425, #445)
Sju dokument är Bengts facit och kontrollpunkter för var vi är, och stommen för det fortsatta bygget:
1. *Halkvaktens mätningar* — artefakt https://claude.ai/artifact/RVrWtvUGPfc88aFUbcYREc, källa `docs/MATNINGAR.html`
2. *Halkvaktens app* — https://claude.ai/artifact/FThC1PqVqEMqWxofrCv1GT, källa `docs/APPEN.html`
3. *Halkvaktens systembild* — https://claude.ai/artifact/6hHX4LeXQUrJSbaNthNY9i, källa `docs/SYSTEMBILDEN.html`
4. Bedömningen — den senaste `docs/BEDOMNING-*.md`
5. Integrationskartan — `docs/INTEGRATIONSKARTAN.md`
6. *Halkvaktens kuvös* — https://claude.ai/artifact/1xvv4hydYbfpF5eXFgLcxh, källa `docs/KUVOSEN.html` (tillagd 1/10 på Bengts order, DECISIONS #425)
7. *Halkvaktens favoriter* — https://claude.ai/artifact/EJYcQFCyKYd9BgGcYkCMyT, källa `docs/FAVORITER.html` (tillagd 3/10 på Bengts order, DECISIONS #445)
Varje ändring, tillägg och komplettering STÄMS AV mot de sju innan varvet avslutas, och rättelser, ändringar och avbockningar
redovisas i dem löpande, i samma varv som de görs — aldrig i efterhand. Artefakterna ändras i repokopian (källan) och republiceras
till samma URL i samma commit; en artefakt som skiljer sig från sin repokopia är ett fel. Kartans frysregel gäller fortfarande
dess INNEHÅLL (ändras efter bygge och mätning), men dess läge-rader (§2, §6.1, §8, §13.6, §14) hålls aktuella. Det är ett
arbetsmoment som alltid står fast. Kontroll före sessionens slut: `git log -1 --format=%ad -- <fil>` på de sju är inte äldre än
det senaste beslut som rör dem.
**KORTKARTAN (Bengts order 3/10, DECISIONS #445).** Varje öppet kort på tavlan hör till ett eller flera avsnitt i stomdokumenten,
och varje stomdokument visar sina öppna kort under rubriken *Öppna kort*. Kopplingen bor på ETT ställe, `docs/kortkartan.json`;
listorna skrivs av `node --experimental-strip-types scripts/kortkartan.ts` och ändras aldrig för hand. Ett nytt kort, ett stängt kort
eller en ny rubrik på ett kort ⇒ kortkartan.json, skriptet och republiceringen av de berörda artefakterna i SAMMA commit som
tavlan. `--check` (i ci.yml, och i md-vakt.yml för commits som bara ändrar .md) fäller på okopplade kort, kopplingar till stängda kort, okända avsnitt och listor som inte är aktuella.

## PROJEKTKARTAN (Bengts ja 2026-10-03 — navet över bygget, DECISIONS #446)
*Halkvaktens projektkarta* — https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8, källa `docs/PROJEKTKARTAN.html`, skriven ur `docs/projektkartan.json` av
`node --experimental-strip-types scripts/projektkartan.ts` (ändras aldrig för hand). Den är navet OVANFÖR de sju stomdokumenten:
varje del av projektet med block, läge, bevis eller nyckel, vad som saknas, beroenden, kort, beslut och var delen beskrivs.
- **Kartan äger LÄGET per del** och är vägen in i bygget. Den är **underordnad BEVISET**: grönt kräver ett bevis som går att följa
  (commit, grön körning, mätning efter driftsättning, beslut), blått en nyckel, orange och rött en lista över vad som saknas. Säger
  koden eller ett prov något annat är kartan fel, inte koden. Besluten stannar i DECISIONS, ordningen och kalendern i bedömningen,
  arbetet på tavlan och reglerna i tröskeldokumenten.
- **Samma commit:** byggs, mäts, stängs eller öppnas något ⇒ delens rad i projektkartan.json, skriptet och republiceringen till samma
  URL i SAMMA commit som ändringen. Ett nytt kort ska hänga på en del. `--check` i ci.yml (och i md-vakt.yml för commits som bara ändrar .md) fäller en del som bär ett öppet kort fast den är grön eller dess Verify-steg är klart (kortvakten, DECISIONS #449), grönt utan bevis, blått utan nyckel,
  orange och rött utan lista, okända beroenden och avsnitt, öppna kort utan del och en sida som inte är aktuell.
- **Mätt mot koden 3/10** (kort #286): varje del har byggsteg med bevis, och procenten räknas ur stegen, viktad 1–3. En ny del får byggsteg
  från början; ett steg är klart bara med bevis.
- **Lägesraderna i stomdokumenten skrivs ur kartan** (Bengts val (a) 3/10): under varje avsnitt som beskriver delar står de med färg,
  procent och vad som återstår, och i html går varje rad att fälla ut till delens byggsteg. Raderna skrivs av projektkartan.ts mellan
  markörerna `LÄGESRADER` och ändras aldrig för hand; handskrivna lägesrader förs inte. Läget ändras i projektkartan.json, och
  `--check` fäller en sida vars rader inte är aktuella.
- **Kartsynken (Bengts ja 3/10, DECISIONS #447) — allt arbete bokförs i kartan**, Bengts och Axels, i vilken session eller på
  vilken enhet det än görs. `node --experimental-strip-types scripts/kartsynk.ts` är FÖRSTA steget i varje session. (Schemat
  morgon och kväll i Claude-appen är avstängt sedan 6/10: två körningar hängde på sitt första kommando; Bengts ord.) (1) *Maskinvägen:* steg med `regel` bockas ur
  byggsignalerna (edge function `byggsignaler` varje timme → tabellen `byggsignaler` → ärendet *📡 Byggsignaler*), bara framåt och
  med signalens tidpunkt som bevis; `kvar` är delens saknas-rader som stryks när steget blir klart. (2) *Bokföringsvägen:*
  skriptet listar varje commit på main sedan `synk.till` som inte rörde kartan (utom Marknadsmotorns, trv-bevakningens och
  kartsynkens egna). Sessionen bokför var och en på sin del — steget och kort sha som bevis — eller konstaterar att den inte rör
  någon del, och kör sedan `--bokford`. Grenen heter `kartsynk/<datum>`, PR-rubriken börjar med "Kartsynk:", och en gren där
  `--tillatna` är grön (den rör bara kartan och det kartan skriver) slås ihop på grön CI på exakt huvudet utan "slå ihop" och
  republiceras; allt annat väntar på Bengts ord. Regeln *samma commit* ovan gäller fortfarande — kartsynken är nätet under den.
  En session utan GitHub-API (webben, mobilen) gör bokföringsvägen; signalerna tar nästa session som når dem. Kartsynken listar
  också **öppna PR:er** (6/10): en PR som väntar lyfts i rapporten till Bengt, och kartgrenar slås ihop av sessionen, aldrig av CI.

## DOKUMENTSYNKEN (Bengts ja 2026-10-07 — styrdokumenten stäms av varje dygn, DECISIONS #484, kort #304)
Genomgången 7/10 (DECISIONS #483) behövde ett sjuttiotal rättelser i handtexten, fast kartan visade stomdokumenten gröna: CI
prövade bara det skripten skriver, och regeln *samma varv* hängde på minnet. Tre delar håller nu dokumenten i fas, för alla
sessioner på alla enheter:
- **Stomvakten (CI).** Varje nytt beslut slutar med `**Stomdokument:** MAT, SYS` (koderna ur `docs/kortkartan.json`: MAT APP SYS
  BED KAR KUV FAV; text efter koden är fri, t.ex. `BED §4.2`) eller `**Stomdokument:** inga — skälet`. `scripts/stomvakten.ts --bas
  <sha>` i md-vakt.yml fäller ett nytt beslut utan raden, ett *inga* utan skäl, en okänd kod och ett namngivet dokument vars
  handtext — sidan utan lägesrader och kortlistor — är oförändrad i samma push eller PR. Gamla beslut prövas inte.
  `stomvakten.ts --lage` visar varje dokuments senaste handtextändring och besluten sedan dess; den ersätter inte läsningen.
- **Morgonrutinen** — claude.ai-rutinen *Halkvakt: dokumentsynken varje morgon* (`trig_015zMNvnicaHT1wFNk4ZWdaH`), kl. 03:30 UTC
  (05:30 sommartid, 04:30 vintertid), i molnet och inte bunden till någon dator. Den gör stegen nedan.
- **Väntar på Bengt / Väntar på Axel** överst i projektkartan, skrivna av `projektkartan.ts` ur tavlans avsnitt för Bengt och Axel
  (kortets *Kvar*, annars dess nyckel) och kartsynkens lista över öppna PR:er (`synk.prar`). Ändras aldrig för hand.

**Dokumentsynken, steg för steg** (rutinen varje morgon, eller en session som gör den för hand):
1. `git fetch origin`; gren `claude/dokumentsynk-<ÅÅÅÅ-MM-DD>` från origin/main.
2. Kartsynken (PROJEKTKARTAN ovan): bokför varje obokförd commit på sin del, och läs varje maskinbock mot beviset innan den får
   stå — 7/10 bockade regeln `inlamnad:0.3.9` en inlämning som App Review avvisat. Sedan `--bokford`.
3. Kortgenomgången (TAVELREGELN 5): `kortkartan.ts --genomgang`; stäng varje kort vars Verify är uppfylld, med beviset.
4. Stomgenomgången: `stomvakten.ts --lage`. Läs allt som hänt sedan förra dokumentsynken — commits på main från alla författare,
   nya beslut, nya STATUS-rader, sammanslagna och öppna PR:er — och rätta handtexten i de sju, `docs/KALENDERN.md` och TAVLA.md
   där den inte längre stämmer. Integrationskartans innehåll är fryst: bara dess läge-rader; en innehållsrättelse blir en fråga i
   bedömningens §4.2. Ett tal förs bara in om det står i källan (DECISIONS, STATUS, koden, en körning) — aldrig ur minnet.
5. `projektkartan.ts` och `kortkartan.ts`, sedan `--check` på båda, `kartsynk.ts --check` och `stomvakten.ts --tillatna`.
6. En rad i STATUS.md: *Dokumentsynk <datum>:* vad som rättades per dokument, eller *inget att stämma av* — en tyst morgon ska inte
   se ut som en lyckad — och *Att republicera:* med de artefakter vars källa ändrades.
7. Commit (märk den aldrig så att CI hoppas över), push, PR med rubriken *Dokumentsynk: <datum>*. Är ci och md-vakt gröna på exakt
   huvudet och `--tillatna` grön slår rutinen ihop själv (Bengts val (d), DECISIONS #484); annars väntar PR:en på Bengts ord och
   står i rapporten.
8. Republicera de artefakter vars källa ändrades, till sina adresser. Når rutinen inte artefakterna gör dagens första session det
   (sessionsprotokollet steg 1).
Rutinen fattar inga beslut, ändrar inga trösklar, rör ingen kod och inga hemligheter och kör inga flöden. Det som kräver ett
beslut skrivs som en fråga i §4.2 och står i rapporten.

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
- **HTTP 200 är ingen katalog.** Vegvesens DATEX-server svarar 200 på `pulldeltadata`, `pullhistoricdata`,
  `pullhistorydata` OCH `pullarchivedata` — men varje svar bär `<pullSnapshotDataOutput>`: servern struntar i sökvägen
  och lämnar samma ögonblicksbild. Fyra 200 som ser ut som fyra historiska ingångar och är noll. Ett 404 hade varit
  ärligare. Värre: rekognoseringsskriptet räknade `r.ok` som "svar" och redovisade sex lästa svar med grönt jobb, fast
  fyra var samma snapshot i förklädnad (27/9, kort #232). Regel: en sond som provar kandidat-ändpunkter räknar på
  SVARETS ROTELEMENT eller en annan innehållsmarkör, aldrig på statuskoden — och skriver ut markören den räknade på.
  Samma familj som `shadow_log.suppressed`: att något svarar bevisar inte att det bär något.
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
  *(Not 21/9, DECISIONS #294: adressen STÅR i Trafikverkets egna katalogposter på trafficdata.se (`contact_email`) — men den
  TAR INTE EMOT POST: Bengts mejl 17/9 08:12 studsade med "Adressen hittades inte". Samma dag, 21/9, gavs den ändå till Bengt en
  gång till, nu "läst på källan". Skärpt regel: att en adress STÅR på en källsida bevisar inte att den FUNGERAR. Sök i repot
  och fråga mottagaren av förra utskicket om adressen har prövats, innan den ges vidare. Formulär går före e-post hos
  Trafikverket — deras kontaktsida har inga adresser alls.)*
- `[skip ci]` verkar på HELA commit-meddelandet, inte bara rubriken. 21/9 fick mätskriptets PR (#428) ingen körning
  alls på nio minuter: kroppen sa *"Egen commit utan [skip ci]: den bär kod"*, och GitHub läste märket i meningen som
  förnekade det. Regel: skriv aldrig märket i ett meddelande som ska testas, inte ens för att säga att det saknas — och
  kontrollera direkt efter push att en körning har startat (`/actions/runs?head_sha=`) innan du väntar på den.
- `[skip ci]` på PR:ens SISTA commit stoppar också PR:ens CI. 1/10 öppnades PR #652 med 38 commits, nio av dem kod, och fick
  ingen körning alls: huvudcommiten var en dokumentsynk märkt `[skip ci]`, och GitHub läser märket på PR:ens head, inte på
  paketet. `mergeable_state: clean` såg ut som grönt — det betyder bara "inga konflikter". Regel: commiten närmast före en PR
  (eller en push som ska pröva en PR) bär aldrig märket; och en PR utan check runs är inte grön, den är oprövad.
- En grind som LÅNAR en annan grinds trösklar måste låna dess VAKTER också. 23/9 föll vägpunktsgrinden på alla tre kandidater
  (A2 9–18 %, 7–15 km-bandet 25 % grova fel) och domen var färdig att bokföras — men höjdprovet läste arkivet utan #75, radvakten
  och karantänen, som grind A bär sedan 22/9 (DECISIONS #299 räknade upp nio mätningar; höjdprovet stod inte med). Med vakterna:
  0,71 °C och 3,8 %, grinden ÖPPEN (DECISIONS #324). Vakterna tar under två procent av raderna och bar hela skillnaden. Regel: när
  en mätning lyfts från diagnos till grind, kopiera hela WHERE-satsen från grinden den speglar, inte bara talen. Kontraktsgrinden
  vaktar talen; ingen vakt ser populationen. Och en dom som ser förkrossande ut på första körningen är ett skäl att läsa
  populationen, inte att skriva DECISIONS.
- Intervallaritmetik på `timestamptz` räknas i SESSIONENS tidszon. `sample_time - interval '7 days'` är 167 timmar i Europe/Stockholm
  över sommartiden och 168 i UTC — kuvösens karantän gav 20 rader olika mellan en lokal databas och Actions (2/10, DECISIONS #439).
  Regel: varje anslutning som räknar på arkivet sätter `SET TimeZone = 'UTC'`, som Supabase; lita inte på klustrets standard.
- En kortrubrik är en ögonblicksbild, inte ett läge. Målbladets första utgåva 29/9 tog #219:s rubrik från 20/9 ("Android sju versioner
  efter, Play-kontot saknas") som sanning — nio dagar efter att koden (versionCode 18 = iOS), tre beslut (#346, #377, #379) och appsidan
  28/9 motbevisat den; samma varv togs "kalendern är Bengts öppna beslut" ur §6.3 fast #381 hade avgjort det två dagar tidigare. Regel:
  ett dokument som ska frysas läses mot koden och besluten SEDAN kortet skrevs, inte mot rubriken; och en rubrik som verkligheten
  motbevisat får *↪ överspelad* med datum och bevis samma varv (TAVELREGELN 3), så nästa läsare inte går i samma fälla (DECISIONS #402).
- En `git worktree add` som misslyckas tyst gör nästa kommando farligt. 3/10 fällde scratchpad-sökvägen worktreen med *Filename too long*
  (Windows gräns på 260 tecken; appens bilder i `Assets.xcassets` är djupast), felet doldes av `2>$null`, `Set-Location` föll, och grenbytet
  och kartsynken kördes i Bengts arbetsträd i stället — en ocommittad ändring följde med till fel gren. Inget hann pushas. Regel: worktrees
  på Windows läggs på kort sökväg (`%TEMP%\hvks-<tid>`, `git -c core.longpaths=true worktree add`), git körs med `-C <worktree>`, och ett
  steg som resten bygger på får aldrig få sitt stderr dolt — misslyckas det, stannar kedjan.
