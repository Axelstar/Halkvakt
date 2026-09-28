# Bilaga 5 — Källkartläggning, kort version med licenser

*Halkvakt, ansökan till Skyltfonden 2026.*

Den fullständiga kartläggningen gjordes 25–26 augusti 2026, med principen *ingen uppgift utan läst källa med datum*. Här står de källor projektet använder, och de som prövades och valdes bort. Status gäller 28 september 2026.

## Källor i drift

| Källa | Innehåll | Licens | Används till | Status |
| :-- | :-- | :-- | :-- | :-- |
| Trafikverket, vägväderstationer (VViS) | Yt- och lufttemperatur, fukt, nederbörd, vind, cirka 845 stationer | CC0 | Frysrisk, broar, prognoslagret, facit | **I rösten** sedan augusti 2026 |
| Trafikverket, väglag (RoadCondition) | Rapporterat väglag per sträcka, 818 bedömningssegment | CC0 | Halka på vägen framför | **I rösten** |
| Trafikverket, trafikhändelser (Situation) | Olyckor och, sedan 22/9, djur på vägen | CC0 | Olycksvarning, viltvarning | **I rösten** |
| Trafikverket, fartkameror (TrafficSafetyCamera) | Kamerornas plats och riktning | CC0 | Kameravarning 500 m före | **I rösten** |
| Trafikverket, väglagskameror | Bilder var 10:e minut, 744 kameror | CC0 | Facit (bilderna visas aldrig för användare) | Facit |
| SMHI, vädervarningar | Varningar per område | CC BY 4.0 | Facit och skuggdrift, aldrig rösten | Facit |
| SMHI, nederbördsradar och stationer | Nederbördsintensitet, luftstationer | CC BY 4.0 | Mätningar och skuggdrift | Skugga |
| Fintraffic, Digitraffic (Finland) | Vägväderstationer, väglag, händelser | CC BY 4.0 | Skuggarkiv, gränspunkter nära svenska vägar | Skugga |
| Statens vegvesen, DATEX (Norge) | Vägväder, väglag, händelser | Enligt kontovillkor (konto beviljat 4/9 2026) | Skuggarkiv, skuggrutter | Skugga |
| DMI (Danmark) | Öppna väderdata | Öppna data | Skuggarkiv, skuggrutter | Skugga |
| Polisen, händelser | Trafikolyckor med vilt, länsnivå | Polisens villkor för öppna data | Arkiv och länsstatistik på webbkartan. Inte i appen sedan 22/9 2026, eftersom Trafikverkets djurdata är snabbare och har plats | Arkiv |

## Prövade och bortvalda

| Källa | Varför inte |
| :-- | :-- |
| Fordonsbaserad väglagsdata (Trafikverkets upphandlade, Nira, Volvo) | Inte öppen. Den köps från biltillverkare och delas inte med tredje part. |
| NIRA Road Surface Conditions/Alerts, Klimator | Kommersiell, med avtal och licens. Datan är stängd även för kommuner som köper den. |
| Kommunala vägväderstationer | Inte öppna data (Malmö stads svar 18/9 2026). Avtal är den möjliga vägen. |
| STRADA (olyckshistorik) | Kräver uttagsansökan; licens oklar. |
| Viltolycka.se (NVR) | Webbrapport utan öppet API; licens oklar. |
| HERE, TomTom, Google Routes | Proprietära, med betalnivåer. |
| Öresundsbrons driftstatus | Inget API. |

## Princip

Rösten talar bara på officiella öppna källor. Odokumenterade flöden och grannländernas data används bara i skuggarkivet, aldrig för något en användare hör. Källornas nyhets- och villkorssidor bevakas automatiskt varje vecka, och en ändring blir ett ärende som en människa läser.
