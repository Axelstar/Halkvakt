# Andra tillägget till FORREGISTRERING-FLER-VINTRAR: strålningen 14–31/3 2022 ur MET:s v4 (Ä6)

**Status: UTKAST 25/10 2026** (DECISIONS #716, #717). Inte signerat. Det ändrar FORREGISTRERING-FLER-VINTRAR och dess första tillägg
(Ä1–Ä5, signerat 25/10, #715) genom en daterad post med båda signaturerna, som FLER-VINTRAR §8 kräver.

Bengts ord 25/10: *"Rätta båda kandidaterna med v4:s timvärden för 14–31/3 2022: skriv utkasten till tilläggen (Ä6 för den frysta,
ett till NY-KANDIDAT för den nya), och bokför utfallet med felet beskrivet till signeringen i morgon."*

Ett eget tillägg för den nya kandidaten skrivs samtidigt (T4 till NY-KANDIDAT). De två hör ihop: jämförelsen mellan kandidaterna på
2021/22 kräver att båda är rättade.

## 1. Vad som har hänt

- **Källfelet.** Från 14/3 2022 00 UTC lagrar MET:s arkiv (`metpparchive`) lång- och kortvågen som en summa som växer timme för timme
  och nollställs med några timmars mellanrum, inte som timvärden. Station 1001, långvågen 14/3 (×10⁶ J/m²): 5,04 · 5,91 · 6,77 ·
  2,59 · 3,44 · 4,28 · 5,12 · 5,96 · 6,81 · 2,53 … Före skarven (v4) 0,80–0,87 per timme. Kortvågen samma dag växer till 11,07 och
  nollställs. I arkivet 2022/23 är båda vanliga timvärden.
- **Omfattningen.** Tröskelhalvan av trappformsprovet (§4 a) på alla 67 delar som kandidaterna läser, 2018/19–2024/25, flaggade 431
  timmar, alla 14–31/3 2022, i tre delar av 2021/22. Timmen 25/3 08 UTC kommer redan ur v4 (väg 2, #715) och är ren. Sågtandsräkningen
  är inte körd än; den är det känsligare provet för kortvågen mitt i vintern, när solen är svag.
- **Sett före det här utkastet (öppet):** den frystas utfall på alla fyra vintrarna, 25/10 (#716). 2021/22: A2 11,85 %, varav mars
  47,96 %, mot 3,1–4,8 % november–februari; NIVÅ 2 ensam A1 7,09 °C. De tre andra vintrarna bär inte felet.

## 2. Ändringen

**Ä6. Lång- och kortvågen 14/3 2022 00 UTC – 31/3 2022 23 UTC tas ur MET:s omräkning v4** (`metpparchivev4`), timme för timme, i
samma rutor och med samma omräkning till J/m² per timme som Ä1. Övriga fält i delarna är oförändrade. Ändringen rör bara 2021/22.

- Delarna skrivs om som `metnordic_lw4_<del>` för de tre berörda delarna (28/2–14/3, 15–29/3, 30–31/3 2022), med nya listor. De
  gamla filerna och summorna står kvar under `omhamtad` i `kuvos/langvag-v4-leverans.json`, som för väg 2.
- Visar trappformsprovet efter Ä6 en enda flaggad timme, eller timmar utanför 14–31/3 2022, läses inte vintern, och frågan går till
  Bengt (som Ä5).

## 3. Vad som körs om

- **Den frystas nivåer på 2021/22** (RÅ, NIVÅ 2, NIVÅ 2+BLANDNING, band, norr och söder, månader) med Ä6.
- **Jämförelsen med den nya på 2021/22** körs först när den nyas tillägg T4 är signerat och körts, eftersom den nyas punkter för
  2021/22 bär samma fel i kortvågen. Tills dess redovisas den frystas nivåer utan jämförelse.
- 2018/19, 2019/20 och 2020/21 körs inte om; de bär inte felet.

## 4. Prov före läsningen

- **(a) Trappformsprovet.** I varje del som läses: ett timvärde för långvåg över 1,6·10⁶ J/m² (444 W/m²) eller kortvåg över
  3,3·10⁶ J/m² (917 W/m²) flaggas; dessutom en sågtandsräkning på kortvågen dagtid (en timme som faller till under hälften av
  föregående mitt på dagen). Kravet är noll flaggade timmar.
- **(b) v4 är timvärden.** Stickprov för 14–31/3 2022: v4:s lång- och kortvåg mot arkivets summor räknade tillbaka till timvärden
  (skillnaden mellan två på varandra följande timmar i samma cykel). Kravet: medianen av den relativa skillnaden högst 5 %.
- **(c)** Proven i FLER-VINTRAR §3 och i det första tillägget §4 (identitet, tidszon, delarnas summor) som förut.

## 5. Redovisning

- **Båda talen står bredvid varandra:** den frysta på 2021/22 utan Ä6 (25/10, #716) och med Ä6.
- **Medlet över vintrarna** redovisas båda vägarna: med 2021/22 utan Ä6, och med Ä6.
- Ingenting stryks, och ingen vinter tas bort.

## 6. Regel L

- **L2:** sett före utkastet är den frystas utfall på alla fyra vintrarna (§1).
- **L3:** nej. Ingen tröskel och inget krav ändras, och läsningen fäller ingen dom (FLER-VINTRAR §1, §5).
- **L4:** skälet är ett källfel som syns i timserien (§1), oberoende av vilket håll utfallet går, och samma rättelse görs för båda
  kandidaterna.
- **Avsteget, öppet:** indatan ändras efter sett utfall. Därför står båda talen kvar (§5).

## 7. Koden och körningarna

- `fysik/vintrar/langvag_v4.ts` utökas: för timmar i [14/3 2022, 1/4 2022) hämtas både `integral_of_surface_downwelling_longwave_flux_in_air_wrt_time`
  och motsvarande kortvåg ur v4, och kortvågen skrivs också över i delen. Självtest med en trappformad källa.
- `fysik/vintrar/vinterkedja.py`: trappformsprovet (§4 a) före läsningen, och de nya summorna i manifestet.
- `kuvos-vintrar.yml`: steget `langvag-v4` gör om de tre delarna, sedan `kedjan` för 2021/22.
- Tid: koden ungefär en halv dag, hämtningen av de tre delarna cirka en timme, körningen cirka 30 minuter.

## 8. Valen, enligt Claudes rekommendation (bekräftas vid signeringen)

- **(a) Perioden:** exakt 14–31/3 2022, eftersom provet inte hittade något annat.
- **(b) Fröet:** 20261025, som förut.
- **(c) Jämförelsen** med den nya på 2021/22 väntar på T4.

## 9. Signaturer

| | Datum | Signatur |
| :-- | :-- | :-- |
| Bengt | | |
| Axel | | |
