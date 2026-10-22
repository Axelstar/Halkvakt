# Förregistrering — en ny kandidat tränad på sex vintrar, för vintern 2027/28

**Status: UTKAST 22/10 2026** (Bengt 22/10: *"träna en ny kandidat på alla vintrar"*; valen *"Fysikens reserv alla år"*, *"En vinter
i taget utanför"* och *"Bengt för båda"*, DECISIONS #670). Bengt signerar för sig och Axel **innan** något utfall av den nya
kandidaten läses.

Källorna:
- VViS-leveranserna (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §1 och §9, manifesten `kuvos/leverans.json` och
  `kuvos/vvis-2018-24-leverans.json`);
- den frysta kandidatens procedur (`fysik/niva2/frysta.py`, `kedja.py`, `fysik_lw.py`, DECISIONS #544, #552);
- kedjan för flera vintrar (`fysik/vintrar/`, #1144).

## 1. Vad som byggs

En **ny kandidat**, inte den frysta. Den frysta (#552) körs och döms i vinter som förregistrerat (FORREGISTRERING-2026-27) och rörs
inte. Den nya är en kandidat för vintern 2027/28 (#552), med samma uppbyggnad och samma procedur som den frysta:
- **Fysiken** `lw` kalibreras som `fysik/niva2/frysta.py` gör: Nelder–Mead från `vagb.DEFAULT`, målet A1 + 5·A2, maxfev 120, på alla
  stationer i träningsvintrarna.
- **Rättelsen** tränas på uppmätt yta minus fysik: HistGradientBoosting med `A2_KONFIG` och samma särdrag som den frysta.
- **Blandningen** väljs bland samma 15 par (W, L) som väg B (`fysik/blandning/vagb_blandning.py`), på träningsvintrarna. Den räknas som den levande
  kedjan (`fysik/live/kandidat_timme.py`), med stationens egen mätning utesluten.
- **Vädret** är MET Nordics analys (nivå 2), med ECMWF IFS för timindexet och uppvärmningen 10/10–31/10, som den frysta.

**Den enda skillnaden i indata är långvågen.** MET:s arkiv saknar den före 14/3 2022. Därför räknas långvågen **alla år och alla
timmar** med fysikens reserv, himlens emissivitet ur luft, daggpunkt och moln (`sky_emissivity` i `fysik/physics.py`, anropad från `fysik/niva2/fysik_lw.py`), som kedjan redan
gör under uppvärmningen. MET:s uppmätta långvåg används inte, inte heller 2022/23 och 2024/25. Särdragen `cloudlow` och `cloudlow6`
räknas ur den reserven (`fysik/niva2/kedja.py:114–117`). För 2018/19, där MET saknar `wind_speed_10m`, räknas vinden ur komponenterna i x och y.

## 2. Vintrarna

Sex vintrar, var och en 1/11–31/3:
- 2018/19, 2019/20, 2020/21, 2021/22 och 2022/23, ur leveransen 21/10;
- 2024/25, ur leveransen 2/10.

2023/24 och 2017/18 tas inte med, eftersom deras höstar saknas. Stationerna är de som har fasta data i `kuvos-fysik-indata-2024-25`.

## 3. Prövningen — en vinter i taget utanför

**Sex prov.** I varje prov hålls en vinter utanför. Fysiken kalibreras, rättelsen tränas och paret väljs på de fem andra vintrarna,
och modellen prövas sedan på vintern som hölls utanför. Ingen del av den vintern används i träningen eller i valet av par.

**Måtten** är grind A:s, på grind A:s population, exakt som FORREGISTRERING-FLER-VINTRAR §4:
- A1, A2 och A3, med n och felmarginaler;
- för RÅ, NIVÅ 2 och NIVÅ 2+BLANDNING;
- per utelämnad vinter, och som medel över de sex;
- per band, norr och söder om 62° och per månad.

**Den slutliga kandidaten** tränas sist på alla sex vintrarna, med samma procedur. Dess egna tal redovisas märkta **i urvalet**. Den
kan bara bedömas genom de sex proven ovan.

**Jämförelsen med den frysta** görs bara på 2022/23. Det är den enda vintern där båda kan räknas utan att ha sett den: den frysta
enligt FORREGISTRERING-FLER-VINTRAR, och den nya i provet där 2022/23 hålls utanför. 2024/25 står bredvid, men den frysta är tränad
på den vintern och jämförs därför inte.

## 4. Prov före läsningen

Inget utfall läses förrän båda proven är klarade:
- identitetsprovet på 2024/25 är klarat i samma kedja (FORREGISTRERING-FLER-VINTRAR §3 a);
- tidszonsprovet är klarat för varje vinter (där §3 b).

Faller ett prov för en vinter, tas den vintern bort ur alla sex proven, och det redovisas.

## 5. Vad det inte är

- **Ingen dom och ingen ändring för vintern 2026/27.** Den frysta kandidaten, regeln och grindarna står kvar.
- **Inget val av kandidat för 2027/28.** Om den nya ersätter den frysta bestäms i förregistreringen för 2027/28, med de här talen som
  underlag. Inga trösklar eller krav sätts här.

## 6. Förväntan, skriven före läsningen

- NIVÅ 2+BLANDNING har lägre A2 än RÅ i varje utelämnad vinter.
- Felen skiljer sig mer mellan vintrarna i norr än i söder.
- Reservens långvåg gör fysiken ensam något sämre än med MET:s uppmätta långvåg. Rättelsen tar igen en del av det. Hur mycket
  förutsägs inte.

## 7. Hittills sett

- Bara leveransernas form.
- Att MET:s arkiv saknar långvågen före 14/3 2022 och vindhastigheten 2018/19. Det är läst ur filernas beskrivning, inte ur
  värdena.
- Identitetsprovet på 2024/25, som gäller den frysta kandidaten i urvalet och inte den nya.

Ingen vinter är läst mot någon kandidat.

## 8. Fryst vid signeringen

Det som fryses är procedurerna och indatan (§1), vintrarna (§2), prövningen och måtten (§3) och proven (§4). Ändras något efteråt sker
det bara genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 9. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
