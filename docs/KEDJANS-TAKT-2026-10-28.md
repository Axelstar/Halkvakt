# Kedjans takt: motorns och kandidatens väg till appen, och hur båda kan snabbas upp

*Skriven 28/10 2026 av Claude på Bengts frågor samma dag: hur kandidatens varningar når appen, hur lång fördröjningen är, hur
den kan snabbas upp maximalt och vad det kostar i databasutrymme; sedan hur gamla motorns uppgifter är från källan och om de kan
snabbas upp på samma sätt. Bengt: *"jag vill att du sparar hela det här resonemanget som en punkt och sätter 1 november som
fristdag på det så vi inte glömmer bort det här"*, och *"Kan du slå ihop detta med utredningen om kandidaten så att vi kan göra
uppsnabbningen för båda samtidigt"*. Fristen `kedjans-takt-1-11` i `docs/fristerna.json`. Läst i koden och mätt i ett ögonblick
(publiceringen 28/10 16:00 UTC); varje tal har sin källa angiven. Inget är byggt eller ändrat.*

## 0. Slutsatsen

Motorn och kandidaten går ut till förarna på **samma väg**: samma lägesfil, samma publicering var tionde minut och samma hämtning
i appen var 30:e minut. Från en mätning till appen tar det därför i dag upp till ungefär 40 minuter för båda, och från en
förändring på vägen upp till ungefär 50 minuter för motorns stationer, eftersom de bara mäter var tionde minut. **En och samma
uppsnabbning gäller båda:** appen som hämtar varje minut ger ungefär 12 minuter från mätning till app, och publicering varannan
minut med lägesfilen i Supabase Storage ger omkring 5. Databasen kostar det några megabyte med fast tak och ingen tillväxt.
Därtill två fynd som bara gäller motorn: publiceringen går på exakt samma minuter som stationerna mäter och missar därför alltid
den färskaste mätningen (gratis att rätta, kräver en mätning), och en enskild station får vara upp till tre timmar gammal i appen.

## 1. Två flöden in, en väg ut

| Steg | Motorn (halka på sträckor, frysrisk, olyckor, djur) | Kandidaten (*Halka (beta)*) | Takt |
| :-- | :-- | :-- | :-- |
| Källan | Trafikverkets väderstationer mäter; väghållaren sätter väglaget; trafikcentralerna skriver in olyckor och hinder | Axels Python i GitHub Actions räknar vägytan i 12 960 vägpunkter och 754 stationer | Stationerna var 10:e minut; väglag och olyckor när de ändras; kandidaten en gång i timmen |
| In i databasen | `ingest-live` hämtar bara ändringarna (changeid) för Situation, RoadCondition och WeatherMeasurepoint | Kedjan skriver timmen | Motorn **varje minut**; kandidaten en gång i timmen |
| Urvalet | `buildSnapshot` tar stationer vars senaste värde är högst tre timmar gammalt (`WX_SANE`), halka på sträckor, olyckor och djur | `talande_regel()`: yta ≤ 0 °C, mätt fukt (väglaget *Våt* eller radarn senaste timmen), ingen station över +2 °C inom 15 km de senaste 45 minuterna | Vid varje publicering |
| Ut | `publicera` skriver lägesfilen `live.json` och committar den till kartrepot; GitHub Pages bygger | samma | Var 10:e minut, Pages omkring 1 min |
| I telefonen | Appen hämtar lägesfilen; motorn räknar frysrisken i telefonen ur stationsvärdena och jämför positionen med varningarna | Appen jämför positionen med kandidatens punkter | När vakten startar, sedan **var 30:e minut** |

