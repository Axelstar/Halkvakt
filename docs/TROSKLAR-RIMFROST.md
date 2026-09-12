# TROSKLAR-RIMFROST

**Kort:** #46 RIMFROSTEN — svartis utan nederbörd (Bengts hål A, 4/9). **Status:** 📝 **UTKAST
2026-09-12.** Väntar på Bengts fastställande av värdena. **Ingen kontrasignering behövs**
(Bengts beslut 12/9, DECISIONS #132). Ingen kod ännu, och ingen röst förrän grindarna dömt.

**Varför det skrivs nu:** TROSKLAR-OVERGANGAR §6 (DECISIONS #109, fastställt och kontrasignerat 12/9)
lämnade över två saker till "#46:s eget tröskeldokument" — och det dokumentet fanns inte. Det är
samma form som den dinglande källan 11/9, när TROSKLAR-TYSTNADSFEL bara låg i Bengts Drive. Kortet
har dessutom redan sitt underlag: två körningar 4/9 vars dom var att arkivet ännu saknar äkta
rimfrostnätter, men som slog fast något viktigare på vägen.

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · **punktkällor säger
"framöver", aldrig en sträcka** · tystnad är en funktion · trösklar gissas inte, de faller ur mätning
· trösklarna är daterade FÖRE mätningen och skrivs inte om när talen kommit (§9).

---

## 1. Vad som döms

Motorns frysrisk (`icing_point`, A2) kräver **`moisture === true`**, och `moisture` betyder *det
faller nederbörd nu* (`rain || snow || (precipitation && !DRY.has(...))`, snapshot-core.ts:42). Det
gör motorn blind för höstens klassiska svartis: **klar natt, ingen nederbörd, ytan strålar bort sin
värme och luftens fukt kondenserar direkt på vägen som rimfrost.** `dewpoint_c` ligger i varje
arkivrad sedan 24/8 och används inte av någonting.

**Kondensationsvillkoret** är fysiken: när **vägytan är kallare än luftens daggpunkt** kondenserar
vattenånga på ytan. Är ytan dessutom under noll blir kondensatet is. Det kräver ingen nederbörd, och
det är exakt det fall där motorn i dag tiger.

**Formen — och den är avgjord innan svepet:** rimfrosten blir **en andra gren i `icing_point`**, inte
en sjätte farotyp. Motorn har fem faror med en prioritetsstege där förloraren droppas; en sjätte kind
skulle röra vid varje vektor i `engine/vectors/` och vid prioritetsordningen. Rimfrosten är samma
fara — is på vägen — med en annan väg fram till slutsatsen. Röstens text får därför ändras först när
PRODUKTBOKSREGELN följs i samma varv, och tilldelas ingen egen prioritetsnivå.

### 1.1 Partitionen mot efterhalkan (#89 a) — övertagen ordagrant

Utan en gräns dubbelräknar tystnadsfelet (#98) samma miss. Gränsen är daggpunkten:

| Fall | Ägare | Fysiken |
| :-- | :-- | :-- |
| **yta ≤ daggpunkt** | **#46 (det här kortet)** | Kondensation pågår — vattnet kommer ur luften |
| **yta > daggpunkt, men regn inom N h** | **#89 (a) efterhalkan** | Kvarvarande regnvatten fryser i torr luft |

Överlappet är alltså tomt per konstruktion, och varje bekräftat halttillfälle hör hemma hos exakt en
av dem. **N sätts av #89, inte här** (TROSKLAR-OVERGANGAR §2.2).

### 1.2 Dimman är en orsak, inte en interaktion — övertaget från #89 (c)

Dimma är luft vid ~100 % relativ fuktighet, alltså **daggpunkt ≈ lufttemperatur**. Kondensations-
villkoret blir därmed uppfyllt så snart ytan är kallare än luften — vilket den nästan alltid är en
klar natt. Dimma är alltså inte en egen fara som ska kombineras med frysrisken; den är **en orsak till
att kondensationsvillkoret slår in**.

Därför: **`visibility_m < S` är en konfidenshöjare för kondensationsvillkoret** — ingen egen fara,
ingen egen prioritet, ingen egen röst. Samma givare bär två roller utan motsägelse: som *orsak* hör
sikten hit (lager 1), som *sikt i sig* hör den till #90 (lager 2, riskmodifierare). Sentinelvärdet
20 000 m gäller även här (TROSKLAR-VIND-SIKT §3.1): det betyder "minst 20 km", inte en mätning.

---

## 2. Parametrar som ska sättas — medvetet OSATTA

Inget tal nedan är valt. Svepet körs, kurvan ritas, och Bengt sätter värdet. Det som är märkt
**RESONEMANG** är ett skäl, inte ett mätt tal.

| # | Parameter | Svep | Varför just det spannet |
| :-- | :-- | :-- | :-- |
| R1 | **Kondensationsmarginal** `M`: villkoret är `yta ≤ daggpunkt + M` | **0 · +0,5 · +1,0 °C** | 0 är ren fysik. Givarna har fel på tiondelar, och en varning som kommer när frosten redan ligger är för sen — marginalen köper försprång mot mätbrus. RESONEMANG. |
| R2 | **Yttröskel** `Y`: `yta ≤ Y` | **0 · +1 °C** | Samma två steg som motorns nuvarande frysrisk (≤ 1 °C, bro +3). Över +1 fryser inte kondensatet. |
| R3 | **Uthållighet** `U`: villkoret ska hålla i minst | **30 · 60 min** | #89:s steg 0 använde 30 min som gräns mot flimmer. En enstaka minut är en givarstudsning, inte en frostnatt. |
| R4 | **Siktkonfidens** `S`: `visibility_m < S` höjer konfidensen | **1000 · 500 · 200 m** | Dimma börjar räknas vid 1000 m; 200 m är tät dimma. Höjer konfidens, skapar aldrig varning (§1.2). |
| R5 | **Molnklass**: fyrning tillåts bara vid | **klar · klar+mellan · alla** | Rimfrost är per definition ett utstrålningsfenomen. Att kräva klar himmel är ett filter som kan visa sig vara både det starkaste och det dyraste. |
| R6 | **Försprång**: hur långt före ska det sägas | **ärvs från motorn** | Fart × 30 s klämd till 400–3000 m. Ingen egen parameter — rimfrosten är samma fara, samma försprång. |

**R5 kan köras utan ny lagring.** Molnhämtningen byggdes för grind T-A 12/9 (`scripts/grind-t-a.ts`,
DECISIONS #115): SMHI metobs **parameter 16**, hämtad i efterhand vid körning, `latest-months` räcker
130 dygn bakåt. 91 % av VViS-stationerna har en molnobservation inom 50 km (DECISIONS #114). Samma
kod, samma sentinelfälla: **113 % är inte molnmängd utan "himlen skymd"** — fysikaliskt motsatsen
till klar natt, och ska räknas med de mulna.

---

## 3. Givarvakt — kortets hårdast vunna lärdom, och den är inte förhandlingsbar

**Detta avsnitt är skälet till att dokumentet är värt något.** Kortets två körningar 4/9 gav inte
svaret på frågan de ställdes för. De gav något bättre:

| Körning | Utfall |
| :-- | --: |
| #1, utan äkthetsvillkor | 58 kandidater, varav **53 från tre stationer** |
| Topp-3-stationernas yta − daggpunkt | **−28 … −49 °C** |
| #2, med äkthetsvillkor (RH ≥ 90 korsgivare + yta − dagg ≥ −5 °C) | **0 av 53 överlevde** |
| Rader med yta − dagg < −10 °C | **57** |
| Stationerna | Ollsta 2346 · Storvik 2135 · Bolhyttan 1713 |

**Varenda kandidat var givarfel.** En rimfrostgren byggd utan vakt hade fyrat på skrot från tre
stationer, natt efter natt. Fyndet är lika stort som tröskeln det skulle ha satt.

**Vakten är därför tredelad och ärvs uppåt:**

1. **#75:s vakt** (ärvd, obligatorisk i varje frostgren): `air_temp_c IS NOT NULL AND surface_temp_c
   >= air_temp_c - 12`. **61 % av arkivets frostrader faller på den**, värst −49,9 °C, och **noll**
   saknar lufttemperatur — alltså trasiga givare, inte okontrollerbar data (DECISIONS #106).
2. **Daggpunktens egen vakt** (kortets fynd 4/9): `yta − daggpunkt ≥ −5 °C`. Ett större gap än så är
   inte en frostnatt, det är en trasig daggpunktsgivare.
3. **Korsgivarkontrollen:** `relative_humidity >= 90` när kondensationsvillkoret sägs vara uppfyllt.
   Två givare som motsäger varandra ⇒ raden räknas inte. Villkoret finns i #46:s v2 och står kvar.

**Felet är isolerat till daggpunkten.** Offsetmodellen och grind A använder bara yttemperaturen och
är opåverkade (dom 4/9). Vakten gäller den här grenen, inte hela arkivet.

**Kandidat i Bengts kolumn, oförändrad sedan 4/9:** påtala de tre stationernas orimliga daggpunkter
för Trafikverket. Mejlutkast levererat i chatten 4/9.

---

## 4. Grindarna

### R-A — Finns signalen alls, och är den fysik eller brus? (mätbar när frosten kommer)

Frågan: **når kondensationsvillkoret, efter vakten, ett antal äkta stationstimmar — och bär de
utstrålningsnattens signatur?**

| # | Mått | Krav |
| :-- | :-- | :-- |
| R-A1 | Stationstimmar som överlever hela vakten i §3 | **≥ 200** |
| R-A2 | Distinkta stationer bakom dem | **≥ 20** |
| R-A3 | **Fysikkontroll, dygnsprofil:** andelen med kallaste stunden **kl 03–07** | **≥ 40 %** |
| R-A4 | **Fysikkontroll, moln:** fyrningsandel klara nätter mot mulna | **≥ 2 ×** |
| R-A5 | Ingen enskild station står för mer än | **20 %** av träffarna |

**R-A5 är kortets egen läxa gjord till ett krav.** Utan den hade 4/9:s 53 kandidater från tre
stationer sett ut som en signal.

**R-A3 är den som fällde körning #1** — dygnsprofilen var platt. Samma kontroll föll delvis för grind
T-A 12/9: bara 5 av 17 "frostnätter" hade kallaste stunden kl 03–07, vilket säger att septembers
frost till största delen inte är utstrålningsfrost. **Det är ett underlagsbesked, inte ett nej** —
och det är precis därför R-A ska köras på höstens riktiga frostnätter, inte på september.

**Faller R-A är svaret ett dokumenterat nej** och grenen läggs ner utan en rad motorkod.

### R-B — Skuggdriften: räddar grenen mer än den kostar? (döms efter en frostmånad)

Skuggkolumn `rimfrost_kandidat` i skuggmotorn, aldrig röst. Döms som B3, samma mått som #88 och #89:

| # | Mått | Golv |
| :-- | :-- | :-- |
| R-B1 | **Nettonytt:** halttillfällen grenen fångar **där punktmotorn teg eller kom > 30 min senare** | **≥ 5 %** av bekräftade tillfällen |
| R-B2 | **Falsklarm:** kandidattimmar utan något halt utfall inom 90 min | **≤ 25 %** |
| R-B3 | Extra röst per resa mot dagens motor | redovisas, **fäller inte** |

**R-B3 fäller inte — det är DECISIONS #103.** Bengts fältdom river ord-per-resa som fällande
kriterium: cry wolf handlar om *falska* varningar, och en sann varning som upprepas är redundans.
Kostnaden bärs av R-B2 där den hör hemma. **Men rimfrosten är en förutsägelse, inte en observation** —
och den skiljelinjen gör R-B2 hårdare här än för halksträckan, som är operatörens iakttagelse.

### R-C — Domens giltighet

| # | Krav |
| :-- | :-- |
| R-C1 | Minst **15 frostdygn** i mätperioden |
| R-C2 | Minst **3 geografiskt skilda regioner** (inte bara Norrlands inland) |
| R-C3 | Täckningsgraden efter vakten redovisad **som andel**, i varje dom |
| R-C4 | Ingen dom om underlagsvakten inte passerats — **OAVGJORT skrivs ut FÖRE tabellen** |

### R-D — Läsfönstret (samma fälla som Ö-D)

Gallringen (#83, DECISIONS #97) tunnar rader äldre än sju dygn till en per halvtimme. **R3:s
uthållighet på 30 minuter ligger då på gränsen och 15-minutersupplösning är helt borta.** Alltså:

> **Varje körning som ska bära R-A måste göras inom sju dygn efter frostnätterna.**

Frostlarmet i vakthunden (check 5, DECISIONS #98) fyrar när ≥ 50 stationer haft vägyta ≤ 0 °C ett
dygn och är därmed **en del av grinden**, inte en bekvämlighet. Issue #127 bär samma deadline för
#89:s steg 0 — **samma natt utlöser båda.**

---

## 5. Facit — utfallsdriven, inte villkorsräknande

Beslutat 4/9 (Bengt: "gör 1,2,3") och oförändrat: **starta i facit, inte i villkoret.**

Villkorsräkning svarar på "hur många timmar skulle grenen ha fyrat" — vilket är fel fråga, eftersom
den inte vet om någon halka fanns. Utfallsdrivet betyder: ta **väglagets frost-omklassningar en klar
morgon** och **gryningsbilderna ur kamerafacit (#20)**, och fråga bakåt: *såg daggpunktsgrenen det
1–3 timmar innan, där nederbördsgrenen var blind?* Det är missmätningens riktning (#19), och bevis
per händelse i stället för timstatistik.

Facitstacken är densamma som #88 och #98 döms mot (DECISIONS #94): `road_condition_history`,
kamerafacit #20, `situation_archive` #33. **Inget samarbete utanför huset krävs.**

**Den finska genvägen är kortets bästa kort.** `KASTEPISTE` (daggpunkt) arkiveras ur Fintraffic sedan
4/9 — 505 av 528 stationer bär den. **Lapplands septemberfrost ger äkta rimfrostnätter veckor före
Sverige.** Samma analys, finskt arkiv, ingen ny källa och inga svenska nätter att vänta på. Det är
den billigaste vägen till R-A:s underlag och bör köras först.

**Stängd väg, noterad så den inte prövas igen:** historik bakåt finns inte (Trafikverket ger bara
senaste mätningen, SMHI saknar vägyta). Fysisk mikrovalidering med frostplatta är trevlig men ger
aldrig statistik.

---

## 6. Vad som skulle fälla kortet

Skrivet före mätningen, så utfallet inte kan tolkas i efterhand (DECISIONS #71):

1. **Dygnsprofilen förblir platt** efter vakten, på höstens riktiga frostnätter ⇒ villkoret fångar
   givarbrus, inte fysik. Kortet läggs ner.
2. **Fyrningsandelen skiljer sig inte mellan klara och mulna nätter** ⇒ det är inte utstrålning som
   driver träffarna, och då är hypotesen fel även om talen ser bra ut.
3. **Nettonyttet under 5 %** ⇒ punktmotorn såg det redan, och grenen är en dubbelröst.
4. **Vakten äter allt igen** — noll kandidater överlever på ett vinterunderlag ⇒ daggpunkten i det
   svenska nätet duger inte till det här, och kortet stängs som ett dokumenterat nej.

Utfall 4 är inte otänkbart: 61 % av frostraderna faller redan på #75:s vakt. **Ett dokumenterat nej
är ett bra utfall** och kostar en mätning i stället för en motorändring.

---

## 7. Kostnad

Ingen ny källa, ingen ny tabell. `dewpoint_c` och `relative_humidity` ligger redan i varje arkivrad;
molnet hämtas i efterhand vid körning (§2, R5). En skuggkolumn ≈ 1,4 kB/dygn, samma storleksordning
som trendens. Mätkörningarna är knappar, ett par Actions-minuter styck. **0 kr/mån.**

---

## 8. Ordning — vad görs när

1. **Nu:** det här dokumentet fastställs av Bengt, som äger mätningen. Ingen kontrasignering behövs.
2. **Nu, utan att vänta på svensk frost:** kör R-A på **det finska arkivet** (§5). Lapplands
   septemberfrost är äkta. Instrumentet är en läsande knapp i samma form som grind T-A.
3. **Vid första svenska frostlarmet** (vakthundens check 5): kör R-A på svenska arkivet **inom sju
   dygn** (R-D). Samma natt som #89:s steg 0 körs om — issue #127.
4. **Passerar R-A:** skuggkolumnen `rimfrost_kandidat` byggs. **Efter radardomen 14/9**, enligt kort
   #81:s ordning.
5. **Efter en frostmånad:** R-B döms mot facitstacken.
6. **Först därefter** en motorändring: andra grenen i `icing_point`, vektorer i tre portar,
   PRODUKTBOKEN i samma varv. **Rösten är Axels.**

Steg 2 kan göras före måndag och kräver ingen dom. Steg 4 och framåt gör det.

---

## 9. Ändring

Fram till **första skuggkörningen** får svepet i §2 och kraven i §4 justeras av vem som helst av oss
med en rad i DECISIONS. **Därefter ändras ingen tröskel alls.** En ändring som lutar sig mot
utfallet är värdelös — det är hela skälet till att dokumentet är daterat. Regimen är knuten till första skuggkörningen, inte till signaturen — samma form som
TROSKLAR-TRENDEN §8 och TROSKLAR-OVERGANGAR §10.

**Givarvakten i §3 är undantagen från all lättnad.** Den får skärpas men aldrig mjukas upp, oavsett
signaturer. Skälet står i §3 och heter Ollsta, Storvik och Bolhyttan.

---

*Källor: TAVLA.md kort #46, #20, #75, #88, #89, #90, #95, #98; DECISIONS #4, #71, #79, #94, #96,
#97, #98, #103, #106, #109, #114, #115; docs/TROSKLAR-OVERGANGAR.md §6; docs/TROSKLAR-TRENDEN.md;
docs/TROSKLAR-VIND-SIKT.md §3.1; engine/src/engine.ts, snapshot-core.ts:42; scripts/grind-t-a.ts
(molnhämtningen); ingest/fi.ts (KASTEPISTE).*
