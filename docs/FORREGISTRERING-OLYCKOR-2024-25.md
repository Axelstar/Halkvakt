# Förregistrering — Trafikverkets olyckor 2024/25: facit i kuvösen och en andra serie för W-A

**Status: UTKAST 22/10 2026, rättat 23/10** (DECISIONS #665, #669; §1 och §5 efter #675 och #689). Bengt och Axel signerar **innan** någon olycka läses mot kuvösen eller vinden.
Fristen är `olyckor-forregistrering`, 15/11.

Källorna:
- olyckorna i TRV 2026/111808, kompletteringen 20/10 (`docs/KUVOS-LEVERANSEN-2026-10-02.md` §5i);
- facitläsningen mot väglaget (`docs/FORREGISTRERING-FACIT-TRV-2024-25.md`), vars frågor (a) och (b) olyckorna ger en andra
  bekräftelse;
- W-A i `docs/TROSKLAR-VIND-SIKT.md` §4 och `scripts/vindsikt-steg0.ts`.

Filen ligger i hinken `arkiv` som den rensade kopian `kuvos/trv-2026-111808/Olyckor24-25.xlsx`, aldrig i repot. Fritexten och platsen
skrivs aldrig ut i en logg.

## 1. Vad som läses

Två frågor. Båda är **diagnos** med ett undantag: ingen ändrar en tröskel, och domarna fälls på driften som förut (#547, #662).
Undantaget är sikten: W-A3 i fråga (b) avgör den (#675, #689; §5). Regel L gäller (#564).

- **(a) Facit.** Hur ofta har kandidatens kalla timmar och efterhalkans fyrningar en olycka nära sig i tid och rum, jämfört med kalla
  timmar i allmänhet? Det är frågorna (a) och (b) i facitläsningen mot väglaget, med olyckor i stället för väglag.
  **En olycka får bekräfta en varning men aldrig fälla den.** Olyckorna räknas för sig och läggs aldrig i grundtalet (#247), och
  inga missar eller falsklarm räknas ur dem.
- **(b) W-A, den andra serien.** Stiger olycksfrekvensen med byvinden, och sjunker den med sikten, vid kuvösens alla stationstimmar
  2024/25? Driftens W-A står kvar som domen (#662). Det här är en serie bredvid, utan diet: kuvösen har alla halvtimmar.

## 2. Vilka olyckor som räknas

- **Inläsningen.**
  - De 22 förskjutna raderna lagas med regeln *första kolumnen från och med `StartTid` som är en tid* (KUVOS-LEVERANSEN §5i).
  - Rader med samma starttid och samma koordinat räknas **en gång**; de är 23.
  - Koordinaterna är SWEREF 99 TM med **`X` nordlig**. De räknas om till WGS 84 före parningen.
  - Tiden är `StartTid`; `Sluttid` används inte.
- **Två serier, båda redovisas:**
  - **alla olyckor**;
  - **halkolyckor**: fritexten (`Beskrivning`, efter maskningen) matchar skuggfacitets frysta ordlista, utan hänsyn till stora och
    små bokstäver (`publish/skuggfacit.ts`, `HANDELSE_SQL`): `halk|ishalka|\mis\M|\misig\M|\msnö|snöfall|glatt|\mhalt\M`.
    Ordlistan väljs inte om efter att antalet träffar är sett.

  **Den primära serien för (a) är halkolyckorna, och för (b) alla olyckor**, som i driftens W-A.
- **`EventText`** (påverkan) används inte för urvalet. Fördelningen redovisas.

## 3. Tidszonen

Filen säger inte vilken tidszon den har. Två prov görs före läsningen:
- natten till 30/3 2025, timmen 02:00–02:59 svensk tid, ska sakna olyckor. Det är ett svagt prov, eftersom olyckor är glesa;
- vardagarnas timmar med flest olyckor ska ligga i rusningen 07–09 och 15–18 svensk tid. Ligger båda topparna en timme tidigare,
  tolkas tiden som UTC.

Ger proven inget klart svar antas svensk lokaltid, som väglagsfilen ur samma ärende (KUVOS-LEVERANSEN §3). Alla tal i §4 och §5
redovisas då också med tiden flyttad en timme, som känslighet.

## 4. Fråga (a): facit för kandidaten och efterhalkan

**Samma populationer, fönster och avstånd som facitläsningen mot väglaget** (FORREGISTRERING-FACIT-TRV-2024-25 §3–§4):
- **Kandidaten** NIVÅ 2+BLANDNING, den frysta (#552), i kuvösens analysläge vid väg B:s stationer. Identitetsprovet görs mot körning
  38368369876, som där.
- **Efterhalkans fyrningar** (S3, betan).
- **Avståndet:** en olycka hör till en station när den ligger inom **2 km**. Samma tal räknas också inom **5 km**, som
  andra avstånd. Båda skrivs ut, och 2 km är det primära.
- **Fönstren:** [t − 1, t + 2] h för kandidaten och [t, t + 6] h för efterhalkan.

**Måtten**, per serie (alla olyckor och halkolyckor):
- **bekräftelsen**: andelen varningar med minst en olycka inom avstånd och fönster;
- **basnivån**: samma andel för alla stationens egna kalla timmar, som i väglagsläsningen;
- **lyftet**: bekräftelsen delat med basnivån.

Allt redovisas också per månad och norr och söder om 62°. Alla tal skrivs ut, också de som talar emot.

## 5. Fråga (b): W-A på vintern 2024/25

**W-A:s regler, oförändrade** (`scripts/vindsikt-steg0.ts`, TROSKLAR-VIND-SIKT §4):
- **Räckvidden** mellan station och olycka är 15 km.
- **Vindbanden** är < 10, 10–15, 15–20 och 20–30 m/s. Taket G_TAK är 30 m/s, och timmar över taket kastas.
- **Siktbanden** är > 1000, 500–1000, 200–500 och < 200 m. Platshållaren −100 kastas. 20 000 m räknas i bandet över 1000 m, som i
  driften (`SIKTBAND` i `scripts/vindsikt-steg0.ts`) och i kuvösens översättning (`kuvos/oversattning.sql`) (#689).
- **Stationsvakten** är densamma (#164).
- **Kraven:**
  - W-A1: frekvensen stiger monotont med byvinden;
  - W-A2: högsta bandet är minst 1,5 gånger det lägsta;
  - W-A3: samma två krav för sikten;
  - W-A4: minst 500 stationstimmar i högsta bandet och minst 20 olyckor totalt.

**Underlaget:**
- **Stationstimmen** är kuvösens VViS-rader 1/11 2024–31/3 2025, alla halvtimmar och alla stationer efter vakterna.
- **Byvinden** är timmens högsta `vimax`, och **sikten** timmens lägsta `siktdjup`.
- **Frekvensen** är olyckor inom räckvidd per 1 000 stationstimmar och band.

Serien är **diagnos bredvid driftens dom** för byvinden, som den inte fäller. **Sikten avgörs här** (#675, #689): faller W-A3 stryks
sikten. Klarar den sig står sikten kvar, trots fallet i driftens W-A 8/10 (#491). Det är en lättnad, och därför gäller den bara
med båda signaturerna på det här dokumentet (regel L, #564). Allt redovisas per band, med
kvoten och dess marginal (`skiljbarKvot`).

## 6. Förväntan, skriven före läsningen

- **(a)** Lyftet för halkolyckor är över 1 för både kandidaten och efterhalkan. Lyftet för alla olyckor är närmare 1. Bekräftelsen är
  låg i absoluta tal, eftersom olyckor är sällsynta.
- **(b)** Med en riktig nämnare blir W-A4 uppfyllt, eftersom vintern har 7 269 olyckor. Någon riktning förutsägs inte.

## 7. Hittills sett

Bara filens form (KUVOS-LEVERANSEN §5i): flik, kolumner, typer, period och antal. Vidare att fritexten innehåller orden halk, väglag,
is, snö, vilt och älg, men inte hur ofta. Ingen olycka är räknad per månad, plats eller ord, och ingen är ställd mot en station, en
varning eller vinden.

## 8. Fryst vid signeringen

Det som fryses är urvalet (§2), tidszonsproven (§3), populationerna, avstånden, fönstren och måtten (§4) och W-A:s regler och underlag
(§5). Ändras något efteråt sker det bara genom en daterad post med båda signaturerna, och aldrig som en lättnad efter sett utfall
(regel L).

## 9. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
