# Tystnadsfelet (#98) — bedömning av klassningen i §3, och förslag som gör den mätbar

*24/9 2026, på Bengts *"vi gör 98 först. Vilken är din bedömning av klassningen"*. Underlag: docs/TROSKLAR-TYSTNADSFEL.md
(fastställt 11/9), TROSKLAR-RIMFROST §2 (kondensationsvillkoret och partitionen mot #98), TROSKLAR-OVERGANGAR §2 (N-svepet),
TROSKLAR-TRENDEN §2 (lutningssvepet), DECISIONS #222 (betans startvärden), TROSKLAR-SKUGGAN §2 (facitfönstren),
publish/grind-s-b.ts (händelsekopplingen 23/9), engine/src/engine.ts:217 (frysriskregeln), sql/017 (trendkandidaterna).*

## 1. Slutsats

Klassningen är rätt tänkt och fel skriven. Rätt: den har riktning (bara missar med signal kan lagas med en tröskel) och ett
räckviddsvillkor som håller täckningshålen utanför. Fel: ingen av de fyra signalerna är ett tal, "ursäktlig" definieras av
data vi inte har, och en tyst miss kan bero på fyra olika trösklar som ger fyra olika priskurvor. Som §3 står i dag blir
klassningen en bedömning per händelse — och att sätta talen efter att händelserna setts är den lättnad huset förbjuder.
Talen ska in nu, före första frosten, lånade ur dokument som redan är fastställda.

## 2. Vad som är bra och ska stå kvar

- Måttet räknar tystnadens fel, inte larmens träff (§1–§2). Det är den fråga ingen annan grind ställer.
- Riktningen (§3): oursäktlig = signal fanns. Bara den delen kan en tröskel laga.
- Räckviddsvillkoret (§6): en miss räknas bara där systemet hade en chans.
- "Okänt" är ett giltigt utfall (§9).
- Facit är samma stack som marsdomen (§8) — och sedan 23/9 finns händelsekopplingen byggd i `publish/grind-s-b.ts`:
  SMHI, olycksarkivet, operatörens väglag, förarens *stämde* och kamerafacit inom 2 km av skuggrutterna. #98 läser samma lista.

## 3. Vad som saknas — fyra saker

**3.1 Signalerna har inga tal.** "Gapet slöt sig", "pekade mot noll", "visade risk", "regnade inom N" — varje ord kan
läsas på flera sätt. Förslag, med källa för varje tal (inget nytt tal uppfinns):

| Signal | Mätbar definition | Talet kommer ur | Finns i arkivet? |
| :-- | :-- | :-- | :-- |
| **Kondensation** | yta − daggpunkt ≤ 0 vid en station inom räckvidd, någon gång de 2 h före händelsen | TROSKLAR-RIMFROST §2 (kondensationsvillkoret) | ja, `dewpoint_c` i `weather_observations` (SE) |
| **Trend mot noll** | lutning30 ≥ 0,8 °C/fönster och yta ≤ +3 °C, och yta − 4 × lutning30 ≤ 1 °C (når frysgränsen inom 2 h) | betans startvärden D2 (DECISIONS #222), TROSKLAR-TRENDEN §2:s svep | `trend_kandidater` — men bara sju dygn (gallringen), så den räknas i samma varv som händelsen kommer, aldrig i efterhand |
| **Station visade risk** | en station inom räckvidd uppfyllde motorns egen regel: yta ≤ 1 °C (bro 3) och fukt | engine.ts:217, DECISIONS #4 | ja |
| **Regn nyss** | regn eller snö vid närmaste station inom N h, N ur Ö-B:s svep; per N tills Ö-B dömt | TROSKLAR-OVERGANGAR §2 | ja, `rain`/`snow` |

**3.2 En tyst miss har fyra möjliga orsaker, inte en.** Signalen säger också *vilken* tröskel som teg:

| Signal fanns | Tröskeln som teg | Vad en "sänkning" betyder |
| :-- | :-- | :-- |
| Kondensation | fuktvillkoret / rimfrostgrenen (#46) | inte lägre yttröskel — en ny gren |
| Trend mot noll | tidsvillkoret (#88, T-A) | inte lägre yttröskel — trenden in i motorn |
| Station visade risk men händelsen låg längre bort | avståndet (räckvidden) | vidare räckvidd, oförändrad temperatur |
| Regn nyss | fuktvillkoret (#89 efterhalkan) | fuktdefinitionen, inte temperaturen |
| Station nära, yta 1–3 °C, fukt, ingen av de ovan | yttröskeln | här, och bara här, betyder "sänk tröskeln" 1 → 1,5 → 2 °C |

Utan orsakskolumnen ritar §5 en priskurva "mot tröskeln" utan att säga vilken. Med den blir §7:s mening fem meningar,
en per orsak, och tre av dem är redan andra korts uppgift. Det är inte en svaghet i #98 — det är dess värde: den säger
vilket kort vintern ska betala.

**3.3 "Ursäktlig" är definierad av data vi inte har.** Saltbilen syns i ingen källa; kommunal gata utan givare utesluts
redan av §6 och ska inte klassas alls; bara snöbyn går att bevisa (radararkivet visar nederbörd i cellen medan
stationerna inte gör det). Två klasser gör att allt utan signal blir "ursäktligt" — och då summerar §4:s par till 100 %
på en lögn. Förslag: **tre klasser.** *Oursäktlig* (signal i data, 3.1). *Ursäktlig* (bevisad yttre orsak: radar-nederbörd
i cellen utan stationsregn inom ±1 h). *Okänd* (ingen signal, ingen bevisad orsak — saltbilen bor här). §9 tillåter det
redan; §4 ska räkna tre andelar.

**3.4 Räckvidden och fönstren har inga tal, och underlagsvakt saknas.** Förslag: räckvidd = **7 km** till närmaste vaktad
station (grind A:s skarpaste band; "nära en VViS-station" i §6); tyst = inget larm av slaget frysrisk eller halt väglag
inom 2 km av händelsen de 2 h före (samma fönster som TROSKLAR-SKUGGAN §2, så att #98 och grind S-B räknar samma
händelser); facitradie 2 km. **Underlag:** paret i §4 läses först vid ≥ 20 bekräftade händelser inom räckvidd över ≥ 3
halkperioder (samma golv som C1) — dokumentet är det enda tröskeldokumentet utan underlagsvakt.

## 4. Priset (§5) går att räkna med det som finns

Uppspelningen (`sql/028`, varianten *utan faller*) kör frysriskregeln över arkivet med valfri tröskel. Svep för
yttröskeln: 1,0 · 1,5 · 2,0 · 2,5 °C. Nya falsklarm = uppspelade larm vid kandidattröskeln där en station inom 2 km mätte
> +2 °C inom ±45 min (§2 i TROSKLAR-SKUGGAN), och kamerabilder bar väg får bekräfta men aldrig fälla. "50 %-nivån" i §5
är odefinierad — stryk orden, svepet är gränsen.

## 5. Blindningen

§8 säger att måttet kan börja räknas i höst. Antalen (händelser, tysta, per orsak) får läsas löpande — de är underlag.
Paret i §4 och priskurvan i §5 läses vid utsatt tid, som alla skuggmått. Samma två lägen som grind S-B.

## 6. Vad som INTE ändras

Måttet (§1–§2), räckviddsvillkoret som princip (§6), facitstacken (§8), husreglerna (§9). Ingen kod förrän Bengts rad
(dokumentet är fastställt och kontrasignerat; talen ovan är en skärpning — de gör dokumentet mätbart, de flyttar ingen
gräns).

## 7. Bygget — RÄTTELSE 24/9 (DECISIONS #330)

**Instrumentet fanns redan:** `scripts/tystnadsfelet.ts` (14/9, PR #236) med signalerna, okänt-utfallet och underlagsvakten.
Den här bedömningen missade det. Förslaget fördes in i det befintliga skriptet samma dag: talen, tre klasser med bevisad
orsak, orsakskolumnen, räckvidd 7 km, flottans kadens för "tyst", fukten i riskvillkoret, den delade händelselistan
(`publish/skuggfacit.ts`), två lägen och priset som tillkomna tillfällen. Antaget av Bengt 24/9.
