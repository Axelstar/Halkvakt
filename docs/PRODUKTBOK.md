# 📖 PRODUKTBOKEN — Halkvakt genom användarens ögon

Levande dokument (regel i CLAUDE.md): **ändras något användaren ser, hör eller
gör, uppdateras den här boken i samma varv** — med färska skärmbilder från
fotostudion (CI fotar tre skärmar vid varje push). Teknikens djup bor i
SYSTEM.md; här bor upplevelsen.

*Uppdaterad 2026-09-13 · speglar iOS 0.3.5 (8) med skinnet v3, självväckningen, fyra
länder, broarna och den prioritetsmedvetna rösten. Android (0.3.1) släpar efter på skinnet
— Play-lanseringen väntar på tolv testare. Skärmbilderna nedan är från Android v0.3.0 och
visar gårdagens utseende; iOS ser ut som avsnittet "Skinnet" beskriver.*

---

## Vad är Halkvakt? (30 sekunder)

En app du startar när du sätter dig i bilen — sedan lägger du undan telefonen.
Halkvakt lyssnar på Trafikverkets mätstationer och rapporterade väglag och
**säger till med rösten** (i högtalaren eller bilens Bluetooth) när något farligt
finns framför dig: halka, frysrisk, olyckor, vilt, fartkameror. Ingen skärm att
titta på, inget konto, ingen position som lämnar telefonen. Tystnad är
grundläget — pratar den, betyder det något.

## Så ser den ut

| Vakten | Inställningar | Om (nu sist i Inställningar) |
|---|---|---|
| ![Vakten](produktbok/shot-1-vakten.png) | ![Inställningar](produktbok/shot-2-installningar.png) | ![Om](produktbok/shot-3-om.png) |

*(Bilderna är Android v0.3.0. iOS 0.3.5 har skinnet v3 — se avsnittet nedan. Om-fliken
finns inte längre: två flikar, Om är sista avsnittet i Inställningar.)*

## Skinnet (v3, iOS 0.3.3 →)

Ritat om från grunden 31/8 och portat till iOS samma kväll. Mörkt, tyst, ett ord i taget.

**Hemskärmen säger ett ord: "Redo."** — i stort, i Instrument Sans. Under det en grön knapp,
*Starta vakten*. Ingen karta, inga siffror att tolka. Under knappen ett litet kvitto:
*"Ingen tur än."* eller *"Vaknade själv 07:14 · körde 38 min"* — det senare är
självväckningens spår (se nedan).

**Körläget:** *PÅ VAKT* i grönt, resan i siffror (*"42 min · 38 km"*), tre räknare
(varningar, halka, vilt), en gul panel *Senast sagt*, och listan *På din väg*. Längst ner
en konturknapp *Avsluta vakten*. Håll fingret på *PÅ VAKT* en sekund så visas ett
demo-varningskort — så du kan se hur det ser ut utan att vänta på is.

**Varningskortet:** helgult. Överst triangeln — Halkvakts märke, aldrig farans ikon.
Under den farans namn i 64 punkter med farans egen ikon intill, avståndet i monospace,
rösten i kursiv, och en stapel som rinner ner under åtta sekunder. **Ingen knapp** — du ska
inte trycka på något i en bil.

**Ikonsetet:** fem faror, fem former, en linje. *Halt väglag* är bilen som tappar greppet
(vågspåren redan gjorda — det ÄR halt). *Frysrisk* är termometer och iskristall (det KAN
bli halt). *Olycka* är samma bilkropp med en islagsstjärna. *Vilt* är ett hjorthuvud
framifrån, hornen bär igenkänningen. *Fartkamera* är en låda på stolpe, den enda på stolpe.
Samma fem på iOS och Android.

**Två flikar, inte tre.** Om-innehållet — löftet, ärlighetsraden, dataattributionen — är
sista avsnittet i Inställningar. Inget att leta efter, inget att missa.

## Första gången (2 minuter) — introduktionen

