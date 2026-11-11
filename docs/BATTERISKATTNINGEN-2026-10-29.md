# Batteriskattningen: hur mycket drar appen med fas 2? (29/10 2026)

Bengt 29/10: *"kan man inte göra någon form av beräkning hur mycket appen egentligen kan dra (alltså en skattning"*. Gäller
DECISIONS #741 punkt 6 (batteriprovet före inskicket) och kravet i CLAUDE.md: under 8 %/h med skärmen av. Talen räknas av
`scripts/matningar/batteriskattningen-2026-10-29.ts` (kör med `node --experimental-strip-types`). Kort #365.

## Slutsatsen

Troligast drar iPhone omkring **7,2 %/h** under en resa med 0.3.14 (35), alltså under gränsen. Fas 2 lägger till mellan 0 och
cirka 1 %/h, troligen omkring 0,2. Osäkerheten domineras inte av fas 2 utan av mätningen 27/9 själv (7 %/h, sant värde mellan 6
och 8). I det sämsta tänkbara fallet blir summan drygt 9 %/h, så skattningen kan inte ersätta provet. Den visar däremot vad
provet ska avgöra och att det räcker med en enda resa.

## Metoden

Skattningen bygger på det enda som är mätt på iPhone och räknar bara fram vad fas 2 lägger till.

