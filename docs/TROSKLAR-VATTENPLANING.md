# Trösklarna för vattenplaningsvarningen — höstens måttstock

**Datum: 2026-09-04. VÄRDENA FÄLLDA AV BENGT 4/9** ("låt värdena stå" i chatten, efter
genomgång av grindarna och de fyra öppna punkterna). **FASTSTÄLLT AV AXEL 4/9** (ägarbeslut — domen i
nov/dec avgör vad rösten får säga; "Axel fastställer och följer din rekommendation",
relayerat av Bengt i chatten, bekräftas genom att kortet bockas på tavlan;
DECISIONS #68). Från och med första skuggkörningen gäller ändringsregeln i §5 fullt ut.
(Körschemat §8 steg 2 i `docs/VATTENPLANING-ANALYS.md`.) Dokumentet ska ligga i repot
**FÖRE all kod**, samma hårda villkor som DECISIONS #51 gav skuggmotorn. Domen i
november/december fälls mot värdena nedan — ingen flyttar målstolparna när siffrorna kommit.

**Frågan dokumentet besvarar:** vilken träffsäkerhet, falsklarmsandel och missandel krävs
för att en vattenplaningsvarning ska **få tala** till användare?

**Vad som INTE står här (DECISIONS #65/#66):** ingen spårdjupströskel. Mätt spårdjup finns
inte i öppna API:et och kräver Lastkajen-konto; att gissa ett värde (8 mm? 12 mm?) vore
precis vad tröskeldokument finns för att förhindra. Trafikproxyn (AADT, tung trafik,
beläggningsålder, vägbredd) prövas som **analyskolumn** i steg 4b — den får förklara
utfall, aldrig utlösa en varning, förrän dess nytta är mätt och en tröskel förts in här
med dubbelsignatur enligt §5.

---

## 1. Vad som döms

Påståendet **"risk för vattenplaning framöver"**, byggt på tre led:

1. **Regnintensitet** från VViS `rain_sum_mm` (30-min-summa; 658 stationer med
   mängdgivare, 89 % täckning — mätt i regn-bevis #1/#3).
2. **Avstånd till närmaste mätande station** — cellmätningen (DECISIONS-underlag,
   cell-matning #2, 84 341 händelser) visade att regn dekorrelerar snabbt: 26 %
   diskordans redan vid 0–5 km, 41 % vid 10–15 km, 60 % vid 30–50 km.
3. **Fart på enheten** — motorn har redan `minSpeedKmh` med delade testvektorer.
   Ingen position lämnar telefonen; produktinvarianten orörd.

**Punktkälla ⇒ punktspråk.** Rösten säger "framöver", aldrig ett avstånd datat inte bär.
Det är samma regel som gäller väderstationer i dag och den är inte förhandlingsbar.

## 2. Vad som räknas som facit — och asymmetriregeln

Granskningens §7.3: **"regn utan olycka" är INTE falsklarm.** En korrekt riskvarning följs
oftast av att ingenting händer — det är meningen med den. Därför är facittabellen asymmetrisk,
precis som kamerabilder är i skuggmotorns §2:

| Källa | Får bekräfta träff | Får fälla falsklarm | Anm |
|---|---|---|---|
| Stationens egen `rain_sum_mm` på segmentet | ja | **ja** | den enda källa som får fälla: visar i efterhand att tröskeln aldrig nåddes |
| Väglagskamerabild med torr vägbana | ja | **ja** | torr väg i bild motbevisar stående vatten — motsatsen till svartisfallet |
| `situation_archive`-olycka i regnväder | ja | nej | frånvaro av olycka ≠ frånvaro av risk |
| Trafikverkets RoadCondition (operatörsbedömt) | ja | nej | oberoende av vår indata |
| Testarlogg (förare + tid + plats) | ja | ja | mänskligt vittne väger tyngst |
| Radar (`radar_precip`) | ja | nej *(villkorat, se §3.4)* | observation, inte facit, tills kalibreringen dömts |

**Falsklarm** = varning där stationen på segmentet i efterhand visar att regntröskeln
aldrig nåddes inom ±30 min, eller där en kamerabild/testarlogg visar torr vägbana.
**Miss** = facitbekräftad vattenplaningshändelse (olycka i regn, testarlogg) på ett
segment där ingen varning gick ut under 30 min före händelsen.

## 3. Trösklarna

### Grind V-A — går påståendet alls att göra? (mätbart NU, före all skuggkod)

LOO-prövning mot arkivet: prognostisera regnintensiteten vid varje station ur grannarna,
stationen aldrig med i sin egen prognos. Samma metod som grind A, samma domspärr.

| # | Mått | Fällt värde (Bengt 4/9) |
|---|---|---|
| V-A1 | Träffsäkerhet: andel fall där grannarna säger "över tröskel" och stationen håller med | **≥ 70 %** inom 0–10 km |
| V-A2 | Falsklarmsandel i prövningen: grannarna säger regn, stationen torr | **≤ 25 %** inom 0–10 km |
| V-A3 | Bortom 15 km redovisas separat och får **inte** räknas in i godkännandet | — |

*Motivering till 0–10 km:* cellmätningen visade 26–36 % diskordans redan där. Att kräva
bättre än så vore att kräva mer än fysiken tillåter; att tillåta sämre vore att lova något
vi inte kan hålla. **Faller V-A är svaret ett dokumenterat nej** — och vi har ändå
regnarkivet, som är husets billigaste utfall.

### Grind V-B — skuggdriften (höstregnen, dom i nov/dec)

| # | Mått | Fällt värde (Bengt 4/9) |
|---|---|---|
| V-B1 | Falsklarmsandel enligt §2:s definition | **≤ 20 %** av utfärdade skuggvarningar |
| V-B2 | Missandel av facitbekräftade händelser | **≤ 40 %** |
| V-B3 | Varningsfrekvens: skuggvarningar per rutt och regndygn | **≤ 3** — fler är brus, och tystnad är en funktion |

*Varför V-B2 är slappare än V-B1:* en missad varning lämnar föraren i det läge hen
redan är i. Ett falsklarm lär föraren att ignorera rösten — och då dör även halkvarningen.
Asymmetrin är avsiktlig och samma som i skuggmotorn.

### Grind V-C — domens giltighet (utan C fälls ingen dom alls)

| # | Villkor | Fällt värde (Bengt 4/9) |
|---|---|---|
| V-C1 | Minsta underlag | **≥ 200** skuggvarningar och **≥ 15** facitbekräftade händelser |
| V-C2 | Minsta spridning | **≥ 5** regndygn och **≥ 3** län |
| V-C3 | Binomialbruset redovisas med varje andel | ±1,96·√(p(1−p)/N) |

**Binomialbruset, konkret:** vid N = 200 och p = 0,20 är osäkerheten ±5,5 procentenheter.
En uppmätt falsklarmsandel på 17 % kan alltså i sanning vara 22 %. Därför fäller vi ingen
dom på marginaler mindre än bruset — samma disciplin som grind A:s domspärr.

### 3.4 Radarns roll — AVGJORD 13/9 2026 (kort #43, DECISIONS #153)

Radardomen HÖLL, och Bengt valde beslutsläge **(c)**: radarn ger den intensitet stationerna
inte kan. Underlaget är cellmätning v3 i två oberoende fönster (12/9 03:37 och 13/9 01:07) och
grind V-A:s tredje fall. Radar är därmed **utlösare mellan stationerna**, och avståndsberoendet
i V-A3 mildras i motsvarande mån.

**Kalibreringsfaktorn — och FÄLTET den gäller.** Mätt som `radar rate_mean_mmh / stationens mm/h`
över 7 931 par med båda > 0:

| Fönster | Median | Par |
|---|---|---|
| 12/9 03:37, 7 dygn | 0,66 | 8 198 |
| 13/9 01:07, 7 dygn | **0,65** | 7 931 |

**Faktorn som gäller är 0,65, och den gäller `rate_mean_mmh`.** 1,0 skulle betyda att
Marshall–Palmer träffar exakt; 0,65 betyder att radarn läser ungefär två tredjedelar av vad
stationen mäter. **Riktningen, utskriven för att den annars blir omvänd en gång:** för att
uttrycka radarvärdet i stationens skala **divideras** det med 0,65, alltså ungefär × 1,54.
Att multiplicera med 0,65 halverar i stället för att dubbla. Grovheten är känd och accepterad:
en 5-minutersbild ställs mot en 30-minuterssumma.

**`rate_max_mmh` FÅR INTE bära tröskel eller utlösare** förrän värdevaktens spann 0–200 mm/h är
rensat. Fältet står som UTANFÖR SPANN sedan 727,54 mm/h hittades i det (DECISIONS #134) — en
radarartefakt, inte regn. Kalibreringen ovan är aldrig mätt på det fältet. Regeln finns eftersom
en faktor mätt på ett fält och använd på ett annat är precis den tysta drift kontraktsgrinden
byggdes för att fånga.

**Bekräftelsekurvan — underlaget för tröskeln, som ännu inte är satt.** Andel av paren där en
station ≤ 5 km såg regn inom ±45 min, per radarband (13/9, med 12/9 inom parentes):

| Radarband | Par | Station såg regn |
|---|---|---|
| 0,1–0,5 mm/h | 4 852 | 42 % (39) |
| 0,5–2 | 4 055 | 56 % (54) |
| 2–10 | 3 852 | 77 % (73) |
| ≥ 10 | 818 | 82 % (79) |

Kurvan stiger monotont med intensiteten i båda fönstren. Täckningen är 91 % (93): radarn hade en
rad ≤ 5 km vid 14 190 av 15 540 stationsregn.

**UTLÖSARTRÖSKELN — satt av Bengt 13/9 2026 ("Ja till 2"):**

| Storhet | Värde |
|---|---|
| Utlösare | `radar_precip.rate_mean_mmh` **≥ 2,0 mm/h** över segmentet |
| Motsvarar i stationens skala | 2,0 / 0,65 ≈ **3,1 mm/h** verklig intensitet |
| Bekräftelse i det bandet | **77 %** (73 % i föregående fönster) |

*Motivering, skriven med underlaget och inte ur det:* 2–10 mm/h är det LÄGSTA bandet där en station
inom 5 km håller med i en klar majoritet av fallen. Under det faller bekräftelsen till 56 och 42 %.
I stationens skala är 3,1 mm/h regn som lägger vatten på vägbanan i stället för att fukta den —
duggregn ger ingen vattenplaning, vilket är samma sakskäl som avvisade omskrivningen av V-A1 till
"regnar det alls" (DECISIONS #153).

Tröskeln gäller `rate_mean_mmh`, samma fält som kalibreringsfaktorn. `rate_max_mmh` är fortfarande
spärrat enligt regeln ovan.

**Signaturer på tröskeln enligt §5: Bengt 13/9 2026** ("Ja till 2") · **Axel 13/9 2026**
(relayerad av Bengt). **DUBBELSIGNATUREN ÄR FULLSTÄNDIG — tröskeln är FASTSTÄLLD.**

Därmed är hela §3.4 avgjord: faktorn, fältet, riktningen, spärren mot `rate_max_mmh` och tröskeln.
Ändring av något av dem kräver ny dubbelsignatur. Stegen C–F i kort #81 är öppna.

Radar får fortfarande i **inget** fall **fälla falsklarm** (§2 oförändrad) — den är observation,
inte facit.

**Signaturer enligt §5** (att lägga till en faktor kräver dubbelsignatur men inte motivering,
eftersom en ny faktor skärper underlaget): **Bengt 13/9 2026** ("Kör c") · **Axel 13/9 2026**
(relayerad av Bengt i chatten, samma väg som källbeslutet #60 och trösklarna #61).
**DUBBELSIGNATUREN ÄR FULLSTÄNDIG — kalibreringsfaktorn är FASTSTÄLLD** och kort #81 steg A är klart.

Kvar innan rösten kan säga något: **utlösartröskeln i mm/h** (nedan) och stegen B–F i kort #81.

## 4. Vinterinteraktionen — FASTSTÄLLD av Axel 4/9 (granskningens §7.4)

Snöslask kan trigga både halk- och vattenplaningsvarning på samma segment samma minut.
Alarmdisciplinen (max 1 talad varning/45 s, prioritet A3>A1>A2>A4>A5, lägre släpps —
köas aldrig) betyder att **en av dem tystnar**. Vem?

**AXELS BESLUT 4/9 (följer Claudes rekommendation): halkvarningen vinner alltid.**
Is och slask dödar; vattenplaning på slask är dessutom fysikaliskt samma händelse och
föraren behöver en åtgärd, inte två. Fastställt:

- Vattenplaningsvarningen **vilar helt** när yttemperaturen på segmentet är ≤ +4 °C,
  oavsett regnintensitet. Under den gränsen är halkmotorn rätt vakt.
- Vattenplaningen placeras i A-skalan **under** halkvarningen.

Konsekvens för koden: fartgrinden och regntröskeln prövas ALDRIG när yttemp ≤ +4 °C —
vilan är ett förvillkor, inte en prioritetsfråga i alarmkön. Det gör den testbar som
egen vektor i `engine/vectors/` när steg 5 byggs.

*Alternativ som valdes bort:* låta båda tala i tur och ordning (bryter 45-sekundersregeln
och gör rösten till en radiopratare), eller slå ihop dem till en fras (överdriver vad
datat bär — vi vet inte vilken risken är).

## 5. Ändringsregler

Efter första skuggkörningen får detta dokument bara ändras genom en DECISIONS-post
från Bengt, som äger mätningen. Skärpning kräver en rad; **lättnad är utesluten
så snart utfallet är sett** — skriftlig motivering som inte hänvisar till höstens uppmätta siffror** — det är hela poängen
med att dokumentet är daterat före första körningen.

Att **lägga till** en faktor (spårdjup från steg 4c, radar från §3.4) räknas som ändring och
kräver samma dubbelsignatur — men får ske utan motiveringskravet, eftersom en ny faktor
skärper underlaget i stället för att lätta på kraven.

## 6. Mätansvar

Claude räknar (grind V-A som knapp med domspärr, skuggkolumnen buntad ur `engine/src` som
allt annat — DECISIONS #43/#51). Bengt läser skuggloggen i söndagsrutinen och klassar
facit. Axel fäller domen mot värdena ovan.

**De fyra öppna punkterna — avgjorda av Bengt 4/9:**
1. **V-A1/V-A2 står** på 70 % / 25 % inom 0–10 km. Cellmätningens kurva motiverar dem;
   att kräva mer vore att kräva mer än fysiken tillåter.
2. **V-B1/V-B2 står** på 20 % falsklarm / 40 % miss, med asymmetrin motiverad i §3.
3. **V-B3 står** på 3 varningar per rutt och regndygn.
4. **Regntröskeln i mm/h förblir osatt** — den ska falla ur grind V-A:s mätning, inte
   gissas. Samma disciplin som höll spårdjupet utanför (#65/#66).

**Kvar innan kod: INGENTING.** Axel fastställde 4/9 och avgjorde vinterinteraktionen
enligt §4. Steg 3 (grind V-A) är därmed olåst — dokumentet låg i repot före koden,
precis som #51 kräver.
