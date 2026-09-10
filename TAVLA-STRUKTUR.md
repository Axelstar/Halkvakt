# 📋 TAVLAN — omstrukturerad (2026-09-10)

> Triagelager ovanpå TAVLA.md. Full arbetshistorik per kort finns i TAVLA.md, STATUS.md och DECISIONS.md.

**Vad som är nytt:** ATT GÖRA var en lista på ~20 kort och kändes ändlös. Men de flesta var inte
att göra — de var att vänta, och redan gjorda så långt de kan göras nu. Den här strukturen delar
korten efter det enda de väntar på just nu. Ett kort ligger bara på ETT ställe: nästa grind det
står bakom.

**Regeln: finns det inte på tavlan finns det inte** — gäller fortfarande. Inget kort är borttaget.
Detaljhistoriken bor kvar i den gamla TAVLA.md / DECISIONS.md; det här är navigationslagret ovanpå.

**Fyra lägen:** 🟢 kan göras nu · ⏸️ väntar på en person · ❄️ väntar på en händelse · ✅ klart.

---

## 🟢 KAN GÖRAS NU — det här är veckans faktiska arbete

Kort som inte är låsta bakom någon grind. Om något ska bockas härnäst ligger det här.

### Bengt

- 📞 **Skyltfonden** — förhandssamtalet till fonden. Markerat "= NU" sedan flera dygn. Ringrundan
  startar v.36. Underlag klart (ansökan v5 + kontaktplan v5 i Drive). Mest brådskande på hela tavlan.
- 🤝 **#94 Försäkringsbolagen först.** De har skadedata per dygn = FACIT till marsdomen +
  betalningsvilja. Detta kort låser upp mätbarheten i flera andra (se ❄️). Boka ett möte, ställ
  skadedata-frågan skriftligt.
- 🏘️ **#93 Kommunala vägar** — tre kommuner tillfrågade om stationsdata; SMHI-varningsklasserna som
  förstärkare.
