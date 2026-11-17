# TROSKLAR — mätplanen: vad nytta är, och hur den mäts vintern 2026/27

**UTKAST 17/11 2026, inte fastställt.** Skrivet av Claude på Bengts order (körlistan C1; Bengt 17/11: *"ta B6 först och gör sedan B1, B2, B3
och C1 i den ordning du tycker är bäst"*). Dokumentet gäller först när Bengt och Axel har fastställt det (§10). Efter den första läsningen
ändras inget mått, underlag eller krav utan ett nytt beslut, med skälet bokfört (regel L, §9).

## 1. Vad mätplanen är, och vad den inte är

- **Mätplanen säger vad Halkvakt menar med nytta för en förare.** Nyttan delas i fyra nivåer, och varje nivå har ett bestämt tal och en
  bestämd källa.
- **Mätplanen samlar det som redan mäts.** Räknaren, säsongsfacit, förarnas svar och olycksfacit finns i drift. Här står hur de hör ihop,
  vad som saknas och vad som får sägas utåt.
- **Mätplanen är ingen grind.** Den avgör inte vad som får tala och ändrar ingen regel. Grindarna, domkalendern och kuvösens prov gäller som
  förut.
- **Mätplanen säger vad som aldrig mäts** (§3), så att ingen läsning lovar mer än underlaget bär.

## 2. De fyra nivåerna

| Nivå | Frågan | Källan | Talet | Vad talet inte säger |
| :-- | :-- | :-- | :-- | :-- |
| 1. Räckvidd | Nådde en varning en förare? | Den anonyma räknaren (`app_raknare`, DECISIONS #772, #787) | Varningar per dygn och slag, aktiva förare per dygn, och andelen vaktpass som slutar *avbruten* | Om varningen var rätt. Vem föraren var, och var |
| 2. Riktighet vid en mätpunkt | Var det halt där regeln sa det? | Säsongsfacit (`docs/TROSKLAR-SASONGSFACIT.md`), driftkontrollen för småvägsrösten, och kuvösens prov, som är spärrade till mars och april | Träffsäkerhet, täckning, ledtid och falsklarm per 100 km | Något om vägar utan mätpunkt. Facit finns där Trafikverket mäter, och det ger en slagsida mot de statliga vägarna |
| 3. Riktighet på vägen | Tyckte föraren att varningen stämde? | Förarnas svar (`driver_facit`, `driver_miss`) och provkörningar efter provlistan | Antalet svar och andelen *stämde* per varningsslag, och antalet *appen missade* per slag | Hur alla förare upplever rösten. Svaren kommer från betatestare som själva slagit på reglaget |
| 4. Olyckorna | Var en varning aktiv där en halkolycka började? | Olycksfacit (`docs/TROSKLAR-OLYCKSFACIT.md`) | Andelen *RÄTT VARNING* av de halkkopplade olyckorna, per lager | Att en förare varnades, eller att en olycka hade undvikits |

Nivåerna läggs aldrig ihop till ett enda tal. En hög räckvidd säger inget om riktigheten, och en hög andel *RÄTT VARNING* säger inget om
hur många förare som hörde varningen.

## 3. Vad som aldrig mäts

- **Förarens position, rörelse och körmönster.** Ingenting sådant lämnar telefonen av sig självt (produktinvarianten i CLAUDE.md).
- **Om föraren ändrade sitt beteende.** Halkvakt vet inte om någon saktade ner.
- **Undvikna olyckor.** Det finns inget underlag för ett sådant tal, och det ska inte påstås.
- **Enskilda förare.** Räknaren bär inget id, och förarnas svar bär ingen identitet (DECISIONS #378).

## 4. Varje tal om varningar bär sin nivå

Ett tal om hur en varningsregel beter sig hör till exakt en av tre nivåer, och de läggs aldrig ihop (Bengt 14/11):

- **bakåträknat:** en regel räknad på äldre vintrar, med regelns version angiven;
- **skugga:** regeln räknar i driften med brytaren av, och ingen förare hör den;
- **i drift:** brytaren är på, och förare hör varningen.

Mätningar av en varningsregel görs på den kandidat som talar i appen. Det senaste läget redovisas först, och en passerad dom nämns bara som
historik.

## 5. Minsta underlag

- **Antalet står alltid bredvid andelen.**
- **En cell med färre än 20 händelser redovisas bara som antal,** som i säsongsfacit (val 3 där).
- **Förarnas svar redovisas som andel först vid 30 svar på ett varningsslag.** Under det står bara antalet. Kravet följer KB-D4 i
  `docs/TROSKLAR-KOMBINATIONEN.md`: minst 30 svar från minst 5 förare.
- **Antalet förare går inte att läsa ur svaren,** eftersom de saknar identitet. Det anges av Bengt och Axel som antalet testare i gruppen
  (DECISIONS #678).
- **Räknarens aktiva förare är ett tal per dygn.** Det summeras aldrig över dygn till ett antal användare, eftersom samma förare då räknas
  flera gånger.

## 6. Säljregeln, utvidgad

Säljregeln i `docs/TROSKLAR-OLYCKSFACIT.md` §9.6 gäller olycksfacit. Här utvidgas den till de andra nivåerna.

| Nivå | Får sägas utåt | Får aldrig sägas |
| :-- | :-- | :-- |
| 1. Räckvidd | Antalet varningar som rösten har sagt, per slag och period | Att ett antal förare har varnats. Räknaren räknar händelser, inte människor |
| 2. Riktighet vid en mätpunkt | Det som säsongsfacit §7 medger: metoden när den är fastställd, och resultatet efter slutrapporten, vad det än blir | Ett enskilt tal ur en löpande läsning. Kuvösens tal utan ett beslut (DECISIONS #768) |
| 3. Riktighet på vägen | Andelen *stämde* med antalet svar bredvid, när underlaget i §5 finns | Ett enskilt svar, ett citat eller en andel utan antal |
| 4. Olyckorna | *"Halkvakt hade en aktiv varning på platsen när olyckan började"*, med lagret utskrivet och säsongens andel bredvid | Att en förare varnades, eller att en olycka hade undvikits |

För alla nivåer gäller:

- ett tal ur skuggan eller ur en bakåträkning presenteras aldrig som drift;
- varje tal bär sin period och sitt antal;
- missarna redovisas lika öppet som träffarna.

## 7. Var talen läses, och hur ofta

- **Varje måndag:** veckorapporten (körlistan D1) bär alla fyra nivåerna, med veckan och säsongen hittills.
- **Månadsläsningarna 1/12, 1/1, 1/2 och 1/3** och **slutrapporten senast 15/4** följer säsongsfacit §6.
- **Talen står aldrig i repot,** i ärenden eller i Actions-loggar, eftersom repot är publikt. Rapporten är intern, och bokföringen säger
  bara att läsningen är gjord och vad som har förändrats.

## 8. Vad som finns, och vad som saknas

| Nivå | Finns i drift | Saknas | Körlistan |
| :-- | :-- | :-- | :-- |
| 1 | Räknaren sedan 1/11, med varningar per slag, aktiva dagar och hur passen slutar | Sammanställningen per vecka. Orsaken till pass som slutar *avbruten* | D1, B4 |
| 2 | Säsongsfacits första del: kandidaten mot Trafikverkets väglag och olyckorna, och ledtiden. Driftkontrollen för småvägsrösten | Säsongsfacits andra del. Storstäderna. Falsklarmen per 100 km och takten vilar på skuggans huvudrutter, som inte följer vägen | C2, C3, B13 |
| 3 | Svaren *stämde* och *stämde inte*, och *appen missade* | Ett protokoll för provkörningar, fler testförare, och läsningen per varningsslag | C6 |
| 4 | Olycksfacit med klassningen per olycka | Inget | |

## 9. Regel L

Efter den första läsningen enligt det fastställda dokumentet ändras inget mått, underlag eller krav utan ett nytt beslut i DECISIONS, med
skälet bokfört. En ändring som görs efter att ett utfall har setts lutar sig mot utfallet.

## 10. Valen, och signaturer

Varje val har en rekommendation. Dokumentet är fastställt när Bengt och Axel har svarat på alla fem.

| Val | Rekommendation | Skäl |
| :-- | :-- | :-- |
| 1. Ska nyttan delas i de fyra nivåerna i §2? | **Ja** | Varje nivå har redan en källa i drift, och de mäter olika saker |
| 2. Ska förarnas svar redovisas som andel först vid 30 svar per varningsslag? | **Ja** | Samma underlag som KB-D4 kräver |
| 3. Ska räknarens tal få sägas utåt som antal varningar, men aldrig som antal förare? | **Ja** | Räknaren bär inget id, så förare går inte att räkna |
| 4. Ska förarnas svar få sägas utåt, med antalet bredvid? | **Ja** | Ett svar från vägen är det närmaste Halkvakt kommer en förares bedömning |
| 5. Ska veckorapporten bära alla fyra nivåerna från första måndagen efter fastställandet? | **Ja** | Då mäts allt mot samma plan från början |

**Signaturer:** väntar på Bengt och Axel.
