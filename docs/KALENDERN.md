# 📅 KALENDERN — plikter som aldrig blir klara

**Beslutad 27/9 2026 av Bengt** ("ja till kalenderlistan och stäng korten"), efter bedömningens §6.3.
Se DECISIONS #381.

## Varför listan finns

Tavlan kunde inte nå noll. Bland korten låg plikter som **inte har något slutläge** — nycklar som går ut igen,
en databas som växer igen, ett månadsskifte som kommer igen. De kunde aldrig bockas av, och så länge de låg
bland korten var ambitionen *"stänga systemet när det är fullkomligt"* omöjlig av konstruktion, inte av brist
på arbete.

**Regeln som avgör var något hör hemma:**

| | Hör hemma på TAVLAN | Hör hemma HÄR |
| :-- | :-- | :-- |
| Har en *Verify*-rad som kan uppfyllas en gång | ✅ | ❌ |
| Återkommer, eller är ett datum då något ska **läsas av** | ❌ | ✅ |
| Bär en dom, ett bygge eller ett beslut | ✅ | ❌ |

**Den här listan är inte en kopia av tavlan.** Den *äger* raderna nedan; de finns inte kvar som kort. Två listor
som beskriver samma sak glider isär — det är samma läxa som vitlistan i `dbknapp` (CLAUDE.md). Ett datum som får
en dom eller ett bygge hängande på sig flyttar tillbaka till tavlan som kort.

## Plikterna

| När | Vad | Ägare | Vad som ska läsas | Konsekvens om det missas |
| :-- | :-- | :-- | :-- | :-- |
| **senast 15/11 2026** | Rotera **PAT:en** — den går ut **2026-11-22 20:55:49 UTC**. Samma nyckel bär kartrepot/publicera, vakthundens larmväg **och alla elva pulsjobb** (fingeravtryck `a0880e9a`, kontrollerat 18/9). Bytet är en knapp: tryck `pulsklocka.yml` med läget **nyckel** efter bytet i GitHub Secrets | **Axel** | nyckelkalendern (vakthundens check 10) visar nytt datum för både PAT och pulsnyckel; en publicering har gått igenom med den nya nyckeln | publicera får 401 ⇒ CDN fryser ⇒ appens åldersspärr tystnar vakten (5/9-läget). Vakthunden kan inte larma, för larmvägen använder samma nyckel |
| **senast 1/12 2026** | Rotera **Supabase-tokenen** (deploy-knappen) — går ut **8/12** | **Axel** | en deploy har gått igenom med den nya tokenen | deploy-knappen slutar fungera mitt i säsongen |
| **var sjunde dygn, nästa 29/9** | Läs **databasens storlek** ur vakthundens rad `databas: N MB av 500`. 190 MB 22/9, ~4,5 MB/dygn netto ⇒ 400 MB runt 9/11, 500 MB runt 1/12 | Claude läser | två mätpunkter minst ett dygn isär; larm vid 400 MB | gratisnivån **skrivskyddar databasen vid 500 MB** och har inga backuper. Pro-beslutet är ett kort/beslut, inte en kalenderplikt — det står i bedömningen §4.2 |
| **varje månadsskifte (1:a)** | Läs **Actions-kassan**. Två tal som mäter olika fönster: GitHubs budgetsida (styr hårdstoppet, nollställs vid månadsskiftet) och kassavaktens rad i issue #210 (räknar från den 1:a). Budgeten skapades 13/9, därför skiljer de sig i september. **Vaktens minutregel är mätt över hela september och duger:** 6 025 min mot GitHubs per-jobb-regel 5 916 — 1,8 % isär, felen tar ut varandra (android −315 min, healthcheck +152, publish-map +136) | Claude läser, **Axel äger taket** | budgetsidans *spent* mot kassavaktens tal. Avviker de kraftigt är det fönstret som skiljer, inte räkningen | slår taket i stannar ingest, grannar och healthcheck som 5/9. Livemotorn i Supabase påverkas inte |
| **19/10 2026** | GitHub byter `ubuntu-latest` till **Ubuntu 26**. Driftflödena (ingest, grannar, healthcheck, marknadsföringen) och ci kör på den etiketten | Claude läser | de första driftkörningarna efter bytet är gröna | bytet sker mitt i S3-bygget; en tyst inkompatibilitet ser ut som ett kodfel |

## Vad som INTE flyttades hit, fast det har ett datum

Dessa har en dom, ett bygge eller ett beslut hängande på sig och är därför kort, inte kalender:
**dom 1 i januari**, **kalibreringen 1/2**, **dom 2 i mars**, **kamerafacit-bilderna i mars**, **betan i november**,
**Pro-beslutet senast 1/11** (bedömningen §4.2), **steg 0 inom sju dygn efter första frostnatten** (issue #127).