1. **Grunden: mätningen 27/9** (DECISIONS #382): iPhone, bygge 0.3.9 (14), skärmen av, vakten igång en timme, 78 → 71 %:
   **7 %/h**, sant värde 6–8 %/h eftersom iPhone visar hela procent. Det bygget hämtade vägdatan bara vid start.
2. **Det fas 2 lägger till:** appen kollar hinken omkring **30 gånger i timmen**. Den kollar en gång per publicering, var 120:e
   sekund (`Kolltakten.swift`); omkollen efter 30 s ger upp till omkring 35, och felläget 60. Före fas 2 hämtade appen var 30:e
   minut (#371), det vill säga 2 gånger i timmen, och bygget som mättes 27/9 bara vid start.
3. **Vad en koll kostar:** nästan allt är radion. Den vaknar, skickar och ligger kvar uppe en stund efter överföringen. Data och
   processor är småsaker: `live.json` är 31,7 kB med gzip (uppmätt i hinken 29/10), manifestet 0,25 kB, och tolkningen av filen tar
   en bråkdel av en sekund.
4. **Allt annat** (GPS:en, motorn, rösten) antas kosta som 27/9.

## Talen

| Antagande | Joule per koll | Källa |
| :-- | --: | :-- |
| Radion är redan vaken (musik eller navigering i telefonen) | 0 | – |
| Nyare telefon och nät | 3 | **Antagande**, ingen källa |
| LTE som 2012 | 12,8 | Huang m.fl., MobiSys 2012, citerat i andra hand; artikeln gick inte att läsa |

| Batteri (antagande; telefonens modell är okänd) | Tillägg från fas 2, 30 kollar à 3 J | à 12,8 J |
| :-- | --: | --: |
| 11 Wh | 0,23 %/h | 0,97 %/h |
| 13 Wh | 0,19 %/h | 0,82 %/h |
| 17 Wh | 0,15 %/h | 0,63 %/h |

| Fall | 27/9 | Fas 2 | **Summa** | Förutsättningar |
| :-- | --: | --: | --: | :-- |
| Lågt | 6 | 0,00 | **6,0 %/h** | radion redan vaken, 17 Wh |
| Troligt | 7 | 0,19 | **7,2 %/h** | 30 kollar à 3 J, 13 Wh |
| Högt | 8 | 1,13 | **9,1 %/h** | 35 kollar à 12,8 J, 11 Wh, mätningen i överkant |
| Felläget (hinken svarar inte) | 8 | 1,94 | **9,9 %/h** | 60 kollar à 12,8 J, 11 Wh |

Det höga fallet kräver att fyra saker slår åt samma håll samtidigt: mätningen 27/9 i överkanten, det minsta batteriet, 2012 års
radiotal och ingen annan app som håller radion vaken.

## Var batteriet egentligen tar vägen

7 %/h motsvarar 0,8–1,2 W i snitt (11–17 Wh). En GPS-mottagare drar 0,12–0,17 W i kontinuerlig spårning (u-blox för en
mottagare från 2010; en arXiv-artikel om fristående moduler), alltså bara **10–22 %** av det. Resten är troligen telefonen runt
omkring: processorn som väcks för varje position (iPhone levererar en gång i sekunden med `kCLLocationAccuracyBestForNavigation`),
rörelsesensorerna, modemet som byter mast under färden och telefonens grundförbrukning. Det är inte mätt, men det visar ordningen:
att hålla telefonen vaken en gång i sekunden kostar mycket mer än 30 nätkollar i timmen. #382 fann inget stöd för att glesa ut
GPS:en, eftersom det vore en säkerhetsförsämring utan uppmätt vinst.

## Vad skattningen betyder för provet

- **Troligen klarar appen gränsen**, men marginalen är omkring 0,8 %/h, ungefär lika stor som mätosäkerheten 27/9.
- **Provet:** en resa på iPhone med 0.3.14 (35) från TestFlight, **utan laddsladd**, skärmen av och vakten igång, gärna **två
  timmar**, eftersom det halverar osäkerheten per timme. Procenten skrivs upp vid start och slut. Siffran under *Betatest* duger
  inte: iPhone ger batteriet i steg om 5 %, och mätningen vet inte om sladden satt i.
- **Om provet faller** finns spakarna i #741 punkt 6: en glesare takt (en koll var fjärde minut halverar tillägget) eller kollar
  bara när telefonen laddar.
- **Om provet inte blir av** kan skattningen vara underlag för ett beslut av Bengt och Axel att skicka in ändå (bedömningen §4.2).

## Hinkens trafik

**Omkring 0,9 MB i timmen per förare, inte omkring 150 kB som #741 skrev** (rättat i #741, tillägget 29/10 om batteriet och
trafiken). `live.json` bär `generated_at` och får därför ny sha256 vid varje publicering, så appen hämtar den vid nästan varje koll:
30 × 31,7 kB ≈ 0,94 MB i timmen. `static.json` (80 kB med gzip) saknar tidsstämpel och hämtas bara när kameror eller stationer
ändras. Talet påverkar inte batteriet nämnvärt, men det är sex gånger högre än det som stod mot Supabase-kvoten (#644; kvoten är
inte läst i panelen).

## Reservationer

- Radiotalen är andrahandsuppgifter (12,8 J) eller antaganden (3 J). Nyare modem, 5G och olika operatörer kan ligga utanför
  intervallet åt båda hållen.
- Batteriets storlek är antagen.
- Allt utom nätkollarna antas kosta som i bygget 27/9. Funktioner som tillkommit efter det (S3, kandidaten, facit) kan ha lagt till
  processortid per position. Det är inte mätt.
- Android ingår inte. Det finns inget bokfört Android-värde att förankra i (#218); fältrapporten 27/9 gav en uppskattning på omkring
  1,5 %/h för appens andel, inte en mätning.

## Källor

- DECISIONS #382 (mätningen 27/9), #371 (omladdningen var 30:e minut), #741 (fas 2, punkt 5 och 6, kostnaden).
- `ios/HalkvaktEngine/Sources/HalkvaktEngine/Kolltakten.swift` (takten), `ios/HalkvaktApp/Sources/Services/GuardManager.swift`
  (`kCLLocationAccuracyBestForNavigation`), `android/app/src/main/kotlin/se/halkvakt/app/CadencePolicy.kt` (1, 5 och 15 s).
- Filstorlekarna: hinken `app/v1/`, uppmätta med och utan gzip 29/10.
- [Huang m.fl., *A Close Examination of Performance and Power Characteristics of 4G LTE Networks*, MobiSys 2012](https://experts.umn.edu/en/publications/a-close-examination-of-performance-and-power-characteristics-of-4/)
  (bibliografisk post; 12,8 J per överföring och svansen omkring 1 W citeras ur andrahandskällor, bland annat
  [föreläsningsbilder från IIT Hyderabad](https://people.iith.ac.in/fc5260/slides/lecture-3.pdf)).
- [u-blox, *Low power tracking applications*](https://content.u-blox.com/sites/default/files/Low-power-tracking-applications_WhitePaper_UBX-21014570(1).pdf) (drygt 120 mW i kontinuerlig spårning, 2010).
- [*Modeling and Improving the Energy Performance of GPS Receivers for Mobile Applications*, arXiv 1503.02656](https://arxiv.org/pdf/1503.02656) (143–166 mW för en typisk modul).
