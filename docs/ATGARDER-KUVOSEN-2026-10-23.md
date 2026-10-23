# Åtgärdslistan för block 8, Kuvösen

**Varför:** genomgången av blocket Kuvösen 23/10 (läs-only, två hjälpagenter, förklarad i chatten) och omgång 1 samma dag
(DECISIONS #689). Bengt 23/10: *"Ja, lägg fram besluten för Kuvösen som en omgång"*.

**Reglerna** är desamma som i de tidigare blockens åtgärdslistor (`docs/ATGARDER-*.md`):
- Numren byts aldrig och återanvänds aldrig.
- En rad stängs av en PR, ett beslut eller ett uttryckligt bortval.
- Status: `öppen` · `pågår` · `klar` · `bortvald`.

## A. Beslut (omgång 1, 23/10)

| Nr | Fråga | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B8-01 | Den nya kandidatens provning kan läsas före signeringen av 2026/27; spärren hindrar det inte | **klar** — *"Kör när träningen är klar"*, men efter den signerade ersättningsregeln (B8-03) | #689 |
| B8-02 | När signeras förregistreringen för 2026/27? | öppen — *"26/10, direkt efter R"*; fristen 31/10 står kvar som yttersta datum (Bengt) | |
| B8-03 | Ingen regel för när den nya kandidaten ersätter den frysta | öppen — *"Ja, en kort regel först"*: utkast av Claude, signerat av Bengt och Axel före provningen (fristen `ersattningsregel-ny-kandidat` 26/10) | |
| B8-04 | Två kandidater för 2027/28 på samma kort | **klar** — *"Håll isär, nytt kort"*: kort #362 för den nya, #321 för terrängen | #689 |
| B8-05 | Saknas en kurva till R 26/10 | **klar** — *"0,5 står kvar"*, inskrivet i FORREGISTRERING-2026-27 §10 a | #689 |
| B8-06 | Norr om 62° mitt i vintern (kort #317 b) saknar datum | öppen — *"Frist 15/11"* (`norr-62`, Bengt) | |
| B8-07 | Olycksutkastet sade att serien "avgör inte sikten", tvärt emot #675 | **klar** — *"Skriv in #675"*: §1 och §5 rättade; lättnaden gäller bara med båda signaturerna | #689 |
| B8-08 | Olycksutkastet kastade sikt 20 000 m, som driften behåller | **klar** — *"Behåll som driften"* | #689 |
| B8-09 | Radarns tif-korrektion, öppen sedan 2/10 | **klar** — *"Låt stå, redovisa"*: ingen korrektion; övergångarna och försprånget senast 15/11 (B8-20) | #689 |
| B8-10 | Nederbördens ord `yes` och `freezing_rain` | **klar** — *"Låt stå som okända"*; steget läst | #689 |
| B8-11 | Kort #232 med Verify uppfyllt sedan 6/10 | **klar** — *"Stäng kortet"* | #689 |
| B8-12 | Trafikverkskontaktens fullständiga namn i det publika repot | **klar** — *"Byt ut nu och framåt"*: 33 ställen i 11 filer; historiken behåller det | #689 |

## B. Rättelser (samma PR som besluten)

| Nr | Var | Brist | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B8-13 | PK p-kuvosen | Två bevis avhuggna mitt i meningen sedan 679e43d (3/10), och `--check` släppte igenom dem | **klar** — skrivna ur #441 och #464 | PR omgång 1, #689 |
| B8-14 | PK kv-delarna | Saknas-raderna hade inte rört sig sedan 6/10; försprångets hinder (väglagshistoriken) var levererat 16/10; #658 och #675 saknades | **klar** — rättat 23/10 | PR omgång 1, #689 |
| B8-15 | PK kv-prognoslagret | Den nya kandidatens steg stod som saknas fast indata körs; förregistreringen för 2026/27 slutade 13/10; #568, #574, #655, #656 och #659 saknades | **klar** — rättat 23/10, kort #362 på delen | PR omgång 1, #689 |
| B8-16 | PK kv-facit | Ledet "åtgärderna per tid och plats" var gammalt (nej 13/10); nyckeln och olycksstegets bevis lät som om läsaren fanns | **klar** — rättat 23/10 | PR omgång 1, #689 |
| B8-17 | `docs/FORREGISTRERING-2026-27.md` (utkast) | §1 angav väg B:s körning men inte den där modellen byggdes; §10 f sade "de fem hela vintrarna" | **klar** — 38400052837 i §1, tillägget 23/10 i §10 f | PR omgång 1, #689 |
| B8-18 | TAVLA | Kort #232 stängt, kort #362 nytt, kort #317 med fristen | **klar** | PR omgång 1, #689 |

## C. Handtext (morgonsynken, #522)

| Nr | Var | Status | Stängd av |
| :-- | :-- | :-- | :-- |
| B8-19 | KUV etiketten, §2, §3, §5, §7, §9–§12 och BED §6.1: listan i DECISIONS #689 | öppen — morgonens dokumentsynk | |

## D. Byggen, läsningar och skrivningar

| Nr | Brist | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B8-20 | Övergångarna och försprånget i kuvösen med okorrigerad tif, eller bortvalda med skäl (fristen `kuvos-tif-lasningarna` 15/11); Ö-B saknar instrument (#658), väglagshistoriken är inte inläst | Claude | öppen | |
| B8-21 | Ersättningsregeln, utkastet (B8-03) | Claude | **klar** — `docs/FORREGISTRERING-ERSATTNING-2027-28.md`, omskrivet efter Bengts val 23/10 (väg 2, X = 0,25); signaturerna står kvar (B8-03) | #690, #691 |
| B8-22 | Radarns tal R 26/10: kurva 2 (39257448840, körd 13:20 UTC, inte 06:20 som #568 säger) är oläst; kurva 3 körs 06:20 UTC i morgonavbrottens fönster | Claude | öppen | |
| B8-23 | Utfallet 2022/23 (#680) vid signaturerna för 2026/27, enligt §10 f | Claude, Bengt | öppen | |
| B8-24 | Jämförelsen i den nya kandidatens samman prövar inte att populationerna är lika och skriver inte ut n (`provning.py`) | Claude | öppen | |
| B8-25 | Artefakterna `kuvos-vintrar-2022-23` och `nykand-prov-*` sparas 90 dagar (till omkring 20/1 2027); saknas den frystas tiger samman | Claude | öppen | |
| B8-26 | Ett innehållsprov i publikvakten för namn som inte får stå i repot, på hashade ordpar så att provet inte själv bär namnet | Claude | öppen | |

## E. Övrigt

| Nr | Fynd | Ägare | Status | Stängd av |
| :-- | :-- | :-- | :-- | :-- |
| B8-27 | Kort #330 är låst med nyckeln "kandidaten för 2026/27 vald", som uppfylldes 13/10 | Claude | öppen | |
| B8-28 | MET Norway: den levande kandidaten (`kandidat-fysik`, var sjätte timme) hämtar samtidigt som den nya kandidatens indata; #558 medger överlappet, men det är inte mätt mot villkoret om en hämtning åt gången | Claude | öppen | |
| B8-29 | "~95 GB per vinter" i kartan saknar källa och är nedladdning, inte lagring; en hel körning hämtar omkring 20 GB VViS ur hinken, delat med appens kvot (#687) | Claude | öppen | |
| B8-30 | `kuvos.yml:2` och `kuvos/leverans.json:4` säger "releasen", fast steget läser hinken (#499, #501) | Claude | öppen | |
| B8-31 | Facitets *"bara radarn 34,5 %"* bygger på tif, ungefär 1,6 gånger h5 i regn; ingen facitfil säger det | Claude | öppen | |
| B8-32 | Förnamnet på Trafikverkets kontakt står kvar på ett tiotal ställen, de flesta i Bengts egna citat | Bengt | öppen | |
| B8-33 | KUV:s öppna kort för §5 listar #270, som enligt #657 hör till RÅ som kontroll och reserv | Claude | öppen | |
| B8-34 | STATUS sade 57 öppna kort, kortkartan 56 | Claude | öppen | |
| B8-35 | Den rensade olyckskopian i den privata hinken bär fortfarande minst ett namn; det är medvetet enligt #665 (bara regnummer och telefonnummer maskas) | Bengt | öppen | |
| B8-36 | Den nya kandidatens skugga, om V1–V4 håller: egen kedja med fysikens reserv, paritet på 2024/25 och egen logg (fristen `ny-kandidat-skugga` 15/11) | Claude (kod), Bengt (migration och deploy) | öppen | |
