# Granskning av Skyltfondsansökan V2 (Axel 29/9) — vad som saknas, vad som är känsligt, vision och spridning

*Claude 29/9 2026 på Bengts fråga: "peka på om du tycker det saknas något. Avslöjar vi affärshemligheter här. Borde det finnas ett
avsnitt om visionen för Halkvakt och något om marknadsföringsåtgärder." Underlag: Axels åtta dokument i Drive-mappen *Ansökan V2
(Claude 29/9)* lästa i sin helhet, fondens formulär (fält 7 heter "Innovationsgrad. Kopplingar till andra projekt. Efter projektet:
användning och spridning"), fondens regel att inkomna handlingar är offentliga men att delar kan läggas i separat bilaga för
sekretessprövning, och repots material: `docs/REKRYTERING.md`, `marknadsforing/butik/butikstext.md`, `docs/FINANSIERING.md`.*

## 1. Svaret i tre meningar

**Saknas:** en vision och en plan för hur appen når förarna. Ansökan förutsätter "några hundra aktiva förare" på tre ställen men
rekryterar 40–70 och säger inte hur resten nås. **Affärshemligheter:** nej, inget i dokumenten är en hemlighet värd att skydda;
det som vore det (skolpaketet, intäktsmodellen, premiumtanken) står inte där och ska inte in. Det som bör tas bort är internt brus i
bilaga 7 och personuppgifterna som följer av att söka som privatperson. **Vision och spridning:** ja till båda, korta, på de platser
formuläret redan har för dem: "Efter projektet" (fält 7) och AP3/AP5.

## 2. Måste rättas före sändning

| # | Var | Fel | Rättelse |
| :-- | :-- | :-- | :-- |
| 1 | Bilaga 1 Syfte, Kunskapsläge; bilaga 7 | Prognoslagret beskrivs som i september: grind A 0,71 °C och 3,8 %, vägpunkten "lika bra" (0,72 mot 0,71) | Måndagens körning 28/9 (DECISIONS #399): grind A 0,74 °C och 3,7 % håller; skattningen mellan stationerna **föll** med 6,9 % grova fel. Stycket finns färdigt i 283/343-texterna (Syfte, sjätte stycket, och Eget arbete, punkten "Det enklare prövades, och föll där det saknar historik"). Ansökan får inte bära en uppgift vi vet är ersatt. |
| 2 | Bilaga 7 | Internt brus i ett dokument som blir offentligt: beslutsnummer (#43 … #380), kortnummer, filnamn (`publish/grind-s-b.ts`, `sql/…`), chattcitat ("kör, relayerat av Bengt i chatten"), "⚠️ Axel ska se det här stycket", "Bengt läser skuggloggen i söndagsrutinen", inaktuella noter ("~mitten av oktober", "innan skuggbygget startar i november", "Axels fastställande väntar") | Behåll §1–§5 som ren måttstock: vad som döms, vad som är facit, trösklarna med datum, domslutet, ändringsreglerna. Stryk allt som är arbetsanteckning. Läsanvisningen kan säga att fullständiga versioner med versionshistorik lämnas på begäran. |
| 3 | Bilaga 1 AP1 mot bilaga 7 §6 | Vem klassar kamerabilderna: "utomstående på uppdrag, 15 000 kr" mot "Claude klassar dem blint … Axel fäller domen" | Ett svar. Rimligast: utomstående klassar det stickprov domen vilar på; projektets egen blindklassning är förarbete. Skriv samma sak på båda ställena. |
| 4 | Bilaga 8 | Avsändare "Lagerlöf Labs (Halkvakt)", ett firmanamn som inte finns någon annanstans, i en ansökan från en privatperson | Antingen "Bengt Lagerlöf, Halkvakt" i försättstexten med en rad om att anmälningarna sändes under det namnet, eller behåll ordagrant men förklara i försättstexten. |
| 5 | Bilaga 1 Risker; bilaga 2 | "Rekryteringen siktar på 40–70 förare för att 60 ska fullfölja" | Talen går inte ihop. Antingen 60–80 rekryterade med 60 fullföljande, eller 40–70 med 50 fullföljande och 50 presentkort. |
| 6 | Bilaga 1 Kostnadsplan, kommentar | "AP2:s medel avser … driftsättning mot användare från januari 2027" mot AP2-texten "inför vintern 2027/28 bara om trösklarna klaras" | "från januari 2027" → "under projektet, inför vintern 2027/28". |
| 7 | Formuläret sida 1 | Som privatperson blir personnummer och bankkonto en del av en offentlig handling | Väljs privatperson: begär sekretessprövning för de två fälten i mejlet (fondens egen anvisning). Väljs föreningen faller frågan. |
| 8 | Bilaga 1 Personalplan, Kostnadsplan; Dokument 0 | "[fyll i]" (Bengts bakgrund), "[X] timmar, [Y] kr", intygets datum och namn | Bengts halvtimme enligt Axels mejl. Bilaga 6 (PDF) ska in i mappen; tre bilagor hänvisar till den. |
| 9 | Bilaga 1 | Påståenden utan källa: "Ingen har mätt hur väl VViS-data fungerar som varningskälla", "Ingen bil på marknaden sänker farten", "Volvo Cars delar halkdata sedan 2016", "tio halkdagar per vinter", "mindre salt på vägarna och färre köer" | Reservera ("såvitt vi funnit") eller ge källa i bilaga 4. Beredningsgruppen är Trafikverket, Polisen och SKR; de känner området. |
| 10 | Bilaga 1 Metod | "skärpningar den 12 och den 23 september" mot bilaga 7:s ändringar 24/9 och 26/9 | Skriv "september" eller räkna upp alla fyra. |

## 3. Vad som saknas, i fallande vikt

**a. Vart Halkvakt är på väg.** Ingen rubrik säger det. "Efter projektet" har fem bra punkter men ingen riktning, och fondens fält 7
frågar uttryckligen efter "användning och spridning" efter projektet. Förslag till inledning av "Efter projektet", sex meningar:

> **Vart Halkvakt är på väg.** Målet är att varje bilförare ska få veta att det är halt innan det är för sent, ur data som staten
> redan samlar in, gratis och utan att någon position lämnar telefonen. Vägen dit går i tre steg. Vintern 2026/27 mäts om varningen
> håller. Vintern 2027/28 kopplas prognoslagret till förarna om det klarat sina trösklar, och appen är i drift i hela landet i båda
> butikerna. Därefter Finland, Norge och Danmark, där arkiven redan är i drift, och väghållarna, som får felkartan och
> datakvalitetsrapporten som beslutsstöd. Föreningen Halkvakt förvaltar metoden, trösklarna och testbädden öppet, så att den som
> vill kan pröva, upprepa och bygga vidare. Appen förblir gratis för föraren; driften ska bäras av tjänster till yrkestrafik och
> väghållare, aldrig av att föraren betalar eller av att data om förare säljs.

Sista meningen är den enda som rör affären, och den ska stå så: den svarar på fondens fråga om långsiktighet utan att öppna
skolpaketet eller premiumtanken.

**b. Så når appen förarna.** Mätningen förutsätter "några hundra aktiva förare" (H2, AP3, Trafiksäkerhetsnyttan). Rekryteringen ger
40–70. Ingen text säger hur resten nås utöver butikspublicering och 25 000 kr "information och rekrytering". För en granskare är
det ett hål: nyttan och användningsmåttet i AP1 vilar på användare som ansökan inte visar hur den får. Repot har redan planen
(`docs/REKRYTERING.md`: lokala pendlargrupper, två till tre grupper i veckan, påminnelse vid första snön; butikstexten är skriven).
Förslag till stycke under AP3, efter "Information till förare":

> **Så når appen förarna.** Mätningen förutsätter några hundra aktiva förare i Skåne första vintern och fler den andra. Vägen dit:
> publicering i App Store och Google Play hösten 2026; testkretsen på 40–70 förare, personligen inbjudna (bilaga 2); inlägg i
> lokala pendlar- och vägsgrupper i sociala medier, några grupper i veckan, med ny påminnelse vid första snöfallet; trafikskolor och
> NTF Skåne som kanaler till nya förare och handledare; yrkesflottor i taxi, bud och hemtjänst via direktkontakt, med *Före resan*
> som argument; lokal press och kommunernas vinterinformation när första halkan kommer, med livekartan som bild. Insatsen
> budgeteras i AP3 och följs upp varje vecka i appbutikernas statistik: installationer, aktiva enheter och avinstallationer, ställda
> mot falsklarmsandelen (AP1). Målet är [300] aktiva enheter i januari 2027 och [1 000] inför vintern 2027/28.

Talen i hakparentes är Bengts och Axels att sätta; de ska stämma med "några hundra". Fondens ord för det här är information och
spridning, inte marknadsföring, och fonden betalar för det: NTF Väst fick 898 000 kr för kommunikationsinsatser i våras. Om 25 000
plus 8 000 kr räcker för några hundra förare är en fråga att ställa sig innan beloppet låses.

**c. En tidsplan på en sida.** Tider finns bara i arbetspaketens rubriker. En tabell med milstolparna (start 11/1 2027, dom 1
januari, kalibrering 1/2, dom 2 mars, enkät april, granskningens två steg, rapport juni, andra vintern, slutrapport april 2028) gör
ansökan lättare att bedöma. `docs/MALET.md` §4 är källan.

**d. Vem som vill ha resultatet.** Fonden ser positivt på partner som kan omsätta resultatet. Ansökan säger "inga formella
samarbetspartner", vilket är ärligt. Den kan ändå nämna de kontakter som finns: Trafikverkets driftområden (anmälningarna 22/9),
Malmö stad (samtalet 23/9, om Anna säger ja), SKR:s nätverk. Kontakter är inte partner, men de visar att någon väntar på svaret.

**e. Fartförändringen i telefonen.** Bilaga 1 definierar den (30 s före och efter), bilaga 2 och 3 nämner den, men ingen säger om
den får en egen omkopplare eller följer förarsvarens. Det är ett produktbeslut som rör vad appen skickar och ska stå i DECISIONS
innan det byggs, med Data Safety, integritetssidan och produktboken i samma commit. I ansökan räcker en mening: "med egen
omkopplare, av från början".

## 4. Affärshemligheter: vad som avslöjas och vad det är värt

Ansökan blir offentlig handling. Den avslöjar metoden i detalj: motorns regler (korridor ±35°, 30 sekunder, 400–3 000 m, prioritet,
10 s, 10 min och 5 km), vakternas gränser (12 °C, 8 °C, tre brott på sju dygn), prognoslagrets viktning och radier, alla trösklar i
bilaga 7 med utfall, källorna med licenser, skuggrutterna. **Det är avsiktligt och rätt.** Projektets bärande argument är att
metoden är öppen, förhandsdaterad och granskningsbar; att gömma trösklarna skulle underminera det argumentet. Den som vill kopiera
reglerna kan göra det ur Trafikverkets öppna data ändå. Det som inte går att kopiera är det ansökan inte innehåller: arkivet sedan
augusti med de varma raderna, kamerafacit, förarfacit, en vinter av kalibrering, apparna som finns och takten. Det är försprånget.

Det som **inte** står i ansökan och ska hållas utanför: skolpaketet som produkt, intäktsbeslutet "gratis vinter, betalande vår",
premiumtanken, Länsförsäkringar och Vinnova som nästa finansiärer, kontaktpersoners namn. Kontrollerat: inget av det finns i de
åtta dokumenten. Meningen "bära sig genom tjänster till yrkestrafik och väghållare" är den enda affärsmeningen, och den är rätt
nivå.

Det som bör ut eller in i en sekretessbilaga:
- **Personnummer och bankkonto** på sida 1, om sökanden är privatperson. Begär sekretessprövning för de fälten i mejlet.
- **Bilaga 7:s arbetsanteckningar** (punkt 2 ovan). De är inte hemliga, men de visar en ofärdig insida och citerar chattar.
- **Bilaga 3 §5:s vaktnamn** (kontraktsgrinden, värdevakten, kodgrinden, dom-knappen) kan stå, men "20 bilar i rotation" och
  "healthcheck varannan timme" säger inget för en granskare; korta till vad vakterna gör.

Göteborgs stads svar (21/9), Nira-citatet och Trafikverkets formuleringar är hämtade ur offentliga svar och sidor och kan stå.
Stationernas id och koordinater i bilaga 8 är Trafikverkets egna öppna data.

## 5. Ordningen i kväll

1. Beslut om sökande och belopp (bedömningen §4.2). Sökande som privatperson gör punkt 7 nödvändig.
2. Rättelserna 1–6 och 8–10 i §2. Punkt 1 är den viktigaste: den gäller ärligheten om prognoslagret.
3. Visionen och spridningsstycket ur §3 a–b, med talen satta.
4. Konsekvenssvep enligt Dokument 0, plus "0,71", "3,8 %", "Lagerlöf Labs", "Claude klassar".

---

## 6. Andra läsningen: bilaga 1 i ny version (Bengt 29/9 kväll)

**Omdöme.** Texten håller ihop: kostnadsplanen summerar rätt (413 000; 350 timmar = 245 000; 190 + 160), arbetspaketen och
timmarna stämmer med varandra, granskningen, testbädden, väghållarvyn och datakvalitetsrapporten är väl motiverade, och
facitreglerna står nu i huvudtexten. Men den viktigaste rättelsen är inte gjord: prognoslagret beskrivs fortfarande som i
september. Sex av tio punkter står kvar, och två nya har tillkommit.

| # | Punkt | Läge i nya versionen |
| :-- | :-- | :-- |
| 1 | Prognoslagret efter 28/9 | **Kvar.** Syfte: "klarades den 23 september … 0,71 °C … 3,8 % … höll också i det glesaste bandet … med 0,72 °C. Vinterns grindar återstår." Eget arbete: "711 stationer och 202 087 avläsningar … 0,71 °C … 3,5–3,8 %" och "Det enklare valdes. En inlärd stationsoffset tillförde inget (0,72 mot 0,71 °C) … Båda ströks." Innovationsgrad 3: "Två förbättringar av prognoslagret ströks när de mättes sämre." Allt detta är septemberbilden. 28/9: grind A håller (0,74 °C, 3,7 %, 715 stationer, 14 594 punkter), men den enklare skattningen utan offset föll med 6,9 % grova fel, och det är offseten som håller när de varma grannarna är med (DECISIONS #399). Meningen "ströks när de mättes sämre" är nu direkt fel om offseten. Färdig text nedan. |
| 2 | Bilaga 7:s arbetsanteckningar | Kan inte bedömas ur bilaga 1. Kontrollera bilaga 7 separat. |
| 3 | Vem klassar kamerabilderna | **Rättad i bilaga 1** ("klassas blint av en utomstående", tre gånger). Bilaga 7 §6 måste säga samma sak. |
| 4 | "Lagerlöf Labs" i bilaga 8 | Kan inte bedömas ur bilaga 1. |
| 5 | "40–70 förare för att 60 ska fullfölja" | **Kvar** (Risker). Presentkorten är 60. Skriv "60–80 förare för att 60 ska fullfölja", eller sänk presentkorten till 50. |
| 6 | AP2 "driftsättning mot användare från januari 2027" | **Kvar** (Kostnadsplan, kommentar 2). AP2-texten säger "inför vintern 2027/28 bara om trösklarna klaras". |
| 7 | Personnummer och bankkonto | Gäller formuläret, inte bilaga 1. Begär sekretessprövning i mejlet om privatperson står kvar. |
| 8 | Placeholders | **Kvar:** "Bakgrund: [fyll i]" (Bengt) och "[X] timmar, motsvarande [Y] kr". |
| 9 | Påståenden utan källa | **Delvis.** "Vi har inte funnit någon märkesoberoende tjänst" är reserverat. Kvar utan reservation: "Ingen har mätt hur väl VViS-data fungerar som varningskälla för allmänheten" (Syfte 1), "Ingen bil på marknaden sänker farten för att det är halt två kilometer fram" (H3), "Volvo Cars delar halkdata mellan bilar sedan 2016", "tio halkdagar per vinter". Ett "såvitt vi funnit" räcker. |
| 10 | Skärpningsdatumen | **Kvar:** "12 och den 23 september" mot bilaga 7:s ändringar 24/9 och 26/9. Skriv "under september". |

**Nya fynd.**

- **Föreningen bildas i kväll.** Personalplan: "projektgruppen avser att bilda en ideell förening som förvaltar dem efter
  projektet." Om det konstituerande mötet hålls kl. 19 är meningen fel när ansökan skickas 30/9. Skriv då: "Projektgruppen bildade
  den 29 september 2026 Föreningen Halkvakt, en ideell förening som förvaltar rapport, metod, tröskeldokument och testbädd;
  organisationsnummer är sökt." Det stärker dessutom kunskapsprojektsramen mer än en avsikt gör, även om Bengt står som sökande.
- **Förarens nej fäller ensamt.** Metod, Facit: "Ett falsklarm fälls av två saker: en station … eller en testförare som svarar att
  varningen inte stämde." Tröskelreglerna säger annat (TROSKLAR-KOMBINATIONEN KB-D, mätningssidan §3.3): *Stämde inte* fäller bara om
  ingen annan källa bekräftar, och förarfacit ensamt fäller eller friar ingen dom. Skriv: "… eller en testförare som svarar att
  varningen inte stämde, om ingen annan källa bekräftar den." Annars lovar ansökan en regel som tröskeldokumentet förbjuder, och
  granskaren i AP4 ska pröva just att reglerna tillämpas som de skrevs.
- **"Tre leverabler är gjorda för dem"** (Trafiksäkerhetsnyttan): de görs under projektet. Skriv "görs".
- **"betans varningsregler döms i januari 2027"** (Metod): ordet betan är internt. Skriv "de nya varningsreglerna, som testförarna
  får i november".
- **Trafikövningsplatsen "inom projektets ram utan ändrat belopp"** står två gånger utan budgetpost. Ofarligt, men lova det inte
  utan att veta vad ett försök kostar; skriv "kan försöket läggas till efter samråd med fonden".

**Fortfarande saknas.** Visionen (§3 a) och "Så når appen förarna" med talen (§3 b). "Information till förare" under AP3 är
bra men bär inga tal, och ansökan förutsätter "några hundra aktiva förare" på tre ställen med 40–70 rekryterade. Tidsplanen på en
sida (§3 c) saknas också.

**Färdig text för punkt 1, att klistra in.**

Syfte, stycket om grinden:
> Den första av lagrets tre grindar, korsvalideringen vid stationerna, klarades den 23 september 2026 och höll i omkörningen den
> 28 september på ett fullständigare arkiv: medelfel 0,74 °C mot kravet högst 1,0 °C och grova fel 3,7 % mot kravet högst 5 %.
> Den enklare skattning som ska gälla mellan stationerna, där ingen egen mätserie finns, föll däremot den 28 september med 6,9 %
> grova fel. Utfallet är bokfört, och det är just den frågan, vad som går att uppnå mellan stationerna, som vinterns grindar och
> ansökan avser att pröva.

Eget arbete, de två punkterna om grind A och "Det enklare valdes":
> **Prognoslagrets grind A.** Lagret är prövat med korsvalidering: varje station hålls utanför och skattas ur grannarna. Senaste
> körningen, den 28 september över 715 stationer, 308 852 avläsningar och 14 594 punkter, gav medelfel 0,74 °C och 3,7 % grova fel,
> inom kraven även bortom 20 km från närmaste station.
>
> **Det enklare prövades, och föll där det saknar historik.** En skattning utan inlärd stationsoffset var lika bra vid stationerna
> i september (0,72 mot 0,71 °C), men gav 6,9 % grova fel när arkivet från den 25 september också sparade de varma
> grannstationerna. Offseten håller (3,7 %) men finns bara där en station har egen mätserie. SMHI:s luftstationer som extra ankare
> gjorde modellen sämre (1,05 → 1,20 °C) och ströks. Hur en vägpunkt utan station ska skattas är därmed en öppen och bokförd fråga,
> och den är kärnan i arbetspaket 2.

AP2, Nationell felkarta, efter "0,4 %":
> Omkörningen den 28 september visade att korsvalideringen vid stationerna håller, men att skattningen mellan stationerna inte gör
> det utan stationens egen historik. Vilken modell som ska bära vägpunkten avgörs därför på vinterns underlag, inte på höstens.

Innovationsgrad 3, meningen om två förbättringar:
> SMHI:s luftstationer som ankare ströks när de mättes sämre, och den enklare skattningen mellan stationerna bokfördes som fallen
> när den mättes om på ett fullständigare arkiv.
