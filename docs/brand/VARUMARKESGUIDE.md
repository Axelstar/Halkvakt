# Halkvakt — Varumärkesguide 1.0 (oktober 2026)

> Textversion av Claude Design-filen "Varumärkesguide": https://claude.ai/artifact/P9ubdfDCVuRUJgqpR1sNKC. Filen är källan; ändra där först och uppdatera sedan den här texten. Hämtad 2026-10-17, lagd i repot 2026-11-19.
> Gäller: app, varningskort, kanaler. Känsla: lugn, tydlig, vaken.
> Systerfil: Sociala mallar (`docs/brand/SOCIALA-MALLAR.md`). Beslut och öppna frågor: `docs/brand/BESLUT.md`.

## 01 · Kärnan

Halkvakt varnar med rösten, innan du är där. Halka, olyckor, frysrisk, vilt och fartkameror från Trafikverket, i din högtalare. Inga knappar medan du kör. Vakten vaknar själv och somnar själv.

| | Känsla | Betyder |
|---|---|---|
| 01 | **Lugn** | Mörkt, tyst och luftigt. Inget rör sig utan anledning. Vi höjer aldrig rösten. |
| 02 | **Tydlig** | En sak i taget, en knapp per skärm. Fara, plats, avstånd. I den ordningen. |
| 03 | **Vaken** | Statusljuset lyser. Datan är live. Vi säger till innan du är där, inte efter. |

**Löftet:** ”Din position lämnar inte telefonen av sig själv.” Står ordagrant, i den här formen, varje gång. Det är det enda vi upprepar överallt: onboarding, inställningar, kanaler.

## 02 · Logotyp — triangeln och ordet

- En fylld varningstriangel med rundade hörn och utropstecknet **utskuret**. Ordmärket HALKVAKT i IBM Plex Mono Semibold, versaler, spärrning 0,12 em.
- Varianter: **primär på mark** (gul triangel, ljust ord), **på gult** (svart märke), **på ljust** (svart märke).
- **Friyta:** minst ¼ av märkets bredd fritt runt om. Inget annat element innanför linjen.
- **Minsta storlek:** märket 16 px (under det försvinner utropstecknet); logotypen 96 px bred. Ordmärket aldrig mindre än 10 px.
- **Proportion:** märkets höjd ≈ 1,6 × ordets versalhöjd. Avstånd mellan märke och ord ≈ ⅓ av märkets bredd.
- **Gör inte:** ta bort utropstecknet · vrida eller luta · byta färg (bara gult, svart eller ljust) · töja eller trycka ihop · sätta ordet i annat typsnitt.
- Namnet i löptext: *Halkvakt* (inte HalkVakt, Halk-vakt).
- SVG för märket: `docs/brand/halkvakt-mark.svg`, viewBox "3 3 94 83", fill-rule evenodd, gul #FFC94A (svart #080B0D på varningskortet).

## 03 · Färg — mörker, och gult när det betyder något

Paletten är nästan svart. Gult används bara för statusljuset, knappar som gör något och varningskortet, den enda gula ytan. Grönt betyder på eller klart. Inga andra färger, inga övertoningar.

### Nyckelfärger

| Namn | Hex | Kontrast | Användning |
|---|---|---|---|
| Mark | `#080B0D` | text 16,9:1 | Bakgrund överallt. Nästan svart, aldrig rent svart. |
| Signalgul | `#FFC94A` | mot mark 12,8:1 | Statusljus, knappar som gör något, varningskortet. Inget annat. |
| Grön | `#1FB25A` | mot mark 7,1:1 | På och klart: växlare, bockar, REDO. |
| Text | `#E9EFF2` | mot mark 16,9:1 | Rubriker och primär text. |

### Neutraler

| Namn | Hex | Användning |
|---|---|---|
| Panel | `#0F1518` | Kort, paneler, flikfält |
| Upphöjd | `#1A2327` | Aktiv flik, bannrar, sockelns ovansida |
| Kant | `#1E282D` | Panelkanter |
| Skiljelinje | `#253036` | Streckade linjer i paneler |
| Spår | `#26323A` | Växlare av, reglagespår |
| Text 2 | `#A9B5BB` | Löptext och undertexter |
| Dämpad | `#8FA0A9` | Mono-etiketter och värden · 7,3:1 |
| Dämpad 2 | `#6F7C83` | Tips och fötter · 4,6:1, minst 10 px |
| Gul text | `#3A2E0B` | Sekundär text på gult · 8,7:1 |

## 04 · Typografi — två typsnitt, två jobb

- **Instrument Sans** (400 / 500 / 600) — rubriker och löptext. Rubriker 600 med negativ spärrning, löptext 400.
- **IBM Plex Mono** (500 / 600) — etiketter och siffror. Alltid versaler i etiketter, spärrning 0,12–0,16 em. Alla tal, avstånd, tider och enheter.

| Exempel | Roll | Spec |
|---|---|---|
| Halka | Varningsrubrik | Sans 600 · 56 · −0,035 em |
| Redo. | Hemskärm | Sans 600 · 44 · −0,03 em |
| Platsen, bara i telefonen | Sidrubrik | Sans 600 · 32 · −0,025 em |
| Vaknar själv när du kör | Rad | Sans 500 · 16 |
| Välj Alltid så kan vakten starta själv när du kör. | Löptext | Sans 400 · 15 / 1,45 |
| 500 M | Avstånd | Mono 600 · 68 |
| 36 MIN | Mätvärde | Mono 500 · 40 |
| HOPPA ÖVER | Etikett | Mono 500 · 11 · 0,14 em |

