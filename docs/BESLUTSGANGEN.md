# Beslutsgången — Axel, Bengt, Claude

Skriven 31 augusti 2026 efter en dag där två planer för samma problem växte fram parallellt
utan att någon visste om den andra: Axel och Claude byggde broarna (#38a) medan Bengt skrev
byggplan v3 om segmentmotorn. Båda hade rätt. Ingen var osams. Men det var två sanningar,
och det kostar mer ju större projektet blir.

Det här dokumentet löser inte oenighet — det gör oenighet **synlig i tid**.

## 1. Vem äger vad

| Fråga | Ägare | Var beslutet skrivs |
|---|---|---|
| Vad rösten säger, vad appen gör, hur den ser ut | **Axel** | DECISIONS.md |
| Vad som byggs härnäst och när — prioritering av Axels tid | **Axel** | TAVLA.md |
| Datakällor, kontakter, myndigheter, registreringar | **Bengt** | DECISIONS.md |
| Granskning: håller siffrorna? är metoden ärlig? | **Bengt** | söndagsgranskningen |
| Tekniska vägval, arkitektur, hur något byggs | **Claude** | koden + DECISIONS.md |
| Om ett bygge är klart och bevisat | **Claude** | STATUS.md |

Gränsfall avgörs av en enda fråga: **kostar det Axels tid?** Då är det Axels beslut, hur
bra förslaget än är. Bengt skriver det själv i v3 ("sekvenseringen mot lanseringsarbetet är
Axels") — regeln är bara att den ska gälla utan att någon behöver påminna.

## 2. Ett ställe, inte två

**TAVLA.md är sanningen.** Allt som ska göras står där, med namn på den som äger det.
En plan i ett dokument som inte finns på tavlan finns inte.

- Bengts planer och utredningar läggs i `docs/` **och** bryts ut till kort på tavlan.
- Claude gör utbrytningen när Bengt levererar — Bengt ska inte behöva lära sig git-format.
- Beslut som fattas i en chatt hamnar i DECISIONS.md samma varv. Utan undantag.

## 3. Kortregeln — i stället för möten

Axel och Bengt pratar dagligen. Problemet var aldrig hur ofta, utan **var besluten hamnar**.
Så: inget nytt möte. En regel i stället.

**Allt som ska göras blir ett kort på tavlan när det bestäms** — oavsett var samtalet ägde
rum, telefon, mejl eller chatt. Claude skriver kortet; den som bestämde behöver bara säga
till. Ett kort har ägare och en 🔑-rad om vad som krävs för att räknas som bevisat.

Tre saker följer av det:
- En idé som inte blivit ett kort är inte bortglömd — den är inte beslutad än. Det är okej.
- Ett bygge räknas som klart först när 🔑-raden är avbockad. "Byggt" ≠ "bevisat".
- Väljs något bort skrivs det ner som bortvalt, inte glömt, så det inte kommer tillbaka
  som en ny idé om tre veckor.

Bengts söndagsrutin fortsätter som granskning — men den är inte platsen där beslut fattas.
Beslut fattas när de fattas, och skrivs ner då.

## 3b. Bengt pratar med koden själv

Roten till 31 augusti var inte oenighet — det var att Bengt inte kan fråga repot. Han
skriver planer om ankarklippning till någon som ska räkna åt honom, och skriver tre
versioner på en kväll för att kompensera. Lösningen finns i `docs/BENGT-CLAUDE-KODEN.md`:
Claude Desktop mot Halkvakt-mappen, ingen terminal, svenska frågor. Då kan han köra sin
egen offsetbacktest i stället för att beskriva den.

## 4. Byggplanen — rullande, inte fastlagd

Vi planerar **två genomgångar framåt**, inte ett halvår. Skälet är att varje vecka hittills
har ändrat vad som var viktigast: självväckningen kom av en fråga, broarna av en annan.
En sexmånadersplan hade missat båda.

Formatet på tavlan är redan rätt: **ett kort per sak, med ägare, och en 🔑-rad om vad som
krävs för att det ska räknas som bevisat.** Det behövs inget nytt verktyg.

## 4b. Ta kortet innan du bygger

Den 1 september byggde Axel och Bengt samma sak tre gånger på ett dygn: DECISIONS-numret
#52, grind A-skriptet, och nästan vattenplaningskortet. Ingen gjorde fel — men ingen såg
vad den andra just börjat på.

**Regeln: bocka av kortet som "pågår" med ditt namn, i en commit, INNAN du skriver koden.**
Det tar tio sekunder och syns i loggen. Är kortet redan taget: skriv i stället en rad om
vad du hade tänkt göra, så slås idéerna ihop i stället för att kollidera.

## 5. Regeln som skyddar oss mot oss själva

Ett bygge som kan dömas bort ska ha sina **trösklar skrivna före första körningen**
(DECISIONS #51). Annars flyttas målstolparna när siffrorna kommit — inte av ohederlighet,
utan för att något färdigbyggt vill leva. Detta gäller skuggmotorn, och allt liknande efter den.
