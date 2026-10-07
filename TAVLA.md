# 📋 TAVLAN — allt på ett ställe

*Stängda kort (122 st, flyttade 26/9, kort #221) står i `TAVLA-ARKIV.md`. Här står de öppna och 🟢 KLART.*

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-09-20 20:16 av Claude (Cowork) — 🗣️ **#203 lager 1 BYGGT på båda plattformarna** (DECISIONS #277): svaret ges med ETT tryck från låsskärmen, och kortet på *Redo.* visar varje varnings klockslag och text — Android grön i CI (åtta nya tester), iOS skriven utan kompilator och kompileras hos Axel; Siri och missarna står kvar som lager 2; 🧩 nytt kort #228 (app-schemat överlever inte `xcodegen` — fångat under 0.3.9-releasen); 📦 **0.3.9 (12) redo att arkiveras**, stegen och provet står på kort #203; 🔒 **#210:s klass stängd** — `str()` kan inte längre göra JSON-null till "<null>" i något av sex id-fält; uppmätt att hålet var latent (DECISIONS #276); 📦 **0.3.9 (12) redo att arkiveras** med iOS-fixen, och Team-id:t skrivet i project.yml så xcodegen slutar nollställa det (DECISIONS #275); 🔇 **iOS tystnade med släckt skärm på "när appen används"** — en rad, funnen av Axels prov, fixad (#227, DECISIONS #273); kort #226 märkt som härlett, inte uppmätt; 📍 **Axels fynd på testtelefonen**: "Tillåt hela tiden" finns inte i rutan på Android 11+ — appen är rätt, guiden var fel och är rättad; nytt kort #226 (DECISIONS #272); 📱 **Android-telefon finns** (grinden löst samma kväll), Androids verkliga hål mätta till tre; 🎉 **Play-kontot skapat** (Lagerlöf Labs, personligt) — men Google kräver en FYSISK Android-telefon för att slutföra det (DECISIONS #271); 📵 **#214 Data Safety sann igen** (DECISIONS #270) + fyndet att integritetspolicyn ljuger likadant; ✅ **0.3.8 (11) uppladdad till Apple 18:38** (app-målet kompilerar, versionsspåret håller); 🚀 **byggordning A avgjord, Axel arkiverar 0.3.8** (simulatorprovet föll på Xcode; DECISIONS #269); 🗣️ **Axels svar på #203:s åtta frågor** (sju avgjorda, byggordningen öppen mot Bengts C, DECISIONS #267), main bekräftat byggredo; 🔑 **tre beslut av Axel** (#214 invarianten, #216 blindningen — väntar Bengts ja, #217 viltrösten; DECISIONS #264–#266); 🧪 **#212 klart** (trösklarna låsta, 36 vektorer), 💾 **#223 klart** (backupens ålder vaktad i Supabase); 🔢 **#220 klart** (beslutsnumren unika + vakt i CI, DECISIONS #259); 🔁 **#211 klart** (tredje olycksropet borta), 🔊 #210 byggt (väntar på iOS-bygge), 🧪 #212 prioritetsdelen klar (DECISIONS #258); 💾 **#213 arkivbackupen klar och bevisad** (DECISIONS #257), nytt kort #223. Tidigare samma dag: ✅ **STEG B:s VERIFY UPPFYLLD**: 141 min/dygn i snitt över 13–19/9 mot baslinjens 202, ingest oförändrat (24 körningar, median 30–36 s mot 32 s), radarsteget 4–5 s, radar_precip 3 312 rader över 24 av 24 kompositer. Kassan 21,98 USD av 35 och takdatumet är BORTA ur larmet — släpande takt 106 min/dygn, månadsprognos 31 USD.*
  💰 **RÄTTAD 13/9 (DECISIONS #160, Bengts order):** prognosen räknade på månad-till-datum, och i
  det snittet låg fem flöden som lades ner 8–9/9 (`ingest-fi`, `-no`, `-dk`, `publish-map`,
  `regn-30`). Vakten sa **21 september**; uppmätt verklig takt var 232 min/dygn senaste dygnet och
  180 de två senaste, mot snittets 311. **Förbrukningen läses nu ur månadstalet, prognosen ur en
  SLÄPANDE takt** över de två senaste kompletta dygnen — taket flyttas därmed till **26 september**
  på verkliga tal. Båda talen står i varje larm: månadssnittet låser fast en takt som kan ha
  upphört, den släpande är känslig för en byggskur. Avviker de mer än 25 % säger larmet
  **TAKTEN ÄNDRAS**. Kostar noll extra API-anrop — dygnsloopen fanns redan.

---

## 🔴 ATT GÖRA

### Beslutsgången
Roller och ägarskap: `docs/BESLUTSGANGEN.md` (31/8). Tavlan är sanningen — en plan som inte
står här finns inte. Kortregeln ersätter möten: allt som bestäms blir ett kort direkt.
### AXELS NÄSTA STEG — i den här ordningen (uppdaterad 1/10)

- [ ] 🔋 **#262 BATTERIPAKETET — SJU ÅTGÄRDER EFTER FÄLTRAPPORTEN 27/9** (Bengts beställning 27/9: *"föreslå ett åtgärdspaket
  … jag vill att Axel gör det"*. DECISIONS #386, #387). 🚨 **Släppblockerare** — batteribudgeten är ett krav i CLAUDE.md.
  📱 **Vad testaren rapporterade:** 42 % efter en baddag, telefonen knappt använd. 27/9: **11 h 39 m** bakgrund, **0 m** skärm,
  GPS **6 h 40 m**, 924 väckningar, väckningslås 4 h 16 m, CPU **2 h 21 m**. 26/9: **21,6 %** av dygnets förbrukning.
  Skärmbilderna: **Autostart PÅ**, **fartkamera 2,0 km bort**, **"Version 0.3.1"**, och telefonen är **inte en Samsung**.
  🧮 **21,6 % är en ANDEL, inte procentenheter.** Antas dygnet ha dragit ~80 pe ⇒ ~1,5 %/h, alltså *inom* 8 %/h.
  **Felet är inte förbrukningen per timme utan antalet timmar.**
  ⛔ **DET STÖRSTA FYNDET: "Version 0.3.1" betyder ingenting.** Numret stod stilla på 0.3.1 / versionCode 4 från 31/8 till
  26/9 medan koden följde med (DECISIONS #377). **Vi kan alltså inte veta om testaren har självstoppet (#248, 24/9) eller
  omladdningsfixen (#370, 26/9).** Hela fältrapporten är otolkbar tills testaren står på ett bygge vars nummer betyder något.
  Det är därför Å0 är först och inte förhandlingsbart.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: batteribudgeten bevisad på båda plattformarna på ett numrerat bygge med Å1–Å5: Android och iPhone mätta en timme med skärmen av och ingen sladd, under 8 %/h (Å7, Å8 med nollmätningen före), och testarens fältprotokoll (Å6) utan avvikelse.

  | # | Åtgärd | Tröskel? | Verify |
  | :-- | :-- | :-- | :-- |
  | **Å0** | **Ge testaren 0.3.9 (18).** Main bär åtta versioners fixar som testaren kanske saknar | nej | testarens Om-sida visar 0.3.9 (18) |
  | **Å1** | **Stoppknapp i den pågående notisen.** I dag har bara *efter resan*-notisen knappar — vakten kan bara stoppas genom att appen öppnas. Halva skälet att den blev kvar på | nej | vakten stoppas från låsskärmen utan att appen öppnas |
  | **Å2** | **Stillaståendetiern i `CadencePolicy`.** Testaren hade en **fartkamera 2,0 km bort** ⇒ NEAR ⇒ **1 Hz GPS hela dagen**. Tiererna är skrivna för Norrlands E4 (kommentaren säger det) och slår nästan aldrig till där folk bor. Rör sig telefonen inte kan ingen fara vara nära förestående — **vid 0 km/h går det inte att nå faran**, oavsett avstånd | ⚠️ **JA** | en stillastående telefon nära en fara ligger på FAR-takt, och en rullande bil på oförändrad takt |
  | **Å3** | **Självstoppet robust mot gångfart.** `IdleStop` nollställs av ETT mätvärde ≥ 5 km/h — gångfart. En buren telefon fyller aldrig kvarten, så självstoppet kan i praktiken bara fira för en **parkerad bil**. Förslag: nollställ på **förflyttning över fönstret**, inte på ett enstaka mätvärde | ⚠️ **JA** | en dag till fots ⇒ vakten har stoppat sig inom en kvart efter sista körningen |
  | **Å4** | **Autostartens text ljuger.** Reglaget säger *"Startar när bilens Bluetooth kopplas"* — men `setEnabled` registrerar också **Activity Recognition**, som startar vakten i vilket fordon som helst (buss, som passagerare). Antingen rätta texten eller begränsa beteendet | nej | texten beskriver vad reglaget gör · **PRODUKTBOKEN i samma varv** |
  | **Å5** | **Cache i `Guard.nearestHazardM`.** Den sveper varje koordinat i varje fara vid VARJE fix, och motorn går över samma material — vid 1 Hz två nationella svep i sekunden. Ren prestanda | nej | CPU-andelen mätt före och efter på samma rutt |
  | **Å6** | **Fältmätningsprotokoll**, så nästa rapport går att jämföra: bygge, autostart på/av, telefonmodell, start-% och *Batterianvändning för app* vid start och slut | nej | protokollet skickat med nästa testarutskick |
  | **Å7** | **MÄT KÖRFALLET PÅ ANDROID** (kort #218:s andra halva, aldrig gjord). Paketet ovan tar bort TIMMAR som inte skulle finnas — det rör inte vad vakten kostar under en riktig körning. iPhone mättes till 7 %/h med övre kant som RÖR 8 (#382); Android har aldrig mätts. **Det är den siffran som avgör om produkten håller kravet**, och ingen av Å0–Å6 svarar på den | nej | en timmes körning, skärmen av, ingen sladd, %/h mot kravet < 8 |
  | **Å8** | **Nollmätning FÖRE Å1–Å5, på 0.3.9 (18).** Utan ett före går ingen förbättring att bevisa — och att mäta det gamla bygget säger inget, eftersom vi inte vet vad det är (se Å0). Ordningen är alltså: Å0 → nollmätning → fixarna → ommätning | nej | samma protokoll som Å6, körd två gånger med bara fixarna emellan |

  ➗ **Å2 och Å3 överlappar — räkna inte hem båda.** De angriper samma spilltid från två håll: stoppar vakten sig själv (Å3)
  blir den stillastående tiden kort, och då har Å2 lite kvar att spara. Å2:s egna värde ligger i de fall där vakten SKA vara
  igång men bilen står — köer, färjelägen, rastplatser — och som skyddsnät när Å3 inte fyrar.
  📉 **Vad paketet inte gör:** 1 Hz-takten UNDER körning är oförändrad, och det är den dominerande kostnaden när vakten gör
  sitt jobb. Wakelocket (4 h 16 m) är inte heller åtgärdat i sig. Paketet tar bort timmar som inte skulle finnas — det gör
  inte en körtimme billigare. Därför Å7.
  ⚖️ **Å2 och Å3 är trösklar och tas inte ensidigt** (Bengt + Axel, §4.2). Båda är säkerhetsnära åt samma håll: **en vakt som
  tystnar i en kö är silence när det gällde** — det dyraste felet appen kan göra. Trösklarna skrivs före mätning och ska genom
  `scripts/vardevakten.ts` innan de bär ett beteende.
  📵 **Telefonen är inte en Samsung.** Vår testmobil är Samsung A just för att den är aggressivast (skills/halkvakt-android §3)
  — men OEM:ernas batterihanterare skiljer sig, och **vi kan alltså inte räkna med att reproducera det här på testtelefonen.**
  Läxan hör hemma i `skills/halkvakt-android/SKILL.md` §5, och Android-mätningen i kort #218 bör köras på minst två fabrikat.
  📏 **Signal, inte bevis:** 44 % 15:26 → 32 % 16:38 = 12 pe på 72 min ≈ **10 %/h**, alltså över budgeten — men vaktens läge och
  skärmtiden i fönstret är okända (skärmbilder togs). Räkna inte med talet; mät om det rent enligt Å6.
  Verify för hela kortet: Å0 kvitterad av testaren · Å1, Å4, Å5 i ett bygge · Å2 och Å3 beslutade i DECISIONS före kod ·
  en ny fältdag där bakgrundstiden ≈ körtiden, inte dygnet.
  🔨 **Å1, Å4, Å5 BYGGDA 1/10 kväll (DECISIONS #431, Axels prioritering: #262 före App Store):** stoppknappen i notisen
  (`StoppaVaktenReceiver`), brytarens text, cachen med triangelolikheten + `GuardTest`. **Bevis:** android.yml 36924001835 grön på grenen
  (JVM-prov, APK, AAB, emulator); motprovet 36925352744 (stale cache + ingen nollning) rött på exakt de två proven — 56 prov, 2 fällda.
  🔨 **Å2 och Å3 BYGGDA 4/10 (Axels ja 13:35, DECISIONS #461) i 0.3.11 (23):** självstoppet på förflyttning (snitt ≥ 12 km/h över 60 s;
  Swift `HalkvaktEngine/IdleStop.swift`, Kotlin `Autostart.kt`), stillaståendetiern MID under 3 km/h (Android). **Bevis:** ios-engine 37199541693
  grön (IdleStopTests 5/5); android se PR. ✅ **Bengts ja 6/10** (*"ja till 748"*), i main; i inget uppladdat bygge än.
  🔑 Kvar: Å0 (testaren får (23)) · Å6 protokoll · Å7/Å8 mätningar (Axel).

- [ ] 🏪 **#280 HALKVAKT TILL APP STORE — PÅ RIKTIGT, DIREKT EFTER #262** (Axels order 1/10 22:37 via Cowork: *"efter #262 så vill jag
  verkligen att vi försöker få ut vår app på riktiga App Store"*). Grunden står sedan DECISIONS #320 (iOS först, inte näringsidkare,
  support-URL, `integritet.html`, App Privacy-etiketten) och kandidaten är numera **0.3.9 (19)** — uppladdad, godkänd för Kompisarna,
  bär #258/#259/#203 lager 2/#279. 🔑 Nyckel: #262 Å1/Å4/Å5 i main (Claude, 1/10 kväll) · Axels blick på (19) i telefonen (#279 Verify).
  📋 **LISTAN (skriven 1/10 kväll mot koden i (19) och DECISIONS #320):**
  | # | Vad | Vem | Läge |
  | :-- | :-- | :-- | :-- |
  | 1 | **Butikstexten för iOS** — ur `marknadsforing/butik/butikstext.md`, men: Polisen struken som källa (#318/#320), *Autostart när Bluetooth kopplas* ⇒ *vaknar själv när du kör* (iPhone), missarna med i integritetsstycket (#379). Namn, undertext (30), beskrivning, nyckelord, support-URL, integritets-URL | Claude | skrivs i nästa varv, Axel klistrar in |
  | 2 | **Skärmbilder 6,9 tum (1320×2868)** — minst en, helst fem: *Redo.*, körläget, varningskortet (håll på *PÅ VAKT*), *Efter resan*, Inställningar. Axel tar råbilder på sin iPhone ur (19); Claude ramar in dem i rätt mått med bakgrund och en rad text | Axel → Claude | råbilder saknas |
  | 3 | **`integritet.html`** i karta-repot: raderingsmeningen och raden om missarna (`docs/PLAY-DATASAFETY.md` rad 66–76) — policyn måste säga vad appen skickar innan Apple läser den | Axel (skrivrätt) | opublicerad sedan 28/9 |
  | 4 | **App Privacy-frågorna** i App Store Connect: Coarse Location + Product Interaction, inte kopplat till identitet, ingen spårning (#320). Manifestet i (19) deklarerar båda — kontrollerat 1/10 | Axel | klickas |
  | 5 | **Versionen 0.3.9** under *Distribution*: bifoga (19), kategori Navigation, åldersgräns (frågeformuläret: inget), pris gratis, upphovsrätt *Lagerlöf Labs*, inte näringsidkare (#320), krypteringsfrågan ställs inte (`ITSAppUsesNonExemptEncryption=false`) | Axel | klickas |
  | 6 | **Granskarens anteckningar** (*App Review Information*): kontakt axel.lagerlof.45@gmail.com + telefon; *ingen inloggning*; förklara bakgrundspositionen (rösten varnar med släckt skärm — Apples 2.5.4) och hur granskaren ser en varning utan att köra: starta vakten, håll på *PÅ VAKT* ⇒ provvarning | Claude skriver, Axel klistrar | nästa varv |
  | 7 | **Varningstriangeln på byggena** i TestFlight — läs texten (hovra). Ikonvarningen från 31/8 stoppar inte TestFlight men kan stoppa butiken | Axel | okänd |
  ✅ **1/10 23:06, Axels tre svar (DECISIONS #432):** bara Sverige · iPhone 14 ⇒ inramning · *"bara att uppdatera"* `integritet.html` ⇒ gjort (karta b9626bf).
  ✅ **Gjort samma kväll:** punkt 1 butikstexten + punkt 6 granskarens anteckningar (`marknadsforing/butik/appstore-ios.md`) · punkt 2 sex bilder
  1320×2868 ur Axels nio råbilder (`marknadsforing/butik/appstore/`, `rama.py`) · punkt 3 policyn publicerad.
  ✅ **23:18 — åtta bilder:** Axel tog körläget ur (19) och hittade en äldre skärmbild av varningskortet; kortet är bild 1, körläget bild 3.
  ⛔ **Långtrycket på *PÅ VAKT* fyrade inte i (19)** (Axel 23:18) — fungerade i äldre byggen (bilden bevisar det), bröts av kvällens
  `ScrollView` (#279): rullningens gest tar touchen. Rättat samma kväll med `simultaneousGesture`; **bygge (20)** satt i samma commit.
  Granskarnotisen bygger på långtrycket ⇒ (20) ska vara bygget som lämnas in, efter att Axel provat trycket i det.
  🎨 **23:27 — Axel valde AppLaunchFlow** (dashboard.applaunchflow.com) för bilderna: *"exactly how I want it"* — gult/mörkt växelvis, liten
  kicker, stor vänsterställd rubrik, telefon med ram. Claudes `rama.py`-serie står kvar som reserv. Före *Download Bundle*: **ta bort
  "4.8 App Store"-märkena** (påhittat betyg = avslag, 2.3.7) och ladda upp de rena råbilderna (statusrad och *◀ TestFlight* bortskurna;
  skickade i chatten, kan återskapas ur `appstore/ra/` med 150 px topp i skärmens färg). 1290×2796 duger i 6,9-tumsfacket.
  🚀 **INLÄMNAD 2/10 00:09 — 0.3.9 (20) *Waiting for Review*** (DECISIONS #433). Hela formuläret ifyllt på en sittning med Claude på skärmen:
  bilder (alf.py, sju st), texter, granskarnotis, App Information, App Privacy publicerad, gratis, bara Sverige, manuell release.
  ✅ **00:11 — långtrycket provat i (20) på Axels iPhone: kortet kommer** (*"Det fungerade"*). simultaneousGesture-fixen håller; granskaren får sin varning.
  ~~🔑 Kvar: Apples svar~~ ❌ **AVVISAD 5/10** (App Store Connect 09:23, DECISIONS #460): 5.1.1(iv), *Tillåt* före platsfrågan, och 2.5.4, granskaren hörde inget bakgrundsljud. Rättelsen ligger i main sedan 10:44 (Axels #758, effd2d1): *Fortsätt* före platsfrågan, `audio` kvar och *Testa i bakgrunden* i Rösten-fliken.
  ~~🔑 Kvar (Axel): höj byggnumret till (23)~~ ✅ **(23) i main 6/10** (0.3.11, #748) **och byggt i Axels Xcode** efter 81d1a0b (#768); Bengts besked *"klar och hämtad"*. ✅ **(23) uppladdad 6/10 07:25** (App Store Connect, signalen 08:23); App Store-versionen 0.3.9 stod i *Ready for Review* 08:23, alltså förberedd men inte inlämnad. 🔑 **Kvar (Axel):** spela in rösten från hemskärmen med *Testa i bakgrunden*, svara Apple och lämna in igen (kontrollera att versionen i App Store Connect är 0.3.11, inte 0.3.9, innan inlämningen) · "Copyright:" ur copyright-fältet vid nästa redigering · vid godkännande: Axel väljer releasedag.
  Verify: ✅ *Waiting for Review* med (20) — uppfyllt 00:09. Återstår: Apples svar.
  Verify: *Waiting for Review* i App Store Connect med (19) eller senare bifogat; sedan Apples svar.

- [ ] 📣 **#281 MARKNADSFÖRING UTAN PENGAR** (Axels order 2/10 00:17: *"vi måste verkligen börja med marknadsföring utan att spendera
  pengar … förstår att vi måste köpa hemsidan men utöver det"*). Planen: `docs/MARKNADSFORING-NOLLBUDGET.md`, artefakt
  https://claude.ai/artifact/XcFLRPAK4Y2FK52Sa1tUeX (källa `docs/MARKNADSFORING.html`, privat tills Axel delar) — bygger på det som finns
  (Trafikverkets data, livekartan, marknadsmotorn, föreningen, Skyltfonden 15/12, Bulltoftabanan jan–mar, kuvösen) och GTM.md:s kanaler
  utan annonsdelarna. Väderstyrd tidslinje: frost ⇒ lokalpress + forum · snökaos ⇒ TT + riks · 15/12 ⇒ Skyltfondsnotis · jan–mar ⇒ Bulltofta.
  🔑 **Axels sex handgrepp (§4):** domänen · ansiktet (rekommendation: föreningen som avsändare, Axel med namn i presskitet) · varumärkeskontona ·
  demovideon 60 s · partnerbreven skickas från hej@halkvakt.se · vem som klistrar in i FB-grupper (inte Axel, DECISIONS #18).
  🔨 **Claude (§5), utan att fråga:** marknadsmotorn igång igen med snölarmet · press.html som presskit · fyra pressmeddelanden · partnerbrev
  (NTF, STR, Trafikverket, If/Folksam, Halkvarning.se) · betygsfrågan i appen efter tredje resan · måndagsmätningen i bedömningen ·
  **"Halkvakt live"** (Axels idé 00:24): motorn postar riktiga larm själv till X/Bluesky/Mastodon/FB-sidan. Push till användarna är ett ägarbeslut (§4.2).
  🔍 **Sök (Axels fråga 00:28, planens §6):** länssidor + vägsidor *"Halt väglag i Skåne just nu"* som publicera-flödet skriver om var 30:e minut —
  byggs i karta-repot i oktober (Google behöver veckor) · domänen före första pressomgången · widget + "Sveriges halaste vägar" som länkbeten · Search Console.
  ✅ **VÄGSIDORNA I DRIFT 4/10 16:00Z** — deploy 37214328745 ur 45a07b4 · karta-repots commit 7f3b8c2 med `vag/` för alla sex · sitemapen 34 adresser · Pages svarar på `/vag/e4/`.
  🔨 **VÄGSIDORNA BYGGDA 4/10** (DECISIONS #458): `vag/e4/`, `e6`, `e18`, `e20`, `e22` och `rv40` med samma källor. Vägnumret jämförs utan
  form, och stationerna hör till vägen för sin närmaste sträcka. Översikten och länssidorna länkar dit. ~~🔑 Kvar: deploy på *slå ihop*.~~ ✅ (raden ovan).
  ✅ **LÄNSSIDORNA I DRIFT 4/10 10:00Z** — deploy-supabase 37193469610 ur 5459907 · kartvarvet 10:00:50Z commit 5b31056 i karta-repot: 21 länsmappar och lan/index.html, sitemapen 28 adresser (Axels 6 + 22) · Pages svarar 200 på /lan/ och /lan/skane/ 10:01:24 · manifestets live-sha = sha256(live.json) i samma varv · körtiden 49,6 s med 23 filer i trädanropet mot 47,9–52,9 s (median 49,3 s, tolv kartvarv) före (dbknapp 37193406335 och 37194034793).
  🔨 **LÄNSSIDORNA BYGGDA 4/10 (Bengts *"B för länssidorna"*, DECISIONS #458):** Bengts konto kan bara läsa karta-repot, så publicera skriver
  `lan/<län>/` för de 21 länen och `lan/` som översikt i kartlagrens varv. Sidorna visar Trafikverkets väglag (halt = motorns regel), vägbanans
  temperatur vid de stationer appen litar på och pågående olyckor. Axels sitemap får adresserna infogade. Prov: `test/lanssidor.test.ts` och
  PostGIS-provet för stationernas län, förhandsvisade i mobilbredd. ~~🔑 Kvar: deploy av publicera på *slå ihop* och en commit i kartrepot med
  sidorna.~~ ✅ (raden ovan). **Axel (valfritt):** en länk till `lan/` från startsidan hjälper Google mer än sitemapen ensam. Vägsidorna därefter.
  ⚙️ **Regel (Axels order 00:31, planens §7): allt som kan gå av sig själv när det är uppsatt ska gå av sig själv** — motorn, Halkvakt live,
  länssidorna, nyhetsbrevet, pressutkast vid larm, måndagsmätningen, widgeten, årsrapporten. Det som kräver ett ok landar som färdigt utkast med en knapp.
  Verify: 12 Android-testare + 50 iPhone-installationer till första snön; 1 000 installationer, 5 pressomnämnanden, 100 facitsvar till 31/12 (§6).

**Beslut som väntar, inte brådskande (med Bengt):**
### Axel — beslut att ta
- [x] ⏰ **#86 NYCKELKALENDERN — två nycklar går ut mitt i säsongen** ✅ **STÄNGT 27/9 ↪ `docs/KALENDERN.md`** (Bengts ja: *"ja till kalenderlistan och stäng korten"*, DECISIONS #381). Vakten är byggd och bevisad — nyckelkalendern är check 10 i vakthunden, prövad 15/9 med issue #272 som läste PAT:ens datum live. Det som återstod var inte arbete utan **två datum någon måste läsa av**: PAT 22/11 (rotera senast 15/11) och Supabase-tokenen 8/12 (senast 1/12). De bor nu i kalendern, som äger dem. Kortet kunde aldrig bockas av så länge det bar en plikt som återkommer (Axels fynd 9/9, kort av Claude):
  ⚠️ **18/9 — ett fjärde ställe, okänt om samma nyckel:** pulsklockans jobb i Supabase pg_cron bär en GitHub-nyckel i
  sina kommandon (körningarna startas av *Axelstar*). Går den ut stannar ingest, grannar, healthcheck, marknadsföringen och
  måndagsserien (#160) samtidigt. Byts i malljobbet `puls-ingest-grannar`; `pulsklocka.yml` skarp kopierar till alla. Frågan
  till Axel står i bedömningen §4.2.
  ✅ **KONTROLLERAT 18/9 (DECISIONS #237):** pulsjobben bär **samma PAT** som publicera och vakthunden (fingeravtryck
  `a0880e9a` i alla elva jobb och i GitHub-hemligheten), och den går ut **2026-11-22 20:55:49 UTC**. Nyckelkalendern läser
  nu pulsnyckelns datum och larmar om jobben bär olika nycklar. **Bytet är en knapp:** efter steg A och B ovan — tryck
  `pulsklocka.yml` med läget **nyckel**; den provar att nyckeln får starta ett flöde, skriver den i alla pulsjobb och
  läser tillbaka. Prövad skarpt 18/9 04:50Z med nuvarande nyckel.
  · **PAT:en (kartrepot/publicera + vakthundens larm) går ut 22/11.** · **Supabase-tokenen (deploy-knappen)
  går ut 8/12.** Båda slutar fungera utan att något ser trasigt ut: publicera får 401 ⇒ CDN fryser ⇒ appens
  åldersspärr tystnar vakten (5/9-läget), och vakthunden kan inte larma om det eftersom larmvägen använder
  samma PAT. Axel lägger påminnelser; tavlan bär datumen. REGEL (CLAUDE.md-läxan om rotation): en ny nyckel
  är inte "bytt" förrän ett BYGGE/en publicering gått igenom med den — rotera PAT:en senast **15/11** och
  bevisa med nästa kartrepo-commit, Supabase-tokenen senast **1/12** och bevisa med en deploy-supabase-körning.
  Vakthunden borde dessutom kontrollera PAT:ens utgångsdatum (GitHub svarar med `github-authentication-token-
  expiration`-headern) och larma 14 dygn före — eget litet kort när Issues:Write finns.
  🔑 **ROTERA NU, INTE I NOVEMBER (Bengt 9/9 12:00; förberett av Claude, GO AHEAD skickat till Axel):** idag
  finns bevisen färdiga (larmprov via DB-knappen, publicera var 10:e min, deploy-knappen); i november byggs de
  i mörker mitt i säsongen. FYND i förberedelsen: PUBLISH_TOKEN sitter på TRE ställen, inte två — Supabase
  Edge Function Secrets (publicera + vakthund) OCH GitHub Secrets (ingest-grannar pushar fi/dk-snapshoterna
  med den). Missas det tredje dör fi/dk-publiceringen tyst 22/11. AXELS ORDNING (5 + 5 min):
  **A. PAT:** GitHub → Settings → Developer settings → Fine-grained tokens → ny: namn "Halkvakt publicera
  2027", utgång **2027-04-30** (efter marsdomen), resource owner Axelstar, repon halkvakt-karta + Halkvakt,
  Repository permissions: **Contents Read and write** (kartrepot) + **Issues Read and write** (Halkvakt) +
  **Actions Read and write** (pulsklockan startar flödena, vakthunden läser körningarna — tillagt 18/9, DECISIONS #237),
  inget annat. Klistra in som PUBLISH_TOKEN i (1) Supabase → Edge Functions → Secrets och (2) GitHub →
  Halkvakt → Settings → Secrets → Actions. Ta INTE bort den gamla än.
  **B. Supabase-token:** Supabase → Account → Access Tokens → ny "Halkvakt deploy 2027", utgång 2027-04-30,
  samma scope som 9/9 (projekt Halkvakt, ENDAST Edge Functions: Write). Ersätt SUPABASE_ACCESS_TOKEN i
  GitHub Secrets. Ta INTE bort den gamla än.
  **C. Pulsjobben (tillagt 18/9):** efter A — GitHub → Halkvakt → Actions → pulsklocka → Run workflow, lage = **nyckel**.
  Knappen provar att nya PUBLISH_TOKEN får starta ett flöde, skriver den i alla pulsjobb och läser tillbaka; utan
  Actions-behörigheten i A fäller den på provet och byter inget.
  **BEVIS (Bengt/Claude kör, inom 15 min efter A och B):** (a) nästa "(Supabase)"-commit i kartrepot med
  manifest-sha = sha256(live.json) — publicera skriver med nya PAT:en; (b) DB-knappen larmprov ⇒ ny issue med
  etiketten vakthund, auto-stängd nästa timme — vakthunden larmar med nya PAT:en; (c) nästa grannar-körning
  (:24) lämnar fi/dk-commit — GitHub Secrets-kopian fungerar; (d) deploy-supabase på vakthund grön — nya
  Supabase-tokenen fungerar. FÖRST DÅ: Axel raderar de två gamla nycklarna, och kortet stängs med datumen
  2027-04-30 som enda vakt. Bevis efter raderingen: (a) och (c) en gång till.
   ⏰ KVÄLL 10/9 17:32: ingen deploy-supabase-körning efter 9/9 05:20, ingen ny vakthund-issue efter #91 (9/9)
   ⇒ Axel har inte roterat än. De fyra bevisen väntar.
   ⏰ MORGON 11/9 04:31: oförändrat — ingen deploy-supabase efter 9/9 05:20, ingen vakthund-issue efter #91.
   ⏰ **12/9 18:51: fortfarande INTE roterat.** Två saker ser ut som bevis men är det inte: deploy-supabase
   har körts 6 gånger sedan 9/9 (körning 3–8, senast 12/9 17:22) — men med tokenen från 9/9, inte en ny;
   och tre vakthund-issues (#109, #131, #151) är LARMPROV från DB-knappen, inte kedjebrott och inte
   rotationsbevis. Larmvägen är därmed bevisad tre gånger till. Rotationen väntar på Axel.
  ⏰ MORGON 13/9: fortfarande ej roterat, ingen rotationsnotis i STATUS/TAVLA/DECISIONS. ⚠️ OBS för
  framtida avläsningar: "finns en deploy-supabase-körning" duger INTE längre som indicium — jag körde
  den själv två gånger i natt för kassavakten. Bevis är en notis om NY nyckel, inget annat.
  ⏰ KVÄLL 13/9: ingen rotationsnotis i STATUS, TAVLA eller DECISIONS. Oförändrat.
  ⏰ MORGON 14/9: ingen rotationsnotis. Oförändrat.
  🗓️ **KALENDERN BYGGD I VAKTHUNDEN 15/9 (bedömning v3 N3, DECISIONS #190, PR #270):** check 10 läser PAT:ens utgång
  ur GitHubs svarshuvud, Supabase-tokenens (8/12) ur koden; larm 14 dygn före i egen issue `nyckelkalender` (06 UTC);
  prov `nyckelprov` via dbknapp. VÄNTAR: deploy vakthund + prov. ROTATIONEN ÄR FORTFARANDE AXELS (senast 15/11).
  ✅ I DRIFT 15/9: vakthund deployad 15:52Z, `nyckelprov` gav issue #272 (15:53Z) — PAT:ens datum läst LIVE ur
  GitHubs svarshuvud: **2026-11-22** (67 dygn), Supabase **2026-12-08** (83 dygn). Provissuen stängs 06 UTC 16/9. Rotationen: Axel.
- [ ] 📵 **#214 PLAY-DEKLARATIONEN ÄR OSANN SEDAN 16/9** (genomlysningen 20/9). `docs/PLAY-DATASAFETY.md` svarar **"No"** på
  Googles insamlingsfråga och påstår att enda utgående trafik är en GET utan parametrar. Filen rördes senast **27/8**. Sedan 16/9
  POSTar `FacitSender.kt` varnings-id, tid, app och version — och `sql/022` erkänner själv att "ett svar är alltså en plats och
  en tid". En felaktig deklaration är grund för avslag eller nedtagning mitt i vinterns enda facitfönster.
  🔑 **Kräver också ett beslut:** ska produktinvariantens lydelse ("ingen positionsdata lämnar telefonen") formuleras om, eller
  ska facitsvaret ändras? Bengt + Axel.
  Verify: filen rättad, formuläret ifyllt likadant, och båda i samma commit som nästa uppladdning.
  🔨 **BYGGT 20/9 kväll (DECISIONS #270):** `docs/PLAY-DATASAFETY.md` omskriven — insamlingsfrågan svarar **Ja**,
  datatypen är **Location → Approximate location** (varnings-id + klockslag säger ungefär var och när), *Optional*,
  *Collected men inte Shared*, *inte kopplad till identitet*, ändamål App functionality + Analytics. Utgående trafik
  listad ur koden (GET snapshot utan parametrar · POST facit-svar bara vid tryck). CLAUDE.md:s invariant omskriven.
  ➕ **FJÄRDE STÄLLET, hittat 20/9 när butiksmaterialet lästes:** `marknadsforing/butik/butikstext.md` sade
  *"Vi samlar in: ingenting"* i integritetsstycket — Google läser butikstexten bredvid formuläret. **Rättad.**
  Påståendet stod alltså på fyra ställen och ingen av dem rördes 16/9; det är därför regeln i CLAUDE.md nu namnger
  alla fyra.
  🔑 **TVÅ SAKER KVAR, BÅDA ÄGARBESLUT:** (a) **raderingsfrågan** — formuläret frågar om användaren kan begära radering,
  och vi har ingen väg: inget i ett svar identifierar avsändaren. Tre alternativ i filen, rekommendation "svara Nej och
  förklara varför"; (b) **`integritet.html` i karta-repot ljuger också** — *"Kärnlöftet: din position lämnar aldrig
  telefonen"* och *"Vad vi samlar in: Ingenting"*. Google jämför formuläret mot policyn, så den måste ändras i samma
  veva. Utkast skrivet, väntar Axels ja — det är ett publikt löfte.
  📏 **26/9: (b) är klar** — `integritet.html` skrevs om 23/9 (DECISIONS #320). **Kvar bara (a) raderingsfrågan**, Axels ja.
  🔨 **26/9: (a) avgjord — Nej** (Bengts *"gör 214"*, DECISIONS #378). Filen besvarad; policymeningen färdig i filen men inte
  publicerad (Bengts konto saknar skrivrätt i karta-repot). 🔑 Kvar: Axel klistrar in meningen i `integritet.html` och fyller i
  formuläret i Play Console vid första uppladdningen.
  *Beslutet som bygget vilar på:* invarianten skrivs om till *aldrig utan aktivt val* — ingen
  positionsdata lämnar telefonen automatiskt; det enda som skickas är ett facitsvar föraren själv trycker på. Data Safety svarar
  sanningsenligt **Ja** (ändamål: förbättra varningarna; frivilligt; kan inte kopplas till person). **Bygg nästa varv:** CLAUDE.md:s
  invariant, `docs/PLAY-DATASAFETY.md` och produktboken i samma commit.
  ↦ **Sorterat 22/9 (kort #224):** kvar är ägarbeslut — raderingsfrågan och integritet.html; produktbokens rad 21 och 82 rättades 22/9 (DECISIONS #304).
  ↪ **Hit 24/9 (DECISIONS #346):** ur *Butiksuppladdning + Data safety-inklistring* (29/8, låst: Play-kontot). Inklistringen av formuläret är sista steget här och följer Verify-raden ovan. Själva uppladdningen står i *Play: uppladdningsguide*, och iOS går före Android (DECISIONS #320).

### Axel — hösten (brainstorm 31/8)
- [ ] **Skydda namnet:** varumärket Halkvakt hos PRV + domänen halkvakt.se. Enda juridiska
  muren som finns i branschen; arkivet och relationerna är resten av försvaret.
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** *Domänen halkvakt.se (vilande beslut)* — domänen blockerar QR-sidan (#204), så den är inte längre vilande.
  ↪ **1/10 (DECISIONS #423):** domänen är också nyckeln till QR-koden till appen (kort #277, Bengt: *"qr kod kommer först med domänen"*).
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: varumärket Halkvakt inlämnat hos PRV (ansökningsnumret i DECISIONS) och domänen halkvakt.se registrerad, med ägaren bokförd.
### Axel — därefter
- [ ] **Tolv testare till Play-perioden** — Axels åtagande 31/8: "hittar dem utan problem".
  Väntelisterutan på kartan borttagen på hans beslut. Kvar i `docs/REKRYTERING.md` om det behövs.
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** kort 6 *Tolv testare till väntelistan* (samma tolv).
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: tolv testare inlagda i Play Consoles slutna test, och första dygnet av de fjorton bokfört.

- [ ] 🔄 **#258 iOS LADDAR ALDRIG OM VÄGDATAN UNDER RESAN** (fynd 26/9 under #218, DECISIONS #370). Vägdatan laddas när vakten
  startar och när Vakten-vyn visas (`GuardManager.swift:230`, `VaktenView.swift:68`); under resan ligger körläget som helskärm över
  vyn, så ingenting laddas om. Åldersvakten (45 min väder, 120 min olyckor och djur) prövas bara vid laddningen ⇒ en tre timmars
  resa varnar på starttidens is och olyckor, och nya olyckor når aldrig telefonen. Android förnyar var 30:e minut (`SnapshotSchedule`).
  Läst i koden, inte framkallat. Nyckel: Bengts ja till bygget (§4.2) · Axels Xcode-bygge. Verify: en resa längre än 30 min där
  körlägets rad *väglag HH:mm* flyttar sig framåt utan att appen öppnats.
  🔨 **BYGGT 26/9, 0.3.9 (16)** (Bengts ja, DECISIONS #371): var 30:e minut under resan, en laddning i taget, en minuts paus
  efter fel, minnet behålls mitt i resan (`updateHazards`); utan nät gäller cachen och åldras. Skrivet utan kompilator.
  🔑 Kvar: Axels Xcode-bygge (första kompileringen) och Verify i bil.
  ↪ **Flyttat 26/9 från *Bengt*** (femma åtta, DECISIONS #377): nästa steg är Axels bygge 0.3.9 (17).
  ↪ **1/10 (DECISIONS #423):** bygget hos Axel är numera **(19)** (`docs/TILL-AXEL-BYGGE-19.md`); (14)–(18) arkiverades aldrig, så (19) blir det första bygget som bär ändringen.
  ✅ **Kompilerad 1/10 22:25 i (19)**, med i (20) hos Apple. ⛔ **Bengts läsning 2/10: Verify-raden går inte att se** — raden *väglag HH:mm*
  försvann ur körläget med skinnet v3 (31c58e6); strängen räknas (`GuardManager.swift:128`) men visas bara som *Hämtar/Trafikverket live* på
  *Redo.*, som inte syns under resan. Axels resa 1/10 12:39 räknas inte (bygge utan lagningen).
  🔨 **VÄG 1 BYGGD 2/10 13:50 (DECISIONS #434):** klockslaget tillbaka i körläget, till höger om *PÅ DIN VÄG* — som Androids rad under
  *I närheten*. **Bygge (21)** i samma commit; produktboken följer med. Rör inte (20) hos Apple: (21) går till TestFlight, butiken får det
  som nästa version. ✅ **(21) uppladdat 2/10 13:56** (Axel, Xcode) — interna gruppen får det direkt. 🔑 Kvar: en resa på 45–60 min i (21)
  där klockslaget vid *PÅ DIN VÄG* flyttar sig minst en gång (servern publicerar var tionde minut, appen hämtar var trettionde). Axel eller Bengt.


- [ ] 📱 **#279 iOS: EFTER-RESAN-KORTET GICK UTANFÖR SKÄRMEN** (Axels skärmbild 1/10 21:35 från en resa 12:39–13:44 med fyra kameravarningar;
  samma fel som Bengts provresa 28/9 på 4,7 tum, `docs/TILL-AXEL-BYGGE-19.md` iPhone 1–3). `VaktenView` och `KorlageView` hade ingen
  `ScrollView`: med fyra rader var kortet högre än skärmen, iOS tryckte ihop texterna till "…" (*"stämde alla 4 varning…"*, *"tystnad
  räknas aldrig som…"*), kortets topp låg under statusraden och facitraden under flikraden. Dessutom: facitknapparna TVÅ gånger (kortet
  och S4:s `FacitRow` under *Senaste tur*, samma varning), *"Skickat 22:00 (1 svar)"* från ett tidigare dygn under dagens varningar
  (statusraden överlever omstart utan datum), *"Senaste tur · 1 Oct at 12:39"* på engelska, och *"Din position stannar i telefonen"*
  (#320:s missade rad).
  🔨 **BYGGT 1/10 kväll (DECISIONS #430), skrivet utan kompilator:** båda skärmarna rullar när de måste, minsta höjd = skärmen så stora
  telefoner ser ut som förut · `FacitRow` göms medan kortet visas · den gemensamma statusraden i kortet bara vid fel och bara den här
  resans (`facitStatusAt`); en vald miss säger *Skickad* själv; *"1 miss"* / *"2 missar"* · alla klockslag på svenska (`Date.klockslag`,
  `dagOchKlockslag`, sv_SE) · *"lämnar inte telefonen av sig själv"* · `CURRENT_PROJECT_VERSION` 19 i samma commit. Betaguiden §5 steg 3
  och produktboken följer med. Android orörd (hemskärmen är en `LazyColumn` och rullar redan; dess dubbla knappar och statusrad står
  kvar i `TILL-AXEL-BYGGE-19` Android 1).
  ✅ **KOMPILERADE OCH UPPLADDAT 1/10 22:25** (Axels Xcode, Organizer: *Halkvakt 0.3.9 (19) uploaded*, ur 4f88513); ✅ **TESTING I KOMPISARNA 22:34**
  (App Store Connect-skärmbild: (19) *Testing*, (14) *Testing* 37 sessioner — samma versionsnummer ⇒ ingen ny granskning). En varning i bygget —
  `EfterResanNotis.actionJa` läst ur nonisolated delegat — rättad i main samma kväll, går med i (20).
  🔑 Kvar: Axels blick på telefonen (Verify nedan) · nya iOS-skärmbilder till produktboken ur (19) · 4a dubbeltrycksspärren och 4b Siri när
  vakten är av (Axels beslut, §4.2).
  🔨 **ANDROIDS STATUSRAD BYGGD 4/10** (`TILL-AXEL-BYGGE-19` Android 1, Bengts *"kör på"*): samma regler som iPhone, som rena funktioner i
  `Facit.kt` med JVM-prov, och raden bär sin tid (`facit_status_at`). 📏 Bevis: android 37183577252 grön på c02514a (`:app:compileDebugUnitTestKotlin` och `:app:testDebugUnitTest` körda, BUILD SUCCESSFUL). Androids spärr mot dubbeltryck följer 4a.
  Verify: på en iPhone finns inget "…" i kortet med fyra varningar, sista raden ligger ovanför flikraden, *Stämde*-knapparna finns på ett
  ställe, ingen *Skickat*-rad under en obesvarad rad, och *Senaste tur* skrivs *1 okt. 12:39*.

- [ ] ↩︎ Välkomsttext + testinstruktion till kompisarna (extern TestFlight-grupp = Beta App Review).
  ↩︎ **Rubriken återställd 1/10 sent:** den skrevs över när kort #279 lades in (4f88513), och kortets text hängde under #279.
  🔨 **SKRIVEN 26/9** (Bengts ja, DECISIONS #371): `docs/BETAGUIDE-IOS.md` — TestFlight-texten överst, guiden i Android-guidens
  åtta avsnitt, mot koden i 0.3.9 (16). 🔑 Kvar: utskicket med en extern TestFlight-grupp (Axel, Beta App Review).
  📝 **1/10 (DECISIONS #429):** meningen om trösklarna i TestFlight-texten är omskriven — klistra in ur filen som den står nu, inte ur en äldre kopia.
  ✅ **1/10 22:34: (19) är *Testing* i den externa gruppen *Kompisarna*** (2 testare, publik länk `testflight.apple.com/join/PT59wKNC`); (14) låg där
  sedan Beta App Review 26/9. Texten ur guiden klistrad in 1/10. 🔑 Kvar: själva utskicket av länken till de tolv — Axel, ikväll eller i morgon.
  ↦ **Sorterat 22/9 (kort #224):** texten för iOS-testarna skriver Claude nu; utskicket med en extern TestFlight-grupp är Axels.
  ↪ **Flyttat 26/9 från *Claude — olåst*** (femma åtta, DECISIONS #377): nästa steg är Axels utskick i TestFlight.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: länken utskickad till de tolv, och minst tolv testare i Kompisarna i TestFlight (kartsynkens regel testare:Kompisarna:12 bockar steget).

- [ ] 🔁 **#248 ANDROID-AUTOSTARTEN STOPPAR ALDRIG VAKTEN** (fynd 24/9 under kort #217, DECISIONS #347). `AutostartManager` skapar en ny
  `AutostartController` för varje systemhändelse, och den nya styrningen har `autoStarted = false`. Därför blir *Bluetooth kopplas
  från* och *bilen lämnas* alltid *gör ingenting* (`onAclDisconnected`, `onVehicleExit`). Android har dessutom ingen tomgångsstopp
  efter en kvart stilla, som iOS har. En autostartad vakt går alltså tills föraren stoppar den — batteribudgeten (< 8 %/h) är ett
  släppstopp enligt CLAUDE.md. Läs `skills/halkvakt-android/SKILL.md` före koden.
  Verify: ett JVM-prov som skapar styrningen på nytt mellan start- och stopphändelsen faller före lagningen och passerar efter;
  på en riktig telefon stannar en autostartad vakt när bilens Bluetooth kopplas från.
  ✅ **BYGGT 24/9 (DECISIONS #348):** flaggan sparas mellan styrningarna, självstopp efter en kvart stilla (`IdleStop`), tre JVM-prov. Kvar: verify i bil på Android.
  ↪ **Flyttat 26/9 från *Claude — olåst*** (femma åtta, DECISIONS #377): nästa steg är provet i bil på Axels Android.

- [ ] 🤖 **#219 ANDROIDS VÄG TILL PLAY — enhetsverifiering, första uppladdning, slutet test** (rubriken löd 20/9 *Android är sju versioner efter och har ingen väg till en telefon* — överspelad 29/9, DECISIONS #402; rubriken rättad 1/10, #423; genomlysningen 20/9). Android står på
  📍 **Läget 4/10 13:00 (Axel i Play Console):** identiteten inskickad till Google ("kan ta några dagar", mejl när klar). Appen går inte att skapa förrän alla tre kontouppgifter är gröna. Telefonnumret låst tills identiteten godkänts. Enhetsverifieringen: Axel har ingen egen Android, lånar en väns och loggar in i Play Console-appen. Deklarationen om bakgrundsplats rättad samma dag (PR #747). Medan Google granskar: tolv testares Gmail-adresser och fem råbilder plus demovideon ur den lånade telefonen.
  **0.3.1 (versionCode 4)**, iOS på 0.3.8 (11). **Google Play-kontot finns inte**, det finns inget uppladdningsflöde alls — CI
  bygger en AAB som artefakt och där slutar det. Android saknar dessutom introduktionen helt och har autostart av som standard.
  Om tolv testare i november ska hålla är Play-kontot en grind som måste passeras i september.
  Verify: en Android-testare utanför projektet har appen installerad och har skickat ett facitsvar.
  ↪ **Hit 24/9 (DECISIONS #346):** ur *Fysisk Android-testenhet* (29/8). Telefonen finns: Axels Android med appen sedan 20/9 (DECISIONS #280). Kvar är enhetsverifieringen i Play Console: webben som kontots ägare, uppgiften *Kontrollera att du har åtkomst till en mobil Android-enhet* på startsidan, sedan Play Console-appen på telefonen (Googles sida läst 20/9 och 22/9, DECISIONS #279). Verify: uppgiften försvinner från Play Consoles startsida.
  ↪ **Hit sammanslaget 26/9 (Bengts ja, femma sju, DECISIONS #373):** *Skinnet v3 på Android* och *Play: uppladdningsguide* — samma Play-konto och samma telefon som #219. Ordagrant:
    ↩︎ Skinnet v3 på Android — del 1+2 committade 2/9 (5829d29, ee72f22: Theme.kt, fonter,
    fem ikoner, två flikar). Bevis på telefon saknas; bockas när Axel sett det.
    📏 **Läst mot koden 24/9 (kort #217, DECISIONS #347):** Android skiljer sig från iOS på fem punkter — ikonerna finns men visas inte · varningskortet har rubriken *HALKVAKT VARNAR*, ingen stapel och knappen *Uppfattat* · körläget heter *PASSAGERAREN ÄR VAKEN* och saknar demokortet · inget kvitto under *Starta vakten* · statuspillen säger *LIVEDATA* där iOS säger *Trafikverket live*. Vilka som ska bli som iOS är Axels beslut; produktboken beskriver båda.
    ↩︎ Play: uppladdningsguide för den CI-signerade AAB:n + fotostudion tag 2 (facit ur CI +
    produktboken) *(låst: Play-kontot)*.
  ↪ **Flyttat 26/9 från *Claude — olåst*** (femma åtta, DECISIONS #377): nästa steg är Play-kontot och testtelefonen.
  📋 **FREDAGENS LISTA 2/10 (Axels order 00:12: *"sen imorgon är det Play Store som måste ut"*; skriven 00:15):**
  | # | Vad | Vem |
  | :-- | :-- | :-- |
  | 1 | Fem skärmbilder ur Androiden (Redo., körläget, varningskortet, Inställningar, Efter resan) ⇒ Claude ramar in till 1080×2160 (Play tar högst 2:1; CI:s fotostudio är 320×640, för liten) | Axel → Claude |
  | 2 | Play Console: **enhetsverifieringen** (uppgiften på startsidan + Play Console-appen på telefonen) | Axel |
  | 3 | **Butiksuppgifter**: namn, kort och lång beskrivning ur `marknadsforing/butik/butikstext.md` (rättad 2/10), ikon 512 och feature graphic (gjorda 1/10), skärmbilderna, kategori Kartor & navigering, kontakt | Axel, Claude på skärmen |
  | 4 | **Appinnehåll**: integritetspolicy-URL (github.io/integritet.html), **Datasäkerhet exakt som `docs/PLAY-DATASAFETY.md`** (#214: Ja · Location → Approximate · frivillig · insamlad, inte delad · inte kopplad · App functionality + Analytics · radering Nej), annonser nej, appåtkomst ingen inloggning, innehållsklassning (IARC-frågorna), målgrupp vuxna, nyhetsapp nej, statlig app nej | Axel, Claude på skärmen |
  | 5 | **Slutet test**: ladda upp AAB:n ur senaste gröna android.yml på main (artefakten `halkvakt-release-aab`, versionCode 19 efter #262 — kontrollera att numret stämmer med iOS (20) först, annars ett bygge till), skapa testarlistan (tolv mejladresser) och publicera testet — då startar Googles 14 dygn | Axel |
  | 6 | Utskick till de tolv med Play-länken + Android-guiden | Axel |
  ↪ **29/9: rubriken överspelad (DECISIONS #402).** Android bär 0.3.9 (18) som iOS sedan 26/9 (#377, #379) och Play-kontot finns sedan 20/9. Kvar är bara Play-vägen: enhetsverifieringen i Play Console, första uppladdningen med Data safety-formuläret ifyllt likadant som filen (#214), slutet test 14 dygn med tolv testare, produktion tidigast november. Verify-raden gäller oförändrad.
### Bengt

- [ ] 🛣️ **#301 VÄGDATALAGRET — EN TABELL, ÅTTA ANVÄNDARE: VÄGENS EGENSKAPER PER STATION, SEGMENT OCH VÄGPUNKT** (Bengts order 7/10 efter C8-analysen och Axels fysikspår; DECISIONS #472). Det som ska delas är inte modellen utan datalagret: ÅDT (totalt, lastbilar, **lätta fordon 22–06**), funktionell vägklass, slitlager, vägbredd, hastighetsgräns, motorväg, väghållare — **ur öppna API:et med nyckeln vi redan har** (NVDB i API:et sedan 7/2 2025; källkartläggningens "kräver Lastkajen" gäller inte längre) — plus Axels himmelsfaktor, skog, vatten, terrängläge per plats med proveniens. Som statisk vägdata i `data/vagdata/` (tre filer, tre nycklar), spann i värdevakten, kuvösen läser in till `kuvos_ra.vagdata`, driften får en tabell först vid byggbeslut. Användare: prognoslagret C8 (#298), fysikspåret, kallplatserna (#91), efterhalkan (pris per vägklass/salt, #296/#297), vattenplaningen (spårdjup ur PavementData, #42), rimfrosten, vind/sikt, frysklassningen, tystnadsfelet, kamerafacit. **Steg 1, rekognoseringen** (`scripts/vagdata-rekognosering.ts`, knappen `vagdata-rekognosering`): spår A finns datamängderna · syntaxprov INTERSECTS/WITHIN · spår B träff per platstyp på stickprov · spår C spårdjup; läser, lagrar inget. **Steg 2, hämtaren** (`--alla`, skriver filerna) och **steg 3**, Axels kolumner in — efter rekognoseringens svar. ✅ **STEG 1 KLART 7/10 04:25Z** (körning 2: 37569902629; körning 1 föll på attributnamnet — `Geometry.WKT-WGS84-3D` gäller): **stationer 99–100 %, segment 100 %** för alla sex NVDB-datamängderna, vägpunkter 14–55 % (rutternas grova linjer, inte NVDB); 5–7 objekt per träff ⇒ hämtaren måste välja rätt väg (vägnummer/klass/väghållare); spårdjupet finns i MeasurementData20 utan geometri (län + vägnummer + längd, via RoadGeometry). Full hämtning ≈ 20 000 anrop ≈ 1 h. ✅ **Bengts ja 7/10. STEG 2 BYGGT OCH FÖRREGISTRERAT (DECISIONS #473):** `scripts/vagdata-hamta.ts` + knappen `vagdata-hamta` — sex datamängder i en förfrågan per plats, vägvalet lägst klass ⇒ statlig ⇒ störst ÅDT, vägpunkterna med vidgad radie i stället för snappning, spannen i värdevakten (importerad, fäller vid brott), filerna som artefakt och i PR. 🔑 Kvar: stickprovskörningen, sedan hela; filerna in i `data/vagdata/`; Lastkajen bara för det API:et saknar (vinterväghållningsklass, bro). *Verify:* rekognoseringen körd och bokförd med täckning per datamängd och platstyp; `data/vagdata/` med huvud, spann i värdevakten och grön CI; kuvösen läser tabellen i en läsning.

- [ ] 🚦 **#299 SPRIDNINGSGRINDEN OCH NATTBEGRÄNSNINGEN — TVÅ FÖRSLAG TILL TROSKLAR-SKUGGAN UR KUVÖSEN** (DECISIONS #471 utfall, `docs/PROGNOSLAGRET-VAGAR-2026-10-06.md` §5). **(1) Spridningsgrinden:** lagret tiger när ankarna är oense — med spridning 0,5–2 °C (59 % av punkterna) har OFFSET 1,8 % grova fel, 0–2 °C (66 %) 2,4 %, över 4 °C 28 %; RÅ 0,5–2 °C (49 %) 2,5 %. Kräver minst två ankare (ett ankare ger spridning 0 och 7,6 %). Gränsen X läses ur tabellen, inget val gjort. **(2) Nattbegränsningen:** tala bara när solen är under −6° — natten 4,2 % på 63 % av punkterna, varje månad under 5 % utom januari (5,7 %); dagen 11 % i februari, 18 % i mars. Båda är ändringar av TROSKLAR-SKUGGAN (vägpunkten §3) med båda signaturerna, aldrig lättnader: de tar bort punkter, de sänker inget krav. Mäts i skuggan i vinter innan någon röst. 🔑 Nyckel: Bengts och Axels ja, nej eller ändrad lydelse; X och −6° fastställs i dokumentet före skuggmätningen. *Verify:* lydelsen i TROSKLAR-SKUGGAN med båda signaturerna, och skuggmätningen (täckning och A2 med grinden) körd en gång i vinter och bokförd.

- [ ] 🗺️ **#298 PROGNOSLAGRET — ALLT PÅ BORDET: FEMTON VÄGAR, FYRA MÄTBARA I KUVÖSEN NU** (Bengts fråga 6/10 kväll *"finns det något jag förbisett … kom med allt du har nu"*; `docs/PROGNOSLAGRET-VAGAR-2026-10-06.md`). Felet har tre delar: platsens särart (störst, bara lärd ur historik), regimen (klart/stilla/sol gör den stor — felet växer mot våren i alla band) och avståndet (10–20 km). Vägarna: A tig rätt — **(1) ankarspridningen som grind**, (2) natt/säsong, (3) 7 km formaliserad; B bättre modell — **(4) regimstyrd offset** (molnmängd finns i kuvösen), (5) offset per månad/timme, (6) residualkorrektion i realtid, (7) kriging med egen varians; C **(8) kovariatmodellen tränad på stationernas offset** — facit finns redan, karteringen behövs inte för att pröva; D (9) termisk kartering #271, **(10) Trafikverkets egen vägväderprognos — fråga Micke**, (11) MESAN/MEPS för regimen, (12) fordonsdata stängd, (13) Finland som stöd; E (14) klass + marginal, (15) förstärkare aldrig utlösare (redan regel). Sannolikt förbisett: 1, 8 och 10. ✅ **Bengts val 6/10: (a) alla fyra.** Förregistrerade i DECISIONS #471 före körningen; grind A:s modell importerad med varianter (beteendeneutralt, självtest), `scripts/matningar/kuvos-prognoslagret-2026-10-06.ts` på knappen `kuvos`. ✅ **KÖRDA OCH LÄSTA 6/10 21:20Z** (37530898977, DECISIONS #471 utfall): (1) spridningen skiljer — 0,5–2 °C ger 1,8 % grova fel på 59 % av punkterna, > 4 °C 28 %; (2) vårens fel är dagsljuset — natten 4,2 %, dagen 18 % i mars; (4) regimstyrd offset ger 5,5 → 5,2 %, bara i klar stilla natt; (8) grova kovariater förklarar inget (R² 0,01) — särarten är mikroskala. Förslagen till TROSKLAR-SKUGGAN på kort #299. 🔑 Kvar: 10 går i brevet till Micke (Bengt skickar). *Verify:* de valda läsningarna körda och bokförda i DECISIONS med talen, svaret i bedömningen §7; frågan om prognosen ställd till Trafikverket.

- [ ] 🧮 **#297 MATEMATIKEN OCH FYSIKEN — EFTERHALKANS MÅTT STRAFFAR FÖRSPRÅNGET, OCH DAGGPUNKTEN SAKNAS** (Bengts fråga 6/10 kväll *"bedömningar av matematiken och fysiken bakom beräkningarna"*; `docs/KUVOS-GRANSKNING-2026-10-06.md` §6). **(1) Måttet:** ovanpå räknar fångad bara inom 90 min före facit och uteblev inom 90 min efter fyrningen — en riktig varning 2 h före frysningen blir falsklarm. Måttet och tidsvinsten drar åt motsatt håll; föll ut växer 117 → 147 → 168 när fönstret vidgas och har inte planat ut. Ö-B2 räknar *av tillkomna fyrningar* — varje fyrning med sitt eget 90-minutersfönster (förarens horisont), inte bara nattens första; per natt vore för långt (rättat samma kväll, granskningen §6.2). **(2) Fysiken:** en våt yta kyls tills den når daggpunkten och stannar där (kondensationsvärmet); daggpunkten avgör om fallet fortsätter genom +1, men den finns bara som vakt i regeln, inte som prediktor. **(3)** Övrigt sunt: grind A:s modell rätt verktyg och fysiken (10–20 km, regim, vinterns inversioner) förklarar utfallen; ±1,96 SE på korrelerade halvtimmar är en undre gräns; våtbulbens fasta tryck ~0,1 °C; radarns medianfaktor grov men ärlig. 🔑 Nyckel: Bengts ja till två läsningar i kuvösen — priset per fyrning (per natt bredvid som övre gräns) för de 32 punkterna, och priset/nettonyttan delat på daggpunkten vid fyrningen — förregistrerade före körning, inga trösklar. Därefter Bengts och Axels tre beslut: Ö-B2:s mått i januari, daggpunkten som mars-variant, och om en kalibrering på rätt mått får göras (D7). *Verify:* de två läsningarna körda och bokförda i DECISIONS med talen, och de tre besluten inskrivna i DECISIONS eller uttryckligen avvisade.
  ✅ **Bengts ja 6/10 (*"ja till 297"*). Förregistrerade i DECISIONS #470 före körningen:** M1 priset per fyrning (varje fyrning med eget 90-minutersfönster) för startvärdena och de 32 punkterna, hela vintern och båda halvorna, per episod och per natt bredvid; M2 startvärdena delade på daggpunkten och yta − dagg vid fyrningen, med förutsägelsen skriven före talen. `scripts/matningar/kuvos-mattet-2026-10-06.ts`, knappen `kuvos` med `matning`.
  ✅ **KÖRDA OCH LÄSTA 6/10 20:20Z** (37524718907, DECISIONS #470 utfall; första försöket skrev tomt på nyckelfel, rättat med vakter): **M1** per fyrning startvärdena 43,4 %, lägst 35,0 %, **0 av 32 under 25 %** — måttet ändrar inte kalibreringen, ingen kalibrering om; per natt (övre gräns) 16,7 %, 21 av 32 under 25 %, 116 av 183 *uteblev* frös senare samma natt. **M2** daggpunkten ≤ +1 ger 32,3 % mot 56,8 % (per natt 10,9 mot 22,5 %) och bär 118 av 175 nettonytt; riktningen bekräftad, *klar majoritet inom 90 min* inte (49 %). 🔑 Kvar: de tre besluten (Bengt och Axel): Ö-B2:s mått i januari, daggpunkten som mars-variant, och att ingen kalibrering görs om.

- [ ] ⚖️ **#296 EFTER GRANSKNINGEN — TVÅ BESLUT FÖRE MARS-DOMEN: Ö-B1 "INOM RÄCKVIDD" OCH STARTBANDETS ÖVRE DEL** (DECISIONS #469 utfall, `docs/KUVOS-GRANSKNING-2026-10-06.md` §5). **(1)** Ö-B1:s nämnare avgör om efterhalkan ligger över eller under 5 %: nettonytt 175 är 6,2 % av facit med regn inom 2 h, 4,3 % med 2 h + utfallsfönstret, 3,9 % med 4 h, 3,0 % med 4 h + 90 min. Förslag: *regn inom N h + utfallsfönstret* (en fyrning ryms före facit). Skrivs in i TROSKLAR-OVERGANGAR §4 med båda signaturerna. **(2)** Priset sitter i bandets topp: +1…+2 °C 19,0 %, +2…+3 °C 63,4 % (90 min · 0,5). Svepet vidgar bara bandet uppåt (D1), så ingen kalibreringspunkt kunde nå det; ett smalare band är ett nytt svepvärde i §2 — tidigast som mars-variant (#223/#225), aldrig i betan (D6). 🔑 Nyckel: Bengts och Axels beslut före mars-domen; inget rörs i vinter. **(3)** Övergångarnas eget utfallsfönster är 60 · 120 · 180 min (TROSKLAR-OVERGANGAR §2) medan kombinationen ärver T-A:s 60 · 90 · 120 (TROSKLAR-KOMBINATIONEN §3) — januari-domen behöver säga vilket som gäller Ö-B2 (fynd vid genomläsningen av mätningssidan 6/10). *Verify:* definitionen av *inom räckvidd* fastställd i TROSKLAR-OVERGANGAR §4 med båda signaturerna, och beslutet om det smalare bandet (mars-variant eller nej) i DECISIONS.

- [x] ✅ **#295 KUVÖSENS BERÄKNINGAR GRANSKADE — TRE LÄSNINGAR SOM KAN ÄNDRA BILDEN (KLART 6/10 — läsningarna körda och bokförda, DECISIONS #469)** (Bengts fråga 6/10 *"finns det några missar/misstag/tankefel"*; `docs/KUVOS-GRANSKNING-2026-10-06.md`, läst i koden och loggarna, inget kört). Kontrollerat och rätt: grind A:s fönster går genom klockan, startvärdena räknar lika i båda körningarna, regnmängden är mm/30 min i båda, fukten finns, kalibreringens regel. Tre fynd som kan ändra en läsning: **(F1)** grind A på vintern lärde offseten över 152 dygn mot driftens 60 — *hårdare vinter* eller *längre fönster* går inte att skilja utan en körning på 60-dygnsfönster vid tre klockslag (31/12, 28/2, 31/3); **(F2)** efterhalkans pris 45 % bär två omätta skevheter uppåt (tre utfallsrader i stället för arton; 90-minutersfönstrets aritmetik straffar fall 0,4–0,6 från bandets topp) — mäts med 120-minutersfönstret och nära-bandet 1,0 ur T-A:s svep, läsning utan dom; **(F3)** *nettonytt av facit* måste räknas *inom räckvidd* (regn inom N h) före mars-domen, annars döms efterhalkan mot en nämnare den inte kan nå (Ö-B1). Två som inte ändrar något: diagnosraden *saknade dygn* ur riktig tid, NT:s ordlista (1 411 rader). ✅ **Bengts ja 6/10 (*"ja till 295"*). Förregistrerade i DECISIONS #469 före körningen:** F1 grind A oförändrad på 60 dygn vid 1/1, 1/3 och vinterns slut; F2 priset på samma episoder i 60 · 90 · 120 min × 0,3 · 0,5 · 1,0 ur svepet, och per startyta; F3 regn inom 2 h och 4 h före facit, med och utan utfallsfönstret. `scripts/matningar/kuvos-granskning-2026-10-06.ts`, knappen `kuvos` med `matning`. ✅ **KÖRDA OCH LÄSTA 6/10 19:28Z** (37517980895, DECISIONS #469 utfall): F1 inget fönsterfel — förvintern 3,4 % klarar, midvintern 5,4 % och vårvintern 7,1 % faller, felet växer mot våren i alla band (svaret i bedömningen §7); F2 kontrollen stämmer (45,1 %), priset sitter i bandets topp (+1…+2 °C 19,0 %, +2…+3 °C 63,4 %); F3 nettonytt 6,2 % eller 3,0 % inom räckvidd beroende på definition. De två besluten före mars på kort #296. *Verify:* de tre läsningarna körda och bokförda i DECISIONS med talen, och F1:s svar (fönsterfel eller hårdare vinter) inskrivet i bedömningen §7.

- [ ] 🇫🇮 **#283 UR FINTRAFFICS TJÄNSTER: VAD VI KAN TA EFTER** (Bengts fråga 2/10; `docs/FINTRAFFIC-JAMFORELSE-2026-10-02.md`, läst på
  Fintraffics, Digitraffics och Meteorologiska institutets egna sidor). Fintraffic ger föraren karta, pushnotiser, favoritrutter och
  väglagsvarningar — *före* resan; appen ska enligt dem inte användas under körning. Halkvakt är rösten *under* resan. Fyra förslag, inget
  beställt: **(1)** ruttkollen före resan finns redan hos en statlig aktör med 100 000 användare — stärker kort #233 del 1 · **(2)** Fintraffics
  öppna prognoser per vägavsnitt (277 avsnitt, 2–12 h) in i det finska skuggarkivet, som extern jämförelse för prognoslagret · **(3)**
  väghållningens data (plogning, sandning, saltning, saltmängd) som facit i Finland — den del som saknas i Sverige · **(4)** *"när du kör, så
  kör du"* som ärligt argument i marknadsplanen (kort #281). 🔑 Bengts val (§4.2). Verify: valet inskrivet här; för (2) och (3) en
  DECISIONS-post före bygget.
  📝 **Utvärderingen och läsbar text 2/10 (Bengts frågor):** underlaget omskrivet till löpande text med en utvärdering per område. Samlat: Halkvakt konkurrerar inte med Fintraffic, det kompletterar — Fintraffic är långt före i räckvidd, planering före resan och data, Halkvakt har rösten under körningen och integriteten; träffsäkerheten har ingen av dem visat. Största risken är domarna och bilarnas egna varningar, inte Fintraffic.

- [ ] ⚖️ **#282 REGEL L — FÖRSLAG: ÄNDRING AV EN TRÖSKEL EFTER ATT UTFALLET ÄR SETT** (Bengts fråga och order 2/10: *"skriv ett
  förslag för de fyra leden"*; `docs/FORSLAG-ANDRINGSREGELN-2026-10-02.md`). Tretton tröskeldokument säger på fem olika sätt att en
  lättnad är utesluten när utfallet är sett. Förslaget gör regeln gemensam och preciserar den i fyra led: **L1** domen på lästa data
  står som den föll · **L2** en lättnad gäller bara data som ingen har läst · **L3** en ändring som flyttar ett sett tal mot godkänt
  räknas som lättnad · **L4** skälet får inte vara utfallet. De absoluta undantagen (regel T, K-A2, givarvakten med flera) och regel D
  rörs inte. **Inget tröskeldokument är ändrat.** Hänger ihop med kort #270 (b) och (d). 🔑 Nyckel: Bengts och Axels ja, nej eller
  ändrad lydelse (§4.2) — tre frågor i förslagets §6. Verify: beslutet i DECISIONS med båda signaturerna; vid ja står texten i
  TROSKLAR-KOMBINATIONEN och L-raden i alla tretton dokument i samma commit.
  ⚠️ **EFTERPRÖVAT SAMMA DAG — Claudes rekommendation ändrad till alternativ D: inför inte regel L nu.** Bilaga 7 till Skyltfondsansökan (skickad 30/9, besked senast 15/12) säger *"En tröskel får skärpas men aldrig lättas när utfallet väl är sett"*; L2 och L4 öppnar för lättnad och säger alltså något annat än fonden har läst. Vägen för en fallen fråga finns redan: en ny fråga med egen text (Axel 12/9, D7). D = behåll lydelsen, inför bara L1 och L3 (stränga hållet), ta närbandet och kandidatbytet i #270 som nya frågor, pröva L2 och L4 tidigast efter fondens besked och domen i mars.

- [ ] 📐 **#270 PROGNOSLAGRET EFTER PREMISSMÄTNINGARNA — BENGTS VAL a–h** (30/9, `docs/PROGNOSLAGRET-2026-09-30.md`; DECISIONS
  #405–#408; bedömningen §4.2). Domen står (fallen 28/9, bekräftad 30/9 och på ärliga rader). Bandet 0–7 km håller i båda
  länderna men kan inte dömas med svenska stationer (15 av spärrens 20); Finland ger 108 stationer och 2,3 % [1,1–3,5]; frysflaggan
  vid 1 °C missas i 57 % även inom 7 km, 6 % med en grads marginal; ANOM och regimen (vind + natt) föll. 🔑 Bengts val: (a) veckokörning
  med fast läsdatum 24/11 · (b) precisera grinden till ärliga rader och dom per band med RÅ+HÖJD · (c) inget · (d) egen spärr för
  0–7 km · (e) ÅDT-uttag ur Lastkajen · (f) finska utfallet som stöd · (g) mät flaggmarginalen · (h) molnmängd in i arkivet.
  Rekommendation: a, g nu; b när intervallet inte spänner över tröskeln; h före vintern. *Verify:* varje valt steg har egen
  DECISIONS-post före körning; läsdatum i posten; inga trösklar rörda.
  ✅ **VALT 2/10 (Bengt: *"ok vi kör ja på a, f och g"*):** **(a)** premissmätningen går varje måndag efter höjdprovet och läses en gång, **tisdag 24/11**, på en egen körning; måndagarnas utskrift är driftbevis, inget utfall; skriptet fryst som det står (DECISIONS #435) · **(f)** det finska utfallet är stöd för närbandet, inte dom; den finska mätningen körs samma dag som läsningen (#436) · **(g)** flaggmarginalen mäts i kuvösen på vintern 2024/25 med frysklassningens måttstock — K1 +1,0 °C, K2 0 · 0,5 · 1,0 °C, RÅ och RÅ+HÖJD, alla tre redovisas och ingen väljs; inskrivet i kuvösens förregistrering före filen (#437).
  📏 **Bevis för (a), 2/10:** `ci` grön på grenen (36968020846) och driftprov av måndagskörningen utan inputs, som pulsklockan startar den (36968196427): höjdprovet 56 s, premissmätningen 41 s, populationsläsningen 18 s, alla gröna. Bara stegen lästes, inte talen. Stomdokumenten republicerade samma varv: kuvösen v6, systembilden v15, mätningarna v15 (omnumrerade till #435–#437 samma dag).
  ⏳ **Öppna val:** (b), (c), (d), (e) och (h). Claudes läsning 2/10, inte beslut: (b) tidigast efter 24/11 och då som ny fråga, eftersom kandidatbytet flyttar ett sett tal mot godkänt (kort #282) · (d) inte som ändrad spärr · (h) hämtas en gång i kuvösen (DECISIONS #424 steg 4) innan en löpande hämtning byggs. 🔑 Nästa datum: **24/11**, läsningen.
- [ ] 🧫 **#232 KUVÖSEN — HELA SYSTEMET BAKÅTPRÖVAT PÅ VINTERN 2024/25** (Bengts idé 21/9, DECISIONS #292). Motorn och ALLA
  skuggregler i en gemensam testbädd, långt från appar och förare, körd mot en hel gången vinter — ett RIKTNINGSPROV: är vi på
  rätt väg, och vad tillför varje del ovanpå de andra? Svarar på kartans §7.3: *"Varje grind dömer sin del ENSAM"*.
  🔑 **Nyckeln är EN sak: stationernas mätvärden för den vintern.** Kontrollerat 21/9, på källorna: Trafikverkets API räcker
  sju dygn bakåt · Lastkajen bär vägnätet, inte mätvärden (sidan *Hämta öppen data* läst — en söksammanfattning påstod
  motsatsen) · Vintersidan har *"historisk väderdata från VViS och MESAN"* men är stängd för utomstående · Finland: Digitraffics
  historik är 24 h, och FMI:s vägväderfrågor finns inte längre (151 lagrade frågor listade, ingen för väg) · Norge: Vegvesenets
  flöde är realtid; MET:s Frost-arkiv kräver konto och är inte kontrollerat. **Vägen är alltså en förfrågan till Trafikverket.**
  ✅ **STEG 1 GJORT 21/9 — Bengt har skickat förfrågan via Datautbytesportalens kontaktformulär** (hans besked i chatten).
  ⏳ **BEGÄRAN OM UTLÄMNANDE INSKICKAD OCH OBESVARAD (Bengt 27/9). BENGT 28/9: *"Jag avvaktar beslut om utlämnande från
  Trafikverket inget annat."*** Allt om att driva ärendet — reservformulär, krav på skriftligt avslagsbeslut, överklagande —
  är **stängt** på hans order (DECISIONS #388). Kortet väntar på Trafikverkets beslut och på ingenting annat. Det tidigare
  Datex II-ärendet är obesvarat sedan 17/9; tystnad är mönstret, inte undantaget.
  📨 **TRAFIKVERKET SVARADE 1/10 08:07** — Micke Wallin, VViS Förvaltning (konsult), på Bengts ärende med ämnet *"Vädervarningar"*:
  *"för att det ska bli rätt skulle vi vilja veta vilken information du syftar på i det Öppna API't så ska vi leta rätt på det som
  kan finnas i historikdatabasen avseende det."* Första livstecknet från Trafikverket på fem ärenden sedan 17/9, och det är
  kuvösens: *historikdatabasen* och *VViS* pekar på uttaget, inte på givaranmälningarna, och inte på e-tjänsten för allmänna
  handlingar (ett sådant svar kommer från registrator med diarienummer). Bengt hittar inget skickat mejl därför att
  Datautbytesportalens formulär skickar åt honom — ämnesraden var hans, kopian finns bara hos dem. **Svaret att skicka (gavs i
  chatten 1/10):** precisera objekttypen `WeatherMeasurepoint` (schemaversion 2.1) i Öppna API:t, fälten vi redan läser
  (`Observation.Sample`, `Surface.Temperature`, `Air.Temperature`, `Air.Dewpoint`, `Air.RelativeHumidity`,
  `Weather.Precipitation`, `Aggregated30minutes.Precipitation.RainSum`/`SnowSum.WaterEquivalent`, `Wind.Speed`/`Direction`,
  `Aggregated30minutes.Wind.SpeedMax`, `Air.VisibleDistance`), perioden 1/11 2024–31/3 2025, alla stationer i den upplösning de
  lagrar; i andra hand `RoadCondition` och `Situation` för samma period; formatet deras eget; och — enligt #398 — be dem höra av
  sig INNAN någon avgift uppstår. Ingen eskalering, inga paragrafer: de frågade, vi svarar.
  ✅ **SVARET SKICKAT AV BENGT 1/10 ca 08:15Z** till Micke Wallin direkt (hans adress, läst i hans eget mejl): vilka vi är, preciseringen,
  avgift före arbete, och projektsidan *Halkvakt och kuvösen* (kort #274) som länk, delad med alla med länken och provad utloggad. Väntar på uttaget.
  📬 **TRAFIKVERKET SVARADE 1/10 13:30 (Micke Wallin):** uttaget för samtliga stationer *"bör kunna levereras under nästa vecka"*, som **CSV** i ett format som skiljer sig från API:t — och frågar om det låter som en bra plan, *"i så fall lägger jag en beställning"*. **Beställningen väntar alltså på Bengts svar.** 🗺️ **Planen skriven 1/10** (Bengts beställning): `docs/PLAN-KUVOSEN-2026-10-01.md` — svaret till Micke (kostnad före arbete, provfil, tidszon, station-id, kolumnbeskrivning), vad kuvösen kan och inte kan pröva med bara stationsdatan, bygget i steg 0–6 med Verify, tidsmaskinen (snapshotbyggarens `now()` byts i kuvösens egen frågefunktion — produktionskoden orörd), och var den körs: **Actions** (gratispotten nollställd 1/10, kassavaktens prognos 17 av 35 USD — rättat samma dag på Bengts fråga; första versionen extrapolerade septembers 34,78), den här datorn som reserv. Fyra frågor i §4.2.
  ✅ **BENGT 1/10 KVÄLL (DECISIONS #424):** ja:et till Micke är redan skickat, filen kommer · både riktningsprov och kalibrering, i den ordningen (kalibreringen ändrar regel D och väntar på Axels signatur; riktningsprovet väntar inte) · Actions · bygg steg 1–2. **Förregistreringen skriven i #424 före första filen.** 🔨 **STEG 1–2 BYGGDA 1/10:** `kuvos/klocka.sql` + `klocka.ts` — klockan (`kuvos.now()` genom sökvägen) OCH vyer som döljer framtiden, eftersom produktionens frågor saknar övre tidsgräns; produktionskoden orörd; prov med sex fällor och motkontroll · `kuvos/inventering.ts` — läser en okänd CSV utan att tolka den. Oljefilmen ingår inte (struken #110; fel säsong; facit är olyckor). 🔑 Kvar: filen från Trafikverket → inventering → kolumnöversättning, härledda tabeller, körflödet.
  📏 **Bevis 1/10:** `ci` grön på PR #664 (36888627590) — klockans prov kördes mot PostGIS, 230 prov, 0 hoppade. **Fyra motprov, en vy i taget fick se framtiden, och varje gren föll på sin egen fälla:** `weather_observations` ⇒ KUV_KARANTAN borta (36888904314) · `givarfel_dygn` ⇒ KUV_LANGSAM borta (36888922612) · `trend_kandidater` ⇒ lutningen 5,5 i stället för 0,9 (36888942418) · `weather_latest` ⇒ KUV_FRAMTID synlig vid T (36888962569); 229 av 230 gröna i varje. Utkast-PR #665–#668 stängda och grenarna raderade. Fällan *negativ regn_h* är inte fälld för sig — den ligger bakom samma vy som karantänen och nås inte när stationslistan redan fallit.
  ✅ **AXEL OK TILL KALIBRERINGEN 1/10 (via Bengt, DECISIONS #425):** regel D ändrad i TROSKLAR-KOMBINATIONEN — säsongens enda kalibrering görs i kuvösen på vintern 2024/25, 1/2 utgår, årets vinter blir bara domdata; dom 1 i januari orörd. Öppet i §4.2: betan på startvärden eller kalibrerade värden. 🧫 **KUVÖSEN ÄR SJÄTTE STOMDOKUMENTET** (Bengts order 1/10): `docs/KUVOSEN.html`, artefakt https://claude.ai/artifact/1xvv4hydYbfpF5eXFgLcxh — nuläget, kedjan, vad som kommer härnäst och vad den kan ändra i projektet; STOMREGELN i CLAUDE.md säger sex. Genomlysning 3: mätningssidan, systembilden och kartans läge-rader bär nu kuvösen.
  📏 **Rutternas täckning mätt 1/10 (Bengts fråga om bredare testrutter):** de 20 svenska skuggrutterna (3 107 km) når 97 av 854 stationer inom 2 km (11 %) och 190 inom 5 km (22 %); norr om 62° 23 av 205. Väglagsnätet är 818 segment och 23 681 km (median 25,8 km per segment), och 769 av 854 stationer (90 %) ligger inom 2 km från ett segment (`scripts/matningar/rutternas-tackning-2026-10-01.ts`, `vaglagsnatet-2026-10-01.sql`, dbknapp 36893189091 och 36893534243). Stationsreglerna använder redan alla stationer; rutterna styr bara röstens del. Fråga i §4.2: bara de 20, eller de 20 plus hela väglagsnätet som egen serie — före filen.
  ✅ **BENGT 1/10: (b)** (DECISIONS #426, före filen): rösten i två serier — A de 20 skuggrutterna varje halvtimme, B hela väglagsnätet (818 sträckor, 23 681 km) var tredje timme — redovisade var för sig. Bara kuvösen; skuggan i drift orörd. Kuvössidan, mätningssidan, systembilden, bedömningen och kartans läge-rad uppdaterade.
  ✅ **TILLÄGG TILL FÖRREGISTRERINGEN 2/10, före filen (Bengt, DECISIONS #437, kort #270 g):** prognoslagrets frysflagga mäts i riktningsprovet med tre marginaler (0 · 0,5 · 1,0 °C) för RÅ och RÅ+HÖJD, per band, med farliga fel, falska flaggor och täckning — läst mot frysklassningens K-A som måttstock, ingen dom, inget val. Byggs med körflödet (steg 5).
  📬 **LEVERANSEN KOM 2/10 16:04 (DECISIONS #438, `docs/KUVOS-LEVERANSEN-2026-10-02.md`):** fem filer, nov 2024–mar 2025, **5 496 270 rader, 777 stationer**, en rad per station och halvtimme. Packad i den privata releasen `kuvos-trv-2024-25` (85 MB, sha256 kontrollerad efter återläsning), manifest i `kuvos/leverans.json`. **Tidszonen mätt: svensk lokaltid** — timmen 02 saknas 30/3 2025, och SMHI-provet ger 0 h vid tio av tio stationer. Format: semikolon, decimalkomma, SSMS-sidfot. 754 stationer har läge, 23 saknar. 🔑 **Nederbördstypen och mängden väntar på Trafikverkets kodlista** (fyra frågor och en bekräftelse av vindfälten, Bengt skickar till Micke; vinden och tiden stod i Trafikverkets datamodell, 2/10) — utan nederbörden kan frysrisken inte spelas upp. Därefter: översättningen och inläsningen i kuvösens databas, vakterna som antal, värdevakten, SMHI steg 4, körflödet.
  ✅ **STEG 3 INLÄST 2/10 kväll (Axels order *"läs in vintern nu"*, DECISIONS #439):** nederbördskoderna 1/2/4/6 lästa på Trafikverkets källa (*VädErs 2019* s. 6–7 — sammanfattningens 3 och 9 står INTE där och är NULL) · `kuvos/inlasning.ts` + `kuvos/oversattning.sql` + `kuvos/vakterna.ts` + knappen `kuvos` · 📏 **5 391 599 rader, 754 stationer i kuvösens databas; vakterna tar 3 %, 5 229 352 rader får tala; värdevakten: inget obesiktigat.** Inget utfall läst. 🔑 Kvar: Mickes svar på 3/9/−9, mängden (efterhalkan väntar på den) och vinden · SMHI steg 4 · körflödet steg 5. ⚠️ **Bengt:** kuvössidan, mätningssidan och systembilden är uppdaterade i repot men ägs av ditt konto — republicera dem därifrån (STOMREGELN).
  📨 **FRÅGORNA SKICKADE 2/10 kväll (Bengt):** fyra frågor och bekräftelsen av vindfälten till Micke Wallin, i leveranstråden (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §5b). ~~🔑 Mickes svar — då översätts 3/9/−9, mängden och vinden (`kuvos/oversattning.sql` körs om).~~ 📚 **LÄST PÅ NÄTET 6/10 (§5c) OCH ÖVERSATT (DECISIONS #464):** vinden ur API:ts fältbeskrivningar, sikten ur Vaisala PWD22 (10–20 000 m), 3 och 9 ur API:ts sex typer (frusen regn, okänd typ), mängden mm per 30 min lagd där typen säger. `kuvos/oversattning.sql` ändrad med prov. 🔑 **Riktningsprovet körs i veckan** (Bengts ja 6/10), knappen `kuvos` med `riktningsprov`. 📏 **FÖRSTA KÖRNINGEN 6/10** (37435099300, DECISIONS #466): 675 178 varningar över vintern, baslinjen 8 402 episoder i serie A; **grind A på vintern: A1 0,60 °C klarar, A2 5,5 % faller, A3 0,3 % klarar** (läsning, ingen dom; driftens grind A står). Höjdprovet föll på Nodes heap efter 82 min, NT och efterhalkan kördes inte; `kuvos.yml` får 10 GB heap och 300 min, och provet körs om. ✅ **OMKÖRNINGEN KLAR OCH LÄST 6/10 11:26Z** (37447617038, DECISIONS #467): grind A samma tal (fallen, A2 5,5 %), vägpunktsgrinden fallen för alla tre kandidater, höjden återvinner inget (empirisk lapse 0,18), frysflaggan läst med tre marginaler (bara offset K2 1 når måttstocken), NT-B och NT-C faller vid startvärdet, efterhalkan ensam 983 episoder (föll ut 527) och ovanpå nettonytt 175 av 82 985 facittillfällen (0,2 %) till priset 45,1 %. **Tabellen del × ensam × ovanpå står i bedömningen §7**, som Verify kräver. 🔧 **KALIBRERINGEN FÖRREGISTRERAD 6/10** (Bengt: *"gör kalibreringen"*; DECISIONS #468 — tidpunkt, rutnät 48 punkter varav 32 räknebara, måttet ur #456, regel D4 med taket 25 % på ≥ 20 episoder och båda halvorna): `kuvos/kalibrering.ts`, knappen `kuvos` med `kalibrering`. ✅ **KALIBRERINGEN KÖRD OCH LÄST 6/10 12:46Z** (37464971791, DECISIONS #468 utfall): ingen av 32 räknebara punkter under taket 25 % (lägst 40,4 %, startvärdena 45,1 %, lägst i en halva 29,2 %); **startvärdena frysta** (N 2 h · 30 min · fall 0,8), betan hörs på dem (#428), kort #278 överspelat. 🔑 Kvar: Trafikverkets svar inskrivet här (begäran §5d, Bengt skickar). 📨 **Begäran om facit** (ytstatus, väglag, händelser, åtgärder 2024/25): utkast i §5d, Bengt skickar.
  ✅ **STEG 4 HÄMTAT 2/10 kväll (Axels order, DECISIONS #441):** metobs 1/7/13/16 (243 · 181 · 162 · 108 stationer, hela vintern; molnet når 90 % av VViS inom 50 km) och radarn för 7 240 av 7 252 halvtimmar (646 278 segmentrader) med driftens kärna, nu delad (`ingest/radar-karna.ts`). ⚠️ **Arkivet har bara tif, och tif ligger ≈ 3,4 dBZ (≈ 1,6 × regn) över driftens h5** — ingen korrektion gjord, frågan i §4.2. Releasen `kuvos-smhi-2024-25` finns (37044952426); ⚠️ **Bengt:** ta bort engångsgrenen `kuvos-smhi-filer` (12 MB SMHI-filer, behövs inte längre). Inget utfall läst. ✅ Steg 5-kvaret löst: `kuvos/moln.ts` 3/10, och grind NT läste 37 SMHI-par ur `kuvos_ra.smhi_obs` i riktningsprovet 6/10.
  ⚠️ **TVÅ RISKER SOM INTE STOD PÅ KORTET, och de gäller även om svaret blir ja:**
  · **Elektronisk form är inte en rättighet.** Rätten att ta del av en allmän handling omfattar att läsa den och att få
    papperskopia; att få ut en databas i filform är något myndigheten *får* göra, inte något den måste. För ett vinteruttag
    är det hela skillnaden mellan användbart och oanvändbart. (Kontrollera formuleringen innan den används skarpt.)
  · **Det kan vara mer än rutin.** En sammanställning räknas som allmän handling bara om den kan tas fram med
    rutinbetonade åtgärder. Kräver ett VViS-uttag programmering kan de avslå på den grunden.
  ⏳ **HÅLLBARHETSTID (fynd 27/9):** kuvösens hela värde är att ge vintersvar FÖRE vintern. Frosten kommer nov–dec och
  dom 1 går i januari på riktig data. Varje vecka av tystnad äter värdet, och omkring **1 december** slutar kuvösen vara
  en spak och blir en historisk kuriositet. ~~Sätt ett beslutsdatum~~ **Bengt 28/9: öppen väntan är valet** (#388).
  🔨 **SONDEN BYGGD 27/9 (Bengts ja):** `scripts/no-historik-rekognosering.ts` + knappen
  `no-historik-rekognosering` — ren läsning, tre spår, **kriteriet utskrivet överst** så svaret går att läsa utan
  tolkning: yttemperatur per station · passerad vinter · minst timupplösning · konto vi har eller kan få gratis.
  Faller något av de fyra är svaret nej, hur mycket data källan än har. Spår A frågar DATEX-servern vi har nyckel till
  (kontrollen först — faller den är det kontot, inte historiken), spår B frågar MET Frost om den **alls har ett
  yttemperatur-element** innan kontofrågan ställs, spår C prövar Vegvesens övriga ytor. Jobbet blir rött bara om ALLA
  spår är stumma. Lokalt prov 27/9: alla spår stumma med `Host not in allowlist` — sonden säger själv att det är
  behållaren och inte Norge, vilket var meningen.
  📏 **SONDEN KÖRD 27/9 19:24 (körning 36344233168, grön) — EN DÖRR STÄNGD, EN FORTFARANDE OPRÖVAD.**
  ❌ **DATEX bär ingen historik. Bevisat — och beviset är en fälla:** `pulldeltadata`, `pullhistoricdata`,
  `pullhistorydata` och `pullarchivedata` svarade alla **HTTP 200**. Läser man bara statuskoden ser det ut som fyra
  historiska ingångar. Läser man KROPPEN bär var och en `<ns17:pullSnapshotDataOutput>` — **servern struntar i sökvägen
  och lämnar samma ögonblicksbild varje gång.** Fyra 200 som är sämre än ett 404, eftersom de ljuger om sin form.
  Samma familj som `shadow_log.suppressed`: att något svarar bevisar inte att det bär något.
  ⚠️ **SONDENS EGEN RÄKNING GICK PÅ SAMMA FÄLLA.** Den räknade `r.ok` som "svar" och redovisade *6 svar lästa* med grönt
  jobb — fast fyra av dem var samma snapshot i förklädnad och ingen av dem svarade på frågan. Instrumentet behöver läsa
  rotelementet, inte statuskoden, innan det räknar. Fört som läxa i CLAUDE.md.
  ❓ **MET Frost: FORTFARANDE OPRÖVAD, och mitt antagande var fel.** Jag trodde elementlistan var öppen referensdata —
  `elements/v0.jsonld` gav **401**. Alltså går det inte ens att fråga *om MET har ett yttemperatur-element* utan konto,
  och spår B:s hela poäng (ställ den billiga frågan först) föll. `observations` utan nyckel gav **400**, inte 401 —
  servern validerar frågan före behörigheten. Kriteriet står alltså oprövat på punkt 1.
  🔑 **Möjligt nästa steg — INTE beställt** (Bengt 28/9: avvaktar Trafikverket, inget annat): registrera ett client-id på frost.met.no (självbetjäning, kostnadsfritt för
  icke-kommersiellt bruk), lägg det i GitHub Secrets som `FROST_CLIENT_ID` och tryck knappen igen. Då svarar spår B på
  riktigt. Utan det är Norge varken en öppen eller en stängd dörr — den är obesvarad.
  ℹ️ **Spår C:** `api.vegvesen.no` och `datainn.vegvesen.no` gick inte att slå upp alls (fetch failed) — mina
  kandidatnamn var fel, inte idén. `www.vegvesen.no/trafikkdata/api/` gav 404; trafikproxyn för kort #42 steg 4b behöver
  rätt sökväg, inte en annan värd.
  🚪 **OPRÖVAD DÖRR: Norge.** Kortet säger att MET:s Frost-arkiv "kräver konto och är inte kontrollerat" — och vi har
  redan ett **Vegvesen-konto** (`VEGVESEN_USER/PASS`, DATEX i realtid). Finns norsk vägstationshistorik går kuvösen att
  köra på en norsk vinter: samma fysik, och vi ingesterar Norge redan. **Jag kunde inte pröva det härifrån** — den här
  behållarens utgående trafik blockeras mot frost.met.no, SMHI och Vegvesen (403 i proxyn). Det är min behållares gräns,
  inte källornas: SMHI metobs bevisades nåbart 21/9. Provet måste alltså köras i ett Actions-jobb eller av dig.
  💰 **OM BESLUTET KOMMER MED EN AVGIFT (Bengts frågor 27/9, DECISIONS #398) — tre regimer.**
  **(1) Kopia av allmän handling** (avgiftsförordningen 15–16 §§): sidtaxa — de nio första sidorna fria, tio sidor 50 kr, därefter
  2 kr per sida. Taxan är skriven för PAPPER; en CSV har inga sidor, så den går inte att räkna på en fil. Viktigast: **de får inte
  ta betalt för sin egen handläggning eller sekretessprövning** — bara för kopior. Och det finns **ingen skyldighet att lämna ut i
  elektronisk form** (rätten gäller en kopia; mediet väljer myndigheten). **(2) Uppdrag** (4 §, full kostnadstäckning): är uttaget
  inte en rutinbetonad åtgärd behöver de inte göra det — men de får sälja det, till timpris. **Det är här en verklig faktura kan
  uppstå**, och det är samma test som avgör om sammanställningen alls är en allmän handling. **(3) Öppna data / värdefulla
  datamängder** (lagen 2022:818, EU 2019/1024 + 2023/138): meteorologiska data är en av EU:s kategorier, och en särskilt värdefull
  datamängd ska tillhandahållas **avgiftsfritt**, maskinläsbart, gärna som bulknedladdning. Undantagsfönstret löpte ut 9/2 2025.
  🚧 **Vår egen regel:** gratisnivån är ett villkor (CLAUDE.md) — **ingen kostnad accepteras i ett svar**, den tas tillbaka hit och
  blir en DECISIONS-post godkänd av Axel.
  📵 **Inte läst på källan:** nätpolicyn blockerar trafikverket.se, riksdagen.se, lagen.nu, forum.esv.se och jpinfonet.se. Talen
  50 kr/2 kr och avgiftsfriheten för värdefulla datamängder är regelverket som jag känner det plus sökträffar — **kontrollera dem
  innan de citeras MOT Trafikverket**.
  🧾 **ÄR EN BEGÄRAN EN BESTÄLLNING? (Bengts följdfråga 27/9, DECISIONS #398 tillägg.)** Nej — men gränsen går inte där jag först
  skrev. En begäran utlöser en PRÖVNING, inte ett avtal: myndigheten lämnar ut, eller avslår. **Ett avslag kan aldrig faktureras**,
  och handläggningen inte heller. MEN: sidtaxan i regim 1 följer av förordningen, inte av vårt samtycke — begär man en kopia av en
  handling på 500 sidor uppstår avgiften utan att någon beställt något. **Så i regim 1 ÄR begäran i praktiken en beställning av
  kopiorna** (liten risk för oss: taxan gäller papper, en fil kostar normalt inget). **Regim 2 är motsatsen:** där kan de inte
  fakturera alls utan ett uttryckligt erbjudande från dem och ett ja från oss. Svarar de *"inte rutinbetonat, men vi gör det som
  uppdrag för X kr/tim"* är det ANBUDET — och först vårt ja är beställningen. Därför är det ja:et Axels, aldrig ett svar i stunden.
  ✉️ **Steg 1 — Bengt skickar förfrågan.** ⛔ **INTE till datex@trafikverket.se — adressen STUDSAR** (Bengts mejl 17/9 kom
  tillbaka med *"Adressen hittades inte"*; den gavs ändå ut en gång till 21/9, DECISIONS #293 → rättat i #294).
  📖 **Rätt väg, läst på källan 21/9:** Datautbytesportalens kontaktformulär, data.trafikverket.se/about-us/contact,
  ärendetyp **API Öppna Data** (de fyra typerna: API Öppna Data · Datex II · Vägdata - NVDB · Öppna Data; fälten är e-post,
  ämne, innehåll). Reserv efter en vecka utan svar: formuläret *Frågor till Trafikverket*
  (etjanster.trafikverket.se/kundfragor-trafikverket), därefter e-tjänsten *Begär ut allmänna handlingar*. SMHI (varningarna, valfritt) → **kundtjanst@smhi.se**, som enligt
  smhi.se/kontakta-smhi *"tar emot och vidarebefordrar uppdrag och beställningar"*. De färdiga mejlen gavs till Bengt i
  chatten 21/9; båda frågar efter kostnaden INNAN något arbete påbörjas. Utkast:
  > Hej! Vi utvecklar Halkvakt, en svensk app som varnar bilförare för halka och bygger på era öppna data
  > (WeatherMeasurepoint/WeatherObservation, RoadCondition, Situation). API:t ger observationer sju dygn bakåt. För att pröva
  > våra varningsregler mot en hel vinter — innan de når förare — behöver vi ett historiskt uttag:
  > 1. VViS-observationer 1 november 2024–31 mars 2025, alla stationer (eller ett urval län om volymen är ett hinder):
  >    yttemperatur, lufttemperatur, daggpunkt, relativ fuktighet, nederbördstyp och -mängd, vind — i den upplösning ni lagrar.
  > 2. Om möjligt för samma period: väglagsklassningarna (RoadCondition) och olyckshändelserna (Situation).
  > Formatet spelar ingen roll (CSV går utmärkt). Samma data är redan öppen (CC0) i realtid; det vi saknar är bara historiken.
  > Vem hos er hanterar sådana uttag? Med vänlig hälsning, Bengt Lagerlöf, Halkvakt
  🌦️ **SMHI FÖR SAMMA VINTER — kontrollerat 21/9 (Bengts fråga): tre av fyra finns öppet, ingen förfrågan behövs för dem.**
  ✅ Molnmängd (metobs parameter 16, rimfrostens molnkontroll och T-A:s fysikkontroll): `corrected-archive` räcker 2010–juni 2026,
  24 timvärden för 15/1 2025 · ✅ radarn (efterhalkans radarvariant, vattenplaningen): 288 kompositer per dygn finns för
  15/11 2024, 15/1 och 15/3 2025 · ✅ lufttemperatur och nederbörd ur samma metobs-arkiv. Claude hämtar dem vid bygget.
  ✘ **SMHI:s VARNINGAR har inget öppet arkiv** — API:t bär bara de aktiva (15 st i dag; resurserna är `warning`, `metadata`, `cap`).
  De behövs för SMHI-förstärkaren (#95 d) och för N_varning. Antingen en fråga till SMHI om utfärdade varningar november
  2024–mars 2025, eller så körs kuvösen utan de två delarna och säger det. En privat sida (rl.se) arkiverar varningar — inte en
  källa att bygga ett prov på.
  🛠️ **Steg 2 — Claude bygger kuvösen när datan finns** (eller på årets arkiv om svaret blir nej). Delarna finns: grindarnas
  skript, uppspelningen (sql/028), `snapshot-core` → `snapshotToHazards` → `AlertEngine` längs skuggmotorns 20 rutter. Körs i en
  slit-och-släng-databas som CI:s, ALDRIG i Supabase — en vinter ryms inte i gratisnivåns 500 MB.
  ⚖️ **Regler, deklarerade FÖRE körningen:** startvärdena som de står, inget svep (D2, D6, D7) · hela vintern, inga handplockade
  dygn · varje del redovisas ensam OCH ovanpå de andra (marginalnyttan) · facit = stationens egen yta efter varningen
  (*det blev kallt*, inte *det blev halt* — sql/028:s egen reservation) plus väglag och olyckor om Trafikverket ger dem ·
  resultatet ändrar ingen tröskel. **Ska vintern 2024/25 i stället få bli KALIBRERINGSDATA (D3: kalibrering och dom på skilda
  nätter — en gången vinter uppfyller det bättre än årets) är det ett eget beslut för Bengt och Axel, taget före körningen.**
  🎁 **Bonus:** en hel vinter avgör också grind A:s oavgjorda A2 (#131: *"kan inte avgöras på septemberdata"*) — alltså
  novemberbeslutet om segmentmotorn.
  Verify: svar från Trafikverket inskrivet här · upplägget i DECISIONS före körningen · tabellen *del × ensam × ovanpå de andra*
  i bedömningen.
  ↪ **30/9 (nattens mätningar, `docs/PROGNOSLAGRET-2026-09-30.md`):** två tillägg till ansökan om Axel hinner — termisk kartering som
  rad i AP2 (kort #271, inom AP2:s 70 000 så att 413 000 står) och ett samråd med Trafikverket om fordonsdata för utvärdering, utan
  beroende (text i chatten 30/9). Ingen av dem krävs för att ansökan ska stå.
  🔨 **STEG 5a BYGGT 3/10 (DECISIONS #453, Bengt: *"slå ihop 730 och kör på"*):**
  - *Körningen* `kuvos/korning.ts` ställer klockan varje halvtimme, kör `buildSnapshot` oförändrad och rösten i båda serierna: A är 20 rutter varje steg, B är 818 sträckor var tredje timme.
  - *Proven* i `test/kuvos.test.ts` täcker spåret, som är skuggmotorns `traceAlong` fix för fix, och tidsdomen. Kontraktsgrinden vaktar farten och punkttätheten. Två motprov gjordes lokalt och föll på rätt vakt.
  - *Tidsregeln* är satt före körningen: B "ryms" om hela vintern beräknas till ≤ 324 min (90 % av 360).
  - ✅ **Tidskörningen 3/10, kuvos 37141247592:** vintern har 7 245 halvtimmar. Sju dygn gav 336 steg och 0 tomma. Ett steg tog 207 ms för snapshoten och 114 ms för serie A, och ett B-steg 166 ms. Hela vintern blir **47 min med B var tredje timme** ⇒ B glesas inte, och gränsen 324 min avgjorde inget.
  - **Därefter:** 5b facit, 5c reglerna och grindarna på klockan, 5d tabellen *del × ensam × ovanpå*.
  ⚖️ **FYRA FRÅGOR FÖRE 5b–5d (3/10, PLAN-KUVOSEN §10, bedömningen §4.2).** Genomgången av delarnas tröskeldokument och kod visar att #424 inte räcker för att bygga utan att välja:
  - (1) hur *ovanpå* räknas — förslaget är KB-B:s form;
  - (2) frysrisken som baslinje, eftersom dess egen-yta-facit är cirkulär;
  - (3) betans 30-minutersfönster i halvtimmesdata, som rör kalibreringen i kuvösen (#425) och är Bengts och Axels fråga. ↪ *Omprövat samma kväll:* det är inte omöjligt. Driftens lutning30 är två mätvärden, och det är skyddet som blockerar. Vägarna är 5-minutersvärden från Trafikverket eller två rader i kuvösens egen beräkning (PLAN §10);
  - (4) delar utan startvärden redovisas som *ej prövade*.

  ✅ **AVGJORDA 3/10 (DECISIONS #455):** Bengt sa ja till A och till rekommendationerna för 1, 2 och 4. 30-minutersfallet räknas ur två halvtimmesrader, i `kuvos/trend.ts` härlett ur `sql/018`. Kalibreringen sveper 30 och 60 min. Frysflaggan är byggd (`publish/frysflagga.ts`).
  Det som går att köra nu är grind A, vägpunkten och höjden, frysflaggan och NT. ↪ *Rättat samma kväll (#455):* T-A och R-A är svep utan startvärden och är *ej prövade*. Trendens värden prövas inom efterhalkan.
  🔨 **Riktningsprovet före regnmängden är byggt (3/10).** Knappen `kuvos` med `korflode = riktningsprov` kör rösten, baslinjen, grind A, höjdprovet med frysflaggan och NT. Den läser utfall och körs bara på Bengts ord (§4.2). *Ovanpå* fylls när efterhalkan kan köras.
  ⏳ **Väntar på Trafikverkets svar om koderna 3, 9 och −9 och de 23 stationerna, men längst till fredag 16/10** (Bengt 3/10, DECISIONS #456, KALENDERN). Utan svar körs det ändå, med koderna som saknade och stationerna utanför. Efterhalkan, Ö-B, tillståndet, försprånget och vinden väntar på regnmängden och vindstyrkan (#439). KUVOSEN.html §4 och planens §3 är rättade: efterhalkan stod som prövbar.
  🔨 **Efterhalkans uppspelning och ovanpå byggda 4/10 (Bengts *"bygg efterhalkans uppspelning"*, DECISIONS #456).** `kuvos/efterhalkan.ts` spelar betans regel med `uppspelning_efterhalka` (sql/028) och härleder ögonblicken ur samma källa vid körning. `kuvos/ovanpa.ts` räknar facit, baslinjen, nettonytt, pris och tidsvinst. Båda går i riktningsprovets knapp. Utan regnmängden skriver den att underlaget saknas. Prövad på syntetisk data: enhetsprov räknade för hand, ett PostGIS-prov från halvtimmesrader via väg A till driftens egen summa, fyra motprov lokalt. 📏 **Bevis 4/10:** ci 37182523731 grön på a4d3504 (259 prov, PostGIS-provet kört, 0 hoppade); motprovet i CI, fukten i facit ersatt med true, rött i 37182562056 på just facitraden (258 av 259, kontraktsgrinden grön; utkast #740 stängt). 🔑 Kvar: regnmängden från Trafikverket.

*↩︎ = ÅTERSTÄLLT 10/9. Korten nedan föll av tavlan 8/9 20:43 (commit 99473c7: Claudes tavelsynk av
"Axels nästa steg" svalde 174 rader, inkl. tre Claude-sektioner). Inget av dem har bevis på klart sedan dess.*
  ↦ **Sorterat 22/9 (kort #224):** registreringar är Bengts (BESLUTSGANGEN §1); Claude lägger om `ingest/dk.ts` när nyckeln finns. Ingen brådska före 2027/28.
  ✅ **Stängt 22/9 (DECISIONS #311, Bengt: *"ta upp våren 2027"*):** behövs först före dansk produktion, tidigast 2027/28. Står nu under Nordenprodukten i Ä7 (bedömningen §3): nyckeln registreras av Bengt och `ingest/dk.ts` läggs om före produktion.

- [ ] 🔭 **#233 UR NIRAS PRODUKTSIDA: TVÅ SAKER VI INTE HAR, EN VI HAR PARKERAT** (Bengts fråga 21/9, DECISIONS #296; sidan
  niradynamics.com/products/road-surface-alerts läst mot repot). 🔑 Väntar på Bengts val av vad som ska utredas (§4.2).
  **(1) FÖRE RESAN — saknas helt.** Nira säljer *"route planning that avoids known hazards"*. Halkvakt talar bara under
  körning, men beslutet som betyder mest — åka tidigare, ta en annan väg, låta bli — fattas före avfärd. En ruttkoll för en
  sparad sträcka använder samma vägdata och matchas i telefonen, så ingen position lämnar den. Och en vy som föraren själv
  öppnar TALAR inte: regel T3/T6 förbjuder prognoser att UTLÖSA, inte att visas (samma skäl som i SKUGGAN-PAR4-MOT-REGEL-T).
  Det är alltså platsen där förvarningen, SMHI:s varningar och *"Halkvakt tror"* får synas utan att regeln bryts. Formen är
  Axels. Utredning: ett beslutsunderlag, ingen kod. Släkt med BACKLOG 16 (blixthalke-prognosen ur Bengts riskkarta).
  **(2) SNÖFLINGAN SOM JÄMFÖRELSE — saknas helt.** Nira ställer sig mot bilens egen varning: *"Traditional vehicle warnings
  often rely on temperature thresholds, such as a snowflake symbol"*. Varje bil varnar redan vid omkring +3 °C i luften. En
  Halkvakt-varning som bara kommer när snöflingan redan lyser tillför lite; värdet ligger där vägytan är kall fast luften
  inte är det — klara nätter med utstrålning — och det ser en station men ingen bil. **Mätbart nu, utan facit och utan att
  blindningen rörs:** hur stor andel av stationsregelns fyrningar sker med luft över +3 °C (och +4 °C — bilmärkena skiljer sig, båda redovisas)? En läsande sats via dbknapp.
  ✅ **(2) KÖRD 21/9 (DECISIONS #297; körningarna 35629700266, 35629869303, 35630131080) — och svaret är: för tidigt, plus ett
  fynd som är viktigare än frågan.** Arkivet 24/8–21/9: stationsregeln fyrade **4 episoder — alla fyra givarfel** (luft
  +8,5…+11,5 °C, yta ≤ +1 °C). Äkta frost (gap luft−yta ≤ 3 °C): 7 episoder, alla i Norrland med luft ≤ +0,4 °C — snöflingan
  lyste i samtliga. **Inget stöd än för att stationen ser det bilen inte ser; sju episoder i september avgör ingenting.** Körs
  om efter första frostmånaden. Fyndet: kort #234.
  **(3) KÖSLUT — inte missat, parkerat.** Niras sjätte varningstyp är *"Slow traffic alert"*. Vi har kort #15 (TrafficFlow,
  43 s färsk, faktatestad 26/8), beslutad som uppdatering 1 efter release. Ingen ändring föreslås; bara noterat att en
  konkurrent räknar den till kärnan.
  **Inte för oss nu:** gropar och ojämn väg (ingen öppen källa utom tjälskademeddelanden; fel säsong och fel produkt) ·
  motorcyklar (Nira har en artikel; säsongen är inte vår). **Har vi redan:** vattenplaning och kraftigt regn (#42/#81),
  flottor (#94), bekräftelse över flera källor (kartans bevisbärare, §8 B).
  Verify: Bengts val inskrivet här · för (2): andelen i bedömningen · för (1): underlaget i docs/ med Axels besked.
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är ditt val av vad som ska utredas (§4.2); del (2) körs om vid frost.
  ↪ **Hit 22/9 (DECISIONS #309):** idén ur #16 *Blixthalke-prognos* (MET Nowcast). I *före resan*-vyn får den visas — regel T6 förbjuder en prognos att utlösa, inte att synas. Utreds med (1).
  ↩︎ **28/9: stängdes och öppnades igen inom en timme på Bengts order** (*"nej det blev fel, öppna kort 233 igen"*) — kortet är oförändrat, stäng det inte utan ett nytt besked.
  ↪ *överspelad 3/10 av Halkvaktens favoriter: tio minuter före, notis bara för det nya, påminnelse eller notis på iPhone (avsnitt 5)* · 📝 **(1) UTVECKLAD 2/10 (Bengts fråga om pendling och favoritsträckor, `docs/FORE-RESAN-2026-10-02.md`):** spara den körda vägen efter en resa (ingen ruttsökning på nätet), välj tiderna, telefonen provkör vägen med motorn en halvtimme före och skickar en lokal notis bara när något är fel; Siri-frågan *hur är vägen till jobbet?*. Bara uppmätt och rapporterat — prognoser får inte utlösa en notis (T6). Förslag: mät först hur ofta notisen skulle komma på kuvösens vinter, gränsen skriven före. 🔑 Bengts och Axels val (§4.2); formen är Axels. ➕ **Köer, vägarbeten och färjor** (Bengts fråga samma kväll): finns i Trafikverkets öppna API — *Situation* (vägarbeten med avstängda körfält och tider), *TravelTimeRoute* och *TrafficFlow* (restider och köer, bara storstäder och högbelastade system), *FerryAnnouncement*. I vyn före resan, inte i rösten; notisen bara för det nya eller kortvariga. 📏 **RÄKNAT 2/10, bara information (Bengt: *"inte något bygge alls"*, DECISIONS #442):** pendlarens notis på kuvösens vinter ≈ 14 % av kollerna med 2–3 stationer längs vägen (1,5 i veckan; norr om 62 °N ≈ 3), frysrisken ensam · 1 876 aktiva vägarbeten (+ 3 262 vilande; 26/9:s 5 280 räknade båda), 50 nya eller korta · köerna: 191 av 198 restidssträckor och 2 400 av 3 125 detektorer i Stockholm · en gemensam fil ≈ 120 kB packad. 🔁 **BENGTS FÖRTYDLIGANDE SAMMA KVÄLL:** idén är **favoritrutter** — pendlingen är ett fall bland flera — med en **ruttrapport före resan** om allt appen vet längs rutten (halka, olyckor, vägarbeten, hastighetsnedsättningar, omledningar, köer där de finns, färjor, fartkameror). Underlaget omskrivet; notisen är frivillig och bara för det nya. Inget byggs.
  📄 **(1) SOM LÄSBART DOKUMENT 2/10 kväll** (Bengt: favoritfliken i rapportform, färsk tio minuter före avresan): *Halkvaktens favoriter*, https://claude.ai/artifact/EJYcQFCyKYd9BgGcYkCMyT, källa `docs/FAVORITER.html` — fliken, rapporten i sex delar, notisen och Siri, spara efter resan, källorna, talen ur #442. Färskheten läst i koden: livemotorn varje minut, lägesfilen var tionde, så kollen 07:05 läser 07:00-filen. Inget byggt; ⏳ formen är Axels, och två nya frågor står i §4.2 (räcker tio minuter? ingen karta bakom linjen?). Avsnitt 7 kompletterat samma kväll (Bengt): vad som finns, vad som byggs och varifrån det hämtas, och en uppskattad byggtid på 10–15 arbetsdagar, 3–5 veckor i kalendern; ingen planerad. Avsnitt 6 kompletterat (Bengt): vad som krävs för att spara en rutt (brytare av från början, tillfällig fil till efter resan, fil utanför säkerhetskopian) och vad det kostar i löftet — appen slutar vara en app som inte sparar någon position alls; *ingen position lämnar telefonen av sig själv* står kvar. Fyndet om iCloud-kopian är kort #285. 🏛️ **3/10: *Halkvaktens favoriter* är sjunde stomdokumentet (Bengt, DECISIONS #445)** — byggframsteg förs in där i samma varv; kortets område på sidan: §11 *Vad som väntar*.
  ✅ **(2) KÖRD PÅ KUVÖSENS VINTER 2/10 (Bengt: *"är snöflingan något att satsa på. gör en körning"*, DECISIONS #440, förregistrerad 17:46, körning 37029386466 17:52):** av 46 858 episoder då stationsregeln slår till (734 stationer, 152 nätter, alla fyra vakterna) hade **3,0 % luft över +3 °C och 1,2 % över +4 °C** — under förregistreringens 5 %. Bilens snöflinga lyser i 97 av 100 fall; ingen månad och inget breddgradsband når 5 %. **Inget säljargument.** Frågan om Halkvakt är *träffsäkrare* än snöflingan är en annan och ligger i riktningsprovet. Kortet står öppet för (1) och (3).

- [ ] 🔋 **#218 BATTERIBUDGETEN HAR ALDRIG MÄTTS, OCH iOS KÖR FULL GAS** (genomlysningen 20/9). `< 8 %/h` står som krav på tre
  ställen med **noll motprov**. iOS kör `BestForNavigation` med avstängd automatisk paus och saknar motsvarighet till Androids
  kadensreglering. Androids kadenstest är tautologiskt (sänk gränsen tiofalt och det passerar ändå). Dessutom: en
  snapshot-omladdningsloop i Androids vakttjänst kan ge **fyra HTTP-anrop per sekund utan tak** när nätet saknas och cachen är tom.
  Verify: ett mätt prov med skärmen av, utan laddare, på ett namngivet bygge, på båda plattformarna.
  📖 **KONTROLLERAT MOT KODEN 21/9** (Bengts fråga *"vad är 218"*; DECISIONS #280). Tre av fyra påståenden stämmer:
  iOS sätter `BestForNavigation` och stänger av pausen på ETT ställe (`GuardManager.swift:90–92`) och ändrar aldrig
  noggrannheten eller sätter `distanceFilter` · Android växlar 1 s / 5 s / 15 s efter avståndet till närmaste fara
  (`CadencePolicy.kt`) · testet `tiers()` jämför koden med sina egna konstanter: gör GPS:en tio gånger glesare nära en
  fara (1 s → 10 s) och allt är grönt; `FAR_MS` 15 → 150 s passerar också marginaltestet (2 × 5,8 km < 15 km).
  Läst, inte kört — motprovet görs i CI den dag testet lagas.
  ⚠️ **RÄTTELSE AV KORTETS FJÄRDE PÅSTÅENDE:** helt UTAN nät blir det ett misslyckat försök per sekund, inte fyra —
  första anropet faller och laddningen avbryts. **Fyra per sekund blir det när nätet FINNS** men en fil fäller
  (kontrollsumma eller HTTP-fel) och ingen sparad kopia finns: då laddas `static.json` om varje sekund — 274 kB/s med
  dagens storlekar (static 251 391 byte, live 22 262, manifest 352; hämtade 21/9), ungefär 1 GB i timmen.
  🆕 **SAMMA ROTORSAK, INTE MED PÅ KORTET — och det vanliga fallet:** `lastSnapshotLoad` sätts bara när en laddning
  LYCKAS, och ingenting säger *"laddning pågår"*. Utan data går vakten i 1-sekundstakt, så varje GPS-punkt före den
  första lyckade laddningen startar en ny, komplett laddning i en egen tråd — vid varje start, också varje
  självväckning efter ett stopp. På ett segt nät trängs de och gör varandra långsammare. Grov räkning: vid ~1 Mbit/s
  ett knappt tiotal laddningar i onödan, och ännu segare växer det snabbt. Läst i koden, inte framkallat.
  ✅ **iOS har inte loopen:** vägdatan laddas bara vid start och när vyn visas (två anropsställen).
  📏 **Mätningen har aldrig gjorts, och det enda försöket kunde inte mäta:** Bodenresan 1/9 bad om batteriprocenten —
  med laddare i bilen (`docs/TEST-BENGT-BODEN.md`). **Android-provet kräver inget köp:** testtelefonen finns och kör
  appen (DECISIONS #271 *"LÖST SAMMA KVÄLL"*, #272).
  🔑 **Väntar (bedömningen §4.2):** Bengts ja till att Claude lagar loopen och testet (Android-kod utan nyckel, bevisas
  i CI, når telefonen med nästa bygge) · mätningen — en körning på minst en timme per plattform, skärmen av, ingen
  sladd (kabel-CarPlay laddar telefonen), batteriprocent och byggnummer vid start och slut; iPhone kan Bengt eller
  Axel köra, Android körs på testtelefonen · **iOS-regleringen avgörs FÖRST efter iPhone-mätningen**: glesare GPS är
  en säkerhetsfråga, inte bara en batterifråga, och håller iPhone redan under 8 %/h finns inget att vinna.
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är ditt ja till lagningen av loopen; mätningen görs sedan per plattform (§4.2).
  🔨 **LOOPEN LAGAD 26/9** (Bengts ja, DECISIONS #370): `SnapshotSchedule` — en laddning i taget, 60 s paus efter fel, 30 min
  förnyelse som förut; fem JVM-prov (tio minuter utan nät: 10 laddningar, inte 600). android.yml-körningen 36214202433 (workflow_dispatch på grenen, 16e2e3f) grön: JVM-proven, emulatorn och release-AAB. Motprovet 36214221026 (c27dcce, båda vakterna borttagna) rött med exakt de tre väntade proven fällda — oneLoadAtATime (rad 15), aFailedLoadWaitsAMinute (rad 22) och tiominutersräkningen (rad 50), 46 prov, 3 fällda; halvtimmesförnyelsen och startens förbikoppling höll. Kvar på kortet:
  **mätningen** (iPhone: Bengt, nästa resa över en timme · Android: testtelefonen) och **kadenstestet** (nämnt i samma fråga, inget ja).
  📏 **iPHONE-MÄTNINGEN GJORD 27/9 (Bengt) — KRAVET HÅLLER.** iPhone, bygge **0.3.9 (14)**, skärmen av, vakten igång hela
  tiden: **78 % → 71 % på en timme = 7 %/h** mot budgetens < 8 %/h. Två saker som inte stod i rapporten men följer av den:
  **(a) ingen sladd satt i** — hade kabel-CarPlay laddat hade procenten stigit, inte fallit, vilket var exakt felet med
  Bodenresan 1/9; **(b) telefonen rörde sig** — iOS stoppar sig självt efter en kvart stilla, och vakten gick hela timmen.
  ⚠️ **TVÅ FÖRBEHÅLL, båda åt samma håll — talet är ett GOLV, inte ett kvitto:**
  · **Upplösningen.** iOS visar hela procent. 78 → 71 betyder att den sanna förbrukningen ligger mellan **6,0 och 8,0 %/h**
    (start 77,5–78,5, slut 70,5–71,5). Punktskattningen 7 klarar gränsen; intervallets övre kant **rör** den. En enda
    timmes mätning kan alltså inte skilja "god marginal" från "precis på gränsen". MÄT MARGINALEN-läxan gäller här.
  · **Bygget är äldre än main.** (14) ligger före **#258** (*iPhone laddar om vägdatan under resan*, Bengts ja 26/9,
    DECISIONS #371), som lägger till nätarbete under körningen. Main bär **0.3.9 (18)**, som alltså gör MER än det som
    mättes. Siffran certifierar (14), inte (18).
  🔑 **VAD DET AVGÖR — och vad det inte avgör.** Kortet sa att iOS-regleringen (glesare GPS) avgörs först efter
  iPhone-mätningen, och att inget finns att vinna om iPhone redan håller sig under 8 %/h. **Mätningen ger inget stöd för
  att glesa ut GPS:en** — det vore en säkerhetsförsämring utan uppmätt vinst. Men frågan **stängs inte** på ett tal vars
  övre kant rör gränsen, på ett bygge som är äldre än main. Nästa mätning: **0.3.9 (18) eller senare, gärna två timmar**,
  så upplösningen halveras i procent per timme.
  ⏳ **KVAR PÅ KORTET: Android-mätningen** (testtelefonen, inget köp — DECISIONS #271/#272). Verify-raden kräver båda
  plattformarna, så kortet står kvar öppet med iOS-halvan bevisad.
  🔨 **KADENSTESTET LAGAT 26/9** (femma sju, DECISIONS #373): `tiers()` ersatt av ett körprov i 140 km/h rakt mot en fara från varje start 3,6–60 km; inom motorns räckvidd (leadMaxM + cameraTriggerM) ska varje GPS-punkt komma högst 1 s efter förra. android.yml 36217938454 grön på grenen; motprovet 36217945802 (NEAR_MS 1 → 10 s) rött på exakt två prov — körprovet och `noSnapshotMeansFullAlertness` — där det gamla testet höll. Enligt en modell av provet fäller det också FAR 15 → 450 s men inte 15 → 150 s, som fortfarande är säkert. Kvar på kortet: **mätningen** (iPhone: Bengt · Android: testtelefonen).

- [ ] ↩︎ **Introduktionen** (iOS) — bevis saknas: radera appen → installera → intron ska komma
  först; "Visa igen" i Inställningar. Introduktionen i Claude Design är enda skärmen som inte
  ritats om än. Android-spegeln (DECISIONS #36) efter att iOS-varianten testats.
  ↪ **Flyttat 26/9 från *Axel — hösten (brainstorm 31/8)*** (femma åtta, DECISIONS #377): nästa steg är Bengts två minuter (*Visa introduktionen igen*).
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: appen raderad och installerad om på en iPhone, introduktionen kommer först, och *Visa igen* i Inställningar visar den — bokfört med datum och bygge.

### Claude — olåst
- [ ] 🧊 **#294 YTSTATUSFÄLTEN I ARKIVET — vägytans is, snö, vatten och friktion från de cirka 50 stationerna med givare** (Bengts ja 6/10 efter frågan *vad skulle vi behöva för att facit inte skulle vara tunt*; DECISIONS #465). API:t bär `Surface.Water`, `Ice`, `Snow` och `Grip` (friktion 0–1) för de stationer som har beröringsfria ytstatusgivare (MS7, Vaisala DSC/DRS511; Trafikverkets presentation 2019). Det är det enda i VViS som mäter att vägen *blev hal*, inte bara kall, och arkivet sparade det inte: vinterns facit hade ingen rad som sa *is*. 🔨 **BYGGT 6/10:** `sql/043_ytstatus.sql` (fyra kolumner, NULL = ingen givare), `weather.ts`, `db.ts` och livemotorns `skriv.ts` fält för fält, provet i `skriv_test.ts` (is och friktion lagras, saknad givare blir NULL), värdevaktens spann för `surface_grip`. Arkivpolicyn är oförändrad. ✅ **I DRIFT 6/10 08:22Z:** migrationen med DB-knappen 37435521114 (kolumnerna lästa), deploy 37435573958 från eedfd06 (loggen: Deployed Functions: ingest-live), och läsningen 37436952330: av 702 rader skrivna efter deployen (08:25–08:38Z) bar 53 surface_grip från 52 stationer, 1 rad is = sann och 5 vatten = sann; värdevakten 37437120416: surface_grip – (för tunt underlag: 60 rader av minst 100; 0,75–0,82, 4 distinkta, inom spannet). 🔑 Kvar: värdevaktens dom OK på `surface_grip` när underlaget räcker (i dag *–*, för tunt: 60 rader, 4 distinkta), läst igen när det blivit kallt; friktionen 0,82 på 92 % av raderna ser ut som givarens torrvärde och ska förstås innan fältet döms. **Verify:** en rad i `weather_observations` med `surface_grip` eller `surface_ice` satt, skriven av livemotorn efter deployen, och värdevakten OK på `surface_grip`.
- [ ] 📍 **#226 AUTOSTARTENS BEHÖRIGHET FALLER TYST PÅ ANDROID 11+** (Axels fynd på testtelefonen 20/9, DECISIONS #272).
  ⚠️ **HÄRLETT, INTE UPPMÄTT:** kortet skrevs på Axels rapport som antogs vara Android — den var från hans iPhone (#273).
  Ingen har kört det här på en Android-telefon. Grunden är kodläsning + Googles dokumentation, inget annat.
  `MainActivity.onAutostartToggle()` anropar `requestPermissions(ACCESS_BACKGROUND_LOCATION)`, och **Android 11+ visar
  inte alternativet i rutan** — Google flyttade *Tillåt hela tiden* till inställningssidan. Anropet faller alltså tyst: användaren
  slår på Autostart, ingenting händer, och ingenting förklarar varför. Resten av appen är opåverkad — vakten är en
  förgrundstjänst med typen `location` och klarar sig på *medan appen används*.
  Verify: på en riktig Android 11+-telefon — slå på Autostart utan bakgrundsplats ⇒ en egen ruta som förklarar vad som
  krävs och en knapp som öppnar appens inställningssida; alternativets namn hämtat ur `getBackgroundPermissionOptionLabel()`
  så texten matchar telefonens eget ordval. Avböjer användaren ska Autostart stanna av utan att något annat går sönder.

- [ ] 🗣️ **#203 FACIT UTAN ATT STANNA — svaret efter resan, och med rösten under den** (Bengts fråga 18/9 efter
  fälttest 2: *"vi måste hitta något system som inte innebär att de ska stanna och bekräfta … ett automatspår"*).
  Dagens S4 kräver: stanna, avsluta vakten, öppna appen, hitta knapparna — och bara resans SISTA varning går att svara på.
  **Förslag i tre lager:**
  **Bengts styrning 19/9 — undantagsprincipen:** *"vi tror att appen är så duktig att vi automatiserar svaren så att
  människan bara ska meddela när maskinen avviker från det som maskinen har förutsett"* — för ALLA varningsslag, inte
  bara kamerorna. Rätt om bördan, fel om tystnaden: **tystnad får aldrig räknas som "stämde".** Tystnad betyder lika
  ofta "såg inte", "kunde inte bedöma", "telefonen låg i fickan" eller "appen var trasig" — 16/9 och 18/9 gav noll svar
  för att knapparna saknades, och med tystnad = ja hade de resorna bokförts som bekräftelser. Ett facit som antar det
  som ska prövas kan inte pröva det. Svaret ska vara en HANDLING, men handlingen kan vara EN per resa:
  **(1) Efter resan — undantagsprincipen med underskrift, båda plattformarna.** Appen sparar resans varningar (id,
  klockslag, text; bara lokalt). När vakten stannar (manuellt eller självstoppet efter 15 min) och det finns obesvarade
  varningar: en lokal notis *"Resan klar — stämde alla 3 varningarna?"* och en lista på hemskärmen med **ett tryck för
  normalfallet: "Ja, alla stämde"**, eller peka ut den som inte stämde (*Stämde inte*) och den man inte kunde bedöma
  (*Vet inte* — skickas aldrig). Skickas som i dag: id, klockslag, svar per varning. **Noll handgrepp i bilen, ett efter.**
  Obesvarade resor skickas aldrig. Bygger på Facit/FacitSender som finns; iOS har notisbehörigheten (HeadsUpService),
  Android POST_NOTIFICATIONS.
  **VAR knappen sitter (Bengt 19/9: *"som det är i dag är det oerhört krångligt … det kommer inte många svar"*):**
  frågan kommer till föraren — föraren letar aldrig. Tre platser, en fråga, ett tryck; svarad på en plats försvinner den
  från de andra. Skiss: `docs/skisser/facit-efter-resan.svg`.
  (a) **Låsskärmen:** notisen bär själva knapparna — *Ja, alla stämde* / *Något stämde inte* — och svaret skickas utan
  att appen öppnas (iOS: notisåtgärd i bakgrunden; Android: notisåtgärd + WorkManager). Kommer vid självstoppet och vid
  *Avsluta vakten*.
  (b) **Överst på Redo.** — ett kort ovanför rubriken, inte en rad längst ner: *Resan 08:25 · 61 min · 3 varningar —
  Stämde alla?* Står kvar tills svaret finns eller ett dygn gått; visas också direkt efter *Avsluta vakten*.
  (c) **Listan** bara vid avvikelse: en rad per varning med klockslag och text; tryck på raden växlar Stämde / Stämde
  inte / Vet inte; sedan *Skicka*.
  Brytarens text skrivs om: *"Efter varje resa frågar appen om varningarna stämde — ett tryck. Det som skickas är …"*.
  **(4) Missarna — det andra halva facit, INGÅR i förslaget (Bengt 19/9: "det ska finnas en möjlighet att rapportera
  missarna också"); integritetsbeslutet är Axels:** *"Hej Siri, appen missade i Halkvakt"* eller en stor knapp *Appen
  missade* i körläget (Androids väg) när det är halt
  UTAN varning ⇒ appen sparar klockslaget och närmaste segment/station som id (räknas på telefonen) och skickar id +
  klockslag efter resan, som ett varnings-id; typen (Halka / Vatten / Vilt / Olycka / Annat) väljs i listan efter resan.
  Ny tabell `driver_miss`. Nettonyttan (KB-B) behöver missarna lika mycket som träffarna. Integritet: samma klass som
  ett varnings-id, men utlöst av föraren — brytarens text måste säga det.
  📄 **BESLUTSUNDERLAG TILL AXEL 19/9: `docs/FACIT-EFTER-RESAN.md`** — hela förslaget, skissen, åtta beslut med
  rekommendation, kostnad och bevis. Bengt skickar; inget byggs förrän Axel svarat.
  **Automatspåret för sanningen finns redan och bär huvuddelen — utan förare:** uppspelningen ur arkiven (mätte ytan
  under noll och blöt EFTER frysriskvarningen? — en senare mätning är en annan mätning, tillåten som facit), kamerabilden
  vid varningen (bildfacit), olycksarkivet, radar + station för vattenplaning (V-B). Föraren är den enda källan för det som
  bara syns från bilen — och avvikelsen (*stämde inte*) är det värdefullaste enskilda svaret, för det är falsklarmen som
  bränner förtroendet (cry wolf).
  **Kontroll i domen:** resor svarade med "Ja, alla" jämförs med resor svarade rad för rad — skiljer sig andelen
  *stämde* markant är "Ja, alla" en vana, inte en iakttagelse, och räknas ner. KB-D4:s tak (ingen förare > 25 %) står.
  **Förslag till KB-D (kräver Bengt + Axel, fastställt dokument): KB-D7 — ett svar är en handling; tystnad är inget svar.**
  **(2) Med rösten under resan — iOS, nästan gratis.** Två App Shortcuts bredvid Starta/Stoppa: *"Hej Siri, stämde i
  Halkvakt"* / *"stämde inte i Halkvakt"* ⇒ svar på senaste varningen om den är yngre än 10 min, Siri säger *"Tack."*.
  Med undantagsprincipen räcker EN fras i praktiken: *"stämde inte i Halkvakt"* när maskinen hade fel, medan minnet är färskt.
  Händerna på ratten, fungerar via CarPlay och bilens Bluetooth, **ingen mikrofonbehörighet** — Siri lyssnar, inte appen.
  Android: Assistant/Gemini-stödet för egna app-fraser är osäkert — (1) först, rösten undersöks.
  **(3) Valfritt:** knapparna i körläget när bilen står stilla (≥ 5 s, varning < 10 min) — rött ljus, färskt minne, ett
  tryck på en monterad telefon.
  **Vad som INTE går:** att automatisera människans iakttagelse. Telefonen kan inte känna halka, och ett svar som ingen
  mätning kan motbevisa får inte räknas (regel T). Det automatiska facit finns redan, utan förare: kamerabilderna
  (bildfacit, bedömningen §4.2), uppspelningen ur arkiven, olycksarkivet. Förarkanalen ska bara bära det bara en
  människa ser — och därför vara gratis att använda.
  **Avvisat:** lyssning i appen efter varningen (mikrofonbehörighet; Bluetooth byter till samtalsläge och musiken tystnar;
  svenskt stöd på enheten oklart) · rattens knappar (kräver att appen tar över musiken) · CarPlay-app (Apples tillstånd)
  · klocka (få testare) · "passerad"-flagga ur positionen (rörelsedata — eget integritetsbeslut, inte nu).
  **Kamerorna är kontrollfrågan:** Trafikverkets kameror är fältverifierade (2/9), så ett *stämde inte* på en kamera
  säger att kanalen eller geometrin är fel — inte kameran. Domen i januari behöver svaren på halka och frysrisk
  (KB-D4: ≥ 30 svar från ≥ 5 förare).
  Kostnad: en Android-push ≈ 15 Actions-min (två jobb) + CI; iOS byggs av Axel — går i nästa bygge efter 0.3.8.
  Rösttexten rörs inte. S4:s utformning är Axels ⇒ hans ja på formen; Bengt beställer.
  Verify: (1) en resa med ≥ 2 varningar besvarad med ett tryck ger lika många rader i `driver_facit`, utan att föraren
  stannat; en resa utan tryck ger noll rader;
  (2) ett svar via Siri med `app = ios` och varningens klockslag.
  🔑 **AXELS SVAR PÅ §8, 20/9 kväll (via Cowork, DECISIONS #267) — sju av åtta avgjorda:**
  **1 ja** (undantagsprincipen med underskrift; KB-D7 till Bengt) · **2 ja, alla tre** (*"låsskärmen är det viktiga —
  föraren ska aldrig behöva öppna appen för att svara ja"*) · **3 de två första** Siri-fraserna (*stämde inte*, *appen
  missade*; *stämde* behövs inte under körning — det är vad låsskärmen är till för) · **4 ja, medvetet ja** —
  station-id + klockslag skickas, *"det är inte en position, men det är en position i grova drag"*; brytarens text ska
  säga det ordagrant och produktboken uppdateras samma dag · **5 ja** (stor knapp *Appen missade*) · **6 nej** (lager 3
  utgår) · **8 ja** (Android i samma PR).
  ➕ **NYTT KRAV ur Axels läsning — visa varningarna i kortet:** *"Ja, alla stämde"* efter tre timmars körning svarar i
  dag på ett TAL (*3 varningar*), inte på något föraren ser. Kortet på *Redo.* ska visa de tre raderna — klockslag och
  text — så att ett tryck är ett svar på något läst. Kostar en vy. **Gör inte KB-D7-kontrollen onödig** (vanan finns
  kvar att mäta, och kontrollen kostar ingenting i domen) men gör den mindre bärande.
  ✅ **BESLUT 7 AVGJORT 20/9 18:35 — A. AXEL ARKIVERAR 0.3.8 NU** (DECISIONS #269). Simulatorprovet försöktes och
  föll på Xcodes egen infrastruktur (*"the system shell probably crashed"*, `host down`, efter 94 s) på en M1 Air med
  8 GB och iOS 26.1-runtime. **Det är svaret på C:s premiss:** C valdes för att kanalen skulle bevisas BILLIGT utan
  TestFlight, och beviset var inte billigt — det kostade mer än den fältrunda det skulle spara. #203 bygger på 0.3.9.
  *Historik:* Axels skäl:
  sändkanalen från en riktig telefon har aldrig bevisats, och att lägga ny funktion ovanpå en obevisad kanal är fel
  ordning. Bengts skäl: en uppdatering i stället för två, och kanalen bevisas utan TestFlight med simulatorprovet.
  **Simulatorprovet är fortfarande ogjort** (`driver_facit` 20/9 16:07Z: 0 riktiga svar, 2 provrader — ingen
  `cam:fotostudio`). **Nytt sedan båda svaren skrevs:** motorfixarna #210 (*"på väg &lt;null&gt;"*) och #211 (tredje
  olycksropet) ligger i main sedan i kväll och når en telefon bara genom ett bygge — ett skäl för A som varken
  underlaget eller #242 kände till. Se DECISIONS #267.
  🔨 **LAGER 1 BYGGT 20/9 kväll (DECISIONS #277) — "grunden", båda plattformarna.** Resans logg, låsskärmsnotisen
  med knapparna i sig (*Ja, alla stämde* / *Något stämde inte*) och kortet överst på *Redo.* med **en rad per
  varning: klockslag + text** (Axels tillägg). Delad ren räkning: `Resan.kt` / `Resan.swift`. Tystnad skriver
  aldrig ett svar — ingen kod i filen gör det. Åtta enhetstester på Android (de första i app-modulen), **gröna i
  CI**; **iOS-halvan är skriven utan kompilator** och kompileras första gången i Axels Xcode (inget CI-flöde bygger
  app-målet — samma rad som #267/#276). iOS krävde tre saker Android redan hade: persistent varningshistorik,
  notiskategori + delegat, och en gemensam tidsstämpel för "Senast sagt" och historikraden (annars två facitrader
  för samma varning). Fotostudion lägger nu in en påhittad **resa**, inte en varning — kortet går att se utan körning.
  ⏭️ **STÅR KVAR PÅ KORTET (lager 2):** Siri-fraserna *"stämde inte i Halkvakt"* / *"appen missade i Halkvakt"* och
  missarna (`driver_miss` + stor knapp *Appen missade* i körläget). Verify står **öppen**: en riktig resa på en
  riktig telefon som ger rader i `driver_facit` utan att föraren stannat.
  ⚠️ **22/9 (DECISIONS #304):** lager 1:s iOS-kod (eb81b50, 20/9 18:17) ligger på main och följer därför med i ett arkiv från main — alltså i **0.3.9 (13)**, inte i (12), som sattes 17:37 före koden. Koden har aldrig kompilerats; Xcode är första provet.
  ↦ **Sorterat 22/9 (kort #224):** Axels beslut är tagna (#267, #269) — lager 2 (Siri-fraserna, `driver_miss`, *Appen missade*) kan byggas nu. iOS-koden kompileras först i Axels Xcode.
  ↪ **26/9: flyttat till Axel och tillbaka i samma varv** (DECISIONS #377): Axels beslut är tagna (#267, #269) — nästa steg är lager 2, Claudes bygge (Siri-fraserna, `driver_miss`, *Appen missade*); iOS-delen kompileras i Axels Xcode.
  ⛔ **26/9, fynd innan bygget (Bengts *"gör 203"*):** missen ska bära *närmaste mätstation (finns alltid)* — men telefonen HAR ingen stationslista. `static.json` bär bara 2 794 kameror, och `live.json` bara stationerna som är nära noll och våta (26/9: en). Missknappen kan alltså inte byggas som Axel godkände den utan att stationerna först läggs i snapshoten. Val i §4.2.
  🔨 **LAGER 2 BYGGT 26/9** (Bengts *"ja till A"* + *"fortsätt med lager 2"*, DECISIONS #379): stationerna i `static.json` i drift (851, 08:20Z); `driver_miss` + `facit-svar`; *Appen missade* och missraderna efter resan på båda, Siri-fraserna på iPhone; 0.3.9 (18). android.yml 36224074048 (Android-steget, JVM-prov inkl. sju nya i MissarTest) och 36224807598 (hela grenen, emulator och fotostudio) gröna på grenen; motprovet 36224079213 rött på exakt de två väntade proven (en omarkerad miss skickas, segmentgränsen 40 km) — 53 prov, 2 fällda. 🔑 Kvar: migration + deploy efter sammanslagningen, Axels Xcode-bygge (18), Verify 2–3 i bil, policymeningen (Axel).
  ✅ **SERVERN I DRIFT 26/9 07:00Z** (DECISIONS #380): migrationen sql/038 via dbknapp 36225368861 (tabellen finns, RLS på, anon utan SELECT och INSERT), deploy av `facit-svar` 36225396540 från main, provmiss mot den riktiga funktionen ⇒ 204 och en rad med `prov = true` (dbknapp 36225453047; 0 riktiga), två felaktiga missar ⇒ 400, och ett provsvar på den gamla vägen ⇒ fortfarande 204.
  📊 **FÖRARSVAREN LÄSTA 5/10** (Bengts *"ja"*, dbknapp 37249631052): `driver_facit` har **29 riktiga svar**, alla *Stämde*, alla iOS 0.3.9,
  i åtta sändningar 22/9–1/10. 28 gäller fartkameror och 1 en händelse (`dev:`); **inget gäller en halkvarning**. Kortets första prov är delvis
  sett: 26/9 gav 8 varningar (12:11–12:55) åtta rader i en sändning 13:13, men om föraren stannat syns inte i datan. Det andra provet
  saknas, eftersom inget svar är *Stämde inte* och ingen rad kom via Siri. `driver_miss`: bara serverns prov. Sändningarna 1/10 17:22 (fyra kameror 13:16–13:22) är
  Axels resa 12:39–13:44 (kort #279); samma fyra kameror 28/9 17:41–17:48 och en av dem 21/9. ~~Vems resan 26–27/9 är står i §4.2.~~ ✅ 6/10: Bengts; händelsen 29/9 Axels. Alla 29 är projektgruppens (Bengt 19 (26–27/9), Axel 10 (21/9, 28/9, 29/9, 1/10); båda i projektgruppen (Bengts besked 6/10)).

### Claude — låst (väntar på nyckel)
- [ ] 🔒 **#285 iCLOUD-KOPIAN BÄR UNGEFÄR VAR OCH NÄR** (upptäckt 2/10 kväll när *spara en rutt* utreddes, kort #233). På iPhone ligger `history`, `facit` och `missar` i `UserDefaults.standard` (`SpeechService.swift`, klassen `Prefs`), och den följer med i iCloud- och datorkopian. Varningarnas id, närmaste station och klockslag säger ungefär var och när föraren körde. Inget skickas till Halkvakt, men det lämnar telefonen i förarens egen kopia. Android har `allowBackup="false"`, men flytten vid byte av telefon omfattas inte av den på Android 12+. 🔑 Axels beslut: är det förenligt med *ingen position lämnar telefonen av sig själv*, eller ska de flyttas till en fil som undantas? Verify: beslutet i DECISIONS, och vid flytt ett test som visar att filen är undantagen.
- [x] ✅ **#278 BETAN: BÅDA VÄRDEPAREN I SKUGGAN, ETT HÖRS (ÖVERSPELAT 6/10 — kalibreringen gav startvärdena, DECISIONS #468)** (Bengts fråga och beslut 1/10, DECISIONS #427). Efterhalkans regel följs
  vintern 2026/27 med två värdepar på samma nätter — startvärdena från 16/9 och kuvösens kalibrerade värden (#425) — så att det syns var
  de skiljer sig: båda hade varnat, bara det ena, bara det andra. Uppspelningen (sql/028) och skuggans råa logg räcker; det som ska byggas
  är utskriften som ställer dem bredvid varandra, bara antal fram till domen. Rösten kan inte dubbleras: en variant hörs, och förarnas
  svar gäller den. 🔑 Nyckel: kalibreringens frysta värden ur kuvösen (kort #232) · Bengts och Axels val av VILKEN som hörs (§4.2;
  de kalibrerade kräver en ändring av TROSKLAR-KOMBINATIONEN §7 före betan) · Axels bygge av regeln i motorn (S3).
  Verify: jämförelsen körd på vintern 2024/25 i kuvösen och på en vecka av årets vinter, med de tre antalen utskrivna; valet av röst
  inskrivet i DECISIONS innan kalibreringens resultat lästes.
  ✅ **VALET AV RÖST GJORT 1/10, före kalibreringen (Bengt, DECISIONS #428):** de kalibrerade värdena hörs om vinnaren håller i båda halvorna av vintern 2024/25, annars startvärdena; hinner kalibreringen inte frysas före betan gäller startvärdena. ✅ **Axel godkänner samma kväll (via Bengt)** — ändringen i TROSKLAR-KOMBINATIONEN §5 och §7 gäller. 📝 Betaguiden (`docs/BETAGUIDE-IOS.md`) säger *"gissade till februari … justeras i februari"*, vilket inte stämmer sedan #425; skrivs om när det är känt vilka värden som hörs. ✅ **OMSKRIVEN 1/10 (Bengt, DECISIONS #429):** *"Trösklarna är satta i förväg och ändras inte under vintern utan ett eget beslut"* — stämmer vilket par som än hörs. 🔑 Har Axel redan klistrat in TestFlight-texten i App Store Connect ska den nya lydelsen klistras in där.
  ↪ **ÖVERSPELAT 6/10 (DECISIONS #468, TAVELREGELN 3):** kalibreringen i kuvösen hittade ingen punkt under taket, så de frysta värdena ÄR startvärdena — det andra värdeparet är detsamma som det första och det finns inget att ställa bredvid. Nyckeln levererad, valet av röst (#428) utföll till startvärdena. Axels bygge av regeln i motorn (S3) hör till betans bygge, inte till den här jämförelsen.

- [ ] 🔳 **#277 QR-KOD TILL APPEN — en kod för båda plattformarna, via halkvakt.se** (Bengts fråga 26/9 *"kan man hämta appen med qr kod"*,
  beslut 1/10: *"qr kod kommer först med domänen"*, DECISIONS #423). En QR-kod är bara en länk. Koden ska peka på en egen adress
  (halkvakt.se/app) som skickar iPhone till TestFlight eller App Store och Android till Google Play — aldrig direkt på en TestFlight-länk,
  som kan stängas eller bytas medan en tryckt kod inte går att ändra. Koden görs lokalt, utan tredjepartstjänst (som i
  `docs/QR-SIDA-PER-SKOLA.md`). 🔑 Nyckel: domänen (kortet *Skydda namnet*) · en publik TestFlight-länk eller App Store-sidan (Axel) · Play-länken (#219).
  Verify: koden skannad på en iPhone och en Android landar på rätt installationssida, och adressen går att peka om utan att koden trycks om.

- [ ] 🛢️ **#276 OLJA PÅ VÄGEN — HALKA SOM RÖSTEN INTE SÄGER** (fynd 26/9 under vägarbetsmätningen; hette #262 på grenen som aldrig
  slogs ihop, DECISIONS #420). `NonWeatherRelatedRoadConditions` i `situation_archive` (dbknapp 36232854353, `scripts/matningar/icke-vaderhalka-arkivet-2026-09-26.sql`): **99 händelser 31/8–25/9** (≈ 3,8 om dygnet), alla *Trafikmeddelande*, 24 med stor eller mycket stor påverkan; de flesta av de 25 vanligaste texterna är **olja, diesel eller hydraulolja på vägbanan — *risk för halka*** (några potthål, en vägskada, grus i en rondell).
  Snapshoten skickar bara olyckor (`deviations`) och djur (`djur`), så appen tiger om dem — fast det är halka i appens egen mening, rapporterad
  av Trafikverket (en observation, inte en prognos: regel T tillåter att den utlöser). Tre vägar: (a) skuggan först nu — skuggmotorn loggar
  var rösten skulle ha talat, ingen text i appen; (b) vårlistan tillsammans med #32 hinder; (c) låta bli. 🔑 Bengts och Axels val (§4.2);
  rösttexten är Axels. Verify för (a): skuggloggen bär rader med oljefaror, och en mätning visar hur ofta rösten skulle ha talat per varv.
  ✅ **Bengt 1/10: väg (a)** (DECISIONS #421) — skuggan först, egen kolumn som vattenplaningen, egen motorinstans, hela klassen med text, ingen ändring i appen. 🔨 Byggs i egen PR efter omtaget.
  🔨 **BYGGT 1/10:** `sql/040` (kolumnen `olja` + RPC `olja_aktiva()`, bara service-rollen; aktiv = start ≤ nu < slut, utan sluttid bara första dygnet — 117 händelser, alla med sluttid, median 1 h 48 min, 4 aktiva 1/10) · skuggmotorn: egen motorinstans per rutt, raden i `shadow_log.olja`, `oljaSkal` i svaret · `?oljaprov=1` (dbknappens `oljaprov`) skriver inget · integrationsprov mot PostGIS · mätningssidan 7.7. 🔑 Kvar: *"slå ihop"*, **`sql/040` FÖRE deployen** (annars avvisas skuggloggens rader), deploy, oljaprovet och första raden med innehåll.
  ✅ **I DRIFT 1/10** (DECISIONS #421): PR #660 sammanslagen 14:36Z (969610c) · `sql/040` via dbknapp 36877728231: kolumnen `olja` jsonb med standard `[]`, `olja_aktiva()` svarar med **5 aktiva** — alla fem vägskador (asfaltskador, körplåtar, stenskott, bärighet), ingen olja — och bara service-rollen får köra den (anon och authenticated nej) · deploy av skuggmotorn 36877830446 från main · oljaprovet 36877971571: en rad (*Prov: olja på vägbanan*, 573 m), `aktiva` 5, inget skäl · Skuggvarven efter deployen skrev sina rader i alla fyra länder (FI 14:45, DK 14:50, NO 14:55, SE 15:02Z — tre rader var, ingen avvisad för den nya kolumnen); det svenska varvet svarade ok med 5 aktiva och 0 rop, eftersom ingen av de fem låg på varvets tre rutter (dbknapp 36881359482). Kvar för Verify: första riktiga oljeraden och mätningen av hur ofta.
  ↪ **Flyttat 1/10 från *Bengt*** (DECISIONS #423): i drift sedan 14:38Z; nyckeln är data — första riktiga oljeraden i skuggloggen. Inget väntar på Bengt.


- [ ] 🌡️ **#271 TERMISK KARTERING — FACIT MELLAN STATIONERNA** (30/9, `docs/PROGNOSLAGRET-2026-09-30.md` §4; DECISIONS #406/#407
  visade att vägen mellan stationerna saknar facit och att målplatsens egen särart är felets största del). En kalibrerad infraröd
  vägytetermometer med positionslogg i projektets bil, tre till fem klara kalla nätter per vinter på testförarnas rutter: uppmätt
  yttemperatur var femtionde meter, facit för bandet 0–7 km och kalibrering av platsens offset. Loggern är egen utrustning, inte
  appen — invarianten berörs inte, sägs öppet. Simulering ur höjd, skuggning, trädtäcke, vatten och trafik (kandidat KOVARIAT, egen
  post) kan bygga men inte validera. 🔑 Bengts och Axels ja, utrustning (Axel prissätter klass), och pengar (projektets
  egna, eller Skyltfondens AP2 om raden kom med i den skickade ansökan — okänt i repot, DECISIONS #409). *Verify:* första karteringsnatten loggad i arkivet med sträcka, datum och
  antal punkter; en DECISIONS-post som registrerar den som facitkälla innan den används i en dom.

- [x] 📣 **#261 KÄLLVAKTENS FALSKA POSITIVER — bedömningen matchar mot sidans möbler** (fynd 28/9 under
  mätvaktsfelet, DECISIONS #384). 🔑 ~~NYCKEL: Bengts ja.~~ ✅ **JA 28/9 — BYGGT SAMMA KVÄLL.**
  Måndagskörningen 06:40 skapade **fem** källändringslarm (issues #635–#639). Lästa i efterhand kräver
  minst två av dem ingen åtgärd alls, och båda är röda av samma skäl:
  · **#639 `polisen-api` dömdes 🔴 RÖR OSS på ordet *api*** — som står i sidans EGNA permanenta rubrik,
    "API över polisens händelser". Ordet kan aldrig försvinna, så den domen kan aldrig bli annat än röd.
  · **#635 `smhi-uppdateringar` dömdes 🔴 RÖR OSS på *observation*** — i en post om **HYDROLOGISKA**
    observationer. Vi läser metobs, alltså meteorologiska. Ordet är rätt, ämnet är fel.
  · De tre övriga (#636 halkvarning, #637 dk-dmi, #638 polisen-regler) ändrades i cookiebanner, sidfot,
    nyhetskarusell och raden *"Granskad # september"* — vaktens sifferstrippning gör datumet till `#`,
    men det ÄNDRADE datumet flyttar ändå textlängden och därmed hashen.
  ⚠️ **RÄTTELSE AV MIN EGEN KORTTEXT (28/9, innan en rad kod skrevs).** Jag skrev att *"bedömningen
  läser hela sidan i stället för det nya stycket"*. **Det var fel** — `changes.push` skickar redan bara
  `nya.join(" ")`, alltså enbart de nya styckena. Mätningen mot state-filens sparade texter
  (21/9 mot 28/9) gav den riktiga mekanismen:
  · **Styckena är för grova.** `nyText` delade bara på `.!?:`, och normaliserad HTML har få
    meningsslut — rubrik, meny och cookiebanner blir EN körning. Längsta uppmätta: **2 054 tecken**.
  · **Uppmätt orsak till den falska röda:** ordet **"myndighet"** försvann ur polisens cookietext.
    Rubriken *"API över polisens händelser"* satt i samma 152-teckens körning och följde med in i
    "det nya" — och domen föll på ordet *api* ur en rubrik som står där permanent.
  ✅ **BYGGT 28/9 (DECISIONS #385), två skilda lagningar med var sitt motprov:**
  · **(1) `nyText` delar även på `|`, `·`, `•`.** Rubriken blir eget stycke. Prövat mot den riktiga
    datan: samma ändring ger nu **0 nya stycken med ordet *api*** — och larmet går fortfarande ut,
    som VET INTE. Bedömningen graderar, den tystar aldrig.
  · **(2) Det breda ordet `observation` ströks** ur metobs nyckelord. **Fyndet bakom fyndet:**
    ordet *hydrolog* stod REDAN som främmande ord på signalraden — kunskapen fanns. Men en träff
    rankar över ett främmande ord i graderingen, så det för breda ordet tystade det som var rätt.
    Nu blir posten ⚪ **RÖR OSS INTE** med skälet utskrivet, i stället för 🔴.
  🧪 **Motprov, ett per vakt** (läxan 20/9): delningen backad ⇒ test 27 faller · `observation`
  återinfört ⇒ test 29 faller. Med båda lagningarna: 30/30 i sviten, 199/199 i hela `npm test`.
  📏 **MÄTT GRÄNS FÖR LAGNING 1 (28/9, efter bygget):** `|`-delningen tar RUBRIKER, inte MENYER.
  Prövat på `no-vegvesen` (issue #641) mot samma två sparade texter: före fixen bar de nya styckena
  både *datex* och *publikasjon*; efter fixen försvinner **datex** (rubriken "Informasjon og nyheter om
  DATEX" blir eget stycke, 657 → 623 tecken) men ***publikasjon* står kvar** — det ordet sitter inne i
  en 623 teckens NAVIGATIONSMENY utan avgränsare. #641 hade alltså dömts 🔴 även med lagningen, på ett
  ord ur menyn. Och `no-vegvesen` är signalkällan för ett PRODUKTIONSberoende, alltså just den sortens
  falska röda som lär en att ignorera den som betyder något.
  🔑 **NÄSTA STEG, ej byggt, kräver ditt ja:** döm på ORDNIVÅ i stället för styckenivå — när ett nytt
  stycke är nästan identiskt med ett gammalt, bedöm bara de ord som faktiskt skiljer. Det är den
  generella lagningen; ett sitespecifikt menyfilter glider isär från det det filtrerar.
  ⏳ **KVAR:** footerns *"Granskad # september"*-rad ger fortfarande ett VET INTE-larm. Det är brus,
  inte en falsk röd, och det lagas inte med ett sitespecifikt filter utan att någon ber om det.
  ⚠️ Samma familj som mätvaktens 168 larm och som gravstenarna: bruset gör signalen osynlig. Skillnaden
  är att här är bruset *innehåll*, inte upprepning — fem olika issues, inte en upprepad.
  Verify: en körning där en ändrad granskningsdatum-rad INTE ger ett larm, och där ett påhittat äkta
  ord i ett nytt stycke fortfarande gör det (motprov åt båda hållen — en fälla som inte kan fälla
  något är ingen fälla, läxan 20/9).
- [ ] 🧂 **#231 PRODUKTIONSREGELNS FALSKLARM PER VÄDERTYP — en rad i bildfacitets läsning** (Bengts ja 21/9, Axel utan synpunkter samma dag, DECISIONS #291,
  ur second opinion #290). 🔑 **Nyckel: bildfacitets läsning (#209) — beslutet efter första frosten, bilderna öppnas i mars.**
  På en stadigt kall snödag säger stationsregeln *kallt och nederbörd* också på en saltad väg med fullt grepp; stationen ser
  inte saltet, och ingen grind mäter det i dag. När bilderna läses delas produktionsregelns varningar (`icing_point`) i
  *stadigt kallt* och *övergång*, och andelen bilder med bar eller våt väg redovisas per grupp. **Ingen tröskel rörs, ingen
  röst ändras** — det är en mätning av en känd svaghet.
  📐 **Definitionen skrivs FÖRE läsningen** (in i DECISIONS innan den första bilden öppnas). Förslag att ta ställning till då:
  *övergång* = stationens yta har legat över +1 °C någon gång under de N timmarna före varningen, annars *stadigt kallt*;
  N redovisas för 3 · 6 · 12 h, alla tre utskrivna, ingen vald i efterhand.
  ⚠️ Kontrollera när kortet byggs att arkivet bär stationens ythistorik för varningarnas tidpunkter (`weather_observations`
  tunnas till halvtimmeshinkar efter sju dygn, sql/014) — annars måste historiken loggas vid varningen, och då i god tid.
  Verify: definitionen i DECISIONS före första bilden · tabellen *vädertyp × bar/våt väg* i bedömningen vid mars-läsningen.
  ✅ **Definitionen skriven 24/9 (DECISIONS #336), före första hinkbilden:** övergång = yta > +1 °C någon gång de 6 h före varningen, annars stadigt kallt; redovisas också vid 3 och 12 h.

- [ ] 🧭 ↩︎ **#38b Stråket / skuggmotorn — ÅTERSTÄLLT 10/9** (föll av tavlan 8/9 20:43 i commit
  99473c7; #88, #91 och #95 hänvisar hit). Bengts byggplan v3 (31/8): segmentmotorn i november, i
  strikt skugga, dom i mars. Sekvensering mot lanseringen = Axels beslut.
  **Verify (kortgenomgången 3/10, DECISIONS #451):** grind B och C fällda i mars 2027 med `publish/grind-s-b.ts` i domläget
  enligt docs/TROSKLAR-SKUGGAN.md (B1 ≤ 20 %, B2 ≤ 30 %, B3 ≥ 25 %; C1 ≥ 20 facit i ≥ 3 halkperioder, C2 ≥ 30, C3) och
  domen bokförd i DECISIONS.
  - [x] ~~(1) Tröskeldokumentet~~ ✅ 1/9 (DECISIONS #52): docs/TROSKLAR-SKUGGAN.md, grind A/B/C.
  - [x] ~~(2) Ankarklippningen~~ ✅ 1/9 (DECISIONS #55): kamerorna ger ingen ny ankartäthet
    (738/744 står vid en VViS); Norrland 9,2 km / 12,6 % oförändrat. Knappen ankaranalys.yml.
  - [x] ~~**(3) Offsetmodellen mot arkivdata (grind A)**~~ ✅ **DÖMD KLARAD 23/9 (Bengt, DECISIONS #321)** — publish/grind-a.ts, knappen grind-a,
    leave-one-out mot A1–A3, domspärr under 500 punkter/20 stationer, larmväg bevisad 1/9.
    Rökprov 1/9 (43 punkter): felet växer med ankaravståndet (0,63 °C 0–7 km → 5,39 °C >20 km).
    AUTOMATISK måndagar 05:40. 🔑 Skarp prövning på vinterdata (≥ 500 punkter) före november.
    ~~🔴 **DOMEN HAR FALLIT 12/9 — OCH DEN ÄR ETT NEJ**~~ ⚠️ **överspelat samma dag: INGEN DOM med båda vakterna — grind A föll inte (#131, #180; påmint 21/9, #288).** Ursprungsraden, för spårbarheten: (körning 06:51, 60 dygn, DECISIONS #119).
    Den 1/9 höll domspärren på 57 punkter ("INGEN DOM"). Nu **2 042 punkter**, 36 gånger fler, och
    vakten släpper: **A1 MAE 1,06 °C mot kravets 1,0 ⇒ FALLER. A2 grova fel 10,7 % mot 5 % ⇒
    FALLER. A3 frysklassfel 1,1 % mot 10 % ⇒ KLARAR med bred marginal.** Skriptets egen rad:
    *"GRIND A FALLEN — bygg ingen skugga (tre veckor sparade)."*
    🔄 **OMKÖRD 12/9 MED BÅDA VAKTERNA (DECISIONS #131, Bengts order + Axels ja): INGEN DOM.**
    Med #75:s givarvakt (#129) och marginalvakten: **A1 0,85 ± 0,05 mot 1,0 ⇒ KLARAR**,
    **A2 5,1 % ± 1,0 pe mot 5,0 % ⇒ OAVGJORT**, **A3 0,3 % ± 0,2 pe mot 10 % ⇒ KLARAR**.
    ⛔ **Det är INGET godkännande** — grinden öppnar bara på KLARAR, segmentmotorn får inte
    byggas. Men husets svar är nu "vi vet inte än" i stället för "nej".
    ✅ **ANOMALIN FINNS INTE LÄNGRE I TALEN:** 0,33 · 0,78 · 0,85 · 0,89 stiger monotont med
    ankaravståndet. Bandet som var sämst av alla fyra är nu näst bäst.
    ⏰ **OCH DÄR SITTER NOVEMBERBESLUTET:** A2 går inte att avgöra på septemberdata, och
    vinterdata kommer EFTER november. Valet står mellan att skjuta segmentmotorn till nästa
    vinter eller bygga på en modell som inte är klarerad. **Bengts och Axels.**
    ⚖️ **MARGINALVAKTEN INLAGD 12/9 kväll (DECISIONS #126/#127) — OCH A1 FÖLL ALDRIG.**
    Domspärren vaktade mängden underlag, inte marginalen. Med vakten: **A1 1,06 ± 0,09 °C mot
    tröskeln 1,0 ⇒ OAVGJORT** (intervallet omsluter tröskeln), **A2 10,7 % ± 1,3 pe mot 5,0 %
    ⇒ FALLER brett**, A3 1,1 % ± 0,4 pe mot 10 % ⇒ KLARAR brett. **Domen står — men den vilar
    på ETT mått, inte två.** Det skärper vad den säger: inte "modellen är i genomsnitt för
    dålig" (oavgjort) utan **"den går tillräckligt ofta tillräckligt fel"**. Läs om raden
    nedan i ljuset av det.
    ⚠️ **Tre saker som måste läsas med innan någon agerar:** (a) A1 faller på SEX HUNDRADELAR
    (1,06 mot 1,00) medan A2 faller med marginal — det är de grova felen som fäller, inte
    medelfelet. (b) Bandet **7–15 km är sämst av alla** (MAE 1,41 · 18,4 % grova), sämre än
    > 20 km — inte monotont i avstånd, och utan förklaring i dag. (c) Frysklassfelet klarar med
    1,1 %: modellen är nästan tillräcklig för det BESLUT den används till, men inte för den
    TEMPERATUR den rapporterar.
    🔬 **ANOMALIN MÄTT 12/9 kväll — OCH FÖRKLARAD** (`scripts/anomalin.ts` + knapp, Bengts order
    efter Axels bedömning, DECISIONS #125). **Grind A bär INTE #75:s givarvakt.** Frågesatsen tar
    varje rad med `surface_temp_c` utan att kräva rimlig yta−luft, och 61 % av arkivets frostrader
    faller på den vakten (#106). En trasig givare förstör både sin egen punkt och sina GRANNARS —
    och en granne på 10 km får hög vikt. **Med vakten på är anomalin borta:** 7–15 km går från
    1,41 / 18,4 % till **0,78 / 3,1 %**, och banden stiger monotont med avståndet
    (0,33 · 0,78 · 0,85 · 0,89) precis som fysiken förutsäger.
    ✅ **OCH DOMEN STÅR ÄNDÅ.** A1 skulle klara (0,85 mot 1,0). **A2 faller på en tiondels
    procentenhet: 5,1 % mot 5,0 %.** Därför lades en decimal till i utskriften innan något
    rapporterades — "5 %" dolde exakt den skillnaden. Ingen tröskel har rörts.
    ❌ **Min egen konfunderingshypotes är FALSIFIERAD:** inom Norrland ensamt är 7–15 km
    fortfarande värst (0,33 · **2,10** · 0,96 · 1,09). Anomalin är inte geografi.
    🏔️ **Axels terränghypotes träffar PLATSEN men inte FORMEN:** hela skadan ligger i cellen
    höjdskillnad 50–100 m (4,16 / 55,3 % på 47 punkter), men ≥ 100 m är välartad (0,59). Vore
    mekanismen "nära nog för vikt, långt nog för annan terräng" borde ≥ 100 m vara värst.
    ⚠️ **OCH EN KOMPLETTERING TILL AXELS VERIFIERING:** hans 302 stationer är det GEOMETRISKA
    bandet. Domen bärs av stationer som faktiskt gav en utvärderingspunkt, och där är talen
    **5 · 13 · 19 · 88**. **7–15 km-domen vilar på tretton stationer.** 629 av 761 stationer hade
    ingen enda vintertimme. Det ÄR ett urvalsfel — inte i geometrin han kontrollerade, utan i
    vilka stationer som blev kalla nog med en samobserverande granne.
    🕳️ **Bifynd värt ett eget kort:** mellersta Sverige (58,5–60,5°) bidrar med TOLV punkter
    totalt. Grind A:s dom vilar i praktiken på Norrland och Skåne.
    🔑 **ATT BESLUTA (Bengt + Axel):** ska grind A:s frågesats få #75:s vakt? Huset kallar den
    obligatorisk för varje väderfråga; grind A har den inte. Det är inte målstolpsflytt — men det
    ändrar talen, och därför är det inte Claudes beslut.
    🔑 **DOMEN ÄR BENGTS OCH AXELS, inte Claudes** — kortet står kvar
    som låst tills de läst talen. Frågan att avgöra: faller hela segmentmotorn, eller ska A2:s
    gräns prövas mot vad frysklassfelet faktiskt visar?
  - [ ] **(3b) Ankarbreddningen** (Bengts fråga 1/9: "vad krymper avståndet?") — rangordningen
    står: FELKARTAN DÖMER (behöver luckan lagas alls?), LUFTANKARNA LAGAR, HÖJDEN FINJUSTERAR.
    · Grannländerna: FI MÄTT 1/9 (Norrland >20 km 12,6→11,5 %). NO/Frost KÖRT 2/9 (DECISIONS
      #60c): luckan RUBBAS INTE (9,1 km / 11,5 % i alla steg) — den är INLANDS, inte vid gränsen.
    · SMHI-luftankare: smhi-prov byggt + kört 1/9 (34 augustipunkter, INGEN dom): stör inte
      nära (2,56→2,50 °C), hjälper >20 km (5,83→4,37 °C, 4 nya punkter à 1,57 °C). Måndagar
      06:00. Vidgat 10/9 till pusselbit för "3 km fram" — se #95 (molnmängd = representativitets-
      radie, förtätning).
      🔄 **VÄNT 12/9 PÅ 56 GÅNGER MER DATA** (DECISIONS #119): 1/9:s "hjälper > 20 km" vilade på
      34 punkter varav 4 nya. Omkörningen har **1 918 jämförbara punkter** och säger motsatsen:
      bas 1,05 °C → **+SMHI 1,20 °C, alltså SÄMRE — i varje band**, inklusive > 20 km
      (1,02 → 1,35). 235 aktiva luftstationer, alla med data. De 352 punkter som bara finns tack
      vare SMHI har MAE 2,36 °C. **Läsningen är tvådelad:** som FÖRTÄTNING där VViS finns är svaret
      nej — luftankaret stör. Som RESERV där VViS saknas helt är 2,36 °C priset, och det är en
      annan fråga (§2.8 Verify 2). **§2.8:s ankarroll är därmed i praktiken avgjord utan att en rad
      byggts.** Läxa: ett fynd på 34 punkter är en riktning, inte ett resultat.
    · Höjden: UTLYFT 10/9 till eget kort #96 (Bengts order) — lapse 0,71 °C/100 m (rättat till 0,63 17/9, DECISIONS #226), räcker inte ensam,
      måndagar 07:00. Här kvar bara som led i rangordningen ovan.
    · GIS-svansen (dalgångar/skuggning) = kort #91 kallplatslagret. Rörs inte förrän vinterns
      höjdprov motiverar den.
  - [ ] (4) Skuggkörningen — startar när det finns halka att skugga (~mitten av oktober, Skåne).
    🟢 **BESLUTAT 23/9 (Bengt, DECISIONS #322): bygg i skugga i vinter.** Start mitten av oktober, ~tre veckor: prognoskolumn i
    `shadow_log`, buntad ur `engine/src`, varje segment uppmätt / modellerat / okänt. Ingen röst, inget till användaren
    före mars 2027. Axel äger sekvenseringen mot App Store-lanseringen (DECISIONS #320).
    🔨 **PÅGÅR 23/9 (Bengt: *"bygg nu"*, DECISIONS #325): starten flyttad från oktober till nu.** Byggt 23/9: `sql/032` (kolumnen
    `prognos`, funktionen `vagpunkt_ankare`), `engine/src/segment.ts` (rå avståndsviktning, provpunkt var 2 km, status och
    frysflagga i raden, tio tester), skuggmotorn loggar per rutt med `ankare`/`ankareSkal` i svaret, skuggrapporten räknar.
    Tidsdelen utelämnad med flit. Kvar: migrationen körd, bunten deployad, första raden MED innehåll, facitkopplingen
    (`publish/missar.ts`), dom-knappen för grind B/C, holdout-urvalet (4c), Finland.
    ✅ **I DRIFT 23/9:** migrationen körd (744 ankare), bunten och rapporten deployade 20:51–20:52Z från a894f01. **Första raden MED innehåll:** 2 rader med innehåll i `shadow_log.prognos` efter varvet 2026-09-23T21:00:02Z; t.ex. E14 Sundsvall→Åre: 130 provpunkter, 7 uppmätta, 123 modellerade, 0 okända, 0 frysflaggade, 1465 byte; skuggmotorns svar: ankare 5 bidragande per provpunkt (744 i funktionen); E4 Linköping→Södertälje 77 punkter, 970 byte, ankareSkal det svenska svaret hann rulla ur net._http_response före läsningen; det norska varvet svarade ankare 0, "bara Sverige", som avsett.
    Kvar: facitkopplingen, dom-knappen, holdout-urvalet (4c), Finland, radstorleken mätt efter första dygnet.
    🔨 **FACITKOPPLINGEN OCH DOM-KNAPPEN BYGGDA 23/9 (DECISIONS #327):** `publish/grind-s-b.ts` + `grind-s-b.yml`, två lägen (underlag = bara
    antal, dom = andelar vid utsatt tid). Självtest med känd sanning grönt. Kamerafacit saknar tabell — kort #242.
    ✅ **Första underlagskörningen:** körning 35923243716, 21:34Z, läge underlag, 1 dygn: självtestet grönt först; skarpt 4 varv på 4 rutter, 371 provpunkter, 5 holdout-rader, 0 episoder, 0 facithändelser, 0 halkperioder, C1 0/20, C2 0/30 — och inte en enda procentsats i utskriften. Kvar i (4): Finland (det finska arkivet saknar `vagpunkt_ankare`),
    och sedan vintern: loggning, söndagar, måndagsserien. Domen i mars. ✅ **Radstorleken mätt 24/9:** 26 rader med prognos 21:00Z–02:00Z, 1 098 byte i snitt, 28 kB totalt, 5,2 rader per timme ⇒ ≈ 125 rader och ≈ 140 kB per dygn, ≈ 4 MB per månad; skuggloggen 2,4 MB på 9 896 rader, databasen 193 MB (24/9 02:00Z) — 2 km står.
  - [x] ✅ **(4a) SVARAT 23/9 (DECISIONS #324): rå avståndsviktning, ingen offset, på grind A:s population — inskrivet i TROSKLAR-SKUGGAN §3, bekräftad av Bengt 24/9 (DECISIONS #328). Offsettabellen utgår ur bygget.** Var: TROSKLAR-SKUGGAN §3 säger hur offseten når en vägpunkt utan historik (rå avståndsviktning,
    interpolerad offset ur grannparen, eller terrängkorrigerad) — Claude skriver förslaget, Bengts rad enligt §5.
    Villkoret 23/9 nedan (🛣️).
  - [x] ✅ **(4b) ÖPPEN 23/9 (DECISIONS #324): RÅ klarar A1 0,71 °C · A2 3,8 % ± 0,4 · A3 0,0 % på 8 132 punkter med vakterna, lika bra som offseten (0,72). INTERP faller (9,5 %), höjden oavgjord (4,7 %). Första körningen utan vakterna föll (RÅ 1,11 °C, 9,1 %) — fel population, rättad i PR #511 före domen. Körs vidare måndagar.** Vägpunktsgrinden (Bengts ja 23/9, DECISIONS #323): grind A:s mått, trösklar och vakter på kandidater som inte får
    låna målets historik (rå · interpolerad offset · höjdkorrigerad), i `scripts/hojd-prov.ts` på måndagsklockan. Öppnar
    bara om en kandidat klarar A1–A3; den blir svaret på 4a. Öppnar den inte byggs inget i oktober. Två kandidater hade tal
    12/9: rå 1,65 °C, rå+höjd 1,65 — grinden hänger på interpolationen. Första körningen 23/9 på knapp.
  - [ ] (4c) **Holdout-stationer på skuggrutterna** (DECISIONS #323) — 🔨 **BYGGT 23/9 (DECISIONS #326): leave-one-out varje varv för varje station inom 2 km av rutten, loggad i `prognos.h` med egen mätning; inget tas bort ur prognosen. Bevis 23/9: varvet 21:30Z: E4 Sundsvall→Umeå 2 holdout-rader (station 2244 vid km 1,1: mätt 11,0 °C, skattad 9,7, närmaste övriga ankare 4,7 km, fem ankare), E18 Karlstad→Örebro 3 (1712 vid km 45,7: 12,3 mot 13,8; 1830 vid km 63,3: 13,3 mot 13,4); 798 och 1 315 byte per rad.** ✅ stationer mitt på sträckan hålls utanför modellen så vägen
    får en domare hela vintern (§2). Mätt 23/9 (`scripts/matningar/holdout-kandidater-2026-09-23.ts`): 227 svenska stationer
    inom 5 km av rutterna, **90 i 7–20 km-banden** när de tas bort (E4 Helsingborg→Jönköping 10, Rv70 8, E6 Halmstad→Göteborg 7,
    E4 Gävle→Sundsvall 7); Finland 59. E4 Umeå→Luleå noll inom 5 km — linjen är för grov. Urvalet och uteslutningen ur
    modellen skrivs in i tröskeldokumentet med 4a.
  - [x] ~~Skuggmotorns prognoskolumn buntas ur engine/src~~ ✅ scripts/bundle-skuggmotor.ts,
    ci.yml kör --check (läxan i CLAUDE.md).
  📏 **23/9 — kortets grind A-text ovan är inaktuell:** grind A är **KLARAD** 21/9 utan vakterna (A1 0,75 °C, A2 3,8 % ± 0,5, A3 0,3 % på 5 745 punkter) och 22/9 med radvakt och karantän (A1 0,71, A2 3,5 % ± 0,4, A3 0,0 % på 7 356; DECISIONS #299). ~~Kvar i (3): Bengts och Axels formella dom.~~ Dömd 23/9 (DECISIONS #321). (3b) är i praktiken avgjord (FI/NO mätta, SMHI som förtätning sämre, höjden #96, GIS #91). §4 i tröskeldokumentet rättad 23/9 (#198, DECISIONS #319): prognosen blir karta och förstärkare, aldrig röst ensam. Novemberbeslutet står som egen rad i bedömningens §4.2. Beskrivning i sin helhet: `Halkvakt-38b-strak-2026-09-23.md` på Bengts skrivbord.
  🛣️ **23/9 — vägpunkten utan historik (Bengts fråga: är höjden och terrängen egna ben? Nej, delar av samma modell):** grind A förutsäger en **station** ur grannarna plus en offset lärd ur stationens egen historik (`publish/grind-a.ts`). En vägpunkt mellan stationerna har ingen historik och därmed ingen lärd offset. Det är det fall höjden (#96) och kallplatslagret (#91) ska lösa, och där de hittills inte levererat: höjdprovet 12/9 på 1 962 punkter gav rå 1,65 °C, rå+höjd 1,65, offset 1,06 (`scripts/hojd-prov.ts`, huvudet bär designfyndet: offseten absorberar redan höjden, så höjd ovanpå offset är dubbelräkning). **Grind A:s 0,71 °C är alltså taket vid stationerna, inte vad vägen får.** **Villkor före (4):** hur offseten når en vägpunkt (rå avståndsviktning, offset interpolerad ur grannparen, eller terrängkorrigerad) ska stå i TROSKLAR-SKUGGAN innan skuggkörningen byggs i oktober, annars loggar vintern rå-modellen. Grind C3 (backtest och skuggdrift åt samma håll) är vakten som fäller om vägen blir sämre än stationerna. Höjden läggs in bara om vinterdata ger den en tröskelrad (#96), kallplatslagret bara om det förklarar residualer (#91 Verify).
- [ ] 📈 **#88 TRENDEN — vi mäter var minut men använder bara sista värdet** (systemanalys 10/9;
  ✅ **STEG 2 BYGGT OCH KÖRT 13/9 — TRENDARKIVET** (Bengts order, issue #119, DECISIONS #169,
  PR #230). `sql/017_trend_kandidater.sql` + `scripts/trendarkivet.ts` med knapp och torrkörning.
  **3 851 kandidater över 98 stationer** 8–13/9, ur 117 962 arkivrader. Noll följdes av yta ≤ 0 °C
  inom 90 min — september, rätt utfall. Omkörning: **0 nya rader**, idempotensen bevisad med mätning.
  🏗️ **EN TABELL, INTE EN SKUGGKOLUMN — och skälet är arkitektur, inte bekvämlighet.** Skuggmotorn
  läser SNAPSHOTEN, en ögonblicksbild utan historik: lutningen finns inte där och kan inte räknas
  där. Cron är stängt sedan #85. Men ingångarna finns i arkivet — och bara i sju dygn, för
  gallringen (#83) tunnar äldre rader till en per halvtimme och då faller 15-minutersfönstret bort
  HELT. Knappen räknar inom sju dygn och skriver durabelt; check 5 larmar redan vid frost.
  🔑 **EN KÄLLA FÖR TRÖSKLARNA:** svepet och vakterna flyttade till `publish/trenden.ts`, delad av
  T-A och arkivet. Två kopior hade låtit T-A döma med en uppsättning trösklar och arkivet spara
  med en annan — domen och underlaget hade slutat handla om samma sak.
  🔒 **SUPERSETINVARIANTEN låst med prov över hela svepet (1 872 kombinationer):** fyrar någon
  kombination på en rad så ÄR raden kandidat. Faller den sparar arkivet bort precis det T-B behöver.
  ✅ **SJUDYGNSRISKEN BORTA 13/9 — BERÄKNINGEN LIGGER I `ingest-live`** (Bengts order, DECISIONS
  #170, PR #232). Noll Actions-minuter och inget nytt cron-jobb: räkningen rider på ett anrop som
  redan sker var minut. Logiken bor i `sql/018`, den deployade funktionen bär EN rad i try/catch —
  ingest-live är livemotorns ingest och trenden får aldrig kosta driften något.
  🐛 **DRIFTVAKTEN FÄLLDE PÅ FÖRSTA KÖRNINGEN: 862 av 4 713 rader låg isär, och orsaken var
  ARITMETIK.** TypeScript räknar 4,8 − 4,4 = 0,39999999999999947 i binär flyttal; Postgres räknar
  exakt i numeric och får 0,4. Tröskeln ÄR 0,4, så den ena valde raden och den andra inte — utan
  en enda skillnad i logik. SQL hade rätt. Lutningen avrundas nu till tusendels grad; omkörning gav
  **4 713 mot 4 713, noll i någon riktning**. Läxan förd till CLAUDE.md.
  🔍 **KONTRAKTSGRINDEN SA GRÖNT HELA TIDEN** — den vaktar att kopiorna bär samma TAL, inte att de
  fattar samma BESLUT. Det krävdes en jämförelse som kör båda sidorna över samma fönster.
  ⏳ **BEVISET ÄR OFULLSTÄNDIGT och det sägs rakt ut:** ingest-live kör (sync_state fem sekunder
  gammal) men skrev noll rader, för **0 av 750 stationer** har just nu en yta mellan 1 och 6 °C.
  Signaturen att leta efter i morgon: en rad med `utfall_rader IS NULL` och `observed_at` inom 90
  minuter — den kan bara ha skrivits av driften.
  ✅ **GRIND T-A BYGGD OCH KÖRD 12/9 — instrumentet är laddat före frosten** (`scripts/grind-t-a.ts`
  + knapp, PR #158, körning 34675279484, DECISIONS #113). Byggd FÖRE skuggkolumnen med flit: T-A
  läser ARKIVET, de tre kolumnerna i §7 steg 2 matar T-B. Avvikelse från §7:s ordning, inte från
  dess innehåll, tillåten före första skuggkörningen enligt §8.
  ⊘ **Utfall: OAVGJORT, som det ska vara.** 2 912 station-nätter, 17 frostnätter på 7 stationer mot
  domspärrens 30 och 20. Alla 144 kombinationer räknade; bästa separation 17 %, men **ingen klarar
  båda-halvor-kravet**. Domspärren skrivs ut FÖRE tabellen så ingen läser den som en dom.
  ☁️ **FYSIKKONTROLLEN ÄR HEL SEDAN 12/9** (PR #163, körning 34677154925, DECISIONS #115). Molnet
  hämtas VID KÖRNING ur SMHI parameter 16 — ingen arkivering, ingen tabell, noll lagring. 16 av 17
  frostnätter fick en molnobservation inom 50 km från 6 stationer.
  ✅ **FÖRSTA SIGNALEN STÖDJER UTSTRÅLNINGSHYPOTESEN: fyrningsandel klara nätter 29 % (2 av 7) mot
  mulna 0 % (0 av 5).** Triggern fyrar på klara nätter och inte på mulna, precis som
  utstrålningskylning förutsäger. **MEN TALET ÄR TVÅ** — riktningen är rätt, styrkan okänd.
  🕳️ **Och en olöst observation:** timfördelningen är fortfarande platt (5 av 17 kl 03–07; resten
  22, 23, 10, 11, 12, 14). Septembers "frostnätter" är till största delen INTE utstrålningsnätter.
  Att triggern ändå skiljer klart från mulet är förenligt med att de få utstrålningsnätter som finns
  är just de klara — men det stärker att underlaget måste vara höstens frost.
  🔍 **Tre fynd som hör hemma i TROSKLAR-TRENDEN, inte i koden:** (1) **fysikkontrollens andra halva
  går inte att köra** — "vanligast klara nätter" kräver molnmängd, som inte finns i arkivet. T-A är
  alltså BEROENDE AV kort #95, och det står inte i dokumentet. (2) **Gallringen äter svepet:** efter
  sju dygn faller 15-minutersfönstret bort helt och 30-minuters på trendens egen vakt. (3) Septembers
  frostnätter är INTE utstrålningsnätter — bara 5 av 17 hade kallaste stunden kl 03–07.
  det billigaste stora klivet). Sedan 9/9 har arkivet minutupplösning på 848 stationer. Lutningen
  dT/dt på ytan mot noll, med daggpunkten strax under, är svartisens fysiska förvarning — INGEN
  prognos, en observerad trend, som får sägas som "risk framöver" (kommunikationsregeln). Åt andra
  hållet: stigande yta = skälet att tystna tidigare på morgonen. 🔒 NYCKEL: tröskeldokument först
  (husregeln: lutning över hur många minuter, vilket daggpunktsgap), sedan SKUGGKOLUMN i skuggmotorn,
  aldrig röst före dom. Efter 14/9 (kort #81:s ordning). Verify: skuggkolumnen bokförs mot samma
  facit som #16/#38b; andelen träffar där punktmotorn var tyst eller > 30 min senare (B3-måttet).
  ✅ **TRÖSKELDOKUMENTET FASTSTÄLLT 10/9, INCHECKAT 11/9** (DECISIONS #92). `docs/TROSKLAR-TRENDEN.md`,
  225 rader: sju OSATTA parametrar med svep (fönster 15/30/60 min, lutning 0,4–1,2 °C, daggpunktsgap,
  startband, stigande tröskel, nära-miss-band, utfallsfönster), ärvd givarvakt (#46:s daggpunkt +
  #75:s WX_SANE + trendens egen: ≥ 3 mätningar i fönstret, hopp > 3 °C diskvalificerar), tre grindar
  T-A/T-B/T-C, och en ASYMMETRISK falsklarmsdefinition — "risk som inte föll ut" (ytan inom 0,5 °C
  på 90 min) räknas INTE som falsklarm, eftersom trenden säger *risk*, inte *är*. Golv: B3 ≥ 20 %,
  nettonytt ≥ 5 %, falsklarm ≤ 25 %; domen är korsningskurvan, golven hindrar bara röst på brus.
  🕳️ **DOKUMENTET LÅG OINCHECKAT I ETT DYGN** (skrivet 10/9 23:04, incheckat 11/9 på Bengts order).
  Det fanns varken på origin, i gren eller PR — enda kopian låg i ett arbetsträd. Repot är enda
  synken mellan sessioner; ett dygns arbete hängde på en disk. Läxa förd till CLAUDE.md.
  ✅ ~~**DANGLANDE KÄLLA:** `docs/TROSKLAR-TYSTNADSFEL.md` finns inte i repot~~ **STÄNGT 11/9**
  (DECISIONS #93): dokumentet låg i Bengts Drive, skrivet 10/9 21:09, två timmar FÖRE trenden — och
  gick samma väg som trenden, alltså aldrig in i repot. Nu fastställt och incheckat som **kort #98**.
  ⚠️ **MEN DET AVSLÖJADE ETT SAKFEL I §6 HÄR:** trenddokumentet säger att T-B har "samma beroende som
  TROSKLAR-TYSTNADSFEL", alltså kort #94 (försäkringsbolagen). Tystnadsfelets §8 skrevs om samma kväll
  21:09 och tog uttryckligen BORT det beroendet — måttet döms mot facitstacken vi redan skriver varje
  dygn. Trenden skrevs 23:04 och citerade alltså en version som redan var ersatt. §6 är rättad.
  ✅ ~~ÖPPEN FRÅGA: kan T-B sluta vänta på #94?~~ **AVGJORT 11/9 av Bengt (DECISIONS #94): JA.**
  "Vi kommer inte att vänta på några försäkringsbolag i T-B. Det är klarlagt att vi inte kan få det
  samarbetet." T-B döms mot facitstacken vi redan skriver: kamerafacit (#20) som bärande källa —
  738 av 744 kameror står vid en VViS-station (#55), alltså per konstruktion inom räckvidd, precis
  T-B:s räckviddsvillkor — plus road_condition_history och situation_archive (#33).
  ⚡ **TIDPLANEN FLYTTAS: T-B skuggar från FÖRSTA FROSTEN, inte från mars.** Mars-domen är inte
  längre T-B:s förutsättning utan dess fördjupning. §6 och §7 i dokumentet omskrivna.
  ✅ ~~KVAR FÖRE BYGGE: Axels bock här~~ **KONTRASIGNERAT 11/9 av Axel via Bengt** (DECISIONS #95,
  samma form som #61/#68). Tröskeldokumentet är därmed fullt godkänt av båda. Kvar före bygge är
  bara radardomen 14/9 (kort #81:s ordning) — ingen mänsklig signatur saknas längre.
  ⚠️ Bocken ändrar INTE §8:s regim: den är knuten till första skuggkörningen, inte till signaturen.
  Fram till dess får svepet i §2 och kraven i §4 justeras av vem som helst av oss med en rad i
  DECISIONS; därefter krävs båda signaturer och en motivering som inte lutar sig mot utfallet.
  📏 **Tryckt 24/9 (DECISIONS #331):** T-A steg 0, 7 dygn (körning 35949108311): 3 765 station-nätter, 47 frostnätter (yta ≤ 1 °C) på 26 stationer, 3 718 icke-frostnätter; separationen går inte att skilja från noll; kallaste stunden 03–07 i 70 % av frostnätterna; molnet hämtat för 34 av 47 punkter. frostvakten (50 stationer under noll) har inte larmat: senaste tio nätterna som mest 4 stationer under noll (17/9), kallast −5,6 °C (22/9). Steg 0 förfaller inom sju dygn efter frostvaktens larm; bildfacitets definition (#209/#231) skrivs in i DECISIONS då.
  🥶 **Frosttriggern i drift 24/9 (DECISIONS #338):** vakthunden trycker T-A steg 0 (och de fyra andra frostmätningarna) själv när frostlarmet skapas; utlösarprovet 05:38Z gav en grön körning av vindsikt-steg0. Sju-dygnsfönstret hänger inte längre på att någon läser issuen.
- [ ] 🤐 **#98 TYSTNADSFELET — mät tystnadens fel, inte larmens träff** (B3-syskon till #88; skrivet
  10/9 21:09, hittat i Bengts Drive 11/9, FASTSTÄLLT 11/9 på Bengts order, DECISIONS #93).
  `docs/TROSKLAR-TYSTNADSFEL.md`. Avgör Bengts egen tvist från 10/9 med data i stället för princip:
  en missad svartisvarning kan döda, ett falsklarm irriterar — men varje larm sänker värdet av nästa.
  **MÅTTET:** varje bekräftat halttillfälle där systemet TEG klassas som *oursäktligt* (signal fanns:
  daggpunktsgapet slöt sig, trenden pekade mot noll, eller en station inom räckvidd visade risk) eller
  *ursäktligt* (ingen signal: snöby bara radarn ser #43, saltbil, kommunal gata utan givare #93). Bara
  det oursäktliga går att laga med en tröskel; det ursäktliga pekar på nya källor. **PRISET STÅR
  BREDVID:** nya falsklarm per kandidattröskel. Två kurvor mot tröskeln, och där marginalen korsar
  sitter den. **RÄCKVIDDSVILLKORET (§6) är det avgörande:** en tyst miss räknas bara när halkan låg
  inom räckvidd men utanför rösten — annars drunknar tröskelsignalen i täckningshål (#93), som är ett
  annat problem. ✅ ~~NYCKEL: Axels bock här~~ **KONTRASIGNERAT 11/9 av Axel via Bengt** (DECISIONS
  #95, samma form som #61/#68/#92) — dokumentet är fullt godkänt av båda. Kvar: skuggkolumn efter
  radardomen 14/9; aldrig röst före grind-A/B/C-dom i mars.
  ⚡ **KAN BÖRJA RÄKNAS I HÖST, INTE I MARS** — §8 skrevs om 10/9 kväll när försäkringsbolagens
  skadedata visade sig otillgänglig: måttet döms i stället mot facitstacken vi redan skriver varje
  dygn (road_condition_history, kamerafacit #20, situation_archive #33). Inget samarbete utanför
  huset krävs. ✅ **BEKRÄFTAT SOM HUSREGEL 11/9 (DECISIONS #94, Bengt):** samarbetet med
  försäkringsbolagen är klarlagt otillgängligt. Samma facitstack gäller nu även trendens T-B (#88),
  som därmed skuggar från första frosten i stället för att vänta på mars.
  Verify: korsningskurvan ritad över hela svepet, med räckviddsvillkoret tillämpat och binomialbrus
  redovisat; utfallsmeningen i §7 ifylld med riktiga N, M, X och Y.
  🔍 **BEDÖMNING 24/9 (Bengt: *"vi gör 98 först"*):** klassningen i §3 är rätt tänkt men inte mätbar — signalerna saknar tal, "ursäktlig" definieras av data vi inte har, och en tyst miss kan bero på fyra olika trösklar (fukt, tid, avstånd, temperatur) som ger fyra olika priskurvor. Förslag i `docs/TYSTNADSFEL-KLASSNING-2026-09-24.md`: fyra mätbara signaler med tal ur redan fastställda dokument, tre klasser (oursäktlig/ursäktlig/okänd), orsakskolumn per tröskel, räckvidd 7 km, fönster som TROSKLAR-SKUGGAN §2, underlagsvakt 20 händelser i 3 perioder, priset via uppspelningen. Händelselistan finns sedan 23/9 i `publish/grind-s-b.ts`. ~~Bygget: ett skript, ~tre dagar, ingen ny data.~~ **Rättelse: instrumentet fanns sedan 14/9 (PR #236).**
  🔨 **BYGGT 24/9 (Bengt: *"gör förslaget"*, DECISIONS #330):** `scripts/tystnadsfelet.ts` bär nu talen, tre klasser (oursäktlig/ursäktlig med radar som bevis/okänd), orsak per tröskel, räckvidd 7 km, tyst mot flottans kadens, fukt i riskvillkoret, den delade händelselistan (`publish/skuggfacit.ts`, samma som grind S-B), två lägen och priset som tillkomna tillfällen. Dokumentet §3–§6b ändrat. ✅ Första skarpa körningen: körning 35948719580, 24/9 02:47Z, underlagsläge, 14 dygn: 2 bekräftade tillfällen (situation-halka), båda inom 7 km (median 4,2 km), skuggloggen 1 360 larm med position av 1 847, båda tysta, båda OKÄNDA i alla 16 celler (ingen signal vid stationen, ingen radar), trenden okänd för båda (äldre än sju dygn), 2/20 tillfällen och 2/3 perioder — inga andelar skrivna. Kvar (Verify): korsningskurvan på vinterdata vid ≥ 20 tillfällen i 3 perioder — läses vid utsatt tid.
- [ ] 🔀 **#89 ÖVERGÅNGARNA mellan faror — regn→frost, torka→första regnet** (systemanalys 10/9;
  syskon till #45 som redan har snö-på-snö/regn-på-snö). (a) Regn som slutar och yta som faller under
  noll inom 2 h = efterhalka: regnsumma + yttemp + trend (#88) finns alla, inget sitter ihop. (b) Första
  regnet efter ≥ 5 torrdygn: oljefilm, de första 20 minuterna hala oavsett fart — en torrdygnsräknare
  per station ur regnarkivet, en kolumn. (c) Dimma×frysrisk = rimfrost (#46), sidvind×halka och
  dimma×halka har ingen förhandlad interaktion alls (bara halka×vattenplaning har det, #68).
  🔓 **UPPLÅST 13/9 (DECISIONS #161, Bengts order):** regelskissen pekade på `rate_max`, som är
  SPÄRRAT av värdevakten sedan 727,54 mm/h hittades i det (#134). Bytt till **`rate_mean_mmh`** —
  en tvingad rättelse, inte en justering mot ett utfall. Svepet 0,1 · 0,5 · 2 är oförändrat och
  blir dessutom rätt matchat: de talen kommer ur bekräftelsekurvans band, som mättes på just
  `rate_mean`. Skalan utskriven i §2 (råradar; i stationens skala ≈ 0,15 · 0,8 · 3,1).
  **Skuggkolumnen är därmed inte längre blockerad** — den väntade på radardomen, och den föll 13/9.
  🔬 **OMPRÖVNING GÅR VIA MÄTNING, inte via städning:** `cell-matning-v3.ts` läser redan BÅDA
  fälten på samma rad, så en bekräftelsekurva för `rate_max` är en KÖRNING och inte ett bygge.
  Visar den att max bekräftas väsentligt bättre är det skäl att rensa fältet och byta tillbaka.
  Att rensa `rate_max` FÖR ATT låsa upp det här kortet vore däremot att låta schemat välja fält.
  🔒 NYCKEL: #45:s dom + tröskelrader (§5). Verify: varje övergång som egen skuggkolumn med
  facit ur situation_archive; (b) kan mätas redan i höstregnen.
  ➕ **NY PARAMETER `N_varning` 12/9 kväll** (§2.3 i tröskeldokumentet, Bengts order, DECISIONS #123).
  Kom hit från #95 (d): när den breda SMHI-regeln föll — *ett län är ingen punkt och ingen sträcka* —
  var dess berättigade kärna kvar. SMHI vet **tiden före händelsen** (varningarna publiceras i
  förväg), och det går att använda utan att uppfinna väta ur en polygon: **en aktiv vintervarning
  förlänger N**, alltså hur länge efter stationens EGET uppmätta regn frysrisken lever vidare.
  Utlösaren är oförändrad. Svep **av · 2 · 4 · 6 h** mot N:s 1 · 2 · 3 · 4.
  ⚠️ **Ingen gratis ändring, och dokumentet säger det rakt ut: N_varning fyrar larm som annars inte
  fyrat.** Därför gatas den som en egen proxy — **B3 körs med och utan förlängningen** — och går den
  inte att döma sätts den till AV, aldrig till ett gissat värde. Dömbar först på varningar skrivna
  efter `sql/015` (12/9), för dessförinnan saknade arkivet giltighetsfönstret.
  📎 **HISTORIK:** §2.3 lades till 12/9 efter fastställandet. Axel är underrättad och har läst den.
  **Den blockerar ingenting** (DECISIONS #132): mätningen är Bengts område, motorn och rösten Axels.
  📄 **FÖRSTUDIE SKRIVEN 11/9** (Bengts "gör en ordentlig genomlysning"): `docs/OVERGANGAR-ANALYS.md`,
  samma form som vattenplaningens. Ingenting beslutat. Tre fynd som ändrar kortet:
  🕳️ **(a) ÄR ETT HÅL, INTE ETT SAMBAND.** `icing_point` kräver `moisture === true` (engine.ts:191), och
  `moisture` = `rain OR snow OR precipitation` ur 10-minutersaggregatet (weather.ts:54, snapshot-core:42)
  — alltså "regnar det JUST NU". När regnet slutar blir fukten falsk inom tio minuter och frysrisken
  kan inte fyra igen förrän det regnar på nytt, oavsett hur blöt vägen är och hur kall ytan blir.
  Efterhalkan inträffar nästan alltid EFTER att nederbörden upphört — exakt i det fönstret tiger regeln.
  Ingen blöt-väg-givare finns i skala (TRV har ytstatus på 30–50 av ~750 stationer, vi hämtar dem inte).
  Rättelsen är en utvidgning av fuktvillkoret med regnhistorik: `fukt OR regn inom N h`. Strikt
  superset, kan bara lägga till larm ⇒ döms med B3-paret (räddade missar mot tillkomna falsklarm).
  🔀 **(a), (b), (c) är tre olika sorters arbete** och ska inte dela nyckel: (a) utvidgar en regel
  som finns (B3-mått), (b) är en NY fara (V-B-mått, från noll), (c) är prioritetsregler som hör hemma
  i #46:s (dimma = konfidens för daggpunktsregeln) och #90:s (sidvind/dimma × halka, #68 som mall)
  tröskeldokument. Förslag: #89 lämnar över (c) och behåller (a) + (b).
  🔓 **NYCKELN #45:s dom ÄR FEL LÅS för (a) och (b).** De behöver regnhistorik + yttemp, som finns per
  station sedan 2/9 — inte radarn, inte typklassningen. Bara regn-på-snö/snö-på-snö beror på #45, och
  de är redan #45:s. Förslag: dela nyckeln — (a)+(b) låses upp av eget tröskeldokument.
  ❓ **FRÅGA TILL AXEL FÖRE (b) BYGGS (förstudiens §5.6):** är oljefilm inom Halkvakts löfte? Appen
  lovar is och halka; oljefilm är halka i ordets vidare mening, inte i produktens, och är frekvent
  med tunt facit (olyckor utan orsak, ~210/dygn nationellt, 20-minutersfönster). Ett nej sparar en
  höst. Ett ja eller "mät och se" öppnar fönstret NU — höstregn efter torka slutar när vintern kommer.
  📋 **ORDNING (förstudiens §9):** (0) mät hålet nu, läsande, en minut — regnstopp per station sedan 9/9,
  hur fort fukten går falsk, vad ytan gör de följande timmarna, plus underlagsstorlek för (a) och (b);
  (1) TROSKLAR-OVERGANGAR med (a) som huvudsak och svep i stället för värden; (2) regnhistorik per
  station i Supabase efter 14/9; (3) (b) i skugga om Axel säger ja; (4) (a) i skugga, döms vid första
  frosten; (5) "regn inom N h" som fjärde signal i TYSTNADSFEL §3; (6) (c) överlämnas. Steg 0–1 är
  inte kod och kan göras i dag. Verify för steg 0: tre tal ur arkivet — hålets storlek, (a):s och
  (b):s underlag.
  🔁 **ANDRA LÄSNINGEN 11/9** (Bengts "har vi förbisett något i pipen, t.ex. 2.8?"): JA, två saker —
  men inte 2.8. Förstudiens §3, §4.2, §4.6 och §10 reviderade. (1) **`radar_precip` skriver redan
  regnhistorik PER SEGMENT** (sql/009, timvis sedan 2/9) — förbisett; gör (a) segmentnivå från dag
  ett, och datat är inte låst bakom 14/9, bara ny radarkod är det. (2) **Operatörens "Våt"** i
  väglaget är ingesterad men 100 % oanvänd (engine.ts:240 "Normalt/Våt make no sound") — Trafikverkets
  egen blöt-klassning per sträcka, var 15:e min; värdet hänger på hur länge den står kvar efter
  regnet, vilket steg 0 ska mäta. (3) **#46 och (a) partitionerar efterhalkan**, inte dubbelräknar:
  fuktig efterhalka (yta ≤ daggpunkt, kondensation) är #46:s; torr efterhalka (kallfront, daggpunkten
  faller, regnvattnet fryser) är (a):s och den enda regnhistoriken ser. (4) **§2.8 ger inget i dag:**
  smhi-prov hämtar bara lufttemperatur och lagrar inget; molnmängden är en FRYS-signal som skärper
  trenden, inte en blöt-signal som fyller hålet. Regelskissen är nu en union av proxyer, gatad per
  proxy med B3-paret — en union ingen mäter ensam är en falsklarmsmaskin. Bifynd: `types.ts:33`
  lovar "wet surface" i kommentaren; koden levererar nederbörd nu. Rättas med (a), inte förr.
  🧭 **TREDJE LÄSNINGEN 11/9** (Bengts "var kommer tillståndsövergångarna in — torr→blöt, torr→hal,
  snö→regn, regn→frys?"): de kom inte in alls, och det var förstudiens största brist. Ny §1b: din
  matris från #45 är RAMEN — vägytan är ett tillstånd, händelserna är övergångar, och §2.2:s tre
  punkter, #45:s två, #46 och #88 är kanter i samma graf. Grafen är ritad med ägare per kant.
  **KÄRNFYNDET (verifierat engine.ts:50–54): motorn minns RESAN men inte VÄGEN** — prevFix,
  odometer, kurs, tystnadsklocka, fired-karta; noll minne om vad ytan var för en timme sedan.
  Fukthålet är ett SYMPTOM av det, inte ett fel i ett villkor. Regnhistorik, daggpunkt, radar och
  operatörens Våt är fyra sätt att skatta ett tillstånd motorn inte bär. **KONSEKVENS för planen:**
  steg 2 är inte "regnhistorik" utan **tillståndsskattaren i skuggloggen** — en kolumn per segment
  ur operatörens klass + regn/snö-historik + yta + daggpunkt, med EGET facit (skattat blöt mot
  operatörens Våt, skattat is mot omklassning) innan någon övergångsregel läser den. INTE en
  tillståndsmaskin i motorn — det vore "våning två före grunden"; motorn rörs när en övergång bevisat
  sig, och då som en snapshotkolumn märkt MODELLERAT. Skattaren byggs för blöt och torr först, snö
  och is när #45 låses upp. **TVÅ CELLER SAKNAR ÄGARE:** töet (is→slask när temperaturen stiger;
  rösten tystnar i dag vid +1 medan vatten står på is) — kandidat till eget kort — och saltbilen
  (ingen öppen källa, känt). Facitmatchningen ärver #45:s baselineprincip: packad snö i norr är
  inte en övergång.
  🔬 **FJÄRDE LÄSNINGEN 11/9** (Bengts "täcks vattenplaning in? är rimfrost ett tillstånd? gäller
  samma för sidvind × halka?"): ja, ja, nej — och nejet är poängen. Vattenplaning ÄR ett tillstånd
  (vattenfilm, #42) och saknades i grafen; rättat. Rimfrost ÄR ett tillstånd (is), dimma och frysrisk
  är dess ORSAKER — frysrisk och halka är inte tillstånd utan NAMN PÅ LARM om tillstånd. Men sidvind
  och dimma-som-sikt ändrar inte ytan; de ändrar faran för föraren givet en yta. Det är **LAGER 2:
  riskmodifierare** (fart, sidvind, sikt, däck #92, mörker) — kräver INGET minne, ingen skattare,
  byggs som #68 (förvillkor/prioritet/försprång, en vektor). Lager 1 (ytan) kräver skattaren. De ska
  inte dela kort, nyckel eller mått. §6 hade blandat ihop dem: dimma × frysrisk är en lager 1-orsak
  (→ #46, konfidens för kondensationsvillkoret), sidvind/dimma × halka är lager 2 (→ #90, #68 som
  mall). Dimma sitter i båda lagren utan motsägelse. Vattenplaningen bevisar mönstret redan:
  vattenfilm × fart × däck. **Steg 0 utökat till sex frågor** (0a–0f: eftersläpning, torkningskurva,
  underlag a, underlag b, Våt-eftersläpning, radartäckning), varje med egen underlagsvakt.
  Rekommendationens "tre tal" rättat till sex svar. Förstudien sparad i repot, i Drive och som fil
  i chatten.
  ✅ **STEG 0 KÖRT 11/9** (Bengts "kör steg 0"): `scripts/overgangar-steg0.ts` + knapp
  `overgangar-steg0`, helt läsande, PR #124, körning 34579255737, 14 dygns fönster. Driftvakten
  grön: SQL-uttrycket och motorns egen `fukt()` ense om alla 7 146 omslag — mätningen ÄR motorns.
  **0a HÅLET ÄR BEVISAT OCH STÖRRE ÄN GISSNINGEN.** (Talen nedan är 14-dygnskörningens; de
  RÄTTADE talen ur den ogallrade veckan står i "GALLRINGSFÄLLAN" längst ned.) På 124 av 189
  användbara regnstopp (66 %) visade
  regnmätaren regn i de senaste 30 minuterna i samma stund som motorns fukt slog om till torrt.
  Mätaren stod kvar över noll median 35 min efter omslaget. Förstudien gissade "~10 min"; golvet är
  ~35 min, och p75/p90 (1,8–1,9 h) ligger mot 2-timmarstaket i frågan ⇒ censurerade, läs dem som
  "minst så länge". **0b RH-GUARDEN ÄR DÖD.** Luftfuktigheten STIGER efter regnet (median 90 % vid
  +1 h → 95 % vid +4 h; ≥ 80 % i 74–84 % av fallen). RH_min ≥ 80 filtrerar alltså bort nästan
  ingenting — svepet i §4.3 kan strykas till "ingen guard" tills något talar emot. **0c
  POPULATIONEN FINNS, FRYSNINGEN INTE ÄN:** 189 användbara omslag ≈ 14/dygn i riket, men bara 3–4
  följdes av yta ≤ 1 °C — och N = 1 h → 4 h lägger till EXAKT ETT fall. September, väntat; domen
  kräver frost. **0d OLJEFILMEN ÄR INTE NÅBAR I HÖST:** 55 äkta torrperioder ≥ 5 dygn, 6 olyckor i
  20-minutersfönstren; V-B kräver 15 facit-olyckor och 200 fyrningar. **0e "VÅT" ÄR OAVGJORT OCH
  FÅR INTE RÄKNAS:** 33 Våt-rader, NOLL med efterföljande klassning, noll väglagsrader i fönstret —
  arkivet står stilla sedan 25/8. Proxyn stryks ur unionen i §4.2 tills operatören klassar om igen.
  **0f RADARN:** kadensen är 24 prov/dygn × 5 min = 8,3 % av tiden samplad; 91,7 % osamplat.
  ⚠ Första körningens 0f-rad läste händelsefiltrering som kadens ("5,2 %") — rättat i skriptet
  samma varv, siffrorna oförändrade. Två kända luckor i instrumentet, att täppa före grinden:
  0a:s svans är censurerad vid 2 h och kan innehålla ÅTERKOMMANDE regn, och 0d räknar olyckor utan
  förväntat antal (ingen nollhypotes ⇒ 6 är ett tal, inte ett bevis).
  ⏳ **GALLRINGSFÄLLAN, upptäckt 11/9 vid omkörning med `dagar=7` (körning 34580876588).**
  Gallringen (#83, sql/014) tunnar allt äldre än sju dygn till EN rad per halvtimme. Gap-vakten
  kastar allt med mer än 20 min mellan raderna ⇒ hela den gallrade halvan blir GAP. Bevis:
  7 dygn gav 1 971 omslag varav **157 användbara**; 14 dygn gav 7 146 varav 189 — alltså kom
  83 % av de användbara ur den ogallrade veckan, och den gallrade halvan bidrog med 32 av 5 175.
  **RÄTTADE TAL** (ogallrad vecka, full upplösning): mätarregn vid omslaget **120 av 157 = 76 %**,
  inte 66 %. Population **22 omslag/dygn**, inte 14. Medianen 35 min står oförändrad. Hålet är
  alltså STÖRRE än jag först skrev: tre av fyra regnstopp, inte två av tre.
  📌 **REGEL SOM FÖLJER:** steg 0 körs alltid med `dagar <= 7`, och en händelse måste läsas
  INOM sju dygn — annars har gallringen ätit upplösningen och 0a/0b/0c blir OAVGJORT.
  🔁 **FEMTE LÄSNINGEN 11/9 — AXELS GRANSKNING** (DECISIONS #100)**.** Han verifierade fukthålet oberoende och vände på
  mätriktningen: från FROSTEN i stället för från regnstoppen. Han har rätt och min riktning var fel
  vald — falsklarmsrisken skalar med FYRNINGAR, inte med tillfällen — och hans riktning tål dessutom
  gallringen bättre. 0c omskriven (PR #133/#134), körning 34590257682. Hans tal: 312 frostmätningar,
  14 larmar i dag, 298 tysta, 71 med regn inom 4 h ⇒ "sex gånger talförare".
  🔢 **EPISODRÄKNINGEN SOM SAKNADES, och den ändrar tolkningen.** Motorn talar inte per arkivrad
  (45 s mellan larm, ingen repris inom 10 min/5 km, snapshot var 10:e min). Räknat i BÅDA enheterna,
  efter givarvakten: **rader 123 → 2 larmar i dag, 25 tysta med regn ≤ 4 h ⇒ 13,5 ×. EPISODER 15 → 2
  larmar, 2 med regn ≤ 4 h ⇒ 2,0 ×.** 8,2 rader per episod, 6 stationer. Sexan är alltså ett
  RADtal; röstkostnaden är en fördubbling av 2 fall till 4, över fjorton dygn. Korskontroll: den
  omslagsbaserade riktningen fann 4 — samma handfull väder räknat från andra hållet.
  🚨 **OCH ETT FYND SOM GÄLLER LÅNGT UTANFÖR DET HÄR KORTET: 61 % av arkivets frostrader är skrot.**
  Av 317 frostrader (yta ≤ 1 °C) föll 194 på givarvakten (#75) — ytan mer än 12 ° under luften,
  värst −49,9 °C. NOLL saknade lufttemperatur, så det är trasiga givare, inte okontrollerbar data.
  Varje mätning som läser yttemperatur måste bära vakten, annars är sex av tio frostfall falska.
  **Det gäller #88:s trend och #98:s tystnadsfel lika mycket, och står inte i deras tröskeldokument.**
  ✏️ **INFÖRT I FÖRSTUDIEN** (PR nedan): nytt §4.7 röstbudgeten (hålet Axel hittade — dokumentet sa
  ingenting om vad utvidgningen gör med tystnaden, och åberopade husregeln för (b) men inte för (a));
  §4.3 RH-guarden struken och N sätts av golvet, inte av svepet (kurvan har inget knä: 22→25 rader,
  1→2 episoder); §4.4 grinden får ord-per-resa som eget fällande kriterium; §3 givarvakten; §9 0c
  omskriven och (b) flyttad ur steg 0 till §5.6-frågan, som dokumentet alltid sagt men §9 motsade.
  ✅ **STEG 1 KLART 12/9 — `docs/TROSKLAR-OVERGANGAR.md` FASTSTÄLLT OCH KONTRASIGNERAT**
  (Bengt 12/9 med tillägget att **(b) oljefilmen stryks**, Axel 12/9 via Bengt; DECISIONS
  #109/#110/#111). Nyckeln är därmed öppen — kodstegen väntar bara på radardomen. Skrivet på MÄTNING, inte på
  resonemang: varje tal som inte är märkt RESONEMANG kommer ur steg 0. Fyra grindar — **Ö-A**
  (finns hålet? **redan passerad**: 76 %, median 35 min, 22 omslag/dygn), **Ö-B** (B3-paret per
  proxy, döms vid frost), **Ö-C** (giltighet: ≥ 30 nätter, ≥ 20 stationer, fysikkontrollen),
  **Ö-D** (läsfönstret — sju dygn, annars har gallringen ätit upplösningen).
  ✂️ Två parametrar redan strukna av mätning: RH-guarden (fuktigheten stiger efter regnet) och
  operatörens "Våt" (noll mätbara varaktigheter). N sätts av golvet, inte av svepet — kurvan har
  inget knä. Ord-per-resa är INTE fällande kriterium (#103); röst räknas i episoder, aldrig i rader.
  🔗 **TYSTNADSFEL §3 har fått sin fjärde signal** i samma varv: "det regnade inom N timmar vid
  stationen". Utan den klassas efterhalkans missar på de andra tre utan att orsaken syns.
  ✂️ **(b) OLJEFILMEN STRUKEN 12/9 av Bengt.** Kortet krymper till (a) plus överlämningen. Och
  **§5.6-frågan till Axel förfaller** — den behöver aldrig ställas, kortet bär inte längre en spärr
  som väntar på någon annan. Mätningen hade redan visat att grinden inte var nåbar i höst (55
  torrperioder, 6 olyckor mot kravets 15) och att instrumentet saknade nollhypotes. Tas frågan
  någonsin upp igen börjar den om från steg 0, inte från texten.
  ✅ **STEG 2 BYGGT OCH KÖRT 13/9** (Bengts "bygg steg 2 nu på det som finns" + "kör knappen",
  DECISIONS #167, PR #223/#225/#226). `publish/tillstand.ts` (ren skattare, blöt/torr/okänt per
  segment och timme) + `scripts/tillstand-steg2.ts` med knapp. **Svepen är §2:s ord för ord** —
  skattaren uppfinner ingen tröskel, och ett prov faller om de driver isär.
  🔓 **VARFÖR DET GICK ATT GÖRA TROTS ATT GRINDEN INTE KAN DÖMAS:** dokumentet lyder "eget facit
  först … INNAN någon övergångsregel läser den". Grinden spärrar ANVÄNDNINGEN, inte bygget — den
  spärrar alltså steg 3, inte steg 2.
  🚫 **INGEN SKRIVANDE KOLUMN.** Ingångarna är sparade och gallringen rör bara
  `weather_observations`, så skattningen räknas om i efterhand för vilket fönster som helst — också
  för frostnätterna, inom Ö-D:s sju dygn. En kolumn hade dessutom krävt ett nytt cron-jobb (#85).
  📊 **RADARN ÄR PRECIS MEN INTE KÄNSLIG — mätningens bärande fynd.** När radarn säger regn håller
  stationen med i **96,0 %** (2 338 av 2 435). När stationen säger regn håller radarn med i **39,9 %**
  (2 338 av 5 858). Radarn har en åsikt om bara **13,1 %** av segmenttimmarna; resten är OSAMPLAT,
  inte torrt. I unionen bidrar radarn med **97 timmar av 5 955**. N dominerar r: 1 → 4 h ger
  +11 procentenheter blöt, r 0,1 → 2 tar bort 4.
  ⚠️ **Och det testade radarn där den behövs MINST:** median 6,7 km till närmaste station. Segment
  långt från station är inte mätta — det är den naturliga nästa frågan, inte ett avfärdande av radarn.
  🐛 **TRE FEL I MITT EGET INSTRUMENT, funna av att knappen faktiskt trycktes** (alla rättade och
  omkörda): 2c läste en saknad radarrad som "torrt" — exakt det modulen förbjuder; 2d:s nämnare är
  arkivdietens urval och skriptet sa det inte; och nämnarna räknade det nominella fönstret (7 dygn)
  mot ett arkiv som sträcker sig 5,3, vilket gav radarn 8,7 % täckning i stället för 13,1 %. Det
  tredje var nära att bli en FALSK BEKRÄFTELSE mot steg 0:s 0f-tal 8,3 %.
  ⛔ **2e OPERATÖRSFACIT: ⊘ INGEN DOM, med mätt orsak.** `road_condition_history` står stilla sedan
  25/8, dess 33 blöta rader slutar **12 juni**, `radar_precip` börjar **2 september** — fönstren
  överlappar inte med en dag, och bara **12 av 818 segment** har någonsin bytt klass.
  📏 **2f MÄTT 13/9 — RADARNS BIDRAG VÄXER INTE MED AVSTÅNDET** (Bengts order, DECISIONS #168).
  Unikt bidrag per avståndsband vid r ≥ 0,5: **1,4 · 1,6 · 2,0 · 1,6 %** (0–5 · 5–10 · 10–20 ·
  20–50 km). Vid r ≥ 0,1: 10,4 · 10,1 · 10,4 · 9,4 %. **Ingen lutning.** Radarn är begränsad av
  sin egen sampling (13,1 % av segmenttimmarna), inte av geografin. Oenigheten växer visserligen
  (58 → 70 %) men i riktningen **bara stationen** — asymmetrin pekar åt fel håll för hypotesen.
  ⚠️ Bandet 20–50 km bär 25 segment och 149 jämförelser — tunt. Och fönstret är 5,3 dygn regnigt
  september: frontregn är storskaligt, konvektiva skurar lokala. Kör om 2f i annat väder.
  ➡️ **NÄSTA: steg 3**, som väntar på operatörens klasser OCH på frosten.
  (0d säger att den inte kan dömas i höst), "Våt" ute ur unionen, RH-guarden struken.
  🥶 **OCH EN KÖRNING NÄR FROSTEN KOMMER — LARMET BYGGT OCH BEVISAT 11/9** (Bengts order).
  0c är den enda frågan vars svar ändras (3–4 frysningar i dag, domen kräver ~30), och den måste
  läsas inom sju dygn efter frostnätterna (gallringsfällan ovan). Passiv påminnelse räcker inte
  när fönstret är en vecka, så påminnelsen larmar nu själv: **check 5 i vakthunden** (PR #128),
  timvis i Supabase, noll Actions-minuter. Larmar en enda gång när ≥ 50 stationer haft yta
  ≤ 0 °C senaste dygnet ⇒ issue med etiketten `frostlarm`, tilldelad Bengt, som säger "tryck
  `overgangar-steg0` med dagar=7 inom sju dygn" och hänvisar till #88:s T-A i samma varv.
  Statusraden skrivs varje timme så talet går att följa: `frost: N stationer (larm vid 50)`.
  Prov: `frostprov` i dbknapp-knappen, egen etikett så det riktiga engångslarmet aldrig förbrukas.
  🐛 **PROVET HITTADE ETT FEL I LARMET, vilket är vad prov är till för.** Första körningen (issue
  #129) skrev "4 stationer … kallast −49,9 °C" — ingen vägyta, en trasig givare av Storvik-sorten
  (#75). Frågan saknade givarvakten. Rättat i PR #130 med ett krav STRÄNGARE än snapshotens:
  lufttemperaturen måste finnas, så att rimligheten alls går att pröva. Bevis efter deployen
  (f964dd6): `frost: 1 stationer` mot provets 4 — tre av fyra var givare vi inte kan lita på.
  Passiv påminnelse finns kvar som issue #127 (`efter-frosten`) och som minnesfil.
  🔒 **Läget 24/9 (DECISIONS #331, Bengts "gör 3"):** S3 är Axels bygge bakom S1-grinden (DECISIONS #196), som kräver blöta frostnätter. S1 bär 35 rader med innehåll (senast 22/9 06:30Z); trendarkivet 19 469 kandidater, 1 följd av frost. Förberett: uppspelningen och S1-loggen finns; S2 skattarens nivå väntar på samma grind. Inget byggt.
  ✅ **S2 BYGGT 24/9 (Bengt: *"gör steg 3"*, DECISIONS #341):** `skattaNiva()` i `publish/tillstand.ts` bredvid `skatta()` — väta, mängd och radar som svepsteg, frys mot K1 med zonen K2, källor och en läsbar bevisrad; inget nytt tal, D1 i kod, okänt är null. Åtta tester, steg 2-självtestet. S3 väntar kvar bakom S1-grinden.
- [ ] 🌬️ **#90 VIND OCH SIKT — AXELS JA GIVET 12/9, TRÖSKELDOKUMENT SKRIVET** (systemanalys
  ✅ **`docs/TROSKLAR-VIND-SIKT.md`** (utkast 12/9, DECISIONS #112). Axels ja öppnade halva nyckeln;
  **fastställt 12/9 av Bengt** (DECISIONS #135) — svepet och kraven är låsta.
  ⚠️ **RÄTTAT 12/9 KVÄLL — TVÅ SAKFEL I DOKUMENTET** (DECISIONS #116). (1) §4 påstod att
  "exponeringen är mätt kontinuerligt vid varje station". Fel: **arkivdieten** (#4) sparar bara rader
  vid yta ≤ 5 °C, nederbörd eller Δyta ≥ 0,5 °C, så W-A:s nämnare är stationstimmar **som dieten
  sparade**. Samma klass av fel som 0f:s — att läsa en händelsefiltrerad tabell som en kadens, andra
  gången på två dygn. Täckningsgraden mäts nu i givarkollen och skrivs ut med varje utfall.
  (2) **"42,6 % täckning" är ett TIDSARTEFAKT, inte ett givarhål** — 751 stationer bär fälten; det är
  dygn utan rader som saknas.
  📏 **OMKÖRT OCH MÄTT 12/9** (DECISIONS #120) — och min härledda gissning var nästan dubbelt så hög
  som verkligheten: första arkivtimmen med byvind är **4/9 05:00 ⇒ 8,1 dygn** av fönstrets 14, och
  det faktiska underlaget är **27 557 stationstimmar av 145 819 möjliga = 18,9 %**. Minutkrisens
  lucka 5/9→9/9 tar ungefär halva tiden, dieten två tredjedelar av resten. (Jag skrev först "tre
  dygn", härlett ur #84:s `vind 0` — den nollan gällde luckan, inte fälten. **Tredje gången på två
  dygn som ett härlett tal faller på en mätning.**)
  ⇒ **W-A:s OAVGJORT går inte att laga med ett längre fönster, bara med mer tid. Grinden körs om
  efter FÖRSTA HÖSTSTORMEN**, som T-A körs om efter första frostnatten. Ingen gallringsdeadline här.
  Utfallet oförändrat: 36 stationstimmar i högsta bandet mot kravets 500; antydan 2,23 × står kvar.
  🔀 **DOKUMENTET DELAR KORTET I TVÅ ROLLER som döms var för sig** — kortet sa "punktfaror",
  överlämningen från #89 sa "riskmodifierare", och **båda hade rätt**: (A) EGEN FARA — byvind 25 m/s
  på en bro är farligt oavsett väglag; (B) MODIFIERARE — samma is, sämre grepp i sidled. Faller A men
  håller B är utfallet "vind är ingen egen fara men förvärrar halkan", vilket är ett giltigt svar.
  ⚠️ **PER FORDONSTYP GÅR INTE LÄNGRE** — kort #92 stängdes samma dag (#108), så motorn vet inte om
  den talar till en personbil eller en husvagn. En tröskel för husvagn pratar för mycket med
  personbilister; en för personbil missar B2B-gruppen som motiverade kortet. Svepet spänner hela
  intervallet och **grinden får avgöra** — räcker ingen enda tröskel är det ett mätt argument för att
  öppna #92 igen.
  🔬 **GIVARVAKTEN ÄR OMÄTT TERRITORIUM.** För yttemperaturen vet vi att 61 % faller på vakten
  (#106). För vind och sikt vet vi **ingenting** — ingen har mätt hur ofta värdena är orimliga.
  Därför är steg 0 inte valfritt.
  ✅ **STEG 0 KÖRT 12/9** (`scripts/vindsikt-steg0.ts` + knapp, PR #159, körning 34675456017,
  DECISIONS #113). W-A gav **OAVGJORT** för både vind och sikt — 36 respektive 83 stationstimmar i
  högsta bandet mot kravets 500. September är inte blåsigast på året; underlagsbesked, inte nej.
  🔬 **MEN GIVARKOLLEN GAV TVÅ KONKRETA SAKER TILL VAKTEN, vilket var hela poängen:**
  **(1) byvind max 85,5 m/s** — Sveriges rekord ligger kring 81 och då på fjällstation; 85,5 vid en
  vägstation är med all sannolikhet en trasig givare, och vakten behöver ett tak.
  **(2) sikt 20 000 m förekommer 45 650 gånger** av ~92 000 siktrader — det är ett SENTINELVÄRDE
  ("minst 20 km"), inte en mätning. Hälften av siktmaterialet är ett tak.
  **(3) täckningen är 42,5 % för byvind och 42,6 % för sikt** — mindre än hälften av arkivraderna
  bär fälten alls, vilket halverar W-A:s underlag och ska stå i varje dom.
  Noll rader med byvind < medelvind och noll negativa värden — den delen av vakten behövs inte.
  📈 **EN ANTYDAN SOM INTE FÅR ÖVERTOLKAS:** bandet 10–15 m/s har **2,23 × olycksfrekvensen** mot
  < 10 m/s (89,5 mot 40,2 per 1 000 stationstimmar). Det är över W-A2:s krav på 1,5 × och den första
  kvantitativa antydan att kortet har något att mäta. Men det är ETT band, i september, och
  situation_archive bär ingen orsak — samband, inte kausalitet.
  ✅ **VINDTAKET G_tak SATT 13/9** (DECISIONS #163, PR #219). Översta bandet går från `[20, 999]`
  till `[20, 30]` — 87,7 m/s låg i exakt de 45 stationstimmar domen vilade på. Svepet 30·40·50 är
  dokumentets eget; lägsta steget valt, och varje steg skrivs ut vid varje körning.
  ✅ **STATIONSVAKTEN BYGGD 13/9** (Bengts order, DECISIONS #164, PR #220). Ett värdetak tar bort
  dåliga AVLÄSNINGAR, inte en dålig STATION: 2312 bar 26 av 36 timmar över 30 m/s spridda över hela
  arkivet. Kriteriet är fysik, inte en ID-lista — en stationstimme är omöjlig vid byvind ≥ 15 m/s
  och byvindfaktor > 5. **9 stationer diskas ur B1, ingen ur B2** (siktgivaren på samma stolpe är
  ett annat instrument). Effekt: −1,1 % av arkivets stationstimmar men **−67 % av högsta bandet**
  (9 → 3) — det bandet bestod till två tredjedelar av trasiga givare.
  ⚠️ **FÖRSTA KRITERIET FÖLL PÅ SIN EGEN MÄTNING och det står kvar i koden som varning:** kvoten
  per rad diskvalificerade **335 av 748 stationer** och åt 47 % av B1. Byvinden är ett max över ett
  bakåtfönster, medelvinden är ögonblicket — kvoten var två tidsfönster delade med varandra. Taket 5
  flyttades INTE (arkivets p99,9 är 3,08); det var nämnaren som var fel.
  🔎 **TVÅ AV DE NIO (2438, 2107) HAR SINA OMÖJLIGA VÄRDEN UNDER 30 m/s** — G_tak kan aldrig se dem.
  Det var okänt när kortet beställdes och är vaktens starkaste existensskäl.
  ⏭️ **TILL BENGT:** de nio stationerna har en trasig byvindgivare. Skriptet listar dem, det anmäler
  dem inte — en anmälan till Trafikverket är ett eget beslut (eget kort om det ska göras).
  ⏱️ **STEG 0 KUNDE GÖRAS FÖRE RADARDOMEN:** givarkollen + grind W-A mot arkivet. W-A frågar om
  olycksfrekvensen stiger monotont med byvind respektive sjunkande sikt — och till skillnad från
  vattenplaningen **går nollhypotesen att räkna här**, eftersom exponeringen mäts kontinuerligt vid
  varje station. Faller W-A är kortet klart utan en rad motorkod.
  🥈 Roll B byggs FÖRE roll A (billigare, ingen ny fara) och blir **den första lager 2-regel som
  faktiskt skrivs** — #68 beslutades men byggdes aldrig. Designfrågan besvarad: modifieraren
  FÖRLÄNGER FÖRSPRÅNGET, den höjer inte prioriteten, för prioritetsstegen droppar förloraren.
  (systemanalys
  📥 **ÖVERLÄMNAT FRÅN #89 den 12/9** (TROSKLAR-OVERGANGAR §6, DECISIONS #109): sidvind × halka och
  dimma-som-sikt × halka är **LAGER 2 — riskmodifierare**. De ändrar inte ytan, de ändrar faran för
  föraren GIVET en yta. Följden är att de **inte behöver minne och inte tillståndsskattaren** — de
  byggs som #68 var tänkt: ett förvillkor eller ett längre försprång, en rad i tröskeldokumentet, en
  vektor. Väsentligt billigare byggform än lager 1. Öppen designfråga som hör hemma i #90:s dokument:
  ska sikt/sidvind MODIFIERA halkvarningen (längre försprång, sämre reaktionstid) i stället för att
  bara förlora prioritetsstriden? ⚠️ Notera att #68 är BESLUTAD men aldrig byggd — den visar formen,
  bevisar den inte. Första lager 2-regeln som faktiskt skrivs blir precedensen.
  10/9). wind_speed_ms/wind_gust_ms/visibility_m landar varje minut (kort #84). Sidvind på broar och
  slätter är en riktig risk för husbil, släp och lastbil (= B2B, #92/#94); dimma är en fartfråga.
  Båda är PUNKTKÄLLOR ⇒ "framöver", aldrig "på vägen". 🔒 NYCKEL: Axels ja + tröskeldokument (byvind
  m/s per fordonstyp, sikt m), plats i A-skalan under halkan, vektorer i tre portar. Skugga först.
  Verify: skuggkolumn med facit ur situation_archive (vindrelaterade olyckor) en höstmånad.
  📏 **Tryckt 24/9 (DECISIONS #331):** W-A steg 0, 14 dygn (körning 35949166508): 209 834 rader, byvind i 99,3 % (750 stationer), sikt i 99,9 %; täckningsgrad 17,9 % av möjliga stationstimmar; 11 stationer med omöjliga timmar (byvind ≥ 15 m/s och kvot > 5) tas av stationsvakten; högsta byvind 87,7 m/s bakom taket 30; W-A OAVGJORT — underlagsvakten W-A4 håller (16 respektive 243 stationstimmar i högsta bandet).
  ⏭️ **B-GRINDEN UR ARKIVET 25/9 (DECISIONS #363, Bengts ja):** skuggkolumnen byggs inte — B spelas upp ur arkivet när A passerat,
  spärrad som grind NT. Inget behöver byggas i skuggmotorn före frosten. Låsankaret är första körning som läser ett B-utfall.
- [ ] ⛰️ **#96 HÖJDPROVET — terrängens första faktor, mäter redan** (utlyft ur #38b 10/9 på Bengts order:
  📅 **DATUM 23/10 (Bengt 25/9, DECISIONS #357) — står kvar, stängs inte:** efter fyra veckor med de varma grannarna i arkivet (#353) läser Claude vägpunktsgrindens RÅ mot RÅ+HÖJD ur måndagskörningen, och beslutet om höjden i segmentprognosen tas före novembers skarpa prövning. Skälet: 23/9:s RÅ+HÖJD (A2 4,7 %, oavgjord) mättes på ett arkiv utan hälften av grannarna — just de varma, där höjden spelar roll. Verify (från 25/9): utfallet på fyra veckors ocensurerat underlag inskrivet här och beslutet i DECISIONS.
  "höjdmätningar o nivåskillnader är väl också en del av detta" — ja: terrängfaktorn i #95:s lager och
  grunden för #91). scripts/hojd-prov.ts + knappen Actions → hojd-prov: EU-DEM 25 m via opentopodata,
  747/757 stationer, tre varianter RÅ / RÅ+HÖJD / OFFSET=taket mot arkivet. FYND 1 (starkt, 3 455 par):
  empirisk lapse **0,71 °C/100 m** (standard 0,65; *rättat till 0,63 nedan, FYND 1, DECISIONS #226*) — höjden bär en äkta del av parsystematiken.
  FYND 2 (ärligt, 40 augustipunkter): rå+höjd 8,36 ≈ rå 8,36 mot offsetens 2,50 °C — i utstrålningslägen
  räcker höjden INTE ensam, den vänder t.o.m. tecken i inversionsnätter (kalluft i dalen). Aldrig
  fristående: felkartan dömer, luftankarna lagar, höjden finjusterar. AUTOMATISK måndagar 07:00 UTC
  sedan 4/9. ⚠️ Måndag 7/9 kördes aldrig (hela mätserien föll i spending-limit-stoppet, 2 s) — nästa
  14/9 07:00, samma morgon som radardomen. Höjd lagras inte i databasen; korrektionen finns bara i
  provskriptet, aldrig i motorn. 💰 1 Actions-min/vecka ≈ 0,4 kr/mån, 8 API-anrop, 6 kB om höjden
  lagras. 🔒 NYCKEL: vinterdata (≥ 500 punkter) — samma dom som grind A. Sedan: höjd som kolumn i
  weather_latest (så snapshoten och #91 kan läsa den) kräver tröskelrad i TROSKLAR-SKUGGAN.
  Verify: måndagsserien 14/9 grön med hojd-prov-sammanfattning; vinterkurvan lapse/MAE per band växer
  vecka för vecka utan knapptryck. Resonemanget: Drive-dokumentet v3 §2.4.
  ✅ **OMKÖRT 12/9 PÅ KNAPP** (Bengts "ta alla fem", DECISIONS #119) — och båda fynden ska rättas:
  **FYND 1 rör sig:** empirisk lapse **0,63 °C/100 m ur 3 476 par**, inte 0,71 ur 3 455. Med mer
  underlag gick talet NÄRMARE lärobokens 0,65, inte längre ifrån. **FYND 2 håller, med 49 gånger mer
  data:** på 1 962 punkter (mot 40) är rå 1,65 °C och rå+höjd **1,65 °C** — höjden återvinner exakt
  ingenting totalt, och gör det sämre i banden 7–15 km (5,21 → 5,34) och > 20 km (1,30 → 1,33).
  Den hjälper bara nära ankaret (0–7 km: 2,58 → 2,31) och i 15–20 km (1,52 → 1,38). Offsetmodellen
  slår båda överallt (1,06 °C). **Rangordningen står — men "felkartan dömer" dömer nu emot sig själv,
  se grind A i #38b.** 751 av 761 stationer fick EU-DEM-höjd.
- [ ] 🌧️ **#42 Vattenplaningsvarningen** — ÄGARE: BENGT (issue #15, 1/9) — regnintensitet (VViS RainSum,
  ny ingestkolumn — vi lagrar idag bara regn ja/nej) × spårdjupslager (Trafikverkets
  vägytemätning via Lastkajen; licens/färskhet kollas först) × fartgrind ≥ ~70 km/h
  på enheten. Punktkälla ⇒ "framöver"-fras, aldrig avstånd. Ordning enligt huslagen:
  eget tröskeldokument FÖRE kod, sedan skugga — kan mätas i höstregn redan i september,
  behöver inte vänta på vintern. Facit: situation_archive (stoppade fordon/olyckor i
  regnväder). FÖRSTUDIE: docs/VATTENPLANING-ANALYS.md (1/9, granskning + körschema §7–8).
  ✅ **Steg 0a KLART 2/9** (Axels ja via Bengt): RainSum bevisad 89 % täckning FÖRE bygget
  (regn-bevis #1), rain_sum_mm + snow_wateq_mm i arkivet, slutbevis 658 stationer med
  mängd (regn-bevis #3). Facit tickar från nu.
  ✅ **Steg 0b KLAR 2/9, v2-dom** (cell-matning #2, 84 341 händelser, givarelösa
  uteslutna): artefakten bekräftad och borta — kurvan nu rent monoton 26 % (0–5 km)
  → 36 → 41 → 47 → 52 → 60 % (30–50 km). Redan vid 5–10 km är över en tredjedel av
  regnhändelserna enstations. DOMEN STÅR: stationstrigger ensam räcker inte —
  radarspåret valt (DECISIONS #60), stationerna blir kalibrering + fartgrind.
  📅 **EFTER RADARDOMEN 14/9** (Bengts order 4/9): fundera på att koppla in radar-
  spåret som #42:s trigger mellan stationerna — MED kalibreringsfaktorn från v3,
  inskrivet i TROSKLAR-VATTENPLANING (steg 2) före triggerkod. Före domen är det
  låst: cirkularitet (stationerna är radarns domare) + okalibrerad skala (kvot 0,39
  på tunt underlag). Faller domen väl ut är detta nästa steg; faller den illa
  omprövas hela triggerfrågan. Beslut: Bengt + Axel.
  🔨 **STEG 1 FÖRBEREDD 4/9** (Bengts order): scripts/lastkajen-rekognosering.ts +
  knappen lastkajen-rekognosering — REN LÄSNING som söker svar på körschemats fyra
  frågor (licens · format mot 818-skelettet · färskhet · kontokrav). Två spår:
  öppna API:et (kandidatobjekttyper — felmeddelandet är den ärligaste katalogen,
  RoadNumber-läxan) och Lastkajens egna ytor (katalog/swagger/licenstext). Laddar
  inget, skriver inget; en fallen kandidat är ett svar, bara total tystnad fäller
  jobbet. Det som kräver konto är Bengts handgrepp — kortet är hans.
  🔄 **OMTAG 4/9 (Bengts granskningsfråga → väg C, DECISIONS #65): spårdjupet
  blockerar inte längre.** Steg 1 mätte tillgång, inte nytta — ankarklippningens
  fälla. Men att skjuta spårdjupet vore värre: höstregnen är en engångschans i år
  (nästa hösten 2027). Nu parallellt: reconen = ren kunskap · ansökan startas om
  konto krävs (kalendertid löper gratis) · TROSKLAR-VATTENPLANING skrivs UTAN
  spårdjupströskel (ingen gissad tröskel) · skuggan börjar oavsett · hinner datan
  fram blir spårdjup ANALYSKOLUMN (nytt steg 4b), aldrig varningströskel förrän
  nyttan är mätt. Körschemat §8 omskrivet.
  ✅ **RECONEN KÖRD 4/9 (körning #1–2, DECISIONS #66) — svaret ändrar kortet:**
  spårdjup finns INTE i öppna API:et (PavementData 19 fält, RoadData 24 fält,
  inventerade namn för namn — noll rut/djup/IRI/textur/friktion). Lastkajen kräver
  konto (/api/Identity/Login → 405 på GET: finns, vill ha POST). MEN GRATIS PROXY
  HITTAD: RoadData bär **AADT + AADTHeavyVehicles** (tung trafik = spårens orsak),
  RoadWidth, BearingCapacity, WearLayer; PavementData bär PavementDate/-Type/
  Thickness — allt i vägnummer + löpande längd, samma referenssystem som våra 818
  segment. Steg 4b = TRAFIKPROXYN (byggs när skuggan står), mätt spårdjup flyttat
  till nytt steg 4c, villkorat. Räcker proxyn behövs Lastkajen aldrig.
  ⚠️ Mätt färskhetsvarning: beläggningsdatum 1967/1980/2013 i stickprovet — grov på
  småvägar, men Lastkajens egna mätningar har samma svaghet där. Redovisas i domen.
  📏 **STEG 2 UTKAST SKRIVET 4/9** (Bengts order): docs/TROSKLAR-VATTENPLANING.md —
  tre grindar (V-A påståendets bärkraft, mätbar NU; V-B skuggdriften; V-C domens
  giltighet med binomialbruset), asymmetrisk facittabell där "regn utan olycka"
  INTE är falsklarm (granskningens §7.3), vinterinteraktionen som Axel-beslut med
  rekommendation (halkan vinner alltid, vattenplaningen vilar ≤ +4 °C), radarns roll
  villkorad av domen 14/9, ingen spårdjupströskel (#65/#66). Regntröskeln i mm/h
  medvetet OSATT — den ska falla ur V-A:s mätning, inte gissas.
  ⛔ **GRIND V-A FALLER — BEKRÄFTAT 12/9 MED TREDUBBELT UNDERLAG** (körning 34670516460,
  DECISIONS #104; första domen #69, 4/9). 0–10 km vid 0,5 mm/h: **träff 61 ± 2 %** mot kravets
  70 %, falsklarm 12 ± 1 % mot kravets 25 %. n = 3 594 mot 1 141 i första körningen, och talen
  är oförändrade. Ett nej som inte rör sig när underlaget tredubblas är ett riktigt nej.
  🔍 **FALSKLARMEN ÄR INTE PROBLEMET — TRÄFFEN ÄR DET.** Falsklarm 4–12 % på varje tröskel, långt
  under kravet. Träff + delvis är 88 % vid 0,5 mm/h och 94 % vid 4 mm/h: grannarna vet med hög
  säkerhet ATT det regnar hos målstationen, men inte HUR MYCKET.
  ❗ **OCH DET ÄR PRECIS DÄRFÖR FARAN ÄR SVÅR:** intensiteten är exakt det vattenplaning behöver —
  duggregn ger ingen vattenplaning. #69:s öppna fråga (ska V-A1 skrivas om till "regnar det
  alls"?) besvaras därmed NEJ på sakliga grunder: det hade gjort påståendet mätbart och samtidigt
  värdelöst för faran. **Stationsspåret kan inte bära en intensitetsvarning.**
  🛰️ **RADARDOMENS UNDERLAG FÖRNYAT 12/9** (körning 34670799228). Cellmätningen hade också bara
  EN skarp körning — 3/9, på ett dygns radardata — och dess måndagskörning 7/9 föll i samma
  minutkris. Domen hade alltså vilat på nio dygn gammalt underlag. Nu kört med de sju dygn kortet
  #43 kräver: **14 583 radar↔station-par, 88 kompositer, 5/9 → 12/9.**
  📈 Bekräftelsen VÄXER MONOTONT med intensiteten — kurvans egen rimlighetskontroll, och den
  passerar: 39 % (0,1–0,5 mm/h) → 54 % (0,5–2) → 73 % (2–10) → **79 % (≥ 10)**.
  🎯 Missriktningen: av 14 511 stationsregn vid samplad komposittid hade radarn en rad ≤ 5 km i
  **93 %**. Jämför grind V-A:s 61 % station-mot-station. Kalibreringen (Marshall–Palmer /
  station) median **0,66** över 8 198 par, mot 0,39 på det tunna underlaget i #42.
  ⚠️ **KEDJEBEVIS, INGEN DOM** — skriptet säger det självt. Domen är Bengts och Axels på söndag.
  ➡️ Hela kortet vilar nu på **radardomen 14/9**, precis som DECISIONS #60 förutsåg: radarn mäter
  intensitet RUMSLIGT, stationerna blir kalibrering + fartgrind. Faller domen väl ut gäller #81:s
  ordning A–F. Faller den illa står #42 utan trigger.
  🐛 **OCH ETT TYST FEL, funnet 12/9:** #69 sade att kurvan skulle köras om av måndagsknappen när
  höstregnen fyllt arkivet. Den schemalagda körningen **7/9 13:31 fallerade** — tillsammans med
  ingest-fi, ingest-no, publish-map och regn-30 samma dygn, alltså minutkrisen 5/9 och inte ett
  kodfel. Ingen märkte det på fem dygn, och domen låg på fel underlag i åtta. Se kort #101.
  ✅ **VÄRDENA FÄLLDA AV BENGT 4/9** ("låt värdena stå", DECISIONS #67): V-A 70 %/25 %
  inom 0–10 km · V-B 20 % falsklarm / 40 % miss / max 3 varningar per rutt och regndygn ·
  V-C ≥200 varningar, ≥15 facithändelser, ≥5 regndygn, ≥3 län. Regntröskeln i mm/h
  förblir osatt (ska falla ur V-A:s mätning) och radarn är villkorad av domen 14/9.
  ✅ **FASTSTÄLLT AV AXEL 4/9** (DECISIONS #68, relayerat av Bengt): värdena står,
  vinterinteraktionen avgjord — halkan vinner alltid, vattenplaningen vilar helt vid
  yttemp ≤ +4 °C (förvillkor i koden, inte prioritetsfråga i alarmkön ⇒ egen vektor).
  ✅ **STEG 3 BYGGT 4/9** (Bengts "bygg grinden"): publish/grind-v-a.ts + knappen
  grind-v-a, måndagar 07:20 sist i mätserien. LOO mot regnarkivet, stationen aldrig
  med i sin egen prognos. TRIPPELDELNING i stället för tvådelning: när grannarna säger
  "≥ T" är egen mätning TRÄFF (≥T), DELVIS (0<egen<T) eller FALSKLARM (=0) — att slå
  ihop delvis+falsklarm hade blåst upp falsklarmen, att slå ihop träff+delvis hade
  dolt dem. REGNTRÖSKELN SÄTTS INTE, DEN FALLER UT: 0,5/1/2/4/6/10 mm/h sveps och
  lägsta som klarar 70 %/25 % i bandet 0–10 km är svaret. Binomialbrus per andel (V-C3),
  domspärr < 200 fall, underlagsvakt. Självtest med känd sanning grönt: identiskt regn
  ⇒ 100 % träff / 0 % falsklarm, oberoende regn ⇒ 34 % / 66 %.
  ⚖️ **SKARP KÖRNING 4/9 — V-A FALLER, men läs kolumnerna (DECISIONS #69):** n=1 141 fall
  i 0–10 km, alltså riktig dom och inte "för tunt". FALSKLARMEN KLARAR V-A2 med marginal
  överallt (12/10/8/7/4 % för 0,5/1/2/4/6 mm/h). Det är TRÄFFEN som fäller: 61 % som bäst
  mot kravet 70 %. DELVIS-andelen är stor och växande (27→71 %): det regnade hos
  målstationen, men svagare än tröskeln. Träff+delvis = 88–94 %.
  ⇒ **Grannarna vet ATT det regnar, inte HUR MYCKET.** Intensitetströskeln bär inte —
  regnpåståendet gör det.
  🔑 **BESLUTSLÄGE (Bengt + Axel):** (a) dokumenterat nej, kortet stängs, regnarkivet
  behålls; (b) §5-ändring som omformulerar V-A1 mot "regnar det alls" + låter farten och
  platsfaktorn bära risken — kräver BÅDAS signaturer och en motivering som INTE lutar sig
  mot det här utfallet; (c) vänta på radardomen 14/9, som kan ge intensiteten mellan
  stationerna. Claude ändrar ingenting själv — att flytta målstolparna när siffrorna
  kommit är precis vad §5 förbjuder.
  ⚠️ Reservation: rain_sum_mm startade 2/9, så "30 dygn" är tre dygns septemberregn.
  Knappen går måndagar 07:20 och kurvan växer med höstregnen.
  ✅ **FACITET RÄDDAT 9/9 ~05:00 — ingest-live deployad av Axel (kort #84), bevis `vind 844 | regn 907 | alla 907`.** Luckan 5/9–9/9 är permanent och redovisas i grind V-A:s "30 dygn". Historik:
  ingest-live:s väder (#72) skrev arkivet UTAN rain_sum_mm/snow_wateq_mm/vind/sikt. Grind V-A,
  regn-tackning och hela facitet läser rain_sum_mm ⇒ tre dygns septemberregn omätta, och det
  hade fortsatt. Nu speglar ingest-live weather.ts fält för fält. 🔑 AXEL: deploya ingest-live,
  bevis = rader med rain_sum_mm senaste timmen vid regn. BESLUTSLÄGET (a/b/c) oförändrat.
  Grind V-A kräver Actions eller Axels lokala körning (`publish/grind-v-a.ts 30`).
  *(nyckel för röst: Axels ja — rösttext, plats i A-skalan, ordning mot #15/#16)*
  🔁 **GRIND V-A OMKÖRD 13/9 01:06 (färsk, 30 dygn, 755 stationer, 73 194 bucketade avläsningar).**
  Kravet ur TROSKLAR-VATTENPLANING §3: V-A1 träff ≥ 70 %, V-A2 falsklarm ≤ 25 %, bara 0–10 km (V-A3).
  `0,5 mm/h  n=3800  träff 60±2 %  delvis 28 %  falsklarm 12±1 %`
  `1         n=2578  träff 53±2 %  delvis 37 %  falsklarm 10±1 %`
  `2         n=1295  träff 40±3 %  delvis 51 %  falsklarm  9±2 %`
  `4         n= 513  träff 27±4 %  delvis 65 %  falsklarm  7±2 %`
  `6         n= 216  träff 20±5 %  delvis 75 %  falsklarm  5±3 %`
  `10        n=  53  träff 11±9 %  delvis 83 %  falsklarm  6±6 %`
  **DOM: V-A FALLER på alla sex trösklarna.** Tredje körningen med samma svar, nu på växande underlag
  (1 141 → 3 594 → 3 800 fall i 0–10 km). Falsklarmen klarar V-A2 överallt (5–12 %); det är TRÄFFEN som
  fäller, och delvis-andelen växer monotont med tröskeln (28 → 83 %). Grannarna vet ATT det regnar, inte
  HUR MYCKET. ⇒ Beslutsläge (a)/(b)/(c) oförändrat i sak, men (c) har nu mätt underlag: se #43 13/9.
  ✅ **BESLUTSLÄGET AVGJORT 13/9 — (c) VALT AV BENGT** (DECISIONS #153): radarn ger intensiteten
  stationerna inte kan. (a) hade kastat en källa som mäter just det som fattas; (b) avvisades redan
  12/9 på saklig grund — "regnar det alls" hade gjort påståendet mätbart och samtidigt värdelöst för
  faran. Kortet går därmed vidare enligt kort #81:s stegordning A→F, och steg A (kalibreringen in i
  dokumentet) är skrivet. 🔑 Axels kontrasignering i §3.4 innan steg B.
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** #81 *Byggordningen*. Kvar ur #81: C-station byggd eller struken, och E dömd över V-C:s underlag.
  📏 **Läst 25/9 (Bengts fråga: går det att göra mer?), bara räkningar, inga andelar:** skuggan V-B har loggat **57 varningar på 7 regndygn i 21 län-rutor** sedan 15/9 (V-C: 200 · 5 · 3). Veckan 21–24/9 gav **1** varning på 108 radarutlösta segment, mot 28 på 693 veckan före — lågt men inte bevisat fel. **Två hinder för domen:** (1) måndagsknappen räknar V-C på 14 dygn, fast §3 inte har något fönster; (2) `grind-v-b.ts` skriver alltid *0 facitbekräftade händelser*, fast §2 godtar *olycka i regnväder* som bekräftelse — och testarlogg kan inte finnas förrän rösten finns, som i sin tur väntar på V-C. Förslagen står i bedömningen §4.2.
  🔑 **Bengts ja 25/9 (DECISIONS #349):** (1) knappen räknar §2:s facit — olycka inom 2 km från en skuggrutt, regn hos dömande station inom ±30 min; (2) V-C från 15/9; (3) **C-station struken**. Definitionerna står i DECISIONS före första räkningen. Kvar före bygget: Bengts svar på om knappen bara ska visa räkningar under spärren (§4.2).
  🔨 **BYGGT 25/9 (Bengt: *"ja, bara räkningar under spärren"*, DECISIONS #350):** grind V-B räknar facit enligt §2, fönstret är hela perioden sedan 15/9, och under spärren skrivs bara räkningar. Självtestet sju nya fall, två motprov fällda på rätt rad, och testet körs nu i CI. Kvar: första körningen mot databasen som bevis.
  📏 **BEVISAT MOT DATABASEN 25/9 05:55Z** (körning 36100583870, Bengts order): fönstret från 15/9 (11 dygn), självtestet grönt, och utskriften bär bara räkningar — **57 varningar (41 mätbara, 16 omätbara) · 98 olyckor inom 2 km från rutterna, 10 i regn, 4 torra, 84 omätbara · 7 regndygn · 21 län**. Spärren står på 57 av 200 varningar och 10 av 15 facit. Fyndet om de omätbara blev kort #251.
  ✅ **#251 byggt 25/9 (DECISIONS #351):** en dömande station som är igång men tyst räknas som torr, så V-B1 inte längre gömmer falsklarm bland de omätbara. Kvar för domen: 200 varningar och 15 facit.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: domen enligt `docs/TROSKLAR-VATTENPLANING.md` fälld i skuggan (minst 200 varningar och 15 facitfall) och bokförd i DECISIONS; vid ett ja är grenen i drift bakom sin grind.
- [ ] ⚖️ **#153 ALLVAR SOM FÖRSPRÅNG + ETT SMALARE UNDANTAG — beslut 1 omformulerat 16/9 och väntar, beslut 2 öppet (Bengts)**
  ✂️ **DELAT 25/9 (DECISIONS #358, Bengts ja): kortet bär nu bara BESLUT 1.** Datum: senast när betan startar i november skrivs tröskeldokumentet (steg 4 nedan), så att skuggan går december–februari och domen kan falla i mars 2027. Steg 3 (S2) är klart sedan 24/9. **Beslut 2** står i vårlistan (Ä8) bredvid sensortrappan, med beroendet inskrivet: det bygger på beslut 1:s gradering och behöver telefonsensorerna som vittne på platsen.
  ✏️ **OMSKRIVET 16/9 på Bengts order *"gör 153 och omformulera 153"* (DECISIONS #221).** Det gamla kortet föreslog att
  kombinationen ändrar varningen med *"ordval, framförhållning eller prioritet"*. Två av de tre är avvisade, och kortet
  är omskrivet så att ingen bygger dem.
  **Varifrån kortet kommer:** Bengts fråga 13/9 — ska riskerna kunna vägas ihop till en sammanlagd risk, eller bara den
  största sägas? — och *"om radarn signalerar blött och offset signalerar under noll, kommer motorn att generera en
  isrisk framöver?"* (svaret då: nej).
  **TVÅ REGLER, olika skäl:** · **Regel 1 — en röst i taget.** Prioriteten väljer EN vinnare, resten droppas. Människo-
  faktorer, inte modellering — rörs inte. · **Regel 2 — tröskelregeln**, sedan 16/9 i Axels lydelse: *"En storhet som
  inte kan motbevisas av en mätning får inte utlösa en varning. Extrapolation faller. Minne av mätningar består."*
  (TROSKLAR-KOMBINATIONEN §6, DECISIONS #220).
  **BESLUT 1 — ALLVAR SOM FÖRSPRÅNG (beslutat 16/9, VÄNTAR).** Samma ord, tidigare: `leadM` per fara, 400–3 000 m
  (16–120 s i 90 km/h). Formen är Axels egen (kartan §13.1) och redan beslutad för modifierare (#90 roll B, E1).
  Kostar **F4, inte F5**. ✘ **Inte ordval** — *"en sammanvägd allvarsgrad är ett mätinstrument, inte en röst"* (Axel).
  ✘ **Aldrig prioritet** — E3: det skulle tysta en olycka.
  ⏭️ **ORDNINGEN, inget steg före det förra:** (1) grepp 2 fastställt (C och D, #197) → (2) betan i drift i november →
  (3) S2: skattarens graderade nivå — utan graderat mått finns inget att sätta tiden efter (kartan §13.5) → (4) eget
  tröskeldokument skrivet före mätning: svep för försprång per nivå + tak för undanträngda varningar i `suppressed`
  (V1: ett längre försprång är tillägg bara om spärrloggen inte visar undanträngning) → (5) skugga → (6) dom, tidigast
  mars → (7) F4 i tre portar. Rösten är Axels. Kartans hake: första försprånget att modulera är troligen segmentets,
  inte ispunktens (A1 säger redan samma mening för kod 2 och 4).
  **BESLUT 2 — ETT SMALARE UNDANTAG (ÖPPET, Bengts).** Min tillämpning av den gamla regeln var trubbigare än
  verkligheten: **(a) radarn är ingen modell** utan en mätning av nederbörd, kalibrerad med faktorn 0,65 (#153/#154);
  **(b) interpolation mellan två mätningar är inte extrapolation från en.** Mellan en station på −3 °C och en på −2 °C är
  *"här är det under noll"* inramat av två eniga mätningar — grind A: **0–7 km MAE 0,33 °C, grova fel 0,0 %**
  (DECISIONS #131). Förslaget var att en modellerad temperatur får utlösa **ENDAST** inramad mellan mätande stationer
  inom kort avstånd som är **eniga om tecknet**.
  🔒 **Sedan 16/9 är interpolation FÖRBJUDEN som utlösare, och beslut 2 har ingen egen öppning** (TROSKLAR-KOMBINATIONEN
  §6 T5, §10). Beslutet måste klara T1–T3 som allt annat: ett vittne **på platsen** som kan fälla värdet. I de källor vi
  har i dag finns inget sådant mellan stationerna — beslut 2 behöver alltså en ny källa innan det kan bära något.
  **VARFÖR INGET GÅR ATT GÖRA NU:** båda besluten vilar på vinterdata. K-A står på ⊘ INGEN DOM med **noll** uppmätta
  frysfall (DECISIONS #137); Finlands 133 "frysrader" 13/9 var en fastnaglad givare. Grind A:s A2-rad är OAVGJORT.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** betan i drift och S2 (DECISIONS #221) — inget väntar på Bengt; i praktiken parkerat till efter betan.
  ✅ **STEG 4 OCH 5 KLARA 25/9 (DECISIONS #359, Bengt och Axel):** `docs/TROSKLAR-FORSPRANG.md` fastställt; motorn fick kroken (utan den byte för byte densamma, vektorerna orörda); nivåer och svep i `engine/src/forsprang.ts`; skuggan körs som eget anrop `?lage=forsprang` på :12/:42 och loggar i `forsprang_log`. 7 tester, 3 motprov. **Kvar:** FS-A väntar på vintern (bara kod 1 i arkivet), dom-knappen före mars, dom i mars, steg 7 efter domen.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: tröskeldokumentet för beslut 1 fastställt senast när betan startar i november, skuggan körd december–februari, och domen enligt `docs/TROSKLAR-FORSPRANG.md` fälld i mars 2027 och bokförd i DECISIONS.

- [ ] 🧩 **#228 APP-SCHEMAT ÖVERLEVER INTE `xcodegen`** (uppmätt under 0.3.9-releasen 20/9). Efter `xcodegen` fanns bara
  schemat **HalkvaktEngine** i Xcode — app-schemat autoskapas av Xcode och bor i användardata, som den genererade
  projektfilen skriver över. Följden mitt i en release: *Product → Archive* är avstängt, destinationen visar paketets
  `arm64, arm64_32, x86_64` i stället för appens `arm64`, och ingenting förklarar varför. Axel löste det med
  *Manage Schemes → Autocreate Schemes Now*, men det är samma klass som DEVELOPMENT_TEAM-fältet (#275): ett handgrepp
  efter varje generering, som går att glömma och som kostar mest när man har bråttom.
  Fix: deklarera schemat i `ios/HalkvaktApp/project.yml` så att `xcodegen` genererar det, delat och deterministiskt.
  ⚠️ **Får INTE skrivas blint** — jag kan inte köra `xcodegen` från den här sessionen (device_bash är en Linux-VM,
  inte macOS-skalet), så en felaktig YAML-nyckel upptäcks först när Axel kör kommandot. Ändringen görs när han är vid
  datorn och kan köra `xcodegen` direkt efteråt.
  Verify: `xcodegen` på en ren klon ⇒ **Halkvakt** finns i schemamenyn, är **Shared**, och destinationen visar bara
  `arm64` — utan att någon rört Manage Schemes.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** Axel vid Macen — ändringen får inte skrivas blint, `xcodegen` går inte att köra härifrån.

- [ ] 📷 **#209 BILDFACITBESLUTET FLYTTAT TILL EFTER FÖRSTA FROSTEN** (Bengts ja 20/9, DECISIONS #248, ur fyndet i #247).
  **Mätt skäl:** omklassningar till halka **0 på 14 dygn**, hela arkivet 7 rader; olyckorna (504) bär ingen orsak. Är källan lika tom
  i november–december står januaridomen på kamerabilderna — och granskningen finns inte byggd. Beslutet flyttas från *före 1/2* till
  **inom sju dygn efter första frostnatten**. Blindningen orörd: det gäller att BYGGA läsningen, inte att läsa utfallet (bilderna
  öppnas i mars). 🔑 **Väntar på första frosten** — mätningen körs i samma varv som T-A steg 0.
  Verify: en sats som ger antal omklassningar till halka inom 5 km och utfallsfönstret från en episod under frostnätterna; talet
  skrivet i bedömningen §4.2 tillsammans med Bengts och Axels beslut.
  🧂 **Följer med läsningen (Bengts ja 21/9, DECISIONS #291):** produktionsregelns varningar delas per vädertyp — kort #231.
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** #51 *Vinterarkivet* — dess Verify (DECISIONS #252) är samma mätning som den här.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** första frosten — sedan mätningen, därefter Bengts och Axels beslut.

- [ ] 🧊 **#151 VÄGLAGETS ÅLDER — ska en stående vinterklassning tystas när mätningarna säger att vintern tagit slut?**
  📄 **TRÖSKELDOKUMENT FASTSTÄLLT 12/9 av Bengt** (`docs/TROSKLAR-VAGLAGETS-ALDER.md`, DECISIONS #151/#152).
  **Kortet kommer ur att Axel mätte i stället för att bygga det jag antog.** Jag flaggade att
  `road_conditions` saknar väderpunkternas tretimmarsgräns; Axel mätte och upphävde antagandet:
  818 segment, alla kod 1, **exponering noll i september**, senaste ändring 25/8, **inget segment
  har end_time**. Operatören skriver bara vid FÖRÄNDRING — alltså kan en gammal klassning vara sann,
  och en hård åldersgräns skulle tysta en halkvarning på en väg som varit hal i tre dygn. Precis det
  fel dämpningen (#100) fälldes för.
  **Frågan är omformulerad:** inte *"är klassningen gammal?"* utan *"motsäger världen den?"*.
  Ålder är på sin höjd en förstärkning, aldrig en grund.
  **Tre regler i §3:** R0 ingen regel (förvalet) · R1 ytan motsäger · R2 ytan motsäger + ålder ·
  **R3 hård åldersgräns FÖRKASTAD före mätning** — felet ligger i formen, inte i tröskeln, och
  skälet står skrivet så att nästa förslag möts av det.
  **Nollan är ett utsagolöst noll** (#71): arkivet har inga vinterord alls i september, så mätningen
  KAN inte falsifiera. Körs om vid första vinterklassningen — med `kodgrinden` avsnitt D, som redan
  mäter exakt den frågan.
  **Taket är hårdare än vanligt och skälet står i §5:** alla andra tröskeldokument reglerar när vi
  får SÄGA något. Det här reglerar när vi får TIGA, och ett fel åt det hållet syns inte i en logg —
  det syns i att en förare inte fick veta. E3 (tysta utan skuggkörning) = **aldrig**.
  ⏭️ **Väntar på VINTERN.** Inget mäts förrän arkivet fått vinterklassningar — körs Å-A i september
  blir svaret OAVGJORT på Å-A4:s krav om 100 fall, och det är rätt svar, inte ett misslyckande.
  Fram till första skuggkörningen får §4:s svep och §5:s krav justeras med en rad i DECISIONS;
  därefter inte alls.
  🔧 **Axels två, utanför det här kortet:** `end_time`-filtret på segmenten (en rad — kolumnen finns
  i sql/001:24 och ingesten skriver den redan, men den är OPRÖVAD tills TRV satt en EndTime en gång)
  och stillaståendevakten (återanvänd mätvaktens 6b-form: larma inte på tystnad, larma på tystnad
  MEDAN stationerna säger vinter — och "alla 848 stationer" inträffar aldrig).
  🔑 **Nyckel, sorterat 22/9 (kort #224):** vinterklassningar i arkivet (Å-A4 kräver minst 100 med motsägelse; 7 rader på 14 dygn 20/9).
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: domen enligt `docs/TROSKLAR-VAGLAGETS-ALDER.md` fälld på vinterklassningar (kodgrinden avsnitt D) och bokförd i DECISIONS — R0, R1 eller R2.

- [ ] 🧊 **#103 FRYSKLASSNINGEN — kan en modell som är opålitlig på grader ändå bära en klass?**
  📄 **TRÖSKELDOKUMENT SKRIVET 12/9** (`docs/TROSKLAR-FRYSKLASSNINGEN.md`, **FASTSTÄLLT 12/9**, DECISIONS #130/#135).
  **Frågan är Axels, ordagrant**, ur hans bedömning av grind A: grind A föll, men A3
  frysklassningsfelet klarade med **1,1 % mot ett krav på 10** — modellen är dålig på GRADER men
  nästan aldrig fel om VILKEN SIDA AV NOLL, och det är den fråga motorn faktiskt ställer.
  ⚖️ **Legitim, inte en efterhandsräddning** — hans egen formulering: *samma data, ny fråga, ärlig
  ordning*. Dokumentet är skrivet så att **inget tal i §2 eller §4 kommer ur A3:s utfall**, och det
  står uttryckligen att 1,1 % inte får åberopas som skäl för någon tröskel.
  🚧 **AVGRÄNSNINGEN SOM AVGÖR ALLT ANNAT:** en godkänd frysklassning ger INTE rätt att skapa en
  varning där motorn tiger. Den får bara stärka en bedömning som redan vilar på en uppmätt station.
  **En modellerad storhet får aldrig vara en avtryckare** — samma regel som #95 (d) fick. *(Sedan 16/9 i Axels
  lydelse, DECISIONS #220: klassningen utlöser aldrig ensam — T6.)*
  🎯 **K2 är dokumentets egentliga idé:** grind A tvingade modellen att svara i varje punkt. En
  klassificerare får AVSTÅ nära gränsen — frågan blir hur bra den är på det den uttalar sig om, och
  hur mycket den då måste avstå. Därför har K-A både träffsäkerhets- OCH täckningskrav.
  ⚠️ **K-A2 är asymmetrisk med flit och undantagen från all lättnad:** att säga "fryser" om en torr
  väg kostar ett onödigt larm, att säga "fryser inte" om en isig väg kostar löftet produkten vilar
  på. Taket för det felet är tio gånger hårdare (≤ 1 % mot ≥ 95 %).
  🍂 **Vakt mot september:** K-A4 kräver ≥ 100 punkter med UPPMÄTT frys. Annars kan ett
  septemberunderlag ge 99 % rätt klass genom att alltid svara "fryser inte".
  ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135). Svepet och kraven är låsta.
  ➡️ **NÄSTA: K-A på befintligt arkiv** — kräver ingen ny data och ingen frost.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** frostnätter — K-A körs om när minst 100 punkter med uppmätt frys finns (K-A4).
  📏 **Tryckt 24/9 (DECISIONS #331):** K-A, 60 dygn (körning 35949104486): 712 stationer, 207 647 avläsningar; 1 099 punkter över 44 stationer men 0 frysande vid gränsen 0 °C — INGEN DOM (septembervakten K-A4). Tryck om vid första frosten.
  ⏭️ **B-GRINDEN UR ARKIVET 25/9 (DECISIONS #363, Bengts ja):** skuggkolumnen byggs inte — B spelas upp ur arkivet när A passerat,
  spärrad som grind NT. Inget behöver byggas i skuggmotorn före frosten. Låsankaret är första körning som läser ett B-utfall.
  ↪ **2/10 (DECISIONS #437):** måttstocken K-A1–K-A5 och svepet K2 lånas av kuvösens mätning av flaggmarginalen för de råa vägpunktskandidaterna (kort #270 g). Dokumentet är inte ändrat, och kortets egen grind döms inte av den mätningen.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: domen enligt `docs/TROSKLAR-FRYSKLASSNINGEN.md` (K-A:s krav på träffsäkerhet och täckning) fälld och bokförd i DECISIONS; vid ett ja stärker klassningen bara en bedömning som vilar på en uppmätt station.

- [ ] 🪢 **#95 Plan B för Trafikverket-beroendet — mät SMHI som reserv** (systemanalys 10/9). Allt
  🔓 **BLOCKERARFYNDET 12/9 (DECISIONS #114): kortet blockerar #88:s dom.** T-A:s fysikkontroll
  kräver "vanligast klara nätter", och molnmängd finns inte i arkivet. #95 är alltså inte en
  förstärkare som kan vänta till våren — den står i vägen för den enda punkten med naturens deadline.
  💰 **MEN MOLNET BEHÖVER INTE ARKIVERAS, och det river kortets dyraste rad.** SMHI metobs
  **parameter 16** (total molnmängd, timvärde) har `latest-months` som räcker **130 dygn bakåt**,
  plus `corrected-archive`. Molnet hämtas I EFTERHAND vid körning, som smhi-prov redan gör med
  lufttemperaturen. Ingen tabell, ingen ingest, noll lagring. Kortets "+25 MB/mån och oktoberbeslutet
  fem dagar närmare" gäller ANKARROLLEN, inte molnet.
  📐 **TÄCKNINGEN MÄTT** (`scripts/smhi-tackning.ts` + knapp, körning 34676483898): bara 108 av 459
  SMHI-stationer rapporterar molnmängd, men **91 % av VViS-stationerna och 94 % av vägsegmenten har
  en molnobservation inom 50 km** (median 29 km). Molnet är en STORSKALIG storhet — ett molntäcke
  sträcker sig tiotals mil — så 50 km är en helt annan sak här än för en yttemperatur. Hur långt det
  FÅR sträckas är dock inte mätt, bara hur långt det MÅSTE.
  ✅ **BLOCKERINGEN LYFT 12/9** (PR #163, DECISIONS #115): hämtningen är inkopplad i
  `scripts/grind-t-a.ts` och fysikkontrollen kör båda halvorna. Första utfallet: klara nätter 29 %
  fyrning mot mulna 0 %. **Sentinelfynd i formatet:** enheten heter procent men värdena är octas
  omräknade, och **113 % är inte molnmängd utan SMHI:s kod för HIMLEN SKYMD** — fysikaliskt
  motsatsen till klar natt. Klassas som skymd, räknas med de mulna.
  ➡️ ~~**KVAR AV #95:** ankarrollen (SMHI som extra ankare i grind A)~~ ⛔ **ANKARROLLEN BESVARAD
  12/9 — OCH SVARET ÄR NEJ** (DECISIONS #119, smhi-prov omkört på 60 dygn). På 1 918 jämförbara
  punkter: bas 1,05 °C → **+SMHI 1,20 °C, sämre i varje band**. Verify 3 ("sjunker MAE i banden över
  15 km?") är därmed besvarad negativt: den STIGER (1,02 → 1,35 i > 20 km). SMHI duger inte som
  förtätning där VViS finns. Kvar av reservtanken är bara det ursprungliga fallet: vad vi har när
  Trafikverket tystnar HELT — och där är priset uppmätt till 2,36 °C på de 352 punkter som bara
  finns tack vare SMHI.
  📐 **VERIFY 1 SKILD FRÅN MOLNFRÅGAN 12/9** (DECISIONS #118): molnkörningen svarade på
  representativitetsradien (50 km, 108 stationer) men lämnade §2.8:s EGEN Verify 1 obesvarad — "hur
  många av de 818 segmenten får en SMHI-station inom **15 km**", alltså luftens 235 stationer.
  `scripts/smhi-tackning.ts` mäter nu båda och håller isär dem i utskriften.
  📊 **VERIFY 1 — SVARET 12/9 (DECISIONS #120): 331 av 818 segment (40 %) har en SMHI-luftstation
  inom 15 km.** Median 17 km, 88 % inom 30 km, 100 % inom 50 km; 235 aktiva luftstationer av 1 003 i
  registret. **Vid den gräns §2.8 själv satte räcker täckningen alltså inte.** Var gränsen FÅR ligga
  är inte mätt — det är Verify 2, och den har redan fått ett svagt förhandsbesked samma kväll
  (SMHI-ankaret försämrar modellen, 2,36 °C på de punkter som bara SMHI ger).
  ➡️ **KVAR AV #95:** Verify 2 (luft→yta-korrelationen vintertid — den enda som kan avgöra reserven),
  representativitetsradien (hur långt molnet FÅR sträckas) och SMHI-förstärkaren nedan. Ingetdera
  blockerar längre något.
  🔨 **(d) FÖRSTÄRKAREN BYGGD 12/9 kväll** (Bengts "vi bygger smhi förstärkaren", DECISIONS #121).
  📄 `docs/TROSKLAR-SMHI-FORSTARKAREN.md` — ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135).
  ⚖️ **SPÄNNINGEN I KORTET LÖST FÖRE SVEPET:** "yta nära noll" är BREDARE än motorns `yta ≤ 1 °C
  OCH fukt`, men kortet förbjuder uttryckligen att regeln skapar en varning. Därför får parametern
  F3 ett **tak vid motorns egen tröskel** — regeln får skära bort, aldrig lägga till.
  ✅ **AVGJORT AV BENGT 12/9: DEN SMALA** (DECISIONS #123). Skälet som fällde den breda: **ett län är
  ingen punkt och ingen sträcka.** Snöar det verkligen över länet rapporterar de flesta stationerna
  där redan nederbörd och motorn varnar; de som är TORRA under en aktiv länsvarning är just de där
  varningen är lokalt fel — alltså exakt falsklarmen. Och hålet ägs redan av ett bättre kort:
  **#89 (a) gör samma sak med en PUNKTKÄLLA** (stationens egen regnhistorik, 76 % av regnstoppen).
  Den breda förstärkaren var inte en bättre förstärkare, den var en sämre #89 (a).
  ➡️ **DEN BREDA IDÉNS KÄRNA FLYTTAD TILL #89, inte slängd:** ny parameter **`N_varning`** i
  TROSKLAR-OVERGANGAR §2.3 — en aktiv vintervarning **förlänger N** (hur länge efter uppmätt regn
  frysrisken lever vidare) utan att uppfinna väta ur en polygon. Utlösaren förblir stationens eget
  uppmätta regn. Svep av · 2 · 4 · 6 h, gatad med och utan i B3.
  🎚️ **MOTORN HAR INGET KONFIDENSFÄLT**, så effekten är namngiven: **E0 skuggkolumn (startläget)**
  · E1 längre försprång (samma form som #90:s roll B) · E2 annan text (Axels) · **E3 högre
  prioritet ALDRIG** — det skulle tysta en olycka.
  🕳️ **FYNDET UNDER BYGGET, dyrare än regeln själv: arkivet saknade varningens GILTIGHETSFÖNSTER.**
  `smhi_warnings` bär `approx_start`/`approx_end`, men töms vid varje synk; historiken har sedan
  `001_init` burit allt utom just de två fälten. Arkivet visste **när en varning publicerades, inte
  när den gällde** — och SMHI publicerar i förväg (publicerad 14, gäller 22–06). **Går inte att laga
  i efterhand.** ✅ `sql/015_smhi_giltighet.sql` + automigrationen i `ingest/db.ts` + historik-
  skrivningen bär fälten framåt. Varje dygn utan den migrationen hade varit ett dygn vinterunderlag
  som aldrig kan lagas — samma logik som T-A:s frostnätter.
  🚪 **GRIND F-A HAR BÅDE GOLV OCH TAK:** ≥ 200 förstärkta stationstimmar, ≥ 20 områden, andelen
  **mellan 5 % och 80 %**, inget område över 25 %. Över taket säger regeln bara "det är vinter".
  ⚠️ **Ett län är inte en väg** — varningsområdena är länspolygoner, så stor träffyta är inget bevis.
  🔬 `scripts/smhi-forstarkaren-steg0.ts` + knapp. F-B är en VINTERGRIND: facit
  (`road_condition_history`) står stilla sedan 25/8 och kan inte döma i september.
  ⊘ **FÖRSTA KÖRNINGEN 12/9: OAVGJORT, som väntat** (DECISIONS #122). 126 historikrader, 41 områden,
  geom i 97,6 %, **giltighetsfönster i 0,0 %** (alla skrivna före sql/015). Bara **3 kvalificerande
  stationstimmar** på 30 dygn, och **0 förstärkta i alla nio F1 × F2-rutor**. Varningstyperna:
  WIND_SEA 85 · FIRE 25 · WATER_SHORTAGE 10 · RAIN 3 · FLOODING 3 — **noll SNOW_ICE, noll ICING.**
  🐟 **BIFYND: `isWinterRelevant()` räknar kuling till havs som vinter.** Ingestens regex matchar
  `WIND`, och därmed `WIND_SEA`. Ofarligt i drift (flaggan används bara i en loggrad, inget
  filtreras på den) men loggraden "winter-relevant: N" betyder inte vad den ser ut att betyda.
  Vakten i skriptet räknar nu per kodmängd i stället för ett enda tal.
  🧱 **BIFYND 2: en migration i automigrationslistan är inte en körd migration.** Första försöket
  föll på `column "approx_start" does not exist` — `sql/015` körs först när INGESTEN kör, och
  mätskriptet kördes emellan. Samma form som "en ändrad fil under supabase/functions/ är INTE en
  deploy". **Regel: efter en migration som ett mätskript beror på, tryck dbknappen i samma varv.**
  ➕ **ÖVERTAGET FRÅN #93 den 12/9 (DECISIONS #108): SMHI-FÖRSTÄRKAREN.** `smhi_warnings` hämtas
  redan och ligger i arkivet (tiotals kB/dygn), så regeln **snöfallsvarning + yta nära noll = högre
  konfidens** kostar 0 kr och kräver ingen ny källa. Förstärkare av frysrisken, ALDRIG en egen fara
  — den får höja konfidensen i en varning som redan kvalificerar, inte skapa en varning. Verify:
  skuggkolumn `smhi_forstarkt` mätt mot facit en vintermånad. Detta är den billigaste delen av hela
  #95 och kan göras före täckningstabellen.
  hänger på ETT API (WeatherMeasurepoint). Givarvakten fångar trasiga sensorer, inte ett flöde som byter
  schema eller stänger; FI/NO/DK ger ingen redundans i Sverige. SMHI metobs (lufttemp, daggpunkt, moln,
  sikt, vind — GOLVET §7) har provats (smhi-prov) men aldrig mätts som RESERV: hur många av de 818
  segmenten får en SMHI-station inom 15 km, och hur väl följer SMHI:s lufttemp VViS-ytan vintertid?
  Ren mätning ur arkivet + smhi-provet, ingen ny hämtning i drift. Verify: en tabell segment ×
  närmaste SMHI-station (avstånd, täckning %) och en korrelationsrad luft→yta ur en kall vecka.
  🧩 **BREDDAT 10/9 (Bengt: "inte bara backup — en pusselbit för 3 km längre fram"):** SMHI mäter
  inte ytan, men mäter det som avgör hur långt en VViS-yta får sträckas ut: (a) MOLNMÄNGD — klar
  natt ger stor lokal spridning (dalgångar 3–5 °C kallare), mulet/blåsigt gör stationen representativ
  milen runt; VViS saknar molnmängd helt (GOLVET §7). (b) VIND + DAGGPUNKT som andra givare på
  utstrålningen. (c) FÖRTÄTNING — SMHI:s automatstationer som extra ankare i offsetmodellen där VViS
  är glest (inlandet), med egen luft→yta-överföring per station. (d) NEDERBÖRDSTYP/-mängd per timme
  till #89:s övergångar. Den bild vi vill ha men inte kan mäta — ytan 3 km fram — blir då ett lager:
  närmaste VViS-ankare (#38b) × representativitetsradie ur moln/vind (SMHI) × terrängkorrektion (#91)
  × trend (#88), märkt MODELLERAT, sagt som risk, dömt i mars mot grind A/B/C. "Okänt" förblir ett
  giltigt svar. Verify (utöver ovan): grind A körd med SMHI-ankare inlagda — sjunker MAE i bandet
  15–20 km och >20 km? Och: felet i leave-one-out som funktion av SMHI-molnmängd (klar/halvklar/
  mulet) — är spridningen 2× större klara nätter? Om ja är molnmängden representativitetsknappen
  TROSKLAR-SKUGGAN:s trenivåmärkning saknar. FORTFARANDE OSYNLIGT oavsett SMHI: en snöby mellan
  stationerna (bara radarn, #43) och om saltbilen passerat (ingen öppen källa, RISKKARTA-BENGT).
  Blir svaret ja på molnfrågan är SMHI inte en reserv utan en del av motorn — då skrivs kortet om
  till ett byggkort med tröskelrad i TROSKLAR-SKUGGAN (§5, båda signerar). Resonemanget i sin helhet:
  Drive, "Framtida utvecklingsmöjligheter — systemanalys varningssystemen 2026-09-10 v2 (läsbar)", §2.8.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** första frosten (F-B i samma varv som T-A steg 0), vinterdata för Verify 2 (Ä4, mars).
  ⏭️ **B-GRINDEN UR ARKIVET 25/9 (DECISIONS #363, Bengts ja):** skuggkolumnen byggs inte — B spelas upp ur arkivet när A passerat,
  spärrad som grind NT. Inget behöver byggas i skuggmotorn före frosten. Låsankaret är första körning som läser ett B-utfall.

- [ ] 🔨 ❄️ **#46 Rimfrosten — svartis utan nederbörd** (Bengts hål A, 4/9) — PÅGÅR:
  📄 **TRÖSKELDOKUMENT SKRIVET 12/9** (`docs/TROSKLAR-RIMFROST.md`, **FASTSTÄLLT 12/9**, DECISIONS #117/#135).
  Skälet: #89:s överlämning nedan pekade på "#46:s eget tröskeldokument" — som inte fanns. En
  överlämning till ett dokument som inte finns är en tappad idé med kvitto (samma form som den
  dinglande TROSKLAR-TYSTNADSFEL 11/9). **Formen avgjord före svepet:** rimfrosten blir en ANDRA
  GREN i `icing_point`, inte en sjätte farotyp — en sjätte kind skulle röra varje vektor och hela
  prioritetsstegen. Fyra grindar R-A…R-D, sex osatta parametrar med svep, och en givarvakt som är
  **undantagen från all lättnad** (får skärpas, aldrig mjukas upp) med kortets egna tal som skäl:
  53 av 58 kandidater från TRE stationer, 0 av 53 överlevde äkthetsvillkoret. R-A5 gör läxan till
  ett krav: ingen station får stå för mer än 20 % av träffarna. **Billigaste vägen till underlag är
  det FINSKA arkivet** — KASTEPISTE sedan 4/9, Lapplands septemberfrost ger äkta rimfrostnätter
  veckor före Sverige, och den körningen kräver ingen svensk frost och ingen dom.
  ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135). Svepet och kraven är låsta.
  📥 **ÖVERLÄMNAT FRÅN #89 den 12/9** (TROSKLAR-OVERGANGAR §6, DECISIONS #109). Två saker ska in i
  #46:s eget tröskeldokument. **(1) Dimma är en ÖVERGÅNGSORSAK, inte en interaktion:** dimma är luft
  vid ~100 % RH, alltså daggpunkt ≈ lufttemperatur, så kondensationsvillkoret (yta ≤ daggpunkt) blir
  uppfyllt så fort ytan är kallare än luften. Sikt < X m hör därför hemma som **konfidenshöjare för
  kondensationsvillkoret** — ingen egen fara, ingen egen prioritet. **(2) PARTITIONEN mot efterhalkan:**
  **#46 äger fallet när yta ≤ daggpunkt** (kondensation pågår), **#89 (a) när yta > daggpunkt men
  regn inom N h** (kvarvarande regnvatten fryser i torr luft). Utan den gränsen dubbelräknar
  tystnadsfelet samma miss.
  ANALYSFAS (Bengt + Claude, terminalen 4/9). Fyndet: motorns fuktvillkor är enbart
  nederbörd, men dewpoint_c ligger oanvänd i varje arkivrad sedan 24/8. Rimfrost
  (klar natt, yta ≤ daggpunkt, ingen nederbörd) = höstens klassiska svartis — motorn
  tiger. Analysen backtestar villkoret mot arkivet INNAN någon metodändring föreslås:
  hur många stationstimmar skulle nya grenen fånga (marginaler 0/0,5/1 °C × yttröskel
  0/1 °C), överlappar den befintlig fukt, och toppar den kl 03–07 (fysikens signatur —
  gör den inte det är villkoret brus)? KÖRNING #1 (4/9, 6 min): fysikkontrollen FÄLLDE
  resultatet — platt dygnsprofil, och topp-3-stationerna hade yta−dagg −28…−49° =
  TRASIGA DAGGPUNKTSGIVARE (53/58 kandidater från 3 stationer). STORT BIFYND: frost-
  grenen kräver GIVARVAKT innan den byggs, annars falsklarmsmaskin. v2 med äkthetsvillkor (RH ≥ 90
  korsgivare + yta−dagg ≥ −5°) KÖRD (#2, 2m58s): 0 av 53 kandidater överlevde — ALLA
  var givarfel (57 rader < −10°, stationerna Ollsta 2346, Storvik 2135, Bolhyttan 1713).
  ANALYSFASENS DOM: (a) arkivet saknar ännu äkta rimfrostnätter — kvantifieringen görs
  om vid höstens första riktiga frostnätter (knappen redo); (b) ETABLERAT: givarvakten
  är obligatorisk del av varje framtida frostgren — utan den hade rimfrostvarningar
  avfyrats på skrot från tre stationer; (c) felet är isolerat till daggpunkten —
  offsetmodellen/grind A använder bara yttemp och är opåverkad. KANDIDAT (Bengts
  kolumn): påtala de tre stationernas orimliga daggpunkter för Trafikverket (mejlutkast
  levererat i chatten 4/9).
  ANALYSFAS DEL 2 (beslutad 4/9, Bengt: "gör 1,2,3") — metodgenomgångens tre spår:
  (1) ✅ FI-DAGGPUNKTEN IN I INGESTEN 4/9: KASTEPISTE fanns i källan men släpptes på
  golvet (verifierat live: 505/528 stationer, ex. station 1001 = 7,5°). Lapplands
  septemberfrost ger äkta rimfrostnätter VECKOR före Sverige — samma analys, finskt
  arkiv. ✅ BEVISAT 4/9: körning #24 föll på 42703 (latest-tabellen saknade kolumnen —
  rotationsläxan fångade det på minuter), sql/010 + automigrering i fi.ts, körning #25
  GRÖN med loggraden "daggpunkt 505 st". Finska daggpunkter arkiveras från och med nu.
  (2) HÖSTENS OMKÖRNING GÖRS UTFALLSDRIVEN, inte villkorsräknande: starta i FACIT
  (väglagets frost-omklassningar en klar morgon + gryningsbilder ur kamerafacit) och
  fråga bakåt om daggpunktsgrenen såg det 1–3 h innan där nederbördsgrenen var blind.
  Missmätningens (#19) riktning; bevis per händelse i stället för timstatistik.
  (3) NOTERADE, DRIVS EJ: historik bakåt är stängd väg (TRV live-only, SMHI saknar
  vägyta — begränsning, inte slarv); fysisk mikrovalidering (frostplatta/termometer)
  är trevlig men ger aldrig statistik.
  🔑 Motoränring + vektor är ETT SENARE beslut på höstens siffror; rösten är Axels.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** äkta frostnätter — R-A vid full vaktstyrka; därefter Bengts och Axels beslut om grenen.
  📏 **Tryckt 24/9 (Bengt: *"gör 5"*, DECISIONS #331):** R-A på det finska arkivet, 30 dygn (körning 35949100922): 39 244 rader, 419 stationer efter vakten — 0 episoder på 0 stationer, OAVGJORT (spärren 200 stationstimmar / 20 stationer); molnkontrollen R-A4 kan inte köras på Finland (SMHI:s moln når inte dit). Tryck om vid Lapplands första frost.
  ⏭️ **B-GRINDEN UR ARKIVET 25/9 (DECISIONS #363, Bengts ja):** skuggkolumnen byggs inte — B spelas upp ur arkivet när A passerat,
  spärrad som grind NT. Inget behöver byggas i skuggmotorn före frosten. Låsankaret är första körning som läser ett B-utfall.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: domen enligt `docs/TROSKLAR-RIMFROST.md` (grindarna R-A–R-D med givarvakten) fälld och bokförd i DECISIONS; vid ett ja är rimfrosten en gren i `icing_point` bakom sin grind.

- [ ] 🌨️ **#45 Nederbördstypen — regn, snö eller slask?** (Bengts fråga 3/9: "hur mäter
  vi snö, snöslask etc som är lika riskabla?") 🔒 LÅST BAKOM RADARDOMEN 14/9.
  **Läget när kortet skrevs:** snö och slask PÅ vägen talas redan — men bara indirekt:
  (a) VViS-stationernas snow-flagga räknas som fukt i frysriskmotorn ("frysrisk framöver"),
  (b) väglagets operatörsklasser ("Snöigt", "Is och snö", "Slask") blir slippery_segment
  och rösten säger "halt väglag". Hålet är eftersläpningen (operatören måste hinna klassa)
  och att radarn — som ser nederbörd i realtid MELLAN stationerna — inte vet SORTEN.
  **Metoden (det som ska mätas, inte gissas):** sorten avgörs av temperaturen nederbörden
  faller genom. Standard: VÅTBULBSTEMPERATUR (luft + fuktighet, båda finns per station):
  ≳ +1,5 °C regn · ≲ 0 °C snö · DÄREMELLAN SLASK — farligaste zonen, vattenplaning och
  blivande is samtidigt. Klassningen = våtbulb per segment (offsetmodell + höjdkorrektion,
  höjden flyttar snögränsen — lapse **0,63 °C/100 m** — beslutat 17/9, DECISIONS #226; tidigare ankarbreddningens 0,71) × radarintensitet
  (radar_precip, redan per segment var 5:e min). ALLA ingredienser ligger redan i arkivet
  — detta är en beräkning, ingen ny källa.
  **Facit finns gratis:** SMHI:s stationer rapporterar observerad nederbördstyp, och
  väglagets operatörsklasser är andra domaren. Klassningen körs i skugga och döms mot
  båda innan något får synas — tröskeldokumentets princip, samma som allt annat.
  **Varför låst till 14/9:** typklassning ovanpå en radarkälla som inte bestått sitt
  eget kedjebevis vore våning två före grunden. Klarar radarn domen: bygg klassningen
  som skuggkolumn i radarspåret (litet steg). Faller radarn: kortet omprövas — våtbulben
   enbart kan fortfarande klassa nederbörd SOM STATIONERNA ser, men inte mellan dem.
  **BENGTS MATRIS (4/9) — kortets egentliga mål är ÖVERGÅNGARNA, inte vädertyperna:**
  vägytan är ett TILLSTÅND (torr → blöt → slask/modd → snöbelagd → packad snöväg) och
  nederbörden en ÖVERGÅNG ovanpå det. Farligast är korsningarna: SNÖ PÅ SNÖ (nysnö på
  packad bana) och framför allt REGN PÅ SNÖ (polerar snövägen till is — fönstret innan
  operatören klassat om är där varningen är värd mest). Klassningen ska därför korsas
  med segmentets NUVARANDE väglagsstate (finns i arkivet), inte bara klassa det som
  faller. VIKTIG PRINCIP: snöväg som VINTERBASELINE i norr larmar ALDRIG — TRV kodar
  packad snöväg som normalt vinterväglag, och en app som ropar halt nov–april i Norrland
  avinstalleras (H2/cry wolf). Värdet är AVVIKELSEN från segmentets säsongsbaseline,
  som nu är mätbar ur väglagshistoriken + segment_id-tidsserien (issue #4). OVERIFIERAT
  tills vintern: exakt hur norrlandsetiketterna faller ut i vår data — prövas mot
  arkivets första vintermånad innan någon regel fryses.
  🔓 **GRINDEN KOPPLAD 4/9 kväll** (Bengts fråga "hur gick det med vad som faller på vad"):
  kortet stod låst bakom radardomen 14/9 — men avläsningen den dagen var skriven för att
  lyfta tre frågor (#43, #42:s trigger, #42:s beslutsläge) och nämnde INTE #45. Kortet hade
  alltså blivit liggande låst utan att någon öppnat grinden. Avläsningen heter nu
  "Radardomen + #42-inkopplingen + #45-grinden" och bär #45 som fjärde fråga, med båda
  utfallen och snöbaseline-spärren inskrivna.
  📏 **MÄTT LÄGE I KODEN 4/9** (läst, inte antaget): motorn kan i dag inte skilja de här
  fallen åt alls. `icing_point` avgörs av `surfaceTempC <= tröskel && moisture === true`, och
  `moisture` är en hopslagen bit — `rain OR snow OR COALESCE(precipitation,'') <> ''`
  (publish/missar.ts). Regn på torrt, regn på snö och snö på snö ger alla samma `true`.
  Matrisens farligaste korsning är alltså osynlig för motorn i dag; det är exakt luckan
  kortet finns för att stänga.
  🛑 **INGREDIENSPÅSTÅENDET ÖVERDREV — rättat 4/9 kväll efter svep** (Bengts fråga om
  baseline och Norrland). Kortet ovan säger "ALLA ingredienser ligger redan i arkivet". Det
  stämmer inte, och tre saker fattas:
  (1) `weather_latest` — tabellen snapshoten byggs ur — bär VARKEN fuktighet ELLER daggpunkt
  (sql/001_init.sql: bara surface_temp_c, air_temp_c, precipitation, rain, snow). De finns
  bara i `weather_observations`, som är händelsefiltrerat (DECISIONS #4). Ingen tät serie.
  (2) HÖJD lagras inte alls — ingen höjdkolumn finns i sql/; scripts/hojd-prov.ts hämtar
  höjderna live från opentopodata vid varje körning. Lapse-korrektionen (0,0065) finns bara
  i det provskriptet, aldrig i ingest, publish, snapshot eller motor.
  (3) Ingen VÅTBULBSFORMEL finns någonstans i koden — ordet står bara i TAVLA och STATUS.
  DET SOM FAKTISKT FINNS per segment: radarns nederbördsintensitet (radar_precip, 2 km-sampling
  mot 818-skelettet). Halva metoden är alltså verklig; andra halvan är obyggd.
  🚨 OCH baseline-halvan står på #51: vinterarkivet som säsongsbaselinen ska räknas ur
  skrivs nästan inte. Kort #45 kan inte bli sant förrän #51 är löst — den kopplingen är ny
  och gjordes inte när kortet skrevs.
  🗺️ "NORRLAND" DEFINIERAS INTE, och ska inte göra det (svaret på Bengts fråga 4/9):
  produkten är helt regionblind — inga läns-, latitud-, zon- eller gränsbegrepp finns i
  motorn, snapshoten eller ingesten, i någon av de tre portarna. Repots enda Norrland är
  `new Set([21,22,23,24,25])` i TVÅ MÄTSKRIPT (scripts/ankaranalys.ts:13, scripts/frost-prov.ts:16),
  där det bara delar statistik i "Nationellt" / "Norrland" och aldrig rör larmlogik.
  Det är rätt: en geografisk gräns vore fel på tre sätt samtidigt — packad snöväg i Dalarna
  i mars är lika normal som i Norrbotten (gränsen måste flytta med årstiden), en bar blöt väg
  i Kiruna i november är en avvikelse VÄRD att varna för som en Norrlandsspärr hade tystat,
  och baseline skiftar inom samma län (kustens E4 plogas till barmark, inlandsvägen ligger
  snöpackad). Per segment löser alla tre utan att någon ritar en linje på kartan.
  **Rösten är ett SEPARAT beslut (Axels kolumn, som #32):** om "snöfall framöver" eller
  "slask på vägen" blir egna rösthändelser avgör Axel; tystnadsdisciplinen gäller —
  ett slask-larm som har fel är värre än inget. Prognos av KOMMANDE snöfall är #16,
  fortsatt medvetet parkerat. *(Bengt + Claude, terminalen 3–4/9)*
  🔑 **Nyckel, sorterat 22/9 (kort #224):** vinterdata och #51:s mätning (nu i #209) — våtbulben döms på en vintermånad (Ä2, mars).
  🔎 **LÄST 25/9 (Bengts fråga ur systembilden — det enda lagret utan påbörjat bygge):** (1) invändningen "ingen tät serie av
  fuktighet och daggpunkt" är överspelad: ingest-live skriver luft, daggpunkt och fuktighet i varje kall eller blöt rad och sedan
  #353 en varm rad per station och halvtimme — våtbulb per STATION går att räkna ur arkivet (fullständigheten omätt). (2) Radardomen
  HÖLL 13/9 (DECISIONS #153) men tog aldrig ställning till #45-grinden, den fjärde frågan — andra gången grinden lämnats oöppnad
  (första 4/9). (3) S8/#52 klar 16/9 (v24) och lapse 0,63 fastställd (#226) — Ä2:s villkor är uppfyllt; ingen kod bär 0,63.
  (4) Obyggt: tröskeldokument, våtbulbsformel, skuggkolumn, facit ur SMHI:s observerade nederbördstyp (parametern overifierad).
  (5) Omätt: vilka värden Trafikverkets `precipitation` faktiskt bär i arkivet — kan bära typen direkt; Norges källa läser
  `precipitationType` men viker in sleet i `snow`. (6) Tidsfällan (bedömningen §4.2): Ä2 säger mars, men domen kräver en vinter
  med skuggkolumn — samma läge som #153 beslut 1 (DECISIONS #358). Frågan till Bengt står i §4.2.
  ✅ **STEG 1–3 GJORDA 25/9 (Bengts ja, DECISIONS #361).** (1) Trafikverket MÄTER typen: `rain` 144 908 rader, `sleet` 32, `snow` 7,
  `no` 177 888 på 30 dygn — vid en station är sorten en mätning, våtbulben behövs bara där ingen givare ser. (2)
  `docs/TROSKLAR-NEDERBORDSTYPEN.md` fastställt av Bengt (psykrometerekvationen — Stull föll på sin egen kontroll), grindarna
  NT-A–D. (3) `engine/src/nederbord.ts` + `scripts/grind-nt.ts`, spärrad till 1 mars 2027, allt ur arkivet och SMHI:s API — inget
  nytt jobb. ✅ **Knappen bevisad 25/9 13:07Z** (spärrkörning, run 36138915848): 43 SMHI-par, 596 rader i bandet, bara räkningar
  utskrivna. ✅ **Axel kontrasignerade dokumentet 25/9 (DECISIONS #362).** **Kvar:** domen 1 mars 2027 · steg 2 (vägytans
  tillstånd, #51/#209) med eget dokument.
  **Verify** *(kortgenomgången 3/10, DECISIONS #451)*: domen enligt `docs/TROSKLAR-NEDERBORDSTYPEN.md` fälld mot SMHI:s observerade nederbördstyp och väglagets klasser och bokförd i DECISIONS (1 mars 2027).

---

## 🟡 GÖRA (pågår just nu)

- [ ] 🔨 **#288 KARTSYNKEN — PROJEKTKARTAN UPPDATERAR SIG SJÄLV (I DRIFT, VÄNTAR PÅ AXELS NYCKEL — Claude, Bengts ja 3/10: *"ja till alla tre … bygg kartsynken och det innebär från nu att alla arbeten som axel och jag gör oberoende av varandra loggas som gjorda i projektkartan"*, DECISIONS #447)**: ↪ *Rubrikens "väntar på Axels nyckel" är överspelad 4/10 11:23, se (d).* ✅ (1) signalerna — edge function `byggsignaler` (App Store Connect: byggen, granskning, installationer och sessioner per bygge, testarna; förarsvaren per appversion) med tabellen och jobbet i `sql/041`, speglade i ärendet *📡 Byggsignaler*; rena delen prövad i `test/byggsignaler.test.ts` (sex tester, token verifierad mot den publika nyckeln) · ✅ (2) reglerna — fyra steg läses av kartsynken (iPhone-appen *på telefon*, rösten och korten *förarsvar i 0.3.10*, TestFlight *tolv testare*, App Store *släppt*), bara framåt · ✅ (3) `scripts/kartsynk.ts` med bokföringsvägen (varje commit på main sedan synkpunkten som inte rörde kartan) och `--tillatna` för sammanslagning utan "slå ihop"; självtestet fäller ett motprov utan framåt-spärren · ✅ (4) regeln i CLAUDE.md (PROJEKTKARTAN → Kartsynken, sessionens första steg). ✅ (5) **i drift 3/10** (Bengt: *"slå ihop 705 och ja till schemat, alternativ a"*): #705 sammanslagen (25ca67d), deploy 37110701962, `sql/041` med dbknapp 37110749430 (jobbet aktivt minut 23, RLS på), första körningen 11:23 skrev ärende #706 (förarsvaren: 29 i iOS 0.3.9; App Store Connect: nyckeln saknas), schemat *Halkvakt: kartsynken morgon och kväll* skapat 07:15 och 19:15. Provkörningen 11:24 fastnade på sitt första kommando och stoppades; den första synken gjordes i stället för hand (PR #707, `--tillatna` grön). Fynd på vägen: en worktree i scratchpad fäller på Windows sökvägsgräns (*Filename too long*), så uppgiften lägger den nu under `%TEMP%\hvks-<tid>`. **Kvar (planen till 100 %, §4.2):** godkännandena i schemats första riktiga körning (19:15) · ✅ md-vakten (Bengts val B): `md-vakt.yml` kör beslutsnumren, kortkartan och kartan på commits som bara ändrar .md; motprovet rött på kortkartan (37128743959, PR #710 stängd) · ✅ (d) **Axels nyckel på plats:** byggsignalerna läser App Store Connect sedan 4/10 11:23 (de första raderna i ärende #706), och kartsynken 5/10 bockade iPhone-appens telefonsteg ur dem ((22): 2 installationer, 6 sessioner; PR #751). ⚠️ **Fynd 5/10: tidpunkten var fel.** `forsta` i `anvandning()` (`supabase/functions/byggsignaler/signaler.ts`) tar starten på första datapunkten med en installation, och Apple gav en enda datapunkt för hela året, med start 2025-10-05, för alla byggen. Kartsynken skrev därför *"först 5/10 02:00"*. Beviset rättades för hand i #751, så Verify är inte uppfylld. ~~Lagningen väntar på Bengts ord (§4.2).~~ 🔨 **Lagad i koden 5/10** (Bengt: *"rätta datum"*): `forsta` är borttaget ur `anvandning()`, och kartsynken skriver *"sedd första gången"* ur signalens `forst_sedd`. Självtestet och `test/byggsignaler.test.ts` bär Apples riktiga form, en datapunkt för hela året, och båda föll före lagningen. ~~🔑 Kvar: deploy av `byggsignaler` på *slå ihop*~~ ✅ **I drift 5/10** (Bengt: *"slå ihop 753"*): sammanslagen som 9c47f73, deploy 37249116949 (byggsignaler från 9c47f73); timkörningen 01:23Z skrev ärende #706 utan forsta i alla fem installationsraderna, med forst_sedd kvar. 🔑 Kvar: nästa bygge bockat med rätt tid.
  ⚠️ **Schemat hängde 4/10 07:26–6/10:** körningen stod som *running* med sista aktivitet 8 s efter start, och 4/10 19:15, 5/10 07:15 och 19:15 startade aldrig. Loggen: första PowerShell-anropet kom aldrig tillbaka, som 3/10. Stoppad 6/10 på Bengts ord; nästa körning 6/10 07:26 är provet. ❌ **Provet föll 6/10:** schemat startade om körningen direkt när den hängande stoppades (03:45:58Z), och den hängde igen på sitt första PowerShell-anrop (sista aktivitet 03:46:21Z); 07:26 startade aldrig. Uppgiften kan inte köra utan någon vid datorn, troligen ett godkännande som ingen besvarar. ✅ **Schemat avstängt 6/10** (Bengt: *"stäng av schemat"*) och körningen stoppad; kartsynken körs av varje session vid start och listar öppna PR:er. Slås på igen när orsaken är känd. ✅ **Väg C 6/10** (Bengt): kartsynken körs av sessionerna, inte om natten; fler regelsteg i stället. Första: regeln `inlamnad:<version>` (klar när App Store-versionen nått *Waiting for Review* eller senare), satt på App Store-delens *Inskickat*. Fyra PR:er låg 3–4/10 utan ord under tiden (#733, #743, #747, #748), så kartsynken listar nu öppna PR:er vid start (Bengts nej 6/10 till att CI slår ihop kartgrenar, tillägg till DECISIONS #447). ~~🔑 (d) Axels nyckel till App Store Connect: Issuer ID, Key ID och `.p8`-filens innehåll som `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY` i Supabase → Edge Functions → Secrets (aldrig i repot).~~ **Verify:** Axel laddar upp ett bygge, och kartans steg bockas med App Store Connects tidpunkt utan att någon skrivit något.
- [ ] 🔨 **#284 APPENS NYA SKINN — DESIGNÖVERLÄMNINGEN V2 (BYGGT, SLÄPPT AV AXEL 3/10 — Claude, Axels order 2/10 18:46; DECISIONS #443, #444, PR #698; iOS 0.3.10 (22), Android 0.3.10 (22))**:
  varningskorten A–L med lägesetikett, vägskylt, gränsskylt och rådruta; gammal data M–N; Redo efter tur; På vakt; inställningar i
  två nivåer; introduktionen (iOS); sex ikoner; logotypen med "!"; 3D-socklarna renderade ur designens CSS. iOS och Android lika,
  Androids "Uppfattat" och källrad borta. Rösten oförändrad.
  ✅ (1) motorn bär `Alert.step` — TS 235 tester, `ios-engine` och `android` gröna på grenen (workflow_dispatch) · ✅ (2) kortets innehåll
  i `WarningCard` (Swift + Kotlin) med samma tolv fall i båda testsviterna, gröna · ✅ (3) Android: alla skärmar byggda, `android`
  37044258124 grön, fotostudion visar Redo, Inställningar och fyra undersidor (i produktboken) · ✅ (4) iOS: alla skärmar skrivna och
  granskade av en fristående läsning (inga kompileringsfel funna; fyndet att körläget inte öppnades från Inställningar-fliken rättat) ·
  ✅ (5) produktboken och `docs/APPEN.html` omskrivna.
  ✅ (6) **iOS byggt i Axels Xcode 2/10 23:16 och provat i simulatorn (iPhone 16e, iOS 26.1): "It works as intended"** (Axel). Första
  starten fastnade på Xcodes debugger ("Waiting to attach") — appen öppnad från hemskärmen. Byggnumret höjt till 0.3.10 (22) på båda.
  ✅ (7) **0.3.10 (22) släppt av Axel 3/10** (Bengts besked); projektkartan bokförd samma dag: olycksläget (A3) grönt, iPhone-bygget
  klart för iPhone-appen och för rösten och varningskorten. Ingen har ännu bokfört (22) sedd på en telefon.
  **Kvar:** (a) iOS-skärmbilderna till produktboken; kort F, G, H ses först vid en riktig allvarlig olycka · ~~(b) artefakten *Halkvaktens app* republiceras ur `docs/APPEN.html` från
  ägarens konto~~ ✅ republicerad 3/10 ur repokopian (PR #703 och detta varv) · (c) Androids introduktion i fyra sidor är inte byggd (Android
  har trappan i MainActivity; designen förutsätter iOS dialoger) · (d) Kort #219/#280: byggnumret höjs i samma commit som sista
  ändringen före arkivering. **Verify:** ett iOS-bygge visar kort F/G/H vid en allvarlig olycka och kvittot på Redo efter en tur.


---

## 🟢 KLART (senaste vinsterna)

- [x] ✅ **#293 RADARFELSLARMET — ett radarfel syns som en issue, inte bara i vakthundens korskontroll (KLART 6/10 — Claude, Bengts *"bygg larmet"* 6/10, DECISIONS #462)**: `ingest.yml` kör radarpiloten med *continue-on-error* (DECISIONS #60), så ett stående radarfel gjorde jobbet grönt och syntes bara i vakthundens korskontroll, som larmar först när stationerna rapporterat regn. Nu: faller radarsteget skapar eller kommenterar jobbet en issue med etiketten `radar` (samma mönster som arkivbackup.yml), och nästa lyckade radarsteg stänger den. Knappen har ett provläge (`prov=radarfel`) som fäller steget med flit. **Verify:** en körning där radarsteget faller skapar issue `radar`, och nästa lyckade stänger den. ✅ **Bevis:** provkörningen 37415500151 (04:49Z, `prov=radarfel` på grenen) fällde radarsteget med flit, jobbet blev grönt och larmsteget skapade issue #765 med etiketten `radar`; nästa lyckade radarsteg på main stänger den. ✅ **Stängningen bevisad 05:11Z:** första pulsen på main efter sammanslagningen (34b3631, körning 37417266457) kommenterade och stängde #765 utan att någon rörde den.
- [x] ✅ **#289 LÄSARKONTRAKTET I SWIFT OCH KOTLIN — MOTORN I TRE SPRÅK TILL 100 % (KLART 4/10 — prövat på Macen av Axel; Claude, Bengts ja 3/10: *"ja till a och b"*, DECISIONS #448)**: ✅ (1) Kotlin: `SnapshotRepo.toHazards` prövas mot `engine/fixtures/lasarprov.json` i appens testmål (`LasarkontraktetTest.kt`, `org.json` som testberoende som i `:engine`); id läses som text (`dev:4711`) och farorna i referensens ordning. android 37129803970 grön; motprovet (bearing null ⇒ 0) rött i 37129845788 · ✅ (2) Swift: tolkningen flyttad ur appens `SnapshotRepo` till `HalkvaktEngine.SnapshotReader`, prövad i paketet (`LasarkontraktetTests.swift`, Swift Testing — körs på Linux bredvid de 13 XCTest-fallen). ios-engine 37129806868 grön; motprovet (gamla #210-raden) rött i 37129843583 med *"dev:d2: road — väntade <null>, fick \"<null>\""* · ✅ (3) provfilen: `djur` (#318) och kamerans `limit`, som Swift inte längre läser (#448 b); TS-testet räknar saknat och null som samma utfall. ✅ (4) **Axel på Macen 4/10 11:11–11:13** (main e48cb78): appen byggd i Xcode — *Build Succeeded*, iPhone 16e — och `swift test` i `ios/HalkvaktEngine` grönt på Apples Foundation: XCTest 13 fall, 0 fel; Swift Testing *LasarkontraktetTests* godkänd. **Verify:** Axels körning grön ⇒ delen *Motorn i tre språk* grön.
- [x] ✅ 📷 **#260 BILDFACIT I HELA LANDET — V1, V2, V3 och lagringslarmet** (Bengts ja 26/9: *"ja till V1–V3 och larmet vid 800 MB"*,
  DECISIONS #380, `docs/UTREDNING-FARTKAMEROR-2026-09-26.md` §7). Facitbilderna följde skuggrutterna (68 av 744 kameror) och 94 % togs vid
  fartkameravarningar. (V1) ingen facitbild vid fartkameralarm; (V2) varje timme bilden vid väglagskameran närmast varje aktuell frysrisk
  i hela landet — i dagsljus varje timme, i mörker en per kamera och natt, tak 150 om dygnet; (V3) två stickprov i timmen vid kalla
  stationer utan larm, i dagsljus; vakthunden larmar vid 800 MB av 1 024 i lagringen. Inga Actions-minuter, inget betalbeslut.
  Verify: efter deployen (1) skuggmotorns svar tar inga nya bilder vid fartkameralarm, (2) timkörningen svarar `ok` och sparar V2- eller
  V3-bilder med timmen i sökvägen när det finns kyla, eller säger i svaret varför inte, (3) lagringsprovet larmar och den skarpa vakthunden
  skriver lagringsraden, (4) efter sju dygn står bilder och MB per dygn i bedömningen, under taket.
  🔨 **BYGGT 26/9:** V1 i `skuggmotor/main.ts` (bunten omgjord), V2/V3 i `supabase/functions/kamerafacit` (urvalet i `urval.ts`, fem prov i
  `test/kamerafacit.test.ts`), timjobbet `sql/039` (minut 17), vakthundens lagringskontroll; bildkontrollen räknar bara larm som inte är
  fartkameror; kontaktarket läser timvägen; facitradien 15 km i kontraktsgrinden (motprov: 14 km fäller). ~~🔑 Kvar: Bengts *"slå ihop"*,
  deploy av tre funktioner, sql/039 via dbknapp, beviset.~~
  ✅ **I DRIFT SEDAN 26/9 08:25Z — läst i Actions-loggarna 28/9, kortet hade inte fått veta det.** PR #622 mergad 08:22 ·
  deploy `kamerafacit` 08:23 (körning 36229634732), `skuggmotor` 08:24 (36229638425), `vakthund` 08:24 (36229641777), alla med
  *bundlarna i synk med källorna* · `sql/039` 08:25 (dbknapp 36229707252): `halkvakt-kamerafacit`, `17 * * * *`, aktivt, pekar
  på funktionen · kamerafacitprov `?torrt=1` 08:25 ⇒ 200 `ok: true` · **Verify (3) första halvan:** lagringsprovet 08:26 ⇒
  *"LAGRINGEN ÄR 26 MB"*, issue #623 öppnad 08:27:05, stängd av nästa gröna timkörning 09:07:50.
  ⏳ **Kvar:** (1) läs att skuggmotorn inte tagit någon ny bild vid fartkameralarm sedan 08:24 · (2) läs timkörningarnas svar —
  med 0–1 kalla stationer av ~1 300 väntas svaret *varför inte*, inte bilder; frosten styr, inte deployen · (4) sju dygn med
  bilder och MB per dygn i bedömningen, tidigast 3/10.
  ✅ **(1) och (2) lästa 26/9 (bokfört 1/10, DECISIONS #380):** skuggmotorn 08:02Z (före deployen): ett fartkameralarm ⇒ 1 bild, 886 ms; 08:32Z (efter): ett fartkameralarm ⇒ 0 bilder, 0 ms, skälet *bara segment- eller fartkameralarm* (dbknapp 36230218670). Bilden 09:02Z kom från en vattenplaningsvarning på E4 Sundsvall→Umeå — avsett, TROSKLAR-VATTENPLANING §2 (36232395271). Timkörningen 09:17Z: 200, `ok`, `faror 0`, `kalla_stationer 0`, pg_cron *succeeded* (36232357646). **(3) andra halvan:** det gröna varvet 09:07Z skrev *lagring: 26 MB av 1 024 (larm vid 800 MB)* och bildkontrollen *skuggans svenska larm 12 h: 0* — inget falsklarm efter V1. Kvar: (4) 3/10, och första V2/V3-bilden vid kyla.
  ✅ **KLART 3/10 — (4) sjudygnsläsningen** (dbknapp 37139942663, bedömningen §6.2): 26/9–3/10 17:17Z 822 bilder och 18,1 MB — V2 742, V3 5, skuggvarvet 75; högst 3,74 MB/dygn, V2-taket 150 nått 27/9 och 30/9 och aldrig passerat; 177 av 177 timkörningar *succeeded*; hinken 1 783 bilder, 39,8 MB av 1 024. **(2) var redan uppfyllt:** V2 har sparat bilder med timmen i sökvägen varje dygn sedan 26/9 — *"0–1 kalla stationer ⇒ inga bilder"* ovan byggde på ett enda dagsljussvar (09:17Z, 0 frysrisker), och snapshotens frysrisker finns nattetid redan i september. **Verify uppfylld:** (1) och (3) 26/9, (2) och (4) 3/10 ⇒ delen *Kamerafacit i hela landet* grön. Vad bilderna visar läses i mars (#335, kort #209/#231).
- [x] ✅ **#292 DATAVAKTERNA SÄGER TILL — VAKTHUNDEN LÄSER PUBLICERINGENS NOTER** (Bengts fråga 3/10). Givarvakten, radvakten, karantänen och den långsamma vakten tystar trasiga stationer i varje publicering (`publish/snapshot-core.ts`), men det de gör syns bara i publiceras svar, i fältet `notes`, som pg_net lägger i `net._http_response` — och där läser ingen. Kan en vakt inte läsa sin historik skriver den *"… ej läsbar … — ingen station i karantän"* och publicerar ändå: en trasig givare får då tala igen, tyst. **Plan:** (1) *en ren läsare* `vakthund/datavakter.ts` som tar publiceras senaste svar och ger tystade stationer och vakter som inte kunde läsa, prövad i `test/datavakter.test.ts` · (2) *vakthunden* skriver raden `datavakterna: karantän N (…) · långsam vakt M (…)` varje timme, och larmar när samma vakt har varit oläsbar i de tre senaste publiceringarna (en enstaka miss är fail-soft med flit) · (3) *provet* `?datavaktprov=1` via databasknappen visar larmvägen · (4) deploy av vakthunden efter jämförelse mot main, och beviset är raden i nästa timkörning. ✅ **KLART 3/10 (Bengts ja, DECISIONS #452):** PR #726 (01f1ade); läsaren grön i ci 37137764481, motprovet (en enda miss larmar) rött i 37137793266; vakthunden deployad 37138526711 efter jämförelse mot main; datavaktprov 37138573277 ⇒ `problem` *Datavakterna kan inte läsa: karantän — 3 publiceringar i rad* och raden *datavakterna: karantän 3 (1713, 2132, 2346)*; issue #728 öppnat 16:55:36Z och stängt av timkörningen 17:07:56Z. **Verify uppfylld:** vakthundens rad visar de tystade stationerna, och provet gav ett larm som stängdes av nästa gröna körning.
- [x] ✅ **#291 ARKIVEXPORTEN LÄSES TILLBAKA — INNAN RADERINGEN BÖRJAR** (Bengts fråga 3/10, DECISIONS #334). Exporten packar varje gallrat dygn av `weather_observations` till hinken `arkiv` (30 dygn 24/8–24/9, 247 017 rader, 4 MB packat) och raderar det äldsta dygnet ur databasen en gång per natt när databasen passerar 350 MB. Veckodumpen läses tillbaka varje söndag, men exportfilerna har aldrig lästs tillbaka — och *"byggs före mars"* (sql/034) räcker inte: 266 MB 3/10 (dbknapp 37135239114; 190 MB 22/9 ⇒ ~6,9 MB/dygn netto) ⇒ raderingen börjar vid 350 MB runt 15/10, vakthundens larm och Pro-gränsen 400 MB runt 22/10, 500 MB runt 6/11 utan radering. **Plan:** (1) *läsaren:* `arkiv_aterlas(text)` i en ny migration läser filens format (rubrikrad + en JSON-lista per rad, lon/lat ⇒ geom) tillbaka till `weather_observations`, `ON CONFLICT DO NOTHING` · (2) *rundresan i CI:* ett dygn exporteras med `arkiv_dygn`, raderas, läses tillbaka och jämförs rad för rad (EXCEPT åt båda hållen) i `test/integration.test.ts`; motprov · (3) *en riktig fil:* ett prov i `arkivexport` (`?aterlasprov=1`, via databasknappen) hämtar det äldsta exporterade dygnet ur hinken, läser det i en tillfällig tabell och jämför med databasens rader — inget skrivs · (4) *marsvägen* i RUNBOOK: veckodumpen plus de raderade dygnen i en PostGIS-container. ✅ **KLART 3/10 (Bengts ja, DECISIONS #450):** sql/042 (arkiv_rader, arkiv_aterlas, arkiv_jamfor) körd med dbknapp 37136484582; rundresan grön i ci 37136295393, motprovet (läsaren tappar vinden) rött i 37136314024; arkivexport deployad 37136519847 och aterlasprov 37136572674 mot 2026-08-24 ur hinken: sha lika, 4 711 rader i filen = databasen = bokföringen, 0 bara på ena sidan; marsvägen i RUNBOOK. **Verify uppfylld:** rundresan grön i CI med motprovet rött, och provet på en riktig fil ger noll skillnad, före första raderingen.
- [x] ✅ **#290 LIVEMOTORNS PROV — SPEGELN OCH UPSERTERNA I CI (KLART 3/10 — Claude, Bengts ja 3/10, DECISIONS #449)**: ✅ (1) spegeln: `KEEP`/`ARCHIVE` och beslutet bor i `supabase/functions/ingest-live/situationspolicy.ts`, som livemotorn och `ingest/sources/situations.ts` läser — de två kopiorna finns inte längre; motprov (djuren ur KEEP) rött i 37132350144 · ✅ (2) upserterna: skrivningarna oförändrade i `skriv.ts`, prövade av `skriv_test.ts` med Deno mot PostGIS i `livemotorn.yml` (fem fall: olyckan och omkörningen, gravstenen, typerna, väglaget, vädrets halvtimme och bakåtvakt) — grönt i 37132251020; motprov (bakåtvakten bort) rött i 37132348168. ✅ (3) deployad och bevisad: deploy 37132581950 (348ca91) 17:15; dbknapp 37132851110: pg_cron-svaren 17:16–17:19 alla 200 ok:true (situations 2, weather 5, roadconditions 11), kursorerna synkade 17:19:01. **Verify:** uppfylld — kursorerna rör sig efter deployen ⇒ delen *Livemotorn* grön.
- [x] ✅ **#259 REGLAGET "VARNA PÅ AVSTÅND" LOVAR MER ÄN MOTORN GÖR** (fynd 26/9 under kadenstestet, DECISIONS #373). Motorn
  talar vid `min(leadMaxM, max(400 m, fart × 30 s))` (`engine.ts:110`), och reglaget sätter bara `leadMaxM`. I 140 km/h blir det
  högst 1 167 m, i 90 km/h 750 m — så *Tidigt — 3 km* (iOS) och 5 km (Android) gör ingen skillnad på en svensk väg; bara ett
  värde UNDER fart × 30 s ändrar något. DECISIONS #263 visste att 3 000 m nås först över 360 km/h, men inte att reglaget därmed
  lovar något. Produktboken säger *"hur långt i förväg rösten ska tala"*. Två vägar: skriv reglaget som ett tak (*Senast …*) med
  spannet som faktiskt verkar, eller låt reglaget styra tiden (sekunder) i stället för metern — det senare ändrar vad rösten
  säger och kräver vektorer. 🔑 Bengts och Axels val (§4.2). Verify: reglagets text och spann säger vad motorn gör, på båda
  plattformarna, och produktboken likaså.
  🔨 **VÄG (a) BYGGD 26/9** (Bengts ja, DECISIONS #374): *Längsta förvarning*, 400–1 200 m på båda, 1 200 från början, texten säger 30
  sekunder före; körläget säger *som längst* i stället för *inom 3 km*. Två kontrakt i kontraktsgrinden. android.yml 36219380753 grön på grenen (JVM-prov, emulator, release-AAB); fotostudions shot-3 visar Längsta förvarning 1,2 km, Kortare — 400 m / Fullt — 1,2 km och texten om 30 sekunder.
  🔑 Kvar: iOS-bygget 0.3.9 (17) hos Axel (första kompileringen) — sedan stängs kortet.
  ↪ **Flyttat 26/9 från *Bengt*** (femma åtta, DECISIONS #377): nästa steg är Axels bygge 0.3.9 (17).
  ↪ **1/10 (DECISIONS #423):** bygget hos Axel är numera **(19)** (`docs/TILL-AXEL-BYGGE-19.md`); (14)–(18) arkiverades aldrig, så (19) blir det första bygget som bär ändringen.
  ✅ **KLART 3/10 (TAVELREGELN 3):** Verify uppfylld på båda plattformarna och i produktboken — *Längsta förvarning* 400–1 200 m, *"Du kan korta det, aldrig förlänga"*: Android i android.yml 36219380753, iPhone i 0.3.9 (19), första bygget med reglaget, i Kompisarna 1/10 (PRODUKTBOK.md:111–112, 568). Bara provet i bil återstår, och det står på delen *Reglaget för förvarningen* i projektkartan.
- [x] ✅ **#287 PROJEKTKARTAN FINNS — TITTA PÅ DEN** (Bengt 3/10, DECISIONS #446). Navet över hela bygget: https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8. ✅ **KLART 3/10:** sidan delad med länk (artefakten visar *Anyone with the link* från 3/10), och Axel har tittat — Bengts besked 3/10: *"han har tittat"*. Från samma dag bokför kartsynken Axels byggen och commits i kartan (DECISIONS #447, kort #288).
- [x] ✅ **#286 PROJEKTKARTAN — MÄT DEL FÖR DEL MOT KODEN** (Bengts ja 3/10, DECISIONS #446). Den grova versionen satte läget i stora drag ur stomdokumenten, tavlan och beslutsloggen. Nästa varv: varje del mäts mot koden, de tretton tröskeldokumenten och integrationskartan, och grönt står bara kvar med ett bevis som går att följa. Sedan pekar stomdokumentens egna läge-rader på kartan i stället för att föra eget läge, och kortkartan kan gå genom delarna. Verify: varje grön del har ett följbart bevis, och `scripts/projektkartan.ts --check` är grön. ✅ **KLART 3/10:** alla 75 delar mätta mot koden med byggsteg och bevis (sju agenter, tre påståenden stickprovade: DECISIONS #433, vakthundens gränser, gallringsjobbet); procenten räknas ur stegen, viktad 1–3; stomdokumenten pekar på kartan med avsnittet *Läget i projektkartan*; `projektkartan.ts --check` grön. Kortkartan genom delarna gjordes inte: kopplingen kort→avsnitt står kvar i kortkartan.json.
- [x] ✅ **GENOMLYSNING 2 AV DE FEM STOMDOKUMENTEN — KLART 1/10 (DECISIONS #422)**: STOMREGELN bekräftad av Bengt i en andra session; mätningssidan (7.7, 9, 8.1), appsidan (*Vad appen inte gör*), systembilden (oljan, taket), bedömningen och kartans läge-rader stämda mot #419–#421.
- [x] ✅ **#275 FÖRSPRÅNGETS TAK — KLART 1/10 (DECISIONS #419)**: försprånget kläms till motorns 3 000 m, reglaget tar bara grundvarningen; sammanslagen i PR #660 (969610c), skuggmotorn deployad (36877830446), `ios-engine` grön, systembilden republicerad. Tavlan 36 → 35.
- [x] ✅ **#274 PROJEKTSIDAN TILL TRAFIKVERKET — *Halkvakt och kuvösen* — SKAPAT OCH STÄNGT 1/10 (DECISIONS #418)**: Bengts idé 1/10,
  när VViS Förvaltning svarat på kuvösens uttag: *"en beskrivning av vårt projekt … lite vad Halkvakt är och vad kuvösen har för avsikt att göra i
  jämförelse med de mätningar som vi gör nu i trösklar … som en artifact"*. Sidan: vad appen är och inte gör (dataflödet, de fyra principerna),
  hur vi prövar i dag (tröskeldokument daterade före koden, skuggan och arkivet, grind per del, domkalendern), vad kuvösen svarar på som
  dagens mätningar inte kan (helheten, marginalnyttan, svar i november i stället för mars — om uttaget kommer i oktober), jämförelsetabellen,
  uttagets specifikation (samma som svaret till Micke Wallin) och vilka vi är. Inga opublicerade tröskelvärden — sidan är extern.
  Källa `docs/HALKVAKT-OCH-KUVOSEN.html`, artefakt https://claude.ai/artifact/CrrMKX7vcRcXHiqqYGjs9S (v1). **Privat tills Bengt delar den** (Share-menyn);
  Bengt avgör om länken går till Trafikverket och Skyltfonden. Ändras sidan: repokopian först, republicera till samma URL i samma commit.
- [x] ✅ **#243 VAKTHUNDENS ARKIVGRÄNS ÄR FÖR SNÄV — issue #528 var ett falsklarm — STÄNGT 1/10 (DECISIONS #417)** (fynd 24/9 på Bengts fråga *"vad betyder detta"*).
  Checken *livemotorns effekt* larmar när `situation_archive` inte rörts på 30 min, men arkivet skrivs bara när Trafikverket
  ändrar något: mätt 24/9 04:12Z — 4 gluggar > 30 min senaste dygnet (största 102 min), **32 på sju dygn, medel 54 min, största
  128 min**. Livemotorn svarade varje minut hela natten (360 av 360 cron-körningar, 61 svar per timme med innehåll), deviations
  och road_conditions 1 min färska. Issue #528 (03:07Z) stängdes av vakthunden själv 04:07Z. Förslag: gränsen till 3 h, eller
  mät att funktionen SKREV (deviations färska) i stället för att arkivet ÄNDRADES. 🔒 NYCKEL: Bengts ja på gräns eller mått.
  Verify: sju dygn utan falsklarm ur den checken, och ett riktigt stopp (kort #222:s fall) fångas fortfarande.
  🔨 **Bengts ja 24/9 (DECISIONS #343):** gränsen 30 → 180 min, kommentaren rättad. Kvar: deploy, sedan sju dygn utan falsklarm ur checken.
  📏 **Läst 24/9 15:09Z:** i drift: vakthundens körning 15:07Z skriver *situation_archive rörd för 3 min sedan (gräns 180)* och inga problem. Kortet stängs efter sju dygn utan falsklarm.
  ↪ **1/10: STÄNGT MED BEVIS** (DECISIONS #417). Sedan deployen 24/9 15:09Z har checken *livemotorns effekt* inte larmat en enda gång: enda
  vakthundsissuen sedan dess är #623 (26/9, lagringslarmet — en annan check), och dess egna mätrader säger *situation_archive rörd för 4 min
  sedan (gräns 180)*. Gluggarna lästa med db-knappens läsläge på main (körning 36831247108, fönster 24/9 07:41Z–1/10 07:35Z): **0 gluggar
  > 180 min, största 01:26, 41 gluggar > 30 min** — den gamla gränsen hade larmat 41 gånger på en vecka, den nya kunde inte larma. Sju hela dygn
  fylls 15:09Z i dag; avläsningen täcker 6 dygn 16 h och visar vad checken såg varje minut, inte bara att issues saknas. Andra Verify-ledet
  (ett riktigt stopp fångas): checkens logik är oförändrad utom talet (`LIVEMOTOR_EFFEKT_MIN = 180`, vakthund/index.ts rad 865), så #222:s fall —
  cron säger succeeded, pg_net köar, arkivet står still — larmar fortfarande, efter tre timmar i stället för trettio minuter. Priset är 2,5 h
  längre till upptäckt. Inte provat skarpt: det kräver att livemotorn stoppas, och det görs inte för ett bevis.
- [x] ✅ **#152 KASSAVAKTEN — check 8 i vakthunden: larmar innan Actions-taket slår i — STÄNGT 1/10 (DECISIONS #417)** (Bengts order
  13/9: "Kan man ha någon mätning på taket så man vet när man närmar sig gränsen. Automatisk alltså").
  💰 **RÄTTAD 13/9 (DECISIONS #160, Bengts order "gör kort 152 nu"):** prognosen räknade på
  månad-till-datum, och i det snittet låg fem flöden som lades ner 8–9/9 (`ingest-fi`, `-no`,
  `-dk`, `publish-map`, `regn-30`). Vakten sa **21 september**; uppmätt verklig takt var
  **232 min/dygn** senaste dygnet och **180** de två senaste, mot snittets 311 — och driften ensam
  (ingest + grannar + healthcheck) är **81**, resten är bygge. **Förbrukningen läses nu ur
  månadstalet, prognosen ur en SLÄPANDE takt** över de två senaste kompletta dygnen; taket flyttas
  därmed till **26 september** på verkliga tal. Båda talen står i varje larm — månadssnittet låser
  fast en takt som kan ha upphört, det släpande är känsligt för en byggskur — och avviker de mer än
  25 % säger larmet **TAKTEN ÄNDRAS**. Kostar noll extra API-anrop: dygnsloopen fanns redan.
  🔨 BYGGD 13/9, väntar på deploy + bevis. Bakgrunden är 5/9: minuterna tog slut mitt i drift, appen
  serverade 66 h gammal data, och det upptäcktes bara för att en människa råkade titta. Taket har HÅRT
  STOPP, så det är en vägg och inte en försämring. Ligger i vakthunden (Supabase, noll Actions-minuter)
  med samma nyckel som mätvakten redan använder för att läsa Actions-API:t.
  RÄKNINGEN: körningar sedan den 1:a, avrundade uppåt per körning, minus gratispotten 2 000 min,
  gånger 0,008 USD. Larmar när (a) faktisk förbrukning passerat 70 % av taket, eller (b) prognosen når
  taket före månadsskiftet — och det är (b) som är poängen: "i dagens takt slår taket i den 25:e" går
  att agera på, "62 % förbrukat" gör det inte.
  TVÅ KÄNDA FEL, utskrivna i varje larm i stället för dolda: taket är KONTOOMFATTANDE men vi ser ett
  repo, och GitHub avrundar per jobb medan vi avrundar per körning (android.yml har två jobb). Talet är
  därför ett GOLV, aldrig fakturan. Exakta siffran kräver kontobehörighet ⇒ Axels handgrepp, eget kort
  om vi vill ha den.
  KÖRS 05/11/17/23 UTC, inte varje timme: en räkning är ~30 API-anrop och budgeten rör sig 1–2 USD/dygn.
  FÄRGAR ALDRIG DRIFTVAKTHUNDEN RÖD (egen etikett `kassavakt`, egen öppna/uppdatera/stäng-cykel) — samma
  regel som mätvakten: rött ska betyda "kedjan till appen är bruten NU".
  ✅ ARITMETIKEN BEVISAD fristående mot sex handräknade fall (husets konvention för vakthundslogik, som
  kadensTimmar): gratispotten ej förbrukad ⇒ 0 USD; 6 375 min ⇒ exakt 35,00; 202 min/dygn ⇒ taket nås
  INTE i september; 261 min/dygn ⇒ taket slår i 25/9; noll minuter ⇒ inget datum; första halvtimmen i
  månaden ⇒ ändlig takt. Testet checkades medvetet INTE in: det hade blivit en andra kopia av tre
  trösklar och utlöst kontraktsgrinden för noll nytta — konstanterna finns i EN fil.
  Verify: deploy-supabase grön, sedan `?kassaprov=1` ⇒ issue med etiketten `kassavakt` som stängs av
  nästa körning under gränsen. Och en riktig kassarad i nästa vakthundskörning 05/11/17/23.
  ✅ **KLAR OCH BEVISAD 13/9 02:08.** Deployad (vakthund, 705 kB) och larmvägen prövad skarpt med
  `?kassaprov=1` via DB-knappen ⇒ **issue #210 med etiketten `kassavakt`**. Den larmade på EGEN grund,
  inte bara på provraden: *"I dagens takt (311 min/dygn) slår taket i den 2026-09-21."*
  **FÖRSTA SKARPA MÄTNINGEN, och den är värre än fönsterskattningen:** 3 761 min sedan 1/9 över
  2 798 körningar ⇒ debiterat 1 761 min = **14,09 av 35 USD**, takt **311 min/dygn**, prognos för
  månaden **59 USD**. Fönstermätningen 12/9 gav 202 min/dygn — den fönstret var alltså lugnare än
  månadssnittet, och 31–40 USD var för lågt räknat.
  🩹 **TVÅ FEL AV MIG PÅ VÄGEN, båda bokförda för att de är lärorika:**
  · Jag dispatchade deploy-supabase UTAN `funktion` och fick standardvärdet `publicera`. Jobbet blev
    grönt, jag läste grönt som "rätt sak deployad", och första provet kunde inte fungera. Läxan är den
    gamla: en grön körning bevisar att NÅGOT gick bra, inte att det var det man tänkt.
  · Första skarpa körningen räknade exakt 1 000 körningar och rapporterade 94 min/dygn — halva
    sanningen, utan felmeddelande. `/actions/runs` paginerar bara till 1 000 träffar. Lagat: räkningen
    går ett dygn i taget, och dygnsloopen är självtestad. Läxa i CLAUDE.md.
  · (Ett tredje, ofarligt: `kassaprov` lades i skriptets vitlista men inte i dbknapp.yml:s if-sats, så
    en körning föll tyst i migrera-grenen och körde om gallringsmigrationen. Idempotent, inga rader
    rörda, bevisraderna visade alla tio cron-jobb intakta. Villkoret är nu inverterat så att det bara
    finns EN lista. Läxa i CLAUDE.md.)
  📏 **AVLÄST 14/9 17:08 (kassavaktens egen rad, issue #210):** förbrukat sedan 1/9 **4 026 min över
  3 006 körningar** ⇒ debiterat 2 026 min = **16,21 USD av taket 35**. Släpande takt **200 min/dygn**
  (oförändrad sedan 05:08), månadssnittet sjunker (301 → 294). Takdatum **26/9, oförändrat sedan i
  morse** — det går alltså inte åt fel håll. **Dygnets EGEN takt är lägre än båda:** 05:08 → 17:08
  (12,0 h) gav 50 debiterade min över 38 körningar ⇒ **100 min/dygn**. Raderna 05:08, 11:08 och 17:08
  finns alla; vakten fyrar som den ska.
  📏 **15/9 04:45:** raden 23:08 finns — förbrukat **4 058 min över 3 025 körningar** ⇒ debiterat
  2 058 min = **16,46 USD av 35**. Släpande takt 200 oförändrad, månadssnittet ned 294 → 291,
  takdatum **26/9 oförändrat**. Nattens egen takt 17:08 → 23:08 (6,0 h): 32 min ⇒ **128 min/dygn**.
  05:08-raden hade inte kommit när avläsningen gjordes (vakthunden fyrar 05 UTC).
  🔍 **OMRÄKNAT PER JOBB 18/9 (Claude, alla 3 359 körningar sedan 1/9):** GitHub debiterar varje JOBB uppåt till hel
  minut; kassavakten räknar varje KÖRNING på `updated_at − run_started_at`. Felet går åt två håll: android.yml:s två
  parallella jobb räknas som ett (16/9: 55 min mot 105), och driftens korta jobb räknas med körningens efterslöp
  (healthchecks jobb tar 58 s men körningen 63 s ⇒ 2 min i stället för 1). Över månaden: **4 530 min mot 4 369 per jobb**,
  alltså 161 min för mycket — talet är inget golv, som larmtexten säger. Kvar till taket per jobb: cirka 2 000 min;
  driften ~74 min per dygn ⇒ bygget högst ~80 min per dygn till 1/10 (bedömningen §0b). GitHubs eget API för debiterbar
  tid svarar 0 sedan faktureringen lades om, så Billing är enda facit (Axel, §4.2). **Ingen ändring nu:** att räkna per
  jobb kostar ett API-anrop per körning (~180 per dygn) och skulle förlänga vakthundens redan för långa timme (#201) —
  rättas i så fall ihop med #201, med dygnssummor som sparas.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** 1/10 — ingen körning stoppad i september och issue #210 stängd av kassavakten; Axels Billing-avläsning.
  ↪ **1/10: STÄNGT MED BEVIS** (DECISIONS #417). Nyckeln uppfylld i alla tre led: (1) ingen körning stoppad i september — `ingest` gick varje hel timme
  30/9 00:11Z → 1/10 07:11Z (körning 881–910, alla gröna), hårdstoppet slog aldrig i; (2) issue #210 stängd av kassavakten själv 1/10 05:07Z
  (*"Stänger — god marginal igen."*) efter 81 rader sedan 13/9; (3) Axels Billing-avläsning 27/9: 17,84 USD i budgetfönstret från 13/9 (#381),
  bokförd i bedömningen §0b. Septembers slutrad (30/9 23:07Z): **6 348 min över 4 718 körningar ⇒ 34,78 av 35 USD** i vaktens räkning (1,8 % över
  per-jobb-regeln enligt omräkningen 27/9), släpande takt 95 min/dygn de sista dygnen — marginalen var 0,22 USD, så *inga app-byggen till 1/10* var
  nödvändigt, inte försiktigt. Oktober börjar på 22 min. Vakten står kvar i drift (05/11/17/23 UTC); räkneregeln per jobb är fortfarande en öppen
  rad i bedömningen §4.2 (rättas ihop med #201, om alls).
- [x] ✅ **#273 GENOMLYSNING AV DE FEM STOMDOKUMENTEN — SKAPAT OCH STÄNGT 1/10 (STOMREGELN, DECISIONS #415/#416)**: Bengts order
  1/10 — mätningssidan, appsidan, systembilden, bedömningen och integrationskartan är facit och kontrollpunkter; varje ändring stäms
  av mot dem och rättelserna förs in löpande (CLAUDE.md STOMREGELN, sessionsprotokollets steg 4). Genomlysningen: alla fem lästa mot
  koden och besluten #399–#414 och uppdaterade — *Halkvaktens mätningar* (nytt 30/9-block i 5.1, värdevakten 1/10, db-knappen,
  domkalendern), *Halkvaktens app* (byggena (14)–(18) oarkiverade, kända brister #226/#248/#258/#259, Skyltfonden skickad),
  *Halkvaktens systembild* (L4 med vägpunktsgrindens fall, reglagets tak, vattenplaningens dom), bedömningen (läget (8), §0b-rad,
  §5.2–5.5) och kartan (R21–R26, #416). Repokopiorna omdöpta till `docs/MATNINGAR.html`, `docs/APPEN.html`,
  `docs/SYSTEMBILDEN.html` och republicerade till samma URL:er.
- [x] ✅ **#267 FYND UNDER GENOMGÅNGEN AV SKUGGMOTORN 29/9 — STÄNGT 1/10 (DECISIONS #414)** (inga beslut, bara rättelser). Bedömningen §5.1 säger att S2 och S3 är
  obyggda och att försprångets regel är obyggd — S2 byggdes 24/9 (#341) och försprånget körs i skuggan sedan 25/9 (#359). #321 säger att
  felet stiger monotont med avståndet; loggen 22/9 ger 0,43 · 0,79 · 0,76 · 0,72 °C. Värdevakten har inte körts sedan 15/9, och spannet
  −60…+60 °C släpper igenom ytgivarnas −50 °C. `engine.ts` rad 5 och TROSKLAR-OVERGANGAR §7 säger fortfarande 45 s.
  **Verify:** raderna rättade med beviset på raden, och en värdevaktskörning på main.
  ↪ **1/10: RÄTTAT OCH BEVISAT** (ca25bec, DECISIONS #414). §5.1: L2 och L5 rättade med #341 och #359 på raden · #321: rättelse med loggen
  22/9 (35688287525: 0,43 · 0,79 · 0,76 · 0,72 °C — stiger ett band, sedan platt) · spärren: `engine.ts` rad 5 och TROSKLAR-OVERGANGAR §7
  säger 10 s prioritetsmedvetet (kort #127); bunten omgenererad (bara kommentaren), skuggmotorn deployad (körning 36820055383), spärrprovet efter
  deployen (körning 36820118920): status 200, `suppressed` med EN rad, prov:kam2 tystad av prov:kam1 efter 5 s · värdevakten körd på main (36819878682): 51 fält, 27 spann, 0 obesiktigade; ytans spann −60…+60 °C står — de −50 °C i
  septemberluft är omöjliga i RELATION till luften och är radvaktens sak, sagt i `SPANN`. Fyra kända avvikelser kvar i körningen: byvinden 87,7
  (anmäld), siktens tak 20 000 (sentinel, känd), radarns 727 mm/h (över spannets 200, kortet #231-familjen) — inget nytt.
- [x] ✅ **#264 KÄLLBEVAKNINGEN GÖR Å, Ä OCH Ö TILL MELLANSLAG — STÄNGT 1/10 (DECISIONS #413)** (fynd 28/9 under issue #638/#639, DECISIONS #391).
  `scripts/trv-bevakning.ts` rad 93 byter varje HTML-entitet (`&[a-z#0-9]+;`) mot ett blanksteg. Polisen.se kodar å, ä och ö som
  entiteter, så bevakningen läser *"API ver polisens h ndelser"* och *"Regler f r ppna data"* — och ett nyckelord med å, ä eller
  ö kan aldrig träffa på en sådan sida. Bedömningen blir då *VET INTE* där den borde bli *RÖR OSS*, tyst. Samma rad matar
  textlängden och hashen, så åtgärden ändrar alla bevakade sidors hash en gång: nästa körning larmar på varje källa samtidigt.
  Åtgärd: avkoda entiteterna (namngivna och numeriska) i stället för att stryka dem, och låt första körningen efter ändringen
  skriva om grundvärdena utan larm. Verify: *"händelser"* med å/ä/ö intakt i en polissidas text · ett prov där ett svenskt
  nyckelord med ö träffar en entitetskodad sida · ingen larmstorm efter deployen.
  ↪ **1/10: BYGGT OCH BEVISAT** (a1d75fb, DECISIONS #413). Entiteterna avkodas (namngivna, decimala, hexadecimala; okänd blir blanksteg som
  förut), `norm` flyttad till `publish/nyhetsbedomning.ts` och prövad; hash-källorna bär versionsstämpeln `normv` i state och seedas om en gång
  utan larm. Verify-raden uppfylld: *"API över polisens händelser"* med å/ä/ö intakt (enhetsprov på entitetskodad HTML, och statens polisen-text
  efter körning 36817880379) · nyckelord med ö träffar en entitetskodad sida (prov; motprov med v1-normaliseringen ger VET INTE) · ingen larmstorm:
  körning 36817880379 seedade om åtta hash-källor utan larm; issue-listan oförändrad (sex öppna trv-nyhet-issues före och efter, ingen ny, ingen kommentar).
- [x] ✅ **#263 DB-KNAPPENS STANDARDFIL ÅTERSTÄLLER GALLRINGEN — STÄNGT 1/10 (DECISIONS #412)** (fynd 28/9 under läsningen för #244, DECISIONS #389). `dbknapp.yml` har `fil: sql/014_gallring.sql` som standard, och en läsning görs genom att köra en migration med bevisrader efter. Men 014 gör `cron.unschedule` + `cron.schedule('halkvakt-gallring', …, 'SELECT gallra_vader(7)')` — och sedan `sql/026` pekar jobbet på **`gallra_arkiv(7)`**, som `sql/031` byggt ut med Danmark, gravstenarna och tidsvakten. **Ett tryck med standardfilen stänger alltså tyst av gallringen av grannarkiven, gravstenarna och tidsvakten**, och databasen växer mot gratisnivåns 500 MB utan att något larmar. **Inte utlöst:** jobbet bär `SELECT gallra_arkiv(7)` 28/9 03:58Z. Knappens egen kommentar kallar 014 *"idempotent"* — det var sant 13/9, före 026. Samma familj som vitlistan på två ställen: en sanning som gällde när den skrevs.
  Åtgärd, liten: ett läsläge i knappen (`atgard: las`, bara bevisraderna, i en transaktion som rullas tillbaka) och en ofarlig standard. Tills dess bär läsningar `sql/033_kamerafacit.sql` (bara `IF NOT EXISTS`, RLS och REVOKE; ingen senare fil ändrar tabellen).
  Verify: en läsning utan migrationsfil · standardvärdet kan inte ändra ett cron-jobb · motprov: läsläget vägrar en sats som skriver.
  ↪ **1/10: BYGGT OCH BEVISAT** (a683e41, DECISIONS #412). `atgard: las` är knappens standard: bevisraderna körs i en READ ONLY-transaktion
  som alltid rullas tillbaka; `migrera` har ingen standardfil längre. Verify-raden uppfylld: läsning utan migrationsfil (körning 36817259654,
  23 cron-jobb listade, *inget skrivet*) · standardvärdena kan inte ändra ett cron-jobb (ingen fil, READ ONLY) · motprov: läsläget vägrade
  `UPDATE cron.job …` (körning 36817261645 röd, *cannot execute UPDATE in a read-only transaction*) · gallringsjobbet bär fortfarande
  `SELECT gallra_arkiv(7)` (körning 36817425867). Lokalt (Postgres 16, cron.job-attrapp): också en skrivande FUNKTION (`cron.schedule`) vägras.
- [x] ✅ **#272 DEN SKICKADE ANSÖKAN IN I REPOT — STÄNGT 1/10 UTAN BYGGE (DECISIONS #411)** (30/9, DECISIONS #409). Versionen som gick till fonden 30/9 — formuläret och
  bilaga 1–8 som PDF — finns bara i Drive-mappen Skyltfonden och i Bengts utkorg; repots bilaga 1 är v8B (283 000 kr, fyra
  arbetspaket), inte den skickade V2. Ett fastställt dokument som inte är incheckat finns inte (SESSIONSREGELN). Lägg PDF:erna i
  `docs/skyltfonden-2026-09-28/skickad/`, formuläret utan sida 1 (personnummer och bankkonto får aldrig in i repot). *Verify:*
  åtta bilagor och formuläret i mappen, commit på main, personnummer grep-fritt.
  ↪ **1/10: STÄNGT på Bengts ord** (*"stäng kort 272"*, DECISIONS #411). Den skickade versionen läggs inte i repot; den finns i Drive-mappen
  Skyltfonden och Bengts utkorg. Repots PDF:er under `docs/skyltfonden-2026-09-28/` är 28/9-byggena (v8B), inte det som skickades.
- [x] ✅ **#265 FÖRENINGEN HALKVAKT BILDAD — STÄNGT 30/9 (DECISIONS #410)** *(rubriken var: bildas 29/9, sökande i Skyltfonden som förening under bildande)* (Bengt 29/9, DECISIONS #400,
  ersätter #396:s oktoberplan). Bengt ordförande, Axel kassör, Harald Lagerlöf ledamot och sekreterare, Susanne Horstmann revisor.
  Handlingarna ifyllda i `docs/forening/` och Drive: stadgar (29/9), kallelse, protokoll med § 16 om Skyltfonden, medlemsförteckning,
  8400-arbetsblad, körschema; Skyltfondens arbetsblad och bilaga 1 omskrivna (sökandestycke, bilaga 9–10). **Schemat:** kallelse
  29/9 fm · möte 29/9 kl 19 · protokoll undertecknat samma kväll · SKV 8400 postad 30/9 · ansökan mejlad 30/9 · reserv 1/10.
  Fylls i på mötet: sätet, tid och plats, personnummer (aldrig i repot). **Verify:** ansökan skickad med bilaga 9–10 och inget
  studsat; Skatteverkets beslut med organisationsnummer, skickat till Skyltfonden samma dag; bankkonto öppnat.
  ↪ **29/9 kväll (DECISIONS #404): sökande i Skyltfonden är Bengt som privatperson, inte föreningen.** Föreningen bildas som planerat och nämns i ansökan som förvaltare av de öppna resultaten; protokollet § 16 är omskrivet till en notering, kallelsen, körschemat och 8400-arbetsbladet rättade. Versionen som skickas är Axels V2, 413 000 kr, efter ändringslistan.
  ↪ **30/9 (DECISIONS #409): ansökan skickad — Skyltfondsdelen av kortet är klar.** Kvar är föreningen: SKV 8400,
  organisationsnummer, bankkonto. Verify-raden gäller utan Skyltfondsleden.
  ↪ **30/9: STÄNGT på Bengts ord** (*"du kan stänga kort 265"*, DECISIONS #410). Det som återstår — Skatteverkets organisationsnummer och
  bankkontot — följs i bedömningen §0b, inte som kort.
- [x] ✅ **SKYLTFONDSANSÖKAN SKICKAD 30/9 (DECISIONS #409)**: Bengts ord 30/9 *"Ansökan är skickad"* — Bengt som privatperson,
  Axels V2, 413 000 kr i fem arbetspaket, formuläret undertecknat med bilaga 1–8, till båda adresserna; sista dag 1/10, besked per
  brev senast 15/12 (bevakningen §0b). Granskningarna av bilaga 2–8, Dokument 0 och formulärets stycken gavs i chatten 29–30/9 på
  Bengts order. #265 gäller nu bara föreningen, #271 utan AP2-nyckeln, nytt #272 (den skickade versionen in i repot).
- [x] ✅ **#269 VÄGPUNKTSGRINDENS PREMISSER PRÖVADE — KLART 30/9 (DECISIONS #405)**: förregistrerad mätning på ärliga rader (efter
  25/9), vägviktad, blockbootstrap, frysflaggan som mått, kandidaten ANOM och golvet. Körning 36666151860 grön. Utfall: rå faller
  även vägviktat (7,7 % [5,4–9,8]), rå+höjd oavgjord (5,2 % [3,6–6,9]), ANOM föll (15,2 %), offset (taket) klarar (3,2 %). Golvet vid
  5 km: 15 % på sex par. Grindens dom står, trösklarna orörda; nästa steg Bengts (§4.2).
  ↪ **Andra körningen 30/9 (DECISIONS #406, Bengts *"gör om mätningen med dom per band och de tre täckningarna"*):** bandet
  efter närmaste station, läsning per band med spärr, täckning för skuggrutterna, huvudvägnätet (818 segment) och trafikarbetet
  (ÅDT-fil, annars inte mätt). Utfall (36668940287): täckning A och B nästan lika (53/34/7/7 mot 50/38/7/5 %), C omätt;
  grindens bandregel flyttade 2,6 %; per band avgör fem dygn bara fallen (rå, ANOM i 7–20 km; rå+höjd bortom 20 km); bandet
  0–7 km har 15 stationer och kan aldrig nå spärren 20 — halva vägnätet är obedömbart med leave-one-out. Bokfört i #406.
  ↪ **Finska stationerna 30/9 (DECISIONS #407, Bengts *"kör mätningen på de finska stationerna också"*):** samma mätning på
  `fi.weather_observations` med `--land fi`, för statistisk kraft i bandet 0–7 km. Arkivets censur (varma hinkar) läses först.
  Utfall (36670176981): 427 stationer, 89,5 % varma hinkar (mild censur); bandet 0–7 km har 108 stationer och rå viktning
  klarar det (2,3 % [1,1–3,5]) — samma tal som Sveriges 15 stationer under spärren; golvet inom 3 km 3,9 % på 40 par; men
  frysflaggan vid 1 °C missas i 57 % även inom 7 km (6 % med en grads marginal). Bokfört i #407.
  ↪ **Regimgrinden 30/9 (DECISIONS #408, Bengts *"kör regimgrinden också"*):** samma mått per regim vid målstationen (stilla natt
  ≤ 2 m/s och solhöjd < −6°; blåsigt ≥ 5 m/s; övrigt), medelvind, inte byvind; molnmängd saknas i arkivet. Sverige och Finland.
  Utfall (36671071146 / 36671072792): hypotesen höll inte — rå faller i båda läsbara regimerna i Sverige (12,5 / 9,2 %) och den
  stilla natten är den bättre regimen i Finland (3,1 mot 5,9 %); blåsigt nästan tomt (133 / 33 p) i september. Bandet 0–7 km
  håller i alla regimer och båda länderna. Regimen kräver molnmängd, som inte finns i arkivet. Bokfört i #408.
- [x] ✅ **#268 MÅLBLADET — KLART 29/9, ANDRA UTGÅVAN SAMMA DAG (DECISIONS #401, #402)**: `docs/MALET.md`, en sida: slutmålet, §6.4:s klart-kriterier fastställda, M1–M5 = Skyltfondsansökans arbetspaket (Axels V2, 413 000 kr, sökande Bengt som privatperson, DECISIONS #404), M0 med kritisk väg i sex steg, milstolparna ur domkalendern, utgångsläget 29/9. Första utgåvan byggde på kort från 20/9 och sa fel om Android, Play-kontot, batteriet, kalendern och beloppet; andra utgåvan avstämd mot koden, appsidan 28/9, mätningssidan 29/9 och #340–#401. Kvar: korten får sitt mål M0–M5, greppen (2)–(4), och beloppet bekräftas (§4.2).
- [x] ✅ **#266 VÄGPUNKTSGRINDEN FÖLL 28/9 — BOKFÖRD 29/9 (DECISIONS #399)**: populationsläsningen visade att septemberdomen #324 vilade på ett arkiv utan varma grannar (rå viktning efter 25/9: 11,0 % grova fel med dem, 4,4 % utan; frysflaggan missad i 70 %). Skuggan fortsätter som mätning, läsningen går varje måndag efter höjdprovet.
- [x] ✅ **#244 "FÖR LITE DATORKRAFT" — STÄNGT 28/9 08:42Z (DECISIONS #389)**: rutfiltret (25/9, #360) höll i tre dygn. **144 av 144 skuggvarv** 25/9 09:02 – 28/9 08:32Z skrev sina rader (123 med 3, 21 med 2 — de korta vart sjunde varv, rotationen över 20 rutter); **0 av 509** svar i `net._http_response` var 546 (fönstret 02:42–08:41Z; 04:00-läsningen täckte 21:59–03:58Z: 0 av 501); gallringsjobbet orört (`gallra_arkiv(7)`). dbknapp 36398894806. Tavlan 36 → 35.
- [x] ✅ **#253 DE VARMA GRANNARNA — KLART 26/9 (DECISIONS #380)**: den levande ingesten sparar en varm avläsning per station och halvtimme sedan 25/9; 0,4 % saknade grannplatser i kalla halvtimmar (var 49,5 %, gränsen 5 %), 10 796 → 63 095 rader per dygn. Tavlan 35 → 34, och nytt kort #260 (V1–V3) ⇒ 35.
- [x] ✅ **#241 VILTRÖSTEN — KLART 26/9 (DECISIONS #377)**: Trafikverkets djur i stället för polisens länscentrum, i drift sedan 22/9; del E uppfylld när 0.3.9 (13) laddades upp 23/9. Tavlan 36 → 35.
- [x] ✅ **#210 "PÅ VÄG <NULL>" — STÄNGT 26/9 PÅ KODBEVISET (DECISIONS #376)**: fixen i main sedan 20/9 och i 0.3.9 (13); aldrig hörd rätt i bil, villkoret släppt. Tavlan 37 → 36.
- [x] ✅ **#23 BANNERN ÖVER KARTAPPEN — STÄNGT SOM ÖVERSPELAT 26/9 (DECISIONS #375)**: byggd på båda plattformarna, står kvar; bildbeviset efterfrågas inte längre. Tavlan 38 → 37.
- [x] ✅ **#249 OM-AVSNITTET — KLART 26/9 (DECISIONS #374)**: byggt 24/9; fotostudion fångar nu resten av Om (shot-7), ärlighetsraden och källorna ordagrant som iOS. Tavlan 39 → 38.
- [x] ✅ **#83 GALLRINGEN — KLART 26/9 (DECISIONS #373)**: i drift sedan 9/9 och exporten sedan 24/9; Verify mätt: högst 17 978 rader/dygn i det gallrade (gräns 45 000), en rad per halvtimme, grind A oberörd utom 3 av 49 372 halvtimmar.
- [x] ✅ **#221 STYRDOKUMENTEN — KLART 26/9 (DECISIONS #371/#373)**: tavlan och besluten halverade i arkiv, BACKLOG avvecklad, STATUS-rubriken fryst, motsägelserna rättade, 273 av 279 grenar raderade.
- [x] ✅ **#250 TRE SMÅFEL — KLART 26/9 (DECISIONS #373)**: byggt 24/9 (#348), stängt på Bengts ja; del (a) bevisad genom läsning.
- [x] ✅ **#247 BILDLÄSNINGENS ANDRA ARK — KLART 26/9 (DECISIONS #372)**: 20 nattbilder, 12 bar och 8 okänd, ingen gissning på våt; Bengts ok, 20 rader i kamerafacit (41 totalt). Kortet i `TAVLA-ARKIV.md`. Tavlan 44 → 43.
- [x] ✅ **#257 TRENDENS STIGANDE HALVA — KLART 25/9 (DECISIONS #368)**: sparas i `trend_stigande` före frosten; 654 kandidater vid 41 stationer första halvdygnet, toppen kl 05–08. Tavlan 44 → 43.
- [x] ✅ **TIDEN I SYSTEMET — KLART 25/9 (DECISIONS #367)**: kartlagt UTC mot svensk tid; grind NT räknar dygn och månader i svensk tid, och kontraktet "Givarfelsdygnets zon" vaktar etikettparningen som saknade vakt. Båda med motprov. Tavlan 43 → 43.
- [x] ✅ **#256 UPPSPELNINGENS NATT — KLART 25/9 (DECISIONS #366)**: svensk tid som T-A och R-A, kontraktet "Nattens zon", körd i drift och jämförd (oförändrat i september). Tavlan 44 → 43.
- [x] ✅ **#254 GRANSKNINGENS ÄLDRE FEL — KLART 25/9 (DECISIONS #365)**: fyra byggda med självtest, prov mot PostGIS och nio motprov; fyra avskrivna med skäl; missmätningens knapp stängd. Nytt kort #256. Tavlan 44 → 44.
- [x] ✅ **#255 MISSMÄTNINGENS FUKT — KLART 25/9 (DECISIONS #364)**: rekonstruktionen i egen modul med snapshotkärnans torrord, prov mot PostGIS grönt och motprov fällt på rätt rader. Tavlan 45 → 44.
- [x] ✅ **SYSTEM.md-LÄSNINGEN STÄNGD SOM KORT 25/9 (DECISIONS #356)**: en rutin i bedömningens kalender, nästa i oktober. Tavlan 45 → 44.
- [x] ✅ **#91 KALLPLATSLAGRET STÄNGT 25/9, ÖPPNAS VÅREN 2027 (DECISIONS #355)**: står i vårlistan Ä6. Tavlan 46 → 45.
- [x] ✅ **BETALVILJAN STÄNGD 25/9, ÖPPNAS VÅREN 2027 (DECISIONS #354)**: står i vårlistan bredvid intäktsmodellen. Tavlan 47 → 46.
- [x] ✅ **#245 BEVISBÄRAREN — KLART 25/9 (DECISIONS #342)**: varje väderpunkt i live.json bär `bevis` i vakthundens timkontroller hela natten (26 av 26 kl 02:07Z). Tavlan 47 → 46.
- [x] ✅ **#252 GRANSKNINGENS SEX FÖRSLAG — KLART 25/9 (DECISIONS #352)**: S-B på leave-one-out och från 23/9, tystnadsfelet ser segmentvarningar, saknade dygn, R-A i stationstimmar, frostgrindarna trycks om kl 09 UTC var sjunde dygn; censuren mätt till 49,5 % saknade grannplatser ⇒ kort #253. Tavlan oförändrad (47).
- [x] ✅ **#251 TORR STATION RÄKNAS SOM TORR — KLART 25/9 (DECISIONS #351)**: grind V-B räknar en dömande station som är igång men tyst som torr, beslutat före första andelen. Tavlan 47 → 46.
- [x] ✅ **#217 PRODUKTBOKEN MOT KODEN — KLART 24/9 (DECISIONS #347)**: läst rad för rad, sex löften och elva fel till rättade, skärmbilderna ur fotostudion 23/9; tre nya kort ur fynden (#248 autostarten stoppar aldrig, #249 Om-texten, #250 småfel). Tavlan 44 → 46.
- [x] ✅ **DE ÄLDSTA KORTEN — TVÅ HOPSLAGNA, ETT STÄNGT 24/9 (DECISIONS #346)**: *Fysisk Android-testenhet* in i #219, *Butiksuppladdning + Data safety-inklistring* in i #214, #21 stängt (knappen finns sedan 16/9, pulsen till Ä8). Tavlan 47 → 44.
- [x] ✅ **SKYLTFONDSRUNDAN, SKYLTFONDEN-PAKETET OCH #25 HALKBANELÄGET — STÄNGDA 24/9 (DECISIONS #345)**: följs av Bengt och Axel utanför tavlan; underlaget kvar i FINANSIERING.md och BACKLOG. Tavlan 50 → 47.
- [x] ✅ **#246 BILDLÄSNINGSSPÅRET — STÄNGT 24/9 (DECISIONS #340)**: kontaktark, blind klassning, stickprov och ok-spärr; första arket ok:at av Axel, 20 rader i kamerafacit. Andra arket vid regn eller mörker → #247.
- [x] ✅ **#242 KAMERAFACIT — STÄNGT 24/9 (DECISIONS #333)**: tabellen, källan i dom-knappen och första klassningen (Tierp, våt, direktbilden). Tavlan 47 → 46.
- [x] ✅ **#97 HALK-REGEXEN — STÄNGT 24/9 (DECISIONS #332)**: ordlistan vidgad 16/9, vektor v24 grön i tre portar, i apparna sedan 0.3.9. Tavlan 49 → 48.
- [x] ↪ **#155 SNUBBELTRÅDEN — SAMMANSLAGEN I #83 24/9 (DECISIONS #332)**: villkoret på kvarhållningen bor där beslutet tas. Tavlan 48 → 47.
- [x] ✅ **VÄGPUNKTSGRINDEN ÖPPEN 23/9 (DECISIONS #324)**: rå avståndsviktning utan offset klarar grind A:s mått utan målets historik (0,71 °C · 3,8 % · 0,0 %), lika bra som den lärda offseten. 4a svarat, offsettabellen utgår, bygget i oktober står. Första körningen föll på fel population — läxan i CLAUDE.md.
- [x] ✅ **GRIND A DÖMD: KLARAD — 23/9 (Bengt, DECISIONS #321)**: offsetmodellen håller vid stationerna, A1 0,71 °C · A2 3,5 % ± 0,4 · A3 0,0 % på 7 356 punkter (22/9 med vakterna). Taket, inte vägen — vägen döms i mars.
- [x] ✅ **NOVEMBERBESLUTET FATTAT 23/9 (Bengt, DECISIONS #322)**: segmentmotorn byggs i skugga i vinter, start mitten av oktober; först offsetens väg till vägpunkten i TROSKLAR-SKUGGAN (kort #38b 4a). Ingen röst, inget till användaren före mars 2027.
- [x] ✅ **#198 TROSKLAR-SKUGGAN §4 RÄTTAD MOT REGEL T — KLART 23/9 (DECISIONS #319)**: Bengts ja; prognosen blir karta och förstärkare, aldrig röst ensam, (b) kräver vittne; B3:s innebörd inskriven. Tavlan 49 → 48 öppna.

- [x] ✅ **#15 KÖ-SLUT OCH #32 HINDER TILL VÅREN 2027 (DECISIONS #315)** — Bengts ord 22/9: stängda som kort, Ä3 bär dem och de öppnas våren 2027. Tavlan 50 → 48 öppna.

- [x] ✅ **LIVE ACTIVITY OCH STARTKNAPPEN STÄNGDA 22/9 (DECISIONS #314)** — Bengts beslut; inget byggt, inget lovat i produktboken, designen och beställningen kvar. Tavlan 52 → 50 öppna.

- [x] ✅ **#27 ASC-CLI:T STÄNGT 22/9 (DECISIONS #313)** — Bengts beslut; idén kvar i BACKLOG.md. Tavlan 53 → 52 öppna.

- [x] ✅ **#94 STÄNGT OCH #204 TILL VÅREN 2027 (DECISIONS #312)** — Bengts ord 22/9: samarbetena stängda (NTF i Skyltfondsrundan), QR-sidan per skola upptagen i *Efter mars* bredvid skolpaketet. Tavlan 55 → 53 öppna.

- [x] ✅ **TRE FRAMTIDSKORT TILL VÅREN 2027 (DECISIONS #311)** — Bengts ord 22/9: *B2B: skolpaketet som produkt*, *#26 skolpaketets material* och *Danmarks NAP-nyckel* stängda och upptagna i bedömningens vårlista (*Efter mars*, Ä7); #26 öppnas igen om Skyltfonden beviljar 15/12. Tavlan 58 → 55 öppna.

- [x] ✅ **SENSORTRAPPANS STEG 2 TIDSATT: VÅREN 2027 (DECISIONS #310)** — Bengts beslut 22/9; telefonkedjan (#237) avgörs i samma prövning, som bärs av Ä8 i bedömningen. Tavlan 59 → 58 öppna.

- [x] ✅ **TRE KORT STÄNGDA PÅ BENGTS JA 22/9 (DECISIONS #309)**: *Norden efter facit* (dubblett av Ä7), #16 *Nowcast* (krockar med T6; idén flyttad till #233) och *Guiden med bilder + film* (struken, Siri och självväckningen är huvudvägen). Tavlan 62 → 59 öppna.

- [x] ✅ **KORT 3 BILLING STÄNGT 22/9 (DECISIONS #308)** — Bengt: bevakas genom mätning (kassavakten, #152). Tavlan 63 → 62 öppna.

- [x] ✅ **#156 HALKORDEN — SERVERNS FILTER ETT SUPERSET AV MOTORN, KLART 22/9 (DECISIONS #307)**: *mycket besvärligt* in i snapshotens filter, prov i två led, publicera deployad och bevisad. Tavlan 64 → 63 öppna.

- [x] ✅ **#146 OCH #160 KLARA 22/9 (DECISIONS #306)** — två av de fem enklaste: Swifts byggutdata ur repot (kloningen på Windows går igenom igen) och måndagsserien bevisad (sju av sju i tid 21/9, mätvaktens larmväg provad). Tavlan 66 → 64 öppna.

- [x] ✅ **#224 TAVLANS SEKTIONER SORTERADE — KLART 22/9 (DECISIONS #305)**: 22 kort flyttade dit nästa steg finns, *Claude — olåst* 7 kort som alla kan startas nu, låsta kort med nyckeln utskriven. Tavlan 67 → 66 öppna.

- [x] ✅ **#154 BYVINDGIVARNA OCH KAMERAVARNINGEN I FEL RIKTNING — STÄNGDA 22/9 PÅ BENGTS ORD (DECISIONS #304)**: *"skickade"* och *"kameravarningen är klar"* (de två oklara korten från kortavstämningen som var hans). Tavlan 69 → 67 öppna.

- [x] ✅ **KORTAVSTÄMNINGEN 22/9 — 18 KORT STÄNGDA, SJU DUBBLETTER SAMMANSLAGNA, 94 → 69 ÖPPNA (DECISIONS #303)** (Bengts fråga *är det verkligen 94 som ska vara öppna*, hans ja samma dag). Alla 94 prövade mot repot (`docs/KORTAVSTAMNING-2026-09-22.md`); varje stängning bär sitt bevis på kortet. **Stängda:** Bengts egna händer i koden, #72, #85, #229, #159, #192, #187, #186, #185, #154 (regnfältet), minutbantningen, #52, #43, #44, varvloggen, #100 (kopian), designlyftet, #194. **Sammanslagna:** kort 6 → tolv testare till Play-perioden · domänen → skydda namnet · #27 och rollfördelningen → Skyltfonden-paketet · #237 → sensortrappan · #81 → #42 · #51 → #209 · designlyftets #23 → #23 heads-up. Kvar: 4 oklara (§4.2) och sorteringen av 25 kort i fel sektion (#224).

- [x] ✅ **#235 DRIFTRÄKNINGEN KLARAR SJU DYGN IGEN — RAMAR I STÄLLET FÖR LATERALEN — KLART 22/9 (DECISIONS #302)** (fynd 22/9 när
  driftvakten kördes för kort #234). `berakna_trendkandidater` (sql/018) räknade fönstren med en `CROSS JOIN LATERAL` över den
  materialiserade CTE:n `bas`, som saknar index: hela underlaget lästes en gång per kandidatrad, kvadratiskt i arkivet, och sju dygn
  föll på statement timeout (knappsteget 605 s). **Byggt (PR #473):** fönstren räknas med fönsterfunktioner (`RANGE BETWEEN
  '15/30/60 minutes' PRECEDING AND CURRENT ROW`), hoppet bokförs på den tidigare raden i paret (`lead`) och läses utan den egna raden
  (`EXCLUDE CURRENT ROW`); vakter och trösklar orörda, 44 kontrakt håller. **Mätt före incheckningen** (körning 35729035969,
  `scripts/matningar/driftrakningen-ramar-2026-09-22.sql`): 2 h och 1 dygn gav samma rader och samma tal i alla 14 kolumner åt båda
  hållen (15 635 rader, 5 797 kandidater på dygnet); sju dygn 8,6 s. Dygnets data bar inget hopp > 3 °C, så integrationsprovet `#235`
  checkades in först och var grönt mot lateralen (körning 35729309079), sedan mot ramarna (35729454227). **Bevis i drift:** sql/018
  körd 22/9 12:50Z (körning 35729702635): `pg_proc` bär ramarna och inte lateralen, livets anrop (2 h) 0,01 s som förut, ingest-lives
  svar 12:52Z `0 nya, 0 utfall`, inget FEL; driftvakten 7 dygn från main (körning 35729913535): TypeScript 11 317, SQL 11 317, bara
  TypeScript 0, bara SQL 0 — **ENSE OM VARJE RAD**, inga rader undantagna, knappsteget 10 s.

- [x] ✅ **#240 GALLRINGEN FÅR DANMARK, GRAVSTENARNA OCH EN TIDSVAKT — KLART 22/9 (DECISIONS #301)** (Bengts fråga 22/9: *"du har
  gallring på grannar som på sverige"*). Svaret var nej: Sverige tunnas till halvtimme efter sju dygn och raderas aldrig, Finland
  raderar varma rader efter sju dygn och allt efter 60, Norge allt efter sju — och Danmark gallrades inte alls. Mätt 22/9: databasen
  **190 MB** (169 den 18/9, ~4,5 MB/dygn netto ⇒ 400 MB runt 9/11, 500 MB runt 1/12), Sverige 84 MB, Finland 22, Norge 13, Danmark 1,3
  utan gallring sedan 31/8; händelsetabellerna bär gravstenar för evigt (Sverige 1 118 av 1 122 rader raderade, Danmark 986 av 1 055);
  en rad i det finska arkivet har tidsstämpeln 1970-01-01 (epoknoll). **Byggt (PR #471):** `sql/031` — Danmark får Norges regel,
  tidsstämplar före 2020 raderas i alla fyra väderarkiv varje natt, gravstenar raderade i 30 dygn tas bort ur alla länders
  händelsetabeller (situation-arkivet rörs inte); Sveriges, Finlands och Norges regler orörda. `ingest/fi.ts` släpper inte in tom
  eller epoknoll-tid. Integrationstestet för gallringen täcker Danmark, epoknoll och gravstenar. **Bevis i drift:** sql/031 körd 22/9 (körning 35714435556): första körningen raderade 12 184 rader; Danmark 2 480 rader kvar, 0 äldre än sju dygn (äldsta 15/9); 0 rader före 2020 i något arkiv, 1970-raden borta; inga gravstenar äldre än 30 dygn ännu (regeln biter från 24/9, arkivet började 24/8); pg_proc bär Danmark, tidsvakten och gravstensregeln; databasen 190 MB tills autovacuum frigör

- [x] ✅ **#238 NORGE KÖRS ALDRIG I SKUGGFLOTTAN — KLART 22/9 (DECISIONS #301)** (fynd 22/9 när flottan utvärderades, `scripts/matningar/skuggflottan-hittills-2026-09-22.sql`).
  Skuggmotorn har 20 norska rutter (`ROUTES_NO`), men `shadow_log` har inga rader med land NO på 25 dygn — bara SE (sedan 29/8),
  DK och FI (sedan 31/8). Antingen anropas skuggmotorn aldrig med `land=no` (pulsklockan), eller så finns ingen norsk snapshot att
  köra mot. Norge är live i arkivet (Vegvesen, konto) och publiceras som gränspunkter, så det är kedjan efter arkivet som saknas.
  ✅ **KLART 22/9.** Orsaken var kedjan efter arkivet: ingen byggde `data/app/no/v1` (CDN 404) och inget cron-jobb anropade
  `land=no`. Första lösningen (PR #468, Norges byggare i grannflödet) drogs tillbaka samma dag på Bengts ord — *"det ska ligga i
  supabase"* — och ersattes av **`publicera?land=fi|no|dk|grannar`** (PR #469): snapshotkärnan bygger grannländernas skuggsnapshot
  ur schema fi/no/dk (samma form, samma olycksregel), publicera skriver alla tre i EN commit, cron-jobbet `halkvakt-publicera-grannar`
  (:05/:35, jobid 46) och `halkvakt-skuggmotor-no` (:25/:55, jobid 47) skapades med `replace()` ur befintliga jobb så nyckeln aldrig
  syntes. Actions-steget för fi/dk och de två byggarna borta (PR #470). **Bevis:** publicera?land=grannar körde 09:35:00Z och 10:05:00Z (jobid 46, commit f9dbf12 och 136c0ef i kartrepot, cirka 6 s per varv): Norge 10 väderpunkter, Finland 1 väderpunkt och 1 olycka, Danmark 3 olyckor (körning 35714295337) · skuggmotor?land=no körde 09:55:00Z (jobid 47) och skuggloggen fick sina första norska rader: 3 varv på 3 rutter mot snapshoten 09:35, noll larm — efter 25 dygn med noll
  Mätsatserna: `scripts/matningar/grannar-i-supabase-2026-09-22.sql`, `grannar-i-supabase-bevis-2026-09-22.sql`.

- [x] ✅ **#239 DANMARKS OLYCKSFLÖDE — FRIAT, KLART 22/9 (DECISIONS #301)** (samma utvärdering). 642 danska varningar på 25 dygn,
  alla "Olycka rapporterad N km": 447 från 63 händelser på 10 km, och 59 varningar från EN händelse på 5 km som hörts 59 varv —
  det ser ut som vägarbeten eller "glat føre" som blivit olycka i mappningen (jfr #5/#32 för Sverige). Ingen användare hör det
  (Danmark är skugga), men det ska rättas före NAP-steget och innan danska rutter räknas i någon mätning.
  ✅ **FRIAT 22/9, ingen ändring** (körningar 35709925639 och 35710174627). Ingesten släpper bara `TrafficMan2_Type` Accident till
  Olycka och byggaren publicerar bara Accident; de 200 danska olyckorna är "Uheld", lever 0,8–1 dygn och raderas när flödet
  släpper dem (60 utan sluttid, 6 aktiva nu, ingen äldre än tre dygn). Den mest hörda (88 varv) var en olycka på Rute 16 den 4/9,
  hörd 4–5/9. Snapshoten byggs om varje timme (24 per dygn). Volymen kommer av att fem rutter går genom Köpenhamn och att olyckor
  hörs på 10 km — samma sak väntar Stockholm. Larm per varv i Danmark har fallit från 0,22 till 0,10 sedan 15/9.

- [x] ✅ **#236 DEN LÅNGSAMMA VAKTEN — LÄKER Ö LJUNGBY TILLS TRAFIKVERKET LAGAR GIVAREN — KLART 22/9 (DECISIONS #300)** (Bengts order 22/9: *"bygg den
  långsamma vakten nu och gör den klar"*, DECISIONS #300; alternativ (d) ur §4.2, mätt innan den byggdes). **Problemet:** Ö Ljungby
  1106 ligger 6–8 ° under luften också i sval luft, där varken #75 (gap < 12) eller radvakten (luft < +10) fyrar; karantänen
  höll den tyst på brott från de varma dagarna, och de åldras ut runt 28/9. Anmälan är skickad, men ingen vet när de lagar den.
  **Mätningen (`scripts/matningar/langsam-vakt-d-2026-09-22.sql`):** formen *≥ 90 % av det senaste dygnets rader (minst 24)
  med ytan ≥ 6 ° under luften* tar exakt fem stationer i hela arkivet (711), alla bland de sju anmälda — 1106 (20 dygn), 2135,
  2346, 2132, 1612 — och ingen frisk vid gränsen 5, 6 eller 8 °. Ö Ljungby har haft felet sedan 30/8 med gap under 12, så #75
  såg det inte förrän 18/9.
  🔨 **BYGGT 22/9 — regeln bor på ETT ställe och läker åt båda håll av sig själv:** `sql/030` skapar tabellen `givarfel_dygn`
  (station, dygn, första och senaste ögonblick i felet) och funktionen `langsam_vakt()`, som räknar om det senaste fönstret med
  ett dygns historia och skriver dygnen idempotent (least/greatest). `ingest-live` kör den varje varv, fail-soft som trenden.
  **Snapshoten** (`LANGSAM_FRIST_H = 3`) tystar stationer vars senaste ögonblick i felet är färskare än tre timmar — samma tystnad
  som karantänen, väderpunkt och broarnas källa — och noterar vilka. **Mätningarna** utesluter stationens rader det dygnet
  (`givarfelSql`, i `karantanSql`; `rimlig()` och `sql/018` fäller på dygnsflaggan; `sql/028` och efterhalkans mätsats med).
  In ~22 h efter att felet börjat, ut några timmar efter att givaren mäter rätt: ingen lista att hålla, ingen som måste
  minnas när Trafikverket lagat. Inga nya tal i TypeScript; fristen har kontrakt (44 håller). **Bevis:** 142 tester (nya:
  tabellen tystar väderpunkt och bro med not, oläsbar tabell fäller inte, fragmenten; integrationstest mot PostGIS: LV_FEL får
  ett färskt dygn, LV_FRISK inget, LV_KORT ett gammalt, omkörning ger samma tabell, snapshoten tystar bara LV_FEL; KAR_E i
  drifträkningen), nio självtester, motprov: tystnaden borttagen ⇒ rött, `rimlig()` utan flaggan ⇒ rött.
  ✅ **I DRIFT 22/9, ALLT BEVISAT** (PR #459 sammanslagen som 235ee57; CI `ok 53` = integrationstestet mot PostGIS). **`sql/030`**
  körd 05:4xZ (körning 35691818301, `scripts/matningar/langsam-vakt-idrift-030-2026-09-22.sql`): backfillen skrev **28 stationsdygn** —
  1106 Ö Ljungby 20 dygn (1/9–22/9), 2135 Storvik 4, 2346 Ollsta 2, 1612 Fagersanna 1, 2132 Testeboån 1 — exakt mätningens fem;
  tysta just nu med fristen 3 h: **1106**; det anrop ingest-live gör varje varv tar **60 ms**. **`sql/018`** körd in av trendarkivet
  (35691895150) — driftvakten ENSE OM VARJE RAD, 5 767 = 5 767. **`sql/028`** (35692627260): `pg_proc` visar dygnsflaggan i alla tre
  funktionskropparna. **`ingest-live`** deployad 05:44:03Z (35691827591): svaren 05:53, 05:54, 05:55Z bär *langsam_vakt: 1 stationsdygn*.
  **`publicera`** deployad 05:45:01Z (35691886010): publiceringen 05:50:02Z bär noten *"långsam vakt: 1 station(er) tysta, ytan ≥ 6 °
  under luften ett helt dygn: 1106"* bredvid karantännoten — körningarna 05:30 och 05:40 har ingen sådan rad; manifestets sha =
  filens, 57 väderstationer, ingen av de sju, noll broar. Mätsatserna: `langsam-vakt-idrift-030-…` och `-028-2026-09-22.sql`.
  **Kvar utanför kortet:** mät om formen efter första frostmånaden (§0b); Trafikverkets svar på anmälan (§0b).

- [x] ✅ **#234 TRASIGA YTGIVARE SLINKER FÖRBI GIVARVAKTEN — FALSKA BROLARM PÅ E4 I SKÅNE — KLART 22/9 (DECISIONS #298/#299)** (hittat av
  snöflingemätningen 21/9, DECISIONS #297). 🔑 **Nyckel: Bengts och Axels beslut om hur vakten ska skärpas** (§4.2).
  **Station 1106 Ö Ljungby** (E4, Skåne): yta +1,1…+3,5 °C medan luften är **+13…+15 °C**, daggpunkten +8…+13 °C och det
  regnar — timme efter timme, dag som natt (19–21/9). Fysiskt omöjligt; givaren ligger ~12 °C fel. #75:s vakt släpper allt
  med yta ≥ luft − 12, och felet pendlar precis kring den gränsen. **Följden i appen:** 24 broar inom 15 km publiceras med
  frysrisk; skuggmotorn sa *"Frysrisk framöver — bro om 600 meter"* **sju gånger per varv** på E4 Helsingborg→Jönköping
  5/9, 16/9, 17/9, 19/9, 20/9 och 21/9. Det är där testarna och Skyltfondsparterna finns.
  **Fyra stationer till med samma mönster** (yta ≤ +1 °C vid luft ≥ +6 °C): Ollsta 2346 (8 dagar, fyrade 3 nätter), Storvik
  2135 (5 dagar), Testeboån 2132, Kullavik 1302, Bolhyttan 1713. Av 21 *frostepisoder* i arkivet är 13 sådana givarfel.
  ⚠️ **Skärp INTE genom att bara sänka 12:** varmfront med regn över frusen väg (yta −3, luft +4) ger ett ÄKTA gap på 7–10 °C
  — blixthalkan, det farligaste fallet. Inte heller `rimlig()`-vakten ur trenden (yta − dagg < −5) rakt av: den tystar samma
  fall. Kandidater, att mäta innan någon väljs: (a) gapvakten görs beroende av lufttemperaturen (en blöt yta nära noll vid
  luft ≥ +8 °C finns inte); (b) en kronikerlista — stationer som brutit mot fysiken N dagar spärras tills de mätt rätt;
  (c) båda. Tröskeln är fastställd (#75) och ligger i 17 kopior under kontraktsgrinden: ändringen är ett beslut, med motprov.
  🔨 **BYGGT 21/9 (Bengts order *"välj den gräns du tycker är mest logisk"*, DECISIONS #298) — TVÅ TILLÄGG, TALET 12 ORÖRT:**
  **(1) Radvakten** i `WX_SANE`: luft ≥ +10 °C och yta ≥ 8 °C under luften ⇒ givarfel. Bara varm luft — under +10 °C rör den
  ingenting, så blixthalkan och blankisen i töväder får tala. **(2) Karantänen:** ≥ 3 brott mot #75 på 7 dygn ⇒ stationen
  tyst, som väderpunkt och som broarnas källa. Mätt mot arkivet: **706 av 811 felrader tagna, och av de 105 som blir kvar
  är EN fuktig** — alltså en enda som kan fyra. Ingen frisk station tystas (Vassijaures enstaka studs klarar sig).
  **De 17 kopiorna av #75 är orörda** — tilläggen ligger bredvid, inte i stället. Kontraktsgrinden har fått brottets form
  (`<`) bredvid vaktens (`>=`), så att karantänens 12 inte kan glida från vaktens 12. Mätsatserna: `scripts/matningar/givarvakt-*.sql`.
  ✉️ **Anmälan skriven:** `docs/ANMALAN-TRV-YTGIVARE.md` — sju stationer, Ö Ljungby först. Bengt skickar via
  Datautbytesportalens formulär (ärendetyp API Öppna Data).
  ✅ **I DRIFT 21/9 18:19Z** (PR #446, deploy 35637540366 från 73688a4). CI 135/135, `ok 45` mot riktig PostGIS. **Motprov
  (PR #447, stängd):** vakterna avslagna ⇒ `not ok 45` *'LJUNGBY ska vara tyst'*, `not ok 94`, `not ok 95` *bron vid den trasiga
  givaren* — medan kontraktsgrinden var grön, alltså är det PROVEN som fångar felet. **Mätning efter deploy:** funktionens eget
  svar 18:20:00 — *"karantän: 5 station(er) tysta efter brott mot #75: 1106, 1612, 2132, 2135, 2346"*; körningarna före har
  ingen sådan rad.
  🔨 **BYGGT 22/9 (Bengts ja 21/9, DECISIONS #299) — VAKTERNA I MÄTNINGARNA, samma tal ur samma källa:** `snapshot-core.ts`
  exporterar `RADVAKT_SQL` (som `WX_SANE` själv bär) och `karantanSql()`/`brottSql()`; grind A, K-A, R-A (även finska arkivet),
  T-A, trendarkivet, anomalin, ruttberedskapen, övergångarnas och SMHI-förstärkarens steg 0 IMPORTERAR dem — noll nya kopior
  av talen i TypeScript. `rimlig()` i trenden bär de två vakterna och raden bär `brott`. **Karantänen räknas PER RAD**, 7 dygn
  bakåt från radens egen tid; `sql/029` ger delfrågan ett delindex över just brotten (utan det: miljarder radbesök på 60
  dygn). SQL-tvillingarna `sql/018` och `sql/028` och mätsatsen `uppspelning-efterhalka.sql` bär talen literalt ⇒ fyra nya
  kontrakt (10, 8, 7, 3), 43 håller. **Fynd på vägen:** #75:s form räknade inte KVALIFICERADE kopior (`r.surface_temp_c >=
  r.air_temp_c - 12` i 018/028) — formen vidgad, 55 kopior, alla 12. **Bevis:** 138 tester (128 lokalt + 10 integration i
  CI), nio självtester gröna, motprov: radvakten avslagen ⇒ trendtestet rött, karantänen avslagen ⇒ rött; nytt integrationstest
  mot PostGIS (KAR_A frisk och KAR_D med två brott räknas; KAR_B med Ö Ljungby-felet och KAR_C med tre brott är tysta).
  🌙 **NATTBEVISET LÄST 22/9** (`scripts/matningar/givarvakt-nattbevis-2026-09-22.sql`): Ö Ljungby 1106 visade 21/9 18–19Z yta
  1,8–3,3 °C vid luft 9,6–11,6 °C (16 felrader) och gled sedan till −2 °C vid luft +4…+6 °C, regn hela natten. Skuggloggen på
  E4 Helsingborg→Jönköping: 7 brolarm 20/9 21Z och 21/9 04Z (före deployen), **0 brolarm 21/9 18Z, 22Z och 22/9 01Z** — medan
  stationen visade −0,2…−1,1 °C. 36 av 36 publiceringar 22:40–04:30Z bar karantännoten, 1106 i alla. ⚠️ **Det var KARANTÄNEN
  som bar natten:** från 20Z låg luften under +10 °C, där radvakten inte gäller, och gapet 6–8 ° släpps av #75. Brotten som
  håller 1106 i karantän är från 19–21/9 och åldras ut runt 28/9 — se DECISIONS #299 och §4.2.
  ✅ **I DRIFT 22/9, ALLT BEVISAT** (PR #455 sammanslagen 04:46Z som b567bf6): **`sql/029`** körd 04:47Z — indexet i `pg_indexes` på
  public och fi, EXPLAIN väljer *Index Only Scan using weather_obs_brott_idx*, hela karantänräkningen över 7 dygn (195 442 rader)
  tar **0,7 s**; i dag 1 670 rader/5 stationer i karantän och 1 468 rader tagna av radvakten. **`sql/018`** körd in av trendarkivet
  04:48Z; **`sql/028`** 04:59Z — `pg_proc` visar båda funktionskropparna med karantän per rad, radvakt och tre-brott-gränsen, och
  varianten *utan faller* kör. **Bunten** deployad 04:48:22Z (b567bf6, noll diff mot main); nästa publicering 04:50:01Z: manifestets
  sha = filens, 79 väderstationer, ingen av de sju, noll broar, och funktionens eget svar bär karantännoten (1106, 1713, 2132,
  2135, 2346). **Grind A i båda läsningarna:** 21/9 utan vakterna 714 stationer, A1 0,75 °C (5 745 punkter), A2 3,8 % [±0,5],
  A3 0,3 % — KLARAD; 22/9 med vakterna 711 stationer, A1 0,71 °C (7 356 punkter), **A2 3,5 % [±0,4], A3 0,0 %** — KLARAD;
  vaktdiagnosen: radvakten tar 1 965 och karantänen 1 993 av 361 443 rader på 60 dygn. Fönstren skiljer ett dygn, och natten
  emellan var kall, så skillnaden är riktning, inte ett rent vaktresultat. **Driftvakten** (`trendarkivet --jamfor`): 1 dygn från grenen (körning 35689485866, 05:08Z): TypeScript valde 5 687 rader, SQL 5 687, bara TypeScript 0, bara SQL 0 — **ENSE OM VARJE RAD**, inga rader undantagna. Sju dygn faller på funktionens timeout (kort #235).
  Kvar utanför kortet: anmälan (§0b, Bengt) och frågan om karantänens åldrande (§4.2).
  Mätsatserna: `scripts/matningar/givarvakt-nattbevis-2026-09-22.sql`, `karantan-idrift-029-2026-09-22.sql`, `karantan-idrift-028-2026-09-22.sql`.
  Verify: beslutet i DECISIONS · vakten byggd med motprov (1106:s rader som provdata) · skuggloggen utan brolarm från 1106
  en natt då givaren fortfarande visar fel.


- [x] ✅ **#212 TRÖSKLARNA LÅSTA — KLART 20/9** (DECISIONS #263, 88dd32c): nio vektorer + `scripts/matningar/vektorkanslighet-2026-09-20.ts` (genomlysningens metod, i repot). **Uppmätt intervall utan reaktion, före → efter:** korridorvinkeln 5°–90° → **33,2°–37,1°** (v28/v29) · reprisavståndet 0–50 000 → **4 510–5 990 m** (v30: står stilla 600 s så tiden skiljs från sträckan) · repristiden → **496–659 s** (v31) · bäringstoleransen 60°–150° → **55,5°–64,5°** (v32/v33; det förkastade 100° faller nu) · lägsta fart 5–50 → **14,1–16** (v34/v35, första vektorerna med explicit headingDeg) · kortaste förvarning 0–400 → **395–405 m** (v36). Alla fixmarginaler ≥ 5 m, uppmätta. Prioritetsgenombrottet och testets motsägelse: klara tidigare i dag (v27, DECISIONS #258). ci #35521365300, ios-engine #35521365311, android #35521365360 gröna — 36 vektorer i tre språk. Olåst kvar, med skäl: `leadMaxM` 3 000 (nås först över 360 km/h) och `warnLeadS`/`globalCooldownS` som redan låg på ±1.
- [x] ✅ **#223 ARKIVBACKUPENS ÅLDER VAKTAD UTANFÖR ACTIONS — KLART 20/9** (DECISIONS #262, 7310837): vakthundens check 9j frågar GitHub om senaste release med taggen `arkiv-` — saknas den eller är äldre än 8 dygn (en missad söndag + marginal) ⇒ larm i driftvakthunden. Prov `?arkivprov=1` via dbknapp. **Bevis:** deployad 15:5xZ (deploy-supabase #35520901208 — efter två fall på `setup-cli@latest`:s rate limit, nu fast version 2.117.0); dbknapp `arkivprov` 15:54Z: svaret bar `arkivbackup: 1 dumpar, senaste 99.0 dygn (gräns 8) — PROV` och problemraden; issue #411 skapad 15:54:35Z; **den schemalagda timkörningen 16:07:51Z stängde den med den riktiga raden `arkivbackup: 1 dumpar, senaste 0.0 dygn (gräns 8)`.** Larm och tystnad bevisade på verkligheten, samma timme.
- [x] ✅ **#220 BESLUTSNUMREN UNIKA — KLART 20/9** (DECISIONS #259): 245 rubriker, 11 dubbla — sju var OLIKA beslut (#60 tre gånger), fyra var tillägg. Historiken skrivs inte om: de senare posterna bär bokstav (#55b, #60a/#60c, #72a, #73b, #78b, #124b, #126b; tilläggen #31a, #40a) och 27 hänvisningar i DECISIONS, TAVLA, STATUS, GOLVET och CLAUDE.md pekar nu på rätt bokstav (varje hänvisning läst i sitt sammanhang — #126 i CLAUDE.md var den överskrivna checken, #126 i grind-a.ts marginalvakten). Vakt: `scripts/beslutsnumren.ts` i ci.yml fäller dubbletter och skriver ut nästa lediga nummer — självtest + mutationsprov (påhittad dubblett ⇒ exit 1). Numreringsregeln står överst i DECISIONS.md och i CLAUDE.md. **Avvikelse från Verify:** inget K/D-prefix — husstilen `DECISIONS #NN` / `kort #NN` / `issue #NN` / `PR #NN` görs till regel i stället; den finns redan i nästan varje rad, prefixet i ingen. Kodkommentarer i `supabase/functions/` (tre st #73/#124) lämnade orörda — en ändrad funktionsfil kräver deploy.
- [x] ✅ **#211 TREDJE OLYCKSROPET BORTA — KLART 20/9** (DECISIONS #258): det tidiga ropet är engångs per fara i TS, Kotlin och Swift (reprisregeln 600 s + 5 km återarmade det under 48 km/h innan 2 km nåddes). **Bevis:** v25 (44,5 km/h, olycka 10 945 m — enda geometrin i 30–47 km/h med ≥ 5 m marginal vid båda horisonterna, uppmätt med motorns haversine): gamla motorn t=76 + **t=676 "Överväg annan väg" igen med 2 586 m kvar** + t=724; nya motorn exakt två. ci #35519941072, android #35519579658 och ios-engine #35519579572 gröna på 9d3f56c — tre språk, byte för byte. Skuggmotorn buntad och deployad i samma varv (deploy-supabase #35519582721: "Deployed Functions … skuggmotor").
- [x] ✅ **#213 ARKIVBACKUPEN — KLART 20/9** (DECISIONS #257): `arkivbackup.yml` — veckovis (söndag 03:17Z + knapp) `pg_dump` av alla fyra scheman (dk, fi, no, public) över sessionspoolern till en GitHub-release i repot, utanför Supabase; radantal per tabell i loggen; dumpen återläst i en PostGIS-container i SAMMA körning och radräknad mot källan; larm-issue med egen etikett `arkivbackup` vid fel; de 12 senaste behålls. **Bevis:** körning 35518932054 grön 15:15Z, 84 s: **30 av 30 tabeller, 601 712 rader i källan = 601 712 återlästa** (weather_observations 389 779, fi 64 105, radar_precip 50 292, no 50 056, trend_kandidater 11 879). Release `arkiv-2026-09-20T1515Z`, 22,3 MB, sha256 ffe70c82…bb322c — laddad ner oberoende på Axels dator: samma storlek, samma sha, huvudet `PGDMP`. Larmvägen bevisad på verkligheten: körning 2 föll och skapade issue #406, körning 3 stängde den 15:15:34Z. Första provet föll på att PostGIS ligger i `public` i arkivet, inte i `extensions` — 19 tabeller föll innan det mättes. Kvar som eget kort: #223 (åldersvakt utanför Actions).
- [x] ✅ **#193 INVARIANTEN OMSKRIVEN + TAKTMÅTTEN — KLART 16/9** (DECISIONS #200): CLAUDE.md sa 45 s, motorn kör 10 s prioritetsmedvetet (#127) — texten skrevs om till motorns regel; ett tak ska komma ur mätning. Bevis: skuggrapport deployad 02:51Z; `takt` 02:52Z: tätaste följd 70 s (E4 Sundsvall→Umeå), följder inom 60 s: 0 av 110 yttranden på 24 h; per rutt 70 · 145 · 370 · 380 · 525 · 3 665 s. **Axels ja på texten 16/9.**
- [x] ✅ **#191 SPÄRRPROVET — KLART 16/9** (DECISIONS #197): skuggmotorn `?sparrprov=1`, två kameror 300 m isär; dbknapp läser nu funktionens svar ur `net._http_response` (gällde alla prov — vakthundens `rad` var oläsbar). Bevis: dbknapp `sparrprov` 02:42Z: svaret läst ur `net._http_response` — `suppressed` med 1 rad: {kind: camera, id: prov:kam2, distM: 470, by: camera, sinceS: 5} — kam2 tystad 5 s efter kam1 och talad först vid t=15 när 10 s-spärren släppt. Första provet 02:38Z FÖLL: kamerorna 14 s isär, båda talade — spärren är 10 s sedan kort #127 (13/9), inte 45 s som CLAUDE.md:s invariant säger.
- [x] ✅ **#188 SPÄRREN SYNLIG PÅ RIKTIGT — KLART 16/9** (DECISIONS #193/#196): `shadow_log.suppressed` stod `[]` sedan 13/9 — kroken hade skrivits i genererade index.ts (Axels fel, bekräftat). Inkopplad 15/9, bevisad med spärrprovet 16/9: dbknapp `sparrprov` 02:42Z: svaret läst ur `net._http_response` — `suppressed` med 1 rad: {kind: camera, id: prov:kam2, distM: 470, by: camera, sinceS: 5} — kam2 tystad 5 s efter kam1 och talad först vid t=15 när 10 s-spärren släppt. Första provet 02:38Z FÖLL: kamerorna 14 s isär, båda talade — spärren är 10 s sedan kort #127 (13/9), inte 45 s som CLAUDE.md:s invariant säger.
- [x] ✅ **#190 EN ÖPPEN ISSUE PER ETIKETT — KLART 15/9** (DECISIONS #195): `enOppen()` i vakthundens fem egencykel-issuer — omfråga vid tomt svar, äldre dubbletter stängs, träffar i `rad`. #224 stängd som dubblett av #268. Bevis: vakthund deployad 21:41Z; `matvaktprov` 21:43Z: raden `issue matvakt: 1 öppna — bevisat via utfallet: provet kommenterade #268 (kommentar 9), ingen ny issue; själva raden ligger i pg_nets net._http_response och läses inte utifrån` i svaret, 1 öppen mätvaktsissue (#268), ingen ny skapad.
- [x] ✅ **#150 KÄLLVAKTSPÅMINNELSEN — KLART 12/9** (DECISIONS #150): vakthundens check 7. Bengts fråga *"hur får vi veta att vi ska agera"* hade ett svar med noll golv: källvakten skapar ett issue, GitHub skickar notisen, och där slutade det. **Uppmätt: issue #165 låg elva timmar utan påminnelse, källvaktens enda schemalagda körning någonsin (7/9) misslyckades och det märktes inte på fem dygn, och vakthunden nämnde inte `trv-nyhet` med ett ord.** Nu: frist 24 h för 🔴 RÖR OSS, 72 h för 🟡 VET INTE och obedömda, och **⚪ RÖR OSS INTE larmar aldrig** — en vakt som inte kan tystna blir ignorerad. Påminnelsen lyfter bedömningens `Brister:`-rader så man ser vad som står på spel utan att öppna något. Egen etikett, egen cykel, färgar aldrig driftvakthunden röd. **Löser INTE veckotakten** — en tisdagsnyhet hittas ändå först på måndagen; daglig körning kostar debiterade minuter och är ett eget beslut.
- [x] ✅ **#149 NYHETSBEDÖMNINGEN — KLART 12/9** (DECISIONS #149): larmet svarar nu på frågan i stället för att ställa den. Varje källändring slås upp i beroendekartan, matchas mot radernas nyckelord och rubriken bär domen: 🔴 RÖR OSS · 🟡 VET INTE · ⚪ RÖR OSS INTE, med **vad som brister** utskrivet. Tre regler: bedömningen **fäller aldrig ett larm**; "rör oss inte" kräver **positivt bevis** (inga träffar ⇒ VET INTE, aldrig grönt); utan text ingen bedömning — därför sparas hash-källornas text så nästa ändring kan **diffas**. 18 tester, varav fem mot **ordagranna verkliga poster**: PMP3-avvecklingen, två Mesan-poster och BanInfo blir ⚪, men "Uppdaterad portal för API-dokumentation" blir 🟡 — den vägrar gissa. Skarp körning gav samma svar på BanInfo i verkligheten. Kartan flyttad till `publish/beroenden.ts` som ren modul (skriptet kunde inte importeras). Driftvakt för TRV:s objekttyper mot koden — den fällde sitt eget bygge på "tring" ur `objecttype: string`. **Inte byggt, medvetet:** automatiskt genomförande av uppdateringen. Att låta en nyhetstext utlösa en kodändring utan läst diff är inte samma sak som att säga ok till en bedömning. **KALIBRERAD mot 31 verkliga poster före merge (#149 b):** torrkörningen hittade två fel i mitt eget bygge — nyckelordet "öppna data" matchade kanalens NAMN och gav två falska röda, och `includes` gjorde att "api" träffade *rapid* och "cap" träffade *kapacitet*. Rättat till lookbehind på ordbörjan (motorns mönster). Efter rättningen: **0 falska röda**, 19 gula, 12 vita.
- [x] ✅ **#148 KÄLLVAKTEN BREDDAD — KLART 12/9** (DECISIONS #148): sju källor ⇒ **tretton**, och därmed **9 av 9 produktionsberoenden** bevakade (var 1 av 9). Nya: `smhi-uppdateringar` (RSS, 7 poster), `fi-digitraffic`, `no-vegvesen`, `dk-dmi`, `polisen-regler`, `polisen-api` — varje hash-kandidat hämtad **två gånger före inkoppling**, alla stabila. **FYND: SMHI bevakades på fel sida** — vi läste dokumentationssajtens sitemap, men ändringarna annonseras på www.smhi.se, som har egen RSS. De tre senaste posterna lästa för hand: alla rör prognoser/analyser (PMP3, Mesan), **ingen rör metobs/radar/varningar** — vi var inte drabbade, men hade inte vetat. **FYND: DMI:s gamla dokumentation svarar 404 på varje sökväg**, dmiapi.govcloud.dk 503; vår dk-ingest skrevs 31/8, efter pensioneringen 30/6, så vi klarade migreringen genom att komma in efteråt. **FYND: user-agent saknades** i källvaktens egna hämtningar (polisens villkor ger 403) — rättat. **FYND: beroendekartan fällde sitt eget bygge** på fyra odeklarerade signalvärdar. Kvar: den maskinella bedömningen — larmet säger fortfarande "Bedöm: rör det våra källor?".
- [x] ✅ **#147 BEROENDEKARTAN — KLART 12/9** (DECISIONS #147): `scripts/beroendekartan.ts` som eget CI-steg. Läser alla externa värdar **ur koden** och fäller om något hämtas som inte står i kartan (mutationsprov: påhittad värd ⇒ exit 1). **23 externa värdar, 9 produktionsberoenden — 1 bevisat bevakat.** Källvakten (#31) bevakar sju källor, men listan valdes i augusti och följde inte med när radar, moln, FI, NO, DK och polisen tillkom. Två fynd: SMHI-täckningen är **indirekt och oprövad** (vi bevakar dokumentationssajten, hämtar från tre andra värdar), och tre av sju bevakade är omvärld, inte beroenden. Nästa steg: hitta riktiga ändringssignaler för de fem utan signal (FI, NO, DK×2, polisen).
- [x] ✅ **#145 CRLF-GLAPPET STÄNGT — KLART 12/9** (DECISIONS #145): `.gitattributes` med `* text=auto eol=lf`. `bundle-skuggmotor --check` och `bundle-publicera --check` föll ALLTID lokalt på Windows och gick ALLTID igenom i CI — git lagrar LF, Git for Windows sätter `core.autocrlf=true` i sin SYSTEM-config utan att fråga. De två kontrollerna kunde därmed aldrig användas som förkontroll före push. Uppmätt före: 364 av 411 textfiler bar CRLF lokalt. Mätt fil för fil efteråt: 363 ändrade **bara i radslut**, 0 ändrade på annat sätt, **0 binära rörda**, 0 saknade, noll blobbar i historiken ändrade. Undantag: `android/gradlew.bat` behåller CRLF. Bevis: båda bundelkontrollerna gröna lokalt, `npm test` 52/0.
- [x] ✅ **#144 KONTRAKTSGRINDEN — KLART 12/9** (DECISIONS #144, PR-länk i commiten): `scripts/kontraktsgrinden.ts` som eget CI-steg före `npm test`. Hålet: #75:s givarvakt stod ordagrant på **17 ställen i 12 filer utan någon vakt alls** — ändras 12 till 10 i en av dem mäter grindarna olika populationer tyst. Fem kontrakt vaktas (#75, fukten, `BUCKET_S` 1800, `MAX_KM` 50, `K_NEIGHBOURS` 5); alla håller redan. Fuktkontraktet jämför **över språkgränsen** (TS-mängd mot SQL-lista, normaliserad som mängd). Bevis: självtest 5 fall + två mutationsprov mot riktiga repot — `grind-t-a.ts` 12→10 ⇒ exit 1 med avvikaren utpekad, och SQL-listan utan `'dry'` ⇒ exit 1 på drift **inuti en enda fil** (rad 42 mot rad 48). Avsiktliga olikheter som INTE vaktas står i filens huvud: nollpolitiken kring #75 (motorn släpper igenom rader utan lufttemp, grindarna inte) och `MIN_SHARED` (cell-matning 10 mot grind A 20). Husregel i CLAUDE.md: en tröskel som kopieras förs in i grinden i samma commit.
- [x] ✅ **#79 puls-regn-30 AVVECKLAD — KLART 9/9 10:47 (pulsklocka #11 skarp, DECISIONS #89):** Axels "i övrigt kör vi" + Bengts "kör". Överflödig sedan ingest-live deployades (rain_sum_mm varje minut; regn-30 kom bara in i restnischen, #44/#84). Bevisvakten: `avvecklat: puls-regn-30` … `OK puls-regn-30: borta`, 8 cron-jobb kvar, mallen bytt till puls-ingest-grannar FÖRE avvecklingen. −24 debiterade min/dygn. Sista kvittot: ingen regn-30-körning 11:41 (kvällsavläsningen).
- [x] ✅ **#84 ingest-live DEPLOYAD — KLART 9/9 ~05:00, BEVISAT av Axel** (rättelsen PR #76 / DECISIONS #79): SQL-beviset 30 min efter deploy: `vind 844 | regn 907 | sikt 844 | alla 907` (före: vind 0). rain_sum_mm, snö, vind och sikt landar i arkivet varje minut. Luckan 5/9 → 9/9 05:00 är permanent (Trafikverket ger bara senaste mätningen) och redovisas så i grind V-A. Regn-30 (#79) är därmed helt överflödig.
- [x] ✅ **#78 Deploy-knappen LEVER — KLART 9/9 05:20** (DECISIONS #78): SUPABASE_ACCESS_TOKEN i Secrets (Edge Functions: Write, inget annat), deploy-supabase #1 grön 05:20:51 med funktion=vakthund. Från och med nu är "väntar på Axels terminal" borta ur kedjan; en ändring under supabase/functions/ deployas av den som mergar, i samma varv, och beviset är fortfarande mätningen efter deployen (CLAUDE.md-läxan).
- [x] ✅ **#82 bridges.yml: cron bort — KLART 9/9 01:10** (PR #81, DECISIONS #85): mergad till main som d02294c, ci #464 grön 01:02, workflowen på main har bara knappen kvar (--force). 32 tomma schemakörningar à en minut är stoppade; slutbeviset (ingen körning 03:23, gamla schematiden) läses av morgonavläsningen 04:29. ✅ **SLUTBEVIS 9/9 04:30:** ingen schedule-körning 03:23 (gamla schematiden), #32 21:15 8/9 är fortfarande sista.
- [x] 🇳🇴 **NORGE I GRÄNSSNAPSHOTEN** (4/9 15:47, Bengt: "kör gränssnapshoten"): #49-mönstret
  som loop över fi + no i build-snapshot.ts — publicering #621 (e217891): "NO 42 stationer
  inom 40 km av svenska vägnätet (varav 0 kalla nu)", FI 16 som förut. En förare på E8/E10/
  E12/E14 matchas nu mot närmaste station oavsett land. Healthcheckgolv NO 20 (< 20 larmar).
  0 kalla i september är rätt — samma som FI och broarna. Ingen rösttext ändrad (punktkälla).
  DK MEDVETET UTANFÖR: dk.weather_latest bär GRÄSTEMP, inte vägyta (#45) — hade den legat i
  snapshoten hade appen sagt frysrisk på fel grund. In först när Vejdirektoratet svarar.
- [x] 🇳🇴 **NORGE TICKAR — no.weather fylls från Vegvesen DATEX** (4/9 15:24, Bengt +
  Claude, DECISIONS #64): parsern skriven mot MÄTT struktur (rekognosering #28), inte mot
  schemat; strukturvakt som dumpar XML och skriver inget om positionen saknas — den
  behövde aldrig larma (468/468 med koordinater). Puls 17,47 i pg_cron, healthcheckvakt
  på plats. Norden: SE + FI + NO med äkta vägyta, DK grästemp.
- [x] 📏 **TRÖSKELDOKUMENTET — mars-domens måttstock, skriven FÖRE all skuggkod** (1/9,
  Bengt + Claude, DECISIONS #52): docs/TROSKLAR-SKUGGAN.md med tre grindar (A offset-
  modellen, B skuggdriften, C domens giltighet) — #51:s hårda villkor uppfyllt, skugg-
  spårets steg 2–3 olåsta. Samma dag: grind A-mätningen byggd och automatisk varje söndag,
  larmvägen bevisad hela kedjan (avsiktligt rött jobb → mejl framme hos Bengt), rökprovet
  kört (felgradienten följer teorin), strategimejlet med länken hos Axel. Kvar hos Axel:
  fastställandet (eget kort under hans beslut).

- [x] ✅ **SJÄLVVÄCKNINGEN FUNGERAR I FÄLT** (31/8 15:51, Bengts telefon, första försöket):
  0.3.2 startade vakten själv utan att han rörde telefonen. DECISIONS #40 bevisat samma dag
  det byggdes. Kvar i morgon: rösten i CarPlay, bannern, självstoppet.
- [x] 🇩🇰 **DANSKA TESTBILARNA KÖR** (31/8 kväll): DMI + trafikkort, 20 rutter, cron, kartan.
  Grästemp som frysproxy — beslut till Axel (#45). Norge förberett, väntar på Vegvesen.
- [x] 🇫🇮 **FINSKA TESTBILARNA KÖR** (31/8 kväll): tre rutter var 30:e min mot finsk snapshot,
  SE/FI-växel på testbilarna.html. Bonusfynd: skuggmotorn körde gammal motor — nu buntad
  ur engine/src med CI-vakt (DECISIONS #43).
- [x] 🇫🇮 **FINSKT SKUGGARKIV LIVE** (31/8 kväll): schema fi, Fintraffic var 30:e min, 526
  stationer + trafikmeddelanden, isolerat från Sverige. Facit börjar tickas innan produkten finns.
- [x] 🚀 **0.3.2 (5) UPPLADDAT** (31/8 ~14:50) — hela dagens batch: olyckslyftet, heads-up,
  senast sagt, introduktionen, Siri, självstopp, självväckning + parkeringsstaket. Bengt
  testar ikväll med CarPlay (docs/TEST-BENGT-0.3.2.md). 0.3.1 (4) laddades upp strax före
  med samma kod minus självväckningen.

- [x] **#33 Arkivbordet LIVE** (31/8): situation_archive tar emot vinterfacit från båda
  ingestvägarna, missmätningen läser det, bruset utestängt, fött låst. Djur på vägbanan och
  stoppade fordon sparas från idag — #32 får underlag innan beslutet.

- [x] 🔒 **#30 RLS-LÅSET** (31/8, Bengts issue #3): anon-nyckeln kunde läsa 8 arkivtabeller
  och SKRIVA i dem (PATCH 204). Nu dubbellåst — RLS + REVOKE — på alla elva. Bevisat: 401
  överallt, väntelistan 201, pipelinen grön. DECISIONS #32.
- [x] **Gravstensläckan tätad + städad** (31/8): raderingar är UPDATE, aldrig INSERT, i båda
  ingestvägarna; edge-funktionen deployad; 4 587 gravstenar exporterade och raderade.
  Tabellen: 308 rader, alla olyckor.
- [x] **#28 tröskeln avgjord: 5** (31/8) — tvåsteget bara vid "Mycket stor påverkan".
  v17 bevisar att 4 är lindrig. DECISIONS #30a.

- [x] **Kronjuvelerna säkrade** (31/8): ny upload-nyckel i Lagerlöf Labs namn, lösenord i Apples Lösenord-app, jks i iCloud Drive/Halkvakt-nycklar, CI-secrets roterade
- [x] 🚀 **HALKVAKT 0.3.0 (3) UPPLADDAT TILL APP STORE CONNECT** (mån 31/8 ~10:10) — 90 min från
  kontoköp till inlämnat bygge. Varv som krävdes: team-cache (omstart), version 1.0→0.3.0
  (plist-koppling), iPad-orienteringar (iPhone-only). Nästa: Apples behandling → TestFlight.
- [x] **APPLE DEVELOPER KÖPT** (mån 31/8 09:37, 999 kr, order W1845082767) — via WEBBEN
  (appen krävde körkort; webbvägen ställde ingen ID-fråga = läxa för nästa app).
  AKTIVERAT 09:55 (18 min efter köpet — webbvägen levererar). Förberett: iOS-appikon (spegel av Android), export­-
  compliance-nyckel, TestFlight-guide i MAC-GUIDE. Utgivarnamn BESLUTAT: Lagerlöf Labs (DECISIONS #29).
- [x] **BENGT UPPKOPPLAD** (30/8, live under pappasamtalet): Claude-appen installerad på
  Axelstar-kontot (All repositories ⇒ täcker även framtida repon), Bengts GitHub-koppling
  omkopplad, läs-testet mot docs/VALKOMMEN-BENGT.md godkänt. 404-gåtan stängd —
  projektet har nu två uppkopplade Lagerlöfar.
- [x] **SKUGGFLOTTAN 20 BILAR + RAPPORTSIDAN** (Axels idé 29/8): skuggmotorn utökad 3→20 rutter
  över hela Sverige (E4 i sex etapper, E6, E10 Kiruna, E14 fjället, E18, Rv40, Rv70), rotation
  3 rutter/varv (CPU-taket), fotobudget 5/varv. Publik rapportsida visar allt bilarna "hört":
  https://axelstar.github.io/halkvakt-karta/testbilarna.html — Norrlandsbilen larmade
  på första varvet (E4 Umeå→Luleå, 2 varningar)
- [x] 🏆 **HALKVAKT KÖR PÅ iOS** — första Mac-bygget genomfört lördag 29/8 18:04, två dygn före schemat: Xcode 26.1-verkstad från noll, EN byggfix (Swift-typning), appen live på Axels iPhone med färsk snapshot ("väglag 17:37" = åldersvakten + pulsklockan i drift). Kvar till måndag: bara konton + TestFlight
- [x] **macOS 15.7.9 installerat** på Axels MacBook Air (skärmbildskvitto 29/8 17:00) — Xcode 26.1-vägen öppen
- [x] **Pipelinen räddad** — GitHub-cron svälte publiceringen (5 h-stopp, 13 h-hål uppmätta); Supabase-pulsklockan trycker nu på dispatch-knapparna (*/30 + timvis). Vilt VERIFIERAT live på CDN (2 st i wildlife-arrayen)
- [x] **Healthcheckens koppel lagat** — larmade rätt men `| tee` åt exit-koden; pipefail på ⇒ rött jobb ⇒ mejl. Läxa: prova larmvägen, inte bara vakten
- [x] **📖 PRODUKTBOKEN** (`docs/PRODUKTBOK.md`) — produkten genom användarens ögon: skärmbilder, exakta röstfraser, två flödesdiagram; levande dokument med egen regel i protokollet
- [x] **#19 Missmätningsskriptet** — arkivhändelser × rekonstruerade hazards × riktiga motorn; träffar/missar per vecka; augustikörning verifierad (0 händelser = rent); knapp: Actions → "missar"
- [x] **#20 Skuggmotorn LIVE** — var 30:e min: motorn körs mot tre Skånerutter, loggar till shadow_log, arkiverar väglagskamerabild vid varning (facit-hinken). Provkört: 1 955 fixar E22, ärlig augustinolla
- [x] **#17 Vilt in i snapshoten** — polisen_events (48 h, med position) → wildlife-array → alla tre parsrar; TS-prov + bakåtkompatibilitet; motorbeteendet var redan vektorbevisat (v13)
- [x] **Bengts granskning II bokförd** — arkivlagret = repots styrka; prognosfrihet nu dokumenterat val (#25); kamerafacit+skuggmotor = #20; retention löses löftesrent via Play-statistiken
- [x] **Tavelregeln** inristad i CLAUDE.md — varje varv slutar med tavelsynk
- [x] **Bengt fullt ombord** — konto `895845` bekräftat i praktiken: committar dokument, granskar kod på radnivå (åldersvakts-fyndet!)
- [x] **Åldersvakten** (Bengts granskning): appen läser generated_at, filtrerar gammalt väglag, säger till EN gång — Android + iOS + prov
- [x] **docs/SYSTEM.md** — systembeskrivningen med "vad systemet inte gör" + månadsdisciplin

- [x] **Android-appen tekniskt släppfärdig** — v0.3.0, signerad AAB 2,55 MB byggs i CI varje push
- [x] **iOS-appen skriven** — SwiftUI-spegel av Android, väntar på första Mac-bygget
- [x] Butiksmaterial klart: texter, feature graphic, ikon, skärmdumpar (fotostudion)
- [x] Data safety-svaren förskrivna (`docs/PLAY-DATASAFETY.md`)
- [x] Integritetspolicyn live + länkad överallt
- [x] Signeringsnyckeln skapad, krypterad i CI + Axels kopia levererad
- [x] Pappa collaborator med Write + välkomstdokument
- [x] Pappas synergianalys bokförd + **beslut: v1 lanseras utan datainsamling** — sensortrappan = strategi, inte MVP (Axel 28/8)
- [x] Kö-slut beslutad som uppdatering 1 (TrafficFlow verifierad 43 s färsk)
- [x] Mobilvideo 720p-fixen på sajten
- [x] Presskit + livemotor härdad + webbåldersvakt

---

*Djupare detaljer: BACKLOG.md (teknisk kö) · STATUS.md (varvlogg) · DECISIONS.md (vägval).
Tavlan är människornas lager ovanpå dem.*

