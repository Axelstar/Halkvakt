# App Store — butikstext och granskarens anteckningar (iOS)

*Skriven 1/10 2026 kväll mot koden i 0.3.9 (19) och DECISIONS #320 (iOS först, inte näringsidkare, kontakt), #378/#379 (missarna),
#432 (bara Sverige). Play-texten i `butikstext.md` är förlagan; skillnaderna: Polisen är struken som källa (#318/#320), autostarten
beskrivs som iPhone gör den (vaknar själv), och missarna står med i integritetsstycket. Allt under rubrikerna är klart att klistra in.*

## Namn (30 tecken)
Halkvakt

## Undertext (30 tecken)
Rösten som varnar på vägen

## Kampanjtext (170 tecken, kan ändras utan nytt bygge)
Halka, olyckor, vilt, frysrisk och fartkameror — uppläst i bilen innan du är där. Trafikverkets data, din telefon. Din position lämnar inte telefonen av sig själv.

## Beskrivning (4 000 tecken)
Halkvakt är passageraren som läst allt Trafikverket vet om vägen framför dig — och säger till, med rösten, exakt när det behövs.

Starta vakten, lås skärmen och kör. När något väntar på din väg hör du det i bilens högtalare: rapporterad halka, en olycka längre fram, djur på vägen, en vägväderstation som mäter frysrisk, eller en fartkamera. Inga knappar under körning. Tystnad betyder att vägen är lugn.

SÅ FUNGERAR DET
• Bygger på Trafikverkets öppna data om väglag, olyckor, djur, vägväder och fartkameror — uppdaterat dygnet runt.
• Rösten talar genom telefonens högtalare eller bilens Bluetooth. Ingen skärm behövs under körning; kör du med Kartor eller Google Maps framme visas en kort banner över kartan.
• Vakten vaknar själv när du börjar köra (med platsen Alltid) och stoppar sig själv när bilen stått still en kvart. Vill du starta direkt: tryck på knappen eller säg "Hej Siri, starta Halkvakt".
• Välj själv vilka varningar du vill höra. Fartkameror har egen av/på-knapp.

DIN INTEGRITET, PÅ RIKTIGT
Din position lämnar inte telefonen av sig själv. All matchning mot vägdata sker lokalt i appen. Inga konton, ingen inloggning, inga annonser, ingen spårning.

Det enda som någonsin skickas är något du själv trycker på. Slår du på Betatest i Inställningar kan du efter resan svara om varningarna stämde, eller markera att appen missade något — då skickas varningens id (eller närmaste mätstation), klockslaget och ditt svar. Det säger ungefär var du var just då, och därför är brytaren av tills du slår på den.

GRATIS, UTAN FÖRBEHÅLL
Halkvakt är gratis och byggd på öppna svenska data. Vägen är redan betald med dina skattepengar — vi ser bara till att den får tala.

Halkvakt varnar vid Trafikverkets mätstationer och rapporterade väglag — mellan stationerna är vägen oövervakad. Datakällor: Trafikverket (CC0), SMHI, Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL). Halkvakt är fristående och har ingen koppling till myndigheterna.

## Nyckelord (100 tecken, kommaseparerade)
halka,halkvarning,väglag,vinterväg,fartkamera,viltvarning,olycka,trafikverket,bilkörning,röst

## Länkar
- Support-URL: https://halkvakt.se/support.html
- Marknadsförings-URL: https://halkvakt.se/
- Integritetspolicy: https://halkvakt.se/integritet.html *(uppdaterad 1/10 med missarna och raderingsmeningen)*

## Kategori, ålder, pris, länder
- Primär kategori: Navigation. Sekundär: Resor.
- Åldersfrågorna: inget av det som räknas upp ⇒ 4+.
- Pris: gratis. Inga köp i appen.
- Tillgänglighet: **bara Sverige** (DECISIONS #432).
- Upphovsrätt: © 2026 Lagerlöf Labs.
- EU:s näringsidkarstatus: inte näringsidkare (DECISIONS #320).

## App Privacy (frågeformuläret) — ur DECISIONS #320, stämmer med manifestet i (19)
- Samlar in data: **Ja**, bara om användaren slår på betatestet.
- *Location → Coarse Location*: används för App Functionality och Analytics; **inte** kopplad till användarens identitet; **inte** för spårning.
- *Usage Data → Product Interaction*: samma svar.
- Inget annat. Ingen spårning (tracking) ⇒ ingen ATT-fråga.

## Granskarens anteckningar (App Review Information → Notes)
Klistra in på engelska — granskarna läser engelska:

> Halkvakt is a Swedish road-safety app. It reads Trafikverket's (the Swedish Transport Administration's) open data about slippery roads, accidents, wildlife, freezing risk and speed cameras, matches the phone's position against it locally, and speaks a warning through the car speakers before the driver reaches the hazard. There is no account and no sign-in.
>
> BACKGROUND LOCATION (2.5.4): the warnings must work with the screen locked while driving, which is why the app uses background location. Nothing about the user's position ever leaves the device automatically; matching happens on the phone against a downloaded data file. "Always" is only requested so the guard can start itself when the user begins driving; "When In Use" is enough for the warnings.
>
> HOW TO SEE A WARNING WITHOUT DRIVING: open the app, allow location, tap "Starta vakten" (Start the guard). The driving screen appears. Press and hold the label "PÅ VAKT" at the top for half a second: a sample warning card ("Halt väglag om två kilometer") fills the screen for eight seconds, without sound. Real warnings are spoken aloud. Tap "Avsluta vakten" to stop.
>
> The optional "Betatest" switch in Settings (off by default) lets a tester send a one-tap answer after a trip about whether a warning was correct; the data sent is described in the app and in the privacy policy (hazard id, timestamp, answer, app version).
>
> The app is in Swedish and is released in Sweden only. Contact: Axel Lagerlöf, axel.lagerlof.45@gmail.com.

Kontaktuppgifter i formuläret: Axel Lagerlöf, +46 (ditt nummer), axel.lagerlof.45@gmail.com. *Sign-in required:* **Nej**.

## Skärmbilder
Mappen `appstore/` i den här katalogen: 1320 × 2868 (6,9 tum), inramade ur råbilder tagna på Axels iPhone 14 ur (19), 1/10 kväll. Apple
kräver 6,9-tumsstorleken; samma bilder kan laddas upp även under 6,5 tum (Apple skalar). Ordningen i butiken är filnamnens ordning.
