# Småvägsröstens avbrottsvillkor — förslag (DECISIONS #828, kort #647)

**Status: SIGNERAT 11/11 2026** av Bengt (*"jag tar gärna rekommenationer från dej"*, på förslagen) och av Axel via Bengt (*"axel signerar"*). DECISIONS #833. Villkoren gäller från påslaget (byggplanens steg 10). Inget av vintern 2026/27 är läst.
Bengt 11/11: *"kör vidare"*, efter förslaget att skriva villkoren för signering.

#828 och kuvösens F52 punkt 4 säger att ett avbrott under säsongen bara får grundas på fyra saker:
- olycksfacit;
- testarnas facitsvar;
- takten i skuggan;
- driftens hälsa.

P-II:s utfall läses inte före sina datum, 1/3 och 1/4. Storstädernas villkor (#816) är mallen.

## 1. Vad ett avbrott är

- **`sql/107` slår av båda brytarna, P1 och N.** Från nästa publicering, inom två minuter, saknas nyckeln `smavag` i `live.json`, och appen tiger för småvägarna. K, A1, A2 och storstäderna rörs inte.
- **Ett avbrott är inget domslut.** Rösten slås på igen med Bengts och Axels ord, när orsaken är förstådd. Påfilen, med sina vakter, byggs till påslaget.
- **Varje avbrott får en rad i STATUS och ett besked till Bengt,** med vad som utlöste det och vilka siffror som låg till grund.

## 2. Driftens hälsa: Claude slår av utan att fråga

1. Publiceringen faller två körningar i rad, eller lägesfilen står still i mer än 10 minuter, medan en brytare är på.
2. En K-timme försvinner för dagens punkter, eller ett av storstädernas steg faller, och felet går att följa till småvägskedjan eller timflödet.
3. Publiceringens bygge tar mer än dubbelt så lång tid som medianen veckan före påslaget, två körningar i rad.
4. En förare rapporterar att batteriet eller värmen är fel med rösten på.

**Det som redan tystar rösten av sig självt** behöver inget avbrott:
- en kedja eller ett timflöde som faller: timmen blir för gammal efter två timmar, `smavag_timme`;
- en punktfil som går isär med punkterna: nyckeln saknas.

## 3. Takten: Claude slår av och frågar sedan

5. **Rösten talar oftare än taket.** Besked per körtimme i skuggan ligger över det tak som valdes före påslaget två dygn i rad, i norr eller i söder. Beskeden räknas på regelns utfall med samma T och D som appen.

Taket är det Bengt och Axel väljer ur takten i minst 14 dygn (F50 del B, med tillägget i §7 när det är signerat), aldrig ett antaget tal (#200).

## 4. Testarnas facitsvar: Bengt och Axel beslutar

6. **Testarna säger oftare att det inte var halt.** Under en vecka kommer minst 10 facitsvar om småvägsrösten, och fler än hälften säger att det inte var halt. Rösten slås då av i väntan på en läsning.

Svaren läses med DB-knappen och publiceras aldrig, som alla testares svar (#498).

## 5. Olycksfacit: granskning, inget avbrott

7. **Varje tydlig eller trolig olycka på en småväg** där rösten tiger, eller talar utan att regeln hade fukt, får en rad i olycksfacits dagliga ärende. Den raden granskas, men den slår inte av rösten.

Skälet: olycksfacit mäter om en varning fanns när en olycka hände, inte hur ofta rösten talar i onödan. En miss talar för fler varningar, inte färre. Det rösten kan göra fel åt det hållet syns i takten och i testarnas svar.

## 6. Valen

Valda 11/11: förslagen, som står först.

| # | Val | Förslag | Annat |
| :-- | :-- | :-- | :-- |
| 1 | Driftens hälsa (§2) | Claude slår av utan att fråga | Claude frågar först, som #816 lät Bengt avgöra |
| 2 | Takten (§3) | två dygn över taket, norr eller söder | ett dygn; en vecka |
| 3 | Testarnas svar (§4) | minst 10 svar under en vecka, fler än hälften "inte halt" | andra tal |
| 4 | Olycksfacit (§5) | granskning, inget avbrott | ett avbrott vid ett visst antal missar |
| 5 | Avbrottets omfång | båda brytarna | bara den grupp, P1 eller N, där villkoret slog till |

## 7. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | 2026-11-11 | Bengt i chatten: *"jag tar gärna rekommenationer från dej"*, på de uppräknade valen 1–5 |
| Axel | 2026-11-11 | Via Bengt i chatten: *"axel signerar"* |
