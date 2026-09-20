# Bedömning v3 — den enda listan: nu, senare, ännu senare

**Status: LEVANDE LISTA.** Det här är det enda dokumentet som säger *vad som görs och när*. Kartan
(`docs/INTEGRATIONSKARTAN.md`) säger *varför* och är **fryst** sedan 15/9 — nästa ändring där kommer
efter att något byggts och mätts, inte lästs en gång till. Granskningen är **arkiverad**; det den hade
kvar står i bilaga A.

**v3 = v2 omprioriterad efter Axels andra brev (15/9) och Bengts två beslut samma dag:**
1. Betatestarna får skicka varningsfacit — med samtycke, i känd krets (löftet "samlar in: ingenting"
   gäller oförändrat för allmänheten).
2. Efterhalkan släpps som **märkt beta** i november, före grinden, och döms i januari på förarfacit
   plus vad kamerafacit hunnit ge.

Trösklarna rörs inte. De skrivs fortfarande före mätning. Det som ändras är att mätningen börjar i
november i stället för mars, för att facit kommer från en källa som faktiskt fylls: förarna.

**Uppdaterad 17/9:** grepp 2 fastställt och alla beslut tagna. **Läget står överst** — var vi är och vart vi är på väg
— och resten av listan stryks fortlöpande när beviset finns.

