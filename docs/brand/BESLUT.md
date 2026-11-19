# Halkvakt — varumärkesbeslut och öppna frågor

> Logg över varumärkesbesluten. Gällande regler står i `docs/brand/VARUMARKESGUIDE.md` (Varumärkesguide 1.0, okt 2026). Den här filen säger *när* och *vem*, och vad som fortfarande är öppet. Rättad 2026-10-17, lagd i repot 2026-11-19 (kopia av projektdokumentet `brand/beslut.md` i Claude-projektet).

## Källorna, i ordning

1. **Varumärkesguide 1.0** (Claude Design, okt 2026): https://claude.ai/artifact/P9ubdfDCVuRUJgqpR1sNKC — gäller.
2. **Sociala mallar** (Claude Design, okt 2026): https://claude.ai/artifact/TWKqCXjEnngEHYuBRXj3JF — gäller för kanalerna.
3. **Designöverlämningen för appen** (2/10, version 2): `design/app-handoff-README.md` i Claude-projektet. Stämmer med guiden.
4. **Designsystemet "Halkvakt"** (Design System-artefakt, 2/10): https://claude.ai/artifact/SHt514QLsGXG87Jk7DHAB7 — **äldre**, se öppen fråga 2.

## Beslut

- **Logotypen behåller "!" (2/10 18:26, Axel).** Rundad triangel med utropstecknet urstansat (even-odd), gul #FFC94A; svart #080B0D på varningskortet. Ordmärke HALKVAKT i IBM Plex Mono SemiBold, versaler, spärrning 0,12 em. SVG: `docs/brand/halkvakt-mark.svg`, viewBox "3 3 94 83". Ersätter "Mätplatsen" (fylld triangel utan "!", beslutad ca 01:55 samma dag). Infört i designsystemet (dess logg 2/10), i Varumärkesguide 1.0 och i appöverlämningen.
- **En logotyp (2/10, Axel):** triangel + HALKVAKT på en rad; triangeln ensam bara där namnet inte får plats (appikon, profilbild, favicon). Ingen staplad version.
- **Sting: "Statusljuset" (2/10 13:42, Axel)** — filmen tonar mot mörkt, triangeln blinkar två gånger och stannar, HALKVAKT glider ihop, taglinen reser sig. Leverans: halkvakt-teaser-v3.mp4. Stingsidan: https://claude.ai/artifact/JKM7LMaSdSfXWGVcupfH43 (alternativ A valt).
- **Färgerna** i Varumärkesguide 1.0: mark #080B0D, panel #0F1518, signalgul #FFC94A, grön #1FB25A, text #E9EFF2 med neutralerna i guiden. (Ersätter #FFC400 och de äldre markfärgerna #0E1B25/#0E141A/#101418.) Föreslogs av Claude 2/10 och står nu i guiden; ingen separat bekräftelse från Axel loggad.
- **Marknadsföring som Halkvakt (13/10, Axel):** alla inlägg och kommentarer skrivs som Halkvakt, aldrig som privatperson.
- **Halkvakt live (16/10, Axel):** automatiska inlägg till Facebook-sidan och Instagram @halkvakt, varierade och händelsestyrda, högst tre per dag, med App Store-länken. Mall: Sociala mallar, nr 1.

- **Inga långa tankstreck i motorns repliker (17/10, Axel).** Guidens regel gäller även rösten, utan undantag. Replikerna med "—" (kort C, F, G, H i appöverlämningen) skrivs om i motorn (TS/Kotlin/Swift, texts.ts, vektorerna) och på varningskorten. Ej byggt än; överlämningens repliker är inaktuella på den punkten tills motorn är ändrad.
- **Prognosen heter Prognos, utan beta (31/10, Axel och Bengt).** Ersätter "Halkvakt tror · beta" (DECISIONS #579). Skälet: varumärket ska inte stå på det enda som inte är uppmätt, och knappen ska säga vad den visar. Beta tas bort eftersom de är säkra på modellen. "Modellerat, inte uppmätt" står kvar. Infört på halkvakt.se 31/10 (halkvakt-karta c418163: kartan, Vanliga frågor, Om Halkvakt). Appen och dess texter ändras i nästa bygge.

## Öppna frågor

1. *(Avgjord 17/10, se Beslut: tankstrecken ska bort.)*
2. *(Avgjord 17/10: designsystemet uppdaterades efter guiden 1.0 samma kväll — tokens, nya logofiler i guidens proportioner, sex ikoner, komponenter, brand-bok. Version 8.)* Tidigare: **Designsystemet från 2/10 var inaktuellt.** Avviker från guiden 1.0: fem ikoner på 24-rutnät (guiden: sex på 48, linje 3,5), färgnamn varselgul/natt/vagbana, annan typskala (rubrik 26, bröd 16), friyta en triangelhöjd (guiden: ¼ av märkets bredd), temat Dag. Det pekas ut som källa för `Theme.swift`/`Theme.kt`. Uppdatera efter guiden eller pensionera. *Väntar på Axel.*
3. **Så funkar Halkvakt:** serien har fem kort, mallfilen har bara 01 och 04.
4. **Designduken "Halkvakt brand and marketing"** (https://claude.ai/artifact/TttkUUMxBZuRy2dLF2T1Hj — logoförslag, banners, OG-bild, Play-grafik, X-kort) bar #FFC400 och gamla markfärger 2/10. Troligen ersatt av guiden och mallarna; kontrollera innan något därifrån används.

## Kvar att göra (från 2/10, ej avbockat här)

- Logga logotypen med "!", stingen och färgerna i repots DECISIONS; TAVLA-kort för appikon, Play-grafik och karta-repots logo.svg/favicon.
- App Store-skärmbilderna (ljus mark, gammal ikon) görs om enligt guiden.
- "Prognos" i appen (Axelstar/Halkvakt) och i DECISIONS, som ersätter #579:s namn.
