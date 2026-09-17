# GREPP 3 — arkiven till mars (kort #83 steg 2)

**Status:** 🔨 **BESLUTSUNDERLAG 2026-09-17**, skrivet av Claude på Bengts order *"kör grepp 3"*. Besluten är Bengts och
Axels (bedömningen §4.2). En betald tjänst kräver en DECISIONS-post som Axel godkänt (CLAUDE.md, gratisnivåregeln).

---

## 1. Varför det brådskar

| Sak | Källa |
| :-- | :-- |
| **Domarna räknas ur arkiven** sedan 17/9 — väderarkivet, radararkivet och trend-tabellen måste gå att fråga till mars | DECISIONS #226 |
| **Gratisnivån skrivskyddar databasen vid 500 MB.** Då kan ingen rad skrivas — ingest-live stannar och appen visar gammal data. Organisationen kan dessutom få 402-svar | Supabase-dokumentationen, läst 17/9 |
| **Gratisnivån har inga backuper.** Hela arkivet som domarna vilar på finns i ett enda exemplar | Supabases prissida, läst 17/9 |
| **Ingen vakt larmar på databasens storlek.** `pg_database_size` används inte i någon funktion eller något skript | sökt i koden 17/9 |

---

## 2. Mätt 17/9

Mätfrågorna: `scripts/matningar/grepp3-databasen-2026-09-17.sql` (dbknapp-körningar 35220139396 och 35220310144).

| Mått | Värde |
| :-- | :-- |
| Databasen | **168 MB** 12:16Z (92 MB 9/9 enligt Axels mätning, 165 MB 17/9 04:4xZ) |
| Brutto tillväxt | **cirka 9 MB/dygn** i en mild september, gallringen i gång |
| `public.weather_observations` | 71 MB · ~324 000 rader · 20 700 rader/dygn senaste veckan (15/9: 45 300 — regn) · 54 500 döda rader, autovacuum senast 15/9 |
| `fi.weather_observations` | 21 MB · 8 300 rader/dygn · **gallras inte** · en rad daterad 1970-01-01 |
| `no.weather_observations` | 13 MB · 6 600 rader/dygn · **gallras inte** |
| `cron.job_run_details` | **18 MB** · 1 800 rader/dygn från 18 jobb sedan 25/8 · **rensas aldrig** |
| `trend_kandidater` | 2,1 MB · 880 rader/dygn senaste veckan (230 veckan före) |
| `radar_precip` | 4,4 MB · 2 200 rader/dygn |
| Gallringsjobbet 03:15 | lyckades 15, 16 och 17/9 |

---

## 3. Prognos — uppskattning, inte mätning

**September–oktober:** fortsätter bruttotakten (~9 MB/dygn) nås 500 MB om **cirka 37 dygn — runt 24 oktober, före
vintern.** Nettotakten är okänd: gallringen raderar, och autovacuum återanvänder platsen först efter att ha körts. Den
kan därför vara betydligt lägre. **En ny mätning 24/9 avgör.**

**Vintern (november–mars):** när alla stationer ligger under +5 °C upphävs arkivdieten (#4).

| Del | Uppskattning | Grund |
| :-- | :-- | :-- |
| Sista veckan i full upplösning (svensk väderdata) | **160–255 MB**, en gång | 848 stationer × 144–233 rader/dygn × 7 dygn × ~185 B (kort #83) |
| Gallrad svensk historik | ~7,5 MB/dygn | 848 × 48 rader/dygn (sql/014) |
| Finland och Norge, ogallrade | ~7–10 MB/dygn | septembertakten × 2–3, osäker |
| Trend-tabellen | ~2,5 MB/dygn | septembertakten × 10, osäker |
| pg_crons logg | ~0,8 MB/dygn | mätt |
| Radar | ~0,3 MB/dygn | mätt |
| **Summa** | **~18–21 MB/dygn + bufferten** | **november–mars ≈ 3 GB** |

**Ingen gratisvariant rymmer vintern i databasen.** Gallringen av den svenska historiken ensam (7,5 MB/dygn × 150 dygn)
är över 1 GB.

---

## 4. Vägar

| Väg | Vad | Kostnad | Tid | Risk | Domarna |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **2b Supabase Pro** | 8 GB databas, dagliga backuper (7 dygn), funktioner får köra 400 s i stället för 150 s | 25 USD/mån (Micro-datorn ingår via 10 USD i krediter) — november–mars ≈ 125 USD | minuter | låg | arkivet frågas som i dag |
| **2a Rullande export** | äldre rader som komprimerade filer till Supabase Storage (1 GB gratis), sedan DELETE | 0 kr | 2–3 dagars bygge + drift | **hög:** fallerar exporten skrivskyddas databasen och appen stannar | varje dom kräver att filerna läses in igen i en PostGIS i Actions — kostar byggminuter när kassan redan är nära taket (#210) |
| **2d Minska** | rensa pg_crons logg · gallra Finland och Norge · rätta 1970-raden | 0 kr | timmar | låg | orörda |
| **2e Andra gratisprojektet** | arkivtabellerna i ett eget projekt | 0 kr | dagar | hög | frågor över båda projekten går inte — allt måste flyttas |

**2d räcker inte ensam** men köper tid och behövs oavsett väg. **2a** var kortets rekommendation 9/9, när domarna läste
små veckoutfall — sedan #226 läser de rådata över månader, och exporten blir då ett andra system att hålla vid liv.

---

## 5. Rekommendation

1. **Nu, gratis (Bengts ja):** tre småbyggen — en **databasvakt** i vakthunden som larmar vid 400 MB (80 %),
   **rensning av pg_crons logg** äldre än 7 dygn i gallringsjobbet, och **gallring av Finland och Norge** med samma regel
   som den svenska. Inget av dem rör domarna.
2. **Beslut (Bengt + Axel):** **Supabase Pro senast när databasen passerar 400 MB eller 1 november**, det som kommer
   först. Cirka 25 USD/mån. Skälen: arkivet ryms till mars, backuper finns, och tiden läggs på motorregeln (S3) i stället
   för på ett exportsystem.
3. **Mätning 24/9 (Claude):** databasens storlek igen — nettotakten avgör om 400 MB nås i oktober.
4. **Efter mars-domen:** exportera arkivet till fil en gång och gå tillbaka till gratisnivån om ni vill. Nedgradering
   kräver att databasen är under 500 MB.

---

## 6. Inte avgjort

- Nettotakten efter autovacuum (mäts 24/9).
- Hur mycket Finland, Norge och trend-tabellen växer i vinter.
- Växelkursen — kronbeloppen är inte räknade.

*Källor: TAVLA kort #83; DECISIONS #87, #223–#226; sql/014_gallring.sql; Supabase prissida och dokumentation
(databasstorlek, funktionsgränser), lästa 2026-09-17.*