Källor: `supabase/functions/ingest-live/index.ts` (varje minut), `publish/snapshot-core.ts` (`WX_SANE`, kandidatens nyckel),
`sql/069_radarns_tal.sql`, `sql/070_bytet.sql`, `supabase/functions/publicera/main.ts` (*/10 och Git Data API),
`ios/.../GuardManager.swift` (`refreshEvery = 30 * 60`, DECISIONS #371; Android enligt kommentar där),
`ios/.../AgeGate.swift` (45 minuter på filens ålder).

Kandidatens punktnät är hela Trafikverkets väglagsnät: alla 818 sträckor, en punkt varannan kilometer (DECISIONS #473, #573),
ögonblicksbild från 7/10, avstämd mot databasen 15/10. Bara koordinaterna för de punkter som varnar skickas; kandidatens tal
stannar i databasen.

## 2. Ålder och fördröjning länk för länk

| Länk | Motorn | Kandidaten |
| :-- | :-- | :-- |
| Från förändring på vägen till mätning | Upp till 10 min (stationernas mättakt) | Ytan räknas en gång i timmen; fukt och veto läses färska vid varje publicering |
| Från mätning till databasen | Trafikverkets leverans (inte mätt) + högst 1 min | – |
| Mätningens ålder när publiceringen går | **10 min** (se §3) | Timmen högst 2 h gammal, annars tiger regeln |
| Väntan på publicering | Ingår ovan | Upp till 10 min |
| GitHub Pages | Omkring 1 min (inte mätt) | Omkring 1 min |
| Appens hämtning | Upp till 30 min | Upp till 30 min |
| **Från mätning till app** | **Upp till omkring 40 min** | **Upp till omkring 40 min** |
| **Från förändring på vägen till app** | **Upp till omkring 50 min**, typiskt en halvtimme | – |

Samma fördröjning gäller åt andra hållet: en varning som har upphört kan ligga kvar i telefonen lika länge. Appens löfte
*"Läget kan ändras under resan, och då säger rösten till"* gäller i dag med den fördröjningen.

## 3. Mätt 28/10 vid publiceringen 16:00 UTC

| Vad | Värde | Källa |
| :-- | :-- | :-- |
| Svenska stationer med senaste värdet från 15:50 | **783 av 856** (91 %) | Kartans `vader.geojson`, fältet `t` |
| Stationer 20–60 min gamla | 16 | samma |
| Stationer 1–3 timmar gamla (med i appen) | **1** | samma |
| Stationer äldre än 3 timmar (bortfiltrerade, upp till 37 dygn) | 35 | samma |
| Väglagets senaste ändring | Median 1,5 h, 215 av 818 sträckor inom en timme, 90 % inom 12 h | Kartans `vaglag.geojson`, fältet `updated` |
| `live.json` | 13 165 byte (5 088 komprimerad) | Pages |
| `manifest.json` | 352 byte | Pages |
| Cache på Pages | `max-age=600`; appen hämtar med `reloadIgnoringLocalCacheData` och verifierar sha256 | Pages, `SnapshotRepo.swift` |
| Kartrepot | 83 MB | GitHubs API |

Väglagets `updated` är Trafikverkets rytm, inte Halkvakts fördröjning: ett väglag står tills väghållaren ändrar det, och
`ingest-live` har ändringen inom en minut.

## 4. Uppsnabbningen, för båda samtidigt

| Steg | Vad | Motorn, från mätning till app | Kandidaten, från regelns ändring till app | Kostnad |
| :-- | :-- | :-- | :-- | :-- |
| I dag | | Upp till ~40 min | Upp till ~40 min | |
| **0. Flytta publiceringens minut** | pg_cron från :00, :10 … till t.ex. :04, :14 … så att stationernas nya mätning hinner in | ~6 min kortare (om Trafikverket levererar inom ~3 min) | Ingen skillnad | Ingen. Kräver en mätning av Trafikverkets leveranstid och en kontroll mot skuggmotorns :02/:32 (DECISIONS #344) |
| **1. Appen kollar varje minut** | Under resan hämtar appen manifestet (352 byte) varje minut och laddar lägesfilen (5 kB) bara när den har ändrats | **~12 min** (med steg 0 ~6) | **~12 min** | ~100 kB mobildata i timmen per förare. Ingen belastning på databasen. Nya byggen, TestFlight, App Review, Play |
| **2. Publicera varannan minut** | pg_cron */10 → */2 | Med steg 3: **omkring 5 min** | Med steg 3: **3–4 min** | Regelns och urvalets frågor fem gånger så ofta; publiceringens tid per körning måste mätas först |
| **3. Lägesfilen i Supabase Storage** | Appens tre filer skrivs över i en publik hink, som rapportfilen redan gör (DECISIONS #617), i stället för att committas till GitHub | Ingen commit, inget sidbygge | samma | Ändringar i `publicera` och apparna; kartsajten fortsätter via GitHub var 30:e minut |

Golvet för motorn är stationernas egen mättakt: upp till 10 minuter från en förändring på vägen till nästa mätning. Golvet för
kandidatens yta är timmen; det som kan snabbas upp är fukt och veto.

Steg 2 och 3 hör ihop. Publicering varannan minut via GitHub vore 30 commits i timmen; sidor som byggs direkt från en gren har
enligt GitHubs dokumentation en mjuk gräns på 10 byggen i timmen, så byggena kan köas. Kartrepot skulle dessutom växa med
uppskattningsvis 1–1,5 GB om året (144 commits om dygnet redan i dag, eftersom lägesfilen bär en tidsstämpel och alltid ändras).

## 5. Databasutrymmet vid maximal uppsnabbning (en publicering i minuten)

| Vad | Tillskott |
| :-- | :-- |
| Publiceringens egna skrivningar | **Inga.** Den läser bara ur databasen |
| `ingest-live` | Oförändrad, går redan varje minut |
| pg_cron:s körlogg (gallras efter tre dygn, `gallra_arkiv(3)`, sql/044) | Omkring 3 900 rader fler, uppskattningsvis 2–4 MB, sedan står det still |
| pg_net:s svar (sparas sex timmar, sql/051) | Under 1 MB |
| Lägesfilen i Storage | Omkring 15 kB, som skrivs över |
| **Summa** | **Några MB, ett fast tak, ingen tillväxt** |

Det som kostar är databasens räknekraft för fem gånger fler frågor, telefonernas data och, så länge filen går via GitHub,
kartrepot.

## 6. Två fynd som bara gäller motorn

**Publiceringen missar alltid den färskaste mätningen.** Stationerna mäter :00, :10, :20 …, och publiceringen går på samma
minuter. Vid publiceringen 16:00 hade 783 av 856 stationer sitt värde från 15:50; mätningen från 16:00 hade inte hunnit in. Värdet
är alltså ett helt tiominutersvarv gammalt redan när det publiceras. Steg 0 rättar det utan kostnad, men minuten måste väljas efter
en mätning av hur snabbt Trafikverket levererar, och inte krocka med skuggmotorn (:02/:32), som flyttades just för att funktionerna
krockade på hel- och halvtimmen (DECISIONS #344).

**En enskild station får vara upp till tre timmar gammal i appen.** Urvalet tar med stationer vars senaste värde är högst tre
timmar gammalt (`WX_SANE`), och appens åldersspärr på 45 minuter prövar bara filens ålder, inte varje station. En station som
stannar kan alltså ge frysrisk på ett värde som är upp till tre timmar gammalt. Vid publiceringen 16:00 gällde det **en** station.
Att sänka gränsen (till exempel till 45 minuter, som filens) är en ändring av motorns urval och kräver ett eget beslut; ett lägre
tak tystar stationer som rapporterar glest.

## 7. Rekommendation

Gör uppsnabbningen för båda i en ordning:
1. **Steg 1** först: den största vinsten, rör inte servern, kräver bara nya byggen.
2. **Mät** samtidigt Trafikverkets leveranstid för stationerna och publiceringens tid per körning (läsning, inget ändras).
3. **Steg 0** när leveranstiden är känd.
4. **Steg 2 och 3** tillsammans om mätningen visar att databasen klarar takten.
5. **Stationernas tre timmar** som ett eget beslut.

## 8. Reservationer

- Åldrarna är mätta i ett enda ögonblick, publiceringen 16:00 28/10, ur kartans publika filer.
- Trafikverkets leveranstid för en mätning är inte mätt; steg 0:s vinst beror på den.
- Pages-byggets tid är inte mätt.
- GitHubs gräns på 10 byggen i timmen och Supabase-planens kvoter är ur minnet av deras dokumentation, inte kontrollerade 28/10.
  Hur kartrepot publiceras syns inte utan inloggning.
- Hur lång tid `publicera` tar per körning är inte mätt; det behövs före steg 2.
- Radstorleken i körloggen är uppskattad.
- Androids takt är läst i en kommentar i iOS-koden, inte i Android-koden.

## 9. Det som hör ihop med detta men avgörs för sig

- Rapporten i Favoriter räknas i telefonen (`Rapport.swift`, `Rapport.kt`) ur samma `live.json` som rösten, plus rapportfilen
  från funktionen `favoriter` för Trafikverkets övriga slag (vägarbeten, köer, färjor och liknande); funktionen känner inte till de
  sparade resorna. På main 28/10 läser rapporten inte nyckeln `kandidat`. PR #1245 (beslut #739, inte sammanslagen när detta
  skrivs) lägger till den. Därefter snabbar uppsnabbningen ovan upp också rapportens BETA-ruta; rapportfilens egen takt på tio
  minuter gäller bara de övriga slagen. *Rättat 28/10 efter påpekande från sessionen Prognoser i favoriter: den första versionen
  sade att rapporten byggs i `publish/rapport-core.ts` på servern.*
- Underkylt regn är parkerat till efter våren 2027 (DECISIONS #738).
