# Tillägg T4 till förregistreringen NY-KANDIDAT-2027-28: kortvågen 14–31/3 2022 ur MET:s v4

**Status: UTKAST 25/10 2026** (DECISIONS #716, #718). Inte signerat. Det ändrar NY-KANDIDAT-2027-28 (signerad 22/10, #671) och tillägget
T1–T3 (signerat 23/10, #695) genom en daterad post med båda signaturerna, som NY-KANDIDAT §8 kräver.

Bengts ord 25/10: *"Rätta båda kandidaterna med v4:s timvärden för 14–31/3 2022: skriv utkasten till tilläggen (Ä6 för den frysta,
ett till NY-KANDIDAT för den nya), och bokför utfallet med felet beskrivet till signeringen i morgon."*

## 1. Vad som har hänt

- **Källfelet.** MET:s arkiv bär kortvågen (och långvågen) som en växande summa från 14/3 2022 00 UTC, inte som timvärden (se
  tillägget Ä6 till FLER-VINTRAR §1 för timserien). Den nya kandidaten räknar sin långvåg själv (reserven), men läser **kortvågen** ur
  sina MET-delar (`FALT` i `fysik/niva2/metnordic.py`, `shortwave_radiation` i fysiken). 14–31/3 2022 var kortvågen alltså fel i
  den nyas delar för 2021/22.
- **Vad det har rört:**
  - provet där 2021/22 hålls utanför (dess testpunkter i mars);
  - de fem andra proven, som tränades med 2021/22 i träningsmängden;
  - **den slutliga kandidaten**, som tränades på alla sex vintrarna (§3) och som nu loggar i drift bredvid den låsta (#706).
- **Sett före det här utkastet (öppet):**
  - de sex provens tal och V2, som föll på 2022/23 med 0,06 pe (4,33 % mot kravet högst 4,27 %, #702);
  - avvikelsen i #702: NIVÅ 2 utan blandning sämre än RÅ just 2021/22 (13,41 mot 9,51 %), som felet troligen förklarar;
  - jämförelsen med den frysta på 2018/19–2021/22, 25/10 (#716).
- **Omfattningen.** Tröskelhalvan av trappformsprovet på delarna för 2018/19–2024/25 flaggade bara 14–31/3 2022 (431 timmar). T2:s
  timme 25/3 08 UTC kommer redan ur v4 och är ren. Sågtandsräkningen (§5 a) är inte körd än.

## 2. Tillägget

**T4. Kortvågen 14/3 2022 00 UTC – 31/3 2022 23 UTC tas ur MET:s omräkning v4** (`metpparchivev4`), timme för timme, i samma rutor och
med samma omräkning som T2. Inga andra fält ändras; långvågen tas som förut ur reserven.

- De berörda delarna (28/2–14/3, 15–29/3 och 30–31/3 2022) skrivs som nya filer bredvid originalen och de fyllda delarna, som står
  kvar i releasen. En lista per del anger timmarna och källorna, och originalens summor.
- Sedan körs förberedningen, träningen (alla sex prov och den slutliga kandidaten), provningen och samman om, med samma procedur,
  samma par att välja bland och samma frö.
- Visar trappformsprovet efter T4 en enda flaggad timme läses ingenting, och frågan går till Bengt (som T3).

## 3. Hur de rättade talen används (val vid signeringen)

- **(a) V2 står som den föll** (#702). De rättade talen är underlag för bytet (FORREGISTRERING-2026-27 §12 b) och valet inför 2027/28
  (§12 g), men inte en ny prövning av ersättningsregelns villkor. **Claudes rekommendation**, eftersom en ny prövning av ett krav som
  redan fallit är en andra chans efter sett utfall (regel L).
- **(b) V2 prövas om** på de rättade talen. Inte rekommenderat.

Med båda vägarna redovisas de gamla och de rättade talen bredvid varandra, per vinter och som medel.

## 4. Den slutliga kandidaten i drift (val vid signeringen)

Den modell som loggar i drift (#706) och som kan tala enligt §12 är tränad med de 18 dygnen fel kortvåg.
- **(a) Byt till den rättade modellen före bytesbeslutet** (Claudes rekommendation): paritetsprovet görs om (§12 a), bytet loggas med
  datum och timme, och beslutet senast 30/11 fattas på den rättade modellens tal.
- **(b) Behåll den nuvarande** och redovisa skillnaden.

## 5. Prov före läsningen

- **(a) Trappformsprovet** i varje del, som i Ä6 §4 (a). Kravet är noll flaggade timmar.
- **(b) v4 är timvärden** för kortvågen 14–31/3 2022, som i Ä6 §4 (b).
- **(c)** Proven i NY-KANDIDAT §4 och T1–T3 som förut (tidszonen med T1, högst 1 % saknat efter T2 och T4).

## 6. Regel L

- **Inga krav sänks.** X = 0,25, V1–V4 och proven står kvar.
- **Sett:** de sex provens tal, V2 och jämförelsen 25/10 (§1).
- **Skälet** är ett källfel som syns i timserien, oberoende av vilket håll utfallet går, och samma rättelse görs för den frysta (Ä6).
- **Avsteget, öppet:** indatan ändras efter sett utfall. Därför står de gamla talen kvar bredvid, och V2 prövas inte om (§3 a).

## 7. Koden och körningarna

- `fysik/ny_kandidat/metnordic_reserv.ts`: ett steg som skriver kortvågen ur v4 för timmarna i [14/3 2022, 1/4 2022), med listor.
- `fysik/ny_kandidat/forbered.py`: trappformsprovet och valet av den rättade delen före originalet.
- `kuvos-ny-kandidat.yml`: steget för T4, sedan `forberedning` → `traning` → `provning` → `samman`; därefter jämförelserna med den
  frysta (`osakerhet`) för 2018/19–2022/23 och paritetsprovet om §4 (a) väljs.
- Tid: koden ungefär en halv dag; träningen tog förra gången en körning med 22 enheter (40003362865). Hela kedjan ryms inom en vecka,
  före bytesbeslutet 30/11.

## 8. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