Fyra sidor, helskärm, en gång. Sida två ber om plats och trappar upp till *Tillåt alltid*
(iOS visar "medan appen används" först — Halkvakt frågar en gång till). Sida tre ber om
notiser för bannern. **Båda sidorna kvittar**: en grön bock när det är klart, en gul rad
med vägen till Inställningar om du sa nej. Sida fyra: *"Du är klar."* — Siri och
självväckningen är huvudvägen; Genvägar är valfritt under Inställningar. Vill du se
introduktionen igen finns *Visa introduktionen igen* längst ner i Inställningar.

Introduktionen visas en gång, fyra sidor. Allt går att hoppa över och ändra senare;
den kan visas igen från Inställningar.

1. **Löftet** — vad Halkvakt gör, och att positionen aldrig lämnar telefonen.
2. **Platsen** — *Tillåt plats* ("Vid användning"). Nästa gång du kör frågar iOS om
   "Alltid", som behövs för att rösten ska tala med släckt skärm.
3. **Bannern** — *Tillåt notiser*, så att varningen syns över kartappen.
4. **Du är klar** — två sätt att starta: knappen i appen, eller *"Hej Siri, starta
   Halkvakt"* med telefonen i facket. Inget mer att ställa in. Vakten stoppar sig själv
   när bilen stått still en kvart. Helautomatisk start i bilen är valfritt och finns
   under Inställningar → Autostart i bilen.

Klar. Inga konton, ingen e-post, inga fler frågor.

*(Android: behörigheterna frågas i trappa första gången man trycker Starta; autostarten
lär sig bilen själv. Samma introduktion byggs där i nästa varv.)*

## Flikarna (två sedan 31/8)

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

**ℹ️ Om** (sista avsnittet i Inställningar) — löftet i klartext: *"Din position lämnar
aldrig telefonen. Vi samlar in: ingenting."* Plus ärlighetsraden: *"Varnar vid
Trafikverkets mätstationer och rapporterade väglag — mellan stationerna är vägen
oövervakad."* Och attributionen: Trafikverket (CC0), Polisen, SMHI, Fintraffic (CC BY 4.0),
broar © OpenStreetMap-bidragsgivare (ODbL).

## Exakt vad rösten säger

| När | Frasen |
|---|---|
| Lindrig olycka framför dig | "Olycka rapporterad **på väg 25**, 3 kilometer framför dig." |
| Bro nära frysande station (0.3.3) | "Frysrisk framöver — bro om 700 meter." |
| **Allvarlig olycka — tidigt ropet, ca 10 km** | "Allvarlig olycka **på E18**, 10 kilometer framför dig — stor påverkan på trafiken. Överväg annan väg. Beräknas röjd vid 14:20." |
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

**Rösten säger VAR (2/9):** vägnumret följer med i olycksfrasen — *"på E18"*, eller *"på
väg 25"* när numret saknar bokstav, så talsyntesen inte säger "olycka på 25". Saknar
Trafikverket vägnummer är frasen som förr. Bara olyckor: halka och frysrisk gäller
sträckan du redan kör på, och där tillför "på E4" inget.
Halkvakt räknar **aldrig** ut omvägen åt dig — det gör din kartapp. Vi levererar
beslutet i tid, du väljer vägen. Inga knappar att trycka på under körning.

**Röstens uppförandekod:** samma fara upprepas först efter 10 minuter *och* 5 km (enda
undantaget är den allvarliga olyckans två steg ovan, som är två olika budskap); står två
faror samtidigt framför dig vinner den allvarligaste (olycka > halka > frysrisk > vilt >
kamera) och den andra **droppas** — köas aldrig upp till tjat. Under 15 km/h: tyst.

**Spärren mellan varningar (ändrad 13/9):** minst 10 sekunder mellan två varningar av
samma eller lägre tyngd — men **en viktigare fara får bryta spärren**. Förr var spärren
45 sekunder och blind: en fartkamera kunde tysta isen som kom 20 sekunder senare, och när
spärren öppnade var isen 61 meter bort. Nu får is avbryta en kamera; en kamera kan aldrig
avbryta is. Tio sekunder är räknat ur att två fartkameror i samma riktning aldrig ligger
närmare än 520 meter — så en kamera kan aldrig tystas av golvet.

