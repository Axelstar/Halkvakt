# FÖRSLAG: färre oklara olyckor i olycksfacit (2026-11-21)

**Status: SIGNERAD 21/11 2026** (Bengt: *"Vi signerar 1770 också"*, för både Bengt och Axel; DECISIONS #941). Förslag A är infört i
TROSKLAR-OLYCKSFACIT §4 och §13; B och C gäller som de står här. Bengt 21/11: *"gör c"*
(DECISIONS #939, förslag 2 och 3).

## 1. Varför

Bengt ser de oklara olyckorna som en stor del av mörkertalet: 425 av 861 klassade egna olyckor sedan 6/11 (läst 21/11 med DB-knappen,
körning 44889290200, före omräkningen av 5–12/11 i `sql/137`). En OKLAR olycka säger inget om halka, så den kan varken bli rätt
varning eller miss. Två uppgifter som redan sparas vid kontrollen klassar inte i dag:

- `halka_efter` (§3): Trafikverket satte halka på A1:s sträcka under de sex timmarna efter starten. Bokförs, klassar inte.
- lagret `radar`: regn på radarn vid starten. Bokförs, klassar inte.

## 2. Vad de skulle flytta (läst 21/11, bara antal)

**Väglaget efteråt** finns vid 46 av 158 TROLIG (29 %), vid 10 av 276 INTE (4 %) och vid 89 av 425 OKLAR. 127 oklara saknar en A1-sträcka
inom 100 m och kan inte få uppgiften. Av de 89 oklara har 63 en yta på högst +1 °C och 9 ingen station. Halkvakt varnade vid 67 av de 89.

**Regnet på radarn** som fukt flyttar nästan inget. Med frusen yta, ett eller flera fordon och ingen fukt vid stationen gäller det 3
oklara. Med ytan 0 till +1 °C gäller det 24, men då är det ytgränsen som ändras och inte fukten.

## 3. En fälla: A1 och väglaget är samma källa

A1 är Trafikverkets väglag på sträckan. Om Trafikverkets väglag efteråt gör en olycka TROLIG, blir A1 rätt nästan per definition: 67 av
de 89 var redan varnade, de flesta av A1. Andelen rätt varning skulle stiga för att facit och varningen läser samma sak, inte för att
Halkvakt blivit bättre. Förslaget nedan håller därför isär dem.

## 4. Förslaget

**A. En ny klass mellan TROLIG och INTE (varmt): TROLIG, väglaget.**
En olycka som annars blir OKLAR blir *TROLIG, väglaget* när Trafikverket satte halka på A1:s sträcka inom sex timmar efter starten och
ytan är högst +1 °C eller okänd. Ordningen i §4 blir: vilt, TYDLIG, TROLIG, **TROLIG, väglaget**, INTE (varmt), OKLAR.
- Klassen räknas som halkkopplad i nämnaren och i missarna. En tyst olycka i klassen är en miss och får en åtgärdsrad.
- En RÄTT VARNING i klassen redovisas för sig, med vilket lager som varnade. Den får inte anföras utåt enligt säljregeln (§9.6), eftersom
  facit och A1 läser samma källa.
- Uppskattat: omkring 70 av de 425 oklara flyttas, varav de flesta var varnade.

**B. Radarn klassar inte.** Den flyttar 3 olyckor med dagens ytgräns. Den står kvar som bokförd uppgift i lagret.

**C. Ytan +1 till +3 °C och torrt** (91 oklara, Halkvakt varnade vid 2) föreslås inte bli INTE nu. Det prövas först när en hel vinter är
läst, eftersom en yta strax över +1 °C med kalla fläckar är det fall där halka är svårast att se.

## 5. Vad som byggs efter signaturerna

- `sql/1xx`: klassen i `olycksfacit_efterkontroll()` och i CHECK för `klass`, och en omräkning av säsongens OKLAR på sparade mått, som `sql/137`.
- `arende.ts` och `vyn.ts`: klassen i nämnaren, missarna och bedömningen, och RÄTT VARNING i klassen redovisad för sig.
- Ett integrationsprov med en fälla för varje villkor, och ett motprov där ytan är +1,1 °C.

## 6. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 21/11 2026 | Bengt i projektets tråd: *"Vi signerar 1770 också"* |
| Axel | 21/11 2026 | Signerad av Bengt för båda (*"Vi signerar"*), inte av Axel själv |
