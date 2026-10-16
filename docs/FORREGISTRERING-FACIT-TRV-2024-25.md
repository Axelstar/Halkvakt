# Förregistrering — kuvösens facit ur Trafikverkets väglag, vintern 2024/25

**Status: UTKAST 16/10 2026** (Bengt: *"ja till alla tre"*, DECISIONS #591). Signeras av Bengt och Axel **innan** någon del av
kuvösen läses mot väglaget. Källorna är Trafikverkets svar TRV 2026/111808 (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §5h, manifestet
`kuvos/trv-111808-leverans.json`), TROSKLAR-SKUGGAN §2 och kuvössidan §7–§8. Filerna ligger i hinken `arkiv`, aldrig i repot.

## 1. Vad som läses

Tre frågor. Alla är diagnos: ingen ändrar en tröskel eller fäller en grind, och domen i mars fälls på driften som förut (#547).
Regel L gäller (#564).

- **(a) Kandidaten** NIVÅ 2+BLANDNING, den frysta (#552), i kuvösens analysläge (#544 väg B) vid de 754 stationerna: hur ofta
  bekräftar väglaget kandidatens kalla timmar, och hur ofta missar kandidaten Trafikverkets is?
- **(b) Efterhalkan** (S3, betan): hur stor andel av fyrningarna bekräftas? Det skiljer dess pris (45 %) från stationens blindhet
  (kuvössidan §7).
- **(c) Åtgärderna:** hur ofta Trafikverket hade planerat halkbekämpning där (a) och (b) varnade. Det redovisas men bekräftar inget,
  eftersom åtgärderna är planerade och inte utförda (§5h).

## 2. Facit — vad i väglaget som räknas

- **Is:** kod 60, 61, 70 eller 71 (isigt, fläckvis isigt, isigt med bart i hjulspår, fläckvis isigt med bart i hjulspår) i
  RoadCondCode1 eller RoadCondCode2.
- **Snö och modd:** 30, 31, 40, 41, 50, 51, 100 och 101. Redovisas för sig och räknas inte som is.
- **Vått:** 20 och 21. Används bara som fuktvittne i kandidatens regel (§4 a), aldrig som facit.
- Ett väglag gäller från sin ModifiedTime till sträckans nästa ändring. En **is-episod** är en sammanhängande tid med is på en
  sträcka, och dess start är den första ändringen med is.
- Som i TROSKLAR-SKUGGAN §2 får väglaget **bekräfta** en träff men **aldrig fälla** ett falsklarm: en varning utan is i fönstret är
  *obedömbar*, inte fel.

## 3. Tid och plats

- **Tidszonen mäts före läsningen**, som 2/10 (KUVOS-LEVERANSEN §3): saknar timmen 02 natten till 30/3 2025 ändringar är stämplarna
  svensk lokaltid och görs om till UTC; annars läses de som UTC. Utfallet skrivs in här innan läsningen börjar.
- **Station och sträcka:** en station hör till de sträckor vars linje ligger inom **2 km** från stationen (TROSKLAR-SKUGGAN §2:s
  matchning), med linjerna ur `road_conditions` i dag. En station utan sträcka inom 2 km redovisas som utanför.
- **Antagande:** sträckorna har samma geometri som 2024/25. ID:na stödjer det, eftersom alla 816 finns i dag (§5h); antagandet står
  i redovisningen.

## 4. Måtten

**(a) Kandidaten**, per station och timme där kandidatens yta är 0 °C eller kallare:
- *Bekräftad:* is på någon av stationens sträckor inom [t − 1 h, t + 2 h]. Redovisas som andelen bekräftade A.
- *Basnivån* B är andelen av alla station-timmar med stationens egen yta på 0 °C eller kallare som har is i samma fönster. Lyftet är
  A / B.
- *Miss:* en is-episod på en sträcka där ingen av dess stationer hade kandidatens yta på 0 °C eller kallare under de 2 h före
  episodens start (TROSKLAR-SKUGGAN §2). Andelen missade episoder redovisas, med missarna klassade som utstrålnings- eller
  nederbördsdrivna efter §2:s orsaksklassning.
- *Hela regeln* (kall yta, fukt, veto och spridning, #562–#575) räknas bredvid. Väglagets Vått (20 och 21) är fuktvittnet, och
  kuvösens radar tar timmarna där väglaget tiger.

**(b) Efterhalkan**, per fyrning: bekräftad om is uppträder inom [t, t + 6 h]. Andelen bekräftade redovisas, och basnivån räknas som i (a).

**(c) Åtgärderna:** andelen av varningarna i (a) och (b) med planerad halkbekämpning (20 eller 50) på sträckan inom [t − 6 h, t + 6 h].
Rader utan start- eller stopptid räknas inte, och inte heller starttider före 2024-11-01.

Allt redovisas per månad och per breddgradsband (55–60, 60–64 och 64–69 °N), med antalen bakom varje andel.

## 5. Förväntan, skriven före läsningen

- Lyftet för kandidaten är över 1: kandidatens kalla timmar har oftare is än kalla timmar i allmänhet. Någon nivå förväntas inte,
  eftersom kandidaten aldrig har mötts mot väglag.
- Väglaget bekräftar mindre i söder än i norr: blixthalka mellan rapporterna syns sämre där is är ovanlig.
- Missarna klumpar sig vid nederbörd, inte vid utstrålning.

## 6. Fryst vid signeringen

Koderna (§2), avståndet och fönstren (§3, §4) och måtten (§4). Ändras något efteråt sker det bara genom en daterad post med båda
signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 7. Hittills sett

Bara formen, antalen och kodernas fördelning i hela filen (KUVOS-LEVERANSEN §5h). Ingen station, ingen kandidattimme och ingen
fyrning har ställts mot väglaget.

## 8. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
