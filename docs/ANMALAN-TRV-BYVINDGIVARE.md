# Anmälan till Trafikverket: nio väderstationer rapporterar fysiskt omöjlig byvind

**Datum:** 2026-09-13
**Avsändare:** Lagerlöf Labs (Halkvakt) — [kontaktuppgifter fylls i före utskick]
**Gäller:** öppna data, `WeatherMeasurepoint` / `WeatherObservation`, fältet
`Aggregated30minutes.Wind.SpeedMax`
**Observationsfönster:** 4–13 september 2026 (115 987 observationer med byvind från 751 stationer)

---

## Sammanfattning

Vi läser Trafikverkets öppna väderdata löpande. I materialet 4–13 september 2026 rapporterar **nio
av 751 stationer** byvindvärden som är fysiskt omöjliga: byvindar på 23,8–87,7 m/s samtidigt som
stationens egen medelvind ligger på 0,4–2,1 m/s. Ingen av stationerna ligger i ett väderläge som
kan förklara talen, och ingen granne rapporterar något liknande.

Station **2312 Handöl** rapporterar **85,5 m/s** — högre än Sveriges uppmätta rekord (ca 81 m/s, och
då på fjällstation) — och station **426 Oxelösund** rapporterar **87,7 m/s** vid en kustnära
vägstation i september. Talen är inte enstaka utslag: Handöl har 29 sådana timmar spridda över hela
perioden.

Vi gör ingen anspråk på att veta **var** felet sitter — givare, dataöverföring eller
30-minutersaggregeringen. Vi rapporterar vad som syns i de öppna data vi hämtar.

---

## Stationerna

| Stations-id | Namn | WGS84 (lat, lon) | Omöjliga timmar | Värsta kvot by/medel | Max byvind (m/s) | Median byvind (m/s) | Period |
| :-- | :-- | :-- | --: | --: | --: | --: | :-- |
| 2312 | Handöl | 63,26783 · 12,38533 | **29** | 100,3 | **85,5** | 6,6 | 4–13/9 |
| 2438 | Ruskträsk | 64,82426 · 18,79660 | 4 | 39,7 | 29,9 | 2,8 | 5–13/9 |
| 227 | Arlanda | 59,64336 · 17,89332 | 3 | 78,7 | 55,1 | 4,7 | 4–5/9 |
| 1732 | Fastnäs | 60,28845 · 13,39538 | 3 | 37,3 | 78,4 | 2,9 | 4–11/9 |
| 426 | Oxelösund | 58,69095 · 17,04798 | 2 | 25,8 | **87,7** | 3,4 | 13/9 |
| 618 | Brahehus | 58,06883 · 14,52885 | 1 | 64,0 | 32,0 | 4,8 | 5/9 |
| 2107 | Hamnäs | 61,19249 · 16,77012 | 1 | 64,0 | 25,6 | 2,1 | 4/9 |
| 310 | Överboda | 60,60235 · 17,45239 | 1 | 37,5 | 45,0 | 4,2 | 9/9 |
| 1311 | Mossjön | 56,95058 · 12,79389 | 1 | 27,4 | 30,1 | 3,0 | 12/9 |

**Medianbyvinden i samma period** står i tabellen för jämförelse: stationerna rapporterar normalt
2–7 m/s. Det är alltså inte fråga om genomgående höga värden utan om **spikar** i ett i övrigt
normalt material. För Handöl drar spikarna upp medelvärdet till 21,7 m/s medan medianen är 6,6.

---

## Den tydligaste enskilda observationen per station

Alla tidpunkter i UTC. `Wind.Speed` är momentanvärdet i samma observation som
`Aggregated30minutes.Wind.SpeedMax`.

| Station | Tidpunkt (UTC) | Medelvind (m/s) | Byvind (m/s) | Kvot |
| :-- | :-- | --: | --: | --: |
| 426 Oxelösund | 2026-09-13 04:10 | 0,5 | 87,7 | 175 |
| 2312 Handöl | 2026-09-11 00:30 | 0,5 | 83,8 | 168 |
| 618 Brahehus | 2026-09-05 08:50 | 0,4 | 32,0 | 80 |
| 227 Arlanda | 2026-09-04 08:05 | 0,7 | 55,1 | 79 |
| 1311 Mossjön | 2026-09-12 19:45 | 0,4 | 30,1 | 75 |
| 310 Överboda | 2026-09-09 05:10 | 0,6 | 45,0 | 75 |
| 2107 Hamnäs | 2026-09-04 12:05 | 0,4 | 25,6 | 64 |
| 2438 Ruskträsk | 2026-09-05 02:05 | 0,6 | 23,8 | 40 |
| 1732 Fastnäs | 2026-09-04 16:05 | 2,1 | 78,4 | 37 |

Mönstret är detsamma för alla nio: **spiken inträffar i nära vindstilla.**

---

## Metod

1. Varje observation grupperas per station och timme. För timmen tas **högsta byvinden** och
   **högsta medelvinden**.
2. En stationstimme räknas som omöjlig när byvinden når **15 m/s** och kvoten byvind/medelvind
   överstiger **5**.
3. Tröskeln 5 är rundligt tilltagen. Byvindfaktorn ligger i verkligheten på 1,3–1,5 över öppen
   terräng och når 2,5–3 i den ruggigaste. **I ert eget material** (alla stationer, medelvind
   ≥ 5 m/s, 3 142 observationer) är medianen **1,75**, 95:e percentilen **2,25** och 99,9:e
   percentilen **3,08**. De nio stationerna ligger på 25–175.

**Kontroll av metoden.** Byvinden är ett maximum över de föregående 30 minuterna medan medelvinden
är ett momentanvärde, så en snäv parning kan i princip ställa en verklig by mot en efterföljande
lugn stund. Vi har därför räknat om med medelvinden tagen som högsta värde över timmen **och
timmen före**, alltså ett fönster som säkert täcker byvindens hela mätperiod. Resultatet är
identiskt: samma nio stationer, samma 45 timmar. Fönsterparningen förklarar alltså inte talen.

---

## Vad vi ber om

1. En kontroll av de nio stationernas byvindgivare.
2. Besked om felet ligger i givaren, i överföringen eller i 30-minutersaggregeringen — det avgör om
   konsumenter av öppna data kan filtrera bort felet själva eller inte.
3. Om värdena är kända och avsiktliga (t.ex. en sentinel- eller felkod vi inte känner till): en
   upplysning om vilket värde som betyder vad.

---

## Reservationer

- Vi ser bara de öppna data vi hämtar, inte råsignalen från givaren.
- Fönstret är kort: **4–13 september 2026**, eftersom vi började spara vind den 4 september. Inuti
  fönstret finns dessutom ett avbrott i vår egen hämtning 5–9 september. Stationer kan alltså ha
  fler omöjliga timmar än vi ser, men inte färre.
- Vi har inte jämfört mot grannstationer i den här mätningen. Slutsatsen vilar på stationens **eget**
  förhållande mellan byvind och medelvind, vilket gör den oberoende av väderläget.
- Vi använder byvinden i ett trafiksäkerhetsunderlag under utveckling och har uteslutit de nio
  stationerna ur vårt eget material. Anmälan görs för att felet bör vara känt hos källan, inte för
  att vi är blockerade.
