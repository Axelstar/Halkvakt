# Åtgärdslistan för block 5, Appen

**Varför:** Bengt 22/10: *"Ja, skriv åtgärdslistan för Appen och gör rättelserna och Androids Betatest-spärr"*. Listan samlar det
som genomgången av blocket Appen fann 22/10. Genomgången var läs-only och gjordes av tre hjälpagenter, en för iPhone, en för Android
och en för rösten, betatestet och integriteten. Claude stämde av de fyra tyngsta fynden i koden, och förklaringen gavs i chatten. De
fem besluten togs i omgång 1 (DECISIONS #681).

**Reglerna** är desamma som i `docs/ATGARDER-MOTORN-2026-10-21.md`:
- Varje brist har ett nummer, B5-01 och framåt. Numren byts aldrig och återanvänds aldrig.
- En rad stängs av en **PR**, ett **beslut** (DECISIONS-posten skriver numret) eller ett uttryckligt **bortvalt** (Bengts ord, med
  skälet). Statusen skrivs här i samma ändring.
- Status: `öppen` · `pågår` · `klar` · `bortvald`. Kolumnen *Stängd av* bär PR-numret eller beslutet.

Förkortningar:
- ios = `ios/HalkvaktApp/Sources`
- and = `android/app/src/main/kotlin/se/halkvakt/app`
- PK = projektkartans del

## A. Beslut (omgång 1, 22/10)

| Nr | Fråga | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B5-01 | (32) eller (33) till App Review | **klar** — *"(33)"*: (32) har efterhalkan utan spärr och raden om gammal data; byggnumret höjs sist, efter #1029 | #681 |
| B5-02 | Axels PR #1029 (Android-rösten, notisen, trappan, targetSdk 36) | **klar** — *"Ja, när Axel bekräftat"* | #681 |
| B5-03 | Betatest syns i App Store-versionen (Motorns B4-72) | **klar** — *"Dölj utanför TestFlight"*, byggt i iOS i PR #1158 | #681 |
| B5-04 | S3 hänger på Betatest-brytaren | **klar** — *"Behåll, skriv ut det"*: Betatest-sidan i båda apparna säger det | #681 |
| B5-05 | Start och stopp på iPhone: grön eller orange | **klar** — *"Grön som nu"* | #681 |
| B5-06 | Kanalmärkning av facitsvaren | **klar** — *"Versionen räcker"*: från (33) svarar bara testarna | #681 |

## B. Rättelser i projektkartan (en PR)

| Nr | Del | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B5-07 | PK a-ios | Bygget står som 0.3.10 (22), koden är 0.3.13 (32) och snart (33). Antalet vyer, skinnet sett på en iPhone (#628), skärmbilderna ur bygget som skickas in | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-08 | PK a-start-ios | Radhänvisningarna: staketet, förflyttningen, självstoppet (nu `IdleStop.swift:13`) och PRODUKTBOK | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-09 | PK a-omladdning | `GuardManager.swift`-raderna. Soffprovet 17/10 uppfyller inte steget | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-10 | PK a-batteri | `Guard.kt:55`. "558a15d (#678)" menar PR #678. "Byggt i koden" står som pågår fast Å1–Å5 ligger i main. Saknas-raden om (23) | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-11 | PK a-android | versionCode 23 ska vara 32. Kort #284 c saknas i delens kort. Uppgiften om Axels Android är motstridig | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-12 | PK a-start-android | Radhänvisningarna. Saknas-raden om Å3 är gammal och dubblerad. Premissen "faller tyst" är härledd, inte mätt | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-13 | PK a-reglaget | Fem radhänvisningar. Reglaget kom i (17), inte (19). Beviset för provet i bil var cirkulärt | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-14 | PK a-rosten | Radhänvisningarna i `texts.ts`, `SpeechService.swift` och `GuardService.kt`. Saknas tar inte upp kort #356, Verify för #642 och (32)/(33) sett på telefon. Kartsynken strök raden om korten v4 utan bevis. S3 och kandidaten nämns inte | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-15 | PK a-betatest | Svaren 5/10 mot 41 svar 21/10. Siri-svaren sparas som tryck. Saknas-rader som beskriver läget. Android-filerna `Resan.kt`, `FacitSender.kt` och `FacitSvarReceiver.kt` saknas i listan | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-16 | PK a-integritet | Radhänvisningarna. Beviset b9626bf är gammalt (policyn ändrades 19/10, #635). Favoriterna undantas på Android vid byte av telefon | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |

## C. Tavlan, Play-dokumenten och APPEN (samma PR)

| Nr | Var | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B5-17 | TAVLA #279 | 4a och 4b står som Axels beslut, men de avgjordes 4/10 (#461). Verify pekar på (19) | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-18 | TAVLA #214 | Rubriken "OSANN SEDAN 16/9" och Kvar-raden om meningen är gamla | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-19 | TAVLA #258 | Verify säger 30 minuter, Kvar-raden och #434 säger 45–60 | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-20 | TAVLA #284, #262 och Introduktionen | "Gammal data M–N" är borttagen (#647). Introt ritades om i #284. #262 säger "i inget uppladdat bygge än" | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-21 | `docs/PLAY-KONTO.md` §4 | Står på läget 20/9: 0.3.1 (4), Data safety "osann" och inget uppladdningsflöde | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-22 | `docs/PLAY-DATASAFETY.md` | :66–90 säger att policyn "fortfarande" lovar *Ingenting*, fast det rättades 1/10. Policyadressen | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |
| B5-23 | `docs/APPEN.html` §3 och §4 | Spärren för S3 (#677, #679) och Betatest i TestFlight (#681) saknas. "Väglagsdata · gammal" är borttagen på main | **klar** — rättat 22/10 mot koden och källorna | PR Appens rättelser, #682 |

## D. Byggen

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B5-24 | **Androids Betatest-spärr** före Google Plays produktion. Android kan inte känna igen ett testspår, så spärren blir en byggflagga: testbyggena har Betatest, och produktionens AAB byggs utan | Claude | **klar** — PR #1159 sammanslagen 23/10 (b4f68bc6); android.yml med betatest=false grönt (39851429519) | PR #1159 |
| B5-25 | **Byggnumret 33**, höjt i samma PR som den sista appändringen, efter #1029. Sedan TestFlight-flödet *ladda-upp* från main | Claude, efter Axels ja till #1029 | pågår — byggnumret 33 i iOS och Android 23/10, efter #1029 (sammanslagen df224bba); uppladdningen med TestFlight-flödet från main efter sammanslagningen | |
| B5-26 | Spärren i favoriternas rapport (hålet i #677) | Claude | **klar** — PR #1156 | #679 |
| B5-27 | iPhone-appen gick inte att bygga efter #677 (`SnapshotRepo.swift:28` utan `await`) | Claude | **klar** — PR #1156; prov-bygget i `testflight.yml` grönt | #679 |
| B5-28 | PR-flödet bygger varken iPhone-appen eller Android och kör inte motorproven i Kotlin och Swift. De går bara på main eller för hand, och därför syntes #677:s fel inte i PR:en | Claude (förslag), Bengt (beslut) | öppen | |

## E. Prov med telefon eller bil (Bengt eller Axel)

| Nr | Prov | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B5-29 | En resa på 45–60 minuter där klockslaget vid PÅ DIN VÄG flyttar sig (omladdningen, kort #258) | Bengt eller Axel | öppen | |
| B5-30 | Batteriet på iPhone, mätt på ett nyare bygge som också laddar om var 30:e minut. Å8 (nollmätningen på (18)) går inte längre att göra i den ordningen | Bengt eller Axel | öppen | |
| B5-31 | Förvarningsreglaget prövat i bil | Bengt eller Axel | öppen | |
| B5-32 | Varningskorten F/G/H och kvittot på Redo sedda i (33) på en telefon (Verify för kort #284), mätningen på kort #356 och musiken i CarPlay (Verify för #642) | Bengt eller Axel | öppen | |

## F. Axels

| Nr | Fråga eller steg | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B5-33 | #1029: bekräfta att den är färdig och prova den på en riktig Android | öppen | |
| B5-34 | Inskicket av (33): texterna i `marknadsforing/butik/appstore-ios.md`, versionsposten 0.3.13, skärminspelningen och *Submit for Review* | öppen | |
| B5-35 | Vilket bygge bär App Store-versionen 0.3.9? Rättelsen efter avslaget 5/10 kom först i (23) | öppen | |
| B5-36 | Google Play: identitetsgranskningen, enhetsverifieringen, Data safety, vilka versionCode som är förbrukade i internt test (27–29) och det slutna testet | öppen | |
| B5-37 | Integritetssidan på halkvakt.se: vad ändrades 20/10 (eventuellt PR #1088), och ska den säga att Betatest bara finns i TestFlight? | öppen | |
| B5-38 | Vilka byggen har Kompisarna, och har Android-testaren fått en numrerad APK (Å0)? | öppen | |
| B5-39 | #228: schemat i `project.yml`. CI kör `xcodegen` på en ren löpare med ARCHIVE SUCCEEDED (27)–(32), så behövs kortet kvar? | öppen | |

## G. Fynd i rättelserna 22/10 (utanför listan ovan)

| Nr | Var | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- | :-- |
| B5-40 | `docs/APPEN.html` §7 och §9 | Säger fortfarande att Plays interna test väntar på identiteten och att formuläret fylls i vid första uppladdningen, fast (27) och (28) låg i Play Console 17/10 (a874fbb1, 3cd31a97) | Claude, efter Axels svar (B5-36) | öppen | |
| B5-41 | TAVLA #214 | Rubriken "OSANN SEDAN 16/9" står kvar. En ny rubrik kräver att `kortkartan.ts` körs om | Claude | öppen | |
| B5-42 | `docs/PLAY-DATASAFETY.md` | Tabellen över utgående anrop saknar hämtningen av favoriternas rapportfil (`RapportRepo.kt:18`). Den bär ingen användardata | Claude | öppen | |
| B5-43 | Integritetssidan på halkvakt.se | Säger *gäller från 2026-10-20*, men #635 säger 2026-10-19 (se B5-37) | Axel | öppen | |
