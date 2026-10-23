# Tillägg till förregistreringen NY-KANDIDAT-2027-28: SMHI:s station 7 och MET:s saknade timmar

**Status: UTKAST 23/10 2026, inte signerat** (DECISIONS #694). Bengt och Axel signerar **innan** fyllningen och förberedningen körs
och innan något modelltal (A1, A2, A3) läses; målet är 26/10, samma dag som förregistreringen för 2026/27. Koden är byggd före
signeringen, på Axels och Bengts ord 23/10: *"axel godkänner bygg"*. Bengts ord före utkastet: *"men det kan vi ju inte acceptera vi
måste hitta en väg runt det här så att materialet kan användas"* och *"Ja, utred Gävleparet och v4 läsande och skriv ett utkast till
tillägget. Starta inget och läs inga modelltal."*

## 1. Vad som har hänt, och vad som inte har lästs

Förberedningen 23/10 (kuvos-ny-kandidat 39964156753) föll. Två saker föll:

| | 2018/19 | 2019/20 | 2020/21 | 2021/22 | 2022/23 | 2024/25 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Tidszonsprovet (SMHI) | klarat | **faller**, 1 par av 10 vid +1 h | **faller**, samma par | **faller**, samma par | klarat | klarat |
| MET Nordic, saknade timmar (krav högst 1 %) | **3,07 %** | **1,80 %** | 0,36 % | **1,86 %** | 0,33 % | 0,0 % |

Utan tillägget tas tre vintrar bort (§4), och ersättningsregelns V1 (*"högst en vinter har tagits bort"*) håller inte.

**Inte läst:** inga modelltal. Ingen fysik är kalibrerad, ingen rättelse tränad och inget A1, A2 eller A3 räknat för den nya kandidaten.
Det enda som är sett är provens utfall ovan och utredningen i §2 och §3.

## 2. Tidszonsprovet: felet sitter i SMHI:s station 7, inte i Trafikverkets data

Paret som föll är VViS 2138 mot SMHI-stationen **"Gävle", nummer 7**. Den hör till SMHI:s nät *Övriga stationer* (inte SMHI:s eget
stationsnät) och finns bara 1/1 2017 – 30/11 2022. Den ligger 3,3 km från 2138, närmare än SMHI:s ordinarie **Gävle A (107420)**,
6,1 km bort. Provet tar närmaste SMHI-station inom 8 km som täcker vintern, därför station 7 de här vintrarna. 2022/23 täcks den inte
längre, och då tas Gävle A.

Utredningen (Claudes läsande utredning 23/10, med samma korrelation som `fysik/vintrar/tidszon.py`: timförändringen, förskjutning −3 … +3 h, cirka 3 600
timpar per rad) visar var klockan avviker. Topp vid 0 h betyder att klockorna stämmer.

| Par | 2018/19 | 2019/20 | 2020/21 | 2021/22 | 2022/23 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| VViS 2138 mot SMHI Gävle A | **0 h** (0,70 mot 0,49) | **0 h** (0,77 mot 0,53) | **0 h** (0,74 mot 0,48) | **0 h** (0,78 mot 0,54) | **0 h** (0,70 mot 0,52) |
| VViS 2138 mot VViS 2132, 2102, 2130 | 0 h alla | 0 h alla | 0 h alla | 0 h alla | 0 h alla |
| VViS 2132, 2102, 2130 mot SMHI 7 | +1 h alla | +1 h alla | +1 h alla | +1 h alla | (station 7 finns inte) |
| **SMHI Gävle A mot SMHI 7** | **+1 h** | **+1 h** | **+1 h** | **+1 h** | (station 7 finns inte) |

(Inom parentes: korrelationen vid toppen mot den vid närmaste andra förskjutning.)

**Slutsatsen:** SMHI:s station 7 ligger en timme efter SMHI:s egen Gävle A 6 km bort, och efter fyra VViS-stationer, alla vintrar den
finns. VViS 2138 stämmer med Gävle A och med sina VViS-grannar vid 0 h med god marginal. Stationens serie ser ut att vara stämplad i
svensk normaltid (UTC+1) fast den sägs vara UTC. Trafikverkets data, det som provet ska skydda, är inte förskjuten.

## 3. MET:s saknade timmar: de saknas i arkivet, och MET:s omräkning v4 har dem

- **Arkivet.** De 66–112 timmarna per vinter saknas i `metpparchive` själv. Våra filer har exakt de timmar som MET:s katalog listar
  (nio dygn i stickprov, timme för timme), och hämtningen räknar bara HTTP 404 som saknat. Den längsta luckan är 24/12 11 UTC – 26/12
  08 UTC 2018 (46 timmar) och 15/1 15 UTC – 17/1 09 UTC 2022 (43 timmar).
- **Omräkningen v4** (`metpparchivev4`, MET:s *"Rerun version 4"*, 2012–2025) har alla 24 timmar för 25/12 2018 och 16/1 2022, på samma
  rutnät (2321 × 1796), med `wind_speed_10m` och långvåg i alla år.
- **v4 jämfört med arkivet**, samma timme, vid de 754 stationerna:

  | Timme | Luftens \|v4 − arkivet\|, medel | 95 % under | Systematisk skillnad | Övrigt |
  | :-- | :-- | :-- | :-- | :-- |
  | 24/12 2018 06 UTC | 0,37 °C | 1,19 °C | −0,04 °C | fukt och kortvåg identiska |
  | 18/1 2020 12 UTC | 0,10 °C | 0,33 °C | −0,02 °C | fukt och kortvåg identiska |
  | 15/1 2022 06 UTC | 0,36 °C | 1,07 °C | +0,07 °C | moln \|d\| 0,14, fukt \|d\| 0,03 |
  | 15/2 2025 06 UTC | **0,00** | 0,00 | 0 | identiska utom nederbörden |

  v4 är alltså **dagens metod räknad bakåt**: 2025 är den identisk med arkivet och därmed med driften. För de äldre åren skiljer den sig
  timme för timme utan att förskjuta medlet.

## 4. Tilläggen

**T1. SMHI:s station 7 räknas inte i tidszonsprovet.** I den nya kandidatens förberedning tas SMHI-stationen med nummer 7 ("Gävle",
*Övriga stationer*) bort ur SMHI:s stationslista innan paren väljs. Skälet är §2: dess klocka ligger en timme efter SMHI:s eget nät.
Inget annat ändras: regeln *"varje räknat par har toppen vid 0 h och minst fem par"*, avståndet 8 km, banden och två par per band står
kvar. Provet räknas om för **alla sex vintrar** med samma lista. `fysik/vintrar/tidszon.py` ändras inte; listan filtreras i
`fysik/ny_kandidat/forbered.py` (`tidszon.provet` tar redan en lista som argument), så FLER-VINTRAR:s prov för den frysta är orört.

**T2. Timmar som saknas i arkivet tas ur MET:s omräkning v4.** För varje timme 31/10 00 – 31/3 23 UTC som saknas i en vinters del
frågas `metpparchive` först igen; saknas timmen där (HTTP 404) hämtas samma timme ur `metpparchivev4`, med samma fält i samma rutor.
Vinden tas som `wind_speed_10m` (v4 har den alla år), och långvågen tas som förut ur fysikens reserv, inte ur MET. Det gäller **alla
fem äldre vintrar** (2024/25 saknar inga timmar). Delen skrivs som `metnordic_fylld_<del>` bredvid originalet, som står kvar i
releasen, och `fyllt_<del>.json` listar varje ifylld timme med sin källa och originalets sha256. Antalet per vinter redovisas i
förberedningen och i sammanställningen. Kravet *"högst 1 % saknat"* står kvar och prövas
efter ifyllningen. En timme som saknas i båda arkiven räknas som saknad, som förut.

**T3. Spärr.** Visar förberedningen efter T1 och T2 att ett annat par än 2138/7 hamnar fel, eller att mer än 1 % fortfarande saknas,
gäller förregistreringen som den står (§4), utan fler tillägg.

## 5. Varför det inte är en lättnad efter sett utfall (regel L, ersättningsregeln §7)

- **Inga krav sänks.** Tidszonsprovets regel och MET-kravet på 1 % står kvar. T1 tar bort en referensstation med påvisat fel, T2 fyller
  luckor med MET:s egen analys i stället för att tillåta fler luckor.
- **Inga modelltal är lästa.** Tilläggen bestäms på provens utfall och på datakvalitet, inte på hur kandidaten presterar.
- **Samma för alla vintrar**, också de som klarade proven.
- **Öppet.** DECISIONS säger att tilläggen kom till efter att förberedningen föll 23/10, och sammanställningen redovisar vilka vintrar
  som klarade sig tack vare T1 (2019/20, 2020/21, 2021/22) och hur många timmar T2 fyllde per vinter.

Ersättningsregelns villkor V1–V4, kravet X = 0,25 och valet i mars ändras inte. V1 prövas med tidszonsprovet räknat enligt T1.

## 6. Vad det kräver

- **Kod (byggd i samma PR som det här utkastet, #694):**
  - `fysik/ny_kandidat/forbered.py`: `UTESLUTNA_SMHI` och `smhi_lista()` tar station 7 ur listan; `fyllt_summa()` och `--fyllt`
    redovisar fyllningen;
  - `fysik/ny_kandidat/metnordic_reserv.ts`: `fyllDel()` och `--fyll` (arkivet först, sedan v4, en hämtning i taget), och `valjDelar()`
    tar den fyllda delen före originalet;
  - `kuvos-ny-kandidat.yml`: steget `fyll` (en vinter i taget, till releasen bredvid originalen), och förberedningen läser listorna;
  - självtester för båda, med motprov: utan T1 tas paret mot station 7 (+1 h), med T1 mot Gävle A (0 h); en timme som saknas i båda
    arkiven förblir saknad; originaldelen står orörd.
- **Körningar efter signeringen:** `steg=fyll` → `steg=forberedning` → `steg=traning` → `steg=provning` → `steg=samman`.
- **Tid:** skuggans frist är 15/11. Claudes bedömning: koden och fyllningen ryms på ett dygn; träningens längd är inte känd i förväg.

## 7. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
