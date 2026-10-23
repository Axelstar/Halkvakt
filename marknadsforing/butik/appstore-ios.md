# App Store — butikstext och granskarens anteckningar (iOS)

*Skriven 1/10 2026 kväll mot koden i 0.3.9 (19) och DECISIONS #320 (iOS först, inte näringsidkare, kontakt), #378/#379 (missarna),
#432 (bara Sverige). Play-texten i `butikstext.md` är förlagan; skillnaderna: Polisen är struken som källa (#318/#320), autostarten
beskrivs som iPhone gör den (vaknar själv), och missarna står med i integritetsstycket. Allt under rubrikerna är klart att klistra in.*

*Granskad 19/10 mot koden i 0.3.13 (32) (e83e56c), avsnitt för avsnitt (Bengt: "kan du förbereda vårt inskick till apple så att det blir
rätt"). Rättat: provkortets text i granskarens anteckningar, en intern rad som stod inne i den engelska texten, länkarna till halkvakt.se
och två punkter i nyheterna. Stegen för inskicket står sist.*

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
• Spara vägar du kör ofta som favoriter efter en resa, och se läget längs dem innan du kör: halka, frysrisk, olyckor, köer åt ditt håll och vägarbeten — dit och hem, med det som är nytt sedan du sist tittade. Brytaren är av tills du slår på den.

DIN INTEGRITET, PÅ RIKTIGT
Din position lämnar inte telefonen av sig själv. All matchning mot vägdata sker lokalt i appen. Inga konton, ingen inloggning, inga annonser. Sparar du resor som favoriter stannar de i telefonen och följer inte med i säkerhetskopian. Läget längs dem räknas i telefonen: appen hämtar samma fil som alla andra, utan att fråga om din väg.

Ingenting skickas från appen. Betatestet, där testare efter resan kan svara om varningarna stämde, finns bara i testversionen i TestFlight och inte i App Store-versionen.

GRATIS, UTAN FÖRBEHÅLL
Halkvakt är gratis och byggd på öppna svenska data. Vägen är redan betald med dina skattepengar — vi ser bara till att den får tala.

Halkvakt varnar vid Trafikverkets mätstationer och rapporterade väglag — mellan stationerna är vägen oövervakad. Datakällor: Trafikverket (CC0), SMHI, Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL). Halkvakt är fristående och har ingen koppling till myndigheterna.

## Nyckelord (100 tecken, kommaseparerade)
halka,halkvarning,väglag,vinterväg,fartkamera,viltvarning,olycka,trafikverket,bilkörning,röst

## Länkar
- Support-URL: https://halkvakt.se/support.html
- Marknadsförings-URL: https://halkvakt.se/
- Integritetspolicy: https://halkvakt.se/integritet.html *(gäller från 2026-10-19, med sparade resor; halkvakt-karta#8)*

*De gamla adresserna på axelstar.github.io skickar vidare med 301 till samma sidor (läst 19/10), så de fungerar också, men butiken bör
peka direkt på halkvakt.se.*

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

## Nyheter i 0.3.13 (What's New in This Version) — utkast 18/10, Axel godkänner (DECISIONS #634)
Versionen i butiken är 0.3.9; listan gäller allt som kommit sedan dess (PRODUKTBOK, *Versionerna*).

• Nytt utseende: Redo., körläget och varningskortet i helskärm är omgjorda.
• Favoriter, en ny flik: spara vägar du kör ofta efter en resa, och se läget längs dem innan du kör — dit och hem, med det som är nytt sedan du sist tittade. Vägarna stannar i telefonen och följer inte med i säkerhetskopian. Av från början.
• Halkvakt tror, märkt beta: rösten kan varna för halka som Halkvakt räknat fram ur väder och vägyta. Följer reglaget Halt väglag.
• Där flera hala vägsträckor möts säger rösten halka en gång, inte en gång per sträcka.
• Vakten stoppar sig själv när bilen stått still en kvart — en promenad efter resan håller den inte längre igång.
• Vakten tappar inte längre positionen om du startar den medan den själv provar om du kör.
• Musiken går tillbaka till full volym när rösten har sagt sitt, i CarPlay och över Bluetooth.
• Ett kort nätavbrott ger inte längre raden om gammal väglagsdata.

