# Anmälan till Trafikverket: sju väderstationer rapporterar fysiskt omöjlig yttemperatur

**Datum:** 2026-09-21
**Avsändare:** Lagerlöf Labs (Halkvakt) — [kontaktuppgifter fylls i före utskick]
**Gäller:** öppna data, `WeatherMeasurepoint` / `WeatherObservation`, fältet för vägytans temperatur
(`Surface.Temperature`)
**Observationsfönster:** 24 augusti–21 september 2026 (349 141 observationer med både yt- och lufttemperatur
från 715 stationer)

---

## Sammanfattning

Vi läser Trafikverkets öppna väderdata löpande. I materialet 24 augusti–21 september 2026 rapporterar **sju
stationer** en yttemperatur som ligger fysiskt omöjligt långt under stationens egen lufttemperatur. Felen är
av två slag:

1. **Sex stationer** rapporterar tidvis en yttemperatur på **−34 till −50 °C** medan luften är +9 till +17 °C
   — ett värde som ser ut som en urkopplad eller felande givare. Mellan de stunderna rapporterar samma
   stationer yttemperaturer under noll vid lufttemperaturer kring +10 °C.
2. **Station 1106 Ö Ljungby** har ett annat mönster: yttemperaturen följer lufttemperaturen men ligger
   **omkring 12 °C för lågt**, dygnet runt, i 24 av fönstrets dygn. Den 19–21 september visade stationen
   en vägyta på +1 till +3 °C medan luften var +13 till +15 °C, daggpunkten +8 till +13 °C och det regnade.

Vi gör inget anspråk på att veta **var** felet sitter — givare, montering, kalibrering eller överföring. Vi
rapporterar vad som syns i de öppna data vi hämtar.

---

## Stationerna

| Stations-id | Namn | WGS84 (lat, lon) | Observationer med yta ≥ 8 °C under luften | Dygn | Observationer med yta ≤ −40 °C | Lägsta yta (°C) | Högsta lufttemperatur vid felet (°C) | Period |
| :-- | :-- | :-- | --: | --: | --: | --: | --: | :-- |
| 1106 | Ö Ljungby | 56,18141 · 13,02323 | **1 687** | **24** | 0 | +0,1 | 19,2 | 27/8–21/9 |
| 2346 | Ollsta | 63,43446 · 15,12360 | 228 | 26 | 53 | **−50,0** | 19,8 | 24/8–21/9 |
| 2135 | Storvik | 60,57883 · 16,53741 | 224 | 24 | 34 | −49,8 | 19,1 | 25/8–21/9 |
| 1612 | Fagersanna | 58,46764 · 14,30406 | 214 | 1 | 26 | −48,6 | 17,0 | 14/9 |
| 2132 | Testeboån | 60,74456 · 17,08122 | 77 | 2 | 3 | −49,2 | 16,4 | 20–21/9 |
| 1713 | Bolhyttan | 59,68510 · 14,07169 | 18 | 8 | 4 | −49,1 | 16,6 | 2–20/9 |
| 1302 | Kullavik | 57,55060 · 11,96758 | 13 | 1 | 3 | −46,7 | 14,9 | 10/9 |

**För jämförelse:** i hela materialet finns 2 362 observationer där luften är minst +8 °C och ytan ligger minst
8 °C under den. De kommer från **nio av 715 stationer** — de sju ovan står för nästan alla, och två stationer
har en enstaka sådan observation vardera.

---

## Den tydligaste enskilda observationen per station

Alla tidpunkter i UTC. För de sex första är den visade observationen den med störst skillnad *utan* att
yttemperaturen ligger under −40 °C — alltså inte de allra mest extrema värdena, utan de som ligger närmast att
se rimliga ut.

