# Förregistrering — den frysta kandidaten på fem äldre vintrar, 2018/19–2022/23

**Status: SIGNERAD 22/10 2026** (Bengt, och Axel via Bengt, DECISIONS #668). Utkastet: DECISIONS #667, efter #666. Dokumentets sha256
vid signeringen, före den här raden och signaturerna: `7e457903c0bab37e1eb010df6e7e109f7e674c4449ca23dec2077c6892ce2c56`. Ingen av vintrarna var läst mot kandidaten vid signeringen.

Källorna:
- VViS-leveransen 21/10 (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §9, manifestet `kuvos/vvis-2018-24-leverans.json`);
- kandidatens identitet i `docs/FORREGISTRERING-2026-27.md` §1 och `kuvos/kandidat-2026-27.json`;
- grind A i `publish/grind-a.ts`.

Filerna ligger i hinken `arkiv`, aldrig i repot.

## 1. Vad som läses

**Frågan:** håller den frysta kandidaten på *samma stationer, nytt år*? FORREGISTRERING-2026-27 säger att det inte är mätt (§4, §7).
Grind A i vinter prövar just det, och kandidatens rättelse är tränad på samma stationer (#562 punkt 4).

Läsningen är **diagnos**. Den ändrar ingen tröskel, ingen kandidat och ingen grind, och domen i mars fälls på driften som förut (#547).
Regel L gäller (#564).

- **Kandidaten** är den frysta ur #552 och ingenting annat:
  - fysiken `lw` med de femton parametrarna i `kuvos/kandidat-2026-27.json`;
  - rättelsen `modell.pkl` med sha256 `c96c4072f4ecc6a979afea23c7854f77cb9f205a1cf47d8ed68fba53f58fc0ae`, ur hinken under
    `kuvos/kuvos-kandidat-2026-27/`, med de 70 särdragen i manifestet;
  - blandningen W 0,25 · L 160 km.

  Ingen omträning, ingen omkalibrering och inget nytt par.
- **Vintrarna** är 2018/19, 2019/20, 2020/21, 2021/22 och 2022/23, var och en 1/11–31/3. Januari–mars 2018 och januari–mars 2024 läses
  inte, eftersom deras höstar saknas.

## 2. Hur kandidatens värde räknas

- **Analysläget (#544).** Kandidaten räknas i analysläget, som i kuvösen:
  - PH är fysiken `lw` driven av MET Nordics analys (`met_analysis_1_0km_nordic`, metpparchive), med ECMWF IFS för timindexet,
    höjden och uppvärmningen 10/10–31/10 (Open-Meteos arkiv, `models=ecmwf_ifs`, samma sju fält som `fysik/fetch_ifs.py`);
  - därpå kommer rättelsen;
  - snötäcket ackumuleras från 10/10, som i kuvösen.

  **Prognosläget +6 h ingår inte** (#666 punkt 5).
- **Stationernas fasta data** tas oförändrade ur releasen `kuvos-fysik-indata-2024-25`. En station som saknas där läses inte, och inga
  nya särdrag räknas.
- **Blandningen** är den levande kedjans (`fysik/live/kandidat_timme.py`), med stationens egen mätning utesluten
  (*leave-one-out*), både ur RÅ och ur grannarnas fel:
  - res = mätt yta − PH hos grannen vid samma tid;
  - de **8 närmaste ändliga** felen inom 300 km, med vikten exp(−d/100);
  - CORR = Σw·res / (Σw + 0,5) och PG = PH + CORR;
  - PB = wb·RÅ + (1 − wb)·PG, där wb = 0,25·exp(−ANK/160).

  Kuvösens replika tar först de 32 närmaste och sedan de 8 första ändliga. Kandidaten som döms i vinter är den levande kedjans, och
  skillnaden redovisas.
- **Tiden.** PH är timvis, och halvtimmen är medlet av de två timmarna (`fysik/kuvos_replica.py:99–111`). Grannarna och RÅ tas vid den
  giltiga tiden.
- **Kedjan** byggs i nya filer under `fysik/`, med vintern som parameter. De frysta filerna rörs inte (fysik/README).

## 3. Prov före läsningen

Ingen äldre vinter läses förrän båda proven är klarade.

- **(a) Identitetsprovet.** Den nya kedjan körs först på 2024/25 med kuvösens indata och ska ge den frysta modellens egna tal i
  urvalet (`kuvos/kandidat-2026-27.json`, *i_urvalet*):
  - fysiken med rättelsen: **A1 0,46477 °C och A2 1,4449 %, på n = 2 210 532**;
  - toleransen är A1 ± 0,01 °C och A2 ± 0,02 procentenheter, med n exakt, som #597.

  Klarar kedjan inte provet stannar läsningen, och felet söks innan något annat körs.
- **(b) Tidszonen för varje vinter.** Kedjan antar svensk lokaltid (`fysik/prep.py:11`). Två prov görs, som i KUVOS-LEVERANSEN §3:
  - sommartidsnatten ska sakna rader (31/3 2019, 29/3 2020, 28/3 2021, 27/3 2022, 26/3 2023);
  - lufttemperaturens timförändring mot SMHI:s öppna serier ska ha förskjutningen 0 h.

  Visar ett prov något annat läses inte den vintern, och frågan går till Bengt.

## 4. Måtten

**Grind A:s definitioner** (`publish/grind-a.ts:124–133`):
- **A1** är medelfelet i absoluta tal där mätt yta är −5…+5 °C.
- **A2** är andelen |fel| > 2 °C bland alla punkter med mätt yta ≤ +5 °C.
- **A3** är andelen fel sida om noll: mätt < 0 och skattat > 2 °C, eller mätt > 2 och skattat < 0 °C.

**Populationen** är grind A:s, som i kuvösen (`scripts/matningar/kuvos-blandning-2026-10-08.ts`):
- station och halvtimme, med senaste raden per halvtimme;
- mätt yta ≤ +5 °C, efter vakterna (#75, radvakten, karantänen och den långsamma vakten);
- RÅ finns (högst 5 grannar inom 50 km, vikten 1/max(km, 1), minst 20 gemensamma halvtimmar utom den egna);
- snittad med punkterna där PH och PB har värde.

**Redovisningen**, för varje vinter för sig och för de fem tillsammans:

| Serie | Vad |
| :-- | :-- |
| RÅ | grannarnas skattning, som jämförelse |
| NIVÅ 2 | PH vid stationen, utan grannar |
| NIVÅ 2+BLANDNING | PB, kandidatens värde |

- Varje serie redovisas med A1, A2, A3, n och felmarginalerna (`stats` i grind-a.ts).
- Allt redovisas också per ankarband (0–7, 7–15, 15–20 och över 20 km, närmaste bidragande granne till RÅ), norr och söder om 62° och
  per månad.
- 2024/25 räknas i samma kedja och står bredvid, märkt **i urvalet**, eftersom rättelsen är tränad på den vintern.
- Alla tal skrivs ut, också de som talar emot.

## 5. Vad läsningen inte är

- **Ingen dom.** Grind A:s tak 5 % står bredvid, men fäller ingenting.
- **Inte samma fråga som väg B.** Kuvösens tal 4,84 % (analys) och 5,12 % (+6 h) kommer från väg B: andra stationer samma år, med
  modellerna tränade veck för veck (#544, #552). Det här är samma stationer andra år, med den enda frysta modellen. Talen står
  bredvid varandra, inte som prov på varandra.
- **Ingen kandidat för 2026/27 ändras.** En kandidat som tränas på flera vintrar är en annan fråga och en kandidat för 2027/28
  (#552, #666 punkt 5).

## 6. Förväntan, skriven före läsningen

- NIVÅ 2+BLANDNING har lägre A2 än RÅ varje vinter, som 2024/25 (4,84 mot 7,51 % i väg B).
- A2 för NIVÅ 2 är högre de äldre vintrarna än i urvalet 2024/25 (1,44 %), eftersom rättelsen har sett 2024/25 men inga andra år.
  Hur mycket högre förutsägs inte.
- Norr om 62° är sämre än söder, alla vintrar.
- Vintrarna skiljer sig mer i norr än i söder.

## 7. Hittills sett

Bara leveransens form (KUVOS-LEVERANSEN §9) och att indatan finns:
- ECMWF IFS för 1/11 2018: 24 av 24 timmar;
- MET Nordics analys: 24 filer per dygn för 1/11 2018, 1/12 2019, 15/1 2021 och 1/2 2023;
- MET Nordics prognoser: fyra per dygn i stickproven från 1/12 2019, men inga 1/11 2018.

Inga mätvärden har lästs, och ingen station, kandidattimme eller fysikkörning har ställts mot de äldre vintrarna.

## 8. Fryst vid signeringen

Det som fryses är kandidaten (§1), räkningen (§2), proven (§3) och måtten och populationen (§4). Ändras något efteråt sker det bara
genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 9. Följden för FORREGISTRERING-2026-27

Bengt valde att köra så fort kedjan är byggd (#666 punkt 3). Är utfallet läst före den 31/10 står det vid signaturerna där, med datum
och körning (§10 f där), och ingenting i dess §1–§5 får ändras mot godkänt på grund av det.

## 10. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | 2026-10-22 | Bengt i chatten: *"gör alla de punkter som väntar som går att göra nu jag signerar för axel om mej själv"* (DECISIONS #668) |
| Axel | 2026-10-22 | Via Bengt i samma ord (DECISIONS #668) |
