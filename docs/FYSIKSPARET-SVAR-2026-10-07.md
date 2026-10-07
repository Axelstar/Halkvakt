# Fysikspåret — svar på de sex frågorna inför förregistreringen (7/10 2026)

*Skrivet i den session där modellen byggdes (Axels fysik-session, molnarbetsytan `/home/claude/fys`). Koden har aldrig legat i
repot och aldrig på Axels Mac — den finns i Axels arkiv `fysiksparet-2026-10-07.tar.gz` (kod, frysdokument, loggar, SHA256SUMS; utan de stora binärerna).
I repot ligger bara utdata: `data/fysik/fingeravtryck-2024-25.csv` och releasen `kuvos-fysik-2024-25` (DECISIONS #485).
Allt nedan är så som det gjordes, inte så som det borde ha gjorts; avvikelserna från en ren förregistrering står under punkt 4.*

## 1. Var koden finns och vad den består av

Python, i `/home/claude/fys` (molnsession, inte repot). Kedjan som gav talen:

| Fil | Vad | sha256 |
| :-- | :-- | :-- |
| `prep.py` | VViS-CSV:erna → timvis (`:00`, UTC) med vakterna #75/#234 som NULL | — |
| `fetch_ifs.py`, `fetch_ifs2.py` | ECMWF IFS ur Open-Meteos arkiv per station, 2024-10-10..2025-03-31 | — |
| `physics.py` | 1-D värmekolumn, 11 lager, energibalans vid ytan, 12 parametrar | `32972b71…cad2e` |
| `calib2.py` → `params_v2.json` | parametrarna kalibrerade (Nelder–Mead) på ena rumsliga halvan | `65a431c4…515bc` |
| `common.py`, `layers.py`, `v4.py` | laddning, grannviktning, särdrag, veck, ur-vecks-anpassning | `a76d799c…`, `14619655…`, `2bf71bf5…` |
| `expA.py` → `oof_A2.npy` | den inlärda rättelsen, varje station förutsagd med hela sin region utesluten | `9268c6c7…2a2f3f` |
| `kuvos_replica.py` | kuvösens regler kopierade ur `publish/grind-a.ts` m.fl., körd blint av en separat agent | `c640619d…ce262` |
| `FRYS-2026-10-07.md` | frysningen före körningen, förväntningarna, rättelse 1, utfallet | — |
| `roadtest.py`, `fingeravtryck.py` | vägdata-R² (23 %) och fingeravtrycksfilen | — |

Modellen är **inte** körbar i repot som den är (Python + sklearn, 5,5 miljoner rader i minnet). Kandidaten till kuvösen är
dess *utdata* (en skattning per station och halvtimme), inte koden — samma väg som den andra sessionen föreslog.

## 2. Indata

- **Väder:** ECMWF IFS via Open-Meteos arkiv (icke-kommersiell licens — en driftsatt version ska gå på SMHI/MET), timvis per
  stationsläge: 2 m-temperatur, daggpunkt, vind 10 m, molnmängd (total och låg), kortvåg, nederbörd, snöfall, snödjup,
  marktemperatur 0–7 cm, modellens höjd. Inga prognoser — arkivets analys/kortprognos, så talen gäller *analysläge*, inte +6 h.
- **Statiskt per station:** läge ur `static.json` (6/10); höjd och terrängindex ur Copernicus DEM GLO-30 (TPI 150 m–20 km, daldjup,
  himmelsfaktor, sydhorisont); skog/bebyggelse/vatten ur ESA WorldCover och Metas krontakshöjd; **vägdata ur NVDB/Lastkajen**
  (ÅDT samtliga och tunga, Vägunderhållsklass, Funktionell vägklass, Europaväg). Timme på dygnet.
- **VViS (Trafikverkets stationer, vintern 2024/25):** yttemperatur och lufttemperatur används som *facit* vid träning och mätning —
  **aldrig som indata vid målstationen** (se punkt 4). Grannarnas uppmätta fel används bara i kandidaterna FYSIK+GRANNAR och
  FYSIK+BLANDNING, aldrig i FYSIK.
- **Inte med i den frysta modellen:** kameror, satellit (MODIS yttemperatur och snötäcke provades: ≈ 0,1 procentenhet, DECISIONS-värdigt
  bara som "prövat och lagt ned"), radar, RoadCondition, åtgärdsdata.

## 3. Modelltyp

Fyra lager, varav de två första är kandidaten "FYSIK":

1. **Fysik.** Implicit 1-D värmeledning i 11 lager (1 cm … 70 cm, geometriskt), energibalans vid ytan: kortvåg × (1 − albedo),
   långvåg med Brutsaert-emissivitet och molnblandning, bulköverföring för sensibelt och latent värme, frostavsättning,
   trafikvärme, djup randtemperatur = 45-dygnsmedel luft + offset, höjdkorrektion mot IFS-höjden, snötäcke på marken runt vägen ur
   graddagar. 12 skalära parametrar (`params_v2.json`).
2. **Inlärd rättelse.** `HistGradientBoostingRegressor` (sklearn) tränad på *uppmätt yta − fysik* med 55+ särdrag: väder och
   historik (6–168 h), fysikens egna min/max/"timmar sedan tö/frost/nederbörd/snö", snödjup, marktemperatur, låga moln, terräng,
   skog, vägdata (ÅDT, tunga, underhållsklass, funktionell klass, E-väg) och deras samspel med kyla/klar natt. Konfiguration A2:
   1,4 miljoner rader per veck, 900 iterationer, lr 0,05, 95 löv, min 200 per löv. Inga stations-id, inga fasta effekter per station.
3. **Grannarnas fel** (FYSIK+GRANNAR): grannstationernas uppmätta fel mot FYSIK, upp till 8 inom 300 km, vikt e^(−d/100 km),
   krympning 0,5, målet uteslutet.
4. **Blandning med RÅ** (FYSIK+BLANDNING): w = 0,5·e^(−d_ankare/80 km) på RÅ, resten på FYSIK+GRANNAR; vikterna valda på dev-vecken.

"ECMWF-driven physics model" i den andra sessionens ord = lager 1 + 2 = kandidaten FYSIK.

## 4. Var målstationen dold när rättelsen lärdes? — JA, med tre avvikelser som ska stå i förregistreringen

**Ja, i allt som bär fingeravtryck:**

- Stationerna delades i 25 kluster på läge (KMeans på lon·0,55, lat — bara koordinater, inga mätvärden) och 5 veck (kluster % 5).
  Rättelsen för veck *k* tränades enbart på stationerna i de fyra andra vecken; målstationen *och alla dess grannar i samma
  kluster* var borta ur träningen (`v4.py: fit_oof`). Varje tal för FYSIK är alltså "ur vecket": modellen har aldrig sett en
  rad från den station den döms på, och inte heller från regionen runt den.
- Inget särdrag räknas ur målstationens egna mätningar. "Timmar sedan tö/frost" räknas ur *fysikens* yttemperatur, inte ur VViS.
  Inget stations-id, ingen stationsvis konstant.
- Grannlagret utesluter målet; RÅ i blandningen är kuvösens egen `utanOffset`-RÅ (målets historia används inte).
- Kuvöskörningen (`kuvos_replica.py`) gjordes av en separat agent utan minne av samtalet, med hashar före och efter, och RÅ som
  kontroll först (7,50 % mot kuvösens 7,4 %).

**Tre avvikelser från en ren förregistrering — dessa gör 2024/25 till riktningsprov, inte dom:**

1. **Fysikens 12 parametrar** kalibrerades på stationerna i veck 0, 2, 4 (≈ hälften) och lästes på veck 1, 3. För stationer i
   veck 0/2/4 ingick alltså deras mätningar när tolv skalärer sattes för ~450 stationer. Läckaget per station är försumbart
   (tolv tal gemensamma för alla), men det är inte noll, och det står här.
2. **Hyperparametrarna** (antal iterationer, löv, rader) och de 55 särdragen valdes genom att läsa dev-vecken 0–2; bekräftelsevecken
   3–4 lästes "en gång" per experiment, och det blev en handfull experiment (A0/A1/A2, B, S, blandningen). Talet 10,22 % är
   dev 9,53 % + CONF 11,41 % sammanvägt. CONF-talet är det ärligare: **11,4 %**.
3. **Förväntningarna** i `FRYS-2026-10-07.md` skrevs före kuvöskörningen men *efter* att liknande tal setts under utvecklingen. Det är
   en frysning av beräkningen, inte en förregistrering av hypotesen.

Följden för förregistreringen: det som förregistreras är *pipelinen* (kod, parametrar, särdrag, vikter — allt fryst 7/10 med hash),
och domen läses på vintern 2026/27 där ingen rad har setts. Ett gott tal på 2024/25 frikänner inget (DECISIONS #481, #424).

## 5. Hur 10,2 % och 23 % räknades

**10,2 % grova fel** (`overnight.log`, rad "A2 + state, 2x data, 900 it, 95 leaves"):

- Punkter: VViS-timmar (`:00` UTC) 2024-11 … 2025-03, 754 stationer, uppmätt yta ≤ +5 °C, fysikens värde finns, efter `prep.py`:s
  vakter (#75: luft − yta > 12 → bort; radvakt: luft ≥ 10 och luft − yta ≥ 8 → bort; |yta| ≤ 45). Ingen karantän, ingen långsam vakt
  i den timvisa mätningen.
- Mått: andel punkter med |skattning − uppmätt| > 2,0 °C. Skattningen = `oof_A2.npy` (fysik + inlärd rättelse, ur vecket).
- Utfall: dev 9,53 % · CONF 11,41 % · **alla 10,22 %** · norr om 62° 17,71 % · söder 7,04 %.
- **Samma modell under kuvösens exakta regler** (`kuvos_replica.py`: halvtimmeshinkar, senaste avläsning per hink, alla fyra
  vakterna inkl. karantän och långsam vakt, 736 stationer, timvärdet medlat till halvtimmen): **9,81 %** på hinkar med RÅ-ankare
  (band 8,0 · 7,9 · 8,7 · 15,5 %), **10,01 %** på alla hinkar ≤ +5 °C utan krav på ankare. A1 0,79 °C, A3 0,39 %, farliga fel K2 = 1,0:
  1,4 %. Dom A1 KLARAR · A2 FALLER · A3 KLARAR. Populationen bekräftad av att RÅ-kontrollen gav 7,50 % mot kuvösens 7,4 %.

**23 % förklarad särart** (`roadtest.py`, återkörd 7/10 i `fingeravtryck.log`):

- Fingeravtryck per station = medel(uppmätt − modell) över nov–dec 2024, population yta ≤ +5 °C, minst 20 timmar.
- **Modellen var `B_sp.npy`** — den *tidigare* fysik + inlärd rättelse (`final.py`, 23 särdrag, **utan** vägdata och terräng, 13,1 %
  grova fel timvis), inte `oof_A2`. Det är viktigt: 23 % mäter hur mycket av den särart en modell *utan* vägdata lämnar kvar som
  vägdata kan förklara.
- Test: 165 stationer i mellanregionen (de med vägdata vid tidpunkten, `road_mitt.csv`), ridge-regression på log ÅDT, tungandel,
  Vägunderhållsklass, Funktionell vägklass och Driftområde (one-hot), 15 lägeskluster % 5 veck, R² räknat på *ur-vecks*-skattningen
  (hela regionen dold). **R² = 0,227, korrelation 0,48.** Fingeravtryckets spridning 0,65 °C. Jan–mar grova fel i regionen: modell
  9,5 % → 8,8 % med vägförutsagt fingeravtryck → 7,3 % med uppmätt nov–dec-fingeravtryck.
- **Samma test mot den frysta modellen `oof_A2`** (som har vägdata som indata): R² = −0,11, korrelation −0,09, spridning 0,50 °C,
  jan–mar 6,2 % → 6,4 % → 5,7 %. Det är det väntade: vägdatat är redan förbrukat *inne i* modellen, och det som återstår i
  stationens särart går inte att förutsäga ur vägdata. Det kvarvarande (0,50 °C spridning, 5,7 mot 6,2 % med uppmätt fingeravtryck)
  är det som bara vägens egen historia kan ge — därav Trafikverksbegäran.
- ÅDT-binmedlen (−0,58 °C under 1 000 fordon, +1,14 °C över 20 000) i rapporten var *helvinterns* fingeravtryck mot `B_sp`.

## 6. Fingeravtrycksfilen (Bengts begäran i bedömningen §4.2)

Finns nu: **`data/fysik/fingeravtryck-2024-25.csv`**, sha256 `696002a8821e7a2cf280db9530d2b59dba58747df8428a318a9f2f2e2c9453dc`, 3 016 rader
= 754 stationer × 2 modeller × 2 perioder.

| Kolumn | Innehåll |
| :-- | :-- |
| `sid` | VViS-stationens id (som i `static.json`) |
| `lon`, `lat` | läge (WGS84) |
| `modell` | `A2` = fysik + inlärd rättelse, region dold, den frysta modellen (`oof_A2.npy`, sha `9268c6c7…`) · `Bsp` = den tidigare utan vägdata (`B_sp.npy`, sha `38df9198…`), modellen bakom 23 % |
| `period` | `vinter` = nov 2024–mar 2025 · `novdec` = nov–dec (inlärningsfönstret i roadtest) |
| `population` | yta ≤ +5 °C, timvis, vakter #75/#234 enligt `prep.py` |
| `n_timmar` | antal timmar i populationen |
| `fingeravtryck_c` | medel(uppmätt − modell) i °C; **positivt = vägen är varmare än modellen säger**; tomt om n < 20 |
| `sd_c` | standardavvikelse för felet hos stationen, °C |

Läsning: A2 vinter — 736 stationer med fingeravtryck, medel −0,05 °C, spridning 0,52 °C, 10–90 % −0,69…+0,55; Bsp vinter — spridning
0,64 °C, 10–90 % −0,84…+0,77. Medianstation 2 988 timmar (vinter) / 1 173 (nov–dec).

## Vad förregistreringen bör innehålla (förslag, Bengts ord avgör)

- Kandidat **FYSIK** (lager 1 + 2) till vägpunktsgrinden 2026/27, bredvid RÅ, OFFSET och de andra, med pipelinen fryst 7/10
  (hasharna ovan) och utdata levererad som en fil per snapshot, ingen kod i repot.
- Kandidat **FYSIK+BLANDNING** som andra kandidat, eftersom det är den som faktiskt slår RÅ bortom 20 km (10,9 mot 13,6 %).
- Förväntan som skrivs in *innan* vintern: A2 totalt 10–12 % för FYSIK, 6–7 % för FYSIK+BLANDNING; bortom 20 km 15–17 % resp.
  11–13 %; A1 KLARAR, A3 KLARAR, A2 FALLER mot 5 %. Allt läses i mars 2027, hela vintern, inga handplockade dygn.
- Driftvillkor som måste lösas före vintern: vädret ur SMHI/MET i stället för Open-Meteo (licens), analys i stället för prognos är
  det som mätts — prognoshorisonten +1…+6 h är *inte* mätt och ska förregistreras som egen fråga.
