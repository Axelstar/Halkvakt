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

## 11. Tillägg, UTKAST 19/11 2026: storstäderna i redovisningen (körlistan C3)

**Status:** ⏳ **UTKAST. Inte signerat, och gäller inte.** Skrivet av Claude 19/11 2026 för körlistans punkt C3 (`docs/KORLISTAN.md`:
*"ni signerar tillägget, Claude bygger"*). Tillägget ändrar ingenting i §1–§10. Inget byggs, migreras eller räknas förrän Bengt och Axel
har svarat på frågorna i §11.10 och signerat. Inget av avsnittets mått har räknats (§11.9).

### 11.1 Vad tillägget är, och vad det inte är

- **En redovisning, som resten av säsongsfacit.** Det är ingen grind, ingen dom och ingen ny tröskel. Gränsen 2 km är olycksfacits
  (TROSKLAR-OLYCKSFACIT §9.1), 20 händelser är val 3, och 30 svar är mätplanens (TROSKLAR-NYTTAN §5).
- **Stadsmiljöns dom fälls i kuvösen efter 31/3** (§1, DECISIONS #768, #804). Den avgör om B stannar i ett område. Ingenting här ersätter
  den eller föregriper den.
- **§1 gäller fortfarande för prognosens mått.** B och C ingår inte i träffsäkerheten, täckningen eller ledtiden (§5). F1 och J3 räknas
  per väglagssträcka (sql/099), och en stadsgrupp är ingen väglagssträcka: Trafikverkets väglag har inga grupper och ger dem aldrig
  *Våt* (sql/091). Riktigheten vid stadspunkterna prövas i kuvösens dom (val 2).
- **Tillägget ger storstäderna ett eget avsnitt** med fyra delar: timmarna och varningstimmarna (§11.3), varför regeln teg (§11.4),
  olyckorna inom 2 km från en stadspunkt (§11.5) och förarnas svar (§11.6). Avsnittet är veckorapportens del om storstäderna (körlistan D1).
- **Nyttans nivåer** (TROSKLAR-NYTTAN §2). Avsnittet bär nivå 3, förarnas svar, och nivå 4, olyckorna. Nivå 1, räckvidden, går inte att
  dela upp per storstad: räknaren får bara slaget *kandidat* och avståndet (`supabase/functions/app-raknare`), och att ändra det ändrar vad
  appen skickar (produktinvarianten i CLAUDE.md). Det föreslås inte här. Nivå 2 är kuvösens dom. Varningstimmarna och skälen beskriver
  regeln i drift och är inget mått på nytta.

### 11.2 Enheten, cellerna, perioden och nivån

- **Enheten** är grupp × timme ur stadsloggen (`ny_kandidat_skugga_stad`, sql/096). Gruppen är appens K-sträcka i staden (`live.json`
  `kandidat[].id`, sql/089), och timmen är den nya kandidatens timme (`observed_at`). Det är samma enhet som K:s sträcka × timme (§2).
- **Cellerna** är område och lager, de fyra som har en brytare (sql/089): Stor-Stockholm B, Stor-Göteborg B, Stor-Malmö B och
  Stor-Stockholm C. Inom cellen delas talen som i §5, på månad och tid på dygnet i svensk tid. Länen används inte, eftersom områdena är
  indelningen.
- **Perioden** börjar med den första körningen med status *räknad* i körningsloggen (`ny_kandidat_skugga_stad_korning`), alltså
  påslaget 8/11 (DECISIONS #816, #888), och slutar 31/3 2027 som §2. Villkoret läser datan, inte ett datum.
- **Nivån** (TROSKLAR-NYTTAN §4). Stadsloggen har ingen skugga: med brytaren av räknar regeln inte stadspunkten alls (sql/091 tar bara
  med punkter vars brytare är på). Varje rad i loggen är därför *i drift*, utom i två fall, som redovisas för sig och aldrig läggs ihop
  med resten:
  1. timmar då beslutet i `kandidat_talar` inte sa *ny*. Stadspunkterna finns bara i den nya kandidatens regel, inte i den frystas
     (sql/091, TROSKLAR-OLYCKSFACIT §12.3), men loggen skrivs ändå;
  2. 19/11 kl. 07.42–08.14 UTC, då den snabba kandidaten talade utan stadspunkterna och lägesfilen inte bar dem (DECISIONS #903). Sedan
     sql/124 larmar vakthundens kontroll 3c om det händer igen, och varje sådant larm blir ett undantag med sitt intervall.
- **Vad en loggad timme är.** Loggen skrivs en gång i timmen, sist i stadsomgången (`ny-kandidat-timme.yml`, `logga-stad`), och bär
  regelns svar just då (`skriven_at`). Lägesfilen byggs varannan minut med radarn och vetot från stunden (sql/091, sql/094). En varning
  som kom och gick mellan två loggar syns alltså inte, och en loggad varning kan ha släckts före nästa publicering. Samma gäller K:s domlogg.
- **En varningstimme betyder att lägesfilen bar en varning för gruppen,** inte att rösten talade. Det avgör appens varningsordning
  (CLAUDE.md), och räknaren kan inte skilja ut storstäderna (§11.1).

### 11.3 Timmarna och varningstimmarna

| Mått | Definition | Ur |
| :-- | :-- | :-- |
| Timmarna per klass | Varje klocktimme i perioden hamnar i precis en klass per cell, i den här ordningen: *räknad* (en körning med status *räknad* bär timmen, och cellen står i `brytare`), *brytaren av* (räknad, men cellen står inte i `brytare`), *ingen timme* (status *tyst*: den nyas timme saknades, var gammal eller var ofullständig), *av* (status *av*: alla brytare av) och *ingen körning* (ingen rad för timmen) | körningsloggen: `observed_at` för de räknade och körningens klocktimme (`korning`) för de tysta och avslagna; `status`, `brytare` |
| Kalla grupp-timmar | De räknade grupp-timmar som har en rad i stadsloggen, alltså minst en stadspunkt med yta ≤ 0 i regeln | stadsloggen, en rad per grupp och timme; `punkter` |
| Varnande grupp-timmar | Kalla grupp-timmar med minst en varnande punkt | `varnar` |
| Andelen varnande | Varnande grupp-timmar av de kalla | samma |
| Timmar med varning i cellen | Räknade klocktimmar då minst en grupp i cellen varnade | samma |

- Varningstimmarna redovisas för veckan och säsongen hittills, per cell, månad och tid på dygnet.
- *Ingen timme* och *ingen körning* är förlorade timmar för storstäderna. De hör också till veckorapportens del om driften (körlistan D1).

### 11.4 Varför regeln teg

Regeln (sql/091, sql/094) prövar varje kall stadspunkt i en bestämd ordning, och loggen bär bara det första villkoret som stoppade punkten:

| Skäl | Villkoret i regeln | Ur |
| :-- | :-- | :-- |
| Vetot | en vaktad station inom 15 km med yta över +2 °C de senaste 45 minuterna | `veto` |
| Fukten saknades | radarn i gruppen under 0,1 mm/h, eller ingen radarrad, de senaste 60 minuterna (`radar_stad`, stadspunkternas enda fukt) | `torr` |
| Spridningsspärren | spärren F1: minst två ankare, och minoritetens vikt på andra sidan noll är minst 0,45 | `spridning` |

- **Ordningen** betyder att *fukten saknades* bara räknas där inget veto gällde, och spärren bara där fukten fanns. Ett veto säger alltså
  ingenting om fukten.
- **Redovisningen:** för de kalla grupp-timmar som inte varnade, summan av punkterna per skäl och andelen av de kalla punkterna, per cell.
  Punkterna räknas bara som summor per cell, aldrig per grupp.
- **Skälen utanför loggen**, ur körningsloggen och klockslaget:
  - *ytan över 0*: en grupp utan rad i en räknad timme hade ingen punkt med ett värde ≤ 0 (`kall` i sql/091). Loggen skiljer inte en
    varm punkt från en punkt utan värde. Talet är gruppernas antal i cellen (`stadspunkt` vid räkningen) gånger de räknade timmarna, minus
    de kalla grupp-timmarna. Laddaren håller `stadspunkt` lika med kuvösens lista (`ingest/stadspunkter-db.ts`), så antalet kan ändras
    under säsongen; därför sparas det för varje dygn (§11.8);
  - *marsfönstret*: i mars kl. 10.00–15.59 svensk tid tiger alla stadspunkter söder om 62° N (regel B, kuvösen F33, sql/091), och alla
    tre områdena ligger söder om den gränsen. De timmarna har inga rader och räknas för sig, aldrig som *ytan över 0*;
  - *brytaren av*, *ingen timme*, *av* och *ingen körning* (§11.3).
- **Provet i bygget** (ingen tröskel): i varje rad ska `punkter` vara summan av `varnar`, `veto`, `torr` och `spridning`, eftersom
  sql/096 räknar varje kall punkt en gång. En rad där summan inte stämmer stoppar avsnittet med ett fel, i stället för ett tal.

### 11.5 Olyckorna inom 2 km från en stadspunkt

- **Populationen** är olycksfacits olyckor utan dubbletter (`olycksfacit`, `dubblett_av` tom) där K-lagrets detalj bär `stad`
  (`olycksfacit_lager`, lagret K, `detalj` → `stad`). Fångsten skriver den bara när närmaste stadspunkt ligger inom 2 km från olyckan
  (`olycksfacit_k_stad()`, sql/096 och sql/100; TROSKLAR-OLYCKSFACIT §9.1). Avsnittet räknar inte om något: det är olycksfacits bokföring,
  uppdelad per cell.
- **Cellen** läses ur detaljens `omrade` och `lager`.
- **Måtten**, per cell, för veckan och säsongen hittills:
  - olyckorna per klass: TYDLIG, TROLIG, OKLAR, INTE och ännu inte klassad (`klass`);
  - om stadspunktens brytare var på vid timmen (`aktiv`);
  - stadspunktens besked (`orsak`): *varnar*, *fukt saknades*, *spridningsspärren*, *veto*, *yta över 0*, *ingen timme*, *gallrad*,
    *inget värde* eller *brytaren av*;
  - bedömningen i TROSKLAR-OLYCKSFACIT §9.2 och vilka lager som varnade: A1, K vid vägpunkten, K vid stadspunkten och A2;
  - vid de halkkopplade (TYDLIG och TROLIG): hur ofta stadspunkten varnade, och stadspunktens skäl när den teg med brytaren på.
- **Stadspunktens skäl är inte alltid olyckans förbättringsområde** (TROSKLAR-OLYCKSFACIT §9.3). Finns en vägpunkt inom 2 km är det
  vägpunktens skäl som står i fångstens orsaker (sql/096). Avsnittet visar stadspunktens eget besked.
- **F4 i huvudtabellen omfattar redan stadspunkterna.** `sasongsfacit_olyckor.k_varnade` (sql/099) räknar K-lagret som olycksfacit
  bokför det, och sedan tillägget i TROSKLAR-OLYCKSFACIT §9.1 (DECISIONS #815) varnar K också när stadspunkten varnar. §1 säger att B och
  C inte ingår, och för F4 stämmer det alltså inte helt sedan påslaget 8/11. Avsnittet visar därför hur många av K:s varningar vid de
  halkkopplade olyckorna som bara stadspunkten stod för: stadspunkten varnade (`stad` → `talar`), och vägpunktens del av K hade ingen
  varnande punkt inom 2 km (`varnande_km`, sql/112). Då går huvudtalet att läsa både med och utan dem. Om sql/099 ska ändras är fråga 3.

### 11.6 Förarnas svar

- ***Stämde det?*** (`driver_facit`). Svaren på K:s varningar i storstäderna är de vars `alert_id` börjar med `kand:B-` eller `kand:C-`:
  appens id för K:s varning är `kand:` och gruppen (`engine/src/snapshot.ts`), och stadsgrupperna börjar med lagret (sql/089).
  Provraderna (`prov`) räknas inte.
  - Lagret läses ur id:t och området ur gruppen i `stadspunkt`. Ett svar vars grupp inte längre står där (laddaren tar bort punkter som
    lämnat listan) räknas under sitt lager, med området *okänt*.
  - Veckan räknas på när varningen talade (`alert_t`).
  - Svaren redovisas per cell som antal *stämde* och *stämde inte*. Andelen visas först vid 30 svar i cellen (TROSKLAR-NYTTAN §5, KB-D4).
    Antalet förare går inte att läsa ur svaren.
- ***Appen missade*** (`driver_miss`) går inte att knyta till en storstad. Missens sträcka väljs i båda apparna bara bland Trafikverkets
  hala sträckor, aldrig bland K:s (`narmasteSegment` i `Missar.swift` och `Missar.kt`), och stationen är bara närmaste mätstation.
  Missarna redovisas som förut, för hela landet (körlistan C6). Att knyta dem till ett område genom stationen vore en ny avståndsgräns,
  och den föreslås inte (fråga 4).
- **Svaren lämnar aldrig databasen rad för rad** (§3, DECISIONS #498). Avsnittet skriver aldrig ut en grupp, en tid eller ett enskilt svar.

### 11.7 Värdevakten: fälten, och vad som saknar spann

Inget av avsnittets fält får bära ett tal förrän det har passerat `scripts/vardevakten.ts` (VÄRDEVAKTEN i CLAUDE.md, körlistan C3).
Läget 19/11:

- **Ingen av stadsloggens två tabeller står i värdevaktens tabellista** (`TID` i skriptet). Fälten skannas alltså inte alls och syns inte
  ens som OBESIKTIGADE, samma fälla som `trend_kandidater` 15/9 (kommentaren vid `TID`). DECISIONS #888 sköt besiktningen hit.
- **Spannen gäller kolumnens namn, inte tabellen.** `punkter`, `varnar`, `veto`, `torr` och `spridning` har spannet 0–64, deklarerat för
  domloggens vägpunkter per sträcka (en sträcka har högst 64 punkter). I stadsloggen betyder samma namn stadspunkter i en grupp, och om
  spannet håller där är inte prövat. Samma gäller `talar` och `orsak`, som betyder olika saker i olika tabeller.
- **Värdevakten läser inte jsonb**, och `olycksfacit`, `olycksfacit_lager` och `driver_facit` står inte i tabellistan.

| Fält | Mått | I värdevakten 19/11 |
| :-- | :-- | :-- |
| `ny_kandidat_skugga_stad.punkter`, `.varnar`, `.veto`, `.torr`, `.spridning` | §11.3, §11.4 | namnspannet 0–64 för domloggen; tabellen skannas inte |
| `ny_kandidat_skugga_stad.omrade`, `.lager` | cellen | ingen ordlista (text skannas bara med en deklarerad ordlista); tabellen skannas inte |
| `ny_kandidat_skugga_stad.grupp` | räknas, skrivs aldrig ut | identifierare |
| `ny_kandidat_skugga_stad.pb_min`, `.fukt_punkter`, `.fukt_utfall` | används inte av avsnittet | `pb_min` har namnspannet −60…80; tabellen skannas inte |
| `ny_kandidat_skugga_stad_korning.status` | timmarnas klass (§11.3) | ingen ordlista; databasens CHECK tillåter *räknad*, *tyst* och *av* (sql/096) |
| `ny_kandidat_skugga_stad_korning.brytare` | om cellen var på (§11.3) | jsonb, läses inte |
| `ny_kandidat_skugga_stad_korning.grupper` | används inte | inget spann |
| `olycksfacit_lager.detalj` → `stad`: `aktiv`, `talar` | §11.5 | jsonb, läses inte; tabellen står inte i listan |
| `olycksfacit_lager.detalj` → `stad`: `orsak`, `omrade`, `lager` | §11.5 | samma |
| `olycksfacit_lager.detalj` → `varnande_km`, vägpunktens del av K | §11.5, *bara stadspunkten* | samma |
| `olycksfacit.klass`, `.utfall`, `.dubblett_av` | §11.5 | tabellen står inte i listan; `klass` och `utfall` har databasens CHECK (sql/084, sql/085) |
| `driver_facit.alert_id`, `.alert_t`, `.svar`, `.prov` | §11.6 | tabellen står inte i listan; `alert_id` är en identifierare, `svar` har databasens CHECK (sql/022) och `prov` är genererad (sql/025) |

**Saknar spann, ordlista eller flagga i dag:** alla fält i tabellen ovan. Inget av dem har passerat värdevakten.

**Planen, i bygget och före avsnittets första tal** (fråga 5):
- **V1.** Stadsloggens två tabeller (tidskolumnerna `observed_at` och `korning`) och `olycksfacit_lager` (ingen tidskolumn, skannas
  hela) läggs i tabellistan.
- **V2.** Värdevakten slår upp tabellens namn före kolumnens, för spann, ordlistor och flaggor, så att samma kolumnnamn kan betyda olika
  saker i olika tabeller. Stadstabellernas antal får egna spann, med gränser ur schemat och aldrig ur punktlistan, så att spannet inte röjer
  hur många punkter en grupp har. `varnande_km` får ett spann i km.
- **V3.** Ordlistor för `omrade` och `lager` (de fyra brytarna i sql/089), `status` och stadspunktens `orsak` (orden i
  `olycksfacit_k_stad()`, sql/100), och flaggor för `aktiv` och `talar`.
- **V4.** Värdevakten lär sig läsa en lista och en nyckel i jsonb, så att `brytare` och olycksfacits stadsdetalj besiktas som andra fält.
  `brytare` avgör om en timme är i drift, och en okänd kombination hade annars räknats tyst som *brytaren av*.
- **V5.** Knappen körd på grenen visar inga obesiktigade fält bland dem i tabellen ovan. Det är beviset i körlistans *klart när*.

### 11.8 Räkningen och redovisningen

- **Räkningen** (fråga 2). Stadsloggen räknas till ett dygnsaggregat per cell, dygn och tid på dygnet, med pg_cron varje dygn som sql/099
  och före gallringen efter 14 dygn (sql/096).
  - Aggregatet bär timmarna per klass, de kalla och de varnande grupp-timmarna, punkterna per skäl och gruppernas antal i cellen det
    dygnet. Det bär inga grupper och inga punkter.
  - En sats per dygn, utan någon funktion per rad (lärdomen från 3/11, #783).
  - Dygnen som redan har gallrats ur databasen räknas en gång i efterhand ur hinkens kopia (sql/114), med samma definitioner, och bygget
    visar att ett dygn som finns på båda ställena ger samma tal.
  - DECISIONS #888 avvisade en dygnstabell *i stället för* exporten, eftersom den tappar gruppen och timmen. Här kommer den *utöver*
    exporten, som står kvar för omräkning.
- **Olyckorna och svaren** läses direkt i tabellerna varje måndag. Olycksfacit gallras inte (sql/084), och svaren raderas tidigast 31/5
  2027 (sql/120).
- **I repot, i ärenden och i Actions-loggar** står inga tal ur avsnittet (§6; sql/096: loggar och ärenden säger inga tal om
  stadspunkterna, #768). Bokföringen säger bara att läsningen är gjord och vad som har förändrats, på kort #378 och #381.
- **I veckorapporten**, som är intern (körlistan D1 och D2), står aggregat per cell för veckan och säsongen hittills, med månad och tid på
  dygnet.
  - Antalet står bredvid varje andel. En cell med färre än 20 händelser visas bara som antal (val 3), och förarnas svar som andel först
    vid 30 svar (§11.6).
  - Andelarna får intervallet i §5 när rapportskriptet i körlistans C2 finns. Till dess står de utan, och det står att intervallet
    saknas, som i läsningen 17/11 (körlistan A4).
- **Aldrig, inte heller i veckorapporten:** punkternas och gruppernas id, lägen och antal per grupp, kandidatens värden vid
  stadspunkterna (`pb`, `pb_min`), en enskild grupps timmar, ett enskilt svar och kuvösens tal. Avsnittet lägger ingenting till i
  olycksfacits ärenden.
- **Publiceringen** (§7) gäller inte avsnittet förrän fråga 6 är besvarad.

### 11.9 Det som redan har setts, och regel L

- **Inget av avsnittets mått har räknats.** Det som har setts om storstäderna är driftläsningar: att stadsloggens dygn bokförs i hinken
  (körlistan A2, DECISIONS #888), regelns rader vid stadspunkterna en stund 19/11 (DECISIONS #903) och de första varningarna i lägesfilen
  18/11 (körlistan D4).
- **Säsongsfacits första läsning 17/11** (körlistan A4) läste F4, som omfattar stadspunkternas varningar vid olyckor (§11.5). Ingen källa
  säger om stadspunkternas del syntes i den läsningen.
- **Tillägget lägger till ett avsnitt och ändrar inget mått i §2–§5.** Regel L i inledningen berörs därför bara av fråga 3 (b).
- **Efter signaturerna gäller regel L också för tillägget:** inget mått, ingen cell och inget krav här ändras efter den första läsningen
  utan ett nytt beslut, med skälet bokfört.

### 11.10 Frågor till Bengt och Axel

1. **Enheten och nivån.** Ska avsnittet räkna på grupp × timme ur stadsloggen, som nivån *i drift*, med de två undantagen i §11.2
   redovisade för sig? *Ja eller nej.* **Rekommendation: ja.** Det är samma enhet som K:s domlogg (§2), och med brytaren av räknas
   stadspunkterna inte alls, så loggen har ingen skugga som kan blandas in.
2. **Räkningen.** (a) Ett dygnsaggregat med pg_cron före gallringen, och de gallrade dygnen en gång ur hinken (§11.8), eller (b) en läsning
   varje måndag direkt ur tabellerna och hinken? **Rekommendation: (a).** §6 räknar varje dygn just för att ingen gallring ska hinna före.
   Aggregatet bär inga grupper eller punkter, och veckorapporten behöver inte läsa den privata hinken varje vecka.
3. **Olyckorna i huvudtabellen.** F4 i `sasongsfacit_olyckor` (sql/099) räknar K som olycksfacit bokför det, och det omfattar
   stadspunkterna sedan 8/11 (§11.5). (a) sql/099 står kvar, och avsnittet visar hur många av K:s varningar vid de halkkopplade olyckorna
   som bara stadspunkten stod för, eller (b) sql/099 ändras så att K i F4 bara räknar vägpunkterna? **Rekommendation: (a).** Säsongsfacit
   är läst (17/11), och (b) ändrar ett mått efter läsningen (regel L). K-lagret omfattar stadspunkterna enligt ett signerat beslut
   (TROSKLAR-OLYCKSFACIT §9.1, DECISIONS #815). Med (a) räknar olycksfacit och säsongsfacit K på samma sätt, och stadspunkternas del syns ändå.
4. **Förarnas svar.** Ska *stämde det?* redovisas per cell som i §11.6, och *appen missade* bara för hela landet, utan någon ny regel som
   knyter en miss till en storstad? *Ja eller nej.* **Rekommendation: ja.** Svarets id bär gruppen, men missens gör det inte, och en
   koppling genom närmaste station vore en ny avståndsgräns som ingen källa har.
5. **Spannen för stadsloggens antal.** (a) Egna spann för stadstabellerna, med gränser ur schemat och aldrig ur punktlistan (planen V1–V5
   i §11.7), eller (b) domloggens namnspann 0–64, efter en läsning som visar att de rymmer de största stadsgrupperna?
   **Rekommendation: (a).** Punkterna är kuvösens, och laddaren skriver inga antal eller lägen om dem (`ingest/stadspunkter-db.ts`,
   #768). (b) skriver en övre gräns för gruppernas storlek i det publika repot, och den håller bara tills punktlistan ändras. Med (a)
   vidgas inte heller domloggens spann.
6. **Publiceringen.** (a) Avsnittet följer §7, val 4 (a): det publiceras efter slutrapporten vad det än blir, per område och månad, men
   tidigast när stadsmiljöns dom i kuvösen är fälld, eller (b) det hålls internt tills ett eget beslut? **Rekommendation: (a).** Skälet är
   §7:s: att bestämma efteråt, när talen är sedda, är ett urval. Att vänta in domen gör att ett publicerat tal inte föregriper kuvösen
   (#768, #804). Kuvösens tal visas inte i någotdera fallet.
7. **Noter i §1 och §8.** Ska §1 (B och C ingår inte, men F4 omfattar dem, §11.5) och §8 (stadsloggen gallras efter 14 dygn, men
   exporteras sedan 17/11 till hinken, sql/114 och DECISIONS #888) få en rad var, med datum och beslutets nummer, när tillägget signeras?
   *Ja eller nej.* **Rekommendation: ja.** Raderna rättar fakta och ändrar inget mått, och tröskeldokumenten skriver ändringar så
   (*"Ändrat … Förut: …"*, TROSKLAR-OLYCKSFACIT §9.1).

### 11.11 Signaturer

Inga. Tillägget gäller först när Bengt och Axel har signerat, och signaturerna förs in här med datum och ord, som i §10.
