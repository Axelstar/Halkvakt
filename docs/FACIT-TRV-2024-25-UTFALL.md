# Facitläsningen mot Trafikverkets väglag 2024/25 — utfallet

Körning 38958523766 på c156995, 16/10 2026 19:56–21:25 UTC (DECISIONS #602). Förregistreringen är
`docs/FORREGISTRERING-FACIT-TRV-2024-25.md`, signerad 16/10 (#595), med identitetsprovet i §9 (#597). Allt nedan är **diagnos, ingen
dom** (§1). Inga trösklar ändras av utfallet.

Bara aggregat per månad och breddgradsband (PUBLIKT REPO). Trafikverkets rader finns aldrig i repot.

## Sammanfattning

| Mått | Söder 55–60 | Mitten 60–64 | Norr 64–69 | Totalt |
| :-- | --: | --: | --: | --: |
| (a) Basnivån B: stationens egna kalla timmar med is inom [t − 1, t + 2] h | 5,4 % | 47,2 % | 77,3 % | 35,9 % (429 913 av 1 196 207) |
| (a) Kandidatens kalla timmar, bekräftade (A) | 5,6 % | 47,8 % | 77,6 % | 36,8 % (437 916 av 1 190 663) · lyftet **1,02** |
| (a) Hela regeln, de varnande timmarna | 4,3 % | 23,6 % | 62,0 % | 14,8 % (33 552 av 227 143) · lyftet **0,41** |
| (a) Missar, kandidaten (is-episoder utan kall timme 2 h före) | 248 av 1 739 | 219 av 3 821 | 101 av 2 743 | 568 av 8 303 (6,8 %): nederbörd 194 · utstrålning 323 · okänd 51 |
| (a) Missar, hela regeln | 1 048 av 1 739 | 2 784 av 3 821 | 2 305 av 2 743 | 6 137 av 8 303 (73,9 %): nederbörd 2 015 · utstrålning 3 713 · okänd 409 |
| (b) Basnivån: egna kalla timmar med is inom [t, t + 6] h | 6,3 % | 50,3 % | 80,0 % | 37,9 % |
| (b) Efterhalkans fyrningar, bekräftade | 0,7 % (6 av 819) | 14,2 % (24 av 169) | 43,3 % (13 av 30) | 4,2 % (43 av 1 018) · lyftet **0,11** |
| (c) Planerad halkbekämpning inom ±6 h: kandidaten · hela regeln · efterhalkan | | | | 37,4 % · **72,2 %** · 62,7 % |

Förväntan, skriven före läsningen (§5):
1. *Kandidatens lyft är över 1.* Det blev 1,02, med 1,00–1,04 i varje band och månad. Kandidatens kalla timmar är nästan exakt
   stationernas egna, och de säger om is lika lite som kylan själv gör.
2. *Väglaget bekräftar mindre i söder än i norr.* Ja: 5,6 % mot 77,6 % för kandidaten, och lika tydligt för hela regeln och
   efterhalkan. Basnivån skiljer lika mycket, alltså är det klimatet.
3. *Missarna klumpar sig vid nederbörd, inte vid utstrålning.* Nej: 194 nederbördsdrivna mot 323 utstrålningsdrivna för kandidaten,
   och 2 015 mot 3 713 för hela regeln.

## Hela utskriften

```
IDENTITETSPROVET KLARAT (#597): paren per veck W 0.25 · L 160 km, W 0.25 · L 160 km, W 0.25 · L 160 km, W 0.25 · L 160 km, W 0.25 · L 80 km och W 0.25 · L 160 km på alla veck; n 4352575, A1 0.562 °C, A2 4.836 %, A3 0.227 % (körning 38368369876: 0,56 · 4,84 · 0,23)
  hela regeln: varma fönster 900884 vid 733 stationer · radarfönster med ≥ 0.5 mm/h 103350 på 816 sträckor · ytan vid timmen 2618267 värden vid 737 stationer
  stationernas egna kalla timmar 1366734 vid 736 stationer · efterhalkans fyrningar 1110 vid 514 stationer (riktningsprovet 6/10: 1 109)
  nederbörden: känd i 2677274 station-timmar vid 753 stationer, varav 560376 med nederbörd; givarens ord (station-timmar per ord): no 2278213 · snow 306908 · rain 256424 · sleet 20793 · freezing_rain 752 · yes 500
  vaglag.geojson: 818 sträckor; nätets summa (id och geometri, #594) bc86f500b88f105b84fd584ff6a8ec70fcb22d973b0f0a3f7956efc065efff05 · filens sha256 4657be9ec65e6baafc1d5db2f04df9f84a197505deb0d1dfda5db00fc5601f84
  stationer.json: 854 lägen; utan läge där: 1 stationer med kalla timmar, 1 med fyrningar
  kandidatens kalla timmar 1357480 vid 736 av 736 stationer · stationernas egna vid kandidatens stationer 1365184 · kandidatens stationer utan läge i stationer.json: 0
tidszonen: lokal (timmen 02 natten till 30/3 2025: 0 ändringar, timmarna runt: 61)
sträckor med is-episod: 721; is-episoder 10256; snö- och moddepisoder 11880
stationer med sträcka inom 2 km: 769 av 854; av kandidatens 736: 666
inom perioden: kalla station-timmar 1365184 av 1365184 · kandidatens kalla timmar 1357480 av 1357480 · fyrningar 1110 av 1110
== (a) basnivån: stationernas egna kalla timmar, [t − 1, t + 2] h
  2024-10 · 60–64: 0 av 47 bekräftade (0,0 %), utan sträcka 17
  2024-10 · 64–69: 0 av 87 bekräftade (0,0 %), utan sträcka 16
  2024-11 · 55–60: 3576 av 61180 bekräftade (5,8 %), utan sträcka 2943
  2024-11 · 60–64: 23710 av 61456 bekräftade (38,6 %), utan sträcka 14610
  2024-11 · 64–69: 35929 av 54948 bekräftade (65,4 %), utan sträcka 9879
  2024-12 · 55–60: 5566 av 109850 bekräftade (5,1 %), utan sträcka 5101
  2024-12 · 60–64: 54386 av 96683 bekräftade (56,3 %), utan sträcka 20965
  2024-12 · 64–69: 48114 av 61590 bekräftade (78,1 %), utan sträcka 12359
  2025-01 · 55–60: 16195 av 140753 bekräftade (11,5 %), utan sträcka 7047
  2025-01 · 60–64: 51409 av 99536 bekräftade (51,6 %), utan sträcka 21309
  2025-01 · 64–69: 49394 av 60406 bekräftade (81,8 %), utan sträcka 11706
  2025-02 · 55–60: 2871 av 165068 bekräftade (1,7 %), utan sträcka 8279
  2025-02 · 60–64: 43714 av 83606 bekräftade (52,3 %), utan sträcka 18487
  2025-02 · 64–69: 48267 av 54680 bekräftade (88,3 %), utan sträcka 11138
  2025-03 · 55–60: 438 av 49367 bekräftade (0,9 %), utan sträcka 2250
  2025-03 · 60–64: 9684 av 46273 bekräftade (20,9 %), utan sträcka 12235
  2025-03 · 64–69: 36660 av 50677 bekräftade (72,3 %), utan sträcka 10636
  totalt: 429913 av 1196207 bekräftade (35,9 %), utan sträcka 168977
== (a) kandidaten, [t − 1, t + 2] h
  2024-10 · 60–64: 0 av 42 bekräftade (0,0 %), utan sträcka 15 · basnivån 0 av 47 (0,0 %) · lyftet –
  2024-10 · 64–69: 0 av 87 bekräftade (0,0 %), utan sträcka 17 · basnivån 0 av 87 (0,0 %) · lyftet –
  2024-11 · 55–60: 3621 av 60656 bekräftade (6,0 %), utan sträcka 2940 · basnivån 3576 av 61180 (5,8 %) · lyftet 1,02
  2024-11 · 60–64: 23615 av 59854 bekräftade (39,5 %), utan sträcka 14081 · basnivån 23710 av 61456 (38,6 %) · lyftet 1,02
  2024-11 · 64–69: 35747 av 54756 bekräftade (65,3 %), utan sträcka 9541 · basnivån 35929 av 54948 (65,4 %) · lyftet 1,00
  2024-12 · 55–60: 5417 av 107816 bekräftade (5,0 %), utan sträcka 4874 · basnivån 5566 av 109850 (5,1 %) · lyftet 0,99
  2024-12 · 60–64: 54941 av 97569 bekräftade (56,3 %), utan sträcka 21213 · basnivån 54386 av 96683 (56,3 %) · lyftet 1,00
  2024-12 · 64–69: 50164 av 64314 bekräftade (78,0 %), utan sträcka 12529 · basnivån 48114 av 61590 (78,1 %) · lyftet 1,00
  2025-01 · 55–60: 16339 av 136932 bekräftade (11,9 %), utan sträcka 6702 · basnivån 16195 av 140753 (11,5 %) · lyftet 1,04
  2025-01 · 60–64: 52284 av 100618 bekräftade (52,0 %), utan sträcka 21424 · basnivån 51409 av 99536 (51,6 %) · lyftet 1,01
  2025-01 · 64–69: 52817 av 64162 bekräftade (82,3 %), utan sträcka 12276 · basnivån 49394 av 60406 (81,8 %) · lyftet 1,01
  2025-02 · 55–60: 2821 av 163969 bekräftade (1,7 %), utan sträcka 8030 · basnivån 2871 av 165068 (1,7 %) · lyftet 0,99
  2025-02 · 60–64: 43539 av 82952 bekräftade (52,5 %), utan sträcka 18113 · basnivån 43714 av 83606 (52,3 %) · lyftet 1,00
  2025-02 · 64–69: 49458 av 56099 bekräftade (88,2 %), utan sträcka 11221 · basnivån 48267 av 54680 (88,3 %) · lyftet 1,00
  2025-03 · 55–60: 411 av 45979 bekräftade (0,9 %), utan sträcka 2084 · basnivån 438 av 49367 (0,9 %) · lyftet 1,01
  2025-03 · 60–64: 9221 av 43409 bekräftade (21,2 %), utan sträcka 11516 · basnivån 9684 av 46273 (20,9 %) · lyftet 1,02
  2025-03 · 64–69: 37521 av 51449 bekräftade (72,9 %), utan sträcka 10241 · basnivån 36660 av 50677 (72,3 %) · lyftet 1,01
  totalt: 437916 av 1190663 bekräftade (36,8 %), utan sträcka 166817 · basnivån 429913 av 1196207 (35,9 %) · lyftet 1,02
== (b) basnivån: stationernas egna kalla timmar, [t, t + 6] h
  2024-10 · 60–64: 2 av 47 bekräftade (4,3 %), utan sträcka 17
  2024-10 · 64–69: 45 av 87 bekräftade (51,7 %), utan sträcka 16
  2024-11 · 55–60: 4419 av 61180 bekräftade (7,2 %), utan sträcka 2943
  2024-11 · 60–64: 25841 av 61456 bekräftade (42,0 %), utan sträcka 14610
  2024-11 · 64–69: 37881 av 54948 bekräftade (68,9 %), utan sträcka 9879
  2024-12 · 55–60: 6471 av 109850 bekräftade (5,9 %), utan sträcka 5101
  2024-12 · 60–64: 58178 av 96683 bekräftade (60,2 %), utan sträcka 20965
  2024-12 · 64–69: 49593 av 61590 bekräftade (80,5 %), utan sträcka 12359
  2025-01 · 55–60: 18178 av 140753 bekräftade (12,9 %), utan sträcka 7047
  2025-01 · 60–64: 54082 av 99536 bekräftade (54,3 %), utan sträcka 21309
  2025-01 · 64–69: 50691 av 60406 bekräftade (83,9 %), utan sträcka 11706
  2025-02 · 55–60: 3662 av 165068 bekräftade (2,2 %), utan sträcka 8279
  2025-02 · 60–64: 46023 av 83606 bekräftade (55,0 %), utan sträcka 18487
  2025-02 · 64–69: 49120 av 54680 bekräftade (89,8 %), utan sträcka 11138
  2025-03 · 55–60: 576 av 49367 bekräftade (1,2 %), utan sträcka 2250
  2025-03 · 60–64: 10674 av 46273 bekräftade (23,1 %), utan sträcka 12235
  2025-03 · 64–69: 38466 av 50677 bekräftade (75,9 %), utan sträcka 10636
  totalt: 453902 av 1196207 bekräftade (37,9 %), utan sträcka 168977
== (b) efterhalkan, [t, t + 6] h
  2024-11 · 55–60: 2 av 59 bekräftade (3,4 %), utan sträcka 7 · basnivån 4419 av 61180 (7,2 %) · lyftet 0,47
  2024-11 · 60–64: 1 av 44 bekräftade (2,3 %), utan sträcka 10 · basnivån 25841 av 61456 (42,0 %) · lyftet 0,05
  2024-11 · 64–69: 3 av 7 bekräftade (42,9 %), utan sträcka 5 · basnivån 37881 av 54948 (68,9 %) · lyftet 0,62
  2024-12 · 55–60: 2 av 354 bekräftade (0,6 %), utan sträcka 16 · basnivån 6471 av 109850 (5,9 %) · lyftet 0,10
  2024-12 · 60–64: 2 av 49 bekräftade (4,1 %), utan sträcka 3 · basnivån 58178 av 96683 (60,2 %) · lyftet 0,07
  2025-01 · 55–60: 2 av 283 bekräftade (0,7 %), utan sträcka 20 · basnivån 18178 av 140753 (12,9 %) · lyftet 0,05
  2025-01 · 60–64: 1 av 6 bekräftade (16,7 %), utan sträcka 0 · basnivån 54082 av 99536 (54,3 %) · lyftet 0,31
  2025-01 · utan läge: 0 av 0 bekräftade (– %), utan sträcka 1
  2025-02 · 55–60: 0 av 34 bekräftade (0,0 %), utan sträcka 2 · basnivån 3662 av 165068 (2,2 %) · lyftet 0,00
  2025-02 · 60–64: 4 av 7 bekräftade (57,1 %), utan sträcka 0 · basnivån 46023 av 83606 (55,0 %) · lyftet 1,04
  2025-02 · 64–69: 1 av 1 bekräftade (100,0 %), utan sträcka 0 · basnivån 49120 av 54680 (89,8 %) · lyftet 1,11
  2025-03 · 55–60: 0 av 89 bekräftade (0,0 %), utan sträcka 1 · basnivån 576 av 49367 (1,2 %) · lyftet 0,00
  2025-03 · 60–64: 16 av 63 bekräftade (25,4 %), utan sträcka 19 · basnivån 10674 av 46273 (23,1 %) · lyftet 1,10
  2025-03 · 64–69: 9 av 22 bekräftade (40,9 %), utan sträcka 8 · basnivån 38466 av 50677 (75,9 %) · lyftet 0,54
  totalt: 43 av 1018 bekräftade (4,2 %), utan sträcka 92 · basnivån 453902 av 1196207 (37,9 %) · lyftet 0,11
== (a) missarna: is-episoder utan kandidatens kalla timme 2 h före, orsaken ur närmaste stationens nederbörd ±1 h
  2024-11 · 55–60: 46 av 281 missade (16,4 %) · nederbördsdrivna 27 · utstrålningsdrivna 12 · okänd orsak 7
  2024-11 · 60–64: 63 av 664 missade (9,5 %) · nederbördsdrivna 20 · utstrålningsdrivna 42 · okänd orsak 1
  2024-11 · 64–69: 44 av 740 missade (5,9 %) · nederbördsdrivna 14 · utstrålningsdrivna 28 · okänd orsak 2
  2024-12 · 55–60: 94 av 441 missade (21,3 %) · nederbördsdrivna 28 · utstrålningsdrivna 54 · okänd orsak 12
  2024-12 · 60–64: 34 av 1169 missade (2,9 %) · nederbördsdrivna 5 · utstrålningsdrivna 27 · okänd orsak 2
  2024-12 · 64–69: 2 av 522 missade (0,4 %) · nederbördsdrivna 1 · utstrålningsdrivna 0 · okänd orsak 1
  2025-01 · 55–60: 85 av 720 missade (11,8 %) · nederbördsdrivna 33 · utstrålningsdrivna 40 · okänd orsak 12
  2025-01 · 60–64: 20 av 851 missade (2,4 %) · nederbördsdrivna 4 · utstrålningsdrivna 15 · okänd orsak 1
  2025-01 · 64–69: 0 av 463 missade (0,0 %) · nederbördsdrivna 0 · utstrålningsdrivna 0 · okänd orsak 0
  2025-02 · 55–60: 8 av 231 missade (3,5 %) · nederbördsdrivna 0 · utstrålningsdrivna 8 · okänd orsak 0
  2025-02 · 60–64: 34 av 790 missade (4,3 %) · nederbördsdrivna 10 · utstrålningsdrivna 22 · okänd orsak 2
  2025-02 · 64–69: 10 av 299 missade (3,3 %) · nederbördsdrivna 3 · utstrålningsdrivna 7 · okänd orsak 0
  2025-03 · 55–60: 15 av 66 missade (22,7 %) · nederbördsdrivna 8 · utstrålningsdrivna 3 · okänd orsak 4
  2025-03 · 60–64: 68 av 347 missade (19,6 %) · nederbördsdrivna 25 · utstrålningsdrivna 39 · okänd orsak 4
  2025-03 · 64–69: 45 av 719 missade (6,3 %) · nederbördsdrivna 16 · utstrålningsdrivna 26 · okänd orsak 3
  totalt: 568 av 8303 missade (6,8 %) · nederbördsdrivna 194 · utstrålningsdrivna 323 · okänd orsak 51; 1953 episoder på sträckor utan kandidatens station
== (a) hela regeln vid kandidatens kalla timmar (driftens sql/058, vid timmens slut)
  2024-10 · 60–64: varnar 1 · veto 0 · torr 56 · spridning 0
  2024-10 · 64–69: varnar 0 · veto 0 · torr 104 · spridning 0
  2024-11 · 55–60: varnar 10178 · veto 202 · torr 47598 · spridning 5618
  2024-11 · 60–64: varnar 11300 · veto 223 · torr 54723 · spridning 7689
  2024-11 · 64–69: varnar 6195 · veto 22 · torr 54264 · spridning 3816
  2024-12 · 55–60: varnar 41773 · veto 174 · torr 54146 · spridning 16597
  2024-12 · 60–64: varnar 17893 · veto 134 · torr 89101 · spridning 11654
  2024-12 · 64–69: varnar 3186 · veto 5 · torr 71013 · spridning 2639
  2025-01 · 55–60: varnar 54992 · veto 123 · torr 71181 · spridning 17338
  2025-01 · 60–64: varnar 18468 · veto 167 · torr 94628 · spridning 8779
  2025-01 · 64–69: varnar 2693 · veto 10 · torr 71494 · spridning 2241
  2025-02 · 55–60: varnar 30669 · veto 2166 · torr 129290 · spridning 9874
  2025-02 · 60–64: varnar 10341 · veto 265 · torr 82094 · spridning 8365
  2025-02 · 64–69: varnar 3954 · veto 27 · torr 60511 · spridning 2828
  2025-03 · 55–60: varnar 6230 · veto 1091 · torr 39281 · spridning 1461
  2025-03 · 60–64: varnar 5129 · veto 564 · torr 47142 · spridning 2090
  2025-03 · 64–69: varnar 4141 · veto 420 · torr 54950 · spridning 2179
  totalt: varnar 227143 · veto 5593 · torr 1021576 · spridning 103168
== (a) hela regeln, de varnande timmarna, [t − 1, t + 2] h
  2024-10 · 60–64: 0 av 1 bekräftade (0,0 %), utan sträcka 0 · basnivån 0 av 47 (0,0 %) · lyftet –
  2024-11 · 55–60: 594 av 10178 bekräftade (5,8 %), utan sträcka 0 · basnivån 3576 av 61180 (5,8 %) · lyftet 1,00
  2024-11 · 60–64: 2558 av 11300 bekräftade (22,6 %), utan sträcka 0 · basnivån 23710 av 61456 (38,6 %) · lyftet 0,59
  2024-11 · 64–69: 3400 av 6195 bekräftade (54,9 %), utan sträcka 0 · basnivån 35929 av 54948 (65,4 %) · lyftet 0,84
  2024-12 · 55–60: 1528 av 41773 bekräftade (3,7 %), utan sträcka 0 · basnivån 5566 av 109850 (5,1 %) · lyftet 0,72
  2024-12 · 60–64: 5399 av 17893 bekräftade (30,2 %), utan sträcka 0 · basnivån 54386 av 96683 (56,3 %) · lyftet 0,54
  2024-12 · 64–69: 2118 av 3186 bekräftade (66,5 %), utan sträcka 0 · basnivån 48114 av 61590 (78,1 %) · lyftet 0,85
  2025-01 · 55–60: 3235 av 54992 bekräftade (5,9 %), utan sträcka 0 · basnivån 16195 av 140753 (11,5 %) · lyftet 0,51
  2025-01 · 60–64: 3451 av 18468 bekräftade (18,7 %), utan sträcka 0 · basnivån 51409 av 99536 (51,6 %) · lyftet 0,36
  2025-01 · 64–69: 2029 av 2693 bekräftade (75,3 %), utan sträcka 0 · basnivån 49394 av 60406 (81,8 %) · lyftet 0,92
  2025-02 · 55–60: 618 av 30669 bekräftade (2,0 %), utan sträcka 0 · basnivån 2871 av 165068 (1,7 %) · lyftet 1,16
  2025-02 · 60–64: 2498 av 10341 bekräftade (24,2 %), utan sträcka 0 · basnivån 43714 av 83606 (52,3 %) · lyftet 0,46
  2025-02 · 64–69: 2886 av 3954 bekräftade (73,0 %), utan sträcka 0 · basnivån 48267 av 54680 (88,3 %) · lyftet 0,83
  2025-03 · 55–60: 172 av 6230 bekräftade (2,8 %), utan sträcka 0 · basnivån 438 av 49367 (0,9 %) · lyftet 3,11
  2025-03 · 60–64: 1002 av 5129 bekräftade (19,5 %), utan sträcka 0 · basnivån 9684 av 46273 (20,9 %) · lyftet 0,93
  2025-03 · 64–69: 2064 av 4141 bekräftade (49,8 %), utan sträcka 0 · basnivån 36660 av 50677 (72,3 %) · lyftet 0,69
  totalt: 33552 av 227143 bekräftade (14,8 %), utan sträcka 0 · basnivån 429913 av 1196207 (35,9 %) · lyftet 0,41
== (a) missarna för hela regeln: is-episoder utan en varnande timme 2 h före
  2024-11 · 55–60: 206 av 281 missade (73,3 %) · nederbördsdrivna 80 · utstrålningsdrivna 94 · okänd orsak 32
  2024-11 · 60–64: 449 av 664 missade (67,6 %) · nederbördsdrivna 137 · utstrålningsdrivna 291 · okänd orsak 21
  2024-11 · 64–69: 581 av 740 missade (78,5 %) · nederbördsdrivna 218 · utstrålningsdrivna 350 · okänd orsak 13
  2024-12 · 55–60: 252 av 441 missade (57,1 %) · nederbördsdrivna 58 · utstrålningsdrivna 164 · okänd orsak 30
  2024-12 · 60–64: 825 av 1169 missade (70,6 %) · nederbördsdrivna 196 · utstrålningsdrivna 586 · okänd orsak 43
  2024-12 · 64–69: 480 av 522 missade (92,0 %) · nederbördsdrivna 251 · utstrålningsdrivna 199 · okänd orsak 30
  2025-01 · 55–60: 421 av 720 missade (58,5 %) · nederbördsdrivna 96 · utstrålningsdrivna 261 · okänd orsak 64
  2025-01 · 60–64: 642 av 851 missade (75,4 %) · nederbördsdrivna 219 · utstrålningsdrivna 396 · okänd orsak 27
  2025-01 · 64–69: 424 av 463 missade (91,6 %) · nederbördsdrivna 211 · utstrålningsdrivna 187 · okänd orsak 26
  2025-02 · 55–60: 127 av 231 missade (55,0 %) · nederbördsdrivna 39 · utstrålningsdrivna 72 · okänd orsak 16
  2025-02 · 60–64: 598 av 790 missade (75,7 %) · nederbördsdrivna 189 · utstrålningsdrivna 370 · okänd orsak 39
  2025-02 · 64–69: 251 av 299 missade (83,9 %) · nederbördsdrivna 89 · utstrålningsdrivna 152 · okänd orsak 10
  2025-03 · 55–60: 42 av 66 missade (63,6 %) · nederbördsdrivna 22 · utstrålningsdrivna 11 · okänd orsak 9
  2025-03 · 60–64: 270 av 347 missade (77,8 %) · nederbördsdrivna 62 · utstrålningsdrivna 193 · okänd orsak 15
  2025-03 · 64–69: 569 av 719 missade (79,1 %) · nederbördsdrivna 148 · utstrålningsdrivna 387 · okänd orsak 34
  totalt: 6137 av 8303 missade (73,9 %) · nederbördsdrivna 2015 · utstrålningsdrivna 3713 · okänd orsak 409; 1953 episoder på sträckor utan kandidatens station
== (c) åtgärderna vid (a) kandidaten: planerad halkbekämpning (20, 50) på stationens sträckor inom ±6 h; 31256 åtgärdsrader av annan typ, utan tid eller före perioden
  2024-10 · 60–64: 9 av 42 (21,4 %)
  2024-10 · 64–69: 3 av 87 (3,4 %)
  2024-11 · 55–60: 28323 av 60656 (46,7 %)
  2024-11 · 60–64: 25723 av 59854 (43,0 %)
  2024-11 · 64–69: 8863 av 54756 (16,2 %)
  2024-12 · 55–60: 70691 av 107816 (65,6 %)
  2024-12 · 60–64: 44847 av 97569 (46,0 %)
  2024-12 · 64–69: 6258 av 64314 (9,7 %)
  2025-01 · 55–60: 92263 av 136932 (67,4 %)
  2025-01 · 60–64: 41953 av 100618 (41,7 %)
  2025-01 · 64–69: 5138 av 64162 (8,0 %)
  2025-02 · 55–60: 68501 av 163969 (41,8 %)
  2025-02 · 60–64: 23852 av 82952 (28,8 %)
  2025-02 · 64–69: 5661 av 56099 (10,1 %)
  2025-03 · 55–60: 11366 av 45979 (24,7 %)
  2025-03 · 60–64: 8217 av 43409 (18,9 %)
  2025-03 · 64–69: 3493 av 51449 (6,8 %)
  totalt: 445161 av 1190663 (37,4 %)
== (c) åtgärderna vid (a) hela regeln: planerad halkbekämpning (20, 50) på stationens sträckor inom ±6 h; 31256 åtgärdsrader av annan typ, utan tid eller före perioden
  2024-10 · 60–64: 0 av 1 (0,0 %)
  2024-11 · 55–60: 7942 av 10178 (78,0 %)
  2024-11 · 60–64: 6791 av 11300 (60,1 %)
  2024-11 · 64–69: 1963 av 6195 (31,7 %)
  2024-12 · 55–60: 33125 av 41773 (79,3 %)
  2024-12 · 60–64: 12741 av 17893 (71,2 %)
  2024-12 · 64–69: 868 av 3186 (27,2 %)
  2025-01 · 55–60: 45972 av 54992 (83,6 %)
  2025-01 · 60–64: 13326 av 18468 (72,2 %)
  2025-01 · 64–69: 692 av 2693 (25,7 %)
  2025-02 · 55–60: 24288 av 30669 (79,2 %)
  2025-02 · 60–64: 6340 av 10341 (61,3 %)
  2025-02 · 64–69: 1367 av 3954 (34,6 %)
  2025-03 · 55–60: 4842 av 6230 (77,7 %)
  2025-03 · 60–64: 2676 av 5129 (52,2 %)
  2025-03 · 64–69: 1160 av 4141 (28,0 %)
  totalt: 164093 av 227143 (72,2 %)
== (c) åtgärderna vid (b) efterhalkan: planerad halkbekämpning (20, 50) på stationens sträckor inom ±6 h; 31256 åtgärdsrader av annan typ, utan tid eller före perioden
  2024-11 · 55–60: 28 av 59 (47,5 %)
  2024-11 · 60–64: 12 av 44 (27,3 %)
  2024-11 · 64–69: 2 av 7 (28,6 %)
  2024-12 · 55–60: 261 av 354 (73,7 %)
  2024-12 · 60–64: 42 av 49 (85,7 %)
  2025-01 · 55–60: 207 av 283 (73,1 %)
  2025-01 · 60–64: 5 av 6 (83,3 %)
  2025-02 · 55–60: 6 av 34 (17,6 %)
  2025-02 · 60–64: 2 av 7 (28,6 %)
  2025-02 · 64–69: 1 av 1 (100,0 %)
  2025-03 · 55–60: 50 av 89 (56,2 %)
  2025-03 · 60–64: 15 av 63 (23,8 %)
  2025-03 · 64–69: 7 av 22 (31,8 %)
  totalt: 638 av 1018 (62,7 %)
```
