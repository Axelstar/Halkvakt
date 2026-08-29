# GTM-plan v2 — spridning UTAN grundarens privata kanaler (DECISIONS #18)

Axels krav 2026-08-25: inga inlägg från hans privata sociala konton. Planen byggs om
kring fyra kanaler som inte kräver hans ansikte i flödet. Gamla FB-gruppsinläggen i
REKRYTERING.md behålls som RESERV (får användas om han ändrar sig, annars inte).

## Kanal 1: Anonyma/projektägda forum (GRATIS — betans ryggrad)
**Flashback** (anonymt by design — perfekt för kravet):
- Tråd i "Datorer och IT → Egna projekt" nu, korsreferens i "Fordon & trafik" vid snö.
- Utkast (Flashback-ton: rakt, inget säljsnack, visa tekniken):

> **Bygger gratisapp som röstvarnar för halka — byggd på Trafikverkets öppna data. Betatestare sökes (Android)**
>
> Har byggt en app som säger till med rösten — "varning, halka rapporterad på vägen
> framför dig" — baserat på Trafikverkets mätstationer (844 st), polisens viltolycks-
> rapporter och SMHI-varningar. Uppdateras var 30:e minut. Startar sig själv när man
> börjar köra (rörelseigenkänning + bilens BT). Positionen lämnar aldrig telefonen —
> all matchning sker lokalt mot en nedladdad fil, kolla trafiken själva om ni vill.
> Livekartan är öppen redan nu: https://axelstar.github.io/halkvakt-karta/
> Android-beta i oktober, gratis, inget konto. Kön + testarguide på sidan.
> AMA om tekniken — stacken är TypeScript-ingest + Kotlin/Swift-motor med delade
> testvektorer, allt CI-vaktat.

**Reddit** (projektkonto "halkvakt", INTE Axels): r/sweden (kolla självpromo-regler +
veckotrådar), r/Gothenburg/r/stockholm vid snökaos, r/SideProject (EN).

## Kanal 2: Halkvakt-varumärkessida + liten betald budget (DAVIDS GRIND: pengar)
Facebook-SIDA (varumärke, inte person) + annonser löser räckvidd utan grupper:
- **Beta-kampanj okt**: 50 kr/dag × 10 dagar = **500 kr** → trafik till /beta.html.
  Målgrupp: Sverige, 25–65, intressen bil/pendling/vinterdäck. Räcker med marginal
  till 12+-testarkravet.
- **Lanseringskampanj vid första snön**: **3 000–5 000 kr** engångs, geo-boost mot
  län med SMHI-varning (vi VET var det snöar — vår data styr annonsgeografin!).
- Axels insats: skapa sidan + annonskonto med betalkort (~30 min, guide kommer när
  det är dags). Claude skriver alla annonser.

## Kanal 3: Direktutskick till yrkesgrupper (GRATIS — kräver mejladress)
Målgrupper som kör dagligen och bryr sig om trafiksäkerhet:
- **Trafikskolor** (handledare = perfekta betatestare + trovärdighetsspridare)
- **Åkerier/budfirmor** (förarna lever på vägen)
- Claude skriver mejlen; VÄNTAR PÅ: halkvakt.se → gratis mejl via Cloudflare Email
  Routing (hej@halkvakt.se → Axels gmail). Utskick från gmail ser oseriöst ut.

## Kanal 4: Press (GRATIS — den stora kanonen, sparas till rätt ögonblick)
- **Vid betaöppning (okt)**: kort pitch till tech-/motorpress som bevakar svenska
  projekt: Breakit, SweClockers, Feber, Ny Teknik, Mobil.se, Vi Bilägare.
- **Vid FÖRSTA SNÖKAOSET (nov/dec)**: fullt pressmeddelande till TT + lokalpress
  (tips@-adresser, lokaltidningar älskar säsongens trafiksäkerhetsartiklar).
  Kroken: "Gratis svensk app säger till med rösten när det är halt — byggd på
  Trafikverkets egna mätdata. Positionen lämnar aldrig telefonen."
