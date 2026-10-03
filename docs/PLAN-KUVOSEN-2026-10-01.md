# Plan: kuvösen — hela systemet bakåtprövat på vintern 2024/25

*Skriven 1/10 2026 på Bengts beställning (*"kan du göra upp en plan för hur vi ska bygga kuvösen"*), efter Trafikverkets svar samma dag.
Kort #232, DECISIONS #292 (idén och reglerna), #388, #397, #398 (avgifterna). Planen är ett underlag: inget är byggt, och stegen
efter steg 0 väntar på Bengts ja.*

## 1. Läget

**Trafikverket (Micke Wallin, VViS Förvaltning, 1/10 13:30):** uttaget för samtliga stationer *"bör kunna levereras under nästa vecka"*,
som **CSV**, i ett format som är *"annorlunda i historiken jämfört med API"*. Han avslutar: *"Låter detta som en bra plan? I så fall lägger
jag en beställning."* **Beställningen är alltså inte lagd än** — den väntar på Bengts svar (utkast i §2).

**Vad kuvösen är** (#292): motorn och alla skuggregler körda tillsammans mot en hel gången vinter, i en egen databas långt från appar och
förare, som ett **riktningsprov**: är vi på rätt väg, och vad tillför varje del ensam och ovanpå de andra? Kartan §7.3 säger att varje grind
dömer sin del ensam; kuvösen är det enda prov som ser helheten.

**Vad som redan är bestämt** (#292, kortet): körs i en slit-och-släng-databas, **aldrig i Supabase** (en vinter ryms inte i 500 MB) ·
startvärdena som de står, inget svep (D2, D6, D7) · hela vintern, inga handplockade dygn · varje del ensam OCH ovanpå de andra · facit =
stationens egen yta efter varningen (*det blev kallt*, inte *det blev halt*), plus väglag och olyckor om Trafikverket ger dem ·
resultatet ändrar ingen tröskel · upplägget skrivs i DECISIONS före körningen.

## 2. Svaret till Micke — utkast, Bengt skickar

> Hej Micke!
>
> Tack, det låter som en bra plan, och CSV passar oss utmärkt. Lägg gärna beställningen. Några saker som hjälper oss att ta emot den rätt:
>
> 1. **Kostnad:** blir det någon avgift för oss? Hör i så fall av dig innan arbetet börjar.
> 2. **Period:** 1 november 2024 – 31 mars 2025. Gärna oktober 2024 och april 2025 också, om det inte är extra arbete.
> 3. **En liten provfil i förväg**, till exempel en station och ett dygn, så kan vi bygga inläsningen innan hela leveransen kommer.
> 4. **Tidszon:** är tidsstämplarna UTC eller svensk tid? Perioden innehåller två byten till och från sommartid.
> 5. **Stationerna:** samma station-id som i det öppna API:t (fältet Id i WeatherMeasurepoint), och om möjligt en lista med
>    stationernas koordinater som de var under perioden.
> 6. **En kort beskrivning av kolumnerna**, med enheter och de värden som betyder att mätningen saknas eller är felaktig.
> 7. Om **väglagsklassningarna (RoadCondition)** och **händelserna (Situation)** för samma period finns i samma historik är de mycket
>    välkomna, men de är inte nödvändiga.
> 8. **Leveransen:** filen kan bli stor; en nedladdningslänk fungerar bra för oss.
>
> Tack igen för hjälpen!
> Bengt

Punkt 1 är vår egen regel: ingen kostnad accepteras i ett svar — den tas tillbaka hit och blir en DECISIONS-post som Axel godkänner (#398).
Punkt 3 och 4 är de som sparar mest tid: med en provfil byggs läsaren den här veckan, och tidszonen är den fälla som annars förskjuter
hela vintern en eller två timmar utan att något larmar.

## 3. Vad kuvösen kan pröva med bara stationsdatan

| Del | Prövas? | Varför |
| :-- | :-- | :-- |
| Frysrisken vid stationerna (A2, broarna) | ✅ | byggs ur yta och fukt |
| Efterhalkan (S1, S2, betans villkor) | ✅ | yta, regn, fall — allt finns i stationsdatan |
| Trenden (T-A) och rimfrosten (R-A) | ✅ | yta, daggpunkt, fuktighet; molnmängd ur SMHI:s öppna arkiv |
| Övergångarna, tillståndsskattaren | ✅ | regnhistorik och väta; radarn ur SMHI:s öppna arkiv |
| Nederbördstypen, vind och sikt | ✅ | om typen och vinden finns i uttaget |
| Prognoslagret (grind A, vägpunktsgrinden, höjden) | ✅ | en hel vinter avgör frågor som september inte kunde (#131) |
| Försprånget (nivå 2) | delvis | frysrisken ja; väglagets kod 3–4 kräver RoadCondition |
| Väglagssträckorna (A1), väglagets ålder | ❌ utan RoadCondition | |
| Olyckorna (A3), facit ur olyckor | ❌ utan Situation | |
| SMHI-förstärkaren | ❌ | SMHI:s varningar har inget öppet arkiv |
| Kamerafacit, förarfacit | ❌ | finns inte bakåt i tiden |

**Facit blir tunt, och det ska sägas före körningen:** stationens egen yta efter varningen säger att det *blev kallt*, inte att vägen *blev
hal*, och den ser inte saltet. För övergångsreglerna räcker det långt som riktningsprov; för en dom räcker det inte.

## 4. Bygget, steg för steg

Varje steg har sin Verify. Steg 0–2 kan göras **innan datan kommer**; steg 3–6 när den finns.

**Steg 0 — beslut och förregistrering (nu).** (a) Svaret till Micke (§2). (b) Var kuvösen körs (§5). (c) Riktningsprov eller
kalibreringsdata (§7, fråga 2). (d) Upplägget skrivs i DECISIONS innan någon fil öppnas: delarna, facit, vad som räknas, vad som inte
räknas, och att inget tal ändras av utfallet.
*Verify:* DECISIONS-posten finns med datum före första inläsningen.

**Steg 1 — kuvösens databas och klocka.** ✅ *Byggt 1/10 (DECISIONS #424).* En tom PostGIS med samma migrationer som CI:s (`sql/`),
och ett schema `kuvos` (`kuvos/klocka.sql`) med två saker. **Klockan:** `kuvos.now()` svarar med kuvösens tid, och en anslutning med
sökvägen `kuvos, public, pg_catalog` får den för varje `now()` — i frågetext och i databasens egna funktioner. **Framtiden:** produktionens
frågor har ingen övre tidsgräns (i driften finns ingen framtid), så vyer visar varje tidsindexerad tabell som den såg ut vid klockan.
Första utkastet av planen sade att `now()` skulle bytas i frågetexten; det hade inte räckt. **Produktionskoden ändras inte.**
*Verify:* provet i `test/integration.test.ts` — sex stationer med var sin fälla (fel yta, negativ `regn_h`, nästa timmes lutning, en
karantän och ett dygn i felet som inte hänt än, en station som bara finns i framtiden) och en motkontroll utan klockan; och provet i
`test/kuvos.test.ts` som fäller en tidskälla klockan inte når.

**Steg 2 — läsaren för Trafikverkets CSV.** ✅ *Inventeringen byggd 1/10 (`kuvos/inventering.ts`); ingen provfil kommer (Bengt 1/10), så kolumnöversättningen byggs mot den riktiga filens inventering.* Översättningen: kolumnerna till arkivets schema (`weather_observations`), enheterna,
tidszonen till UTC, station-id till våra id, saknade värden till NULL. **Inventeringen först, alltid läs-only:** rader, stationer, tidsspann,
upplösning, andel tomma per fält, och de typgiltiga men omöjliga värdena (VÄRDEVAKTEN — inget fält bär en tröskel förrän det besiktigats).
*Verify:* provfilen läst utan fel; inventeringen utskriven; ett fält utan deklarerat spann rapporteras OBESIKTIGAT och stoppar.

**Steg 3 — leveransen kommer (vecka 41).** Bengt laddar ner filen samma stund som länken kommer (filer i en länk finns inte kvar av sig
själva). Den packas och läggs som tillgång i en GitHub-release, som arkivbackupen (#213) — aldrig i repot, aldrig i Supabase.
Inventeringen körs på hela vintern. **Tidszonen avgörs med mätning, inte med antagande:** lufttemperaturen vid tio stationer korreleras mot
SMHI:s öppna timserier vid närmaste SMHI-station; förskjutningen med bäst samstämmighet ska vara noll timmar i UTC.
*Verify:* inventeringen i bedömningen; tidsförskjutningen mätt; vakterna (#75, radvakten, karantänen, den långsamma vakten) körda och
redovisade som antal.

**Steg 4 — SMHI för samma vinter.** Radar, molnmängd, lufttemperatur och nederbörd ur SMHI:s öppna arkiv (kontrollerat 21/9: alla finns för
2024/25). Hämtas en gång och läggs bredvid.
*Verify:* täckningen per månad utskriven.

**Steg 5 — körningen.** Hela vintern i halvtimmessteg: snapshoten byggs med tidsmaskinen, motorn körs i två serier (DECISIONS #426) — längs de 20 svenska skuggrutterna
(samma spår som skuggmotorn) varje halvtimme, och längs hela väglagsnätet (818 sträckor, 23 681 km) var tredje timme — och skuggreglerna och grindarna körs på samma data. Varje del körs **ensam** och **ovanpå de andra**.
*Verify:* körningens logg bär antalet halvtimmar (≈ 7 250 för november–mars), inga tomma steg utan skäl, och tabellen
*del × ensam × ovanpå de andra*.

**Steg 6 — redovisningen.** Tabellen och slutsatserna i bedömningen, mätningssidan (stomdokument 1) och DECISIONS, i samma varv
(STOMREGELN). Ingen tröskel ändras av utfallet; vill Bengt och Axel ändra något efteråt är det ett eget beslut.

## 5. Var kuvösen körs — och vad det kostar

**Rättat samma dag på Bengts fråga** (*"börjar man inte om från 0 med 2000 gratis actionsminuter nu"*). Första versionen sade att
kuvösen kunde fälla Actions-taket i oktober, räknat på septembers slutsumma (34,78 av 35 USD). Det var att dra en månads totalsumma rakt
in i nästa — samma fel som #381 rättade 27/9. **Gratispotten på 2 000 minuter nollställs den 1:a, och kassavakten drar redan av den.**
Kassavakten 1/10 11:07Z: *"61 min sedan 2026-10-01 · debiterat 0 min = 0.00 av 35 USD · takt 132 min per dygn · prognos 17 USD"*.

| Takt | Oktober utan kuvösen | Utrymme till taket |
| :-- | :-- | :-- |
| Dagens, 132 min/dygn (elva timmar av 1/10) | ≈ 17 USD | ≈ 18 USD ≈ 2 250 min |
| Septembers efter konsolideringen 9/9, ≈ 175 min/dygn | ≈ 27 USD | ≈ 8 USD ≈ 1 000 min |

Kuvösen uppskattas till 300–600 minuter för inläsning och några körningar, alltså 2,4–4,8 USD. **Den ryms i båda raderna.**

| Väg | Kostnad | Risk |
| :-- | :-- | :-- |
| **A. GitHub Actions** (som CI) | ≈ 2,4–4,8 USD | Ryms i oktober enligt kassavakten. Kassan läses före varje tung körning; pekar prognosen plus körningen över 30 USD flyttas den till B. CSV:n läggs som tillgång i en GitHub-release (som arkivbackupen #213). En runner har 6 h per jobb, 14 GB disk och 7 GB minne — det räcker för en vinter. |
| **B. Den här datorn** | 0 kr | PostgreSQL och PostGIS finns inte installerade (kontrollerat 1/10); Bengt installerar dem, ungefär en kvart. Reserven om kassan blir trång. |
| C. Supabase | — | **Uteslutet** (#292): en vinter ryms inte i 500 MB. |

**Rekommendation: A**, med B som reserv. Actions kräver inget av Bengt, körs på samma sätt som CI:s prov och går att köra om av vem som
helst; kassavakten bevakar redan taket.

## 6. Tidslinje

| När | Vad |
| :-- | :-- |
| 1–3/10 | Svaret till Micke · besluten i §7 · DECISIONS-posten · steg 1 (databas och tidsmaskin) |
| Provfilen kommer | Steg 2 (läsaren och inventeringen) |
| Vecka 41 (5–9/10) | Leveransen · steg 3 och 4 |
| Vecka 42 (12–16/10) | Steg 5 och 6 — första resultatet |
| Före 1/12 | Kortets hållbarhetstid: kuvösen ska ha svarat innan frosten och betan i november |

## 7. Frågor som behöver svar (står i bedömningen §4.2)

1. **Svaret till Micke** — skicka utkastet i §2 (Bengt).
2. **Riktningsprov eller kalibreringsdata?** #292 lät det vara ett eget beslut före körningen. **Rekommendation: båda, i den ordningen.**
   Först riktningsprovet med låsta startvärden — inget väljs. Sedan, om ni vill, kalibrering på samma vinter, och domen på årets vinter.
   Då hålls D3 (kalibrering och dom på skilda nätter) bättre än om årets vinter delas i två. Beslutet måste tas innan datan öppnas (Bengt och Axel).
3. **Var kuvösen körs** — A (Actions, rekommenderas; kassavaktens prognos för oktober är 17 USD av 35) eller B (den här datorn).
4. **Ja till att börja bygga steg 1 och 2 nu**, innan datan kommer.

## 8. Fällor att se upp för

- **Tidszonen och sommartiden.** 27/10 2024 och 30/3 2025 ligger inom perioden. Fel tidszon förskjuter varje varning mot sitt facit.
- **Station-id och flyttade stationer.** 2024 års stationer är inte samma som i dag; varje id som inte matchar redovisas, inget gissas.
- **Typgiltigt men omöjligt.** Samma fyra fällor som i vårt eget arkiv (byvind 85 m/s, sikt 20 000 m som platshållare, molnmängd 113 %,
  `precipitation` som strängar som betyder torrt) — värdevakten besiktigar varje fält innan det används.
- **"Det svarar" är inte "det bär".** En inläsning som går grönt men lämnar fälten tomma är värre än en som faller; inventeringen läser
  innehållet, inte statuskoden.
- **En vinter är en vinter.** Ett riktningsprov på en säsong säger vad som är troligt, inte vad som gäller. Utfallet ändrar ingen tröskel.

## 9. Besluten 1/10 kväll (DECISIONS #424)

Ja:et till Trafikverket är redan skickat, utan frågorna i §2 — de besvaras av inventeringen när filen kommer. **Både riktningsprov och
kalibrering**, i den ordningen; kalibreringen ändrar regel D i TROSKLAR-KOMBINATIONEN och väntar på Axels signatur. **Actions** som
körplats. Steg 1–2 byggda. Förregistreringen står i DECISIONS #424. Oljefilmen ingår inte (struken #110; fel säsong; facit är olyckor).

**Tillägg samma kväll (DECISIONS #426):** rösten prövas i två serier, de 20 skuggrutterna och hela väglagsnätet, redovisade var för sig. Bestämt innan filen har kommit. Gäller bara kuvösen; skuggan i drift är orörd.

**Tillägg 2/10 (DECISIONS #437, kort #270 g):** prognoslagrets frysflagga mäts i riktningsprovet med tre marginaler (K2 = 0 · 0,5 · 1,0 °C vid klassgränsen +1,0 °C), för RÅ och RÅ+HÖJD, per band: farliga fel, falska flaggor, rätt klass och täckning. Måttstocken är K-A1–K-A5 i TROSKLAR-FRYSKLASSNINGEN, som läsning och inte som dom. Alla tre marginalerna redovisas och ingen väljs — en avvikelse från *inget svep*, bestämd innan filen har kommit. Byggs med körflödet i steg 5.

**Steg 2–3, 2/10 (DECISIONS #438):** leveransen kom 16:04 — fem filer, 5 496 270 rader, 777 stationer — och ligger i den privata releasen `kuvos-trv-2024-25`. Inventeringen är körd på hela vintern; tidszonen är mätt två sätt (sommartidens saknade timme och SMHI vid tio stationer) och är svensk lokaltid. Översättningen av nederbörden, mängden och vinden väntar på Trafikverkets kodlista; resten kan översättas. Detaljerna: `docs/KUVOS-LEVERANSEN-2026-10-02.md`.

**Steg 3, 2/10 kväll (DECISIONS #439, Axels order):** nederbördskoderna 1, 2, 4 och 6 lästa i Trafikverkets *VädErs 2019* (s. 6–7) och översatta; 3, 9 och −9, mängden och vindstyrkan väntar på Micke (NULL). Vintern inläst — 5 391 599 rader, 754 stationer — och vakterna körda som antal (97 % av raderna får tala). Knappen `kuvos` gör inläsningen i Actions. Kvar före steg 5: SMHI (steg 4) och körflödet; efterhalkan väntar på mängden.

**Steg 4, 2/10 kväll (DECISIONS #441, Axels order):** SMHI hämtat en gång — metobs 1, 7, 13, 16 (243 · 181 · 162 · 108 stationer) och radarn för 7 240 av 7 252 halvtimmar med driftens kärna. Radararkivet har bara tif, och tif ligger ≈ 3,4 dBZ över driftens h5; ingen korrektion, frågan i bedömningen §4.2. Releasen `kuvos-smhi-2024-25` (knappen `kuvos-smhi`). Kvar före steg 5: inget; i steg 5 ska `moln.ts` och grind NT läsa `kuvos_ra.smhi_obs`.

**Steg 5a, 3/10 (DECISIONS #453):** körningen är byggd (`kuvos/korning.ts`). Klockan ställs på varje halvtimme, produktionens snapshotbyggare
körs oförändrad, och rösten körs i båda serierna med skuggmotorns spår (provat fix för fix; kontraktsgrinden vaktar farten och punkttätheten).
Först mäts bara körtiden på de sju första dygnen (knappen `kuvos`, `korflode = tid-sju-dygn`). Regeln för om serie B ryms skrevs före
körningen: högst 90 % av jobbets 360 minuter. Kvar: 5b facit (stationens egen yta i varje dels utfallsfönster), 5c reglerna och grindarna
på klockan (`moln.ts` och grind NT mot `kuvos_ra.smhi_obs`, `trend_kandidater` för vintern), och 5d tabellen *del × ensam × ovanpå*.