| Station | Tidpunkt (UTC) | Yta (°C) | Luft (°C) | Daggpunkt (°C) | Skillnad luft − yta (°C) |
| :-- | :-- | --: | --: | --: | --: |
| 2135 Storvik | 2026-09-19 19:05 | −39,4 | 15,3 | 12,8 | 54,7 |
| 1612 Fagersanna | 2026-09-14 04:55 | −39,6 | 13,0 | 12,9 | 52,6 |
| 2346 Ollsta | 2026-08-31 13:25 | −39,8 | 11,9 | 11,4 | 51,7 |
| 2132 Testeboån | 2026-09-21 13:30 | −38,3 | 11,9 | 10,5 | 50,2 |
| 1713 Bolhyttan | 2026-09-02 04:15 | −34,0 | 13,3 | 12,2 | 47,3 |
| 1302 Kullavik | 2026-09-10 06:40 | −36,7 | 8,6 | 7,9 | 45,3 |
| 1106 Ö Ljungby | 2026-09-19 19:40 | +3,9 | 17,1 | 14,9 | 13,2 |

---

## Varför Ö Ljungby är det allvarligaste fallet

De sex första stationernas värden är så extrema att de är lätta att filtrera bort. **Ö Ljungby är svårare:**
värdena ser rimliga ut var för sig. En vägyta på +1,3 °C är fullt möjlig — bara inte när luften är +13 °C och
det regnar. Felet syns först när yttemperaturen ställs mot stationens egen luft- och daggpunktstemperatur.

För en tjänst som varnar för frysrisk betyder det att stationen ser ut att ligga precis vid fryspunkten en regnig
septembernatt. Stationen ligger vid E4 i Skåne.

---

## Metod

1. Varje observation med både yt- och lufttemperatur jämförs med sig själv: skillnaden luft − yta.
2. En observation räknas som orimlig när **luften är minst +8 °C och ytan ligger minst 8 °C under den.**
   En vägyta kan vara kallare än luften — vid utstrålning klara nätter, eller när varm luft drar in över en
   frusen väg — men i vårt material ligger övriga stationers observationer med yta under +3 °C inom 5 °C
   från lufttemperaturen. Undantagen är en enstaka observation vardera på tre andra stationer (2518
   Vassijaure, 1327 Kärragärde, 2004 Ryggen), som vi bedömer som tillfälliga störningar och inte anmäler.
3. Inget i metoden bygger på grannstationer eller väderläge. Slutsatsen vilar på stationens **egna** värden,
   mätta i samma ögonblick.

---

## Vad vi ber om

1. En kontroll av de sju stationernas ytgivare — i första hand **1106 Ö Ljungby**, vars fel inte syns utan
   jämförelse mot lufttemperaturen.
2. Besked om −40…−50 °C är en känd fel- eller sentinelkod för yttemperaturen. Om den är det: vilket värde
   betyder vad, så att konsumenter av öppna data kan filtrera bort det själva.
3. Om stationerna redan är kända som felande: en upplysning om var sådana uppgifter publiceras.

---

## Reservationer

- Vi ser bara de öppna data vi hämtar, inte råsignalen från givaren.
- Fönstret är 29 dygn i sensommar och tidig höst. Vi har inga vintermätningar än och kan inte säga om felen
  är säsongsberoende.
- Vårt arkiv sparar främst observationer vid kall yta, nederbörd eller temperaturändring, och glesas ut efter sju
  dygn. Antalen ovan är därför **lägsta** antal — stationerna kan ha fler orimliga observationer än vi ser, men
  inte färre.
- Vi använder yttemperaturen i en trafiksäkerhetstjänst under utveckling och har infört spärrar som tystar en
  station medan felet pågår. Anmälan görs för att felet bör vara känt hos källan, inte för att vi är blockerade.

---

*Underlag: `scripts/matningar/anmalan-ytgivare-2026-09-21.sql` (körning 35636721808) och
`scripts/matningar/givarvakt-kandidater-2026-09-21.sql` (körning 35635487945). Skickas via Datautbytesportalens
kontaktformulär, data.trafikverket.se/about-us/contact, ärendetyp API Öppna Data — inte med e-post
(datex@trafikverket.se studsar, DECISIONS #294).*
