# Halkvakt på iPhone — guide till testaren

*Skriven 26/9 2026 mot koden i 0.3.9 (16), rättad samma dag för (17) — reglaget, kort #259 — inte ur minnet (kort *Välkomsttext + testinstruktion*, DECISIONS #371). Samma
guide går till novemberbetans testare — ändras appen ändras den här filen i samma commit. Android-guiden är
`docs/BETAGUIDE-ANDROID.md`; de två ska säga samma sak där apparna gör samma sak.*

---

## Till TestFlight — klistra in som *Vad ska testas*

> Halkvakt är en röst i bilen: den säger till när det finns halka, en olycka, vilt eller en fartkamera på vägen framför
> dig. Starta vakten, lås skärmen och kör — du behöver aldrig titta på telefonen.
>
> Tystnad är det normala. Appen talar bara när Trafikverkets data säger något, och i höst hör du mest fartkameror och en
> och annan olycka. Halka kommer med kylan. Trösklarna är gissade tills vi mätt en vinter; de justeras i februari.
>
> Det som hjälper mest: slå på Inställningar → Betatest → Svara på varningarna. Efter resan får du en fråga om
> varningarna stämde — ett tryck räcker. "Stämde inte" är det mest värdefulla svaret. Och berätta när det var halt och
> appen teg: klockslag och ungefär var.
>
> Din position lämnar aldrig telefonen av sig själv. Svarar du skickas varningens id, klockslaget, ditt svar och appens
> version — det säger ungefär var du var när rösten talade, och därför är brytaren av tills du slår på den.
>
> Rör aldrig telefonen medan du kör. Svara när du stannat.

*(Knappt 1 000 tecken; TestFlight tillåter 4 000.)*

---

## Till dig som ska testa

Halkvakt är en röst i bilen. Den har läst allt Trafikverket vet om vägen framför dig och säger till när något väntar:
halka, en olycka längre fram, vilt på sträckan, frysrisk vid en mätstation, eller en fartkamera.

Du behöver inte titta på skärmen. Starta vakten, lås telefonen, kör.

**Du behöver:** en iPhone, appen **TestFlight** från App Store, och fem minuter första gången.

---

## 1. Installera

1. Hämta **TestFlight** från App Store (Apples egen app för testversioner).
2. Öppna inbjudan du fått — mejlet eller länken — och tryck **Acceptera** och sedan **Installera** i TestFlight.
3. Halkvakt ligger nu på hemskärmen. Versionen står i TestFlight; den här guiden gäller **0.3.9 (17)** och senare.

En testversion slutar fungera efter 90 dagar. Kommer en ny version meddelar TestFlight dig — installera den.

---

## 2. Första starten — tre frågor, och varför

Introduktionen tar dig igenom dem i ordning. Vill du se den igen: **Inställningar → Visa introduktionen igen**.

| Frågan | Varför |
| :-- | :-- |
| **Plats** (*Tillåt plats*) | För att veta vad som ligger på vägen framför dig. Jämförelsen sker i telefonen. **"Vid användning" räcker för att köra** — rösten talar med släckt skärm hela resan. |
| **Plats Alltid** (*Tillåt Alltid*) | Bara för att vakten ska kunna **vakna själv** när du börjar köra, utan att du öppnat appen. Frivilligt. |
| **Notiser** (*Tillåt notiser*) | En kort banner över kartappen när rösten talar, och frågan efter resan. Säger du nej talar rösten ändå. |

> **Den blå markeringen i statusfältet är ärlig, inte ett fel.** Med *Vid användning* visar Apple den när en app använder
> platsen med släckt skärm. Den syns medan vakten är på och försvinner när vakten stannar.
>
> **Kommer ingen fråga om Alltid:** *Inställningar → Halkvakt → Plats → Alltid*.

---

## 3. Kör

Appen har två flikar: **Vakten** och **Inställningar**.

- På **Vakten** står det *Redo.* Tryck **Starta vakten** — eller säg **"Hej Siri, starta Halkvakt"**.
- När vakten är på visas körläget med tid och sträcka. När rösten talar kommer ett kort, **HALKVAKT VARNAR**, i åtta
  sekunder.
- Klart för dagen: **Avsluta vakten**. Glömmer du det stoppar vakten själv när bilen stått still en kvart.
- Med platsen **Alltid** vaknar vakten själv några hundra meter in i resan.

I **Inställningar** kan du stänga av varningsslag du inte vill höra (**Halt väglag**, **Frysrisk**, **Olyckor & hinder**,
**Vilt**, **Fartkameror**), korta förvarningen med **Längsta förvarning** (från **Kortare — 400 m** till **Fullt — 1,2 km**;
rösten varnar annars ungefär 30 sekunder före, 750 m i 90 km/h) och trycka **Testa rösten**. Rösten är iOS egen: *Inställningar → Tillgänglighet → Talat innehåll → Röster*.

---

## 4. Vad du ska förvänta dig — läs det här

