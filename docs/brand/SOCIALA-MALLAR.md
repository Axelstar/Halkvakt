# Halkvakt — Sociala mallar (oktober 2026)

> Textversion av Claude Design-filen "Inläggsmallar för sociala medier": https://claude.ai/artifact/TWKqCXjEnngEHYuBRXj3JF. Filen är källan. Hämtad 2026-10-17, lagd i repot 2026-11-19. Följer Varumärkesguide 1.0 (`docs/brand/VARUMARKESGUIDE.md`), avsnitt 09 Kanaler.

Tre mallar i tre format, byggda på appens kort. Gult bara när en fara är live. Rubriker och löptext skalar efter textlängden, och mätdata står i mono. Varje mall visas med kort och lång data.

## Format

| Format | Mått | Kanaler |
|---|---|---|
| Feed | 1080 × 1350 | Facebook, Instagram, Threads |
| Bred | 1200 × 675 | X, Bluesky |
| Story | 1080 × 1920 | Säkra zoner: 220 px uppe, 240 px nere |

## 1 · Halkvakt live

Varningskortet, kort B. Postas när en fara rapporteras. Den enda mallen med gul yta.

- Fält: ikon/fara, väg, sträcka, län, tidpunkt, mätrader (etikett + värde i mono).
- Kort data: Halka · E22 · Hörby–Kristianstad · SKÅNE · 13 OKT · 06:42 · VÄGBANA −1,8 °C · LUFT +0,4 °C · MÄTT 06:40
- Lång data: Frysrisk · VÄG 1012 · Tollarp–Linderöd–Degeberga · SKÅNE · 13 OKT · 05:18 · VÄGBANA −0,3 °C · DAGGPUNKT +0,1 °C

## 2 · Dagsläget

Som Redo-skärmen. Ett län per inlägg.

- Fält: län, en mening om läget, tidpunkt, tre mätrader (etikett, värde, detalj).
- Kort data: Skåne län · ”Kallt i inlandet i natt. Halka på flera sträckor runt Hörby och Höör.” · 13 OKT · 07:00 · STATIONER UNDER NOLL 14 av 38 · KALLASTE STATION −3,2 °C Hörby · STRÄCKOR MED HALKA 6
- Lång data: Västra Götalands län · ”Minusgrader i hela inlandet och längs Vänern. Kusten ligger strax över noll, men broarna kan frysa före vägen.” · 13 OKT · 07:00 · STATIONER UNDER NOLL 61 av 112 · KALLASTE STATION −11,4 °C Vänersborg Nordkroken · STRÄCKOR MED HALKA 23

## 3 · Så funkar Halkvakt

Ett budskap per kort, tre påståenden. Serie om fem (01 / 05 … 05 / 05).

- 01 / 05 — ”Din position lämnar inte telefonen.” · Matchningen mot vägdata sker i telefonen. · Inget konto, ingen inloggning. · Ingen resa sparas eller skickas.
- 04 / 05 — ”Halkvakt varnar där Trafikverket mäter. Mellan stationerna är vägen oövervakad.” · Varningarna kommer från Trafikverkets mätstationer och rapporterade väglag. · Rösten säger bara det som finns i datan. · Inga gissade avstånd, inga gissade gränser.
- 02, 03 och 05 finns inte i mallfilen än.

## Regler (från guiden)

Inga emojier, inga utropstecken, inga långa tankstreck. Avsändare och halkvakt.se diskret i foten. Exempeldatan ovan är påhittad för layouttest, inte riktiga mätningar.