**Och en sak Halkvakt medvetet INTE gör (Bengts fältdom 12/9):** dämpar inte sanna
varningar som upprepas. Kör du åtta mil på is säger rösten *"halka"* var tionde minut, för
det ÄR halt. "Cry wolf" handlar om falska varningar — det är falskheten som äter
förtroendet, inte upprepningen. Mot uppmärksamhetsförfall under två monotona timmar är
upprepning rätt design.

## Broarna (0.3.3)

Broar fryser före vägen. Halkvakt känner till varje bro på riks- och europavägarna (ur
OpenStreetMap) och säger till när närmaste vägväderstation ligger nära noll och det är
vått: *"Frysrisk framöver — bro om sjuhundra meter."* Tröskeln för bron är +3 grader,
högre än vägens +1, för att brobanan kyls från två håll. Det är en mätning plus ett
faktum — ingen prognos. Är stationen varmare än tre grader tiger vakten om bron.
2 476 broar ligger i appen (OpenStreetMap, ODbL). I september är listan tom i snapshoten —
ingen station är nära noll — så du hör dem först i höst.

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
    I --> S[Snapshot byggs<br/>var 10:e minut]
    S --> T[Telefonen hämtar<br/>+ verifierar äkthet]
    T --> Å{Åldersvakten:<br/>är datat färskt?}
    Å -- ja --> M[Motorn i telefonen<br/>position möter faror]
    Å -- "gammalt väglag" --> M2[Gammalt filtreras bort<br/>+ en ärlig röstrad]
    M2 --> M
    M --> R[🔊 Din högtalare]
