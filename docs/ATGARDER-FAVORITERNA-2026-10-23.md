# Åtgärdslistan för block 7, Favoriterna

**Varför:** genomgången av blocket Favoriterna 23/10 (läs-only, två hjälpagenter, förklarad i chatten) och omgång 1 samma dag
(DECISIONS #686). Bengt 23/10: *"Ja, lägg fram besluten för Favoriterna som en omgång"*.

**Reglerna** är desamma som i `docs/ATGARDER-MOTORN-2026-10-21.md`, `docs/ATGARDER-APPEN-2026-10-22.md` och
`docs/ATGARDER-FORARNA-2026-10-23.md`:
- Numren byts aldrig och återanvänds aldrig.
- En rad stängs av en PR, ett beslut eller ett uttryckligt bortval.
- Status: `öppen` · `pågår` · `klar` · `bortvald`.

## A. Beslut (omgång 1, 23/10)

| Nr | Fråga | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B7-01 | Trafiken mot hinken: #617 kräver att den är mätt innan butiksversionen läser rapportfilen, och (33) är den versionen | **klar** — cirka 173 kB per koll; Pro-planens 250 GB okachad trafik räcker till ungefär 4 800 användare med tio kollar om dagen, och kachad trafik har en egen kvot | #687 |
| B7-02 | Favoriterna ligger i mätvakten, som aldrig färgar vakthunden röd | öppen — *"Driftlarm vid släppet"*: till driftlarmet när (33) släpps, med den långa delens sha256; fristen `favoriter-driftlarm` 15/11; Claude skriver koden, Bengt deployar | |
| B7-03 | Vad räknas som Nytt i fliken? | **klar** — *"Som det är byggt"* (#639): allt utom kamerorna och restiderna i normal trafik; FAV §11 rättas av morgonsynken | #686 |
| B7-04 | App Store-texten lovar "köer åt ditt håll" | **klar** — *"där Trafikverket mäter dem"*, rättat i `appstore-ios.md` | #686 |
| B7-05 | Rapporten visar bara lägesfilens tid, aldrig rapportfilens | **byggd** — *"Visa tiden"*: *Rapporten från HH:MM* under *Läget från* i båda apparna (`RapportView.swift`, `RapportSkarm.kt`), PR #1279 (5964dff4), Bengt 30/10: *"Ja, bygg dem"*; 0.3.14 (36) uppladdat till TestFlight 30/10 (körning 41026622176); kvar: prov på telefon | |
| B7-06 | iPhone slår ihop starter inom 3 h till samma resa, Android börjar en ny vid varje start | **klar** — *"Låt stå, skriv ut"*: i betaguiderna i samma PR, i FAV §6 av morgonsynken | #686 |
| B7-07 | Granskaren ser inte favoriterna utan en körning på 1 km | pågår — *"Bifoga en inspelning"*: meningen i granskningsanteckningen och steg 2 i `appstore-ios.md` klara; Bengt spelar in fliken och rapporten på (33) | |
| B7-08 | Den långa delen skrevs om i 140 av 144 körningar 22–23/10 | **klar** — verkliga ändringar: 10–11 nya och 3 borttagna linjer per körning (vägarbeten som börjar och slutar), identisk ordning | #687 |

## B. Rättelser (samma PR som besluten)

| Nr | Var | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B7-09 | PK f-underlaget | #614 saknades i `beslut` | **klar** — rättat 23/10 | PR omgång 1, #686 |
| B7-10 | PK f-rapportfil | Saknas-raderna (gratisnivåns 5 GB, "Axels form") var gamla, de verkliga luckorna stod inte. Steget *Marginalen* bevisades bara med favoritprovet 12–13/10 | **klar** — luckorna B7-01, B7-02 och B7-08; steget klart med funktionens egen historik; #617, #641, #644 och #686 i `beslut` | PR omgång 1, #686 |
| B7-11 | PK f-fliken | Provet stod på (32); #679 och besluten saknades | **klar** — rättat 23/10 | PR omgång 1, #686 |
| B7-12 | PK f-spara | "Radering" och "frågan som egen rad" stod som saknade, fast de byggdes i steg 2 (3e47b62a, 25236324); FavoriterTest har tio fall, inte åtta | **klar** — steget *Byggt i appen* klart | PR omgång 1, #686 |
| B7-13 | PK f-tider | Ingen av apparna har schemaläggning; provsteget bar Bengts prov av version ett | **klar** — provsteget står som saknas | PR omgång 1, #686 |
| B7-14 | PK, vakthundens rader | `vakthund/index.ts:513-533, :557-562` hade flyttat | **klar** — `:520-540, :564-569` | PR omgång 1, #686 |
| B7-15 | TAVLA kort #357 | "(32)" och "byte i UTF-8 … väntar på deploy": a282b85 ingår i b095128, deployad 18/10 | **klar** — not 23/10 på kortet | PR omgång 1, #686 |
| B7-16 | `marknadsforing/butik/appstore-ios.md` | Inskicksstegen sade bygge 32, fast (33) skickas in (#681) | **klar** — stegen säger (33), läget 23/10 överst | PR omgång 1, #686 |
| B7-17 | `docs/PRODUKTBOK.md` | (33) saknades i versionstabellen, betaraden och App Store-versionens integritetsrad saknades, "targetSdk 35" var gammalt | **klar** — rättat 23/10 | PR omgång 1, #686 |
| B7-18 | `docs/BETAGUIDE-IOS.md`, `docs/BETAGUIDE-ANDROID.md` | "Två flikar" (tre sedan (30)), inget om Favoriter; Android-guiden saknade avsnittet om (33) (B6-32) | **klar** — rättat 23/10 | PR omgång 1, #686 |

## C. Handtext i FAV (morgonsynken, #522)

| Nr | Var | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B7-19 | FAV inledningen, §1–§7, §11 och §12: listan i DECISIONS #686 | öppen — morgonens dokumentsynk | |

## D. Prov och byggen

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B7-20 | Proven av favoriterna på (33), iPhone: spara, samma väg tillbaka (helst längre än 2 km), *Nytt sedan …*, *Ta bort* och *Ta bort alla*, brytaren av, statusfältet, ingen rad *(beta)* med Betatest av | Bengt | öppen | |
| B7-21 | Det första provet av favoriterna på en riktig Android | Axel | öppen | |
| B7-22 | Hoppet över kandidaten (#577) prövas bara i TS (`test/rutfilter.test.ts`), inte i det delade facit `langsrutten.json` | Claude | öppen | |
| B7-23 | Tyst utarmning: saknas en objekttyp i Trafikverkets svar skrivs filen ändå som lyckad, och vakten prövar inte antalet poster (hör till B7-02) | Claude | öppen | |
| B7-24 | Förra kollen flyttas fram också när hämtningen misslyckats (`RapportView.swift`, `RapportSkarm.kt`) | Claude | **byggd** — förra kollen sparas bara när `gickInte` är falsk, båda apparna, PR #1279 (5964dff4). Kvar som det är: faller telefonen tyst tillbaka på sparade filer räknas det som lyckat, och förra kollen flyttas fram till de rader som visades | |
| B7-25 | Rader som åldersgränsen döljer kommer inte med i förra kollen och kan visas som Nytt när filen blir färsk igen (slutsats, inte provad) | Claude | öppen | |
| B7-26 | iPhone: rapportens hämtning av lägesfilen gör inget nytt försök när kontrollsumman inte stämmer, till skillnad från vaktens. **Omskriven 30/10:** sedan fas 2 (#741) går rapporten och vakten genom samma hämtning (`SnapshotRepo.koll`), och vid fel kontrollsumma gäller den sparade filen för båda, med avsikt. Kvar är bara att vakten gör ett nytt försök när nätet faller (`loadSnapshot`) och rapporten inte gör det; att dra nedåt gör samma sak | Claude | öppen, liten | |
| B7-27 | `publish/rapport-core.ts:10–11` och `:31–32` säger emot varandra om MARGINALER är appens trösklar (de är det sedan #637) | Claude | öppen | |
| B7-28 | `publish/rapport-app.ts` saknar `utanEfterhalka`, som Swift och Kotlin har; spärren prövas i apparnas prov mot facit, inte i TS | Claude | öppen | |

## E. Övrigt

| Nr | Fynd | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B7-29 | Kort #285 har två ägare: FAVORITER säger "Claude, låst", TAVLA "Axels beslut" | Claude | öppen | |
| B7-30 | 16 av 82 delar i projektkartan saknar `beslut` | Claude | öppen | |
| B7-31 | rss ges som 0 av körtiden, så minnet mäts bara som heap (fyndet i #617) | Claude | öppen | |
| B7-32 | Favoritprovet och synken: en vecka med (33), sedan beslut om de ska fortsätta | Bengt | öppen | |
| B7-33 | Tider på Android: schemaläggning och notis för det nya enligt kort #358 | Claude | öppen | |
| B7-34 | Den snabba delen byter sha256 i varje körning bara för genereringstiden, så varje koll hämtar den (#687) | Claude | öppen | |
