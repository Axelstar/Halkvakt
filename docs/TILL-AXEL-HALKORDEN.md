# Till Axel: halkorden finns i fyra versioner — en av skillnaderna är fel

**Från:** Bengt (mätning och underlag: Claude, 14/9 2026)
**Gäller:** kort #156, DECISIONS #172
**Vad som behövs av dig:** ett beslut om **snapshotens** filter. De tre andra listorna rör
mätningar och kan vi ta själva.

---

## Fyndet

En ny kontraktsgrind skrevs 14/9 för listan över vilka `ConditionInfo`-ord som betyder HALT. Den
fällde direkt: ordlistan finns på **nio ställen i sju filer med tre olika värden**. Ingen hade
någonsin jämförts mot en annan.

Men nio ställen är inte nio listor. Läser man vad varje ställe **frågar efter** är det **fyra olika
frågor**, och tre av dem har goda skäl att skilja sig:

| # | Frågan som ställs | Listan | Var |
| :-- | :-- | :-- | :-- |
| 1 | **Vad får motorn att tala?** | `is` `snö` `halka` `frost` `mycket besvärligt` | `engine/src/engine.ts:43` (+ skuggmotorns bunt) |
| 2 | **Vad får nå motorn?** | `is` `snö` `halka` `frost` — ELLER `condition_code >= 2` | `publish/snapshot-core.ts:102` (+ publiceras bunt) |
| 3 | **Har vintern börjat synas i arkivet?** | `is` `snö` `halka` `frost` | `vakthund/index.ts:137` och `:148` |
| 4 | **Kod 1 tillsammans med farlighetsord?** | `is` `halka` `frost` `mycket besvärligt` | `scripts/kodgrinden.ts:198` och `:201` |

**Tre av skillnaderna är försvarbara, och vi föreslår att de lämnas:**

- **(3) vakthunden** letar efter *vinterns första tecken*. "mycket besvärligt" är en allvarlighetsfras,
  inte ett vinterord — en höststorm kan bära den utan att något fryser. Att den saknas är rimligt.
- **(4) kodgrinden** prövar hypotesen *"operatören markerar normalt fast texten säger fara"*. Att "snö"
  saknas där är rimligt: packad snö vid kod 1 är **normalt vinterväglag i norr**, inte en avvikelse.

---

## Skillnaden som ÄR fel: (2) är inte ett superset av (1)

Snapshoten bestämmer vad motorn över huvud taget får se. Motorn bestämmer vad som sägs.
**Då måste snapshotens lista vara minst lika vid som motorns** — annars bär motorn en regel den
aldrig kan utöva.

I dag gör den inte det. Ett segment med **"mycket besvärligt" vid `condition_code = 1`** filtreras
bort av snapshoten och når aldrig motorn, trots att motorn skulle ha kallat det halt.

```
snapshot-core.ts:102
  AND (condition_code >= 2 OR EXISTS (
    SELECT 1 FROM unnest(condition_info) i
    WHERE i ~* '(^|[^a-zåäö])(is|snö|halka|frost)'))
                                        ^^^ "mycket besvärligt" saknas
```

---

## Vad det kostar i dag: ingenting, och det är mätt

| Fråga | Arkivet (830 rader, 21/2–25/8) | Livetabellen (818 segment) |
| :-- | --: | --: |
| "mycket besvärligt" vid `condition_code < 2` | **0** | **0** |
| "snö" vid `condition_code = 1` | **0** | **0** |

Skälet är att **inget vinterord någonsin förekommit**: hela materialet är `condition_code 1` med
Torrt (799), Våt (25), fläckvis Våt (8), fläckvis Torrt (6). Arkivet börjar 21 februari, alltså efter
förra vinterns slut.

**Det betyder två saker på en gång.** Ändringen är **gratis i dag** — noll rader byter beteende. Och
den är **inte betydelselös**, för hålet blir verksamt i samma stund operatören börjar klassa om i
vinter. Det är alltså en fri rättelse som stängs innan den kan kosta något.

Det finns också en möjlighet att hålet är **strukturellt omöjligt**: skulle Trafikverket verkligen
sätta kod 1 ("Normalt") och samtidigt skriva "mycket besvärligt"? Det vet vi inte, och det går inte
att mäta förrän vintern kommer. Om du tror att kombinationen inte kan uppstå är ett medvetet nej
lika giltigt som ett ja — men då bör det stå skrivet, så att nästa läsare inte tror att det är drift.

---

## Vad vi föreslår

1. **Lägg till `mycket besvärligt` i snapshotens filter** (`publish/snapshot-core.ts`, därefter
   `bundle-publicera` + deploy). Motiv: snapshoten måste vara ett superset av motorns lista. Kostnad
   i dag: noll rader.
2. **Lämna (3) och (4) som de är** — men ge dem varsitt **namngivet kontrakt** i
   `scripts/kontraktsgrinden.ts`, så att skillnaden står som ett beslut och inte som slarv. Grindens
   egen text säger just detta: *rätta alla, eller dela kontraktet i två med var sitt namn om
   skillnaden är avsiktlig.*
3. **Alternativet, om du hellre vill vänta:** boka en omkörning av mätningen efter vinterns första
   omklassningar. Då syns det i data om kombinationen alls uppstår.

**Vad som INTE görs utan ditt ord:** punkt 1 rör vad appen varnar för, alltså din domän och
produktboksregeln. Snapshoten är orörd.

**Vad som redan är gjort:** kontraktsgrinden vaktar tills vidare bara **motorns** egen lista
(engine.ts + skuggmotorns bunt + tystnadsfelets mätning) — tre filer, samma värde. De övriga är
oguardade tills beslutet är fattat.

---

## En detalj som kan tas oavsett beslut

Både vakthunden och kodgrinden bär sin lista **två gånger i samma fil** (rad 137 och 148 respektive
198 och 201). Det är ren dubblering inom en fil och kan lyftas till en konstant utan att någon fråga
behöver besvaras. Vi tar den gärna om du vill.
