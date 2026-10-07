# Prognoslagret 6/10 2026 — vad som kan avhjälpa mätfelet: allt på bordet

*Skriven 6/10 2026 kväll av Claude på Bengts fråga (*"finns det något jag förbisett när det gäller prognoslagret? vad skulle kunna avhjälpa
mätfelet som uppstår. Kom med allt du har nu"*). Underlag: vägpunktsgrinden (#399, #405–#408), kuvösens riktningsprov (#467), de tre
läsningarna (#469), granskningen (§6) och koden (`engine/src/segment.ts`, `publish/grind-a.ts`, `scripts/hojd-prov.ts`). Inget är mätt här;
varje väg har sin mätning angiven. Kort #298.*

## 0. Läget i en mening
Inom 7 km från en station håller prognosen (2,5 % grova fel i Sverige, 2,3 % i Finland); bortom faller den (7–13 %), och felet växer mot
våren i alla band (förvintern 3,4 %, midvintern 5,4 %, vårvintern 7,1 % för grind A på 60 dygn). Stationens inlärda offset bär hela
skillnaden mellan att klara och att falla — och en vägpunkt har ingen offset.

## 1. Vad felet består av
Tre delar, i den ordning de väger:
1. **Platsens särart** (konstant del): himmelsfaktor, skugga, vattennärhet, massa, trafik, höjdläge. Offsetmodellen lär den ur historik —
   rå viktning 7,5 % mot offset 3,4 % på samma punkter. Det är den största delen och den som saknas för vägpunkten.
2. **Regimen** (multiplikator): klara stilla nätter och soliga vårdagar gör särarten stor; mulet och blåsigt gör den liten. En konstant
   offset ser inte det. Beviset är att felet växer mot våren i *alla* band, också 0–7 km (2,0 → 5,3 %).
3. **Avståndet**: anomalierna avklingar på 10–20 km. Därför håller 0–7 km och faller > 20 km, i båda länderna.

## 2. Vägarna — allt, med mätning, kostnad och gräns

### A. Mät osäkerheten och tig (billigast; kan mätas i kuvösen i veckan)
1. **Ankarspridningen som grind.** När de fem ankarna är oense (stor spridning i deras ytor, eller i deras inbördes offset) är punkten
   osäker; då tiger lagret ("okänd") i stället för att gissa. *Mätning:* A2 per spridningsband i kuvösen och i skuggan; välj inget, läs
   kurvan. *Varför det hjälper:* spridningen är en direkt mätning av regimen just nu, utan molndata. *Gräns:* kostar täckning. **Inte i
   repot förut.**
2. **Natt och säsong.** Lagret talar bara när solen är under horisonten (solhöjd < −6°, som regimgrinden) och, om vårläsningen håller,
   inte i februari–mars dagtid. *Mätning:* A2 per solhöjdsband och månad i kuvösen (grind A:s punkter finns). *Gräns:* täckning dagtid;
   men halkan är en nattfråga.
3. **Avståndsgränsen 7 km, formaliserad.** Visa och förstärk inom 7 km (hälften av huvudvägnätet), tig bortom. Redan slutsatsen 30/9 —
   men inte skriven som regel i TROSKLAR-SKUGGAN. *Mätning:* gjord (#406, #407).

### B. Bättre modell ur samma data (kuvösen kan mäta; inga nya källor)
4. **Regimstyrd offset.** Lär två (eller tre) offset per stationspar: klar/stilla natt, mulet/blåsigt, dag. Molnmängd finns i kuvösen
   (`kuvos_ra.smhi_obs`, parameter 16) och vinden vid stationerna. *Mätning:* grind A:s mått med regimdelad offset mot odelad, i kuvösen.
   *Varför:* del 2 i §1. *Gräns:* i driften saknas molnmängd (#408, §4.2 h) — regimen måste då läsas ur ankarspridningen (väg 1) eller
   MESAN (väg 11).
5. **Offset per månad och timme.** Särarten varierar med solen: en offset per (månad, timband) i stället för en konstant. *Mätning:*
   grind A i kuvösen, vinnaren måste hålla i båda halvorna (annars är det överanpassning). *Gräns:* 48 parametrar per par — bara där
   historiken räcker.
6. **Residualkorrektion i realtid.** Vid varje steg vet vi hur mycket modellen just nu missar vid varje station (leave-one-out-residualen).
   Den residualen är rumsligt korrelerad: missar modellen Ljungby med −2 °C i kväll missar den sannolikt vägen vid Ljungby lika. Lägg
   grannarnas residual (avståndsviktad) till vägpunktens skattning. Det är kriging-light. *Mätning:* kuvösen, A2 med och utan. *Gräns:*
   hjälper nära stationer, inte bortom 20 km. **Inte i repot förut.**
7. **Kriging/gaussisk process i stället för 1/km.** Ger varje punkt en egen varians — alltså väg 1 inbyggd — och lär avklingningslängden ur
   data i stället för att anta 1/km. *Mätning:* kuvösen, A2 och täckning vid given varians. *Gräns:* mer kod; måste hållas platt och ärlig
   (inga hyperparametrar valda på domdata).

### C. Platsens fingeravtryck utan kartering (facit finns redan: stationernas offset)
8. **Kovariatmodellen tränad på stationerna.** De 736 stationernas inlärda offset är ett facit för *"vad gör en plats kall?"*. Träna
   offset ≈ f(höjd, himmelsfaktor ur Lantmäteriets höjdmodell, skog ur NMD, vattennärhet, vägklass/ÅDT ur NVDB, bro) och validera
   leave-one-out över stationerna. Förklarar den en rimlig del av offsetens varians förs den över till vägpunkterna. *Mätning:* kuvösen
   (offset finns) + statiska lager; A2 för RÅ+KOVARIAT som ny kandidat (egen DECISIONS-post, D1). *Varför:* det är steget FÖRE termisk
   kartering som inte kräver någon ny mätning — kartan 30/9 sade "kan bygga men inte validera", men stationerna validerar. *Gräns:*
   stationerna sitter på öppna, saltade huvudvägar; skogsvägar och broar är underrepresenterade. **Delvis i repot (KOVARIAT, #271) — men
   inte att stationerna är facit.**

### D. Ny data
9. **Termisk kartering** (kort #271): IR-vägytetermometer med GPS, 3–5 klara nätter per vinter på testförarnas rutter. Ger offseten per
   50 m och facit mellan stationerna. Det enda som mäter just det vi prognostiserar där vi inte mäter. Nyckel: ert ja, utrustning, pengar.
10. **Trafikverkets egen vägväderprognos.** Trafikverket köper en prognos för varje VViS-station (energibalansmodell med platsparametrar).
    Finns den som öppen data eller för utvärdering är frågan löst utan att vi modellerar. *Åtgärd:* en fråga i brevet till Micke (§5d).
    **Inte ställd förut.**
11. **MESAN/MEPS-fält** (moln, strålning, vind) på 2,5 km: regimen vid varje vägpunkt (väg 4 i drift) och trenden framåt (frysflaggans
    försprång). Öppna data, CC BY 4.0, ingen ny tabell om de läses vid körning som moln.ts. *Gräns:* lufttemperaturen i MESAN är inte
    vägytans (#119 visade att SMHI:s luftstationer som ankare stjälper).
12. **Fordonsdata** (Digital Vinter): stängd; samrådet står i kort #265.
13. **Finlands 108 stationer inom 7 km** som träningsdata för fysiken (väg 4–8) där Sverige har 15 — stöd, inte dom (#436).

### E. Produkten
14. **Klass och marginal i stället för grader.** Frysklassningen (K2) gav i kuvösen 0,8 % farliga fel med 82 % täckning för offset vid
    marginal 1 °C. För vägpunkter: samma klassning plus väg 1:s spridningsgrind. Föraren får *fryser / fryser inte / vet inte*, aldrig
    en grad. Redan dokumentets riktning (T6, konfidens); kuvösen har mätt priset.
15. **Prognosen som förstärkare, aldrig utlösare** (T6) — redan regel. Inget att ändra; det är därför ett fel på 7 % inte når föraren.

## 3. Vad som är mätt och INTE hjälper
SMHI:s luftstationer som ankare (sämre, #119) · ANOM, luft ur många grannar (14,5 %, #405) · fast lapse/höjd (sämre på vintern, 0,18 mot
0,63 °C/100 m, #467) · regim ur vind och natt utan moln (#408) · fler rutter (ändrar inget för stationsreglerna, #426) · interpolerad
offset (9–10 %, #399).

## 4. Rekommendation och vad som kan ha förbisetts
Fyra läsningar i kuvösen, förregistrerade, inga trösklar: **1 ankarspridningen**, **2 natt/säsong**, **4 regimstyrd offset** och **8
kovariatmodellen på stationernas offset**. De svarar på om lagret kan *tiga rätt* (1, 2) och om särarten kan *läras utan historik* (4, 8).
Därefter 9 och 10 (era kontakter). Det som sannolikt förbisetts: att osäkerheten går att mäta direkt ur ankarnas oenighet (1), att
stationernas offset är ett facit för en platsmodell (8) så att kovariatspåret inte väntar på karteringen, och att Trafikverket kan ha
prognosen redan (10).

## 5. Utfallet av 1, 2, 4 och 8 (Bengts val *a*, DECISIONS #471; körning 37530898977, 6/10 21:20Z)

**1 — ankarspridningen skiljer.** Spridning 0,5–2 °C (59 % av punkterna): OFFSET 1,8 % grova fel; 0–2 °C (66 %): 2,4 %; över 4 °C: 28 %.
Lagret kan tiga rätt utan molndata, om grinden kräver minst två ankare (ett enda ankare ger spridning 0 och 7,6 %).
| Spridning (°C) | OFFSET: täckning · A2 · MAE | RÅ: täckning · A2 · MAE |
| :-- | :-- | :-- |
| 0–0,5 (inkl. ett enda ankare: 89 232 resp. 92 739 punkter) | 6,7 % · 7,6 % · 0,50 | 4,9 % · 11,5 % · 0,61 |
| 0,5–1 | 19,9 % · **1,1 %** · 0,41 | 13,3 % · **1,8 %** · 0,43 |
| 1–2 | 39,5 % · **2,2 %** · 0,52 | 36,1 % · **2,8 %** · 0,55 |
| 2–4 | 27,1 % · 7,4 % · 0,77 | 34,8 % · 7,8 % · 0,78 |
| > 4 | 6,8 % · **28,4 %** · 1,81 | 10,8 % · **27,3 %** · 1,62 |

**2 — vårens fel sitter i dagsljuset.** Natt < 5 % varje månad utom januari (5,7 %), mars bäst (3,1 %); dag 11,1 % i februari och 17,9 % i mars.
Nattbegränsat: 4,2 % på 63 % av punkterna.
| Solhöjd | okt | nov | dec | jan | feb | mar | alla (n · MAE · A2) |
| :-- | --: | --: | --: | --: | --: | --: | :-- |
| natt (< −6°) | 4,2 % | 3,7 % | 4,0 % | 5,7 % | 3,7 % | **3,1 %** | 2 742 593 · 0,52 °C · **4,2 %** |
| skymning (−6…0°) | — | 4,1 % | 4,5 % | 6,7 % | 4,6 % | 5,8 % | 379 660 · 0,55 · 5,2 % |
| dag (> 0°) | — | 5,3 % | 2,3 % | 4,1 % | **11,1 %** | **17,9 %** | 1 230 953 · 0,76 · 8,6 % |

**4 — regimstyrd offset hjälper lite, där fysiken sade.** Klar stilla natt 6,6 → 5,1 %, dagen 0, totalt 5,5 → 5,2 %. Molnmängd i drift köper
0,3 procentenheter.
| Klass | täckning | OFFSET-REGIM: MAE · A2 | OFFSET: MAE · A2 |
| :-- | --: | :-- | :-- |
| klar stilla natt | 15,4 % | 0,61 · **5,1 %** | 0,64 · **6,6 %** |
| natt övrigt | 38,7 % | 0,44 · 2,5 % | 0,48 · 2,6 % |
| dag | 37,0 % | 0,75 · 7,9 % | 0,71 · 7,8 % |
| okänd (moln eller vind saknas) | 8,8 % | 0,60 · 6,3 % | 0,62 · 6,9 % |
| **alla** | 100 % | 0,59 · **5,2 %** (band 3,4 · 3,4 · 5,2 · 9,9 %) | 0,60 · **5,5 %** (3,6 · 3,7 · 5,4 · 10,3 %) |

**8 — de grova kovariaterna förklarar inget.** R² 0,010 på 722 stationer; höjd, relief, kust, läge och täthet bär inte särarten (sd 0,55 °C).
Särarten är mikroskala; metoden står, kovariaterna måste bli de rätta (himmelsfaktor ur laserdata, skog, trafik) eller karteringen (#271).
| Kandidat (samma 4 312 216 punkter) | MAE | A2 | per band 0–7 · 7–15 · 15–20 · > 20 km |
| :-- | --: | --: | :-- |
| RÅ+KOVARIAT | 0,68 °C | 7,3 % | 5,2 · 4,9 · 7,0 · 13,5 % |
| RÅ | 0,67 | 7,4 % | 5,2 · 5,1 · 7,1 · 13,6 % |
| OFFSET (taket) | 0,59 | 5,5 % | 3,6 · 3,6 · 5,4 · 10,3 % |

**Följd:** två förslag till TROSKLAR-SKUGGAN för Bengt och Axel (kort #299): spridningsgrinden (minst två ankare, X ur tabellen) och
nattbegränsningen. Molnmängd i drift kan strykas för prognosens del. Kovariatspåret är ingen genväg utan riktiga kovariater.
