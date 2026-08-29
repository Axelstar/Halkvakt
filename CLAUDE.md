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
