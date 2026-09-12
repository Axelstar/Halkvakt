# TROSKLAR-TYSTNADSFEL

**Kort:** #98 TYSTNADSFELET (B3-syskon till #88). **Status:** ✅ **FASTSTÄLLT OCH KONTRASIGNERAT** —
Bengt 2026-09-11 i chatten, Axel samma dag via Bengt (samma form som DECISIONS #61/#68/#92; se #95).
Fastställda: måttets definition (§2–§4), räckviddsvillkoret (§6) och facitstacken (§8). Ingen kod,
ingen röst före grind-A/B/C-dom. Skuggkolumnen byggs efter radardomen 14/9 (kort #81:s ordning).

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

**Oursäktlig tyst miss — systemet teg TROTS signal:**

- daggpunktsgapet slöt sig, eller trenden (#88) pekade mot nollgenomgång,
- eller en VViS-station inom räckvidd visade risk och representativitetsradien den natten (klart,
  vindstilla — SMHI-moln, #95) sträckte sig till platsen,
- **eller det regnade inom N timmar vid stationen** (tillagd 2026-09-12, TROSKLAR-OVERGANGAR §9
  steg 5, kort #89). Utan den signalen klassas efterhalkans missar på de tre ovan — ofta
  oursäktliga ändå, eftersom daggpunkten är hög efter regn — men **utan att orsaken syns**, och då
  kan tystnadsfelet inte skilja "för hög tröskel" från "hål i fuktvillkoret". N hämtas ur
  TROSKLAR-OVERGANGAR §2 och är samma tal som grind Ö-B väljer; innan Ö-B dömt används hela svepet
  och utfallet redovisas per N.

Detta är rena tröskelfel: en sänkt tröskel fångar dem utan ny datakälla. Det är scenariot "svartis
3 km fram medan systemet teg".

**Ursäktlig tyst miss — systemet teg UTAN signal:**

- snöby som bara radarn ser (#43),
- saltbil som inte passerat (ingen öppen källa),
- is på kommunal gata utan givare (#93).

Ingen tröskeljustering fångar dessa; de pekar mot nya källor, inte mot en lägre tröskel.

## 4. Måttet är ett par, inte ett tal

- **Andel oursäktliga tysta missar** = hur mycket en tröskelsänkning skulle vinna. Varje sådan är ett
  tillfälle systemet kunde ha varnat för gratis, på grund det redan hade.
- **Andel ursäktliga tysta missar** = taket för vad tröskeln kan lösa; pekar mot radar (#43) och
  kommunala stationer (#93) i stället.

## 5. Priset måste stå bredvid

För varje kandidattröskel räknas också antalet **nya falsklarm** den skulle ha genererat på torra,
ofarliga tillfällen. Det är avtrubbningskostnaden i konkret form.

Rita två kurvor mot tröskeln (från dagens strikta ned mot 50 %-nivån): oursäktliga tysta missar som
räddas, och falsklarm som tillkommer. **Där marginalen korsar** — där nästa räddade miss kostar mer i
avtrubbning än den är värd — sitter rätt tröskel.

Hypotesen är att dagens tröskel ligger till vänster om den punkten (för konservativt); kurvan avgör
om så är fallet och med hur mycket.

## 6. Räckviddsvillkoret (avgörande)

En tyst miss räknas **endast** när facit-halkan låg inom systemets räckvidd men utanför dess röst —
nära en VViS-station (t.ex. inom ankaravståndet #38b), inte på en kommunal gata mils från närmaste
givare. Annars drunknar tröskelsignalen i täckningshål som handlar om något annat (#93). Tröskeln
mäts där systemet faktiskt hade en chans.

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

- Skuggkolumn i skuggmotorn, aldrig röst före grind-A/B/C-dom (mars).
- Punktkälla säger "risk framöver"; endast sträcka säger "på vägen".
- Tröskelrad i TROSKLAR-SKUGGAN kräver **båda signaturer** (§5 i moderdokumentet) innan den flyttas
  från prov till motor.
- "Okänt" förblir ett giltigt utfall — en oursäktlig tyst miss som saknar signal ska inte tvingas
  till en gissning.

## 10. Källor i repot

TAVLA.md #88 (trend/B3), #38b (stråket/ankare), #43 (radar), #93 (kommunala vägar), #95 (SMHI-moln
som representativitetsradie), #20 (kamerafacit), #33 (situation_archive), #55 (kamerorna vid VViS);
docs/TROSKLAR-SKUGGAN.md; docs/TROSKLAR-TRENDEN.md (B3-syskon); publish/grind-a.ts.
