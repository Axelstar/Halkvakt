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

## Vad appen faktiskt skickar (läst ur koden 20/9, inte ur minnet)

| Utgående anrop | När | Innehåll | Sker för |
| :-- | :-- | :-- | :-- |
| `GET` snapshot + `manifest.json` (GitHub Pages) | var tionde minut när vakten är på | inget — ingen query, ingen identifierare | alla |
| `POST` facit-svar (Supabase edge function) | **bara** när föraren tryckt *Stämde/Stämde inte*, och bara när bilen står stilla eller appen öppnas | `{id, t, svar, app, ver}` — varningens id (`wx:2135`, `seg:16010`, `cam:…`), varningens klockslag, ja/nej, plattform, appversion | **bara betatestare som själva slagit på BETATEST** |

`FacitSender.swift` / `FacitSender.kt`, `Facit.body()`, `supabase/functions/facit-svar/index.ts`, `sql/022`.
**Ingen identitet, ingen kontonyckel, ingen resa, ingen koordinat.** Men ärligt: ett varnings-id pekar på en
fara med koordinat och `t` säger när — **ett svar är alltså ungefär en plats och en tid.** Det står ordagrant
i appens Om-avsnitt och i produktboken (Axels krav, DECISIONS #196), och knappen är AV tills testaren slår på
den själv.

## Grundfrågorna

| Fråga | Svar | Motivering |
| :-- | :-- | :-- |
| Does your app collect or share any of the required user data types? | **Yes** | Facitsvaret. Allt annat i appen samlar fortfarande ingenting. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | HTTPS hela vägen (`https://…supabase.co/functions/v1/facit-svar`). |
| Do you provide a way for users to request that their data is deleted? | **🔑 OBESVARAD — se nedan** | Kräver ett beslut, och möjligen ett bygge. |

## Datatypen, rad för rad i formuläret

| Fält | Svar | Motivering |
| :-- | :-- | :-- |
| Data type | **Location → Approximate location** | Varnings-id + klockslag pekar ut ungefär var föraren var. Vi skickar ingen koordinat, men Googles fråga är vad som lämnar enheten och vad det säger — inte vilket format det har. **Precise location: Nej.** |
| Collected | **Ja** | Det lagras i `driver_facit`. |
| Shared | **Nej** | Lämnar aldrig vår databas; tabellen är dubbellåst (RLS utan policy + REVOKE, `sql/022`) och läses aldrig via REST. |
| Processed ephemerally | **Nej** | Det sparas — det är hela poängen med facit. |
| Required or optional | **Optional** | Brytaren BETATEST är AV som standard; svaret kräver dessutom ett tryck per varning. |
| Purposes | **App functionality** + **Analytics** | Svaren mäter om varningarna stämde, och det är det enda de används till (regel T: facit utlöser ingenting, det bara mäter). |
| Linked to the user's identity | **Nej** | Ingen identifierare skickas eller lagras — ingen konto-id, ingen enhets-id, ingen IP. |
| Used for tracking | **Nej** | Ingen koppling till annonsering eller annan app. |

**App version** (`ver`) skickas också. Den är inte en av Googles obligatoriska datatyper i sig och deklareras
inte separat — den bär ingenting om användaren. Nämns här så att granskaren ser att den är känd, inte glömd.

## 🔑 Den enda frågan som inte är besvarad — radering

Formuläret frågar om användaren kan begära radering av sin data. **Vi har ingen sådan väg, och vi kan inte ha
en i dag:** ingenting i ett facitsvar identifierar avsändaren, så det går inte att peka ut "mina rader".
Det är bra för integriteten och obekvämt för formuläret.

Tre vägar, ingen vald (Bengt + Axel, före första uppladdningen):
1. **Svara "Nej"** och förklara i policyn varför: det finns ingen identifierare, alltså inget att peka på.
   Ärligt, och Google tillåter Nej. Testaren kan när som helst slå av BETATEST och sluta skicka.
2. **Radera allt på begäran** — en testare hör av sig, vi tömmer hela tabellen för den perioden. Trubbigt;
   det skulle förstöra facit för alla andra.
3. **Ge varje telefon ett slumpat facit-id** så att radering blir möjlig. Löser formuläret men **inför en
   identifierare där det i dag inte finns någon** — det gör appen sämre på det den är bäst på. Avråds.

**Rekommendation: 1.** Men det är ett ägarbeslut, och det ska stå i policyn samtidigt som det står i formuläret.

## Måste ändras i SAMMA veva — integritetspolicyn ljuger också

`integritet.html` i `Axelstar/halkvakt-karta` (publicerad, och den URL Google kräver i butiksfältet) säger
fortfarande:

- *"Kärnlöftet: din position lämnar aldrig telefonen."*
- *"Vad vi samlar in — **Ingenting.** … skickar aldrig din position, dina resor eller något annat om dig till
  oss eller någon annan."*

**Google jämför formuläret mot policyn.** Står det olika saker i dem är det ett avslag som ser ut som slarv.
Policyn måste få ett eget stycke om facitsvaret — vad det innehåller, att det är frivilligt och av som
standard, och att det säger ungefär var och när. Utkast finns; texten är Axels att godkänna, för det är ett
publikt löfte.

## Behörighetsdeklarationer (görs i samma veva)

- **Bakgrundsposition:** kräver videodeklaration + motivering. Text och manus: `docs/PLAY-BACKGROUND-LOCATION.md`.
  Kärnargument: förgrundstjänst med pågående notis, röstvarningar under körning med släckt skärm.
- **Foreground service (location):** deklareras med typ `location` — redan satt i manifestet.

## Butiksfältens integritetslänkar

- Privacy policy URL: `https://axelstar.github.io/halkvakt-karta/integritet.html`

---

*Regel (den som brast 16/9): ändras appens utgående trafik måste **formuläret, policyn, produktboken och den
här filen** ändras i SAMMA commit. Det var inte en glömd fil — det var en ändring som passerade fyra
dokument utan att röra något av dem.*
