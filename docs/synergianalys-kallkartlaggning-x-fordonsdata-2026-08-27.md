# Synergianalys — Fullständig källkartläggning × Fordonsdatakartläggning (2026-08-27)

**Status:** analys/underlag i Halkvakt-mappen. Bygger på "Fullständig källkartläggning 2026-08-26" och "Fordonsdata — kartläggning 2026-08-27" i samma mapp. Syfte: bedöma om fordonsdatakartläggningen och källkartläggningen har synergieffekter och om kombinationen tar Halkvakt-projektet ett steg längre.

**Kort svar: Ja.** Synergierna är tydliga, och fordonsdatakartläggningen gör mer än att komplettera — den löser eller omvandlar tre av källkartläggningens svagaste punkter. Kombinationen förändrar projektet kvalitativt: från öppen-data-aggregator till plattform med egen, växande datamängd.

---

## Synergi 1 — Fordonsdatakartläggningen svarar direkt på källkartläggningens största brist

Källkartläggningen konstaterar att den avgörande begränsningen är blindpunkterna mellan de ~750 VViS-stationerna, som måste fyllas med MESAN-modelldata och Nowcast eftersom fordonsfriktionsdata är stängd. MVP:n bygger alltså i blindpunkterna på interpolerade modellvärden, inte faktiska mätningar.

Fordonsdatakartläggningen levererar exakt det som saknas: telefonsensor-crowdsourcing som egen mätdatakälla (hårda inbromsningar, sladdhändelser, hastighetsavvikelser per vägsegment) med nära noll marginalkostnad. Det är inte lika bra som bilens ABS-signal, men det är riktiga observationer där modellen bara gissar — och kan fusioneras som en probabilistisk uppgradering av MESAN-baserade riskestimat, med VViS-väglagskamerorna som visuell verifiering.

**Konsekvens för arkitekturen:** källkartläggningens lager 6 ("Fordonsdata — om/när tillgänglig") får konkret innehåll redan i fas 1, istället för att vänta på avtal som aldrig blir ekonomiskt möjliga för en mikroaktör.

## Synergi 2 — Crowdsourcing uppgraderas från fotnot till strategisk pelare

I källkartläggningen är crowdsourcing en enda rad under "Kompletterande källor": "möjlig framtida differentiator, kräver kritisk massa." Fordonsdatakartläggningen validerar spåret på tre nivåer:

- **Forskningsmässigt:** dokumenterad träffsäkerhet ~84–96 % för vägojämnhet/potthål (Wu et al., Z-DIFF, inkrementell inlärning).
- **Kommersiellt:** Greater Than (Enerfy), Paydrive (via Cambridge Mobile Telematics) och Folksam kör telefonbaserad insamling i skala i Sverige redan idag.
- **Juridiskt:** EDPB-ramverket (Guidelines 01/2020) med samtycke, on-device-förbehandling och anonymisering är känt och hanterbart; kartprodukten hamnar utanför GDPR om aggregeringen görs rätt.

Det förvandlar en lös idé till en byggbar komponent med känd metodik.

## Synergi 3 (den mest eleganta) — Crowdsourcingdatan löser DFRS-frågan

Källkartläggningen lämnade Data for Road Safety som öppen fråga: "oklart om en liten apputvecklare kan gå med utan att bidra med egen data." Fordonsdatakartläggningen ger svaret: den crowdsourcade telefondatan blir Halkvakts reciprocitetsvaluta.

Här sluts en cirkel som ingen av rapporterna sluter ensam: telefonspåret ger inträdesbiljetten till SRTI-ekosystemet, som i sin tur innehåller just kategorin "tillfälligt halt väglag" från riktiga fordon — den datatyp källkartläggningen dömde ut som stängd. Den stängda dörren har en bakdörr, men bara om båda rapporternas rekommendationer genomförs i sekvens.

## Synergi 4 — Volvo som kalibreringskälla

