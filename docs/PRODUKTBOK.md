# 📖 PRODUKTBOKEN — Halkvakt genom användarens ögon

Levande dokument (regel i CLAUDE.md): **ändras något användaren ser, hör eller
gör, uppdateras den här boken i samma varv** — med färska skärmbilder från
fotostudion (CI fotar tre skärmar vid varje push). Teknikens djup bor i
SYSTEM.md; här bor upplevelsen.

*Uppdaterad 2026-08-29 · speglar Android v0.3.0 + åldersvakten + vilt-datat*

---

## Vad är Halkvakt? (30 sekunder)

En app du startar när du sätter dig i bilen — sedan lägger du undan telefonen.
Halkvakt lyssnar på Trafikverkets mätstationer och rapporterade väglag och
**säger till med rösten** (i högtalaren eller bilens Bluetooth) när något farligt
finns framför dig: halka, frysrisk, olyckor, vilt, fartkameror. Ingen skärm att
titta på, inget konto, ingen position som lämnar telefonen. Tystnad är
grundläget — pratar den, betyder det något.

## Så ser den ut

| Vakten | Inställningar | Om |
|---|---|---|
| ![Vakten](produktbok/shot-1-vakten.png) | ![Inställningar](produktbok/shot-2-installningar.png) | ![Om](produktbok/shot-3-om.png) |

*(Körläget — skärmen med det stora varningskortet under färd — fotas i nästa
utbyggnad av fotostudion.)*

## Första gången (2 minuter)

Introduktionen visas en gång, fyra sidor. Allt går att hoppa över och ändra senare;
den kan visas igen från Inställningar.

1. **Löftet** — vad Halkvakt gör, och att positionen aldrig lämnar telefonen.
2. **Platsen** — *Tillåt plats* ("Vid användning"). Nästa gång du kör frågar iOS om
   "Alltid", som behövs för att rösten ska tala med släckt skärm.
3. **Bannern** — *Tillåt notiser*, så att varningen syns över kartappen.
4. **Autostart** — bygg automationen i Genvägar (guiden med utlösarna finns här).
   En gång, sedan aldrig mer. Vakten stoppar sig själv när bilen stått still en kvart.

Klar. Inga konton, ingen e-post, inga fler frågor.

*(Android: behörigheterna frågas i trappa första gången man trycker Starta; autostarten
lär sig bilen själv. Samma introduktion byggs där i nästa varv.)*

## De tre flikarna

**🛡 Vakten** — hjärtat. En stor knapp startar/stoppar vakten. Under den:
LIVEDATA-pillen och raden **"N faror · väglag 06:10"** — tiden är *datans*
ålder, inte nedladdningens (så du ser om underlaget är färskt). Kategoriswitchar
låter dig stänga av t.ex. fartkameror; av-slagen kategori varnar aldrig.

**🚗 Körläge** — det du ser om telefonen sitter i hållaren: mörk skärm, stora
siffror (hastighet, avverkad sträcka, antal varningar) och när något händer ett
**varningskort i 8 sekunder** med samma text som rösten just sa. Byggd för att
ögonen ska stanna på vägen.

**📍 Nära dig** — listan över faror inom närområdet just nu, sorterade på
avstånd, med riktning. För nyfikenhet före avfärd — under körning sköter rösten
allt.

**⚙️ Inställningar** — förvarningsavståndet (hur långt i förväg rösten ska
tala, skjutreglage), röst av/på per kategori.

**ℹ️ Om** — löftet i klartext: *"Din position lämnar aldrig telefonen. Vi
samlar in: ingenting."* Plus ärlighetsraden: *"Varnar vid Trafikverkets
mätstationer och rapporterade väglag — mellan stationerna är vägen oövervakad."*

## Exakt vad rösten säger

