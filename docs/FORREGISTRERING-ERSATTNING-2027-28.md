# Ersättningsregeln — när den nya kandidaten tar den frystas plats inför vintern 2027/28

**Status: UTKAST 23/10 2026** (DECISIONS #689 punkt 3, #690). Bengt och Axel signerar **innan** den nya kandidatens provning trycks
(`kuvos-ny-kandidat` steg=provning). Fristen är `ersattningsregel-ny-kandidat`, 26/10. Två val i §3 och §5 är Bengts, och de görs
före signeringen.

Källorna:
- den nya kandidaten: `docs/FORREGISTRERING-NY-KANDIDAT-2027-28.md` §3, §5 och §10 (DECISIONS #670–#672), `fysik/ny_kandidat/`;
- den frysta kandidaten på 2022/23: DECISIONS #680 (kuvos-vintrar 39766761188) och `docs/FORREGISTRERING-FLER-VINTRAR.md` §4;
- den frystas dom över vintern 2026/27: `docs/FORREGISTRERING-2026-27.md`;
- regel L (#564): ingenting lättas efter ett sett utfall.

## 1. Vad regeln avgör

Om den **nya kandidaten** (tränad på sex vintrar, #670) förs vidare som kandidat för vintern 2027/28 i stället för den **frysta**
(#552). Svaret skrivs in i förregistreringen för 2027/28, som ska tillämpa regeln som den står här (NY-KANDIDAT §5).

Regeln är ingen dom. Den frysta döms över vintern 2026/27 i mars 2027 som förregistrerat, och den nya döms aldrig på en levande
vinter före 2027/28. Regeln väljer bara vilken av dem som går vidare.

## 2. Underlaget, och bara det

- **Den nya:** sammanställningen efter de sex proven, en vinter i taget utanför (`samman.json` ur `fysik/ny_kandidat/provning.py`).
  Huvudtalet är det enkla medlet av de utelämnade vintrarnas A1, A2 och A3 (NY-KANDIDAT §10).
- **Den frysta:** dess tal på 2022/23 (#680). Det är den enda vintern som ingen av dem har sett.
- **Måtten** är grind A:s på grind A:s population:
  - A1 är medelfelet i grader där den uppmätta ytan är −5 °C eller varmare;
  - A2 är andelen fel större än 2 °C;
  - A3 är andelen på fel sida om noll;
  - marginalen är 1,96 standardfel (`fysik/vintrar/matt.py`).
- **Samma punkter.** Jämförelsen på 2022/23 gäller bara om den nyas population den vintern är densamma som den frystas, alltså samma
  n (4 361 591) och samma stationer (718). Är den inte det räknas båda om på de gemensamma punkterna innan något jämförs
  (åtgärdslistan B8-24).
- **Ingenting annat.** Tal i urvalet, 2024/25, där den frysta är tränad, och väg B:s tal ingår inte.

Den frystas tal på 2022/23, för NIVÅ 2+BLANDNING (#680):

| | A1 | A2 | A3 |
| :-- | :-- | :-- | :-- |
| totalt | 0,522 °C | 4,52 % | 0,30 % |
| norr ≥ 62° | | 9,01 % | |
| söder | | 2,73 % | |

## 3. Villkoren

Den nya tar den frystas plats bara om **alla fyra** villkoren håller.

**V1. Proven före läsningen.** Identitetsprovet och tidszonsprovet är klarade (NY-KANDIDAT §4), och högst en vinter har tagits bort.
Tas två eller fler bort, finns inte underlag nog att ersätta något.

**V2. Bättre än den frysta på 2022/23**, för NIVÅ 2+BLANDNING på samma punkter:
- A2 är lägre än den frystas med minst **X** procentenheter, totalt;
- A2 är inte högre än den frystas plus X, varken i norr eller i söder;
- A1 är inte högre än den frystas plus 0,01 °C;
- A3 är inte högre än den frystas plus 0,05 procentenheter, eftersom fel sida om noll är det som gör en halkvarning fel.

**Bengts val av X:**
- (a) **0,25 procentenheter**. Det är omkring en tjugondel av den frystas 4,52 %. Marginalerna är små (± 0,02) eftersom punkterna
  är många, men punkterna hänger ihop i tid och rum, så den verkliga osäkerheten är större. *Förslag.*
- (b) **marginalen**, alltså 1,96 standardfel. Varje skillnad som syns i talen räcker då.

**V3. Bättre än RÅ varje vinter.** För varje utelämnad vinter som är kvar har NIVÅ 2+BLANDNING lägre A2 än RÅ. Det är förväntan i
NY-KANDIDAT §6, och här blir den ett krav. En kandidat som är sämre än rådata någon vinter tar inte en plats.

**V4. Bättre än RÅ i norr och i söder.** Huvudtalet för A2, det enkla medlet över vintrarna, är lägre än RÅ:s, både i norr och i söder.

## 4. Om villkoren håller, och om de inte gör det

**Håller alla fyra:** den nya går vidare som kandidat för 2027/28, enligt valet i §5. Innan den talar i appen:
- **Kedjan byggs om.** Den levande kedjan tar långvågen ur MET (`fysik/live/kandidat_fysik.py`), men den nya är tränad med fysikens
  reserv alla timmar (NY-KANDIDAT §1). Kedjan måste räkna som den nya är tränad.
- **Paritet först.** Den ombyggda kedjan ska ge den nyas tal på 2024/25 i ett identitetsprov, inom samma krav som #680 (± 0,01 °C
  och ± 0,02 procentenheter), innan något deployas.
- **Egen förregistrering.** Domen över 2027/28 får en egen förregistrering, som 2026/27.

**Håller något villkor inte:** den frysta står kvar som kandidat för 2027/28, om den klarar marsdomen. Faller den, gäller RÅ som
kontroll och reserv (#657). Den nya arkiveras med sina tal och sitt manifest, och vilket villkor som föll skrivs ut.

## 5. Den frystas marsdom

Den frysta kan klara marsdomen 2027 på en levande vinter. Den nya har aldrig gått levande. **Bengts val:**
- (a) **Den nya tar platsen när V1–V4 håller, vad marsdomen än säger.** Sex vintrar och en ärlig jämförelse på 2022/23 räcker.
- (b) **Den nya tar platsen bara om den frysta faller marsdomen.** Klarar den frysta domen, står den kvar för 2027/28, och den nya
  räknas i skugga bredvid hela vintern, med egen loggning, så att den kan dömas på levande data till 2028/29. *Förslag:* domarna
  fälls på driften (#547, #662), och en kandidat som klarat en levande vinter ska inte trängas undan av historiska tal.

## 6. Förväntan, skriven före provningen

- V1 håller: alla sex vintrar klarar proven.
- V3 och V4 håller: blandningen slår RÅ varje vinter, som den frysta gjorde 2022/23 (4,52 mot 8,66 %).
- V2 är osäkert. Reservens långvåg gör fysiken något sämre (NY-KANDIDAT §6), men fler träningsvintrar väger upp. Claude väntar sig att
  den nyas A2 på 2022/23 hamnar inom 0,5 procentenheter från den frystas, åt något håll.

## 7. Fryst vid signeringen

Villkoren (§3), underlaget (§2), följden (§4) och valet i §5 fryses vid signeringen. Ändras något efteråt sker det bara genom en
daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L). En skärpning får göras före läsningen.

## 8. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
