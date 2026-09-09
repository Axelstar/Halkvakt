# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-09-09 12:05 av Claude (webben) — kort #86: nyckelrotation förberedd (tre ställen för PUBLISH_TOKEN, ordning A/B, fyra bevis), go ahead till Axel. Före det: puls-healthcheck PÅ som bro (pulsklocka #13, kort #50, DECISIONS #91), issue #91 auto-stängd 11:07 (larmvägen hel åt båda hållen), nytt kort #87 (healthchecken in i vakthunden, låst bakom 14/9). Före det: DB-knappen byggd (dbknapp.yml): gallringen KÖRD (3 551 raderade, cron-jobb aktivt), larmprovet BEVISAT (issue #91, PAT har Issues:Write). Före det: #79 KLART (puls-regn-30 avvecklad, pulsklocka #11), #85 alla tre snitten i drift, #50 svar på Axels pulsfråga. Före det: kort #85 snitt 1+2 BEVISADE: grannar #12 44 s (var 6 min), fi/dk-commit a28ea98 ur samma körning. Före det: kort #85 snitt 1+2 BYGGDA (grannar batchade, publish-map nedlagd, DECISIONS #88), bevis väntar på nästa pulsade körning. Före det: kort #83 steg 1 BYGGT (sql/014_gallring.sql, DECISIONS #87), Axel kör i SQL-editorn. Före det: Axels varv bokfört: #84 och #78 KLART (ingest-live deployad, deploy-knappen lever), #83 omräknat på Axels mätning + ja till steg 1, nytt #86 nyckelkalendern (PAT 22/11, Supabase 8/12). Före det: morgonavläsning: #82 slutbevis, #50 två hål > 2 h 30 (puls-healthcheck av), #44 dygnsbevis 26 % men skevt urval, #83 uppmätt 62 000 rader/dygn, #79 stäng regn-30 nu, NYTT #85 Actions-takten spränger 35 USD ~26/9. Före det: kort #83 (gallring, två steg + mätfråga) och #84 (deploya ingest-live; fynd: regn-30 kan inte laga luckan) skrivna för Axel. Före det: kort #82 KLART: bridges-cronen bort (PR #81, ci #464 grön). Före det: nytt kort #81: byggordningen efter radardomen 14/9 för #42, sju regler ur veckans fel och sex steg med varsitt bevis. Låst bakom domen*

---

## 🔴 ATT GÖRA

### Beslutsgången
Roller och ägarskap: `docs/BESLUTSGANGEN.md` (31/8). Tavlan är sanningen — en plan som inte
står här finns inte. Kortregeln ersätter möten: allt som bestäms blir ett kort direkt.
- [ ] **Ge Bengt egna händer i koden** — `docs/BENGT-CLAUDE-KODEN.md`: Claude Pro + Claude
  Desktop mot Halkvakt-mappen, ingen terminal. Axel: skrivrättigheter till repot.
  Löser roten till 31/8 — han kan köra sina egna analyser i stället för att beskriva dem.

### AXELS NÄSTA STEG — i den här ordningen (uppdaterad 8/9 kväll)

