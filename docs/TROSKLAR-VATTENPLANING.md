# Trösklarna för vattenplaningsvarningen — höstens måttstock

**Datum: 2026-09-04. VÄRDENA FÄLLDA AV BENGT 4/9** ("låt värdena stå" i chatten, efter
genomgång av grindarna och de fyra öppna punkterna). **Axels fastställande (ägarbeslut —
domen i nov/dec avgör vad rösten får säga) återstår; till dess kan han justera vilket
värde som helst utan att ändringsregeln i §5 slår in.**
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

### 3.4 Radarns roll — villkorad av kort #43

Radarpiloten döms 14/9. Två utfall, båda förberedda:

- **Radardomen håller** (kalibreringen mot `rain_sum_mm` visar användbar överensstämmelse):
  radar får bli **utlösare mellan stationerna**, med kalibreringsfaktorn från cellmätning v3
  inskriven här som en ändring enligt §5. Då mildras avståndsberoendet i V-A3.
- **Radardomen faller eller dröjer:** varningen bygger enbart på stationer, och V-A3:s
  avståndsgräns gäller strikt — segment längre än 15 km från mätande station får status
  **okänt** och rösten tiger där. Det är inte ett misslyckande utan produktinvarianten
  i arbete.

Radar får i inget av fallen **fälla falsklarm** förrän dess kalibrering är dömd (§2).

## 4. Vinterinteraktionen — Axels beslut (granskningens §7.4)

Snöslask kan trigga både halk- och vattenplaningsvarning på samma segment samma minut.
Alarmdisciplinen (max 1 talad varning/45 s, prioritet A3>A1>A2>A4>A5, lägre släpps —
köas aldrig) betyder att **en av dem tystnar**. Vem?

**Claudes rekommendation, för Axel att fastställa:** halkvarningen vinner alltid.
Is och slask dödar; vattenplaning på slask är dessutom fysikaliskt samma händelse och
föraren behöver en åtgärd, inte två. Konkret förslag:

- Vattenplaningsvarningen **vilar helt** när yttemperaturen på segmentet är ≤ +4 °C,
  oavsett regnintensitet. Under den gränsen är halkmotorn rätt vakt.
- Vattenplaningen placeras i A-skalan **under** halkvarningen.

*Alternativ som valdes bort:* låta båda tala i tur och ordning (bryter 45-sekundersregeln
och gör rösten till en radiopratare), eller slå ihop dem till en fras (överdriver vad
datat bär — vi vet inte vilken risken är).

## 5. Ändringsregler

Efter första skuggkörningen får detta dokument bara ändras genom en DECISIONS-post
undertecknad av **både** Axel och Bengt. Skärpning kräver en rad; **lättnad kräver dessutom
skriftlig motivering som inte hänvisar till höstens uppmätta siffror** — det är hela poängen
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

**Kvar innan kod:** Axels fastställande, plus hans beslut om vinterinteraktionen (§4).
