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
| **var sjunde dygn, nästa 10/10** | Läs **databasens storlek** ur vakthundens rad `databas: N MB av 500`. 190 MB 22/9 · *(läsningen 29/9 missades)* · **266 MB 3/10 (dbknapp 37135239114; 190 MB 22/9 ⇒ ~6,9 MB/dygn netto) ⇒ raderingen börjar vid 350 MB runt 15/10, vakthundens larm och Pro-gränsen 400 MB runt 22/10, 500 MB runt 6/11 utan radering** | Claude läser | två mätpunkter minst ett dygn isär; larm vid 400 MB | gratisnivån **skrivskyddar databasen vid 500 MB** och har inga backuper. Pro-beslutet är ett kort/beslut, inte en kalenderplikt — det står i bedömningen §4.2 |
| **varje månadsskifte (1:a)** | Läs **Actions-kassan**. Två tal som mäter olika fönster: GitHubs budgetsida (styr hårdstoppet, nollställs vid månadsskiftet) och kassavaktens rad i issue #210 (räknar från den 1:a). Budgeten skapades 13/9, därför skiljer de sig i september. **Vaktens minutregel är mätt över hela september och duger:** 6 025 min mot GitHubs per-jobb-regel 5 916 — 1,8 % isär, felen tar ut varandra (android −315 min, healthcheck +152, publish-map +136) | Claude läser, **Axel äger taket** | budgetsidans *spent* mot kassavaktens tal. Avviker de kraftigt är det fönstret som skiljer, inte räkningen | slår taket i stannar ingest, grannar och healthcheck som 5/9. Livemotorn i Supabase påverkas inte |
| **senast fredag 16/10 2026** (vecka 42) | Kör **kuvösens riktningsprov** (knappen `kuvos`, `korflode = riktningsprov`, kort #232). Har Trafikverket svarat om nederbördskoderna 3, 9 och −9 och de 23 stationerna, förs svaret in först; annars körs det med koderna som saknade och stationerna utanför (DECISIONS #456) | Claude, på Bengts ord | körningens tabeller: baslinjen, grind A, höjdprovet med frysflaggan och nederbördstypen | höjdläsningen 23/10 och prognoslagrets frågor (kort #270) får inget svar ur kuvösen före november |
| **19/10 2026** | GitHub byter `ubuntu-latest` till **Ubuntu 26**. Driftflödena (ingest, grannar, healthcheck, marknadsföringen) och ci kör på den etiketten | Claude läser | de första driftkörningarna efter bytet är gröna | bytet sker mitt i S3-bygget; en tyst inkompatibilitet ser ut som ett kodfel |
| **1/12, 1/1 och 1/2**, sedan första gången C1 och C2 är uppfyllda, senast vid marsdomen | **Vinterläsningen av spridningsgrinden** (kort #299, DECISIONS #478, Bengts beställning 7/10). Den 1:a i månaden: tryck `grind-s-b` i underlagsläge och läs raden *Spridningen* — täckningen med grinden är andelen täckta provpunkter i banden under 2,25 °C (0–0,5 · 0,5–1 · 1–2 · 2–2,25) av alla med spridning. Visar raden *C1 … C2 …* båda uppfyllda: tryck `grind-s-b` i domläget, som skriver grova fel per band och domen med grinden (#475). Andelar skrivs aldrig före det (#352) | Claude läser, Bengt beordrar domläget | täckningen per månad i bedömningen; grova fel per band och domen i DECISIONS; kort #299 stängs med domläget | kortet hänger kvar utan läsning, eller domen läses först i mars utan att någon sett vinterns täckning |
| **villkor, inte datum** — prövas varje gång en ny facitkälla eller en kuvösläsning bokförs | **Vägdatalagret (c): hela vägnätet som population** (kort #301; DECISIONS #473 tillägg 7/10: *"(c) först när facit finns utanför de 818"*; Bengt 7/10: *"påminner du om när det är dags att göra c"*). Blir aktuellt när **något av tre** inträffar: **(1)** facit finns utanför väglagsnätets 818 segment — plogbilar, karteringen eller fordonsdata (#298) ger ett väglag på vägar Trafikverket inte bedömer; **(2)** prognoslagret (#298) håller en kandidat på huvudvägnätet i kuvösen — småvägar före det mäter ingenting, stationerna kan inte kalibrera dem; **(3)** Bengt och Axel beslutar att småvägarna alls är med i produkten (i dag talar den bara på de 818). *Underlag 7/10 (#480):* vägar under 1 000 fordon per dygn går ungefär 0,9 °C kallare relativt vädret än vägar med 1 000–20 000, så RÅ från stationer på större vägar kan ligga för varmt där — omätt mot facit. Omfattning då, uppskattad och omätt: ≈ 98 500 km statlig väg ⇒ ≈ 49 000 punkter var 2 km mot 12 960 i dag, ≈ 8 h hämtning per säsong | **Claude lyfter**, Bengt och Axel beslutar | vid varje bokföring av en facitkälla eller en kuvösläsning: är något av villkoren uppfyllt? Då eget kort, förregistrering i DECISIONS och Bengts ja innan hämtaren får populationen | lagret byggs för vägar produkten inte talar på — eller småvägarna saknar vägdata när ett facit väl finns och mätningen väntar ett dygn på hämtaren |

## Vad som INTE flyttades hit, fast det har ett datum

Dessa har en dom, ett bygge eller ett beslut hängande på sig och är därför kort, inte kalender:
**dom 1 i januari**, **kalibreringen (i kuvösen på vintern 2024/25 — inte 1/2, ändrat 1/10, DECISIONS #425)**, **dom 2 i mars**, **kamerafacit-bilderna i mars**, **betan i november**,
**Pro-beslutet senast 1/11** (bedömningen §4.2), **steg 0 inom sju dygn efter första frostnatten** (issue #127).
