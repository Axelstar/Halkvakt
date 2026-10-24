# Tillägg till ersättningsregeln: den nya kandidaten får tala i appen enligt förregistreringen för 2026/27, §12

**Status: UTKAST 24/10 2026** (DECISIONS #703). Signeras av Bengt och Axel 26/10, samma dag som förregistreringen för 2026/27
(fristen `tillagg-bytet`). Skrivet **efter** att V2 föll (DECISIONS #702), och det står öppet här (§4).

Bengts ord 24/10:
- *"alltså vi vill gå live med den här nu så att mätningarna inte bara ligger som beta utan som når ut till förarna"*;
- *"då vill jag i så fall att du sätter igång med allt bygget så att vi har möjlighet att fatta beslut om det innan förregistreringen
  den 26"*;
- *"Ja, vi signerar med raden om bytet (§12)."*

## 1. Vad som har hänt

Provningen och samman (kuvos-ny-kandidat 40024563991, DECISIONS #702):
- V2 föll på A2 totalt. Den nya hade 4,33 % mot den frystas 4,52 % på 2022/23, alltså −0,19 procentenheter, där kravet var −0,25
  (högst 4,27 %).
- Norr, söder, A1 och A3 höll, liksom V1, V3 och V4.
- Den nya var bättre än den frysta på varje mått på 2022/23, men inte med den marginal som krävdes.

Ersättningsregelns följd (§3): ingen skugga, den nya arkiveras, den frysta står ensam, och i mars gäller dess egen dom.

## 2. Vad tillägget ändrar

| Ersättningsregeln | I dag | Med tillägget |
| :-- | :-- | :-- |
| §1, sista meningen | *"Den nya talar aldrig i appen under 2026/27."* | Den nya får tala i appen bara enligt FORREGISTRERING-2026-27 §12. |
| §3, följden när ett villkor faller | Ingen skugga, och den nya arkiveras. | Den nya arkiveras inte. Den räknas i en egen kedja enligt §4. |
| §4, *"Ingenting når förarna"* | Skuggan når varken appen, rösten, lägesfilen eller den frystas dom. | Gäller tills bytet är beslutat enligt §12 (b). Efter det når den nyas utfall appen, rösten och lägesfilen i stället för den frystas. Den frystas dom nås aldrig. |
| §5, valet i mars | Tabellen med fyra utfall. | Valet görs i en egen förregistrering, skriven och signerad före mars, med båda domarna som underlag (§12 g). |

## 3. Vad tillägget inte ändrar

- V1–V4, kravet 0,25 och utfallet. V2 föll och står som fallet, i #702 och här.
- Den frystas identitet, regel, grindar och dom (FORREGISTRERING-2026-27 §1–§5 och §12 c).
- Kraven i §4: paritet först (n exakt, ± 0,01 °C och ± 0,02 procentenheter), en egen logg, och att migrationen och deployen görs
  av Bengt.

## 4. Regel L, öppet

Tillägget ändrar en fryst följd efter ett sett utfall.
- **Ingen dom lättas och inget krav sänks.** Ingen dom fälls annorlunda, V2 står som fallet, och den frysta döms som förregistrerat.
- **Men det är ett avsteg från ersättningsregeln.** Tillägget ger den nya en roll som regeln tog ifrån den när V2 föll. Det görs med
  en daterad post med båda signaturerna, som §7 kräver.
- **Skälet** är Bengts: förarna ska få den metod som gav färre grova fel.
- **Mot det står** att kravet 0,25 fanns för att en skugga kostar en kedja och för att punkterna hänger ihop i tid och rum, och att
  skillnaden blev −0,19. Därför krävs paritetsprovet, färskheten och vägen tillbaka till den frysta (§12 a och f).

## 5. Val vid signeringen

§12 (g) säger att valet inför 2027/28 görs i en egen förregistrering, med båda domarna som underlag.

Alternativet är att ersättningsregelns följd står kvar för valet. Då avgör den frysta ensam inför 2027/28 (§3: klarar den sig går den
vidare, annars RÅ som kontroll och reserv), även om den nya har talat i vinter. Väljs alternativet skrivs §12 (g) och raden om §5
ovan om före signeringen.

## 6. Ordningen efter signeringen

1. Paritetsprovet: `kuvos-ny-kandidat.yml` med steg=paritet, på Bengts ord. Kedjan och steget finns i PR #1179.
2. sql/068 migreras av Bengt.
3. Flaggan i `kuvos/ny-kandidat-skugga.json` slås på, i en egen commit med paritetskörningens nummer.
4. Pulsraderna för `ny-kandidat-fysik` och `ny-kandidat-timme`. Kedjan räknar och loggar i drift.
5. Bytet i koden: lägesfilen läser den nyas regelutfall, med vägen tillbaka (§12 f). Det byggs i en egen PR före beslutet och slås på
   vid beslutets tidpunkt.
6. Bytesbeslutet: en daterad DECISIONS-post med båda signaturerna, innan någon timme av vinterns utfall är läst (§12 b).

## 7. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