### Så skrivs tal

| Exempel | Regel |
|---|---|
| −1,8 °C | Riktigt minustecken (−), decimalkomma, mellanslag före enheten. |
| 500 M · 2 KM | Under en kilometer i hela hundratal, annars hela kilometer. Som rösten säger. |
| 06:42 | 24-timmars tid med kolon. |
| Hörby–Kristianstad | Tankstreck mellan orter, utan mellanslag. |
| 13 OKT | Datum i etiketter: dag och förkortad månad i versaler. |
| 14 av 38 | Hela tal. Aldrig procent när antalet är litet. |

## 05 · Ikoner — en ikon per fara

48-rutnät, linje 3,5, rundade ändar och hörn. Viltet är den enda fyllda formen. Svart på gult, ljust på mörkt. Aldrig gul ikon på mörk botten.

Sex ikoner: **Olycka, Halka, Frysrisk, Bro, Vilt, Fartkamera.** (Vektorer: `HalkvaktIkon.dc.html` i designöverlämningen.)

## 06 · Komponenter — byggstenarna

En knapp per skärm. Paneler med streckade skiljelinjer, som ett kvitto. Etiketten till vänster i mono, värdet till höger.

- **Knappar:** gul gör något (*Tillåt plats*), grön bekräftar ett på-läge (*Tillåt Alltid*), neutral avslutar (*Avsluta vakten*), länk i mono för det sekundära (ÄNDRA TILL ALLTID). 220 × 56, radie 28.
- **Kvittopanel:** t.ex. START Själv när du kör · STOPP Efter 15 min parkerad · STATUS REDO. Panel #0F1518, radie 18, skiljelinje 1 px streckad #253036. Används för sammanfattningar och inställningar.
- **Status och växlare:** statusljuset är 7 px och pulserar lugnt (2,4 s). Växlare är gröna när de är på, aldrig gula.
- **Valrutor:** hela rutan är tryckyta. Av-läget släcks ner i stället för att försvinna.

| Mått | Värde |
|---|---|
| Skärmkant | 24–32 pt |
| Panel | Radie 18 · padding 20 |
| Valruta | Radie 16 · minst 68 hög |
| Rad | 52–56 hög |
| Knapp | 220 × 56 · radie 28 |
| Tryckyta | Minst 44 × 44 |

## 07 · Varningskortet — den enda gula ytan

Visas medan rösten talar, i 8 sekunder, och försvinner sedan själv. Inga knappar. Läses med en blick i en mobilhållare. Exempel i guiden: kort B, Halka, FRAMFÖR DIG, ”Varning: halka rapporterad på vägen framför dig.”

Anatomi, uppifrån:
1. Rubrikrad: svart märke, HALKVAKT VARNAR, klockslag
2. Läge, bara vid allvarlig olycka
3. Ikon för faran, 96 pt
4. Faran som rubrik, ett ord där det går
5. Avstånd, vägskylt, hastighetsgräns
6. Råd i mörk ruta, bara vid allvarlig olycka
7. Repliken ordagrant och tidsstapeln, 8 s

Kortet hittar aldrig på ett tal. Det som inte finns i repliken utelämnas. Alla varianter finns i filen Halkvakt Varningar.

## 08 · Röst och ton — som en lugn kartläsare

Vi säger vad, var och hur långt. Sedan tystnar vi. Du-tilltal, korta meningar, inga utrop. Det som sägs i bilen är också det som står på skärmen, ordagrant.

- **Vad, var, hur långt** — faran först, sedan platsen, sedan avståndet. Inget mer.
- **Inga utrop** — inga utropstecken, inga emojier, inga versaler för att skrika.
- **Ordagrant** — skärmen visar exakt det rösten sa. Vi hittar aldrig på ett tal.
- **Du, inte vi** — tilltala föraren. Prata om vägen, inte om appen.
- **Inga långa streck** — inget långt tankstreck (—) i text, röst eller inlägg. Dela upp i två meningar eller använd komma. Kort streck (–) bara mellan orter och tider.

**Så här:** ”Halka rapporterad på vägen framför dig.” · ”Fartkamera om 500 meter. Gränsen är 80.” · ”Inget på din väg än.” · ”Din position lämnar inte telefonen av sig själv.”

**Inte så här:** ”Akta dig! Superhalt idag” · ”Isrisk framöver — vägbanan nära noll grader” · ”Vi skyddar din integritet med banbrytande teknik” · ”Kör försiktigt där ute” · ”Halkan är ca 1,2 km bort”

### Ord vi använder

| Säg | Inte |
|---|---|
| Vakten | tjänsten, funktionen |
| Starta vakten | aktivera, slå på skyddet |
| Framför dig | längre fram på din rutt |
| Frysrisk | isrisk i rubriker (rösten får säga isrisk) |
| Fartkamera | ATK, trafiksäkerhetskamera |
| Halkvakt | HalkVakt, Halk-vakt |

## 09 · Kanaler — samma kort, utanför appen

Inlägg byggs av appens delar. Gult bara när en fara är live. Inga emojier, inga utropstecken. Avsändare och halkvakt.se diskret i foten. Tre mallar: **Halkvakt live**, **Dagsläget**, **Så funkar Halkvakt** — se `docs/brand/SOCIALA-MALLAR.md`.
