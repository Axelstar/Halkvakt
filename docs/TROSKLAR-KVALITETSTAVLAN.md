# TROSKLAR — kvalitetstavlan: hur bra Halkvakts halkvarningar är, mätt mot källor som varningarna inte bygger på

**Status:** ✅ **FASTSTÄLLT 2026-11-27 av Bengt och Axel** (DECISIONS #973). Bengt 27/11: *"ok bygg alltihop, täckning, träffsäkerhet,
relativ risk och kamerorna genom att öppna en slumpad halva nu. Axel säger ja och jag vill ha redovisning i adminfliken. Går så mycket
som går genom backtestning så att vi inte startar från 0 när vi börjar mätningarna"* och *"ge mej också indikationer på vad som är bra
resultat, godkänt resultat och mindre bra och vad man eventuellt ska göra för att förbättra resultatet"*. Axels ja kom via Bengt.
Dokumentet skrevs av Claude samma dag. Gränserna i §8 och raderna i §9 är Claudes, på Bengts begäran.

**Skrivet innan något tal lästs.** Inget mått, ingen källa och ingen gräns här kommer ur ett utfall. Tavlans första räkning, bakåt och
framåt, görs först när dokumentet ligger på main. Efter den första räkningen ändras inget mått, ingen källa och ingen gräns utan ett nytt
beslut med skälet bokfört (säsongsfacits regel L).

Bakgrunden är genomlysningen av olycksfacit 27/11 (bedömningen §4.2): olycksfacit svarar på om vi varnade vid en olycka, och svaret avgörs
oftast av samma stationer som också varnar. Tavlan mäter varningarna mot källor som de inte bygger på.

---

## 1. Vad tavlan är, och vad den inte är

- **En redovisning, ingen grind.** Den avgör inte vad som får tala och ändrar ingen regel. Kandidatens marsdom (halkvakt-kuvos), olycksfacit,
  säsongsfacit och domkalendern gäller som förut.
- **Olycksfacit står kvar** som felsökningslista: vilka olyckor vi missade och varför.
- **Säsongsfacit står kvar.** Tavlan lånar dess facitfönster (val 1), dess minsta antal (val 3) och dess väglagsfacit F1, och lägger till
  friktionen, kamerorna och den relativa risken, för alla lager och inte bara kandidaten.
- **Tavlan räknas bakåt så långt underlaget räcker (§11) och sedan varje dygn**, med samma kod.

## 2. Lagren, och vad föraren fick höra

Det föraren fick höra läses ur lägesfilens historik i kartrepot (Axelstar/halkvakt-karta, `data/app/v1/live.json`), som har sparats var
tionde minut sedan 11/9. Bakåttestet av kvarten 27/11 visade att historiken räcker för att avgöra vad appen sa (DB-knappen 45986674436).
En version gäller från sin tidpunkt (`generated_at`) till nästa, högst 20 minuter. En lucka längre än så är en tid utan fil, och dess
halvtimmar räknas inte för något lager.

| Lager | Varnar, i en version av lägesfilen | Platsen | Från |
|---|---|---|---|
| A1, hal sträcka | varje post i `segments` | sträckans linje | 11/9 |
| A2, frysrisk vid station | varje post i `weather` med `yta` högst +1 °C och `fukt` sann (motorns regel, `engine/src/engine.ts`). Broar och efterhalkans beta räknas inte | stationen | 11/9 |
| K, kandidatens betavarning | varje post i `kandidat` | postens punkter | första versionen med `kandidat` |
| R, småvägsrösten | varje punkt vars bit är satt i `smavag`, avkodad med `smavag.json` med samma kontrollsumma (`engine/src/smavagfil.ts`) | punkten | 25/11 20.24 UTC, när brytaren slogs på |
| Halkvakt | något av A1, A2, K och R | | |

**Jämförelsen J1, bilens snöflinga:** luften under +3 °C vid stationen (säsongsfacit J1). Den räknas för varje station och halvtimme med en
godkänd lufttemperatur, och som plats gäller stationen.

## 3. Källorna

| | Källa | Bedömbar enhet | Halt när | Ur |
|---|---|---|---|---|
| FR | **Friktionen** vid stationerna med ytstatusgivare (DECISIONS #465) | station × halvtimme med minst ett friktionsvärde | minst ett värde med friktion under 0,30 och yta högst +1 °C (DECISIONS #540) | `weather_observations`, och arkivets dygnsfiler i hinken för dygnen som gallrats |
| VL | **Trafikverkets väglag** (säsongsfacit F1) | väglagssträcka × halvtimme med en gällande rad | väglaget vid halvtimmens slut är halka, is, snö eller slask, med säsongsfacits ord (sql/099, sql/141) | `road_condition_history` |
| KA | **Kamerabilderna** i den öppna halvan (§10), klassade och ok:ade enligt DECISIONS #335 | en bild klassad is, snö, slask, våt eller bar | is, snö eller slask | `kamerafacit` |
| OL | **Singelolyckorna** | | | `situation_archive`, med olycksfacits ordlista för arten (`olycksart()`, sql/110): arten *ett fordon*. Två singelolyckor inom 1 km och 2 timmar räknas som en |

- **Värdevakten och radvakten.** Friktionen läses bara inom spannet 0–1 (`scripts/vardevakten.ts`), ytan inom −40…+60 °C och inte mer än
  12 °C under luften (radvakten, som sql/138 och sql/141). Luften för J1 läses inom −60…+60 °C.
- **Kamerorna bekräftar men fäller aldrig** (TROSKLAR-SKUGGAN §2): de räknas bara i träffsäkerheten. Bilderna väljs dessutom där en regel
  varnade eller teg (v2, v3, skuggans larmpunkter), så de kan inte mäta täckningen. Bilderna från tystnaden (v3) med is, snö eller slask
  redovisas som antal för sig.
- **Okänd** på en kamerabild är inte bedömbar.
- **Bara hinkens bilder.** De 41 klassade direktbilderna från provet av spåret i september (`docs/` i `kamerafacit`) ingår inte.
- **Kamerornas bas räknas inte,** eftersom bilderna väljs där en regel varnade eller teg. Lyftet visas därför bara för friktionen och väglaget.
- **Aldrig facit:** stationens yta (säsongsfacits F2) och olycksfacits klass TROLIG. De räknas inte någonstans i tavlan.

## 4. Platsen och fönstren

- **Platsen:** en varning gäller en källa inom **2 km** (olycksfacit §9.1, TROSKLAR-SKUGGAN §2). Avståndet mäts från källans plats till
  varningens närmaste punkt, eller till sträckans linje.
- **Enheten** är plats × UTC-halvtimme.
- **Täckningens fönster:** varningen räknas om den gällde någon gång från två timmar före den hala halvtimmen till halvtimmens slut, alltså
  före eller under halkan (säsongsfacit §5).
- **Träffsäkerhetens fönster:** källan räknas om den visade halka någon gång från en timme före varningens halvtimme till två timmar efter
  den (säsongsfacits val 1).

## 5. Oberoendet

Ett lager bedöms aldrig med en källa som det självt bygger på.

| Lager | FR friktionen | VL väglaget | KA kamerorna | OL olyckorna |
|---|---|---|---|---|
| A1 | ja | **nej**, A1 är väglaget | ja | ja |
| A2 | ja, märkt *samma station* när friktionen mäts vid den varnande stationen | ja | ja | ja |
| K | ja | ja | ja | ja |
| R | ja | **nej**, Trafikverket rapporterar inte småvägar | ja | ja, per punkttimme (§6) |
| J1 | ja | ja | ja | ja |

För väglaget räknas Halkvakts täckning utan A1 och står som *Halkvakt utom A1*.

## 6. Måtten

| Mått | Definition |
|---|---|
| **Täckning** (lager, källa) | Andelen hala enheter hos källan (FR eller VL) där lagret varnade inom 2 km, i täckningens fönster |
| **Träffsäkerhet** (lager, källa) | Andelen av lagrets varningsenheter som källan kunde bedöma (en observation inom 2 km i träffsäkerhetens fönster) där källan visade halka. *Alla källor* är andelen bedömbara av minst en oberoende källa som minst en bekräftar |
| **Basen** (källa) | Andelen av källans alla bedömbara enheter där källan visade halka i träffsäkerhetens fönster, oavsett varningar |
| **Lyftet** (lager, källa) | Träffsäkerheten delad med basen: hur många gånger vanligare halkan är under lagrets varningar än i genomsnitt |
| **Relativ risk** (lager) | Singelolyckor per miljon fordonskm när lagret varnade på sträckan, delat med samma tal när det inte varnade |

**Den relativa risken, i detalj** (DECISIONS #972:s metod):
- Enheten är väglagssträcka × timme för de 818 sträckorna. Längden är linjen i kartans `vaglag.geojson`, och trafiken är ÅDT ur
  `data/vagdata/segment.json`, delad på natt (22–06) och dag med NVDB:s lätta fordon 22–06 uppräknade med lastbilsandelen, och 5,1 % av ÅDT
  för natten där värdet saknas.
- Sträckorna utan ÅDT räknas inte, varken trafiken eller olyckorna.
- Lagret varnade på sträckan i timmen om det varnade inom 2 km av linjen någon gång under timmen.
- En singelolycka hör till sträckan om den ligger inom 100 m av linjen, i timmen när den började.
- R mäts per punkttimme, eftersom småvägarna saknar ÅDT: singelolyckor inom 0,5 km av den närmaste småvägspunkten (olycksfacits regel,
  sql/110), per timme när punkten varnade, delat med samma tal när den inte varnade.
- Olyckorna kräver ingen bedömning av om det var halt. Därför når måttet alla vägtyper och alla lager.

## 7. Indelningen och osäkerheten

- Tavlan räknas per svenskt dygn och visas per vecka och för säsongen hittills, per lager och källa.
- **Intervallen:** 95 %, bootstrappade per dygn (1 000 dragningar), eftersom halvtimmarna i ett dygn hänger ihop.
- **Minsta antal:** en andel visas bara med minst 20 händelser i nämnaren (säsongsfacits val 3), och den relativa risken bara med minst 20
  singelolyckor under varning. Annars visas bara antalet. Antalet står alltid bredvid.
- **Oenigheterna** listas för sig, som antal: låg friktion när kameran visar bar väg (svartis eller rimfrost), och halka i väglaget när
  friktionen är god inom 2 km (en gammal observation eller en lokal halka).

## 8. Gränserna: bra, godkänt och mindre bra

Färgen sätts efter punktskattningen. När intervallet spänner över två färger står *osäkert* bredvid. En cell under minsta antalet (§7)
får ingen färg.

| Mått | Bra (grönt) | Godkänt (gult) | Mindre bra (rött) | Gäller |
|---|---|---|---|---|
| Täckning | minst 80 % | 60–80 % | under 60 % | raden *Halkvakt* (och *Halkvakt utom A1* för väglaget). Ett enskilt lager visas utan färg: inget lager ska täcka allt ensamt |
| Lyftet | minst 4 | 2–4 | under 2 | varje lager och källa |
| Relativ risk | minst 3 | 1,5–3 | under 1,5 | varje lager |
| Mot snöflingan | | | lägre lyft än J1 för samma källa | varje lager: blir rött oavsett lyftets färg |

**Skälen.**
- *Täckning 80 %:* föraren ska få en varning vid fyra av fem uppmätta hala halvtimmar. Under 60 % missar vi mer än var tredje.
- *Lyftet 2 och 4:* lyft 1 är vad ett slumpmässigt valt ställe ger. Vid 2 är halkan dubbelt så vanlig under varningen som annars, och
  varningen bär information. Vid 4 är den tydligt bättre än en gissning på vädret. Lyftet används i stället för den råa träffsäkerheten,
  som går upp och ner med vädret.
- *Relativ risk 1,5 och 3:* en varning ska peka ut timmar som är farligare att köra. Under 1,5 är skillnaden för liten för att föraren ska
  behöva ändra något. Vid 3 är risken tredubblad, och det är skäl att sakta ner.
- *Snöflingan:* ett lager som inte pekar ut halkan bättre än bilens egen varning tillför inget (säsongsfacit §5).

## 9. Vad man gör när ett tal är svagt

| När | Läs först | Vanliga orsaker och vad som kan göras |
|---|---|---|
| Täckningen är låg | de hala enheterna utan varning, per lager som låg närmast | Kandidatens yta över 0 °C (kort #675, DECISIONS #947). Fukten som inte syns (stationssnö, radarn, F95). Räckvidden (skuggan läses 29/11). Trafikverkets fördröjning för A1. En ändring prövas i skuggan innan den talar |
| Träffsäkerheten eller lyftet är lågt | de varningar som ingen källa bekräftade | Saltade vägar som är våta under noll (sql/146). Gammalt väglag (väglagets ålder, DECISIONS #968). För bred räckvidd. Fukt från nederbörd som slutat för länge sedan. En stramare regel prövas tyst först |
| Den relativa risken är låg | timmarna med varning och utan olycka, och olyckorna utan varning | Varningarna sprids över timmar som inte är farliga: samma åtgärder som för träffsäkerheten. Eller missas de farliga timmarna: samma som för täckningen. Få olyckor: vänta på fler |
| Lyftet är lägre än snöflingans | lagrets regel som helhet | Lagret tillför inget utöver luften. Bengt och Axel avgör om det ska pausas eller byggas om |
| Källorna är oense | oenighetslistan (§7) | Låg friktion med bar väg i bild är svartis: A2 eller K borde ha varnat. Halka i väglaget med god friktion: läs väglagets ålder |

## 10. Kamerorna: två slumpade halvor (ändrar DECISIONS #335)

- **Delningen**, skriven innan någon bild har öppnats: en kamera hör till den **öppna halvan** när den första byten i
  sha256 av texten `halkvakt-kamerahalvor-2026-11-27/` följd av kamerans id (bildens filnamn före det sista bindestrecket, till exempel
  `SE_STA_CAMERA_VViS_2353_K1`) är jämn, och annars till den **blinda halvan**. Det gäller alla bilder i hinken `facit` (v2/, v3/ och skuggans
  dagsmappar), de som finns och de som kommer.
- **Den blinda halvan** öppnas vid kandidatens marsdom, som DECISIONS #248 och #335 säger. Inget skript läser dess bilder före domen:
  skriptet som gör kontaktarken väljer bara den öppna halvan och prövar regeln själv. Marsdomen läses på den blinda halvan och får alltså
  omkring hälften så många bilder som förut.
- **Ordningen i den öppna halvan:** bilderna klassas i ordning efter sha256 av texten `halkvakt-kameraordning-2026-11-27/` följd av
  bildens sökväg. Varje början av listan är därmed ett slumpmässigt urval, och tavlan kan visa de bilder som hunnit klassas.
- **Klassningen som förut** (DECISIONS #335): Claude klassar blint ur kontaktark som visar nummer, kamera och klockslag, aldrig mappen eller
  vad någon regel sa. Axel ok:ar stickprovet (minst 10 % och varje is, snö och slask), och Bengt stickprovar. En bild räknas i tavlan först
  efter Axels ok. Tavlan visar hur många som är klassade och hur många som väntar på ok.

## 11. Bakåt så långt det går, och sedan framåt

Bengt 27/11 (husregeln): innan en mätning slås på framåt prövas om svaret går att få bakåt. Tavlan räknas därför bakåt först:

| Del | Bakåt från | Skälet |
|---|---|---|
| A1, A2 och J1 mot väglaget | 11/9 | lägesfilens historik var tionde minut |
| Mot friktionen | 6/10 | ytstatusgivarna i arkivet (DECISIONS #465) |
| K | första versionen med `kandidat` | |
| R | 25/11 20.24 UTC | brytaren |
| Relativ risk | 11/9 | `situation_archive` har olyckorna sedan april 2025 |
| Kamerorna | 15/9 | den öppna halvan, i den takt den klassas |

- **Samma kod bakåt och framåt:** `scripts/kvalitetstavlan.ts` räknar ett eller flera dygn och skriver bara aggregat per dygn, lager och
  källa till tabellen `kvalitet_dag` (RLS på, inga rättigheter för `anon` och `authenticated`). Flödet `kvalitetstavlan.yml` räknar
  gårdagen varje dygn efter säsongsfacit, och bakåt på knapp. Repot är publikt, så flödet skriver bara klart eller fel i loggen.
- **Redovisningen** står i adminsidan (admin.halkvakt.se) i en egen flik, med färgerna i §8 och raderna i §9 (Bengt 27/11).

## 12. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-27 | i chatten: *"ok bygg alltihop … Axel säger ja"* och *"ge mej också indikationer på vad som är bra resultat, godkänt resultat och mindre bra"* |
| Axel | 2026-11-27 | via Bengt: *"Axel säger ja"* |
