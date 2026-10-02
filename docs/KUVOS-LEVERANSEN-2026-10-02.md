# Kuvösen: Trafikverkets leverans 2/10 2026 — inventering, besiktning och tidszon

*Kort #232, PLAN-KUVOSEN steg 2–3, DECISIONS #424 och #438. Läs-only: ingenting är inläst i någon databas, ingen regel är körd och
inget utfall är läst. Skriptet för varje tal står vid tabellen.*

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
| `ned_typ` | nederbördstyp, **kod** | −9: 1,0 % | koderna 1, 2, 3, 4, 6, 9 | `precipitation`, `rain`, `snow` — **väntar** |
| `ned_maengd` | nederbördsmängd, **enhet okänd** | −99,9: 0,4 % · **−99,8: 0,65 %** | 0 … 15,5; fem rader över 100 (max 1 049,3) | `rain_sum_mm`? — **väntar** |
| `vimax` | vind, troligen byvind | −99,9: 0,5 % | 0,5 … 21,4; 208 rader över 60 m/s | `wind_gust_ms`? — **väntar** |
| `vimed` | vind, troligen medelvind | −99,9: 0,3 % | 0,1 … 13,1 | `wind_speed_ms`? — **väntar** |
| `vind30` | vind, okänt vilket mått | −99,9: 0,3 % | 0,2 … 13,0 | — |
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
kodlista (§5). Motorns *fukt* bygger på nederbörden, så frysrisken kan inte spelas upp förrän koderna är kända.

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
| **Nederbördstypen, mängden och vindfälten** | **Väntar på Trafikverkets kodlista** — frågorna nedan |
| De 23 stationerna utan läge | Väntar på Trafikverket |
| Vakterna (#75, radvakten, karantänen, den långsamma vakten) | Körs när datan är inläst, i kuvösens databas; redovisas som antal |
| Värdevakten | Körs på kuvösens databas före riktningsprovet; ett fält utan spann stoppar |

**Frågorna till Trafikverket** (Bengt skickar till Micke Wallin, som svar i samma tråd):

1. `ned_typ`: vad betyder koderna 1, 2, 3, 4, 6 och 9, och −9?
2. `ned_maengd`: vilken enhet och vilket tidsfönster (mm per 30 minuter, mm/h)? Och vad betyder −99,8, som skiljer sig från −99,9?
3. Vindfälten: vilket av `vimax`, `vimed` och `vind30` är byvind och vilket medelvind, och över vilket tidsfönster?
4. `siktdjup`: betyder 20 000 sikt över mätområdet, och −100 att sikt inte mäts?
5. Läget (koordinater) för 23 stationer som inte finns i dagens öppna API: 298, 321, 324, 428, 650, 901, 902, 908, 1227–1231, 1329,
   1434, 1435, 1518, 1525, 1547, 1613, 1801, 1815 och 7201.
6. För ordningens skull: vi har mätt att `measuretime` är svensk lokaltid. Stämmer det?

## 6. Vad det här inte är

Ingen regel är körd och inget utfall är läst. Förregistreringen (DECISIONS #424, tilläggen #426 och #437) skrevs innan filen öppnades;
#437 checkades in 2/10 07:13 (då med numret #436, omnumrerad samma eftermiddag när kort #258 tog #434), och filen kom 16:04. **Från och med nu är filen öppnad:** ett nytt tillägg kan inte kallas *före filen*, bara
*före riktningsprovet*, och ska säga det.
