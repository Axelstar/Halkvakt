# Väderkällan för fysikspåret — ECMWF mot MET Nordic, nivå 1 (9/10 2026, DECISIONS #504)

**Frågan (Axel 9/10):** vilken väderkälla ska fysikspåret bygga på, om ECMWF via Open-Meteo inte kan användas i driften? Innan en
källa väljs: vilken ligger närmast verkligheten? Det här är **nivå 1**: källorna mot SMHI:s egna mätningar. **Nivå 2** — Axels
fysikmodell körd på MET Nordic i kuvösen — återstår och görs i hans fysiksession.

## Upplägg

- **Punkter:** de 70 VViS-stationer som har en SMHI-station inom 5 km, 18 norr och 52 söder om 62°.
- **Källorna i VViS-punkten:** MET Nordic Analysis i rutan närmast (release `kuvos-metnordic-2024-25`, #480), ECMWF IFS ur
  Open-Meteos arkiv i samma punkt (hämtad 9/10, `data/vaderkallan/`).
- **Facit:** SMHI-stationens mätning samma timme (release `kuvos-smhi-2024-25`): lufttemperatur (p1), total molnmängd (p16, koden
  113 = skymd utesluten), nederbörd 1 h (p7). Kvalitet G och Y.
- **Samma underlag:** bara timmar där alla tre finns. Vintern 2024/25, 31/10–31/3, UTC.
- **Skript:** `scripts/matningar/vaderkallan-par-2026-10-09.py` (paren), `…-hamta-ecmwf-…` (hämtningen),
  `…-jamforelse-…` (talen). Körs om ur repot och de två releaserna; talen nedan är utskriften.

## Utfall

**Lufttemperatur — grova fel (> 2 °C), andel av timmarna**

| | ECMWF | MET Nordic |
| :-- | --: | --: |
| alla timmar (184 611) | 16,0 % | **8,7 %** |
| frost, SMHI ≤ 0 °C (82 476) | 25,8 % | **15,2 %** |
| nära noll, −3…+2 °C (63 081) | 11,6 % | **4,5 %** |
| norr om 62°, alla timmar | 28,4 % | **20,4 %** |
| norr, nära noll | 16,6 % | **8,3 %** |
| söder om 62°, alla timmar | 11,1 % | **4,1 %** |
| söder, nära noll | 9,9 % | **3,1 %** |
| sträng kyla, SMHI ≤ −15 °C (4 366) | 67,0 % | 64,6 % |

Medelfelet: ECMWF 1,21 °C, MET Nordic 0,82 °C. Båda ligger för varmt vid frost (+0,3 till +0,6 °C) och mycket för varmt i sträng
kyla (+3,5 respektive +2,9 °C) — inversionerna i dalarna, där ingen av källorna räcker.

**Molnighet** (61 884 timmar). Medelfel 26,2 mot 23,8 procentenheter. Klar himmel (SMHI ≤ 25 %) hittad: ECMWF 44,1 %, MET Nordic
48,4 %; *falskt klar* (källan säger klart när SMHI har > 50 %): 15,1 mot 11,5 %. **Norr om 62°** hittar ECMWF bara 24,2 % av de klara
timmarna, MET Nordic 37,7 % — de klara nätterna är det fysiken behöver för utstrålningen.

**Nederbörd per timme** (114 046). Hittad: ECMWF 77,6 %, MET Nordic 71,7 %. Falsklarm: 45,4 mot 31,3 %. Summorna 132 respektive 130 %
av SMHI:s — mätarna fångar inte all snö, så det är väntat och skiljer inte källorna åt.

## Läsning

**MET Nordic ligger närmare verkligheten i allt som spelar roll för halka:** hälften så många grova temperaturfel, en tredjedel så
många nära noll, och färre falskt klara timmar. ECMWF hittar lite fler nederbördstimmar men larmar falskt i nästan varannan.
Skillnaden finns i båda regionerna och är störst kring noll, där halkan uppstår.

**Förbehåll.**
1. **MET Nordic läser in SMHI:s stationer i sin analys**, så facit är inte helt oberoende för den. Kontroll: försprånget krymper inte
   med avståndet mellan VViS-punkten och SMHI-stationen (grova fel 0–2 km: 18,2 mot 13,4 %; 2–3,5 km: 14,2 mot 6,7 %; 3,5–5 km: 17,1
   mot 8,9 %). Inläsningen syns alltså inte som ett försprång nära stationen, men den går inte att utesluta helt. Ett oberoende facit
   är VViS-stationernas egen lufttemperatur och daggpunkt, som bara kuvösen når (leveransen i hinken) — en körning med knappen.
2. **Luft, inte väg.** Måttet är luftens temperatur, molnen och nederbörden, alltså fysikens indata — inte vägytan.
3. **Analys, inte prognos.** Båda är analyser av vad som hände. Driften behöver också +1…+6 h, som inte är mätt för någon källa
   (#490 läsning 2).
4. **70 punkter, en vinter.** 18 i norr. Daggpunkt och vind har inget SMHI-facit i releasen och är inte jämförda.

**Vad det betyder för fysikspåret.** Nivå 1 talar för MET Nordic, också för kalibreringen och inte bara driften. Avgörandet är
nivå 2: Axels modell omkalibrerad på MET Nordic, körd i kuvösen mot samma facit som FYSIK (9,85 %). Dagens tal är ECMWF:s och följer
inte med.

## Data

`data/vaderkallan/`: `ecmwf_2024-25.csv.gz` (255 360 rader = 70 punkter × 3 648 timmar; t2m, rh, vind 10 m, moln, nederbörd,
kortvåg), `stationspar_vviss_smhi.csv`, `manifest.json` med sha256. Källa: Open-Meteo.com / ECMWF, CC BY 4.0. Releaser kunde inte
skapas från sessionen 9/10, därför ligger datan i repot.