Källkartläggningen kände bara till NIRA/Klimator (B2B, inga publika priser). Fordonsdatakartläggningen hittar Volvos gratis utvecklarnivå (10 000 anrop/dag) och konstaterar att Volvo dominerar svensk flotta (48 961 nyreg. 2025).

Kombinerat: rå Volvo-data (utomhustemperatur, torkarstatus, rå ABS-händelse via dataaktens artikel 5) från ett litet antal samtyckande användare kan kalibrera och validera telefonsensordatan mot bilens riktiga signaler — utan att behöva det beräknade friktionsvärde som sannolikt är juridiskt undantaget som derived data. Det gör telefonspårets svagaste punkt (halka specifikt, till skillnad från ojämnhet) mätbart bättre.

## Tar kombinationen projektet ett steg längre? Ja — kvalitativt, inte bara kvantitativt

Källkartläggningen ensam beskriver en app som aggregerar öppen data. Differentieringen den identifierar ("ingen annan använder VViS-data för röstburna halkvarningar") är verklig men skör — vem som helst kan kopiera en öppen-data-aggregator på en säsong.

Fordonsdatakartläggningen tillför det källkartläggningen saknar: en väg till en egen, växande, proprietär datamängd. Tillsammans beskriver de en trappa där varje steg förutsätter det föregående, och inget av dokumenten beskriver hela trappan ensamt:

1. **MVP på öppen data vintern 2026/2027** (VViS + SMHI + MET Norge) — lockbetet som ger användare.
2. **Telefonsensorinsamling inbyggd från dag ett** — användarna ger sensordata medan de använder appen.
3. **Volvo-gratisnivån som kalibrering** av sensordatan mot bilens riktiga signaler.
4. **DFRS-medlemskap** med egen crowdsourcad data som reciprocitetsvaluta → tillgång till SRTI-halkdata från riktiga fordon.
5. **Position inför Trafikverkets 2027-upphandling** som analys-/tjänsteleverantör ovanpå datan, inte som dataköpare.

## Två ärliga förbehåll för kombinationen

- **Kallstartsproblemet:** sensordatan blir värdefull först vid ~1 000 aktiva användare med geografisk spridning. MVP:ns öppna-data-värde måste bära appen ensamt första säsongen. Det stärker snarare än ändrar källkartläggningens fas 1-plan — men det betyder att GDPR-designen (granulär samtyckesdialog, DPIA, anonymisering/aggregering) måste in i MVP:n från start, vilket är extra arbete vintern 2026/2027.
- **Den finaste signalen förblir stängd:** det beräknade friktionsvärdet (Volvo Connected Safety/NIRA-algoritm) är sannolikt undantaget dataaktens delningsplikt som derived data — tolkningen är oprövad men styrkt av Volvos egen beskrivning. Kombinationen ger alltså inte tillgång till Trafikverkets 300 miljoner mätpunkter, utan ett eget, grövre men ägt substitut.

## Rekommenderade ändringar i projektplanen

1. Flytta telefonsensor-insamlingen från "möjlig framtida differentiator" (källkartläggningens §5) till fas 1, parallellt med MVP-bygget, med GDPR-design från dag ett.
2. Lägg till Volvo-utvecklarkonto (gratisnivån) och prototypkonton hos NIRA/High Mobility/Caruso som fas 1-punkter (kostnad noll).
3. Lägg till DFRS-kontakt (info@dataforroadsafety.eu) som fas 2-punkt, med den crowdsourcade datan som uttalad förhandlingstillgång.
4. Behåll bevakningen av Trafikverkets 2027-upphandling, men med ny positionering: analysleverantör ovanpå datan snarare än dataköpare.

---

*Arbetsnot: Denna analys är en syntes av de två underlagsrapporterna och tillför inga nya källor. Alla sakuppgifter är spårbara till respektive rapport (källor lästa augusti 2026).*
