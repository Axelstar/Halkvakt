# Förregistrering — kuvösens facit ur Trafikverkets väglag, vintern 2024/25

**Status: SIGNERAD 16/10 2026** (Bengt, och Axel via Bengt, DECISIONS #595). Utkastet: Bengt: *"ja till alla tre"*, DECISIONS #591; indatan i §4 skriven 16/10, DECISIONS #592, hela regeln #593 och nätets summa #594. Signeras av Bengt och Axel **innan** någon del av
kuvösen läses mot väglaget. Källorna är Trafikverkets svar TRV 2026/111808 (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §5h, manifestet
`kuvos/trv-111808-leverans.json`), TROSKLAR-SKUGGAN §2 och kuvössidan §7–§8. Filerna ligger i hinken `arkiv`, aldrig i repot.

## 1. Vad som läses

Tre frågor. Alla är diagnos: ingen ändrar en tröskel eller fäller en grind, och domen i mars fälls på driften som förut (#547).
Regel L gäller (#564).

- **(a) Kandidaten** NIVÅ 2+BLANDNING, den frysta (#552), i kuvösens analysläge (#544 väg B) vid de 736 stationer där väg B räknar den (körning 38368369876; 754 är driftens tal): hur ofta
  bekräftar väglaget kandidatens kalla timmar, och hur ofta missar kandidaten Trafikverkets is?
- **(b) Efterhalkan** (S3, betan): hur stor andel av fyrningarna bekräftas? Det skiljer dess pris (45 %) från stationens blindhet
  (kuvössidan §7).
- **(c) Åtgärderna:** hur ofta Trafikverket hade planerat halkbekämpning där (a) och (b) varnade. Det redovisas men bekräftar inget,
  eftersom åtgärderna är planerade och inte utförda (§5h).

## 2. Facit — vad i väglaget som räknas

- **Is:** kod 60, 61, 70 eller 71 (isigt, fläckvis isigt, isigt med bart i hjulspår, fläckvis isigt med bart i hjulspår) i
  RoadCondCode1 eller RoadCondCode2.
- **Snö och modd:** 30, 31, 40, 41, 50, 51, 100 och 101. Redovisas för sig och räknas inte som is.
- **Våt:** 20, i kod 1 eller kod 2. Fläckvis vått (21) räknas inte, som i regeln (Bengt 15/10: *"nej till fläckvis"*, #573;
  rättat 16/10, #593). Används bara som fuktvittne i hela regeln (§4 a), aldrig som facit.
- Ett väglag gäller från sin ModifiedTime till sträckans nästa ändring. En **is-episod** är en sammanhängande tid med is på en
  sträcka, och dess start är den första ändringen med is.
- Som i TROSKLAR-SKUGGAN §2 får väglaget **bekräfta** en träff men **aldrig fälla** ett falsklarm: en varning utan is i fönstret är
  *obedömbar*, inte fel.

## 3. Tid och plats

- **Tidszonen mäts före läsningen**, som 2/10 (KUVOS-LEVERANSEN §3): saknar timmen 02 natten till 30/3 2025 ändringar är stämplarna
  svensk lokaltid och görs om till UTC; annars läses de som UTC. **Mätt 16/10 med `kuvos/facit-trv.ts` på filerna lokalt: svensk
  lokaltid.** Timmen 02 den natten har 0 ändringar, medan timmarna runt har 26, 12, 10 och 13 (00, 01, 03 och 04). Det är samma
  utfall som leveransen 2/10.
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
- *Hela regeln* (kall yta, fukt, veto och spridning, #562–#575) räknas bredvid, som driftens `kandidat_regel()` (sql/058). Väglagets
  Våt (20) och kuvösens radar är fuktvittnena, som Våt och radarn i driften.

**(b) Efterhalkan**, per fyrning: bekräftad om is uppträder inom [t, t + 6 h]. Andelen bekräftade redovisas, och basnivån räknas som i (a).

**(c) Åtgärderna:** andelen av varningarna i (a) och (b) med planerad halkbekämpning (20 eller 50) på sträckan inom [t − 6 h, t + 6 h].
Rader utan start- eller stopptid räknas inte, och inte heller starttider före 2024-11-01.

Allt redovisas per månad och per breddgradsband (55–60, 60–64 och 64–69 °N), med antalen bakom varje andel.

**Indata** (DECISIONS #592; räknas i kuvösjobbet av `scripts/matningar/kuvos-blandning-vagb-facit-trv-2026-10-16.ts`):
- *Kandidaten* är NIVÅ 2 ÄRLIG+BLANDNING i analysläget ur väg B varv 1 (#544, #552), räknad i jobbet. *Identitetsprovet* (ändrat
  16/10 efter signeringen, §9, DECISIONS #597) avgör att det är den frysta kandidaten; annars vägrar läsningen. Provet kräver två
  saker jämfört med körning 38368369876:
  - samma par per veck i analysläget (W 0,25 och L 160, 160, 160, 160 och 80 km) och W 0,25 · L 160 km på alla veck;
  - samma grind A-mått på samma population som kuvösens läsning av kandidaten (#490): n = 4 352 575 exakt, A1 0,56 ± 0,01 °C, A2
    4,84 ± 0,02 procentenheter och A3 0,23 ± 0,02 procentenheter.
- *En kall timme* är en UTC-timme där något halvtimmesvärde är 0 °C eller kallare. Tillfällets tid t är timmens början. Det gäller
  både kandidaten och stationens egen yta.
- *Stationens egen yta* läses med grind A:s vakter (#75, radvakten och karantänen) och den senaste raden per halvtimme, som i
  kuvösens tidigare läsningar av kandidaten (#490). Basnivån räknas bara vid kandidatens 736 stationer, så A och B har samma stationer.
- *Efterhalkans fyrningar* kommer ur ögonblicksvarianten av sql/028 med betans startvärden (#456). Varje fyrning räknas för sig;
  riktningsprovet 6/10 hade 1 109, och indataprovet 16/10 gav 1 110 (en fler; orsaken är inte funnen, #593).
- *Perioden* är 1/11 2024 00:00 till 31/3 2025 24:00, svensk tid. Tillfällen utanför räknas inte, eftersom väglaget saknas där.
- *Basnivån för (b)* är stationernas egna kalla timmar i samma fönster som fyrningarna, [t, t + 6 h].
- *Missarna* räknas bara på sträckor med någon av kandidatens stationer, eftersom bara de kan se en episod.
- *Missens orsak* läses ur givarens ord vid sträckans närmaste station inom 2 km, i timmarna som når in i [start − 1 h, start + 1 h]:
  - regn, snöblandat eller snö i någon timme ⇒ *nederbördsdriven*;
  - annars uppehåll (`no`, `dry`) i någon timme ⇒ *utstrålningsdriven*;
  - annars *okänd*. Ord som motorn inte känner (`yes`, `freezing_rain`) räknas som okända, aldrig som torra.
- *Sträckorna* är `vaglag.geojson` som Körflödet hämtar det. Läsningen skriver ut *nätets summa*, en sha256 över sträckornas id och
  geometri sorterade på id (#594). Filens egen summa byts vid varje publicering, eftersom filen också bär dagens väglag. Stationernas
  lägen kommer ur `data/vagdata/stationer.json`.
- *Hela regeln* (DECISIONS #593) prövas vid varje kall timme t, i slutet av timmen e = t + 1 h, i driftens ordning:
  1. *veto* om en station inom 15 km, stationen själv medräknad, mätte en yta över +2 °C under (e − 45 min, e], med driftens vakter
     (#75, radvakten och karantänen);
  2. annars *torr* om ingen av stationens sträckor hade Våt vid e och radarns medel var under 0,5 mm/h på alla under (e − 60 min, e];
  3. annars *spridning* om minst två av RÅ:s ankare skiljer 2,25 °C eller mer, avrundat till en decimal. Ankarna är de fem närmaste
     andra stationerna inom 50 km med en yta vid timmen; en station är aldrig sitt eget ankare, som i driften;
  4. annars *varnar*.

  De varnande timmarna läses med samma mått som kandidaten: bekräftelsen, lyftet mot B, missarna och åtgärderna. Stationen står för en
  vägpunkt vid stationen, eftersom kandidaten i kuvösen bara finns vid väg B:s stationer. Trösklarna vaktas mot sql/058 av
  kontraktsgrinden.

## 5. Förväntan, skriven före läsningen

- Lyftet för kandidaten är över 1: kandidatens kalla timmar har oftare is än kalla timmar i allmänhet. Någon nivå förväntas inte,
  eftersom kandidaten aldrig har mötts mot väglag.
- Väglaget bekräftar mindre i söder än i norr: blixthalka mellan rapporterna syns sämre där is är ovanlig.
- Missarna klumpar sig vid nederbörd, inte vid utstrålning.

## 6. Fryst vid signeringen

Koderna (§2), avståndet och fönstren (§3, §4) och måtten (§4). Ändras något efteråt sker det bara genom en daterad post med båda
signaturerna, och aldrig som en lättnad efter sett utfall (regel L).

## 7. Hittills sett

Bara formen, antalen och kodernas fördelning i hela filen (KUVOS-LEVERANSEN §5h), tidszonsprovet (§3) och facitets omfång:
10 256 is-episoder på 721 sträckor och 11 880 snö- och moddepisoder (läsaren på filerna lokalt, 16/10). Ingen station, ingen
kandidattimme och ingen fyrning har ställts mot väglaget.

## 8. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | 2026-10-16 | Bengt i chatten: *"slå ihop 1012 och signera detta för mej och Axel"* (DECISIONS #595) |
| Axel | 2026-10-16 | Via Bengt i samma ord (DECISIONS #595) |

## 9. Ändringar efter signeringen

- **16/10 2026 — identitetsprovet (DECISIONS #597).** Bengt i chatten: *"slå ihop 1015 och ja till identitetsprovet för mej och Axel"*; Axel via Bengt i samma ord.

  §4 krävde att kandidatfilen hade körning 38368369876:s sha256. Första körningen (38939248421) vägrade, eftersom kedjan inte ger
  samma byte på en ny löparavbild (DECISIONS #595). Paren och måtten var desamma till andra decimalen.

  Kravet ersattes av identitetsprovet i §4. **Inget hade lästs mot väglaget**, så ändringen är ingen lättnad efter sett utfall
  (regel L).
