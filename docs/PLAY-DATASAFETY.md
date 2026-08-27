# Play Console — Data safety-formuläret (färdiga svar)

Syfte: den dag kontot är godkänt ska formuläret kunna fyllas i på fem minuter
utan tankearbete. Svaren nedan speglar appens faktiska beteende i v0.3.0 och
integritetspolicyn (axelstar.github.io/halkvakt-karta/integritet.html).

## Grundfrågorna

| Fråga | Svar | Motivering |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | Ingen data samlas in eller delas. Position används endast lokalt på enheten och lämnar aldrig telefonen. Snapshot-hämtningen är anonym GET utan identifierare. |
| Is all of the user data collected by your app encrypted in transit? | (visas ej när svaret ovan är No) | All nätverkstrafik är ändå HTTPS. |
| Do you provide a way for users to request that their data is deleted? | (visas ej) | Ingen data finns att radera; lokal historik försvinner vid avinstallation. |

## Varför "No" är sant (granskarens checklista mot koden)

- **Position:** ACCESS_FINE/BACKGROUND_LOCATION används för lokal matchning i
  GuardService/Nearby. Ingen position skickas i något nätverksanrop (enda
  utgående trafik: GET av snapshot/meta från GitHub Pages, utan query-parametrar).
- **Identifierare:** appen har inga konton, ingen inloggning, ingen AdID-användning,
  inga tredjeparts-SDK:er för analys/annonser/krascher.
- **Varningshistorik:** lagras i appens privata DataStore, endast lokalt.
- **IP-adress i serverloggar:** GitHub Pages/Supabase standardloggar är
  infrastrukturens, inte appens insamling — Googles definition av "collect"
  undantar ephemeral processing/vanliga åtkomstloggar som inte används för
  spårning. Vi läser eller lagrar dem inte.

## Behörighetsdeklarationer (görs i samma veva)

- **Bakgrundsposition:** kräver videodeklaration + motivering. Text och manus:
  docs/PLAY-BACKGROUND-LOCATION.md (redan skrivet). Kärnargument: förgrunds-
  tjänst med pågående notis, röstvarningar under körning med släckt skärm.
- **Foreground service (location):** deklareras med typ `location` — redan satt
  i manifestet.

## Butiksfältens integritetslänkar

- Privacy policy URL: `https://axelstar.github.io/halkvakt-karta/integritet.html`

*Uppdateras om appens datainsamling någonsin ändras — då måste formuläret,
policyn och denna fil ändras i SAMMA commit.*
