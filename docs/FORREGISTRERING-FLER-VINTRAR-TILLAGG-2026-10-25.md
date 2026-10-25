# Tillägg till FORREGISTRERING-FLER-VINTRAR: den frysta kandidaten på 2018/19–2021/22 med MET:s v4 där arkivet saknar data

**Status: UTKAST 25/10 2026** (DECISIONS #711, #714). Signeras av Bengt och Axel. Spärren i koden (PR #1196) läser den här filen och
släpper de fyra vintrarna först när statusraden säger SIGNERAT och båda signaturerna står i §11.

Bengts ord 25/10:
- *"Ja, skriv utkastet till förregistreringen för den frysta på 2018/19–2021/22 med v4, med bara det arkivet saknar ur v4. Bara utkast,
  ingen kod och ingen körning."*;
- *"ja vi gör det så har vi säkrat allt vi kan om bästa metod bygg så att du återanvänder allt som går att återanvända"*, på förslaget
  att hämta långvågen före signeringen;
- *"ja"*, på frågan om tillägget ska läggas som PR med kontrollsummorna så fort hämtningen är klar;
- *"Väg 2: ta långvågen ur v4 också för timmen 25/3 2022 08 UTC. Ändra langvag_v4.ts, ta bort delens två filer i releasen 2021-22, hämta om delen och byt summorna i manifestet i #1198."*, valet i §10 (e).

Tillägget ändrar FORREGISTRERING-FLER-VINTRAR (signerad 22/10, #668) genom en daterad post med båda signaturerna, som dess §8 kräver.

## 1. Varför ett tillägg

- **Den frysta räknar med MET Nordics långvåg** (fysiken `lw` och särdraget `cloudlow`). MET:s arkiv `metpparchive` saknar fältet
  från 2018 till 13/3 2022. Därför gick bara 2022/23 att räkna (#670).
- **MET:s omräkning v4** (`metpparchivev4`) har långvågen alla år, på samma rutnät och med samma filnamn. Där båda finns var v4:s
  långvåg identisk med arkivets i stickproven (#707).
- **Två hinder till**, sedda när den nya kandidaten förbereddes (#694), skulle stoppa den frysta på samma sätt:
  - tidszonsprovet faller 2019/20–2021/22 på SMHI:s station 7, som ligger en timme fel;
  - arkivet saknar för många timmar 2018/19 (3,07 %), 2019/20 (1,80 %) och 2021/22 (1,86 %), mot kravet högst 1 %.

  Den nya löste det med T1 och T2 (#695), men de gäller bara den nya.

## 2. Vad som är sett, och vad som är gjort före signeringen

- **Sett:**
  - den frysta på 2022/23 (#680);
  - den nyas tal per vinter, med den vintern utanför träningen, och RÅ:s tal per vinter (#702);
  - provens utfall när den nya förbereddes (#694);
  - stickproven av v4 (#694, #707).
- **Inte sett:** inga tal för den frysta på 2018/19–2021/22, och ingen fysik är körd för den på de vintrarna.
- **Gjort före signeringen, öppet** (#711, #714). Långvågen är hämtad ur v4 till releaserna `kuvos-vintrar-<vinter>`, i körningen
  kuvos-vintrar 40164264875 med steget `langvag-v4`, klar 25/10 med 44 av 44 delar gröna. Delen 15–29/3 2022 hämtades om samma dag
  (40188743733) efter valet i §10 (e).
  - Det är bara MET:s öppna data. Inga VViS-data och inga modelltal är lästa.
  - För den nya kandidaten signerades T1 och T2 före fyllningen. Här är ordningen den omvända, och det står här.
- **Delarna är låsta.** Summorna står i `kuvos/langvag-v4-leverans.json`, med sha256
  `c70dcc1064550cda5a5a9726026e8d1c0c931f2018a173388c850cec8154bf63` när det här skrevs. För var och en av de 44 delarna är listans,
  utfilens och källdelens summa lika med releasens egen sha256 (kontrollerat 25/10). Vinterkedjan läser en vinter bara när varje del
  och lista har sin summa där (§4 c).

| Vinter | Delar | Timmar ur v4 | Timmar ur arkivet | Saknade timmar | Rader |
| :-- | --: | --: | --: | --: | --: |
| 2018/19 | 11 | 3 648 | 0 | 0 | 2 750 592 |
| 2019/20 | 11 | 3 672 | 0 | 0 | 2 768 688 |
| 2020/21 | 11 | 3 648 | 0 | 0 | 2 750 592 |
| 2021/22 | 11 | 3 217 | 431 | 0 | 2 750 592 |

- **Timmen 25/3 2022 08 UTC**, efter skarven, saknas helt i arkivet. Den nyas del har den ur v4 enligt T2
  (`fyllt_2022-03-15_2022-03-29.json` i releasen). Den första hämtningen tog långvågen efter skarven bara ur arkivet, så timmen stod
  tom i alla 754 rutor. På Bengts val i §10 (e) tas också långvågen ur v4 för den, och delen är hämtad om. Ingen timme saknas nu.

## 3. Ändringarna

Bara det arkivet saknar tas ur v4. Allt annat är den nya kandidatens redan hämtade data, återanvända.
- **Ä1. Långvågen ur v4** för de timmar där arkivet saknar fältet, alltså 1/11 2018–13/3 2022. Från 14/3 2022 tas den ur arkivet som
  förut, utom en timme som arkivet saknar helt; den tas ur v4, som Ä2 (§10 e). Den fylls i den nya kandidatens delar (`metnordic_fylld_<del>`, annars `metnordic_reserv_<del>`), där kolumnen är tom, och
  skrivs som `metnordic_lw4_<del>` med en lista `lw4_<del>.json` (`fysik/vintrar/langvag_v4.ts`). Inget annat fält ändras.
- **Ä2. Saknade timmar ur v4.** Redan gjort i den nyas delar enligt T2: en timme som arkivet saknar helt är tagen ur v4. Kravet högst
  1 % per fält prövas i kedjan, och en timme utan långvåg räknas mot det.
- **Ä3. Vinden 2018/19** är räknad ur arkivets x- och y-komponenter, √(x² + y²). Det är redan gjort i den nyas delar (NY-KANDIDAT §1).
- **Ä4. Tidszonsprovet görs utan SMHI:s station 7**, som T1. Regeln, avståndet och övriga par står kvar.
- **Ä5. Faller ett annat par**, eller saknas mer än 1 %, läses inte den vintern, och frågan går till Bengt (som T3).

Kandidaten (§1), räkningen i övrigt (§2), proven (§3) och måtten och populationen (§4) i FLER-VINTRAR är oförändrade. Ändringarna rör
inte 2022/23 och 2024/25.

## 4. Prov före läsningen

Ingen av de fyra vintrarna läses förrän proven är klarade:
- **(a) Identitetsprovet** på 2024/25 i samma körning, med samma tal och toleranser som FLER-VINTRAR §3 (a).
- **(b) Tidszonen** per vinter: sommartidsnatten och SMHI-provet med Ä4.
- **(c) Långvågens delar:** elva per vinter i releasen, med en lista per del. Listan anger källdelens summa, timmarna ur v4 och ur
  arkivet, de saknade timmarna och utfilens summa. Varje del och lista ska ha sin summa i `kuvos/langvag-v4-leverans.json`, och ingen
  låst del får saknas; annars läses vintern inte.
- **(d) Återanvändningsprovet, klarat 25/10.** Dygnet 20/3 2022 hämtades med den frystas egen kod (`metnordic_vinter.ts`). Det jämfördes
  med den nyas del fylld med långvågen (`langvag_v4.ts`): **18 096 av 18 096 rader var byte för byte lika i alla sju fälten.** Den
  återanvända vägen ger alltså exakt det som den frystas hämtning ger, där båda går att köra.
- **(e) Självtest** i ci:
  - långvågens fyllning, 17 prov;
  - spärren, station 7, delarna och de låsta summorna, 15 prov;
  - jämförelsens frö och rubrik.

## 5. Måtten och jämförelsen

- **Måtten** är FLER-VINTRAR §4, för varje vinter för sig: RÅ, NIVÅ 2 och NIVÅ 2+BLANDNING, med A1, A2 och A3, banden, norr och söder,
  och månaderna.
- **Tillsammans** redovisas de fyra vintrarna och de fem med 2022/23. 2022/23 märks *redan läst* (#680). Huvudtalet är det enkla
  medlet över vintrarna, som för den nya (#672).
- **Jämförelsen med den nya** görs per vinter, i samma körning som den frysta, mot den nyas veck utan den vintern
  (`ph_utan-<v>_<v>.npz`, med summan mot `kuvos/kandidat-2027-28.json`). Talen är ΔA1, ΔA2 och ΔA3, den nya minus den frysta.
- **Identiteten:**
  - den frystas punkter ska ge exakt de summor som dess egen kedja skrev i samma körning;
  - den nyas punkter ska ge exakt samman:s tal för vintern;
  - populationerna ska vara desamma (ersättningsregeln §2), och punktmängderna lika.

  Annars stoppar jämförelsen.
- **Den ärliga osäkerheten** räknas med omdragning av stationer och UTC-dygn, schemat SD i `fysik/vintrar/osakerhet.py`, B = 2000,
  fröet 20261025. Intervallet är 2,5–97,5 %. En skillnad går att skilja från noll om hela intervallet ligger på ena sidan.

## 6. Vad läsningen inte är

- **Ingen dom.** Grind A:s tak 5 % står bredvid men fäller ingenting.
- **FORREGISTRERING-2026-27 ändras inte.**
- **Ersättningsregelns V2** står kvar som den föll (#702).
- **Talen är underlag** för bytet (FORREGISTRERING-2026-27 §12 b) och valet inför 2027/28 (§12 g).

## 7. Förväntan, skriven före läsningen

- Den frysta har lägre A2 än RÅ varje vinter.
- Norr är sämre än söder varje vinter.
- Den nya har i medel lägre A2 än den frysta över de fyra vintrarna, som på 2022/23. Hur stor skillnaden blir förutsägs inte.
- 2021/22 väntas vara svårast: där var NIVÅ 2 sämre än RÅ också för den nya (13,41 mot 9,51 %).

## 8. Regel L

- **L2:** den frystas tal på de fyra vintrarna är olästa.
- **L3:** nej. Inget sett tal flyttas mot godkänt, och läsningen har inget godkänt.
- **L4:** skälet är att arkivet saknar fältet och timmarna, inte ett utfall.
- **Formen:** tillägget ändrar FLER-VINTRAR §2 och §3 efter att 2022/23 är läst. Därför kräver det en daterad post med båda
  signaturerna, som §8 där säger.

## 9. Koden

Den är byggd i PR #1196 (`claude/langvag-v4`) och inte ihopslagen:
- `fysik/vintrar/langvag_v4.ts` och steget `langvag-v4` i `kuvos-vintrar.yml` (Ä1);
- `fysik/vintrar/vinterkedja.py`: spärren mot ett osignerat tillägg, Ä4, kravet på långvågens delar och de låsta summorna (§4 c);
- `fysik/vintrar/osakerhet.py`: jämförelsen för de fyra vintrarna;
- `kuvos-vintrar.yml`:
  - förprovet kräver det signerade tillägget och delarna;
  - MET hämtas inte;
  - provningen kör jämförelsen i samma jobb.

## 10. Valen, enligt Claudes rekommendation (bekräftas vid signeringen)

- **(a) Fröet:** 20261025. Det står redan i koden.
- **(b) Körningen:** vintrarna en i taget, enligt MET:s villkor om en förbindelse åt gången.
- **(c) Kontrollprovet på 2022/23:** ersatt av återanvändningsprovet (§4 d), som är klarat.
- **(d) Bytesbeslutet:** efter talen men senast 30/11, eftersom säkerhetsläsningen 1/12 är den första läsningen av vinterns data.
- **(e) Timmen 25/3 2022 08 UTC (§2): väg 2, vald av Bengt 25/10.** Långvågen tas ur v4 också för en timme som arkivet saknar helt
  efter skarven, som Ä2 gör med de andra fälten. Bengts ord: *"Väg 2: ta långvågen ur v4 också för timmen 25/3 2022 08 UTC. Ändra langvag_v4.ts, ta bort delens två filer i releasen 2021-22, hämta om delen och byt summorna i manifestet i #1198."*
  - `fysik/vintrar/langvag_v4.ts` hämtar en sådan timme ur v4 och listar den i `ur_v4_efter_skarven` (PR #1196).
  - Delens två filer togs bort ur releasen `kuvos-vintrar-2021-22`, och delen hämtades om (40188743733).
  - De nya summorna står i `kuvos/langvag-v4-leverans.json`, och de gamla står kvar under `omhamtad`.
  - Den andra vägen var att låta timmen stå tom och räknas mot kravet högst 1 %. Inget tal var sett åt något håll.

## 11. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
