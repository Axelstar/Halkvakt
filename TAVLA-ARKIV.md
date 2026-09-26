# TAVLA-ARKIV.md — stängda kort ur tavlans öppna sektioner

*Flyttade 26/9 2026 (kort #221 steg 1, DECISIONS #371): 122 kort med `- [x]` som stod kvar bland de öppna. Ordagrant, under den rubrik de stod under och i samma ordning. Tavlans 🟢 KLART-sektion står kvar i `TAVLA.md`.*

### Beslutsgången

- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — **Ge Bengt egna händer i koden** — `docs/BENGT-CLAUDE-KODEN.md`: Claude Pro + Claude
  Desktop mot Halkvakt-mappen, ingen terminal. Axel: skrivrättigheter till repot.
  Löser roten till 31/8 — han kan köra sina egna analyser i stället för att beskriva dem.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** 491 commits från Bengt sedan 27/8; han pushar till main och kör Claude mot Halkvakt-mappen — det `docs/BENGT-CLAUDE-KODEN.md` beställde.


### AXELS NÄSTA STEG — i den här ordningen (uppdaterad 8/9 kväll)

- [x] ~~1. Bevisa vakthunden~~ ✅ GJORT 8/9 — pg_cron kört 18:07/19:07/20:07, alla succeeded.
  MEN fyndet: larmvägen var trasig (#78b). Beviset att klistra till Bengt står i DECISIONS #78b.
- [x] ~~2. PAT:en behöver `Issues: Write`~~ ✅ BEVISAT 9/9 10:58 — larmprovet (dbknapp #2: vakthundens eget
  cron-kommando med ?larmprov=1) skapade issue #91 "🔴 Vakthunden: kedjan är bruten" med etiketten vakthund,
  10:58:40. Larmvägen fungerar; issuen ska stängas av nästa gröna timkörning (11:07). Axels "full behörighet"
  stämmer.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #308) — **3. Skärmklipp av Billing till Bengt** — du har redan bilden (2000/2000 min, reset om
  23 dagar ⇒ 1/10, spending limit noll). Vidarebefordra den bara.
  ✅ **Stängt 22/9 (DECISIONS #308, Bengt: *"den har vi koll på genom mätning"*):** kassavakten (#152, vakthundens check 8) räknar Actions-förbrukningen fyra gånger om dygnet och larmar före taket; bevakningen till 1/10 bärs av #152 och §0b-raden *Actions-taket i september*. Ingen Billing-avläsning behövs.
- [x] ~~4. Supabase-token som `SUPABASE_ACCESS_TOKEN` i GitHub Secrets~~ ✅ GJORT 9/9 05:20 (Axel,
  DECISIONS #86) — tokenen är projekt-scopad till Halkvakt med ENDAST Edge Functions: Write (Axels val:
  en deploy-nyckel ska inte kunna röra databas eller nycklar). Bevis: deploy-supabase #1 grön 05:20:51,
  funktion=vakthund, "Deployed Functions: vakthund". Bengt och Claude kan deploya själva nu.
  ⚠️ Går ut ~8/12, mitt i vintern — Axel lägger påminnelse, tavlan bär datumet i kort #86.
- [x] ~~5. TestFlight-gruppen: lägg 0.3.5 (8)~~ **STÄNGT 20/9 SOM ÖVERSPELAT** (Bengts order efter genomlysningen,
  DECISIONS #250): main bär 0.3.8 (11) sedan 18/9, och byggordning C (#242) säger ETT bygge med #203.
  Ersatt av: simulatorprovet nu, och arkiveringen av 0.3.8 senast 27/9.
- [x] ↪ **SAMMANSLAGET 22/9** i *Tolv testare till Play-perioden* (DECISIONS #303) — 6. Tolv testare till väntelistan (fortfarande det som avgör vintern)
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** samma tolv testare; Googles krav är tolv Android-testare i 14 löpande dygn (DECISIONS #271). Det som återstår bärs av *Tolv testare till Play-perioden*.
- [x] ~~7. Google Play-konto~~ ✅ **SKAPAT OCH BETALT 20/9 18:51 (Axel)** — **Lagerlöf Labs**, personligt konto,
  konto-id `7591030412981889366`. Samma utgivarnamn som i App Store Connect, alltså en säljare och inte två.
  ⛔ **MEN KONTOT ÄR INTE FÄRDIGT, och den tredje raden är en RIKTIG GRIND:** Play Console kräver tre verifieringar —
  (a) **identiteten** med officiellt ID-dokument (*"kan ta några dagar"*), (b) **åtkomst till en fysisk
  Android-enhet**, bevisad genom inloggning i Play Console-mobilappen, (c) **kontakttelefonnumret**, som kräver att
  (a) är klar först.
  ✅ **(b) LÖST 20/9 kväll — Axel: *"vi har en Android som vi kan använda"*.** Den 26 dygn gamla öppna frågan från
  DECISIONS #16 är besvarad utan kostnad. **Gör det nu, två minuter:** installera **Google Play Console**-appen på den
  telefonen, logga in med samma Google-konto som äger utvecklarkontot — då bockar verifieringen av sig själv.
  **Och telefonen är värd mer än den bocken:** det är första gången Android-appen kan köras på hårdvara. Debug-APK:n
  finns redan som artefakt i varje `android`-körning (`halkvakt-debug-apk`), så den är en nedladdning bort.
  *Historik — varför raden fanns:* frågan stod öppen sedan 25/8 (DECISIONS #16: *"Axels enda telefon är en iPhone …
  fysisk Android-testenhet = öppen fråga (pappa? begagnad?)"*, rekommendation begagnad Samsung Galaxy A 800–1 500 kr).
  **Google har nu gjort den till ett krav, inte en bekvämlighet:** utan en riktig Android-telefon går kontot inte att
  slutföra, och då kan ingenting publiceras — hur färdig appen än är. Det är den billigaste grinden i hela kedjan och
  den blockerar alla andra.
  ➕ **Samma fråga, större:** de tolv testarna i Googles slutna test måste ha **Android**-telefoner, och Android-appen
  har aldrig körts på hårdvara (CI kör emulator; 0.3.1 versionCode 4 mot iOS 0.3.8). Väntelistans tolv (kort 6) är
  hittills inte sorterade på plattform.
  ⏱️ **Ledtiderna staplas:** ID-verifiering några dagar + telefon som ska skaffas + tolv testare × 14 löpande dygn.
  Det är kedjan som styr novemberdatumet, inte bygget.
  📄 **UNDERLAG SKRIVET 20/9 — allt läst på Googles egna sidor samma dag, inte ur minnet** (Bengts order,
  DECISIONS #268): `docs/PLAY-KONTO.md`.
  🎯 **FYNDET SOM LÄTTAR, inte tynger:** Google kräver sedan 13/11 2023 att personliga konton kör ett slutet test med
  **tolv testare löpande i 14 dygn** före produktion — men kravet låser bara *Produktion* och *Förhandsregistrering*.
  **Slutet test kan startas så snart appen är konfigurerad.** Novemberbetan ÄR det slutna testet, och S5:s tolv
  testare är samma tolv Google räknar. Kontot blockerar alltså inte betan — det sätter en klocka: publik release
  tidigast fjorton löpande dygn efter att de tolv är på plats.
  ⚖️ **VALET SOM MÅSTE GÖRAS FÖRE REGISTRERINGEN — kontotypen väljs en gång:**
  · **Personligt:** direkt, ingen ledtid. Kräver tolv testare × 14 dygn före produktion. Visar en PRIVATPERSONS
    juridiska namn och land på Google Play.
  · **Organisation:** inget testkrav, men kräver **DUNS-nummer — upp till 30 dagar** — plus organisationens namn,
    adress, telefon och **webbplats**. Föreningen finns inte än (Skyltfondspaketets obesvarade fråga), och 30 dagar
    från i dag är 20 oktober, tio dagar före betan.
  **Rekommendation: personligt konto nu.** Migrering till organisation senare är en öppen fråga jag INTE verifierat —
  behandla den som okänd, inte som given.
  💰 Avgiften är **25 USD en gång**, kredit- eller bankkort (läst på Googles sida 20/9).
  ⛔ **FÖRE FÖRSTA UPPLADDNINGEN, inte före registreringen:** #214 Data Safety-deklarationen är osann sedan 16/9 —
  en felaktig deklaration är grund för avslag mitt i facitfönstret. Och jks-filen ska ligga i iCloud INNAN första
  uppladdningen: efter den är nyckeln bunden hos Google (CLAUDE.md).
  🔑 **VÄNTAR PÅ ER:** vem äger kontot, och vilken typ. Frågan står i bedömningen §4.2.
  Verify: konto registrerat, avgift betald, identitet verifierad — och ett internt test med en AAB ur CI som når en
  telefon utanför projektet.

- [x] ~~#79 regn-30: mät innan den väcks~~ **STÄNGT 20/9 SOM ÖVERSPELAT** (DECISIONS #250): jobbet AVVECKLADES 9/9
  (pulsklocka #11, `avvecklat: puls-regn-30`) och finns inte i pulsklockans lista över elva jobb. Kontrollerat 20/9.
  Frågan om att väcka det är därmed inte ett väntande beslut utan ett nytt kort den dag någon vill ha det.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — Publikt repo eller köpa minuter — appen behöver inte längre svaret (#72), ta det lugnt.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** minuterna köptes 8/9: DECISIONS #82 (35 USD/mån, Axels beslut), 29 minuter efter att kortraden skrevs.
- [x] ~~Gallringsregel för weather_observations före vintern~~ **STÄNGT 20/9 SOM ÖVERSPELAT** (DECISIONS #250):
  `gallra_vader` (sql/014) och `gallra_arkiv` (sql/026) är i drift sedan 17/9 — 97 472 rader raderade i första
  körningen. Det som faktiskt återstår är Pro-beslutet, och det bor i kort #83. Texten nedan är historik.
  ~~— ~40 000 rader/dygn när alla 845~~
  stationer ligger under 5 °C fyller gratisnivån på ~2 månader. Får inte kasta det Grind A mäter.
  ⚠️ RÄKNAT OM 8/9 22:00 (Bengts Claude, ur vader.geojson): 809 av 848 stationer mäter på
  10-minutersslag, och livemotorn läser varje minut ⇒ **~120 000 rader/dygn**, inte 40 000
  (den siffran är GitHub-ingestens 2×/h). 500 MB räcker då **~3 veckor**, inte 2 månader.
  Gallringen måste finnas FÖRE första kalla veckan, inte "före vintern". Alternativ som inte
  kastar Grind A:s underlag: spara var 30:e minut i arkivet men behåll varje minut i
  weather_latest — det är exakt den upplösning GitHub-ingesten hade när Grind A byggdes.



### Axel — beslut att ta

- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 💸 **#85 Actions-takten spränger 35 USD-gränsen före 1/10 — tre snitt räcker** (mätt 9/9
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
  📏 **KVÄLLSAVLÄSNING 9/9 17:32 (fönster 04:31→17:32, 13,0 h): 60 körningar, 84 debiterade min ⇒ 155
  min/dygn** (morgonens baslinje 240). Fördelning: grannar 13 × = 31 (5 av dem på gamla koden à 6 min,
  8 nya à 1), ingest 14, healthcheck 11, ci 7, regn-30 7 (t.o.m. 10:41, sedan borta), publish-map 5
  (t.o.m. 07:11, sedan borta), pulsklocka 4, dbknapp 2, deploy 1, regn-tackning 1, marknadsforing 1.
  Fönstret bär alltså fortfarande de tre avvecklade posterna. STEADY STATE från 11:09: grannar 24 +
  ingest 24 + healthcheck 12 = **~60 min/dygn ⇒ 0,48 USD/dygn ⇒ ~10 USD till 1/10.** Morgonavläsningen
  10/9 räknar ett rent dygn.
  ✅ **RENT DYGN MÄTT 10/9 04:31 (fönster 9/9 17:32 → 10/9 04:31, 11,0 h): 30 körningar, 36 debiterade
  min ⇒ 79 min/dygn ⇒ 0,63 USD/dygn ⇒ ~13 USD till 1/10.** Bara tre workflows kvar i drift: grannar 11 × 1
  (snitt 53 s), ingest 11 × 1 (30 s), healthcheck 8 × 1–2 (6 på pulsen + 2 gånger GitHub-cronen som
  fortfarande fyrar ibland, additivt). Noll röda. Från 240 till 79 på ett dygn; gränsen 35 USD hålls med
  marginal, oktoberpotten räcker.
   📊 **KVÄLL 10/9 17:32 (fönster 04:31 → 17:32, 13,0 h): 37 körningar, 52 debiterade min ⇒ 96 min/dygn**
   (väntat 70–80). Två orsaker: grannar 13 × 52–101 s ⇒ 22 min (9 av 13 över 60 s debiteras som 2; 44 s
   bevisat 9/9, nu 57–101 s), healthcheck 9 × ⇒ 15 min (6 på pulsen + 3 på GitHub-cronen, se #50), ingest
   13 × 1 = 13. Noll röda. ~0,77 USD/dygn ⇒ ~16 USD till 1/10 — gränsen 35 håller. Två snitt kvar: cron-raden
   i healthcheck.yml (−7 min/dygn) och grannar tillbaka under 60 s (−9 min/dygn; mät var sekunderna går).
   🌙 **NATT 10/9 17:32 → 11/9 04:31 (11,0 h): 33 körningar, 43 min ⇒ 94 min/dygn.** Grannar 11 × 43–64 s
   ⇒ 16 min (5 av 11 över 60 s); healthcheck 8 × 59–69 s ⇒ 13 min (6 puls + 2 cron); ingest 11 × 25–36 s
   ⇒ 11; ci 2 + kodgrinden 1 (PR #104). Noll röda. VAR GRANNAR-SEKUNDERNA GÅR (jobb 04:24, 54 s): uppstart
   6 s · npm ci 1 s · FI 8 s · DK 19 s · NO 10 s · fi/dk-publicering 6 s · avslut 4 s. DK är dubbelt mot 9/9
   (13 s) och avgör om körningen landar över eller under 60 s. Dygnssnitt 10/9: (52+43) min / 24 h ≈ 95.
   🚨 **TAKTEN HAR TREDUBBLATS — mätt 12/9 18:51 (avläsningen låg nere ett dygn, se STATUS).**
   Fönster 11/9 16:25 → 12/9 18:51 (26,5 h): **200 körningar, 223 debiterade min ⇒ 202 min/dygn**
   (1,62 USD/dygn). Senaste 10 h: 100 körningar, 108 min ⇒ **261 min/dygn** (2,08 USD/dygn).
   VAD SOM KOSTAR: **ci 92 körningar / 94 min** — 44 push + 47 PR över 91 unika commits, alltså
   ~2 min per ändring (PR + merge; ingen dubbeldebitering på samma sha). Drift är oförändrad:
   grannar 26 × (34 min), healthcheck 20 × (32), ingest 26 × (26). Grindarna/knapparna 18 min totalt.
   **PROJEKTION till 1/10 (19 dygn): 31 USD vid 202 min/dygn, 40 USD vid 261** — ovanpå det som
   redan är förbrukat i september. Taket 35 USD har HÅRT STOPP (Axels inställning): slår det i
   stannar grannar/ingest/healthcheck som 5/9. Livemotorn i Supabase påverkas inte.
   🔑 BENGTS BESLUT, tre spakar (jag bygger inget): (1) `[skip ci]` på rena tavel-/dokumentcommits
   — de flesta av dygnets 91 ändringar rör inte kod; (2) bygg färre och större PR:er; (3) höj taket.
   Röda i fönstret: ci 3 (14:28–14:31), grind-r-a 1, grannar 1 (11:24, nästa timme grön igen),
   smhi-forstarkaren-steg0 1. Grannar 26 körningar 42–98 s, 8 över 60 s.
  🔴 **RÄTTAT TAL 13/9 02:08, uppmätt av kassavakten (#152) över HELA månaden i stället för ett fönster:**
  3 761 min sedan 1/9, 2 798 körningar ⇒ **311 min/dygn**, debiterat 14,09 av 35 USD, **prognos 59 USD**
  och taket slår i **21 september**. Mina tidigare tal (202 min/dygn, 31–40 USD till 1/10) kom ur ett
  26,5-timmarsfönster som råkade vara lugnare än snittet. Gränsen hålls alltså INTE i dagens takt.
  ⚖️ Spakarna står kvar och är nu mer brådskande: paths-ignore i ci.yml (~20 min/dygn), cron-raden i
  healthcheck.yml (~6 min/dygn), färre och större PR:er (~40 min/dygn), eller höjt tak. De tre första
  räcker inte till 311 — höjt tak eller väsentligt färre byggen är det som avgör.
  🌅 **MORGONAVLÄSNING 13/9 04:31.** Mitt eget tal från i natt (311 min/dygn, taket 21/9) var FEL
  ANVÄNT: 311 är månadssnittet, som svarar på "vad har vi förbrukat" och inte på "när tar det slut".
  Parallellsessionen fångade det och gav kassavakten en SLÄPANDE takt (kort #160) ⇒ **169 min/dygn,
  taket slår i 28 september.** Min egen fönstermätning 12/9 18:51 → 13/9 04:31 (9,7 h): 57 körningar,
  76 min ⇒ **189 min/dygn**, i samma härad. Månad-till-datum står kvar som förbrukningstal.
  ci är nu nere på **21 %** av minuterna (16 av 76) mot 42 % i går — paths-ignore biter.
  Fördelning: ingest 20 min, ci 16, healthcheck 13, grannar 12, dbknapp 7, deploy 5, cellmätning 2,
  grind-v-a 1. En röd: ci 03:51 på grenen steg-c-radar-i-snapshoten, grön när den mergades 03:55.
  🌆 **KVÄLL 13/9 17:30 — nu läst ur kassavaktens EGNA tal, inte handräknat.** Hon har kört 05, 11
  och 17 UTC som schemat säger. Vid 17:08: **3 904 min sedan 1/9 över 2 902 körningar**, debiterat
  1 904 min = **15,23 av 35 USD**. Takt **307 min/dygn månad-till-datum** och **169 släpande**,
  takdatum **28 september**. Issue #210 står öppen, vilket är rätt: prognosen når fortfarande taket.
  Hennes egen "takten ändras"-varning går, eftersom de två takterna skiljer mer än 25 % — marken
  under datumet rör sig, och det säger hon själv i larmet.
  🌅 MORGON 14/9 ur kassavaktens egen rad 05:08: **3 976 min sedan 1/9 över 2 968 körningar**,
  debiterat 1 976 min. Släpande takt **200 min/dygn** (upp från 169), månadssnitt 301, och takdatumet
  har flyttats fram två dygn till **26 september**. Issue #210 står kvar öppen. Takterna divergerar
  fortfarande, så hennes egen varning om gungande mark går.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** alla tre snitten i drift (DECISIONS #88, #89); Verify ≤ 100 min/dygn nådd 10/9 (79 min/dygn). Kassabevakningen till 1/10 bärs av #152 (prognos 31 av 35 USD 20/9). Sagt högt: den släpande takten var 118 min/dygn 19/9 — över kortets mål, under taket.
- [x] ~~Fastställ trösklarna för skuggan~~ ✅ FASTSTÄLLT 2/9 (DECISIONS #61): Axels
  "kör" relayerat av Bengt i chatten, värdena oförändrade från Bengts 1/9-version inkl.
  §2-orsaksklassningen. Kvitto: huvudet i docs/TROSKLAR-SKUGGAN.md. Bocken här är
  kontrasigneringen. Från första skuggkörningen gäller §5: ändring kräver båda.
- [x] 🔑 ~~Fastställ TROSKLAR-VATTENPLANING~~ ✅ FASTSTÄLLT 4/9 (DECISIONS #68): Axels
  ja relayerat av Bengt, värdena oförändrade från #67. Vinterinteraktionen avgjord enligt
  rekommendationen — HALKAN VINNER ALLTID, vattenplaningen vilar helt vid yttemp ≤ +4 °C
  och ligger under halkan i A-skalan. Bocken här är kontrasigneringen; vill du ändå
  justera går det fram till första skuggkörningen, sedan gäller §5 (båda signerar).
- [x] ↪ **SAMMANSLAGET 22/9** i *Skyltfonden-paketet före 1/10* (DECISIONS #303) — **Helgsamtalet med pappa — nu fyra punkter:** roller (B2B=Bengt?), föreningen, klartecken ringrundan, OCH intäktsmodellen (#27: din viljeinriktning → hans utformning)
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** samma frågor: sökande, roller och ringrundan (ringrundan håller Bengt, #215). Det som återstår bärs av *Skyltfonden-paketet före 1/10*.
- [x] ✅ **STÄNGT 24/9** (DECISIONS #345) — **Skyltfonden-paketet (före 1/10):** (a) klartecken till pappas ringrunda (startar v.36!), (b) sökande: pappa privat eller ideell förening?, (c) rollfördelningen — allt hänger ihop. Underlag: `docs/FINANSIERING.md`
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** #27 *Helgsamtalet* och *Rollfördelningen*. Kortet stängs när Axels val av sökande och besked om rollerna (DECISIONS #25e) står i DECISIONS, intäktsmodellen ur #27 är avgjord och PLAN.md är uppdaterad.
  ✅ **Stängt 24/9 (DECISIONS #345, Bengt: *"vi har koll på dessa på annat sätt"*):** följs utanför tavlan. Underlaget står kvar i `docs/FINANSIERING.md`.
- [x] ↪ **SAMMANSLAGET 22/9** i *Skyltfonden-paketet före 1/10* (DECISIONS #303) — **Rollfördelningen**: efterfrågan/affärsmodell/B2B = Bengts ansvar? (hans förslag; vid ja uppdateras PLAN)
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** rollfördelningen (DECISIONS #25e) avgörs i samma besked. Det som återstår bärs av *Skyltfonden-paketet före 1/10*.

- [x] ✅ **STÄNGT 22/9** (DECISIONS #312) — 🏷️ **#204 SKOLANS NAMN PÅ QR-SIDAN — synlig attribution på webben, inte banner i appen — ✅ BESLUTAT 19/9, förberett, byggs när bladet byggs** (Bengts idé 19/9:
  *"Halkvakt via Mårtenssons trafikskola … indirekt reklam för den som företag — tror du på det eller är det lull lull?"*).
  **Kärnan håller, formen inte.** Att skolan syns som den som gav eleven appen är den billigaste valutan vi har och precis
  det en trafikskola vill ha. Men en banner i appen ger skolan lite (eleven är redan deras kund), bryter mot *tyst app
  utan reklam*, och går inte att bygga ärligt: iPhone ger appen ingen uppgift om vilken länk installationen kom från
  (Android har Play Install Referrer, iOS saknar motsvarighet), och att märka en användare med "kom via skola X" är
  data om användaren som löftet *vi samlar in: ingenting* inte täcker.
  **Den starka versionen ligger på webben (halkvakt-karta, Pages):** (1) **en QR-sida per skola** — bladet med skolans
  namn pekar på `…/via/martenssons`: *"Välkommen från Mårtenssons Trafikskola"* + butiksknapparna; (2) **en räknare per
  sida** (ett besök, inte en person — inga uppgifter om vem) så att skolan får ett tal: *"143 av era elever hämtade
  appen"*; (3) **partnerlistan** på startsidan: *"Trafikskolor som är med"*; (4) **ett märke till skolans egna kanaler**:
  *Testpartner till Halkvakt* för deras hemsida och Instagram — det är där reklamen för skolan faktiskt syns; (5) i
  appen bara Om-sidans rad *Testpartner: …*, gemensam för alla, ingen per-skola-märkning.
  Ger oss det vi behöver till skolpaketet i vår: vilka skolor som faktiskt delar ut bladet. Kostnad: en statisk sida +
  en liten räknarfunktion, ~1 h; byggs när bladet byggs (appen i butikerna), inte före. Inget lovas i septembersamtalen
  utöver "bladet med ert namn på".
  Skiss (19/9): `docs/skisser/qr-sida-per-skola.svg` — bladet, sidan, listan och märket, och kedjan QR → räknare → sida →
  butik. Siffrorna offentliggörs inte: skolan får dem i ett mejl varje månad.
  Verify: en skolas QR-sida visar skolans namn, räknaren stiger vid besök, och ingen uppgift om besökaren sparas.
  📄 **FÖRBERETT 19/9 (Bengts ja, DECISIONS #241): `docs/QR-SIDA-PER-SKOLA.md`** — delarna (register, sida, räknare,
  månadsmejl, lista, märke, blad, Om-raden), kedjan, integriteten, det som måste finnas före tryck (domänen först — en
  tryckt QR-kod går inte att ändra), Axels sju beslut, kostnad ~1 h, bevis. VÄNTAR: Axels bedömning av formen; bygget
  när appen finns i butikerna.
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är Axels bedömning av formen (§6 i `docs/QR-SIDA-PER-SKOLA.md`) och domänen före tryck.
  ✅ **Stängt 22/9 (DECISIONS #312, Bengt: *vårfråga*):** QR-sidan hör till skolpaketet och står i bedömningens rad *Efter mars*. Underlaget ligger kvar i `docs/QR-SIDA-PER-SKOLA.md` med Axels sju beslut (§6), och domänen måste fortfarande finnas före tryck (kortet *Skydda namnet*).

- [x] ✅ **STÄNGT 22/9** (DECISIONS #307) — 🔤 **#156 HALKORDEN FINNS I TRE OLIKA VERSIONER — upptäckt 14/9 av en ny kontraktsgrind**
  ✅ **VÅR HALVA ÅTGÄRDAD 14/9** (Bengts order, DECISIONS #174). Fyra frågor ⇒ **fyra namngivna
  kontrakt**, vart och ett med sitt eget `varfor`, så att skillnaderna står som BESLUT i stället
  för som slarv — precis vad grindens egen feltext föreskriver.
  · *Snapshotens halkfilter* (snapshot-core + publiceras bunt, golv 2)
  · *Vinterorden i vakthunden* (två kopior i samma fil, rad 137 och 148, golv 2)
  · *Farlighetsorden i kodgrinden* (två kopior i samma fil, rad 198 och 201, golv 2)
  · *Halkorden i motorn* (engine.ts + skuggmotorns bunt + tystnadsfelet, golv 3)
  🔧 **GRINDEN FICK ETT NYTT FÄLT, `filer`,** för utan det gick frågorna inte att skilja: raderna
  ser likadana ut och ett gemensamt kontrakt hade tvingat fram falsk enighet mellan fyra frågor
  som SKA skilja sig. Mutationsprov: vakthundens ena kopia driven ⇒ exit 1, kodgrindens ⇒ exit 1.
  🚫 **INGEN ORDLISTA ÄNDRAD, ingen funktion deployad.** Dubbleringen inom vakthunden och
  kodgrinden är nu VAKTAD i stället för bortstädad — en deploy av vakthunden för en ren
  refaktorering vore risk utan vinst (jfr #126b, då en deploy tyst tog bort check 7).
  ⏭️ **KVAR OCH BARA AXELS:** ska `mycket besvärligt` in i snapshotens filter, så att snapshoten
  blir ett superset av motorn? Underlaget ligger i `docs/TILL-AXEL-HALKORDEN.md`.
  🔬 **MÄTT 14/9 (DECISIONS #172): ⊘ KAN INTE AVGÖRAS PÅ DATA.** "mycket besvärligt" vid kod < 2:
  **0** i arkivet och **0** live. "snö" vid kod 1: **0** och **0**. Skälet är att inget vinterord
  någonsin förekommit — hela materialet är kod 1 med Torrt (799), Våt (25), fläckvis Våt (8),
  fläckvis Torrt (6). Arkivet börjar 21/2, efter förra vinterns slut.
  ⚖️ **Skillnaden är alltså utan verkan I DAG — men inte ofarlig:** den blir verksam i samma stund
  operatören klassar om i vinter. Beslutet måste fattas på semantik, eller skjutas till vintern
  med en omkörning inbokad. Ingen lista rörd.
  **Fyndet:** listan över vilka ConditionInfo-ord som betyder HALT finns på **nio ställen i sju
  filer**, med **tre olika värden**. Ingen hade någonsin jämförts mot en annan.
  · `is|snö|halka|frost|mycket besvärligt` — **motorn** (engine.ts:43) och skuggmotorn
  · `is|snö|halka|frost` — **snapshoten** (publish/snapshot-core.ts:102), **publicera**, **vakthunden** (×2)
  · `is|halka|frost|mycket besvärligt` — **kodgrinden** (×2), utan "snö"
  ⚖️ **DET KAN VARA TRE OLIKA FRÅGOR, inte en lista på drift** — och det är därför kortet ställs i
  stället för att jag rättar: snapshotens rad är en ELLER-gren ovanpå `condition_code >= 2`, så
  "mycket besvärligt" kan komma in den vägen ändå. Kodgrindens saknade "snö" kan vara medvetet:
  packad snö vid kod 1 är normalt vinterväglag i norr, inte en avvikelse.
  ❓ **MEN INGEN VET, för ingen har mätt det.** Frågan som avgör: finns det segment med "mycket
  besvärligt" och kod < 2, och segment med "snö" vid kod 1? Det är en läsande fråga till arkivet.
  ⚠️ **RÖRS INTE AV MIG:** en ändring i snapshoten ändrar vad appen varnar för, alltså Axels märke
  och produktboksregeln. Den nya grinden vaktar tills vidare bara motorns egen lista (motor +
  skuggmotor + tystnadsfelet, tre filer, samma värde).
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är Axels rad: är #214:s *"med flit"* hans svar? (§4.2)
  ✅ **Stängt 22/9 (DECISIONS #307, Bengts beslut i Axels ställe: alternativ b):** snapshotens filter bär nu *mycket besvärligt* (PR #484, 0bb2ae3) och är ett superset av motorns ord. Enhetsprovet kräver det (motprov: ordet bort ⇒ provet faller), integrationsprovet mot PostGIS släpper in *Mycket besvärligt* och *Halkigt* vid kod 1 och håller *fläckvis Våt* och *Halkbekämpning* ute. publicera deployad 15:38Z från main; första live.json efter deployen 15:40:01Z med manifestets sha lika med filens. I dag 0 halksegment alls (september), så ändringen syns först i vinter. Vakthundens och kodgrindens listor ställer andra frågor och är orörda.


### Axel — hösten (brainstorm 31/8)

- [x] ⛔ **#92 Däcktyp och fordonstyp — STÄNGT 12/9, dokumenterat nej** (Bengts order när §2.5 togs ur
  systemanalysen, DECISIONS #108). Idén är inte fel — den är rätt formulerad som **lager
  2-riskmodifierare** i OVERGANGAR-ANALYS §1b.2, och där står den kvar som begrepp. Men den kräver
  tröskeljustering i FLERA tröskeldokument med dubbla signaturer, vektorer i tre portar och nya
  PRODUKTBOK-bilder, och den bär ingen egen fara. Den konkurrerar alltså om samma kvällar som
  trenden, som har naturens deadline. Öppnas igen om Axel vill ha den, inte förr. Ursprunglig text:** (ur Claudes systemanalys 10/9,
  Bengts "gör kort för allt"). Motorn vet fart och riktning men inget om däck eller fordon: sommardäck
  vid +3 °C är halare än dubbdäck vid −5, och släp/lastbil ändrar vad sidvind och vattenplaning betyder.
  En engångsinställning (sommar/dubbfritt/dubb · personbil/släp/husbil/lastbil) som flyttar trösklarna
  LOKALT — aldrig skickad någonstans, integritetslöftet orört. Kräver: tröskeljustering per däcktyp
  i tröskeldokumenten (§5, båda signerar), vektorer i tre portar, PRODUKTBOK. Verify: v-vektor där samma
  trace ger varning med sommardäck och tystnad med dubb; texten säger inte "däck" utan bara varnar.
- [x] ✅ **STÄNGT 25/9, ÖPPNAS VÅREN 2027** (DECISIONS #354) — **Betalvilja mäts i mars, inte gissas i augusti:** en fråga i appen ("N varningar i
  vinter — skulle du betala X för nästa?"). Ja/nej, inget insamlat utom räkningen. Vinterpass
  per säsong är kandidatmodellen; B2B (hemtjänst, försäkring, åkerier) är taket.
  ✅ **Stängt 25/9 (DECISIONS #354, Bengt):** öppnas våren 2027, står i vårlistan bredvid intäktsmodellen. Frågan i appen ändrar invarianten; ska den ställas i mars 2027 ligger beslutet och bygget i februari.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #309) — **Norden efter facit:** Finland LIVE i arkivet (31/8). Norge sedan, Danmark sist.
  Tidigast vintern 2027/28 som produkt. Nordiskt namn vid det laget (Nordic RoadSafe, #1).
  ✅ **Stängt 22/9 (DECISIONS #309, Bengts ja):** dubblett. Arkivdelen är mer än klar — Finland, Norge och Danmark i arkivet, Norge i skuggflottan och grannsnapshoten i Supabase sedan 22/9 (DECISIONS #301). Produktdelen står som Ä7 i bedömningen (*Nordenprodukten efter release*).
- [x] **Vegvesen DATEX-konto — STÄNGT 20/9** (DECISIONS #250): tillståndet beviljades 4/9 och det norska arkivet
  tickar (ingest-no #29, 468 stationer, puls-ingest-no i pg_cron, gränssnapshoten 4/9 15:47). Kortet stod öppet
  i sexton dygn med sitt eget klarbesked i brödtexten. ~~TILLSTÅNDET BEVILJAT 4/9 (Bengt): användarnamn~~
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
- [x] ✅ **STÄNGT 22/9** (DECISIONS #314) — ↩︎ **Live Activity — varningskortet i Dynamic Island och på låsskärmen** (Axel 31/8: "ska den
  ligga över Maps?"). Ingen app får rita över en annan; Live Activity är det Apple tillåter:
  gul rad "Vakten på · 42 min" under körning, blossar upp "▲ Halt väglag · 2,0 km" när rösten
  talar, synlig över kartan och på låst skärm. Bannern (#23) kvar som textvariant. DECISIONS #38.
  ✅ **Stängt 22/9 (DECISIONS #314, Bengts beslut):** inte byggt (ingen ActivityKit i ios/), och produktboken lovar det inte. Designen ligger kvar i `docs/design/Halkvakt-Live-Activity.dc.html` om det tas upp igen.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #314) — ↩︎ **Startknapp på låsskärmen + i Kontrollcenter + åtgärdsknappen** — widget (iOS 17),
  Control (iOS 18), och en rad i guiden om Åtgärdsknapp → Genväg → Starta vakten (iPhone 15
  Pro+). Ett tryck, ingen Genvägar. DECISIONS #39.
  ✅ **Stängt 22/9 (DECISIONS #314, Bengts beslut):** inte byggt (ingen WidgetKit/ControlWidget i ios/). Självväckningen och Siri startar vakten redan (DECISIONS #38/#40), och produktboken lovar ingen startknapp. Beställningen står kvar i DECISIONS #38/#39(3).
- [x] ✅ **STÄNGT 22/9** (DECISIONS #309) — ↩︎ **Guiden med bilder + film** — skärmbild per steg (ringad knapp) inbakade i appen;
  15 s film per spår på kartsajten. Råmaterial: Axels inspelningar 31/8 (Inte alls), Bengt
  filmar CarPlay-spåret.
  ✅ **Stängt 22/9 (DECISIONS #309, Bengts ja):** struket. Sedan DECISIONS #38/#40 är Siri och självväckningen huvudvägen och Genvägar valfritt, så guidens bilder och filmer bär inte längre startvägen. Råmaterialet (Axels inspelningar 31/8) ligger kvar om behovet kommer tillbaka.

### Axel — därefter

- [x] ↪ **SAMMANSLAGET 22/9** i *Skydda namnet: PRV + domänen halkvakt.se* (DECISIONS #303) — Domänen halkvakt.se (vilande beslut)
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** samma domän; QR-sidan (#204) väntar på den, så den är inte längre vilande. Det som återstår bärs av *Skydda namnet: PRV + domänen halkvakt.se*.
- [x] ↪ **HOPSLAGET I #219 24/9** (DECISIONS #346) — Fysisk Android-testenhet (pappas telefon? begagnad?)
  📖 **KONTROLLERAT MOT GOOGLES EGEN SIDA 20/9** (Bengts fråga; DECISIONS #279). Kravet finns, ordagrant:
  *"Från och med början av 2024 måste utvecklare med nya personliga konton verifiera att de har åtkomst till en
  riktig mobil Android-enhet via Play Console-appen innan de kan göra appen tillgänglig på Google Play."*
  (support.google.com/googleplay/android-developer/answer/14316361)
  ✅ **MEN NI BEHÖVER INTE KÖPA NÅGON.** Samma sidas FAQ: *"Du kan använda alla fysiska mobila Android-enheter som
  inte är rotade och kör operativsystemet Android 10 eller senare"* — och på frågan om man måste behålla enheten:
  *"Nej. Vi kan be dig om verifiering i framtiden, men du behöver inte använda samma enhet."*
  **Ett lån räcker.** Vem som helst med en Android 10+ som inte är rotad: skanna QR-koden i Play Console, installera
  Play Console-appen, logga in som kontoägare, tryck Verifiera. Telefonen lämnas tillbaka efteråt.
  ⚠️ **Rättelse av DECISIONS #271:** rekommendationen *begagnad Samsung för 800–1 500 kr* behövs INTE för
  verifieringen. En egen testtelefon är fortfarande bra för fälttest och för att köra appen — men den är då en
  BEKVÄMLIGHET igen, inte publiceringsgrinden. Grinden kostar ett telefonsamtal, inte tusen kronor.
  ❓ **OKLART OCH INTE PÅSTÅTT:** Googles formulering är *"göra appen tillgänglig på Google Play"*. Om ett SLUTET
  TEST räknas dit går inte att avgöra ur texten. Testsidan säger att slutet test kan startas *"när du är klar med
  konfigureringen av appen"*, vilket talar för att betan inte blockeras — men det är en slutsats, inte ett citat.
  🔒 **Det som ÄR klarlagt:** utvecklarens telefonnummer kan inte verifieras förrän identitet OCH enhetsverifiering
  är klara (samma hjälpcenter, *Verifiera uppgifter för utvecklaridentitet*). Enhetsverifieringen ligger alltså i
  vägen för kontots färdigställande oavsett hur betan klassas.
  ⚠️ **RÄTTELSE 21/9 (DECISIONS #280): lånet behövs inte heller.** Raderna ovan skrevs utan att läsa #271 till slut —
  där står Axels *"vi har en Android som vi kan använda"*, och #272 beskriver appen uppsatt på den 20/9 kväll.
  Telefonen finns alltså redan. Kvar är bara inloggningen i Play Console-appen på den.
  Verify: uppgiften *Kontrollera att du har åtkomst till en mobil Android-enhet* försvinner från Play Consoles
  startsida.
  📖 **LÄST IGEN 22/9 (Bengts fråga: gäller det i testfasen?):** stegen börjar på **webben** — Play Console som kontots ägare, startsidan, uppgiften *Kontrollera att du har åtkomst till en mobil Android-enhet*, QR-koden, Play Console-appen på telefonen, Verifiera. Under en minut; telefonens nummer samlas inte in. Testsidan (answer 14151465) säger att *internt test* kan startas innan appen är färdigkonfigurerad och *slutet test* när den är det — ingen av sidorna säger att testerna kräver enhetsverifieringen. Sidan *Verifiera uppgifter för utvecklaridentitet* (answer 10841920) säger ordagrant att kontaktnumret inte kan verifieras förrän identiteten och *enhetsverifiering (för enskilda konton)* är klara. **Alltså:** gör den när uppgiften syns på startsidan; syns den inte finns inget att göra än.
  ↪ **Hopslaget i #219 24/9 (DECISIONS #346, Bengts ja):** telefonen finns (Axels Android, appen uppsatt 20/9, DECISIONS #280). Kvar är bara enhetsverifieringen i Play Console; den och Verify-raden står nu i #219.


### Bengt

- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🚗 **#229 NIRA — DATAN BAKOM GÖTEBORGS NEJ** (Göteborgs svar 21/9, DECISIONS #281). Göteborg köper friktionsdata
  från bilar av **NIRA Dynamics** (Linköping) och får inte dela den: datan är Niras, inte stadens. Nira säljer dessutom
  en färdig tjänst för halkvarningar till bilar och appar, **Road Surface Alerts** (läst på
  niradynamics.com/products/road-surface-alerts 21/9): *"Slippery road: Detects low-friction surfaces using real-time
  vehicle data"* och *"Each alert is based on measured data"* — mätningar, inte prognoser, kartmatchade och möjliga att
  hämta via API. Riktad till biltillverkare, underleverantörer och fordonsflottor; priset är inte publikt ("premium").
  **Samma slutsats som källkartläggningen 26/8 punkt 10** (*"enda vägen att på sikt täcka blindpunkterna med faktiska
  mätdata"*) — som aldrig fick något kort. Nu har den ett.
  ⚠️ **Oläst på källan:** kartläggningens *gratis utvärderingskonto på roads.niradynamics.se* — adressen gick inte att
  öppna 21/9. Det som går att läsa är RSA-sidans formulär för **exempeldata och produktguide** (namn, e-post, företag;
  filerna visas som länkar direkt efter att formuläret skickats — inte med e-post, rättat 21/9) och ett kontaktformulär.
  **Steg 1, gratis:** Bengt hämtar exempeldatan och produktguiden i formuläret *Download sample data & our Product Guide*
  på RSA-sidan och lägger filerna på Skrivbordet. Claude läser dem mot tre frågor: hur tät är datan i stan, hur färsk,
  och håller den för regel T (ett vittne på platsen, inte en modell)?
  📍 **Bättre exempeldata för oss (kontrollerat 21/9):** formuläret *Download sample data* på sidan Winter Road Insights
  (niradynamics.com/products/winter-road-insights) ger tre filer från Stockholm 15/1 2024 — friktion, torkarhastighet och
  lufttemperatur. Friktionen svarar på täthet och färskhet; torkarna är ett regnvittne; lufttemperaturen visar att bilarna
  mäter luften, inte vägytan (enligt filnamnet). RSA-formuläret ger en dags halkvarningar (28/1 2024), ojämnheter i
  Göteborg och produktguiden. Fälten: förnamn, efternamn, e-post, företag; rutan om utskick är frivillig.
  **Steg 2, beslut — bara om steg 1 håller:** fråga Nira om villkor för en liten svensk betatjänst. Varje betalväg kräver
  en DECISIONS-post som Axel godkänner.
  ⏸️ **BEDÖMNING 21/9 (DECISIONS #295): skicka INTE följdfrågan nu.** Den är besvarad av stadens egen slutrapport (InfraSweden
  2025, s. 8): *"tre egna väderstationer som var utplacerade på väderkritiska platser"*, därtill IoT-stationer som ligger i
  Klimators system (RSI). Tre punkter ändrar inte täckningen, datan sitter sannolikt i samma avtal, vi har inga testare i
  Göteborg, och Skyltfondsparterna finns i Skåne. Petri är rätt person att återkomma till EFTER domarna, med något att visa —
  staden har drivit just den sortens innovationsprojekt. Valfritt nu: två rader tack, utan fråga. Utkastet nedan står kvar
  som historik.
  **Göteborg, följdfrågan:** fråga 2 om egna vägväderstationer på gatunätet blev obesvarad — egna mätningar vore stadens,
  inte Niras. Utkast (Bengt skickar, svara alla — Evelyn fanns med):
  > Hej Petri,
  > Tack för ett snabbt och tydligt svar – det hjälper oss mycket att veta att friktionsdatan kommer från Nira och att
  > prognoserna går via Klimator och SMHI.
  > En följdfråga: har staden egna vägväderstationer eller yttemperaturgivare på gatunätet, utöver Trafikverkets?
  > Mätningar som staden själv äger skulle kunna vara en annan väg än den avtalsbundna datan. Om förutsättningarna
  > ändras framöver hör vi gärna från er.
  > Med vänlig hälsning, Bengt Lagerlöf, Halkvakt
  Verify: exempeldatan läst, med svar på de tre frågorna i bedömningen §4.2 · Göteborgs svar på fråga 2 inskrivet på kort #93.
  📖 **UTREDNINGEN 21/9** (Bengts fråga *konkurrent eller partner?*; `docs/NIRA-UTREDNING-2026-09-21.md`, DECISIONS #282).
  **Hypotesen stämmer för första bilen och de glesa vägarna — inte för Nira som företag.** Nira ägs av Volkswagenkoncernen
  och har redan prognosdelen: Klimator sedan 2018 (*"detaljerade prognoser av halka på vägavsnitt"*) och Vaisala sedan 2024.
  Halkvakt är inte ensamt om att se före — Klimators halkprognos på Expressen visar åtta timmar framåt. Nischen som återstår:
  gratis, röst under körning, utlöst av mätning, minuter till timmar före — **obevisad till domarna i januari och mars**.
  Förhållandet är skevt: Halkvakt behöver Nira (facit, vittne på platsen mellan stationerna, tystnad på saltad väg, gatorna)
  mer än Nira behöver Halkvakt.
  ➡️ **Steg 2 ändrat:** ingen förfrågan om partnerskap före beviset. Efter domarna (februari–mars): ett konkret förslag —
  Niras friktionsdata som facit, gärna som innovationsprojekt med en väghållare. Krav i varje samtal: alla varningar som fil
  (positionen lämnar inte telefonen), det mätta skilt från det modellerade (regel T), licens för appen, Axels ja till varje krona.
  ✅ **STEG 1 KLART 21/9 — exempeldatan läst** (`scripts/matningar/nira-exempeldata-2026-09-21.py`, utredningen §11,
  DECISIONS #283; filerna ligger kvar hos Bengt, inte i repot). Stockholm 15/1 2024: **408 km väg med friktion inom 8 km från
  Sergels torg, där Halkvakt har 7 stationer** — men **natten är tunn**: klockan 05 hade 2–9 % av vägavsnitten ett värde från
  senaste timmen, och klockan 02–03 fick under 1 % av avsnitten något värde alls. **Värden förs vidare utan ålder:** 22–56 % av
  friktionsvärdena ligger där ingen bil rapporterade samma tio minuter (en bil inom 30 min före i 80–89 %). Lufttemperaturen
  är luftens, med +29,5 °C en januaridag. Händelsestyrt eller inte: provet kan inte avgöra. Vägklass 5 saknas helt.
  **Nytt krav till Nira:** varje värde med tiden för den senaste mätningen under det (regel T1/T4).
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** exempeldatan läst (DECISIONS #283, `scripts/matningar/nira-exempeldata-2026-09-21.py`), Göteborgs fråga 2 besvarad ur stadens slutrapport (DECISIONS #295). Steg 2 (facitförslag till Nira februari–mars) bor kvar i bedömningens §4.2 Nira-rad.

- [x] 📐 **#197 GREPP 2: TROSKLAR-KOMBINATIONEN — ✅ KLART 17/9: C, D och T fastställda (DECISIONS #220/#225/#226)** (Bengts "kör grepp 2" 16/9,
  DECISIONS #217, bedömningens S10). UTKAST i `docs/TROSKLAR-KOMBINATIONEN.md`. **C:** KB-A bär varje del sin roll · KB-B
  räddar mer än den kostar (efterhalkan: Ö-B 5 %/25 %) · KB-C giltighet (Ö-C + T-C) · KB-D förarfacit. **D:** sju regler —
  kärnan är kalibrering och dom på skilda nätter, för efterhalkans rutnät är 1 296 punkter. **T:** Axels lydelse +
  vittneskrav; §6.4 måste besvaras: är det en uppmjukning av FRYSKLASSNINGEN §7? VÄNTAR: Bengt fastställer C, D ·
  Bengt + Axel avgör T · förslagen KB-D4, kalibrering 1/2, kamerabilden (premiss ja, utfall nej). **I samma commit som
  fastställandet:** D-raden i varje tröskeldokuments ändringsparagraf, T i FRYSKLASSNINGEN §1/§7. Före första frostnatten.
  ⚠️ **RÄTTAT SAMMA VARV:** varianterna "skuggas" inte redan — de spelas upp ur S1:s logg, och den bär bara **48 av 1 296**
  punkter (minsta regn bara > 0, ingen radar-r, startband bara till +3 °C). Beslut före frosten: vidga loggen eller stryk punkterna.
  📏 **MÄTT 16/9 (DECISIONS #218):** utan radarn försvinner högst ~13 % av blöta kalla timmar (15 av 115), ingen för att mätare
  saknas — alla 160 kalla stationer har mätare. Stryk-rekommendationen står; mät om i första frostmånaden (snö).
  ✏️ **AXELS LÄSNING 16/9 → SEX ÄNDRINGAR (DECISIONS #219).** Bengt: 1 248 punkter strukna (radarn inräknad), radarmätningen
  om vid frost. Flytt i tid räknas som tillägg bara utan undanträngda varningar i `suppressed`. VÄNTAR: §6.4 (Bengt + Axel) ·
  utfallet i januari (förslag: betan fortsätter vid OAVGJORT) · D2-principen för startvärden (S3) · fastställandet.
  ✅ **T FASTSTÄLLD 16/9 (DECISIONS #220)** — Axels lydelse, tätad: T1 per tillstånd · T5 interpolation förbjuden, #153
  beslut 2 utan egen öppning · T6 prognoser utlöser aldrig ensamma. Införd i FRYSKLASSNINGEN §1/§7; skyddet följer med.
  ✅ **STARTVÄRDEN SKRIVNA 16/9 (DECISIONS #222):** N 2 h · fall ≥ 0,8 °C på 30 min · regn > 0 · yta +1…+3 °C · radar
  och N_varning av. **VÄNTAR NU:** Axel läser tätningarna · utfallet i januari · fastställandet av C och D (med D-raden
  i varje tröskeldokument).
  📡 **RADARN STRYKS INTE (Bengt 17/9, DECISIONS #223):** betan och kalibreringen utan radar; radarn prövas i mars ur
  radararkivet (gallras aldrig, 4,4 MB). Regnmängden går också att räkna fram ur arkivet — funktionsprov på 5
  station-ögonblick. **VÄNTAR:** Bengt om regnmängden ska tillbaka på samma sätt · kopplingen station↔väg (förslag
  5 km) före frosten · arkiven kvar till mars (grepp 3).
  🧪 **STARTBAND OCH SMHI-FÖRLÄNGNING PRÖVADE 17/9 (DECISIONS #224):** startbandet går att räkna ur trend-tabellen (gallras
  inte); SMHI-förlängningen går att koppla men arkivet har inga vintervarningar än. **Alla sex inställningar går nu att
  räkna ur arkivet** — kvar som skäl för 48 är Axels ärlighetsargument. **VÄNTAR:** Bengt om strukna inställningar prövas
  i mars · Bengt + Axel om uppspelningen räknas ur loggen eller arkivet.
  ✅ **BENGTS JA 17/9 (DECISIONS #225):** startvärden · 5 km · strukna inställningar som varianter i mars · interpolations-
  idén utan öppning · förslagen i C och D. **VÄNTAR:** Axels kontrasignatur på C och D + utfallet i januari · Bengt + Axel
  om uppspelningens källa.
  ✅ **FASTSTÄLLT 17/9 — Axel kontrasignerade (DECISIONS #226):** C och D i kraft, D-raden i tio tröskeldokument,
  uppspelningen ur arkiven med skuggloggen som kontroll. Uppföljningen — radarmätning vid frost, provkörning före januari,
  arkiven till mars — står i bedömningen §0b.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🧩 **#159 INTEGRATIONSKARTAN — tre av våra egna regler står i vägen för produkten**
  📬 **AXELS FYRA INVÄNDNINGAR INARBETADE 14/9 (DECISIONS #184, kartans nya §13).** Han läste ett
  TIDIGT underlag, där grind A-rättelsen inte fanns. **Tre står, en föll på underlaget.**
  🎯 **1. Allvar som FÖRSPRÅNG, inte ord — han har RÄTT, och det är inget förslag utan ett FATTAT
  BESLUT kartan missade:** #90 roll B och SMHI-förstärkarens E1 säger redan *"modifieraren förlänger
  försprånget, den höjer inte prioriteten"*. Kartan skrev **"L5 finns inte"** — fel, rättat.
  💰 **FÖLJD HAN INTE SJÄLV NÄMNER: #153 faller från F5 till F4** — 23 vektorer och tre portar blir
  högst 6. Spannet finns: `leadM` 400–3 000 m = **16–120 s vid 90 km/h, faktor 7,5**. Alltså en
  REGELÄNDRING i stället för en arkitekturändring — den här vintern i stället för nästa.
  🚨 **2. Hans tröskelregel är bättre än min — MEN SAKNAR VITTNE.** "Måste kunna motbevisas av en
  mätning": hans två vittnen är operatörens "Våt" (**33 rader, noll klassade**) och kameran
  (**kamerafacit: 0 objekt / 5 657 körningar**). **#157 blir därmed BÄRANDE för hans egen punkt 4.**
  ❌ **3. "Grind A föll den 12:e" är FALSKT** — den domen är körningen före vakterna. Med båda: MAE
  **0,85** / **5,1 %** / **0,3 %** = ingen dom. Felet är underlagets, inte Axels. **Men ramkritiken ger
  jag:** PRODUKTBOK.md:108 säger ordagrant det han citerar — kartan mätte mot ett löfte ingen gett.
  ✅ **4. En sak till rösten i vinter — vi konvergerar.** Hans "en sak" är F1+F3+F4 på `icing_point`,
  ingen F5, grind `v11_silent_drive`, sekvens enligt §5.5.
  ⚖️ **DÄR JAG ÄR OÄNSE: E kan inte vänta**, av hans eget skäl — blir allvar TID behövs ett GRADERAT
  mått för att sätta tiden. Det avslöjade också ett tankefel i kartans eget §7.5, nu rättat.
  ❓ **ÖPPET FÖR BENGT+AXEL:** omformulera #153 till försprång? · skriv om tröskelregeln? · bygg E före
  vintern? · begränsa vinterns röstleverans till Axels "en sak"? Jag rekommenderar **ja på alla fyra**.
  🔎 **§5.6 TILLAGD 14/9 (DECISIONS #183)** på Bengts kontrollfråga *"är detta inarbetat i kartan"*.
  Sju av sju avvikelser fanns där — men **förbehållen stod bara i chatten**, och ett av dem dölde ett
  för starkt påstående: vektortalen **6/3/23 är ett TAK** (vektorer som BÄR faran), inte en uppmätt
  kostnad. Det enda som gör dem till kostnader är att köra dem — §5.5 steg 3.
  ⚠️ **§5.3:s premiss kan falla:** "F1 är gratis" vilar på att båda portarna läser snapshoten OTYPAT.
  Byts en port till typad avkodning slutar ett nytt fält vara ofarligt.
  🔧 **MOTORN OCH FOGARNA INARBETADE 14/9 (DECISIONS #182)** på Bengts fråga om kartan tar hänsyn
  till det som FAKTISKT kör. Svaret var nej — kartan var skriven från skuggans sida. Ny §4 (motorn
  som den ser ut, läst ur koden) och §5 (fogarna).
  🔓 **MOTORN HAR EXAKT FEM FOGAR:** F1 `live.json` (**0 vektorer, 0 portar**) · F2 adaptern · F3
  `meta` · F4 villkoret (**6 is / 3 segment**) · F5 prioritet+röst (**23 = alla**). Nio av tio
  skuggdelar greppar ADDITIVT; bara #153 kostar F5.
  🚨 **FOGEN LÄCKER REDAN:** `segments[].regn` (radarns mm/h, #81 C) publiceras i varje `live.json`
  men finns inte i `LiveDoc` — **radarlagret ligger redan i telefonen och kastas vid adaptern**. Samma
  för `smhi[]`. Första riktiga integrationen kräver alltså INGEN ny publicering.
  ⚠️ **LÄGG TILL, ERSÄTT ALDRIG.** Portarna läser snapshoten OTYPAT ⇒ nya fält är gratis. Men Android
  läser `optBoolean("fukt", false)` — byts `fukt` ut tystnar **varje icke-uppdaterad app på is**, utan
  felmeddelande och utan checksummefel.
  🧪 **v11_silent_drive är grinden för hela tillståndslagret** — den bevisar TYSTNAD, och varje
  vidgning av L2 får den att tala. En vektor försvagas aldrig för att få ett bygge grönt.
  🔁 **SEKVENS:** F1 publicera → mät i skuggan (skuggmotorn ÄR motorn, `--check` i två workflows)
  → F4 ändra villkoret → tre portar. F1 alltid minst ett varv före F4.
  📖 **OMARBETAD 14/9 TILL ETT SAMMANHANGANDE DOKUMENT (Bengts order).** Kartan lag i EN fil men
  var skriven i tre lager ovanpa varandra: original, rattelse inklistrad i sammanfattningen, tva
  tillagg med egen "Bengts invandning"-inramning. Den lastes som ett samtal, inte som en karta.
  🧭 **Nu 11 paragrafer i lasordning:** fragan → fem lager → multiplikationen → **var lagren faktiskt
  star** (§4, med grind A:s matta felkurva som FAKTUM, inte som rattelse) → atta motkrafter → A–E →
  ett nej galler en roll → registret → det osynliga → arlig sammanfattning → **§11 rattelsehistorik**.
  ✅ **Inget tappat:** varje siffra och varje kortnummer ur den gamla versionen finns kvar (diffat
  post for post), 323 → 335 rader. Historiken ligger i §11 + DECISIONS #159/#180/#181, sa brodtexten
  sager vad som GALLER i stallet for vad som andrats.
  📚 **§9 REGISTRET TILLAGT 14/9 på Bengts invändning** (DECISIONS #181): allt struket, stängt och
  flyttat står nu i SAMMA dokument — fyra stängda kort, nio strukna parametrar, fem flyttade kärnor.
  Skälet: annars landar de bredvid när någon tar ett samlat grepp.
  🧭 **Det kvarlämnade faller i tre slag:** GRÄNS (var produkten inte kan nå) · VILLKOR (vad
  kombinationen inte får göra) · MÄTT FAKTUM (mätningen överlever även när delen inte gjorde det).
  💡 **Tre saker syns först när allt står på ett ställe:** (1) gränserna är inte hål utan produktens
  FORM — #92 och #93 säger tillsammans *vi talar om vägen där någon mäter den, inte om fordonet och
  inte där ingen mäter*. (2) **Allvarsskalans ramar är redan skrivna, fast utspridda** i tre stängda
  kort: E3 (aldrig prioritet), #103 (episoder, inte rader), #100 (talen för långa sträckor) — #153
  behöver inte uppfinna dem. (3) Flera strukna delar lämnade en BERÄKNING efter sig, inte bara en
  idé: torrdygnsräknaren är #42:s vattenfilmålder, kvoten max/mean är #45:s formsignal.
  🔴 **RÄTTAD 14/9 PÅ BENGTS INVÄNDNING (DECISIONS #180): GRIND A HAR INTE FALLIT.** Jag citerade
  körningen FÖRE givarvakten och marginalvakten. Med båda på plats (#131, 1 943 punkter): MAE
  **0,85** (A1 KLARAR), grova **5,1 %** (A2 OAVGJORT), frysklassfel **0,3 %** (A3 KLARAR) — domen
  är ⏳ INGEN DOM, uttryckligen *inte ett nej*. Talen **stiger monotont** med ankaravståndet:
  0,33 · 0,78 · 0,85 · 0,89.
  🔑 **DET ÄNDRAR L4 I GRUNDEN:** ankaret är inte en tom ruta utan en MÄTT avståndsberoende
  osäkerhetskurva — precis den storhet räckviddslagret behöver. Det som saknas är **knappen**, inte
  mekanismen: vad som gör kurvan brantare eller flackare en enskild natt.
  ⚖️ **NY §8 I KARTAN: ett nej gäller en ROLL, inte en del.** Prejudikatet finns: kamerorna
  underkändes som täckning och blev BILDFACIT. Bromsen mot önsketänkande: en ny roll kräver en ny
  fråga, skriven före mätningen, med egen grind. **Ingen del återinförs på hopp.**
  📋 **De sju underkända har alla en obesvarad fråga i det sammanvägda**, och två kräver inte vinter:
  höjden som VARIANSpredikator, och radarns SEGMENTUPPLÖSNING (mätt där stationen stod 6,7 km bort).
  **Bengts order 14/9:** *"delarna skulle integrera och tillsammans bli starkare … om vi byggt fel
  så att det motverkar syftet vill jag att du särskilt pekar på det."* Svaret:
  `docs/INTEGRATIONSKARTAN.md`.
  🏗️ **FEM LAGER, och varje befintlig del faller i ett utan att skrivas om:** L1 trovärdighet (i
  drift) · L2 tillstånd (blöt/torr byggt, #45 och #42 kvar) · L3 utveckling (mätt, ingen regel) ·
  **L4 räckvidd (praktiskt tomt)** · **L5 allvar och röst (finns inte)**.
  ✖️ **VÄRDET ÄR EN MULTIPLIKATION:** blöt × faller mot noll × mätningen gäller hit = en
  FÖRUTSÄGELSE. Var för sig är alla tre observationer.
  ⛔ **TRE MOTKRAFTER, OCH TVÅ ÄR REGLER VI SJÄLVA SKRIVIT:**
  (1) **Utgången väljer på SLAG, inte ALLVAR** — halt+isrisk+kraftigt regn låter exakt som bara
  halt. En integration som inte kan sägas finns inte för föraren. (#153)
  (2) **"En modellerad storhet får aldrig vara en avtryckare"** — varje integrerad storhet ÄR
  modellerad. Bokstavligt tolkad förbjuder regeln produkten. → **Löst 16/9: regeln i Axels lydelse (DECISIONS #220).**
  (3) **Grindarna dömer delar, inte kombinationer** — och vi har redan gjort felet: SMHI mättes som
  ANKARE och underkändes, men dess roll i modellen är RÄCKVIDDSKNAPP. Fel fråga, och nejet står
  kvar som om saken vore avgjord.
  📉 **TÄCKNINGEN MULTIPLICERAS OCH KRYMPER:** station 18,5 % × radar 13,1 % ⇒ **8,2 %** där båda
  talar. Integrationen måste degradera graciöst, inte kräva alla lager.
  🪞 **TVÅ AV MINA EGNA BYGGEN BÄR SAMMA FEL:** skattaren kastar bort bevisets STYRKA (enum i
  stället för gradient), och trendarkivet är ett superset av TRIGGERN, inte av FENOMENET — det kan
  inte svara på när ytan börjar STIGA, vilket är skälet att tystna på morgonen.
  ⚠️ **#45 lutar på en höjdkorrektion #91 mätte till NOLL** (1,65 → 1,65 °C). Luft mot yta är inte
  samma storhet — men ingenstans står det, och #45 är skrivet som om korrektionen vore etablerad.
  ✅ **EN SAK GJORDES RÄTT och är förebilden:** rimfrosten (#46) blev en ANDRA GREN i `icing_point`,
  inte ett sjätte farslag. Berika en befintlig faras underlag — lägg aldrig till slag, för varje
  nytt slag gör regel 1a värre.
  ⏭️ **FEM SAKER MÅSTE FINNAS:** A allvarsskala (Axels) · B bevisbärare i snapshoten · C en grind
  för KOMBINATIONEN · D skriven regel för gemensam kalibrering · E graciös degradering (min kod).
  **C och D är dokument och kan skrivas före frosten.**
  ❄️ **FRYST 15/9 (DECISIONS #186, Axels förslag, Bengts beslut).** Nästa ändring efter bygge + mätning. Enda
  undantaget infört: kriteriet för nytt farslag i §7.8 (tre rader). R1–R15 väntar i bedömningens bilaga A.
  📌 **R16 väntar i bilaga A (Axel 16/9):** fog-tabellen är läst, inte körd — #154:s F1 var F4/F5 i koden. Villkoret för
  att öppna kartan (bygge + mätning) är nu uppfyllt; R1–R16 förs in när Bengt säger till.
  ✅ **R1–R16 INFÖRDA 16/9 (DECISIONS #199), kartan fryst igen:** §5.2 regn-raden löst med `rain_segments`, §5.6 R16 med
  regeln "F1 först när det är verifierat i kod att ingen port läser fältet", §7.8 kandidaterna prövade + Axels D-utgångspunkt,
  §14. Bilaga A i bedömningen struken. Nästa öppning efter nästa bygge + mätning.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** kartan fryst och R1–R16 införda (DECISIONS #199); alla fyra frågorna avgjorda (#186, #220, #221); A–E bärs av bedömningens minimilista (§8).
- [x] 📍 **#158 SKUGGLOGGENS LARM SAKNAR POSITION — ✅ KLART 14/9, STÄNGT 20/9** (DECISIONS #250).
  Form A byggd och deployad 14/9; `main.ts` tar punkten ur FARAN, och kommentaren på rad 329 bär rättelsen.
  Bevis 20/9: kamerafacit har 451 objekt i hinken — uppslagningen fungerar i drift. Form B är ett senare val,
  inte ett öppet åtagande.
  ✅ **BYGGT OCH DEPLOYAT 14/9 — FORM A** (Axels ja via Bengt, DECISIONS #179, PR #248).
  Positionen tas ur FARAN, inte ur motorn: punktfaror bär lon/lat själva, så en uppslagning på
  `hazardId` räcker — ingen motorlogik i edge-funktionen. `distanceM` skrivs också, som Alert
  alltid burit och skuggmotorn kastade bort. **Motorkoden och vektorerna orörda**, bunten
  omgenererad, `--check` grön, deployad efter verifiering mot main.
  🧭 **SEGMENT FÅR INGEN KOORDINAT — ett beslut, inte en lucka.** En polyline vars centroid kan
  ligga milsvitt från larmpunkten (Jämtlands segment är 59 km) hade gett ett tal som ser ut som en
  position men pekar fel — samma fel igen, fast tystare. Fältet **`geo`** säger varför: `punkt`,
  `segment` eller `okänd`, där okänd i sig är ett larm värt att se.
  ⏭️ **FORM B ligger kvar som ett senare val:** motorns `Alert` bär punkten `distanceM` mättes till.
  Exakt för alla farslag, men rör vektorerna och alla tre motorer.
  ⚠️ **DET SOM PASSERAT ÄR BORTA.** Sexton dygns larm loggades utan position, och kamerabilden för
  en passerad natt finns inte kvar hos Trafikverket. Facitstacken börjar från i dag.
  **Fyndet 14/9 (DECISIONS #177):** 2 103 larm på fjorton dygn, **0 med `lon`, 0 med `distanceM`**.
  En verklig rad: `{"t":1705,"id":"cam:22029010","kind":"camera","text":"Fartkamera om 500 meter."}`
  📐 **ORSAKEN:** motorns `Alert` (`engine/src/types.ts:77`) bär `t`, `hazardId`, `kind`,
  `distanceM` och `text` — ingen koordinat. Skuggmotorn skriver ändå `lon: a.lon` (`main.ts:205`)
  på ett fält som inte finns. Edge-funktionen deployas utan typkontroll ⇒ `undefined` ⇒
  `JSON.stringify` tappar nyckeln **tyst**.
  🧯 **VAD SOM FALLER PÅ DET:** (1) kamerafacit har aldrig kunnat fyllas — `archiveFacit` räknar
  haversine på NaN och rapporterar "ingen kamera inom 15 km" (#157). (2) Tystnadsfelets T3 (#98)
  hade klassat VARJE facit-tillfälle som tyst miss; den vägrar nu svara i stället. (3) Radien
  15 km är **oprövad**, inte fel — knappen `facitradien` finns och väntar på giltiga positioner.
  🔧 **ÅTGÄRDEN, och den är Axels form:** `main.ts` slår upp faran på `hazardId` bland `hazards`
  och skriver dess position **plus `distanceM`**, som Alert faktiskt bär men skuggmotorn kastar
  bort. Punktfaror har lon/lat; segmentfaror har en polyline och behöver ett val (närmaste punkt
  på linjen vid larmögonblicket är det som svarar mot vad föraren såg).
  ⚠️ **VARFÖR DET INTE ÄR MITT:** ändringen ändrar vad SKUGGLOGGEN INNEHÅLLER, och skuggloggen är
  mars-domens underlag. Formen ska Axel se på innan den skrivs.
  🕰️ **TIDSKRITISKT:** varje larm som loggas utan position är ett facit som inte går att återskapa
  — kamerabilden för en passerad natt finns inte kvar hos Trafikverket.
- [x] 📷 **#157 KAMERAFACIT ÄR TOMT — ✅ LÖST, STÄNGT 20/9** (DECISIONS #250). Rotorsaken (#158) åtgärdad 14/9.
  **Bevis 20/9 08:05Z: 451 objekt i `facit`-hinken** (262 den 18/9, 438 den 20/9 tidigare samma dygn) — hinken
  fylls. Kvar som EGEN fråga, inte här: granskningen av bilderna (kort #209, beslut inom sju dygn efter frosten).
  🎯 **ROTORSAKEN FUNNEN 14/9 (DECISIONS #177): SKUGGLOGGENS LARM HAR INGEN POSITION.**
  Bevisat på lagrad data: **2 103 larm på fjorton dygn, 0 med `lon`, 0 med `distanceM`**. En
  verklig rad: `{"t":1705,"id":"cam:22029010","kind":"camera","text":"Fartkamera om 500 meter."}`
  📐 **VARFÖR:** motorns `Alert` (types.ts:77) bär ingen koordinat, men skuggmotorn skriver ändå
  `lon: a.lon` (main.ts:205). Edge-funktionen deployas utan typkontroll ⇒ `undefined` ⇒
  `JSON.stringify` tappar nyckeln tyst. `archiveFacit` räknar då haversine på NaN, hittar aldrig
  en kamera, och rapporterar "ingen kamera inom 15 km". **Bucketen har aldrig kunnat fyllas.**
  ✅ **RADIEN ÄR OPRÖVAD, INTE FEL** — den har aldrig fått en giltig position att mäta mot.
  Mätknappen `facitradien` finns och kan köras om den dagen positionerna är på plats.
  🚨 **OCH TYSTNADSFELET (#98) HADE SVARAT FEL:** utan positioner hittar T3 aldrig ett larm och
  klassar VARJE facit-tillfälle som tyst miss — en artefakt som ser ut som en mätning. Spelade
  ingen roll i dag (facit tomt), hade spelat all roll i vinter. **T3 vägrar nu svara i stället.**
  ⏭️ **ÅTGÄRDEN ÄR AXELS FORM:** `main.ts` måste slå upp faran på `hazardId` och skriva dess
  position plus `distanceM` (som Alert faktiskt bär och skuggmotorn kastar bort). Det ändrar vad
  SKUGGLOGGEN innehåller, och skuggloggen är mars-domens underlag. Eget kort.
  🎯 **SKÄLET ÄR FRAMME 14/9 — OCH DET VAR INTE APIKEY** (DECISIONS #176). pg_net lagrar
  skuggmotorns svar i `net._http_response`, och där står det: `"facit":0,"facitSkal":
  ["ingen kamera inom 15 km"]`. Larmet inträffar, TRV svarar med kameror — men närmaste
  väglagskamera ligger längre bort än radien.
  🔬 **RÄTTELSE 3 VAR DEN SOM BETYDDE NÅGOT.** Den som såg minst ut — grenar som säger varför —
  besvarade frågan. Utan den hade vi läst `facit: 0` och trott att apikey-rättelsen behövde tid.
  ⚠️ **MIN HYPOTES ÄR OPRÖVAD, INTE BEKRÄFTAD:** koden når aldrig uppladdningen. Det sjunde ledet
  var inte uppladdningen utan KAMERAVALET, och det låg före.
  📏 **NÄSTA FRÅGA ÄR MÄTBAR:** hur långt är det från ett skugglarm till närmaste väglagskamera?
  749 kameror med koordinater finns i kartlagret, `shadow_log.alerts` bär varje larms position.
  **Ingen radie ändras innan det är mätt.**
  🔬 **UTREDD 14/9 (DECISIONS #172) — sex av sju led håller, felet är inringat till ETT.**
  Bucketen finns (skapad 29/8 10:22) · TRV-frågan fungerar (**749 kameror** ligger publicerade i
  kartlagret ur samma fråga) · kamerabildens URL ger **HTTP 200, image/jpeg, 13 kB** (provat
  utifrån) · skuggan larmade i **756 av 1 802** svenska körningar på 14 dygn · och bucketen har
  ändå **noll objekt** — i alla bucketar, inte bara `facit`.
  🎯 **DET ENDA OPRÖVADE LEDET ÄR UPPLADDNINGEN, och det är också det enda som avviker:**
  `archiveFacit` postar med **bara** `Authorization: Bearer`, medan varje annat Supabase-anrop i
  samma fil skickar `Authorization` OCH **`apikey`** (`main.ts:210`). Det är repots ENDA
  storage-anrop, så ingen annan kod har prövat vägen. Hypotesen är INTE bevisad — den kan bara
  bevisas genom att lägga till raden och mäta efteråt.
  🚨 **MEN DET STRUKTURELLA FELET ÄR ATT INGEN VET:** funktionen har FYRA tysta grenar och
  returnerar en siffra som blir `facit: 0` — omöjligt att skilja från "inga larm". Exakt
  kameror-vaglag-läxan i CLAUDE.md, som fanns nedskriven men inte tillämpad här.
  ⏭️ **FÖRSLAG (Axels märke, kräver bunt + deploy):** lägg till `apikey`, och gör varje gren
  högljudd med API:ets svarskropp. Jag rör inte motorkedjan.
  **Upptäckt 14/9** när #98:s instrument kördes första gången (DECISIONS #171).
  `TROSKLAR-TYSTNADSFEL` §8 gör kamerafacit till en **bärande** facitkälla: *"738 av 744 kameror
  står vid en VViS-station (#55), facit ligger per konstruktion inom räckvidd"*. Skuggmotorn
  arkiverar bilder vid varje larm (`archiveFacit`, bucket `facit`, `supabase/functions/skuggmotor`).
  📉 **Efter 5 657 skuggkörningar över 60 rutter innehåller bucketen NOLL objekt.** Frågan ställdes
  utan fel och fick svaret 0 — det är alltså inte en saknad rättighet.
  ❓ **Vad som ska mätas:** arkiverar `archiveFacit` alls (loggar den?), tar `facitBudget` slut,
  eller laddas bilderna upp och raderas? Och: skriver den bara vid `land === "se"` och bara när
  larm finns — hur ofta larmar skuggan i Sverige i september?
  ⚠️ **VARFÖR DET HASTAR:** både #98 och mars-domen räknar med den här stacken. En facitkälla som
  tyst inte fyller på är värre än en som aldrig byggdes — den ger lugn på fel grund, precis som
  kameror-vaglag gjorde (CLAUDE.md-läxan om tysta ALDRIG).
  🔧 **ÅTTONDE LÄNKEN 15/9 (bedömning v3 N1, DECISIONS #189, PR #270):** facitradien 174 larm, **100 % inom 15 km**
  (median 0,4–13,4 km/rutt) — och tystnadsfelet: **0 bilder**. `archiveFacit` fick motorns Alert UTAN position (form A
  gav bara loggen lon/lat) ⇒ NaN ⇒ "ingen kamera inom 15 km". Tar nu punkter ur faran. VÄNTAR: deploy skuggmotor +
  ett objekt i hinken räknat av tystnadsfelet.
  ✅ HINKEN FYLLS 15/9: skuggmotor deployad 15:52Z; tystnadsfelet 16:02Z: **1 bild i `facit`**, senast 15/9 — första objektet någonsin. Den åttonde länken var den sista.
  📷 **AXEL 16/9: 26 objekt i hinken sedan 16:00Z** (verifierat i DB). Reservation: 738 av 744 kameror står vid en station —
  radien säger att det finns en kamera nära, inte att bilden visar rätt sträcka. Avgörs i mars när någon öppnar bilderna.
- [x] ↪ **SAMMANSLAGET 24/9 i #83** (DECISIONS #332) — 🧵 **#155 SNUBBELTRÅD: ändras #83:s kvarhållning måste #89 och #98 byta byggform**
  **Principen (skriven 14/9 i TROSKLAR-OVERGANGAR och TROSKLAR-TRENDEN, Bengts order):** spara det
  som inte går att räkna om, räkna om det som går — och vilket som är vilket är en MÄTNING, inte en
  smaksak. Trendarkivet (#88) sparar för att gallringen förstör dess 15-minutersfönster.
  Tillståndsskattaren (#89) och tystnadsfelet (#98) räknar om, för att deras ingångar överlever.
  ⚠️ **DET VILAR PÅ ATT KVARHÅLLNINGEN INTE SKÄRPS.** Gallringens eget huvud (sql/014) säger att
  gratisnivån räcker ungefär **55 dygn in i vintern**, och steg 2 — export eller Pro — är ett öppet
  **oktoberbeslut**. Skärps kvarhållningen, eller börjar `radar_precip` gallras (inget gör det i
  dag), upphör ingången att vara återskapbar och båda måtten måste byta till #88:s form.
  ⏭️ **VAD SOM SKA GÖRAS NU: ingenting.** Kortet finns för att beslutet i oktober ska veta att det
  rör mer än lagringsutrymme — det avgör två mätinstruments byggform.
  ↪ **SAMMANSLAGET 24/9 i #83** (DECISIONS #332): villkoret står som stycke på #83, där oktoberbeslutet tas.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #304) — 📮 **#154 ANMÄL NIO TRASIGA BYVINDGIVARE TILL TRAFIKVERKET — skriven och klar, skickas av Bengt**
  **Beställd av Bengt 13/9** ("gör 1 och 2") efter att stationsvakten (#90, DECISIONS #164) hittat dem.
  **Brevet ligger i `docs/ANMALAN-TRV-BYVINDGIVARE.md`** — komplett med stations-id, namn, WGS84,
  antal omöjliga timmar, värsta kvot, median byvind och den tydligaste enskilda observationen per
  station. Enda luckan är kontaktuppgifterna, som medvetet står som platshållare.
  **De nio:** 2312 Handöl (29 omöjliga timmar, 85,5 m/s — över Sveriges rekord), 2438 Ruskträsk,
  227 Arlanda, 1732 Fastnäs, 426 Oxelösund (87,7 m/s), 618 Brahehus, 2107 Hamnäs, 310 Överboda,
  1311 Mossjön. Mönstret är detsamma i alla nio: **spiken inträffar i nära vindstilla** — medelvind
  0,4–2,1 m/s mot byvind 23,8–87,7.
  **Beviset är deras eget material, inte vår modell:** i Trafikverkets egna data (alla stationer,
  medelvind ≥ 5 m/s, 3 142 rader) är byvindfaktorns median 1,75, p95 2,25 och p99,9 3,08. De nio
  ligger på 25–175.
  ⏭️ **VAD SOM ÅTERSTÅR:** fyll i kontaktuppgifter och skicka. Att skicka är Bengts beslut — jag
  skickar ingenting i hans namn. Vägen är Trafikverkets kontaktformulär för öppna data (eller
  trafikverket@trafikverket.se med ärendet "öppna data — WeatherMeasurepoint").
  ⚠️ **Rättat 17/9:** Trafikverkets kontaktsida listar ingen e-postadress. Vägen är kundformuläret
  etjanster.trafikverket.se/kundfragor-trafikverket ("väg, järnväg, färja eller övrigt") eller ett ärende i
  Datautbytesportalen, inloggad med kontot bakom vår API-nyckel.
  ✅ **Bättre väg, 17/9:** Datautbytesportalens kontaktformulär data.trafikverket.se/about-us/contact — ingen inloggning,
  ärendetyp **API Öppna Data**.
  ✅ **Bengt ja 17/9 (DECISIONS #225): brevet ska skickas — Bengt skickar själv.**
  💡 **Varför det är värt att skicka:** vi har uteslutit stationerna ur vårt eget underlag, så vi är
  inte blockerade. Men felet ligger kvar för alla andra som läser samma öppna data — och svaret
  (givare, överföring eller aggregering?) avgör om konsumenter kan filtrera bort det själva.
  ✅ **Stängt 22/9 (DECISIONS #304):** Bengt 22/9: *"skickade"* — anmälningarna om de trasiga givarna är skickade. Trafikverkets svar bevakas i bedömningens läge ("två anmälningar om trasiga givare").
- [x] ✅ **STÄNGT 22/9** (DECISIONS #312) — 🤝 **#94 Samarbeten vi inte prövat: ~~försäkringsbolag~~, åkerier, NTF/M Sverige** (ur Claudes
  systemanalys 10/9). 🛑 **FÖRSÄKRINGSSPÅRET STÄNGT 11/9 av Bengt (DECISIONS #94):** "det är klarlagt
  att vi inte kan få det samarbetet". Kortet bär det därmed varken som facitkälla eller som första
  spår. Konsekvens: skadedata är inte längre en väg till facit — grind T-B (#88) och tystnadsfelet
  (#98) döms mot vår EGEN facitstack (kamerafacit #20, road_condition_history, situation_archive #33),
  och betalningsviljan får sökas i de spår som lever. Drive-analysens §2.7 "försäkringsbolag först,
  de har facit" är därmed överspelad; tavlan gäller.
  **KVAR, i ny ordning:** (1) Åkerier och bussbolag kör samma sträckor varje dag — perfekta testbilar
  OCH B2B-marknad (kopplar till #92 fordonstyp och #90 sidvind). Nu första spåret. (2) NTF och
  M Sverige som kanaler till landsvägsföraren i mörker. Verify: ett möte bokat per kvarvarande spår.
  ✅ **Stängt 22/9 (DECISIONS #312, Bengts beslut):** NTF-delen bärs av Skyltfondsrundan, där samtalen pågår; åkerierna ströks ur rundan (DECISIONS #215) och försäkringsbolagen redan tidigare. Inget möte bokas nu.
- [x] ⛔ **#93 Kommunala vägar — STÄNGT 12/9, men HALVA KORTET FLYTTADES** (Bengts order när §2.6 togs ur
  📏 **STADEN I SIFFROR 19/9** (Bengts fråga: trafikskolorna kör mest i stan): Mätt 19/9 (dbknapp, radie från centrum): **Malmö 6 km: 1 mätstation (Malmö GBG; i hela kommunen tre: Malmö GBG 1 km, Oxie 7 km, Malmö Ö 8 km — alla på statens vägar), 0 fartkameror, 5 väglagssegment, 10 olyckor/30 d · Lund 4 km: 1/0/6/5 · Helsingborg 5 km: 1/0/2/4 · Göteborg 7 km: 1/8/20/142 · Stockholm 8 km: 7/13/10/625** — av 850 stationer, 2 791 kameror, 818 segment i landet. Inne på gatorna är appen tyst; det som finns ligger på ringvägar, infarter och genomfartsleder. Konsekvens för skolorna: lärarnas facit kommer från landsvägs- och motorvägspassen, inte stadspassen; sägs rakt ut i samtalen (kontaktplan v6.3). Städernas svar (Malmö, Stockholm, Göteborg) avgör om det ändras.
  📬 **MALMÖ SVARADE 18/9 16:49** (ärende 1255995, FGK via kundservice): egna väderstationer finns; de och Trafikverkets tre i
  Malmö styr prognosen som utkallarna beslutar halkbekämpning och snöröjning på. *"I nuläget kan vi inte erbjuda datan som
  öppen data."* ⇒ (a) förblir stängt. Två öppningar kvar: **avtal inom projektet** (inte öppen data) och **leverantörens väg**
  (systemet bakom stationerna). Följdmejl utkast 19/9 (bedömningen §4.2). Stockholm och Göteborg: skickat 18/9, väntar.
  📬 **GÖTEBORG SVARADE 21/9 09:08** (Petri Stjernvall, planeringsledare vinterväghållning; Bengts mejl gick 17/9 09:48,
  inte 18/9): friktionsdata från bilar levereras av **Nira**, prognoser via **Klimator och SMHI** i *BM Road Service
  Systems* — *"Allt detta hanteras av avtal och kan ej i dagsläget delas fritt."* ⇒ (a) stängt även här. Leverantörens
  väg: kort #229 (DECISIONS #281). Frågan om egna stationer på gatunätet blev obesvarad. Stockholm: väntar.
  📖 **Fråga 2 besvarad ur stadens egen slutrapport 21/9 (DECISIONS #295):** *"tre egna väderstationer"* plus IoT-stationer i
  Klimators system — för få för att ändra täckningen. Ingen ny fråga till Göteborg nu.
  systemanalysen, DECISIONS #108).
  ✘ **(a) kommunernas stationsdata läggs ner:** det finns ingen öppen källa, ingen förhandling
  pågår, och att hålla ett kort öppet för något ingen arbetar på är att låtsas. Hålet i täckningen
  är verkligt och står kvar dokumenterat i SYSTEM.md — det är skillnad på att veta om ett hål och
  att ha en plan för det.
  ➡️ **(b) SMHI-förstärkaren FLYTTAS till kort #95**, där den hör hemma: `smhi_warnings` hämtas
  redan och ligger i arkivet, så regeln "snöfallsvarning + yta nära noll = högre konfidens" kostar
  0 kr och 0 nya källor. Att slänga den med kortet hade varit att kasta den enda byggbara delen.
  Ursprunglig text:** (systemanalys 10/9).
  VViS sitter på statligt vägnät; svartisen som skadar flest finns på gator, cykelbanor och infarter,
  där vi inte har en enda givare. SYSTEM.md säger det ärligt, men inget kort bär det. Kandidater:
  kommunernas driftavdelningar (egna stationer, saltloggar), och SMHI:s varningsklasser som vi redan
  hämtar men bara ritar på kartan — som FÖRSTÄRKARE av frysrisken (snöfallsvarning + yta nära noll =
  högre konfidens), aldrig som egen fara. Verify: (a) tre kommuner tillfrågade om stationsdata,
  (b) skuggkolumn "smhi_forstarkt" mätt mot facit en vintermånad.
- [x] ✅ **STÄNGT SOM KORT 25/9, RUTIN I KALENDERN** (DECISIONS #356) — Läsa SYSTEM.md mot koden månadsvis — ✅ **första läsningen gjord 22/9** (Bengts order, underlag till Skyltfondens bilaga 3): regler, källor, vakter, skuggdrift, mätning och grannländer lästa mot koden; nästa läsning oktober
  ✅ **Stängt som kort 25/9 (DECISIONS #356, Bengt):** läsningen är en rutin och står i bedömningens kalender (*Varje månad*), nästa i oktober.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #310) — Samtal med Axel: sensortrappan — tidsättning av steg 2 (våren 2027?)
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** #237 *Telefonkedjan* (parkerad 22/9) — avgörs i samma samtal.
  ✅ **Stängt 22/9 (DECISIONS #310, Bengts beslut):** tiden är satt — **steg 2 (telefonens sensorer, opt-in) prövas våren 2027**, efter vinterns domar, och telefonkedjan (#237) avgörs i samma prövning. Samma ordning som Axels beslut 28/8 (*v1 utan datainsamling, sensortrappan är strategi*). Frågan bärs nu av **Ä8** i bedömningens §3 (mars och framåt), så den kommer tillbaka i mars.
- [x] ↪ **SAMMANSLAGET 22/9** i *Samtal med Axel: sensortrappan* (DECISIONS #303) — 🔗 **#237 PARKERAT: TELEFONKEDJAN — bil 1:s telefon varnar bil 2 (Bengts tanke 22/9, "inte nu, kanske en väg framåt").**
  Nira bygger en kedja där bilens givare (ABS, antispinn, torkare) rapporterar bakåt till nästa bil via molnet. Kan telefonen
  göra samma sak? **Claudes bedömning 22/9, realistisk:** (1) värdet hos Nira är GIVAREN, inte kedjan — bilen mäter friktion
  hela tiden, telefonen ser bara händelser (inbromsning, sladd) i efterhand, glest och sent; (2) skalan avgör: kedjan kräver en
  Halkvakt-telefon minuter före nästa på samma väg — Nira har miljoner bilar, vi tolv testare; (3) bryter invarianten (position
  lämnar telefonen automatiskt, DECISIONS #264) och arkitekturen (snapshots var tionde minut mot sekundsnabb push för en bil
  2 km bakom). **Det som fångar tanken:** förartryckta rapporter i nästa snapshot — facitknappen (S4) är samma väg, en
  "halka här"-knapp är Wazes modell och nästan byggd; automatisk sladdupptäckt som opt-in hör till sensorbeslutet våren 2027
  (#21); och fordonskedjan kan komma gratis om Trafikverket publicerar Niras händelser öppet (frågan skickad, §0b). Tas upp i
  samtalet om sensortrappan, inte före.
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** telefonkedjan avgörs i samma samtal: byggs, avvisas eller förs in i #21. Det som återstår bärs av *Samtal med Axel: sensortrappan*.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #311) — 💼 **B2B: skolpaketet som produkt** — per-elev-moment i körkortspaketen; STR som skalkanal; säljs våren 2027 med halkbanedata *(Axels idé, Bengts spår)*
  ✅ **Stängt 22/9 (DECISIONS #311, Bengt: *"ta upp våren 2027"*):** säljstart våren 2027 med halkbanedata; står i bedömningens rad *Efter mars* (skolpaketet som produkt och dess material).
- [x] ✅ **STÄNGT 24/9** (DECISIONS #345) — 📞 **Skyltfondsrundan** (efter Axels klartecken): fonden + trafikövningsplats v.36 → avsiktsförklaringar 25/9 → SKICKA 28/9.
  ↳ **Plan B 22/9 (docs/FINANSIERING.md):** utan partner överlever AP1, AP2, AP4, AP5; AP6 stryks och sägs öppet; teknisk titel, egna testförare, ~300 kkr; Bengts Nira-argument (alla förare, inte bara betalande bilmärken) in i båda versionerna. v7-B skrivs parallellt om Bengt säger ja.
  UNDERLAGEN UPPDATERADE 3/9 (Bengts order, terminalsessionen): ansökan v5 + kontaktplan v5
  i Drive-mappen. Nytt däri: (a) VERIFIERAT att handledarkursen slopades 2026-08-01
  (prop. 2025/26:127) — trafikskole-pitchen omskriven; (b) prognoslagrets beskrivning i
  linje med tröskeldokumentet (offsetmodell, inte Nowcast) så bilaga 7 stämmer med texten;
  (c) grind A-infrastrukturen synliggjord som egenfinansierad indata (gränsdragningen);
  (d) konkreta kandidater: AB Bulltoftabanan Malmö (040-29 29 05) + 7 trafikskolor.
  ⏰ Förhandssamtalet till fonden = "första veckan i september" = NU.
  📋 **KONTAKTPLAN v6 16/9 (Bengts order, DECISIONS #215): TRE SAMTAL, MUNTLIGT JA RÄCKER.** Bulltoftabanan tors–fre
  17–18/9 → trafikskolor 18–22/9 (fråga banan vilka som skickar flest) → NTF 22–24/9 → muntliga ja senast fre 25/9 →
  SKICKA mån 28/9. Fonden kräver inga underskrivna intyg (kontrollerat 16/9). NYTT LÄGE: NTF Skåne finns inte som eget förbund — Skåne
  ligger under NTF Jönköping (verksamhetschefen). Talmanus + tackmejl + uppföljningstabell: Drive "Kontaktplan
  Skyltfonden 2026-09-16 v6". VÄNTAR: samtalen (Bengt) · ansökan v6: AP3 saknar partner (58 000 kr), "avsiktsförklaring
  bifogas" → muntligt bekräftat, NTF-namnet, YKB-raden efter banans svar.
  🗂️ **KONTAKTPLAN v6.4 20/9** (Skrivbordet, ersätter v6.1–v6.3): hela talmanuset med *Vad ni får* i varje samtal, svaren om
  stan (appen tyst på gatorna; tre stationer i Malmö kommun, alla på statens vägar), hållningen till partnerskap, och
  **synligheten på hemsidan** (DECISIONS #241: skolans egen sida bakom QR-koden, listan, märket, månadssiffran — byggs när
  appen finns i butikerna). Tidsplan 21–25/9. Underlag för Bengts samtal med Axel om upplägget.
  💬 **TILLÄGG v6.2 19/9 (Bengts fråga: "what's in it for me"; Axel föreslår partnerskap i appen):** *Vad de får* per
  part, en mening per samtal, svar på ersättningsfrågan, reserv om ingen skola säger ja, och hållningen: **partner i
  projektet, synlig i appen där det är naturligt (Om-sidan, elevbladet) — inte partner i appen; skolpaketet i vår 2027**
  (FINANSIERING §B2B). Skrivbordet: `Kontaktplan-v6.2-tillagg-vad-de-far.html`. Beslutet Bengt + Axel i bedömningen §4.2.
  ✍️ **ANSÖKAN v6 + KONTAKTPLAN v6.1 16/9 (DECISIONS #216):** trafiklärare får vara testförare (Bengt) → frågan fast i
  trafikskolesamtalet. **AP3 sänkt** till pilot med trafiklärare som expertfacit: 58 000 → 21 000 kr, sökt belopp
  **363 200 kr** (flottpiloten och morgonöversikten ur ansökan). Båda i Drive; v6 av kontaktplanen märkt ersatt. VÄNTAR:
  samtalen (Bengt) · minst ett trafikskole-ja till lärare som testförare, annars AP3 om · **Axel: inbjudningsväg för
  lärarna** (TestFlight extern = Beta App Review; Android APK/Play) · Bengts och Axels omarbetning av v6.
  ✅ **Stängt 24/9 (DECISIONS #345, Bengt: *"vi har koll på dessa på annat sätt"*):** följs utanför tavlan; ansökan skickas 28/9 enligt Bengts och Axels plan. Underlaget i `docs/FINANSIERING.md`.

- [x] ✅ **STÄNGT 22/9** (DECISIONS #304) — ↩︎ **Kameravarningen i fel riktning — BEVISET SAKNAS ÄN** (återställt 10/9, föll av 8/9). Koden
  är bevisat rätt i alla tre motorerna (#55b tolerans 100°→60°, #57 riktningen vänd 180°, #59
  Öjersjö ID 14102020; 0.3.5 (8) första bygget med grönt kontrakt). Kvar: Bengt kör 0.3.5 och
  noterar KLOCKSLAG + PLATS per larm och per kamera utan larm. Beskrivningar räcker inte, vi har
  gissat tre gånger.
  ✅ **Stängt 22/9 (DECISIONS #304):** Bengt 22/9: *"kameravarningen är klar"*. Beviset är fältdomen Malmö–Boden (DECISIONS #102: en varning 500 m före varje verklig kamera, *"helt perfekt"*), som kortet aldrig hann ta upp.
- [x] ↩︎ ~~Bodenresan 1/9~~ ✅ GENOMFÖRD — gav DECISIONS #53 (resan håller över pauser) och #55
  (kameratoleransen). Jämförelsen "Bengts logg bredvid testbilarnas rapport" gjordes aldrig;
  facit-frågan bor i #16/#38b.

- [x] ✅ **STÄNGT 22/9** (DECISIONS #311) — **Danmark — NAP-nyckel** (gratis registrering) före produktion: trafikkort-flödet vi
  läser nu är publikt men odokumenterat.

- [x] ✅ **STÄNGT 23/9** (DECISIONS #319) — 📜 **#198 TROSKLAR-SKUGGAN §4 MOT TRÖSKELREGELN — rättas före domen i mars 2027** (fynd 16/9, DECISIONS #220).
  Domslutet (a) TALAR och (b) TALAR NÄRA ANKARE låter segmentprognosen tala på *modellerade* segment. Det krockade redan
  med den gamla meningen (FRYSKLASSNINGEN §1/§7) och krockar med T3: ett värde där ingen mätt och inget vittne på platsen
  kan fälla det får inte utlösa. Texten ska säga vad (a)/(b) då får betyda — karta, konfidens, eller tal bara där T1–T3
  klaras. Fastställt dokument ⇒ Bengts rad. Verify: §4 säger inget som regel T förbjuder.
  📄 **BESLUTSUNDERLAG SKRIVET 20/9** (Bengts order, DECISIONS #260): `docs/SKUGGAN-PAR4-MOT-REGEL-T.md`.
  **Krocken är inte en tolkningsfråga:** T3 nämner offsetmodellen VID NAMN (*"offsetmodellens temperatur långt från
  ankare … får inte utlösa"*), och segmentprognosen ÄR den storheten. T6 säger samma sak från andra hållet.
  **(a) kan inte stå kvar som röst** — förslaget är karta + konfidens, båda uttryckligen tillåtna i regelns egen text
  (T3: *får fortsatt stärka eller försvaga*; T6 med `N_varning` och E1 som förebilder).
  **(b) är räddningsbar**, och det är T5:s egen carve-out som räddar den: ett värde med ett vittne på platsen är
  *inte längre extrapolation i T3:s mening*. Men (b) villkorar i dag på grind A:s NOGGRANNHET, inte på VITTNET — och
  de två sammanfaller inte. Förslaget lägger till T1–T2 som andra villkor.
  Det är en **skärpning**, som §5 tillåter med en rad från Bengt; en lättnad hade varit utesluten.
  🔑 **VÄNTAR PÅ BENGTS RAD** (bedömningen §4.2). Rekommendation: ta det nu, inte i mars — annars kan någon bygga
  röstvägen under vintern och få veta först vid domen att den inte får användas.
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är din DECISIONS-rad om förslaget (a)/(b) (§4.2).
  🔍 **Genomlysning 23/9 (Bengts fråga):** kortet gäller bara segmentprognosen (#38b), inte skuggmotorn eller skuggreglerna; inga trösklar ändras. Skärpningen: (a) från röst till karta + förstärkare, (b) från noggrannhetskrav till vittneskrav. Två tillägg i underlagets §7: B3:s innebörd måste sägas i DECISIONS-raden, och (b) kan bli nästan tom. Rekommendation: anta förslaget nu, före #38b steg 4 i oktober. Fullständig text på Bengts skrivbord (`Halkvakt-198-genomlysning-2026-09-23.md`).
  ✅ **Stängt 23/9 (DECISIONS #319, Bengt: *"ja anta förslaget med B3-meningen i raden"*):** §4 i `TROSKLAR-SKUGGAN.md` omskriven — (a) karta och konfidens, aldrig röst ensam; (b) band **och** vittne (T1–T2); (c) orörd; B3-träff = rätt på kartan eller mätt varning förlängd, talet oförändrat. SYSTEM.md rad om prognoslagret i samma commit. Verify uppfylld: §4 säger inget som regel T förbjuder.

- [x] ✅ **STÄNGT 22/9** (DECISIONS #306) — 🗑️ **#146 27,6 MB SWIFT-BYGGUTDATA LIGGER SPÅRAT I REPOT — beslut krävs innan något tas bort**
  Upptäckt 12/9 under CRLF-arbetet (#145): `ios/HalkvaktEngine/.build/` är spårad med **504 filer,
  27,6 MB** — Linux-byggutdata (`.o`, `.swiftmodule`, `.pcm`, `master.priors`, `debug.yaml`) från en
  CI-körning som blivit incheckad. `.gitignore` täcker `android/build/` och `android/*/build/` men
  **inte Swifts `.build/`**. Varje klon betalar för det, och filerna är värdelösa på en annan maskin
  än den som byggde dem. Åtgärden är två rader (`git rm -r --cached` + rad i `.gitignore`) men att ta
  bort spårade filer är ett medvetet beslut, inte städning — **Bengt eller Axel säger till först**.
  Historiken blir inte mindre av det; bara nya kloner slutar hämta dem på nytt.
  **Bevisad skada, inte bara vikt (12/9):** en klon till en nästlad katalog FALLER på Windows
  260-teckengräns — `fatal: cannot create directory at 'ios/HalkvaktEngine/.build/x86_64-unknown-
  linux-gnu/debug/HalkvaktEnginePackageDiscoveredTests.build': Filename too long`. Klonen gick
  igenom först med `-c core.longpaths=true`. Det är alltså inte bara 27,6 MB — det är en repo som
  inte går att klona normalt på Windows, och orsaken är uteslutande byggartefakterna.
  ↦ **Sorterat 22/9 (kort #224):** nästa steg är ditt (eller Axels) ja — sedan en commit: `git rm -r --cached ios/HalkvaktEngine/.build` och raden i `.gitignore`.
  ✅ **Stängt 22/9 (DECISIONS #306):** Bengts ja 22/9. PR #481 (0c2d92a): 504 filer ur git, `ios/HalkvaktEngine/.build/` i `.gitignore`, inga referenser utanför mappen. **Före:** en kloning utan `core.longpaths` föll 22/9 på *Filename too long* (291 tecken, *checkout failed*). **Efter:** samma kloning av 0c2d92a går igenom, 0 saknade filer. ci och ios-engine gröna på main (35739390674, 35739390740). Historiken är oförändrad, och en `git pull` tar bort de gamla byggfilerna ur andras arbetskopior; nästa Swift-bygge skapar dem igen.


### Claude — olåst

- [x] ✅ **KLART 25/9** (DECISIONS #368) — 🌅 **#257 TRENDENS STIGANDE HALVA SPARAS INTE — OCH GÅR INTE ATT RÄKNA OM** (fynd 25/9, Bengts fråga om en lucka i L3).
  TROSKLAR-TRENDEN mäter två riktningar (§1): fallande = förvarning, **stigande = tystna tidigare** när ytan värms genom +1 °C på
  morgonen. Svepet är fastställt (§2: +0,4 · +0,8 °C per fönster, yta > +1) och T-B dömer tystnadsriktningen hela vintern. Men
  `berakna_trendkandidater()` (sql/018) sparar bara FALLANDE kandidater (`greatest(lutning) >= 0,4`, yta +1…+6), och efter sju dygn
  gallras arkivet till en rad per halvtimme — trendens vakt kräver minst tre rader i fönstret, så den stigande lutningen kan inte
  räknas fram i efterhand. Dokumentets egen princip (§7) är *spara det som inte går att räkna om*. Missas det före frosten kan
  tystnadsriktningen inte dömas i mars — nästa vinter. **Förslag:** låt samma funktion spara även stigande kandidater (negativ
  lutning, samma band och fönster, samma utfall 90 min efter), och låt läsarna som bara vill ha fallande filtrera på tecknet.
  **Verify:** stigande rader i trendarkivet efter en morgon, läsarnas tal oförändrade (tystnadsfelets `trend_underlag` inräknat), prov
  och motprov.
  ✅ **BEVIS 25/9:** `trend_stigande` (sql/018) i drift — egen tabell, eftersom snapshoten läser `trend_kandidater`. Prov grönt i
  PR #604, två motprov föll (PR #605/#606). Drift: 654 stigande kandidater vid 41 stationer på 12 h, toppen kl 05–08; den fallande
  halvan orörd (201 före och efter).
- [x] ✅ **KLART 25/9** (DECISIONS #366) — 🌙 **#256 UPPSPELNINGENS NATT RÄKNAS I UTC** (fynd 25/9 under kort #254, DECISIONS #365). `sql/028_uppspelning_varianter.sql:137`
  skiftar natten 12 h i `AT TIME ZONE 'UTC'`, medan R-A och sedan #254 d även T-A räknar i `Europe/Stockholm`. DECISIONS #246 säger att
  T-A, R-A och uppspelningens episoder ska mena samma natt; kontraktet "Nattens gräns" vaktar bara talet 12, inte zonen.
  **Verify:** uppspelningen räknar natten i svensk tid (ny migration, uppspelningen körd om och jämförd), och kontraktet vaktar zonen.
  ✅ **BEVIS 25/9:** `sql/028` räknar natten i Europe/Stockholm (redigerad på plats — idempotent — och körd i drift, run 36147121022:
  en signatur, svensk natt i funktionen). Kontraktet "Nattens zon" vaktar zonen i tre kopior. Fall J grönt i PR #597; motprovet i
  PR #598 föll på J. Uppspelningen före och efter identisk (2/4/2, 12/27/7, 204/7 380/12) — septembers kandidater ligger på natten.
- [x] ✅ **KLART 25/9** (DECISIONS #364) — 🧪 **#255 MISSMÄTNINGEN RÄKNAR UPPEHÅLL SOM FUKT** (fynd 25/9 under läsningen av #45). `publish/missar.ts:59` bygger
  `moisture` som `COALESCE(precipitation,'') <> ''` — Trafikverkets "no" (uppehåll) blir fukt, samma fälla som `Boolean(precipitation)`
  (CLAUDE.md). Rekonstruktionen får då frysrisk vid torra stationer, motorn "hade varnat" oftare än den skulle, och missandelen
  ser bättre ut än den är. Enda kvarvarande stället i repot: snapshotkärnan, publicera och mätskripten har DRY-listan. Senast
  ändrad 31/8, före läxan. **Verify:** samma DRY-lista som `publish/snapshot-core.ts`, ett test som fäller "no", och besked om
  `missar.yml` alls körs i dag (annars stängs skriptet i stället).
  ✅ **BEVIS 25/9:** `publish/rekonstruktion.ts` bär `hazardsAt` med snapshotkärnans torrord; provet `#255 rekonstruktionen` grönt
  mot PostGIS i PR #593, och motprovet (PR #594, den gamla formen, osynlig för kontraktsgrinden) föll på `R255-NO`/`R255-DRY`.
  `missar.yml` har inte körts sedan 29/8, men skriptet stängs inte — rekonstruktionen behövs av #363. Resten är #254 (h).
- [x] 🔇 **#227 iOS TYSTNADE MED SLÄCKT SKÄRM PÅ "NÄR APPEN ANVÄNDS" — FIXAT 20/9** (Axels prov på iPhone, DECISIONS #273).
  `GuardManager` satte `allowsBackgroundLocationUpdates` till sant **bara vid Always** — och iOS erbjuder aldrig Always i
  första rutan, så varje ny testare landade i `whenInUse` och fick en vakt som slutade se vägen när skärmen låstes. Apples
  egen dokumentation säger att egenskapen finns just för att *"extend the effectiveness of the authorizedWhenInUse
  authorization while the app is running in the background"*. Nu sant när vakten startas, oavsett auktorisering; självstarten
  är orörd och kräver fortfarande Always. **0.3.9 (12) bär den** (DECISIONS #275, Axels *"vi kör fixen"*). Stängs helt när en resa med *Tillåt när appen används* och släckt skärm ger en hörd varning — den blå indikatorn i statusfältet är kvittot på att Core Location håller appen vid liv.

- [x] ✅ **STÄNGT 22/9** (DECISIONS #305) — 🏷️ **#224 TAVLANS SEKTIONER STÄMMER INTE MED VERKLIGHETEN — 23 av 32 "olåsta" är det inte** (fynd 20/9 när
  Bengt bad om listan på vad som kan göras nu, DECISIONS #261). Sektionen *Claude — olåst* läses som *"det här kan
  Claude göra utan att fråga någon"*. Räknat kort för kort stämmer det för **nio**. Resten fördelar sig så här:
  · **7 kräver ett beslut av er först** — #214 (invariantens lydelse), #216, #198, #151, #146, #32, och #185/#186 vars
    EGEN text säger *"väntar på Bengts och Axels"*. De är alltså inte olåsta, de är låsta av er.
  · **5 väntar på vädret** — #209, #192, #51, #46, #45. De hör hemma i *Claude — låst*, där väderlåsta kort redan står.
  · **4 väntar på en händelse** — #160 (bevisas 21/9), #152 (bevakar taket till 1/10), #52 (når telefonerna med nästa
    bygge), #44.
  · **4 är överspelade** — #53 (Actions-krisen 5/9), minutbantningen, #43, och delar av flera andra.
  · **3 ser byggda ut men står öppna** — se kort #225.
  🎯 **VARFÖR DET SPELAR ROLL:** en sektion som ljuger gör listan obrukbar för planering. Frågan *"vad kan göras nu"*
  fick svaret 32, och det rätta svaret var 9. Skillnaden är inte akademisk — den avgör om ett arbetspass planeras på
  en dag eller på en vecka, och den döljer att **sju kort i praktiken väntar på Bengt och Axel** utan att stå i någon
  av deras sektioner.
  🧭 **MÖNSTRET, femte gången på ett dygn:** #250 sex överspelade kort · #252 två dubbletter · #254 #50 · #256 #76 ·
  nu det här. Alla har samma form: förutsättningen ändrades och kortet stod kvar. TAVELREGELN punkt 3 säger att
  verkligheten flyttar kortet utan att fråga — men ingen rutin läser sektionerna mot korten.
  Verify: varje kort i *Claude — olåst* uppfyller sin egen etikett — inget väntar på ett beslut, på vädret eller på en
  händelse, och inget är överspelat. De överspelade stängda med bevisraden. Antalet i sektionen står i bedömningen §0b
  så att nästa avvikelse syns.
  ✅ **Stängt 22/9 (DECISIONS #305, Bengts "sortera korten som står i fel sektion"):** 22 kort flyttade dit nästa steg finns — 2 till *Claude — olåst* (#203 lager 2, välkomsttexten), 11 till *Claude — låst* med nyckeln utskriven (frosten, 1/10, Axel vid Macen, releasen, betan), 5 till *Bengt* (#233, #218, #198, #146, Danmark-nyckeln), 3 till *Axel — beslut att ta* (#204, #156, #214), 1 till *Axel — därefter* (#210). Varje flyttat kort bär en rad om varför. *Claude — olåst* har nu **7 kort**, alla startbara utan att vänta på någon: #226, #217, #219, #221, #160, #203, välkomsttexten. Inga rader försvann (kontrollerat rad för rad); de överspelade stängdes redan i kortavstämningen (DECISIONS #303).

- [x] 🔍 **#225 TRE KORT SER BYGGDA UT MEN STÅR ÖPPNA — ✅ KLART 20/9, alla tre resolverade** (fynd 20/9,
  DECISIONS #261). Den parallella sessionen har commits för alla tre i dag, men korten är kvar som öppna:
  · **#223** arkivbackupens ålder — commit `7310837` *"vakthunden vaktar arkivbackupens ålder utanför Actions
    (check 9j, gräns 8 dygn, prov ?arkivprov=1)"*.
  · **#210** iOS säger "på väg &lt;null&gt;" — commit `9d3f56c` bär fixen, och `73dca67` säger uttryckligen
    *"#211 stängt, #210 byggt"*. Att det inte stängdes kan vara **avsiktligt**: felet hörs i en telefon, och ett
    bygge som bevisar det finns inte än. Står det så ska kortet SÄGA det.
  · **#212** vektorsviten — commit `88dd32c` *"trösklarna låsta med nio vektorer och en känslighetsmätning i repot"*.
  ⚠️ **Rör dem inte utan att läsa commiten först.** Det här kortet finns för att INGEN ska bygga om något som redan
  är byggt — det kostade två stängda PR:er tidigare i dag (#407, #408).
  Verify: varje av de tre är antingen stängt med sin commit som bevis, eller bär en rad som säger exakt vad som
  återstår och vem som äger det.
  ✅ **UTFALL 20/9 (DECISIONS #273):** **#223** stängt med DECISIONS #262 och commit `7310837` · **#212** stängt med
  DECISIONS #263 och commit `88dd32c` · **#210** står öppet AVSIKTLIGT och bär nu både villkoret (*stängs när ett
  iOS-bygge med 9d3f56c säger en olycka utan vägnummer rätt*) och ägaren (Axel). Farhågan att något byggts två gånger
  besannades inte — den andra sessionen stängde sina kort i samma varv som den byggde.


- [x] 🔇 **#222 TRE CHECKAR I VAKTHUNDEN KAN ALDRIG FYRA — ✅ KLART OCH I DRIFT 20/9** (ur genomlysningen
  20/9, utbrutet ur #50 när dödmansgreppet stängde det, DECISIONS #254). Vakten är numera bevakad, men den ljuger
  fortfarande om tre saker, och alla tre är verifierade i koden:
  · **Check 9c** kräver färre än 4 källor i `sync_state` — men det finns minst 5 (`ingest/db.ts` + `ingest-live`) och
    rader raderas aldrig. Villkoret kan alltså aldrig bli sant. Bortfall av en kursor larmar inte.
  · **Check 9d** läser cron-jobbets status för `halkvakt-ingest-live`, men anropet är asynkront via pg_net —
    *succeeded* betyder *lades i kö*. Ett 500-svar från ingest-live syns aldrig. (Samma läxa som dödmansgreppets
    tredje fråga just löste för vakthunden — lösningen finns alltså redan, den ska bara tillämpas här.)
  · **Check 1** mäter `synced_at`, som sätts vid varje lyckat anrop. En **fastfrusen kursor** (`last_change_id` som
    står still) ser kärnfrisk ut. Ingen vakt mäter att kursorn rör sig.
  · **Mätvakten (6a)** läser schemat ur YAML och `cron.job`, men jämför det aldrig mot `scripts/pulsklocka.ts:NYA`.
    Ett `puls-`jobb som avaktiveras eller raderas faller **tyst ur bevakningslistan** — vakten ser en sen körning,
    aldrig ett försvunnet schema. Dessutom: `runs?per_page=1` tar senaste körningen oavsett trigger, så en manuell
    knapptryckning nollställer klockan, och en hängande körning (`conclusion === null`) passerar båda testen.
  ⚠️ **Kräver deploy av vakthunden** — CLAUDE.md:s regel gäller: `git pull`, diffa mot main, deploya i samma varv,
  och bevisa EFTER deployen med funktionens egna prov, inte med commit-hashen.
  Verify: ett framkallat fel per check ger ett larm — en borttagen kursor i `sync_state`, ett 500-svar från
  ingest-live, en kursor som står still, och ett avaktiverat `puls-`jobb. Fyra prov, fyra larm.
  ✅ **BYGGT, DEPLOYAT OCH BEVISAT 20/9** (Bengts *"kör 222"*, DECISIONS #255, PR #402). Deploy 11:2xZ; beviset är
  vakthundens EGET larmprov EFTER deployen, inte commit-hashen (CLAUDE.md:s regel), och lokala filen diffades mot
  main före deploy — noll skillnad.
  📊 **FYRA NYA RADER MED INNEHÅLL, ur det som faktiskt kör:**
  · `kursorer road_conditions: live 848028 · arkiv 848028` — check 1b. Samma ström, två kursorer; faller livemotorns
    bakom GitHub-ingestens har den slutat röra sig. Jämförelsen görs i SQL: changeid är 19 siffror och spräcker
    JavaScripts heltal.
  · `sync_state: 5 källor (väntade 5)` — 9c. Namngiven lista i stället för `< 4`, som aldrig kunde bli sant.
  · `livemotorns effekt: situation_archive rörd för 3 min sedan (gräns 30)` — 9d (b). Cron-statusen står kvar men
    säger nu i klartext att den bara bevisar att anropet köades.
  · `pulsjobb: 11 aktiva (golv 11)` — mätvakten. Ett avaktiverat jobb faller inte längre tyst ur bevakningen.
  🧪 **VARJE CHECK BEVISAD ATT DEN DISKRIMINERAR** (motfrågor mot drift, inget rört):
  · kursorn: `larmar_nu = false`, men `true` om arkivet går ett enda steg före.
  · 9c: `saknade = []`, men `[kalla_som_fallit_bort]` om en källa läggs till listan och inte finns.
  · effekten: `1 min` nu · **`null` om arkivet vore tomt** (null-grenen larmar) · **`47` om inget rörts på 45 min**.
  · pulsgolvet: `11 aktiva`, larmar inte vid golv 11 men larmar vid golv 12.
  🔒 **PULS_GOLV under kontrakt** (39 kontrakt håller, värde 11). Motprov: 11→12 i vakthunden ⇒ grinden faller;
  ett jobb struket ur `NYA` utan att `ANTAL_NYA` ändras ⇒ pulsklockans egen självkontroll faller.
  ⏭️ **Kvar, som EGEN sak och inte här:** `runs?per_page=1` tar fortfarande senaste körningen oavsett trigger, så en
  manuell knapptryckning kan nollställa mätvaktens klocka. Hängande körningar larmar nu, men triggertypen filtreras
  inte. Litet, och det kräver en till deploy — tas när något annat ändå rör vakthunden.
- [x] 🐕 **#215 VAKTHUNDEN KAN TYSTNA UTAN ATT NÅGON MÄRKER DET — ✅ SLAGET IHOP MED #50 20/9** (Bengts order,
  DECISIONS #252). Genomlysningen lade kortet som ett nytt fynd, men **#50 *Vakthunden är själv obevakad* har ställt
  samma fråga sedan 4/9** — sexton dygn. De tre konkreta defekterna (dödmansgreppet, 9c/9d som aldrig kan fyra,
  pg_cron utan avstämning mot pulsklockans lista) är införda i #50 som avsnittet *GENOMLYSNINGEN 20/9*. Allt arbete
  bokförs där. Se även #87, som är #50:s slut.
- [x] 🙈 **#216 BLINDNINGSLÄCKAN I T-A — ✅ KLART OCH BEVISAT 20/9** (genomlysningen 20/9). `scripts/grind-t-a.ts` skriver ut **hela svepet rangordnat på
  träffandel minus falsklarmsandel** även när domspärren håller, och flödet är tänkt att tryckas inom sju dygn efter varje
  frostnatt — alltså genom hela kalibreringsfönstret. T-A:s svep (fönster · lutning · startband) delar **tre av kombinationens
  sex dimensioner**. När kombinationen kalibreras 1/2 är de dimensionernas utfall redan avläst, rangordnat och loggat i CI.
  Regel D3 ska hindra att samma nätter både väljer och dömer; skyddet är poröst här, och ingen vakt ser det.
  🔑 **Beslut före frosten:** antingen strypa T-A:s utskrift tills domspärren släpper, eller skriva i TROSKLAR-KOMBINATIONEN att
  de delade dimensionerna är förvalda och att kombinationen bara kalibrerar de återstående. Bengt + Axel.
  Verify: raden står i tröskeldokumentet före första frostnatten.
  🔑 **AXELS VAL 20/9 kväll (DECISIONS #265): strypa utskriften** — `grind-t-a.ts` skriver UNDERLAGET och fysikkontrollen men
  svepets tabell först när domspärren släpper. Tre rader kod, tätt. **Väntar på Bengts ja** innan det byggs (mätningen är hans);
  raden i TROSKLAR-KOMBINATIONEN skrivs i samma commit som koden.

  ✅ **BYGGT OCH BEVISAT 20/9** (Axels val, Bengts ja — DECISIONS #265 och #278). Tabellen RÄKNAS alltid, så att
  instrumentet är prövat, men **rangordningen trycks först när domspärren släpper**. Underlaget, täckningen och
  fysikkontrollen skrivs som förut; klarhetsdelens kolumn *fyrade* bygger på svepets vinnare och hålls tillbaka på
  samma sätt, medan antalet frostnätter per molnklass är underlag och står kvar.
  📊 **BEVIS — skarp körning på grenen, domspärren håller (0 frostnätter):** `⊘ INGEN DOM — domspärren i §4 håller` ·
  `SVEPET — 3 × 4 × 4 × 3 = 144 kombinationer` · **`(rangordningen hålls tillbaka — 144 punkter räknade, ingen
  redovisad)`** · `FYSIKKONTROLLEN` skrevs som förut · `klass  frostnätter  (fyrade hålls tillbaka tills domspärren
  släpper)`.
  📜 **TROSKLAR-KOMBINATIONEN bär nu regeln** om delgrindarnas körningar mot D3, i samma commit som bygget — så att
  nästa delgrind som får ett svep vet vad som gäller innan den skriver sin första utskrift.
- [x] ✅ **KLART 24/9** (DECISIONS #347) — 🦌 **#217 PRODUKTBOKEN LOVAR SEX SAKER KODEN INTE GÖR** (genomlysningen 20/9). Hastighetsgränsen i kameratexten **kan aldrig
  sägas** — den publiceras inte, och grenen är död i alla tre motorerna · viltrösten säger "älg" och "den här tiden" fast arten
  läses av ingen adapter och säsongsfältet aldrig sätts (**överdriver vad datan bär — bryter CLAUDE.md**) · fyra flikar utlovas,
  två finns · SMHI sägs gå till motorn men motorn läser den inte · introduktionen i fyra sidor **finns inte på Android** ·
  "23 vektorer" är 24. Dessutom: förvarningsreglaget har olika spann på iOS (400–3000) och Android (500–5000).
  Verify: varje rad i produktboken antingen bevisad i kod eller struken, med färsk skärmbild där det syns.
  🔑 **BESLUTAT 20/9 kväll (Axel via Cowork, DECISIONS #266): viltrösten säger vad datan bär** — *"Viltrisk framöver."* utan
  art, tills en adapter läser arten ur polisdatan. **Bygg nästa varv:** `texts.ts` + Kotlin + Swift, vektor v13 (vilt slår kamera)
  får ny rösttext — den enda gången en frusen vektor får ändras är när regeln själv ändras, och det står här — produktboken i
  samma commit. Vektorantalet i produktboken är 36 sedan i kväll, inte 24.
  ✅ **KLART 24/9 (DECISIONS #347, Bengt: *"gör kort 217"*):** boken läst rad för rad mot koden och apparna — de sex löftena rättade, plus elva fel till (45 s-spärren, grind A *fallen*, Om-citatet, Androids autostart, versionstabellen m.fl.). Skärmbilderna ur fotostudion 23/9 (artefakt 10778151609). Fynden i apparna blev kort #248, #249 och #250.

- [x] ✅ **KLART 25/9** (DECISIONS #351) — 🌵 **#251 GRIND V-B RÄKNAR EN TORR STATION SOM OMÄTBAR — falsklarmen kan vara för få** (fynd 25/9 under kort #42). Väderarkivet
  sparar bara intressanta rader (DECISIONS #4: yta ≤ 5 °C, nederbörd, eller yttemperaturen ändrad ≥ 0,5 °C). En varm, torr och stilla
  station lämnar alltså ingen rad, och V-B1 kallar varningen OMÄTBAR — fast en torr station är just ett falsklarm enligt §2. Första
  körningen 16/9 visade *TORRT = 0* (DECISIONS #212); 25/9 är 16 av 57 varningar och 84 av 98 olyckor omätbara. Regn sparas alltid,
  så facit (#349) påverkas inte. **Förslag, före domen och inte efter:** en station som har arkivrader inom ±3 h men ingen nederbörd
  inom ±30 min räknas som torr; utan rader alls förblir den omätbar. Det rör §2:s mätning, så beslutet är Bengts och Axels enligt §5 —
  och det ska tas medan V-C är spärrad, innan någon sett en andel.
  Verify: självtest med en station som har rader före och efter men ingen inom ±30 min ⇒ TORRT, och en station utan rader alls ⇒
  OMÄTBAR; beslutet i DECISIONS före första dom.
  ✅ **KLART 25/9 (DECISIONS #351, Bengt: *"ja till 251, ±3 timmar"*):** igång men tyst i ±30 min ⇒ TORRT, tyst i ±3 h ⇒ OMÄTBAR. Självtestet fyra nya fall, två motprov fällda på rätt rad, noten i TROSKLAR-VATTENPLANING §2. Syns i drift på måndagens körning 28/9.
  ⚠️ **Rättelse 25/9 (kort #252):** premissen *kalla, blöta eller ändrade* är fel — den levande ingesten sparar inte ändrade avläsningar. Regeln fångar bara en torr station med en kall eller blöt rad inom ±3 h. Rättat i DECISIONS #351 och TROSKLAR §2.

- [x] ✅ **KLART 25/9** (DECISIONS #352) — 🔍 **#252 GRANSKNINGEN AV GRINDARNA 25/9 — fem mätningar har V-B:s sorts fel** (Bengts fråga 25/9; `docs/GRANSKNING-GRINDAR-2026-09-25.md`).
  Inget är en hårdkodad nolla, men: (1) **grind A och vägpunktsgrinden** har prövat en snällare prognos än driftens — varma, torra
  grannar har inga arkivrader och kommer aldrig med, så KLARAD (#321) och ÖPPEN (#324) kan vara för optimistiska; (2) **frostgrindarna**
  (T-A, K-A, R-A, övergångarna, vind och sikt) trycks EN gång vid första frosten och aldrig igen; (3) **S-B** kan inte bli godkänd:
  14-dygnsfönster, C3 kräver ett inmatat tal, B1 cirkulär; (4) **tystnadsfelet** räknar segmentvarningar som tystnad; (5) **raderingen**
  krymper 60-dygnsfönstren tyst när databasen passerar 350 MB (i dag 182 MB). Mätt: vakterna tog ingen äkta frost i september.
  Äldre fel av samma sort: R-A:s spärr i episoder mot stationstimmar, V-A och övergångarnas 0d döljer torrt, andelar under
  spärren i K-A, R-A, W-A och F-A. Förslagen i ordning står i dokumentet och i bedömningen §4.2; inget byggs före Bengts ja.
  Verify: varje förslag antingen byggt med självtest och motprov, eller avskrivet med skäl i DECISIONS.
  🔑 **Bengts ja 25/9 till (1)–(6), Axel inget att invända (DECISIONS #352):** definitionerna står i beslutet före bygget. Byggs i tre PR:er: knapparna (3)–(6), vakthunden (2) med deploy, och mätningen (1).
  ✅ **KLART 25/9 (DECISIONS #352):** (2)–(6) byggda med självtest och motprov (PR #564, #565), S-B och tystnadsfelet körda mot databasen, vakthunden deployad 06:45Z och varvet 07:07Z svarade 200 utan problem. (1) mätt: **10 947 kalla målhalvtimmar** (yta ≤ 5 °C, 60 dygn): av 41 079 grannplatser saknade **20 319 en arkivrad — 49,5 %**; bland de frysnära (yta ≤ 1 °C, 232 halvtimmar) **50,4 %**. Av 5 785 mål med fem grannar hade bara **573 alla fem**, och 966 ingen. Arkivet saknar 6/9 och 7/9. Lagningen av censuren är kort #253.

- [x] ✅ **KLART 25/9** (DECISIONS #365) — 🧰 **#254 GRANSKNINGENS ÄLDRE FEL — de som inte ingick i de sex förslagen** (ur kort #252, `docs/GRANSKNING-GRINDAR-2026-09-25.md` §7;
  ingen av dem orsakad 21–24/9). (a) **V-A** prövar bara timmar där målstationen har en rad och döljer falsklarm (`publish/grind-v-a.ts:48`) —
  nej-domen står ändå, V-A föll på träffen. (b) **Övergångarnas 0d** kastar tysta torra perioder (`scripts/overgangar-steg0.ts:401–408`).
  (c) **Andelar under spärren** i K-A, R-A, vind och sikt och SMHI-förstärkaren; R- och F-dokumenten har egna blindningsklausuler (C4).
  (d) **T-A:s kl 03–07 i UTC-timmar** (`scripts/grind-t-a.ts:164`). (e) **Tystnadsfelet:** en station utan rader gör missen *okänd* och
  radarn prövas aldrig. (f) **S-B:s missfönster** 2 h mot flottans 3,5 h mellan varven. (g) **Den delade facitlistan** orsaksklassar mot
  de åtta närmaste raderna utan avståndsgräns, och en saknad orsak blir utstrålning. (h) **missar.ts** är gammal: egen kopia av tre
  rutter, inga vakter, träff var som helst på rutten — och (nytt 25/9, DECISIONS #364) varje segment oavsett kod, även kod 1 utan
  halkord som snapshoten aldrig publicerar. **(h) är sedan #363 villkor för uppspelningen av W-B5 och roll A**; fukten är redan
  rättad (#255, rekonstruktionen i `publish/rekonstruktion.ts`). Flera av (a), (b) och (e) mildras redan av #353, eftersom de varma stationerna nu
  har rader — det bör mätas innan något byggs.
  Verify: varje punkt byggd med självtest och motprov, eller avskriven med skäl i DECISIONS.
  ✅ **BEVIS 25/9 (PR #595, motprov PR #596):** byggda (d) T-A i svensk tid, (c) spärren före tabellen i K-A, R-A, vind och sikt och
  SMHI-förstärkaren, (g) orsaken från närmaste station inom 50 km, (h) vakterna i rekonstruktionen och missmätningens knapp stängd —
  självtest och prov mot PostGIS för varje, nio motprov fällda på rätt rad. Avskrivna med skäl: (a), (b), (e), (f). Segmentfyndet
  i (h) från #364 var fel: motorn tystar själv kod 1 utan halkord.

- [x] 🌙 **#208 EPISODEN ÄR EN NATT, INTE ETT UTC-DYGN — ✅ KLART 20/9** (Bengts *"ompröva beslutet och byt"*, DECISIONS #245/#246,
  PR #384). Version 1 räknade stationens första ögonblick per UTC-dygn och delade **159 av 454 stationsnätter i två** — 66 % av fallen
  ligger 21–03 UTC. Nu: natt = middag till middag UTC, som T-A; inskrivet i TROSKLAR-KOMBINATIONEN §4 KB-B.
  ✅ **I DRIFT 20/9 07:06Z:** den körande funktionen bär `DISTINCT ON (f.sid, f.natt)` och tolvtimmarsskiftet (läst ur `pg_proc`);
  varianttabellen oförändrad, utfallet blindat. CI `ok 37`; **motprov i CI (PR #385, stängd): per UTC-dygn ⇒ `not ok 37` på raden
  *"G: ingen andra episod efter midnatt UTC"*.** Kontrakt *Nattens gräns* över T-A, R-A och uppspelningen — 36 kontrakt håller.
- [x] 🧷 **#207 FACITKOPPLINGEN I UPPSPELNINGEN — omklassning och olycka inom 5 km från stationen** (upptäckt 20/9 som #206:s rest;
  radien beslutad av Bengt samma dag, DECISIONS #245). Uppspelningen läser i dag bara stationens egen facit (lägsta yta inom 90 min).
  KB-B döms mot hela facitstacken: väglagets omklassningar (`road_condition_history`) och olyckor (`situation_archive`) inom 5 km och
  utfallsfönstret (svep 60 · 120 · 180 min). Kamerabilden väntar på bildfacit-beslutet (bedömningen §4.2, före 1/2).
  ✅ **Olåst 20/9:** episodbeskedet kom — natt, middag till middag UTC (kort #208, DECISIONS #246) — så kopplingen byggs på rätt
  episod från början. **Blindningen gäller:** utfallskolumnerna NULL som standard, inga andelar läses före dom 1.
  Verify: en sats som per variant ger antal episoder med facit per källa (blindat ⇒ NULL); integrationstest med påhittade omklassningar
  och olyckor innanför och utanför 5 km och fönstret; 5 km-kontraktet utvidgat till de nya förekomsterna.
  ✅ **KLART 20/9, I DRIFT 07:48Z (DECISIONS #247, PR #388).** Två kolumner per variant, lästa i (t, t + 90 min] — samma fönster som
  stationens egen facit. Olyckor räknas separat (arkivet bär ingen orsak). Ny synlig kolumn `episoder`. CI `ok 37`, 38 kontrakt.
  **Två motprov:** ordgränsen borttagen ⇒ grinden fäller bygget; radien vidgad till 500 km ⇒ grinden ser inget men provet faller på
  *"bara H"*. **FYND: omklassningarna till halka är NOLL** — hela arkivet har 7 rader på 14 dygn (*Torrt*, *fläckvis Våt*). Inte en
  läcka (arkivvakten #51 frågar rätt fråga; samma tomhet 5/9) men KB-D3:s följd blir konkret. Olyckor: 504. Kopplingen bär: alla 140
  stationer har läge i `weather_latest`. Nattbytet syns nu: *utan faller* 9 stationsdygn ⇒ 7 episoder.
- [x] 🎞️ **#206 UPPSPELNINGENS VARIANTER — instrumentet för dom 1 och dom 2 — ✅ KLART 20/9** (Bengts *"ja gör uppspelningens varianter nu"*,
  DECISIONS #244, PR #379/#381). `uppspelning_efterhalka()` (sql/028): anropet utan argument är kombinationen, varje variant ändrar ETT
  argument, värden utanför de fastställda svepen avvisas (D1 i kod), utfallet blindat tills dom 1 i januari.
  ✅ **I DRIFT 20/9 06:17Z:** 14 dygn — kombinationen 1 stationsdygn · utan faller 9 · utan blöt 7 · radarn +0 · regnmängd ≥ 0,2 mm: 0 ·
  startband +1…+6: 5; `utfall_synligt` = 0. Gamla mätfilen ger samma tre tal. Radarkopplingen bär (110 av 140 stationer har väg inom
  5 km; 118 av 530 stationsdygn hade radarregn) — att radarn inte lade till något är vädret, inte röret. CI `ok 37`, 35 kontrakt.
  🔧 Rättat i samma varv: `>= r` → `> r` som regeln är skriven (TROSKLAR-OVERGANGAR §4), med gränsprov.
  **KVAR (egna trådar):** SMHI-varianten väntar på vintervarningar + `senast_sedd` i värdevakten (bedömningen §0b) · facitstackens tre
  andra källor — ~~väntar på radien~~ ✅ **5 km, Bengt 20/9 (DECISIONS #245)**, inskrivet i TROSKLAR-KOMBINATIONEN §4; bygget är kort #207.
- [x] 🎬 **#205 FOTOSTUDIONS SVAR RÄKNAS SOM RIKTIGT — vidga prov-märkningen — ✅ KLART 20/9** (fynd 20/9 när arkiveringsreceptet
  kontrollerades). Kolumnen `prov` (sql/025, kort #196) matchar bara ordet *prov* i `alert_id`. Fotostudio-kroken på iOS och
  Android lägger in varningen `cam:fotostudio`; ett tryck i simulatorn skickar ett riktigt anrop och landar som ett RIKTIGT
  svar — just den rad som ska bevisa S4 ("ett riktigt svar från en riktig telefon"). Tills det är rättat: titta, tryck inte.
  ÅTGÄRD: sql/027 — `prov` också när `alert_id` innehåller *fotostudio* (genererad kolumn: DROP + ADD i samma migration;
  vakthunden och skuggrapporten läser bara `prov` och rörs inte). Kostnad: en migration via dbknapp + CI, ~3 Actions-min.
  Verify: en rad `cam:fotostudio` får `prov = true`; vakthundsraden räknar den som prov.
  ✅ **I DRIFT 20/9 05:33Z (Bengts "kör", DECISIONS #242, PR #377):** `sql/027` via dbknapp — kolumnen GENERATED ALWAYS med
  *prov ELLER fotostudio*; de två gamla provraderna kvar och märkta (0 riktiga, 2 prov); integrationstestet kört i CI
  (`ok 36`); skuggrapporten läser via REST utan fel (`svar_7d: 0`). Raden med innehåll kommer med Axels tryck i simulatorn.
- [x] 🐕 **#201 VAKTHUNDEN SVARAR INTE INOM 120 S I KASSAVAKTENS TIMME — ✅ KLART 18/9** (fynd 17/9 vid beviset för #196).
  `net._http_response` 05:07:00Z: *"Timeout of 120000 ms reached"* — vakthundens cron (`7 * * * *`) fick inget svar. Körningarna
  04:07 och 06:07 svarade. Kassavakten körs bara när UTC-timmen är 05, 11, 17 eller 23 (`% 6 !== 5`) och räknar Actions-körningar
  dygn för dygn via GitHubs API — troligen det som tar tid. **Okänt:** om funktionen hann klart efter att pg_net slutade vänta,
  och om kassavaktens larm då går ut. **Verify:** läs svaret 11:07Z; tar det över 120 s, mät körtiden och flytta kassavakten till
  en egen körning eller korta den — tills vakthundens svar kommer inom tidsgränsen i alla timmar.
  🔍 **KONTROLLERAT 17/9:** timeout även 11:07Z — mönstret gäller kassavaktens timmar. **Larmet går ut:** kassavakten
  kommenterade issue #210 05:08:15Z och 11:08:21Z, cirka 75 s in i körningen. Kvar: svaret oläsbart för dbknapp var sjätte
  timme, och okänt om kontrollerna efter kassavakten hinner köras. Låg prioritet.
  ⚠️ **18/9 — prioriteten upp:** kassavakten räknar månaden dygn för dygn och sida för sida i följd, så tiden växer
  med månaden (cirka 75 s dag 17, uppskattat 100 s eller mer dag 30). Gratisnivån stoppar funktionen vid 150 s. Sista
  septemberveckan — när taket är som trängst — riskerar kassavakten att stoppas mitt i räkningen, och kontroll 9
  (healthcheckens) och 10 (nyckelkalendern) går efter den. Förslag: hämta dygnen parallellt. Frågan i bedömningen §4.2.
  ✅ **KLART 18/9 (Bengts "kör", DECISIONS #238, PR #348):** sex dygn hämtas samtidigt. Före: ordinarie 05:07Z timeout
  vid 120 s, kassaprovet 05:19Z svarade efter 90–120 s. Efter deploy 05:23Z: kassaprovet svarade inom cirka 70 s med alla
  rader, samma räkning (4 558 min, 3 385 körningar). Ordinarie 11:07Z ska svara utan timeout.
- [x] ⏰ **#200 MARKNADSFÖRINGEN PÅ PULSKLOCKAN — morgonutkasten ska nå pendlingen — ✅ KLART 20/9** (Bengt + Axel 17/9, DECISIONS #226).
  `marknadsforing.yml` är bokad 04:45 UTC ("före pendlingen") men GitHub-cronen levererade den 08:49–10:07 UTC (10–16/9).
  Kostnaden är liten, cirka 20 s per körning. **Åtgärd:** flytta till Supabase pg_cron som FI, DK och regn-30
  (`pulsklocka.yml`, DECISIONS #26/#63) och ta bort `schedule` ur flödet. **Verify:** körningen startar inom 10 min från
  bokad tid tre dagar i rad.
  🔨 **I DRIFT 18/9 (Bengts "kör", DECISIONS #236):** `puls-marknadsforing` (`45 4 * * *`) skapat av pulsklockan 03:53Z
  (fyra pulsjobb OK, alla med nyckel), `schedule` borttagen ur flödet (PR #339). **Morgon 1 (18/9):** start 04:45:09Z (9 s efter bokad tid), grön, utkastet committat 04:45:25.
  **Morgon 2 (19/9):** start 04:45:01Z (1 s efter bokad tid), grön. **Morgon 3 (20/9):** start 04:45:01Z (1 s efter bokad tid), grön, utkastet *Halkläget 2026-09-20* incheckat 04:45:13 (f0053dd).
  ✅ **KLART 20/9 — tre morgnar i rad inom 10 min från bokad tid** (9 s · 1 s · 1 s), mot GitHub-cronens 4–5 timmar. Första
  avläsningen 04:45:30Z fångade körningen medan den pågick, så raden ströks först när slutsatsen fanns.
- [x] 🛰️ **#199 SMHI-VARNINGAR SOM FÖRSVINNER — ingesten stämplar senast sedd — ✅ KLART 17/9** (Bengts ja 17/9, DECISIONS #224/#225).
  Arkivet sparar varje publicering av en SMHI-varning men inte när den försvinner ur flödet. En varning som dras
  tillbaka i förtid ser ut att gälla till sin sluttid, och SMHI-förlängningen (N_varning) skulle mätas fel. Går inte att
  hämta i efterhand — SMHI:s API ger bara nuläget (samma läxa som sql/015).
  🔨 **Bygget 17/9:** `sql/024` — `senast_sedd` på `smhi_warnings_history` (flyttas fram varje synk raden finns i
  flödet) och tabellen `smhi_synk` (en rad per lyckad synk, så "borta" skiljs från "ingen synk" och "tomt flöde").
  `ingest/db.ts` skriver båda; integrationstestet vaktar. **Verify:** efter nästa ingestkörning har aktuella varningar
  `senast_sedd` satt och `smhi_synk` rader med innehåll. Innan N_varning mäts: fältet deklareras i värdevakten.
  ✅ **I DRIFT 17/9:** ingestkörningen 06:11Z stämplade `senast_sedd` på exakt de 15 varningar som fanns i flödet (av 157 i arkivet), och `smhi_synk` fick sin första rad (15 varningar).
- [x] 🧾 **#196 FÖRARFACIT-HYGIEN — klockslaget och provraderna — ✅ KLART 17/9** (fynd 16/9 vid #97:s deploy, DECISIONS #214).
  (1) Vakthundens rad skriver `String(df.senast).slice(0, 16)` ⇒ "Wed Sep 16 2026 " — datum utan tid (min rad, S4 steg 1).
  (2) `driver_facit` bär två PROV och noll riktiga svar: Android `prov` 03:07Z och ett iOS-format serverprov 11:47Z
  (`cam:prov-ios`, version 0.3.6) som INTE går att skilja från ett riktigt svar på version/plattform. Skuggrapportens
  `forarfacit` räknar båda i sju dygn (till 23/9). FÖRSLAG: ISO-tid i raden; prov märks/utesluts (`alert_id` med `prov`)
  eller raderas — radering är Bengts beslut. Bevis: raden visar klockslag; `forarfacit` räknar 0 prov. Kräver vakthund-
  (och ev. skuggrapport-)deploy + prov.
  ✅ **Beslutat 17/9 (Bengt + Axel, DECISIONS #226): märk och uteslut — radera inte.**
  🔨 **BYGGT 17/9 (DECISIONS #227):** genererad kolumn `prov` i `sql/025`; vakthunden räknar bara riktiga svar och visar
  klockslag i UTC; skuggrapporten läser `prov=is.false`.
  ✅ **I DRIFT 17/9:** migrationen märkte exakt de två provraderna (id 1 `prov:kam1`, id 3 `cam:prov-ios`) · deploy av vakthund
  och skuggrapport gröna · skuggrapporten `svar_7d` 2 → 0 · vakthundsraden 06:07Z: *förarfacit: 0 svar · 2 prov uteslutna*.
- [x] 🧬 **#195 VEKTORGENERATORN I OTAKT MED `engine/vectors/` — ✅ KLART 18/9** (fynd 16/9 under #97, DECISIONS #214). `gen-vectors.ts`
  kallar v05 `v05_throttle_45s` (filen heter `v05_throttle_floor_10s`) och saknar v18–v23; en fullkörning skriver en
  spökfil. Nu filnamnsfilter + varning (bara v24 genererades). ÅTGÄRD: för in v18–v23 och rätt v05-namn så att
  generatorn återskapar katalogen. Bevis: fullkörning ⇒ `git status engine/vectors/` tom. Rör inga vektorer.
  ✅ **KLART 18/9 (Bengts "kör", DECISIONS #234):** driften var större än kortet — en fullkörning ändrade också ELVA
  befintliga filer (v01–v04, v11–v17: bearing-vändningen 2/9, vägnumret 2/9, #127). Alla 24 scenarier skrivna ur de
  frysta filerna; v05:s kamera B och v23 byggdes för hand med 111 000 m per grad och återskapas så (`n9`). Generatorn
  skriver bara när innehållet ändrats (arton filer saknar radslut sist, v19 har `4.0`). Bevis: fullkörning ⇒ 24
  oförändrade, 0 skrivna, `git status engine/vectors/` tom; motprov v18 2,5 → 2,6 ⇒ SKRIVEN; `npm test` 109/0.
- [x] 🧬 **#202 VEKTORGENERATORN I CI — fäll när `engine/vectors/` och generatorn glider isär — ✅ KLART 18/9** (fynd 18/9 under #195,
  DECISIONS #234). Generatorn gled isär tre gånger (31/8, 2/9, 13/9) för att vektorfiler skrevs om för hand, och ingen
  vakt såg det. ÅTGÄRD: ett steg i `ci.yml` som kör `engine/gen-vectors.ts` och fäller om `git status engine/vectors/`
  inte är tom. Kostar någon sekund per CI-körning. Bevis: ett mutationsprov (en vektorfil ändrad för hand) ⇒ CI röd.
  ✅ **KLART 18/9 (Bengts "kör", DECISIONS #235):** steget i `ci.yml` + generatorn fäller på vektorfil utan scenario.
  Bevis i riktig CI: provcommiten på PR #341 (v22 handändrad) ⇒ körning 35305862118 röd i steget *Vektorgeneratorn
  återskapar engine/vectors/ (#202)*; återställd ⇒ grön. Lokalt fyra fall (rent, handändrad, utan scenario, ändrat scenario).
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🌡️ **#192 S1 — EFTERHALKANS INDATA I SKUGGLOGGEN** (Bengts "bygg S1 nu" 16/9, Axels grind #196, DECISIONS #198).
  Kolumn `efterhalka` (sql/021): N4:s råa fält per station i korridoren + om motorn larmade. Inget villkor — S2 sätter
  det. Skuggrapporten får `efterhalka`. VÄNTAR: migration 021 + deploy; bevis med innehåll kräver första kalla natten.
  ⏳ DEPLOYAD 16/9 (migration 021: efterhalka jsonb, default []; deploy 02:36Z (skuggmotor + skuggrapport), 02:41Z (rättat prov)). Skuggrapporten bär `efterhalka` (0 stationer i september).
  Bevis med innehåll kräver första station ≤ 3 °C i en korridor — samma natt som N4:s fältbevis.
  ✅ **FÖRSTA RADEN MED INNEHÅLL 16/9** (1 station, `regn_h` satt, `larm: false`). S1 mäter. KVAR före S2: nätter, inte
  ögonblick — Axels grind (#196) kräver att `regn_h` prövats mot verkligheten innan något byggs på det.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** S1 byggt (DECISIONS #198, `sql/021`) och struket i bedömningen §2.1; nätterna före S2 bevakas i §0b (kort #197) och i S3 (#89).
- [x] 🔢 **#189 TRENDARKIVETS FLYTTALSRESTER — ✅ KLART (bevisat 18/9)** (bifynd 15/9 i #192, Bengts ja): `lutning30_c` min −0,7999999999999998 —
  rader från 26 minuter 13/9 innan avrundningen fanns; `dagg_gap_c` var dessutom orundat i skrivaren. BYGGT 15/9
  (DECISIONS #194): gapet avrundas i `trendkandidat.ts`, sql/020 rundar arkivet. VÄNTAR: migration 020 via dbknapp,
  bevis = 0 orundade rader efteråt.
  ✅ **BEVISAT 18/9:** dbknapp 03:42Z (körning 35304213416): **0 orundade av 9 833 rader**, `lutning30_c` min **−0,800**,
  äldsta rad 8/9 kvar. Arkivet är rundat — migrationen har körts, men beviset bokfördes aldrig och kortet stod kvar som väntande.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🧪 **#187 F1: SKATTARENS RÅA INDATA I live.json — `regn_h`, `lutning15/30/60` bredvid `fukt`** (bedömning v3 N4,
  Bengts order 15/9, DECISIONS #188). BYGGT 15/9 i `publish/snapshot-core.ts` (PR #270): null när fönstret är tomt,
  aldrig noll; motorn läser inget; gränsstationer null. `radar_h` UPPSKJUTEN (LATERAL-koppling i publicera var 10:e
  min, ingen CPU-mätning, #176:s WORKER_LIMIT). Regntäckningen 15/9: 13 % på 7 dygn — måttet skiljer inte torrt
  från missat (arkivdieten), S1 är beviset. VÄNTAR: deploy publicera + fälten i live.json med manifest-sha. Sedan
  S1 (skuggan läser fälten) och värdevakten på fälten före S2/S3.
  ⏳ DEPLOYAD 15:52Z, FÄLTBEVIS VÄNTAR: live.json 2026-09-15T16:00:01Z: `weather` **tom** — ingen station ≤ 3 °C klarar givarvakten (lägsta riktiga yta 7,1 °C; Rovaniemi 0,0 °C mot luft 12,6 stoppas av #75). Fälten bevisas i CI:s PostGIS (integration.test.ts) men ÄNNU INTE på CDN. Kontroll: första natten med en station ≤ 3 °C ⇒ läs `weather[0]` i live.json.
  ✅ **VÄRDEVAKTEN PÅ TRENDFÄLTEN 15/9 (DECISIONS #192):** `trend_kandidater` skannades aldrig (saknades i vaktens
  tabellista). Nu sex fält med spann, alla ✅ OK på 7 787 rader — lutning15/30/60 inom −1,7…2,2 °C per fönster.
  Förkravet för S2/S3 uppfyllt. 🕳️ Bifynd: `lutning30_c` min −0,7999999999999998 — skrivaren avrundar inte (13/9-läxan).
  ✅ **FÄLTBEVISET 16/9:** skuggrapporten 12:0xZ 16/9: `efterhalka` **{stationer: 1, med_regn_h: 1, larmade: 0}** — en station i en ruttkorridor bar ett `regn_h`-värde ur en publicerad `live.json`, och motorn larmade inte på den. F1 är därmed bevisad hela vägen: fältet publiceras, når skuggan och loggas.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** F1 klar 16/9 med fältbevis (DECISIONS #188), N4 struken i bedömningen; `radar_h` står kvar som egen §0b-rad.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🔍 **#186 GRANSKNING 15/9 — de förkastade prövade på nytt, och allt bedömningen missade. VÄNTAR PÅ BESLUT**
  (`docs/GRANSKNING-2026-09-15.md`, Bengts order: genomgripande granskning, inget byggt).
  🕳️ **#42 är bedömningens största hål:** fick en rad, har egen byggordning (#81 A–F) där A, B och halva C
  är BYGGDA, V-A föll ×3, radardomen höll, tröskeln 2,0 mm/h kontrasignerad — och motorsteget är ett
  SJÄTTE FARSLAG (F5) enligt kortet, i strid med kartans §7.8. Enda spåret med HÖSTFÖNSTER.
  🚨 **Kartans "radarn ligger redan i telefonen" är halvsann:** `regn` sätts bara på halkklassade segment
  (`snapshot-core.ts:101`). Vattenplaningens segment når det aldrig (#154, bekräftat i koden).
  📊 **Tio tröskeldokument: ett fallit (V-A), noll passerade, nio väntar.** §1.2 täckte fyra av tio.
  ⚖️ **Sjutton förkastanden prövade — alla rätt.** Fyra efterord i kartan fel/överspelade: #96 höjden MÄTER
  fortfarande (lapse 0,63, #45 använder 0,71 → 0,63 beslutat 17/9, #226), `rate_max` SPÄRRAT, oljefilm→#42 överspelad (#155), #94 ÖPPET.
  🐛 **Motorfel kartan missade:** #97 regexen blind för "Rimfrost"/"Halkrisk" · #156 · #44 regnmätarna
  fångar varannan bucket (44 %) · #83 gallringen före första kalla veckan.
  🔑 **Frysklassningens K2 (osäkerhetszon) är exakt det graderade mått E behöver** — redan fastställt.
  17 rättelser (R1–R17) till kartan och bedömningen, nio nya beslut. Två nummerkollisioner: #154 och #103.
  🔁 **§9 ANDRA VÄNDAN 15/9 (Bengts "är allt täckt nu, även kort 95?") — NEJ, SEX HÅL TILL.** #95:s Verify 2 och
  representativitetsradie stod i inget dokument. Tre kort avfärdade OLÄSTA som "inte integration", alla tre var det:
  **#86** PAT 22/11 + Supabase-token 8/12 — fäller allt tyst, vakthunden kan inte larma (samma PAT) · **#51** moaten
  är TOM (830 rader, nyaste 25/8) ⇒ **två av tre facitkällor tomma/stilla**, tredje omätt · **#52** ett test låser
  MOTSATSEN till #45:s vinterbaseline i tre portar (Norrland 31,7 % av sträckan) — "#45 som meta" är låst av en vektor.
  📚 **§10 TREDJE VÄNDAN 15/9 — de nitton olästa korten lästa.** Fyra rör integrationen, tolv inte. **Tre rättar
  min egen granskning:** #44:s 44 % är från FÖRE ingest-live-bytet 9/9 (#79), ny täckning omätt · #83:s gallring
  FINNS (sql/014), frågan är om den räcker · #161:s CRLF är åtgärdat, sex källvakter kan fortfarande aldrig larma.
  🔺 **#32 vill ha ett nytt `HazardKind`** — TREDJE kandidaten till ett sjätte farslag (med #42 D och #45).
  Kartans §7.8 är därmed en åsikt, inte en regel. Kriterium föreslaget: handling · text · prioritet före vektorn.
  📎 **SAMMANSTÄLLD 15/9 (Bengts order före utskick till Axel):** tre vändor ihopvävda per ämne, bara fynd som
  stått sig, rättat står i rättad form. 13 paragrafer, R1–R22, 18 beslut. Drive-kopia uppladdad.
  🗄️ **ARKIVERAD 15/9.** Fynden införda i bedömning v3; R1–R15 i dess bilaga A. Ändras inte mer.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** granskningen arkiverad 15/9 (`docs/GRANSKNING-2026-09-15.md` rad 1, DECISIONS #186 p.4); R1–R16 införda i kartan (#199).
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 📋 **#185 BEDÖMNING 15/9 — förslag till åtgärder ur allt material, VÄNTAR PÅ BENGTS OCH AXELS BESLUT**
  (`docs/BEDOMNING-2026-09-15.md`, Bengts order: analys + förslag, inget byggt). Sorterat i I DAG (T1–T10),
  KORT SIKT (K1–K9), LÄNGRE SIKT (L1–L7), vad som tas bort ur schemat, och sju beslut med rekommendation.
  🔑 **Bärande slutsats:** efterhalkan ligger INNANFÖR produktlöftet ("vid stationen") — stationen ser
  ytan falla efter regnstoppet, motorn gör det inte. Axels "en sak" täpper ett hål i bottenvåningen, inte
  bygger en andra. **Kritisk väg: kamerafacit (#157), 0 objekt** — utan facit kan inget dömas, inte ens
  av Axels egen regel. **I motorns regler: inget i dag.** I snapshoten: publicera skattarens råa indata
  bredvid `fukt` (F1, noll vektorer). I skuggan: bevisa facit, läs `regn`/`smhi` vid sidan av motorn.
  📏 Grind A lever — 14/9: 2 881 p, MAE 0,81 / 5,0 % / 0,6 % = INGEN DOM. Axels brev är i otakt på
  sex punkter (dokumentets §0), och Drive-kopian han läste saknar §13.
  🔄 **v2 15/9 (Bengts order före utskick till Axel):** granskningens rättelser R14–R22 införda. Nytt: alla tio
  tröskeldokument · facitstacken två av tre tomma · `regn` bara på halkklassade segment · K2 som graderat mått ·
  nycklarna #86 · **#42 som eget spår med höstfönster (T0)** · kriterium för sjätte farslag. 20 beslut. §8 = deltat mot v1.
  Kartan orörd — R1–R15 väntar på Bengt. Drive-kopior: karta (nu main @ 0022d92), bedömning v2, granskning.
  📌 **v3 15/9 = DEN ENDA LEVANDE LISTAN** (DECISIONS #186). Nu: 5 rader (kamerafacit, #42 i höstregn,
  nycklarna 15/11, F1 råa indata, §7.8-kriteriet). Senare: efterhalkan som MÄRKT BETA i november med förarfacit
  (S1–S6), dom i januari. Ännu senare: mars. Bengts två beslut: facitknapp med samtycke · beta före grinden.
  ▶️ **NU-LISTAN I GÅNG 15/9 ("då gör vi nu nu"):** N1–N4 byggda i PR #270 (DECISIONS #187–#190), N5 klar. Spårningen
  står i bedömningens §0; deployer och bevis väntar och skrivs in där när de finns.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** alla beslut tagna 17/9 (bedömningen v3, §4.1); kvar av NU-listan är N3, som bärs av #86.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #306) — 🟠 **#160 MÅNDAGSSERIEN KOM 5–7 TIMMAR SENT 14/9 — och mätvakten kan inte se det förrän om tio dygn**
  (morgonavläsningen 14/9 08:00). **DET HÄR ÄR 7/9 OM IGEN, och den gången tog det fem dygn innan en
  människa råkade titta.**
  📏 **RÄTTAT I KVÄLLSAVLÄSNINGEN 14/9 17:30 — DE KÖRDE, DE KOM SENT.** Morgonens dom "körde inte"
  var sann klockan 08:00 och falsk vid dagens slut. Alla sex levererades, och förseningen VÄXER genom
  serien: grind-a 05:40 → **10:57** (+5h18) · smhi-prov 06:00 → **11:10** (+5h10) · cell-matning-v3
  06:20 → **12:52** (+6h32) · trv-bevakning 06:40 → **13:19** (+6h39) · hojd-prov 07:00 → **13:48**
  (+6h48) · grind-v-a 07:20 → **14:08** (+6h48). Fyra gröna; trv-bevakning röd av en annan orsak
  (kort #161), liksom marknadsforing 05:45 → 10:07. **Grind A körde alltså — 2 881 punkter, MAE 0,81 °C
  (A1 KLARAR), grova fel 5,0 % (A2 OAVGJORT), frysklassningsfel 0,6 % (A3 KLARAR) ⇒ INGEN DOM,
  marginalvakten. Vinterunderlaget stod inte stilla; domen gjorde det.**
  **Det ändrar diagnosen men inte åtgärden.** Naken GitHub-cron uteblir inte alltid — den kommer när
  den kommer, och det duger inte för en serie vars sex steg lagts 20 minuter isär just för att de
  bygger på varandra. Samma dygn kom healthcheckens tre cron-körningar 32 min, 39 min och 1 h 51 min
  sent, medan pulsklockans nio låg på sekunden (:23:01). Pulsen levererar; cronen lovar.
  Åtgärd (a) står oförändrad. (b) blir VIKTIGARE, inte mindre: en vakt som mäter ålder kan inte skilja
  "uteblev" från "kom sju timmar sent" — och det var det senare som hände.
  **FAKTA (morgonens bild, 08:00):** ingen av de sex hade kört — grind-a 05:40, smhi-prov 06:00, cell-matning-v3 06:20,
  trv-bevakning 06:40, hojd-prov 07:00, grind-v-a 07:20. Klockan 08:00 fanns 40 körningar på dygnet
  och noll ur serien. Alla sex flöden är `state=active` och cron-raderna står rätt på main. Det är
  alltså inte avstängning och inte ett schemafel.
  **ROTORSAK: naken GitHub-cron levererar opålitligt.** #70 mätte 40 % leverans; i dag levererade den
  allt, 5–7 timmar sent. Att healthchecken lever
  beror inte på tur — den fyras av PULSKLOCKAN ur pg_cron, och en av dess egna cron-körningar kom i
  dag 39 min sen (bokad 04:23, levererad 05:02). Måndagsserien har ingen puls bakom sig.
  **OCH VAKTEN SER DET INTE.** Mätvakten (check 6) bevakar precis rätt sex flöden, men larmar på
  `ålder > kadens × 1,5`. För ett veckojobb är kadensen 168 h ⇒ **tolerans 252 h = 10,5 dygn.** Dess
  kommentar 07:07 i dag nämner bara `marknadsforing`. Vakten som byggdes för exakt det här felet är
  blind för det i tio och ett halvt dygn — sämre än de fem dygn det tog en människa 7/9.
  📏 **15/9 04:45: inget svar ännu.** Ingen DECISIONS-post efter #185, inga commits som rör vare sig
  pulsklockan eller mätvakten (parallellsessionen har kört granskningsdokument, #259–#264). Natten
  gav mer av samma mätning: healthcheckens pulskörningar 18:23, 20:23, 22:23, 00:23, 02:23 och 04:23
  låg alla på :23:01–:23:02, medan GitHub-cronens två kom **1 h 02 min** (19:25 mot bokat 18:23) och
  **47 min** (23:10 mot 22:23) sent. Sex av sex på pulsen, noll av två i tid på cronen.
  🔑 **TVÅ ÅTGÄRDER, båda Bengts beslut — jag har inte rört koden:**
  · **(a) Lägg de sex på pulsklockan**, som healthcheck, ingest och grannar redan ligger. Beprövad
    väg, noll nya minuter, och den fyrar oavsett vad GitHub-cronen gör.
  · **(b) Ge mätvakten en FAST frist i stället för en multiplikator** — t.ex. `kadens + 3 h`. För ett
    timjobb blir det nästan oförändrat; för ett veckojobb blir en missad måndag synlig samma kväll i
    stället för om tio dygn. En multiplikator skalar tolerans med kadens, vilket är precis fel håll:
    ju sällsyntare mätningen är, desto viktigare är varje enskild körning.
  Verify: (a) nästa måndag går alla sex utan knapptryck; (b) ett flöde vars körning uteblir en gång
  ger en rad i mätvakten inom ett dygn, prövat med matvaktprov.
  🔍 **18/9 — ett tredje led krävs, (c):** mätvakten läser schemat bara ur flödenas cron-rader. När #200 flyttade
  marknadsföringen till pulsklockan föll den ur bevakningen i tysthet, och flyttas måndagsserien likadant blir vakten
  blind för alla sju (grind-v-b kom till 16/9). (c) = vakten läser också pulsklockans jobb (`cron.job`, `puls-%`).
  Frågan står i bedömningen §4.2: (a)+(b)+(c) i ett grepp före måndag 21/9.
  🔨 **BYGGT OCH I DRIFT 18/9 (Bengts "kör", DECISIONS #237, PR #344):** (a) sju pulsjobb för måndagsserien, (b) fast
  frist kadens + 3 h, (c) mätvakten läser pulsklockan. Bevis: vakthunden 04:47Z *mätvakten: 11 schemalagda flöden (11 via
  pulsklockan), 0 med problem* (8 i morse). **Kvar: måndag 21/9 — alla sju ska starta inom minuten.**
  ✅ **Stängt 22/9 (DECISIONS #306):** **(a)** 21/9 startade alla sju 1–45 s efter bokad minut, alla gröna, via pulsklockan: grind-a 05:40:43 · smhi-prov 06:00:01 · cell-matning-v3 06:20:01 · trv-bevakning 06:40:45 · hojd-prov 07:00:01 · grind-v-a 07:20:43 · grind-v-b 07:40:44 (`scripts/matningar/mandagsserien-2026-09-22.py`). **(b)** `matvaktprov` 22/9 14:16Z (körning 35739124629): issue #482 öppnad 14:16:29Z med provraden, stängd 15:07:04Z av nästa gröna timkörning (`scripts/matningar/matvaktprov-issue-2026-09-22.py`). Fristen är fast 3 h (`MATVAKT_FRIST_H`), så en utebliven måndag syns 3 h efter sin bokade tid. **(c)** i drift sedan 18/9: *mätvakten: 12 schemalagda flöden (11 via pulsklockan)*.
- [x] 🧱 **#161 EN CRLF-FIL FÄLLER VARJE FLÖDE SOM COMMITTAR TILLBAKA — ✅ KLART 18/9 — och sex källvakter har
  aldrig sparat sitt state** (fynd + rotorsak i kvällsavläsningen 14/9).
  **SYMTOM:** `trv-bevakning` och `marknadsforing` faller i sitt commit-steg med
  `error: cannot pull with rebase: You have unstaged changes.` — EFTER att deras egen commit gått
  igenom. Röda dygn: marknadsforing 6, 7, 8, 13 och 14/9; trv-bevakning båda sina schemalagda
  körningar (7/9, 14/9). Det är precis de två enda flöden i repot som gör `git pull --rebase`.
  **ROTORSAK, MÄTT LOKALT 14/9:** `android/gradlew.bat` ligger i git med CRLF i bloben, medan
  `.gitattributes` (infört 12/9) säger `*.bat text eol=crlf`. Rengöringsfiltret normaliserar
  arbetsträdets CRLF till LF före jämförelsen, LF ≠ blobens CRLF ⇒ filen är PERMANENT ändrad så
  snart git gör en innehållsjämförelse i stället för att lita på stat-cachen. Bevis:
  `touch android/gradlew.bat && git status` ⇒ ` M android/gradlew.bat`; `git diff --stat` ⇒
  94 +/94 −, enbart radslut; `git ls-files --eol` ⇒ `i/crlf w/crlf` — index och arbetsträd båda CRLF,
  vilket är exakt det attributet förbjuder. Det förklarar också varför felet är NYCKFULLT: det syns
  bara när stat-cachen inte räcker till, och det avgörs av under-sekund-timing på löparen.
  ✅ **ÅTGÄRDAT I SAMMA VARV:** `git add --renormalize android/gradlew.bat` ⇒ `i/lf w/crlf`, som
  attributet föreskriver. Ingen funktionell rad ändras — bara bloben.
  ⚠️ **DEN DYRA FÖLJDEN — ett tyst ALDRIG:** `trv-bevakning` skriver sitt state och committar det,
  men pushen nås aldrig. Källvakten breddades 12/9 (6354771) från 7 till 13 källor. State-filen på
  main bär fortfarande **7 källor**, senast skriven 12/9 06:52. De sex nya — `smhi-uppdateringar`,
  `fi-digitraffic`, `no-vegvesen`, `dk-dmi`, `polisen-regler`, `polisen-api` — seedar om sig varje
  körning ("första körningen — seedar utan larm" står i dagens logg) och kan därför ALDRIG larma.
  Vakten ser levande ut och bevakar sex källor i tomma luften. Samma familj som CDN-fail-soft-läxan.
  📏 **MORGONEN 15/9 — VAD SOM ÄR BEVISAT OCH VAD SOM INTE ÄR DET.**
  BEVISAT på disk: `git ls-files -z | xargs -0 touch` följt av `git status` ger **tomt** — efter en
  tvingad innehållsjämförelse av varje spårad fil är INGEN smutsig, och `git ls-files --eol` visar
  noll `i/crlf` kvar (414 lf, 498 binära, 24 tomma). gradlew.bat var alltså den enda filen med
  felet, och den är lagad.
  INTE BEVISAT: att driften läkt. `marknadsforing` är bokad 04:45 UTC och hade inte kört kl 04:40 —
  i går levererade cronen den 10:07, alltså 5 h 22 min sent. Beviset är en GRÖN körning med ett
  genomfört commit-steg, inget annat. `trv-bevakning` kör bara måndagar: state-filen på main bär
  fortfarande 7 källor (skriven 12/9 06:52), och 13 källor kan tidigast synas **21/9**. Fram till
  dess är de sex källvakterna fortfarande blinda — fixen är lagd, inte verifierad.
  ✅ **BEKRÄFTAT I DRIFT 15/9 09:35 — rotorsaken var rätt.** `marknadsforing` #22 (körning
  34953342840) gick **grön**, och beviset är inte färgen utan commiten: **`3a3622f` "Halkläget
  2026-09-15" av Marknadsmotorn ligger på main**, alltså gick hela kedjan commit → `git pull
  --rebase` → `git push` igenom. Föregående commit från samma författare är `1112af3` från **12/9** —
  13/9 och 14/9 saknas helt, precis som de röda körningarna sa. Ett dygn efter renormaliseringen
  landar utkastet igen, utan att en rad i flödet rörts.
  ⏳ **KVAR ATT BEVISA:** `trv-bevakning` kör bara måndagar. Tidigast **21/9** kan state-filen visa
  13 källor i stället för 7, och först då är de sex källvakterna bevisligen seende. Halva kortet är
  alltså klart, halva väntar på en måndag.
  📏 Sidomätning till #160: cronen levererade marknadsforing **4 h 50 min sent** (bokad 04:45,
  levererad 09:35). I går 5 h 22 min. Två dygn i rad, samma storleksordning.
  🔑 **TVÅ FRÅGOR TILL BENGT — jag har inte rört flödena:**
  · **(a)** Ska commit-stegen härdas? De stagar en enskild sökväg och antar att resten av trädet är
    rent. `git pull --rebase --autostash` (eller `git stash -u` före pull) gör dem okänsliga för
    nästa smutsiga fil — och det kommer en nästa.
  · **(b)** Ska steget skriva ut `git status --porcelain` när det faller? Loggen säger "You have
    unstaged changes" utan att nämna VILKEN fil; det kostade ett diagnosvarv, precis som
    "TRV 400" utan svarskropp gjorde.
  Verify: (a) nästa trv-bevakning-körning pushar ett state med 13 källor; (b) ett framtvingat fel
  visar filnamnet i loggen.
  ✅ **(a) BEVISAT (upptäckt 18/9):** `ingest/trv-nyheter-state.json` bär 13 källor sedan den manuella körningen
  16/9 02:44 (commit 1284e82). **(b) ej gjort:** `marknadsforing.yml` och `trv-bevakning.yml` gör fortfarande naken
  `git pull --rebase` utan `--autostash` och utan `git status --porcelain` i fel-grenen — frågan i bedömningen §4.2.
  ✅ **(b) KLART 18/9 (Bengts "kör S7", DECISIONS #239, PR #351):** båda flödena gör `git pull --rebase --autostash` och
  skriver ut `git status --porcelain` när de faller. Provat lokalt: gamla raden exit 128 på en smutsig fil, nya raden
  pushar, fel-grenen skriver ut filnamnet. Första skarpa körningen: marknadsföringen 19/9 04:45Z.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🕳️ **#154 STEG C:s REGNFÄLT NÅR INTE DE SEGMENT VATTENPLANINGEN SITTER PÅ** (fynd i
  kvällsavläsningen 13/9, oprövat av mig i kod — lämnas till den som äger steg C).
  `publish/snapshot-core.ts` sätter `regn` på raderna ur väglagsfrågan, och den frågan hämtar bara
  segment med `condition_code >= 2` ELLER ett is/snö/halka/frost-ord i info (rad ~101). Ett segment
  som är NORMALT klassat men vått kommer alltså aldrig in i snapshoten, och kan därför aldrig bära
  `regn`. Vattenplaning uppstår just på en normalklassad blöt väg.
  BEVIS I DAG: SE live.json 17:30 har **0 segment** — fältet är osynligt i produktion, och skulle
  vara det även under regn. Samtidigt såg radarn 124 segment med regn ≥ 0,1 mm/h i senaste bilden.
  🔑 FRÅGA TILL BENGT/ÄGAREN AV STEG C, inte en fix: ska väglagsfrågan vidgas med "eller regn över
  tröskeln", eller ska steg D läsa radar_precip direkt i stället för via snapshoten? Det första gör
  snapshoten större (kostnad per användare), det andra ger två läsare av samma fält och bryter
  en-skrivare-regeln i #81 regel 2. Verify: ett regnigt dygn där minst ett normalklassat segment
  syns i live.json med `regn` satt.
  ✅ **BYGGT 15/9 SOM EGEN NYCKEL `rain_segments` (bedömning v3 N2, DECISIONS #187, PR #270):** den vidgade WHERE:n
  stoppades — varje rad i `segments[]` blir en varning i motorn OCH båda portarna (falsklarm på blöt normalväg i
  höstregn). Nyckeln når ingen port; skuggan kan läsa den (steg E). VÄNTAR: deploy publicera + nyckeln i live.json.
  ✅ I DRIFT 15/9: live.json 2026-09-15T16:00:01Z (manifest-sha STÄMMER): **`rain_segments` 34 st** — t.ex. segment 16010 E16, kod 1 "Torrt", `regn` 3,1 (= 2,0 rå); `segments` 0 st, som förut i september. Steg E (skuggan läser `rain_segments`, V-B) är nästa länk.
  ✅ **BENGTS JA 15/9 + STEG E BYGGT (DECISIONS #191, PR #274):** skuggmotorn kör en egen motorinstans över
  `rain_segments` och loggar vad rösten SKULLE sagt i kolumnen `vb` (sql/019); bilens position går till facit.
  Skuggrapporten får `vattenplaning`. VÄNTAR: migration 019 → deploy skuggmotor + skuggrapport → första `vb`-raden.
  ✅ STEG E I DRIFT 15/9: första `vb`-raderna 17:30Z: **5 skuggvarningar** (E18 Karlstad→Örebro, 5 st, regnsegment 18060/18065/18067) i skuggrapportens `vattenplaning`.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** `rain_segments` i live.json 15/9 med rätt manifest-sha (DECISIONS #187), steg E i drift (#191); V-B:s dom bärs av #42.
- [x] 🗺️ **#102 RUTTBEREDSKAPEN — vilken av skuggflottans tjugo bilar kan pröva vilken grind**
  ✅ **KLART 12/9 kväll** (Bengts order "gör beredskapstabellen", DECISIONS #124).
  `scripts/ruttberedskap.ts` + knapp, helt läsande. **Rutterna läses UR skuggmotorn, kopieras
  inte** — självtestet fäller om parsningen slutar hitta dem, och det är driftvakten.
  🏆 **GRIND A: E4 Umeå→Luleå — 58 % av rutten i det OFÖRKLARADE 7–15 km-bandet.** Tvåan och
  trean ligger på 53 och 50 %. Det är den bilen som kan säga något om varför mittenbandet föll
  sämst (MAE 1,41 °C, 18,4 % grova fel, #119).
  ⚠️ **MEN: de rutter som kan pröva de svåraste frågorna har tunnast underlag.** E4 Umeå→Luleå
  har 10 stationer inom räckvidd; E10 Luleå→Kiruna — den kallaste — har 6, och 49 % av sin längd
  bortom 20 km från närmaste ankare. Glest stationsnät är både orsaken till ankarproblemet och
  hindret för att mäta det.
  🐛 **FÖRSTA KÖRNINGEN FÄLLDE TVÅ AV SINA EGNA DOMAR** (PR #173, båda lagade med vakt +
  självtest): (1) **rätt vakt på fel nämnare, tredje gången på tre dygn** — T-A-domen utsåg
  E6 Malmö→Halmstad på EN frostrad vid 0,0 °C; vakten räknade stationer, inte frostrader.
  Golv 20 frostrader; under det rangordnas på kallaste yta, märkt OMBUD. (2) **tabellen läste
  inte sitt eget tröskeldokument** — W-A-domen utsåg E4 Södertälje→Uppsala på **55,1 m/s** byvind
  (Sveriges rekord ≈ 81, och då på fjällstation). TROSKLAR-VIND-SIKT §3.1 hade redan skrivit att
  vakten behöver ett tak. Rangordning nu under 30 m/s, råmax bredvid som givarmisstanke.
  🔭 **ATT FÖLJA UPP I VINTER:** tre rutter skär NOLL arkiverade varningsområden — E4 Umeå→Luleå,
  E10 Luleå→Kiruna, E14 Sundsvall→Åre. Sommarvarningarna är sydliga, så det är sannolikt
  årstiden — men det är just de tre förstärkaren (#95 d) behöver. Skillnaden mellan "inga
  varningar ännu" och "polygonerna matchar inte däruppe" syns först vid första snövarningen.
  🔁 Kör om när vintern satt sig: ankarbanden vandrar med stationsbortfall.
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
- [x] 🐕 **#76 Vakthunden i Supabase mäter fel led — ✅ KLART, BEVISAT 20/9 (beviset fanns sedan 16/9)**
  Led 3 hämtar nu manifest.json och jämför sha256 med live.json. Stängs när vakthunden
  bevisligen larmat OCH tystnat på riktiga data (issue med etiketten vakthund), inte förr.
  URSPRUNGLIGT FYND (8/9 13:35,
  läst mot grunden vid bedömningen av Axels lägesrapport). Terminalvarvets `vakthund`
  (DECISIONS #73b, 8/9) kollar led 3 "når det appen?" genom live.json:s generated_at på CDN.
  Men appen tar inte emot live.json, den tar emot live.json OM manifestets sha256 stämmer.
  Uppmätt 13:35 i kartrepot: live.json 6 min gammal, manifest.json från 5/9, sha MISMATCH ⇒
  båda apparna förkastar och behåller 5/9-snapshoten. Vakthundens "första körningen grön —
  CDN 6 min" är alltså exakt den blinda fläcken: den friar ett led som är brutet.
  VÄG: led 3 = hämta manifest.json OCH live.json, jämför sha256, larma vid mismatch eller
  om manifestets generated_at är gammalt. Tre rader. Verify: vakthunden ska larma på dagens
  läge (mismatch) och tystna först när den nya publicera deployats.
  LÄGET 13:35: nya publicera (#74, mergad 12:55) är INTE deployad — kartrepots commits
  13:00–13:30 skriver fortfarande bara live.json, vädret är fortfarande enbart Storvik −10,7.
  ✅ **BEVISET, hittat 20/9 på Bengts *"kör 76"* (DECISIONS #256) — det fanns redan, fyra dygn gammalt.**
  Kortets villkor var *larmat OCH tystnat på RIKTIGA data (issue med etiketten vakthund), inte förr*. Det uppfylldes
  **16/9**: **issue #317**, öppnad av den schemalagda timkörningen **21:07:49** med raden
  *❌ **Appen får gammal data**: manifestet 47 min gammalt (publiceras var 10:e min)* — och **stängd 22:07** av nästa
  gröna körning. Inget larmprov, ingen knapp: led 3 larmade på verkligheten och tystnade när den rättade sig.
  Av tio vakthund-issuer i repots historia är #317 den enda som fällde på just led 3; #332 fällde på databasen
  (168 MB) och #334 på väderdatan (137 min) — också riktiga, men andra led.
  ✅ **Och deployen, som stod som obevisad sedan 8/9:** vakthundens eget larmprov 20/9 10:42 bär raden
  `manifest: 2 min | sha stämmer` ur det som faktiskt kör. Båda grenarna finns i driftkoden: ålder på
  `generated_at` OCH sha256-jämförelsen, plus svarskoderna för manifest.json och live.json.
  ⚠️ **Fjärde gången samma dag:** kortet var stängbart 16/9 och stod öppet i fyra dygn. Samma mönster som de sex
  överspelade korten (#250), de två dubbletterna (#252) och #50 (#254). TAVELREGELN punkt 3 säger att verkligheten
  flyttar kortet utan att fråga — men ingen läser issue-historiken mot korten.
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
- [x] 🛑 **#53 HELA PIPELINEN STÅR — ✅ ÖVERSPELAT, STÄNGT 20/9** (upptäckt 5/9 ~15:40 via
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
  ✅ **STÄNGT 20/9 SOM ÖVERSPELAT (DECISIONS #273).** Pipelinen står inte: **94 körningar senaste dygnet**, alla gröna
  utom dagens medvetna motprov. Kortet var en DIAGNOS av ett avbrott 5–8/9, och avbrottet är över. Det som kortet
  egentligen oroade sig för — att taket slår i osett — har fått en egen vakt: **#152 kassavakten** (check 8, larmar
  innan taket nås) och den dagliga avläsningen i bedömningens lägesruta. Historiken står kvar som den skrevs.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 💸 **Minutbantning av GitHub-pipelinen** (6/9, följd av 🛑-kortet; byggs OAVSETT Axels val, släpps
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
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** överspelad (DECISIONS #261): publish-map och ingest-fi/no/dk borta, regn-30 utan cron, grannarna och publicera i Supabase (#301); kvarvarande oro bärs av #152.
- [x] ↪ **SAMMANSLAGET 22/9** i *#209 Bildfacitbeslutet* (DECISIONS #303) — 🚨 **#51 Vinterarkivet skrivs nästan inte — moaten läcker** (fynd 4/9 kväll, svep
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
  📊 **MÄTT 20/9 (DECISIONS #247/#252) — tystnaden har nu ett tal, och kortet kopplas till facitraden.**
  Uppspelningens facitkoppling räknade `road_condition_history` över 14 dygn: **0 omklassningar till halka**, och
  **hela arkivet 7 rader från 7 vägavsnitt** — orden är *Torrt* (7) och *fläckvis Våt* (6). Olyckor finns det 504 av,
  men de bär ingen orsak och får aldrig bära en dom ensamma. Det bekräftar kortets egen slutsats från 5/9:
  omklassning är ett VINTERfenomen, och arkivet förblir tyst tills det fryser.
  🔗 **KOPPLINGEN, som saknades:** det här kortet ÄR facitraden i bedömningen (*Facitstacken för domarna*) och
  förutsättningen för **kort #209**. Regel KB-D3 säger att förarfacit ensamt varken fäller eller friar — **förblir
  omklassningarna tomma blir januaridomen OAVGJORD hur många förare som än svarat *Stämde***. Därför flyttades
  bildfacitbeslutet 20/9 från 1/2 till sju dygn efter första frosten (#248): är källan lika tom då måste
  kamerabildsgranskningen byggas i november.
  Verify (ny, ersätter *nyttan går inte att mäta förrän strömmen lever*): antal omklassningar till halka inom 5 km
  och utfallsfönstret från en episod, mätt under de första frostnätterna i samma varv som T-A steg 0. Talet avgör #209.
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** samma mätning i båda Verify-raderna: omklassningarna till halka inom 5 km under de första frostnätterna. Det som återstår bärs av *#209 Bildfacitbeslutet*.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — ⚠️ **#52 Ett test låser fast motsatsen till vinterbaseline-principen** (samma svep,
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
   🧪 **KODGRINDEN BYGGD + KÖRD 11/9 04:25** (PR #104, mergad av Bengt 04:24, parallell Claude-session —
   kortraden saknades, bokförd här av morgonavläsningen). scripts/kodgrinden.ts + knappen kodgrinden, helt
   läsande, knapp inte cron. Arkivet: 830 rader / 818 segment / 185 dygn (21/2 → 25/8; inga omklassningar
   sedan). A KODHÅLET: 0 rader och 0 segment utan kod. B ORDFÖRRÅDET på kod 1: 838 förekomster, ALLA neutrala
   (799 Torrt, 25 Våt, 14 fläckvis) — noll yta, noll farlighet. C PREMISSEN "Trafikverket lämnar aldrig ett
   farlighetsord på kod 1": **OAVGJORT, inte "håller"** (rättat 11/9, PR #105). Noll träffar i ett arkiv med
   noll vinterord är ett utsagolöst noll, inte ett stöd — läxan i DECISIONS #71. Skriptet skrev först
   "håller så långt arkivet räcker"; vakten räknar nu vinterorden och rapporterar OAVGJORT när de saknas.
   Premissen är alltså OPRÖVAD, och beslutet nedan kan inte tas på det här underlaget. D varaktighet: 12 övergångar,
   median 2 803 h — arkivet är för tunt för en tidsgränsdom. MÄTNINGENS GRÄNS: "Packad snö" på kod 1 finns
   inte i arkivet förrän det snöat; C prövas på höstens is/frost, en analogi. Bifynd ur självtestet ⇒ kort #97.
   ❄️ **VINTERLARMET I VAKTHUNDEN, DEPLOYAT + BEVISAT 11/9 04:53** (Bengts "lägg larmet i vakthunden
   istället", PR #108). Mätningen kan inte falsifiera sin premiss förrän arkivet bär vinterord, så
   utlösaren är första vinterordet — inte en kalender. Den veckokadens jag föreslagit (nio måndags-
   körningar till 1/11) är **struken**: den hade betalat minuter för att mäta ingenting tills det snöar.
   Vakthunden larmar via issue utan en enda Actions-minut (#73b). Egen etikett `vinterord`, egen issue,
   ENGÅNGSLARM (letas i state=all). Det är en HÄNDELSE, inte ett fel — den färgar aldrig vakthunden röd.
   Faller larmvägen hamnar DET i problem[], för ett vinterord som passerar obemärkt är just vad kortet
   ska förhindra. Issuens kropp bryter ner förekomsterna per kod, så det syns direkt om ett farlighetsord
   står på kod 1 (⇒ nivådelningen faller, regional gräns blir alternativet). Prov: `?vinterprov=1`, egen
   etikett så provet inte förbrukar engångslarmet; båda etiketterna skapade i förväg (läxan från #73b:s
   första larmprov som gav 500). **BEVIS, inte deploy-kvittot:** vakthundens larmprov 04:53 (issue #109)
   visar raden `vinterord i väglagsarkivet: nej` bland mätvärdena — nya koden kör skarpt i Supabase.
   ⚠️ INTE samma sak som marknadsföringens `snolarm`, som fyrar på `code !== 1` ur CDN-snapshoten
   (säsongens första verkliga halka per län, ett säljtillfälle). Det här läser ARKIVET oavsett kod, och
   den intressanta cellen för #52 är kod 1 — den som snölarmet per konstruktion hoppar över.
   ✅ **VINTERPROVET KÖRT 11/9 05:02 — LARMVÄGEN BEVISAD FÖRE SNÖN** (Bengts "kör vinterprovet",
   PR #111). Larmet fyrar EN gång per säsong; ett larm som aldrig fyrat är inte bevisat, och #73b:s
   första larmprov gav 500 i stället för larm. Här hade ingen kunnat prova förrän snön kom, och då
   är signalen redan förbrukad. DB-knappen fick därför flaggan `vinterprov` (vitlistad, läggs på
   vakthundens EGET cron-kommando — nyckeln passerar aldrig en logg; vitlistan ligger FÖRE
   databasfrågan så en felstavning faller på en rad och går att prova utan DATABASE_URL).
   **UTFALL:** issue #112 skapad med etiketten `vinterord-prov`, det riktiga engångslarmet
   `vinterord` ORÖRT (noll issues) — provet förbrukade det alltså inte. Tabellraden visade
   "(inga rader; detta är ett prov)", som den ska när arkivet saknar vinterord. #112 stängd.
   BONUSBEVIS i samma varv: larmprovets issue #109 stängdes automatiskt 05:00 av nästa gröna
   timkörning ("Stänger — allt grönt igen"), så även STÄNGvägen är bevisad, inte bara öppnandet.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** v24 i tre portar, byggd, godkänd och deployad 16/9 (DECISIONS #214, PR #306); spak 2 förkastad (#103), spak 1 bärs av #45.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 📡 **#43 Radarn som infrastruktur** (Bengts beställning 2/9, efter cellmätningens
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
  ⚖️ **DOMSUNDERLAGET FRAMLAGT 13/9 01:10 — Bengts order "jag vill ha domen idag".** Domen var bokad
  till måndag 14/9 08:30; måndagsserien kör inte på en söndag, så cell-matning-v3 och grind-v-a
  trycktes för hand (körning 34729680622 och 34729681410, 2 Actions-min). INGEN DOM FÄLLD HÄR —
  den är Bengts och Axels, underlaget är mitt.
  **GRINDEN ur RADAR-PLAN.md steg 3→4 har två delar. Båda är nu uppmätta:**
  · **(1) KALIBRERINGSKURVAN.** Färsk körning 13/9 01:07, 7 dygn (8/9 23:10 → 13/9 00:05),
    98 kompositer, 13 577 radar↔station-par:
    `0,1–0,5 mm/h  n=4852  station såg regn 42 %`
    `0,5–2         n=4055                   56 %`
    `2–10          n=3852                   77 %`
    `≥10           n= 818                   82 %`
    Kalibrering median **0,65** över 7 931 par (1,0 = Marshall–Palmer exakt). Missriktning: radarn
    hade rad ≤ 5 km vid **91 %** av 15 540 stationsregn.
    🔁 **STABILITETEN ÄR SJÄLV ETT BEVIS:** gårdagens oberoende körning på ett förskjutet fönster gav
    39/54/73/79 %, kalibrering 0,66, täckning 93 %. Två fönster, samma kurva. Den stiger monotont med
    intensiteten — det är den fysiska signaturen domen letar efter.
  · **(2) FRITIER-FÖRBRUKNINGEN EFTER 1 VECKA.** Ur ingest 13/9 00:11: `radar_precip senaste dygnet:
    2029 rader över 24 kompositer`. Alltså ~2 000 rader/dygn ≈ 0,3 MB/dygn ≈ 9 MB/mån mot gratisnivåns
    500. Händelsefiltret håller: 124 av 818 segment hade regn ≥ 0,1 mm/h i senaste bilden, 13 049
    provpunkter, 84 utanför täckning. Grids lagras aldrig. **Fritier-lagen hålls med marginal.**
  ⚠️ **TVÅ SAKER SOM MÅSTE MED I DOMEN, båda upptäckta efter att grinden skrevs:**
  · **Artefakten (DECISIONS #134):** `radar_precip.rate_max_mmh` går till 727,54 mm/h. Världens
    extremvärden ligger kring 150–200 för en femminutersskur. Fältet står som UTANFÖR SPANN (0–200)
    tills någon läst raderna. Kalibreringen ovan är mätt på `rate_mean_mmh`, inte på rate_max —
    artefakten sitter alltså i ETT ANNAT FÄLT än det domen vilar på, men i det fält en utlösare
    troligen skulle läsa.
  · **TROSKLAR-VATTENPLANING §3.4 NAMNGER INGET FÄLT.** Skrivs kalibreringsfaktorn in enligt #81 steg A
    måste dokumentet samtidigt säga OM den gäller rate_mean eller rate_max. Annars mäts faktorn på ett
    fält och används på ett annat — precis den tysta drift kontraktsgrinden finns för att fånga.
  ⚖️⚖️ **DOMEN FÄLLD 13/9 — BENGT: "KÖR C". RADARDOMEN HÖLL** (DECISIONS #153). Steg 3 passerat,
  **steg 4 öppnat**: radarn blir utlösare mellan stationerna. Kalibreringsfaktorn **0,65 på
  `rate_mean_mmh`** är inskriven i TROSKLAR-VATTENPLANING §3.4 med riktningen utskriven (dividera
  med 0,65 ≈ ×1,54; multiplicera halverar i stället) och med fältregeln att `rate_max_mmh` INTE får
  bära tröskel förrän spannet 0–200 är rensat. 🔑 KVAR: Axels kontrasignering i §3.4 (§5:s
  dubbelsignatur) — steg B i kort #81 öppnas först då. Och utlösartröskeln i mm/h är öppen; den
  sätts inte av utfallet, bekräftelsekurvan i §3.4 är dess underlag.
  ✍️ **AXEL KONTRASIGNERADE 13/9** (relayerad av Bengt, DECISIONS #154). Dubbelsignaturen enligt §5 är
  fullständig ⇒ **kalibreringsfaktorn 0,65 på `rate_mean_mmh` är FASTSTÄLLD och kort #81 steg A är KLART.**
  Låst med signaturen: faktorn, fältet, riktningen och spärren mot rate_max. 🔓 Steg B öppet.
  🔑 KVAR: utlösartröskeln i mm/h — medvetet osatt, får inte härledas ur domens egen körning (§5).
  🎯 **TRÖSKELN SATT 13/9 av Bengt ("Ja till 2"): `rate_mean_mmh` ≥ 2,0 mm/h** (DECISIONS #155).
  Motsvarar ≈ 3,1 mm/h verklig intensitet med faktorn 0,65; bekräftelsen i det bandet är 77 % (73 % i
  föregående fönster), mot 56 % och 42 % i banden under. 🔑 KVAR: Axels kontrasignering av tröskeln —
  stegen C–F i #81 öppnas då. Steg B är redan öppet och beror inte av tröskeln.
  ✍️✅ **TRÖSKELN KONTRASIGNERAD AV AXEL 13/9 — HELA §3.4 ÄR AVGJORD** (DECISIONS #156): faktorn 0,65,
  fältet `rate_mean_mmh`, riktningen, spärren mot `rate_max_mmh` och tröskeln ≥ 2,0 mm/h. Ändring kräver
  ny dubbelsignatur. 🔓 **STEGEN C–F I KORT #81 ÄR ÖPPNA.**
  ⚙️ **STEG B AVGJORT SAMTIDIGT: radarn FLYTTAS INTE nu** (Bengt: "Vi flyttar inte nu"). ingest/radar.ts
  ligger kvar i timingesten ⇒ noll extra Actions-minuter. Edge-flytten för 5-minuterskadens är inte
  förkastad, bara inte nu; tätare i Actions förblir uteslutet (12/h = 288 min/dygn). Marginalen att känna
  till: timkadens ger rader som mest 60 min gamla mot regel 7:s krav ≤ 70 min — tunt men helt, och faller
  en körning bort tiger radarn, vilket är rätt utfall. 📅 Verify 20/9: Actions-min/dygn oförändrade.
  ✅ **VERIFY 20/9 UPPFYLLT — radarn kostar fortfarande noll extra Actions-minuter.**
  Per dygn över de sju kompletta dygnen 13–19/9: **188 · 138 · 122 · 218 · 112 · 123 · 88 ⇒ snitt
  141 min/dygn**, mot baslinjens **202** (11/9 16:25 → 12/9 18:51). Toppdygnet 16/9 är ett
  androidbygge (55 min på 7 körningar), inte drift.
  **ingest-jobbet i detalj, för det är där radarn bor:** 33 · 24 · 24 · 24 · 28 · 24 · 28 debiterade
  minuter på 24 körningar per dygn, och **mediantiden 30–36 s hela veckan mot baslinjens 32 s**.
  Kortets tröskel — "ett ingest-jobb som vuxit förbi en minut per körning" — är alltså inte passerad.
  De dygn som landar på 28 i stället för 24 beror på 3–4 körningar med en svans strax över
  60-sekundersstrecket (max 71 s), inte på att jobbet blivit längre. Radarsteget mäts direkt i
  loggen: **4–5 sekunder** (20/9 05:11:30 → 05:11:35, och 04:11:26 → 04:11:30).
  📏 **radar_precip 20/9 05:11: 3 312 rader över 24 kompositer**, senaste kompositen 05:10 — alltså
  1 minut gammal, 24 av 24 hämtade. Baslinjen 13/9 var 2 029 rader över 24. Inga bortfall, och
  regel 7:s 70-minutersgräns aldrig i närheten. Radarn har tigit noll gånger av den orsaken.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** steg 1–3 klara (#60, #153–#156), Verify uppfylld 20/9 (DECISIONS #243: 141 mot 202 min/dygn), överspelat enligt #261; steg 4 i kortens egen takt (#42, #45, #197).

- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 📏 **#44 Regntäckningen** (Bengts täthetsfråga 3/9: "räcker timhämtningen?") —
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
  📏 **KÖRD 15/9 (regn-tackning dagar=7, första efter ingest-live-bytet):** 750 stationer × 169 körtimmar, 2/2 10 %,
  1/2 7 %, 0/2 83 %, täckning **13 %** (44 % 3/9, 36 % 9/9). INTE jämförbart rakt av: nämnaren är alla station-
  körtimmar och arkivdieten sparar bara intressanta rader — måttet skiljer inte torrt från missat. Kortet döms inte
  på det här talet (DECISIONS #188).
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** frågan är inaktuell: ingest-live skriver `rain_sum_mm` varje minut sedan 9/9 (#84), regn-30 avvecklad (#89); S1:s skuggjämförelse är beviset som gäller (#188).
- [x] 🐕 **#50 Vakthunden är själv obevakad — ✅ KLART 20/9, sexton dygn efter fyndet** (fynd 4/9 kväll, läsvarvet inför
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
  📏 **KVÄLLSAVLÄSNING 17:32 — bron levererar:** pulsens workflow_dispatch 12:23:02, 14:23:02, 16:23:01 (3/3
  inom 2 s). Mellanrum sedan bron slogs på 11:09: 11:29→12:23, 12:23→14:23, 14:23→16:23, 16:23→16:42 —
  **0 av 4 över 2 h 30.** FÖRE bron, samma dygn: 04:48→11:29 = **6 h 41** på naken cron (slots 06:23,
  08:23 och 10:23 uteblev alla tre). Dygnsbeviset fullbordas 10/9 ~11:09.
  📏 **10/9 04:31 (17 h 22 på bron):** pulsen 18:23:01, 20:23:01, 22:23:01, 00:23:01, 02:23:02, 04:23:02 —
  **9 av 9 sedan 12:23, alla inom 2 s.** Längsta mellanrum 1 h 41 (16:42→18:23). **0 av 10 över 2 h 30.**
  De 24 timmarna är fulla 11:09; kvällsavläsningen bockar kortet om inget hål uppstått till dess.
  ⏭️ NÄSTA: mät om samma fönsterlängd när Actions lever igen (kort #53 är grinden).
  Beviskravet är oförändrat — ett DYGN utan mellanrum över 2 h 30.
  ⚠️ VÄNTAD BIEFFEKT, säg det innan någon misstolkar den: en vakt som tittar var annan
  timme i stället för var femte kommer se stalheter som förut hann börja och rätta sig
  osedda. Fler incident-issues den närmaste tiden betyder att vakten börjat fungera —
  inte att pipelinen blivit sämre.
   ✅ **BRO-DYGNET BEVISAT (kvällsavläsning 10/9 17:32):** 9/9 12:23 → 10/9 16:23 = 15 pulsavfyrningar, alla
   inom 2 s från :23:00; längsta mellanrum mellan två healthcheck-körningar 2 h 00 min; noll hål > 2 h 30 på
   29 h. GitHub-cronen fyrade DESSUTOM 7 gånger i samma fönster (26–65 min sena) ⇒ 22 körningar där 15 räckt,
   ~7 extra minuter/dygn. Bron står; kortet stängs först av #87. FÖRSLAG (Bengts ja): ta bort schedule-raden i
   healthcheck.yml nu — en rad, pulsen är bevisad, vakthunden i Supabase larmar ändå inom 2 h.
   🌙 NATT 11/9: pulsen 18:23, 20:23, 22:23, 00:23, 02:23, 04:23 — alla inom 2 s. GitHub-cronen dubblade
   2 gånger till (20:54, 00:13). Bron håller; cron-raden kostar fortfarande.
   🌙 **DYGNET 11/9 16:25 → 12/9 18:51:** 20 healthcheck-körningar — **13 på pulsen, 7 på GitHub-cronen**,
   längsta mellanrum 2,00 h. Bron håller fortfarande utan hål. Cron-raden kostar ~6 min/dygn; förslaget
   att stryka den ligger kvar hos Bengt.
  🌅 MORGON 13/9: 8 healthcheck-körningar sedan 12/9 18:26 — 5 på pulsen, 3 på GitHub-cronen,
  längsta mellanrum 2,00 h. Bron hel. Cron-raden kostar fortfarande.
  🌆 KVÄLL 13/9: 10 healthcheck-körningar sedan 04:23 — 7 puls, 3 cron, längsta mellanrum 2,00 h.
  Kuriosa värd att notera: 16:23 fyrade puls OCH cron samma minut, alltså två körningar på samma
  mätning. Ännu ett argument för att stryka cron-raden.
  🌅 MORGON 14/9: 12 healthcheck-körningar sedan 13/9 16:23 — 8 puls, 4 cron, längsta mellanrum
  2,00 h. En av cron-körningarna kom 39 min sen (bokad 04:23, levererad 05:02); pulsen höll tiden.
  Det är samma leveransproblem som fällde måndagsserien i dag, se kort #160.
  🔎 **GENOMLYSNINGEN 20/9 (DECISIONS #249/#252) — kortet får tre mätta defekter, och #215 slås in här.**
  Frågan kortet ställde 4/9 — *vem vaktar vakten* — har flyttat från healthcheckens leveransväg till **Supabase-
  vakthunden själv**, och där är den obesvarad:
  · **Inget dödmansgrepp.** Inget utanför Supabase kontrollerar att vakthunden kört. Utgången nyckel, avaktiverat
    cron-jobb eller ett tidigt kast ⇒ total tystnad som ser ut som allt grönt. `larmvag: "TRASIG"` skrivs bara i
    HTTP-svaret, som pg_net kastar bort. **Samma felläge som 5/9, bara flyttat** — pulsen gav en oberoende klocka,
    inte en oberoende löpare, och det gäller fortfarande.
  · **Check 9c kan aldrig fyra:** villkoret är färre än 4 källor i `sync_state`, men det finns minst 5 och rader
    raderas aldrig (verifierat i `ingest/db.ts` och `ingest-live/index.ts`).
  · **Check 9d mäter fel led:** den läser cron-jobbets status, men anropet är asynkront via pg_net — *lyckades*
    betyder *lades i kö*. Ett 500-svar från ingest-live syns aldrig. (Samma familj som #76:s fynd.)
  · **Check 1 mäter `synced_at`, inte att kursorn rör sig** — en fastfrusen kursor ser kärnfrisk ut.
  · **Schemat jämförs inte mot listan:** ett `puls-`jobb som avaktiveras eller raderas faller tyst ur mätvaktens
    bevakningslista. Vakten ser en sen körning, aldrig ett försvunnet schema.
  🔧 **MINSTA ÅTGÄRD (samma som 4/9:s logik, ny adress):** healthcheck-flödet kör redan varannan timme UTANFÖR
  Supabase — låt det mäta vakthundens senaste `job_run_details` och larma när den är för gammal. Plus en
  `puls-`avstämning mot `scripts/pulsklocka.ts:NYA` inne i check 6a, och de tre checkarna lagade var för sig.
  Verify: en framkallad tystnad (vakthundens cron-jobb avaktiverat) ger ett larm från healthcheck inom 4 h; de tre
  checkarna provade med framkallat fel; ett borttaget puls-jobb syns i mätvaktens rad.
  ✅ **KONTROLLERAT 20/9 (Bengts fråga): KORT #87 FINNS, OCH DET ÄR STÄNGT SEDAN 14/9 — svaret ändrar åtgärden.**
  Kortet sa *BRONS SLUT = kort #87*, och #87 stängdes 14/9 (DECISIONS #178). Men beslutet blev **motsatsen** till
  det #50 förutsatte: `healthcheck.yml` **raderas inte**. Bengts skäl, ordagrant 14/9: *"ta inte bort healthcheck
  eftersom den knappt kostar något"* — och det tyngre argumentet i kortet: **den är den enda kontroll som körs
  UTANFÖR det den vaktar.** Löparen som saknades 5/9 finns alltså redan, betald och bevarad med flit.
  🔧 **DÄRMED KRYMPER ÅTGÄRDEN FRÅN ETT BYGGE TILL EN FRÅGA.** `ingest/healthcheck.ts` läser redan
  `cron.job_run_details` — men bara för `halkvakt-ingest-live` (rad 23–24). Den frågar aldrig om
  **`halkvakt-vakthund`** själv. Dödmansgreppet är alltså inte ett nytt flöde: det är en rad till i en kontroll
  som redan kör varannan timme utanför Supabase, i en fil som redan är beslutad att stanna.
  📊 **DRIFTEN 20/9 08:4xZ (läst ur `cron.job`):** `halkvakt-vakthund` aktiv, schema `7 * * * *`, senaste körning
  6 min sedan, `succeeded`. `halkvakt-ingest-live` 0 min, `puls-healthcheck` 110 min, `halkvakt-gallring` 418 min —
  alla succeeded. **De sju måndagsjobben har aldrig kört** (`null`), vilket är väntat: första avfyrningen är
  måndag 21/9 (#160).
  ⚠️ **Och kortet borde ha stängts eller skrivits om 14/9.** Dess egen slutvillkor uppfylldes då, men med motsatt
  utfall mot vad raden förutsatte — kortet stod kvar i sex dygn och sa fortfarande att brons slut var ogjort.
  ✅ **DÖDMANSGREPPET BYGGT OCH BEVISAT 20/9** (Bengts *"kör dödmansgreppet"*, DECISIONS #254, PR #400).
  `ingest/healthcheck.ts` frågar nu om **vakthunden själv**, i den fil som redan kör varannan timme utanför Supabase.
  **Tre frågor för tre dödssätt:** (1) jobbet saknas eller är avaktiverat · (2) det har inte kört inom 180 min, tre
  missade timkörningar · (3) det kör men **inget svar** har kommit. Den tredje är 9d-läxan tillämpad på vakten själv:
  pg_net är asynkront, så `succeeded` betyder *lades i kö* — bara en rad i `net._http_response` med markören
  `larmvag` bevisar att vakthunden verkligen körde. Existensvaktat med `to_regclass` i stället för en naken `catch`,
  så ett riktigt läsfel i drift faller högljutt medan CI hoppar rent.
  📊 **BEVIS, båda hållen samma timme:**
  · skarpt på main 10:4xZ: `vakthunden: aktiv=1 · senaste körning 21 min · senaste svar 21 min (frist 180)` ⇒ HEALTHY.
    Att *svar* och *körning* visar samma ålder är beviset att markören spårar vakthundens egen körning.
  · **framkallat fel** (jobbnamnet bytt på en slängkopia, grenen raderad): `aktiv=0 · senaste körning aldrig` ⇒
    **UNHEALTHY** med raden *vakthundens cron-jobb saknas eller är avaktiverat — INGEN vakt kör i Supabase* och
    **issue #399** skapad. Larmvägen är alltså bevisad hela vägen: detektion → exit 1 → issue. Issue stängd och
    förklarad i en kommentar.
  🎯 **FRÅGAN KORTET STÄLLDE 4/9 ÄR DÄRMED BESVARAD.** Vakten är inte längre obevakad. Det som återstår är en ANNAN
  fråga — checkar som inte kan fyra — och den bor i **kort #222**, inte här.
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
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — **Varvloggen ikapp:** STATUS.md:s sessionslogg slutar 2026-08-25 och "Current state"
  står kvar på 2026-08-24 — sex dygns arbete (Android-release, iOS-bygget, skuggflottan,
  Apple-kontot, uppladdningen) är bokfört i commits och på tavlan men inte i djuplagret.
  Bryter dokumentationsregeln. *(Delvis åtgärdad i detta varv — resten nästa.)*
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** gjort 31/8 (6f75f72); rollen som *Current state* har bedömningens läge tagit över (DECISIONS #228); den kvarvarande STATUS-rubriken bärs av #221.


### Claude — låst (väntar på nyckel)

- [x] ✅ **STÄNGT 24/9** (DECISIONS #333) — 📷 **#242 KAMERAFACITETS KLASSNING FÅR EN TABELL** (upptäckt 23/9 när dom-knappen för grind B byggdes, DECISIONS #327). Bengt klassar
  facit-hinkens bilder veckovis (TROSKLAR-SKUGGAN §6), men klassningen har ingen plats i databasen — ingen knapp kan läsa den, och
  §2:s kamerakälla (får bekräfta träff, aldrig fälla) är därför noll i grind S-B tills det finns en. Förslag: tabell `kamerafacit`
  (bildväg, station, tid, klass: is/snö/slask/våt/bar/okänd, av, när) med RLS som `driver_facit`, matad via dbknapp tills en enkel
  sida finns; dom-knappen läser den som femte källa. Kostar inget i drift. ✅ Bengts ja 24/9 (*"gör kamerafacit"*): sex klasser, dbknapp tills en sida finns. 🔨 **BYGGT 24/9 (DECISIONS #329):**
  `sql/033_kamerafacit.sql` (dubbellåst), femte källan i `publish/grind-s-b.ts` — bekräftar, fäller aldrig; självtestet bevisar båda.
  Kvar: första riktiga klassningen (Verify). Verify: en klassad bild i tabellen och grind S-B räknar den som händelse.
  📷 **Bild framlagd 24/9 (DECISIONS #332):** `2026-09-24/SE_STA_CAMERA_VViS_329_K1-165760.jpg` (arkiverad 02:30:02Z, kamera VViS 329 K1). Bengt klassar i Supabase-panelen (Storage → facit); klassningen går in via dbknapp; grind S-B räknar. Då stängs kortet.
  ✅ **Stängt 24/9 (DECISIONS #333, Bengt: *"klassa som våt"*):** första raden i `kamerafacit` — Trafikverkets direktbild Tierp 03:11Z, sparad i `docs/kamerafacit/`, klass våt, raden bär vem som läste. Hinkens bild nås bara av Axel (§4.2). Grind S-B läser källan; händelseräkningen bevisad i självtestet, skarpt vid första halkbilden.
- [x] ✅ **KLART 25/9** (DECISIONS #342) — 🧾 **#245 BEVISBÄRAREN I SNAPSHOTEN — kartans §8 B, som aldrig fick ett kort** (upptäckt 24/9 när integrationsläget lades i
  bedömningen §5). Varje fara i `live.json` ska bära VILKA lager som talade och hur starkt — inte en boolean — så att rösten kan
  sätta försprånget (§8 A, #153) och så att en varning går att förklara i efterhand. Fog F1 + F3: nytt fält bredvid `fukt`, aldrig i
  stället (§5.3 *lägg till, ersätt aldrig*). Kan byggas när S2 (#89) ger nivå + bevis — det är innehållet fältet ska bära. Ingen röst
  ändras. 🔒 NYCKEL: S2 byggd. Verify: ett fält per väderpunkt i live.json som bär nivå och källor, oläst av apparna (otypad läsning),
  manifestets sha stämmer.
  🔓 **Nyckeln given 24/9 (DECISIONS #341):** S2 byggd — `skattaNiva()` är innehållet fältet ska bära. Nästa: fältet bredvid `fukt` i live.json (F1), bevisat oläst av apparna och med manifestets sha.
  🔨 **BYGGT 24/9 (Bengt: *"gör steg 4"*, DECISIONS #342):** `weather[].bevis = {vata, mangd, radar}` bredvid `fukt`, ur `skattaNiva()`; F1 verifierat i kod (Android, iOS, adaptern läser id/lon/lat/yta/fukt); publiceringens bunt bär skattaren. Radarn null tills stationen kopplas till radarsegment. Deploy 14:09Z, publiceringarna ok, sha stämmer — men noll väderpunkter i eftermiddagssolen. Vakthunden räknar `bevis: N av M`
  varje timme. **Kvar för Verify:** första timkontrollen med väderpunkter och N = M.
  ✅ **KLART 25/9 (Verify uppfylld, DECISIONS #342):** vakthundens timkontroller 25/9 bär *bevis: N av N väderpunkter* varje timme — 26 av 26 (02:07Z), 24 av 24 (03:07Z), 17 av 17 (04–05:07Z), 11 av 11 (06:07Z), 3 av 3 (07:07Z); väta > 0 hos 0, en torr natt.
- [x] ✅ **STÄNGT 24/9** (DECISIONS #340) — 🖼️ **#246 BILDLÄSNINGSSPÅRET — klassning i mars, byggt och provat nu** (Bengts fråga 24/9: *"kan Axel ok:a ett automatiserat
  spår där du sköter genomgången"*). DECISIONS #248: hinkens bilder öppnas i mars — spåret byggs nu och provas på Trafikverkets
  DIREKTBILDER (publika, dagens, inte facit). Formen: Axel exporterar hinken till en plats Claude når · kontaktark om 20 bilder ·
  Claude klassar var och en (is/snö/slask/våt/bar/okänd, säkerhet, anteckning) BLINT — sökvägen visar kamera och tid, aldrig
  skuggans larm · Axel ok:ar: stickprov ≥ 10 % plus varje is/snö/slask · satsen in i `kamerafacit` i ett svep. Förkrav: #231:s
  definition i DECISIONS före första hinkbilden, och TROSKLAR-SKUGGAN §6 omskriven (Claude klassar, Axel ok:ar, Bengt
  stickprovar). 🔒 NYCKEL: Bengts och Axels ja (§4.2). Verify: ett kontaktark ur direktbilderna klassat och ok:at, med tabellrader.
  🔑 **Bengts ja 24/9 (DECISIONS #335/#336):** mars står, §6 omskriven, #231:s definition skriven. Kvar av nyckeln: Axels export av hinken och hans ok-roll. Provet på direktbilderna kan byggas nu.
  🔨 **BYGGT OCH PROVAT 24/9 (Bengt: *"gör steg 2"*, DECISIONS #339):** `scripts/kontaktark.py` (direkt · mapp · stickprov · sql). Provet: 20 direktbilder 13:33–13:44Z längs rutterna, klassade blint — bar 20, hög säkerhet (sol). Stickprov nr 6 och 16. `sql` vägrar utan ok. **Kvar: Axels ok på `docs/kamerafacit/prov-2026-09-24/ok.md`** (då går raderna in och Verify är uppfylld), och ett andra prov vid regn eller i mörker — soligt ark bevisar kedjan, inte att klassningen skiljer våt från bar.
  ✅ **Stängt 24/9 (DECISIONS #340, Axels ok framfört av Bengt):** arket godkänt utan rättelser, 20 rader in i `kamerafacit` (tabellen bär 21), var och en med Axels ok i `av`. Andra provet (regn eller mörker) → kort #247.
- [x] 🧪 **#230 EFTERHANDSTEST: HALKVAKTS REGLER MOT NIRAS FRIKTION — ✅ KÖRD 21/9 PÅ EXEMPELDAGEN (DECISIONS #287)** (Bengts idé 21/9, DECISIONS #284). 🔑 **Nyckel:
  friktionsdata från Nira för nätter som vårt arkiv också bär — och ett beslut om facitkällan INNAN nätterna mäts (D3).**
  Frågan: hade Halkvakt varnat *före* den första bilen, där och när Niras bilar sedan kände halka?
  ✘ **Inte med exempeldagen 15/1 2024.** (1) Halkvakts indata saknas: Trafikverkets öppna API räcker en vecka bakåt, vårt
  arkiv börjar 2026, Lastkajens *NVDB VVIS* är stationsregistret och inte mätningarna, och Vintersidan — där Trafikverket har
  den gamla väderdatan — är stängd för utomstående. (2) Dagen kan inte skilja: luften höll −4 till −10 °C hela dygnet (0,5 %
  av avläsningarna ≥ 0 °C) och det snöade. Efterhalkan hade aldrig fyrat; dagens isvarning hade legat på överallt.
  ✅ **Designen, skriven före mätning:** en övergångsnatt (blöt väg, ytan faller genom +3…0 °C) · de låsta startvärdena, inget
  svep (D2, D6, D7) · facit = Niras friktion under Niras egen gräns för *halt* (ur RSA-produktguiden) inom 5 km och 90 min —
  samma radie och fönster som KB-B · mått: träff, falsklarm och **försprånget i minuter före första låga friktionsvärdet**.
  **Två vägar:** (A) den här vintern — skuggloggen (S1) och `trend_kandidater` bär vår sida, eftersom råobservationerna gallras
  efter sju dygn; Niras friktion för 2–3 namngivna nätter begärs när nätterna finns. Kräver att Niras friktion deklareras som
  facitkälla före nätterna (D3 — samma fråga som #209). (B) en tidigare säsong — VViS-historik från Trafikverket och friktion
  från Nira: två förfrågningar, men ett renare test utanför blindningen.
  **Gratis nu:** RSA-formuläret på niradynamics.com/products/road-surface-alerts ger produktguiden (Niras gräns för *halt*)
  och en dags halkvarningar.
  🎯 **BENGTS PRECISERING 21/9 (DECISIONS #285): testobjektet är HELA systemet — motorn plus skuggmotorn —** för det är så
  det färdiga systemet ser ut. Motorn ensam säger i praktiken "kallt och fuktigt" överallt; försprånget ska finnas i skuggdelarna.
  Lagren, vart och ett redovisat för sig: (1) **motorn** som i appen (yta ≤ +1 °C och fuktig) · (2) **efterhalkan** med startvärdena
  — S1 loggar dess indata i skuggmotorn sedan 16/9, uppspelningen kör regeln ur arkivet · (3) **skuggan**, prognosen mellan
  stationerna (TROSKLAR-SKUGGAN; grind A prövar matematiken, koden skrivs i november om den håller) — mäts, talar inte (T3/T6)
  · (4) SMHI-förlängningen när vintervarningar finns. Två anspråk prövas: **FÖRE** (minuter före första låga friktionen, där
  Niras bild är tunnast — natten) och **MELLAN** (träffar skuggan de sträckor mellan stationerna där bilarna sedan mäter låg
  friktion? Det första prov av offsetmodellen med ett vittne på platsen).
  📍 **Området: Stockholm** — Niras exempelområde, och skuggmotorns rutter *E4 Södertälje→Uppsala* och *E18 Örebro→Stockholm*
  går igenom det. **Nätterna väljs i förväg på ett kriterium som inte är vår egen regel** (så att ingen natt kan plockas i
  efterhand): t.ex. de första tre nätterna med yta ≤ +1 °C vid någon station i området före 1/2 och de tre första efter — dom 1
  och dom 2. Skuggmotorns logg är skriven innan utfallet fanns; det går inte att fuska i efterhand, åt något håll.
  ⏰ **Tidskritiskt:** resultatet ÄR domarnas utfall, så Niras friktion måste deklareras som facitkälla — tillsammans med
  nattkriteriet — **före den första övergångsnatten**, som kan komma i oktober (D3; S6 har i dag förarfacit + kamerafacit).
  Verify: designen deklarerad i DECISIONS före första övergångsnatten · testet kört på de valda nätterna · försprånget och
  träffbilden redovisade PER LAGER i bedömningen, vid domarnas tidpunkter.
  ✂️ **BENGT 21/9 (DECISIONS #286):** *"vi hämtar inte niras data"* — väg A och B ovan stryks, och med dem förslaget om Nira
  som tredje facitkälla. Beställningen var ett efterhandstest på **exempeldagen 15/1 2024, med Niras eget material som indata**,
  och med **både motorns regler och skuggmotorns kommande regler**. Upplägget är låst i DECISIONS #286 FÖRE körningen:
  bilarnas lufttemperatur i stället för vägytan, torkarna i stället för nederbörden, varje vägavsnitt som en station, facit =
  friktion under 0,30 på samma avsnitt inom 90 min (känslighet 0,25 och 0,35). Skuggan och SMHI-förlängningen kan inte
  tillämpas — materialet saknar stationsankare och varningar.
  ✅ **KÖRD 21/9 — `scripts/matningar/nira-efterhandstest-2026-09-21.py`, upplägget låst i #286 före körningen (PR #431).**
  **Motorn** (lufttemp ≤ +1 °C och torkare): 21 767 varningsögonblick, på 7 557 av 16 810 avsnitt. Efter en varning kom
  friktion under 0,30 inom 90 min i **33,7 %** av fallen — **basnivån, att larma på allt, gav 44,2 %**. Samma mönster vid 0,25
  (20,8 % mot 26,4 %) och 0,35 (44,9 % mot 58,2 %). Varningarna låg mitt på dagen när det snöade på behandlade vägar;
  halkan var värst natt och morgon. 11,5 % av halkaepisoderna föregicks av en varning, försprång median 50 min.
  **Skuggmotorns efterhalka** (startvärdena): 894 ögonblick i startbandet, 1 fyrning — ett falsklarm. Dygnet var kallt och
  jämnt, inte en övergångsnatt; regelns värde kan inte bedömas på materialet. Skuggan och SMHI-förlängningen: kunde inte
  tillämpas. **Reservationen först:** lufttemperatur och torkare ersätter vägyta och nederbörd, varje avsnitt är en station.
  ⚠️ **BENGTS FRÅGA 21/9: "finns det bara en regel i skuggmotorn?" — NEJ.** Skuggsidan har sex kommande isregler, var och en
  med eget tröskeldokument: kombinationen/efterhalkan (körd), **övergångsregeln #89 (a)** (fukt inom N h i stället för nu),
  trenden #88, rimfrosten #46, SMHI-förstärkaren #95 (d) och väglagets ålder #151 — plus frysklassningen #103 och
  segmentmotorn (skuggan). Tillämpbar på materialet utöver den körda: **övergångsregeln**. Övriga saknar indata (daggpunkt,
  SMHI:s varningar, Trafikverkets väglag, stationsankare). Övergångsregeln körs med N = 2 h, låst i DECISIONS #288.
  ✅ **ÖVERGÅNGSREGELN KÖRD 21/9 (DECISIONS #289):** 95 646 varningsögonblick, 4,4 gånger motorns, varav 73 879 efter att
  nederbörden upphört. Följdes av friktion under 0,30 i **35,5 %** — motorn 33,7 %, **basnivån 44,2 %**. Fångade **16,3 %** av
  halkaepisoderna i förväg, mot motorns 11,5 %, med **70 min** försprång i median mot motorns 50. Bättre än motorn på
  förmiddagen, fortfarande under basnivån. Motorns och efterhalkans tal oförändrade vid omkörningen.
  🔎 **SECOND OPINION 21/9 (DECISIONS #290, annan modell):** upplägget var ärligt, men läsningen ändras. Testet prövade
  stationsregeln (A2), inte motorn — väglaget (A1) finns inte i materialet. Temperaturvillkoret var sant i 99,72 % av
  perioderna, så det som prövades var torkarna. *Sämre än slumpen* är till 70 % en blandningseffekt (torkarna gick på
  motorväg mitt på dagen; förväntat utan information 36,8 %). Dagtid hade avsnitt med torkare medianfriktion 0,54 mot 0,37 —
  saltstänk, inte snöfall. 76,9 % av halkan fanns redan vid första mätningen, så försprånget går inte att läsa. **Dagen var
  Niras bästa sort, inte vår:** stadigt kallt, ingen övergång. Kvar mot oss: stationsregeln ser inte saltet (§4.2).
  Övergångsnattens prov görs inte — ingen ny data från Nira (Bengt 21/9).

- [x] ✅ **#99 VINTERDAGEN — fem påhittade resor genom den riktiga motorn — KLART 11/9**
  (parallell session, DECISIONS #99, `scripts/vinterdag.ts`). Riktiga referensrutter ur skuggflottan,
  PÅHITTADE väderlägen. Dömer INGENTING och skriver ingenting — inte weather_observations, inte
  skuggloggen, inte CDN. Utdata är text till människor. Den svarar på rytm och mängd, inte på om en
  regel är rätt: syntetiskt väder som får svara på "håller regeln" är en maskin som bekräftar våra
  antaganden. Fynd: 45 röstlarm över fem resor; novembermorgonen 11 larm på 62 min.
  ⚠️ **BÄRANDE FYND, och det blev kortet #100:** nollgradersdimman gav SEX IDENTISKA "Isrisk framöver"
  på en timme. Frysrisken är en PUNKTkälla och varje station längs vägen fyrar separat — reprisregeln
  gäller samma id, inte samma FARA.
  🔗 **BEKRÄFTAR §4.7 OBEROENDE:** klarnatten går från 3 larm till 7 med utvidgat fuktvillkor, alltså
  drygt en fördubbling av resan. Episodräkningen i steg 0 gav 2,0 × samma dag, med helt annan metod
  och annat underlag. Två instrument, samma svar. (Fyndraden i #99 citerar mätningens RADtal —
  312/14/71 — som enligt DECISIONS #100 är fel valuta för röst; slutsatsen står ändå.)
- [x] ⛔ **#100 Dämpning per FARA och sträcka — STÄNGT 12/9 UTAN ATT BYGGAS, ett dokumenterat nej**
  (Bengts fältdom + `scripts/segmentlangden.ts` körd 12/9, DECISIONS #103). Kortet ville laga något
  som inte var trasigt, med en kur som hade gjort produkten sämre.
  📏 **MÄTNINGEN:** Jämtlands 59 km-segment, 39 min i 90 km/h — motorn talar **4 gånger, vid minut
  0, 10, 20, 30**. Det är reprisregelns golv (10 min OCH 5 km), inte ett fel. Variant B (kortare
  segment) ger 12 larm, variant C (den föreslagna dämpningen, ett larm per segment) ger **1 larm
  för 39 minuters halka**. Kuren var alltså tystare än sjukdomen.
  🗣️ **BENGTS DOM 11–12/9:** "Om du kör 80 km och det är ishalka hela tiden … jag kan verkligen inte
  se att det skulle störa eller vara någon cry wolf-situation. Det är halt hela tiden och att någon
  säger åt mej att det är halt; kom ihåg det, det är fortfarande halt." Principen är dessutom
  precis rätt: **cry wolf handlar om FALSKA varningar.** En sann varning som upprepas är redundans,
  och mot uppmärksamhetsförfall under två monotona timmar är redundans snarare rätt än fel.
  ➡️ **VAD SOM ÖVERLEVER:** inte upprepningen, utan möjligen TOTALEN när många OLIKA faror
  kvalificerar samtidigt (vinterdagens 11 larm på 62 min var halka + frysrisk + vilt + kameror om
  vartannat). Det är §4.7:s fråga och mäts i larm per timme, inte i upprepningar av en mening.
  🧰 `scripts/upprepningen.ts` och dess knapp behålls — de kostar ingenting och ger ett vintertal om
  frågan skulle komma tillbaka. Före-värdet är och förblir OAVGJORT.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — ~~🔇 **#100 Dämpning per FARA och sträcka, inte per id — före vintern**~~ (följd av #99, kandidatkort
  enligt DECISIONS #99). Motorn tystar repriser av samma larm-id inom 10 min/5 km, men frysrisk från
  tio olika stationer längs samma väg är tio olika id och alla får tala. Vinterdagen hörde sex
  identiska meningar på en timme. Det är inte en ny fara — det är att befintliga faror inte ska
  upprepa sig längs en rutt. 🔒 NYCKEL: rör motorn och tre portars vektorer ⇒ tröskelrader + Axels ja.
  Verify: vinterdagen körd före och efter, samma resor, larmräkningen ska falla utan att någon NY
  fara tystnar. Hänger ihop med röstbudgeten i OVERGANGAR-ANALYS §4.7 — (a) gör problemet värre,
  så dämpningen bör finnas INNAN (a) får röst.
  📊 **FÖRE-VÄRDET MÄTT 11/9** (`scripts/upprepningen.ts` + knapp, körning 34620622893, DECISIONS
  #101). Skuggloggen bär 1 759 körningar på 20 rutter sedan 29/8, varav 678 med larm — och de
  larmen har REDAN passerat motorns spärrar, så det är vad en förare hade hört.
  **50 % av resorna (340 av 678) innehåller samma MENING minst två gånger.** 32 % tre gånger,
  16 % fyra. Median 2, värst 4.
  🛑 **FÄLTDOM 11/9, BENGT: KAMERORNA ÄR RÄTT OCH RÖRS INTE.** Malmö→Boden och tillbaka: en
  varning 500 m före varje verklig kamera, hela vägen. "Det var perfekt." Därmed faller den första
  avläsningens huvudtal — 337 av 340 upprepningar var `camera`, och de är KORREKTA. Identisk text
  är inget fel när varje varning följs av sitt eget objekt; kontexten skiljer dem åt.
  ⚠️ **MÄTFELET VAR MITT, och det är av kodgrindens sort (#71): rätt vakt på fel nämnare.**
  Underlagsvakten stod på "resor med något larm" (678) och rapporterade 50 % upprepning. Men
  populationen som betyder något är resor med en TILLSTÅNDSfara, och där finns 3 resor — alltså
  **OAVGJORT**, inte 50 %. Mycket underlag om fel sak är inte underlag.
  🔑 **UPPDELNINGEN SOM BLEV KVAR, och den är kortets egentliga innehåll:**
  **OBJEKTFAROR** (kamera, olycka, vilt) = distinkta saker föraren passerar. En varning per objekt
  är rätt, även med ordagrant samma mening. **RÖRS INTE — fältverifierat.**
  **TILLSTÅNDSFAROR** (halka, frysrisk) = ett sammanhängande tillstånd som råkar observeras av
  flera givare. Sex stationer längs en väg beskriver EN halka, inte sex; andra meningen bär ingen
  ny information och kräver ingen ny åtgärd. **Dämpning hör hemma här och bara här.**
  Regeln: varna en gång per objekt, en gång per tillstånd — aldrig en gång per givare.
  📉 **FÖRE-VÄRDET ÄR DÄRMED OAVGJORT och väntar på vintern.** `icing_point` upprepas på 2 resor
  (värst 3), `slippery_segment` i praktiken aldrig — väglagsarkivet står stilla sedan 25/8.
  Vinterdagens sex identiska isvarningar är varken bekräftade eller motbevisade av verkligt väder.
  Knappen finns, mätningen är byggd; frågan mognar med vintern, inte med mer kod.
  ✅ **KRAVET EFTER DÄMPNINGEN ÄR TVÅDELAT:** upprepningarna i tillståndsfarorna ska falla utan att
  antalet distinkta meningar gör det — OCH objektfarornas siffra ska stå still. Kamerorna ska låta
  exakt som de gör i dag.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** redan stängd 12/9 (DECISIONS #103, kortet *⛔ #100 … STÄNGT 12/9* ovan) — det här var en kvarglömd kopia.
- [x] ✅ **STÄNGT 25/9, ÖPPNAS VÅREN 2027** (DECISIONS #355) — 🏔️ **#91 KALLPLATSLAGRET — bron är ett specialfall av "strukturellt kallare platser"**
  🔓 **NYCKELN ÄR LÄST 12/9, OCH SVARET ÄR TVETYDIGT** (DECISIONS #119). Grind A kördes om och
  **FÖLL för första gången** (2 042 punkter mot 57 den 1/9): MAE 1,06 °C mot kravets 1,0, grova fel
  10,7 % mot 5 %. Residualer finns alltså i överflöd — kortets villkor "det ska finnas något kvar att
  förklara" är uppfyllt. **MEN höjdprovet i samma omgång visar att höjden inte förklarar dem:** på
  1 962 punkter återvinner höjdkorrektionen exakt noll (1,65 → 1,65 °C) och gör det SÄMRE i två av
  fyra band. Kallplatslagret kan alltså inte byggas som "höjd längs vägen" — det som återstår är
  GIS-svansen (dalgångar, skogsskuggning, vattennärhet), som är väsentligt dyrare. **Ingen byggorder
  här; fyndet ska in i TROSKLAR-SKUGGAN innan något sampleras.**
  (systemanalys 10/9). Dalgångar där kalluft samlas, skuggade kurvor i skog, sträckor längs vatten:
  statisk geometri, ingen livedata. Lantmäteriets höjddata är öppen och höjdprovet är kort #96 (nedan).
  Ett statiskt lager per segment (kallplats-index) ger frysrisken något att peka på MELLAN stationerna
  och ankarklippningen en fysisk anledning till att ett segment fryser före ett annat. 🔒 NYCKEL:
  #38b (stråket) och grind A — lagret är en förklaringsvariabel i felkartan innan det är en fara.
  Verify: kallplats-index förklarar en mätbar del av grind A:s residualer (leave-one-out) — annars
  läggs det ner.
  ✅ **Stängt 25/9 (DECISIONS #355, Bengt):** öppnas våren 2027 (vårlistan Ä6). Inledningen ovan är inaktuell: grind A klarades 23/9 (#321), och residualerna blir meningsfulla först på vinterdata med de varma grannarna (#353).
- [x] ✅ **STÄNGT 24/9** (DECISIONS #332) — 🕳️ **#97 Motorns halk-regex är blind för sammansättningar — "Rimfrost", "Halkrisk"** (kodgrindens
  självtest 11/9, PR #104). Lookbehind-regexen i engine.ts:40 matchar faroordet bara när det står först i
  ordet; "Rimfrost" och "Halkrisk" passerar tysta oavsett kod. I arkivets 838 infosträngar förekommer ingen av
  dem — ingen miss i dag, men en tyst ALDRIG den dag Trafikverket skriver så. 🔒 NYCKEL: motorändring =
  vektor i tre portar + buntad skuggmotor (CLAUDE.md), och Bengts beslut: vidga ordlistan, eller låta
  kodgrinden vakta (BLINDLISTA tom utöver "fläckvis …" i varje körning, annars larm). Verify: kodgrindens
  BLINDLISTA i nästa körning; en vektor med "Rimfrost" på kod 2 som larmar i alla tre portarna om ordlistan vidgas.
  🔨 **BYGGT 16/9 (Bengts beslut "vidga ordlistan", DECISIONS #214):** ordbörjan `is|halka|halkrisk|halkig|halt` +
  stammarna `snö|frost` även inuti ord. Mätt: Rimfrost, Halkrisk, **Nysnö**, **Halt** tystnade — nu talar de; Halkbekämpning
  och fläckvis tiger. Elva ställen inkl. snapshotens SQL-filter. Vektor v24 (5-metersregeln: 0,65 m → 10,3 m). Kontrakts-
  grinden fällde två gånger och hade rätt. VÄNTAR: Kotlin/Swift i CI · **Axels ja på v24** · merge · deploy skuggmotor +
  publicera + vakthund · app-bygge (iOS 0.3.8).
  ✅ **MERGAD OCH DEPLOYAD 16/9** (Axels ja på v24, PR #306, DECISIONS #214): deploy 14:51Z · publicera: första snapshoten
  efter deploy med manifest-sha STÄMMER · vakthund `vinterprov`: "vinterord i väglagsarkivet: nej", problem [] · skuggmotor
  `sparrprov` identiskt med 02:42Z. VÄNTAR: app-bygge från main (iOS **0.3.7 (10)**, inte 0.3.8 — ett bygge täcker facit
  OCH ordlistan) · bevis med innehåll vid första vinterordet (vakthundens vinterkoll larmar).
  ✅ **Stängt 24/9 (DECISIONS #332, Bengt: *"tre ja"*):** vektorn `v24_vinterord_kod1.json` grön i alla tre portar (android + ios-engine gröna på main cdd7889 23/9), deployad 16/9, i apparna sedan 0.3.9. Vakthundens check 4 larmar vid första vinterordet — bevakning, inte villkor.
- [x] ✅ **#87 HEALTHCHECKENS KONTROLLER IN I VAKTHUNDEN — KLART 14/9, och filen blir KVAR** (Bengts beslut, DECISIONS #178)
  ⛔ **RADERINGEN AV `healthcheck.yml` ÄR INSTÄLLD — ett dokumenterat nej, inte en gloms bort.**
  Bengt 14/9: *"ta inte bort healthcheck eftersom den knappt kostar något"*. Skälet väger tyngre
  än de 12 min/dygn: den är **den enda kontroll som körs UTANFÖR det den vaktar**. Vakthunden
  lever inuti Supabase, och tystnad efter grönt ser identiskt ut som "allt väl" — samma dygn gav
  skuggmotorn status 546 (WORKER_LIMIT) två gånger, och en kedja visade sig ha varit tyst trasig
  i sexton dygn (#177). Redundansen är vad som fångar sådant.
  📌 **FÖLJDER AV BESLUTET:** de tolv kontrakten är nu **permanenta**, inte tidsbegränsade, och
  kommentaren i kontraktsgrinden är rättad så att nästa läsare inte tar bort dem. Pulsklockans
  `puls-healthcheck` blir kvar. Verify-veckan behövs inte längre för raderingens skull — att
  bevisa varje larm har fortfarande värde, men det blockerar ingenting.
  💰 **BESPARINGEN UTEBLIR MEDVETET:** 12 min/dygn ≈ 7 % av uppmätta 169 min/dygn, och taket slår
  omkring 28 september. Det är ett pris som är valt, inte förbisett.
  ✅ **BYGGT OCH BEVISAT 14/9** (Bengts order, DECISIONS #175, PR #242). Alla **tio** kontroller
  ligger i vakthunden som check 9 och kör i produktion. Beviset är larmprovets issue #243, som
  bär mätvärdesblocket ur det som faktiskt kör: grannarkiven 31–32 min · gräns-wx FI 20 / NO 44 ·
  cameras och road_conditions_arkiv 46 min mot mjuka gränsen · livemotorns cron succeeded ·
  fältgolv vind 747 / sikt 736 · arkivvakt 0 av 818 · räknare 2 790 / 818 · kartans meta 26 min ·
  kameror-vaglag 749 st, 0,0 dygn. Enda problemraden är provet självt.
  🔍 **KORTET SA FEM. FILEN INNEHÖLL TIO** — upptäckt vid flytten. De fem som saknades i listan:
  `sync_state`-källräkningen, de VILANDE källornas 150-minutersgräns (check 1 ger dem ingen gräns
  alls), livemotorns cron-puls, fältgolvet för vind och sikt, och räknarna. Hade bara kortets fem
  porterats och filen sedan raderats hade fem kontroller försvunnit **tyst**.
  🔒 **TOLV NYA KONTRAKT, TIDSBEGRÄNSADE MED FLIT** — de vaktar parallellveckan och ska bort i
  SAMMA commit som healthcheck.yml. 26 kontrakt håller; mutationsprov 120 → 130 ⇒ exit 1.
  ⏭️ **KVAR: VERIFY-VECKAN.** healthcheck.yml lever tills vakthunden larmat på ett FRAMKALLAT fel
  i var och en av de tio (`?larmprov` räcker inte). Besparingen 12 min/dygn realiseras först då,
  och raderingen är en egen fråga till Bengt och Axel (prejudikat: #79 krävde båda).
  🕳️ **SPRICKA I DEPLOYVÄGEN, upptäckt på köpet:** första försöket föll på *"Failed to resolve
  latest Supabase CLI release: rate limit exceeded"* — `supabase/setup-cli@v1` med `version:
  latest` slår upp utgåvan OAUTENTISERAT. Omförsöket gick igenom. Enda deployvägen utan Axels
  terminal hänger alltså på ett tak vi inte styr. Att pinna versionen tar bort beroendet.
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
- [x] ✅ **STÄNGT 22/9** (DECISIONS #313) — **#27 asc-CLI:t** — enkommandos-TestFlight + CI-hämtad testarfeedback.
  🔓 **Halvöppnad 31/8:** Apple-kontot finns. Kvarvarande nyckel = en ASC API-nyckel
  som Axel skapar i App Store Connect → Users and Access → Integrations. Säg till så
  skriver jag stegen.
  ✅ **Stängt 22/9 (DECISIONS #313, Bengts beslut):** ett bekvämlighetsverktyg som ingen bett om sedan 31/8; uppladdning via Xcodes Organizer fungerar. Idén står kvar i BACKLOG.md (punkt 27) om behovet kommer.
- [x] ↪ **HOPSLAGET I #214 24/9** (DECISIONS #346) — Butiksuppladdning + Data safety-inklistring *(låst: Play-kontot)*
  ↪ **Hopslaget i #214 24/9 (DECISIONS #346, Bengts ja):** inklistringen är sista steget i #214; uppladdningen står i *Play: uppladdningsguide*, och iOS går före Android (DECISIONS #320).
- [x] ~~TestFlight-UPPLADDNING~~ ✅ KLART 31/8 — 0.3.0 (3) inne hos Apple.
  Kvar (Axels hand, inte låst): testarinbjudningarna, internt + externt
- [x] ~~Skarp support vid första Mac-bygget~~ ✅ KLART 29/8 — appen körde på Axels iPhone
  två dygn före schemat
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — 🎨 **DESIGNLYFTET** — startar samma dag releasen är inne; byggs under 14-dagarstestet, rullas till testarna som v0.3.1:
  - [x] **#24 Skinnet** (Claude Design: hemskärmens farokort, "senast sagt", typografin)
  - [x] **#22 Bluetooth-autostart** (vakten startar när bilen kopplar)
  - [x] **#23 Heads-up över Google Maps + "Testa rösten"** *(nyckel: releasen inskickad)*
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** levererat 31/8 (cb7d35c, 83145f5, 92c1e91, d056e42; 0.3.2 med heads-up, senast sagt och självväckning). Resterna har egna kort: skinnet v3 på Android, #226 (autostarten på Android) och #23 (heads-up-beviset).
- [x] ✅ **STÄNGT 24/9** (DECISIONS #345) — **#25 Halkbaneläget** *(låst: halkbanans avsiktsförklaring)*
  ✅ **Stängt 24/9 (DECISIONS #345, Bengt: *"vi har koll på dessa på annat sätt"*):** följs utanför tavlan. Formen står kvar i BACKLOG punkt 25; beviljas halkbaneförsöket får bygget ett nytt kort.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #311) — **#26 Skolpaketet** (QR-blad, manus, checklista) *(låst: trafikskolans avsiktsförklaring)*
  ✅ **Stängt 22/9 (DECISIONS #311, Bengt: *"ta upp våren 2027"*):** hör till skolpaketet våren 2027 och står i bedömningens rad *Efter mars*. **Öppnas igen** om Skyltfonden beviljar ansökan med trafikskolorna (besked senast 15/12) — villkoret står i decemberraden.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #315) — **#15 Kö-slutsmotorn** (TrafficFlow) *(låst: efter release — uppdatering 1)*
  ✅ **Stängt 22/9 (DECISIONS #315, Bengt: *"öppna våren 2027"*):** bärs av Ä3 i bedömningens §3 och **öppnas våren 2027**. Idén och villkoren (ny HazardKind med vektorer, slinglogik, falsklarmsskydd) står kvar i BACKLOG.md punkt 15.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #309) — **#16 Blixthalke-prognos** (MET Nowcast) *(låst: efter kö-slut — uppdatering 2)*
  ✅ **Stängt 22/9 (DECISIONS #309, Bengts ja):** kortets form — en prognos som varnar — krockar med regel T6 (TROSKLAR-KOMBINATIONEN, fastställd 17/9: prognoser får aldrig ensamma utlösa). Idén lever vidare som en rad i #233:s *före resan*-vy, där en prognos får visas men inte talas.
- [x] ✅ **#101 MÄTVAKTEN — KLART 12/9, och den hittade fyra döda mätningar till**
  (upptäckt 12/9 under vattenplaningsgenomgången). Grind V-A:s måndagskörning 7/9 fallerade i
  minutkrisens svallvågor, ingen larmade, och DECISIONS #69:s uttryckliga omkörning uteblev i åtta
  dygn. Kort #81 regel 5 säger "vakthunden får en rad per nytt led INNAN ledet går skarpt" — den
  regeln gäller drift, inte mätningar, och där finns hålet. Åtta arbetsflöden har cron i dag
  (healthcheck, marknadsforing + måndagsserien grind-a · smhi-prov · cell-matning-v3 ·
  trv-bevakning · hojd-prov · grind-v-a) och INGET av dem larmar när det fallerar.
  🔒 NYCKEL: ingen — men bör byggas i vakthunden (noll Actions-minuter), inte som nytt Actions-jobb.
  ✅ **BYGGT OCH BEVISAT** (check 6 i vakthunden, PR #145, deployad 0e84812, bevis issue #146 EFTER
  deployen, DECISIONS #105). Timvis i Supabase, noll Actions-minuter.
  Två villkor: senaste körningen fallerade, ELLER längre än **1,5 × kadensen** sedan den kördes alls.
  Ålderskontrollen är den viktigare — GitHub-cronen levererar 40 % av bokad takt (#70), och då finns
  ingen körning att sätta en flagga på. **Schemat läses ur REPOT**, inte ur en lista i koden: ett nytt
  schemalagt flöde bevakas automatiskt från första timmen, och ett otolkbart cron-uttryck larmar i sig.
  Egen etikett `matvakt`, egen öppna/uppdatera/stäng-cykel, färgar aldrig driftvakthunden röd.
  ✅ **DE FYRA ÄR IGÅNG IGEN 12/9 06:51** (Bengts "ta alla fem", DECISIONS #119): grind-a, smhi-prov,
  trv-bevakning och hojd-prov trycktes manuellt — **alla fyra gröna**. Felsignaturen var ingen bugg:
  jobben hade **noll steg och två sekunders körtid**, alltså vägrade GitHub starta dem (kostnadstaket
  7/9). Det fanns ingenting att laga, bara att trycka.
  🕳️ **OCH DÄR SITTER VAKTENS GRÄNS:** issue #146 öppnades 03:49, pekade ut exakt de fyra, och låg
  obesvarad i tre timmar tills någon frågade. Vakten larmar; den trycker inte. **En vakt utan
  handgrepp är en halv vakt** — och veckojobben är extra känsliga, eftersom deras nästa schemalagda
  chans ligger sju dygn bort. Det som fångade det här var en genomgång, inte ett larm.
  Prov: `matvaktprov` i dbknapp-knappen.
  🔦 **FYNDET VID FÖRSTA KÖRNINGEN — hela måndagsserien låg nere:** utöver grind-v-a och
  cell-matning-v3, som kördes om för hand 12/9, hade även **grind-a** (skuggans offsetmodell #61),
  **smhi-prov**, **trv-bevakning** och **hojd-prov** (#96) fallerat 7/9. Sex av åtta schemalagda
  flöden döda i fem dygn utan att någon visste. healthcheck och marknadsforing var gröna.
  ⏭️ De fyra körs INTE om för hand: måndagsserien går 14/9 och ska lyckas av sig själv. Gör den inte
  det står issuen kvar öppen — och det är hela poängen. Mätvakten får bevisa sig på den körningen.
  ⚠️ Blir vakten pratsam av cronens opålitlighet är svaret att flytta mätningarna till pulsklockan
  (som #53 gjorde med ingesten), inte att lossa på tröskeln.
  ➕ **ANDRA HALVAN BYGGD 12/9 — CHECK 6b, KÄLLORNA** (Bengts "bygg check 7", PR #150, deployad
  41929bd, DECISIONS #106/#107). Källkollen (`scripts/kallkollen.ts` + knapp) visade att alla tio
  arkivkällor växer men att FEM saknade vakt. De tre bärande ligger nu i mätvakten: **shadow_log**
  (tyst > 2 h), **situation_archive** (tyst > 3 h) och **radar_precip**.
  🎯 **Radarn testas med KORSKONTROLL, inte färskhet** — tabellen är händelsefiltrerad, så en tyst
  radar kan betyda rikstorrt väder och en färskhetsvakt hade larmat på solsken. Larmet går bara när
  radarn tigit MEDAN stationerna rapporterat nederbörd de senaste 3 h. Det fångar den verkliga faran:
  `ingest.yml` kör `radar.ts` med `continue-on-error`, så ett stående SMHI-fel lämnar jobbet grönt.
  🚫 polisen_events och smhi_warnings vaktas INTE, med flit: deras luckor är världens, inte systemets.
  Att ingesten slutat hämta fångas av check 1 via `sync_state`.
  ✅ **Bevis efter deployen:** `källor: skuggloggen 1 min · olycksarkivet 6 min · radarn 21 min
  (stationsnederbörd 3 h: 339)` — korskontrollen prövad skarpt i det läge den ska larma: det regnade
  över 339 stationsmätningar, och radarn svarade.
- [x] ✅ **STÄNGT 22/9** (DECISIONS #303) — ⚖️ **#194 GRIND V-B SOM KNAPP — dömer skuggans vattenplaningsvarningar** (Bengts order 16/9, DECISIONS #211).
  `publish/grind-v-b.ts` + knappen `grind-v-b`: V-B1 falsklarm mot närmaste stations `rain_sum_mm` (10 km, ±30 min,
  tröskeln härledd 2,0/0,65 ≈ 3,1), V-B3 frekvens per rutt och regndygn, V-C:s domspärr. V-B2 säger ⊘ med skäl —
  `situation_archive` bär ingen orsak. Självtest grönt (9 fall). VÄNTAR: första skarpa körningen.
  📊 **FÖRSTA KÖRNINGEN 16/9 12:19Z (DECISIONS #212): ⊘ DOMSPÄRR** (17 varningar mot 200, 0 facit, 2 regndygn mot 5).
  Underlag: 14 mätbara · BEKRÄFTAD 4 · **DELVIS 10** · **TORRT 0** · V-B1 71±24 % · V-B3 2 av 8 rutter över 3 ·
  median 2,5 km till dömande station. **Nollan är fyndet:** ingen varning gick ut på torr väg — radar och station
  är eniga om ATT det regnar, oeniga om HUR MYCKET (§3.4:s kända grovhet, 5-min-bild mot 30-min-summa).
  Inget tal rörs (#154/#155/#156 är dubbelsignerade). Fråga till Axel när underlaget räcker: tröskel eller "regnar det alls"?
  🗓️ **I MÅNDAGSSERIEN 16/9 (DECISIONS #213):** cron 07:40, sist efter grind-v-a — Bengts "kör den varje regnvecka".
  Ingen skip-spärr (#85:s fälla i omvänd form); mätvakten bevakar att måndagen går. ~1 min/vecka.
  ✅ **Stängt 22/9, kortavstämningen (DECISIONS #303):** byggd och körd 16/9 (DECISIONS #211/#212, PR #303–#305), i måndagsserien (#213, #237); domen över V-C:s underlag bärs av #42.
- [x] ↪ **SAMMANSLAGET 22/9** i *#42 Vattenplaningsvarningen* (DECISIONS #303) — 🧭 **#81 Byggordning efter radardomen 14/9 — så byggs #42 utan att upprepa 5–8/9** (Bengts
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
  ✅ **MÄTT 20/9, en vecka efter beslutet:** ordningen höll. 141 min/dygn i snitt över 13–19/9 mot
  baslinjens 202, ingest oförändrat på 24 körningar med 30–36 s median (baslinje 32 s), radarsteget
  4–5 s, radar_precip 3 312 rader över 24 av 24 kompositer. Steg B är därmed BEVISAT enligt kortets
  egen Verify-rad, utan att någon rad i flödet ändrats.
  📋 **VAD DOMEN OCKSÅ LÅSER UPP — LÄS DEN HÄR LISTAN DEN 14/9** (Bengts order 11/9: "påminn mej om
  att detta ska byggas efter radardomen"). Kortet ovan bygger #42. Men domen är grind för FLERA kort,
  och de har inget eget datum som påminner om sig själva. Faller domen väl ut står kön så här:
  · **#88 TRENDEN** — tröskeldokumentet fastställt OCH kontrasignerat (DECISIONS #92/#95). Inget är
    byggt: noll rader kod, ingen trendkolumn i skuggmotorn, inga lutningskolumner i skuggloggen
    (kontrollerat 11/9). Fyra steg i TROSKLAR-TRENDEN §7, vart och ett med eget bevis: (1) givarvakten
    som filter, (2) lutning + gap + band som tre kolumner, (3) T-A som knapp med svepet, (4) B3 och
    tystnadsfelet som veckorapport. ⏰ TIDSKRITISKT: T-A kräver höstens FÖRSTA frostnätter. Byggs det
    inte i tid finns ingen skuggkolumn när frosten kommer, och T-A:s underlag börjar ett år senare.
  · **#98 TYSTNADSFELET** — samma läge: fastställt, kontrasignerat, noll kod. Skuggkolumn efter domen.
    Döms mot egen facitstack (DECISIONS #94), alltså från första frosten och inte från mars.
  · **#87 Healthcheckens fem kontroller in i vakthunden**, sedan läggs healthcheck.yml ner
    (−12 Actions-min/dygn).
  · **#45 Snö/snöslask/nederbördstyp** och **#91 kallplatslagret**, enligt sina egna kort.
  ⚠️ **VARNING TILL DEN SOM LÄSER DEN 14/9:** "fastställt och kontrasignerat" är INTE "mäter". Kort
  #88 och #98 har fullständiga tröskeldokument och noll kod. Bengt trodde 11/9 att de redan mätte —
  ett rimligt missförstånd, eftersom allt annat på korten är grönt. Säg det rakt ut i avläsningen.
  🧭 **LÄGET 15/9:** A ✅ · B ✅ (radarn kvar i timingesten) · C ✅ radar (`regn` + `rain_segments`, #187) / C-station
  låst (`weather_latest` saknar `rain_sum_mm`) · **D väntar** (sjätte farslaget, §7.8-kriteriet, Axels ja på plats i
  A-skalan) · **E BYGGT** (DECISIONS #191, PR #274): egen motorinstans, kolumn `vb`, skuggrapportens `vattenplaning`;
  dom-knappen grind-v-b byggs när första regndygnet loggats · F efter V-C och Axels ja.
  🕳️ BIFYND: `shadow_log.suppressed` (#127 a, sql/016) skrivs aldrig — kolumnen är tom sedan 13/9. Eget kort krävs.
  🧭 **AXELS UTGÅNGSPUNKT FÖR D (16/9, DECISIONS #196, beslut efter V-C):** yta > +4 mot frysrisk < +1 utesluter varandra;
  under halka (#68), över vilt. Text i frysriskens form: *"Vattenplaning framöver — sakta ner."* V-B-loggen hålls RÅ,
  dom-knappen räknar per regndygn. S1 (skuggjämförelsen av `regn_h`) körs före allt annat på regn_h.
  ↪ **Sammanslaget 22/9 (DECISIONS #303):** byggordningen stängs samtidigt som #42; A, B, C-radar och E är klara, resten står nu på #42. Det som återstår bärs av *#42 Vattenplaningsvarningen*.

- [x] ✅ **STÄNGT 24/9** (DECISIONS #346) — **#21 Anonym puls + feedback-knapp** — rör "samlar in: ingenting"-löftet; Claudes råd: paketera med sensorbeslutet våren 2027
  ✅ **AXELS JA 16/9 (DECISIONS #196, bedömning S4):** två knappar under "Senast sagt" — *Stämde* / *Stämde inte*, ingen
  fritext, loggas lokalt, skickas när bilen står stilla. KRAV: Om-avsnittets "vi samlar in: ingenting" skrivs om
  ordagrant, frivilligt och synligt i SAMMA commit — annars bryter knappen löftet. Bara betatestare med samtycke (#186).
  🔨 **S4 PÅGÅR — steg 1 (backend) byggt 16/9 (DECISIONS #201):** tabell `driver_facit` (sql/022, dubbellåst), edge-funktionen
  `facit-svar` (öppen med flit: schema, 512 byte, tak 2 000/dygn, ingen IP), vakthundsraden "förarfacit". VÄNTAR: migration
  022 + deploy + curl-prov (204/400/405). Sedan steg 2 Android (skill först), 3 iOS, 4 PRODUKTBOK, 5 Axels ja.
  ✅ **Steg 1 BEVISAT 03:08Z 16/9:** 204/204/400/405/400 mot `facit-svar`, vakthundsraden "förarfacit: 1 svar" (issue #289).
  🔨 **Steg 2 Android BYGGT 16/9 (DECISIONS #202):** knapparna under Senast sagt, BETATEST-brytaren, `Facit.kt` (JVM-testad),
  `FacitSender` (skickar vid stillastående 30 s / appstart), Om-texten omskriven ordagrant. Rättat: Senast sagt visade äldsta
  raden. VÄNTAR: android.yml på grenen + skärmbilder → PRODUKTBOK → **Axels ja på flödet** → merge → iOS (steg 3).
  ✅ **Steg 2 Android MERGAT 16/9 med Axels ja (PR #290).** 🔨 **Steg 3 iOS BYGGT 16/9 (DECISIONS #203):** Facit.swift,
  FacitSender, FacitButton, BETATEST-avsnittet, Om-undantaget, introduktionens löfte. VÄNTAR: **Axels Xcode-bygge** (appen
  kompileras inte i CI) + ett svar från hans telefon i `driver_facit` (app = ios). Sedan steg 4 PRODUKTBOK-bild från iOS.
  ✅ **Steg 3 iOS: AXELS XCODE-BYGGE GRÖNT 16/9, MERGAT (PR #291).** KVAR I S4: steg 4 iOS-skärmbild till produktboken (från Axels
  telefon: Senast sagt med knapparna + BETATEST-brytaren) · steg 5 fälttest — ett riktigt svar i `driver_facit` (vakthundens rad
  "förarfacit: n svar" räknar det). Knappen är AV tills testaren slår på den själv.
  🧪 **Steg 5 FÖRBERETT 16/9 (DECISIONS #205):** skuggrapporten bär `forarfacit` (svar 7 dygn, ja/nej, android/ios, senast) så
  testaren ser sitt eget svar landa. RECEPT: Inställningar → BETATEST på → kör tills rösten talar → stanna → Senast sagt →
  Stämde/Stämde inte → skickas vid stillastående 30 s eller nästa appstart. VÄNTAR: första riktiga svaret (Axel iOS / Bengt
  Android-debug-APK ur android.yml på main) + iOS-skärmbild till produktboken.
  📸 **Fotostudio-krok för iOS byggd 16/9 (DECISIONS #206):** `-fotostudio_facit` som startargument (bara debug) ⇒ knapparna
  syns i simulatorn utan körning; receptet i `ios/MAC-GUIDE.md`. VÄNTAR: Axels bygge + två simulatorbilder → produktboken (steg 4).
  🔧 **FÄLTTESTET 16/9 hittade en lucka (DECISIONS #208):** Bengts svar tryckt med vakten av (0.3.6) skickades först vid
  nästa appstart. Rättat på båda plattformarna (vakten av ⇒ skicka direkt); iOS 0.3.7 (10), Android-APK ur CI. VÄNTAR:
  Bengts svar i `forarfacit` (öppna appen igen så går det första iväg) + Axels nästa bygge.
  🔍 **Fälttestets andra fynd (DECISIONS #209):** svaret nådde aldrig servern trots omöppningar; serversidan friad (iOS-format
  prov 204). Sändaren skriver nu status/fel under knapparna på båda plattformarna (0.3.7). VÄNTAR: Bengts svar på om knappen
  blev fylld · Axels läsning av facit-svar-loggen · nästa bygge.
  🎯 **ROTORSAKEN (DECISIONS #210):** iOS-knapparna satt i `LastSaidCard` — död kod sedan skinnet v3, ingen vy visar den.
  Bengt såg bara brytaren. Rättat: `FacitRow` under Senast sagt-raden i `VaktenView`. Kräver Axels nästa bygge (0.3.7).
  🧩 **0.3.7 (10) bär nu även ordlistan** (kort #97, DECISIONS #214, deployad i backend 16/9): ETT bygge från main täcker
  facitknappen och Nysnö/Rimfrost/Halkrisk/Halt. Är 0.3.7 redan uppladdad ⇒ bumpa till 0.3.8 (11).
  🚗 **FÄLTTEST 2, 18/9 (Bengt):** fartkamera passerad — bara brytaren *Svara på varningarna* gick att nå, samma som 16/9.
  ~~Telefonen har 0.3.6 — arkivera 0.3.7~~ **RÄTTAT samma dag: Bengt har 0.3.7 (10)** — mitt antagande var fel. I 0.3.7 sitter
  knapparna längst ner på *Redo.* (fliken Vakten) och syns bara när vakten är AVSLUTAD: medan den kör täcker körläget
  (`fullScreenCover`) allt, och självstoppet kommer först efter 15 min stillastående. Brytarens text säger inte var
  knapparna finns. `driver_facit` 07:37Z: 0 riktiga svar. VÄNTAR: Bengts skärmbild av *Redo.* med vakten avslutad
  (bedömningen §4.2). Obs: versionen 0.3.7 (10) sattes i #300, en commit före `FacitRow` (#301) — byggdes det från #300
  saknas rättelsen trots rätt versionsnummer.
  🎯 **ORSAKEN 18/9 (DECISIONS #240):** Bengts skärmbilder — brytaren PÅ, kameran varnade, *Redo.* med vakten avslutad och
  inga knappar. Varningen sparas alltid innan den sägs, id-lagringen finns sedan 0.3.6 ⇒ bygget 0.3.7 (10) saknar
  `FacitRow`. **Main bär 0.3.8 (11). AXEL: `git pull` · `xcodegen generate` · Product → Archive · TestFlight.** Bekräfta
  gärna arkivets tid i Organizer (13:45–13:53 16/9 bekräftar orsaken). Förslagen till bygget står i bedömningen §4.2.
  🔁 **LINJEN ÄNDRAD 20/9 (Bengts invändning: en sammanhållen uppdatering, inte två — bedömningen §4.2, byggordning C):** 0.3.8
  innehåller INTE #203. Arkivera inte nu; **bevisa kanalen i simulatorn i stället:** efter kort #205 — kör `-fotostudio_facit`
  och TRYCK *Stämde*; raden `cam:fotostudio` ska landa i `driver_facit` med `app = ios`, `version 0.3.8`, märkt prov. Det ger samma
  besked som en arkivering (knapparna syns, sändningen fungerar, diagnosen #240 bekräftad) utan TestFlight och utan provkörning.
  Arkiveringen sker EN gång, med #203. **Stoppdatum 27/9:** utan de åtta svaren arkiveras 0.3.8 ändå, enligt receptet nedan.
  ✅ **BYGGORDNING C BESLUTAD AV BENGT 20/9 (DECISIONS #242), OCH #205 ÄR I DRIFT — GÖR SIMULATORPROVET NU, AXEL:**
  `git pull` · `cd ios/HalkvaktApp && xcodegen` · Edit Scheme → Run → Arguments → `-fotostudio_facit` · kör i simulatorn ·
  fliken Vakten · **tryck *Stämde*** · raden under ska bli grön *Skickat …* (gul = felet står där, skicka texten). Ta bort
  argumentet. Claude läser raden i `driver_facit`. Två minuter, ingen arkivering.
  ✅ **0.3.8 (11) UPPLADDAD TILL APPLE 20/9 18:38** (Organizer: *Uploaded to Apple*, Team Axel Lagerlöf, arm64,
  `se.halkvakt.app`). **Tre saker bevisade av själva arkiveringen:** app-målet KOMPILERAR med kvällens rad i
  `SnapshotRepo.swift` (den enda biten inget CI-flöde bygger), versionsspåret håller (11 över 0.3.7:s 10), och
  signeringen gick igenom efter att Team valts om. Exportdeklarationen `ITSAppUsesNonExemptEncryption: false` ligger i
  `project.yml`, så bygget fastnar inte på *Missing Compliance* — interna gruppen får det när Apples bearbetning är klar.
  **Ännu obevisat: led 1 och 2.** Uppladdat är inte kört.
  🎯 **BENGTS PROV — det som stänger leden (och #210):** uppdatera till **0.3.8 (11)** i TestFlight · Inställningar →
  **BETATEST på** · kör tills rösten talar · **avsluta vakten** (knapparna syns bara då — läxan från 18/9) · fliken
  Vakten → *Senast sagt* → **Stämde / Stämde inte**. Under knapparna ska det stå **"Skickat HH:MM (1 svar)"**. Står det
  *"Kunde inte skicka HH:MM: HTTP …"* är det SERVERNS eget svar — skärmbild räcker, felet är då läsbart. **Och för
  #210:** talar en olycka UTAN vägnummer ska den säga *"Allvarlig olycka 8 kilometer framför dig"* — aldrig *"på väg
  null"*. 5 % av olyckorna saknar vägnummer, så det är en iakttagelse att göra när den dyker upp, inte något att framkalla.
  🍎 **APP STORE — BESLUTAT 23/9 (DECISIONS #320):** iOS först, kandidat 0.3.9 (13), inte näringsidkare, kontakt axel.lagerlof.45@gmail.com. Integritetspolicyn rättad och `support.html` live. **Kvar:** provresan på (13) + inspelning till granskarna (Axel/Bengt) · skärmbilder 6,9" ur simulatorn (Axel) · fylla i App Store Connect enligt dokumentet *Halkvakt till App Store* (Axel) · Product Interaction i manifestet i nästa bygge (Claude).
  ✅ **0.3.9 (13) UPPLADDAD TILL APPLE 23/9 20:53** (Axels Organizer, arm64): #203:s iOS-kod kompilerade på första försöket. Organizern visar också att **0.3.9 (12) laddades upp redan 20/9 19:50** (= 90b5223, den rena fixen) — tavlan visste inte om det. Nästa: provresan på (13) = App Store-kandidaten.
  🚀 **23/9 kväll: NU ARKIVERAS 0.3.9 (13) FRÅN MAIN** (Axel: *"13 ut nu, sedan App Store"*, ersätter väg (b)): bär #273, #203 lager 1, rättad behörighetsruta, viltbytet (#318) och integritetsmanifestet `PrivacyInfo.xcprivacy` (krav för granskning). Steg: `cd ~/Halkvakt && git checkout main && git pull` → `cd ios/HalkvaktApp && xcodegen` → öppna projektet på nytt → Any iOS Device → Archive → Organizer ska visa **0.3.9 (13)** → Upload. Blir #203:s kod röd i Xcode: skärmbild av felet till Claude. Sedan provresan (släckt skärm, facit efter resan, en viltvarning) = App Store-kandidaten.
  ✅ **22/9 kväll: VÄG (b) VALD** (DECISIONS #317, Axel lämnade valet till Claude): arkivera **0.3.9 (12)** från taggen `ios-0.3.9-12` (= `90b5223`) — steg (1) blir `cd ~/Halkvakt && git fetch --tags && git checkout ios-0.3.9-12`, sedan steg 2–8 som nedan; finns bara schemat HalkvaktEngine efter `xcodegen`: *Manage Schemes → Autocreate Schemes Now* (#228). Efter uppladdningen: `git checkout main`. **(13) är nästa bygge från main** — bär #203 lager 1 och den rättade behörighetsrutan (DECISIONS #317), och där tas rutans skärmbild till produktboken.
  ⚠️ **22/9: NUMRET HÖJT TILL 0.3.9 (13)** (DECISIONS #304, Bengts ja). #203:s iOS-kod (eb81b50, 20/9 18:17) kom in på main EFTER att (12)
  sattes, så ett arkiv från main bär den — okompilerad — och raden *Bär INTE: #203* nedan gäller inte längre för main. **Axels val:**
  **(a)** arkivera från main som **0.3.9 (13)**: allt nedan plus #203 lager 1, och Xcode kompilerar #203 för första gången; eller
  **(b)** arkivera den rena fixen som **0.3.9 (12)** från `90b5223` (`git checkout 90b5223` före steg 2), som förkontrollen gjordes på.
  🚀 **NÄSTA ARKIVERING: 0.3.9 (12) — REDO 20/9 23:05.** Förkontroll enligt CLAUDE.md gjord på `90b5223`: ci ✅ och
  ios-engine ✅, inga lokala ändringar. **DEVELOPMENT_TEAM ligger nu i `project.yml`** (R93LGMM343, DECISIONS #275) så
  `xcodegen` slutar nollställa den — steget "välj Team igen" är borta.
  **Steg:** (1) `cd ~/Halkvakt && git pull` · (2) `cd ios/HalkvaktApp && xcodegen` · (3) har Xcode projektet öppet:
  stäng och öppna `Halkvakt.xcodeproj` på nytt, annars håller Xcode kvar den gamla projektfilen · (4) **Signing &
  Capabilities**: Team ska stå som *Lagerlöf Labs* utan röd rad — står den tom har `project.yml`-raden inte gått igenom ·
  (5) destination **Any iOS Device (arm64)** · (6) **Product → Archive** · (7) Organizer ska visa **0.3.9 (13)** på väg (a) eller **0.3.9 (12)** på väg (b) — visar
  den något annat, AVBRYT, för Apple tillåter aldrig ett lägre versionsspår efteråt · (8) **Distribute App → App Store
  Connect → Upload**.
  **Bär:** iOS-fixen (#273 — rösten tystnade med släckt skärm på *när appen används*) · `<null>`-raden och hela dess klass
  (#210/#276) · det engångs tidiga olycksropet (#211) · de tolv nya vektorerna (#212).
  **Bär INTE (bara väg b):** #203, #264:s apptexter, #266 (viltrösten) — medvetet, så att provet går att tolka. Väg (a) bär #203 lager 1.
  **Provet efteråt, i ordning:** (a) en resa med **"Tillåt när appen används"** och **släckt skärm** — en varning ska
  höras, och **den blå indikatorn i statusfältet** är kvittot på att Core Location håller appen vid liv ⇒ stänger #227 ·
  (b) facitknapparna under *Senast sagt* med vakten avslutad ⇒ leden 1 och 2 · (c) en olycka utan vägnummer sagd utan
  *"på väg null"* ⇒ stänger #210.
  *Historik:* **ARKIVERING PÅGICK 20/9 18:35 (Axel, byggordning A).** Förkontrollen enligt CLAUDE.md gjord: ci ✅, ios-engine ✅,
  android ✅ på 88dd32c. Bygget bär **#210** (`<null>`), **#211** (engångs tidigt rop) och **#212**:s vektorer.
  Fotostudio-kroken är `#if DEBUG` ⇒ kompileras bort ur arkivet; scheme-argumentet rör bara Run, inte Archive.
  **Innehåller INTE** #203 (facit efter resan), #264 (invarianten/Data Safety) eller #266 (viltrösten) — de går i 0.3.9.
  **Efter uppladdningen, i ordning:** (1) Organizer visar 0.3.8 (11) · (2) intern grupp får bygget utan granskning ·
  (3) **Bengts första resa bevisar led 1 och 2** — att knapparna syns och att appen skickar; misslyckas sändningen
  skriver appen serverns svar under knapparna (*"Kunde inte skicka HH:MM: HTTP …"*), så felet blir en skärmbild och
  inte en tyst runda · (4) **kort #210 stängs** när en olycka utan vägnummer sägs rätt (ingen *"på väg null"*).
  📋 **BYGGREDO — OMKONTROLLERAT 20/9 kväll (Axels fråga):** **ja.** ci ✅, ios-engine ✅ och
  android ✅ på **88dd32c**, och allt som pushats därefter är dokument (`git diff --stat 88dd32c..HEAD` rör bara .md).
  ⚠️ **Raden ovanför gällde till i kväll och är nu fel:** `git diff 79e4195..HEAD -- ios/ android/ engine/` är INTE längre
  tom — den bär motorfixarna #210, #211, #212 (SnapshotRepo.swift, Engine.swift, Engine.kt, engine/src, tolv nya vektorer).
  Det är gott nytt: ett 0.3.8 som arkiveras nu **säger en olycka utan vägnummer rätt** och ropar det tidiga olycksropet
  en gång i stället för två. Lägg till i tvåminuterskontrollen: en olycka utan vägnummer ska INTE säga *"på väg null"*.
  ⚠️ **Enda oprövade biten:** `SnapshotRepo.swift` ligger i APP-målet, och inget flöde i CI kompilerar app-målet
  (ios-engine kör `swift test` på motorpaketet, på Linux). Ändringen är en rad och typen stämmer (`road: String?` i
  PointMeta ⇒ `d["road"] as? String`), men första kompileringen sker i din Xcode. Faller den: skicka felraden.
  Steg: `git pull` · `cd ios/HalkvaktApp && xcodegen` · välj Team igen ·
  **TVÅMINUTERSKONTROLLEN som hade fångat 0.3.7:** Edit Scheme → Run → Arguments → `-fotostudio_facit`, kör i simulatorn,
  fliken Vakten ska visa *Stämde / Stämde inte* under raden längst ner — **TITTA, TRYCK INTE** (kort #205) — ta bort
  argumentet · Any iOS Device (arm64) → Product → Archive · Organizer ska visa **0.3.8 (11)** · Distribute → App Store
  Connect → Upload · intern grupp får bygget utan granskning. Bevis: Bengts svar som rad i `driver_facit` med `version 0.3.8`.
  🔑 **Nyckel, sorterat 22/9 (kort #224):** iOS-bygget med knapparna ute hos testarna — då skärmbilden i PRODUKTBOK och det första riktiga svaret i `driver_facit`.
  📝 **22/9 (DECISIONS #306):** vakthunden räknar nu **1 riktigt facitsvar** (senast 21/9 22:13Z, 2 prov uteslutna) — steg 5 kan alltså vara uppfyllt. Kontrollera att svaret kom från en riktig telefon innan det räknas; kvar är iOS-skärmbilden.
  ✅ **Stängt 24/9 (DECISIONS #346, Bengts ja):** feedback-knappen finns sedan 16/9 (S4, *Stämde/Stämde inte*, PR #290/#291). Den anonyma pulsen förs till sensortrappan, Ä8 i bedömningen (mars 2027, efter vinterns domar).

- [x] ✅ **STÄNGT 22/9** (DECISIONS #315) — **#32 Hindren in i rösten** — vi har aldrig skeppat annat än olyckor trots att
  DECISIONS #5 sade "olyckor + hinder". Kräver ny HazardKind + egen röstfras + Axels
  beslut om vad rösten säger. Bäst kandidat: **djur på vägbanan** (173 på en vecka, med
  RIKTIG position — vida bättre än polisens länscentrum som vi underkände i #13).
  🔑 **Nyckel, sorterat 22/9 (kort #224):** publik release och Axels beslut om HazardKind och röstfras (Ä3).
  ✅ **Stängt 22/9 (DECISIONS #315, Bengt: *"öppna våren 2027"*):** bärs av Ä3 i bedömningens §3 och **öppnas våren 2027**. Underlaget samlas redan: `AnimalPresenceObstruction` arkiveras (ARCHIVE), fast rösten bara talar om olyckor (KEEP). Rösttexten är Axels beslut.

## Stängda efter flytten 26/9

### Claude — låst (väntar på nyckel)

- [x] ✅ **STÄNGT 26/9** (DECISIONS #372) — 🌧️ **#247 BILDLÄSNINGSSPÅRETS ANDRA ARK — vid regn eller i mörker** (ur #246, DECISIONS #340). Första arket (24/9 13:43Z) var sol och
  torr väg: 20 × bar, hög säkerhet. Det bevisar kedjan, inte att klassningen skiljer våt från bar, eller att mörkret ger *okänd* i
  stället för en gissning. `python scripts/kontaktark.py direkt --antal 20 --ut docs/kamerafacit/prov-<datum>` vid regn över
  rutterna (radarn visar det) eller efter mörkrets inbrott; samma stickprov och ok. Kostar en kvart plus Axels blick.
  🔒 NYCKEL: vädret. Verify: ett ark med minst fem *våt* eller *okänd*, ok:at, och en rättelse från Axel om klassningen tagit fel.
  📸 **ANDRA ARKET 26/9 03:22Z, i mörker** (Bengts ja, DECISIONS #371): 12 bar, 8 okänd, ingen gissning på våt — sju okända är
  spindelväv över linsen i IR-ljuset, en för mörk. Verify:s första halva uppfylld. 🔑 Kvar: Axels ok på
  `docs/kamerafacit/prov-2026-09-26/ok.md` (två bilder i stickprovet).
  ✅ **STÄNGT 26/9 (DECISIONS #372):** Bengts ok 04:12Z, utan rättelser. dbknapp 36217165040 (bärare sql/033, 20 INSERT som bevisrader): arkets rader i `kamerafacit` 12 bar och 8 okänd, tabellen 41 rader (21 före).

### Axel — beslut att ta

- [x] ✅ **STÄNGT 26/9** (DECISIONS #373) — 🗄️ **#83 GALLRING av weather_observations — måste finnas FÖRE första kalla veckan**
  (Bengts beställning 9/9 01:40; kort + förslag av Claude, mätt mot koden 9/9).
  **VARFÖR NU:** arkivdieten (DECISIONS #4: bara yta ≤ 5 °C eller nederbörd) finns i
  ingest-live, men vintern upphäver den — under 5 °C är ALLA 848 stationer intressanta,
  var 10:e minut, dygnet runt: 848 × 144 ≈ 122 000 rader/dygn. Axel mätte 175 000 (8/9).
  Uppskattat ~260 B/rad inkl. index ⇒ 30–45 MB/dygn ⇒ gratisnivåns 500 MB är full på
  **11–16 dygn** räknat från första kalla veckan. 📏 UPPMÄTT 9/9 ur healthcheckens egna
  räknare: weather_obs 187 582 (8/9 21:13) → 195 500 (9/9 00:18) = 7 918 rader på 3 h 05 ⇒
  **~62 000 rader/dygn i september MED dieten** (mild natt, få stationer under 5 °C). Vintern
  släpper alla 848 stationer genom dieten ⇒ 2× det, i linje med 122 000-uppskattningen. 📏 DAGTAKT
  9/9: weather_obs 205 275 (04:49) → 213 630 (16:43) = +8 355 netto på 11 h 54 med gallringens 3 551
  borträknade ⇒ **~24 000 rader/dygn brutto på dagen**, ~62 000 på natten. Dieten gör sitt jobb i
  september; vintern upphäver den. NATTEN 9–10/9: 213 630 (16:43) → 228 364 (02:23) → 231 421 (04:23)
  ⇒ **~36 600 rader/dygn**, jämn kurva, inget synligt fall vid nattjobbet 03:15 — VÄNTAT: allt äldre än
  7 dygn är fortfarande GitHub-ingestens 30-minutersrader, så jobbet hade inget att ta. Om jobbet
  faktiskt kördes kan bara databasen svara: `SELECT start_time, status, return_message FROM
  cron.job_run_details WHERE command LIKE '%gallra_vader%' ORDER BY start_time DESC LIMIT 3;` (Axel,
  SQL-editorn — eller Claude via DB-knappen om den får en ren bevis-åtgärd). Första synliga effekten
  i räknaren: natten till 16/9. Full databas = ingest-live dör tyst =
  appen serverar gammal data igen (5/9-läget, fast utan Actions-larm).
  📏 **UPPMÄTT 14/9 ur healthcheckens räknare, 16,0 h isär (över #83:s 12-timmarsgräns):**
  weather_obs 284 090 (00:23) → 291 757 (16:23) = +7 667 netto ⇒ **~11 500 rader/dygn** i september
  med dieten, efter gallringen. Raden bredvid de två föregående: 13 000/dygn (morgonen 14/9, 14 h)
  och 21 281/dygn (hela dygnet 13/9). Kurvan pekar nedåt och ligger långt under septembertoppen
  62 000 — milda dygn släpper få stationer genom dieten. Vintern upphäver den; talet säger ingenting
  om november. Sidofynd samma körningar: road_conditions-arkivet står stilla
  (830 rader, nyaste 472 h → 488 h gammal, 0 omklassningar) — väntat i en mild september, men värt
  ett öga när första kalla veckan kommer.
  📏 **15/9, 12,0 h isär:** weather_obs 291 757 (14/9 16:23) → 297 789 (15/9 04:23) = +6 032 ⇒
  **~12 100 rader/dygn**, i linje med gårdagens 11 500. Och nu börjar det som gallringen byggdes för:
  meta.json visar **4 kalla stationer** (2 i går), och live-snapshoten bär sin första minusgrad —
  FI:14047 **−0,3 °C** yta, med 2566 0,3 · 1106 0,5 · FI:14018 0,6 · FI:14049 0,8 strax över.
  Dieten släpper igenom fler stationer för varje kall natt; kurvan vänder uppåt härifrån.
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
  📐 **GREPP 3, UNDERLAG 17/9 (`docs/GREPP3-ARKIVEN.md`, DECISIONS #231):** databasen 168 MB, cirka 9 MB/dygn brutto
  redan i september · Finland och Norge ogallrade (34 MB) · pg_crons logg 18 MB och rensas aldrig · gratisnivån
  skrivskyddar vid 500 MB och har inga backuper · vintern kräver cirka 3 GB. **Rekommendation:** Supabase Pro senast vid
  400 MB eller 1/11, plus tre gratis småbyggen nu (databasvakt, loggrensning, gallring FI/NO). Ny mätning 24/9.
  🔨 **SMÅBYGGENA 17/9 (Bengt, DECISIONS #232):** `gallra_arkiv` (sql/026) i nattjobbet — Norge allt efter 7 dygn, Finland
  varma rader efter 7 dygn och kalla i 60 (rimfrostgrinden), pg_crons logg efter 7 dygn — plus databasvakten (larm 400 MB).
  Gallringsfunktionerna låsta för REST-API:t. **Kvar:** Pro-beslutet (Bengt + Axel).
  ✅ **I DRIFT 17/9:** migration 12:3xZ: `gallra_arkiv(7)` raderade **97 472 rader** — Finland 97 379 → 58 130, Norge 68 972 → 45 828, pg_crons logg 39 312 → 12 691, resten svensk gallring · EXECUTE låst för anon och authenticated · nattjobbet kör `SELECT gallra_arkiv(7)` 03:15 · databasvakten 12:35Z: *databas: 168 MB av 500*, provlarmet gick (larmväg ok).
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
   📈 KVÄLL 10/9: weather_obs 232 028 (04:49) → 242 351 (16:28) = 10 323 rader på 11,65 h ⇒ **~21 300/dygn
   dagtid** (natten 36 600 väntas igen). Nattjobbet 03:15 syns inte från Actions; första riktiga bevis 16/9.
   🌙 NATT 11/9: weather_obs 242 351 (16:28) → 242 495 (18:23) → 246 339 (04:23): **144 rader på 1,9 h
   kvällen, 3 844 på 10 h natten ⇒ ~9 200/dygn** (mot 36 600 natten innan). Inte ett fel: dieten (#4) släpper
   bara stationer ≤ 5 °C eller nederbörd, och SE live.json hade 33 väderposter 04:30 mot hundratals kalla
   natten 9/9. weather: synced 0 min i varje healthcheck. Takten är väderstyrd — läs den mot antalet kalla stationer.
   📈 **12/9:** weather_obs 246 339 (11/9 04:23) → 254 129 (12/9 04:23) → 258 197 (12/9 18:27) ⇒
   **7 790 rader på dygnet, ~6 900/dygn dagtid**. meta.json: 1 kall station. Mild vecka, dieten håller
   takten nere — tredjedelen av septembersnittet. Gallringens första riktiga natt är fortfarande 16/9.
  📈 **MORGON 13/9: takten har fyrdubblats över natten.** weather_obs 268 613 (00:23) → 275 410
  (04:25) = 6 797 rader på 4,0 h ⇒ **~40 500/dygn**, mot 9 200 i går. meta.json säger ändå bara
  **1 kall station** — det är alltså NEDERBÖRDEN och inte kylan som driver, dieten (#4) släpper
  igenom båda. Talet ligger redan på vinterprojektionens 41 000/dygn som gallringen dimensionerades
  för, i mitten av september. Värt att läsa om vid nästa avläsning innan man drar slutsatser av ett
  enda dygn.
  📉 **KVÄLL 13/9 — RÄTTELSE AV MITT MORGONTAL.** weather_obs 275 410 (04:25) → 282 370 (16:23) =
  6 960 rader på 12,0 h ⇒ **~13 950/dygn dagtid**. Helt dygn 12/9 04:23 → 13/9 04:25: 254 129 →
  275 410 = **21 281/dygn**. Mitt morgontal 40 500 var en extrapolering av FYRA timmar och höll inte
  — nattskuren var en skur. Vinterprojektionens 41 000 är alltså inte nådd; vi ligger på halva.
  ⚠️ Samma feltyp som mitt 311-tal i natt: kort fönster utsträckt till ett dygn. Två gånger på ett
  dygn. Regel för kommande avläsningar: extrapolera aldrig ett arkivtal från under 12 timmar, och
  sätt alltid helt-dygn-talet bredvid.
  📉 MORGON 14/9, mätt över 14,0 h enligt regeln (aldrig under 12): weather_obs 282 370 (13/9 16:23)
  → 289 958 (14/9 06:23) = 7 588 rader ⇒ **~13 000/dygn**. Kalla stationer 3 (var 1 i går). Takten
  ligger kvar långt under vinterprojektionens 41 000.
  ↪ **Hit sammanslaget 24/9 (DECISIONS #332): #155 snubbeltråden.** Beslutet om kvarhållningen (steg 2, export eller Pro) avgör två mätinstruments byggform: trendarkivet (#88) SPARAR för att gallringen förstör dess 15-minutersfönster; tillståndsskattaren (#89) och tystnadsfelet (#98) RÄKNAR OM för att deras ingångar överlever. Skärps kvarhållningen, eller börjar `radar_precip` gallras (inget gör det i dag), upphör ingången att vara återskapbar och båda måtten måste byta till #88:s form. Gratisnivån räcker ~55 dygn in i vintern (sql/014). Principen står i TROSKLAR-OVERGANGAR och TROSKLAR-TRENDEN (Bengts order 14/9).
  🔨 **STEG 2 BESLUTAT OCH I DRIFT 24/9 (Bengt: *"ja till alla fem, kör export till supabase storage"*, DECISIONS #334):** export, inte Pro. `sql/034` + `sql/035`, edge-funktionen `arkivexport`, jobben :40 och 03:45. Första varvet 05:40Z: 24/8 (4 711 rader, 70 kB) och 25/8 (17 843 rader, 236 kB) packade, återlästa, sha-verifierade och bokförda; 19 dygn väntar, två per timme. Raderingen först när databasen passerar 350 MB, äldsta bokförda dygnet, ett per natt, aldrig yngre än 30 dygn. Kvar: återläsningssteget för marsdomarna (behövs när raderingen börjat).
  ✅ **STÄNGT 26/9 (femma sju, DECISIONS #373):** Verify uppfylld — dbknapp 36217996390 26/9: högst 17 978 rader per dygn äldre än 8 dagar (gränsen 45 000) · 0 av 179 461 halvtimmar med mer än en rad · grind A tappar 3 av 49 372 halvtimmar (0,006 %; sista raden i halvtimmen saknar yta men en tidigare har den) · `halkvakt-gallring` 03:15 varje natt, senast 26/9, 0 fel på 30 dygn.

### Claude — olåst

- [x] ✅ **STÄNGT 26/9** (DECISIONS #373) — 🧹 **#221 STYRDOKUMENTEN HAR VUXIT FÖRBI ANVÄNDBARHET** (genomlysningen 20/9). DECISIONS 7 232 rader · TAVLA 3 550 ·
  STATUS 1 846 — **~315 000 tokens ihop**. Varje session betalar för att orientera sig, och motsägelser överlever därför länge:
  kort #79 står både öppet och avvecklat 9/9 · STATUS.md säger fortfarande "Actions-minuterna slut" och "iOS 0.3.0" (rubriken
  orörd sedan 31/8) · lapse 0,71 och 0,63 står blandade. **Regler som bevisligen inte följs:** 41 klara kort ligger kvar i
  ATT GÖRA, 🟡-sektionen är tom, STATUS.md uppdateras inte varje session, BACKLOG står kvar som order i CLAUDE.md men är dött
  sedan 5/9. Dessutom: 169 fjärrgrenar där en behövs.
  Verify: beslut äldre än 1/9 flyttade till eget arkiv, BACKLOG avvecklad eller återupplivad med en rad i CLAUDE.md, grenarna
  rensade, och de fyra namngivna motsägelserna rättade.
  ✅ **Bengts ja 26/9 till steg 1** (femma sex, DECISIONS #371). Mätt 26/9: TAVLA 4 842 rader, varav 122 stängda kort (2 736
  rader) bland de öppna; DECISIONS 10 491, varav 328 före 1/9 och 5 365 före 15/9 — gränsen 1/9 hade flyttat 3 %. Steget:
  stängda kort till tavelarkiv, beslut före 15/9 till beslutsarkiv som beslutsnumrens vakt läser. Grenarna rörs inte.
  🔨 **STEG 1 KLART 26/9:** TAVLA 4 864 → 2 137 rader (122 stängda kort till `TAVLA-ARKIV.md`; öppna kort 44 före och 44 efter, inga öppna i arkivet), DECISIONS 10 550 → 4 981 rader (#1–#185 till `DECISIONS-ARKIV.md`, ordagrant; 358 rubriker före och efter). De två filerna gick från 1 384 kB till 693 kB — hälften. `scripts/beslutsnumren.ts` läser båda; motprov lokalt: en påhittad `## #58` fälls med arkivet och slinker igenom när vakten bara läser DECISIONS.md. Kvar av Verify: BACKLOG, grenarna och de fyra motsägelserna.
  ✅ **STÄNGT 26/9 (femma sju, DECISIONS #373):** steg 2 klart — BACKLOG.md avvecklad med raderna i CLAUDE.md och halkvakt-android §6, STATUS.md:s rubrik fryst som historik med pekare till bedömningen, lapse 0,71 märkt där den stod omärkt, #79 redan stängd på båda ställena efter arkivet; 279 grenar på GitHub → 6: 273 raderade vars sammanslagna PR bar exakt grenens topp (återställbara från PR-sidan). Hela Verify uppfylld (beslutsarkivet 15/9 i stället för 1/9, se steg 1).

### Claude — olåst

- [x] ✅ **STÄNGT 26/9** (DECISIONS #373) — 🪛 **#250 TRE SMÅFEL SOM PRODUKTBOKENS GENOMLÄSNING HITTADE** (24/9, DECISIONS #347). (a) **Android säger *"Ingen färsk
  väglagsdata"* två gånger per körning:** flaggan sätts och nollställs direkt i första laddningen (`GuardService.kt`, raden
  `staleAnnounced = staleAnnounced && g != null` i grenen där `g == null`), så nästa laddning med gammal data talar igen. (b) **iOS
  körläge visar klockan nu vid *Senast sagt*,** inte när det sades (`KorlageView.swift`, `now.formatted`). (c) **Fotostudion tar
  sex bilder men bara tre skiljer sig:** Om, Nära dig och Körläget är inga egna skärmar längre, så tre bilder är dubbletter.
  Verify: (a) ett JVM-prov med två laddningar av gammal data ger en replik, inte två; (b) tiden är repliken tidsstämpel;
  (c) fotostudions bilder är olika eller färre.
  ✅ **KLART 24/9 (DECISIONS #348):** (a) nollställs vid start, (b) `lastSaidAt`, (c) tre bilder i stället för sex.
  ✅ **STÄNGT 26/9 (femma sju, Bengts ja, DECISIONS #373):** byggt 24/9 (#348); del (a) bevisad genom läsning — raden sitter i vakttjänsten, som saknar JVM-prov.

### Claude — olåst

- [x] ✅ **STÄNGT 26/9** (DECISIONS #374) — 📜 **#249 OM-AVSNITTET SÄGER MINDRE ÄN SANNINGEN** (fynd 24/9 under kort #217, DECISIONS #347). (a) **Android** visar bara
  *"Öppna data från Trafikverket (CC0)"*. Ärlighetsraden (*mellan stationerna är vägen oövervakad*) och källorna SMHI, Fintraffic
  (CC BY 4.0) och OpenStreetMap (ODbL) saknas — och Fintraffics gränsstationer och OSM:s broar når Android-motorn, så de två
  licenserna kräver att källan anges. iOS har hela raden. (b) **Båda plattformarna** säger i undantagstexten *"Inget annat"*, men
  facitsvaret bär också appens namn och version (`app`, `ver`). Play-filen deklarerar redan båda; texten i appen gör det inte.
  🔑 (b) är Axels ordval: skriv om texten eller ta bort fälten ur svaret. Ändras texten gäller invariantregeln — Play-filen,
  integritet.html och produktboken i samma commit. (a) kan Claude bygga när Bengt sagt ja.
  Verify: Androids Om bär samma ärlighetsrad och attribution som iOS (skärmbild ur fotostudion); undantagstexten och kroppen
  som skickas säger samma sak.
  ✅ **KLART 24/9 (DECISIONS #348, Axel via Claude):** (b) texten nämner nu appens namn och version, fälten stannar; (a) ärlighetsraden och källorna i Androids Om. Verify: fotostudions bild av Om efter nästa android-körning.
  📸 **26/9: beviset räckte inte.** Fotostudions `shot-6-betatest.png` (android.yml 36214202433) slutar vid Om-avsnittets första ruta — ärlighetsraden och källorna syns inte. Verify kräver en svepning till i fotostudion (en rad i android.yml) eller en skärmbild av Om från testtelefonen.
  ✅ **STÄNGT 26/9 (DECISIONS #374):** Verify uppfylld — fotostudions nya `shot-7-om.png` (android.yml 36219380753, i produktboken) visar Androids ärlighetsrad och källraden fram till *Fintraffic (CC*; resten läst i koden, `App.kt:686` — *Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL)*, ordagrant som iOS `HalkvaktApp.swift:124`.

### Axel — hösten (brainstorm 31/8)

- [x] ✅ **STÄNGT 26/9 SOM ÖVERSPELAT** (DECISIONS #375) — ↩︎ **#23 heads-up** — bannern över kartappen, båda plattformarna. (#22 T3–T7 i bilen och
  #24-resten står under Claude — låst, Android-listan.)
  ↪ **Hit sammanslaget 22/9 (DECISIONS #303):** underpunkten #23 i DESIGNLYFTET, som stängdes 22/9.
  📏 **Läst mot koden 26/9 (Bengts fråga *"kan du ta upp kort 23"*):** bannern är BYGGD på båda — Android `GuardService.headsUp()`
  (egen kanal, IMPORTANCE_HIGH, tyst, 8 s), iOS `HeadsUpService.show()` (time-sensitive, 8 s). Kvar är bara beviset: en skärmbild
  av bannern över kartappen när rösten talar. Det går inte stillastående i dag — *Testa rösten* talar men visar ingen banner på
  någon av plattformarna, och iOS visar den med flit bara när Halkvakt ligger BAKOM kartan (`willPresent` ger `[]`). Fotostudion
  kan inte heller: emulatorns vakt får ingen riktig varning. Två vägar i §4.2: en knapp *Prova bannern* (fem sekunders fördröjning,
  byt till kartan — Android-beviset tas då av fotostudion), eller en passagerare som tar bilden under en riktig varning.
  ✅ **STÄNGT 26/9 (Bengt: *"överspelat"*, DECISIONS #375):** bannern står kvar i koden på båda plattformarna; beviset efterfrågas inte.