- 🤝 **Helgsamtalet med pappa** — fyra punkter: roller (B2B=Bengt?), föreningen, klartecken
  ringrundan, intäktsmodellen (#27).
- **Rollfördelningen** — B2B/affärsmodell = Bengts ansvar? Ja/nej låser upp PLAN.
- **Skydda namnet** — Halkvakt hos PRV + domänen halkvakt.se. Enda juridiska muren i branschen.
- **Läsa SYSTEM.md mot koden** — månadsvis, första gången i september.
- ↩︎ **Kameravarningen** — kör 0.3.5, notera KLOCKSLAG + PLATS per larm. Koden är bevisat rätt;
  bara fältbeviset saknas.
- ↩︎ **Välkomsttext + testinstruktion** till testarna (extern TestFlight = Beta App Review).

### Claude

- **Varvloggen ikapp** — STATUS.md slutar 25/8, sex dygns arbete obokfört i djuplagret. Bryter
  dokumentationsregeln. Ren skrivbordsuppgift.
- 🪢 **#95 Plan B (SMHI) — mätdelen.** Kortet säger själv "en mätning som kan göras när som helst":
  täckningstabell segment × närmaste SMHI-station + luft→yta-korrelation ur arkivet. Mätningen är
  olåst nu; breddningsdomen väntar på mars (se ❄️).

---

## ⏸️ VÄNTAR PÅ EN PERSON — inte din framdrift

Dessa tynger inte tavlan för din del. De rör sig när Axel eller en extern part agerar.

### Väntar på Axel

- ⏰ **#86 Nyckelrotationen — de fyra bevisen.** Kväll 10/9: ingen deploy-supabase efter 9/9, ingen
  ny vakthund-issue efter #91 ⇒ Axel har inte roterat än. GO AHEAD skickat. PAT går ut 22/11,
  Supabase-token 8/12 — mitt i säsongen. Bevisen är färdiga att köra idag.
- **Axels nästa steg 3, 5, 6, 7:** skärmklipp av Billing till Bengt · TestFlight 0.3.5 (8) · tolv
  testare · Google Play-konto.
- **Ge Bengt egna händer i koden** (BENGT-CLAUDE-KODEN) — Axel: skrivrättigheter till repot.
- **#32 Hindren in i rösten** — ny HazardKind + röstfras + Axels beslut. Bäst kandidat: djur på
  vägbanan (riktig position).
- **#92 Däcktyp/fordonstyp** — Axels appkväll; tröskeljustering per däcktyp (§5, båda signerar).
- **#27 asc-CLI** — halvöppnad; kvar = en ASC API-nyckel Axel skapar i App Store Connect.
- **DESIGNLYFTET** (#24 skinnet, #22 Bluetooth-autostart, #23 heads-up) — startar dagen releasen är
  inne, rullas som v0.3.1.
- ↩︎ **Live Activity, Startknapp, Guiden, Introduktionen, Skinnet v3** — iOS/Android-design, väntar
  på testcykeln.

### Väntar på extern part / konto

- **Vejdirektoratet-svar** (mejl skickat 31/8) — tills dess: DK-rösten tyst om frysrisk
  (grästemp, #45).
- **Play-kontot** — butiksuppladdning, Data safety, uppladdningsguiden för AAB:n.
- **Danmark NAP-nyckel** — före produktion.
- **Fysisk Android-testenhet** — pappas telefon? begagnad?
- **Domänen halkvakt.se** (vilande beslut — flytta till 🟢 om du bestämmer dig).

---

## ❄️ VÄNTAR PÅ EN HÄNDELSE — byggt/analyserat så långt det går, låst bakom en grind

Det här är högen som fick tavlan att kännas oändlig. Den är det inte: nästan allt väntar på tre
händelser. När de inträffar låses en hel batch upp samtidigt. Fram till dess är korten inte ditt
jobb — de är parkerade med giltigt skäl.

### 🛰️ Grind 1 — RADARDOMEN 14/9 (nästa måndag)

En enda dom låser upp den största batchen.

- **#43 Radarn** — pilotens dom efter ~1 vecka; v3 på moget underlag. Domen 14/9 avgör allt nedan.
- **#42 Vattenplaning** — beslutsläge a/b/c väntar på radardomen (kan radarn ge intensiteten mellan
  stationerna?). V-A föll på träffen (61 % mot 70 %); regnpåståendet bär, inte intensitetströskeln.
- **#45 Nederbördstypen** — låst bakom radardomen; typklassning ovanpå radar vore våning två före
  grunden.
- **#88 TRENDEN** — får börja byggas som skuggkolumn efter 14/9 (kort #81:s ordning). Dom sedan i
  mars. Detta är 2.1 — den kopplar ihop #89, #95, #45, men blir inte klar förrän mars.
- **#81 Byggordningen** — sju regler för hur #42 byggs utan att upprepa 5–8/9. Låst bakom 14/9;
  faller domen illa stängs kortet oanvänt.
- **#87 Healthcheck → vakthund** — låst bakom 14/9 (radardomen först). Sparar 12 Actions-min/dygn
  när det görs.

### 🌡️ Grind 2 — FÖRSTA KALLA VECKAN / FROST (oktober–november)

Kan inte mätas förrän det fryser. Knapparna ligger redo.

- 🗄️ **#83 Gallring steg 2** — MÅSTE beslutas i oktober, FÖRE första kalla veckan (steg 1 klart och
  kört 9/9). Vintern = ~1,1 GB även efter tunning ⇒ export (gratis) eller Supabase Pro
  (275 kr/mån). Tidspress: detta är det enda ❄️-kortet med en deadline som inte är själva vädret.
- **#46 Rimfrosten** — analysfas klar; arkivet saknar ännu äkta frostnätter. Givarvakt bevisad
  obligatorisk. Knappen redo för höstens första frost.
- **#51 Moaten/vinterarkivet** — otestbar tills strömmen rör sig (omklassning är ett vinterfenomen,
  inte ett regnfenomen). Egen kursor byggd, vakten i drift. Väntar bara på snö.