## Granskarens anteckningar (App Review Information → Notes)
Klistra in på engelska — granskarna läser engelska. Stycket om nyheterna i 0.3.13 är ett utkast 18/10 som Axel godkänner; meningen om
inspelningen gäller först när den är bifogad (steg 2 nedan).

> Halkvakt is a Swedish road-safety app. It reads Trafikverket's (the Swedish Transport Administration's) open data about slippery roads, accidents, wildlife, freezing risk and speed cameras, matches the phone's position against it locally, and speaks a warning through the car speakers before the driver reaches the hazard. There is no account and no sign-in.
>
> BACKGROUND LOCATION (2.5.4): the warnings must work with the screen locked while driving, which is why the app uses background location. Nothing about the user's position ever leaves the device automatically; matching happens on the phone against a downloaded data file. "Always" is only requested so the guard can start itself when the user begins driving; "When In Use" is enough for the warnings.
>
> HOW TO SEE A WARNING WITHOUT DRIVING: open the app, allow location, tap "Starta vakten" (Start the guard). The driving screen appears. Press and hold the label "PÅ VAKT" at the top for half a second: a sample warning card ("Halka", "FRAMFÖR DIG", with the spoken line "Varning: halka rapporterad på vägen framför dig.") fills the screen for eight seconds, without sound. Real warnings are spoken aloud. Tap "Avsluta vakten" to stop.
>
> The optional "Betatest" switch (off by default) is shown only in TestFlight builds; in the App Store version it is hidden and nothing is sent. In a test build it lets a tester send a one-tap answer after a trip about whether a warning was correct; the data sent is described in the app and in the privacy policy (hazard id, timestamp, answer, app version).
>
> NEW IN 0.3.13: two optional additions. (1) "Halkvakt tror" (beta): a modelled warning for slippery roads, spoken only when the modelled road surface is at or below 0 °C and moisture is measured nearby — it cannot appear in Cupertino. The card is marked BETA, and the warning follows the "Halt väglag" switch in Settings → Varna för. A second beta rule, freezing risk after rain, speaks only in TestFlight builds with "Betatest" on. (2) Favoriter, a new middle tab: the switch "Erbjud att spara resor" is off by default. When it is on, the home screen asks after a trip of at least 1 km whether to save the route that was driven. Saved routes are stored only on the device, excluded from iCloud backup, never transmitted, and deleted with one tap in the tab. No map is loaded behind them. Each saved route has a report ("Dit / Hem", out and back): the app downloads one public file of Trafikverket's current situations — the same file for every user, with no route, position or query in the request — and matches it against the saved route on the device. Saving a route needs a drive of at least 1 km, so the tab is empty on a fresh install.
>
> BACKGROUND AUDIO (2.5.4): the "audio" background mode keeps the voice speaking with the screen locked while driving. To hear it: Settings → Rösten → "Testa i bakgrunden (talar om 5 s)", then go to the Home Screen; the voice speaks five seconds later. A screen recording from a real iPhone is attached.
>
> The app is in Swedish and is released in Sweden only. Contact: Axel Lagerlöf, ‹Axels e-postadress›.

Kontaktuppgifter i formuläret: Axel Lagerlöf, +46 (ditt nummer), ‹Axels e-postadress›. *Sign-in required:* **Nej**.

