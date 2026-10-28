# Kedjans takt: från kandidaten till appen, och hur den kan snabbas upp

*Skriven 28/10 2026 av Claude på Bengts frågor samma dag (hur kandidatens varningar når appen, hur lång fördröjningen är,
hur den kan snabbas upp maximalt och vad det kostar i databasutrymme). Bengt: *"jag vill att du sparar hela det här resonemanget
som en punkt och sätter 1 november som fristdag på det så vi inte glömmer bort det här"*. Fristen `kedjans-takt-1-11` i
`docs/fristerna.json`. Läst i koden, inte mätt i drift: varje tal har sin källa angiven. Inget är byggt eller ändrat.*

## 0. Slutsatsen i två meningar

Den största fördröjningen sitter i appen, inte i servern: appen hämtar lägesfilen var 30:e minut under resan, publiceringen går
var tionde minut, så en ny varning kan ta upp till ungefär 40 minuter till en förare som redan kör. Ändras appens hämtning till
varje minut krymper den längsta väntan till ungefär 12 minuter, och med publiceringen i Supabase Storage i stället för GitHub ned
mot 3–4 minuter; databasen kostar det några megabyte med fast tak, ingen tillväxt.

## 1. Så når kandidaten rösten i dag

| Steg | Vad | Takt | Källa |
| :-- | :-- | :-- | :-- |
| 1 | Kandidatens kedja (Axels Python i GitHub Actions) räknar vägytan i 12 960 vägpunkter och 754 stationer, skriver timmen i databasen | En gång i timmen | DECISIONS #556, #729 |
| 2 | Regeln `talande_regel()` avgör vilka punkter som varnar: yta ≤ 0 °C, mätt fukt (väglaget *Våt* på sträckan eller radarn senaste timmen), ingen station med yta över +2 °C inom 15 km de senaste 45 minuterna | Vid varje publicering | `sql/069_radarns_tal.sql`, `sql/070_bytet.sql` |
| 3 | `publicera` lägger de varnande punkterna under nyckeln `kandidat` i lägesfilen `live.json`, som committas till kartrepot och går ut via GitHub Pages | Var tionde minut | `publish/snapshot-core.ts`, `supabase/functions/publicera/main.ts` |
| 4 | Appen hämtar lägesfilen och jämför förarens position med punkterna; nära en punkt säger rösten *Halka (beta)* | Vid vaktens start, sedan var 30:e minut | `ios/.../GuardManager.swift` (`refreshEvery = 30 * 60`, DECISIONS #371); Android enligt kommentar där |

Bara koordinaterna för de punkter som varnar skickas, grupperade per sträcka, med timmens tid. Kandidatens tal stannar i databasen.
Är kandidatens timme äldre än två timmar eller ofullständig tiger regeln och nyckeln blir tom; är brytaren av utelämnas nyckeln.

Punktnätet är hela Trafikverkets väglagsnät: alla 818 sträckor, en punkt varannan kilometer (DECISIONS #473, #573). Nätet är en
ögonblicksbild från 7/10, avstämd mot databasen 15/10.

## 2. Fördröjningen länk för länk

| Länk | Takt i dag | Längsta väntan |
| :-- | :-- | :-- |
| Kandidaten räknar vägytan | En gång i timmen | Prognosen är timvis; att räkna oftare ger inget nytt |
| Regeln (fukt och varma stationer) | Vid varje publicering | Indatan kommer in varje minut |
| `publicera` skriver lägesfilen | Var tionde minut | 10 min |
| Lägesfilen via GitHub Pages | En commit och ett sidbygge per publicering | Omkring 1 min (inte mätt) |
| Appen hämtar under resan | Var 30:e minut | 30 min |
| **Summa** | | **Ungefär 40 min, i snitt hälften** |

Samma fördröjning gäller åt andra hållet: en punkt som en varm station har strukit kan ligga kvar i telefonen lika länge.
Appens löfte *"Läget kan ändras under resan, och då säger rösten till"* gäller i dag med upp till 40 minuters fördröjning.

Mätt 28/10: `live.json` 13 165 byte (5 088 komprimerad), `manifest.json` 352 byte, `Cache-Control: max-age=600` på Pages,
kartrepot 83 MB. Appen hämtar med `reloadIgnoringLocalCacheData` och verifierar sha256 ur manifestet.

## 3. Maximal uppsnabbning i tre steg

| Steg | Vad | Längsta väntan efteråt | Kostnad |
| :-- | :-- | :-- | :-- |
| **1. Appen kollar varje minut** | Under resan hämtar appen manifestet (352 byte) varje minut och laddar lägesfilen (5 kB komprimerad) bara när den har ändrats | **Ungefär 12 min** | Omkring 100 kB mobildata i timmen per förare. Ingen belastning på databasen (appen hämtar från GitHub). Nya byggen, TestFlight, App Review och Play. |
| **2. Publicera varannan minut** | pg_cron var 10:e → var 2:a minut | Med steg 3: **3–4 min** | Varje körning ställer regelns frågor mot alla 12 960 punkterna: fem gånger så mycket läsning som i dag. Publiceringens tid per körning måste mätas först. |
| **3. Lägesfilen i Supabase Storage** | Appens tre filer skrivs över i en publik hink, som rapportfilen redan gör (DECISIONS #617), i stället för att committas till GitHub | Ingen commit och inget sidbygge | Ändringar i `publicera` och i apparna. Kartsajten fortsätter via GitHub var 30:e minut. |

Steg 2 och 3 hör ihop. Publicering varannan minut via GitHub vore 30 commits i timmen; sidor som byggs direkt från en gren har
enligt GitHubs dokumentation en mjuk gräns på 10 byggen i timmen, så byggena kan köas och fördröjningen bli längre i stället för
kortare. Kartrepot skulle dessutom växa med uppskattningsvis 1–1,5 GB om året (144 commits om dygnet redan i dag, eftersom
lägesfilen bär en tidsstämpel och alltid ändras).

## 4. Databasutrymmet vid maximal uppsnabbning (en publicering i minuten)

| Vad | Tillskott |
| :-- | :-- |
| Publiceringens egna skrivningar | **Inga.** Den läser bara ur databasen |
| pg_cron:s körlogg (gallras efter tre dygn, `gallra_arkiv(3)`, sql/044) | Omkring 3 900 rader fler, uppskattningsvis 2–4 MB, sedan står det still |
| pg_net:s svar (sparas sex timmar, sql/051) | Under 1 MB |
| Lägesfilen i Storage | Omkring 15 kB, som skrivs över |
| **Summa** | **Några MB, ett fast tak, ingen tillväxt** |

Det som kostar är inte utrymmet utan databasens räknekraft för de fem gånger fler frågorna, telefonernas data och, så länge
filen går via GitHub, kartrepot.

## 5. Rekommendation

Steg 1 först: den största vinsten, rör inte servern, kräver bara nya byggen. Steg 2 och 3 efter en mätning av publiceringens tid
per körning. Förslaget bygger på läsning av koden; inget är mätt i drift.

## 6. Reservationer

- Pages-byggets tid är inte mätt.
- GitHubs gräns på 10 byggen i timmen och Supabase-planens kvoter är ur minnet av deras dokumentation, inte kontrollerade 28/10.
  Hur kartrepot publiceras syns inte utan inloggning.
- Hur lång tid `publicera` tar per körning är inte mätt; det behövs före steg 2.
- Radstorleken i körloggen är uppskattad.
- Androids takt är läst i en kommentar i iOS-koden, inte i Android-koden.

## 7. Det som hör ihop med detta men avgörs för sig

- Rapporten i Favoriter läser inte nyckeln `kandidat` (`publish/rapport-core.ts` tar sträckorna, broarna, stationerna och SMHI
  ur lägesfilen); rutan *Prognosen · kommer senare* i apparna är från 2/10, före #556. Ett eget beslut av Bengt och Axel, utkast
  inte skrivet 28/10.
- Underkylt regn är parkerat till efter våren 2027 (DECISIONS #738).
