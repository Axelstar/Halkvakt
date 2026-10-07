# Dokumentsynken — förslag: styrdokumenten stäms av varje dygn (kort #304)

Bengts fråga 7/10: *"hur ska vi åstadkomma att alla de här dokumenten blir uppdaterade en gång per dag och fångar det som har
gjorts både av axel och mej i olika sessioner så att vi aldrig mer behöver hamna i den här situationen att dokumenten glider i sär
och jag inte har någon aning om vad som förväntas"*. **Beslutat 7/10 (DECISIONS #484):** Bengt sa *"bygg enligt ditt förslag"*, alltså ja till alla fyra med rekommendationen.
Reglerna står i CLAUDE.md, avsnittet DOKUMENTSYNKEN.

## 1. Problemet, mätt 7/10

Genomgången 7/10 (DECISIONS #483, PR #799) behövde ett sjuttiotal rättelser i handtexten. Sex av de sju stomdokumenten stod på
läget 25/9–2/10. APPEN sa 0.3.9 (19) fast koden bar 0.3.11 (23), och integrationskartan sa noll förarsvar fast de var 32.
Projektkartan visade ändå delen *Stomdokumenten och kortkartan* som grön, med steget *Stämd mot senaste beslut* klart.

## 2. Varför det händer

- **Ingen vakt läser handtexten.** CI prövar de genererade blocken, alltså lägesraderna och listorna över öppna kort. När ett skript
  skriver om dem får filen dagens datum i `git log`, och det var just det beviset kartan bokförde 3/10.
- **Regeln *samma varv* hänger på minnet.** 7/10 kom nio beslut (#474–#482) i åtta PR:er, och ingen av dem rörde handtexten.
- **Kartsynken bokför commits på kartan**, inte på dokumenten (DECISIONS #447).
- **Det schemalagda varvet stängdes av 6/10.** Det låg i Claude-appens lokala schema och hängde två gånger på sitt första kommando.
- **Arbetet sker på flera ställen.** Under fjorton dygn kom 215 commits under Bengts namn, 17 under Axels och 19 från sessioner som skriver
  som Claude. Bara CI ser alla.

## 3. Lösningen, i tre delar

**(a) Stomvakten — en vakt vid källan, i CI.** Varje nytt inlägg i DECISIONS slutar med en rad som namnger de stomdokument beslutet
rör, till exempel `**Stomdokument:** MAT, SYS`, eller `**Stomdokument:** inga` med ett skäl. Ett skript, `scripts/stomvakten.ts`,
körs i ci.yml och md-vakt.yml och läser bara inlägg som lagts till i pushen eller PR:en. Det fäller ett inlägg utan raden. Det fäller
också ett namngivet dokument vars handtext inte ändrats i samma push eller PR. Handtext betyder filen med de genererade blocken
bortskalade, så en omskriven lägesrad räknas inte. Vakten gäller varje session på varje enhet, eftersom CI kör på allt. Den kan inte
avgöra om ett *inga* är sant; det gör avstämningen i (b).

**(b) Dagens avstämning — en rutin i molnet varje morgon.** En rutin i claude.ai, samma slag som de sexton avläsningar som gick
igenom i september, kör kl. 05:30 svensk tid. Den är inte bunden till Bengts dator och väntar inte på någon behörighet. Den gör tre
saker:
1. Kartsynken, alltså signalerna och bokföringen, och kortgenomgången.
2. Stomgenomgången: allt som hänt sedan förra avstämningen läses mot handtexten i de sju plus KALENDERN och TAVLA. Det gäller
   commits på main från alla, nya beslut, STATUS-rader och sammanslagna och öppna PR:er.
3. Rättelserna läggs i grenen `dokumentsynk/<datum>` och en PR med rubriken *Dokumentsynk: <datum>*.

Finns inget att rätta skriver rutinen en STATUS-rad om det, så att en tyst morgon inte ser ut som en lyckad. Om rutinen kan
republicera artefakterna är oprövat; kan den inte, gör dagens första session det.

**(c) Vad väntar på mig — överst i projektkartan.** Två korta listor, *Väntar på Bengt* och *Väntar på Axel*, skrivs av
`projektkartan.ts` ur tavlans avsnitt för Bengt och Axel, med kortens nyckelrad, och ur kartsynkens lista över öppna PR:er som
väntar på ett ord. Listorna ändras aldrig för hand, och rutinen i (b) håller dem aktuella varje morgon.

## 4. Vad det hade gjort 7/10

Stomvakten hade stoppat PR #791–#798 tills MATNINGAR, KUVOSEN och SYSTEMBILDEN rättats i samma PR. Morgonrutinen 7/10 hade sett att
APPEN sa 0.3.9 (19) dagen efter att Axel laddat upp 0.3.11 (23).

## 5. Vad som krävs av människor

Bengt väljer (a)–(d) nedan och läser morgonens PR när han vill. Axel behöver inte göra något: vakten gäller hans sessioner av sig
själv, och CLAUDE.md säger hur raden skrivs.

## 6. Kostnad

Inga nya tjänster och inga nya Actions-flöden. Stomvakten är några sekunder i ci och md-vakt, som redan kör. Rutinen är en
Claude-session per dygn på Bengts abonnemang, tyngst de dagar mycket har hänt.

## 7. Det som valdes bort

- **Öppna behörigheterna i appens lokala schema.** Det kräver att datorn är på och att kommandon får köras utan att någon ser dem.
  Schemat hängde två gånger.
- **Claude i GitHub Actions.** Det kräver en API-nyckel, som är en betald tjänst, och Actions-minuter, vilket Bengts regel 22/9 utesluter.
- **pg_cron i Supabase.** Det kan räkna och larma men inte skriva om text med omdöme.

## 8. Vad det inte löser

En avstämning kan läsa fel, och PR:en är stället där det syns. Maskinvägen kan också bocka fel: 7/10 kväll bockade regeln
`inlamnad:0.3.9` App Store-steget på en inlämning som App Review avvisat 5/10, eftersom en regel som bara går framåt inte ser en
avvisning. Bocken togs bort och regeln flyttades till 0.3.11. En rutin utan människa måste därför läsa varje maskinbock mot beviset
innan den slås ihop. Integrationskartans innehåll är fortfarande fryst och öppnas med ett
beslut. Republiceringen beror på om rutinen får publicera.

## 9. Bengts val

- **(a)** Stomvakten i CI: ja eller nej.
- **(b)** Morgonrutinen kl. 05:30: ja, nej eller en annan tid.
- **(c)** Listorna *Väntar på Bengt* och *Väntar på Axel* överst i kartan: ja eller nej.
- **(d)** Får rutinen slå ihop sin egen PR på grön CI när den bara rör dokumenten — de sju, KALENDERN, TAVLA, STATUS och kartan — som
  kartsynkens kartgrenar? Eller väntar den på ditt ord? Rekommendationen är att den slår ihop själv, eftersom en avstämning som väntar
  på ett ord glider isär igen de dagar ordet inte kommer.
