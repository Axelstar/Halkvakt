# Kartsynken — förslag: projektkartan uppdaterar sig själv (kort #288)

*Förslag 3/10 2026 på Bengts order: "det måste finnas ett automatiserat sätt att uppdatera … så att uppdateringar och ändringar som
jag eller axel gör hamnar i projektkartan med automatik". Inget är byggt. Väntar på Bengts ja (bedömningen §4.2).*

## 1. Problemet

Kartan flyttar sig bara när någon skriver in beviset i `docs/projektkartan.json`. 3/10 släppte Axel 0.3.10 (22), och kartan stod
kvar tills Bengt sa det i en session (PR #704). Det mesta som Axel och Bengt gör sker utanför repot: i Xcode och App Store Connect,
med telefonen i bilen, i TestFlight-gruppen. Regeln "samma commit" täcker bara det som görs i en Claude-session.

## 2. Vad som händer, och var det redan syns

| Vad som händer | Vem | Var det syns för en maskin | Når kartan i dag |
| :-- | :-- | :-- | :-- |
| Bygge uppladdat, granskat, släppt | Axel vid Macen | App Store Connect API: `builds`, `buildBetaDetails`, `appStoreVersions` | nej |
| Bygget installerat och använt | Bengt, Axel, testarna | App Store Connect API: `GET /v1/builds/{id}/metrics/betaBuildUsages` (installCount, sessionCount, crashCount, feedbackCount; läst på Apples dokumentationssida 3/10) | nej |
| Testare i gruppen | Axel | App Store Connect API: `betaGroups` → `betaTesters` | nej |
| Förare svarar *Stämde / Stämde inte* | testarna | `driver_facit` i Supabase, med `app` och `version` (sql/022) | nej |
| Android byggt | CI | `android.yml` på main, versionCode i `build.gradle.kts` | nej |
| Kod, kort, beslut | Claude-sessioner | repot; `--check` fäller en del som pekar på ett stängt kort | delvis |
| En källa slutar leverera | driften | vakthundens checkar | nej, kartan står grön |
| Något bara ett öga ser (korten F/G/H vid en riktig olycka) | Bengt, Axel i bilen | inget, utom ett facitsvar | nej |

## 3. Lösningen

**3.1 Signalerna, i Supabase.** En edge function `byggsignaler` på pg_cron varje timme (Bengts regel 22/9: återkommande körningar i
Supabase, aldrig Actions-minuter). Den läser App Store Connect API, GitHub API (senaste körningen per flöde på main, versionerna i
`project.yml` och `build.gradle.kts`) och de egna tabellerna (`driver_facit`, vakthundens checkar). Den skriver tabellen
`byggsignaler (kalla, nyckel, varde jsonb, forst_sedd, senast_sedd)`. Första gången något syns får det sin tidpunkt, och den är beviset.

**3.2 Reglerna, i projektkartan.json.** Ett byggsteg kan få en `regel`. Steg utan regel fungerar som i dag.

| Regel | Steget blir klart när | Bevisraden som skrivs |
| :-- | :-- | :-- |
| `{"ios": "uppladdad", "fran": 22}` | ett bygge ≥ (22) är behandlat i App Store Connect | "(22) uppladdad 3/10 14:05 (App Store Connect)" |
| `{"ios": "installerad", "fran": 22}` | (22) har minst en installation och en session | "(22) på 2 telefoner, 5 sessioner (TestFlight)" |
| `{"ios": "extern", "fran": 22}` | (22) är i testning i den externa gruppen | "(22) i Kompisarna 4/10" |
| `{"app_store": "släppt"}` | versionen är READY_FOR_SALE | "0.3.9 släppt 6/10 (App Store Connect)" |
| `{"testare": 12}` | gruppen har minst tolv testare | "12 testare i Kompisarna 8/10" |
| `{"android": "bygge", "fran": 22}` | `android.yml` är grön på main med versionCode ≥ 22 | "versionCode 22, körning 37044258124" |
| `{"facit": "olycka", "fran": 22}` | ett förarsvar på en olycksvarning från (22) eller senare | "svar på en olycksvarning i (22) 12/10" |
| `{"vakt": "<check>"}` | ingen larm: steget faller tillbaka till *pågår* när vakthunden larmar | "vakthunden larmar sedan 4/10 03:10" |

Ett regelsteg bär sin egen *saknas*-text. Texten står i delens lista tills steget är klart. Delens färg räknas ur stegen: när alla
är klara blir delen grön. Kontrollen `--check` fäller en okänd regel.

**3.3 Uppdateringen: kartsynken.** En schemalagd uppgift i Claude-appen på Bengts dator, morgon och kväll. Kartsynken körs också som
första steg i varje session. `scripts/kartsynk.ts` läser signalerna, tillämpar reglerna och skriver om kartan och lägesraderna. Om
inget har ändrats händer inget. Om något har ändrats blir det gren, commit, CI, sammanslagning, republicering av de berörda
artefakterna och en rad i STATUS. Det måste vara Claude som gör uppdateringen, eftersom bara en Claude-session kan republicera
artefakterna.

**3.4 Kvittera i kartan (valfritt, prövas först).** Det bara ett öga ser kan kvitteras med en knapp på steget i kartan, till exempel
*Jag har sett det*. Det förutsätter att artefakternas databas och inloggade läsare finns för kontot. Kartsynken bokför då
"kvitterat av Axel 4/10 08:12 i kartan".

## 4. Vad det hade gjort 3/10

Axel laddar upp (22). Inom en timme finns signalen i `byggsignaler`. Vid nästa kartsynk blir tre steg klara:

- *I ett iPhone-bygge* för iPhone-appen;
- samma steg för rösten och varningskorten;
- *I appen* för olyckorna.

När Axel öppnar appen blir *På telefon* klart. Ingen behöver säga något.

## 5. Vad som krävs av människor, en gång

- **Axel:** en API-nyckel i App Store Connect.
  - Den skapas under Users and Access, fliken Integrations. Sökvägen ska läsas på Apples sida när det är dags.
  - Bengt behöver tre saker: Issuer ID, Key ID och `.p8`-filen.
  - Nyckeln läggs i Supabase secrets och aldrig i repot.
  - Rollen ska vara den lägsta som kan läsa byggen och TestFlight. Den prövas i första steget.
  - Samma nyckel behövs för måndagsmätningen i `docs/MARKNADSFORING-NOLLBUDGET.md`.
- **Bengt:** ja till att kartsynkens PR:er slås ihop utan att du säger "slå ihop". Det gäller bara på tre villkor:
  - commiten rör enbart `projektkartan.json`, de genererade sidorna och LÄGESRADER-blocken;
  - CI är grön på exakt det huvudet;
  - beslutet skrivs i DECISIONS.
- **Bengt:** ja till schemat i Claude-appen.
  - Datorn måste vara på för att kartan ska uppdateras.
  - Signalerna samlas ändå i Supabase, så inget går förlorat. Det blir bara försenat till nästa körning eller session.

## 6. Kostnad och tid

- **Supabase:** cirka 720 anrop i månaden, inom gratisnivån. App Store Connect API kostar inget.
- **Actions:** CI körs bara när kartan har ändrats, några gånger i veckan.
- **Bygget, 2–3 arbetsdagar:**
  - signalerna, cirka en dag;
  - reglerna och kartsynken, cirka en dag;
  - schemat och provet mot (22), en halv dag.

## 7. Det som valdes bort

- **GitHub Actions på schema.** Det strider mot Bengts regel 22/9, och Actions kan inte republicera artefakterna.
- **En krok på Axels Mac efter uppladdningen.** Den kräver inställningar där, och missar både Apples granskning och installationerna.
- **En artefakt som läser live-data.** Artefakter får inte hämta från andra värdar.

## 8. Vad det inte löser

- **Beslut och domar** fattas i sessioner och skrivs där, som i dag.
- **Fältobservationer utan system** nås bara genom ett facitsvar eller en kvittens (3.4).
- **Play.** Kontot finns inte än. Samma mönster gäller med Play Developer API när det finns.
- **Täckningen.** I första versionen får 20–30 av kartans 415 aktiva steg en regel. Men det är just de steg som ändras utanför repot.
  Driftens cirka 70 steg (hämtning, arkiv, vakter) kan få vaktregler i ett andra varv.