- [x] ~~1. Bevisa vakthunden~~ ✅ GJORT 8/9 — pg_cron kört 18:07/19:07/20:07, alla succeeded.
  MEN fyndet: larmvägen var trasig (#78). Beviset att klistra till Bengt står i DECISIONS #78.
- [x] ~~2. PAT:en behöver `Issues: Write`~~ ✅ BEVISAT 9/9 10:58 — larmprovet (dbknapp #2: vakthundens eget
  cron-kommando med ?larmprov=1) skapade issue #91 "🔴 Vakthunden: kedjan är bruten" med etiketten vakthund,
  10:58:40. Larmvägen fungerar; issuen ska stängas av nästa gröna timkörning (11:07). Axels "full behörighet"
  stämmer.
- [ ] **3. Skärmklipp av Billing till Bengt** — du har redan bilden (2000/2000 min, reset om
  23 dagar ⇒ 1/10, spending limit noll). Vidarebefordra den bara.
- [x] ~~4. Supabase-token som `SUPABASE_ACCESS_TOKEN` i GitHub Secrets~~ ✅ GJORT 9/9 05:20 (Axel,
  DECISIONS #86) — tokenen är projekt-scopad till Halkvakt med ENDAST Edge Functions: Write (Axels val:
  en deploy-nyckel ska inte kunna röra databas eller nycklar). Bevis: deploy-supabase #1 grön 05:20:51,
  funktion=vakthund, "Deployed Functions: vakthund". Bengt och Claude kan deploya själva nu.
  ⚠️ Går ut ~8/12, mitt i vintern — Axel lägger påminnelse, tavlan bär datumet i kort #86.
- [ ] 5. TestFlight-gruppen: lägg 0.3.5 (8) om det inte skett automatiskt
- [ ] 6. Tolv testare till väntelistan (fortfarande det som avgör vintern)
- [ ] 7. Google Play-konto (signeringen är lagad, AAB:n grön — vägen är öppen)

**Beslut som väntar, inte brådskande (med Bengt):**
- [ ] #79 regn-30: pulsas varje timme = 720 min/mån av oktobers 2 000. Sedan ingest-live
  arkiverar vädret varje minut är den troligen överflödig. Mät innan den väcks.
- [ ] Publikt repo eller köpa minuter — appen behöver inte längre svaret (#72), ta det lugnt.
- [ ] Gallringsregel för weather_observations före vintern — ~40 000 rader/dygn när alla 845
  stationer ligger under 5 °C fyller gratisnivån på ~2 månader. Får inte kasta det Grind A mäter.
  ⚠️ RÄKNAT OM 8/9 22:00 (Bengts Claude, ur vader.geojson): 809 av 848 stationer mäter på
  10-minutersslag, och livemotorn läser varje minut ⇒ **~120 000 rader/dygn**, inte 40 000
  (den siffran är GitHub-ingestens 2×/h). 500 MB räcker då **~3 veckor**, inte 2 månader.
  Gallringen måste finnas FÖRE första kalla veckan, inte "före vintern". Alternativ som inte
  kastar Grind A:s underlag: spara var 30:e minut i arkivet men behåll varje minut i
  weather_latest — det är exakt den upplösning GitHub-ingesten hade när Grind A byggdes.


### Axel — beslut att ta
- [ ] ⏰ **#86 NYCKELKALENDERN — två nycklar går ut mitt i säsongen** (Axels fynd 9/9, kort av Claude):
  · **PAT:en (kartrepot/publicera + vakthundens larm) går ut 22/11.** · **Supabase-tokenen (deploy-knappen)
  går ut 8/12.** Båda slutar fungera utan att något ser trasigt ut: publicera får 401 ⇒ CDN fryser ⇒ appens
  åldersspärr tystnar vakten (5/9-läget), och vakthunden kan inte larma om det eftersom larmvägen använder
  samma PAT. Axel lägger påminnelser; tavlan bär datumen. REGEL (CLAUDE.md-läxan om rotation): en ny nyckel
  är inte "bytt" förrän ett BYGGE/en publicering gått igenom med den — rotera PAT:en senast **15/11** och
  bevisa med nästa kartrepo-commit, Supabase-tokenen senast **1/12** och bevisa med en deploy-supabase-körning.
  Vakthunden borde dessutom kontrollera PAT:ens utgångsdatum (GitHub svarar med `github-authentication-token-
  expiration`-headern) och larma 14 dygn före — eget litet kort när Issues:Write finns.
  🔑 **ROTERA NU, INTE I NOVEMBER (Bengt 9/9 12:00; förberett av Claude, GO AHEAD skickat till Axel):** idag
  finns bevisen färdiga (larmprov via DB-knappen, publicera var 10:e min, deploy-knappen); i november byggs de
  i mörker mitt i säsongen. FYND i förberedelsen: PUBLISH_TOKEN sitter på TRE ställen, inte två — Supabase
  Edge Function Secrets (publicera + vakthund) OCH GitHub Secrets (ingest-grannar pushar fi/dk-snapshoterna
  med den). Missas det tredje dör fi/dk-publiceringen tyst 22/11. AXELS ORDNING (5 + 5 min):
  **A. PAT:** GitHub → Settings → Developer settings → Fine-grained tokens → ny: namn "Halkvakt publicera
  2027", utgång **2027-04-30** (efter marsdomen), resource owner Axelstar, repon halkvakt-karta + Halkvakt,
  Repository permissions: **Contents Read and write** (kartrepot) + **Issues Read and write** (Halkvakt),
  inget annat. Klistra in som PUBLISH_TOKEN i (1) Supabase → Edge Functions → Secrets och (2) GitHub →
  Halkvakt → Settings → Secrets → Actions. Ta INTE bort den gamla än.
  **B. Supabase-token:** Supabase → Account → Access Tokens → ny "Halkvakt deploy 2027", utgång 2027-04-30,
  samma scope som 9/9 (projekt Halkvakt, ENDAST Edge Functions: Write). Ersätt SUPABASE_ACCESS_TOKEN i
  GitHub Secrets. Ta INTE bort den gamla än.
  **BEVIS (Bengt/Claude kör, inom 15 min efter A och B):** (a) nästa "(Supabase)"-commit i kartrepot med
  manifest-sha = sha256(live.json) — publicera skriver med nya PAT:en; (b) DB-knappen larmprov ⇒ ny issue med
  etiketten vakthund, auto-stängd nästa timme — vakthunden larmar med nya PAT:en; (c) nästa grannar-körning
  (:24) lämnar fi/dk-commit — GitHub Secrets-kopian fungerar; (d) deploy-supabase på vakthund grön — nya
  Supabase-tokenen fungerar. FÖRST DÅ: Axel raderar de två gamla nycklarna, och kortet stängs med datumen
  2027-04-30 som enda vakt. Bevis efter raderingen: (a) och (c) en gång till.
- [ ] 💸 **#85 Actions-takten spränger 35 USD-gränsen före 1/10 — tre snitt räcker** (mätt 9/9
  04:30 av morgonavläsningen, DECISIONS #82:s budget). UPPMÄTT sedan Actions vaknade 8/9 21:07
  → 9/9 04:31 (7,4 h): **59 körningar, ≈ 98 debiterade minuter** (varje jobb avrundas uppåt):
  ingest-grannar 8 × ~5,4 min = 43 · publish-map 14 × 1 = 14 (workflow_run efter varje ingest
  OCH grannar ⇒ 2/timme) · ci 14 = 14 (mina tre docs-mergar kostade 6 av dem — läxa: `[skip ci]`
  på rena tavelcommits, gäller från den här) · ingest 6 × ~1,2 = 7 · regn-30 7 = 7 ·
  healthcheck 5 · pulsklocka 4 · ios-engine 2 · bridges 1 (sista) · segmentlangden 1.
  STEADY STATE utan mina mergar ≈ **10 min/timme = 240 min/dygn**. Gratispotten är slut
  (2 000/2 000 t.o.m. 30/9) ⇒ allt debiteras: 240 × 0,008 USD = **1,9 USD/dygn**, 22 dygn kvar
  ⇒ **~42 USD > 35**. Gränsen nås runt **26/9** och Actions dör igen, tyst, som 5/9. OBS: 35 USD
  är **4 375 min** (Linux 0,008 USD/min), inte 5 800 som avläsningsprompten antog.
  TRE SNITT, alla utan ny kod och utan att röra insamlingen (ordnade efter minuter/dygn):
  · **publish-map:s workflow_run (48 min/dygn):** den bygger bara fi/dk-snapshoter och kedjas
    efter BÅDE ingest och grannar ⇒ 48 jobbstarter/dygn. Kedja bara på ingest-grannar (fi/dk-
    datan kommer därifrån) ⇒ 24/dygn, eller kör steget SIST i grannar-jobbet (MINUTPLAN rad 2)
    ⇒ 0 extra starter. Claude, 3 rader, Bengts ja räcker.
  · **regn-30 (24 min/dygn):** stäng nu, kort #79 — restnisch tills deploy, noll efter.
  · **ingest-grannar (130 min/dygn = 54 %):** 5,4 min/körning är FI/NO:s rad-för-rad-INSERT
    (MINUTPLAN: ~1 000 nätverksvarv). Batcha som ingest/db.ts ⇒ ~1,5 min ⇒ sparar ~95 min/dygn.
    Claude, ~1 h kod + integrationstest. Kräver inget beslut, bara plats i kön.
  Med alla tre: 240 → ~75 min/dygn ⇒ 0,6 USD/dygn ⇒ **~13 USD till 1/10**, och oktoberpotten
  räcker hela månaden. Verify: morgonavläsningens räkning nästa dygn ≤ 100 min/dygn.
  ✅ **SNITT 1 + 2 BYGGDA 9/9 07:45 (DECISIONS #88, Bengts "bygg båda nu"):** ingest/grannar-db.ts
  batchar FI/NO/DK med UNNEST (uppmätt före: FI 2:51, DK 0:32, NO 2:25 i grannar #10 = 6 min/körning);
  publish-map.yml RADERAD, fi/dk-snapshoterna är sista steget i ingest-grannar.yml (0 extra starter).
  Integrationstest #85 mot riktiga fi/no/dk-scheman i CI.
  ✅ **BEVISAT 9/9 08:24 (ingest-grannar #12, första körningen på b0420e8):** hela jobbet **44 s**
  (#10 igår: 6 min 04 s) — FI **6 s** (var 2:51), DK **13 s** (var 0:32), NO **7 s** (var 2:25),
  fi/dk-snapshoter + push **6 s**. Kartrepot fick commit a28ea98 08:24:42 med fi+dk live.json och
  manifest.json ur samma körning. Debiterat: **1 min i stället för 6** ⇒ −120 min/dygn, plus
  publish-map:s 48 jobbstarter borta ⇒ tillsammans **~168 min/dygn mindre**. Kvällsavläsningen
  17:30 räknar hela dygnet mot 240-baslinjen. ✅ **SNITT 3 KÖRT 9/9 10:47** via pulsklockans AVVECKLA
  (pulsklocka #11: `avvecklat: puls-regn-30`, 8 jobb kvar) på Axels "i övrigt kör vi". Alla tre snitten
  är därmed i drift: väntat ~75 min/dygn ⇒ ~13 USD till 1/10. Kvällsavläsningen 17:30 mäter.
- [ ] 🗄️ **#83 GALLRING av weather_observations — måste finnas FÖRE första kalla veckan**
  (Bengts beställning 9/9 01:40; kort + förslag av Claude, mätt mot koden 9/9).
  **VARFÖR NU:** arkivdieten (DECISIONS #4: bara yta ≤ 5 °C eller nederbörd) finns i
  ingest-live, men vintern upphäver den — under 5 °C är ALLA 848 stationer intressanta,
  var 10:e minut, dygnet runt: 848 × 144 ≈ 122 000 rader/dygn. Axel mätte 175 000 (8/9).
  Uppskattat ~260 B/rad inkl. index ⇒ 30–45 MB/dygn ⇒ gratisnivåns 500 MB är full på
  **11–16 dygn** räknat från första kalla veckan. 📏 UPPMÄTT 9/9 ur healthcheckens egna
  räknare: weather_obs 187 582 (8/9 21:13) → 195 500 (9/9 00:18) = 7 918 rader på 3 h 05 ⇒
  **~62 000 rader/dygn i september MED dieten** (mild natt, få stationer under 5 °C). Vintern
  släpper alla 848 stationer genom dieten ⇒ 2× det, i linje med 122 000-uppskattningen. Full databas = ingest-live dör tyst =
  appen serverar gammal data igen (5/9-läget, fast utan Actions-larm).
  **VAD SOM FÅR SLÄNGAS UTAN ATT DOMEN RÖRS (mätt i koden):** grind A och grind V-A läser
  båda i 30-minutershinkar och tar SENASTE mätningen per hink (BUCKET_S = 1800,
  ORDER BY sample_time DESC). missar.ts läser 45-minutersfönster. Ingen dom läser
  10-minutersupplösningen. Det var exakt GitHub-ingestens takt (2×/h) när grind A byggdes.
  **STEG 1 — TUNNA TILL 30 MIN EFTER 7 DYGN (Claude bygger, Axel kör; noll beslut om pengar):**
  pg_cron-jobb 03:15 UTC som per station och 30-min-hink behåller senaste raden och raderar
  resten för allt äldre än 7 dygn. Sista veckan behåller full upplösning (missar, felsökning).
  Effekt: vintern ≈ 848 × 48 ≈ 41 000 rader/dygn ≈ 11 MB/dygn ⇒ ~45 dygn på 500 MB.
  Migration sql/014_gallring.sql (funktion `gallra_vader(dagar)` + cron.schedule vaktad med
  IF EXISTS pg_extension, CI:s PostGIS saknar pg_cron — samma läxa som rollerna i 003).
  Verify: rader/dygn äldre än 7 d ≤ 45 000 i SQL-editorn, grind-a #N ger samma n som veckan
  före (tunningen får inte synas i domen). OBS: DELETE frigör inte disk förrän autovacuum
  återanvänt den — pg_total_relation_size planar ut, sjunker inte; det är rätt utfall.
  **STEG 2 — VINTERN ÄR LÄNGRE ÄN 45 DYGN (beslut Axel + Bengt i oktober, EFTER mätning):**
  nov–mars ≈ 150 dygn × 11 MB ≈ 1,6 GB även efter steg 1. Tre vägar:
  · **2a Rullande export (gratis):** månadsvis CSV.gz av rader äldre än 60 dygn till Supabase
    Storage (1 GB gratis; gzip ~10× ⇒ hela vintern ~150 MB), sedan DELETE. Grind A/V-A körs
    redan varje måndag på 30-dygnsfönster och deras utfall är små tabeller; marsdomen läser
    veckoutfallen + exporten. Kostar ~2 h kod + en edge function. Rekommenderad.
  · **2b Supabase Pro** (25 USD/mån, 8 GB): ~1 400 kr för nov–mars. Kräver DECISIONS-post
    (gratisnivåregeln) som #82 för Actions. Snabbast, men pengar för att slippa 2 h kod.
  · **2c Färre stationer:** nej — TROSKLAR-SKUGGAN §3 kräver grind A "nationellt över alla
    845 stationer".
  **MÄT FÖRST (Axel, SQL-editorn, 30 s) — svaret avgör om steg 1 räcker till oktober:**
  `SELECT pg_size_pretty(pg_total_relation_size('weather_observations')) AS vader,
  pg_size_pretty(pg_database_size(current_database())) AS totalt, count(*) AS rader,
  (SELECT count(*) FROM weather_observations WHERE sample_time > now() - interval '1 day')
  AS senaste_dygnet FROM weather_observations;` — totalt/rader = verklig byte per rad,
  senaste_dygnet × byte = verklig MB/dygn. Klistra till Bengt; kortet räknas om på riktiga tal.
  📏 **AXELS MÄTNING 9/9 ~05:30:** vader 36 MB · totalt 92 MB · 205 763 rader · 42 582 senaste dygnet ·
  **183 B/rad** · mest aktiva station **233 rader/dygn**, p90 109, median 54. Axels poäng, och den är rätt:
  dygnssnittet (42 582) underskattar vintern — nu är stationerna intressanta bara tidvis; i vinter ligger
  alla 848 i det övre läget dygnet runt. 233 > 144 betyder dessutom att vissa stationer mäter var 5–6:e
  minut, inte var 10:e. ÖVRE GRÄNS: 848 × 233 ≈ 198 000 rader = 36 MB/dygn ⇒ (500 − 92) / 36 ≈ **11 dygn**;
  nedre (alla på 10 min): 122 000 = 22 MB ⇒ 18 dygn. Sanningen ligger emellan, 11–16 står sig.
  ✅ **JA TILL STEG 1 FRÅN AXEL 9/9** ("bygg migrationen så körs den"). Omräknat med 183 B/rad: efter
  tunning 848 × 48 = 40 700 rader = **7,4 MB/dygn ⇒ ~55 dygn** på återstående 408 MB (stationer med tätare
  takt tunnas till samma 48). Steg 2 kvarstår: nov–mars ≈ 150 × 7,4 ≈ **1,1 GB** ⇒ export eller Pro.
  ✅ **STEG 1 BYGGT 9/9 07:15 (DECISIONS #87):** sql/014_gallring.sql — `gallra_vader(dagar)` + pg_cron
  `halkvakt-gallring` 03:15 UTC (vaktad, CI saknar pg_cron). Bevis lokalt: 576 → 336 raderade (144→48,
  288→48, gårdagen orörd), hink 0 behåller 00:20/00:25 = senaste, andra körningen 0. Integrationstest
  #83 i CI. 🔑 **AXEL KÖR:** klistra hela sql/014_gallring.sql i SQL-editorn (deploy-tokenen får inte röra
  databasen, #86). Första körningen: `SELECT gallra_vader(7);` direkt efteråt ger svaret hur många rader
  som togs — klistra talet till Bengt. Bevis därefter: `SELECT count(*) FROM weather_observations WHERE
  sample_time BETWEEN now() - interval '9 days' AND now() - interval '8 days';` ≤ 45 000, och grind-a
  14/9 med samma n som 7/9-körningen hade gett. Steg 2 (1,1 GB-vintern) kvarstår som oktoberbeslut.
  ✅ **STEG 1 KÖRD 9/9 10:58 (dbknapp #1, DECISIONS #90) — Bengts "vi gör halkvakt gallring jobb":** migrationen
  körd i transaktion, `gallra_vader(7)` → **3 551 raderade**, cron-jobbet `halkvakt-gallring 15 3 * * * active=true`
  finns, rader 8–9 dygn gamla **15 744** (≤ 45 000), tabellen 37 MB / 207 587 rader. VARFÖR BARA 3 551: allt
  äldre än 7 dygn skrevs av GitHub-ingesten 2×/h — redan 30-minutersupplösning — och 5–8/9 finns ingen data.
  Minutupplösningen (ingest-live sedan 8/9) blir 7 dygn gammal **15/9**; första nattkörningen som tunnar på
  riktigt är 16/9 03:15. Bevis då: rader/dygn för 8/9 ≤ 45 000 i morgonavläsningen 16/9.
- [x] ~~Fastställ trösklarna för skuggan~~ ✅ FASTSTÄLLT 2/9 (DECISIONS #61): Axels
  "kör" relayerat av Bengt i chatten, värdena oförändrade från Bengts 1/9-version inkl.
  §2-orsaksklassningen. Kvitto: huvudet i docs/TROSKLAR-SKUGGAN.md. Bocken här är
  kontrasigneringen. Från första skuggkörningen gäller §5: ändring kräver båda.
- [x] 🔑 ~~Fastställ TROSKLAR-VATTENPLANING~~ ✅ FASTSTÄLLT 4/9 (DECISIONS #68): Axels
  ja relayerat av Bengt, värdena oförändrade från #67. Vinterinteraktionen avgjord enligt
  rekommendationen — HALKAN VINNER ALLTID, vattenplaningen vilar helt vid yttemp ≤ +4 °C
  och ligger under halkan i A-skalan. Bocken här är kontrasigneringen; vill du ändå
  justera går det fram till första skuggkörningen, sedan gäller §5 (båda signerar).
- [ ] **Helgsamtalet med pappa — nu fyra punkter:** roller (B2B=Bengt?), föreningen, klartecken ringrundan, OCH intäktsmodellen (#27: din viljeinriktning → hans utformning)
- [ ] **Skyltfonden-paketet (före 1/10):** (a) klartecken till pappas ringrunda (startar v.36!), (b) sökande: pappa privat eller ideell förening?, (c) rollfördelningen — allt hänger ihop. Underlag: `docs/FINANSIERING.md`
- [ ] **Rollfördelningen**: efterfrågan/affärsmodell/B2B = Bengts ansvar? (hans förslag; vid ja uppdateras PLAN)
- [ ] **#21 Anonym puls + feedback-knapp** — rör "samlar in: ingenting"-löftet; Claudes råd: paketera med sensorbeslutet våren 2027

### Axel — hösten (brainstorm 31/8)
- [ ] **Skydda namnet:** varumärket Halkvakt hos PRV + domänen halkvakt.se. Enda juridiska
  muren som finns i branschen; arkivet och relationerna är resten av försvaret.
- [ ] **Betalvilja mäts i mars, inte gissas i augusti:** en fråga i appen ("N varningar i
  vinter — skulle du betala X för nästa?"). Ja/nej, inget insamlat utom räkningen. Vinterpass
  per säsong är kandidatmodellen; B2B (hemtjänst, försäkring, åkerier) är taket.
- [ ] **Norden efter facit:** Finland LIVE i arkivet (31/8). Norge sedan, Danmark sist.
  Tidigast vintern 2027/28 som produkt. Nordiskt namn vid det laget (Nordic RoadSafe, #1).
- [ ] **Vegvesen DATEX-konto** — ✅ TILLSTÅNDET BEVILJAT 4/9 (Bengt): användarnamn
  TjeDatexlagerlof. Koden härdad samma varv: ingest/no.ts gör en REKOGNOSERING vid
  första körningen med hemligheter (verklig XML + elementräkning på Summary), fel-
  loggen bär svarskroppen och skiljer 401 (fel par / ej aktiverat) från 403 (saknad
  rätt / IP-spärr); workflowen har pipefail + Summary.
  ✅ HELA KEDJAN KLAR 4/9 em (Bengt + Claude, terminalen): hemligheterna inlagda → #28
  rekognosering (406 → Accept */* mätt) → parsern (ingest/sources/vegvesen.ts, test mot
  fixtur) → ingest-no #29 15:24: 468 stationer med koordinater, vägyta 422, luft 427,
  daggpunkt 425, fukt 436, latest 468 / archived 468 → puls-ingest-no 17,47 i pg_cron
  (pulsklocka #3, 10 jobb) → healthcheck #74 HEALTHY med "no-arkivet: synkat för 5 min".
  Arkivpolicyn DECISIONS #4 ordagrant som SE/FI. Kortet flyttat till KLART (DECISIONS #64).
  ÖPPET: nederbörd 0 av 468 — DATEX-nederbördens form är omätt (torr eftermiddag eller
  annan elementväg?), bevisas första regnvädret; olyckor → no.deviations är eget kort.
- [x] ~~Mejl till Vejdirektoratet om VejVejr~~ ✅ SKICKAT 31/8 16:05 via kontaktformuläret
  (ämne "Forespørgsel om en sag eller et projekt" — vinterdriftens formulär var stängt).
  Väntar svar. Tills dess: grästemp i arkivet, rösten tyst om frysrisk i DK (#45).
- [ ] **Danmark — NAP-nyckel** (gratis registrering) före produktion: trafikkort-flödet vi
  läser nu är publikt men odokumenterat.

### Axel — därefter
- [ ] **Tolv testare till Play-perioden** — Axels åtagande 31/8: "hittar dem utan problem".
  Väntelisterutan på kartan borttagen på hans beslut. Kvar i `docs/REKRYTERING.md` om det behövs.
- [ ] Domänen halkvakt.se (vilande beslut)
- [ ] Fysisk Android-testenhet (pappas telefon? begagnad?)

### Bengt
- [ ] Läsa SYSTEM.md mot koden månadsvis (första: september)
- [ ] Samtal med Axel: sensortrappan — tidsättning av steg 2 (våren 2027?)
- [ ] 💼 **B2B: skolpaketet som produkt** — per-elev-moment i körkortspaketen; STR som skalkanal; säljs våren 2027 med halkbanedata *(Axels idé, Bengts spår)*
- [ ] 📞 **Skyltfondsrundan** (efter Axels klartecken): fonden + trafikövningsplats v.36 → avsiktsförklaringar 25/9 → SKICKA 28/9.
  UNDERLAGEN UPPDATERADE 3/9 (Bengts order, terminalsessionen): ansökan v5 + kontaktplan v5
  i Drive-mappen. Nytt däri: (a) VERIFIERAT att handledarkursen slopades 2026-08-01
  (prop. 2025/26:127) — trafikskole-pitchen omskriven; (b) prognoslagrets beskrivning i
  linje med tröskeldokumentet (offsetmodell, inte Nowcast) så bilaga 7 stämmer med texten;
  (c) grind A-infrastrukturen synliggjord som egenfinansierad indata (gränsdragningen);
  (d) konkreta kandidater: AB Bulltoftabanan Malmö (040-29 29 05) + 7 trafikskolor.
  ⏰ Förhandssamtalet till fonden = "första veckan i september" = NU.

### Claude — olåst
- [x] ✅ **#72 Livekedjan i Supabase — KONTROLLERAD 8/9 11:56 (Bengts "fungerar den?")**
  Terminalvarvets bygge (DECISIONS #72, commit f15f8cc): edge function `publicera` bygger
  appens snapshot ur databasen och committar den till kartrepot via Git Data API på
  pg_cron var 10:e minut. Noll Actions-minuter. JAG MÄTTE DEN OBEROENDE, i kartrepot:
  · **35 commits "data: … (Supabase)" i följd, 06:10:30 → 11:50:05, exakt var 10:e minut,
    inget hål.** Före dem: tystnad sedan 5/9 11:12 (67 timmar — hela avbrottet).
  · **live.json 6,8 min gammal** vid avläsningen (generated_at 11:50:03). Innehåll: 0 segment
    (september, alla kod 1 — rätt), 1 väderstation, 1 olycka, 15 SMHI-varningar, 2 783 kameror.
  · Actions är FORTFARANDE dött (segmentlangden #6, 11:55:40, 5 s, noll steg) — kedjan
    lever alltså bevisligen UTAN GitHub. Det var poängen, och den håller.
  ⚠️ TRE BIFYND, inget av dem stoppar kedjan:
  (1) **Broarna föll ur appen: 7 → 0.** `publicera` skriver `bridges: []` (kommentaren säger
  att GitHub-jobbet ska publicera dem) — men den skriver ÖVER hela live.json, så de sju broar
  som låg där 5/9 är borta. När Actions vaknar kommer publish-map och publicera turas om att
  skriva samma fil med olika innehåll (7 ↔ 0 var 10–30 min). Två skrivare till en fil = ett
  eget kort (#74).
  (2) **Kartsajten är fortfarande 3 dygn gammal.** meta.json generated_at 5/9 11:11. Bara
  appens filer (data/app/v1) publiceras ur Supabase; kartlagren ligger kvar i Actions (står i
  DECISIONS #72 som "KVAR"). Appen lever, webben inte.
  (3) **Enda väderpunkten i appen är ett känt givarfel.** Station **2135 Storvik**, yta
  **−10,7 °C** med fukt — i september. Samma värde låg i live.json 5/9, så det är inte #72:s
  fel, men det är #46:s "isolerat till daggpunkten"-slutsats som spricker: här är YTTEMPEN
  trasig, och motorn gör den till en `icing_point` med moisture=true. Det är en halkvarning
  som väntar på nästa bil förbi Storvik. "Silence is a feature" — eget kort (#75).
  🔴 **TVÅ FYND TILL UR GRUNDEN 12:30, och de ändrar domen:** (4) **publicera skriver
  ingen manifest.json.** Båda apparna verifierar sha256 ur manifestet och förkastar filen vid
  fel; manifestet på CDN är från 5/9 11:12 och live.json från 8/9 — MISMATCH uppmätt lokalt.
  Appen har alltså INTE fått en ny snapshot sedan 5/9. "1,1 min gammal" var sant på CDN och
  falskt i telefonen. (5) **ingest-live:s väder når aldrig weather_latest** — bara arkivet.
  publicera läser weather_latest, som frös 5/9 11:05. Storvik var inte en trasig station i
  en levande tabell utan en död tabell. DOM: kedjan Trafikverket → databas → CDN lever;
  CDN → app gör det inte. Fixat i #74/#75-bygget, väntar på Axels deploy.
- [x] ✅ **#77 Kartlagren in i publicera — KLART 8/9 20:23, BEVISAT** (DECISIONS #77): Axel deployade
  från main 15ba9ad. **ms 10 727** (under 60-sekundersgränsen, ingen uppdelning behövs).
  meta.json generated_at 20:23:03, stationer 1 300, kameror_vaglag 746. Commit a8e843f skrev
  sex filer, inte nio: Git Data API skapar blobar bara för det som ändrats, kameror.geojson
  och vaglag.geojson var byteidentiska — rätt beteende, min förväntan "nio" var fel.
  ✅ `publish/map-core.ts` bygger kartsajtens sex filer; `publicera` publicerar dem i samma
  commit som appfilerna på :00/:30 (`?karta=1` tvingar). publish-map.yml: cron borta, bygger
  varken kartlager eller app-snapshot, kedjad på ingest + ingest-grannar för fi/dk. 52 tester
  gröna, bundlen i synk. 🔑 AXEL: bunta-check + `supabase functions deploy publicera`. BEVIS:
  en :00/:30-commit i kartrepot med nio filer och meta.json inom 35 min; läs `ms` i svaret.
  URSPRUNGLIGT FYND:
  (fynd 8/9 20:04 vid kontrollen av Axels åtgärder). Tre pulsjobb är av (ingest, publish,
  healthcheck — bekräftat: inga dispatch-körningar av dem sedan 18:37), men publish-map.yml
  har fortfarande `schedule: */30` (körning #980 kl 19:03:50 var `schedule`). Kartlagren tar
  69–74 s ⇒ 2 debiterade minuter × 48/dygn = hela oktoberpotten på 21 dagar, ensam. Kvar på
  puls dessutom: FI/DK/NO 2×/h och regn-30 1×/h. BESLUT KRÄVS före 1/10: (a) kartlagren
  in i publicera (samma mönster, noll minuter) eller (b) publish-map timvis via puls +
  grannar 1×/h (minutplanens #6/#7, produktbeslut Bengt+Axel). Verify: första oktober-
  veckans Usage under 66 min/dygn.
- [x] ✅ **#80 Arkivet, kamerorna, viltet och SMHI stannade när puls-ingest stängdes av — KLART 8/9 23:59, BEVISAT** (PR #79, DECISIONS #84): healthcheck **#145 GRÖN** (23:58:39, första gröna sedan 5/9) — cameras och road_conditions_arkiv färska, fi/dk/no färska via grannar, och den stängde incident-issue #77 själv. puls-ingest skarpt i pg_cron (pulsklocka #9), första ordinarie körning 00:11.
  ✅ `--skip=weather,deviations` i ingest/index.ts (bara de två tillåts, okänt namn fäller), ingest.yml
  kör flaggan, puls-ingest `11 * * * *` i pulsklockans NYA. BEVIS: ingest #375 från grenen —
  "hoppar över: weather, deviations", wildlife 1, smhi 16, kursorerna orörda, 32 s. STÄNGS när
  healthcheck visar cameras + road_conditions_arkiv gröna (inom en timme efter skarp pulsklocka).
  URSPRUNGLIGT FYND (8/9
  21:13, healthcheck #144 — första körningen sedan Actions vaknade): `cameras` och
  `road_conditions_arkiv` synkade för 4 922 min sedan, fi/dk/no likaså. Svenska GitHub-ingesten
  (ingest.yml) bär FEM saker livemotorn inte gör: kamerorna, vinterarkivets egna kursor
  (road_condition_history — moaten, #51/#73), polisens viltolyckor, SMHI-varningarna och
  broarnas indata. Axel stängde puls-ingest 8/9 i tron att "väderhämtningen" flyttat — vädret
  hade, resten inte. Sedan 5/9 11:11 skrivs alltså inget till moaten och inga nya viltolyckor
  eller SMHI-varningar når appen. Tredje "grönt men tyst"-felet i dag.
  VARFÖR INTE BARA SLÅ PÅ IGEN: ingest/index.ts hämtar ALLA sex källor och delar kursor-
  nycklarna `weather` och `deviations` med ingest-live ⇒ två skrivare på samma changeid
  (läxan #73a). VÄG: `--skip weather,deviations` i ingest/index.ts (liten ändring, test),
  sedan puls-ingest tillbaka EN gång i timmen (~2 debiterade min/h, ~5 kr/dygn). Verify:
  healthcheck grön på cameras + road_conditions_arkiv, och arkivvakten visar omklassningar
  när väglaget ändras. Alternativet på sikt är minutplanens #13 (DB-trigger för arkivet)
  + vilt/SMHI i ingest-live — då behövs ingest.yml aldrig mer.
- [ ] 🐕 **#76 Vakthunden i Supabase mäter fel led — ÅTGÄRDAD PÅ MAIN 8/9 17:24 (822d178), deploy ej bevisad härifrån.**
  Led 3 hämtar nu manifest.json och jämför sha256 med live.json. Stängs när vakthunden
  bevisligen larmat OCH tystnat på riktiga data (issue med etiketten vakthund), inte förr.
  URSPRUNGLIGT FYND (8/9 13:35,
  läst mot grunden vid bedömningen av Axels lägesrapport). Terminalvarvets `vakthund`
  (DECISIONS #73, 8/9) kollar led 3 "når det appen?" genom live.json:s generated_at på CDN.
  Men appen tar inte emot live.json, den tar emot live.json OM manifestets sha256 stämmer.
  Uppmätt 13:35 i kartrepot: live.json 6 min gammal, manifest.json från 5/9, sha MISMATCH ⇒
  båda apparna förkastar och behåller 5/9-snapshoten. Vakthundens "första körningen grön —
  CDN 6 min" är alltså exakt den blinda fläcken: den friar ett led som är brutet.
  VÄG: led 3 = hämta manifest.json OCH live.json, jämför sha256, larma vid mismatch eller
  om manifestets generated_at är gammalt. Tre rader. Verify: vakthunden ska larma på dagens
  läge (mismatch) och tystna först när den nya publicera deployats.
  LÄGET 13:35: nya publicera (#74, mergad 12:55) är INTE deployad — kartrepots commits
  13:00–13:30 skriver fortfarande bara live.json, vädret är fortfarande enbart Storvik −10,7.
- [x] ✅ **#74 Två skrivare till live.json — KLART 8/9 20:04, BEVISAT I KARTREPOT** (DECISIONS #74): Axel deployade
  ~17:18 (första commit med manifest.json: 4013689). Mätt 20:04: manifest och live.json båda
  generated_at 20:00:12, sha256 MATCH för live OCH static, SMHI-nycklar `niva`/`geom`, bundlen
  i synk på main. Sista metern till telefonen är hel.
  ✅ `publish/snapshot-core.ts` är enda källan till appens tre filer; publicera/index.ts
  genereras av scripts/bundle-publicera.ts (kärna + 2 476 broar inbäddade + main.ts), CI kör
  --check; publish-map skriver aldrig mer data/app/v1/. Manifestet skrivs med. Formatet är
  motorns: SMHI `niva`/`geom`, olyckans severity gated på "Accident", gränsstationer (#49).
  50 tester gröna, 7 nya. 🔑 AXEL: `node --experimental-strip-types scripts/bundle-publicera.ts
  --check` (ska säga "i synk"), sedan `supabase functions deploy publicera` OCH `ingest-live`.
  BEVIS efter deploy: en commit i kartrepot med alla tre filerna och manifestets live-sha lika
  med sha256 av live.json. Inte deploy-kvittot.
  URSPRUNGLIGT FYND (8/9 vid kontrollen av #72): publish-map
  (Actions, broar med) och `publicera` (Supabase, broar tomma) skriver samma fil. Så länge
  Actions är dött syns det bara som 7 → 0 broar; när Actions vaknar blir det ping-pong.
  VÄG: EN ägare. Antingen läser publicera broarna ur en tabell/CDN-fil (då kan publish-map:s
  app-steg tas bort), eller så skriver publish-map bara kartlagren och aldrig data/app/.
  Verify: två på varandra följande commits i kartrepot från olika skrivare ger samma
  bridges-antal.
- [x] ✅ **#75 Givarvakt före publicering — I DRIFT 8/9 20:04** (DECISIONS #74): Storvik 2135 är borta
  ur live.json (0 väderpunkter, rimligt en septemberkväll). **weather_latest BEVISAT tinat 8/9
  20:25** ur vader.geojson på CDN: 848 SE-stationer, 99 % med sample_time ≤ 12 min, Storvik
  rapporterar nu yta null (givaren själv säger inget) med tid 20:15. Axels bool-array-fix
  (822d178) verkar. Kvar att bevisa: PostGIS-testet i CI (oktober) och
  Bengts mejl till Trafikverket — vakten döljer givarfelen, den lagar dem inte.
  ✅ WX_SANE i VARJE väderfråga (svensk, gräns, bro): färsk ≤ 3 h OCH yta ≥ luft − 12 °.
  Fäller bara på bevisad orimlighet. PostGIS-test i integration.test.ts (Storvik-lik,
  gammal, färsk, utan luft) körs när CI lever. ⚠️ BIFYND SOM ÄR VÄRRE ÄN STORVIK: båda gamla
  skrivarna gjorde `Boolean(precipitation)`, och Trafikverket skriver **"no"** vid uppehåll
  (680 av 1 297 stationer 5/9). Varje torr station var alltså "våt", och motorn larmar på
  kall OCH våt — en falsklarmsmaskin som väntade på första kalla torra natten. Fixat: fukt =
  regn, snö eller nederbördsklass som inte är "no"/"Dry". Test på sex klasser.
  ✅ ingest-live upsertar nu weather_latest för varje mätning (batchat, bakåtvakt).
  URSPRUNGLIGT FYND (8/9):
  `publicera` (och build-snapshot.ts, samma fråga) släpper igenom yta ≤ 3 °C utan rimlighets-
  kontroll. Storvik rapporterar −10,7 °C i september och blir appens ENDA icing_point.
  #46 fastslog redan att givarvakt är obligatorisk för frostgrenen — den gäller uppenbart
  också yttemp. VÄG: spärra stationer vars yta avviker orimligt (t.ex. > 15 ° under lufttemp
  eller under närmaste grannars median) i publiceringsfrågan, i BÅDA skrivarna. Verify:
  live.json utan 2135 medan stationen fortfarande står på −10,7 i weather_latest, och en
  vektor i engine/vectors/ som visar att en spärrad station inte larmar.
- [ ] 🛑 **#53 HELA PIPELINEN STÅR — Actions vägrar starta jobb** (upptäckt 5/9 ~15:40 via
  Bengts felmeddelande om regn-30; visade sig vara mycket större än regn-30).
  🧭 **DIAGNOS, mätt och inte gissad.** Felet är INTE vår kod:
  · ingest #275 kl **11:11 LYCKADES** (32 s) · ingest #276 kl **12:11 FÖLL** (4 s)
  · **samma commit** (a7caa3d), samma workflow-fil, ingenting ändrat däremellan.
  · SKÄRPT 18:00 med regn-30:s serie: sista gröna 10:41, första röda **11:41**. Avbrottet
  började alltså mellan **11:11 och 11:41** — snävare än det första fönstret jag angav.
  · Efter ~12:11 faller ALLT: ingest, ingest-fi, ingest-dk, ingest-no, publish-map,
  bridges, healthcheck, regn-30. Varje körning dör på 3–5 sekunder med **noll steg**
  och **noll loggar** (logg-API:t ger 404 — jobbet producerade aldrig något).
  Ett jobb som dör före första steget, i alla workflows samtidigt, på oförändrad kod,
  är per definition ett konto- eller inställningsfel — inte ett programfel.
  💸 **TROLIGASTE ORSAK: Actions-minuterna slut.** Repot är PRIVAT (verifierat via API:
  `"visibility": "private"`), och privata repon på GitHub Free har **2 000 minuter/månad**.
  RÄKNINGEN, ur observerade körningar 12:00–15:37: ~32 körningar på 3,6 h ≈ **9 körningar/h**.
  GitHub avrundar VARJE jobb uppåt till hel minut, och våra jobb tar 20–40 s — alltså
  ~9 min/h ≈ **216 minuter/dygn**, och 2 000 / 216 ≈ **9 dygn**. Repot skapades 24/8.
  ⚠️ VÅR JOBBFORM ÄR MAXIMALT DYR under den modellen: många små jobb. Ett 25-sekundersjobb
  kostar en hel minut, så pulsklockan som gav oss tillförlitlighet (#63, #70) fördubblade
  samtidigt minutförbrukningen. Det är en avvägning ingen räknade på när den byggdes.
  🔑 **KRÄVER BENGT/AXEL — jag har varken behörighet eller insyn i fakturering:**
  kontrollera Settings → Billing → Actions (använda minuter, spending limit) och
  Settings → Actions (om Actions stängts av). Är det minuterna finns tre vägar:
  (a) höj spending limit (kostar pengar — DECISIONS-post krävs enligt fritier-regeln),
  (b) **gör repot publikt** ⇒ Actions blir gratis och obegränsat (men allt blir läsbart —
  hemligheter ligger i Secrets och läcker inte, men koden och tavlan blir offentliga),
  (c) skär i kadensen: färre körningar, eller slå ihop ingest-fi/dk/no till ETT jobb, vilket
  ensamt skulle spara ~4 minuter i timmen.
  ✅ **DE TVÅ GRATISDELARNA BYGGDA 5/9** (Bengts "ja bygg de två gratisdelarna").
  (1) **CRON BORTTAGEN** ur ingest, ingest-fi, ingest-dk, ingest-no och regn-30 — de fem
  pulsdrivna. GitHub-cronen fyrade parallellt med pulsen och gjorde samma arbete två gånger
  (bevis: ingest-dk 15:11:16 schedule + 15:12:01 dispatch, 45 s isär, samma jobb; över livet
  33 schedule + 58 dispatch). Varje rad bär nu en kommentar om VARFÖR, så ingen "återställer"
  den som en glömska. **HEALTHCHECKENS CRON BEHÅLLS MED FLIT** — hänger allt annat på pulsen
  måste något ha en oberoende klocka, annars dör pulsen tyst. Gårdagens vakthundsläxa (#50)
  i ny form: en oberoende vakt, allt annat på pulsen.
  (2) **GRANNLÄNDERNA SLAGNA IHOP**: `ingest-grannar.yml` kör FI, DK och NO i ETT jobb med
  en checkout och en `npm ci` i stället för tre. GitHub debiterar per JOBB och avrundar
  uppåt, så tre 25-sekundersjobb kostade tre minuter där ett kostar en.
  OBEROENDET BEVARAT: `if: !cancelled()` gör att DK och NO körs även om FI fallerar, och
  jobbet blir ändå rött. Ett lands fel får inte tysta de andras insamling — det var priset
  Bengt varnades för, och så här slipper vi betala det.
  (3) **PULSKLOCKAN KAN NU AVVECKLA.** Den kunde bara SKAPA jobb, aldrig ta bort — ett hål
  som var osynligt tills merget krävde det. Utan avveckling hade puls-ingest-fi/dk/no
  fortsatt fyra mot de gamla filerna och besparingen blivit noll. Ny `AVVECKLA`-lista, bara
  namngivna jobb, avveckling SIST så ersättaren finns innan föregångaren tas bort, och
  bevisvakten kräver nu att de avvecklade faktiskt är borta.
  ✅ **MERGAT TILL MAIN 8/9 12:40 (Bengts "merga 72", squash c027252).** CI kunde inte köra —
  YAML syntaxkontrollerad lokalt, tsc utan fel i berörda filer. Ingenting aktiveras av merget:
  cronen är borta (pulsen fyrar ändå), grannlands-jobbet och avvecklingen väntar på pulsklockan.
  🔁 **INTE AKTIVERAT ÄN — kräver en pulsklocka-körning, som kräver att Actions lever.**
  De tre gamla filerna ligger kvar med borttagen cron, så pulsen fortsätter träffa dem tills
  den pekas om. Inget glapp. När Actions svarar: kör `pulsklocka` (inventering först, sedan
  skarp), verifiera att de tre avvecklats, och radera då de gamla filerna i ett eget varv.
  📏 **ÄRLIGT OM VAD DET RÄCKER TILL — det räcker inte.** publish-map är uppmätt till
  **69–74 s per körning ⇒ 2 debiterade minuter**, var 30:e minut = 48 körningar/dygn =
  **96 min/dygn ≈ 2 880 min/månad**. Publiceringen ensam överskrider alltså hela gratisnivån
  på 2 000. De två delarna ovan halverar ungefär resten (~120 → ~60 min/dygn), men summan
  landar fortfarande klart över taket. **Under 2 000 kommer vi inte utan att publish-map
  också flyttas eller saktas ned** — och kadensen */30 är beslut #22:s löfte om ≤ 35 min
  färsk webb, alltså ett produktbeslut och inte en optimering.
  🚨 **VAD SOM STÅR STILLA UNDER TIDEN:** all datainsamling (SE/FI/DK/NO), radarpiloten,
  publiceringen till kartan (webben åldras), regn-30 — och **healthchecken själv**, så
  ingen vakt kommer att larma om det här. Kort #44:s dygnsbevis och #50:s dygnsmätning
  kan inte fullföljas medan det pågår. Livemotorn i Supabase (pg_cron) berörs INTE — den
  kör utanför GitHub, så minutfärsk data fortsätter landa i databasen.
  📉 **LÄGET 5/9 21:35, tionde timmen:** fortfarande **noll lyckade körningar**. Av de
  100 senaste körningarna (15:11 → 21:17, alla workflows) är **100 misslyckade** — ~16
  döda körningar i timmen. Logg-API:t ger 404 även på den senaste, alltså producerar
  jobben fortfarande ingenting alls. Pulsklockan i Supabase fyrar planenligt hela tiden
  (healthcheck-dispatch finns kvar på :23 varannan timme genom hela avbrottet) — det är
  runnern, inte klockan, som är blockerad. Diagnosen från 15:40 står oemotsagd.
  ⛔ Kortet kan inte drivas vidare härifrån: nästa steg kräver Billing-sidan, och den
  kräver Axel. Allt som gick att göra utan behörighet är gjort och ligger i grenen.
  🌙 **AVLÄSNING 7, 8/9 20:24: fortfarande dött.** Inget nytt prov behövdes: ci-körningarna
  på kvällens pushar (#445 20:12:14, #446 20:12:23) dog efter 2–4 s utan runner, samma
  mönster. **Förlorad insamling: 80 h 43 min.** Skillnaden mot i morse: appen och kartsajten lever
  nu ur Supabase (#72/#74/#77), så Actions-avbrottet kostar bara det som ligger kvar där:
  grannländerna, regn-30, mätknapparna och healthchecken (vakthunden i Supabase tar över).
  🗑️ **8/9 21:00: ingest-fi/dk/no.yml RADERADE** (DECISIONS #78, Bengts "så många som möjligt
  härifrån"). "Aldrig före avvecklingen" antog att Actions levde; nu finns glappet redan, pulsen
  fyrar 2×/h mot döda jobb (288 mejl/dygn) och hade bränt oktoberpotten på de gamla filerna
  dag ett. Utan filerna svarar GitHub 404: ingen körning, ingen minut, inget mejl. Första
  oktoberkörningen är fortfarande pulsklockan (inventering → skarp → grannar tar över).
  ✅ **GRANNAR-JOBBET BEVISAT 8/9 21:24–21:29:** första pulsdispatchen kom 21:24:01, körning #1
  grön: 🇫🇮 2 min 17 s · 🇩🇰 29 s · 🇳🇴 2 min 06 s = 5 min 00 s ⇒ 5 debiterade minuter per timme,
  ~120 min/dygn, ~12 kr/dygn. De tre gamla filerna är borta, de tre gamla pulsjobben avvecklade.
  Kort #53:s aktiveringssteg är därmed KLART; kortet står öppet bara för #79/#80 och
  Billing-frågan.
  🟢 **ACTIONS LEVER 8/9 21:07 (Axels 35 USD-gräns, DECISIONS #81/#82).** Första jobbet:
  pulsklockan (DECISIONS #83) — inventering #6 ren, skarp #7 bevisad: puls-ingest-grannar på
  `24 * * * *`, puls-ingest-fi/dk/no avvecklade, bevisvakten grön, 8 cron-jobb kvar. Mallen
  bytt till puls-regn-30 (puls-ingest avstängd av Axel). ci grön på main (#455/#456) ⇒
  PostGIS-testet av givarvakten och bundle-checkarna har passerat. Kvar under #53: #80
  (moaten/kameror/vilt/SMHI utan skrivare), #79 (regn-30), och Billing-frågan i lugn.
  🕗 **AVLÄSNING 6/9 07:00 (bokad incheckning): FORTFARANDE DÖTT.** Provkörde den
  lättaste workflowen som finns — `segmentlangden`, varken databas eller nät — på main:
  körning #1, `workflow_dispatch` 07:00:32, **död efter 4 sekunder**, noll steg.
  Samma symptom som i går, nu på annan kod (main har fyra nya commits). **Förlorad
  insamling: 19 h 24 min** räknat från första döda körningen 11:41, 19 h 54 min från
  sista säkra 11:11. Ingen ny diagnos behövs — terminalvarvets minutplan
  (docs/MINUTPLAN-2026-09-06.md) räknar problemet färdigt. Ny avläsning bokad ~8 h fram.
  🕒 **AVLÄSNING 2, 6/9 15:05: fortfarande dött.** segmentlangden #2, dispatch 15:05:17,
  död efter **4 sekunder**, noll steg — identiskt med #1 åtta timmar tidigare, samma commit.
  **Förlorad insamling: 27 h 24 min.** Inget nytt att diagnostisera; kortet väntar på Axel.
  🕛 **AVLÄSNING 3, 7/9 12:01 (Bengts "kolla igen"): fortfarande dött.** segmentlangden #3,
  dispatch 12:01:24, död efter **5 sekunder**, noll steg. Pulsen fyrar fortfarande varje
  slot (ingest 11:11, fi 11:37, regn-30 11:41, dk 11:42, no 11:47 — alla röda på 4 s).
  **Förlorad insamling: 48 h 21 min — två dygn.** Ingen ändring på main sedan 6/9.
  🌙 **AVLÄSNING 4, 7/9 20:05: fortfarande dött.** segmentlangden #4, dispatch 20:05:17,
  död efter **5 sekunder**, noll steg. Alla slottar 19:37–19:56 röda på 3–4 s.
  **Förlorad insamling: 56 h 25 min.** Ingen ändring på main. Väntar på Axel.
  🌅 **AVLÄSNING 5, 8/9 04:09: fortfarande dött.** segmentlangden #5, dispatch 04:09:28,
  död efter **5 sekunder**, noll steg. Pulsslottarna 03:37–04:07 röda på 4 s.
  **Förlorad insamling: 64 h 29 min.** Ingen ändring på main. Väntar på Axel.
  🔍 **AVLÄSNING 6, 8/9 12:06–12:22, LÄST MOT GRUNDEN (Bengt: "Axel säger att han
  vidtagit åtgärder"):** Axels åtgärd är #72, Supabase-flytten — bevisad och fungerande.
  På minutsidan är INGET gjort, per API: repot `visibility: private`; jobbet 102054360896
  (prov #7, 12:06:35) fick `runner_id: 0`, `runner_name: ""` och dog efter 2 s med tom
  check-run; alla 35 workflows `state: active` (inget avstängt i UI); pulsen fyrar fortfarande
  (12:07, 12:11, 12:12, 12:17, alla röda på 4 s); inga nya commits eller grenar efter 06:12.
  `runner_id: 0` är den avgörande raden: GitHub tilldelade aldrig en maskin. Det jag inte kan
  läsa är spending limit och betalstatus — bara Axel ser dem. Om han höjt gränsen är
  kandidaterna fel konto, saknad/avvisad betalmetod, eller osparad ändring.
  **Förlorad insamling: 72 h 41 min — tre dygn.**
  🔗 SIFFERKROCK SOM INTE ÄR EN KROCK: terminalkortet säger "död sedan 5/9 13:12", jag
  säger 11:11–11:41. Det är samma ögonblick i olika tidszoner (13:12 CEST = 11:12 UTC).
  Husregeln är UTC — men båda skrivsätten står nu på tavlan, så ingen ska behöva räkna ut det.
- [ ] 💸 **Minutbantning av GitHub-pipelinen** (6/9, följd av 🛑-kortet; byggs OAVSETT Axels val, släpps
  på först när minuter finns): mål ≤ 60 min/dygn (= 1 800/mån). Kandidater med uppskattad vinst:
  (1) publish-map bara kedjad efter ingest (timvis) i stället för egen 30-min-klocka: −300 min/mån
  — webben blir högst 60 min gammal i stället för 30, livemotorn/appen rör det inte;
  (2) EN nordisk ingest-workflow (SE+FI+DK+NO+regn-30 i samma jobb, ett checkout+npm ci i
  stället för fem): −250; (3) ci.yml bara på PR + main-pushar som rör engine/ingest/sql, inte
  docs/tavla: −200; (4) android.yml bara på taggar/manuellt: −150; (5) FI/DK/NO från 2×/h till
  1×/h: −200. Summa ≈ −1 100 min/mån → ~900/mån. Alternativet som tar bort problemet i grunden:
  flytta de tidskritiska jobben (ingest + publicering) till Supabase edge functions på pg_cron —
  noll GitHub-minuter, samma väg som livemotorn — men det är ett bygge på dagar, inte timmar.
  BEVISKRAV: Usage metrics per dygn efter bantningen, bokfört som tal på tavlan varje måndag.
- [ ] 🚨 **#51 Vinterarkivet skrivs nästan inte — moaten läcker** (fynd 4/9 kväll, svep
  inför kort #45; VERIFIERAT i koden, inte agentpåstående). `road_condition_history` är
  husets uttryckliga vinterarkiv — sql/001_init.sql:30 säger ordagrant *"Append-only: this
  is the winter archive (our moat)"*. MEN dess ENDA skrivare är GitHub-ingesten (ingest/db.ts:101).
  Livemotorns edge function, som äger väglaget sedan 25/8 (DECISIONS #22) och kör VARJE MINUT,
  skriver bara `road_conditions` som UPSERT och rör aldrig historiken — noll träffar på
  `road_condition_history` i supabase/functions/ingest-live/index.ts.
  MEKANIKEN som gör det allvarligt: båda delar changeid-kursor, `sync_state` källa
  `road_conditions` (edge: index.ts:93 + saveCursor; GitHub: ingest/index.ts:26). Minutjobbet
  flyttar fram kursorn ~59 gånger per timme, så timjobbet — arkivets enda skrivare — ser bara
  deltat sedan senaste minutkörningen. Omklassningarna däremellan konsumeras och försvinner.
  KONSEKVENS: (a) kort #45:s säsongsbaseline per segment vilar på data som till största delen
  inte sparas; (b) marsdomens vinterfacit likaså; (c) ingen vakt märker det — healthchecken
  mäter sync_state-färskhet och antal segment, aldrig om historiken VÄXER (ingest/healthcheck.ts).
  ⚠️ BRÅDSKAR OBEROENDE AV RADARDOMEN: varje dygn som går kostar vinterdata som inte går att
  hämta i efterhand, och vintern börjar nu. Kortet är INTE låst bakom 14/9.
  📏 **MÄTT 5/9 (arkivlackan #1, Bengts "mät bortfallet") — OCH HYPOTESEN BEKRÄFTADES INTE.**
  Uppmätt bortfall: **0 av 818 segment** (0,0 %). Varje nuvarande tillstånd finns i arkivet,
  både de 806 som ändrades före 25/8 och de 12 efter. Inget segment saknar historikrad.
  MEN LÄS VARFÖR, för siffran friar ingen: arkivet är **830 rader över 818 segment** — i
  praktiken EN rad per segment plus tolv — och dess **nyaste rad är 2026-08-25 08:09**.
  Tidsserien över 30 dygn innehåller EN enda dag: 25/8, med 12 rader. Inte en enda
  omklassning har alltså skett på **elva dygn**. Bortfallet är noll för att flödet står
  stilla, inte för att arkivet fungerar. Mätningen är ett NOLLRESULTAT, inte en friande dom.
  🚨 DET STÖRRE FYNDET, som jag inte letade efter: **moaten är inte läckande — den är tom.**
  "Vinterarkivet" innehåller ingen vinterhistorik alls, bara ett stillbildsavtryck av varje
  segments tillstånd plus tolv ändringar. Äldsta modified_time är 2026-02-21, vilket bara
  betyder att segmentet inte klassats om sedan dess. Det finns ingenting att räkna en
  säsongsbaseline ur i dag — kort #45:s premiss saknar underlag oavsett läckan.
  🔒 VARFÖR DEN AVGÖRANDE MÄTNINGEN INTE GÅR ATT GÖRA ÄNNU: den delade kursorn kan bara
  fälla eller fria när segment FAKTISKT klassas om, alltså i vinterväder. I september ligger
  RoadCondition-strömmen still. Hypotesen är därmed varken bevisad eller motbevisad — den är
  otestbar tills snön kommer, vilket är exakt när den spelar roll.
  ⚠️ BLIND FLÄCK UPPTÄCKT I SAMMA VARV: healthchecken vaktar `sync_state`-FÄRSKHET, och
  edge-funktionen skriver `synced_at = now()` varje minut oavsett om något hämtades. Vakten
  kan alltså inte skilja "färsk och tyst" från "färsk och trasig". Elva tysta dygn ser
  identiska ut med elva trasiga.
  ✅ **VAKTEN BYGGD OCH I DRIFT 5/9 04:25** (Bengts "bygg vakten"): arkivvakten sitter i
  healthchecken, som går var annan timme på pulsklockan sedan #50.
  DEN SVÅRA DELEN LÖST: "arkivet växte inte" GÅR INTE att larma på — i september klassas
  inget om, och en sådan vakt hade tjutit hela hösten och blivit avstängd före vintern.
  Vakten frågar i stället något som bara har ett svar: finns ett NUVARANDE tillstånd som
  borde ha hunnit arkiveras och inte gjorde det? Tröskeln 3 h = tre ingestkörningar, så en
  rad som saknas då är förlorad och inte försenad — och en enstaka fallerad ingest fäller
  inte vakten. Noll larm på tyst ström; larm första dygnet strömmen lever och rader tappas.
  BEVIS (healthcheck #82, 04:25:50, HEALTHY):
  `arkivvakt: 0 oarkiverade av 818 prövade tillstånd (>3 h) · arkivet 830 rader, nyaste 260 h
  gammal · 0 omklassningar senaste dygnet`
  Loggraden bär nämnaren OCH tystnaden med flit: "0 oarkiverade" utan skala är ett tal utan
  mening, och utan "0 omklassningar senaste dygnet" kan det läsas som hälsa när det bara är
  tyst. Det var precis felet gårdagens mätning nästan lurade mig att göra.
  ⚠️ EJ BEVISAT: larmgrenen har aldrig fällt skarpt och kan inte bevisas förrän strömmen rör
  sig. Joinens semantik är prövad mot känd sanning i arkivlackans självtest.
  🧭 **KURSORMÄTNINGEN KÖRD 5/9 04:38 (Bengts order) — HELT LÄSANDE, och den ändrade frågan.**
  Jag hade lovat att den skulle fälla eller fria hypotesen "utan att vänta på snö". **Det
  löftet höll inte, och det är mitt fel** — med tyst ström kan INGEN mätning avgöra saken.
  Men i stället för produktionsändringen (egen kursor) byggdes en läsande variant som låter
  TRAFIKVERKET vara domare i stället för att jämföra våra tabeller med varandra, som gårdagens
  cirkulära mätning gjorde. Den avgjorde en ANNAN och farligare fråga.
  BEVIS (kursormatning #1):
  `KURSORN: vår lagrade last_change_id 7677878362341114260 · TRV:s just nu 7677878362341114260
  → IKAPP — livemotorn har konsumerat hela strömmen`
  `TRV:s sanning (818 levande segment) mot arkivet (830 rader): senaste timmen 0/0 · dygnet 0/0
  · veckan 0/0 · hela beståndet 818 omklassade, 0 EJ arkiverade`
  `DOM: OTESTBAR — noll omklassningar hos Trafikverket det senaste dygnet.`
  ✅ **DET SOM ÄR AVGJORT, mot en extern domare:** (a) vår pipeline är INTE döv — tystnaden är
  Trafikverkets, inte vår; (b) arkivet är KOMPLETT mot källan, 0 av 818 saknas; (c) livemotorn
  ligger exakt ikapp TRV:s changeid, inget står i kö bakom oss. **Gårdagens blinda fläck är
  därmed stängd: "färsk och tyst" är bevisat tyst, inte trasigt.** Det var det farligare av de
  två alternativen, och det är nu uteslutet.
  🔒 DET SOM INTE ÄR AVGJORT: läckhypotesen. Domen säger OTESTBAR med flit — självtestet
  prövar uttryckligen att tyst ström ALDRIG får bli ett friande svar. Starvation kräver ett
  flöde att svälta på; med noll flöde finns noll svält, och alltså inget att mäta.
  ✅ **EGEN KURSOR BYGGD OCH I DRIFT 5/9 04:55** (Bengts "ja bygg", DECISIONS #73, PR #67).
  GitHub-ingesten läser nu `road_conditions_arkiv` i stället för den delade nyckeln, så
  arkivets enda skrivare konsumerar hela timmens ström i stället för sista minutens delta.
  Livemotorns kursor är orörd. TRE FÖLJDÄNDRINGAR som hörde till, inte extra:
  (a) BAKÅTVAKT på upserten (`EXCLUDED.modified_time >= road_conditions.modified_time`) —
  nödvändig eftersom vi nu behandlar en hel timme samtidigt som livemotorn skriver varje
  minut, så kapplöpningsfönstret växer; (b) räknarna mäter VERKLIGA skrivningar (rowCount)
  i stället för försök, annars går nyttan inte att se; (c) integrationstestet SKÄRPT — det
  fällde mig först, och hade rätt: det krävde `history: 1` på omkörning trots att noll rader
  skrevs. Nu krävs `history: 0`, vilket bevisar CLAUDE.md:s "en rerun får aldrig duplicera
  rader" i stället för att anta den.
  BEVIS (ingest #267, 04:55:26):
  `delta sync from: { deviations, weather, cameras }` ← ingen road_conditions-nyckel, alltså
  full första synk som väntat · `road condition segs: 818` ·
  `DB WRITE OK: {"road_conditions":818,"history":0,...}`
  Nollan är den ärliga räknaren i arbete: inget nytt att arkivera, eftersom alla 818 redan
  fanns. Under den gamla räknaren hade samma körning skrivit ut `history: 818` — en lögn.
  🌧️ **OVÄNTAD INSIKT SAMMA KÖRNING, värd att minnas:** radarsteget mätte 178 segment med regn
  ≥ 0,1 mm/h just nu, max 15,38 mm/h — det REGNAR över Sverige. Ändå: `non-normal active: 0`.
  Regn flyttar alltså inte väglagsströmmen alls. Omklassning är ett VINTERfenomen, inte ett
  nederbördsfenomen. Det förklarar tystnaden definitivt och skärper förväntan: arkivet
  förblir tyst tills det fryser, hur mycket det än regnar. Gäller även kort #45.
  🔑 KORTET STÅR FORTFARANDE ÖPPET: nyttan går inte att mäta förrän strömmen lever. Men nu
  väntar vi med en bättre pipeline i stället för med en obesvarad fråga — arkivvakten läser
  var annan timme, kursormätningen sitter på knapp, och den egna kursorn ser till att det
  finns något att arkivera när vintern kommer.
- [ ] ⚠️ **#52 Ett test låser fast motsatsen till vinterbaseline-principen** (samma svep,
  verifierat). test/engine.test.ts:143-146 hävdar att ett segment klassat **code 1 (Normalt)**
  med info **"Packad snö"** MÅSTE ge exakt ett larm — tillsammans med Isfläckar, Svår halka och
  Risk för halka. Det är ordagrant det vinterbaseline-fall som kort #45 säger *"larmar ALDRIG"*.
  Principen är alltså inte bara obyggd; den är aktivt låst åt andra hållet, och i alla tre
  motorportarna (engine/src/engine.ts:237, Engine.kt:162, Engine.swift:306 gör samma test).
  Varför det spelar roll NU: att ändra det är en KONTRAKTSÄNDRING som rör engine/vectors och
  tre körtider — inte något man upptäcker i december när snön ligger. CLAUDE.md: en vektor får
  aldrig försvagas för att få ett bygge grönt, så ändringen kräver eget beslut med motivering.
  📏 **CRY-WOLF-YTAN MÄTT 5/9 07:28** (Bengts "mät norrlandssegmenten", vinterbaltet #1,
  helt läsande). Vägnätet: 818 segment, 23 700 km. Alla 818 bär exakt EN länskod — noll utan
  län, noll som spänner över flera, så uppdelningen är entydig.
  `Norrland (21–25):        168 segment (20,5 %) · 7 519,6 km (31,7 % av sträckan)`
  `Vinterbältet (17,20–25): 258 segment (31,5 %) · 10 389,6 km (43,8 % av sträckan)`
  🔍 **DET SOM GÖR SIFFRAN SKARPARE ÄN DEN SER UT — nordliga segment är LÅNGA.**
  Jämtland 59,0 km/segment · Västerbotten 50,4 · Norrbotten 47,1 — mot Stockholm 18,4,
  Västra Götaland 20,5 och Skåne 20,7. Snitt i Norrland 44,8 km mot 24,9 i resten, alltså
  **1,8 gånger längre**. Ett enda "Packad snö"-segment i Jämtland är alltså nästan sex mil
  sammanhängande varningsyta. Och eftersom repriser släpps igenom efter 10 min OCH 5 km
  (engine.ts fired-kartan) kan SAMMA segment tala flera gånger under en resa längs det —
  i 90 km/h är sex mil ~40 minuter, alltså upp till tre gånger. Procenttalet 31,7 %
  underskattar därför problemet mätt i *tid under larmande segment*.
  ⚠️ MÄTNINGENS GRÄNS, står i rapporten och inte bara här: det här är EXPONERING, inte
  incidens. Arkivet börjar 24/8 så vi har ingen vinter att räkna på — hur många av de 168
  som FAKTISKT bär "Packad snö" i januari vet vi inte. Siffran är ett TAK, inte en prognos.
  🧪 **RÖSTKOSTNADEN MÄTT 5/9 (Bengts "går det göra segmenten kortare?" → "mät").**
  scripts/segmentlangden.ts kör MOTORN skarpt mot syntetiska resor i 90 km/h längs hela
  segmentet, code 1 + "Packad snö". Ingen databas, inget nät — helt reproducerbar.
  Självtest med känd sanning: 5 km (200 s körtid < 600 s reprisfönster) ⇒ exakt 1 larm;
  59 km klassat "Torrt" ⇒ 0 larm (riggen larmar inte på vad som helst).
  ```
                              körtid  A som i dag  B delat 5 km  C en gång
    Jämtland                  39 min            4            12          1
    Västerbotten              34 min            4            10          1
    Norrbotten                31 min            4             9          1
    Dalarna                   25 min            3             8          1
    utanför Norrland (snitt)  17 min            2             5          1
    Stockholm                 12 min            2             4          1
  ```
  Jämtland i detalj: A talar minut 0, 10, 20, 30. B talar minut 0, 3, 6, 9, 13, 16, 19,
  22, 26, 29, 32, 36 — **var tredje minut i trettionio minuter**.
  🛑 **SVARET PÅ FRÅGAN ÄR NEJ: kortare segment gör det TRE GÅNGER VÄRRE.** Ett nytt id har
  ingen reprishistorik (`if (!f) return true` i engine.ts) och är berättigat direkt, så
  varje bit talar en gång. Geometrin är inte spaken. Dessutom vore det falsk precision —
  Trafikverket klassar hela sträckan, så finare geometri bär inte finare information.
  🔑 SPAKARNA, i ordning: (1) grundfixet är #52/#45 — larmar inte baseline-snö alls blir
  längden irrelevant; (2) reprisregeln för segment: "talar inte igen förrän klassningen
  ändras" ger kolumn C, alltså 4→1 i norr och 2→1 i söder, utan att röra geometrin, och
  hjälper i hela landet. Avvägning, inte självklar vinst: på en lång resa kan en påminnelse
  efter en halvtimme vara önskad. (3) Axels spår: rösten säger inte hur långt sträckan
  räcker — på sex mil vore det ärligare, och gör tystnaden efteråt motiverad.
  🔑 BESLUT TILL BENGT + AXEL, kopplat till #45 — nu med storleksordning i handen: ska
  "Packad snö" på code 1 fortsätta larma nationellt tills baseline finns? Var gränsen går
  (21–25 eller 17+20–25) är också ert val; mätningen ger båda och väljer inte åt någon.
  Ingen ändring görs på eget bevåg — det rör engine/vectors och tre körtider.
- [ ] 📡 **#43 Radarn som infrastruktur** (Bengts beställning 2/9, efter cellmätningens
  dom) — EN källa, SEX nyttor: vattenplaningens trigger (#42), blixthalkans pipeline
  (#16), marsdomens orsaksklassning, miss-/skuggfacit, vinterns snöbyar, Norden.
  PLAN: docs/RADAR-PLAN.md — observation inte prognos (#25-lagen), grids samplas mot
  skelettet och händelsefiltreras (fritier är lag), stationerna blir kalibrering.
  ✅ Steg 1 REKOGNOSERING KÖRD 2/9 (körning 33616309645, resultat i planens §5):
  SMHI-kompositen öppen utan nyckel, 5-min-kadens, 261 kB/fil (~77 MB rå/dygn, samplas
  — lagras aldrig), HDF5 + tif-spår. FJÄLLFYNDET: 26/26 ruttpunkter täckta — E10
  Kiruna och E14 Storlien radar_coverage:ok (nordisk komposit slår nationell); enda
  strukturella luckan är Tärnaby. Licenser CC BY/NLOD, gratis. DOMEN: inget stoppar
  källbeslutet. 🔑 Steg 2 KÄLLBESLUT: DECISIONS-rad Axel + Bengt — underlaget är
  komplett. ✅ Steg 2 KÄLLBESLUTET TAGET 2/9: DECISIONS #60 — Bengt + Axel (Axels ok
  via Bengt i chatten; Axel kontrasignerar genom att bocka här). ✅ Steg 3 PILOTEN I DRIFT 2/9 kväll
  (Bengts "bygg piloten"): ingest/radar.ts — ODIM HDF5 → proj4 → 2 km-sampling mot
  818-skelettet → Marshall–Palmer → radar_precip (händelsefiltrerad, fött låst),
  som steg i ingest-jobbet (minutdieten hålls). Prov-läget fällde ett API-fel före
  skarp drift (h5wasm FS) och bevisade formatet (DBZH, hörnkontroll 458,0×881,0).
  FÖRSTA SKARPA RADERNA (radar-pilot #3, 18:28): 63 segment med regn just då, max
  15,38 mm/h, färskhetsrad i varje logg. ✅ V3-KNAPPEN BYGGD 3/9 (Bengts "bygg och kör
  kedjebevis men ingen dom"): scripts/cell-matning-v3.ts + Actions-knappen cell-matning-v3
  — A) bekräftelse per radarband, B) Marshall–Palmer-kalibrering (mediankvot radar/mätare),
  C) missriktningen; självtest med känd sanning grönt, underlagsvakt (< 20 par = rött),
  domspärr i utskriften. KEDJEBEVISET KÖRT 3/9 (körning #2; #1 fällde en riktig bugg —
  geography-svep utan bbox-förfilter sprängde statement_timeout, lagad): 1 311 par ur
  18 kompositer, bekräftelsen växer monotont med radarintensiteten 13→30→51→71 %,
  mediankvot 0,39, missriktningen 85 % — kedjan (parning, enheter, tidsmatchning)
  bevisad; siffrorna är INTE domen (14 h data). AUTOMATISK 3/9 (Bengts order): körs varje
  MÅNDAG 06:20 efter grind-a 05:40 och smhi-prov 06:00 — tre mätkurvor i följd varje
  måndagsmorgon, resultatet på Summary-sidan. 🔑 Pilotens dom efter ~1 vecka: v3 på moget underlag + uppmätt
  volym/fritier. Steg 4 nyttjarna i kortens egen takt. Blind fläck
  kvarstår: frosten ser radarn aldrig.
- [ ] 📏 **#44 Regntäckningen** (Bengts täthetsfråga 3/9: "räcker timhämtningen?") —
  stationerna summerar regn per 30 min, ingest hämtar per timme: tappar vi varannan
  bucket? KNAPPEN BYGGD 3/9: scripts/regn-tackning.ts + Actions → regn-tackning
  (histogram 2/1/0 buckets per station-timme + täckningsprocent, självtest med känd
  sanning grönt, underlagsvakt). Nämnaren är pipelinens körtimmar, inte kalendern.
  MÄTT 3/9 kväll (körning #1): hypotesen BEKRÄFTAD — regnmätarna fångar 1 av 2
  buckets i 78 % av station-timmarna (2/2 bara 5 %), total täckning 44 % av
  teoretiska 48/dygn; alla observationer 39 % (där späder händelsefiltreringen på
  0-timmarna, 29 %). Vi tappar alltså ungefär varannan 30-min-regnsumma. Ofarligt
  för v3/cellmätningen (slumpvis förlust = mindre urval, ingen skevhet, ±45 min-
  parningen hittar den fångade bucketen) men halverar vinterseriernas växttakt.
  ✅ TÄTHETSBESLUTET TAGET 3/9 kväll (Bengt + Axel i chatten, DECISIONS #62): väg (a).
  BYGGT samma varv: ingest/regn30.ts + regn-30.yml — lätt motfashämtning :41 (mot
  ingests :11), samma parser/INSERT, bara nederbördsrader, idempotent. EFTERMÄTNING
  KÖRD 4/9 (regn-tackning #2, dagar=1): 2/2-andelen 5 → 9 % — MEKANIKEN BEVISAD
  (pulsen nådde 30 % under aktiva timmar; varje körning skriver ~85 rader som annars
  tappats) men GITHUB-CRONEN SVALT: 3 avfyrningar av ~14 möjliga, 2 fullbordade,
  5-timmarshål — samma syndrom som fällde ingest före pulsklockan. KORTET ÖPPET.
  🔑 ÅTGÄRDSFÖRSLAG (Claudes): regn-30 in i Supabase-pulsklockan (:41), samma bot
  som #26 gav ingest. Kräver handgrepp i pg_cron — Bengt/Axel säger kör.
  ✅ PULSKLOCKAN SKARP 4/9 14:05 (pulsklocka #2, DECISIONS #63): tre pulsjobb i pg_cron.
  BEVISADE I DRIFT 15:06 (Bengts "kör igång", terminalen): pulsen trycker — ingest-fi #29
  14:37, ingest-dk #27/#28 14:12/14:42, regn-30 #7 14:41, alla "Manually run by Axelstar"
  = dispatch via token, inte GitHub-cron. Healthcheckvakten #73 15:06 HEALTHY: fi-arkivet
  30 min, dk-arkivet 25 min (gräns 120), gräns-wx 20 FI-stationer, 0 öppna incident-issues
  (#70/#71 var röda på just fi/dk-stalehet — larmvägen provad i skarpt läge). KVAR på
  kortet: regn-tackning efter ≥1 dygn på pulsen ska visa 2/2-andelen stiga (beviskravet i #62).
  📏 **DYGNSBEVISET, HALVA DELEN KLAR 5/9 18:00** (bokad avläsning). KADENSEN är bevisad:
  regn-30 gick **23 av 23 timmar i följd** 4/9 12:41 → 5/9 10:41, varje timme på minuten :41,
  alla `workflow_dispatch`, alla gröna. Ett helt dygn utan ett enda missat varv.
  GitHub-cronen under samma fönster: **8 avfyrningar av 29 möjliga (28 %)** — och de kom
  16:35, 19:07, 21:48, 00:22, 04:55, 09:20, 13:01, 16:14, alltså utspridda över hela timmen
  i stället för på :41. Det bekräftar #70:s 40 %-mätning oberoende och motiverar i efterhand
  att cronen togs bort i kort #53.
  🛑 **ANDRA HALVAN GÅR INTE ATT MÄTA:** 2/2-andelen kräver en regn-tackning-körning, och
  Actions ligger nere sedan 5/9 (kort #53). Beviskravet i #62 gäller alltså fortfarande och
  **kortet stängs inte** — kadensen räcker inte som bevis för täckningen. Mätningen görs om
  så fort Actions svarar.
  PULSEN MÄTT 4/9 kväll (läsvarv, ingen kod ändrad): regn-30 har gått 8/8 hela timmar
  12:41–19:41 på token-dispatch. Samma dygn dessförinnan, på enbart GitHub-cron, gav
  00:41–11:41 tolv möjliga timmar men bara 3 avfyrningar — och 2 av dem dog i jobbets
  5-minutersgräns där `npm ci` hängde (01:21 och 11:43, normalt 1–2 s). 1 av 12 timmar
  landade alltså före pulsen; 8 av 8 efter. TÄTHETSPULSEN i körningarnas egna loggar:
  34 % (12:41, fönstret bar fortfarande cron-hålet) → 59 % (16:41, tre hela pulstimmar)
  → 51 % (19:41). ⚠️ LÄS INTE DEN SIFFRAN SOM TÄCKNING: pulsen räknar bara våta
  station-timmar i ett 3 h-fönster, och fönstret klipper sin äldsta timme mitt itu —
  den timmen kan aldrig få två buckets, så pulsen har ett inbyggt tak klart under 100 %.
  En station som är våt vid :41 men torr vid :11 skriver dessutom EN bucket helt korrekt
  och räknas ändå som halv. Dygnsbeviset (regn-tackning dagar=1) 5/9 18:00 är mätningen
  som gäller — taket där ligger också under 100 %, och kortet ska dömas mot den insikten,
  inte mot 100.
  📏 **DYGNSBEVISET KÖRT 9/9 04:31 (regn-tackning #3, dagar=1) — KORTET STÄNGS INTE:** regnmätarna
  617 stationer × **9 körtimmar**, 2 buckets/timme **26 %** (baslinjer 5 % 3/9, 9 % 4/9), 1: 20 %,
  0: 54 %, bucket-täckning 36 %. Andelen har stigit — men de 9 körtimmarna är exakt regn-30:s
  pulstimmar sedan 21:41, och raderna är ett SKEVT urval: ingest-live (varje minut) skriver varje
  "intressant" mätning först med rain_sum_mm = NULL, och regn-30:s rad kastas av ON CONFLICT DO
  NOTHING. Regn-30 kommer bara in där ingest-live inte skrev alls (yta > 5 °C och nederbördsflaggan
  släckt, men 30-min-summan > 0 — "regnet slutade nyss"). Siffran mäter alltså regn-30:s
  restnisch, inte täckningen. Riktig dygnsmätning kräver först Axels deploy av ingest-live (kort
  #84); efter den skriver livemotorn rain_sum_mm varje minut och #79 avgör om regn-30 alls behövs.
- [ ] 🐕 **#50 Vakthunden är själv obevakad** (fynd 4/9 kväll, läsvarvet inför
  radardomen) — healthchecken är den enda som märker när något tystnar, och den går
  fortfarande på ren GitHub-cron. GENOMGÅNG av alla 15 cron-rader i repot: pulsklockan
  bär ingest/fi/dk/no/regn-30; publish-map räddas utan att någon tänkt på det, eftersom
  den är kedjad på `workflow_run: [ingest]` och därmed ärver pulsen; bridges (6 h),
  marknadsföring (dygn) och måndagsserien tål drift. Kvar som ENDA tidskritiska jobb
  på naken GitHub-cron: vakthunden själv.
  MÄTT (20 schemalagda körningar, 31/8 17:38 – 4/9 20:34 = 98 h 56 min): cron säger
  `23 */2 * * *`, alltså ~49 avfyrningar. Verkligheten gav **20 — 40 %**. Mellanrum:
  kortast **3 h 03**, längst **6 h 44** (två gånger: 2/9 04:40→11:24 och 4/9 04:39→11:23),
  snitt 4 h 59. **Noll** av 19 mellanrum nådde de bokade 2 timmarna; 16 av 19 var över 4 h.
  Workflowens egen kommentar påstår "vakthunden i skriptet larmar ändå inom 2 h" —
  mätningen motbevisar den rad för rad. KONSEKVENS: värsta hålet är nästan 3,4 gånger
  längre än stalehetsgränsen (120 min) vakten ska fånga, så en tystnad kan hinna börja,
  pågå och rätta sig själv utan att någon ser den. Det var precis vad som hände 4/9:
  UNHEALTHY-larmet 11:27 var första signalen om en FI/DK-stalehet som redan pågått i timmar,
  och nästa blick därefter kom först 16:25. Medan vi samlar data mot radardomen 14/9 är
  det här den enda kända vägen till en tyst förlorad insamling.
  ✅ ÅTGÄRDEN KÖRD 4/9 21:08 (Bengts "kör push healthcheck"): `puls-healthcheck` skarp
  i pg_cron — en rad i pulsklockans NYA-lista, samma mekanik som #63, ingen ny kod och
  ingen ny hemlighet (kommandot kopieras i databasen, token passerar aldrig en logg).
  Schemat `23 */2 * * *` är oförändrat från workflowens eget cron: bara leveransvägen
  byttes, inte avsikten. GitHub-cronen står kvar; pulsen är additiv, som för regn-30.
  BEVIS (pulsklocka-körning #5, 21:08:18, bevisvakten grön — den hade fällt jobbet rött
  om något av de fem pekat fel eller tappat token):
  `OK puls-healthcheck: workflow=healthcheck.yml schema=23 */2 * * * aktiv=true token=true`
  → `Alla 5 pulsjobben på plats`. Elva cron-jobb i pg_cron nu, var tio.
  ✅ **AVFYRNINGEN BEVISAD 4/9 22:23** (avläsning 22:38, rotationsläxan uppfylld —
  pg_cron-raden var inte beviset, den här körningen är det): healthcheck **#77**,
  `workflow_dispatch`, **22:23:02 UTC** — två sekunder efter schemats minut, utlöst av
  token precis som ingest-familjen. Utfall HEALTHY (gräns-wx 20 FI / **44 NO** inom 40 km,
  2 783 kameror, 818 segment, 153 150 väderobs, webbens meta.json 11 min gammal).
  Inga incident-issues: larmsteget hoppades över, auto-close-steget körde.
  Mellanrummen kring bytet: #75 16:25 → #76 20:48 (4 h 23, gammal cron) → **#77 22:23
  (1 h 35, pulsen)** — första mellanrummet under de bokade 2 h sedan mätningen började.
  🔁 KORTET STÅR ÄNDÅ ÖPPET: ETT mellanrum är inte ett dygn. Beviskravet är oförändrat
  — ett dygns healthcheck-körningar där inget mellanrum överstiger 2 h 30. Dygnsmätning
  bokad 5/9 21:30 UTC; den avgör om kortet får stängas.
  📏 **DYGNSMÄTNINGEN KÖRD 5/9 21:30 — KORTET STÄNGS INTE.** Fönstret som kortet bokade
  (4/9 22:23 → 5/9 22:23) är inte mätbart: Actions har inte startat ett enda jobb sedan
  ~11:41 (kort #53). Jag mäter därför det fönster som FANNS och säger det uttryckligen.
  LEVANDE FÖNSTER 4/9 22:23:02 → 5/9 10:40:27 (12 h 17 min, 11 lyckade körningar,
  10 mellanrum): kortast **1 min**, längst **2 h 00 min 01 s**, snitt **1 h 13 min**,
  **0 av 10** över 2 h 30. Pulsen levererade **6 av 6** tvåtimmarsavfyrningar på :23,
  varje gång inom 2 sekunder (00:23:02, 02:23:01, 04:23:02, 06:23:02, 08:23:02, 10:23:01);
  GitHub-cronen bidrog med 5 extra körningar som drift (00:08, 04:24, 04:35, 10:40 …).
  Så långt håller beviskravet — men det är ett halvdygn, inte ett dygn.
  🕳️ **PÅGÅENDE HÅL: 10 h 54 min och växande** vid mätningen (10:40:27 → 21:35).
  Det är **4,4 gånger** stalehetsgränsen på 120 min som vakten finns till för att fånga.
  🔎 **DET MÄTNINGEN LÄRDE OSS SOM VI INTE VISSTE:** pulsen gav vakthunden en **oberoende
  klocka** — men inte en **oberoende löpare**. Pulsklockan fyrade planenligt genom hela
  avbrottet (12:23, 14:23, 16:23, 18:23, 20:23 finns alla som `workflow_dispatch`), och
  varenda en dog på 1 sekund utan steg. Vakthundens enda eskaleringsväg är att öppna en
  incident-issue, och den kräver att jobbet FÅR köra. Kvitto: **0 öppna incident-issues**
  i repot efter 11 timmars totalstopp (enda öppna issue är #15, Bengts kort #42 från 2/9).
  Ett fel som slår ut runnern slår alltså ut både insamlingen OCH larmet om den — samma
  enda punkt. Att avbrottet ändå syns beror på GitHubs egna misslyckandemejl (så Bengt
  fick veta), inte på något vi byggt. Det är tur, inte konstruktion.
  📏 **MORGONAVLÄSNING 9/9 04:30 — KORTET STÄNGS INTE, och läget är sämre än 4/9:** puls-healthcheck
  är avstängd av Axel (med flit, 8/9) ⇒ vakthunden går åter på naken GitHub-cron. Fönstret sedan
  Actions vaknade (8/9 21:07 → 9/9 04:37, 7 h 30): körningar 21:13 (röd, #144), 23:58 (manuell,
  #145), 00:18 (cron, #146 grön). Mellanrum: **2 h 45** (21:13→23:58) och **4 h 19 och växande**
  (00:18→04:48) — slot 02:23 kom aldrig, 04:23 kom 25 min sent som #147 04:48. **2 av 2 mellanrum över 2 h 30.**
  Supabase-vakthunden (jobid 20, timvis) är primär vakt, men dess larmväg saknar PAT-rättighet
  (Axels punkt 2). Alltså: två vakter, ingen som kan larma i tid. FÖRSLAG (Axels beslut, ingen
  kod): slå på puls-healthcheck igen — en rad i pulsklockans NYA-lista, 12 körningar/dygn ≈ 12 min.
  ❓ **AXELS FRÅGA 9/9 ("osäker på pulsklockan — har den orsakat bekymmer?") — SVAR UR MÄTNINGARNA:** nej,
  inte en enda gång. Pulsen har levererat på sekunden varje gång den mätts: healthcheck 6/6 tvåtimmars-
  avfyrningar inom 2 s (4/9–5/9), regn-30 23/23 timmar på :41 (4/9–5/9), grannar 4/4 och ingest 4/4 i natt.
  GitHub-cronen gav 20 av 49 (40 %) i samma fönster. Det som såg ut som pulsens fel 5/9 var Actions-
  gränsen: pulsen fyrade planenligt genom hela avbrottet, jobben dog på runnern. Den enda skavanken har
  varit mallvakten (mallen pekade på ett jobb som stängts av) — den fäller körningen tyst-säkert, skriver
  aldrig fel. Kostnad om den slås på: 12 jobbstarter/dygn ≈ 12 min. Alternativet är att vakthunden i
  Supabase bär hela vakten — men dess larmväg är obevisad tills larmprovet (?larmprov=1) gett en issue
  med etiketten vakthund; 9/9 11:00 finns ingen sådan issue. Axels val, ingen kod förrän han sagt ja.
  ✅ **BRON PÅ 9/9 11:09 (Bengts beslut "gör den som en bro", DECISIONS #91):** pulsklocka #12 inventering +
  #13 skarp: `schemalagt: puls-healthcheck (23 */2 * * *) → healthcheck.yml`, bevisvakten `OK … token=true`,
  10 cron-jobb. Larmvägen bevisad åt båda hållen samma timme: larmprovet öppnade issue #91 10:58:40 och
  vakthundens gröna körning stängde den 11:07:02. BRONS SLUT = kort #87 (kontrollerna in i vakthunden,
  healthcheck.yml läggs ner). Bevis för bron: healthcheck-körningar på :23 varannan timme från 12:23, inget
  mellanrum över 2 h 30 under ett dygn — kort #50:s ursprungliga beviskrav, läses av morgonavläsningen 10/9.
  ⏭️ NÄSTA: mät om samma fönsterlängd när Actions lever igen (kort #53 är grinden).
  Beviskravet är oförändrat — ett DYGN utan mellanrum över 2 h 30.
  ⚠️ VÄNTAD BIEFFEKT, säg det innan någon misstolkar den: en vakt som tittar var annan
  timme i stället för var femte kommer se stalheter som förut hann börja och rätta sig
  osedda. Fler incident-issues den närmaste tiden betyder att vakten börjat fungera —
  inte att pipelinen blivit sämre.
- [x] ~~⛏️ **#48 Golvbyggena**~~ ✅ KLART 4/9 (utom bygge 3) (Bengts order 4/9: "ta hela kortet, allt självförsörjande")
  — PÅGÅR (terminalen): GOLVET.md:s byggen 1–4 med automatiseringskrav: automigrering
  vid varje ingest (db.ts/fi.ts-mönstret), healthcheck-golv på varje ny fältfamilj
  (exists-vaktade så de inte larmar på ofött), förstapubliceringsbevis i loggrader.
  (1) SE vind×3 + sikt, (2) FI-breddningen ~9 sensorer (frostpunkt, saltfryspunkt,
  saltmängd, vind, sikt, nederbördsform, ytstatus), (3) PhotoTime — UPPTÄCKT: ingen
  deploy-väg för edge-funktioner finns från terminalen/CI (inga Supabase-tokens i
  Secrets) — skjuts till webben-varvet med deploy-läxan, (4) LocationText in i ingest +
  vaglag.geojson (OBS: fylls i takt med omklassningar — full först under vintern).
  Bonus i samma svep: healthchecken får FI/DK-stalehetsvakt (fanns inte — bara svenska
  sync_state vaktades!). Kortanteckningar: SMHI-moln→#46, SATEEN_OLOMUOTO→#45,
  SensorNames→#46, DMI/NO→sina spår, röst-LocationText→Axel.
- [x] ~~🧹 **#47 Vad ligger mer på golvet?**~~ ✅ KLART 4/9 (Bengt + Claude, terminalen):
  docs/GOLVET.md — tio källor genomgångna mot LEVANDE fältdumpar (TRV-recon körning
  33840067087 + lokala dumpar). FEM TUNGA FYND: (1) SIKTEN finns i ALLA källor
  (TRV VisibleDistance!, FI, SMHI 12, DMI) — hål C var ett hämtningshål, inte källhål;
  (2) VINDEN likaså (TRV Wind[] + byvind SpeedMax); (3) Finland levererar RIMFROSTEN
  FÄRDIGRÄKNAD (KUURAPISTE, KASTEPISTE_ERO_TIE) + saltjusterad FRYSPUNKT (JÄÄTYMISPISTE)
  + nederbördens FORM (SATEEN_OLOMUOTO = #45-facit); (4) SMHI:s MOLNMÄNGD = rimfrostens
  klar natt-detektor; (5) metadata-guld: TRV SensorNames (sensorspecifik givarvakt),
  Camera PhotoTime (daterat facit), RoadCondition LocationText (röstens VAR).
  Rent golv: TrafficSafetyCamera, Polisen. Recon-lucka: Situation-dumpens datumfilter.
  🔑 Fynden är KANDIDATER — föreslagen ordning i GOLVET.md; inget hämtas utan eget kort.
- [x] ~~🌉 **#49 Gränssnapshoten — grannländernas data in i svenska appen**~~ ✅ BYGGT +
  BEVISAT 4/9 (Bengt + Claude, terminalen). Publicering #596 grön, loggraden: FI 16
  stationer inom 40 km av svenska vägnätet nåbara för appen (0 kalla i sept = rätt, som
  broarna). Healthcheckgolv (<10 = larm) + reachability-logg varje publish. FYND: build-snapshot.ts läser BARA weather_latest
  (svenska stationer) — FI/DK/NO ligger i egna scheman och matar bara skuggsnapshoterna,
  når ALDRIG appen. En förare i Haparanda/Karesuando/Riksgränsen/Storlien får varningar
  mot närmaste SVENSKA station även när en finsk står två km bort. Vi MÄTTE nyttan 1/9
  (Norrland >20 km 12,6→11,5 % med FI) — men mätningen blir produktnytta först när
  gränsstationerna når snapshoten. BYGGE: UNION i snapshotens väderfråga, utländska
  stationer inom 40 km av svenska vägnätet, källmärkta. Tre invarianter ORÖRDA: privacy
  (matchning fortfarande on-device), röst (punktkälla = samma text), licens (attribution
  finns för kartan, appen är Axels kolumn). v1 = FI (äkta vägyta TIE_1); DK HÅLLS
  (grästemp-ärligheten #45, Bengt/Axel), NO faller in med kontot. 🔑 Attribution i
  app-copyn = Axels beslut; grässtemp-DK = Bengt/Axel.
- [ ] 🔨 ❄️ **#46 Rimfrosten — svartis utan nederbörd** (Bengts hål A, 4/9) — PÅGÅR:
  ANALYSFAS (Bengt + Claude, terminalen 4/9). Fyndet: motorns fuktvillkor är enbart
  nederbörd, men dewpoint_c ligger oanvänd i varje arkivrad sedan 24/8. Rimfrost
  (klar natt, yta ≤ daggpunkt, ingen nederbörd) = höstens klassiska svartis — motorn
  tiger. Analysen backtestar villkoret mot arkivet INNAN någon metodändring föreslås:
  hur många stationstimmar skulle nya grenen fånga (marginaler 0/0,5/1 °C × yttröskel
  0/1 °C), överlappar den befintlig fukt, och toppar den kl 03–07 (fysikens signatur —
  gör den inte det är villkoret brus)? KÖRNING #1 (4/9, 6 min): fysikkontrollen FÄLLDE
  resultatet — platt dygnsprofil, och topp-3-stationerna hade yta−dagg −28…−49° =
  TRASIGA DAGGPUNKTSGIVARE (53/58 kandidater från 3 stationer). STORT BIFYND: frost-
  grenen kräver GIVARVAKT innan den byggs, annars falsklarmsmaskin. v2 med äkthetsvillkor (RH ≥ 90
  korsgivare + yta−dagg ≥ −5°) KÖRD (#2, 2m58s): 0 av 53 kandidater överlevde — ALLA
  var givarfel (57 rader < −10°, stationerna Ollsta 2346, Storvik 2135, Bolhyttan 1713).
  ANALYSFASENS DOM: (a) arkivet saknar ännu äkta rimfrostnätter — kvantifieringen görs
  om vid höstens första riktiga frostnätter (knappen redo); (b) ETABLERAT: givarvakten
  är obligatorisk del av varje framtida frostgren — utan den hade rimfrostvarningar
  avfyrats på skrot från tre stationer; (c) felet är isolerat till daggpunkten —
  offsetmodellen/grind A använder bara yttemp och är opåverkad. KANDIDAT (Bengts
  kolumn): påtala de tre stationernas orimliga daggpunkter för Trafikverket (mejlutkast
  levererat i chatten 4/9).
  ANALYSFAS DEL 2 (beslutad 4/9, Bengt: "gör 1,2,3") — metodgenomgångens tre spår:
  (1) ✅ FI-DAGGPUNKTEN IN I INGESTEN 4/9: KASTEPISTE fanns i källan men släpptes på
  golvet (verifierat live: 505/528 stationer, ex. station 1001 = 7,5°). Lapplands
  septemberfrost ger äkta rimfrostnätter VECKOR före Sverige — samma analys, finskt
  arkiv. ✅ BEVISAT 4/9: körning #24 föll på 42703 (latest-tabellen saknade kolumnen —
  rotationsläxan fångade det på minuter), sql/010 + automigrering i fi.ts, körning #25
  GRÖN med loggraden "daggpunkt 505 st". Finska daggpunkter arkiveras från och med nu.
  (2) HÖSTENS OMKÖRNING GÖRS UTFALLSDRIVEN, inte villkorsräknande: starta i FACIT
  (väglagets frost-omklassningar en klar morgon + gryningsbilder ur kamerafacit) och
  fråga bakåt om daggpunktsgrenen såg det 1–3 h innan där nederbördsgrenen var blind.
  Missmätningens (#19) riktning; bevis per händelse i stället för timstatistik.
  (3) NOTERADE, DRIVS EJ: historik bakåt är stängd väg (TRV live-only, SMHI saknar
  vägyta — begränsning, inte slarv); fysisk mikrovalidering (frostplatta/termometer)
  är trevlig men ger aldrig statistik.
  🔑 Motoränring + vektor är ETT SENARE beslut på höstens siffror; rösten är Axels.
- [ ] 🌨️ **#45 Nederbördstypen — regn, snö eller slask?** (Bengts fråga 3/9: "hur mäter
  vi snö, snöslask etc som är lika riskabla?") 🔒 LÅST BAKOM RADARDOMEN 14/9.
  **Läget när kortet skrevs:** snö och slask PÅ vägen talas redan — men bara indirekt:
  (a) VViS-stationernas snow-flagga räknas som fukt i frysriskmotorn ("frysrisk framöver"),
  (b) väglagets operatörsklasser ("Snöigt", "Is och snö", "Slask") blir slippery_segment
  och rösten säger "halt väglag". Hålet är eftersläpningen (operatören måste hinna klassa)
  och att radarn — som ser nederbörd i realtid MELLAN stationerna — inte vet SORTEN.
  **Metoden (det som ska mätas, inte gissas):** sorten avgörs av temperaturen nederbörden
  faller genom. Standard: VÅTBULBSTEMPERATUR (luft + fuktighet, båda finns per station):
  ≳ +1,5 °C regn · ≲ 0 °C snö · DÄREMELLAN SLASK — farligaste zonen, vattenplaning och
  blivande is samtidigt. Klassningen = våtbulb per segment (offsetmodell + höjdkorrektion,
  höjden flyttar snögränsen — ankarbreddningens lapse 0,71°/100 m) × radarintensitet
  (radar_precip, redan per segment var 5:e min). ALLA ingredienser ligger redan i arkivet
  — detta är en beräkning, ingen ny källa.
  **Facit finns gratis:** SMHI:s stationer rapporterar observerad nederbördstyp, och
  väglagets operatörsklasser är andra domaren. Klassningen körs i skugga och döms mot
  båda innan något får synas — tröskeldokumentets princip, samma som allt annat.
  **Varför låst till 14/9:** typklassning ovanpå en radarkälla som inte bestått sitt
  eget kedjebevis vore våning två före grunden. Klarar radarn domen: bygg klassningen
  som skuggkolumn i radarspåret (litet steg). Faller radarn: kortet omprövas — våtbulben
   enbart kan fortfarande klassa nederbörd SOM STATIONERNA ser, men inte mellan dem.
  **BENGTS MATRIS (4/9) — kortets egentliga mål är ÖVERGÅNGARNA, inte vädertyperna:**
  vägytan är ett TILLSTÅND (torr → blöt → slask/modd → snöbelagd → packad snöväg) och
  nederbörden en ÖVERGÅNG ovanpå det. Farligast är korsningarna: SNÖ PÅ SNÖ (nysnö på
  packad bana) och framför allt REGN PÅ SNÖ (polerar snövägen till is — fönstret innan
  operatören klassat om är där varningen är värd mest). Klassningen ska därför korsas
  med segmentets NUVARANDE väglagsstate (finns i arkivet), inte bara klassa det som
  faller. VIKTIG PRINCIP: snöväg som VINTERBASELINE i norr larmar ALDRIG — TRV kodar
  packad snöväg som normalt vinterväglag, och en app som ropar halt nov–april i Norrland
  avinstalleras (H2/cry wolf). Värdet är AVVIKELSEN från segmentets säsongsbaseline,
  som nu är mätbar ur väglagshistoriken + segment_id-tidsserien (issue #4). OVERIFIERAT
  tills vintern: exakt hur norrlandsetiketterna faller ut i vår data — prövas mot
  arkivets första vintermånad innan någon regel fryses.
  🔓 **GRINDEN KOPPLAD 4/9 kväll** (Bengts fråga "hur gick det med vad som faller på vad"):
  kortet stod låst bakom radardomen 14/9 — men avläsningen den dagen var skriven för att
  lyfta tre frågor (#43, #42:s trigger, #42:s beslutsläge) och nämnde INTE #45. Kortet hade
  alltså blivit liggande låst utan att någon öppnat grinden. Avläsningen heter nu
  "Radardomen + #42-inkopplingen + #45-grinden" och bär #45 som fjärde fråga, med båda
  utfallen och snöbaseline-spärren inskrivna.
  📏 **MÄTT LÄGE I KODEN 4/9** (läst, inte antaget): motorn kan i dag inte skilja de här
  fallen åt alls. `icing_point` avgörs av `surfaceTempC <= tröskel && moisture === true`, och
  `moisture` är en hopslagen bit — `rain OR snow OR COALESCE(precipitation,'') <> ''`
  (publish/missar.ts). Regn på torrt, regn på snö och snö på snö ger alla samma `true`.
  Matrisens farligaste korsning är alltså osynlig för motorn i dag; det är exakt luckan
  kortet finns för att stänga.
  🛑 **INGREDIENSPÅSTÅENDET ÖVERDREV — rättat 4/9 kväll efter svep** (Bengts fråga om
  baseline och Norrland). Kortet ovan säger "ALLA ingredienser ligger redan i arkivet". Det
  stämmer inte, och tre saker fattas:
  (1) `weather_latest` — tabellen snapshoten byggs ur — bär VARKEN fuktighet ELLER daggpunkt
  (sql/001_init.sql: bara surface_temp_c, air_temp_c, precipitation, rain, snow). De finns
  bara i `weather_observations`, som är händelsefiltrerat (DECISIONS #4). Ingen tät serie.
  (2) HÖJD lagras inte alls — ingen höjdkolumn finns i sql/; scripts/hojd-prov.ts hämtar
  höjderna live från opentopodata vid varje körning. Lapse-korrektionen (0,0065) finns bara
  i det provskriptet, aldrig i ingest, publish, snapshot eller motor.
  (3) Ingen VÅTBULBSFORMEL finns någonstans i koden — ordet står bara i TAVLA och STATUS.
  DET SOM FAKTISKT FINNS per segment: radarns nederbördsintensitet (radar_precip, 2 km-sampling
  mot 818-skelettet). Halva metoden är alltså verklig; andra halvan är obyggd.
  🚨 OCH baseline-halvan står på #51: vinterarkivet som säsongsbaselinen ska räknas ur
  skrivs nästan inte. Kort #45 kan inte bli sant förrän #51 är löst — den kopplingen är ny
  och gjordes inte när kortet skrevs.
  🗺️ "NORRLAND" DEFINIERAS INTE, och ska inte göra det (svaret på Bengts fråga 4/9):
  produkten är helt regionblind — inga läns-, latitud-, zon- eller gränsbegrepp finns i
  motorn, snapshoten eller ingesten, i någon av de tre portarna. Repots enda Norrland är
  `new Set([21,22,23,24,25])` i TVÅ MÄTSKRIPT (scripts/ankaranalys.ts:13, scripts/frost-prov.ts:16),
  där det bara delar statistik i "Nationellt" / "Norrland" och aldrig rör larmlogik.
  Det är rätt: en geografisk gräns vore fel på tre sätt samtidigt — packad snöväg i Dalarna
  i mars är lika normal som i Norrbotten (gränsen måste flytta med årstiden), en bar blöt väg
  i Kiruna i november är en avvikelse VÄRD att varna för som en Norrlandsspärr hade tystat,
  och baseline skiftar inom samma län (kustens E4 plogas till barmark, inlandsvägen ligger
  snöpackad). Per segment löser alla tre utan att någon ritar en linje på kartan.
  **Rösten är ett SEPARAT beslut (Axels kolumn, som #32):** om "snöfall framöver" eller
  "slask på vägen" blir egna rösthändelser avgör Axel; tystnadsdisciplinen gäller —
  ett slask-larm som har fel är värre än inget. Prognos av KOMMANDE snöfall är #16,
  fortsatt medvetet parkerat. *(Bengt + Claude, terminalen 3–4/9)*
- [ ] **#32 Hindren in i rösten** — vi har aldrig skeppat annat än olyckor trots att
  DECISIONS #5 sade "olyckor + hinder". Kräver ny HazardKind + egen röstfras + Axels
  beslut om vad rösten säger. Bäst kandidat: **djur på vägbanan** (173 på en vecka, med
  RIKTIG position — vida bättre än polisens länscentrum som vi underkände i #13).
- [x] ~~**#31 Bevakning av Trafikverkets nyheter**~~ ✅ KLART 3/9 (Bengt + Claude, terminalen):
  KÄLLVAKT måndagar 06:40 (scripts/trv-bevakning.ts) över ALLA sju källor ur issue #2
  (Visualping-ersättaren): TRV bransch-RSS + portalens nyheter (CMS-GraphQL, 125 poster —
  där väglagskameror-25/8 låg) + driftinformationen (17 poster) + SMHI opendata (sitemap,
  238 sidor) + met.no + halkvarning + klimator (texthash, siffror strippade, instabil sida
  självdetekteras och jämförs inte). Nytt/ändrat = issue per källa (trv-nyhet, assignad
  Bengt); trasig källa = rött jobb. LARMVÄGEN BEVISAD 3/9 två gånger: testissues #35/#36
  + äkta brusfynd #37 som ledde till stabilitetskontrollen. Öppna API:ets egna utskick har
  ingen feed — täcks av Bengts medlemskap i Google-gruppen "Öppet API Trafikverket" (mejl per
  utskick). KVITTERAT 3/9: Bengt bekräftade alla tre notiserna (#35–#37) mottagna; issues stängda.
  Google-gruppen visade sig DÖD sedan 2014 (Bengts koll) — portalvakten täcker API-
  utskicken. Kortet HELT stängt: larmkedjan bevisad källa→issue→notis→mottagare.
- [ ] **Varvloggen ikapp:** STATUS.md:s sessionslogg slutar 2026-08-25 och "Current state"
  står kvar på 2026-08-24 — sex dygns arbete (Android-release, iOS-bygget, skuggflottan,
  Apple-kontot, uppladdningen) är bokfört i commits och på tavlan men inte i djuplagret.
  Bryter dokumentationsregeln. *(Delvis åtgärdad i detta varv — resten nästa.)*

### Claude — låst (väntar på nyckel)
- [ ] 🐕 **#87 Healthcheckens fem kontroller in i vakthunden — sedan läggs healthcheck.yml ner** (bron i
  kort #50, Bengt 9/9). 🔒 LÅST BAKOM 14/9 (radardomen först, kort #81:s ordning). Vakthunden i Supabase
  (varje timme, larmväg bevisad 9/9 med issue #91 öppnad OCH stängd) ser livekedjan och manifestet. Kvar i
  healthcheck.yml, som kostar 12 Actions-minuter/dygn på pulsen: (1) fi/dk/no-arkivens ålder (gräns 120 min),
  (2) gränsstationerna (FI ≥ 10, NO ≥ 20 nåbara), (3) kamerorna + road_conditions_arkiv (gräns 150 min),
  (4) arkivvakten (oarkiverade tillstånd > 3 h), (5) kartlagrens ålder (meta.json ≤ 90 min, kameror-vaglag
  ≤ 7 dygn). Alla är SQL eller en GET — inget kräver Actions. Bygg: fem rader i vakthund/index.ts med samma
  trösklar, bunta/deploya via deploy-supabase, larmprov, sedan pulsklockans AVVECKLA += puls-healthcheck
  och healthcheck.yml raderas (auto-close av incident-issues flyttar med). Verify: en vecka utan healthcheck-
  körningar där vakthunden larmat på ett framkallat fel i VARJE av de fem (?larmprov räcker inte — fem
  riktiga trösklar sänkta tillfälligt i ett prov). Sparar 12 min/dygn = 360 min/mån = hela oktoberpotten
  för iOS-vektorerna och Android-byggena.
- [ ] **#27 asc-CLI:t** — enkommandos-TestFlight + CI-hämtad testarfeedback.
  🔓 **Halvöppnad 31/8:** Apple-kontot finns. Kvarvarande nyckel = en ASC API-nyckel
  som Axel skapar i App Store Connect → Users and Access → Integrations. Säg till så
  skriver jag stegen.
- [ ] Butiksuppladdning + Data safety-inklistring *(låst: Play-kontot)*
- [x] ~~TestFlight-UPPLADDNING~~ ✅ KLART 31/8 — 0.3.0 (3) inne hos Apple.
  Kvar (Axels hand, inte låst): testarinbjudningarna, internt + externt
- [x] ~~Skarp support vid första Mac-bygget~~ ✅ KLART 29/8 — appen körde på Axels iPhone
  två dygn före schemat
- [ ] 🎨 **DESIGNLYFTET** — startar samma dag releasen är inne; byggs under 14-dagarstestet, rullas till testarna som v0.3.1:
  - [ ] **#24 Skinnet** (Claude Design: hemskärmens farokort, "senast sagt", typografin)
  - [ ] **#22 Bluetooth-autostart** (vakten startar när bilen kopplar)
  - [ ] **#23 Heads-up över Google Maps + "Testa rösten"** *(nyckel: releasen inskickad)*
- [ ] **#25 Halkbaneläget** *(låst: halkbanans avsiktsförklaring)*
- [ ] **#26 Skolpaketet** (QR-blad, manus, checklista) *(låst: trafikskolans avsiktsförklaring)*
- [ ] **#15 Kö-slutsmotorn** (TrafficFlow) *(låst: efter release — uppdatering 1)*
- [ ] **#16 Blixthalke-prognos** (MET Nowcast) *(låst: efter kö-slut — uppdatering 2)*
- [ ] 🌧️ **#42 Vattenplaningsvarningen** — ÄGARE: BENGT (issue #15, 1/9) — regnintensitet (VViS RainSum,
  ny ingestkolumn — vi lagrar idag bara regn ja/nej) × spårdjupslager (Trafikverkets
  vägytemätning via Lastkajen; licens/färskhet kollas först) × fartgrind ≥ ~70 km/h
  på enheten. Punktkälla ⇒ "framöver"-fras, aldrig avstånd. Ordning enligt huslagen:
  eget tröskeldokument FÖRE kod, sedan skugga — kan mätas i höstregn redan i september,
  behöver inte vänta på vintern. Facit: situation_archive (stoppade fordon/olyckor i
  regnväder). FÖRSTUDIE: docs/VATTENPLANING-ANALYS.md (1/9, granskning + körschema §7–8).
  ✅ **Steg 0a KLART 2/9** (Axels ja via Bengt): RainSum bevisad 89 % täckning FÖRE bygget
  (regn-bevis #1), rain_sum_mm + snow_wateq_mm i arkivet, slutbevis 658 stationer med
  mängd (regn-bevis #3). Facit tickar från nu.
  ✅ **Steg 0b KLAR 2/9, v2-dom** (cell-matning #2, 84 341 händelser, givarelösa
  uteslutna): artefakten bekräftad och borta — kurvan nu rent monoton 26 % (0–5 km)
  → 36 → 41 → 47 → 52 → 60 % (30–50 km). Redan vid 5–10 km är över en tredjedel av
  regnhändelserna enstations. DOMEN STÅR: stationstrigger ensam räcker inte —
  radarspåret valt (DECISIONS #60), stationerna blir kalibrering + fartgrind.
  📅 **EFTER RADARDOMEN 14/9** (Bengts order 4/9): fundera på att koppla in radar-
  spåret som #42:s trigger mellan stationerna — MED kalibreringsfaktorn från v3,
  inskrivet i TROSKLAR-VATTENPLANING (steg 2) före triggerkod. Före domen är det
  låst: cirkularitet (stationerna är radarns domare) + okalibrerad skala (kvot 0,39
  på tunt underlag). Faller domen väl ut är detta nästa steg; faller den illa
  omprövas hela triggerfrågan. Beslut: Bengt + Axel.
  🔨 **STEG 1 FÖRBEREDD 4/9** (Bengts order): scripts/lastkajen-rekognosering.ts +
  knappen lastkajen-rekognosering — REN LÄSNING som söker svar på körschemats fyra
  frågor (licens · format mot 818-skelettet · färskhet · kontokrav). Två spår:
  öppna API:et (kandidatobjekttyper — felmeddelandet är den ärligaste katalogen,
  RoadNumber-läxan) och Lastkajens egna ytor (katalog/swagger/licenstext). Laddar
  inget, skriver inget; en fallen kandidat är ett svar, bara total tystnad fäller
  jobbet. Det som kräver konto är Bengts handgrepp — kortet är hans.
  🔄 **OMTAG 4/9 (Bengts granskningsfråga → väg C, DECISIONS #65): spårdjupet
  blockerar inte längre.** Steg 1 mätte tillgång, inte nytta — ankarklippningens
  fälla. Men att skjuta spårdjupet vore värre: höstregnen är en engångschans i år
  (nästa hösten 2027). Nu parallellt: reconen = ren kunskap · ansökan startas om
  konto krävs (kalendertid löper gratis) · TROSKLAR-VATTENPLANING skrivs UTAN
  spårdjupströskel (ingen gissad tröskel) · skuggan börjar oavsett · hinner datan
  fram blir spårdjup ANALYSKOLUMN (nytt steg 4b), aldrig varningströskel förrän
  nyttan är mätt. Körschemat §8 omskrivet.
  ✅ **RECONEN KÖRD 4/9 (körning #1–2, DECISIONS #66) — svaret ändrar kortet:**
  spårdjup finns INTE i öppna API:et (PavementData 19 fält, RoadData 24 fält,
  inventerade namn för namn — noll rut/djup/IRI/textur/friktion). Lastkajen kräver
  konto (/api/Identity/Login → 405 på GET: finns, vill ha POST). MEN GRATIS PROXY
  HITTAD: RoadData bär **AADT + AADTHeavyVehicles** (tung trafik = spårens orsak),
  RoadWidth, BearingCapacity, WearLayer; PavementData bär PavementDate/-Type/
  Thickness — allt i vägnummer + löpande längd, samma referenssystem som våra 818
  segment. Steg 4b = TRAFIKPROXYN (byggs när skuggan står), mätt spårdjup flyttat
  till nytt steg 4c, villkorat. Räcker proxyn behövs Lastkajen aldrig.
  ⚠️ Mätt färskhetsvarning: beläggningsdatum 1967/1980/2013 i stickprovet — grov på
  småvägar, men Lastkajens egna mätningar har samma svaghet där. Redovisas i domen.
  📏 **STEG 2 UTKAST SKRIVET 4/9** (Bengts order): docs/TROSKLAR-VATTENPLANING.md —
  tre grindar (V-A påståendets bärkraft, mätbar NU; V-B skuggdriften; V-C domens
  giltighet med binomialbruset), asymmetrisk facittabell där "regn utan olycka"
  INTE är falsklarm (granskningens §7.3), vinterinteraktionen som Axel-beslut med
  rekommendation (halkan vinner alltid, vattenplaningen vilar ≤ +4 °C), radarns roll
  villkorad av domen 14/9, ingen spårdjupströskel (#65/#66). Regntröskeln i mm/h
  medvetet OSATT — den ska falla ur V-A:s mätning, inte gissas.
  ✅ **VÄRDENA FÄLLDA AV BENGT 4/9** ("låt värdena stå", DECISIONS #67): V-A 70 %/25 %
  inom 0–10 km · V-B 20 % falsklarm / 40 % miss / max 3 varningar per rutt och regndygn ·
  V-C ≥200 varningar, ≥15 facithändelser, ≥5 regndygn, ≥3 län. Regntröskeln i mm/h
  förblir osatt (ska falla ur V-A:s mätning) och radarn är villkorad av domen 14/9.
  ✅ **FASTSTÄLLT AV AXEL 4/9** (DECISIONS #68, relayerat av Bengt): värdena står,
  vinterinteraktionen avgjord — halkan vinner alltid, vattenplaningen vilar helt vid
  yttemp ≤ +4 °C (förvillkor i koden, inte prioritetsfråga i alarmkön ⇒ egen vektor).
  ✅ **STEG 3 BYGGT 4/9** (Bengts "bygg grinden"): publish/grind-v-a.ts + knappen
  grind-v-a, måndagar 07:20 sist i mätserien. LOO mot regnarkivet, stationen aldrig
  med i sin egen prognos. TRIPPELDELNING i stället för tvådelning: när grannarna säger
  "≥ T" är egen mätning TRÄFF (≥T), DELVIS (0<egen<T) eller FALSKLARM (=0) — att slå
  ihop delvis+falsklarm hade blåst upp falsklarmen, att slå ihop träff+delvis hade
  dolt dem. REGNTRÖSKELN SÄTTS INTE, DEN FALLER UT: 0,5/1/2/4/6/10 mm/h sveps och
  lägsta som klarar 70 %/25 % i bandet 0–10 km är svaret. Binomialbrus per andel (V-C3),
  domspärr < 200 fall, underlagsvakt. Självtest med känd sanning grönt: identiskt regn
  ⇒ 100 % träff / 0 % falsklarm, oberoende regn ⇒ 34 % / 66 %.
  ⚖️ **SKARP KÖRNING 4/9 — V-A FALLER, men läs kolumnerna (DECISIONS #69):** n=1 141 fall
  i 0–10 km, alltså riktig dom och inte "för tunt". FALSKLARMEN KLARAR V-A2 med marginal
  överallt (12/10/8/7/4 % för 0,5/1/2/4/6 mm/h). Det är TRÄFFEN som fäller: 61 % som bäst
  mot kravet 70 %. DELVIS-andelen är stor och växande (27→71 %): det regnade hos
  målstationen, men svagare än tröskeln. Träff+delvis = 88–94 %.
  ⇒ **Grannarna vet ATT det regnar, inte HUR MYCKET.** Intensitetströskeln bär inte —
  regnpåståendet gör det.
  🔑 **BESLUTSLÄGE (Bengt + Axel):** (a) dokumenterat nej, kortet stängs, regnarkivet
  behålls; (b) §5-ändring som omformulerar V-A1 mot "regnar det alls" + låter farten och
  platsfaktorn bära risken — kräver BÅDAS signaturer och en motivering som INTE lutar sig
  mot det här utfallet; (c) vänta på radardomen 14/9, som kan ge intensiteten mellan
  stationerna. Claude ändrar ingenting själv — att flytta målstolparna när siffrorna
  kommit är precis vad §5 förbjuder.
  ⚠️ Reservation: rain_sum_mm startade 2/9, så "30 dygn" är tre dygns septemberregn.
  Knappen går måndagar 07:20 och kurvan växer med höstregnen.
  ✅ **FACITET RÄDDAT 9/9 ~05:00 — ingest-live deployad av Axel (kort #84), bevis `vind 844 | regn 907 | alla 907`.** Luckan 5/9–9/9 är permanent och redovisas i grind V-A:s "30 dygn". Historik:
  ingest-live:s väder (#72) skrev arkivet UTAN rain_sum_mm/snow_wateq_mm/vind/sikt. Grind V-A,
  regn-tackning och hela facitet läser rain_sum_mm ⇒ tre dygns septemberregn omätta, och det
  hade fortsatt. Nu speglar ingest-live weather.ts fält för fält. 🔑 AXEL: deploya ingest-live,
  bevis = rader med rain_sum_mm senaste timmen vid regn. BESLUTSLÄGET (a/b/c) oförändrat.
  Grind V-A kräver Actions eller Axels lokala körning (`publish/grind-v-a.ts 30`).
  *(nyckel för röst: Axels ja — rösttext, plats i A-skalan, ordning mot #15/#16)*
- [ ] 🧭 **#81 Byggordning efter radardomen 14/9 — så byggs #42 utan att upprepa 5–8/9** (Bengts
  beställning 9/9 00:05). 🔒 LÅST BAKOM 14/9: faller domen illa gäller #42:s alternativ a/b i
  stället, och det här kortet stängs oanvänt. Faller den väl ut byggs det i DEN HÄR ordningen,
  och varje steg har sitt eget bevis innan nästa börjar.
  **SJU REGLER som var och en svarar mot ett fel vi redan betalat för:**
  (1) **Allt nytt bor i Supabase.** Actions är till för mätknappar, veckoprov och byggen — inte
  drift. Fem dygn utan data (5/9) och 2 000 minuter på grannländer (#53) är priset vi vet.
  (2) **En skrivare per fil, tabell och kursor.** Manifestet som inte stämde (#74) och
  kursorkrocken (#73a/#80) var båda två skrivare. Nytt fält = en ägare, namngiven i kortet.
  (3) **Deploy är inte klar förrän mätt EFTER deploy** — via deploy-supabase.yml när tokenen
  finns, aldrig "ligger på main". Tre fixar låg färdiga i timmar 8/9 med Axels terminal som
  enda väg.
  (4) **Bevisa på det led som faktiskt kan gå sönder.** "Filen är färsk på CDN" var inte
  "appen har den" (manifest-sha). Varje steg nedan anger vilket led som mäts.
  (5) **Vakthunden får en rad per nytt led INNAN ledet går skarpt.** En grön lampa på ett led
  ingen mäter är värre än ingen lampa (#76, #78).
  (6) **Tröskeldokumentet styr, aldrig koden.** Regntröskeln och kalibreringsfaktorn faller
  ur domen och V-A, skrivs in i TROSKLAR-VATTENPLANING §2 FÖRE kod, ändras bara med §5:s
  dubbelsignatur. Halkan vinner alltid (DECISIONS #68) — egen vektor.
  (7) **Silence is a feature.** Radarn får en givarvakt som stationerna (#75): täckningsmask,
  kalibreringsfaktor, ålder ≤ 70 min — utanför det är den tyst, inte "ungefär rätt".
  **STEGEN, i ordning, var och en med Verify:**
  · **A. Kalibreringen in i dokumentet.** Radar-mot-station-faktorn ur domens v3 skrivs in i
    TROSKLAR-VATTENPLANING steg 2 tillsammans med regntröskeln ur V-A (måndag 14/9). Ingen
    kod. Verify: PR med siffrorna, båda signaturerna, innan steg B öppnas.
  · **B. Datan — utan nya minuter.** radar_precip fylls redan en gång i timmen som ett steg i
    ingest-jobbet (ryms i timmens minut). Tätare kadens BARA om radar.ts bevisats köra under
    2 s CPU som edge function (h5wasm går i Deno, wall-clock är ofarlig, CPU:n omätt) — då
    flyttas den och kan gå var 5:e minut för noll minuter. Aldrig tätare i Actions: 12/h vore
    288 min/dygn, oktoberpotten på en vecka. Verify: `ms` och CPU i första edge-körningen, ELLER
    Actions-minuter per dygn oförändrade efter en vecka.
  · **C. Snapshoten — en skrivare.** publicera (snapshotkärnan) får `regn` mm/h per station
    (rain_sum_mm × 2) och per segment (radar_precip, ålder ≤ 70 min, faktor ur A, täcknings-
    mask). Ingen annan skriver fältet. Verify: test i snapshot-core.test.ts, manifest-sha
    stämmer i kartrepot, fältet syns i live.json — och vakthunden får raden "regn i snapshoten".
  · **D. Motorn — tre portar, en vektor per regel.** Ny hazard `aquaplaning`: segmentkälla
    (radar) får säga "på vägen framöver", punktkälla (station) bara "framöver". Grindar:
    fart ≥ 70 km/h på enheten, yttemp > +4 °C (halkan vinner, egen vektor), max 3 per rutt
    och regndygn (V-B). Plats i A-skalan = Axels ja. Verify: vektorerna gröna i TS, Kotlin och
    Swift (ios-engine + android gröna INNAN någon arkiverar — läxan 2/9).
  · **E. Skuggan i skuggmotorn (V-B).** Loggar vad rösten SKULLE sagt, rör ingen användare.
    Facit: situation_archive (skrivs av ingest-live, noll minuter). Veckorapport måndagar via
    grind-v-b-knappen (1–3 min/vecka) eller skuggrapporten i Supabase. Verify: V-B:s tal
    (≤ 20 % falsklarm, ≤ 40 % miss) över V-C:s underlag (≥ 200 varningar, ≥ 15 facit,
    ≥ 5 regndygn, ≥ 3 län). Inte förr.
  · **F. Rösten.** Bara efter V-C och Axels ja (rösttext, A-skalan, ordning mot #15/#16).
    PRODUKTBOK i samma commit. Verify: en rad i skuggloggen som blev ett riktigt larm, hörd
    i bil av Bengt.
  **KOSTNAD OM ORDNINGEN HÅLLS:** noll nya Actions-minuter i drift; 1–3 min/vecka för grinden.
  Det som kan kosta är bara steg B om radarn tätas i Actions — därför regel 1.

---

## 🟡 GÖRA (pågår just nu)


---

## 🟢 KLART (senaste vinsterna)

- [x] ✅ **#79 puls-regn-30 AVVECKLAD — KLART 9/9 10:47 (pulsklocka #11 skarp, DECISIONS #89):** Axels "i övrigt kör vi" + Bengts "kör". Överflödig sedan ingest-live deployades (rain_sum_mm varje minut; regn-30 kom bara in i restnischen, #44/#84). Bevisvakten: `avvecklat: puls-regn-30` … `OK puls-regn-30: borta`, 8 cron-jobb kvar, mallen bytt till puls-ingest-grannar FÖRE avvecklingen. −24 debiterade min/dygn. Sista kvittot: ingen regn-30-körning 11:41 (kvällsavläsningen).
- [x] ✅ **#84 ingest-live DEPLOYAD — KLART 9/9 ~05:00, BEVISAT av Axel** (rättelsen PR #76 / DECISIONS #79): SQL-beviset 30 min efter deploy: `vind 844 | regn 907 | sikt 844 | alla 907` (före: vind 0). rain_sum_mm, snö, vind och sikt landar i arkivet varje minut. Luckan 5/9 → 9/9 05:00 är permanent (Trafikverket ger bara senaste mätningen) och redovisas så i grind V-A. Regn-30 (#79) är därmed helt överflödig.
- [x] ✅ **#78 Deploy-knappen LEVER — KLART 9/9 05:20** (DECISIONS #78): SUPABASE_ACCESS_TOKEN i Secrets (Edge Functions: Write, inget annat), deploy-supabase #1 grön 05:20:51 med funktion=vakthund. Från och med nu är "väntar på Axels terminal" borta ur kedjan; en ändring under supabase/functions/ deployas av den som mergar, i samma varv, och beviset är fortfarande mätningen efter deployen (CLAUDE.md-läxan).
- [x] ✅ **#82 bridges.yml: cron bort — KLART 9/9 01:10** (PR #81, DECISIONS #85): mergad till main som d02294c, ci #464 grön 01:02, workflowen på main har bara knappen kvar (--force). 32 tomma schemakörningar à en minut är stoppade; slutbeviset (ingen körning 03:23, gamla schematiden) läses av morgonavläsningen 04:29. ✅ **SLUTBEVIS 9/9 04:30:** ingen schedule-körning 03:23 (gamla schematiden), #32 21:15 8/9 är fortfarande sista.
- [x] 🇳🇴 **NORGE I GRÄNSSNAPSHOTEN** (4/9 15:47, Bengt: "kör gränssnapshoten"): #49-mönstret
  som loop över fi + no i build-snapshot.ts — publicering #621 (e217891): "NO 42 stationer
  inom 40 km av svenska vägnätet (varav 0 kalla nu)", FI 16 som förut. En förare på E8/E10/
  E12/E14 matchas nu mot närmaste station oavsett land. Healthcheckgolv NO 20 (< 20 larmar).
  0 kalla i september är rätt — samma som FI och broarna. Ingen rösttext ändrad (punktkälla).
  DK MEDVETET UTANFÖR: dk.weather_latest bär GRÄSTEMP, inte vägyta (#45) — hade den legat i
  snapshoten hade appen sagt frysrisk på fel grund. In först när Vejdirektoratet svarar.
- [x] 🇳🇴 **NORGE TICKAR — no.weather fylls från Vegvesen DATEX** (4/9 15:24, Bengt +
  Claude, DECISIONS #64): parsern skriven mot MÄTT struktur (rekognosering #28), inte mot
  schemat; strukturvakt som dumpar XML och skriver inget om positionen saknas — den
  behövde aldrig larma (468/468 med koordinater). Puls 17,47 i pg_cron, healthcheckvakt
  på plats. Norden: SE + FI + NO med äkta vägyta, DK grästemp.
- [x] 📏 **TRÖSKELDOKUMENTET — mars-domens måttstock, skriven FÖRE all skuggkod** (1/9,
  Bengt + Claude, DECISIONS #52): docs/TROSKLAR-SKUGGAN.md med tre grindar (A offset-
  modellen, B skuggdriften, C domens giltighet) — #51:s hårda villkor uppfyllt, skugg-
  spårets steg 2–3 olåsta. Samma dag: grind A-mätningen byggd och automatisk varje söndag,
  larmvägen bevisad hela kedjan (avsiktligt rött jobb → mejl framme hos Bengt), rökprovet
  kört (felgradienten följer teorin), strategimejlet med länken hos Axel. Kvar hos Axel:
  fastställandet (eget kort under hans beslut).

- [x] ✅ **SJÄLVVÄCKNINGEN FUNGERAR I FÄLT** (31/8 15:51, Bengts telefon, första försöket):
  0.3.2 startade vakten själv utan att han rörde telefonen. DECISIONS #40 bevisat samma dag
  det byggdes. Kvar i morgon: rösten i CarPlay, bannern, självstoppet.
- [x] 🇩🇰 **DANSKA TESTBILARNA KÖR** (31/8 kväll): DMI + trafikkort, 20 rutter, cron, kartan.
  Grästemp som frysproxy — beslut till Axel (#45). Norge förberett, väntar på Vegvesen.
- [x] 🇫🇮 **FINSKA TESTBILARNA KÖR** (31/8 kväll): tre rutter var 30:e min mot finsk snapshot,
  SE/FI-växel på testbilarna.html. Bonusfynd: skuggmotorn körde gammal motor — nu buntad
  ur engine/src med CI-vakt (DECISIONS #43).
- [x] 🇫🇮 **FINSKT SKUGGARKIV LIVE** (31/8 kväll): schema fi, Fintraffic var 30:e min, 526
  stationer + trafikmeddelanden, isolerat från Sverige. Facit börjar tickas innan produkten finns.
- [x] 🚀 **0.3.2 (5) UPPLADDAT** (31/8 ~14:50) — hela dagens batch: olyckslyftet, heads-up,
  senast sagt, introduktionen, Siri, självstopp, självväckning + parkeringsstaket. Bengt
  testar ikväll med CarPlay (docs/TEST-BENGT-0.3.2.md). 0.3.1 (4) laddades upp strax före
  med samma kod minus självväckningen.

- [x] **#33 Arkivbordet LIVE** (31/8): situation_archive tar emot vinterfacit från båda
  ingestvägarna, missmätningen läser det, bruset utestängt, fött låst. Djur på vägbanan och
  stoppade fordon sparas från idag — #32 får underlag innan beslutet.

- [x] 🔒 **#30 RLS-LÅSET** (31/8, Bengts issue #3): anon-nyckeln kunde läsa 8 arkivtabeller
  och SKRIVA i dem (PATCH 204). Nu dubbellåst — RLS + REVOKE — på alla elva. Bevisat: 401
  överallt, väntelistan 201, pipelinen grön. DECISIONS #32.
- [x] **Gravstensläckan tätad + städad** (31/8): raderingar är UPDATE, aldrig INSERT, i båda
  ingestvägarna; edge-funktionen deployad; 4 587 gravstenar exporterade och raderade.
  Tabellen: 308 rader, alla olyckor.
- [x] **#28 tröskeln avgjord: 5** (31/8) — tvåsteget bara vid "Mycket stor påverkan".
  v17 bevisar att 4 är lindrig. DECISIONS #30a.

- [x] **Kronjuvelerna säkrade** (31/8): ny upload-nyckel i Lagerlöf Labs namn, lösenord i Apples Lösenord-app, jks i iCloud Drive/Halkvakt-nycklar, CI-secrets roterade
- [x] 🚀 **HALKVAKT 0.3.0 (3) UPPLADDAT TILL APP STORE CONNECT** (mån 31/8 ~10:10) — 90 min från
  kontoköp till inlämnat bygge. Varv som krävdes: team-cache (omstart), version 1.0→0.3.0
  (plist-koppling), iPad-orienteringar (iPhone-only). Nästa: Apples behandling → TestFlight.
- [x] **APPLE DEVELOPER KÖPT** (mån 31/8 09:37, 999 kr, order W1845082767) — via WEBBEN
  (appen krävde körkort; webbvägen ställde ingen ID-fråga = läxa för nästa app).
  AKTIVERAT 09:55 (18 min efter köpet — webbvägen levererar). Förberett: iOS-appikon (spegel av Android), export­-
  compliance-nyckel, TestFlight-guide i MAC-GUIDE. Utgivarnamn BESLUTAT: Lagerlöf Labs (DECISIONS #29).
- [x] **BENGT UPPKOPPLAD** (30/8, live under pappasamtalet): Claude-appen installerad på
  Axelstar-kontot (All repositories ⇒ täcker även framtida repon), Bengts GitHub-koppling
  omkopplad, läs-testet mot docs/VALKOMMEN-BENGT.md godkänt. 404-gåtan stängd —
  projektet har nu två uppkopplade Lagerlöfar.
- [x] **SKUGGFLOTTAN 20 BILAR + RAPPORTSIDAN** (Axels idé 29/8): skuggmotorn utökad 3→20 rutter
  över hela Sverige (E4 i sex etapper, E6, E10 Kiruna, E14 fjället, E18, Rv40, Rv70), rotation
  3 rutter/varv (CPU-taket), fotobudget 5/varv. Publik rapportsida visar allt bilarna "hört":
  https://axelstar.github.io/halkvakt-karta/testbilarna.html — Norrlandsbilen larmade
  på första varvet (E4 Umeå→Luleå, 2 varningar)
- [x] 🏆 **HALKVAKT KÖR PÅ iOS** — första Mac-bygget genomfört lördag 29/8 18:04, två dygn före schemat: Xcode 26.1-verkstad från noll, EN byggfix (Swift-typning), appen live på Axels iPhone med färsk snapshot ("väglag 17:37" = åldersvakten + pulsklockan i drift). Kvar till måndag: bara konton + TestFlight
- [x] **macOS 15.7.9 installerat** på Axels MacBook Air (skärmbildskvitto 29/8 17:00) — Xcode 26.1-vägen öppen
- [x] **Pipelinen räddad** — GitHub-cron svälte publiceringen (5 h-stopp, 13 h-hål uppmätta); Supabase-pulsklockan trycker nu på dispatch-knapparna (*/30 + timvis). Vilt VERIFIERAT live på CDN (2 st i wildlife-arrayen)
- [x] **Healthcheckens koppel lagat** — larmade rätt men `| tee` åt exit-koden; pipefail på ⇒ rött jobb ⇒ mejl. Läxa: prova larmvägen, inte bara vakten
- [x] **📖 PRODUKTBOKEN** (`docs/PRODUKTBOK.md`) — produkten genom användarens ögon: skärmbilder, exakta röstfraser, två flödesdiagram; levande dokument med egen regel i protokollet
- [x] **#19 Missmätningsskriptet** — arkivhändelser × rekonstruerade hazards × riktiga motorn; träffar/missar per vecka; augustikörning verifierad (0 händelser = rent); knapp: Actions → "missar"
- [x] **#20 Skuggmotorn LIVE** — var 30:e min: motorn körs mot tre Skånerutter, loggar till shadow_log, arkiverar väglagskamerabild vid varning (facit-hinken). Provkört: 1 955 fixar E22, ärlig augustinolla
- [x] **#17 Vilt in i snapshoten** — polisen_events (48 h, med position) → wildlife-array → alla tre parsrar; TS-prov + bakåtkompatibilitet; motorbeteendet var redan vektorbevisat (v13)
- [x] **Bengts granskning II bokförd** — arkivlagret = repots styrka; prognosfrihet nu dokumenterat val (#25); kamerafacit+skuggmotor = #20; retention löses löftesrent via Play-statistiken
- [x] **Tavelregeln** inristad i CLAUDE.md — varje varv slutar med tavelsynk
- [x] **Bengt fullt ombord** — konto `895845` bekräftat i praktiken: committar dokument, granskar kod på radnivå (åldersvakts-fyndet!)
- [x] **Åldersvakten** (Bengts granskning): appen läser generated_at, filtrerar gammalt väglag, säger till EN gång — Android + iOS + prov
- [x] **docs/SYSTEM.md** — systembeskrivningen med "vad systemet inte gör" + månadsdisciplin

- [x] **Android-appen tekniskt släppfärdig** — v0.3.0, signerad AAB 2,55 MB byggs i CI varje push
- [x] **iOS-appen skriven** — SwiftUI-spegel av Android, väntar på första Mac-bygget
- [x] Butiksmaterial klart: texter, feature graphic, ikon, skärmdumpar (fotostudion)
- [x] Data safety-svaren förskrivna (`docs/PLAY-DATASAFETY.md`)
- [x] Integritetspolicyn live + länkad överallt
- [x] Signeringsnyckeln skapad, krypterad i CI + Axels kopia levererad
- [x] Pappa collaborator med Write + välkomstdokument
- [x] Pappas synergianalys bokförd + **beslut: v1 lanseras utan datainsamling** — sensortrappan = strategi, inte MVP (Axel 28/8)
- [x] Kö-slut beslutad som uppdatering 1 (TrafficFlow verifierad 43 s färsk)
- [x] Mobilvideo 720p-fixen på sajten
- [x] Presskit + livemotor härdad + webbåldersvakt

---

*Djupare detaljer: BACKLOG.md (teknisk kö) · STATUS.md (varvlogg) · DECISIONS.md (vägval).
Tavlan är människornas lager ovanpå dem.*

