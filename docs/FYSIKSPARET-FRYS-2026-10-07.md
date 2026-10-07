*(Kopia i repot 8/10 av Axels frysdokument, oförändrad; sha256 av originalet `e1fa13c5…7348`. Hör till DECISIONS #485.)*

# Frysning före körningen — fysikspåret dömt med kuvösens regler (7/10 2026, 22:45)

*Skriven innan `kuvos_replica.py` körts en enda gång. Efter körningen ändras ingenting här och inget i skripten; alla tal skrivs ut.
Körningen och den första läsningen görs av en separat agent utan minne av det här samtalet. Numren nedan är "det jag väntar mig",
inte en förregistrering i projektets mening: jag har sett liknande tal under utvecklingen (dev-veck 0–2 för val, bekräftelseveck 3–4
lästa en gång). Den riktiga förregistreringen gäller vintern 2026/27.*

## Frysta artefakter (sha256)

| Fil | Vad | sha256 |
| :-- | :-- | :-- |
| `oof_A2.npy` | fysik + inlärd rättelse, timvis, 754 stationer, varje station förutsagd med hela sin region utesluten ur träningen (25 kluster, 5 veck) | `9268c6c7…2a2f3f` |
| `params_v2.json` | fysikens 12 parametrar, kalibrerade på ena rumsliga halvan | `65a431c4…515bc` |
| `physics.py`, `common.py`, `layers.py`, `v4.py`, `expA.py`, `names_v4.json` | koden som gav `oof_A2.npy` | se `sha256sum` i loggen |
| `data/vvis_30min_raw.parquet` | VViS-uttaget, halvtimmar, UTC, sentineler till NULL | `(se sha256sum i loggen; råfilen utan min tidigare nullning, så att karantänen kan räkna brotten)` |
| `data/stations.csv` | lägen ur `static.json` 6/10 | `36abd1c7…86a9f` |

## Reglerna som kopieras från repot (ändras inte)

- **Population:** halvtimmeshinkar (`BUCKET_S` 1800), senaste avläsning per (station, hink), yta ≤ +5 °C (`publish/grind-a.ts`).
- **Vakterna, exakt grind A:s WHERE** (`publish/grind-a.ts` rad 262–268, `publish/snapshot-core.ts`):
  - #75 givarvakten: luft finns och yta ≥ luft − 12;
  - #234 radvakten: luft saknas eller luft < 10 eller luft − yta < 8;
  - #234 karantänen: antal brott mot #75 hos stationen de 7 dygnen före raden (raden inräknad) < 3;
  - #236 långsamma vakten: raden utesluts det UTC-dygn stationen haft ≥ 24 avläsningar i ett 24-timmarsfönster med ≥ 90 % luft − yta ≥ 6
    (`sql/030`, `langsam_vakt`, räknad över hela vintern).
- **RÅ** (kontrollen): fem närmaste inom 50 km, vikt 1/max(km, 1), minst 20 delade hinkar per par utöver den dömda (`MIN_SHARED`),
  `utanOffset`; bandet = närmaste bidragande granne. Exakt `evaluate()` i `grind-a.ts` med `utanOffset: true`.
- **Måtten:** A1 = MAE i beslutsbandet (mätt ≥ −5), A2 = andel |fel| > 2 °C, A3 = frysklassfel (mätt < 0 och skattning > 2, eller mätt > 2 och
  skattning < 0); per band 0–7 · 7–15 · 15–20 · > 20 km och totalt; ±1,96 standardfel (binomialt för A2/A3, medelvärdets för A1);
  domen per mått KLARAR/FALLER/OAVGJORT som grind A (trösklar 1,0 °C · 5 % · 10 %; spärren ≥ 500 punkter, ≥ 20 stationer).
- **Frysflaggan:** `publish/frysflagga.ts` ordagrant: K1 = +1 °C, K2 = 0 · 0,5 · 1,0; farliga fel av frysningarna, rätt klass av uttalade,
  täckning; K-A:s måttstock (95 % · 1 % · 70 %) bredvid som läsning.
- **Tidsupplösning:** modellen är timvis; på halvtimmen används medlet av de två omgivande timmarna. RÅ och grannarnas fel räknas
  direkt på halvtimmeshinkarna. Avvikelsen redovisas; den gäller lika för alla fysikkandidater.

## Kandidaterna (fasta)

1. **RÅ** — kontrollen. Läses först. Landar den inte på 7,4–7,7 % grova fel (kuvösen 7/10: 7,4–7,5 % på 4,3 miljoner punkter) läses
   inte resten; då skiljer sig populationen och det ska förstås först.
2. **FYSIK** — `oof_A2.npy` ensam. Ingen station används vid målet. Bandet för FYSIK sätts av RÅ:s ankare på samma hink (så att banden
   är jämförbara), och totalen redovisas också på alla hinkar med yta ≤ +5 °C, utan krav på ankare.
3. **FYSIK+GRANNAR** — FYSIK plus grannarnas fel mot FYSIK, invers-exponentiellt viktade: upp till 8 grannar inom 300 km, vikt e^(−d/100 km),
   krympning 0,5 i nämnaren, målet uteslutet, samma vakter som RÅ på grannarnas rader.
4. **FYSIK+BLANDNING** — RÅ viktad w = 0,5·e^(−d_ank/80 km) mot FYSIK+GRANNAR (1 − w); där RÅ saknas gäller FYSIK+GRANNAR. Vikterna
   valdes på dev-vecken 6–7/10 och rörs inte.

## Vad jag väntar mig (skrivet före körningen, med vad jag sett under utvecklingen i minnet)

| Kandidat | A2 totalt | > 20 km | norr om 62° | söder | farliga fel, K2 = 1,0 |
| :-- | --: | --: | --: | --: | --: |
| RÅ (kontroll) | 7,4–7,7 % | 13–14 % | ~14,5 % | ~4,9 % | ~1,2 % |
| FYSIK | 10,0–10,6 % | 10–11 % | ~17,7 % | ~7,0 % | ≤ 1,2 % |
| FYSIK+GRANNAR | 6,8–7,3 % | 11–13 % | ~14 % | ~4,0 % | ≤ 1,0 % |
| FYSIK+BLANDNING | 6,2–6,7 % | 11–12 % | ~12,7 % | ~3,7 % | ≤ 1,0 % |

- Halvtimmesinterpolationen kan kosta FYSIK-kandidaterna 0,1–0,3 procentenheter mot mina timtal.
- Faller RÅ utanför 7,4–7,7 % är det populationen (vakterna, MIN_SHARED, halvtimmarna) som skiljer, inte modellen; då redovisas
  skillnaden och inget annat läses.
- Ingen av dessa tal frikänner något: domen för vägpunktsgrinden läses på vintern 2026/27 (DECISIONS #481, #424).

## Vad som INTE får hända efter körningen

Inga parametrar, vikter, vakter, band eller urval ändras. Faller en kandidat skrivs det. Ett "oväntat bra" tal läses med samma misstro
som ett dåligt: första frågan är populationen, andra är läckage (målets egen serie får aldrig in i någon kandidat).

## Rättelse 1 (7/10 23:05, före första läsningen)

Första körningen kraschade innan ett enda tal skrevs ut: hinkindexet räknades ur mikrosekunder som om de vore nanosekunder, så hela
vintern föll i 8 hinkar, och RÅ fick inga punkter (`KeyError: 'mae'`). Rättat till explicita sekunder sedan epoken på båda ställena
(halvtimmarna och timmarna), plus en utskrift i stället för krasch när en kandidat saknar punkter. Inga parametrar, vikter, vakter,
band eller urval ändrade. Ny sha256 för `kuvos_replica.py` skrivs av evaluatorn före körningen. Loggen från kraschen: `replica.log` (564 byte).

## UTFALL (7/10 23:20) — körd och läst av en separat agent utan minne av samtalet

Körning `replica2.log` (exit 0, ~2,5 min). Hashar före = efter. Vakterna: 5 332 557 rader med yta → 5 322 701 efter #75 → 5 322 209 efter
radvakten → 5 307 814 efter karantänen → 5 294 347 efter den långsamma vakten (343 stationsdygn i felet). 736 stationer, 5 208 812
bucketade avläsningar, 7 246 halvtimmar.

**Kontrollen höll:** RÅ 7,50 % [±0,02] på 4 332 368 punkter; band 5,2 · 5,2 · 7,1 · 13,6 % (kuvösen #481: 7,4 %; 5,2 · 5,1 · 7,1 · 13,6 %).

| Kandidat | A1 | A2 totalt | 0–7 | 7–15 | 15–20 | > 20 km | A3 | norr/söder A2 | farliga fel K2 1,0 | dom A1·A2·A3 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | :-- |
| RÅ | 0,68 | 7,50 % | 5,2 | 5,2 | 7,1 | 13,6 | 0,39 % | 14,1 / 4,8 | 1,2 % | KLARAR·FALLER·KLARAR |
| FYSIK | 0,79 | 9,81 % | 8,0 | 7,9 | 8,7 | 15,5 | 0,39 % | 17,4 / 6,9 | 1,4 % | KLARAR·FALLER·KLARAR |
| FYSIK+GRANNAR | 0,64 | 6,65 % | 4,5 | 4,9 | 5,7 | 12,2 | 0,27 % | 13,8 / 4,0 | 0,9 % | KLARAR·FALLER·KLARAR |
| FYSIK+BLANDNING | 0,61 | 5,97 % | 4,1 | 4,3 | 5,3 | 10,9 | 0,27 % | 12,3 / 3,6 | 0,9 % | KLARAR·FALLER·KLARAR |

**Mot det jag väntade mig:** RÅ inom alla tre spann. FYSIK+GRANNAR 6,65 mot 6,8–7,3 (0,15 bättre). FYSIK+BLANDNING 5,97 mot 6,2–6,7 (0,23
bättre); > 20 km 10,9 mot 11–12. **Fel i förväntan:** FYSIK ensam bortom 20 km 15,5 % mot väntade 10–11 % — bandet "> 20 km" är de verkligt
isolerade stationerna (fjäll, Norrland), inte "hela landet uttunnat till 100 km"; där slår fysiken ensam inte RÅ (15,5 mot 13,6), det gör
bara kombinationen (10,9). Läsning av det oväntat goda talet: populationen bekräftad av RÅ-kontrollen; ingen kandidat ser målets egen serie;
skillnaden mot mina timtal (blandningen 6,37 → 5,97) går åt samma håll som RÅ (7,68 → 7,50) och beror troligen på kuvösens strängare
vakter. Populationen för FYSIK-kandidaterna är 631 punkter mindre än RÅ:s (hinkar där `oof_A2` saknar värde); 754 → 736 stationer är
vakterna och MIN_SHARED, samma 736 som kuvösen. Alla kandidater FALLER på A2:s 5 %, som alla kuvösens kandidater. Riktningsprov, ingen dom.