- Press vill ha ett namn. DAVIDS BESLUT (ej bråttom, deadline okt): citeras som
  grundare med namn, eller "teamet bakom Halkvakt". Presskit-sida (press.html med
  skärmdumpar, logga, faktablad) byggs i september.

## Tidslinje
| När | Aktivitet | Kostnad | Vems |
|---|---|---|---|
| Nu | Flashback-tråd + Reddit-projektkonto | 0 | Claude skriver, Axel klistrar in (anonymt) ELLER vi väntar till betan |
| Sep | press.html + pressmeddelande-utkast + mejlmallar | 0 | Claude |
| Okt (beta) | FB-sida + 500 kr-kampanj; pitch till techpress | 500 kr | Axel 30 min; Claude allt innehåll |
| Första snön | TT/lokalpress-utskick + 3–5 tkr geo-annonser | 3–5 tkr | Claude innehåll; Axel godkänner |

## Kvarvarande beroenden
1. **halkvakt.se** (Axels köp) → mejladress → Kanal 3 + seriösare press-avsändare.
2. Axels val: namn i press eller anonym → påverkar bara pressmeddelandets citat.
3. Flashback/Reddit-postning: tekniskt anonymt — men NÅGON måste klistra in. Axels
   val: han gör det (5 min, inget kopplat till hans person) eller väntar till betan
   då annonserna bär rekryteringen ensamma (500 kr räcker).

---

## v3 · Marknadsmotorn (2026-08-25) — automatiserad, matchar scrollvärlden

**Filosofin:** Halkvakt äger sin egen timing. Pipelinen ser första halkan i varje län före
alla andra — alltså postar vi exakt då, i exakt det länet, med exakta siffror. Ingen
innehållskalender; vädret ÄR kalendern. Tonen överallt = sajtens: "Kl 06:50. Minus två."

### Tre motorer (kör själva, varje morgon 05:45)
1. **Halkläget** — `marknadsforing/utkast/halklaget-DATUM.md`: färdiga texter för FB-sidan,
   Flashback, Reddit och press, fyllda med dagens riktiga siffror. Axel kopierar, klistrar, klart.
2. **SNÖLARMET** — när ett län får säsongens första halksträckor öppnas ett ärende
   (🚨-mejl till Axel) med färdig FB-post, annonsinstruktion (geo/budget/målgrupp) och
   15-minuters-checklista. Larmar en gång per län och säsong. DETTA är kampanjstarten —
   inte ett datum i en plan, utan verkligheten.
3. **Veckorapporten** — måndagar: väntelistans kurva + halkläget som ärende. Marknadsföringens
   mätning sköter sig själv.

### Axels manuella 15-minuters-moment (kan inte automatiseras utan risk)
- Skapa FB-sidan + annonskonto (engångs, ~30 min) — före oktober.
- Vid 🚨-mejl: kopiera texten ur ärendet → posta → boosta enligt instruktionen.
- Flashback/Reddit: posta trådarna ur REKRYTERING/GTM när betan öppnar (anonymt/projektkonto).

### Nästa utbyggnadssteg (aktiveras av händelser, inte datum)
- **Play-länk finns** → badges + alla utkast byter mål från väntelistan till butiken (en rad).
- **Domän köpt** → hej@halkvakt.se (Cloudflare Email Routing) + Resend-konto → automatiskt
  välkomstmejl till väntelistan och massutskick "betan är här" på launchdagen.
- **Länssidor (#13)** → snölarmets text länkar till "Halka i {län} just nu"-sidan; delnings-
  kort per län genereras i samma pipeline.
- **utm/source** → formuläret taggar redan källa per sida; utökas med ?src= per kanal så
  veckorapporten visar vilken kanal som faktiskt konverterar.
