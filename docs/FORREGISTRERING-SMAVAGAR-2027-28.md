# Förregistrering — småvägarna och de kommunala gatorna, för vintern 2027/28

**Status: UTKAST 31/10 2026, inte signerat.** Bengt 31/10: *"Ja, börja"* (kort #367, DECISIONS #764). Bengt och Axel signerar före
28/2 2027, så att valet inför 2027/28 hinner göras före mars (FORREGISTRERING-2026-27 §12 g, fristen `smavagarna-forregistrering`).
Inget utfall är läst för någon av populationerna nedan (§10).

Källorna:
- besluten om småvägarna, DECISIONS #755–#761;
- den nya kandidatens procedur och prövning: FORREGISTRERING-NY-KANDIDAT-2027-28 §1–§4, med ändringen 22/10 om parval och huvudtal;
- grind A:s mått och population: FORREGISTRERING-FLER-VINTRAR §2–§4 och `publish/grind-a.ts`;
- den ärliga osäkerheten och domens tre utfall: FORREGISTRERING-2026-27 §4b punkt 12;
- facit ur väglaget: FORREGISTRERING-FACIT-TRV-2024-25 §2 och §4;
- populationerna: `data/vagdata/stationer.json`, `data/vagdata/vaglagspunkter.json`, `kuvos/kandidatstationer-2026-27.json` och
  `data/vagdata/smavagspunkter-urval.json`.

## 1. Frågorna

1. **Huvudfrågan, P1:** håller kandidaten på en *ny plats* ett *nytt år*? Den nya platsen är statliga småvägar utanför de 818
   väglagssträckorna. Svaret avgör om skattningen i kartan byggs för småvägarna (#759).
2. **Fukten, F1 och F2:** hur mycket av halkan kan regelns fukt se utan Trafikverkets *Våt*? Det redovisas och avgör inget.
3. **Gatorna, P3, och storstäderna:** samma prov på de kommunala gatorna. Det redovisas station för station, som underlag för
   förhandlingen med kommunerna (#758, #760), och avgör inget.

**Rösten avgörs inte här.** Röstvarning på småvägar kräver ett facit för varningar där, och det finns inte (#757).

## 2. Populationerna

Räknade 31/10 ur filerna ovan; inga mätvärden är lästa. Fjärrytorna slås ihop med sin station. *Utanför nätet* betyder mer än 2 km
från varje väglagspunkt.

| Population | Stationer | Anmärkning |
| :-- | :-- | :-- |
| **P1**: statliga utanför nätet | 79, varav 77 i grind A (43 norr, 34 söder om 62°) | 5 av de 77 har ingen annan station inom 50 km och saknar därför RÅ (§4) |
| **P2**: låg trafik på nätet | 95 stationer under 1 000 fordon/dygn inom 2 km från nätet; 2 623 väglagspunkter under 1 000 | Laboratoriet för fukten (§6) |
| **P3**: kommunala | 10, alla i grind A (1 norr om 62°) | Bara 1307 finns i leveransen 2018–2024. Alla tio finns 2024/25 |
| **Storstäderna** | inom 15 km från centrum: Stockholm 10 statliga och 1 utan känd väghållare, Göteborg 9 statliga, Malmö 2 statliga och 1 kommunal | Centrum: Stockholm 59,3293 N 18,0686 E, Göteborg 57,7089 N 11,9746 E, Malmö 55,6050 N 13,0038 E |

Stationslistorna skrivs ut av domskriptet ur dessa regler, och de ska stämma med talen ovan innan träningen börjar (§8).

## 3. Kandidaten och prövningen

- **Kandidaten** byggs med den nya kandidatens procedur, oförändrad (NY-KANDIDAT §1): fysiken `lw` med reservens långvåg, rättelsen
  med samma 70 särdrag och blandningen med parvalet i ändringen 22/10. Vädret är MET Nordics analys. Stationernas fasta data kommer
  ur releasen `kuvos-fysik-indata-2024-25`.
- **Sex prov.** Varje prov håller ute en vinter, som NY-KANDIDAT §3, och dessutom **alla stationer i P1, P3 och storstäderna**. De
  stationerna används varken i kalibreringen, i träningen eller i parvalet, inte heller som grannar till varandra i blandningens
  felkorrigering. Varje prov skattar sedan de utelämnade stationerna den vinter som hölls ute. Talen avser alltså *ny plats och nytt år*.
- **Den frysta kandidaten** används inte, eftersom den är tränad på alla 754 stationer.
- **Koden** för att hålla ute stationer byggs efter signeringen, i nya filer under `fysik/`, och prövas först med identitetsprovet
  (§8). De frysta filerna rörs inte.

## 4. Måtten

- **Definitionerna** av A1, A2 och A3 är grind A:s, som FLER-VINTRAR §4.
- **Populationen** är grind A:s, med ett undantag: **kravet på att RÅ finns tas bort för P1 och P3.** Utan undantaget föll de 5
  P1-stationerna utan granne inom 50 km bort, och de är just frågans kärna. Jämförelsen med RÅ görs på de punkter där RÅ finns.
- **Domen är kartans eget påstående: frysklassen** (Bengt 31/10, DECISIONS #766). Kartan visar *fryser / fryser inte / vet inte*, och
  domen prövar just det. A2 avgör inte.
  - **Klassen** räknas på NIVÅ 2+BLANDNING (PB) kring kandidatens frysgräns +1 °C (FORREGISTRERING-2026-27 §4b punkt 11), med
    osäkerhetszonen ±z: *fryser* om PB ≤ 1 − z, *fryser inte* om PB > 1 + z, och annars *vet inte*. Vad mätningen säger, rätt
    klass och farliga fel definieras som K-A i TROSKLAR-FRYSKLASSNINGEN §4.
  - **Zonen väljs i träningen, aldrig på P1.** I varje prov är z den smalaste zonen i rutnätet 0, 0,25, 0,5 … 3,0 °C där de farliga
    felen är högst 1 % på träningsstationernas ärliga skattningar. Det är skattningar av modeller som varken sett den vintern eller
    den utelämnade, som parvalet i NY-KANDIDAT (ändringen 22/10). Zonen prövas sedan oförändrad på P1. Klarar ingen zon i rutnätet
    1 % i träningen, FALLER provet utan att P1 läses.
  - **Kraven på P1:** farliga fel ≤ 1 % (K-A2, oförändrat och inte förhandlingsbart), rätt klass ≥ 95 % bland de klassade punkterna
    (K-A1) och **täckning ≥ 50 %** (K-A3 är 70 % på huvudvägarna). Underlaget ska vara som K-A4: minst 500 punkter över minst 20
    stationer, och minst 100 punkter med uppmätt frys.
  - **Räkningen:** för varje utelämnad vinter tas **stationernas medel**, där varje station väger lika (#756) och räknas med om den har
    minst 100 halvtimmar i populationen den vintern. Måtten är sedan det **enkla medlet över de sex vintrarna**, som i NY-KANDIDAT
    (ändringen 22/10).
- **Den ärliga osäkerheten** följer FORREGISTRERING-2026-27 §4b punkt 12: omdragning av hela stationer och hela UTC-dygn, B = 2000,
  ensidig 95 %. Fröet skrivs i domskriptet innan något läses. Den läses för farliga fel (övre gräns) och rätt klass (undre gräns).
- **Domen:**
  - **KLARAR** om alla tre kraven klaras av punkttalen, och omdragningens övre gräns för farliga fel ligger under 1 % och den undre
    gränsen för rätt klass över 95 %;
  - **OAVGJORT** om punkttalen klarar men någon av gränserna inte gör det;
  - **FALLER** annars.
- **Bredvid**, utan att avgöra:
  - A2, som FLER-VINTRAR §4, och dess tidigare tak 5 % (utkastet 31/10, #764); A1 och A3;
  - zonen z och täckningen i varje prov;
  - RÅ och ΔA2 mot RÅ, där RÅ finns;
  - norr och söder om 62°, och per band;
  - de 58 stationerna under 1 000 fordon/dygn för sig, och de 5 utan granne för sig;
  - frysflaggan utan zon mot K-A (FORREGISTRERING-2026-27 §4b punkt 11);
  - måtten viktade efter småvägarnas fördelning: P1-punkterna i urvalet ger andelen per band och norr/söder, och stationerna vägs
    om till den fördelningen. Vikterna räknas ur urvalsfilen före läsningen.
- Alla tal skrivs ut, också de som talar emot.

## 5. Följden av domen

- **KLARAR:** skattningen i kartan på småvägarna får byggas för 2027/28 (#759), på ett eget kort. Den visar *fryser / fryser inte /
  vet inte* med zonen ur provet och säger aldrig mer än skattningen bär.
- **OAVGJORT eller FALLER:** ingen karta på småvägarna 2027/28. Frågan prövas igen med fler vintrar eller med en ny kandidat, i en ny
  förregistrering.
- **Rösten** avgörs inte här (#757).

## 6. Fukten, vintern 2024/25

Fukten redovisas och avgör inget. Den ska visa om en fuktkandidat utan väglag behövs, och i så fall blir den en egen
förregistrering (#756).

- **F1, täckningen.**
  - *Frosttimmar* är station-timmar med mätt yta ≤ 0 °C och yta ≤ daggpunkt, efter vakterna, vid alla stationer i grind A.
  - Redovisas: andelen frosttimmar där regelns fukt (FORREGISTRERING-2026-27 §3) hade varit uppfylld, (i) med *Våt* på stationens
    sträcka eller radar ≥ 0,1 mm/h de senaste 60 minuterna, och (ii) med bara radarn.
  - Samma andel redovisas också för alla timmar med yta ≤ 0 °C, som jämförelse.
- **F2, laboratoriet P2.**
  - Regeln räknas vid väglagspunkterna under 1 000 fordon/dygn, med och utan *Våt*.
  - Facit är väglaget, med måtten i FACIT-TRV-2024-25 §2 och §4: bekräftelse inom [t − 1 h, t + 2 h], basnivån B och lyftet. Väglaget
    får bekräfta men aldrig fälla.
  - Redovisas: antalet varnande timmar, andelen bekräftade och lyftet, med och utan *Våt*, och norr och söder.

## 7. Gatorna och storstäderna

- **P3** prövas i samma sex prov. Gatustationerna finns bara 2024/25 i arkivet (utom 1307), så i praktiken avgör provet där 2024/25
  hålls ute.
- **Vintern 2026/27** ur kandidatens logg redovisas för sig och märks *i urvalet*: den levande kandidaten är tränad på stationerna.
- **Måtten** per station är A1, A2, A3, n och **medelfelet** (skattat − mätt), som mått på stadsvärmen. Trafikmängden får det värde
  vägdatan har; saknas den i releasen räknas den som saknad, som rättelsen gör.
- **Storstadsredovisningen** visar varje stad i tre kolumner: alla stationer i staden, bara statliga och bara kommunala. Den visar
  också varje station för sig, med A1, A2, medelfelet och n.
- **Berättelsen mot en kommun** (#760) bygger på de här talen. Inget lovas utöver dem.

## 8. Prov före läsningen

Inget utfall läses förrän proven är klarade:
- **(a) Identitetsprovet** på 2024/25 i den nya kedjan, med samma toleranser som FLER-VINTRAR §3 a, *innan* stationer hålls ute.
- **(b) Tidszonsprovet** för varje vinter, som NY-KANDIDAT §4. Det är redan klarat i kedjan.
- **(c) Populationsprovet.** Listorna i §2 skrivs ut och stämmer.
- **(d) Läckageprovet.** Ingen utelämnad station förekommer i någon tränings-, parvals- eller grannfil i något prov.

Faller ett prov stannar läsningen, och felet söks innan något annat körs.

## 9. Förväntan, skriven före läsningen

- **P1, domen:** osäker. Zonen väntas bli ±1,5 °C eller bredare och täckningen 50–70 %. Det är räknat ur offsetmodellens K-A-dom
  (#743: farliga fel 1,3 % vid ±1,0 °C och 80 % täckning), en annan modell på andra stationer, och inte mätt. Om domen klarar avgörs
  av de farliga felen.
- **P1, A2 bredvid:** omkring 5,7 % (#758), räknat ur #702:s regionmedel efter norr och söder och inte mätt.
- **Norr och söder:** norr är sämre än söder.
- **RÅ:** NIVÅ 2+BLANDNING har lägre A2 än RÅ där RÅ finns.
- **F1:** radarn ensam ser en minoritet av frosttimmarna.
- **F2:** utan *Våt* faller antalet varnande timmar till ungefär en åttondel, som nationellt (#607), och lyftet sjunker.
- **P3:** skattningen ligger för kallt vid gatustationerna, alltså ett negativt medelfel.

## 10. Hittills sett

- Populationernas antal och lägen (§2) och urvalets spann (#761): terrängen ligger inom stationernas spann, och trafikmängden saknas på
  gatorna.
- De nationella fukttalen 2024/25 (#607): 88 / 9 / 3 % och 34,5 % bekräftade för bara radarn. Delmängden P2 är inte läst.
- Sexvintersprovets regionmedel för alla stationer tillsammans (#702).

Inga tal för P1, P2, P3 eller storstäderna som egen population är lästa, och ingen station är prövad utanför träningen.

## 11. Valen före signeringen

**Avgjorda 31/10** (Bengt: *"jag tar de 4 valen på din rekommendation"*, DECISIONS #765):
- **(a)** Kravet på att RÅ finns tas bort för P1 och P3 (§4).
- **(b)** Storstäderna avgränsas med 15 km från centrum (§2).
- **(c)** Minst 100 halvtimmar per station och vinter (§4).
- **(d)** Storstädernas statliga stationer hålls utanför träningen (§3).

**Domen avgjord 31/10** (Bengt: *"50 %, zon ur träningen"*, DECISIONS #766): frysklassen med *vet inte* i stället för A2 ≤ 5 %, med
farliga fel ≤ 1 %, rätt klass ≥ 95 % och täckning ≥ 50 %, och osäkerhetszonen vald i träningen (§4). Skälet är vad kartan påstår:
säkerhetskravet är detsamma som på huvudvägarna, och friheten ligger bara i hur ofta kartan säger *vet inte*. Inget utfall för P1 var
läst, och valet grundas inte på förväntan i §9 (regel L3).

## 12. Fryst vid signeringen

Det som fryses är populationerna (§2), kandidaten och prövningen (§3), måtten och domen (§4), följden (§5), fukten (§6), gatorna (§7)
och proven (§8). Ändras något efteråt sker det bara genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett
utfall (regel L).

## 13. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
