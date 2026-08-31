# Prata med koden själv, Bengt

Du skriver planer om ankarklippning och segment_id till någon som ska räkna åt dig. Det
här dokumentet tar bort mellanhanden: efter en halvtimme kan du fråga Halkvakt-repot
direkt, på svenska, och få svar med riktiga siffror ur riktig data.

Ingen programmering. Du skriver på svenska, Claude kör beräkningen och visar resultatet.

## Vad du kommer kunna göra

Det du i dag beskriver i prosa kan du i stället köra:

- *"Räkna hur många av de 818 segmenten som saknar ankare inom 20 km, per län."*
- *"Vad rapporterade station 1043 natten till 14 januari? Rita en graf."*
- *"Håll station X ute, prognostisera ur grannarnas offset, mät felet — gör det för alla
   845 stationerna och ge mig felkartan."* (Det är hela 3.3 i din byggplan.)
- *"Vad säger skuggloggen om E4 Uppsala–Gävle senaste dygnet?"*
- *"Lägg det här dokumentet i docs/ och skriv ett kort på tavlan."*

Du kan också läsa allt utan att fråga Axel: vad motorn gör, vilka beslut som fattats och
varför, vad som är byggt men obevisat.

## Så kommer du igång

**1. Skaffa Claude Pro** (eller Max) på claude.ai — gratisplanen räcker inte för det här.

**2. Ladda ner Claude Desktop** från claude.ai. Det är ett vanligt program med fönster,
ingen terminal. Installationen tar ett par minuter och kräver inget annat.

**3. Hämta repot till datorn.** Be Axel om en klick-länk (GitHub Desktop är enklast om du
inte vill röra terminalen alls) eller kör en gång i terminalen:

    git clone https://github.com/Axelstar/Halkvakt.git

**4. Peka Claude på mappen.** I Claude Desktop väljer du Halkvakt-mappen som arbetsmapp.
Sedan skriver du frågor i rutan som vanligt.

**5. Börja med den här frågan**, så ser du direkt att det fungerar:

    Läs TAVLA.md och DECISIONS.md. Sammanfatta vad som är byggt men inte bevisat,
    och vilka beslut som väntar på mig.

## Två regler som gäller när du kör själv

**Skriv aldrig i koden i motorn utan att säga till.** Läs allt, räkna allt, skriv i `docs/`
— men motorn (`engine/`, apparna) är Axels och Claudes. Frågar du "kan du bygga X" kommer
Claude bygga det; be i stället om ett kort på tavlan, så tas beslutet i rätt ordning.

**Allt du bestämmer hamnar i DECISIONS.md eller på TAVLA.md.** Be Claude skriva in det åt
dig i samma veva — då slipper vi två sanningar, vilket var hela problemet 31 augusti.

## Om något krånglar

Skriv vad du ser till Claude, precis som Axel gör med skärmbilder. Du behöver inte förstå
felet — bara kunna beskriva vad som hände.