**Tystnad är det normala.** Appen varnar bara när det faktiskt finns något, och den varnar bara vid Trafikverkets
mätstationer och på sträckor som är rapporterade. En halvtimmes körning utan ett enda ljud betyder oftast att vägen var
fri — inte att appen är trasig.

**Och just nu är det höst.** Halka och frysrisk kräver kyla. Det du troligen hör först är **fartkameror** och ibland en
olycka. Den riktiga provperioden är vintern.

**Trösklarna är gissade till februari.** De är satta på förhand och justeras en gång, på vinterns data. Därför är dina svar
viktiga.

**Rösten säger aldrig mer än datan bär.** Hör du något som låter överdrivet eller fel — säg till.

**Vägdatan förnyas var 30:e minut under resan.** Är datan gammal — till exempel utan nät — säger rösten en gång:
*"Ingen färsk väglagsdata – kör som om det kan vara halt."*

---

## 5. Det som hjälper oss mest

Gå till **Inställningar → Betatest** och slå på **Svara på varningarna**. Den är avstängd tills du själv slår på den.

**Så här gör du:**
1. Kör som vanligt. Rör inte telefonen.
2. När resan är slut kommer en notis: **"Resan klar — stämde alla 3 varningarna?"**
   - Stämde allt: tryck **Ja, alla stämde**. Klart — appen behöver inte ens öppnas.
   - Stämde något inte: tryck **Något stämde inte**. Appen öppnas på **Efter resan**, där varje varning står med sitt
     klockslag. Tryck **Stämde** eller **Stämde inte** på raden.
3. Under knapparna ska det stå **Skickat** med klockslag. Står det något annat — ta en skärmbild och skicka.

Svarar du inte skickas ingenting — **tystnad räknas aldrig som ja**. Frågan och kortet *Efter resan* står kvar i ett dygn.

**"Stämde inte" är det mest värdefulla du kan ge oss.** En app som varnar för halka på torr väg förlorar förtroendet på en
vecka. Nästan allt annat kan vi mäta själva ur arkiven — men bara du kan säga att vägen faktiskt var torr.

**När appen var tyst fast det var halt** — säg *"Hej Siri, appen missade i Halkvakt"*, eller tryck **Appen missade** i körläget
när du stannat. Efter resan väljer du vad det var (Halka / Vatten / Vilt / Olycka / Annat); först då skickas något. Och direkt
efter en varning som inte stämde: *"Hej Siri, stämde inte i Halkvakt"*.

**Och det vi inte kan se alls:** när appen var **tyst fast den borde ha sagt något**. Var det halt och rösten teg? Berätta —
klockslag och ungefär var räcker.

---

## 6. Integritet, ärligt

Din position lämnar aldrig telefonen av sig själv. All jämförelse mot vägdata sker lokalt i appen. Inga konton, ingen
inloggning, inga annonser, ingen spårning.

**Undantaget är betatestet, om du själv slår på det.** Då skickas, när du trycker på en knapp: varningens id, klockslaget,
ditt svar och appens namn och version — och för en miss du markerat, först när du valt vad det var: klockslaget, närmaste mätstation och ditt val. Ingen koordinat, ingen resa, inget om dig.

Men var ärliga med vad det betyder: **varningens id pekar på en fara som har en plats, och klockslaget säger när.** Ett svar
säger alltså ungefär var du var och när. Det är därför brytaren är av som standard och varje svar kräver ett tryck. Slår du
av den slutar det direkt.

---

## 7. Om något krånglar

| Det här händer | Gör så här |
| :-- | :-- |
| Rösten tystnar när skärmen släcks | Den ska tala hela resan, också med *Vid användning*. Öppna appen när du stannat: står körläget kvar är vakten på. Ta en skärmbild av det och av *Inställningar → Halkvakt → Plats*. |
| Vakten vaknar inte själv | Kräver platsen **Alltid**: *Inställningar → Halkvakt → Plats → Alltid*. Den vaknar några hundra meter in, inte vid första metern. |
| Ingen banner över kartan | Notiserna är avslagna: *Inställningar → Halkvakt → Notiser*. Rösten talar ändå. |
| Ingen fråga efter resan | Betatestet är av, notiserna är avslagna (öppna appen — kortet *Efter resan* står på Vakten), eller så sade rösten ingenting under resan och det finns inget att fråga om. |
| Rösten kommer i telefonen, inte i bilen | Koppla telefonen till bilens Bluetooth eller CarPlay **innan** du startar vakten. |
| Något annat | Skärmbild + vad du gjorde, till den som bjöd in dig. TestFlight kan också skicka en skärmbild som feedback direkt. Gissa inte åt oss. |

---

## 8. Två saker att inte göra

- **Rör inte telefonen medan du kör.** Allt som ska tryckas trycks när du stannat — appen är byggd för att du aldrig ska
  behöva.
- **Kör inte appen som navigation.** Halkvakt ersätter ingenting; den talar vid sidan av det du redan använder, och den är
  tyst mellan mätstationerna.

---

Tack. Varje svar du skickar är en rad i det som avgör om appen får finnas.
