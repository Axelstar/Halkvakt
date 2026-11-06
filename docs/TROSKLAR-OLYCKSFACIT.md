# TROSKLAR-OLYCKSFACIT

**Kort:** #376 OLYCKSFACIT — vilka olyckor hör ihop med halka? **Status:** ✅ **FASTSTÄLLT 2026-11-06 av Bengt och Axel** (DECISIONS #798;
skrivet i #797). Texten som signerades är filen på main 947d180f, sha256 `e2558045706e48ce525e03dc74a33a609750b05110738ac0ddf98b9b8323a3e3`.

Reglerna i §4 är skrivna innan någon olycka har klassats, och ingen av dem kommer ur ett utfall. Efterkontrollen (`sql/085`) migreras
först när dokumentet är signerat.

**Varifrån det kommer.** Bengt 6/11: *"Analys av olyckor är ett av de mest effektiva metoderna för att se om varningssystemen fungerar.
Olyckan fungerar som facit."*
- Steg 1 (DECISIONS #796) fryser vad varje varningslager sa när olyckan började.
- Steg 2 är det här dokumentet. Det avgör vilka tysta olyckor som hör ihop med halka och därför ska ha en åtgärd.

**Husreglerna som gäller:**
- tröskeldokument före kod;
- tystnad är en funktion;
- trösklarna är daterade före mätningen och skrivs inte om när talen har kommit (§7);
- inget fält bär en tröskel förrän det har passerat värdevakten.

---

## 1. Vad klassningen är, och vad den inte är

- **Olyckan är facit för varningssystemen, inte för vägen** (DECISIONS #247). Att en olycka hände visar inte att det var halt.
- **Klassningen avgör bara två saker:** vilka tysta olyckor som ska ha en åtgärd i dagens ärende (§5), och vad som räknas i veckans sammanställning (steg 4).
- **Den dömer ingen grind och ändrar ingen tröskel** i appen eller i kandidaten.
- **En tyst olycka som är TYDLIG eller TROLIG är ett skäl att läsa, inte ett bevis** på att appen hade fel.

## 2. Populationen

- Populationen är varje olycka av typen `Accident` i `situation_archive` som `olycksfacit_fanga()` (sql/084, sql/085) har fångat, med start från 6/11 2026.
- **Dubbletter** är en tidigare rad inom 300 m och 30 minuter. De klassas, men ärendet räknar dem inte.
- **En olycka klassas en gång**, när den är minst 24 timmar gammal, och klassen ändras aldrig efteråt.

## 3. Måtten: vad efterkontrollen läser

| Fält | Källa | Fönster |
| :-- | :-- | :-- |
| `text_efter` | `situation_archive.message` vid kontrollen. Klassningen läser den tillsammans med texten vid fångsten | ett dygn efter starten |
| `yta_min`, `dagg_min` | den **närmaste vaktade stationen inom 15 km**: dess lägsta yta och daggpunkt | 2 timmar före till 2 timmar efter starten |
| `fukt_efter` | samma station: regn, snö, eller nederbörd som inte är `no`/`Dry` (snapshotkärnans fukt) | samma |
| `rimfrost_efter` | samma station: yta ≤ 0 °C och under daggpunkten | samma |
| `halka_efter` | A1:s sträcka (inom 100 m vid fångsten): satte Trafikverket kod ≥ 2 eller ett halkord? **Bokförs, klassar inte** | 6 timmar efter starten |

**Vakterna är driftens**, som snapshoten och grind A har dem:
- #75: ytan högst 12 °C under luften;
- radvakten: vid luft ≥ 10 °C högst 8 °C gap;
- karantänen: tre brott mot #75 under de sju dygnen före starten;
- den långsamma vakten: `givarfel_dygn`, senaste ögonblick i felet inom tre timmar före starten.

Kontraktsgrinden vaktar talen. Fälten `surface_temp_c`, `air_temp_c` och `dewpoint_c` har spann i `scripts/vardevakten.ts`, och
`precipitation` läses som ordlista, aldrig som sanningsvärde.

## 4. Klasserna, i ordning

Den första regeln som stämmer gäller. "Texten" är texten vid fångsten och texten efteråt tillsammans, läst utan hänsyn till stora
och små bokstäver. Ett ord räknas bara som eget ord, inte inuti ett annat.

| # | Klass | Regel |
| :-- | :-- | :-- |
| 1 | **INTE** (vilt) | Texten nämner vilt, älg, rådjur, hjort, vildsvin, ren eller djur |
| 2 | **TYDLIG** | Texten har ett halkord (*hal, halt, halk…, is, isen, isig…, ishalk…, sladd…, glashal…, blixthalk…*) **och** `yta_min` ≤ +1 °C |
| 3 | **TROLIG** | Texten säger *singel…* **och** `yta_min` ≤ 0 °C **och** fukt eller rimfrost |
| 4 | **INTE** (varmt) | `yta_min` > +3 °C |
| 5 | **OKLAR** | Allt annat, också när ingen vaktad station finns inom 15 km |

Utan station är ytan okänd. Då kan bara regel 1 och regel 5 ge en klass. Reglerna står ordagrant i `sql/085_olycksfacit_klassning.sql`
(`olycksfacit_efterkontroll`), och integrationsprovet #797 prövar varje regel och varje vakt med en fälla.

## 5. Vad som följer

- **Dagens ärende** med etiketten `olycka` (steg 3, funktionen `olycksfacit`, varje morgon 05:17 UTC) skrivs för det svenska dygnet i förrgår.
  - Det bär en tabell per klass och utfall, och orsakerna till tystnaden.
  - Under *Att åtgärda* listar det varje olycka som är TYDLIG eller TROLIG och där appen teg (täckt eller otäckt).
  - Ärendet är publikt och bär bara väg, tid, läge, koder och antal, aldrig kandidatens tal.
- **Stängningsregeln:** ärendet stängs först när varje rad under *Att åtgärda* har en åtgärd: ett kort på tavlan eller *ingen åtgärd* med skälet.
  - Ett dygn utan sådana olyckor får ett ärende som stängs direkt.
  - Ett öppet ärende påminns var sjunde dygn.
  - Öppna `olycka`-ärenden tas upp med Bengt först i varje session, som `frist` och `dom` (CLAUDE.md).
- **Veckans sammanställning** (steg 4) gör återkommande orsaker till kort och frågor. Den byggs efter de första veckorna.

## 6. Valen

Claude rekommenderar. Bengt och Axel väljer, och valen förs in här före signeringen.

**Sett före skrivningen:** handanalysen av morgonens olyckor 6/11 (`Desktop/Olyckorna_2026-11-06`) och den första fångsten 6/11
07:45 UTC (23 olyckor). **Ingen olycka är klassad.**

| # | Val | Claudes rekommendation | Alternativet | Valt |
| :-- | :-- | :-- | :-- | :-- |
| 1 | *Hindersfri* som INTE (förslaget §2 B) | **Stryks.** Trafikverket skriver över texten med *"Vägen är hindersfri"* när vägen är röjd. Väg 700 vid Kinnared 6/11 bar redan den texten vid fångsten, tre timmar efter olyckan. Regeln hade gjort de flesta olyckor till INTE | Behåll den | Som rekommenderat |
| 2 | Stationens räckvidd | **15 km.** Kisa och E4 vid Linköping 6/11 hade ingen station inom 5 km | 5 km, A2:s räckvidd (DECISIONS #245) | Som rekommenderat |
| 3 | Utan station inom 15 km | **OKLAR.** Texten ensam räcker inte för TYDLIG | TYDLIG på halkordet ensamt | Som rekommenderat |
| 4 | Radarn | **Bokförs i fångsten, klassar inte** | Radarregn räknas som nederbörd i TROLIG | Som rekommenderat |
| 5 | Väglaget efteråt | **Bokförs (`halka_efter`), klassar inte.** Trafikverkets klassning efter olyckan kan vara en följd av olyckan | Halka efteråt räcker för TYDLIG | Som rekommenderat |

## 7. Ordning och ändring

1. Dokumentet fastställs av **Bengt och Axel**. Båda signerar.
2. **Efter signeringen:**
   - funktionen `olycksfacit` deployas (deploy-supabase);
   - `sql/085` migreras med DB-knappen;
   - beviset är den första klassningen (`klass` på rader i `olycksfacit`) och det första ärendet med etiketten `olycka`.
3. **Fram till den första klassningen** får §4 och §6 ändras av Bengt eller Axel, med en rad i DECISIONS. Därefter gäller regel L.

**Ändring efter sett utfall: regel L** (införd 15/10 2026, TROSKLAR-KOMBINATIONEN §5b, DECISIONS #564).
- En lättnad efter att utfallet är sett prövas enligt L1–L4:
  - L1: domen på lästa data står;
  - L2: lättnaden gäller bara data som ingen har läst;
  - L3: en ändring som flyttar ett sett tal mot godkänt är en lättnad;
  - L4: skälet får inte vara utfallet.
- Lättnaden kräver båda signaturerna och en post med det sedda talet.
- Här betyder lättnad en regel som gör färre olyckor TYDLIG eller TROLIG, alltså färre rader att åtgärda.

**Undantag från all lättnad:** §1:s avgränsning (klassningen dömer ingen grind) och regel 1 (viltet). De får skärpas men aldrig mjukas upp.

## 8. Signaturer

| Vem | Datum | Hur |
| :-- | :-- | :-- |
| Bengt | 2026-11-06 | i chatten: *"när det gäller olyckorna så signerar axel och jag 1,2 och 3"*, på listan där steg 1 var signeringen med Claudes fem rekommendationer i §6 |
| Axel | 2026-11-06 | via Bengt i chatten, samma rad |

---

*Källor:*
- `sql/084_olycksfacit.sql` (steg 1) och `sql/085_olycksfacit_klassning.sql` (steg 2 och 3);
- `supabase/functions/olycksfacit/`;
- förslaget `Desktop/Olyckorna_2026-11-06/OLYCKSFACIT_RUTINEN_FORSLAG_2026-11-06.md` (Bengt 6/11: *"Bygg olycksfacit"*, *"Ja, bygg steg 2 och 3"*);
- DECISIONS #247, #245, #564, #649, #784, #796 och #797;
- `publish/snapshot-core.ts`: vakterna och fukten.
