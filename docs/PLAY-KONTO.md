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

1. **Organisationen finns inte än.** Skyltfondspaketet har en obesvarad fråga: *sökande — privat eller
   ideell förening?* (bedömningen §4.2). Väljs organisationskontot måste föreningen finnas, ha ett
   DUNS-nummer och en webbplats, och det är 30 dagars ledtid från i dag — alltså **20 oktober i bästa
   fall**, tio dagar före betan.
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

Det här finns redan, eller är kända hål:

| Sak | Läge |
| :-- | :-- |
| Signerad AAB ur CI | ✅ finns (`android.yml` bygger `app-release.aab` som artefakt) |
| Signeringsnyckeln | ✅ i GitHub Secrets. ⚠️ **Efter första Play-uppladdningen är nyckeln bunden hos Google** (CLAUDE.md) — jks-filen måste finnas i iCloud först |
| **Data Safety-deklarationen** | ❌ **osann sedan 16/9** — kort #214. Måste rättas FÖRE uppladdning |
| Uppladdningsflöde | ❌ finns inte — CI bygger en artefakt och där slutar det |
| Android-versionen | ⚠️ 0.3.1 (4) mot iOS 0.3.8 (11) — kort #219 |
| Onboarding på Android | ❌ saknas helt — kort #217 |
| Butikstext, ikon, skärmbilder | ❌ inte gjort |

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
