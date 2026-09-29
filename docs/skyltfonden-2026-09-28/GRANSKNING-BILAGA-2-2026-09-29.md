# Granskning av bilaga 2 — Rekryteringsplan för testförare (V2, 29/9 kväll)

*Claude 29/9 kväll på Bengts begäran (*"Granska och kom med synpunkter/förbättringar"*). Läst mot apparna (0.3.9 (18) på båda
plattformarna), mot `supabase/functions/facit-svar` och mot bilaga 1 V2 med ändringslistan (DECISIONS #404). Bilagan är kort och
läser rätt mot appen på nästan allt: Siri-fraserna, Efter resan-kortet, omkopplaren av från början, vad ett svar och en miss bär.
Sex saker bör rättas före sändning (§1), resten är förbättringar (§2). §3 säger vad som ska stå kvar orört. Varje punkt säger var
i bilagan ändringen görs; rubrikerna är bilagans egna.*

## 1. Rätta före sändning

**1. Fullföljd vinter går inte att kontrollera som den är skriven.** Under *Ersättning* är villkoret "appen använd under vintern
och enkäten besvarad"; under *Samtycke och data* står att kontaktuppgifterna "kan inte kopplas till svaren". Båda är sanna, och
tillsammans betyder de att projektledaren inte kan veta om förare X använt appen. Skriv villkoret som självrapport:
*"Ett presentkort på 500 kr för fullföljd vinter: föraren besvarar enkäten och uppger där att appen varit igång under vinterns
körningar. Uppgiften kontrolleras inte mot svaren, eftersom svaren inte kan kopplas till en person. Ersättningen är inte kopplad
till antalet svar eller till vad svaren säger."* (Var: *Ersättning*.)

**2. "Alla svar kan ges i efterhand på skärmen Efter resan" — inom två dygn.** Servern tar bara emot ett svar inom 48 timmar
efter varningen (`facit-svar`, `FONSTER_H`); apparna skickar inget äldre än 47 timmar (`Facit.swift`, `Facit.kt`). Skriv
*"… kan ges i efterhand på skärmen Efter resan, inom två dygn"*. (Var: *Säkerhet*, sista stycket.)

**3. Före resan och täckningsindikatorn finns inte ännu — skriv dem med förbehåll.** Ingen av dem finns i någon app och ingen
är beslutad: ruttkollen är kort #233, en utredning som väntar på Bengts val, formen är Axels. Bilaga 1 V2 säger "byggs på egen
bekostnad före andra vintern och prövas av testförarna"; bilaga 2 skriver "Yrkesförarna prövar också …" i presens utan
förbehåll. Skriv: *"Under andra vintern prövar yrkesförarna dessutom ruttkollen Före resan och täckningsindikatorn (bilaga 1,
AP3), när de byggts."* (Var: *Vad testföraren gör*, sista meningen.) Internt: det här är ett löfte i ansökan som saknade rad på
tavlan — #233 har fått en i kväll; bygget behöver eget DECISIONS innan det startar.

**4. Vad som skickas: lägg till "appens namn och version".** Appens egen text (Om-avsnittet, båda plattformarna) säger
*"… plus appens namn och version. Det säger ungefär var du var just då. Inget annat."* Bilaga 6 visar den texten; bilaga 2 ska
säga samma sak, annars ser fonden en skillnad mellan bilagorna. Skriv: *"… varningens id, tidpunkt och svar, eller en markerad
miss med tidpunkt, närmaste mätstation och vad det var, samt appens namn och version."* (Var: *Samtycke och data*, första
stycket.)

