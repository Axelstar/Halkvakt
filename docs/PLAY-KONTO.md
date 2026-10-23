# Google Play-konto — vad som krävs, vilket val som måste göras först, och i vilken ordning

**Skrivet av Claude 2026-09-20 på Bengts order (kort 7 i Axels lista). Allt nedan är LÄST på Googles
egna hjälpsidor samma dag, inte ur minnet — reglerna ändrades 13 november 2023 och en föråldrad
instruktion kostar ett varv. Källor anges per påstående.**

Jag kan inte skapa kontot, betala avgiften eller ange identitetsuppgifter åt er. Det är ert att göra.
Det här är underlaget och stegen.

---

## 1. Det viktigaste fyndet: novemberbetan är INTE blockerad

Google kräver sedan 13/11 2023 att **personliga** utvecklarkonton kör ett **slutet test med minst
tolv testare som deltagit löpande i minst 14 dagar** innan man får ansöka om åtkomst till
produktionskanalen.

> *"Utvecklare med personliga konton som skapats efter den 13 november 2023 måste köra ett slutet test
> av appen med minst tolv testare som har deltagit löpande i minst 14 dagar."*
> — support.google.com/googleplay/android-developer/answer/14151465

**Men kravet gäller PRODUKTION, inte testning.** Samma sida säger att det bara är *Produktion* och
*Förhandsregistrering* som är låsta tills kravet uppfylls, och att **slutet test kan startas så snart
appen är konfigurerad**.

**Följden för oss:** betan till tolv testare i november **är** det slutna testet. Den kan köras direkt
efter registrering. De tolv testare S5 redan planerar är samma tolv som Google räknar. Kravet är alltså
inte ett hinder — det är en beskrivning av det vi ändå tänkte göra.

Det som kravet däremot gör är att **sätta en klocka**: fjorton löpande dygn med tolv testare måste ha
passerat innan appen kan bli publik. Släpps betan 1 november är tidigast möjliga publika release
mitten av november — och bara om alla tolv är kvar hela tiden.

---

## 2. Valet som måste göras FÖRE registreringen

Kontotypen väljs vid registreringen och styr både vad som krävs och vad som syns publikt.

| | **Personligt konto** | **Organisationskonto** |
| :-- | :-- | :-- |
| Kräver DUNS-nummer | Nej | **Ja** |
| Ledtid | Direkt | **Upp till 30 dagar** för DUNS |
| Tolv testare × 14 dygn före produktion | **Ja** | Nej |
| Visas publikt på Google Play | Officiellt namn, land, utvecklarens e-post | Organisationens namn, juridisk adress, e-post **och telefonnummer** |
| Kräver | Juridiskt namn och adress, kontaktmejl, kontakttelefon | Allt det + organisationens namn, adress, telefon, **webbplats**, kontaktperson |

> *"Om du inte har något DUNS-nummer kan du ansöka om ett från Dun & Bradstreet. Processen kan ta upp
> till 30 dagar."* — support.google.com/googleplay/android-developer/answer/13628312

**Tre saker gör valet skarpt:**

