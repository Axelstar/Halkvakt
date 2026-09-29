# Målbladet — vart Halkvakt är på väg, och när det är klart

**Status: FASTSTÄLLT 29/9 2026 (Bengt, DECISIONS #401). Fryst som integrationskartan:** bladet ändras bara med ett nytt
DECISIONS-nummer, aldrig löpande. Det säger *vart* och *när*. Var vi står läses i bedömningens läge överst, inte här.
Källorna är Skyltfondsansökan (`docs/skyltfonden-2026-09-28/bilaga-1-ansokan.md`, arbetspaketen), bedömningens §6.4 och
kalendern i §2–§3, och tröskeldokumenten. Ett tal som står här och i källan ska vara samma tal; skiljer de sig gäller källan
och bladet rättas.

## 1. Slutmålet, i en mening

En gratis app som med rösten varnar bilföraren för halka på vägen framför, byggd enbart på Trafikverkets öppna data, utan att
någon position lämnar telefonen automatiskt, med träffsäkerhet, falsklarm och missar **uppmätta mot oberoende facit och öppet
redovisade** efter två vintrar, 2026/27 och 2027/28. Driven av Föreningen Halkvakt, rapporterad till Skyltfonden i april 2028.

## 2. "Klart" betyder (bedömningen §6.4, fastställd här)

1. Varje vinterlänk har gått hela kartans sekvens: publicerad · mätt i skuggan · villkoret ändrat · tre portar gröna.
2. Varje dom som TROSKLAR-dokumenten föreskriver har avgetts en gång: dom 1 i januari 2027, dom 2 i mars 2027.
3. Alla tre facitkällorna har levererat över sina golv (V-C: ≥ 200 varningar, ≥ 15 facit, ≥ 5 regndygn, ≥ 3 län).
4. Inget öppet kort utanför kalendern.

Systemet är därför inte stängbart före mars 2027. Det är ett ärligt svar.

## 3. De fyra målen = ansökans arbetspaket (283 000 kr, januari 2027 – april 2028)

| Mål | Vad vi lovat | Måttet eller tröskeln | När | Ägare |
| :-- | :-- | :-- | :-- | :-- |
| **M1 Utvärderingen** (AP1) | Varje varning klassad mot fyra facitkällor (kamera, SMHI, rapporterad halka, station) och förarfacit; missandelen mätt på två oberoende sätt; omkörning på arkivet med ändrade trösklar | träffsäkerhet, falsklarmsandel och missandel per vecka, varningstyp och rutt | jan–apr 2027 | Bengt analys · Claude verktyg |
| **M2 Prognoslagret** (AP2) | Skuggdriftens prognoser dömda mot förhandsdaterade trösklar; nationell felkarta; driftsatt inför 2027/28 **bara om trösklarna klaras**, annars avstängt och redovisat | falsklarm ≤ 20 % · missar ≤ 30 % på täckta avsnitt · mervärde ≥ 25 %; dom bara vid ≥ 20 halkhändelser över ≥ 3 halkperioder | jan–sep 2027 | Axel systemansvarig · Claude mätning |
| **M3 Testförarna** (AP3) | 30–50 förare, svar per varning och missar efter resan, enkät och gruppintervju | svaren som förarfacit i M1; enkät april 2027 och april 2028 | jan–apr 2027 · nov 2027–mar 2028 | Bengt |
| **M4 Rapporten** (AP4) | Metod, resultat och trösklarnas utfall oavsett vilket, publicerat; presentationer för Trafikverket och SKR | rapport och spridning juni 2027, slutrapport april 2028 | apr–jun 2027 · apr 2028 | Bengt |

**M0, förutsättningen (hösten 2026, inte sökt):** appen hos förare före första frosten — App Store, Android i Play, betan till tolv
testare i november med facitknapparna påslagna. Utan M0 finns inget förarfacit till M1 och M3.

## 4. Kalendern med domarna

| När | Vad | Källa |
| :-- | :-- | :-- |
| 3/10 2026 | bildfacitets sjudygnsavläsning (V1–V3 i drift sedan 26/9) | kort #260 |
| 23/10 | höjden läses som varianspredikator | bedömningen Ä5, DECISIONS #357 |
| oktober | #83 steg 2 (export), villkor för domarna | bedömningen S12 |
| 15/11 | PAT roterad, bevisad med en publicering | bedömningen N3, Axel |
| november | **betan till tolv testare** — tre facitkällor börjar fyllas | bedömningen S5 |
| 15/12 | Skyltfondens besked | ansökan |
| januari 2027 | **dom 1:** betans varningsregler på förar- och kamerafacit; golv nettonytt ≥ 5 %, tillkomna falsklarm ≤ 25 % | bedömningen S6, TROSKLAR-OVERGANGAR |
| 1 mars 2027 | nederbördstypens dom ur arkivet | bedömningen Ä2, TROSKLAR-NEDERBORDSTYPEN |
| mars 2027 | **dom 2:** prognoslagret mot M2:s trösklar | TROSKLAR-SKUGGAN, ansökan AP2 |
| april 2027 | enkät och gruppintervju 1 | ansökan AP3 |
| apr–jun 2027 | rapport och spridning | ansökan AP4 |
| vintern 2027/28 | prognosen driftsatt om dom 2 höll; testförarnas andra vinter | ansökan AP2, AP3 |
| före 31/3 2028 | föreningens första årsmöte | `docs/forening/KORSCHEMA.md` |
| april 2028 | enkät 2 och slutrapport; projektet slutar 30/4 | ansökan |

Blindning: fram till domen redovisas antal, inte andelar. En tröskel får skärpas men aldrig lättas när utfallet är sett
(ansökan, Metod).

## 5. Kritisk väg till novemberbetan (M0)

Fem kort avgör om november händer. Fyra är Axels, ett är Bengts och Axels. Inget annat på tavlan blockerar M0.

| Kort | Vad som saknas | Varför det blockerar |
| :-- | :-- | :-- |
| #219 | Android sju versioner efter, Play-kontot saknas | Android-testare kan inte få appen |
| #214 | Play-deklarationen osann sedan facitknapparna 16/9 (Bengt + Axel) | avslag eller nedtagning mitt i facitfönstret |
| #218 · #262 | batteribudgeten aldrig mätt; batteripaketet, sju åtgärder | släppblockerare enligt CLAUDE.md, < 8 %/h |
| tolv testare | Axels åtagande 31/8 | utan förare inget förarfacit |
| #320 | App Store-lanseringen, kvar bara raderingsfrågan (a) | iOS-testare utanför TestFlight |

Motorns del av M0, efterhalkans regel med tre portar (bedömningen S3), är Claudes och ligger inte på kritiska vägen förrän
apparna gör det.

## 6. Så används bladet

- Varje kort och varje NU-rad anger vilket mål den tjänar, M0–M4. Ett kort som inte tjänar något mål är hygien med tak, eller stryks.
- Läget mäts, inte skrivs: måndagsserien (grind A, höjdprovet, populationsläsningen, kassavakten) och facitvakterna är källan till
  bedömningens läge överst.
- Snapshotsidorna (systembild, app, mätningar) är vyer. De regenereras vid tre milstolpar, novemberbetan, 15/12 och dom 1, och
  redigeras aldrig bitvis.
- Bladet ändras bara med ett DECISIONS-nummer. Ett mål stryks aldrig tyst; ett mål som faller redovisas, som M2:s driftsättning.
