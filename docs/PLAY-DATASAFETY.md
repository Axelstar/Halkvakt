# Play Console — Data safety-formuläret (färdiga svar)

Syfte: den dag kontot är godkänt ska formuläret kunna fyllas i på fem minuter utan tankearbete.

> ⚠️ **OMSKRIVEN 20/9 2026 (kort #214, DECISIONS #264 — Axels beslut).** Den här filen svarade **"No"**
> på insamlingsfrågan fram till i dag. Det var sant när den skrevs 27/8 och **osant sedan 16/9**, då
> förarfacit (S4, DECISIONS #201) började POSTa varnings-id och klockslag. En osann deklaration är grund
> för avslag eller nedtagning — och den hade kommit mitt i vinterns enda facitfönster.
>
> **Produktinvariantens nya lydelse (Axel 20/9):** *ingen positionsdata lämnar telefonen automatiskt.
> Matchningen sker på telefonen mot nedladdade snapshots. Det enda som någonsin skickas är ett facitsvar
> som föraren själv trycker på — och det bär varnings-id och klockslag, alltså ungefär var och när.*

> **29/10 (DECISIONS #746): appstatistiken finns bara i iOS-appen.** Android skickar ingenting nytt, så svaren här är
> oförändrade. Kommer statistiken till Android ska formuläret få *App activity → App interactions*, inte kopplat till
> användaren, ändamål *Analytics*, och raden nedan.

## Vad appen faktiskt skickar (läst ur koden 20/9, inte ur minnet)

| Utgående anrop | När | Innehåll | Sker för |
| :-- | :-- | :-- | :-- |
| `GET` snapshot + `manifest.json` (GitHub Pages) | var tionde minut när vakten är på | inget — ingen query, ingen identifierare | alla |
| `POST` facit-svar (Supabase edge function) | **bara** när föraren tryckt *Stämde/Stämde inte*, och bara när bilen står stilla eller appen öppnas | `{id, t, svar, app, ver}` — varningens id (`wx:2135`, `seg:16010`, `cam:…`), varningens klockslag, ja/nej, plattform, appversion | **bara betatestare som själva slagit på BETATEST** |
| `POST` facit-svar — **miss** (kort #203 lager 2) | **bara** när föraren markerat *Appen missade* (knapp eller Siri) OCH efter resan valt vad det var, och bara när bilen står stilla eller appen öppnas | `{miss, t, vad, station, segment, app, ver}` — klockslaget, förarens val (halka/vatten/vilt/olycka/annat), närmaste mätstation (`wx:2135`), närmaste halkavsnitt inom 2 km (`seg:16010` eller null), plattform, appversion | **bara betatestare som själva slagit på BETATEST** |

`FacitSender.swift` / `FacitSender.kt`, `Facit.body()`, `supabase/functions/facit-svar/index.ts`, `sql/022`.
**Ingen identitet, ingen kontonyckel, ingen resa, ingen koordinat.** Men ärligt: ett varnings-id pekar på en
fara med koordinat och `t` säger när — **ett svar är alltså ungefär en plats och en tid.** Det står ordagrant
i appens Om-avsnitt och i produktboken (Axels krav, DECISIONS #196), och knappen är AV tills testaren slår på
den själv.

**Betatest bara för testare (DECISIONS #681, 22/10).** Från iOS 0.3.13 (33) syns Betatest och facitfrågan bara i TestFlight och i
utvecklarbyggen, och i ett App Store-bygge gäller inte en brytare som slagits på i en äldre version (`Prefs.betatestTillaten`).
Android har samma spärr sedan **PR #1159, sammanslagen 23/10** (b4f68bc6): en byggflagga (`-Phalkvakt.betatest`,
`BuildConfig.BETATEST_TILLATEN`), och `android.yml` bygger produktionens AAB med `betatest=false`. Där syns varken brytaren eller
raden i Integritet, och en påslagen brytare gäller inte (`Prefs.betatestPa`). Testbyggena har Betatest.

## Grundfrågorna

| Fråga | Svar | Motivering |
| :-- | :-- | :-- |
| Does your app collect or share any of the required user data types? | **Yes** | Facitsvaret. Allt annat i appen samlar fortfarande ingenting. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | HTTPS hela vägen (`https://…supabase.co/functions/v1/facit-svar`). |
| Do you provide a way for users to request that their data is deleted? | **No** | Ingen identifierare finns, så ingens svar kan pekas ut. Beslutat 26/9 (DECISIONS #378) — se nedan. |

## Datatypen, rad för rad i formuläret

| Fält | Svar | Motivering |
| :-- | :-- | :-- |
| Data type | **Location → Approximate location** | Varnings-id + klockslag pekar ut ungefär var föraren var. Vi skickar ingen koordinat, men Googles fråga är vad som lämnar enheten och vad det säger — inte vilket format det har. **Precise location: Nej.** |
| Collected | **Ja** | Det lagras i `driver_facit` (svaren) och `driver_miss` (missarna, sedan 26/9 — samma uppgiftsklass: ungefär var och när). |
| Shared | **Nej** | Lämnar aldrig vår databas; tabellen är dubbellåst (RLS utan policy + REVOKE, `sql/022`) och läses aldrig via REST. |
| Processed ephemerally | **Nej** | Det sparas — det är hela poängen med facit. |
| Required or optional | **Optional** | Brytaren BETATEST är AV som standard; svaret kräver dessutom ett tryck per varning. |
| Purposes | **App functionality** + **Analytics** | Svaren mäter om varningarna stämde, och det är det enda de används till (regel T: facit utlöser ingenting, det bara mäter). |
| Linked to the user's identity | **Nej** | Ingen identifierare skickas eller lagras — ingen konto-id, ingen enhets-id, ingen IP. |
| Used for tracking | **Nej** | Ingen koppling till annonsering eller annan app. |

**App version** (`ver`) skickas också. Den är inte en av Googles obligatoriska datatyper i sig och deklareras
inte separat — den bär ingenting om användaren. Nämns här så att granskaren ser att den är känd, inte glömd.

## ✅ Radering — besvarad 26/9: Nej (väg 1, DECISIONS #378)

Formuläret frågar om användaren kan begära radering av sin data. **Vi har ingen sådan väg, och vi kan inte ha
en i dag:** ingenting i ett facitsvar identifierar avsändaren, så det går inte att peka ut "mina rader".
Det är bra för integriteten och obekvämt för formuläret.

Tre vägar prövades (Bengt + Axel, före första uppladdningen) — **väg 1 vald 26/9** (Bengts *"gör 214"*):
1. **Svara "Nej"** och förklara i policyn varför: det finns ingen identifierare, alltså inget att peka på.
   Ärligt, och Google tillåter Nej. Testaren kan när som helst slå av BETATEST och sluta skicka.
2. **Radera allt på begäran** — en testare hör av sig, vi tömmer hela tabellen för den perioden. Trubbigt;
   det skulle förstöra facit för alla andra.
3. **Ge varje telefon ett slumpat facit-id** så att radering blir möjlig. Löser formuläret men **inför en
   identifierare där det i dag inte finns någon** — det gör appen sämre på det den är bäst på. Avråds.

**Vald: 1.** Det ska stå i policyn samtidigt som i formuläret. Policyn sade redan *"vi kan inte heller plocka fram just dina"*; den
ska säga vad det betyder för radering. **Gjort 1/10** (rättat här 22/10; raden sade att texten väntade på Axel): Claude förde in de tre
ändringarna nedan i `integritet.html` i karta-repot (commit b9626bf, DECISIONS #432), med datumraden *gäller från 2026-10-01*, dagen
den publicerades, i stället för utkastets 26/9. Texten som den skrevs 26/9:

- Byt meningen *"Svaren kan därför inte kopplas till dig, och vi kan inte heller plocka fram just dina."* mot:
  > Svaren kan därför inte kopplas till dig, och vi kan inte heller plocka fram just dina — alltså inte heller radera just dina på begäran. Du bestämmer ändå: slår du av <i>Betatest</i> slutar appen skicka direkt, och det som sparats i telefonen försvinner när du avinstallerar appen.
- **Missarna (kort #203 lager 2, DECISIONS #379)** — i listan under *"Då skickas:"*, efter punkten om svaret, en punkt till:
  > när du markerat att appen missade något och sedan valt vad det var: klockslaget, närmaste mätstation (och vägsträcka inom 2 km)
  > och ditt val. <b>Det säger också ungefär var du var och när.</b>
- Byt datumraden *"GÄLLER FRÅN 2026-09-23 · FÖREGÅENDE VERSION 2026-08-26"* mot *"GÄLLER FRÅN 2026-09-26 · FÖREGÅENDE VERSION
  2026-09-23"* — policyn lovar själv att datumet flyttas när den ändras.

## ✅ Integritetspolicyn — omskriven 23/9 (DECISIONS #320), raderingsmeningen införd 1/10 (#432)

*Rättat 22/10: stycket sade att policyn "fortfarande" lovar Ingenting och att texten väntar på Axel.* `integritet.html` i
`Axelstar/halkvakt-karta` (den URL Google kräver i butiksfältet) sade fram till 23/9:

- *"Kärnlöftet: din position lämnar aldrig telefonen."*
- *"Vad vi samlar in — **Ingenting.** … skickar aldrig din position, dina resor eller något annat om dig till
  oss eller någon annan."*

Den skrevs om 23/9 (karta-repot a2b7981, DECISIONS #320): ingen position lämnar telefonen av sig själv, och undantaget är
betatestets facitsvar, med vad det bär (varnings-id, klockslag, svar, plattform, version) och vad det inte bär. 1/10 kom
raderingsmeningen, missarna och datumraden ovan (b9626bf, #432), och 19/10 en punkt om sparade resor (halkvakt-karta#8, #635),
*gäller från 2026-10-19*.

**Google jämför formuläret mot policyn.** Står det olika saker i dem är det ett avslag som ser ut som slarv.

**Sparade resor (kort #357, 18/10).** En förare som slår på *Erbjud att spara resor* kan spara en körd väg. Den lagras bara i
telefonen (`noBackupFilesDir`, utesluten också vid flytt till en ny telefon) och lämnar den aldrig, så formuläret ändras inte:
Google räknar bara det som lämnar enheten. Deklarationen för bakgrundsposition sa att inget lagras och är rättad.

## Behörighetsdeklarationer (görs i samma veva)

- **Bakgrundsposition:** kräver videodeklaration + motivering. Text och manus: `docs/PLAY-BACKGROUND-LOCATION.md`.
  Kärnargument: förgrundstjänst med pågående notis, röstvarningar under körning med släckt skärm.
- **Foreground service (location):** deklareras med typ `location` — redan satt i manifestet.

## Butiksfältens integritetslänkar

- Privacy policy URL: `https://axelstar.github.io/halkvakt-karta/integritet.html`
  — samma adress som båda apparna länkar till (`android/app/src/main/kotlin/se/halkvakt/app/ui/Skinn.kt:586`,
  `ios/HalkvaktApp/Sources/HalkvaktApp.swift:178`; kontrollerat 22/10). Sedan 13/10 svarar github.io-adressen 301 till
  `https://halkvakt.se/integritet.html` (karta-repots egen domän, DECISIONS #559, tillägget 14/10), och App Store-texten anger
  halkvakt.se-adressen (`marknadsforing/butik/appstore-ios.md:48`). Båda når samma sida.

---

*Regel (den som brast 16/9): ändras appens utgående trafik måste **formuläret, policyn, produktboken och den
här filen** ändras i SAMMA commit. Det var inte en glömd fil — det var en ändring som passerade fyra
dokument utan att röra något av dem.*
