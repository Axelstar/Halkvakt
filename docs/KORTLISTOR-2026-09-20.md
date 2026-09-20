# Öppna kort efter stängningen — Axel (25) och Bengt (13)

Utdraget ur TAVLA.md 2026-09-20 efter att sex överspelade kort stängts (DECISIONS #250).
Statusflaggorna är kontrollerade mot kod och drift samma dag.

**Ägarskap:**
🔒 **EXKLUSIVT** = kräver personens eget konto, underskrift, telefon eller relation. Ingen annan kan göra det.
🤝 **BÅDA** = ett beslut som kräver er två.
↔️ **DELEGERBART** = någon annan kan verkställa (Claude bygger, den andre registrerar eller rekryterar).

**Brådska:** 🔴 blockerar november · 🟠 tidsatt · ⚪ kan vänta.

---

## AXEL — 25 kort

### 🔒 Exklusivt Axel (6) — ingen annan kan göra dem

| Kort | Vad som ska göras | Varför bara han | Brådska |
| :-- | :-- | :-- | :-- |
| **3. Skärmklipp av Billing** | Läs Settings → Billing för hela kontot och skicka bilden | Faktureringssidan tillhör hans GitHub-konto. Kassavakten ser bara Halkvakt; taket 35 USD gäller alla repon | 🟠 före 24/9 |
| **#85 Actions-takten** | Samma avläsning som kort 3 — slå ihop dem | Samma sida | 🟠 |
| **#86 PAT-rotationen** | Skapa ny PAT före 15/11 (nuvarande går ut 22/11 20:55 UTC). Fyra ställen, inklusive pulsklockans jobb i pg_cron | En ny nyckel kan bara skapas på hans konto. **Bytet däremot är en knapp** som Claude kan trycka (`pulsklocka.yml`, läge nyckel) | 🟠 15/11 |
| **#83 Pro-godkännandet** | Godkänn cirka 25 USD/mån senast 1/11 eller vid 400 MB (178 MB nu) | Gratisregeln i CLAUDE.md: ingen betald tjänst utan en DECISIONS-post **godkänd av Axel** | 🔴 |
| **7. Google Play-konto** | Registrera och betala | Samma säljaridentitet som Apple-kontot (Individual, hans namn). *Väljer ni en förening som ägare blir kortet delegerbart* | 🔴 |
| **Publikt repo eller köpa minuter** | Kontoinställning | Hans konto. Ingen brådska — appen behöver inte svaret | ⚪ |

### 🤝 Kräver er båda (5)

| Kort | Vad som ska göras | Brådska |
| :-- | :-- | :-- |
| **#203 Facit utan att stanna** | Åtta beslut i `docs/FACIT-EFTER-RESAN.md` §8. Regeln heter KB-D7. **Undantag:** stoppdatum 27/9 — kommer inga svar beslutar Bengt ensam och 0.3.8 arkiveras | 🔴 27/9 |
| **Helgsamtalet** | Roller, föreningen, klartecken till ringrundan, intäktsmodellen | 🟠 |
| **Skyltfonden-paketet före 1/10** | (a) klartecken till ringrundan, (b) sökande: privat eller ideell förening, (c) rollfördelningen | 🔴 ansökan 28/9 |
| **Rollfördelningen** | Är efterfrågan, affärsmodell och B2B Bengts ansvar? | 🟠 |
| **#21 Anonym puls + feedback-knapp** | Rör löftet "samlar in: ingenting". Råd: paketera med sensorbeslutet våren 2027 | ⚪ |

### ↔️ Delegerbart (14) — ligger hos Axel men någon annan kan verkställa

| Kort | Vad som ska göras | Vem kan göra det |
| :-- | :-- | :-- |
| **6. Tolv testare** 🔴 | Namnge tolv personer | **Bengt** — hans ringrunda till trafikskolorna ger trafiklärare, som redan är planerade som testförare |
| **Tolv testare till Play-perioden** | Dubblett av kort 6 — slå ihop | Bengt |
| **Skydda namnet (PRV + halkvakt.se)** 🟠 | Varumärkesansökan och domänköp | Vem som helst; kräver bara ett beslut om ägare |
| **Domänen halkvakt.se** | Samma sak — slå ihop med raden ovan | Vem som helst |
| **Danmark — NAP-nyckel** | Gratis registrering före produktion | Vem som helst |
| **Introduktionen (iOS) — bevis saknas** 🟠 | Radera appen, installera, intron ska komma | **Bengt på sin iPhone** — kräver bara en telefon, inte Axels |
| **Fysisk Android-testenhet** 🟠 | Låna eller köp en telefon | Bengt. Angeläget: Android är sju versioner efter iOS |
| **Guiden med bilder och film** 🟠 | Skärmbild per steg, inbakade i appen | **Claude** ur fotostudions artefakt |
| **Live Activity** | Varningskortet i Dynamic Island och på låsskärmen | Claude skriver Swift-koden |
| **Startknapp på låsskärmen** | Widget (iOS 17), Kontrollcenter, åtgärdsknappen | Claude |
| **#23 heads-up** | Bannern över kartappen, båda plattformarna | Claude |
| **Skinnet v3 på Android** | Del 1 och 2 committade 2/9, resten kvar | Claude |
| **Norden efter facit** | Finland live, Norge sedan, Danmark sist | Claude bygger; Axel prioriterar |
| **Betalvilja mäts i mars** | En fråga i appen efter vintern | Claude bygger när det blir aktuellt |

### Plus: ett gemensamt kort i Beslutsgången
**Ge Bengt egna händer i koden** (`docs/BENGT-CLAUDE-KODEN.md`) — 🤝 er båda.

### Nytt i dag ur genomlysningen — två beslut till er båda
- **#214** Play-deklarationen är osann sedan 16/9. Ska produktinvariantens lydelse formuleras om, eller ska facitsvaret ändras? 🔴 **före första uppladdningen**
- **#216** Blindningsläckan i T-A. Strypa utskriften, eller skriva att de delade dimensionerna är förvalda? 🔴 **före frosten**

---

## BENGT — 13 kort

### 🔒 Exklusivt Bengt (4)

| Kort | Vad som ska göras | Varför bara du | Brådska |
| :-- | :-- | :-- | :-- |
| **#154 Anmäl nio trasiga byvindgivare** | Brevet är **skrivet och klart** i `docs/ANMALAN-TRV-BYVINDGIVARE.md` — skicka det | Ett utskick i ditt namn till en myndighet. Claude skickar aldrig meddelanden åt dig | 🟠 |
| **Skyltfondsrundan** | Samtalen 21–25/9 (kontaktplan v6.4), avsiktsförklaringar 25/9, **skicka ansökan 28/9** | Dina samtal, dina relationer | 🔴 den här veckan |
| **#94 Samarbeten vi inte prövat** | Åkerier och bussbolag som testbilar, NTF och M Sverige som kanal. Försäkringsspåret stängt 11/9. Verify: ett möte bokat per spår | Relationsarbete | ⚪ |
| **B2B: skolpaketet som produkt** | Per-elev-moment i körkortspaketen, STR som skalkanal, säljs våren 2027 | Ditt spår, dina kontakter | ⚪ |

### 🤝 Kräver er båda (3)

| Kort | Vad som ska göras | Brådska |
| :-- | :-- | :-- |
| **#159 Integrationskartan** | Tre frågor: omformulera #153 till försprång? skriva om tröskelregeln? bygga E före betan? | 🟠 |
| **#153 Allvar som försprång** | Beslut 1 omformulerat 16/9 — väntar på Axels kontrasignatur. Beslut 2 är ditt och öppet | ⚪ efter betan |
| **Sensortrappan** | Samtal med Axel om tidsättning av steg 2, våren 2027 | ⚪ |

### ↔️ Delegerbart (6)

| Kort | Vad som ska göras | Vem kan göra det |
| :-- | :-- | :-- |
| **#204 Skolans namn på QR-sidan** 🟠 | Beslutat och förberett 19/9; byggs när elevbladet byggs | **Claude bygger.** Väntar på Axels bedömning av formen och på domänen (en tryckt QR-kod går inte att ändra) |
| **#155 Snubbeltråden** 🟠 oktober | Skärps #83:s kvarhållning, eller börjar radar_precip gallras, måste #89 och #98 byta byggform | Claude mäter och lägger fram beslutet i oktober |
| **#156 Halkorden i tre versioner** 🟠 | Er halva åtgärdad 14/9 (fyra namngivna kontrakt). Kvar: ska "mycket besvärligt" in i snapshotens filter? | **Axels beslut**, Claude bygger |
| **Läsa SYSTEM.md mot koden månadsvis** 🟠 | Första gången var september — inte gjord | Claude kan köra genomgången och lägga fram avvikelserna |
| **Välkomsttext och testinstruktion till testarna** 🟠 | Extern TestFlight-grupp betyder Beta App Review (timmar till dygn) | Claude skriver, ni skickar |
| **Kameravarningen i fel riktning — beviset saknas** 🟠 | Koden återställd 10/9; fältbeviset saknas sedan 8/9 | **Du eller Axel** — kräver bara en bilresa förbi en känd kamera |

---

## Sammanfattningen som ändrar mötet

**29 kort hos Axel såg ut som 29 blockeringar. Sex är det.**

| | 🔒 Exklusivt | 🤝 Kräver er båda | ↔️ Delegerbart |
| :-- | --: | --: | --: |
| **Axel (25)** | 6 | 5 | 14 |
| **Bengt (13)** | 4 | 3 | 6 |

**Fem kort avgör november:** Play-kontot 🔒 · tolv testare ↔️ (Bengt kan) · #203 🤝 (stoppdatum 27/9) · Pro-beslutet 🔒 · Skyltfondsrundan 🔒 Bengt.

**Det billigaste greppet i dag:** flytta de fjorton delegerbara korten ur Axels lista till Claude eller Bengt.
Då har Axel elva kort kvar, varav sex bara kräver att han loggar in och trycker.
