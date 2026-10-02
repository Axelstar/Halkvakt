# Prognoslagret 30/9 2026 — omkörningen, premissmätningarna, slutsatser och väg framåt

*Skriven 30/9 2026 av Claude på Bengts begäran (*"gör en sammanfattning med slutsatser och väg framåt på allt vi talat om … och
spara så att vi inte tappar det"*). Täcker natten 29–30/9 från ordern *"gör en omkörning av den test som gjordes den 28/9"* till
frågan om termisk kartering och fordonsdata i Skyltfondsansökan. Allt nedan är MÄTNING: inga trösklar rördes, inget rör driften,
vägpunktsgrindens dom står. Beslut: DECISIONS #399 (bakgrund), #405, #406, #407, #408. Kort: #269 (klart), #270 och #271 (öppna),
#233 och #265 (berörda). Bengts öppna val a–h står i bedömningen §4.2.*

## 1. Vad som gjordes

| Steg | Körning | Vad | Beslut |
|---|---|---|---|
| Omkörning av 28/9-provet | 36664018960 (main, 60 dygn) | Vägpunktsgrinden som den står | — |
| Analys av matematiken | chatten, sammanfattad i #405 | fyra trubbiga premisser, ett modellfel | #405 |
| Premissmätning 1 | 36666151860 | ärliga rader efter 25/9, vägviktat, blockbootstrap, frysflaggan som mått, kandidat ANOM, golvet | #405 |
| Premissmätning 2 | 36668940287 (36668773820 föll på SQL-typ) | band efter närmaste station, läsning per band, tre täckningar | #406 |
| Finska stationerna | 36670176981 | samma mätning på `fi.weather_observations` | #407 |
| Regimgrinden | 36671071146 (SE), 36671072792 (FI) | samma mått per regim: stilla natt, blåsigt, övrigt | #408 |

Skriptet: `scripts/matningar/vagpunkt-premisser-2026-09-30.ts`, knappen `hojd-prov` med `dagar: premisser` respektive `premisser-fi`.
Självtest med känd sanning för varje ny del. Kandidater och mått registrerades i DECISIONS innan varje körning; kandidatlistan är
stängd (RÅ, RÅ+HÖJD, ANOM; OFFSET som taket).

## 2. Talen

**Omkörningen 30/9 mot 28/9** (60 dygn, oviktat): rå 7,9 % ± 0,4 grova fel mot 6,9 %; interp 10,3 % mot 9,7 %; rå+höjd 7,9 % mot
7,1 %. FALLEN som 28/9, bredare: två dygn till med varma grannrader. Populationsläsningen bekräftade #399: före 25/9 lika under
båda arkivreglerna (4,2 mot 3,9 %), efter 25/9 rå 11,6 % med varma rader och 4,2 % utan.

**Premissmätningarna på ärliga rader** (Sverige, mål efter 25/9, 9 415 punkter, 236 stationer):

| Kandidat | 0–7 km (15 st) | 7–15 km (57 st) | 15–20 km (54 st) | >20 km (110 st) | Vägviktat A · B |
|---|---|---|---|---|---|
| RÅ | under spärren, 2,5 % | 12,7 % faller | 10,9 % faller | 12,4 % faller | 7,2 · 7,5 % faller |
| RÅ+HÖJD | under spärren, 1,6 % | 8,5 % [4,7–12,7] oavgjort | 7,8 % oavgjort | 12,9 % faller | 5,1 · 5,3 % oavgjort |
| ANOM | under spärren, 9,2 % | 21,6 % faller | 22,1 % faller | 13,0 % faller | 14,5 · 15,0 % faller |
| OFFSET (taket) | under spärren, 1,2 % | 5,9 % oavgjort | 4,6 % oavgjort | 4,6 % oavgjort | 3,2 · 3,4 % klarar |

Täckning: A skuggrutterna 52,6 / 33,9 / 6,8 / 6,8 %; B huvudvägnätet (818 väglagssegment) 49,8 / 37,6 / 7,3 / 5,2 %; C trafikarbetet
inte mätt (ÅDT saknas). Grindens bandregel flyttade 2,6 % av punkterna. Golvet: inga svenska stationspar inom 3 km; inom 5 km sex par,
15 % — för få.

**Finland** (427 stationer, 5 402 kalla mål, mild censur: 89,5 % varma hinkar):

| Kandidat | 0–7 km (108 st) | 7–15 km (58) | 15–20 km (65) | >20 km (118) | Alla |
|---|---|---|---|---|---|
| RÅ | 0,60 °C · 2,3 % [1,1–3,5] klarar | 3,8 % oavgjort | 4,5 % oavgjort | 3,9 % oavgjort | 3,7 % klarar |
| RÅ+HÖJD | 2,5 % klarar | 3,8 % oavgjort | 4,2 % oavgjort | 5,1 % oavgjort | 4,2 % oavgjort |
| ANOM | 2,5 % klarar | 4,9 % oavgjort | 6,7 % oavgjort | 9,0 % faller | 6,6 % faller |
| OFFSET (taket) | 0,6 % klarar | 5,0 % oavgjort | 3,5 % klarar | 2,7 % klarar | 2,7 % klarar |

Golvet i Finland: inom 3 km 40 par, 3,9 %; inom 5 km 78 par, 5,7 %. Frysflaggan vid 1 °C inom 7 km: rå missar 57 % [41–75],
6 % med en grads marginal; falska 36 %.

**Regimgrinden** (medelvind och natt, molnmängd saknas): Sverige rå 12,5 % stilla natt, 9,2 % övrigt — faller i båda; Finland
rå 3,1 % stilla natt (klarar), 5,9 % övrigt. Blåsigt nästan tomt (133 respektive 33 punkter).

## 3. Slutsatser

1. **Vägpunktsgrindens dom står, och den är nu välgrundad.** Tre oberoende omtag (omkörning, ärliga rader, per band) ger samma
   svar: rå avståndsviktning håller inte bortom 7 km från närmaste station i svensk terräng. Domen 28/9 var dessutom smickrad av
   det censurerade arkivet — på ärliga rader är rå viktnings medelfel 0,98 °C, inte 0,86.
2. **Bandet 0–7 km håller, i båda länderna, i alla regimer.** Sverige 1,0–2,5 % (15 stationer, under spärren), Finland 2,3 %
   [1,1–3,5] med 108 stationer. Det är hälften av vägpunkterna längs rutterna och hälften av huvudvägnätet.
3. **Bandet 0–7 km går inte att döma med svenska stationer.** 15 stationer har en granne inom 7 km, spärren kräver 20, och fler dygn
   ger inte fler stationer. Det finska nätet ger kraften; överföringen är fysik men terrängen är plattare.
4. **Höjden är den enda platsegenskap som bär.** Den halverar felet inom 7 km i Sverige (0,96 → 0,63 °C) och ger ingenting i
   Finland. Målstationens egen särart är felets största del, och den lär bara offsetmodellen ur historik som en vägpunkt saknar.
5. **Två hypoteser föll, förregistrerade.** ANOM (luft ur många grannar, anomali ur de närmaste) blev sämre än rå i båda länderna.
   Regimen ur vind och natt skiljer inte när terrängen biter. Molnmängd saknas i arkivet, och kalla ytor i september uppstår i
   stilla väder, så blåsigt kan inte läsas förrän vintern.
6. **Det viktigaste fyndet är frysflaggan, inte A2.** Även där temperaturfelet är 0,6 °C missas flaggan vid 1 °C i mer än hälften
   av fallen. Ett fel lika stort som avståndet till gränsen ger ett myntkast vid gränsen. Med en grads marginal sjunker missen
   till 6 %; priset i falska flaggor är inte mätt. Domslutets "risk"-språk är rätt: prognosen får förstärka och visa, aldrig
   avgöra vid gränsen.
7. **Populationsvalet var en mindre spak än befarat.** Skuggrutterna och huvudvägnätet ger nästan samma vikter. Trafikarbetet är
   omätt.
8. **Vad som är riktigt i mätningen:** tre av fyra körningar gav negativa svar, kandidatlistan stängdes före talen, taket är
   märkt som tak, och fröet och populationen stod i DECISIONS innan körningen. Öppna spakar som återstår står i §4.

## 4. Väg framåt

**Ingenting krävs före Skyltfondsansökan.** Den skickas 30/9 med bilden från 28/9; ändringslistans punkt A står. Domen i mars.

**Bengts val, bedömningen §4.2 (a–h):** *Valt 2/10: a, f och g (DECISIONS #435, #436, #437). Öppna: b, c, d, e, h. Läsdatum för (a): tisdag 24/11, en egen körning. (g) mäts i kuvösen med frysklassningens måttstock, inte som en fri mätning vid ≤ 2 °C.*
- (a) Låt premissmätningen gå varje måndag bredvid grinden och läs den på ett i förväg fastställt datum (24/11, sextio ärliga dygn).
  Rekommenderas nu. Kostar en knapptryckning i veckan. Läsdatumet måste stå i beslutsposten, annars blir det en stoppregel.
- (b) Precisera vägpunktsgrinden till ärliga rader och dom per band med RÅ+HÖJD som kandidat — en precisering enligt
  TROSKLAR-SKUGGAN §5, ingen lättnad. Rekommenderas först när intervallet inte längre spänner över tröskeln.
- (c) Ingenting utöver skuggan. Möjligt, men då står frågorna d–h obesvarade i mars.
- (d) En egen spärr för bandet 0–7 km, eller annat facit. Det finska utfallet stödjer en egen spärr; beslutet är Bengts.
- (e) ÅDT-uttag ur NVDB (Lastkajen) till `data/adt-provpunkter.json` för täckning C. Kräver Bengts inloggning.
- (f) Räcker det finska utfallet för att döma det svenska närbandet? Rekommendation: som stöd, inte som dom.
- (g) Mät flaggmarginalen (flagga vid ≤ 2 °C) med falsklarmspriset som nästa förregistrerade del. Rekommenderas.
- (h) Molnmängd från SMHI:s luftstationer in i arkivet (ny ingest, lagring och minuter) för en riktig utstrålningsregim i vinter.
  Utan den är regimspåret stängt.

**Facit mellan stationerna (kort #271):** termisk kartering — en kalibrerad infraröd vägytetermometer med positionslogg, tre till
fem klara nätter per vinter på testförarnas rutter. Det enda facit som mäter vägen där ingen station står, och kalibreringen
för platsens offset. Simulering ur höjd, skuggning, trädtäcke, vatten och trafik kan bygga kandidaten (KOVARIAT, egen post) men
inte validera den. Rekommenderas som rad i ansökans AP2 om Axel hinner; annars projektets egna pengar.

**Fordonsdata:** begär ett samråd med Trafikverket om åtkomst för utvärderingsändamål, som en del av testbädden, utan att någon del
av projektet beror av svaret. Text finns i chatten 30/9 och i kort #265.

**Öppna spakar som bör stängas i skriptet före nästa läsning:** andelen provpunkter bortom 50 km i täckning B skrivs nu ut (gjort);
golvet vidgas till 8 km; dag/natt delas från vinden.

**Vad som INTE ska göras:** ingen ny kandidat utan egen DECISIONS-post; ingen justering av ANOM:s tal; ingen tröskel flyttas med
golvet som argument; ingen veckoläsning som dom.

## 5. Kort och beslut

- DECISIONS #399 (fallet 28/9), #405 (förregistrering och utfall 1), #406 (per band, täckningar), #407 (Finland), #408 (regimen).
- Kort #269 KLART (premissmätningarna). Kort #270 ÖPPET: prognoslagrets väg framåt, Bengts val a–h. Kort #271 ÖPPET: termisk
  kartering som facit mellan stationerna. Kort #233 (Före resan) och #265 (Skyltfonden) berörda.
- STATUS.md 30/9, bedömningen "Läget 29/9" (7) och §4.2.
