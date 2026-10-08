# Kuvösen: Trafikverkets leverans 2/10 2026 — inventering, besiktning och tidszon

*Kort #232, PLAN-KUVOSEN steg 2–3, DECISIONS #424 och #438. Läs-only: ingenting är inläst i någon databas, ingen regel är körd och
inget utfall är läst. Skriptet för varje tal står vid tabellen.*

*Uppdaterat 2/10 kväll (DECISIONS #439): nederbördskoderna 1, 2, 4 och 6 lästa på Trafikverkets källa, vintern inläst i kuvösens
databas och vakterna körda som antal — §7. Fortfarande inget utfall läst.*

## 1. Vad som kom

Bengt laddade ner fem filer från VViS Förvaltning (Micke Wallin) 2/10 kl. 16:04–16:05, en per månad november 2024–mars 2025.
De är packade och ligger som tillgångar i den privata releasen **`kuvos-trv-2024-25`**, med sha256 före och efter packning; varje
tillgång är nedladdad igen och jämförd (lika). Manifestet står i `kuvos/leverans.json`. Filerna ligger aldrig i repot och aldrig i
Supabase. Originalen ligger kvar i Bengts *Hämtade filer*.

| Fil | Rader | Stationer | Första stämpel | Sista stämpel | Rader per station (median) |
| :-- | --: | --: | :-- | :-- | --: |
| `Halkvakt_2411.csv` | 1 091 419 | 769 | 2024-11-01 00:00:03 | 2024-11-30 23:30:05 | 1 440 |
| `Halkvakt_2412.csv` | 1 123 231 | 759 | 2024-12-01 00:00:03 | 2024-12-31 23:30:05 | 1 488 |
| `Halkvakt_2501.csv` | 1 128 074 | 762 | 2025-01-01 00:00:03 | 2025-01-31 23:30:03 | 1 488 |
| `Halkvakt_2502.csv` | 1 022 255 | 765 | 2025-02-01 00:00:03 | 2025-02-28 23:30:04 | 1 344 |
| `Halkvakt_2503.csv` | 1 131 291 | 766 | 2025-03-01 00:00:03 | 2025-03-31 23:30:06 | 1 486 |
| **Totalt** | **5 496 270** | **777** | | | |

Medianstationen har en rad varje halvtimme hela månaden (30 × 48 = 1 440). Inga dubbletter per station och halvtimme. 85 MB packat.

**Formatet:** semikolon, **decimalkomma**, BOM, riktningen med efterställt mellanslag (`N `), och en sidfot från SQL Server Management
Studio efter sista raden (`(N rows affected)`, `Completion time`, tomma rader) — fem rader per fil, de enda med fel antal fält.
Första inventeringen (`kuvos/inventering.ts`) läste decimalkommat som text i de flesta rader; andra körningen av besiktningen rättade det.

## 2. Kolumnerna

| Kolumn | Trolig betydelse | Platshållare | Spann utan platshållare (p0,1 … p99,9) | Arkivets kolumn |
| :-- | :-- | :-- | :-- | :-- |
| `measurepoint` | stationens id, samma nummerserie som API:ts `Id` | — | 201 … 7601 | `station_id` |
| `measuretime` | stämpeln, **svensk lokaltid** (§3) | — | :00 och :30, sekund 03 | `sample_time` (UTC) |
| `tyta` | vägytans temperatur, °C | −99,9: 2,8 % | −19,7 … 20,4; 36 rader utanför ±45 (−50,0 · 46,x) | `surface_temp_c` |
| `tluft` | lufttemperatur, °C | −99,9: 0,2 % | −28,3 … 14,1 | `air_temp_c` |
| `daggp` | daggpunkt, °C | −99,9: 0,2 % | −29,5 … 9,9 | `dewpoint_c` |
| `lu_fu` | relativ luftfuktighet, % | −99,9: 0,2 % | 29,3 … 100 | `humidity_pct` |
| `ned_typ` | nederbördstyp, **kod** | −9: 1,0 % | koderna 1, 2, 3, 4, 6, 9 | `precipitation`, `rain`, `snow` — 1/2/4/6 översatta (§7), 3/9/−9 **väntar** |
| `ned_maengd` | nederbördsmängd, **enhet okänd** | −99,9: 0,4 % · **−99,8: 0,65 %** | 0 … 15,5; fem rader över 100 (max 1 049,3) | `rain_sum_mm`? — **väntar** |
| `vimax` | vind, troligen byvind: högsta 3-sekundersmedel på 30 min (§5a) | −99,9: 0,5 % | 0,5 … 21,4; 208 rader över 60 m/s | `wind_gust_ms`? — **väntar** |
| `vimed` | vind, troligen medelvind: 10-minutersmedel (§5a) | −99,9: 0,3 % | 0,1 … 13,1 | `wind_speed_ms`? — **väntar** |
| `vind30` | vind, troligen 30-minutersmedel (§5a) | −99,9: 0,3 % | 0,2 … 13,0 | — |
| `virik` | vindriktning, åtta väderstreck | −9 (text) | N · NO · O · SO · S · SV · V · NV | `wind_dir_deg` (sektorns mitt) |
| `siktdjup` | sikt, m | −100: 0,9 % · 20 000: 67,6 % | 112 … 19 695 | `visibility_m` |

Skript: `scripts/matningar/kuvos-besiktning-2026-10-02.py`. Byvindarna över 60 m/s och sikten 20 000 m är samma fällor som i vårt eget
arkiv (VÄRDEVAKTEN i CLAUDE.md). `−99,8` i mängden är ny: den liknar platshållaren men är inte den, och den är vanligare än −99,9.

**Nederbördstypens koder, beskrivna utan att översättas:**

| Kod | Rader | Luft ≤ −2 °C · −2…+2 · ≥ +2 | Mängd > 0 |
| --: | --: | :-- | --: |
| 1 | 4 469 117 | 30 % · 27 % · 43 % | 0,0 % |
| 2 | 410 201 | 0,2 % · 25 % · 74 % | 44 % |
| 3 | 915 | 64 % · 37 % · 0 % | 5,5 % |
| 4 | 536 474 | 65 % · 35 % · 0,1 % | 72 % |
| 6 | 23 737 | 3 % · 87 % · 10 % | 32 % |
| 9 | 508 | 8 % · 91 % · 1 % | 0 % |
| −9 | 55 318 | 13 % · 20 % · 68 % | 0,1 % |

Mönstret går att läsa som uppehåll, regn, snö och snöblandat regn, men det är en gissning. Koderna översätts först med Trafikverkets
kodlista (§5). Motorns *fukt* bygger på nederbörden, så frysrisken kan inte spelas upp förrän koderna är kända. *(Överspelat 2/10 kväll:
1, 2, 4 och 6 är översatta ur VädErs 2019, §7. Kvar är 3, 9 och −9, som är 0,03 % och 1 % av raderna, och riktningsprovet väntar på
Trafikverkets svar om dem, längst till vecka 42 — bedömningen §4.2.)*

**Vindfälten mot varandra** (5 469 308 rader utan platshållare): `vimax ≥ vind30` i 100 %, `vimax ≥ vimed` i 100 %, men
`vind30 ≥ vimed` bara i 60,8 %. `vind30` är alltså inget maximum.

## 3. Tidszonen — mätt, som förregistreringen kräver

Två oberoende prov, båda med samma svar: **stämplarna är svensk lokaltid** (Europe/Stockholm) och görs om till UTC vid inläsningen.

1. **Sommartiden.** Natten till 30/3 2025 hoppar svensk tid från 02:00 till 03:00. Leveransen har 1 522 rader i varje timme 00–09
   den natten utom timmen 02, som har **0**. I UTC hade timmen funnits.
2. **SMHI.** Lufttemperaturens timförändring vid tio VViS-stationer mot närmaste SMHI-station (0,8–3,7 km), förskjutning −3 … +3 h,
   med stämplarna lästa som lokaltid och gjorda om till UTC. Urvalet bestämdes i skriptet innan något tal lästes: två par per
   breddgradsband 55–69 °N, de närmaste med SMHI-arkiv över hela perioden; par utan gemensamma timmar hoppades över och skrevs ut.

| VViS | SMHI | Avstånd | Timpar | −1 h | **0 h** | +1 h |
| --: | :-- | --: | --: | --: | --: | --: |
| 1203 | Malmö A | 1,7 km | 3 620 | 0,51 | **0,84** | 0,50 |
| 1215 | Hörby A | 1,7 km | 3 620 | 0,57 | **0,84** | 0,54 |
| 1440 | Göteborg-Rya | 1,6 km | 3 620 | 0,54 | **0,85** | 0,50 |
| 523 | Kolmården-Strömsfors A | 1,9 km | 3 620 | 0,55 | **0,73** | 0,49 |
| 1917 | Kerstinbo A | 3,2 km | 3 620 | 0,57 | **0,81** | 0,56 |
| 7501 | Gävle A | 3,7 km | 3 620 | 0,52 | **0,82** | 0,50 |
| 2423 | Fredrika A | 0,8 km | 3 622 | 0,37 | **0,82** | 0,34 |
| 2221 | Sundsvall-Timrå Flygplats | 1,1 km | 3 609 | 0,38 | **0,60** | 0,38 |
| 2533 | Nikkaluokta A | 0,9 km | 3 620 | 0,32 | **0,77** | 0,30 |
| 2519 | Katterjåkk A | 2,5 km | 2 583 | 0,28 | **0,55** | 0,15 |

**Tio av tio** har sin topp vid 0 h. Skript: `scripts/matningar/kuvos-tidszon-2026-10-02.py` (SMHI:s data är öppen, CC BY 4.0).
Hoppade över, utan gemensamma timmar: 1603 Skara, 2112 Hudiksvall, 2558 Övertorneå (SMHI-stationer med få observationer per dygn).

## 4. Stationerna

- **754 av 777** finns i dagens stationslista (854 stationer i `static.json`) och har därmed koordinater.
- **23 finns inte där:** 298, 321, 324, 428, 650, 901, 902, 908, 1227–1231, 1329, 1434, 1435, 1518, 1525, 1547, 1613, 1801, 1815, 7201.
  Troligen nedlagda eller flyttade efter 2025. Inget gissas: de används inte förrän Trafikverket ger deras läge.
- **100 stationer i dagens lista saknas i leveransen**, de flesta med sexsiffriga id (206100, 215100 …). Troligen tillkomna efter mars
  2025. De finns inte i kuvösen, och det redovisas.

## 5. Vad som återstår före inläsningen

| Steg | Läge |
| :-- | :-- |
| Temperaturerna, fuktigheten, sikten och riktningen | Kan översättas nu: −99,9 och −100 blir NULL, 20 000 behålls som i driften och tas av värdevakten |
| Nederbördstypen 1, 2, 4, 6 | ✅ Översatta 2/10 kväll ur VädErs 2019 (§7) |
| **Nederbördstypen 3, 9, −9, mängden och vindfälten** | **Väntar på Trafikverket** — frågorna nedan (NULL i arkivet tills dess) |
| De 23 stationerna utan läge | Utanför: inte i dagens nät; frågan om läget struken ur mejlet 8/10 (Bengt, §5d) |
| Vakterna (#75, radvakten, karantänen, den långsamma vakten) | Körs när datan är inläst, i kuvösens databas; redovisas som antal |
| Värdevakten | Körs på kuvösens databas före riktningsprovet; ett fält utan spann stoppar |

### 5a. Läst på Trafikverkets egna sidor (2/10, Bengts fråga)

Trafikverkets datamodell för det öppna API:t (*WeatherObservation 2.1*, data.trafikverket.se, läst i webbläsaren) beskriver fälten
för samma stationer i dag. Den har inga numeriska koder och inga kolumnnamn som leveransens, men den besvarar två frågor nästan helt:

| Fält i API:t | Trafikverkets beskrivning | Leveransens kolumn, troligen |
| :-- | :-- | :-- |
| `Wind.Speed` | medelvärde över tiominutersperiod t.o.m. tidpunkten, m/s | `vimed` |
| `Aggregated30minutes.Wind.SpeedAverage` | medelvind över 30 minuter, m/s | `vind30` |
| `Aggregated30minutes.Wind.SpeedMax` | högst uppmätt 3-sekundersmedelvärde under perioden, m/s | `vimax` |
| `Aggregated30minutes.Precipitation.RainSum` | mängd regn under perioden, mm | `ned_maengd`, om den är regn och inte all nederbörd |
| `Weather.Precipitation` | vilken typ av nederbörd som detekterats (text, ingen kodlista) | `ned_typ` |
| `Air.VisibleDistance` | sikt i m, *"OBS! Ej kvalitetssäkrad"* | `siktdjup` |
| `Sample` | tidpunkten *"inklusive tidzon för att hantera sommartid och normaltid"* | `measuretime`, utan zon i leveransen |

Vindens tre fält stämmer med leveransens mönster: `vimax` är alltid störst, medan `vind30` och `vimed` växlar (60,8 %), som ett
30-minutersmedel och ett 10-minutersmedel gör. VTI notat 39-2003 (ersättningsmodellen för vinterväghållning) säger att VViS-vinden
där är ett medelvärde över 30 minuter. Tidszonen är redan mätt (§3). **Inte hittat någonstans:** `ned_typ`:s koder, −99,8, sikten
20 000 och −100, och läget för de 23 stationerna. VTI:s tre notat om VViS-data (2002, 2003, 2013) nämner nederbördstyp men inga koder.

### 5b. Frågorna till Trafikverket

Bengt skickar till Micke Wallin, som svar i samma tråd. Fyra frågor och en bekräftelse; tidszonen och vinden behöver inte frågas.

**Skickat 2/10 kväll av Bengt** till Micke Wallin, som svar i leveranstråden: de fyra frågorna och bekräftelsen, med fråga 1 i den allmänna lydelsen (*vad betyder koderna 1, 2, 3, 4, 6 och 9, och −9?*). Omskrivningen nedan efter #439 kom på main samtidigt och gick inte med; svaret på den allmänna frågan täcker den.

1. `ned_typ`: följer VViS-filen MESAN:s numrering i *Ersättningsmodell VädErs 2019* (1 ingen nederbörd, 2 regn, 4 snö, 6 både snö
   och regn)? Och vad betyder 3, 9 och −9, som inte står där? *(Omskriven 2/10 kväll, DECISIONS #439.)*
2. `ned_maengd`: är det mm per 30 minuter, och är det regn eller all nederbörd omräknad till vatten? Och vad betyder −99,8, som skiljer
   sig från −99,9?
3. `siktdjup`: betyder 20 000 att sikten är större än mätområdet, och −100 att sikt inte mäts?
4. Läget (koordinater) för 23 stationer som inte finns i dagens öppna API: 298, 321, 324, 428, 650, 901, 902, 908, 1227–1231, 1329,
   1434, 1435, 1518, 1525, 1547, 1613, 1801, 1815 och 7201.
5. Bekräftelse: är `vimax` byvinden (högsta 3-sekundersmedel på 30 minuter), `vimed` 10-minutersmedlet och `vind30` 30-minutersmedlet,
   som i API:t?

### 5c. Läst på nätet 6/10 (Bengts order: *"gör en ordentlig sökning på internet"*)

Fyra källor bär svar; läst på källorna, inte ur sammanfattningar. Inget av detta är Trafikverkets svar på frågorna, och svaret går före.

**Fråga 5, vinden: besvarad av API-dokumentationen.** WeatherMeasurepoint v2 (speglad ordagrant i Go-paketet `code.dny.dev/trafikinfo`,
https://pkg.go.dev/code.dny.dev/trafikinfo/trv/weathermeasurepoint/v2): `Wind.Speed` = *"Medelvärde över tiominutersperiod t.o.m.
tidpunkten"* (vimed), `Aggregated30minutes.Wind.SpeedMax` = *"Högst uppmätt 3-sekundersmedelvärde under perioden"* (vimax),
`SpeedAverage` över 30-minutersperioden (vind30). VTI notat 39-2003 (Möller) och 38-2013 (Arvidsson, Gustavsson, Bogren): VädErs räknar
vind som *"medelvärde över 10 eller 30 minuter beroende på om MESAN- eller VViS-data används"*, alltså 30 minuter för VViS. Stämmer med
§2:s egen mätning: vimax ≥ vind30 och vimax ≥ vimed i 100 %, vind30 ≥ vimed bara i 60,8 %, som ett medel mot ett annat medel.

**Fråga 3, sikten: besvarad av sensorn.** Trafikverkets presentation *Nästa generations VViS* (Jonas Jonsson, 2019-10-24, SMHI:s
metodkonferens): nederbördssensorn byts från Optic-Eye till Vaisala PWD22, *"den nya nederbördssensorn mäter även sikt"*; MS7 i 10, 70,
140, 170, 175, 175 stationer 2019–2024 av 775. Vaisalas datablad för PWD-serien (docs.vaisala.com): PWD22:s mätområde för sikt
*10–20 000 m*. Alltså: 20 000 = sensorns tak, sikt minst 20 km; −100 = ingen siktsensor (MS4 med Optic-Eye). API:t märker fältet
*"Ej kvalitetssäkrad"*.

**Fråga 1, koderna: härledd, inte dokumenterad.** API:t dokumenterar sex nederbördstyper: `no` *Ingen nederbörd*, `rain` *Regn*,
`freezing_rain` *Frusen regn*, `snow` *Snö*, `sleet` *Snöblandat regn*, `yes` *Nederbörd* (typ okänd). Filen har sex koder: 1, 2, 3, 4, 6, 9.
VädErs 2019 ger 1 = ingen, 2 = regn, 4 = snö, 6 = snö och regn. Kvar är 3 och 9 mot `freezing_rain` och `yes`; 3 mellan regn och snö är
underkylt regn, 9 är nederbörd av okänd typ. PWD22 rapporterar just *freezing rain* och *precipitation (unknown type)*. −9 är ett
saknat-värde som −99,9 och −100. Prövas i kuvösen innan det översätts: kod 3 ska ligga i minusgrader i luften med mängd, kod 9 ha mängd
utan typ.

**Fråga 2, mängden: delvis.** Enheten är mm (PWD22: ackumulering 0,00–99,99 mm; API:t: *"Mängd … under perioden. Value [mm]"*), och
perioden är 30 minuter som raderna. API:t skiljer `RainSum`, `SnowSum.WaterEquivalent` och `TotalWaterEquivalent`; filens enda kolumn
är sannolikt stationens totala vattenvärde (VädErs räknar om till cm snö), men det är inte läst någonstans. Regn mot total läses
empiriskt mot SMHI:s parameter 7 på snötimmar. −99,8 mot −99,9 finns inte dokumenterat.

**Fråga 4, de 23 stationerna: ingen öppen väg utan konto.** Numren ser ut som gamla länskoder (12 Malmöhus, 13 Halland, 14 Göteborg
och Bohus, 15 Älvsborg, 16 Skaraborg, 18 Örebro), alltså nedlagda stationer. API:ts `includedeletedobjects` behåller raderade poster i
24 timmar och hjälper inte. Trafikverkets dataprodukt *VViS* (stolparnas läge, id och utrustning; GeoPackage, CC0) finns på Lastkajen
och i NVDB:s kartvisare (https://catalogue.arctic-sdi.org/geonetwork/srv/resources/records/2723b729-d89f-4197-b4ab-aaf98c341d25),
men Lastkajen kräver konto, och om nedlagda stolpar finns med står inte i metadatan.

### 5d. Begäran till Trafikverket om facit för samma vinter (Bengts ja 6/10; omskriven 8/10 till ett färdigt mejl efter #464, Bengt skickar i leveranstråden)

> Hej Micke,
>
> tack igen för uttaget. Det är inläst och vi har arbetat med det sedan dess. Frågorna jag skickade den 2 oktober har vi kunnat lösa
> själva ur Trafikverkets dokumentation, så dem behöver du inte lägga någon tid på.
>
> Nu skulle vi vilja pröva mot vad som faktiskt hände på vägen, inte bara mot stationens egen yta. Därför vill jag be om fyra uttag
> till för samma period, november 2024–mars 2025, på samma villkor som förra gången:
>
> 1. **Ytstatus och friktion** från stationerna med beröringsfria ytstatusgivare: torrt, vått, is, snö och friktion (i öppna API:t
>    `Surface.Water`, `Ice`, `Snow` och `Grip`), per station och halvtimme, i samma form som förra uttaget.
> 2. **Rapporterat väglag** per vägsträcka (RoadCondition i öppna API:t), om historiken sparas.
> 3. **Utförda vinterväghållningsåtgärder**, saltning och plogning, per sträcka och tid, om sådana data finns att lämna ut.
> 4. **Händelser** (olyckor, djur och hinder; Situation i öppna API:t), om historiken sparas.
>
> Finns det redan uttag eller exportfiler som ligger nära räcker de gott, så anpassar vi oss efter formen. De får gärna komma ett i
> taget, i den takt det passar er. Skulle något av det kosta något, hör gärna av dig med beloppet innan ni sätter igång.
>
> Ligger något av detta utanför ditt område tar jag gärna emot namnet på rätt kontakt.
>
> Vänliga hälsningar
> Bengt

*Omskrivet igen 8/10 (Bengt: "stryk och skriv om bara fokus på det nya viktiga").* Mejlet bär nu bara begäran. Struket: frågan om
läget för de 23 stationerna (104 671 rader av 5 496 270, 1,9 %; troligen nedlagda och inte i dagens nät, så som grannar skulle de ge
kuvösen ett tätare nät än driften har, och riktningsprovet kördes utan dem, #464), frågan om siktdjupet (valet står i #464 punkt 5)
och uppdateringen om vind, mängd och koder, som blev en mening. Ordningen följer värdet: vägens tillstånd först (Axels fynd att
felen kommer i dygnsstora block, kuvössidan §5), händelserna sist. Enligt #398 frågar texten efter befintliga uttag först och ber
om beloppet innan arbete börjar; ingen kostnad accepteras utan Axels godkännande. Fordonsdata är medvetet utanför mejlet: Micke
ansvarar för väderstationerna, Trafikverket delar inte köpt fordonsdata utan särskild överenskommelse (DECISIONS #282, läst 21/9),
och en egen fråga om fordonsdata från 17/9 är obesvarad. Frågan om Trafikverkets egen vägväderprognos (kort #298, punkt 10) är också
utanför; Bengt avgör om den ska med.

Inget i utkastet bär tal ur tröskeldokumenten eller resultat (DECISIONS #463).

## 6. Vad det här inte är

Ingen regel är körd och inget utfall är läst. Förregistreringen (DECISIONS #424, tilläggen #426 och #437) skrevs innan filen öppnades;
#437 checkades in 2/10 07:13 (då med numret #436, omnumrerad samma eftermiddag när kort #258 tog #434), och filen kom 16:04. **Från och med nu är filen öppnad:** ett nytt tillägg kan inte kallas *före filen*, bara
*före riktningsprovet*, och ska säga det.

## 7. Nederbördskoderna och inläsningen (2/10 kväll, DECISIONS #439)

**Källan.** Axel hittade Trafikverkets *Ersättningsmodell VädErs 2019 — vägklass 4, 5 och GC*
(bransch.trafikverket.se, `ersattningsmodell_vaders_2019_vagklass_4_5_och_gc.pdf`). Läst på källan, s. 6–7: *"Nederbörd anges i fyra
typer: Ingen nederbörd (kod 1), regn (kod 2), snö (kod 4) samt både snö och regn (kod 6)."* Koderna gäller MESAN, som VViS-data matar.
Listan som först kom in, från en söksammanfattning, hade också *3 = underkylt regn* och *9 = okänd* — **de står inte i dokumentet** och
används inte. Datan stämmer med de fyra, kod för kod (luften i §2): 2 i plusgrader, 4 i minus, 6 kring noll, 1 utan mängd.

**Översättningen** (`kuvos/oversattning.sql`, regeln på ett ställe; den råa tabellen `kuvos_ra.trv_obs` är orörd och översättningen
körs om när Micke svarar):

| Kod | Arkivets `precipitation` | `rain` · `snow` | Rader (stationer med läge) |
| --: | :-- | :-- | --: |
| 1 | `no` | nej · nej | 4 416 619 |
| 2 | `rain` | ja · nej | 403 585 |
| 4 | `snow` | nej · ja | 534 034 |
| 6 | `sleet` | ja · ja | 23 468 |
| 3, 9, −9 | NULL | nej · nej | 914 · 506 · 12 473 |

Mängden (`rain_sum_mm`) och vindstyrkan (`wind_speed_ms`, `wind_gust_ms`) är NULL tills fråga 2 och 5 är besvarade. Vindriktningen är
översatt (sektorns mitt), sikten −100 → NULL och 20 000 kvar som i driften.

**Inläsningen** (`kuvos/inlasning.ts`, lokalt 2/10 på PostgreSQL 16 + PostGIS 3, 2½ min; knappen `kuvos` gör samma sak i Actions):

| | |
| :-- | --: |
| Rader inlästa råa | 5 496 270 (777 stationer), sidfoten 2 rader per fil |
| Utan läge, inte inlästa | 23 stationer, 104 671 rader |
| **Arkivet** | **5 391 599 rader, 754 stationer**, 2024-10-31 23:00 – 2025-03-31 21:30 UTC |
| Sommartiden | sammanhängande halvtimmar i UTC över natten till 30/3 (stickprov 1203 Malmö) |

**Vakterna som antal** (`kuvos/vakterna.ts`; den långsamma vakten körd över hela vintern med sql/030:s egen funktion):

| Vakt | Rader | Stationer |
| :-- | --: | --: |
| Utan yta | 132 950 (2,47 %) | |
| #75 (ytan > 12 ° under luften) | 922 (0,02 %) | 41 |
| Radvakten (luft ≥ 10 °C, gap ≥ 8 °) | 543 (0,01 %) | 78 |
| Karantänen (≥ 3 brott på 7 dygn) | 15 272 (0,28 %) | 29 |
| Den långsamma vakten | 16 263 (0,30 %), 340 stationsdygn | 86 |
| **Får tala efter alla fyra** | **5 229 352 (96,99 %)** | |

Talen är knappens körning i Actions (37027706480); en lokal databas i svensk tid gav 20 karantänrader färre, eftersom sju dygn över
sommartiden 30/3 är en timme kortare där. Kuvösens anslutningar sätter därför UTC, som Supabase.

**Värdevakten** (`scripts/vardevakten.ts 1000`): fem fält i `weather_observations` besiktade och rimliga (yta −50…50, luft −37…18,4,
daggpunkt −40…12, fuktighet 13,5…100, riktning 0…315), inget OBESIKTIGAT. Sikten flaggas som misstänkt sentinel — taket 20 000 i 68 % —
som i driften. Mängden och vinden har inga rader och prövas när de översätts.

**Vad som kan spelas upp nu och vad som väntar:** frysrisken, broarna och trenden bygger på yta, luft, daggpunkt, fukt och snö — de finns.
**Efterhalkan (S1, S2) väntar på mängden** (`regn_h` läser `rain_sum_mm`), vinden på fråga 5. Inget utfall är läst: ingen regel är
körd, ingen yta efter en tidpunkt läst.

## 8. SMHI för samma vinter (steg 4, 2/10 kväll, DECISIONS #441)

Hämtat en gång ur SMHI:s öppna data (CC BY 4.0) och lagt bredvid i releasen **`kuvos-smhi-2024-25`** (knappen `kuvos-smhi`, manifest
`kuvos/smhi-leverans.json`). Inläst i kuvösens databas av `kuvos/smhi-inlasning.ts`; knappen `kuvos` gör det efter Trafikverkets fil.

**Stationerna (metobs, `corrected-archive`, bara vinterns rader):**

| Parameter | Läser i dag | Stationer över vintern | Rader nov–mar | Inte G-kontrollerade | VViS-stationer inom 50 km |
| :-- | :-- | --: | --: | --: | --: |
| 1 lufttemperatur, 1/tim | smhi-prov, SMHI-jämförelserna | 243 | 667 767 | 1,6 % | 752 av 754 (median 17,5 km) |
| 7 nederbördsmängd, 1 tim | — (mot VViS-mängden när den är förklarad) | 181 | 507 575 | 2,4 % | 728 av 754 (23,9 km) |
| 13 rådande väder (WMO) | grind NT | 162 | 583 084 | 0,0 % | 741 av 754 (21,6 km) |
| 16 total molnmängd | T-A, R-A (`publish/moln.ts`) | 108 | 378 509 | 0,0 % | 680 av 754 (29,7 km) |

Molnets täckning, 90 % inom 50 km med median 30 km, är densamma som driftens mätning (DECISIONS #114: 91 %, 29 km). Värdena skrivs som
SMHI skrev dem, 113 % i molnet inräknad: `moln.ts` klassar den, inläsningen gör det inte.

**Radarn.** Arkivet för 2024/25 har bara **tif och png** — h5-länken, som driften läser, ger 404 (mätt 2/10; kontrollen 21/9 räknade
kompositerna men inte formaten). Tif-kompositen är ett annat rutnät (SWEREF 99 TM, 471 × 887 pixlar à 2 015 m) med SMHI:s dokumenterade
kodning *dBZ = 0,4 × pixel − 30, 0 = inget eko, 255 = ingen data* (opendata.smhi.se, radar). Läsaren är egen (`kuvos/tif.ts`, avkodar
arkivfilen pixel för pixel som Pillow) och samplingen är driftens egen kärna, nu delad (`ingest/radar-karna.ts`): samma 2-km-punkter
längs de 818 segmenten, samma Marshall–Palmer, samma händelsegräns 0,1 mm/h.

| Månad | Kompositer | Saknas | Segmentrader med regn |
| :-- | --: | --: | --: |
| 2024-10 (sista timmarna) | 4 | 0 | 521 |
| 2024-11 | 1 439 | 1 | 119 608 |
| 2024-12 | 1 488 | 0 | 154 081 |
| 2025-01 | 1 477 | 11 | 201 272 |
| 2025-02 | 1 344 | 0 | 77 397 |
| 2025-03 | 1 488 | 0 | 93 399 |
| **Hela vintern** | **7 240 av 7 252 halvtimmar** | **12** | **646 278** |

Värdevakten: `rate_mean_mmh` rimlig (0…62 mm/h); `rate_max_mmh` har 47 rader över spannets 200 mm/h (max 515), samma artefakt som
driftens självtest känner (727 mm/h).

**⚠️ Tif är inte samma produkt som h5.** Samma tidpunkt ur båda formaten (`scripts/matningar/kuvos-radar-tif-h5-2026-10-02.ts`, 26
tidpunkter 27/9–1/10 2026, 318 pixlar med eko i båda): **tif ligger 8–10 enheter över h5 i varje band, ≈ 3,4 dBZ** — med Z–R-formeln
ungefär **1,6 gånger mer regn** — och ser fler svaga eko (78 pixlar bara i tif, 48 bara i h5). På segmentnivå 1/10 (`--jamfor`):
119 segmenthändelser i båda, 74 bara i tif, 10 bara i h5. Täckningen är densamma (81 mot 82 punkter utanför av 12 960). **Ingen
korrektion är gjord** — en vald förskjutning vore ett tal valt efter en jämförelse. Kuvösens radar är alltså tif-produkten med SMHI:s
kodning, och den ligger högre än driftens. Frågan står i bedömningen §4.2.

**Vad steg 5 behöver av det här:** snapshoten läser `radar_precip` genom klockans vy — klar. `moln.ts` och grind NT hämtar vid körning
ur `latest-months`; i kuvösen måste de läsa `kuvos_ra.smhi_obs` i stället, och det är körflödets sak.

