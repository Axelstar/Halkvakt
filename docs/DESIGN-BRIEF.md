# Halkvakt — designbrief för Claude Design (1 september 2026)

Det här är underlaget för skinnet (#24). Axel ritar i Claude Design, exporterar till
`docs/design/`, Claude portar exakt till SwiftUI (iOS) och Compose (Android). Ändra
inte i koden för utseendets skull — ändra här och i designen, så håller båda plattformarna ihop.

## Vad appen är, i en mening
En röst som varnar för halka, olyckor, frysrisk, vilt och fartkameror — innan du är där.
Skärmen är sekundär. Ingen knapp trycks under körning. Tystnad betyder att vägen är lugn.

## Fasta regler (bryts inte i designen)
1. **Mörkt.** Appen lever i bilen, ofta i mörker. Bakgrund #06090D, paneler #0E1B25.
2. **Gul är rösten.** #FFC400 används för rubriker, knappar som *gör* något, och det som
   är viktigt. Grönt #2FBF71 = på/klart. Inget annat accentspråk.
3. **Inga knappar under körning.** Körläget (skärmen som visas när vakten kör) får ha
   *en* knapp: "Avsluta körningen", längst ner, avsiktligt dämpad.
4. **Stora siffror, korta ord.** Tid, kilometer, antal varningar — läsbara på armlängds
   avstånd i en hållare. Monospace (SF Mono / JetBrains Mono) för siffror och rubrik-
   etiketter; systemets sans för brödtext.
5. **Röstens ord är designens ord.** "Vakten", "Senast sagt", "På din väg", "Starta vakten".
   Inga engelska termer, inga tekniska ord.
6. **Samma sak på Android.** Det som ritas ska gå att bygga i Compose utan tolkning.

## Skärmarna (skärmbilder från 0.3.2 finns hos Axel)
1. **Introduktionen, 4 sidor** — löftet · platsen (Tillåt plats → Tillåt Alltid → grön bock) ·
   bannern · "Du är klar". Prickar för sida, "Hoppa över" + "Nästa/Klar".
2. **Vakten (hemskärm, vilande)** — status ("Redo att köra"), Starta-knappen, "Senast sagt"
   (förra körningens sista replik + "Vaknade själv HH:MM · körde N min"), "I närheten"
   (farokort: ikon, typ, avstånd).
3. **Körläget** — rubrik ("Passageraren är vaken" idag — byt gärna), tre stora siffror
   (tid · km · varningar), "På din väg" (farokort framåt), Avsluta längst ner.
4. **Varningskortet** — helskärm i 8 s när rösten talar: ikon, typ, avstånd, texten rösten
   sa. Ingen knapp. Försvinner själv.
5. **Inställningar** — Varna för (5 växlar), Förvarning (slider), Vakna själv (växel),
   Starta direkt (valfritt: Siri + Genvägar-guiden med fråga CarPlay/Bluetooth/Inte alls),
   Rösten (provlyssna), Visa introduktionen igen.
6. **Om** — löftet, källorna med attribution (Trafikverket, Fintraffic, DMI, Vejdirektoratet,
   Vegvesen), version.

## Byggstenar som finns i koden (och ska finnas i designen)
- `Panel` — rundad panel (16 pt), #0E1B25
- `SectionHeader` — versaler, monospace, gul, spärrad
- `PillButton` — kapselknapp, fet text, ikon
- `BrandHeader` — ⚠ HALKVAKT + statuspill (VAKTEN PÅ / LIVEDATA)
- `LastSaidCard`, `NearbyRow`/farokort, `GuideStep` (numrerad rad), `ChoiceButton`

## Typografi idag (för att veta vad som ska ersättas)
Rubriker 30/28/26 heavy · brödtext 15–16 · sekundärt 13–14 · etiketter 12 monospace ·
körlägessiffror 44–64 monospace. Trettio olika storlekar i koden — designen får gärna
landa på fem–sex och Claude städar.

## Fritt att bestämma i designen
Marginaler, radavstånd, ikonstil, hur farokorten ser ut, om körläget ska ha en tunn
progress/riktningsindikator, hur "Senast sagt" ser ut när det är tomt, animationen
när varningskortet kommer och går, ljus variant (om någon ska ha den — Axel beslutar).

## Öppna frågor till Axel innan ritning
- Körlägets rubrik: "Passageraren är vaken" eller något annat?
- Ska farokorten visa avstånd i meter under 1 km ("800 m") och km över?
- Ljust läge: ja/nej? (Mitt råd: nej i v1 — bilen är mörk.)

## Leverans
Exportera varje skärm som PNG i `docs/design/<skärm>.png` + en `tokens.md` med färger,
typstorlekar och radier. Claude portar och skickar skärmbild per skärm för jämförelse.