## Skärmbilder
Bilderna i butiken sedan 0.3.9 kommer ur `appstore/alf/` (skriptet `alf.py`): 1284 × 2778, Apples 6,5-tumsfack, det App Store Connect
visade för Halkvakt 1/10; 0.3.9 godkändes med dem 12/10. Råbilderna tas på Axels iPhone 14 (1170 × 2532, för små för facket) och ramas
in av skriptet, med statusraden (översta 150 px) ersatt av skärmens färg. `appstore/` har en reservserie i 1320 × 2868 (6,9 tum,
`rama.py`) om App Store Connect kräver det facket. Nya bilder tas ur bygget som skickas in, 0.3.13 (32) (DECISIONS #643): de nuvarande
är ur (19), före designen v2 och fliken Favoriter (2.3.3). Ordningen i butiken är filnamnens ordning.

## Inskicket steg för steg — 0.3.13 (32)

**22/10: inskicket görs med (33), inte (32)** (Bengt, DECISIONS #681). (32) har efterhalkan utan spärr och raden om gammal data.
Byt 32 mot 33 i stegen nedan. Beskrivningen, nyheterna och anteckningarna ovan är rättade för (33).
Läget 19/10: bygge 32 är uppladdat och inläst hos Apple (byggsignalerna, issue #706: `bygge:32 … READY_FOR_BETA_SUBMISSION`), men ingen
har installerat det än. Versionen i butiken är 0.3.9. Versionsposten som väntar i App Store Connect heter **0.3.10** och står i
*Prepare for Submission* (`appstore:0.3.10:PREPARE_FOR_SUBMISSION`); den skapades efter avslaget 5/10 (#460).

1. **Provet på 32** (Bengt och Axel, #640 punkt 4, #643): spara en resa, se fliken och rapporten *Dit / Hem*, kör samma väg tillbaka
   (frågan ska inte komma igen), *Nytt sedan förra kollen*, och rulla i Favoriter och Inställningar: klockan ska stå på mörk botten.
2. **Skärminspelningen för bakgrundsljudet** (Apples 2.5.4, avslaget 5/10): på en riktig iPhone med 32, starta skärminspelningen,
   öppna *Inställningar → Rösten → Testa i bakgrunden (talar om 5 s)*, gå till hemskärmen och vänta tills rösten hörs. Den bifogas
   under *App Review Information* (Attachment). Utan den säger anteckningarna något som inte stämmer.
3. **Råbilder ur 32** på Axels iPhone 14, i stående läge, till Claude, som ramar in dem med `alf.py` i 6,5-tumsfacket (1284 × 2778):
   varningskortet (håll på *PÅ VAKT* i körläget), körläget, *Redo.*, fliken Favoriter med en sparad resa, rapporten för en resa,
   *Inställningar → Varna för*, notisen över kartappen och onboardingens platssida. Bilderna i butiken är ur (19), före designen v2
   och fliken Favoriter (2.3.3).
4. **Versionsposten:** byt versionsnumret i posten från 0.3.10 till **0.3.13**, och välj **bygge 32** under *Build*. App Store Connect
   visar bara byggen vars version stämmer med postens nummer.
5. **Texterna** ur den här filen: *What's New* (nyheterna ovan), beskrivningen, kampanjtexten, nyckelorden och länkarna till halkvakt.se.
6. **Skärmbilderna:** ersätt de sju gamla med de nya, i filnamnens ordning.
7. **App Review Information:** anteckningarna på engelska, kontaktuppgifterna, *Sign-in required: Nej*, och inspelningen ur steg 2.
8. **App Privacy:** inget nytt skickas i 0.3.13; sparade resor stannar i telefonen. Kontrollera att det publicerade svaret är
   *Coarse Location* och *Product Interaction*, inte kopplade till identitet och inte för spårning, som manifestet i bygget
   (`PrivacyInfo.xcprivacy`). Exportfrågan ställs inte (`ITSAppUsesNonExemptEncryption = false`).
9. **Kategori, ålder, pris, länder och upphovsrätt** som ovan. Släpp manuellt, som 0.3.9 (#433).
10. **Submit for Review.** Beviset är `appstore:0.3.13:WAITING_FOR_REVIEW` i byggsignalerna inom en timme.

**Kontrollerat i koden 19/10 (0.3.13 (32), e83e56c):**
- Avslagets 5.1.1(iv): knapparna före platsfrågorna heter *Fortsätt*, inte *Tillåt* (OnboardingView rad 124–136).
- Granskningsläget: långtrycket på *PÅ VAKT* är 0,5 s och visar kortet i 8 s utan röst (KorlageView rad 38–43). *Starta vakten* och
  *Avsluta vakten* heter så.
- *Testa i bakgrunden (talar om 5 s)* finns under Rösten.
- Kandidatens *Halkvakt tror: halka framöver.* märks BETA och följer reglaget *Halt väglag*. Efterhalkans *frysrisk framöver* (S3)
  följer *Frysrisk* och talar bara med Betatest på, som bara finns i TestFlight (#677, #681; rättat 22/10, B4-58). Brytaren *Erbjud att spara resor* är av från början, och en resa tas
  bort med *Ta bort* i fliken.
- Rapporten hämtar `favoriter/`-filerna utan fråga om rutt eller position. Bakgrundslägena är `location` och `audio`. Integritetsmanifestet
  har CoarseLocation och ProductInteraction samt UserDefaults (CA92.1), och inga andra API:er med krav på skäl används.
- Datakällorna i beskrivningen är desamma som i appens text.
