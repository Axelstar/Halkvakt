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