**Uppdaterad 20/9 (DECISIONS #251):** dokumentet är kopplat till integrationskartan och byter inte form. Tre saker
gjordes: det som var klart men inte struket ströks · det som utelämnats fördes in (genomlysningen #249 med korten
#210–#221, och stängningen #250) · **varje punkt bär nu sina kort i en egen kolumn**, så att tavlan och listan går
att läsa mot varandra. Kort utan rad här hör hemma på tavlan, inte i bedömningen.

---

## Läget 20/9 — var vi är och vart vi är på väg

**Var vi är.** Driften är tät och vaktad, och reglerna för efterhalkan är fastställda. **Flaskhalsen har flyttat från bygge
till beslut och händer: fem saker ligger hos Axel (§4.2), och produktspåret väntar på vädret.** Frost finns på enstaka
stationer sedan 14/9 (som mest 5 st 18/9; frostvakten larmar vid 50), men ingen natt har ännu haft *blöt väg som faller
mot noll* — det S1-grinden behöver. Inga förarsvar har kommit: bygget 0.3.7 saknade knapparna, och 0.3.8 väntar på Axel.
Avstämt mot GitHub 20/9: inga öppna PR:er, 51 sammanslagna sedan 17/9 (alla från det här kontot), **ingen incheckning från
Axel sedan 17/9**, alla byggen gröna.

| Område | Läge 20/9 | Kort |
| :-- | :-- | :-- |
| Regler för efterhalkan — C, D, T | ✅ fastställda 17/9 (DECISIONS #220–#228) | #197 |
| Betans startvärden | ✅ regn inom 2 h · fall ≥ 0,8 °C på 30 min · yta +1…+3 °C · allt regn > 0 räknas | #197 |
| Radar, regnmängd, startband, SMHI-förlängning | prövas i mars som varianter ur arkiven (#223–#226) — ✅ radar, regnmängd och startband byggda och körda 20/9 (DECISIONS #244, utfallet blindat); SMHI-varianten väntar på vintervarningar i arkivet | #197, #43 |
| Skuggloggen för efterhalkan (S1) | ✅ byggd — tunn: 3–7 rader per dygn från 1–4 stationer 16–20/9, **noll träffar på kombinationen**; uppspelningen ur arkiven: en träff på 14 dygn (14/9, under regn) | #192, #89 |
| **Motorregeln för betan (S3)** | ⏳ **inte byggd — väntar på S1-grinden**, alltså på blöta frostnätter. Axels bygge | #89, #88 |
| Facitknappen (S4) | ✅ server, Android, iOS-kod · ❌ bygget 0.3.7 i TestFlight saknade knapparna (#240) · ⏳ 0.3.8 (11) ligger på main sedan 18/9 — **byggordning C beslutad 20/9 (#242): ett sammanhållet bygge med #203; kanalen bevisas i simulatorn — #205 i drift, väntar på Axels tryck; stoppdatum 27/9** · **0 riktiga förarsvar** | #21, #205 |
| Facit utan att stanna (#203) | 📄 underlaget klart (`docs/FACIT-EFTER-RESAN.md`), väntar på Axels åtta beslut | #203 |
| Ordlistan vidgad (grepp 1) | ✅ på servern · ⏳ når telefonerna med 0.3.8 | #97, #52 |
| Facitstacken för domarna (kortet är **#51**, *moaten läcker*, 4/9) | ✅ uppspelningen läser omklassning + olycka per episod inom 5 km (#247) · ⚠️ **omklassningar till halka: 0 på 14 dygn** (hela arkivet 7 rader — september, inte läcka) · olyckor 504, men utan orsak · kamerabilden väntar på granskningsbeslutet, **flyttat från 1/2 till efter första frosten** (Bengt 20/9, §4.2) | #157, #209, #51 |
| Vakter och drift byggda 18–20/9 | ✅ #200 marknadsföringen på pulsklockan (tre morgnar) · ✅ #201 vakthunden svarar i kassavaktens timme · ✅ #195/#202 vektorgeneratorn i fas och vaktad i CI · ✅ S7 kamerafacit-vakt · ✅ pulsnyckeln = PAT, bytesknapp prövad · ⏳ #160 måndagsserien på pulsklockan — bevisas måndag 21/9 | #200, #201, #160, #161 |
| Databasen | 177 MB av 500 (20/9 05:00Z; 169 den 18/9) — larm vid 400, Pro-beslut senast 1/11 (§4.2) | #83, #213 |
| Actions-kassan | 21,78 av 35 USD (19/9 23:07Z). Släpande takt 118 min/dygn ⇒ **taket nås inte i september i nuvarande takt**; bygg fortsatt snålt | #85, #152 |
| Skyltfonden | kontaktplan v6.4 klar · samtal 21–25/9 (Bengt) · ansökan skickas 28/9 | #25, #26 |
| **Produkten mot november** | ⚠️ **iOS säger "på väg &lt;null&gt;" vid 5,2 % av olyckorna** (38 av 732 på 30 dygn) · det tidiga olycksropet kan sägas tre gånger · Android står på 0.3.1 (4) mot iOS 0.3.8 (11) och **Play-kontot finns inte** · produktboken lovar sex saker koden inte gör · batteribudgeten aldrig mätt (genomlysningen 20/9, DECISIONS #249) | #210, #211, #217, #218, #219 |
| **Arkivet och vakterna** (vaktfrågan bor i **#50** sedan 4/9, inte i ett nytt kort) | ⚠️ **ingen backup finns, och arkivet går inte att återskapa** (Trafikverket ger bara nuläge och delta) · ~~vakthunden saknar dödmansgrepp~~ ✅ **byggt och bevisat 20/9** (#50 stängt, DECISIONS #254): healthchecken — den enda kontroll som kör utanför det den vaktar (#87) — frågar nu om vakthunden själv, och den tredje frågan läser ett verkligt SVAR, inte bara att anropet köades. Motprov gav UNHEALTHY och issue #399. ~~Kvar: tre checkar som aldrig kan fyra~~ ✅ **också klart 20/9** (#222, DECISIONS #255): kursorn mäts mot arkivkursorn, källorna är en namngiven lista, livemotorns EFFEKT mäts vid sidan av cron-statusen, och pulsjobben räknas mot ett golv under kontrakt. Deployat och bevisat med vakthundens eget larmprov efter deployen · vektorsviten certifierar inte korridorvinkeln (5°–90° omärkt) eller reprisavståndet (0–50 000 m omärkt) | #213, ~~#50~~ ~~#222~~ ✅, #212 |
| Gatornas data | Malmö svarade 18/9: egna stationer, inte öppna data — följdmejl om avtal skickat 19/9 · Stockholm, Göteborg och Trafikverket (Datex II): skickat, väntar | #93 |

**Kartans minimilista (§8) mot läget:** C grind för kombinationen ✅ · D gemensam kalibrering ✅ · E skattaren med nivå + bevis
(S2) ⏳ väntar bakom S1-grinden · A allvar som försprång (#153) ⏳ efter betan · B bevisbärare i snapshoten ⏳ inte påbörjad.
I kartans sekvens för en ny länk (§5.5) står efterhalkan på **steg 2 av 4: mäts i skuggan** — fältet är publicerat (N4),
villkoret är inte ändrat (S3), portarna inte speglade.

**Vart vi är på väg**

| När | Vad | Vem |
| :-- | :-- | :-- |
| **Vecka 39 (21–27/9)** | måndagsserien på pulsklockan bevisas 21/9 (#160) · **Skyltfondssamtalen 21–25/9** · databasen mäts 24/9 · Axel läser av Actions-kontot före 24/9 · **Axels åtta svar om #203** (inget svar finns bokfört 20/9 — hans ja 17/9 gällde C, D och T, #226) · simulatorprovet av sändkanalen (Axel, två minuter, efter #205) · kommer svaren inte senast 27/9 arkiveras 0.3.8 ändå · Axels besked om QR-sidan och partnerskapshållningen · TRV-brevet om byvindgivarna (Bengt) | Claude · Bengt · Axel |
| **28/9–1/10** | **ansökan till Skyltfonden skickas 28/9** (sista dag 1/10) — Claude för in de muntliga jaen i v6 | Bengt · Claude |
| **Oktober** | **grepp 3: Pro-beslutet** när databasvakten larmar (400 MB) eller senast 1/11 — villkor för domarna · **#203 byggs** (båda plattformarna) efter Axels ja · **S3 regeln i motorn** med startvärdena, tre portar och kontraktsgrinden — när S1-grinden passerats · S2 skattarens nivå · ~~#195 vektorgeneratorn~~ och ~~#202 generatorn i CI~~ (✅ 18/9) · `ubuntu-latest` byts 19/10 | Bengt + Axel · Axel · Claude |
| **Första frosten** (frostvakten: 50 stationer under noll; 20/9 som mest 5) | T-A steg 0 inom sju dygn (S9) · radarns bidrag mäts om, nu med snö · skuggloggen mot arkivet: räknar de lika? · S1:s första nätter och uppspelningen (`uppspelning-efterhalka.sql`) — underlaget för S1-grinden före S3 · **mät facitkällan: omklassningar till halka under frostnätterna (0 på 14 dygn i september, #247) — talet avgör bildfacitbeslutet, som flyttats hit från 1/2 (§4.2)** | Claude |
| **November** | **betan till tolv testare**, också trafiklärare (S5) · PAT roteras senast 15/11, pulsjobben med knappen | Axel |
| **December** | betan samlar facit · Supabase-tokenen går ut 8/12 · uppspelningen ur arkiven provkörs före januari · Skyltfondens besked senast 15/12 | Axel · Claude |
| **Januari** | **dom 1 på betan** (S6): godkänd eller oavgjord ⇒ fortsätter, underkänd ⇒ tas bort | Claude mäter, Axel dömer |
| **1 februari** | den enda justeringen — 48 punkter, på data från november–januari · beslut om bildfacit före dess | Claude, Bengt fryser |
| **Mars** | **dom 2** på data efter 1/2, med varianterna · kamerafacit-bilderna öppnas · skuggdokumentet §4 rättat (#198) | Claude mäter, Axel dömer |
| **Efter mars** | #153 allvar som försprång · Ä1–Ä7 · skolpaketet (våren 2027) | — |

**Så hålls listan (SESSIONSREGELN i CLAUDE.md).** En rad stryks i samma varv som beviset finns, med beviset på raden,
och läget ovan hålls aktuellt. Nya frågor skrivs in i §4.2 när de ställs. Kartan stryks inte löpande — den är fryst och
ändras först efter bygge och mätning.

---

## 0. Spårning — vad som hänt med varje NU-rad (uppdateras varje varv)

Bengts krav 15/9: kort, DECISIONS och issues som följer av åtgärderna ska gå att hitta HÄR. En rad stryks i §1
när beviset finns, inte när koden är skriven.

| # | Läge | Kort | DECISIONS | PR / issue | Beviset som gäller |
| :-- | :-- | :-- | :-- | :-- | :-- |
| N1 | ✅ **KLAR** — tystnadsfelet 16:02Z: **1 bild i `facit`**, senast 15/9 — första objektet någonsin; Axel 16/9: **26 objekt** sedan 16:00Z. *Reservation (Axel): 738 av 744 kameror står vid en station — radien säger nära, inte rätt sträcka; avgörs i mars när bilderna öppnas* | #157 | #189 | PR #270 | ett objekt i `facit`, räknat av tystnadsfelet |
| N2 | ✅ nyckeln i drift — live.json 2026-09-15T16:00:01Z (manifest-sha STÄMMER): **`rain_segments` 34 st** — t.ex. segment 16010 E16, kod 1 "Torrt", `regn` 3,1 (= 2,0 rå); `segments` 0 st, som förut i september. **Steg E byggt 15/9** (DECISIONS #191, PR #274): kolumn `vb` + skuggrapportens `vattenplaning`; ✅ första `vb`-raderna 17:30Z: **5 skuggvarningar** (E18 Karlstad→Örebro, 5 st, regnsegment 18060/18065/18067) i skuggrapportens `vattenplaning` | #154, #42/#81 C+E | #187, #191 | PR #270, #274, issue #15 | nyckeln i `live.json`, manifest-sha stämmer; V-B-rader |
| N3 | ✅ kalendern i drift — deployad 15:52Z, prov gav issue #272 med PAT:ens datum läst LIVE (2026-11-22, 67 dygn) och Supabase 2026-12-08 (83 dygn); **rotationen är Axels, senast 15/11** | #86 | #190 | PR #270, issue #272 | publicering med ny nyckel |
| N4 | ✅ **KLAR 16/9** — fältbeviset kom: första `regn_h` ur en publicerad `live.json` (§0b). `radar_h` uppskjuten, bevakas i §0b | #187 | #188 | PR #270 | fälten i `live.json`, manifest-sha stämmer |
| N5 | ✅ klar | — | #186 | — | kartan §7.8 |

### 0b. Bevakning — öppna åtgärder ur 15–16/9, tills de är strukna

Bengts krav 16/9: allt som beslutats ska stå här tills det är åtgärdat, markerat och struket. Raden stryks när
beviset finns — inte när koden är skriven.

| Åtgärd | Läge | Kort | DECISIONS | Beviset som gäller |
| :-- | :-- | :-- | :-- | :-- |
| ~~Spärrprovet (`?sparrprov=1`) + dbknapp läser svaret~~ | ✅ 16/9: dbknapp `sparrprov` 02:42Z: svaret läst ur `net._http_response` — `suppressed` med 1 rad: {kind: camera, id: prov:kam2, distM: 470, by: camera, sinceS: 5} — kam2 tystad 5 s efter kam1 och talad först vid t=15 när 10 s-spärren släppt. Första provet 02:38Z FÖLL: kamerorna 14 s isär, båda talade — spärren är 10 s sedan kort #127 (13/9), inte 45 s som CLAUDE.md:s invariant säger | #191 → #188 | #197 | `suppressed` med en rad i dbknapp-svaret |
| ~~S1: `efterhalka` i skuggloggen~~ | ✅ **första raden med innehåll 16/9** (1 station, regn_h satt, inget larm). Nätterna bevakas i raden om skuggloggen vid första frosten | #192 | #198 | rad med innehåll |
| ~~R1–R16 in i kartan~~ | ✅ införda 16/9, kartan fryst igen | #159 | #199 | kartan §5.2/§5.6/§7.8/§14, bilaga A struken |
| ~~N4:s fältbevis på CDN (`regn_h`, `lutning`)~~ | ✅ 16/9: skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den | #187 | #188 | `weather[0]` bär fälten |
| ~~#188 `suppressed` med innehåll~~ | ✅ 16/9 via spärrprovet | #188 | #193 | se raden ovan |
| ~~Grind V-B:s dom-knapp~~ | ✅ **byggd och körd 16/9** (DECISIONS #211/#212): ⊘ domspärr som väntat; underlaget säger TORRT 0 av 14 — radar och station eniga om att det regnar, oeniga om hur mycket. Knappen upprepas varje regnvecka | #81 E, #194 | #191, #211, #212 | knappen med ⊘-disciplin |
| S4 facitknappen + produktbokens löfte | 🔨 **kör 16/9** — steg 1 backend ✅ bevisad (204/204/400/405/400, vakthundsrad "förarfacit: 1 svar"); steg 2 Android ✅ mergat med Axels ja (PR #290); steg 3 iOS ✅ Axels Xcode-bygge grönt, mergat (PR #291). **Kvar: steg 4 iOS-skärmbild (Axel) · steg 5 fälttest — ett riktigt svar i `driver_facit`**; fälttest 16/9 (0.3.6, DECISIONS #207): Bengt tryckte Stämde — knapparna syntes aldrig — `LastSaidCard` var död kod i iOS (rotorsak DECISIONS #210; #208/#209 kvar som förbättringar), rättat med `FacitRow`, kräver 0.3.7; steg 5 förberett 16/9: `forarfacit` i skuggrapporten (svar_7d 1 · ja 0 · nej 1 · android 1 · ios 0 · senast 03:07:58Z — provsvaret, som andra POST:en skrev om från ja till nej (senaste ord gäller)) + recept (DECISIONS #205) · **Fälttest 2, 18/9 (Bengt):** fartkamera passerad, men bara brytaren *Svara på varningarna* gick att nå — samma som 16/9. ~~Telefonen har 0.3.6~~ *(fel antagande av Claude, rättat samma dag)*: **Bengt har 0.3.7 (10)**. I 0.3.7 sitter knapparna längst ner på skärmen *Redo.* (fliken Vakten) och syns bara när vakten är avslutad — medan vakten kör täcker körläget allt, och självstoppet kommer först efter 15 min stillastående. `driver_facit` 07:37Z: 0 riktiga svar. Diagnos 18/9: brytaren PÅ, kameran varnade, inga knappar ⇒ bygget saknar `FacitRow` (#240); main bär 0.3.8 (11) (§4.2) | #21 | #196, #201, #202 | android.yml grön; PRODUKTBOK med skärmbilder; svar från riktig telefon i `driver_facit` |
| PAT-rotationen — **också pulsjobbens nyckel: samma PAT, går ut 2026-11-22 20:55:49 UTC** (kontrollerat 18/9); efter bytet i Supabase och GitHub Secrets trycks `pulsklocka.yml` med läget nyckel (prövad 18/9) | ⏳ Axel, senast 15/11 | #86 | #190/#237 | publicering med ny nyckel; nyckelkalendern visar nytt datum för PAT och pulsnyckel |
| `radar_h` | ⏳ uppskjuten (CPU-mätning) | #187 | #188 | — |
| Kamerafacit-bilderna öppnas och läses | ⏳ mars | #157 | #196 | facit, inte bara bild |
| Steg D (farslaget `aquaplaning`) | ⏳ beslut efter V-C, utgångspunkt given | #81 D | #196 | Axels ja på text + plats |
| ~~**CLAUDE.md-invarianten "max 1 spoken alert / 45 s" mot motorns `globalCooldownS = 10` (kort #127, 13/9)**~~ | ✅ Bengt 16/9: motorn står, invarianten omskriven (DECISIONS #200); `takt` i drift (02:52Z); **Axels ja på texten 16/9** — struken | #193 | #200 | — |
| ~~trv-bevakning: veckokörningen (måndag 06:40Z) föll 7/9 och 14/9; mätvakten (#268) larmar tills en grön körning finns~~ | ✅ manuell körning 02:44Z grön; mätvakten stängde #268 själv 03:07Z | #161 | #185 | grön körning + #268 stängd |
| ~~pg_net-timeouten 30 s gör vakthundens svar oläsbart för dbknapp~~ | ✅ migration 023: `timeout_ms = 120000`; larmprov 03:43Z: vakthundens svar läst ur `net._http_response` — status 200, `larmvag: ok`, rad-raderna lästa: mätvakten 8 flöden/0 problem · förarfacit 1 svar · issue matvakt 0 öppna · nyckel PAT 2026-11-22 (66 dygn) · Supabase 2026-12-08 (82 dygn) · issue vakthund 1 öppna (larmprovet) | — | #204 | bevisrad `timeout_ms = 120000`; larmprov visar `rad` |
| Ordlistan vidgad — grepp 1 (#97 + S8, v24) | ✅ **backend i drift 16/9**: deploy 14:51Z, publicera-snapshot med sha STÄMMER, vakthundens `vinterprov` kör nya SQL:en ("nej", problem []), skuggmotorns `sparrprov` oförändrat. ⏳ **telefonerna:** app-bygge från main (iOS 0.3.7 (10) täcker även facit) | #97 | #214 | bygget ute hos testarna; innehåll vid första vinterordet |
| ~~Vektorgeneratorn i otakt med `engine/vectors/`~~ | ✅ **18/9:** fullkörning ⇒ 24 oförändrade, 0 skrivna, `git status engine/vectors/` tom; motprov ⇒ skriven. Driften var större än kortet: också v01–v04 och v11–v17 (#234). CI-vakten #202 ✅ 18/9 (#235) | #195 | #214/#234 | fullkörning ⇒ ingen diff i `engine/vectors/` |
| ~~Förarfacit-hygien: klockslaget i vakthundsraden + två provrader som räknas som svar~~ | ✅ **i drift 17/9** (#227): migrationen märkte exakt de två provraderna · skuggrapporten 2 → 0 svar · vakthundsraden 06:07Z: *förarfacit: 0 svar · 2 prov uteslutna* (04:07Z: *2 svar (senast Wed Sep 16 2026 )*). Klockslaget syns först vid första riktiga svaret | #196 | #214/#227 | raden visar tid; `forarfacit` räknar 0 prov |
| Trafiklärare som testförare (Skyltfonden AP3, Bengt 16/9) | ⏳ beror på trafikskolornas ja senast 25/9; inbjudningsvägen (TestFlight extern = Beta App Review, Android APK/Play) är Axels — påverkar S5:s tolv testare | — | #216 | lärare med testversion i november och första lärarsvaret i `driver_facit` |
| ~~S10 grepp 2: TROSKLAR-KOMBINATIONEN (C, D, tröskelregeln)~~ | ✅ **17/9: C, D och T fastställda, D-raden i tio tröskeldokument (#226)** | #197 | #217/#226 | fastställt dokument, D-raden i varje tröskeldokument |
| Radarns bidrag mäts om i första frostmånaden (`scripts/matningar/radar-tackning-2026-09-16.sql`) | ⏳ vid frost, före januari-domen | #197 | #218/#219 | samma fråga på kalla timmar med snö |
| ~~Axel läser tätningarna i tröskelregeln (T1, T5, T6)~~ | ✅ Axel ja 17/9 (#226) | #197 | #220/#226 | Axels rad |
| Betans startvärden in i motorn och `scripts/kontraktsgrinden.ts` när S3 byggs | ⏳ med S3 | #197 | #222 | grinden bär samma tal som DECISIONS #222 |
| #153 försprång startar först efter grepp 2 fastställt, betan och S2 | ⏳ efter betan | #153 | #221 | eget tröskeldokument före kod |
| TROSKLAR-SKUGGAN §4 (a)/(b) mot tröskelregeln | ⏳ före domen mars 2027 | #198 | #220 | §4 säger inget som regel T förbjuder |
| Uppspelningen ur arkiven: ~~grundversion 17/9 (#233)~~ · ~~radar-, regnmängds- och startbandsvarianterna~~ ✅ **byggda och körda i drift 20/9 (DECISIONS #244):** `uppspelning_efterhalka()` (sql/028) — anropet utan argument är kombinationen, varje variant ändrar ett argument, värden utanför svepen avvisas (D1), utfallet blindat. 14 dygn: kombinationen 1 stationsdygn · utan faller 9 · utan blöt 7 · radarn +0 (kopplingen bär: 110 av 140 stationer har väg inom 5 km, 118 av 530 stationsdygn hade radarregn) · regnmängd ≥ 0,2 mm: 0 · startband +1…+6: 5. Gamla mätfilen ger samma tal. **Kvar:** SMHI-varianten (väntar på vintervarningar i arkivet + `senast_sedd` i värdevakten) · facitstackens tre andra källor — radien beslutad 20/9: **5 km** (#245); episoden beslutad 20/9 (#246); ✅ **kopplingen byggd och i drift 20/9 07:48Z (kort #207, DECISIONS #247)** — omklassning och olycka per episod, blindat; **omklassningarna till halka är noll i september, arkivet har 7 rader på 14 dygn** | ✅ 20/9 — körs igen vid första frosten; **utfall läses först vid dom 1 i januari** | #197 | #223/#233/#244 | sats 1–3 i `scripts/matningar/uppspelning-varianter.sql` ger rader; `utfall_synligt` = 0 |
| Radar- och väderarkivet kvar till mars-domen — **168 av 500 MB 17/9, cirka 9 MB/dygn brutto redan i september**; gratisnivån skrivskyddar databasen vid 500 MB och har inga backuper | 🔨 **underlag 17/9: `docs/GREPP3-ARKIVEN.md`** — beslut Bengt + Axel (§4.2) | #83 | #223/#231 | arkivet täcker november–mars |
| Databasens storlek mäts igen — nettotakten efter autovacuum avgör om 400 MB nås i oktober | ⏳ 24/9 · 18/9 03:42Z: **169 MB** · 20/9 05:00Z: **177 MB** (+8 MB på 49 h ≈ 4 MB/dygn netto) | #83 | #231 | två mätpunkter minst ett dygn isär |
| ~~Grepp 3, småbyggena i drift: `gallra_arkiv` (sql/026) i nattjobbet och databasvakten i vakthunden~~ | ✅ **17/9:** migration 12:3xZ: `gallra_arkiv(7)` raderade **97 472 rader** — Finland 97 379 → 58 130, Norge 68 972 → 45 828, pg_crons logg 39 312 → 12 691, resten svensk gallring · EXECUTE låst för anon och authenticated · nattjobbet kör `SELECT gallra_arkiv(7)` 03:15 · databasvakten 12:35Z: *databas: 168 MB av 500*, provlarmet gick (larmväg ok). Storleken står kvar på 168 MB tills autovacuum återanvänt platsen | #83 | #232 | raderade rader i nattjobbet; vakthundsraden *databas: N MB*; provlarmet |
| S1 ser bara stationer längs skuggrutterna: 5 station-ögonblick på ett septemberdygn — räcker det i vinter? | ⏳ mät i första frostmånaden · 16–20/9: 3–7 rader per dygn från 1–4 stationer, en rad per dygn under noll som mest, noll träffar på kombinationen | #197 | #223 | rader per frostnatt |
| ~~SMHI-varningar som försvinner: `senast_sedd` + `smhi_synk` i ingesten (`sql/024`)~~ | ✅ **i drift 17/9:** ingestkörningen 06:11Z stämplade `senast_sedd` på exakt de 15 varningar som fanns i flödet (av 157 i arkivet), och `smhi_synk` fick sin första rad (15 varningar) | #199 | #225 | rad med innehåll i båda |
| `senast_sedd` deklareras i värdevakten innan SMHI-förlängningen mäts | ⏳ före mars | #199 | #225 | fältet i SPANN, knappen körd |
| TRV-anmälan om nio byvindgivare — Bengt skickar själv i Datautbytesportalens kontaktformulär (data.trafikverket.se/about-us/contact) — ingen inloggning, ärendetyp **API Öppna Data** | ⏳ Bengt | — | #225 | skickat |
| ~~Axels ja: kontrasignatur på C och D · utfallet i januari · #45 lapse 0,63~~ | ✅ Axel ja 17/9 (#226) | #197 | #225/#226 | Axels rad i DECISIONS |
| Överensstämmelsen skuggloggen ↔ arkivet mäts vid första frosten och redovisas i varje dom | ⏳ vid frost | #197 | #226 | andel lika över minst en frostnatt |
| ~~marknadsforing på pulsklockan (Supabase pg_cron) i stället för GitHub-cronen~~ | 🔨 **i drift 18/9** (PR #339, pulsjobbet 03:53Z) — morgon 1: start 04:45:09Z (9 s efter bokad tid), grön, utkastet committat 04:45:25; morgon 2: 04:45:01Z (1 s), grön; morgon 3: 04:45:01Z (1 s), grön ⇒ ✅ **tre morgnar i rad inom 10 min, KLART 20/9** | kort #200 | #226/#236 | start inom 10 min från bokad tid tre dagar i rad |
| ~~Mejl till Malmö stad, Fastighets- och gatukontoret: egna väderstationer eller halkdata på gatorna?~~ | ✅ **svar 18/9 16:49 (ärende 1255995, kundservice FGK):** Malmö har egna väderstationer; de och Trafikverkets tre i Malmö (Malmö GBG, Oxie, Malmö Ö — alla på statens vägar) styr prognosen som utkallarna beslutar halkbekämpning på. **"I nuläget kan vi inte erbjuda datan som öppen data."** ⇒ kort #93 (a) förblir stängt; öppningen är *avtal inom projektet*, inte öppen data. **Följdmejl skickat 19/9** (avtal, leverantör, rätt person). Nästa kontakt, när svar kommer eller efter 25/9: nämn halkbanan (Bulltofta ligger i Malmö) och skolorna som sagt ja — som fakta, inte som försök | #93 | #230 | svar från Malmö stad ✅ · svar på följdmejlet ⏳ |
| Mejl till Stockholms stad, trafikkontoret (trafikkontoret@stockholm.se, läst på stadens sida): väderstationer, givare eller fordonsdata på gatorna — och kan det delas? | ⏳ skickat 18/9, väntar svar | #93 | — | svar från Stockholms stad |
| Mejl till Göteborgs Stad, stadsmiljöförvaltningen (stadsmiljo@stadsmiljo.goteborg.se, läst på stadens sida): staden har prövat friktionsdata från bilar och väglagsprognoser (InfraSweden2030/Vinnova) — används det fortfarande, och kan det delas? | ⏳ skickat 18/9, väntar svar | #93 | — | svar från Göteborgs Stad |
| Fråga till Trafikverket: publiceras halkhändelser från fordon öppet någonstans? Skickas i Datautbytesportalens kontaktformulär (data.trafikverket.se/about-us/contact) — ingen inloggning, ärendetyp **Datex II**. Ingen e-postadress finns *(rättat 17/9: datex@trafikverket.se kom ur en automatisk sammanfattning)* | ⏳ skickat (Datex II-ärende i Datautbytesportalen, bekräftat av Bengt 19/9), väntar svar | — | #230 | svar från Trafikverket |
| ~~Vakthunden svarar inte inom 120 s i kassavaktens timmar (05, 11, 17, 23 UTC) — **bekräftat 11:07Z**, samma timeout som 05:07Z. **Larmet går ut:** kassavakten kommenterade issue #210 05:08:15Z och 11:08:21Z. Kvar: vakthundens svar är oläsbart var sjätte timme, och okänt om kontrollerna efter kassavakten hinner köras~~ | ✅ **18/9 (#238, PR #348):** kassavakten hämtar sex dygn samtidigt. Före: ordinarie 05:07Z timeout vid 120 s; efter deploy svarade kassaprovet inom cirka 70 s med alla rader och samma räkning. Ordinarie 11:07Z ska svara utan timeout | kort #201 | #238 | vakthundens svar inom 120 s i kassavaktens timme |
| Läsbar version av TROSKLAR-KOMBINATIONEN på Skrivbordet och i Drive är från 16/9 — före Axels sex ändringar, radarn och fastställandet | ⏳ inaktuell; ny version när Bengt vill | #197 | — | aktuell version i Drive, eller den gamla borttagen |
| ~~Trafikverkets öppna halkflöde (SRTI "Temporary slippery road") — rekognosering~~ | ✅ **17/9:** flödet är Trafikverkets väglag i DATEX-form (`RoadSurfaceConditions`) — trafikledningens bedömning ur kameror, väderprognoser och entreprenörsrapporter, samma källa som vår väglagsingest. Inga fordonsdata i den öppna datamodellen (DECISIONS #230) | — | #230 | Trafikverkets datamodell läst |
| **Actions-taket i september** — 35 USD med hårt stopp: slår det i stannar ingest, grannar och healthcheck som 5/9. Kassavakten (issue #210) säger 28/9 i den släpande takten. **Omräknat per jobb 18/9:** 4 369 min sedan 1/9 ⇒ 18,95 USD, cirka 2 000 min kvar. Driften tar ~74 min per dygn ⇒ **bygget får ta högst ~80 min per dygn till 1/10** (16/9 tog 171, 17/9 23). Taket gäller hela kontot, och andra repon syns inte härifrån | 🔨 18/9 — bygg snålt till 1/10; Axel läser av kontot (§4.2) | #152 | #160 | ingen körning stoppad av taket i september; issue #210 stängd av kassavakten |
| GitHub byter `ubuntu-latest` till Ubuntu 26 från 19/10 (notis i CI-körningen 18/9). Driftflödena (ingest, grannar, healthcheck, marknadsföringen) och ci går på `ubuntu-latest` — bytet sker mitt i S3-bygget | ⏳ 19/10 — läs de första körningarna efter bytet | — | — | gröna driftkörningar efter 19/10 |
| QR-sida per skola (kort #204): förberedd i `docs/QR-SIDA-PER-SKOLA.md`; **domänen måste finnas före tryck** av bladet. Axels bedömning av formen (§6 i dokumentet) | ⏳ Axel; bygget när appen finns i butikerna | #204 | #241 | en skolas sida live på domänen, räknaren +1 vid skanning |
| **Simulatorprovet av sändkanalen (byggordning C):** Axel kör `-fotostudio_facit` och trycker *Stämde*. ~~Förutsättningen kort #205~~ ✅ i drift 20/9 05:33Z: kolumnen bär *prov ELLER fotostudio*, de två gamla provraderna kvar, skuggrapporten läser utan fel | ⏳ Axel, två minuter — **stoppdatum 27/9:** utan de åtta svaren arkiveras 0.3.8 ändå | #205, #21 | #242 | rad `cam:fotostudio` i `driver_facit` med `app = ios`, `version 0.3.8`, `prov = true` — och `forarfacit` fortfarande 0 riktiga svar |
| ~~Mätvakten tappade marknadsföringen 18/9 — vakten läste schemat bara ur flödenas cron-rader~~ | ✅ **18/9:** vakten läser pulsklockan (#160 c) — *mätvakten: 11 schemalagda flöden (11 via pulsklockan), 0 med problem* 04:47Z, 8 i morse | #200, #160 | #237 | mätvaktens rad räknar marknadsföringen igen |
| Måndagsserien på pulsklockan (#160 a) och mätvaktens fasta frist, kadens + 3 h (#160 b) — i drift 18/9 | ⏳ **måndag 21/9**: alla sju ska starta inom minuten från sin bokade tid (05:40–07:40Z) | #160 | #237 | sju körningar i tid 21/9 |
| **Genomlysningen 20/9 — tolv fynd, inget åtgärdat.** Fem granskare mot motor, drift, mätning, produkt och styrning, plus egna mätningar mot drift och den publicerade snapshoten. Rapport: `docs/GENOMLYSNING-2026-09-20.md`. **Tre fel hörs eller kan höras i bilen** (#210 iOS-null, #211 det tredje olycksropet, #212 otestad korridor). **Två är existentiella** (#213 ingen backup, #215 vakthunden utan dödmansgrepp). **Ett är formellt** (#214 Play-deklarationen osann sedan 16/9) | 🔴 **öppet — tolv kort lagda 20/9, noll åtgärdade.** Motorfixarna (#210/#211) bör sitta i bygget före nästa arkivering | #210–#221 | #249 | ett kort stängt med mätt bevis per fynd |
| ~~Två av genomlysningens kort var inte nya.~~ **ÅTGÄRDAT 20/9 (#252).** #215 *vakthunden kan tystna* är samma sak som **#50 *Vakthunden är själv obevakad*** (4/9) — sexton dygn på tavlan utan att någon kopplat ihop dem. #51 *vinterarkivet skrivs nästan inte* (4/9) pekade på samma tomhet i `road_condition_history` som #247 mätte 20/9 (0 omklassningar till halka på 14 dygn, 7 rader totalt) | ✅ **ihopslagna 20/9 på Bengts order:** #215 stängd, dess tre defekter (dödmansgreppet, 9c/9d som aldrig kan fyra, pg_cron utan avstämning) införda i **#50** som avsnittet *GENOMLYSNINGEN 20/9* med minsta åtgärd och Verify. **#51** bär nu 20/9-mätningen och är uttryckligen kopplad till facitraden och till **#209** — med ny Verify: omklassningar till halka under de första frostnätterna | #50, #51, #209 | #252 | ett kort per fråga, inte två |
| ~~Sex överspelade kort stod öppna på tavlan~~ | ✅ **stängda 20/9 med beviset på varje kort** (#250): TestFlight 0.3.5 (main bär 0.3.8) · #79 regn-30 (avvecklad 9/9) · gallringsregeln (i drift 17/9) · Vegvesen DATEX (beviljat 4/9) · #158 (byggd 14/9) · #157 (451 bilder i hinken 20/9). Öppna kort 102 → 96. **Fyra av de sex bar sitt eget bevis i brödtexten** | #157, #158 | #250 | kortet i 🟢 med en rads bevis |
| Ägarskapet per kort: vad bara Axel kan göra, vad bara Bengt kan, och vad någon annan kan verkställa | ✅ **skrivet 20/9** (`docs/KORTLISTOR-2026-09-20.md`): av Axels 25 är **6 exklusivt hans**, 5 kräver er båda och **14 kan Claude eller Bengt verkställa**. Av Bengts 13 är 4 exklusivt hans | — | #250 | listan använd i riktlinjemötet |

---

## 1. NU — före första frosten

Fem rader. Inget annat är "nu". **17/9: fyra klara — kvar är N3, nycklarna (Axel, senast 15/11).**

| # | Vad | Vems | Bevis | Kort |
| :-- | :-- | :-- | :-- | :-- |
| ~~**N1**~~ | ~~**Kamerafacit bevisat.** Kör skuggan mot ett känt svenskt spår som ger ett positionerat larm; ett objekt i hinken. *Noll objekt efter 5 657 körningar är ett trasigt instrument, inte väntan på data*~~ | Claude | **KLAR 15/9: 1 bild i hinken** (DECISIONS #189) | #157 |
| ~~**N2**~~ | ~~**#42 i höstregn.**~~ ~~Vidga väglagsfrågan så `regn` når normalklassade segment (#154, en skrivare hålls)~~ **(klart 15/9 som `rain_segments`, DECISIONS #187)**, ~~sedan steg E: skuggan V-B loggar vad rösten *skulle* sagt~~ **(klart 15/9, DECISIONS #191)**. ~~Enda spåret med höstfönster~~ | Claude, Bengts ja på #154 — **KLAR 15/9**; det som återstår är grind V-B:s dom (kort #81 E, "inte förr") | ~~ett normalklassat segment med `regn` i `live.json`~~ ✅ 34 st 16:00Z; ~~V-B-rader i skuggloggen~~ ✅ 5 st 17:30Z | #42, #154, #81 |
| **N3** | **Nycklarna.** PAT går ut 22/11, Supabase-tokenen 8/12. Rotera PAT senast **15/11**; en nyckel är bytt först när en publicering gått igenom med den. ~~Lägg datumen i vakthunden~~ **(klart 15/9: check 10, issue #272)** | Axel | publicering med ny nyckel; vakthundsrad | #86 |
| ~~**N4**~~ | ~~**F1: skattarens råa indata i `live.json`** bredvid `fukt` — `regn_h`, `lutning`~~ **✅ KLAR 16/9:** första `regn_h` ur en publicerad `live.json`. `radar_h` uppskjuten, bevakas i §0b | Claude, Bengts ja | ✅ fältet i `live.json`, manifest-sha stämmer | #187 |
| ~~**N5**~~ | ~~**Kriteriet för nytt farslag** i kartans §7.8 — handling · text · prioritet före vektorn~~ | ✅ fastställt av Bengt 15/9 | kartan §7.8 — **KLAR** | — |

---

## 2. SENARE — oktober till december

### 2.1 Vägen till förare: efterhalkan som märkt beta

| # | Steg | Fog | Grind | Kort |
| :-- | :-- | :-- | :-- | :-- |
| ~~**S1**~~ | ~~Skuggan läser N4:s fält vid sidan av motorn och loggar vad villkoret *skulle* ändrat. **GRIND (Axel 16/9): körs INNAN något mer byggs på `regn_h`** — regntäckningen 13 % gör `regn_h` till efterhalkans osäkra halva. ✅ **Byggt 16/9** (kolumn `efterhalka`, DECISIONS #198), första rad med innehåll 16/9. **Uppspelningen räknas ur arkiven, loggen är kontroll (17/9, #226)**~~ ✅ **STEGET ÄR KLART** — grinden passerad som byggsteg; nätterna bevakas i §0b | — | S1 före S2 | #192, #89 |
| **S2** | **E på K2:** skattaren returnerar nivå + bevis, byggd på frysklassningens osäkerhetszon (±0 · ±0,5 · ±1,0 °C) — indata till försprånget. *Förkrav klart 15/9: trendfälten besiktigade av värdevakten (DECISIONS #192)* | F3 | — | #103 |
| **S3** | **Regeln i motorn:** `icing_point` fyrar när det *inte* regnar men ytan är blöt (N4:s `regn_h` ≤ N) och faller (`lutning`). Märkt text: *"Halkvakt tror: frysrisk framöver"* — ny gren, inte nytt slag. Tre portar **Startvärden beslutade 17/9** (regn inom 2 h · fall ≥ 0,8 °C på 30 min · yta +1…+3 °C · regn > 0; DECISIONS #222/#225). | F3 + F4 + text | **`v11_silent_drive` måste fortfarande tiga** — vektorn försvagas aldrig | #89, #88, #192 |
| **S4** | **Facitknappen:** ~~efter varje varning *"stämde det?"*~~ **Axels ja 16/9: två knappar under "Senast sagt" — *Stämde* / *Stämde inte*, ingen fritext; loggas lokalt, skickas när bilen står stilla.** Skickar varnings-id + svar, inget spår. Bara betatestare, uttryckligt samtycke. **Produktbokens Om-avsnitt ("vi samlar in: ingenting") ändras i samma commit — ordagrant, frivilligt, synligt** (kort #21) | app, båda plattformarna | ~~Axels ja på text och flöde~~ ✅ 16/9; PRODUKTBOK i samma commit | #21, #203, #205 |
| **S5** | **Betan till tolv testare i november.** Skuggloggen + förarsvaren + kamerafacit = tre facitkällor. Testförarna, också trafiklärarna, får veta att värdena är gissade till februari (TROSKLAR-KOMBINATIONEN §7) | — | — | #219, #214, #217, #218 |
| **S6** | **Dom i januari** på förarfacit + kamerafacit mot Ö-B:s golv (nettonytt ≥ 5 %, tillkomna falsklarm ≤ 25 %). Mars-domen blir en dom på riktig data. **Utfallet fastställt 17/9:** godkänd eller oavgjord ⇒ betan fortsätter, underkänd ⇒ tas bort (#226) | — | TROSKLAR-OVERGANGAR, oförändrad | #209, #213 |

### 2.2 Det som måste finnas under tiden

| # | Vad | Vems | Kort |
| :-- | :-- | :-- | :-- |
| **S7** | **Facitvakter:** vakthundsrad *"historiken växer"* (inte bara *"sync_state är färsk"*) · ~~mät `situation_archive`~~ (mätt 15/9: 3 122 olyckor/30 dygn, DECISIONS #189) · ~~bevisa att `trv-bevakning` sparar 13 källor~~ (✅ state med 13 källor sedan 16/9 02:44, commit 1284e82) · ~~kamerafacit har ingen vakt~~ ✅ **18/9 (#239):** vakthunden larmar när skuggan haft minst 10 svenska larm på 12 h men ingen bild kommit in; `facitprov` gav issue #352, stängd av timkörningen 06:07Z · **kvar:** larm för förarfacit när betan går i november | Claude | ~~#50~~ ~~#222~~ ✅ *(#215 inslagen)*, #161 |
| **S8** | **#52 före #45:** ett test i tre portar låser att kod 1 + "Packad snö" *måste* larma — motsatsen till vinterbaseline. Vektorn beslutas innan #45 rörs. ✅ **Byggd, godkänd (Axel) och deployad 16/9 som v24** tillsammans med #97 (DECISIONS #214) — når telefonerna med nästa app-bygge | Bengt + Axel | #52, #45 |
| **S9** | **T-A efter första frostnatten**, steg 0 inom sju dygn, #95(d):s F-B i samma varv | Claude | #88, #95 |
| ~~**S10**~~ | ~~**C och D** och tröskelregeln~~ ✅ **KLAR 17/9: `docs/TROSKLAR-KOMBINATIONEN.md` fastställt** — C (KB-A–D), D (D1–D7) och T, underskrivet av Bengt och Axel (DECISIONS #217–#228) | Claude skrev, Bengt och Axel fastställde | #197 |
| **S11** | **#153 → försprång** (Axel) · mät korridortillväxten 3 000 m mot 1 000 m. ✅ **Omformulerat 16/9 (DECISIONS #221)** — grepp 2 ✅ fastställt 17/9; väntar på betan och S2 | Axel · Claude | #153 |
| **S14** | **V-B1:s jämförelse (DECISIONS #212):** tröskel eller "regnade det alls"? Radarns 5-min-topp mot stationens 30-min-summa gör tröskeljämförelsen sned åt ett håll. Underlaget är DELVIS-kolumnen; beslutet är Axels enligt §5 och tas när V-C är uppfyllt — inte förr | Axel, på Claudes mätning | #81, #194, #42 |
| **S12** | **Drift:** ~~#97 kodgrind för "Rimfrost"/"Halkrisk"~~ **(ordlistan vidgad 16/9, DECISIONS #214 — även Nysnö och Halt)** · måndagsserien från naken cron till puls/knapp · **#83 steg 2 (export/Pro) i oktober — nu villkor för domarna (#226)** · ~~#45 lapse 0,71 → 0,63~~ ✅ 17/9 (#226) · #76 deploybevis · #146 klonfelet | Bengt / Axel / Claude | #97, #83, #76, #146, #152, #160 |
| **S13** | Skattaren: en period **utan kodändring** under mätning — tre instrumentfel på tre körningar | Claude | — |

---

## 3. ÄNNU SENARE — mars och framåt

| # | Vad | Villkor | Kort |
| :-- | :-- | :-- | :-- |
| **Ä1** | #42: sjätte farslag eller meta — avgörs på V-B:s data mot kriteriet | efter N2:s höst | #42 |
| **Ä2** | #45 som meta, med lapse 0,63 | efter S8 | #45 |
| **Ä3** | #32 hinder/djur och #15 kö-slut mot kriteriet | efter release | #32, #15 |
| **Ä4** | **Räckvidd (L4):** SMHI moln som knapp · Verify 2 · representativitetsradien. Axel: *"räckvidd kan vara den här vinterns"* — grind A:s kurva växer varje måndag; beslut på vinterdata | efter vinterns grind A-kurva | #95, #96 |
| **Ä5** | Höjden som varianspredikator — kräver inte vinter, kräver inte brådska | knapp när kassan tillåter | #96 |
| **Ä6** | Radarns segmentupplösning · #43 steg 4 (snöbyar) · kombinationsgrinden i skuggan · #91 kallplatslagret · SMHI som reserv (2,36 °C) | mars | #43, #91 |
| **Ä7** | Nowcast #16 efter kö-slut #15 · Nordenprodukten (NO/FI/DK) | efter release | #16, #15 |

---

## 4. Beslut

### 4.1 Tagna 15–17/9

| Beslut | Vem |
| :-- | :-- |
| Kartan fryses; nästa ändring efter bygge + mätning | Axel föreslog, Bengt ja |
| Kriteriet för nytt farslag i §7.8 | Bengt fastställde |
| Betatestare får skicka varningsfacit med samtycke; löftet till allmänheten orört | Bengt |
| Efterhalkan som märkt beta i november, före grinden; dom i januari på förarfacit | Bengt |
| Grind A står (Axel rättade sig); E kan inte vänta (Axel rättade sig) | Axel |
| Granskningen arkiveras; R1–R15 väntar i bilaga A tills en rör kod | Bengt |
| #154: `regn` når normalklassade segment via `rain_segments`, och steg E byggs (DECISIONS #191) | Bengt, ja 15/9 |
| `rain_segments` som egen nyckel, inte filter i motorn — apparna läser den inte förrän V-C dömt | Axel, 16/9 |
| Facitknappen: två knappar *Stämde*/*Stämde inte*, ingen fritext; produktbokens löfte skrivs om ordagrant | Axel, 16/9 |
| V-B-loggen är rå; dom-knappen räknar per regndygn | Axel, 16/9 |
| S1 körs före S2 — inget mer byggs på `regn_h` innan skuggjämförelsen | Axel, 16/9 |
| Steg D: utgångspunkt given (under halka, över vilt; *"Vattenplaning framöver — sakta ner"*), beslut efter V-C | Axel, 16/9 |
| #52-vektorn: kod 1 + "Packad snö" MÅSTE larma — v24 i tre portar (S8, DECISIONS #214) | Bengt + Axel, 16/9 |
| Kombinationen: de 1 248 punkter som inte kan spelas upp stryks, radarn inräknad — radarns bidrag mätt till högst ~13 % (DECISIONS #218/#219) | Bengt, 16/9 |
| Radarn stryks inte: betan och kalibreringen utan radar, radarn prövas i mars ur arkivet (väg C, DECISIONS #223) | Bengt, 17/9 |
| Interpolationsidén (#153 beslut 2) får ingen egen öppning i tröskelregeln (DECISIONS #220) | Bengt, 17/9 (#225) |
| Strukna inställningar prövas i mars som varianter — regnmängd, startband, SMHI-förlängningen när vintervarningar finns; kalibreringen står på 48 (DECISIONS #223/#224) | Bengt, 17/9 (#225) |
| Kopplingen station↔väg för radarvarianten: 5 km | Bengt, 17/9 (#225) |
| Förslagen i C och D: förarfacits underlag (KB-D4) · kalibreringen 1/2 (D3) · kamerabilden fäller premiss, aldrig utfall — gäller med C och D | Bengt, 17/9 (#225) |
| Ingesten sparar när en SMHI-varning försvinner (kort #199) | Bengt, 17/9 (#225) |
| TRV-anmälan om nio byvindgivare skickas — av Bengt själv | Bengt, 17/9 (#225) |
| C och D fastställda — Axel kontrasignerade, D-raden i tio tröskeldokument (DECISIONS #226) | Bengt + Axel, 17/9 |
| Utfallet i januari: KLARAR eller OAVGJORT ⇒ betan fortsätter till mars, FALLER ⇒ grenen tas bort | Bengt + Axel, 17/9 |
| Tröskelregeln kontrasignerad i tätad form (T1, T5, T6) | Axel, 17/9 |
| #45 lapse 0,63 °C/100 m (tidigare 0,71) | Bengt + Axel, 17/9 |
| Uppspelningen räknas ur arkiven, med skuggloggen som kontroll | Bengt + Axel, 17/9 |
| marknadsforing.yml behålls och flyttas till pulsklockan (kort #200) | Bengt + Axel, 17/9 |
| Provraderna i förarfacit märks och utesluts — raderas inte (kort #196) | Bengt + Axel, 17/9 |
| Sessionsregeln i CLAUDE.md: bedömningen vid start, kartan vid ändring, sök innan något stryks, inga trådar bara i chatten (DECISIONS #228) | Bengt, 17/9 |
| Kort #195, #200 och #202 körs: vektorgeneratorn i fas, marknadsföringen på pulsklockan, generatorn vaktad i CI (DECISIONS #234–#236) | Bengt, 18/9 |
| Kort #160 körs: måndagsserien på pulsklockan, mätvakten läser pulsklockan med fast frist; pulsnyckeln kontrolleras och byts med knapp vid rotationen (DECISIONS #237) | Bengt, 18/9 |
| Kort #201 körs: kassavakten hämtar dygnen parallellt (DECISIONS #238) | Bengt, 18/9 |
| S7 körs: kamerafacit-vakt i vakthunden, och flödena som committar tillbaka får `--autostash` (kort #161 b, DECISIONS #239) | Bengt, 18/9 |
| Skolans synlighet som QR-sida per skola på webben, ingen banner i appen; förberedd, byggs när bladet byggs (kort #204, DECISIONS #241) | Bengt, 19/9 |
| **Byggordning C:** ett sammanhållet iOS-bygge med #203; sändkanalen bevisas i simulatorn med ett tryck (`-fotostudio_facit`); stoppdatum 27/9 — utan Axels åtta svar arkiveras 0.3.8 ändå (DECISIONS #242) | Bengt, 20/9 |
| Kort #205 körs: fotostudions svar märks som prov (`sql/027`) — förutsättningen för simulatorprovet (DECISIONS #242) | Bengt, 20/9 |
| Uppspelningens varianter byggs nu: en funktion med betans startvärden som standard, D1 i kod, utfallet blindat — **utfall läses första gången vid dom 1 i januari, därefter vid kalibreringen 1/2 och dom 2 i mars, aldrig däremellan** (DECISIONS #244) | Bengt, 20/9 |
| **Räckvidden för kombinationens facit: 5 km från stationen** — samma koppling som radarn (#225); inskrivet i TROSKLAR-KOMBINATIONEN §4 KB-B före första utfallsläsningen; priset (färre facittillfällen mot KB-C2:s 40) utskrivet. Gäller kombinationens domar och uppspelningen (DECISIONS #245) | Bengt, 20/9 |
| ~~Episoden: version 1 (UTC-dygn)~~ **omprövad samma dag: episoden är stationens första ögonblick per natt, middag till middag UTC, som T-A** — version 1 delade 159 av 454 stationsnätter i två (#245). I drift 07:06Z; motprov i CI rött på rätt rad; inskrivet i TROSKLAR-KOMBINATIONEN §4; tolvtimmarsgränsen under kontrakt (DECISIONS #246) | Bengt, 20/9 |
| Grepp 3, småbyggena: databasvakt (larm vid 400 MB) · rensning av pg_crons logg · gallring av Norge (allt efter 7 dygn) och Finland (varma rader efter 7 dygn, kalla i 60 dygn för rimfrostgrinden) (DECISIONS #232) | Bengt, 17/9 |
| Stadstrafiken: fråga Malmö, Stockholm och Göteborg om gatornas data och Trafikverket om fordonsdata — Bengt skickar mejlen (DECISIONS #230) | Bengt, 17/9 |
| Bedömningen stryks fortlöpande och bär läget överst; kartan stryks inte löpande (DECISIONS #229) | Bengt, 17/9 |
| Tröskelregeln i Axels lydelse, tätad: T1 per tillstånd, T5 interpolation förbjuden (#153 beslut 2 utan egen öppning), T6 prognoser utlöser aldrig ensamma — inte en uppmjukning, skyddet följer med (DECISIONS #220) | Bengt, 16/9; Axel om lydelsen |
| #153 omformulerat till försprång och väntar till efter grepp 2 och betan; ordval och prioritet strukna (DECISIONS #221) | Bengt, 16/9; formen Axels |
| Betans startvärden (D2): mitten, den tystare av två mittpunkter — N 2 h, fall ≥ 0,8 °C på 30 min, regn > 0, yta +1…+3 °C (DECISIONS #222) | Claude på Bengts order 16/9 · Bengt ja 17/9 (#225) |

### 4.2 Öppna

| Beslut | Vem | Rekommendation | Kort |
| :-- | :-- | :-- | :-- |
| **Grepp 3 — Supabase Pro** senast när databasen passerar 400 MB eller 1 november, det som kommer först. Cirka 25 USD/mån; 8 GB, dagliga backuper. Gratisnivån skrivskyddar vid 500 MB, och vintern kräver cirka 3 GB (`docs/GREPP3-ARKIVEN.md`, DECISIONS #231) | Bengt + Axel (Axel godkänner i DECISIONS) | ja | #83, #213 |
| **Actions-kontot:** läs förbrukningen i Settings → Billing för hela kontot. Kassavakten ser bara Halkvakt, men taket 35 USD gäller alla repon på kontot. Ligger Billing klart över kassavaktens tal (21,78 USD 19/9; 141 min/dygn i snitt 13–19/9, DECISIONS #243) drar andra repon ur samma pott — då räcker september inte: höj taket några dollar (DECISIONS-post) eller bygg ännu snålare till 1/10 | Axel, före 24/9 | läs av; höj bara om Billing visar att det behövs | #85, #152 |
| **Partnerskap i appen till Skyltfondsparterna?** (Axel 19/9; Bengt tvekar). Rekommendation: **partner i projektet, synlig i appen där det är naturligt** — testpartner på Om-sidan, skolans namn på elevbladet, namn i rapporten — **inte** ägande, andel, reklam eller inflytande över varningarna; septembersamtalen hålls icke-kommersiella (ansökan: *utan kostnad*), skolpaketet erbjuds våren 2027 med halkbanedatan som säljargument (FINANSIERING §B2B). Hållningen är inarbetad i kontaktplanen v6.4 (Skrivbordet, 20/9) | Bengt + Axel, före samtalen i veckan | ja till hållningen | #204, #26 |
| **#203 Facit utan att stanna — undantagsprincipen med underskrift** (Bengt 18–19/9: föraren ska bara meddela när maskinen hade fel): (1) **efter resan** — notis *"stämde alla 3?"* + lista, **ett tryck "Ja, alla stämde"** eller peka ut avvikelsen; *Vet inte* skickas aldrig; **tystnad räknas aldrig som ja** (16/9 och 18/9 hade annars bokförts som bekräftelser); (2) **Siri på iOS** — i praktiken en fras: *"Hej Siri, stämde inte i Halkvakt"*; (3) valfritt knapparna i körläget vid stillastående. **Placering (19/9):** knapparna i notisen på låsskärmen, kortet överst på *Redo.*, listan bara vid avvikelse — skiss `docs/skisser/facit-efter-resan.svg`; (4) **missarna ingår** (Bengt 19/9): Siri-fras eller stor knapp *Appen missade* i körläget, typen väljs efter resan, ny tabell `driver_miss` — integritetsbeslutet är Axels. **Beslutsunderlaget: `docs/FACIT-EFTER-RESAN.md`** (åtta beslut, §8). Automatspåret för sanningen finns redan utan förare (uppspelningen, bildfacit, olycksarkivet). **Förslag KB-D7:** ett svar är en handling, tystnad är inget svar — fastställt dokument ⇒ Bengt + Axel | Bengt beställer, Axel avgör formen (S4 är hans); KB-D7 Bengt + Axel | ja på (1), (2) och KB-D7; (3) valfritt | #203, #21 |
| **Bildfacit (förslag 18/9, ur Bengts fråga om skuggflottan kan svara):** flottan kan inte svara Stämde/Stämde inte — den har inga ögon på vägen, och ett påhittat svar kan inte motbevisas (regel T). Men den sparar redan en kamerabild vid varje varning nära en kamera (262 bilder 15–18/9). Förslag: bilderna läses automatiskt (torrt · vått · snö · is) och blir ett svar per varning, med ett stickprov som en människa kontrollerar — **först när blindningen släpper** (kalibreringen 1/2, bilderna i mars; D2/D3) | Bengt + Axel | beslut före 1/2 | #157 |
| **Bildfacitbeslutet tidigareläggs till efter första frosten** (Bengts ja 20/9, ur fyndet i #247). **Skälet, mätt:** omklassningarna till halka är 0 på 14 dygn och hela `road_condition_history` har 7 rader; olyckorna (504) bär ingen orsak och får inte bära domen ensamma. Är omklassningarna lika tomma i november–december står januaridomen och faller på kamerabilderna — och **granskningen av dem finns inte byggd**. Beslutet flyttas därför från *före 1/2* till **inom sju dygn efter första frostnatten**, så att bygget hinner göras om det behövs. **Blindningen är orörd:** beslutet gäller att BYGGA läsningen, inte att läsa utfallet — bilderna öppnas fortfarande i mars (D2/D3/D6). **Mätningen som avgör** körs samma varv som T-A steg 0: omklassningar till halka under de första frostnätterna, inom 5 km och utfallsfönstret | Bengt + Axel | ja — förbered beslutet nu, fatta det när frosten mätt källan | #209 |
| **Play-deklarationen är osann sedan 16/9** (genomlysningen, DECISIONS #249). `docs/PLAY-DATASAFETY.md` svarar **"No"** på Googles insamlingsfråga och påstår att enda utgående trafik är en GET utan parametrar; filen rördes senast 27/8. Sedan 16/9 POSTar `FacitSender.kt` varnings-id, tid, app och version — och `sql/022` erkänner själv att *"ett svar är alltså en plats och en tid"*. En felaktig deklaration är grund för avslag eller nedtagning mitt i vinterns enda facitfönster. **Frågan:** ska produktinvariantens lydelse (*ingen positionsdata lämnar telefonen*) formuleras om, eller ska facitsvaret ändras? | Bengt + Axel, **före första uppladdningen** | formulera om lydelsen: svaret är frivilligt, opt-in och beskrivet i appen — men det ÄR en plats och en tid, och deklarationen måste säga det | #214 |
| **Blindningsläckan i T-A** (genomlysningen, DECISIONS #249). `scripts/grind-t-a.ts` skriver ut **hela svepet rangordnat på träffandel minus falsklarmsandel** även när domspärren håller, och flödet trycks inom sju dygn efter varje frostnatt — alltså genom hela kalibreringsfönstret. T-A:s svep (fönster · lutning · startband) delar **tre av kombinationens sex dimensioner**, så när kombinationen kalibreras 1/2 är de dimensionernas utfall redan avläst och loggat i CI. Regel D3 ska hindra att samma nätter både väljer och dömer. **Frågan:** strypa T-A:s utskrift tills domspärren släpper, eller skriva i TROSKLAR-KOMBINATIONEN att de delade dimensionerna är förvalda? | Bengt + Axel, **före första frosten** | skriv in förvalet — T-A behövs som instrument, och en strypt utskrift döljer också instrumentfel | #216 |
---

## Bilaga A — rättelser till kartan som väntar tills en rör kod

~~Kartan är fryst. Dessa femton är kända fel eller överspelade påståenden; de införs den dag någon
av dem får konsekvens för kod, inte förr.~~ **Införda i kartan 16/9 (DECISIONS #199), efter NU-listans byggen och
mätningar — R1–R16 nedan är strukna och står kvar bara som historik.**

| # | Var | Rätt |
| :-- | :-- | :-- |
| ~~R1~~ | ~~§7.8, §5.4~~ | ~~#42 har egen byggordning, höstfönster, byggd radarhalva; motorsteget är F5 av konstruktion~~ |
| ~~R2~~ | ~~§5.2~~ | ~~"radarn ligger redan i telefonen" gäller bara halkklassade segment (#154)~~ |
| ~~R3~~ | ~~§9.1, §2~~ | ~~höjden underkänd som medelkorrektion på yta; #96 mäter varje måndag; lapse 0,63~~ |
| ~~R4~~ | ~~§10.2~~ | ~~oljefilm → #42 överspelad sedan #155~~ |
| ~~R5~~ | ~~§10.2~~ | ~~`rate_max`-kvoten spärrad tills fältet rensats~~ |
| ~~R6~~ | ~~§10.2~~ | ~~K1 är en läxa om fönsterglapp, inte ett verktyg~~ |
| ~~R7~~ | ~~§10.1~~ | ~~#94: spåret stängt, kortet öppet~~ |
| ~~R8~~ | ~~§2, §4~~ | ~~#163, #165 är DECISIONS-nummer~~ |
| ~~R9~~ | ~~§10.2~~ | ~~"Ord-per-resa (#103)" = DECISIONS #103; kort #103 är frysklassningen~~ |
| ~~R10~~ | ~~§9.1~~ | ~~radarns bidrag: bär #168:s två reservationer~~ |
| ~~R11~~ | ~~§11~~ | ~~#43 steg 4 öppnat — snöbyn är mätbar, inte kartans kant~~ |
| ~~R12~~ | ~~§2~~ | ~~#95: reserven 2,36 °C, Verify 2, radien som öppna L4-frågor~~ |
| ~~R13~~ | ~~§7.8~~ | ~~kriteriet — **infört 15/9**~~ |
| ~~R14~~ | ~~§12~~ | ~~två av tre facitkällor tomma; ingen vakt mäter tillväxt~~ |
| ~~R15~~ | ~~§7.8~~ | ~~#45 som meta efter #52~~ |
| ~~R16~~ | ~~§5, fog-tabellen~~ | ~~**Fog-tabellen är läst, inte körd (§5.6):** #154:s steg stod som F1, men varje rad i `segments[]` blir en varning i motorn och båda portarna — F4/F5. Löst med egen nyckel (DECISIONS #187); tabellen ska märka vilka fogar som är verifierade i kod (Axel 16/9)~~ |

(R16–R24 gällde bedömningen och granskningen och är införda här.)

## Bilaga B — vad som ändrats mot v2

| | v2 | v3 |
| :-- | :-- | :-- |
| "Nu" | 13 rader | **5** |
| Efterhalkan | L1, efter grinden i mars | **S3–S6: märkt beta i november, dom i januari** |
| Facit | tre automatiska källor, två tomma | **fjärde: förarna** (S4), med samtycke |
| Kartan | 15 rättelser att införa | **fryst**; rättelserna i bilaga A |
| Granskningen | levande | **arkiverad** |
| Räckvidd | nästa produkt | "kan vara den här vinterns" (Axel) — Ä4 |

*Analysen står i kartan. Det här är listan.*