| När | Frasen |
|---|---|
| Lindrig olycka framför dig | "Olycka rapporterad 3 kilometer framför dig." |
| **Allvarlig olycka — tidigt ropet, ca 10 km** | "Allvarlig olycka 10 kilometer framför dig — stor påverkan på trafiken. Överväg annan väg. Beräknas röjd vid 14:20." |
| **Allvarlig olycka — påminnelsen, ca 2 km** | "Sakta ner — olycksplats strax framför dig." |
| **Allvarlig olycka du kom nära utan att höra det tidiga ropet** | "Allvarlig olycka 2 kilometer framför dig — stor påverkan. Sakta ner." |
| Rapporterad halka på din väg | "Varning: halka rapporterad på vägen framför dig." |
| Mätstation visar frysrisk | "Isrisk framöver — vägbanan nära noll grader." |
| Färsk viltolycka i området | "Viltrisk — vanlig olycksplats för älg den här tiden." |
| Fartkamera | "Fartkamera om 500 meter. Gränsen är 80." |
| Väglagsdatat är gammalt (en gång per körning) | "Ingen färsk väglagsdata – kör som om det kan vara halt." |

**Allvarlig olycka — varför två gånger?** Trafikverket klassar varje olycka efter
hur mycket den påverkar trafiken. Är påverkan *mycket* stor — riktigt stopp — säger
Halkvakt till *tidigt*,
runt en mil innan, medan det fortfarande finns avfarter kvar att välja. Det är
hela poängen: du ska hinna bestämma dig innan du sitter fast. Sedan kommer en
kort påminnelse strax innan olycksplatsen, som bara handlar om farten.
Röjningstiden läses upp när Trafikverket angett en.
Halkvakt räknar **aldrig** ut omvägen åt dig — det gör din kartapp. Vi levererar
beslutet i tid, du väljer vägen. Inga knappar att trycka på under körning.

**Röstens uppförandekod:** aldrig mer än en varning per 45 sekunder; samma fara
upprepas först efter 10 minuter *och* 5 km (enda undantaget är den allvarliga
olyckans två steg ovan, som är två olika budskap — inte samma sagt två gånger); står två faror samtidigt framför dig
vinner den allvarligaste (olycka > halka > frysrisk > vilt > kamera) och den
andra **droppas** — köas aldrig upp till tjat. Under 15 km/h: tyst (du står
still eller kör på parkering).

## Flöde 1 — en körning

```mermaid
flowchart TD
    A[Du trycker Starta vakten] --> B[GPS börjar lyssna<br/>skärmen kan släckas]
    B --> C{Färsk vägdata?}
    C -- "äldre än 45 min" --> D["🔊 En gång: Ingen färsk väglagsdata –<br/>kör som om det kan vara halt"]
    C -- färsk --> E[Motorn vakar tyst]
    D --> E
    E --> F{Fara i korridoren<br/>framför dig?}
    F -- nej --> E
    F -- ja --> G["🔊 Rösten talar<br/>+ varningskort 8 s i körläget"]
    G --> H[45 s garanterad tystnad]
    H --> E
```

## Flöde 2 — datans väg till din högtalare

```mermaid
flowchart LR
    TV[Trafikverket<br/>väglag · stationer · olyckor] --> I[Insamling<br/>varje minut/timme]
    PO[Polisen<br/>viltolyckor] --> I
    SM[SMHI<br/>varningar] --> I
    I --> S[Snapshot byggs<br/>var 30:e minut]
    S --> T[Telefonen hämtar<br/>+ verifierar äkthet]
    T --> Å{Åldersvakten:<br/>är datat färskt?}
    Å -- ja --> M[Motorn i telefonen<br/>position möter faror]
    Å -- "gammalt väglag" --> M2[Gammalt filtreras bort<br/>+ en ärlig röstrad]
    M2 --> M
    M --> R[🔊 Din högtalare]
```

Allt till höger om "Telefonen hämtar" sker **lokalt i din telefon** — därav
löftet: positionen möter faroläget hos dig, aldrig hos oss.

## Vad appen inte gör

Ingen prognos (varnar på uppmätt läge, inte gissningar), tyst mellan
mätstationerna, ingen ködetektion ännu (kommer som uppdatering 1). Hela ärliga
listan: [SYSTEM.md §4](SYSTEM.md).

## iOS då?

