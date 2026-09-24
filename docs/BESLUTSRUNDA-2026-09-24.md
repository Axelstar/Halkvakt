# Beslutsrunda 24/9 — steg 1 i ordningen: fem beslut som inte kostar kod

> **BESLUTAD 24/9 (Bengt: *"ja till alla fem, kör export till supabase storage"*) — DECISIONS #334–#338.** §1 blev export till Supabase Storage, inte Pro; byggd och i
> drift samma morgon. §2–§5 enligt förslagen.

*Bengts order 24/9: "gör förslag till hur 1 ska handläggas". Underlag: bedömningen §5 och §4.2, kort #83, #209, #231, #246,
DECISIONS #248, #291, TROSKLAR-SKUGGAN §6, integrationskartan §5.5 och §14, sql/014 (gallringen), Bengts regel 22/9 om
återkommande körningar. Varje beslut har ett förslag, ett alternativ och ett pris. Svaret är en rad per beslut i DECISIONS;
Claude skriver in dem och gör följdändringarna i samma varv.*

## Sammanfattning

| # | Beslut | Vems | Förslag | Senast |
| :-- | :-- | :-- | :-- | :-- |
| 1 | #83 steg 2: Pro eller export | Axel | **Pro 1/11–1/4**, utlösare 400 MB eller första kalla veckan | före första kalla veckan |
| 2 | Bilderna: mars (#248) eller veckovis (§6) | Bengt + Axel | **mars står**; §6 skrivs om: Claude klassar, Axel ok:ar, Bengt stickprovar | före första hinkbilden |
| 3 | #231:s definition | Bengt + Axel | *övergång* = yta > +1 °C någon gång de 6 h före varningen, annars *stadigt kallt* | före första hinkbilden |
| 4 | Kartan: R17–R20 nu eller i mars | Bengt | **nu**, en rättelserunda, fryst igen | när som helst |
| 5 | K-A, R-A, T-A, W-A: klocka eller knapp | Bengt | **frosttrigger**: vakthunden trycker de fyra en gång när frostvakten larmar; sedan knapp | före första frosten |

## 1. #83 steg 2 — Pro eller export

**Frågan.** Vinterarkivet `weather_observations` växer 30–45 MB per dygn när alla 848 stationer går under 5 °C (kortets mätning).
Gratisnivån är 500 MB; databasen är 193 MB i dag. Från första kalla veckan är gratisnivån full på ungefär 7–10 dygn. Allt som
döms i vinter läser arkivet: T-A, K-A, R-A, W-A, uppspelningen, tystnadsfelet, grind S-B, kuvösen om den kommer.

**Förslag: Pro från 1/11 till 1/4**, alltså fem månader. Utlösare: databasvakten vid 400 MB **eller** första kalla veckan,
vilket som kommer först — inte kalendern. Pris: Supabase Pro 25 USD/mån ⇒ ~125 USD för vintern (8 GB databas). Kräver
DECISIONS-post med Axels ja (husregeln om betaltjänster) och att Axel slår på det i panelen.

**Alternativ: export (kort #83 steg 2a).** Rader äldre än N dygn packas och flyttas ut, sedan raderas de ur databasen.
Sparar ~1 400 kr. *Rättat 24/9 på Bengts fråga — första lydelsen sa att tre instrument måste byggas om; det var för starkt.*
Det verkliga priset är tre saker:
- **Fönstret krymper.** Efter gallringens steg 1 växer vinterarkivet 7,4–11 MB/dygn (kortets mätningar). 60 dygn i
  databasen är då 450–660 MB — över skrivskyddet vid 500 MB. Bara ~30 dygn ryms. Grind A kör 60 dygns fönster.
- **Marsdomarna körs på en återläst kopia**, inte i databasen: exporten läses tillbaka i en PostGIS-container och grindarna,
  uppspelningen och tystnadsfelet körs där. Det är genomförbart — arkivbackupen gör redan exakt den återläsningen varje
  vecka som prov — men det är ett steg som måste byggas och provas före mars.
- **Svansrisken.** Gratisnivån skrivskyddar vid 500 MB; då stannar livemotorns skrivningar. Databasvakten larmar vid 400.
  Med export är marginalen mot väggen en körning som inte får utebli; med Pro är den 7,5 GB.

**Vart exporten skulle gå — två ställen som redan finns i huset:**

| | Supabase Storage (kortets förslag 2a) | GitHub-release i repot (som arkivbackupen) |
| :-- | :-- | :-- |
| Pris | gratis upp till 1 GB (vintern ~150 MB packad; kamerabilderna delar kvoten) | gratis |
| Byggt | nej — en edge function som skriver CSV.gz | ja — veckovis pg_dump med återläsningsprov sedan 20/9 |
| Utanför Supabase | nej, samma konto: ingen reserv om kontot tappas | ja |
| Bengts regel 22/9 | följer den (pg_cron + edge function) | kräver undantag: några Actions-minuter i månaden |

Om det blir export: **GitHub-release**, för att den redan är byggd och återläsningsprovad och ligger utanför Supabase —
med ett uttryckligt undantag från regeln 22/9.

**Rekommendation: Pro.** Det är den enda vägen som håller marsdomarna räknbara utan ombyggen. Export som reserv om Axel säger nej.

## 2. Bilderna — mars eller veckovis, och vem som klassar

**Frågan.** TROSKLAR-SKUGGAN §6 (1/9): Bengt klassar facit-hinkens bilder veckovis. DECISIONS #248 (20/9, senare): bilderna
öppnas i mars (regel D2/D3/D6); ett bygge före domen får inte visa vad de säger. Dessutom: bara Axel når hinken.

**Förslag.** Mars står — blindningen är värd mer än en tidigare läsning. §6 skrivs om till: *Claude klassar blint ur
kontaktark, Axel ok:ar (stickprov ≥ 10 % plus varje is/snö/slask), Bengt stickprovar; bilderna öppnas vid domens tidpunkt.*
Spåret (#246) byggs och provas nu på Trafikverkets direktbilder, som är publika och inte facit.

**Alternativ.** Veckovis enligt §6 — kräver att Bengt får panelen eller att Axel exporterar varje vecka, och bryter #248.

**Pris.** Två meningar i §6 och en DECISIONS-rad. Ingen kod.

## 3. #231:s definition — före första hinkbilden

**Frågan.** När bildfacit läses delas produktionsregelns varningar i *stadigt kallt* och *övergång*, och andelen bilder med
bar eller våt väg redovisas per grupp. Kortet kräver att definitionen står i DECISIONS innan den första bilden öppnas.

**Förslag.** *Övergång* = stationens yttemperatur låg över +1 °C någon gång under de **6 timmarna** före varningen; annars
*stadigt kallt*. Sex timmar täcker en kvällsavkylning från plusgrader till frost; ett kortare fönster (2 h) hade kallat de
flesta nattvarningar stadigt kalla fast vägen saltats på eftermiddagen. Talet sveps inte — det är en läsning, inte en tröskel —
men redovisas också vid 3 och 12 h så att valet syns.

**Alternativ.** Vänta till första frosten (#209:s tidpunkt). Kostar inget nu men gör att definitionen skrivs när det finns
bilder att titta på — precis det kortet vill undvika.

**Pris.** En DECISIONS-rad. Ingen kod.

## 4. Kartan — R17–R20 nu eller i mars

**Frågan.** Kartan är styrdokumentet för integrationen och överspelad på fyra ställen (bedömningen §5.5): grind A saknar dom
(§6.1), prognosens fog (§5.4), kamerafacit noll bilder och ingen vakt (§12), motkrafter som är avgjorda (§7.2–7.4).
Frysvillkoret ("efter bygge + mätning") är uppfyllt.

**Förslag: öppna nu**, en rättelserunda R17–R20, fryst igen samma commit, rättelsehistoriken (§14) får en rad. Claude skriver,
Bengt läser, Axel ser i DECISIONS. Inga fogar, ingen sekvens ändras.

**Alternativ.** Vänta till mars och rätta allt på en gång. Pris: fem månader med ett styrdokument som säger fyra osanningar
till den som läser det utan bedömningen bredvid.

**Pris.** En timme, en commit.

## 5. K-A, R-A, T-A, W-A — klocka eller knapp

**Frågan.** De fyra grindarna kör på knapp. Måndagsklockan bär grind A, SMHI-provet, cellmätningen, trv-bevakningen,
höjdprovet och V-A/V-B. Bengts regel 22/9: nya återkommande körningar går i Supabase, inte i Actions-minuter — och de fyra
är Actions-flöden.

**Förslag: frosttrigger, inte veckoklocka.** Vakthunden har redan frostvakten (larm vid 50 stationer under noll) och en
larmväg till GitHub. När frostvakten larmar första gången trycker den de fyra flödena **en gång** (T-A steg 0 måste ändå
köras inom sju dygn, #209:s mätning i samma varv). Därefter knapp på Bengts order, som nu. Pris: ~15 Actions-minuter en gång,
en liten ändring i vakthunden, ett prov (`?frostprov=1` finns).

**Alternativ.** Veckoklocka för alla fyra: ~15 min/vecka ⇒ ~1 h/mån, mot regeln 22/9 — Bengt kan göra ett undantag, men
måndagsvärdet är litet före frosten och grindarna säger ändå OAVGJORT tills vinterdata finns.

**Pris.** En rad från Bengt; vakthundsändringen ~en timme.

## Vad som händer vid ja

Claude skriver fem DECISIONS-rader (#334–#338), skriver om TROSKLAR-SKUGGAN §6, öppnar kartan för R17–R20, bygger
frosttriggern i vakthunden och provar den, och stryker raderna i bedömningen §4.2 med beviset på raden. Axel slår på Pro
när utlösaren kommer och exporterar hinken till #246.
