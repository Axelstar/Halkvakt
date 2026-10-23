# Ersättningsregeln — den nya kandidaten i skugga vintern 2026/27, och valet inför 2027/28

**Status: UTKAST 23/10 2026, omskrivet samma dag efter Bengts val** (DECISIONS #689 punkt 3, #690, #691). Bengt och Axel signerar
**innan** den nya kandidatens provning trycks (`kuvos-ny-kandidat` steg=provning). Fristen är `ersattningsregel-ny-kandidat`, 26/10.
Bengts val 23/10:
- *"Väg 2: den frysta signeras 26/10 och talar i vinter, och den nya körs i skugga från november om den klarar V1–V4"*;
- X = 0,25 procentenheter.

Kvar före signeringen är bara signaturerna.

Källorna:
- den nya kandidaten: `docs/FORREGISTRERING-NY-KANDIDAT-2027-28.md` §1, §3, §5 och §10 (DECISIONS #670–#672), `fysik/ny_kandidat/`;
- den frysta kandidaten på 2022/23: DECISIONS #680 (kuvos-vintrar 39766761188) och `docs/FORREGISTRERING-FLER-VINTRAR.md` §4;
- den frystas dom över vintern 2026/27: `docs/FORREGISTRERING-2026-27.md`;
- regel L (#564): ingenting lättas efter ett sett utfall.

## 1. Vad regeln avgör

Regeln avgör två saker, var sin gång.

1. **I höst, efter provningen:** om den **nya kandidaten** (tränad på sex vintrar, #670) körs i skugga under vintern 2026/27. Det
   avgörs på historiska tal, med villkoren V1–V4 (§3).
2. **I mars 2027:** vilken av den nya och den **frysta** (#552) som går vidare som kandidat för vintern 2027/28. Det avgörs på den
   levande vintern 2026/27, med samma mått för båda (§5).

**Den frysta påverkas inte.** Förregistreringen för 2026/27 signeras 26/10, och den frysta talar i appen hela vintern. Kandidaten,
regeln, grindarna och domen i den förregistreringen står som de är. Den nya talar aldrig i appen under 2026/27.

## 2. Underlaget för skuggan, och bara det

- **Den nya:** sammanställningen efter de sex proven, en vinter i taget utanför (`samman.json` ur `fysik/ny_kandidat/provning.py`).
  Huvudtalet är det enkla medlet av de utelämnade vintrarnas A1, A2 och A3 (NY-KANDIDAT §10).
- **Den frysta:** dess tal på 2022/23 (#680). Det är den enda vintern som ingen av dem har sett.
- **Måtten** är grind A:s, på grind A:s population:
  - A1 är medelfelet i grader där den uppmätta ytan är −5 °C eller varmare;
  - A2 är andelen fel större än 2 °C;
  - A3 är andelen på fel sida om noll;
  - marginalen är 1,96 standardfel (`fysik/vintrar/matt.py`).
- **Samma punkter.** Jämförelsen på 2022/23 gäller bara om den nyas population den vintern är densamma som den frystas, alltså
  samma n (4 361 591) och samma stationer (718). Är den inte det räknas båda om på de gemensamma punkterna innan något jämförs
  (åtgärdslistan B8-24).
- **Ingenting annat.** Tal i urvalet, 2024/25 (där den frysta är tränad) och väg B:s tal ingår inte.

Den frystas tal på 2022/23, för NIVÅ 2+BLANDNING (#680):

| | A1 | A2 | A3 |
| :-- | :-- | :-- | :-- |
| totalt | 0,522 °C | 4,52 % | 0,30 % |
| norr ≥ 62° | | 9,01 % | |
| söder | | 2,73 % | |

## 3. Villkoren för skuggan

Den nya körs i skugga bara om **alla fyra** villkoren håller.

**V1. Proven före läsningen.** Identitetsprovet och tidszonsprovet är klarade (NY-KANDIDAT §4), och högst en vinter har tagits bort.

**V2. Bättre än den frysta på 2022/23**, för NIVÅ 2+BLANDNING på samma punkter:
- A2 är totalt minst **0,25 procentenheter** lägre än den frystas, alltså högst 4,27 % mot 4,52 %;
- A2 är varken i norr eller i söder mer än 0,25 procentenheter högre än den frystas;
- A1 är högst 0,01 °C högre än den frystas;
- A3 är högst 0,05 procentenheter högre än den frystas, eftersom fel sida om noll är det som gör en halkvarning fel.

Marginalen är ± 0,02, eftersom punkterna är många. Punkterna hänger ändå ihop i tid och rum, så den verkliga osäkerheten är större,
och en skugga kostar en kedja att bygga. Därför är kravet 0,25 och inte marginalen (Bengt 23/10, #691).

**V3. Bättre än RÅ varje vinter.** För varje utelämnad vinter som är kvar har NIVÅ 2+BLANDNING lägre A2 än RÅ (NY-KANDIDAT §6, här
som krav).

**V4. Bättre än RÅ i norr och i söder.** Huvudtalet för A2, det enkla medlet över vintrarna, är lägre än RÅ:s, både i norr och i
söder.

**Faller något villkor** körs ingen skugga. Den nya arkiveras med sina tal och sitt manifest, och vilket villkor som föll skrivs ut.
Den frysta står då ensam, och i mars gäller dess egen dom: klarar den sig går den vidare till 2027/28, annars gäller RÅ som kontroll
och reserv (#657).

## 4. Skuggan

- **En egen kedja.** Den nya räknas i en egen kedja bredvid den levande, med fysikens reserv för långvågen alla timmar, så som den
  nya är tränad (NY-KANDIDAT §1). Den frystas kedja (`fysik/live/`, långvågen ur MET) rörs inte.
- **Paritet först.** Innan skuggan räknar något ska den nya kedjan ge den nyas tal på 2024/25 i ett identitetsprov, inom samma krav
  som #680: ± 0,01 °C och ± 0,02 procentenheter.
- **En egen logg.** Den nyas stationsvärden och regelns utfall loggas i en egen tabell bredvid `kandidat_skugga` (sql/057), med samma
  fält, så att domen i §5 kan räknas likadant för båda. Migrationen och deployen gör Bengt.
- **Starten.** Målet är 1/11. Skuggfönstret börjar den första timme som den nya kedjan räknar och loggar i drift. Dygnen före
  redovisas som saknade. Fristen är `ny-kandidat-skugga` 15/11. Hinns den inte, skrivs det ut, och valet i §5 räknas på det fönster
  som finns.
- **Ingenting når förarna.** Skuggan når varken appen, rösten, lägesfilen eller den frystas dom.

## 5. Valet i mars 2027

**Båda döms med förregistreringen för 2026/27, §4 och §4b:** samma mått, samma population och samma krav. Den frysta döms som
förregistrerat, på hela sitt domfönster. Den nya döms på sin egen logg, på de timmar och punkter där båda har ett värde, alltså det
gemensamma fönstret. Den nyas dom avgör bara valet, ingenting i appen.

| Den frysta | Den nya | Går vidare till 2027/28 |
| :-- | :-- | :-- |
| klarar | klarar inte | den frysta |
| klarar inte | klarar | den nya |
| klarar | klarar | den nya bara om dess A2 på det gemensamma fönstret är minst 0,25 procentenheter lägre än den frystas, annars den frysta |
| klarar inte | klarar inte | RÅ, som kontroll och reserv (#657) |

Den som går vidare får en egen förregistrering för 2027/28. Går den nya vidare, blir dess skuggkedja den levande kedjan efter ett
nytt paritetsprov.

## 6. Förväntan, skriven före provningen

- V1 håller: alla sex vintrar klarar proven.
- V3 och V4 håller: blandningen slår RÅ varje vinter, som den frysta gjorde 2022/23 (4,52 mot 8,66 %).
- V2 är osäkert. Reservens långvåg gör fysiken något sämre (NY-KANDIDAT §6), men fler träningsvintrar väger upp. Claude väntar sig
  att den nyas A2 på 2022/23 hamnar inom 0,5 procentenheter från den frystas, åt något håll. Kravet på 0,25 kan alltså falla.
- Håller villkoren, räknar skuggan i drift före 15/11.

## 7. Fryst vid signeringen

Villkoren (§3), underlaget (§2), skuggan (§4) och valet (§5) fryses vid signeringen. Ändras något efteråt sker det bara genom en
daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L). En skärpning får göras före läsningen.

## 8. Vad regeln ändrar i NY-KANDIDAT

NY-KANDIDAT §5 säger *"Ingen dom och ingen ändring för vintern 2026/27"*. Med den här regeln kan den nya dömas i skugga på vintern
2026/27, enligt §4 och §5. Den frysta, regeln, grindarna och den frystas dom står kvar. Ändringen gäller från signeringen av det här
dokumentet och står också i NY-KANDIDAT §10. Den görs före varje utfall av den nya och lättar ingenting (regel L).

## 9. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