Samma app, samma röst, samma löfte — skriven och väntar på sitt första bygge
på Axels Mac (måndag). Produktboken gäller båda; skiljer sig något kommer det
stå här.


## iOS-utgåvan (byggd 29/8 2026)

Samma tre flikar, samma texter, samma motor — skillnaderna är plattformens:
flikraden är iOS 26:s svävande "glaspill" i stället för Androids fasta rad,
och överst på varje flik sitter varumärkesraden **⚠ HALKVAKT** med en liten
statuspill till höger på Vakten-fliken (LIVEDATA i vila, VAKTEN PÅ under
körning). Skärmbilder tas från Axels iPhone (CI:n kan bara fota Android).

## Autostart i bilen

**Android:** vakten startar själv. Första gången du kör med Halkvakt igång lär sig
appen vilken Bluetooth-enhet som är bilen; nästa gång bilen kopplar upp startar vakten
utan att du gör något, och stannar när bilen kopplas från. Rörelseigenkänning täcker
även bilar utan Bluetooth. Inget att ställa in.

**iPhone:** Apple låter inte appar starta sig själva. Vägen runt är en automation i
Genvägar som du bygger en gång. Guiden — i introduktionen och under Inställningar →
*Autostart i bilen* — ställer först **en fråga: hur kopplar du telefonen i bilen?** och
visar sedan bara de steg som gäller dig:

Knappen *Öppna Genvägar på Ny automation* kommer först och landar på listan över
utlösare. Sedan ett steg per skärm, med det du trycker på i fetstil:

- **CarPlay:** tryck *CarPlay* → bocka *Ansluts* → *Kör direkt* → skriv Halkvakt → *Starta
  vakten* → Klar. Startar när bilens skärm tänds.
- **Bluetooth:** tryck *Bluetooth* → din bil, *Är ansluten* → *Kör direkt* → skriv Halkvakt →
  *Starta vakten* → Klar. Startar när bilen vaknar, bara i din bil.
- **Inte alls:** två delar. Del 1 i Inställningar: *Fokus → Kör → Aktivera automatiskt → När
  du kör*. Del 2 i Genvägar: tryck *Fokus → Kör* → bocka *Slås på* → *Kör direkt* → skriv
  Halkvakt → *Starta vakten* → Klar. Telefonen känner av körningen själv.

Knappen *Öppna Genvägar på Ny automation* i guiden landar direkt på rätt skärm. Går du
in i Genvägar själv: det är fliken **Automation längst ner i mitten** — inte + uppe till
höger på första fliken, det skapar en genväg, inte en automation. Utlösarna (CarPlay,
Bluetooth, Fokus, App) är en lista du scrollar i, inget man söker efter.

I alla tre: välj *Kör direkt* (inte *Fråga innan*). **Det räcker.** Vakten stoppar sig
själv när bilen stått still i en kvart. Svaret går att byta i Inställningar.

Ge Halkvakt platsen **"Alltid"** så startar vakten tyst i bakgrunden och kartan stannar
kvar på skärmen. Med "Vid användning" visas Halkvakt en kort stund vid starten och du
växlar tillbaka till kartan. Siri fungerar också: *"Starta Halkvakt"*. Appen lämnar
aldrig din position ifrån sig — det gäller precis lika vid autostart.

## Bannern över kartappen

Kör du med Google Maps eller Apple Kartor framme ligger Halkvakt i bakgrunden. När
rösten varnar visas då en kort banner högst upp — samma ord som rösten säger — i åtta
sekunder, sedan försvinner den själv. Ingen knapp, inget att trycka på, inget ljud
utöver rösten. Bannern är ögats kvitto; rösten är budskapet.

Har du Halkvakt framme visas i stället varningskortet i appen. På iPhone bryter bannern
igenom Fokus-läget "Kör". Första gången vakten startar frågar telefonen om notiser får
visas — säg ja, annars uteblir bannern (rösten talar ändå).

## Senast sagt

Hemskärmen visar förra körningens sista replik med datum och tid, även när vakten är av.
Har rösten aldrig behövt säga något står det så — tystnad är en funktion.
