# Skills-katalog — installerade agentfärdigheter

Skills (SKILL.md-format, agentskills.io) som varje agent-session ska läsa före app-kod.
Bakgrund: Paul Solts tråd om att agenter behöver färdighetspaket (x.com/PaulSolt/status/2042716870512353294).

## Installerade (vendorerade i `skills/`, licens medföljer per mapp)
| Skill | Källa | Licens | När den läses |
|---|---|---|---|
| `halkvakt-android` | **egen** — destillat av DECISIONS + Play-dossiern | (projektet) | ALLTID före kod i `android/` |
| `kotlin-concurrency-and-flow` | chrisbanes/skills (Chris Banes, ex-Google Android-toolkit) | Apache-2.0 | Coroutines/Flow-arbete |
| `compose-state-and-effects` | chrisbanes/skills | Apache-2.0 | Compose-UI-arbete |
| `swiftui-pro` | twostraws/SwiftUI-Agent-Skill (Paul Hudson) | MIT | Fas 3: iOS-UI |
| `swift-concurrency-pro` | twostraws/Swift-Concurrency-Agent-Skill | MIT | Fas 3: iOS async/aktörer |
| `swift-testing-pro` | twostraws/Swift-Testing-Agent-Skill | MIT | Fas 3: iOS-tester |

## Katalogförda men ej installerade (med motivering)
- **AvdLee/Xcode-Build-Optimization-Agent-Skill** (MIT): kräver körande Xcode —
  installeras på Mac:en när iOS-bygget börjar (`npx skills add https://github.com/avdlee/xcode-build-optimization-agent-skill`).
- **skydoves/compose-performance-skills**: hämtas vid behov om Compose-prestanda blir ett problem.
- **Dimillian (OpenAI app plugins)**: gäller OpenAI-appens plattform — inte relevant för Halkvakt.
- **merowing_ (Advanced Swift)**: regelfiler/arbetsflöden, inget rent skill-repo att vendora;
  omvärderas vid iOS-fasen.

## Underhåll
- Uppströmsuppdateringar hämtas manuellt vid faser (`git clone --depth 1` → kopiera om).
- Egna läxor skrivs IN i `halkvakt-android` (sektion 5) i samma commit som de lärs.
- Nya skills: uppdatera denna tabell + CLAUDE.md-regeln.
