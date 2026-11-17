# KÖRLISTAN — vägen till ett tillförlitligt system, mätt nytta och redovisning

**Upprättad 17/11 2026 på Bengts order** (DECISIONS #887, kort #664). Bengt 17/11: *"Jag vill att du upprättar en att göra lista för
hur vi ska nå ända fram till tillförlitligt system, mätt nytta för användare o ett redovisningssystem för oss. Sen ska du och jag
genomföra varje punkt"*, och *"Jag vill att du gör så att du kan hålla reda på alla dessa punkter o att vi genomför dessa utan att
tappa bort något"*.

Den här filen är den enda platsen där punkternas läge står. Varje session läser den vid start och ändrar den i samma commit som
arbetet (KÖRLISTEREGELN i CLAUDE.md).

## 1. De tre målen

| Mål | Vad det betyder | Delar |
| :-- | :-- | :-- |
| **Tillförlitligt system** | Kedjorna tappar inga dygn, appens vakt lever hela resan, larmen når en människa i tid, och varje mätning är gjord under driftens villkor | A, B |
| **Mätt nytta för användarna** | Det finns en bestämd definition av nytta, och varje varningslager mäts mot den: hur många varningar som nådde en förare, om de stämde, och vad som sades vid olyckorna | C |
| **Redovisning för oss** | Bengt och Axel läser en samlad rapport varje vecka utan att be om den, och varje läsning och dom har ett datum | D |

Listan kom ur genomlysningen av storstäderna och småvägarna 17/11. Tre punkter (B4, B7 och B9) gäller hela appen. De står med
därför att de avgör om en varning når föraren.

## 2. Så arbetar en session med listan

1. **Läs hela filen vid start,** efter kartsynken, fristerna och bedömningen.
2. **Nästa punkt** är den första öppna i §3 som inte väntar på en annan punkt eller på någons ord, om Bengt inte säger annat. Säg
   i början av varvet vilken punkt det gäller.
3. **Kolumnen *Vem* styr.** *ni beslutar* och *ni signerar* betyder Bengts och Axels ord, och inget byggs före det. *ert ord* betyder
   att Claude bygger när Bengt har sagt ja. Allt som rör driften (DB-knappen, migrationer, deploy, flöden) kräver Bengts ord varje
   gång, som i resten av projektet.
4. **Läget ändras i samma commit som beviset.** *klar* skrivs bara med beviset på raden: en commit, en grön körning, en mätning
   efter driftsättningen eller ett beslut. Ett bygge som inte har gått i drift är *pågår*, inte *klar*.
5. **Ingen rad tas bort.** En punkt som inte ska göras märks *struken* med datum och beslutets nummer, och bara på Bengts ord.
6. **Nytt arbete** som hör till de tre målen får en egen rad i samma varv, med nästa lediga id i sin del, och en rad i §9.
7. **Varje punkt som börjar** får ett kort på tavlan, eller pekar på det kort som redan bär arbetet. Kortets nummer står i
   kolumnen *Källor*.
8. **Vid sessionens slut** säger rapporten till Bengt vilka punkter som rörde sig, vilken som står på tur och vad som väntar på
   hans eller Axels ord.
9. **Bara ord här.** Repot är publikt. Tal och resultat ur halkvakt-kuvos står i bakgrunden där
   (`docs/KORLISTAN-BAKGRUND-2026-11-17.md` och `docs/GENOMLYSNING-2026-11-17.md`), aldrig i den här filen.

**Lägen:** *öppen* · *pågår* (med vad som är gjort) · *väntar på* (en punkt eller ett ord) · *klar* (datum och bevis) · *struken*
(datum och beslut).

### Det en ny session måste veta innan den rör en punkt

- **Läs källorna på raden först.** Kolumnen *Källor* pekar på korten, besluten och kuvösens beslut. Sök i TAVLA och DECISIONS,
  läs dem inte hela. En punkts text här är en sammanfattning, inte en specifikation.
- **Följ kedjan till den senaste posten.** Ett beslut kan vara ändrat av ett senare. Redovisa det som gäller efter alla
  ändringar, och nämn en äldre dom bara som historik.
- **Kuvösens prov är spärrade.** Stadsmiljöns dygnsfiler läses inte före 1/4 2027. Småvägsprovets regel A läses tidigast 1/3 2027
  och de övriga tidigast 1/4 2027. Det enda som får läsas löpande är småvägsröstens mått vid stationerna, genom driftkontrollen
  (halkvakt-kuvos F69). Öppna aldrig en dygnsfil för att se hur det går.
- **Driften rörs bara på Bengts ord:** DB-knappen, migrationer, deploy och flöden som startas för hand. En PR slås ihop bara på
  Bengts *"slå ihop"*, utom bokföring som `synk-ihop` tar själv.
- **Läs i databasen bara med SELECT,** och läs aldrig `cron.job.command`. Testarnas svar skrivs aldrig ut rad för rad.
- **Varje tal om varningar bär sin nivå** (§8), och mätningar av en varningsregel görs på kandidaten som talar i appen.
- **Ordningen i §3 är ett förslag.** Bengt bestämmer vilken punkt som tas, och ett datum i kolumnen *Klart när* går före ordningen.

## 3. Ordningen

1. **Vecka 47 (17–22/11):** A1, A2, A3 och A4. Därefter B1, B2 och B3, som skyddar proven i mars och april, och C1, så att allt
   som mäts sedan mäts mot en bestämd plan.
2. **Runt 19/11:** C5, påslaget av småvägsrösten, med B6 och B8 avgjorda först.
3. **Före 1/12:** D1 och D2, C2 och C3, så att den första månadsläsningen bär hela bilden.
4. **December:** B4, B7, B9, C4 och C6.
5. **Januari till april:** B10, C7, C8 och D3 efter sina datum. B5 och D4 löper hela tiden.

## 4. Del A — den här veckan: det som annars går förlorat

| Id | Punkt | Vem | Klart när | Källor | Läge |
| :-- | :-- | :-- | :-- | :-- | :-- |
| A1 | **Morgonens bevis 17/11.** Stadsflödet ska gå efter fysikens reserv (#884), den frysta kandidaten har ett tredje försök (#886), vakten ska kalla dygnet 16/11 komplett, och kuvösens prov ska skriva dygnet 16/11 med alla körningarna | Claude läser | körningarna är gröna och bokförda på korten | kort #663, #662; DECISIONS #884, #886 | öppen |
| A2 | **Storstädernas logg sparas undan.** `ny_kandidat_skugga_stad` gallras efter 14 dygn (`sql/096`). Brytarna slogs på 8/11, så de första raderna försvinner 22/11. Utan loggen går storstäderna inte att redovisa för säsongen | ert ord, Claude bygger | en daglig kopia i den privata hinken, med 8/11 kvar | kort #378; DECISIONS #815; frist `stadsloggen-2026-11-22` | öppen |
| A3 | **Pulsklockans nyckel** går ut 22/11 kl. 20.55 UTC. Utan den stannar allt som pulsklockan startar | Axel | fristens ärende stängt | frist #1461 | öppen |
| A4 | **Säsongsfacits första veckoläsning.** Tröskeldokumentet säger varje måndag. Inget spår finns av 9/11 och 16/11 | ert ord, Claude läser | en intern rapport till Bengt och Axel, och en rad utan tal på kort #381 | kort #381; `docs/TROSKLAR-SASONGSFACIT.md` §6 | öppen |

## 5. Del B — tillförlitligt system

| Id | Punkt | Vem | Klart när | Källor | Läge |
| :-- | :-- | :-- | :-- | :-- | :-- |
| B1 | **Reserven för en fallen körning.** I dag kostar en enda fallen körning i `kuvos-stad` ett helt dygn i kuvösens prov. Flödet ska räkna körningen i efterhand av sig självt medan MET har den kvar (omkring tre dygn), med valet `stamp`. En post i förregistreringarna säger att en sådan räkning gäller, också de tre från 16/11 | ni signerar posten, Claude bygger | en framkallad lucka räknas i efterhand, och dygnet bedöms | kort #663; DECISIONS #885; halkvakt-kuvos F70 | öppen |
| B2 | **Dygnen som redan saknar en körning** i kuvösens prov: omräkning eller inte, och vad proven i mars gör med dem. Det rör både småvägskartan och regeln för om småvägsrösten får stå kvar 2027/28 | ni beslutar, med en post i förregistreringen | beslutet bokfört i halkvakt-kuvos före någon omräkning | halkvakt-kuvos F70 punkt 1 och 3, F52 | öppen |
| B3 | **Värdevakten för ytvattnet och nederbörden.** Driftkontrollens larmgräns vilar redan på fälten, men de har inget spann i `scripts/vardevakten.ts` | ert ord, Claude bygger | fälten har spann, och knappen är grön | VÄRDEVAKTEN i CLAUDE.md; halkvakt-kuvos F46; kort #662 | öppen |
| B4 | **Appens vakt som dör under körning.** Då tystnar alla varningar utan att föraren märker det. Orsaken är okänd sedan 8/11 | Bengt läser Analysdata, Axel läser Organizer, Claude rättar | orsaken bokförd i DECISIONS, och andelen pass som slutar *avbruten* följs i räknaren per version | kort #643; DECISIONS #778, #787 | öppen |
| B5 | **MET:s morgonfel.** Felanmälan, och ett beslut om morgonens körning ska flyttas förbi fönstret då MET svarar med fel | Bengt väljer | anmälan skickad eller avstådd, och beslutet om tiden bokfört | kort #663; bedömningen §4.2 16/11 | öppen |
| B6 | **Avbrotten ska gå att pröva.** Tre luckor: medianen för publiceringens bygge veckan före påslaget är inte mätt (#833 kräver den), regelns tid är bara mätt en torr eftermiddag (#828, tillägget 14/11), och ingen är utsedd att slå av på testarnas svar (#833) | Claude mäter, ni utser | de två mätningarna bokförda, och namnet står i ett beslut | kort #647; DECISIONS #828, #833 | öppen |
| B7 | **Batteriet under driftens villkor.** Telefonturen 8/11 slutade innan stadspunkterna slogs på, senare resor var inget prov med skärmen av, och Android under budgeten är inte visat. Vad som händer över 8 %/h efter småvägsröstens påslag är inte bestämt | Bengt eller Axel kör, Claude läser | en resa per plattform med skärmen av och punkterna i lägesfilen, och följden över budgeten beslutad | DECISIONS #778, #838, #878; kort #378, #647 | öppen |
| B8 | **iPhone 0.4.1 till Apple.** 0.4.0 i App Store tiger 10 minuter och 5 km efter ett småvägsbesked, mot de 30 minuter och 20 km som valdes i #863 | Axel | 0.4.1 släppt, eller Bengts och Axels ord att godta 0.4.0 | DECISIONS #863, #883; kort #647 | öppen |
| B9 | **Ansvarstexten.** Appens rad säger att vägen mellan stationerna är oövervakad, fast kandidaten och storstädernas punkter talar där. EU:s nya produktansvar gäller från 9/12 | ni beslutar texten, Claude bygger | texten i appen och på sajten | kort #648; halkvakt-karta PR 21 | öppen |
| B10 | **Byggena med datum inför domarna.** Marsfönstret flyttas från stadsmiljöns kedja till domen (före 1/3). Steget som kör stadsmiljöns dom byggs (före april). Småvägsprovets domskript fryses (26/2). En anteckning i halkvakt-kuvos F44 kontrolleras och rättas. Stadsmiljön saknar frist i fristvakten | ert ord, Claude bygger | varje bygge har en frist i `docs/fristerna.json`, och fristen är stängd | halkvakt-kuvos F32, F33, F44; frist `p2-frysning` | öppen |

## 6. Del C — mätt nytta för användarna

| Id | Punkt | Vem | Klart när | Källor | Läge |
| :-- | :-- | :-- | :-- | :-- | :-- |
| C1 | **Mätplanen: vad nytta är.** Ett tröskeldokument, fastställt före nästa läsning, med fyra nivåer (§8). Det säger också vad som inte mäts: undvikna olyckor och förarens beteende. Säljregeln utvidgas till räknarens tal och förarnas svar | Claude skriver, ni signerar | dokumentet fastställt av Bengt och Axel | `docs/TROSKLAR-OLYCKSFACIT.md` §9.6; `docs/TROSKLAR-SASONGSFACIT.md` | öppen |
| C2 | **Säsongsfacits andra del:** fördröjningen från Trafikverket, stationernas leverans, kamerabilderna, falsklarmen per 100 km, takten och rapportskriptet med intervallen. Månadsläsningen 1/12 är första fristen | ert ord, Claude bygger | delarna i drift, och läsningen 1/12 bokförd på kortet | kort #381; frist `sasongsfacit-2026-12-01` | öppen |
| C3 | **Storstäderna in i redovisningen.** Säsongsfacit omfattar inte dem. Ett tillägg ger dem ett eget avsnitt: varningstimmar, varför regeln teg, olyckorna inom 2 km och förarnas svar | ni signerar tillägget, Claude bygger | avsnittet står i veckorapporten (D1) | `docs/TROSKLAR-SASONGSFACIT.md` §1; kräver A2 | väntar på A2 |
| C4 | **Fler fuktkällor i skugga i storstäderna.** Radarn är enda fukten i regeln i dag (`sql/091`). Läsfrågan för friktionen skrivs före 6/12 | ni signerar förregistreringen, Claude bygger | skuggan räknar varje timme, och läsfrågan är skriven | halkvakt-kuvos F38, F40; kort #378 | öppen |
| C5 | **Påslaget av småvägsrösten.** Utan det finns ingen varning att mäta på småvägarna. Rekommendationen 16/11 står: efter avbrottskontrollens första dom, som läses 19/11 | ni ger ordet, Claude kör `sql/113` | brytarna på, och det första beskedet i räknaren | kort #647; DECISIONS #881; kräver B6 och B8 avgjorda | väntar på Bengts och Axels ord |
| C6 | **Facit på vägen.** Provkörningar efter provlistan, med ett protokoll och ett antal per vecka. Fler testförare: januaridomen kräver minst 5 förare och 30 svar. *Appen missade* läses in i rapporten, och svaren delas per varningstyp | ni kör och rekryterar, Claude bygger läsningen | protokollet används, och svaren står i veckorapporten | DECISIONS #883; frist `testforarna`; kort #662 | öppen |
| C7 | **Svartis och rimfrost.** Kandidaten i storstäderna och småvägsrösten väcks bara av nederbörd | ni signerar en förregistrering | provet läst, och ett beslut om en variant | kort #656; DECISIONS #857 | öppen |
| C8 | **Småvägskartan.** Kuvösens prov läses 1/3 och 1/4. Före dess: ett beslut om ett kartlager ska finnas, och hur omarkerade vägar visas | ni beslutar | beslutet bokfört före 1/3 | frister `p2-las-a`, `p2-las-bcd`; DECISIONS #757 | öppen |

## 7. Del D — redovisning för Bengt och Axel

| Id | Punkt | Vem | Klart när | Källor | Läge |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D1 | **Veckorapporten.** Ett dokument varje måndag med sex delar: driften (kompletta dygn, förlorade timmar, larm, avbrutna pass), räckvidden, riktigheten, olyckorna, storstäderna och småvägarna var för sig, och frister med öppna beslut. Bakåträknat, skugga och drift står alltid isär | ert ord, Claude bygger | två måndagar i rad med rapport | kräver C1; kort #381, #662 | öppen |
| D2 | **Var Bengt och Axel läser talen.** I dag ligger de i den privata hinken och i interna tabeller. Val: Claude skickar filen varje måndag, en privat sida som uppdateras, eller det privata repot | ni väljer | ni har läst en rapport utan att be om den | kort #662 (*rapportens tal lästa av Bengt och Axel*) | öppen |
| D3 | **En kalender för läsningar och domar:** månadsläsningarna 1/12–1/3, småvägsprovet 1/3 och 1/4, stadsmiljön efter 31/3 och slutrapporten 15/4. Storstäderna och småvägsrösten saknar egna frister | ert ord, Claude bygger | fristerna står i `docs/fristerna.json` | `docs/KALENDERN.md`; fristvakten | öppen |
| D4 | **Bokföringen i fas.** Kort #378 väntar på sin första varning fast stadsloggen visar den, kort #647 väntar på ett komplett dygn, och #828 är inte avstämt i stomdokumenten (bedömningen §4.2 11/11) | Claude, på ert ord | korten stämmer med driften, och frågan i §4.2 är besvarad | kort #378, #647; TAVELREGELN | öppen |

## 8. Orden som listan använder

- **Nivåerna för ett tal om varningar** hålls alltid isär och läggs aldrig ihop: *bakåträknat* (en regel räknad på äldre vintrar),
  *skugga* (regeln räknar i driften med brytaren av) och *i drift* (brytaren på).
- **Nyttans fyra nivåer** är ett förslag tills C1 är fastställd:
  1. *räckvidd*: hur många varningar som nådde en förare, ur räknaren;
  2. *riktighet vid en mätpunkt*: regeln mot stationer, Trafikverkets väglag och kamerabilder;
  3. *riktighet på vägen*: förarnas svar och provkörningar;
  4. *olyckorna*: andelen halkkopplade olyckor där en varning var aktiv, enligt säljregeln.
- **Säljregeln** (`docs/TROSKLAR-OLYCKSFACIT.md` §9.6) säger vad som får påstås utåt. Den täcker i dag bara olycksfacit.
- **Det som aldrig mäts:** förarens rörelser. Ingen position och inget körmönster lämnar telefonen av sig självt
  (produktinvarianten i CLAUDE.md).

## 9. Ändringar i listan

| Datum | Ändring | Källa |
| :-- | :-- | :-- |
| 17/11 2026 | Listan upprättad med 26 punkter: A1–A4, B1–B10, C1–C8 och D1–D4 | DECISIONS #887 |
