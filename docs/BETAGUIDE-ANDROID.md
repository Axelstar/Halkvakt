# Halkvakt på Android — guide till testaren

*Skriven 20/9 2026 mot koden i bygget, inte ur minnet. Samma guide används till novemberbetans tolv
testare — ändras appen ändras den här filen i samma commit.*

*Rättad 20/9 kväll: första versionen sade att rösten tystnar utan "Tillåt hela tiden". Det var fel —
vakten är en förgrundstjänst med typen `location`, och då räcker "medan appen används" (Googles egen
dokumentation, läst 20/9). "Tillåt hela tiden" behövs bara för Autostart. Se DECISIONS #272.*

---

## Till dig som ska testa

Halkvakt är en röst i bilen. Den har läst allt Trafikverket vet om vägen framför dig och säger till
när något väntar: halka, en olycka längre fram, viltolyckor på sträckan, frysrisk vid en mätstation,
eller en fartkamera.

Du behöver inte titta på skärmen. Starta vakten, lägg telefonen i hållaren eller fickan, kör.

**Du behöver:** en Android-telefon med **Android 8.0 eller nyare**, och fem minuter första gången.

---

## 1. Installera

Du får en fil som slutar på `.apk`. Den ligger inte i Google Play ännu — appen är i beta, och
Play-kontot är nyss skapat.

1. Ladda ner filen till telefonen (mejl, Google Drive, USB-kabel — vilket som).
2. Öppna filen i telefonens **Filer**-app och tryck **Installera**.
3. Telefonen frågar om den appen får installera okända appar. **Tillåt** — det gäller bara den appen
   och bara den här gången. Det är normalt för en app som inte kommer från Play.

Om telefonen varnar för att appen är osäker: det är samma varning alla appar utanför Play får. Den
säger inget om appen, bara att Google inte har granskat den ännu.

---

## 2. Första starten — fyra frågor, och varför

Appen frågar om behörigheter i tur och ordning. Alla behövs för att den ska kunna göra sitt jobb:

| Frågan | Varför |
| :-- | :-- |
| **Plats** | För att veta vad som ligger på vägen framför dig. Jämförelsen sker i telefonen. **"Medan appen används" räcker** — se rutan nedan. |
| **Aviseringar** | Vakten visar en pågående notis medan den är på. Android kräver det av appar som får jobba i bakgrunden. |
| **Fysisk aktivitet** | Så att vakten kan starta sig själv när du börjar köra. Frivilligt i praktiken. |
| **Bluetooth** | För att känna igen bilens ljudsystem och tala i rätt högtalare. |

> **Svara "Medan appen används". Det räcker.**
>
> Android 11 och senare visar med flit INTE "Tillåt hela tiden" i rutan — Google har flyttat det valet
> till inställningarna. Och du behöver det inte för att köra: så länge vakten är igång kör den som en
> förgrundstjänst (det är den pågående notisen du ser), och då fortsätter rösten tala med **släckt
> skärm** hela resan.
>
> **"Tillåt hela tiden" behövs bara för Autostart** — att vakten startar sig själv när bilens Bluetooth
> kopplar, utan att du öppnat appen. Vill du ha det: *Inställningar → Appar → Halkvakt → Behörigheter →
> Plats → Tillåt hela tiden*. Hoppar du över det fungerar allt annat precis som vanligt; du trycker bara
> **Starta vakten** själv.

---

## 3. Kör

Appen har två flikar: **Vakten** och **Inställningar**.

- På **Vakten** står det *Redo.* Tryck den gröna **Starta vakten**.
- Under knappen finns **Autostart** — slår du på den startar vakten själv när bilens Bluetooth kopplas.
- När vakten är på står det *PASSAGERAREN ÄR VAKEN* med tid och sträcka.
- Klart för dagen: **Avsluta vakten**.

I **Inställningar** kan du stänga av varningsslag du inte vill höra (fartkameror har egen brytare),
byta hur tidigt rösten varnar (500 m till 5 km), och läsa vad appen gör.

---

## 4. Vad du ska förvänta dig — läs det här

