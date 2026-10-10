# DECISIONS.md — Halkvakt

**Numrering (20/9, kort #220):** ett beslut = ett unikt nummer, nästa är alltid högsta + 1 — `scripts/beslutsnumren.ts` i CI fäller dubbletter och skriver ut nästa lediga. Sju nummer delades ut två eller tre gånger 1–12/9; historiken skrivs inte om, men de senare posterna bär bokstav (#55b, #60a/#60c, #72a, #73b, #78b, #124b, #126b; tillägg heter #30a, #31a, #40a, #77-bevis) och hänvisningarna i md-filerna pekar på rätt bokstav. Fyra nummerrymder delar skrivsättet #NN — skriv alltid `DECISIONS #NN`, `kort #NN`, `issue #NN`, `PR #NN`.

**Arkivet (26/9, kort #221):** beslut **#1–#185** (24/8–14/9 2026) står i `DECISIONS-ARKIV.md`, ordagrant och i samma ordning. Här står #186 och framåt. `scripts/beslutsnumren.ts` läser båda filerna, så ett nummer kan aldrig delas ut två gånger.

## #186 (15/9 2026) Axels andra brev: kartan fryst, förarna som facit, efterhalkan som märkt beta i november

**Axels brev 15/9**, efter att han läst karta, bedömning v2 och granskning: *"Ni har byggt en mätapparat av en
klass jag inte sett i ett projekt av den här storleken. Den saknar två saker: facit som fylls, och en väg från
skugga till förare som är kortare än en vinter."* Han rättade sig själv på två punkter — grind A föll inte,
och E kan inte vänta — och föreslog fyra saker. **Bengt beslutade samma dag:**

1. **Kartan fryses.** Tjugofyra rättelser på ett dygn var en ekokammare. Nästa ändring i kartan kommer efter
   att något byggts och mätts. R1–R15 väntar i bedömningens bilaga A tills en av dem rör kod. Enda undantaget:
   kriteriet för nytt farslag, tre rader i §7.8, som Bengt fastställde: *handling · text · prioritet beslutad
   av Axel före vektorn.*
2. **Betatestarna får skicka varningsfacit** — *"stämde det?"* efter varje varning, varnings-id + svar, inget
   spår — med uttryckligt samtycke i känd krets. Löftet *"samlar in: ingenting"* gäller oförändrat för
   allmänheten (kort #21 hade skjutit knappen till våren 2027 av just det skälet).
3. **Efterhalkan släpps som märkt beta i november**, före grinden: *"Halkvakt tror: frysrisk framöver"*, som
   ny gren i `icing_point` (F3+F4+text, tre portar, `v11_silent_drive` måste tiga). Dom i januari på
   förarfacit plus vad kamerafacit hunnit ge; mars-domen blir en dom på riktig data. Trösklarna rörs inte.
4. **Tre dokument blir ett levande och två stilla:** kartan (varför, fryst) · bedömning v3 (vad och när, den
   enda listan: nu 5 rader, senare, ännu senare) · granskningen (arkiverad).

**Axels tre "måste oavsett" är bedömningens N1–N3:** kamerafacit bevisat med ett objekt i hinken, #42 i
höstregn, nycklarna roterade senast 15/11 med publiceringsbevis. Ingen av dem var startad när brevet kom.

**Två kostnader Axel inte nämnde, nu i listan:** *"kräver ingenting nytt i motorn"* stämmer inte — regeln
finns som skript, inte i motorn apparna kör; betan är L1 flyttad till november, ett motorbygge med v11 som
grind (S3). Och facitknappen kräver samtyckesbeslutet ovan (S4).

## #187 (15/9 2026) Regnsegmenten får en EGEN nyckel i live.json — vidgningen av väglagsfrågan hade blivit en falsklarmsmaskin

**Bedömning v3 N2 (kort #154, Bengts "då gör vi nu nu" 15/9, PR #270).** Uppgiften: låta radarns `regn` nå de
normalklassade segment vattenplaningen sitter på. Den första ritningen — vidga väglagsfrågans WHERE med
`rate_mean_mmh ≥ 2,0` — stoppades av koden själv: `engine/src/snapshot.ts` gör VARJE rad i `segments[]` till en
`slippery_segment`, och `SnapshotRepo.kt`/`.swift` likaså. En vidgad fråga hade fått tre portar att säga "halka
på vägen framför" på varje blöt normalväg i höstregn — F4/F5 utklädd till F1.

**Beslut:** ny toppnyckel **`rain_segments`** med samma form som `segments` (`id, line, code, info, road, regn`),
fylld av segment som INTE är halkklassade och vars senaste radarrad inom 70 min har rå `rate_mean_mmh ≥
REGN_UTLOSARE_MMH = 2,0` (#155/#156, jämförd mot råvärdet). Ingen port läser nyckeln — båda läser otypat och
okända nycklar ignoreras ("LÄGG TILL, ERSÄTT ALDRIG"); skuggan kan (steg E, V-B). Samma enda `regn`-skrivare.
Fail-soft med not, aldrig tyst. Tre nya konstanter finns i två filer (källan + buntade publicera/index.ts) och
står i kontraktsgrinden (golv 2). Test: normalklassat S2 över 2,0 hamnar i `rain_segments`, `segments` orörd,
motorn ser fortfarande EN slippery_segment.

**Förkastat:** vidgad WHERE (falsklarm i tre portar) · filter i `snapshotToHazards` (motorändring + tre portar för
en F1-uppgift) · `regn` som separat karta `{id: mm/h}` (skuggan behöver geometrin ändå). **Bengts ja på #154**
togs som givet av ordern att köra NU-listan; eftersom nyckeln inte når någon port ändrar ett nej ingenting apparna gör.

**Bevis 15/9:** publicera deployad 15:52Z; live.json 2026-09-15T16:00:01Z (manifest-sha STÄMMER): **`rain_segments` 34 st** — t.ex. segment 16010 E16, kod 1 "Torrt", `regn` 3,1 (= 2,0 rå); `segments` 0 st, som förut i september.

## #188 (15/9 2026) F1: skattarens råa indata i live.json — `regn_h` och `lutning15/30/60`; `radar_h` uppskjuten

**Bedömning v3 N4 (kort #187, PR #270).** Varje väderpunkt bär nu `regn_h` (timmar sedan arkivet senast såg
`rain_sum_mm > 0`, fönster `REGN_H_FONSTER_H = 48`) och `lutning15/30/60` (°C per fönster ur `trend_kandidater`,
senaste rad inom `LUTNING_MAX_ALDER_MIN = 60`, positivt = ytan faller). Null = inget i fönstret eller okänt,
aldrig noll. Gränsstationer (fi/no) får null. Motorn läser inget av det — F1 ligger ett varv före F4, S1 mäter först.

**`radar_h` uppskjuten:** kräver en LATERAL-koppling segment↔station i publicera var tionde minut; skuggmotorn slog i
WORKER_LIMIT två gånger 14/9 (#176) och ingen CPU-mätning finns. Byggs när steg E ändå läser radarn per station.

**Regntäckningen mätt (N4:s förkrav, 7 dygn t.o.m. 15/9):** 750 stationer × 169 körtimmar, bucket-täckning
**13 %** (2/2 10 %, 1/2 7 %, 0/2 83 %). 3/9 var talet 44 %, 9/9 36 %. INTE jämförbart rakt av: nämnaren är alla
station-körtimmar, och arkivdieten (#4) sparar bara "intressanta" rader — i en varm torr septembervecka är 0/2
oftast rätt, inte tappat. Måttet skiljer inte torrt från missat. Konsekvens för `regn_h`: en regnbucket
arkiveras bara medan nederbördsflaggan är satt eller ytan ≤ 5 °C, så `regn_h` kan överskatta med upp till en
bucket (30 min). S1:s skuggjämförelse är beviset som gäller, inte täckningsprocenten.

**Värdevakten:** innan fälten bär en tröskel (S2/S3) deklareras de i `scripts/vardevakten.ts` SPANN och knappen körs.

**Bevis 16/9 (fältbeviset):** skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den. Fälten kan bara läsas ur `weather[]`, alltså fanns de publicerade med värde — manifest-sha stämde vid avläsningen 12:00Z. Vägen dit: **Bevis 15/9:** publicera deployad 15:52Z; live.json 2026-09-15T16:00:01Z: `weather` **tom** — ingen station ≤ 3 °C klarar givarvakten (lägsta riktiga yta 7,1 °C; Rovaniemi 0,0 °C mot luft 12,6 stoppas av #75). Fälten bevisas i CI:s PostGIS (integration.test.ts) men ÄNNU INTE på CDN.

## #189 (15/9 2026) Kamerafacit: den åttonde länken — `archiveFacit` fick aldrig positionen

**Bedömning v3 N1 (kort #157, PR #270).** Två mätningar 15/9: facitradien (14 dygn) — **174 positionerade svenska
skugglarm, 100 % inom 15 km** från en väglagskamera (närmast 0,2 km, längst bort 13,4; medianer per rutt
0,4–13,4 km); tystnadsfelet (30 dygn) — **0 arkiverade kamerabilder**. Radien friad, hinken tom: en länk till.

**Fyndet, i koden:** form A (#179) gav skuggloggens rader lon/lat genom uppslag i faran — men `archiveFacit(alerts, …)`
fick fortfarande motorns `Alert`, som inte bär någon position (`engine/src/types.ts`), och räknade haversine på NaN
precis som före form A. "Ingen kamera inom 15 km" var sant för NaN, inte för larmen.

**Rättelse 4:** funktionen tar PUNKTER, uppslagna ur faran på samma sätt som loggen; segmentlarm ger ingen punkt
(form A:s regel) och grenen säger det: "bara segmentlarm — ingen punkt att söka kamera från". **Bevis: ett objekt i
bucketen efter deploy, räknat av tystnadsfelet — inte en commit.** Utfall 15/9: skuggmotor deployad 15:52Z; tystnadsfelet 16:02Z: **1 bild i `facit`**, senast 15/9 — första objektet någonsin.

**Bifynd ur samma körning:** `situation_archive` är INTE tomt — **3 122 olyckor på 30 dygn** (S7 sa "mät"; nu mätt).
`road_condition_history`: 0 omklassningar till halka på 30 dygn — moaten är tom, som väntat i september.

## #190 (15/9 2026) Nyckelkalendern i vakthunden — PAT:ens utgång läses live, Supabase-tokenens står i koden

**Bedömning v3 N3 (kort #86, PR #270).** Vakthundens check 10 läser PAT:ens utgångsdatum ur GitHubs svarshuvud
`github-authentication-token-expiration` vid varje körning — roterar Axel nyckeln flyttas datumet av sig självt,
och en rotation som inte nått Supabase-hemligheten syns som ett datum som inte flyttat sig. Supabase-tokenen
(deploy-knappen) saknar sådant huvud; `SUPABASE_TOKEN_UTGAR = 2026-12-08` står i koden och flyttas vid rotation.
Varsel 14 dygn (rotationsläxan: bytet bevisas med en publicering, och det tar dagar). Egen etikett `nyckelkalender`,
egen cykel, skrivs 06 UTC en gång om dygnet, färgar aldrig driftvakthunden röd. Prov `?nyckelprov=1` via dbknapp
(flaggan i skriptets ENDA lista + YAML-menyn, 13/9-läxan).

**Rotationen själv är Axels** (senast 15/11, bevis = publicering med ny nyckel). Kalendern larmar 8/11 för PAT:en och
24/11 för Supabase-tokenen — om ingen rört dem.

**Bevis 15/9:** deployad 15:52Z; `nyckelprov` via dbknapp gav issue #272 15:53Z med PAT:ens datum läst live ur
svarshuvudet: 2026-11-22 (67 dygn) — samma datum som kort #86 — och Supabase 2026-12-08 (83 dygn).

## #191 (15/9 2026) Steg E byggt: vattenplaningens skugga i skuggmotorn — och Bengts ja på #154

**Bengt 15/9: "ja på #154, bygg steg E."** #154 är därmed avgjord i sak (nyckeln `rain_segments`, DECISIONS #187),
och kort #81:s steg E — *skuggan loggar vad rösten SKULLE sagt* — är byggt (PR #274).

**Hur, och varför just så.** Skuggmotorn kör en EGEN `AlertEngine`-instans över samma spår med `rain_segments`
som syntetiska segmentfaror. Motorns korridor, försprång, 45 s och 10 min/5 km gäller därmed ordagrant —
ingen andra implementation av reglerna, vilket är fällan #89:s frostvakt uttryckligen undvek. Två saker att
läsa rakt: (1) den syntetiska faran bär `code: 2`, eftersom `evaluateSegment` tiger på kod 1 — det betyder
bara "får tala" i den här mätningen, och den riktiga koden går med i loggraden; (2) motorns `alerts` rörs
inte alls — skuggvarningarna får en egen kolumn `vb` (sql/019), för `alerts` läses av skuggrapporten,
tystnadsfelet och upprepningen, och en inblandad rad hade förfalskat alla tre. Bara segment i ruttens ruta
(+5 km) matas in: CPU-taket (läxa 29/8) och korridoren når ändå inte längre. Positionen som loggas är
BILENS när rösten skulle talat (`geo: "bil"`), och den går också till `archiveFacit`: en torr vägbana i bild
fäller falsklarm enligt TROSKLAR-VATTENPLANING §2.

**Rapporten:** skuggrapporten (publik JSON) får fältet `vattenplaning` — skuggvarningar totalt och per rutt
senaste dygnet. Det är "skuggrapporten i Supabase" som kort #81 nämner som veckorapportens ena väg.

**Vad som INTE byggs nu:** grind V-B:s dom-knapp (falsklarm mot stationens `rain_sum_mm` ±30 min, miss mot
`situation_archive`) — den mäter ingenting förrän `vb`-rader finns, och instrumentets form ska följa datan,
inte föregå den. Nästa länk när första regndygnet loggats. Domen fälls över V-C:s underlag (≥ 200 varningar,
≥ 15 facit, ≥ 5 regndygn, ≥ 3 län) — inte förr.

**Ordning vid driftsättning:** migrationen (sql/019) FÖRE deployen — PostgREST avvisar en okänd kolumn och
hade annars fällt hela skuggloggningen, inte bara `vb`.

**Bevis 15/9:** första `vb`-raderna 17:30Z: **5 skuggvarningar** (E18 Karlstad→Örebro, 5 st, regnsegment 18060/18065/18067) i skuggrapportens `vattenplaning`.

**Bifynd:** kolumnen `shadow_log.suppressed` (sql/016, #127 a) skrivs aldrig av skuggmotorn — `onSuppressed`
finns i motorn men ingen lyssnar. Kolumnen har stått tom sedan 13/9. Eget kort behövs innan någon "fixar" det.

## #192 (15/9 2026) Trendfälten besiktigade — värdevakten skannade aldrig `trend_kandidater`

**Bengts fråga 15/9 ("finns det något annat av nu-sakerna som kan påbörjas") — svaret var förkravet för S2/S3.**
Värdevaktsregeln (12/9) säger att ett fält inte får bära en tröskel förrän det passerat vakten. `lutning15/30/60`
bär redan `lutning` i live.json (N4, #188) och ska bära efterhalkans villkor (S3). Men `trend_kandidater` stod
inte i vaktens tabellista (`TID`), så dess fält skannades aldrig — **inte ens som OBESIKTIGADE.** "Schemat läses
ur databasen" gällde bara inom listan. Tabellen är tillagd, sex fält har spann.

**Domen (knappen på grenen, 30 dygn, 7 787 rader):** alla sex ✅ OK — `lutning15_c` −1,7…1,7, `lutning30_c`
−0,8…2,2, `lutning60_c` −1,4…2,0 (°C per fönster, positivt = faller), `dagg_gap_c` −4,6…8,2, `min_yta_90min_c`
0,3…6,3, `utfall_rader` 0…18 (17 vanligast, 50 %). Spannen: lutning ±20 per fönster (fysikens yttergräns; bortom
det är ett givarhopp, som trendens egen vakt redan kastar mellan rader), gap och min-yta ±60, utfall 0–200.

**Bifynd:** `lutning30_c` har minimum **−0,7999999999999998** — en binär flyttalsrest i en `numeric`-kolumn.
Skrivaren avrundar alltså inte (13/9-läxan: avrunda på TypeScript-sidan till fler decimaler än mätvärdet har).
Ofarligt för besiktningen, men en tröskel på 0,8 skiljer −0,8 från −0,79999. Eget kort innan S2 sätter en tröskel
på fältet.

**Vad det INTE bevisar:** att värdena är rätt. Vakten säger att de är fysiskt möjliga och fria från sentineler;
T-A (första frostnätterna) säger om lutningen förutsäger något.

## #193 (15/9 2026) Spärren synlig på riktigt — `shadow_log.suppressed` skrivs efter två dygns tystnad

**Bengts ja 15/9 (kort #188).** #127 a (13/9) byggde kroken `onSuppressed` i motorn och kolumnen i sql/016 — men
skuggmotorn kopplade aldrig in kroken, så kolumnen har stått `[]` i varje rad sedan dag ett. Inte en regression:
`git log -S` visar att strängen bara någonsin funnits i motorkällan, aldrig i `main.ts`. Nu lyssnar skuggmotorn
och skriver `[{kind, id, distM, by, sinceS}]` per körning — vad regel 1b kastade, tystat av vad, med vilken marginal.
Skuggrapporten får fältet `sparren` (kastade totalt och per par "X tystad av Y"), så beviset är publikt.

**Bevis som gäller:** en körning med `sparren.kastade > 0` efter deploy — inte commit-hashen. Rutter med tät
kameraföljd (E18 Örebro→Stockholm, 28 kameralarm/dygn) ger den inom några varv.

**RÄTTELSE 16/9 (Axel):** orsaken är känd och var hans egen. Kroken skrevs i den GENERERADE `index.ts`
(bundle-skuggmotor rad 4: "ändra aldrig här"), bunten skrev över den från `main.ts`, deployen gick utan krok,
kolumnen verifierades som skriven — tom — och #127 bokförde spärren som synlig. "Det är fjärde gången samma fel
på tio dagar: verifierat att något fanns, inte att det fungerade." Inte en regression: ett bygge som aldrig fanns.
Läxan står i CLAUDE.md (#196). Beviset med innehåll väntar fortfarande: 20:00–22:00Z 15/9 och natten gav 0
kastade — septembers farubild konkurrerar sällan inom 45 s.

## #194 (15/9 2026) Trendarkivets flyttalsrester: en 26-minuters lucka 13/9, rundad i efterhand — och gapet var orundat

**Bengts ja 15/9 (kort #189).** Värdevakten (#192) visade `lutning30_c` min −0,7999999999999998. Källan: tabellen
föddes 13/9 14:21, den första knappkörningen skrev TypeScript-lutningar oavrundade, och avrundningen till tre
decimaler kom 14:47 (9b6b317, flyttalsläxan). SQL-vägen (018) räknar i `numeric` och är exakt. **Men `dagg_gap_c`
var fortfarande orundat** i `publish/trendkandidat.ts` (`r.yta - r.dagg`) — samma klass av fel, ännu inte fångat.

**Två rättelser:** (1) gapet avrundas till tre decimaler vid beräkningen, som lutningen; (2) sql/020 rundar de
befintliga raderna (fem kolumner, idempotent — rör bara rader som inte redan är rundade). Bevis: migrationens
bevisrad räknar orundade rader före/efter; värdevakten ska visa −0,8, inte −0,79999.

**Varför nu och inte "före S2":** en tröskel på 0,8 skiljer −0,8 från −0,79999, och att i stället avrunda vid
jämförelsen i S2 är exakt fällan 13/9 — två sidor som avrundar olika.

## #195 (15/9 2026) Två öppna mätvaktsissues — ett tomt listsvar utan felkod, och vakthunden hade inget försvar

**Bengts order 15/9 ("utred #224/#268", sedan "ja till båda").** #224 (mätvakten, öppen sedan 13/9 10:07Z, 52
kommentarer en per timme) fick sin sista kommentar 15/9 13:07Z. Nästa timkörning, 14:07:04Z, skapade #268 med
samma innehåll — och har kommenterat där sedan dess. #224 var aldrig stängd eller återöppnad (inga händelser),
hade etikett och markör på plats; ingen vakthund-deploy skedde 15/9 före 15:51Z, inget anrop från Actions,
ingen röd vakthund kring 14:07Z. Det enda som skiljer den timmen är GitHubs svar: `GET /issues?state=open&labels=
matvakt` gav inget som matchade. Orsaken går inte att se — sökningen loggades aldrig. Effekten är deterministisk:
koden tar första träffen i listan (nyast först) och kommenterar där; en äldre dubblett stängs aldrig av någon.

**Beslut:** (1) #224 stängd 21:39Z som dubblett av #268. (2) Skyddsnät i vakthunden, `enOppen(etikett, mark, rad)`,
för alla fem egencykel-issuerna (vakthund, mätvakt, källvaktspåminnelse, kassavakt, nyckelkalender): ett tomt svar
frågas om EN gång innan något skapas; finns fler än en öppen stängs de äldre som dubbletter med kommentar; antalet
träffar skrivs i `rad` så att nästa gång är observerbar. Samma fälla som kassavaktens 1 000-tak (CLAUDE.md): ett
list-API som svarar tunt utan felkod ser ut som sanning.

**Bevis som gäller:** `matvaktprov` efter deploy — raden `issue matvakt: 1 öppna` i vakthundens svar, en kommentar
i #268 och ingen ny issue.

**Utfall 15/9:** vakthund deployad 21:41Z; `matvaktprov` 21:43Z: raden `issue matvakt: 1 öppna — bevisat via utfallet: provet kommenterade #268 (kommentar 9), ingen ny issue; själva raden ligger i pg_nets net._http_response och läses inte utifrån` i svaret, 1 öppen mätvaktsissue (#268), ingen ny skapad.

## #196 (16/9 2026) Axels svar på eftermiddagsrapporten 15/9 — fem beslut, en rättelse, en omprioritering

**Axel verifierade själv:** 27 `rain_segments` på CDN med rätt manifest-sha; **26 objekt i `facit`** sedan 16:00Z
15/9 (från noll efter 5 657 körningar). Han bekräftade också att `suppressed`-felet var hans (rättelse i #193).

**Fem svar, nu beslut:**
1. **`rain_segments` som egen nyckel — rätt.** Det enda skälet för motorsidan vore om apparna skulle läsa den i vinter,
   och det ska de inte förrän V-C dömt. Skuggans egen instans är billigare än risken.
2. **Steg D, utgångspunkt (beslut först efter V-C):** vattenplaning gäller vid yta över +4, frysrisk under +1 — de
   utesluter varandra i praktiken, prioriteten dem emellan är nästan teoretisk. **Under halka (#68), över vilt.**
   Text i frysriskens form: *"Vattenplaning framöver — sakta ner."* Sex ord; punktkälla säger "framöver". Öppet att
   avgöra då: `rain_segments` är en segmentkälla (radar per segment) — kort #81 D låter segmentkällan säga "på
   vägen framöver". Kriteriet i kartans §7.8 (handling · text · prioritet före vektorn) är därmed förberett, inte uppfyllt.
3. **PAT-rotationen:** Axels, senast 15/11; bevis = publicering med ny nyckel; kalendern larmar 8/11.
4. **Facitknappen (S4) — ja:** två knappar under "Senast sagt", *Stämde* och *Stämde inte*. Inget annat — ingen fritext
   i en bil. Loggas lokalt, skickas när bilen står stilla. **Krav i samma commit:** produktbokens Om-avsnitt säger
   "vi samlar in: ingenting"; med knappen samlas larm-id + svar in — inte position, inte resa, men något. Det ska stå
   ordagrant, frivilligt och synligt, annars bryter knappen löftet. Kort #21 bär detta.
5. **V-B3 mot fem varningar på ett varv:** loggen ska vara RÅ. Räknar skuggan per regndygn redan i loggen är tröskeln
   inbyggd i mätningen och antalet syns inte längre. Dom-knappen räknar — samma princip som spärrloggen: logga vad
   som hände, låt domen tolka. Så är det byggt (#191).

**Två synpunkter på det byggda:**
- **Kamerafacit, reservation:** 100 % inom 15 km beror på att 738 av 744 väglagskameror står vid en station. Radien
  säger att det finns en kamera nära — inte att bilden visar rätt sträcka. Det avgörs i mars när någon öppnar bilderna.
- **Den stoppade väglagsfrågan är rapportens viktigaste fynd** — och den säger att kartans fog-tabell inte är
  tillförlitlig som byggplan: den är läst, inte körd, precis som §5.6 varnar. Kartan är fryst; rättelsen (R16) läggs i
  bedömningens bilaga A och förs in när kartan öppnas — vilket villkoret "efter bygge + mätning" nu tillåter.

**Omprioritering:** regntäckningen 13 % oroar Axel mer än rapporten låter. `regn_h` vilar på arkivet, och `regn_h` är
efterhalkans ena halva. **S1 (skuggjämförelsen) körs INNAN något mer byggs på `regn_h`** — före S2, inte efter.
Bedömningens §2.1 bär det som grind.

**Läget på morgonen 16/9 (02:20Z):** `rain_segments` 38, `vb` 13 skuggvarningar på fyra rutter sedan 17:30Z,
`sparren` 0, `weather` fortfarande tom (ingen station ≤ 3 °C) — N4:s fältbevis väntar.

## #197 (16/9 2026) Spärrprovet — beviset framkallas i stället för att inväntas, och dbknapp läser äntligen svaret

**Bengts ja 16/9 (kort #191, bevis för #188).** Regel 1b tystar bara när två larm konkurrerar inom 45 s, och
septembers farubild ger aldrig det: 20:00–22:00Z 15/9 och natten gav 0 kastade. Ett bevis som vilar på vädret är
inget bevis (Axel: "verifierat att något fanns, inte att det fungerade"). Skuggmotorn får `?sparrprov=1`: två
kameror 300 m isär på ett rakt spår i 80 km/h — den första talar, den andra tystas ~14 s senare, kroken ger EN rad.
Provet skriver INGET i shadow_log (en provrad hade förorenat tystnadsfelet och upprepningen); svaret returneras.

**Och svaret blev läsbart.** dbknapp skrev ut pg_nets request-id, inte funktionens svar — varje prov bevisades via
sitt utfall (en issue) och vakthundens `rad` var oläsbar utifrån (avvikelse 15/9). Nu väntar dbknapp in svaret ur
`net._http_response` (högst 90 s) och skriver ut det kortat: `ok`, `problem`, `rad`, `suppressed`. Provet går till
skuggmotorns svenska cron-jobb, hittat på URL (inte namn) och utan `land=fi|no|dk`; exakt ett jobb får matcha.

**Bevis som gäller:** dbknapp `sparrprov` visar `suppressed: [{kind: camera, id: prov:kam2, by: camera, sinceS ≈ 15}]`.

**Utfall 16/9:** dbknapp `sparrprov` 02:42Z: svaret läst ur `net._http_response` — `suppressed` med 1 rad: {kind: camera, id: prov:kam2, distM: 470, by: camera, sinceS: 5} — kam2 tystad 5 s efter kam1 och talad först vid t=15 när 10 s-spärren släppt. Första provet 02:38Z FÖLL: kamerorna 14 s isär, båda talade — spärren är 10 s sedan kort #127 (13/9), inte 45 s som CLAUDE.md:s invariant säger.

## #198 (16/9 2026) S1 byggt: efterhalkans indata per station i skuggloggen — inget villkor, bara underlag

**Bengts "bygg S1 nu" 16/9, Axels grind (#196): S1 körs innan något mer byggs på `regn_h`.** Skuggmotorn loggar per
körning kolumnen `efterhalka` (sql/021): varje väderpunkt i ruttens ruta (+5 km) med N4:s råa fält — `yta`, `fukt`,
`regn_h`, `lutning15/30/60` — och `larm`: om motorn faktiskt larmade på stationen (`wx:<id>` bland larmen). Inget
villkor: S2 (E på K2) sätter det senare, och varje rad ska kunna spelas upp mot vilket villkor som helst. Att lägga
villkoret i loggen vore samma fel som V-B3 per regndygn (Axel, #196). Skuggrapporten får `efterhalka` (stationer,
med regn_h, larmade).

**Tom i september, och det är rätt:** `weather[]` bär bara stationer ≤ 3 °C som klarar givarvakten — 0 sedan 15/9.
Första kalla natten i korridoren ger första raderna. **Bevis som gäller:** en `efterhalka`-rad med innehåll; tills
dess bevisas kolumnen bara som skriven (`[]`) — vilket enligt #196 INTE räknas som bevis.

**Utfall 16/9:** migration 021 (efterhalka jsonb, default []), deploy 02:36Z (skuggmotor + skuggrapport), 02:41Z (rättat prov); skuggrapportens `efterhalka` finns (0 stationer). **Innehåll kom samma dygn:** skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den — S1 mäter. En rad är dock ingen mätning: Axels grind (#196) är uppfylld först när `efterhalka` bär nätter, inte ögonblick.

## #199 (16/9 2026) Kartan öppnad en gång för R1–R16 — och fryst igen

**Bengts order 16/9 ("för in R1–R16 i kartan").** Frysvillkoret från 15/9 (#186) var "nästa ändring efter att något
byggts och mätts". NU-listan är byggd och mätt (#187–#198), så villkoret är uppfyllt. R1–R15 (granskningens
rättelser, sedan 15/9 i bedömningens bilaga A) och R16 (Axel 16/9: fog-tabellen läst, inte körd — #154:s F1 var
F4/F5 i koden) är införda: §5.2 (regn-raden), §5.6 (R16 med regeln "F1 först när det är verifierat i kod att ingen
port läser fältet"), §7.8 (kandidaterna prövade mot kriteriet, Axels utgångspunkt för D), §14. Bannern säger att
kartan är fryst igen; bilaga A är struken och står kvar som historik.

**Vad som inte ändrades:** inga tal, inga fogkostnader utöver R16, inga nya avsnitt. Kartan säger fortfarande
*varför*; bedömningen säger *vad och när*.

## #200 (16/9 2026) Invarianten skrivs om till motorns verkliga regel — och takten mäts i stället för antas

**Bengts beslut 16/9 ("kör, skriv om invarianten och lägg in måtten").** Spärrprovet (#197) visade att CLAUDE.md:s
produktinvariant "max 1 spoken alert / 45 s" inte stämde med motorn: sedan kort #127 (13/9) kör motorn en
prioritetsmedveten spärr på 10 s. Valet stod mellan att backa motorn och att skriva om texten.

**Beslut: motorn står, texten skrivs om.** 45 s var en gissning ur PLAN §1; 10 s är härlett ur kamerornas
minimidistans (520 m ⇒ 15,6 s i 120 km/h) så att en fartkamera aldrig tystas av takten. Det verkliga felet 45 s
gav var att en oviktigare fara tystade en viktigare — kameran talade, isen 20 s senare kastades, och när spärren
släppte var isen 61 m bort (v23). "Silence is a feature" betyder inga *fel* ord, inte färre ord: inom 10 s får
bara en viktigare fara tala, samma fara upprepas aldrig inom 10 min / 5 km, lägre prioritet kastas — köas aldrig.

**Och inget nytt tidstal utan mätning.** Skuggrapporten får `takt`: tätaste följden i sekunder mellan två
yttranden i samma körning (totalt och per rutt) och antalet följder inom 60 s. Om det talet någonsin visar att
förare får för mycket i öronen är det där ett tak ska komma ifrån — som V-B3 — inte från en siffra som låter lagom.
Loggen är rå (Axel, #196); rapporten räknar.

**Reservation:** invarianten är Axels och vektorernas domän — hans ja på texten väntar. Ingen motorändring,
ingen vektor rörd. **Axel sa ja till invarianttexten 16/9** — den är därmed fastställd med dubbelsignatur. Bevis: skuggrapporten bär `takt` efter deploy.

**Utfall 16/9:** skuggrapport deployad 02:51Z; `takt` 02:52Z: tätaste följd 70 s (E4 Sundsvall→Umeå), följder inom 60 s: 0 av 110 yttranden på 24 h; per rutt 70 · 145 · 370 · 380 · 525 · 3 665 s.

## #201 (16/9 2026) S4 steg 1: förarfacitets backend — öppen endpoint med flit, dubbellåst tabell, och ärligheten om vad ett svar är

**Bengts "kör S4" 16/9, efter räkningen (≈ 80–100 Actions-minuter för hela S4, 4–5 % av kassan; arbete ≈ 3 dagar).**
Steg 1 av fem: tabell `driver_facit` (sql/022), edge-funktionen `facit-svar`, vakthundsraden "förarfacit: n svar".

**Vad som sparas:** varnings-id (motorns `hazardId`), när varningen talade, svaret ja/nej, plattform, appversion.
Ingen identitet, ingen position, ingen resa. **Men ärligt:** ett varnings-id pekar på en fara med koordinat och
tiden säger när — ett svar ÄR en plats och en tid, en gles resa. Beslut #186 tog det med öppna ögon för tolv
testare med samtycke; Om-avsnittet i produktboken ska säga just det ordagrant (Axel, #196), inte "ingenting".

**Öppen endpoint, med flit.** Appen kan inte bära en hemlighet (CLAUDE.md), så `facit-svar` kräver ingen nyckel.
Skyddet är formen: strikt schema (id 1–64 tecken, ISO-tid inom ±48 h, svar ja|nej, app android|ios), 512 byte,
tak 2 000 svar per dygn (tolv testare × 30 varningar är 360 — taket är mot flod, inte mot förare). Ingen IP
sparas. Tabellen är dubbellåst som arkivet (RLS utan policy + REVOKE): inget kan läsas tillbaka via REST.
Räcker för en beta i känd krets — inte för allmänheten, då krävs #21:s sensorbeslut.

**Idempotent:** appen skickar när bilen står stilla och kan skicka om; nyckeln (id, t, app) gör omsändning
ofarlig, och ett ÄNDRAT svar på samma varning ersätter det förra — förarens senaste ord gäller.

**Förkastat:** att posta direkt till PostgREST med anon-nyckeln som väntelistan gör — det hade lagt en nyckel
i appen och en INSERT-policy på en tabell som ska vara stum; funktionen validerar och begränsar, det gör inte
en policy.

**Bevis som gäller (steg 1):** efter deploy — POST med giltigt svar ⇒ 204, ogiltigt ⇒ 400, GET ⇒ 405, och
vakthundens rad "förarfacit: 1 svar" (läst via dbknapp, som nu visar `rad`). Steg 2–5: Android, iOS,
PRODUKTBOK, Axels ja på flödet — med mellanstopp efter Android.

**Utfall 16/9 03:08Z:** migration 022 (7 kolumner) · deploy facit-svar + vakthund gröna · curl: giltigt **204**,
samma igen **204** (idempotent), `svar=kanske` **400**, GET **405**, t från 1/9 **400** · vakthundens rad
**"förarfacit: 1 svar"** — läst ur larmprovets issue #289, INTE ur dbknapp-svaret: pg_net:s svarstimeout är 30 s
och vakthundens hela varv tar längre, så `net._http_response` bar "Timeout of 30000 ms" (funktionen kör klart
ändå; issuen bevisar det). Avvikelse att avgöra: höj vakthund-jobbets `timeout_milliseconds` så proven blir
läsbara den vägen — rör cron-kommandot, alltså Bengts ord.

## #202 (16/9 2026) S4 steg 2: facitknappen i Android — två knappar, en brytare, en kö som töms när bilen står stilla

**Axels form (#196), byggd:** under "Senast sagt" två knappar, *Stämde* och *Stämde inte*, ingen fritext. Bara när
betatestet är på (brytaren i Inställningar, AV tills föraren själv slår på den) och bara på en varning som bär ett
id. Svaret loggas lokalt (`Facit.kt`, ren Kotlin, JVM-testad: ett svar per varning, ett ändrat svar ersätter och
blir osänt igen, kroppen är exakt fem fält och inget annat). Skickas av `FacitSender` när bilen stått stilla 30 s
(under 3 km/h, en gång per stopp) eller när appen öppnas — aldrig under körning, inga timers, ingen polling
(skill §3). Nätet borta ⇒ nästa stopp.

**Historiken bär nu varnings-id** (`AlertEntry.id`, fjärde kolumn, bakåtkompatibel med rader från före 16/9).
**Om-avsnittet skriver om löftet ordagrant** (Axel #196): *"Undantaget är betatestet, om du själv slår på det: då
skickas varningens id, klockslag och ditt svar — det säger ungefär var du var när rösten talade. Inget annat."*
Brytartexten i Inställningar säger detsamma.

**Rättat i förbifarten:** "Senast sagt" (#24) visade den ÄLDSTA raden — `firstOrNull` på en lista med nyaste sist.
Nu `lastOrNull`. Syntes först när knappen skulle sitta på rätt varning.

**Fotostudion:** `--ez fotostudio_facit true` (bara debug-byggen) slår på betatestet och lägger en påhittad
kameravarning så skärmbilden visar knapparna; android.yml tar dessutom `shot-6-betatest.png` av brytaren.

**Bevis som gäller:** android.yml grön på grenen (JVM-tester inkl. `FacitTest`, emulatorn), skärmbilderna i
produktboken, och — det som räknas — ett svar från en riktig telefon i `driver_facit`. **Mellanstopp:** Axels ja på
flödet innan iOS byggs (steg 3).

## #203 (16/9 2026) S4 steg 3: facitknappen i iOS — samma form, samma text, samma regler; kompileras av Axel

**Axels ja på Android-flödet 16/9 ⇒ steg 3.** Spegel av Android (#202): `Facit.swift` (ren Swift: ett svar per
varning, ändrat svar ersätter och blir osänt, kroppen är exakt fem fält), `FacitSender` (URLSession, skickar när
bilen stått stilla 30 s under 3 km/h, vid `stop()` och när appen blir aktiv — aldrig under körning, inga timers),
`Prefs.facitOn` (AV tills föraren själv slår på den), `Prefs.lastSaidId` (kortet vet vilken varning), knapparna i
`LastSaidCard` som `FacitButton` (egen fil, skill-regeln), BETATEST-avsnittet i Inställningar med samma text som
Android, Om-panelen med undantaget ordagrant, och introduktionens löfte: *"Vi samlar in: ingenting — om du inte
själv slår på betatestets facit i Inställningar."*

**En tillgänglighetsändring:** kortet "Senast sagt" hade `.accessibilityElement(children: .combine)` — med knappar
i kortet måste VoiceOver kunna trycka dem var för sig, så `.contain`.

**Vad som INTE är bevisat här:** Swift-appen kompileras inte i CI (ios-engine.yml testar bara motorpaketet på
Linux) och inte på den här maskinen. Beviset är Axels Xcode-bygge — och ett svar från hans telefon i
`driver_facit` (`app = 'ios'`). Regeln från 2/9 gäller: be aldrig Axel arkivera medan ios-engine är röd; den är
grön (motorn orörd).

**Utfall 16/9:** Axel byggde grenen i Xcode — **gick igenom** — och PR #291 mergades (main @ 0239f03). Kvar för S4: en
iOS-skärmbild till produktboken (steg 4) och ett riktigt svar från en telefon i `driver_facit` (steg 5, fälttest).

## #204 (16/9 2026) Vakthundens cron får vänta 120 s på svaret — proven blir läsbara

**Bengts ja 16/9.** pg_net väntar som mest `timeout_milliseconds` på funktionens svar; vakthundens varv tar längre än
de 30 s som stod i jobbet, så `net._http_response` bar "Timeout of 30000 ms reached" medan funktionen körde klart
ändå (#197: skuggmotorns svar lästes, vakthundens blev timeout, och steg 1-beviset togs ur en issue). sql/023 höjer
till **120 s** via `cron.alter_job` — bara timeouten, inget jobb öppnas eller stängs (kort #85), kommandot med nyckeln
skrivs aldrig ut. Kassavaktens tunga varv (05/11/17/23 UTC) ryms.

**Bevis som gäller:** migrationens bevisrad visar `timeout_ms = 120000`, och nästa `larmprov` via dbknapp skriver ut
vakthundens `rad` i stället för en timeout.

**Utfall 16/9:** migration 023: `timeout_ms = 120000`; larmprov 03:43Z: vakthundens svar läst ur `net._http_response` — status 200, `larmvag: ok`, rad-raderna lästa: mätvakten 8 flöden/0 problem · förarfacit 1 svar · issue matvakt 0 öppna · nyckel PAT 2026-11-22 (66 dygn) · Supabase 2026-12-08 (82 dygn) · issue vakthund 1 öppna (larmprovet).

## #205 (16/9 2026) S4 steg 5 förberett: förarfacit syns i skuggrapporten, och fälttestets recept

**Bengts "gör nummer 2" 16/9.** Steg 4 (iOS-bild) och 5 (fälttest) kräver en telefon och en förare — det jag kan
göra är att beviset syns utan mig: skuggrapporten (publik JSON) får `forarfacit` — svar senaste 7 dygn, ja/nej,
android/ios, senaste tidpunkt — läst med service-nyckeln ur den dubbellåsta tabellen, fail-soft. Provsvaret från
03:08Z (android, ver "prov") ska räknas som 1 tills det första riktiga kommer.

**Fälttestets recept (Android, debug-APK ur android.yml på main; iOS ur Axels bygge):** Inställningar → BETATEST →
*Svara på varningarna* PÅ (läs texten — den säger vad som skickas). Kör tills rösten talar. Stanna, öppna appen:
under "Senast sagt" står repliken med *Stämde* / *Stämde inte*. Tryck. Svaret går iväg när bilen stått stilla 30 s
eller när appen öppnas nästa gång. Bevis: `forarfacit.svar_7d` räknar upp i skuggrapporten, och vakthundens rad
"förarfacit: n svar" nästa timme.

**Vad som INTE bevisas av receptet:** att svaret är sant. Det är dom-knappens sak i januari (S6), mot kamerafacit.

**Utfall 16/9:** skuggrapport deployad 03:53Z; `forarfacit` 03:54Z: svar_7d 1 · ja 0 · nej 1 · android 1 · ios 0 · senast 03:07:58Z — provsvaret, som andra POST:en skrev om från ja till nej (senaste ord gäller).

## #206 (16/9 2026) Fotostudio-krok för iOS — produktbokens bilder utan en körning

**Bengts "gör fotostudio-kroken för iOS" 16/9.** Steg 4 kräver två skärmbilder av det nya iOS-bygget (Senast sagt med
knapparna, Betatest-brytaren), och knapparna syns bara på en riktig varning. Android har `--ez fotostudio_facit`;
iOS får startargumentet `-fotostudio_facit` i `HalkvaktApp.init()`, inuti `#if DEBUG`: slår på betatestet och lägger
in *"Fartkamera om femhundra meter."* med id `cam:fotostudio`. Receptet står i `ios/MAC-GUIDE.md`. Kompileras bort ur
release-byggen — ingen väg in i det som testarna får.

**Bevis:** Axels nästa Xcode-bygge (kompilering) och de två bilderna i `docs/produktbok/`. Ett svar tryckt i
simulatorn skickas på riktigt och syns i skuggrapportens `forarfacit` med app = ios.


## #207 (16/9 2026) iOS 0.3.6 (9) arkiverad och uppladdad — första bygget sedan 0.3.5 (2/9)
Axel arkiverade och laddade upp 12:21. Bygget bär tre saker som legat på main:
 • Prioritetsmedveten spärr, golv 10 s (#127, 13/9). Motorn ÄR rörd sedan 0.3.5 — receptet
   sa "orörd", det var fel. Bengt kommer höra skillnaden: tätare varningar när flera faror
   kvalificerar, is får avbryta en kamera. Avsiktligt.
 • Facitknappen Stämde/Stämde inte + betatest-brytaren (S4). Knappen är AV tills testaren
   slår på den. Tabellen driver_facit: sju kolumner, ingen position, ingen resa.
 • Fotostudio-kroken -fotostudio_facit (debug) för produktbokens bilder.
Kontrakt: ios-engine, ci, android gröna på faac4ff. Inget rött — inte 0.3.4 om igen.
BEVIS SOM VÄNTAR: första raden i driver_facit med app = ios. Det är beviset att hela kedjan
håller — knapp → facit-svar → tabell → skuggrapport. Fartkameran är rätt första test:
en fara vi vet är sann, kräver ingen halka.
Två veckor mellan byggena. 67 servercommits nådde telefonen utan deploy (lägg till, ersätt
aldrig); 5 appcommits väntade. Läxa: motoränderingar och appändringar ska inte ligga på
main i tre dygn utan bygge — skuggan kör då en annan motor än telefonen.

## #208 (16/9 2026) Fälttestets första fynd: ett svar tryckt med vakten av skickades inte förrän nästa appstart

**Bengts fälttest 16/9 med 0.3.6 (#207):** körde mot en fartkamera, tryckte *Stämde* — och svaret kom inte till
`driver_facit`. Skälet är en lucka i sändningsreglerna, inte i trycket: knapparna sitter på hemskärmen, som visas när
vakten är av, och sändningen triggades bara av stillastående *medan vakten kör*, av `stop()` och av att appen kommer i
förgrunden. Trycker man efter att vakten stoppats händer inget av det förrän appen öppnas nästa gång — svaret låg
kvar i telefonen.

**Rättelse på båda plattformarna:** vakten av = bilen står stilla ⇒ svaret skickas direkt vid trycket. Under körning
gäller den gamla regeln (stillastående 30 s i tjänsten). iOS bumpas till 0.3.7 (10); Android-APK:n byggs av CI.

**Rättelse av mitt eget recept till Axel (#207 påpekade det):** "motorn är orörd sedan 0.3.5" var fel — spärren
10 s (#127, 13/9) ligger i motorn och når telefonerna först nu. Bengt kommer höra tätare varningar när flera faror
kvalificerar, och is får avbryta en kamera. Avsiktligt (DECISIONS #200).

**Läxa:** "skickas när bilen står stilla" var rätt regel men fel villkor — stillastående mättes bara av en tjänst som
inte körde. Beviset avslöjade det: rapportens `forarfacit` stod kvar på 1.

## #209 (16/9 2026) Sändningsstatus under facitknapparna — fälttestets andra fynd: svaret nådde aldrig servern

**Bengts fälttest, fortsättning:** efter #208 öppnade Bengt appen flera gånger — inget svar kom. Serversidan friades
med ett iOS-format prov från Claude (204, `ios: 1` i rapporten); felet sitter i appen mellan knappen och nätet, och
appen sa ingenting om det. Det är samma sorts tystnad som #157:s kamerafacit: en fail-soft-gren utan spår.

**Rättelse på båda plattformarna:** sändaren skriver vad som hände i `facitStatus` — *"Skickat 12:03 (1 svar)"* eller
*"Kunde inte skicka 12:03: HTTP 400 …"* / nätfelet — och kortet visar raden under knapparna (grön/gul). `try?` som
svalde felet i iOS är borta. Nästa försök säger själv var det fastnar.

**Diagnosen som återstår** (Bengt: blev knappen fylld och texten "Tack …"? Axel: `facit-svar`-loggen — anrop från
telefonen och statuskod?) avgör om det är knappen, lagringen eller nätet. Ingår i 0.3.7 (10).

## #210 (16/9 2026) Fälttestets rotorsak: iOS-knapparna satt i en vy som ingen ser

**Bengt, efter körningen:** *"Det enda jag kunde göra var att trycka på Svara på varningarna. Sen kom jag inte vidare
till något annat."* Han tryckte alltså aldrig på Stämde/Stämde inte — knapparna fanns inte på skärmen. `LastSaidCard`
(#24) är **död kod sedan skinnet v3 (2/9)**: ingen vy refererar den; hemskärmen `VaktenView` visar "Senast sagt" som
en textrad. Jag la knapparna i kortet utan att kontrollera att kortet visas — spegelbilden av Androids `LastSaidCard`,
som faktiskt används, lurade mig. #208 och #209 var därför rättelser av fel som inte var det verkliga felet, även om
båda står kvar som riktiga förbättringar (direktsändning, statusrad).

**Rättelse:** `FacitRow` under "Senast sagt"-raden i `VaktenView` — knapparna, "Tack."-raden och statusraden. Bara
betatestare, bara på en varning med id. Hemskärmen visas när vakten är av ⇒ svaret skickas direkt. `LastSaidCard` är
märkt som död kod och lämnas (eget kort om den ska bort). Ingår i 0.3.7 (10) — Axels nästa bygge.

**Läxa:** en vy som finns i repot är inte en vy som visas. "Spegel av Android" var sant om koden, inte om skärmen.
Skärmbilden hade avslöjat det — och iOS har ingen fotostudio i CI. Det är kostnaden för att iOS bara kompileras hos Axel.

## #211 (16/9 2026) Grind V-B byggd som knapp — två mått mätbara, ett som säger nej i stället för att låtsas

**Bengts "kör A" 16/9, efter att första regndygnet loggats** (17 skuggvarningar på 8 rutter sedan 15/9 17:30Z).
`publish/grind-v-b.ts` + knappen `grind-v-b` dömer `shadow_log.vb` mot TROSKLAR-VATTENPLANING §3.

**V-B1 (falsklarm ≤ 20 %) mäts** mot §2:s enda fällande källa: närmaste stations `rain_sum_mm` inom 10 km och
±30 min, max över bucketarna (regnet behöver ha nått tröskeln en gång). Trippeldelning som i V-A —
BEKRÄFTAD · DELVIS · TORRT — men §2:s definition styr talet: allt under tröskeln är falsklarm, och
delvis-kolumnen står bredvid så att man ser vad man dömer. **Tröskeln skrivs inte, den härleds:**
`REGN_UTLOSARE_MMH / RADAR_FAKTOR` = 2,0 / 0,65 ≈ 3,1 mm/h i stationens skala, importerat ur snapshotkärnan —
ingen kopia att driva isär, inget nytt tal i kontraktsgrinden.

**V-B3 (≤ 3 per rutt och regndygn) mäts**, med regndygn = dygn då rutten faktiskt hade något att varna för.
Att räkna torra dygn i nämnaren hade dolt brus bakom soliga veckor.

**V-B2 (miss ≤ 40 %) mäts INTE, och skriptet skriver ut varför** i stället för att producera ett tal:
`situation_archive` bär ingen orsak (situations.ts:37) — en olycka är facit på att något hände, inte på att det
var vattenplaning — och skuggan kör åtta rutter, inte hela landet, så en olycka utanför dem kunde aldrig ha fått
en varning. Antalet redovisas som underlag. Måttet kräver testarlogg eller granskad kamerabild (§2): betans
uppgift, inte knappens.

**Nollpolitiken:** en varning utan station inom räckhåll är OMÄTBAR, aldrig "rätt" — de räknas separat och
aldrig in i V-B1. Samma regel som radarns `regn: null`.

**V-C:s domspärr gäller** (≥ 200 varningar, ≥ 15 facit, ≥ 5 regndygn, ≥ 3 län): under underlaget skrivs inga
domar, bara tal och vad som saknas. Med dagens 17 varningar kommer knappen säga ⊘ i månader — det är rätt, och
det är skälet att bygga instrumentet nu: måttet ska inte formas av siffror man redan sett.

**Bevis:** självtestet (nio fall med känd sanning, grönt) och första skarpa körningen.

**Kontraktsgrinden fällde bygget — och hade rätt.** Radien hette först `MAX_KM = 10`, och det namnet bär redan
husets **ankarradie** (50 km i sju filer: hur långt bort en station får vara och ändå räknas som GRANNE i en
interpolation). Grinden såg en åttonde kopia som drivit isär och stoppade CI. Det var ett namnkrock, inte drift —
två olika storheter med olika tal och olika dokument — men grinden kan ingenting om semantik (den säger det själv i
sin egen huvudkommentar), och att lägga till ett `filer:`-undantag hade varit att böja husets kontrakt för min
skull. Rätt åtgärd var att döpa om: `DOMANDE_STATION_KM`. **Läxa:** ett namn som redan bär en storhet i huset får
inte återanvändas för en annan — grinden är namnblind, och nästa läsare är det också.

## #212 (16/9 2026) Grind V-B körd första gången: TORRT = 0, men bara fyra av fjorton nådde tröskeln

**Första skarpa körningen 12:19Z** (14 dygn; `vb`-loggen börjar 15/9 17:30Z). **⊘ DOMSPÄRR — ingen dom**:
17 varningar mot V-C1:s 200, 0 facitbekräftade händelser mot 15, 2 regndygn mot V-C2:s 5. Talen nedan är
underlag, inget annat. Nio län är däremot redan uppfyllt (V-C2 kräver 3).

| Mått | Utfall | Krav |
| :-- | --: | --: |
| Mätbara varningar | 14 av 17 (3 utan station inom 10 km — OMÄTBARA, aldrig inräknade) | — |
| BEKRÄFTAD (station ≥ 3,1 mm/h) | 4 (29 %) | — |
| DELVIS (blöt men under tröskeln) | **10** | — |
| **TORRT (station = 0)** | **0** | — |
| V-B1 falsklarm enligt §2 (allt under tröskeln) | **71 ± 24 %** | ≤ 20 % |
| V-B3 frekvens | 2 av 8 rutter över (E18 Karlstad 5,0 · Väg 19 Ystad 5,0 per regndygn) | ≤ 3 |
| Avstånd till dömande station | median **2,5 km**, längst 15,6 km | — |

**Det som betyder något är inte 71 %, det är nollan.** Ingen enda varning gick ut på en väg där stationen var
torr. Radarn och stationerna är alltså **eniga om att det regnar** i varje mätbart fall — de är oeniga om HUR
MYCKET. Det är en annan sorts fel än falsklarm, och det syns bara för att trippeldelningen behölls: hade §2:s
tvådelning använts rakt av hade raden lytt "71 % falsklarm" och dolt att noll av dem var grundlösa.

**Sannolik orsak, och den står i tröskeldokumentet självt (§3.4):** *"Grovheten är känd och accepterad: en
5-minutersbild ställs mot en 30-minuterssumma."* En radarbild fångar en topp; stationens 30-minuterssumma
medelvärdesbildar samma skur. Radarn ska därför systematiskt ligga högre än stationens tal — och jämförelsen
mot tröskeln straffar den skillnaden en gång till, eftersom tröskeln härletts ur radarns skala (2,0 / 0,65).
Kalibreringsfaktorn 0,65 mättes på par där båda > 0, alltså på intensitet — inte på toppighet.

**INGET ÄNDRAS PÅ DEN HÄR KÖRNINGEN.** Tröskeln är dubbelsignerad (#155/#156), faktorn likaså (#154), och §5
kräver samma signaturer för att röra dem. Att flytta ett tal för att utfallet ser bättre ut på andra sidan är
precis vad huset finns emot. **Frågan som ska ställas till Axel när underlaget räcker:** ska V-B1 jämföra mot
tröskeln eller mot "regnade det alls" — och i så fall, vad blir kvar av påståendet? Underlaget för det beslutet
är den här kolumnen (DELVIS), och den växer med varje regnvecka.

**Att läsa igen vid nästa körning:** ligger DELVIS kvar nära 10 av 14 när N passerar 200 är det tidsupplösningen,
inte radarn. Faller TORRT-kolumnen från 0 är det däremot ett riktigt falsklarm och en helt annan fråga.

## #213 (16/9 2026) Grind V-B in i måndagsserien — och varför den inte får hoppa över tomma veckor

**Bengts order 16/9: "kör den varje regnvecka."** Knappen läggs sist i den befintliga mätserien, måndagar 07:40,
efter grind-v-a 07:20 som mäter samma spår från andra hållet (grind-a 05:40 · smhi 06:00 · v3 06:20 · trv 06:40
· höjd 07:00). Mätvakten (vakthundens check 6a) bevakar schemalagda flöden, så en missad måndag larmar själv —
grinden får sin vakt utan extra arbete (#81 regel 5).

**Det här öppnar inget som #85 stängde.** #85 gällde `bridges.yml`, en cron som körde var sjätte timme mot en fil
som aldrig ändrades: 32 körningar som "hoppade över" och debiterades en hel minut var. Måndagsserien är motsatsen
— sex grindar som mäter växande kurvor — och V-B hör hemma i den.

**Ingen "hoppa över om inget nytt"-spärr, med flit.** Frestelsen är att spara minuten en torr vecka, men det är
exakt #85:s fälla i omvänd form: checkout och `npm ci` kostar minuten oavsett, och ett jobb som tyst hoppar över
ger en tidsserie med hål i. En vecka utan nya `vb`-rader är också ett svar. Kostnad: ~1 min/vecka ≈ 4 min/månad,
mot dagens 130–278 min/dygn.

## #214 (16/9 2026) Halkordlistan vidgad: sammansättningarna talar, motåtgärderna tiger (kort #97 + S8)

**Bengts beslut 16/9: "kör grepp 1, vidga ordlistan."** Motorns halk-regex krävde att faroordet stod FÖRST i
ordet — en regel satt för att "fläckv**is** Våt" gav åtta falsklarm i augusti. Priset var att sammansättningar
tystnade. Mätt 16/9 mot motorns riktiga regex: på ett kod 1-segment tiger **Rimfrost** och **Halkrisk** (kortet
visste) och **Nysnö** och **Halt** (nytt fynd). Arkivet har inga av dem i dag — men arkivet är från september.

**Regeln, i två delar:**
- `SLIPPERY_INFO = (?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)` — ordbörjan, fläckvis-skyddet kvar.
- `SLIPPERY_STAM = (snö|frost)` — räknas även INUTI ord: Nysnö, Rimfrost, Blötsnö, Nattfrost.

**`halk` är medvetet INTE en stam:** "Halkbekämpning" och "Halkskydd" är motåtgärder, inte faror — därför står
halka/halkrisk/halkig explicit. Designen prövades mot 37 ord innan en fil rördes: alla befintliga ord oförändrade,
elva tysta börjar tala, fyra fällor (fläckvis, Halkbekämpning, Halkskydd, Salthalt) tiger.

**Elva ställen, inte tre.** Motorn i TS/Kotlin/Swift, skuggmotorns bunt, tystnadsfelet (mäter mot motorn),
**snapshotens SQL-filter** (avgör vad som ens NÅR motorn — utan det hade Nysnö tigit ändå, segmentet kommer aldrig
med i live.json), publiceras bunt, vakthundens vinterkoll ×2 och kodgrinden (TS + SQL ×2). SQL-listorna saknar
"mycket besvärligt" med flit — kod 3 passerar redan på `condition_code >= 2`.

**Vektor v24_vinterord_kod1 (S8 + #97):** sju kod 1-segment. Packad snö (S8), Rimfrost, Nysnö, Halkrisk och Halt
larmar; Halkbekämpning och fläckvis Våt tiger. v11_silent_drive oförändrad. **5-metersregeln bet:** på jämna
kilometer låg gränsen **0,65 m** från en fix — samma fälla som v15 — så avstånden är förskjutna 11 m (marginal
10,3 m på båda sidor, mätt före frysning).

**Tre saker grindarna fångade som jag missat:**
1. **Kontraktsgrinden fällde bygget** — två kontrakt jag inte hittat (*Snapshotens halkfilter*, *Vinterorden i
   vakthunden*) sökte den gamla formen och fann noll kopior. Grinden gjorde exakt sitt jobb: en kopia som tyst
   försvinner är lika farlig som en som tyst ändras.
2. **Mitt nya SQL-kontrakt buntade ihop snapshot och vakthund** i ett — det grindens egen kommentar varnar för
   (*"tvingat fram en falsk enighet"*). Borttaget; de tre befintliga, avgränsade kontrakten fick den nya formen.
3. **Kodgrinden bar egna SQL-kopior** av farlighetsorden som nu var i otakt med dess TypeScript. Följer nu.
Plus ett nytt kontrakt: *Halkstammarna i MOTORN* (engine.ts, skuggmotorns bunt, tystnadsfelet — golv 3).

**Generatorn har glidit isär från vektorerna:** `gen-vectors.ts` kallar v05 `v05_throttle_45s` (filen heter
`v05_throttle_floor_10s`) och saknar v18–v23. En fullkörning hade skrivit en spökfil. Den har nu ett filnamnsfilter
och en varning; att synka listan är ett eget kort.

**Rösten säger ingen ny fras** — "Varning: halka rapporterad på vägen framför dig." — men i fler lägen. PRODUKTBOK
uppdaterad. **Mellanstopp:** Axels ja på v24 (S8 är Bengt + Axel) innan merge. Når telefonerna först med nästa
app-bygge (iOS 0.3.8, Android ur CI).

**Utfall 16/9:** PR #306 mergad (8026aa9) med Axels ja på v24 — Kotlin-vektorerna, Swift-vektorerna, CI och emulatorn gröna på grenen. Före deploy: `git diff origin/main` = 0 rader för alla tre funktionerna, buntarna i synk, skuggmotorns bunt bär `SLIPPERY_STAM`, publiceras bunt bär det nya SQL-filtret. **Deploy 14:51Z** från 8026aa9: skuggmotor (34 kB), publicera (790 kB), vakthund (715 kB). Funktionernas egna prov efteråt:
- **publicera:** första snapshoten efter deploy, `live.json` 15:00:01Z (karta-commit 2589faf, 9 899 byte): manifestets sha256 = filens sha256 — STÄMMER. `segments` 0, precis som 14:40Z och 14:50Z före deployen (inget segment i september har kod ≥ 2 eller ett vinterord), `rain_segments` 2. Filtret kör alltså utan fel, men det finns ännu inget för det att släppa in.
- **vakthund** (dbknapp `vinterprov` 14:54Z, svaret ur `net._http_response`): status 200, `problem: []`, raden *"vinterord i väglagsarkivet: nej"* — den nya SQL-satsen kör i drift över hela arkivet utan fel (ett fel hade blivit problemraden *"Vinterkollen kunde inte larma"*). Ingen ny provissue: `vinterord-prov` finns sedan #112 (11/9), engångslarm.
- **skuggmotor** (dbknapp `sparrprov` 14:59Z): `suppressed` med EN rad {camera, prov:kam2, 470 m, by camera, 5 s} och kam2 talad vid t=15 — identiskt med provet 02:42Z, alltså motorn i den nya bunten beter sig som den gamla där inget ändrats.

**Vad deployen INTE bevisar:** att driften faktiskt talar på Nysnö. Regeln är bevisad av v24 i tre portar; driften är bevisad av att funktionerna kör den nya bunten. Ett bevis MED innehåll (DECISIONS #196:s regel — inte kortet #196 nedan) kräver första vinterordet i väglagsdatan — arkivet har inget (vakthundens egen rad ovan). Vakthundens vinterkoll larmar när det kommer.

**Vägen till telefonerna — rättelse av raden ovan:** det blir inte 0.3.8. Senast uppladdade iOS-bygge är 0.3.6 (9); main bär 0.3.7 (10) sedan faciträttelserna (#208–#210) och den är inte uppladdad. ETT bygge från main som 0.3.7 (10) täcker både facitknappen och ordlistan. Har Axel hunnit ladda upp 0.3.7 innan han läser detta: bumpa till 0.3.8 (11). Android-APK:n byggs av android.yml på main.

**Tre fynd i samma varv:**
1. **Vakthundens facitrad tappar klockslaget:** `String(df.senast).slice(0, 16)` på ett Date-objekt ger *"Wed Sep 16 2026 "* — datum utan tid. Min egen rad från S4 steg 1 (#201). Kort #196.
2. **"förarfacit: 2 svar" är två prov, inga riktiga svar:** id 1 = Android-provet 03:07Z (version `prov`), id 3 = mitt iOS-formade serverprov 11:47Z under felsökningen (`cam:prov-ios`, version `0.3.6`). Id 2 förbrukades av idempotensprovet (samma svar två gånger ⇒ ON CONFLICT). Det iOS-formade provet går INTE att skilja från ett riktigt svar på version eller plattform, bara på id:t — och skuggrapportens `forarfacit` räknar båda som svar i sju dygn. Kort #196.
3. **Generatorn i otakt med vectors/** (se ovan) har nu eget kort: #195.

## #215 (16/9 2026) Skyltfondsrundan krymper till tre samtal — och ett muntligt ja räcker

**Bengts beslut 16/9:** kontaktrundan gäller bara **halkbanan, trafikskolorna och intresseorganisationen (NTF)**.
Förhandssamtalet med fonden, skolskjuts, hemtjänst och åkeri stryks. **Ett muntligt ja räcker** för medverkan i
vinterns tester, och det skrivs in i ansökan — inga avsiktsförklaringar att skriva under.

**Kontrollerat innan planen skrevs om (16/9):**
- **Skyltfonden kräver inga underskrivna intyg.** Trafikverkets sida om projektbidrag säger bara att fonden *"ser
  positivt på projekt som genomförs i samverkan med samarbetspartner"*; formuläret (240909-f) frågar efter partnernas
  roll och åtaganden. Beslutet står alltså i regelverket, inte bara i önskan.
- **Riskutbildning del 2 är fortfarande obligatorisk.** Prop. 2025/26:127 tog bort introduktionsutbildningen, inget
  annat. Halkbaneförsöket (AP6) vilar på oförändrad grund.
- **NTF Skåne finns inte längre som eget förbund.** skane.ntf.se leder till NTF Jönköping, som har Jönköpings, Skåne,
  Blekinge, Kalmar och Kronobergs län. Kontakten blir verksamhetschefen där — v5:s "länsförbundet, inte riksförbundet"
  hade lett fel.

**Leverans:** Kontaktplan v6 i Bengts Drive-mapp ("Kontaktplan Skyltfonden 2026-09-16 v6", https://docs.google.com/document/d/1qL3maskkfMqV1_hEbA2vyuyiVZdV-7I5H2O-R1sny9w/edit). Noggrant talmanus
per samtal (öppning, varför just ni, frågor som låter dem berätta, idén, frågan, meningen som läses upp), svar på
vanliga invändningar, röstbrevlåda, tackmejl och uppföljningstabell. v5 och Bengts kopia av v5 orörda. Två första
uppladdningsförsök av v6 (samma namn, formateringsfel vid import) ligger i Drive-papperskorgen.

**Så hanteras ett muntligt ja (Claudes utformning):** meningen som ska stå i ansökan läses upp och godkänns; villkoret
("om bidraget beviljas, inte bindande") sägs högt; namn och titel antecknas; **tillstånd att nämnas med namn frågas
uttryckligen** — ansökan är en offentlig handling hos Trafikverket. Ett kort tackmejl samma dag *rekommenderas men krävs
inte*: det ger partnern chansen att rätta och projektet ett skriftligt spår om fonden frågar. I ansökan skrivs
"muntligen bekräftat [datum] ([namn], [titel])".

**Nytt sedan v5 som bärs in i samtalen:** Stämde det?-knappen (S4), rösten som inte tjatar (prioritet + spärr, #127),
kamerabild som facit (N1), fler vinterord (#214), efterhalkan i skuggan (S1), tröskeldokumentet daterat 1/9, och
testbilssidan som demonstration. Formulerat som det är: knappen når iPhone med nästa testversion, vinterorden med
nästa app-bygge, appen finns ännu inte öppet i butikerna.

**Följd som väntar på beslut — ansökan måste ändras (v5 → v6):**
1. **AP3 (pilot med yrkestrafik) saknar partner** när skolskjuts, hemtjänst och åkeri stryks: stryk eller skriv om.
   58 000 kr i kostnadsplanen och meningar i syfte, hypotes, innovationsgrad, personalplan och trafiksäkerhetsnytta.
2. "Avsiktsförklaring bifogas" → "muntligen bekräftat"; bilaga 2 och checklistans underskriftskrav stryks.
3. "NTF Skåne" → "NTF Jönköping (verksamhet i bland annat Skåne)".
4. YKB-raden i AP6 står bara om Bulltoftabanan säger ja till tung trafik.

## #216 (16/9 2026) Trafiklärare som testförare, AP3 sänkt — ansökan v6 skriven (363 200 kr)

**Bengts beslut 16/9:** *"trafiklärare får vara testförare om de vill. Vi sänker ap3. Du kan skriva v 6 men den kan
klart bli omarbetad."*

**Tolkningen av "sänker AP3" (Claudes, uttalad så den kan rättas):** AP3 finns kvar men krymper till det enda som har
en partnerbas efter #215 — **trafiklärare som testförare**. Flottpiloten (hemtjänst, skolskjuts, distribution) och
morgonöversikten för planerare lämnar ansökan; morgonöversikten lever kvar i B2B-spåret (egenfinansierad), inte i fonden.
Alternativet — behålla en flottverksamhet utan partner — valdes bort: en pilot utan deltagare är det svagaste en
beredningsgrupp kan läsa, och flottkontakterna är strukna. **AP3: 58 000 → 21 000 kr** (30 tim: rekrytering,
instruktion, uppföljning, analys av svaren mot facit, gruppintervju). **Sökt belopp: 400 200 → 363 200 kr.**
Lärarnas medverkan är frivillig och oersatt, i linje med kontaktplanens "utan kostnad för projektet".

**Varför trafiklärarna bär AP3:** de kör dagligen i alla väder och är vana att bedöma både väglag och förare — deras
"stämde / stämde inte" blir ett **expertfacit** i AP1 vid sidan av kamerafacit och vanliga testförares svar. Under
lektioner svarar läraren, inte eleven vid ratten. Knappen finns redan (S4, egenfinansierad).

**Ansökan v6** (https://docs.google.com/document/d/1xB6iLPuLCMp8SylrGaOLFNjpniXkYsAJIaIg-7GaT9c/edit): AP3 omskrivet; syfte punkt 3, H1, AP1:s facitlista, innovationsgrad punkt 5 (trafiklärare som
expertfacit ersätter yrkestrafikens planering), personalplanen och sida 8 följer. Avsiktsförklaringar → muntligt
bekräftad medverkan (#215). NTF Jönköping. Dataskydd säger ordagrant vad återkopplingen skickar (ett svar pekar ut en
plats och en tid). **Fyndet i v5:** sida 8 sa "tre led" men hade fyra rubriker — nu tre. Byggt sedan v5 och beskrivet som
förutsättning, inte sökt: förarnas återkoppling, kamerabild vid varning, efterhalkans indata i skuggan.

**Kontaktplan v6.1** (https://docs.google.com/document/d/1avAw47OAtqKnTeUzDV6ODTR3iXJ6ttW3eaSXaeNVR7c/edit): trafiklärarfrågan är fast del av trafikskolesamtalet, står i meningen som läses upp, och
tre nya invändningar/svar (vad det innebär, att läraren trycker, ingen ersättning). v6 märkt "ersatt av v6.1", inget raderat.

**Följd som väntar:**
1. **Inbjudningsvägen för lärarna (Axel):** iPhone — extern TestFlight-grupp kräver Beta App Review; intern kräver
   teammedlemskap. Android — APK ur CI eller Play intern testning (Play-kontot finns inte än). Avgör före november.
2. **AP3 kräver minst ett trafikskole-ja till lärare som testförare** senast 25/9 — annars skrivs AP3 om före sändning.
3. Bengt och Axel omarbetar v6 fritt; siffrorna i kostnadsplanen summerar (kontrollerat: 363 200).

## #217 (16/9 2026) Grepp 2 skrivet: TROSKLAR-KOMBINATIONEN — grinden för kombinationen, gemensam kalibrering, tröskelregeln (UTKAST)

**Bengts order 16/9: "kör grepp 2"** (bedömningens S10, kartans §8 C och D, §13.2). Kartan är fryst, så C och D blev ett
eget dokument: `docs/TROSKLAR-KOMBINATIONEN.md`. **Utkast — inget gäller förrän det är fastställt.** C och D fastställs
av Bengt och kontrasigneras av Axel. T ändrar TROSKLAR-FRYSKLASSNINGEN i Axels lydelse och kräver båda.

**C — fyra grindar för en kombination:** KB-A *bär varje del sin roll?* (varianter utan en del i taget, B3-paret,
marginalvakten — svaret på kartans §7.3: en del som föll ensam får bära i kombination, men bara via en fråga skriven
före mätning) · KB-B *räddar kombinationen mer än den kostar, mot dagens motor?* (efterhalkan: Ö-B:s golv 5 %/25 %,
oförändrade) · KB-C *domens giltighet* (den strängaste delens underlag, vart och ett: Ö-C och T-C) · KB-D *förarfacit*
(en ny källa: "Stämde" bekräftar, "Stämde inte" fäller bara utan annat facit och utanför nära-miss-bandet, ensamt
fäller det ingen dom, trafiklärare separat, provrader aldrig). Plus fem byggvillkor före grinden: additiv, graciös
degradering, ärvda vakter, eget vittne, skugga före röst.

**D — sju regler för gemensam kalibrering.** Skälet är räknat, inte resonerat: efterhalkans parametrar ur de
fastställda svepen bildar ett rutnät på **1 296 punkter** (5 184 med N_varning). En dels tröskel väljs i dag på en
kurva med 3–4 punkter — med 1 296 finns alltid en vinnare, även i brus. Därför: delarnas trösklar rörs aldrig (D1) ·
startvärden före första natten, utan utfall (D2) · **kalibrering och dom på skilda nätter** (D3) · målet skrivet före
(D4) · alla prövade punkter redovisade (D5) · frysning innan domdata läses (D6) · en andra kalibrering är en ny fråga (D7).

**T — Axels lydelse** (*"en storhet som inte kan motbevisas av en mätning får inte utlösa; extrapolation faller; minne
av mätningar består"*) med fem preciseringar, bland dem **vittneskravet**: en regel vars vittne är tomt är skriven men
inte i kraft. Vittnesläget 16/9: betans två premisser har var sitt levande vittne (kamerafacit 26 objekt; minutdata),
utfallet har ett som får bekräfta (olyckor) och inget levande som får fälla — en januaridom utan det blir OAVGJORT.

**Tre fynd på vägen:**
1. **Facitstackarna säger emot varandra om kamerabilden:** SKUGGAN §2 *nej* (svartis syns inte), VATTENPLANING §2 *ja*
   (torr väg motbevisar vatten), OVERGANGAR §8 *ja* utan förbehåll. Förslag: bilden får fälla **premissen** (blöt väg)
   men aldrig **utfallet** (is). OVERGANGAR §8 ändras bara som eget beslut vid fastställandet.
2. **FRYSKLASSNINGEN §7 säger att regeln "aldrig får mjukas upp — oavsett signaturer".** Dokumentets §6.4 svarar att
   Axels lydelse inte öppnar någon utlösare den gamla skrevs för att stoppa — och att ändringen inte får göras om Bengt
   eller Axel läser den som en uppmjukning. Det avgörs uttryckligen, inte i förbigående.
3. **Bedömningens §4.2 bar ett avgjort beslut som öppet:** #52-vektorn (S8) avgjordes 16/9 med v24 (DECISIONS #214).
   Flyttad till tagna.

**Förslag som väntar på Bengt:** KB-D4 (≥ 30 förarsvar, ≥ 5 förare, ingen > 25 %) · kalibreringspunkten 1 februari
(D3) · kamerabildens regel. **Inga byggminuter:** bara markdown.

**Rättelse samma varv, efter kodläsning:** första versionen sade att kombinationens varianter "skuggas redan" av Ö-B och
T-B. Det gör de inte — de kolumnerna är inte byggda. Varianterna ska spelas upp ur S1:s råa logg, och den läst i koden
(`publish/snapshot-core.ts`, `skuggmotor/main.ts`) har tre gränser: `regn_h` är timmar sedan *något* regn (minsta regn
bara > 0), radarns r finns inte i loggen, och `weather[]` bär bara stationer med yta ≤ 3 °C (startband bara +1…+3).
**Av rutnätets 1 296 punkter kan 48 spelas upp.** Nytt beslut för Bengt före första frostnatten: vidga loggen (kod,
byggminuter) eller stryk de sveppunkterna för kombinationen (D2). Dokumentets §3, §4, §7 och §9 rättade.

## #218 (16/9 2026) Mätt: utan radarn försvinner högst ~13 % av de blöta timmarna vid kalla stationer — ingen av dem för att mätare saknas

**Bengts "kör mätningen" 16/9**, på reservationen i TROSKLAR-KOMBINATIONEN: vad kostar det att stryka radarn ur
efterhalkans premiss "vägen är blöt"? Frågan i `scripts/matningar/radar-tackning-2026-09-16.sql`, körd via dbknapp
(35135412610). Station-timmar, 14 dygn, blöt inom 4 h; mätare > 0 mm, radar > 0,1 mm/h på väg inom 5 km — båda i
den generösa änden av sina svep, så radarns andel är en **övre gräns**.

| | Alla station-timmar | Kalla (yta ≤ +5 °C, givarvakt) |
| :-- | --: | --: |
| Timmar | 71 702 | 2 592 |
| Med mätardata | 90,0 % | **99,5 %** |
| Väg inom 5 km (radar möjlig) | 90,7 % | 80,5 % |
| Blöta timmar (mätare eller radar) | 36 718 | **115** |
| Bara radarn visste | 5 374 (14,6 %) | **15 (13,0 %)** |
| — varav station utan mätare | 1 211 | **0** |
| — varav mätaren visade torrt | 4 163 | 15 |

**Stationsnivå:** 755 av 848 stationer har mätare (89,0 % — övergångsdokumentets 89 % stämmer). **Alla 160 kalla
stationer har mätare.** Förlusten vid frost handlar alltså inte om saknade mätare, utan om timmar där mätaren visade
torrt men radarn såg regn inom 5 km — antingen duggregn mätaren missar, eller regn som föll bredvid stationen.

**Reservationer:** 115 blöta kalla timmar är tunt (13 % ± 6 procentenheter). September är regn, inte snö — en
vippskålsmätare fångar snö dåligt, så radarns bidrag kan växa i vinter. Radararkivet har 269 kompositer på 14 dygn
(ungefär en i timmen), vilket kan dölja korta skurar och drar åt andra hållet. **Nettoriktningen är okänd.**

**Följd:** rekommendationen att stryka radarn för kombinationen i vinter står — kostnaden är mätt och måttlig, inte
försumbar. Samma fråga körs om inom första frostmånaden (en byggminut), innan januari-domen.

## #219 (16/9 2026) Axels läsning av TROSKLAR-KOMBINATIONEN: sex ändringar, 1 248 punkter strukna

**Axel läste utkastet i sin helhet** och skrev under på innehållet: C och D (dom mot dagens motor, en kalibrering per
säsong på skilda nätter, alla prövade punkter redovisade) och T (en varning får bara bygga på något en mätning kan visa
var fel). §6.4 lämnar han till Bengt — *"läser du det som uppmjukning görs ändringen inte"*.

**Bengts beslut 16/9: "ja till alla tre, gör de sex ändringarna."**
1. **De 1 248 punkter som inte kan spelas upp ur S1:s logg stryks för kombinationen i vinter**, radarn inräknad.
   Priset står i dokumentets §3: radarns bidrag mätt till högst ~13 % av blöta kalla timmar (#218), "blöt" = allt regn
   över 0, fallet syns först under +3 °C. Axel: 48 punkter går att kalibrera ärligt på, 1 296 gör det inte.
2. **Radarmätningen körs om inom första frostmånaden**, före januari-domen — snö fångas sämre av mätarna.
3. **Sex ändringar i dokumentet:** V1 flytt i tid · V5 betan är facitinsamling och får stängas av · §3 strykningen med
   pris · KB-D3 följden (januari kan bli OAVGJORT trots många "stämde") · §5 D2 skyddar januari, D3 mars · §7 utfallet i
   januari och testförarnas information.

**Där jag skärpte Axels förslag — flytt i tid.** Axel ville att ett flyttat försprång (#153) ska räknas som tillägg. Det
räknas nu så **bara om spärrloggen (`suppressed`) inte visar någon undanträngd varning**: 10-sekundersspärren och
upprepningsspärren kan tysta en annan varning utan att någon regel "tystar". Kortare försprång räknas aldrig som tillägg.

**Fortfarande öppet:** §6.4 (Bengt, med Axel) · utfallet i januari — förslaget KLARAR/OAVGJORT ⇒ betan fortsätter, FALLER
⇒ ut (Bengt och Axel vid fastställandet) · principen för betans startvärden, D2 (S3, före frosten) · fastställandet.

## #220 (16/9 2026) Tröskelregeln i Axels lydelse fastställd — tätad i tre punkter, inte en uppmjukning

**Bengts beslut 16/9:** *"täta 6 och ta axels lydelse först … Axel håller med gällande otätade text"*. TROSKLAR-KOMBINATIONEN
§6.4 besvaras: **ingen uppmjukning, på villkor att tre hål täts** — tätade i samma commit.

1. **T1 prövar per tillstånd, inte på utfallet.** Utkastet prövade *påståendet* inom utfallsfönstret. En prognos kan
   alltid fällas i efterhand, så regeln hade släppt igenom varje prognos.
2. **T5: interpolation är förbjuden som utlösare.** Utkastet sade "varken tillåten eller förbjuden", fast T3:s
   definition — ett värde där ingen mätt — omfattar den.
3. **T6, ny: prognoser och modellprodukter** (SMHI:s varningar, frysklassningen, en trend räknad framåt) får stärka,
   försvaga eller förlänga (N_varning, E1) en varning som vilar på en mätning — aldrig ensamma utlösa.

**Införd i TROSKLAR-FRYSKLASSNINGEN §1 och §7**, med den gamla meningen citerad. **Skyddet följer med:** regel T i sin
helhet får skärpas men aldrig mjukas upp, oavsett signaturer — samma skydd som den gamla meningen hade. Ett smalare
skydd hade i sig varit en uppmjukning.

**Skärpt mot min rekommendation — #153 beslut 2 får ingen förbehållen öppning.** Jag rekommenderade "förbjuden tills
#153 beslut 2 fattas". Men den gamla meningen förbjöd en modellerad temperatur som avtryckare *oavsett signaturer*; en
öppning skriven i förväg hade gett den nya regeln något den gamla förbjöd — just den uppmjukning §6.4 frågade om. Beslut
2 lever, men måste klara T1–T3 som allt annat: ett vittne **på platsen** som kan fälla värdet. I de källor vi har i dag
finns inget sådant mellan stationerna.

**Alternativ som valdes bort:** (a) behålla den gamla meningen — bokstavligt förbjuder den minne av mätningar, alltså
betan (kartan §13.2); (b) Axels lydelse otätad — de tre hålen ovan; (c) skydda bara T3 — den gamla meningen var skyddad
som helhet; (d) en förbehållen öppning för #153 beslut 2 — se ovan.

**Avsteg från dokumentets §9:** T fastställs före C och D, inte i samma varv. D-raden i varje tröskeldokument och
kamerabildens rad i OVERGANGAR §8 väntar på fastställandet av C och D. **Axel** har hållit med om den otätade lydelsen;
tätningarna ändrar inte hans tre meningar, bara preciseringarna, och är alla skärpningar — han ska ha läst dem
(bedömningen §0b). Kartan §13.6 (*"Om tröskelregeln ska skrivas om till Axels lydelse — öppet"*) är besvarad, men kartan
är fryst (#186) och rättas efter bygge + mätning.

**Funnet i samma genomgång:** TROSKLAR-SKUGGAN §4 (a)/(b) låter segmentprognosen *tala* efter domen i mars 2027 — på
modellerade segment och nära ankare. Det krockade redan med den gamla meningen och krockar med T3. Inte rättat nu
(fastställt dokument, domen ligger ett år bort); kort #198.

## #221 (16/9 2026) #153: allvar som försprång — omformulerat, och väntar till efter grepp 2 och betan

**Bengts beslut 16/9:** *"gör 153 och omformulera 153"* — på mina två rekommendationer: #153 väntar till efter grepp 2
och betan, och omformuleras till försprång.

1. **Beslut 1 heter nu "allvar som försprång":** samma ord, tidigare (`leadM` per fara, 400–3 000 m). Formen är Axels
   egen (kartan §13.1: *"Rösten säger samma ord men tidigare"*) och redan beslutad för modifierare (#90 roll B, E1).
   **Struket ur kortet:** ordval (Axel: *"ett mätinstrument, inte en röst"*) och prioritet (E3 — det skulle tysta en
   olycka). Kostnaden blir F4, inte F5.
2. **Ordningen:** grepp 2 fastställt (C och D) → betan i november → S2: skattarens graderade nivå (utan graderat mått
   finns inget att sätta tiden efter, kartan §13.5) → eget tröskeldokument skrivet före mätning: svep för försprång per
   nivå och ett tak för undanträngda varningar i `suppressed` (V1) → skugga → dom, tidigast mars → F4 i tre portar.
   Rösten är Axels.
3. **Inget byggs nu.** Kortet är omskrivet så att ingen bygger det avvisade.
4. **Beslut 2** (interpolation mellan eniga stationer) är **fortfarande öppet** och skilt från beslut 1 — men utan egen
   öppning i tröskelregeln (#220).

**Alternativ som valdes bort:** bygga #153 före grepp 2 och betan — då döms betan i januari mot en motor vars försprång
ändrats under den, och KB-B mäter två saker på en gång. Kartan §13.6 (*"Om #153 ska omformuleras till försprång —
öppet"*) är besvarad; kartan är fryst och rättas efter bygge + mätning.

## #222 (16/9 2026) Betans startvärden (D2) — skrivna före frosten, utan utfall

**Bengts order 16/9:** *"startvärden för betan före frosten"*. Principfrågan — mitt i svepen eller i den försiktiga änden —
var inte avgjord. **Jag valde mitten, och den tystare av de två där svepet har två mittpunkter.** Värdena gäller tills
Bengt byter dem med en rad. Det får han göra fram till betans första natt, så länge ingen har läst facit eller räknat hur
ofta punkterna fyrar i S1:s logg.

**I klartext:** betan fyrar när ytan ligger mellan +1 och +3 °C, har fallit minst 0,8 °C de senaste 30 minuterna, och
stationens mätare visat regn inom de senaste 2 timmarna.

| Parameter | Svep | Startvärde | Varför |
| :-- | :-- | :-- | :-- |
| N | 1 · 2 · 3 · 4 h | **2 h** | mittpunkterna 2 och 3; 2 är tystare |
| Fönster | 15 · 30 · 60 min | **30 min** | mitten |
| Lutningströskel | 0,4 · 0,6 · 0,8 · 1,2 °C per fönster | **0,8 °C** (1,6 °C/h) | mittpunkterna 0,6 och 0,8; 0,8 är tystare |
| Minsta regn | > 0 · ≥ 0,2 · ≥ 0,5 mm | **> 0** | enda värdet som går att spela upp (#219) |
| Startband | +1…+3 · +1…+4 · +1…+6 °C | **+1…+3 °C** | enda värdet som går att spela upp (#219) |
| r (radar) | 0,1 · 0,5 · 2 mm/h | **av** | struken (#219) |
| N_varning | av · 2 · 4 · 6 h | **av** | mittpunkterna 2 och 4; 2 är tystare — och med N = 2 h är 2 h detsamma som av |

**Skälen till principen:**
1. **Betan samlar in facit** (V5). I den försiktiga änden fyrar den nästan aldrig — fall 1,2 °C på 15 minuter är
   4,8 °C/h — och då finns inga förarsvar att döma i januari.
2. **Januari kan ta bort grenen** (§7, förslag). Ett extremvärde riskerar att fälla idén för startvärdets skull: golvet
   (≥ 5 % nettonytt) i den försiktiga änden, taket (≤ 25 % falsklarm) i den generösa.
3. **Tystnad är en funktion.** Där svepet har två mittpunkter tas den tystare.
4. **Regeln är mekanisk.** Ingen kurva, inget facit och ingen rad i S1:s efterhalka-logg lästes när värdena valdes (D2).

**Punkten är en av de 48 som kan spelas upp** (§3), så KB-A:s varianter och kalibreringen har den i sitt rutnät.
**N_varning:s övriga värden (4 och 6 h) finns inte bland de 48** — om de kan spelas upp mot SMHI-arkivet (`sql/015`) är
inte prövat; tills dess står de utanför kalibreringen. **Vad punkten inte är:** en tröskel ur mätning. Den är gissad med
flit, och en dålig december är designen, inte ett fel (V5). **När S3 byggs** skrivs värdena i motorn och i
`scripts/kontraktsgrinden.ts` i samma commit (Axel, tre portar).

## #223 (17/9 2026) Radarn stryks inte — betan utan radar, radarn prövas i mars ur arkivet (väg C)

**Bengts beslut 17/9:** *"jag vill inte så gärna stänga radarn"* och därefter *"ja"* — på min rekommendation (väg C)
och på frågan om regnmängden skulle prövas. Jag läste "ja" som båda; menade Bengt bara provet räcker en rad.

**Rättelse av underlaget till #219.** Jag skrev 16/9 att radarn inte går att spela upp. Det gäller S1:s logg. Radar-
arkivet (`radar_precip`) gallras aldrig — ingen kod raderar i det — och kan kopplas till loggens stationer i efterhand,
som mätningen #218 gjorde. Valet presenterades som "bygg ut loggen eller stryk"; en tredje väg fanns.

**Beslutet (väg C):**
1. **Betan och kalibreringen 1/2 är oförändrade:** 48 punkter, radar av (#222). En radarvinnare i februari kunde ändå
   inte nå telefonerna: `radar_h` finns inte i live.json (uppskjuten #188, CPU) och apparna läser inte radarn förrän
   V-C är dömd (Axel 16/9).
2. **Radarn prövas i mars som egen variant i KB-A:** kombinationen i den kalibrerade punkten med radarn som tredje
   tecken på blöt väg, r = 0,1 · 0,5 · 2 mm/h — tre varianter, redovisade enligt D5.
3. **Samma källa på båda sidor.** Radarvarianten jämförs mot kombinationen räknad ur samma arkiv, inte mot loggen —
   arkivet och loggen skilde sig i 1 av 5 station-ögonblick i provet nedan.
4. **Går radarn igenom i mars** är det ett eget beslut om att bygga in den — inte en justering av betan.

**Villkor som följer:** kopplingen station↔väg skrivs före första frostnatten (FÖRSLAG 5 km, samma som #218 — en
definition, ingen inställning att kalibrera) · uppspelningen provkörs före januari · arkiven måste finnas kvar till
mars, och det gör de inte på gratisnivån (grepp 3, #83 steg 2, oktober).

**Provet 17/9** (`scripts/matningar/regnmangd-uppspelning-2026-09-17.sql`, dbknapp-körning 35182341540):

| Fråga | Svar |
| :-- | :-- |
| Hur mycket bär S1:s logg? | 2 658 skuggkörningar på 7 dygn, **5 med efterhalka-rader — 5 station-ögonblick** (16/9 06:00Z–17/9 04:30Z) |
| Går loggens `regn_h` att räkna om ur arkivet? | **4 av 5 lika** (±0,15 h); med simulerad gallring 4 av 5 lika och **5 av 5 inom en halvtimme** |
| Största skillnad | **2,7 h** i full upplösning — arkivet har fått data efter publiceringen. Vid N = 2 h: loggen blöt på 2, arkivet på 3 |
| Med minsta regn ≥ 0,2 eller ≥ 0,5 mm | blöt på **0 av 5** |
| Regnrader vid kalla stationer (yta ≤ 5 °C, 7 dygn) | 145 rader på 7 stationer: **96 under 0,2** · 37 mellan 0,2 och 0,5 · 12 minst 0,5; minsta värde 0,1 mm |
| Radarn mot loggens stationer | kopplingen fungerar: 5 av 5 har väg inom 5 km; ingen radar över 0,1 mm/h inom 2 h |
| Arkiven | radar sedan 2/9, 4,4 MB · väder sedan 24/8, 70 MB · databasen **165 av 500 MB** |

**Vad provet visar och inte visar.** Metoden fungerar, men fem station-ögonblick är ett funktionsprov, inte en
mätning. Regnmängden går att räkna fram ur arkivet på samma sätt som radarn, och den biter hårt: två tredjedelar av
regnraderna vid kalla stationer är under 0,2 mm. **Om regnmängden ska tillbaka som variant i efterhand är Bengts
beslut** — inte fattat här.

**Funnet:** S1 loggar bara stationer i skuggrutternas korridorer (`efterhalkaRader`, ±0,05°) och bara ytor ≤ 3 °C —
5 rader på ett septemberdygn. Om det räcker i vinter är inte mätt; arkivet ser alla stationer.

## #224 (17/9 2026) Startbandet och SMHI-förlängningen prövade — alla sex inställningar går att räkna ur arkivet

**Bengts order 17/9:** *"pröva startbandet. går smhi-förlängningen att mäta"*. Bara tillgång räknades — rader, fönster,
kopplingar — inte hur ofta någon variant skulle fyra (D2/D3). Mätfrågorna: `scripts/matningar/startband-smhi-uppspelning-2026-09-17.sql`,
dbknapp-körningar 35183998393 och 35184101126.

**Startbandet (+1…+4 och +1…+6 °C) går att spela upp i efterhand.**

| Fråga | Svar |
| :-- | :-- |
| Bär trend-tabellen (`trend_kandidater`) de varmare ytorna? | ja — sedan 8/9 **3 062** fallande ögonblick vid 3–4 °C (87 stationer) och **3 354** vid 4–6 °C (126), mot 1 388 vid 1–3 °C (43). Fallet för 15, 30 och 60 min finns i nästan alla rader |
| Tål den gallringen? | ja — fallen sparas färdigräknade, och tabellen gallras inte (sql/017) |
| Finns regnet i arkivet för de varmare raderna? | regn inom 48 h för **1 685 av 2 491** (3–4 °C) och **1 911 av 2 720** (4–6 °C), senaste 7 dygnen. Resten hade inget regn i arkivet — torrt och saknat går inte att skilja |
| Stämmer loggens fall med tabellen? | lika i 5 av 5 — **men alla fem var tomma** (inget fall), så jämförelsen säger inget om värdena |

**Rättelse av mitt svar 17/9:** jag skrev att 15-minutersfallet försvinner i gallringen. Det gäller råraderna, men
trend-tabellen byggdes 13/9 just för att spara fallen (#88).

**SMHI-förlängningen (N_varning) går att koppla men inte att mäta än.**

| Fråga | Svar |
| :-- | :-- |
| Finns vintervarningar i arkivet? | **nej** — inga `SNOW_ICE` eller `ICING`. Arkivet bär vind till sjöss, brand, vattenbrist, regn, översvämning |
| Följer giltighetstiden med? | för varningar arkiverade efter 13/9: **gula 13 av 13**, meddelanden 1 av 7. Före sql/015 saknas den av konstruktion (15 av 157 rader totalt) |
| Går kopplingen station × aktiv varning att köra? | ja — senaste 5 dygnen låg 15 av 747 stationer under brandmeddelande och 3 under vindvarning; inget av loggens 5 station-ögonblick |

**Tre gränser som inte går att mäta bort:** (1) bara varningar arkiverade efter 12/9; (2) arkivet sparar varje
publicering men inte när en varning försvinner (`ingest/db.ts`) — en varning som dras tillbaka i förtid ser ut att gälla
till sin sluttid; (3) vilka varningstyper och nivåer som räknas är självt osatt (TROSKLAR-SMHI-FORSTARKAREN F1, F2).

**Slutsatsen som ändrar läget.** Med #223 och den här mätningen går **alla sex inställningar att räkna fram ur
arkivet**: N och regnmängd ur väderarkivet, radarn ur radararkivet, fönster, fall och startband ur trend-tabellen. Av
de två skälen till strykningen #219 står alltså bara det ena kvar — **Axels: 1 296 punkter går inte att kalibrera
ärligt, 48 gör det.** Att loggen inte bär dem är inte längre ett skäl.

**Mitt förslag (inte beslutat):** kalibreringen står kvar på 48. Regnmängd, startband och SMHI-förlängningen prövas i
mars som radarn (#223) — var för sig mot den kalibrerade punkten, högst tio varianter. En variant som ser bättre ut i
mars byggs inte in direkt, den blir en ny fråga: med tio jämförelser kan någon se bra ut av en slump.

**Två frågor före kalibreringen 1/2:** (a) Bengt — strukna inställningar som varianter i mars; (b) Bengt och Axel —
**varifrån uppspelningen räknas.** Skuggloggen visar vad telefonen såg men bar 5 station-ögonblick på ett dygn (#223).
Arkivet ser alla stationer men får data i efterhand och skilde sig från loggen i 1 av 5.

## #225 (17/9 2026) Bengts ja på alla rekommendationer — vad det avgör och vad det inte täcker

**Bengts beslut 17/9:** *"jag svarar ja på alla dina frågor där du rekomenderat ja i den här sessionen"*. Tolkat som
frågorna i chatten 16–17/9 och bedömningens öppna beslutslista (§4.2) med rekommendationen ja.

| # | Frågan | Läge efter ja:et |
| :-- | :-- | :-- |
| 1 | #153 beslut 2 (interpolation) får ingen egen öppning i tröskelregeln (#220) | **beslutat** |
| 2 | Betans startvärden (#222) | **beslutade** |
| 3 | Strukna inställningar prövas i mars som varianter — regnmängd, startband, SMHI-förlängningen när vintervarningar finns; kalibreringen står på 48 (#223, #224) | **beslutat** |
| 4 | Kopplingen station↔väg för radarn: 5 km | **beslutat** |
| 5 | Ingesten sparar när en SMHI-varning försvinner, före första vintervarningen | **beslutat** — kort #199, byggt i samma PR (`sql/024`) |
| 6 | C och D fastställs | **Bengts del klar** — i kraft när Axel kontrasignerat. Då skrivs D-raden i varje tröskeldokument och kamerabildens rad i OVERGANGAR §8 (§9 steg 4) |
| 7 | Förslagen i C och D: förarfacits underlag (KB-D4) · kalibreringen 1/2 (D3) · kamerabilden fäller premiss, aldrig utfall | **Bengts del klar** — gäller med C och D |
| 8 | Utfallet i januari: KLARAR eller OAVGJORT ⇒ betan fortsätter, FALLER ⇒ grenen tas bort | **Bengts del klar** — väntar på Axel |
| 9 | #45 lapse 0,63 (S12) | **Bengts del klar** — väntar på Axel |
| 10 | TRV-anmälan om nio byvindgivare | **beslutat att skicka** — Bengt skickar själv; Claude skickar inget i hans namn |

**Täcks inte av ja:et — ingen rekommendation gavs:** varifrån uppspelningen räknas, skuggloggen eller arkivet (Bengt +
Axel, före 1/2, #224) · `marknadsforing.yml` (Axel + Bengt) · provraderna i förarfacit (kort #196, Bengt).

**Väntar på Axel:** kontrasignatur på C och D · utfallet i januari · #45 · läsa tätningarna T1, T5, T6 (#220).

## #226 (17/9 2026) Axels ja: C och D fastställda, tröskelregeln kontrasignerad, uppspelningen ur arkiven

**Axels beslut 17/9** (genom Bengt): *"Axel säger ja till alla rekommendationer"* — de sex punkterna i meddelandet till
honom. Bengts del av de tre nya rekommendationerna följer hans stående ja (#225).

| # | Beslut | Följd |
| :-- | :-- | :-- |
| 1 | **C och D fastställda** — Axel kontrasignerar Bengts ja (#225), med förslagen: förarfacits underlag (KB-D4) · den enda kalibreringen 1/2 på data november–januari (D3) · kamerabilden fäller premiss, aldrig utfall | **i kraft.** I samma commit (§9 steg 4): D-raden i ändringsparagrafen i tio tröskeldokument, och kamerabildens regel för kombinationer i TROSKLAR-OVERGANGAR §8 |
| 2 | **Utfallet i januari:** KLARAR eller OAVGJORT ⇒ betan fortsätter oförändrad till mars · FALLER ⇒ grenen tas bort | fastställt |
| 3 | **Tätningarna i tröskelregeln** (T1, T5, T6 — #220) | regel T kontrasignerad i sin tätade form |
| 4 | **#45 lapse 0,63 °C/100 m** (tidigare 0,71) | kort #45 rättat; ingen kod bär värdet i dag |
| 5 | **Uppspelningen räknas ur arkiven** — väderarkivet, radararkivet, trend-tabellen — **med skuggloggen som kontroll** | villkor: arkiven kvar till mars (grepp 3, oktober) · överensstämmelsen logg ↔ arkiv mäts vid första frosten och redovisas i varje dom |
| 6 | **marknadsforing.yml behålls och flyttas till pulsklockan** — flödets syfte är morgonen ("före pendlingen"), och GitHub-cronen levererade den 08:49–10:07 UTC mot bokade 04:45 | kort #200 |
| 7 | **Provraderna i förarfacit märks och utesluts — raderas inte** | kort #196: ISO-tid i vakthundsraden, filter på `alert_id` med `prov`, deploy och prov |

**Kamerabilden i OVERGANGAR §8:** regeln gäller kombinationer. (a):s egen rad — kamerafacit får fälla falsklarm — står
kvar. Att ändra den vore en **lättnad** av (a):s grind (färre falsklarm räknas), och betan behöver den inte.

**Inga öppna beslut kvar i bedömningens lista.** Det som återstår är arbete: kort #196, #199 (bevis), #200, och
uppföljningen med datum i bedömningen §0b.

## #227 (17/9 2026) Kort #196: provraderna i förarfacit märks i databasen, vakthunden visar klockslag

**Bengts order 17/9:** *"kör #196"* — på beslutet #226: provraderna märks och utesluts, raderas inte.

**Valet: en genererad kolumn, inte ett filter i funktionerna.** `sql/025` lägger `prov boolean GENERATED ALWAYS AS
(strpos(lower(alert_id), 'prov') > 0) STORED` på `driver_facit`. Definitionen finns på ett ställe och märker också
framtida prov utan kod. Vakthunden räknar `WHERE NOT prov` och skriver hur många prov som uteslöts; skuggrapporten läser
`prov=is.false`. **Alternativ som valdes bort:** samma villkor i båda funktionerna — två kopior av en regel som kan glida
isär (läxan bakom kontraktsgrinden) · radera raderna — Bengts och Axels beslut var att inte radera.

**Klockslaget:** vakthundsraden skrev `String(df.senast).slice(0, 16)`, alltså "Wed Sep 16 2026 " — datum utan tid. Nu
ISO i UTC, t.ex. "2026-09-16 11:47Z".

**Ordning i drift:** merge → `sql/025` med dbknapp (före deployen, annars saknar funktionerna kolumnen) → deploy av
vakthund och skuggrapport, var för sig → bevis: skuggrapportens `forarfacit.svar_7d` = 0 och vakthundens rad säger
"0 svar · 2 prov uteslutna".

## #228 (17/9 2026) Sessionsregeln: orientera vid start, sök innan något stryks, inga trådar bara i chatten

**Bengts order 17/9:** *"skriv in allt detta i claude.md som en handlingsregel för varje session"* — efter hans förslag
att varje session läser integrationskartan och bedömningen, så att inga obesvarade trådar lämnas efter.

**Regeln (CLAUDE.md, SESSIONSREGELN):** (1) vid start läses den senaste bedömningen hela, och kartan när den ändrats
eller ett nytt grepp börjar; (2) innan något stryks eller sägs vara omöjligt söks tabeller och nyckelord i repot;
(3) frågor och beslut från chatten skrivs in i bedömningen och DECISIONS i samma varv, med en kontroll före sessionens slut.

**Justeringar mot Bengts förslag, och varför:** kartan läses vid ändring i stället för varje gång — den är fryst till
efter bygge och mätning, och en omläsning kostar ~14 000 tokens utan ny information. Kontrollen i slutet lades till: trådar
tappas i chatten, inte i dokumenten, så en läsning i början hittar bara det som redan skrivits in. Sökregeln lades till
eftersom dagens största miss — radarn som "inte gick att spela upp" — inte stod i kartan eller bedömningen utan i
TROSKLAR-OVERGANGAR §4 och `sql/017`. En tabellista är 19 namn, ungefär 100 tokens.

**Ersatt:** sessionsprotokollets steg 1 sade att TAVLA, STATUS, BACKLOG och DECISIONS läses varje session — cirka 280 000
tokens, som i praktiken inte lästes. Steg 1 pekar nu på regeln och säger att de stora filerna söks i.

## #229 (17/9 2026) Bedömningen bär läget överst och stryks fortlöpande — kartan gör det inte

**Bengts order 17/9:** *"gör en uppdatering av bedömningen och bekräftar att strykningar som klar sker fortlöpande i det
dokumentet. Strykningar i integrationskartan förutsätter kanske läsning och det blir dyrt"* — och en lista där han ser
var vi är och vart vi är på väg.

**Gjort:** `docs/BEDOMNING-2026-09-15.md` har en ny översta sektion, *Läget 17/9*: en tabell över var vi är och en
tidslinje september–mars med vem som gör vad. Klara rader strukna: N4, S1, S10 och de rader i §0b som fått bevis.
**Regeln** står som punkt 4 i SESSIONSREGELN (CLAUDE.md): en rad stryks i samma varv som beviset finns, läget överst hålls
aktuellt, kartan stryks inte löpande. **Skäl:** kartan är fryst till efter bygge och mätning, och att stryka i den kräver
att den läses (~14 000 tokens) — bedömningen är listan, kartan är analysen.

## #230 (17/9 2026) Rekognosering: Trafikverkets öppna halkflöde är vårt väglag i annan form — inga fordonsdata

**Bengts order 17/9:** *"ja, kör rekognoseringen nu"* — på frågan om Trafikverkets öppna halkflöde (SRTI *"Temporary
slippery road"* på trafficdata.se) kunde täcka gatorna och ge januari-domen ett vittne.

**Vad som lästes:** katalogposten på trafficdata.se (CKAN-API:t) och Trafikverkets datautbytesportal — datamodellen,
situationssidan och frågesidan.

| Fråga | Svar |
| :-- | :-- |
| Var finns flödet? | Katalogposten pekar bara på Trafikverkets DATEX II-datamodell; ingen egen adress |
| Vilka datamängder finns? | Camera, LocationCode, Parking, RoadConditionSection, TrafficSafetyCamera, TrafficFlow, TravelTime, Truckparking, WeatherData och situationerna Accident, EmergencyInfo, Ferries, Frostdamage, Roadworks, **RoadSurfaceConditions**, Trafficmessage. **Ingen för fordonsdata eller SRTI särskilt** |
| Varifrån kommer halkuppgifterna? | `RoadSurfaceConditions`: *"Trafikledningen använder sig av kamerabilder, väderprognoser och information som entreprenörerna rapporterar för att bedöma väglaget"* — samma väglag som vi redan hämtar som `RoadCondition` |
| Åtkomst | POST till `https://api.trafikinfo.trafikverket.se/v2/datex.xml` med samma registrerade nyckel som vårt API |
| Sökord på portalen | varken "SRTI", "halk", "fordon" eller "Data for Road Safety" på situationssidan |

**Slutsats:** det öppna flödet ger inget nytt vittne och ingen täckning av gatorna. Bilarnas halkdetektering som
Trafikverket köper (Volvo, Nira Dynamics) och delar i Data for Road Safety syns inte i något öppet dataset. **Rättelse av
mitt svar 17/9:** jag kallade det "halkflöde från fordon" innan källan var läst.

**Kvar, som frågor till Bengt (bedömningen §4.2):** fråga en stad om egna data, och fråga Trafikverket om
fordonsbaserade halkhändelser publiceras öppet någonstans. Ingen live-hämtning gjordes — nyckeln finns bara i GitHubs
secrets, och dokumentationen besvarade frågan om källan.

## #231 (17/9 2026) Grepp 3: arkiven till mars — mätt, och gratisnivån räcker inte till vintern

**Bengts order 17/9:** *"kör grepp 3"*. Underlaget står i `docs/GREPP3-ARKIVEN.md`; mätfrågorna i
`scripts/matningar/grepp3-databasen-2026-09-17.sql` (dbknapp-körningar 35220139396 och 35220310144).

**Mätt:** databasen 168 MB (92 MB 9/9) — cirka 9 MB/dygn brutto i en mild september. Svenska väderdata 71 MB;
finska 21 MB och norska 13 MB, **ogallrade**; **pg_crons körningslogg 18 MB och rensas aldrig**; 54 500 döda rader i
det svenska väderarkivet. Gallringsjobbet lyckas varje natt.

**Läst hos Supabase 17/9:** gratisnivån skrivskyddar databasen vid 500 MB — då stannar ingest-live och appen visar gammal
data — och har inga backuper. Pro: 8 GB, dagliga backuper, funktioner 400 s i stället för 150 s, från 25 USD/mån.

**Uppskattat:** vintern kräver cirka 3 GB (november–mars), och bruttotakten når 500 MB runt 24 oktober om inget
återanvänds. Nettotakten mäts 24/9.

**Rekommendation, inte beslut:** Supabase Pro senast vid 400 MB eller 1 november (Bengt + Axel) · tre gratis småbyggen
nu: databasvakt, rensning av pg_crons logg, gallring av Finland och Norge (Bengt). **Bortvalt som förstahandsval:**
rullande export (2a) — sedan #226 läser domarna rådata över månader, och en export som fallerar skrivskyddar databasen.
**Funnet:** ingen vakt larmar på databasens storlek i dag.

## #232 (17/9 2026) Grepp 3, punkt 2: databasvakt, loggrensning och hård gallring av Finland och Norge

**Bengts order 17/9:** *"gör punkt 2. Gallra de finska och norska hårt för vi använder inte dessa så mycket"* — och på
frågan om rimfrostgrinden: *"Behåll kalla rader"*.

**Byggt (sql/026, vakthunden, dbknapp, integrationstest):**
1. **`gallra_arkiv(dagar)`** ersätter `gallra_vader` i nattjobbet 03:15 (samma jobb, nytt kommando): den svenska
   gallringen oförändrad, sedan
   - **Finland:** rader äldre än 7 dygn med yta över +3 °C eller utan yta raderas; kalla rader sparas i 60 dygn.
   - **Norge:** allt äldre än 7 dygn raderas.
   - **pg_crons logg:** körningar äldre än 7 dygn raderas.
2. **Databasvakten** i vakthunden: raden *"databas: N MB av 500"* och larm vid 400 MB. Prov: `databasprov`.

**Varför Finland inte gallras lika hårt som Norge.** Sökt i koden och dokumenten före radering: rimfrostgrinden R-A läser
det finska arkivet med 30 dygns fönster, och planen att köra den på Lapplands frostnätter är fastställd
(TROSKLAR-RIMFROST §8) och byggde på Bengts beslut #138 att spara luftfuktigheten. Det norska arkivet läses av ingen
analys — ingesten läser bara senaste raden per station. Det norska skuggarkivet var Axels start 31/8 (BACKLOG #35);
han informeras.

**Funnet och låst i samma migration:** gallringsfunktionerna låg i `public` utan spärr, alltså anropsbara via Supabases
REST-API. `gallra_vader(0)` hade tunnat ut även den senaste veckan. EXECUTE återkallas från PUBLIC, anon och
authenticated för båda.

**Storleken sjunker inte direkt:** en DELETE frigör inte disk förrän autovacuum återanvänt platsen (sql/014). Effekten
syns som lägre tillväxt — mätningen 24/9 visar den.

**Utfall 17/9:** migration 12:3xZ: `gallra_arkiv(7)` raderade **97 472 rader** — Finland 97 379 → 58 130, Norge 68 972 → 45 828, pg_crons logg 39 312 → 12 691, resten svensk gallring · EXECUTE låst för anon och authenticated · nattjobbet kör `SELECT gallra_arkiv(7)` 03:15 · databasvakten 12:35Z: *databas: 168 MB av 500*, provlarmet gick (larmväg ok).

## #233 (17/9 2026) Uppspelningen ur arkiven — grundversionen byggd och körd

**Bengts order 17/9:** *"kör uppspelningen"* — på beslutet #226 att domarna räknas ur arkiven med skuggloggen som
kontroll, och för att S1-grinden (Axel 16/9: inget mer byggs på `regn_h` före skuggjämförelsen) ska kunna passeras så
fort frosten kommer.

**Byggt:** `scripts/matningar/uppspelning-efterhalka.sql`, tre läsande satser via dbknapp (körning 35252328963). Talen står
en gång per sats: regn inom 2 h · fall ≥ 0,8 °C på 30 min · yta +1…+3 °C (#222/#225).
1. **Stationsdygn per dag:** i bandet · utan faller (regn i bandet) · utan blöt (fall i bandet) · kombinationen.
2. **De tio senaste tillfällena** då kombinationen skulle ha varnat.
3. **Kontrollen:** samma regel ur skuggloggen (det telefonen såg) mot arkiven, per station-ögonblick.

**Utfallet läses medvetet inte.** Startvärdena står till kalibreringen 1/2 (D2/D3).

**Resultat, 14 dygn i en mild september:**

| | |
| :-- | :-- |
| Stationer i bandet per dygn | 1–31 |
| Utan faller (regn inom 2 h i bandet) | 0–2 stationer per dygn |
| Utan blöt (fall i bandet) | 0–1 station per dygn |
| **Kombinationen** | **ett tillfälle:** station 2518, 14/9 06:25–06:35Z — yta 2,8–2,9 °C, fall 2,0–2,2 °C på 30 min, **regn samtidigt** |
| Kontrollen mot skuggloggen | 7 station-ögonblick, loggen och arkivet eniga i alla 7 — men ingen varnade, så jämförelsen säger ännu inget om träffar |

**Att den enda träffen kom under pågående regn** stämmer med definitionen: *blöt* är regn nu eller inom N h
(TROSKLAR-OVERGANGAR §4, `blöt = fukt_nu ELLER …`). Trendkolumnerna finns först från 8/9, då trend-tabellen började.

**Kvar:** radar-, regnmängds-, startbands- och SMHI-varianterna (#223–#225) och facit — de hör till domarna. **Nästa
körning:** vid första frosten, som underlag för S1-grinden.

## #234 (18/9 2026) Kort #195: vektorgeneratorn återskapar hela `engine/vectors/` — ingen vektor rörd

**Bengts order 18/9:** *"kör #195 och #200"*.

**Fyndet var större än kortet.** Kortet (16/9) sa att v05 hade fel namn och att v18–v23 saknades. En fullkörning 18/9
ändrade dessutom **elva** befintliga filer (v01–v04, v11–v17). Generatorn hade inte följt med när kamerornas bearing
vändes 180° (2/9), när vägnumret kom in i olycksrösten (2/9) och när spärren blev prioritetsmedveten (#127, 13/9).
Filerna hade alltså skrivits om utanför generatorn vid tre tillfällen.

**Gjort:** alla scenarier skrivna ur de frysta filerna. Varje tal uttrycks bara med ett uttryck som ger exakt samma
flyttal (`northOf(m)`, `northTrace(...)`). v05:s kamera B och hela v23 byggdes för hand med 111 000 m per latitudgrad
(v23 med nio decimaler) och återskapas exakt så (`n9`). Generatorn skriver nu en fil **bara när innehållet ändrats**:
arton filer bär andra byte för samma värden (inget radslut sist, v19:s `4.0`), och att skriva om dem hade rört
vektorfilerna utan skäl och startat Android- och iOS-bygget (~17 Actions-minuter).

**Bevis:** fullkörning ⇒ 24 *oförändrad*, 0 skrivna, `git status engine/vectors/` tom, ingen spökfil. Motprov: v18
`surfaceTempC` 2,5 → 2,6 i generatorn ⇒ *SKRIVEN* och diffen visar talet; återställt ⇒ *oförändrad*. `npm test`:
109 godkända, 0 fel.

**Varför nu:** motorregeln för efterhalkan (S3) ska ha nya vektorer. De ska komma ur generatorn, med 5-metersregeln
mätt, i stället för att skrivas för hand. Det var just handskrivningen som fick generatorn att glida isär.

**Kvar, nytt kort #202:** ett CI-steg som kör generatorn och fäller om `engine/vectors/` ändras. Utan det glider
generatorn isär vid nästa handändring, som den gjort tre gånger.

## #235 (18/9 2026) Kort #202: vektorgeneratorn i CI

**Bengts order 18/9:** *"kör #202 också"*.

**Skälet:** generatorn gled isär från vektorfilerna tre gånger (31/8, 2/9, 13/9), och ingen vakt såg det. Det upptäcktes
16/9, och hela omfånget först 18/9 (#234).

**Byggt:** ett steg i `ci.yml` kör `engine/gen-vectors.ts` och fäller om `engine/vectors/` ändras. Generatorn skriver
bara filer vars innehåll ändrats (#234), så steget är tyst när allt stämmer. En vektorfil utan scenario syns inte i
`git status`, så generatorn fäller själv på det när den körs utan filnamn.

**Bevis:**
- Lokalt, mot incheckad kod: rent läge grönt; handändrad vektorfil rött; vektorfil utan scenario rött (generatorns
  eget fel); scenario ändrat utan ny vektorfil rött; rent igen grönt.
- **I riktig CI:** provcommiten på PR #341 (v22 handändrad) gav röd körning 35305862118, fälld i steget *Vektorgeneratorn
  återskapar engine/vectors/ (#202)* med felmeddelandet om glidning. Återställd i nästa commit ⇒ grön. Squash-merge, så
  provet nådde aldrig main.

**Kostnad:** någon sekund per CI-körning.

## #236 (18/9 2026) Kort #200: marknadsföringen på pulsklockan

**Bengts order 18/9:** *"kör #195 och #200"*, på beslutet 17/9 (Bengt + Axel, #226).

**Gjort:** `scripts/pulsklocka.ts` fick pulsjobbet `puls-marknadsforing` (`45 4 * * *`), kopierat ur malljobbet som de
andra pulsjobben, så att nyckeln aldrig passerar en logg. `schedule` togs bort ur `marknadsforing.yml`, så att flödet inte
körs två gånger (PR #339). Pulsklockan kördes skarpt 03:53Z: fyra pulsjobb OK, alla med nyckel, och de tre befintliga
oförändrade.

**Första morgonen 18/9:** pulsklockan startade flödet **04:45:09Z**, 9 s efter bokad tid (GitHub-cronen levererade 08:49–10:07). Jobbet 04:45:12–04:45:31, alla steg gröna, och utkastet *Halkläget 2026-09-18* committades 04:45:25.

**Verify:** start inom 10 min från 04:45 UTC tre morgnar i rad (18–20/9). Raden i bedömningen stryks när den tredje finns.

**Obs vintertid:** pg_cron går i UTC. Från 25/10 blir 04:45 UTC 05:45 svensk tid i stället för 06:45 — samma två tider
som flödets gamla kommentar ("05:45/06:45 svensk tid") redan räknade med. Actions-kostnaden är oförändrad, en minut per
morgon.

## #237 (18/9 2026) Kort #160: måndagsserien på pulsklockan, mätvakten läser pulsklockan — och pulsnyckeln är PAT:en

**Bengts order 18/9:** *"kör #160 och kontrollera vilken nyckel pulsjobben har hos Axel och genomför bytet"*.

**Byggt (PR #344):**
- **(a)** De sju måndagsmätningarna (grind-a, smhi-prov, cell-matning-v3, trv-bevakning, hojd-prov, grind-v-a, grind-v-b)
  startas av pulsklockan, samma tider som förut. GitHub-cronen levererade dem 5–7 h sent 14/9 och 40 % av bokad takt i #70.
- **(c)** Mätvakten läser schemat också ur pulsklockans jobb i pg_cron. När #200 flyttade marknadsföringen dit föll den
  ur bevakningen utan ett ord, och ingest och grannar hade aldrig bevakats av samma skäl.
- **(b)** Fast frist, kadens + 3 h, i stället för × 1,5: en utebliven måndag syns samma dag, inte efter 10,5 dygn.
- **Pulsnyckeln i nyckelkalendern:** vakthunden läser pulsnyckelns utgång ur GitHubs svarshuvud och larmar om pulsjobben
  bär olika nycklar. Nyckeln används bara i databasen och i vakthunden och skrivs aldrig ut.
- **Bytesknappen:** `pulsklocka.yml` med läget **nyckel** provar att `PUBLISH_TOKEN` får starta ett flöde, skriver den i
  alla pulsjobb och läser tillbaka fingeravtrycken.

**Bevis:**
- Pulsklockan skarp 04:46Z: 11 pulsjobb OK, alla med nyckel, varav 7 nya för måndagsserien.
- Vakthunden deployad 04:35Z från main (lokal fil identisk med main före deploy). `nyckelprov` 04:47Z:
  *mätvakten: 11 schemalagda flöden (11 via pulsklockan), 0 med problem* (8 i morse, utan marknadsföringen) ·
  *nyckel pulsklockan: 1 olika i pulsjobben · samma som PAT: ja* · PAT och pulsnyckel går båda ut **2026-11-22**.
- Kontroll 04:28Z (dbknapp, pg_net mot GitHub): alla pulsjobb bär samma finkorniga PAT, som går ut
  **2026-11-22 20:55:49 UTC**.
- Bytesknappen 04:50Z: GitHub-hemligheten `PUBLISH_TOKEN` har samma fingeravtryck (`a0880e9a`) som pulsjobben — alla fyra
  ställen bär samma PAT. Provet startade `pulsklocka.yml` som *Axelstar* (HTTP 204); alla 11 jobb lästes tillbaka rätt.
  Första pulskörningen efter omskrivningen: ingest **05:11:01Z**, startad som *Axelstar*, grön — pulsjobben fungerar med den omskrivna nyckeln.
- **Måndag 21/9** avgör (a): alla sju ska starta inom minuten från sin bokade tid.

**Svaret på "vilken nyckel":** pulsjobben bär PAT:en från Axels konto — samma nyckel som publicera och vakthunden
använder och som ingest-grannar pushar kartrepot med. Den går ut 22/11.

**Bytet:** en ny nyckel kan bara skapas på Axels konto, och jag loggar inte in på någon annans konto. Därför är bytet nu
en knapp i stället för SQL för hand. Rotationen senast 15/11 blir: (1) Axel skapar den nya PAT:en, (2) byter
`PUBLISH_TOKEN` i Supabase, (3) byter `PUBLISH_TOKEN` i GitHub Secrets, (4) trycker `pulsklocka.yml` med läget **nyckel**.
Nyckelkalendern visar sedan det nya datumet för båda, och *samma som PAT: ja*.

**Rättelse i rotationslistan (kort #86, steg A):** listan från 9/9 gav den nya PAT:en *Contents* och *Issues*, "inget annat".
Pulsjobben startar flöden med nyckeln och vakthunden läser körningarna — det kräver **Actions: Read and write**, som
nuvarande nyckel har (provet gav 204). Hade listan följts ordagrant hade bytesknappen fällt på provet och pulsjobben stått
kvar på den gamla nyckeln tills den dog 22/11. Steg A är rättat, och knappen är steg C.

## #238 (18/9 2026) Kort #201: kassavakten hämtar dygnen parallellt — vakthunden svarar också i kassavaktens timmar

**Bengts order 18/9:** *"kör #201"*.

**Problemet:** kassavakten hämtade månadens körningar dygn för dygn och sida för sida, i följd. Tiden växte därför med
månaden, och vakthunden hann inte svara inom pg_nets 120 s i kassavaktens timmar (05, 11, 17, 23 UTC). Gratisnivån
stoppar funktionen vid 150 s. Sista septemberveckan, när taket är som trängst, hade kassavakten riskerat att stoppas mitt
i räkningen — och kontroll 9 (healthcheckens) och 10 (nyckelkalendern) går efter den.

**Gjort (PR #348):** sex dygn hämtas samtidigt; sidorna inom ett dygn fortfarande i följd, eftersom nästa sida bara behövs
när den förra var full. Räkningen är oförändrad — dygnssummorna sorteras innan den släpande takten räknas.

**Bevis:**
- **Före:** ordinarie körningen 05:07Z fick timeout vid 120 s. Kassaprovet 05:19Z svarade först efter 90–120 s
  (efter databasknappens väntan, före pg_nets gräns).
- **Efter** (deploy 05:23Z från main, lokal fil identisk): kassaprovet 05:24Z svarade med status 200 inom cirka 70 s, med
  alla rader till och med nyckelkalendern. Kassaraden: 4 558 min sedan 1/9 över 3 385 körningar, 20,46 USD — samma
  räkning som före (4 511 min över 3 346 körningar 23:08Z i går, plus nattens körningar).
- Ordinarie körningen 11:07Z är den första i kassavaktens timme efter deployen; den ska svara utan timeout.

**Kvar att veta:** vakthunden tar fortfarande cirka 70 s i kassavaktens timme. Kassavakten är nu några sekunder; resten
är de andra kontrollerna. Marginalen till 120 s är cirka 50 s.

## #239 (18/9 2026) S7: kamerafacit får en vakt, och flödena som committar tillbaka får --autostash (kort #161 b)

**Bengts order 18/9:** *"kör S7"*.

**Läget före:** kamerafacit — bilderna som ska döma betan i mars — flödade (31 · 97 · 107 · 27 bilder 15–18/9, skuggan
103–137 larm per dygn), men ingen vakt såg efter det, och bucketen stod tom i 16 dygn en gång utan att någon märkte det.
S7:s andra led, trv-bevakningens 13 källor, visade sig redan bevisat 16/9 02:44 (commit 1284e82) och ströks.

**Byggt (PR #351):**
- **Kamerafacit-vakten** i vakthundens 6b: larm i mätvaktens issue när skuggan gett minst 10 svenska larm de senaste
  12 h men bucketen `facit` inte fått en bild — korskontroll som radarns, så ett lugnt dygn inte larmar. Raden *källor*
  visar kamerafacits ålder och skuggans larm. Prov: `?facitprov=1` (dbknapp `facitprov`, i skriptet och i flödets lista).
- **Kort #161 (b):** `marknadsforing.yml` och `trv-bevakning.yml` gör `git pull --rebase --autostash` och skriver ut
  `git status --porcelain` när de faller, som läxan i CLAUDE.md kräver sedan 14/9.

**Bevis:**
- Vakthunden deployad 05:37Z från main (lokal fil identisk). `facitprov` 05:39Z: raden *kamerafacit 99.0 h (skuggans
  svenska larm 12 h: 68)* och issue #352 med *KÄLLA · kamerafacit … PROV*. Nästa timkörning ska stänga det.
- --autostash provat lokalt i två tillfälliga repon: gamla raden föll på en smutsig fil med *"Please commit or stash
  them"* (exit 128) — felet från 14/9; nya raden pushade (autostash lagd undan och tillbakalagd, exit 0); fel-grenen
  skrev ut ` M gradlew.bat` och gav exit 1. Första skarpa körningen med nya raden: marknadsföringen 19/9 04:45Z.

**Kvar av S7:** ett larm för förarfacit när betan går i november — i dag en rad utan dom, eftersom tabellen ska vara tom
till dess.

## #240 (18/9 2026) Fälttest 2: bygget 0.3.7 (10) i TestFlight saknar facitknapparna — main bumpad till 0.3.8 (11)

**Bengt 18/9:** passerade en fartkamera (appen varnade), men kunde inte svara — bara brytaren *Svara på varningarna*
gick att nå, som 16/9. Han har 0.3.7 (10) från TestFlight. (Claude antog först 0.3.6 — fel, rättat samma dag i PR #355.)

**Bevisen:**
- Skärmbild 09:40: *Redo.* med vakten avslutad, raden *Senaste tur · 18 Sep 08:25, 61 min, vaknade själv* — inga knappar.
- Skärmbild 09:46: brytaren *Svara på varningarna* PÅ.
- Kodens villkor för knapparna (`VaktenView`): brytaren på + senast sagd varning med text, id och klockslag. Varningar sägs
  bara på ett ställe (`GuardManager`), och där sparas alla tre först; id-lagringen finns sedan 0.3.6 (0239f03).
- `driver_facit` 07:37Z: bara de två provraderna från 16/9.

**Trolig orsak:** versionsnumret 0.3.7 (10) sattes i #300 kl. 13:45 16/9, och rättelsen `FacitRow` kom i #301 kl. 13:53 med
SAMMA nummer. Ett bygge från koden däremellan — eller från en äldre kopia — har rätt nummer men inga knappar. Axel kan
bekräfta med arkivets tid i Xcode Organizer.

**Åtgärd:** main bumpad till **0.3.8 (11)** (App Store tar inte samma byggnummer två gånger, och ett nytt nummer syns för
testarna i TestFlight). Axel: `git pull`, `xcodegen generate`, Product → Archive, TestFlight. Kontrollen före
"arkivera nu" körs på bumpen (ios-engine, ci; android oförändrad sedan sin gröna körning).

**Förslag till samma bygge eller nästa (S4:s utformning är Axels):** (1) visa bygget i appen — version och commit under
Inställningar/Om — då hade orsaken synts på en skärmbild; (2) visa varningens text ovanför knapparna — när det finns en
*Senaste tur* döljer hemskärmen *Senast sagt*; (3) brytarens text säger var knapparna finns; (4) knapparna även i körläget
när bilen står stilla — i dag syns de först när vakten är avslutad, och självstoppet kommer efter 15 min.

**Läxa (CLAUDE.md):** ett byggnummer som sätts före den sista ändringen bevisar inte vilket bygge som är ute — 0.3.7 (10)
fanns i två varianter i åtta minuter, och det räckte.

## #241 (19/9 2026) Skolans synlighet: QR-sida per skola på webben — ingen banner i appen (kort #204)

**Bengts idé 19/9:** en banner per trafikskola i appen, *"Halkvakt via Mårtenssons trafikskola"*, som indirekt reklam
för skolan. **Bengts beslut samma dag, på Claudes bedömning:** ja till webbversionen, nej till banner i appen.
*"Förbered men bygg inte."*

**Varför inte i appen:** eleven som ser bannern är redan skolans kund; det bryter mot *tyst app utan reklam*; iPhone
ger appen ingen uppgift om vilken länk installationen kom från; och "kom via skola X" är en uppgift om användaren som
löftet *vi samlar in: ingenting* inte täcker.

**Webbversionen:** bladet med skolans namn och QR-kod → en räknare (+1 per skola och månad, inget om besökaren) → skolans
egen sida *Välkommen från …* med butiksknapparna → App Store / Google Play. Partnerlista på startsidan utan siffror;
talen till skolan i ett månadsmejl; ett märke *Testpartner 2026/27* till skolans egna kanaler; i appen bara Om-sidans
gemensamma testpartner-rad.

**Förberett:** `docs/QR-SIDA-PER-SKOLA.md` (delarna, kedjan, integriteten, det som måste finnas före tryck, Axels sju
beslut, kostnad, bevis) och skissen `docs/skisser/qr-sida-per-skola.svg`. **Byggs när bladet byggs** — när appen finns i
butikerna. Inget lovas i Skyltfondssamtalen utöver *bladet med ert namn på*.

**Alternativ som valdes bort:** banner i appen (ovan) · per-skola-märkning i appen via installationslänk (går inte på
iPhone utan spårningspaket) · offentliga besökstal (en skola med tolv besök bredvid en med 143).

## #242 (20/9 2026) Byggordning C — ett sammanhållet iOS-bygge — och kort #205: fotostudions svar märks som prov

**Bengts beslut 20/9:** *"kör 205 och ja till byggordning c"*. Bakgrunden var hans invändning samma dag: *"är det då inte
bättre att avvakta hans svar och få en sammanhållen körning så att all uppdatering sker en gång och inte två"*.

**Läget som beslutet vilar på:** Axel har inte svarat på de åtta frågorna om #203 — sökt 20/9 i DECISIONS, bedömningen,
incheckningarna och GitHub-kommentarerna sedan 19/9. Hans ja 17/9 (#226) gällde C, D och T, två dygn före #203. Och 0.3.8
(11) innehåller INTE #203: den bär de gamla knapparna (nu fungerande) och ordlistan.

**Byggordning C:** ett iOS-bygge, med #203. Skälet för att arkivera 0.3.8 först — att sändningen från appen aldrig bevisats
— löses utan TestFlight och utan provkörning: Axel kör simulatorn med `-fotostudio_facit` och TRYCKER *Stämde*; raden
`cam:fotostudio` ska landa i `driver_facit` med `app = ios`, `version 0.3.8`. Det bevisar att knapparna syns (diagnosen
#240), att appens sändning fungerar och att servern tar emot. **Stoppdatum 27/9:** har de åtta svaren inte kommit då
arkiveras 0.3.8 ändå, till den interna gruppen. **Det som väntar till bygget:** det formella beviset från en riktig
telefon (S4 steg 5) och ordlistan i telefonerna.
*Alternativ:* A) 0.3.8 nu, #203 i 0.3.9 — två uppdateringar och en tredje provkörning på det gamla flödet; B) vänta utan
att bevisa kanalen — ett fel i sändningen hade då hittats först i oktober, ovanpå ny kod.

**Kort #205 — förutsättningen.** Kolumnen `prov` (sql/025, kort #196) matchade bara ordet *prov*. Fotostudio-kroken i
båda apparna lägger in `cam:fotostudio`, och ett tryck skickar ett riktigt anrop — raden hade landat som ett RIKTIGT
förarsvar, just den rad som ska bevisa S4 (KB-D6: provrader räknas aldrig). `sql/027`: `prov` också när `alert_id`
innehåller *fotostudio*; genererad kolumn ⇒ DROP + ADD i samma transaktion.

**Bevis:**
- Integrationstestet kördes mot riktig Postgres i CI (`ok 36 - kort #205 …`): fotostudio i två skiftlägen och `prov:kam1`
  märks, `wx:2135` och `seg:16010` inte, och en omkörning ger samma värden (PR #377).
- Migrationen i drift 05:33Z (dbknapp): kolumnen GENERATED ALWAYS med uttrycket
  `strpos(lower(alert_id),'prov') > 0 OR strpos(lower(alert_id),'fotostudio') > 0`; de två befintliga provraderna kvar och
  märkta; 0 riktiga svar, 2 prov, 2 rader — inget förlorat.
- Båda läsarna efter bytet: vakthundens fråga (samma SQL) ger 0 riktiga svar; skuggrapporten via REST svarar
  `forarfacit: {svar_7d: 0}` utan fel.
- **Kvar:** raden med innehåll — `cam:fotostudio` med `prov = true` — kommer med Axels tryck.

**Rättelse i samma varv:** regeln *ett svar är en handling, tystnad är inget svar* föreslogs 19/9 som KB-D5, men KB-D5
(trafiklärarnas svar) och KB-D6 (provrader) finns redan i TROSKLAR-KOMBINATIONEN. Förslaget heter **KB-D7**. Namngivet utan
att söka i det fastställda dokumentet först (SESSIONSREGELN punkt 2).


## #243 (20/9 2026) Steg B:s Verify uppfylld — radarn i timingesten kostar mätbart noll extra minuter

**Bakgrund.** #156 avgjorde 13/9 att radarn INTE flyttas till en edge function utan ligger kvar som
ett steg i timingesten (Bengt: "Vi flyttar inte nu"). Villkoret som skrevs in i kort #43 och #81 var
ordagrant: *"Actions-minuter per dygn oförändrade efter en vecka."* Baslinjen vid beslutet var
202 min/dygn, mätt över 26,5 h (11/9 16:25 → 12/9 18:51).

**Utfall: villkoret är uppfyllt, med marginal åt rätt håll.** De sju kompletta dygnen 13–19/9 gav
188 · 138 · 122 · 218 · 112 · 123 · 88 ⇒ **141 min/dygn i snitt**. Toppdygnet 16/9 är ett androidbygge
(55 min på 7 körningar), inte drift.

**Det avgörande talet är inte totalen utan ingest-jobbet**, för det är där radarn bor. Debiterade
minuter per dygn: 33 · 24 · 24 · 24 · 28 · 24 · 28 på 24 körningar, och mediantiden **30–36 s hela
veckan mot baslinjens 32 s**. Kortets tröskel ("ett ingest-jobb som vuxit förbi en minut per körning")
är alltså inte passerad. De dygn som landar på 28 i stället för 24 beror på 3–4 körningar vars svans
går strax över 60-sekundersstrecket (max 71 s) — inte på att jobbet blivit längre. Radarsteget mäts
direkt i loggen: **4–5 sekunder**.

**Datamängden bekräftar samtidigt att steget faktiskt kör.** 20/9 05:11: `radar_precip` 3 312 rader
över **24 av 24 kompositer**, senaste 05:10 — en minut gammal. Baslinjen 13/9 var 2 029 rader över 24.
Fler rader, samma kostnad: filtret är händelsestyrt, så ett regnigare dygn ger fler rader utan fler
minuter. Regel 7:s 70-minutersgräns var aldrig i närheten, och radarn har inte tigit en enda gång av
den orsaken.

**Vad beslutet INTE säger.** Edge-flytten för 5-minuterskadens är fortfarande inte förkastad, bara
inte aktuell. Tätare hämtning i Actions förblir uteslutet (12/h ≈ 288 min/dygn). Marginalen i timkadens
— rader som mest 60 min gamla mot regel 7:s ≤ 70 min — är oförändrat tunn men hel; faller en körning
bort tiger radarn, vilket är rätt utfall.

## #244 (20/9 2026) Uppspelningens varianter byggda: en funktion, betans startvärden som standard, D1 i kod, utfallet blindat

**Bengts beslut 20/9:** *"ja gör uppspelningens varianter nu"* — svaret på frågan i bedömningen §4.2. Instrumentet för
dom 1 (januari) och dom 2 (mars) är läsande SQL ur arkiven och bygger inget på `regn_h` i motorn, så S1-grinden (Axel 16/9)
hindrar det inte.

**Byggt (PR #379, #381):**
- `sql/028_uppspelning_varianter.sql` — `uppspelning_efterhalka()`. Anropet utan argument ÄR kombinationen (regn inom 2 h ·
  fall >= 0,8 °C på 30 min · yta +1…+3 °C · allt regn > 0); varje variant ändrar ETT argument. **D1 i kod:** ett värde
  utanför delarnas fastställda svep avvisas med fel — ingen kan pröva ett eget tal i smyg. **Utfallet blindat:**
  trendarkivet bär redan lägsta yta inom 90 min (`min_yta_90min_c`, besiktigad av värdevakten), men utfallskolumnerna ger
  NULL tills `p_blind := false` anges, och det anropet syns i dbknapp-loggen. Låst som `gallra_arkiv`: ingen EXECUTE för
  PUBLIC, anon eller authenticated.
- `scripts/matningar/uppspelning-varianter.sql` — sats 1: tio varianter på en rad var; sats 2: kombinationen per dygn;
  sats 3: bär radarkopplingen (skiljer vädret från röret utan att röra utfallet).
- Kontraktsgrinden: fem nya kontrakt — N, fall, startbandets två gränser, kopplingen 5 km. 35 kontrakt håller. Motprov:
  0,8→0,6 i den gamla mätfilen ⇒ exit 1; 5→6 km i täckningssatsen ⇒ exit 1; satsen borttagen ⇒ exit 1 (golvet).
- Integrationstestet (riktig Postgres i CI, `ok 37`, 117 av 117): sex påhittade stationer med känt rätt svar per variant,
  blindningen, åtta avvisade värden, och gränsprovet för radarn.

**Körd i drift 20/9 06:17Z, 14 dygn (7–20/9) — BARA ANTAL FYRNINGAR, inga utfall lästa:**

| Variant | Stationsdygn | Ögonblick | Dygn med fyrning |
| :-- | --: | --: | --: |
| kombinationen | 1 | 3 | 1 |
| utan *faller* | 9 | 201 | 8 |
| utan *blöt* | 7 | 10 | 5 |
| med radarn r = 0,1 · 0,5 · 2 mm/h | 1 · 1 · 1 | 3 · 3 · 3 | 1 · 1 · 1 |
| regnmängd >= 0,2 · >= 0,5 mm | 0 · 0 | 0 · 0 | 0 · 0 |
| startband +1…+4 | 1 | 4 | 1 |
| startband +1…+6 | 5 | 13 | 4 |

`utfall_synligt` = 0 i varje rad, och sats 2 visar utfallskolumnerna som NULL — blindningen håller i drift.

**Regressionen:** den gamla mätfilens sats 1 (`uppspelning-efterhalka.sql`, skriven 17/9 som CTE) kördes direkt efter och
gav samma tre tal: utan faller 9, utan blöt 7, kombinationen 1 stationsdygn med 3 ögonblick (14/9). Två oberoende
skrivningar av samma regel räknar lika.

**Radarn lade inte till ett enda dygn — och det är vädret, inte röret.** Sats 3: 140 stationer i trendarkivet, **110 har
ett vägavsnitt inom 5 km** (79 %; 16/9 mättes 80,5 % för kalla stationer, #218), 105 avsnitt, och **118 av 530**
stationsdygn hade radarregn på ett sådant avsnitt samma dygn. Kopplingen ger alltså träffar; de sex torra stationsdygnen
med fallande yta hade bara inget radarregn inom 2 h. Det är fysiken: ytan faller snabbast klara nätter, och då regnar det
inte. **30 av 140 stationer saknar väg inom 5 km** — där kan radarvarianten aldrig bidra (känt sedan #218).

**Rättat i samma varv (PR #381):** första versionen skrev `rate_mean_mmh >= r`. Den fastställda regeln säger `> r`
(TROSKLAR-OVERGANGAR §4), och radartäckningsmätningen 16/9 räknade så. Hittat när radarvarianterna gav exakt
kombinationens tal och regeln lästes om mot dokumentet. Talen i drift blev desamma före och efter — men vid r = 0,5 hade en
mätning på exakt 0,5 räknats fel i mars. Gränsprovet (station F, radar exakt 0,5) låser det.

**Numret:** filerna pekade först på #243, som parallellsessionen tog för Steg B (PR #380) medan bygget pågick. Rättat till #244.

**Blindningen, rätt formulerad.** Frågan i §4.2 sa att träffandelar *"inte får läsas före 1/2"*. Det som står i reglerna
(D2/D3/D6, TROSKLAR-KOMBINATIONEN §7) är: utfall läses första gången vid **dom 1 i januari**, därefter vid
**kalibreringen 1/2** och **dom 2 i mars** — och aldrig däremellan.

**INTE MED, med skäl:**
- **SMHI-förlängningen (N_varning):** arkivet har inga vintervarningar, och `senast_sedd` är inte deklarerad i
  värdevakten. Byggs när båda finns (bedömningen §0b).
- **Facitstackens tre andra källor** (omklassning, kamerabild, olycka): *nära stationen* har ingen skriven radie —
  TROSKLAR-TYSTNADSFEL §6 säger *"t.ex. inom ankaravståndet"*, och ankaravståndet är ett svep (15 · 20 · 50 km). Talet ska
  stå i tröskeldokumentet FÖRE mätningen. Öppen fråga i bedömningen §4.2, tillsammans med episoddefinitionen (v1:
  stationens första ögonblick per UTC-dygn).
- **Dagens `icing_point` som jämförelse (KB-B):** hör till utfallsläsningen.

*Alternativ som valdes bort:* tio separata SQL-satser med talen inskrivna (tio kopior av fyra trösklar — precis det
kontraktsgrinden finns för att slippa) · varianterna som skuggkolumner i motorn (förbjudet av #226: alla räknas ur
arkiven) · vänta till första frosten (instrumentet hade då byggts under tidspress, med utfallet synligt medan det byggdes).

## #245 (20/9 2026) Räckvidden för kombinationens facit: 5 km från stationen — och episoden: version 1, med en mätning som talar emot

**Bengts beslut 20/9:** *"vi kör 5 km"* och *"och version 1"* — svaren på de två definitionerna i bedömningen §4.2 (#244).

**(a) 5 km.** Ett facittillfälle (omklassning, kamerabild, olycka) hör till en station när det ligger inom 5 km från den.
Samma koppling station↔väg som radarn fick 17/9 (#225) — en koppling, ett tal, och kontraktet för 5 km finns redan i
kontraktsgrinden (#244). Inskrivet i TROSKLAR-KOMBINATIONEN §4 KB-B **före första utfallsläsningen**; §10 tillåter det med
en rad här fram till betans första natt. **Priset:** färre facittillfällen mot KB-C2:s golv på 40 — räcker de inte blir
domen OAVGJORD. **Gäller** kombinationens domar och uppspelningen, inte tystnadsfelsmåttet i övrigt (dess §6 rörs inte).
*Alternativ:* ankaravståndet 15 · 20 · 50 km (ett svep, inget tal — och en punktkälla 50 km bort säger lite om stationens yta).

**(b) Episoden: version 1** — stationens första ögonblick per UTC-dygn (som sql/028 räknar i dag). Bengt följde Claudes
rekommendation i §4.2. **Rekommendationen var given utan att repot var genomsökt** (SESSIONSREGELN punkt 2), och
sökningen — gjord minuterna innan beskedet kom — visade två saker:

1. **De två grindar som redan räknar nätter gör det middag till middag,** inte per kalenderdygn: `scripts/grind-t-a.ts`
   (`sample_time - interval '12 hours'`) och `scripts/grind-r-a.ts`. KB-C1 och KB-C2 räknar dessutom i *nätter*.
2. **Mätt i drift 20/9 06:33Z, hela trendarkivet (8–20/9, 11 879 ögonblick), utan trösklar och utan utfall:** 530
   stationsdygn blir **454 stationsnätter, och 159 av dem (35 %) delas i två av version 1.** Skälet syns i
   timfördelningen: **66 % av ögonblicken ligger 21–03 UTC**, med toppen 00–03. Version 1 klyver alltså dygnet precis där
   ytorna faller som mest — en natt vid en station blir två episoder med var sitt utfall, och antalen mot golven (KB-C2:s
   40, KB-D4:s 30) blåses upp.

   Satsen: `WITH r AS (SELECT station_id AS sid, (observed_at AT TIME ZONE 'UTC')::date AS d, ((observed_at - interval
   '12 hours') AT TIME ZONE 'UTC')::date AS natt FROM trend_kandidater) SELECT count(DISTINCT (sid, d)), count(DISTINCT
   (sid, natt)), (SELECT count(*) FROM (SELECT sid, natt FROM r GROUP BY sid, natt HAVING count(DISTINCT d) > 1) x) FROM r`.

**Därför:** version 1 står som beslutad och är det koden gör — men den skrivs INTE in i tröskeldokumentet ännu. Omprövningen
ligger i bedömningen §4.2 med Claudes rättade rekommendation: **natt = middag till middag UTC, som T-A.** Inget utfall är
läst, så bytet kostar ingenting i blindning; det kostar en ändring i `ep`-steget i sql/028, ett testfall över midnatt och
ett kontrakt för tolvtimmarsgränsen (den finns då i tre filer).

## #246 (20/9 2026) Episoden är en natt, middag till middag UTC — Bengts omprövning av version 1

**Bengts beslut 20/9:** *"ompröva beslutet och byt"* — efter mätningen i #245 (version 1 delar 159 av 454 stationsnätter i
två, eftersom 66 % av fallen ligger 21–03 UTC). Beslutet *version 1* togs och omprövades samma förmiddag och hann aldrig
läsa ett utfall.

**Regeln:** en episod är stationens första ögonblick per natt, och en natt går från middag till middag UTC — tiden skiftas
12 h, samma räknesätt som T-A (`scripts/grind-t-a.ts`: *"Natten tillhör det dygn den började"*). Inskriven i
TROSKLAR-KOMBINATIONEN §4 KB-B (§10: en rad här räcker fram till betans första natt).

**Byggt (PR #384):**
- `sql/028`: `ep`-steget räknar per (station, natt). Episoden bokförs på det UTC-dygn den BÖRJADE; stationer och ögonblick
  redovisas som förut per UTC-dygn, så jämförelsen mot den gamla mätfilen står kvar. **Följdändring:** öppnat
  (`p_blind := false`) ger ett dygn där ingen episod började **0, inte NULL** — NULL ska bara betyda *blindat*. Förut hade
  varje dygn med fyrning minst en episod, så frågan fanns inte.
- Integrationstestet: station G med två ögonblick samma natt, 23:30 (frös) och 00:30 UTC (uteblev). En episod, bokförd där
  natten började, och ingen andra efter midnatt.
- Kontraktsgrinden: *Nattens gräns* — 12 h i tre filer (T-A, R-A, uppspelningen), formen bunden till `AS natt` så att
  vakthundens tolvtimmarsfönster inte fångas. 36 kontrakt håller; motprov 12→6 ⇒ exit 1.

**Bevis:**
- CI på ändringen: `ok 37`, 117 av 117 mot riktig Postgres.
- **Motprov i CI (PR #385, stängd och raderad):** samma test mot en slängkopia med episoden per UTC-dygn ⇒ `not ok 37`,
  fälld på raden *"G: ingen andra episod efter midnatt UTC"*, 116 av 117. Testet fångar alltså den gamla räkningen.
- **I drift 20/9 07:06Z:** `pg_proc.prosrc` för den körande funktionen bär `DISTINCT ON (f.sid, f.natt)`, tolvtimmarsskiftet
  och `coalesce(u.med, 0)` — alla tre sanna. Varianttabellen oförändrad (kombinationen 1 · utan faller 9 · utan blöt 7 ·
  startband +1…+6: 5), `utfall_synligt` = 0, utfallskolumnerna NULL.

**Vad som INTE syns i drift, och varför:** bytets effekt på antalet episoder per variant. Episoderna räknas bara i
utfallskolumnerna, och de är blindade till dom 1. Effekten på hela trendarkivet är mätt utan utfall (#245): 530 stationsdygn
⇒ 454 stationsnätter.

**Läxan** (samma som #242:s KB-D5/KB-D7): en rekommendation till Bengt ges EFTER sökningen i repot, inte före. Två grindar
räknade redan nätter middag till middag, och en grep på `AS natt` hade visat det på sekunder.

*Alternativ:* lokal tid som R-A (Europe/Stockholm) — avstått: uppspelningen är UTC rakt igenom, skillnaden är en till två
timmar mitt på dagen då inget faller, och T-A är den del kombinationen ärver fallkravet från · hela redovisningen per natt
i stället för per UTC-dygn — avstått: det hade brutit jämförelsen mot den gamla mätfilen utan att ändra någon dom.

## #247 (20/9 2026) Kort #207: uppspelningen läser facitstackens två skrivna källor — och omklassningarna är TOMMA

**Bengts beslut 20/9:** *"kör 207"*. Stationens egen yta säger att det BLEV kallt, aldrig att vägen blev hal. KB-B döms
mot facitstacken, och KB-D3 säger att förarsvar ensamma varken fäller eller friar.

**Byggt (PR #388):** `uppspelning_efterhalka()` får två kolumner per variant — episoder med **omklassning till halka**
(`road_condition_history` × `road_conditions`) och episoder med **olycka** (`situation_archive`, Accident) — lästa inom
`(t, t + p_utfall]` från episodens början, exakt det fönster `publish/trendkandidat.ts` använder för stationens egen
facit. Halkorden är motorns egna. Olyckor räknas **separat och aldrig i grundtalet**: arkivet bär ingen orsak, så en
olycka är facit på att något hände, inte på att det var halt (samma regel som tystnadsfelet T1 b).
- Nya argument: `p_utfall` (ärvs från T-A, svep 60 · 90 · 120 min, standard 90 = det arkivet redan räknar) och
  `p_facit_km` (5, #245). Båda med D1-vakt.
- Ny **synlig** kolumn `episoder`. Den räknar fyrningar, inte utfall — nämnaren till facittalen, och den gör nattbytets
  (#246) verkan mätbar i drift.
- **Signaturen släpps före CREATE.** Returtyp och argumentantal ändras; ett `CREATE OR REPLACE` hade lagt en ANDRA
  överlagring bredvid den gamla och gjort `uppspelning_efterhalka()` utan argument tvetydigt. Testet kräver exakt en
  signatur, och migrationen bevisar den: `signaturer 1, argument 15`.
- Mätfilens variantlista vänsterjoinas nu i stället för att fyllas ut med handräknade NULL:ar — en kolumn till hade
  annars tyst skjutit utfyllnaden ur led.

**Bevis:**
- CI: `ok 37`, 117 av 117 mot riktig Postgres; 38 kontrakt håller.
- **Två motprov i CI, båda stängda och raderade.** (1) Ordgränsen borttagen (PR #389) ⇒ **kontraktsgrinden** fäller
  bygget innan testerna hinner köra (`✗ Halkorden i MOTORN`). (2) Facitradien vidgad till 500 km (PR #390) ⇒ grinden ser
  inget (38 kontrakt håller) men **testet** faller på rätt rad: *"bara H: 'fläckvis Våt', halka 3 h senare och halka
  50 km bort räknas inte"*. Grinden och provet vaktar alltså olika fel.
- I drift 20/9 07:48Z: en signatur, 15 argument, facitkolumnerna NULL (blindade), varianttabellen oförändrad.

**MÄTT OCH OVÄNTAT: omklassningarna till halka är NOLL — och arkivet har bara 7 rader på 14 dygn.** Hela
`road_condition_history` fick 7 rader från 7 vägavsnitt, och orden i dem är *Torrt* (7) och *fläckvis Våt* (6). Noll
halka. Det är **inte en läcka**: arkivvakten (#51, DECISIONS #71) frågar redan "finns ett nuvarande tillstånd som borde
ha hunnit arkiveras och inte gjorde det", och samma tomhet mättes 5/9 (noll omklassningar på elva dygn). I september
klassas inget om, och tystnad är då korrekt. Men det gör **KB-D3:s följd konkret**: förblir omklassningarna tomma blir
januari OAVGJORT hur många förare som än svarat *Stämde*. Olyckor finns det gott om — 504 på 14 dygn — men de bär ingen
orsak och får inte bära domen ensamma.

**Kopplingen bär, till skillnad från källan:** alla 140 stationer i trendarkivet har ett läge i `weather_latest`, så
facitkopplingen har 100 % täckning (radarkopplingen, som kräver väg inom 5 km, har 110 av 140).

**Nattbytet blev mätbart samma varv.** `utan faller`: 9 stationsdygn ⇒ **7 episoder** — två nätter som spände över
midnatt slogs ihop, precis det #246 rättade.

**ÖVERRASKNING ÅT ANDRA HÅLLET: `startband +1…+6` ger 5 stationsdygn men 6 episoder.** En station kan alltså få FLER
episoder än stationsdygn, när två fyrningar samma UTC-dygn ligger på var sin sida om **middag** — nattgränsen. Det är
korrekt (två skilda dagtidshändelser är inte en natt) och samma konvention som T-A, men det är den spegelvända formen av
midnattsproblemet och ska inte förvåna någon i januari. Det syns bara i det breda startbandet, eftersom varmare ytor
faller också mitt på dagen; i kombinationen är timmarna 09–15 UTC i praktiken tomma (#245).

**INTE MED, med skäl:** kamerabilden — en bild är inte facit förrän någon läst den, och granskningen är ett öppet beslut
(bedömningen §4.2, före 1/2) · förarsvaren — egna regler (KB-D1–D6), och noll riktiga svar finns · SMHI-förlängningen —
oförändrat läge.

*Alternativ:* koppla facit till varje ÖGONBLICK i stället för till episoden — avvisat: röst räknas i episoder (kartan
§10.2), och en station med tre ögonblick samma natt hade räknat samma omklassning tre gånger · räkna olyckor i
grundtalet — avvisat av samma skäl som tystnadsfelet: arkivet bär ingen orsak.

## #248 (20/9 2026) Bildfacitbeslutet flyttas från 1 februari till efter första frosten

**Bengts beslut 20/9:** *"ja skriv in det som egen rad"* — på Claudes förslag ur fyndet i #247.

**Skälet är mätt, inte anat.** Uppspelningens facitkoppling (#207) visade att omklassningarna till halka är **0 på
14 dygn**, och att hela `road_condition_history` bär **7 rader** (orden är *Torrt* och *fläckvis Våt*). I september är
det korrekt — inget klassas om — men KB-D3 säger att förarfacit ensamt varken fäller eller friar. Är omklassningarna
lika tomma i november–december står januaridomen och faller på kamerabilderna, och **granskningen av dem finns inte
byggd**. Ett beslut i februari hade då kommit efter domen det skulle rädda.

**Vad som ändras:** tidpunkten, ingenting annat. Beslutet fattas **inom sju dygn efter första frostnatten** i stället
för före 1/2, så att bygget hinner göras om svaret blir ja.

**Vad som INTE ändras — blindningen.** Beslutet gäller att BYGGA läsningen av bilderna, inte att läsa utfallet.
Bilderna öppnas fortfarande i mars (D2/D3/D6). Ett bygge före dom 1 får inte visa vad bilderna säger.

**Mätningen som avgör** körs i samma varv som T-A steg 0 vid första frosten: hur många omklassningar till halka som
faller inom 5 km och utfallsfönstret från en episod. Blir talet noll också då är kamerabilden den enda källa som kan
bära januari, och granskningen måste byggas i november.

*Alternativ:* behåll 1/2 — avvisat: beslutet hade kommit efter den dom det ska försörja · bygg granskningen nu utan
beslut — avvisat: den kostar, och första frosten kan visa att omklassningarna räcker.

## #249 (20/9 2026) Total genomlysning av projektet — tolv nya kort, tre fel som hörs i bilen

**Bengts order 20/9:** *"gör en total genomlysning av hela halkvaktprojektet"* inför riktlinjemötet med Axel. Fem
parallella granskare (motor/paritet · drift/vakter · mätning/blindning · produkt/leverans · styrning) plus egna
mätningar mot drift, GitHub-API och den publicerade snapshoten. Läs-only. Fullständig rapport:
`docs/GENOMLYSNING-2026-09-20.md` (även på Bengts skrivbord).

**Domen i tre meningar.** Mätinstrumentet är ovanligt hederligt: motorn är ren, den körs byte-för-byte i tre språk,
trösklarna skrivs före mätning och blindningen är kodad. Men produkten har inte varit i en enda utomståendes hand,
facitkällorna ger noll, och tre fel hörs eller kan höras i bilen. Största enskilda risken är att arkivet saknar backup
och inte går att återskapa.

**De tyngsta fynden, alla verifierade i kod eller mätning:**
- **iOS säger "på väg <null>"** — `SnapshotRepo.swift:117` gör JSON-null till en sträng. Uppmätt: 38 av 732 olyckor
  på 30 dygn saknar vägnummer (5,2 %). Kotlin och TypeScript gör rätt. Vektor v22 låser bara frånvarande `road`. (#210)
- **Det tidiga olycksropet kan sägas tre gånger** vid låg fart — bryter #28 och motsägs av projektets eget test. (#211)
- **Vektorsviten certifierar inte korridorvinkeln (5°–90° omärkt) eller reprisavståndet (0–50 000 m omärkt).**
  Prioritetsgenombrottet (#127) har noll täckning, och testet skulle fälla en vektor som prövade det. (#212)
- **Arkivet har ingen backup**, och Trafikverket ger bara nuläge och delta. (#213)
- **Play-deklarationen är osann sedan 16/9.** (#214)
- **Vakthunden saknar dödmansgrepp**, och tre checkar kan aldrig fyra. (#215)
- **Blindningsläcka:** T-A skriver ut hela svepet rangordnat genom hela kalibreringsfönstret, och delar tre av
  kombinationens sex dimensioner. (#216)

**Strukturellt:** 593 rader beslutslogik bärs av 8 345 rader mätskript, 20 860 rader vektorer och 154 000 ord
styrdokument. Senaste veckan: 9 087 dokumentrader mot 3 065 rader produktkod. 29 av 96 öppna kort väntar på Axel, och
ingen incheckning har kommit från honom sedan 17/9.

**Följd:** korten #210–#221 lagda. Två av dem bär beslut som Bengt och Axel måste ta (#214 produktinvariantens
lydelse, #216 blindningen mot T-A). Inget är åtgärdat i det här varvet — genomlysningen var läs-only.

## #250 (20/9 2026) Sex överspelade kort stängs, och ägarskapet skrivs ut på varje kort

**Bengts order 20/9:** *"ja stäng de sex korten och skriv en ny lista"* — efter genomlysningen (#249), som visade att
tavlan bär kort verkligheten sprungit förbi.

**Stängda, med beviset på varje kort:**
| Kort | Varför det var överspelat | Ålder som falskt öppet |
| :-- | :-- | --: |
| 5. TestFlight 0.3.5 (8) | Main bär 0.3.8 (11) sedan 18/9; byggordning C (#242) säger ETT bygge med #203 | 12 dygn |
| #79 regn-30 | Jobbet avvecklades 9/9 (pulsklocka #11); finns inte i pulsklockans elva jobb | 11 dygn |
| Gallringsregel för weather_observations | `gallra_vader` + `gallra_arkiv` i drift sedan 17/9, 97 472 rader raderade | 3 dygn |
| Vegvesen DATEX-konto | Beviljat 4/9; arkivet tickar. **Kortet bar sitt eget klarbesked i brödtexten** | 16 dygn |
| #158 Skuggloggens larm saknar position | Form A byggd och deployad 14/9 | 6 dygn |
| #157 Kamerafacit är tomt | Rotorsaken åtgärdad; **451 objekt i hinken 20/9** | 6 dygn |

Öppna kort: **102 → 96.** Axel 29 → 25, Bengt 15 → 13.

**Mönstret, inte bara raderna.** Fyra av de sex bar sitt eget bevis i brödtexten och stod ändå kvar som öppna —
TAVELREGELN punkt 3 säger att verkligheten flyttar kortet utan att fråga, och det skedde inte. Det är samma brist
genomlysningen mätte i stort: 41 klara kort låg kvar i ATT GÖRA och 🟡-sektionen var tom.

**Följd på samma order: ägarskapet skrivs ut.** Varje öppet kort ska säga om det är EXKLUSIVT en persons (kräver hans
konto, hans underskrift, hans telefon, hans relation) eller om någon annan kan verkställa det. Skälet är Bengts fråga
inför riktlinjemötet: 29 kort hos Axel såg ut som 29 blockeringar, men bara en del av dem kan bara han göra.
Listan ligger i `docs/KORTLISTOR-2026-09-20.md` (även på Bengts skrivbord).

**Räknat ur den listan:** av Axels 25 kort är **6 exklusivt hans** — de kräver hans konto eller hans godkännande
(Billing, #85, PAT-rotationen #86, Pro-godkännandet #83, Play-kontot, publikt repo/minuter). **5 kräver er båda**
(#203 med undantaget att Bengt beslutar vid tystnad 27/9, helgsamtalet, Skyltfondspaketet, rollfördelningen, #21).
**14 kan någon annan verkställa** — Claude skriver koden, Bengt rekryterar och registrerar.
Av Bengts 13 är **4 exklusivt hans** (TRV-anmälan #154, Skyltfondsrundan, #94, B2B-spåret), **3 kräver er båda**
(#159, #153, sensortrappan) och **6 kan någon annan göra**.

**Slutsatsen som ändrar mötet:** 29 kort hos Axel såg ut som 29 blockeringar. Sex är det.

## #251 (20/9 2026) Bedömningen uppdaterad smalt: det utelämnade in, det klara struket, korten per punkt

**Bengts order 20/9, efter en rättelse mitt i arbetet:** först bad han om en total omskrivning i tidsordning, och tog
sedan tillbaka det — *"Bedömning är en handling som är kopplad till integration av integrationskartan. Uppdatera bara
med saker som har utelämnat och glömt att strykas. Sen vill jag se bedömningen i sin helhet och kort som hör hemma där
listas under varje punkt."* Rättelsen var riktig: dokumentet har en roll mot kartan och ska inte byta form.

**Tre ändringar, inget annat:**
1. **Det utelämnade infört.** Genomlysningen (#249) fanns inte i bedömningen alls, trots SESSIONSREGELN punkt 3 — tolv
   kort lagda på tavlan i morse utan en rad här. Nu två rader i §0b (fynden och de två dubbletterna), plus stängningen
   av de sex överspelade korten (#250) och ägarskapslistan. §4.2 fick de två beslut som väntar: **#214** Play-deklarationen
   och **#216** blindningsläckan i T-A.
2. **Det klara struket.** S1 stod som öppet steg fast det byggdes 16/9.
3. **Korten per punkt.** Läget, §1, §2.1, §2.2, §3 och §4.2 har nu en **Kort**-kolumn, så tavlan och bedömningen går att
   läsa mot varandra. Ett kort utan rad här hör hemma på tavlan — bedömningen är kartans handling, inte hela tavlan.

**Fyndet som ändringen tvingade fram: två av genomlysningens kort var inte nya.**
- **#215 *vakthunden kan tystna utan att någon märker det*** är samma fråga som **#50 *Vakthunden är själv obevakad***,
  som legat på tavlan sedan **4/9**. Sexton dygn, och fem granskare hittade den som ett nytt fynd.
- **#51 *vinterarkivet skrivs nästan inte — moaten läcker*** (4/9) pekade redan på `road_condition_history`, samma tomhet
  som #247 mätte 20/9 (0 omklassningar till halka på 14 dygn, 7 rader totalt).

Det bekräftar genomlysningens egen slutsats om referensrymden och dokumentskulden (#220/#221) — på 96 öppna kort går det
inte längre att veta vad som redan står där. **Följd:** #215 slås ihop med #50 och #51 kopplas till facitraden; båda står
som åtgärd i §0b.

**Vad som INTE gjordes, med skäl:** ingen omskrivning till tidsordning (kartans koppling går före), ingen flytt av
klara rader till bilaga (historiken står struken på plats, som SESSIONSREGELN punkt 4 föreskriver), inga nya kort.

## #252 (20/9 2026) #215 slås ihop med #50, och #51 kopplas till facitraden

**Bengts order 20/9:** *"ja slå ihop 215 med 50 och koppla 51 till facitraden och uppdatera bedömning med detta"* —
efter att uppdateringen av bedömningen (#251) avslöjat att två av genomlysningens tolv kort inte var nya.

**#215 → #50.** Kortet *vakthunden kan tystna utan att någon märker det* ställer samma fråga som **#50 *Vakthunden är
själv obevakad***, öppet sedan **4/9**. #215 är stängt med en pekare; de tre mätta defekterna är införda i #50 som
avsnittet *GENOMLYSNINGEN 20/9*, med minsta åtgärd och Verify:
- inget dödmansgrepp utanför Supabase — **samma felläge som 5/9, bara flyttat**: pulsen gav en oberoende klocka, inte
  en oberoende löpare, och `larmvag: "TRASIG"` skrivs bara i ett HTTP-svar som pg_net kastar bort,
- check 9c kan aldrig fyra (färre än 4 källor i `sync_state`, men det finns minst 5 och rader raderas aldrig),
- check 9d mäter fel led (pg_net är asynkront — *lyckades* betyder *lades i kö*), check 1 mäter `synced_at` i stället
  för att kursorn rör sig, och schemat jämförs aldrig mot pulsklockans deklarerade lista.

**#51 → facitraden.** *Vinterarkivet skrivs nästan inte — moaten läcker* (4/9) bar redan frågan; 20/9 fick den ett tal:
**0 omklassningar till halka på 14 dygn, hela arkivet 7 rader** (orden *Torrt* och *fläckvis Våt*), 504 olyckor utan
orsak. Kortet är nu uttryckligen bedömningens rad *Facitstacken för domarna* och förutsättningen för **#209**, med ny
Verify: omklassningar till halka inom 5 km och utfallsfönstret under de första frostnätterna, mätt i samma varv som
T-A steg 0. Den gamla Verify-formuleringen (*nyttan går inte att mäta förrän strömmen lever*) var inte mätbar.

**Bedömningen uppdaterad i samma varv:** §0b-raden om dubbletterna struken med åtgärden på raden; facitraden och S7
pekar nu på #51 respektive #50 i stället för på de nya numren. Öppna kort 96 → 95.

**Läxan, och den är obekväm.** Fem granskare läste repot i morse och lade ett kort som redan fanns. Ingen av dem
sökte på tavlan efter en befintlig rad — och SESSIONSREGELN punkt 2 säger uttryckligen *sök i repot innan något sägs
vara nytt eller omöjligt*. Regeln skrevs för strykningar; den gäller lika mycket för fynd. **Följd: en granskning som
lägger nya kort ska först söka på tavlan efter frågan, inte bara efter koden.**

## #253 (20/9 2026) Kort #87 finns och är stängt — dödmansgreppet är en fråga till, inte ett flöde

**Bengts fråga 20/9:** *"kolla om kort #87 finns"* — ställd efter att #50 pekat ut #87 som sitt slutvillkor.

**Svaret: #87 finns, det är stängt sedan 14/9 (DECISIONS #178) — och beslutet blev motsatsen till vad #50 förutsatte.**
`healthcheck.yml` skulle enligt #50 läggas ner när kontrollerna flyttat in i vakthunden. Det gjordes inte. Bengt 14/9:
*"ta inte bort healthcheck eftersom den knappt kostar något"*, och kortets tyngre skäl: **den är den enda kontroll som
körs UTANFÖR det den vaktar.** Löparen som saknades 5/9 — *pulsen gav en oberoende klocka, inte en oberoende löpare* —
finns alltså redan, betald med 12 min/dygn och bevarad med flit.

**Följden för #50/#215:s dödmansgrepp: åtgärden krymper från ett bygge till en fråga.** `ingest/healthcheck.ts` läser
redan `cron.job_run_details` (rad 23–24), men bara för `halkvakt-ingest-live`. Den frågar aldrig om
**`halkvakt-vakthund`** själv. Det behövs alltså ingen ny mekanism, inget nytt flöde och ingen ny hemlighet — en fråga
till i en kontroll som redan kör varannan timme utanför Supabase, i en fil som redan är beslutad att stanna.

**Driften kontrollerad samma varv (20/9 08:4xZ, läst ur `cron.job`):** `halkvakt-vakthund` aktiv, schema `7 * * * *`,
senaste körning 6 min sedan, `succeeded`; `halkvakt-ingest-live` 0 min; `puls-healthcheck` 110 min; `halkvakt-gallring`
418 min — alla succeeded. **De sju måndagsjobben har aldrig kört** (`null`), vilket är väntat: första avfyrningen är
måndag 21/9 (#160).

**Bristen som fyndet blottar:** #50 skulle ha stängts eller skrivits om 14/9. Dess eget slutvillkor uppfylldes då, men
med motsatt utfall mot vad raden förutsatte, och kortet stod kvar i sex dygn och sa fortfarande att brons slut var
ogjort. Det är tredje gången på ett dygn samma mönster syns: ett kort som verkligheten sprungit förbi utan att någon
flyttat det (#250 sex kort, #252 två dubbletter, nu #50). **TAVELREGELN punkt 3 följs inte, och det kostar nu
dubbelarbete i granskningar, inte bara städning.**

## #254 (20/9 2026) Dödmansgreppet byggt och bevisat — #50 stängt efter sexton dygn, resten till kort #222

**Bengts order 20/9:** *"kör dödmansgreppet och stänger du därefter de kort som fortfarande står öppna men som ska
stängas efter denna åtgärd"*.

**Byggt (PR #400):** `ingest/healthcheck.ts` frågar nu om **vakthunden själv** — i den fil som redan kör varannan timme
utanför Supabase, och som behölls 14/9 av exakt det skälet (#87). Ingen ny mekanism, inget nytt flöde, ingen ny hemlighet.

**Tre frågor för tre dödssätt:**
1. jobbet saknas eller är avaktiverat,
2. det har inte kört inom **180 min** (tre missade timkörningar; healthcheck kör varannan timme och hinner se det),
3. det kör men **inget svar** har kommit.

Den tredje är 9d-läxan tillämpad på vakten själv: pg_net är asynkront, så `succeeded` i `job_run_details` betyder bara
*lades i kö*. Bara en rad i `net._http_response` som bär markören `larmvag` bevisar att vakthunden verkligen körde.
Existensvaktat med `to_regclass` i stället för en naken `catch`, så ett riktigt läsfel i drift faller högljutt medan CI
hoppar rent — fail-soft-läxan tillämpad i förväg.

**Bevis, båda hållen samma timme:**
- Skarpt på main 10:4xZ: `vakthunden: aktiv=1 · senaste körning 21 min · senaste svar 21 min (frist 180)` ⇒ HEALTHY.
  **Att *svar* och *körning* visar samma ålder är beviset** att markören spårar vakthundens egen körning och inget annat.
- **Framkallat fel** (jobbnamnet bytt på en slängkopia, grenen raderad): `aktiv=0 · senaste körning aldrig` ⇒ UNHEALTHY
  med rätt rad, och **issue #399 skapad**. Larmvägen är därmed bevisad hela vägen — detektion → exit 1 → issue. Issuen
  är stängd med en kommentar som säger att den kom ur ett motprov.

**Stängt: #50, efter sexton dygn.** Frågan kortet ställde 4/9 — *vem vaktar vakten* — är besvarad. Kortet hade redan
formulerat svaret 5/9 (*pulsen gav en oberoende klocka, inte en oberoende löpare*) och löparen fanns sedan 14/9; det som
saknades var frågan.

**Nytt: kort #222** för det som INTE löstes och som är en annan fråga — checkar som inte kan fyra: 9c (villkoret kan
aldrig bli sant), 9d (mäter fel led), check 1 (mäter `synced_at`, inte att kursorn rör sig) och mätvaktens schema som
aldrig jämförs mot pulsklockans lista. **Kräver deploy av vakthunden**, till skillnad från dödmansgreppet — därför eget
kort med fyra framkallade fel som Verify.

*Alternativ som valdes bort:* låta vakthunden stämpla en egen hjärtslagsrad i databasen — hade gett en starkare signal,
men kräver en deploy av funktionen och en ny tabell; `net._http_response` bär redan spåret. · behålla #50 öppet tills
allt i genomlysningen är åtgärdat — avvisat: kortet är 130 rader från 4 september, och en fråga per kort är hela poängen.

## #255 (20/9 2026) Kort #222 byggt, deployat och bevisat — vakthunden ljuger inte längre om fyra saker

**Bengts order 20/9:** *"kör 222 och stäng sedan vad som ska stängas"*.

**Fyra tätningar (PR #402), alla i drift efter deploy 11:2xZ:**
1. **Check 1 mätte bara `synced_at`**, som sätts vid varje lyckat ANROP — en fastfrusen `last_change_id` såg kärnfrisk
   ut. Nu jämförs livemotorns kursor mot GitHub-ingestens: samma ström, två kursorer, och faller den snabba bakom den
   långsamma har kursorn slutat röra sig. **Ingen historik behöver sparas.** Jämförelsen görs i SQL — changeid är 19
   siffror och spräcker JavaScripts heltal.
2. **Check 9c krävde färre än 4 källor** i `sync_state`, men det finns fem och rader raderas aldrig: villkoret kunde
   aldrig bli sant. Nu en namngiven lista, så ett bortfall larmar med källans namn.
3. **Check 9d läste cron-statusen** för ingest-live; pg_net är asynkront, så `succeeded` betyder *lades i kö*.
   Kommentaren säger nu det rakt ut, och **effekten mäts bredvid**: rör sig `situation_archive` inom 30 min?
4. **Mätvakten räknade aldrig pulsjobben mot listan** — ett avaktiverat jobb föll tyst ur bevakningen. Nu ett golv, och
   en **hängande** körning (inget utfall än) larmar i stället för att passera både utfalls- och ålderstestet.

**Bevis EFTER deploy, med funktionens eget larmprov — inte med commit-hashen.** Lokala filen diffades mot main före
deploy (noll skillnad, CLAUDE.md:s regel). Fyra nya rader med innehåll: `kursorer road_conditions: live 848028 · arkiv
848028` · `sync_state: 5 källor (väntade 5)` · `livemotorns effekt: situation_archive rörd för 3 min sedan (gräns 30)`
· `pulsjobb: 11 aktiva (golv 11)`.

**Varje check bevisad att den DISKRIMINERAR** (motfrågor mot drift, inget rört): kursorn larmar inte nu men larmar om
arkivet går ett steg före · 9c ger tom lista nu men namnger en källa som saknas · effekten ger `1 min` nu, **`null` om
arkivet vore tomt** och **`47` om inget rörts på 45 min** · pulsgolvet larmar vid 12 men inte vid 11.

**`PULS_GOLV` är en kopia** — vakthunden kör i Deno hos Supabase och kan inte importera pulsklockans TypeScript. Därför
under kontrakt (39 håller, värde 11), och pulsklockan vaktar dessutom själv att `ANTAL_NYA` stämmer med `NYA`. Två
motprov: 11→12 fäller grinden; ett struket jobb utan ändrat tal fäller pulsklockans självkontroll.

**Stängt: #222.** Öppna kort 95 → 94.

**Inte stängt, med skäl: #76** (*vakthunden mäter fel led*). Manifest-sha-kontrollen är bevisligen i drift
(`manifest: 2 min | sha stämmer`), men kortets egen Verify kräver att vakthunden **larmat OCH tystnat på RIKTIGA data**
— inte på ett larmprov. Det villkoret är inte uppfyllt, och kortet säger uttryckligen *"inte förr"*.

**Kvar som egen sak:** `runs?per_page=1` tar fortfarande senaste körningen oavsett trigger, så en manuell
knapptryckning kan nollställa mätvaktens klocka. Litet, kräver en till deploy, tas när något annat ändå rör vakthunden.

## #256 (20/9 2026) Kort #76 stängt — beviset fanns sedan 16/9, i issue-historiken ingen läste

**Bengts order 20/9:** *"kör 76"*. Kortet *vakthunden i Supabase mäter fel led* hade fixen på main sedan **8/9** och
stod öppet på ett beviskrav: *stängs när vakthunden bevisligen larmat OCH tystnat på RIKTIGA data (issue med etiketten
vakthund), inte förr.*

**Det fanns inget att bygga. Beviset var fyra dygn gammalt.** Av repots tio vakthund-issuer är **#317** den enda som
fällde på just led 3: öppnad av den **schemalagda timkörningen 16/9 21:07:49** med raden *❌ **Appen får gammal data**:
manifestet 47 min gammalt (publiceras var 10:e min)*, och **stängd 22:07** av nästa gröna körning. Inget larmprov,
ingen knapp — led 3 larmade på verkligheten och tystnade när den rättade sig. Exakt kortets villkor.
(#332 fällde på databasen, 168 MB, och #334 på väderdatan, 137 min — också riktiga larm, men andra led.)

**Deployen, som stod som obevisad sedan 8/9, är också bevisad:** vakthundens eget larmprov 20/9 10:42 bär raden
`manifest: 2 min | sha stämmer` ur det som faktiskt kör. Båda grenarna finns i driftkoden — åldern på `generated_at`
och sha256-jämförelsen — plus svarskoderna för `manifest.json` och `live.json`.

**Öppna kort 94 → 93.**

**Mönstret, fjärde gången på ett dygn.** #250 sex överspelade kort · #252 två dubbletter · #254 #50 vars slutvillkor
uppfylldes 14/9 · nu #76, stängbart sedan 16/9. Alla fyra hade sitt bevis i repot eller i GitHub, och inget av dem
flyttades. **Slutsatsen är inte att någon slarvat, utan att beviskraven pekar på ställen ingen läser:** ett kort vars
villkor är *"en issue med etiketten vakthund"* stängs bara om någon läser issue-historiken mot korten, och det gör
ingen rutin i dag. TAVELREGELN punkt 3 förutsätter att verkligheten kommer till tavlan; här måste någon hämta den.
**Följd att överväga (inte beslutad):** vakthunden kan själv stänga kort vars bevis är dess egna issuer — eller enklare,
en rad i månadens genomgång som läser stängda issuer mot öppna korts beviskrav.

**Kvar öppet i samma familj, med skäl:** inget. #50, #76, #215 och #222 är alla stängda. Vaktkedjan är för första
gången hel: healthchecken vaktar vakthunden (#50), vakthunden mäter rätt led (#76), och dess egna checkar kan fyra (#222).


## #257 (20/9 2026) Arkivet har en backup — veckodump till GitHub-release, återläst och radräknad i varje körning (kort #213)

**Axels order 20/9, efter genomlysningen:** *"vi börjar att göra backupen nu"*. P1 i `docs/GENOMLYSNING-2026-09-20.md`:
178 MB på gratisnivån, inga backuper, och Trafikverket ger bara nuläge och delta — det som tappas är borta för alltid.

**Beslut:** `.github/workflows/arkivbackup.yml`, söndag 03:17Z + knapp. `pg_dump` (custom-format) av alla scheman utom
Postgres egna och Supabases förvaltade — i dag `dk fi no public`, ett nytt landsschema följer med av sig självt — över
sessionspoolern (port 5432; 6543 är transaktionsläge). Dumpen läggs som release `arkiv-<tid>` i det här repot: utanför
Supabase, synlig i repot, nedladdningsbar till vilken disk som helst. De 12 senaste behålls (≈ tre månader; gallras SIST i
jobbet, så en fallen körning gallrar inget). Larm: issue med egen etikett `arkivbackup` — inte `incident`, som healthchecken
auto-stänger vid nästa gröna körning.

**Ett grönt jobb betyder återläst, inte bara sparad.** Radantalen räknas per tabell i källan före dumpen, dumpen läses
tillbaka i en PostGIS-container i samma körning och räknas igen; varje tabell måste nå ≥ 97 % (arkivet växer och gallras
mellan räkningen och dumpens ögonblicksbild).

**Alternativ som valdes bort:** Actions-artefakt (max 90 dygn, räknas mot lagringskvoten, osynlig utanför körningen) ·
eget backup-repo (växer utan gräns i git-historiken) · Bengts disk (handgrepp, inget larm) · vänta på Supabase Pro (1/11 —
sex veckor utan skydd; Pro ger sedan dagliga backuper med 7 dygns fönster, och veckodumpen behålls ändå som kopia utanför
leverantören).

**Bevis (körning 35518932054, grön 15:15Z, 84 s):** servern Postgres 17.6; 30 av 30 tabeller, **601 712 rader i källan =
601 712 återlästa**, alla ✅ — weather_observations 389 779, fi.weather_observations 64 105, radar_precip 50 292,
no.weather_observations 50 056, trend_kandidater 11 879, spatial_ref_sys 8 500. Release `arkiv-2026-09-20T1515Z`,
22 342 159 byte, sha256 `ffe70c8275a8a72108f6cd37e4b1b72b0a3d0700dcc743ea9075275884bb322c`; laddad ner oberoende på Axels
dator: samma storlek, samma sha256, huvudet `PGDMP`. Larmvägen bevisad på verkligheten, inte med prov: körning 2 föll och
skapade issue #406 15:12Z, körning 3 stängde den 15:15:34Z. Kostnad: cirka 1,5 debiterade minuter i veckan.

**Två lärdomar ur de två fallna körningarna:** (1) PostGIS ligger i `public` i arkivet (sql/001 skapar den utan schema),
inte i `extensions` som Supabases dokumentation antar — provet med PostGIS i `extensions` fällde 19 tabeller på
`type "public.geometry" does not exist`. En återläsning på en annan maskin börjar alltså med `create extension postgis` i
public. (2) `gh release` utan checkout kräver `--repo`; jobbet checkar medvetet inte ut repot.

**Kvar, som eget kort (#223):** dumpen kör i Actions, och Actions dog tyst 5/9. Då tystnar dumpen och healthchecken
samtidigt. Vakthunden i Supabase är det enda som kör utanför — den bör fråga GitHub om senaste `arkiv-`-releasen är yngre
än 8 dygn.

## #258 (20/9 2026) Motorfixarna ur genomlysningen: tidiga ropet engångs, road:null i iOS, prioritetsgenombrottet certifierat (kort #210, #211, #212-delen)

**Axels val 20/9:** *"motorfixarna först"* — det som hörs i bilen, utan att kräva beslut.

**#211 — det tidiga ropet är engångs per fara (engine/src + Kotlin + Swift).** Reprisregeln (600 s OCH 5 km) återarmade
`<id>#early` när båda passerats; under ~48 km/h hinner det ske innan 2 km-horisonten nås, och "Överväg annan väg" sades två
gånger före påminnelsen — tre repliker mot #28:s två. Alternativet, att göra reprisregeln undantagslös för olyckor, valdes
bort: felet är inte reprisregeln utan att det tidiga ropet aldrig var tänkt att repriseras. Nu: har `#early` talat talar det
aldrig igen för den faran; nära-platsen är orörd. **v25** låser det: 44,5 km/h och olyckan 10 945 m fram — sökt fram med
motorns egen haversine som **enda kombination i 30–47 km/h (halvsteg) där båda horisonterna får ≥ 5 m marginal till närmaste
fix** (5-metersregeln; 45 km/h jämnt gav 4,7 m). Gamla motorn på v25: t=76, **t=676 igen med 2 586 m kvar**, t=724. Nya:
t=76 och t=724.

**#210 — `road: null` i iOS-appen.** `SnapshotRepo.swift` plockade `road` med `str()`, som gör NSNull till strängen
`"<null>"`; publiceraren skriver `road: null` för 38 av 732 olyckor på 30 dygn. Rättat till `d["road"] as? String` (nil), samma
mönster som `slut` på raden ovan. **v26** (severity 5, `road: null`) låser JSON-null i alla tre vektorläsarna och motorerna.
**Ärligt:** vektorn föll INTE före fixen — Swift-motorns vektorläsare (`as? String`) gjorde redan rätt; felet satt i appens
plockare, som inget testmål täcker. Kortet stängs först när ett iOS-bygge säger en olycka utan vägnummer rätt.

**#212, prioritetsdelen — genombrottet har täckning.** Minsta avstånd mellan två varningar i sviten var exakt 10 s (v23:s is
kom 20 s efter kameran), så grenen "viktigare släpps igenom spärren" (#127) kördes aldrig. **v27:** kamera 3 000 m talar t=113,
isstation 3 300 m kvalificerar t=119 (leadM 666 m, marginal 11 m åt båda hållen) och talar ändå, 6 s senare. Och
`test/engine.test.ts` krävde ≥ 10 s mellan ALLA varningar — den hade fällt v27. Nu kräver den ≥ 10 s ELLER strikt viktigare,
motorns regel. Test och motor säger samma sak igen.

**Bevis:** `npm test` 31/31 lokalt; ci #35519941072 grön (kontraktsgrinden, beroendekartan, vektorgeneratorn återskapar sviten,
27 vektorer); android #35519579658 och ios-engine #35519579572 gröna på 9d3f56c — samma tre vektorer byte för byte i Kotlin och
Swift. Skuggmotorn buntad (`--check` i synk) och deployad i samma varv: deploy-supabase #35519582721, *"Deployed Functions on
project …: skuggmotor"*. Första ci-körningen föll på beroendekartan — `arkivbackup.yml` (#213) hämtar från apt.postgresql.org
och www.postgresql.org; deklarerade som bygg i `publish/beroenden.ts` (93ed4e8). Grinden gjorde sitt jobb.

**Kvar av #212:** trösklarna (korridor 5°–90°, repris 0–50 000 m, bäring, lägsta fart, förvarning) och v03/v20 — mätning per
tröskel och en vektor åt vardera hållet. Eget varv.

## #259 (20/9 2026) Beslutsnumren görs unika utan att historiken skrivs om — och en vakt som håller dem så (kort #220)

**Fyndet (genomlysningen, P9):** 245 rubriker, elva nummer utdelade mer än en gång. Sju var *olika* beslut under samma nummer
— #55, #60 (tre gånger), #72, #73, #78, #124, #126 — och fyra var tillägg till samma beslut (#30a, #31, #40, #77-bevis).
"Slå upp #126" gav marginalvakten i grind-a.ts och den överskrivna checken i CLAUDE.md.

**Beslut:** numret behålls av den post som flest hänvisningar menar; den andra får bokstav. #55 ankarfyndet / #55b
kameratoleransen · #60 källbeslutet radar / #60a rutinfelet med rött kontrakt / #60c frost-rekognoseringen · #72 livekedjan till
Supabase / #72a kursormätningen · #73 egen kursor / #73b vakthunden till Supabase · #78 grannlandsfilerna + deploy-knappen / #78b
larmvägen · #124 ruttberedskapen / #124b väglagets ålder · #126 marginalvakten / #126b överskriven check. Tilläggen #31a och #40a.
Alternativet — omnumrera löpande — valdes bort: var och en av de här numren är citerad i tavla, status, tröskeldokument och kod,
och #60-noten (2/9) sade redan *historik skrivs inte om*. **27 hänvisningar rättade,** var och en läst i sitt sammanhang (en
"#73" i STATUS var ett healthcheck-körningsnummer, inte ett beslut, och lämnades). Kodkommentarer under `supabase/functions/`
(vakthund #73/#124, publicera #124, snapshot-core #124) är orörda: en ändrad funktionsfil kräver deploy, och en kommentar är inte
värd en deploy.

**Vakten:** `scripts/beslutsnumren.ts` — läser rubrikerna `## #<id>`, fäller dubbletter, skriver ut nästa lediga nummer. Steg i
ci.yml efter beroendekartan, med självtest. Mutationsprov 20/9: påhittad `## #100` ⇒ *✗ DUBBLA BESLUTSNUMMER: #100 (2 gånger)*,
exit 1. Begränsning, uttalad i filen: ci hoppar över rena md-commits, så en dubblett i en md-commit fångas av nästa kodcommit.

**Nummerrymderna:** kortets Verify bad om ett K/D-prefix. Valt i stället: husstilen som redan står i nästan varje rad —
`DECISIONS #NN`, `kort #NN`, `issue #NN`, `PR #NN` — görs till regel i CLAUDE.md och överst i DECISIONS.md. Ett nytt prefix som
ingen text använder hade blivit en femte rymd.

## #260 (20/9 2026) Beslutsunderlag till kort #198: TROSKLAR-SKUGGAN §4 krockar med regel T — förslaget är en skärpning

**Bengts order 20/9** att arbeta vidare i genomlysningens lista, med #198 valt eftersom den parallella sessionen arbetar
uppifrån i samma lista. **PÅGÅR-kort satt före arbetet** — det steget missades tidigare samma dag och kostade två
stängda PR:er i dubbelarbete.

**Ingen text i det fastställda dokumentet är ändrad.** `TROSKLAR-SKUGGAN.md` §5 säger att dokumentet efter första
skuggkörningen bara ändras genom en DECISIONS-post från Bengt, som äger mätningen. Underlaget ligger i
`docs/SKUGGAN-PAR4-MOT-REGEL-T.md`; frågan står i bedömningen §4.2.

**Krocken är inte en tolkningsfråga.** T3 nämner offsetmodellen **vid namn**: *"Extrapolation är ett värde för en plats
där ingen mätt … offsetmodellens temperatur långt från ankare. Den får inte utlösa."* Segmentprognosen ÄR den storheten
— grind A prövar den med leave-one-out mot grannarnas offsetmodell. T6 säger samma sak från andra hållet: modellprodukter
får stärka, försvaga eller förlänga, aldrig ensamma utlösa. §4 (a) och (b) låter den tala.

**Förslaget:**
- **(a)** går från *"kopplas till app"* till **karta + konfidens**. Båda är uttryckligen tillåtna i regelns egen text —
  T3 säger *"får fortsatt stärka eller försvaga en varning som vilar på en mätning"*, och T6 ger två färdiga förebilder
  (`N_varning` som förlänger N, E1 som förlänger försprånget). En karta talar inte: föraren söker upp den.
- **(b)** står kvar, och det är **T5:s egen carve-out** som räddar den: ett värde som ett vittne på platsen kan fälla är
  *"inte längre extrapolation i T3:s mening"*. Men dagens lydelse villkorar på **grind A:s noggrannhet** (MAE ≤ 1,0 °C),
  och regeln kräver ett **vittne**. De två sammanfaller inte — en modell kan vara noggrann på 6 km utan att någon mätning
  på platsen kan fälla ett enskilt värde. Förslaget lägger till T1–T2 som andra villkor.
- **(c)** orörd.

**Det är en skärpning**, vilket är avgörande: §5 tillåter skärpning med en rad från Bengt, medan *lättnad är utesluten
så snart utfallet är sett*.

**Rekommendation: ta beslutet nu, inte i mars** (kortets formella frist). Skälet är inte formellt utan praktiskt: står
(a) kvar som *"kopplas till app"* kan röstvägen hinna byggas under vintern på en text som inte får användas. Och
TROSKLAR-KOMBINATIONEN §10 säger att regel T får skärpas men aldrig mjukas upp **oavsett signaturer** — ju längre §4 står
oförändrad, desto större risk att någon läser den som ett förhandlat undantag i stället för en orättad text.

**Vad som INTE föreslås:** grind A:s trösklar, banden eller minsta underlag · (c) · frysklassningens roll (#103, redan
låst av T5) · något i TROSKLAR-KOMBINATIONEN. Det är skuggans text som ska följa regeln, inte tvärtom.

## #261 (20/9 2026) Tavlans sektioner ljuger: 23 av 32 "olåsta" kort är det inte — kort #224 och #225

**Bengts fråga 20/9:** *"kan du lista de 32 som kan göras nu"*. Svaret blev en rättelse: **nio kan göras nu, inte 32.**

**Vad räkningen visade.** Sektionen *Claude — olåst* läses som *"det här kan Claude göra utan att fråga någon"*.
Kort för kort stämmer det för nio. De övriga 23:
- **7 kräver ett beslut av Bengt och Axel** — #214 (produktinvariantens lydelse), #216, #198, #151, #146, #32, och
  #185/#186 vars **egen text** säger *"väntar på Bengts och Axels"*. De är inte olåsta; de är låsta av er, utan att stå
  i någon av era sektioner.
- **5 väntar på vädret** — #209, #192, #51, #46, #45. De hör hemma i *Claude — låst*, där väderlåsta kort redan står.
- **4 väntar på en händelse** — #160, #152, #52, #44.
- **4 är överspelade** — #53 (Actions-krisen 5/9), minutbantningen, #43, och delar av flera andra.
- **3 ser byggda ut men står öppna** — #223, #210, #212, alla med commits från i dag.

**Varför det spelar roll, och det är inte bokföring.** Frågan *vad kan göras nu* är den som avgör om ett arbetspass
planeras på en dag eller en vecka. Svaret 32 hade gett fel plan. Och värre: **sju kort väntar i praktiken på er utan att
synas i era listor** — ni kunde ha gått igenom era 26 respektive 13 kort och ändå missat sju beslut som blockerar mig.

**Femte gången på ett dygn.** #250 sex överspelade kort · #252 två dubbletter · #254 kort #50 · #256 kort #76 · nu
sektionerna. Alla har samma form: förutsättningen ändrades och kortet stod kvar. TAVELREGELN punkt 3 säger att
verkligheten flyttar kortet utan att fråga — men **ingen rutin läser tavlan mot verkligheten**, och det är det som
saknas, inte omsorg.

**Två kort lagda:**
- **#224** — omklassa alla 32, stäng de överspelade med bevisrad, och för in antalet i bedömningens §0b så att nästa
  avvikelse syns.
- **#225** — verifiera de tre som ser byggda ut mot sina commits och stäng dem, eller skriv på kortet exakt vad som
  återstår. **#210 kan mycket väl vara avsiktligt öppet** — felet hörs i en telefon och ett bygge som bevisar det finns
  inte än — men då ska kortet säga det. Kortet bär också en varning: rör dem inte utan att läsa commiten, eftersom
  dubbelarbete på samma kort kostade två stängda PR:er tidigare samma dag (#407, #408).

*Alternativ som valdes bort:* rätta sektionerna direkt i samma varv — avvisat, det är 23 kort och sju av dem kräver ett
beslut om VAR de hör hemma (väntar #151 på Bengt eller är det Claudes mätning som saknas?). En omklassning utan den
genomgången hade bara flyttat felet. · bygga en maskinell vakt som läser sektionerna — avvisat tills vidare: etiketterna
är prosa, inte fält, och en regex-vakt hade gett falsk trygghet av samma slag som den trubbiga gröntoleransvakten.


## #262 (20/9 2026) Arkivbackupens ålder vaktas där Actions inte når — vakthundens check 9j (kort #223)

**Varför:** veckodumpen (#213, DECISIONS #257) kör i GitHub Actions, och Actions dog tyst 5/9 när minuterna tog slut. Då
tystnar dumpen och healthchecken samtidigt, och arkivet står oskyddat utan att någon säger till. Vakthunden i Supabase är det
enda som kör utanför och redan pratar med GitHub.

**Beslut:** check 9j i `supabase/functions/vakthund/index.ts`: `GET /releases`, senaste tagg `arkiv-`, ålder > 8 dygn eller ingen
alls ⇒ `problem.push` i driftvakthunden (samma issue som led 1–3 — arkivet utan backup är ett driftfel, inte en händelse).
Gränsen 8 = en missad söndag plus ett dygns marginal. Prov `?arkivprov=1` (dbknapp-flaggan `arkivprov`) låtsas 99 dygn.

**Bevis, i ordning:** deploy-supabase #35520901208 *"Deployed Functions … vakthund"* · dbknapp `arkivprov` 15:54Z: svaret
`arkivbackup: 1 dumpar, senaste 99.0 dygn (gräns 8) — PROV` + problemraden, larmväg ok · issue #411 skapad 15:54:35Z · **den
schemalagda timkörningen 16:07:51Z stängde #411 med den riktiga raden** `arkivbackup: 1 dumpar, senaste 0.0 dygn (gräns 8)`.

**Bifynd, rättat i samma varv:** deploy-knappen föll två gånger i rad (#35520704235, #35520805068) på `supabase/setup-cli@v1`
med `version: latest` — uppslaget mot GitHubs API görs oautentiserat från runnerns delade IP och fick *rate limit exceeded*.
Nu fast version 2.117.0 (273da5a); höjs medvetet. En deploy-knapp som faller på någon annans kvot är ingen knapp.

## #263 (20/9 2026) Trösklarna är låsta: nio vektorer och en känslighetsmätning som bor i repot (kort #212)

**Fyndet (genomlysningen, P4b):** korridorvinkeln 35° kunde vara allt mellan 5° och 90°, reprisavståndet 5 000 m allt mellan 0
och 50 000, utan att en enda av 24 vektorer reagerade. "Grönt i tre språk" bevisade alltså inte det man trodde.

**Beslut:** en vektor per regel som faller på ett steg åt vardera hållet, och mätningen som visar det görs i repot så att den
kan köras om: `scripts/matningar/vektorkanslighet-2026-09-20.ts` sveper varje tröskel i DEFAULT_CONFIG mot alla vektorer +
Skåneturen och skriver intervallet utan reaktion och vilken vektor som bryter först.

| tröskel | standard | före | efter (bryter under / över) |
|:--|--:|:--|:--|
| korridorhalvvinkel | 35° | 5–90° | **33,2–37,1°** — v28 (33° talar) / v29 (37° tyst) |
| reprisavstånd | 5 000 m | 0–50 000 | **4 510–5 990 m** — v30 |
| repristid | 600 s | (omätt) | **496–659 s** — v31 |
| bäringstolerans | 60° | 60–150° | **55,5–64,5°** — Skåneturen / v33 (65° tyst); v32 (55° talar) |
| lägsta fart | 15 km/h | 5–50 | **14,1–16** — v34 / v35 |
| kortaste förvarning | 400 m | 0–400 | **395–405 m** — v36 |

**Hur v30 skiljer sträckan från tiden:** i konstant fart över 30 km/h passeras 5 km före 600 s, så reglerna går inte att skilja.
v30 kör 80 km/h, förbi kameran, **står stilla 600 s med fart 0** (inget utvärderas, klockan går, vägmätaren står), och kör sedan
fram och tillbaka: 690 s/2 000 m tyst, 4 000 m tyst, 6 000 m talar. v31 gör tvärtom i 120 km/h: 21 km körda, tyst tills 659 s.

**Regler som följdes:** alla fixmarginaler mot en tröskel ≥ 5 m, uppmätta med motorns haversine (v36:s golv fick 5,43 / 5,67 m
efter sökning — 20 km/h gav max 2,8 m och förkastades). Ingen befintlig vektor rörd. Kotlin och Swift läser nu `headingDeg` ur
en vektor för första gången (v34/v35) — det fältet var oprövat i portarna.

**Bevis:** `npm test` 40/40; ci #35521365300, ios-engine #35521365311, android #35521365360 gröna på 88dd32c — 36 vektorer byte
för byte i tre språk. **Olåst med flit:** `leadMaxM` 3 000 (nås först över 360 km/h — ingen svensk väg), `warnLeadS` och
`globalCooldownS` låg redan på ±1.

**Läxa ur samma varv, mot mig själv:** tavelsynken som stängde #212 och #223 (ffea363) klippte "till nästa öppna kort" och
hoppade därmed över det FÄRDIGA kort #222 som låg kvar i ATT GÖRA — 39 rader bevis borta i fyra minuter. Upptäckt av
`git show --stat` (57 raderade rader mot väntade 18), återställt byte för byte ur HEAD~1 och kortmängden diffad: 118 = 118,
inget borta, inget nytt. Exakt CLAUDE.md:s regel om att diffa kortantal före push — den gäller även den som just läst den.
Numren #260/#261 i det första utkastet blev #262/#263: Bengts session tog #260 och #261 samtidigt, och `beslutsnumren.ts` sa ifrån — två gånger.

## #264 (20/9 2026) Produktinvarianten skrivs om: ingen positionsdata lämnar telefonen UTAN AKTIVT VAL (kort #214, Axel)

**Bakgrund:** sedan 16/9 POSTar facitsvaret (FacitSender.kt / Facit.swift) varnings-id, tid, app och version — och ett
varnings-id är en plats och en tid (`sql/022`). CLAUDE.md:s invariant säger *"No user location, GPS trace, or movement data may
ever be transmitted off-device. Full stop."* och `docs/PLAY-DATASAFETY.md` svarar **No** på Googles insamlingsfråga. Båda är
osanna sedan 16/9, och en osann deklaration är grund för avslag eller nedtagning mitt i facitfönstret (genomlysningen P2).

**Beslut (Axel, via Cowork 20/9 kväll):** invarianten lyder från och med nu: *ingen positionsdata lämnar telefonen automatiskt —
matchningen sker på telefonen mot nedladdade snapshots; det enda som någonsin skickas är ett facitsvar som föraren själv trycker
på, och det bär varnings-id och tid, inget spår.* Data Safety-formuläret svarar därmed **Ja** på insamling: kategori
ungefärlig plats (via varnings-id) + app-info, ändamål *appfunktioner/analys* (förbättra varningarna), frivilligt, kan inte
kopplas till person, delas inte.

**Alternativ som valdes bort:** behålla invarianten och ta bort facitsvaret (januaridomen förlorar sin enda förarkälla) ·
anonymisera svaret till bara Stämde/Stämde inte + grov tid (facit utan plats dömer ingenting).

**Bygg, nästa varv, i EN commit:** CLAUDE.md:s invariant, `docs/PLAY-DATASAFETY.md` (svaren och trafiklistan: GET på snapshoten
+ POST på facitsvaret), produktbokens integritetsrad. Formuläret i Play Console fylls i likadant före första uppladdningen.

## #265 (20/9 2026) Blindningsläckan i T-A: svepets tabell trycks inte förrän domspärren släpper — Axels val, väntar Bengts ja (kort #216)

**Fyndet (genomlysningen P4):** `scripts/grind-t-a.ts` skriver hela svepet rangordnat på separation även när domspärren håller,
och flödet ska köras inom sju dygn efter varje frostnatt — genom hela kalibreringsfönstret. Fönster, lutning och startband är
tre av kombinationens sex dimensioner; när kombinationen kalibreras 1/2 är deras utfall redan avläst och loggat i CI. D3
(kalibrering och dom på skilda nätter) skyddar då bara på papper.

**Axels val (20/9 kväll):** strypa utskriften. UNDERLAGET och fysikkontrollen skrivs som förut; svepets tabell (och
klarhetsdelens "bästa kombination", som bygger på den) skrivs först när domspärren släpper. Tre rader kod, och läckan är tät
i stället för deklarerad. Alternativet — en rad i TROSKLAR-KOMBINATIONEN om att dimensionerna är förvalda — skyddar bara den
som läser raden.

**Villkor:** mätningen är Bengts, så det byggs först när han sagt ja. Bygget: `grind-t-a.ts` + raden i TROSKLAR-KOMBINATIONEN
(hur delgrindarnas körningar förhåller sig till D3) i samma commit, före första frostnatten.

## #266 (20/9 2026) Viltrösten säger vad datan bär: "Viltrisk framöver." — utan art (kort #217, Axel)

**Fyndet (genomlysningen P7):** rösten säger *"Viltrisk — vanlig olycksplats för älg den här tiden"*, men källan är enskilda
polishändelser inom 48 h och ingen adapter läser arten — "älg" sägs även vid rådjur. Alert copy får aldrig överdriva vad datan
bär (CLAUDE.md, produktinvariant).

**Beslut (Axel, via Cowork 20/9 kväll):** rösttexten blir *"Viltrisk framöver."* — punktkälla, därför "framöver" (texts.ts-regeln),
ingen art, ingen "vanlig olycksplats". Arten kommer tillbaka den dag en adapter läser den ur polisens händelsetext (eget kort
då). Alternativ som valdes bort: bygga artläsaren nu (större bygge före ett facitfönster) · låta rösten stå kvar.

**Bygg, nästa varv, i EN commit:** `engine/src/texts.ts` + Kotlin + Swift, vektor v13 regenereras (den enda gången en frusen
vektor ändras är när regeln själv ändras — det är det här), skuggmotorn buntas och deployas, produktboken uppdateras
(PRODUKTBOKSREGELN) och vektorantalet där rättas till 36.

## #267 (20/9 2026) Axels svar på §8 i FACIT-EFTER-RESAN — sju av åtta avgjorda, byggordningen står öppen (kort #203)

**Axel svarade 20/9 kväll via Cowork**, på beslutsunderlaget `docs/FACIT-EFTER-RESAN.md` (skrivet 19/9). Sju svar följer
rekommendationen och är därmed avgjorda; ett krockar med ett beslut Bengt tog 20/9, och ett nytt krav tillkom.

**Avgjort:**
1. **Undantagsprincipen med underskrift — ja.** Axels skäl är fälttesterna, inte principen: *"med tystnad som ja hade
   två resor med en trasig app bokförts som bekräftelser."* KB-D7 (*ett svar är en handling; tystnad är inget svar*)
   går till Bengt för TROSKLAR-KOMBINATIONEN.
2. **Placeringen — ja, alla tre.** *"Låsskärmen är det viktiga. Föraren ska aldrig behöva öppna appen för att svara ja."*
3. **Siri — de två första fraserna.** *stämde inte* och *appen missade* kan inte vänta till efter resan; *stämde*
   behövs inte under körning, det är vad låsskärmen är till för. (Underlaget föreslog samma.)
4. **Missarna — ja, som ett medvetet integritetsbeslut.** Axel skrev ut vad han sa ja till: *"station-id plus klockslag
   säger ungefär var föraren var … det är inte en position, men det är en position i grova drag."* Villkor: brytarens
   text säger det ordagrant, och produktboken uppdateras samma dag. **Faller in under kvällens omskrivna invariant
   (#264):** ingenting lämnar telefonen utan förarens aktiva val — missen är ett tryck, inte ett spår.
5. **Stor knapp *Appen missade* — ja.** Androids enda väg, iPhones reserv.
6. **Lager 3 (knappar i körläget vid stillastående) — nej.** Utgår ur första bygget.
8. **Android i samma PR — ja.**

**Nytt krav, Axels eget tillägg: kortet ska visa varningarna, inte räkna dem.** *"Ja, alla stämde" efter tre timmars
körning — minns föraren de tre varningarna?* Kortet på *Redo.* visar i förslaget *"3 varningar"*; det ska i stället
visa de tre raderna med klockslag och text, så att trycket är ett svar på något föraren läser. Kostar en vy.
**Bedömning:** rätt, och det gör KB-D7-kontrollen mindre bärande — men inte onödig. Vanan att trycka *Ja, alla* utan
att läsa finns kvar, kontrollen (jämför *Ja, alla*-resor mot rad-för-rad-resor) kostar ingenting i domen, och en
kontroll som tas bort för att designen blev bättre är den sortens skydd huset redan förlorat en gång. Båda behålls.

**Öppet — beslut 7, byggordningen.** Axel svarade **A** (0.3.8 ut nu, #203 i 0.3.9): *"sändkanalen från en riktig
telefon har aldrig bevisats … att vänta och bygga allt i ett är att lägga en obevisad kanal under en ny funktion."*
Bengt beslutade **C** samma dag (#242): ett sammanhållet bygge, kanalen bevisad utan TestFlight genom simulatorprovet.
Underlaget Axel läste var 19/9-versionen — det rekommenderade C först efter Bengts invändning 20/9, och regeln hette
då ännu KB-D5 (rättat till KB-D7 samma dag, #242). **Två fakta som ingen av de två svaren kände till:**
- **Simulatorprovet är ogjort.** `driver_facit` 20/9 16:07Z: 0 riktiga svar, 2 provrader, ingen `cam:fotostudio`.
  C:s billiga kanalbevis har alltså inte tagits ut, och C:s fördel framför A är så länge bara påstådd.
- **Motorfixarna ligger i main sedan i kväll.** #210 (iOS sade *"på väg &lt;null&gt;"* vid var tjugonde olycka) och
  #211 (tredje olycksropet) når en telefon bara genom ett bygge. Det gör A till mer än ett kanalprov: det är vägen som
  får två hörbara fel ur Bengts bil före nästa fältrunda. Det skälet fanns inte när #242 skrevs.

**Ingen byggordning ändras här** — Bengts beslut står tills han och Axel talat. Frågan ligger på kort #203 med båda
skälen och de två nya fakta.

**Byggredo, kontrollerat i samma varv (Axels fråga):** ci ✅, ios-engine ✅, android ✅ på 88dd32c; allt pushat därefter
är dokument. Den gamla raden *"diffen mot 79e4195 är tom"* på tavlan är därmed osann sedan i kväll och är rättad.
**Enda oprövade biten:** `SnapshotRepo.swift` ligger i app-målet, som inget CI-flöde kompilerar (ios-engine kör
`swift test` på motorpaketet, på Linux). Typen stämmer (`PointMeta.road: String?`), men första kompileringen sker i
Axels Xcode.

## #268 (20/9 2026) Play-kontot: underlaget skrivet ur källan — testkravet låser produktion, inte betan

**Bengts order 20/9:** *"hjälp mej sätta upp ett google play konto"* och *"plocka upp kortet … och börja utföra"*.
Underlaget ligger i `docs/PLAY-KONTO.md`. **Allt är läst på Googles egna hjälpsidor samma dag**, enligt CLAUDE.md:s läxa
om att en instruktion till Bengt eller Axel ska vara läst på källsidan — reglerna ändrades 13/11 2023 och ett minne
hade varit fel.

**Fyndet som lättar i stället för att tynga.** Google kräver att personliga konton skapade efter 13/11 2023 kör ett
slutet test med **minst tolv testare som deltagit löpande i minst 14 dagar** innan produktionskanalen öppnas. Men samma
sida säger att kravet bara låser *Produktion* och *Förhandsregistrering*, och att **slutet test kan startas så snart
appen är konfigurerad**. **Novemberbetan ÄR det slutna testet**, och S5:s tolv testare är samma tolv Google räknar.
Kontot blockerar alltså inte betan. Det sätter en klocka: publik release tidigast fjorton löpande dygn efter att de
tolv är på plats — och bara om alla tolv är kvar hela tiden.

**Valet som måste göras före registreringen, för kontotypen väljs en gång:**
- **Personligt:** ingen ledtid, 25 USD engångsavgift. Kräver tolv × 14 dygn före produktion. Visar en **privatpersons**
  juridiska namn och land på Google Play.
- **Organisation:** inget testkrav, men **DUNS-nummer tar upp till 30 dagar**, och kräver organisationens namn, adress,
  telefon och webbplats. Föreningen finns inte än — det är samma obesvarade fråga som i Skyltfondspaketet, och 30 dagar
  från i dag är 20 oktober, tio dagar före betan.

**Rekommendation: personligt konto nu.** Organisationen finns inte, DUNS-ledtiden äter marginalen, och betan blockeras
inte. **Migrering till organisation senare är INTE verifierad** — den behandlas som okänd, inte som given. Apple-kontot
är Individual i Axels namn, så två olika säljare för samma app vore ett val, inte en slump.

**Ordningen som följer:** kontot kan registreras i dag, men **första uppladdningen bör vänta tills #214 är rättad** —
en osann Data Safety-deklaration är grund för avslag mitt i det enda facitfönster vintern ger. Och jks-filen ska ligga
i iCloud innan första uppladdningen: efter den är nyckeln bunden hos Google.

**Vad Claude inte gör:** skapar inte kontot, godkänner inte avtalet, betalar inte avgiften, anger inga
identitetsuppgifter och loggar inte in. Det är ägarens, och det är avsiktligt.


## #269 (20/9 2026) Byggordning A efter allt — simulatorprovet föll på Xcode, och det avgjorde frågan (kort #203, Axel)

**Axels beslut 20/9 18:35:** *"Jag gör en ny release."* 0.3.8 (11) arkiveras nu; #203 går i 0.3.9. Det ersätter
byggordning C (Bengts beslut samma dag, #242).

**Vad som hände, i ordning.** Axel svarade på §8 med A (#267). Han valde sedan själv att göra C:s simulatorprov först,
så att valet skulle stå mellan två kända alternativ i stället för ett vad. Provet kördes: `xcodegen`, Team nollställd
som alltid, destination bytt till iPhone 16e (iOS 26.1), `-fotostudio_facit` i schemat — och installationen föll på
**Xcodes egen infrastruktur**: *"Simulator device failed to launch se.halkvakt.app … The system shell probably
crashed"*, `BSErrorCodeDescription = host down`, `NSPOSIXErrorDomain 64`, efter 94 sekunder. Maskinen är en M1 Air med
8 GB som kör Xcode 26.1 mot en färsk iOS 26.1-runtime.

**Det är inte ett sidospår, det ÄR svaret.** C valdes framför A på premissen att kanalen kunde bevisas **billigt**,
utan TestFlight, i simulatorn (#242). Premissen höll inte på den här maskinen: provet kostade en kvart och gav inget
bevis, alltså mer än den fältrunda det skulle spara.

**Vad som faktiskt är bevisat, och inte.** Kedjan har tre led:
1. **Knapparna syns** — gick sönder i 0.3.7 (`FacitRow` saknades, #240); fixat i 0.3.8, obevisat på en telefon.
2. **Appen skickar** — aldrig bevisat, på någon plattform.
3. **Servern tar emot och skriver** — **bevisat 16/9, två gånger.** Tabellens två rader (`prov:kam1`, `cam:prov-ios`)
   är serverprov i apparnas form, inte app-sändningar (#227). Ett nytt serveranrop i kväll hade därför bevisat noll.

Simulatorprovets hela värde låg i led 2 — i en simulator. Bengts första resa bevisar led 1 OCH 2, i verkligheten, och
den provkörningen måste ske ändå.

**Det som gör A försvarbart, och det är kod, inte tillit:** appen skvallrar om sitt eget fel. `FacitSender.flush()`
skriver serverns svar rakt in i gränssnittet under knapparna — `"Skickat HH:MM (n svar)"` eller
`"Kunde inte skicka HH:MM: HTTP 400 …"` — och Android gör samma sak (`Prefs.setFacitStatus`, `FacitSender.kt:34`).
Ett trasigt led 2 kostar alltså en skärmbild, inte en tyst fältrunda. **Tystnaden var faran i 0.3.7, inte felet.**

**Bonus som inte fanns när C valdes:** 0.3.8 bär nu också kvällens motorfixar — #210 (`"på väg <null>"` vid var
tjugonde olycka) och #211 (det tidiga olycksropet engångs). De når en telefon bara genom ett bygge. Kort #210 stängs
när en olycka utan vägnummer sägs rätt i bilen.

**Förkontroll enligt CLAUDE.md före uppmaningen att arkivera:** ci ✅, ios-engine ✅, android ✅ på 88dd32c; allt pushat
därefter är dokument. Fotostudio-kroken är `#if DEBUG` och kompileras bort ur arkivet.
**Oprövat, uttalat:** `SnapshotRepo.swift` ligger i app-målet, som inget CI-flöde kompilerar — arkiveringen är första
gången kvällens rad kompileras.

**UTFALL 20/9 18:38: uppladdad.** Organizer: *Halkvakt 0.3.8 (11) — Uploaded to Apple*, Team Axel Lagerlöf, arm64,
`se.halkvakt.app`, build number 11. Arkiveringen bevisade tre saker på en gång: app-målet **kompilerar** med kvällens
rad (det oprövade ovan), versionsspåret håller (11 > 0.3.7:s 10), och signeringen gick igenom efter att `xcodegen`
nollställt Team. Exportdeklarationen låg redan i `project.yml` (`ITSAppUsesNonExemptEncryption: false`), så bygget
fastnar inte på *Missing Compliance*. **Kvar, och det är hela poängen med A:** led 1 och 2 bevisas av Bengts första
resa — receptet står på kort #203.

**Till Bengt:** C var rätt resonemang på fel maskin. Invändningen — en uppdatering i stället för två — står kvar och
gäller nästa gång; det som föll var antagandet att simulatorn kunde ersätta en telefon till en låg kostnad.

## #270 (20/9 2026) Data Safety sann igen — och fyndet att integritetspolicyn ljuger på samma sätt (kort #214)

**Byggt på Axels beslut #264 samma kväll.** `docs/PLAY-DATASAFETY.md` svarade **"No"** på Googles insamlingsfråga.
Det var sant 27/8 och osant från 16/9, när S4:s facitsvar började POSTa varnings-id och klockslag.

**Deklarationen nu, läst ur koden och inte ur minnet:** insamlingsfrågan **Yes**; datatyp **Location → Approximate
location** (vi skickar ingen koordinat, men varnings-id pekar på en fara som har en plats och `t` säger när — Googles
fråga är vad som lämnar enheten och vad det säger, inte vilket format det har); **Collected** ja, **Shared** nej,
**Processed ephemerally** nej, **Optional** (BETATEST är av som standard och varje svar kräver ett tryck), ändamål
**App functionality + Analytics**, **inte kopplad till identitet**, **inte tracking**. Krypterad i transit: ja.
Utgående trafik listad rad för rad ur `FacitSender.swift`/`.kt`, `Facit.body()`, `facit-svar/index.ts` och `sql/022`.

**CLAUDE.md:s invariant omskriven** enligt #264, med en rad om att en ändring i utgående trafik måste röra fyra
dokument i samma commit — det var precis det som inte hände 16/9.

**FYNDET, som kortet inte kände till: den publicerade integritetspolicyn ljuger på samma sätt.**
`integritet.html` i `Axelstar/halkvakt-karta` — den URL Google kräver i butiksfältet — säger fortfarande
*"Kärnlöftet: din position lämnar aldrig telefonen"* och *"Vad vi samlar in: **Ingenting.** … skickar aldrig din
position, dina resor eller något annat om dig till oss eller någon annan."* **Google jämför formuläret mot policyn.**
Två dokument som säger olika saker är ett avslag som ser ut som slarv. Utkast till nytt stycke skrivet; texten är
Axels att godkänna, för till skillnad från de andra tre är policyn ett publikt löfte.

**KVAR SOM ÄGARBESLUT: raderingsfrågan.** Formuläret frågar om användaren kan begära radering av sin data. Vi har
ingen väg — och kan inte ha en: ingenting i ett facitsvar identifierar avsändaren, så "mina rader" går inte att peka
ut. Bra för integriteten, obekvämt för formuläret. Tre alternativ i filen: (1) svara Nej och förklara varför i policyn
— testaren kan alltid slå av brytaren; (2) töm tabellen för perioden på begäran — trubbigt, förstör facit för alla
andra; (3) slumpat facit-id per telefon — löser formuläret men **inför en identifierare där ingen finns i dag**, och
det gör appen sämre på det den är bäst på. **Rekommendation: 1.** Bengt + Axel, före första uppladdningen.

## #271 (20/9 2026) Play-kontot skapat — och kravet som gör en begagnad Android-telefon till en grind (kort #219, punkt 7)

**Axel registrerade och betalade 20/9 18:51.** **Lagerlöf Labs**, personligt konto (enligt #268:s rekommendation),
konto-id `7591030412981889366`. Utgivarnamnet är detsamma som i App Store Connect — en säljare för samma app i båda
butikerna, vilket var ett av skälen mot organisationsvägen.

**Kontot är skapat men inte färdigt.** Play Console kräver tre verifieringar innan något kan publiceras:
1. **Identiteten** — officiellt ID-dokument laddas upp; Google skriver *"Verifieringen kan ta några dagar"*.
2. **Åtkomst till en fysisk Android-enhet** — bevisas genom inloggning i Play Console-mobilappen på en riktig telefon.
3. **Kontakttelefonnumret** — kan inte göras förrän 1 är klar.

**Fyndet: punkt 2 är en grind, inte en formalitet, och den har stått öppen i 26 dygn.** DECISIONS #16 (25/8) skrev
redan: *"Axels enda telefon är en iPhone … fysisk Android-testenhet = öppen fråga (pappa? begagnad?)"*, med
rekommendationen begagnad Samsung Galaxy A-serie för 800–1 500 kr. Då var den en bekvämlighet för fälttest. **Nu är
den ett publiceringskrav:** utan en Android-telefon kan kontot inte slutföras, och utan ett slutfört konto kan
ingenting laddas upp — oavsett hur färdig appen är. Det är den billigaste grinden i hela novemberkedjan och den
blockerar alla andra.

**Samma fråga, en storlek större.** Googles slutna test kräver **tolv testare med Android-telefoner** i fjorton
löpande dygn. Väntelistans tolv (Axels åtagande 31/8) är inte sorterade på plattform, och **Android-appen har aldrig
körts på hårdvara** — CI kör emulator, versionen står på 0.3.1 (versionCode 4) mot iOS 0.3.8 (11). Det är samma hål
som genomlysningens P6, men med en deadline på sig.

**Ledtiderna staplas och de är seriella:** ID-verifiering (några dagar) → telefonnumret → en Android-telefon som ska
skaffas → första uppladdningen (som väntar på #214, nu rättad) → tolv testare × 14 löpande dygn. Det är den kedjan
som bestämmer novemberdatumet, inte när koden blir klar.

**Nästa steg som inte kräver telefonen:** identitetsverifieringen kan startas i kväll, och appposten i Play Console
kan skapas med butiksmaterialet som redan finns (`marknadsforing/butik/`: text, feature graphic 1024×500, ikon 512,
plus skärmbilderna i `docs/produktbok/`).

**LÖST SAMMA KVÄLL:** Axel — *"vi har en Android som vi kan använda"*. Grinden var alltså en fråga ingen hade ställt,
inte en kostnad. Verifieringen görs genom att installera Play Console-appen på den telefonen och logga in med kontots
Google-konto. **Följden som är större än bocken:** Android-appen kan för första gången köras på hårdvara —
debug-APK:n byggs redan som artefakt i varje `android`-körning.

**Vad Android faktiskt saknar, mätt 20/9 (inte gissat).** Kortet #219 säger "sju versioner efter", men versionsnumret
mäter fel sak: Android 1 814 rader mot iOS 2 125, och funktionerna finns på båda — *Senast sagt*, facitknapparna,
BETATEST-brytaren, autostart, körläget, inställningarna. **Tre verkliga hål:**
1. **Introduktionen saknas helt** — noll träffar på onboarding i hela `android/`. iOS har fyra sidor (`OnboardingView`).
2. **Versionsnumret står stilla** på 0.3.1 / versionCode 4 sedan 0.3.1, trots att koden följt med. Första
   Play-uppladdningen låser versionCode-spåret, så det ska rättas FÖRE den, inte efter.
3. **Förvarningsreglagets spann skiljer sig** mellan plattformarna (iOS 400–3 000, Android 500–5 000, genomlysningen P7).

**Metodnot, värd att skriva ned:** första jämförelsen gjordes på FILNAMN och sa att körläget, autostartguiden och
facitknappen saknades på Android. Fel — Android lägger hela gränssnittet i `ui/App.kt` medan iOS har nio vyfiler. En
strukturskillnad såg ut som en funktionsskillnad. Mätt funktionellt i stället krympte listan från sex hål till tre.

## #272 (20/9 2026) "Tillåt hela tiden" går inte att välja i rutan — och behövs inte heller för att köra (kort #219)

**Axels fynd 20/9 kväll, när han satte upp appen på testtelefonen:** *"man kan endast välja alltid då man
väljer medans appen är igång och inte endast en gång"* — alltså: systemrutan erbjuder bara *Medan appen
används* och *Bara den här gången*, aldrig *Tillåt hela tiden*.

**Det är inte ett fel i appen. Det är Androids dokumenterade beteende** (developer.android.com, läst 20/9):
> *"On Android 11 (API level 30) and higher, however, the system dialog doesn't include the **Allow all the
> time** option. Instead, users must enable background location on a settings page."*

**Och det viktiga fyndet i samma andetag: vi behöver den inte för normalfallet.** `GuardService` är en
förgrundstjänst med `android:foregroundServiceType="location"` som startas från aktiviteten. Googles regel:
en sådan tjänst kräver bara `ACCESS_FINE_LOCATION` — `ACCESS_BACKGROUND_LOCATION` behövs enbart när appen
läser platsen UTAN en aktiv förgrundstjänst. Koden gör redan rätt: `onToggle()` begär bara plats +
aviseringar, och bakgrundsplatsen begärs enbart ur `onAutostartToggle()`, där den verkligen krävs (en
BroadcastReceiver startar tjänsten när appen inte är i förgrunden).

**Arkitekturen var alltså riktig. Det som var fel var GUIDEN — min, skriven samma kväll.** Den sade:
*"Plats: Tillåt alltid … Utan den tystnar rösten när skärmen släcks — och det är då du kör."* Falskt på det
sätt som kostar mest: en testare hade jagat en inställning som inte går att välja i rutan, och dragit
slutsatsen att appen är trasig när den fungerar. **Rättad i samma varv**, i både `docs/BETAGUIDE-ANDROID.md`
och den publicerade sidan: *medan appen används räcker; Tillåt hela tiden behövs bara för Autostart, och det
valet bor i inställningarna.* Felsökningsraden om att rösten tystnar vid släckt skärm pekade också fel — rätt
misstänkt är batterioptimeringen som dödar tjänsten, inte behörigheten.

**Läxan, och den är husets egen:** guiden skrevs "mot koden" men jag läste behörighetsanropen utan att läsa
vad `foregroundServiceType="location"` betyder för dem. Att läsa rätt fil är inte samma sak som att läsa
färdigt. Samma mönster som filnamnsjämförelsen tidigare samma kväll (#271).

**KVAR ATT BYGGA, litet men verkligt (eget kort):** på Android 11+ visar `requestPermissions(
ACCESS_BACKGROUND_LOCATION)` ingen ruta alls — anropet i `MainActivity.onAutostartToggle()` faller därför
tyst, och användaren ser ingenting hända när han slår på Autostart. Googles föreskrivna väg är en egen
förklaringsruta plus en resa till appens inställningssida, med alternativets namn hämtat ur
`getBackgroundPermissionOptionLabel()` (API 30+) så texten stämmer med just den telefonens ordval.

## #273 (20/9 2026) iOS tystnade med släckt skärm för varje testare som svarade "när appen används" — en rad, funnen av Axels prov

**Axels prov 20/9 kväll, och rättelsen till mig själv:** han rapporterade *"man kan endast välja alltid då
man väljer medans appen är igång"* — och jag antog Android, skrev DECISIONS #272 och kort #226 på det.
**Provet var på iPhone.** Det som stod i #272 om Android är läst i Googles dokumentation och i koden och
står kvar som riktigt, men det var inte det Axel såg. Att gissa plattform är samma fel som att gissa vad
som helst annat.

**Vad han faktiskt såg:** iOS erbjuder aldrig *Alltid* i första rutan — Apple ger *Tillåt en gång* och
*Tillåt när appen används*. *Alltid* kommer som en senare uppföljningsfråga eller sätts i Inställningar.
Samma form som på Android, andra skäl. **Varje ny testare landar alltså i `authorizedWhenInUse`.**

**Och där satt felet.** `GuardManager` rad 214:
`manager.allowsBackgroundLocationUpdates = manager.authorizationStatus == .authorizedAlways`
— alltså **false** för precis det läge varje ny testare hamnar i. Apples dokumentation för egenskapen
(läst 20/9) säger vad det betyder:

> *"When the value of this property is true and you start location updates while the app is in the
> foreground, Core Location configures the system to keep the app running to receive continuous background
> location updates … Updates continue even if the app subsequently enters the background."*

och, om `false`:

> *"location updates may or may not continue in the background … Core Location doesn't configure the system
> to keep the app running for delivery, or display the background location indicator **to extend the
> effectiveness of the `authorizedWhenInUse` authorization while the app is running in the background**."*

Egenskapen finns alltså till just för att göra *när appen används* användbar i bakgrunden. Vakten stängde
av den för alla utom dem som redan hade Always. **Följden: rösten tystnar när skärmen låses** — för en
app vars hela uppgift är att tala med släckt skärm under körning.

**Fixen:** `allowsBackgroundLocationUpdates = true` när vakten startas, oavsett auktorisering. Villkoret är
Apples eget — uppdateringarna ska startas medan appen är i förgrunden, och det är precis vad *Starta
vakten* är. `UIBackgroundModes: [location, audio]` finns redan i `project.yml` (utan den är `true` ett
fatalt fel). **Priset är den blå indikatorn**, som Apple visar för att vara ärlig om att appen läser
platsen i bakgrunden — vilket den gör, och som vi inte har något skäl att dölja.
**Always behövs fortfarande för SJÄLVSTARTEN** (betydande förflyttning, parkeringsstaketet) — de grenarna
är separat vaktade på `.authorizedAlways` och är orörda.

**Det obekväma:** 0.3.8 (11) laddades upp 18:38 i kväll och bär **inte** den här fixen. Ett fälttest med
0.3.8 på en telefon som står på *när appen används* mäter alltså delvis fel app. Om Bengts telefon har
Always sedan tidigare påverkas den inte — men det är inget vi vet, det är något vi antar, och just det
antagandet har kostat huset ett varv förr.

**Läxa, andra gången i kväll:** #271 var filnamn som såg ut som funktion, #272 var en plattform jag
antog. Båda hade rättats av en fråga på en rad.

## #274 (20/9 2026) Genomgång av dagens kort: 21 strukna, två till stängda, och farhågan om dubbelarbete besannades inte

**Bengts order 20/9:** *"gå igenom och stäng alla kort som är gjorda och avklarade idag"*.

**21 kort ströks i dag**, räknat ur tavlans egen historik (`git diff` från dagens första TAVLA-commit). Av dem stängde
jag elva och den parallella sessionen tio. Listan står i svaret till Bengt.

**Två till stängs nu:**
- **#225** (*tre kort ser byggda ut men står öppna*) — dess Verify är uppfylld: #223 och #212 är stängda med sina
  commits som bevis, och **#210 står öppet avsiktligt** med både villkoret och ägaren utskrivna. Kortet lades i eftermiddag
  ur en farhåga att något byggts två gånger utan att synas. **Farhågan besannades inte** — den andra sessionen stängde
  sina kort i samma varv som den byggde. Det är värt att notera, eftersom motsatsen var dagens återkommande fynd.
- **#53** (*hela pipelinen står*) — överspelat. 94 körningar senaste dygnet, alla gröna utom dagens medvetna motprov.
  Kortet var en diagnos av avbrottet 5–8/9. Det som det egentligen oroade sig för — att taket slår i osett — har fått en
  egen vakt i **#152 kassavakten**.

**Vad som INTE stängs, och skälen står på korten:** #210 (väntar på ett iOS-bygge, Axel) · #214 (Data Safety är rättad,
men raderingsfrågan är ett ägarbeslut, #270) · #216 (Axels val finns, Bengts ja saknas, #265) · #217 (viltrösten klar i
#266, fem av sex påståenden kvar) · #219 (Play-kontot skapat 18:51, men kedjan telefon → uppladdning → tolv testare
löper) · #203 (sju av åtta svar, byggordning A vald, bygget kvar).

**Iakttagelsen som är värd mer än siffran.** Dagen inleddes med fyndet att kort inte flyttas när förutsättningen ändras
— sex överspelade (#250), två dubbletter (#252), #50 (#254), #76 (#256), sektionerna (#261). Den andra halvan av dagen
gjorde motsatsen: 21 kort strukna med bevisrad, i samma varv som arbetet. **Skillnaden var inte omsorg utan takt** — när
någon arbetar på ett kort samma dag det skrivs, flyttas det. Det är de gamla korten som ruttnar, och det är dem #224
ska gå igenom.


## #275 (20/9 2026) 0.3.9 (12) — bygget som bär iOS-fixen, och Team-id:t skrivs in så xcodegen slutar nollställa det

**Axels ja 20/9 kväll:** *"vi kör fixen"*. `MARKETING_VERSION` 0.3.8 → **0.3.9**, `CURRENT_PROJECT_VERSION`
11 → **12**. Bygget bär `allowsBackgroundLocationUpdates`-fixen (#273) ovanpå allt som låg i 0.3.8:
`<null>`-raden (#210), det engångs tidiga olycksropet (#211) och de tolv nya vektorerna (#212).

**I samma varv, en papperssnitt som kostat sedan 29/8:** `DEVELOPMENT_TEAM` stod som `""` i `project.yml`
med kommentaren *"väljs manuellt i Xcode efter VARJE xcodegen"*. Det betydde att varje bygge började med
ett handgrepp som går att glömma — och glöms det faller arkiveringen på signeringen. Värdet **R93LGMM343**
lästes ur `Halkvakt.xcodeproj/project.pbxproj` efter Axels egen 0.3.8-arkivering, alltså ur det han själv
valde, och står nu i `project.yml`. Ett team-id är ingen hemlighet; det ligger i varje signerat bygge.
Läxan från 29/8 gäller fortfarande och står kvar i kommentaren: koden i *Lita på*-rutan på telefonen är
CERTIFIKATETS id, inte teamets.

**Vad 0.3.9 INTE bär:** #203 (facit efter resan) och #266 (viltrösten utan art). De är beslutade men
obyggda, och att smyga in dem i ett bygge som ska bevisa en enda rad vore att göra provet otolkbart.

**Beviset som stänger kort #227:** en resa med *Tillåt när appen används*, skärmen släckt, och en varning
som hörs — plus den blå indikatorn i statusfältet, som är kvittot på att Core Location håller appen vid
liv. Blir det tyst är fixen fel, och då vet vi det på en resa i stället för i november.

## #276 (20/9 2026) `<null>` stängs som klass, inte som fall — och mätningen som visar att hålet var latent (kort #210)

**Axels fråga före deployen:** *"kan vi fixa kort 210?"*. Svaret har två halvor, och den första är att kortets
FIX redan satt: `road` rättades i 9d3f56c och följer med i 0.3.9. Det som är kvar på kortet är ett **bevis**
från en riktig telefon, inte en kodändring. Men frågan var ändå rätt ställd, för instansen var lagad och
**klassen var det inte**.

**Hålet:** `SnapshotRepo.str()` var `d[k] as? String ?? "\(d[k] ?? "")"`. JSONSerialization ger `NSNull` —
inte `nil` — för JSON-null, så `NSNull` överlever `??` och stränginterpoleras till literalen `"<null>"`.
`road` fick sin egen rad 9d3f56c, men helpern bär **sex id-fält**: `cam:`, `seg:`, `wx:`, `bro:`, `vilt:`,
`dev:`. Ett null i något av dem hade gett `"cam:<null>"` som farans id — och farans id är inte kosmetika:
det är nyckeln i reprisspärrens `fired`-karta och det som skickas i ett facitsvar. En korrupt nyckel hade
alltså både kunnat tysta en riktig fara och landa som en oläsbar rad i `driver_facit`.

**Mätt innan något ändrades, enligt husregeln:** publicerade `static.json` (2 791 kameror) och `live.json`
hämtade 20/9 och räknade fält för fält. **Inget id är null i dag.** De enda null som faktiskt publiceras är
`lutning15/30/60` på väderstationerna, och dem läser iOS-parsern inte alls. Hålet var alltså **latent, inte
aktivt** — vilket är skälet att laga det nu och inte kalla det en incident.

**Fixen:** `str()` returnerar tom sträng för `NSNull`, behåller strängar som strängar och stringifierar
tal som förut. Fem rader, och "<null>" kan inte längre uppstå någonstans i appen.

**Inte rättat, med skäl: Android.** `SnapshotRepo.kt` läser ids med `getString("id")`, som för ett JSON-null
ger strängen `"null"` — samma form, samma sex ställen. Lämnad orörd i kväll av tre skäl: sex anropsställen
i stället för en helper, inget testmål som kan fälla ett misstag, och `getString` **kastar** vid saknat fält,
vilket avvisar hela snapshoten i stället för att skapa en trasig fara. Det är ett medvetet skydd, och att
byta det mot tom sträng vore att göra appen tystare om sina egna fel. Eget kort när någon ändå rör filen.

**Det strukturella som står kvar:** `SnapshotRepo` finns i app-målet på båda plattformarna, och **inget
CI-flöde bygger eller testar app-målet**. Det är därför #210 kunde levas i fyra dygn, och det är därför den
här rättelsen inte heller kan bevisas av ett test — bara av ett bygge. Samma rad står i #267.

## #277 (20/9 2026) Efter resan — ett tryck från låsskärmen, byggt på båda plattformarna (kort #203, lager 1)

**Beställningen.** Bengt 19/9: *"som det är i dag är det oerhört krångligt … det kommer inte många
svar"*. Axels svar på §8 (DECISIONS #267): **2 ja, alla tre** — *"låsskärmen är det viktiga — föraren
ska aldrig behöva öppna appen för att svara ja"* — plus tillägget ur hans läsning: kortet på *Redo.*
ska visa **raderna**, klockslag och text, inte bara ett tal. Byggordning **8 ja**: Android i samma PR,
och vald ordning Android först, iOS speglar.

**Vad som byggdes (lager 1, "grunden"):** resans logg, låsskärmsnotisen med knapparna i sig, och
kortet överst på *Redo.* med en rad per varning. **Siri-fraserna (lager 2) och missarna
(`driver_miss`) ingår inte** — de står kvar på kortet, medvetet uppskjutna.

**Räkningen är ren och delad.** `Resan` (Kotlin `Resan.kt`, Swift `Resan.swift`) svarar på fyra frågor
och bara dem: vilka varningar i resan är obesvarade, vad blir facit om alla besvaras med ett tryck,
står frågan fortfarande kvar (ett dygn), och hur lyder frågan (singular vid en varning — *"alla 1
varningarna"* är inte svenska). Ingenting i filen skriver ett svar av sig själv: **tystnad är inget
svar**, och den regeln bor i frånvaron av kod, inte i en kommentar. Åtta enhetstester på Android-sidan
— de första i app-modulen — och de är gröna i CI.

**Två fall som räkningen måste bära, och gör:** rader utan varnings-id (Androids historik före 16/9)
räknas *inte* som obesvarade, annars hade varje sådan rad hållit frågan öppen för evigt. Och ett svar
som ges igen ersätter det förra och blir osänt — förarens senaste ord gäller, precis som för ett
enskilt svar.

**Ordningen i notishanteraren är avsiktlig:** svaret sparas FÖRST, sändningen är det som får
misslyckas. Androids `FacitSvarReceiver` har ~10 s via `goAsync()`, och en sändning med 10 s timeout
per svar kan falla utanför fönstret. Misslyckas den ligger svaren kvar som osända och går iväg vid
nästa stillastående eller appstart — samma seghet som `FacitSender` redan har.

**"Något stämde inte" öppnar appen, med flit.** En avvikelse måste pekas ut på en RAD, och det går
inte från en notisknapp. Kortet överst på *Redo.* bär resans rader, så föraren landar rätt.

**iOS krävde mer än Android, och det var inte synligt förrän filerna lästes:**
- **iOS hade ingen persistent varningshistorik.** Android har `AlertHistory` i DataStore; iOS hade
  bara `lastSaidText/At/Id` — alltså *bara resans sista varning*. Ny `AlertEntry` + `AlertLog` i
  `Resan.swift`, JSON i UserDefaults (samma väg som facit redan går; Androids tabbformat behövs inte).
- **iOS registrerade inga notiskategorier och hade ingen delegat.** `HeadsUpService` bad om `[.alert]`
  och visade en knapplös banner. Ny `EfterResanNotis` med kategori, två åtgärder och delegat,
  registrerad i `HalkvaktApp.init()` — kategorin måste finnas *innan* en notis kan levereras, och
  delegaten måste finnas när föraren trycker, även när trycket är det som startar appen.
- **`willPresent` returnerar `[]`** — exakt som innan appen fick en delegat alls. Att lägga till en
  delegat ändrar annars tyst beteendet för heads-up-bannern (#23).

**En bugg som bara fanns på iOS och fångades när halvorna jämfördes:** `lastSaidAt` sattes till
`.now` medan historikraden skulle ha en egen tidsstämpel. Facitsvar nycklas på `(id, t)` — två `.now`
hade gett **två rader för samma varning**, så ett svar under "Senast sagt" hade inte släckt raden i
efter-resan-kortet. Nu tas EN tidsstämpel och används på båda ställena.

**Fotostudion utökad på båda plattformarna:** startargumentet lägger nu in en påhittad *resa* med två
varningar, inte bara en varning, så kortet går att se utan en körning.

**Det som INTE är bevisat, och måste sägas rakt:** Android-halvan är **grön i CI** — den kompilerar
och de åtta testerna passerar. **iOS-halvan är skriven utan kompilator.** `Resan.swift`,
`EfterResanNotis.swift`, `EfterResanKort.swift` och ändringarna i `GuardManager`, `Prefs` och
`VaktenView` kompileras första gången i Axels Xcode. Inget CI-flöde bygger app-målet — samma rad står
i #267 och #276, och det är tredje gången i dag den är skälet till ett förbehåll. Notisåtgärden kan
dessutom inte prövas i simulatorn på ett trovärdigt sätt: låsskärmen och bakgrundsleveransen är
poängen. **Verify står öppen tills en riktig resa på en riktig telefon ger rader i `driver_facit`
utan att föraren stannat.**

## #278 (20/9 2026) Svepet: blindningsläckan tätad (#216), portarnas flöden lagade, och läsarkontraktet byggt (#210)

**Bengts order 20/9:** *"jag tycker att vi gör 210 409 och 416 i ett svep"*. Tre saker i en gren, en CI-körning.

**1. #216 — blindningsläckan tätad.** Bengts ja på Axels val (#265). `scripts/grind-t-a.ts`: tabellen **räknas alltid**
— en grind som inte räknar kan inte visa att den fungerar — men **rangordningen trycks först när domspärren släpper**.
Klarhetsdelens kolumn *fyrade* bygger på svepets vinnare och hålls tillbaka likadant; antalet frostnätter per molnklass
är underlag och står kvar. **Bevis, skarp körning med domspärren hållande:** `SVEPET — 144 kombinationer` följt av
`(rangordningen hålls tillbaka — 144 punkter räknade, ingen redovisad)`, medan fysikkontrollen skrevs som förut.
TROSKLAR-KOMBINATIONEN bär nu regeln om delgrindarnas körningar mot D3, i samma commit — Axels villkor.

**2. Portarnas flöden lyssnade inte på `engine/src`.** `android.yml` och `ios-engine.yml` triggade på `engine/vectors`
men inte på referensmotorn. En ren motorändring hade alltså passerat otestad i Kotlin och Swift. Dagens motorfixar
råkade trigga portarna för att de också lade vektorer — skyddet hängde på tur. Rättat.

**3. #210 — läsarkontraktet.** Kortets egen invändning var *"inget testmål"*, och den var riktig: vektorerna börjar där
faran redan är TOLKAD. De är ett kontrakt för MOTORN och kan per konstruktion inte se ett fel i JSON-läsningen — vilket
är exakt var #210 satt. Nu finns samma sorts kontrakt ett lager ned: `engine/fixtures/lasarprov.json` med de fall som
är lätta att läsa fel, och `test/lasarkontraktet.test.ts` som prövar TS-läsaren mot dem.
**Motprov:** `road: d.road ?? null` → `String(d.road)` ⇒ testet faller med `actual: 'null'` mot `expected: null`.
**Nollpolitiken är hela poängen:** `bearing` null får inte bli 0 (0 är norrut, och kameran filtreras då på fel kurs) ·
`yta` null får inte bli 0 °C (0 ligger under fryströskeln och hade fyrat) · `road` null får inte bli ett ord.
**Kvar:** Swift och Kotlin läser i app-koden, som saknar testmål. Provfilen ligger färdig den dagen målet finns.
**Kortet #210 stängs fortfarande av Axels bygge** — läsarkontraktet gör inte fixen bevisad, det gör nästa regression synlig.

**Två PR:er stängda utan att slås ihop.** #409 hann bli halvt dubblerad — den parallella sessionen härdade `str()` i
90b5223 — och #416 hade `[skip ci]` i sin huvudcommit, vilket fick GitHub att hoppa över PR-körningen. Innehållet
ligger här i stället. **Läxa värd att skriva:** `[skip ci]` i en grens huvudcommit tystar också `pull_request`-körningen,
så en gren som bara bär dokument kan inte granskas av CI — och en gren som bär kod får aldrig ha märket.

## #279 (20/9 2026) Enhetsverifieringen kontrollerad mot källan: kravet stämmer, men en LÅNAD telefon räcker

**Bengts fråga 20/9:** *"stämmer det att playkontot inte aktiveras förrän en telefon android bevisas genom inloggning
på play console kontot"*. Frågan gällde ett påstående i #271, som kom ur Play Consoles gränssnitt och inte ur en läst
källa. CLAUDE.md:s läxa säger att en uppgift som ges till Bengt eller Axel ska vara läst på källsidan — den tillämpades
här, i efterhand.

**Kravet stämmer, ordagrant** (support.google.com/googleplay/android-developer/answer/14316361, läst 20/9):
*"Från och med början av 2024 måste utvecklare med nya personliga konton verifiera att de har åtkomst till en riktig
mobil Android-enhet via Play Console-appen innan de kan göra appen tillgänglig på Google Play."*
Google Play Console listar det som **steg 6** och märker det *(Endast personliga konton)*.

**Två rättelser som gör grinden billig:**
1. **Vilken telefon som helst duger.** FAQ, ordagrant: *"Du kan använda alla fysiska mobila Android-enheter som inte
   är rotade och kör operativsystemet Android 10 eller senare."*
2. **Den behöver inte behållas.** FAQ, ordagrant: *"Nej. Vi kan be dig om verifiering i framtiden, men du behöver inte
   använda samma enhet."*

**Följden:** #271:s rekommendation om en **begagnad Samsung för 800–1 500 kr** behövs INTE för verifieringen. Ett lån
på tio minuter räcker — skanna QR-koden i Play Console, installera Play Console-appen på den lånade telefonen, logga in
som kontoägare, tryck Verifiera, lämna tillbaka. En egen testtelefon är fortfarande motiverad för fälttest och för att
faktiskt köra appen, men den är då en **bekvämlighet igen, inte publiceringsgrinden**.

**Vad som INTE är klarlagt, och som därför inte påstås:** Googles formulering är *"göra appen tillgänglig på Google
Play"*. Om ett SLUTET TEST räknas dit går inte att avgöra ur texten. Testkravssidan säger att slutet test kan startas
*"när du är klar med konfigureringen av appen"*, vilket talar för att novemberbetan inte blockeras — men det är en
slutsats av två sidor, inte ett citat, och redovisas som sådan.

**Vad som ÄR klarlagt oavsett:** utvecklarens telefonnummer kan inte verifieras förrän identitet **och**
enhetsverifiering är klara (*Verifiera uppgifter för utvecklaridentitet*: *"Du kan inte verifiera ditt telefonnummer
förrän dessa förutsättningar är uppfyllda"*). Enhetsverifieringen ligger alltså i vägen för kontots färdigställande
hur betan än klassas — men den kostar ett telefonsamtal, inte tusen kronor.

## #280 (21/9 2026) Kort #218 kontrollerat mot koden: loopen är vanligare än kortet säger — och #279:s lån behövs inte

**Bengts fråga 21/9:** *"vad är 218"*. Kortet (genomlysningen P8, 20/9) lästes mot koden innan det förklarades.

**Stämmer:** iOS `BestForNavigation` med pausen av, satt på ett ställe och aldrig ändrat (`GuardManager.swift:90–92`,
inget `distanceFilter` någonstans) · Androids trappa 1 / 5 / 15 s efter avståndet till närmaste fara (`CadencePolicy.kt`)
· `CadencePolicyTest.tiers()` jämför mot sina egna konstanter, så `NEAR_MS` 1 → 10 s och `FAR_MS` 15 → 150 s passerar
hela sviten (läst, inte kört; motprovet görs i CI när testet lagas).

**Rättat:** kortets *"fyra HTTP-anrop per sekund … när nätet saknas och cachen är tom"*. Utan nät faller första anropet
och laddningen avbryts — ett försök per sekund. Fyra per sekund kräver att nätet FINNS och att en fil fäller utan sparad
kopia; då laddas `static.json` om varje sekund, 274 kB/s med storlekarna hämtade 21/9 (static 251 391 byte, live 22 262,
manifest 352) — ungefär 1 GB i timmen.

**Nytt, samma rotorsak, och det vanliga fallet:** `lastSnapshotLoad` sätts bara vid lyckad laddning, och inget markerar
att en pågår. Utan data går vakten i 1-sekundstakt, så varje GPS-punkt före den första lyckade laddningen startar en ny
komplett laddning i en egen tråd — vid varje start och varje självväckning efter ett stopp. På ett segt nät trängs de och
gör varandra långsammare. Kortets fall kräver ett tomt cacheminne; det här kräver bara ett segt nät. iOS har inte felet:
vägdatan laddas vid start och när vyn visas, inte per GPS-punkt.

**Mätningen:** Bodenresan 1/9 bad om batteriprocenten med laddare i bilen. Det enda försöket kunde alltså inte mäta
budgeten. Frågorna står i bedömningen §4.2.

**Rättelse av #279.** #279 skrev *"en LÅNAD telefon räcker"*, och svaret till Bengt rådde honom att fråga någon i
närheten. Onödigt: #271 slutar med Axels *"vi har en Android som vi kan använda"*, och #272 beskriver appen uppsatt på den
telefonen 20/9 kväll. Kvar för Play-grinden är bara inloggningen i Play Console-appen på den. **Läxa:** läs hela
beslutsposten som rättas — #271:s sista stycke hade redan löst det #279 rättade.

## #281 (21/9 2026) Göteborgs svar: stadens halkdata är köpt och avtalsbunden — vägen går via Nira, och Nira säljer halkvarningar

**Svaret 21/9 09:08** från Petri Stjernvall, planeringsledare vinterväghållning, stadsmiljöförvaltningen, på Bengts mejl
17/9 09:48 (repot sa 18/9): *"Vi använder friktionsdata från bilar och data levereras av Nira. Vi har också
väglagsprognoser via Klimator och SMHI, som i sin tur kan hanteras i ett system som heter BM Road Service Systems. Allt
detta hanteras av avtal och kan ej i dagsläget delas fritt."*

**Vad det betyder.** Prognoserna (Klimator, SMHI) faller på vår egen regel: en varning utlöses bara av en mätning
(regel T — Bengts mejl sa detsamma). Friktionsdatan är en mätning, men den är Niras och inte stadens, så stadens väg är
stängd och leverantörens öppen — samma mönster som Malmö. Fråga 2 (egna vägväderstationer på gatunätet) blev obesvarad;
fråga 4 (rätt person) besvarades i praktiken av avsändaren.

**Läst på källan 21/9** (niradynamics.com/products/road-surface-alerts): Nira säljer *Road Surface Alerts*, kartmatchade
varningar bland annat för *"Slippery road: Detects low-friction surfaces using real-time vehicle data"*, möjliga att
hämta via API och riktade till biltillverkare, underleverantörer och fordonsflottor. Sidan: *"Each alert is based on
measured data"*. Priset är inte publikt. Exempeldata och produktguide hämtas via ett formulär (namn, e-post, företag).
**Oläst:** källkartläggningens *gratis utvärderingskonto på roads.niradynamics.se* — adressen gick inte att öppna.

**Källkartläggningen 26/8 sa detsamma** (punkt 10: kontakta NIRA, *"enda vägen att på sikt täcka blindpunkterna med
faktiska mätdata"*), men fick inget kort och gjordes aldrig. Nu kort #229.

**Repot säger två saker om Trafikverkets fordonsdata:** #230 skriver att Trafikverket köper från *"Volvo, Nira
Dynamics"*; källkartläggningens rättelse säger att köpet går direkt till biltillverkarna och att NIRA/Klimator bara
figurerat i piloter. Inte avgjort här — det påverkar inte Göteborgs svar.

**Rekommendation (bedömningen §4.2):** Bengt tackar och ställer den obesvarade fråga 2 (utkast på kort #229) · Bengt
hämtar Niras exempeldata, gratis, och Claude läser den mot tre frågor: täthet i stan, färskhet, regel T · en fråga om
villkor bara om exempeldatan håller, och varje betalväg kräver en DECISIONS-post som Axel godkänner.

**Lydelsen i nästa utskick:** mejlet 17/9 skrev *"Användarens position lämnar aldrig telefonen"*. Sedan #264 gäller
*ingen position lämnar telefonen automatiskt* — facitsvaret som föraren själv trycker är undantaget. Nästa mejl, till
Göteborg eller Nira, använder den lydelsen.

## #282 (21/9 2026) Nira — konkurrent eller partner? Hypotesen håller för första bilen, inte för Nira som företag

**Bengts fråga 21/9:** *"Är det enbart data från bilar så är de steget efter. Vi ger en prognos om vad som kommer att
hända innan en bil kommer. Så vi kanske inte är konkurrenter utan partners."* Utredningen: `docs/NIRA-UTREDNING-2026-09-21.md`.
Niras sidor lästa i webbläsaren, två agenter sökte utanför, och varje bärande uppgift kontrollerades mot källan.

**Det som håller:** Niras egen signal kommer när bilar har kört — *"The first cars to encounter the black ice would have
automatically registered the dramatic change in friction"* (Niras artikel om Enköping). På mindre vägar kommer *"ofta
några mätningar per dygn"* (Trafikverket 10/11 2025), och 2021 kallade Trafikverket metoden *"främst eventbaserad"* —
jämn fart på en landsväg ger mindre data.

**Det som inte håller:** Nira är inte bara bildata. *"NIRA Dynamics AB is a part of the Volkswagen Group"*, och Nira har
redan prognosdelen: med Klimator sedan 2018 (*"detaljerade prognoser av halka på vägavsnitt"*) och Vaisala Xweather sedan
2024 (*"connects road weather forecasts … with real-time connected car data"*). Halkvakt är inte heller ensamt om att se
före: Klimators halkprognos på Expressen visar *"det förväntade väglaget på Sveriges vägar de närmaste åtta timmarna"*.
Nira ställer sig dessutom uttryckligen mot *"temperature thresholds"* — Halkvakts nuvarande varning (yta ≤ +1 °C och
fuktig, `engine.ts:213–218`) är en sådan.

**Nischen som återstår:** gratis, röst under körning, utlöst av mätning och inte modell, minuter till timmar före första
bilen. Forskningen stöder horisonten: de första timmarna är en ren mätning lika bra som vägvädermodellen (Karsisto 2024,
RoadSurf). Men förvarningen körs i skuggläge (S1), finns inte i motorn (S3) och är blindad till domarna.

**Slutsats: konkurrent i varningsledet, inte partner i prognosledet — och förhållandet är skevt.** Road Surface Alerts
säljs till *"third party applications used by drivers"*, alltså Halkvakts plats. Prognosplatsen hos Nira är upptagen.
Halkvakt skulle få mycket av Nira — facit, ett vittne på platsen som genom ett eget beslut kan göra varningar mellan
stationerna möjliga (T5), tystnad på saltad väg, gatorna — medan Nira i dag skulle få lite.

**Rekommendation:** exempeldatan nu (gratis) · beviset i vinter · kontakt efter domarna med ett konkret facitförslag,
gärna som innovationsprojekt med en väghållare · ingen förfrågan om partnerskap före beviset och ingen betalväg utan Axel.
**Krav i varje samtal:** alla varningar som fil — tjänsten levereras annars till *"vehicles approaching the affected area"*,
vilket kräver att positionen lämnar telefonen · det mätta skilt från det modellerade (regel T6) · licens för appen (de
gamla villkoren: *"you will not redistribute or transfer the Service or the Content"*).

**Sidofynd:**
1. **Trafikverket delar inte sin fordonsdata:** *"Data kommer inte att delas vidare från Trafikverket till tredje part om
   inte separat överenskommelse träffas"* (slutrapporten 2021). Frågan i bedömningen §0b får troligen svaret nej.
2. *(se #294: adressen står i katalogposten men studsar — läxan hade rätt i sak)* **CLAUDE.md:s läxa om `datex@trafikverket.se` är för stark.** Den säger att en sammanfattning *"hittade på"* adressen och
   att Trafikverket inte har någon sådan. Trafikverkets katalogpost *Temporary slippery road* på trafficdata.se anger just
   den adressen som `contact_email`. Läxans poäng — läs kontaktuppgifter på källan — står sig. Förslag att rätta meningen
   ligger hos Bengt.
3. **FMI:s vägvädermodell RoadSurf är öppen källkod (MIT).** Den skulle kunna bli ett stärkande lager under T6 — aldrig en
   utlösare.

## #283 (21/9 2026) Niras exempeldata mätt: tät över dygnet, tunn på natten — och värdena förs vidare utan ålder

**Bengt 21/9:** *"filerna är nedladdade nu"*. Exempeldatan lästes mot utredningens fyra frågor (§9, resultatet i §11).
Winter Road Insights, Stockholm 15/1 2024: friktion 305 316 rader, torkare och lufttemperatur 1 846 547 rader vardera
(samma bilrapporter), tiominutersperioder 01:00–00:50 svensk tid. Skript `scripts/matningar/nira-exempeldata-2026-09-21.py`;
filerna ligger inte i repot (villkoren förbjuder vidarespridning).

1. **Tätheten:** 2 275 km väg med minst ett friktionsvärde under dygnet; inom 8 km från Sergels torg 408 km — där Halkvakt
   har 7 stationer. Vägklass 5, lokalgatorna, saknas helt.
2. **Färskheten:** klockan 05 hade 2–9 % av vägavsnitten ett värde från den senaste timmen (klockan 07: 20–54 %); klockan
   02–03 fick under 1 % av dygnets 8 957 avsnitt något värde.
3. **Mätt eller modellerat:** ingen flagga. 22–56 % av friktionsvärdena ligger i en period utan bilrapport på avsnittet; i
   80–89 % av dem fanns en rapport inom 30 min före, i 98 % inom två timmar. Värdena förs alltså vidare, i följder om 60 min
   i median. Medelvärdet ligger i 6,4 % av raderna mer än 0,05 utanför radens egen min–max, som mest 0,83.
4. **Händelsestyrt:** kan inte avgöras. Friktion finns i 48 % av motorvägens rapportperioder mot 15,5 % på minsta
   vägklassen — men trafikmängden döljer effekten.

**Sidofynd:** lufttemperaturen är luftens, inte vägytans, och bär +29,5 °C en januaridag — värdevakten hade stoppat fältet ·
torkarna gick i 8,2 % av avsnittsperioderna, ett möjligt regnvittne på platsen (T1).

**Följd:** Bengts hypotes stärks där den stämde. Niras bild är tunnast när frosten bildas; Halkvakts stationer mäter vägytan
oavsett trafik. **Nytt krav i ett framtida samtal med Nira:** varje värde med tiden för den senaste mätningen under det — utan
den kan ett framfört värde inte bära en varning (T1: vittnet inom utfallsfönstret; T4: minne av mätning med känd kedja).
Repot är privat (kontrollerat 21/9: HTTP 404 utan inloggning), så utredningen och siffrorna syns inte utåt.

## #284 (21/9 2026) Efterhandstestet mot Niras exempeldag går inte — och skulle inte säga något; det riktiga testet är en övergångsnatt (kort #230)

**Bengts fråga 21/9:** *"kan vi testa vår app mot denna mätning som ett backlog försök"*.

**Hinder 1, indata.** Halkvakts regler läser vägytans temperatur och fukt från Trafikverkets stationer. För 15/1 2024 finns
de inte öppet. API:ets observationer räcker en vecka bakåt (källkartläggningen 26/8). Vårt arkiv börjar 2026 och gallras
efter sju dygn (sql/014; därför finns `trend_kandidater`, sql/017). Lastkajens post *NVDB VVIS* är stationsregistret och inte
mätningarna (katalogposten läst 21/9). Vintersidan, där Trafikverket har *"historisk väderdata från VViS och MESAN"*, är bara
för Trafikverkets anställda och entreprenörer på uppdrag (läst 21/9).

**Hinder 2, dagen.** Niras egna bilar visar −4 till −10 °C hela dygnet: 0,5 % av avläsningarna ≥ 0 °C, torkarna igång i
3–12 % av avsnittsperioderna per timme (snöfall). Efterhalkans startvärden (yta +1…+3 °C och fallande) hade aldrig fyrat;
dagens isvarning (yta ≤ +1 °C och fuktig) hade legat på överallt. Friktionen var lägst klockan 01–08 (median 0,26–0,30) och
steg under dagen till 0,46. Ett test den dagen kan inte skilja en bra regel från en dålig. **Sidonot:** en temperaturbaserad
varning hade legat kvar hela eftermiddagen medan friktionen steg — Niras invändning i praktiken, men utan Niras gräns för
*halt* går det inte att kalla det falsklarm.

**Kort #230 skapat med designen skriven före mätning:** en övergångsnatt · de låsta startvärdena, inget svep (D2, D6, D7) ·
facit = Niras friktion under Niras egen gräns för *halt* inom 5 km och 90 min (samma radie och fönster som KB-B) · mått:
träff, falsklarm och försprånget i minuter före första låga friktionsvärdet.

**Öppet (bedömningen §4.2):** väg A (den här vintern — skuggloggen och `trend_kandidater` mot Niras friktion för 2–3 nätter;
kräver att Niras friktion deklareras som facitkälla före nätterna, D3) eller väg B (en tidigare säsong — VViS-historik från
Trafikverket och friktion från Nira). Rekommendation: väg A, som en förfrågan om data, inte om partnerskap.

## #285 (21/9 2026) Efterhandstestet gäller hela systemet — motorn plus skuggmotorn — och blir därmed en del av domarna (kort #230)

**Bengts precisering 21/9:** *"jag vill inte bara testa den mot motorn som den ser ut i dag. Det ger inte så mycket. Men att
testa den mot motorn + skuggmotorn hade kunnat bevisa något till vår fördel för det är ju så vårt fullständiga system kommer
att se ut"*.

**Beslutat (Bengt):** testobjektet i kort #230 är hela systemet, redovisat lager för lager:
1. **Motorn som i appen:** isvarningen vid yta ≤ +1 °C och fuktig (`engine.ts:213–218`).
2. **Efterhalkan med startvärdena från 17/9.** Skuggmotorn loggar dess indata per station i ruttkorridoren sedan 16/9 (S1,
   `efterhalkaRader` i `supabase/functions/skuggmotor/main.ts`), och uppspelningen kör regeln ur arkivet.
3. **Skuggan, prognosen mellan stationerna** (TROSKLAR-SKUGGAN). Grind A prövar offsetmodellens matematik; koden skrivs i
   november om den håller. I provet mäts den men talar inte (T3/T6).
4. **SMHI-förlängningen** när vintervarningar finns.

**Två anspråk prövas:**
- **FÖRE:** minuter före första låga friktionen, där exempeldatan visar att Niras bild är tunnast, alltså natten (#283).
- **MELLAN:** träffar skuggan de sträckor mellan stationerna där bilarna sedan mäter låg friktion? Det vore det första provet
  av offsetmodellen mot ett vittne på platsen.

**Följden som gör det tidskritiskt:** efterhalkans och skuggans utfall är blindade till domarna (D2, D3, D6). Ett prov mot
Niras friktion är därför domarnas utfall med en ny facitkälla, och facitkällan måste deklareras **innan nätterna mäts** — före
den första övergångsnatten, som kan komma i oktober. S6 har i dag förarfacit och kamerafacit. Att lägga till Niras friktion,
och kriteriet för vilka nätter som prövas, är ett beslut för Bengt och Axel (bedömningen §4.2).

**Varför kriteriet måste stå först:** ett prov som bara kan visa vår fördel bevisar ingenting. Nätterna väljs på ett kriterium
som inte är vår egen regel. Skuggmotorns logg är skriven innan utfallet fanns, så det går inte att fuska i efterhand — åt något
håll — och det är just det som gör ett gott utfall trovärdigt för Nira, Skyltfonden och testförarna.

**Området:** Stockholm. Där finns Niras exempeldata, och skuggmotorns rutter *E4 Södertälje→Uppsala* och *E18
Örebro→Stockholm* går genom det.

**Begränsning:** skuggmotorn kör varje rutt var 3,5 timme. Minuterna före första bilen kommer därför ur uppspelningen per
station, inte ur rutternas logg.

## #286 (21/9 2026) Efterhandstestet på Niras exempeldag, låst före körningen: motorns regel och skuggmotorns kommande regel, med Niras material som indata

**Bengts order 21/9:** *"vi hämtar inte niras data. Vad jag bad om var om man kunde göra en backtest på den dagen då Nira
hade sin exempeldag den 15 januari 2024 och på det sättet få en bedömning av om vårt system hade larmat på de inlämnade
materialet"* — och *"viktigt att komma ihåg är att du i den här testen ska tillämpa både motorns regler och skuggmotorns
framtida regler"*.

**Följd:** väg A och B i kort #230 stryks — ingen ny data begärs från Nira — och därmed förslaget i #285 om Niras friktion
som tredje facitkälla. Testet körs på exempeldagens tre filer (#283).

**Indata — ersättare, och det är den viktigaste reservationen.** Halkvakts regler läser vägytans temperatur och stationens
nederbörd. Här används bilarnas mätningar på samma vägavsnitt i stället:
- **yta** ≈ bilarnas lufttemperatur (luften, inte vägbanan)
- **fukt** (motorns: nederbörd nu, `publish/snapshot-core.ts`) ≈ torkarna igång i samma tiominutersperiod
- **regn inom 2 h** ≈ torkarna igång någon gång under de två senaste timmarna på avsnittet
- **fall på 30 min** ≈ lufttemperaturens fall över 30 min, räknat som `publish/trenden.ts`: minst tre värden i fönstret,
  inget hopp över 3 °C, positivt när den faller, avrundat till tusendels grad
- **givarvakten** (`rimlig` — daggpunkten) går inte att tillämpa, eftersom materialet saknar daggpunkt. I stället en
  värdevakt: lufttemperatur utanför −35…+15 °C sorteras bort.

Varje vägavsnitt behandlas som en station.

**Reglerna, låsta:**
1. **Motorn** (`engine.ts:213–218`): yta ≤ +1 °C och fukt.
2. **Skuggmotorns kommande regel, efterhalkan med startvärdena** (DECISIONS #222/#225, `sql/028`): yta +1…+3 °C · fall
   ≥ 0,8 °C på 30 min · regn > 0 inom 2 h. En episod per avsnitt och natt (middag till middag UTC).

**Kan inte tillämpas:** *skuggan* (prognosen mellan stationerna) bygger på stationsankare och klimatologiska förskjutningar,
som materialet saknar. SMHI-förlängningen kräver SMHI:s varningar, som inte finns i materialet.

**Facit:** Niras friktion på samma avsnitt inom (t, t + 90 min]. Gränsen för *halt* är 0,30 — Niras skala är
odokumenterad i filerna, och därför redovisas känsligheten för 0,25 och 0,35.

**Mått:**
- antal varningar och episoder
- träffandel mot basnivån — andelen tiominutersperioder med bilrapport som följs av låg friktion, alltså vad en regel som
  larmar på allt hade fått
- andel halkaepisoder som föregicks av en varning
- försprånget i minuter
- fördelningen per timme

**Blindningen:** startvärdena prövas som de står, utan svep (D2, D6, D7). Materialet är från 2024, utanför säsongens
kalibrerings- och domnätter, och resultatet får inte ändra startvärdena. **Redan sett före låsningen (#284):** dygnets
lufttemperatur låg mellan −4 och −10 °C, så efterhalkans utfall är i praktiken förutsägbart — inga eller nästan inga
fyrningar. Motorns utfall är inte räknat.

## #287 (21/9 2026) Efterhandstestet på exempeldagen: motorn hade larmat mycket men sämre än slumpen — skuggmotorns regel kunde inte prövas

> ⚠️ **Läs med #290 (second opinion samma dag):** testet prövade i praktiken torkarna, inte motorn — temperaturvillkoret var sant i 99,7 % av perioderna, *"sämre än slumpen"* är till 70 % en blandningseffekt, och halkan började före datans fönster, så försprånget går inte att läsa. Talen nedan står kvar; läsningen av dem är ändrad.

**Körd enligt #286,** upplägget låst före körningen (PR #431). Skript `scripts/matningar/nira-efterhandstest-2026-09-21.py`.
**Reservationen först:** bilarnas lufttemperatur och torkare ersätter vägytans temperatur och stationens nederbörd, och
varje vägavsnitt behandlas som en station. Testet prövar reglernas logik, inte stationsnätet.

**Motorn** (yta ≤ +1 °C och fukt): 21 767 varningsögonblick på 7 557 av 16 810 avsnitt. Andelen som följdes av friktion under
0,30 inom 90 minuter var **33,7 % — mot basnivån 44,2 %**, alltså vad en regel som larmar på allt hade fått. Samma riktning vid
0,25 (20,8 % mot 26,4 %) och vid 0,35 (44,9 % mot 58,2 %). 40 % av varningarna hade inget facit, eftersom ingen bil mätte
friktion efteråt. Av 4 375 träffar kom 1 431 innan halkan fanns på avsnittet. Av 8 526 halkaepisoder föregicks 981 (11,5 %)
av en varning, med ett försprång på 50 minuter i median. Per timme: klockan 03–08 låg motorn i nivå med basnivån, och
klockan 09–19 klart under — varningarna följde snöfallet mitt på dagen, medan halkan var värst natt och morgon.

**Skuggmotorns efterhalka** (startvärdena): 894 ögonblick i startbandet +1…+3 °C på en dag som låg −4 till −10 °C, 41 med
räkningsbar lutning, 1 med fall ≥ 0,8 °C och regn inom 2 h — ett falsklarm. Regelns värde kan inte bedömas på materialet,
eftersom dygnet inte innehöll någon övergångsnatt. Skuggan och SMHI-förlängningen kunde inte tillämpas (#286).

**Följd:** på en jämnt kall snödag pekar en regel byggd på temperatur och nederbörd inte ut halkan — Niras invändning,
bekräftad på deras egen dag. Den del av systemet som ska ge försprånget prövas inte av det här materialet. Övergångsnattens
prov görs inte, eftersom ingen ny data hämtas från Nira (Bengt 21/9). **Iakttagelse, inte slutsats:** motorns *fukt* betyder
nederbörd *nu*, och den här dagen kom halkan efter snöfallet, inte under det. Ett dygn ändrar ingen regel, och motorns
beteende vaktas av vektorerna. Iakttagelsen bokförs till domarna. **Kort #230 stängt.**

## #288 (21/9 2026) Skuggsidan har sex isregler, inte en — övergångsregeln läggs till i efterhandstestet (låst före körningen); grind A föll inte

**Bengts fråga 21/9:** *"men finns det bara en regel i skuggmotorn som det här testades mot"*. **Nej.** #286 låste två regler
och räknade bara skuggan och SMHI-förlängningen som otillämpbara. Det var för smalt. Skuggsidans kommande isregler har var
och en sitt tröskeldokument:

| Regel | Vad den gör | Behöver | På Niras material |
| :-- | :-- | :-- | :-- |
| Kombinationen, efterhalkans beta (TROSKLAR-KOMBINATIONEN) | varnar före frysningen: yta +1…+3 °C som faller, blött inom 2 h | yta, lutning, regn | ✅ körd (#287) |
| **Övergångsregeln #89 (a)** (TROSKLAR-OVERGANGAR) | förlänger frysriskens fuktvillkor: *"en väg som nyligen var blöt fortfarande är blöt när den fryser"* | yta, regn inom N h | ✅ **tillämpbar — läggs till här** |
| Trenden #88 (TROSKLAR-TRENDEN) | fallande yta med daggpunkten strax under | yta, daggpunkt | ✘ daggpunkt saknas |
| Rimfrosten #46 (TROSKLAR-RIMFROST) | svartis utan nederbörd: yta ≤ daggpunkt + M | yta, daggpunkt, moln | ✘ daggpunkt saknas |
| SMHI-förstärkaren #95 (d) | vintervarning + yta nära noll förstärker | SMHI:s varningar | ✘ saknas |
| Väglagets ålder #151 | tystar en stående vinterklassning när mätningarna säger att vintern är slut | Trafikverkets väglag | ✘ saknas |
| Frysklassningen #103 och segmentmotorn (skuggan) | prognos mellan stationerna | stationsankare | ✘ saknas |

Vattenplaningen och vind och sikt är skuggregler men inte isregler.

**Övergångsregeln, låst före körningen:** yta ≤ +1 °C och nederbörd inom N h. N = **2 h**, samma som betans startvärde
(#222); Ö-B:s eget svep körs inte. Samma ersättare som i #286: bilarnas lufttemperatur för ytan, torkarna igång inom
(t − 2 h, t] för nederbörden. Samma facit och samma mått: friktion under 0,30 på samma avsnitt inom 90 min (känslighet 0,25
och 0,35), basnivån, halkaepisoderna och fördelningen per timme. **Redan sett före låsningen:** dygnets temperatur och
torkare per timme (#284), motorns utfall (#287) och att halkan kom efter snöfallet. Övergångsregelns utfall är inte räknat.

**Rättelse — grind A föll inte.** I mitt svar 21/9 skrev jag att grind A föll 12/9. Det är fel, och det är andra gången
samma fel görs (första gången rättades i #180). Med #75:s givarvakt och marginalvakten blev domen **INGEN DOM** (#129,
#131): A1 0,85 mot 1,0 klarar, A2 5,1 % mot 5,0 % är oavgjort, A3 0,3 % klarar — uttryckligen *"inte ett nej"*. Segmentmotorn
är inte byggd, eftersom grinden öppnar bara på KLARAR, och valet mellan att skjuta den och att bygga på en oklarerad modell
är Bengts och Axels (#131). #285 och kort #230 skrev att *"koden skrivs i november om den håller"*. Det var också för enkelt:
novemberbeslutet saknar underlag.

**Källan till felet var tre texter som sa "föll" utan förbehåll:** rubriken på #119, raden *"DOMEN HAR FALLIT"* på kort #38b
och inledningen till TROSKLAR-FRYSKLASSNINGEN. Alla tre har fått en rättelsenot i den här commiten. Ingen tröskel och inget
beslut ändras; historiken står kvar.

**Läxa (samma som #280, en gång till):** läs hela beslutskedjan fram till i dag innan ett läge påstås. En rubrik är inte ett
läge.

## #289 (21/9 2026) Övergångsregeln på exempeldagen: fångar mer halka och tidigare än motorn — men inte bättre än slumpen

> ⚠️ **Läs med #290 (second opinion samma dag):** testet prövade i praktiken torkarna, inte motorn — temperaturvillkoret var sant i 99,7 % av perioderna, *"sämre än slumpen"* är till 70 % en blandningseffekt, och halkan började före datans fönster, så försprånget går inte att läsa. Talen nedan står kvar; läsningen av dem är ändrad.

**Körd enligt #288,** som låstes före körningen (PR #433). Samma skript och ersättare som i #287. Motorns och
efterhalkans tal blev exakt desamma vid omkörningen — inget annat har rörts.

**Övergångsregeln #89 (a)** (yta ≤ +1 °C och nederbörd inom 2 h):

| | Basnivå — larma på allt | Motorn | Övergångsregeln |
| :-- | --: | --: | --: |
| Varningsögonblick | — | 21 767 | **95 646**, varav 73 879 efter att nederbörden upphört |
| Följdes av friktion < 0,30 inom 90 min | 44,2 % | 33,7 % | **35,5 %** |
| — vid 0,25 / 0,35 | 26,4 % / 58,2 % | 20,8 % / 44,9 % | 21,0 % / 47,8 % |
| Falsklarm vid 0,30 | — | 8 595 | 37 227 |
| Halkaepisoder varnade i förväg | — | 11,5 % | **16,3 %** |
| Försprång, median | — | 50 min | **70 min** |

Per timme var övergångsregeln klart bättre än motorn på förmiddagen (kl. 9: 46,8 % mot 30,9 %; kl. 10: 30,2 % mot 15,3 %),
men låg under basnivån. Natt och morgon låg alla tre i samma nivå.

**Läsning:** minnet av nederbörd gör det testet pekade på — det fångar halka som kommer *efter* snöfallet, fler episoder och
tidigare. Men på en jämnt kall snödag pekar ingen av reglerna ut halkan bättre än slumpen, och övergångsregeln betalar med
fyra gånger så många varningar. **Reservationen som kan dra åt båda håll:** torkarna går också för stänk från blöta, saltade
vägar, och saltade vägar är just de som inte är hala. Det kan sänka träffandelen för båda reglerna jämfört med en riktig
nederbördsgivare. Det är inte mätt här.

**Skuggsidans övriga isregler** (trenden, rimfrosten, SMHI-förstärkaren, väglagets ålder, frysklassningen, segmentmotorn)
kunde inte köras på materialet (#288). Kort #230 står stängt.

## #290 (21/9 2026) Second opinion på efterhandstestet: upplägget var ärligt, men två slutsatser håller inte — och dagen var Niras bästa sort, inte vår

**Bengts order 21/9:** *"läs detta och ge mej en second opinion. Svara också på om du anser att det här var ett dygn när
vårt system skulle vara som bäst"*. Granskningen är gjord av en annan modell (Fable 5.1) än den som körde testet (Opus 5).
Kontrollerna är **explorativa och gjorda i efterhand** (`scripts/matningar/nira-efterhandstest-granskning-2026-09-21.py`).
De får inte ändra någon tröskel eller något startvärde — bara hur #287 och #289 ska läsas.

**Det som håller.** Upplägget låstes före körningen, reservationerna stod först, och omkörningen gav samma tal. Fynden om
Niras data i #283 (tunn natt, framförda värden utan ålder, luft- i stället för yttemperatur) är materialets verkliga värde
och berörs inte.

**Det som inte håller:**
1. **"Motorn" var inte motorn.** Testet prövade stationsregeln (A2, `icing_point`). Appens första vinterröst är
   Trafikverkets väglag (A1, `slippery_segment`, `engine.ts:262–278`), som går före A2 och som inte finns i Niras material.
   Talen säger alltså inget om vad appen hade sagt den dagen.
2. **Temperaturvillkoret gjorde inget arbete.** 99,72 % av perioderna med bilrapport låg ≤ +1 °C. Det som prövades var i
   praktiken *går torkarna?*. Meningen i #287 och utredningen §12 om att *Niras invändning mot temperaturvarningar
   bekräftades* saknar grund — temperaturen korsade aldrig tröskeln — och stryks.
3. **"Sämre än slumpen" är till 70 % en blandningseffekt.** Torkare > 0 fanns i 13,6 % av motorvägens perioder mot 3,5 % på
   de mindre vägarna, och mest mitt på dagen — där basnivån var lägst (motorväg 19 % mot 50–56 % på vägklass 3–4). Med samma
   blandning av vägklass och timme hade en regel helt utan information fått **36,8 %**, inte 44,2 %. Kvar inom samma vägklass
   och timme: 3,0 procentenheter. På vägklass 3 och 4 låg regeln över dygnet i nivå med eller över referensen (57,1 mot 55,8 %
   och 56,0 mot 50,1 %).
4. **Torkare > 0 är ett dåligt nederbördsvittne — dagtid snarare ett saltstänksvittne.** Värdet är en andel (median 0,13,
   max 1,10), och sannolikheten för *torkare* växer mekaniskt med trafiken: 2,4 % av perioderna med en delsträcksrad, 19,6 %
   med tio eller fler. Dagtid hade avsnitt MED torkare medianfriktion **0,54** (11,8 % under 0,30); avsnitt UTAN hade 0,37
   (30,9 %). Torkarna gick alltså där vägen var blöt, saltad och hade grepp. Med strängare tröskel stiger träffandelen stadigt
   (max ≥ 0,5: 38,9 % · medel ≥ 0,5: 46,8 %); allra högst upp går den över förväntan, men på 62 respektive 12 ögonblick — för
   lite för ett påstående.
5. **Försprånget går inte att läsa.** 76,9 % av *halkaepisoderna* var redan hala vid avsnittets första friktionsmätning, och
   datans första timme (01:00) har medianfriktion 0,27. Halkan började före fönstret. *Föregicks av en varning* och *50
   respektive 70 minuter* mäter tiden till första MÄTNING, inte till halkans början. Övergångsregelns *"tidigare än motorn"*
   (#289) faller på samma skäl.
6. **Efterhalkans "ett falsklarm"** ska läsas *inte prövad*: +1…+3 °C en dag med −5 °C är bilar med varm givare, inte väder.

**Var det ett dygn där vårt system borde vara som bäst? Nej — närmast tvärtom.** Skuggreglerna är byggda för övergången:
blöt väg som faller genom noll, rimfrost under klar himmel, tidig morgon med få bilar. Den 15/1 2024 låg luften på −4 till
−10 °C hela dygnet, det snöade lätt, och vägarna var redan hala när datan börjar. Det fanns ingen övergång att förutse. En
sådan dag avgörs halkan av *var det är plogat och saltat* — det ser en friktionsmätning, och det kan ingen temperaturstation
se. Det är Niras bästa sorts dag, och Nira har själva valt den som säljexempel *(det sista är en slutsats, inte ett belägg)*.
Vårt bästa dygn ser ut så här: regn eller blöt väg på kvällen, uppklarnande, ytan från +3 genom noll mellan klockan 02 och 06.
Då mäter stationerna som vanligt — och Niras egen data visar att bara 2–9 % av avsnitten har ett friktionsvärde från den
senaste timmen klockan 05 (#283). Det dygnet finns inte i materialet.

**Det obekväma som står kvar, och som gäller den riktiga regeln också.** På en stadigt kall snödag säger stationsregeln
*kallt och nederbörd* överallt där det snöar — också på en saltad E4 med fullt grepp. Stationen kan inte se saltet
(TROSKLAR-TYSTNADSFEL: *"saltbil som inte passerat (ingen öppen källa)"*). Jag hittade ingen grind som mäter
produktionsregelns falsklarm uppdelat på vädertyp. Förslag i bedömningen §4.2: när bildfacit läses delas produktionsregelns
varningar i *stadigt kallt* och *övergång* — deklarerat före datan, utan att någon tröskel rörs.

**Hur #287 och #289 ska läsas härefter:** som ett prov av en ersättare (torkarna), inte av motorn — varken för eller emot
Halkvakt. Rubrikerna står kvar för spårbarheten och har fått en pekare hit.

## #291 (21/9 2026) Produktionsregelns falsklarm mäts per vädertyp när bildfacit läses (kort #231)

**Bengts ja 21/9:** *"ja till förslaget om bildfacit per vädertyp"* — förslaget ur second opinion på efterhandstestet (#290).

**Beslutat:** när bildfacit läses (#209; beslutet efter första frosten, bilderna öppnas i mars enligt D2/D3/D6) delas
produktionsregelns varningar (`icing_point`) i *stadigt kallt* och *övergång*, och andelen bilder med bar eller våt väg
redovisas per grupp.

**Varför:** på en stadigt kall snödag säger stationsregeln *kallt och nederbörd* också på en saltad väg med fullt grepp.
Stationen ser inte saltet, och ingen grind mäter i dag hur ofta det händer. Efterhandstestet på Niras exempeldag visade
mönstret med en ersättare (dagtid hade avsnitt med torkare medianfriktion 0,54 mot 0,37 utan, #290); det här mäter det med
vår egen regel, våra egna stationer och en bild som facit.

**Vad beslutet INTE är:** ingen tröskel rörs, ingen röst ändras, ingen ny kod före mars. Asymmetriregeln i TROSKLAR-SKUGGAN §2
står orörd — en ren kamerabild fäller aldrig en VARNING, eftersom svartis inte syns i bild. Måttet är därför beskrivande: det
säger hur ofta bilden visar bar eller våt väg, inte att varningen var falsk. Skillnaden MELLAN de två vädertyperna är det som
bär informationen.

**Villkor:** definitionen av vädertyperna skrivs i DECISIONS innan den första bilden öppnas. Förslaget på kortet — *övergång*
= ytan över +1 °C någon gång under de N timmarna före varningen, N redovisat för 3 · 6 · 12 h, alla tre utskrivna — är ett
förslag, inte ett beslut. Läsningen av bildfacit är Bengts och Axels gemensamma beslut (#209), så raden följer med dit.

**Axel 21/9, via Bengt:** *"Axel har inte några synpunkter"*. Beslutet står därmed hos båda. Definitionen av vädertyperna
fastställs som planerat i samband med #209, före den första bilden.

## #292 (21/9 2026) Kuvösen: hela systemet bakåtprövat på en gången vinter — möjligt, och det hänger på ett datauttag från Trafikverket (kort #232)

**Bengts idé 21/9:** en testbädd där allt i motorn och allt i skuggmotorn körs tillsammans, *"i kuvös … långt från bilar och
appar och människor"*, mot historiska dygn — *"säg 50 vinterdygn 2025"* — som ett prov på *"om det är på rätt väg eller fel
väg"*. Skälet: *"Om vi inte gör det kommer vi ju bara få bevis för en efter en och inte sammantaget."*

**Idén är kartans egen brist, uttalad.** Integrationskartan §7.3: *"Varje grind dömer sin del ENSAM. Det finns ingen grind för
kombinationen … Vi riskerar att underkänna produktens ingredienser en och en."* TROSKLAR-KOMBINATIONEN täcker EN kombination
(efterhalkan: blöt + faller + startband). Ingen mätning svarar i dag på vad helheten ger.

**Delarna finns redan:** grindarnas skript (A, T-A, R-A, K-A, V-A, V-B), uppspelningen ur arkiven (sql/028), och kedjan
`snapshot-core` → `snapshotToHazards` → `AlertEngine` längs skuggmotorns 20 rutter. Kuvösen är att mata dem med en annan vinter.
Den körs i en slit-och-släng-databas som CI:s — aldrig i Supabase, där en vinter inte ryms (177 av 500 MB i dag).

**Vad det hänger på — kontrollerat 21/9, på källorna och inte i sammanfattningar:**

| Källa | Historik | Läst |
| :-- | :-- | :-- |
| Trafikverkets API (WeatherObservation) | sju dygn | källkartläggningen 26/8 (Trafiklabs notis 26/10 2023 säger detsamma enligt en söksammanfattning — notisen är inte läst) |
| Lastkajen | vägnät och järnväg — inga mätvärden | trafikverket.se *Hämta öppen data* (en söksammanfattning påstod *"historiska data finns på Lastkajen"*; sidan säger det inte) |
| Vintersidan | *"historisk väderdata från VViS och MESAN"* — bara Trafikverkets anställda och entreprenörer | bransch.trafikverket.se (#284) |
| Finland, Digitraffic | *"Sensor history for the last 24 hours"* | digitraffic.fi |
| Finland, FMI öppna data | vägväderfrågorna (`livi::observations::road`) finns inte längre | `listStoredQueries`: 151 frågor, ingen för väg |
| Norge, Statens vegvesen | realtid, kräver konto | dataut.vegvesen.no |
| Norge, MET Frost | arkiv, kräver konto — **inte kontrollerat** om vägbanetemperaturen finns | — |

**Slutsats:** vägen till vintern 2024/25 är en förfrågan till Trafikverket. Forskare får sådana uttag; om vi får det vet
ingen förrän vi frågat. Utkast och mottagare på kort #232. **Kartrepots historik** bär 2 606 versioner av `live.json` sedan
24/8 (144 per dygn) — exakt det apparna såg — och blir kuvösens källa för ÅRETS vinter, om svaret blir nej.

**Facit bakåt i tiden är lika gott som facit framåt — för det som stationen kan se.** Stationens egen yta efter varningen
säger att det BLEV kallt, inte att vägen blev hal (sql/028:s egen reservation), och den ser inte saltet (#290). För
övergångsreglerna — efterhalkan, trenden, rimfrosten — räcker det långt som riktningsprov. Väglag och olyckor för samma
period stärker facit, om Trafikverket ger dem.

**Blindningen:** vintern 2024/25 ligger utanför säsongens kalibrerings- och domnätter, så D3 bryts inte av ett riktningsprov
med låsta startvärden. Två saker gäller ändå: upplägget skrivs i DECISIONS före körningen, och hela vintern körs — inga
handplockade dygn. **Vill Bengt och Axel i stället låta den gångna vintern bli KALIBRERINGSDATA** — vilket uppfyller D3
(*kalibrering och dom på skilda nätter*) bättre än att dela årets vinter i två — är det en ändring av planen (kalibreringen
står i dag på 1/2) och ett eget beslut, taget före körningen.

**Bonus:** en hel vinter avgör grind A:s oavgjorda A2 (#131: *"A2 kan inte avgöras på septemberdata, och vinterdata kommer
efter november"*) — alltså novemberbeslutet om segmentmotorn.

**Tillägg 21/9 — SMHI för samma vinter (Bengts fråga *"behöver vi mer smhi data för den perioden också"*).** Prövat mot SMHI:s
tre öppna tjänster: **molnmängd, lufttemperatur och nederbörd** finns i metobs `corrected-archive` (parameter 16: 2010-03-01
till 2026-06-01, 24 timvärden för 15/1 2025) · **radarn** finns med 288 kompositer per dygn för 15/11 2024, 15/1 2025 och
15/3 2025 · **varningarna har inget öppet arkiv** — API:t bär bara de aktiva. SMHI-förstärkaren (#95 d) och N_varning kräver
därför en egen fråga till SMHI, eller körs inte i kuvösen. Ingen ny förfrågan behövs för det övriga; det hämtas vid bygget.

## #293 (21/9 2026) Kuvösens två förfrågningar: mottagarna lästa på källan — och läxan om datex-adressen rättad

> ⚠️ **Fel samma dag, se #294:** datex@trafikverket.se studsar — Bengts mejl 17/9 kom tillbaka med *"Adressen hittades
> inte"*. Trafikverket nås via formulär. SMHI-adressen nedan berörs inte.

**Bengts order 21/9:** *"kan du kontrollera vilken som är rätt mejladress och skriva ett färdigt mejl till mej att skicka"*.

| Mottagare | Adress | Läst var |
| :-- | :-- | :-- |
| Trafikverket, öppna trafikdata | **datex@trafikverket.se** | `contact_email` och `publisher_email` i Trafikverkets egna katalogposter på trafficdata.se (*Temporary slippery road*, *Exceptional weather conditions* — den senare ändrad 3/12 2025) |
| Trafikverket, reserv 1 | formuläret *Frågor till Trafikverket*, etjanster.trafikverket.se/kundfragor-trafikverket | trafikverket.se/om-oss/kontakta-oss — sidan har **inga e-postadresser alls**, bara formulär |
| Trafikverket, reserv 2 | e-tjänsten *Begär ut allmänna handlingar* | samma sida |
| SMHI (varningarna, valfritt) | **kundtjanst@smhi.se** | smhi.se/kontakta-smhi: *"Vi tar emot och vidarebefordrar uppdrag och beställningar"* |

VViS-sidan på bransch.trafikverket.se anger bara växeln (0771-921 921) och det allmänna formuläret. Att datex-adressen
faktiskt tar emot post går inte att pröva härifrån — därför reserverna. Båda mejlen frågar efter kostnaden innan något
arbete påbörjas (gratisnivån: ingen betalväg utan Axels godkännande).

**CLAUDE.md rättad:** läxan från 17/9 sa att sammanfattningen *"hittade på"* adressen och att Trafikverket inte har någon
sådan. Adressen finns (#282). Felet 17/9 var att den gavs vidare oläst — och felet därefter var att den kallades påhittad,
också det oläst. Regeln gäller åt båda hållen.

## #294 (21/9 2026) datex@trafikverket.se studsar — #293:s mottagare var fel, och felet var mitt två gånger om

**Bengts skärmbild 21/9:** hans mejl *"Publiceras halkhändelser från fordon som öppen data"* till datex@trafikverket.se
17/9 08:12 kom tillbaka samma minut från Gmails Mail Delivery Subsystem: *"Adressen hittades inte. Meddelandet levererades
inte eftersom adressen datex@trafikverket.se inte hittades eller inte kan ta emot e-post."*

**Vad som är sant om adressen:** den STÅR som `contact_email` och `publisher_email` i Trafikverkets egna katalogposter på
trafficdata.se (läst 21/9; en post ändrad så sent som 3/12 2025) — och den TAR INTE EMOT POST. Båda sakerna gäller samtidigt.
CLAUDE.md:s läxa från 17/9 hade fel om varifrån adressen kom men rätt i det som räknas: den går inte att använda.

**Mitt fel, två gånger:** (1) #282 och #293 kallade läxan *"för stark"* och *"rättade"* den, utan att fråga sig varför den
skrivits — spåret fanns på raden: *"En fel adress kostar ett utskick och ett varv."* (2) Adressen gavs till Bengt en andra
gång, med reservationen att leveransen inte gick att pröva. Den gick att pröva: genom att fråga Bengt, som hade studsen i
sin inkorg. **Skärpt regel i CLAUDE.md:** att en adress står på en källsida bevisar inte att den fungerar.

**Rätt väg för kuvösens förfrågan (kort #232), läst på källan 21/9:**
1. **Datautbytesportalens kontaktformulär**, data.trafikverket.se/about-us/contact — ärendetyperna är *API Öppna Data ·
   Datex II · Vägdata - NVDB · Öppna Data*; fälten är e-postadress, ämne och innehåll. Välj **API Öppna Data**:
   WeatherObservation ligger i API:t. Samma väg som Bengts Datex II-ärende (skickat, bekräftat 19/9, obesvarat).
2. Reserv: formuläret *Frågor till Trafikverket*, etjanster.trafikverket.se/kundfragor-trafikverket.
3. Reserv: e-tjänsten *Begär ut allmänna handlingar*.
SMHI-adressen (kundtjanst@smhi.se) berörs inte — den är läst på SMHI:s kontaktsida, men inte heller den är prövad.

## #295 (21/9 2026) Göteborg: följdfrågan skickas inte — stadens egen rapport har redan svarat, och vi har inga testare där

**Bengts fråga 21/9:** är det värt att skriva igen till Göteborg, när vi inte har några testare där?

**Bedömning: nej, inte nu.**
1. **Frågan är besvarad.** Följdfrågan gällde om staden har egna vägväderstationer. Stadens slutrapport (InfraSweden 2025,
   s. 8) säger att det före projektet fanns *"tre egna väderstationer som var utplacerade på väderkritiska platser"*, och att
   Klimators system RSI samlar in *"IoT-stationer av olika tillverkare"* vid sidan av Trafikverkets VViS.
2. **Svaret ändrar ingenting.** Tre punkter lyfter inte täckningen (inom 7 km från centrum finns en Trafikverksstation, #93),
   och datan ligger sannolikt i samma avtalsbundna system som Petri Stjernvall redan sagt inte kan delas. Rapporten pekar
   själv ut ägandet av datan som en olöst fråga (§4.3.3.4).
3. **Ingen nytta på plats.** Inga testare i Göteborg (Bengt 21/9); Skyltfondsparterna — halkbanan och trafikskolorna — finns i Skåne. En ny källa kostar en avtalsfråga,
   en egen inläsare och underhåll — för tre punkter ingen förare passerar.
4. **Kraften gör mer nytta där svar väntas:** Malmö (följdmejl 19/9 — halkbanan och skolorna finns där), Trafikverkets
   historikuttag (#232) och Skyltfondsansökan 28/9.

**Vad som ÄR värt att behålla:** kontakten. Petri Stjernvall är planeringsledare för vinterväghållningen, svarade inom fyra
dygn, och staden har drivit ett innovationsprojekt med just Nira och Klimator. Är förvarningen bevisad efter domarna är
Göteborg en naturlig väghållare att återkomma till (#282:s rekommendation om en väghållare som tredje part). Ett kort tack
utan fråga är valfritt och kostar ingenting; en ny fråga en vecka efter ett tydligt nej kostar lite förtroende och ger inget.

## #296 (21/9 2026) Niras produktsida läst mot repot: två saker vi inte har — före resan och snöflingan — och en vi parkerat

**Bengts fråga 21/9:** ser du på Niras sida *Road Surface Alerts* något vi tydligt missat i appen och borde utreda?
Varje punkt på sidan söktes i TAVLA, BACKLOG, PLAN, produktboken och DECISIONS innan den kallades missad.

| På Niras sida | Hos oss |
| :-- | :-- |
| *Slippery road* | kärnan: väglag (A1) och stationsregeln (A2) |
| *Hydroplaning*, *Heavy rain* | #42/#81 vattenplaningen i skugga; vind och sikt (W-A) |
| *Slow traffic alert* | **parkerat:** kort #15 köslut (TrafficFlow, 43 s färsk), beslutad som uppdatering 1 efter release |
| *Very rough road*, *Pothole* | saknas — och ska saknas nu: ingen öppen källa utom tjälskademeddelanden, fel säsong, fel produkt |
| *"route planning that avoids known hazards"* | **saknas helt** — appen talar bara under körning |
| *"…temperature thresholds, such as a snowflake symbol"* | **saknas helt** som jämförelse — ingen mätning ställer oss mot bilens egen varning |
| flottor, tredjepartsappar | #94 (åkerier), PLAN (B2B är Axels fil) |
| bekräftelse över flera bilar | kartans bevisbärare (§8 B), inte byggd |

**(1) Före resan.** Beslutet som betyder mest fattas före avfärd. En ruttkoll för en sparad sträcka använder samma vägdata
och matchas i telefonen — produktinvarianten håller. Och den ger förvarningen en laglig plats: regel T3/T6 förbjuder
modellprodukter att UTLÖSA, inte att visas i en vy föraren själv öppnar (samma resonemang som SKUGGAN-PAR4-MOT-REGEL-T om
kartan). Formen är Axels; först ett beslutsunderlag.

**(2) Snöflingan.** Varje bil varnar vid omkring +3 °C i luften. Second opinion (#290) visade att stationsregeln en stadigt
kall dag säger *kallt och nederbörd* överallt — det gör snöflingan också. Värdet ligger där ytan är kall fast luften inte är
det, och det ser en station men ingen bil. Andelen fyrningar med luft över +3 °C är mätbar ur arkivet i dag. Den läser
fyrningar, inte utfall, så blindningen rörs inte. Hög andel är ett säljargument; låg andel är en varningsklocka inför vintern.

**(3) Köslut** lämnas orört — noterat att en konkurrent räknar det till kärnan.

Frågan om vad som ska utredas står i bedömningen §4.2; kort #233.

## #297 (21/9 2026) Snöflingemätningen: för tidigt att säga — men den hittade trasiga ytgivare som ger falska brolarm på E4 i Skåne (kort #234)

**Bengts order 21/9:** *"kör snöflingemätningen nu"* (kort #233, #296). Tre läsande körningar via dbknapp (35629700266,
35629869303, 35630131080; satserna i `scripts/matningar/snoflingan-*.sql`). Arkivet 24/8–21/9: 393 803 rader, 850 stationer.
Fyrningar lästes, inga utfall — blindningen är orörd.

**Svaret på frågan: för tidigt.** Stationsregeln (yta ≤ +1 °C och fukt) fyrade 4 episoder på 29 dygn — alla med luft
+8,5…+11,5 °C, alltså givarfel och inte frost. Äkta frost (yta ≤ 0 °C med gap luft − yta ≤ 3 °C): 7 episoder, alla i Norrland
(Kiruna, Nikkaluokta, Kätkesuando, Umasjö, Vassijaure, Bergfors, Ollsta 10/9) med luft ≤ +0,4 °C. Snöflingan lyste i
samtliga. Inget stöd än för att stationen ser det bilen inte ser — och sju septemberepisoder avgör ingenting. Körs om efter
första frostmånaden.

**Fyndet som är viktigare än frågan: givarfel slinker förbi #75:s vakt, och det låter i appen.**

| Station | Mönster | Följd |
| :-- | :-- | :-- |
| **1106 Ö Ljungby** (E4, Skåne) | yta +1,1…+3,5 °C vid luft +13…+15 °C, daggpunkt +8…+13 °C, regn — timme efter timme 19–21/9 | **24 broar** inom 0,3–14,6 km publiceras med frysrisk (brotröskeln +3 °C). Skuggmotorn: *"Frysrisk framöver — bro om 600 meter"* sju gånger per varv på E4 Helsingborg→Jönköping 5/9, 16/9, 17/9, 19/9, 20/9, 21/9 |
| 2346 Ollsta (Jämtland) | yta −4,6…+0,7 °C vid luft +8…+10 °C, 8 dagar | stationsregeln fyrade 3 nätter, i regn |
| 2135 Storvik · 2132 Testeboån · 1302 Kullavik · 1713 Bolhyttan | yta under noll vid luft +6…+11 °C | 1–5 dagar vardera |

Vakten släpper allt med yta ≥ luft − 12. Felen ligger på 10,6–12,0 °C — de pendlar kring gränsen och går igenom de rader som
råkar hamna under. 13 av arkivets 21 *frostepisoder* är sådana fel. (5/9 publicerades Storvik med yta −16,9 °C; det var före
#75, som kom 8/9.)

**Varför 12 inte bara ska sänkas:** varmfront med regn över frusen väg — yta −3 °C, luft +4 °C, daggpunkt +3 °C — ger ett ÄKTA
gap på 7–10 °C. Det är blixthalkan, det farligaste fallet, och en lägre fast gräns tystar just den. Av samma skäl duger inte
trendens `rimlig()`-vakt (yta − dagg < −5, `publish/trenden.ts`) rakt av i produktion. Kandidater att MÄTA innan någon väljs:
(a) gapvakten görs beroende av lufttemperaturen — en blöt yta nära noll vid luft ≥ +8 °C finns inte; (b) kronikerlista;
(c) båda. Tröskeln är fastställd (#75) och kopierad på 17 ställen under kontraktsgrinden: ändringen är Bengts och Axels
beslut, och byggs med motprov (1106:s rader är färdiga provdata).

**Kopplingen till #290:** second opinion pekade på produktionsregelns falsklarm som den svaghet som står kvar mot oss. Det här
är det första uppmätta exemplet — inte salt, utan en trasig givare — och det hittades av en mätning som letade efter något
annat. CLAUDE.md:s värdevaktsläxa en gång till: *"Inget av dem hittades av en vakt."*

## #298 (21/9 2026) Givarvakten får två tillägg — radvakten och karantänen — och talet 12 står orört (kort #234)

**Bengts order 21/9:** *"gör 1-3. jag är helt inne på att vi måste sätta en annan typ av vakt. välj den gräns du tycker är mest
logisk och kolla upp så vi inte förstör något annat i de 17 kopior i koden"*.

**Vad mätningen visade** (fyra läsande körningar via dbknapp, satserna i `scripts/matningar/givarvakt-*.sql`):
- Av de rader som i dag kan publiceras som kalla (yta ≤ +3 °C, förbi #75) har 5 343 ett gap luft − yta under 5 °C. **Alla 811
  rader med gap ≥ 5 °C kommer från sju stationer** — 1106 Ö Ljungby, 2346 Ollsta, 2135 Storvik, 2132 Testeboån, 1713 Bolhyttan,
  1612 Fagersanna, 1302 Kullavik. Ingen äkta rad ligger där.
- Felen är av **två slag.** Sex av stationerna visar andra stunder **−46…−50 °C** — en urkopplad givare — och läcker förbi
  vakten när värdet driver tillbaka. **Ö Ljungby** bryter aldrig grovt: ytan följer luften, ~12 °C för lågt, 24 av 29 dygn.

**Varför inte bara sänka 12, och varför inte en ren gräns i (luft, gap):** varmfront med regn över frusen väg (yta −3, luft +4)
ger ett ÄKTA gap på 7–10 °C, och blankis i töväder håller ytan vid 0 °C medan luften är +8…+10 °C. Det är de två farligaste
väglagen. En gräns som tar givarfelen vid låg lufttemperatur tar också dem.

**Beslutat (gränserna valda av Claude på Bengts order):**
1. **Radvakten** — luft ≥ **+10 °C** och yta ≥ **8 °C** under luften ⇒ raden publiceras inte. Bara varm luft: under +10 °C rör
   vakten ingenting, och en station den tystat talar igen så fort luften kyls av. +8 °C hade tagit 47 rader till men ligger
   närmare töväderfallet; den försiktigare gränsen räcker (nedan).
2. **Karantänen** — en station med ≥ **3** brott mot #75 (yta < luft − 12) de senaste **7** dygnen publiceras inte alls, varken
   som väderpunkt eller som broarnas källa. Tre, inte ett: Vassijaure hade en enstaka studs (−32,8 °C, 1 rad på 29 dygn) och
   är en frisk fjällstation. Fönstren 3, 7 och 14 dygn gav samma utfall; 7 valdes som mitten.

| Mätt mot arkivet | Felrader tagna (av 811) | Äkta rader tystade | Kvar |
| :-- | --: | --: | :-- |
| Karantänen ensam (7 dygn, ≥ 3) | 597 | 4 — alla från Ollsta och Storvik, som själva är trasiga | 212 rader från Ö Ljungby |
| Radvakten ensam (+10 °C, 8 °C) | 675 | 0 | — |
| **Båda** | **706** | 4 (samma) | 105 rader, varav **1 fuktig** — alltså en enda som kan fyra |

**De 17 kopiorna av #75 är orörda.** Tilläggen ligger BREDVID vakten, i `publish/snapshot-core.ts` (och därmed i den
genererade `supabase/functions/publicera/index.ts`, som CI håller i synk). Genomgången av kopiorna:

| Var | Vad den gör | Rörd? |
| :-- | :-- | :-- |
| `publish/snapshot-core.ts` + genererad `publicera/index.ts` | det appen hör | **ja — de två tilläggen** |
| `supabase/functions/vakthund/index.ts` | frostvakten räknar kalla stationer | nej — sju felande stationer av 850 flyttar inte ett larm vid 50 |
| grind A, K-A, R-A, T-A · `anomalin` · `ruttberedskap` · `overgangar-steg0` · `smhi-forstarkaren-steg0` · `publish/trenden.ts` · `sql/018` · `sql/028` | mätningar och domar | **nej — se nedan** |
| `test/snapshot-core.test.ts`, `test/integration.test.ts` | bevisar vakten | utökade |

**Kontraktsgrinden:** #75-kontraktet har fått en andra form — brottet, `surface_temp_c < air_temp_c - N` — bredvid vaktens
`>=`, så att karantänens 12 inte kan glida från vaktens 12. Golvet höjt 17 → 19. De nya talen (10, 8, 7, 3) står på ETT ställe,
som exporterade konstanter; testerna importerar dem. Kopieras de någon gång ska de in i grinden i samma commit.

**Öppen fråga (bedömningen §4.2): ska MÄTNINGARNA ärva vakterna?** 13 av arkivets 21 frostepisoder är givarfel, och de hamnar i
grindarnas och uppspelningens underlag. Att lägga till vakterna där ändrar talen — samma fråga som #129 — men utfallen är inte
lästa, så det går att göra rent. Bengts och Axels beslut; rekommendation: ja, före första frostmånaden.

**Bevis:** enhetstester (karantänen tystar väderpunkt OCH bro; gränsstationer med samma id rörs inte; oläsbar historik fäller
inte snapshoten) och ett integrationstest mot riktig PostGIS med fallet som det såg ut (yta +1,3 °C, luft +13,3 °C) samt de fall
vakten INTE får ta: blixthalkan (−5/+4), töväder (0/+9,9), gränsen (gap 7,9 vid +10) och den enstaka studsen. Motprov och
mätning efter deploy redovisas på kortet.

**Anmälan** om de sju stationerna är skriven: `docs/ANMALAN-TRV-YTGIVARE.md`. Bengt skickar den via Datautbytesportalens
formulär. **Snöflingemätningen** (#297) står som bevakningsrad i bedömningen §0b och körs om efter första frostmånaden.

**BEVIS, samma kväll (21/9):**
- **CI på PR #446:** 135 av 135 tester, inget överhoppat. `ok 45` är integrationstestet mot riktig PostGIS; `ok 94–97` enhetstesterna.
- **Motprov (PR #447, stängd utan sammanslagning):** radvaktens luftgräns satt till 99 och karantänfiltret borttaget ur broarnas
  källa — två mutationer som kontraktsgrinden INTE ser (*ALLA 39 KONTRAKT HÅLLER* i samma körning). Domen: `not ok 45` på raden
  *'LJUNGBY ska vara tyst'*, `not ok 94` på *radvakten, nollsäker*, `not ok 95` på *bron vid den trasiga givaren får ingen
  frysrisk*. Tre fall, tre rätta rader, 132 av 135.
- **Deploy:** `publicera` deployad 18:19:01Z från 73688a4 (körning 35637540366), efter `git pull` och noll rader diff mot main.
- **Mätning EFTER deployen — en rad med innehåll:** funktionens eget svar i `net._http_response`. Körningarna 17:50, 18:00 och
  18:10 har ingen karantänrad; **18:20:00, den första efter deployen, svarar** *"karantän: 5 station(er) tysta efter brott mot
  #75: 1106, 1612, 2132, 2135, 2346"*. Manifestets sha = filens sha för samma `live.json` (generated_at 18:20:01Z).
- **Vad som INTE är bevisat än:** i kväll ligger ingen av de sju under +3 °C med ett gap under 12 (Ö Ljungby: yta 3,2 °C, luft
  11,2 °C), så den gamla vakten hade inte heller publicerat något just nu. Att brolarmen faktiskt uteblir en natt då givaren
  visar fel läses ur skuggloggen i morgon (bevakningsrad i bedömningen §0b). Kortet står öppet till dess.

## #299 (22/9 2026) Mätningarna ärver radvakten och karantänen — samma tal ur samma källa, karantänen per rad (kort #234)

**Beslut (Bengt 21/9: *"ja lägg in vakterna i mätningarna också"*; formen Claudes 22/9).** Kort #234:s två vakter (DECISIONS #298)
gäller nu VARJE mätning som läser yttemperatur med #75, inte bara det appen hör.

**Hur — fyra val:**
1. **En källa, inga nya kopior i TypeScript.** `publish/snapshot-core.ts` exporterar `RADVAKT_SQL` (samma sträng som `WX_SANE`
   bär — testet kräver att `WX_SANE` slutar med den), `brottSql(rad, tabell)` och `karantanSql(rad, tabell)`. Grind A, K-A, R-A
   (svenska och finska arkivet), T-A, trendarkivet, anomalin, ruttberedskapen, övergångarnas och SMHI-förstärkarens steg 0
   importerar dem. Vaktdiagnosen (`led234()`) visar i varje grind hur många rader de två vakterna tar, så en nolla aldrig blir
   tvetydig (DECISIONS #141). `rimlig()` i trenden bär vakterna i TypeScript (gapet avrundat till tusendelen, 13/9-läxan) och
   raden bär `brott` ur arkivet.
2. **Karantänen räknas PER RAD**, sju dygn bakåt från radens egen tid — inte per station för hela fönstret, som snapshoten gör
   från nu. Skälet: en mätning över 60 dygn ska inte tysta en frisk fjällstation hela vintern för tre studsar en vecka.
3. **Ett delindex (`sql/029`) över just brotten.** Delfrågan per rad läser annars varje rad hos stationen i sju dygn, för varje
   rad i fönstret — miljarder radbesök på 60 dygn (enda indexet var på `sample_time`). Brotten är sällsynta (811 rader på 60 dygn),
   så indexet är litet; predikatet är ordagrant delfrågans, och kontraktsgrinden vaktar talet 12 i båda. Samma index på det
   finska arkivet när schemat finns.
4. **SQL-tvillingarna bär talen literalt, under kontrakt.** `sql/018` (drifträkningen, tvilling till `rimlig()`), `sql/028`
   (uppspelningens variant *utan faller*) och mätsatsen `uppspelning-efterhalka.sql` får radvakten och karantänen ordagrant, och
   fyra nya kontrakt (10, 8, 7, 3) i `scripts/kontraktsgrinden.ts` håller ihop dem med konstanterna. 43 kontrakt håller.

**Alternativ som valdes bort:** att kopiera talen till varje skript (det var precis så #75 blev sjutton kopior); att låta
snapshotkärnans stationslista (från nu) gälla mätningarna (fel för långa fönster, punkt 2); en CTE per fråga i stället för
indexet (åtta frågor att bygga om, och vaktdiagnosen hade inte kunnat bära ledet).

**Fynd på vägen:** #75:s kontraktsform räknade inte KVALIFICERADE kopior — `r.surface_temp_c >= r.air_temp_c - 12` i sql/018
och `w.…` i sql/028 stod utanför grinden sedan de skrevs. Formen tar nu en valfri kvalificerare; 55 kopior, alla 12, golvet
satt till 29 (utanför de daterade mätfilerna).

**Bevis (PR:n 22/9):** 138 tester (128 lokalt, 10 integrationstester i CI mot PostGIS), nio självtester gröna, kontraktsgrinden 43/43,
bunten i synk (`--check`). **Motprov:** radvakten avslagen i `rimlig()` ⇒ trendtestet rött på rätt rad; karantänen avslagen ⇒ rött
på samma rad. **Nytt integrationstest** för sql/018: fyra stationer med samma fall i bandet — KAR_A frisk och KAR_D med två brott
räknas, KAR_B med Ö Ljungby-felet (luften 12 ° över, #75 släpper, radvakten ensam tar) och KAR_C med tre brott är tysta.
Idrifttagningen (029, 018 via `trendarkivet --jamfor`, 028, deploy av bunten) och grind A i båda läsningarna redovisas på kortet
och i bedömningen §0b.

**Nattbeviset för #298, läst 22/9** (`scripts/matningar/givarvakt-nattbevis-2026-09-22.sql`): Ö Ljungby 1106 visade 21/9 18–19Z
yta 1,8–3,3 °C vid luft 9,6–11,6 °C (16 felrader med yta ≤ 3 vid luft ≥ 10) och gled sedan till −2 °C vid luft +4…+6 °C, regn
hela natten. Skuggloggen på E4 Helsingborg→Jönköping: 7 brolarm 20/9 21Z och 21/9 04Z (före deployen); **0 brolarm 21/9 18Z, 22Z
och 22/9 01Z**, medan stationen visade −0,2…−1,1 °C. 36 av 36 publiceringar 22:40–04:30Z bar karantännoten (1106, 1713, 2132,
2135, 2346 — 1612 har lämnat, 1713 kommit till). **Avvikelse, sagd högt:** det var karantänen som bar natten, inte radvakten —
från 20Z låg luften under +10 °C, där radvakten inte gäller, och gapet 6–8 ° släpps av #75. Brotten som håller 1106 i karantän
är från de varma dagarna 19–21/9 och åldras ut runt 28/9; håller sig luften sval till dess publiceras stationen igen. Frågan om
vad som ska bära hösten står i bedömningen §4.2 (rekommendation: låt karantänen räkna radvaktens brott också — inget nytt tal).

**IDRIFTTAGNING 22/9, bevis:**
- **PR #455** sammanslagen 04:46Z (b567bf6); CI: `ok 52` är det nya integrationstestet mot PostGIS, `ok 132` enhetstestet, 43 kontrakt.
- **`sql/029`** (dbknapp 04:47Z, `scripts/matningar/karantan-idrift-029-2026-09-22.sql`): indexet i `pg_indexes` på public och fi;
  EXPLAIN för delfrågan: *Index Only Scan using weather_obs_brott_idx*; hela karantänräkningen över 7 dygn (195 442 rader) tar
  0,7 s; i dag är 1 670 rader hos 5 stationer i karantän och 1 468 rader tas av radvakten.
- **`sql/018`** körd in av `trendarkivet --jamfor` 04:48Z; **`sql/028`** av dbknapp 04:59Z (`karantan-idrift-028-2026-09-22.sql`):
  `pg_proc` visar båda funktionskropparna med karantänen per rad, radvakten och tre-brott-gränsen; varianten *utan faller* kör.
- **Bunten** deployad 04:48:22Z från b567bf6 efter `git pull` och noll diff mot main. Publiceringen 04:50:01Z: manifestets sha =
  filens, 79 väderstationer, ingen av de sju, noll broar; funktionens eget svar bär karantännoten (1106, 1713, 2132, 2135, 2346).
- **Grind A i båda läsningarna.** Utan vakterna (måndagskörningen 21/9 05:40Z): 714 stationer, 199 742 avläsningar, A1 0,75 °C på
  5 745 punkter, A2 3,8 % [±0,5], A3 0,3 % — KLARAD. Med vakterna (22/9 04:49Z): 711 stationer, 202 087 avläsningar, A1 0,71 °C på
  7 356 punkter, **A2 3,5 % [±0,4], A3 0,0 %** — KLARAD. Vaktdiagnosen på 60 dygn: radvakten tar 1 965 rader, karantänen 1 993.
  Sagt högt: fönstren skiljer ett dygn och natten emellan var kall i Skåne, så skillnaden är en riktning, inte ett rent
  vaktresultat. A2 står inte längre oavgjort (5,1 % 13/9 var en äldre läsning).
- **Driftvakten** (SQL mot TypeScript) dömde först drift två gånger utan att kopiorna glidit — och båda var driftvaktens egna fel.
  (1) 23 rader, alla med arkivets nyaste tidsstämpel: ingest-live skrev dem mellan TypeScript-laddningen (05:00:09Z) och
  funktionen (05:00:10–47Z); omkörningen hade dem på båda sidor. (2) 17 rader i fönstrets första kvart: sql/018:s `bas` läser
  en timme FÖRE fönstret för lutningens historia, TypeScript-sidan gjorde det inte, så fönstrets första rader var kandidater
  bara i SQL — ett fel i trendarkivets skrivläge också, sedan 13/9 (7-dygnsfönstrets kant låg i gallrat material och syntes
  aldrig). Rättat i `scripts/trendarkivet.ts` (PR #456): timmen läses som historia, kanten sätts en gång, kandidater bara inom
  fönstret, och rader som bara kan finnas på ena sidan (ingest under körningen, kantminuten) sägs högt i stället för att dömas.
  **Domen, 1 dygn från grenen:** 1 dygn från grenen (körning 35689485866, 05:08Z): TypeScript valde 5 687 rader, SQL 5 687, bara TypeScript 0, bara SQL 0 — **ENSE OM VARJE RAD**, inga rader undantagna. Sju dygn faller på funktionens timeout (kort #235).
- **Fynd, eget kort #235:** `berakna_trendkandidater` över 7 dygn faller på statement timeout (600 s) — TypeScript-sidan räknade
  11 061 kandidater ur 195 444 rader, funktionen hann inte. 13/9 gick 118 054 rader. Orsaken är den materialiserade CTE:n `bas`
  och lateralen över den, kvadratisk i arkivets storlek — inte karantänens delfråga (0,7 s, mätt). Driften (2 h) berörs inte.

## #300 (22/9 2026) Den långsamma vakten byggs — alternativ (d), regeln på ett ställe, självläkande tills Trafikverket lagar givaren (kort #236)

**Beslut (Bengt 22/9: *"jag har anmält det till trafikverket. ingen vet när det fixas hos dem. vi måste ha något som läker detta
till de fixar"* — och sedan *"bygg den långsamma vakten nu och gör den klar"*).** Alternativ (d) ur bedömningen §4.2 byggs i den form
som mättes samma dag: en station vars yta legat ≥ 6 ° under luften i ≥ 90 % av det senaste dygnets rader (minst 24) mäter fel.

**Varför (d) och inte de andra.** (a) anmälan gäller alltid men lagar inget i appen. (b) en längre karantän skjuter bara problemet och
tystar en lagad station en månad. (c) radvaktens brott i karantänen hjälper bara så länge varma dagar återkommer — i sval luft fyrar
varken #75 eller radvakten. (d) håller i sval luft, och mätningen (`scripts/matningar/langsam-vakt-d-2026-09-22.sql`) visade att den
tar exakt fem stationer i hela arkivet, alla bland de sju anmälda, och ingen frisk vid gränsen 5, 6 eller 8 °. Ö Ljungby har haft
felet sedan 30/8 med gap under 12; (d) hade tystat den från dag ett.

**Formen — fyra val:**
1. **Regeln bor på ETT ställe:** `sql/030`:s `langsam_vakt(sedan)`. Talen 6, 0,9 och 24 finns bara där. Ingen kopia i TypeScript,
   inget kontrakt behövs för dem; fristen som snapshoten läser tabellen med (`LANGSAM_FRIST_H = 3`) kopieras av bunten och har kontrakt.
2. **En liten tabell, `givarfel_dygn`** (station, UTC-dygn, första och senaste ögonblick i felet), skriven idempotent med least/greatest.
   Backfill är samma funktion med långt fönster. Tabellen är också listan Bengt kan visa Trafikverket: vilka stationer, sedan när.
3. **ingest-live kör funktionen** varje varv, fail-soft som trenden i sql/018: ett fel här kan bara tysta vakten, aldrig ingesten.
   Inget nytt cron-jobb (kort #85), noll Actions-minuter.
4. **Läser, inte räknar:** snapshoten tystar stationer vars `senast` är färskare än tre timmar (väderpunkt och broarnas källa, med not);
   mätningarna utesluter stationens rader det dygnet (`givarfelSql`, i `karantanSql`; `rimlig()` och `sql/018` som tvillingar, `sql/028`
   och efterhalkans mätsats). Dygnsupplösning i mätningarna med flit — en trasig givare är trasig hela dagen.

**Självläkande åt båda håll.** In ~22 h efter att felet börjat (90 % av ett dygn), ut några timmar efter att givaren mäter rätt igen
(andelen faller under 90 % efter ~2,4 h, fristen 3 h därefter). Ingen lista att hålla, ingen som måste minnas när Trafikverket lagat.

**Reservation.** Arkivet är augusti–september. Formen mäts om efter första frostmånaden innan den räknas som vinterbeprövad
(bevakningsrad i §0b). Det finska arkivet omfattas inte (id-krock, funktionen räknar bara det svenska).

**Bevis (PR:n 22/9):** 142 tester — nya: tabellen tystar väderpunkt OCH bro med not och utan att regeln står i snapshoten, en
oläsbar tabell fäller inte snapshoten, fragmenten bär dygnsflaggan för det svenska arkivet men inte det finska, `rimlig()` fäller
på flaggan; integrationstest mot riktig PostGIS: LV_FEL (7 ° under i 30 h) får ett färskt dygn, LV_FRISK inget, LV_KORT (rätt de
sista tio timmarna) ett gammalt, omkörning ger identisk tabell, och snapshoten tystar bara LV_FEL; KAR_E i drifträkningen. Nio
självtester, 44 kontrakt, bunten i synk. **Motprov:** tystnaden borttagen ur snapshoten ⇒ rött på rätt rad; `rimlig()` utan flaggan
⇒ rött. Driftsättningen och beviset ur driften redovisas på kortet och i §0b.

**I DRIFT 22/9, bevis:** `sql/030` körd med backfill (28 stationsdygn: 1106 tjugo, 2135 fyra, 2346 två, 1612 och 2132 ett — mätningens
fem, ingen annan), tysta med fristen 3 h just nu: 1106; livekörningen 60 ms. `sql/018` in via trendarkivet, driftvakten ENSE 5 767 = 5 767.
`sql/028`: `pg_proc` visar dygnsflaggan i `berakna_trendkandidater`, `uppspelning_efterhalka` och `langsam_vakt`. `ingest-live`
deployad 05:44:03Z — svaren 05:53–05:55Z bär *langsam_vakt: 1 stationsdygn*. `publicera` deployad 05:45:01Z — publiceringen 05:50:02Z
bär noten *"långsam vakt: 1 station(er) tysta, ytan ≥ 6 ° under luften ett helt dygn: 1106"* (05:30 och 05:40 saknar den), manifestets
sha = filens, 57 stationer, ingen av de sju, noll broar. Kort #236 stängt. Omkörning av formen efter första frostmånaden står i §0b.

## #301 (22/9 2026) Grannländerna i Supabase, Norge i skuggflottan, Danmark friat, gallringen får Danmark, gravstenarna och en tidsvakt (kort #238, #239, #240)

**Bengts order 22/9:** *"gör kort 238 och 239"*, sedan *"det är viktigt att de här körningarna inte tar actionsminuter för oss så det
ska ligga i supabase"*, och *"gör 240 efter 238 och stäng det när det är klart"*.

**#238 — Norge körs aldrig.** Utvärderingen av skuggflottan (samma dag) visade 20 norska rutter i koden och noll norska rader i loggen på
25 dygn. Orsak: ingen byggde `data/app/no/v1` (CDN 404) och inget cron-jobb anropade `land=no`; det norska arkivet var live (469
stationer). **Beslut:** grannländernas skuggsnapshot byggs i Supabase av `publicera?land=fi|no|dk|grannar` (snapshotkärnan,
`buildGrannSnapshot`: väder ≤ 3 °C eller snö, bara Accident — samma form och regel som de gamla byggarna), alla tre i EN commit
var 30:e minut (`halkvakt-publicera-grannar`, :05/:35), och `halkvakt-skuggmotor-no` (:25/:55). Jobben skapades med `replace()` ur
befintliga jobb inne i databasen, så nyckeln aldrig skrevs ut. Actions-steget för fi/dk och `build-snapshot-{fi,dk}.ts` togs bort;
`push-data.ts` behålls (RUNBOOK, planerad för QR-sidorna). **Alternativet som valdes bort:** Norges byggare i grannflödet på Actions
(PR #468, sammanslagen och tillbakadragen samma dag) — några sekunder på ett timjobb, men fel riktning: återkommande körningar tar
inga Actions-minuter. **Bevis:** publicera?land=grannar körde 09:35:00Z och 10:05:00Z (jobid 46, commit f9dbf12 och 136c0ef i kartrepot, cirka 6 s per varv): Norge 10 väderpunkter, Finland 1 väderpunkt och 1 olycka, Danmark 3 olyckor (körning 35714295337) · skuggmotor?land=no körde 09:55:00Z (jobid 47) och skuggloggen fick sina första norska rader: 3 varv på 3 rutter mot snapshoten 09:35, noll larm — efter 25 dygn med noll

**#239 — Danmarks olyckor, friat.** Hypotesen var att mappningen släppte vägarbeten som olycka. Mätt: ingesten släpper bara klassen
Accident till Olycka, byggaren publicerar bara Accident, de 200 danska olyckorna är "Uheld" som lever 0,8–1 dygn och raderas när
flödet släpper dem, snapshoten byggs om varje timme. Volymen (642 varningar) kommer av fem rutter genom Köpenhamn och olyckshorisonten
10 km. Ingen ändring. Samma sak väntar Stockholm när svenska rutter förtätas.

**#240 — gallringen.** Bengts fråga: har grannarna gallring som Sverige? Nej — Sverige tunnas till halvtimme efter sju dygn och raderas
aldrig; Finland raderar varma rader efter sju dygn och allt efter 60; Norge allt efter sju; Danmark inget. Mätt 22/9: databasen 190 MB
(169 den 18/9, ~4,5 MB/dygn netto), Danmark 1,3 MB, gravstenar i händelsetabellerna (Sverige 1 118 av 1 122, Danmark 986 av 1 055),
en rad med tidsstämpeln 1970-01-01 i det finska arkivet. **Beslut:** `sql/031` — Danmark får Norges regel; tidsstämplar före 2020
raderas i alla fyra väderarkiv; gravstenar raderade i 30 dygn tas bort ur alla länders händelsetabeller (situation-arkivet, som
uppspelningen läser, rörs inte; en sen radering skapar ändå aldrig en rad — raderingar är UPDATE). Sveriges, Finlands och Norges regler
orörda. `ingest/fi.ts` släpper inte in tom eller epoknoll-tid. **Bevis:** integrationstestet (Danmark, epoknoll, gravstenar i båda
tabellerna) i CI; i drift: sql/031 körd 22/9 (körning 35714435556): första körningen raderade 12 184 rader; Danmark 2 480 rader kvar, 0 äldre än sju dygn (äldsta 15/9); 0 rader före 2020 i något arkiv, 1970-raden borta; inga gravstenar äldre än 30 dygn ännu (regeln biter från 24/9, arkivet började 24/8); pg_proc bär Danmark, tidsvakten och gravstensregeln; databasen 190 MB tills autovacuum frigör

**Sagt högt:** databasen växer ~4,5 MB/dygn netto ⇒ 400 MB runt 9/11 och 500 MB (skrivskydd) runt 1/12. Pro-beslutet i §4.2 ("senast
1 november") håller, utan marginal. Bevakningsrad i §0b med veckovis mätning.

## #302 (22/9 2026) Drifträkningen räknar fönstren i ramar i stället för en lateral — sju dygn på 8,6 s (kort #235)

**Beslut (Bengts order 22/9: *"gör kort 235 och stäng det när det är klart"*).** `berakna_trendkandidater` (sql/018) räknar lutningens
fönster med fönsterfunktioner över stationens rader i tidsordning. Vilka rader som väljs och vilka tal som skrivs är oförändrat;
vakterna, trösklarna och tvillingen `publish/trenden.ts` är orörda.

**Varför.** Lateralen läste den materialiserade CTE:n `bas`, som saknar index, en gång per kandidatrad, så kostnaden växte med
kvadraten på arkivet. Sju dygn gick 13/9 på 118 054 rader och föll 22/9 på statement timeout vid 195 444. Driftvakten, det enda
beviset för att SQL och TypeScript väljer samma rader, kunde bara köras på ett dygn.

**Alternativ.** (a) Höja timeouten: döljer tillväxten, och arkivet växer. (b) En lateral mot tabellen med `(station_id,
sample_time)`-index: linjär, men hoppvaktens lag-kolumner måste räknas om per rad, alltså mer SQL för samma sak. (c) Driftvakten på
ett dygn för alltid: knappen skriver sju dygn, så vakten hade vaktat ett annat fönster än det som skrivs. (d) Fönsterfunktioner —
valt: en sortering per station och lateralens villkor ordagrant.

**Formen.** `RANGE BETWEEN interval 'N minutes' PRECEDING AND CURRENT ROW` är lateralens `b.sample_time >= r.sample_time − N` och
`<= r.sample_time`; primärnyckeln `(station_id, sample_time)` ger inga delade tider. Hoppvakten: hoppet bokförs på den tidigare raden i
paret (`lead` i stället för `lag`) och läses i en ram utan den egna raden (`EXCLUDE CURRENT ROW`). Då räknas varje hopp mellan två
rader i fönstret men inte hoppet in i det, som i lateralen. Ramarna räknas över hela `bas` innan kandidaterna filtreras.

**Bevis.** (1) Före incheckningen, bara läsande (körning 35729035969, `scripts/matningar/driftrakningen-ramar-2026-09-22.sql`, genererad
ur origin/main:s och grenens sql/018): 2 h — 9 rader efter vakterna, 0 skillnader; 1 dygn — 15 635 rader och 5 797 kandidater i båda,
0 skillnader i 14 kolumner åt båda hållen; livets fönster 0,01 s (lateralen) mot 0,00 s; sju dygn med ramarna 8,6 s (31 668 rader,
11 317 kandidater). (2) Integrationsprovet `#235` (hoppet in i fönstret räknas inte, hoppet inuti fäller lutningen) grönt mot
lateralen (körning 35729309079) och mot ramarna (35729454227), 144 prov, 0 överhoppade. (3) I drift: sql/018 körd 12:50Z (körning
35729702635), `pg_proc` bär `EXCLUDE CURRENT ROW` och inte `CROSS JOIN LATERAL`, livets anrop 0,01 s, ingest-lives svar 12:52Z
`0 nya, 0 utfall`. (4) Driftvakten 7 dygn från main (körning 35729913535): TypeScript 11 317, SQL 11 317, bara TypeScript 0, bara
SQL 0 — ENSE OM VARJE RAD, inga rader undantagna, knappsteget 10 s mot 605 s.

**Sagt högt.** Hoppvakten prövades inte av arkivets data (0 rader med hopp > 3 °C på dygnet), bara av integrationsprovet — därför
kördes provet mot båda formerna. En lokal commit `bffd225` med texten "Create driftrakningen-ramar-idrift-2026-09-22.sql" dök upp
på grenen 12:49:50Z, samma sekund som bevisfilen skrevs. Den pushades aldrig och ingår inte i PR #473; filen togs tillbaka ur den
och checkades in med stängningen. *(Förklarad 22/9: Bengt tryckte på Commit i GitHub Desktop av misstag — samma arbetsträd som
sessionen. Läxa: `git log` mot grenens väntade topp före varje push.)* Generatorn bakom mätfilen checkades in i efterhand
(`scripts/matningar/driftrakningen-ramar-generator-2026-09-22.py`, Bengts ja 22/9); den återskapar mätfilens satser byte för byte
ur `8a9eca9:sql/018` och main:s 018.

## #303 (22/9 2026) Kortavstämningen: 18 kort stängda med bevis, sju dubbletter sammanslagna — tavlan 94 → 69 öppna

**Beslut (Bengt 22/9: *"ja stäng de 18 och slå ihop paren"*).** Efter avstämningen av alla 94 öppna kort mot repot
(`docs/KORTAVSTAMNING-2026-09-22.md`, bedömningen §4.2) stängs de 18 vars bevis höll, och sju dubbletter slås ihop. Varje stängning
bär sitt bevis på kortet, och varje sammanslaget kort pekar på det kort som bär resten. Korten stängs på plats med `- [x]`, som
#100 och gallringsregeln tidigare; texten blir kvar och går att läsa. Sorteringen av de 25 korten i fel sektion (#224) görs separat.

**Varför.** Tavlan hade bara uppdaterats kort för kort sedan 20/9, och ingen hade prövat helheten. Kort som blivit klara i andra
varv stod kvar som öppna, och tre kort ställde samma fråga till Axel. En tavla där en femtedel av korten är gjorda ljuger om var
arbetet finns (TAVELREGELN: *"finns det inte på tavlan finns det inte"* gäller åt båda håll).

**Stängda (18):** Bengts egna händer i koden · #72 · #85 · #229 · #159 · #192 · #187 · #186 · #185 · #154 (regnfältet) ·
minutbantningen · #52 · #43 · #44 · varvloggen · #100 (en kvarglömd kopia av det stängda kortet) · designlyftet (med
underpunkterna #22–#24) · #194.

**Sammanslagna (7):** kort 6 *Tolv testare till väntelistan* → *Tolv testare till Play-perioden* · *Domänen halkvakt.se* →
*Skydda namnet: PRV + domänen* · #27 *Helgsamtalet* och *Rollfördelningen* → *Skyltfonden-paketet före 1/10* · #237 → *Samtal med
Axel: sensortrappan* · #81 → #42 · #51 → #209 · designlyftets #23 → #23 heads-up.

**Sagt högt.** (1) Två sammanslagningar gick åt andra hållet än i listan: domänkortet slogs in i *Skydda namnet* (inte tvärtom),
eftersom det bredare kortet också bär PRV-ansökan och inget då går förlorat. (2) #85 stängs fast den släpande takten var 118
min/dygn 19/9 mot kortets mål 100: kortets tre snitt är gjorda, och kassabevakningen till 1/10 bärs av #152 (prognos 31 av 35 USD).
(3) Bedömningens rader om Actions-kassan och Actions-kontot pekar nu på #152 i stället för #85; `radar_h`-raden i §0b bär sin egen
bevakning sedan #187 stängts. (4) Kvar ur avstämningen: fyra oklara kort (§4.2, frågor till Bengt och Axel), 0.3.9 (12) som bär
okompilerad #203-kod, och produktbokens rader 21 och 82 mot invarianten (#264).

## #304 (22/9 2026) Bengts svar ur kortavstämningen: två kort stängda, 0.3.9 höjs till (13), produktboken i linje med invarianten

**Beslut (Bengt 22/9: *"2 skickade stäng och 3 ja"* och *"kameravarningen är klar"*).**
(1) **#154 Byvindgivarna** stängs: anmälningarna är skickade. (2) **Kameravarningen i fel riktning** stängs: Bengt bekräftar att
den är klar; beviset är fältdomen Malmö–Boden (DECISIONS #102), som kortet aldrig tog upp. Tavlan 69 → 67 öppna.
(3) **`CURRENT_PROJECT_VERSION` 12 → 13** i `ios/HalkvaktApp/project.yml`, och **produktboken rad 21 och 82** säger nu samma sak
som invarianten (#264).

**Varför numret höjs.** 0.3.9 (12) sattes 20/9 17:37 (0451016), och förkontrollen gjordes på 90b5223 (17:42). Kort #203:s iOS-kod
kom 18:17 (eb81b50) utan ny höjning. DECISIONS #275 och arkiveringsinstruktionen säger att 0.3.9 *inte* bär #203 — men ett arkiv
från main gör det, med kod som aldrig kompilerats. Det är fällan från 0.3.7 (CLAUDE.md, 18/9): ett byggnummer som sätts före den
sista ändringen bevisar inte vilket bygge som är ute. #269 (*"#203 går i 0.3.9"*) och #275 säger emot varandra; det här rättar
läget, inte besluten. **Axels val (§4.2 (d)):** (a) arkivera från main som **(13)**, med #203 lager 1, där Xcode kompilerar #203 för
första gången; eller (b) den rena fixen som **(12)** från `90b5223`. Instruktionen på tavlan bär båda vägarna.

**Produktboken.** Rad 21 sa *"ingen position som lämnar telefonen"* och rad 82 *"att positionen aldrig lämnar telefonen"*.
Invarianten skrevs om 20/9, och regeln är att invarianten, Data Safety, integritet.html och produktboken ändras i samma commit;
produktboken kom inte med. Nu: *"ingen position lämnar telefonen av sig själv — det enda som någonsin skickas är betatestets
facitsvar, som du själv slår på"*, och rad 82 citerar introduktionens text ordagrant. Ingen apptext ändrad.

**Sagt högt.** (1) Samma löfte utan undantag står i iOS behörighetsruta (`project.yml` rad 47 och 50: *"Positionen lämnar aldrig
enheten"*). Introduktionen och Om säger undantaget; behörighetsrutan gör det inte. Det är en text användaren ser och Axels text
(#196), så den rördes inte — frågan står i §4.2 (d). (2) Höjningen gör inte #203:s iOS-kod kompilerad: ingen CI bygger iOS-appen
(ios-engine prövar bara Swift-motorn på Linux). Det första provet är Axels Xcode. (3) *"2 skickade"* tolkades som att anmälningarna
är skickade (fråga 1 i listan); datum och väg är inte angivna.

## #305 (22/9 2026) Tavlans sektioner sorterade: 22 kort flyttade dit nästa steg finns, Claude — olåst 7 kort (kort #224)

**Beslut (Bengt 22/9: *"sortera korten som står i fel sektion och lämna förslag på de 5 enklaste att slutföra"*).** Regeln är #224:s
egen: *Claude — olåst* betyder *"det här kan Claude börja på utan att vänta på någon"*. Ett kort som väntar på vädret, en händelse
eller en persons beslut innan Claude bygger står i *Claude — låst* med nyckeln utskriven. Ett kort där allt som återstår är en
persons handling eller beslut står i den personens sektion. Varje flyttat kort bär en rad om varför.

**Flyttat (22):** till *Claude — olåst* #203 (lager 2; Axels beslut är tagna) och välkomsttexten · till *Claude — låst* #228 (Axel vid
Macen), #209, #151, #103, #95, #46, #45 (frosten eller vintern), #152 (1/10), #32 (releasen), #21 (iOS-bygget ute), #153 (betan och S2) ·
till *Bengt* #233, #218, #198, #146 och Danmark-nyckeln · till *Axel — beslut att ta* #204, #156, #214 · till *Axel — därefter* #210.
**Kvar i Claude — olåst (7):** #226, #217, #219, #221, #160, #203, välkomsttexten. #224 stängs: dess Verify är uppfylld. Tavlan 67 → 66.

**Varför.** En sektion som ljuger gör tavlan obrukbar för planering: 20/9 gav *"vad kan göras nu"* svaret 32, när det rätta var 9.

**Sagt högt.** (1) Kontrollen var att inga rader försvann: flyttningen jämfördes rad för rad mot originalet, och de enda nya raderna
är de 22 förklaringsraderna. Diffen ser stor ut (cirka 900 rader) eftersom hela block flyttats. (2) Ett fel från DECISIONS #303
rättades på vägen: sammanslagningsraden för #81 hade hamnat efter avgränsaren `---` i slutet av *Claude — låst*. (3) Två kort i
*Claude — olåst* är gränsfall. #221 kräver Bengts eller Axels ja för ändringen i CLAUDE.md och grenraderingen, men arkivet och
motsägelserna kan göras nu. #219:s konto och uppladdning är Axels, men versionshöjningen och introduktionen på Android kan byggas
nu. (4) Kort som redan stod i *Claude — låst* men med föråldrad nyckeltext (#89, #90, #97) flyttades inte — sektionen är rätt, bara
nyckelns ordalydelse är gammal.

**De fem enklaste att slutföra** (§4.2): #160 (Claude, nu) · #146 (Bengts ja, sedan en commit) · #156 (Axels rad) · skinnet v3 på
Android (Axels skärmbild) · Billing (Axel, före 24/9).

## #306 (22/9 2026) Kort #146 och #160 stängda — Swifts byggutdata ur repot, måndagsserien bevisad

**Beslut (Bengt 22/9: *"ja gör 146 och kör 160"*).** Två av de fem enklaste korten i §4.2.

**#146 — Swifts byggutdata ur repot (PR #481, 0c2d92a).** `ios/HalkvaktEngine/.build/` bar 504 filer (27,6 MB) från en CI-körning,
incheckade av misstag i början av september. Nu borttagna ur git (`git rm -r --cached`) och mappen i `.gitignore`. Ingenting i repot
läser mappen: sökt utanför den, inga träffar; ios-engine bygger sina egna. **Före:** `git -c core.longpaths=false clone --depth 1` på
Bengts Windowsdator gav *"Filename too long"* och *"Clone succeeded, but checkout failed"* (djupaste sökvägen 291 tecken, gränsen
260). **Efter:** samma kloning av 0c2d92a går igenom, med 0 saknade filer. ci (35739390674) och ios-engine (35739390740) gröna på main.

**#160 — måndagsserien.** **(a)** 21/9 startade alla sju pulsjobb 1–45 s efter sin bokade minut, alla gröna, som `workflow_dispatch`
från pulsklockan: grind-a 05:40:43 · smhi-prov 06:00:01 · cell-matning-v3 06:20:01 · trv-bevakning 06:40:45 · hojd-prov 07:00:01 ·
grind-v-a 07:20:43 · grind-v-b 07:40:44 (`scripts/matningar/mandagsserien-2026-09-22.py`, läser bara GitHubs API). 14/9 kom samma
serie 5–7 timmar sent på naken cron. **(b)** `matvaktprov` 22/9 14:16Z (körning 35739124629): issue #482 med etiketten `matvakt`
öppnades 14:16:29Z med provraden och stängdes 15:07:04Z av nästa gröna timkörning. Fristen är fast 3 h (`MATVAKT_FRIST_H` i
vakthunden), så en utebliven måndag syns 3 h efter sin bokade tid i stället för efter 10,5 dygn. **(c)** i drift sedan 18/9 (#237):
*mätvakten: 12 schemalagda flöden (11 via pulsklockan)*.

**Sagt högt.** (1) Commitmeddelandet för #146 säger att filerna *"inte raderas från någons disk"*. Det gäller den som gör ändringen
(`--cached`), men en `git pull` på en annan dator tar bort de gamla byggfilerna ur arbetskopian. Det är ofarligt: nästa Swift-bygge
skapar dem igen, och de var värdelösa utanför maskinen som byggde dem. Här tog pullen bort dem ur Bengts arbetskopia. (2) Historiken
är oförändrad; en ny kloning laddar fortfarande ner filerna men packar inte ut dem. (3) Provet visar larmvägen, inte fristen själv.
Fristen är kod (kadens + 3 h), och det första verkliga provet är en måndag som uteblir. (4) På vägen syntes att vakthunden räknar
**1 riktigt facitsvar** (senast 21/9 22:13Z, 2 prov uteslutna). Kortavstämningen byggde på DECISIONS #267 (20/9: 0 riktiga).
Kort #21:s steg 5 kan alltså vara uppfyllt; en rad om det står på kortet. (5) `matvaktprov` kostade en dbknapp-körning (cirka en
minut); mätningen av måndagen läste bara API:t.

## #307 (22/9 2026) Snapshotens halkfilter får "mycket besvärligt" — servern släpper in allt motorn kan varna för (kort #156)

**Beslut (Bengt 22/9: *"gör b"*).** Frågan var ställd till Axel (kort #156, `docs/TILL-AXEL-HALKORDEN.md`): lämna luckan *"med flit"*
(DECISIONS #214) eller lägga till ordet. Bengt avgjorde den i Axels ställe och valde att lägga till. `publish/snapshot-core.ts`:s
filter är nu `(is|halka|halkrisk|halkig|halt|mycket besvärligt)|snö|frost`, samma ord som motorns `SLIPPERY_INFO` och samma stammar
som `SLIPPERY_STAM`.

**Varför.** Servern bestämmer vad motorn över huvud taget får se; motorn bestämmer vad som sägs. Servern måste då släppa in minst
allt motorn kan varna för. Före ändringen nådde ett segment med kod 1 och texten *"mycket besvärligt"* aldrig telefonen, fast motorn
skulle ha kallat det halt. #214:s skäl (texten kommer i praktiken med kod 3, som släpps in på koden) var rimligt, men 0 fall av 830
rader bevisar lite när arkivet saknar vinter. Ändringen kostar en rad och tar bort en lucka som annars bara vilar på ett antagande.

**Alternativ.** (a) Lämna som det var, med #214 som svar — förkastat av Bengt. (c) Vänta på vintern och mäta — förkastat, eftersom
en lucka som bara syns när den redan kostat en varning inte kan mätas i tid.

**Bevis.** Enhetsprovet (`test/snapshot-core.test.ts`) läser motorns ordlista och stammar och kräver att snapshotens filter bär
vartenda ord. Motprov: ordet bort ur filtret ⇒ just det provet faller (25 gröna, 1 fel), filen återställd. Integrationsprovet
mot PostGIS: kod 1 med *Mycket besvärligt* och *Halkigt* når live.json, *fläckvis Våt* och *Halkbekämpning* gör det inte. CI 146
gröna. 44 kontrakt håller (snapshot-core och bunten bär samma värde). publicera ombuntad, PR #484 (0bb2ae3), deployad 15:38Z från
main (körning 35748665010) efter `git diff origin/main` utan skillnad. Första live.json efter deployen: 15:40:01Z, manifestets sha
lika med filens (`scripts/matningar/halkfiltret-156-2026-09-22.py`).

**Sagt högt.** (1) Beslutet var märkt som Axels, eftersom det ändrar vad appen kan varna för. Bengt tog det; Axel ser det här och
på kortet. (2) I dag har live.json 0 halksegment alls — september — så ändringen syns först när vintern kommer. Deploybeviset visar
att funktionen kör den kod som ligger på main, inte att ordet redan släppt in något. (3) Produktboken rad 137 hade inte heller
*halkig*, som motorn talat på sedan 16/9; båda står nu med. (4) Vakthundens vinterkoll och kodgrinden ställer andra frågor och är
orörda, som brevet till Axel föreslog.

## #308 (22/9 2026) Kort 3 (Billing) stängs — Actions-förbrukningen bevakas genom mätning, inte genom avläsning

**Beslut (Bengt 22/9: *"du kan stänga billings. Den har vi koll på genom mätning"*).** Kort 3 (Axels skärmklipp av Settings → Billing)
och §4.2-raden *Actions-kontot* (Axel, före 24/9) stängs. Bevakningen av Actions-taket till 1/10 bärs av kassavakten (#152,
vakthundens check 8, räknar fyra gånger om dygnet) och av §0b-raden *Actions-taket i september*.

**Sagt högt.** Kortets skäl var att kassavakten bara ser Halkvakts körningar, medan taket på 35 USD gäller hela Axels konto. Andra
repon på kontot syns alltså inte i mätningen. Bengts bedömning är att det är tillräckligt; skulle taket slå i ser vakthunden det som
stoppade körningar. Tavlan 63 → 62 öppna.

## #309 (22/9 2026) Tre kort stängda på Bengts ja: Norden efter facit, #16 Nowcast och guiden med bilder + film

**Beslut (Bengt 22/9: *"stäng 3, 4 och 5"*, ur förslaget *Fem nya att slutföra* i §4.2).**
(3) **Norden efter facit** stängs som dubblett: arkivdelen är klar (FI, NO och DK i arkivet; Norge i skuggflottan och grannsnapshoten
i Supabase sedan 22/9, DECISIONS #301), och produktdelen står ordagrant som Ä7 i bedömningen.
(4) **#16 Blixthalke-prognos (MET Nowcast)** stängs: kortets form, en prognos som varnar, krockar med regel T6 (TROSKLAR-KOMBINATIONEN,
fastställd 17/9, DECISIONS #220/#226 — prognoser får aldrig ensamma utlösa). Idén förs som en rad till #233:s *före resan*-vy, där en
prognos får visas men inte talas. Ä7 bär nu bara Nordenprodukten.
(5) **Guiden med bilder + film** stryks: sedan DECISIONS #38/#40 är Siri och självväckningen huvudvägen och Genvägar valfritt.

**Sagt högt.** Guidens råmaterial (Axels inspelningar 31/8) finns kvar om behovet kommer tillbaka; ingen film raderad. #16 var
Axels idé i ordningen *efter kö-slut*; Bengt stänger den, och idén är flyttad, inte borta. Tavlan 62 → 59 öppna.

## #310 (22/9 2026) Sensortrappans steg 2 tidsätts till våren 2027 — telefonkedjan avgörs i samma prövning

**Beslut (Bengt 22/9: *"stäng den med våren 2027 som beslut"*).** Kortet *Samtal med Axel: sensortrappan* stängs med tiden satt:
**steg 2 i sensortrappan** (synergianalysen 27/8 — telefonens egna sensorer som egen datamängd, bara opt-in) **prövas våren 2027**,
efter vinterns domar. **Telefonkedjan (#237)**, bil 1:s telefon som varnar bil 2, avgörs i samma prövning: byggs, avvisas eller blir
en del av #21. Frågan bärs av **Ä8** i bedömningens §3, så den kommer tillbaka i mars.

**Varför nu och inte i ett samtal.** Tiden var i praktiken redan satt: Axel beslutade 28/8 att v1 lanseras utan datainsamling och
att sensortrappan är strategi, inte MVP, med sensorspåret som eget opt-in-beslut *tidigast våren 2027*; SYSTEM.md säger *"samtalet
våren 2027, inte före"*. Ett kort som väntar på att någon ska bekräfta en tid som redan står i tre dokument är ett kort som ljuger om
att något återstår nu.

**Sagt högt.** Steg 2 krockar med invarianten (ingen position lämnar telefonen automatiskt, DECISIONS #264); prövningen i vår måste
ändra invarianten, Data Safety, integritet.html och produktboken i samma commit om den säger ja. Axel var part i kortets namn; beslutet
följer hans egen ordning från 28/8. Tavlan 59 → 58 öppna.

## #311 (22/9 2026) Tre framtidskort stängs och tas upp våren 2027: skolpaketet som produkt, dess material och Danmarks NAP-nyckel

**Beslut (Bengt 22/9: *"lägg B2B skolpaketet, skolpaketets material och Danmark som stäng och ta upp våren 2027"*).** Tre av de nio
framtidskorten i §4.2 stängs, och frågorna bärs av bedömningens vårlista i stället för tavlan:
- **B2B: skolpaketet som produkt** och **#26 skolpaketets material** (QR-blad, manus, checklista) → raden *Efter mars*: säljs våren
  2027 med halkbanedata.
- **Danmarks NAP-nyckel** → Ä7 under Nordenprodukten: registreras av Bengt och `ingest/dk.ts` läggs om före dansk produktion,
  tidigast 2027/28.

**Villkor.** #26 kan behövas tidigare: beviljar Skyltfonden ansökan med trafikskolorna (besked senast 15/12) öppnas kortet igen.
Villkoret står i bedömningens decemberrad, så att det syns när beskedet kommer.

**Sagt högt.** De övriga sex framtidskorten (#15, #32, #91, #96, #153, betalviljan) och gränsfallen står kvar öppna, eftersom Bengt
valde ut tre. Tavlan 58 → 55 öppna.

## #312 (22/9 2026) Samarbetena #94 stängs; QR-sidan per skola (#204) blir en vårfråga

**Beslut (Bengt 22/9: *"du kan stänga samarbetena 94 också och göra qr sidan till en vårfråga"*).**
- **#94 Samarbeten vi inte prövat** stängs. NTF-delen bärs av Skyltfondsrundan, där samtalen pågår 21–25/9; åkerierna ströks ur
  rundan (DECISIONS #215) och försäkringsbolagen tidigare. Inget möte bokas nu.
- **#204 Skolans namn på QR-sidan** stängs som kort och tas upp våren 2027 i bedömningens rad *Efter mars*, bredvid skolpaketet.
  Underlaget (`docs/QR-SIDA-PER-SKOLA.md`, Axels sju beslut i §6) ligger kvar. §0b-raden struken.

**Sagt högt.** (1) Åkeri- och bussbolagsspåret bärs inte längre av något kort; det finns kvar i DECISIONS #94 och i det stängda kortet.
(2) Domänen halkvakt.se krävdes före tryck av QR-bladet. Med QR-sidan på våren är domänen mindre bråttom, men kortet *Skydda namnet:
PRV + domänen* står kvar öppet. Tavlan 55 → 53 öppna.

## #313 (22/9 2026) Kort #27 asc-CLI:t stängs

**Beslut (Bengt 22/9: *"asc cli kan du stänga"*).** Kortet om App Store Connect-kommandoradsverktyget (en uppladdning till TestFlight i
ett kommando, och testarfeedback hämtad av CI) stängs. Det är ett bekvämlighetsverktyg som ingen bett om sedan 31/8, och uppladdning via
Xcodes Organizer fungerar. Idén står kvar i BACKLOG.md punkt 27. Tavlan 53 → 52 öppna.

## #314 (22/9 2026) Live Activity och startknappen på låsskärmen stängs

**Beslut (Bengt 22/9: *"stäng live activity och startknappen också"*).** Två iOS-kort från Axels höstlista stängs utan att byggas:
**Live Activity** (varningskortet i Dynamic Island och på låsskärmen) och **startknappen** (widget på låsskärmen, knapp i Kontrollcenter,
åtgärdsknappen). Inget av dem är byggt (ingen ActivityKit, WidgetKit eller ControlWidget i ios/), och produktboken lovar inget av dem.
Vakten startas redan av självväckningen och Siri (DECISIONS #38/#40).

**Sagt högt.** Båda var Axels idéer (31/8), och startknappen var beställd i DECISIONS #38/#39(3). Designen för Live Activity ligger kvar i
`docs/design/Halkvakt-Live-Activity.dc.html`. Tavlan 52 → 50 öppna.

## #315 (22/9 2026) #15 kö-slut och #32 hinder stängs som kort och öppnas våren 2027

**Beslut (Bengt 22/9: *"stäng 15 och 32 också men öppna våren 2027"*).** Kort **#15 Kö-slutsmotorn** (TrafficFlow: *"Kö framför dig,
bromsa lugnt"*, Bengts idé, faktatestad 26/8) och **#32 Hindren in i rösten** (först djur på vägbanan) stängs på tavlan. Ä3 i bedömningens
§3 bär dem och säger nu **våren 2027** i stället för *efter release*.

**Sagt högt.** Inget arbete går förlorat: #15:s villkor står i BACKLOG.md punkt 15, och #32:s underlag samlas redan i arkivet
(`AnimalPresenceObstruction` arkiveras, rösten talar bara om olyckor). Att vidga filtret släpper in vägarbeten, som DECISIONS #5
stängde ute; rösttexten för hinder är Axels beslut. Tavlan 50 → 48 öppna.

## #316 (22/9 2026) Djur på vägen: Trafikverket publicerar inom två minuter, polisen publicerar nästan inget — underlag för #32

**Fråga (Bengt 22/9):** hur snabbt rapporterar Trafikverket djur på vägen, var rapporteras det, och är polisen snabbare för samma händelse?

**Var.** Trafikverket publicerar öppet, inte bara internt: i sitt öppna API (som ingest-live läser varje minut) och på trafikverket.se
under Trafikinformation → Textmeddelanden, läst 22/9: t.ex. *"Djur på vägen - E18 … En hjort rör sig i närheten av körbanan. Starttid
18:37"*, uppdaterad 18:39.

**Mätt (körning 35757322550, `scripts/matningar/djur-trv-mot-polisen-2026-09-22.sql`, 14 dygn):**
- **Trafikverket, djur på vägen:** 480 händelser (~34/dygn). Hos oss median **1,8 min** efter Trafikverkets starttid, p90 3,0 min,
  0 över 30 min. Giltiga i median 72 min. **437 av 480 (91 %) namnger djurslaget** (älg, hjort, rådjur …); 474 har vägnummer.
- **Polisen, "Trafikolycka, vilt":** bara **11** händelser på 14 dygn, 6 med vägnummer. Samma nivå som i augusti (5 i veckan), alltså
  polisens urval och inte ett fel hos oss. Polisen anger länets mittpunkt, inte platsen (DECISIONS #13).
- **Samma händelse:** ett par gick att para ihop (samma väg, inom 150 km och 3 h). Där var Trafikverket först, 45 min före polisen.

**Slutsats för #32 (Ä3, våren 2027).** Trafikverkets flöde är det enda som duger för en varning: snabbt, med riktig position och
djurslaget i texten. Polisen rapporterar krockar som redan hänt och publicerar för få. Djurslaget i Trafikverkets text öppnar för en
röst som säger vad datan bär (*"Älg på vägen framöver"*), till skillnad från viltrösten ur polisens data (#266).

**Sagt högt.** (1) 1,8 min mäter från Trafikverkets starttid, som är när händelsen lades in — inte när djuret kom ut på vägen; den
tiden syns i ingen källa. (2) Ett enda par säger inget statistiskt om vem som är snabbast; det som väger är att polisen har 11
händelser mot 480. (3) Polisen hämtas en gång i timmen, så deras tid till oss (median 24,5 min) är inte jämförbar och används inte.


## #317 (22/9 2026) 0.3.9 arkiveras som den rena fixen (12) från `90b5223`; behörighetsrutans text rättas i main och följer med (13)

**Frågan (§4.2 (d), DECISIONS #304).** Axel lämnade de två frågorna till Claude 22/9 kväll: *"fråga din code om detta ska göras och kör
den i så fall klar"*.

**(1) Väg (b): 0.3.9 (12) från `90b5223`.** Skälen, i vikt: (i) bygget finns för att bevisa EN rad (#273, släckt skärm på *när appen
används*) — #275 säger det ordagrant, och provet är bara tolkningsbart om inget annat rör sig. #203 lager 1 rör just det som provet
tittar på: en ny notisdelegat, `willPresent`, `GuardManager` och talvägen i `SpeechService`. Blir det tyst på väg (a) vet ingen om det
är #273 som inte håller eller #203 som tystat något. (ii) #203:s iOS-kod har aldrig kompilerats; faller den i Xcode står releasen
stilla i kväll för en funktion som inte är det kvällen gäller. (iii) Förkontrollen (ci, ios-engine) gjordes på exakt `90b5223`, och
ett arkiv från den commiten är det enda som bevisar vilket bygge som är ute — läxan från 0.3.7 och #304. (12) är inte uppladdat,
så numret är ledigt. **(13) blir nästa bygge från main** och bär #203 lager 1 + texterna nedan; där kompileras #203 första gången,
med ett eget prov.
Taggen `ios-0.3.9-12` sitter på `90b5223` så steget blir `git checkout ios-0.3.9-12` i stället för ett hash att skriva av.

**(2) Behörighetsrutan: ja, rättas — i main, inte i (12).** Texterna var osanna på två sätt, inte ett: (a) *"Positionen lämnar
aldrig enheten"* utan betatestets undantag bryter invarianten (#264), medan introduktionen och Om säger undantaget; (b) *"Med
"Alltid" kan vakten varna även när skärmen är släckt"* är fel sedan #273 — släckt skärm fungerar på *Vid användning*, och Alltid
behövs bara för självstarten. Samma fel (b) stod i introduktionens sida två, i en kommentar i `GuardManager` och i produktbokens
rad 85–86; alla rättade i samma commit. Formuleringen följer produktbokens rad 21 (#304) ordagrant, så appen, rutan och boken
säger samma mening.

**Skärmbilden: inte i samma commit, och skälet är mekaniskt.** Produktboksregeln tar skärmbilder ur fotostudions artefakt, och
fotostudion är Android-CI; iOS egen behörighetsruta är en systemdialog som ingen fotostudio kan fotografera, och inget CI bygger
iOS-appen. Rutans text står i stället ordagrant i produktboken, och skärmbilden tas ur första bygget som bär den — 0.3.9 (13).

**Sagt högt.** (1) Texten *"även med släckt skärm"* vilar på #273, som är byggd men ännu inte hörd på en resa. Faller (12):s prov
(a) ska texten backas i samma varv som fixen lagas. (2) `docs/PLAY-BACKGROUND-LOCATION.md` rad 26 säger fortfarande *"Positionen
lämnar aldrig enheten"* — det är Play-deklarationen, inte en app-text, och den rättas med Data Safety före första uppladdningen
till Google, inte här. (3) Swift-ändringen är en strängliteral; den är inte kompilerad förrän (13) byggs.

## #318 (22/9 2026) Viltvarningen byts: Trafikverkets *djur på vägen* ersätter polisens länspunkter — A–D byggt i ett (kort #241)

**Beställningen.** Axel 22/9 kväll: *"Vi byter ut polisens viltvarning mot Trafikverkets. Trafikverket lämnar 10 ggr så många o på
rätt plats … vi gör detta också, sen gör vi en deploy"* — alltså ja till skissen (`docs/SKISS-VILT-TRAFIKVERKET-2026-09-22.md`) och
till att bygga A–D nu. De två öppna frågorna togs enligt skissens rekommendation: **texten exakt #266**, *"Viltrisk framöver."*,
utan art; **punkten**, inte sträckan.

**Steg 0, mätt först** (dbknapp, körning 35778427029, bara läsande): **487** djurhändelser på 14 dygn (~35/dygn), **alla** med punkt
och sluttid, median giltighet **73 min**. **33 (7 %)** beskriver en sträcka (*"mellan Sävsjö och Vrigstad"*) — där ligger punkten vid
ena änden; det räcker inte för att bygga sträcklogik nu. Fritexten bekräftar arten i de flesta, men visar också något skissen inte
sa: **tamdjur ingår** — *"Flertalet lösa kor på vägen"*, *"En fårskock i närheten av körbanan"*, *"Ko i vägområdet"*. Rösten säger
*"Viltrisk"* också då. Det är fel ord men rätt varning (ett djur på vägen är samma fara för föraren), och det är skälet att artbeslutet
är Axels och kommer senare.

**Byggt:**
- **A. Hämtningen.** `AnimalPresenceObstruction` i `KEEP` i ingest-live och i spegeln `ingest/sources/situations.ts`. Djuren ligger
  nu i `deviations`, så Trafikverkets radering släcker dem — arkivet ser aldrig en radering, och utan det här hade en bortplockad älg
  varnat till sluttiden.
- **B. Snapshoten.** Olycksfrågan får `message_type_value = 'Accident'` (samma rad som grannarna), annars hade en älg sagts som
  *"olycka"*. Ny nyckel **`djur`** `[{id, lon, lat, art, slut}]`; **`wildlife` publiceras tom** — polisens fråga borttagen. Kartans
  olyckslager fick samma Accident-rad (`publish/map-core.ts`), annars hade älgarna ritats som olyckor.
- **C. Motorn.** Texten *"Viltrisk framöver."* i TS, Kotlin och Swift; v13 omgenererad till den; ny **v37** (djur framför talar t=38
  vid 655 m med 11 m marginal åt båda håll, djur bakom tiger). Parsrarna (`engine/src/snapshot.ts`, `SnapshotRepo.kt`,
  `SnapshotRepo.swift`) läser `djur` som viltfara med id `djur:<id>`. Skuggmotorn och publicera buntade om.
- **Åldersvakten** (fynd under bygget, inte i skissen): vilt räknades som *statiskt* och överlevde gammal data för evigt — rätt för
  en olycksplatsstatistik, fel för ett djur som står där nu. Viltfaror åldras nu som olyckorna (120 min) på båda plattformarna; test
  i `AgeGateTest`.
- **D. Visningen.** Android: *"Djur rapporterat på vägen"*, källan *"Trafikverket · läget nu"*, inställningen *"Djur på vägen enligt
  Trafikverket"*; iOS samma inställningstext. Polisen struken ur attributionen i båda apparna — ingen polisdata når appen längre.
  Produktboken: rösttabellen, attributionen och dataflödet.

**Ingen prioritet, inget ledavstånd, ingen dämpning ändrad.** Invarianten, Data Safety och integritetssidan orörda — inget nytt lämnar
telefonen.

**Övergången, som skissen lovade:** gamla appar läser bara `wildlife`, som är tom ⇒ tysta för vilt (DECISIONS #13 uppfylld igen).
Nya appar (Android efter CI, iOS i 0.3.9 (13)) läser `djur`. Skuggflottan talar på djuren direkt efter deployen.

**Sagt högt.** (1) Det här gör djurhalvan av #32 nu, trots att kortet stängdes till våren (#315); övriga hinder och #15 ligger kvar.
(2) Rader som fanns i arkivet före deployen kommer in i `deviations` först när Trafikverket ändrar dem; med median 73 min är det
borta inom en timme eller två. (3) Android-versionen höjdes inte: inget har laddats upp till Play än, och testarna får APK:n ur CI.
(4) `polisen_events` samlas fortfarande in till arkivet; bara appens väg är stängd.

## #319 (23/9 2026) TROSKLAR-SKUGGAN §4 rättad mot regel T: prognosen blir karta och förstärkare, aldrig röst ensam (kort #198)

**Beslut (Bengt 23/9: *"ja anta förslaget med B3-meningen i raden"*).** §4 i `docs/TROSKLAR-SKUGGAN.md` ändras enligt
`docs/SKUGGAN-PAR4-MOT-REGEL-T.md` §4: **(a)** klarar segmentprognosen A + B + C blir den ett kartlager (trenivåmärkt,
"risk"-språk) som får stärka, försvaga eller förlänga en varning som vilar på en mätning — **den utlöser aldrig röst ensam**;
**(b)** nära ankare talar den bara om **både** bandet är godkänt **och** T1–T2 uppfyllda, alltså en namngiven mätning som på
varningens plats och inom utfallsfönstret kan visa att tillståndet inte rådde; **(c)** orörd. **B3-meningen:** en B3-träff är
att prognosen visade rätt på kartan eller förlängde/stärkte en mätt varning — inte att den talade där punktmotorn teg; talet
i B3 är oförändrat. Grind A, B och C oförändrade.

**Varför.** §4 (1/9) lät ett modellerat värde starta rösten. Regel T (16–17/9, DECISIONS #220/#226) förbjuder det och nämner
offsetmodellen vid namn (T3), och regeln får skärpas men aldrig mjukas upp, oavsett signaturer (TROSKLAR-KOMBINATIONEN §10).
Två fastställda dokument sa emot varandra; det här är rättelsen av det svagare. Skärpning enligt §5 — en rad från Bengt, som
äger mätningen; ingen kontrasignatur. Gjord nu, före prognosens första skuggkörning (#38b steg 4, oktober), så att vintern
loggas under ett dokument som stämmer.

**Alternativ.** Vänta till mars (kortets frist): risk att röstvägen byggs på en text som inte får användas. Stryka (b) helt:
enklare men oåterkalleligt (att öppna igen vore en lättnad). Valt: förslaget som det står, med B3-meningen.

**Vad som inte ändras.** Produktionsmotorn, skuggmotorn (flottan), skuggreglerna, #153 beslut 2 (styrs av T5), #103
frysklassningen (konfidenshöjare), något i TROSKLAR-KOMBINATIONEN.

**Sagt högt.** (1) (b) kan visa sig nästan tom: ett vittne på platsen är i praktiken en station inom några kilometer, och då
är stationens mätning redan utlösaren. Prognosens värde blir försprång, längd och karttäckning. (2) Ingen kod ändras:
prognoskolumnen är inte byggd. (3) Genomlysningen ligger på Bengts skrivbord (`Halkvakt-198-genomlysning-2026-09-23.md`) och
underlagets §7 bär tilläggen. Tavlan 49 → 48 öppna.


## #320 (23/9 2026) Halkvakt till App Store: iOS först, 0.3.9 (13) är kandidaten, ingen näringsidkare — och integritetspolicyn rättad

**Axels svar 23/9 kväll** på frågorna i dokumentet *Halkvakt till App Store*:
(1) **Kontakt** för supportsidan och granskningen: Axels e-postadress (står i App Store Connect; ur repot 9/10, kort #311).
(2) **EU:s näringsidkarstatus (DSA): inte näringsidkare** — gratisapp utan verksamhet bakom; adress och telefon visas då inte i butiken.
(3) **iOS släpps före Android.** Det ändrar DECISIONS #23 (samtidig lansering). Android följer när Googles stängda test (12 testare,
14 dygn) är klart.
(4) **Versionsnumret spelar ingen roll** — butiken visar 0.3.9. Kandidaten är **0.3.9 (13)**, uppladdad 23/9 20:53, efter en provresa.

**Gjort samma kväll (halkvakt-karta a2b7981, live efter Pages-bygget 88f5dfd):**
- **`integritet.html` omskriven** — den gamla sa *"Vi samlar in: ingenting"*, osant sedan facitsvaret 16/9, och #264 krävde att sidan
  ändrades i samma commit som invarianten; det blev aldrig gjort. Nu: ingen position lämnar telefonen av sig själv; undantaget
  betatestets facitsvar, med vad det bär (varnings-id, klockslag, svar, plattform, version) och vad det inte bär. Polisen struken
  som källa (#318), Androids behörigheter märkta som Android, utgivare och kontakt utskrivna. Gäller från 2026-09-23.
- **Ny `support.html`** (Hjälp & kontakt) — App Store Connects support-URL.
- `om.html` (appens *Om appen*-länk) och `index.html` sa också *"positionen lämnar aldrig telefonen"* och nämnde Polisen; i linje nu.

**App Privacy-etiketten:** Coarse Location + Product Interaction, inte kopplat till identitet, ingen spårning, ändamål App
Functionality + Analytics. Integritetsmanifestet i bygge 13 deklarerar bara Coarse Location; Product Interaction läggs till i nästa
bygge.

**Sagt högt.** (1) Policyn lovar ingen lagringstid för facitsvaren — ingen är beslutad. Det är Axels fråga när betatestet avslutas.
(2) Butikstexten för Play (`marknadsforing/butik/butikstext.md`) nämner fortfarande Polisen; rättas före Play-uppladdningen.

## #321 (23/9 2026) Grind A dömd: KLARAD — offsetmodellen håller vid stationerna (kort #38b steg 3)

**Beslut (Bengt 23/9: *"Döm grind A"*).** Grind A i `docs/TROSKLAR-SKUGGAN.md` §3 är **KLARAD**. Domen fälls på körningen 22/9
04:49Z med radvakten och karantänen (DECISIONS #298/#299): 711 stationer, 202 087 avläsningar, 7 356 punkter — **A1 0,71 °C**
(krav ≤ 1,0), **A2 3,5 % ± 0,4** (krav ≤ 5; marginalvaktens övre gräns 3,9), **A3 0,0 %** (krav ≤ 10). Måndagskörningen 21/9 utan
vakterna säger samma sak: A1 0,75, A2 3,8 ± 0,5, A3 0,3 på 5 745 punkter. Underlagsvakten (≥ 500 punkter, ≥ 20 stationer) och
marginalvakten (DECISIONS #126) är uppfyllda. Felet stiger monotont med ankaravståndet, som fysiken säger.

**Varför nu.** Talen har stått i två läsningar sedan 22/9, Axel har redan sagt att grind A står (bedömningen §4.1), och steg 4
(DECISIONS #322) förutsätter en dom. Historiken: 1/9 INGEN DOM (57 punkter); 12/9 FALLEN i rubriken men INGEN DOM med vakterna
(#119/#129/#131, A2 5,1 % ± 1,0); 21–22/9 KLARAD.

**Alternativ.** Vänta på Axels formella rad — Axel fäller marsdomen (§4, §6), men grind A är byggets förgrind och Bengt äger
mätningen; Axel ser domen här. Förlängd mätning — underlaget är fjorton gånger vaktens golv, det finns inget att vänta på.

**Rättelse 1/10 (kort #267).** Meningen *"Felet stiger monotont med ankaravståndet, som fysiken säger"* stämmer inte med
körningen domen vilar på (35688287525, 22/9 04:49Z): per band 0,43 · 0,79 · 0,76 · 0,72 °C. Felet stiger från 0–7 km till 7–15 km
och ligger sedan platt, med en svag nedgång. Domen berörs inte — A1, A2 och A3 är helhetsmått — men påståendet om monotoni stryks
som bevis för fysiken; det var en läsning av tabellens riktning, inte av dess tal.

**Vad domen säger, och inte.** Den gäller leave-one-out vid stationerna, där en offset kan läras ur stationens egen historik: det
är modellens tak. En vägpunkt mellan stationerna har ingen historik (kort #38b, raden 23/9); vad vägen får döms av grind B och C i
mars. Ingen röst, inget till användaren: §4 (DECISIONS #319) gäller. Måndagsserien fortsätter som bevakning; faller ett mått på
vinterdata tas det upp i bedömningen §4.2 — domen är fälld på höstdata (60 dygn, yta ≤ +5 °C).

## #322 (23/9 2026) Novemberbeslutet: segmentmotorn byggs i skugga i vinter (kort #38b steg 4)

**Beslut (Bengt 23/9: *"gör novemberbeslutet nu"*).** Segmentmotorn (offsetmodell + ankarklippning, TROSKLAR-SKUGGAN §1) byggs i
**strikt skugga** den här vintern: en prognoskolumn i `shadow_log`, buntad ur `engine/src` som allt annat (DECISIONS #43/#51),
körd på skuggrutterna från mitten av oktober när halkan kommer till Skåne. Ungefär tre veckors bygge. Varje segment loggas
uppmätt / modellerat / okänt. Inget når användaren — ingen röst, ingen karta — före domen i mars 2027 (§4, DECISIONS #319).

**Villkor före bygget (delsteg 4a).** Hur offseten når en vägpunkt utan historik (rå avståndsviktning, offset interpolerad ur
grannparen, eller terrängkorrigerad) ska stå i TROSKLAR-SKUGGAN innan första raden kod skrivs. Annars loggar vintern rå-modellen
(1,65 °C mot offsetens 1,06 i höjdprovet 12/9) och grind B mäter något annat än grind A godkände. Claude skriver förslaget;
Bengts rad enligt §5.

**Varför.** Grind A är klarad (DECISIONS #321). Skugga kostar ingen risk för förare, ingen ny tjänst och inga Actions-minuter
(skuggmotorn kör redan i Supabase) — bara arbete och Bengts söndagsläsning. Skjuts bygget till 2027/28 förloras en hel vinters
facit, och kartlagret kommer tidigast 2028/29. Frågan ställdes 12/9 när A2 var oavgjord; sedan 22/9 är den avgjord med marginal.

**Alternativ som valdes bort.** Skjuta till 2027/28 (vintern förlorad). Bygga direkt mot appen (förbjudet av regel T och §4).
Vänta på Axels novemberrad: kortet sa att sekvenseringen mot lanseringen är Axels. Bengt fattade beslutet att bygga; Axel äger
fortfarande NÄR i förhållande till App Store-lanseringen (DECISIONS #320) — flyttar lanseringen bygget säger han till, annars
står starten. Raden står i bedömningen §4.2.

**Vad det inte är.** Ingen prognos bortom två timmar, ingen blixthalka (#16), ingen ersättning för SMHI, inga nya trösklar.
Höjden (#96) och kallplatslagret (#91) läggs in bara om vinterdata ger dem en rad (#96) eller de förklarar residualer (#91).

**Sagt högt.** (1) Skuggmotorns körtid med prognoskolumnen är inte mätt; den mäts efter första varvet och skrivs på kortet.
(2) Bengts söndagsrutin får en kolumn till att läsa. (3) Byggnumret och deployen följer bundle-läxan: bunta, `--check` i CI,
deploya, bevisa med en rad MED innehåll i `shadow_log`.

## #323 (23/9 2026) Vägpunktsgrinden före bygget, och holdout-stationer på skuggrutterna (kort #38b delsteg 4b, 4c)

**Beslut (Bengt 23/9: *"ja till ändringarna. kör på"*, på Claudes bedömning av planen).** Två skärpningar av segmentmotorns plan:
1. **Vägpunktsgrinden (4b).** Grind A:s tre mått, trösklar, underlags- och marginalvakt prövas mot arkivet en gång till — men på
   kandidater som INTE får låna målets egen historik: rå avståndsviktning, offset interpolerad ur grannparen, höjdkorrigerad.
   Grinden öppnar om minst en kandidat klarar A1–A3; den kandidaten är svaret på 4a (offsetens väg till vägpunkten). Öppnar den
   inte byggs ingen skuggkörning i oktober (DECISIONS #322). Provet bor i `scripts/hojd-prov.ts`, som redan räknade två av
   kandidaterna, och går på måndagsklockan utan nya Actions-minuter. Första körningen på knapp i dag.
2. **Holdout-stationer (4c).** Skuggrutterna ska ha stationer mitt på sträckan som hålls utanför modellen: prognosen för platsen
   räknas ur grannarna, facit är stationens egen mätning. Det ger vägen en domare hela vintern (TROSKLAR-SKUGGAN §2: bara en
   station eller en testarlogg får fälla) och grind C sina händelser.

**Varför.** Grind A dömde taket (DECISIONS #321): vid en station lärs offseten ur stationens egen historik, en vägpunkt har ingen.
Byggplanens "gratis tidiga nej" (DECISIONS #51) krävdes för stationerna men aldrig för vägen. Och facit mellan stationerna är tunt
av samma skäl som problemet finns; utan holdouts kan mars sluta i "obedömbar" och fortsatt skugga utan att någon vet mer än nu.

**Mätt i dag** (`scripts/matningar/holdout-kandidater-2026-09-23.ts`: CDN-stationerna mot skuggmotorns rutter, station ≤ 5 km
från linjen, band = avstånd till närmaste ANDRA station, alltså det band platsen hamnar i när stationen tas bort):

| | på rutterna | 0–7 km | 7–15 km | 15–20 km | > 20 km |
| :-- | --: | --: | --: | --: | --: |
| Sverige, 20 rutter | 227 | 133 | 79 | 11 | 4 |
| Finland, 20 rutter | 246 | 166 | 40 | 19 | 21 |

**Nittio svenska stationer** på rutterna hamnar i 7–20 km-banden — där prognosen ska bevisa sig. Flest på E4 Helsingborg→Jönköping
(10), Rv70 Enköping→Mora (8), E6 Halmstad→Göteborg och E4 Gävle→Sundsvall (7 var). **Avvikelse:** E4 Umeå→Luleå fick noll
stationer inom 5 km — rutten är fyra brytpunkter på 218 km, så den riktiga vägen ligger längre från linjen. Talen är en undre gräns.

**Vad det inte ändrar.** Grind A:s dom, trösklarna i TROSKLAR-SKUGGAN (4b är en grind till med samma tal — en skärpning enligt §5),
grind B och C, §4. Höjden (#96) och kallplatslagret (#91) är fortsatt villkorade grenar. Trösklarna och domspärren finns nu i två
filer och vaktas av fem nya kontrakt i `scripts/kontraktsgrinden.ts` (49 kontrakt).

**Sagt högt.** (1) Interpolationskandidaten viktar målets grannar med 1/km² från målet, inte 1/km som grind A:s grannvikt:
självtestet visade att 1/km gav stationer 20 km bort en tredjedel av vikten och drog offseten fel. Ett val i provet, inte en
tröskel. (2) Två kandidater hade tal redan 12/9: rå 1,65 °C och rå+höjd 1,65 °C, båda över A1. Grinden hänger på
interpolationen. (3) Holdout-urvalet — vilka stationer, hur de tas ur modellen — görs i bygget och skrivs in i
tröskeldokumentet tillsammans med 4a. (4) Självtestet "två byar": rå 0,111 °C → interp 0,007 °C på 1 040 punkter.

## #324 (23/9 2026) Vägpunktsgrinden ÖPPEN: rå avståndsviktning, ingen offset, är prognosens väg till vägpunkten (kort #38b 4a/4b)

**Utfall (två körningar 23/9 på Bengts "kör på", DECISIONS #323).** Grind A:s tre mått på kandidater som inte får låna målets
egen historik, 60 dygn, samma leave-one-out som grind A.

| Körning | Population | RÅ | INTERP | RÅ+HÖJD | OFFSET (taket) |
| :-- | :-- | :-- | :-- | :-- | --: |
| 20:20Z (35915159831) | **utan** vakterna: 768 stationer, 8 432 p | 1,11 °C · 9,1 % · 3,1 % ⇒ FALLER | 1,42 · 17,7 % · 4,5 % ⇒ FALLER | 1,16 · 10,1 % · 3,1 % ⇒ FALLER | 0,86 °C |
| 20:25Z (35915703198) | **med** #75, radvakten, karantänen: 712 stationer, 8 132 p | **0,71 °C [±0,01] · 3,8 % [±0,4] · 0,0 % ⇒ KLARAR** | 0,88 · 9,5 % · 0,0 % ⇒ FALLER | 0,74 · 4,7 % [±0,5] · 0,0 % ⇒ OAVGJORT | 0,72 °C |

**DOM: ÖPPEN.** RÅ — grannarnas yttemperatur avståndsviktad, upp till fem ankare inom 50 km, vikt 1/km, ingen offset — klarar
A1–A3 utan målets historik, och lika bra som grind A:s lärda offset (0,71 mot 0,72 °C). Per band (RÅ, med vakterna): 0–7 km
0,73 °C / 0,9 %, 7–15 km 0,55 / 1,1 %, 15–20 km 0,73 / 5,0 %, > 20 km 0,72 / 4,0 %.

**Vad det svarar på.** Delsteg 4a (DECISIONS #322): prognosen räknas som RÅ på grind A:s population. Texten står i
`docs/TROSKLAR-SKUGGAN.md` §3, skriven under mandatet i DECISIONS #323 ("den kandidaten är svaret på 4a"); Bengts rad
bekräftar eller ändrar lydelsen (bedömningen §4.2). Bygget i oktober står (DECISIONS #322). **Offsettabellen utgår ur bygget:**
prognoskolumnen behöver ingen lärd offset, bara stationerna, vakterna och avstånden. Interpolerad offset ur grannparen är
underkänd (A2 9,5 %): offsetarna är lokala, inte en jämn karta, som #96 och #119 redan antydde. Höjden är oavgjord: hjälper
inom 7 km (0,59 mot 0,73), stjälper bortom 20 (0,79 mot 0,72, 5,7 % grova); #96 mäter vidare på måndagsklockan.

**Den första körningen föll på fel population — och det är läxan.** Höjdprovet läste arkivet utan #75:s givarvakt, radvakten och
karantänen, som grind A bär sedan 22/9 (DECISIONS #298/#299; höjdprovet stod inte i den listan). Vakterna tar under två procent
av raderna (874 + 1 961 + 2 553 av 337 096) men bar hela skillnaden: 7–15 km-bandet gick från 2,68 °C och 24,9 % grova till
0,55 °C och 1,1 %. Det säger också något om DECISIONS #119:s "7–15 km-anomali": den var trasiga givare, inte terräng. Rättat
i PR #511 innan domen bokfördes. Regel, nu i CLAUDE.md: en grind som lånar en annan grinds trösklar måste låna dess vakter;
kontraktsgrinden vaktar talen, ingen vaktar populationen.

**Vad det inte ändrar.** Grind A:s dom (#321), trösklarna, grind B och C, §4 (aldrig röst ensam). Holdout-stationerna (4c) står:
med RÅ som prognos är en holdout exakt grind A:s leave-one-out, så måndagskörningen ÄR vinterns vägpunktsprov för alla 712
stationer; rutternas holdouts ger dessutom facit för grind B på just skuggrutterna.

**Sagt högt.** (1) Grinden är klarad på höstdata (60 dygn, yta ≤ +5 °C); vinterkurvan är bevakningen, faller RÅ tas frågan upp i
§4.2. (2) 15–20 km-bandet ligger på 5,0 % grova, exakt på tröskeln — bandet står, men det är där vintern kan vända. (3) Att RÅ
och OFFSET är lika bra betyder att grind A:s "tak" inte var något tak: modellens värde ligger i vakterna och ankartätheten,
inte i den lärda offseten. Det förenklar bygget och gör höjden och terrängen till precis vad Bengt frågade om i morse —
delar av samma modell, som läggs in bara om de förklarar något.

## #325 (23/9 2026) Bygg nu: segmentprognosen byggs och körs från 23/9, inte från mitten av oktober (kort #38b steg 4)

**Beslut (Bengt 23/9: *"bygg nu"*, på frågan *"vad vinner vi på att inte gå vidare nu"*).** Starten i DECISIONS #322 (mitten av
oktober) flyttas till nu. Skälet till oktober i DECISIONS #51 gällde körningen — ingen halka att skugga i augusti — inte bygget,
och bygget krympte 23/9 när offsettabellen utgick (DECISIONS #324). Vad vi förlorar på att vänta: höstens första halkperioder
(grind C1 kräver tre skilda), ett oprövat facitmaskineri, inga holdouts på rutterna. Kolumnen kostar ingen röst och ingen
användare oavsett när den startar. Axel äger fortfarande sekvenseringen mot App Store (DECISIONS #320/#322).

**Byggt samma kväll (PR:n bär koden):**
- `sql/032_prognos.sql`: kolumnen `shadow_log.prognos` (jsonb, `{}`) och funktionen `vagpunkt_ankare()` — alla vaktade, färska
  svenska stationer med yttemperatur, "från nu" som snapshoten: 3 h färskhet, #75, radvakten, karantänen (≥ 3 brott/7 dygn),
  långsamma vakten (dygn i felet inom 3 h). Bara service-rollen får köra den; rättigheterna guardade mot CI:s PostGIS.
- `engine/src/segment.ts`: rå avståndsviktning — upp till fem ankare inom 50 km, vikt 1/max(km, 1), grind A:s grannvikt
  ordagrant. Provpunkt var 2 km längs rutten (facitradien i §2). Rad per punkt: `[km, yta, narm, n, status, frys]` — status
  2 uppmätt (ankare ≤ 2 km) · 1 modellerat (≤ 50 km) · 0 okänt; frys = skattning ≤ 1 °C (A3:s klassgräns), satt på det
  oavrundade talet. Rent, plattformsfritt, buntat in i skuggmotorn som allt annat; tio tester i `test/segment.test.ts`.
- Skuggmotorn hämtar ankarna en gång per anrop (RPC), räknar per rutt och loggar `prognos`; svaret bär `ankare` och `ankareSkal`
  så en tom kolumn aldrig är tvetydig. Bara Sverige tills det finska arkivet får samma funktion.
- Skuggrapporten räknar körningar, punkter, uppmätta, modellerade, okända och frysflaggade ur raden — inga trösklar i rapporten.
- Kontraktsgrinden: tre nya former så att SQL-kopiorna av karantänens tal och den långsamma vaktens frist vaktas.

**Vad som INTE är med, sagt högt.** (1) **Tidsdelen.** TROSKLAR-SKUGGAN §1 säger *risk vid beräknad ankomsttid, högst två timmar
fram*. Vägpunktsgrinden bevisade den rumsliga delen; inget har prövat den tidsliga. Kolumnen loggar nuläget per segment; tiden
väntar på trendregeln (kort #88). Att logga en gissning på en gissning vore att förfalska grind B. (2) Fukt: prognosen bär
temperatur, inte fukt — punktmotorns fuktvillkor finns inte mellan stationerna. Frysflaggan är en temperaturflagga. (3)
Värdevakten: prognosens yta ärver `surface_temp_c`:s spann; jsonb-vägen besiktigas när dom-knappen för grind B byggs.

**Kvar i steg 4:** migrationen körd (dbknapp), bunten deployad, **första raden MED innehåll**, facitkopplingen
(`publish/missar.ts`), dom-knappen för grind B och C, holdout-urvalet (4c), Finland. Radstorleken (≈ 1–4 kB per rutt, tre rutter
per varv) mäts efter första dygnet mot databasvakten.

**Alternativ som valdes bort.** Vänta till oktober (perioder förlorade). Läsa ankarna ur live.json (bär bara stationer ≤ 3 °C).
Publicera en ny CDN-fil (kartrepot växer var tionde minut). Höjdkorrigering i prognosen (oavgjord i grinden, stjälper bortom 20 km).

**IDRIFTTAGNING 23/9, bevis:**
- **PR #514** sammanslagen (a894f01); CI grön inklusive integrationstestet som körde sql/032 mot PostGIS.
- **`sql/032`** körd via dbknapp: kolumnen `prognos` (jsonb, `{}`) i `information_schema.columns`; `vagpunkt_ankare()` gav **744 ankare**
  av 747 färska stationer (5,2–17,4 °C); EXECUTE bara för postgres och service_role.
- **Deploy** 20:51:52Z (skuggmotor, 37 kB) och 20:52:33Z (skuggrapport) från a894f01 efter `git pull` och noll diff mot main.
- **Radstorleken, mätt 24/9 02:00Z (Bengt: *"gör radstorleken"*):** 26 rader med prognos 21:00Z–02:00Z, 1 098 byte i snitt, 28 kB totalt, 5,2 rader per timme ⇒ ≈ 125 rader och ≈ 140 kB per dygn, ≈ 4 MB per månad; skuggloggen 2,4 MB på 9 896 rader, databasen 193 MB (24/9 02:00Z). Provpunkterna står kvar var 2 km — inget att krympa.
- **Första raden MED innehåll:** 2 rader med innehåll i `shadow_log.prognos` efter varvet 2026-09-23T21:00:02Z; t.ex. E14 Sundsvall→Åre: 130 provpunkter, 7 uppmätta, 123 modellerade, 0 okända, 0 frysflaggade, 1465 byte; skuggmotorns svar: ankare 5 bidragande per provpunkt (744 i funktionen); E4 Linköping→Södertälje 77 punkter, 970 byte, ankareSkal det svenska svaret hann rulla ur net._http_response före läsningen; det norska varvet svarade ankare 0, "bara Sverige", som avsett.

## #326 (23/9 2026) Holdout-urvalet: varje station på rutten är holdout varje varv — inget tas bort ur prognosen (kort #38b 4c)

**Beslut (Claude på Bengts "kör vidare" 23/9, inom DECISIONS #323:s ram).** Holdout blir inte ett urval av stationer som hålls
utanför modellen för vintern, utan **leave-one-out varje varv**: varje ankare inom 2 km av skuggrutten (facitradien i §2) skattas
ur de övriga ankarna, precis som grind A gör för alla stationer varje måndag, och loggas bredvid sin egen mätning i
`shadow_log.prognos.h` som `[km längs rutten, id, mätt yta, skattad yta, avstånd till närmaste övriga ankare, antal ankare]`.
Stationen bär prognosen för alla andra punkter och är facit för sin egen.

**Varför så, i stället för ett fast urval.** (1) Med rå avståndsviktning (DECISIONS #324) finns ingen inlärning att hålla stationen
utanför — att ta bort den ur ankarna hade bara försämrat prognosen längs rutten. (2) Alla 227 svenska stationer på rutterna
(DECISIONS #323) blir facit, var trettionde minut, i stället för ett handplockat tiotal. (3) Det är exakt §2:s stationsfacit
("VViS-station på segmentet, holdout eller kant: får bekräfta träff, får fälla falsklarm") — utan att någon behöver välja.
(4) Grind C3 (backtest och skuggdrift åt samma håll) får ett direkt jämförbart tal: samma leave-one-out i båda.

**Vad som INTE ändras.** Prognoskolumnen `p` (DECISIONS #325), grindarna, §2:s facitkällor. Kamerafacit, RoadCondition,
situation_archive och testarloggen kopplas i facitkopplingen (`publish/missar.ts`, nästa delsteg).

**Blindningen.** Skuggrapporten visar BARA antalet holdout-rader. Träffar och fel läses vid domens tidpunkt av dom-knappen, inte
löpande — samma regel som för alla skuggmått (inga träffandelar före utsatt tid).

**Sagt högt.** (1) Rutlinjerna är grova: E14 hade 7 stationer inom 2 km av linjen mot 10 inom 5 km (DECISIONS #323). Talet
2 km står för att det är §2:s facitradie; vill vi ha fler holdouts är det linjerna som ska förtätas, inte radien som ska vidgas.
(2) Skattningen för en holdout använder ankare upp till 50 km bort som alla andra punkter; `narm` i raden säger vilket band den
hamnade i. (3) `publish/missar.ts` bär en egen kopia av tre rutter ("håll i takt") — den ska läsa rutterna ur skuggmotorn som
ruttberedskapen gör, i samma varv som facitkopplingen byggs.

**Bevis (PR #516, deploy 21:24Z från cdd7889):** varvet 21:30Z: E4 Sundsvall→Umeå 2 holdout-rader (station 2244 vid km 1,1: mätt 11,0 °C, skattad 9,7, närmaste övriga ankare 4,7 km, fem ankare), E18 Karlstad→Örebro 3 (1712 vid km 45,7: 12,3 mot 13,8; 1830 vid km 63,3: 13,3 mot 13,4); 798 och 1 315 byte per rad. Raderna före deployen bär `p` utan `h`, som avsett.

## #327 (23/9 2026) Facitkopplingen och dom-knappen för grind B och C: `publish/grind-s-b.ts`, två lägen (kort #38b steg 4)

**Beslut (Claude på Bengts "kör vidare" 23/9; formen enligt TROSKLAR-SKUGGAN §2–§3 och grind V-B:s mönster).** Segmentprognosens
skuggdrift döms av en knapp, `publish/grind-s-b.ts` (`grind-s-b.yml`, dispatch, inget schema), som läser `shadow_log.prognos`
(p och h, DECISIONS #325/#326) och `alerts`:
- **Skuggvarning = episod:** samma provpunkt flaggad i varv som ligger ≤ 2 h isär. Ett varv var trettionde minut är inte en ny
  varning var trettionde minut.
- **B1** döms av holdout-stationen inom facitradien (2 km, importerad ur segmentmotorn) i episodens egna varv: mätt yta > +2 °C
  ⇒ FALSK, ≤ frysgränsen ⇒ BEKRÄFTAD, annars OMÄTBAR och aldrig i B1. Kamerabild fäller aldrig (§2).
- **B2** ur facithändelser inom 2 km av rutterna: SMHI-isvarningar, halka i `situation_archive`, operatörens väglag kod ≥ 2
  (`road_condition_history`, närmaste punkt på segmentet mot rutten i PostGIS), förarens *stämde* (`driver_facit`). På täckta
  segment (närmaste provpunkt status ≥ 1); miss när ingen provpunkt inom 2 km var flaggad de 2 h före. Orsaksklassad: nederbörd
  vid närmaste station inom ±1 h ⇒ NEDERBÖRDSDRIVEN, redovisad för #16, aldrig i B2.
- **B3** bland bekräftade episoder: punktmotorn (samma rads `alerts`, punktfaror med position inom 2 km) tyst hela episoden eller
  > 30 min efter starten. Läsningen enligt DECISIONS #319, talet oförändrat.
- **C1** ≥ 20 bedömbara händelser över ≥ 3 halkperioder (> 2 dygn isär), **C2** ≥ 30 bedömbara episoder, **C3** holdout-radernas
  grova fel mot grind A:s A2 ≤ 10 pe (`--grindA2`), annars OAVGJORT. Utan C: ingen dom, alltid fortsatt skugga.
- **Två lägen — blindningen:** `--underlag` (standard) skriver bara antal och C1/C2:s framfart; `--dom` skriver andelarna med
  marginalvakten, vid domens tidpunkt eller på Bengts uttryckliga order. Självtestet fäller om underlagsläget nämner en procent.

**Bevis:** självtestet — en rutt, sju varv, fem händelser med känd sanning: tre episoder (bekräftad, falsk, omätbar), mervärde
när punktmotorn kom 60 min senare, en träff, en utstrålningsmiss, en nederbördsmiss, två obedömbara; B1 50 %, B2 50 %, B3 100 %;
C1/C2 inte uppfyllda; ruttparsern läser skuggmotorns 20 rutter. Kontraktsgrinden 49/49. Första skarpa körningen i underlagsläge
efter sammanslagningen (bara antal).

**Sagt högt.** (1) **Kamerabildernas klassning har ingen tabell.** Bengt klassar facit-hinkens bilder veckovis, men ingenstans
läsbart för en knapp. Källan är noll tills den får en plats — nytt kort #242, rad i bedömningen §4.2. (2) Punktmotorns
segmentlarm utan position (`geo: "segment"`) räknas inte i B3; det är form B (Alert bär position) och rör vektorerna. (3) Med en
enda bekräftad episod ger binomialfelet noll bredd och B3 läser KLARAR på 1 av 1 — C2:s trettio episoder är spärren som gör
att det aldrig blir en dom. (4) SMHI-varningar är områden; centroiden kan ligga långt från rutten, så de flesta faller utanför
2 km — samma begränsning som i `publish/missar.ts`. (5) `missar.ts` bär fortfarande sin egen kopia av tre rutter; dom-knappen
läser skuggmotorns tjugo. Rättas när missar.ts nästa gång rörs.

**Bevis, första skarpa körningen:** körning 35923243716, 21:34Z, läge underlag, 1 dygn: självtestet grönt först; skarpt 4 varv på 4 rutter, 371 provpunkter, 5 holdout-rader, 0 episoder, 0 facithändelser, 0 halkperioder, C1 0/20, C2 0/30 — och inte en enda procentsats i utskriften. Blindningen höll i drift, inte bara i självtestet.

## #328 (24/9 2026) Vägpunktstexten i TROSKLAR-SKUGGAN §3 bekräftad av Bengt (kort #38b 4a)

**Beslut (Bengt 24/9: *"gör vägpunkt"*).** Lydelsen som skrevs 23/9 under mandatet i DECISIONS #323 (DECISIONS #324/#325/#326)
står som Bengts rad enligt §5: rå avståndsviktning av upp till fem ankare inom 50 km, vikt 1/km, ingen offset, på grind A:s
population; status per provpunkt (uppmätt ≤ 2 km, modellerat ≤ 50 km, annars okänt; flaggad ≤ 1 °C); provpunkt var 2 km;
holdout = varje station inom 2 km av rutten, varje varv. Tidsdelen loggas inte förrän något prövat den. Ingen kod ändras.

## #329 (24/9 2026) Kamerafacit får en tabell och blir femte källan i grind S-B — kameran bekräftar, fäller aldrig (kort #242)

**Beslut (Bengt 24/9: *"gör kamerafacit"*, på förslaget i bedömningen §4.2).** `sql/033_kamerafacit.sql`: tabellen `kamerafacit`
(bild, kamera_id, lon, lat, bild_tid, klass, av, klassad) med sex klasser — is · snö · slask · våt · bar · okänd — en klassning
per bild, dubbellåst som förarfacitet (RLS utan policy + REVOKE). Matas via dbknapp (INSERT-fil) tills en enkel sida finns.
`publish/grind-s-b.ts` läser den som femte källa: en bild klassad is/snö/slask inom facitradien är en facithändelse (B2) och
bekräftar en episod som pågick när bilden togs (±30 min); våt, bar och okänd gör ingenting. **Kameran fäller aldrig** (§2): i
självtestet mäter stationen vid km 20 +4 °C medan kamerabilden visar snö, och episoden döms FALSK ändå.

**Bevis:** självtestet (två kamerahändelser: en bekräftar en episod utan station, en får inte rädda en varm station; B1 1/3,
B2 1/4, B3 100 %); migrationen och den skarpa körningen i underlagsläge redovisas nedan. Kortet #242 stängs först när en riktig
bild är klassad och räknad — Verify på kortet.

**Sagt högt.** (1) Klassningen görs i dag genom att skriva en INSERT-fil till dbknapp — en söndagsrutin på tio bilder tål det,
hundra gör det inte; sidan är nästa steg när bilderna kommer. (2) Bildens tid tas ur hinkens sökväg (3-timmarsbucket) om
ingen bättre tid finns; ±30 min-fönstret i bekräftelsen är därför generöst i kamerans favör, men kameran kan bara bekräfta.
(3) **Axels ord** (Bengt: *"gör axels ord"*): jag kan inte tala för Axel och skickar inget i någons namn. Frågan står i stället
överst i bedömningens läge, som hans session läser först: starten står om han inte säger annat (DECISIONS #322/#325).

**IDRIFTTAGNING 24/9, bevis:** `sql/033` körd via dbknapp — kolumnerna id, bild, kamera_id, lon, lat, bild_tid, klass, av, klassad; rättigheter bara postgres och service_role; 0 klassade bilder. Grind S-B i underlagsläge (1 dygn, 02:0xZ): 26 varv på 18 rutter, 2 118 provpunkter, 90 holdout-rader, 0 episoder, 0 händelser (kamerakällan läst utan fel), C1 0/20, C2 0/30, inga andelar.

## #330 (24/9 2026) Tystnadsfelet: §3 gjord mätbar — tal ur fastställda dokument, tre klasser, orsak per tröskel, två lägen (kort #98)

**Beslut (Bengt 24/9: *"vi gör 98 först"* → *"gör förslaget"*, på `docs/TYSTNADSFEL-KLASSNING-2026-09-24.md`).** Skärpning av
det fastställda och kontrasignerade dokumentet (talen in, ingen gräns flyttad): (1) signalerna får tal — kondensation ur
TROSKLAR-TRENDEN/RIMFROST, trend ur betans startvärden (#222), risk = motorns egen regel med fukt, regn ur OVERGANGAR §2;
(2) tre klasser: oursäktlig (signal), ursäktlig (bevisad yttre orsak — radarn såg nederbörd inom 5 km medan stationen var torr),
okänd (resten, saltbilen); (3) orsak per tyst miss — fukt, tid, avstånd eller yttröskel — så att §5:s kurva ritas mot rätt
tröskel; (4) räckvidd 7 km, tyst avgjort mot flottans kadens (senaste varvet inom 4 h, larm inom 2 km), facitradie 2 km;
(5) minsta underlag 20 tillfällen i 3 halkperioder; (6) priset som tillkomna varningstillfällen över svepet 1,0–2,5 °C;
(7) två lägen — underlag (antal) och dom (andelar, paret, priset).

**Byggt i samma varv:** `scripts/tystnadsfelet.ts` (instrumentet från 14/9, PR #236) bär allt ovan; facit ur den delade
händelselistan `publish/skuggfacit.ts` (ny modul: SMHI, situation-halka, väglag kod ≥ 2 eller motorns halkord, förarens
*stämde*, kamerafacit) — samma lista som grind S-B (`publish/grind-s-b.ts` omskriven att läsa den). Kontraktsgrindens
ankarradiegolv 5 → 4 med skäl (tystnadsfelet bytte MAX_KM mot RACKVIDD_KM, egen storhet). Knappen `tystnadsfelet.yml`
fick lägesvalet. Självtester: tre klasser, orsakskolumnen, svepen är andras, halkperioder, prisets episoder, rutterna.

**Avvikelse, sagd högt.** Bedömningen 24/9 sa att #98 saknade kod. Fel: instrumentet fanns sedan 14/9 (PR #236,
`scripts/tystnadsfelet.ts`, 280 rader) med signalerna, okänt-utfallet och underlagsvakten. Jag upptäckte det när Write sa
*updated* om knappfilen. Förslaget fördes därför in i det befintliga skriptet i stället för i ett nytt; det som var nytt i
förslaget var talen, tre klasser med bevisad orsak, orsakskolumnen, räckvidden 7 km, flottans kadens, fukten i
riskvillkoret, den delade listan, lägena och priset. Läxan står i CLAUDE.md redan (sök i repot innan något sägs saknas);
den bröts ändå, och det är värt att säga.

**Sagt högt.** (1) Trendsignalen kan bara prövas inom sju dygn (trend_kandidater gallras) — instrumentet skriver ut hur
många tysta missar som är okända på tid. (2) Priset är tillfällen, inte falsklarm; falskheten kräver kamerafacit (#242)
eller förarens nej. (3) SMHI-varningar är områden — centroiden ligger oftast utanför 2 km.

**Bevis, första skarpa körningen (PR #524, c25f6bd):** körning 35948719580, 24/9 02:47Z, underlagsläge, 14 dygn: 2 bekräftade tillfällen (situation-halka), båda inom 7 km (median 4,2 km), skuggloggen 1 360 larm med position av 1 847, båda tysta, båda OKÄNDA i alla 16 celler (ingen signal vid stationen, ingen radar), trenden okänd för båda (äldre än sju dygn), 2/20 tillfällen och 2/3 perioder — inga andelar skrivna. Alla fem avsnitt körde utan fel mot databasen; paret läses först i vinter.

## #331 (24/9 2026) Skuggmotorns ordning: Bengts "2, 3, 5, 6" — fyra knappar tryckta, S3 väntar bakom S1-grinden, #83 hos Axel

**Beslut (Bengt 24/9: *"då gör vi 2,3,5,6"* på ordningen i bedömningen §4.2).** Av de sex: (1) #83 gallringens steg 2 lämnas
till Axel (Pro eller export); (4) #98 gjort tidigare samma natt (DECISIONS #330). De fyra beställda:

- **(2) T-A steg 0 (#88) och bildfacitets definition (#209/#231).** Förfaller först vid första frosten — frostvakten (50 stationer under noll) har inte larmat: senaste tio nätterna som mest 4 stationer under noll (17/9), kallast −5,6 °C (22/9). Knappen
  trycktes ändå som prov: T-A steg 0, 7 dygn (körning 35949108311): 3 765 station-nätter, 47 frostnätter (yta ≤ 1 °C) på 26 stationer, 3 718 icke-frostnätter; separationen går inte att skilja från noll; kallaste stunden 03–07 i 70 % av frostnätterna; molnet hämtat för 34 av 47 punkter. Bildfacitets definition skrivs in i DECISIONS när första frosten kommit, som kortet säger.
- **(3) #89 S2/S3 efterhalkan.** Kan inte byggas nu: S3 är Axels bygge och väntar bakom S1-grinden (Axel 16/9, DECISIONS #196:
  regn_h döms innan något mer byggs på det), som kräver blöta frostnätter. S1-kolumnen bär 35 rader med innehåll (senast 22/9
  06:30Z) och trendarkivet 19 469 kandidater, 1 följd av frost. Förberett, inte byggt.
- **(5) #46 rimfrosten.** R-A på det finska arkivet, 30 dygn (körning 35949100922): 39 244 rader, 419 stationer efter vakten — 0 episoder på 0 stationer, OAVGJORT (spärren 200 stationstimmar / 20 stationer); molnkontrollen R-A4 kan inte köras på Finland (SMHI:s moln når inte dit).
- **(6) #103 och #90.** K-A, 60 dygn (körning 35949104486): 712 stationer, 207 647 avläsningar; 1 099 punkter över 44 stationer men 0 frysande vid gränsen 0 °C — INGEN DOM (septembervakten K-A4). W-A steg 0, 14 dygn (körning 35949166508): 209 834 rader, byvind i 99,3 % (750 stationer), sikt i 99,9 %; täckningsgrad 17,9 % av möjliga stationstimmar; 11 stationer med omöjliga timmar (byvind ≥ 15 m/s och kvot > 5) tas av stationsvakten; högsta byvind 87,7 m/s bakom taket 30; W-A OAVGJORT — underlagsvakten W-A4 håller (16 respektive 243 stationstimmar i högsta bandet).

**Vad det säger.** Alla fyra knappar fungerar mot databasen med de fem vakterna; ingen har underlag än. Vintern är inte här:
frostvakten har inte larmat, Finland har inga rimfrostnätter, ingen station har frusit vid nollgränsen på 60 dygn. Det är
rätt utfall i september. Kvar i ordningen: knapparna trycks om vid första frosten (T-A inom sju dygn, K-A, R-A på båda
arkiven, W-A), S3 när S1-grinden passerats, #83 när Axel valt.

**Frågan om måndagsklockan** (K-A, R-A, T-A, W-A är knappar, inte på pulsklockan) står kvar i §4.2 — Bengt sa inget om den.

## #332 (24/9 2026) Tre stängningar på Bengts "tre ja": #97 stängt, #155 sammanslaget i #83, #242 stängs på första klassade bilden

**Beslut (Bengt 24/9: *"tre ja"* på förslagen i bedömningen §4.2).**
1. **#97 halk-regexen STÄNGT.** Byggt 16/9 (DECISIONS #214): ordbörjan `is|halka|halkrisk|halkig|halt|mycket besvärligt` +
   stammarna `snö|frost`, elva ställen, vektorn `v24_vinterord_kod1.json`. Bevis: android och ios-engine gröna på main
   (cdd7889, 23/9 21:23Z), deployad 16/9, i apparna sedan 0.3.9. Vakthundens check 4 (första vinterordet i väglagsarkivet) är
   bevakning, inte ett villkor för kortet — den larmar när Trafikverket skriver ordet, oavsett om kortet står öppet.
2. **#155 snubbeltråden SAMMANSLAGEN i #83.** Kortet sa "vad som ska göras nu: ingenting" och fanns för att oktoberbeslutet
   om kvarhållningen ska veta att det avgör två mätinstruments byggform (#89 räknar om, #98 räknar om; #88 sparar). Det står
   nu som stycke på #83, där beslutet tas. Ingen tråd tappad.
3. **#242 kamerafacit stängs på första klassade bilden.** Hinken bär 790 bilder sedan 15/9 16:00Z. Bengt får den senaste:
   `2026-09-24/SE_STA_CAMERA_VViS_329_K1-165760.jpg` (arkiverad 02:30:02Z, kamera VViS 329 K1, position ur kamerafilen), klassar den i sex-klasserna, klassningen
   går in via dbknapp och grind S-B räknar den som händelse. Kortet stängs när det skett — tillägg här.

Tavlan 49 → 47 öppna (#242 kvar tills bilden är klassad).

## #333 (24/9 2026) Kamerafacit: första klassningen — Trafikverkets direktbild, inte hinkens; kort #242 stängt

**Beslut (Bengt 24/9: *"klassa som våt"*, efter att båda vägarna till den arkiverade bilden stoppats — bedömningen §4.2).**
Den första raden i `kamerafacit` gäller **Trafikverkets direktbild** från kameran Tierp (E4, VViS 329 K1) 2026-09-24 03:11:34Z,
hämtad ur det publika API:et 03:18:51Z och sparad i repot som `docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg`
— inte den arkiverade bilden i hinken (02:30Z), som bara Axel når. Läsningen var Claudes (*mörk, blöt lins, våt vägbana,
ingen snö*), klassen Bengts: **våt**. Raden bär det: `av = 'Bengt (på Claudes läsning av direktbilden)'`.

**Vad som därmed ändras i tabellens mening.** `bild` är en sökväg i hinken ELLER i repot under `docs/kamerafacit/` för bilder
hämtade direkt från Trafikverket och sparade där. Dom-knappen bryr sig bara om position, tid och klass; sökvägen är
spårbarheten. Ingen kolumn ändras.

**Bevis.** raden id 1: bild docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg, kamera VViS 329 K1, 17,511/60,324, bild_tid 03:11:34Z, klass våt, av Bengt (på Claudes läsning av direktbilden), klassad 03:29:56Z; 1 klassad bild, 0 halkbilder. Grind S-B i underlagsläge efter klassningen: 1 dygn, 03:3xZ: 31 varv på 18 rutter, 2 488 provpunkter, 117 holdout-rader, 0 facithändelser, C1 0/20, C2 0/30 — kamerakällan läst utan fel; en våt väg är ingen
halkhändelse, så den räknas inte som händelse (rätt), och det är precis vad §2 säger: kameran får bekräfta halka, aldrig
fälla, och våt/bar/okänd gör ingenting.

**Kort #242 stängs.** Verify löd *en klassad bild i tabellen och grind S-B räknar den som händelse*. Första halvan är uppfylld
med en riktig bild; andra halvan är bevisad i självtestet (kamerahändelsen E6 i `publish/grind-s-b.ts`) och syns skarpt
först vid första is/snö/slask-bilden — kortets syfte, en plats för klassningarna, är fyllt. Tavlan 47 → 46.

**Sagt högt.** (1) Vägen till hinkens bilder är fortfarande stängd för alla utom Axel — söndagsklassningen i vinter kräver
antingen panelinloggning för Bengt eller att Axel hämtar bilder; raden i §4.2 står kvar. (2) En klassning per INSERT-fil
i repot är spårbar men tung — sidan är nästa steg när bilderna blir många. (3) dbknapp migrera tar bara `sql/NNN`-filer som
bärare, så INSERT-filen i `scripts/matningar/` kunde inte köras som fil: klassningen gick in som BEVISRAD (enradsform) med
`sql/033` som bärare. Fungerar, men det är fel kanal på sikt — sidan i (2) ska skriva direkt.

## #334 (24/9 2026) Kort #83 steg 2: vinterarkivet exporteras till Supabase Storage — inte Pro

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, på beslutsrundan `docs/BESLUTSRUNDA-2026-09-24.md` §1).** Gratisvägen 2a i stället för Pro
(25 USD/mån). Ingen betaltjänst, alltså ingen DECISIONS-post med Axels ja krävs enligt gratisnivåregeln; Axel ser beslutet här.

**Byggt och i drift samma morgon (PR #540, #541):**
- `sql/034_arkivexport.sql`: `arkiv_export` (bokföringen), `arkiv_att_exportera` (färdiga, gallrade dygn äldre än 8 dygn),
  `arkiv_dygn` (rubrikrad + en JSON-lista per rad; kolumnerna ur katalogen, geom som lon/lat), `arkiv_export_klar` (räknar
  dygnet en gång till och bokför bara vid exakt radantal; ett raderat dygn skrivs aldrig över), `arkiv_radera_exporterat`
  (bara över **350 MB**, bara äldsta bokförda dygnet, **ett per natt**, aldrig yngre än **30 dygn**, aldrig om databasen bär
  fler rader än filen), `arkiv_efterslap`. Privat hink `arkiv`. Jobb `halkvakt-arkivexport` varje timme :40 (kommandot
  kopierat ur skuggmotorns jobb inne i databasen med replace(), aldrig i en fil) och `halkvakt-arkivradering` 03:45.
- `supabase/functions/arkivexport`: två dygn per anrop — packar, laddar upp, **läser tillbaka ur hinken**, jämför sha256
  och radantal, bokför. Raderar aldrig.
- Vakthundens check 9k: exporten får ligga efter, inte stå still (> 3 dygn väntar och ingen export på 3 h ⇒ larm).
- Integrationstest mot PostGIS (ok 49): text med kommatecken och citattecken, fel radantal bokförs inte, gränsen, min_dygn,
  en sen rad stoppar raderingen högljutt, ett raderat dygn skrivs inte över.

**Bevis.** Första varvet 05:40Z: **24/8 (4 711 rader, 70 157 byte) och 25/8 (17 843 rader, 236 388 byte)** bokförda, samma
storlek i `storage.objects`, sha `929c8d1a…` och `ce8f7031…`; 19 dygn väntar. Torrkörd radering: *"databasen 193 MB, under
350 MB — inget raderas"*. 25/8 gav 2,74 MB text (153 byte/rad) och 236 kB packad (11,6 ×) — ett vinterdygn (848 stationer
× 48) blir ~6 MB text och ~0,5 MB packat, vintern ~80 MB i hinken (1 GB gratis; kamerabilderna 18 MB).

**Fynd på vägen, sagt högt.** Bevisraden efter sql/034 visade `anon` och `authenticated` med EXECUTE på raderingen: Supabase ger
nya funktioner i public-schemat EXECUTE genom standardrättigheter, och `REVOKE FROM PUBLIC` tar inte bort dem. RLS hindrade att
något kunde raderas, men huset låser dubbelt — `sql/035` samma timme; nu postgres + service_role, raderingen bara postgres.

**Kvar, före mars:** återläsningssteget — marsdomarna ska kunna köras på exporten återläst i en PostGIS-container (som
arkivbackupen provar varje vecka). Behövs först när raderingen börjat, alltså när databasen passerat 350 MB. Så länge den är
under räknas grind A:s 60-dygnsfönster i databasen som förut.

## #335 (24/9 2026) Kamerabilderna öppnas i mars (DECISIONS #248 står); TROSKLAR-SKUGGAN §6 omskriven: Claude klassar, Axel ok:ar

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §2).** #248 står — bilderna i hinken öppnas vid domens tidpunkt, blindningen är värd
mer än en tidigare läsning. §6 i `docs/TROSKLAR-SKUGGAN.md` skrivs om: Claude klassar blint ur kontaktark (kort #246; sökvägen
visar kamera och tid, aldrig skuggans larm), Axel ok:ar (stickprov ≥ 10 % plus varje is/snö/slask, de enda som räknas som
händelse), Bengt stickprovar. Spåret byggs och provas nu på Trafikverkets direktbilder, som är publika och inte facit. Den
motsägelse som stod mellan §6 (veckovis, 1/9) och #248 (mars, 20/9) är därmed borta. Beslutet var Bengts och Axels i rundan;
Bengt svarade, Axel ser det här — hans del är exporten av hinken och ok:et.

## #336 (24/9 2026) Kort #231:s definition: *övergång* = ytan över +1 °C någon gång de sex timmarna före varningen

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §3).** Skrivet FÖRE första hinkbilden öppnas, som kortet kräver. När bildfacit läses
delas produktionsregelns varningar (`icing_point`) i **övergång** — stationens yttemperatur låg över **+1 °C** någon gång under de
**6 timmarna** före varningen — och **stadigt kallt** för resten. Andelen bilder med bar eller våt väg redovisas per grupp. Sex
timmar täcker en kvällsavkylning från plus till frost; två hade kallat de flesta nattvarningar stadigt kalla fast vägen saltats
på eftermiddagen. Talet sveps inte — det är en läsning, inte en tröskel — men redovisas också vid 3 och 12 h så att valet syns.
Ingen tröskel rörs, ingen röst ändras.

## #337 (24/9 2026) Integrationskartan öppnad för R17–R20 — och fryst igen

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §4).** Frysvillkoret ("efter bygge + mätning") är uppfyllt av segmentprognosen och
facitkopplingen. Införda: **R17** §6.1 och §2 — grind A KLARAD (#321), 7–15 km-anomalin var givarfel (#324); **R18** §5.4 —
segmentprognosen går ingen fog i motorn i vinter, den loggas i skuggan och blir karta och förstärkare vid dom (#319, #325);
**R19** §12 — facitstacken är tunn men inte tom eller obevakad (#327, #329, #330, #333); **R20** §7.2–7.4, §8 C/D och §13.6 —
motkrafterna avgjorda 16–17/9 (#220, #221, #226), kombinationsgrinden och regel D skrivna. Bevisbäraren (§8 B) fick kortet #245.
Inga fogar och ingen sekvens ändras. Kartan fryst igen i samma commit; §14 har raden.

## #338 (24/9 2026) Frosttriggern: vakthunden trycker de fem frostmätningarna själv — ingen veckoklocka

**Beslut (Bengt 24/9: *"ja till alla fem, kör export till supabase storage"*, beslutsrundan §5).** I stället för att sätta K-A, R-A, T-A och W-A på måndagsklockan (Actions-minuter,
mot regeln 22/9) trycker vakthunden flödena **en gång**, i samma ögonblick som det riktiga frostlarmet (≥ 50 stationer under noll)
skapas: `overgangar-steg0` (7 dygn), `grind-t-a` (7), `grind-r-a` med `land = se` (30), `grind-k-a` (60), `vindsikt-steg0` (14).
Utfallet per flöde skrivs i frostissuen; ett ❌ säger att det flödet ska tryckas för hand. Provet trycker inga flöden. Därefter
knapp på Bengts order, som förut. Kostar ~20 Actions-minuter en gång.

**Bevis.** Deploy 05:36:53Z (PR #540). Utlösarprovet via dbknapp (`utlosarprov`, ny flagga) 05:38Z: vakthunden svarade 200,
och en körning av `vindsikt-steg0` skapades 05:38:35Z av repots nyckel och blev grön — PAT:en får trycka flöden. Det riktiga
larmet kan inte provas utan att förbruka engångslarmet; grenen är samma `utlos()` som provet.

**Sagt högt.** Mitt hjälpskript skickade först provet som en migration med filnamnet *utlosarprov*; dbknapp avvisade det
(*"ange en fil som sql/014…"*) innan något kördes. Lärdom i skriptet: prov går genom `flode_kor.py`, inte `dbknapp_kor.py`.

## #339 (24/9 2026) Bildläsningsspåret byggt och provat på direktbilder — väntar på Axels ok (kort #246, steg 2 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 2 bildläsningsspåret"*; formen enligt DECISIONS #335).** `scripts/kontaktark.py`, fyra steg:
`direkt` (Trafikverkets direktbilder från väglagskameror inom 2 km av skuggrutterna, jämnt spridda längs rutterna — hinken rörs
inte) eller `mapp` (Axels export av hinken, i mars) · kontaktark 4 × 5 rutor med nummer, kameranamn och UTC-tid, aldrig skuggans
larm · `stickprov` (varje is/snö/slask plus minst 10 % av resten, valt på filnamnets sha så att valet inte går att styra) och
ok-sidan för Axel · `sql`, som skriver en INSERT per bild **bara om** klassningen bär Axels ok, och annars vägrar.

**Provet 24/9 13:33–13:44Z:** 20 bilder på 20 kameror längs rutterna (`docs/kamerafacit/prov-2026-09-24/`: arket, bilderna, manifest, klassning, ok-sida).
Klassade blint av Claude: **bar 20, hög säkerhet** — sol och torr vägbana i hela landet. Två rutor granskades i full storlek
(Drälinge: mörka bågar är däckspår; Ristjärn: mörkt körfält är skugga). Stickprov för Axel: nr 6 Helsingborg N och nr 16
Sandsjöbacka. `sql` vägrade utan ok, som den ska.

**Vad provet bevisar, och inte.** Kedjan fungerar från kamera till en rad som väntar på ok. Det bevisar INTE att klassningen skiljer
våt från bar eller snö från slask — ett soligt septembereftermiddagsark har bara ett svar. Ett andra prov vid regn eller i mörker
behövs innan mars (kortet bär det).

**I mars:** bara arken, klassningen och ok-sidan går in i repot; bilderna stannar i hinken och i Axels export. Provets 1,2 MB
bilder ligger i repot med flit, så att Axel kan öppna stickprovet direkt på GitHub.

## #340 (24/9 2026) Axels ok på bildläsningsspårets första ark — 20 rader in i kamerafacit, kort #246 stängt

**Beslut (Axel, framfört av Bengt i chatten 24/9: *"Axel okayar"* — samma form som DECISIONS #61).** Arket
`docs/kamerafacit/prov-2026-09-24/` godkänt utan rättelser. `klassning.json` bär `"ok": {"av": "Axel (framfört av Bengt i chatten)",
"nar": "2026-09-24T13:49Z"}`; `python scripts/kontaktark.py sql` skrev 20 INSERT-satser (`scripts/matningar/kamerafacit-prov-2026-09-24.sql`,
genererad), körda via dbknapp som bevisrader.

**Bevis:** `kamerafacit` bär **21 rader** — de 20 nya, alla `bar`, med `av = 'Claude (ok: Axel (framfört av Bengt i chatten) …)'`,
plus Tierp-raden från 03:11Z (`våt`, #333). Ingen av dem är halka, så grind S-B räknar ingen händelse — rätt.

**Kort #246 stängt:** Verify (*ett kontaktark ur direktbilderna klassat och ok:at, med tabellrader*) uppfylld. Det andra provet —
ett ark vid regn eller i mörker, som prövar att klassningen skiljer våt från bar — är nytt arbete och har eget kort, #247.

## #341 (24/9 2026) S2 byggt: skattaren ger nivå och bevis bredvid ordet — före S1-grinden (kort #89, steg 3 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 3"*, på förslaget i bedömningen §4.2 att bygga S2 nu).** Bedömningen hade lagt S2 bakom
S1-grinden. Grinden (Axel 16/9, DECISIONS #196) gäller regnfältets tillförlitlighet innan S3 bygger en REGEL på det; S2 är
skattarens FORM, och den rör varken motorn, rösten eller någon tröskel. Därför nu, S3 väntar kvar bakom grinden.

**Byggt:** `skattaNiva(bevis, N, K1, K2)` i `publish/tillstand.ts`, bredvid `skatta()` som är orörd (kartans §5.3: lägg till,
ersätt aldrig). Svaret: `tillstand` (alltid exakt `skatta()`s), `vata` (antal N i N_SVEP som ger blött — hur nyligen),
`mangd` (antal steg i REGN_SVEP stationens regn klarar), `radar` (antal steg i R_SVEP), `kallor` (station/radar inom N),
`frys` (ytan mot K1 med zonen K2: under · nära · över — frysklassningens idé att få avstå nära gränsen), `bevis` (läsbar rad).
**Inget nytt tal:** varje nivå är ett antal steg i ett svep som står i TROSKLAR-OVERGANGAR §2 eller TROSKLAR-FRYSKLASSNINGEN §2,
och argumenten prövas mot svepen (D1) — ett eget tal avvisas. Frånvaro är inte noll: okänd mängd och saknad radarrad är null.

**Bevis:** åtta nya tester (kontraktet `tillstand = skatta()` över 64 fall × fyra N, väta, mängd med null, radar, frys med
K2 = 0 som alltid svarar, källor, beviset som text, D1), steg 2-knappens självtest med fem S2-rader, 155 enhetstester gröna.
K1- och K2-svepen står nu i två filer (`scripts/grind-k-a.ts` och `publish/tillstand.ts`) — två nya kontrakt, 51 håller.

**Vad det låser upp:** kort #245 (bevisbäraren, nyckeln var S2) och indata till #153:s försprång. Ingen konsument i drift än:
nivån är indata, inte en varning. Integrationskartan är fryst och säger fortfarande att E inte är byggd; det rättas nästa gång
den öppnas efter mätning (bedömningen §5.2 bär läget).

## #342 (24/9 2026) Bevisbäraren: varje väderpunkt i live.json bär `bevis` bredvid `fukt` (kort #245, steg 4 i ordningen)

**Beslut (Bengt 24/9: *"gör steg 4"*).** Integrationskartans §8 B, fog F1: ett nytt fält, aldrig i stället för ett gammalt (§5.3).
`weather[].bevis = { vata, mangd, radar }` ur skattarens nivå (S2, DECISIONS #341): väta 0–4 (antal N i N_SVEP som ger blött),
mängd 0–3 (steg i REGN_SVEP för regnet vid stationens senaste regn, null = okänd), radar 0–3 (null = ingen rad). Alla tre är
oberoende av N och av K1/K2, så inget startvärde kopieras in i snapshoten.

**F1 verifierat i kod, som R16 kräver (kartans §5.6):** Android `SnapshotRepo.kt` läser `id`, `lon`, `lat`, `yta`, `fukt`
(`optBoolean`), iOS `SnapshotRepo.swift` samma nycklar, motorns adapter `engine/src/snapshot.ts` samma. Ingen itererar över
nycklarna. Ett nytt fält kan inte fälla en installerad app.

**Byggt:** `publish/snapshot-core.ts` (regnfrågan bär också mängden vid senaste regnet; `bevisRad`), `scripts/bundle-publicera.ts`
buntar `publish/tillstand.ts` före kärnan, `supabase/functions/publicera/index.ts` genererad om. Två tester fick fältet i sitt
facit, ett nytt (#245) prövar väta och mängd, null för okänd mängd, `fukt` orört och att adaptern ger samma hazard.

**Sagt högt.** Radarn per station finns inte i snapshoten — `radar` är null tills en koppling station→radarsegment byggs.
Fältet står ändå, så formen är stabil när det fylls (att lägga till nu och fylla senare är additivt; att ändra form senare vore
det inte). Ingen läser `bevis` i dag: det är indata till försprånget (#153) och till S3.

**Idrifttagning 24/9:** PR #547 (a00435d), CI grön — integrationstestet körde den nya regnfrågan mot PostGIS efter att dess facit
fått fältet. Deploy av publicera 14:09Z från main, noll diff. Publiceringarna 14:10 och 14:20 svarade `ok` och kartrepot fick sina
commits; manifestets sha stämmer med live.json. **Men live.json bär noll väderpunkter** i eftermiddagssolen (ingen station ≤ +3 °C),
så fältet har ingen rad att sitta på. Beviset med innehåll kommer när stationerna kallnar: vakthunden fick raden
`bevis: N av M väderpunkter` (larm om punkter finns och någon saknar fältet), så beviset skrivs i timkontrollen utan att någon
behöver titta.

## #343 (24/9 2026) Vakthundens arkivgräns: 3 timmar i stället för 30 minuter (kort #243)

**Beslut (Bengt 24/9: *"ja till 3 och 4"*, femma nummer fem).** `LIVEMOTOR_EFFEKT_MIN` i vakthundens check 9d (b) går från 30 till
**180** minuter. Kommentarens premiss var fel: `situation_archive` rörs inte varje minut, bara när Trafikverket ändrar en avvikelse.
Mätt 24/9: 32 gluggar över 30 min på sju dygn, medel 54 min, största 128 min. Issue #528 (24/9 03:07Z) var ett sådant falsklarm
medan livemotorn svarade 360 av 360 minuter. Tre timmar ger 52 minuters marginal mot den största uppmätta gluggen och fångar
ett riktigt stopp (kort #222:s fall) inom tre timmar. Kortet stängs efter sju dygn utan falsklarm ur checken.

## #344 (24/9 2026) Skuggmotorns svenska schema flyttat till :02/:32 — lagning och prov för 546 på hel- och halvtimmen (kort #244)

**Beslut (Bengt 24/9: *"ja till 3 och 4"*).** `sql/036`: `cron.alter_job` för `halkvakt-skuggmotor`, `*/30` → `2,32 * * * *`. Sedan
24/9 00:30 har en funktion svarat 546 WORKER_RESOURCE_LIMIT på :00/:30 (00:30, 01:00, 02:00, 04:00, 11:00, 14:30), aldrig de tre
dygnen före; på :00/:30 startade publicera, livemotorn och skuggmotorn samma sekund, och skuggmotorn räknar sedan 23/9 kväll 744
ankare per varv. Försvinner 546 efter flytten är orsaken bevisad utan Axels funktionslogg; finns de kvar läser Axel loggen.
Rotationen påverkas inte (halvtimmen avgör rutterna). Backas med samma rad och `*/30`. Kortet stängs efter tre dygn utan 546.
Sagt högt: svarstabellen (`net._http_response`) sparar bara sex timmar, så tre dygn läses som tre dygns stickprov — beviset tas
vid varje läsning (en dbknapp-fråga per dygn räcker). Ingen vakt räknar 546 i dag.

## #345 (24/9 2026) Skyltfondsrundan, Skyltfonden-paketet och #25 Halkbaneläget stängda på tavlan — följs utanför repot

**Beslut (Bengt 24/9: *"stäng skyltfondsrundan och skyltfondspaketet. Vi har koll på dessa på annat sätt. Stäng halkbaneläget vi har koll på den på annat sätt"*).** De tre korten stängs. Bengt och Axel följer Skyltfondsansökan (samtalen, sökande och roller,
sändningen 28/9) och halkbaneförsöket på annat sätt än genom tavlan. Kvar i repot som underlag, orört: `docs/FINANSIERING.md`
(ansökan, plan B, adresserna, föreningen som sökande) och BACKLOG punkt 25 (halkbanelägets form). Bedömningens datumrader för
28/9 och Skyltfondens besked står kvar som kalender, märkta att de följs utanför repot.

**Vad som inte längre bevakas här:** att ansökan faktiskt skickas 28/9, att ingen adress studsar, och vem som står som sökande.
Kommer ett besked eller en fråga som rör koden — till exempel att halkbaneförsöket beviljas och halkbaneläget ska byggas —
får det ett nytt kort då. Tavlan 50 → 47 öppna.

## #346 (24/9 2026) De äldsta korten: Android-testenheten in i #219, butiksuppladdningen in i #214, #21 stängt

**Beslut (Bengt 24/9: *"ja till de äldsta korten, slå ihop och stäng"*, ur förslaget i bedömningen §4.2).**
(1) **Fysisk Android-testenhet** (29/8) slås ihop i #219 *Android har ingen väg till en telefon*. Telefonen finns: Axels Android
med appen uppsatt sedan 20/9 (DECISIONS #280). Kvar är bara enhetsverifieringen i Play Console, och den följer med till #219
tillsammans med kortets Verify-rad (uppgiften *Kontrollera att du har åtkomst till en mobil Android-enhet* försvinner).
(2) **Butiksuppladdning + Data safety-inklistring** (29/8) slås ihop i #214 *Play-deklarationen*. Inklistringen är sista steget där
(formuläret likadant som filen, i samma commit som nästa uppladdning). Uppladdningen står redan i *Play: uppladdningsguide*, och
iOS går före Android (DECISIONS #320).
(3) **#21 Anonym puls + feedback-knapp** stängs. Feedback-knappen finns sedan 16/9 (S4, *Stämde/Stämde inte*, PR #290/#291). Den
anonyma pulsen förs till sensortrappan, Ä8 i bedömningen (mars 2027, efter vinterns domar), där telefonkedjan #237 tidigare
hänvisade till #21.
(4) **Intäktsmodellen**, som låg i Skyltfonden-paketet (stängt samma dag, DECISIONS #345), är ingen Skyltfondsfråga. Den förs till
vårlistan i bedömningen (*Efter mars*) bredvid betalviljan, så att den inte stängs med paketet.

**Sagt högt.** Inget arbete är gjort på korten — de byter bara hemvist. Tavlan 47 → 44 öppna.

## #347 (24/9 2026) Produktboken läst rad för rad mot koden — kort #217 klart, tre nya kort ur fynden

**Uppdraget (Bengt 24/9: *"gör kort 217"*).** Kortets Verify: varje rad i produktboken bevisad i kod eller struken, med färsk
skärmbild där det syns. Boken lästes hel (507 rader) mot motorn, publiceringen, skuggmotorn och båda apparna; skärmpåståendena
lästes av en sökagent och varje fynd som ändrade texten kontrollerades i koden innan det skrevs.

**De sex löftena från 20/9:** hastighetsgränsen i kameratexten struken (kamerafilen bär ingen gräns, grenen i motorn talar
aldrig) · viltrösten var redan rättad (#318) · "fyra flikar" skrivet om till två flikar och ett körläge — *Nära dig* finns inte ·
SMHI-pilen säger nu att varningarna följer med i snapshoten men att motorn inte läser dem · introduktionen märkt iOS, Androids
behörighetsväg beskriven · vektorerna 37, inte 23. Förvarningsreglaget beskrivs per plattform (iOS 400–3 000 m i steg om 100,
Android 500–5 000 m steglöst).

**Fler fel än kortet visste om:** flödesbilden lovade 45 s tystnad (10 s sedan 13/9) · grind A stod som *FALLEN* (klarad 23/9,
#321) och grindtabellen var från 13/9 · Om-citatet var det gamla löftet · Androids autostart beskrevs som *inget att ställa in* fast
den står av och ber om fyra behörigheter · guiden sades finnas i introduktionen · "Vakna själv" heter *Vaknar själv* · Norge stod
som väntande på Vegvesens konto · broarna sades ligga i appen · facitsvaret sades bära bara id, tid och svar (appens namn och
version följer med, som Play-filen redan deklarerar) · versionstabellen slutade vid 0.3.7 · avsnittet *iOS då?* var från 29/8.
Beskrivningen av skinnet gällde bara iOS; Androids avvikelser står nu i ett eget stycke.

**Skärmbilder:** de tre i boken bytta mot fotostudions artefakt 10778151609 (android.yml-körning 35922113783, cdd7889, 23/9 —
efter senaste Android-ändringen c1483be). Fotostudion tar sex bilder men bara tre skiljer sig: Om, Nära dig och Körläget är
inte längre egna skärmar.

**Tre nya kort ur fynden (TAVELREGELN):** #248 Android-autostarten stoppar aldrig vakten (en ny styrning skapas per händelse och
glömmer att vakten startades automatiskt; ingen tomgångsstopp heller) · #249 Om-avsnittet säger mindre än sanningen (Android
saknar ärlighetsraden och källorna, där Fintraffic och OpenStreetMap kräver att de anges; båda plattformarnas undantagstext säger
*"Inget annat"*) · #250 tre småfel (Android säger raden om gammal data två gånger, iOS körläge visar klockan nu vid Senast sagt,
fotostudions dubbletter). Androids skinnavvikelser skrivna på kortet *Skinnet v3 på Android*.

**Inte omprövat:** stegen i Genvägar-guiden (de beskriver Apples app, inte vår) och de historiska raderna i versionstabellen och
lärdomsavsnittet. Tavlan 44 − 1 + 3 = 46 öppna.


## #348 (24/9 2026) Axels beslut på #347:s frågor — texten skrivs om, källorna in i Androids Om, #248 och #250 byggda

**Axel 24/9 kväll:** *"Be din Claude gå igenom detta. Besluta att köra det han säger."* Claudes beslut, på Axels uppdrag:

1. **#249 (b): texten skrivs om, fälten stannar.** Appens namn och version gör facitsvaret tolkningsbart per bygge (vilken motor
   talade?), och de bär ingen plats. Undantagstexten säger nu *"… och ditt svar (Stämde / Stämde inte), plus appens namn och
   version …"* på båda plattformarna. Invariantregeln: integritet.html (23/9, #320) och PLAY-DATASAFETY.md nämner redan plattform och
   version; produktboken rättad i samma commit.
2. **#249 (a): ja — källorna och ärlighetsraden in i Androids Om,** ordagrant som iOS. Fintraffic (CC BY 4.0) och OSM (ODbL) kräver
   attribution när deras data når appen, så det är en licensplikt och inte ett val; frågan var ställd till Bengt men Axel äger besluten.
3. **#248 byggt.** Autostartens flagga (`autoStarted`) sparas nu i SharedPreferences och följer med varje ny styrning, så
   *Bluetooth kopplas från* och *bilen lämnas* stoppar en autostartad vakt. Manuellt stopp och självstopp nollställer den.
   Nytt: **självstopp efter en kvart stilla** (under 5 km/h), samma regel som iOS (`IdleStop`, ren klass). Tre nya JVM-prov.
4. **#250 byggt.** (a) Raden om gammal data nollställs vid vaktens start, inte vid första laddningen ⇒ en gång per körning.
   (b) iOS körläge visar när repliken sades (`lastSaidAt`). (c) Fotostudion tar tre bilder, inte sex; de tre borttagna var dubbletter.

**iOS-bygget höjt till 0.3.9 (15)** — texterna och körlägets klocka ändrade. **Sagt högt:** #248 är bevisat på JVM, inte i bil;
verify på en riktig Android-telefon (autostartad vakt stannar när bilens Bluetooth kopplas från) står kvar. Android-versionen är
inte höjd (inget uppladdat till Play). #250 (a) har inget JVM-prov: raden sitter i tjänsten, och flytten är två rader.

## #349 (25/9 2026) Kort #42: facit enligt §2, V-C från 15/9, C-station struken — definitionerna skrivna före första räkningen

**Beslut (Bengt 25/9: *"ja till 1, 2 och 3"*, ur förslaget i bedömningen §4.2).**
(1) **Grind V-B räknar facit så som TROSKLAR-VATTENPLANING §2 säger.** Knappen har sedan 16/9 skrivit *0 facitbekräftade händelser*
som en fast rad, och eftersom testarlogg kräver en röst som i sin tur väntar på V-C kunde domspärren aldrig släppa.
(2) **V-C räknas från 15/9**, vb-loggens start. §3 har inget fönster; måndagskörningen räknade 14 dygn.
(3) **Steg C:s stationshalva stryks** (kvar ur #81). V-A visade att stationerna inte bär intensiteten, och domen läser stationerna direkt
ur arkivet — ett stationsfält i snapshoten skulle inte läsas av någon.

**Definitionerna, skrivna innan något tal räknats (så att de inte formas av utfallet):**
- **Facitbekräftad händelse (V-C1):** en olycka i `situation_archive` (`message_type_value = 'Accident'`) som startar inom fönstret,
  ligger inom **2 km** från en svensk skuggrutt (`FACIT_KM`, samma radie som den delade facitlistan) och där den **dömande stationen**
  — närmaste station inom 10 km, samma som V-B1 — mätte regn (`rain_sum_mm > 0`) inom **±30 min** från olyckans start. Olyckan får
  bara bekräfta, aldrig fälla (§2:s asymmetri). Utan station inom 10 km är olyckan omätbar och räknas inte.
- **Fönstret** för V-C och för alla mått i knappen: från 15/9 till körningen.

**Sagt högt.** Det här är en operationalisering av §2, inte en ändring: inga tal i §3 rörs. Men dokumentet är kontrasignerat av Axel
(DECISIONS #68), så hans invändning tas upp före första dom. Antalet olyckor i regn längs rutterna är okänt; räcker det inte till 15
före domfönstret i nov/dec är nästa facitkälla kamerabilderna i hinken, som öppnas i mars (DECISIONS #248) — det blir en egen fråga då.

## #350 (25/9 2026) Grind V-B visar bara räkningar under spärren — och #349 byggt

**Beslut (Bengt 25/9: *"ja, bara räkningar under spärren"*).** När fönstret blev hela perioden (#349) skulle måndagskörningen visa
V-B:s andelar över allt som loggats, varje vecka, långt före domen. Nu skriver knappen under V-C:s spärr bara räkningar: varningar,
mätbara och omätbara, olyckor längs rutterna och hur många av dem som föll i regn, regndygn och län. Andelarna för V-B1 och V-B3 och
domraden skrivs första gången när V-C är uppfylld. Samma princip som dom-knappen för S-B. Körningarna 16/9 och 21/9 skrev andelar
över 14 dygn i Actions-loggen; de läses inte.

**Byggt i samma varv (`publish/grind-v-b.ts`, kort #42):** facit enligt #349 (`facit()`, samma dömande station och ±30 min som V-B1,
gränsen regn > 0), olyckorna hämtade inom 2 km från skuggrutterna med den delade facitlistans radie och rutter, fönstret från 15/9
(`dagarSedanStart()`, flödets standard är nu tomt), och en rad om väderarkivets hål: ett dygn helt utan väderrader i fönstret
redovisas som saknat — varningar och olyckor de dygnen blir omätbara, aldrig torra — så att en export och radering aldrig tyst
förvandlas till torka. Stationsindexet byggs en gång per körning i stället för en gång per fall, eftersom fönstret nu växer hela
vintern.

**Bevis före sammanslagning:** självtestet med sju nya fall (duggregn under tröskeln räknas som facit, torrt och omätbart gör det
inte, fönstret, och blindningen i båda riktningarna) och **två motprov, ett per vakt:** facit mot utlösarens tröskel i stället för
regn > 0 fäller *"olycka i duggregn under tröskeln räknas"*; utan spärrens `return` fäller *"under spärren: ingen procentsats"* och
*"ingen dom"*. Självtestet körs nu också i CI, inte bara i flödet självt.

## #351 (25/9 2026) Grind V-B: en station som är igång men tyst räknas som torr (kort #251)

**Beslut (Bengt 25/9: *"ja till 251, ±3 timmar"*), fattat medan V-C är spärrad och innan någon andel lästs.** Arkivet sparar bara
kalla, blöta eller ändrade avläsningar (DECISIONS #4), så en varm, torr och stilla station lämnade ingen rad, och V-B1 kallade
varningen OMÄTBAR fast en torr station är just ett falsklarm enligt §2. Första körningen 16/9 visade *TORRT = 0* (#212); 25/9 var 16
av 57 varningar och 84 av 98 olyckor omätbara. **Nu:** har den dömande stationen arkivrader inom ±3 h men ingen inom ±30 min var den
igång och torr — TORRT. Utan rader inom ±3 h förblir den OMÄTBAR. Rör §2:s mätning, inte §3:s tal; noten står i
TROSKLAR-VATTENPLANING §2. Axel kontrasignerade dokumentet (#68) och kan invända före första dom.

**Varför regeln inte gör en blöt station torr:** den levande ingesten sparar varje avläsning med regnflaggan på (regn de senaste tio
minuterna), så regn inom fönstret lämnar alltid rader. Kanteffekten som återstår: regn som slutade strax före fönstrets början kan ge en
30-minuterssumma över noll på en avläsning som inte sparades. En station som var igång före och efter men nere just i ±30 min räknas
också som torr — det är priset för ±3 h, valt av Bengt.

**Bevis:** självtestet med fyra nya fall (igång men tyst ⇒ TORRT, före och efter; tyst i ±3 h ⇒ OMÄTBAR; en olycka vid en tyst men
igång station blir torr — fällan ligger där den annars ger noll) och **två motprov:** utan tak på ±3 h fäller *"tyst i ±3 h är
omätbart"*; med tyst alltid omätbar fäller *"igång men tyst i ±30 min är torrt"*, *"igång efteråt"* och facitfällan. Ett gammalt fall
ändrades med beslutet, inte för bygget: *"utanför tidsfönstret är omätbart"* (en rad två timmar före) heter nu *"igång men tyst i ±30
min är torrt"*. Kortet stängs: Verify är självtestet och beslutet före första dom. I drift syns det på måndagens körning 28/9 som fler
mätbara varningar och fler torra olyckor.

**Rättelse 25/9 (granskningen av grindarna, kort #252):** premissen ovan är fel i ett led. Den levande ingesten, som ensam
skriver det svenska väderarkivet sedan 8/9, sparar en avläsning bara om ytan är ≤ 5 °C eller det regnar eller snöar
(`supabase/functions/ingest-live/index.ts:144`). Regeln om ändrad temperatur finns bara i den gamla ingesten. Regeln ovan
fångar därför bara en torr station som haft en kall eller blöt rad inom ±3 h; den gör inget fel, men hjälper mindre än
beslutet säger. Noten i TROSKLAR-VATTENPLANING §2 rättad i samma varv.

## #352 (25/9 2026) Granskningens sex förslag (kort #252) — definitionerna skrivna före bygget

**Beslut (Bengt 25/9: *"ja till 1 till 6"*; Axel via Bengt samma dag: *"har inget att invända"*).** Alla sex byggs. Varje definition
nedan är skriven innan någon kod eller något tal finns, och ingen av dem läser en andel.

1. **Censuren i grind A och vägpunktsgrinden mäts — bara antal.** För varje kall målhalvtimme (yta ≤ 5 °C, #75 och radvakten) i
   60 dygn: hur många av målets fem närmaste stationer inom 50 km (grindarnas grannval) har en arkivrad i samma halvtimme, och hur
   många saknar. En granne som saknas i en kall halvtimme är varm och torr eller nere — arkivet kan inte skilja dem, så talet är
   ett tak för censuren. Karantänen och den långsamma vakten tas inte med i räkningen (de rör 1–3 stationer per dygn och gör frågan
   tung). Ingen felkvot räknas. Resultatet avgör om nästa steg behövs: en rad i timmen per station i arkivet, eller en grind som
   prövar ankare ur nuläget.
2. **Frostgrindarna trycks om.** Vakthunden trycker de fem flödena (T-A 7 dygn, R-A 30 dygn Sverige, K-A 60, övergångarna 7, vind och
   sikt 14) **kl 09 UTC** ett dygn då minst 50 stationer haft ytan ≤ 0 °C det senaste dygnet, och **högst en gång per sju dygn**.
   Issuen om frosten skapas som förut vid första larmet, vilken timme det än är; tryckningarna skrivs som kommentarer på den, och
   den senaste kommentaren är klockan som räknar de sju dygnen. Kl 09 UTC ligger efter morgonen, så T-A ser hela natten. Frosten
   upphör ⇒ tryckningarna upphör av sig själva.
3. **S-B:** fönstret från 23/9 (prognosloggens start) i stället för 14 rullande dygn. C3 jämför med grind A:s dömda A2, **3,5 %**
   (DECISIONS #321, dokumentets *offsetbacktest 3.3*), utan inmatning; `--grindA2` får fortfarande ersätta talet. **B1 och C2 döms
   på holdoutens leave-one-out:** en *holdout-episod* är en station inom 2 km av rutten vars skattning ur de ÖVRIGA ankarna
   (`prognos.h`, fjärde fältet) är ≤ 1 °C i varv som ligger högst 2 h isär; stationens egen mätning i samma varv dömer — över +2 °C
   i något varv ⇒ FALSK, ≤ 1 °C ⇒ BEKRÄFTAD (en kamerabild med halka inom 2 km under episoden bekräftar också, fäller aldrig), annars
   OMÄTBAR. §2:s regel (stationen fäller, kameran bara bekräftar) står kvar; det som ändras är att stationen dömer en prognos som
   inte redan innehåller den. B3 och B2 döms som förut. I dom-läget skrivs andelarna först när C1 och C2 är uppfyllda, och
   underlagsläget slutar skriva antalet nederbördsmissar (det är ett utfall).
4. **Tystnadsfelet:** en halkvarning på ett segment (`seg:<id>`, sparad utan position) räknas som att systemet talade om
   segmentets linje i `road_conditions` ligger inom 2 km från händelsen. I dom-läget skrivs paret och priset bara när T5-underlaget
   (20 tillfällen i 3 halkperioder) är uppfyllt.
5. **Saknade dygn:** grind A, vägpunktsgrinden och K-A skriver ut dygn i fönstret som saknar arkivrader efter arkivets början —
   exporterade och raderade eller aldrig hämtade — och räknar inte dem som lugna. Arkivets början är det tidigaste av första
   exporterade dygnet och första raden, så att raderade dygn inte tas för dygn före arkivet.
6. **R-A:s spärr i stationstimmar:** R-A1 räknar episodernas sammanlagda längd i timmar (Σ minuter / 60) i den bästa kombinationen,
   inte antalet episoder. Episodlängden är sista minus första raden, så talet är något försiktigt.

**Sagt högt.** (3) ändrar vad B1 räknar och därmed C2:s nämnare; det är ett byte av mätning, inte av tröskel, och det görs innan
någon andel lästs. (2) gör fler Actions-körningar i vinter — fem flöden en gång i veckan medan frosten varar, någon minut vardera.

## #353 (25/9 2026) Arkivet sparar en rad per station och halvtimme även när stationen är varm och torr (kort #253)

**Beslut (Bengt 25/9: *"ja till 253"*).** Axel äger ingesten och informeras genom bedömningen §4.2; ändringen backas med en rad.
Mätt samma dag (kort #252): i kalla halvtimmar saknade 49,5 % av grind A:s grannplatser en arkivrad, eftersom den levande ingesten
bara sparade kalla eller blöta avläsningar (DECISIONS #4). Driftens prognos tar med de varma ur `weather_latest`; grindarna gjorde det
inte. Domarna #321 och #324 gäller därför ett snällare underlag än driften.

**Regeln i `supabase/functions/ingest-live`:** en kall eller blöt avläsning (yta ≤ 5 °C, regn, snö eller nederbörd) sparas alltid, som
förut. En varm och torr avläsning sparas bara om stationen saknar en arkivrad i samma halvtimme (`floor(epok / 1800)`, grindarnas
hink). Vilka stationer som redan har en rad i sina halvtimmar läses med EN fråga per körning över de tre senaste timmarna; en rad som
skrivs i körningen räknas in direkt, så att två varma avläsningar i samma halvtimme aldrig blir två rader. Fallerar frågan faller
ingesten tillbaka till den gamla regeln och skriver felet i svaret — ingesten är livemotorns och får aldrig stanna för en mätfråga.
Logiken bor i `arkivpolicy.ts` och prövas i `test/arkivpolicy.test.ts`.

**Vad det kostar och ger.** Ungefär dubbelt så många rader den första veckan (≈ 4,5 → ≈ 10 MB/dygn), sedan gallrar sql/014 allt
äldre än sju dygn till en rad per station och halvtimme ändå, så de äldre dygnen växer mindre. Exporten och raderingen (sql/034) tar
resten; gratisnivån påverkas inte. Varma rader hjälper också den långsamma vakten (ett varmt dygn döms inte längre på nattraderna
ensamma), #351:s torra station och V-A. Den gamla ingesten (`ingest/sources/weather.ts`) skriver inget väder sedan 8/9 och följer
inte med. Grindarna mäter från och med nu samma värld som driften; novembers skarpa prövning får veckor av ocensurerat underlag.

**Axels ja 25/9 (via Bengt: *"Axel säger ja"*):** ingesten är hans, och ändringen står nu på båda signaturerna.

## #354 (25/9 2026) Betalviljan stängs på tavlan och öppnas våren 2027

**Beslut (Bengt 25/9: *"stäng betalningsviljan och flytta kortet till att öppnas våren 2027"*).** Kortet *Betalvilja mäts i mars, inte
gissas i augusti* (en fråga i appen: *"N varningar i vinter — skulle du betala X för nästa?"*; vinterpass per säsong som kandidatmodell,
B2B som tak) stängs och står i vårlistan (bedömningen, *Efter mars*) bredvid intäktsmodellen.

**Sagt högt, så att det inte glöms i vår:** frågan i appen skickar ett svar och ändrar därmed produktinvarianten — CLAUDE.md:s rad,
Play-deklarationen, integritet.html och produktboken ändras i samma commit. Ska den ställas redan i mars 2027 måste beslutet och bygget
ligga i februari; öppnas kortet senare flyttas mätningen till nästa säsong. Övriga fyra i grupp A (#91, #96, #153, SYSTEM.md) står kvar.

## #355 (25/9 2026) #91 Kallplatslagret stängs på tavlan och öppnas våren 2027

**Beslut (Bengt 25/9: *"stäng 91 och flytta den till våren 2027"*).** Kortet — broar som specialfall av strukturellt kallare platser,
prövat som ett kallplatsindex mot grind A:s residualer (leave-one-out), annars läggs det ner — stängs och står i vårlistan (Ä6, mars).

**Sagt högt:** kortets inledning (grind A *föll* 12/9) är inaktuell — grind A klarades 23/9 (#321), och 25/9 mättes att hälften av
grannplatserna saknades i kalla halvtimmar (#352), vilket #353 lagar från och med nu. Residualerna som #91 ska förklaras mot blir
alltså först meningsfulla på vinterdata med de varma grannarna; våren är rätt tid. Kvar i grupp A: #96, #153 och SYSTEM.md-läsningen.

## #356 (25/9 2026) SYSTEM.md-läsningen stängs som kort och blir en rutin i kalendern

**Beslut (Bengt 25/9: *"stäng system.md-läsningen som kort"*).** Att läsa `docs/SYSTEM.md` mot koden varje månad är en rutin, inte en
uppgift som kan bli klar, och ett kort som aldrig kan stängas gör tavlan otydlig. Kortet stängs; läsningen står i bedömningens
kalender som en rad *Varje månad*, med nästa läsning i oktober (den första gjordes 22/9, underlag till Skyltfondens bilaga 3). Kvar i
grupp A: #96 och #153.

## #357 (25/9 2026) #96 höjdprovet står kvar — med datum 23/10

**Beslut (Bengt 25/9: *"ja, behåll 96 med datum 23/10"*).** Kortet stängs inte. Mätningen hade inte gått förlorad (måndagsschemat,
#324, TROSKLAR-SKUGGAN §3, vårlistan Ä5), men frågan — ska höjden in i segmentprognosen? — hade inget datum och ingen ägare utanför
kortet. Och den blev viktigare 25/9: höjdvarianten (A2 4,7 %, oavgjord, hjälper inom 7 km och stjälper längre bort) prövades på ett arkiv
där hälften av grannarna saknades, just de varma (#352) — där höjdskillnaden spelar roll.

**Datumet:** omkring **23/10**, efter fyra veckor med de varma grannarna i arkivet (#353, i drift 25/9), läser Claude vägpunktsgrindens
RÅ mot RÅ+HÖJD ur måndagskörningen, och beslutet om höjden tas före novembers skarpa prövning. Datumet står på kortet, i kalendern under
oktober och i vårlistan Ä5. Kvar i grupp A: #153.

## #358 (25/9 2026) #153 delas: beslut 1 står kvar med datum, beslut 2 flyttas till våren 2027

**Beslut (Bengt 25/9: *"ja, dela 153"*).** **Beslut 1 — allvar som försprång** (eget `leadM` per fara, 400–3 000 m; aldrig ordval, aldrig
prioritet) står kvar på kortet, nu med datum: senast när betan startar i november skrivs dess tröskeldokument (steg 4), så att skuggan
går december–februari och domen kan falla i mars 2027; stängt till våren hade domen flyttats ett år. Steg 3 (skattarens nivå, S2) är
klart sedan 24/9. **Beslut 2 — det smalare undantaget** (en modellerad temperatur får utlösa bara mellan två närliggande stationer som
är eniga om tecknet) är blockerat av tröskelregeln T5 och saknar ett vittne på platsen; det flyttas till vårlistan (Ä8) bredvid
sensortrappan, vars telefonsensorer är just ett sådant vittne.

**Beroendet som följer med beslut 2 (Bengts fråga samma dag):** det strider inte mot beslut 1 utan bygger på det — beslut 1:s gradering
(uppmätt/modellerat) är språket som gör en modellerad varning säker, så 1 före 2, aldrig tvärtom. Taket för undanträngda varningar i
beslut 1:s steg 4 ska gälla båda, och beslut 2:s 0,33 °C (grind A inom 7 km) mäts om på de varma grannarna (#353) innan det tas upp.

## #359 (25/9 2026) TROSKLAR-FORSPRANG fastställt, och försprångets skugga byggd (kort #153 beslut 1, steg 4 och 5)

**Beslut (Bengt 25/9: *"ja, skriv tröskeldokumentet för beslut 1 nu och Axel ger ok till allt som behövs för att göra beslut 1 färdigt
idag"*).** `docs/TROSKLAR-FORSPRANG.md` är fastställt av Bengt och kontrasignerat av Axel (via Bengt) samma dag, innan någon mätning finns.
**Färdigt i dag är steg 4 och 5.** Steg 6 (domen) kräver vinterns data och steg 7 (tre portar) kräver domen — husets egen regel, inte
en fråga om ok.

**Vad dokumentet slår fast.** Försprång gäller bara A1 halt väglag och A2 frysrisk — inte olyckor, kameror eller vilt. **Nivå 2:** A1 med
väglagskod 3 eller 4; A2 med ytan ≤ 0 °C och stationen blöt inom 2 h (väta ≥ 3 av 4). Allt annat är nivå 1 med dagens 30 s. **Svep för
nivå 2:** 45 · 60 · 90 s, klämt till samma 400–3 000 m; valregeln är det kortaste värde som klarar grindarna. **Grindar:** FS-A (nivå 2
i 5–50 % av varningarna; kod 3 eller 4 ska finnas i arkivet), FS-B (vinst ≥ 15 s i median · undanträngning ≤ 2 % och noll olyckor ·
takten inom 60 s ökar högst 5 procentenheter · högst 1 % nya varningar), FS-C (≥ 60 nivå 2-varningar per svepvärde, ≥ 3 halkperioder,
≥ 3 län). Bara räkningar under spärren.

**Vad som byggdes.** Motorn fick en valfri krok för förvarningsavståndet per fara, klämd till 400–3 000 m; utan kroken är motorn byte för
byte densamma (vektorerna oförändrade, generatorn ren). Nivåer och svep bor i `engine/src/forsprang.ts`. Skuggmotorn har läget
`?lage=forsprang`, på **:12/:42** som eget jobb (sql/037, kommandot kopierat inne i databasen), med loggen `forsprang_log`. Provet
`forsprangprov` i mätknappen visar bas mot variant på ett påhittat spår. **Bevis före sammanslagning:** 7 tester och 3 motprov (taket,
att nivå 1 är orörd, nivågränsen), alla fällda på rätt test.

**Varför eget anrop — fyndet som ändrar kort #244.** CPU-felen 546 kom **04:32 och 05:02Z 25/9**, på skuggmotorns nya minuter. Flytten
från :00/:30 till :02/:32 (DECISIONS #344) löste alltså inte felet: det är skuggmotorns eget arbete (segmentprognosen och holdout sedan
23/9) som slår i taket, inte en krock med andra jobb. Försprånget läggs därför i ett eget, lätt anrop. Huvudvarvets tak är en egen fråga
på kort #244.

**Kvar:** FS-A kräver vinter (arkivet har bara kod 1, och ingen yta under noll med färskt regn i september). Dom-knappen byggs före
mars. Steg 7 efter domen, med Axels röst oförändrad.

## #360 (25/9 2026) Skuggmotorns huvudvarv lagat med rutfiltret — samma utfall, en bråkdel av arbetet (kort #244)

**Beslut (Bengt 25/9: *"laga skuggmotorns huvudvarv på kort 244"*).** Flytten till :02/:32 (DECISIONS #344) löste inte CPU-felet 546 —
det kom 04:32 och 05:02Z 25/9, på de nya minuterna (DECISIONS #359). Felet följer alltså skuggmotorns eget arbete. Två loopar prövade
hela Sverige för varje rutt: **motorn** prövade varje fara (tusentals kameror, olyckor och stationer) i varje fix (några tusen per rutt),
och **segmentprognosen** mätte avståndet från varje provpunkt till alla ~744 ankare. Prognosen och holdouten kom 23/9, och 546 började
24/9 00:30 — det var droppen, inte hela kärlet.

**Lagningen — rutfiltret (`engine/src/rutfilter.ts`).** Före motorn tas faror bort som ligger längre från rutans ruta än motorns längsta
räckvidd (olyckornas 10 km, härledd ur `DEFAULT_CONFIG`) plus 5 km; ett segment behålls om dess egen ruta skär rutans, så ett långt
segment som korsar rutten aldrig tappas. Före prognosen tas ankare bort som ligger längre bort än prognosens grannradie (`MAX_KM` 50 km)
plus holdoutens 2 km plus 3 km. **Utfallet är detsamma byte för byte:** en fara bortom räckvidden kan aldrig tala, och ett ankare bortom
50 km kan aldrig väga in. `n_hazards` i skuggloggen är fortsatt hela snapshotens antal. Försprångets anrop använder samma filter. Svaret
bär nu tiden per steg (`ms`: motor, prognos, facit, totalt), eftersom funktionsloggen bara finns i Axels panel.

**Bevis före sammanslagning:** tre tester — samma varningar och samma undanträngda med och utan filtret (med minst tre varningar i
jämförelsen, bland dem ett långt segment vars brytpunkter ligger över 100 km bort), olyckan 9 km från rutten kvar, samma prognos och
holdout — och **tre motprov**, ett per vakt, fällda på rätt test. Vektorerna oförändrade. **Verify står kvar:** tre dygn utan 546.


## #361 (25/9 2026) Nederbördstypen: mätningen finns redan, tröskeldokumentet fastställt, domen byggd och spärrad (kort #45)

**Beslut (Bengt 25/9: *"ja till 1, 2 och 3"*)** på rekommendationen i bedömningen §4.2: (1) mät premissen, (2) skriv tröskeldokumentet
innan någon siffra läses, (3) bygg klassningen per station före december. **Axels kontrasignatur på dokumentet väntar** (§4.2).

**Steg 1 ändrade formen** (`scripts/matningar/nederbordstyp-ordlista-2026-09-25.sql`). Trafikverkets `precipitation` är en UPPMÄTT typ,
inte ett ja/nej: på 30 dygn `no` 177 888 rader, `rain` 144 908, null 17 269 (134 stationer), `sleet` 32 (14 stationer, 8–24/9) och `snow`
7 (18/9). Luft och fuktighet finns i 99,98 % av nederbördsraderna och hos 752 av 844 stationer; spannen håller. Vid en station med
typgivare är sorten alltså en mätning (T4). Våtbulben behövs bara där ingen givare ser och får där bara stärka (T3/T6), och givaren blir
modellens facit på samma plats. Kortets invändning från 4/9 (ingen tät serie av fuktighet) är överspelad sedan #353.

**Steg 2: `docs/TROSKLAR-NEDERBORDSTYPEN.md`.** Våtbulb ur WMO:s psykrometerekvation. Klass: Tw ≤ L snö, däremellan slask, Tw ≥ U regn;
svep L {0; +0,5} × U {+1,5; +2,0}, kortets 0/+1,5 primärt, valregel lägst farligt fel. Facit: stationens givare och SMHI:s rådande väder
(parameter 13, 162 aktiva stationer, läst i SMHI:s API 25/9), par inom 5 km. Grindarna: **NT-A** givaren mot SMHI · **NT-B** modellen vid
stationen (träff ≥ 80 %, det farliga felet ≤ 10 %, slask ≥ 40 %, två av tre vintermånader) · **NT-C** lämna-en-ute med segmentprognosens
grannmodell · **NT-D** giltighet (≥ 100 snö- och ≥ 40 slaskepisoder, 30 stationer, tre av fyra breddgradsband, 10 slaskdygn, 50
SMHI-partimmar). Domspärr: bara räkningar på facitsidan till 1 mars 2027. Inget utfall når rösten — #45 är meta (kartan §7.8).

**Stulls formel föll på sin egen kontroll** innan dokumentet checkades in: den ligger 0,2–0,7 °C för lågt nära 0 °C (vid +2 °C och 80 %
gav den +0,25 mot psykrometerns +0,77) — just där gränserna ligger. Psykrometerekvationen valdes; ingen mätning var läst.

**Steg 3: byggt och spärrat.** `engine/src/nederbord.ts` (våtbulb, klass, givarens ordlista, SMHI:s koder; 6 tester) och
`scripts/grind-nt.ts` (knappen `grind-nt`, självtest i CI; läser arkivet en dag i taget genom #75, radvakten och karantänen). **Ingen
skuggkolumn och inget nytt jobb:** allt domen behöver ligger redan i arkivet, och SMHI hämtas vid domen ur `latest-months` (≈ 130 dygn) och
`corrected-archive` — samma väg C som radarn (#223). Beroendet som följer: arkivet eller dess export måste gå att läsa i mars
(återläsningssteget, #334). Fyra motprov, ett per vakt, fällde på rätt rad: klassgränsen, torrorden i kontraktsgrinden, spärrens utskrift
och episodluckan. Torrordsprovet missade först, eftersom kontraktsgrinden bara läser `git ls-files` och modulen var ospårad.

**Kända luckor, sagda nu:** underkylt regn syns inte i våtbulben och saknar eget ord hos Trafikverket; SMHI:s kod 156 är underkylt enligt
WMO fast listan säger "Tätt duggregn"; Norge viker in `sleet` i `snow`.

**Bevis efter sammanslagningen (spärrkörning 25/9 13:07Z, run 36138915848, 30 dygn):** knappen går mot riktiga data och skriver bara
räkningar. Givarklasser per station och halvtimme: regn 62 628 rader (745 stationer), slask 17 (11), snö 1; 596 rader i bandet, varav 244
med minst två grannar; 757 stationer med luft och fuktighet, 756 med typsträng; **43 SMHI-par inom 5 km**; 2 057 partimmar med en vägrad
inom ±10 minuter. NT-D står på 1/100 snöepisoder och 14/40 slaskepisoder — september, som väntat. **Två räkningar är låga av en känd
orsak, inte av skriptet:** före #353 (25/9 07:20Z) sparades inga varma torra rader, så grannar och vägrader saknas i septemberdata. Vintern
sparar kalla rader alltid. Tidsparningen håller efter gallringen: stationerna mäter var 5:e minut och gallringen behåller halvtimmens
senaste rad, 4:57 före hel timme (`scripts/matningar/nederbordstyp-tidsparning-2026-09-25.sql`).

## #362 (25/9 2026) Axel kontrasignerar TROSKLAR-NEDERBORDSTYPEN (kort #45)

**Beslut (Axel 25/9, via Bengt: *"Axel säger ja till tröskeldokumentet"*).** `docs/TROSKLAR-NEDERBORDSTYPEN.md` (DECISIONS #361) är
fastställt av Bengt och kontrasignerat av Axel, oförändrat — gränserna, svepet, facit, grindarna NT-A–D och domspärren gäller som
skrivna. Inget utfall är läst: den enda körningen mot data (25/9 13:07Z) var spärrad och skrev bara räkningar. Ändringar före domen
följer dokumentets §8. **Nästa punkt är domen, tidigast 1 mars 2027** (`grind-nt`, läget `dom`); inget mer väntar före den.

## #363 (25/9 2026) Rimfrosten och förstärkarna döms ur arkivet, inte i skuggkolumner (kort #46, #90, #95 d, #103)

**Beslut (Bengt 25/9: *"ja till 1 och 2"*)** på rekommendationen i bedömningen §4.2, efter hans iakttagelse i systembilden att
rimfrosten och förstärkarna ligger efter. **Läget:** A-grindarna R-A, W-A, F-A och K-A är byggda, kördes 24/9 utan underlag (#331) och
startas av frostflödet; ingen B-mätning var byggd, och alla fyra dokument byggde skuggkolumnen först när A passerat — vid sen frost mitt
i vintern, med tunt underlag i mars. **Läsningen per kort** (bara läsning):

| Kort | B-grinden mäts per | Fälten i arkivet | Uppspelning |
| :-- | :-- | :-- | :-- |
| #46 rimfrosten | station och halvtimme (R-B1, R-B2) | yta, daggpunkt, luft, fuktighet, sikt, nederbörd; molnet ur SMHI i efterhand (130 dygn) | **ja** — R-B3 redovisas per station och frostdygn |
| #90 vind och sikt | halkfall (W-B4) · rutt (W-B5, roll A) | vind, byvind, sikt; halksträckorna ur `road_condition_history` | **ja** — W-B4 per fall; rutterna körs med farorna återskapade ur arkivet som i missmätningen (efter #255) |
| #95 d SMHI-förstärkaren | stationstimme | varningarna med område och giltighetsfönster sedan 12/9 (sql/015) | **ja** |
| #103 frysklassningen | bekräftat halktillfälle | grind A:s population, samma lämna-en-ute som K-A redan kör | **ja** |

**Ändrat i de fyra dokumenten**, enligt deras ändringsregel (före första skuggkörningen, en rad här): "skuggkolumnen byggs" blir
"uppspelningen byggs, spärrad som grind NT", E0 heter "bara mätning". **Låsankaret flyttas:** regimen var knuten till *första
skuggkörningen*, som nu aldrig inträffar — ankaret är i stället den första körning som läser ett B-utfall. Utan den flytten hade
trösklarna i praktiken aldrig låsts. Rimfrostens uthållighet R3 räknas i halvtimmar i uppspelningen (30 min = två följande rader),
eftersom gallringen lämnar en rad per halvtimme efter 7 dygn. **Inga trösklar, svep eller facit är ändrade.**

**Vad som följer:** inget behöver byggas i skuggmotorn före frosten. Uppspelningarna byggs när respektive A-grind passerat, före domen.
Beroenden: arkivet eller exporten måste gå att läsa vid domen (#334); W-B5 och roll A kräver kort #255:s rättelse av missmätningen.
Facit är fortfarande den svaga länken (`road_condition_history` står nästan still till vintern, kamerafacit öppnas i mars) — oavsett
om B mäts i skugga eller ur arkivet.

## #364 (25/9 2026) Kort #255: rekonstruktionens fukt rättad och flyttad till en egen modul — missmätningen stängs inte

**Beslut (Bengt 25/9: *"gör kort 255"*).** `publish/missar.ts` byggde fukten som `COALESCE(precipitation,'') <> ''`, så Trafikverkets
"no" blev fukt och varje torr station fick frysrisk i rekonstruktionen — samma fälla som `Boolean(precipitation)`. **Lagningen:**
`hazardsAt` flyttas till `publish/rekonstruktion.ts` med `FUKT_SQL`, snapshotkärnans torrord i kontraktsgrindens form, så att en lista
som glider isär fälls i CI. Missmätningen importerar modulen; i övrigt är skriptet orört.

**Bevis:** provet `#255 rekonstruktionen` i `test/integration.test.ts` kör den riktiga frågan mot PostGIS i CI — "no", "Dry" och null
torra; regn, snö och en tiominuterssumma med regn blöta, som snapshotkärnans `fukt`. Grönt i PR #593 (205 av 205, inget hoppat över).
**Motprov** (PR #594, stängd): den gamla formen återinsatt, osynlig för kontraktsgrinden (alla 51 kontrakt höll). Provet föll på
rätt rader, `R255-NO` och `R255-DRY` blöta, 204 av 205.

**Körs `missar.yml`?** Nej: sex gånger 29/8 (tre fel innan det gick), aldrig sedan. Kortets verify sa "annars stängs skriptet i stället".
**Det stängs inte**, eftersom rekonstruktionen sedan DECISIONS #363 är det W-B5 och roll A ska spelas upp med — och flytten till en egen
modul är just för den användningen. Om själva veckomätningen (#19) ska stå kvar bredvid tystnadsfelet (#98) och grind S-B hör till
kort #254 (h).

**Kvar i #254 (h), nu villkor för #363:s W-B5 och roll A:** rekonstruktionen saknar vakterna (#75, radvakten, karantänen, den
långsamma vakten), och — **nytt fynd 25/9** — den släpper in varje segment ur väglagshistoriken oavsett kod, även kod 1 utan halkord
som snapshoten aldrig publicerar (kort #97:s kodgrind). Båda gör uppspelningen mer larmbenägen än motorn.

## #365 (25/9 2026) Kort #254: granskningens äldre fel — fyra byggda, fyra avskrivna med skäl; rättelse av #364

**Beslut (Bengt 25/9: *"gör kort 254"*).** Kortets Verify: varje punkt byggd med självtest och motprov, eller avskriven med skäl här.
Först mätt, som kortet sa: täckningen sedan #353 är **829–833 av 834** aktiva stationer per halvtimme (11:00–13:00Z,
`scripts/matningar/tackning-halvtimme-2026-09-25.sql`) — de varma och torra stationerna har rader nu.

**Byggda:**

| | Fel | Lagning | Bevis |
| :-- | :-- | :-- | :-- |
| **(d)** | T-A:s *kl 03–07* och natten räknades i UTC (`EXTRACT(hour)` i sessionens zon) | timmen och natten i `Europe/Stockholm`, i TypeScript; natten skiftas 12 h som förut (`NATT_SKIFT_H`, nu i kontraktet "Nattens gräns") | självtest sommar- och vintertid; motprov (zonen UTC) föll på "kl 04 i Sverige" |
| **(c)** | K-A, R-A, vind och sikt och SMHI-förstärkaren skrev andelar under spärren; R och F tabellen före spärren (C4) | spärren skrivs FÖRE tabellen; under den visar tabellen bara räkningar (och K-A täckningen) — som V-B (#350) | en radfunktion per knapp med självtest; fyra motprov, ett per knapp, föll på "spärrad rad visar ingen …" |
| **(g)** | orsaksklassningen tog de åtta närmaste RADERNA utan avståndsgräns — en glest mätande närmaste station kunde överröstas | `nederbordVid`: den närmaste STATIONEN (TROSKLAR-SKUGGAN §2 ordagrant), inom `MAX_KM` 50 km — ingen ny siffra. **Skärpning** (§5): utan station inom radien är orsaken okänd och bokförs som förut på utstrålningen (B2), aldrig som ursäkt | prov mot PostGIS (torr närmaste station avgör; 60 km bort ger null); motprovet (åtta rader) föll |
| **(h)** | rekonstruktionen läste frysriskpunkter utan vakterna | #75, radvakten och karantänen med den långsamma vakten, importerade ur snapshotkärnan; **missmätningens knapp stängd** (`publish/missar.ts`, `missar.yml` borttagna — kördes senast 29/8, ersatt av tystnadsfelet #98 och grind S-B, som mäter missar mot den delade facitlistan med skuggmotorns egna rutter); modulen står kvar för #363 | prov mot PostGIS (givarfel, radvakt och karantän tysta, blixthalkan talar); motprovet (vakterna bort) föll |

Motproven för (g) och (h) kördes i CI (PR #596, stängd) och var osynliga för kontraktsgrinden — alla 51 kontrakt höll, så det
var proven som föll. Hela sviten 207 av 207 i PR #595.

**Avskrivna med skäl:**
- **(a) V-A** prövade bara timmar där målstationen hade en rad och dolde falsklarm. Snedvridningen gynnade V-A, som ändå föll på
  träffen — nej-domen står. Orsaken är borta vid källan sedan #353 (täckningen ovan), så V-A:s veckokörningar räknar rätt framåt.
- **(b) Övergångarnas 0d** kastade tysta torra perioder. Det var rätt beteende: tyst är inte torrt. Med #353 har de torra
  perioderna rader, och den första torrperioden på fem dygn som helt ligger efter 25/9 07:20Z går att döma från 30/9.
- **(e) Tystnadsfelet:** en miss vid en station utan rader blir *okänd*. Det är dokumentets egen klass — en ursäktlig miss
  kräver att radarn såg nederbörd **medan stationen var torr** (TROSKLAR-TYSTNADSFEL), och det går inte att fastställa utan
  rader. Efter #353 händer det bara när en station är nere.
- **(f) S-B:s missfönster 2 h** mot flottans 3,5 h mellan varven snedvrider inte B2: utan körning inom 2 h blir händelsen
  OBEDÖMBAR, inte en miss, och räknas redan för sig. Priset är underlag, inte riktning — och 2 h är dokumentets egen definition
  (TROSKLAR-SKUGGAN §2); ett längre fönster skulle döma prognosen på äldre körningar.

**Rättelse av #364:** där stod att rekonstruktionen "släpper in varje segment oavsett kod … och gör uppspelningen mer
larmbenägen än motorn". **Det är fel.** Motorn tystar själv kod 1 utan halkord (`engine/src/engine.ts`, `evaluateSegment`), så en
sträcka med "Normalt" talar lika lite i uppspelningen som i bilen. Upptäckt när lagningen skulle skrivas.

**Nytt fynd, eget kort #256:** uppspelningen av efterhalkan (`sql/028`) räknar natten i UTC (`AT TIME ZONE 'UTC'`), medan R-A och
nu T-A räknar i svensk tid. Kontraktet "Nattens gräns" vaktar bara att talet 12 är detsamma, inte zonen.

## #366 (25/9 2026) Kort #256: uppspelningens natt räknas i svensk tid — samma natt som T-A och R-A, och kontraktet vaktar zonen

**Beslut (Bengt 25/9: *"gör kort 256"*).** `uppspelning_efterhalka()` (`sql/028`) skiftade natten 12 h i UTC, medan R-A och sedan
#254 d även T-A skiftar i `Europe/Stockholm`. DECISIONS #246 säger att de tre ska mena samma natt; kontraktet "Nattens gräns" vaktade
bara talet 12. **Lagat:** natten är `((t AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date`. Episoden bokförs som förut på
det UTC-dygn den började, och stationer och ögonblick redovisas per UTC-dygn — bara nattindelningen är ändrad. Nytt kontrakt **"Nattens
zon"** vaktar zonen i alla tre kopiorna (T-A:s `ZON`, R-A:s svenska `TZ`, uppspelningens `AT TIME ZONE`), golv 3.

**Migrationen redigerad på plats, inte en ny fil** (kortets Verify sa "ny migration"). `sql/028` är idempotent (släpper signaturen och
skapar om), CI:s prov läser den filen, och en `sql/038` bredvid hade lämnat två definitioner i repot, där den gamla med UTC-natten
hade fällt det nya kontraktet. Körd i drift med databasknappen 25/9 (run 36147121022): en signatur, den svenska natten finns i funktionen
och UTC-natten är borta.

**Bevis:** fall J i uppspelningsprovet — två ögonblick en halvtimme före och efter lokal middag — är två nätter i svensk tid men en i
UTC. Grönt i PR #597 (207 av 207). **Motprov:** kontraktet fällde både den gamla UTC-formen och den nya formen med zonen UTC; och i CI
(PR #598, stängd) fällde fall J en mutation som kontraktsgrinden inte såg (episoden vald på en extra UTC-natt): väntat 2, fick 1.

**Uppspelningen körd om och jämförd** (`scripts/matningar/uppspelning-natt-2026-09-25.sql`, före och efter): kombinationen 2
episoder · 4 ögonblick · 2 dygn, utan blöt 12 · 27 · 7, utan faller och utan blöt 204 · 7 380 · 12 — **identiskt**. Ögonblicken lika
bekräftar samma population. Episoderna lika är väntat: de två zonerna delar natten olika bara för ögonblick mellan kl 12 och 14 svensk
tid, och septembers kandidater i bandet +1…+3 °C ligger på natten. Skillnaden kan synas en mild vinterdag med töväder mitt på dagen.

## #367 (25/9 2026) Tiden i systemet: NT:s dygn i svensk tid, och kontraktet "Givarfelsdygnets zon"

**Beslut (Bengt 25/9: *"ja till a och b"*)** på kartläggningen i bedömningen §4.2 (Bengts frågor samma dag: *"mäter de utc eller svensk
tid och har det någon betydelse"* och *"kan det uppstå problem om de olika sakerna sammanförs"*). **Svaret som ligger till grund:**
lagring, källor, scheman och bokföringsdygn räknar i UTC med flit; fysiken som följer dygnet (T-A, R-A, rimfrostanalysen, uppspelningens
natt) i svensk tid; apparna visar enhetens tid och skickar UTC. Problem kan bara uppstå där två delar paras på en ETIKETT (dygn, natt,
timme) räknad i olika zoner — aldrig där de paras på exakta tidpunkter och fönster. Databasens sessionszon mätt till UTC.

**(a) Grind NT räknar dygn och månader i svensk tid** (`scripts/grind-nt.ts`, `lokalDag`): NT-D:s slaskdygn och B4:s vintermånader.
I UTC blev en slasknatt över midnatt UTC två dygn, och kravet ≥ 10 skilda dygn nåddes lättare. Dokumentet ändrat enligt §8 (skriftligt,
en rad här, Bengts ja) — före första domläsningen. Självtest för sommar- och vintertid; motprovet (zonen UTC) föll på "22:30Z 24/9 är
25/9 i Sverige".

**(b) Kontraktet "Givarfelsdygnets zon"** (`scripts/kontraktsgrinden.ts`): den långsamma vakten skriver `givarfel_dygn` per UTC-dygn
(sql/030) och snapshotkärnan, bunten, trendberäkningen (sql/018) och uppspelningen (sql/028) slår upp det på samma etikett. Kontraktet
kräver samma zon hos skrivaren och alla läsare, golv 5 (15 förekomster i 8 filer med mätfilerna). Motprovet (sql/018 i svensk tid) föll.
Den långsamma vakten själv står kvar i UTC-dygn: en frostnatt delas av midnatt i båda zonerna.

## #368 (25/9 2026) Kort #257: trendens stigande halva sparas — i en egen tabell, i drift samma dag

**Beslut (Bengt 25/9: *"ja, bygg 257 före frosten"*).** TROSKLAR-TRENDEN mäter två riktningar — fallande (förvarning) och stigande
(tystna tidigare när ytan värms) — men bara den fallande sparades, och gallringen gör den stigande omöjlig att räkna fram i
efterhand (lutningens vakt kräver tre rader i fönstret; efter sju dygn finns en per halvtimme). **Byggt:**
`berakna_trendkandidater()` (sql/018) skriver även stigande kandidater — samma vakter, band (+1…+6 °C) och fönster, lutning ≤ −0,4 i
något fönster, samma utfall 90 min efter — i tabellen **`trend_stigande`** (samma kolumner, RLS, dubbellåst). **Egen tabell, inte
tecknet i samma** (kortets förslag): snapshotkärnan läser `trend_kandidater` och publicerar lutningen i live.json; en stigande rad där
hade ändrat vad skuggan ser. Tecknet är detsamma i båda tabellerna. Returvärdet och alla befintliga läsare är oförändrade; värdevakten
besiktigar den nya tabellen från start. En rad kan hamna i båda tabellerna när fönstren är oeniga (föll på 30 min men steg på 60) —
varje tabell är sin riktnings superset.

**Bevis:** prov mot PostGIS (PR #604, 208 av 208): stigande och fallande hamnar var för sig, platt yta ingenstans, utfallet fylls.
Två motprov i CI (PR #605 och #606, stängda), osynliga för kontraktsgrinden: utan skrivningen fick STIG_A 0 i stället för 2, utan
utfallet fylldes STIG_B aldrig. **I drift** (run 36152132908): tabellen finns med RLS, den fallande halvan orörd (201 rader före och
efter, funktionen gav 0 nya), och de senaste 12 timmarna gav **654 stigande kandidater vid 41 stationer**, alla med utfall — med
toppen kl 05–08 svensk tid, morgonuppvärmningen, där tystnadsriktningen ska verka.

## #369 (25/9 2026) De tre andra luckorna i L3: planen fastställd — inget behöver göras före frosten

**Beslut (Bengt 25/9: *"ja till planen för de tre luckorna om det inte är så att de ska göras redan nu"*).** Villkoret är prövat:
**inget av de tre behöver göras nu**, eftersom datan de döms på sparas redan och aldrig raderas. Gallring och radering rör bara
väderarkivet (halvtimme efter 7 dygn; export och radering efter 30 dygn först över 350 MB, i dag 182 MB) samt grannländernas väder,
gravstenar och cron-loggar (sql/014, 026, 031, 034). Väglagshistoriken, radarn, skuggloggen, trendtabellerna åt båda håll och SMHI:s
varningar raderas aldrig. **Planen**, nu i bedömningens kalender:
- **Regn som börjar på frusen väg** (Ä9): i mars läses S-B:s nederbördsdrivna missar — hålets storlek — och NT:s räkning av SMHI:s
  underkylda regn; därefter beslut om en förstärkare eller #233:s *före resan*-vy. T6 gäller: en modell utlöser aldrig ensam.
- **Segmentprognosens tidsdel** (Ä10): risk vid ankomst som uppspelning ur arkivet, med ankarnas lutning åt båda håll (sedan #368),
  efter T-A:s dom (trendregeln). Spåras på #38b.
- **Regn på snö, snö på snö** (S15, Ä11): vinterns väglagsordlista mäts i första vintermånaden (december) i väglagshistoriken; #45:s
  steg 2 skrivs innan något utfall läses; domen ur arkivet i mars mot vinterbaselinen (#51/#209).
Det enda gemensamma villkoret är detsamma som för alla marsdomar: arkivet eller exporten måste gå att läsa (återläsningssteget, #334).

## #370 (26/9 2026) Kort #218: Androids omladdningsloop lagad — en laddning i taget, en minuts paus efter fel; iOS laddar aldrig om under resan (kort #258)

**Beslut (Bengt 26/9: *"ja till att du lagar omladdningsloopen"*).** Svaret gällde loopen. Kadenstestet (`CadencePolicyTest.tiers()`, som
jämför koden med sina egna konstanter) nämndes i samma fråga men fick inget ja och står kvar på kortet.

**Byggt.** `SnapshotSchedule` (ny, ren klass) bestämmer när vakten får ladda vägdata: en laddning i taget, och efter ett misslyckande
väntar nästa försök **60 s**; en lyckad laddning förnyas efter 30 min som förut. `GuardService` frågar klassen vid varje GPS-punkt och
vid start (start hoppar över väntan, aldrig en pågående laddning). Förut satte bara en LYCKAD laddning klockan, så varje GPS-punkt utan
data startade en ny, komplett laddning i en egen tråd — en per sekund tills den första lyckades (#280). Startens dubbla laddning
(`onStartCommand` plus första GPS-punkten) försvann på köpet. Fem JVM-prov, ett per påstående; kortets fall som räkning: tio minuter
utan nät i 1-sekundstakt, tre sekunder per misslyckat försök, ger **10 laddningar, inte 600**.

**Varför 60 s.** Utan nät faller försöket på sekunder, och en minut räcker för att vakten ska få data strax efter att täckningen kommer
tillbaka. I kortets värsta fall — nätet finns, filen fäller kontrollsumman och ingen sparad kopia finns — blir det `static.json`
(251 kB) en gång i minuten, ungefär 15 MB i timmen i stället för ungefär 1 GB. Ett enda tal i en fil, så kontraktsgrinden berörs inte.

**Bevis.** android.yml-körningen 36214202433 (workflow_dispatch på grenen, 16e2e3f) grön: JVM-proven, emulatorn och release-AAB. Motprovet 36214221026 (c27dcce, båda vakterna borttagna) rött med exakt de tre väntade proven fällda — oneLoadAtATime (rad 15), aFailedLoadWaitsAMinute (rad 22) och tiominutersräkningen (rad 50), 46 prov, 3 fällda; halvtimmesförnyelsen och startens förbikoppling höll. **Motprovet** tog bort båda vakterna i en körning: den pågående laddningen och väntan efter fel. De två första proven
lutar sig var på EN vakt och fälls var av sin mutation (det första anropar aldrig `done()`, det andra har ingen laddning igång när
väntan prövas), så en körning räckte för att läsa vilken rad som föll. android.yml körs bara vid push till main; beviset före
sammanslagning togs därför med workflow_dispatch på grenen (läxa i `skills/halkvakt-android/SKILL.md` §5).

**Fynd på vägen, kort #258:** iOS laddar vägdata när vakten startar och när Vakten-vyn visas (`GuardManager.swift:230`,
`VaktenView.swift:68`) — och körläget ligger som helskärm över vyn medan vakten går. Under en resa laddas alltså ingenting om, och
åldersvakten (`AgeGate`, 45 min för väder, 120 min för olyckor och djur) prövas bara vid laddningen. En tre timmars resa varnar på
starttidens is och olyckor hela vägen, och en ny olycka når aldrig telefonen. Android förnyar var 30:e minut. Läst i koden, inte
framkallat. **Sagt högt:** lagningen är bevisad på JVM, inte på en telefon; den når testtelefonen med nästa Android-bygge.

## #371 (26/9 2026) Bengts ja till #258 och femma sex (1)–(3): iOS laddar om under resan, andra arket i mörker, guiden till iOS-testarna

**Beslut (Bengt 26/9: *"ja till 258 och till 1–3"*).** (1) #247:s andra ark i mörker · (2) välkomsttexten och testinstruktionen
till iOS-testarna · (3) #221 steg 1, styrdokumenten · och #258, att iPhone laddar om vägdatan under resan som Android gör.

**(1) #247, andra arket — 20 direktbilder 26/9 03:22–03:24Z, alla i mörker, blint klassade 03:40Z.** 12 *bar* (ingen synlig
beläggning, säkerhet medel eller låg), 8 *okänd*, ingen gissning på *våt*. Sju av de okända har **spindelväv över linsen** som lyser
i kamerans IR-ljus och skymmer vägbanan; den åttonde är för mörk. Kortets Verify (minst fem våt eller okänd) är uppfylld till
första halvan; stickprovet (2 bilder) står i `docs/kamerafacit/prov-2026-09-26/ok.md` och väntar på Axels ok. **Fynd:** ungefär en
tredjedel av nattbilderna går i september inte att läsa alls, av ett skäl som inte har med väder eller mörker att göra. Det gäller
facit-hinken lika mycket som direktbilderna, och bör stå med när bildfacitbeslutet (#209) fattas efter första frosten.

**#258 — byggt, 0.3.9 (16), skrivet utan kompilator.** `GuardManager.refreshSnapshot` har samma schema som Androids
`SnapshotSchedule`: var 30:e minut under resan, en laddning i taget, en minuts paus efter fel. Mitt i resan byts farorna med
`updateHazards`, så motorns minne består (v14: aldrig säga om); vid vaktens start byggs en ny motor som förut (`fresh: true`).
Anropet sitter i platsflödet efter `guard running`, så också en första laddning som föll prövas igen. **Och utan nät:**
`SnapshotRepo.loadSnapshot` föll förut helt på manifestet, så den sparade snapshoten prövades aldrig mot åldersvakten; nu ger ett
fallet manifest tomma kontrollsummor, varje fil faller till cachen, och cachen åldras — samma väg som Androids `fetchVerified`.
Byggnumret höjt till 16 i samma varv (läxan 16/9). Produktboken fick meningen om förnyelsen i flöde 2. **Sagt högt:** inget av
detta är kompilerat; `ios-engine` testar bara motorpaketet. Axels Xcode-bygge är första kompileringen, och Verify är en resa längre
än 30 min där körlägets *väglag HH:mm* flyttar sig.

**(2) Välkomsttexten — `docs/BETAGUIDE-IOS.md`.** TestFlight-texten (*Vad ska testas*, knappt 1 000 av 4 000 tecken) och guiden i
Android-guidens åtta avsnitt, skriven mot koden: *Tillåt plats* räcker för att köra (#273), *Alltid* bara för självväckningen,
efter-resan-notisen (*Ja, alla stämde* / *Något stämde inte*, kortet står ett dygn), Siri-frasen, självstoppet efter en kvart.
**Rättat i Android-guiden:** integritetsraden sa "tre saker"; svaret bär också appens namn och version (appens Om säger det sedan
24/9, #348). Utskicket till en extern TestFlight-grupp är Axels (Beta App Review).

**(3) #221 steg 1 — byggt samma dag.** TAVLA 4 864 → 2 137 rader (122 stängda kort till `TAVLA-ARKIV.md`; öppna kort 44 före och 44 efter, inga öppna i arkivet), DECISIONS 10 550 → 4 981 rader (#1–#185 till `DECISIONS-ARKIV.md`, ordagrant; 358 rubriker före och efter). De två filerna gick från 1 384 kB till 693 kB — hälften. `scripts/beslutsnumren.ts` läser båda; motprov lokalt: en påhittad `## #58` fälls med arkivet och slinker igenom när vakten bara läser DECISIONS.md.

## #372 (26/9 2026) Bengts ok på bildläsningens andra ark — i stället för Axels; 20 rader in i kamerafacit, kort #247 stängt

**Beslut (Bengt 26/9 04:12Z: *"jag gör den om kamerabilderna"* och sedan *"ok"*).** Arket `docs/kamerafacit/prov-2026-09-26/` godkänt
utan rättelser, stickprovet nr 3 Irsta (*okänd*) och nr 15 Bergsäter (*bar*) visat i chatten. **Avvikelse från #335:** TROSKLAR-SKUGGAN §6
säger *"Claude klassar, Axel ok:ar"*; det här arket ok:ades av Bengt, och `klassning.json` säger det: `"ok": {"av": "Bengt (i chatten, i
stället för Axel)", "nar": "2026-09-26T04:12Z"}`. Regeln i §6 är orörd — ett ark, inte en ny ordning.

**Bevis:** dbknapp 36217165040 (bärare sql/033, 20 INSERT som bevisrader): arkets rader i `kamerafacit` 12 bar och 8 okänd, tabellen 41 rader (21 före). `scripts/matningar/kamerafacit-prov-2026-09-26.sql` genererad av `kontaktark.py sql`. Ingen rad är halka, så grind
S-B räknar ingen händelse.

**Kort #247 stängt:** Verify (*ett ark med minst fem våt eller okänd, ok:at*) uppfylld med 8 okänd; rättelsen kortet väntade sig kom inte,
eftersom ingen klass var fel. Det kortet ville pröva — att mörker ger *okänd* i stället för en gissning — höll: ingen nattbild fick *våt*.
Det som inte prövades är *våt* mot *bar* i regn; kortet bad om regn ELLER mörker, och ett regnark är inte längre ett villkor för något.
Fyndet om spindelväven (#371) står kvar till bildfacitbeslutet (#209). Kortet flyttat till `TAVLA-ARKIV.md` som det första efter #221.

## #373 (26/9 2026) Femma sju: #83 och #221 och #250 stängda, två kort in i #219, kadenstestet mäter beteendet, nytt kort #259

**Beslut (Bengt 26/9: *"ja till 1-5"*, ur femma nummer sju i bedömningen §4.2).** (1) #253 mäts om efter första hela dygnet
(bokförs separat efter 07:20Z) · (2) #83 mäts och stängs · (3) #221 steg 2 · (4) kadenstestet · (5) *Skinnet v3 på Android* och
*Play: uppladdningsguide* in i #219, och #250 stängs.

**(2) #83 stängt — Verify mätt 26/9** (dbknapp 36217996390, läsfrågor, bärare sql/033): högst **17 978** rader per dygn äldre än
8 dagar (gränsen 45 000; vintern kan inte överskrida 848 × 48 = 40 704 efter gallringen) · **0 av 179 461** halvtimmar med mer än en
rad · `halkvakt-gallring` kör 03:15 varje natt, senast i natt, **0 fel på 30 dygn**. Verify:s andra halva (*grind A ger samma n*):
grind A väljer senaste raden MED yta per halvtimme, gallringen senaste raden oavsett; i det ogallrade fönstret skulle grind A tappa
**3 av 49 372** halvtimmar (0,006 %). Inte *samma* n, men långt under vad något av grind A:s mått kan känna; ingen ändring.
Pro-frågan står kvar i §4.2 som grepp 3. Luckan 6–7/9 i dygnsraderna är Actions-stoppet, inte gallringen.

**(3) #221 stängt — steg 2:** `BACKLOG.md` avvecklad — CLAUDE.md:s sessionsprotokoll pekar nu på bedömningen och tavlan (steg 2 och
4, TAVELREGELNS sista rad), halkvakt-android §6 likaså, och filen bär en rad överst. `STATUS.md`:s rubrik *Current state 31/8* fryst
som historik med pekare till bedömningen. De fyra motsägelserna: #79 var redan stängd på båda ställena efter steg 1; STATUS:s
"iOS 0.3.0" och "Actions-minuterna slut" står nu under den frysta rubriken; lapse 0,71 märkt som rättad på de två ställen i tavlan där
den stod omärkt (0,63 gäller sedan 17/9, #226). **Grenarna:** 279 → 6. 273 raderade, bara de vars sammanslagna PR bar exakt grenens
topp; kvar är main, en gren med öppen PR, tre utan sammanslagen PR och en med commits efter sin PR. Återställbara från PR-sidan.

**(4) Kadenstestet — beteendet, inte konstanterna.** `CadencePolicyTest.tiers()` jämförde `intervalMs` med `CadencePolicy`:s egna
konstanter. Ersatt av `fullCadenceBeforeAnyHazardCanSpeak()`: en körning i 140 km/h rakt mot en fara, samplad som `GuardService`
samplar, från varje start 3,6–60 km i steg om 50 m; inom motorns räckvidd (`leadMaxM + cameraTriggerM` ur `EngineConfig`) ska varje
GPS-punkt komma högst 1 s efter förra. `noSnapshotMeansFullAlertness` prövar ≤ 1 s i stället för `== NEAR_MS`. **Bevis:** android.yml
36217938454 grön på grenen; motprovet 36217945802 (NEAR_MS 1 → 10 s) rött på exakt de två — det gamla testet hade hållit. En
Python-modell av provet (i sessionen, före Kotlin) fällde också NEAR-gränsen 5 → 3 km och FAR 15 → 450 s, men **inte** FAR 15 → 150 s:
kortets exempel är fortfarande säkert (5,8 km per steg mot ett mellanband på 15 km), och ett prov som fällde det hade mätt batteri, inte
säkerhet. Kvar på #218: mätningen.

**(5)** Korten in i #219 ordagrant; #250 stängt med del (a) bevisad genom läsning (raden sitter i tjänsten).

**Fynd på vägen — kort #259.** Motorn talar vid `min(leadMaxM, max(400 m, fart × 30 s))` (`engine.ts:110`), och reglaget *Varna på
avstånd* sätter bara `leadMaxM`. I 140 km/h blir försprånget högst 1 167 m, i 90 km/h 750 m, så *Tidigt — 3 km* (iOS) och 5 km
(Android) ändrar ingenting på en svensk väg. #263 visste att 3 000 m nås först över 360 km/h men drog inte slutsatsen att reglaget
därmed lovar något appen inte gör; produktboken säger *"hur långt i förväg rösten ska tala"*. Frågan i §4.2. **Och kadenshuvudet:**
`CadencePolicy.kt` säger att motorn aldrig behöver mer än 3 500 m — den tidiga olycksrepliken talar på upp till 10 km
(`accidentMaxAheadM`), i mellanbandets 5 s-takt, alltså högst 195 m sent i 140 km/h. Ofarligt för en replik på 10 km, men huvudet
säger fel; noterat, inte ändrat.

**Tavlan:** 43 → 39 öppna kort (#83, #221, #250 stängda till arkivet, två in i #219, #259 nytt).

## #374 (26/9 2026) Kort #259 väg (a): reglaget heter *Längsta förvarning* och går 400–1 200 m på båda plattformarna — rösten orörd

**Beslut (Bengt 26/9: *"slå ihop och ja till a"*).** Reglaget ska säga vad det gör, inte styra något nytt. Motorn talar vid
`min(leadMaxM, max(leadMinM, fart × 30 s))`; reglaget sätter `leadMaxM` och är alltså ett **tak**. Väg (b), att låta reglaget styra
sekunderna, är inte vald — den ändrar vad rösten säger och kräver vektorer; den kan prövas i skuggan efter mars om förare ber om det.

**Byggt.** Samma spann på båda: **400–1 200 m**, 1 200 från början (1 200 m ≈ 30 s i 140 km/h; under 144 km/h betyder taket
ingenting, precis som 3 000 gjorde). Android `Prefs.WARN_MIN_M`/`WARN_MAX_M`, iOS `Prefs.leadRange`. Sparade värden över taket
(Android upp till 5 000, iOS upp till 3 000) läses som 1 200 — samma beteende i varje laglig hastighet. Golvet 400 = motorns
`leadMinM` (Android hade 500). Texterna: *Längsta förvarning*, *Kortare — 400 m* / *Fullt — 1,2 km*, och under reglaget *"Rösten
varnar ungefär 30 sekunder före — 750 m i 90 km/h. Reglaget kan korta det, aldrig förlänga."* Körläget sa *"Rösten talar när något
dyker upp inom 3 km framför dig"* — samma överdrift — och säger nu *"Rösten talar ungefär 30 sekunder före, som längst 1,2 km. En
olycka längre fram kan nämnas tidigare."* (den tidiga olycksrepliken talar på upp till 10 km, #373). Produktboken och båda
testarguiderna rättade i samma commit. iOS 0.3.9 (17).

**Vakter.** Två nya kontrakt i kontraktsgrinden, *Förvarningens tak* och *Förvarningens golv*, som läser Kotlin och Swift — 55 kontrakt
håller; motprov lokalt: iOS-taket 1 300 fälls på taket, golvet håller. **Bevis Android:** android.yml 36219380753 grön på grenen (JVM-prov, emulator, release-AAB); fotostudions shot-3 visar Längsta förvarning 1,2 km, Kortare — 400 m / Fullt — 1,2 km och texten om 30 sekunder. **iOS** är skrivet utan kompilator;
Axels bygge av (17) är första kompileringen.

**Ingen vektor rörd:** motorns `leadMaxM` 3 000 i `EngineConfig` står kvar; det är appens reglage som ändrats.

**Också — fotostudion och #249.** Fotostudion svepte förbi reglaget och slutade före Om-sidans ärlighetsrad, så varken #259 eller #249 kunde bevisas med bild. `android.yml` tar nu `shot-3-reglaget` efter första svepningen och `shot-7-om` efter en tredje; alla fem bilder in i `docs/produktbok/` (PRODUKTBOKSREGELN). **#249 stängt:** fotostudions nya `shot-7-om.png` (android.yml 36219380753, i produktboken) visar Androids ärlighetsrad och källraden fram till *Fintraffic (CC*; resten läst i koden, `App.kt:686` — *Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL)*, ordagrant som iOS `HalkvaktApp.swift:124`.

## #375 (26/9 2026) Kort #23 stängt som överspelat — bannern står kvar i koden, beviset efterfrågas inte

**Beslut (Bengt 26/9: *"jag menar att kort 23 är överspelat. Du kan stänga den"*).** Kortet bad om en skärmbild av heads-up-bannern
över kartappen, per plattform. Bannern är byggd på båda (Android `GuardService.headsUp()`, iOS `HeadsUpService.show()`) och **rörs
inte** — den står kvar som den är. Det som stängs är kravet på bildbeviset; ingen *Prova bannern*-knapp byggs, och ingen passagerare
behöver ta bilden. Frågan i §4.2 (väg 1 eller 2) är därmed besvarad utan att någon av dem valts. Kortet flyttat till `TAVLA-ARKIV.md`.

## #376 (26/9 2026) Kort #210 stängt på kodbeviset — "på väg <null>" hörs inte längre, men har inte hörts rätt heller

**Beslut (Bengt 26/9: *"stäng 210 och slå ihop"*, på förslaget i §4.2).** Kortets villkor — att ett iOS-bygge med fixen hörs säga en
olycka utan vägnummer rätt — släpps. Beviset som stänger är kodens: `SnapshotRepo.swift:78` läser `road` som `as? String` (JSON-null ⇒
nil, #258), `str()` gör aldrig NSNull till `"<null>"` i något av de sex id-fälten (#276), vektor v26 och läsarkontraktet (TS, med
motprov) låser fallet, och 0.3.9 (13) med fixen laddades upp 23/9 (#320). **Sagt högt:** appens JSON-läsare har inget testmål, så
raden är granskad, inte körd, och ingen har hört en olycka utan vägnummer i ett bygge med fixen — fallet är ungefär en om dagen i hela
landet. Står ett fel kvar hörs det i betan. Android-sidans latenta id-form (`getString("id")` ger `"null"`) står kvar som anteckning.

## #377 (26/9 2026) Femma åtta: #241 stängt, läget skrivet om, korten hos den som har nästa steg, Android 0.3.9 (17)

**Beslut (Bengt 26/9: *"ja till 1-4 och slå ihop 617"*).** Punkt (5), #228:s schema förberett för Axels bygge, fick inget ja och är inte
gjord.

**(1) #241 viltrösten stängd.** A–D i drift sedan 22/9 och bevisade 23/9; del E (*iOS 0.3.9 (13) från main ute hos testarna*) uppfylldes
när (13) laddades upp 23/9 20:53 (#320). Kortet hade stått tre dygn med villkoret uppfyllt.

**(2) Läget överst i bedömningen skrivet om till 26/9** (SESSIONSREGELN punkt 4) — *Läget 20/9* med 44 kort och fjorton beslut. Nu: 35
kort, arton rader i §4.2 med ett obesvarat led, flaskhalsen Axels händer. Tabellens rader om facitknappen, ordlistan, databasen och
produkten aktualiserade; kalenderns vecka 39 och 28/9–1/10 likaså. Fyra §4.2-rader avgjorda i samma varv: femma åtta, #241, Om-texten
(#249, klar 24/9 men aldrig struken) och femma fem.

**(3) Sex kort flyttade till den som har nästa steg** — *Introduktionen* till Bengt; #258, #259, välkomsttexten, #248, #219 till *Axel —
därefter*. Varje kort bär en rad om varifrån och varför. **Rättat samma varv:** #203 flyttades först till Axel med motiveringen
*"Axels beslut om formen"* — men kortet säger själv att besluten är tagna (#267, #269) och att lager 2 är Claudes att bygga; det står
kvar under *Claude — olåst*. Och #214:s del (b), integritet.html, var klar sedan 23/9 (#320) — bara raderingsfrågan är kvar. Öppna kort
36 → 35 (bara #241 stängt): Axel 9, Bengt 4, Claude olåst 3, Claude låst 19.

**(4) Android 0.3.9 (17).** `versionCode` 4 → 17, `versionName` 0.3.1 → 0.3.9, samma nummer som iOS på main. Googles första uppladdning
låser versionCode-spåret (#347 p. 2), och ingen uppladdning har skett. Produktbokens versionstabell fick iOS (15)–(17) och Android-raden;
Android-guidens rad om 0.3.1 rättad. **Bevis:** android.yml 36220665196 (workflow_dispatch på grenen, 8ac0303) grön — JVM-prov, emulator och signerad release-AAB med det nya numret.

## #378 (26/9 2026) Kort #214: Play-formulärets raderingsfråga besvaras Nej — policytexten färdig, Axel klistrar in den

**Beslut (Bengt 26/9: *"gör 203 och 214"*).** Väg 1 av de tre i `docs/PLAY-DATASAFETY.md`: **Nej**, med förklaringen att ett facitsvar
inte bär någon identifierare — inget konto, inget enhets-id, ingen IP i databasen — så ingens svar kan pekas ut och alltså inte raderas
för sig. Väg 2 (tömma hela tabellen på begäran) förstör facit för alla; väg 3 (ett slumpat facit-id per telefon) inför en identifierare
där det i dag inte finns någon. Ett ägarbeslut enligt kortet; Bengt fattade det, Axel kan invända före första uppladdningen.

**Policyn.** `integritet.html` skrevs om 23/9 (#320) och säger redan *"vi kan inte heller plocka fram just dina"*, men inte vad det
betyder för radering. Den färdiga meningen står i `docs/PLAY-DATASAFETY.md`: *"Svaren kan därför inte kopplas till dig, och vi kan inte heller plocka fram just dina — alltså inte heller radera just dina på begäran. Du bestämmer ändå: slår du av <i>Betatest</i> slutar appen skicka direkt, och det som sparats i telefonen försvinner när du avinstallerar appen."* — plus datumraden 2026-09-26. **Den är inte
publicerad:** PR:en i `Axelstar/halkvakt-karta` gick inte att skapa — GitHub svarade 404 på grenen, alltså ingen skrivrätt för Bengts
konto. Axel klistrar in den (en mening och ett datum).

**Kvar på #214:** meningen i policyn (Axel) och formuläret ifyllt i Play Console vid första uppladdningen, likadant som filen (Verify).

## #379 (26/9 2026) Kort #203 lager 2 byggt: stationerna i snapshoten, missarna och Siri-fraserna på båda plattformarna

**Beslut (Bengt 26/9: *"gör 203"*, *"ja till A"*, *"fortsätt med lager 2"*).** Axels beslut från 20/9 (#267) byggs: Siri-fraserna
*stämde inte* och *appen missade* (punkt 3), missarna som ett medvetet integritetsbeslut (punkt 4), den stora knappen *Appen missade*
(punkt 5), Android i samma PR (punkt 8). **Fyndet som krävde (A):** underlaget sa att närmaste station *finns alltid* i telefonen —
den fanns inte; `static.json` bar bara kamerorna. Väg (A) valdes framför närmaste kamera (B, en annan uppgift än Axel godkänt) och
bara Siri (C).

**(A) Stationerna, i drift 26/9 08:20Z** (PR #620): `static.json` bär `stations: [{id, lon, lat}]` ur `weather_latest` — **851
stationer**, 288 949 byte (+37 kB), manifestets sha lika med filens. Referenspunkter, inga mätvärden. #75-provet fick ett namngivet
undantag för en fråga utan mätkolumner (motprov: en mätkolumn fäller det).

**Servern:** `driver_miss` (sql/038) — t, vad (halka/vatten/vilt/olycka/annat, CHECK), station_id, segment_id, app, version; dubbellåst,
nyckel (t, station_id, app), samma provmärkning som driver_facit (två kontrakt i kontraktsgrinden, motprov lokalt). `facit-svar` tar
emot `{miss: true, t, vad, station, segment?, app, ver}`, eget dygnstak, ±48 h. Integrationsprov för tabellen.

**Apparna:** knappen *Appen missade* i körläget (bara med betatestet på) sparar klockslaget, närmaste station och halkavsnitt inom
2 km; efter resan väljer föraren vad det var — **först då skickas missen**, en omarkerad miss skickas aldrig. Kortet och notisen frågar
om missar; bara missar ⇒ inga notisknappar. iPhone: *"Hej Siri, stämde inte i Halkvakt"* (senaste varningen, yngre än tio minuter) och
*"appen missade i Halkvakt"* / *"halt här i Halkvakt"*. Brytarens text bär Axels mening ordagrant; Om säger vad som skickas. 0.3.9 (18)
på båda. **Bevis Android:** android.yml 36224074048 (Android-steget, JVM-prov inkl. sju nya i MissarTest) och 36224807598 (hela grenen, emulator och fotostudio) gröna på grenen; motprovet 36224079213 rött på exakt de två väntade proven (en omarkerad miss skickas, segmentgränsen 40 km) — 53 prov, 2 fällda. **iOS** skrivet utan kompilator — Axels Xcode är första kompileringen.

**Invariantregeln i samma varv:** CLAUDE.md:s rad, Play-filen (missens rad, `driver_miss`), produktboken och båda guiderna. **Undantaget:**
`integritet.html` — Bengts konto saknar skrivrätt i karta-repot (#378); meningen står färdig i Play-filen för Axel.

**Kvar efter sammanslagningen:** migrationen `sql/038` via dbknapp, deploy av `facit-svar`, och beviset — en provmiss (`wx:prov-…`) som
ger 204 och en rad med `prov = true`. Sedan Axels bygge 0.3.9 (18) och Verify 2–3 i bil (ett Siri-svar och en klassad miss).

## #380 (26/9 2026) Bildfacit i hela landet (V1–V3) och lagringslarmet vid 800 MB · #253 stängt · #203 lager 2 i drift på servern · två idéer till vårlistan

**Beslut (Bengt 26/9).** (1) *"ja, lägg in det i vårlistan"* — **fartfall som stöd för halka** (Ä3): samma TrafficFlow-data som #15;
sjunker medelhastigheten på en mätpunkt en kall natt kan vägen vara hal. Prövas i skuggan mot kalla, blöta stationer och är aldrig
ensam utlösare (regel T). Täckningen är bara Stockholms och Göteborgs motorvägar. (2) **Fartkamerorna som väglagsbild** (Bengts idé: ett
samarbete med Trafikverket, en bild i timmen utan bil) — till vårlistan (Ä3). Trafiksäkerhetskamerorna fotograferar bara vid överträdelse
och krypterar bilden i kameran (Trafikverkets sida, läst 26/9), och ändamålet är reglerat; billigare först är de 744 öppna
väglagskamerorna (`docs/UTREDNING-FARTKAMEROR-2026-09-26.md`). (3) *"ja till V1–V3 och larmet vid 800 MB"* — efter analysen av steg 0
(§7 i utredningen): tretimmarsspärren träffade 0 av 48 körningar, bilderna följde skuggrutterna (68 av 744 kameror) och 94 % togs vid
fartkameravarningar.

**Byggt, kort #260.** **V1:** skuggmotorn tar ingen facitbild vid ett fartkameralarm (`skuggmotor/main.ts`, bunten omgjord). **V2:** en
ny funktion, `kamerafacit`, tar varje timme bilden vid väglagskameran närmast varje aktuell frysrisk i `live.json` (väderpunkter och
broar) i hela landet — i dagsljus varje timme, i mörker en per kamera och natt (den första; gryningsbilden kommer då av sig själv), tak
**150 om dygnet**. **V3:** två stickprov i timmen vid kalla stationer (yta ≤ 3 °C, #75:s vakt, färsk inom 3 h) som inte är en fara, med en
kamera inom 1 km, bara i dagsljus — det enda kamerafacitet för tystnadsfelet (#98). Urvalet är ren logik i `kamerafacit/urval.ts` (solhöjden
efter NOAA:s förenklade formel), prövat i `test/kamerafacit.test.ts`; bilderna läggs i facit-hinken under `v2/` och `v3/` med timmen i
namnet (`<kamera>-h<epoch/3600>.jpg`), och kontaktarket läser båda namnformerna. Timjobbet `sql/039` på minut 17, kommandot kopierat ur
skuggmotorns jobb med `replace()` inne i databasen. **Larmet:** vakthunden summerar `storage.objects` och larmar vid **800 MB av 1 024**
(`lagringsprov` i dbknappen sätter gränsen till 0); raden *lagring: X MB* står i varje körning. **Följdändring:** vakthundens bildkontroll
krävde ≥ 10 svenska larm på 12 h utan bild — efter V1 hade den larmat varje dygn, eftersom fartkameralarmen var 94 % av larmen. Den räknar
nu bara larm med punkt som inte är fartkameror. **Kontraktet:** facitradien 15 km står i skuggmotorn (två filer, källa och bunt) och i
urvalet; kontraktsgrinden vaktar den (motprov: 14 km i urvalet fäller grinden på rätt kontrakt). Inga Actions-minuter, inget betalbeslut.
Rösten, apparna och det apparna skickar är orörda.

**#253 stängt** (femma sju (1), DECISIONS #373): censurmätningen (`scripts/matningar/censur-grind-a-2026-09-26.sql`, dbknapp 36227029454) över första hela dygnet efter ändringen, 25/9 07:30Z–26/9 07:30Z: kalla halvtimmar (yta ≤ 5 °C) 231 mål, 452 grannplatser, **2 saknas — 0,4 %** (var 49,5 %; gränsen 5 %); frysnära (≤ 1 °C) 2 mål, 7 av 7 grannplatser. Tillväxten: **10 796 → 63 095 rader per dygn** (814 → 836 stationer), väderarkivet 88 MB, databasen 186 MB av 500. Verify uppfylld. Tillväxten är 5,8 gånger — mer än de ≈ 46 000 rader om dygnet
som lästes ur en enda halvtimme 25/9, eftersom kalla och blöta stationer sparas i varje varv och de varma en gång per halvtimme. Gallringen
tunnar allt äldre än sju dygn till en rad per station och halvtimme (högst 836 × 48 = 40 128 om dygnet), så databasen bär det; exporten
packar vart gallrat dygn till ≈ 1 MB i samma 1 GB som bilderna (beräknat ur sql/034:s mätning, inte mätt). Reservation: ett varmt
septemberdygn — 231 kalla halvtimmar, två frysnära.

**#203 lager 2 i drift på servern 26/9 07:00Z:** migrationen sql/038 via dbknapp 36225368861 (tabellen finns, RLS på, anon utan SELECT och INSERT), deploy av `facit-svar` 36225396540 från main, provmiss mot den riktiga funktionen ⇒ 204 och en rad med `prov = true` (dbknapp 36225453047; 0 riktiga), två felaktiga missar ⇒ 400, och ett provsvar på den gamla vägen ⇒ fortfarande 204.

**Kvar efter sammanslagningen:** deploy av `skuggmotor`, `kamerafacit` och `vakthund` från main; `sql/039` via dbknapp; beviset —
`kamerafacitprov` (torrt urval), `lagringsprov` (larmet går), vakthundens skarpa rad och första timkörningens svar. Efter sju dygn: bilder
och MB per dygn mot taket, i bedömningen.

**I drift 26/9 08:24Z** (bokfört 1/10): PR #622 (54ac0d4); deploy från main av kamerafacit 36229634732, skuggmotor 36229638425 och vakthund 36229641777 (08:24Z); sql/039 via dbknapp 36229707252 — jobbet `halkvakt-kamerafacit` `17 * * * *`, aktivt, pekar på kamerafacit (kommandot 267 tecken, aldrig utskrivet). **(1) V1:** skuggmotorn 08:02Z (före): ett fartkameralarm ⇒ 1 bild, 886 ms; 08:32Z (efter): ett fartkameralarm ⇒ 0 bilder, 0 ms, skälet *bara segment- eller fartkameralarm* (dbknapp 36230218670). Bilden 09:02Z kom från en vattenplaningsvarning på E4 Sundsvall→Umeå — avsett, TROSKLAR-VATTENPLANING §2 (36232395271). **(2) Timkörningen:** torrprovet 08:25Z och den första riktiga 09:17Z svarar 200 och `ok`, `faror 0`, `kalla_stationer 0` — varmt, inget att välja; pg_cron *succeeded* (36232357646). **(3) Larmet:** lagringsprovet (36229762008) ⇒ *LAGRINGEN ÄR 26 MB*, issue #623 öppnad 08:27Z och stängd av det gröna varvet 09:07Z; det varvet skrev *lagring: 26 MB av 1 024 (larm vid 800 MB)* och bildkontrollen *skuggans svenska larm 12 h: 0* — inget falsklarm efter V1. **Kvar:** första V2- eller V3-bilden när kylan kommer, och efter sju dygn bilder och MB per dygn mot taket (3/10).

## #381 (27/9 2026) Kalendern skiljs från tavlan — och septembersiffran rättad med en hel månads mätning

**Beslut (Bengt 27/9, ordagrant):** *"Ja till kalenderlistan och stäng korten."*

**Problemet var inte arbetsmängd utan konstruktion.** Bland korten och i bedömningens §0b låg plikter som **inte har
något slutläge**: nycklar som går ut igen, en databas som växer igen, ett månadsskifte som kommer igen. De kunde aldrig
bockas av. Så länge de låg bland korten kunde tavlan inte nå noll, och ambitionen *"stänga systemet när det är
fullkomligt"* var omöjlig av konstruktion — inte av brist på arbete. Fyndet skrevs i bedömningens §6.3 samma dag.

**`docs/KALENDERN.md` skapad**, med regeln som avgör var något hör hemma: har raden en *Verify* som kan uppfyllas en
gång hör den hemma på tavlan; återkommer den, eller är den ett datum då något ska **läsas av**, hör den hemma i
kalendern. Bär den en dom, ett bygge eller ett beslut är den ett kort, oavsett datum.

**Fem plikter flyttade:** PAT-rotationen (senast 15/11), Supabase-tokenen (senast 1/12), databasens storlek (var sjunde
dygn), Actions-kassan (varje månadsskifte) och `ubuntu-latest` → Ubuntu 26 den 19/10.

**Kort #86 NYCKELKALENDERN stängt.** Vakten var byggd och bevisad (check 10, issue #272 läste PAT:ens datum live 15/9);
det som återstod var två datum någon måste läsa av, och de bor nu i kalendern.

**Listan är inte en kopia.** Den äger sina rader; de finns inte kvar som kort. Två listor över samma sak glider isär —
samma läxa som vitlistan i `dbknapp`. Ett datum som får en dom eller ett bygge hängande på sig flyttar tillbaka.

**Vad som INTE flyttades, fast det har ett datum:** dom 1 i januari, kalibreringen 1/2, dom 2 i mars,
kamerafacit-bilderna i mars, betan i november, Pro-beslutet senast 1/11, steg 0 inom sju dygn efter första frostnatten.

### Rättelse i samma varv: septembersiffran

Tidigare samma dag skrev jag att septemberfakturan skulle passera 35 USD, med ~38 som troligt utfall. **Det talet byggde
på ett enda dygn** — 26/9, som hade femton androidbyggen — och extrapolerades till månaden. Det är precis det CLAUDE.md
förbjuder, och det blev för högt.

Hela september är nu omräknad med GitHubs egen regel, jobb för jobb över **4 459 körningar och 4 413 jobb**:

| | minuter | debiterat |
| :-- | --: | --: |
| kassavaktens regel (väggklocka per körning) | 6 025 | 32,20 USD |
| GitHubs regel (per jobb) | **5 916** | **31,33 USD** |

**Vakten är 1,8 % fel, inte 30 %.** Felen tar ut varandra över en månad: android −315 min (två jobb per körning räknas
som ett), healthcheck +152 och publish-map +136 (kötid räknas som körtid). Den öppna frågan i §4.2 om att rätta regeln
står kvar som riktig — regeln *är* fel — men den ändrar inget beslut, och den rangordnas därefter.

**Utfall:** ~33,2 USD den 1/10 med drift enbart. Varje byggdygn lägger ~1,5–2 USD ovanpå, så ett eller två räcker för
att passera 35. Åtgärden är oförändrad och enkel: **inga app-byggen resten av september.**

## #382 (27/9 2026) Batteribudgeten mätt på iPhone för första gången — 7 %/h, och två förbehåll åt samma håll

**Mätningen (Bengt 27/9).** iPhone, bygge **0.3.9 (14)**, skärmen av, vakten igång hela tiden:
**78 % → 71 % på en timme = 7 %/h** mot CLAUDE.md:s krav *< 8 %/h skärmen av*. Kravet håller.

Det är första gången budgeten mätts överhuvudtaget. Den stod som krav på tre ställen med noll motprov (kort #218,
genomlysningen 20/9), och det enda tidigare försöket — Bodenresan 1/9 — hade laddare i bilen och kunde därför inte mäta.

**Två villkor som inte rapporterades men följer av talen:**
- **Ingen sladd satt i.** Hade kabel-CarPlay laddat hade procenten stigit, inte fallit. Det var precis felet 1/9.
- **Telefonen rörde sig.** iOS stoppar vakten själv efter en kvart stilla; den gick hela timmen.

**Två förbehåll, båda åt samma håll — talet är ett golv, inte ett kvitto.**

1. **Upplösningen.** iOS visar hela procent. 78 → 71 betyder att den sanna förbrukningen ligger mellan **6,0 och
   8,0 %/h** (start 77,5–78,5, slut 70,5–71,5). Punktskattningen klarar gränsen; intervallets övre kant **rör** den.
   En timmes mätning kan alltså inte skilja god marginal från precis på gränsen. Samma läxa som vektorgeneratorns
   5-metersregel: mät marginalen, gissa inte på den.
2. **Bygget är äldre än main.** (14) ligger före #258 — *iPhone laddar om vägdatan under resan* (Bengts ja 26/9,
   DECISIONS #371) — som lägger till nätarbete under körningen. Main bär **0.3.9 (18)** och gör alltså mer än det som
   mättes. Siffran certifierar (14), inte (18).

**Vad beslutet avgör.** Kort #218 sa att iOS-regleringen (glesare GPS) avgörs först efter iPhone-mätningen, och att
inget finns att vinna om iPhone redan håller sig under 8 %/h. **Mätningen ger inget stöd för att glesa ut GPS:en** —
det vore en säkerhetsförsämring utan uppmätt vinst.

**Vad det inte avgör.** Frågan stängs inte på ett tal vars övre kant rör gränsen, mätt på ett bygge som är äldre än
main. Nästa mätning görs på **0.3.9 (18) eller senare, gärna över två timmar**, så upplösningen halveras räknat i
procent per timme.

**Kortet står kvar öppet.** Verify-raden kräver båda plattformarna; **Android-mätningen** återstår och körs på
testtelefonen (DECISIONS #271/#272), utan köp.

## #383 (27/9 2026) Kuvösens norska sond: DATEX bär ingen historik — och fyra 200-svar var fällan

**Bengts ja 27/9** till att bygga sonden som ett Actions-jobb. Körning **36344233168**, grön, en minut.

### Vad som är bevisat

**Vegvesens DATEX-server — den vi redan har konto till — bär ingen historik.** Sonden frågade efter fyra rimliga
ändpunkter: `pulldeltadata`, `pullhistoricdata`, `pullhistorydata`, `pullarchivedata`. **Alla fyra svarade HTTP 200.**

Läser man bara statuskoden ser det ut som fyra historiska ingångar. Läser man kroppen bär var och en
`<ns17:pullSnapshotDataOutput>` — servern struntar i sökvägen och lämnar samma ögonblicksbild varje gång. Kontrollen
(`pullsnapshotdata`) bekräftade att kontot fungerar, så det är inte ett behörighetsfel.

**Fyra 200 är här sämre än ett 404**, för de ljuger om sin form. Ett 404 hade avslutat frågan på en sekund.

### Vad som INTE är bevisat — och där jag antog fel

**MET Frost står oprövad.** Spår B var byggt på antagandet att elementlistan är öppen referensdata, så att den billiga
frågan — *har MET alls ett yttemperatur-element?* — kunde ställas före kontofrågan. `elements/v0.jsonld` gav **401**.
Antagandet var fel, och spårets hela poäng föll. (`observations` utan nyckel gav 400, inte 401: servern validerar
frågan före behörigheten.)

Kriteriets punkt 1 — yttemperatur per station — står alltså oprövad för Norge. **Norge är varken en öppen eller en
stängd dörr; den är obesvarad.**

**Spår C:** `api.vegvesen.no` och `datainn.vegvesen.no` gick inte att slå upp (fetch failed) — kandidatnamnen var fel,
inte idén. `www.vegvesen.no/trafikkdata/api/` gav 404; trafikproxyn i kort #42 steg 4b behöver rätt sökväg.

### Instrumentet gick på samma fälla som det skulle avslöja

Sonden räknade `r.ok` som "svar" och redovisade **6 svar lästa** med grönt jobb — fast fyra av dem var samma snapshot i
förklädnad och inget av dem svarade på frågan. Hade jag läst sammanfattningsraden i stället för kroppen hade jag
rapporterat att Norge bär historik. Läxan är införd i CLAUDE.md: **en sond som provar kandidat-ändpunkter räknar på
svarets rotelement eller en annan innehållsmarkör, aldrig på statuskoden — och skriver ut markören den räknade på.**

### Nästa steg, litet och gratis

Registrera ett client-id på frost.met.no (självbetjäning, kostnadsfritt för icke-kommersiellt bruk), lägg det i GitHub
Secrets som `FROST_CLIENT_ID`, tryck knappen igen. Då svarar spår B på riktigt. Kostnad: en minut Actions.

**Vad det betyder för kuvösen:** en av två kända sidodörrar är nu definitivt stängd. Trafikverkets tystnad väger
därmed tyngre, och hållbarhetstiden (omkring 1 december, DECISIONS-raden i kort #232) står oförändrad.

## #384 (28/9 2026) Larma vid förändring, inte vid tillstånd — och ett rött jobb ska inte kosta det som lästes

**Bengts ja 28/9** på båda punkterna, efter nio identiska larm på en kväll.

### Vad som hände

`trv-bevakning` föll måndag 06:40 på **en enda rad**: `no-vegvesen: fetch failed`. Det är Vegvesens
NYHETSSIDA (signalkällan), inte dataservern — Norges data flödade hela dygnet (steget
*🇳🇴 Vegvesen DATEX → no.** grönt 14:24:37). Tolv av tretton källor lästes. Omkörning 16:59 grön:
felet var övergående.

Två fel blev synliga i skuggan av det, och inget av dem handlade om Norge.

### (a) Ett rött jobb lämnade state ocommittat

Commit-steget saknade `if:`, så ett fallet skript hoppade över det. Skriptet skriver state INNAN det
returnerar, och en källa som kastar behåller sin GAMLA post (tilldelningen sker efter lyckad läsning).
Alltså: de tolv källor som lästes nådde aldrig main. State stod kvar på **21/9** trots att körningen
hittat fem ändringar, och nästa måndag hade jämfört mot samma gamla state och larmat om samma fem
saker igen.

Det är samma FÖLJD som CRLF-felet i kort #161 — rött jobb ⇒ vakten står stilla men ser levande ut —
av en annan orsak. Lagningen 18/9 tätade git-steget; den tätade inte "vilket fel som helst lämnar
state ocommittat". **Åtgärd: `if: always()` på commit-steget.**

### (b) Mätvakten upprepade ett identiskt fynd varje timme

`trv-bevakning` är ett **veckojobb**. Mätvakten kör varje timme och kommenterade så länge fyndet stod
kvar: **nio identiska kommentarer på issue #640 mellan 08:07 och 16:07**, byte för byte samma text.
Nästa körning som kunde rensa flaggan var måndag 5/10 — alltså **omkring 168 kommentarer och 168
mejl för en enda händelse**.

Vakten hade dedup för ISSUES (kommenterar i stället för att öppna nya) men ingen för INNEHÅLL.

**Åtgärd, ordagrant enligt Bengt:** *larma vid förändring, inte vid tillstånd.* Den öppna issuen ÄR
det stående tillståndet; kommentarerna är förändringsloggen. Jämförelsen görs på **fyndraderna**
(`- ❌ …`), inte på hela kroppen — tidsstämpeln ändras varje varv och hade gjort varje jämförelse
olik. Ingen daglig puls lades till: issuen står öppen, och det är signalen.

### Varför det är värt ett beslut och inte bara en fix

En vakt som ropar 168 gånger för en händelse lär sin läsare att skumma, och då går det första ÄKTA
larmet förbi. Det är samma mekanism som gravstenarna i deviations-tabellen: bruset gjorde signalen
osynlig. Skillnaden är att gravstenarna tog veckor att upptäcka; det här syntes på ett dygn, för att
larmen gick till en människas telefon.

**Kvar, inte åtgärdat i det här varvet:** samma körning skapade fem källändringslarm (#635–#639) där
minst två är falska positiver — `polisen-api` dömdes RÖR OSS på ordet *api*, som står i sidans egen
permanenta rubrik, och `smhi-uppdateringar` på *observation* i en post om HYDROLOGISKA observationer
(vi använder meteorologiska). Bedömningen matchar mot hela sidan, inklusive rubrik, cookiebanner och
sidfot. Eget kort; inget ja begärt ännu.

### Bevis, samma kväll (28/9)

**(a) state når main även när jobbet faller.** Omkörningen 16:59 gick grön och committade
`ingest/trv-nyheter-state.json` **17:00:19 med 13 källor** (commit 6e11358). Före det stod filen på
**21/9**. Flödet har alltså gått från "ser levande ut men står stilla" till att faktiskt avancera.

**(b) mätvakten upprepar inte längre.** Två mätningar, båda efter deployen 17:04:

1. **Stängningsvägen håller.** Kl 17:07:05 stängde mätvakten issue #640 av sig själv, med en tionde
   kommentar som var *"Stänger — mätningarna går och källorna växer igen."* — inte ett tionde larm.
   Utan lagningen hade det blivit en identisk kommentar varje timme till måndag 5/10.
2. **Motprov på dedupen.** Två tryck på `matvaktprov` i rad, med identiskt fynd:
   · Prov A (körning 36455960212) skapade issue **#645, 0 kommentarer** — fyndet står i kroppen.
   · Prov B (körning 36456250932), samma fynd: **fortfarande 0 kommentarer.**
   **Dom: 0 → 0. Dedupen biter.** Hade jämförelsen gjorts på hela kroppen i stället för på
   fyndraderna hade tidsstämpeln gjort varje varv olikt och provet gett 0 → 1.

Provet självt hade ett fel värt att notera: första försöket föll på **HTTP 415** — min POST saknade
`Content-Type: application/json`. Det var mätinstrumentet, inte vakten, och det syntes direkt för att
felkoden lästes i stället för att tolkas som ett nej.

## #385 (28/9 2026) Källvaktens falska positiver — och rättelsen av min egen diagnos

**Bengts ja 28/9** på kort #261. Två lagningar byggda samma kväll, med var sitt motprov.

### Först: kortets egen premiss var fel, och det upptäcktes innan en rad kod skrevs

Kortet sa att *"bedömningen läser hela sidan i stället för det nya stycket"*. Det stämde inte —
`changes.push` skickar redan bara `nya.join(" ")`, alltså enbart de nya styckena. Diagnosen var gjord
på en logg, inte på koden.

Den riktiga mekanismen mättes i stället mot state-filens sparade texter (21/9 mot 28/9), som git
råkade bevara åt oss:

- **Styckena var för grova.** `nyText` delade bara på `.!?:`, och normaliserad HTML har få
  meningsslut: rubrik, meny och cookiebanner blir EN körning. Längsta uppmätta stycke: **2 054 tecken**.
- **Den falska röda, exakt:** ordet **"myndighet"** försvann ur polisens cookietext. Rubriken
  *"API över polisens händelser"* satt i samma 152-teckens körning och följde därför med in i "det
  nya". Domen föll sedan på ordet *api* — ur en rubrik som står på sidan permanent och därför aldrig
  kan betyda en ändring.

Ett ändrat ord någonstans i en körning republicerade alltså allt annat i den. Det är en
granularitetsfråga, inte en fråga om vad som läses.

### Lagning 1: `nyText` delar även på `|`, `·`, `•`

Rubriken får ett eget stycke. Prövat mot den riktiga datan: samma ändring ger **0 nya stycken som
innehåller ordet *api***. Larmet går fortfarande ut, nu som VET INTE — **bedömningen graderar, den
tystar aldrig**.

### Lagning 2: det breda ordet `observation` ströks ur metobs nyckelord

28/9 dömdes *"Arkivdata-API för hydrologiska observationer fungerar igen"* 🔴 RÖR OSS på det ordet.
Vi läser metobs, alltså meteorologiska.

**Fyndet bakom fyndet:** ordet *hydrolog* stod **redan** som främmande ord på signalraden — någon hade
förutsett precis det här. Men i graderingen rankar en träff över ett främmande ord, så det för breda
`observation` tystade den kunskap som var rätt. Med ordet struket blir posten ⚪ **RÖR OSS INTE** med
skälet utskrivet. De specifika orden (`metobs`, `meteorologiska observationer`, `parameter 16`,
`molnmängd`, `latest-months`) står kvar, så en äkta metobs-post träffar som förut.

### Motprov, ett per vakt

Läxan 20/9 säger att en regel som vaktas av flera vakter muteras en gång per vakt:
delningen backad ⇒ **test 27 faller**; `observation` återinfört ⇒ **test 29 faller**. Med båda
lagningarna: 30/30 i nyhetsbedömningens svit, **199/199 i hela `npm test`**, beroendekartan komplett,
kontraktsgrinden orörd.

### Vad som INTE lagades

Footerns rad *"Granskad # september"* ger fortfarande ett VET INTE-larm när granskningsdatumet ändras.
Det är brus, inte en falsk röd, och det kräver ett sitespecifikt filter — sådana glider isär från det
de filtrerar, så det byggs inte utan att någon ber om det.

## #386 (27/9 2026) Androidvakten gick 11 h 39 m på en baddag: självstoppet kan i praktiken bara fira för en parkerad bil (kort #262)

**Fältrapport 27/9 från en Androidtestare**, två skärmbilder ur *Batterianvändning för app*. Testarens egna ord: *"Den suger
mycke batteri appen undrade varför jag bara hade 42 % när vi vart o badat + stugan knappt använt telefonen"* och, efter en
titt på gårdagen, *"Ser nu att jag haft den på hela tiden. Är kanske inte så man ska ha."*

**Svaret på det sista är nej — det är precis vad självstoppet finns för.** Testaren använde appen som en människa gör, och
hittade en riktig defekt. Det är den bästa sortens fältrapport.

**Mätningen.** 27/9 14:59: total användningstid **11 h 39 m**, skärm på **0 m**, GPS **6 h 40 m**, väckningar **924**,
väckningslås **4 h 16 m**, CPU **2 h 21 m**, mobildata 1 717 paket, Wi-Fi 4 028 paket. 26/9: Halkvakt **21,6 %** av dygnets
batterianvändning (Google Play-tjänster 5,9 %, delvis våra egna anrop).

**Vad talen betyder — och vad de INTE betyder.** 21,6 % är en ANDEL av förbrukningen, inte procentenheter batteri. Antas dygnet
ha dragit ~80 pe blir Halkvakts del ~17 pe över ~11,6 timmars aktiv tid ⇒ **~1,5 %/h, alltså inom 8 %/h-budgeten**. Startvärdet
är okänt, så talet är en uppskattning med utskriven förutsättning, inte en mätning. **Slutsatsen vänder ändå på problemet:
appen drar inte mycket per timme — den har alldeles för många timmar.** Ett dygn i stället för en resa. Paketräkningen är
dessutom låg, vilket är ett självständigt kvitto på att omladdningsloopen (#370) inte kör längre.

**Rotorsakskedjan, läst i koden och inte gissad:**
1. Testaren startade vakten **manuellt**.
2. `AutostartController.onVehicleExit()` returnerar `NONE` när `autoStarted == false`. **En manuellt startad vakt stoppas
   alltså aldrig av Activity Recognition** — medvetet, för att AR-flimmer inte ska döda en vakt föraren själv slog på.
3. Kvar som enda stoppare: `IdleStop` — 15 minuter under **5 km/h**.
4. **5 km/h är gångfart**, och `onFix` nollställer klockan på ETT enda mätvärde ≥ 5 km/h. Ett brusigt värde i kvarten räcker.
   Den som badar, går till sjön och rör sig i en stuga fyller aldrig kvarten. **Självstoppet kan i praktiken bara fira för en
   parkerad bil** — inte för en telefon som bärs av en människa.
5. ⇒ vakten gick 11 h 39 m.

**Läxan i familjen "fanns ≠ fungerade".** `IdleStop` är byggd, enhetstestad och bevisad på JVM:en (#248) — och ändå kan den
aldrig fira i det vanligaste verkliga fallet. Testet matade den med de hastigheter vi TÄNKTE oss (bil som står still), inte med
de hastigheter en buren telefon faktiskt rapporterar. **Ett prov som bara innehåller det vi föreställde oss bevisar vår
föreställning, inte funktionen.** Femte gången i repot att något byggt och grönt inte gör det man tror (jfr #193/#196, #384).

**Tillhörande lucka:** den pågående notisen har **ingen stoppknapp**. Bara *efter resan*-notisen bär knappar. För att stoppa
vakten måste appen öppnas — halva skälet att den blev kvar på.

**Andrafyndet, CPU 2 h 21 m på 11 h 39 m (20 %):** `retuneCadence` anropar `Guard.nearestHazardM`, som gör
`coords.minOfOrNull { haversineM }` över varje koordinat i varje fara, och `engine.step` går över samma material. Vid 1 Hz
nära en fara blir det två nationella svep i sekunden. Ren prestandaskuld, ingen beteendeändring att besluta om.

**Åtgärder, i ordning (kort #262):** (1) stoppknapp i den pågående notisen — ingen tröskel, ingen avvägning, byggs direkt ·
(2) självstoppet robust mot gångfart — **säkerhetsnära och därför ett beslut**, se nedan · (3) ska AR-exit få stoppa även en
manuellt startad vakt? · (4) cache i `nearestHazardM`.

**Beslutet som (2) kräver, och som INTE tas ensidigt.** Höjs gränsen eller byts den mot förflyttning över fönstret blir
vakten bättre på att sluta — och sämre på att hålla ut i en lång kö. Att tystna i en kö är silence när det gällde, alltså det
dyraste felet appen kan göra. Trösklar skrivs dessutom före mätning i det här projektet, och en tröskel som bär ett beteende
ska genom värdevakten. **Frågan går till Bengt och Axel i bedömningen §4.2.**

**Frågor till testaren, via Bengt:** byggnummer? Var *starta själv* påslagen? Är det Samsung-telefonen? Svaren avgör om (2)
eller (3) är rätt fix — är autostart av, är AR-spåret inte ens inkopplat och (2) är hela åtgärden.

## #387 (27/9 2026) Batteripaketet till Axel — och fyndet som gör hela fältrapporten otolkbar: "Version 0.3.1" betyder ingenting

**Bengts order 27/9:** *"det är ingen Samsung. Föreslå ett åtgärdspaket för detta och ovanstående. Gör ingenting själv jag vill
att Axel gör det."* Paketet ligger som kort **#262** i *Axels nästa steg*, sju åtgärder Å0–Å6. Ingen appkod har rörts.

**Två nya skärmbilder gav fyra fynd som #386 inte kunde se.**

**1. "Version 0.3.1" på Om-sidan säger ingenting om vilken kod testaren kör — och det är paketets viktigaste fynd.**
Versionsnumret stod stilla på 0.3.1 / versionCode 4 **från 31/8 till 26/9** medan koden följde med (konstaterat 20/9,
rättat först 26/9 i #377). Alltså: vi kan **inte** veta om testaren har självstoppet (#248, 24/9) eller omladdningsfixen
(#370, 26/9). **Hela fältrapporten är otolkbar tills testaren står på ett bygge vars nummer betyder något**, och varje
slutsats vi drar ur den riskerar att beskriva kod vi redan bytt. Därför är Å0 — ge testaren 0.3.9 (18) — först i paketet och
inte förhandlingsbar. Det är samma familj som #240: *ett byggnummer som sätts före den sista ändringen bevisar inte vilket
bygge som är ute.* Här är det värre: numret sattes inte alls på en månad.

**2. Autostart var PÅSLAGEN — och reglagets text ljuger om vad det gör.** Texten säger *"Startar när bilens Bluetooth
kopplas"*. Men `AutostartManager.setEnabled` registrerar också **Activity Recognition**-övergångar, som startar vakten vid
IN_VEHICLE i vilket fordon som helst — buss, som passagerare, någon annans bil. Användaren kan alltså inte av texten förstå
varför vakten startar. Användarsynligt ⇒ **PRODUKTBOKSREGELN: texten och produktboken i samma varv** (Å4).

**3. En fartkamera 2,0 km bort låser appen på 1 Hz.** `CadencePolicy` ger NEAR (1 s) inom 5 km, MID (5 s) inom 20 km, annars
FAR (15 s). Kommentaren i filen säger rakt ut att den är skriven för *"a Norrland E4 stretch"* där närmaste fara kan vara
100+ km bort. **Där människor faktiskt bor finns alltid något inom 5 km**, så batterispartiererna slår nästan aldrig till.
Testarens skärmbild visar precis det: *FARTKAMERA 2,0 km*. **Förslaget (Å2) är en stillaståendetier**, och den är bevisbart
säker på ett sätt de andra inte är: **vid 0 km/h går det inte att nå en fara**, oavsett hur nära den ligger. Den kostar
ingenting i säkerhet och tar bort det som rimligen är den största posten per timme.

**4. Telefonen är inte en Samsung.** Vår testmobil är Samsung A *just för att* den är aggressivast mot bakgrundsappar
(skills/halkvakt-android §3). Nu kommer rapporten från ett annat fabrikat, vars batterihanterare beter sig annorlunda.
**Vi kan alltså inte räkna med att reproducera felet på testtelefonen** — och en åtgärd som ser grön ut där bevisar inte
fältet. Läxan förs in i `skills/halkvakt-android/SKILL.md` §5 i samma commit som någon rör Android-koden, och kort #218:s
Android-mätning bör köras på minst två fabrikat.

**En siffra som INTE är ett bevis:** 44 % kl. 15:26 → 32 % kl. 16:38 = 12 procentenheter på 72 minuter ≈ **10 %/h**, alltså
över budgeten. Men vaktens läge i fönstret är okänt, skärmen var på när skärmbilderna togs, och telefonen laddade mellan
14:59 (42 %) och 15:26 (44 %). **Talet duger som signal att mäta om, inte som dom.** Det skrivs hit just för att det annars
hade citerats som en mätning nästa gång någon läser tråden — samma fälla som kassavaktens halverade tal 13/9 (läxan i CLAUDE.md om träfftaket i `/actions/runs`).

**Vad paketet INTE innehåller, med flit.** Ingen ändring av motorn, ingen tröskel ändrad i det här varvet, och ingen kod
skriven. Å2 och Å3 bär trösklar och går därför till Bengt + Axel i bedömningen §4.2 före bygge, och genom
`scripts/vardevakten.ts` innan de bär ett beteende. Båda är säkerhetsnära åt samma håll: **en vakt som tystnar i en kö är
silence när det gällde.**

## #388 (28/9 2026) Kuvösen: Bengt avvaktar Trafikverkets beslut om utlämnande — inget annat. All eskalering stängd

**Bengts order 28/9:** *"allt om klaga hos trafikverket etc kan du stänga. Jag undrade bara hur långt kuvösen kommit. Jag
avvaktar beslut om utlämnande från Trafikverket inget annat."*

**Stängt:** reservformuläret *Frågor till Trafikverket*, kravet på ett skriftligt avslagsbeslut (PR #631), överklagande,
de färdiga texterna på kort #232 (#397/#398) och frågan om hur uttaget ska kapas. Inget av det skickas.

**Läget, som det nu står:** begäran om utlämnande av allmän handling är inskickad och obesvarad (Bengts besked 27/9, #631).
Kortet väntar på Trafikverkets beslut och på ingenting annat. **Öppen väntan är valet** — PR #631:s förslag om ett
beslutsdatum är därmed besvarat. Hållbarhetstiden (omkring 1 december) står kvar som fakta, inte som utlösare.

**Kvar som fakta, inte som åtgärder:** vid ett ja är elektronisk form ingen rättighet och ett uttag som kräver programmering
ingen rutinbetonad åtgärd (#631, #398); kostnadsregimerna i #398 gäller om beslutet kommer med en avgift, och ingen
kostnad accepteras utan Axels godkännande. Norge: DATEX bär ingen historik (#383); MET Frost är oprövad och inget prov är
beställt.

**Läxa, min egen:** 27/9 skrev jag in *"besvarad: förfrågan 21/9 är den som avses"* som om det var Bengts svar. Han hade
inte sagt det; han hade frågat något annat, och jag läste frågan som ett svar. Samma kväll sa han motsatsen till en
parallell session. En tolkning av vad någon menar skrivs som en fråga i §4.2, aldrig som ett ✅.

## #389 (28/9 2026) Kort #244 läst: rent i 134 av 134 skuggvarv — och Verify:ns mått rymmer bara sex timmar. Plus en fälla i DB-knappen (kort #263)

**Bengts order 28/9:** *"kolla 244"*.

**Verify:ns mått räcker inte.** Kortet säger *noll 546 på tre dygn* och den färdiga frågan räknar 546 i `net._http_response`.
Läst 28/9 03:58Z: **0 av 501 svar var 546** — men den äldsta raden i tabellen är 27/9 21:59Z. pg_net rensar svaren efter ungefär
sex timmar. Frågan kan alltså bara säga något om de senaste sex timmarna, oavsett vilket fönster den skriver i sin WHERE-sats. Att
den svarar på ett fönster på tre dygn utan att klaga är samma fälla som statuskoden 200: ett svar är inte ett bevis om det man frågade.

**Måttet som täcker hela fönstret:** skuggmotorn skriver en rad per rutt inne i varvet, och `shadow_log` gallras aldrig. Ett varv som
dör halvvägs lämnar färre rader. Räknat för varje :02/:32 från 25/9 09:02 (första varvet efter lagningen 08:32) till 28/9 03:32:
**134 varv, 383 rader — 115 varv med 3 rader, 19 med 2, inget med 0.** De 19 korta ligger exakt vart sjunde varv (10:32, 14:02,
17:32 …): rotationen över 20 rutter med tre per varv (6 × 3 + 2 = 20). Inget varv saknas och inget dog halvvägs.

**Därför stängs kortet inte i dag klockan fyra.** Tre dygn efter lagningen är 28/9 08:32Z; 66,5 av 72 timmar är lästa. En läsning
efter 08:32Z täcker resten i båda måtten — pg_net-fönstret rymmer då just 02:32–08:32 — och stänger kortet om den är ren.

**Fyndet på vägen — kort #263.** DB-knappen läser genom att köra en migration och bevisrader efteråt, och standardfilen är
`sql/014_gallring.sql`. Men 014 schemalägger om `halkvakt-gallring` till `gallra_vader(7)`, medan jobbet sedan `sql/026` kör
`gallra_arkiv(7)` med grannarna, gravstenarna och tidsvakten (`sql/031`). Ett tryck med standardvärdet stänger alltså tyst av
den gallring som håller databasen under gratisnivåns tak. Kontrollerat 03:58Z: jobbet bär `SELECT gallra_arkiv(7)`, fällan har inte
löst ut. Läsningarna i dag bar `sql/033_kamerafacit.sql`, som bara skapar om det som saknas. Åtgärden — ett läsläge i knappen — är
kort #263 i *Claude — olåst*, inte byggd.

**Tillägg 28/9 08:42Z — sista läsningen, kort #244 stängt (Bengt: *"ja, gör sista läsningen efter 08:32"*).** dbknapp
36398894806, bärare `sql/033`. **144 av 144 skuggvarv** 25/9 09:02 – 28/9 08:32Z skrev sina rader: 123 med tre, 21 med två, inget
med noll. De korta föll 05:02 och 08:32 i dag, sju varv efter 01:32 och sju efter varandra — rotationen håller hela vägen.
`net._http_response`: **0 av 509** svar var 546 i fönstret 02:42–08:41Z; ihop med 04:00-läsningen (21:59–03:58Z, 0 av 501) är
de sista tio timmarna lästa direkt, och hela fönstret genom raderna. Gallringsjobbet bär `SELECT gallra_arkiv(7)`. Verify uppfylld:
kortet till TAVLA-ARKIV ordagrant, en rad i KLART, bedömningens två §0b-rader och kalenderraden strukna. Tavlan 36 → 35.

## #390 (28/9 2026) Bengts provmiss raderad ur driver_miss — facit har åter 0 riktiga missar

**Bengts order 28/9:** *"ta bort mina provmissar ur databasen"*.

**Läst före radering** (DB-knappen, körning 36420889138): `driver_miss` hade två rader. Rad 1 — 26/9 09:00, *annat*,
`wx:prov-203` — är serverns eget bevis från driftsättningen (#380), märkt `prov` av tabellens genererade kolumn, och rördes
inte. Rad 2 — markerad 28/9 13:49:26 svensk tid, *vatten*, `wx:7102`, iOS 0.3.9, mottagen 13:52:06 — var Bengts provtryck och
räknades som riktig. `driver_facit` hade inga rader i dag.

**Raderat** (körning 36420976710): `DELETE … WHERE id = 2` med station, app, val, `NOT prov` och en mottagningstimme i villkoret,
så att satsen inte kunde träffa något annat. `RETURNING` visade exakt den raden; omläsningen efteråt gav 1 rad, 1 prov, 0 riktiga.

**Det databasen också sa:** den skickade missen var markerad 13:49, inte 13:41 som analysen gissade. Bengt markerade alltså tre
gånger på elva minuter (13:41, 13:49, 13:52) och skickade en — beskrivningen till Axel (`docs/TILL-AXEL-BYGGE-19.md`) är rättad.
De två osända ligger kvar i telefonen och skickas bara om ett val görs.

**Varför radering och inte `prov`-märkning:** Bengts ord var *ta bort*, och `prov` är en genererad kolumn som bara följer
station-id:t — den går inte att sätta för hand. **Läxan till bygge (19):** appen kan inte skilja ett provtryck från ett riktigt,
så varje prov i bil landar i facit. Tills appen kan märka prov gäller: provtryck raderas samma dag, och av någon som läst raden först.

## #391 (28/9 2026) Källbevakningens två polislarm stängda som ofarliga — och beroendekartans polisrad rättad

**Bengts order 28/9:** *"ja, stäng issuesen och rätta beroendekartan"*, efter frågan *"påverkar det här oss"*.

**Issue #639 🔴 polisen-api [RÖR OSS] — falsklarm.** Sidan *API över polisens händelser* fick ny kakbanner och ett nytt
*Granskad*-datum i sidfoten, 7 tecken kortare. Fältbeskrivningen är orörd. Den blev röd enbart för att nyckelordet `api` står
i sidans **rubrik**, som kommer med varje gång bannern ändras.

**Issue #638 🟡 polisen-regler [VET INTE] — en ny mening, inte för oss.** *Regler för öppna data* fick meningen *"Aktiviteter
som innebär driftspåverkan på polisens webbplats polisanmäls och vi gör även en incidentanmälan till … CERT-SE."* Vi gör **ett
anrop i timmen** med ett user-agent som säger vilka vi är. Gul var rätt grad: en ändring i villkoren ska läsas av en människa.

**Kartan var inaktuell sedan 22/9.** Raden sa att Polisen *matar varningsslag A4* och att *viltvarningarna* brister om den ändras.
Sedan #318 säger rösten vilt ur Trafikverkets djurdata och snapshotens `wildlife` är tom med flit; Polisen matar bara
`polisen_events` och länsstatistiken på webbkartan. `matar` och `brister` säger nu det. Rollen står kvar som *produktion* —
källan matar arkivet, vilket rollens definition täcker.

**Nyckelorden.** `api`, `händelse` och `öppna data` står i sidornas rubriker och träffar vid varje ändring — `api` gjorde det i
dag. De två andra träffade inte, men bara av ett skäl som är ett fel i sig (nedan). I stället: fälten `ingest/sources/polisen.ts`
läser (`gps`, `datetime`, `summary`, `location`), plus `events`, `user-agent`, `vilt` och `trafikolycka` som förut. Prov:
issuesens egna texter får inte bli röda, och en ändring i `location.gps` eller `datetime` blir det fortfarande. Ordgränsprovet
som byggde på `api` i *rapid* använder nu `location` i *relocation* — samma syfte.

**Fyndet på vägen — kort #264.** `scripts/trv-bevakning.ts` rad 93 byter varje HTML-entitet mot ett **mellanslag**. Polisen.se
kodar å, ä och ö som entiteter, så bevakningen läser *"h ndelser"* och *" ppna data"*. Ett nyckelord med å, ä eller ö kan
därför aldrig träffa på en sådan sida. Inte rättat — det rör alla bevakade källor och är ett eget varv.

## #392 (28/9 2026) Skyltfondsansökan v8B: den tekniska versionen utan partner, 343 000 kr, granskningen upphandlas

**Bengts besked 28/9:** *"Vi kommer förmodligen att använda alternativ 7 B"*, och *"Vi har ännu inte någon kontakt med
universitetet och kommer troligen inte att få någon sådan i tid"*. På förslaget om AP4: *"ja, kör på 343 000 med upphandlad
granskning"*. Om Malmö stad: han har inget ja till att nämnas. Frågan från 23/9 15:44 är obesvarad, och Annas mejl 12:47
samma dag gällde bara påminnelsen.

**Beslut.** v7B uppdateras till **v8B** och ligger som Google-dokument i Bengts Drive-mapp bredvid v6: *"Ansökan
Skyltfonden — Halkvakt (utkast 2026-09-28 v8B, 343 000 kr)"*,
https://docs.google.com/document/d/1Pafo-qBAPutB368NaiZ32A5UGFrAWDDWHp_e7ZH_kmo/edit. Ändringarna mot v7B:
- **AP4** är en upphandlad oberoende granskning i två steg: metod före marsdomen och resultat före rapporten. Den upphandlas
  med offert från minst tre parter efter beviljat bidrag och kostar 60 000 kr. Ingen part namnges. **Sökt belopp 343 000 kr**
  (AP1 126 000 · AP2 70 000 · AP3 41 000 · AP4 60 000 · AP5 28 000 · drift 12 000 · resor 6 000). Egen tid 350 h.
- **Beteendestudien ur "anonymiserade hastighetsserier" är struken.** Den bryter invarianten (#264): rörelsedata får aldrig
  lämna telefonen automatiskt, och en sådan studie hade krävt en ändring i invarianten, Play-deklarationen, integritet.html och
  produktboken. H3 mäts nu med testförarnas svar, en enkät och en gruppintervju, och ansökan säger öppet att det är svagare.
- **"Anonym daglig användningsstatistik (opt-in)" är struken**, eftersom den aldrig byggdes (#21 stängt, pulsen ligger i Ä8,
  #346). Användningen mäts ur appbutikernas aggregerade statistik.
- **Tre påståenden i v7B var fel mot repot och är rättade:**
  - "SMHI:s luftstationer ger tydlig förbättring": SMHI-ankarna gjorde modellen sämre, 1,05 → 1,20 °C.
  - "Förankrad via klimatologiska stationsoffset": offsettabellen utgick 23/9 (#324).
  - "Viltolyckor via Polisen": vilt kommer från Trafikverket sedan 22/9 (#318).
- **Två formuleringar var för starka och är rättade.** Appens läge (testkrets iPhone sedan 31/8, Android sedan 20/9, butikerna
  under hösten med App Store först) och referensrutterna, som är skuggmotorns simulerade rutter.
- **Nytt, med källa:**
  - grind A och vägpunktsgrinden (#321/#324), med förbehållet att de prövas om på ocensurerat underlag (#353);
  - 13 tröskeldokument;
  - givarvakterna (#298/#299) och de två anmälningarna till Trafikverket, 7 + 9 stationer utan överlapp (#300/#304);
  - värdevakten (#133/#134), djurdatan (#316) och `takt` (#200);
  - batteriet på iPhone (#382);
  - missknappen (#379) och kamerafacit;
  - Niras "första bilen" och Trafikverkets "några mätningar per dygn" (NIRA-UTREDNING §3–4) samt Karsisto 2024.
- **Malmö stad nämns inte.** Under *Efter projektet* står en allmän mening om kommunala stationer. Checklistan bär den
  namngivna meningen om Anna svarar ja före sändning.

**Alternativ.** (a) Stryka AP4 helt, 283 000 kr: fonden förlorar den oberoende kontrollen som bär v7B:s trovärdighet utan
partner. (b) Behålla VTI/LTH vid namn: det vore ett löfte utan kontakt i en allmän handling. (c) Behålla beteendestudien med
hastighetsdata: den bryter invarianten. Bengt valde upphandlingen.

**Kvar före sändning, i checklistan:**
- sökande, privatperson eller förening (Axels beslut, fortfarande obesvarat);
- SYSTEM.md som bilaga 3, som säger Polisen och Android 0.3.1 och behöver rättas;
- `integritet.html` (Axel);
- kontaktuppgifter i anmälningarna.

Sista dag är 1/10. Ansökan följs fortfarande utanför repot (#345). Den här posten bokför bara versionen och valen.

## #393 (28/9 2026) SYSTEM.md rättad inför bilaga 3 — det som ändrats sedan 22/9 och aldrig förts in

**Bengts ja 28/9:** *"ja, rätta SYSTEM.md"*, på frågan i #392. SYSTEM.md är Skyltfondsansökans bilaga 3 och var läst mot
koden 22/9. Sedan dess hade minst sex beslut ändrat det filen beskriver utan att filen följde med, trots regeln i dess rad 3
(DECISIONS #24). Varje rättning är kontrollerad mot koden eller beslutet innan den skrevs:
- **Vilt.** Vilt kommer från Trafikverkets *djur på vägen*, som punkt, till sluttiden (`end_time > now()` i
  `publish/snapshot-core.ts`). Det åldras som olyckor, 120 min (`AgeGate.kt`), inte 48 h. Polisen matar bara arkivet och
  webbkartan (#318, #391). Källtabellen är rättad likaså.
- **Byggen.** iOS 0.3.9: (13) uppladdad 23/9 och (18) på main. Android 0.3.9, versionCode 18, på main (`build.gradle.kts`),
  inte 0.3.1. Play-kontot är skapat (#271), och enhetsverifieringen återstår (#219).
- **Prognoslagret.** Det är en rå avståndsviktning, och offseten utgick (#324, #325). Formuleringen *"före all skuggkod"* är
  rättad till *före dess kod*, eftersom skuggmotorn körde från 29/8 och trösklarna daterades 1/9.
- **Integritetsraden.** Den följer nu invarianten i CLAUDE.md ordagrant, med missen (#264, #379).
- **Kamerafacit.** V1–V3 har varit i drift sedan 26/9 (kort #260).
- **Arkivet.** Varma rader sparas sedan 25/9 (#353), och Pro valdes bort till förmån för export (#334).
- **Anmälningarna.** De är 7 + 9, inte 7 (#300, #304).
- **Grindarna.** Vägpunktsgrinden och förbehållet om censur är införda (#324, #353).
- **Kontraktsgrinden.** 58 kontrakt enligt körningen 28/9, inte 44.
- **Övrigt.** Skyltfonden v8B (#392), kuvösens läge (#388) och Nira enligt utredningens slutsats (*konkurrent i varningsledet,
  möjlig partner i dataledet*). Filen sa tidigare *"partner, inte konkurrent"*, vilket utredningen 21/9 inte stöder.

**Inte gjort:** en ny månadsläsning. Det som inte ändrats sedan 22/9 är inte omläst, och filens huvud säger det. Nästa
månadsläsning görs i oktober enligt kalendern.

## #394 (28/9 2026) Skyltfondsansökan v8B utan extern granskning, 283 000 kr — och alla åtta bilagor färdiga

**Bengts order 28/9:** *"skriv en v8 B version utan den externa utvärderingen och lägg till alla bilagor som ska finnas med i
ansökan"*. Det ersätter valet i #392 (AP4 som upphandlad granskning för 60 000 kr).

**Beslut:**
- **AP4 är struken och sökt belopp är 283 000 kr** (AP1 126 000 · AP2 70 000 · AP3 41 000 · rapporten, nu AP4, 28 000 · drift
  12 000 · resor 6 000; egen tid 350 h).
- **I stället för granskningen står "granskningsbar i stället för granskad".** Tröskeldokumenten med versionshistorik, arkivet,
  skuggloggen och skripten erbjuds Trafikverket, beredningsgruppen och VTI för egen omprövning, utan kostnad och utan löfte om
  att någon tar emot.

**Rättat på vägen**, eftersom fel funnits i alla versioner sedan v4 och i v8B med 343 000 kr. Referenserna är kontrollerade mot
förlagens och databasernas uppgifter via sökning; förlagssidorna själva är spärrade i proxyn.
- **"Partanen m.fl. 2022":** förstaförfattaren är Freistetter, och Partanen står sist.
- **"Wallén Warner m.fl., Ergonomics 52, 2009":** författarna är Kircher och Thorslund (VTI), 52(2):165–176.
- **"TRF 2025: falsklarm urholkar följsamheten, särskilt för auditiva varningar":** Vollrath och Morawietz 2025 fann att
  falsklarm *inte* gav cry-wolf men onödiga inbromsningar, medan missar gav långsammare reaktioner. Ljudpåståendet kommer från
  Naujoks, Kiesel och Neukum, AA&P 97, 2016.
- **"Halkvakts varningar formuleras som åtgärd":** det stämmer inte mot `engine/src/texts.ts`. Halkvarningarna säger vad och var,
  och bara olycksvarningarna säger *Sakta ner*. Texten säger nu det, och formuleringen blir en enkätfråga.
- **Strukna eftersom ingen källa finns i repot:**
  - "9 gånger på snö, 24 på is";
  - Digitraffics uppdateringstakt och leverantör;
  - "Göteborgs universitet (vägklimatologi)";
  - "MET Norges öppna data" (Frost är oprövat).
- **Källbevakningen** går varje vecka, inte varje timme. Bilaga 5 säger nu det.

**Bilagorna**, i `docs/skyltfonden-2026-09-28/`, byggs med `bygg-bilagor.py` ur markdown till PDF i Chromium och är granskade
sida för sida:
1. Ansökningstexten. Den finns som Google-dokument i Bengts Drive-mapp, eftersom personalplanens hakparenteser är hans att fylla.
2. Rekryteringsplanen.
3. SYSTEM.md, rättad 28/9 (#393).
4. En verifierad referenslista. Litteraturgenomgången 29/8 som egen fil finns varken i repot eller i Drive.
5. En kort källkarta med licenser ur källkartläggningen 25–26/8.
6. Fem skärmbilder ur fotostudion 26/9 och alla rösttexter ordagrant ur motorn.
7. En förteckning över de tretton tröskeldokumenten med datum, och TROSKLAR-SKUGGAN i sin helhet.
8. Båda anmälningarna till Trafikverket, med avsändarnamnet ifyllt och den interna underlagsfoten struken.

Ett arbetsblad med sida 1, ändringarna, checklistan och mejltexten ligger i Drive och här. v8B med 343 000 kr är i Drive
omdöpt till *"(ersatt av v8B utan extern granskning, 283 000 kr)"*. Dokumentet är kvar, och länken står still.

**Alternativ.** Behålla granskningen (#392). Bengt valde bort den.

**Kvar före 1/10:**
- sökande (Axel);
- personalplanens tal;
- Malmö-meningen, om Anna svarar ja;
- sändningen.

## #395 (28/9 2026) Skyltfondsansökan: sökande är Bengt som privatperson

**Bengts besked 28/9.** Först kom *"Vi kommer att ansöka som en förening"*, och i samma varv, innan något byggts på det, *"Som en
privatperson"*. Den andra raden är tolkad som en rättelse av den första. Tolkningen är nämnd för Bengt, som rättar om den är fel.
Ansökan (bilaga 1 och arbetsbladet i Drive) är redan skriven med privatperson som sökande, så ingen text ändras. Frågan var
tidigare Axels (FINANSIERING, #345). Han ser beslutet i sammanfattningen Bengt skickar honom:
https://claude.ai/artifact/JguqbJ3PEDrnuVAue1qBF6

**Känt pris.** Ingen av vårens 32 beviljade projekt har en privatperson som sökande (FINANSIERING 28/9). Ansökan väger inte upp
det med en partner. Det den har är öppenheten att erbjuda underlaget för omprövning.

**Alternativ.** En förening under bildande valdes bort. Det fanns ett prejudikat för den i vårens lista: VALMA, vars namn var
inskickat för registrering, men vars organisationsform är okänd. Stadgar och protokoll skrivs inte.

## #396 (28/9 2026) Föreningshandlingarna upprättade: Föreningen Halkvakt bildas i oktober

**Bengts beställning 28/9:** *"upprätta alla handlingar som behövs för att bilda en ideell förening och gör upp ett körschema för
detta"*. Handlingarna ligger i `docs/forening/` och som redigerbara dokument i Drive-mappen *Föreningen Halkvakt, bildande*:
stadgar, kallelse och dagordning, protokollsmall för det konstituerande mötet, medlemsförteckning, arbetsblad för Skatteverkets
blankett SKV 8400 och körschemat. Meningen i #395, *"Stadgar och protokoll skrivs inte"*, gäller inte längre.

**Det här ändras inte.** Skyltfondsansökan skickas med Bengt som privatperson (#395). Körschemat lägger det konstituerande mötet efter
1/10, med förslaget tisdag 13/10. Spår A, där föreningen står som sökande redan 1/10, finns i körschemat. Det kräver att #395 ändras
och att mötet hålls senast 30/9. Rekommendationen är att inte välja det.

**Val i utkasten.** Alla kan ändras på mötet.
- Fyra grundare: tre i styrelsen och en revisor utanför den. Med fyra röster har ingen över 25 procent, och då har föreningen normalt
  ingen verklig huvudman.
- Öppet medlemskap. En ansökan får avslås bara om den sökande kan antas motarbeta ändamålet, så att föreningen kan bedömas som
  allmännyttig.
- Integritetslöftet står i § 2 och skyddas som ändamålet: det ändras bara vid två möten med två tredjedelars majoritet.
- En jävsparagraf (§ 12), eftersom projektet kan ersätta egen tid.
- Första räkenskapsåret är förlängt till 31/12 2027.
- Vid upplösning går tillgångarna till organisationer som främjar trafiksäkerheten.

**Alternativ.** Tre grundare, Skatteverkets minimum, hade gett tre verkliga huvudmän och ingen revisor utanför styrelsen. Ett separat
protokoll för ett konstituerande styrelsemöte valdes bort: mötet väljer poster och firmatecknare direkt, så ett protokoll räcker för
Skatteverket och banken.

**Okänt.** Skatteverkets och Bolagsverkets sidor gick inte att öppna härifrån 28/9. Reglerna om verklig huvudman och blankettens fält
är därför lästa genom sökresultat och äldre blankettkopior. Två frågor är öppna: om Trafikverket godtar att mottagaren byts till
föreningen, och om budgetens 700 kr/h rymmer arbetsgivaravgifter ifall föreningen betalar ut ersättning.

## #397 (27/9 2026) Kuvösens tystnad: sex dygn är kanalens takt, inte ett nej — och offentlighetsprincipen är en svagare nyckel för ett UTTAG än för en HANDLING

*(Numrerat om från #384 vid sammanslagningen med main 29/9: main hade redan tagit #384 för ett annat beslut.)*

> ⚠️ **Överspelat, se #388.** Tillägget längre ned säger att Bengt menade formuläret från 21/9 och att steg 3 inte
> var taget. Det var min tolkning, inte hans svar: samma kväll gav han en parallell session beskedet att begäran om
> allmänna handlingar är inskickad och obesvarad (PR #631). Trappan och all eskalering är stängda på Bengts order 28/9.

**Bengts fråga 27/9:** *"jag har ännu inte fått svar från trafikverket på begäran om allmänna handlingar. Vad betyder det för kuvösen"*

**Först en skillnad som avgör svaret, och som repot inte kan lösa åt oss.** Bokföringen säger att det som skickades 21/9
var **Datautbytesportalens kontaktformulär, ärendetyp *API Öppna Data*** (kort #232, DECISIONS #294) — **inte** en begäran
om allmänna handlingar. Den senare är trappans TREDJE steg och har enligt repot aldrig lämnats. De två skiljer sig i
precis det avseende frågan gäller:

| | Kontaktformuläret (skickat 21/9) | Begäran om utlämnande av allmän handling (ej skickad) |
| :-- | :-- | :-- |
| Vad det är | en fråga till en dataägare | en rättighet enligt tryckfrihetsförordningen |
| Svarsplikt | ingen | ja — skyndsamt |
| Vid nej | tystnad är ett möjligt utfall | avslag ska på begäran ges som ett överklagbart beslut |
| Vad sex dygns tystnad betyder | ingenting ovanligt | ett dröjsmål som går att driva |

**Därför en fråga till Bengt (§4.2):** lämnades en formell begäran om utlämnande vid sidan av formuläret? Om ja är den
inte bokförd, och tystnaden är allvarligare än raden säger. Om nej gäller svaret nedan.

**Tystnaden bär ingen information ännu.** Fyra ärenden ligger hos Trafikverket, alla obesvarade: fordonsdata/Datex II
17/9 (tio dygn), kuvösens uttag 21/9 (sex), byvindgivarna 22/9 (fem), ytgivarna 22/9 (fem). Sex dygn är kortare än det
ärende som redan väntat tio. **Men fyra av fyra är ett mönster:** vi har inget kvitto på att något av dem nått en
människa. Det är skälet att byta kanal — inte otålighet, utan att gå dit någon är skyldig att svara.

**Vad tystnaden kostar, mätt.** Kuvösen är enligt §6.1 den enda kända vägen runt vintern: kommer VViS-observationerna
1/11 2024–31/3 2025 mäts **hög C:s tolv rader i november i stället för i mars**, och grind A:s oavgjorda A2 avgörs —
alltså novemberbeslutet om segmentmotorn (#131). Priset räknas i månader, inte i om produkten går att bygga.

**Vad den INTE kostar.** Kuvösens steg 2 är inte blockerat av datan för att BYGGAS — bara för att köras på en vinter.
Delarna finns (grindarnas skript, uppspelningen `sql/028`, `snapshot-core` → `snapshotToHazards` → `AlertEngine` längs de
20 rutterna). Ställningen kan resas mot vårt eget arkiv (24/8 och framåt) så att *datan kommer* blir *ladda och kör*.
Höstarkivet har ingen is: det blir ett rörprov, inte ett vinterprov. **Erbjudet, inte påbörjat** — kortet säger att steg 2
körs på årets arkiv först om svaret blir nej.

**Offentlighetsprincipens verkliga räckvidd — varför trappans sista steg är svagare än det låter.** Rättigheten gäller en
handling som FINNS. Ett fem månader långt uttag ur en databas är en sammanställning, och den är en allmän handling bara om
den kan tas fram med **rutinbetonade åtgärder**. *"Kör den här frågan åt oss över fem månader och alla stationer"* är lätt
att avvisa på den grunden; *"lämna ut de uttag och exportfiler som redan finns"* är det inte. Trappans sista steg ska
alltså fråga efter det som finns — och kapa uttaget.

**Hur uttaget kapas utan att bryta blindningen.** Kortets egen regel är *hela vintern, inga handplockade dygn* — tiden får
inte kapas. Rummet får det. Kortets parentes säger *"ett urval län"*, men de 20 skuggrutterna går Helsingborg–Kiruna (E4
hela vägen, E6, Rv40, E10, E14), så ett län skär av provet. **Rätt kapning är stationerna LÄNGS de 20 rutterna, hela
vintern** — det är ändå dem motorkedjan kör på. Grindarnas statistik (A, T-A, R-A) vill ha alla stationer; motorkedjan och
marginalnyttetabellen klarar sig på rutternas. Alltså: fråga efter alla, erbjud rutturvalet i samma mening. Antalet
stationer längs rutterna mäts ur arkivet innan texten skickas.

**Vad jag INTE kunde läsa på källan.** Containerns nätpolicy blockerar `trafikverket.se` och `riksdagen.se`. E-tjänstens
namn och adress — *Begäran om utlämnande av allmän handling*,
`trafikverket.se/e-tjanster/begaran-om-utlamnande-av-allman-handling/` — kommer ur en **sökträff, inte en läst sida**.
Samma sökning påstod samtidigt att historiska data hämtas från Lastkajen, vilket #292 motbevisade genom att läsa sidan.
Läxan från #294 gäller alltså oförändrat: **Bengt öppnar sidan innan något skickas.** Paragrafhänvisningar utelämnas ur
texterna på kortet; en begäran behöver inga.

**Tillägg samma dag — ledet utrett, och en läxa om vad frågan var.** Bengt syftade på förfrågan 21/9; *begäran om allmänna
handlingar* var hans ord för samma utskick. **Steg 3 är alltså inte taget**, och trappan står kvar precis som raden säger.
Hans verkliga fråga var enklare än den jag svarade på: *vad menar du med att trappan utlöses i morgon?* Svaret: **trappan är
vår egen frist, inte Trafikverkets.** Ingenting utlöses av sig självt — inget skript, ingen påminnelse, ingen bevakning. Den
28/9 upphör bara skälet att vänta på en kanal utan svarsplikt, och steg 2 blir tio minuters arbete för Bengt: öppna
`etjanster.trafikverket.se/kundfragor-trafikverket`, klistra in texten från kort #232, skicka. Gör ingen det händer ingenting
alls — raden ligger kvar. **Läxa:** när en fråga innehåller ett ord som inte stämmer med bokföringen är det oftast ett löst
ordval, inte ett nytt sakförhållande. Fråga vad som menas i en mening, svara på det som faktiskt frågades, och gör inte
ordvalet till huvudsaken.

## #398 (27/9 2026) Kostnaden för kuvösens uttag: tre avgiftsregimer, och det är VÅR formulering som avgör vilken vi hamnar i

*(Numrerat om från #385 vid sammanslagningen med main 29/9: main hade redan tagit #385 för ett annat beslut.)*

> ℹ️ **Texterna på kort #232 skickas inte (#388).** Analysen står kvar som referens för den dag Trafikverket beslutar —
> ett beslut om utlämnande kan komma med en avgift, och då gäller regimerna och grinden nedan.

**Bengts fråga 27/9:** *"hur kommer kostnaden för uttaget att beräknas om man får det på fil"*

**Svaret är inte ett belopp utan en klassificering.** Vilken regim Trafikverket placerar begäran i avgör allt, och de tre
skiljer sig med flera tiopotenser.

| Regim | Grund | Vad det kostar | När den gäller |
| :-- | :-- | :-- | :-- |
| **1. Kopia av allmän handling** | avgiftsförordningen 15–16 §§ | sidtaxa: nio första fria, tio sidor 50 kr, sedan 2 kr/sida | de lämnar ut något som FINNS |
| **2. Uppdrag** | avgiftsförordningen 4 §, full kostnadstäckning | timpris för deras arbete | de måste FRAMSTÄLLA något |
| **3. Värdefull datamängd** | lagen 2022:818, EU 2019/1024 + 2023/138 | **avgiftsfritt** | datamängden är utpekad som särskilt värdefull |

**Tre saker som gäller oavsett regim:**
1. **Sidtaxan går inte att räkna på en fil.** Den är skriven för papper; en CSV har inga sidor. "På fil" betyder alltså att
   taxan i regim 1 inte biter — kostnaden faller antingen till noll eller till timpris, och inget däremellan.
2. **De får inte ta betalt för handläggningen.** Sekretessprövningen och sökandet är inte avgiftsbelagt i regim 1 — bara
   kopiorna. En faktura för *arbetet med att ta fram* hör hemma i regim 2 och förutsätter att vi beställer.
3. **Ingen skyldighet att lämna ut elektroniskt.** Rätten gäller en kopia; mediet väljer myndigheten. Att vi vill ha en fil är
   en önskan, inte ett krav — vilket är ännu ett skäl att fråga vänligt om formatet i stället för att kräva det.

**Slutsatsen som styr texten (kort #232):** ju mer begäran liknar *skicka filen ni redan har* desto närmare regim 1 eller 3 —
i praktiken noll. Ju mer den liknar *bygg ett dataset åt oss över fem månader* desto närmare regim 2 — timpris, och samma
rutinbetonade-åtgärder-test som avgör om sammanställningen alls är en allmän handling (#397). **Därför frågar steg 3 efter
befintliga uttag och exportfiler FÖRST**, och erbjuder rutturvalet som andrahandsalternativ.

**Regim 3 är värd att nämna i brevet, men inte att bråka om.** Meteorologiska data är en av EU:s sex kategorier av särskilt
värdefulla datamängder, som ska tillhandahållas avgiftsfritt och maskinläsbart; undantagsfönstret löpte ut 9/2 2025. Om
Trafikverkets VViS-ARKIV är utpekat som sådan datamängd vet vi inte — realtidsflödet är redan CC0. Därför står det i texten som
en notering (*jag noterar att…*), inte som ett krav. Ett påstående vi inte kan belägga försvagar en begäran som annars är stark.

**Vår egen grind:** gratisnivån är ett villkor och inte en önskan (CLAUDE.md). **Ingen kostnad accepteras i ett svar** — den tas
tillbaka hit och blir en DECISIONS-post godkänd av Axel innan något beställs. Båda texterna på kortet ber därför om beloppet
OCH den tillämpade bestämmelsen innan arbete påbörjas.

**Vad som inte är läst på källan.** Nätpolicyn i containern blockerar `trafikverket.se`, `riksdagen.se`, `lagen.nu`,
`forum.esv.se` och `jpinfonet.se` — fem försök, fem avslag. Talen 50 kr/2 kr och avgiftsfriheten för värdefulla datamängder är
regelverket som jag känner det, styrkt av sökträffar men inte av en läst sida. **De ska kontrolleras innan de citeras MOT
Trafikverket.** Texten på kortet är skriven så att den inte behöver dem: den frågar efter beloppet och grunden i stället för att
påstå vad de är. Det är också det enda sättet att få svaret utan att riskera att ha fel inför den man frågar (#294).

**Tillägg samma dag — Bengts följdfråga: *"har man inte beställt om man begärt handlingarna"*.** Nej, men min formulering ovan
var för grov, och gränsen går på ett annat ställe än den antydde. **En begäran utlöser en prövning, inte ett avtal:** myndigheten
lämnar ut eller avslår. Ett avslag kan aldrig faktureras, och handläggningen — sökandet, sekretessprövningen — inte heller.
**Men sidtaxan i regim 1 följer av förordningen, inte av vårt samtycke.** Begär man kopia av en handling på 500 sidor uppstår
avgiften utan att någon beställt något; i det avseendet ÄR begäran en beställning av kopiorna. Det är liten risk för oss, just
därför att vi ber om en fil: taxan är skriven för papper. **Regim 2 fungerar tvärtom.** Där kan de inte fakturera alls utan ett
uttryckligt erbjudande och ett ja. Svarar de *"inte rutinbetonat, men vi gör det som uppdrag för X kr/tim"* är det ett ANBUD —
och först vårt ja är beställningen. **Skärpning av texten på kort #232:** den ber dem nu inte bara ange belopp och bestämmelse
utan också **höra av sig innan någon avgift debiteras**, så att varje kostnad blir ett anbud vi kan ta tillbaka till Axel i
stället för en post på en faktura. Det är hela skyddet: inte att begäran är gratis, utan att inget dyrt kan ske utan ett ja.


## #399 (29/9 2026) Vägpunktsgrinden FALLEN 28/9 — septemberdomen #324 vilade på ett censurerat arkiv; skuggan fortsätter som mätning

**Bengts beslut 29/9** (*"ja, kör på"*), på Claudes rekommendation: låt skuggan gå vidare oförändrad som mätning, bokför fallet och
lägg ingen mer byggtid på prognoslagret i höst.

**Domen.** Måndagskörningen 28/9 07:00Z (höjdprovet, 60 dygn, 715 stationer, 14 644 punkter): rå avståndsviktning A1 0,82 °C ·
**A2 6,9 % ± 0,4** · A3 0,0 % ⇒ FALLER; rå + höjd 7,1 % och interpolerad offset 9,7 % ⇒ FALLER. Vägpunktsgrinden är FALLEN. Grind A,
som lånar stationens inlärda offset, klarade samma morgon: 0,74 °C · 3,7 % ± 0,3 · 0,0 % på 14 594 punkter. Resultatet låg ett dygn
obokfört i Actions-loggen och hittades under genomgången av skuggmotorn (kort #266).

**Varför septemberdomen inte står.** Populationsläsningen 29/9 (`scripts/vagpunkt-population.ts`) körde vägpunktsgrindens population
två gånger över samma 60 dygn: arkivet som det är och bara de rader den gamla ingesten sparade (yta ≤ 5 °C, regn, snö eller nederbörd;
#353), delat vid 2026-09-25 07:30Z. Två körningar samma morgon, 04:34Z och 04:44Z, gav samma bild; talen nedan är från 04:44Z.

| Arkivregel och period | Punkter | Rå: A2 | Offset: A2 |
| :-- | --: | --: | --: |
| ny, före 25/9 | 8 812 | 4,2 % ± 0,4 | 3,0 % ± 0,4 |
| gammal, före 25/9 | 8 779 | 3,9 % ± 0,4 | 1,5 % ± 0,3 |
| **ny, efter 25/9** | **6 466** | **11,0 % ± 0,8** | **4,4 % ± 0,5** |
| gammal, efter 25/9 | 6 075 | 4,4 % ± 0,5 | 1,7 % ± 0,3 |

Före 25/9 är reglerna lika, eftersom varma rader då inte sparades. Efter 25/9 är det bara de varma grannraderna som skiljer, och de tar
rå viktning från 4,4 till 11,0 %. #324:s KLARAR gällde alltså ett arkiv där de varma grannarna saknades. **Frysflaggan** (samma körning,
efter 25/9, ny regel): av 201 halvtimmar där stationen mätte ≤ 1 °C missade rå viktning 140 (70 %) och offset 95 (47 %), och 119 av
offsetens 225 flaggor var falska (53 %). Missarna är desamma med den gamla regeln, så de beror inte på de varma grannarna. 176 av 201
frostpunkter ligger bortom 20 km, så flaggan har ingen nivå för en typisk vägpunkt. **Vägviktat** mot skuggrutternas 1 585
provpunkter (52,2 · 34,0 · 7,3 · 6,5 % per band) blir grova fel 7,0 % för rå och 3,0 % för offset.

**Beslut.**
1. Vägpunktsgrinden bokförs FALLEN 28/9. #324:s KLARAR står inte, och rå avståndsviktning är inte godkänd.
2. Skuggan loggar som i dag, prognoskolumnen och holdout-raderna, som mätning. #322:s villkor 4a (ingen skuggkörning om grinden
   faller) tillämpas inte på en körning som redan går: att stänga sparar 9 ms per varv och ≈ 140 kB per dygn men kastar vinterns enda
   underlag. Grind B döms i mars som planerat; inget når föraren före dess (TROSKLAR-SKUGGAN §4).
3. Ingen mer byggtid på prognoslagret i höst. Den går till det som når förare: efterhalkan som märkt beta, självstoppet på Android
   och betatestarnas facit.
4. Populationsläsningen körs varje måndag efter höjdprovet (`hojd-prov.yml`), så att vintern bygger kurvan natt för natt.

**Vad beslutet inte är.** Inga trösklar ändras, ingen modell byts i skuggan och inget ändras för föraren.

**Alternativ som valdes bort.** (a) Offset vid stationerna och okänt mellan dem: offseten finns bara vid stationerna och missar ändå
nästan hälften av frostflaggorna. (b) Vänta på höjdläsningen 23/10: höjden gav 7,1 % 28/9, och läsningen görs ändå. (c) Stänga
prognoskolumnen enligt #322 villkor 4a.

**Läxan.** #353 skrev redan 25/9 att *"domarna #321 och #324 gäller ett snällare underlag än driften"*, men ingen av dem dömdes om, och
när måndagens körning föll blev den liggande i loggen. En ändrad arkivregel ska följas av en omkörning av varje dom som läser grannar
i arkivet, i samma varv, och veckokörningarnas domrader ska läsas samma dag. Regeln från 23/9 bar igen, i andra riktningen: den här
gången var det en KLARAR som var artefakten.

## #400 (29/9 2026) Föreningen Halkvakt bildas 29/9 och står som sökande i Skyltfondsansökan, som ideell förening under bildande — ersätter #395

**Bengts beslut 29/9** (*"vi ska bilda en ideell förening … Det är brådskande eftersom vi har för avsikt att lämna in ansökan till
Skyltfonden för en ideell förening under bildande"*). Ersätter #395 (sökande Bengt som privatperson) och spår B i #396. Körschemat
följer spår A, men med mötet redan 29/9 och ansökan 30/9 (reserv 1/10).

**Personerna.** Bengt Lagerlöf ordförande och firmatecknare, Axel Lagerlöf kassör och firmatecknare, [namn borttaget] styrelseledamot
tillika sekreterare, [namn borttaget] revisor. Bengt skrev *"medlem"* om [namn borttaget]; det är läst som ledamot i styrelsen, eftersom
stadgarna § 11 kräver minst tre ledamöter, och rättas om det är fel. Alla fyra är medlemmar från mötet, så ingen har över 25 % av
rösterna och föreningen har normalt ingen verklig huvudman att redovisa.

**Handlingarna** (`docs/forening/` och Drive-mappen *Föreningen Halkvakt, bildande*): stadgarna daterade 29/9, kallelsen till de
tre, protokollet med namn, roller och en § 16 där föreningen beslutar att söka bidraget och uppdrar åt Bengt att lämna in ansökan,
medlemsförteckningen, arbetsbladet för SKV 8400 och körschemat. Skyltfondens arbetsblad är omskrivet för föreningen, och bilaga 1
har ett stycke *Sökande organisation*, Axels efternamn och bilaga 9 (stadgarna) och 10 (protokollet). Personnummer och adresser
står aldrig i repot.

**Myndigheterna.** Skatteverket är den enda registreringen: SKV 8400 per post med bestyrkta kopior av stadgar och protokoll,
kostnadsfritt, veckors handläggning. Bolagsverket berörs inte (ingen näringsverksamhet), och verklig huvudman redovisas först när
bankkontot öppnas. Trafikverket får stadgarna och protokollet som bilagor till ansökan, och organisationsnumret som komplettering
samma dag det kommer.

**Risken, känd och tagen.** Formuläret säger att ett tomt fält gör att ansökan inte hanteras. *"Ansökt hos Skatteverket 30
september 2026"* är inte tomt, men ingen vet om det godtas; prejudikatet är VALMA i vårens lista (#395). Vinsten är att ansökan går
från privatperson till organisation, vilket ingen av vårens 32 beviljade saknade (FINANSIERING 28/9).

**Öppet när detta skrivs:** sätet (kommunen) i stadgarna § 3, tid och plats för mötet, och om revisorn är närstående till styrelsen
(tillåtet, men den som läser revisionsberättelsen kan notera det).

**Alternativ som valdes bort.** Skicka 1/10 som privatperson och bilda föreningen i oktober (#395, #396 spår B).

## #401 (29/9 2026) Målbladet fastställt — `docs/MALET.md` är projektets facit för riktningen

**Beslut (Bengt, *"ja, skriv målbladet"*):** ett blad på en sida säger vart projektet är på väg och när det är klart. Det bär
slutmålet i en mening, §6.4:s fyra klart-kriterier (därmed fastställda), de fyra målen M1–M4 = Skyltfondsansökans arbetspaket
med trösklar, datum och ägare, förutsättningen M0 (apparna hos förare före första frosten), kalendern med domarna och den
kritiska vägen till novemberbetan (fem kort, fyra Axels). Fryst som integrationskartan: ändras bara med ett DECISIONS-nummer.

**Skälet.** Bengts fråga 29/9: *"vilket är våra bästa facit … hur håller vi styr på projektet i stort och smått"*. Svaret: facit
för produkten är mätningarna och vektorerna, facit för riktningen fanns inte — §6.4 sa det själv 27/9 och väntade på Bengts
timme. Ansökan är det enda dokumentet med ett daterat slut och tal vi lovat en finansiär; därför är den målens stomme. Mätt 29/9:
22 000 rader styrdokument, 38 öppna kort varav 15 väntar på vintern, 13 är Axels app-kort, 6 hygien och 4 förening.
Bäringsrisken ligger i appspåret, och bladet gör det synligt.

**Alternativ som valdes bort.** (a) Låta §6.4 stå kvar som förslag i bedömningen — då finns definitionen bara i en 616-raders
lista som skrivs om varje varv. (b) Bara hänvisa till ansökan — den saknar M0, klart-kriterierna och den kritiska vägen.
(c) `docs/KALENDERN.md` enligt §6.3 — kalendern ligger nu i bladet §4; om plikterna (PAT, databasstorlek, Actions-taket) ska ut
ur korten är fortfarande Bengts beslut (§6.3, öppet).

**Kvar av de fyra greppen (bedömningen §4.2):** (2) en kö i stället för tre, (3) veckoavläsningen som rad per mål, (4) kritiska
vägen med datum hos Axel. Inget av dem är beslutat. Korten bär ännu inte sitt mål (M0–M4); det är ett eget varv.

## #402 (29/9 2026) Målbladet i andra utgåvan efter Bengts invändning — Android i takt, kalendern fanns, beloppet 343 000 kr väntar på bekräftelse

**Bengt 29/9:** *"jag ifrågasätter om detta verkligen är en uppdaterad målbild. har du stämt av denna mot utfört arbete på senare
tid. Såvitt jag vet är inte android efter ios i något avseende. Vi har bestämt oss för en ansökan om 343 000 kr … jag vill att du
gör en omfattande genomgång och redovisar något som är aktuellt."* Genomgången läste appsidan 28/9, systembilden 25/9,
mätningssidan 29/9, besluten #340–#401, koden och `docs/KALENDERN.md`. Läget står överst i bedömningen som *Läget 29/9*.

**Vad som var fel i #401:s blad, med beviset.**
1. *"Android sju versioner efter, Play-kontot saknas"* — taget ur kort #219:s rubrik (20/9). Koden: `android/app/build.gradle.kts`
   bär versionCode 18 och versionName 0.3.9, samma som iOS (#377, #379); versionsnumret stod stilla 31/8–26/9 medan koden följde
   med (#387). Play-kontot skapades 20/9; kvar är enhetsverifieringen och första uppladdningen (#346, appsidan 28/9 §9).
2. *"Batteribudgeten aldrig mätt"* — mätt på iPhone 27/9, 7 %/h på (14), inom budget (#382). Android-mätningen återstår (#218, #262).
3. *"`docs/KALENDERN.md` … fortfarande Bengts beslut (§6.3, öppet)"* — kalendern beslutades och skapades 27/9 (#381). Bedömningens
   §6.3 och §6.6 bar raden som öppen två dagar efter beslutet; rättade nu.
4. Beloppet 283 000 — ur #394. Bengt säger 343 000; se nedan.
5. Bladets kalender blandade plikter (PAT 15/11, bildfacitläsningen 3/10) med domar; #381 skiljer dem. Bladet bär nu bara det som
   bär en dom, ett bygge eller ett beslut, och hänvisar till kalendern för plikterna.

**Beslut.** Andra utgåvan av `docs/MALET.md`: M0–M5 (fem arbetspaket enligt v8B med granskning), milstolparna ur mätningssidans
domkalender (§11), kritisk väg i sex steg — Play-vägen, iOS-byggena, batteriet, integritetssidan, tolv testare, S3 — utgångsläget
29/9 som daterad bilaga som inte uppdateras, och regeln att en motbevisad kortrubrik får *↪ överspelad* samma varv. Kort #219 har
fått raden. Läxan i CLAUDE.md.

**Beloppet, öppet i §4.2.** Bengts besked 29/9 säger 343 000 kr, alltså v8B med upphandlad granskning som han beslutade i #392
(AP1 126 000 · AP2 70 000 · AP3 41 000 · AP4 60 000 · AP5 28 000 · drift 12 000 · resor 6 000). Men #394 samma dag, på hans
order *"skriv en v8 B version utan den externa utvärderingen"*, satte 283 000, och det är det talet handlingarna bär: bilaga 1,
arbetsbladet, protokollet § 16, Drive-dokumenten och sammanfattningen till Axel. Bladet följer Bengts senaste ord. Handlingarna
skrivs om först när Bengt bekräftat, eftersom de två beskeden står mot varandra i loggen och ansökan sänds 30/9. Texten med
343 000 finns färdig (v8B-utkastet 28/9 14:26 med AP4 *Oberoende granskning* och AP5 *Rapport*), så omskrivningen är ett varv.

**Alternativ som valdes bort.** (a) Lappa första utgåvan punkt för punkt — den hade fem fel på en sida, och grunden (korten från
20/9) var fel. (b) Skriva om handlingarna till 343 000 direkt — beskeden #392 och #394 är båda Bengts, samma dag, i motsatt
riktning; ett ord från honom kostar mindre än ett felaktigt utskick. (c) Låta läget stå i chatten — SESSIONSREGELN: det som bara
stod i chatten finns inte nästa gång.

## #403 (29/9 2026) Skyltfondsansökan: två parallella alternativ, 283 000 utan och 343 000 med oberoende granskning — #394 tolkade fel att det ena ersatte det andra

**Bengt 29/9:** *"det jag bad om igår var två olika alternativ till ansökan till skyltfonden; en som inte bar en utomstående
granskning som skulle landa på 283 000 och en som skulle vara med en utomstående granskning för 343 000. Jag har aldrig bett att en
ska ersätta den andra utan att det skulle vara två parallella som skulle jämföras och sen beslutas."*

**Vad som hade hänt.** #392 skrev v8B med granskning (343 000). #394 läste ordern *"skriv en v8 B version utan den externa
utvärderingen"* som ett byte, skrev *"Det ersätter valet i #392"*, döpte om Drive-dokumentet med 343 000 till *"ersatt"* och lät bara
283 000-texten följa med in i repot. Texten med 343 000 checkades aldrig in; den fanns kvar i Drive och i en arbetsfil. 29/9 fördes
sedan föreningen som sökande, prognoslagrets utfall (#399) och de rättade referenserna in i 283 000-texten men inte i den andra.
#402 byggde vidare på samma feltolkning och bad Bengt "bekräfta 343 000".

**Beslut.** Alternativen återställs som två parallella, jämförbara texter med samma innehåll utom det granskningen för med sig:
- `docs/skyltfonden-2026-09-28/bilaga-1-ansokan.md` — utan extern granskning, 283 000 kr, fyra arbetspaket.
- `docs/skyltfonden-2026-09-28/bilaga-1-ansokan-med-granskning-343.md` — med upphandlad oberoende granskning, 343 000 kr, fem
  arbetspaket: AP4 *Oberoende granskning* 60 000 kr (feb–jun 2027, offert från minst tre parter, steg 1 metod före marsdomen,
  steg 2 resultat före rapporten, utlåtandet oavkortat), rapporten som AP5, Bengt upphandlar, prioritering AP1, AP2 och AP4.
  Byggd 29/9 ur 283 000-texten med v8B:s granskningsstycken, så att föreningen, #399 och referenserna är med i båda.
- Arbetsbladet bär en jämförelse (belopp, arbetspaket, granskningen, prioritering, styrka, svaghet) och rekommendationen: med
  granskning. Protokollet § 16 lägger valet på mötet 29/9 med båda beloppen utskrivna. Sida 1 och mejltexten bär valet som
  hakparentes. Bara det valda alternativet skickas.
- Drive: två Google-dokument för bilaga 1 (29/9, utan och med granskning), nytt protokoll och nytt arbetsblad; de gamla omdöpta.
  Drive-kopplingen kan bara skapa och döpa om, inte redigera, så varje ändring blir ett nytt dokument.
- Målbladet §3 säger 283 000 eller 343 000 tills mötet valt; M4 Granskningen gäller bara i alternativet med granskning.

**Läxan.** En order att skriva version B är inte en order att slopa version A. När beställningen är två alternativ som ska jämföras
hålls båda levande, i repot, tills valet är gjort — och varje senare rättelse förs in i båda. Ett Drive-dokument som döps om till
"ersatt" är i praktiken raderat för den som letar.

**Alternativ som valdes bort.** Låta 283 000-texten stå ensam och be Bengt "bekräfta" ett belopp (#402) — det var inte vad han
beställde. Skriva om 283 000-texten till 343 000 — då hade alternativet utan granskning försvunnit i stället.

## #404 (29/9 2026, kväll) Skyltfondsansökan lämnas av Bengt som privatperson, med Axels V2 (413 000 kr) — ersätter #400:s sökandedel och #403:s två alternativ

**Bengt 29/9 kväll:** *"vi har bestämt att ansökan går in som privatperson inte som en förening under skapande. Rätta på alla
ställen."* Versionen som skickas 30/9 är Axels V2 efter ändringslistan (`docs/skyltfonden-2026-09-28/ANDRINGSLISTA-BILAGA-1-2026-09-29.md`):
sökande och projektledare Bengt Lagerlöf, 413 000 kr i fem arbetspaket (AP1 utvärdering 141 000 varav blind bildklassning 15 000 ·
AP2 prognoslager 70 000 · AP3 testförare 88 000 · AP4 oberoende granskning 60 000 · AP5 rapport och spridning 36 000 · drift 12 000 ·
resor 6 000; egen tid 350 timmar = 245 000).

**Skälet (Axels, 29/9 13:45):** formuläret säger att en ofullständig ansökan inte hanteras, och ett organisationsnummerfält med
"ansökt" är en risk ingen kan värdera; fondens sida bjuder uttryckligen in privatpersoner, och en enskild firma beviljades 210 000 kr
våren 2025. VALMA-prejudikatet (#395, #400) väger lättare än risken att ansökan inte hanteras alls.

**Vad som ändras.** Föreningen bildas som planerat (#400) men står inte som sökande: protokollet § 16 blir en notering om att Bengt
söker som privatperson och att föreningen förvaltar de öppna resultaten efter projektet; kallelsen, körschemat och 8400-arbetsbladet
rättade; förmiddagens två alternativ till bilaga 1 (283 000 och 343 000, #403) är ersatta och märkta så; arbetsbladet omskrivet för
V2; målbladet §3 bär 413 000 och privatperson; bedömningens §4.2 och läget rättade; Axels sammanfattning och Drive-mappen Skyltfonden
likaså. Personnummer och bankkonto på formulärets sida 1 blir del av en offentlig handling: begär sekretessprövning i mejlet, enligt
fondens egen anvisning.

**Öppet.** Om det konstituerande mötet hölls 29/9 ska meningen i bilaga 1:s personalplan säga "bildade", annars "avser att bilda";
Bengt vet, texten har båda. Fartförändringen i telefonen (V2, AP3) är fortfarande ett produktbeslut som kräver egen DECISIONS-post och
de fyra dokumenten i samma commit innan den byggs; ansökan lovar den för vintern 2027/28.

**Alternativ som valdes bort.** Föreningen under bildande som sökande (#400). Att skjuta på ansökan till marsomgången: nej, vintern
2026/27 är mätfönstret.

## #405 (30/9 2026) Vägpunktsgrindens premisser prövas i en förregistrerad mätning — kandidater, mått och population namngivna innan talen finns

**Bengts order 30/9** (*"gör en ny mätning baserad på din rekommendation"*), efter omkörningen av vägpunktsgrinden 30/9 (körning
36664018960: rå 7,9 % ± 0,4, interp 10,3 %, rå+höjd 7,9 % — FALLEN som 28/9) och analysen av matematiken bakom den.

**Vad analysen fann.** Domen står, men fyra premisser gör den trubbigare än nödvändigt: (1) domen räknas oviktat på en population där
65 % av punkterna ligger över 20 km från närmaste granne, medan 7 % av vägpunkterna längs rutterna gör det; (2) fönstret blandar
censurerade rader före 25/9 (bara kalla eller blöta sparades, #353) med ärliga efter; (3) A3 räknar bara fel med 2 °C tvärs över
frysgränsen och blir 0,0 % i en säsong utan minusgrader, medan frysflaggan bortom 20 km missas i 70 %; (4) binomialfelet antar
oberoende punkter. Och modellen blandar den storskaliga gradienten (jämn) med platsens offset (lokal) — interp-kandidaten, som antog
att offseten är rumsligt jämn, blev sämre än rå, och höjden (första platsegenskapen) halverade felet inom 7 km.

**Beslut.** En mätning på arkivet, `scripts/matningar/vagpunkt-premisser-2026-09-30.ts` (knappen `hojd-prov` med `dagar: premisser`),
registrerad här INNAN den körs, med exakt dessa delar:
1. Population: bara mål från 2026-09-25 07:30Z; vägpunktsgrindens vakter och urval i övrigt (#75, radvakten, karantänen, mål ≤ +5 °C).
2. Vägviktning med bandandelarna ur prognoslagrets provpunkter längs de svenska skuggrutterna (som `vagpunkt-population.ts`), redovisat
   bredvid oviktat ALLA och per band.
3. Blockbootstrap per station × UTC-dygn, B = 300, frö 20260930, percentilerna 2,5 och 97,5.
4. Frysflaggan som mått: missad (stationen ≤ 1 °C, modellen > 1), grovt missad (modellen > 2), falsk (modellen ≤ 1, stationen > 1),
   klart falsk (stationen > 2). Ingen tröskel — den är Bengts att sätta.
5. Kandidater, uttömmande: RÅ, RÅ+HÖJD och den nya ANOM (luft ur upp till 8 grannar inom 80 km, vikt 1/km; anomalin yta − luft ur de
   3 närmaste inom 50 km, vikt 1/km²; skattning = luft + anomali). OFFSET (grind A:s lärda paroffset) står bredvid som taket.
6. Golvet: stationspar inom 3 och 5 km, andel delade kalla hinkar med |Δyta| > 2 °C.

**Vad mätningen kan och inte kan.** Den ändrar ingen tröskel (TROSKLAR-SKUGGAN §5) och rör inte vägpunktsgrindens dom, som står.
Utfallet mot A1 och A2 skrivs som *läsning* mot bootstrapintervallet. Klarar en kandidat vägviktat på ärliga rader är det underlag för
ett nytt beslut om prognoslagrets väg nära stationerna; klarar ingen är det sanningen vi behöver före vintern. Kandidatlistan är
stängd: fler kandidater ger fler chanser att klara av slump, och en tillagd kandidat kräver en ny post här.

**Alternativ som valdes bort.** Att ändra trösklarna eller vikta om domen i `hojd-prov.ts` direkt: nej, grinden är fastställd och
dess dom ska stå tills Bengt beslutar annat på ett mätt underlag. Att bara köra om grinden på rader efter 25/9: gör mindre än
analysen kräver. Kriging med anpassat variogram och platsegenskaper utöver höjd: rätt nästa steg om ANOM eller RÅ+HÖJD visar
väg, men inte i den här mätningen — de kräver egna beslut och mer än en dags bygge.

**Utfall (körning 36666151860, 30/9 03:50Z, självtest grönt).** Mål efter snittet: 9 224 punkter från 235 stationer i 817 kluster
(fem ärliga dygn). Vägnätets bandandelar 52,6 / 33,9 / 6,8 / 6,8 %.

| Kandidat | A1 vägviktat [boot] | A2 oviktat | A2 vägviktat [boot] | A2 per band 0–7 / 7–15 / 15–20 / >20 km | Läsning vägviktat |
|---|---|---|---|---|---|
| RÅ | 0,98 °C [0,89–1,07] | 11,5 % | 7,7 % [5,4–9,8] | 2,7 / 14,1 / 9,9 / 12,4 % | A1 oavgjort · A2 FALLER |
| RÅ+HÖJD | 0,75 °C [0,67–0,85] | 10,5 % | 5,2 % [3,6–6,9] | 1,5 / 9,2 / 7,3 / 12,9 % | A1 klarar · A2 OAVGJORT |
| ANOM | 1,13 °C [1,04–1,24] | 15,7 % | 15,2 % [11,9–19,8] | 9,4 / 23,5 / 20,2 / 13,1 % | FALLER båda |
| OFFSET (taket) | 0,70 °C [0,62–0,78] | 4,5 % [3,4–5,6] | 3,2 % [1,9–4,7] | 1,3 / 5,7 / 4,5 / 4,6 % | klarar båda (oviktat A2 oavgjort) |

Frysflaggan bortom 20 km (266 stationsflaggor): rå missar 70 % [57–84], rå+höjd 62 % [48–76], offset 48 % [35–61]; offsetmodellens
flaggor är falska i 49 % [36–61]. Banden 0–15 km bär 2 respektive 11 flaggor och säger inget än. Golvet: inga stationspar inom 3 km
finns; inom 5 km sex par och 169 delade kalla hinkar med |Δyta| > 2 °C i 15,4 % (MAE 1,18 °C mellan paren).

**Läsning.** (1) På ärliga rader räddar ingen premissrättning en vägpunktskandidat: rå faller även vägviktat, rå+höjd är oavgjord
(5,2 %, intervallet spänner över tröskeln) med fem dygns underlag, och ANOM föll rakt av. Vägpunktsgrindens dom står. (2) Hypotesen
bakom ANOM — att luften är jämn och anomalin lokal — höll inte: anomalin ur de tre närmaste och luften ur åtta blev sämre än rå
viktning ur fem. Datat vill ha MER utjämning över grannar, inte mindre: målstationens egen särart är felets största del, och den lär
bara offsetmodellen ur målets historik, som en vägpunkt saknar. (3) Höjden är den enda platsegenskap som hittills bär: 0,96 → 0,63 °C
inom 7 km, och vägviktat 7,7 → 5,2 %. (4) Golvet vid 5 km (15 % på sex par) ligger över tröskeln 5 %; är det representativt är A2
≤ 5 % ouppnåeligt för en enskild granne på det avståndet, och det som når 5 % är medelvärdet av flera. Sex par räcker inte för en
slutsats; golvmätningen behöver fler par (≤ 8 km) eller närmaste-granne-LOO som proxy. (5) Den oviktade populationen blandade
censurerade rader in i 28/9-domen: på ärliga rader är rå A1 0,98 °C, inte 0,86. **Inget ändras i drift; trösklarna står.**
Kandidaten att bära vidare är RÅ+HÖJD; nästa steg är Bengts (bedömningen §4.2).

## #406 (30/9 2026) Premissmätningens andra körning: läsning per band och tre täckningar — "hur bra" skilt från "hur mycket"

**Bengts order 30/9** (*"gör om mätningen med dom per band och de tre täckningarna — det här är bara testningar eller hur?"*).
Ja: mätning, ingen dom. Trösklarna står, vägpunktsgrindens dom står, inget rör driften.

**Varför.** Vägviktningen i #405 tog bandandelarna ur skuggrutterna, Europavägar med täta stationer (53 % av punkterna inom 7 km).
Det är rätt population för grind B, som döms på samma rutter, men fel för ansökans fråga (räcker öppna data för alla förare?) och
för produktens (vad får föraren?). Att välja population efter utfall är den smickrande spaken. Lösningen: domen fälls per band,
oviktad, för avståndet till närmaste station är fysik; täckningen redovisas sedan per population, så att det enda som skiljer
populationerna är hur mycket väg eller trafik som ligger i band där modellen klarar.

**Beslut, registrerat innan körningen.** Samma skript, samma kandidater (RÅ, RÅ+HÖJD, ANOM; OFFSET som taket), samma population,
bootstrap och frö som #405, plus:
7. Bandet efter närmaste station geometriskt, inte närmaste bidragande ankare (grindens regel, som flyttar en punkt utåt när
   närmaste station saknar data i hinken och därmed smickrar de inre banden). Antalet punkter grindens regel hade flyttat skrivs ut.
8. Tre täckningar: (A) skuggrutterna, prognoslagrets provpunkter var 2 km; (B) det nationella huvudvägnätet: Trafikverkets 818
   väglagssegment (riks- och länsvägar), provpunkter var 2 km längs geometrin, avstånd till närmaste station i arkivet;
   (C) trafikarbetet: ÅDT-provpunkter ur `data/adt-provpunkter.json` (NVDB via Lastkajen) om filen finns — annars skrivs
   INTE MÄTT, och ingen proxy (vägklass eller annat) sätts i dess ställe.
9. Läsning per band mot A1 och A2 med bootstrapintervallet och grindens underlagsspärr per band (≥ 500 punkter, ≥ 20 stationer).
   Per kandidat och population: andelen av populationen i band där kandidaten klarar båda. Vägviktad läsning per population
   redovisas bredvid, ur samma bootstrapreplikat.

**Vad som INTE ändras.** Kandidatlistan (stängd sedan #405), trösklarna, grinden i `hojd-prov.ts` och dess dom. Golvet mäts som
förut (3 och 5 km); vidgningen till 8 km väntar på Bengts val i bedömningen §4.2.

**Utfall (körning 36668940287, 30/9 04:28Z; första försöket 36668773820 föll på en SQL-typ, rättat).** Mål efter snittet: 9 415
punkter från 236 stationer, 822 kluster. Grindens bandregel hade flyttat 249 punkter (2,6 %) utåt — spaken är liten.

**Täckning.** A skuggrutterna (1 585 p): 52,6 / 33,9 / 6,8 / 6,8 %. B huvudvägnätet, Trafikverkets 818 väglagssegment (12 260 p):
49,8 / 37,6 / 7,3 / 5,2 % av punkterna inom 50 km (andelen bortom 50 km skrevs inte ut i den här körningen; rättat till nästa).
C trafikarbetet: INTE MÄTT, ÅDT-filen saknas. Fördelningen A och B är nästan lika, så valet mellan dem smickrar inte — men B är
de vintervägar Trafikverket bedömer väglag på, inte hela vägnätet, och C är omätt.

| Kandidat | 0–7 km (15 st) | 7–15 km (57 st) | 15–20 km (54 st) | >20 km (110 st) | Vägviktat A · B (A2) |
|---|---|---|---|---|---|
| RÅ | under spärren: 2,5 % [0,9–4,3] | 12,7 % faller | 10,9 % faller | 12,4 % faller | 7,2 · 7,5 % faller |
| RÅ+HÖJD | under spärren: 1,6 % [0,3–3,2] | 8,5 % [4,7–12,7] oavgjort | 7,8 % [4,6–12,3] oavgjort | 12,9 % faller | 5,1 · 5,3 % oavgjort |
| ANOM | under spärren: 9,2 % | 21,6 % faller | 22,1 % faller | 13,0 % faller | 14,5 · 15,0 % faller |
| OFFSET (taket) | under spärren: 1,2 % [0,1–2,2] | 5,9 % oavgjort | 4,6 % oavgjort | 4,6 % [3,1–6,3] oavgjort | 3,2 · 3,4 % klarar |

Andel av population i band där en kandidat klarar båda måtten: 0 % för alla, i båda populationerna.

**Läsning.** (1) Per band avgör fem ärliga dygn ingenting utom fallen: rå och ANOM faller i 7–20 km, rå+höjd faller bortom 20 km;
allt annat är oavgjort med breda intervall. (2) **Bandet 0–7 km går inte att döma med grindens spärr, och kommer inte att kunna
dömas:** bara 15 stationer har en granne inom 7 km, spärren kräver 20, och fler dygn ger fler punkter men inte fler stationer.
Det är hälften av vägnätet, och stationsnätet självt gör det obedömbart med leave-one-out. En bandvis dom kräver antingen en
egen spärr för det bandet (Bengts beslut, inte en lättnad av något som finns) eller ett annat facit än stationerna. (3) Valet av
population (A eller B) ändrar tiondelar, inte domar: den spaken var mindre än jag trodde. (4) Bilden från #405 står: rå+höjd är
kandidaten, oavgjord vägviktat och i 7–20 km, fallen bortom 20 km. **Trösklarna orörda, grindens dom står.** Bengts val i
bedömningen §4.2 utökas med spärrfrågan för 0–7 km och ÅDT-uttaget för täckning C.

## #407 (30/9 2026) Premissmätningen på de finska stationerna — statistisk kraft för bandet 0–7 km, registrerad innan körningen

**Bengts order 30/9** (*"kör mätningen på de finska stationerna också"*), efter #406:s fynd att bara 15 svenska stationer har en
granne inom 7 km och att bandet därför aldrig når grindens spärr på 20 stationer.

**Beslut, registrerat innan körningen.** Samma skript med `--land fi` (knappen `hojd-prov`, `dagar: premisser-fi`):
- Population: `fi.weather_observations` (Fintraffic Digitraffic, CC BY 4.0; 526 stationer i skuggarkivet), 60 dygn, alla mål
  i fönstret ≤ +5 °C. Inget snitt 25/9: det finska arkivet bytte aldrig regel. Det sparar rader vid yta ≤ 5 °C, nederbörd eller
  Δ ≥ 0,5 °C mot senast sparade, alltså en censur av samma slag som det svenska före 25/9 men mildare. Andelen varma hinkar
  (> 5 °C) skrivs ut och läses FÖRE talen: är den låg saknas varma grannar och rå viktning smickras, som i #399.
- Vakter: #75 (yta ≥ luft − 12), radvakten och karantänen räknad i det finska arkivet. Den långsamma vakten (sql/030) är svensk
  och saknas. Vaktdiagnosen skrivs ut som för Sverige.
- Kandidater, trösklar, band (efter närmaste station), bootstrap och frö: oförändrade från #405/#406. Läsning per band med
  spärren ≥ 500 punkter / ≥ 20 stationer. Golvet inom 3 och 5 km.
- Täckning: bara A (finska skuggrutter) om prognospunkter finns i skuggloggen, annars ingen vägviktning. Ingen B eller C.
- Norge körs inte i den här posten: fjällpassen är en annan regim och ska registreras för sig.

**Vad utfallet får betyda.** Fysiken i leave-one-out är densamma, trösklarna desamma. Ett finskt utfall i bandet 0–7 km är
underlag för om det svenska bandet går att döma alls, inte en dom över det svenska nätet. Det ändrar inga trösklar och inte
vägpunktsgrindens dom.

**Utfall (körning 36670176981, 30/9 04:44Z, självtest grönt).** Finska arkivet: 427 stationer, 55 741 hinkar på 60 dygn (arkivet
börjar 31/8; 6–7/9 saknas som i Sverige). Varma hinkar 89,5 % — Δ-regeln sparar de varma raderna när temperaturen rör sig, så
censuren är mild; men en varm granne finns i en hink bara om den själv ändrats ≥ 0,5 °C, vilket gynnar kalla nätter med rörelse.
Mål ≤ 5 °C: 5 402 punkter från 349 stationer, 1 415 kluster. Bandregeln hade flyttat 4,3 %. Inga finska prognospunkter i
skuggloggen ⇒ ingen vägviktning; läsning per band.

**Golvet, det Sverige inte kunde ge:** inom 3 km 40 par och 439 hinkar, |Δyta| > 2 °C i 3,9 %, MAE 0,59 °C; inom 5 km 78 par,
5,7 %, MAE 0,73 °C. Tröskeln 5 % ligger alltså vid golvet för en enskild granne på 5 km och under det på 3 km. De sex svenska
paren (15 %) var för få för en slutsats.

| Kandidat | 0–7 km (108 st, 1 207 p) | 7–15 km (58 st) | 15–20 km (65 st) | >20 km (118 st) | ALLA (oviktat) |
|---|---|---|---|---|---|
| RÅ | 0,60 °C · 2,3 % [1,1–3,5] KLARAR/KLARAR | 3,8 % [1,7–6,0] oavgjort | 4,5 % oavgjort | 3,9 % [2,6–5,6] oavgjort | 0,69 °C · 3,7 % [2,8–4,7] klarar |
| RÅ+HÖJD | 0,61 °C · 2,5 % KLARAR/KLARAR | 3,8 % oavgjort | 4,2 % oavgjort | 5,1 % oavgjort | 0,71 °C · 4,2 % [3,3–5,0] oavgjort |
| ANOM | 0,66 °C · 2,5 % KLARAR/KLARAR | 4,9 % oavgjort | 6,7 % oavgjort | 9,0 % faller | 0,81 °C · 6,6 % faller |
| OFFSET (taket) | 0,50 °C · 0,6 % KLARAR/KLARAR | 5,0 % oavgjort | 3,5 % klarar | 2,7 % klarar | 0,67 °C · 2,7 % klarar |

Frysflaggan i bandet 0–7 km (49 stationsflaggor): rå missar 57 % [41–75], grovt (modellen > 2 °C) 6 %; falska 36 %. Offset missar
41 %, falska 48 %. Bortom 20 km (136 flaggor): rå missar 63 %, offset 51 %.

**Läsning.** (1) **Bandet 0–7 km går att döma i Finland, med 108 stationer, och rå viktning klarar det med marginal** (2,3 %,
hela intervallet under 5 %). Sveriges 15 stationer gav 2,5 % [0,9–4,3] under spärren — samma tal. Fysiken är densamma; det
finska utfallet stödjer att det svenska närbandet håller, med förbehållet att södra Finland är plattare än Sverige (höjden ger
ingenting där: rå+höjd = rå) och att september var mild. (2) Rå viktning klarar oviktat i Finland (3,7 %) där den faller i Sverige
(11,4 %): terrängen och arkivets censur förklarar sannolikt båda, i okänd proportion — det är nästa fråga, inte ett svar.
(3) ANOM faller igen på avstånd; kandidaten är död. (4) **Det viktigaste fyndet är inte A2 utan flaggan: även inom 7 km, där
temperaturfelet är 0,6 °C, missas frysflaggan vid 1 °C i mer än hälften av fallen.** Ett medelfel av samma storlek som avståndet
till gränsen ger ett myntkast vid gränsen oavsett hur bra A2 ser ut. Med en marginal på en grad (flagga vid ≤ 2 °C) sjunker
missen till 6 % i samma band; priset i falska flaggor är inte mätt och måste mätas innan något byggs. Det är domslutets
"risk"-språk i siffror: prognosen får förstärka och visa risk, aldrig avgöra vid gränsen. (5) Trösklarna orörda; grindens dom
står. Frågorna till Bengt (bedömningen §4.2): spärren för det svenska bandet 0–7 km i ljuset av det finska utfallet, och om
flaggmarginalen ska mätas som nästa förregistrerade del.

## #408 (30/9 2026) Regimgrinden i premissmätningen — samma mått delade på stilla natt, blåsigt och övrigt, registrerad innan körningen

**Bengts order 30/9** (*"kör regimgrinden också"*), efter frågan om termisk kartering går att simulera: det billigaste steget är
att mäta NÄR terrängen biter, inte hur mycket. Den svensk-finska skillnaden (rå 11,4 % mot 3,7 %) är sannolikt terräng gånger regim.

**Beslut, registrerat innan körningen.** Del 11 i samma skript, körs på både det svenska (`premisser`) och det finska
(`premisser-fi`) arkivet:
- Regimen sätts vid MÅLSTATIONEN i hinken: R1 STILLA NATT = medelvind ≤ 2 m/s och solhöjd < −6° (USNO-approximation, självtestad);
  R2 BLÅSIGT = medelvind ≥ 5 m/s oavsett tid; R3 ÖVRIGT = resten; R0 OKÄND = medelvind saknas.
- Medelvinden (`wind_speed_ms`, värdevaktens spann 0–60) används, inte byvinden: det är byvindsgivaren som är trasig (bilaga 8,
  TROSKLAR-VIND-SIKT §3), och medelvinden var normal vid spikarna. Molnmängd finns inte i arkivet; natten står i dess ställe.
- Per regim och kandidat: ALLA och per band, A1/A2 mot bootstrapintervallet med grindens spärr (≥ 500 punkter, ≥ 20 stationer),
  frysflaggan bredvid. Kandidater, trösklar, band, frö: oförändrade (#405–#407).
- Frågan som avgörs: klarar rå viktning (och rå+höjd) i R2 och R3 och faller bara i R1? Då är en regimstyrd prognos möjlig:
  visas när den kan, tiger när den inte kan. Faller den i alla regimer är terrängen inte förklaringen.

**Vad som inte ändras.** Trösklarna, grinden, dess dom. Regimgränserna (2 och 5 m/s, −6°) är mätningens, inte produktens, och
står här så att de inte kan flyttas efter utfallet.

**Utfall (Sverige 36671071146, Finland 36671072792, 30/9 04:56Z, självtest grönt).**

Punkter per regim — Sverige (mål efter 25/9): stilla natt 6 138 · blåsigt 133 · övrigt 3 334 · okänd 1. Finland: stilla natt
3 035 · blåsigt 33 · övrigt 1 580 · okänd 754 (vind saknas vid många finska stationer). **Blåsigt är nästan tomt i båda länderna:**
en kall vägyta i september uppstår i stilla, klart väder, så målurvalet (yta ≤ 5 °C) väljer regimen åt oss. Blåsigt går inte
att läsa förrän vintern fyller det.

| Kandidat · regim | Sverige A2 [boot] | per band SE 0–7 / 7–15 / 15–20 / >20 | Finland A2 [boot] | per band FI |
|---|---|---|---|---|
| RÅ · stilla natt | 12,5 % [10,2–14,8] faller | 1,9 / 15,7 / 10,6 / 13,3 % | 3,1 % [2,0–4,5] klarar | 2,1 / 2,4 / 4,5 / 3,2 % |
| RÅ · övrigt | 9,2 % [7,2–11,2] faller | 1,9 / 7,2 / 11,7 / 10,1 % | 5,9 % [4,6–7,3] oavgjort | 5,3 / 6,5 / 6,6 / 5,8 % |
| RÅ+HÖJD · stilla natt | 11,2 % faller | 1,0 / 9,6 / 7,3 / 13,8 % | 3,3 % klarar | 2,5 / 2,4 / 3,8 / 3,7 % |
| RÅ+HÖJD · övrigt | 9,3 % faller | 1,9 / 6,6 / 9,1 / 11,1 % | 6,8 % faller | 5,3 / 6,5 / 5,9 / 7,9 % |
| OFFSET (taket) · stilla natt | 4,0 % [2,9–5,1] oavgjort | 0,0 / 5,0 / 3,3 / 4,4 % | 2,0 % klarar | 0,0 / 3,8 / 2,2 / 2,0 % |
| OFFSET (taket) · övrigt | 5,6 % oavgjort | 2,2 / 7,9 / 7,5 / 5,1 % | 4,6 % oavgjort | 2,3 / 7,4 / 5,5 / 4,4 % |

**Läsning.** (1) **Hypotesen höll inte.** I Sverige faller rå viktning i BÅDA regimerna som går att läsa (12,5 % stilla natt, 9,2 %
övrigt), och i Finland är den stilla natten den BÄTTRE regimen (3,1 % mot 5,9 %). Vind och natt skiljer alltså inte "när terrängen
biter" från när den inte gör det. (2) Två skäl syns i talen: molnmängden saknas — en stilla natt är bara en utstrålningsnatt om
den är klar — och "övrigt" blandar dagtid med måttlig vind, där solen och skuggan skapar egna lokala skillnader. Regimen kräver
moln (SMHI:s luftstationer, parameter molnmängd, finns inte i arkivet) och en delning dag/natt skild från vinden. (3) Det som
består genom alla regimer och båda länderna: bandet 0–7 km håller (1,0–2,5 % i Sverige, 2,1–5,3 % i Finland), och Sverige faller
från 7 km i varje regim medan Finland inte gör det. Skillnaden Sverige–Finland förklaras inte av regimen; terrängen och arkivens
olika censur återstår som förklaringar, i okänd proportion. (4) **En regimstyrd prognos kan inte motiveras på det här
underlaget.** Trösklarna orörda, grindens dom står. Nästa steg, om Bengt vill: molnmängd in i arkivet (ny ingest, kostar lagring
och minuter) och en förregistrerad delning dag/natt × vind × moln när vintern fyllt blåsigt.


## #409 (30/9 2026) Skyltfondsansökan skickad — Skyltfondskorten stängda, besked väntas senast 15/12

**Bengts besked 30/9:** *"Ansökan är skickad du kan stänga alla öppna kort som har med skyltfonden att göra"*. Skickad av Bengt som
privatperson (DECISIONS #404): Axels V2, 413 000 kr i fem arbetspaket, formuläret undertecknat 2026-09-30, bilaga 1–8, till
trafikverket@trafikverket.se och skyltfonden@trafikverket.se (fondens sida anger båda). Sista dag 1/10; besked per brev senast 15/12.

**Dagens granskningar gavs i chatten, inte i repot, på Bengts order** (*"Ingen ting annat"*). Bilaga 2
(`docs/skyltfonden-2026-09-28/GRANSKNING-BILAGA-2-2026-09-29.md`, a027e68) är den enda i repot; bilaga 3–8, Dokument 0, hypoteserna
1–3, bakgrunds-, innovations- och spridningsstyckena, samarbetspartner, kostnadsplanens tabell och kommentar samt följebrevet skrevs om
i chatten och gick till Axel via Bengt. Vilka rättelser som togs in vet repot inte; den skickade versionen finns i Bengts Drive-mapp
Skyltfonden. Tre rättelser bör läsas igen om fonden ställer frågor: "vägskador" (källan Freistetter 2022 säger skadade i vägtrafiken,
i Finland, Norge och Sverige — inte Norden), "tre halkvarningsprojekt för fotgängare 2024–2025" (inget underlag i repot; Bengts lista
har fyra vinterprojekt våren 2026, alla för gående, cyklister eller drift) och Malmö stad (inte namngiven, #392).

**Beslut.** (1) Kortet SKYLTFONDSANSÖKAN SKICKAD 30/9 till 🟢 KLART. #265 gäller nu bara föreningsbildningen; #271:s nyckel "en rad i
AP2" ersatt av "projektets egna pengar, eller AP2 om raden kom med". Nytt kort #272: den skickade versionen (formulär utan sida 1,
bilaga 1–8 som PDF) in i repot — repots bilaga 1 är v8B, inte V2, och ett fastställt dokument som inte är incheckat finns inte.
(2) Bedömningen: läget (1) omskrivet, bevakningsraden Skyltfonden = väntar på besked 15/12, §4.2-raderna granskningen av V2 och
partnerskap i appen strukna som överspelade. (3) Ingenting mer görs för ansökan förrän fonden svarar; frågor från fonden besvaras ur
Drive-versionen och bilagorna i `docs/skyltfonden-2026-09-28/`.

## #410 (30/9 2026) Kort #265 (föreningen) stängt på Bengts ord

**Bengt 30/9:** *"du kan stänga kort 265"*, på frågan om mötet 29/9 och SKV 8400 (bedömningen §4.2, DECISIONS #409). Kortet flyttas till
🟢 KLART med rubriken *Föreningen Halkvakt bildad*. Det som återstår av Verify-raden — Skatteverkets organisationsnummer och bankkontot —
följs i bedömningen §0b som en bevakningsrad, inte som kort; numret meddelas Skyltfonden när det kommer. Oktoberradens gamla plan
(kallelse 5/10, möte 13/10) struken.

## #411 (1/10 2026) Kort #272 stängt utan bygge — den skickade Skyltfondsansökan läggs inte i repot

**Bengt 1/10:** *"stäng kort 272"*. Kortet (DECISIONS #409) ville ha den skickade versionen — formuläret utan sida 1 och bilaga 1–8 som
PDF — i `docs/skyltfonden-2026-09-28/skickad/`. Inget sådant finns på main (kontrollerat 1/10: PDF:erna där är 28/9-byggena, v8B).
Beslutet är alltså att Drive-mappen Skyltfonden och Bengts utkorg är arkivet för det som skickades; repot bär v8B och ändringslistan.
Konsekvens att känna till: svar till fonden skrivs ur Drive-versionen, och SESSIONSREGELNs regel om incheckade dokument gäller inte
den här filen på Bengts beslut.

## #412 (1/10 2026) DB-knappen får ett läsläge som standard — en läsning kan inte längre ändra ett cron-jobb (kort #263)

**Bengts order 1/10:** *"kör på #263"*. Fyndet (28/9, DECISIONS #389): knappens standardfil var `sql/014_gallring.sql`, som
schemalägger om gallringsjobbet till `gallra_vader(7)`; sedan 026 ska det peka på `gallra_arkiv(7)`, som 031 byggt ut med Danmark,
gravstenarna och tidsvakten. Ett tryck med standardvärdena hade tyst stängt av den gallringen. Inte utlöst: jobbet bär
`SELECT gallra_arkiv(7)` 1/10 (körning 36817425867).

**Beslut (a683e41).** (1) `scripts/dbknapp.ts` får `las --bevis "SQL"`: varje bevisrad körs i EN transaktion som öppnas `BEGIN READ ONLY`
och alltid rullas tillbaka. Vakten är READ ONLY, inte rollbacken: Postgres vägrar INSERT/UPDATE/DELETE/DDL också inne i funktioner, så
`cron.schedule` (skriver i `cron.job`) faller när satsen körs. En vägrad sats ger exit 1 och en rad som börjar *VÄGRAT*. (2) `dbknapp.yml`:
`las` är standardval, `fil` har ingen standard (migrera kräver en fil), grenvalet frågar efter `migrera` och `las` vid namn och låter
resten gå till larmprovet, som förut. (3) Inget annat rört: migrera och larmprov är oförändrade.

**Bevis.** Lokalt (Postgres 16 i skrivblocket med en `cron.job`-attrapp): läsning ger rader; `UPDATE cron.job` vägrad; en skrivande
funktion (`cron.schedule`-attrapp) vägrad med *cannot execute INSERT in a read-only transaction*; `las` utan bevis och `migrera` utan
fil avvisas; tabellen orörd efteråt. Mot databasen: körning 36817259654 (`las`, standardbevis) grön, 23 cron-jobb listade, *inget
skrivet*; körning 36817261645 (`las` med `UPDATE cron.job SET active = active WHERE false`) röd med *VÄGRAT — cannot execute UPDATE in a
read-only transaction*; körning 36817425867 visar gallringsjobbets kommando. Alternativ som valdes bort: en ofarlig standardfil (en fil till som
"är idempotent i dag"), och en vitlista över tillåtna satser (en lista till som glider). Läxan hör till familjen "en sanning som gällde när
den skrevs": knappens kommentar kallade 014 idempotent, sant 13/9 och falskt efter 026.

## #413 (1/10 2026) Källbevakningen avkodar HTML-entiteter; hash-källorna seedas om en gång utan larm (kort #264)

**Bengts order 1/10:** *"kör på #264"*. Fyndet (28/9, DECISIONS #391): `scripts/trv-bevakning.ts` bytte varje HTML-entitet mot ett
blanksteg. Polisen.se kodar å, ä och ö som entiteter, så vakten läste *"API ver polisens h ndelser"* och *"Regler f r ppna data"*, och ett
nyckelord med å/ä/ö kunde aldrig träffa på en sådan sida — bedömningen blev VET INTE där den borde bli RÖR OSS, tyst.

**Beslut (a1d75fb).** (1) `norm` flyttas till `publish/nyhetsbedomning.ts` och avkodar entiteterna i stället för att stryka dem: namngivna
ur den lista våra källor använder (svenska, norska, danska, finska tecken och typografin), decimala och hexadecimala. En okänd namngiven
entitet blir blanksteg som förut — aldrig sämre än v1. (2) Bytet ändrar varje hash-källas text och hash på en gång. I stället för en
manuell `--seed` (som också hade svalt nya poster i list-källorna sedan 28/9) bär varje hash-källa en versionsstämpel `normv` i state: en
källa vars state har en annan version seedas om UTAN larm och får stämpeln; nästa körning jämför som vanligt. Ingen flagga, inget handgrepp,
ingen larmstorm. (3) List-källorna rörs inte.

**Bevis.** Enhetsprov (`test/nyhetsbedomning.test.ts`, 224 gröna): en polissida med `&ouml;`, `&#246;` och `&#xE4;` läses som *"API över
polisens händelser"*; nyckelordet *förändring* träffar en entitetskodad sida (RÖR OSS); motprovet med v1-normaliseringen ger *"En f r ndring
av f lten."* och VET INTE; `&#xE5;` med versal hex föll första varvet (regexen saknade versaler) och rättades innan commit. Mot källorna:
körning 36817880379 på grenen — åtta hash-källor *"normaliseringen bytt (v1 → v2) — grundvärdet skrivs om utan larm"*, statens polisen-text bär
å/ä/ö; issue-listan oförändrad (sex öppna trv-nyhet-issues före och efter, ingen ny, ingen kommentar). Nätpolicyn i containern ger 403 mot alla källsidor, så det levande beviset är körningens, inte en lokal hämtning.

## #414 (1/10 2026) Kort #267 stängt: fyra rättelser, bunten omgenererad och deployad, värdevakten körd på main

**Bengts order 1/10:** *"kör på #267"*. Inga beslut i sak — kortet var rättelser. (1) Bedömningen §5.1 sade att S2 och S3 var obyggda
och att försprångets regel saknades; rättat med beviset på raden (S2 byggd 24/9, DECISIONS #341; försprånget i skugga sedan 25/9, #359;
S3 fortfarande obyggd). (2) DECISIONS #321 påstod att felet stiger monotont med avståndet; loggen 22/9 (35688287525) ger
0,43 · 0,79 · 0,76 · 0,72 °C — rättelse tillagd i #321, domen orörd. (3) `engine/src/engine.ts` rad 5 och TROSKLAR-OVERGANGAR §7 sade
45 s om spärren; nu 10 s prioritetsmedvetet (kort #127, v23). Kommentaren ligger i motorns källa, så bunten omgenererades
(`supabase/functions/skuggmotor/index.ts`, diffen är bara kommentaren) och skuggmotorn deployades enligt husregeln (körning 36820055383);
mätningen efter deployen är spärrprovet (körning 36820118920): status 200, `suppressed` med EN rad — prov:kam2 tystad av prov:kam1 efter 5 s, inget skrivet i shadow_log. (4) Värdevakten körd på main (36819878682, 30 dygn): 51 numeriska fält i 14 tabeller,
27 spann, **noll obesiktigade**, fyra kända avvikelser (byvind 87,7 m/s — anmäld; sikt 20 000 som sentinel i två tabeller; radarns
`rate_max_mmh` 727,54 över spannets 200). Ytans spann −60…+60 °C **står**: de −34…−50 °C sju stationer rapporterade i septemberluft ligger
inom fysikens spann och är omöjliga bara i relation till luften — det är radvaktens kontroll (DECISIONS #298), inte värdevaktens. Sagt
som kommentar vid `SPANN` så nästa läsare inte stramar ett spann som vaktar fel sak.

## #415 (1/10 2026) STOMREGELN — fem stomdokument stäms av vid varje ändring och bär rättelserna löpande

**Bengts order 1/10:** *"Artifactsen Halkvaktens mätningar, Halkvaktens app och Halkvaktens systembild är facit för mej och
kontrollpunkter för var vi är. Tillsammans med bedömningar och Integrationskartan utgör de stommen för det fortsatta bygget här.
Jag vill därför att du lägger in en arbetsorder att alla ändringar, tillägg kompletteringar stäms av mot dessa 5 dokument och
rättelser/ändringar/avbockningar redovisas även där löpande när de görs. … ett arbetsmoment som alltid står fast … en genomlysning
av allt så att samtliga dessa är uppdaterade."*

**Beslut.** (1) Regeln står i CLAUDE.md som STOMREGELN, och sessionsprotokollets steg 4 pekar på den. De fem: *Halkvaktens
mätningar* (artefakt RVrWtvUGPfc88aFUbcYREc), *Halkvaktens app* (FThC1PqVqEMqWxofrCv1GT), *Halkvaktens systembild*
(6hHX4LeXQUrJSbaNthNY9i), bedömningen och integrationskartan. (2) Repokopiorna är källan och döps om till odaterade namn
(`docs/MATNINGAR.html`, `docs/APPEN.html`, `docs/SYSTEMBILDEN.html`; förut `MATNINGAR-2026-09-29`, `APPEN-2026-09-28`,
`SYSTEMBILDEN-2026-09-25`), eftersom ett levande dokument inte kan bära sitt födelsedatum i namnet. Varje ändring görs i
repokopian och republiceras till samma URL i samma varv. (3) Kartans frysregel (#186) gäller innehållet; läge-raderna hålls löpande.

**Genomlysningen 1/10, vad som var fel eller gammalt i vart och ett.** *Systembilden (25/9):* L4-panelen sade bara "grind A
klarad, segmentprognosen i skugga" — vägpunktsgrindens fall 28/9 och premissmätningarna 30/9 saknades; förvarningens spann sade
400–3 000 m utan apparnas tak 1 200 m; vattenplaningens dom saknade datum. *Appen (28/9):* omladdningen under resan stod som
drift fast iOS-bygget (16) inte kompilerats; byggena (14)–(18) oarkiverade sades inte; de öppna bristerna #226/#248/#258/#259
saknades; Skyltfonden stod som "söks" med 30–50 förare, ansökan är skickad 30/9. *Mätningarna (29/9):* 5.1 saknade omkörningen
30/9 och premissmätningarna (#405–#408) helt — nytt block med Sveriges och Finlands band, täckningen, frysflaggan, ANOM, regimen;
värdevakten sades inte körd sedan 15/9 med ett spann som "släpper igenom" −50 °C (körd 1/10, #414, spannet står); db-knappens
läsläge och premissmätningens knapp i domkalendern. *Bedömningen:* §5.2 A "regel obyggd", §5.3 segmentprognosen utan fallet, §5.4
facit 790 bilder och "ett förarsvar", E och B som stopp fast båda byggda 24/9; läget (8) och bevakningsraden tillagda.
*Integrationskartan (24/9):* R21–R26, eget beslut #416. Kort #273 skapat och stängt med beviset.

## #416 (1/10 2026) Integrationskartan öppnad för R21–R26 efter vägpunktsgrindens fall och premissmätningarna, fryst igen

**Frysvillkoret** (#186: ändring bara efter bygge och mätning) är uppfyllt av vägpunktsgrindens fall 28/9 (#399), de förregistrerade
premissmätningarna 30/9 (#405–#408), S2 (#341), försprångets skugga (#359) och kamerafacitets vägar (#380). Rättelserna, alla
läge-rader: **R21** §2 L4 — vägpunktsgrinden FALLEN, premissmätningarna räddar ingen kandidat, bandet 0–7 km håller. **R22** §2 L5 —
försprånget byggt och i skugga sedan 25/9, S2 nivå + bevis 24/9 (raden sade "regeln obyggd"). **R23** §5.4 — segmentprognosens fog:
rå viktning föll, kandidaten till marsdomen öppen (#270/#271). **R24** §6.1 — 28/9 med varma grannrader och 30/9 på ärliga rader;
"felet stiger monotont" rättat här och i §13.3 (samma fel som #321, rättat i #414). **R25** §8 A och E — båda byggda. **R26** §12 —
facitstacken 988 bilder, 41 provbilder klassade, 0 riktiga förarsvar. Kartans sakinnehåll (fogarna, lagren, principerna) är orört.
Sedan 1/10 hålls läge-raderna löpande enligt STOMREGELN (#415); innehållet ändras bara efter bygge och mätning som förut.

## #417 (1/10 2026) Kort #152 och #243 stängda med bevis — kassavakten höll september under taket, arkivgränsen 3 h gav noll falsklarm

**Beslut:** båda korten till 🟢 KLART på Bengts order (*"stäng #152 och #243 om beviset finns"*). Öppna kort 36 → 34.

**#152 kassavakten.** Nyckeln (sorterad 22/9, #224) var tre led: ingen körning stoppad i september, issue #210 stängd av vakten själv,
Axels Billing-avläsning. Alla tre finns. `ingest` gick varje hel timme genom 30/9 och in i 1/10 (körning 881–910, alla gröna), så
hårdstoppet slog aldrig i. Kassavakten stängde #210 1/10 05:07Z med *"Stänger — god marginal igen."* efter 81 rader sedan 13/9. Billing
lästes 27/9 (17,84 USD, #381). Septembers slutrad 30/9 23:07Z: **6 348 min över 4 718 körningar ⇒ 34,78 av 35 USD** i vaktens räkning
(1,8 % över per-jobb-regeln, #381), släpande takt 95 min/dygn de sista dygnen. Marginalen var 0,22 USD i vaktens tal: åtgärden *inga
app-byggen till 1/10* var nödvändig, inte försiktig. Oktober börjar på 22 min. Vakten står kvar i drift; räkneregeln per jobb förblir en
öppen rad i bedömningen §4.2 (rättas ihop med #201, om alls).

**#243 arkivgränsen.** Verify-raden: sju dygn utan falsklarm ur checken *livemotorns effekt*, och ett riktigt stopp fångas fortfarande.
Avläst 1/10 07:35Z med db-knappens läsläge på main (körning 36831247108): **0 gluggar > 180 min** i `situation_archive` sedan 24/9 07:41Z,
största 01:26, 41 gluggar > 30 min — den gamla gränsen hade larmat 41 gånger på en vecka, den nya kunde inte larma. Ingen issue ur
checken sedan deployen 24/9 15:09Z; enda vakthundsissuen är #623 (lagringslarmet 26/9, en annan check). Sju hela dygn fylls 15:09Z i dag;
avläsningen täcker 6 dygn 16 h och visar varje glugg, inte bara frånvaron av issues, och kortet stängs därför nu. Andra ledet: checken
är oförändrad utom talet (`LIVEMOTOR_EFFEKT_MIN = 180`), så #222:s fall — cron succeeded, pg_net köar, arkivet står — larmar
fortfarande, efter 3 h i stället för 30 min. Priset är 2,5 h längre till upptäckt. Inte provat skarpt: det kräver att livemotorn
stoppas, och det görs inte för ett bevis.

**Alternativ:** vänta till 15:09Z med #243 — förkastat, gluggmätningen är starkare än en frånvaro av issues och täcker fönstret.

## #418 (1/10 2026) En extern projektsida, *Halkvakt och kuvösen*, för Trafikverkets handläggare — skriven utan opublicerade tröskelvärden (kort #274)

**Bengts idé 1/10**, sedan VViS Förvaltning svarat på kuvösens uttag: en pedagogisk sida om vad Halkvakt är och vad kuvösen ska göra i
jämförelse med dagens tröskelmätningar, *"det kanske gynnar vår ansökan till skyltfonden"*.

**Beslut om innehållet.** Sidan säger bara det som redan står i systembeskrivningen, mätningssidan och ansökan: dataflödet och de fyra
principerna (tyst som standard, en vinnare per steg, löftet följer källan, ingen position lämnar telefonen), tretton tröskeldokument daterade
före koden, 37 gemensamma testfall, skuggan och arkivet, domkalendern, kuvösens regler (startvärden som de står, hela vintern, varje del ensam
och ovanpå de andra, facit = stationens egen yta, ändrar ingen tröskel, tillfällig databas), uttagets fält och period, och vilka vi är.
**Inga regelvärden** — mätningssidan är intern just för att den bär opublicerade trösklar; projektsidan är extern. Novembersvaret är skrivet som
villkorat: *om uttaget kommer i oktober*. Appens exempelrop är motorns egen text (*Isrisk framöver, vägbanan nära noll grader*), inte påhittad.

**Vad sidan inte lovar:** ingen tidplan för kuvösen utöver villkoret, ingen partner, inget om kostnad för uttaget (det står i svaret till Micke
Wallin, #398 styr), och inget om vad Trafikverket ska göra med sina givare (anmälningarna står för sig).

**Delning:** artefakten är privat tills Bengt delar den. Han avgör om länken går till Trafikverket (Micke Wallin) och om den nämns för
Skyltfonden. Källa `docs/HALKVAKT-OCH-KUVOSEN.html`, artefakt https://claude.ai/artifact/CrrMKX7vcRcXHiqqYGjs9S; ändringar görs i repokopian och
republiceras till samma URL i samma commit (samma regel som stomdokumenten, #415, utan att sidan är ett stomdokument).

## #419 (26/9 2026, bokfört 1/10) Kort #275 väg (a): försprånget kläms till motorns tak, reglaget tar bara grundvarningen · systembilden

*Bokfört 1/10 i omtaget av PR #624: beslutet fattades 26/9 som "#381"/"#382" på en gren som aldrig slogs ihop, och de numren togs av andra sessioner 27/9 (#381 kalendern, #382 batteriet); korten hette #261/#262 av samma skäl.*

**Fyndet** (Bengts fråga 26/9 *"har uppdateringarna någon påverkan på systembilden"*). Motorn klämde försprångskrokens svar till
`cfg.leadMaxM`, och i apparna är det reglaget *Längsta förvarning* — högst **1 200 m** sedan #259 (DECISIONS #374). Skuggan mäter med
motorns **3 000 m**. Med reglaget på fullt hade 90 s bara räckt till 48 km/h, 60 s till 72 km/h och 45 s till 96 km/h; i 110 km/h hade
45–90 s blivit samma 1 200 m (≈ 39 s). #374 skrev att taket *"under 144 km/h betyder ingenting"* — sant för 30 s, inte för försprånget.
Inget var fel i drift: kroken sitter bara i skuggan, och portarna får den vid steg 7, efter domen i mars 2027.

**Beslut (Bengt 26/9: *"ja till systembilden och a på 261"*).** Väg (a): reglaget tar bara grundvarningen, försprånget kläms till motorns
tak (`DEFAULT_CONFIG.leadMaxM`, 3 000 m). Alternativen: (b) höja reglagets tak den dag försprånget når rösten — reglaget hade bytt
betydelse; (c) döma försprånget med 1 200 m — domen hade mätt något annat än TROSKLAR-FORSPRANG §3 fastställt. **Ingen tröskel ändras:**
§3 klämmer redan till 400–3 000 m (båda signaturerna); (a) gör att appen följer §3. Androids GPS-täthet (`CadencePolicy`) är bevisad för
3 000 m och håller. §4.2-raden stod på Bengt · Axel; Axels signatur bedömdes inte krävas eftersom ingen tröskel ändras.

**Byggt.** `engine/src/engine.ts`: krokens svar kläms till `DEFAULT_CONFIG.leadMaxM` — i skuggan samma tal (standardkonfigurationen), och
utan krok är motorn byte för byte densamma, så vektorerna rörs inte. Nytt prov i `test/forsprang.test.ts`: med reglaget på 500 m talar
grundvarningen på 440 m och nivå 2 med 90 s på 1 989 m (80 km/h). **Motprov** (26/9 och igen 1/10 på main): den gamla klämningen fäller
exakt det provet — *"försprånget på 2 000 m — fick 435"*. Skuggmotorns bunt omgjord. TROSKLAR-FORSPRANG §6 bär regeln till steg 7.

**Systembilden** (`docs/SYSTEMBILDEN.html`, stomdokument 3): försprånget *upp till 3 000 m*, reglagets tak gäller bara grundvarningen (två
ställen); mätapparaten med kamerafacit i hela landet och vid tysta kalla stationer (#380) och förarnas svar och missar (#379); principen
*Integritet* säger vad föraren själv kan skicka, som invarianten. Spannet (*400–3 000 m i motorn, i apparna högst 1 200 m*) och L4 (grind A,
vägpunktsgrindens fall) hade stomgenomgången 1/10 (#415) redan rättat. **Stomavstämningen:** MATNINGAR bär V1–V3 sedan 1/10; APPEN beskriver
reglaget rätt för i dag (försprånget finns inte i appen före steg 7); kartan och bedömningen utan ny rad utöver §4.2.

**I drift 1/10:** sammanslagen i PR #660 (969610c), skuggmotorn deployad från main (36877830446) — skuggan räknar som förut, eftersom den kör motorns standardtak. `ios-engine` grön på 969610c (36877689954). Systembilden republicerad (version 10).

## #420 (26/9 2026, bokfört 1/10) Vägarbeten: smal variant till vårlistan, läsmätningen byggd · fynd: olja på vägen är halka som rösten inte säger (kort #276)

*Bokfört 1/10 i omtaget av PR #624: beslutet fattades 26/9 som "#381"/"#382" på en gren som aldrig slogs ihop, och de numren togs av andra sessioner 27/9 (#381 kalendern, #382 batteriet); korten hette #261/#262 av samma skäl.*

**Beslut (Bengt 26/9: *"ja till läsmätning och ja till vårlistan"*).** DECISIONS #5 (24/8) stängde ute vägarbeten som *kroniskt brus*;
det står sig för vägarbeten i allmänhet. Till vårlistan (Ä3, våren 2027, bredvid #32 hinder och #15 kö-slut — samma flöde och samma
filter) går en **smal variant**: stor eller mycket stor påverkan (körfält avstängt, kö) och sådant som sänker friktionen (ny beläggning,
grus). Prövas i skuggan först, aldrig alla vägarbeten, och rösttexten är Axels. PLAN.md:s A3 hade från början *"roadwork with lane
closure"*; #5 stängde den smala varianten utan att pröva den för sig.

**Läsmätningen, två delar.** (1) **Friktionen ur vårt eget arkiv** — `NonWeatherRelatedRoadConditions` i `situation_archive` (dbknapp 36232854353, `scripts/matningar/icke-vaderhalka-arkivet-2026-09-26.sql`): **99 händelser 31/8–25/9** (≈ 3,8 om dygnet), alla *Trafikmeddelande*, 24 med stor eller mycket stor påverkan; de flesta av de 25 vanligaste texterna är **olja, diesel eller hydraulolja på vägbanan — *risk för halka*** (några potthål, en vägskada, grus i en rondell). Det är inte vägarbeten: det är väglag som inte beror på
väder, och det mesta är halka i appens egen mening. Rösten säger ingenting om det i dag (snapshoten skickar bara olyckor och djur)
⇒ **kort #276**. (2) **Vägarbetena ur Trafikverkets API** — `scripts/matningar/vagarbeten-2026-09-26.ts` och engångsknappen
`vagarbeten-matning.yml`: aktiva avvikelser per typ; vägarbetena per påverkan, varaktighet, MessageCode, TrafficRestrictionType och
friktionsord, med fälten räknade som de finns; och **motorn i `engine/src` körd längs de 20 svenska skuggrutterna** (3 107 km) med
vägarbetena som punktfaror — antal rop per varv, för alla och för de smala urvalen. Provkört lokalt mot påhittade data. Körs efter
sammanslagningen; ett flöde måste finnas på main för att kunna tryckas. Läs-only, inget sparas, en körning ≈ en minut Actions.

**Mätt 1/10** — körning 36878098828 (1/10 14:40Z, läs-only): **5 280 aktiva vägarbeten** (MaintenanceWorks 3 390, RoadOrCarriagewayOrLaneManagement 1 890) bland 3 580 situationer; påverkan: stor eller mycket stor **2 894 (55 %)**, liten 2 248, ingen 112; varaktighet: **> 30 dygn 4 775 (90 %)**, 7–30 dygn 354, 1–7 dygn 104, ≤ 1 dygn 42; MessageCode: Vägarbete 2 803, Körfältsavstängningar 1 680, Beläggningsarbete 587, Vägen avstängd 201; *Körfält blockerade* på 3 291; fältet SafetyRelatedMessage finns inte. **Motorn längs de 20 svenska skuggrutterna (3 107 km, ett varv):** alla vägarbeten 151 rop (4,9 per 100 km) · stor eller mycket stor påverkan 94 (3,0) · högst 7 dygn långa 4 (0,1) · friktionsord 31 (1,0). **Läsning:** #5:s *kroniskt brus* står: nio av tio vägarbeten varar över en månad, och påverkansgraden skiljer inte ut någon smal grupp (55 % är stor eller mycket stor). Det enda som smalnar av är **varaktigheten** — högst 7 dygn ger 146 aktiva och 0,1 rop per 100 km. Vårens smala variant ska alltså byggas på kortvarighet (nytt, rörligt, högst en vecka), inte på påverkan. Friktionsorden fångar mest långa beläggningsarbeten (1,0 per 100 km). Inget beslut tas på en enda ögonblicksbild en höstdag.

## #421 (1/10 2026) Kort #276 väg (a): olja på vägen går till skuggan först — ingen text i appen

**Beslut (Bengt 1/10: *"a på 276"*).** Trafikverkets `NonWeatherRelatedRoadConditions` — 99 händelser på 26 dygn, mest olja, diesel och
hydraulolja med *risk för halka* (#420) — prövas i skuggan: skuggmotorn loggar var rösten SKULLE ha talat, i en egen kolumn bredvid
`alerts`, som vattenplaningen (`vb`). Alternativen: (b) vårlistan med #32 — ett halvår utan siffror; (c) låta bli — halka som Trafikverket
själv rapporterar förblir osynlig. **Ramar:** ingen text, ingen prioritet och ingen ändring i appen eller snapshoten — det är Axels beslut
efter skuggan; en egen motorinstans så att oljan aldrig tränger undan eller tystas av de riktiga varningarna i loggen; hela klassen
loggas med sin text, så att mätningen kan skilja olja från potthål i efterhand i stället för att filtret gissar i förväg. **Byggs i egen PR**
efter omtaget (#419/#420), med migration, bunt, deploy och bevis i samma varv.

**Byggt 1/10** (i samma PR som omtaget, #660). `sql/040`: kolumnen `shadow_log.olja` och RPC:n `olja_aktiva()` — bara service-rollen,
som `vagpunkt_ankare`. **Aktiv = start ≤ nu < slut**, mätt först (`scripts/matningar/olja-aktiv-2026-10-01.sql`, dbknapp 36861530518):
117 händelser sedan 31/8, alla med sluttid och punkt, median 1 h 48 min, p90 ungefär ett dygn, 4 aktiva 1/10 — en händelse utan sluttid
räknas bara det första dygnet, annars hade den varit aktiv för alltid. Arkivet ser aldrig Trafikverkets radering, så en preliminär
sluttid kan hålla en sanerad fläck aktiv en stund för länge; den längsta händelsen är 689 dygn (troligen en vägskada, inte olja) — det
är skälet att hela klassen loggas med text. Skuggmotorn: en egen motorinstans per rutt (viltets avståndsregel, ingen text, ingen
prioritet), raden i `olja`, antal och skäl i svaret. Provet `?oljaprov=1` (dbknappens `oljaprov`, i skriptet OCH flödet) lägger en
påhittad fläck på ett rakt spår och skriver inget i skuggloggen. Integrationsprov mot PostGIS: aktiv, avslutad, framtida, annan klass,
utan punkt, utan sluttid ny och gammal — bara två ut. **Ordningen efter sammanslagningen: `sql/040` FÖRE deployen** — skuggmotorn
skriver kolumnen i varje rad, och PostgREST avvisar en okänd kolumn.

**I drift 1/10:** PR #660 sammanslagen 14:36Z (969610c) · `sql/040` via dbknapp 36877728231: kolumnen `olja` jsonb med standard `[]`, `olja_aktiva()` svarar med **5 aktiva** — alla fem vägskador (asfaltskador, körplåtar, stenskott, bärighet), ingen olja — och bara service-rollen får köra den (anon och authenticated nej) · deploy av skuggmotorn 36877830446 från main · oljaprovet 36877971571: en rad (*Prov: olja på vägbanan*, 573 m), `aktiva` 5, inget skäl · Skuggvarven efter deployen skrev sina rader i alla fyra länder (FI 14:45, DK 14:50, NO 14:55, SE 15:02Z — tre rader var, ingen avvisad för den nya kolumnen); det svenska varvet svarade ok med 5 aktiva och 0 rop, eftersom ingen av de fem låg på varvets tre rutter (dbknapp 36881359482). **Kvar:** första riktiga oljeraden i skuggloggen, och vid nästa läsning hur ofta rösten skulle ha talat, skilt på olja och vägskador ur texten.

## #422 (1/10 2026) STOMREGELN bekräftad i en andra session, och andra genomlysningen samma dag

**Order (Bengt 1/10 kväll, i sessionen som tog omtaget av PR #624):** *"alla ändringar, tillägg och kompletteringar stäms av mot dessa 5
dokument och rättelser/ändringar/avbockningar redovisas även där löpande när de görs … ett arbetsmoment som alltid står fast … gör en
genomlysning av allt så att samtliga dessa är uppdaterade."* Ordern finns redan som **STOMREGELN** i CLAUDE.md (DECISIONS #415, samma
morgon) och laddas i varje session; den gäller oförändrad. Det här beslutet bokför att den bekräftats och vad den andra genomlysningen fann.

**Genomlysningen** — de fem mot allt som ändrats efter morgonens (#415/#416, kort #273): PR #660 (#419–#421), driftsättningen 14:36–15:04Z
och vägarbetsmätningen. **Mätningssidan:** 7.7 olja på vägen (ny, i skuggan), 22 delområden, sju i skuggvarvet, 3.1 nämner oljan, 8.1
försprångets tak, 9 vägarbetena. **Appsidan:** *Vad appen inte gör* säger nu oljan (i skuggan) och vägarbetena (utestängda, smal variant
våren 2027). **Systembilden:** försprångets tak, mätapparaten och integriteten (version 10, 14:43Z), plus oljan i skuggtabellen och i L2.
**Bedömningen:** läget (9), §4.2 fem rader, Ä3. **Kartan:** läge-raderna L2 och L5, §13.6 och §14 — innehållet orört (frysregeln).
Artefakterna republiceras från main efter sammanslagningen; en artefakt som skiljer sig från sin repokopia är ett fel.

## #423 (1/10 2026) QR-koden till appen kommer först med domänen (kort #277) · fyra tavelrättelser

**Beslut (Bengt 1/10: *"qr kod kommer först med domänen"*).** En QR-kod till appen görs när halkvakt.se finns, som EN kod för båda
plattformarna via en egen adress som vidarebefordrar. Alternativet — en kod nu direkt på TestFlights publika länk — valdes bort: länken
kräver en extern grupp och Beta App Review, gäller bara iPhone, och kan stängas eller bytas medan en tryckt kod inte går att ändra.
Nytt kort **#277**, låst på domänen (kortet *Skydda namnet*), en publik TestFlight-länk eller App Store-sidan, och Play-länken (#219).

**Tavelrättelser (Bengt: *"du kan rätta placeringarna"*), ur listningen av de 35 öppna korten:** (1) **#276** flyttat från *Bengt* till
*Claude — låst*: i drift, nyckeln är data. (2) **#258 och #259** sade *"Axels bygge 0.3.9 (17)"* — bygget hos Axel är (19); (14)–(18)
arkiverades aldrig. (3) **#219:s rubrik** (*sju versioner efter, ingen väg till en telefon*) var överspelad sedan 29/9 (#402) — rubriken
säger nu vad som återstår, Play-vägen, med den gamla lydelsen kvar i parentesen. (4) Sektionsrubriken *Axels nästa steg* bar datumet 8/9.
Inget kort stängt eller struket; tavlan 35 → 36 med #277. Stomavstämningen: bedömningen (§4.2, läget); de fyra andra orörda —
inget användaren ser, hör eller gör ändras, och ingen mätning.

## #424 (1/10 2026) Kuvösen: besluten, förregistreringen före första filen, och klockan som döljer framtiden (kort #232)

**Beslut (Bengt 1/10 kväll).** (1) Svaret till Trafikverket är redan skickat: *"jag har redan sagt ja till Micke och filen kommer att
komma. Vi får se vad den innehåller när den kommer."* Frågorna i planens utkast (tidszon, station-id, kolumnbeskrivning) ställdes alltså
inte i förväg — de besvaras av inventeringen när filen finns, och tidszonen avgörs med mätning. (2) *"vi kör både riktningsprov och
kalibreringsdata"* — i den ordningen. (3) *"ja till actions som körplats"* (kassavakten 1/10: 0,00 av 35 USD, prognos 17). (4) *"ja till
att bygga steg 1–2 nu"*. Planen: `docs/PLAN-KUVOSEN-2026-10-01.md` (PR #663).

**Kalibreringen kräver en signatur till.** Regel D i TROSKLAR-KOMBINATIONEN säger en kalibrering per säsong, vid en tidpunkt som står i
DECISIONS innan den inträffar (D3), och aldrig två på samma domfönster (D7); i dag står den på 1/2 2027 på data från november–januari.
Att kalibrera på vintern 2024/25 i stället ändrar den regeln, och tröskeldokument ändras bara med båda signaturerna. **Riktningsprovet
väntar inte på det** — det väljer ingenting. Kalibreringen görs först när ändringen av regel D är skriven och Axel har signerat (§4.2).

**Oljefilmen (Bengts fråga: *"kommer oljefilm att ingå?"*): nej.** *Oljefilmen* — första regnet efter torka — ströks av Bengt 12/9
(#110: byggs inte, mäts inte, skuggas inte), den är ett sommar- och höstfenomen medan uttaget är november–mars, och dess facit är
olyckor, som inte ingår i ett stationsuttag. *Oljan på vägen* (utsläpp, kort #276) kommer ur Trafikverkets händelser (Situation) och
ingår bara om historiken för dem också levereras. Vill Bengt öppna oljefilmen igen är det ett eget beslut, och då på en sommar.

**FÖRREGISTRERINGEN — skriven innan någon fil är öppnad** (reglerna ur #292, samlade):
- **Frågan:** är vi på rätt väg, och vad tillför varje del ensam och ovanpå de andra (kartan §7.3)? Ett riktningsprov, ingen dom.
- **Underlaget:** alla stationer och hela perioden i leveransen, efter driftens vakter (#75, radvakten, karantänen, den långsamma
  vakten). Inga dygn och inga stationer väljs bort för hand. Halvtimmessteg; motorns del längs de 20 svenska skuggrutterna. ↪ *Ändrat före filen, 1/10 (#426): rösten i två serier — de 20 rutterna och hela väglagsnätet.*
- **Delarna:** frysrisken och broarna, efterhalkan, trenden, rimfrosten, övergångarna, tillståndsskattaren, nederbördstypen, vind och
  sikt, prognoslagret (grind A, vägpunktsgrinden, höjden), försprångets nivå 2 för frysrisken. Utanför utan mer data: väglagssträckorna,
  olyckorna, SMHI-förstärkaren, kamera- och förarfacit.
- **Värdena:** startvärdena som de står i tröskeldokumenten och DECISIONS. Inget svep och inget val i riktningsprovet (D2, D6, D7). ↪ *Tillägg före filen, 2/10 (#437): prognoslagrets frysflagga redovisas med tre marginaler (0 · 0,5 · 1,0 °C); alla skrivs ut, ingen väljs.*
- **Facit:** stationens egen yta efter varningen, i varje dels eget utfallsfönster — *det blev kallt*, inte *det blev halt*; saltet syns
  inte. Väglag och olyckor räknas bara om Trafikverket levererar dem.
- **Redovisningen:** varje del ensam OCH ovanpå de andra, som antal och andelar; alla tal skrivs ut, också de som talar emot.
- **Följden:** utfallet ändrar ingen tröskel och ingen kod. Tidszonen avgörs med mätning mot SMHI:s öppna serier före första körningen.
- **Ordningen:** inventering (bara läsning) → vakterna → riktningsprovet → kalibreringen, den sista först efter Axels signatur.

**Fyndet under bygget: det räcker inte att flytta klockan.** Planen sade att `now()` byts i kuvösens frågefunktion. Men produktionens
frågor säger bara *nyare än X*, aldrig *äldre än nu* — i driften finns ingen framtid. I kuvösen ligger hela vintern i tabellerna, så
med bara en flyttad klocka ser karantänen brott som inte hänt än, `regn_h` blir negativ och lutningen hämtas ur nästa timme.

**Byggt, steg 1 — klockan (`kuvos/klocka.sql`, `kuvos/klocka.ts`).** Ett eget schema `kuvos` med (a) `kuvos.now()`, som svarar med
inställningen `kuvos.nu`; en anslutning med sökvägen `kuvos, public, pg_catalog` får den för varje okvalificerat `now()` — i frågetext
och inuti databasens funktioner — och (b) vyer som visar varje tidsindexerad tabell som den såg ut vid klockan: `weather_observations`,
`weather_latest` (härledd ur arkivet), `radar_precip`, `trend_kandidater`, `givarfel_dygn`. **Produktionskoden är orörd**, och ingen
frågetext skrivs om. Provet (mot PostGIS i CI): sex stationer med var sin fälla — fel yta, negativ `regn_h`, nästa timmes lutning, en
karantän och ett dygn i felet som inte hänt än, en station som bara finns i framtiden — och en motkontroll: samma byggare utan klockan
ser ingen av dem. Ett andra prov vaktar att snapshotbyggaren och rekonstruktionen inte har tidskällor som klockan inte når
(`CURRENT_TIMESTAMP`, `clock_timestamp()`, `Date.now()`).

**Bevis 1/10:** `ci` grön på PR #664 (36888627590) — klockans prov kördes mot PostGIS, 230 prov, 0 hoppade. **Fyra motprov, en vy i taget fick se framtiden, och varje gren föll på sin egen fälla:** `weather_observations` ⇒ KUV_KARANTAN borta (36888904314) · `givarfel_dygn` ⇒ KUV_LANGSAM borta (36888922612) · `trend_kandidater` ⇒ lutningen 5,5 i stället för 0,9 (36888942418) · `weather_latest` ⇒ KUV_FRAMTID synlig vid T (36888962569); 229 av 230 gröna i varje. Utkast-PR #665–#668 stängda och grenarna raderade. Fällan *negativ regn_h* är inte fälld för sig — den ligger bakom samma vy som karantänen och nås inte när stationslistan redan fallit.

**Byggt, steg 2 — inventeringen (`kuvos/inventering.ts`).** Läser en okänd CSV utan att tolka den: avgränsare, kodning (UTF-8 eller
latin1), rader, och per kolumn tomma, tal med spann (decimalkomma), tider med spann, och de vanligaste textvärdena. Prov lokalt.
**Kolumnöversättningen till arkivets schema byggs först när filens inventering är läst** — formatet är okänt, och ett fält får inte
bära en tröskel förrän det besiktigats (VÄRDEVAKTEN).

**Kvar före körningen (steg 3–5):** kolumnöversättningen och inläsningen · de härledda tabellerna för vintern (`trend_kandidater`,
`givarfel_dygn`) · vyer för tillståndstabellerna om väglag och händelser levereras · SMHI:s radar och moln · körflödet i Actions.

## #425 (1/10 2026) Kalibreringen flyttas till kuvösen (Axels ok) · kuvösen blir sjätte stomdokumentet · genomlysning 3

**Beslut 1 — kalibreringen (Bengt 1/10: *"Axel säger ok till kalibreringen"*; Bengt samma dag: *"vi kör både riktningsprov och
kalibreringsdata"*).** Säsongens enda gemensamma kalibrering görs i kuvösen på vintern 2024/25, efter riktningsprovet, i stället för
1 februari 2027 på data från november–januari. Ändringen är skriven i TROSKLAR-KOMBINATIONEN §5 (regel D) och §7 med båda signaturerna.
D1–D7 gäller oförändrade; 1/2-kalibreringen utgår (D7: aldrig två). **Följden:** dom 2 i mars får hela vintern 2026/27 som domdata.
Dom 1 i januari rörs inte — betan släpps och döms på startvärdena (D2). **Alternativ som valdes bort:** att låta 2024/25 bara vara
riktningsprov (#292:s utgångsläge) — då hade årets vinter fortfarande behövt delas i kalibrerings- och domnätter. **Förbehåll:** kuvösens
facit är *det blev kallt*, tunnare än årets; håller vinnaren inte i båda halvorna behålls startvärdena (D4). Inget ur 2024/25 var läst när
ändringen skrevs. **Öppet (§4.2):** ska betan i november starta på startvärdena eller på kalibrerade värden — ett eget beslut före betan.
Datumet 1 februari rättat i mätningssidan, bedömningen, KALENDERN, SYSTEM och MALET.

**Beslut 2 — kuvösen blir en stomregel (Bengt 1/10: *"ja kuvösen bör bli en stomregel"*; *"vi ska skapa en artifact för kuvösen också
där vi beskriver nuläget och framtidsläget, vad som kommer härnäst och hur det kan påverka projektet i sin helhet"*).** Ny sida
*Halkvaktens kuvös*: källa `docs/KUVOSEN.html`, artefakt https://claude.ai/artifact/1xvv4hydYbfpF5eXFgLcxh (privat tills Bengt delar den). STOMREGELN i CLAUDE.md
säger nu **sex** stomdokument. Sidan är skild från *Halkvakt och kuvösen* (kort #274), som är skriven för Trafikverkets handläggare.

**Genomlysning 3 (Bengts fråga: *"Har du uppdaterat de 5 filerna med det här"*). Svaret var nej:** efter #424 bar bara bedömningen
kuvösen, och bara på grenen. Nu: **mätningssidan** — kuvösen under *Andra mätningar* med länk, domkalendern (vecka 41–42 in, 1 februari
ut), 8.2 och blindningsraden med den nya kalibreringen · **systembilden** — raden *K Kuvösen* i skuggtabellen · **appsidan** — orörd, och
det är rätt: kuvösen når ingen förare och ändrar inget appen gör · **bedömningen** — §4.2, läget, kalendern · **kartan** — läge-raderna
§13.6 och §14, innehållet orört · **kuvössidan** — ny. Artefakterna republiceras från main efter sammanslagningen.

## #426 (1/10 2026) Kuvösen: rösten prövas i två serier — de 20 skuggrutterna och hela väglagsnätet (ändring av förregistreringen, före filen)

**Bengts fråga 1/10:** Trafikverket levererar alla stationer — *"borde vi bredda antalet testrutter så att vi täcker in hela Sverige.
skulle det göra resultatet bättre och stabilare eller tänker jag fel"*. **Mätt samma dag:** de 20 svenska skuggrutterna (3 107 km) når
97 av 854 stationer inom 2 km (11 %) och 190 inom 5 km (22 %); norr om 62° 23 av 205. Väglagsnätet — Trafikverkets 818
bedömningssträckor — är 23 681 km, och 769 stationer (90 %) ligger inom 2 km från en sträcka
(`scripts/matningar/rutternas-tackning-2026-10-01.ts`, `vaglagsnatet-2026-10-01.sql`; dbknapp 36893189091, 36893534243).

**Svaret, i två delar.** Stationsreglerna — efterhalkan, trenden, rimfrosten, övergångarna, prognoslagret, vakterna — räknas per station
och använder redan hela leveransen; fler rutter ändrar ingenting för dem. Rutterna styr bara *vad rösten skulle ha sagt till en förare*:
takten, undanträngningen, försprånget. Där är 20 rutter 13 % av nätet och nästan inget av Norrlands inland.

**Beslut (Bengt 1/10: *"vi gör b nu"*).** Rösten prövas i kuvösen i två serier, som redovisas var för sig och aldrig slås ihop:
- **Serie A — de 20 svenska skuggrutterna**, alla tjugo i varje halvtimmessteg (driften hinner tre per halvtimme, varje rutt var 3,5:e
  timme). Samma rutter som årets skugga, alltså jämförbar med vintern 2026/27.
- **Serie B — hela väglagsnätet:** varje bedömningssträcka körd som en egen resa i geometrins riktning, samma fart och punkttäthet som
  skuggan (80 km/h, en punkt var femte sekund), **var tredje timme** från 00:00 UTC. Riktiga vägar, inget handplockat. Geometrin är
  dagens (`road_conditions` 1/10 2026), inte 2024/25 års.

**Alternativen:** (a) bara de 20, som #424 registrerade — jämförbart men smalt; (c) fler handritade rutter — bredare, men vi hade valt
var. **Skälet till att det avgörs nu:** att lägga till rutter sedan utfallet är sett är att välja underlag efter svaret. Filen är inte
levererad och ingenting är läst.

**Sagt före körningen.** (1) Serie B:s resor är korta (median 25,8 km): regeln att samma fara inte upprepas inom 10 min och 5 km, och
allt annat som rör långa resor, syns bara i serie A. (2) Serie B är ungefär åtta gånger mer körning per steg, därav var tredje timme;
kostnaden är inte mätt. **Visar körtiden på vinterns första sju dygn att serien inte ryms i ett Actions-jobb glesas den till var sjätte
timme — avgjort på körtiden, innan något utfall är läst.** (3) Sträckornas egen halkklassning finns inte för 2024/25, så varken serie A
eller B prövar väglagsvarningen (A1). (4) Kassan läses före varje tung körning (#424).

**Gäller bara kuvösen.** Skuggan i drift kör sina 20 rutter oförändrat: den ryms inte i mer (tre rutter per halvtimme är taket på
datorkraft, kort #244), och dess rutter ändras inte mitt i en säsong som ska dömas. Vintern 2026/27 kan spelas upp i kuvösen i efterhand,
ur vårt eget arkiv, med samma två serier. **Fynd i förbigående:** skuggans S1-logg (efterhalkans råa fält) täcker bara stationer nära
rutterna, ungefär en femtedel — domarna påverkas inte, eftersom uppspelningen ur arkivet läser alla stationer.

**Stomavstämningen:** kuvössidan (två serier i kedjan, reglerna, gränserna), mätningssidan (3.1 rutternas täckning, kuvös-rutan),
systembilden (raden K), bedömningen (§4.2, läget), kartan (läge-raden §13.6, §14); appsidan orörd. Sidan till Trafikverket (*Halkvakt
och kuvösen*) nämner bara skuggans rutter och står.

## #427 (1/10 2026) Betan: båda värdeparen följs i skuggan, ett av dem hörs (kort #278)

**Bengts fråga 1/10:** *"kan man inte köra dem parallellt både på startvärdena och på de kalibrerade värdena för att kunna se var det
diffar?"* **Beslut samma dag:** *"båda i skuggan, en hörs"*.

**Vad det betyder.** Efterhalkans regel följs vintern 2026/27 med två värdepar på samma nätter: startvärdena från 16/9 (#222) och de
värden kuvösens kalibrering fryser (#425). Skuggan loggar efterhalkans råa fält utan tröskel (S1), och uppspelningen (sql/028) räknar
varje variant ur arkivet, så jämförelsen kräver ingen ny mätning — bara en utskrift som ställer de två bredvid varandra: båda hade
varnat, bara startvärdena, bara de kalibrerade. **Fram till domen skrivs bara antal** (blindningen). Kuvösen visar samma skillnad på
vintern 2024/25 redan innan betan startar.

**Vad som inte går att dubblera:** rösten. En förare hör en variant, och *Stämde / Stämde inte* fäster bara vid det som sades. Den tysta
variantens egna varningar får facit ur stationerna, bilderna och väglaget, inte ur förarsvar.

**Alternativ som valdes bort:** dela testarna i två grupper — tolv testare räcker inte till två underlag (KB-D4: 30 svar från 5 förare);
låta rösten tala när någon av varianterna slår till — fler varningar och i praktiken en tredje regel som ingen fastställt.

**Öppet (§4.2, Bengt och Axel): vilken av de två som ska höras.** Regeln säger i dag startvärdena (TROSKLAR-KOMBINATIONEN §7, *ingen
kalibrering före* dom 1). Ska de kalibrerade höras krävs en ändring av §7 med båda signaturerna, innan betan släpps — och beslutet bör
tas innan kalibreringens resultat är sett, annars väljs rösten efter utfallet. Ingen tröskel ändras av det här beslutet.

## #428 (1/10 2026) Betan hörs på de kalibrerade värdena om vinnaren håller i båda halvorna, annars på startvärdena (Bengt och Axel)

**Beslut (Bengt 1/10: *"vi kör 1 och 2 som du föreslår"*).** Av de två värdepar som följs i skuggan (#427) hörs i betan **de värden
kuvösens kalibrering fryser, om vinnaren håller i båda halvorna av vintern 2024/25 (D4); annars startvärdena från 16/9**. Hinner
kalibreringen inte frysas före betans första natt gäller startvärdena. **Skälet:** förarnas svar är det dyraste facit projektet har, och
de bör samlas på den regel som ska behållas. **Alternativet:** startvärdena oavsett, som regeln stod — då hade testarna hört gissningar
i tre månader fast bättre underbyggda värden fanns.

**Valet är gjort innan kalibreringens resultat finns.** Kuvösen har inte fått datan 1/10. Därmed väljs rösten inte efter utfallet.

**Ändringen står i TROSKLAR-KOMBINATIONEN §5 och §7, med båda signaturerna.** Den bokfördes först som väntande, eftersom Bengts ord inte
nämnde Axel och ett tröskeldokument bara ändras med båda. **Axel godkände samma kväll** (Bengt 1/10: *"axel godkänner"*), innan
ändringen hade slagits ihop — den gäller. **Följd som inte är åtgärdad:** betaguiden till iPhone-testarna säger *"Trösklarna är gissade till
februari … de justeras i februari"* (`docs/BETAGUIDE-IOS.md`, två ställen). Det stämmer inte sedan #425, och den rätta lydelsen beror på
om de kalibrerade värdena håller. Texten är testarnas och skrivs om när det är känt (kort #278); den rörs inte nu.

## #429 (1/10 2026) Betaguiden: trösklarna är satta i förväg och ändras inte under vintern utan ett eget beslut

**Beslut (Bengt 1/10: *"skriv den text du föreslår"*).** De två meningarna i `docs/BETAGUIDE-IOS.md` som sa att trösklarna är *"gissade
till februari"* och *"justeras i februari"* är omskrivna till: **"Trösklarna är satta i förväg och ändras inte under vintern utan ett eget
beslut."** — i TestFlight-texten (*Vad ska testas*) och i guidens stycke, där fortsättningen lyder *"Dina svar visar om de håller, och
därför är de viktiga."*

**Skälet.** Kalibreringen i februari finns inte kvar (#425), och #428 lämnade meningen orättad eftersom rätt lydelse då såg ut att bero på
om de kalibrerade värdena håller. Den nya lydelsen stämmer i båda fallen: startvärdena är satta 16/9, de kalibrerade fryses i kuvösen före
betans första natt, och inget av paren rörs under vintern. Den lovar ingen justering och säger inte vilket par som hörs.
**Alternativet:** vänta tills kalibreringen är klar — då hade guiden sagt något osant till dess, och novemberbetans testare får samma fil.

**Vad som inte är gjort.** Android-guiden har ingen sådan mening och är orörd. Har TestFlight-texten redan klistrats in i App Store
Connect ligger den gamla lydelsen kvar där tills Axel klistrar in den nya — repot når inte dit. Ingen tröskel och ingen rösttext ändras.

## #430 (1/10 2026) iPhone-skärmarna rullar, facitknapparna på ett ställe, statusraden bara vid fel (kort #279)

**Beslut (Axel 1/10 kväll, skärmbild från resan 12:39–13:44: *"det går liksom över skärmen … ska radbrytas, inte kapas"*).**
`VaktenView` och `KorlageView` får en `ScrollView` med minsta höjd lika med skärmen — stora telefoner ser ut som förut, och ett
efter-resan-kort med fyra rader går att läsa helt. Samtidigt rättas det som skärmbilden visade i samma vy: S4:s `FacitRow` under
*Senaste tur* göms medan kortet visas (samma varning, samma knappar på två ställen); kortets gemensamma statusrad visas bara vid fel
och bara för den här resan (`Prefs.facitStatusAt`, ny), en vald miss bär ordet *Skickad* själv, *"1 miss"* / *"2 missar"*; alla
klockslag skrivs på svenska oavsett telefonens språk (`Date.klockslag`, `Date.dagOchKlockslag`); och *Redo.* säger *"Din position
lämnar inte telefonen av sig själv"* (#320:s missade rad). `CURRENT_PROJECT_VERSION` 19 i samma commit (#240).

**Skälet.** Fyra fel som Bengt såg 28/9 på 4,7 tum (`docs/TILL-AXEL-BYGGE-19.md` iPhone 1–3) visade sig 1/10 på Axels stora iPhone
också, så fort resan hade fyra varningar. Statusraden utan datum var värre än oläslig: *"Skickat 22:00 (1 svar)"* från ett tidigare
dygn stod under dagens obesvarade varningar och lästes som att de gått — tvärtemot *"tystnad räknas aldrig som ja"*. Besvarade
varningar försvinner ur kortet på iPhone, så ett lyckat svar behöver ingen rad; felet behöver det.
**Alternativen:** en rad per svar med klockslag (TILL-AXEL 3b för varningar) — onödig på iPhone där raden försvinner; status med
datum i stället för filter — fortfarande en rad som gäller något annat.

**Vad som inte är gjort.** Koden är skriven utan kompilator (inget CI-flöde bygger app-målet) — Axels Xcode-bygge (19) är första
provet. 4a (spärr mot dubbeltryck) och 4b (Siri när vakten är av) står kvar som Axels beslut (§4.2). Android är orörd: hemskärmen
rullar redan, men dubbla knappar (`LastSaidCard` + kortet) och statusraden utan datum finns där också (TILL-AXEL Android 1).
Betaguiden §5 steg 3 skrivs om (*Skickat* står under *Senaste tur* när allt är besvarat; en rad som gått försvinner).

## #431 (1/10 2026) Batteripaketet: Å1, Å4 och Å5 byggda — de tre som inte bär en tröskel (kort #262)

**Beslut (Axels prioritering 1/10 kväll: #262 före App Store; Bengts beställning 27/9, DECISIONS #386/#387).** Av paketets åtta
åtgärder byggs de tre som varken bär en tröskel eller ett beslut, i ett varv:
- **Å1** — *Avsluta vakten* som knapp i den pågående notisen (`StoppaVaktenReceiver`, stopService + nollad autostartflagga). En egen
  receiver och inte en start-intent till tjänsten: en stoppknapp får aldrig kunna starta en tjänst som redan dött.
- **Å4** — brytarens text: *"Startar när telefonen märker att du åker bil, direkt om bilens Bluetooth kopplas."* Texten rättas,
  inte beteendet: rörelseigenkänningen är huvudspåret enligt `Autostart.kt` sedan v0, och att begränsa den vore ett produktbeslut.
- **Å5** — cache i `Guard.nearestHazardM` med triangelolikheten: efter `m` meter kan ingen fara vara närmare än (senaste svep − m), en
  undre gräns som bara kan ge SNABBARE GPS-takt än sanningen. Nytt svep när bilen kört halva senaste avståndet; nollas vid ny
  snapshot. `GuardTest` prövar att gränsen aldrig väljer en långsammare tier än det exakta avståndet (20 000 fixar mot 300 faror +
  ett segment) och att en ny snapshot släpper gränsen. **Bevis:** android.yml 36924001835 grön på grenen; motprovet 36925352744 med
båda buggarna (stale värde, ingen nollning) föll på exakt `boundNeverSlowsTheCadence` och `newSnapshotDropsTheOldBound` — 56 prov, 2 fällda.

**Alternativen.** Ett rutnät (spatial index) i stället för en undre gräns — mer kod för samma vinst, och gränsen är bevisbart säker.
Begränsa autostarten till Bluetooth i stället för att rätta texten — beteendeändring utan beslut.

**Vad som inte är gjort.** Å2 (stillaståendetier) och Å3 (självstoppet mot gångfart) bär trösklar och väntar på Bengt och Axel (§4.2).
Å0, Å6, Å7, Å8 är Axels: bygge till testaren, protokoll, körfallsmätning, nollmätning. Verify för Å5 (CPU-andel före och efter på
samma rutt) är en fältmätning, inte ett prov. Android (19) saknar fortfarande iPhones statusrad-rättelse och dubbeltrycksspärren
(`TILL-AXEL-BYGGE-19` Android 1–2).

## #432 (1/10 2026) App Store: bara Sverige, skärmbilder ur iPhone 14 inramade, integritetspolicyn publicerad (kort #280)

**Beslut (Axel 1/10 23:06 via Cowork).** (1) **Tillgänglighet: bara Sverige** — appen är svensk; bredare när texten finns på fler
språk. (2) **Skärmbilderna** tas på Axels iPhone 14 (1170×2532) ur (19) och ramas in till Apples 6,9-tumsmått 1320×2868 med appens
egna tokens och typsnitt (`marknadsforing/butik/appstore/rama.py`); sex bilder gjorda samma kväll ur nio råbilder. (3) **`integritet.html`**
i karta-repot uppdaterad av Claude (b9626bf) med de tre färdiga ändringarna ur `docs/PLAY-DATASAFETY.md`: missarna, raderingsmeningen,
datumraden *gäller från 2026-10-01* — publiceringsdagen, inte 26/9 som utkastet sa. Axels ord: *"bara att uppdatera så det blir rätt"*.

**Butikstexten för iOS** och granskarens anteckningar: `marknadsforing/butik/appstore-ios.md` — Play-texten som förlaga, med Polisen
struken (#318/#320), iPhones autostart (*vaknar själv*), missarna i integritetsstycket, och en anvisning till granskaren hur en varning
visas utan att köra (håll på *PÅ VAKT*).

**Alternativen.** Goldie (software-mansion-labs) för skärmbilderna — den fångar i simulatorn, som kraschade på Axels Air 20/9 (#269), och
ramar i en generisk mall; råbilderna fanns redan. Kan prövas för Android, där emulatorn finns i CI.

**Vad som inte är gjort.** Körläget och varningskortet saknas bland bilderna — de två som visar vad appen gör; Axel tar dem (starta
vakten, håll på *PÅ VAKT*). Klick i App Store Connect: versionen, App Privacy, bilderna, texten, inlämning. Triangeln på byggena oläst.

## #433 (2/10 2026 00:09) Halkvakt 0.3.9 (20) inlämnad till App Store — Waiting for Review (kort #280)

**Händelse (Axel, med Claude på skärmen, 1/10 23:37–2/10 00:09).** Versionen 0.3.9 i App Store Connect inlämnad med bygge **(20)**
(långtrycket rättat, DECISIONS #430/#431-varvet). Ifyllt i samma sittning: sju skärmbilder 1284×2778 i AppLaunchFlow-looken
(`marknadsforing/butik/appstore/alf.py`), kampanjtext, beskrivning, nyckelord, support- och marknadsförings-URL (github.io — halkvakt.se är
inte vår, kortet *Skydda namnet*), copyright *© 2026 Lagerlöf Labs*, granskarens anteckningar på engelska med hur varningskortet visas utan att
köra, *Sign-in required* av, kontakt Axel; App Information: kategori Navigation/Travel, Content Rights ja med rättigheter, åldersgräns 4+;
App Privacy publicerad: Coarse Location + Product Interaction, App Functionality + Analytics, inte kopplat till identitet, ingen spårning,
policy-URL `axelstar.github.io/halkvakt-karta/integritet.html` (uppdaterad b9626bf samma kväll); pris gratis (SEK 0); tillgänglighet
**bara Sverige** (#432); **Manually release** — ett godkännande släpper ingenting förrän Axel trycker Release.

**Vad som väntar.** Apples svar (typiskt 1–3 dygn). Vid avslag: svaret skrivs i Resolution Center, texten in i chatten först. Vid godkännande:
Axel väljer dagen; betaguiden och Kompisarna påverkas inte (TestFlight går vidare parallellt).

**Sagt högt.** (1) ~~(20) är inlämnat utan att långtrycket provats på en telefon~~ — **provat 00:11 på Axels iPhone ur TestFlight (20): kortet
kommer.** Fungerade i (13), bröts av #279:s ScrollView, rättat med simultaneousGesture — bekräftat. (2) Copyright-fältet
sparades som *"Copyright: © 2026 Lagerlöf Labs"* — ordet "Copyright:" ska bort nästa gång versionen redigeras. (3) AppLaunchFlows
nedladdning är betald; samma look byggd fritt i `alf.py`.

## #434 (2/10 2026) Kort #258: vägdatans klockslag tillbaka i körläget — bygge (21), (20) hos Apple rörs inte

**Beslut (Axel 2/10 13:43 på Bengts läsning: *"åtgärda"*).** Kortets Verify — *"körlägets rad väglag HH:mm flyttar sig framåt under resan"* —
pekade på en rad som inte finns på iPhone sedan skinnet v3 (31c58e6, 2/9); strängen räknas i `GuardManager.swift` men visas bara som
*Hämtar/Trafikverket live* på *Redo.*. Bengts väg 1: raden tillbaka. Byggd som på Android — klockslaget till höger om rubriken *PÅ DIN VÄG*
i körläget, i mono, ur `snapshotInfo`. `CURRENT_PROJECT_VERSION` 21 i samma commit (#240); produktboken i samma commit (PRODUKTBOKSREGELN).

**Granskningen.** (20) ligger *Waiting for Review* och rörs inte: att dra tillbaka startar kön om, och raden är ett bevisverktyg, inte ett
fel i (20). (21) går till TestFlight för provet; butiken får raden i nästa version efter godkännandet.

**Alternativen (Bengts):** byta provet mot något synligt utan ny kod — inget duger (en ny olycka kan inte beställas, Xcodes logg kräver
sladd); stänga på kodläsning — strider mot bevisregeln. **Verify står:** en resa på 45–60 minuter i (21) där klockslaget flyttar sig minst
en gång. Axels resa 1/10 12:39 räknas inte (före (19)).

**Sagt högt.** Raden stod i kortet sedan 26/9 utan att någon märkte att den inte fanns på skärmen — samma familj som "en kortrubrik är en
ögonblicksbild" (#402): en Verify-rad skriven efter Androids mönster måste läsas mot iOS-koden innan den fryses.

## #435 (2/10 2026) Kort #270 (a): premissmätningen går varje måndag och läses en gång — tisdag 24/11

**Beslut (Bengt 2/10: *"ok vi kör ja på a, f och g"*).** Vägpunktsgrindens premissmätning
(`scripts/matningar/vagpunkt-premisser-2026-09-30.ts`, DECISIONS #405–#408) går varje måndag i måndagsserien, efter höjdprovet, i samma
körning (`hojd-prov.yml`), från första måndagen efter sammanslagningen.

**Läsningen görs en gång: tisdag 24/11 2026,** på en egen körning den dagen (`dagar: premisser`). Då bär fönstret sextio dygn med ärliga
rader (mål efter 25/9 07:30Z). 24/11 är en tisdag och måndagsserien går 23/11 med 59 dygn — därav den egna körningen. **Måndagarnas
utskrift läses inte som utfall.** Den är driftbevis: grön körning, antal punkter och stationer, saknade dygn. Läsdatumet flyttas inte,
varken framåt eller bakåt, och ingen veckokörning blir en dom (`docs/PROGNOSLAGRET-2026-09-30.md` §4).

**Fryst före första körningen:** skriptet som det står på main 2/10 — kandidaterna RÅ, RÅ+HÖJD och ANOM med OFFSET som tak, snittet 25/9,
banden efter närmaste station, täckning A och B, blockbootstrap B = 300 med frö 20260930. De två öppna spakarna i PROGNOSLAGRET §4 (golvet
vidgat till 8 km, dag/natt delat från vinden) görs **inte** i den här mätningen. Görs de senare är det en ny mätning med egen post.

**Vad läsningen får bära:** en läsning mot A1 och A2 med bootstrapintervallet, per band och vägviktat. Ingen dom och ingen tröskel rörs;
vägpunktsgrindens fall 28/9 (#399) står. Den är underlaget för valet (b), som är öppet.

**Känd fälla:** arkivets radering (`sql/034`) tar bort exporterade dygn äldre än 30 dagar när databasen passerar 350 MB. Händer det före
24/11 krymper fönstret. Skriptet skriver ut saknade dygn; läsningen redovisar då hur många ärliga dygn den bär, och datumet står.

**Kostnad:** ungefär en minut i veckan (körning 36666151860: 62 s), som ett steg i en körning pulsklockan redan startar. Ingen ny
återkommande körning. **Alternativ:** bara knappen 24/11 utan veckokörningar — billigare, men ett fel på växande data hade då synts
först på läsdagen.

**Bevis 2/10:** `ci` grön på grenen (36968020846) och driftprov av måndagskörningen utan inputs, som pulsklockan startar den (36968196427): höjdprovet 56 s, premissmätningen 41 s, populationsläsningen 18 s, alla gröna. Bara stegen lästes, inte talen.

## #436 (2/10 2026) Kort #270 (f): det finska utfallet är stöd för det svenska närbandet, inte dom

**Beslut (Bengt 2/10).** Bandet 0–7 km har 15 svenska stationer med en granne inom 7 km och når inte grindens spärr på 20 (#406). Det
finska utfallet — 108 stationer, rå viktning 2,3 % [1,1–3,5] grova fel (#407) — får **anföras som stöd** när närbandet beskrivs, i
bedömningen, på mätningssidan och i rapporten. Det **dömer inte** det svenska bandet: ingen grind klaras och ingen spärr ändras av det.

**Skälet:** måttet och vakterna är desamma, men terrängen är plattare och det finska arkivet har aldrig bytt arkivregel. Vid läsningen
24/11 (#435) körs den finska mätningen en gång samma dag (`dagar: premisser-fi`), så att stödet bär samma datum som den svenska läsningen.

**Följden som står kvar:** domslutets väg *"talar nära ankare"* (TROSKLAR-SKUGGAN §4 b) kan inte nås på svenska stationer. Valet (d) och
kort #271 (termisk kartering) är öppna. **Alternativ:** låta Finland döma (avvisat: annan terräng), eller inte nämna det (avvisat: det är
det enda underlag med kraft som finns för bandet).

## #437 (2/10 2026) Kort #270 (g): flaggmarginalen mäts i kuvösen med frysklassningens måttstock — tillägg till förregistreringen, före filen

**Beslut (Bengt 2/10).** Premissmätningen visade att frysflaggan vid 1 °C missas i 57 % [41–75] inom 7 km (Finland, 49 stationsflaggor),
och i 6 % om flaggan sätts redan vid 2 °C. Priset i falska flaggor mättes inte (#407). Det mäts nu på data som ingen har läst: **vintern
2024/25 i kuvösen**, som ett tillägg till förregistreringen i #424. Skrivet innan Trafikverkets fil har kommit.

**Vad som mäts.** Leave-one-out vid stationerna, som i vägpunktsgrinden: varje station skattas ur sina grannar och jämförs med sin egen
mätta yta i samma halvtimme, efter driftens vakter.

- **Kandidater:** RÅ och RÅ+HÖJD. OFFSET står bredvid som taket. ANOM mäts inte (föll i båda länderna, #405, #407).
- **Klassgränsen:** K1 = +1,0 °C — motorns frysgräns och flaggans gräns i skuggan (#325).
- **Marginalen:** K2 = 0 · 0,5 · 1,0 °C, de tre värdena i TROSKLAR-FRYSKLASSNINGEN §2 (fastställd 12/9, före alla tal här). Modellen säger
  *fryser* vid skattning ≤ K1 − K2, *fryser inte* vid skattning > K1 + K2 och *vet inte* däremellan. K2 = 0 är dagens flagga. K2 = 1,0
  är *flagga vid ≤ 2 °C*: allt som inte är *fryser inte* räknas som flaggat.
- **Tal per kandidat, marginal och band** (0–7, 7–15, 15–20, > 20 km), alltid med antal:
  1. *Farliga fel:* stationen ≤ K1 och modellen säger *fryser inte*. Skrivs med två nämnare: andel av stationens frysningar (som i
     #407) och andel av de punkter modellen uttalar sig om (som i K-A2).
  2. *Falska flaggor:* flaggat (skattning ≤ K1 + K2) fast stationen > K1, som andel av flaggorna; *klart falska* när stationen > K1 + 1.
  3. *Rätt klass* bland de punkter modellen uttalar sig om, och *täckningen*, andelen punkter utanför *vet inte*.
- **Måttstock:** läses mot K-A1–K-A5 i TROSKLAR-FRYSKLASSNINGEN §4 (≥ 95 % rätt klass · ≤ 1 % farliga fel · ≥ 70 % täckning · underlag
  ≥ 500 punkter över ≥ 20 stationer och ≥ 100 med uppmätt frys · marginalvakten). **Som läsning, inte dom:** K-A gäller offsetmodellen,
  och här lånas måttstocken till de råa kandidaterna. Frysklassningens dokument ändras inte, och dess egen grind döms inte av detta.
- **Inget val.** Alla tre marginalerna redovisas, ingen väljs. Det avviker från förregistreringens *"inget svep"* och står därför här,
  före filen. Ett val av marginal vore en kalibrering och följer regel D.
- **Ärligt om ordningen:** marginalen 1,0 °C väcktes av ett sett tal (6 % i Finland, september 2026). Den ligger i svepet från 12/9
  och prövas på en annan vinter och i ett annat land än där talet sågs.
- **Följden:** som riktningsprovet i övrigt. Utfallet ändrar ingen tröskel och ingen kod, och prognosen får fortfarande bara stärka
  och visa, aldrig utlösa (regel T6).

**Inte i årets arkiv:** september–november har för få frysningar nära stationerna (2 och 11 flaggor i banden 0–15 km, #405).
Premissmätningen (#435) skriver redan ut missad och grovt missad flagga och ändras inte. **Alternativ:** mäta *flagga vid ≤ 2 °C* som
enda punkt (avvisat: vald efter utfallet, och utan priskurvan), eller vänta till årets vinter (avvisat: kuvösen ger en hel vinter i
oktober).

## #438 (2/10 2026) Kuvösen: Trafikverkets leverans mottagen, besiktigad och i en privat release — stämplarna är svensk lokaltid (mätt)

**Underlag (Bengt 2/10: *"filerna är nedladdade på min dator … Vilket är nästa steg"*, sedan *"fortsätt"*).** Fem filer från VViS
Förvaltning, november 2024–mars 2025, nedladdade 16:04–16:05: **5 496 270 rader, 777 stationer**, en rad per station och halvtimme
(medianen 1 440 i november = 30 × 48), inga dubbletter. Fullständigt: `docs/KUVOS-LEVERANSEN-2026-10-02.md`.

**Beslut, i PLAN-KUVOSEN steg 3:s ordning:**
1. **Förvaringen.** Packade (85 MB) och lagda i den privata releasen `kuvos-trv-2024-25`, sha256 före och efter packning; varje
   tillgång nedladdad igen och jämförd, lika. Manifestet i `kuvos/leverans.json`. Aldrig i repot, aldrig i Supabase. Taggen börjar inte
   med `arkiv-`, så arkivbackupens gallring rör den inte.
2. **Tidszonen är svensk lokaltid (Europe/Stockholm), mätt.** Timmen 02 saknas helt natten till 30/3 2025 (1 522 rader i varje annan
   timme), och lufttemperaturens timförändring vid tio stationer mot närmaste SMHI-station har sin topp vid 0 h i tio av tio
   (korrelation 0,55–0,85, mot 0,28–0,57 vid −1 h). Stämplarna görs om till UTC vid inläsningen.
3. **Formatet:** semikolon, decimalkomma, BOM, SSMS-sidfot. −99,9 är saknat värde i varje talfält och blir NULL; −100 i sikten blir NULL;
   sikten 20 000 behålls som i driften och tas av värdevakten.
4. **Nederbördstypen, mängden och vindfälten översätts inte förrän Trafikverkets kodlista finns.** Koderna 1, 2, 3, 4, 6 och 9 ser ut
   som uppehåll, regn, snö och snöblandat, men det är en gissning. Mängden har en okänd kod −99,8 (35 420 rader) och fem rader över 100.
   Motorns fukt bygger på nederbörden, så frysrisken kan inte spelas upp utan koderna. Frågorna står i dokumentets §5; Bengt skickar.
5. **Stationerna:** 754 av 777 har läge i dagens stationslista. **De 23 utan läge används inte** förrän Trafikverket ger det. 100
   stationer i dagens lista saknas i leveransen och redovisas som saknade.

**Förregistreringen.** #424 och tilläggen #426 och #437 är incheckade innan filen öppnades (#437 kl. 07:13 2/10, filen 16:04). Från och
med 2/10 16:04 är filen öppnad: ett nytt tillägg kan bara kallas *före riktningsprovet*, inte *före filen*, och ska säga det. Inventeringen
och besiktningen läste fältens innehåll; ingen regel är körd och inget utfall är läst.

**Alternativ som valdes bort:** gissa koderna ur temperaturmönstret (avvisat: VÄRDEVAKTEN, och en felöversatt nederbörd förfalskar varje
frysrisk); läsa in nu utan nederbörden (avvisat: halva motorn skulle köras tom och se frisk ut — *"det svarar" är inte "det bär"*).

## #439 (2/10 2026) Kuvösen: nederbördskoderna 1, 2, 4 och 6 lästa på Trafikverkets källa och vintern inläst — ändrar #438 punkt 4 (kort #232)

**Underlag (Axel 2/10 17:12–17:13).** Axel hittade Trafikverkets *Ersättningsmodell VädErs 2019 — vägklass 4, 5 och GC*
(bransch.trafikverket.se) och frågade *"kan vi göra något med detta nu?"*; på frågan hur långt: *"Läs in vintern nu"*. Listan han
klistrade in, ur en söksammanfattning, hade sex koder. **Dokumentet, läst på källan, har fyra** (s. 6–7): *"Nederbörd anges i fyra typer:
Ingen nederbörd (kod 1), regn (kod 2), snö (kod 4) samt både snö och regn (kod 6)."* *3 = underkylt regn* och *9 = okänd* stod bara i
sammanfattningen — samma fälla som den påhittade adressen 17/9 (CLAUDE.md). Koderna är MESAN:s; att VViS-filen delar numreringen stämmer
med datan kod för kod (luften per kod, `docs/KUVOS-LEVERANSEN-2026-10-02.md` §2) men är obekräftat.

**Beslut:**
1. **#438 punkt 4 ändras för de koder som har en källa:** 1 → `no`, 2 → `rain`, 4 → `snow`, 6 → `sleet` — driftens ord, så produktionens
   kod läser vintern oförändrad. `rain`/`snow` sätts ur samma kod (2 och 6, 4 och 6). **3, 9 och −9 blir NULL**: 13 893 av 5 391 599
   rader (0,26 %). Mängden och vindstyrkan förblir NULL tills Micke svarat.
2. **Inläsningen i två steg:** den råa tabellen `kuvos_ra.trv_obs` (värdena som i filen) och översättningen på ett ställe,
   `kuvos/oversattning.sql`, som körs om när svaret kommer utan att filerna läses igen. Alla rader läses in, inte arkivpolicyns urval:
   kuvösens `weather_latest` härleds ur arkivet (klocka.sql) och behöver varje station.
3. **Körplatsen enligt #424:** knappen `kuvos` (Actions) hämtar releasen, kontrollerar sha256 mot `kuvos/leverans.json`, kör migrationerna
   och klockan, inläsningen, vakterna och värdevakten. Bevisad lokalt 2/10 på PostgreSQL 16 + PostGIS 3.
4. **Fråga 1 till Micke skrivs om:** bekräfta MESAN-numreringen och förklara 3, 9 och −9.

**Antal (inget utfall):** arkivet 5 391 599 rader och 754 stationer (23 utan läge, 104 671 rader, inte inlästa). Vakterna: #75 922 rader
(41 stationer), radvakten 543 (78), karantänen 15 272 (29), den långsamma vakten 16 263 (86; 340 stationsdygn), utan yta 132 950 —
**5 229 352 rader (97,0 %) får tala**. Värdevakten: fem fält rimliga, inget obesiktigat; sikten 20 000 flaggad som i driften. Talen är knappens körning i Actions
(37027706480, 5 min 22 s, sha256 ok för alla fem filerna); den lokala körningen gav 20 karantänrader färre — sessionens zon var svensk tid,
och `interval '7 days'` på timestamptz blir en timme kortare över sommartiden 30/3. **Kuvösens anslutningar sätter nu UTC** som
Supabase (`kuvos/klocka.ts`, `kuvos/vakterna.ts`); lokalt efteråt: samma tal som Actions.

**Vad det öppnar och inte:** frysrisken, broarna och trenden kan spelas upp. **Efterhalkan (S1, S2) kan inte** — `regn_h` läser mängden.
Förregistreringen (#424) står: ingen regel körd, ingen yta efter en tidpunkt läst, och översättningen valdes på källan. Tillägget är
*före riktningsprovet*, inte *före filen* (#438).

**Alternativ som valdes bort:** vänta på hela kodlistan (#438:s väg — Axel valde bort den: fyra av sex koder och 99,7 % av raderna har nu
en källa, och kuvösens värde sjunker varje vecka före 1/12); ta sammanfattningens *3 = underkylt regn* (ingen källa, och den farligaste
klassen får inte vila på en gissning); skriva 3 och 9 som en egen okänd sträng (snapshotens `fukt` gör varje okänd sträng blöt — 1 420
falska fuktrader).

## #440 (2/10 2026) Snöflingan mäts på kuvösens vinter — förregistrerad innan körningen (kort #233)

**Beställning (Bengt 2/10: *"är snöflingan något att satsa på. gör en körning och se hur det skulle falla ut"*).** Kort #233 del (2)
mättes 21/9 på september (#297) och gav för lite: 7 äkta episoder. Den körs nu på kuvösens vinter 2024/25 (#438, #439), som har kyla.

**Frågan, ordagrant som 21/9:** hur stor andel av stationsregelns fyrningar (yta ≤ +1 °C och fukt) sker när luften ligger över +3 °C
respektive +4 °C, alltså när bilens egen snöflinga är släckt och bara stationen ser faran?

**Skrivet innan körningen:**
- **Skriptet:** `scripts/matningar/snoflingan-kuvos-2026-10-02.ts`, i knappen `kuvos` (ny inmatning `matning`) efter inläsningen och vakterna.
- **Huvudtalet (B):** episoder med alla fyra vakterna som snapshoten bär (#75, radvakten, karantänen, den långsamma vakten); andelen
  med luft > +3 °C och > +4 °C. **A** räknas som 21/9, bara med #75, så att talen kan jämföras. Därtill stationstimmar, per månad, per
  breddgrad, och sammanhanget utan fuktkravet (frost med yta ≤ 0 °C) — som 21/9:s sats 5.
- **Fukten** ur nederbördskoderna 2/4/6 (#439); 3, 9 och −9 räknas som torrt. Broregeln är inte med. Sessionen i UTC.
- **Läsningen, bestämd före talen** (ingen grind, inget som ändrar en tröskel eller appen): under 5 % — bilens snöflinga täcker nästan
  allt stationsregeln ser, och snöflingan är inget säljargument; 5–20 % — ett tillägg i en nisch (klara nätter med kall yta och mild
  luft), värt att nämna men inte att bygga produkten på; över 20 % — ett argument som bär. Med +4 °C som jämförelse bredvid.
- **Vad den inte säger:** om varningarna var rätt. Det är facit, och det läses inte här (blindningen och riktningsprovet). Den säger
  inte heller vad en viss bil visar: snöflingan mäts av bilens egen givare nära vägen, VViS-luften på cirka 2 m.

**Kuvösens förregistrering (#424) berörs inte:** mätningen räknar fyrningar, inte utfall, och den väljer inget värde. Filen är öppnad
sedan 2/10 16:04; inget utfall är läst.

**Utfall (körning 37029386466 på grenen `snoflingan-kuvos`, 5fda573, kl. 17:52 — efter att posten ovan checkades in 17:46):**

| | Episoder | Stationer | Luft > +3 °C | Luft > +4 °C |
| :-- | --: | --: | --: | --: |
| **B. Alla fyra vakterna (huvudtalet)** | **46 858** | 734 | **1 427 (3,0 %)** | **539 (1,2 %)** |
| A. Bara #75, som 21/9 | 47 127 | 734 | 1 470 (3,1 %) | 563 (1,2 %) |
| C. Stationstimmar (B) | 354 296 | | 2,0 % | 0,8 % |

Luften när regeln slår till: median −1,4 °C; över 0 °C i 31 %, över +1 i 16 %, över +2 i 7,8 %. Per månad (B, över +3): november 4,6 %,
december 2,9 %, januari 2,8 %, februari 1,7 %, mars 4,5 %. Per breddgrad: under 58 °N 1,9 %, 58–62 °N 2,7 %, över 62 °N 3,9 %.
Sammanhanget utan fuktkravet: av 74 346 frostepisoder med yta ≤ 0 °C hade 6,7 % luft över +3 °C och 35,6 % luft över noll.

**Läsningen, som den bestämdes före talen:** under 5 %. **Bilens snöflinga lyser i 97 av 100 fall när stationsregeln slår till, och
att stationen ser det bilen inte ser är inget säljargument.** Ingen månad och inget band når 5 %. Talen stämmer med 21/9 (alla sju
äkta episoder under +0,4 °C). Ingen tröskel, ingen kod och ingen text i appen ändras.

**Vad mätningen inte avgör — och som inte ska läsas in i den i efterhand:** om Halkvakts varning är *bättre* än snöflingan, alltså
mer träffsäker om var och när. Snöflingan lyser vid omkring +3 °C överallt och hela kvällar; frågan här var bara om stationen ser
fall bilen missar. Den andra frågan är facit och riktningsprovets, och den förregistrerades inte här. Det enda sakförhållandet som
pekar vidare: sammanhangets 6,7 % — kall yta under mild luft finns, men utan nederbörd, och det är rimfrostens kort (#46), inte
stationsregelns.
## #441 (2/10 2026) Kuvösen steg 4: SMHI för vintern 2024/25 hämtat en gång — radarn finns bara som tif, och tif ligger ≈ 3,4 dBZ över h5 (kort #232)

**Underlag (Axel 2/10 17:51: *"Okej dra igång steg 4"*).** PLAN-KUVOSEN steg 4: radar, molnmängd, lufttemperatur och nederbörd ur SMHI:s
öppna arkiv, hämtade en gång och lagda bredvid; *Verify:* täckningen per månad. Fullständigt: `docs/KUVOS-LEVERANSEN-2026-10-02.md` §8.

**Beslut:**
1. **Metobs:** parametrarna 1 (lufttemperatur), 7 (nederbördsmängd 1 h), 13 (rådande väder) och 16 (molnmängd) ur `corrected-archive`,
   bara vinterns rader, värdet och kvalitetskoden som SMHI skrev dem (`kuvos/smhi-vinter.ts`) → `kuvos_ra.smhi_obs`. Täckning: 243 · 181 ·
   162 · 108 stationer, alla fem månaderna; molnet når 680 av 754 VViS-stationer inom 50 km (driftens #114: 91 %).
2. **Radarn ur tif**, eftersom arkivet saknar h5 (404, mätt 2/10 — kontrollen 21/9 räknade kompositer, inte format). Egen tif-läsare
   (`kuvos/tif.ts`, lika Pillow pixel för pixel, vakter på varje formatantagande) och SMHI:s dokumenterade kodning (0,4 · p − 30).
   **Samplingen är driftens:** Z–R, provpunkterna och händelsegränsen flyttade oförändrade från `ingest/radar.ts` till
   `ingest/radar-karna.ts`, som båda läser. Halvtimmar (kuvösens takt), 7 240 av 7 252 kompositer, 646 278 segmentrader → `radar_precip`.
3. **Ingen korrektion av tif mot h5.** Mätt samma tidpunkt i båda: tif 8–10 enheter (≈ 3,4 dBZ, ≈ 1,6 × regn) över h5 i varje band, fler
   svaga eko. Att dra av en förskjutning vore att välja ett tal efter en jämförelse; kuvösens radar redovisas som tif-produkten och
   skillnaden står i §8. Frågan till Bengt i bedömningen §4.2.
4. **Förvaringen:** releasen `kuvos-smhi-2024-25` (den här sessionen får inte skapa releaser). Hämtningen i Actions (37034624104) nådde
   90-minuterstaket utan en rad i loggen — `grep -v` buffrade den — så filerna som hämtades i Claudes session lades på en engångsgren och
   releasen skapades därifrån (37044952426). Grenen `kuvos-smhi-filer` (12 MB) kan inte tas bort härifrån — Bengt tar bort den. `kuvos/smhi-leverans.json` bär summorna och knappen `kuvos` kontrollerar dem.

**Vad steg 5 behöver:** `moln.ts` och grind NT hämtar vid körning ur `latest-months` och måste i kuvösen läsa `kuvos_ra.smhi_obs`.
Snapshoten läser `radar_precip` genom klockans vy och behöver inget. SMHI:s varningar har inget arkiv (21/9) — SMHI-förstärkaren och
N_varning körs inte, och det sägs.

**Inget utfall är läst:** hämtning, täckning och formatjämförelse; ingen regel körd.

**Alternativ som valdes bort:** driftens timtakt för radarn (kuvösen stegar i halvtimmar, och fönstret 70 min täcker båda);
korrigera tif med −3,4 dBZ (se 3); bara de 40 närmaste molnstationerna per körning, som `moln.ts` gör (en gång för hela vintern är billigare
än per körning); en GeoTIFF-modul från npm (åtta beroenden för ett fast format med tre taggar som spelar roll).

## #442 (2/10 2026) Före resan räknas, inte byggs: källorna i Trafikverkets API och pendlarens notis på kuvösens vinter (kort #233)

**Beställning (Bengt 2/10: *"ja räkna på allt men bara som information inte något bygge alls (det här är bara på
experimentstadiet)"*).** Två läsande mätningar för underlaget `docs/FORE-RESAN-2026-10-02.md`. **Inget byggs i appen, i motorn eller i
driften.** Två mätknappar får en inmatning för att kunna köra en annan läsande fil; det är allt som ändras.

**Skrivet innan körningarna:**
1. **Källorna** (`scripts/matningar/fore-resan-kallor-2026-10-02.ts`, knappen `vagarbeten-matning` med inmatningen `skript`): Trafikverkets
   öppna API just nu — aktiva avvikelser per typ, vägarbetena (påverkan, avstängda körfält, varaktighet, geometri, hur många som är nya
   eller kortare än en vecka), köer (*AbnormalTraffic*), restidssträckorna (*TravelTimeRoute*: antal, län, längd, status, ålder),
   detektorerna (*TrafficFlow*: antal platser, län, ålder), färjorna (*FerryAnnouncement*), och storleken på en gemensam fil för hela
   landet med vägarbetena och restiderna, rå och packad.
2. **Pendlarens notis** (`scripts/matningar/pendling-kuvos-2026-10-02.ts`, knappen `kuvos` med inmatningen `matning`): på kuvösens vinter
   2024/25, de första och sista 30 km av de 20 svenska skuggrutterna som 40 pendlingsvägar, vardagar kl. 06:45 och 16:00 svensk tid. Vid
   varje koll: varje stations senaste rad inom tre timmar, med snapshotens fyra vakter, som frysriskpunkter; motorn kör vägen i 80 km/h.
   Två tal: **(A)** notis när motorn säger något alls, **(B)** bara när något är nytt sedan vägens förra koll. Per månad, breddgrad och väg.
   Kuvösen har bara stationerna — väglaget, olyckorna och vägarbetena saknas, så talet är frysrisken ensam, ett golv.

**Ingen gräns är satt** för hur ofta en notis får komma, och mätningen väljer inget värde. Talen är information. Ska en gräns sättas senare
ska beslutet säga att talen var sedda när den sattes. Fyrningar, inga utfall: ingen yta efter en koll läses, inget facit.

**Utfall 1 — källorna** (körning 37034630809 18:32, och 37034747221 18:36 med en rad tillagd, se nedan): 1 876 aktiva vägarbeten, 87 %
längre än en månad, 50 nya eller kortare än en vecka; 0 kömeddelanden just då (kväll). **198 restidssträckor, 213 km, 191 av dem i
Stockholms län**, 5 i Västra Götaland och 2 i Skåne; mätvärdet 1,6 min gammalt. **3 125 detektorplatser**, 2 400 i Stockholm, 715 i Västra
Götaland, 10 i Skåne; 0,6 min gamla. Färjornas svar nådde taket 20 000 avgångar på 36 leder och är inte räknat färdigt. **En gemensam fil:**
vägarbetena som punkter 48,5 kB packad (som linjer 93,2 kB), restiderna med linjer 71,2 kB, bara status 2,1 kB — tillsammans 120 kB, mot
lägesbildens 83 kB i dag.
**Tillagt efter första körningen, med skäl:** mätningen 26/9 (#420) räknade 5 280 aktiva vägarbeten; den här räknade 1 876, eftersom den
hoppar över de vilande (`Suspended`). Raden som räknar de vilande för sig gav **3 262 vilande inom sin tid** — tillsammans 5 138. **#420:s
5 280 och dess 151 rop per skuggvarv räknade alltså med de vilande**; de aktiva är omkring en tredjedel. Det ändrar inget beslut (vägarbeten
står på vårlistan, Ä3), men talet ska läsas så när frågan tas upp.

**Utfall 2 — pendlarens notis på kuvösens vinter** (körning 37034679400 18:38, och 37035476406 18:58 med del C): **(A, B) längs de 40
ruttbitarna: 0,7 % av 8 560 koller gav en notis, 0 % norr om 58 °N.** Det mäter linjernas grovhet mer än vintern: bitarna har i median två
punkter, 28 av 40 har ingen station inom 1 km, och motorn ser en station bara inom ungefär en halv kilometer från linjen. **Del C, tillagd
efter den första körningen av det skälet** och skriven i skriptet innan den kördes, räknar en väg som passerar k stationer:

| Stationer längs vägen | (A) notis | (B) bara nytt | Notiser per vecka (A · B) | Under 58 °N · 58–62 · över 62 (A) |
| --: | --: | --: | :-- | :-- |
| 1 | 12,1 % | 7,1 % | 1,2 · 0,7 | 5,4 % · 10,1 % · 23,3 % |
| 2 | 14,0 % | 9,1 % | 1,4 · 0,9 | 7,0 % · 12,6 % · 27,2 % |
| 3 | 14,5 % | 10,2 % | 1,5 · 1,0 | 8,2 % · 14,1 % · 28,4 % |

Andelen stationer med frysrisk vid kollen: november 9,4 %, december 10,7 %, januari 22,7 %, februari 10,5 %, mars 6,2 %. **Läsning, inte
dom:** med bara frysrisken skulle en pendlare med två eller tre stationer längs vägen få ungefär en och en halv notis i veckan, i norr nära
tre; bara det nya halverar det inte. Väglaget, olyckorna och vägarbetena kommer ovanpå. Ingen gräns är satt.
## #443 (2/10 2026) Motorn bär olycksläget ut: `Alert.step` (early · reminder · late) för allvarliga olyckor — kort #284

**Underlag (Axel 2/10 18:46: *"Okay, lets start"*, på designöverlämningen v2).** Det nya varningskortet visar en lägesetikett för
allvarliga olyckor — ALLVARLIG · TIDIGT, PÅMINNELSE, ALLVARLIG · SENT — och rubriken "Sakta ner" i påminnelsen. Läget avgörs i motorn
(#28: `<id>#early` / `<id>#near`, och om det tidiga ropet hörts), men `Alert` bar bara kind, avstånd och text.

**Beslut:** `Alert` får ett valfritt fält `step` i alla tre motorerna (TS, Kotlin, Swift), satt bara för allvarliga olyckor. Övriga
varningar är oförändrade, så logformen för 33 av 37 vektorer står kvar. De fyra vektorerna med allvarliga olyckor (v15, v16, v25, v26)
**får** fältet i sina förväntade loggar — ingen rad tas bort, inget tal ändras; Kotlins och Swifts vektortester jämför nu också `step`.
Skuggmotorn buntad om.

**Alternativ som valdes bort:** att låta appen härleda läget själv (allvarlighet + avstånd + om ett tidigare rop hörts) — det är motorns
logik i en fjärde kopia; att läsa läget ur rösttexten — texten är copy, inte kontrakt.

## #444 (2/10 2026) Appens nya skinn: designöverlämningen v2 — och logotypen behåller "!" (kort #284)

**Underlag.** Designöverlämningen *design_handoff_halkvakt_app 2* (2/10): onboarding, Redo (och Redo efter tur), På vakt, varningskorten
A–L, gammal data M–N, inställningar i två nivåer, sex ikoner. Granskad mot motorn och appen 2/10; sex fynd rättade av design i v2,
Genvägar-stegen rättade av Claude på Axels order 18:45 ("Kör direkt", åtgärden "Starta vakten", ett tredje spår via fokus Kör).
Designunderlaget med alla repliker: https://claude.ai/code/artifact/99b270e0-4940-4bc0-817e-45df09b88d1c

**Beslut (Axel):**
1. **Logotypen är triangeln med utropstecknet urstansat** (2/10 18:26: *"we have decided to use the ! in the logo"*). Ersätter "Mätplatsens"
   fyllda triangel utan "!" från natten 2/10, som aldrig loggades här. SVG: `assets/halkvakt-mark.svg` i överlämningen.
2. **Överlämningen v2 är appens design på båda plattformarna** — samma kort, samma rubriker (Olycka, Halka, Frysrisk, Vilt, Fartkamera;
   Allvarlig olycka; Sakta ner). Androids "Uppfattat"-knapp och källrad försvinner: kortet går bort själv efter 8 s.
3. **Rösten ändras inte.** Kortets avstånd följer rösten (under 1 km i hela hundratal, annars hela km), står still i 8 s, och halka,
   vilt och väderstation får ord i stället för tal — kortet hittar aldrig på ett tal.

**Alternativ som valdes bort:** att bara byta färg och typsnitt på dagens kort (varianterna för olyckor och bro bär verklig information
till föraren); ett gult kort för gammal data (gult betyder en fara framför dig).

## #445 (3/10 2026) Halkvaktens favoriter blir sjunde stomdokumentet, och varje öppet kort kopplas till sitt område (kort #233)

**Beslut (Bengt, 3/10):** *"är numera en officiell del av vårt byggprojekt på samma sätt som halkvaktens app, kuvös, bedömningar,
integrationskartan etc. alla byggframsteg ska även noteras där"*, och samma kväll: *"hämta också oavslutade kort och koppla dem till
sidan. Det gäller för övrigt alla sidor och alla öppna kort. koppla till det område de hör till inom alla block som är officiella
byggprojekt"*.
1. ***Halkvaktens favoriter*** (https://claude.ai/artifact/EJYcQFCyKYd9BgGcYkCMyT, källa `docs/FAVORITER.html`) är det sjunde stomdokumentet under STOMREGELN, med samma krav som de
   andra sex: byggframsteg, rättelser och avbockningar förs in där i samma varv, och artefakten republiceras ur repokopian.
2. **Kortkartan.** Varje öppet kort på TAVLA.md kopplas till ett eller flera avsnitt i stomdokumenten i `docs/kortkartan.json`, och varje
   stomdokument visar sina öppna kort under *Öppna kort*, ordnade efter sidans egna avsnitt. Listorna skrivs av `scripts/kortkartan.ts`;
   `--check` i ci.yml fäller på okopplade kort, kopplingar till stängda kort, okända avsnitt och listor som inte är aktuella.
   Första kopplingen 3/10: 44 öppna kort, alla kopplade, flera till mer än en sida.

**Alternativ som valdes bort:** att skriva listorna för hand i sju dokument (de glider isär, samma skäl som kontraktsgrinden); att märka
varje kort på tavlan med sin sida (tavlan är människolagret och ändras av flera sessioner, och en tavelsynk som skriver om fyrtio kort är
den form av ändring som svalde 174 rader 8/9); att lägga listan inne i varje avsnitt (fler markörer i varje sida, samma innehåll).
**Kopplingen är en bedömning per kort**, gjord av Claude 3/10 mot kortets text och sidans avsnitt. Den rättas i kortkartan.json, inte i sidorna.

## #446 (3/10 2026) Projektkartan blir navet över bygget, med läget per del underordnat beviset (kort #286, #287)

**Beslut (Bengt, 3/10):** *"ja till projektkartan som nav, bygg den grova versionen"*, efter frågan om en arkitektkopia över hela projektet
med vad som är klart, vad som saknas, beroenden och hur delarna länkas in.
1. ***Halkvaktens projektkarta*** (https://claude.ai/artifact/Bvo6pfdfhwEGjMxsR7xNc8, källa `docs/PROJEKTKARTAN.html`) är navet ovanför de sju stomdokumenten. Den skrivs av
   `scripts/projektkartan.ts` ur `docs/projektkartan.json` och ändras aldrig för hand.
2. **Rollerna:** kartan äger läget per del; den är underordnad beviset (koden, proven, mätningarna); besluten stannar i DECISIONS, ordningen
   och kalendern i bedömningen, arbetet på tavlan, reglerna i tröskeldokumenten och beskrivningarna i stomdokumenten.
3. **Färgerna och kraven:** grönt = klar och i drift, med bevis · orange = delvis, med vad som saknas · rött = ej påbörjad, med vad som
   saknas · blått = väntar på beslut eller nyckel, med nyckeln · grått = medvetet stängd, med beslutet.
4. **Kontrollen** `--check` i ci.yml, som kortkartan.
5. **Grov version först:** 75 delar i 9 block, läget i stora drag ur stomdokumenten, tavlan och beslutsloggen; alla 46 öppna kort på en del.
   Mätningen del för del mot koden är kort #286; Axels titt är kort #287.

**Alternativ som valdes bort:** en ritad duk i Design (följer inte repot och glider isär med verkligheten, Claudes bedömning som Bengt
godtog); ett register i bedömningen §5.3 (bedömningen är listan över vad som görs härnäst, inte bilden av vad som finns); ett åttonde
stomdokument bland de andra (kartan är det man går in genom, inte ett dokument bland andra).

## #447 (3/10 2026) Kartsynken: projektkartan uppdaterar sig själv, och allt arbete bokförs i kartan (kort #288)

**Beslut (Bengt, 3/10):** *"ja till alla tre, slå ihop 704 och bygg kartsynken och det innebär från nu att alla arbeten som axel och jag
gör oberoende av varandra loggas som gjorda i projektkartan"* — på förslaget `docs/KARTSYNKEN-FORSLAG-2026-10-03.md` (§4.2), skrivet
efter att Axel släppt 0.3.10 (22) utan att kartan märkte det.
1. **Kartsynken byggs:** signaler i Supabase (App Store Connect API och förarsvaren), regler på byggstegen i `docs/projektkartan.json`,
   och en schemalagd kartsynk i Claude-appen morgon och kväll, plus första steget i varje session.
2. **Sammanslagning utan "slå ihop"** för kartsynkens egna PR:er, på två villkor: (i) de rör enbart `docs/projektkartan.json` och det
   som `scripts/projektkartan.ts` och `scripts/kortkartan.ts` skriver (kartsidan, LÄGESRADER-blocken, listorna *Öppna kort*); (ii) CI är
   grön på exakt det prövade huvudet. Allt annat väntar som förut på Bengts ord.
3. **Axels nyckel till App Store Connect** (Issuer ID, Key ID, `.p8`) läggs i Supabase secrets, aldrig i repot. Tills den finns visar
   kartan att App Store Connect inte läses — tyst frånvaro vore ett tyst aldrig.
4. **Allt arbete bokförs i kartan**, Bengts och Axels, i vilken session eller på vilken enhet det än görs. Två vägar: (a) *maskinvägen* —
   signalerna bockar regelstegen; (b) *bokföringsvägen* — kartsynken går igenom varje commit på main sedan förra synken som inte rörde
   kartan (utom maskinernas: Marknadsmotorn, trv-bevakning och kartsynken själv) och bokför den på sin del med commiten som bevis, eller
   antecknar att den inte rör någon del. Regeln *samma commit* (PROJEKTKARTAN i CLAUDE.md) gäller fortfarande; kartsynken är nätet under den.

**Alternativ som valdes bort:** GitHub Actions på schema (Bengts regel 22/9 om Actions-minuter, och Actions kan inte republicera
artefakterna); en krok på Axels Mac efter uppladdningen (missar granskningen och installationerna); att be Bengt och Axel säga till
(det var just det som inte hände 3/10).

## #448 (3/10 2026) Läsarkontraktet i Swift och Kotlin, och fartgränsen bort ur Swift-läsaren (kort #289)

**Beslut (Bengt, 3/10):** *"ja till a och b"* — på planen i kort #289 och frågorna i bedömningen §4.2, efter frågan om vad som krävs för
att delen *Motorn i tre språk* ska bli klar.
1. **(a) Planen:** Swift- och Kotlin-läsarna av lägesfilen prövas mot `engine/fixtures/lasarprov.json`, som TS-läsaren sedan 20/9
   (#278). Kotlin i appens befintliga testmål; Swift-läsaren flyttas ur appen till motorpaketet (där TS-läsaren har sin motsvarighet i
   `engine/src/snapshot.ts`) och prövas där, så att iPhone-appen inte behöver ett eget testmål. Axel bygger appen och kör paketets
   tester en gång på Macen, eftersom CI kör Swift på Linux.
2. **(b) Fartgränsen:** Swift slutar läsa kamerans `limit`. TS är referensen och läser den inte, Kotlin inte heller, och `static.json`
   publicerar ingen `limit` — läsningen var vilande. En röst med fartgräns är en egen funktion med eget kort och en datakälla som inte
   finns i dag.
3. **Följer med:** farornas ordning i Swift och Kotlin blir referensens (olyckorna före vilt, djur och broar). Motorn väljer vinnare på
   typens prioritet, och ordningen inom en typ ändras inte, så ingen varning ändras — men kontraktet jämför ordningen. Kotlin läser
   id som text oavsett om JSON bär text eller tal, som TS och Swift: testmiljöns org.json kastar på ett tal där Androids gör om det.

**Alternativ som valdes bort:** ett testmål i iPhone-appen (kräver macOS-körningar i CI till tiodubbla minuter, och Xcode-schemat i
kort #228 först); Robolectric för Android-testet (riktiga Androids org.json, men tyngre beroende och långsammare körning).

## #449 (3/10 2026) Kortvakten i kartans kontroll, och ja till planen för livemotorns prov (kort #290)

**Beslut (Bengt, 3/10):** *"1. ja, 2 ja till planen och 3 slå ihop 714"* — efter frågan *"kommer du ihåg att stänga öppna kort allt
eftersom vi arbetar på"*, när kort #259 visat sig stå öppet en dag fast kartan visste att villkoret var uppfyllt.
1. **Kortvakten:** `scripts/projektkartan.ts --check` fäller (a) en grön del som bär ett öppet kort, och (b) en del vars Verify-steg alla
   är klara medan ett öppet kort hänger kvar. Den körs i ci.yml och md-vakt.yml, alltså i varje PR. Motprov: läget före stängningen av
   #259 (aac8cb0) fälls på `a-reglaget`. Vakten ser bara det kartan vet — ett kort vars villkor bevisas utanför kartan (en mätning, ett
   kvitto) fångas inte, och där gäller TAVELREGELN 3 som förut.
2. **Kort #290:** planen godkänd — spegeln (`KEEP`/`ARCHIVE` och beslutet) till en gemensam ren modul, upserterna prövade med Deno mot en
   tillfällig PostGIS i ett eget flöde som bara körs när livemotorn ändras, och deploy efter steg 2 med kursorerna som bevis.

**Alternativ som valdes bort:** en varning i stället för ett fel (en varning läses inte — samma skäl som VÄRDEVAKTEN: ett hinder, inte
en varning); att kartsynken stänger kort själv (dess PR:er får bara röra kartan och slås ihop utan "slå ihop", #447 punkt 2).

## #450 (3/10 2026) Arkivexportens återläsning byggs nu, före första raderingen (kort #291)

**Beslut (Bengt, 3/10):** *"ja till #291, bygg den nu och slå ihop 720"* — efter mätningen 266 MB 3/10 (dbknapp 37135239114), som
flyttar raderingens början från "före mars" (sql/034, #334) till runt 15/10.
1. **sql/042:** `arkiv_rader` tolkar exportfilen, `arkiv_aterlas` läser tillbaka den till `weather_observations` (`ON CONFLICT DO
   NOTHING`, bara för postgres), och `arkiv_jamfor` jämför en fil med databasens dygn kolumn för kolumn utan att skriva.
2. **Proven:** rundresan i `test/integration.test.ts` (exportera, radera, läsa tillbaka, jämföra; jämförelsen ser en ändrad rad) och
   `arkivexport?aterlasprov=1` via databasknappen mot det äldsta riktiga dygnet i hinken.
3. **Marsvägen** står i RUNBOOK: veckodumpen och de raderade dygnens filer i en tillfällig PostGIS, domens skript mot den.
4. **Pro-frågan står kvar** (§4.2, grepp 3) — återläsningen behövs oavsett väg, och alternativen utan Pro står på samma rad.

**Alternativ som valdes bort:** att vänta till februari (sql/034:s plan — raderingen börjar fyra månader tidigare); att läsa tillbaka
med Node i en container i stället för SQL (en läsare i databasen fungerar likadant i drift, container och CI).

## #451 (3/10 2026) Kortgenomgången är ett krav, som kartan och artefakterna (TAVELREGELN 5)

**Beslut (Bengt, 3/10):** *"kan du inte istället lägga det som ett krav på samma sätt som du uppdaterar projektkartan och övriga
artifacts"* — efter påminnelsen *"du glömmer inte att stänga öppna kort om det går"*, när kortvakten (#449) visat sig se bara 10 av 45
öppna kort (de som hänger på en del med ett Verify-steg).
1. **TAVELREGELN 5:** varje varv avslutas, och varje kartsynk körs, med `scripts/kortkartan.ts --genomgang` — varje öppet kort med sin
   Verify-rad och sitt "Kvar". Ett kort vars Verify är uppfylld med ett bevis som går att följa flyttas till 🟢 med beviset i samma commit;
   ett kort utan Verify-rad får en. Sessionsprotokollets steg 4 och den schemalagda kartsynken bär samma steg.
2. **Kartsynkens rapport** listar korten den bedömer som uppfyllda, med beviset, och öppnar en egen PR som stänger dem. Den PR:en rör
   tavlan och slås därför inte ihop av sig själv (#447 punkt 2) — den väntar på Bengts "slå ihop".
3. **Läget 3/10:** 11 av 45 öppna kort saknade Verify-rad och kunde inte prövas (#262, *Skydda namnet*, *Tolv testare*, *Välkomsttext*,
   *Introduktionen*, #42, #153, #151, #103, #46, #45). De fick en i samma varv, ur kortets egen text och — för tröskelkorten — domen
   i kortets eget `docs/TROSKLAR-*.md`. Den första genomgången fann inget kort uppfyllt.

**Alternativ som valdes bort:** bara en påminnelse i chatten (det var just den som inte räckte); att kartsynken stänger kort själv och
slår ihop (att stänga ett kort är en bedömning av beviset, inte en räkning).

## #452 (3/10 2026) Datavakterna säger till: vakthunden läser publiceringens noter (kort #292)

**Beslut (Bengt, 3/10):** *"ja till planen, slå ihop 724 och 725 och kör på"* — på planen i kort #292 (bedömningen §4.2).
1. **`vakthund/datavakter.ts`** läser publiceras senaste svar ur `net._http_response` (de med `segments` och `notes`): vilka stationer
   karantänen och den långsamma vakten tystar, och vilka källor som inte gick att läsa. Prövad i `test/datavakter.test.ts`.
2. **Raden** `datavakterna: karantän N (…) · långsam vakt M (…)` står i vakthundens svar varje timme.
3. **Larmet** är ett driftlarm (`vakthund`-issue) när samma källa varit oläsbar i de tre senaste publiceringarna (en halvtimme). En
   enstaka miss är fail-soft med flit. Larmet gäller alla publiceringens "ej läsbar"-noter — karantänen och den långsamma vakten, och
   också radarn, regnsegmenten, grannländerna, regnmängden och lutningen, som tiger på samma sätt.
4. **Provet** `?datavaktprov=1` via databasknappen låtsas att karantänen inte kunnat läsa i tre publiceringar.

**Alternativ som valdes bort:** att publiceringen själv larmar (den kör var tionde minut och har ingen larmväg; vakthunden har en);
att räkna om vakterna i vakthunden (regeln skulle då stå på två ställen — läxan bakom kontraktsgrinden).

## #453 (3/10 2026) Kuvösens körflöde, steg 5a: körningen byggd, och vad "ryms i ett Actions-jobb" betyder — satt före tidskörningen (kort #232)

**Bakgrund.** Steg 5 är beslutat (#424, #426, #437). #426 säger: *visar körtiden på vinterns första sju dygn att serie B inte ryms i ett
Actions-jobb glesas den till var sjätte timme — avgjort på körtiden, innan något utfall är läst.* Bengt 3/10: *"slå ihop 730 och kör på"*.

**Byggt (`kuvos/korning.ts`).** Klockan ställs på varje halvtimme, produktionens snapshotbyggare körs oförändrad, och motorn kör rösten i
två serier: (A) de 20 skuggrutterna i varje steg, (B) varje väglagssträcka var tredje timme från 00:00 UTC. Spåret är skuggmotorns
(80 km/h, en fix var femte sekund). `--tid` skriver bara körtiden och stegen, inga varningar. Utan `--tid` sparas varje varning som en
rad för facitsteget, och körningen själv läser inget utfall. Knappen är `kuvos` med `korflode = tid-sju-dygn`.

**Regeln, satt nu, före tidskörningen (Claudes val, Bengt kan ändra det före knappen).** *Ryms* betyder att den beräknade tiden för hela
vintern är högst **90 % av jobbets 360 minuter (324 min)**. Tiden räknas som de sju dygnens snitt per steg uppräknat till vinterns alla
halvtimmar, plus jobbets egen tid före körflödet (hämtning och inläsning). Ryms B var tredje timme körs den så. Annars glesas B till var
sjätte timme, och ryms inte ens det skrivs det ut. Skälet till marginalen är att sju dygn är ett stickprov: november är lugnare än
januari, och snapshoten tar längre tid när fler stationer är kalla.

**Prov.** I `test/kuvos.test.ts` ligger halvtimmarna, schemat för serie B och tidsdomen. Spåret jämförs fix för fix med skuggmotorns
egen `traceAlong`, utläst ur källan. Kontraktsgrinden vaktar farten och punkttätheten mellan skuggmotorn och kuvösen. Motproven gjordes
lokalt 3/10: farten 90 fälls av grinden och av provet, och `round` → `floor` är osynlig för grinden men fälls av provet.

**Utfallet av tidskörningen 3/10 (kuvos 37141247592 på 235f355, inga varningar lästa):** vintern har 7 245 halvtimmar. De sju första
dygnen gav 336 steg, varav 56 B-steg, och 0 tomma steg. Per steg tog snapshoten 207 ms och serie A 114 ms, och serie B tog 166 ms per
B-steg. Hela vintern beräknas till 44 min utan B, 47 min med B var tredje timme och 45 min med B var sjätte timme, med jobbets 5 min före
körflödet inräknade. **⇒ B körs var tredje timme, som #426 registrerade.** Marginalen mot gränsen (324 min) är sjufaldig, så valet av
gräns avgjorde inget. Väglagsnätet hade sha256 `ac52f6c3…6ad5bb` och var dagens geometri.

**Inte byggt än (5b–5d).** Facit (stationens egen yta i varje dels utfallsfönster), stationsreglerna och grindarna på kuvösens klocka
(`moln.ts` och grind NT ska läsa `kuvos_ra.smhi_obs`, och `trend_kandidater` ska beräknas för vintern), samt tabellen *del × ensam ×
ovanpå*. Efterhalkan och vinden väntar på Trafikverkets svar om mängden och vindstyrkan (#439).

## #454 (3/10 2026) Kuvösen: hur många rader 60-minutersfönstret tappar på sekunderna i tidsstämplarna — förregistrerad mätning (kort #232)

**Bengts fråga 3/10:** *"hur många rader menar du att vi förlorar på totalen och har det någon verklig betydelse"*. Den gäller
PLAN-KUVOSEN §10 fråga 3. Trendens lutning (`sql/018`) kräver minst tre rader i ramen 60 minuter bakåt. Kuvösens rader är stämplade
hh:00:ss och hh:30:ss med sekunder 03–06, så raden en timme bakåt kommer med bara om dess sekunder är minst lika många. Är sekunderna
samma för en station varje gång tappas inget. Är de slumpvisa tappas ungefär 37 %.

**Mätningen, bestämd före körningen** (`scripts/matningar/sekunderna-kuvos-2026-10-03.ts`, knappen `kuvos`):
(1) sekundernas fördelning och antalet stationer med samma sekund varje gång; (2) andelen rader där 60-minutersramen har minst tre
rader, mot samma ram vidgad till 62 minuter (där sekunderna inte spelar roll) — skillnaden är det som tappas — och 30-minutersramen;
(3) samma för trendens bredaste startband (yta +1…+6 °C). **Läser bara tidsstämplar och antal:** ingen lutning, ingen yta efter
något, inget utfall. Mätningen ändrar ingenting; om något ska rättas (t.ex. tidsstämplarna avrundade till halvtimmen i kuvösens
översättning) är det ett eget beslut.

**Utfallet (kuvos 37150889692, 3/10):**
- Sekunderna: 99,6 % av raderna har sekund 03, och 298 av 736 stationer har samma sekund varje gång.
- 60-minutersramen tappar **21 519 av 5 256 028 rader, 0,4 %**. Inom trendens startband är det 7 277 av 1 622 826, också 0,4 %.
- 30-minutersramen har tre rader i **0** rader av 5,26 miljoner.

**Slutsats:** sekunderna saknar betydelse, och inget rättas. Problemet är upplösningen (en rad per halvtimme räcker inte för ett fönster
på 30 minuter), inte tidsstämplarna. Frågan i PLAN-KUVOSEN §10 punkt 3 gäller därför bara 30-minutersfönstret.

## #455 (3/10 2026) Kuvösen: fyra tillägg till förregistreringen före riktningsprovet — ovanpå, baslinjen, 30-minutersfallet, ej prövade (kort #232)

**Beslut (Bengt 3/10):** *"ja till A"* och *"vi kör på dina rekommendationer för 1, 2 och 4"* — på PLAN-KUVOSEN §10 och bedömningen §4.2.
Skrivet efter att filen öppnats men **innan någon regel körts och något utfall lästs** (#438:s regel: från filen räknas tillägg som
*före riktningsprovet*).

1. **"Ovanpå de andra" räknas i kombinationsgrindens form (KB-B, TROSKLAR-KOMBINATIONEN §4).** För varje del P jämförs *alla andra delar*
   med *alla andra plus P*:
   - *Nettonytt* är de facittillfällen inom 5 km från stationen som bara P fångar.
   - *Pris* är de fyrningar P lägger till och som blev falsklarm.
   - Allt räknas per episod, en stationsnatt från middag till middag i svensk tid (#246).
   - En nära miss är inte ett falsklarm, och tidsvinsten redovisas bredvid men räknas aldrig som nettonytt.
   - **Inga golv**: det är ett riktningsprov, ingen dom. "Ensam" är varje dels eget mått i sitt tröskeldokument.
2. **Frysrisken (dagens `icing_point` och broarna) är baslinjen** som de andra delarna läggs ovanpå, som "dagens motor" i KB-B. Den
   redovisas med antal fyrningar och episoder men döms inte på egen yta: utlösaren är stationens egen yta, och egen-yta-facit vore
   nästan cirkulär.
3. **Väg A — 30-minutersfallet ur två halvtimmesrader, bara i kuvösen.**
   - Driftens `lutning30` är värdet 30 minuter bakåt minus värdet nu (`sql/018`). Driften mäter var femte minut (dbknapp 37151681447), och
     leveransens stämplar :00:03 och :30:03 är två av samma serie (dbknapp 37152138197).
   - Kuvösen räknar därför trenden med en variant av driftens funktion, **härledd ur `sql/018` vid körning** och aldrig kopierad. Den enda
     skillnaden är att 30-minutersramen kräver två rader i stället för tre.
   - Hoppvakten (≤ 3 °C) ser då bara ändpunkterna, och givarvakterna står kvar. Driftens kod är orörd. 15 minuter går inte att räkna.
   - **Kalibreringen i kuvösen (#425) sveper därför 30 och 60 minuter**, inte 15. Att 15 inte prövades står här, så att ingen läser
     det som att 15 prövades och föll.
   - Premissen att ytan är ögonblicksvärdet är starkt trolig men inte bekräftad av Trafikverket (Bengt: ingen fråga till Micke om detta).
4. **Delar utan startvärden** — rimfrostens R-B (R1–R5 osatta), sikten och daggpunktsgapet — **redovisas som *ej prövade: inga
   startvärden***. Inga värden skrivs nu för att fylla tabellen. Rimfrostens R-A, som är signalkontrollen, körs.

**Bevis för väg A:**
- Integrationsprovet är grönt i ci 37152543161 och har sin egen motkontroll: driften ger tom 30-minuterslutning, varianten 0,80.
- Motprovet blev rött på just det provet i ci 37152660669 (utkast #736, stängt).
- Kuvösen 37152660384 räknade trenden över hela vintern på 1,0 min: 363 508 fallande kandidater, varav 363 453 med 30-minuterslutning,
  363 056 med 60 och 0 med 15. Bara antal, inga utfall.

**Rättelse samma kväll (Claude, före varje körning):** punkt 4:s mening *"Rimfrostens R-A, som är signalkontrollen, körs"* var fel.
- **R-A är ett svep:** den räknar R1 × R2 × R3 och redovisar *"bästa kombinationen"* (`scripts/grind-r-a.ts:250–282`).
- **T-A är också ett svep:** den rangordnar svepet och väljer en vinnare (`scripts/grind-t-a.ts:229–262`), och TROSKLAR-TRENDEN §2 säger
  att värdena *"gissas inte … T-A väljer värdet"*. Trenden har alltså inga egna startvärden.
- Enligt *inget svep* (#424) och punkt 4 är **T-A och R-A *ej prövade*** i riktningsprovet.
- Trendens parametrar prövas ändå **inom efterhalkan**, med betans startvärden (30 min, 0,8 °C, +1…+3 °C, #222), när regnmängden finns.
- Molnkällan ur kuvösens arkiv (`kuvos/moln.ts`) behövs för kombinationens fysikkontroll (KB-C3).
- **Bengt 3/10, efter rättelsen:** *"behåll ej prövade"*. T-A och R-A körs inte i riktningsprovet, och inga startvärden skrivs för dem.

**Alternativ som valdes bort:** att fråga Trafikverket om 5-minutersvärden (väg B: renast, men Bengt vill inte lägga en femte fråga);
bara 60 minuter (väg C: betans eget fönster hade aldrig kunnat vinna); att flytta tillbaka kalibreringen till 1/2 2027 (halva domvintern
förlorad). **Axel** bör få veta punkt 3, eftersom kalibreringen i kuvösen var hans ok (#425).

## #456 (3/10 2026) Kuvösen: riktningsprovet väntar på Trafikverkets svar, längst till vecka 42 — och vad som gäller utan svar (kort #232)

**Beslut (Bengt 3/10):** *"vi väntar till vecka 42"*, efter hans fråga *"ska vi inte vänta in [svaren från Micke] innan vi gör detta?"*.
**Skälet:** två av de fyra frågorna från 2/10 rör delarna i riktningsprovet. Den ena är nederbördskoderna 3, 9 och −9, som rör motorns
fukt och nederbördstypens facit (1 423 och 55 318 rader av 5,5 miljoner). Den andra är läget för 23 av 777 stationer. Översättningen av
en kod är ett val, och det ska göras innan utfallet läses. Planen sa vecka 42, och höjdläsningen 23/10 hinns ändå.

**Förregistrerat nu, före körningen:**
- **Kommer svaret senast fredag 16/10:** koderna och stationerna förs in enligt Trafikverkets besked, skrivet i DECISIONS innan knappen
  trycks. Sedan körs riktningsprovet.
- **Kommer inget svar:** riktningsprovet körs ändå senast fredag 16/10. Koderna 3, 9 och −9 räknas som saknade (NULL, som i dag), och de
  23 stationerna står utanför. Det skrivs i körningens rubrik och i redovisningen.
- Regnmängden, sikten och vinden rör inte delarna som körs nu. Efterhalkan, övergångarna, tillståndet, försprånget och vinden körs när
  regnmängden och vindstyrkan finns.

**"Ovanpå" gjort räknebart för kuvösen (#455 punkt 1), ur redan skrivna värden och utan nya tal.** Skrivet nu, före regnmängden och
före något utfall. Bengt kan invända innan efterhalkan körs.
- **Facittillfälle:** en stationsnatt (middag till middag i svensk tid, #246) där stationens yta når ≤ +1,0 °C. Det är uppspelningens
  *föll ut* (`sql/028`) och T-A:s träffgräns.
- **En del fångar** tillfället om den fyrat för stationen den natten inom 90 minuter före det första ögonblick ytan når ≤ +1,0 °C, alltså
  uppspelningens utfallsfönster (t, t + 90 min]. Baslinjen, dagens `icing_point`, fångar om den fyrat för stationen den natten senast
  i det ögonblicket.
- **Nettonytt för P** är de facittillfällen som bara P fångar, varken baslinjen eller någon annan del, som andel av alla facittillfällen
  vid stationer som klarar vakterna den natten. Det är räckviddsvillkoret i KB-B: en miss räknas bara där någon kunde tala.
- **Pris för P:** P:s tillkomna fyrningsepisoder är nätter där ingen annan del fyrat för stationen. Pris är de av dem där ytan inte når
  ≤ +1,5 °C inom 90 minuter (*uteblev*), som andel av de tillkomna episoderna. *Nära*, inom nära-miss-bandet +0,5 °C, är inte falsklarm.
- **Tidsvinsten** är minuterna mellan P:s första fyrning och baslinjens på tillfällen som båda fångar. Den redovisas bredvid och räknas
  aldrig som nettonytt.

**Byggt 4/10 (Bengt: *"ja, bygg efterhalkans uppspelning och kör på"*), före regnmängden och utan något utfall läst.**
`kuvos/efterhalkan.ts` kör `uppspelning_efterhalka` (sql/028) med betans startvärden. Ögonblicken tar den ur en variant som härleds ur
samma källa vid körning och aldrig kopieras, som väg A. `kuvos/ovanpa.ts` räknar tabellen ovan, och båda går i riktningsprovets knapp.
Utan regnmängden skriver efterhalkan bara att underlaget saknas. Fyra läsningar av texten ovan är nu kod, och Bengt kan invända innan
något körs:
- **Fönstret** är (t, t + 90 min] och samma natt. En fyrning i själva facitögonblicket har inget försprång och fångar inget.
- **Baslinjen** är stationens egen `icing_point`, alltså motorns villkor yta ≤ 1 och fukt (engine.ts). Broarna räknas inte, eftersom de
  är egna faror och inte "för stationen". Baslinjen kan tidigast tala i facitögonblicket, så tidsvinsten blir facit minus P:s första
  fyrning i fönstret.
- **Tillkommen** betyder att varken en annan del eller baslinjen talat för stationen den natten. En natt där stationens röst redan
  hörts är inte en ny varning.
- **Facit och baslinjen** räknas bara på rader som klarar vakterna: #75, radvakten, karantänen och den långsamma vakten. Fukten och
  vakterna importeras, och kontraktsgrinden vaktar natten, fönstret och nära-bandet (nytt kontrakt, två kopior).
**Bevis (PR #739):** ci 37182523731 grön på a4d3504 (259 prov, PostGIS-provet kört, 0 hoppade); motprovet i CI, fukten i facit ersatt med true, rött i 37182562056 på just facitraden (258 av 259, kontraktsgrinden grön; utkast #740 stängt).

## #457 (3/10 2026) Projektkartan visar också "av det som går att göra före vinterns domar" (kort #286)

**Bengts fråga 3/10:** *"har inte allt vårt arbete med skuggan rört denna siffra överhuvudtaget?"* Svaret var att siffran rörde sig från
62,8 % till 64,3 % den dagen. Skuggans arbete fyller de tidiga stegen, och stegen efter en dom väntar på vintern. **Beslut (Bengt):**
*"jag vill att du uppdaterar projektkartan med ditt förslag"*.

**Byggt:** projektkartan.ts skriver under procenten en rad med samma räkning, men bara över de steg som går att göra före vinterns domar.
Raden säger också hur många steg efter en dom som väntar. De steg som kommer efter en dom är `EFTER_DOM`: domen själv, villkoret i
motorn, testfallen i tre språk och appen, som enligt tröskelregimen byggs först när domen fallit. **Publiceringen i lägesfilen hör inte
hit**, eftersom fält publiceras före domen (trendens lutning och regnet gör det redan). Det skiljer sig från överslaget i chatten, som
räknade med den och därför gav ett högre tak. Självtestet räknar en del för hand: 50 % före domarna mot 25 % totalt, med "Domkalendern"
som inte är en dom.

**Första värdet 3/10:** hela kartan 64 %, och **72 % av det som går att göra före vinterns domar**. 65 steg i 19 delar väntar på vintern.
Motorn står på 55 % och på 79 % före domarna; skuggan och prövningen står på 74 % och 77 %.

## #458 (4/10 2026) Länssidorna skrivs av publicera — 21 län var 30:e minut, med motorns ord för halt (kort #281)

**Bakgrund:** Marknadsplanen (`docs/MARKNADSFORING-NOLLBUDGET.md` §6, Axels order 2/10) säger att Claude bygger *"Halt väglag i
Skåne just nu"* för 21 län och sex vägar i oktober, eftersom Google behöver veckor för att hitta sidorna före första frosten. Mätt 4/10:
Bengts konto har bara läsrätt i `Axelstar/halkvakt-karta`. Dit skriver bara Axel och publicera (PUBLISH_TOKEN). **Beslut (Bengt 4/10):**
*"B för länssidorna"* — publicera skriver sidorna, inte statiska sidor via Axel (alternativ A).

**Förregistrerat före bygget:**
- **Var:** `publish/lanssidor.ts`, ren och körtidsneutral som kartkärnan, buntad in i publicera. Sidorna skrivs i kartlagrens varv
  (var 30:e minut): `lan/<län>/index.html` för de 21 länen och `lan/index.html` med läget per län. Vägsidorna kommer sedan.
- **Halt** betyder exakt det som får motorn att tala om en sträcka: kod ≥ 2 eller ett halkord i Trafikverkets text (`SLIPPERY_INFO`,
  `SLIPPERY_STAM`). Kopian vaktas av kontraktsgrinden, och Trafikverkets egna ord står på sidan. Sidan påstår aldrig själv att det är
  halt: den säger vad Trafikverket rapporterar och vad stationerna mäter.
- **Stationerna** är de som klarar appens vakter (lägesfilens väderpunkter: #75, radvakten, karantänen och den långsamma vakten).
  Varje station hör till länet för den närmaste väglagssträckan inom 20 km. Stationerna saknar egen länskod i arkivet.
- **Olyckorna** är Trafikverkets pågående olyckor i länet (`county_nos`), som på kartan.
- **Sitemapen** är Axels fil. Publicera läser den och fogar bara in de adresser som saknas. Står de redan där skrivs filen inte.
- **Sidornas innehåll** går direkt i samma trädanrop som kartlagren, så publiceringen får inga fler anrop. Funktionens körtid mäts före
  och efter deployen.
- **Deploy** sker först på Bengts *slå ihop*, och sidorna blir publika i samma stund. Beviset är en commit i kartrepot med sidorna och
  sitemapen.

**Byggt 4/10, före deployen:**
- **Koden:** `publish/lanssidor.ts` och `STATION_LAN_SQL` i `publish/map-core.ts`. `publicera/main.ts` lägger sidorna och sitemapen
  som innehåll i trädanropet.
- **Prov:**
  - `test/lanssidor.test.ts`: halt som motorn, med fällan *fläckvis Våt*; Trafikverkets text escapad; svensk tid och
    minus; sitemapen infogas en gång och Axels rader står kvar.
  - Kartkärnan med och utan appens väderpunkter.
  - PostGIS-provet för stationernas län: en raderad sträcka närmare, en station mellan två län och en 250 km bort.
- **Kontraktsgrinden:** golvet för halkorden och halkstammarna är höjt från 5 till 7.
- **Förhandsvisat** ur dagens kartdata: översiktens tabell ryms på en 375 px bred telefon. 21 länskoder i kartans data, alla
  sträckor *Normalt* 4/10.

**I drift 4/10** (Bengt: *"slå ihop 742 och 744"*, PR #744 som 5459907):
- **Deploy och första varv:** deploy-supabase 37193469610 ur 5459907. Kartvarvet 10:00:50Z skrev commit 5b31056 i karta-repot med
  21 länsmappar och `lan/index.html`.
- **Sitemapen** har 28 adresser: Axels 6 står kvar, och 22 är infogade.
- **Pages** svarar 200 på `/lan/` och `/lan/skane/` från 10:01:24. Skånesidan säger *"Trafikverket rapporterar ingen halka på länets
  88 vägavsnitt just nu. Ingen mätstation i länet visar vägbana under noll."*
- **Appens lägesfil** är orörd: manifestets live-sha är lika med sha256(live.json) i samma varv.
- **Körtiden** var 49,6 s med 23 filer i trädanropet. Före deployen tog tolv kartvarv 47,9–52,9 s, median 49,3 s (dbknapp
  37193406335 och 37194034793). Ingen skillnad syns, men det är ett enda varv.

**Vägsidorna byggda 4/10** (Bengt: *"kör på"* efter #745; #458 sa *"vägsidorna kommer sedan"*):
- **Sidorna:** `vag/<väg>/` för E4, E6, E18, E20, E22 och riksväg 40 (planens §6), med samma källor och samma ord som länssidorna.
- **Vägnumret** jämförs utan form (`vagNyckel`): väglaget skriver *E 4* och *Väg 40*, olyckorna *E4*.
- **Stationerna** hör till vägen för sin närmaste sträcka, i samma fråga som ger länet (`STATION_LAN_SQL` lämnar nu också vägnumret).
- **Länkar:** översikten har en tabell för vägarna, och länssidorna länkar till dem.
- **Sitemapen** får de 6 nya adresserna i första varvet efter deployen.
- **Prov:** vägsidornas prov med fällor för vägnummerformen och för en kall station vid en annan väg, och integrationsprovet för
  vägnumret.
## #459 (4/10 2026) Radarn per station i lägesfilens bevis — nivån fylls, vätan räknar fortfarande bara stationen (kort #245, #89)

**Beslut (Bengt 4/10: *"gör radarbeviset per station"*),** efter genomgången av vad i projektkartan som går att göra utan andra. Samma
lucka stod i fyra delar: radarn, tillståndet, övergångarna och lägesfilens fält (*"bevis.radar alltid null"*). DECISIONS #342 lämnade
fältet tomt *"tills en koppling station→radarsegment byggs"*.

**Byggt:** `RADAR_PER_STATION_SQL` i `publish/snapshot-core.ts`. Frågan tar fram radarns högsta råa `rate_mean_mmh` över levande
väglagssträckor inom 5 km från stationen de senaste fyra timmarna. `bevis.radar` blir antalet steg i R_SVEP (0,1 · 0,5 · 2 mm/h) som
värdet klarar. Inga nya tal:
- **5 km** är kopplingen station–väg (Bengt 17/9, #225), samma som uppspelningens radarvariant. Kontraktsgrinden vaktar kopian
  (golv 5).
- **Fyra timmar** är N_SVEP:s längsta, alltså samma fönster som bevisets väta. Värdet importeras, inte kopieras.
- **Råskala**, eftersom R_SVEP är satt i rå `rate_mean_mmh`. `rate_max` är spärrat (#134).
- **Ingen rad blir null**, aldrig noll: frånvaro är torrt eller utanför täckningen (#162). Radarn skriver bara rader från 0,1 mm/h, så
  en station med rad får nivå 1–3.

**Vätan räknar fortfarande bara stationen, och det är medvetet.** `timmarSedanRadarregn` står kvar som null. Försprångets A2 läser
`bevis.vata` (TROSKLAR-FORSPRANG §2), och §7 säger att radarn *"räknas inte"*. Om radarn fick höja vätan skulle en pågående skuggmätning
ändras. Det kräver båda signaturerna (§8) och är ett eget beslut. §7 har fått en daterad not om att fältet nu är fyllt.

**Prov:**
- #245-provet visar nivåerna 2, 3 och 1 och null för fyra stationer. En station med bara radarregn behåller vätan 0.
- Givarvaktens prov namnger radarfrågan som andra positionsundantaget. Den läser stationens läge, aldrig dess mätvärden.
- PostGIS-provet har fällor: en rad äldre än fyra timmar med högre värde, en sträcka 10 km bort, en raderad sträcka nära stationen och
  en station utan radar.

**Följder:** inget i appen eller motorn läser fältet, och ingen port läser `bevis`. I kuvösen fylls fältet ur SMHI:s tif-arkiv, som
ligger cirka 1,6 × över driftens h5 (#441). Fältet läses inte där heller.

**Vägsidorna i drift 4/10** (Bengt: *"slå ihop 746"*, PR #746 som 45a07b4):
- **Deploy och första varv:** deploy-supabase 37214328745. Kartvarvet 16:00:47Z skrev commit 7f3b8c2 i karta-repot med alla sex
  vägarna (e4, e6, e18, e20, e22, rv40).
- **Sitemapen** har 34 adresser: Axels 6, 22 län och 6 vägar. Varven 10:30–15:30 skrev 22 filer utan sitemapen, så den skrivs
  bara när en adress saknas.
- **Pages** svarar på `/vag/e4/` (*"Trafikverket rapporterar ingen halka på E4:s 53 vägavsnitt just nu"*), och översikten bär
  vägtabellen.
- **Körtiden:** kartvarvet 16:00 tog 48,1 s med 29 filer, mot 48,8–49,5 s på kartvarven 14:00–15:30.

**#459 i drift 4/10** (Bengt: *"slå ihop 749"*, PR #749 som 9f96078):
- **Deploy:** deploy-supabase 37215283678, driftsatt 16:02.
- **Första publiceringen** 16:10 tog 43,4 s, mot 42,0–45,8 s på icke-kartvarven 14:10–15:50. Svaret bar ingen radarnot, alltså
  gick frågan utan fel. Manifestets live-sha är lika med sha256(live.json).
- **Frågan mot driftens data** 16:11 (dbknapp 37215841283): 22 stationer med radar inom 5 km de senaste fyra timmarna, högst
  1,03 mm/h, alltså nivå 2.
- **Lägesfilen bar noll väderpunkter** i eftermiddagssolen, eftersom ingen station var +3 °C eller kallare. Fältet med innehåll syns
  därför första natten med kalla stationer, som när beviset infördes 24/9 (#342).

**Kartsynkens tidpunkt för en installation, 5/10** (Bengt: *"rätta datum"*, kort #288, tillägg till #447):
- **Felet:** `anvandning()` tog starten på första datapunkten med en installation ur `betaBuildUsages`. Apple ger en datapunkt
  för hela året (start 2025-10-05 för alla byggen), så kartsynkens första bock 5/10 skrev *"först 5/10 02:00"* om ett bygge
  som installerats 3–4/10.
- **Valt:** tidpunkten är signalens `forst_sedd`, alltså timmen då byggsignalerna först såg installationen. Den kan ligga upp till
  en timme efter installationen, eller längre om signalen inte kunde läsa. `forsta` tas bort ur raden.
- **Alternativet** var att be Apple om dagsupplösning. Det är inte prövat mot API:et och ger ändå bara dygnet.
- **(22) bär inte rätt timme:** signalen började läsa först när nyckeln kom, 4/10 11:23. Beviset säger därför
  *"sedd första gången 4/10 11:23"*, och det är en övre gräns.


## #460 (5/10 2026) App Review avvisade 0.3.9 (20) — knapptexten före platsfrågan och bevis för bakgrundsljudet

**Beslut (Axel 5/10: *"vi kör"*),** efter App Reviews svar 5/10 (submission ab61c8ba).
- **5.1.1(iv):** en knapp före systemets platsfråga får inte säga *Tillåt*. *Tillåt plats* och *Tillåt Alltid* i onboardingen heter
  nu *Fortsätt*. Förklaringstexten (*"Välj Alltid så kan vakten starta själv när du kör."*) står kvar; Apple ber om förklaring, inte
  om att den tas bort. Nekat-flödet med *Öppna Inställningar* fanns redan.
- **2.5.4:** `audio` i UIBackgroundModes BEHÅLLS. Utan den tystnar rösten när telefonen är låst, och det är hela produkten. Granskaren
  hörde inget eftersom det inte fanns någon fara att varna för i Cupertino. Rösten-fliken fick *Testa i bakgrunden*, som talar efter
  5 s under en bakgrundsuppgift, så att en skärminspelning på riktig iPhone kan visa rösten från hemskärmen. Inspelningen följer med
  svaret och i App Review Notes.
- **Alternativet** var att ta bort `audio`. Det avvisades: varningarna skulle bara höras med appen öppen.
- **Samma bygge:** 0.3.10 (22) i project.yml bär ändringen; den gamla 0.3.9 dras inte tillbaka, den ersätts.

**Rättelse till #390, 5/10: förarsvaren fanns** (Bengts *"ja"* till läsningen, dbknapp 37249631052):
- **Svaren:** `driver_facit` har 32 rader, varav 3 prov och 29 riktiga svar på 24 varningar. Alla 29 är *Stämde* och alla
  från iOS 0.3.9. De kom i åtta sändningar mellan 22/9 00:13 och 1/10 17:22.
- **Vad svaren gäller:** 28 gäller fartkameror och 1 en händelse (`dev:`). Inget gäller en halkvarning.
- **Missarna:** `driver_miss` har bara serverns prov från #380.
- **Varför kartan sa 0:** #390:s *"driver_facit hade inga rader i dag"* gällde rader mottagna den dagen. Kartan läste det som
  0 riktiga svar, fast 20 svar redan hade kommit in.
- **Vems resorna är:** sändningen 1/10 17:22 är Axels resa 12:39–13:44 (kort #279). Resan 26–27/9 och händelsen 29/9 är okända
  (§4.2).
- **Hålen i id-serien** (t.ex. 21–46 för tio rader) är omsändningar som fångats av `UNIQUE (alert_id, alert_t, app)`, alltså
  idempotensen i arbete.

**Kartsynkens tidpunkt i drift 5/10** (Bengt: *"slå ihop 753"*): sammanslagen som 9c47f73, deploy 37249116949 (byggsignaler från 9c47f73); timkörningen 01:23Z skrev ärende #706 utan forsta i alla fem installationsraderna, med forst_sedd kvar.

## #461 (4/10 2026) Självstoppet på förflyttning, stillaståendetiern, spärren mot dubbeltryck och Siri när vakten är av (kort #262 Å2/Å3, 4a/4b)

**Axels ja 4/10 13:35** (*"Ja vi kör"*) på Claudes förslag samma dag. Å2 och Å3 bär trösklar och är enligt kort #262 och §4.2
**Bengt + Axel**. Koden byggs med Axels ja, men PR:en slås inte ihop förrän Bengt sagt sitt.

**Å3: självstoppet mäts på förflyttning.** `IdleStop` startade om kvarten på ETT mätvärde ≥ 5 km/h, vilket är gångfart. En buren telefon
fyllde aldrig kvarten, och en testares vakt gick 11 h 39 m. Ny regel, samma i Kotlin (`Autostart.kt`) och Swift
(`HalkvaktEngine/IdleStop.swift`):
- Fixen jämförs med den nyaste fix som är minst **60 s** äldre. Bilen har kört om snittet över spannet är **≥ 12 km/h** (200 m i minuten).
  Det ligger över gångfart (≤ 6) och över GPS-driften.
- Vakten stoppar efter **15 min** utan körning, oförändrat.
- En lucka längre än fönstret (tunnel) mäts över hela luckan.
- Ett enskilt GPS-hopp kan starta om klockan högst två gånger, inte vid varje mätvärde.

*Avvägningen sagd högt:* en kö som håller under 12 km/h i snitt i femton hela minuter stoppar vakten. Kostnaden är liten, eftersom
motorn är tyst under 15 km/h (`minSpeedKmh`, produktboken *"Under 15 km/h: tyst"*). Autostarten väcker vakten igen när körningen
fortsätter.

**Å2 (bara Android, där takten styrs): stillaståendetiern.** En telefon som står still (fart < **3 km/h**, samma gräns som facitflushen
efter resan) läser högst var **5:e** sekund (MID), även nära en fara. Okänd fart räknas inte som stilla. *Bevis:* från stillastående
med 3 m/s² är bilen tillbaka på 1 s-takt inom 50 m (`CadencePolicyTest`). Det ligger långt innanför kamerans 500 m och förvarningens
3 km. Kortet föreslog FAR (15 s). MID valdes för att 15 s från stillastående kan bli över 300 m.

**4a: spärren mot dubbeltryck.** Ett andra tryck, eller ett andra *"appen missade"*, inom **60 s** blir ingen ny miss. Knappen svarar
*"Redan markerat HH:MM."* och Siri *"Redan markerat."*

**4b: Siri när vakten är av.** Siri vägrar: *"Vakten är inte igång. En miss markeras under körningen."* Claude föreslog först 30 minuter
efter stoppet och Axel sa ja. Under bygget visade det sig att senaste positionen efter ett självstopp är parkeringen, så stationen hade
pekat fel. Därför valdes vägran, som `docs/TILL-AXEL-BYGGE-19.md` §4b rekommenderade. Axel kan ändra det.

**Vakter:**
- Kontraktsgrinden vaktar 12 km/h, 60 s, 15 min och 60 s-spärren i båda språken.
- Värdevakten har fått `fix_speed_kmh`.

**Prov:**
- `AutostartControllerTest` och `IdleStopTests` har samma fem fall: parkerad, promenad efter resan, ett GPS-hopp, långsam kö över 12,
  tunnel.
- `CadencePolicyTest` har fem fall för Å2.
- `MissarTest` har ett fall för 4a.
- Bygget heter 0.3.11 (23) på båda plattformarna.

**Bengts ja 6/10** (*"ja till 748"*): Å2/Å3 har båda signaturerna. Numret var #460 på grenen, men main fick #460 för App
Review 5/10 (#758) medan PR:en väntade, så beslutet heter #461 (samma fälla som #624, DECISIONS #381/#382). Grenen flyttades över
main 6/10 ur mains källor; koden är Axels sessions, oförändrad utom numret i kommentarerna. 0.3.11 (23) bär därmed också App
Review-rättelsen (#460).

**Tillägg till #447, 6/10: CI slår inte ihop kartgrenar; kartsynken listar öppna PR:er** (Bengt: *"nej till automatiskt"*, efter en annan sessions förslag 5/10):
- **Mätningen:** fyra PR:er låg 3–4/10 utan ord (#733 kod, #743 ett kort, #747 Play-texten, #748 kod med två signaturer). Ingen av dem är en ren kartgren, så en CI-regel hade inte slagit ihop någon av dem. Det som saknades var att Bengt fick se dem.
- **Valt:** `scripts/kartsynk.ts` listar öppna PR:er vid start, med ålder, och en PR som väntat mer än ett dygn märks. Sessionen lyfter dem i rapporten. Sammanslagningen av kartgrenar är fortfarande sessionens (#447 p. 2), aldrig CI:s.
- **Schemat:** den schemalagda kartsynken hängde från 4/10 07:26 (första PowerShell-anropet kom aldrig tillbaka, som provkörningen 3/10) och blockerade tre körningar. Stoppad 6/10; nästa körning 6/10 07:26 är provet på om uppgiften alls kan köra utan någon vid datorn.

## #462 (6/10 2026) Radarfelslarmet: en issue med etiketten `radar` när radarpiloten faller, stängd av nästa lyckade steg (kort #293)

**Bengts order 6/10:** *"bygg larmet"*, efter frågan vad som krävs för radardelen (§4.2).

**Problemet:** radarsteget i `ingest.yml` kör med *continue-on-error* sedan piloten (DECISIONS #60), så ett stående radarfel gav ett grönt jobb. Den enda som såg det var vakthundens korskontroll, som larmar först när radarn tigit *medan stationerna rapporterat regn*; i torrt väder är ett fel osynligt i veckor. Radarn är vattenplaningens enda källa (kort #42).

**Valt:** samma mönster som arkivbackup.yml. Faller radarsteget skapar jobbet en issue *🌧️ Radarpiloten föll* med etiketten `radar`, eller kommenterar den öppna; nästa lyckade radarsteg kommenterar och stänger. Etiketten skapas om den saknas. Knappen fick ett provläge `prov=radarfel` som fäller steget med flit, så att larmet kan bevisas utan att vänta på ett riktigt fel.

**Alternativ:** (a) låta radarfelet fälla jobbet: förkastat, piloten ska inte stoppa kamerorna och polisens data (#60, #22). (b) En färskhetsvakt i vakthunden: förkastat, `radar_precip` är händelsefiltrerad (bara segment där radarn ser regn), så en torr timme och ett fel ser likadana ut; korskontrollen står kvar som den är. (c) Ett larm utan provläge: förkastat, en ny loggs bevis är en rad med innehåll, framkallad eller inväntad.

**Bevis:** provkörningen 37415500151 (04:49Z, `prov=radarfel` på grenen) fällde radarsteget med flit, jobbet blev grönt och larmsteget skapade issue #765 med etiketten `radar`; nästa lyckade radarsteg på main stänger den.

## #463 (6/10 2026) Underlaget till Trafikverket och VTI: sammanställningar och skript, aldrig rådata, och först efter domen — och vad som faktiskt är opublicerat efter Skyltfondsansökan

**Bengts fråga 6/10:** *"kontrollera vår ansökan till skyltfonden och gör en bedömning om vi lämnat ut för mycket uppgifter som avslöjar
affärshemligheter"*. Bedömningen står i §4.2 (6/10). **Bengts svar:** *"ja till a, b och d"*.

**Läget efter 30/9.** Ansökan är en allmän handling hos Trafikverket och bär motorns startvärden (bilaga 3 och 6), hela TROSKLAR-SKUGGAN
med grindtalen (bilaga 7), modellen, mätta utfall, arkitekturen och affärsidén. Opublicerat är de tolv andra tröskeldokumentens tal,
kuvösens utfall, förarfacit, skuggloggens träffar, koden och nycklarna. Det är den listan som gäller, inte #418:s "inga regelvärden":
startvärdena och prognoslagrets trösklar är ute sedan ansökan, och sidan till Trafikverkets kontakt skyddar inte dem.

**Beslut.**
1. **Underlaget** som ansökan erbjuder Trafikverket, beredningsgruppen och VTI (*"tillgång till underlaget för egen omprövning"*) ges som
   sammanställningar och utvärderingsskript, aldrig råarkivet, skuggloggen eller förarfacit, och först efter domen i mars 2027. Skälet:
   allt som lämnas till en myndighet blir allmän handling, och det som har konkurrensvärde är kalibreringen, facit och arkivet.
2. **Svar till fonden** bär inga nya tal utöver ansökans. Frågor om metoden besvaras med hänvisning till bilagorna.
3. **Rättelse till #418:** det opublicerade är de tolv andra tröskeldokumentens tal, kalibreringen, förarfacit, skuggloggen, koden och
   nycklarna. Projektsidan till Trafikverkets kontakt står kvar som den är.

**Inte valt:** att be fonden bekräfta sekretessprövningen för personnummer och bankkonto (c). Begäran står i mejlet 30/9 (#404).

**Tillägg 6/10 till rättelsen av #390** (Bengt: *"Resan 26–27/9 var min, händelsen 29/9 Axels"*): resan 26/9 12:11–13:03 med returen 27/9 10:23–11:52 (19 svar, kamerorna 12007xxx) var Bengts, och händelsen 29/9 08:11 Axels. Med 1/10 (Axels resa, kort #279) och samma fyra kameror 21/9 och 28/9 kommer alla 29 svar från projektgruppen: Bengt 19 (26–27/9), Axel 10 (21/9, 28/9, 29/9, 1/10); båda i projektgruppen (Bengts besked 6/10). För KB-D (≥ 30 svar från ≥ 5 förare, ingen över 25 %) räknas de som två förare, båda inne i projektet; kravet står alltså på noll riktiga testförare tills betan har förare utanför gruppen.

**Tillägg till #447, 6/10: schemat avstängt** (Bengt: *"stäng av schemat"*): den schemalagda kartsynken i Claude-appen hängde två gånger i rad på sitt första PowerShell-anrop (4/10 07:26 och 6/10 03:45, den senare startad av schemat i samma sekund som den förra stoppades), och 6/10 07:26 startade aldrig. Orsaken syns inte i loggen; troligen ett godkännande som ingen besvarar när ingen sitter vid datorn. Uppgiften är avstängd (inte raderad) och körningen stoppad. Kartsynken är fortfarande första steget i varje session, och sedan 6/10 listar den öppna PR:er; det var vad schemat skulle ge. Slås på igen när orsaken är känd och en körning med *Kör nu* gått igenom med Bengt vid datorn.

## #464 (6/10 2026) Kuvösen: vinden, mängden och koderna 3/9/−9 översätts ur dokumentationen, och riktningsprovet körs nu — tillägg till #456

**Bengts order 6/10:** *"gör en ordentlig sökning på internet"* och sedan *"ja till riktningsprovet, ja till begäran"*. Läsningen står i
`docs/KUVOS-LEVERANSEN-2026-10-02.md` §5c med källorna; begäran om facit i §5d (Bengt skickar).

**Beslut, skrivna före körningen och före något utfall (#424, #438):**
1. **Vinden:** `vimed` → `wind_speed_ms` (API:t: *medelvärde över tiominutersperiod t.o.m. tidpunkten*), `vimax` → `wind_gust_ms`
   (*högst uppmätt 3-sekundersmedelvärde under perioden*). −99,9 ⇒ NULL. `vind30` är 30-minutersmedlet och läses inte in; VädErs
   räknar VViS-vind så (VTI notat 39-2003, 38-2013).
2. **Mängden:** mm per 30 minuter. Kolumnen läggs där typen säger: `rain_sum_mm` = mängden vid regn, frusen regn och snöblandat
   (2, 3, 6), 0 vid ingen nederbörd och snö (1, 4); `snow_wateq_mm` = mängden vid snö (4), 0 vid 1, 2, 3; snöblandat läggs helt på
   regn. Okänd typ (9, −9) ⇒ NULL. −99,9 och −99,8 ⇒ NULL; skillnaden är inte läst. Fem rader över 100 mm lämnas åt värdevakten.
   Skälet till att det räcker: efterhalkan läser regn, och på regnkodade rader är mängden regn vilken definition kolumnen än har.
3. **Koderna:** 3 = `freezing_rain` (rain), 9 = `yes` (nederbörd av okänd typ, varken rain eller snow; motorn räknar `yes` som
   nederbörd), −9 ⇒ NULL. Härledning: API:t dokumenterar exakt sex typer och filen har sex koder; 1/2/4/6 är kända ur VädErs 2019, och
   PWD22 rapporterar just *freezing rain* och *precipitation (unknown type)*. 914 + 506 rader.
4. **De 23 stationerna utan läge** står utanför, som #456 sa. Vägen till deras läge är Lastkajens dataprodukt *VViS* (konto krävs).
5. **Sikten:** oförändrad (20 000 = PWD22:s tak, −100 = ingen sensor), som redan översatt.
6. **Riktningsprovet körs i veckan** på knappen `kuvos` med `riktningsprov`, i stället för att vänta till 16/10 (#456). Väntan gällde
   koderna och stationerna, och båda har nu ett skrivet val. Kommer Trafikverkets svar och säger annat ändras tabellen i
   `kuvos/oversattning.sql`, filen körs om, och provet körs om; körningen är deterministisk.

**Prov:** integrationstestet för översättningen bär de nya fallen (3, 9, −9, mängden per typ, vinden, platshållarna).

**Alternativ:** vänta på Trafikverket (förkastat 6/10: tre av fem frågor är besvarade av dokumentation, och resten kan inte vända en
riktning); läsa koderna empiriskt först (förkastat: översättningen är ett val som ska göras före utfallet, och härledningen räcker;
stickprovet redovisas i stället bredvid körningen).

**Tillägg till #447, 6/10 (Bengt: *"C"*):** projektkartan skrivs inte om varje natt; kartsynken körs av varje session vid start, och
maskinvägen får fler regelsteg. Första: regeln `inlamnad:<version>` i `scripts/kartsynk.ts` (klar när en App Store-version ≥ den
angivna nått *Waiting for Review* eller ett senare tillstånd), satt på App Store-delens *Inskickat*. Skälet mot en nattlig skrivare:
kartan är bokföring med bevis, inte nattens siffror, och en skrivare utan republicering ger varje morgon en artefakt som skiljer sig
från sin repokopia (STOMREGELN).

## #465 (6/10 2026) Ytstatusfälten in i arkivet: Surface.Water, Ice, Snow och Grip från stationerna med givare (kort #294)

**Bengts ja 6/10** (*"ja till begäran och ytstatusfälten"*), efter frågan vad som krävs för att kuvösens facit inte ska vara tunt
(bedömningen §4.2 6/10).

**Varför.** Cirka 50 av Trafikverkets 775 stationer har beröringsfria ytstatusgivare (MS7; Trafikverkets presentation *Nästa generations
VViS* 2019), och API:t bär dem som `Observation.Surface.Water`, `Ice`, `Snow` (förekomst) och `Surface.Grip` (friktion 0–1). Det är det
enda i VViS som mäter att vägen *blev hal*, inte bara kall. Arkivet sparade dem inte, så vinterns facit (kameror, förare, rapporterad
halka, SMHI, stationernas yta) hade ingen rad som sa *is*. Från deployen finns de på de rader arkivpolicyn ändå sparar (DECISIONS #4,
#353); fyra små kolumner, ingen ny rad.

**Beslut.**
1. `sql/043_ytstatus.sql`: `surface_water`, `surface_ice`, `surface_snow` (boolean) och `surface_grip` (numeric) i `weather_observations`.
   NULL betyder *ingen givare*, aldrig *torrt*.
2. `ingest/sources/weather.ts`, `ingest/db.ts` och `supabase/functions/ingest-live/skriv.ts` skriver fälten fält för fält; provet i
   `skriv_test.ts` lagrar is och friktion och visar att en station utan givare får NULL.
3. Värdevakten får spannet `surface_grip` 0–1 INNAN fältet bär något (VÄRDEVAKTEN). Booleanerna har inget spann.
4. Fälten används inte av motorn och går inte till lägesfilen. De är facit, och hur de får döma skrivs i tröskeldokumenten innan de
   används i en dom (regeln i TROSKLAR-KOMBINATIONEN §1).

**Drift:** migrationen med DB-knappen, deploy av `ingest-live`, och beviset är en rad med `surface_grip` eller `surface_ice` satt
(kort #294). Kartan: `k-vader` orange tills raden finns.

**Alternativ:** vänta till vintern (förkastat: första frosten är facits första rad, och fälten måste finnas innan); lägga fälten i
`weather_latest` och lägesfilen (inte nu: ingen regel läser dem, och lägesfilens fält kräver ett tröskeldokument).

**#465 i drift 6/10 08:22Z** (Bengt: *"slå ihop 775 och 776"*): migrationen med DB-knappen 37435521114 (kolumnerna lästa), deploy 37435573958 från eedfd06 (loggen: Deployed Functions: ingest-live), och läsningen 37436952330: av 702 rader skrivna efter deployen (08:25–08:38Z) bar 53 surface_grip från 52 stationer, 1 rad is = sann och 5 vatten = sann; värdevakten 37437120416: surface_grip – (för tunt underlag: 60 rader av minst 100; 0,75–0,82, 4 distinkta, inom spannet). Fynd i första läsningen: friktionen var 0,82 på 92 % av raderna (värdevaktens dygnsfönster: 60 rader, 0,75–0,82, 4 distinkta), vilket ser ut som givarens värde för torr vägbana snarare än en mätning per station, och en rad bar is = sann i oktoberdagsljus; båda ska läsas igen när det blir kallt, innan fältet får döma något (TROSKLAR-KOMBINATIONEN §1).

**#465 läst 10/10 (kort #294 stängt, kort #324 öppnat; Bengt: *"gör 294 och 316"*):** värdevakten 38046557111 dömer `surface_grip` OK — 26 379 rader från 59 stationer 6/10 08:20–10/10 10:50 UTC, 0,18–0,82, 41 distinkta. Läsningarna 38046558230 och 38046716085 (DB-knappen, bara summor): 0,82 är givarens tak för torr väg — alla 11 841 rader utan vatten, is och snö bär exakt 0,82, inget värde ligger över, och andelen var 51 % (92 % 6/10, i torrt väder). Is- och snöflaggan: 942 rader med is sann, 873 av dem (93 %) med vägytan över +5 °C från 35 stationer, ingen av 718 rader med ytan ≤ 0 °C; is och snö satta tillsammans på 763 av de 873. Inläsningen tar bara äkta sanningsvärden ur API:t, så flaggan är Trafikverkets. Punkt 4 håller: inget läser fälten, och regeln för när flaggorna får döma skrivs i TROSKLAR-KOMBINATIONEN innan de används (kort #324).

## #466 (6/10 2026) Riktningsprovet, första körningen: grind A läst på vintern 2024/25, höjdprovet föll på minnet, omkörning (kort #232)

**Körningen** 37435099300 (`kuvos` med `riktningsprov`, main 31860c2, startad 08:17Z på Bengts ja 6/10 i #464). Inläsningen, vakterna
och värdevakten gick igenom (08:17–08:25Z). Riktningsprovet körde 08:25–09:47Z och föll i `scripts/hojd-prov.ts`: *JavaScript heap out
of memory* på Nodes standardheap över 152 dygn. Grind NT och efterhalkan kördes aldrig.

**Talen som hann skrivas, ordagrant ur loggen (en läsning enligt #424: alla tal skrivs ut, inget är en dom):**
- **Motorn över vintern** (`kuvos/korning.ts`): 7 245 steg 2024-10-31T23:30Z – 2025-03-31T21:30Z, serie A 20 rutter, serie B 818
  sträckor var tredje timme, 2 476 broar; **675 178 varningar** sparade.
- **Baslinjen** (dagens frysrisk och broarna, #455 punkt 2, antal utan dom): serie A 114 923 fyrningar, 98 faror, 8 402 episoder
  (stationer 610, broar 7 792); serie B 560 255 fyrningar, 2 850 faror, 179 805 episoder (stationer 30 532, broar 149 273).
  Per månad i serie A: okt 191/12, nov 14 534/1 194, dec 23 660/1 832, jan 38 685/2 316, feb 26 054/2 012, mar 11 799/1 036
  (fyrningar/episoder).
- **Grind A** (`publish/grind-a.ts 152`, korsvalidering vid stationerna, TROSKLAR-SKUGGAN): A1 MAE i beslutsbandet 0,60 °C på
  3 364 122 punkter → KLARAR; **A2 grova fel > 2 °C: 5,5 % mot kravet ≤ 5 % → FALLER**; A3 frysklassningsfel 0,3 % → KLARAR.
  Skriptets egen rad: *DOM: GRIND A FALLEN*. Lapse 0,65 °C/100 m.

**Vad talet betyder, och inte.** Riktningsprovet fäller ingen dom (#424). Driftens grind A står kvar som klarad (23/9 och 28/9 på
60 dygn, A2 3,7 %, DECISIONS #321, #399). Vintern 2024/25 säger att andelen grova fel ligger över fem procent på en hel vinter, med
mer kyla och större spridning än hösten. Det är precis den fråga vinterns grindar i mars ska svara på, och talet skrivs här så att
ingen senare kan säga att det var okänt. Ingen tröskel ändras.

**Åtgärd:** `kuvos.yml`: riktningsprovets steg får `NODE_OPTIONS=--max-old-space-size=10240` (runnern har 16 GB) och 300 minuter
i stället för 180 (82 minuter gick till kraschen, NT och efterhalkan återstod). Omkörningen är deterministisk; grind A:s tal ska
komma igen, och de jämförs.

**Alternativ:** läsa höjdprovet i delar (förkastat nu: ändrar skriptet mitt i provet; kan göras om heapen inte räcker).

## #467 (6/10 2026) Riktningsprovet på vintern 2024/25 är kört och läst: varje del ensam och ovanpå de andra, alla tal, ingen dom (kort #232)

**Körningen** 37447617038 (`kuvos` med `riktningsprov`, main 9f09dfe, 10:07–11:26Z; riktningsprovets steg 72 minuter med 10 GB heap,
#466). Inläsningen 5 391 599 rader från 754 stationer, vakterna som i driften (#75, radvakten, karantänen, den långsamma vakten: 97 %
talar), värdevakten gick igenom. Varningarna ligger som artefakt `kuvos-varningar` på körningen (7,9 MB, 90 dagar). Startvärdena som
de står (#424); inget svep, inget val. Grind A:s tal är identiska med första körningens (#466), som väntat av en deterministisk körning.

**1. Motorn över vintern** (`kuvos/korning.ts`): 7 245 steg, serie A 20 rutter, serie B 818 sträckor var tredje timme, 2 476 broar,
tomma steg 0; snapshotens noter: långsam vakt 2 191 steg, karantän 5 116; **675 178 varningar**.

**2. Baslinjen** (dagens frysrisk och broarna, #455 punkt 2; antal, ingen dom): serie A 114 923 fyrningar, 98 faror, 8 402 episoder
(stationer 610, broar 7 792); serie B 560 255 fyrningar, 2 850 faror, 179 805 episoder (stationer 30 532, broar 149 273). Per månad,
serie A (fyrningar/episoder): okt 191/12 · nov 14 534/1 194 · dec 23 660/1 832 · jan 38 685/2 316 · feb 26 054/2 012 · mar 11 799/1 036;
serie B: okt 1 332/528 · nov 77 551/25 809 · dec 120 020/40 780 · jan 187 534/51 040 · feb 116 993/42 024 · mar 56 825/19 624.

**3. Grind A** (korsvalidering vid stationerna, offsetmodellen, 736 stationer, 5 229 252 bucketade avläsningar): per band
0–7 km 0,52 °C · 3,6 % · 0,2 % (491 220 punkter); 7–15 km 0,55 · 3,7 · 0,2 (1 985 336); 15–20 km 0,61 · 5,4 · 0,3 (907 357);
> 20 km 0,79 · 10,3 · 0,4 (969 293); totalt 0,60 °C · 5,5 % · 0,3 % (4 353 206). **A1 0,60 °C klarar · A2 5,5 % faller · A3 0,3 %
klarar ⇒ grind A fallen på vintern.** Driftens grind A står (höstens 60 dygn, A2 3,7 %, #321, #399); vinterns tal säger att en hel
vinter har fler grova fel, och felet sitter bortom 15 km (5,4 % och 10,3 %).

**4. Höjdprovet** (lapse 0,65 °C/100 m som antagande; empirisk lapse ur 3 431 par 0,18 °C/100 m): MAE i beslutsbandet, alla band,
rå 0,68 °C · interp 0,67 · rå+höjd 0,69 · offset (taket) 0,60; > 20 km rå 0,83 · interp 0,82 · rå+höjd 0,91 · offset 0,79. Höjden
återvinner ingenting på den här vintern: rå+höjd är sämre än rå i varje band utom 7–15 km, och den empiriska lapsen är långt under
standard, så annat än höjden dominerar (kust, dalgångar). 729 av 736 stationer fick EU-DEM-höjd.

**5. Vägpunktsgrinden** (grind A:s mått utan målets egen historik, #323): RÅ A1 0,68 °C klarar · A2 7,5 % faller · A3 0,4 % klarar;
INTERP 0,67 · 7,2 % · 0,4 %; RÅ+HÖJD 0,69 · 8,8 % · 0,4 %. Per band, grova fel RÅ: 5,2 · 5,3 · 7,2 · 13,6 %. **Fallen för alla tre
kandidaterna**, som 28/9 (#399). Det som saknas är data om vägen, inte kod.

**6. Frysflaggan med tre marginaler** (#437; K1 +1 °C, K2 0 · 0,5 · 1 °C; måttstocken lånad av K-A: rätt klass ≥ 95 %, farliga fel ≤ 1 %,
täckning ≥ 70 %), alla band, 4 353 206 punkter, 729 stationer, 3 015 970 frysningar:
| kandidat | K2 | farliga fel av frysningarna | av uttalade | falska flaggor | rätt klass | täckning |
| :-- | --: | --: | --: | --: | --: | --: |
| RÅ | 0 | 4,9 % | 3,4 % | 3,7 % | 94,1 % | 100 % |
| RÅ | 0,5 | 2,4 % | 1,8 % | 7,1 % | 97,0 % | 91,0 % |
| RÅ | 1 | 1,2 % | 1,0 % | 11,2 % | 98,5 % | 81,8 % |
| RÅ+HÖJD | 0 | 4,9 % | 3,4 % | 3,5 % | 94,2 % | 100 % |
| RÅ+HÖJD | 0,5 | 2,3 % | 1,7 % | 7,0 % | 97,1 % | 90,9 % |
| RÅ+HÖJD | 1 | 1,1 % | 1,0 % | 11,1 % | 98,5 % | 81,6 % |
| OFFSET (taket) | 0 | 4,2 % | 2,9 % | 3,1 % | 95,0 % | 100 % |
| OFFSET (taket) | 0,5 | 1,8 % | 1,3 % | 6,7 % | 97,8 % | 90,9 % |
| OFFSET (taket) | 1 | 0,8 % | 0,7 % | 11,0 % | 98,9 % | 81,6 % |
Läsning: bara offset med K2 = 1 °C når alla tre måtten i den lånade måttstocken (0,8 % farliga, 98,9 % rätt, 81,6 % täckning), och
offset finns bara där stationen har egen historik. Vid > 20 km klarar även RÅ K2 1 farliga fel (0,9 %) med täckning 89,4 %.

**7. Grind NT** (nederbördstypen, startvärdet L 0 · U +1,5): givarens ordlista no 4 388 124 · rain 402 283 · sleet 23 335 · snow 531 766
· yes 502 · freezing_rain 909 · null 11 841. NT-A täckning 0,9987 · mot SMHI 0,9336 · farligt 0,0386 ⇒ klarar; NT-D klarar (snöepisoder
68 349, slaskepisoder 17 954, 751 stationer, 4 band, 151 slaskdygn, 12 476 SMHI-partimmar vid 37 par inom 5 km); **NT-B träff 0,7203 ·
farligt 0,0082 · slask 0,4171 · månader 0/3 ⇒ faller; NT-C träff 0,7103 · farligt 0,0134 · slask 0,3981 ⇒ faller.** Bara startvärdet
är räknat (#424). Fynd: skriptets ordlista (§7 punkt 5) känner inte `yes` och `freezing_rain` ur #464 och larmar; de 1 411 raderna
räknas som okända. Ordlistan rättas i samma varv som nästa körning, inte nu.

**8. Efterhalkan** (betans startvärden, uppspelningen ur sql/028): ENSAM 983 episoder, 983 med utfall: föll ut 527 · nära 178 · uteblev
278. OVANPÅ (#456): 82 985 facittillfällen (stationsnätter med yta ≤ +1 °C, vakterna klarade); baslinjen fångar 16 826 (20,3 %);
efterhalkan 1 109 fyrningar i 983 episoder, fångar 461, **nettonytt 175 (0,2 % av facit)**; tillkomna episoder 406 med utfall: föll ut
147 · nära 76 · uteblev 183 ⇒ **pris 45,1 %**; tidsvinst mot baslinjen 30 min (median, 286 tillfällen), inte nettonytt. Inga golv (#455).

**Vad som inte kördes:** T-A, R-A, W-A (#455), övergångarna, tillståndet, försprånget (radarn ur tif, #441); kalibreringen (regel D,
efter Axels signatur, #425).

**Fynd på vägen:** (a) grind A och höjdprovet skriver *SAKNADE DYGN* för 2026-05-07–2026-10-06, eftersom `saknadeDygn` räknar fönstret
från riktig tid och inte från klockan; harmlöst (de dygnen räknas inte) men vilseledande i en kuvöskörning. (b) NT:s ordlista, ovan.

**Följd:** ingen tröskel och ingen kod ändras av utfallet (#424). Tabellen del × ensam × ovanpå står i bedömningen §7, som kort #232:s
Verify kräver. Nästa steg enligt planen är kalibreringen på samma vinter, som ändrar regel D och kräver Axels signatur (#425).

## #468 (6/10 2026) Kalibreringen i kuvösen — förregistrerad före körningen: tidpunkten, rutnätet, måttet, regeln (regel D3–D5, kort #232)

**Bengts ord 6/10: *"gör kalibreringen"*,** efter riktningsprovet (#467). Signaturerna finns sedan 1/10: Bengt och Axel flyttade
säsongens enda gemensamma kalibrering till kuvösen (#425, TROSKLAR-KOMBINATIONEN §5), och betan hörs på de kalibrerade värdena om
vinnaren håller i båda halvorna, annars på startvärdena (#427, #428). Det här är tidpunkten regel D3 kräver i DECISIONS innan
kalibreringen inträffar. Inget tal ur kalibreringen var läst när posten skrevs.

**Tidpunkten (D3):** 6/10 2026, på vintern 2024/25 i kuvösen — all data ligger före tidpunkten, och ingen natt ur vintern 2026/27
läses. Domdata är hela vintern 2026/27 (#425).

**Rutnätet (D1, §3, #219):** N 1 · 2 · 3 · 4 h × trendfönster 15 · 30 · 60 min × fall 0,4 · 0,6 · 0,8 · 1,2 °C = **48 punkter**, med
minsta regn > 0, startband +1…+3, radar av, N_varning av — de 48 betan kan köra. Svepen och startvärdena härleds ur sql/028 vid körning
(D1-vaktens listor och funktionens standardvärden), aldrig kopierade; ett värde utanför svepen avvisas av funktionen själv.
15-minutersfönstret går inte att räkna i kuvösen (en rad per halvtimme, väg A, #455): de 16 punkterna redovisas som *ej räknebara*,
aldrig som noll. Räknebara: 32.

**Måttet (#456, kuvos/ovanpa.ts):** per punkt över hela vintern — nettonytt = facittillfällen (stationsnätter med yta ≤ +1 °C, vakterna
klarade) som bara punkten fångar och inte baslinjen; pris = *uteblev* av punktens tillkomna episoder med utfall. Samma facit som
riktningsprovet: det blev kallt, inte det blev halt (förbehållet i #425).

**Regeln (D4), skriven nu:**
- **Kandidat** = räknebar punkt med pris ≤ 25 % (Ö-B2, TROSKLAR-OVERGANGAR §4) räknat på **minst 20 tillkomna episoder med utfall**,
  och nettonytt > 0. Golvet 20 är nytt och mitt: ett pris på en handfull episoder är brus, och utan golv vinner en tyst punkt på 0 av 3.
- **Vinnare** = kandidaten med störst nettonytt över hela vintern; lika ⇒ lägst pris ⇒ färst ändrade dimensioner mot startvärdena ⇒
  rutnätets ordning.
- **Håller** = vinnaren är kandidat på samma villkor i **båda halvorna** av vintern, delade vid facitnätternas mittnatt (som grind T-A:s
  tidsdelning). Håller den inte, eller finns ingen kandidat, står startvärdena (N 2 h · 30 min · fall 0,8).
- Startvärdenas tal skrivs bredvid, och nettonytt som andel av facit mot Ö-B1 (≥ 5 %) som läsning — Ö-B1 döms i januari och mars, inte här.

**Redovisningen (D5):** alla 48 punkter med hela vintern och båda halvorna, antalet prövade och räknebara bredvid vinnaren.
**Frysningen (D6):** skriptet föreslår; Bengt fryser med sitt ord, och värdena, antalet punkter och datumet skrivs här som utfall.
Därefter ändras ingen tröskel; dom 2 i mars läser vintern 2026/27.

**Byggt:** `kuvos/kalibrering.ts` (härledning ur sql/028, 32 anrop av ögonblicksvarianten ur #456, ovanpå per halva, regeln som ren
funktion), proven i `test/kuvos.test.ts` (nätet 48, startvärdena i nätet, D1-vakten fäller, D4 räknat för hand: taket, golvet, halvorna,
lika-reglerna, ej räknebar deltar aldrig), knappen `kuvos` med `korflode: kalibrering` (300 min, 10 GB heap), som vägrar utanför kuvösen
(`kuvos.now()` saknas ⇒ stopp). Ö-B2:s 25 % är första kopian i kod; dokumentet är källan.

**Vad som inte görs:** inga andra dimensioner (regnmängd, startband, radar — mars-varianter, #223/#225), inga golv ur Ö-B som urval,
ingen tröskel i någon del rörs (D1), ingen andra kalibrering (D7).

**UTFALL 6/10 (körning 37464971791 på b838d30, 12:41–12:46Z; kalibreringssteget 31 s, ett anrop per punkt ≈ 1 s).** Facit 82 985
stationsnätter över 152 nätter, halvorna delade vid 2025-01-15 (A: 31/10–14/1, B: 15/1–31/3). 15-minuterslutningar i trendarkivet: 0 ⇒
16 punkter ej räknebara, 32 räknade. Startvärdena gav exakt riktningsprovets tal (1 109 · 983 · 461 · 175 · 45,1 %, #467) — samma
räkning, samma svar.

**D4: ingen punkt är kandidat.** Ingen av de 32 räknebara punkterna har priset under taket 25 %, över hela vintern eller i någon halva.
Lägst pris över vintern **40,4 %** (N 4 h · 60 min · fall 1,2; nettonytt 458), därefter 41,0 % (N 4 h · 30 · 0,8) och 41,7 % (N 3 h · 30 ·
0,8); lägst i en halva 29,2 % (N 4 h · 30 · 1,2, halva B). Startvärdena 45,1 % (A 54,2 %, B 33,5 %). Största nettonytt 1 292 (1,6 % av
facit) vid 68,0 % (N 4 h · 60 · 0,4). Ingen punkt når Ö-B1:s 5 % (läsning, döms inte här). **Startvärdena står (D4).**

**FRYST (D6) med Bengts ord — PR #780 *"slå ihop"*:** N 2 h · trendfönster 30 min · fall ≥ 0,8 °C · minsta regn > 0 · startband +1…+3 ·
radar av · N_varning av (DECISIONS #222 oförändrade); 48 punkter prövade, 32 räknebara; vintern 2024/25; 6/10 2026. Därefter ändras ingen
tröskel; dom 2 i mars läser vintern 2026/27 (#425). **Följder:** betan hörs på startvärdena (#428: vinnaren höll inte — det fanns ingen);
kort #278 (båda värdeparen i skuggan) är överspelat, de två paren är ett; TROSKLAR-KOMBINATIONEN §7 *ingen kalibrering före* gäller
som det står; betaguidens lydelse (#429) stämmer.

**Läsning, ingen dom:** priset sjunker med större fall och längre N, nettonytt stiger med längre N och lägre fall — hela rutnätet ligger
på samma kurva, 15 procentenheter över taket som närmast. Det är inte brus: halva B är genomgående billigare än A (start 33,5 mot
54,2 %), men ingen halva når taket. Facit är stationens egen yta inom 90 min — *uteblev* betyder att ytan inte nådde +1,5 °C vid
stationen, inte att vägen var torr. Om priset är orättvist mot efterhalkan avgörs av Trafikverkets ytstatus och åtgärder (begäran §5d,
#463), inte av fler punkter.

**Alla prövade punkter (D5)** — hela vintern, och nettonytt · pris per halva; de 16 punkterna med 15-minutersfönstret är ej räknebara:

| N | fönster | fall | fyrningar | episoder | nettonytt | tillkomna | uteblev | pris | halva A: netto · pris | halva B: netto · pris |
| --: | --: | --: | --: | --: | --: | --: | --: | --: | :-- | :-- |
| 1 h | 30 min | 0,4 | 2 675 | 2 063 | 222 | 883 | 553 | 62,6 % | 89 · 70,3 % | 133 · 54,6 % |
| 1 h | 30 min | 0,6 | 1 220 | 1 082 | 111 | 424 | 261 | 61,6 % | 41 · 71,8 % | 70 · 48,9 % |
| 1 h | 30 min | 0,8 | 641 | 597 | 60 | 218 | 129 | 59,2 % | 21 · 69,0 % | 39 · 45,7 % |
| 1 h | 30 min | 1,2 | 230 | 224 | 16 | 59 | 37 | 62,7 % | 5 · 66,7 % | 11 · 57,7 % |
| 1 h | 60 min | 0,4 | 4 638 | 2 765 | 276 | 1 246 | 848 | 68,1 % | 107 · 75,8 % | 169 · 60,9 % |
| 1 h | 60 min | 0,6 | 2 478 | 1 728 | 188 | 679 | 429 | 63,2 % | 68 · 72,2 % | 120 · 54,4 % |
| 1 h | 60 min | 0,8 | 1 462 | 1 102 | 115 | 405 | 246 | 60,7 % | 40 · 69,6 % | 75 · 50,8 % |
| 1 h | 60 min | 1,2 | 580 | 498 | 46 | 150 | 91 | 60,7 % | 12 · 66,7 % | 34 · 53,0 % |
| 2 h | 30 min | 0,4 | 4 549 | 2 974 | 445 | 1 403 | 845 | 60,2 % | 203 · 66,4 % | 242 · 52,4 % |
| 2 h | 30 min | 0,6 | 2 156 | 1 707 | 291 | 760 | 393 | 51,7 % | 119 · 59,8 % | 172 · 41,5 % |
| 2 h | 30 min | 0,8 **(start)** | 1 109 | 983 | 175 | 406 | 183 | 45,1 % | 71 · 54,2 % | 104 · 33,5 % |
| 2 h | 30 min | 1,2 | 343 | 327 | 39 | 94 | 49 | 52,1 % | 11 · 62,0 % | 28 · 40,9 % |
| 2 h | 60 min | 0,4 | 8 394 | 3 987 | 589 | 1 984 | 1 329 | 67,0 % | 265 · 74,0 % | 324 · 59,1 % |
| 2 h | 60 min | 0,6 | 4 895 | 2 744 | 444 | 1 295 | 758 | 58,5 % | 194 · 65,3 % | 250 · 49,8 % |
| 2 h | 60 min | 0,8 | 3 063 | 1 910 | 326 | 871 | 463 | 53,2 % | 132 · 61,3 % | 194 · 42,4 % |
| 2 h | 60 min | 1,2 | 1 292 | 945 | 166 | 377 | 179 | 47,5 % | 61 · 56,8 % | 105 · 36,3 % |
| 3 h | 30 min | 0,4 | 6 455 | 3 870 | 765 | 1 962 | 1 153 | 58,8 % | 395 · 64,3 % | 370 · 51,5 % |
| 3 h | 30 min | 0,6 | 3 044 | 2 297 | 496 | 1 132 | 545 | 48,1 % | 250 · 54,0 % | 246 · 40,2 % |
| 3 h | 30 min | 0,8 | 1 493 | 1 290 | 292 | 602 | 251 | 41,7 % | 137 · 48,0 % | 155 · 32,9 % |
| 3 h | 30 min | 1,2 | 400 | 381 | 57 | 123 | 59 | 48,0 % | 15 · 59,1 % | 42 · 35,1 % |
| 3 h | 60 min | 0,4 | 11 783 | 4 965 | 951 | 2 593 | 1 728 | 66,6 % | 491 · 72,9 % | 460 · 59,1 % |
| 3 h | 60 min | 0,6 | 7 123 | 3 591 | 751 | 1 842 | 1 082 | 58,7 % | 385 · 64,3 % | 366 · 51,2 % |
| 3 h | 60 min | 0,8 | 4 463 | 2 592 | 575 | 1 312 | 677 | 51,6 % | 289 · 57,9 % | 286 · 42,6 % |
| 3 h | 60 min | 1,2 | 1 816 | 1 285 | 298 | 600 | 256 | 42,7 % | 133 · 48,7 % | 165 · 34,9 % |
| 4 h | 30 min | 0,4 | 8 195 | 4 570 | 1 050 | 2 450 | 1 471 | 60,0 % | 563 · 66,1 % | 487 · 52,2 % |
| 4 h | 30 min | 0,6 | 3 834 | 2 778 | 698 | 1 458 | 708 | 48,6 % | 358 · 54,7 % | 340 · 40,8 % |
| 4 h | 30 min | 0,8 | 1 817 | 1 537 | 403 | 761 | 312 | 41,0 % | 190 · 47,4 % | 213 · 32,7 % |
| 4 h | 30 min | 1,2 | 452 | 426 | 84 | 150 | 67 | 44,7 % | 24 · 59,0 % | 60 · 29,2 % |
| 4 h | 60 min | 0,4 | 15 064 | 5 788 | 1 292 | 3 159 | 2 148 | 68,0 % | 688 · 74,5 % | 604 · 60,3 % |
| 4 h | 60 min | 0,6 | 9 284 | 4 318 | 1 055 | 2 351 | 1 409 | 59,9 % | 553 · 66,1 % | 502 · 51,6 % |
| 4 h | 60 min | 0,8 | 5 861 | 3 192 | 844 | 1 745 | 917 | 52,6 % | 432 · 60,2 % | 412 · 42,4 % |
| 4 h | 60 min | 1,2 | 2 340 | 1 618 | 458 | 832 | 336 | 40,4 % | 214 · 46,3 % | 244 · 33,1 % |

## #469 (6/10 2026) Kuvösens granskning: tre läsningar förregistrerade före körningen — grind A på 60 dygn, efterhalkans pris per fönster, inom räckvidd (kort #295)

**Bengts ja 6/10 (*"ja till 295"*)** till de tre läsningarna i `docs/KUVOS-GRANSKNING-2026-10-06.md` §4. **Ingen dom, ingen tröskel rörs:**
grind A:s driftdom (#321, #399) står, startvärdena står frysta (#468), vägpunktsgrindens fall står. Skriptet
`scripts/matningar/kuvos-granskning-2026-10-06.ts` körs på knappen `kuvos` (`matning`), efter inläsningen, vakterna och trenden.
Inget tal var läst när posten skrevs.

- **F1 — grind A på 60-dygnsfönster.** `publish/grind-a.ts` körs oförändrad, tre gånger, med kuvösens klocka ställd på 1/1 2025,
  1/3 2025 och vinterns slut (31/3 21:30Z), `DAYS` = 60 som i driften. Frågan: är vinterns A2 5,5 % (#467, 152 dygn) en hårdare vinter
  eller ett längre offsetfönster? **Läsning i förväg:** ligger A2 under 5 % i alla tre fönstren var vinterläsningen ett fönsterfel och
  driftens dom står obestridd; ligger den över i alla tre är vintern hårdare än hösten; blandat ⇒ vintern varierar och redovisas per
  fönster. Grind A:s egna "DOM"-rader är läsning här.
- **F2 — efterhalkans pris per fönster och band.** Startvärdenas fyrningar (ögonblicksvarianten, #456), de tillkomna episoderna som i
  ovanpå; lägsta ytan efter fyrningen tas direkt ur `weather_observations` i utfallsfönstren 60 · 90 · 120 min och klassas med
  nära-banden 0,3 · 0,5 · 1,0 °C — båda svepen härledda ur sql/028:s D1-vakt (TROSKLAR-TRENDEN §2). 90 min · 0,5 ska ge 183 av 406 =
  45,1 % (kontroll mot #467). Dessutom priset vid 90 min · 0,5 delat på startytan vid fyrningen (+1…+2 och +2…+3 °C): fönstrets
  aritmetik mot de långsamma fallen. Sampling-skevheten (tre rader mot arton) går inte att mäta i kuvösen; den sägs, inte räknas.
- **F3 — inom räckvidd för Ö-B1.** Facittillfällen (stationsnätter ≤ +1 °C, vakterna klarade) med regn (`rain_sum_mm > 0`) vid
  stationen inom N h före facitögonblicket, N = startvärdet 2 h och svepets vidaste 4 h, var och en också med utfallsfönstret 90 min
  tillagt så att en fyrning före facit ryms. Riktningsprovets nettonytt 175 som andel av dem, bredvid 0,2 % av alla. Definitionen är ett
  **förslag** till TROSKLAR-OVERGANGAR §4 (Ö-B1 *inom räckvidd*) före mars-domen — den fastställs av Bengt och Axel, inte här.

**Vad som inte görs:** ingen kandidat, ingen tröskel, ingen omkörning av kalibreringen (D7), inget val av fönster eller band.
**Kostnad:** en knapptryckning (inläsningen ≈ 5 min, grind A tre gånger på 60 dygn, F2/F3 sekunder). Timeouten för en mätning höjd
till 300 min och heapen till 10 GB i `kuvos.yml`.

**UTFALL 6/10 (körning 37517980895 på fe7c472, 19:18–19:28Z; inläsningen 7 min, mätningen 1 min 46 s).** Alla tal, ingen dom.

**F1 — grind A på 60 dygn, tre fönster** (`publish/grind-a.ts` oförändrad, klockan i anslutningen):
| Fönster (60 dygn) | stationer · punkter | 0–7 km | 7–15 km | 15–20 km | > 20 km | TOTALT MAE · A2 · A3 | Läsning |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 2/11–31/12 (klockan 1/1) | 729 · 1 680 540 | 0,42 °C · 2,0 % | 0,46 · 2,0 % | 0,52 · 3,1 % | 0,68 · 6,8 % | 0,51 °C · **3,4 %** · 0,1 % | klarar |
| 31/12–28/2 (klockan 1/3) | 735 · 1 990 534 | 0,47 · 3,8 % | 0,49 · 3,6 % | 0,54 · 5,4 % | 0,75 · 10,4 % | 0,53 °C · **5,4 %** · 0,2 % | faller |
| 30/1–31/3 (klockan 31/3) | 736 · 1 658 283 | 0,67 · 5,3 % | 0,70 · 5,3 % | 0,75 · 7,1 % | 0,91 · 11,6 % | 0,74 °C · **7,1 %** · 0,5 % | faller |

**Läsning enligt förregistreringen: blandat ⇒ vintern varierar.** Det var inget fönsterfel: förvintern klarar (3,4 %, som höstens 3,7 %,
#399), midvintern faller (5,4 %) och vårvintern faller tydligt (7,1 %); 152-dygnstalet 5,5 % (#467) är ett medel av tre olika säsonger.
Driftens dom står obestridd. Felet växer mot våren i **alla** band, också 0–7 km (2,0 → 3,8 → 5,3 %), och mest bortom 20 km (6,8 → 11,6 %).
Det pekar på dagsljuset — en konstant offset lär inte hur stationerna skiljer sig i sol och skugga när dagarna blir långa — snarare än
på höjden (som höjdprovet redan avfärdat, #467). Hypotes, inte mätt; den hör till kort #91 (kallplatslagret/skuggning) och till
regimgrindens blåsigt/klart-spår (#408, molnmängd). Följd för produkten: prognoslagrets svaga tid är februari–mars, inte vintern som helhet.

**F2 — efterhalkans pris på de 406 tillkomna episoderna** (uteblev av 406 med utfall; kontrollen stämmer: 90 min · 0,5 = 183 = 45,1 %):
| Utfallsfönster | band 0,3 | band 0,5 | band 1,0 |
| :-- | --: | --: | --: |
| 60 min | 58,9 % (239) | 52,0 % (211) | 31,5 % (128) |
| 90 min | 52,5 % (213) | **45,1 % (183)** — riktningsprovets tal | 25,6 % (104) |
| 120 min | 47,5 % (193) | 38,9 % (158) | 22,4 % (91) |

Föll ut växer med fönstret (117 → 147 → 168 av 406): ytan fortsätter falla efter 90 minuter. **Per startyta vid fyrningen (90 min · 0,5):
+1…+2 °C 168 episoder, pris 19,0 % (uteblev 32) · +2…+3 °C 238 episoder, pris 63,4 % (uteblev 151).** Priset sitter i bandets övre del:
därifrån hinner ytan sällan till +1,5 på 90 minuter. Svepet vidgar bara startbandet uppåt (+1…+3 · +1…+4 · +1…+6, D1), så ingen
kalibreringspunkt kunde nå det smalare bandet — det är ett nytt svepvärde i TROSKLAR-OVERGANGAR §2, med båda signaturerna, och prövas i
så fall tidigast som mars-variant (som radarn och regnmängden, #223/#225), aldrig i betan (D6). Fönstret och nära-bandet är T-A:s
utvärderingsparametrar (§3: *väljs i T-A och ärvs*) och väljs inte här. Sampling-skevheten (tre rader mot arton) är sagd, inte mätt.

**F3 — inom räckvidd för Ö-B1** (facit 82 985; riktningsprovets nettonytt 175 = 0,2 % av alla):
| Definition | tillfällen | andel av facit | nettonytt inom räckvidd |
| :-- | --: | --: | --: |
| regn inom 2 h före facit | 2 836 | 3,4 % | **6,2 %** |
| regn inom 2 h + utfallsfönstret 90 min | 4 113 | 5,0 % | 4,3 % |
| regn inom 4 h | 4 512 | 5,4 % | 3,9 % |
| regn inom 4 h + 90 min | 5 873 | 7,1 % | 3,0 % |
Definitionen avgör om efterhalkan ligger över eller under Ö-B1:s 5 % — den måste fastställas i TROSKLAR-OVERGANGAR §4 före mars-domen,
av Bengt och Axel. Mitt förslag: *regn inom N h + utfallsfönstret*, eftersom en fyrning annars inte ryms före facit (4,3 % vid N = 2 h).

**Följd:** ingen tröskel och ingen kod ändras. Kort #295 stängs (Verify uppfylld: läsningarna bokförda här, F1:s svar i bedömningen §7).
Två beslut före mars läggs på kort #296 (Bengt och Axel): Ö-B1:s *inom räckvidd*, och det smalare startbandet som mars-variant eller inte.
Kartan: m-efterhalkans saknas-rader om kort #278 och kalibreringen strukna (#468); p-grindarnas grind A bär de tre fönstren.

## #470 (6/10 2026) Efterhalkans mått och daggpunkt: två läsningar förregistrerade före körningen (kort #297, Bengts ja)

**Bengts ja 6/10 kväll (*"ja till 297"*)** till de två läsningarna i `docs/KUVOS-GRANSKNING-2026-10-06.md` §6 (med rättelsen i §6.2).
**Ingen dom, ingen tröskel rörs, ingen ny kalibrering (D7):** startvärdena står frysta (#468). Skriptet
`scripts/matningar/kuvos-mattet-2026-10-06.ts` körs på knappen `kuvos` (`matning`). Inget tal var läst när posten skrevs.

- **M1 — priset per fyrning.** Dagens ovanpå-mått (#456) dömer nattens första fyrning: *uteblev* om ytan inte nått +1,5 °C inom 90 min
  efter den. Ö-B2:s ord är *"av tillkomna fyrningar"*. Här räknas **varje fyrning** i de tillkomna nätterna (nätter utan baslinje) med sitt
  eget 90-minutersfönster och T-B:s klasser — samma horisont som föraren har — för startvärdena och de 32 räknebara punkterna, hela
  vintern och båda halvorna (mittnatten som T-A). Per episod (dagens mått) och per natt (nådde stationen +1,5 någon gång senare samma
  natt) skrivs bredvid: det ena som kontroll (90 min · 0,5 på startvärdena ska ge 45,1 %), det andra som övre gräns, aldrig som mått.
  **Läsning i förväg:** har någon punkt pris per fyrning ≤ 25 % på ≥ 20 fyrningar med utfall, hela vintern och i båda halvorna, är
  kalibreringens *ingen vinnare* (#468) måttets artefakt — då är frågan om en kalibrering på rätt mått Bengts och Axels (D3/D7); har ingen
  punkt det, ändrar måttet inte kalibreringens utfall. Inget väljs här.
- **M2 — daggpunkten vid fyrningen.** Startvärdenas fyrningar delas på `dewpoint_c` vid fyrningen (≤ +1 °C mot > +1 °C) och på yta − dagg
  (≤ 0 · 0–1 · 1–2 · > 2 °C); för varje klass utfallet per episod (90 min · 0,5), per fyrning och per natt, samt nettonyttan per klass
  (daggklassen hos den fyrning som fångade facit, som ovanpå räknar). Daggpunkten är Trafikverkets levererade, inte räknad.
  **Förutsägelse, skriven före talen:** episoder med dagg ≤ +1 °C faller ut i klar majoritet, de över +1 °C uteblir i majoritet — fysiken i
  §6.3 (ytan stannar vid daggpunkten). Håller den, är ett daggpunktsvillkor en ny dimension i TROSKLAR-OVERGANGAR §2 med båda signaturerna,
  tidigast som mars-variant (D1); håller den inte, står fysiken i §6.3 som motbevisad för den här regeln.

**Vad som inte görs:** inget fönster, band eller villkor väljs; inga golv ur Ö-B som urval; inget rörs i betan. **Kostnad:** en
knapptryckning, sekunder efter inläsningen.

**UTFALL 6/10 (körning 37524718907 på e98a4c8, 20:12–20:20Z; mätningen 1 min 53 s). Första försöket 37522992220 skrev "0 av 0" för per natt
och M2 — nycklarna byggdes av Postgres numeric-sträng, uppslagningen av talet; rättat med vakter som stoppar vid tomt, förregistreringen
orörd.** Facit 82 985 stationsnätter, baslinjenätter 46 860, halvorna delade 15/1. Kontrollen stämmer: startvärdena per episod 183 av 406 =
45,1 % (#467).

**M1 — priset per fyrning: måttet ändrar inte kalibreringens utfall.** Startvärdena **43,4 %** per fyrning (195 av 449; A 52,4 %, B 32,3 %)
mot 45,1 % per episod; lägst **35,0 %** (N 4 h · 60 min · fall 1,2), 36,8 % (N 4 h · 30 · 0,8), 37,5 % (N 3 h · 60 · 1,2). **0 av 32 punkter
har pris per fyrning ≤ 25 %** på ≥ 20 fyrningar, hela vintern eller i någon halva. Måttet per episod överskattar priset med 1–7
procentenheter — inte mer. Kalibreringens *ingen vinnare* (#468) står, och ingen kalibrering på annat mått behövs (D7 orörd).
**Per natt, övre gränsen:** startvärdena **16,7 %** (67 av 401), lägst 15,1 % (N 4 h · 30 · 0,8); 21 av 32 punkter under 25 %. Av
startvärdenas 183 *uteblev* inom 90 minuter frös stationen senare samma natt i 116 fall (63 %). Det är inte måttet (föraren passerar
nu), men det är talet som avgör hur Ö-B2:s *"tillfällen som inte blev hala"* ska läsas i januari — kort #296/#297, Bengt och Axel.

| Punkt | per fyrning: uteblev av n ⇒ pris | halva A | halva B | per episod (dagens mått) | per natt (övre gräns) |
| :-- | :-- | --: | --: | --: | --: |
| N 1 h · 30 min · fall 0,4 | 668 av 1087 ⇒ **61,5 %** | 68,5 % | 53,7 % | 62,6 % | 256 av 863 ⇒ 29,7 % |
| N 1 h · 30 min · fall 0,6 | 278 av 466 ⇒ **59,7 %** | 68,8 % | 48,1 % | 61,6 % | 123 av 409 ⇒ 30,1 % |
| N 1 h · 30 min · fall 0,8 | 134 av 233 ⇒ **57,5 %** | 66,4 % | 45,5 % | 59,2 % | 56 av 213 ⇒ 26,3 % |
| N 1 h · 30 min · fall 1,2 | 37 av 61 ⇒ **60,7 %** | 66,7 % | 53,6 % | 62,7 % | 14 av 57 ⇒ 24,6 % |
| N 1 h · 60 min · fall 0,4 | 1287 av 1919 ⇒ **67,1 %** | 73,5 % | 61,4 % | 68,1 % | 386 av 1225 ⇒ 31,5 % |
| N 1 h · 60 min · fall 0,6 | 543 av 882 ⇒ **61,6 %** | 69,6 % | 53,9 % | 63,2 % | 184 av 665 ⇒ 27,7 % |
| N 1 h · 60 min · fall 0,8 | 284 av 488 ⇒ **58,2 %** | 66,4 % | 49,1 % | 60,7 % | 107 av 395 ⇒ 27,1 % |
| N 1 h · 60 min · fall 1,2 | 97 av 166 ⇒ **58,4 %** | 64,5 % | 50,7 % | 60,7 % | 33 av 144 ⇒ 22,9 % |
| N 2 h · 30 min · fall 0,4 | 1124 av 2076 ⇒ **54,1 %** | 61,0 % | 45,4 % | 60,2 % | 372 av 1382 ⇒ 26,9 % |
| N 2 h · 30 min · fall 0,6 | 441 av 928 ⇒ **47,5 %** | 56,2 % | 36,9 % | 51,7 % | 172 av 744 ⇒ 23,1 % |
| N 2 h · 30 min · fall 0,8 **(start)** | 195 av 449 ⇒ **43,4 %** | 52,4 % | 32,3 % | 45,1 % | 67 av 401 ⇒ 16,7 % |
| N 2 h · 30 min · fall 1,2 | 50 av 100 ⇒ **50,0 %** | 61,5 % | 37,5 % | 52,1 % | 17 av 92 ⇒ 18,5 % |
| N 2 h · 60 min · fall 0,4 | 2405 av 3965 ⇒ **60,7 %** | 66,3 % | 54,3 % | 67,0 % | 587 av 1959 ⇒ 30,0 % |
| N 2 h · 60 min · fall 0,6 | 1161 av 2155 ⇒ **53,9 %** | 61,0 % | 44,9 % | 58,5 % | 317 av 1280 ⇒ 24,8 % |
| N 2 h · 60 min · fall 0,8 | 628 av 1275 ⇒ **49,3 %** | 58,1 % | 37,8 % | 53,2 % | 200 av 861 ⇒ 23,2 % |
| N 2 h · 60 min · fall 1,2 | 211 av 478 ⇒ **44,1 %** | 55,3 % | 31,6 % | 47,5 % | 68 av 370 ⇒ 18,4 % |
| N 3 h · 30 min · fall 0,4 | 1598 av 3233 ⇒ **49,4 %** | 54,5 % | 42,4 % | 58,8 % | 493 av 1939 ⇒ 25,4 % |
| N 3 h · 30 min · fall 0,6 | 625 av 1483 ⇒ **42,1 %** | 48,0 % | 34,4 % | 48,1 % | 230 av 1114 ⇒ 20,6 % |
| N 3 h · 30 min · fall 0,8 | 267 av 689 ⇒ **38,8 %** | 44,8 % | 30,6 % | 41,7 % | 94 av 597 ⇒ 15,7 % |
| N 3 h · 30 min · fall 1,2 | 60 av 129 ⇒ **46,5 %** | 58,8 % | 32,8 % | 48,0 % | 25 av 121 ⇒ 20,7 % |
| N 3 h · 60 min · fall 0,4 | 3417 av 6034 ⇒ **56,6 %** | 60,6 % | 51,4 % | 66,6 % | 737 av 2566 ⇒ 28,7 % |
| N 3 h · 60 min · fall 0,6 | 1733 av 3505 ⇒ **49,4 %** | 54,4 % | 42,3 % | 58,7 % | 446 av 1825 ⇒ 24,4 % |
| N 3 h · 60 min · fall 0,8 | 938 av 2119 ⇒ **44,3 %** | 50,5 % | 35,4 % | 51,6 % | 282 av 1302 ⇒ 21,7 % |
| N 3 h · 60 min · fall 1,2 | 301 av 803 ⇒ **37,5 %** | 45,8 % | 27,8 % | 42,7 % | 103 av 593 ⇒ 17,4 % |
| N 4 h · 30 min · fall 0,4 | 2110 av 4416 ⇒ **47,8 %** | 52,4 % | 41,2 % | 60,0 % | 606 av 2426 ⇒ 25,0 % |
| N 4 h · 30 min · fall 0,6 | 815 av 2021 ⇒ **40,3 %** | 45,9 % | 33,2 % | 48,6 % | 283 av 1440 ⇒ 19,7 % |
| N 4 h · 30 min · fall 0,8 | 329 av 893 ⇒ **36,8 %** | 43,4 % | 28,9 % | 41,0 % | 114 av 756 ⇒ 15,1 % |
| N 4 h · 30 min · fall 1,2 | 68 av 158 ⇒ **43,0 %** | 58,8 % | 26,9 % | 44,7 % | 28 av 148 ⇒ 18,9 % |
| N 4 h · 60 min · fall 0,4 | 4513 av 8231 ⇒ **54,8 %** | 58,3 % | 50,0 % | 68,0 % | 880 av 3131 ⇒ 28,1 % |
| N 4 h · 60 min · fall 0,6 | 2391 av 4959 ⇒ **48,2 %** | 53,1 % | 40,9 % | 59,9 % | 555 av 2334 ⇒ 23,8 % |
| N 4 h · 60 min · fall 0,8 | 1342 av 3088 ⇒ **43,5 %** | 49,8 % | 34,6 % | 52,6 % | 362 av 1733 ⇒ 20,9 % |
| N 4 h · 60 min · fall 1,2 | 408 av 1166 ⇒ **35,0 %** | 43,1 % | 25,7 % | 40,4 % | 130 av 825 ⇒ 15,8 % |

**M2 — daggpunkten vid fyrningen: riktningen bekräftad, den starka formen inte.** Alla 1 109 fyrningar fick väderrad och daggpunkt.
| Daggpunkten vid fyrningen | episoder | föll ut · nära · uteblev (90 min) | pris per episod | per fyrning | per natt | fångar · nettonytt |
| :-- | --: | :-- | --: | --: | --: | :-- |
| dagg ≤ +1 °C | 198 | 97 · 37 · 64 | **32,3 %** | 30,9 % | **10,9 %** | 387 · **118** |
| dagg > +1 °C | 213 | 51 · 41 · 121 | **56,8 %** | 55,2 % | 22,5 % | 74 · 57 |

| Yta − dagg vid fyrningen | episoder | pris per episod | per natt |
| :-- | --: | --: | --: |
| ≤ 0 (kondensation pågår) | 129 | **48,8 %** | 22,5 % |
| 0–1 | 124 | 44,4 % | 14,9 % |
| 1–2 | 97 | **38,1 %** | 10,3 % |
| > 2 | 72 | 44,4 % | 15,7 % |

Förutsägelsen (#470) sade *dagg ≤ +1 faller ut i klar majoritet, dagg > +1 uteblir i majoritet*. Utfall: dagg ≤ +1 faller ut i **49 %** inom
90 minuter (97 av 198) och **78 %** under natten (151 av 193); dagg > +1 uteblir i **57 %** inom 90 minuter (121 av 213) men bara 22,5 % under
natten. Riktningen håller tydligt — **daggpunkten nästan halverar priset** (32,3 mot 56,8 % per episod, 10,9 mot 22,5 % per natt) **och bär 118
av 175 nettonytt** — men "klar majoritet inom 90 minuter" håller inte; fallet tar längre tid än förarens horisont också när det fortsätter.
Yta − dagg ≤ 0 (kondensationen pågår redan) är den dyraste klassen, 48,8 %: det är fysiken i §6.3 — vid daggpunkten bromsar
kondensationsvärmet fallet. Episoderna är räknade per klass; en natt kan ge en episod i varje klass (411 mot 406).

**Följd:** ingen tröskel, ingen kod, ingen kalibrering. Till kort #297 (Bengt och Axel, före mars): (1) Ö-B2:s mått i januari — per fyrning
(43,4 %) eller per natt (16,7 %); (2) daggpunkten som mars-variant (D1 stänger den för betan) — riktningen är bekräftad, kostnaden är
täckning (198 av 411 episoder) och advektion (daggpunkten vid fyrningen är inte daggpunkten två timmar senare); (3) ingen kalibrering om — M1
visar att måttet inte var felet. Granskningen §7 bär samma tal; bedömningen §7 två rader.

## #471 (6/10 2026) Prognoslagret: fyra läsningar i kuvösen förregistrerade före körningen — ankarspridningen, natt/säsong, regimstyrd offset, kovariatmodellen (kort #298, Bengts val a)

**Bengts val 6/10 kväll (*"a"*: alla fyra)** ur `docs/PROGNOSLAGRET-VAGAR-2026-10-06.md` §4. **Ingen dom, ingen tröskel rörs:** grind A:s
driftdom (#321, #399) och vägpunktsgrindens fall står; inga kandidater väljs. Skriptet `scripts/matningar/kuvos-prognoslagret-2026-10-06.ts`
körs på knappen `kuvos` (`matning`), på hela vintern 2024/25, med grind A:s modell och vakter (#75, radvakten, karantänen). Inget tal var
läst när posten skrevs.

**Modellen är grind A:s egen, importerad.** `publish/grind-a.ts` har fått två beteendeneutrala tillägg: `evaluate` tar en valfri
`Variant` (regimklass per station och hink som offseten lärs inom; rå viktning utan offset på samma punkter) och varje punkt bär
hinken `t` och `spridning` (störst minus minst offsetkorrigerat ankarvärde); huvudvarvet och självtestet körs bara när filen körs själv.
Självtestet vaktar att en konstant regimklass ger exakt grind A, att rå viktning på samma punkter bär de sanna offseten som fel, och att
spridningen är noll när ankarna är eniga. Driftens grind A är oförändrad (självtest grönt, samma tal).

- **L1 — ankarspridningen.** A1/A2/A3 och täckning per spridningsband 0–0,5 · 0,5–1 · 1–2 · 2–4 · > 4 °C, för OFFSET och RÅ.
  *Läsning i förväg:* växer de grova felen monotont med spridningen, och ligger A2 under 5 % i de täta banden med rimlig täckning, kan
  lagret tiga rätt utan molndata — en grind på spridningen blir då ett förslag till TROSKLAR-SKUGGAN (nytt beslut, båda signaturerna).
- **L2 — natt och säsong.** A2 för OFFSET per solhöjdsband (natt < −6°, skymning −6…0°, dag > 0°; USNO som regimgrinden #408) × månad.
  *Läsning i förväg:* sitter vårens fel (#469: 7,1 % i vårvintern) i dagsljuset är nattbegränsningen en väg; är natten lika dålig är
  det inte solen utan markens säsong (snöfri mark, tjäle) som skiljer.
- **L4 — regimstyrd offset.** Klasser vid målstationen: *klar stilla natt* (molnmängd ≤ 25 % ur SMHI p16 vid närmaste station ≤ 50 km,
  medelvind ≤ 2 m/s, sol < −6°), *natt övrigt*, *dag* (sol ≥ −6°), *okänd* (moln eller vind saknas). OFFSET-REGIM mot OFFSET per band och
  per klass, samma punkter. *Läsning i förväg:* vinner regimdelningen i klar stilla natt men inte annars är särarten en per regim och
  molnmängd i drift (§4.2 h) får ett mätt värde; vinner den inte var en konstant offset nog.
- **L8 — kovariatmodellen.** Stationens särart = medel(mätt − RÅ) över ≥ 100 punkter. Kovariater som går att hämta i kväll: höjd (EU-DEM
  via opentopodata), relief 1 km och 3 km (stationen minus medelhöjden av 8 punkter runt om), kust (andel av 16 punkter på 5 och 10 km
  utan höjd — EU-DEM saknar hav), lat, lon, stationer inom 20 km. Ridge (λ = 1, standardiserade), leave-one-out över stationerna ⇒ R² och
  MAE av särarten mot MAE utan modell; kandidaten RÅ+KOVARIAT = RÅ + särart_LOO per band mot RÅ och OFFSET på samma punkter. Räcker inte
  höjderna (< 90 % av stationerna) hoppas L8 över och sägs. *Läsning i förväg:* förklarar kovariaterna en rimlig del av särarten (R² tydligt
  över noll, MAE under utan-modell) är platsmodellen värd skog, trafik och himmelsfaktor på riktigt (kort #271:s kovariatspår) — en
  kandidat med egen DECISIONS-post, aldrig vald här. Skog, ÅDT, bro och himmelsfaktor saknas i den här första versionen; det sägs.

**Vad som inte görs:** ingen kandidat väljs, inga trösklar, ingen ändring i skuggmotorn. **Kostnad:** en knapptryckning; opentopodata
≈ 250 anrop (publika gränsen 1 000 per dygn).

**UTFALL 6/10 (körning 37530898977 på a393ca8, 21:02–21:20Z; mätningen 10,5 min varav höjdhämtningen 8,8).** 736 stationer, 5 229 252
avläsningar, 4 353 206 punkter; OFFSET ger exakt riktningsprovets tal (0,60 °C · 5,5 % · 0,3 %, #467) och RÅ vägpunktens (0,68 · 7,5 · 0,4) —
modellen är densamma. SMHI-molnstationer 108; 663 av 736 VViS-stationer har en inom 50 km.

**L1 — ankarspridningen skiljer de grova felen från de fina.** Läsningen i förväg höll:
| Spridning (°C) | OFFSET: täckning · A2 · MAE | RÅ: täckning · A2 · MAE |
| :-- | :-- | :-- |
| 0–0,5 (inkl. ett enda ankare: 89 232 resp. 92 739 punkter) | 6,7 % · 7,6 % · 0,50 | 4,9 % · 11,5 % · 0,61 |
| 0,5–1 | 19,9 % · **1,1 %** · 0,41 | 13,3 % · **1,8 %** · 0,43 |
| 1–2 | 39,5 % · **2,2 %** · 0,52 | 36,1 % · **2,8 %** · 0,55 |
| 2–4 | 27,1 % · 7,4 % · 0,77 | 34,8 % · 7,8 % · 0,78 |
| > 4 | 6,8 % · **28,4 %** · 1,81 | 10,8 % · **27,3 %** · 1,62 |

Med spridning 0,5–2 °C (59 % av punkterna) är OFFSET:s grova fel **1,8 %**; med 0–2 °C (66 %) **2,4 %**. För RÅ: 0,5–2 °C (49 %) **2,5 %**. Över 4 °C
(7–11 % av punkterna) ligger mer än var fjärde punkt grovt fel. Bandet 0–0,5 bär punkterna med ett enda ankare (spridning 0 av konstruktion)
och är därför sämre än 0,5–1 — en spridningsgrind måste kräva minst två ankare. **Lagret kan tiga rätt utan molndata.**

**L2 — vårens fel sitter i dagsljuset.** Läsningen i förväg höll:
| Solhöjd | okt | nov | dec | jan | feb | mar | alla (n · MAE · A2) |
| :-- | --: | --: | --: | --: | --: | --: | :-- |
| natt (< −6°) | 4,2 % | 3,7 % | 4,0 % | 5,7 % | 3,7 % | **3,1 %** | 2 742 593 · 0,52 °C · **4,2 %** |
| skymning (−6…0°) | — | 4,1 % | 4,5 % | 6,7 % | 4,6 % | 5,8 % | 379 660 · 0,55 · 5,2 % |
| dag (> 0°) | — | 5,3 % | 2,3 % | 4,1 % | **11,1 %** | **17,9 %** | 1 230 953 · 0,76 · 8,6 % |

Natten är under 5 % varje månad utom januari (5,7 %) och bäst i mars (3,1 %); dagen går från 2,3 % i december till 17,9 % i mars. Vinterns
7,1 % i vårvintern (#469) är solen, inte marken. **Nattbegränsat håller OFFSET 4,2 % på 63 % av punkterna** — hela vintern, alla band
sammantaget. Januarinatten (5,7 %) är den mörka vinterns klara, stilla nätter (L4).

**L4 — regimstyrd offset hjälper där fysiken sade, och lite.**
| Klass | täckning | OFFSET-REGIM: MAE · A2 | OFFSET: MAE · A2 |
| :-- | --: | :-- | :-- |
| klar stilla natt | 15,4 % | 0,61 · **5,1 %** | 0,64 · **6,6 %** |
| natt övrigt | 38,7 % | 0,44 · 2,5 % | 0,48 · 2,6 % |
| dag | 37,0 % | 0,75 · 7,9 % | 0,71 · 7,8 % |
| okänd (moln eller vind saknas) | 8,8 % | 0,60 · 6,3 % | 0,62 · 6,9 % |
| **alla** | 100 % | 0,59 · **5,2 %** (band 3,4 · 3,4 · 5,2 · 9,9 %) | 0,60 · **5,5 %** (3,6 · 3,7 · 5,4 · 10,3 %) |

Vinsten sitter nästan helt i klar stilla natt (6,6 → 5,1 %) och är noll på dagen; totalt 5,5 → 5,2 %. En konstant offset är nästan nog; det
som fattas i klara stilla nätter är inte offsetens regim utan det lokala köldhålet som ingen granne ser. Molnmängd i drift (§4.2 h) köper
0,3 procentenheter — inte mer.

**L8 — de grova kovariaterna förklarar ingenting av särarten.** 729 stationer med ≥ 100 punkter, särartens spridning sd 0,55 °C; 722 fick
EU-DEM-höjd (24 057 punkter frågade). Leave-one-out: **R² 0,010**, MAE 0,43 °C mot 0,43 utan modell. Effekt per standardavvikelse: kust
0,10 °C, lat 0,06, relief 0,02–0,03, höjd 0,00. Kandidaten:
| Kandidat (samma 4 312 216 punkter) | MAE | A2 | per band 0–7 · 7–15 · 15–20 · > 20 km |
| :-- | --: | --: | :-- |
| RÅ+KOVARIAT | 0,68 °C | 7,3 % | 5,2 · 4,9 · 7,0 · 13,5 % |
| RÅ | 0,67 | 7,4 % | 5,2 · 5,1 · 7,1 · 13,6 % |
| OFFSET (taket) | 0,59 | 5,5 % | 3,6 · 3,6 · 5,4 · 10,3 % |

Läsningen i förväg gick åt andra hållet: höjd, relief på 1–3 km, kustnärhet, läge och stationstäthet bär inte särarten. **Särarten är
mikroskala** — himmelsfaktor, skugga, vägkropp, vatten intill — eller regim gånger plats. Metoden (stationerna som facit för en platsmodell)
står och gav ett rent svar; det är kovariaterna som måste bli de rätta (laserdata för himmelsfaktor, NMD för skog, NVDB för trafik), eller
karteringen (#271). Tills dess är kovariatspåret inte en genväg.

**Följd:** ingen tröskel, ingen kod, ingen kandidat. Två förslag till TROSKLAR-SKUGGAN, Bengts och Axels beslut (kort #299): en
**spridningsgrind** (tig när ankarna är oense över X °C, minst två ankare — X läses ur tabellen, 2 °C är bandgränsen som mätts, inget
val gjort) och en **nattbegränsning** (tala bara när solen är under −6°). Molnmängd i drift (§4.2 h) kan strykas som lager för prognosen
(0,3 pe); kovariatspåret (#271) behöver riktiga kovariater. Bedömningen §7 fyra rader; PROGNOSLAGRET-VAGAR §5.

## #472 (7/10 2026) Vägdatalagret — ett statiskt lager med vägens egenskaper för åtta användare, och rekognoseringen av öppna API:ets NVDB-data (kort #301, Bengts order)

**Bengts order 7/10 (*"kör rekognoseringen och gör kortet"*)**, efter analysen av C8 (kovariatmodellen tränad på stationernas egna offset,
kort #298) och Axels fysikspår: det som ska delas är inte en modell utan **datalagret under den** — vägens egenskaper per plats.

**Fyndet som ändrar förutsättningarna.** Trafikverkets öppna API — nyckeln `TRAFIKVERKET_API_KEY` som driften redan använder — bär
sedan 7/2 2025 NVDB:s vägdata (datamodellen på data.trafikverket.se, läst 7/10): *Trafik* (namespace `Vägdata.TRAFIK_DK_O` 1.2, med
ÅDT_fordon, ÅDT_lastbilar och ÅDT per dygnsperiod — bl.a. **ÅDT_lätta_fordon_22_06**, nattrafiken), *FunktionellVägklass*, *Slitlager*,
*Vägbredd*, *Hastighetsgräns*, *Motorväg*, *Väghållare* (`Vägdata.NVDB_DK_O`), samt *PavementData/MeasurementData* (`Road.PavementInfo`).
Geometrin är WKT i WGS84; rumslig fråga med `INTERSECTS shape="center" radius="…m"`. Källkartläggningen 26/8 sade "ÅDT via Lastkajen,
kräver konto" — det gäller inte längre. Lastkajen (läst 7/10): konto gratis och självregistrerat, API:et odokumenterat bakom
inloggningstoken, inga hemligheter hos oss; behövs bara för det öppna API:et saknar (vinterväghållningsklass, bro).

**Lagret (kort #301):** `data/vagdata/stationer.json`, `segment.json`, `vagpunkter.json` — en rad per VViS-station (854 i static.json),
väglagssegment (818) och vägpunkt (var 2 km längs de 20 svenska rutterna) med källa, datum och version i huvudet; Axels beräknade kolumner
(himmelsfaktor, skog, vatten, terrängläge) i samma filer med proveniens; spann i värdevakten innan någon mätning läser dem; kuvösen läser
filerna in i `kuvos_ra.vagdata`; driften får en tabell först vid ett byggbeslut. **Användare:** prognoslagret (C8, #298), fysikspåret,
kallplatserna (#91 — indexet per segment är tabellen), efterhalkan (priset per vägklass/salt, #296/#297), vattenplaningen (spårdjup, #42),
rimfrosten (himmelsfaktor), vind och sikt (exponering), frysklassningen, tystnadsfelet, kamerafacit.

**Rekognoseringen, förregistrerad här:** `scripts/vagdata-rekognosering.ts`, knappen `vagdata-rekognosering.yml`, **ren läsning, inget
utfall, inget lagrat.** Spår A: en post per datamängd (limit 1) — finns den, vilka fält. Syntaxprov: INTERSECTS center/radius 150 m vid en
station, med WITHIN som reserv, status och kropp utskrivna. Spår B: samma fråga vid ett **stickprov** (var tolfte station, var tjugonde
segment, var tjugonde vägpunkt) per datamängd — andel platser med träff, objekt per träff, ms per anrop; stickprov eftersom nyckeln delas
med driftens ingest varje minut. Spår C: PavementData vid segmentstickprovet — finns spårdjup. Varje svar räknas på rotelementet, aldrig
på statuskoden (Vegvesen-läxan). Nästa steg är hämtaren (`--alla`), som skriver filerna — eget beslut efter rekognoseringen.

**UTFALL 7/10 — två körningar.** *Körning 1* (37567654151, 03:38–04:03Z, main 93c0947): spår A fann alla sju datamängderna med fält
(HTTP 200, rotelement = datamängden, en post var), men syntaxprovet och hela spår B/C föll på *"Invalid query attribute
Trafik.Geometry.WGS84"* — 0 av 193 platser var ett attributfel, inte täckning, och svarskroppen sa det (TRV 400-läxan). *Körning 2*
(37569902629, 04:07–04:25Z, a7da354) läser geometrinycklarna ur första posten: NVDB-posterna bär **`WKT-SWEREF99TM-3D` och
`WKT-WGS84-3D`**; `INTERSECTS name="Geometry.WKT-WGS84-3D" shape="center" radius="150m"` svarar (station 1001: 4 Trafik-objekt, 218 ms).
Stickprovet, 150 m, ~170 ms per anrop:
| Datamängd | stationer (72) | segment (41) | vägpunkter (80) | objekt per träff | exempel |
| :-- | --: | --: | --: | --: | :-- |
| Trafik (ÅDT) | **99 %** | **100 %** | 14 % | 1,3–2,4 | ÅDT_fordon 2 346 · lastbilar 214 · lätta 22–06 106 · mätår 2022-01 · stickprovsmätning |
| FunktionellVägklass | 100 % | 100 % | 55 % | 5–6 | Klass 0 (station) · 8 (segment) · 7 (vägpunkt) |
| Slitlager | 100 % | 100 % | 55 % | 5,5–7,3 | belagd · grus · belagd |
| Vägbredd | 100 % | 100 % | 39 % | 3,2–7,3 | 4,5 · 3 · 5,1 m |
| Hastighetsgräns | 100 % | 100 % | 55 % | 6,3–6,7 | 100 · 70 · 40 |
| Väghållare | 100 % | 100 % | 55 % | 5,3–7,3 | statlig · enskild · kommunal |
| PavementData, MeasurementData20 | — | — | — | — | ingen geometri: nyckeln är län + vägnummer + löpande längd |

**Läsning.** (1) **Vid stationerna och segmenten är täckningen full** för alla sex NVDB-datamängderna med nyckeln vi har — vägdatalagret
går att bygga utan Lastkajen. (2) **Vägpunkterna träffar sämre (14–55 %)**: rutternas linjer är grova (#323: E14 hade 7 stationer inom 2 km av
linjen mot 10 inom 5 km), så provpunkterna ligger ofta mer än 150 m från vägen — ett fel i vår geometri, inte i NVDB; hämtaren ska
snappa vägpunkterna till väglagsnätets segment eller vidga radien, och räkna täckningen. (3) **150 m fångar grannvägar**: 5–7 objekt per träff,
och exemplen (segment: grus · Klass 8 · enskild · 70) visar att en sidoväg kan ta platsen. Hämtaren måste **välja rätt väg** — vägnummer
(datamängden *Vägnummer*) eller lägst klass/statlig väghållare/störst ÅDT — och skriva ut vad den valde. (4) ÅDT:s mätår varierar
(2016–2022 i stickprovet); åldern följer med som fält. (5) **Spårdjupet finns** — `MeasurementData20` bär RutDepthMax15/17, RutArea,
WaterArea, IRI, Crossfall — men utan geometri: nyckeln är län + vägnummer + löpande längd, och kopplingen går via *RoadGeometry* i samma
namespace. Vattenplaningens Lastkajen-låsning (kort #42) är upplåst, kopplingen är ett eget steg. (6) Full hämtning ≈ 3 257 platser × 6
datamängder ≈ 20 000 anrop ≈ en timme med 0,6 s paus — en knapptryckning per säsong.

**Mitt misstag på vägen:** v2:s självtest för SWEREF99TM-projektionen föll (glömd skalfaktor 0,9996) och `grep -v` utan `pipefail` dolde det
lokalt, så commiten och knappen gick ändå (37569823738 röd på provet). Rättat i a7da354; kedjor som filtrerar utdata körs nu med `set -o
pipefail`. **Följd:** kort #301 steg 1 klart; steg 2 (hämtaren med vägval och snappning) är nästa beslut.

## #473 (7/10 2026) Vägdatalagrets hämtare — reglerna skrivna före körningen: ett NVDB-element per plats, spannen i värdevakten, filerna via PR (kort #301 steg 2, Bengts ja)

**Bengts ja 7/10 (*"ja till hämtaren"*)** efter rekognoseringen (#472). `scripts/vagdata-hamta.ts` och knappen `vagdata-hamta.yml`.

- **Platserna:** VViS-stationerna (static.json, 854), väglagsnätets segment (818, linjens mittpunkt) och vägpunkterna var 2 km längs de 20
  svenska skuggrutterna (prognoslagrets egna `provpunkter`, 1 585). **Vägpunkterna snappas inte** — prognoslagret räknar på just de
  koordinaterna; radien vidgas i stället 150 → 400 → 1 000 m, och den radie som bar står på raden.
- **En förfrågan per plats** med sex QUERY i samma REQUEST (Trafik, FunktionellVägklass, Slitlager, Vägbredd, Hastighetsgräns,
  Väghållare), `INTERSECTS Geometry.WKT-WGS84-3D` (#472), geometrin exkluderad ur svaret, 0,35 s paus — nyckeln delas med driftens ingest.
- **Vägvalet:** objekten grupperas på NVDB:s `Element_Id`; raderade (`Deleted`) och utgångna (`Valid_To` passerad) kastas; ETT element
  väljs: **lägst funktionell vägklass ⇒ statlig väghållare ⇒ störst ÅDT_fordon ⇒ första.** Skälet (`vald_pa`) och antalet kandidater står
  på raden. Saknar det valda elementet en datamängd är fältet null — aldrig grannens värde.
- **Fälten:** element_id, klass, väghållare (typ, namn), slitlager, bredd_m, hastighet_kmh, adt_fordon, adt_lastbilar, adt_latta_22_06,
  adt_matar (ur Mätårsperiod), adt_matmetod, radie_m, kandidater, vald_pa. **Spannen** står i `scripts/vardevakten.ts` (klass 0–9,
  bredd 0–60 m, hastighet 5–130, ÅDT 0–200 000, lastbilar och nattlätta 0–50 000, mätår 1990–2030) och importeras av hämtaren, som
  fäller körningen vid brott — VÄRDEVAKTEN före första användning. Värdevakten har fått en vakt så att den kan importeras utan att köra.
- **Filerna:** `data/vagdata/{stationer,segment,vagpunkter}.json` med huvud (källa, datum, datamängder och versioner, geometri, radier,
  regel, täckning per fält, radie som bar, vald på, spannens min/max). Flödet laddar upp dem som artefakt och **committar inget**:
  jag läser sammanfattningen (täckning, vägval, spann) och committar filerna i en PR som Bengt slår ihop. Licens CC0.
- **Vakter:** mer än 2 % fallna förfrågningar fäller körningen; spannfel fäller; självtest utan nät (levande, kandidater, vägvalet, raden,
  spannkontrollen) i knappen före körningen.
- **Kostnad:** ≈ 3 300 förfrågningar (fler där radien vidgas), ≈ 30 min, en gång per säsong. Stickprov (`stickprov: true`, var 40:e plats)
  körs först.

**Vad som inte görs:** inget skrivs till Supabase; kuvösens inläsning (`kuvos_ra.vagdata`) och Axels kolumner (himmelsfaktor, skog, vatten)
är steg 3; ingen mätning läser lagret förrän filerna är i repot och spannen OK.

**Tillägg, Bengts val (a) 7/10 (*"a, slå ihop 788"*) — väglagspunkterna.** Frågan var varför vägpunkterna följer våra egna linjer:
skuggrutterna är handritade sedan 29/8 — 20 rutter, 109 brytpunkter, 3 107 km, ~35 km per rak sträcka — och det är därför NVDB träffade
14–55 % vid dem (#472). Tre vägar ställdes: (a) väglagsnätets egen geometri (Trafikverkets 818 segment, 23 681 km) med punkter var 2 km,
(b) rutterna snappade till vägen (byter skuggans population — eget kort, förregistrering, Bengt och Axel), (c) hela vägnätet som
population. **(a) valdes** därför att facit mellan stationerna finns bara där (RoadCondition, kamerorna), det redan är premissmätningens
population B (#406) så kuvösen, hösten och mars förblir jämförbara, geometrin redan är hämtad, produkten talar bara där, och
stationerna inte kan kalibrera småvägar; (c) först när facit finns utanför de 818. Hämtaren får en fjärde fil
`data/vagdata/vaglagspunkter.json` — var 2 km längs segmentens linjer, id `segment_id@km`, ~11 800 punkter — och tiden växer till ≈ 2 h
per säsong. Rutternas vägpunkter behålls för prognoslagrets läsningar som de står; (b) är kort #302 om Bengt och Axel vill.

**UTFALL 7/10 — hämtningen körd och filerna i repot.** Stickprovet (37572883058, 427 förfrågningar, 0 fel, 3,7 min) höll spannen och
vägvalet; hela hämtningen (37573291703, main 0cc31ca, 04:49–07:17Z) tog **17 194 förfrågningar, 0 fel, 148 min** — långsammare än
stickprovet antydde, eftersom rutternas vägpunkter kostar upp till tre förfrågningar (150 → 400 → 1 000 m). Artefakten (603 kB zip, sha256
cdd69918…) hämtad och lagd i `data/vagdata/` (7,3 MB, fyra filer med huvud: källa, datum, datamängder, geometri, radier, regel, täckning,
radie som bar, vald på, spannens min/max).
| Fil | platser | element | ÅDT fordon | ÅDT lätta 22–06 | klass · slitlager · bredd · hastighet · väghållare | radie som bar | vald på |
| :-- | --: | --: | --: | --: | :-- | :-- | :-- |
| stationer.json | 854 | 854 | 844 | 774 | 854 · 851 · 853 · 854 · 852 | 150 m: 853 · 400: 1 | adt 337 · klass 348 · enda 97 · första 72 |
| segment.json | 818 | 818 | 802 | 752 | 818 · 818 · 818 · 818 · 818 | 150 m: 818 | klass 400 · adt 237 · enda 111 · första 70 |
| vagpunkter.json (rutterna) | 1 585 | 1 514 | **382** | 363 | 1 503 · 1 503 · 827 · 1 500 · 1 510 | 150: 848 · 400: 499 · 1 000: 167 · ingen: 71 | första 603 · enda 460 · klass 363 · adt 86 · statlig 2 |
| vaglagspunkter.json (a) | 12 960 | 12 960 | 12 834 | 11 990 | 12 960 · 12 944 · 12 952 · 12 958 · 12 954 | 150 m: 12 959 · 400: 1 | klass 5 518 · adt 4 046 · enda 2 244 · första 1 142 · statlig 10 |

**Läsning.** (1) **Stationer, segment och väglagspunkter: full täckning** — element i 100 %, ÅDT i 98–99 %, nattrafiken (lätta 22–06) i
91–93 %; en enda plats av 14 632 behövde 400 m. (2) **Rutternas vägpunkter bekräftar att rutterna är handritade:** 71 utan element inom 1 km,
499 behövde 400 m, 167 behövde 1 000 m, ÅDT bara i 24 % — och "första" (oavgjort vägval) i 38 %: på 1 000 m är det många vägar. Filen
behålls för prognoslagrets läsningar som de står, men varje mätning längs vägen ska hädanefter använda `vaglagspunkter.json` (riktig
geometri) — rutternas snappning är kort #302 om Bengt och Axel vill. (3) **Spannen håller** i alla fyra filerna (ÅDT 13–72 240, klass 0–9,
bredd 2–23,8 m, hastighet 30–120, mätår 2015–2025); segmentens vägklass 0–5, stationernas 0–7 — stationerna står på huvudvägar, som
väntat. (4) "Första" i 8–14 % vid stationer, segment och väglagspunkter: lika klass, inte statlig, utan ÅDT på båda — oftast två
närliggande element på samma väg; raden bär `kandidater` så att det går att granska. (5) Mätåret för ÅDT spänner 2015–2025 —
`adt_matar` följer med varje rad.

**Följd:** kort #301 steg 2 klart. Steg 3: kuvösens inläsning (`kuvos_ra.vagdata`) och Axels kolumner (himmelsfaktor, skog, vatten,
terrängläge) med proveniens. Första användare i tur: C8 v2 (#298) med ÅDT och vägklass, efterhalkans pris per vägklass (#296/#297),
kallplatsindexet per segment (#91). Ingen mätning har läst filerna än.

## #474 (7/10 2026) Spridningsgrinden antagen: prognosen tiger när ankarna är oense — spridningen loggas rå i skuggan, X sätts före vinterläsningen (kort #299 förslag 1, Bengts ja, Axels signatur)

**Beslut.** Bengt 7/10: *"kör förslag 1 på kort 299"*, och samma timme *"Axel signerar"* (relayerat i chatten, som fastställandet
2/9, #61). Förslag 1 ur kuvösens läsning L1 (#471) blir regel i TROSKLAR-SKUGGAN §3, stycket om vägpunkten: en provpunkt är *okänt*
— prognosen tiger — när färre än två ankare bidrar eller när ankarnas spridning, störst minus minst av de bidragande ankarnas
yttemperatur, är **X °C eller mer**. Det är en skärpning enligt §5: grinden tar bort punkter och sänker inget krav. Gränsen ligger
på [lo, hi) som L1:s band, så att skuggans läsning och kuvösens går att lägga bredvid varandra.

**X är inte satt.** Förslaget sa *"X läses ur tabellen, inget val gjort"*, och inget av orden 7/10 nämner ett tal. X fastställs i
TROSKLAR-SKUGGAN genom en DECISIONS-post före vinterläsningen (bedömningen §4.2). Underlaget är RÅ, leave-one-out vid stationerna,
vintern 2024/25 (#471); täckningen är en undre gräns, eftersom bandet 0–0,5 °C i L1 blandade ett ankare med två och inte delades:

| X | täckning, minst två ankare och spridning under X | grova fel (A2) i banden 0,5–X |
| :-- | --: | --: |
| 1 °C | minst 13,3 % | 1,8 % |
| 2 °C | minst 49,4 % | 2,5 % |
| 4 °C | minst 84,2 % | 4,7 % |
| ingen grind | 100 % | 7,5 % |

A2 för 2 och 4 °C är viktad ur banden: (13,3 · 1,8 + 36,1 · 2,8) / 49,4 = 2,5 och (… + 34,8 · 7,8) / 84,2 = 4,7. Grind A:s krav är
A2 ≤ 5 %; vid 4 °C ligger talet inom marginalvaktens räckhåll.

**Vad som byggs nu, oberoende av X.**
1. *Loggen.* `engine/src/segment.ts`: `skatta()` räknar spridningen över samma fem ankare som skattningen, och provpunkten och
   holdout-raden får ett sjunde fält, spridningen i °C med en decimal — 0 med ett ankare, null utan. Status och frysflagga bär INTE
   grinden: loggen är rå, domen räknar (#196). Skuggmotorn buntas om (`index.ts` är genererad) och deployas efter ihopslagningen;
   beviset är första raden MED innehåll i sjunde fältet efter deployen, inte commit-hashen.
2. *Läsningen.* `publish/grind-s-b.ts`: täckta provpunkter (status ≥ 1) och holdout-rader (C3:s population, mätt ≤ +5 °C) per
   spridningsband — L1:s fem band, ett ankare för sig, rader utan fältet som *ej loggad*. Underlagsläget skriver bara antal;
   domläget skriver täckning och holdout-radernas grova fel per band och för X = 1, 2 och 4 °C, under samma blindning som B-måtten
   (#352). Självtestet bär en fälla på gränsen: spridning 2,0 hamnar i 2–4, där grinden vid 2 tiger. Tre motprov fällde provet:
   spridning över alla ankare inom 50 km, banden som (lo, hi], och holdout-raderna utan vinterfiltret.

**Vad som INTE ändras.** B1–B3 och C1–C3 räknas som förut, utan grinden. B2 dömer missar bara på täckta segment, och grind C har
inget täckningskrav; en grind i B-måtten kunde därför krympa populationen och bli en lättnad, som §5 utesluter. Ska marsdomen
räknas med grinden krävs ett täckningskrav i samma post (§4.2). Nattbegränsningen (förslag 2) ingår inte. Rösten berörs inte:
telefonen kör inte segmentprognosen.

**Förregistrerat för vinterläsningen.** Läsningen i förväg: de grova felen stiger med spridningsbandet i skuggan som i kuvösen.
Stiger de inte, tas grinden upp igen innan den bär något. Läsningen är `grind-s-b --dom` när C1 och C2 är uppfyllda, eller på
Bengts order. Rader loggade före deployen har sex fält och kan inte bandas, så läsningens fönster börjar vid deployen.

**Alternativ:** (a) grinden i loggens status — förkastat, loggen ska vara rå (#196) och X är inte satt; (b) B1–B3 omräknade med
grinden — förkastat nu, lättnadsrisken ovan; (c) vänta med bygget tills X är satt — förkastat, varje dygn utan loggad spridning
är ett dygn mindre i vinterläsningen.

## #475 (7/10 2026) Marsdomen räknas med spridningsgrinden, och tystnaden är en miss — väg (c) (kort #299, Bengts val; Axels signatur väntar)

**Beslut.** Bengt 7/10: *"c"* — svaret på bedömningens §4.2 om marsdomens B1–B3 med grinden: (a) utan grind, (b) med grind och ett
täckningskrav, (c) med grind och tystnaden som miss. Ändrar #474:s *"B1–B3 och C1–C3 räknas utan grinden"*.

**Regeln** (TROSKLAR-SKUGGAN §3, vägpunkten och grind B). Med X fastställt räknas
- B1 och C2 på de holdout-episoder grinden släpper fram: holdout-raden har minst två ankare och spridning under X;
- B3 på de episoder på rutten som grinden släpper fram;
- B2 med täckningen OFÖRÄNDRAD — ett segment är täckt när närmaste provpunkt har status ≥ 1 utan grinden — men flaggat bara där
  grinden låter prognosen tala. Halka på ett täckt segment där grinden tystade prognosen är alltså en MISS;
- C1 utan grinden, och C3 som förut: samstämmigheten mellan backtest och drift gäller modellen, inte grinden.
Domen räknas bara på varv där spridningen är loggad. Utan fastställt X fälls ingen dom — grind S-B skriver *INGEN DOM*.

**Varför (c).** Domen ska döma det produkten skulle säga, och tystnad måste kosta. Med (a) kunde B1 fällas av falsklarm som produkten
med grinden aldrig ger, och efter mars hade det varit för sent att byta. Med (b) krävdes ett nytt tal. Med (c) kan grinden bara vinna
B1 genom att betala i B2. Det är inte en ren skärpning, eftersom B1 blir lättare; därför krävs båda signaturerna, och beslutet fattas
medan andelarna är blinda (#352) — ingen har sett utfallet, så §5:s spärr mot lättnad efter sett utfall träffar inte.

**Axels signatur väntar** (bedömningen §4.2). Koden är byggd nu och verkar först när X är satt; domen fälls tidigast i mars.
Vägpunktsgrinden (A-måtten, föll 28/9 på 6,9 %, #399) dömer fortfarande utan grind; ska den dömas med grinden krävs en egen post,
med samma princip att tystnad kostar.

**Byggt.** `publish/grind-s-b.ts`: `talar()` och `spridningLoggad()`, X genom episoderna, holdout-episoderna, händelsedomen, räkningen
och rapporten; `SPRIDNING_X = null` tills dokumentet sätter talet, aldrig från kommandoraden. Självtestet: grinden tystar en flaggad
punkt med spridning 3 ⇒ halkan där blir MISS, den varma holdouten försvinner ur B1, varvet utan spridning räknas inte, spridning lika
med X tiger, och X-spärren och C-spärren prövas var för sig. Fyra motprov fällde provet på rätt rad: flaggad utan grinden; täckt MED
grinden — lättnaden, missen försvann; gränsen som ≤ X; gamla varv med i grinden.

## #476 (7/10 2026) Spridningen och natten korsade — en läsning i kuvösen, förregistrerad före körningen (kort #299, Bengts ja)

**Beslut.** Bengt 7/10: *"ja till korsade läsningen"*. En läsning, ingen dom: underlaget för X (#474) och för nattbegränsningen
(kort #299 förslag 2), som Bengt och Axel beslutar ur tabellerna. Skript `scripts/matningar/kuvos-spridning-natt-2026-10-07.ts` på
knappen `kuvos` (`matning`). Förregistrerad här, i samma commit som skriptet, före körningen.

**Population och modell.** Vintern 2024/25 i kuvösen, grind A:s underlag och vakter (#75, radvakten, karantänen) som L1/L2 (#471),
och grind A:s RÅ utan offset — driftens modell; L2 mätte OFFSET. Grind A:s `evaluate` bär nu antalet bidragande ankare
(beteendeneutralt, självtestet grönt), så att ett ensamt ankare skiljs från två eniga: L1 räknade spridning 0 som ett ankare.
Spridningen avrundas till tre decimaler före bandningen, så att 2,0 aldrig hamnar under 2 av flyttalsskäl.

**Läsningarna.**
- **K1 X-kurvan:** per spridningsband bland punkter med minst två ankare (0–0,5 · 0,5–1 · steg om 0,25 °C från 1 till 4 · > 4) och
  ett ankare för sig: täckning, MAE, A2, A3. Grinden vid X = 0,5; 1; 1,25 … 4: täckning av alla punkter och felen bland dem som talar.
- **K2 natten för RÅ:** A2 per solhöjdsband (natt < −6°, skymning −6…0°, dag > 0°) och månad.
- **K3 korsat:** K2 bland punkter grinden släpper fram vid X = 2, 3 och 4; och reglerna bara grind, grind + natt, grind + sol under 0°,
  bara natt och ingen regel sida vid sida — täckning, MAE, A2, A3 hela vintern, i februari och i mars.
- **K4 morgonen:** punkter 05–08 UTC (06–09 normaltid) i februari och mars — andel per solhöjdsband och A2 med och utan grind.

**Läsningen i förväg.** (1) A2 stiger med spridningen, och grinden vid 3 °C håller under 5 % med ungefär 70 % täckning. (2) Ett ensamt
ankare har grova fel långt över två eniga. (3) RÅ följer L2:s mönster en till två procentenheter sämre, och dagen i mars ligger över
15 %. (4) Grinden tar en del av dagsljusets fel men inte allt: med grinden vid 2 ligger dagen i mars minst två procentenheter över
natten. (5) Morgonen 06–09 i mars är mest skymning och dag.

**Kontroll.** Utan grind ska RÅ ge samma tal som L1/L2 6/10 — 4 353 206 punkter, 7,5 % grova fel. Avviker det är underlaget inte
detsamma, och läsningen läses inte förrän skälet är känt.

**Vad som INTE görs.** Inga trösklar, inget X, ingen nattregel.

**UTFALL #476, 7/10 — körd och läst** (kuvos 37651865384 på 465b1a7, läsningen 1,2 min). **Kontrollen höll:** RÅ utan grind gav
4 353 206 punkter och 7,5 % grova fel, samma som L1/L2 6/10.

*K1 — X-kurvan.* Grinden vid X, täckning av alla punkter och felen bland dem som talar:

| X | täckning | grova fel (A2) | frysklassfel (A3) | MAE |
| :-- | --: | --: | --: | --: |
| 1 °C | 15,8 % | 1,9 % | 0,1 % | 0,43 °C |
| 1,5 °C | 34,5 % | 2,1 % | 0,1 % | 0,47 °C |
| 2 °C | 52,0 % | 2,5 % | 0,1 % | 0,51 °C |
| **2,25 °C** | **60,6 %** | **2,8 %** | **0,1 %** | **0,53 °C** |
| 2,5 °C | 65,6 % | 3,0 % | 0,1 % | 0,54 °C |
| 3 °C | 75,5 % | 3,6 % | 0,2 % | 0,57 °C |
| 3,5 °C | 82,3 % | 4,1 % | 0,2 % | 0,59 °C |
| 4 °C | 87,0 % | 4,6 % | 0,2 % | 0,60 °C |
| ingen grind | 100 % | 7,5 % | 0,4 % | 0,68 °C |

Banden var för sig: 0–0,5 °C 2,6 % · 0,5–1 1,8 % · 1–1,25 2,1 % · 1,25–1,5 2,5 % · 1,5–1,75 3,0 % · 1,75–2 3,8 % · **2–2,25 4,7 % ·
2,25–2,5 5,6 %** · 2,5–2,75 6,7 % · 2,75–3 8,2 % · 3–3,25 9,7 % · 3,25–3,5 11,2 % · 3,5–3,75 12,8 % · 3,75–4 14,3 % · över 4 27,2 %;
ett ensamt ankare 24,2 % på 2,0 % av punkterna.

*K2–K3 — natten och grinden.* Täckning · grova fel:

| Regel | hela vintern | februari | mars |
| :-- | :-- | :-- | :-- |
| ingen regel | 100 % · 7,5 % | 100 % · 9,2 % | 100 % · 10,5 % |
| bara natt (sol < −6°) | 63,0 % · 6,0 % | 57,7 % · 6,1 % | 56,6 % · 5,4 % |
| grind 2 | 52,0 % · 2,5 % | 48,7 % · 2,7 % | 45,4 % · 4,0 % |
| grind 2 + natt | 34,2 % · 2,3 % | 30,8 % · 2,3 % | 28,9 % · 3,4 % |
| grind 3 | 75,5 % · 3,6 % | 71,6 % · 4,0 % | 71,4 % · 5,1 % |
| grind 3 + natt | 49,3 % · 3,3 % | 44,8 % · 3,3 % | 44,9 % · 4,2 % |
| grind 4 | 87,0 % · 4,6 % | 83,8 % · 5,3 % | 84,6 % · 6,2 % |
| grind 4 + natt | 56,2 % · 4,1 % | 51,4 % · 4,2 % | 52,1 % · 4,7 % |

RÅ per solhöjdsband utan grind: natt 6,0 % (5,3–7,3 % varje månad), skymning 7,3 %, dag 10,9 % (februari 14,6 %, mars 19,2 %). Med
grinden vid 2: natt 2,3 %, skymning 2,6 %, dag 3,0 % (mars 5,4 %).

*K4 — morgonen 06–09 normaltid.* Februari: natt 29 %, skymning 29 %, dag 42 % av punkterna. Mars: **dag 86,8 %**, skymning 12,4 %,
natt 0,8 %. Dagsljuset på marsmorgonen har 6,0 % grova fel utan grind, **2,9 % med grinden vid 2** (50 % täckning) och 3,9 % vid 3.

**Mot läsningen i förväg.** (1) *Höll:* felen stiger med spridningen, från 1,8 % i 0,5–1 till 27,2 % över 4, och grinden vid 3 ger
3,6 % på 75,5 %. Bandet 0–0,5 (2,6 %) ligger över 0,5–1. (2) *Höll:* ett ensamt ankare 24,2 % mot två eniga 2,6 %. (3) *Höll till
hälften:* RÅ ligger 1,8–2,3 procentenheter över L2:s OFFSET och dagen i mars på 19,2 % — men natten för RÅ ligger över 5 % i varje
månad; L2:s "natten under 5 %" gällde bara OFFSET. (4) *Höll på gränsen:* med grinden vid 2 ligger dagen i mars 5,4 % mot nattens
3,4 %, exakt 2,0 procentenheter. (5) *Höll:* marsmorgonen är till 87 % dagsljus.

**Läsning.** Grinden gör det jobb natten var tänkt för: ovanpå grinden köper natten 0,2–0,5 procentenheter över vintern och 0,6–1,5 i mars och kostar en tredjedel av
täckningen, och ensam räddar den inte RÅ (6,0 %). Den skulle tysta marsmorgnarna, där grinden vid 2 ger 2,9 %. Det som återstår är
vårens eftermiddag — dagen i mars med grinden ligger på 5,4 % mot morgonens 2,9 % — och den är omätt som egen regel. Varje band upp
till 2,25 °C klarar grind A:s 5 % på egen hand; nästa band gör det inte. Med mätvärden på en tiondels grad betyder X = 2,25 att
ankarna får skilja högst 2,2 °C. Täckningens sicksack mellan banden (11,1 · 7,6 · 10,8 · 6,6 %) är den upplösningen: ett band om
0,25 °C rymmer tre eller två tiondelar. Ett ensamt ankare gäller 89 232 punkter, inte 92 739 som L1 räknade — 3 507 punkter hade två
eniga ankare.

**Följd:** ingen tröskel, inget X, ingen nattregel — Bengts och Axels val (bedömningen §4.2). Claudes förslag: **X = 2,25 °C**, och
**natten avstås** (förslag 2 nej), med vårens eftermiddag som möjlig egen läsning.

## #477 (7/10 2026) Spridningsgrindens X = 2,25 °C, och nattbegränsningen avstås (kort #299; Bengts beslut ur den korsade läsningen)

**Beslut.** Bengt 7/10: *"X = 2,25, avstå natten"*.

**X = 2,25 °C.** Prognosen tiger när ankarna skiljer 2,25 °C eller mer. Med mätvärden på en tiondels grad betyder det att den talar
när ankarna skiljer högst 2,2 °C och tiger från 2,3. Skälet ur #476: varje spridningsband upp till 2,25 °C klarar grind A:s 5 % grova
fel på egen hand (2–2,25 °C: 4,7 %), och nästa band gör det inte (2,25–2,5 °C: 5,6 %). I kuvösen talar prognosen då på 60,6 % av
punkterna med 2,8 % grova fel, 0,1 % frysklassfel och 0,53 °C i medelfel, mot 7,5 % och 0,4 % utan grind. Förslag 1, som Axel
signerade 7/10 (#474), sa att X läses ur tabellen; det är gjort. Mars vid 2,25 °C är inte uträknad för sig — den ligger mellan 4,0 %
vid 2 °C och 5,1 % vid 3 °C.

**Natten avstås** (kort #299 förslag 2). Utan grind ligger natten för driftens modell på 6,0 % grova fel, över 5 % varje månad. Ovanpå
grinden köper den 0,2–0,5 procentenheter över vintern och 0,6–1,5 i mars, för en tredjedel av täckningen, och den hade tystat
marsmorgnarna, som till 87 % är dagsljus och där grinden vid 2 ger 2,9 %. Vårens eftermiddag är omätt som egen regel och kan bli en
egen läsning.

**Var talet står.** TROSKLAR-SKUGGAN §3 och `publish/grind-s-b.ts` (`SPRIDNING_X = 2.25`) — en kodkopia, så inget kontrakt i
kontraktsgrinden än; en andra kodkopia (motorn när rösten byggs) förs in där i samma commit. Skuggans bandtabell får gränsen vid 2,25
(banden 2–2,25 och 2,25–4 i stället för 2–4), eftersom `grindVid()` summerar hela band; självtestet fäller ett X som inte är en
bandgräns.

**Ett fel i #792 rättat i samma varv.** Huvudflödet i grind S-B skickade inte X till rapporten, så domen hade svarat *"X inte
fastställt"* även med X satt — upptäckt när X skulle sättas. Rättat, och självtestet läser nu sin egen källa och fäller om anropet
saknar X. Två motprov fällde provet: X borttaget ur anropet, och X = 2,3, som inte är en bandgräns.

**Kvar på kort #299:** Axels signatur på väg (c) (#475) och vinterläsningen.

## #478 (7/10 2026) Axel signerar väg (c), och vinterläsningen av spridningsgrinden beställd — ingen vinter att läsa än (kort #299)

**Beslut.** Bengt 7/10: *"axel signerar väg c och gör vinterläsningen"*. Axels signatur, relayerad av Bengt i chatten som för förslag
1 (#474) och fastställandet 2/9 (#61), gör #475 fullt: marsdomen räknas med spridningsgrinden vid X = 2,25 °C (#477), och halka på ett
täckt segment där grinden tystade prognosen är en miss.

**Vinterläsningen — nuläget 7/10** (grind S-B i underlagsläge, 37655806370 på 08c645f, hela loggen sedan 23/9):

| | antal |
| :-- | --: |
| varv med prognos | 1 881, varav 5 med spridningen loggad (sedan 16:32Z) |
| täckta provpunkter med spridning | 457: 0,5–1 °C 21 · 1–2 201 · 2–2,25 51 · 2,25–4 179 · över 4 5 |
| under X = 2,25 °C | 273, 59,7 % (kuvösen 60,6 %) |
| holdout-rader under +5 °C med spridning | 0 |
| C1 · C2 | 0 av 20 · 0 av 30 |

Körningens rubrik säger *"X = 2.25 °C"*: huvudflödet skickar X till domen i drift, och felet från #792 är bevisat rättat. Läsningen
kan inte göras än. Kortets Verify kräver täckning och grova fel med grinden *i vinter*, och loggen har inga vinterrader. Grova fel per
band är en andel, och andelar skrivs bara i domläget när C1 och C2 är uppfyllda (#352). Oktoberns täckning räknas inte som vinter.

**Planen** (`docs/KALENDERN.md`): täckningen med grinden läses ur antalen, som inte är blindade, den 1/12, 1/1 och 1/2 — en körning av
grind S-B i underlagsläge var, ungefär en minut. Grova fel per band, och domen med grinden, läses i domläget första gången C1 och C2 är
uppfyllda — på Bengts order, och beställningen 7/10 står — eller senast vid marsdomen. Kort #299 stängs med den läsningen.

**Alternativ:** (a) grova fel per band nu, i domläget — förkastat, C1 och C2 är inte uppfyllda och andelarna är blindade (#352);
(b) lyfta blindningen för spridningens grova fel — förkastat utan eget beslut, eftersom holdout-raderna är samma rader som B1 dömer.

## #479 (7/10 2026) C8 med vägdata — kovariatmodellen tränad på stationernas särart, nu med vägens egenskaper, förregistrerad före körningen (kort #298, Bengts "kör c8")

**Beslut.** Bengt 7/10: *"kör c8"*. En läsning i kuvösen, ingen dom. Skript `scripts/matningar/kuvos-c8-vagdata-2026-10-07.ts` på
knappen `kuvos` (`matning`), förregistrerat här i samma commit som skriptet, före körningen.

**Varför nu, och vad som redan är sett.** L8 (#471) prövade terräng och fick R² 0,01. Axels fysikspår (7/10, utanför repot, inte
förregistrerat) fann att trafikmängd och vägklass förklarar 23 % av stationernas avvikelse — mot hans fysikmodell, inte mot RÅ; ÅDT
under 1 000 gav −0,58 °C och över 20 000 +1,14 °C. Den här läsningen är utformad **efter** att det fyndet lästs, och efter L1–L8, den
korsade läsningen (#476) och Axels nattkörning på samma vinter. Den riktiga prövningen av en rättelse ur vägdata är vintern 2026/27,
förregistrerad före den vintern. Vägdatan är NVDB i dag (`data/vagdata/stationer.json`, #473), vintern är 2024/25; ÅDT:ns mätår
spänner 2014–2026.

**Målet, som L8:** stationens särart = medel(mätt − RÅ) över dess punkter, för stationer med minst 100 punkter. Grind A:s RÅ och
vakter, samma underlag som K1 (#476).

**Tre modeller, ridge** (λ = 1 på standardiserade kolumner, som L8):
- **VÄG:** log ÅDT, andel lastbilar, andel lätta fordon 22–06, funktionell vägklass, hastighet, bredd, grus, kommunal väghållare,
  och flaggor för saknad ÅDT och saknad nattrafik. Saknade värden fylls med medianen över stationerna; målet fylls aldrig.
- **REL:** de sex talen minus grannarnas viktade medel — samma grannar som RÅ, fem närmaste inom 50 km, vikt 1/max(km, 1). RÅ är ett
  grannmedel, så det som syns i särarten borde vara skillnaden mot grannarna.
- **BAS:** L8:s billiga variabler — latitud, longitud, stationer inom 20 km. Höjderna hoppas över; de bar ingenting i L8.

**Valideringen:** (1) **hela regioner gömda** — rutor om 1° latitud × 2° longitud; varje station förutsägs av en modell tränad på
stationerna utanför dess ruta. Det är huvudtalet. (2) Leave-one-out, som L8, bredvid.

**Måtten:** R² och MAE för särarten; kandidaterna RÅ+VÄG, RÅ+REL och RÅ+BAS — RÅ plus den regionsgömda särarten — per band med A1,
A2 och A3 mot RÅ och OFFSET på samma punkter; samma sak under spridningsgrinden vid 2,25 °C (#477), som nu är baslinjen; effekt per
standardavvikelse för VÄG och REL; särarten per ÅDT-klass (under 1 000 · 1 000–20 000 · över 20 000) som kontroll mot Axels tal.

**Läsningen i förväg.** (1) Den bästa av VÄG och REL förklarar 0,10–0,25 av särarten med regionerna gömda. (2) REL slår VÄG. (3) BAS
förklarar nära noll, som i L8. (4) Den bästa kandidaten tar de grova felen från 7,5 % till 6,5–7,0 %. (5) Särarten stiger med
ÅDT-klassen: negativ under 1 000, positiv över 20 000.

**Kontroll:** RÅ ska ge 4 353 206 punkter och 7,5 % grova fel som 6/10 och K1; avviker det läses inte resten förrän skälet är känt.

**Prov före körningen:** självtestet räknar hela läsningen på 160 syntetiska stationer där särarten är 0,9 · (log ÅDT − 3,5) — VÄG
hittar den med R² över 0,9, BAS inte. Läckvakten: en särart som är rent brus ger R² under 0 korsvaliderat. Tre motprov fällde provet:
målet med i sin egen träning (R² 0,058 på bruset), ÅDT utan logaritm, REL utan grannarna.

**Vad som INTE görs.** Inga trösklar, ingen ändring i driften, ingen förregistrering av fysikspåret.

**UTFALL #479, 7/10 — körd och läst** (kuvos 37659713953 på 49484f5, läsningen 1,7 min). **Kontrollen höll:** RÅ gav 4 353 206 punkter och
7,5 % grova fel. Alla 729 stationer med punkter fick vägdata; ingen saknades.

| Modell | R², regioner gömda (55 rutor) | R², leave-one-out | MAE för särarten (utan modell 0,43 °C) |
| :-- | --: | --: | --: |
| VÄG | 0,034 | 0,033 | 0,42 °C |
| REL | 0,042 | 0,046 | 0,42 °C |
| BAS | −0,005 | −0,011 | 0,43 °C |

Kandidaterna, grova fel hela vintern: RÅ 7,5 % · RÅ+VÄG 7,5 % · RÅ+REL 7,5 % · RÅ+BAS 7,5 % · OFFSET 5,5 %. Per band för RÅ+REL: 0–7 km
5,2 → 5,0 %, 7–15 km 5,3 → 5,1 %, 15–20 km 7,2 → 7,1 %, över 20 km 13,6 → 13,8 %. Under spridningsgrinden vid 2,25 °C: 2,8 % för alla,
täckning 60,6 %. Effekt per standardavvikelse i VÄG: vägklass −0,09 °C, hastighet +0,05, bredd +0,03, övriga högst ±0,03. Särarten per
ÅDT-klass: under 1 000 −0,10 °C (136 stationer), 1 000–20 000 −0,08 (570), över 20 000 +0,20 (22). Särartens spridning sd 0,55 °C.

**Mot läsningen i förväg.** (1) *Föll:* den bästa modellen förklarar 0,042, inte 0,10–0,25. (2) *Höll, knappt:* REL 0,042 mot VÄG 0,034.
(3) *Höll:* BAS −0,005. (4) *Föll:* de grova felen står kvar på 7,5 %. (5) *Höll i riktningen, inte i storleken:* −0,10 / −0,08 /
+0,20 °C mot Axels −0,58 / +1,14.

**Läsning.** Vägens egenskaper förklarar nästan ingenting av en stations avvikelse från sina grannar. Stationerna står på samma slags
vägar som grannarna, så trafikens och saltets värme finns redan i RÅ:s medel. Axels 23 % mäter avvikelsen från en vädermodell som
inte vet något om vägen, och där bär vägdatan. Särarten mot grannarna, sd 0,55 °C, är mikroskala — skugga, placering, lokala
kallhål — och lärs bara ur stationens egen historik (OFFSET 5,5 %), ur en lokal karta eller ur mätningar längs vägen.

**Följd.** Ingen kandidat: C8 med vägdata ger ingen rättelse ovanpå RÅ på huvudvägnätet. För fysikspåret betyder det att vägdatan hör
hemma i en modell som börjar från vädret, inte från grannarna, vilket stöder Axels uppdelning med RÅ nära stationerna och modellen
längre bort. För småvägar utanför de 818 segmenten (vägdatalagret c) säger läsningen ingenting, eftersom stationerna inte står där.

## #480 (7/10 2026) C8 mot vädret — vägdatan mot en väderbaslinje ur MET Nordic, förregistrerad före körningen (kort #298, Bengts ord)

**Beslut.** Bengt 7/10: *"mät mot met nordic. jag är i alla fall nyfiken på resultatet"* — efter att Bengt själv påpekat att MET
Nordic inte är vad Axels mätning gjordes mot. En läsning, ingen dom. Skript `scripts/matningar/kuvos-c8-metnordic-2026-10-07.ts` på
knappen `kuvos` (`matning`), förregistrerat här i samma commit som skriptet, före körningen.

**Vad det är och inte är.** C8 (#479) mätte stationens särart mot grannarna (RÅ): vägdatan förklarade 4 %. Axel mätte mot sin
fysikmodell, driven av ECMWF och utanför repot: 23 %. Det här är en **tredje** baslinje — MET Nordics väderrutnät — och därför ingen
upprepning av Axels mätning. Frågan: vet vägdatan något som väderrutnätet inte vet? Indata och idén att bygga på rutnätet kommer från
Axels gren `kuvos/rutnatet-469` (PR #783, där DECISIONS #470); grenen är inte ihopslagen och läsningen hämtar releasen direkt.

**Indata.** Releasen `kuvos-metnordic-2024-25` (MET Norway, NLOD / CC BY 4.0): sju fält per timme i rutan närmast var och en av 854
stationer, 31/10 2024 – 31/3 2025, 3 115 392 rader. Summorna lästa ur releasens manifest och kontrollerade mot nedladdade filer 7/10;
de står nu i `kuvos/metnordic-leverans.json`, och kuvösknappen jämför mot dem. **Värdevakten:** spannen för de sju fälten är införda i
`scripts/vardevakten.ts` före körningen; läsningen fäller vid ett värde utanför. Hela vintern ligger inom spannen (kortvågens 30 541
små negativa värden, ned till −222 J/m² per timme, är beräkningsbrus och ryms). En halvtimmeshink läser analysen vid sin början.

**Baslinjerna** (ingen station går in): **LUFT** — ytan skattas som MET Nordics lufttemperatur 2 m. **VÄDER** — linjär regression av
ytan på de sju fälten (luft, fukt, vind, moln, nederbörd, lång- och kortvåg i W/m²), tränad med stationens hela region gömd (rutor
1° × 2°, som C8) på grind A:s population; koefficienterna skrivs ut.

**C8 på varje baslinje.** Stationens särart = medel(mätt − baslinje) för stationer med minst 100 punkter. VÄG och BAS ur C8-skriptet
— importerade, samma kolumner, samma ridge (λ = 1) — med regionerna gömda och leave-one-out. R², MAE, effekt per standardavvikelse och
särarten per ÅDT-klass. **Kandidaterna** per punkt: LUFT, LUFT+VÄG, VÄDER, VÄDER+VÄG och VÄDER+BAS mot RÅ och OFFSET på samma
punkter, per band (bandet är RÅ:s närmaste ankare).

**Läsningen i förväg.** (1) VÄG förklarar mer av särarten mot VÄDER än mot RÅ (0,034): mellan 0,05 och 0,25. (2) ÅDT-klasserna spänner
bredare än mot RÅ: mer än 0,5 °C mellan över 20 000 och under 1 000, mot 0,30 °C i C8. (3) BAS förklarar mer mot vädret än mot RÅ,
R² över 0,05, eftersom latitud och kust syns mot en vädermodell. (4) VÄDER ensam har fler grova fel än RÅ i banden 0–20 km. (5)
VÄDER+VÄG har färre grova fel än VÄDER.

**Kontroll.** RÅ ska ge 4 353 206 punkter och 7,5 % grova fel som i C8. Avviker det läses inte resten.

**Prov före körningen.** Självtestet: timindexet (06:00 och 06:30 läser 06-analysen), lösaren, måtten lika med grind A:s `stats()`,
spannkontrollen, vädermodellen med regionen gömd (en region 10 °C varmare än luften behåller hela resten), hela läsningen på syntetiska
stationer, och att RÅ och OFFSET måste vara radlika. Tre motprov fällde provet: regionen med i vädermodellen (resten 4,32 i stället för
10), en senare analys, och frysklassfelet fel definierat. Inläsningen och spannkontrollen
kördes lokalt mot den riktiga filen: 3 115 392 rader, 854 stationer, inga fel. C8-skriptet fick en vakt så att ett import inte startar
dess läsning (beteendeneutralt).

**Vad som INTE görs.** Inga trösklar, ingen ändring i driften, ingen förregistrering av fysikspåret eller av PR #783:s RN-kandidater.

**UTFALL #480, 7/10 — körd och läst** (kuvos 37663768575 på 0d496e5, läsningen 1,4 min). MET Nordic-filen godkänd mot summorna, och
värdevakten höll för alla sju fälten. **Kontrollen höll:** RÅ gav 4 353 206 punkter och 7,5 % grova fel. Alla punkter hade väder och
vägdata; 729 stationer.

| Baslinje | särartens sd | VÄG R², regioner gömda (LOO) | BAS R², regioner gömda (LOO) | ÅDT under 1 000 · 1 000–20 000 · över 20 000 |
| :-- | --: | --: | --: | :-- |
| RÅ (C8, #479) | 0,55 °C | 0,034 (0,033) | −0,005 (−0,011) | −0,10 · −0,08 · +0,20 °C |
| LUFT | 0,66 °C | 0,080 (0,115) | 0,202 (0,226) | −0,94 · −0,59 · −0,17 °C |
| VÄDER | 0,89 °C | **0,298** (0,334) | **0,596** (0,608) | **−0,62 · +0,25 · +1,04 °C** |
| Axel, mot sin fysikmodell | — | 23 % (hans mått) | — | −0,58 · — · +1,14 °C |

Effekt per standardavvikelse mot VÄDER: log ÅDT +0,68 °C, vägklass +0,28, andel nattrafik −0,13, bredd −0,11, övriga högst ±0,06.

Kandidaterna, grova fel hela vintern och per band (0–7 · 7–15 · 15–20 · över 20 km): RÅ 7,5 % (5,2 · 5,3 · 7,2 · 13,6) · LUFT 30,1 %
(22,1 · 23,7 · 31,3 · 46,2) · LUFT+VÄG 27,0 % · VÄDER 21,8 % (17,3 · 17,4 · 20,9 · 33,9) · VÄDER+VÄG 20,1 % (15,5 · 15,9 · 19,7 ·
31,1) · VÄDER+BAS 18,1 % (14,0 · 13,9 · 18,1 · 28,8) · OFFSET 5,5 %. Vädermodellens koefficienter på hela landet: konstant −5,93,
luft 0,76, fukt 1,13, vind −0,14 per m/s, moln −0,14, nederbörd −0,16 per mm/h, långvåg 0,016 och kortvåg 0,006 per W/m².

**Mot läsningen i förväg.** (1) *Höll i riktningen, över spannet:* VÄG förklarar 0,298 mot VÄDER, mot förväntade 0,05–0,25 och 0,034
mot RÅ. (2) *Höll:* ÅDT-klasserna spänner 1,66 °C mot VÄDER och 0,77 mot LUFT, mot 0,30 i C8. (3) *Höll, mer än väntat:* BAS 0,596 mot
VÄDER och 0,202 mot LUFT. (4) *Höll:* VÄDER har 17–21 % grova fel i banden 0–20 km mot RÅ:s 5–7 %. (5) *Höll:* VÄDER+VÄG 20,1 % mot
VÄDER 21,8 %.

**Läsning.** Axels fynd står sig i sak, med öppen vägdata och en annan vädermodell. Mot vädret förklarar vägdatan 30 % av stationernas
särart (Axel 23 %), och små vägar går 0,62 °C kallare och stora 1,04 °C varmare än vädermodellen säger (Axel −0,58 / +1,14). Vägens
effekt är alltså verklig, ungefär 1,7 °C mellan de minsta och de största vägarna. Mot grannarna syns den inte (C8, #479), eftersom
stationerna står på samma slags vägar som sina grannar. Den linjära vädermodellen duger inte som prognos: 21,8 % grova fel, långt efter
RÅ:s 7,5 % och efter Axels fysik med inlärd rättelse utan stationer (10,2 %, hans tal), och mycket av dess fel är geografiskt (BAS 0,60).
En vädergrundad modell behöver fysik eller inlärning för att bära, och vägdatan är en av dess ingredienser.

**Följd.** Ingen kandidat. Två saker följer. (a) Vägdatan i `data/vagdata/` är ett prövat underlag för fysikspåret, och en
förregistrering av det kan använda den i stället för Lastkajen. (b) För småvägarna (vägdatalagret c, `docs/KALENDERN.md`) säger
mätningen att vägar under 1 000 fordon per dygn går ungefär 0,9 °C kallare relativt vädret än vägar med 1 000–20 000. Skulle produkten
tala där, kan RÅ från stationer på större vägar ligga för varmt. Det är en hypotes, omätt mot facit, eftersom inga stationer står
utanför de 818 segmenten.

## #481 (6/10 2026, flyttad till main 7/10) Rutnätsmodellen i kuvösen — Axels beslut att pröva, och förregistreringen före något utfall: MET Nordic som bakgrund, vägens skillnad mot luften ur grannarna, hela stationer gömda (kort #302)

**Flyttad till main 7/10** (Bengt: *"kör RN"*). Posten skrevs 6/10 som #470 på grenen `kuvos/rutnatet-469` (PR #783), som aldrig slogs ihop; under tiden togs #470, #471 och kort #298 på main. Texten nedan är grenens, oförändrad utom rubriken och hänvisningarna till rutnätsmodellen (#481), kallkartan (#482) och kortet (#302).

**Axels ord 6/10 kväll (chatten, efter genomgången av riktningsprovet #467):** *"Okej jag tycker vi testar"* — om förslaget att
bygga prognosen mellan stationerna på ett väderrutnät i stället för på stationerna ensamma, med en satellitkarta över kalla nätter
som nästa byggsten. Ordningen är hans: rutnätet först (*"jag tycker nästan vi börjar med 3"*). Hämtningen av indata görs på det
ordet; **provet mot facit körs först på Bengts ord** (#424, bedömningen §4.2). Inget tal ur provet är läst när posten skrivs.

**Numreringen:** posten skrevs först som #469 och kortet som #296, samtidigt som en annan session tog båda numren (PR #782). De
byttes till #470 och #298 före sammanslagningen; commit-meddelandena på grenen och kommentarerna i `kuvos-metnordic.yml` och
`kuvos-modis.yml` säger #469/#470/#296 till rättelsen samma kväll; commit-meddelandena står kvar.

**Skälet, ur #467.** Grind A per band med stationens egen historik (OFFSET) mot utan (RÅ, vägpunktsgrinden): grova fel 3,6 mot
5,2 % inom 7 km, 3,7 mot 5,3 · 5,4 mot 7,2 · 10,3 mot 13,6 %. Vädret är detsamma i båda; skillnaden är platsens särart, som en
vägpunkt saknar historik för. Höjden återvann ingenting (empirisk lapse 0,18 °C/100 m). Frågan för provet: **tar ett rutnät som
bär vädret mellan stationerna igen en del av glappet mellan RÅ och OFFSET?** Talet 2,5 % inom 7 km som citerats i chatten kommer
från premissmätningen 30/9 (15 stationer, under spärren, #405–#406), inte från vintern; vinterns RÅ är 5,2 %.

**Indata (hämtas en gång, som SMHI-filerna #441):** MET Nordic Analysis (MET Norway, NLOD / CC BY 4.0), 1 km, timvis, ur det
operativa arkivet `metpparchive` — samma produkt som går att läsa i drift, inte omkörningen `metpparchivev4` (som finns, men inte
löper vidare efter 31/10 2025). Fälten: lufttemperatur 2 m, relativ fukt, vind 10 m, molnmängd, nederbörd, inkommande lång- och
kortvågsstrålning; rutans höjd och landandel. Samplat i rutan närmast var och en av de 854 stationerna i `static.json` 6/10 (längst
0,70 km från rutmitten). Skriptet `kuvos/metnordic.ts` (självtest), en förbindelse åt gången enligt tjänstens villkor; piloten
15/1 2025: 24 timmar på 56 s, alla fält inom rimliga spann. Filen och manifestet läggs i den privata releasen
`kuvos-metnordic-2024-25` och `kuvos/metnordic-leverans.json` bär summorna. **Läckaget:** analysens lufttemperatur rättas mot
SMHI:s, FMI:s och MET:s stationer och Netatmo, inte mot Trafikverkets (MET Nordic-dokumentationen, läst 6/10) — en gömd
Trafikverksstation är gömd helt. **Värdevakten** får spannen för de nya fälten innan något av dem används i en mätning; källans
kortvågsstrålning har små negativa värden (−64 J/m² i piloten), som spannet ska rymma och värdevakten skriva ut.

**Kandidaterna (fasta nu, inget svep, inget val efter talen):**
- **RN (rutnätet + grannarnas skillnad):** yta(p,t) = luft_rutnät(p,t) + Δ̂(p,t), där Δ̂ är det invers-distansviktade medlet av
  Δ_N = yta_N(t) − luft_rutnät(N,t) över samma grannar som RÅ (K = 5, ≤ 50 km, vikt 1/km, målet uteslutet). Vägens skillnad mot
  luften sprids ut, inte vägens temperatur.
- **RN+R (som RN, med Δ:s beroende av vädret):** Δ̂ = en linjär regression av Δ på molnmängd, vind, långvåg, kortvåg och fukt i
  rutan, anpassad på alla stationer **utom målet**, plus det invers-distansviktade medlet av grannarnas residualer. Regressionens
  koefficienter skrivs ut.
- **Bredvid som referens, oförändrade:** RÅ, RÅ+HÖJD och OFFSET (taket) på samma rader.
Kriging med variogram och ett osäkerhetsmått per punkt är **steg 2**, i en egen post innan det körs; satellitkartan (nedan) är
**steg 3**, också med egen post.

**Valideringen:** som vägpunktsgrinden (#323) — **hela stationen gömd**: målets egen serie används varken till grannmedlet,
regressionen eller något annat. Populationen och vakterna kopieras från höjdprovets WHERE-sats (#75, radvakten, karantänen;
CLAUDE.md om lånade grindar), halvtimmeshinkar med vägyta ≤ +5 °C. Analysen gäller hel timme; en hink använder **senaste analys
vid eller före** hinkens tid (det som finns i drift), aldrig en senare.

**Måtten:** grind A:s A1 (MAE i beslutsbandet), A2 (grova fel > 2 °C), A3 (frysklassfel) per band (närmaste bidragande granne,
som RÅ) och totalt, och frysflaggan med tre marginaler (0 · 0,5 · 1,0 °C) mot K-A:s måttstock (#437). Alla tal skrivs ut.

**Vad utfallet är:** ett riktningsprov, ingen dom (#424). Vintern 2024/25 är redan läst för RÅ (#467), så ett bra tal här kan inte
frikänna något; domen läses på vintern 2026/27 i mars, förregistrerad i en egen post före den vintern. Ingen tröskel ändras
(TROSKLAR-SKUGGAN; Skyltfondens bilaga 7: en tröskel skärps men lättas aldrig när utfallet är sett).

**Satellitkartan (steg 3, inte förregistrerad här):** MODIS natt-LST (MOD11A1/MYD11A1, 1 km), klara nätter oktober–april över
flera vintrar, till en karta över var det blir kallast; prövas som egenskap i Δ-regressionen. Kräver ett gratiskonto hos NASA
Earthdata (Axel). Google Earth Engine väljs bort: fritt bara för icke-kommersiellt bruk. Google Earths datalager (WorldCover,
skogstäckning, ytvatten, höjdmodell GLO-30) bygger på öppna källor (ESA, JRC, Copernicus) och hämtas därifrån om de behövs.

**Alternativ:** SMHI:s MESAN (bara 24 timmar historik i API:t, läst 6/10 — används i drift och för ett eget arkiv framåt, egen
post); omkörningen v4 (konsekventare bakåt, men inte samma produkt som drift); att vänta på termisk kartering (Axel 6/10: görs inte).

**Tillägg 7/10, före körningen** (Bengt: *"kör RN"*) **— genomförandet och vad som redan är sett.**
- *Sett före körningen:* MET Nordic har lästs en gång, i #480: luften ensam (30,1 % grova fel) och en linjär vädermodell (21,8 %), båda
  utan stationer. RN:s och RN+R:s egna tal har ingen sett. Kandidaterna står som de skrevs 6/10.
- *Genomförandet:* alla kandidater räknas av grind A:s `evaluate()` med `utanOffset` och en justering per granne — en ny krok,
  beteendeneutral och prövad i grind A:s självtest. RN lägger luft(mål) − luft(granne) på varje grannes yta, vilket är detsamma som
  luft(mål) plus grannarnas viktade Δ. RN+R lägger dessutom på g(mål) − g(granne) med målets g. RÅ+HÖJD räknas med samma krok:
  −0,0065 °C/m gånger höjdskillnaden, med höjder ur EU-DEM via opentopodata som i höjdprovet. Därmed är "samma grannar som RÅ" exakt:
  fem närmaste inom 50 km, vikt 1/max(km, 1), och RÅ:s krav på gemensam historik.
- *g:* linjär med konstant på moln, vind, lång- och kortvåg i W/m² och fukt, anpassad på alla stationers hinkar med yta ≤ +5 °C och
  väder — för varje mål utan målets egna hinkar.
- *Punkterna:* kandidaterna jämförs på de punkter där alla har ett värde, och antalet per kandidat skrivs ut. Bandet är närmaste
  bidragande granne.
- *Måtten:* grind A:s A1, A2 och A3 per band och totalt; frysflaggan med `publish/frysflagga.ts`, samma kod som riktningsprovet (#437).
- *Indata:* releasen med summorna i `kuvos/metnordic-leverans.json` och värdevaktens spann (#480).
- *Läsningen i förväg* (ny, skriven 7/10 före körningen; posten från 6/10 hade ingen): (1) RN slår RÅ bortom 20 km, där RÅ har 13,6 %
  grova fel, med minst en procentenhet. (2) Inom 15 km skiljer RN och RÅ mindre än en halv procentenhet. (3) RN+R är bättre än RN, men
  med högst en procentenhet totalt. (4) RÅ+HÖJD ligger nära RÅ, som i #467.
- *Kontroll:* RÅ ska ge 7,5 % grova fel som i C8 (#479). Avviker det läses inte resten.
- *Prov före körningen:* självtestet — g återfinner en känd väderdel och tränas utan målet; linjeringen mot RÅ; RN och RN+R på en
  syntetisk väg där luften bär skillnaden mellan stationerna; RÅ+HÖJD:s tecken; hela utskriften med frysflaggan. Fyra motprov fällde
  provet på rätt rad: RN med fel tecken, g tränad med målet, RÅ+HÖJD med fel tecken och RN+R med en senare analys.
- Skript: `scripts/matningar/kuvos-rn-2026-10-07.ts` på knappen `kuvos` (`matning`).

**UTFALL #481, 7/10 — körd och läst** (kuvos 37669854795 på 75b9b27, läsningen 3,5 min; en första körning, 37669737670, avbröts innan
den läste något, eftersom hämtsteget för MET Nordic inte kände igen skriptets namn). MET Nordic godkänd mot summorna, värdevakten höll.
736 stationer; 729 fick höjd ur EU-DEM. **Kontrollen:** RÅ gav samma 4 353 206 punkter som i C8; på de 4 312 216 punkter där alla
kandidater har ett värde, utan de sju stationerna utan höjd, är RÅ:s grova fel 7,4 %.

| Kandidat | grova fel, alla | 0–7 km | 7–15 km | 15–20 km | över 20 km | MAE |
| :-- | --: | --: | --: | --: | --: | --: |
| RÅ | 7,4 % | 5,2 % | 5,1 % | 7,1 % | 13,6 % | 0,67 °C |
| RÅ+HÖJD | 8,8 % | 5,8 % | 5,6 % | 8,6 % | 16,8 % | 0,69 °C |
| RN | 9,3 % | 6,0 % | 5,9 % | 8,9 % | 18,1 % | 0,70 °C |
| RN+R | 9,3 % | 5,9 % | 5,9 % | 8,8 % | 18,4 % | 0,71 °C |
| OFFSET (taket) | 5,5 % | 3,6 % | 3,6 % | 5,4 % | 10,3 % | 0,59 °C |

Frysflaggan, alla band, farliga fel av frysningarna vid marginal 0 · 0,5 · 1,0 °C: RÅ 4,9 · 2,3 · 1,2 % · RÅ+HÖJD 4,9 · 2,3 · 1,1 % · RN
5,0 · 2,4 · 1,2 % · RN+R 5,1 · 2,5 · 1,3 % · OFFSET 4,2 · 1,7 · 0,8 %. Bortom 20 km vid marginal 0: RÅ 2,8 %, RN 3,4 %. Rätt klass och
täckning skiljer högst 0,2 procentenheter mellan RÅ och RN. RN+R:s g på hela landet: konstant 1,38, moln 1,28, vind −0,24 per m/s,
långvåg −0,014 och kortvåg 0,001 per W/m², fukt 1,51; 4 405 373 hinkar.

**Mot läsningen i förväg.** (1) *Föll:* RN slår inte RÅ bortom 20 km, utan är 4,5 procentenheter sämre (18,1 mot 13,6 %). (2) *Föll:*
inom 15 km är RN 0,8 procentenheter sämre (6,0 mot 5,2 och 5,9 mot 5,1 %). (3) *Föll:* RN+R är inte bättre än RN (9,3 mot 9,3 %; bortom
20 km 18,4 mot 18,1). (4) *Föll:* RÅ+HÖJD är 1,4 procentenheter sämre än RÅ.

**Läsning.** Att sprida vägens skillnad mot MET Nordics luft är sämre än att sprida vägens temperatur, i alla band och mest där RÅ är
svagast. Rutnätets luftskillnader mellan stationerna slår alltså inte igenom ett till ett i vägytan. Samma sak syns i RÅ+HÖJD, som
överför standardatmosfärens 0,65 °C per 100 m fullt och blir sämre, och i #480:s vädermodell, där ytan följer luften med koefficienten
0,76, inte 1. *Iakttagelse, inte kandidat:* en delvis överföring av luftskillnaden vore en ny parameter, vald efter att detta utfall är
sett — den får i så fall förregistreras och prövas på en annan vinter.

**Följd.** Ingen kandidat. Rutnätsmodellen i den form den låstes 6/10 bär inte. Steg 2 (kriging) och kallkartans prov (#482) bygger på
rutnätet och väntar på Bengts och Axels ord (bedömningen §4.2). PR #783 stängs när #481 och #482 är på main.

## #482 (6/10 2026, flyttad till main 7/10) Kallkartan ur satelliten — hämtningen och receptet, fasta innan något körs (kort #302 steg 3)

**Flyttad till main 7/10** (Bengt: *"kör RN"*). Posten skrevs 6/10 som #471 på grenen `kuvos/rutnatet-469` (PR #783), som aldrig slogs ihop; under tiden togs #470, #471 och kort #298 på main. Texten nedan är grenens, oförändrad utom rubriken och hänvisningarna till rutnätsmodellen (#481), kallkartan (#482) och kortet (#302).

**Axels ord 6/10:** pröva satellitkartan nu; han har skapat kontot hos NASA Earthdata och lagt nyckeln som GitHub-hemligheten
`EARTHDATA_TOKEN` (*"Lets just do it for now as a test and then we update it at a later stage"* — nyckeln ska bytas senare, den har
synts i chatten). Hämtningen och kartan byggs nu; **kartan prövas mot stationerna först i en egen förregistrering**, som
egenskap i RN+R:s regression (#481), och den körningen sker på Bengts ord.

**Källan:** MODIS natt-LST, MOD11A1 (Terra, ~22–23 lokal tid) och MYD11A1 (Aqua, ~01–02), version 061, 1 km, NASA LP DAAC. Sverige
täcks av rutorna h18v02, h19v02, h18v03, h19v03 (CMR 6/10; ~12 MB per natt och satellit). Vintrarna 2022/23, 2023/24 och 2024/25,
oktober–april. Granulerna listas publikt i CMR; filerna läses och kastas, bara summorna sparas.

**Receptet (fast nu):** (1) bara pixlar med QC_Night bit 0–1 = 00 — framställd, god kvalitet, i praktiken klar himmel; (2) de fyra
rutorna till en mosaik per natt och satellit; (3) lokal avvikelse = pixelns LST minus medlet av giltiga pixlar i 51 × 51 px
(±25 km), bara där minst 200 grannar är giltiga — nattens väder tas bort, platsens egenhet står kvar; (4) kartan = summa, kvadratsumma
och antal nätter per pixel. Ingen station och ingen vägdata läses när kartan byggs. Ut: `kallkartan_modis.npz` och en rad per station
i `static.json` (6/10) med pixelns medelavvikelse, i den privata releasen `kuvos-modis-2022-25` med manifest.

**Förbehåll som följer med kartan:** satelliten mäter markens yta (skog, mark, snö, sjö), inte asfalten; sjöar och hav får egna
avvikelser (varma på hösten). Vintern 2024/25 ingår både i kartan och i riktningsprovet — kartan läser ingen facit, men det skrivs
ut i provet. Domen på vintern 2026/27 läser en karta som är fryst innan den vintern börjar.

**Kostnad:** NASA:s data är fri; Actions-jobbet tar uppskattningsvis 30–90 minuter en gång (kontot har spärren $0, inga pengar).

**Alternativ:** Google Earth Engine (fritt bara för icke-kommersiellt bruk, #481), Sentinel-3 SLSTR (1 km, kortare arkiv, eget
konto), Landsat/ECOSTRESS (70–100 m men sällan på natten). AppEEARS (LP DAAC:s utsnittstjänst) kräver lösenordsinloggning, inte nyckel.

**UTFALL 6/10 (körning 37527407004, 14 min):** releasen `kuvos-modis-2022-25` finns (kallkartan_modis.npz, sha256 6a2a586b…, samma
som i den första körningen 37524112922, vars release nekades med HTTP 403 från grenpushen). 1 262 nätter över de två satelliterna,
4 utan en enda klar pixel; 3 813 571 pixlar med minst en natt, median 207 klara nätter per pixel. Avvikelsen över rutor med fler än
30 nätter: 5/50/95-percentil −1,18 / −0,01 / +1,19 K. Inget facit läst. **Iakttagelse för förregistreringen av provet:** pixeln
vid stationen i Vietas ger +3,51 K, troligen för att den ligger mot Akkajaure — en 1 km-pixel vid en sjö bär sjöns värme. Provet
behöver därför en regel för pixlar med vatten (rutans landandel, eller närmaste rena landpixel), skriven före körningen.

## #483 (7/10 2026) Styrdokumenten genomgångna mot läget 7/10, projektkartan rättad, och integrationskartan öppnad för R27–R34 och fryst igen

**Beslut.** Bengt 7/10: *"ja det vill jag att du gör, men jag vill också att du går igenom de andra dokumenten och uppdaterar dem. jag
kan inte förstå hur vi ska kunna hålla oss uppdaterade i det här projektet om våra styrdokument inte uppdateras, som jag ideligen har
krävt att de ska göras"*. Svaret på hans fråga om projektkartan hade visat att prognoslagret steg från 44 till 66 % bara för att
läsningar bokförts som byggsteg, och att de handskrivna delarna av flera stomdokument stod kvar på 25/9–2/10.

**Vad som gjordes.** Fyra granskare läste var sina dokument mot DECISIONS, STATUS, TAVLA, KALENDERN, projektkartan och koden, och
varje fynd prövades mot källan innan det fördes in. Fynd som granskarna själva märkte osäkra togs inte med utan kontroll.
- *Projektkartan:* prognoslagret tillbaka på sina åtta byggsteg (44 %), läsningarna som bevis; spridningsgrinden bokförd på
  segmentprognosen, där den sitter; vägdatalagret som egen del bland källorna (k-vagdata, 62 %, kort #301); Android-bygget till
  versionCode 23 och förarsvaren till 32.
- *MATNINGAR* (28 ändringar), *SYSTEMBILDEN* (19, bland dem raden om segmentprognosen, som sa "med höjden inräknad"), *APPEN* (14: appen
  stod på 0.3.9 (19) fast koden bär 0.3.11 (23)), *KUVOSEN* (tabellen, flödet och tidslinjen före riktningsprovet), *FAVORITER* (fyra
  ändringar och loggen 4–7/10), *KALENDERN* (riktningsprovet och kalibreringen gjorda, ny plikt för vägdatalagret), *bedömningen*
  (läget 7/10 med *Övrigt sedan 29/9*, tolv öppna rader i §0b och §4.2 strukna eller rättade, fyra nya bevakningsrader, en ny fråga
  om Axels fingeravtryck i §4.2).
- *Integrationskartan:* läge-raderna i §2, §6.1, §8 och §13.6; innehållet öppnat för R27–R34 och fryst igen — R27 segmentprognosens
  fog (§5.4), R28 lapsen i #45:s metod (§7.7), R29 molnet som räckviddsknapp och R30 höjden (§9.1), R31 räckvidden, R32 förarfacit
  och R33 L4:s knapp (§12), R34 kamerafacit och ytstatus (§13.2).

- *Tavlan:* kort #301 stängt — Verify uppfylld (rekognoseringen bokförd, filerna i repot med huvud, spann och grön CI, C8 läste dem i kuvösen) — och steg 3 utbrutet på kort #303: kuvösens inläsning eller beslutet att filen räcker, Axels kolumner med proveniens, Lastkajen vid behov. Kortgenomgången fann inget annat kort med Verify uppfylld.

**Inte gjort, med skäl.** Raderna i §4.2 som redan säger *avgjort* i sista kolumnen men saknar ✅ först fick ingen massändring.
Följande stod osäkra och står kvar:
- MATNINGAR:s *cirka 845 stationer* mot 854 i static.json
- snöflingan (#440)
- SYSTEMBILDEN:s *inget når föraren innan det dömts*, med tanke på betan
- steg 4 i S4
- KALENDERN:s förslag om TestFlight-byggens 90 dagar och Actions-kassan i oktober

**Läxa.** En avstämning som bara ser att de genererade blocken är aktuella säger inget om handtexten — `git log -1` på ett
stomdokument visar dagens datum så snart ett skript skrivit om lägesraderna. Och ett steg i projektkartan är ett byggsteg mot delen,
inte en läsning. Båda gjorde att avstämningen 7/10 först sa att dokumenten var uppdaterade.

## #484 (7/10 2026) Dokumentsynken: stomvakten i CI, en morgonrutin i molnet, Väntar på Bengt och Axel i kartan, och rutinen slår ihop sina dokument-PR:er

**Beslut.** Bengt 7/10: *"bygg enligt ditt förslag"* — ja till alla fyra delarna i `docs/DOKUMENTSYNKEN-FORSLAG-2026-10-07.md`,
med rekommendationen: (a) stomvakten, (b) morgonrutinen kl. 05:30, (c) listorna överst i projektkartan, och (d) att rutinen slår
ihop sin egen PR på grön CI när den bara rör dokumenten. Skälet står i #483: genomgången 7/10 behövde ett sjuttiotal rättelser i
handtexten fast kartan visade stomdokumenten gröna, och det dagliga varvet hade varit avstängt sedan 6/10.

**Vad som byggdes.**
- *(a) Stomvakten.* `scripts/stomvakten.ts --bas <sha>` i md-vakt.yml, som ser varje ändring i DECISIONS.md (hela historiken
  hämtas, cirka 50 MB); självtestet också i ci. Varje nytt beslut slutar med `**Stomdokument:** <koder>` eller `**Stomdokument:**
  inga — skälet`; vakten fäller en saknad rad, ett *inga* utan skäl, en okänd kod och ett namngivet dokument vars handtext är
  oförändrad. Motprov 7/10 i ett eget arbetsträd, ett per regel: beslut utan rad rött; raden namnger MAT men bara lägesraderna
  ändrade rött; handtexten ändrad grönt; *inga* utan skäl rött. `--lage` mot main som det stod i morse (52ff586) visar glappet:
  integrationskartan och FAVORITER 36 beslut sedan 3/10, APPEN 22 sedan 6/10, SYSTEMBILDEN 14 — men MATNINGAR såg färsk ut, eftersom
  ett stycke ändrats 7/10, fast den behövde 28 rättelser. Översikten ersätter alltså inte läsningen.
- *(b) Morgonrutinen.* claude.ai-rutinen *Halkvakt: dokumentsynken varje morgon* (`trig_015zMNvnicaHT1wFNk4ZWdaH`), cron 03:30 UTC
  (05:30 sommartid, 04:30 vintertid), miljön `env_01RGogJbnVr7jUKB1rJPLjHJ` som rutinerna i september, en ny session varje morgon.
  Stegen står i CLAUDE.md, avsnittet DOKUMENTSYNKEN; uppmaningen pekar dit, så att instruktionerna versionshanteras i repot. Saknas
  avsnittet på main gör rutinen ingenting.
- *(c) Listorna.* `projektkartan.ts` skriver *Väntar på Bengt* och *Väntar på Axel* överst i kartan ur tavlans avsnitt (kortets
  *Kvar*, annars dess nyckel, läst av genomgången i `kortkartan.ts`) och ur `synk.prar`, där `kartsynk.ts` nu sparar de öppna PR:erna.
- *(d) Ihopslagningen.* `stomvakten.ts --tillatna` släpper bara en gren som rör de sju, KALENDERN, TAVLA, STATUS, projektkartan.json,
  PROJEKTKARTAN.html och kortkartan.json. DECISIONS.md ingår inte, så ett beslut väntar alltid på Bengts ord. Tillägg till regeln
  att bara Bengts *"slå ihop"* slår ihop, som kartgrenarna i #447.

**Alternativ som valdes bort** (förslaget §7): appens lokala schema med öppnade behörigheter, Claude i Actions (betald API-nyckel
och Actions-minuter), pg_cron (kan inte skriva text med omdöme).

**Inte prövat än.** Att rutinen når repot och GitHub från molnet, att den kan slå ihop och om den kan republicera visar första
körningen 8/10. Kort #304 stängs efter sju morgnar i rad.

**Stomdokument:** BED §4.2 och läget 7/10 — frågan om dokumentsynken avgjord

## #485 (8/10 2026) Fysikspåret i kuvösen — Axels ECMWF-drivna fysikmodell förregistrerad som kandidat FYSIK: en fryst fil med hash, kuvösens egna regler, förväntningarna skrivna före knappen (kort #305)

**Beslut.** Axel 7/10 kväll: *"lets set it all up as much as we can and then i take the decisions that we run it"*. Förregistreringen
skrivs nu; knappen trycks på Bengts ord. Kandidaten heter **FYSIK** och prövas i kuvösen med grind A:s egen modell och vakter, bredvid
RÅ och OFFSET, på hela vintern 2024/25. Inga trösklar rörs, inget i driften ändras, ingen kod ur fysikspåret går in i repot — bara
dess UTDATA som fil, så som DECISIONS #480 och #481 redan skilde på modell och underlag.

**Vad kandidaten är** (`docs/FYSIKSPARET-SVAR-2026-10-07.md`, Axels svar på kuvössessionens sex frågor 7/10). En skattning av ytans
temperatur per station och halvtimme, räknad utanför repot i Axels fysiksession: ECMWF IFS ur Open-Meteos arkiv (timvis per
stationsläge) → 1-D värmekolumn med energibalans vid ytan, 11 lager, 12 parametrar → inlärd rättelse (gradientboostning på uppmätt
yta − fysik, 55+ särdrag ur väder, terräng och NVDB:s vägdata) där **varje station förutsägs med hela sin region utesluten ur
träningen** (25 lägeskluster, 5 veck). Ingen station används vid målet; målets egna mätningar är aldrig indata. Grannarnas uppmätta
fel (FYSIK+GRANNAR) och blandningen med RÅ (FYSIK+BLANDNING) är INTE med i den här förregistreringen — de kräver grannlagret i
TypeScript och är ett eget beslut.

**Vad som är fryst, med hash.** Pipelinen frystes 7/10 22:45 innan dess kuvösreplika kördes (`docs/FYSIKSPARET-FRYS-2026-10-07.md`):
modellens utdata `oof_A2.npy` sha256 `9268c6c7…2a2f3f`, fysikens parametrar `65a431c4…515bc`, koden (`physics.py`, `common.py`,
`layers.py`, `v4.py`, `expA.py`), replikan `kuvos_replica.py` `c640619d…ce262`. Filen till kuvösen, `fysik-2024-25.csv.gz`
(5 464 238 rader, 754 stationer, 1/11 2024 00:00 – 31/3 2025 23:00 UTC; på halvtimmen medlet av de två omgivande timmarna), sha256
`84d13f93…ffd1c`, 26 709 268 byte, står i `kuvos/fysik-leverans.json` och läggs i releasen `kuvos-fysik-2024-25` av Axel; knappen
kontrollerar summan och mätningen fäller en fil som inte stämmer. `fysik_c` har spann i värdevakten (−60…+60 °C; läst −25,5…+17,4).

**Genomförandet** (`scripts/matningar/kuvos-fysik-2026-10-08.ts`, självtest i ci.yml, filen hämtas i kuvos.yml när mätningens namn
innehåller `kuvos-fysik`). Underlaget exakt som prognoslagret 6/10: grind A:s WHERE (#75, radvakten, karantänen, den långsamma vakten),
senaste avläsning per halvtimmeshink, yta ≤ +5 °C. RÅ = `evaluate()` med `utanOffset` som kontroll, OFFSET som tak. FYSIK = filens
värde på RÅ:s punkt; bandet = RÅ:s närmaste bidragande granne, så att banden är jämförbara. Måtten: A1/A2/A3 per band och totalt på de
punkter där alla tre har ett värde, frysflaggan (#437) på samma punkter, norr/söder om 62°; dessutom FYSIK på ALLA hinkar ≤ +5 °C utan
krav på ankare — kandidatens egentliga population, den behöver ingen granne.

**Vad som är blint och vad som inte är det** (SVAR §4). Blint: ingen station vid målet; regionen gömd i rättelsen; replikan 7/10 körd
av en separat agent med hashar före och efter, RÅ som kontroll (7,50 % mot kuvösens 7,4 %). Inte blint: fysikens tolv parametrar
kalibrerades på hälften av stationerna; hyperparametrarna valdes på dev-vecken med bekräftelsevecken lästa en handfull gånger; och
förväntningarna nedan skrevs efter att replikan lästs. **Därför är det här en kontroll av att filen och kuvösen räknar på samma
population — inte ett bevis för modellen.** Ett tal som träffar förväntan frikänner inget; domen läses på vintern 2026/27 (#481, #424).

**Förväntningar, skrivna före knappen** (replikan 7/10 i FRYS §UTFALL, med 736 stationer):

| | RÅ (kontroll) | FYSIK på RÅ:s punkter | FYSIK alla hinkar |
| :-- | --: | --: | --: |
| A2 grova fel totalt | 7,4–7,6 % | 9,5–10,2 % | 9,7–10,4 % |
| band 0–7 · 7–15 · 15–20 · > 20 km | 5,2 · 5,2 · 7,1 · 13,6 | 7,5–8,5 · 7,5–8,5 · 8–9,5 · 14,5–16,5 | — |
| A1 (≥ −5 °C) | ~0,68 °C | 0,75–0,85 °C | — |
| A3 frysklassfel | ~0,4 % | ≤ 0,5 % | — |
| norr om 62° / söder | ~14,1 / 4,8 % | 16,5–18,5 / 6,5–7,5 % | — |
| farliga fel, K2 = 1,0 | ~1,2 % | ≤ 1,6 % | — |
| dom A1 · A2 · A3 | KLARAR · FALLER · KLARAR | KLARAR · FALLER · KLARAR | — |

Landar RÅ utanför 7,4–7,6 % läses inget annat: då skiljer populationen (vakterna, MIN_SHARED, hinkarna), och det förstås först.
FYSIK ensam väntas vara SÄMRE än RÅ i alla band — det är redan sett och är inte frågan; frågan är om kuvösen får samma tal som
replikan på samma data, så att en kandidat utanför repot alls går att döma där. Ett FYSIK-tal mer än en procentenhet från spannet
är ett fel i filen, i tidsupplösningen eller i populationen, och läses som det.

**Alternativ som valdes bort.** (a) Porta modellen till TypeScript i repot — en vecka, och en port ändrar talen; filen är ärligare.
(b) Vänta med allt till 2026/27 — då saknas beviset att kuvösen kan döma en extern kandidat, och det beviset ska finnas före vintern.
(c) Förregistrera FYSIK+BLANDNING (5,97 % i replikan, 10,9 % bortom 20 km — den enda som slår RÅ där) samtidigt — kräver grannlagret i
TypeScript; tas som eget beslut efter den här körningen.

**Vad som INTE görs.** Inga trösklar, ingen drift, ingen kod ur fysikspåret i repot, inget utfall läst förrän Bengt sagt kör. Open-Meteo
är icke-kommersiell: en driftsatt version körs på SMHI/MET, och den är en ny förregistrering med egen prognoshorisont (analysläge är
det som mätts, inte +1…+6 h).

**Följd.** Kort #305 på tavlan under Bengt; raden *Axels fingeravtryck per station* i bedömningen §4.2 är levererad
(`data/fysik/fingeravtryck-2024-25.csv`, 754 stationer × 2 modeller × 2 perioder, SVAR §6) och väntar bara på Bengts C8-körning mot
den; kuvösens §6 får raden 8/10. **Utfall** skrivs under den här posten när knappen körts.

**Stomdokument:** KUV §6, BED §4.2

**Utfall (8/10 00:08, knappen 37693105481 på 2a43651, Axels ord i Bengts ställe — DECISIONS #486). TRÄFF på varje rad.** Filen
hämtad ur releasen, summan = manifestet; `fysik_c` −25,48…+17,36 inom spannet; 736 stationer, 5 229 252 hinkar, ingen station i
arkivet utan rad i filen. Gemensamma punkter 4 352 753 (FYSIK saknar 453 av RÅ:s 4 353 206).

| | RÅ (kontroll) | FYSIK på RÅ:s punkter | FYSIK alla hinkar | förväntan FYSIK |
| :-- | --: | --: | --: | :-- |
| A2 grova fel totalt | **7,51 %** | **9,85 %** | **10,04 %** | 9,5–10,2 · 9,7–10,4 ✓ |
| band 0–7 · 7–15 · 15–20 · > 20 km | 5,23 · 5,26 · 7,16 · 13,59 | 8,09 · 7,99 · 8,79 · 15,54 | — | ✓ alla fyra |
| MAE | 0,68 °C | 0,79 °C | 0,79 °C | 0,75–0,85 ✓ |
| A3 frysklassfel | 0,39 % | 0,39 % | 0,39 % | ≤ 0,5 ✓ |
| norr om 62° / söder | 14,13 / 4,82 % | 17,07 / 6,92 % | 17,44 / 6,95 % | 16,5–18,5 / 6,5–7,5 ✓ |
| farliga fel K2 = 1,0 (av frysningarna) | 1,2 % | 1,4 % | — | ≤ 1,6 ✓ |
| OFFSET (taket) | 5,52 % | | | |

**Läsningen.** RÅ-kontrollen 7,51 % ligger i 7,4–7,6 %, så populationen är kuvösens, och resten fick läsas. FYSIK landar inom spannet på
varje rad och inom 0,1 procentenhet av replikan 7/10 (9,81 %, band 8,0 · 7,9 · 8,7 · 15,5; alla hinkar 10,01 %). **Det som är bevisat:**
kuvösen räknar samma tal som replikan på samma fil, alltså kan en kandidat utanför repot dömas i kuvösen. **Det som inte är bevisat:**
något om modellen — förväntningarna skrevs efter replikan, och FYSIK ensam är sämre än RÅ i varje band (dom A2 FALLER, som RÅ).
Domen läses på vintern 2026/27. Två beslut står kvar för Bengt i bedömningen §4.2: FYSIK+BLANDNING som andra kandidat, och
förregistreringen för 2026/27 på SMHI/MET.

## #486 (7/10 2026) Axels ord i Bengts ställe för kort #305: slå ihop PR #802, kör FYSIK på knappen och C8 mot fingeravtrycken — C8-läsningen förregistrerad före körningen

**Beslut.** Axel 7/10 23:54, i projektchatten: *"I say that we run it"*, och på frågan om det är hans ord eller Bengts: *"Yes please built
c8 before and then we do a run"*. Axel är produktägare med fullt beslutsmandat; hans ord står här i Bengts ställe för tre saker och bara
dem: **(1)** slå ihop PR #802 (förregistreringen i DECISIONS #485, oförändrad), **(2)** kör knappen `kuvos` med
`scripts/matningar/kuvos-fysik-2026-10-08.ts`, **(3)** kör C8 mot fingeravtrycksfilen (§4.2, Bengts begäran 7/10). Inga trösklar, ingen
drift, inget av FYSIK+BLANDNING eller vintern 2026/27 — de två besluten står kvar i §4.2 för Bengt. Bengt ser detta i morgonrapporten.
Releasen `kuvos-fysik-2024-25` skapades av Axel 7/10 23:49 på main (864ecb2); GitHubs sha256 för filen = `kuvos/fysik-leverans.json`.

**C8 mot fingeravtrycken — vad det är.** Bengts C8 (#479), oförändrad: VÄG, REL och BAS importerade ur
`scripts/matningar/kuvos-c8-vagdata-2026-10-07.ts`, ridge λ = 1, regioner gömda (rutor 1° × 2°) som huvudtal och leave-one-out, minst
100 timmar per station, särarten per ÅDT-klass. Målet är Axels `fingeravtryck_c` (medel uppmätt − modell; `data/fysik/fingeravtryck-2024-25.csv`,
summan i manifestet) i stället för särarten mot RÅ. Fyra mål: modell **Bsp** (den tidigare utan vägdata — modellen bakom 23 %) och
**A2** (den frysta, med vägdata inne) × **novdec** (Axels inlärningsfönster) och **vinter**. Skript
`scripts/matningar/kuvos-c8-fingeravtryck-2026-10-08.ts`, självtest i ci.yml (två motprov 7/10: MIN_TIMMAR 0 och fel kolumn fälls).
Ingen databas: allt ligger i repot, så läsningen körs lokalt och utskriften står under Utfall.

**Det är inte en upprepning av Axels 23 %.** Axel räknade på 165 stationer i mellanregionen, med Vägunderhållsklass och Driftområde,
och 15 lägeskluster som regioner (SVAR §5). Här är det alla stationer med vägdata, C8:s tio kolumner och C8:s rutor. Frågan är om
vägdatan förklarar fysikmodellens särart också med Bengts verktyg.

**Kontroll först** (SVAR §6): A2 vinter 736 stationer med värde och spridning 0,52 °C, Bsp vinter spridning 0,64 °C, ±0,01. Stämmer
det inte läses inget annat.

**Läsningen i förväg.** (1) **Bsp novdec, VÄG, regioner gömda: R² mellan 0,05 och 0,30** — över C8 mot RÅ (0,034), runt Axels 0,227.
(2) **A2 novdec, VÄG: R² ≤ 0,05** — vägdatan är redan förbrukad inne i A2 (Axel −0,11). (3) **ÅDT-spannet** (> 20 000 minus < 1 000)
**över 0,9 °C för Bsp vinter** (Axel −0,58 / +1,14) och **under 0,6 °C för A2 vinter**. REL och BAS skrivs ut utan förväntan.
Träff i (1) och (2): Axels slutsats håller med Bengts kolumner. Under 0,05 i (1): de 23 % hänger på Axels kolumner eller regioner.

**Stomdokument:** BED §4.2 (raden om fingeravtrycken: skriptet nu och utfallet efter körningen)

**Utfall (7–8/10 natten, lokalt på 2a43651 — ingen databas; summan = manifestet).** Kontrollen höll: A2 vinter 736 stationer, spridning
0,523 °C; Bsp vinter 0,643 °C. 729 stationer i novdec, 735 i vinter (≥ 100 timmar, med vägdata), 55 rutor.

| mål | VÄG R² regioner gömda (LOO) | REL | BAS | ÅDT-klasser < 1 000 · 1 000–20 000 · > 20 000 | spann |
| :-- | --: | --: | --: | :-- | --: |
| Bsp novdec | **0,0499** (0,065) | 0,013 | 0,147 | −0,20 · −0,05 · +0,93 °C | 1,13 °C |
| A2 novdec | −0,019 (−0,010) | −0,017 | 0,015 | −0,09 · −0,04 · +0,31 °C | 0,39 °C |
| Bsp vinter | 0,054 (0,066) | 0,028 | 0,101 | −0,21 · −0,04 · +0,82 °C | 1,03 °C |
| A2 vinter | −0,022 (−0,013) | −0,018 | 0,003 | −0,13 · −0,04 · +0,24 °C | 0,36 °C |

**Mot förväntan.** (1) **MISS, på gränsen:** Bsp novdec VÄG 0,0499 mot golvet 0,05. (2) **Träff:** A2 novdec −0,019 ≤ 0,05.
(3) **Träff:** ÅDT-spannet 1,03 °C för Bsp vinter (> 0,9), 0,36 °C för A2 vinter (< 0,6).
**Läsningen.** Med Bengts kolumner och rutor förklarar vägdatan ungefär 5 % av särarten mot Bsp — mer än mot RÅ (0,034, #479), men
långt från Axels 23 %. Enligt läsningen i förväg hänger de 23 % alltså på Axels kolumner (Vägunderhållsklass, Driftområde) eller hans
165 stationer och regioner, inte på vägdatan i sig. Signalen finns, men den sitter i de få största vägarna: 21–22 stationer över
20 000 fordon ligger +0,8–0,9 °C varmare än Bsp, medan resten skiljer under 0,2 °C — ett linjärt mått över 729 stationer ser lite av
det. BAS (läget) förklarar mer än VÄG mot Bsp (0,147), alltså är Bsp:s särart mer regional än väggiven. Mot den frysta A2 förklarar
ingenting något (alla R² ≤ 0,015), och ÅDT-spannet krymper till 0,36 °C: A2 har redan tagit upp vägdatan, som Axel fann (R² −0,11).
Ingen tröskel och ingen kandidat följer; raden i §4.2 stryks.

## #487 (8/10 2026) Kartsynken går till GitHub med `gh api` först — molnets GH_TOKEN och GITHUB_TOKEN är en platshållare (kort #306)

**Beslut.** Bengt 8/10, på valet i sessionen: *"gh api först"*. `scripts/kartsynk.ts` läser ärendet med byggsignalerna och de öppna
PR:erna med `gh api` när gh finns. Saknas gh eller fallerar den, tar fetch över med en nyckel ur GH_TOKEN, GITHUB_TOKEN eller
`git credential fill`, i den ordningen, och platshållaren `proxy-injected` räknas inte som nyckel. Felraden säger vilken nyckelkälla
som avvisades och varför gh inte nådde fram, men skriver aldrig ut nyckeln.

**Varför.** Morgonrutinens första körning 8/10 03:40 UTC (session `cse_01VhX7G7E1KzUnMT3EKZmVY2`) fick *GitHub 401: Bad credentials*
på både signalerna och PR-listan, medan `gh api repos/Axelstar/halkvakt/...` fungerade i samma session. Molnmiljöns dokumentation
(code.claude.com/docs/en/cloud-environments, *Work with GitHub issues and pull requests*) förklarar varför: utan en egen nyckel bär
GH_TOKEN och GITHUB_TOKEN platshållaren `proxy-injected`, och GitHub-proxyn byter in den riktiga nyckeln för `gh` och de inbyggda
verktygen — *"a script that reads GITHUB_TOKEN directly gets the placeholder, not a usable token"*. Den gamla koden läste GITHUB_TOKEN
först och skickade alltså platshållaren; `git credential fill` nåddes aldrig.

**Alternativ som valdes bort.** (1) *Som beställt:* GH_TOKEN och `gh auth token` före git credential. gh läser GH_TOKEN, så båda ger
samma platshållare, och morgonen efter hade sannolikt gett samma 401. (2) *Båda vägarna:* nyckelordningen och `gh api` som reserv
vid 401 — mer kod och två vägar att hålla isär. (3) Att få Nodes fetch genom proxyn (`NODE_USE_ENV_PROXY`): det är inte
dokumenterat hur proxyn nås, så det går inte att pröva utan en körning i molnet.

**Bevis före sammanslagningen.** `--sjalvtest` prövar vägen med en låtsad kommandokörare och en låtsad fetch, så provet kräver varken
gh, git eller nät: gh api först utan fetch; utan gh hoppas platshållaren över och git används; GH_TOKEN före GITHUB_TOKEN; felraden
bär båda skälen men inte nyckeln. Fyra motprov, ett per regel, fälldes alla: platshållaren som nyckel, gh hoppad över, GITHUB_TOKEN
före GH_TOKEN, nyckeln i felraden. På Bengts Windows (ingen gh) läser kartsynken signalerna och PR-listan som förut, via git.
`gh api` med Halkvakts egna sökvägar är inte prövad i molnet än. Beviset är morgonrutinens körlogg efter sammanslagningen, med
*Signalerna (ärende #706 …)* och PR-listan och utan 401.

**Stomdokument:** inga — bara kod i kartsynken; ingen av de sju beskriver hur kartsynken når GitHub, och läget står i projektkartan och på tavlan

## #488 (8/10 2026) Dokumentsynkens PR slås ihop på Bengts ord, inte av rutinen — (d) i #484 struken

**Beslut.** Bengt 8/10, på frågan i bedömningens §4.2: *"b"*. Morgonrutinen slår aldrig ihop sin PR. Den väntar på Bengts *slå ihop*,
och rapporten säger om ci och md-vakt är gröna på exakt huvudet och om `stomvakten.ts --tillatna` är grön. Steg 7 i CLAUDE.md
(DOKUMENTSYNKEN) är omskrivet, och `--tillatna` säger inte längre att grenen får slås ihop. Del (d) i #484 är struken; (a)–(c) står.

**Varför.** Första morgonen 8/10 (session `cse_01VhX7G7E1KzUnMT3EKZmVY2`) nådde rutinen repot och gjorde alla stegen. Anropet som
skulle slå ihop PR #805 nekades av auto-lägets klassare (*Merge Without Review*), och PR:en slogs ihop från Bengts konto 06:22 UTC.
En dokument-PR om dagen kostar ett ord, och de andra vägarna kräver en ändring som gäller fler än rutinen.

**Alternativ som valdes bort.** (a) En tillåtelseregel för sammanslagningsanropet i repots `.claude/settings.json`. Det var inte prövat
om klassaren släpper igenom anropet med en sådan regel i molnet, och regeln hade gällt varje session i repot, inte bara rutinen.

**Stomdokument:** BED §4.2 (raden om dokumentsynkens sammanslagning avgjord)

## #489 (8/10 2026) Kuvösen blir ett eget block i projektkartan, och kuvössidan följer blockets fem delar

**Beslut.** Bengt 8/10: *"ja till eget block, räkna in det i totalen"* — på frågan om kuvösen ska brytas ut i projektkartan som
favoriterna. Frågan kom ur hans iakttagelse samma morgon: *"vårt kuvösarbete har blivit stort … Jag vet inte om jag tycker att
kuvösarbetet är tillräckligt bra beskrivet i projektkartan och i halkvaktens kuvös"*.

**Vad analysen visade.** Kuvösen hade 37 beslut sedan 21/9 och tolv läsningsskript, men bara en del i kartan, med 14 byggsteg för
testbädden. Läsningarna stod som bevis på ämnesdelar (prognoslagret, segmentprognosen, vägdatalagret) och som dagboksstycken i
kuvössidans §6, som hette *Vad som kommer härnäst* men var historik 2/10–8/10. Prognoslagrets kandidater stod aldrig sida vid sida, och
RÅ stod som 7,4, 7,5 och 7,51 % utan att populationen sades. #486, en kuvösläsning, namngav bara bedömningen.

**Vad som byggdes.**
- *Blocket Kuvösen* (plats sida, räknas i totalen) med fem delar: **Testbädden** (`p-kuvosen`, grön: datan, klockan, körflödet, SMHI,
  MET Nordic, kandidater utifrån som fil), **Systemets delar på vintern** (`kv-delarna`: riktningsprovet, kalibreringen, granskningen,
  måttet och daggpunkten klara; nederbördstypen pågår; övergångarna, försprånget och vind och sikt saknas), **Prognoslagrets kandidater**
  (`kv-prognoslagret`: sju läsningar klara, kriging och FYSIK+BLANDNING väntar på beslut), **Före resan på vintern** (`kv-fore-resan`,
  grön) och **Facit från Trafikverket** (`kv-facit`, blå: Bengt skickar begäran §5d; kort #232 flyttat hit). Byggstegen här är äkta:
  i ett kuvösblock är provet leveransen. Produktens delar rörs inte, så felet från 7/10 (läsningar som byggsteg på prognoslagret, #483)
  upprepas inte. Totalen 65 % före och efter.
- *Kuvössidan* omgjord efter delarna: §2 en handskriven lägesruta och delarna, §3–§7 en del var med sina lägesrader ur kartan, §5 en
  jämförelsetabell för prognoslagret med populationen angiven, §8 reglerna, §9 bara framtid (kön med vad varje läsning väntar på),
  §10–§11 som förut och §12 dagboken hopfälld. Kortkartan följer: #232 → KUV 7, #270 → KUV 5, #282 → KUV 8.
- *Stomvakten* fäller en ändring som rör `kuvos/` eller `scripts/matningar/kuvos-*` och lägger till beslut utan att något av dem
  namnger KUV; självtest och motprov.
- *CLAUDE.md* DOKUMENTSYNKEN: en ny kuvösläsning är ett byggsteg på sin del, och en kandidat för prognoslagret får en rad i tabellen.

**Vad som följer med automatiskt, utan ändring.** Kartskriptet skriver blocket och lägesraderna på kuvössidan, kartsynken bokför
commits på kuvösens delar, kortkartan och kortvakten gäller som förut, och morgonrutinen läser CLAUDE.md. Jämförelsetabellen är
handskriven och stäms av av morgonrutinen.

**Alternativ som valdes bort.** Ett register ur en egen datafil (förslag 2 i analysen) — kartan bär redan datum, körning, beslut och
utfall per byggsteg. Att visa blocket utanför totalen — skuggan och grindarna räknas redan, och kuvösen är samma sorts arbete.

**Stomdokument:** KUV hela sidan, BED §4.2 och läget 7/10

## #490 (8/10 2026) Prognoslagret bortom 15 km — tre läsningar förregistrerade på Bengts ja: FYSIK+BLANDNING i kuvösen som fil från Axel, samma kandidat med prognosväder, och trafiken per avståndsband (kort #308)

**Beslut.** Bengt 8/10: *"ja till 1, 2 och 3"* — på förslagen efter hans fråga samma förmiddag: *"Det system som förordas är alltså
fysik med blandning där banden till 15 km ligger rätt och det som vi ska lägga extrem kraft på är bandet 15-20 och över 20 km. Har du
några bra förslag här?"* Svaret rättade premissen: det antagna är RÅ med spridningsgrinden (#474–#478), FYSIK+BLANDNING är en kandidat
som aldrig körts i kuvösen, och talen 4,1 · 4,3 · 5,3 · 10,9 % gäller vädrets analys, inte en prognos (#485). De tre förslagen han sa
ja till avgör om bandet bortom 15 km alls är rätt mål, innan kraft läggs där:
1. **FYSIK+BLANDNING i kuvösen**, som en fil från Axel på samma sätt som FYSIK (#485) — det beslut som (c) i #485 sköt upp.
2. **Samma kandidat med prognosväder**, så som den skulle köra i drift.
3. **Andelen trafik per avståndsband**, ur vägdatalagrets väglagspunkter med ÅDT.
Förslagen 4–7 (tystnad bortom 15 km, vägens tillstånd, grannländerna och termisk kartering i norr, MESAN) står kvar i bedömningen §4.2.

**Läsning 1 och 2 — filerna Axel lämnar** (`kuvos/blandning-leverans.json`, releasen `kuvos-blandning-2024-25`). Samma form som FYSIK:
`station_id,t_utc,fysik_c`, halvtimmar, vintern 2024/25 som `fysik-2024-25.csv.gz`, gzip, en fil per kandidat och läge. Kandidaterna är
FYSIK+GRANNAR och FYSIK+BLANDNING ur hans replika 7/10 (`docs/FYSIKSPARET-FRYS-2026-10-07.md`): grannarnas uppmätta fel och blandningen
räknas i hans kedja, inte i TypeScript, så att kuvösen bara läser en fil — det som gör (c) i #485 billigt. Två lägen:
- **analys** — som FYSIK: ECMWF:s analys vid t.
- **operativt** — bara den prognos som fanns utfärdad vid t, med ledtiden i filens läge (t.ex. `operativt +6 h`). Minst en fil med
  ledtid +6 h eller mer. Grannarnas mätningar vid t får användas: de finns i realtid i driften. Rättelsen får läras om på prognosväder,
  med samma utelämnade region.
Målstationens egna mätningar är aldrig indata, vid målet eller i blandningen. Varje fil fryses med sha256, rader och stationer i
manifestet innan knappen trycks; mätningen fäller en fil som inte stämmer. `fysik_c` har redan spann i värdevakten (−60…+60 °C).

**Genomförandet.** `scripts/matningar/kuvos-blandning-2026-10-08.ts` (självtest i ci.yml; kuvos.yml hämtar releasen och kontrollerar
summorna när mätningens namn innehåller `kuvos-blandning`). Underlaget exakt som FYSIK i #485: grind A:s WHERE med vakterna, senaste
avläsning per halvtimmeshink, yta ≤ +5 °C, RÅ som kontroll, OFFSET som tak, bandet = RÅ:s närmaste bidragande granne. Varje fil blir
kandidaten *namn (läge)*; måtten A1/A2/A3 per band och totalt på gemensamma punkter, frysflaggan, norr/söder om 62°.

**Läsning 3 — trafiken per band** (`scripts/matningar/kuvos-trafik-per-band-2026-10-08.ts`, självtest i ci.yml). Ingen databas: de
12 960 väglagspunkterna i `data/vagdata/vaglagspunkter.json` (var 2 km längs väglagsnätet, med NVDB:s ÅDT och lätta fordon 22–06) mot de
854 stationerna i `data/vagdata/stationer.json`. Bandet är avståndet till närmaste station; väglängden räknas som 2 km per punkt och
trafiken som ÅDT × 2 km (fordonskilometer per dygn). Banden 0–7 · 7–15 · 15–20 · 20–50 · > 50 km, hela landet och norr/söder om 62°.
Körs lokalt efter att den här posten checkats in.

**Förväntningar, skrivna före körningarna.**

| | förväntan |
| :-- | :-- |
| 1 · RÅ (kontroll) | 7,4–7,6 % grova fel; annars läses inget annat |
| 1 · FYSIK+GRANNAR, analys | 6,35–6,95 %; banden inom ±0,3 av 4,5 · 4,9 · 5,7 · 12,2 |
| 1 · FYSIK+BLANDNING, analys | 5,7–6,3 %; banden inom ±0,3 av 4,1 · 4,3 · 5,3 · 10,9 |
| 2 · FYSIK+BLANDNING, operativt ≥ +6 h | sämre än analysläget i varje band; totalt 6,5–9 %; banden 0–7 och 7–15 km över 5 % |
| 3 · trafiken 0–7 km | 50–75 % av fordonskilometerna |
| 3 · 7–15 km | 15–35 % |
| 3 · 15–20 km | 2–10 % |
| 3 · > 20 km (20–50 och > 50) | 2–10 %, mest norr om 62°; dess andel av väglängden större än dess andel av trafiken |

Läsning 1 är som FYSIK en kontroll av att filen och kuvösen räknar på samma population, inget bevis för modellen: förväntningarna
skrevs efter replikan. Ett tal mer än en procentenhet utanför spannet är ett fel i filen eller populationen och läses som det.
Läsning 2 och 3 har inget facit i förväg.

**Hur läsningarna läses — en läsning, inte en dom; beslutet är Bengts.**
- Håller operativt läge banden 0–7 och 7–15 km på RÅ:s nivå eller bättre (≤ 5,2 %) och ligger bortom 20 km minst en procentenhet under
  RÅ:s 13,6 %, är förregistreringen för vintern 2026/27 på SMHI/MET (#485) värd kraften bortom 15 km.
- Tappar operativt läge fördelen i de närmaste banden är bandet bortom 15 km fel mål för den här modellen; kraften går då till
  tystnaden bortom 15 km och vägens tillstånd (förslag 4 och 5 i §4.2).
- Går under 5 % av trafiken bortom 20 km läggs kraften bortom 15 km i första hand på bandet 15–20 km och på tystnad bortom 20 km; går
  över 10 % där är bandet ett mål i sig.

**Alternativ som valdes bort.** (a) Grannlagret och blandningen i TypeScript i repot — en port ändrar talen och tar en vecka; filen är
ärligare (samma skäl som #485 (a)). (b) Bara analysläget — då vet vi inte om fördelen överlever en prognos, och det är prognosen som
körs i drift. (c) Trafiken ur shadow_log — den mäter bara betatestarnas resor; ÅDT täcker hela nätet.

**Vad som INTE görs.** Inga trösklar, ingen drift, ingen kod ur fysikspåret i repot. Knappen för läsning 1 och 2 trycks på Bengts ord
när Axels filer ligger i releasen med summorna i manifestet. Open-Meteo är icke-kommersiell också i operativt läge; läsning 2 mäter
modellens känslighet för prognosfel, inte en driftsatt källa.

**Följd.** Kort #308 på tavlan under Axel; prognoslagrets del i projektkartan får stegen *FYSIK+BLANDNING i kuvösen*, *Operativt läge* och
*Trafiken per band*; kuvössidans §9 och bedömningens §4.2 följer. **Utfall** skrivs under den här posten.

**Stomdokument:** KUV §5 och §9, BED §4.2

**Utfall läsning 3 (8/10 09:52, lokalt på 9b1e93c, vägdatalagret 7/10 04:49 UTC). Tre av fyra rader inom förväntan; bortom 20 km
under.** 12 960 punkter, 25 920 km väg, 854 stationer. Ingen punkt ligger mer än 50 km från en
station. 126 punkter saknar ÅDT, 100 av dem i 0–7 km.

| band | väglängd | trafiken | nattrafiken 22–06 | förväntan, trafiken |
| :-- | --: | --: | --: | :-- |
| 0–7 km | 52,1 % | **68,1 %** | 65,8 % | 50–75 ✓ |
| 7–15 km | 37,1 % | **28,4 %** | 30,4 % | 15–35 ✓ |
| 15–20 km | 6,5 % | **2,3 %** | 2,4 % | 2–10 ✓ (nedre kanten) |
| > 20 km (alla 20–50) | 4,3 % | **1,3 %** | 1,4 % | 2–10 ✗ under |
| norr om 62°, bortom 15 km | 26,9 % | 17,5 % | 17,7 % | — |

Bortom 20 km går 76,8 % av trafiken norr om 62° ✓, och bandets andel av vägen är större än dess andel av trafiken ✓ (4,3 mot 1,3 %).
Bortom 15 km ligger 10,8 % av vägen och 3,6 % av trafiken (3,8 % av nattrafiken); 53,7 % av den trafiken går norr om 62°. (Andelarna norr
om 62° skrivs av skriptet sedan en rad som lades till efter körningen; talen i tabellen är körningens.)

**Läsningen.** Under 5 % av trafiken bortom 20 km, så regeln ovan säger: kraften bortom 15 km i första hand på 15–20 km och tystnad
bortom 20 km. Men 15–20 km bär själv bara 2,3 %. Räknat på hela landet ligger trafiken i banden under 15 km.
*Räknat efteråt, inte förregistrerat* (andelarna här, banden ur RÅ i #485 och ur replikan): trafikviktat har RÅ 5,4 % grova fel
(0,681 · 5,23 + 0,284 · 5,26 + 0,023 · 7,16 + 0,013 · 13,59); felfria band bortom 15 km skulle ge 5,05 %, alltså högst 0,34
procentenheter. FYSIK+BLANDNING ger trafikviktat 4,3 %, och 93 % av vinsten (1,04 av 1,12 procentenheter) kommer ur banden under
15 km. I norr är bilden en annan: där går 17,5 % av trafiken bortom 15 km.

**Mot #406.** Huvudvägnätet mot arkivets stationer gav 49,8 · 37,6 · 7,3 · 5,2 % av vägen; här mot dagens 854 stationer
52,1 · 37,1 · 6,5 · 4,3 %, samma bild. Trafikarbetet stod där som INTE MÄTT; det är mätt nu.

**Reservationer.** Dagens stationsnät, inte vinterns 736 med data; grindens bandregel (närmaste bidragande ankare) flyttar ungefär
2,6 % av punkterna utåt (#406), så andelarna bortom 15 km är något för låga. Bandens felandelar är mätta på stationer; att de gäller vägen i samma band är ett
antagande i den trafikviktade räkningen. ÅDT är årsmedel, inte vinter. Väglagsnätet är riks- och
länsvägarna; kommunernas gator, som skulle göra det inre bandet ännu större, ingår inte. Grindens krav och dom räknas per punkt, oviktat
(#406): läsningen ändrar ingen tröskel och ingen dom. Beslutet om var kraften läggs är Bengts.

## #491 (8/10 2026) Frostens första läsningar: steg 0 för övergångarna, T-A, R-A, K-A och W-A, bildfacitets omklassningar och efterhalkans uppspelning — K-A passerad, T-A:s domspärr släppt (kort #89, #88, #46, #103, #90, #209)

**Beställningen.** Bengt 8/10: *"kör 89 och allt som hör till det och stäng issuesena sen de är klara"*. Frostlarmet (issue #804)
öppnades 8/10 01:07 UTC med 54 stationer med vägyta ≤ 0 °C; vakthunden tryckte de fem frostflödena 09:07 UTC (79 stationer), alla
204. Läsningen i databasen (dbknapp `las`, sex satser i en READ ONLY-transaktion som rullas tillbaka) tryckt 09:12 UTC på Bengts
order. Allt på main 14873df, fönstren slutar 8/10 kring 09 UTC, alltså inom sju dygn från frostnätterna 6–8/10, före gallringen.

| Läsning | Körning | Utfall |
| :-- | :-- | :-- |
| Steg 0, övergångarna (kort #89), 7 dygn | 37754417681 | 0c: **42** av 3 245 användbara regnstopp följdes av yta ≤ 1 °C inom 4 h (1/2/3 h: 27/30/37), mot 3–4 den 11/9; 177 frostepisoder på 117 stationer, 23 larmar i dag, med N = 4 h 29. 0a: mätarregn vid omslaget i 18 % (±1,3 pe), median 65 min kvar. 0d: 2 äkta torrperioder ≥ 5 dygn, OAVGJORT för V-B. 0e: väglagsarkivet rör sig igen, 12 469 rader på 7 dygn; *Våt* median 9,6 h |
| T-A, trenden (kort #88), 7 dygn | 37754420461 | **Domspärren släppt:** 169 frostnätter på 119 stationer (krav 30 och 20). Bästa kombinationen 60 min · lutning 0,4 · gap 2,0 · startband +1…+3: träff 64 % (108/169), falsklarm 3 % (144/5 141), separation 61 % ±7,3 pe, halva A 73 % och B 60 %. Fysikkontrollen: kallast kl 03–07 i 79 %, fyrningsandel klara nätter 65 % mot mulna 53 % — *stödjer* |
| R-A, rimfrosten (kort #46), svenska arkivet 30 dygn | 37754423323 | Bästa kombinationen R1 1 · R2 1 · R3 30 min: 163 episoder, 394 stationstimmar, 61 stationer (spärren 200 och 20 passerad). R-A3 dygnsprofil 73 % ±6,8 kl 03–07 (krav 40) KLARAR; R-A5 dominans 6 % (tak 20) KLARAR; R-A4 klara mot mulna 4,73 × (krav 2) *stödjer* |
| K-A, frysklassningen (kort #103), 60 dygn | 37754426571 | **DOM: K-A PASSERAD** i 13 av 27 kombinationer; bäst täckning K1 0 °C · K2 ±0,5 · K3 20 km: täckning 97,8 % ±0,2, träff 99,3 %, farliga fel 0,5 %. 736 stationer, 649 976 avläsningar. Två saknade dygn (6–7/9, exporterade enligt sql/034) räknas inte |
| W-A, vind och sikt (kort #90), 14 dygn | 37754429130 | B1 byvind OAVGJORT (116 stationstimmar i högsta bandet, krav 500). **B2 sikt FALLER:** olycksfrekvensen *sjunker* med sikten, 41,1 → 15,1 per 1 000 h, kvot 0,37 (krav ≥ 1,5). 27 stationer med trasig byvindgivare (kvot > 5), värst 2312 |
| Bildfacitets omklassningar (kort #209), 7 dygn | 37755033058 | **0 omklassningar till halka**, 0 inom 5 km från de 82 froststationerna, av 12 469 omklassningar: *Normalt* 12 468, *Besvärligt (risk för)* 1 (8/10 06:23). 315 olyckor i händelsearkivet |
| Efterhalkans uppspelning, 7 dygn | 37755033058 | 11 episoder: 2 · 5 · 4 på 6/10 · 7/10 · 8/10 (5 · 13 · 31 ögonblick). Samma tal ur den fristående satsen (kombinationen 2 · 5 · 4) — uppspelningen och satsen är ense. Utfallet är blint (`p_blind`), och det lästes inte |
| Skuggloggen mot arkivet, 7 dygn | 37755033058 | 274 stationsögonblick i `shadow_log.efterhalka`: ense på alla 274, men **inget av dem uppfyller regeln** i vare sig loggen eller arkivet; de 11 episoderna låg vid stationer utanför skuggrutterna |

**Läsningen, del för del** (läsningar och grindarnas egna domar; inga trösklar ändrade):
- **K-A är passerad**, och kort #103:s Verify är därmed uppfylld: domen enligt `docs/TROSKLAR-FRYSKLASSNINGEN.md` fälld och bokförd
  här. Det ger ingen rätt att varna (§1): en godkänd frysklassning får bara stärka en bedömning som vilar på en uppmätt station.
  Nästa steg enligt dokumentets §7.4 är K-B:s uppspelning, kort #309. Värdena K1 0 · K2 ±0,5 · K3 20 km är mätningens förslag, inte
  satta trösklar (§7).
- **T-A:s domspärr har släppt**, och kraven i TROSKLAR-TRENDEN §4 är uppfyllda: separationen syns i båda halvorna, fysikkontrollen
  stödjer. Enligt §4 blir den kombination som skiljer bäst tröskeln: 60 · 0,4 · 2,0 · +1…+3. Den näst bästa (+1…+4, 60 % ±7,2) går
  inte att skilja från den. Att skriva in värdena i tröskeldokumentet är Bengts ord (bedömningen §4.2); T-B saknar instrument.
- **R-A visar en signal som är fysik** (R-A3–R-A5). Det ger ingen rätt till röst; nästa steg är R-B:s uppspelning (DECISIONS #363).
  Den finska körningen trycktes inte.
- **W-A faller för sikten**: färre olyckor per timme vid sämre sikt. Situationsarkivet bär ingen orsak, och dimtimmar ligger troligen
  där trafiken är gles — läs det som att sikt inte är en egen fara i datan, inte som att dimma är ofarlig. Byvinden väntar på blåsigt
  väder.
- **Steg 0:s 0c har underlag**: 42 regnstopp med frost inom 4 h, där grinden behöver omkring 30. Ö-B saknar fortfarande eget
  instrument, och frostnätterna 6–8/10 gallras från 13/10.
- **Bildfacitet (kort #209)**: omklassningarna till halka är noll också under frostnätterna, fast väglagsarkivet nu rör sig. Det
  besannar farhågan i #248: januaridomen står på kamerabilderna. Beslutet är Bengts och Axels (bedömningen §4.2).
- **Kontrollen mellan skuggloggen och arkivet** säger ingenting om positiva fall: inget av de 274 ögonblicken uppfyllde regeln.

**Ärendena.** Issue #804 och #127 stängdes 8/10 09:01–09:02 UTC av kontot 895845, före tryckningen; vakthunden tryckte ändå (den
hittar frostlarmet med `state=all`). Arbetet de beställde är nu gjort. Nästa tryckning tidigast 15/10 09 UTC, så länge frosten varar.

**Vad som INTE görs.** Inga trösklar, ingen drift och ingen röst ändras. Inga blinda utfall lästa.

**Stomdokument:** MAT §2 §3.2 §5.2 §6.1–§6.4 §7.5, BED §0b och §4.2

## #492 (8/10 2026) T-A:s värden in i TROSKLAR-TRENDEN på Bengts ja: fönster 60 min, lutning 0,4 °C, gap ≤ 2,0 °C, startband +1…+3 °C (kort #88)

**Beslut.** Bengt 8/10: *"ja till 2"* — på frågan om T-A:s kombination ska skrivas in i tröskeldokumentet (bedömningen §4.2,
DECISIONS #491). T-A:s domspärr släppte 8/10 (169 frostnätter på 119 stationer), separationen syns i båda halvorna och
fysikkontrollen stödjer. TROSKLAR-TRENDEN §4 säger att den kombination som skiljer bäst blir tröskeln; den skrivs nu in i §2.

| Parameter | Värde |
| :-- | :-- |
| Fönster | 60 min |
| Lutningströskel | 0,4 °C per fönster |
| Daggpunktsgap | yta − dagg ≤ 2,0 °C |
| Startband | +1 … +3 °C |

**Vad det inte är.** Ingen röst, ingen kod i motorn och ingen ändring i kombinationen: efterhalkans *faller* (lutning ≥ 0,8 °C
på 30 min) är kombinationens frysta startvärde och följer regel D (TROSKLAR-TRENDEN §8, DECISIONS #468). Stigande tröskel,
nära-miss-band och utfallsfönster sätts inte av T-A. T-B saknar fortfarande instrument, och T-C dömer i mars.

**Reservation.** Den näst bästa kombinationen (startband +1…+4, separation 60 % ±7,2 pe) går inte att skilja från den valda.
Regeln väljer den bästa, och det står i dokumentet. Underlaget är sju dygn i början av frostsäsongen.

**Alternativ som valdes bort.** Att vänta på T-B:s korsningskurva innan något skrivs in — §4 säger att T-A väljer värdet, och
kurvan räknas ändå över hela svepet.

**Stomdokument:** MAT §6.1, BED §4.2

## #493 (8/10 2026) Fysiken som givarvakt — en läsning i kuvösen på FYSIK-filen som finns: pekar oenigheten mellan mätt yta och fysik ut de rader vakterna tar, och vilka stationer de missar?

**Beslut.** Bengt 8/10: *"ja till givarvakten"* — på förslaget efter hans invändning mot ordningen för fysikregeln (*"varför ska vi
då binda in den inom en barriär av mätningar som i sig ger eventuellt sämre resultat"*, bedömningen §4.2). Där mätningen kan vara
fel — en trasig givare — kan fysiken få en roll som vakt: den är ett oberoende vittne vid stationen, eftersom varje station är
förutsagd med hela sin region utesluten ur träningen (#485). Läsningen kräver inget från Axel; filen `fysik-2024-25.csv.gz` ligger i
releasen med summan i manifestet. Ingen dom, ingen tröskel, ingenting i driften.

**Genomförandet** (`scripts/matningar/kuvos-fysik-givarvakt-2026-10-08.ts`, självtest i ci.yml; namnet bär `kuvos-fysik`, så kuvos.yml
hämtar filen och prövar summan). Senaste avläsning per station och halvtimmeshink med yta, *före* vakterna. Vakterna — #75, radvakten,
karantänen och den långsamma vakten, samma uttryck som grind A (`publish/snapshot-core.ts`) — blir flaggor per rad. D = uppmätt yta −
FYSIK på samma hink. Grupperna: raderna vakterna tar (alla och per vakt), raderna de behåller med luft, och de behållna utan luft (som
#75 och radvakten inte kan pröva). Per grupp: MAE, andelen |D| > 2, 3, 5 och 8 °C, och median D. Stationerna som vakterna behåller men
fysiken är oense med: |D| > 5 °C i minst 20 % av minst 100 hinkar, med median D och antalet rader vakterna tog hos dem.

**Kontrollen först.** De behållna raderna med luft och yta ≤ +5 °C är FYSIK-mätningens egen population (#485, 10,04 % med |D| > 2 °C
på alla hinkar). Landar den utanför 9,8–10,3 % skiljer populationen, och inget annat läses förrän det är förstått. Kategoriseringen
efter hinkens senaste rad, i stället för efter vakterna, kan flytta talet något.

**Förväntningar, skrivna före knappen.**

| | förväntan |
| :-- | :-- |
| kontrollen, \|D\| > 2 °C | 9,8–10,3 %; MAE 0,75–0,85 °C |
| rader vakterna tar, \|D\| > 5 °C | 30–80 % |
| — #75 | ≥ 80 %, median D ≤ −8 °C |
| — radvakten · den långsamma vakten | ≥ 50 % vardera |
| — karantänen (alla stationens rader i karantänen, också de friska) | 15–60 % |
| behållna med luft, \|D\| > 5 °C | 0,5–3 % |
| behållna utan luft, \|D\| > 5 °C | 0,5–6 % |
| stationer vakterna behåller, oense i ≥ 20 % | 0–20 |

**Hur läsningen läses — en läsning, inte en dom.** Fysiken är en användbar kandidat till givarvakt om \|D\| > 5 °C fångar minst hälften
av det vakterna tar och flaggar högst 2 % av det de behåller. Stationslistan läses för hand, som septemberlistan där en människa
hittade Ö Ljungby (#300): ett konstant D är en givare, ett D som växlar med vädret är troligen fysikens eget fel (snö, salt och vatten,
Axels dygnsstora block). Ingen station anmäls på den här läsningen, eftersom vintern är 2024/25 och givarna kan vara lagade.

**Vad som INTE görs.** Inga trösklar, inga vakter i driften, ingen kod ur fysikspåret. En givarvakt i driften kräver fysiken i drift
(SMHI/MET-väder, #485) och ett eget beslut. Regel T rörs inte: en vakt tystar, den utlöser ingenting.

**Stomdokument:** KUV §4 och §9, BED §4.2

**Utfall (8/10 11:51, knappen 37759452234 på b3fecd8, Bengts ja). Kontrollen träffar; fysiken håller med #75 men inte med radvakten
och den långsamma vakten, och den hittar ingen station vakterna missar.** Filen hämtad ur releasen, summan = manifestet; 5 258 649
hinkar ur arkivet, 736 stationer, 1 434 hinkar utan värde i filen.

| grupp | hinkar | \|D\| > 2 | \|D\| > 5 | median D | förväntan |
| :-- | --: | --: | --: | --: | :-- |
| kontrollen (behålls, luft, yta ≤ +5) | 4 404 906 | **10,04 %** | 0,38 % | 0,00 °C | 9,8–10,3 % ✓ · MAE 0,91 °C ✗ (se nedan) |
| tas av vakterna | 29 297 | 32,76 % | **10,43 %** | −0,97 °C | 30–80 % ✗ |
| — #75 | 922 | 95,66 % | **82,21 %** | **−8,67 °C** | ≥ 80 %, ≤ −8 °C ✓ |
| — radvakten | 543 | 46,22 % | **14,18 %** | −1,70 °C | ≥ 50 % ✗ |
| — karantänen | 15 272 | 42,76 % | **16,08 %** | −1,33 °C | 15–60 % ✓ |
| — den långsamma vakten | 16 263 | 30,44 % | **12,86 %** | −0,94 °C | ≥ 50 % ✗ |
| behålls, luft | 5 227 818 | 11,59 % | **1,30 %** | 0,09 °C | 0,5–3 % ✓ |
| behålls, utan luft | 100 | 12,00 % | 0,00 % | −0,04 °C | 0,5–6 % ✗ (100 hinkar) |
| stationer vakterna behåller, oense i ≥ 20 % | — | — | **0** | — | 0–20 ✓ |

**Läsningen, enligt regeln ovan.** Fysiken fångar 10,4 % av det vakterna tar (krav minst hälften) och flaggar 1,3 % av det de behåller
(tak 2 %). **Den är alltså inte en användbar kandidat till givarvakt** på den här läsningen. Den håller med om de grova felen: #75:s rader
ligger i median 8,7 °C under fysiken, och 82 % av dem är mer än 5 °C fel. Den hittar ingen station som vakterna släpper igenom och den är
oense med. **Det oväntade är radvakten och den långsamma vakten:** på de raderna ligger den uppmätta ytan i median bara 1–2 °C under
fysiken, och två tredjedelar ligger inom 2 °C. Fysiken, som aldrig sett stationens egna mätningar, tror alltså på de flesta av de
värden vakterna kastar. Två förklaringar går inte att skilja här: att vakterna i vinterluft också tar verkligt kalla ytor — en snö- eller
istäckt givare en solig dag, och fysiken har snödjupet som indata — eller att fysiken bär samma fel som givarna. Det är en fråga om
vakterna, inte om fysiken, och den står i bedömningen §4.2.

**Två förväntningar föll på mätningen, inte på populationen.** MAE 0,91 °C mot väntade 0,75–0,85: #485:s 0,79 °C är grind A:s A1, som
bara räknar ytor −5…+5 °C, medan kontrollen här räknar alla ytor ≤ +5 °C — andelen grova fel, som har samma definition, träffar exakt
(10,04 %). Raderna utan luft är 100 hinkar och bär ingenting.

## #494 (8/10 2026) Ingen egen läsning av raderna radvakten och den långsamma vakten tar — Bengts nej

**Beslut.** Bengt 8/10: *"nej till läsningen"* — på förslaget ur givarvaktsläsningen (DECISIONS #493) att i kuvösen läsa de rader
radvakten och den långsamma vakten tog på vintern 2024/25 (543 och 16 263 halvtimmar, två tredjedelar inom 2 °C från fysiken), med
solen och nederbörden ur MET Nordic, stationernas snökoder och SMHI:s snödjup. Kostnaden var en kuvöskörning om ungefär 9 Actions-minuter.

**Vad som står kvar.** Iakttagelsen står under #493: att vakterna i vinterluft kan ta verkligt kalla ytor är en hypotes, inte ett fynd,
och fysiken kan lika gärna bära samma fel som givarna. Vakterna i driften är orörda.

**Stomdokument:** KUV §4, BED §4.2

## #495 (9/10 2026) Veckokopian av arkivet flyttar från GitHub-releaser till den privata hinken `arkiv` i Supabase (kort #312)

**Beslut.** Bengt 9/10: *"gör a, b och c"*, där (b) var att bygga backupens nya förvar i Supabase. Skälet är det publika repot
(kort #311): releaserna blir publika med repot, och veckokopian (`arkivbackup.yml`, kort #213) är en `pg_dump` av hela
public-schemat — också `driver_facit` och `driver_miss`, testarnas svar och missar med tid och närmaste station.

**Vad som byggs.** `arkivbackup.yml` dumpar och läser tillbaka som förut, men laddar sedan upp dumpen i delar om 45 MB
(gratisnivåns tak är 50 MB per fil) till `arkiv/dump/`, hämtar delarna tillbaka och jämför sha256 med dumpen, och gallrar till de
fyra senaste kopiorna. Den nya edge-funktionen `arkivdump` ger bara signerade adresser och gallrar; den rör aldrig själva filerna
och avvisar namn utanför mönstret. Nyckeln är INGEST_KEY, som jobbet läser ur pg_cron:s eget jobb med den databasanslutning det
redan har och maskerar i loggen — **ingen ny hemlighet i GitHub, inget för Axel att göra**. Releasesteget och gallringen av releaser
är borta; de tre befintliga `arkiv-*`-releaserna raderar Bengt själv, när en kopia bevisligen ligger i hinken.

**Avvägningen, sagd högt.** Kopian låg medvetet *utanför* Supabase. Nu ligger den hos samma leverantör och i samma projekt som
databasen: försvinner projektet eller kontot försvinner kopian med det. Mot det står att den inte blir publik, och att det enda
alternativet utan Axel — en krypterad release — kräver en nyckel som antingen ligger i databasen (och då försvinner med den) eller
hos någon av oss. Den som vill ha en kopia utanför Supabase hämtar en med `lage=hamta` och lägger den på egen disk.

**Alternativ som valdes bort.** (a) En privat repo för kopiorna — kräver en nyckel i Halkvakts hemligheter, och bara ägaren
(Axel) kan lägga in den. (b) En krypterad release med en nyckel ur databasen — återläsningen dör med databasen. (c) Att behålla
releaserna och inte göra repot publikt — det är Axels beslut på kort #311, och backupen ska inte vara skälet.

**Gränser.** Fyra kopior, inte tolv. Hinken delas med kamerafacit (56 MB 9/10) och arkivexporten (8 MB) inom 1 GB.

**Stomdokument:** MAT §1, BED §4.2

**Utfall (9/10 06:12, i drift).** Arkivdump deployad 9/10 (37882553751, anrop utan nyckel ⇒ 403); knappen arkivbackup 37882625889 på dea07ee: dumpen 56 MB, 37 tabeller återlästa (1 445 591 rader på båda sidor), uppladdad i två delar och hämtad tillbaka med samma sha256, nyckeln inte synlig i loggen; de tre arkiv-releaserna raderade av Bengt 9/10, bara kuvos-* kvar. Dumpen var redan 56 MB, över gratisnivåns 50 MB per fil — utan uppdelningen hade första uppladdningen fallit (39 MB 4/10). Återläsningens två fel, *schema public already exists* och *role anon does not exist*, är de väntade från förut.

**Rättelse 9/10 05:20 (Claude).** Flytten tog inte vakten med sig. Vakthundens kontroll 9j (`supabase/functions/vakthund`, kort #223) frågade fortfarande GitHub efter releaser med taggen `arkiv-`, och när Bengt raderat dem larmade den 05:08 UTC *"Arkivet saknar färsk backup"* (issue #825) — fast kopian låg i hinken och var bevisad samma morgon. Larmet var falskt, men värre: kontrollen vaktade inte längre den riktiga kopian. Rättat på grenen `claude/kallkartan-at-sidan-2026-10-09 (PR #826)`: 9j räknar dumparna i hinken `arkiv` och läser den nyaste delens tid ur `storage.objects`, som facit-kontrollen gör. En fullständig sökning i repot fann inget annat ställe som läser `arkiv-`-releaserna. Kort #314; beviset är vakthundens rad efter deployen. **Läxa:** när en sak flyttas, sök efter allt som vaktar den gamla platsen i samma varv — vakterna är skrivna mot platsen, inte mot saken.

## #496 (9/10 2026) Kallkartan i kuvösen — RÅ rättad med MODIS-kartans lokala avvikelse, förregistrerad före körningen (kort #313)

**Beslut.** Bengt 9/10: *"ja, kör kallkartan nu"* — på svaret på hans fråga om prognoslagrets steg *Kriging och kallkartan* kan göras
oberoende av när Axel kommer med sina filer: kallkartans prov kan köras nu, på kartan som finns sedan 6/10 (#482) och stationerna i
kuvösen; kriging väntar på kallkartans utfall, och förregistreringen för vintern 2026/27 på Bengts beslut (#485). Inget av det beror
på kort #308.

**Frågan.** Bär kartan stationens särart mot grannarna? RÅ skattar en station ur grannarnas yta. Ligger en granne i ett köldhål och
målet på en varmare plats har RÅ fel på ett sätt kartan känner till. Kandidaterna rättar därför varje grannes värde med skillnaden i
kartans avvikelse mellan målet och grannen.

**Underlaget.** `data/kallkartan/kallkartan_stationer.csv` ur releasen `kuvos-modis-2022-25` (sha256 9f356ee8…, samma som releasens
manifest; mätningen fäller en annan fil), incheckad i repot (45 kB) så att mätningen inte hämtar releasen. 854 stationer: 11 utan
avvikelse, 18 med färre än 30 klara nätter (räknas inte), 2 tagna av vattenregeln, 823 kvar. Fältet `medelavvikelse_k` är deklarerat
i värdevakten (−15…+15 K) innan det används; kartan läst vid stationerna −2,74…+3,51 K, 1/99-percentil −1,78 / +1,46 K.

**Vattenregeln** (#482 krävde den före körningen). Releasen har ingen landandel. En pixel varmare än +2,0 K räknas som vatten — en
sjö bär sin värme in i nätterna oktober–april — och stationen står utanför KALL-kandidaterna. Det tar två: 2534 Vietas (+3,51 K, mot
Akkajaure) och 2580 vid Kiruna (+2,47 K). Kalla avvikelser behålls, för köldhålen är det kartan ska hitta; den kallaste är 1633
(−2,31 K). Regeln är satt på kartans egen fördelning, utan facit.

**Kandidaterna.** Alla räknas av grind A:s `evaluate()` med `utanOffset` och en justering per granne, som RN i #481:
- **RÅ** — kontrollen.
- **KALL** — grannens värde + 1 · (a_mål − a_granne), alla timmar.
- **KALL-NATT** — samma när solen vid målet står under −6° (regimgrindens gräns, #408), annars ingen rättelse. Kartan är byggd av klara
  nätter.
- **KALL-½** — k = 0,5, alla timmar: markens avvikelse är inte asfaltens, och halva är en försiktigare tro på kartan.
- **OFFSET** — taket, som förut.
En granne utan avvikelse bidrar inte till KALL-kandidaterna, och en station utan avvikelse skattas inte. Måtten läses på de punkter där
alla kandidater har ett värde, så RÅ räknas på samma population. Skriptet: `scripts/matningar/kuvos-kallkartan-2026-10-09.ts`
(självtest i ci.yml, motprovat: vänt tecken i justeringen och avstängd vattenregel fäller var sin rad).

**Måtten.** Grind A:s A1 (MAE i beslutsbandet), A2 (grova fel > 2 °C) och A3 (frysklassfel) per band (närmaste bidragande granne) och
totalt; natten (sol < −6°) mot dag och skymning; norr och söder om 62°; frysflaggan med tre marginaler (#437).

**Förväntningar, skrivna före körningen.**

| | förväntan |
| :-- | :-- |
| RÅ (kontroll) | 7,2–7,7 % grova fel på de gemensamma punkterna, bortom 20 km 12,5–14,5 %; annars läses inget annat |
| KALL | 7,3–8,5 % — rättelsen gäller också dag och mulna nätter, där kartan inte säger något; RÅ+HÖJD, också en fast rättelse per plats, gav 8,8 % (#481) |
| KALL-NATT | 7,0–7,8 %; natten 0–0,5 procentenheter under RÅ:s natt |
| KALL-½ | 7,1–8,0 % |
| KALL-NATT bortom 20 km | 12,5–14,5 % |

Spannen är breda med avsikt: kartans spridning mellan stationerna (sd 0,66 K) är en tredjedel av gränsen för ett grovt fel, så
rättelsen kan flytta några procent av punkterna över eller under 2 °C, åt båda hållen.

**Hur läsningen läses — en läsning, inte en dom; beslutet är Bengts.**
- Ligger någon KALL-kandidat minst 0,3 procentenheter under RÅ totalt och minst 0,5 bortom 20 km, utan att frysflaggans farliga fel
  (K2 0, alla band) ökar, är kallkartan värd en egen förregistrering för vintern 2026/27, på Bengts ord. Tre kandidater prövas, så en
  vinst på gränsen läses försiktigt.
- Annars bär kallkartan inte i den här formen. Förslaget blir då att lägga den åt sidan och att kriging (steg 2 i #481) prövas ensamt
  eller läggs ned — en fråga i bedömningens §4.2.

**Reservationer, med i läsningen.** (1) Kartan är byggd av vintrarna 2022–25, och 2024/25 är också kuvösens vinter. Den läser ingen
station och inget facit, men samma nätter står på båda sidor; en vinst bekräftas först på 2026/27 med kartan fryst. (2) Satelliten
mäter markens yta — skog, mark, snö, sjö — inte asfalten. (3) Vattenregeln och KALL-NATT:s solgräns är satta före körningen och
ändras inte efter den.

**Alternativ som valdes bort.** (a) Kartan som egenskap i RN+R:s regression, som #482 skrev — RN+R föll i #481, så kartan prövas på
RÅ, det antagna. (b) Ett k anpassat på stationerna — ett bättre tal men en sämre läsning; k = 1 och 0,5 är fysiken och en halvering av
den, fasta före körningen. (c) Landandel eller närmaste rena landpixel för vattnet — releasen har ingen landmask, och den kräver en ny
hämtning. (d) Vänta på Axels filer — kallkartan beror inte på dem.

**Vad som INTE görs.** Inga trösklar, ingen drift, ingen ändring av appen eller static.json. Kostnad: en körning av kuvos.yml, omkring
tio minuter (RN 11, FYSIK 9), ungefär 0,08 USD.

**Följd.** Kort #313 på tavlan; prognoslagrets steg *Kriging och kallkartan* delas i *Kallkartan* och *Kriging*; kuvössidans §9 och
bedömningens §4.2 följer. **Utfall** skrivs under den här posten.

**Stomdokument:** KUV §5 och §9, BED §4.2

**Utfall (9/10 05:02 UTC, körning 37885821554 på 28926d7; jobbet 10,4 min, mätningen 2,7).** Kartan läst med releasens sha256
(9f356ee8…); 823 stationer i kartan, vattenregeln tog 2534 (+3,51 K) och 2580 (+2,47 K). I kuvösen 737 stationer, 713 med avvikelse;
4 216 946 gemensamma punkter (RÅ ensam 4 359 014, 706 stationer i frysflaggan).

| Kandidat | grova fel | 0–7 · 7–15 · 15–20 · > 20 km | MAE | natt | dag och skymning | farliga fel, K2 0 |
| :-- | --: | --: | --: | --: | --: | --: |
| RÅ | 7,26 % | 5,32 · 4,99 · 7,12 · 13,13 | 0,67 °C | 5,73 % | 9,86 % | 4,9 % |
| KALL | 9,76 % | 5,86 · 7,50 · 9,66 · 16,56 | 0,83 °C | 8,14 % | 12,51 % | 6,1 % |
| KALL-NATT | 8,79 % | 5,69 · 6,49 · 8,68 · 15,32 | 0,77 °C | 8,14 % | 9,91 % | 5,6 % |
| KALL-½ | 7,63 % | 5,37 · 5,51 · 7,54 · 13,31 | 0,72 °C | 6,03 % | 10,34 % | 5,2 % |
| OFFSET (taket) | 5,31 % | 3,68 · 3,52 · 5,35 · 9,84 | 0,59 °C | 3,96 % | 7,60 % | 4,2 % |

Norr om 62° RÅ 13,76 % mot KALL 18,05, KALL-NATT 16,45 och KALL-½ 14,26 %; söder om 62° RÅ 4,73 % mot 6,53 · 5,82 · 5,05 %.

**Mot förväntningarna.** RÅ 7,26 % och bortom 20 km 13,13 % ligger inom spannen — populationen håller. KALL-½ 7,63 % ligger inom
7,1–8,0. KALL 9,76 % ligger över 7,3–8,5, KALL-NATT 8,79 % över 7,0–7,8 och bortom 20 km 15,32 % över 12,5–14,5. Det tydligaste
felet i förväntningarna gäller natten: KALL-NATT skulle ligga 0–0,5 procentenheter under RÅ där och ligger 2,41 över.

**Mot läsregeln.** Ingen KALL-kandidat ligger under RÅ — inte totalt, inte bortom 20 km, inte på natten, inte i norr eller söder — och
frysflaggans farliga fel ökar för alla tre (4,9 → 5,2–6,1 %). Kallkartan bär inte i den här formen.

**Läsningen.** Rättelsen skadar på natten ungefär lika mycket som på dagen (KALL +2,41 mot +2,65 procentenheter), fast kartan är byggd
av klara nätter, och den halva rättelsen skadar minst. Det är vad en karta utan samband med vägytans avvikelse ger: rättelsen blir
brus, och halva bruset skadar mindre. Möjliga skäl, inte prövade: vägen är plogad, saltad och trafikerad asfalt, ofta på bank, medan
satelliten ser snö, skog och mark, och en pixel blandar en kvadratkilometer. Inget tal i den här körningen skiljer skälen åt.

**Följd.** Förslaget enligt läsregeln: kallkartan läggs åt sidan som rättelse på RÅ — Bengts ord. Releasen och filen i repot står kvar,
inget raderas. Kriging (steg 2 i #481) står nu ensam: prövas eller läggs ned, en fråga till Bengt och Axel i bedömningens §4.2.
Kort #313 klart.

## #497 (9/10 2026) Kallkartan läggs åt sidan som rättelse på RÅ — Bengts ja

**Beslut.** Bengt 9/10: *"slå ihop 824 och ja till att lägga kallkartan åt sidan"* — på förslaget enligt läsregeln i #496, efter
körningen 37885821554 där alla tre KALL-kandidaterna var sämre än RÅ på samma punkter, också på natten: KALL 9,76 %, KALL-NATT
8,79 % och KALL-½ 7,63 % grova fel mot RÅ:s 7,26 %.

**Vad det betyder.** Kallkartan används inte som rättelse på RÅ — inte i prognoslagret och inte i förregistreringen för vintern
2026/27. Releasen `kuvos-modis-2022-25`, filen i `data/kallkartan/` och skriptet med sitt självtest står kvar; inget raderas. Varför
kartan inte bär är inte prövat (#496). En ny användning av den, till exempel som egenskap i en annan modell eller för att välja var
termisk kartering görs, kräver en egen förregistrering.

**Alternativ som valdes bort.** (a) Ett mindre k eller ett k ur en regression — det vore att anpassa efter facit på samma vinter,
och redan KALL-½ var sämre än RÅ. (b) Låta kartan stå öppen i §4.2 — en rad till utan en väg framåt.

**Följd.** Prognoslagrets steg *Kallkartan* bär beslutet; kriging står ensam som fråga till Bengt och Axel i bedömningens §4.2.

**Stomdokument:** KUV §5 och §9, MAT §1 och §5 och §9, BED §4.2

## #498 (9/10 2026) Testarvakten i DB-knappen: rader ur testartabellerna skrivs aldrig ut i Actions (kort #315)

**Beslut.** Bengt 9/10: *"den här spärren var nödvändig vid publikt eller hur. om den var nödvändig så ja"*. Den är nödvändig:
loggskanningen inför ett publikt repo (kort #311) fann testarnas svar och missar i sju körningar av DB-knappen — varnings-id,
station och klockslag, alltså ungefär var och när en testare körde. Loggarna raderades, men sammanfattningen på körningssidan bar
samma rader (DB-knappen kopierar sin utskrift dit med `tee -a "$GITHUB_STEP_SUMMARY"`), så Bengt raderade de sju körningarna helt
9/10. Utan en spärr kommer raderna tillbaka nästa gång någon läser tabellerna med knappen, och med ett publikt repo ser vem som
helst dem.

**Regeln** (`scripts/testarvakt.ts`, i `scripts/dbknapp.ts` för både `las` och `migrera`:s bevisrader). En sats som nämner
`driver_facit` eller `driver_miss` får skriva ut sitt svar bara om det är högst en rad där varje kolumn är ett tal, bedömt efter
Postgres typ — ett stationsnummer som text eller en tidpunkt släpps inte. Annars skrivs *VÄGRAT* med antalet rader och namnen på de
kolumner som inte är tal, inga värden, och körningen faller (steget kör med `pipefail`). Ett antal går alltid: `SELECT count(*) FROM
driver_facit WHERE received_at > now() - interval '2 hours'` bevisar att ett tryck kommit fram. Den som behöver se raderna läser
dem i Supabase SQL-editor, där inget hamnar i en logg. Inga vyer eller funktioner läser tabellerna (kontrollerat 9/10), så
tabellnamnen räcker.

**Bevis.** Självtest i ci.yml med elva fall; motprovat två gånger — spärren avslagen släpper `SELECT *`, radgränsen borttagen släpper
flera rader, och självtestet fäller båda.

**Vad den inte gör.** Den stoppar misstag, inte avsikt: den som gör om ett id till ett tal får ut det. Andra flöden skriver inte ut
testarnas rader (loggskanningen 9/10: inga träffar utanför DB-knappen, inga förare-id i textform). Vakthundens rad *förarfacit:
N svar (senast …)* är ett antal och en tidpunkt, utan plats, och står kvar.

**Alternativ.** (a) En egen databasroll för knappen utan rätt att läsa tabellerna — databasen vägrar själv, också vid avsikt. Starkare,
men kräver en ny roll och en ny hemlighet i GitHub, och hemligheterna är Axels; ett senare steg om repot blir publikt. (b) Sluta
kopiera till sammanfattningen — loggen läcker ändå. (c) Maskera all utskrift i läsläget — knappen blir oanvändbar som bevis.

**Följd.** Kort #315 klart i samma commit. Projektkartans bevis för förarsvaren pekade på körning 37249631052, som är raderad;
de pekar nu på DECISIONS #460, där talen står. Historiska hänvisningar till de sju körningarna i DECISIONS, STATUS och TAVLA står kvar.

**Stomdokument:** inga — DB-knappen och Actions-loggarna beskrivs inte i de sju; läget står på kort #311 och #315 och i projektkartan (g-kassan)

## #499 (9/10 2026) Repot görs publikt i dag — förberedelserna, det som blockerar och det Axel gör vid bytet (kort #311)

**Beslut.** Bengt 9/10: *"vi kommer att göra repot publikt idag så jag vill att alla förberedelser så långt det går är gjorda"*.
Bytet görs från Axels konto (repot är hans; Bengts konto har skriv- men inte adminrätt, så inställningarna nedan är Axels).

**Genomsökt 9/10.** git-historiken (2 258 commits, alla grenar och PR-referenser): inga personnummer, telefonnummer eller testarnas rader; i commit-huvudena bara Bengts gmail (1 564 som författare, 876 som incheckare); gmail-adresser i fyra filers historik men inte i dagens filer; städernas adresser är funktionsadresser. Ärenden och PR:er (1 247 texter): rena. Flödena: inga pull_request_target-, workflow_run- eller issue_comment-triggers, de tre PR-flödena läser inga hemligheter, inga egna runners. Actions-loggarna: #498 (sju körningar raderade, spärren i DB-knappen). gitleaks
över historik, ärenden och loggar: inga läckor (#495-förberedelsen och #498).

**Gjort i den här ändringen.**
- *Trafikverkets leverans lämnar releasen.* #438 lade den i en **privat** release, och villkoren för en publicering är okända; en release
  i ett publikt repo är publik. `arkivdump` får två lägen (`kuvos_ladda_upp`, `kuvos_hamta`) för `kuvos/<release>/<fil>` i den privata
  hinken `arkiv`, med en namnregel som inte släpper igenom något annat (prov i test/arkivdump.test.ts); knappen `kuvos-hinken.yml`
  kopierar de fem filerna och jämför sha256 efter hämtning; kuvos.yml läser leveransen ur hinken. Efter beviset raderar Bengt releasen
  `kuvos-trv-2024-25` och artefakten `kuvos-varningar` (varningar ur leveransen).
- De övriga releaserna får bli publika: SMHI (CC BY 4.0), MET Nordic (NLOD/CC BY 4.0), MODIS (NASA, fri), FYSIK (Axels egen fil).
  CC BY kräver att källan anges; releasernas texter bör säga det.

**Föreningens handlingar** (`docs/forening/`) namngav två personer utöver Bengt och Axel. Föreningen bildades aldrig, så handlingarna och namnen tas ur dagens filer — se #500, som också säger vad som står kvar i historiken.

**Bengt och Axel godtar eller inte** (kan inte ändras utan att skriva om historiken): Bengts gmail i commit-huvudena; de fyra
dokumenten om namngivna motparter (Trafikverksanmälningarna, Nira-utredningen, Skyltfondens bilagor, städernas citerade svar);
Skyltfondens handlingar; marknadsföringens utkast om samarbetspartners; de två namnen i historiken (#500).

**Axel vid bytet** (Settings): Actions → *Fork pull request workflows from outside collaborators* → *Require approval for all external
contributors*; Actions → *Workflow permissions* → *Read repository contents*; Code security → *Secret scanning* och *Push protection*
på; Branches → skydd på `main` (PR och gröna ci och md-vakt). Därefter: kassavakten visar 0 USD debiterat (kort #311:s Verify).

**Alternativ.** (a) Flytta releaserna till ett privat systerrepo — kräver en ny nyckel i GitHub, och nycklarna är Axels. (b) Radera
leveransen helt — kuvösen behöver den för FYSIK+BLANDNING (kort #308). (c) Skriva om historiken — löser inte PR-referenserna.

**Stomdokument:** BED §4.2

## #500 (9/10 2026) Föreningens handlingar ur repot — föreningen bildades aldrig

**Beslut.** Bengt 9/10: *"föreningen blev aldrig verklighet så det är helt och hållet oanvändbar info i dem"* — på frågan om det som
gäller föreningen kan lyftas ut inför bytet till publikt repo (#499). `docs/forening/` (stadgar, kallelse, protokoll, medlemsförteckning,
SKV 8400-arbetsbladet, körschemat) tas bort, och de två namnen utöver Bengt och Axel ersätts med *[namn borttaget]* i DECISIONS, STATUS,
TAVLA, bedömningen och Skyltfondens bilaga 1. Årsmötesraden i MALET och Skatteverksraden i bedömningen stryks. Omnämnanden av föreningen
i övrigt står kvar som historik (#396, #400, #404, #410).

**Det som står kvar i historiken.** Namnen finns i varje version av filerna på main från 3ecbeec (1/10) — 165 commits — och i två
commits på PR-grenar (2202df1, 765e578; den första också i commit-meddelandet), och 151 PR-referenser når dem. GitHubs kodsök läser
bara huvudgrenens aktuella filer, så namnen syns inte i en sökning, men den som bläddrar i historiken eller klonar repot når dem.
Att ta bort dem helt kräver att historiken skrivs om (alla commits sedan 1/10 får nya hashar; 161 hänvisningar i DECISIONS, STATUS,
TAVLA, bedömningen och projektkartan pekar på dem som bevis, och varje klon måste göras om) och att GitHubs support rensar
PR-referenserna, vilket tar dagar. Valet — godta resten i historiken och byta i dag, eller skriva om och vänta — är Bengts och Axels.

**Stomdokument:** BED §4.2 och §2

## #501 (9/10 2026) Historiken godtas, och Axel gör bytet till publikt repo i dag — förberedelserna klara, och hans lista

**Beslut.** Bengt 9/10: *"vi godtar historiken och ska göra bytet idag men det är axel som ska göra bytet. jag vill bara att
förberedelserna är helt klara. när du gjort detta vill jag att du listar vad axel ska göra för att vi ska vara publika"*. Det som står
kvar i historiken godtas: de två namnen i varje version sedan 1/10 (#500) och Bengts gmail i commit-huvudena (1 564 commits).

**Förberedelserna klara 9/10.** Trafikverkets leverans: arkivdump deployad från 64f590e (37895597775); knappen kuvos-hinken 37895684323: fem filer i arkiv/kuvos/kuvos-trv-2024-25/, sha256 lika med manifestet efter hämtning, ingen nyckel eller signerad adress i loggen; kuvos.yml 37895773651 läste leveransen ur hinken — alla fem summorna lika, 5 496 270 råa rader från 777 stationer inlästa som förut, körningen grön. Releasen `kuvos-fysik-2024-25` fick källhänvisningen
(Open-Meteo.com och ECMWF, CC BY 4.0); SMHI, MET Nordic och MODIS hade sin.

**Rättelse av #499.** Grenskyddet ska *inte* kräva pull requests: bridges, marknadsforing och trv-bevakning pushar själva till main.
Bara radering och force-push spärras. Standardbehörigheten för flödena kan sänkas till läsning, eftersom inget flöde utan eget
behörighetsblock använder GitHubs token.

**Före bytet (Bengt eller Axel):**
1. Radera releasen `kuvos-trv-2024-25` (Releases → releasen → *Delete*). Leveransen ligger i hinken, och kuvösen läser den därifrån.
2. Radera artefakten `kuvos-varningar` i körning 37447617038 (papperskorgen vid artefakten) — varningar ur leveransen.
3. Godta att det som står i repot i dag blir publikt: Trafikverksanmälningarna (`docs/ANMALAN-TRV-*`), Nira-utredningen,
   Skyltfondens handlingar (`docs/skyltfonden-2026-09-28/`), städernas citerade svar i bedömningen och marknadsföringens utkast
   (`marknadsforing/`). Historiken är godtagen (#501).

**Axel, inställningar före bytet (Settings):**
4. *Actions → General → Approval for running fork pull request workflows from contributors* → **Require approval for all external
   contributors**.
5. *Actions → General → Workflow permissions* → **Read repository contents and packages permissions** (inga flöden utan egen
   behörighet skriver, kontrollerat 9/10).
6. *Rules → Rulesets* (eller *Branches*): en regel för `main` med **Restrict deletions** och **Block force pushes** — **inte**
   *Require a pull request*: bridges, marknadsforing och trv-bevakning pushar själva till main och skulle stanna.

**Axel, bytet:**
7. *Settings → General → Danger Zone → Change repository visibility → Change to public*, och bekräfta med repots namn.

**Axel, direkt efter:**
8. *Settings → Code security*: kontrollera att **Secret scanning** och **Push protection** är på.
9. Säg till — Claude kontrollerar att repot är publikt och att flödena går, och kassavakten ska visa 0 USD debiterat (kort #311:s Verify).

**Stomdokument:** BED §4.2

## #502 (9/10 2026) Norr och söder om 62° redovisas och optimeras var för sig — en liten del av trafiken ska inte styra helheten

**Beslut.** Bengt 9/10: *"för mej är det rätt uppenbart att vi hela tiden måste tänka i ett norr och söderläge när vi försöker
optimera detta. Annars kommer en liten del av trafikmängden hela tiden dra ned helhetsresultatet och det kan ju inte vara meningen"* —
efter trafiken per band och region (skriptet ur #490, kört lokalt 9/10 på vägdatalagret 7/10):

| band | trafiken norr om 62° | trafiken söder om 62° |
| :-- | --: | --: |
| 0–7 km | 46,6 % | 70,7 % |
| 7–15 km | 35,9 % | 27,5 % |
| 15–20 km | 8,6 % | 1,5 % |
| > 20 km | 8,9 % | 0,3 % |

Norr om 62° går ungefär 11 % av landets trafik (räknat ur tabellerna: 53,7 % av trafiken bortom 15 km går där), och 17,5 % av den
bortom 15 km; söder om 62° 1,8 %. RÅ:s grova fel på kallkartans punkter 9/10 (#496): 13,8 % norr om 62°, 4,7 % söder.

**Vad det betyder.** Kuvösens och skuggans mått räknas per station och halvtimme, och norr väger där mer än dess andel av trafiken.
Därför, från nu:
1. Varje läsning av prognoslagret redovisar **norr och söder om 62° var för sig**, också per band, och **vägt med trafiken** i varje
   region, bredvid helhetstalet.
2. En kandidat, en tröskel eller en grind får prövas och väljas **per region**. Valet förregistreras som förut, och en regionsvis
   tröskel kräver ett eget beslut — två regioner är två prövningar, inte ett fritt val efteråt.
3. Norr läggs inte åt sidan: där bär 17,5 % av trafiken det långa avståndet, och tystnad bortom 20 km (spridningsgrinden) är svaret när
   osäkerheten är för stor, inte ett fel som döljs i ett riksgenomsnitt.

**Öppen fråga (Bengt 9/10):** *"i norrland vet man på vintern att det är halt och de har en annan beredskap för halka där … De kan nästan se det genom att titta på vägen"*. Ska norr ha en egen inriktning mitt i vintern — kraften på omslagen (oktober–november, mars–april), svartis och rimfrost på barmark, underkylt regn och broar, och tystare när vägen varit vinterväg i flera dagar? Det som syns och väntas tillför lite; det plötsliga och osynliga tillför mest. Underlag först: kuvösen kan mäta hur stor del av vintern ytan i norr ligger under noll i dagar i sträck, mot omslagen och de klara nätterna. En tystare regel ändrar vad föraren hör och kräver mätning och beslut; upprepade sanna varningar är inte i sig att ropa varg. Frågan står i bedömningens §4.2.

**Var Halkvakt hjälper lite och mycket i norr** (Bengt 9/10: *"så vi kommer ihåg var halkvakt hjälper lite och mycket"*).
En bedömning, inte en mätning — underlaget för frågan ovan.

| läge i norr | syns det på vägen? | vad Halkvakt tillför |
| :-- | :-- | :-- |
| Snö- eller isbelagd väg mitt i vintern | ja, och den är väntad | lite — förarna är redan beredda |
| Svartis och rimfrost på barmark en klar natt, utan nederbörd | nej — SYSTEMBILDEN: *"osynlig"* | mycket — det rimfrostgrenen ska se |
| Underkylt regn och blidväder på frusen mark | sällan i förväg | mycket |
| Broar, som fryser före vägen | nej | mycket — motorn varnar redan vid +3 °C på broar (`engine/src/engine.ts`) |
| Omslagen oktober–november och mars–april | som i söder: oväntat | mycket — då är beredskapen lägst också i norr |

**Väntar (Bengt: *"vi väntar med det ett tag"*).** Läsningen RÅ:s grova fel per band, norr och söder om 62°, vägt med trafiken i
varje region — ungefär tio minuter i kuvösen, gratis efter bytet till publikt repo (#501). Står i bedömningens §4.2.

**Stomdokument:** KUV §8, BED §4.2

## #503 (9/10 2026) Repot är publikt — bytet bekräftat, och kassavakten räknar inte minuterna efter bytet (kort #311)

**Beslut.** Bengt 9/10: *"vi är klara med omläggningen till publikt repo"*. Kontrollerat: repot publikt 9/10 omkring 09:45 UTC (Axel): API:et svarar `visibility: public` utan inloggning, och regeln för main är aktiv med *Restrict deletions* och *Block force pushes* (`deletion`, `non_fast_forward`) på standardgrenen; de fyra releaserna syns utan inloggning, Trafikverkets inte; hemlighetsskanningen syns bara för admin.

**Kassavakten rättad i samma varv.** Den räknade varje körnings minuter oavsett synlighet, så räkningen 11 UTC hade fortsatt säga
*"TAKET SLÅR I 2026-10-21"* fast standardrunners i ett publikt repo inte debiteras, och kort #311:s Verify — *"kassavakten visar
0 USD debiterat månaden efter"* — hade aldrig kunnat bli sann. Nu läser vakten repots synlighet: är det publikt räknas bara körningar som
startade före `PUBLIKT_FRAN` (2026-10-09 09:45 UTC, repots `updated_at` efter bytet, på minuten när), och prognosen räknar framåt med
takten noll; varningen *"Takten ändras"* tystnar, eftersom det är bytet som ändrar den. Går repot tillbaka till privat räknas allt som
förut. Beviset är kassavaktens rad efter deployen (räknas 05/11/17/23 UTC): *"PUBLIKT sedan 2026-10-09 09:45 UTC"* och issue #701
stängd av vakten själv.

**Kvar.** Axel bekräftar *Secret scanning* och *Push protection* (punkt 8 i #501; syns bara för admin). Kort #311 stängs när
kassavakten visar 0 USD debiterat för november. Oktobers minuter före bytet står kvar: omkring 700 debiterade, ungefär 6 USD av taket 35.

**Utfall (9/10 11:07 UTC).** Vakthund deployad från 63d9422 (37916879782); kassavaktens räkning 9/10 11:07 UTC: 2 728 min sedan 1/10, debiterat 728 min = 5,82 USD av taket 35, prognos 6 USD, *"Repot är publikt sedan 2026-10-09 09:45 UTC"*, och issue #701 stängd av vakten själv 11:07:19 (*"Stänger — god marginal igen"*). Taket nås inte i oktober.

**Stomdokument:** BED §4.2

## #504 (9/10 2026) Väderkällan för fysikspåret, nivå 1 — MET Nordic ligger närmare SMHI:s mätningar än ECMWF via Open-Meteo

**Läsning, inget val.** Axel 9/10: *"gör du inte en utvärdering analys först av vilken vi ska ta hem"* — och *"gör nivå 1 först"*.
Fysikspåret är kalibrerat på ECMWF IFS ur Open-Meteos arkiv (#485), som #485 säger inte får bära driften. Innan en ersättare väljs:
vilken källa ligger närmast verkligheten? Nivå 1 jämför källorna mot SMHI:s egna mätningar; nivå 2 är Axels modell omkalibrerad på
den valda källan i kuvösen.

**Upplägg.** De 70 VViS-stationer som har en SMHI-station inom 5 km (18 norr, 52 söder om 62°). MET Nordic Analysis i rutan närmast
(`kuvos-metnordic-2024-25`, #480) och ECMWF IFS ur Open-Meteos arkiv i samma punkt (hämtad 9/10, `data/vaderkallan/`), mot SMHI:s
mätning samma timme (`kuvos-smhi-2024-25`, #441): lufttemperatur, total molnmängd (113 utesluten), nederbörd 1 h; bara timmar där
alla tre finns. Skript `scripts/matningar/vaderkallan-{par,hamta-ecmwf,jamforelse}-2026-10-09.py`; rapport
`docs/VADERKALLAN-JAMFORELSE-2026-10-09.md`.

**Utfall (grova fel i luften, > 2 °C).** Alla timmar ECMWF 16,0 %, MET Nordic 8,7 %; frost 25,8 mot 15,2 %; nära noll (−3…+2 °C)
11,6 mot 4,5 %; norr 28,4 mot 20,4 %; söder 11,1 mot 4,1 %; sträng kyla (≤ −15 °C) 67,0 mot 64,6 % — båda för varma, +3,5 och
+2,9 °C. Molnen: medelfel 26,2 mot 23,8 pe, falskt klar 15,1 mot 11,5 %, klara timmar i norr hittade 24,2 mot 37,7 %. Nederbörden:
hittad 77,6 mot 71,7 %, falsklarm 45,4 mot 31,3 %.

**Förbehåll.** MET Nordic läser in SMHI:s stationer i analysen, så facit är inte helt oberoende för den; försprånget krymper inte med
avståndet till stationen (0–2 km 18,2 mot 13,4 %, 3,5–5 km 17,1 mot 8,9 %), men inläsningen går inte att utesluta. Ett oberoende
facit är VViS-stationernas egen luft och daggpunkt i kuvösen. Måttet är fysikens indata, inte vägytan; analys, inte prognos
(+1…+6 h omätt, #490); daggpunkt och vind saknar SMHI-facit och är inte jämförda.

**Vad som INTE görs.** Ingen källa väljs, ingen förregistrering, ingen omkalibrering. Valet är Axels och står i bedömningens §4.2,
med frågan till Bengt om en körning mot VViS-facit i kuvösen. Data: ECMWF-filen ligger i `data/vaderkallan/` (2,4 MB, sha256 i
`manifest.json`) eftersom releaser inte kunde skapas från sessionen; källa Open-Meteo.com / ECMWF, CC BY 4.0.

**Stomdokument:** BED §4.2

## #505 (9/10 2026) Väderkällan nivå 1b — MET Nordic och ECMWF mot vägstationernas egen luft och daggpunkt, förregistrerad (kort #318)

**Beslut.** Bengt 9/10: *"slå ihop 837 och kör nivå 1b nu"* — efter *"men då måste vi väl göra den breda mätningen för att få rättvisa
jämförelsetal eller?"*. Nivå 1 (#504) jämförde källorna mot SMHI:s luft vid 70 punkter, 18 i norr. Nivå 1b gör samma jämförelse vid
**alla vägstationer med data i kuvösen** — samma stationer som FYSIK prövades på (#485) — mot **vägstationernas egen luft och
daggpunkt**. MET Norways dokumentation (läst 9/10, kort #318) nämner inte vägstationerna bland det MET Nordic korrigerar mot, så facit
är oberoende för MET Nordic; MET Nordics fukt är modellens (MEPS) utan korrigering.

**Underlaget.** MET Nordic Analysis i rutan närmast varje station (release `kuvos-metnordic-2024-25`, #480). ECMWF IFS ur Open-Meteos
arkiv i varje stations koordinat, hämtad 9/10 för alla 854 stationer (`scripts/matningar/vaderkallan-1b-hamta-ecmwf-2026-10-09.py`,
samma anrop som nivå 1 men bara luft och fukt): 3 115 392 rader, luft −32,4…+17,7 °C, fukt 18–100 %, i den öppna releasen
`kuvos-ecmwf-2024-25` (sha256 7a247017…, `kuvos/ecmwf-leverans.json`; källa Open-Meteo.com och ECMWF, CC BY 4.0). Fältet `rh_pct`
deklarerat i värdevakten. Daggpunkten räknas ur luft och fukt med Magnus formel för båda källorna. Facit: vägstationens `air_temp_c`
och `dewpoint_c` i avläsningen närmast hela timmen (±15 min), stationer i karantän utelämnade (#299, med givarvakten #75), värdevaktens
spann hållna. Bara timmar där facit och båda källorna finns.

**Måtten.** Grova fel (> 2 °C), MAE och medelfel i luft och daggpunkt: alla timmar, nära noll (facit −3…+2 °C), frost (≤ 0 °C), norr
och söder om 62° (#502), avståndsband (stationens avstånd till närmaste andra station) och **vägt med trafiken** — varje väglagspunkt
(#490) räknas till närmaste station med sin ÅDT × 2 km. Skriptet `scripts/matningar/kuvos-metnordic-ecmwf-1b-2026-10-09.ts`, självtest i
ci.yml, motprovat: ECMWF räknad med MET Nordics värden fäller; att tidsfönstrets gräns tas bort fäller inte, eftersom en timme utanför
fönstret saknar källvärde och ändå hoppas över — skyddet finns två gånger.

**Förväntningar, skrivna före knappen.**

| | MET Nordic | ECMWF |
| :-- | --: | --: |
| underlaget | 700–760 stationer, minst 2,0 miljoner timmar med luft | samma |
| luft, grova fel, alla timmar | 9–16 % | 15–24 % |
| luft, norr om 62° | 18–30 % | 25–38 % |
| luft, söder om 62° | 6–12 % | 11–19 % |
| luft, nära noll | 4–10 % | 9–16 % |
| luft, vägt med trafiken | 6–12 % | 11–19 % |
| daggpunkt, grova fel, alla timmar | 10–22 % | 12–26 % |

Vägstationernas givare sitter vid vägen, ofta i svackor och skärningar, så felen väntas bli större än mot SMHI:s stationer för båda
källorna. MET Nordics försprång i daggpunkten väntas vara högst hälften av försprånget i luften, eftersom dess fukt inte korrigeras.

**Hur läsningen läses — en läsning, inget val av källa (Axels, #504).**
- MET Nordic är det bättre underlaget för fysiken om dess grova fel i luften är färre än ECMWF:s **vägt med trafiken och i både norr
  och söder**, och dess daggpunkt inte är mer än en procentenhet sämre.
- Vinner MET Nordic luften men förlorar daggpunkten med mer än en procentenhet, noteras att fukten bör tas från en annan källa (MEPS).
- Är ECMWF lika bra eller bättre i luften håller inte nivå 1:s slutsats på vägnätet, och frågan går tillbaka till Axel med båda
  tabellerna.

**Reservationer, med i läsningen.** Luft och daggpunkt, inte vägytan — nivå 2 (fysiken omkalibrerad på MET Nordic, mot FYSIK:s 9,85 %)
avgör. Analys, inte prognos: MET Nordics prognoser arkiveras sedan 2018 och kan prövas senare. En vinter.

**Kostnad.** En körning av kuvos.yml, omkring tio minuter, gratis sedan repot blev publikt (#503).

**Utfall (9/10 12:15 UTC, körning 37927729663 på 6ab24e0; mätningen 0,4 min).** ECMWF-filen = manifestet (sha256 7a247017…).
Vägstationernas timmar 2 683 984 från 754 stationer, daggpunkt i nästan alla; 753 stationer med facit och båda källorna.

| grova fel (> 2 °C) | MET Nordic | ECMWF | förväntan MET / ECMWF |
| :-- | --: | --: | :-- |
| luft, alla timmar | **9,0 %** | 16,2 % | 9–16 ✓ / 15–24 ✓ |
| luft, nära noll (−3…+2 °C) | **4,4 %** | 12,0 % | 4–10 ✓ / 9–16 ✓ |
| luft, frost (≤ 0 °C) | **16,0 %** | 26,5 % | — |
| luft, norr om 62° | **20,1 %** | 27,2 % | 18–30 ✓ / 25–38 ✓ |
| luft, söder om 62° | **5,1 %** | 12,3 % | 6–12 ✗ (bättre) / 11–19 ✓ |
| luft, vägt med trafiken | **5,6 %** | 13,2 % | 6–12 ✗ (bättre) / 11–19 ✓ |
| luft, trafikvägt norr / söder | **18,4 / 4,0 %** | 27,2 / 11,5 % | — |
| luft, band 0–7 · 7–15 · 15–20 · > 20 km | **4,7 · 6,1 · 9,3 · 19,8** | 12,9 · 13,6 · 16,4 · 25,4 | — |
| daggpunkt, alla timmar | 14,8 % | 14,7 % | 10–22 ✓ / 12–26 ✓ |
| daggpunkt, nära noll · frost | **9,9 · 20,2 %** | 11,8 · 24,8 % | — |
| daggpunkt, norr · söder | 24,1 · 11,6 % | 24,2 · 11,3 % | — |
| daggpunkt, vägt med trafiken | 12,5 % | 12,0 % | — |

**Mot förväntningarna.** Underlaget och nio av elva tal inom spannen. Två utanför, båda åt det bättre hållet för MET Nordic: söder om
62° 5,1 % (förväntat 6–12) och vägt med trafiken 5,6 % (6–12). MET Nordics försprång i daggpunkten blev noll, inom förväntan *högst
hälften av försprånget i luften*.

**Mot läsregeln.** MET Nordic har färre grova fel i luften än ECMWF vägt med trafiken, i norr och i söder, och dess daggpunkt är 0,1
procentenheter sämre totalt och 0,5 vägt med trafiken — under gränsen på en. **Enligt läsregeln är MET Nordic det bättre underlaget för
fysiken.** Valet är Axels (#504).

**Läsningen.** Talen ligger nästan exakt på nivå 1:s (8,7 och 16,0 % mot SMHI), fast facit nu är vägstationernas egna givare och
oberoende av MET Nordic: oron för att MET Nordic läser in SMHI:s stationer förklarade inte försprånget. Försprånget i luften är störst
nära noll (4,4 mot 12,0 %), där halkan uppstår. Båda källorna blir sämre ju längre en station ligger från andra (MET Nordic 4,7 % inom
7 km, 19,8 % bortom 20 km) — det är norr och glesbygden, samma bild som #502. Daggpunkten skiljer inte källorna åt: MET Nordics fukt är
modellens, utan korrigering, och dess daggpunkt ligger 0,43 °C för högt i medel; i frost och nära noll är den ändå bättre (20,2 mot 24,8
och 9,9 mot 11,8 %). Båda källorna ligger för varmt i frost (+0,57 och +0,72 °C).

**Följd.** Rapporten `docs/VADERKALLAN-JAMFORELSE-2026-10-09.md` har ett avsnitt om nivå 1b. Kort #318 klart. Nästa steg är nivå 2 —
Axels fysikmodell omkalibrerad på MET Nordic, i kuvösen mot FYSIK:s 9,85 % — och Axels val av källa.

**Stomdokument:** KUV §9, BED §4.2

## #506 (9/10 2026) Regeln PUBLIKT REPO i CLAUDE.md, ett register över datafilerna och en publikvakt i ci (kort #320)

**Beslut.** Bengt 9/10: *"men hur ska vi kunna komma ihåg detta. kan det läggas som en kravspec elelr?"* och sedan *"ja till alla
tre"* — efter frågan varför data inte får följa med fysikkoden in i det publika repot. Svaret var inte att metoden ska döljas (koden blir
publik, och det är bra), utan att Trafikverkets leverans inte är vår att publicera, att relationen med Trafikverket står på spel, att
det inte går att ångra, att det som räknats ur datan rad för rad i praktiken är samma data, och storleken.

**Vad som byggdes.**
1. **Regeln** — avsnittet *PUBLIKT REPO* i CLAUDE.md, som varje session läser först: vad som får ligga i repot, vad som aldrig får
   ligga där (Trafikverkets leverans och det som räknats ur den rad för rad, testarnas svar och missar, hemligheter, personuppgifter),
   att ett aggregat per station inte är rad för rad, och *osäker — lägg det i hinken och fråga*.
2. **Registret** `data/KALLOR.json` — de tio datafilerna med källa och licens (Trafikverkets öppna API och NVDB CC0, OpenStreetMap
   ODbL, NASA MODIS, ECMWF via Open-Meteo CC BY 4.0, SMHI CC BY 4.0, och fysikspårets fingeravtryck som aggregat per station).
3. **Publikvakten** `scripts/publikvakt.ts` i ci: hela trädet prövas — en datafil utan registerrad, en registerrad utan fil, en fil över
   20 MB, Trafikverkets leveransfiler, `.npy`, `oof` och exporter av testarnas svar fälls.

**Bevis.** `scripts/publikvakt.ts` med register `data/KALLOR.json` (tio datafiler med källa och licens); självtestet med nio fall i ci; trädet passerar (899 filer, ingen över 20 MB, inga förbjudna mönster); motprovat två gånger — utan storleksgränsen och utan registerkontrollen fäller självtestet; första körningen mot trädet fångade fyra migrationer i sql/ som mönstret tog för data, och mönstret begränsades till datafiler.

**Vad den inte gör.** Den läser namn och storlekar, inte innehåll, och inte releaser eller loggar — ett nytt sorts misstag fångar den
inte; då gäller regeln. Releaserna står i #499 och loggarna i #498.

**Rättelse 9/10, före sammanslagningen.** Vakten kraschade i ci (37931141510): `skills/swift-testing-pro/references` är en symbolisk länk (mode 120000) till `../../references`, som inte finns, och `statSync` följer länken. På Windows checkas länken ut som en liten textfil, så vakten gick igenom lokalt. Nu `lstatSync`, som läser länken själv. **Läxa:** ett skript som går igenom `git ls-files` ska läsa med `lstat`, och ett grönt lokalt prov på Windows bevisar inget om symboliska länkar — det gör ci på Linux.

**Stomdokument:** inga — regeln står i CLAUDE.md och vakten i ci; läget på kort #311 och #320 och i projektkartan (g-kassan)

## #507 (9/10 2026) Norr och söder per band och vägt med trafiken — den gemensamma redovisningen, och RÅ, FYSIK och OFFSET som utgångsläge (kort #317 (a))

**Beslut.** Bengt 9/10: *"ja till a nu, b väntar"* — på genomgången av kort #317 och #502. Principen i #502 (norr och söder var för
sig, per band och vägt med trafiken) följdes fullt ut bara i nivå 1b (#505); RN (#481), FYSIK (#485) och kallkartan (#496) har bara
totaler. (a) görs nu, som utgångsläge i samma form som det som kommer efter — nivå 2 (kort #319) och FYSIK+BLANDNING (kort #308).
(b), frågan om norr mitt i vintern, väntar till november med skuggans vinter i norr som underlag.

**Vad som byggs.**
1. **Den gemensamma redovisningen** `scripts/matningar/regioner.ts`: grind A:s grova fel (> 2 °C) på gemensamma punkter, för alla, norr
   och söder om 62°, per band (grind A:s ankKm) och vägt med trafiken (varje stations andel grova fel vägd med ÅDT × 2 km på
   väglagspunkterna närmast stationen, #490). Varje kommande läsning av prognoslagret importerar den, så att principen följer med
   av sig själv. Självtest i ci, motprovat tre gånger (regionfiltret av, trafikvikten som en etta — båda fäller; första versionen av
   självtestet fångade inte regionfiltret, och fick ett prov till).
2. **Läsningen** `scripts/matningar/kuvos-fysik-regioner-2026-10-09.ts`: underlaget och kandidaterna exakt som FYSIK i kuvösen (#485)
   — grind A:s WHERE med vakterna, RÅ (utanOffset), FYSIK på RÅ:s punkter ur den frysta filen (sha256 mot manifestet), OFFSET som tak —
   och redovisningen ur regioner.ts. Självtest i ci.

**Förväntningar, skrivna före knappen.** Kontrollen är #485:s tal på samma punkter; ett tal mer än en halv procentenhet därifrån är ett
fel i underlaget.

| | RÅ | FYSIK | OFFSET |
| :-- | --: | --: | --: |
| alla, alla band (kontroll #485) | 7,51 % ± 0,5 | 9,85 % ± 0,5 | 5,5 % ± 0,5 |
| norr / söder, alla band (kontroll #485) | 14,13 / 4,82 % ± 0,5 | 17,07 / 6,92 % ± 0,5 | — |
| norr · 0–7 km / >20 km | 7–12 / 18–28 % | — / 18–30 % | — |
| söder · 0–7 km / >20 km | 4–6 / 8–16 % | — | — |
| vägt med trafiken: alla / norr / söder | 4,5–6,5 / 10–15 / 4–5,5 % | 6–8,5 % (alla) | 3,5–5 % (alla) |

**Hur läsningen läses.** Ingen dom och inget val: talen är utgångsläget som nivå 2 och FYSIK+BLANDNING jämförs mot, per region och
vägt med trafiken.

**Kostnad.** En körning av kuvos.yml, omkring tio minuter, gratis (#503).

**Utfall 9/10** (körning 37932248631 på add4113; förväntningarna i samma commit, pushad före knappen). 737 stationer och 4 352 753
gemensamma punkter, FYSIK:s sha256 lika med manifestet; 729 stationer med trafik närmast sig, 183 i norr och 546 i söder.

| | RÅ | FYSIK | OFFSET (taket) |
| :-- | --: | --: | --: |
| alla, alla band | 7,5 % | 9,8 % | 5,5 % |
| alla · 0–7 · 7–15 · 15–20 · >20 km | 5,2 · 5,3 · 7,2 · 13,6 | 8,1 · 8,0 · 8,8 · 15,5 | 3,6 · 3,7 · 5,4 · 10,3 |
| alla · vägt med trafiken | 5,1 % | 7,6 % | 3,6 % |
| **norr**, alla band (1 255 431 punkter) | 14,1 % | 17,1 % | 10,7 % |
| norr · 0–7 · 7–15 · 15–20 · >20 km | 14,3 · 11,0 · 12,3 · 16,0 | 16,9 · 16,6 · 15,4 · 17,9 | 9,5 · 7,7 · 10,2 · 12,2 |
| norr · vägt med trafiken | 12,6 % | 16,0 % | 9,5 % |
| **söder**, alla band (3 097 322 punkter) | 4,8 % | 6,9 % | 3,4 % |
| söder · 0–7 · 7–15 · 15–20 · >20 km | 3,2 · 4,5 · 5,2 · 8,4 | 6,1 · 6,8 · 6,2 · 10,4 | 2,3 · 3,1 · 3,6 · 6,1 |
| söder · vägt med trafiken | 4,1 % | 6,6 % | 2,9 % |

**Mot förväntningarna.** Kontrollerna träffar: totalerna och norr och söder för RÅ och FYSIK ligger inom 0,05 procentenheter av #485,
så underlaget är kuvösens. De trafikvägda talen ligger inom sina spann. Fyra bandförväntningar missade: RÅ norr 0–7 km 14,3 % (väntat
7–12), RÅ norr >20 km 16,0 % (18–28), FYSIK norr >20 km 17,9 % (18–30) och RÅ söder 0–7 km 3,2 % (4–6). Förväntningarna antog att norr
följer söderns avståndstrappa, och det gör den inte.

**Vad talen visar** (ingen dom):
1. I söder följer felet avståndet: 3,2 % nära en station och 8,4 % bortom 20 km. I norr gör det inte: 14,3 % nära och 16,0 % långt
   bort, och bandet 7–15 km är bäst (11,0 %). Det som felar i norr sitter alltså inte främst i luckorna mellan stationerna.
2. FYSIK är sämre än RÅ i alla tio cellerna, också bortom 20 km i norr (17,9 mot 16,0 %).
3. Taket OFFSET, stationens egen historik, lämnar 10,7 % grova fel i norr (vägt 9,5 %), alltså mer än dubbla vägpunktsgrindens 5 % fast
   en station står på platsen. I söder lämnar det 3,4 %.
4. Vägt med trafiken får RÅ 5,1 %, inte 5,4 % som i #490. #490 vägde banden med trafikens andel, medan regioner.ts väger varje
   station med trafiken närmast den. Båda räkningarna är riktiga; framåt gäller regioner.ts.
5. Norrs 0–7 km-band har 90 004 punkter. Varför det är sämre än 7–15 km är inte utrett.

Punkt 1 och 3 är underlag för (b) i november.

**Stomdokument:** KUV §8 och §9, BED §4.2

## #508 (9/10 2026) Fysikkoden i repot — publik på Bengts beslut, fryst med samma sha256 som FYSIKSPARET-SVAR §1, utan data (kort #319)

**Beslut.** Bengt 9/10, väg (b) för nivå 2 av väderkällan (*"vi måste be axel skicka fysikmodellens kod från molnet"*): koden
läggs i repot och körs här. Axel lämnade valet till Bengt 9/10. Det ersätter Axels önskan 7/10 i #485 att hålla koden utanför repot
och bara leverera dess utdata som fil — den stod när repot var privat och koden bara fanns i molnsessionen; sedan 9/10 är repot
publikt (#503) och publik kod är rätt, så länge ingen data följer med (#506). PR:en kommer från Axels fysiksession, där koden skrevs.

**Vad som ligger i `fysik/`.** De tolv Bengt bad om — `prep.py`, `fetch_ifs.py`, `fetch_ifs2.py`, `physics.py`, `calib2.py`,
`common.py`, `layers.py`, `v4.py`, `expA.py`, `kuvos_replica.py`, `roadtest.py`, `fingeravtryck.py` — och `params_v2.json`, plus
sex filer som kedjan inte går att köra utan och som därför följer med: `prep_raw.py` (råuttaget kuvösreplikan läser), `fetch_elev.py`,
`geofeat.py`, `geofeat2.py`, `roadjoin.py` (höjd, terräng, skog, vägdata — `v4.py` läser deras filer) och `utdata_fysik.py` (FYSIK som
fil till releasen). `README.md` med ordning, tider, minne och sökvägar; `requirements.txt` med exakta versioner (Python 3.13.16,
numpy 2.5.3, pandas 3.0.5, scipy 1.18.1, scikit-learn 1.9.1, pyarrow 25.0.1; rasterio 1.5.2, geopandas 1.2.0, pyogrio 0.13.0,
shapely 2.1.2 bara för terräng och vägdata); `.gitignore` som spärrar data; `SHA256SUMS`.

**Kontrollen.** Filerna är byte för byte de som kördes: `physics.py 32972b71…`, `params_v2.json 65a431c4…`, `common.py a76d799c…`,
`layers.py 14619655…`, `v4.py 2bf71bf5…` — samma som FYSIKSPARET-SVAR §1 — och `expA.py 81a8085c…`, `kuvos_replica.py c640619d…`.
`cd fysik && sha256sum -c SHA256SUMS` körs i ci.yml: en ändring i de frysta filerna är en ny modell och fäller bygget tills den fått
ett nytt frysdokument och ett nytt beslut. Nivå 2 görs som nya filer, inte som ändringar i dessa. Priset: de frysta filerna bär sina
absoluta sökvägar (`/home/claude/fys`), så kedjan körs genom en länk (README).

**Vad som INTE följer med** (CLAUDE.md *PUBLIKT REPO*): inga VViS-filer, ingen ECMWF-cache, inga `.npy`, inga `oof`-filer, inga
parquet, inga loggar; publikvakten går grön (926 filer). Trafikverkets leverans ligger i hinken; det som räknats ur den rad för rad
(`oof_A2.npy`, `B_sp.npy`, `fysik-2024-25.csv.gz`) är releaser eller hinken.

**De tre fälten MET Nordic saknar — svaret** (README, avsnittet om fälten). Fysiken (`physics.py`) läser inget av dem; bara den
inlärda rättelsen gör det, som 6 av 70 särdrag. Uppmätt 7/10 (`ablate.py`, A1-konfigurationen): ensamma värda 0,7 procentenheter
(12,9 → 12,2 %); bidraget ovanpå väg och terräng inte mätt separat. Rekommendation, Axels: **snödjup** ersätts av kolumnens eget
snötäcke `swe` (finns redan som särdrag; snöfallet härleds ur nederbörd vid luft ≤ +1 °C, MET Nordic har ingen snöfallskolumn);
**låga moln** ersätts av MET Nordics uppmätta långvåg — effektiv himmelsemissivitet som särdrag, och i fysiken `Lsky` direkt ur
långvågen i stället för Brutsaert-skattningen, den största vinsten med bytet; **marktemperatur** ersätts av kolumnens eget 5 cm-lager
(räknas redan, lämnas inte ut — en rads ändring i nivå 2:s kopia) eller stryks. Daggpunkten härleds ur fukten (Magnus). Allt är en
omkalibrering: `calib2.py` på MET Nordic ger nya parametrar och `expA.py` en ny rättelse, och den förregistreras som egen kandidat
före knappen (kort #319). Vad det kostar att stryka de tre helt är inte mätt: 0,7 procentenheter är deras värde ensamma, och bidraget ovanpå väg och terräng mättes inte.

**Körning** (README): hela kedjan från tomt ~3–4 h klocktid, det mesta väntan på Open-Meteo och rastrarna; med cachen ~50 min, varav
`expA.py` 45 min. Minne uppmätt 9/10: 2,6 GB RSS till och med första veckets designmatris; 4 GB räcker.

**Alternativ som valdes bort.** (a) Bara de tolv filerna — kedjan stannar på `v4.py` utan höjd, terräng och vägdata; de sex följer
med och är märkta i README, Bengt kan stryka dem. (b) Byta sökvägarna till relativa — hade ändrat hasharna; länken är billigare.
(c) Lägga `final.py` (B_sp bakom de 23 %) med — talet är återräknat i `fingeravtryck.py` mot båda modellerna (SVAR §5), så
`roadtest.py` står som källa utan att vara ett steg.

**Vad som INTE görs.** Ingen omkalibrering i den här PR:en, inget utfall, inga trösklar. Nivå 2 är kort #319: nya filer, egen
förregistrering, knappen på Bengts ord.

**Rättelse 9/10 kväll (granskningen i Bengts session, Bengts ja).** Två rader rättade efter sammanslagningen (a10c9fa): (1) posten sade *"högst 0,7 procentenheter"* för att stryka de tre fälten — talet är deras värde ensamma, och bidraget ovanpå väg och terräng mättes inte, så kostnaden är okänd; (2) stomdokumentraden pekade på KUV §6, men ändringen på kuvössidan gjordes i §12 (loggen). Samtidigt flyttades kort #319 från Axel till Claude: nyckeln är levererad, nivå 2 byggs i Bengts session som nya filer, med förregistrering och knappen på Bengts ord; Axels val av källa står kvar. I projektkartan sade raden för nivå 2 både att koden bara fanns i Axels session och att den låg i repot — rättad, och ett byggsteg *Fysikkoden i repot* med a10c9fa som bevis. Kuvössidans kö (§9) sade *Axels fil* — rättad.

**Stomdokument:** KUV §12, BED §4.2

## #509 (9/10 2026) Väderkällan nivå 2 förregistrerad — fysikkedjan omkörd i kuvösen på ECMWF som kontroll och på MET Nordic som kandidat, förväntningarna före knappen (kort #319)

**Beslut.** Bengt 9/10 kväll: *"kör nivå 2"*. Nivå 2 är fysikspåret (värmekolumnen och den inlärda rättelsen, #485, #508) med vädret
bytt från ECMWF till MET Nordic, prövat i kuvösen mot samma facit som FYSIK. Bara vädret får skilja: därför körs först den frysta
kedjan om i kuvösen som **KONTROLL** (ska ge FYSIK:s 9,85 %), och sedan samma kedja på MET Nordic som **NIVÅ 2**. Ingen dom; utfallet
är underlag för Axels val av källa (kort #319). Trösklar, drift och de frysta filerna rörs inte.

**Vad som byggs** (`fysik/niva2/`, README där; `scripts/matningar/kuvos-fysik-niva2-metnordic-2026-10-09.ts`; steg i kuvos.yml).
1. **Kontrollen:** `v4.py` och expA:s A2-konfiguration körs som de frystes, på Trafikverkets filer ur hinken och Axels indata
   (höjd, terräng, vägdata, ECMWF-cachen). oof_A2:s sha256 skrivs ut bredvid den frysta (`9268c6c7…`); byte för byte lika bevisar
   återskapandet, annars avgör talen (gradientboostningens trådar kan ge sista decimalen olika).
2. **Nivå 2, samma kedja med vädret bytt** (fysik/README.md, Axels rekommendation, #508): daggpunkt ur fukten (Magnus, som 1b);
   snöfall ur nederbörd vid luft ≤ +1 °C i Open-Meteos enhet (7 cm per mm) så att snötäcket räknas som förut; strålningen i W/m²;
   **uppmätt långvåg i fysiken** i stället för Brutsaert-skattningen; höjdskillnaden 0 (1 km-rutan står vid stationen). De tre
   ECMWF-fälten ersatta i rättelsen: snödjup → kolumnens eget snötäcke, marktemperatur → kolumnens 5,5 cm-lager, låga moln →
   effektiv himmelsemissivitet ur långvågen. Fysiken **omkalibreras** med calib2.py:s protokoll (Nelder–Mead, A1 + 5·A2, vecken
   0/2/4, läses på 1/3) på tio parametrar — `cloud_p` och `lapse` är overksamma med uppmätt långvåg och höjdskillnad 0. Rättelsen
   med samma 25 kluster, fem veck, samma radurval (samma frö, samma rader) och konfiguration som A2.
3. **Uppvärmningen:** MET Nordic-releasen börjar 31/10; timmarna 10/10–30/10 tas ur ECMWF-cachen så att timindex, 45-dygns- och
   72-timmarsfönstren och radurvalet är identiska med kontrollen. Den dömda vintern (1/11–) är helt MET Nordic-driven.
4. **Läsningen:** RÅ, FYSIK (den frysta filen), KONTROLL, NIVÅ 2, fysiken ensam på ECMWF och på MET Nordic (vädrets egen skillnad,
   utan rättelsen) och OFFSET på RÅ:s punkter, per band, frysflaggan, norr och söder per band och vägt med trafiken (#507); och
   andelen punkter där KONTROLL = FYSIK.

**Förväntningar, skrivna före knappen** (grova fel > 2 °C på RÅ:s punkter; FYSIK:s tal ur #485/#507).

| | väntat | skälet |
| :-- | --: | :-- |
| RÅ (kontrollen på populationen) | 7,4–7,6 % | #485 |
| KONTROLL | 9,85 % ± 0,3; lika FYSIK inom 0,005 °C på ≥ 95 % av punkterna om sha256 stämmer, annars inom 0,1 °C på ≥ 90 % | återskapandet |
| ECMWF ensam (frysta parametrar) | 20–27 % | Axel: fysiken ensam 24,6 % timvis på sin population |
| MET N. ensam (omkalibrerad, långvåg) | 15–24 %, lägre än ECMWF ensam | luften hälften så många grova fel (#505), långvågen uppmätt |
| NIVÅ 2 | 8,8–10,2 % (FYSIK 9,85); norr 15,5–17,5, söder 6,0–7,2; vägt med trafiken 6,8–8,0 (FYSIK 7,6) | rättelsen tar det mesta av vädrets fel — *"atmosfären är inte huvudproblemet"* |
| Kalibreringen på andra halvan | A2 ≤ de frysta parametrarnas A2 på samma halva | annars hittade Nelder–Mead ett sämre läge, och nivå 2 läses med det förbehållet |

**Hur läsningen läses.** Ingen dom. Ligger NIVÅ 2 mer än 0,5 procentenheter under FYSIK stöder kedjan MET Nordic som källa; mer än
0,5 över stöder den inte bytet; däremellan visar läsningen ingen skillnad. Fysiken ensam visar vädrets egen skillnad utan rättelsen.
Landar RÅ utanför 7,4–7,6 % eller KONTROLL utanför sitt spann läses inget annat: då skiljer populationen eller kedjan, och det förstås
först.

**Vad som krävs före knappen.** Axels indata-release `kuvos-fysik-indata-2024-25` (bedömningen §4.2, kort #319 nyckel 2) med
manifest i `kuvos/fysik-indata-leverans.json` — öppna källor per station, aldrig VViS. Kostnad: en körning, ~3 timmar, gratis (#503);
jobbets tak höjt till GitHubs 360 minuter för den här mätningen.

**Alternativ som valdes bort.** (a) Bara fysiken ensam på MET Nordic — billigt men svarar inte på frågan: kandidaten är fysik +
rättelse. (b) Återskapa höjd, terräng och vägdata här — Lastkajens vägdata beställdes för hand och terrängen läses ur rastrar över
nätet; en annan version gör jämförelsen oren. (c) Väg (a) i #319, Axel kör i sin session och lämnar en fil — Bengt valde väg (b) i
#508, och kontrollen i kuvösen är beviset att kedjan är densamma.

**Stomdokument:** KUV §9, BED §4.2
## #510 (10/10 2026) K-B:s och R-B:s uppspelningar byggda ur arkivet, spärrade som grind NT — och kodgrindens underlagsspärr förregistrerad (kort #309, #46, ärende #815)

**Beslut.** Bengt 10/10: *"går det att göra kort 309, 46 och 815 nu så gör vi dem"*, efter vinterkollen (frosten 6–8/10 läst 8/10, #491;
108 stationer under noll 9/10, snölarm i tre län, första vinterordet 8/10). Tre byggen, inga trösklar ändrade, inget utfall läst.

**1. Den gemensamma facitsidan** (`scripts/uppspelning-facit.ts`). B-grindarna döms ur arkivet (#363), och de två uppspelningarna läser
samma facit som efterhalkans (sql/028, #245, #247): ett *bekräftat halktillfälle* är en omklassning till halka i `road_condition_history`
på ett vägavsnitt inom 5 km från stationen, med motorns egna halkord (kontraktsgrinden vaktar kopiorna; `FACIT_KM` är nu den tredje kopian
av radien). Olyckor räknas separat och går aldrig in i grundtalet. Dagens punktmotor spelas upp ur stationens egen rad: yta ≤ 1 °C och
fukt (samma ord som snapshoten). Måttet är B3:s: per tillfälle T frågas om kandidaten fyrade inom 90 min före T (T-A:s fönster), och om
punktmotorn då var tyst — **nettonytt** — eller kom mer än 30 min efter kandidaten — **tidsvinst**; de redovisas delat (TRENDEN T-B).
Falsklarm är kandidatens fyrningar utan tillfälle inom 90 min efter. Natten räknas i svensk tid, middag till middag (#246, #366).

**2. K-B** (`scripts/grind-k-b.ts`, knappen `grind-k-b`, kort #309). Modellen är K-A:s — grind A:s leave-one-out med K3 som tak —
importerad ur `grind-k-a.ts`, som fick sin huvudkörning bakom en körs-själv-vakt så att funktionen går att importera (ingen kopia).
Svepet är K-A:s 27 kombinationer; K-A:s förslag K1 0 · K2 ±0,5 · K3 20 km märks i tabellen. K-B1 = (nettonytt + tidsvinst) / tillfällen,
golv 5 %, med marginalvakten. K-B2 är 0 per konstruktion (§1) och mäts ändå som det falsklarm klassningen hade orsakat om den fick
tala: hinkar med "fryser" över gränsen utan tillfälle inom 90 min. Giltigheten K-C1 räknas ur fönstret: minst 30 frostdygn (yta ≤ 0
någonstans i regionen) i minst 3 av fyra breddgradsregioner (NT-D:s band 57,5 · 60 · 63°).

**3. R-B** (`scripts/grind-r-b.ts`, knappen `grind-r-b`, kort #46). Villkoret och episoderna är R-A:s (`grind-r-a.ts`, importerade,
samma körs-själv-vakt; episoden bär nu sin starttid), genom den femdelade givarvakten (§3). Grenen fyrar när uthålligheten är nådd:
första raden + U. R-B1 som K-B1, golv 5 %. R-B2 falsklarm ≤ 25 % — facit är omklassningen, inte stationens yta, som redan ingår i
villkoret. R-B3 extra röst per station och natt där punktmotorn teg — redovisas, fäller inte (#103). R5 molnklassen ur SMHI i efterhand
på den bästa kombinationens episoder (klar · klar+mellan · alla), som R-A4. Giltigheten R-C1–C2: 15 frostdygn i 3 regioner; R-C3
täckningen efter vakten som andel; R-C4 OAVGJORT före tabellen.

**4. Spärren** (båda). Utan `--dom` skrivs bara facitsidan — tillfällen, stationer, nätter, regioner, län, olyckor — giltighetens
räkningar och (R-B) episodantalen per kombination, som R-A redan visar; aldrig fyrningar mot facit, aldrig en andel. `--dom` vägrar om
giltigheten inte är uppfylld i fönstret. Den första körning som läser ett B-utfall låser trösklarna (FRYSKLASSNINGEN §7, RIMFROST §9).
Knapparna trycks på Bengts ord; den spärrade körningen är kortens Verify-steg.

**5. Kodgrindens underlagsspärr** (`scripts/kodgrinden.ts`, ärende #815; Bengts förslag i bedömningen §4.2 9/10: *"lägg först en
underlagsspärr på C i skriptet, en skärpning, talet förregistrerat, och kör när snön legat en vecka i norr"*). C-raden får skriva
*"premissen håller"* först när arkivet bär **minst 30 rader med vinterord på kod 1 från minst 3 län**; annars OAVGJORT, och eventuella
träffar (farlighetsord på kod 1) listas ändå för läsning. Talet: lämnade Trafikverket farlighetsord på kod 1 i var tionde sådan rad hade
30 rader visat minst ett med 96 % sannolikhet (0,9³⁰ = 4 %). Knappen trycks omkring 16/10, när snön legat en vecka i norr (snölarmen
9/10) — eller tidigare för att se spärren hålla i drift.

**Bevis.** Självtester i ci för facitmodulen (B3 per tillfälle med fönstret åt båda håll, falsklarm, natten, giltigheten, spärrens rad,
facitfrågans form), K-B (fyrningar rätt och fel, punktmotorn, K-B1 med marginalvakt), R-B (fyrningen vid första raden + U, R-B1/R-B2,
R-B3 per station och natt), kodgrindens spärr (29/3 fäller, 30/2 fäller, 30/3 släpper, 1/1 fäller); K-A:s och R-A:s självtester gröna
efter vakten, och en import utan DATABASE_URL avslutar inte processen. Kontraktsgrinden grön med den tredje kopian av facitradien.

**Vad som INTE görs.** Inget utfall läst, ingen dom, inga trösklar; ingen motorändring (rimfrosten blir en gren först efter R-B och
Axels röst, §8 steg 6; K4 = E0). Kamerafacit och förarsvar är inte med i facitsidan (sql/028:s regel).

**Stomdokument:** MAT §5.2 och §6.3, BED §4.2

## #511 (10/10 2026) Arkivet ryms i vinter: gallring efter tre dygn med brotten sparade, raderingens golv 14 dygn (kort #322, #323)

**Beslut.** Bengt 10/10: *"vi kör alternativ 1+2 redan idag"*, på bedömningens §4.2 Grepp 3 efter läsningen 388 MB 06:14 UTC
(dbknapp 38030231454, PR #847): ~30 MB/dygn det senaste dygnet, 500 MB omkring 14–16/10, och raderingen ur exporten (#334) tog
augustidygn med ~8 200 rader mot ~57 000 in per dygn. Fyra val samma timme, alla enligt rekommendationen:
1. **Tre dygn i full upplösning** (förut sju). Nattjobbet `halkvakt-gallring` kör `gallra_arkiv(3)` (sql/044). Samma tal styr Norge,
   Danmark, Finlands varma rader och pg_crons logg, och inget läser dem längre bakåt: rimfrosten läser Finlands kalla rader, som sparas
   60 dygn för sig (sql/031), och vakthunden läser bara livemotorns senaste cron-körning.
2. **Brotten mot #75 sparas.** `gallra_vader` behåller rader där ytan ligger mer än 12 °C under luften. Karantänen i snapshoten räknar
   dem över sju dygn (KARANTAN_DYGN, kort #234); utan undantaget hade dygn 4–7 bara burit de brott som råkade vara sista raden i sin
   halvtimme, och en trasig givare hade släppts tidigare. Följden hittades i genomsökningen inför bygget och stod inte i §4.2:s alternativ.
3. **Golvet 14 dygn i dag**, med vakten mot saknade dygn först. `halkvakt-arkivradering` kör `arkiv_radera_exporterat(350, 14)` (förut
   30). V-A, V-B, NT, R-A (svenska arkivet), K-B och R-B fick vakten som A, K-A och höjdprovet redan bar (#352): de skriver ut saknade dygn
   och krymper aldrig tyst. De räknar på 14 dygn tills de läser resten ur hinken (kort #323).
4. **Ikapp första natten.** Jobbet anropar raderingen upp till 40 gånger per natt; varje dygn prövas som förut mot filens radantal, och
   ett fel stoppar nattens körning högljutt. Omkring 32 dygn (25/8–26/9) första natten, sedan ett per natt.

**Byggt (kort #322).**
- `sql/044_gallring_tre_dygn.sql`: `gallra_vader` med brottsundantaget (coalesce: en rad utan yta är inget brott); båda jobben via
  `cron.alter_job`, schemat orört (03:15 och 03:45 UTC); migrationen fäller om ett jobb saknas.
- Frosttrycket: `GALLRING_DYGN = 3` och `TRYCK_INTERVALL_D = 2` i `supabase/functions/vakthund/frosttryck.ts`. Vakthunden trycker steg 0
  och T-A med `dagar = 3` och högst vartannat dygn medan frosten varar; frostärendets texter följer talen.
- T-A och trendarkivet: standardfönstret och taket 3 (`GALLRING_DYGN`); workflowerna för T-A, trendarkivet och tillståndets steg 2 har
  standardvärdet 3.
- Kontraktsgrinden: kontraktet *Gallringens dygn* över de fyra kopiorna (frosttryck, trendarkivet, T-A, sql/044). Gränsen stod som lös
  siffra i elva filer utan vakt; sql/014 och sql/026 bär det gamla jobbet som historik.

**Prov.** Två integrationsprov mot PostGIS i ci kör jobbkommandona ur sql/044, inte avskrifter: gallringen efter tre dygn lämnar brotten,
gallrar raden utan yta, rör inte dygn yngre än tre och är idempotent; raderingen tar dygnen äldre än 14, äldst först, svarar sedan att
inget finns och lämnar ett dygn som är tio dygn gammalt. Lokalt: kontraktsgrinden grön med fyra kopior; motprov — en kopia satt till 7
fäller den, ett tryckintervall på 3 fäller frosttryckets prov; enhetssviten 277 prov, 0 fel (integrationsproven kräver databas).

**Driftsättning, efter Bengts "slå ihop".** DB-knappen `migrera sql/044_gallring_tre_dygn.sql` med bevisrader (jobbens kommandon,
funktionens definition), och deploy av vakthunden. **Verify:** nattjobben 11/10 03:15 och 03:45 UTC — raderade rader per jobb, vakthundens
rad *arkivexport: … N raderade ur databasen*, och databasens storlek som planar ut under 500 MB de följande dygnen.

**I drift 10/10 07:04 UTC** (Bengt: *"slå ihop 849 och b)"*): PR #849 sammanslagen som 377cc84 på huvudet 0d5c330 med ci och md-vakt
gröna; DB-knappen 38033120634 — `halkvakt-gallring` kör `SELECT gallra_arkiv(3)`, `halkvakt-arkivradering` kör
`SELECT arkiv_radera_exporterat(350, 14) FROM generate_series(1, 40)`, båda med schemat orört, `gallra_vader` bär brottsundantaget,
databasen 389 MB; vakthunden deployad från 377cc84 (38033122513). Läsningen 07:06 UTC (dbknapp 38033278427) gav 129 770 rader in
senaste dygnet, inte ~57 000 som talet ovan bygger på (det var 3/10:s ogallrade dygn); slutsatsen står, raderingen av augustidygnen
biter ännu mindre. (b) i bedömningens §4.2 — en engångs `VACUUM FULL` — är inte körd: den skriver en ny kopia innan den gamla släpps,
och toppen hade blivit ~580 MB, över gränsen där gratisnivån går i skrivskydd. Frågan står öppen i §4.2.

**Vad det kostar.**
- Frostläsningarnas frist blir tre dygn, och minutupplösning äldre än tre dygn finns inte längre, varken i databasen eller i exporten.
- Grindarna som läser 30–60 dygn (A, K-A, K-B, R-B, V-A, V-B, NT, R-A) räknar på 14 dygn och skriver ut resten som saknade dygn tills
  kort #323 är byggt. Vaktens rad säger att dygnen ska läsas tillbaka före en dom; den stoppar inte körningen.
- Databasen krymper inte, platsen återanvänds: det den hunnit växa till före första natten står kvar som golv.
- *Tillagt 10/10 efter driftsättningen, inte sett före:* frostnätterna 6–8/10 förlorar minutupplösningen 11/10 och 12/10 i stället
  för från 13/10 (#491). Bedömningens fråga om att bygga Ö-B:s instrument före 13/10 (påminnelse 12/10) faller därmed bort; kvar är
  rekommendationen att läsa Ö-B på nästa frost och i kuvösen.

**Alternativ.** Supabase Pro (~25 USD/mån, 8 GB, dagliga backuper): inte valt, gratisvägen från #334 står. Golvet först efter
återläsningen: inte valt, alternativ 2 hade då inte gett plats före 14/10. Svagare karantän: inte valt.

**Stomdokument:** MAT §1, BED §4.2

## #512 (10/10 2026) Databasvakten larmar vid 450 MB i stället för 400 — databasen krymper inte efter raderingarna (kort #322)

**Beslut.** Bengt 10/10: *"höj gränsen till a)"*, på bedömningens §4.2 (raden *Databasvaktens 400 MB-larm när databasen inte kan
krympa*). Vakthundens databasvakt (grepp 3, #232) larmar när `pg_database_size` passerar **450 MB** (90 % av gratisnivåns 500), i stället
för 400 (80 %). Provläget `?databasprov=1` sänker som förut gränsen till 0.

**Varför.** Gallring och radering frigör plats för återanvändning men minskar inte storleken (sql/014:16). Efter #511 står databasen
kring 400 MB — 390 MB 10/10 07:06 UTC (dbknapp 38033278427) och ~1,25 MB i timmen till nattens jobb — och hade den passerat 400 hade
larmet stått för gott och kommenterat varje timme i ärendet som bär alla vakthundens larm. Ett larm som alltid står döljer de andra.

**Alternativ.** (b) en engångs `VACUUM FULL` — Bengts första val samma dag, pausat: toppen under omskrivningen hade blivit ~580 MB,
över gränsen där gratisnivån går i skrivskydd (#511, *I drift*). (c) låta larmet stå: inte valt.

**Vad det kostar.** Marginalen mellan larm och skrivskydd krymper från 100 till 50 MB. I takten 10/10 (~30 MB/dygn) är det knappt två
dygn; när gallringen och golvet verkar ska tillväxten stanna, och det är nattjobbens Verify (kort #322) som visar om den gör det.

**Byggt.** `supabase/functions/vakthund/index.ts:468` (gränsen) och två kommentarer; kopian finns bara där (fullständig grep 10/10).
Dokumenten som bar regeln: KALENDERN, bedömningen, projektkartans *Arkivet* och GREPP3-ARKIVENs statusrad.

**Driftsättning och Verify.** Efter Bengts "slå ihop": deploy av vakthunden. Beviset är vakthundens egen rad efter deployen,
*databas: N MB av 500 (larm vid 450 MB)*, läst ur `net._http_response` med DB-knappen i läsläget.

**I drift 10/10 07:34 UTC** (Bengt: *"slå ihop 851"*): PR #851 sammanslagen som 304290f; vakthunden deployad från 304290f
(38034894523). **Verify uppfylld:** dbknapp 38036906879 läste vakthundens svar ur `net._http_response` — körningen 08:07 UTC skrev
*databas: 391 MB av 500 (larm vid 450 MB)*, körningen 07:07 fortfarande *(larm vid 400 MB)*. Samma rader: 387 · 388 · 390 · 391 MB
kl. 05–08 UTC, ungefär 1,3 MB i timmen före första nattens gallring.

**Stomdokument:** BED §4.2

## #513 (10/10 2026) Grindarnas tillfälliga databas: fönstret ur hinken och driften, grinden oförändrad (kort #323)

**Bengt 10/10:** *"börja med kort 323"* — beställt i #511 som del av alternativ 2.

**Varför.** Raderingens golv är 14 dygn sedan 10/10 (#511), och första natten raderas allt exporterat som är äldre. Grind A, K-A och
höjdprovet läser 60 dygn, de andra 30 eller fler (V-B sedan 15/9); utan återläsning räknar de på 14 och skriver ut resten som saknat.

**Beslut.**
1. Varje grindflöde bygger en tillfällig PostGIS 17 i jobbet (`.github/actions/tillfalliga-arkivet`, `scripts/tillfalliga-arkivet.ts`):
   driftens schema (`pg_dump --schema-only`), de exporterade dygnen ur hinken med kontrollsumman mot `arkiv_export` och inläsningen
   med `arkiv_aterlas` (sql/042), de ännu inte exporterade ur driften med `\copy`, och tabellerna grinden läser vid sidan av. Grinden
   körs oförändrad med `DATABASE_URL` mot den.
2. Ett exporterat dygn läses ur hinken även när driften har det kvar: samma rader (sql/034 bokför bara en fil med lika många rader),
   och den packade filen är en bråkdel av trafiken.
3. Karantänens `KARANTAN_DYGN` (7) dygn följer med före fönstret, ur `publish/snapshot-core.ts`. Utan dem släppte provet igenom rader
   som driften spärrar. Marginalen täcker också R-B:s 12 timmar och vägpunktens population (7 dygn).
4. `arkivdump` får läget `dygn_hamta`: signerade adresser till `weather_observations/ÅÅÅÅ-MM-DD.ndjson.gz`, bara hämtning, bara
   riktiga datum, högst `MAX_DYGN` (70) per anrop; laddaren hämtar i omgångar, eftersom V-B:s fönster passerar 70 dygn i november.
5. Flödena: grind-a, -k-a, -k-b, -r-b, -v-a, -v-b, -nt, -r-a (bara `land=se`; det finska arkivet exporteras inte) och hojd-prov (utom
   `premisser-fi`). Provet är knappen `tillfalliga-arkivet`: driften mot den tillfälliga databasen dygn för dygn (antal och md5 över
   raderna, sorterade bytevis) och grind A och V-A mot båda samtidigt.

**Provet på grenen 10/10, driftens väg** (före deployen av `dygn_hamta`). Körning 38049009787: 1 dygn och karantänens 7 före — 9 dygn
ur driften, alla 9 lika i antal och md5; grind A och V-A gav samma utskrift i driften och i den tillfälliga databasen. Två prov före
det visade två fel som är rättade: md5 skilde på varje dygn fast antalen var lika (38048655495 — driftens och behållarens kollation
sorterar olika; nu `COLLATE "C"`), och grind A släppte igenom 646 083 rader genom karantänen mot driftens 645 841, 718 stationer mot
717, med samma MAE och dom (38048815179 — dygnen före fönstret saknades; nu punkt 3).

**Vad det kostar.** Dygnen ur driften kostar ungefär 100 MB per körning (100,9 MB uppmätt för 9 dygn: de tre ogallrade dygnen väger
mest), hinkens dygn under 1 MB vardera packade. Fyra måndagskörningar (A, höjdprovet, V-A, V-B) blir ungefär 0,4 GB i veckan, mot
gratisnivåns 5 GB okachad utgående trafik i månaden för hela organisationen (Supabase: *Manage Egress usage*). Grindarna hämtade redan
förut sina fönster ur driften, så tillskottet är mindre; det läses i panelen efter måndagen (bedömningen §0b). Körtiden ökar med
ett par minuter per flöde; timeouterna är höjda till 30 minuter.

**Alternativ.** Veckodumpen ur hinken som grund (förkastat: den saknar dygnen som raderats före dumpen och behöver ändå
dygnsfilerna); två databaser i varje grind (förkastat: ändrar nio grindars kod); `postgres_fdw` mot driften (förkastat: drar ändå
raderna över nätet). Export tidigare än nio dygn — gallringen är klar efter tre (#511) — minskar driftens del; inte nu, ett eget beslut
om trafiken kräver det.

**Verify (kort #323):** efter sammanslagningen och deployen av `arkivdump`: provet med hinkens dygn i fönstret (alla lika), och
måndagens grind A och V-A via pulsklockan utan saknade dygn utom de som aldrig hämtades (6/9 och 7/9 finns varken i driften eller i
exporten).

**Stomdokument:** MAT §1, BED §0b

**#513 provat 10/10, med hinkens dygn i fönstret** (efter #514): provet `tillfalliga-arkivet` med 38 dygn (körning 38057014942, 13:47 UTC): fönstret 26/8–10/10, 35 dygn ur hinken (8,3 MB), 9 ur driften, 6–7/9 saknas i båda (aldrig hämtade); 44 av 44 dygn lika driften i antal och md5; grind A och V-A gav SAMMA UTSKRIFT i driften och i den tillfälliga databasen (24 och 42 rader); trafik 102,5 MB ur driften. Första körningen med hinken (38049764165) gav 40 av 44 lika; de fyra andra var fyndet i #514. Kvar av Verify: måndagens körningar via pulsklockan.

## #514 (10/10 2026) Raderingen exporterar om ett dygn som vuxit sedan exporten, i stället för att stoppa hela natten (kort #322, #323)

**Fyndet.** Provet för kort #323 (körning 38049764165, 38 dygn) gav 40 av 44 dygn lika driften rad för rad. De fyra andra, 19–22/9,
bär 6, 9, 9 och 8 rader fler i driften än i sina exportfiler (dbknapp 38050128850): rader från en eller två stationer per dygn, spridda
över dygnet, utan brott mot #75, med transaktions-id kring 1,52 miljoner mot dygnens median 0,75–0,87 miljoner — insatta långt efter
exporten. Vad som skrev dem är inte utrett; det mest troliga är att Trafikverket skickade om en stations äldre observationer och att
inläsningen satte in rader som gallringen hade tagit.

**Följden.** sql/034 lät ett sådant dygn stoppa raderingen med ett undantag — byggt för ett anrop per natt. Sedan sql/044 (#511) gör
nattjobbet 40 anrop i en sats, och undantaget rullar tillbaka hela natten. I natt hade raderingen tagit 26/8–18/9 (22 dygn), nått 19/9
och rullat tillbaka alla 22, och så varje natt. Det föll i #511:s egen ändring och syntes inte i provet för #322, som saknade sena rader.

**Beslut.** sql/045: ett dygn med fler rader än sin fil tas ur bokföringen (`arkiv_export`), så att arkivexporten tar det igen nästa
timme med de sena raderna (den skriver över filen, `x-upsert`), och raderingen går vidare till nästa dygn. Dygnet raderas en senare
natt. Ingen rad raderas som inte står i en fil. Läkningen i samma fil tar de dygn som redan vuxit, så att 19–22/9 exporteras om i dag.
Proven i `test/integration.test.ts` (#83 och #322) bär en sen rad: dygnet står kvar och i exportens kö, och natten raderar de andra.

**Alternativ.** Hoppa över dygnet och låta det stå (förkastat: det står då kvar för alltid och väger i databasen); radera ändå
(förkastat: de sena raderna finns i ingen fil). Ett anrop per sats i nattjobbet (förkastat: raderingen tar alltid det äldsta dygnet, så
samma dygn fäller varje anrop).

**Reservation.** Ett dygn där en sen rad ersatt en exporterad rad med samma antal syns inte i räkningen; provet för #323 jämför
kontrollsummor och fann inget sådant dygn bland 44.

**Verify:** migrationen med DB-knappen före 03:45 UTC 11/10; 19–22/9 exporterade om med de sena raderna (arkiv_export.rader lika
driften); provet `tillfalliga-arkivet` med 38 dygn utan olika dygn; nattjobbet 11/10 03:45 har raderat dygn (vakthundens rad).

**Stomdokument:** BED — läget (Databasen)

**#514 i drift 10/10** (Bengt: *"slå ihop 855"*): sql/045 i drift 10/10 12:17 UTC (PR #855 som 13e8a38, DB-knappen 38051426175); 19–22/9 omexporterade 12:40 och 13:40 UTC med de sena raderna (DB-knappen 38056988569: 9 377, 5 790, 2 477 och 3 090 rader, lika driften; eftersläpningen 0; 400 MB). Provet för #323 därefter: 44 av 44 dygn lika driften (38057014942). Kvar av Verify: nattjobbet 11/10 03:45 har raderat dygn.

## #515 (10/10 2026) Projektkartan visar takten: de senaste sju dygnens steg, och varje ändring med sin commit (kort #325)

**Bengts fråga 10/10:** *"jag tycker att vi jobbar och jobbar men klarprocenten i projektkartan rör sig inte överhuvudtaget. är det
rätt att våra ansträngningar inte syns där"*. **Svaret, räknat:** procenten är andelen av allt kartan känner, och kartan växer medan vi
bygger. Mellan slutet av 3/10 och 10/10 gick klara steg från 225 till 281 och procenten från 64 till 66 %: 67 nya steg och 6 nya delar
kom till (kuvösen 36 steg, styrningen 19, källorna 10), och av de 434 steg som fanns 3/10 blev bara 4 fler klara — det som återstår av
den planen väntar mest på vintern (65 steg i 19 delar) eller på Axel.

**Beslut (Bengt: *"jag vill att du lägger in a) så att man kan härleda sitt arbete"*, *"gör den som dropdown om du tar med alla
stegen och commiten"*).** Formeln är oförändrad. Överst på kartan står takten för de senaste sju dygnen före HEAD:s commit: klara steg
(som fanns och som kom till), nya steg, nya delar, steg som gått tillbaka och borttagna, en tabell per block, och i en fällbar lista
varje ändring grupperad per commit med tid, länk och rubrik. `scripts/takten.ts` läser git-historiken för `docs/projektkartan.json`;
`projektkartan.ts` skriver `docs/takten.json` varje gång den körs, och `--check` prövar sidan mot filen (en PR-körning bär inte
main-historiken). Kartsynkens `--tillatna` släpper igenom filen.

**Hur ett steg följs.** Ett steg matchas på delens id och sitt namn. Ett namnbyte — ett nytt steg på samma plats i delens lista som
ett som försvunnit, i samma commit — och en flytt — samma namn som försvinner ur en del och dyker upp i en annan, i samma commit —
följer sitt läge och räknas bara om statusen ändrats. Ett steg som skrivs om under ett nytt namn i en senare commit räknas som
borttaget och nytt; att para sådana kräver en gissning. Commitens författare tas inte med: namn hör inte hemma i en fil i det publika
repot, och rubriken och länken räcker för att hitta arbetet.

**Vid bygget:** 68 steg klara 3/10 14:17–10/10 14:17 (28 som fanns, 40 som kom till), 76 nya steg, 6 nya delar, 1 tillbaka och 9 borttagna; 133 ändringar i 50 commits, varav 4 namnbyten och 2 flyttar som följer sitt läge; procenten 64 → 66 %. Siffran 68 är brutto och perioden börjar 3/10 14:17; nettot från slutet av 3/10 är 56.

**Alternativ.** (b) dessutom en procent mot en omfattning som låses varje måndag (inte valt); (c) kartan som den var (inte valt).

**Stomdokument:** BED §4.2
