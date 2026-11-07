# TROSKLAR — säsongsfacit: hur väl Halkvakts halkvarningar slog in vintern 2026/27

**FASTSTÄLLT 7/11 2026 av Bengt och Axel** (Bengt: *"kör på allt detta"*, på Claudes rekommendationer till valen 1–5 med ändringen i
val 2; för Axel: *"jag signerar för axel och vi bygger det nu"*; DECISIONS #818). Utkastet skrevs av Claude 7/11 på Bengts *"Ja, skriv utkastet"* (kort #381). Dokumentet gäller från fastställandet. Efter första läsningen ändras inget mått, facit eller krav utan ett nytt
beslut, med skälet bokfört (regel L).

## 1. Vad säsongsfacit är, och vad det inte är

- **Säsongsfacit är en redovisning.** Den visar hur väl Halkvakts halkvarningar slog in under vintern, per plats och tid, mot facit och
  jämförelser som är bestämda i förväg.
- **Säsongsfacit uppdateras löpande hela vintern.** Varje måndag räknas veckan och säsongen hittills (§6).
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
| A1, hal sträcka | **Fördröjningen:** från Trafikverkets tidsstämpel på väglagsändringen till att ändringen finns i vårt arkiv (`road_condition_history`). Till det läggs publiceringens takt, varannan minut. Redovisas som median och 95:e percentil. Tiden när raden kom in sparas från och med migrationen av sql/099 (`ingested_at`); äldre rader saknar den. **Täckningen:** hur stor andel av sträckorna med halka som nådde lägesfilen. |
| A2, frysrisk vid station | **Andelen stationstimmar** med uppmätt isrisk, alltså yta ≤ 0 °C och fukt, som gav frysrisk i lägesfilen. **Tystnaderna** från vakterna, som stoppar trasiga givare, och hur stor andel av dem som var befogade. |

**Del 2, prognosen (K, kandidatens betavarning).** Det här är Halkvakts egen bedömning mellan stationerna. Det är här frågan *är
Halkvakt bra* avgörs.

- **Enheten** är sträcka × timme, ur kandidatens domlogg (`ny_kandidat_skugga`). Domloggen sparar för varje sträcka och timme om K
  varnade, och annars varför den teg.
- **Säsongen** räknas från 1/11 2026 till 31/3 2027.

## 3. Facit för prognosen

Facit är det som faktiskt hände. Huvudmåtten räknas på F1, F3 och F4, som K inte bygger på:

| | Facit | Ur | Vad det bevisar |
|---|---|---|---|
| F1 | Trafikverkets väglag på sträckan, med klasserna halka, is, snö och slask | `road_condition_history` | Att Trafikverket bedömde vägen som hal. K läser bara Trafikverkets *Våt* som fukt, och facit är andra klasser |
| F3 | Kamerabild med is, snö eller slask, eller med bar väg | `kamerafacit` | Ett synligt väglag. Svartis syns inte |
| F4 | Olycka, klassad TYDLIG eller TROLIG | olycksfacit | Att något hände. Inte att det var halt (#247) |

**F2, uppmätt yta vid stationen, ingår inte i huvudmåtten (val 2).** K bygger på stationerna, så en station kan vara både ankare och
facit, och då mäter vi oss själva. F2 redovisas därför för sig, märkt *inte oberoende*: ytan ≤ 0 °C med fukt vid stationen på
sträckan, när K varnade och när den teg. Den oberoende prövningen mot stationer görs i kuvösens marsdom, där förregistreringen
hanterar ankarna.

Förarfacit (*stämde det?* och *appen missade*) redovisas för sig och bara som antal. Svaren är testarnas egna och lämnar aldrig
databasen rad för rad (#498).

## 4. Jämförelserna

Jämförelserna visar vad föraren har utan Halkvakt, eller med ett enkelt verktyg. De räknas på samma sträckor och timmar som K:

| | Jämförelse | Regel | Vad den visar om oss |
|---|---|---|---|
| J1 | Bilens snöflinga | Luften under +3 °C vid närmaste station, som bilens egen varning (MATNINGAR §9) | Om vi varnar lika träffsäkert med färre falsklarm än det föraren redan har på instrumentbrädan |
| J2 | En enkel väderregel | Luften ≤ +1 °C och nederbörd i radarn på sträckan | Om K:s fysik tillför något utöver vanligt väder |
| J3 | Det föraren redan får | Trafikverkets väglag (A1) på sträckan, utan Halkvakts prognos | Om vi varnar tidigare än Trafikverket, och där de inte rapporterar |

## 5. Måtten, indelningen och tolkningen

**Måtten**, för K och för varje jämförelse:

| Mått | Definition |
|---|---|
| Träffsäkerhet | Andelen varnande sträcktimmar där facit (F1, F3 eller F4) fanns inom facitfönstret |
| Täckning | Andelen facithändelser (F1, F3 och F4) där varningen kom före händelsen eller under den |
| Ledtid | Tiden från K:s första varning till F1:s första halkklass på samma sträcka. Median och kvartiler |
| Falsklarm per 100 km | Varningar utan facit, längs skuggans 80 rutter (`shadow_log`) |
| Takten | Tätaste följd och följder inom 60 s, som i skuggrapporten (#200) |

**Facitfönstret (val 1)** sträcker sig från en timme före varningen till två timmar efter. Huvudtalen räknas bara med det fönstret. Ett
smalare fönster (0–1 h) och ett bredare (−1 till +4 h) visas i en bilaga, så att man ser hur känsligt resultatet är, men de ersätter
aldrig huvudtalet.

**Indelningen:**
- län;
- månad;
- tid på dygnet, i svensk tid: natt 22–05, morgonrusning 06–09, dag 10–15, kvällsrusning 16–18 och kväll 19–21;
- för ledtiden dessutom tre band: under 1 timme, 1–3 timmar och 3–6 timmar.

**Osäkerheten:**
- Varje andel redovisas med ett 95-procentigt intervall, bootstrappat per dygn, eftersom timmarna inom ett dygn hänger ihop.
- Antalet händelser står alltid bredvid andelen.
- En cell med färre än 20 händelser redovisas bara som antal (val 3).

**Tolkningen: vad *bra* betyder.**
- K har högre träffsäkerhet än J1 och J2 vid jämförbar täckning.
- K kommer före J3 på de sträckor där Trafikverket senare rapporterar halka.

Träffsäkerheten och täckningen visas alltid tillsammans, och falsklarmen per 100 km bredvid. Snöflingan varnar nästan hela tiden och
träffar därför ofta, men den ropar också varg hela vintern.

## 6. Löpande uppdatering

Bengt 7/11: *"det hade varit bra om man kunde få uppdateringar på säsongsfacitet kontinuerligt"*.

- **Varje dygn kl. 12.23 UTC** räknas gårdagen (sql/099). Resultatet hamnar i tre interna tabeller, per län och tid på dygnet:
  - `sasongsfacit_dag`: sträcktimmarna, de varnande, träffarna, F1-timmarna och de täckta, för K, J1 och J2;
  - `sasongsfacit_ledtid`: varje början på F1 och hur långt före K varnade;
  - `sasongsfacit_olyckor`: F4, olyckorna och de där K varnade.

  Räkningen görs varje dygn, så att ingen gallring av stationernas rader hinner före. 7/11 fanns rader från 29/9, och fullständiga dygn från 30/10. Tabellerna har RLS och inga rättigheter för `anon` och `authenticated`.
  - Räkningen sker med pg_cron, som olycksfacit. Den läser bara arkiven, skriver bara aggregat, och kör en sats per dygn utan någon
    funktion per rad (lärdomen från 3/11, #783).
  - Kärnan prövades som läsning i full skala i produktionen 7/11, på dygnet 6/11: 818 sträckor × 32 timmar på 4,1 s.
  - Tillväxten är omkring 400 rader per dygn, alltså under 10 MB för vintern.
- **Första räkningen** gjordes i efterhand från 1/11, när sql/099 migrerades 7/11 (DB-knappen 42364677211). Alla sex dygnen 1/11–6/11
  räknades med J1 och J2. Ett dygn utan stationsrader märks `jamforelser = false`, och då räknas J1 och J2 inte.
- **Första delen** innehåller K, J1 och J2 mot F1 och F4, och ledtiden. **Nästa del** innehåller A1:s fördröjning, A2:s leverans, F3,
  falsklarmen per 100 km, takten och rapportskriptet med intervallen.
- **Läsningen:** Claude läser tabellerna i varje session efter måndagen och skriver en intern lägesrapport till Bengt och Axel, med
  veckans tal och säsongen hittills. Ingenting av det skrivs i repot, i ärenden eller i Actions-loggar, eftersom repot är publikt.
- **Månadsläsningarna 1/12, 1/1, 1/2 och 1/3** bokförs på kort #381 med vad som har förändrats. Talen står inte i bokföringen.
- **Slutrapporten** kommer senast 15/4, så att Trafikverkets sena rapporter och olycksfacits klassning hinner med (val 5).

## 7. Publiceringen (val 4: (a))

Bengt 7/11: *"om vi är bra hade man kunnat tänka sig att lägga upp den på hemsidan och annars bara för internt ändamål"*.

- **Vad som publiceras och när:** metoden, alltså det här dokumentet, publiceras på halkvakt.se när det är fastställt. Resultatet
  publiceras efter slutrapporten, **vad det än blir**.
- **Skälet:** om man publicerar bara när resultatet blir bra, och bestämmer det efteråt, blir det ett urval som inte håller. Påståenden om
  träffsäkerhet är dessutom marknadsföring och måste gå att belägga (produktansvaret, kort #372). K är märkt BETA, så ett ärligt
  resultat från första vintern, med jämförelser och reservationer, går att visa.
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

Inget nytt underlag behöver sparas.

**Det som inte sparas:**
- Lägesfilen skrivs över vid varje publicering. Domloggen ersätter den för K, och A1 och A2 räknas ur arkiven.
- Stadsloggen för B och C gallras efter 14 dygn (sql/096).

**Fällor:**
- Svartis syns inte på kamerabilderna.
- En olycka visar inte att det var halt.
- Trafikverket bedömer väglaget där de har observationer, och det ger en slagsida mot de statliga vägarna.
- Facitfönstret avgör mycket. Därför bestäms det i förväg och ändras inte efter att utfallet har setts.

## 9. Valen (fastställda 7/11)

| # | Val | Beslut |
|---|---|---|
| 1 | Facitfönstret | Från en timme före varningen till två timmar efter. Huvudtalen räknas bara med det, och 0–1 h och −1 till +4 h står i bilagan (§5) |
| 2 | Hur stationerna hanteras | F2 ingår inte i huvudmåtten. Den redovisas för sig, märkt *inte oberoende*. Den oberoende prövningen görs i kuvösens marsdom (§3) |
| 3 | Minsta antal händelser för att visa en andel | 20, och antalet står alltid bredvid andelen |
| 4 | Publiceringen | (a): metoden när dokumentet är fastställt, och resultatet efter slutrapporten, vad det än blir (§7) |
| 5 | Läsdatum | Varje måndag internt. 1/12, 1/1, 1/2 och 1/3 bokförs, och slutrapporten kommer senast 15/4 |

## 10. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-07 | i chatten *"kör på allt detta"*, på Claudes rekommendationer till valen 1–5 med ändringen i val 2 (DECISIONS #818) |
| Axel | 2026-11-07 | via Bengt i chatten: *"jag signerar för axel och vi bygger det nu"* |
