# Granskningen av grindarna 25/9 — spärrar och snedvridningar efter ändringarna 21–24/9

*Bengts fråga 25/9: har ändringarna i mätningarna 21–24/9 spärrat eller ändrat mätningar negativt, på samma sätt som vi
hittade i grind V-B (kort #42)? Ren granskning: inget ändrat i koden. Två sökagenter läste knapparna; varje fynd nedan
som bär en slutsats är kontrollerat i koden eller mätt i databasen av Claude. Kort #252 bär uppföljningen.*

## Slutsatsen

Ja, delvis. Inget av de nya felen är en hårdkodad nolla som V-B:s, men fem mätningar har fått samma sorts fel: tre kan i
praktiken aldrig fälla en dom, och två har redan fällt domar på ett snällare underlag än driften har. Vakterna mot
trasiga givare gjorde däremot det de skulle i september: ingen äkta frost sorterades bort.

## Vad som ändrades 21–24/9 och rör mätningarna

| Dag | Ändring | Rör |
|---|---|---|
| 21–22/9 | Radvakten, karantänen och den långsamma vakten in i alla mätningar (DECISIONS #298–#300) | grind A, vägpunktsgrinden, K-A, R-A, T-A, Ö, F-A |
| 22/9 | Grannländernas snapshot i Supabase, gallringen får Danmark (#301) | grannarkiven |
| 23/9 | Vägpunktsgrinden, segmentprognosen, holdout (#323–#326) | vägpunkten, skuggloggen |
| 23–24/9 | Grind S-B/S-C och den delade facitlistan (#327–#329) | S-B |
| 24/9 | Tystnadsfelet omskrivet (#330) | tystnadsfelet |
| 24/9 | Arkivexporten med radering och frosttriggern (#334, #338) | alla som läser väderarkivet; frostgrindarna |
| 25/9 | V-B: facit, fönster, blindning, torr station (#349–#351) | V-B |

## Mätt i databasen 25/9

| Vad | Utfall |
|---|---|
| Avläsningar under 0 °C sedan 15/9 | 780 rader på 11 stationer |
| Trasiga givare bland dem (−42 till −50 °C, eller känd felstation) | 7 stationer, alla bortsorterade av vakterna |
| Äkta frost (yta −0,6 till −1,6 °C, luft −1,7 till −4,0 °C) | 4 stationer, **ingen** bortsorterad av någon vakt |
| Stationer i den långsamma vaktens tabell per dygn | 1–3 |
| Databasens storlek | 182 MB — raderingen startar först över 350 MB |

## Fynden, allvarligast först

**1. Grind A och vägpunktsgrinden har prövat en snällare prognos än den som körs.** *(domar fällda 21–23/9)*
Väderarkivet skrivs sedan 8/9 bara av den levande ingesten, som sparar en avläsning om ytan är ≤ 5 °C eller det
regnar eller snöar (`supabase/functions/ingest-live/index.ts:144`). En varm, torr station har alltså inga rader.
Grindarna räknar bara grannar som har en rad i samma halvtimme (`publish/grind-a.ts:69–70`,
`scripts/hojd-prov.ts:100–101`), så fallet *kall målstation, varm granne* prövas aldrig. Driften tar sina ankare ur
`weather_latest`, där de varma finns (`sql/032_prognos.sql`). Grind A:s KLARAD (DECISIONS #321, A3 0,0 %) och
vägpunktens ÖPPEN (#324) kan därför vara för optimistiska — just i fallet med en lokal kallgrop, som är det farliga.
Storleken är inte mätt.

**2. Frostgrindarna körs en gång vid första frosten, och sedan aldrig igen.** *(frosttriggern 24/9)*
Vakthunden trycker T-A (7 dygn), K-A (60), R-A (30, Sverige), övergångarna (7) och vind och sikt (14) EN gång, när 50
stationer haft ytan ≤ 0 °C senaste dygnet och ingen issue med etiketten `frostlarm` funnits
(`supabase/functions/vakthund/index.ts:68–74, 287–290`). Ingen av dem ligger på pulsklockan (`scripts/pulsklocka.ts`).
Kraven kräver veckor av frost (T-A 30 frostnätter, K-C1 en vintermånad, R-C1 15 frostdygn). Efter första körningen står
de alltså stilla tills någon trycker — i praktiken samma spärr som V-B:s. T-A körs dessutom mitt i den första frostnatten,
så nätter som fortfarande kyls räknas som icke-frost.

**3. S-B kan inte fälla en godkänd dom som den är byggd.** *(byggd 23–24/9)*
- Fönstret rullar 14 dygn (`.github/workflows/grind-s-b.yml`), fast dokumentet dömer hela vintern — samma fel som V-B hade.
- C3 blir OAVGJORT om ingen matar in grind A:s A2 för hand (`publish/grind-s-b.ts:192`), och domen tar med C3.
- **B1 är cirkulär:** en episod nära en station döms av stationens egen avläsning (`grind-s-b.ts:91–101`), men prognosen
  som väckte episoden vägs till stor del av samma station. Holdoutens leave-one-out-skattning loggas (`segment.ts:99–100`)
  men används inte. Falsklarmen nära stationer döljer sig själva.
- I dom-läget skrivs B1–B3:s andelar ut innan C kontrolleras (`grind-s-b.ts:188–195`).
- Missfönstret är 2 h mot flottans 3,5 h mellan varven på en rutt.

**4. Tystnadsfelet räknar fel åt båda håll.** *(omskrivet 24/9)*
- Segmentvarningar (*halt väglag*) sparas utan position (`skuggmotor/main.ts:375–379`), och tystnadsfelet räknar bara
  varningar med position (`scripts/tystnadsfelet.ts:225`). En halkvarning på segmentet räknas alltså som tystnad.
- En station utan rader i fönstret gör missen *okänd*, och radarn prövas aldrig (`tystnadsfelet.ts:261–269`).
- T5-spärren skrivs ut men stoppar inte dom-läget (`tystnadsfelet.ts:290–300`).

**5. Raderingen kommer att krympa 60-dygnsfönstren tyst.** *(exporten 24/9)* När databasen passerar 350 MB raderas
exporterade dygn äldre än 30 dagar (`sql/034_arkivexport.sql`). Grind A, vägpunktsgrinden och K-A läser 60 dygn och
säger inget om saknade dygn; bara V-B gör det sedan i dag. I dag 182 MB, så inget har hänt än.

**6. Den långsamma vakten är oprövad på vinterfrost.** *(22/9)* Den dömer ett stationsdygn på raderna det har, och
dieten gör att en kallgrop som är varm på dagen bara har nattrader. En klar frostnatt med ytan ≥ 6 ° under luften i 90 %
av raderna tar då hela UTC-dygnet (`sql/030`). I september tog den ingen äkta frost (tabellen ovan) — men september hade
ingen sådan natt.

**7. Äldre fel av samma sort, inte orsakade 21–24/9:**
- R-A:s spärr jämför antalet episoder med ett krav i stationstimmar (`scripts/grind-r-a.ts:48, 248` mot
  TROSKLAR-RIMFROST R-A1) — flera gånger strängare än dokumentet.
- V-A prövar bara timmar där målstationen har en rad (`publish/grind-v-a.ts:48`) — samma fel som V-B #351. V-A föll
  ändå på träffen, så nej-domen står.
- Övergångarnas fråga 0d kastar tysta torra perioder (`scripts/overgangar-steg0.ts:401–408`) — samma fel.
- K-A, R-A, vind och sikt och SMHI-förstärkaren skriver andelar under spärren; R- och F-dokumenten har egna
  blindningsklausuler (C4).
- T-A:s *kl 03–07* räknas i UTC-timmar (`scripts/grind-t-a.ts:164`).

**8. Min egen #351 vilade på en felaktig premiss.** Jag skrev att arkivet sparar *kalla, blöta eller ändrade*
avläsningar. Regeln om ändrad temperatur finns bara i den gamla ingesten, som inte skriver väder sedan 8/9. Regeln i #351
fångar därför bara en torr station som haft en kall eller blöt rad inom ±3 h. Den gör inget fel, men hjälper mindre
än beslutet säger.

## Vad som inte är fel

- Vakterna sorterade inte bort någon äkta frost i september.
- Raderingen har inte börjat.
- Grind A:s, vägpunktens och V-A:s spärrar går att nå; grind A:s och vägpunktens är redan nådda.

## Förslag, i den ordning de skyddar mest (beslut: Bengt, och Axel där tröskeldokument rörs)

1. **Mät censuren i grind A och vägpunktsgrinden** före novembers skarpa prövning: hur stor andel av de kalla timmarna
   saknade grannar en rad för att de var varma och torra? Visar det sig stort: låt den levande ingesten spara en rad i
   timmen per station (arkivkostnad att räkna först), eller pröva grinden med `weather_latest`-liknande ankare.
2. **Låt frostgrindarna gå om** — på pulsklockan (den öppna frågan i §4.2) eller genom att vakthunden trycker igen efter
   sju frostdygn. Flytta T-A:s körning till efter morgonen.
3. **S-B:** fönstret från 23/9, C3 läser grind A:s A2 själv, B1 på holdoutens leave-one-out, andelarna efter C.
4. **Tystnadsfelet:** segmentvarningar räknas via rutt och kilometer, inte position; T5-spärren stoppar dom-läget.
5. **Varningen om saknade dygn** (som V-B:s) i grind A, vägpunktsgrinden och K-A.
6. **R-A:s spärr i stationstimmar**, som dokumentet säger.
7. **Rättelsen av #351** är redan skriven i DECISIONS.

## Utfallet 25/9 (Bengts ja till alla sex, Axel inget att invända — DECISIONS #352)

| Förslag | Utfall | Bevis |
|---|---|---|
| 1. Censuren mätt | **10 947 kalla målhalvtimmar** (yta ≤ 5 °C, 60 dygn): av 41 079 grannplatser saknade **20 319 en arkivrad — 49,5 %**; bland de frysnära (yta ≤ 1 °C, 232 halvtimmar) **50,4 %**. Av 5 785 mål med fem grannar hade bara **573 alla fem**, och 966 ingen. En granne som saknas i en kall halvtimme är varm och torr eller nere, så talet är ett tak — men ett högt tak. | `scripts/matningar/censur-grind-a-2026-09-25.sql`, dbknapp 25/9 |
| 2. Frostgrindarna trycks om | kl 09 UTC, högst var sjunde dygn medan frosten varar; issuen skapas som förut | `test/frosttryck.test.ts` (7 fall, 2 motprov), deploy 06:45Z, vakthundens varv 07:07Z svarade 200 utan problem |
| 3. S-B | B1 och C2 på leave-one-out, C3 mot 3,5 %, fönstret från 23/9, andelar efter C | självtest + 2 motprov; körd mot databasen 25/9: bara antal |
| 4. Tystnadsfelet | segmentvarningarna räknas via segmentets linje (1 504 av 3 681 larm har nu plats eller segment); T5 stoppar dom-läget | körd mot databasen 25/9 |
| 5. Saknade dygn | grind A, vägpunktsgrinden och K-A skriver ut hål efter arkivets början (24/8) | `test/saknade-dygn.test.ts` + motprov; arkivet saknar **6/9 och 7/9** (minutkrisen, före den levande ingesten) |
| 6. R-A i stationstimmar | R-A1 räknar episodernas längd i timmar | självtest + motprov |

**Vad mätningen betyder.** Grind A:s KLARAD (#321) och vägpunktens ÖPPEN (#324) vilar i hälften av grannplatserna på de kalla
och blöta grannarna; driftens prognos tar med de varma. Domarna ska läsas som *klarade på ett underlag där de varma grannarna
saknas*. Vad som behövs för att laga det är kort #253.

