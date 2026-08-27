# Bengts Trafikriskkarta — källbokföring och konvergens (2026-08-27)

Bengt (Davids pappa, driver systerprojektet TågRätt med David) har levererat en
dokumentsvit i Google Drive (mapp 158ONWCyXJI7fZCl1o-c76ktHcx01XaaU): källkartor
v1–v3, Trafikriskkartan v1 (15 risker, enhetlig mall), riskkatalog, affärsmodell-
skiss, höstplan och fordonsdata-kartläggning. Arbetsprincip: "ingen uppgift utan
läst källa med datum". Detta dokument bokför det som påverkar vårt bygge.

## Konvergens med befintlig app (v0.3.0)

Bengts MVP-fyra vs vad som redan är byggt och släppfärdigt:

| Bengts MVP-varning | Vår status |
|---|---|
| Halka/blixthalka | Halka ✓ (RoadCondition + väderstationer). Blixthalke-PROGNOSEN (Nowcast 2 h) saknas — se kandidat nedan. |
| Kö-slut | Beslutad som uppdatering 1 (BACKLOG #15, TrafficFlow verifierad 43 s färsk). |
| Olycka framför | ✓ (Situation/deviations). |
| Viltsträcka i skymning | ✓ men ANNAN MODELL: vi kör Polisens faktiska viltolyckor (realtid), Bengt föreslår statistisk riskvarning (säsong × dygnstid × viltstängsel). Komplement, ej konflikt — hans modell är kandidat för senare. |

Fas 2 hos Bengt: vattenplaning (spårdjup × regn), solbländning (ren geometri,
"billigaste unika funktionen"). Fartkameror: servicefunktion utanför katalogen
med av/på-switch — exakt vad vi byggt (kategoriswitch i INSTÄLLNINGAR).

## Principer vi adopterar (kostnadsfria, i linje med vår ärlighetslinje)

1. **Löftet följer källans täckning** — samma varning får lova mer i Stockholm
   än på riksväg 23. Styr redan kö-slutsdesignen (mätning i storstad, rapport
   på landsbygd).
2. **Kommunikationsregeln mätning/risk:** uppmätt får påstås ("halka uppmätt"),
   prognos sägs alltid som risk ("risk inom 40 min"). Gäller all framtida TTS-text.
3. **Trefiltret** DATA · AGERBARHET · SÄLLSYNTHET, där sällsynthet är konsument-
   produktens existensvillkor. Vår falsklarmsdisciplin får därmed ett namn.
4. **Ingen varning utan källrad** — risk utan verifierad källa dokumenteras som
   "väntar på källa", aldrig som gissning.

## Stängda dörrar (bekräftade av Bengts research — bygg aldrig mot)

Fordonsfriktionsdata (TrV köper ~300 M mätpunkter/vinter för ~7 mkr/år, delas
endast med driftentreprenörer; EU-dataaktens delningsplikt undantar "inferred/
derived" friktionssignaler), plogåtgärdsdata, Öresundsbrons driftstatus,
OBD-porten under körning. Öppen framtidsdörr: Data for Road Safety (reciprocitet),
Vejdirektoratets vägdata (Öresund — outredd), telefonen-som-sensor (spår 3).

## Tidsplansavvikelse att lyfta med Bengt (ingen åtgärd i kod)

Höstplanen lägger butikspubliceringsstart i november. Googles 2026-krav
(12 testare × 14 dagar + äkta användning + granskningar) kräver start i
SEPTEMBER för lansering före första halkan — dokumenterat i REKRYTERING.md.
Detta är Davids kalendertid (konto/testare), inte Axel-kodtimmar, och bryter
därmed inte höstplanens hårda regel. Davids och Bengts beslut.

## Ny backlogkandidat ur kartan

**Blixthalke-prognos (uppdatering 2-kandidat):** väderstations-yttemp/daggpunkt
+ MET Norge Nowcast (5-min nederbörd, 2 h horisont). Kommuniceras som RISK.
Kräver: Nowcast-ingest med cachingproxy (MET:s villkor: User-Agent, ≤20 req/s,
ingen bakgrundspolling), eventuell severity-höjning i befintlig FRYSRISK-kind
(ej nödvändigtvis ny HazardKind). EFTER release, efter kö-slut.
