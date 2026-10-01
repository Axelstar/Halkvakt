# Play-butikstexter (utkast, klara att klistra in)

**Appnamn (30):** Halkvakt — röstvarnaren
**Kort beskrivning (80):** Rösten som varnar för halka, olyckor och vilt — innan du är där.

## Fullständig beskrivning
Halkvakt är passageraren som läst allt Trafikverket vet om vägen framför dig —
och säger till, med rösten, exakt när det behövs.

Starta vakten, lägg telefonen i fickan och kör. När något väntar på din väg
hör du det i bilens högtalare: rapporterad halka, en olycka längre fram, en
vägsträcka med färska viltolyckor, en vägväderstation som mäter frysrisk,
eller en fartkamera.

**Så fungerar det**
• Bygger på Trafikverkets öppna data om väglag, olyckor, djur, vägväder och
  fartkameror — uppdaterat dygnet runt.
• Röstvarningar via telefonens högtalare eller bilens Bluetooth. Ingen skärm
  behövs under körning.
• Välj själv vilka varningar du vill höra. Fartkameror har egen av/på-knapp.
• Autostart när telefonen märker att du åker bil, direkt om bilens Bluetooth
  kopplas (valfritt). Vakten stoppar sig själv när bilen stått still en kvart.

**Din integritet, på riktigt**
Din position lämnar aldrig telefonen av sig själv. All matchning mot vägdata
sker lokalt i appen. Inga konton, ingen inloggning, inga annonser, ingen
spårning.

Det enda som någonsin skickas är något du själv trycker på. Slår du på
Betatest i Inställningar kan du efter resan svara om varningarna stämde,
eller markera att appen missade något — då skickas varningens id (eller
närmaste mätstation), klockslaget och ditt svar. Det säger ungefär var du
var just då, och därför är brytaren av tills du slår på den.

**Gratis, utan förbehåll**
Halkvakt är gratis och byggd på öppna svenska data. Vägen är redan betald med
dina skattepengar — vi ser bara till att den får tala.

Halkvakt varnar vid Trafikverkets mätstationer och rapporterade väglag — mellan
stationerna är vägen oövervakad. Datakällor: Trafikverket (CC0), SMHI,
Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL).
Halkvakt är fristående och har
ingen koppling till myndigheterna.

## Anteckningar
- ⚠️ **RÄTTAT 20/9 (kort #214):** integritetsstycket sade *"Vi samlar in: ingenting"*, vilket varit osant
  sedan 16/9 (facitsvaret). Fjärde stället med samma påstående — de andra tre: `docs/PLAY-DATASAFETY.md`,
  CLAUDE.md:s invariant (båda rättade) och `integritet.html` i karta-repot (utkast, väntar Axels ja).
  Google läser butikstexten bredvid Data Safety-formuläret.
- Kategori: Kartor & navigering. Innehållsklassning: alla.
- **2/10:** Polisen struken (#318/#320), autostarten säger rörelseigenkänning (#262 Å4), missarna med (#379), källraden som i appen och App Store-texten.
- Play-skärmbilder: sidförhållande högst 2:1 — alltså **1080×2160**, inte App Stores 1284×2778. Råbilder ur Axels Android, inramning med `appstore/alf.py` (mått som argument).
- Skärmdumpar: minst 2 (fotostudion levererar 3 per push — ta senaste artefakten).
- Feature graphic + ikon ligger i denna mapp.