1. **Det finns ingen organisation.** Halkvakt drivs av Bengt och Axel som privatpersoner (Bengt 22/10,
   DECISIONS #683). Föreningen som planerades bildades aldrig (#500), och Skyltfondsansökan gick in med
   Bengt som privatperson (#404). Ett organisationskonto kräver en organisation med DUNS-nummer och
   webbplats, och DUNS tar upp till 30 dagar. *(Omskriven 23/10; stod 20/9 som en öppen fråga om en förening.)*
2. **Apple-kontot är Individual i Axels namn** (CLAUDE.md, 31/8). Ett organisationskonto hos Google och
   ett individkonto hos Apple ger två olika säljare för samma app.
3. **Ett personligt konto exponerar en privatperson.** Officiellt namn och land visas på Google Play.
   För en app som ska varna bilförare om halka är det en verklig fråga vems namn som står där.

**Min rekommendation: personligt konto nu.** Skälen är att det inte blockerar betan, att organisationen
inte finns, och att 30 dagars DUNS-ledtid äter upp marginalen till november. Migrering till
organisation senare är en öppen fråga jag **inte** har verifierat — behandla den som okänd, inte som
given.

---

## 3. Stegen, i ordning

Googles egen ordning (support.google.com/googleplay/android-developer/answer/6112435):

| Steg | Vad | Vem |
| :-- | :-- | :-- |
| 1 | Registrera utvecklarkonto på Play Console med ett Google-konto | **Ägaren** (se §2) |
| 2 | Godkänn distributionsavtalet | Ägaren |
| 3 | Betala registreringsavgiften — **25 USD, engångsavgift**, kredit- eller bankkort | Ägaren |
| 4 | Välj kontotyp: personligt eller organisation | **Beslutet i §2** |
| 5 | Verifiera identitetsuppgifter | Ägaren |
| 6 | *(endast personliga konton)* Uppfyll testkraven | Betan i november |

**Google-kontot som används bör inte vara någons privata vardagskonto.** Kontot äger appen; tappas det,
tappas appen. Samma resonemang som CLAUDE.md redan har om signeringsnyckeln.

---

## 4. Vad som måste vara klart innan första uppladdningen

**Läget 22/10** (rättat 22/10 ur STATUS.md, DECISIONS, `android/app/build.gradle.kts` och git; tabellen stod till dess på läget
20/9: 0.3.1 (4), Data Safety *osann* och inget uppladdningsflöde). Det som saknar källa här står som *oklart, fråga Axel*.
Betatest-spärren och butikstexten rättade 23/10 (DECISIONS #683).

| Sak | Läget 22/10 | Källa |
| :-- | :-- | :-- |
| Android-versionen | ✅ 0.3.13, **versionCode 32** på main, i takt med iOS 0.3.13 (32) | `android/app/build.gradle.kts:9`; DECISIONS #643 |
| Signerad AAB ur CI | ✅ `android.yml` bygger `app-release.aab` (artefakten `halkvakt-release-aab`); versionCode 32 i android 39271818731 på e83e56c | DECISIONS #643; STATUS 19/10 |
| Uppladdningsflöde | ❌ inget flöde laddar upp till Play: android.yml slutar med artefakten. Hur (27) kom till Play Console: **oklart, fråga Axel** | `.github/workflows/android.yml` (inga Play-steg) |
| targetSdk | ⚠️ **35 på main.** Play Console vägrade 0.3.13 (27) i internt test: appen måste vara inriktad på minst API-nivå 36. Axels PR #1029 (grenen `claude/target-sdk-36`) höjer targetSdk och compileSdk till 36; (27) är *förbrukad i Play Console*, så grenen tog versionCode 28. PR:en tas in i (33) när Axel bekräftat att den är färdig | `build.gradle.kts:7`; commit a874fbb1 17/10; DECISIONS #681 punkt 2 |
| Identitetsgranskningen | ⚠️ inskickad till Google 4/10, och enligt DECISIONS #640 (18/10) och #643 väntar Play internt på den. Men Axel hade 0.3.13 (28) i **internt test** på sin Android 17/10 (commit 3cd31a97, DECISIONS #681 punkt 2), vilket kräver att appen finns i Play Console. Om granskningen är klar: **oklart, fråga Axel** | TAVLA kort #219 (4/10); DECISIONS #640, #681; 3cd31a97 |
| Signeringsnyckeln | ✅ i GitHub Secrets. ⚠️ Efter första Play-uppladdningen är nyckeln bunden hos Google (CLAUDE.md), och (27) är uppladdad (a874fbb1). Vilken nyckel den bar, och om jks-filen ligger i iCloud: **oklart, fråga Axel** | CLAUDE.md; a874fbb1 |
| **Data Safety-deklarationen** | ✅ sann sedan 20/9 (kort #214, DECISIONS #270), radering *Nej* 26/9 (#378), policyn rättad 23/9 och 1/10 (#320, #432). Om formuläret är ifyllt i Play Console: **oklart, fråga Axel** | `docs/PLAY-DATASAFETY.md` |
| Betatest-spärren | ✅ **PR #1159 sammanslagen 23/10** (b4f68bc6): en byggflagga, `-Phalkvakt.betatest` (`BuildConfig.BETATEST_TILLATEN`, standard true). `android.yml` bygger produktionens AAB med valet `betatest=false`, och då syns varken brytaren eller raden i Integritet, och en påslagen brytare gäller inte (`Prefs.betatestPa`). Byggena vid push till main är testbyggen med Betatest. iOS: från (33) bara i TestFlight och utvecklarbyggen | DECISIONS #681 punkt 3; PR #1159 (d93f3206) |
| Slutet test | ❌ **inte startat** — tolv testare i fjorton löpande dygn krävs före produktion (§1); inga testare bokförda | TAVLA *Tolv testare till Play-perioden* (Verify öppen); DECISIONS #681 punkt 3 (*ingen offentlig kanal*) |
| Introduktion på Android | ❌ ingen på main; första trycket på Starta ber om plats och notiser. PR #1029 lägger en förklaring före Androids behörighetsrutor (3cd31a97), inte i main | kort #284 (c); `docs/APPEN.html` §4 |
| Butikstext, ikon, skärmbilder | Butikstexten `marknadsforing/butik/butikstext.md` (rättad 2/10, och 23/10: betatestet bara i testversionen, #681, #683), ikon 512 och feature graphic gjorda 1/10; Android-skärmbilderna: **oklart, fråga Axel** | TAVLA kort #219, fredagens lista 2/10 |

↪ **22/10:** stycket nedan skrevs 20/9. #214 är rättad sedan 20/9, och en första uppladdning är gjord ((27), a874fbb1).

**Ordningen som följer av det:** kontot kan registreras i dag, men första uppladdningen bör vänta tills
#214 är rättad. En osann Data Safety-deklaration är grund för avslag, och avslaget kommer mitt i det
enda facitfönster vintern ger.

---

## 5. Vad jag kan göra, och vad jag inte kan

**Kan (säg till):**
- Bygga uppladdningsflödet till Play (internt test-kanalen) i CI, så att en AAB når testarna med en knapp.
- Rätta Data Safety-deklarationen (#214) — men lydelsen om produktinvarianten är ert beslut.
- Ta Android ikapp iOS och bygga onboardingen (#219, #217).
- Skriva butikstexten och ta skärmbilderna ur fotostudion.

**Kan inte:** skapa kontot, godkänna avtalet, betala avgiften, ange identitetsuppgifter eller logga in.
Det är ert, och det är avsiktligt.

---

## 6. Tidslinjen om ni registrerar i dag

| När | Vad |
| :-- | :-- |
| I dag | Konto registrerat, avgift betald, identitet verifierad |
| Inom en vecka | #214 rättad, uppladdningsflödet byggt, Android ikapp |
| Slutet av oktober | Första AAB i internt test, butikssidan ifylld |
| 1 november | **Slutet test startar — de tolv testarna.** Klockan börjar ticka |
| ~15 november | Fjorton löpande dygn passerade ⇒ produktion kan sökas |
| Därefter | Ansökan om produktionsåtkomst, med frågor om testet |

Betan behöver alltså inte vänta på någonting i Google — men den publika releasen kan inte komma före
mitten av november, oavsett hur bra appen är.
