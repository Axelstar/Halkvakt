# Marknadsföring utan pengar — planen (2/10 2026)

*Artefakt: https://claude.ai/artifact/XcFLRPAK4Y2FK52Sa1tUeX — källa `docs/MARKNADSFORING.html`; ändras i repokopian och republiceras till samma URL.*

*Axels order 2/10 00:17: "Sedan måste vi verkligen börja med marknadsföring utan att spendera pengar. Gör upp en plan och vad som
kommer att krävas. Förstår att vi måste köpa hemsidan men utöver det." Skriven mot läget samma natt: 0.3.9 (20) hos Apple (Waiting
for Review, bara Sverige), Play-vägen fredag, föreningen Halkvakt bildad 29/9, Skyltfondsansökan inne (svar 15/12), halkbaneförsöket
på Bulltoftabanan jan–mar 2027, kuvösen med Trafikverket. Ersätter de betalda delarna i `docs/GTM.md` (25/8); kanalerna därifrån behålls.*

**Grundregeln står (DECISIONS #18):** inget från Axels privata konton. Allt går i **föreningens/Halkvakts** namn.
**Enda kostnaden:** domänen (halkvakt.se, kortet *Skydda namnet*). Allt annat nedan kostar tid, inte kronor.

---

## 1. Det vi redan har — och som ingen konkurrent kan köpa

| Tillgång | Varför den säljer | Läge |
| :-- | :-- | :-- |
| **Trafikverkets egna data, i realtid** | "Byggd på Trafikverkets mätstationer" är trovärdigare än någon annons | i drift |
| **Livekartan** (`karta.html`) | ett dagsaktuellt innehåll som förnyar sig självt — journalister och forum kan länka till den | i drift, 30-minutersuppdatering |
| **Marknadsmotorn** (`marknadsforing/generator.mjs`) | skriver färdiga kanaltexter varje morgon + **snölarm per län** ur datan — vi vet var det är halt innan nyheterna | stannade 3/9 (Actions); startas om |
| **Löftet** "positionen lämnar inte telefonen av sig själv" | det enda i kategorin som är sant och bevisbart (öppen kod, öppna data) | sant sedan 23/9 |
| **Föreningen Halkvakt** (ideell, 29/9) | ingen kommersiell aktör — dörren till NTF, kommuner, trafikskolor, Trafikverket | bildad; org.nr på väg |
| **Skyltfonden** (svar 15/12) | ett ja = Trafikverket står bakom = pressrubrik gratis | ansökan inne |
| **Halkbaneförsöket** jan–mar 2027, ~100 elever i riskutbildning | en lokal nyhet i Malmö med bilder, siffror och en skola som ställer upp | muntligt ja, Mattias |
| **Gratis, inget konto, svensk** | lågt motstånd — det enda vi ber om är en nedladdning | ja |

## 2. Kanalerna — alla gratis

**A. Egna (vi styr, bygger över tid)**
1. **Sajten** → halkvakt.se när domänen är köpt (GitHub Pages fungerar med egen domän, gratis). `press.html` blir presskit: logga, skärmbilder,
   faktablad, citat, kontakt. `hej@halkvakt.se` via Cloudflare Email Routing (gratis) — utskick från gmail ser oseriöst ut (GTM kanal 3).
2. **Butikssidorna** (App Store, Play): sökorden är inlagda; **betyg** är det som räknas. Appen ber om betyg efter tredje resan (bygge, Claude).
3. **Varumärkeskonton** i Halkvakts namn: Facebook-sida, Instagram, LinkedIn-sida, Threads/Bluesky. Inga annonser — bara flödet.
   Motorn levererar texten; Axel trycker publicera (eller Bengt). Två inlägg i veckan räcker fram till snön; vid larm varje dag det är halt.
4. **Nyhetsbrev** för testare och intresserade: gratis upp till flera hundra på Buttondown/Substack. "Halkläget" varje måndag ur `rapport.json`.

**B. Förtjänade (press — den stora kanonen, tajmad mot vädret)**
5. **Första frostnatten** (motorn larmar per län): lokalpress i det länet samma morgon — *tips@*-adresser, P4-redaktionen. Kroken:
   *"Gratis app byggd på Trafikverkets mätstationer säger till med rösten när det är halt — i natt var det första gången i [län]."*
6. **Första snökaoset** (nov/dec): TT + rikspress + motor-/teknikpress (Vi Bilägare, Teknikens Värld, Mobil.se, SweClockers, Feber, Ny Teknik).
7. **15/12 Skyltfonden** — ja eller nej är en nyhet ("Trafikverket satsar på…" / "Ideell förening bygger det Trafikverket inte gör").
8. **Jan–mar Bulltoftabanan** — Sydsvenskan, Lokaltidningen Malmö, P4 Malmöhus, SVT Skåne: elever på halkbanan med en röst i örat. Bilder + siffror.
9. **Podcast/radio**: P1 Trafikredaktionen, P4 Trafik — de talar om halka varje vinterdag och vill ha något nytt att säga.

**C. Gemenskaper (gratis, anonymt möjligt — GTM kanal 1)**
10. **Flashback** (Datorer & IT → Egna projekt; korsreferens Fordon & trafik vid snö) — utkastet finns i GTM.md. Anonymt by design.
11. **Reddit** med projektkontot *halkvakt*: r/sweden, r/Malmo, r/Gothenburg/r/stockholm vid snökaos; r/SideProject på engelska (teknikvinkeln).
12. **Bilforum**: Garaget, Bilsnack, Volvo-/Tesla-forum (elbilsförare är tidiga användare och pratar).
13. **Facebook-grupper** (pendlargrupper, "Trafiken i Skåne", bilgrupper) — kräver en person, inte en sida: **Bengt eller en vän**, inte Axel.

**D. Partners och multiplikatorer (gratis, förening till förening)**
14. **NTF** (Nationalföreningen för Trafiksäkerhetens Främjande) — ideell till ideell; deras vinterkampanjer behöver konkret innehåll.
15. **Trafikskolor + STR** (Sveriges Trafikutbildares Riksförbund): Bulltoftabanan först, sedan "varje riskutbildning del 2 i Skåne".
    Handledare är trovärdighetsspridare; eleverna är 18-åringar med telefon.
16. **Trafikverket** — Micke Wallin-kontakten och trafficdata.se: Trafikverket visar gärna *goda exempel* på öppna data. Fråga om vi får stå där.
17. **Försäkringsbolag** (If, Folksam, Länsförsäkringar) skriver vintertips varje år — en gratis app är innehåll för dem, inte konkurrens.
18. **Halkvarning.se** (Icebug/Klimator, fotgängare) — komplement, inte konkurrent: korslänk "för bilen: Halkvakt" / "till fots: Halkvarning".
19. **Kommuner** (Malmö, Lund) och **åkerier/budfirmor** — GTM kanal 3; ett mejl från hej@halkvakt.se.

## 3. Tidslinjen (väderstyrd, inte kalenderstyrd)

| När | Vad | Vem |
| :-- | :-- | :-- |
| **Nu–frosten (okt)** | Domän + e-post · varumärkeskonton · presskit på press.html · demovideo 60 s (telefon i bilen, rösten hörs) · betygsfrågan i appen · marknadsmotorn igång igen · partnerbrevet (NTF, STR, Trafikverket, If/Folksam) skrivet och skickat | Axel 2 h · Claude resten |
| **Första frostnatten** (motorn säger var) | Flashback-tråd + Reddit · lokalpress i länet · första FB/IG-inlägget med kartan | Axel/Bengt klistrar in |
| **Första snökaoset** (nov/dec) | pressmeddelandet till TT + riks + motorpress · nyhetsbrev nr 1 | Axel skickar |
| **15/12** | Skyltfondens svar ⇒ pressnotis oavsett utfall | Claude skriver, Axel skickar |
| **Jan–mar** | Bulltoftabanan: bjud in Sydsvenskan/P4 till en körning · bilder till presskit | Axel + Mattias |
| **Mars** | "Vintern i siffror": varningar, facit, förare — en rapport ur datan, till press och partners | Claude |

## 4. Vad som krävs av Axel (beslut och handgrepp, inget annat)

1. **Domänen** — halkvakt.se: kolla ägaren (sajten svarar redan på adressen), annars .nu/.app. Cloudflare för DNS + e-post (gratis).
2. **Ansiktet** — press vill ha ett namn. Tre vägar: *Axel Lagerlöf, grundare* · *Föreningen Halkvakt* med Bengt som talesperson · anonymt
   "teamet bakom". GTM.md väntar på detta sedan augusti. **Rekommendation:** föreningen som avsändare, Axel med namn i presskitet (det är
   inte hans privata kanal, det är ett pressmeddelande).
3. **Kontona** — skapa FB-sida, Instagram, LinkedIn-sida i Halkvakts namn (1 h). Lösenord i föreningens förvar.
4. **Demovideon** — 60 sekunder, telefonen i hållaren, en riktig varning som hörs. Filmas när första kameravarningen kommer på en resa.
5. **Partnerbreven** — Claude skriver, Axel skickar från hej@halkvakt.se i föreningens namn. Fem brev, en förmiddag.
6. **Vem klistrar in i grupper** — Bengt eller någon annan som får använda sitt eget konto.

## 5. Vad Claude bygger (utan att fråga)

- Marknadsmotorn igång igen (pulsklockan), med **snölarmet** kopplat till ett utkast per län och kanal.
- `press.html` som presskit · pressmeddelandet (frost / snö / Skyltfonden / Bulltofta, fyra versioner) · partnerbreven · nyhetsbrevsmallen.
- Betygsfrågan i appen efter tredje resan (iOS `SKStoreReviewController`, Android In-App Review) — ett kort.
- Mätning: installationer per vecka (App Store Connect/Play), facitsvar, presslänkar — en rad i bedömningen varje måndag.
- **"Halkvakt live" (Axels idé 00:24):** motorn postar själv ur `larm.json` — *"Just nu: halka rapporterad E4 Gävle–Söderhamn, −2°, blöt väg"* —
  till X, Bluesky, Mastodon och Facebook-sidan. Gratis API:er för sidor och konton; noll handgrepp efter uppsättningen; bevisar att appen vet
  det före nyheterna. Tröskel: bara riktiga larm (första halkan i ett län, olycka med stor påverkan), aldrig brus — samma tystnadsregel som rösten.

**Inte i planen — ägarbeslut (§4.2):** push till användarna om faror. Positionsstyrd push kräver att servern vet var telefonen är (bryter löftet);
en länsvis prenumeration kräver ett push-token per telefon, alltså ett enhets-id hos oss, som policyn i dag säger att vi inte har. Och "tystnad är en
funktion". Bengt + Axel.

## 6. Sök — hur vi blir det som kommer upp när det är halkkaos (Axels fråga 00:28)

**Ärligt läge:** på huvudorden (*halka*, *halkkaos*, *halt väglag*) vinner SMHI, Trafikverket och tidningarna. Vi vinner **de frågor de inte
svarar på** — *är det halt i Skåne just nu*, *halt väglag E4 idag* — för det är exakt vad livekartan vet och ingen tidning har en sida för.

1. **En sida per län och per stor väg som uppdaterar sig själv** — *Halt väglag i Skåne just nu*: 21 län + E4, E6, E18, E20, E22, R40. Skrivs om
   var 30:e minut av publicera-flödet ur samma data som kartan: halksträckor, stationer under noll, senaste olyckan, tidsstämpel, och ett kort
   handskrivet stycke per sida. Titlar och beskrivningar formulerade som frågorna folk googlar. **Det här är hela spelet; Claude bygger det i
   karta-repot i oktober** — Google behöver veckor, så sidorna måste finnas före första frosten för att synas i december.
2. **Domänen före första pressomgången.** Länkar till github.io följer inte med; GitHub Pages skickar vidare automatiskt till en egen domän, så
   varje artikel i vinter ska länka till halkvakt.se (eller .nu) från början.
3. **Länkar utan pengar är partnerlistan:** NTF, STR, trafikskolor, kommunernas vinterväghållningssidor, försäkringsbolagens vintertips,
   Trafikverkets exempel på öppna data, Halkvarning.se, varje pressartikel. Två länkbeten: **en inbäddningsbar widget** *halkläget i ditt län*
   som lokaltidningar och bloggar får lägga på sin sida gratis (varje inbäddning = en länk), och till våren **"Sveriges halaste vägar 2026/27"**
   ur vårt eget arkiv — tidningar älskar listor med siffror.
4. **Tekniken (en dag, gratis):** Google Search Console + Bing Webmaster med sitemap (finns), titel/beskrivning per sida, strukturerad data
   (SoftwareApplication, Organization, Dataset), `lang="sv"`, statiskt och snabbt. Mäts i Search Console varje måndag: vilka frågor, vilken plats.
5. **App-butikerna söks också:** namnet bär *halk*; nyckelorden är inlagda. Betygen avgör placeringen — därför betygsfrågan efter tredje resan.

## 7. Mål att mäta mot (så vi vet om det fungerar)

| Till | Mål | Mäts i |
| :-- | :-- | :-- |
| första snön | 12 Android-testare + 50 iPhone-installationer | Play Console / App Store Connect |
| 31/12 | 1 000 installationer · 5 omnämnanden i press · 100 facitsvar | butikerna · presslänkar · `driver_facit` |
| 31/3 | 5 000 installationer · Bulltofta-artikeln · en partner som länkar (NTF/STR/If) | samma |

Missas första raden är det inte kanalerna det är fel på utan budskapet — då skrivs budskapet om, inte planen.
