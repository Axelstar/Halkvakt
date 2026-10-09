# Nivå 2 — fysikkedjan på MET Nordic (kort #319, DECISIONS #509)

Nya filer; de frysta i `fysik/` rörs inte (`SHA256SUMS` i ci).

| Fil | Gör |
| :-- | :-- |
| `metnordic.py` | Bygger kedjans väder (`F`) ur releasen `kuvos-metnordic-2024-25` med samma stationer, ordning och timindex som `common.load()`: daggpunkt med Magnus, snöfall ur nederbörd vid luft ≤ +1 °C (7 cm/mm, Open-Meteos enhet), strålning i W/m², ECMWF som uppvärmning 10/10–30/10, `elev_diff` 0. |
| `fysik_lw.py` | `physics.run` kopierad med två ändringar: uppmätt långvåg i stället för Brutsaert där den finns, och 5,5 cm-lagret lämnas ut. Självtestet visar att kopian utan långvåg ger samma yta som originalet. |
| `kedja.py` | `kontroll`: den frysta kedjan omkörd (`v4.py`, expA:s A2-konfiguration), oof_A2:s sha256 mot den frysta. `niva2`: kalibrering med `calib2.py`:s protokoll (tio parametrar; `cloud_p` och `lapse` är overksamma), särdragen som `v4.py` med tre ersatta (`snowd` → snötäcket `swe`, `soil0` → 5,5 cm-lagret, `cloudlow` → effektiv himmelsemissivitet ur långvågen), rättelsen med samma veck och konfiguration. Båda skriver filer i FYSIK:s format. |
| `sjalvtest.py` | Syntetiska data, körs i ci. |

Körs av `kuvos.yml` när mätningen heter `kuvos-fysik-niva2-…`: Trafikverkets filer packas upp där `prep.py` läser dem, indata-releasen
(höjd, terräng, vägdata, ECMWF-cachen — öppna källor per station, `kuvos/fysik-indata-leverans.json`) fyller `data/`, kedjan körs via
länken `/home/claude/fys`, och `scripts/matningar/kuvos-fysik-niva2-metnordic-2026-10-09.ts` läser filerna mot RÅ:s punkter.
