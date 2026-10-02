# Målbladet — vart Halkvakt är på väg, och när det är klart

**Status: FASTSTÄLLT 29/9 2026, andra utgåvan (Bengt, DECISIONS #401, #402, #403 och #404). Fryst som integrationskartan:** bladet ändras
bara med ett nytt DECISIONS-nummer, aldrig löpande. Det säger *vart* och *när*. Var vi står läses i bedömningens läge överst,
inte här; §6 nedan är utgångsläget vid fastställandet och uppdateras inte. Första utgåvan (samma morgon) byggde på kort och
sidor från 20/9 och sa fel om Android, Play-kontot, batteriet, kalendern och beloppet; den här är avstämd mot koden,
appsidan 28/9, mätningssidan 29/9 och besluten #340–#401.

Källorna: Skyltfondsansökan v8B i två alternativ (`docs/skyltfonden-2026-09-28/`, DECISIONS #392, #394, #403), bedömningens §6.4,
mätningssidans domkalender (`docs/MATNINGAR-2026-09-29.html` §11), `docs/KALENDERN.md` och tröskeldokumenten. Ett tal som står
här och i källan ska vara samma tal; skiljer de sig gäller källan och bladet rättas.

## 1. Slutmålet, i en mening

En gratis app som med rösten varnar bilföraren för halka på vägen framför, byggd enbart på Trafikverkets öppna data, utan att
någon position lämnar telefonen automatiskt, med träffsäkerhet, falsklarm och missar **uppmätta mot oberoende facit, oberoende
granskade och öppet redovisade** efter två vintrar, 2026/27 och 2027/28. Sökt av Bengt Lagerlöf som privatperson, med
Föreningen Halkvakt som förvaltare av de öppna resultaten, rapporterad till Skyltfonden i april 2028.

## 2. "Klart" betyder (bedömningen §6.4, fastställd 29/9)

1. Varje vinterlänk har gått hela kartans sekvens: publicerad · mätt i skuggan · villkoret ändrat · tre portar gröna.
2. Varje dom som TROSKLAR-dokumenten föreskriver har avgetts en gång: dom 1 i januari 2027, dom 2 i mars 2027.
3. Alla tre facitkällorna har levererat över sina golv (V-C: ≥ 200 varningar, ≥ 15 facit, ≥ 5 regndygn, ≥ 3 län).
4. Inget öppet kort utanför kalendern.

Systemet är därför inte stängbart före mars 2027. Det är ett ärligt svar.

## 3. Målen = ansökans arbetspaket (413 000 kr, januari 2027 – april 2028)

Ansökan som skickas 30/9 är Axels V2 efter ändringslistan (DECISIONS #404): sökande och projektledare Bengt Lagerlöf som
privatperson, 413 000 kr i fem arbetspaket (AP1 utvärdering 141 000 varav blind bildklassning 15 000 · AP2 prognoslager 70 000 ·
AP3 testförare 88 000 · AP4 oberoende granskning 60 000 · AP5 rapport och spridning 36 000 · drift 12 000 · resor 6 000; egen tid
350 timmar = 245 000). Föreningen Halkvakt står inte som sökande men förvaltar de öppna resultaten efter projektet.

| Mål | Vad vi lovat | Måttet eller tröskeln | När | Ägare |
| :-- | :-- | :-- | :-- | :-- |
| **M1 Utvärderingen** (AP1) | Varje varning klassad mot fyra facitkällor (kamera, SMHI, rapporterad halka, station) och förarfacit; missandelen mätt på två oberoende sätt; omkörning på arkivet med ändrade trösklar; kamerabilderna klassas blint av en utomstående; månatlig datakvalitetsrapport till Trafikverket | träffsäkerhet, falsklarmsandel och missandel per vecka, varningstyp och rutt | jan–apr 2027 | Bengt analys · Claude verktyg |
| **M2 Prognoslagret** (AP2) | Skuggdriftens prognoser dömda mot förhandsdaterade trösklar; nationell felkarta och väghållarvy; driftsatt inför 2027/28 **bara om trösklarna klaras**, annars avstängt och redovisat | B1 falsklarm ≤ 20 % · B2 missar ≤ 30 % · B3 mervärde ≥ 25 %; dom bara vid ≥ 20 halkhändelser över ≥ 3 halkperioder | jan–sep 2027 | Axel systemansvarig · Claude mätning |
| **M3 Testförarna** (AP3) | 40–70 förare, svar per varning och missar efter resan, enkät och gruppintervju | svaren som förarfacit i M1; enkät april 2027 och april 2028 | jan–apr 2027 · nov 2027–mar 2028 | Bengt |
| **M4 Granskningen** (AP4) | Oberoende granskning upphandlad efter beviljat bidrag, offert från minst tre parter; steg 1 metod före marsdomen, steg 2 resultat före rapporten; utlåtandet publiceras oavkortat | granskaren gör om klassningen på eget stickprov och reproducerar M2:s dom och felkarta | feb–jun 2027 | Bengt upphandlar |
| **M5 Rapporten** (AP5) | Metod, resultat, trösklarnas utfall oavsett vilket och granskarens utlåtande, publicerat; presentationer för Trafikverket och SKR | rapport och spridning juni 2027, slutrapport april 2028 | apr–jun 2027 · apr 2028 | Bengt |

**M0, förutsättningen (hösten 2026, inte sökt):** apparna hos förare före första frosten. Utan M0 finns inget förarfacit till M1
och M3. Kritiska vägen står i §5.

## 4. Milstolparna med domarna

Plikterna som återkommer (nycklar, databasens storlek, Actions-kassan, Ubuntu-bytet) står i `docs/KALENDERN.md` sedan 27/9
(DECISIONS #381) och upprepas inte här. Här står det som bär en dom, ett bygge eller ett beslut.

| När | Vad | Källa |
| :-- | :-- | :-- |
| inom 7 dygn efter första frostnatten | T-A steg 0, radarns bidrag mäts om, uppspelningen av S1:s nätter; frostgrindarna trycks om när ≥ 50 stationer haft ytan ≤ 0 °C | bedömningen S9, DECISIONS #352 |
| 23/10 | höjdkorrektionen läses om på fyra veckors fullständigt underlag, beslut före november | kort #96, DECISIONS #357 |
| 24/11 | premissmätningen av vägpunktsgrinden läses, en gång, med den finska bredvid som stöd; underlag för valet om grinden ska preciseras | kort #270, DECISIONS #434, #435 |
| senast 1/11 | Pro-beslutet om databasen, villkor för domarna | bedömningen §4.2, Axel |
| november | **betan till tolv testare:** slutet Play-test 14 dygn, efterhalkan som märkt beta om skuggloggen bär nätter och S3 är byggd; vattenplaningens radarspår döms nov–dec när underlaget räcker | bedömningen S5, mätningssidan §11 |
| 15/12 | Skyltfondens besked | ansökan |
| januari 2027 | **dom 1:** betans varningsregler på förar- och kamerafacit; golv nettonytt ≥ 5 %, tillkomna falsklarm ≤ 25 %; godkänd eller oavgjord ⇒ fortsätter, underkänd ⇒ tas bort | bedömningen S6, TROSKLAR-OVERGANGAR |
| ~~1 februari 2027~~ hösten 2026, i kuvösen | den enda kalibreringen, 48 punkter — på vintern 2024/25 i stället för på data november–januari (ändrat 1/10, DECISIONS #425) | TROSKLAR-KOMBINATIONEN D1–D7 |
| mars 2027 | **dom 2:** prognoslagrets grind B och C, försprånget, kombinationen, nederbördstypen (tidigast 1/3); kamerafacit öppnas och läses | TROSKLAR-SKUGGAN, -FORSPRANG, -NEDERBORDSTYPEN |
| april 2027 | enkät och gruppintervju 1; M4 steg 2 före rapporten | ansökan AP3, AP4 |
| apr–jun 2027 | rapport och spridning | ansökan AP5 |
| vintern 2027/28 | prognosen driftsatt om dom 2 höll; testförarnas andra vinter | ansökan AP2, AP3 |
| före 31/3 2028 | föreningens första årsmöte | `docs/forening/KORSCHEMA.md` |
| april 2028 | enkät 2 och slutrapport; projektet slutar 30/4 | ansökan |

Blindning: fram till domen redovisas antal, inte andelar. En tröskel får skärpas men aldrig lättas när utfallet är sett.

## 5. Kritisk väg till novemberbetan (M0)

Koden är i takt på båda plattformarna: iOS och Android bär 0.3.9 (18) från 26/9 (DECISIONS #377, #379). Det som avgör november
är distributionen och det som bara Axels händer kan göra. Sex steg, fem Axels.

| Steg | Vad som saknas | Kort |
| :-- | :-- | :-- |
| Play-vägen | Play-kontot finns sedan 20/9. Kvar: enhetsverifieringen i Play Console, första uppladdningen med Data safety-formuläret ifyllt likadant som filen, slutet test 14 dygn, produktion tidigast november | #219, #214 |
| iOS-byggena | (13) uppladdad 23/9 som App Store-kandidat; (14)–(18) på main utan arkivering; bygge (19) med fyra rättelser från provresan 28/9 hos Axel (`docs/TILL-AXEL-BYGGE-19.md`); Axel äger sekvenseringen mot App Store | #320 |
| Batteriet | iPhone mätt 27/9: 7 %/h på (14), inom budget. Android: batteripaketet Å0–Å6 efter fältrapporten, släppblockerare; mätningen på minst två fabrikat återstår; Å2/Å3 bär trösklar som Bengt och Axel beslutar | #262, #218 |
| Integritetssidan | omskriven 23/9; meningen om radering och raden om missar publiceras av Axel | #214 |
| Tolv testare | Axels åtagande 31/8 | tolv testare |
| Motorregeln S3 | efterhalkans regel i motorn, Axels bygge, väntar på S1-grinden: skuggloggen ska bära blöta frostnätter först. Utan S3 är novemberbetan dagens motor med facitknappar, ingen ny regel | bedömningen S3, #89 |

## 6. Utgångsläget vid fastställandet, 29/9 (uppdateras inte här)

- **M0.** Testkrets på iPhone via TestFlight sedan 31/8 och på Android ur CI-bygget sedan 20/9. 0 riktiga förarsvar, 0 riktiga missar. Ingen Android-version har gått ut via Play.
- **M1.** Skuggmotorn 80 rutter sedan 29/8, 144 av 144 varv 25–28/9. Kamerafacit 988 bilder, 41 klassade blint, ingen halka. Tystnadsfelet 2 av 20 tillfällen. Inget vinterunderlag: 27/9 var 1 av 1 298 stationer kall.
- **M2.** Grind A klarad 23/9 och igen 28/9 (0,74 °C, 3,7 %). Vägpunktsgrinden föll 28/9 (rå viktning 6,9 % grova fel) och är bokförd (#399); skuggan fortsätter som mätning, ingen mer byggtid i höst. Grind B och C har 0 av 20 halkhändelser.
- **M3.** 40–70 testförare rekryteras från januari; tolv i november.
- **M4, M5.** Inget påbörjat; granskningen upphandlas efter beviljat bidrag.
- **Drift.** Databasen 186 MB av 500. Actions september 5 916 min ⇒ 31,33 USD mot budget 35; inga app-byggen resten av september. Kuvösen väntar på Trafikverkets beslut, inget annat (#388).

## 7. Så används bladet

- Varje kort och varje NU-rad anger vilket mål den tjänar, M0–M5. Ett kort som inte tjänar något mål är hygien med tak, eller stryks.
- Läget mäts, inte skrivs: måndagsserien (grind A, höjdprovet, populationsläsningen, kassavakten) och facitvakterna är källan till
  bedömningens läge överst.
- Ett kort vars rubrik verkligheten har motbevisat får raden *↪ överspelad* med datum och bevis, samma varv som det upptäcks
  (TAVELREGELN 3). Kort #219:s rubrik stod nio dagar efter att Android hunnit i kapp.
- Snapshotsidorna (systembild, app, mätningar) är vyer. De regenereras vid tre milstolpar, novemberbetan, 15/12 och dom 1, och
  redigeras aldrig bitvis.
- Bladet ändras bara med ett DECISIONS-nummer. Ett mål stryks aldrig tyst; ett mål som faller redovisas, som M2:s driftsättning.
