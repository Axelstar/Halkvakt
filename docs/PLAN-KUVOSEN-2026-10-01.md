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

**Steg 1 — kuvösens databas och klocka.** En tom PostGIS med samma migrationer som CI:s (`sql/`), och en **tidsmaskin**: snapshotbyggaren
tar redan en tidsparameter, men dess frågor läser databasens `now()` på ett tiotal ställen (`publish/snapshot-core.ts`). Kuvösen ger byggaren
en egen frågefunktion som byter `now()` mot den historiska tidpunkten — **produktionskoden ändras inte**. Samma grepp för grindskripten.
*Verify:* ett ekvivalensprov — kuvösens byggare körd med dagens klocka mot dagens arkiv ger byte för byte samma snapshot som produktionens,
och provet fäller om ett enda `now()` missas (motprov).

**Steg 2 — läsaren för Trafikverkets CSV.** Byggs mot provfilen: kolumnerna till arkivets schema (`weather_observations`), enheterna,
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

**Steg 5 — körningen.** Hela vintern i halvtimmessteg: snapshoten byggs med tidsmaskinen, motorn körs längs de 20 svenska skuggrutterna
(samma spår som skuggmotorn), och skuggreglerna och grindarna körs på samma data. Varje del körs **ensam** och **ovanpå de andra**.
*Verify:* körningens logg bär antalet halvtimmar (≈ 7 250 för november–mars), inga tomma steg utan skäl, och tabellen
*del × ensam × ovanpå de andra*.

**Steg 6 — redovisningen.** Tabellen och slutsatserna i bedömningen, mätningssidan (stomdokument 1) och DECISIONS, i samma varv
(STOMREGELN). Ingen tröskel ändras av utfallet; vill Bengt och Axel ändra något efteråt är det ett eget beslut.

## 5. Var kuvösen körs — och vad det kostar

| Väg | Kostnad | Risk |
| :-- | :-- | :-- |
| **A. GitHub Actions** (som CI) | uppskattat 300–600 minuter för inläsning och några körningar ≈ 2–5 USD | **Taket är 35 USD för hela Axels konto, och september slutade på 34,78.** Kuvösen kan fälla taket i oktober och stoppa allt annat. Kräver att taket höjs (Axels beslut, betalt — DECISIONS) eller att annat skärs ned. |
| **B. Den här datorn** | 0 kr | PostgreSQL och PostGIS finns inte installerade (kontrollerat 1/10). Bengt installerar dem med de officiella installationsprogrammen, ungefär en kvart. 4 kärnor och 29 GB ledigt räcker för en vinter. |
| C. Supabase | — | **Uteslutet** (#292): en vinter ryms inte i 500 MB. |

**Rekommendation: B.** Den kostar ingenting, slår inte i Axels tak, och datan stannar på en dator vi styr. Actions används bara för prov på
koden, som förut.

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
3. **Var kuvösen körs** — B (den här datorn) eller A (Actions, med taket som risk).
4. **Ja till att börja bygga steg 1 och 2 nu**, innan datan kommer.

## 8. Fällor att se upp för

- **Tidszonen och sommartiden.** 27/10 2024 och 30/3 2025 ligger inom perioden. Fel tidszon förskjuter varje varning mot sitt facit.
- **Station-id och flyttade stationer.** 2024 års stationer är inte samma som i dag; varje id som inte matchar redovisas, inget gissas.
- **Typgiltigt men omöjligt.** Samma fyra fällor som i vårt eget arkiv (byvind 85 m/s, sikt 20 000 m som platshållare, molnmängd 113 %,
  `precipitation` som strängar som betyder torrt) — värdevakten besiktigar varje fält innan det används.
- **"Det svarar" är inte "det bär".** En inläsning som går grönt men lämnar fälten tomma är värre än en som faller; inventeringen läser
  innehållet, inte statuskoden.
- **En vinter är en vinter.** Ett riktningsprov på en säsong säger vad som är troligt, inte vad som gäller. Utfallet ändrar ingen tröskel.
