# Förslag: olycksfacit i nära realtid — ett direkt driftlarm och klassningen efter sex timmar (kort #641)

**Status: FÖRSLAG 8/11 2026**, väntar på Bengts ja (bedömningen §4.2). Del 6 kräver också Bengts och Axels signaturer.
Ingenting är byggt.

Bengt 8/11: *"Hela systemet ligger i efterhand och redovisar en gång per dag. Hade inte systemet kunna ha en onlinefunktion. En
olycka rapporteras, direkt efter sker en analys av olycksfacit och en varning skickas ut till systemet som pekar på brister,
åtgärder etc."*, och sedan *"skriv ett förslag på direkt driftlarm"*.

## 1. Läget i dag

- **Fångsten är redan direkt.** `olycksfacit_fanga()` körs var 15:e minut (sql/084). Den sparar varje ny olycka med vad A1,
  kandidaten (K) och A2 sa på platsen vid starten, och varför de teg.
- **Klassningen väntar ett dygn.** Kopplingen till halka (TYDLIG, TROLIG, OKLAR eller INTE) kräver stationens yta två timmar efter
  starten och Trafikverkets text efteråt (TROSKLAR-OLYCKSFACIT §3–§4, sql/085).
- **Ärendena kommer i efterhand.** Dagens ärende skrivs 05.17 UTC och veckans på tisdagen (DECISIONS #797, #802).

## 2. Vad som ska larma direkt, och vad som inte ska det

| Vad olycksfacit kan säga | Direkt? | Skäl |
| :-- | :-- | :-- |
| **Ett lager fungerade inte** på platsen när olyckan började | **Ja** | Det går att åtgärda nu, och varje timme räknas. Vakthunden ser driften, men inte att ett fel träffade en verklig olycka |
| Kopplingen till halka | Bara som preliminär rad i larmet | TROLIG kräver stationens yta upp till två timmar efter starten |
| En brist i modellen eller regeln (ytan kring 0 °C, rimfrosten, vetot, spridningsspärren) | **Nej**, som i dag | En olycka är ett skäl att läsa, inte ett bevis (TROSKLAR-OLYCKSFACIT, inledningen). En regel ändras inte på ett sett utfall (regel L, #564). 6/11 visade fem av åtta missar vid läsning en småväg eller en yta som stämde vid olyckan |

## 3. Förslaget

**Villkoret, prövat vid fångsten** (inget utfall som kräver efterkontrollen):
1. **Olyckan kan gälla halka.** Texten har ett halkord (§4:s lista), eller den närmaste vaktade stationen inom 15 km hade en yta
   på högst +1 °C senast vid starten.
2. **Och ett lager fungerade inte:**
   - **K:** *ingen timme* (kedjans senaste körning var tyst eller äldre än två timmar) eller *gallrad* (fångsten kom för sent för
     kandidatens punktvärden, DECISIONS #822);
   - **A2:** den närmaste stationen inom 5 km har inget värde de senaste 60 minuterna (stationen tyst);
   - **appen:** den senaste lyckade publiceringen var äldre än 15 minuter vid starten (lägesfilen stod still).

   Feltyperna och gränserna är förslag och prövas i skuggan (punkt 4). Varje fel läses ur data, inte ur ett klockslag.

**Utskicket.** Ett ärende med etiketten `drift`, tilldelat Bengt, inom 15 minuter från fångsten.
- Ärendet bär olyckans tid, väg och läge, lagret som inte fungerade och sedan när (läst ur samma data), och den preliminära
  kopplingen till halka.
- **Högst ett ärende per feltyp och dygn.** Följande olyckor med samma fel blir kommentarer.
- Repot är publikt, så ärendet bär bara väg, tid, läge, koder och antal, som dagens ärende.
- **Stängningen:** när felet är förklarat, med ett kort eller *ingen åtgärd* med skälet.

**Bygget.**
- En funktion i fångsten, `olycksfacit_driftlarm()`, skriver kandidaterna till en tabell.
- Olycksfacit-funktionen gör ärendet.
- Ingen ny tjänst och ingen ny hemlighet; gratisnivån räcker.

**Prov.**
- Ett integrationsprov med ett fall per feltyp, och ett fall som inte ska larma (en olycka utan halkord på +5 °C med ett trasigt
  lager).
- Ett motprov per villkor.

## 4. Skuggan först

En vecka skriver funktionen bara till tabellen, utan ärenden. Hur ofta villkoret slår till ska mätas, inte antas (Bengt 16/9,
DECISIONS #200). Efter veckan läses antalet per feltyp, och Bengt väljer vilka som får göra ärenden.

## 5. Frågorna till Bengt

| # | Fråga | Claudes rekommendation |
| :-- | :-- | :-- |
| 1 | Kanalen | Ett ärende med etiketten `drift`. Det ger en notis och följer samma stängningsregel som olycksfacit |
| 2 | Feltyperna | K *ingen timme* och *gallrad*, en tyst station och en stillastående publicering |
| 3 | Skuggan | En vecka med bara tabellen, innan något ärende skrivs |
| 4 | Klassningen efter sex timmar (del 6) | Ja, med villkoret om flödet; signeras av Bengt och Axel i TROSKLAR-OLYCKSFACIT |

## 6. Klassningen efter sex timmar i stället för ett dygn

Bengt 8/11: *"Jag vill gärna att vi inte ligger 24 timmar efter med olycksfacit. jag vet inte varför vi har det upplägget och kolla
det"*.

**Varför det är ett dygn i dag.** TROSKLAR-OLYCKSFACIT §2 säger att en olycka klassas när den är minst 24 timmar gammal. Det
enda mått som behöver så lång tid är `text_efter`, Trafikverkets text ett dygn efter starten (§3). Stationens fönster slutar två
timmar efter starten, och `halka_efter` sex timmar efter (den bokförs bara). Dagens ärende gäller därför dygnet i förrgår (§5), så
en olycka blir ett ärende 29–53 timmar efter starten.

**Mätt 8/11 i driften** (120 olyckor utan dubbletter sedan 6/11, varav 72 klassade):

| Mått | Utfall |
| :-- | :-- |
| Publiceringen, från start till första gången arkivet såg händelsen | median 3 min, p90 4 min, högst 26 min; ingen över 3 h |
| Händelsens liv i flödet, från start till sista gången arkivet såg den | högst 4 h 21 min; 2 över 3 h, ingen över 6 h |
| Texten efteråt jämfört med texten vid fångsten | ändrad i 27 av 72; halkord bara i texten efteråt: 0; *singel* bara efteråt: 1 (blev TROLIG); vilt bara efteråt: 0 |
| Fångster mer än 5 h efter starten | 10, alla i den första fångsten 6/11 07:45 UTC, som läste tolv timmar bakåt |

När händelsen har lämnat flödet ändras arkivets text inte längre. En kontroll sex timmar efter starten hade därför läst samma
text som kontrollen efter ett dygn för alla 120, och gett samma klass.

**Förslaget.**
- **Kontrollen:** en olycka kontrolleras och klassas när den är minst sex timmar gammal, och händelsen inte har setts i flödet den
  senaste timmen. Villkoret läser datan, inte ett klockslag, och en händelse som lever länge väntar tills den är borta ur flödet.
- **Måtten:** `text_efter` läses vid kontrollen. `halka_efter` och stationens fönster är oförändrade.
- **Dagens ärende** gäller dygnet i går, 05:17 UTC. Det sista dygnets olyckor (till 23:00 UTC) är sex timmar gamla 05:00 UTC.
- **Veckans ärende** skrivs måndagen efter veckan i stället för tisdagen.
- **Fördröjningen** blir 6–30 timmar från olyckan till ärendet, i stället för 29–53.

**Ändringen kräver Bengts och Axels signaturer.** TROSKLAR-OLYCKSFACIT §2, §3, §5 och §9.5 är fastställda (DECISIONS #798, #803).
Enligt dokumentets §7 är en lättnad en regel som gör färre olyckor TYDLIG eller TROLIG. På de 120 olyckorna ändrar förslaget ingen
klass, och villkoret om flödet hindrar att en sen text missas.

**Byggs efter signeringen:**
- `olycksfacit_efterkontroll()` med det nya villkoret;
- dagens och veckans dag i `supabase/functions/olycksfacit`, och proven.

## 7. Vad förslaget inte gör

- Det ändrar ingen varning, ingen tröskel och ingen klassning.
- Det ersätter inte dagens och veckans ärenden. Missarna och förbättringsområdena läses som förut.
- Det larmar inte om att appen teg vid en olycka. Att appen teg är en fråga för klassningen, inte för driften.
