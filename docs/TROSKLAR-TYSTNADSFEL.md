# TROSKLAR-TYSTNADSFEL

**Kort:** #98 TYSTNADSFELET (B3-syskon till #88). **Status:** ✅ **FASTSTÄLLT OCH KONTRASIGNERAT** —
Bengt 2026-09-11 i chatten, Axel samma dag via Bengt (samma form som DECISIONS #61/#68/#92; se #95).
Fastställda: måttets definition (§2–§4), räckviddsvillkoret (§6) och facitstacken (§8). Ingen kod,
ingen röst före grind-A/B/C-dom. Skuggkolumnen byggs efter radardomen 14/9 (kort #81:s ordning).

*Ändrat 24/9 2026 (DECISIONS #330, Bengts rad *"gör förslaget"* — en skärpning: talen in, ingen gräns flyttad): §3 fick mätbara
signaler, tre klasser och en orsakskolumn; §4 tre andelar; §5 svepet; §6 talen; §6b minsta underlag. Instrumentet är
`scripts/tystnadsfelet.ts` (byggt 14/9, PR #236; ändrat 24/9) med två lägen. Underlag: `docs/TYSTNADSFEL-KLASSNING-2026-09-24.md`.*

*Skrivet 2026-09-10 21:09 som förslag (föreslaget kortnummer #97, sedan upptaget av regex-blindfläcken
— numret är nu #98). Fastställt 11/9 på Bengts order. Formateringen återställd vid incheckningen:
dokumentet hade rundgått via Drive, som escapar markdown och plattar tabeller. Innehållet är oförändrat
utom statusraden och kortnumret.*

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · punktkällor säger
"framöver" · tystnad är en funktion · trösklar gissas inte, de faller ur mätning.

---

Frågan dokumentet ska besvara empiriskt: har vi satt tröskeln för "risk framöver" så högt att
systemet tiger i lägen där det faktiskt har grund att varna?

Intuitionen (Bengt 10/9): ett missat svartisvarning kan döda, ett falsklarm irriterar — kostnaderna
är asymmetriska. Motargumentet (husregeln): varje larm sänker värdet av nästa; tystnad skyddar
trovärdigheten hos den varning som betyder något. Detta dokument avgör tvisten med data i stället
för princip.

## 1. Vad som mäts

Måttet vänder på vanlig utvärdering: det räknar **tystnadens fel**, inte larmens träff. Enheten är
ett bekräftat halttillfälle ur facit — väglagets omklassningar, kamerafacit (#20), situation_archive
(#33); se §8 — med plats och tid.

För varje facit-tillfälle ställs tre frågor: (a) vad sa systemet vid platsen och tiden — röst, skugga
eller tyst? (b) vad hade det kunnat säga vid kandidattröskeln? (c) hade det signal, eller inte?

## 2. Utfallsklasser

| | Facit: halt | Facit: inte halt |
| :-- | :-- | :-- |
| **Systemet varnade** | Träff | Falsklarm (avtrubbning) |
| **Systemet teg** | **Tyst miss ← måttets kärna** | Rätt tystnad |

**Grundtalet — tyst miss-frekvensen:** av alla bekräftade halttillfällen, andelen där systemet teg
helt. Stor ⇒ tröskeln för hög. Nära noll ⇒ systemet fångar redan det fångbara.

## 3. Ursäktlig vs oursäktlig tyst miss

Grundtalet räcker inte, eftersom frågan har en riktning: missar vi sådant vi hade grund att fånga?
Varje tyst miss klassas därför som en av två:

**Signalerna, med tal** (DECISIONS #330; varje tal är ett annat dokuments, inget är nytt). Mätta vid närmaste station inom
räckvidd (§6), de två timmarna före tillfället:

| Signal | Mätbar definition | Talet kommer ur |
| :-- | :-- | :-- |
| **Kondensation** | yta − daggpunkt ≤ gap; gap över svepet 0 · 0,5 · 1 · 2 °C | TROSKLAR-TRENDEN §2; TROSKLAR-RIMFROST §2 (kondensationsvillkoret) |
| **Trend mot noll** | lutning30 ≥ 0,8 °C och yta ≤ +3 °C, och yta − 4 × lutning30 ≤ 1 °C (når frysgränsen inom 2 h) | betans startvärden, DECISIONS #222; trendkandidaterna (#88) |
| **Station visade risk** | motorns egen regel: yta ≤ 1 °C **och** fukt | engine.ts, DECISIONS #4 |
| **Regn nyss** | regn eller snö inom N h; N över svepet 1 · 2 · 3 · 4 h tills Ö-B dömt | TROSKLAR-OVERGANGAR §2 |

**Oursäktlig tyst miss — systemet teg TROTS signal:** någon av de fyra ovan, eller stationen låg mellan frysgränsen och
+3 °C med fukt inom facitradien (yttröskeln själv). Detta är tröskelfel — men **fyra olika trösklar**, och orsaken skrivs
per miss, eftersom priset i §5 är ett annat för var och en:

| Signal | Tröskeln som teg | Vad en "sänkning" betyder |
| :-- | :-- | :-- |
| Kondensation | fuktvillkoret — rimfrostgrenen (#46) | en ny gren, inte lägre yttröskel |
| Trend mot noll | tidsvillkoret (#88) | trenden in i motorn |
| Station visade risk, tillfället > 2 km från stationen | avståndet (räckvidden) | vidare räckvidd, oförändrad temperatur |
| Regn nyss | fuktvillkoret — efterhalkan (#89) | fuktdefinitionen, inte temperaturen |
| Station 1–3 °C med fukt inom 2 km | **yttröskeln** | här, och bara här, betyder det 1 → 1,5 → 2 °C |

**Ursäktlig tyst miss — bevisad yttre orsak:** radarn såg nederbörd (≥ utlösaren) i ett segment inom 5 km inom ±1 h
medan stationen var torr — snöbyn som bara radarn ser (#43). Ingen tröskeljustering fångar den; den pekar mot radarn.

**Okänd tyst miss — ingen signal, ingen bevisad orsak.** Saltbilen som inte passerat och allt annat som ingen källa ser.
Det är inte "ursäktligt", det är okänt (§9), och det räknas som en egen andel — annars summerar §4 till 100 % på en lögn.
Is på kommunal gata utan givare (#93) klassas inte alls: den utesluts redan av räckviddsvillkoret (§6).

## 4. Måttet är ett par, inte ett tal

- **Andel oursäktliga tysta missar** = hur mycket en tröskelsänkning skulle vinna — redovisad **per orsak** (fukt, tid,
  avstånd, yttröskel), eftersom bara den sista svarar på §5:s kurva.
- **Andel ursäktliga tysta missar** = det radarn (#43) ska lösa.
- **Andel okända tysta missar** = det ingen källa ser. Tre andelar, inte två (DECISIONS #330).

## 5. Priset måste stå bredvid

För varje kandidattröskel räknas också antalet **nya falsklarm** den skulle ha genererat på torra,
ofarliga tillfällen. Det är avtrubbningskostnaden i konkret form.

Rita två kurvor mot yttröskeln över svepet **1,0 · 1,5 · 2,0 · 2,5 °C** (bara orsaken *yttröskel* svarar på den kurvan;
fukt, tid och avstånd har sina egna kort): oursäktliga tysta missar som räddas, och tillfällen som tillkommer.
Priset räknas som **tillkomna varningstillfällen** vid stationer inom räckvidd (DECISIONS #330); om de var falska kan bara
kamerafacit (bar/våt) och förarens *nej* säga, och det står bredvid talet. **Där marginalen korsar** — där nästa räddade miss kostar mer i
avtrubbning än den är värd — sitter rätt tröskel.

Hypotesen är att dagens tröskel ligger till vänster om den punkten (för konservativt); kurvan avgör
om så är fallet och med hur mycket.

## 6. Räckviddsvillkoret (avgörande)

En tyst miss räknas **endast** när facit-halkan låg inom systemets räckvidd men utanför dess röst —
nära en VViS-station (t.ex. inom ankaravståndet #38b), inte på en kommunal gata mils från närmaste
givare. Annars drunknar tröskelsignalen i täckningshål som handlar om något annat (#93). Tröskeln
mäts där systemet faktiskt hade en chans.

**Talen (DECISIONS #330):** räckvidd = närmaste vaktade station inom **7 km** (grind A:s skarpaste band; inte ankarradien 50 km,
som säger hur långt bort en station får vara som *granne*). Tyst = inget larm av slaget frysrisk eller halt väglag inom
**2 km** av tillfället i det senaste skuggvarvet på en rutt som passerar inom 2 km, högst **4 h** före (flottan besöker
varje rutt var 3,5:e timme); inget sådant varv ⇒ okänt, aldrig tyst. Facitradien 2 km är TROSKLAR-SKUGGAN §2:s.

### 6b. Minsta underlag

Paret i §4 och priset i §5 läses först vid **≥ 20 tillfällen inom räckvidd över ≥ 3 halkperioder** (tillfällen mer än
två dygn isär är olika perioder) — samma golv som grind C1. Antalen (tillfällen, tysta, per klass och orsak) får läsas
löpande som underlag; andelarna vid utsatt tid eller på Bengts order (blindningen, DECISIONS #330).

## 7. Utfallsmening

*Dokumentet är rätt byggt när en vinters skuggdata kan fylla i: "Under vintern teg systemet vid N
bekräftade halttillfällen inom räckvidd. Av dem hade det signal i M fall (oursäktliga). En
tröskelsänkning till nivå X hade fångat dem, till priset av Y nya falsklarm."*

M stort och Y litet ⇒ sänk tröskeln (intuitionen bekräftad). M litet ⇒ tystnaden sitter rätt,
problemet är täckning, inte försiktighet.

## 8. Facit — vad måttet döms mot

*(Omskrivet 10/9 kväll: försäkringsbolagens skadedata är inte tillgänglig. Ändringen rör facitkällan,
inte måttets definition.)*

Måttet döms mot den facitstack som **redan skrivs varje dygn** — samma som mars-domen och #46 använder:

- **Väglagets omklassningar** (road_condition_history): operatören klassar om till halka/is ⇒ facit
  på att det var halt.
- **Kamerafacit** (#20): väglagskamerabilder arkiverade vid varning, gryningsbilder. 738 av 744
  kameror står vid en VViS-station (#55) — facit ligger **per konstruktion inom räckvidd**.
- **situation_archive** (#33): olyckor och stoppade fordon med position och tid.

Facitstacken flödar kontinuerligt från första frosten. Måttet kan därför **börja räknas i höst, inte
först i mars**, och kräver inget samarbete utanför huset.

Det facit som inte finns — halka på vägar utan givare — är precis det räckviddsvillkoret (§6)
utesluter med flit. Det kommunala hålet (#93) är ett täckningsproblem, inte ett tröskelproblem, och
ska inte blandas in i tystnadsmåttet.

## 9. Grind och husregler

- **Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
  det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
  startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
  tröskel följer detta dokument som förut.
- Skuggkolumn i skuggmotorn, aldrig röst före grind-A/B/C-dom (mars).
- Punktkälla säger "risk framöver"; endast sträcka säger "på vägen".
- Tröskelrad i TROSKLAR-SKUGGAN ändras enligt §5 i moderdokumentet innan den flyttas
  från prov till motor.
- "Okänt" förblir ett giltigt utfall — en oursäktlig tyst miss som saknar signal ska inte tvingas
  till en gissning.

## 10. Källor i repot

TAVLA.md #88 (trend/B3), #38b (stråket/ankare), #43 (radar), #93 (kommunala vägar), #95 (SMHI-moln
som representativitetsradie), #20 (kamerafacit), #33 (situation_archive), #55 (kamerorna vid VViS);
docs/TROSKLAR-SKUGGAN.md; docs/TROSKLAR-TRENDEN.md (B3-syskon); publish/grind-a.ts.