```

Allt till höger om "Telefonen hämtar" sker **lokalt i din telefon** — därav
löftet: positionen möter faroläget hos dig, aldrig hos oss.

**Sedan 8/9 går hela kedjan utanför GitHub.** Insamling varje minut, snapshot var tionde,
kartsajt var trettionde — allt i Supabase. Det hände efter att appen serverat tre dygn
gammal data när en byggkvot tog slut. Åldersvakten höll: rösten sa *"Ingen färsk
väglagsdata"* i stället för att hitta på. Men den hade inget att säga. Nu finns dessutom en
vakthund som varje timme kontrollerar att datan faktiskt når telefonen — inte bara att den
ligger på servern. Skillnaden lät liten. Den var tre dygn.

**Fyra länder (31/8):** Finland (Fintraffic, 526 stationer) och Danmark (DMI) hämtas
löpande; Norge är förberett i väntan på Vegvesens konto. Kör du E8, E10, E12 eller E14 mot
gränsen ser motorn de finska och norska stationerna inom 40 km av svenska vägar —
frysrisken slutar inte vid gränsen. Rösten säger inget om frysrisk i Danmark ännu; det
väntar på beslut.

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

**iPhone — vakten vaknar själv (0.3.2):** ge Halkvakt platsen **Alltid**. Då ber appen iOS
väcka den när telefonen lämnar platsen där bilen senast stod (ett par hundra meter), kollar
farten, och startar vakten om det är bilfart. Första resan efter installation, när ingen
parkering är känd, väcks den efter ungefär 500 meter i stället. Kostar nästan inget batteri. Inget mer att ställa in. Kan stängas av under Inställningar → *Vakna själv när
du kör*.

**Bevisat på pappas telefon 31/8** — vakten startade själv utan att han rörde telefonen,
och körläget visade fyra fartkameror sex kilometer fram. Sedan Malmö–Boden 1/9: 100 mil
med självväckningen som enda start.

**Resan håller ihop över pauser (0.3.3):** vakten somnar efter en kvart stilla och vaknar
när bilen rullar igen — men tid och sträcka nollas inte vid varje macka. Vaknar den inom
tre timmar fortsätter samma resa; pausen räknas bort från körtiden. Pappa hittade det: "vi
har kört 50 mil men mätaren står på 23,5." Den räknade rätt — bara sedan senaste pausen.

**Fartkamerorna varnar på rätt sida (0.3.5):** tre varv på samma bugg. Pappa: "den mäter
alltid mot kameran i motsatt färdriktning." Rotorsaken var att Trafikverkets riktning är
dit kameran *tittar* — rakt mot trafiken den fotograferar — inte åt vilket håll trafiken
kör. Vi läste den bakvänt sedan dag ett. Verifierat mot Öjersjö-kameran, ID 14102020:
"norrgående körriktning, bäring 158°". Nu vänd, och toleransen 60 grader.

**Vill du att den startar i första metern** finns två snabbare vägar: säg *"Hej Siri,
starta Halkvakt"*, eller bygg en automation i Genvägar en gång. Guiden — i introduktionen och under Inställningar →
*Autostart i bilen* — ställer först **en fråga: hur kopplar du telefonen i bilen?** och
visar sedan bara de steg som gäller dig:

Knappen *Öppna Genvägar på Ny automation* kommer först och landar på listan över
utlösare. Sedan ett steg per skärm, med det du trycker på i fetstil:

- **CarPlay:** tryck *CarPlay* → bocka *Ansluts* → *Kör direkt* → skriv Halkvakt → *Starta
  vakten* → Klar. Startar när bilens skärm tänds.
- **Bluetooth:** tryck *Bluetooth* → din bil, *Är ansluten* → *Kör direkt* → skriv Halkvakt →
  *Starta vakten* → Klar. Startar när bilen vaknar, bara i din bil.
- **Inte alls:** två delar. Del 1 i Inställningar: *Fokus → Kör* (finns inte Kör i listan:
  *+ → Kör → Anpassa fokus*) → *Aktivera automatiskt → När du kör → Automatiskt*. Del 2 i Genvägar: tryck *Fokus → Kör* → bocka *Slås på* → *Kör direkt* → skriv
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

## Versionerna (två veckor, sex byggen)

| Version | Datum | Vad |
|---|---|---|
| 0.3.0 (3) | 31/8 | Första TestFlight. Rösten, Siri, körläget. |
| 0.3.1 (4) | 31/8 | Autostart, heads-up-banner, "Senast sagt", introduktionen. |
| 0.3.2 (5) | 31/8 | Självväckningen: parkeringsstaket 150 m + fartprov. Pappas Bodenversion. |
| 0.3.3 (6) | 2/9 | Skinnet v3, ikonsetet, Om-fliken bort, resan över pauser, broarna vilande. |
| 0.3.4 (7) | 2/9 | Kameratoleransen 60°, vägnumret i rösten. Byggd med rött kontrakt — *ogiltig*. |
| 0.3.5 (8) | 2/9 | Kamerariktningen vänd 180°. Första bygget med grönt kontrakt i alla tre motorer. |
| *nästa* | — | Prioritetsmedveten spärr, golv 10 s (#127). Ligger på main, väntar på arkivering. |

Android ligger kvar på 0.3.1 med gammalt skinn. Skinnet v3 är portat och bevisat i
emulator; Play-lanseringen väntar på tolv testare.

## Vad vi lärde oss om oss själva (13/9)

Tre gånger på två veckor gjorde vi samma fel: verifierade att något *fanns* i stället
för att det *fungerade*. Manifestet låg på CDN men appen förkastade det. Vakthunden
larmade grönt men kunde inte larma rött. En check fanns i loggen och på tavlan men inte i
drift. Var gång fångades det av att någon — oftast pappa — krävde bevis i stället för
påstående. Läxan står i CLAUDE.md: *ligger filen på CDN är inte samma sak som appen tog
emot den.*

Och det bästa beslutet togs från förarsätet, inte från loggen: när mätningen sa att
rösten upprepade sig för mycket, sa pappa att det är halt hela tiden, och att någon säger
det är rätt. Han hade rätt.