**Tystnad är det normala.** Appen varnar bara när det faktiskt finns något, och den varnar bara vid
Trafikverkets mätstationer och på sträckor som är rapporterade. En halvtimmes körning utan ett enda
ljud betyder oftast att vägen var fri — inte att appen är trasig.

**Och just nu är det september.** Halka och frysrisk kräver kyla, så de kommer inte än. Det du
troligen hör i höst är **fartkameror** och ibland en olycka. Den riktiga provperioden är vintern.

**Rösten säger aldrig mer än datan bär.** Hör du något som låter överdrivet eller fel — säg till. Det
är precis det vi vill veta.

---

## 5. Det som hjälper oss mest

Gå till **Inställningar → BETATEST** och slå på **Svara på varningarna**. Den är avstängd tills du
själv slår på den.

Då får du efter varje varning två knappar: **Stämde** och **Stämde inte**.

**Så här gör du:**
1. Kör som vanligt.
2. När du är framme: tryck **Avsluta vakten**. *(Knapparna syns först då — det är en känd egenhet i
   den här versionen.)*
3. På fliken Vakten, under **Senast sagt**, tryck **Stämde** eller **Stämde inte**.
4. Under knapparna ska det stå **"Skickat 18:42 (1 svar)"**.

Står det i stället **"Kunde inte skicka …"** — ta en skärmbild och skicka. Felet står i texten, och
den skärmbilden är mer värd än svaret.

**"Stämde inte" är det mest värdefulla du kan ge oss.** En app som varnar för halka på torr väg
förlorar förtroendet på en vecka. Vi kan mäta nästan allt annat själva ur arkiven — men bara du kan
säga att vägen faktiskt var torr.

**Och det vi inte kan se alls:** när appen var **tyst fast den borde ha sagt något**. Var det halt
och rösten teg? Berätta — klockslag och ungefär var räcker.

---

## 6. Integritet, ärligt

Din position lämnar aldrig telefonen av sig själv. All jämförelse mot vägdata sker lokalt i appen.
Inga konton, ingen inloggning, inga annonser, ingen spårning.

**Undantaget är betatestet, om du själv slår på det.** Då skickas, när du trycker på en knapp:
varningens id, klockslaget, ditt svar och appens namn och version. Ingen koordinat, ingen resa, inget
om dig. *(Rättat 26/9: guiden sa "tre saker" — namn och version har alltid följt med, och appens Om
säger det sedan 24/9, DECISIONS #348.)*

Men var ärliga med vad det betyder: **varningens id pekar på en fara som har en plats, och klockslaget
säger när.** Ett svar säger alltså ungefär var du var och när. Det är därför brytaren är av som
standard och varje svar kräver ett tryck. Slår du av den slutar det direkt.

---

## 7. Om något krånglar

| Det här händer | Gör så här |
| :-- | :-- |
| Rösten tystnar när skärmen släcks | Det ska den inte göra — vakten kör som förgrundstjänst. Titta först om den pågående notisen är kvar. Är den borta har telefonen dödat tjänsten: sätt Halkvakt till **obegränsad batterianvändning**. |
| Autostart startar inte vakten | Autostart kräver *Tillåt hela tiden* för platsen, och det valet finns inte i rutan på Android 11+. Sätt det i *Inställningar → Appar → Halkvakt → Behörigheter → Plats*. |
| Vakten stängs av när telefonen legat still | Vissa telefoner (särskilt Samsung, Xiaomi, Huawei) dödar bakgrundsappar. Sätt Halkvakt till **obegränsad batterianvändning**. |
| Rösten kommer i telefonen, inte i bilen | Kontrollera att telefonen är kopplad till bilens Bluetooth **innan** du startar vakten. |
| Appen säger version **0.3.1** | Stämmer — versionsnumret har halkat efter koden och rättas före Play-släppet. |
| Något annat | Skärmbild + vad du gjorde. Gissa inte åt oss. |

---

## 8. Två saker att inte göra

- **Skicka inte filen vidare.** Den är osignerad av Google och spårbar till oss — betan är en
  namngiven krets, inte en spridning.
- **Kör inte appen som navigation.** Halkvakt ersätter ingenting; den talar vid sidan av det du redan
  använder, och den är tyst mellan mätstationerna.

---

Tack. Varje svar du skickar är en rad i det som avgör om appen får finnas.
