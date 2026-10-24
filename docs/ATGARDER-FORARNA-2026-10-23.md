# Åtgärdslistan för block 6, Ut till förarna

**Varför:** genomgången av blocket Ut till förarna 23/10 (läs-only, två hjälpagenter, förklarad i chatten) och omgång 1 samma dag
(DECISIONS #683). Bengt 23/10: *"Ja, lägg fram de sex besluten för Ut till förarna som en omgång"*.

**Reglerna** är desamma som i `docs/ATGARDER-MOTORN-2026-10-21.md` och `docs/ATGARDER-APPEN-2026-10-22.md`:
- Numren byts aldrig och återanvänds aldrig.
- En rad stängs av en PR, ett beslut eller ett uttryckligt bortval.
- Status: `öppen` · `pågår` · `klar` · `bortvald`.

## A. Beslut (omgång 1, 23/10)

| Nr | Fråga | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B6-01 | TestFlight-länken ligger öppet i det publika repot | **klar** — *"Behåll den publika länken"*: följden för KB-D4 och Kompisarna först är utskriven | #683 |
| B6-02 | Integritetssidan anger Axel under Lagerlöf Labs som utgivare | ↪ **överspelad 24/10 (DECISIONS #706)** — Bengt: *"Ta Lagerlöf Labs och jag blir personuppgiftsansvarig"*. ~~**klar** — *"Låt stå som det är"*~~ | #683 → #706 |
| B6-03 | Föreningen i texter som ska ut eller styr | **klar** — *"Rätta allt som ska ut eller styr"* | #683 |
| B6-04 | Ingen frist för Skyltfondens besked 15/12 | **klar** — fristen `skyltfonden-besked`, med plan vid ja och vid nej (Bengt utan preferens) | #683 |
| B6-05 | QR-koden och /app | **klar** — *"Vänta på Google Play"* | #683 |
| B6-06 | PR #1093 (inskicket med (32)) är överspelad | **klar** — *"Stäng den"* | #683 |

## B. Rättelser (samma PR som besluten)

| Nr | Var | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B6-07 | PK u-testflight | Står kvar på (22) och 0.3.9. (33) kräver en ny Beta App Review. Besluten #676, #678 och #681 och den publika länken saknas | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-08 | PK u-app-store | Stegens Kvar-rader är gamla. Beviset b9626bf är före policyändringen (#635). Saknas-raderna gäller inskicket av (33), alltså B5-34 | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-09 | PK u-play | "Första uppladdningen: saknas" är fel, (27) och (28) låg i Play Console 17/10. targetSdk 35 på main. Play-texten lovar Betatest | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-10 | PK u-namnet | "halkvakt.se är inte vår" är gammalt (#559). E-posten går via Zoho. Steget "Ansökt eller registrerat" är pågår | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-11 | PK u-qr | Väntar inte längre på domänen. iPhone-länken ska vara App Store-länken (#601) | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-12 | PK u-marknadsforing | Halkvakt live på X (#663), presskitet ute (#588), Axels handgrepp pågår | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-13 | PK u-skyltfonden | Organisationsnumret ska bort (#500). Beviset är utkasten, inte den skickade versionen (#411) | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-14 | Föreningen i marknadsplanen och dess sida, MALET (not), FINANSIERING, bedömningen, tavlan och PLAY-KONTO | — | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-15 | `docs/PRODUKTBOK.md` | Säger att ingen Android-version gått ut via Play. Versionstabellen slutar på (26) | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-16 | `docs/BETAGUIDE-IOS.md` | Skriven för 0.3.9. Säger inget om Betatest i TestFlight, S3 eller kandidatens BETA-varning | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-17 | `marknadsforing/butik/butikstext.md` (Play) | Lovar Betatest, men produktionens AAB saknar det sedan #1159 | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-18 | PLAY-KONTO och PLAY-DATASAFETY | Raderna om PR #1159 blev gamla när den slogs ihop | **klar** — rättat 23/10 mot källorna | PR omgång 1, #683 |
| B6-19 | DECISIONS #678 | Claude kallade utkasten "den skickade Skyltfondsansökan" | **klar** — rättat med markering 23/10 | #683 |

## C. Byggen och texter som saknas

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B6-20 | QR-koden och /app när Google Play finns (kort #277) | Claude, efter Play | öppen | |
| B6-21 | Marknadsplanens §5: partnerbreven, pressmeddelandena, nyhetsbrevsmallen och demovideon. Mejlen till M Sverige, MHF, NTF och Åkeriföretagen hör hit | Claude (utkast), Bengt och Axel (skickar) | öppen | |
| B6-22 | Betygsfrågan i appen. Det finns ingen review-kod i ios/ och android/ | Claude | öppen | |

## D. Axels

| Nr | Fråga | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B6-23 | Vem äger domänen halkvakt.se? Kortets Verify kräver att ägaren bokförs (TAVLA, kortet om namnet och domänen) | **klar** — *"axel"* (Bengt 23/10); förnyelsedatumet är inte bokfört och står på Axels lista | #685 |
| B6-24 | Är varumärket sökt hos PRV? | öppen — *"axel äger men ingen åtgärd ännu"* (Bengt 23/10) | |
| B6-25 | Är Search Console uppsatt? DNS har två verifieringsposter | **klar** — uppsatt: Axel läste 111 exponeringar och 2 klick på ett dygn 20/10 (#684) | #684 |
| B6-26 | PR #1088 (besöksräknaren) använder DECISIONS #645 och sql/064, som båda redan är upptagna på main | **klar** — *"gör besöksräknaren"* (Bengt 23/10): omnumrerad till #684 och sql/067, PR #1088 | #684 |
| B6-27 | PR #1056 (MCP-servern i drift) är inte sammanslagen sedan 17/10 | öppen — på Axels lista (Bengt 23/10) | |
| B6-28 | Läget i Google Play: se B5-36 i åtgärdslistan för Appen | öppen | |

## E. Övrigt

| Nr | Fynd | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B6-29 | Marknadsmotorn skrev inga utkast 18–20/10, och orsaken är oklar | Claude | öppen | |
| B6-30 | App Store-datumet står som 12, 13 eller 14/10 på olika ställen | Claude | öppen | |
| B6-31 | `marknadsforing/butik/butikstext.md` (Play) säger fortfarande "ingen spårning" och "aldrig", och saknar meningen om sparade resor som iOS-texten fick (#616, #625) | Claude | öppen | |
| B6-32 | `docs/BETAGUIDE-ANDROID.md` säger inget om att Betatest bara finns i testbyggen (#681, PR #1159) | Claude | **klar** — avsnittet *Nytt från versionCode 33* (#686) | #686 |
| B6-33 | PRODUKTBOK: raden "Android (CI)" är gammal, och (25) saknas eftersom det ersattes av (26) innan något byggdes | Claude | öppen | |
| B6-34 | hej@halkvakt.se: tar brevlådan emot post? | Bengt | **klar** — *"fungerar"* (Bengt 23/10) | #685 |
| B6-35 | Lösenorden till Facebook, Instagram och X | Axel | **klar** — *"axel har ansvar för denna"* (Bengt 23/10); var de förvaras skrivs aldrig i repot | #685 |
| B6-36 | Pressrubriken vid Skyltfondens besked ställde Halkvakt mot Trafikverket | Claude | **klar** — *"ändra så att texten är mer neutral"* (Bengt 23/10): ny rubrik i marknadsplanen, alternativen i chatten | #685 |
