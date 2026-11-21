# Fuktregeln för A2 — underlag för Bengts och Axels beslut (21/11 2026)

**Läge:** FÖRSLAG. Inget är ändrat i motorn, snapshoten eller appen. Underlaget kommer ur skuggkörningen (DECISIONS #940, #942):
`sql/138` och `fuktskuggan.yml` (stationstimmarna och olyckorna), `fuktskuggan-larmtid.yml` (larmtiden och varianterna, körning
44905288117) och `fuktskuggan-takt.yml` (vad föraren skulle höra längs skuggans rutter). Säsongen 6–21/11, 295 387 stationstimmar,
811 klassade olyckor utan dubbletter och vilt.

## 1. Frågan

Förslag 2 ur analysen 21/11: A2 läser stationer inom **15 km** i stället för 5 km, och fukt är nederbörd **eller ytan under
daggpunkten**. Ytgränsen +1 °C som i dag. Det fångade nästan alla missar men skulle stå på en fjärdedel av stationstimmarna. Bengt 21/11:
lägg krutet på fuktregeln, och se om larmtiden går att korta utan att tappa missarna.

## 2. Förslaget är två ändringar, och de kostar olika

| | larmtid (stationstimmar) | halka, varnade (122) | halka, tyst (56) | oklar, tyst (291) | varm (226) |
| :-- | --: | --: | --: | --: | --: |
| A2 i dag (5 km, nederbörd) | 14,7 % | 62 | 5 | 6 | 0 |
| **bara 15 km** (nederbörd) | 14,7 % | 102 | 35 | 44 | 1 |
| **15 km och daggpunkten** (förslag 2) | 26,2 % | 122 | 52 | 91 | 4 |

- **Räckvidden** (5 → 15 km) ändrar inte hur länge en station står på, bara hur mycket väg den täcker. Den ensam tar 35 av 56 missar.
- **Daggpunkten** står för hela ökningen av larmtiden, 14,7 → 26,2 %, och tar de 17 missarna till.

## 3. Var och när larmtiden står på

- **Norrut.** Söder om 60° står förslag 2 på 12,4 % av timmarna (i dag 6,8 %), 60–63° 44,9 % (24,1 %), norr om 63° 54,5 % (31,5 %).
  I norr står alltså redan dagens A2 på en tredjedel av tiden, och förslaget gör det till mer än hälften.
- **Natt och förmiddag.** Förslag 2 står på omkring 27–29 % på natten (19–06) och 25 % på dagen, lägst mitt på dagen. Dagens A2 ligger jämnt kring 13–17 %.
- **Nästan bara vid kall yta.** Av daggtimmarna (förslag 2 men inte A2) har 85 % ytan ≤ 0 °C. Kondens på yta mellan 0 och +1 °C är
  bara 1,7 % av alla timmar.
- **Långa episoder.** En episod med bara dagg är 3 timmar i median och 6,5 i medel; 938 av 4 040 är en enda timme.

## 4. Går den att korta? Sex varianter

Alla med ytan ≤ +1 °C och 15 km. Bara missarna som är TROLIG räknas (en TYDLIG-miss finns, och alla varianter utom marginalerna tar den).

| variant | larmtid | tyst TROLIG (55) | oklar, tyst (291) | varm (226) |
| :-- | --: | --: | --: | --: |
| förslag 2 | 26,2 % | 51 | 91 | 4 |
| dagg bara när ytan ≤ +0,5 °C | 25,5 % | 50 | 84 | 2 |
| dagg bara när ytan ≤ 0 °C (rimfrost) | 24,5 % | 50 | 74 | 1 |
| ytan minst 0,5 °C under daggpunkten | 22,9 % | 46 | 74 | 3 |
| dagg bara kl. 19–06 | 21,0 % | 45 | 66 | 2 |
| ytan minst 1 °C under daggpunkten | 20,3 % | 44 | 69 | 2 |
| bara 15 km, ingen dagg | 14,7 % | 35 | 44 | 1 |

Ingen variant kortar larmtiden mycket utan att tappa missar: varje procentenhet kostar ungefär en miss. *Rimfrost* (dagg bara vid ytan
≤ 0 °C) kostar en miss och tar bort 1,7 procentenheter, och är fysiskt rimligast: kondens på en yta över noll fryser inte.

## 5. Varning för cirkeln

TROLIG kräver i klassningen yta ≤ 0 °C och fukt *eller rimfrost* vid närmaste station inom 15 km (TROSKLAR-OLYCKSFACIT §4). Det är
nästan samma villkor som förslag 2. Att förslaget fångar TROLIG-missarna är därför till stor del givet på förhand: klassningen och
regeln läser samma station. De oberoende måtten är TYDLIG (halkordet i texten; bara en miss på säsongen) och de oklara. Där tar förslag
2 91 av 291 tysta oklara mot 6 i dag, men vi vet inte hur många av dem som var halka. Basfrekvensen i sql/138 visar störst överskott av
olyckor vid ytan 0 till +3 °C med fukt, inte vid kall yta (DECISIONS #939).

## 5b. Daggpunkten är rimfrostens gren, och R-B har redan läst den

Daggdelen av förslag 2 är samma sak som rimfrostens gren i A2 (kort #46, TROSKLAR-RIMFROST, fastställt 12/9). Dess uppspelning R-B
lästes i domläget 5/11 (DECISIONS #794): grenen fångar omkring 200 bekräftade halktillfällen på en månad där punktmotorn tiger (R-B1
klarar i alla tolv kombinationer), men omkring 19 av 20 av dess episoder följs inte av en omklassning till halka inom 90 minuter (R-B2
faller i alla tolv, 94–96 % mot taket 25 %). Följden då var *ingen röst och ingen motorkod för stationernas gren*, och domslutet väntar
på Bengt (frist 10/12, `r-b-dom`). Larmtiden här säger samma sak med ett annat mått: daggen dubblar nästan tiden larmet står på, och
nästan bara vid kall yta. Ett beslut om daggpunkten i A2 är därför ett domslut om R-B, och regel L gäller för det.

## 5c. Missarna mätta med facit som inte bygger på stationen

Det oberoende facit som finns i dag är TYDLIG (halkordet i texten) och `halka_efter`: satte Trafikverket halka på olycksplatsens
sträcka inom sex timmar (TROSKLAR-OLYCKSFACIT §3, bokförs men klassar inte). För 36 av de 55 TROLIG-missarna finns ingen sträcka inom
100 m, och då är det okänt.

| | olyckor | A2 i dag | bara 15 km | förslag 2 | rimfrost (≤ 0 °C) |
| :-- | --: | --: | --: | --: | --: |
| miss, TYDLIG | 1 | 0 | 0 | 1 | 1 |
| miss, TROLIG med halka efteråt | 6 | 0 | 2 | 5 | 4 |
| oklar och tyst, med halka efteråt | 21 | 0 | 3 | 6 | 4 |

Med det oberoende facit är missarna sju på säsongen, inte 56. Förslag 2 tar sex av dem och räckvidden ensam två. Talen är små, och
`halka_efter` kan vara en följd av olyckan själv (§6 val 5).

## 6. Vad föraren skulle höra

*Körs: `fuktskuggan-takt.yml` spelar upp skuggans tjugo rutter varje halvtimme sedan 6/11. Avsnittet fylls när körningen är klar.*

## 7. Claudes rekommendation

*Skrivs när förarsidan är läst.*