- **#52 Baseline-testet** — testet låser motsatsen till #45:s princip; ändringen rör tre
  motorportar. Beslut Bengt+Axel + winterdata. Cry-wolf-ytan mätt (Norrland 20,5 % av segmenten,
  31,7 % av sträckan).
- **#89 Övergångarna** — (b) oljefilm kan mätas redan i höstregnen; resten väntar på #45:s dom.
  Torrdygnsräknare = en kolumn.
- **#90 Vind och sikt** — arkiverade sedan 9/9, oanvända. Facit ur en höstmånad. (Väntar även på
  Axels ja — dubbelgrind.)
- **#91 Kallplatslagret** — statisk geometri; väntar på vinterns höjdprov för att motivera
  GIS-svansen.
- **#96 Höjdprovet** — mäter redan (måndagar 07:00). Lapse 0,71 °C/100 m bevisad; dom kräver
  vinterdata ≥500 punkter. Nästa körning 14/9.

### 🏁 Grind 3 — MARS-DOMEN (skuggan döms mot facit)

Kort som redan är byggda och kör i skugga. De väntar bara på att en vinter ska passera.

- 🧭 **#38b Stråket / skuggmotorn** — segmentmotorn byggs i november i strikt skugga, dom i mars.
  Tröskeldok (1), ankarklippning (2), grind A (3) klara; skuggkörningen (4) startar ~mitten av
  oktober (Skåne).
- **#95 Breddningen (SMHI som del av motorn)** — grind A körd med SMHI-ankare, döms mars.
  (Mätdelen är olåst nu — se 🟢.)
- **Betalvilja** — mäts i appen i mars, gissas inte i augusti.

---

## 🌗 SENARE — medvetet parkerat, ingen grind

Inte väntande på en händelse — bortprioriterat tills ett tidigare steg är klart.

- **#21 Anonym puls + feedback** — paketeras med sensorbeslutet våren 2027.
- **Norden som produkt** — tidigast vintern 2027/28; nordiskt namn då.
- **#B2B skolpaketet** — säljs våren 2027 med halkbanedata.
- **Sensortrappan steg 2** — tidsätts våren 2027.
- **#15 Kö-slut / #16 Blixthalka / #25 Halkbana / #26 Skolpaket** — låsta bakom
  release/avsiktsförklaringar.
- **Publikt repo / köpa minuter** — appen behöver inte längre svaret (#72). Kan troligen stängas.

---

## ✅ KLART (referens — de senaste vinsterna)

Kassan 240 → 79 min/dygn på ett dygn (#85, snitt 1–3). Gallring steg 1 byggd + körd (#83). Bron
bevisad över dygnet (#50). ingest-live deployad (#84). Deploy-knappen lever (#78). regn-30
avvecklad (#79). bridges cron bort (#82). Livekedjan + manifestet + givarvakten
(#72/#74/#75/#76/#77/#80). Norge i gränssnapshoten + tickar. Golvbyggena + golvet +
gränssnapshoten (#47/#48/#49). TRV-bevakningen (#31). Vattenplaningens förstudie + tröskeldok +
grind (#42 steg 0–3). Tröskeldokumenten fastställda (skuggan, vattenplaning). Hela app-releasen:
Apple-konto, 0.3.x uppladdat, självväckning i fält, RLS-låset, kronjuvelerna.

*(Full historik: gamla TAVLA.md · STATUS.md · DECISIONS.md.)*

---

## Vad strukturen visar

Tjugo "att göra" blev nio kort som faktiskt kan röras nu (🟢 + person-korten du själv driver), och
resten väntar på tre händelser du inte kan skynda: 14/9, första frosten, mars. Att bygga #88 (2.1)
idag stänger inget — det landar i mars-högen. De närmaste bockarna ligger i 🟢: ring fonden, boka
försäkringsbolaget, ta helgsamtalet.

Nästa gång du känner att inget blir klart: läs bara 🟢-kolumnen. Resten är inte ditt jobb den här
veckan.