**5. "Ingen IP-adress sparas" — säg var.** I projektets databas är det bevisat: `facit-svar` skriver ingen, tabellerna
`driver_facit` och `driver_miss` bär ingen identifierare (DECISIONS #379). Vad tjänsteleverantörens (Supabase) egna driftloggar
bär om ett anrop, och hur länge, har ingen i projektet läst. Skriv *"Inget konto, inget enhets-id och ingen IP-adress sparas i
projektets databas"* — det är sant och kan visas. Vill ni ha den villkorslösa meningen måste någon läsa Supabases loggar först.
(Var: *Samtycke och data*, andra stycket.)

**6. Talen 40–70 och 60.** Samma sak som ändringslistans punkt 10: fyrtio rekryterade kan inte ge sextio som fullföljer. Välj
*"60–80 testförare, så att 60 fullföljer"* (då står 60 presentkort, AP3 och kostnadsplanen kvar) eller behåll 40–70 och skriv
*"så att 50 fullföljer"* med 50 presentkort (25 000 kr; totalen 408 000). Samma tal i bilaga 1 (AP3, Risker, kostnadsplanen)
och i bilaga 2. (Var: *Antal*.)

## 2. Förbättringar

**7. Känd krets eller öppen annonsering — bilagan säger båda.** *Kanaler* räknar upp webbplats, sociala medier, lokala forum
och annonsering, och säger sedan "Testförarna är en känd krets: var och en bjuds in personligen". Skriv det som två steg:
*"Rekryteringen är öppen. Den som anmäler sig får personlig kontakt, en sidas instruktion och ett samtal före första körningen —
hur omkopplaren slås på, hur svaren ges och att de ges först när det är säkert — och står först då på testförarlistan."* Det
täcker också att AP3:s kostnadsrad heter "rekrytering, instruktion, uppföljning" utan att bilagan säger vad instruktionen är.

Bakom meningen ligger en fråga ni bör avgöra innan bilagan skickas: **omkopplaren i appen är inte spärrad.** Vem som helst
som installerar appen kan slå på den, och `facit-svar` är byggd för "en beta i känd krets, inte för allmänheten" (kommentaren
i funktionen). Med [300] och [1 000] aktiva enheter enligt stycket *Så når appen förarna* kommer facit också från förare som
inte är testförare. Antingen accepteras det — bilagan säger då att alla svar räknas, medan testförarna är de som får
instruktion, enkät och presentkort — eller spärras omkopplaren med en inbjudningskod, vilket är ett kort och ett bygge före
januari. Rekommendation: det första. Det ger fler svar, kräver inget bygge, och ersättningen är ändå inte kopplad till svaren.
Frågan står i bedömningen §4.2. (Var: *Kanaler*.)

**8. Kanalerna namnger organisationer som ingen kontakt är tagen med.** NTF Skåne finns (skane.ntf.se, ett av NTF:s tio
regionala förbund), men repot bär ingen kontakt med dem, med trafikskolor eller med yrkesflottor. Beredningsgruppen
(Trafikverket, Polisen, SKR) frågar gärna "vilka?". Skriv *"Kontakt tas under hösten 2026 med NTF Skåne, trafikskolor och
yrkesflottor i Skåne"* i stället för att räkna dem som kanaler som finns. Har Axel eller Bengt en kontakt redan: skriv namnet.
(Var: *Kanaler*.)

**9. Enkät 2 i april 2028 krockar med slutrapporten i april 2028.** Bilaga 1:s tidsplan lägger slutrapporten i april 2028;
enkät, gruppintervju, analys och rapport får då samma månad. Lägg enkät 2 och gruppintervju 2 i mars 2028 (vinterns sista
vecka räcker; förarna har hela vintern bakom sig), eller skriv i bilaga 1 att slutrapporten lämnas i slutet av april med
enkät 2 inarbetad. Samma ändring i bilaga 1:s tidsplan. (Var: *Enkät och gruppintervju*; *Tidsplan*.)

**10. Yrkesförare i arbetstid.** Taxi, bud, hemtjänst och distribution kör på arbetsgivarens tid, ofta med arbetsgivarens
telefon. En mening: *"Yrkesförare deltar med arbetsgivarens kännedom."* Utan den ligger frågan om mobilanvändning i tjänst
öppen för den som läser. (Var: *Vilka*.)

**11. Raderingen, ångerrätten och frivilligheten.** "De raderas när projektet avslutas": mottagarlistan för presentkorten är
underlag i redovisningen till fonden, så skriv *"raderas när fondens slutredovisning godkänts"*. Lägg till den mening som gör
integritetsavsnittet komplett: *"Ett skickat svar kan inte tas tillbaka, eftersom det inte kan pekas ut."* Den är sann
(DECISIONS #379) och det är vad Polisen och SKR i beredningsgruppen läser efter. Och en rad om frivilligheten:
*"Deltagandet är frivilligt och kan avbrytas när som helst utan skäl."* (Var: *Samtycke och data*, tredje stycket.)

**12. Android saknas i Säkerhet.** Siri-meningen gäller iPhone. På Android svarar föraren med två knappar i appen när bilen
står stilla, notisen efter resan frågar *Ja, alla stämde* eller *Något stämde inte*, och Efter resan-kortet gör resten
(`GuardService.kt`, DECISIONS #379). Skriv: *"På iPhone kan stämde inte och appen missade också sägas till Siri; på Android
frågar notisen efter resan. Alla svar kan ges i efterhand på skärmen Efter resan, inom två dygn."* (Var: *Säkerhet*.)

**13. Fartförändringen står två gånger.** Under *Vad testföraren gör* och under *Samtycke och data*. Behåll den under
*Samtycke och data*, där förbehållet står ("appens text ändras innan funktionen slås på"), och korta den under *Vad
testföraren gör* till *"Under andra vintern kan föraren dessutom välja att skicka fartförändringen kring varningen (se Samtycke
och data)"*. Internt oförändrat: bygget kräver DECISIONS och de fyra dokumenten i samma commit (#404).

**14. Ett förarsvar ensamt avgör inte.** *Syfte* säger att svaren "läses mot fyra andra facitkällor" men inte hur. Ändringslistans
punkt C sätter i bilaga 1 att *stämde inte* fäller bara om ingen annan källa bekräftar. Samma sak här, en rad: *"Ett förarsvar
ensamt varken fäller eller friar en varning; det vägs mot de fyra andra källorna."* (Var: *Syfte*.)

## 3. Behåll som det är

- *Syfte* med de fyra andra facitkällorna: stämmer med bilaga 1 och målbladets M1.
- "Omkopplaren är avslagen från början" och "Ingen position, inget GPS-spår och ingen hastighet lämnar telefonen automatiskt":
  ordagrant vad apparna och CLAUDE.md:s invariant säger. Fartförändringen under andra vintern bryter inte meningen — talet
  skickas bara med förarens eget svar — men bygget kräver DECISIONS och de fyra dokumenten först.
- Siri-fraserna *Stämde inte i Halkvakt* och *Appen missade i Halkvakt* / *Halt här i Halkvakt* finns i 0.3.9 (18)
  (`ios/HalkvaktApp/Sources/Intents/`), och en miss skickas först när föraren efter resan valt vad det var — precis som bilagan
  beskriver.
- Oberoende moderator (AP3, 12 000 kr) och att ersättningen inte styrs av svaren.
- "Testkretsen byggs på egen bekostnad hösten 2026": rätt — inget före januari 2027 belastar ansökan.
- Skärmbilden i bilaga 6: bilaga 6 (PDF) ska in i V2-mappen (granskningen av V2, rättelse 8); tre bilagor hänvisar till den.
