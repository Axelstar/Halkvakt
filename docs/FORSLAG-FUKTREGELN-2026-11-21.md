# Fuktregeln för A2 — underlag för Bengts och Axels beslut (21/11 2026)

**Läge:** FÖRSLAG. Inget är ändrat i motorn, snapshoten eller appen. Underlaget kommer ur skuggkörningen (DECISIONS #940, #945):
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

Sedan DECISIONS #942 (samma dag) klassar väglaget efteråt en annars oklar olycka som *TROLIG, väglaget*; för A1 är det inte oberoende (facit och A1 läser samma källa), men för A2 är det det. Med det oberoende facit är missarna sju på säsongen, inte 56. Förslag 2 tar sex av dem och räckvidden ensam två. Talen är små, och
`halka_efter` kan vara en följd av olyckan själv (§6 val 5).

## 6. Vad föraren skulle höra

Skuggans tjugo huvudrutter (längs vägnätet, 80 km/h) spelades upp genom motorn varannan timme 6–21/11, 181 tidpunkter och 3 620
körningar (`fuktskuggan-takt.yml`, körningarna 44915775051 och 44920836258 med räckvidden ensam). A1:s sträckor talar i samma körningar, så takten är bilens.

| | A2-yttranden | körningar med A2 | yttranden per körning | följder inom 60 s |
| :-- | --: | --: | --: | --: |
| A2 i dag | 3 546 | 20,6 % | 1,0 | 804 |
| med daggpunkten (samma räckvidd) | 6 325 | 40,3 % | 1,7 | 1 176 |
| bara räckvidden (15 km, dagens fukt) | 6 334 | 27,0 % | 1,7 | 1 739 |
| förslag 2 (15 km och daggpunkten) | 11 577 | 52,2 % | 3,2 | 2 658 |

- **För föraren är räckvidden inte gratis.** En station står på lika länge, men inom 15 km når den mycket mer väg, och varje station
  talar för sig. Räckvidden ensam ger A2 på 27 % av körningarna mot 21 % i dag, men 1,8 gånger så många yttranden. Förslag 2 ger
  drygt tre gånger så många A2-yttranden som i dag och tre gånger så många följder inom en minut.
- **Daggen talar de kalla, torra nätterna.** 6–10/11 teg A2 nästan helt (0–3 % av körningarna), men med daggpunkten talade den på
  20–58 % och förslag 2 på 25–73 %. De dygnen kom regnet och snön inte, och det är R-B:s nätter.
- **I norr talar förslag 2 på nästan varje körning:** E14 Sundsvall–Åre 97 %, E4 Sundsvall–Umeå 96 %, Rv70 Enköping–Mora 96 %, E4
  Gävle–Sundsvall 94 %. En varning som hörs på varje resa säger inte längre något (*tystnad är en funktion*).
- **I söder** stiger den från 1–2 % till 7–16 % av körningarna på Skånes rutter och från 14–18 % till 37–58 % på E4 och E18.

## 6b. Räckvidden som en fara per sträcka (Bengt 21/11: *"på 2 gör vi ny skugga"*)

Samma tjugo rutter och 3 620 körningar (körning 44932577187). Stationer längs rutten inom 15 km, där nästa ligger högst 15 km längre
fram, är en fara som talar vid den första stationen, som halkzonen (DECISIONS #624). Vilka stationer som står på är oförändrat: den
fångar samma olyckor som utan zonen (35 av 55 TROLIG-missar för räckvidden, två av de sju med oberoende facit).

| | A2-yttranden | körningar med A2 | yttranden per körning | följder inom 60 s |
| :-- | --: | --: | --: | --: |
| A2 i dag | 3 546 | 20,6 % | 1,0 | 804 |
| bara räckvidden | 6 334 | 27,0 % | 1,7 | 1 739 |
| **bara räckvidden, en fara** | 3 256 | 26,8 % | 0,9 | 720 |
| förslag 2 | 11 577 | 52,2 % | 3,2 | 2 658 |
| **förslag 2, en fara** | 6 610 | 52,0 % | 1,8 | 1 160 |

- **Räckvidden som en fara kostar inget i takt.** Den talar på 27 % av körningarna mot 21 % i dag, men med färre yttranden och färre
  följder inom en minut än dagens A2. Zonen slår också ihop dagens stationer som ligger tätt.
- **Förslag 2 som en fara** halverar nästan yttrandena men står kvar på 52 % av körningarna, och i norr på 94–97 % (E14, E4
  Sundsvall–Umeå, Rv70, E4 Gävle–Sundsvall). Daggen är problemet, inte räckvidden.
- **Svagheten:** en kedja kan vara lång, och föraren hör den en gång, vid början. Skuggan mäter inte hur långt efter första stationen
  halkan ligger.

## 7. Claudes rekommendation

### Varningsregeln (A2)

1. **Inte förslag 2 som det står.** Det mer än tredubblar hur ofta föraren hör A2, och i norr talar den på nästan varje resa.
2. **Daggpunkten avgörs i R-B:s domslut (frist 10/12), inte här.** R-B1 klarar och R-B2 faller (DECISIONS #794), och larmtiden och
   förarsidan säger samma sak: daggen ger många nya varningar och få av dem följs av halka. Väljer Bengt och Axel att ändå ta in den
   är *rimfrost* (dagg bara vid ytan ≤ 0 °C) formen, som märkt beta som efterhalkan (S3), aldrig som A2:s vanliga röst.
3. **Räckvidden som en fara per sträcka (§6b).** Den tar samma 35 av 55 TROLIG-missar (två av de sju med oberoende facit), höjer
   andelen körningar med A2 från 21 till 27 %, och föraren hör färre A2-yttranden än i dag. Claudes rekommendation är att ta in den
   i motorn med dagens fukt, i en egen vektor för zonen och efter Bengts och Axels ord, och att följa missarna med oberoende facit i
   veckans sammanställning (§14) efteråt.

### Regeln i olycksfacit

4. **Gör inte facit likt regeln.** TROLIG läser redan 15 km och rimfrost vid närmaste station (§4). Samma station både varnar och
   avgör facit, och då bevisar en fångad miss bara att regeln och klassningen är lika.
5. **Döm A2-ändringar på det oberoende facit**: TYDLIG, Trafikverkets väglag efteråt (`halka_efter`) och, när de finns, kamerabilderna
   (kamerafacit). Förslag: veckans sammanställning (§9) visar missarna i två rader, *med oberoende facit* och *bara på stationen*, och
   en ändring av A2 prövas på den första. Det är en ändring av §9 och kräver båda signaturerna; klasserna i §4 rörs inte.
6. **Vänta med att ändra TROLIG.** Att ta bort rimfrosten ur TROLIG gör färre olyckor till halka, alltså en lättnad efter sett utfall
   (regel L). Det behövs inte för punkt 5.

## 8. Vad som behöver ett ord

- Bengt och Axel: punkt 1–2 (varningsregeln) och punkt 3 (räckvidden som en fara per sträcka i motorn). Punkt 5 är förregistrerad (§14, DECISIONS #946), och Axels signatur saknas.
- Bengt: R-B:s domslut, som redan har en frist 10/12.
