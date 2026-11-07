# TROSKLAR — säsongsfacit: hur väl Halkvakts halkvarningar slog in vintern 2026/27

**UTKAST 7/11 2026** (Claude, på Bengts *"Ja, skriv utkastet"*; kort #381). Inte fastställt. Dokumentet gäller när Bengt och Axel har
signerat det (§10), och senast före första läsningen 1/12. Efter första läsningen ändras inget mått, facit eller krav utan ett nytt
beslut, med skälet bokfört (regel L).

## 1. Vad säsongsfacit är, och vad det inte är

- **Säsongsfacit är en redovisning.** Den visar hur väl Halkvakts halkvarningar slog in under vintern, uppdelat per plats och tid. Varje
  mått mäts mot facit och jämförelser som är bestämda i förväg.
- **Säsongsfacit uppdateras hela vintern.** Varje måndag räknas veckan och säsongen hittills om (§6).
- **Säsongsfacit är ingen grind.** Det avgör inte vad som får tala. Kandidatens marsdom (kuvösen, DECISIONS #768), prognoslagrets grindar,
  olycksfacit (TROSKLAR-OLYCKSFACIT) och domkalendern gäller som förut. Säsongsfacit använder deras underlag, men ändrar dem inte.
- **Säsongsfacit omfattar inte allt.** B och C, alltså storstädernas punkter, ingår inte i den här versionen. Deras dom fälls i kuvösen
  efter 31/3, och olycksfacit visar vid varje olycka om de varnade (DECISIONS #815). Olyckor, vilt och kameror (A3, A4 och A5) är inte
  halkvarningar och ingår inte heller.

## 2. De två delarna

**Del 1, leveransen (A1 och A2).** Här förmedlar Halkvakt Trafikverkets egna uppgifter, och nyttan är att föraren får dem i tid och
med röst. Att uppgifterna är rätt är Trafikverkets förtjänst, inte vår.

| Lager | Vad som mäts |
|---|---|
| A1, hal sträcka | **Fördröjningen:** från Trafikverkets tidsstämpel på väglagsändringen till att ändringen finns i vårt arkiv (`road_condition_history`). Till det läggs publiceringens takt, varannan minut. Redovisas som median och 95:e percentil. **Täckningen:** hur stor andel av sträckorna med halka som nådde lägesfilen. |
| A2, frysrisk vid station | **Andelen stationstimmar** med uppmätt isrisk, alltså yta ≤ 0 °C och fukt, som gav frysrisk i lägesfilen. **Tystnaderna** från vakterna, som stoppar trasiga givare, och hur stor andel av dem som var befogade. |

**Del 2, prognosen (K, kandidatens betavarning).** Det här är Halkvakts egen bedömning mellan stationerna. Det är här frågan *är
Halkvakt bra* avgörs.

- **Enheten** är sträcka × timme, ur kandidatens domlogg (`ny_kandidat_skugga`). Domloggen sparar för varje sträcka och timme om K
  varnade, och annars varför den teg.
- **Säsongen** räknas från 1/11 2026 till 31/3 2027.

## 3. Facit för prognosen

Facitkällorna, i ordning efter hur starka de är:

| | Facit | Ur | Vad det bevisar |
|---|---|---|---|
| F1 | Trafikverkets väglag på sträckan, med klasserna halka, is, snö och slask | `road_condition_history` | Att Trafikverket bedömde vägen som hal |
| F2 | Uppmätt yta ≤ 0 °C med fukt vid en vägväderstation på sträckan, **som inte var ankare för K där** | arkivet för `weather_observations` | Fysisk frysrisk, mätt oberoende av K |
| F3 | Kamerabild med is, snö eller slask, eller med bar väg | `kamerafacit` | Ett synligt väglag. Svartis syns inte |
| F4 | Olycka, klassad TYDLIG eller TROLIG | olycksfacit | Att något hände. Inte att det var halt (#247) |

Förarfacit (*stämde det?* och *appen missade*) redovisas för sig och bara som antal. Svaren är testarnas egna och lämnar aldrig
databasen rad för rad (#498).

**Fällan i F2.** K bygger på stationerna. En station som är ankare för en punkt får därför inte vara facit för samma punkt, eftersom vi
då mäter oss själva. Det kräver att K:s ankare per punkt och timme går att läsa ut (val 2 i §9).

## 4. Jämförelserna

Ett *bra* måste vara bättre än något. De tre jämförelserna räknas på samma sträckor och timmar som K:

| | Jämförelse | Regel |
|---|---|---|
| J1 | Bilens snöflinga | Luften under +3 °C vid närmaste station, som bilens egen varning (MATNINGAR §9) |
| J2 | En enkel regel | Luften ≤ +1 °C och nederbörd i radarn på sträckan |
| J3 | Det föraren redan får | Trafikverkets väglag (A1) på sträckan, utan Halkvakts prognos |

## 5. Måtten och indelningen

**Måtten**, för K och för varje jämförelse:

| Mått | Definition |
|---|---|
| Träffsäkerhet | Andelen varnande sträcktimmar där facit fanns inom facitfönstret (val 1 i §9) |
| Täckning | Andelen facithändelser (F1–F3) där varningen kom före händelsen eller under den |
| Ledtid | Tiden från K:s första varning till F1:s första halkklass på samma sträcka. Median och kvartiler |
| Falsklarm per 100 km | Varningar utan facit, längs skuggans 80 rutter (`shadow_log`) |
| Takten | Tätaste följd och följder inom 60 s, som i skuggrapporten (#200) |

**Indelningen:**
- län;
- månad;
- tid på dygnet, i svensk tid: natt 22–05, morgonrusning 06–09, dag 10–15, kvällsrusning 16–18 och kväll 19–21;
- för ledtiden dessutom tre band: under 1 timme, 1–3 timmar och 3–6 timmar.

**Osäkerheten:**
- Varje andel redovisas med ett 95-procentigt intervall, bootstrappat per dygn, eftersom timmarna inom ett dygn hänger ihop.
- En cell med färre händelser än gränsen redovisas inte som andel, bara som antal (val 3 i §9).

## 6. Löpande uppdatering

Bengt 7/11: *"det hade varit bra om man kunde få uppdateringar på säsongsfacitet kontinuerligt"*.

- **Varje måndag** räknas förra veckan och säsongen hittills. Resultatet hamnar i en intern tabell, `sasongsfacit`, med en rad per vecka,
  lager, mått, län och tid på dygnet. Tabellen har RLS och inga rättigheter för `anon` och `authenticated`.
  - Räkningen sker med pg_cron, som olycksfacits vecka. Den läser bara arkiven, skriver bara aggregat, och kör en sats per vecka och
    inte per rad (lärdomen från 3/11, #783).
  - Tillväxten är omkring 1 000 rader per vecka, alltså under 5 MB för vintern.
- **Läsningen:** Claude läser tabellen i varje session efter måndagen och skriver en intern lägesrapport till Bengt och Axel, med
  veckans tal och säsongen hittills. Ingenting av det skrivs i repot, i ärenden eller i Actions-loggar, eftersom repot är publikt.
- **Månadsläsningarna 1/12, 1/1, 1/2 och 1/3** bokförs på kort #381 med vad som har förändrats. Talen står inte i bokföringen.
- **Slutet** räknas efter 31/3, på samma underlag.

## 7. Publiceringen

Bengt 7/11: *"om vi är bra hade man kunnat tänka sig att lägga upp den på hemsidan och annars bara för internt ändamål"*.

- Om man publicerar bara när resultatet blir bra, och bestämmer det efteråt, blir det ett urval som inte håller. Påståenden om
  träffsäkerhet är dessutom marknadsföring och måste gå att belägga (produktansvaret, kort #372). Därför avgörs publiceringen i förväg
  (val 4 i §9):
  - **(a)** Metoden publiceras när dokumentet är fastställt, och resultatet efter 31/3, vad det än blir.
  - **(b)** Ett krav på *bra* bestäms i förväg, till exempel att K slår J1 och J2 i träffsäkerhet med intervallen åtskilda. Resultatet
    publiceras om kravet är uppfyllt, och annars bara internt.
- **Publikt visas bara aggregat:** per län och månad, och Trafikverkets data aldrig rad för rad. Kuvösens tal visas inte utan ett beslut
  (#768).

## 8. Underlaget, och vad som inte går att mäta

**Det som sparas hela vintern:**
- domloggen (omkring 1,2 MB per dygn);
- `road_condition_history`;
- arkivet för `weather_observations`, som exporteras till hinken;
- `situation_archive` och olycksfacit;
- `kamerafacit`;
- `shadow_log`;
- `driver_facit`.

Inget nytt underlag behöver sparas för den här versionen.

**Det som inte sparas:**
- Lägesfilen skrivs över vid varje publicering. Domloggen ersätter den för K, och A1 och A2 räknas ur arkiven.
- Stadsloggen för B och C gallras efter 14 dygn (sql/096).

**Fällor:**
- Svartis syns inte på kamerabilderna.
- En olycka visar inte att det var halt.
- Trafikverket bedömer väglaget där de har observationer, och det ger en slagsida mot de statliga vägarna.
- Facitfönstret avgör mycket. Därför bestäms det i förväg och ändras inte efter att utfallet har setts.

## 9. Valen

| # | Val | Förslag |
|---|---|---|
| 1 | Facitfönstret för träffsäkerhet och täckning | F1 och F3 från timmen före varningen till två timmar efter, F2 samma timme |
| 2 | Hur F2 hålls oberoende av K | Logga K:s ankare per punkt och timme, som en liten tabell eller kolumn. Annars räknas F2 bara på stationer som inte är ankare inom 20 km |
| 3 | Minsta antal händelser för att visa en andel | 20 |
| 4 | Publiceringen (§7) | (a) |
| 5 | Läsdatum | Varje måndag internt, 1/12, 1/1, 1/2 och 1/3 bokförda, och slutet efter 31/3 |

## 10. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| | | |
