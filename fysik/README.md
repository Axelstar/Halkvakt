# Fysikspåret — koden (fryst 7/10 2026, i repot 9/10 på Bengts beslut, DECISIONS #508)

Axels fysikmodell för vägytans temperatur: ECMWF IFS (Open-Meteos arkiv) → 1-D värmekolumn med energibalans vid ytan → inlärd
rättelse (gradientboostning) där varje station förutsägs med hela sin region utesluten ur träningen. Det är kedjan bakom kandidaten
FYSIK i kuvösen (DECISIONS #485, 9,85 % grova fel mot RÅ:s 7,51 %) och underlaget för nivå 2 av väderkällan — samma kedja omkalibrerad
på MET Nordic (kort #319). Vad modellen är, vad som är blint och hur talen räknades står i `docs/FYSIKSPARET-SVAR-2026-10-07.md`;
frysningen i `docs/FYSIKSPARET-FRYS-2026-10-07.md`.

**Koden är fryst.** De fem filerna som bär modellen har samma sha256 som FYSIKSPARET-SVAR §1 — `physics.py 32972b71…`,
`params_v2.json 65a431c4…`, `common.py a76d799c…`, `layers.py 14619655…`, `v4.py 2bf71bf5…` — och `expA.py 81a8085c…`,
`kuvos_replica.py c640619d…`. `SHA256SUMS` bär alla; `cd fysik && sha256sum -c SHA256SUMS` körs i ci. En ändring i de frysta filerna är en
ny modell och får ett nytt frysdokument och ett nytt beslut; nivå 2 görs som nya filer (eller en gren), inte som ändringar i dessa.

**Ingen data följer med** (CLAUDE.md *PUBLIKT REPO*, DECISIONS #506): inga VViS-filer, ingen ECMWF-cache, inga `.npy`, inga `oof`-filer,
inga parquet. `.gitignore` här spärrar dem. Trafikverkets leverans ligger i hinken `arkiv`; det som räknats ur den rad för rad
(`oof_A2.npy`, `B_sp.npy`, `vvis_*.parquet`, `fysik-2024-25.csv.gz`) är releaser eller hinken, aldrig repot.

## Filerna, i körordning

Kedjan är de tolv Bengt bad om plus sex som den inte går att köra utan (markerade *krävs av*). Indata hämtas eller byggs av skripten;
det enda som måste finnas före start är Trafikverkets leverans (hinken) och `static.json` (stationernas lägen, CDN).

| # | Fil | Gör | Läser | Skriver | Tid (uppmätt 6–7/10) |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `prep.py` | VViS-CSV:erna → timvis (`:00` UTC) med vakterna #75/#234 som NULL, lägen ur `static.json` | `Halkvakt_*.csv` (hinken), `data/static.json` | `data/vvis_hourly.parquet`, `data/vvis_30min.parquet`, `data/stations.csv` | ~2 min |
| 1b | `prep_raw.py` *(krävs av 11)* | samma uttag utan nullning, så karantänen kan räkna brotten | som 1 | `data/vvis_30min_raw.parquet` | ~2 min |
| 2 | `fetch_ifs.py` | ECMWF IFS timvis per stationsläge, 2024-10-10..2025-03-31: 2 m-temp, daggpunkt, vind 10 m, moln, kortvåg, nederbörd, snöfall | `data/stations.csv`, Open-Meteo | `data/ifs/<sid>.csv` | 20 min 6/10 (10 stationer per anrop; väntar 65 s på 429) |
| 2b | `fetch_ifs2.py` | samma, fälten snödjup, marktemperatur 0–7 cm, låga moln (se nedan) | — | `data/ifs2/<sid>.csv` | 55 min 6–7/10 |
| 3 | `fetch_elev.py` *(krävs av 7)* | höjd och TPI 1/3 km ur Open-Meteos höjd-API (Copernicus DEM) | `data/stations.csv` | `data/elev.csv` | 45 min 6/10 (timeouts och omförsök) |
| 4 | `geofeat.py`, `geofeat2.py` *(krävs av 7)* | terräng 150 m–20 km, daldjup, himmelsfaktor, sydhorisont, skog, bebyggelse, vatten, krontak, broar — ur Copernicus DEM GLO-30, ESA WorldCover, Metas krontakshöjd (COG-läsning över nätet) och `data/bridges.geojson` i repot | `data/stations.csv`, rastrar över nätet | `data/geofeat.csv`, `data/geofeat2.csv` | tiotals minuter vardera 7/10, beroende på nätet |
| 5 | `roadjoin.py <gpkg> <ut>` *(krävs av 7)* | vägdata per station ur Lastkajens GeoPackage (ÅDT, tunga, Vägunderhållsklass, Funktionell vägklass, Driftområde, Europaväg); körs en gång per län-beställning, slås ihop till `data/road_all.csv` | Lastkajen-GeoPackages (laddas ner för hand, inte i repot) | `data/road_{norr,mitt,syd}.csv`, `data/road_all.csv` | minuter |
| 6 | `physics.py` | värmekolumnen: `run(F, p)` → yttemperatur per timme och station; `DEFAULT`-parametrar | — (modul) | — | 12 s för 754 stationer × 4 150 timmar |
| 6b | `calib2.py <maxfev>` | Nelder–Mead på de 12 parametrarna, mål A1 + 5·A2, på stationerna i veck 0/2/4; läses på 1/3 | 1, 2, 3 | `params_v2.json` (den frysta skrevs 6/10 23:47) | 17 min 6/10 |
| 7 | `common.py`, `layers.py`, `v4.py` | laddning (`load()`), måtten (`gates()`), grannviktning, särdragen (70 st), vecken (KMeans 25 % 5), ur-vecks-anpassning (`fit_oof`), rapport | 1–5 | `overnight.log` | — (moduler) |
| 8 | `expA.py` | den inlärda rättelsen i två konfigurationer; A2 är den frysta | 7 | `oof_A1.npy`, `oof_A2.npy`, `names_v4.json` | A1 11 min, **A2 32 min** (5 veck) |
| 9 | `kuvos_replica.py` | kuvösens regler kopierade ur `publish/grind-a.ts`: RÅ, FYSIK, FYSIK+GRANNAR, FYSIK+BLANDNING | 1b, 8 | `results_replica.json`, `replica2.log` | 2,5 min |
| 10 | `roadtest.py` | fingeravtryck per station mot vägdata, R² med regionerna gömda (de 23 %) | 1, 5, `B_sp.npy` (ur `final.py`, inte med här) | — | 1 min |
| 11 | `fingeravtryck.py` | fingeravtrycksfilen (id, °C, timmar, modell, population) och R² för båda modellerna | 1, 5, 8 | `fingeravtryck-2024-25.csv` | 1 min |
| 12 | `utdata_fysik.py` *(krävs för releasen)* | FYSIK som fil till kuvösen: halvtimmar, medlet av omgivande timmar på halvtimmen | 8 | `fysik-2024-25.csv.gz` | 1 min |

`roadtest.py` läser `B_sp.npy` ur `final.py` (den äldre modellen utan vägdata), som inte är med: de 23 % är redan återräknade i
`fingeravtryck.py` mot båda modellerna (SVAR §5), så `roadtest.py` ligger här som det skript talet kom ur, inte som ett steg att köra.

**Sökvägarna.** De frysta filerna är byte för byte som de kördes, och de bär absoluta sökvägar: `common.py` har `D = '/home/claude/fys/data'`,
`v4.py` skriver `/home/claude/fys/overnight.log` och läser `/home/claude/fys/params_v2.json`, `geofeat.py` läser
`/home/claude/halkvakt/data/bridges.geojson`. Kör därför kedjan med en länk: `ln -s <repo>/fysik /home/claude/fys` och arbetskatalogen
`/home/claude/fys` (där `data/` skapas, utanför git). Att byta sökvägarna hade ändrat hasharna.

**Minne** (uppmätt 9/10 i sessionen): laddning + fysik 1,5 GB, särdragen 2,6 GB, första veckets designmatris (1,4 M rader × 70,
float32) ryms i samma 2,6 GB; anpassningen lägger uppskattningsvis under 1 GB till. Den första versionen, som byggde hela
särdragskuben, dog på 5,2 GB och skrevs om med `gather()` (v4.py). 4 GB räcker; 8 GB är bekvämt. `kuvos_replica.py` håller 5,5 M
halvtimmesrader i pandas: ~3 GB.

## Hur den kördes (ordningen)

```
python3 -m pip install -r fysik/requirements.txt
ln -s "$PWD/fysik" /home/claude/fys && cd /home/claude/fys && mkdir -p data
# Trafikverkets fem filer till /mnt/user-data/uploads/ (prep.py:4) och static.json till data/
python3 prep.py && python3 prep_raw.py
python3 fetch_ifs.py && python3 fetch_ifs2.py && python3 fetch_elev.py
python3 geofeat.py && python3 geofeat2.py
python3 roadjoin.py data/lastkajen/norr/<fil>.gpkg data/road_norr.csv   # ett per beställning; sedan ihop till data/road_all.csv
python3 calib2.py <maxfev>     # skriver params_v2.json — den frysta ligger redan här; kör INTE om den ska bevaras
python3 expA.py                # oof_A2.npy, 45 min
python3 kuvos_replica.py && python3 fingeravtryck.py && python3 utdata_fysik.py
```

Hela kedjan från tomt: ~3–4 h klocktid, det mesta väntan på Open-Meteo och rastrarna. Med ECMWF-cachen och särdragsfilerna på plats: ~50 min.

## De tre fälten ECMWF har och MET Nordic saknar — ersättas eller tas bort

MET Nordic bär sju fält (`kuvos-c8-metnordic`: luft, fukt, vind, moln, nederbörd, långvåg, kortvåg). ECMWF via Open-Meteo gav
kedjan dessutom **snödjup**, **låga moln** och **marktemperatur 0–7 cm** (`fetch_ifs2.py`). Var de används:

- **Fysiken (`physics.py`) läser inget av dem.** `run()` tar `ta, td, wind, cloud, sw, swe, ta72, tdeep, elev_diff` — där `swe` är
  kolumnens eget snötäcke ur graddagar (`common.py`), `tdeep` 45-dygnsmedlet av luften och `ta72` 72-timmarsmedlet.
- **Bara den inlärda rättelsen (`v4.py`) använder dem**, som särdragen `snowd`, `snowd_x_cold`, `sw_x_snowd`, `soil0`, `cloudlow`,
  `cloudlow6` — 6 av 70.
- **Uppmätt värde** (`ablate.py` 7/10, A1-konfigurationen, timvis): utan väg, terräng och de tre fälten 12,9 % grova fel; med bara de
  tre fälten 12,2 %; med allt 10,9 %. Ensamma är de alltså värda 0,7 procentenheter. Deras bidrag *ovanpå* väg och terräng mättes inte
  separat.

Rekommendation för nivå 2, ett fält i taget:

| Fält | Ersättning i MET Nordic | Om det tas bort |
| :-- | :-- | :-- |
| snödjup | `swe` finns redan som särdrag; snöfallet som bygger det måste härledas (MET Nordic har ingen snöfallskolumn): nederbörd vid luft ≤ +1 °C räknas som snö, som Open-Meteo själv gör ur ECMWF:s nederbördstyp | `snowd`, `snowd_x_cold`, `sw_x_snowd` stryks; `swe` tar rollen |
| låga moln | **MET Nordic har uppmätt långvåg**, som är det låga moln är en proxy för: effektiv himmelsemissivitet `LW / (σ·T_luft⁴)` som särdrag, och i fysiken kan `Lsky` tas direkt ur långvågen i stället för Brutsaert-skattningen (`physics.py:94–95`) — det är den största vinsten med bytet | `cloudlow`, `cloudlow6` stryks; `cloud` finns kvar |
| marktemperatur 0–7 cm | kolumnens egen temperatur i 5 cm-lagret: `run()` räknar alla elva lagren (`T`, `physics.py:76`) men lämnar bara ytan (`out[h] = T[:, 0]`); nivå 2:s kopia får lämna ut lagret — eller `tdeep`/`ta72`, som redan finns | `soil0` stryks |

Två fält till måste härledas ur MET Nordic oavsett: **daggpunkten** ur relativ fukt och luft (Magnus), och **snöfallet** som ovan.
Allt detta är en omkalibrering — `calib2.py` på MET Nordic ger nya parametrar och `expA.py` en ny rättelse — och den förregistreras
som en egen kandidat i DECISIONS före knappen (kort #319). De frysta filerna rörs inte.

## Licenser och källor

ECMWF IFS via Open-Meteo (CC BY 4.0; Open-Meteos arkiv-API är fritt för icke-kommersiellt bruk — en driftsatt version körs på SMHI/MET,
#485), Copernicus DEM GLO-30 (fri), ESA WorldCover (CC BY 4.0), Meta/WRI krontakshöjd (CC BY 4.0), NVDB via Lastkajen (CC0),
Trafikverkets VViS-leverans (inte vår att publicera — hinken). Koden: Halkvakts, publik sedan 9/10 (DECISIONS #503, #508).
