# TROSKLAR-VAGLAGETS-ALDER

**Kort:** #151 VÄGLAGETS ÅLDER — ska en stående vinterklassning tystas när mätningarna säger
att vintern tagit slut på just den vägen? **Status:** ✅ **FASTSTÄLLT 2026-09-12 av Bengt**
(DECISIONS #152). Svepet i §4 och kraven i §5 är låsta enligt §8:s regim — skrivna INNAN någon
mätning gjorts, och ingen siffra i dem kommer ur ett utfall.

**Varifrån kortet kommer.** Jag flaggade att `road_conditions` saknar den åldersgräns som
väderpunkterna har, och antog underförstått att den skulle läggas till. Axel mätte i stället, och
mätningen upphävde mitt antagande:

> *"En hård åldersgräns på segmenten är fel lösning. Väderpunkternas tretimmarsgräns fungerar för
> att en station mäter kontinuerligt — en gammal mätning betyder trasig givare. En operatörsklassning
> står tills den ändras — en gammal klassning kan vara sann. Sätter vi 24 timmar tystar vi
> halkvarningen på en väg som varit halt i tre dygn."*

Han skiljer samtidigt ut vad som INTE hör hemma här: att respektera `end_time` är att lyda
operatörens eget ord, och en vakt som larmar när arkivet står stilla är en vakt. Båda är hans att
bygga. **Kvar blir en modell — och en modell kräver trösklar skrivna före mätningen.**

Husreglerna som gäller: tröskeldokument före kod · skuggkolumn före röst · tystnad är en funktion ·
trösklar gissas inte, de faller ur mätning · trösklarna är daterade FÖRE mätningen och skrivs inte
om när talen kommit (§8) · inget fält bär en tröskel förrän det passerat värdevakten.

---

## 1. Vad som döms — och vad som INTE döms

**Frågan är inte "är klassningen gammal?" utan "motsäger världen den?"**

Det är hela omformuleringen Axels mätning tvingar fram. Ålder är inte variabeln. En klassning från
i förrgår på en väg som fortfarande är hal är sann; en klassning från i morse på en väg där ytan
legat på +8 °C sedan gryningen är det inte. **Ålder är på sin höjd en förstärkning av en
motsägelse, aldrig en grund i sig.**

**Detta dokument rör bara A1 `slippery_segment`** — varningsslaget som kommer ur
`road_conditions`. Det rör inte A2 (`icing_point`, väderstationer, har redan sin tretimmarsgräns),
inte A3, A4 eller A5.

**Vad som INTE döms här, och som inte får smygas in:**

* **`end_time`-regeln.** Att filtrera bort det operatören själv avslutat är inte en modell, det är
  att läsa källan rätt. Den hör till motorn och är Axels. Den ska dock inte räknas som en åtgärd
  förrän Trafikverket faktiskt satt en EndTime en gång och vi sett den filtrera — i dag har inget
  segment fältet, och en klausul som aldrig prövats är ett tyst ALDRIG.
* **Stillaståendevakten.** En vakt som larmar när arkivet inte rör sig fastän stationerna säger
  vinter är en vakt, inte en modell. Den tystar ingenting och behöver inget tröskeldokument — men
  dess tal ska ändå stå skrivet innan den mäts.
* **Att tysta något utan motsägelse.** Ingen regel härifrån får någonsin tysta en klassning som
  operatören inte avslutat och som mätningarna inte motsäger. Tystnad är en funktion — men att
  tysta en SANN varning är inte tystnad, det är en miss. Det var skälet att dämpningen (#100)
  fälldes, och det skälet gäller oförändrat här.

---

## 2. Domänfaktan som gör frågan svår — och nollan som inte betyder noll

Axels mätning 12/9 2026, i sin helhet:

| Mätt | Värde |
| :-- | :-- |
| Segment i `road_conditions` | 818 |
| Segment med kod ≥ 2 eller vinterord | **0** |
| Exponering i snapshoten just nu | **noll** |
| Senaste ändring (`modified_time`) | 25 augusti |
| Äldsta `modified_time` | 21 februari |
| Segment med `end_time` | **0** |

**Slutsatsen:** Trafikverkets operatör skriver inte om ett segment när läget består — bara när det
ändras. Ett segment som klassas "Is och snö" i november och förblir halt hela vintern får ingen ny
stämpel.

**NOLLAN ÄR ETT UTSAGOLÖST NOLL, och det måste stå här.** Arkivet innehåller inga vinterord alls i
september. En mätning som inte KAN falsifiera hypotesen med det underlag som finns får aldrig
rapportera att hypotesen håller — det är läxan i DECISIONS #71, och det är precis vad kodgrindens
C-avsnitt vaktar med sin `vinterord`-räkning. Axel formulerar sig försiktigt ("gör ingen skada i
september"), men **talet noll kommer att citeras utan den brasklappen i november**. Det gör det
inte här.

**Mätningen ska köras om efter första vinterklassningen**, och den ska köras med
`scripts/kodgrinden.ts` — vars avsnitt D redan mäter exakt den här frågan (percentiler över
`lead(modified_time) − modified_time`, ⊘ under 30 övergångar). Knappen finns, den är repeterbar,
och den svarar av sig själv när vintern ger övergångar.

---

## 3. De tre möjliga reglerna, och vad var och en skulle tysta

| | Regel | Tystar | Missar |
| :-- | :-- | :-- | :-- |
| **R0** | Ingen regel — klassningen står tills operatören ändrar den (**nuläget**) | ingenting | ingenting |
| **R1** | Tysta när **ytan motsäger**: N ankarstationer har haft yttemperatur ≥ T °C i minst H timmar | bara det mätningen motsäger | en klassning som blivit falsk utan att ytan hunnit stiga |
| **R2** | Som R1, **plus** att klassningen är minst D dygn gammal | strikt mindre än R1 | allt R1 missar, plus färska falska klassningar |
| **R3** | ~~Hård åldersgräns: tysta efter D dygn oavsett mätning~~ | **en sann varning på en väg som varit hal i tre dygn** | — |

**R3 förkastas här, före mätning, och skälet är en invariant och inte ett tal.** Den kan tysta en
sann varning utan något som helst belägg för att den blivit falsk. Ingen mätning kan rädda den,
eftersom felet inte ligger i tröskeln utan i formen. Den står kvar i tabellen enbart för att någon
annars föreslår den igen — och nästa gång ska skälet redan finnas skrivet.

**R0 är förvalet.** Passerar varken R1 eller R2 grindarna i §5 blir svaret R0, och det är ett
fullgott svar. En regel som inte kan visas göra nytta ska inte byggas.

---

## 4. Parametrar som ska sättas — medvetet OSATTA

Talen nedan är **svep**, inte val. De sätts av mätningen i §5, inte av mig nu.

| Parameter | Betydelse | Svep |
| :-- | :-- | :-- |
| **T** | yttemperatur som räknas som motsägelse | 2 · 5 · 8 °C |
| **H** | hur länge den ska ha hållit | 2 · 3 · 6 h |
| **N** | antal ankarstationer som måste vara eniga | 1 · 3 |
| **R** | radie inom vilken en station är ankare | **50 km — ärvd, inte vald** |
| **D** | ålderskravet i R2 | 1 · 3 · 7 dygn |

**R ärvs från grind A:s ankarradie** (`MAX_KM = 50`) och sätts inte om. Den är ett vaktat kontrakt
i `scripts/kontraktsgrinden.ts`; att välja en egen radie här vore att skapa en andra sanning om vad
som är en granne.

**Ärvda vakter som inte är förhandlingsbara:**

* **#75:s givarvakt** gäller varje stationsavläsning som används här:
  `air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12`. 61 % av arkivets frostrader
  faller på den.
* **Vaktdiagnosen (#141)** körs före allt annat: en nolla får aldrig vara tvetydig mellan "fältet
  saknas", "vakten fäller allt" och "arkivet är tomt".
* **Marginalvakten (#126/#128)** gäller varje utfall: hamnar det inom ±1,96 SE av tröskeln är
  domen OAVGJORT.
* **Värdevakten (#133).** Inget fält som används här bär en tröskel förrän det passerat
  `scripts/vardevakten.ts`. Det gäller särskilt `condition_code` och `condition_info`, som ingen
  ännu besiktigat.

---

## 5. Grindarna

### Å-A — Finns problemet, och skulle regeln ha rätt? (mätbar först när vintern gett klassningar)

| # | Krav | Tröskel |
| :-- | :-- | :-- |
| **Å-A1** | **Täckning.** Andel vinterklassningar som har minst N ankarstationer inom R | ≥ 70 % |
| **Å-A2** | **Inträffar tillståndet alls?** Andel vinterklassningar som någon gång under sin livstid motsägs enligt R1 | ≥ 5 % |
| **Å-A3** | **Sanningshalten.** Av de tillfällen regeln skulle ha tystat: hur ofta BEHÖLL operatören ändå vinterklassningen efteråt? | ≤ 10 % |
| **Å-A4** | **Underlagsvakt + vintervakt.** Antal vinterklassningar med minst en uppmätt motsägelse | ≥ 100, annars **OAVGJORT** |

**Å-A3 är den enda som betyder något, och facit är operatörens nästa omklassning.** Om operatören
efter en påstådd motsägelse skriver om segmentet till "Normalt" hade regeln rätt. Behåller hen
vinterklassningen hade regeln fel — och varje sådant fall är en varning vi skulle ha tystat i
onödan.

**Å-A4 är septembervaktens syskon.** Under 100 fall är talen i Å-A2 och Å-A3 inte statistik, de är
en handfull händelser lästa fyra gånger. Då blir domen OAVGJORT, inte "godkänt".

### Å-B — Tillför regeln något? (döms efter en vintermånad i skuggan)

| # | Krav | Tröskel |
| :-- | :-- | :-- |
| **Å-B1** | Antal varningar regeln faktiskt skulle ha tystat under en vintermånad | ≥ 20, annars är den inte värd kod |
| **Å-B2** | Andel av dem som skuggan bedömer som korrekt tystade | ≥ 90 % |

Passerar Å-A men inte Å-B1 är svaret **R0**: regeln fungerar men löser ett problem som är för litet
för att bära risken.

### Effektstegen — och taket

| Steg | Verkan | Villkor |
| :-- | :-- | :-- |
| **E0** | **Skuggkolumn.** Regeln räknas men tystar ingenting. | direkt efter fastställande |
| **E1** | Varningen behålls men märks i rapporten som "motsagd" | Å-A godkänd |
| **E2** | Varningen tystas i snapshoten | Å-A **och** Å-B godkända, och Bengts uttryckliga ord |
| **E3** | Varningen tystas utan skuggkörning först | **aldrig** |

**Riktningen är farlig och taket är därför hårt.** Alla andra tröskeldokument i huset reglerar när
vi får SÄGA något. Det här reglerar när vi får TIGA, och ett fel åt det hållet syns inte i någon
logg — det syns i att en förare inte fick veta. **Rösten är Axels; tystnaden är ingens förrän
båda grindarna gått.**

---

## 6. Vad som skulle fälla kortet

* **Å-A2 under 5 %** — tillståndet inträffar nästan aldrig, och regeln löser ett problem som inte
  finns. Kortet stängs, svaret är R0.
* **Premissen faller.** Visar vinterdata att operatören ändå skriver om vid varje förändring, är
  hela frågan felställd — då är en åldersgräns rimlig igen och det här dokumentet ska rivas, inte
  lappas.
* **Facit går inte att bygga.** Kan ingen omklassning hittas att jämföra mot, är Å-A3 inte mätbar
  och frågan får ingen regel. **Ett utsagolöst noll är inte ett godkännande.**
* **Värdevakten fäller `condition_code` eller `condition_info`** — då vilar hela frågan på ett
  obesiktigat fält och får inte mätas förrän det är utrett.

---

## 7. Kostnad

Noll kronor och inga nya källor. Mätningen körs på `road_condition_history`,
`weather_observations` och `road_conditions`, som alla redan finns. Skuggkolumnen (E0) ryms i
skuggmotorn. Ett nytt schemalagt jobb kostar debiterade minuter och ska då in på pulsklockan —
inte på naken GitHub-cron, som #70 mätte till 40 % av bokad takt.

---

## 8. Ordning och ändring

**Gemensam kalibrering — regel D** (fastställd 17/9, TROSKLAR-KOMBINATIONEN §5, DECISIONS #226). Verkar en parameter i
det här dokumentet i en kombination, ändras den *för kombinationen* bara enligt D1–D7: värden ur detta dokuments svep,
startvärden före första natten, kalibrering och dom på skilda nätter, alla prövade punkter redovisade. Parameterns egen
tröskel följer detta dokument som förut.

1. Dokumentet fastställs av **Bengt**, som äger mätningen och trösklarna. Ingen kontrasignering.
2. **Inget mäts förrän vintern gett klassningar.** Körs Å-A i september blir svaret OAVGJORT på
   Å-A4, och det är rätt svar — inte ett misslyckande.
3. Vid första vinterklassningen: kör om exponeringsmätningen (§2) med `scripts/kodgrinden.ts`.
4. Därefter Å-A, skarpt. Marginalvakten och vaktdiagnosen gäller.
5. Passerar Å-A: **E0, skuggkolumn**. Aldrig direkt till tystnad.
6. Efter en vintermånad: Å-B. Först därefter E1, och E2 bara på Bengts uttryckliga ord.

Fram till **första skuggkörningen** får §4:s svep och §5:s krav justeras av vem som helst av oss
med en rad i DECISIONS. **Därefter ändras ingen tröskel alls** — en ändring efter det lutar sig mot
utfallet.

**Undantagen från all lättnad:** §1:s avgränsning (ingen tystnad utan motsägelse), R3:s
förkastande, och E3. Dessa får skärpas men aldrig mjukas upp, oavsett vem som ber om det.

---

*Källor: Axels mätning 12/9 2026 (818 segment, kod 1, ingen end_time, senaste ändring 25/8);
`publish/snapshot-core.ts` rad 26 (väderpunkternas 3 h), rad 82–85 (segmenten, ingen tidsgräns),
rad 140 (avvikelsernas end_time-filter); `sql/001_init.sql` rad 24 (`end_time` finns);
`ingest/sources/roadcondition.ts` rad 36 (ingesten skriver den redan); `scripts/kodgrinden.ts`
avsnitt C och D; TAVLA.md kort #52, #100, #151; DECISIONS #71 (utsagolöst noll), #126/#128
(marginalvakten), #133 (värdevakten), #141 (vaktdiagnosen), #144 (ankarradien som vaktat kontrakt).*
